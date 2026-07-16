import { redirect } from "next/navigation";

import { currentSessionAccount } from "@/server/access/session-cookie";
import { WorkspaceHeader } from "../workspace-header";
import { ChangePasswordForm } from "./change-password-form";

export default async function ProfilePage() {
  const account = await currentSessionAccount();
  if (!account) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <WorkspaceHeader {...account} />
      <main className="mx-auto max-w-7xl px-8 py-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">Member profile</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Profile</h1>
        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">{account.displayName}</h2>
          <p className="mt-1 text-sm text-slate-500">@{account.username}</p>
          <h2 className="mt-10 text-xl font-semibold text-slate-950">Change password</h2>
          <p className="mt-2 text-sm text-slate-600">Use your current password to choose a new one.</p>
          <ChangePasswordForm />
        </section>
      </main>
    </div>
  );
}
