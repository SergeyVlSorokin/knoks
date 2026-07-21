import { redirect } from "next/navigation";
import Link from "next/link";

import { currentSessionAccount } from "@/server/access/session-cookie";
import { listClients } from "@/server/clients";
import { getAvailableBillableTimeReview, getInvoiceBasesHistory } from "@/server/invoice-bases";
import { WorkspaceHeader } from "../workspace-header";
import { AvailableTimeReview } from "./available-time-review";

function formatInstant(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function reviewError(reason: "client-unavailable" | "invalid-date" | "invalid-range"): string {
  switch (reason) {
    case "client-unavailable":
      return "Select a retained Client to review available time.";
    case "invalid-date":
      return "Enter valid Swedish-local start and end dates.";
    case "invalid-range":
      return "The start date must be on or before the end date.";
  }
}

export default async function InvoiceBasesPage({
  searchParams,
}: {
  searchParams: Promise<{
    clientId?: string | string[];
    startDate?: string | string[];
    endDate?: string | string[];
    create?: string | string[];
    page?: string | string[];
  }>;
}) {
  const account = await currentSessionAccount();
  if (!account) redirect("/sign-in");
  if (account.role !== "administrator") redirect("/my-time");

  const params = await searchParams;
  const clientId = typeof params.clientId === "string" ? params.clientId : undefined;
  const startDate = typeof params.startDate === "string" ? params.startDate : undefined;
  const endDate = typeof params.endDate === "string" ? params.endDate : undefined;
  const create = typeof params.create === "string" ? params.create : undefined;
  const showReviewForm = create === "true" || !!clientId;

  const pageParam = typeof params.page === "string" ? parseInt(params.page, 10) : 1;
  const currentPage = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const limit = 15;

  const [clientOptions, result, historyResult] = await Promise.all([
    listClients(account),
    clientId && startDate && endDate
      ? getAvailableBillableTimeReview(account, { clientId, startDate, endDate })
      : Promise.resolve(null),
    getInvoiceBasesHistory(account, { clientId, page: currentPage, limit }),
  ]);
  const reviewErrorMessage = result && !result.ok && result.reason !== "forbidden" ? reviewError(result.reason) : null;

  const totalCount = historyResult?.totalCount ?? 0;
  const historyItems = historyResult?.items ?? [];
  const totalPages = Math.ceil(totalCount / limit);
  const startIndex = (currentPage - 1) * limit;
  const endIndex = Math.min(startIndex + historyItems.length, totalCount);

  return (
    <div className="min-h-screen bg-slate-50">
      <WorkspaceHeader {...account} />
      <main className="mx-auto max-w-7xl px-8 py-10">
        <div className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">Invoice Bases</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Invoice Bases</h1>
            <p className="mt-1 text-slate-600">Inspect committed Invoice Basis records and review available billable time.</p>
          </div>
          {!showReviewForm && (
            <Link
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              href="/invoice-bases?create=true"
            >
              + Review Available Time
            </Link>
          )}
        </div>

        {showReviewForm && (
          <form action="/invoice-bases" aria-label="Review available billable time" className="mt-8 grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-end gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm" method="get">
            <input type="hidden" name="create" value="true" />
            {currentPage !== 1 && <input type="hidden" name="page" value={String(currentPage)} />}
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Client
              <select className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-950" defaultValue={clientId ?? ""} name="clientId" required>
                <option disabled value="">Select a Client</option>
                {(clientOptions ?? []).map((client) => (
                  <option key={client.id} value={client.id}>{client.displayName}{client.archived ? " (archived)" : ""}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              From date
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-950" defaultValue={startDate} name="startDate" required type="date" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              To date
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-950" defaultValue={endDate} name="endDate" required type="date" />
            </label>
            <div className="flex items-center gap-3">
              <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white" type="submit">Review time</button>
              <Link className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" href="/invoice-bases">Cancel</Link>
            </div>
          </form>
        )}

        {reviewErrorMessage ? <p className="mt-5 rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-800">{reviewErrorMessage}</p> : null}
        {result?.ok ? (
          <AvailableTimeReview
            key={`${clientId}-${startDate}-${endDate}-${result.review.availableEntries.map((e) => `${e.id}:${e.version}`).join(",")}`}
            review={result.review}
          />
        ) : null}

        {historyResult ? (
          <section aria-label="Invoice Basis History" className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  {clientId ? "Invoice Basis History" : "Recent Invoice Bases"}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {clientId
                    ? "Previously committed Invoice Bases for this Client."
                    : "Latest committed Invoice Bases across all Clients."}
                </p>
              </div>

              {/* Client filter form */}
              <form action="/invoice-bases" method="get" className="flex items-center gap-2">
                {create === "true" && <input type="hidden" name="create" value="true" />}
                {startDate && <input type="hidden" name="startDate" value={startDate} />}
                {endDate && <input type="hidden" name="endDate" value={endDate} />}
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  Filter by Client:
                  <select 
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-normal text-slate-950" 
                    defaultValue={clientId ?? ""} 
                    name="clientId"
                  >
                    <option value="">All Clients</option>
                    {(clientOptions ?? []).map((client) => (
                      <option key={client.id} value={client.id}>{client.displayName}</option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                  Filter
                </button>
                {clientId && (
                  <Link href="/invoice-bases" className="text-sm text-blue-700 hover:text-blue-900 font-semibold ml-2">
                    Clear
                  </Link>
                )}
              </form>
            </div>

            {historyItems.length === 0 ? (
              <p className="mt-4 rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {clientId
                  ? "No Invoice Bases have been created for this Client yet."
                  : "No Invoice Bases have been created in this workspace yet."}
              </p>
            ) : (
              <>
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-600">
                        <th className="py-3 pr-4">Sequence</th>
                        <th className="py-3 px-4">Client</th>
                        <th className="py-3 px-4">Period</th>
                        <th className="py-3 px-4">Created By</th>
                        <th className="py-3 px-4">Created At</th>
                        <th className="py-3 pl-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {historyItems.map((basis) => (
                        <tr key={basis.id}>
                          <td className="py-3.5 pr-4 font-semibold text-slate-950 flex items-center gap-2">
                            #{basis.sequenceNumber}
                            {basis.voidedAt ? (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600">
                                voided
                              </span>
                            ) : null}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-900">
                            {basis.clientDisplayName ?? "Unknown"}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">
                            {basis.startDate} to {basis.endDate}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">
                            {basis.createdByDisplayName}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">
                            {formatInstant(basis.createdAt)}
                          </td>
                          <td className="py-3.5 pl-4 text-right">
                            <Link
                              aria-label={`Inspect Invoice Basis #${basis.sequenceNumber}`}
                              className="text-blue-700 hover:text-blue-900 font-semibold"
                              href={`/invoice-bases/${basis.id}`}
                            >
                              Inspect
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-sm text-slate-600">
                      Showing <span className="font-semibold text-slate-900">{startIndex + 1}</span> to{" "}
                      <span className="font-semibold text-slate-900">{endIndex}</span> of{" "}
                      <span className="font-semibold text-slate-900">{totalCount}</span> bases
                    </span>
                    <div className="flex items-center gap-2">
                      <Link
                        className={`rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${
                          currentPage === 1 ? "pointer-events-none opacity-50" : ""
                        }`}
                        href={`/invoice-bases?${new URLSearchParams({
                          ...(clientId ? { clientId } : {}),
                          ...(create ? { create } : {}),
                          ...(startDate ? { startDate } : {}),
                          ...(endDate ? { endDate } : {}),
                          page: String(currentPage - 1),
                        }).toString()}`}
                      >
                        Previous
                      </Link>
                      <Link
                        className={`rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${
                          currentPage === totalPages ? "pointer-events-none opacity-50" : ""
                        }`}
                        href={`/invoice-bases?${new URLSearchParams({
                          ...(clientId ? { clientId } : {}),
                          ...(create ? { create } : {}),
                          ...(startDate ? { startDate } : {}),
                          ...(endDate ? { endDate } : {}),
                          page: String(currentPage + 1),
                        }).toString()}`}
                      >
                        Next
                      </Link>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
