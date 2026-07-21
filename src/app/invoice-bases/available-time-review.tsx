"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { AvailableBillableTimeReview } from "@/server/invoice-bases";
import { useRouter } from "next/navigation";
import { createInvoiceBasisAction } from "../actions";

function formatDuration(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${(minutes % 60).toString().padStart(2, "0")}`;
}

function summaryText(summary: { entryCount: number; durationMinutes: number }): string {
  return `${summary.entryCount} ${summary.entryCount === 1 ? "entry" : "entries"} · ${formatDuration(summary.durationMinutes)}`;
}
interface MemberReviewGroupProps {
  member: { id: string; displayName: string };
  entries: AvailableBillableTimeReview["availableEntries"];
  selectedEntryIds: Set<string>;
  expanded: boolean;
  onToggle: () => void;
  onSelectEntry: (entryId: string, selected: boolean) => void;
  onSelectMember: (entryIds: string[], selected: boolean) => void;
}

function MemberReviewGroup({
  member,
  entries,
  selectedEntryIds,
  expanded,
  onToggle,
  onSelectEntry,
  onSelectMember,
}: MemberReviewGroupProps) {
  const memberCheckbox = useRef<HTMLInputElement>(null);
  const selectedEntries = entries.filter((entry) => selectedEntryIds.has(entry.id));
  const selectedMinutes = selectedEntries.reduce((total, entry) => total + entry.durationMinutes, 0);
  const totalMinutes = entries.reduce((total, entry) => total + entry.durationMinutes, 0);
  const allSelected = selectedEntries.length === entries.length;
  const partiallySelected = selectedEntries.length > 0 && !allSelected;

  useEffect(() => {
    if (memberCheckbox.current) memberCheckbox.current.indeterminate = partiallySelected;
  }, [partiallySelected]);

  return (
    <section aria-label={`${member.displayName} available time`} className="border-b border-slate-200 last:border-b-0" role="group">
      <div className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4">
        <input
          aria-label={`Include all Available Billable Time for ${member.displayName}`}
          checked={allSelected}
          className="size-4 accent-blue-700"
          onChange={(event) => onSelectMember(entries.map((entry) => entry.id), event.currentTarget.checked)}
          ref={memberCheckbox}
          type="checkbox"
        />
        <button
          aria-expanded={expanded}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${member.displayName}`}
          className="flex size-6 items-center justify-center rounded text-lg text-slate-600 hover:bg-slate-100"
          onClick={onToggle}
          type="button"
        >
          {expanded ? "▾" : "▸"}
        </button>
        <p className="font-semibold text-slate-950">{member.displayName}</p>
        <span className="text-sm tabular-nums text-slate-700">
          {formatDuration(selectedMinutes)} of {formatDuration(totalMinutes)} selected · {selectedEntries.length} of {entries.length} records
        </span>
      </div>
      {expanded ? (
        <ol className="mb-3 ml-12 mr-20">
          {entries.map((entry, index) => (
            <li className="relative grid grid-cols-[auto_7rem_minmax(0,1fr)_5rem] items-center gap-3 py-2" key={entry.id}>
              <span className={`absolute -left-6 border-l border-slate-300 ${index === entries.length - 1 ? "bottom-1/2 top-0" : "inset-y-0"}`} />
              <span className="absolute -left-6 top-1/2 w-5 border-t border-slate-300" />
              <input
                aria-label={`Include ${entry.workDate}, ${entry.accountDisplayName}, ${formatDuration(entry.durationMinutes)}`}
                checked={selectedEntryIds.has(entry.id)}
                className="size-4 accent-blue-700"
                onChange={(event) => onSelectEntry(entry.id, event.currentTarget.checked)}
                type="checkbox"
              />
              <time className="tabular-nums text-slate-700">{entry.workDate}</time>
              <span className="text-slate-700">{entry.description ?? "No description"}</span>
              <span className="pr-2 text-right tabular-nums text-slate-950">{formatDuration(entry.durationMinutes)}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}


export function AvailableTimeReview({ review }: { review: AvailableBillableTimeReview }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [selectedEntryIds, setSelectedEntryIds] = useState(() => new Set(review.availableEntries.map((entry) => entry.id)));
  const [expandedMemberIds, setExpandedMemberIds] = useState<Set<string>>(() => new Set());
  const memberGroups = useMemo(() => {
    const entriesByMember = new Map(review.members.map((member) => [member.id, [] as AvailableBillableTimeReview["availableEntries"]]));
    for (const entry of review.availableEntries) {
      entriesByMember.get(entry.accountId)?.push(entry);
    }
    return review.members.map((member) => ({ member, entries: entriesByMember.get(member.id) ?? [] }));
  }, [review]);
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

  async function handleCreate() {
    if (selectedEntries.length === 0) return;
    setError(null);

    if (excludedEntries > 0) {
      const message = `This partial selection excludes ${excludedEntries} ${
        excludedEntries === 1 ? "entry" : "entries"
      } with a total duration of ${formatDuration(excludedMinutes)}. Are you sure you want to create the Invoice Basis?`;
      if (!window.confirm(message)) {
        return;
      }
    }

    setPending(true);
    try {
      const res = await createInvoiceBasisAction({
        clientId: review.client.id,
        startDate: review.startDate,
        endDate: review.endDate,
        selectedEntries: selectedEntries.map((e) => ({
          id: e.id,
          version: e.version,
        })),
      });

      if (res.ok) {
        router.refresh();
      } else {
        setError(res.error ?? "Failed to create Invoice Basis.");
      }
    } catch (e) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function setEntriesSelected(entryIds: string[], selected: boolean) {
    setSelectedEntryIds((current) => {
      const next = new Set(current);
      for (const entryId of entryIds) {
        if (selected) next.add(entryId);
        else next.delete(entryId);
      }
      return next;
    });
  }

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

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h3 className="text-sm font-semibold text-slate-950">Available Billable Time by Member</h3>
        </div>
        {review.availableEntries.length === 0 ? (
          <p className="m-6 rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-700">No Available Billable Time exists in this range.</p>
        ) : (
          <div>
            {memberGroups.map(({ member, entries }) => (
              <MemberReviewGroup
                entries={entries}
                expanded={expandedMemberIds.has(member.id)}
                key={member.id}
                member={member}
                onSelectEntry={(entryId, selected) => setEntriesSelected([entryId], selected)}
                onSelectMember={setEntriesSelected}
                onToggle={() => {
                  setExpandedMemberIds((current) => {
                    const next = new Set(current);
                    if (next.has(member.id)) next.delete(member.id);
                    else next.add(member.id);
                    return next;
                  });
                }}
                selectedEntryIds={selectedEntryIds}
              />
            ))}
          </div>
        )}

        {error ? (
          <p className="mx-6 mb-4 rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-5">
          <p className="text-sm text-slate-600">At least one selected entry is required to create an Invoice Basis.</p>
          <button
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={selectedEntries.length === 0 || pending}
            onClick={handleCreate}
            type="button"
          >
            {pending ? "Creating..." : "Create Invoice Basis"}
          </button>
        </div>
      </div>
    </section>
  );
}
