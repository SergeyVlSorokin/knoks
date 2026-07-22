"use client";

import { useActionState } from "react";
import { voidInvoiceBasisAction } from "../../actions";

const initialState: { error?: string; success?: boolean } = {};

export function VoidForm({ invoiceBasisId }: { invoiceBasisId: string }) {
  const [state, action, pending] = useActionState(voidInvoiceBasisAction, initialState);

  return (
    <div className="mt-8 border-t border-slate-200 p-6 md:p-8 bg-slate-50/50">
      <h3 className="text-lg font-semibold text-slate-950">Void Invoice Basis</h3>
      <p className="mt-1 text-sm text-slate-600">
        Reversing this Invoice Basis will release all its included Time Entries back to Available Billable Time for correction.
      </p>

      <div className="mt-4 rounded-md bg-amber-50 border border-amber-200 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            {/* Warning Icon */}
            <svg className="h-5 w-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-amber-800">
              Warning: external correction remains the Administrator's responsibility.
            </p>
          </div>
        </div>
      </div>

      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="invoiceBasisId" value={invoiceBasisId} />
        
        <div>
          <label className="block text-sm font-semibold text-slate-700" htmlFor="voidReason">
            Reason for voiding
          </label>
          <div className="mt-1.5">
            <input
              type="text"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400"
              id="voidReason"
              name="voidReason"
              placeholder="e.g. Incorrect date range selected"
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            disabled={pending}
            type="submit"
          >
            Void Invoice Basis
          </button>
        </div>

        {state.error ? <p className="text-sm font-semibold text-red-700">{state.error}</p> : null}
      </form>
    </div>
  );
}
