import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { currentSessionAccount } from "@/server/access/session-cookie";
import { getInvoiceBasisDetails } from "@/server/invoice-bases";
import { WorkspaceHeader } from "../../workspace-header";

function formatDuration(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${(minutes % 60).toString().padStart(2, "0")}`;
}

function formatDecimalHoursSwedish(minutes: number): string {
  const rounded = Math.round((minutes * 5) / 3) / 100;
  return rounded.toFixed(2).replace(".", ",");
}

export default async function InspectInvoiceBasisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const account = await currentSessionAccount();
  if (!account) redirect("/sign-in");
  if (account.role !== "administrator") redirect("/my-time");

  const { id } = await params;
  const result = await getInvoiceBasisDetails(account, id);

  if (!result.ok) {
    if (result.reason === "not-found") {
      notFound();
    }
    redirect("/invoice-bases");
  }

  const { invoiceBasis } = result;

  // Group items by member
  const memberGroupsMap = new Map<
    string,
    { memberName: string; entries: typeof invoiceBasis.items; totalMinutes: number }
  >();

  for (const item of invoiceBasis.items) {
    if (!memberGroupsMap.has(item.accountId)) {
      memberGroupsMap.set(item.accountId, {
        memberName: item.accountDisplayName,
        entries: [],
        totalMinutes: 0,
      });
    }
    const group = memberGroupsMap.get(item.accountId)!;
    group.entries.push(item);
    group.totalMinutes += item.durationMinutes;
  }

  const memberGroups = Array.from(memberGroupsMap.values());
  const grandTotalMinutes = invoiceBasis.items.reduce((sum, item) => sum + item.durationMinutes, 0);

  const formattedCreatedAt = new Date(invoiceBasis.createdAt)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");

  return (
    <div className="min-h-screen bg-slate-50">
      <WorkspaceHeader {...account} />
      <main className="mx-auto max-w-7xl px-8 py-10">
        <div className="flex items-center gap-4">
          <Link
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            href="/invoice-bases"
          >
            ← Back to Invoice Bases
          </Link>
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Header */}
          <div className="border-b border-slate-200 bg-slate-50/50 p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold uppercase tracking-wider text-blue-700">
                    Invoice Basis
                  </span>
                  {invoiceBasis.voidedAt ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      Voided
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      Active
                    </span>
                  )}
                </div>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  Basis #{invoiceBasis.sequenceNumber}
                </h1>
                <p className="mt-2 text-lg font-medium text-slate-900">
                  {invoiceBasis.clientDisplayName}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Inclusive Swedish-local range: {invoiceBasis.startDate} to {invoiceBasis.endDate}
                </p>
              </div>
              <div className="text-sm text-slate-600 md:text-right">
                <p>
                  Created by <span className="font-medium text-slate-900">{invoiceBasis.createdByDisplayName}</span>
                </p>
                <p className="mt-1">
                  On <time className="font-medium text-slate-900">{formattedCreatedAt}</time>
                </p>
              </div>
            </div>

            {invoiceBasis.voidedAt ? (
              <div className="mt-6 rounded-md bg-slate-50 border border-slate-200 p-4">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold text-slate-950">Voided:</span>{" "}
                  {new Date(invoiceBasis.voidedAt).toISOString().slice(0, 16).replace("T", " ")} by{" "}
                  {invoiceBasis.voidedByDisplayName ?? "Unknown"}
                </p>
                {invoiceBasis.voidReason ? (
                  <p className="mt-1 text-sm text-slate-600">
                    <span className="font-semibold text-slate-950">Reason:</span> {invoiceBasis.voidReason}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Grouped Time Entries */}
          <div className="p-6 md:p-8">
            <h2 className="text-lg font-semibold text-slate-950">Original Time Entry Composition</h2>
            <p className="mt-1 text-sm text-slate-600">
              Traceable composition items frozen at the time this Invoice Basis was created.
            </p>

            <div className="mt-6 space-y-8">
              {memberGroups.map((group) => (
                <section
                  aria-label={`${group.memberName} composition`}
                  className="rounded-lg border border-slate-200 bg-white"
                  key={group.memberName}
                >
                  <div className="border-b border-slate-200 bg-slate-50/50 px-5 py-4 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-950">{group.memberName}</h3>
                    <div className="text-sm tabular-nums text-slate-700 flex items-center gap-4">
                      <span>
                        Subtotal: <span className="font-bold text-slate-950">{formatDuration(group.totalMinutes)}</span> ({formatDecimalHoursSwedish(group.totalMinutes)} h)
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/30 text-xs font-semibold uppercase tracking-wider text-slate-600">
                          <th className="px-5 py-3 w-32">Work Date</th>
                          <th className="px-5 py-3">Description</th>
                          <th className="px-5 py-3 w-32 text-right">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {group.entries.map((entry) => (
                          <tr key={entry.id}>
                            <td className="px-5 py-3.5 font-medium tabular-nums text-slate-900">
                              {entry.workDate}
                            </td>
                            <td className="px-5 py-3.5 text-slate-700 whitespace-pre-wrap">
                              {entry.description ?? <span className="italic text-slate-400">No description</span>}
                            </td>
                            <td className="px-5 py-3.5 text-right font-medium tabular-nums text-slate-900">
                              {formatDuration(entry.durationMinutes)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          </div>

          {/* Grand Totals */}
          <div className="border-t border-slate-200 bg-slate-50/50 px-6 py-6 md:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-600">Invoice Basis Grand Totals</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 text-right sm:text-left tabular-nums text-lg">
              <div>
                <span className="text-sm font-semibold text-slate-600 block">Authoritative Total</span>
                <span className="font-bold text-slate-950 text-2xl">{formatDuration(grandTotalMinutes)}</span>
              </div>
              <div className="sm:border-l sm:border-slate-300 sm:pl-8">
                <span className="text-sm font-semibold text-slate-600 block">Decimal Total</span>
                <span className="font-bold text-slate-950 text-2xl">{formatDecimalHoursSwedish(grandTotalMinutes)} h</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
