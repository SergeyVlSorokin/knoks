import { redirect } from "next/navigation";
import Link from "next/link";

import { currentSessionAccount } from "@/server/access/session-cookie";
import { getClientAvailability } from "@/server/clients";
import { WorkspaceHeader } from "../workspace-header";

export default async function MyTimePage() {
  const account = await currentSessionAccount();
  if (!account) {
    redirect("/sign-in");
  }

  const clientAvailability = await getClientAvailability();
  const hasActiveClients = clientAvailability.activeCount > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <WorkspaceHeader {...account} />
      <main className="mx-auto max-w-7xl px-8 py-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">Member workspace</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">My time</h1>
        {hasActiveClients ? (
          <section className="mt-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Record time</h2>
            <p className="mt-2 max-w-2xl text-slate-600">
              Active Clients are available for time entry.
            </p>
          </section>
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
