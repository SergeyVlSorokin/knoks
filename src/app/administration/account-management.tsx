"use client";

import { useActionState, useState } from "react";

import {
  changeAccountRoleAction,
  deactivateAccountAction,
  resetAccountPasswordAction,
} from "@/app/actions";
import type { AccountSummary } from "@/server/access/accounts";
import type {
  AccountAccessState,
  ManageAccountState,
} from "./account-state";

const initialResetState: ManageAccountState = {};
const initialAccessState: AccountAccessState = {};

export function AccountManagement({
  account,
  isCurrentAccount,
  lastActiveAdministrator,
}: {
  account: AccountSummary;
  isCurrentAccount: boolean;
  lastActiveAdministrator: boolean;
}) {
  const [resetState, resetAction, resetPending] = useActionState(
    resetAccountPasswordAction,
    initialResetState,
  );
  const [roleState, roleAction, rolePending] = useActionState(
    changeAccountRoleAction,
    initialAccessState,
  );
  const [deactivateState, deactivateAction, deactivatePending] = useActionState(
    deactivateAccountAction,
    initialAccessState,
  );
  const [dismissedPassword, setDismissedPassword] = useState<string>();
  const [confirmingDeactivation, setConfirmingDeactivation] = useState(false);
  const canManage = account.active && !isCurrentAccount;
  const receiptVisible =
    resetState.resetPassword !== undefined &&
    resetState.resetPassword !== dismissedPassword;

  return (
    <article
      aria-label={`${account.displayName} account`}
      className="p-4"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-slate-900">{account.displayName}</p>
          <p className="mt-1 text-sm text-slate-500">@{account.username}</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-600">
            {!account.active
              ? "Inactive"
              : account.role === "administrator"
                ? "Administrator · includes Member access"
                : "Member"}
          </p>
          {canManage ? (
            <>
              <form action={resetAction}>
                <input name="accountId" type="hidden" value={account.id} />
                <button
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:text-slate-400"
                  disabled={resetPending}
                  type="submit"
                >
                  {resetPending ? "Resetting…" : "Reset password"}
                </button>
              </form>
              <form action={roleAction}>
                <input name="accountId" type="hidden" value={account.id} />
                <input
                  name="role"
                  type="hidden"
                  value={account.role === "member" ? "administrator" : "member"}
                />
                <button
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:text-slate-400"
                  disabled={rolePending}
                  type="submit"
                >
                  {account.role === "member" ? "Make Administrator" : "Make Member"}
                </button>
              </form>
              <button
                className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700"
                onClick={() => setConfirmingDeactivation(true)}
                type="button"
              >
                Deactivate account
              </button>
            </>
          ) : null}
        </div>
      </div>

      {lastActiveAdministrator ? (
        <p className="mt-2 text-sm text-slate-500">
          Last active Administrator. This account cannot be demoted or deactivated.
        </p>
      ) : null}
      {roleState.error || deactivateState.error || resetState.error ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {roleState.error ?? deactivateState.error ?? resetState.error}
        </p>
      ) : null}

      {receiptVisible ? (
        <dialog
          aria-labelledby={`password-reset-receipt-${account.id}`}
          className="fixed inset-0 z-10 m-auto max-w-lg rounded-xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/40"
          open
        >
          <div className="p-6">
            <h2
              className="text-xl font-semibold text-slate-950"
              id={`password-reset-receipt-${account.id}`}
            >
              Password reset receipt
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Hand this password to {account.displayName}. It is shown only once.
            </p>
            <dl className="mt-5 rounded-lg bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                New password
              </dt>
              <dd
                className="mt-1 font-mono text-slate-950"
                data-testid="reset-password"
              >
                {resetState.resetPassword}
              </dd>
            </dl>
            <button
              className="mt-5 w-full rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800"
              onClick={() => setDismissedPassword(resetState.resetPassword)}
              type="button"
            >
              Dismiss receipt
            </button>
          </div>
        </dialog>
      ) : null}

      {confirmingDeactivation && account.active ? (
        <dialog
          aria-labelledby={`deactivate-account-${account.id}`}
          className="fixed inset-0 z-10 m-auto max-w-lg rounded-xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/40"
          open
        >
          <form action={deactivateAction} className="p-6">
            <input name="accountId" type="hidden" value={account.id} />
            <h2
              className="text-xl font-semibold text-slate-950"
              id={`deactivate-account-${account.id}`}
            >
              Deactivate {account.displayName}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This permanently blocks sign-in and new Time Entries. The identity cannot be reactivated.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              History keeps {account.displayName} as the acting account. This identifies the account, not necessarily the person who used it.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white disabled:bg-red-400"
                disabled={deactivatePending}
                type="submit"
              >
                {deactivatePending ? "Deactivating…" : "Permanently deactivate"}
              </button>
              <button
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700"
                onClick={() => setConfirmingDeactivation(false)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        </dialog>
      ) : null}
    </article>
  );
}
