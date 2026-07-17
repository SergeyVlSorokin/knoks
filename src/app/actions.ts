"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { signIn, signOut } from "@/server/access";
import {
  changeAccountRole,
  changeOwnPassword,
  createAccount,
  deactivateAccount,
  resetAccountPassword,
} from "@/server/access/accounts";
import { currentSessionAccount } from "@/server/access/session-cookie";
import { sessionCookieName } from "@/server/access/session-cookie";
import {
  createClient,
  deleteClient,
  renameClient,
  setClientArchived,
} from "@/server/clients";
import { addStandingClientRow, removeStandingClientRow } from "@/server/time";
import type { SignInState } from "./sign-in/state";
import type {
  AccountAccessState,
  CreateAccountState,
  ManageAccountState,
} from "./administration/account-state";
import type { ClientActionState } from "./administration/client-state";
import type { ChangePasswordState } from "./profile/state";
import type { StandingRowState } from "./my-time/standing-row-state";
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

const managedAccountSchema = z.object({
  accountId: z.string().uuid(),
});

const accountRoleChangeSchema = managedAccountSchema.extend({
  role: z.enum(["member", "administrator"]),
});

const clientNameSchema = z.object({
  displayName: z.string().trim().min(1),
});

const managedClientSchema = z.object({
  clientId: z.string().uuid(),
  version: z.coerce.number().int().positive(),
});

const renamedClientSchema = managedClientSchema.extend(clientNameSchema.shape);

const standingClientSchema = z.object({
  clientId: z.string().uuid(),
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

export async function resetAccountPasswordAction(
  _previousState: ManageAccountState,
  formData: FormData,
): Promise<ManageAccountState> {
  const administrator = await currentSessionAccount();
  if (!administrator) {
    redirect("/sign-in");
  }

  const input = managedAccountSchema.safeParse({
    accountId: formData.get("accountId"),
  });
  if (!input.success) {
    return { error: "The account changed. Reload and try again." };
  }

  const result = await resetAccountPassword(
    administrator,
    input.data.accountId,
  );
  if (!result.ok) {
    return {
      error:
        result.reason === "forbidden"
          ? "Only Administrators can reset another account's password."
          : "Only active accounts can receive a new password.",
    };
  }

  return { resetPassword: result.password };
}

function accountAccessError(
  reason: "forbidden" | "account-unavailable" | "last-administrator",
): string {
  switch (reason) {
    case "forbidden":
      return "Only Administrators can manage another account.";
    case "last-administrator":
      return "The last active Administrator cannot be demoted or deactivated.";
    case "account-unavailable":
      return "Only active accounts can be managed.";
  }
}

export async function changeAccountRoleAction(
  _previousState: AccountAccessState,
  formData: FormData,
): Promise<AccountAccessState> {
  const administrator = await currentSessionAccount();
  if (!administrator) {
    redirect("/sign-in");
  }

  const input = accountRoleChangeSchema.safeParse({
    accountId: formData.get("accountId"),
    role: formData.get("role"),
  });
  if (!input.success) {
    return { error: "The account changed. Reload and try again." };
  }

  const result = await changeAccountRole(
    administrator,
    input.data.accountId,
    input.data.role,
  );
  if (!result.ok) {
    return { error: accountAccessError(result.reason) };
  }

  revalidatePath("/administration");
  return { success: "Role changed." };
}

export async function deactivateAccountAction(
  _previousState: AccountAccessState,
  formData: FormData,
): Promise<AccountAccessState> {
  const administrator = await currentSessionAccount();
  if (!administrator) {
    redirect("/sign-in");
  }

  const input = managedAccountSchema.safeParse({
    accountId: formData.get("accountId"),
  });
  if (!input.success) {
    return { error: "The account changed. Reload and try again." };
  }

  const result = await deactivateAccount(
    administrator,
    input.data.accountId,
  );
  if (!result.ok) {
    return { error: accountAccessError(result.reason) };
  }

  revalidatePath("/administration");
  return { success: "Account permanently deactivated." };
}

function revalidateClientViews() {
  revalidatePath("/administration");
  revalidatePath("/my-time");
}

function clientError(
  reason: "forbidden" | "name-taken" | "reload",
): string {
  switch (reason) {
    case "forbidden":
      return "Only Administrators can manage Clients.";
    case "name-taken":
      return "That Client name is already in use.";
    case "reload":
      return "The Client changed. Reload and try again.";
  }
}

export async function createClientAction(
  _previousState: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  const administrator = await currentSessionAccount();
  if (!administrator) {
    redirect("/sign-in");
  }

  const input = clientNameSchema.safeParse({
    displayName: formData.get("displayName"),
  });
  if (!input.success) {
    return { error: "Enter a Client name." };
  }

  const result = await createClient(administrator, input.data.displayName);
  if (!result.ok) {
    return { error: clientError(result.reason) };
  }

  revalidateClientViews();
  return { success: "Client created." };
}

export async function renameClientAction(
  _previousState: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  const administrator = await currentSessionAccount();
  if (!administrator) {
    redirect("/sign-in");
  }

  const input = renamedClientSchema.safeParse({
    clientId: formData.get("clientId"),
    version: formData.get("version"),
    displayName: formData.get("displayName"),
  });
  if (!input.success) {
    return { error: "Enter a Client name." };
  }

  const result = await renameClient(
    administrator,
    input.data.clientId,
    input.data.version,
    input.data.displayName,
  );
  if (!result.ok) {
    return { error: clientError(result.reason) };
  }

  revalidateClientViews();
  return { success: "Client renamed." };
}

async function changeClientArchiveState(
  formData: FormData,
  archived: boolean,
): Promise<ClientActionState> {
  const administrator = await currentSessionAccount();
  if (!administrator) {
    redirect("/sign-in");
  }

  const input = managedClientSchema.safeParse({
    clientId: formData.get("clientId"),
    version: formData.get("version"),
  });
  if (!input.success) {
    return { error: "The Client changed. Reload and try again." };
  }

  const result = await setClientArchived(
    administrator,
    input.data.clientId,
    input.data.version,
    archived,
  );
  if (!result.ok) {
    return { error: clientError(result.reason) };
  }

  revalidateClientViews();
  return { success: archived ? "Client archived." : "Client restored." };
}

export async function archiveClientAction(
  _previousState: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  return changeClientArchiveState(formData, true);
}

export async function restoreClientAction(
  _previousState: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  return changeClientArchiveState(formData, false);
}

export async function deleteClientAction(
  _previousState: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  const administrator = await currentSessionAccount();
  if (!administrator) {
    redirect("/sign-in");
  }

  const input = managedClientSchema.safeParse({
    clientId: formData.get("clientId"),
    version: formData.get("version"),
  });
  if (!input.success) {
    return { error: "The Client changed. Reload and try again." };
  }

  const result = await deleteClient(
    administrator,
    input.data.clientId,
    input.data.version,
  );
  if (!result.ok) {
    return {
      error:
        result.reason === "client-referenced"
          ? "A Client with recorded time cannot be permanently deleted. Archive it instead."
          : clientError(result.reason),
    };
  }

  revalidateClientViews();
  return { success: "Client permanently deleted." };
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

async function changeStandingRow(
  formData: FormData,
  change: typeof addStandingClientRow,
): Promise<StandingRowState> {
  const input = standingClientSchema.safeParse({ clientId: formData.get("clientId") });
  if (!input.success) {
    return { error: "Select an active Client." };
  }

  const member = await currentSessionAccount();
  if (!member) {
    return { error: "Sign in again to change your weekly grid." };
  }

  const result = await change(member, input.data.clientId);
  if (!result.ok) {
    const error =
      result.reason === "account-unavailable"
        ? "Sign in again to change your weekly grid."
        : result.reason === "client-unavailable"
          ? "That Client is no longer active."
          : "The weekly grid changed. Reload and try again.";
    return { error };
  }

  revalidatePath("/my-time");
  return {};
}

export async function addStandingRowAction(
  _previousState: StandingRowState,
  formData: FormData,
): Promise<StandingRowState> {
  return changeStandingRow(formData, addStandingClientRow);
}

export async function removeStandingRowAction(
  _previousState: StandingRowState,
  formData: FormData,
): Promise<StandingRowState> {
  return changeStandingRow(formData, removeStandingClientRow);
}
