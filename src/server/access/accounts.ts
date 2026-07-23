import "server-only";

import { randomBytes } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { accounts, sessions, type AccountRole } from "@/server/db/schema";
import type { SessionAccount } from ".";
import { hashPassword, verifyPassword } from "./password";

export interface AccountSummary {
  id: string;
  displayName: string;
  username: string;
  role: AccountRole;
  active: boolean;
}

export type CreateAccountResult =
  | { ok: true; initialPassword: string }
  | { ok: false; reason: "forbidden" | "username-taken" };

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; reason: "incorrect-password" | "account-unavailable" };

export type ResetAccountPasswordResult =
  | { ok: true; password: string }
  | { ok: false; reason: "forbidden" | "account-unavailable" | "reload" };

export type ManageAccountAccessResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "forbidden"
        | "account-unavailable"
        | "last-administrator"
        | "reload";
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

function isUniqueViolation(error: unknown): boolean {
  return databaseErrorCode(error) === "23505";
}

export async function listAccounts(
  administrator: SessionAccount,
): Promise<AccountSummary[] | null> {
  if (administrator.role !== "administrator") {
    return null;
  }

  return db
    .select({
      id: accounts.id,
      displayName: accounts.displayName,
      username: accounts.username,
      role: accounts.role,
      active: accounts.active,
    })
    .from(accounts)
    .orderBy(asc(accounts.displayName), asc(accounts.username));
}

export async function createAccount(
  administrator: SessionAccount,
  input: { displayName: string; username: string; role: AccountRole },
): Promise<CreateAccountResult> {
  if (administrator.role !== "administrator") {
    return { ok: false, reason: "forbidden" };
  }

  const initialPassword = randomBytes(18).toString("base64url");
  const passwordHash = await hashPassword(initialPassword);

  try {
    await db.insert(accounts).values({
      displayName: input.displayName,
      username: input.username,
      passwordHash,
      role: input.role,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, reason: "username-taken" };
    }
    throw error;
  }

  return { ok: true, initialPassword };
}

export async function changeOwnPassword(
  accountId: string,
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  const account = await db.query.accounts.findFirst({
    where: and(eq(accounts.id, accountId), eq(accounts.active, true)),
    columns: { passwordHash: true },
  });
  if (!account) {
    return { ok: false, reason: "account-unavailable" };
  }
  if (!(await verifyPassword(currentPassword, account.passwordHash))) {
    return { ok: false, reason: "incorrect-password" };
  }

  const passwordHash = await hashPassword(newPassword);
  const updated = await db
    .update(accounts)
    .set({ passwordHash })
    .where(and(eq(accounts.id, accountId), eq(accounts.active, true)))
    .returning({ id: accounts.id });

  return updated.length === 1
    ? { ok: true }
    : { ok: false, reason: "account-unavailable" };
}

type AccountTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function manageAccountAccess(
  administrator: SessionAccount,
  accountId: string,
  removesAdministratorAccess: boolean,
  apply: (transaction: AccountTransaction) => Promise<void>,
): Promise<ManageAccountAccessResult> {
  if (
    administrator.role !== "administrator" ||
    administrator.accountId === accountId
  ) {
    return { ok: false, reason: "forbidden" };
  }

  try {
    return await db.transaction(
      async (transaction) => {
        const activeAdministrators = await transaction
          .select({ id: accounts.id })
          .from(accounts)
          .where(and(eq(accounts.active, true), eq(accounts.role, "administrator")))
          .for("update");
        if (!activeAdministrators.some(({ id }) => id === administrator.accountId)) {
          return { ok: false, reason: "forbidden" } as const;
        }

        const target = await transaction.query.accounts.findFirst({
          where: and(eq(accounts.id, accountId), eq(accounts.active, true)),
          columns: { role: true },
        });
        if (!target) {
          return { ok: false, reason: "account-unavailable" } as const;
        }
        if (
          removesAdministratorAccess &&
          target.role === "administrator" &&
          activeAdministrators.length === 1
        ) {
          return { ok: false, reason: "last-administrator" } as const;
        }

        await apply(transaction);
        return { ok: true } as const;
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

export async function resetAccountPassword(
  administrator: SessionAccount,
  accountId: string,
): Promise<ResetAccountPasswordResult> {
  const password = randomBytes(18).toString("base64url");
  const passwordHash = await hashPassword(password);
  const result = await manageAccountAccess(
    administrator,
    accountId,
    false,
    async (transaction) => {
      await transaction
        .update(accounts)
        .set({ passwordHash })
        .where(and(eq(accounts.id, accountId), eq(accounts.active, true)));
      await transaction.delete(sessions).where(eq(sessions.accountId, accountId));
    },
  );

  if (!result.ok) {
    return {
      ok: false,
      reason:
        result.reason === "account-unavailable"
          ? "account-unavailable"
          : result.reason === "reload"
            ? "reload"
            : "forbidden",
    };
  }
  return { ok: true, password };
}

export async function changeAccountRole(
  administrator: SessionAccount,
  accountId: string,
  role: AccountRole,
): Promise<ManageAccountAccessResult> {
  return manageAccountAccess(
    administrator,
    accountId,
    role === "member",
    async (transaction) => {
      await transaction
        .update(accounts)
        .set({ role })
        .where(and(eq(accounts.id, accountId), eq(accounts.active, true)));
    },
  );
}

export async function deactivateAccount(
  administrator: SessionAccount,
  accountId: string,
): Promise<ManageAccountAccessResult> {
  return manageAccountAccess(
    administrator,
    accountId,
    true,
    async (transaction) => {
      await transaction
        .update(accounts)
        .set({ active: false })
        .where(and(eq(accounts.id, accountId), eq(accounts.active, true)));
      await transaction.delete(sessions).where(eq(sessions.accountId, accountId));
    },
  );
}
