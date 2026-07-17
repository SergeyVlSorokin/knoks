import { expect, test } from "@playwright/test";

const administrator = {
  username: "ada",
  password: "correct horse battery staple",
};

async function signIn(
  page: import("@playwright/test").Page,
  username: string,
  password: string,
) {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function createMember(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Display name").fill("Grace Member");
  await page.getByLabel("Username", { exact: true }).fill("grace-clients");
  await page.getByRole("button", { name: "Create Member" }).click();
  const receipt = page.getByRole("dialog", { name: "Credential receipt" });
  const password = await receipt.getByTestId("initial-password").textContent();
  expect(password).toBeTruthy();
  await receipt.getByRole("button", { name: "Dismiss receipt" }).click();
  return password!;
}

test("Administrator manages the Client lifecycle and derived first-use state", async ({
  browser,
  page,
}) => {
  await signIn(page, administrator.username, administrator.password);
  await expect(page).toHaveURL(/\/administration$/, { timeout: 15_000 });

  const accounts = page.getByRole("article", { name: "Accounts" });
  const clients = page.getByRole("article", { name: "Clients" });
  await expect(accounts).toBeVisible();
  await expect(clients).toBeVisible();
  await expect(page.getByText("An active Client is required before time can be recorded.")).toBeVisible();

  const memberPassword = await createMember(page);
  await clients.getByLabel("Client name").fill("  Acme AB  ");
  await clients.getByRole("button", { name: "Create Client" }).click();
  await expect(clients.getByRole("article", { name: "Acme AB Client" })).toBeVisible();
  await expect(page.getByText("An active Client is required before time can be recorded.")).toBeHidden();

  await clients.getByLabel("Client name").fill("acme ab");
  await clients.getByRole("button", { name: "Create Client" }).click();
  await expect(clients.getByText("That Client name is already in use.")).toBeVisible();

  const client = clients.getByRole("article", { name: "Acme AB Client" });
  await client.getByRole("button", { name: "Rename" }).click();
  await client.getByLabel("Client name").fill("Acme Consulting AB");
  await client.getByRole("button", { name: "Save name" }).click();
  const renamedClient = clients.getByRole("article", { name: "Acme Consulting AB Client" });
  await expect(renamedClient).toBeVisible();
  await expect(
    renamedClient.getByRole("button", { name: "Save name" }),
  ).toBeHidden();
  await expect(renamedClient.getByLabel("Client name")).toBeHidden();

  await renamedClient.getByRole("button", { name: "Archive" }).click();
  await expect(renamedClient).toContainText("Archived");
  await expect(clients.getByText("No active Clients", { exact: true })).toBeVisible();
  await expect(clients.getByRole("button", { name: "Restore" })).toBeVisible();
  await expect(page.getByText("An active Client is required before time can be recorded.")).toBeHidden();

  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await signIn(memberPage, "grace-clients", memberPassword);
  await expect(memberPage).toHaveURL(/\/my-time$/, { timeout: 15_000 });
  await expect(memberPage.getByRole("heading", { name: "No active Clients" })).toBeVisible();
  await expect(memberPage.getByText("Ask an Administrator to create or restore a Client.")).toBeVisible();
  await expect(memberPage.getByRole("grid")).toBeHidden();
  await memberContext.close();

  await renamedClient.getByRole("button", { name: "Restore" }).click();
  await expect(renamedClient).toContainText("Active");
  await renamedClient.getByRole("button", { name: "Delete permanently" }).click();
  const confirmation = page.getByRole("dialog", { name: "Delete Acme Consulting AB" });
  await confirmation.getByRole("button", { name: "Delete permanently" }).click();
  await expect(renamedClient).toBeHidden();
  await expect(page.getByText("An active Client is required before time can be recorded.")).toBeVisible();
});

test("stale Client changes require a reload", async ({ browser, page }) => {
  await signIn(page, administrator.username, administrator.password);
  const clients = page.getByRole("article", { name: "Clients" });
  await clients.getByLabel("Client name").fill("Concurrent Client");
  await clients.getByRole("button", { name: "Create Client" }).click();

  const staleContext = await browser.newContext();
  const stalePage = await staleContext.newPage();
  await signIn(stalePage, administrator.username, administrator.password);
  const staleClient = stalePage.getByRole("article", {
    name: "Concurrent Client Client",
  });
  await expect(staleClient).toBeVisible();

  const currentClient = clients.getByRole("article", {
    name: "Concurrent Client Client",
  });
  await currentClient.getByRole("button", { name: "Rename" }).click();
  await currentClient.getByLabel("Client name").fill("Current Client");
  await currentClient.getByRole("button", { name: "Save name" }).click();
  await expect(
    clients.getByRole("article", { name: "Current Client Client" }),
  ).toBeVisible();

  await staleClient.getByRole("button", { name: "Archive" }).click();
  await expect(staleClient).toContainText(
    "The Client changed. Reload and try again.",
  );
  await staleContext.close();
});
