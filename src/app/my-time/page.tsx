import { redirect } from "next/navigation";

import { currentSessionAccount } from "@/server/access/session-cookie";
import { WorkspaceHeader } from "../workspace-header";

export default async function MyTimePage() {
  const account = await currentSessionAccount();
  if (!account) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <WorkspaceHeader {...account} />
      <main className="mx-auto max-w-7xl px-8 py-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">Member workspace</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">My time</h1>
        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">No active Clients</h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            An Administrator must create an active Client before time can be recorded.
          </p>
        </section>
      </main>
    </div>
  );
}
