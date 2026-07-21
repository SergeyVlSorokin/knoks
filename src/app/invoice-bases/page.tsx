import { redirect } from "next/navigation";
import Link from "next/link";

import { currentSessionAccount } from "@/server/access/session-cookie";
import { listClients } from "@/server/clients";
import { getAvailableBillableTimeReview, getInvoiceBasesForClient } from "@/server/invoice-bases";
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
  searchParams: Promise<{ clientId?: string | string[]; startDate?: string | string[]; endDate?: string | string[] }>;
}) {
  const account = await currentSessionAccount();
  if (!account) redirect("/sign-in");
  if (account.role !== "administrator") redirect("/my-time");

  const params = await searchParams;
  const clientId = typeof params.clientId === "string" ? params.clientId : undefined;
  const startDate = typeof params.startDate === "string" ? params.startDate : undefined;
  const endDate = typeof params.endDate === "string" ? params.endDate : undefined;
  const [clientOptions, result, invoiceBasesHistory] = await Promise.all([
    listClients(account),
    clientId && startDate && endDate
      ? getAvailableBillableTimeReview(account, { clientId, startDate, endDate })
      : Promise.resolve(null),
    clientId
      ? getInvoiceBasesForClient(account, clientId)
      : Promise.resolve(null),
  ]);
  const reviewErrorMessage = result && !result.ok && result.reason !== "forbidden" ? reviewError(result.reason) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <WorkspaceHeader {...account} />
      <main className="mx-auto max-w-7xl px-8 py-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">Invoice Bases</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Review Available Billable Time</h1>
        <p className="mt-2 text-slate-600">Review one Client and inclusive Swedish-local date range before creating an Invoice Basis.</p>

        <form action="/invoice-bases" aria-label="Review available billable time" className="mt-8 grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-end gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm" method="get">
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
          <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white" type="submit">Review time</button>
        </form>

        {reviewErrorMessage ? <p className="mt-5 rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-800">{reviewErrorMessage}</p> : null}
        {result?.ok ? (
          <AvailableTimeReview
            key={`${clientId}-${startDate}-${endDate}-${result.review.availableEntries.map((e) => `${e.id}:${e.version}`).join(",")}`}
            review={result.review}
          />
        ) : null}

        {clientId && invoiceBasesHistory ? (
          <section aria-label="Invoice Basis History" className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Invoice Basis History</h2>
            <p className="mt-1 text-sm text-slate-600">
              Previously committed Invoice Bases for this Client.
            </p>
            {invoiceBasesHistory.length === 0 ? (
              <p className="mt-4 rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-700">
                No Invoice Bases have been created for this Client yet.
              </p>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-600">
                      <th className="py-3 pr-4">Sequence</th>
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4">Created By</th>
                      <th className="py-3 px-4">Created At</th>
                      <th className="py-3 pl-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {invoiceBasesHistory.map((basis) => (
                      <tr key={basis.id}>
                        <td className="py-3.5 pr-4 font-semibold text-slate-950 flex items-center gap-2">
                          #{basis.sequenceNumber}
                          {basis.voidedAt ? (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600">
                              voided
                            </span>
                          ) : null}
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
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
