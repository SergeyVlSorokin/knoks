import "server-only";

import { Temporal } from "@js-temporal/polyfill";
import { and, asc, eq, gte, inArray, lte, ne, sql, sum } from "drizzle-orm";

import type { SessionAccount } from "@/server/access";
import { db } from "@/server/db";
import {
  accounts,
  clients,
  standingClientRows,
  timeEntries,
  timeEntryAudits,
  type AccountRole,
} from "@/server/db/schema";

const STOCKHOLM_TIME_ZONE = "Europe/Stockholm";
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const DAILY_MINUTE_LIMIT = 1_440;

export interface WeekDate {
  isoDate: string;
  weekday: string;
}

export interface DurationSummary {
  billableMinutes: number;
  nonBillableMinutes: number;
  totalMinutes: number;
}

export interface TimeEntrySnapshot {
  accountId: string;
  clientId: string;
  workDate: string;
  durationMinutes: number;
  description: string | null;
  classification: "billable" | "non_billable";
}

export interface TimeEntryAuditSummary {
  timeEntryId: string;
  action: "created" | "updated" | "deleted";
  actingAccountId: string;
  actingDisplayName: string;
  occurredAt: string;
  before: TimeEntrySnapshot | null;
  after: TimeEntrySnapshot | null;
}

export interface TimeEntrySummary extends TimeEntrySnapshot {
  id: string;
  accountDisplayName: string;
  accountActive: boolean;
  clientDisplayName: string;
  clientArchived: boolean;
  version: number;
  includedInvoiceBasisId: string | null;
  audits: TimeEntryAuditSummary[];
}

export interface WeeklyClientRow {
  clientId: string;
  displayName: string;
  archived: boolean;
  standing: boolean;
  cells: Record<string, DurationSummary>;
  entries: Record<string, TimeEntrySummary[]>;
  deletedAudits: Record<string, TimeEntryAuditSummary[]>;
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
  deletedHistory: TimeEntryAuditSummary[];
  availableClients: Array<{ clientId: string; displayName: string }>;
  activeClients: Array<{ clientId: string; displayName: string }>;
}

export type StandingRowResult =
  | { ok: true }
  | { ok: false; reason: "account-unavailable" | "client-unavailable" | "reload" };

export type TimeEntryMutationResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "member-unavailable"
        | "client-unavailable"
        | "daily-limit"
        | "invalid-date"
        | "invalid-duration"
        | "description-too-long"
        | "forbidden"
        | "included"
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

function snapshot(entry: {
  accountId: string;
  clientId: string;
  workDate: string;
  durationMinutes: number;
  description: string | null;
  classification: "billable" | "non_billable";
}): TimeEntrySnapshot {
  return {
    accountId: entry.accountId,
    clientId: entry.clientId,
    workDate: entry.workDate,
    durationMinutes: entry.durationMinutes,
    description: entry.description,
    classification: entry.classification,
  };
}

function toAuditSnapshot(row: {
  accountId: string | null;
  clientId: string | null;
  workDate: string | null;
  durationMinutes: number | null;
  description: string | null;
  classification: "billable" | "non_billable" | null;
}): TimeEntrySnapshot | null {
  if (
    !row.accountId ||
    !row.clientId ||
    !row.workDate ||
    row.durationMinutes === null ||
    !row.classification
  ) {
    return null;
  }
  return {
    accountId: row.accountId,
    clientId: row.clientId,
    workDate: row.workDate,
    durationMinutes: row.durationMinutes,
    description: row.description,
    classification: row.classification,
  };
}

function parseDate(value: string): string | null {
  try {
    const parsed = Temporal.PlainDate.from(value).toString();
    return parsed === value ? parsed : null;
  } catch {
    return null;
  }
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

function normalizeDescription(value: string): { value: string | null; tooLong: boolean } {
  const description = value.trim();
  return {
    value: description === "" ? null : description,
    tooLong: Array.from(description).length > 500,
  };
}

function isSerializationFailure(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "40001";
}

type TimeTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type EntryRow = {
  id: string;
  accountId: string;
  clientId: string;
  workDate: string;
  durationMinutes: number;
  description: string | null;
  classification: "billable" | "non_billable";
  version: number;
  includedInvoiceBasisId: string | null;
};

async function lockActiveActor(transaction: TimeTransaction, actor: SessionAccount) {
  const [account] = await transaction
    .select({ id: accounts.id, role: accounts.role })
    .from(accounts)
    .where(and(eq(accounts.id, actor.accountId), eq(accounts.active, true)));
  return account;
}

async function ensureDailyCapacity(
  transaction: TimeTransaction,
  accountId: string,
  workDate: string,
  replacementEntryId: string | undefined,
  durationMinutes: number,
): Promise<boolean> {
  await transaction
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .for("update");
  const conditions = [eq(timeEntries.accountId, accountId), eq(timeEntries.workDate, workDate)];
  if (replacementEntryId) {
    conditions.push(ne(timeEntries.id, replacementEntryId));
  }
  const [recorded] = await transaction
    .select({ minutes: sum(timeEntries.durationMinutes) })
    .from(timeEntries)
    .where(and(...conditions));
  return Number(recorded?.minutes ?? 0) + durationMinutes <= DAILY_MINUTE_LIMIT;
}

async function recordAudit(
  transaction: TimeTransaction,
  action: "created" | "updated" | "deleted",
  actingAccountId: string,
  timeEntryId: string,
  before: TimeEntrySnapshot | null,
  after: TimeEntrySnapshot | null,
) {
  await transaction.insert(timeEntryAudits).values({
    timeEntryId,
    action,
    actingAccountId,
    beforeAccountId: before?.accountId ?? null,
    beforeClientId: before?.clientId ?? null,
    beforeWorkDate: before?.workDate ?? null,
    beforeDurationMinutes: before?.durationMinutes ?? null,
    beforeDescription: before?.description ?? null,
    beforeClassification: before?.classification ?? null,
    afterAccountId: after?.accountId ?? null,
    afterClientId: after?.clientId ?? null,
    afterWorkDate: after?.workDate ?? null,
    afterDurationMinutes: after?.durationMinutes ?? null,
    afterDescription: after?.description ?? null,
    afterClassification: after?.classification ?? null,
  });
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
    (() => {
      const conditions = [gte(timeEntries.workDate, weekStart), lte(timeEntries.workDate, weekEnd)];
      if (member.role !== "administrator") {
        conditions.push(eq(timeEntries.accountId, member.accountId));
      }
      return db
        .select({
          id: timeEntries.id,
          accountId: timeEntries.accountId,
          accountDisplayName: accounts.displayName,
          accountActive: accounts.active,
          clientId: clients.id,
          displayName: clients.displayName,
          archived: clients.archived,
          workDate: timeEntries.workDate,
          durationMinutes: timeEntries.durationMinutes,
          description: timeEntries.description,
          classification: timeEntries.classification,
          version: timeEntries.version,
          includedInvoiceBasisId: timeEntries.includedInvoiceBasisId,
        })
        .from(timeEntries)
        .innerJoin(accounts, eq(accounts.id, timeEntries.accountId))
        .innerJoin(clients, eq(clients.id, timeEntries.clientId))
        .where(and(...conditions))
        .orderBy(asc(clients.displayName), asc(accounts.displayName), asc(timeEntries.workDate));
    })(),
    db
      .select({ clientId: clients.id, displayName: clients.displayName })
      .from(clients)
      .where(eq(clients.archived, false))
      .orderBy(asc(clients.displayName)),
  ]);

  const auditRows = recorded.length
    ? await db
        .select({
          timeEntryId: timeEntryAudits.timeEntryId,
          action: timeEntryAudits.action,
          actingAccountId: timeEntryAudits.actingAccountId,
          actingDisplayName: accounts.displayName,
          occurredAt: timeEntryAudits.occurredAt,
          beforeAccountId: timeEntryAudits.beforeAccountId,
          beforeClientId: timeEntryAudits.beforeClientId,
          beforeWorkDate: timeEntryAudits.beforeWorkDate,
          beforeDurationMinutes: timeEntryAudits.beforeDurationMinutes,
          beforeDescription: timeEntryAudits.beforeDescription,
          beforeClassification: timeEntryAudits.beforeClassification,
          afterAccountId: timeEntryAudits.afterAccountId,
          afterClientId: timeEntryAudits.afterClientId,
          afterWorkDate: timeEntryAudits.afterWorkDate,
          afterDurationMinutes: timeEntryAudits.afterDurationMinutes,
          afterDescription: timeEntryAudits.afterDescription,
          afterClassification: timeEntryAudits.afterClassification,
        })
        .from(timeEntryAudits)
        .innerJoin(accounts, eq(accounts.id, timeEntryAudits.actingAccountId))
        .where(inArray(timeEntryAudits.timeEntryId, recorded.map((entry) => entry.id)))
        .orderBy(asc(timeEntryAudits.occurredAt))
    : [];

  const deletedEntryConditions = [
    eq(timeEntryAudits.action, "deleted"),
    gte(timeEntryAudits.beforeWorkDate, weekStart),
    lte(timeEntryAudits.beforeWorkDate, weekEnd),
  ];
  if (member.role !== "administrator") {
    deletedEntryConditions.push(eq(timeEntryAudits.beforeAccountId, member.accountId));
  }
  const deletedEntryRows = await db
    .select({ timeEntryId: timeEntryAudits.timeEntryId })
    .from(timeEntryAudits)
    .where(and(...deletedEntryConditions));
  const deletedEntryIds = deletedEntryRows.map((entry) => entry.timeEntryId);
  const deletedAuditRows = deletedEntryIds.length
    ? await db
        .select({
          timeEntryId: timeEntryAudits.timeEntryId,
          action: timeEntryAudits.action,
          actingAccountId: timeEntryAudits.actingAccountId,
          actingDisplayName: accounts.displayName,
          occurredAt: timeEntryAudits.occurredAt,
          beforeAccountId: timeEntryAudits.beforeAccountId,
          beforeClientId: timeEntryAudits.beforeClientId,
          beforeWorkDate: timeEntryAudits.beforeWorkDate,
          beforeDurationMinutes: timeEntryAudits.beforeDurationMinutes,
          beforeDescription: timeEntryAudits.beforeDescription,
          beforeClassification: timeEntryAudits.beforeClassification,
          afterAccountId: timeEntryAudits.afterAccountId,
          afterClientId: timeEntryAudits.afterClientId,
          afterWorkDate: timeEntryAudits.afterWorkDate,
          afterDurationMinutes: timeEntryAudits.afterDurationMinutes,
          afterDescription: timeEntryAudits.afterDescription,
          afterClassification: timeEntryAudits.afterClassification,
        })
        .from(timeEntryAudits)
        .innerJoin(accounts, eq(accounts.id, timeEntryAudits.actingAccountId))
        .where(inArray(timeEntryAudits.timeEntryId, deletedEntryIds))
        .orderBy(asc(timeEntryAudits.occurredAt))
    : [];

  const auditsByEntry = new Map<string, TimeEntryAuditSummary[]>();
  for (const audit of auditRows) {
    const entryAudits = auditsByEntry.get(audit.timeEntryId) ?? [];
    entryAudits.push({
      timeEntryId: audit.timeEntryId,
      action: audit.action,
      actingAccountId: audit.actingAccountId,
      actingDisplayName: audit.actingDisplayName,
      occurredAt: audit.occurredAt.toISOString(),
      before: toAuditSnapshot({
        accountId: audit.beforeAccountId,
        clientId: audit.beforeClientId,
        workDate: audit.beforeWorkDate,
        durationMinutes: audit.beforeDurationMinutes,
        description: audit.beforeDescription,
        classification: audit.beforeClassification,
      }),
      after: toAuditSnapshot({
        accountId: audit.afterAccountId,
        clientId: audit.afterClientId,
        workDate: audit.afterWorkDate,
        durationMinutes: audit.afterDurationMinutes,
        description: audit.afterDescription,
        classification: audit.afterClassification,
      }),
    });
    auditsByEntry.set(audit.timeEntryId, entryAudits);
  }

  const deletedAuditsByCell = new Map<string, TimeEntryAuditSummary[]>();
  const deletedHistory: TimeEntryAuditSummary[] = [];
  for (const audit of deletedAuditRows) {
    const clientId = audit.beforeClientId ?? audit.afterClientId;
    const workDate = audit.beforeWorkDate ?? audit.afterWorkDate;
    if (!clientId || !workDate) continue;
    const summary: TimeEntryAuditSummary = {
      timeEntryId: audit.timeEntryId,
      action: audit.action,
      actingAccountId: audit.actingAccountId,
      actingDisplayName: audit.actingDisplayName,
      occurredAt: audit.occurredAt.toISOString(),
      before: toAuditSnapshot({
        accountId: audit.beforeAccountId,
        clientId: audit.beforeClientId,
        workDate: audit.beforeWorkDate,
        durationMinutes: audit.beforeDurationMinutes,
        description: audit.beforeDescription,
        classification: audit.beforeClassification,
      }),
      after: toAuditSnapshot({
        accountId: audit.afterAccountId,
        clientId: audit.afterClientId,
        workDate: audit.afterWorkDate,
        durationMinutes: audit.afterDurationMinutes,
        description: audit.afterDescription,
        classification: audit.afterClassification,
      }),
    };
    deletedHistory.push(summary);
    const key = `${clientId}:${workDate}`;
    const cellAudits = deletedAuditsByCell.get(key) ?? [];
    cellAudits.push(summary);
    deletedAuditsByCell.set(key, cellAudits);
  }

  const rows = new Map<string, WeeklyClientRow>();
  for (const client of standing) {
    rows.set(client.clientId, {
      ...client,
      standing: true,
      cells: {},
      entries: {},
      deletedAudits: {},
      summary: emptySummary(),
    });
  }

  const dateSummaries = Object.fromEntries(week.dates.map((date) => [date.isoDate, emptySummary()]));
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
        entries: {},
        deletedAudits: {},
        summary: emptySummary(),
      };
      rows.set(entry.clientId, row);
    }

    const entrySummary: TimeEntrySummary = {
      id: entry.id,
      accountId: entry.accountId,
      accountDisplayName: entry.accountDisplayName,
      accountActive: entry.accountActive,
      clientId: entry.clientId,
      clientDisplayName: entry.displayName,
      clientArchived: entry.archived,
      workDate: entry.workDate,
      durationMinutes: entry.durationMinutes,
      description: entry.description,
      classification: entry.classification,
      version: entry.version,
      includedInvoiceBasisId: entry.includedInvoiceBasisId,
      audits: auditsByEntry.get(entry.id) ?? [],
    };
    const cellEntries = row.entries[entry.workDate] ?? [];
    cellEntries.push(entrySummary);
    row.entries[entry.workDate] = cellEntries;

    const cell = row.cells[entry.workDate] ?? emptySummary();
    row.cells[entry.workDate] = cell;
    addDuration(cell, entry.classification, entry.durationMinutes);
    addDuration(row.summary, entry.classification, entry.durationMinutes);
    addDuration(dateSummaries[entry.workDate]!, entry.classification, entry.durationMinutes);
    addDuration(summary, entry.classification, entry.durationMinutes);
  }

  for (const row of rows.values()) {
    for (const date of week.dates) {
      const audits = deletedAuditsByCell.get(`${row.clientId}:${date.isoDate}`);
      if (audits) row.deletedAudits[date.isoDate] = audits;
    }
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
    deletedHistory,
    availableClients: activeClients.filter((client) => !standingClientIds.has(client.clientId)),
    activeClients,
  };
}

export async function createTimeEntry(
  member: SessionAccount,
  input: {
    clientId: string;
    workDate: string;
    duration: string;
    description: string;
    classification: "billable" | "non_billable";
  },
): Promise<TimeEntryMutationResult> {
  const parsedDate = parseDate(input.workDate);
  if (!parsedDate) return { ok: false, reason: "invalid-date" };
  const durationMinutes = parseDurationMinutes(input.duration);
  if (!durationMinutes || durationMinutes > DAILY_MINUTE_LIMIT) {
    return { ok: false, reason: durationMinutes ? "daily-limit" : "invalid-duration" };
  }
  const description = normalizeDescription(input.description);
  if (description.tooLong) return { ok: false, reason: "description-too-long" };

  try {
    return await db.transaction(
      async (transaction) => {
        const actor = await lockActiveActor(transaction, member);
        if (!actor) return { ok: false, reason: "member-unavailable" } as const;
        const [client] = await transaction
          .select({ id: clients.id })
          .from(clients)
          .where(and(eq(clients.id, input.clientId), eq(clients.archived, false)));
        if (!client) return { ok: false, reason: "client-unavailable" } as const;
        if (!(await ensureDailyCapacity(transaction, actor.id, parsedDate, undefined, durationMinutes))) {
          return { ok: false, reason: "daily-limit" } as const;
        }
        const [created] = await transaction
          .insert(timeEntries)
          .values({
            accountId: actor.id,
            clientId: input.clientId,
            workDate: parsedDate,
            durationMinutes,
            description: description.value,
            classification: input.classification,
          })
          .returning({ id: timeEntries.id });
        await recordAudit(
          transaction,
          "created",
          actor.id,
          created!.id,
          null,
          snapshot({
            accountId: actor.id,
            clientId: input.clientId,
            workDate: parsedDate,
            durationMinutes,
            description: description.value,
            classification: input.classification,
          }),
        );
        return { ok: true } as const;
      },
      { isolationLevel: "serializable" },
    );
  } catch (error) {
    if (isSerializationFailure(error)) return { ok: false, reason: "reload" };
    throw error;
  }
}

export async function recordGridTimeEntry(
  member: SessionAccount,
  clientId: string,
  workDate: string,
  durationInput: string,
): Promise<TimeEntryMutationResult> {
  return createTimeEntry(member, {
    clientId,
    workDate,
    duration: durationInput,
    description: "",
    classification: "billable",
  });
}

async function findEntryForUpdate(transaction: TimeTransaction, entryId: string, version: number) {
  const [entry] = await transaction
    .select({
      id: timeEntries.id,
      accountId: timeEntries.accountId,
      clientId: timeEntries.clientId,
      workDate: timeEntries.workDate,
      durationMinutes: timeEntries.durationMinutes,
      description: timeEntries.description,
      classification: timeEntries.classification,
      version: timeEntries.version,
      includedInvoiceBasisId: timeEntries.includedInvoiceBasisId,
    })
    .from(timeEntries)
    .where(and(eq(timeEntries.id, entryId), eq(timeEntries.version, version)))
    .for("update");
  return entry as EntryRow | undefined;
}

function canManageEntry(actor: { id: string; role: AccountRole }, entry: EntryRow): boolean {
  return actor.role === "administrator" || actor.id === entry.accountId;
}

export async function updateTimeEntry(
  member: SessionAccount,
  input: {
    entryId: string;
    version: number;
    clientId: string;
    workDate: string;
    duration: string;
    description: string;
    classification: "billable" | "non_billable";
  },
): Promise<TimeEntryMutationResult> {
  const parsedDate = parseDate(input.workDate);
  if (!parsedDate) return { ok: false, reason: "invalid-date" };
  const durationMinutes = parseDurationMinutes(input.duration);
  if (!durationMinutes || durationMinutes > DAILY_MINUTE_LIMIT) {
    return { ok: false, reason: durationMinutes ? "daily-limit" : "invalid-duration" };
  }
  const description = normalizeDescription(input.description);
  if (description.tooLong) return { ok: false, reason: "description-too-long" };

  try {
    return await db.transaction(
      async (transaction) => {
        const actor = await lockActiveActor(transaction, member);
        if (!actor) return { ok: false, reason: "member-unavailable" } as const;
        const entry = await findEntryForUpdate(transaction, input.entryId, input.version);
        if (!entry) return { ok: false, reason: "reload" } as const;
        if (!canManageEntry(actor, entry)) return { ok: false, reason: "forbidden" } as const;
        if (entry.includedInvoiceBasisId) return { ok: false, reason: "included" } as const;

        if (input.clientId !== entry.clientId) {
          const [activeClient] = await transaction
            .select({ id: clients.id })
            .from(clients)
            .where(and(eq(clients.id, input.clientId), eq(clients.archived, false)));
          if (!activeClient) return { ok: false, reason: "client-unavailable" } as const;
        }
        if (
          !(await ensureDailyCapacity(
            transaction,
            entry.accountId,
            parsedDate,
            entry.id,
            durationMinutes,
          ))
        ) {
          return { ok: false, reason: "daily-limit" } as const;
        }

        const before = snapshot(entry);
        const after = snapshot({
          accountId: entry.accountId,
          clientId: input.clientId,
          workDate: parsedDate,
          durationMinutes,
          description: description.value,
          classification: input.classification,
        });
        const updated = await transaction
          .update(timeEntries)
          .set({
            clientId: input.clientId,
            workDate: parsedDate,
            durationMinutes,
            description: description.value,
            classification: input.classification,
            version: sql`${timeEntries.version} + 1`,
          })
          .where(and(eq(timeEntries.id, entry.id), eq(timeEntries.version, input.version)))
          .returning({ id: timeEntries.id });
        if (updated.length !== 1) return { ok: false, reason: "reload" } as const;
        await recordAudit(transaction, "updated", actor.id, entry.id, before, after);
        return { ok: true } as const;
      },
      { isolationLevel: "serializable" },
    );
  } catch (error) {
    if (isSerializationFailure(error)) return { ok: false, reason: "reload" };
    throw error;
  }
}

export async function deleteTimeEntry(
  member: SessionAccount,
  entryId: string,
  version: number,
): Promise<TimeEntryMutationResult> {
  try {
    return await db.transaction(
      async (transaction) => {
        const actor = await lockActiveActor(transaction, member);
        if (!actor) return { ok: false, reason: "member-unavailable" } as const;
        const entry = await findEntryForUpdate(transaction, entryId, version);
        if (!entry) return { ok: false, reason: "reload" } as const;
        if (!canManageEntry(actor, entry)) return { ok: false, reason: "forbidden" } as const;
        if (entry.includedInvoiceBasisId) return { ok: false, reason: "included" } as const;
        const deleted = await transaction
          .delete(timeEntries)
          .where(and(eq(timeEntries.id, entry.id), eq(timeEntries.version, version)))
          .returning({ id: timeEntries.id });
        if (deleted.length !== 1) return { ok: false, reason: "reload" } as const;
        await recordAudit(transaction, "deleted", actor.id, entry.id, snapshot(entry), null);
        return { ok: true } as const;
      },
      { isolationLevel: "serializable" },
    );
  } catch (error) {
    if (isSerializationFailure(error)) return { ok: false, reason: "reload" };
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
        if (!activeMember) return { ok: false, reason: "account-unavailable" } as const;
        const activeClient = await transaction.query.clients.findFirst({
          where: and(eq(clients.id, clientId), eq(clients.archived, false)),
          columns: { id: true },
        });
        if (!activeClient) return { ok: false, reason: "client-unavailable" } as const;
        await transaction
          .insert(standingClientRows)
          .values({ accountId: member.accountId, clientId })
          .onConflictDoNothing();
        return { ok: true } as const;
      },
      { isolationLevel: "serializable" },
    );
  } catch (error) {
    if (isSerializationFailure(error)) return { ok: false, reason: "reload" };
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
        if (!activeMember) return { ok: false, reason: "account-unavailable" } as const;
        await transaction
          .delete(standingClientRows)
          .where(and(eq(standingClientRows.accountId, member.accountId), eq(standingClientRows.clientId, clientId)));
        return { ok: true } as const;
      },
      { isolationLevel: "serializable" },
    );
  } catch (error) {
    if (isSerializationFailure(error)) return { ok: false, reason: "reload" };
    throw error;
  }
}
