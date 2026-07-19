"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { DurationSummary, TimeEntrySnapshot, TimeEntrySummary } from "@/server/time";
import {
  addStandingRowAction,
  createTimeEntryAction,
  deleteTimeEntryAction,
  recordGridTimeEntryAction,
  removeStandingRowAction,
  updateTimeEntryAction,
} from "../actions";
import { initialGridEntryState } from "./grid-entry-state";
import { initialStandingRowState } from "./standing-row-state";
import { initialTimeEntryState } from "./time-entry-state";

interface GridRow {
  clientId: string;
  displayName: string;
  archived: boolean;
  standing: boolean;
  cells: Record<string, DurationSummary>;
  entries: Record<string, TimeEntrySummary[]>;
  deletedAudits: Record<string, TimeEntrySummary["audits"]>;
  summary: DurationSummary;
}

interface WeeklyClientGridProps {
  dates: Array<{ isoDate: string; weekday: string }>;
  rows: GridRow[];
  deletedHistory: TimeEntrySummary["audits"];
  dateSummaries: Record<string, DurationSummary>;
  summary: DurationSummary;
  availableClients: Array<{ clientId: string; displayName: string }>;
  activeClients: Array<{ clientId: string; displayName: string }>;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}:${remainingMinutes.toString().padStart(2, "0")}`;
}

const DISPLAY_TIME_ZONE = "Europe/Stockholm";

function formatOccurredAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function formatSnapshot(value: TimeEntrySnapshot | null): string {
  if (!value) return "—";
  return `${value.workDate}; ${formatDuration(value.durationMinutes)}; ${value.classification === "billable" ? "Billable" : "Non-billable"}; description: ${value.description ?? "none"}; Member identity ${value.accountDisplayName ?? "Unknown Member"}; Client ${value.clientDisplayName ?? "Unknown Client"}`;
}

function Summary({ label, value }: { label: string; value: DurationSummary }) {
  return (
    <span aria-label={label} className="block text-right text-xs font-normal leading-5 tabular-nums text-slate-600">
      <span className="block">{formatDuration(value.billableMinutes)}</span>
      <span className="block">{formatDuration(value.nonBillableMinutes)}</span>
      <span className="block font-semibold text-slate-800">{formatDuration(value.totalMinutes)}</span>
    </span>
  );
}

function SummaryLabels() {
  return (
    <span aria-label="Billable, non-billable, total" className="block text-xs font-normal leading-5 text-slate-600">
      <span className="block">Billable</span>
      <span className="block">Non-billable</span>
      <span className="block font-semibold text-slate-800">Total</span>
    </span>
  );
}

function shortDate(isoDate: string): string {
  return isoDate.slice(5);
}

function nextTarget(
  rowIndex: number,
  dateIndex: number,
  rowCount: number,
  dateCount: number,
  direction: "enter" | "shift-enter" | "tab" | "shift-tab",
): string {
  const total = rowCount * dateCount;
  const columnMajor = dateIndex * rowCount + rowIndex;
  const rowMajor = rowIndex * dateCount + dateIndex;
  const offset = direction.startsWith("shift") ? -1 : 1;
  const current = direction.endsWith("enter") ? columnMajor : rowMajor;
  const next = (current + offset + total) % total;
  const nextRow = direction.endsWith("enter") ? next % rowCount : Math.floor(next / dateCount);
  const nextDate = direction.endsWith("enter") ? Math.floor(next / rowCount) : next % dateCount;
  return `${nextRow}-${nextDate}`;
}

function AuditHistory({ entry }: { entry: TimeEntrySummary }) {
  return (
    <details className="mt-3 rounded-md bg-slate-50 px-3 py-2" open>
      <summary className="cursor-pointer text-xs font-semibold text-slate-700">History</summary>
      <ol className="mt-2 space-y-2 text-xs text-slate-600">
        {entry.audits.map((audit, index) => (
          <li key={`${audit.occurredAt}-${index}`}>
            <p className="font-semibold text-slate-800">
              {audit.action} by {audit.actingDisplayName} at {formatOccurredAt(audit.occurredAt)}
            </p>
            <p>Before: {formatSnapshot(audit.before)}</p>
            <p>After: {formatSnapshot(audit.after)}</p>
          </li>
        ))}
      </ol>
    </details>
  );
}

function TimeEntryEditor({
  entry,
  activeClients,
}: {
  entry: TimeEntrySummary;
  activeClients: Array<{ clientId: string; displayName: string }>;
}) {

  const [state, action, pending] = useActionState(updateTimeEntryAction, initialTimeEntryState);
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteTimeEntryAction,
    initialTimeEntryState,
  );
  const clientOptions = [
    {
      clientId: entry.clientId,
      displayName: entry.clientArchived ? `${entry.clientDisplayName} (Archived)` : entry.clientDisplayName,
    },
    ...activeClients.filter((client) => client.clientId !== entry.clientId),
  ];

  return (
    <li className="rounded-lg border border-slate-200 p-3">
      <p className="text-sm font-semibold text-slate-950">
        {entry.accountDisplayName} · {formatDuration(entry.durationMinutes)} · {entry.classification === "billable" ? "Billable" : "Non-billable"}
      </p>
      <p className="mt-1 text-xs text-slate-600">
        {entry.accountActive ? "Active Member identity" : "Deactivated Member identity"} · Entry {entry.id}
      </p>
      <form action={action} className="mt-3 grid gap-2" key={`${entry.id}-${entry.version}`}>
        <input name="entryId" type="hidden" value={entry.id} />
        <input name="version" type="hidden" value={entry.version} />
        <label className="grid gap-1 text-xs font-semibold text-slate-700">
          Client
          <select className="rounded-md border border-slate-300 px-2 py-1.5 text-sm font-normal text-slate-950" defaultValue={entry.clientId} disabled={pending} name="clientId">
            {clientOptions.map((client) => (
              <option key={client.clientId} value={client.clientId}>{client.displayName}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-slate-700">
          Work date
          <input className="rounded-md border border-slate-300 px-2 py-1.5 text-sm font-normal text-slate-950" defaultValue={entry.workDate} disabled={pending} name="workDate" type="date" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-slate-700">
          Duration
          <input aria-label={`Duration for ${entry.id}`} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm font-normal text-slate-950" defaultValue={formatDuration(entry.durationMinutes)} disabled={pending} name="duration" required type="text" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-slate-700">
          Description
          <textarea className="rounded-md border border-slate-300 px-2 py-1.5 text-sm font-normal text-slate-950" defaultValue={entry.description ?? ""} disabled={pending} name="description" rows={2} />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-slate-700">
          Classification
          <select className="rounded-md border border-slate-300 px-2 py-1.5 text-sm font-normal text-slate-950" defaultValue={entry.classification} disabled={pending} name="classification">
            <option value="billable">Billable</option>
            <option value="non_billable">Non-billable</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60" disabled={pending || Boolean(entry.includedInvoiceBasisId)} type="submit">
            Save entry
          </button>
        </div>
      </form>
      <form action={deleteAction} className="mt-2">
        <input name="entryId" type="hidden" value={entry.id} />
        <input name="version" type="hidden" value={entry.version} />
        <button className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-60" disabled={deletePending || Boolean(entry.includedInvoiceBasisId)} type="submit">
          Delete entry
        </button>
      </form>
      {entry.includedInvoiceBasisId ? <p className="mt-2 text-xs font-medium text-amber-800">Included Billable Time is locked.</p> : null}
      {state.error ? <p className="mt-2 text-xs font-medium text-red-700">{state.error}</p> : null}
      {deleteState.error ? <p className="mt-2 text-xs font-medium text-red-700">{deleteState.error}</p> : null}
      <AuditHistory entry={entry} />
    </li>
  );
}

function DeletedAuditHistory({ audits }: { audits: TimeEntrySummary["audits"] }) {
  if (audits.length === 0) return null;
  return (
    <details className="mt-4 rounded-md bg-amber-50 px-3 py-2">
      <summary className="cursor-pointer text-xs font-semibold text-amber-900">Deleted entry history</summary>
      <ol className="mt-2 space-y-2 text-xs text-amber-900">
        {audits.map((audit, index) => (
          <li key={`${audit.timeEntryId}-${audit.occurredAt}-${index}`}>
            <p className="font-semibold">{audit.action} by {audit.actingDisplayName} at {formatOccurredAt(audit.occurredAt)}</p>
            <p>Before: {formatSnapshot(audit.before)}</p>
            <p>After: {formatSnapshot(audit.after)}</p>
          </li>
        ))}
      </ol>
    </details>
  );
}

function CreateTimeEntryForm({
  clientId,
  workDate,
}: {
  clientId: string;
  workDate: string;
}) {
  const [state, action, pending] = useActionState(createTimeEntryAction, initialTimeEntryState);
  return (
    <form action={action} className="mt-4 rounded-lg border border-dashed border-slate-300 p-3">
      <p className="text-sm font-semibold text-slate-900">Add another entry</p>
      <input name="clientId" type="hidden" value={clientId} />
      <input name="workDate" type="hidden" value={workDate} />
      <div className="mt-2 grid gap-2">
        <label className="grid gap-1 text-xs font-semibold text-slate-700">
          Duration
          <input aria-label="New entry duration" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm font-normal text-slate-950" defaultValue={state.attemptedDuration ?? ""} disabled={pending} name="duration" placeholder="1:30" required type="text" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-slate-700">
          Description
          <textarea aria-label="New entry description" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm font-normal text-slate-950" defaultValue={state.attemptedDescription ?? ""} disabled={pending} name="description" rows={2} />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-slate-700">
          Classification
          <select className="rounded-md border border-slate-300 px-2 py-1.5 text-sm font-normal text-slate-950" defaultValue="billable" disabled={pending} name="classification">
            <option value="billable">Billable</option>
            <option value="non_billable">Non-billable</option>
          </select>
        </label>
        <button className="justify-self-start rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60" disabled={pending} type="submit">Add entry</button>
      </div>
      {state.error ? <p className="mt-2 text-xs font-medium text-red-700">{state.error}</p> : null}
    </form>
  );
}

function TimeEntriesDialog({
  row,
  date,
  activeClients,
  onClose,
}: {
  row: GridRow;
  date: { isoDate: string; weekday: string };
  activeClients: Array<{ clientId: string; displayName: string }>;
  onClose: () => void;
}) {
  const label = `${row.displayName}, ${date.weekday} ${date.isoDate}`;
  const entries = row.entries[date.isoDate] ?? [];
  const deletedAudits = row.deletedAudits[date.isoDate] ?? [];

  return createPortal(
    <div
      aria-label={`${label} Time Entries`}
      aria-modal="false"
      className="fixed right-4 top-24 z-50 max-h-[calc(100vh-7rem)] w-[min(34rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-slate-300 bg-white p-4 text-left shadow-2xl"
      role="dialog"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Time Entries</h3>
          <p className="mt-1 text-xs text-slate-600">{label} · {entries.length} constituent {entries.length === 1 ? "record" : "records"}</p>
        </div>
        <button aria-label="Close Time Entries" className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700" onClick={onClose} type="button">Close</button>
      </div>
      <ol className="mt-4 space-y-3">
        {entries.map((entry) => <TimeEntryEditor activeClients={activeClients} entry={entry} key={entry.id} />)}
      </ol>
      <DeletedAuditHistory audits={deletedAudits} />
      <CreateTimeEntryForm clientId={row.clientId} workDate={date.isoDate} />
    </div>,
    document.body,
  );
}

function GridCell({
  row,
  date,
  rowIndex,
  dateIndex,
  rowCount,
  dateCount,
  onOpen,
  isOpen,
}: {
  row: GridRow;
  date: { isoDate: string; weekday: string };
  rowIndex: number;
  dateIndex: number;
  rowCount: number;
  dateCount: number;
  onOpen: () => void;
  isOpen: boolean;
}) {
  const [state, action, pending] = useActionState(recordGridTimeEntryAction, initialGridEntryState);
  const focusTarget = useRef<string | null>(null);
  const [errorDismissed, setErrorDismissed] = useState(false);
  const cell = row.cells[date.isoDate];
  const label = `${row.displayName}, ${date.weekday} ${date.isoDate}`;
  const target = `${rowIndex}-${dateIndex}`;
  const visibleError = errorDismissed ? undefined : state.error;

  useEffect(() => {
    if (state.error) {
      document.querySelector<HTMLElement>(`[data-grid-target="${target}"]`)?.focus();
      return;
    }
    if (!state.committed || !focusTarget.current) return;
    const next = document.querySelector<HTMLElement>(`[data-grid-target="${focusTarget.current}"]`);
    focusTarget.current = null;
    next?.focus();
  }, [state, target]);

  if (cell?.totalMinutes) {
    const mixed = cell.billableMinutes > 0 && cell.nonBillableMinutes > 0;
    const classificationLabel = mixed
      ? "Mixed Billable and Non-billable"
      : cell.billableMinutes > 0
        ? "Billable"
        : "Non-billable";
    return (
      <div className="relative h-full">
        <button
          aria-expanded={isOpen}
          aria-label={`${label}, ${classificationLabel}`}
          className="flex h-full w-full flex-col items-end justify-center rounded-md px-2 py-1 text-right hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
          data-grid-target={target}
          onClick={onOpen}
          title={classificationLabel}
          type="button"
        >
          <span className="block font-semibold tabular-nums text-slate-950">{formatDuration(cell.totalMinutes)}</span>
          {mixed ? <span className="mt-1 block text-xs tabular-nums text-slate-600">B {formatDuration(cell.billableMinutes)} · NB {formatDuration(cell.nonBillableMinutes)}</span> : <span className="mt-1 block text-xs font-semibold text-blue-700">{cell.billableMinutes > 0 ? "B" : "NB"}</span>}
        </button>
      </div>
    );
  }

  if (row.archived) {
    return <button aria-label={label} className="h-full w-full rounded-md text-right text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600" data-grid-target={target} type="button">—</button>;
  }

  const errorId = `grid-error-${row.clientId}-${date.isoDate}`;
  return (
    <form action={action} className="grid h-full content-center gap-1">
      <input name="clientId" type="hidden" value={row.clientId} />
      <input name="workDate" type="hidden" value={date.isoDate} />
      <input
        aria-describedby={visibleError ? errorId : undefined}
        aria-label={label}
        className="w-full rounded-md border border-slate-300 px-2 py-1 text-right text-sm tabular-nums focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
        data-grid-target={target}
        defaultValue={state.attemptedInput ?? ""}
        disabled={pending}
        name="duration"
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== "Tab") return;
          event.preventDefault();
          const direction = `${event.shiftKey ? "shift-" : ""}${event.key.toLowerCase()}` as "enter" | "shift-enter" | "tab" | "shift-tab";
          const destination = nextTarget(rowIndex, dateIndex, rowCount, dateCount, direction);
          focusTarget.current = destination;
          if (event.currentTarget.value.trim() === "") {
            focusTarget.current = null;
            setErrorDismissed(true);
            document.querySelector<HTMLElement>(`[data-grid-target="${destination}"]`)?.focus();
            return;
          }
          setErrorDismissed(false);
          event.currentTarget.form?.requestSubmit();
        }}
        placeholder="0:00"
        type="text"
      />
      {visibleError ? <span className="text-xs font-medium leading-tight text-red-700" id={errorId}>{visibleError}</span> : null}
    </form>
  );
}

export function WeeklyClientGrid({
  dates,
  rows,
  dateSummaries,
  deletedHistory,
  summary,
  availableClients,
  activeClients,
}: WeeklyClientGridProps) {
  const [addState, addAction, addPending] = useActionState(addStandingRowAction, initialStandingRowState);
  const [removeState, removeAction, removePending] = useActionState(removeStandingRowAction, initialStandingRowState);
  const [openCell, setOpenCell] = useState<{ clientId: string; isoDate: string } | null>(null);
  const selectedRow = openCell ? rows.find((row) => row.clientId === openCell.clientId) : undefined;
  const selectedDate = openCell ? dates.find((date) => date.isoDate === openCell.isoDate) : undefined;

  useEffect(() => {
    if (openCell && (!selectedRow || !selectedDate)) setOpenCell(null);
  }, [openCell, selectedDate, selectedRow]);

  const openTimeEntries = (clientId: string, isoDate: string) => {
    setOpenCell((current) => current?.clientId === clientId && current.isoDate === isoDate ? null : { clientId, isoDate });
  };

  return (
    <section className="mt-6">
      <form action={addAction} className="mb-4 flex items-end gap-3">
        <label className="grid gap-1 text-sm font-medium text-slate-800">
          Add a standing Client row
          <select className="min-w-64 rounded-md border border-slate-300 bg-white px-3 py-2" defaultValue="" name="clientId" required>
            <option disabled value="">Select an active Client</option>
            {availableClients.map((client) => <option key={client.clientId} value={client.clientId}>{client.displayName}</option>)}
          </select>
        </label>
        <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={addPending || availableClients.length === 0} type="submit">Add row</button>
      </form>
      {addState.error ? <p className="mb-4 text-sm font-medium text-red-700">{addState.error}</p> : null}
      {removeState.error ? <p className="mb-4 text-sm font-medium text-red-700">{removeState.error}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table aria-label="Weekly time" className="w-full min-w-[960px] table-fixed border-collapse" role="grid">
          <colgroup><col className="w-56" />{dates.map((date) => <col className="w-28" key={date.isoDate} />)}<col className="w-28" /></colgroup>
          <thead><tr>
            <th className="w-56 border-b border-r border-slate-200 bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-900"><span className="block">Client</span><span className="mt-1 block text-[10px] font-normal text-slate-500">B Billable · NB Non-billable</span></th>
            {dates.map((date) => <th className="border-b border-slate-200 bg-slate-100 px-3 py-3 text-center text-sm font-semibold text-slate-900" key={date.isoDate}><span className="block">{date.weekday}</span><time className="mt-1 block font-normal tabular-nums text-slate-600" dateTime={date.isoDate}>{shortDate(date.isoDate)}</time></th>)}
            <th className="border-b border-l border-slate-200 bg-slate-100 px-3 py-3 text-right text-sm font-semibold text-slate-900">Week</th>
          </tr></thead>
          <tbody>{rows.map((row, rowIndex) => <tr aria-label={row.displayName} key={row.clientId}>
            <th className="border-r border-t border-slate-200 px-4 py-2 text-left" scope="row"><span className="font-semibold text-slate-950">{row.displayName}</span>{row.archived ? <span className="ml-2 text-xs font-medium uppercase tracking-wide text-slate-500">Archived</span> : null}{row.standing ? <form action={removeAction} className="mt-1"><input name="clientId" type="hidden" value={row.clientId} /><button className="text-xs font-semibold text-blue-700 disabled:opacity-50" disabled={removePending} type="submit">Remove row</button></form> : null}</th>
            {dates.map((date, dateIndex) => <td className="h-20 border-t border-slate-200 bg-white px-2 py-1" key={date.isoDate}><GridCell date={date} dateCount={dates.length} dateIndex={dateIndex} isOpen={openCell?.clientId === row.clientId && openCell.isoDate === date.isoDate} onOpen={() => openTimeEntries(row.clientId, date.isoDate)} row={row} rowCount={rows.length} rowIndex={rowIndex} /></td>)}
            <td className="border-l border-t border-slate-200 bg-white px-3 py-2"><Summary label={`${row.displayName} week summary`} value={row.summary} /></td>
          </tr>)}</tbody>
          <tfoot><tr className="bg-slate-50"><th className="border-r border-t border-slate-200 px-4 py-2 text-left" scope="row"><SummaryLabels /></th>{dates.map((date) => <td className="border-t border-slate-200 px-3 py-2" key={date.isoDate}><Summary label={`${date.weekday} ${date.isoDate} summary`} value={dateSummaries[date.isoDate]!} /></td>)}<td className="border-l border-t border-slate-200 px-3 py-2"><Summary label="Whole week summary" value={summary} /></td></tr></tfoot>
        </table>
      </div>
      {selectedRow && selectedDate && typeof document !== "undefined"
        ? <TimeEntriesDialog activeClients={activeClients} date={selectedDate} onClose={() => setOpenCell(null)} row={selectedRow} />
        : null}
      <DeletedAuditHistory audits={deletedHistory} />
    </section>
  );
}
