import "server-only";

import { cookies } from "next/headers";

import { getSessionAccount, type SessionAccount } from ".";

export const sessionCookieName = "consulting_time_session";

export async function currentSessionAccount(): Promise<SessionAccount | null> {
  const cookieStore = await cookies();
  return getSessionAccount(cookieStore.get(sessionCookieName)?.value);
}
