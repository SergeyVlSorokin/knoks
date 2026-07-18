"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import type { DurationSummary } from "@/server/time";
import {
  addStandingRowAction,
  recordGridTimeEntryAction,
  removeStandingRowAction,
} from "../actions";
import { initialGridEntryState } from "./grid-entry-state";
import { initialStandingRowState } from "./standing-row-state";

interface GridRow {
  clientId: string;
  displayName: string;
  archived: boolean;
  standing: boolean;
  cells: Record<string, DurationSummary>;
  summary: DurationSummary;
}

interface WeeklyClientGridProps {
  dates: Array<{ isoDate: string; weekday: string }>;
  rows: GridRow[];
  dateSummaries: Record<string, DurationSummary>;
  summary: DurationSummary;
  availableClients: Array<{ clientId: string; displayName: string }>;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}:${remainingMinutes.toString().padStart(2, "0")}`;
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

function GridCell({
  row,
  date,
  rowIndex,
  dateIndex,
  rowCount,
  dateCount,
}: {
  row: GridRow;
  date: { isoDate: string; weekday: string };
  rowIndex: number;
  dateIndex: number;
  rowCount: number;
  dateCount: number;
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
    const next = document.querySelector<HTMLElement>(
      `[data-grid-target="${focusTarget.current}"]`,
    );
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
      <button
        aria-label={`${label}, ${classificationLabel}`}
        className="flex h-full w-full flex-col items-end justify-center rounded-md px-2 py-1 text-right hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-600"
        data-grid-target={target}
        title={classificationLabel}
        type="button"
      >
        <span className="block font-semibold tabular-nums text-slate-950">
          {formatDuration(cell.totalMinutes)}
        </span>
        {mixed ? (
          <span className="mt-1 block text-xs tabular-nums text-slate-600">
            B {formatDuration(cell.billableMinutes)} · NB {formatDuration(cell.nonBillableMinutes)}
          </span>
        ) : (
          <span className="mt-1 block text-xs font-semibold text-blue-700">
            {cell.billableMinutes > 0 ? "B" : "NB"}
          </span>
        )}
      </button>
    );
  }

  if (row.archived) {
    return (
      <button
        aria-label={label}
        className="h-full w-full rounded-md text-right text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
        data-grid-target={target}
        type="button"
      >
        —
      </button>
    );
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
          const direction = `${event.shiftKey ? "shift-" : ""}${event.key.toLowerCase()}` as
            | "enter"
            | "shift-enter"
            | "tab"
            | "shift-tab";
          const destination = nextTarget(
            rowIndex,
            dateIndex,
            rowCount,
            dateCount,
            direction,
          );
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
      {visibleError ? (
        <span className="text-xs font-medium leading-tight text-red-700" id={errorId}>
          {visibleError}
        </span>
      ) : null}
    </form>
  );
}

export function WeeklyClientGrid({
  dates,
  rows,
  dateSummaries,
  summary,
  availableClients,
}: WeeklyClientGridProps) {
  const [addState, addAction, addPending] = useActionState(
    addStandingRowAction,
    initialStandingRowState,
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeStandingRowAction,
    initialStandingRowState,
  );

  return (
    <section className="mt-6">
      <form action={addAction} className="mb-4 flex items-end gap-3">
        <label className="grid gap-1 text-sm font-medium text-slate-800">
          Add a standing Client row
          <select
            className="min-w-64 rounded-md border border-slate-300 bg-white px-3 py-2"
            defaultValue=""
            name="clientId"
            required
          >
            <option disabled value="">
              Select an active Client
            </option>
            {availableClients.map((client) => (
              <option key={client.clientId} value={client.clientId}>
                {client.displayName}
              </option>
            ))}
          </select>
        </label>
        <button
          className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={addPending || availableClients.length === 0}
          type="submit"
        >
          Add row
        </button>
      </form>
      {addState.error ? <p className="mb-4 text-sm font-medium text-red-700">{addState.error}</p> : null}
      {removeState.error ? (
        <p className="mb-4 text-sm font-medium text-red-700">{removeState.error}</p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table aria-label="Weekly time" className="w-full min-w-[960px] table-fixed border-collapse" role="grid">
          <colgroup>
            <col className="w-56" />
            {dates.map((date) => (
              <col className="w-28" key={date.isoDate} />
            ))}
            <col className="w-28" />
          </colgroup>
          <thead>
            <tr>
              <th className="w-56 border-b border-r border-slate-200 bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-900">
                <span className="block">Client</span>
                <span className="mt-1 block text-[10px] font-normal text-slate-500">
                  B Billable · NB Non-billable
                </span>
              </th>
              {dates.map((date) => (
                <th
                  className="border-b border-slate-200 bg-slate-100 px-3 py-3 text-center text-sm font-semibold text-slate-900"
                  key={date.isoDate}
                >
                  <span className="block">{date.weekday}</span>
                  <time className="mt-1 block font-normal tabular-nums text-slate-600" dateTime={date.isoDate}>
                    {shortDate(date.isoDate)}
                  </time>
                </th>
              ))}
              <th className="border-b border-l border-slate-200 bg-slate-100 px-3 py-3 text-right text-sm font-semibold text-slate-900">
                Week
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr aria-label={row.displayName} key={row.clientId}>
                <th className="border-r border-t border-slate-200 px-4 py-2 text-left" scope="row">
                  <span className="font-semibold text-slate-950">{row.displayName}</span>
                  {row.archived ? (
                    <span className="ml-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Archived
                    </span>
                  ) : null}
                  {row.standing ? (
                    <form action={removeAction} className="mt-1">
                      <input name="clientId" type="hidden" value={row.clientId} />
                      <button
                        className="text-xs font-semibold text-blue-700 disabled:opacity-50"
                        disabled={removePending}
                        type="submit"
                      >
                        Remove row
                      </button>
                    </form>
                  ) : null}
                </th>
                {dates.map((date, dateIndex) => (
                  <td className="h-20 border-t border-slate-200 bg-white px-2 py-1" key={date.isoDate}>
                    <GridCell
                      dateCount={dates.length}
                      dateIndex={dateIndex}
                      row={row}
                      date={date}
                      rowCount={rows.length}
                      rowIndex={rowIndex}
                    />
                  </td>
                ))}
                <td className="border-l border-t border-slate-200 bg-white px-3 py-2">
                  <Summary label={`${row.displayName} week summary`} value={row.summary} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50">
              <th className="border-r border-t border-slate-200 px-4 py-2 text-left" scope="row">
                <SummaryLabels />
              </th>
              {dates.map((date) => (
                <td className="border-t border-slate-200 px-3 py-2" key={date.isoDate}>
                  <Summary
                    label={`${date.weekday} ${date.isoDate} summary`}
                    value={dateSummaries[date.isoDate]!}
                  />
                </td>
              ))}
              <td className="border-l border-t border-slate-200 px-3 py-2">
                <Summary label="Whole week summary" value={summary} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
