"use client";

import { useActionState } from "react";

import { changePasswordAction } from "@/app/actions";
import type { ChangePasswordState } from "./state";

const initialState: ChangePasswordState = {};

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-6 max-w-xl space-y-5">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="currentPassword">
          Current password
        </label>
        <input
          autoComplete="current-password"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-950"
          id="currentPassword"
          name="currentPassword"
          required
          type="password"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="newPassword">
          New password
        </label>
        <input
          autoComplete="new-password"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-950"
          id="newPassword"
          name="newPassword"
          required
          type="password"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="confirmation">
          Confirm new password
        </label>
        <input
          autoComplete="new-password"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-950"
          id="confirmation"
          name="confirmation"
          required
          type="password"
        />
      </div>
      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">
          {state.success}
        </p>
      ) : null}
      <button
        className="rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white disabled:bg-blue-400"
        disabled={pending}
        type="submit"
      >
        {pending ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}
