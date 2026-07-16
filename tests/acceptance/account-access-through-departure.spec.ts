import { expect, test } from "@playwright/test";

const administrator = {
  username: "ada",
  password: "correct horse battery staple",
};

async function signIn(page: import("@playwright/test").Page, username: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function createMember(
  page: import("@playwright/test").Page,
  displayName: string,
  username: string,
) {
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Display name").fill(displayName);
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByRole("button", { name: "Create Member" }).click();
  const receipt = page.getByRole("dialog", { name: "Credential receipt" });
  const password = await receipt.getByTestId("initial-password").textContent();
  expect(password).toBeTruthy();
  await receipt.getByRole("button", { name: "Dismiss receipt" }).click();
  return password!;
}

test("Administrator resets another active account password with a one-time receipt", async ({
  browser,
  page,
}) => {
  await signIn(page, administrator.username, administrator.password);
  const initialPassword = await createMember(page, "Grace Reset", "grace-reset");
  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await signIn(memberPage, "grace-reset", initialPassword);
  await expect(memberPage).toHaveURL(/\/my-time$/);

  const account = page.getByRole("article", { name: "Grace Reset account" });
  await account.getByRole("button", { name: "Reset password" }).click();

  const receipt = page.getByRole("dialog", { name: "Password reset receipt" });
  const resetPassword = await receipt.getByTestId("reset-password").textContent();
  expect(resetPassword).toBeTruthy();
  expect(resetPassword).not.toBe(initialPassword);
  await expect(receipt).toContainText("shown only once");
  await receipt.getByRole("button", { name: "Dismiss receipt" }).click();
  await expect(receipt).toBeHidden();
  await page.reload();
  await expect(page.getByRole("dialog", { name: "Password reset receipt" })).toBeHidden();
  await memberPage.reload();
  await expect(memberPage).toHaveURL(/\/sign-in$/);
  await memberContext.close();

  await page.getByRole("button", { name: "Sign out" }).click();
  await signIn(page, "grace-reset", initialPassword);
  await expect(page.getByText("The username or password is incorrect.", { exact: true })).toBeVisible();
  await page.getByLabel("Username").fill("grace-reset");
  await page.getByLabel("Password").fill(resetPassword!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/my-time$/);
});

test("Administrator changes roles and permanently deactivates another account", async ({
  browser,
  page,
}) => {
  await signIn(page, administrator.username, administrator.password);
  const initialPassword = await createMember(page, "Grace Departure", "grace-depart");
  const account = page.getByRole("article", { name: "Grace Departure account" });

  await account.getByRole("button", { name: "Make Administrator" }).click();
  await expect(account).toContainText("Administrator · includes Member access");

  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await signIn(memberPage, "grace-depart", initialPassword);
  await expect(memberPage).toHaveURL(/\/administration$/);

  await account.getByRole("button", { name: "Make Member" }).click();
  await expect(
    account.getByRole("button", { name: "Make Administrator" }),
  ).toBeVisible();
  await memberPage.reload();
  await expect(memberPage).toHaveURL(/\/my-time$/);

  await account.getByRole("button", { name: "Deactivate account" }).click();
  const confirmation = page.getByRole("dialog", { name: "Deactivate Grace Departure" });
  await expect(confirmation).toContainText(
    "History keeps Grace Departure as the acting account. This identifies the account, not necessarily the person who used it.",
  );
  await confirmation.getByRole("button", { name: "Permanently deactivate" }).click();
  await expect(account).toContainText("Inactive");
  await expect(account.getByRole("button", { name: "Reset password" })).toBeHidden();

  await memberPage.reload();
  await expect(memberPage).toHaveURL(/\/sign-in$/);
  await signIn(memberPage, "grace-depart", initialPassword);
  await expect(
    memberPage.getByText("The username or password is incorrect.", { exact: true }),
  ).toBeVisible();
  await memberContext.close();

  await page.getByLabel("Display name").fill("Returning Grace");
  await page.getByLabel("Username", { exact: true }).fill("grace-depart");
  await page.getByRole("button", { name: "Create Member" }).click();
  await expect(
    page.getByText("That username is already in use.", { exact: true }),
  ).toBeVisible();
});

test("the last active Administrator cannot be demoted or deactivated", async ({
  page,
}) => {
  await signIn(page, administrator.username, administrator.password);
  await expect(page).toHaveURL(/\/administration$/);
  const ownAccount = page.getByRole("article", { name: "Ada Admin account" });
  await expect(ownAccount).toContainText("Last active Administrator");
  await expect(
    ownAccount.getByRole("button", { name: "Make Member" }),
  ).toBeHidden();
  await expect(
    ownAccount.getByRole("button", { name: "Deactivate account" }),
  ).toBeHidden();
});
