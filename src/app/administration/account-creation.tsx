"use client";

import { useActionState, useState } from "react";

import { createAccountAction } from "@/app/actions";
import type { CreateAccountState } from "./account-state";

const initialState: CreateAccountState = {};

export function AccountCreation() {
  const [state, formAction, pending] = useActionState(
    createAccountAction,
    initialState,
  );
  const [creating, setCreating] = useState(false);
  const [role, setRole] = useState<"member" | "administrator">("member");
  const [dismissedPassword, setDismissedPassword] = useState<string>();
  const receipt = state.receipt;
  const receiptVisible =
    receipt !== undefined && receipt.initialPassword !== dismissedPassword;

  return (
    <>
      {!creating ? (
        <button
          className="mt-4 ml-auto block rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          onClick={() => setCreating(true)}
          type="button"
        >
          Create account
        </button>
      ) : (
        <form action={formAction} className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="displayName">
                Display name
              </label>
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950"
                id="displayName"
                name="displayName"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="newUsername">
                Username
              </label>
              <input
                autoComplete="off"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950"
                id="newUsername"
                name="username"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="role">
                Role
              </label>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950"
                id="role"
                name="role"
                onChange={(event) => setRole(event.target.value as typeof role)}
                value={role}
              >
                <option value="member">Member</option>
                <option value="administrator">Administrator</option>
              </select>
            </div>
          </div>
          {state.error ? (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {state.error}
            </p>
          ) : null}
          <div className="mt-4 flex gap-3">
            <button
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-blue-400"
              disabled={pending}
              type="submit"
            >
              {pending
                ? "Creating…"
                : `Create ${role === "member" ? "Member" : "Administrator"}`}
            </button>
            <button
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              onClick={() => setCreating(false)}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {receiptVisible ? (
        <dialog
          aria-labelledby="credential-receipt-title"
          className="fixed inset-0 z-10 m-auto max-w-lg rounded-xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/40"
          open
        >
          <div className="p-6">
            <h2 className="text-xl font-semibold text-slate-950" id="credential-receipt-title">
              Credential receipt
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Hand these credentials to {receipt.displayName}. This password is shown only once.
            </p>
            <dl className="mt-5 space-y-3 rounded-lg bg-slate-50 p-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Username</dt>
                <dd className="mt-1 font-mono text-slate-950">{receipt.username}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Initial password</dt>
                <dd className="mt-1 font-mono text-slate-950" data-testid="initial-password">
                  {receipt.initialPassword}
                </dd>
              </div>
            </dl>
            <button
              className="mt-5 w-full rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800"
              onClick={() => setDismissedPassword(receipt.initialPassword)}
              type="button"
            >
              Dismiss receipt
            </button>
          </div>
        </dialog>
      ) : null}
    </>
  );
}
