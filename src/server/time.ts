import "server-only";

import { Temporal } from "@js-temporal/polyfill";
import { and, asc, eq, gte, lte } from "drizzle-orm";

import type { SessionAccount } from "@/server/access";
import { db } from "@/server/db";
import { accounts, clients, standingClientRows, timeEntries } from "@/server/db/schema";

const STOCKHOLM_TIME_ZONE = "Europe/Stockholm";
const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export interface WeekDate {
  isoDate: string;
  weekday: string;
}

export interface WeeklyClientRow {
  clientId: string;
  displayName: string;
  archived: boolean;
  standing: boolean;
}
export interface WeeklyGrid {
  weekStart: string;
  weekEnd: string;
  dates: WeekDate[];
  rows: WeeklyClientRow[];
  availableClients: Array<{ clientId: string; displayName: string }>;
}

export type StandingRowResult =
  | { ok: true }
  | { ok: false; reason: "account-unavailable" | "client-unavailable" | "reload" };

function currentStockholmDate(): Temporal.PlainDate {
  return Temporal.Now.zonedDateTimeISO(STOCKHOLM_TIME_ZONE).toPlainDate();
}

export function getSwedishWeek(dateValue?: string): {
  start: Temporal.PlainDate;
  end: Temporal.PlainDate;
  dates: WeekDate[];
} {
  let selectedDate = currentStockholmDate();
  if (dateValue) {
    try {
      selectedDate = Temporal.PlainDate.from(dateValue);
    } catch {
      // Invalid navigation input falls back to the current local week.
    }
  }

  const start = selectedDate.subtract({ days: selectedDate.dayOfWeek - 1 });
  const dates = Array.from({ length: 7 }, (_, offset) => {
    const date = start.add({ days: offset });
    return {
      isoDate: date.toString(),
      weekday: WEEKDAYS[offset]!,
    };
  });

  return { start, end: start.add({ days: 6 }), dates };
}

export function shiftIsoDate(isoDate: string, days: number): string {
  return Temporal.PlainDate.from(isoDate).add({ days }).toString();
}

export async function getWeeklyGrid(
  member: SessionAccount,
  selectedDate?: string,
): Promise<WeeklyGrid> {
  const week = getSwedishWeek(selectedDate);
  const weekStart = week.start.toString();
  const weekEnd = week.end.toString();

  const [standing, recorded, activeClients] = await Promise.all([
    db
      .select({
        clientId: clients.id,
        displayName: clients.displayName,
        archived: clients.archived,
      })
      .from(standingClientRows)
      .innerJoin(clients, eq(clients.id, standingClientRows.clientId))
      .where(and(eq(standingClientRows.accountId, member.accountId), eq(clients.archived, false)))
      .orderBy(asc(clients.displayName)),
    db
      .selectDistinct({
        clientId: clients.id,
        displayName: clients.displayName,
        archived: clients.archived,
      })
      .from(timeEntries)
      .innerJoin(clients, eq(clients.id, timeEntries.clientId))
      .where(
        and(
          eq(timeEntries.accountId, member.accountId),
          gte(timeEntries.workDate, weekStart),
          lte(timeEntries.workDate, weekEnd),
        ),
      )
      .orderBy(asc(clients.displayName)),
    db
      .select({ clientId: clients.id, displayName: clients.displayName })
      .from(clients)
      .where(eq(clients.archived, false))
      .orderBy(asc(clients.displayName)),
  ]);

  const rows = new Map<string, WeeklyClientRow>();
  for (const client of standing) {
    rows.set(client.clientId, { ...client, standing: true });
  }
  for (const client of recorded) {
    const existing = rows.get(client.clientId);
    rows.set(client.clientId, { ...client, standing: existing?.standing ?? false });
  }

  const standingClientIds = new Set(standing.map((client) => client.clientId));

  return {
    weekStart,
    weekEnd,
    dates: week.dates,
    rows: [...rows.values()].sort((left, right) => left.displayName.localeCompare(right.displayName, "sv")),
    availableClients: activeClients.filter((client) => !standingClientIds.has(client.clientId)),
  };
}

function isSerializationFailure(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "40001";
}

export async function addStandingClientRow(
  member: SessionAccount,
  clientId: string,
): Promise<StandingRowResult> {
  try {
    return await db.transaction(
      async (transaction) => {
        const activeMember = await transaction.query.accounts.findFirst({
          where: and(eq(accounts.id, member.accountId), eq(accounts.active, true)),
          columns: { id: true },
        });
        if (!activeMember) {
          return { ok: false, reason: "account-unavailable" } as const;
        }

        const activeClient = await transaction.query.clients.findFirst({
          where: and(eq(clients.id, clientId), eq(clients.archived, false)),
          columns: { id: true },
        });
        if (!activeClient) {
          return { ok: false, reason: "client-unavailable" } as const;
        }

        await transaction
          .insert(standingClientRows)
          .values({ accountId: member.accountId, clientId })
          .onConflictDoNothing();
        return { ok: true } as const;
      },
      { isolationLevel: "serializable" },
    );
  } catch (error) {
    if (isSerializationFailure(error)) {
      return { ok: false, reason: "reload" };
    }
    throw error;
  }
}

export async function removeStandingClientRow(
  member: SessionAccount,
  clientId: string,
): Promise<StandingRowResult> {
  try {
    return await db.transaction(
      async (transaction) => {
        const activeMember = await transaction.query.accounts.findFirst({
          where: and(eq(accounts.id, member.accountId), eq(accounts.active, true)),
          columns: { id: true },
        });
        if (!activeMember) {
          return { ok: false, reason: "account-unavailable" } as const;
        }

        await transaction
          .delete(standingClientRows)
          .where(
            and(
              eq(standingClientRows.accountId, member.accountId),
              eq(standingClientRows.clientId, clientId),
            ),
          );
        return { ok: true } as const;
      },
      { isolationLevel: "serializable" },
    );
  } catch (error) {
    if (isSerializationFailure(error)) {
      return { ok: false, reason: "reload" };
    }
    throw error;
  }
}
