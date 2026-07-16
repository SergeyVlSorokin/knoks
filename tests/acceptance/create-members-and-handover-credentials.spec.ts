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

test("Administrator creates a Member who receives credentials once and changes their password", async ({
  page,
}) => {
  await signIn(page, administrator.username, administrator.password);

  await page.getByRole("button", { name: "Create account" }).click();
  const accountForm = page
    .locator("form")
    .filter({ has: page.getByLabel("Display name") });
  const clientsCard = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "Clients" }) });
  const [accountFormBox, clientsCardBox] = await Promise.all([
    accountForm.boundingBox(),
    clientsCard.boundingBox(),
  ]);
  expect(accountFormBox).not.toBeNull();
  expect(clientsCardBox).not.toBeNull();
  expect(accountFormBox!.x + accountFormBox!.width).toBeLessThanOrEqual(
    clientsCardBox!.x,
  );
  await page.getByLabel("Display name").fill("  Grace Member  ");
  await page.getByLabel("Username", { exact: true }).fill("grace");
  await page.getByLabel("Role").selectOption("member");
  await page.getByRole("button", { name: "Create Member" }).click();

  const receipt = page.getByRole("dialog", { name: "Credential receipt" });
  await expect(receipt).toContainText("Grace Member");
  await expect(receipt).toContainText("grace");
  const initialPassword = await receipt.getByTestId("initial-password").textContent();
  expect(initialPassword).toBeTruthy();

  await receipt.getByRole("button", { name: "Dismiss receipt" }).click();
  await expect(receipt).toBeHidden();
  await page.reload();
  await expect(page.getByRole("dialog", { name: "Credential receipt" })).toBeHidden();
  await expect(page.getByText("Grace Member")).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await signIn(page, "grace", initialPassword!);
  await expect(page).toHaveURL(/\/my-time$/);
  await expect(page.getByRole("link", { name: "Administration" })).toBeHidden();
  await page.goto("/administration");
  await expect(page).toHaveURL(/\/my-time$/);

  await page.getByRole("link", { name: "Profile" }).click();
  await page.getByLabel("Current password").fill(initialPassword!);
  await page.getByLabel("New password", { exact: true }).fill("new correct horse battery staple");
  await page.getByLabel("Confirm new password").fill("new correct horse battery staple");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByRole("status")).toHaveText("Password changed.");

  await page.getByRole("button", { name: "Sign out" }).click();
  await signIn(page, "grace", initialPassword!);
  await expect(page.getByText("The username or password is incorrect.", { exact: true })).toBeVisible();
  await page.getByLabel("Username").fill("grace");
  await page.getByLabel("Password").fill("new correct horse battery staple");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/my-time$/);
});

test("Administrator creates another Administrator with a workspace-unique username", async ({
  page,
}) => {
  await signIn(page, administrator.username, administrator.password);

  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Display name").fill("Duplicate Admin");
  await page.getByLabel("Username", { exact: true }).fill("ada");
  await page.getByLabel("Role").selectOption("administrator");
  await page.getByRole("button", { name: "Create Administrator" }).click();
  await expect(page.getByText("That username is already in use.")).toBeVisible();

  await page.getByLabel("Display name").fill("  Linus Administrator  ");
  await page.getByLabel("Username", { exact: true }).fill("linus");
  await page.getByLabel("Role").selectOption("administrator");
  await page.getByRole("button", { name: "Create Administrator" }).click();

  const receipt = page.getByRole("dialog", { name: "Credential receipt" });
  await expect(receipt).toContainText("Linus Administrator");
  const initialPassword = await receipt.getByTestId("initial-password").textContent();
  expect(initialPassword).toBeTruthy();
  await receipt.getByRole("button", { name: "Dismiss receipt" }).click();

  await page.getByRole("button", { name: "Sign out" }).click();
  await signIn(page, "linus", initialPassword!);
  await expect(page).toHaveURL(/\/administration$/);
  await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible();
  await page.getByRole("link", { name: "My time" }).click();
  await expect(page).toHaveURL(/\/my-time$/);
});
