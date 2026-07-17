import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import type { SessionAccount } from "@/server/access";
import { db } from "@/server/db";
import { clients } from "@/server/db/schema";

export interface ClientSummary {
  id: string;
  displayName: string;
  archived: boolean;
  version: number;
}

export interface ClientAvailability {
  retainedCount: number;
  activeCount: number;
}

export type SaveClientResult =
  | { ok: true }
  | {
      ok: false;
      reason: "forbidden" | "name-taken" | "reload";
    };

export type DeleteClientResult =
  | { ok: true }
  | {
      ok: false;
      reason: "forbidden" | "client-referenced" | "reload";
    };

function databaseErrorCode(error: unknown): string | undefined {
  let current = error;
  while (typeof current === "object" && current !== null) {
    if ("code" in current && typeof current.code === "string") {
      return current.code;
    }
    if (!("cause" in current)) {
      return undefined;
    }
    current = current.cause;
  }
  return undefined;
}

export async function listClients(
  administrator: SessionAccount,
): Promise<ClientSummary[] | null> {
  if (administrator.role !== "administrator") {
    return null;
  }

  return db
    .select({
      id: clients.id,
      displayName: clients.displayName,
      archived: clients.archived,
      version: clients.version,
    })
    .from(clients)
    .orderBy(asc(clients.archived), asc(clients.displayName));
}

export async function getClientAvailability(): Promise<ClientAvailability> {
  const retainedClients = await db
    .select({ archived: clients.archived })
    .from(clients);
  return {
    retainedCount: retainedClients.length,
    activeCount: retainedClients.filter((client) => !client.archived).length,
  };
}

export async function createClient(
  administrator: SessionAccount,
  displayName: string,
): Promise<SaveClientResult> {
  if (administrator.role !== "administrator") {
    return { ok: false, reason: "forbidden" };
  }

  try {
    await db.transaction(
      async (transaction) => {
        await transaction
          .insert(clients)
          .values({ displayName: displayName.trim() });
      },
      { isolationLevel: "serializable" },
    );
    return { ok: true };
  } catch (error) {
    const code = databaseErrorCode(error);
    if (code === "23505") {
      return { ok: false, reason: "name-taken" };
    }
    if (code === "40001") {
      return { ok: false, reason: "reload" };
    }
    throw error;
  }
}

export async function renameClient(
  administrator: SessionAccount,
  clientId: string,
  version: number,
  displayName: string,
): Promise<SaveClientResult> {
  if (administrator.role !== "administrator") {
    return { ok: false, reason: "forbidden" };
  }

  try {
    return await db.transaction(
      async (transaction) => {
        const updated = await transaction
          .update(clients)
          .set({
            displayName: displayName.trim(),
            version: sql`${clients.version} + 1`,
          })
          .where(and(eq(clients.id, clientId), eq(clients.version, version)))
          .returning({ id: clients.id });
        return updated.length === 1
          ? ({ ok: true } as const)
          : ({ ok: false, reason: "reload" } as const);
      },
      { isolationLevel: "serializable" },
    );
  } catch (error) {
    const code = databaseErrorCode(error);
    if (code === "23505") {
      return { ok: false, reason: "name-taken" };
    }
    if (code === "40001") {
      return { ok: false, reason: "reload" };
    }
    throw error;
  }
}

export async function setClientArchived(
  administrator: SessionAccount,
  clientId: string,
  version: number,
  archived: boolean,
): Promise<SaveClientResult> {
  if (administrator.role !== "administrator") {
    return { ok: false, reason: "forbidden" };
  }

  try {
    return await db.transaction(
      async (transaction) => {
        const updated = await transaction
          .update(clients)
          .set({ archived, version: sql`${clients.version} + 1` })
          .where(and(eq(clients.id, clientId), eq(clients.version, version)))
          .returning({ id: clients.id });
        return updated.length === 1
          ? ({ ok: true } as const)
          : ({ ok: false, reason: "reload" } as const);
      },
      { isolationLevel: "serializable" },
    );
  } catch (error) {
    if (databaseErrorCode(error) === "40001") {
      return { ok: false, reason: "reload" };
    }
    throw error;
  }
}

export async function deleteClient(
  administrator: SessionAccount,
  clientId: string,
  version: number,
): Promise<DeleteClientResult> {
  if (administrator.role !== "administrator") {
    return { ok: false, reason: "forbidden" };
  }

  try {
    return await db.transaction(
      async (transaction) => {
        const deleted = await transaction
          .delete(clients)
          .where(and(eq(clients.id, clientId), eq(clients.version, version)))
          .returning({ id: clients.id });
        return deleted.length === 1
          ? ({ ok: true } as const)
          : ({ ok: false, reason: "reload" } as const);
      },
      { isolationLevel: "serializable" },
    );
  } catch (error) {
    const code = databaseErrorCode(error);
    if (code === "23503") {
      return { ok: false, reason: "client-referenced" };
    }
    if (code === "40001") {
      return { ok: false, reason: "reload" };
    }
    throw error;
  }
}
