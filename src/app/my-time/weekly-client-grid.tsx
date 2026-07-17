"use client";

import { useActionState } from "react";

import { addStandingRowAction, removeStandingRowAction } from "../actions";
import { initialStandingRowState } from "./standing-row-state";

interface WeeklyClientGridProps {
  dates: Array<{ isoDate: string; weekday: string }>;
  rows: Array<{
    clientId: string;
    displayName: string;
    archived: boolean;
    standing: boolean;
  }>;
  availableClients: Array<{ clientId: string; displayName: string }>;
}

export function WeeklyClientGrid({ dates, rows, availableClients }: WeeklyClientGridProps) {
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
        <table aria-label="Weekly time" className="w-full min-w-[960px] border-collapse" role="grid">
          <thead>
            <tr>
              <th className="w-56 border-b border-r border-slate-200 bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-900">
                Client
              </th>
              {dates.map((date) => (
                <th
                  className="border-b border-slate-200 bg-slate-100 px-3 py-3 text-center text-sm font-semibold text-slate-900"
                  key={date.isoDate}
                >
                  <span className="block">{date.weekday}</span>
                  <time className="mt-1 block font-normal text-slate-600" dateTime={date.isoDate}>
                    {date.isoDate}
                  </time>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr aria-label={row.displayName} key={row.clientId}>
                <th className="border-r border-t border-slate-200 px-4 py-3 text-left" scope="row">
                  <span className="font-semibold text-slate-950">{row.displayName}</span>
                  {row.archived ? (
                    <span className="ml-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Archived
                    </span>
                  ) : null}
                  {row.standing ? (
                    <form action={removeAction} className="mt-2">
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
                {dates.map((date) => (
                  <td
                    aria-label={`${row.displayName}, ${date.weekday} ${date.isoDate}`}
                    className="h-20 border-t border-slate-200 bg-white px-3 py-2"
                    key={date.isoDate}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
