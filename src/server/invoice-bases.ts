import "server-only";
import { Temporal } from "@js-temporal/polyfill";

import { and, asc, count, desc, eq, gt, gte, inArray, isNull, lt, lte, sql, sum } from "drizzle-orm";

import type { SessionAccount } from "@/server/access";
import { db } from "@/server/db";
import { accounts, clients, timeEntries, invoiceBasis, invoiceBasisItems, companyWorkspace } from "@/server/db/schema";

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

function isSerializationFailure(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "40001";
}

export interface CreateInvoiceBasisInput {
  clientId: string;
  startDate: string;
  endDate: string;
  selectedEntries: Array<{ id: string; version: number }>;
}

export type CreateInvoiceBasisResult =
  | { ok: true; sequenceNumber: number; id: string }
  | { ok: false; reason: "forbidden" | "client-unavailable" | "no-entries-selected" | "reload" };

export async function createInvoiceBasis(
  administrator: SessionAccount,
  input: CreateInvoiceBasisInput,
): Promise<CreateInvoiceBasisResult> {
  if (administrator.role !== "administrator") {
    return { ok: false, reason: "forbidden" };
  }

  const startDate = parseIsoDate(input.startDate);
  const endDate = parseIsoDate(input.endDate);
  if (!startDate || !endDate || Temporal.PlainDate.compare(startDate, endDate) > 0) {
    return { ok: false, reason: "reload" };
  }

  if (input.selectedEntries.length === 0) {
    return { ok: false, reason: "no-entries-selected" };
  }

  try {
    return await db.transaction(
      async (transaction) => {
        const [actor] = await transaction
          .select({ id: accounts.id })
          .from(accounts)
          .where(and(eq(accounts.id, administrator.accountId), eq(accounts.active, true)));
        if (!actor) return { ok: false, reason: "forbidden" } as const;

        const [client] = await transaction
          .select({ id: clients.id })
          .from(clients)
          .where(eq(clients.id, input.clientId));
        if (!client) {
          return { ok: false, reason: "client-unavailable" } as const;
        }

        const [workspace] = await transaction
          .select({ nextSequence: companyWorkspace.nextInvoiceBasisSequence })
          .from(companyWorkspace)
          .where(eq(companyWorkspace.id, 1))
          .for("update");
        if (!workspace) {
          return { ok: false, reason: "reload" } as const;
        }
        const sequenceNumber = workspace.nextSequence;

        const selectedIds = input.selectedEntries.map((e) => e.id);
        const dbEntries = await transaction
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
            accountDisplayName: accounts.displayName,
          })
          .from(timeEntries)
          .innerJoin(accounts, eq(accounts.id, timeEntries.accountId))
          .where(inArray(timeEntries.id, selectedIds))
          .for("update");

        if (dbEntries.length !== selectedIds.length) {
          return { ok: false, reason: "reload" } as const;
        }

        const entryMap = new Map(dbEntries.map((e) => [e.id, e]));
        for (const inputEntry of input.selectedEntries) {
          const dbEntry = entryMap.get(inputEntry.id);
          if (!dbEntry) {
            return { ok: false, reason: "reload" } as const;
          }
          if (
            dbEntry.version !== inputEntry.version ||
            dbEntry.includedInvoiceBasisId !== null ||
            dbEntry.classification !== "billable" ||
            dbEntry.clientId !== input.clientId
          ) {
            return { ok: false, reason: "reload" } as const;
          }
        }

        const [newBasis] = await transaction
          .insert(invoiceBasis)
          .values({
            sequenceNumber,
            clientId: input.clientId,
            startDate,
            endDate,
            createdByAccountId: actor.id,
          })
          .returning({ id: invoiceBasis.id });

        if (!newBasis) {
          return { ok: false, reason: "reload" } as const;
        }

        await transaction.insert(invoiceBasisItems).values(
          dbEntries.map((entry) => ({
            invoiceBasisId: newBasis.id,
            timeEntryId: entry.id,
            accountId: entry.accountId,
            accountDisplayName: entry.accountDisplayName,
            workDate: entry.workDate,
            durationMinutes: entry.durationMinutes,
            description: entry.description,
            classification: entry.classification,
          })),
        );

        await transaction
          .update(companyWorkspace)
          .set({ nextInvoiceBasisSequence: sequenceNumber + 1 })
          .where(eq(companyWorkspace.id, 1));

        await transaction
          .update(timeEntries)
          .set({
            includedInvoiceBasisId: newBasis.id,
            version: sql`${timeEntries.version} + 1`,
          })
          .where(inArray(timeEntries.id, selectedIds));

        return { ok: true, sequenceNumber, id: newBasis.id } as const;
      },
      { isolationLevel: "serializable" },
    );
  } catch (error) {
    if (isSerializationFailure(error)) return { ok: false, reason: "reload" };
    throw error;
  }
}

export interface InvoiceBasisHistoryItem {
  id: string;
  sequenceNumber: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  createdByDisplayName: string;
  voidedAt: string | null;
}

export async function getInvoiceBasesForClient(
  administrator: SessionAccount,
  clientId: string,
): Promise<InvoiceBasisHistoryItem[] | null> {
  if (administrator.role !== "administrator") {
    return null;
  }

  const rows = await db
    .select({
      id: invoiceBasis.id,
      sequenceNumber: invoiceBasis.sequenceNumber,
      startDate: invoiceBasis.startDate,
      endDate: invoiceBasis.endDate,
      createdAt: invoiceBasis.createdAt,
      createdByAccountId: invoiceBasis.createdByAccountId,
      createdByDisplayName: accounts.displayName,
      voidedAt: invoiceBasis.voidedAt,
    })
    .from(invoiceBasis)
    .innerJoin(accounts, eq(accounts.id, invoiceBasis.createdByAccountId))
    .where(eq(invoiceBasis.clientId, clientId))
    .orderBy(desc(invoiceBasis.sequenceNumber));

  if (rows.length === 0) return [];

  return rows.map((row) => ({
    id: row.id,
    sequenceNumber: row.sequenceNumber,
    startDate: row.startDate,
    endDate: row.endDate,
    createdAt: row.createdAt.toISOString(),
    createdByDisplayName: row.createdByDisplayName,
    voidedAt: row.voidedAt ? row.voidedAt.toISOString() : null,
  }));
}

export interface InvoiceBasisItemDetail {
  id: string;
  timeEntryId: string;
  accountId: string;
  accountDisplayName: string;
  workDate: string;
  durationMinutes: number;
  description: string | null;
  classification: "billable" | "non_billable";
}

export interface InvoiceBasisDetail {
  id: string;
  sequenceNumber: number;
  clientId: string;
  clientDisplayName: string;
  startDate: string;
  endDate: string;
  createdByAccountId: string;
  createdByDisplayName: string;
  createdAt: string;
  voidedAt: string | null;
  voidedByAccountId: string | null;
  voidedByDisplayName: string | null;
  voidReason: string | null;
  items: InvoiceBasisItemDetail[];
}

export type GetInvoiceBasisResult =
  | { ok: true; invoiceBasis: InvoiceBasisDetail }
  | { ok: false; reason: "forbidden" | "not-found" };

export async function getInvoiceBasisDetails(
  administrator: SessionAccount,
  id: string,
): Promise<GetInvoiceBasisResult> {
  if (administrator.role !== "administrator") {
    return { ok: false, reason: "forbidden" };
  }

  const [basisRow] = await db
    .select({
      id: invoiceBasis.id,
      sequenceNumber: invoiceBasis.sequenceNumber,
      clientId: invoiceBasis.clientId,
      clientDisplayName: clients.displayName,
      startDate: invoiceBasis.startDate,
      endDate: invoiceBasis.endDate,
      createdByAccountId: invoiceBasis.createdByAccountId,
      createdByDisplayName: accounts.displayName,
      createdAt: invoiceBasis.createdAt,
      voidedAt: invoiceBasis.voidedAt,
      voidedByAccountId: invoiceBasis.voidedByAccountId,
      voidReason: invoiceBasis.voidReason,
    })
    .from(invoiceBasis)
    .innerJoin(clients, eq(clients.id, invoiceBasis.clientId))
    .innerJoin(accounts, eq(accounts.id, invoiceBasis.createdByAccountId))
    .where(eq(invoiceBasis.id, id));

  if (!basisRow) {
    return { ok: false, reason: "not-found" };
  }

  let voiderDisplayName: string | null = null;
  if (basisRow.voidedByAccountId) {
    const [voiderRow] = await db
      .select({ displayName: accounts.displayName })
      .from(accounts)
      .where(eq(accounts.id, basisRow.voidedByAccountId));
    if (voiderRow) {
      voiderDisplayName = voiderRow.displayName;
    }
  }

  const items = await db
    .select({
      id: invoiceBasisItems.id,
      timeEntryId: invoiceBasisItems.timeEntryId,
      accountId: invoiceBasisItems.accountId,
      accountDisplayName: invoiceBasisItems.accountDisplayName,
      workDate: invoiceBasisItems.workDate,
      durationMinutes: invoiceBasisItems.durationMinutes,
      description: invoiceBasisItems.description,
      classification: invoiceBasisItems.classification,
    })
    .from(invoiceBasisItems)
    .where(eq(invoiceBasisItems.invoiceBasisId, id))
    .orderBy(asc(invoiceBasisItems.accountDisplayName), asc(invoiceBasisItems.workDate), asc(invoiceBasisItems.id));

  return {
    ok: true,
    invoiceBasis: {
      id: basisRow.id,
      sequenceNumber: basisRow.sequenceNumber,
      clientId: basisRow.clientId,
      clientDisplayName: basisRow.clientDisplayName,
      startDate: basisRow.startDate,
      endDate: basisRow.endDate,
      createdByAccountId: basisRow.createdByAccountId,
      createdByDisplayName: basisRow.createdByDisplayName,
      createdAt: basisRow.createdAt.toISOString(),
      voidedAt: basisRow.voidedAt ? basisRow.voidedAt.toISOString() : null,
      voidedByAccountId: basisRow.voidedByAccountId,
      voidedByDisplayName: voiderDisplayName,
      voidReason: basisRow.voidReason,
      items: items as InvoiceBasisItemDetail[],
    },
  };
}
