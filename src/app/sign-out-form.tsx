"use client";

import { useActionState } from "react";

import { signOutAction } from "./actions";
import type { SignOutState } from "./sign-out-state";

const initialState: SignOutState = {};

export function SignOutForm() {
  const [state, formAction, pending] = useActionState(signOutAction, initialState);

  return (
    <form action={formAction}>
      <button
        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:text-slate-400"
        disabled={pending}
        type="submit"
      >
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {state.error ? (
        <p className="absolute right-8 top-16 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 shadow" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
