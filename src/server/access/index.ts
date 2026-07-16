import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/server/db";
import {
  accounts,
  companyWorkspace,
  sessions,
  type AccountRole,
} from "@/server/db/schema";
import { verifyPassword } from "./password";

export interface SessionAccount {
  accountId: string;
  displayName: string;
  username: string;
  role: AccountRole;
  workspaceName: string;
}

export type SignInResult =
  | { ok: true; token: string }
  | { ok: false; reason: "invalid-credentials" | "reload" };

export type SignOutResult =
  | { ok: true }
  | { ok: false; reason: "reload" };

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

function isSerializationFailure(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "40001"
  );
}

export async function signIn(
  username: string,
  password: string,
): Promise<SignInResult> {
  const account = await db.query.accounts.findFirst({
    where: and(eq(accounts.username, username.trim()), eq(accounts.active, true)),
  });

  if (!account || !(await verifyPassword(password, account.passwordHash))) {
    return { ok: false, reason: "invalid-credentials" };
  }

  const token = randomBytes(32).toString("base64url");
  try {
    const sessionCreated = await db.transaction(async (transaction) => {
      await transaction.execute(sql`set transaction isolation level serializable`);
      const currentAccount = await transaction.query.accounts.findFirst({
        where: and(eq(accounts.id, account.id), eq(accounts.active, true)),
        columns: { id: true },
      });
      if (!currentAccount) {
        return false;
      }
      await transaction.insert(sessions).values({
        tokenHash: hashSessionToken(token),
        accountId: currentAccount.id,
      });
      return true;
    });
    if (!sessionCreated) {
      return { ok: false, reason: "invalid-credentials" };
    }
  } catch (error) {
    if (isSerializationFailure(error)) {
      return { ok: false, reason: "reload" };
    }
    throw error;
  }

  return { ok: true, token };
}

export async function getSessionAccount(
  token: string | undefined,
): Promise<SessionAccount | null> {
  if (!token) {
    return null;
  }

  const session = await db
    .select({
      accountId: accounts.id,
      displayName: accounts.displayName,
      username: accounts.username,
      role: accounts.role,
      workspaceName: companyWorkspace.name,
    })
    .from(sessions)
    .innerJoin(accounts, eq(accounts.id, sessions.accountId))
    .innerJoin(companyWorkspace, eq(companyWorkspace.id, 1))
    .where(
      and(
        eq(sessions.tokenHash, hashSessionToken(token)),
        eq(accounts.active, true),
      ),
    )
    .limit(1);

  return session[0] ?? null;
}

export async function signOut(
  token: string | undefined,
): Promise<SignOutResult> {
  if (!token) {
    return { ok: true };
  }

  try {
    await db.transaction(async (transaction) => {
      await transaction.execute(sql`set transaction isolation level serializable`);
      await transaction
        .delete(sessions)
        .where(eq(sessions.tokenHash, hashSessionToken(token)));
    });
    return { ok: true };
  } catch (error) {
    if (isSerializationFailure(error)) {
      return { ok: false, reason: "reload" };
    }
    throw error;
  }
}
