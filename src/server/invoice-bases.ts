import "server-only";
import { Temporal } from "@js-temporal/polyfill";

import { and, asc, count, eq, gt, gte, isNull, lt, lte, sum } from "drizzle-orm";

import type { SessionAccount } from "@/server/access";
import { db } from "@/server/db";
import { accounts, clients, timeEntries } from "@/server/db/schema";

export interface ReviewTimeEntry {
  id: string;
  accountId: string;
  accountDisplayName: string;
  accountActive: boolean;
  workDate: string;
  durationMinutes: number;
  description: string | null;
  version: number;
}

export interface AvailableBillableTimeSummary {
  entryCount: number;
  durationMinutes: number;
}

export interface AvailableBillableTimeReview {
  client: {
    id: string;
    displayName: string;
    archived: boolean;
  };
  startDate: string;
  endDate: string;
  availableEntries: ReviewTimeEntry[];
  members: Array<{
    id: string;
    displayName: string;
  }>;
  nonBillableEntries: ReviewTimeEntry[];
  nonBillable: AvailableBillableTimeSummary;
  earlierAvailable: AvailableBillableTimeSummary & { oldestDate: string | null };
  laterAvailable: AvailableBillableTimeSummary;
}

export type AvailableBillableTimeReviewResult =
  | { ok: true; review: AvailableBillableTimeReview }
  | { ok: false; reason: "forbidden" | "client-unavailable" | "invalid-date" | "invalid-range" };

function parseIsoDate(value: string): string | null {
  try {
    const parsed = Temporal.PlainDate.from(value);
    return parsed.toString() === value ? value : null;
  } catch {
    return null;
  }
}

function toSummary(row: { entryCount: number; durationMinutes: number | string | null } | undefined): AvailableBillableTimeSummary {
  return {
    entryCount: row?.entryCount ?? 0,
    durationMinutes: Number(row?.durationMinutes ?? 0),
  };
}

export async function getAvailableBillableTimeReview(
  administrator: SessionAccount,
  input: { clientId: string; startDate: string; endDate: string },
): Promise<AvailableBillableTimeReviewResult> {
  if (administrator.role !== "administrator") {
    return { ok: false, reason: "forbidden" };
  }

  const startDate = parseIsoDate(input.startDate);
  const endDate = parseIsoDate(input.endDate);
  if (!startDate || !endDate) {
    return { ok: false, reason: "invalid-date" };
  }
  if (Temporal.PlainDate.compare(startDate, endDate) > 0) {
    return { ok: false, reason: "invalid-range" };
  }

  const [client] = await db
    .select({ id: clients.id, displayName: clients.displayName, archived: clients.archived })
    .from(clients)
    .where(eq(clients.id, input.clientId));
  if (!client) {
    return { ok: false, reason: "client-unavailable" };
  }

  const availableConditions = [
    eq(timeEntries.clientId, client.id),
    eq(timeEntries.classification, "billable"),
    isNull(timeEntries.includedInvoiceBasisId),
  ];
  const [availableEntries, nonBillableEntries, earlierRows, earliestAvailableRows, laterRows] = await Promise.all([
    db
      .select({
        id: timeEntries.id,
        accountId: accounts.id,
        accountDisplayName: accounts.displayName,
        accountActive: accounts.active,
        workDate: timeEntries.workDate,
        durationMinutes: timeEntries.durationMinutes,
        description: timeEntries.description,
        version: timeEntries.version,
      })
      .from(timeEntries)
      .innerJoin(accounts, eq(accounts.id, timeEntries.accountId))
      .where(and(...availableConditions, gte(timeEntries.workDate, startDate), lte(timeEntries.workDate, endDate)))
      .orderBy(asc(accounts.displayName), asc(timeEntries.workDate), asc(timeEntries.id)),
    db
      .select({
        id: timeEntries.id,
        accountId: accounts.id,
        accountDisplayName: accounts.displayName,
        accountActive: accounts.active,
        workDate: timeEntries.workDate,
        durationMinutes: timeEntries.durationMinutes,
        description: timeEntries.description,
        version: timeEntries.version,
      })
      .from(timeEntries)
      .innerJoin(accounts, eq(accounts.id, timeEntries.accountId))
      .where(and(eq(timeEntries.clientId, client.id), eq(timeEntries.classification, "non_billable"), gte(timeEntries.workDate, startDate), lte(timeEntries.workDate, endDate)))
      .orderBy(asc(accounts.displayName), asc(timeEntries.workDate), asc(timeEntries.id)),
    db
      .select({ entryCount: count(), durationMinutes: sum(timeEntries.durationMinutes) })
      .from(timeEntries)
      .where(and(...availableConditions, lt(timeEntries.workDate, startDate))),
    db
      .select({ oldestDate: timeEntries.workDate })
      .from(timeEntries)
      .where(and(...availableConditions, lt(timeEntries.workDate, startDate)))
      .orderBy(asc(timeEntries.workDate))
      .limit(1),
    db
      .select({ entryCount: count(), durationMinutes: sum(timeEntries.durationMinutes) })
      .from(timeEntries)
      .where(and(...availableConditions, gt(timeEntries.workDate, endDate))),
  ]);

  const members = [...new Map(availableEntries.map((entry) => [entry.accountId, { id: entry.accountId, displayName: entry.accountDisplayName }])).values()];
  const earliest = earliestAvailableRows[0];
  return {
    ok: true,
    review: {
      client,
      startDate,
      endDate,
      availableEntries,
      members,
      nonBillableEntries,
      nonBillable: {
        entryCount: nonBillableEntries.length,
        durationMinutes: nonBillableEntries.reduce((total, entry) => total + entry.durationMinutes, 0),
      },
      earlierAvailable: { ...toSummary(earlierRows[0]), oldestDate: earliest?.oldestDate ?? null },
      laterAvailable: toSummary(laterRows[0]),
    },
  };
}
