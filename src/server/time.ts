import "server-only";

import { Temporal } from "@js-temporal/polyfill";
import { and, asc, eq, gte, lte, sum } from "drizzle-orm";

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

export interface DurationSummary {
  billableMinutes: number;
  nonBillableMinutes: number;
  totalMinutes: number;
}

export interface WeeklyClientRow {
  clientId: string;
  displayName: string;
  archived: boolean;
  standing: boolean;
  cells: Record<string, DurationSummary>;
  summary: DurationSummary;
}

export interface WeeklyGrid {
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  dates: WeekDate[];
  rows: WeeklyClientRow[];
  dateSummaries: Record<string, DurationSummary>;
  summary: DurationSummary;
  availableClients: Array<{ clientId: string; displayName: string }>;
}

export type StandingRowResult =
  | { ok: true }
  | { ok: false; reason: "account-unavailable" | "client-unavailable" | "reload" };

export type RecordTimeEntryResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "member-unavailable"
        | "client-unavailable"
        | "daily-limit"
        | "invalid-date"
        | "invalid-duration"
        | "reload";
    };

function emptySummary(): DurationSummary {
  return { billableMinutes: 0, nonBillableMinutes: 0, totalMinutes: 0 };
}

function addDuration(
  summary: DurationSummary,
  classification: "billable" | "non_billable",
  durationMinutes: number,
) {
  if (classification === "billable") {
    summary.billableMinutes += durationMinutes;
  } else {
    summary.nonBillableMinutes += durationMinutes;
  }
  summary.totalMinutes += durationMinutes;
}

function currentStockholmDate(): Temporal.PlainDate {
  return Temporal.Now.zonedDateTimeISO(STOCKHOLM_TIME_ZONE).toPlainDate();
}

export function getSwedishWeek(dateValue?: string): {
  start: Temporal.PlainDate;
  end: Temporal.PlainDate;
  weekNumber: number;
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
      weekday: WEEKDAYS[offset]!.slice(0, 3),
    };
  });

  return { start, end: start.add({ days: 6 }), weekNumber: start.weekOfYear as number, dates };
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
      .select({
        clientId: clients.id,
        displayName: clients.displayName,
        archived: clients.archived,
        workDate: timeEntries.workDate,
        durationMinutes: timeEntries.durationMinutes,
        classification: timeEntries.classification,
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
    rows.set(client.clientId, {
      ...client,
      standing: true,
      cells: {},
      summary: emptySummary(),
    });
  }

  const dateSummaries = Object.fromEntries(
    week.dates.map((date) => [date.isoDate, emptySummary()]),
  );
  const summary = emptySummary();
  for (const entry of recorded) {
    let row = rows.get(entry.clientId);
    if (!row) {
      row = {
        clientId: entry.clientId,
        displayName: entry.displayName,
        archived: entry.archived,
        standing: false,
        cells: {},
        summary: emptySummary(),
      };
      rows.set(entry.clientId, row);
    }

    const cell = row.cells[entry.workDate] ?? emptySummary();
    row.cells[entry.workDate] = cell;
    addDuration(cell, entry.classification, entry.durationMinutes);
    addDuration(row.summary, entry.classification, entry.durationMinutes);
    addDuration(dateSummaries[entry.workDate]!, entry.classification, entry.durationMinutes);
    addDuration(summary, entry.classification, entry.durationMinutes);
  }

  const standingClientIds = new Set(standing.map((client) => client.clientId));

  return {
    weekStart,
    weekEnd,
    weekNumber: week.weekNumber,
    dates: week.dates,
    rows: [...rows.values()].sort((left, right) => left.displayName.localeCompare(right.displayName, "sv")),
    dateSummaries,
    summary,
    availableClients: activeClients.filter((client) => !standingClientIds.has(client.clientId)),
  };
}

function isSerializationFailure(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "40001";
}

function parseDurationMinutes(value: string): number | null {
  const input = value.trim();
  const clock = /^(\d+):([0-5]\d)$/.exec(input);
  if (clock) {
    const minutes = BigInt(clock[1]!) * 60n + BigInt(clock[2]!);
    return minutes > 0n && minutes <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(minutes) : null;
  }

  const decimal = /^(\d+)(?:,(\d+))?$/.exec(input);
  if (!decimal) {
    return null;
  }

  const fraction = decimal[2] ?? "";
  const denominator = 10n ** BigInt(fraction.length);
  const minuteNumerator =
    BigInt(decimal[1]!) * 60n * denominator + BigInt(fraction || "0") * 60n;
  if (minuteNumerator % denominator !== 0n) {
    return null;
  }

  const minutes = minuteNumerator / denominator;
  return minutes > 0n && minutes <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(minutes) : null;
}

export async function recordGridTimeEntry(
  member: SessionAccount,
  clientId: string,
  workDate: string,
  durationInput: string,
): Promise<RecordTimeEntryResult> {
  let parsedDate: string;
  try {
    parsedDate = Temporal.PlainDate.from(workDate).toString();
  } catch {
    return { ok: false, reason: "invalid-date" };
  }
  if (parsedDate !== workDate) {
    return { ok: false, reason: "invalid-date" };
  }

  const durationMinutes = parseDurationMinutes(durationInput);
  if (durationMinutes === null) {
    return { ok: false, reason: "invalid-duration" };
  }
  if (durationMinutes > 1_440) {
    return { ok: false, reason: "daily-limit" };
  }

  try {
    return await db.transaction(
      async (transaction) => {
        const activeMember = await transaction.query.accounts.findFirst({
          where: and(eq(accounts.id, member.accountId), eq(accounts.active, true)),
          columns: { id: true },
        });
        if (!activeMember) {
          return { ok: false, reason: "member-unavailable" } as const;
        }

        const activeClient = await transaction.query.clients.findFirst({
          where: and(eq(clients.id, clientId), eq(clients.archived, false)),
          columns: { id: true },
        });
        if (!activeClient) {
          return { ok: false, reason: "client-unavailable" } as const;
        }

        const [recordedForDate] = await transaction
          .select({ minutes: sum(timeEntries.durationMinutes) })
          .from(timeEntries)
          .where(
            and(
              eq(timeEntries.accountId, member.accountId),
              eq(timeEntries.workDate, workDate),
            ),
          );
        const recordedMinutes = Number(recordedForDate?.minutes ?? 0);
        if (recordedMinutes + durationMinutes > 1_440) {
          return { ok: false, reason: "daily-limit" } as const;
        }

        await transaction.insert(timeEntries).values({
          accountId: member.accountId,
          clientId,
          workDate,
          durationMinutes,
          description: null,
          classification: "billable",
        });
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
