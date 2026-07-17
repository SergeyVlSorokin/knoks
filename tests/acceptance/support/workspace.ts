import { expect, type Page } from "@playwright/test";

const administrator = {
  username: "ada",
  password: "correct horse battery staple",
};

export async function signIn(page: Page, username: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function signInAsAdministrator(page: Page) {
  await signIn(page, administrator.username, administrator.password);
}

export async function createMemberAndClients(
  page: Page,
  member: { displayName: string; username: string },
  clientNames: string[],
) {
  await signInAsAdministrator(page);
  await expect(page).toHaveURL(/\/administration$/, { timeout: 15_000 });

  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Display name").fill(member.displayName);
  await page.getByLabel("Username", { exact: true }).fill(member.username);
  await page.getByLabel("Role").selectOption("member");
  await page.getByRole("button", { name: "Create Member" }).click();
  const receipt = page.getByRole("dialog", { name: "Credential receipt" });
  const password = await receipt.getByTestId("initial-password").textContent();
  expect(password).toBeTruthy();
  await receipt.getByRole("button", { name: "Dismiss receipt" }).click();

  const clients = page.getByRole("article", { name: "Clients" });
  for (const name of clientNames) {
    await clients.getByLabel("Client name").fill(name);
    await clients.getByRole("button", { name: "Create Client" }).click();
    await expect(clients.getByRole("article", { name: `${name} Client` })).toBeVisible();
  }

  return password!;
}
