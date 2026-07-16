"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { signIn, signOut } from "@/server/access";
import { changeOwnPassword, createAccount } from "@/server/access/accounts";
import { currentSessionAccount } from "@/server/access/session-cookie";
import { sessionCookieName } from "@/server/access/session-cookie";
import type { SignInState } from "./sign-in/state";
import type { CreateAccountState } from "./administration/account-state";
import type { ChangePasswordState } from "./profile/state";
import type { SignOutState } from "./sign-out-state";

const credentialsSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

const accountSchema = z.object({
  displayName: z.string().trim().min(1),
  username: z.string().trim().min(1),
  role: z.enum(["member", "administrator"]),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
  confirmation: z.string().min(1),
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

export async function createAccountAction(
  _previousState: CreateAccountState,
  formData: FormData,
): Promise<CreateAccountState> {
  const administrator = await currentSessionAccount();
  if (!administrator) {
    redirect("/sign-in");
  }

  const input = accountSchema.safeParse({
    displayName: formData.get("displayName"),
    username: formData.get("username"),
    role: formData.get("role"),
  });
  if (!input.success) {
    return { error: "Enter a display name, username, and role." };
  }

  const result = await createAccount(administrator, input.data);
  if (!result.ok) {
    return {
      error:
        result.reason === "username-taken"
          ? "That username is already in use."
          : "Only Administrators can create accounts.",
    };
  }

  revalidatePath("/administration");
  return {
    receipt: {
      displayName: input.data.displayName,
      username: input.data.username,
      initialPassword: result.initialPassword,
    },
  };
}

export async function changePasswordAction(
  _previousState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const account = await currentSessionAccount();
  if (!account) {
    redirect("/sign-in");
  }

  const input = passwordChangeSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmation: formData.get("confirmation"),
  });
  if (!input.success) {
    return { error: "Complete all password fields." };
  }
  if (input.data.newPassword !== input.data.confirmation) {
    return { error: "New passwords do not match." };
  }

  const result = await changeOwnPassword(
    account.accountId,
    input.data.currentPassword,
    input.data.newPassword,
  );
  if (!result.ok) {
    return {
      error:
        result.reason === "incorrect-password"
          ? "Current password is incorrect."
          : "Your account changed. Reload and try again.",
    };
  }

  return { success: "Password changed." };
}
