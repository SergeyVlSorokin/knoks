import { redirect } from "next/navigation";
import Link from "next/link";

import { currentSessionAccount } from "@/server/access/session-cookie";
import { getClientAvailability } from "@/server/clients";
import { getWeeklyGrid, shiftIsoDate } from "@/server/time";
import { WorkspaceHeader } from "../workspace-header";
import { WeeklyClientGrid } from "./weekly-client-grid";

export default async function MyTimePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string | string[] }>;
}) {
  const account = await currentSessionAccount();
  if (!account) {
    redirect("/sign-in");
  }

  const requestedWeek = (await searchParams).week;
  const selectedDate = typeof requestedWeek === "string" ? requestedWeek : undefined;
  const [clientAvailability, weeklyGrid] = await Promise.all([
    getClientAvailability(),
    getWeeklyGrid(account, selectedDate),
  ]);
  const hasActiveClients = clientAvailability.activeCount > 0;
  const showGrid = hasActiveClients || weeklyGrid.rows.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <WorkspaceHeader {...account} />
      <main className="mx-auto max-w-7xl px-8 py-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">Member workspace</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">My time</h1>
        {showGrid ? (
          <>
            <section className="mt-8 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <Link
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800"
                href={`/my-time?week=${shiftIsoDate(weeklyGrid.weekStart, -7)}`}
              >
                Previous week
              </Link>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-950">
                  Week {weeklyGrid.weekNumber} · {weeklyGrid.weekStart} – {weeklyGrid.weekEnd}
                </p>
                <p className="mt-1 text-xs text-slate-600">Mon to Sun · Europe/Stockholm</p>
              </div>
              <Link
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800"
                href={`/my-time?week=${shiftIsoDate(weeklyGrid.weekStart, 7)}`}
              >
                Next week
              </Link>
            </section>
            {!hasActiveClients ? (
              <p className="mt-5 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
                No active Clients are available for new time attribution. Recorded work remains visible.
              </p>
            ) : null}
            <WeeklyClientGrid
              availableClients={weeklyGrid.availableClients}
              dates={weeklyGrid.dates}
              dateSummaries={weeklyGrid.dateSummaries}
              rows={weeklyGrid.rows}
              summary={weeklyGrid.summary}
            />
          </>
        ) : (
          <section className="mt-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">No active Clients</h2>
            <p className="mt-2 max-w-2xl text-slate-600">
              {clientAvailability.retainedCount === 0
                ? "Time must belong to an active Client before it can be recorded."
                : "All retained Clients are archived, so none are available for new time attribution."}
            </p>
            {account.role === "administrator" ? (
              <Link
                className="mt-5 inline-flex rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
                href="/administration#clients"
              >
                {clientAvailability.retainedCount === 0
                  ? "Create a Client"
                  : "Create or restore Clients"}
              </Link>
            ) : (
              <p className="mt-4 text-sm font-medium text-slate-800">
                Ask an Administrator to create or restore a Client.
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
