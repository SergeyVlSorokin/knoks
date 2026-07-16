import "server-only";

import { randomBytes } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { accounts, type AccountRole } from "@/server/db/schema";
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

function isUniqueViolation(error: unknown): boolean {
  let current = error;
  while (typeof current === "object" && current !== null) {
    if ("code" in current && current.code === "23505") {
      return true;
    }
    if (!("cause" in current)) {
      return false;
    }
    current = current.cause;
  }
  return false;
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
