"use client";

import { useActionState } from "react";

import { signInAction } from "@/app/actions";
import type { SignInState } from "./state";

const initialState: SignInState = {};

export function SignInForm() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="username">
          Username
        </label>
        <input
          autoComplete="username"
          autoFocus
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          id="username"
          name="username"
          required
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="password">
          Password
        </label>
        <input
          autoComplete="current-password"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>
      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        className="w-full rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:bg-blue-400"
        disabled={pending}
        type="submit"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
