"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { signIn, signOut } from "@/server/access";
import { sessionCookieName } from "@/server/access/session-cookie";
import type { SignInState } from "./sign-in/state";
import type { SignOutState } from "./sign-out-state";

const credentialsSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export async function signInAction(
  _previousState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const credentials = credentialsSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!credentials.success) {
    return { error: "Enter your username and password." };
  }

  const result = await signIn(credentials.data.username, credentials.data.password);
  if (!result.ok) {
    return {
      error:
        result.reason === "reload"
          ? "The workspace changed while signing in. Reload and try again."
          : "The username or password is incorrect.",
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  redirect("/administration");
}

export async function signOutAction(
  _previousState: SignOutState,
): Promise<SignOutState> {
  const cookieStore = await cookies();
  const result = await signOut(cookieStore.get(sessionCookieName)?.value);
  if (!result.ok) {
    return { error: "The workspace changed. Reload and sign out again." };
  }
  cookieStore.delete(sessionCookieName);
  redirect("/sign-in");
}
