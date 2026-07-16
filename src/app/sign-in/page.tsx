import { redirect } from "next/navigation";

import { currentSessionAccount } from "@/server/access/session-cookie";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage() {
  const account = await currentSessionAccount();
  if (account) {
    redirect(account.role === "administrator" ? "/administration" : "/my-time");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-700 font-bold text-white">
            CT
          </div>
          <div>
            <p className="font-semibold text-slate-950">Consulting Time</p>
            <p className="text-sm text-slate-500">Company Workspace</p>
          </div>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Enter the credentials supplied by your Administrator.
        </p>
        <SignInForm />
      </section>
    </main>
  );
}
