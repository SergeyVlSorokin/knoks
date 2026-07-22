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
import {
  addStandingClientRow,
  createTimeEntry,
  deleteTimeEntry,
  recordGridTimeEntry,
  removeStandingClientRow,
  updateTimeEntry,
} from "@/server/time";
import { createInvoiceBasis, voidInvoiceBasis } from "@/server/invoice-bases";
import type { TimeEntryMutationResult } from "@/server/time";
import type { SignInState } from "./sign-in/state";
import type {
  AccountAccessState,
  CreateAccountState,
  ManageAccountState,
} from "./administration/account-state";
import type { ClientActionState } from "./administration/client-state";
import type { ChangePasswordState } from "./profile/state";
import type { StandingRowState } from "./my-time/standing-row-state";
import type { GridEntryState } from "./my-time/grid-entry-state";
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

const gridEntrySchema = z.object({
  clientId: z.string().uuid(),
  workDate: z.string(),
  duration: z.string().max(32),
});
const timeEntrySchema = z.object({
  clientId: z.string().uuid(),
  workDate: z.string(),
  duration: z.string().max(32),
  description: z.string(),
  classification: z.enum(["billable", "non_billable"]),
});
function descriptionTooLong(value: string): boolean {
  return Array.from(value.trim()).length > 500;
}

const updateTimeEntrySchema = timeEntrySchema.extend({
  entryId: z.string().uuid(),
  version: z.coerce.number().int().positive(),
});

const deleteTimeEntrySchema = z.object({
  entryId: z.string().uuid(),
  version: z.coerce.number().int().positive(),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
  confirmation: z.string().min(1),
});

const createInvoiceBasisSchema = z.object({
  clientId: z.string().uuid(),
  startDate: z.string(),
  endDate: z.string(),
  selectedEntries: z.array(
    z.object({
      id: z.string().uuid(),
      version: z.number().int().positive(),
    }),
  ),
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

function timeEntryError(reason: Extract<TimeEntryMutationResult, { ok: false }>["reason"]): string {
  switch (reason) {
    case "invalid-duration":
      return "Use a positive duration that resolves to exact whole minutes.";
    case "daily-limit":
      return "A Member cannot record more than 24 hours on one date.";
    case "client-unavailable":
      return "That Client is no longer active.";
    case "member-unavailable":
      return "Sign in again to change time.";
    case "invalid-date":
      return "That work date is invalid.";
    case "description-too-long":
      return "Descriptions are limited to 500 characters.";
    case "forbidden":
      return "You cannot change this Time Entry.";
    case "included":
      return "Included Billable Time cannot be changed.";
    case "reload":
      return "Time changed concurrently. Reload and try again.";
  }
}

export async function createTimeEntryAction(
  _previousState: import("./my-time/time-entry-state").TimeEntryState,
  formData: FormData,
): Promise<import("./my-time/time-entry-state").TimeEntryState> {
  const attemptedDuration = String(formData.get("duration") ?? "");
  const attemptedDescription = String(formData.get("description") ?? "");
  const input = timeEntrySchema.safeParse({
    clientId: formData.get("clientId"),
    workDate: formData.get("workDate"),
    duration: attemptedDuration,
    description: attemptedDescription,
    classification: formData.get("classification"),
  });
  if (!input.success) {
    return {
      error: descriptionTooLong(attemptedDescription)
        ? "Descriptions are limited to 500 characters."
        : "Complete the date, duration, description, and classification fields.",
      attemptedDuration,
      attemptedDescription,
    };
  }
  const member = await currentSessionAccount();
  if (!member) {
    return { error: "Sign in again to change time.", attemptedDuration, attemptedDescription };
  }
  const result = await createTimeEntry(member, input.data);
  if (!result.ok) {
    return { error: timeEntryError(result.reason), attemptedDuration, attemptedDescription };
  }
  revalidatePath("/my-time");
  return { committed: true };
}

export async function updateTimeEntryAction(
  _previousState: import("./my-time/time-entry-state").TimeEntryState,
  formData: FormData,
): Promise<import("./my-time/time-entry-state").TimeEntryState> {
  const attemptedDuration = String(formData.get("duration") ?? "");
  const attemptedDescription = String(formData.get("description") ?? "");
  const input = updateTimeEntrySchema.safeParse({
    entryId: formData.get("entryId"),
    version: formData.get("version"),
    clientId: formData.get("clientId"),
    workDate: formData.get("workDate"),
    duration: attemptedDuration,
    description: attemptedDescription,
    classification: formData.get("classification"),
  });
  if (!input.success) {
    return {
      error: descriptionTooLong(attemptedDescription)
        ? "Descriptions are limited to 500 characters."
        : "Complete the date, duration, description, and classification fields.",
      attemptedDuration,
      attemptedDescription,
    };
  }
  const member = await currentSessionAccount();
  if (!member) {
    return { error: "Sign in again to change time.", attemptedDuration, attemptedDescription };
  }
  const result = await updateTimeEntry(member, input.data);
  if (!result.ok) {
    return { error: timeEntryError(result.reason), attemptedDuration, attemptedDescription };
  }
  revalidatePath("/my-time");
  return { committed: true };
}

export async function deleteTimeEntryAction(
  _previousState: import("./my-time/time-entry-state").TimeEntryState,
  formData: FormData,
): Promise<import("./my-time/time-entry-state").TimeEntryState> {
  const input = deleteTimeEntrySchema.safeParse({
    entryId: formData.get("entryId"),
    version: formData.get("version"),
  });
  if (!input.success) return { error: "Time changed concurrently. Reload and try again." };
  const member = await currentSessionAccount();
  if (!member) return { error: "Sign in again to change time." };
  const result = await deleteTimeEntry(member, input.data.entryId, input.data.version);
  if (!result.ok) return { error: timeEntryError(result.reason) };
  revalidatePath("/my-time");
  return { committed: true };
}

export async function recordGridTimeEntryAction(
  _previousState: GridEntryState,
  formData: FormData,
): Promise<GridEntryState> {
  const attemptedInput = String(formData.get("duration") ?? "");
  const input = gridEntrySchema.safeParse({
    clientId: formData.get("clientId"),
    workDate: formData.get("workDate"),
    duration: attemptedInput,
  });
  if (!input.success) {
    return {
      error: "Use a positive duration that resolves to exact whole minutes.",
      attemptedInput,
    };
  }

  const member = await currentSessionAccount();
  if (!member) {
    return { error: "Sign in again to record time.", attemptedInput };
  }

  const result = await recordGridTimeEntry(
    member,
    input.data.clientId,
    input.data.workDate,
    input.data.duration,
  );
  if (!result.ok) {
    return { error: timeEntryError(result.reason), attemptedInput };
  }

  revalidatePath("/my-time");
  return { committed: true };
}

export async function createInvoiceBasisAction(input: {
  clientId: string;
  startDate: string;
  endDate: string;
  selectedEntries: Array<{ id: string; version: number }>;
}) {
  const administrator = await currentSessionAccount();
  if (!administrator) {
    redirect("/sign-in");
  }

  const parsed = createInvoiceBasisSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Complete all fields and select at least one entry." };
  }

  const result = await createInvoiceBasis(administrator, parsed.data);
  if (!result.ok) {
    if (result.reason === "forbidden") {
      return { ok: false, error: "Only Administrators can create Invoice Bases." };
    }
    if (result.reason === "client-unavailable") {
      return { ok: false, error: "That Client is no longer active." };
    }
    if (result.reason === "no-entries-selected") {
      return { ok: false, error: "Select at least one Available Billable Time entry." };
    }
    if (result.reason === "reload") {
      return { ok: false, error: "Time entries changed concurrently. Reload and try again." };
    }
    return { ok: false, error: "Failed to create Invoice Basis." };
  }

  revalidatePath("/invoice-bases");
  return { ok: true, sequenceNumber: result.sequenceNumber };
}

const voidInvoiceBasisSchema = z.object({
  invoiceBasisId: z.string().uuid(),
  voidReason: z.string().trim().min(1, "Enter a short reason for voiding."),
});

export async function voidInvoiceBasisAction(
  _previousState: { error?: string; success?: boolean } | null,
  formData: FormData,
) {
  const administrator = await currentSessionAccount();
  if (!administrator) {
    redirect("/sign-in");
  }

  const parsed = voidInvoiceBasisSchema.safeParse({
    invoiceBasisId: formData.get("invoiceBasisId"),
    voidReason: formData.get("voidReason"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Complete the reason field." };
  }

  const result = await voidInvoiceBasis(administrator, parsed.data);
  if (!result.ok) {
    if (result.reason === "forbidden") {
      return { error: "Only Administrators can void Invoice Bases." };
    }
    if (result.reason === "already-voided") {
      return { error: "This Invoice Basis has already been voided." };
    }
    if (result.reason === "blank-reason") {
      return { error: "Enter a short reason for voiding." };
    }
    if (result.reason === "reload") {
      return { error: "The Invoice Basis changed concurrently. Reload and try again." };
    }
    return { error: "Failed to void Invoice Basis." };
  }

  revalidatePath("/invoice-bases");
  revalidatePath(`/invoice-bases/${parsed.data.invoiceBasisId}`);
  return { success: true };
}

