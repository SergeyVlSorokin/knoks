import { redirect } from "next/navigation";

import { currentSessionAccount } from "@/server/access/session-cookie";
import { listAccounts } from "@/server/access/accounts";
import { listClients } from "@/server/clients";
import { AccountCreation } from "./account-creation";
import { AccountManagement } from "./account-management";
import { ClientManagement } from "./client-management";
import { WorkspaceHeader } from "../workspace-header";

export default async function AdministrationPage() {
  const account = await currentSessionAccount();
  if (!account) {
    redirect("/sign-in");
  }
  if (account.role !== "administrator") {
    redirect("/my-time");
  }

  const [workspaceAccounts, workspaceClients] = await Promise.all([
    listAccounts(account),
    listClients(account),
  ]);
  const managedAccounts = workspaceAccounts ?? [];
  const managedClients = workspaceClients ?? [];
  const activeAdministratorCount = managedAccounts.filter(
    (item) => item.active && item.role === "administrator",
  ).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <WorkspaceHeader {...account} />
      <main className="mx-auto max-w-7xl px-8 py-10">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">Company Workspace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Administration</h1>
            <p className="mt-2 text-slate-600">Manage access and prepare the workspace for recording time.</p>
          </div>
        </div>

        {managedClients.length === 0 ? (
          <aside className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-5">
            <p className="font-semibold text-blue-950">An active Client is required before time can be recorded.</p>
            <p className="mt-1 text-sm leading-6 text-blue-900">Create the first Client in the ordinary Clients area below. There is no separate setup step.</p>
          </aside>
        ) : null}

        <section className="mt-10 grid grid-cols-2 gap-6" aria-label="Administration areas">
          <article aria-labelledby="accounts-heading" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-950" id="accounts-heading">Accounts</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Members and Administrators who can enter this workspace.</p>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                {managedAccounts.filter((item) => item.active).length} active
              </span>
            </div>
            <AccountCreation />
            <div className="mt-6 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {managedAccounts.map((item) => (
                <AccountManagement
                  key={item.id}
                  account={item}
                  isCurrentAccount={item.id === account.accountId}
                  lastActiveAdministrator={
                    item.active &&
                    item.role === "administrator" &&
                    activeAdministratorCount === 1
                  }
                />
              ))}
            </div>
          </article>

          <article aria-labelledby="clients-heading" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm" id="clients">
            <ClientManagement clients={managedClients} />
          </article>
        </section>
      </main>
    </div>
  );
}
