import Link from "next/link";
import type { AccountRole } from "@/server/db/schema";

import { SignOutForm } from "./sign-out-form";

interface WorkspaceHeaderProps {
  displayName: string;
  role: AccountRole;
  workspaceName: string;
}

export function WorkspaceHeader({
  displayName,
  role,
  workspaceName,
}: WorkspaceHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-8">
        <Link className="mr-12 flex items-center gap-3 font-semibold text-slate-950" href="/">
          <span className="flex size-9 items-center justify-center rounded-lg bg-blue-700 text-sm font-bold text-white">
            CT
          </span>
          {workspaceName}
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1">
          <Link className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" href="/my-time">
            My time
          </Link>
          {role === "administrator" ? (
            <Link className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" href="/administration">
              Administration
            </Link>
          ) : null}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-900">{displayName}</p>
            <p className="text-xs text-slate-500">
              {role === "administrator" ? "Administrator" : "Member"}
            </p>
          </div>
          <SignOutForm />
        </div>
      </div>
    </header>
  );
}
