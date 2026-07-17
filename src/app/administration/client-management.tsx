"use client";

import { useActionState, useState } from "react";

import {
  archiveClientAction,
  createClientAction,
  deleteClientAction,
  renameClientAction,
  restoreClientAction,
} from "../actions";
import type { ClientSummary } from "@/server/clients";
import type { ClientActionState } from "./client-state";

const initialState: ClientActionState = {};

export function ClientCreation() {
  const [state, action, pending] = useActionState(createClientAction, initialState);

  return (
    <form action={action} className="mt-6">
      <label className="block text-sm font-medium text-slate-800" htmlFor="new-client-name">
        Client name
      </label>
      <div className="mt-2 flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
          id="new-client-name"
          name="displayName"
          required
        />
        <button
          className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          Create Client
        </button>
      </div>
      {state.error ? <p className="mt-2 text-sm text-red-700">{state.error}</p> : null}
    </form>
  );
}

function ClientRow({ client }: { client: ClientSummary }) {
  const [renaming, setRenaming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [renameState, renameAction, renamePending] = useActionState(renameClientAction, initialState);
  const [archiveState, archiveAction, archivePending] = useActionState(
    client.archived ? restoreClientAction : archiveClientAction,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(deleteClientAction, initialState);
  const error = renameState.error ?? archiveState.error ?? deleteState.error;

  return (
    <article aria-label={`${client.displayName} Client`} className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-slate-950">{client.displayName}</p>
          <p className={`mt-1 text-xs font-semibold ${client.archived ? "text-amber-700" : "text-emerald-700"}`}>
            {client.archived ? "Archived" : "Active"}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700"
            onClick={() => setRenaming((value) => !value)}
            type="button"
          >
            Rename
          </button>
          <form action={archiveAction}>
            <input name="clientId" type="hidden" value={client.id} />
            <input name="version" type="hidden" value={client.version} />
            <button
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:opacity-60"
              disabled={archivePending}
              type="submit"
            >
              {client.archived ? "Restore" : "Archive"}
            </button>
          </form>
          <button
            className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700"
            onClick={() => setConfirmingDelete(true)}
            type="button"
          >
            Delete permanently
          </button>
        </div>
      </div>

      {renaming ? (
        <form action={renameAction} className="mt-4 flex items-end gap-2">
          <input name="clientId" type="hidden" value={client.id} />
          <input name="version" type="hidden" value={client.version} />
          <label className="min-w-0 flex-1 text-sm font-medium text-slate-800">
            Client name
            <input
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
              defaultValue={client.displayName}
              name="displayName"
              required
            />
          </label>
          <button
            className="rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={renamePending}
            type="submit"
          >
            Save name
          </button>
        </form>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      {confirmingDelete ? (
        <div
          aria-label={`Delete ${client.displayName}`}
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-6"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-950">Delete {client.displayName} permanently?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Permanent deletion only succeeds if no Time Entry has ever referenced this Client.
            </p>
            <form action={deleteAction} className="mt-6 flex justify-end gap-2">
              <input name="clientId" type="hidden" value={client.id} />
              <input name="version" type="hidden" value={client.version} />
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                onClick={() => setConfirmingDelete(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                disabled={deletePending}
                type="submit"
              >
                Delete permanently
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function ClientManagement({ clients }: { clients: ClientSummary[] }) {
  const activeCount = clients.filter((client) => !client.archived).length;

  return (
    <>
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-950" id="clients-heading">Clients</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Clients determine where Members can record their time.</p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          {activeCount} active
        </span>
      </div>
      <ClientCreation />
      {clients.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
          <p className="font-medium text-slate-900">No Clients yet</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">Create the first active Client here.</p>
        </div>
      ) : (
        <>
          {activeCount === 0 ? (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="font-medium text-slate-900">No active Clients</p>
              <p className="mt-1 text-sm text-slate-600">Create a Client or restore an archived Client to resume new time attribution.</p>
            </div>
          ) : null}
          <div className="mt-6 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {clients.map((client) => <ClientRow client={client} key={client.id} />)}
          </div>
        </>
      )}
    </>
  );
}
