"use client";

import { useMemo, useState } from "react";

import type { AvailableBillableTimeReview } from "@/server/invoice-bases";

function formatDuration(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${(minutes % 60).toString().padStart(2, "0")}`;
}

function summaryText(summary: { entryCount: number; durationMinutes: number }): string {
  return `${summary.entryCount} ${summary.entryCount === 1 ? "entry" : "entries"} · ${formatDuration(summary.durationMinutes)}`;
}

export function AvailableTimeReview({ review }: { review: AvailableBillableTimeReview }) {
  const [selectedEntryIds, setSelectedEntryIds] = useState(() => new Set(review.availableEntries.map((entry) => entry.id)));
  const [visibleMemberIds, setVisibleMemberIds] = useState(() => new Set(review.members.map((member) => member.id)));
  const selectedEntries = useMemo(
    () => review.availableEntries.filter((entry) => selectedEntryIds.has(entry.id)),
    [review.availableEntries, selectedEntryIds],
  );
  const excludedEntries = review.availableEntries.length - selectedEntries.length;
  const selectedMinutes = selectedEntries.reduce((total, entry) => total + entry.durationMinutes, 0);
  const excludedMinutes = review.availableEntries.reduce(
    (total, entry) => total + (selectedEntryIds.has(entry.id) ? 0 : entry.durationMinutes),
    0,
  );
  const visibleEntries = review.availableEntries.filter((entry) => visibleMemberIds.has(entry.accountId));

  return (
    <section aria-label="Available Billable Time review" className="mt-8 space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">Available Billable Time</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {review.client.displayName}{review.client.archived ? " (archived)" : ""}
            </h2>
            <p className="mt-2 text-sm text-slate-600">Inclusive Swedish-local range: {review.startDate} to {review.endDate}</p>
          </div>
          <div className="text-right text-sm tabular-nums text-slate-700">
            <p className="font-semibold text-slate-950">{selectedEntries.length} selected · {formatDuration(selectedMinutes)}</p>
            <p className="mt-1">{excludedEntries} excluded · {formatDuration(excludedMinutes)}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-4 border-t border-slate-100 pt-5 text-sm text-slate-700">
          <p>Non-billable context: {summaryText(review.nonBillable)}</p>
          <p>Earlier Available Billable Time: {summaryText(review.earlierAvailable)}{review.earlierAvailable.oldestDate ? `; oldest date ${review.earlierAvailable.oldestDate}` : ""}</p>
          <p>Later Available Billable Time: {summaryText(review.laterAvailable)}</p>
        </div>
        {review.nonBillableEntries.length > 0 ? (
          <div className="mt-5 border-t border-slate-100 pt-5 text-sm text-slate-700">
            <h3 className="font-semibold text-slate-950">Non-billable entries</h3>
            <ul className="mt-3 space-y-2">
              {review.nonBillableEntries.map((entry) => (
                <li key={entry.id}>
                  {entry.workDate} · {entry.accountDisplayName} · {formatDuration(entry.durationMinutes)} · {entry.description ?? "No description"}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <fieldset>
          <legend className="text-sm font-semibold text-slate-950">Visible Members</legend>
          <p className="mt-1 text-sm text-slate-600">Filtering review rows never changes the selected Invoice Basis composition.</p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3">
            {review.members.map((member) => (
              <label className="flex items-center gap-2 text-sm text-slate-700" key={member.id}>
                <input
                  aria-label={`Review rows for ${member.displayName}`}
                  checked={visibleMemberIds.has(member.id)}
                  onChange={(event) => {
                    const isVisible = event.currentTarget.checked;
                    setVisibleMemberIds((current) => {
                      const next = new Set(current);
                      if (isVisible) next.add(member.id);
                      else next.delete(member.id);
                      return next;
                    });
                  }}
                  type="checkbox"
                />
                {member.displayName}
              </label>
            ))}
          </div>
        </fieldset>

        {review.availableEntries.length === 0 ? (
          <p className="mt-6 rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-700">No Available Billable Time exists in this range.</p>
        ) : (
          <table className="mt-6 w-full border-collapse text-left text-sm">
            <thead className="border-y border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3 font-semibold">Include</th>
                <th className="px-3 py-3 font-semibold">Date</th>
                <th className="px-3 py-3 font-semibold">Member</th>
                <th className="px-3 py-3 font-semibold">Description</th>
                <th className="px-3 py-3 text-right font-semibold">Duration</th>
              </tr>
            </thead>
            <tbody>
              {visibleEntries.map((entry) => (
                <tr className="border-b border-slate-100" key={entry.id}>
                  <td className="px-3 py-3">
                    <input
                      aria-label={`Include ${entry.workDate}, ${entry.accountDisplayName}, ${formatDuration(entry.durationMinutes)}`}
                      checked={selectedEntryIds.has(entry.id)}
                      onChange={(event) => {
                        const isSelected = event.currentTarget.checked;
                        setSelectedEntryIds((current) => {
                          const next = new Set(current);
                          if (isSelected) next.add(entry.id);
                          else next.delete(entry.id);
                          return next;
                        });
                      }}
                      type="checkbox"
                    />
                  </td>
                  <td className="px-3 py-3 tabular-nums text-slate-700">{entry.workDate}</td>
                  <td className="px-3 py-3 text-slate-950">{entry.accountDisplayName}{entry.accountActive ? "" : " (deactivated)"}</td>
                  <td className="px-3 py-3 text-slate-700">{entry.description ?? "No description"}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-950">{formatDuration(entry.durationMinutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
          <p className="text-sm text-slate-600">At least one selected entry is required to create an Invoice Basis.</p>
          <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300" disabled={selectedEntries.length === 0} type="button">
            Create Invoice Basis
          </button>
        </div>
      </div>
    </section>
  );
}
