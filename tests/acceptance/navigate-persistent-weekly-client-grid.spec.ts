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

async function createMemberAndClients(page: import("@playwright/test").Page) {
  await signIn(page, administrator.username, administrator.password);
  await expect(page).toHaveURL(/\/administration$/, { timeout: 15_000 });

  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Display name").fill("Weekly Grid Member");
  await page.getByLabel("Username", { exact: true }).fill("weekly-grid-member");
  await page.getByRole("button", { name: "Create Member" }).click();
  const receipt = page.getByRole("dialog", { name: "Credential receipt" });
  const password = await receipt.getByTestId("initial-password").textContent();
  expect(password).toBeTruthy();
  await receipt.getByRole("button", { name: "Dismiss receipt" }).click();

  const clients = page.getByRole("article", { name: "Clients" });
  for (const name of ["Northwind", "Contoso"]) {
    await clients.getByLabel("Client name").fill(name);
    await clients.getByRole("button", { name: "Create Client" }).click();
    await expect(clients.getByRole("article", { name: `${name} Client` })).toBeVisible();
  }

  return password!;
}

test("Member navigates a Swedish-local week and keeps private standing Client rows", async ({
  browser,
  page,
}) => {
  const memberPassword = await createMemberAndClients(page);

  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await signIn(memberPage, "weekly-grid-member", memberPassword);
  await expect(memberPage).toHaveURL(/\/my-time$/, { timeout: 15_000 });

  const grid = memberPage.getByRole("grid", { name: "Weekly time" });
  await expect(grid).toBeVisible();
  await expect(grid.getByRole("columnheader")).toHaveCount(8);
  await expect(grid.getByRole("row")).toHaveCount(1);
  const currentStockholmDate = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  await expect(
    grid.getByRole("columnheader", { name: new RegExp(currentStockholmDate) }),
  ).toBeVisible();

  await memberPage.getByLabel("Add a standing Client row").selectOption({ label: "Northwind" });
  await memberPage.getByRole("button", { name: "Add row" }).click();
  await expect(grid.getByRole("row", { name: /Northwind/ })).toBeVisible();
  await expect(grid.getByRole("gridcell")).toHaveCount(7);

  await memberPage.goto("/my-time?week=2026-07-15");
  await expect(grid.getByRole("columnheader", { name: /Monday 2026-07-13/ })).toBeVisible();
  await expect(grid.getByRole("columnheader", { name: /Sunday 2026-07-19/ })).toBeVisible();
  await expect(grid.getByRole("row", { name: /Northwind/ })).toBeVisible();

  await memberPage.getByRole("link", { name: "Previous week" }).click();
  await expect(memberPage).toHaveURL(/week=2026-07-06/);
  await expect(grid.getByRole("columnheader", { name: /Monday 2026-07-06/ })).toBeVisible();
  await expect(grid.getByRole("columnheader", { name: /Sunday 2026-07-12/ })).toBeVisible();

  await memberPage.getByRole("link", { name: "Next week" }).click();
  await expect(memberPage).toHaveURL(/week=2026-07-13/);
  await expect(grid.getByRole("row", { name: /Northwind/ })).toBeVisible();

  await grid.getByRole("row", { name: /Northwind/ }).getByRole("button", { name: "Remove row" }).click();
  await expect(grid.getByRole("row", { name: /Northwind/ })).toBeHidden();

  await memberContext.close();

  const secondMemberContext = await browser.newContext();
  const secondMemberPage = await secondMemberContext.newPage();
  await signIn(secondMemberPage, administrator.username, administrator.password);
  await expect(secondMemberPage).toHaveURL(/\/administration$/, { timeout: 15_000 });
  await secondMemberPage.getByRole("link", { name: "My time" }).click();
  await expect(secondMemberPage.getByRole("grid", { name: "Weekly time" }).getByRole("row")).toHaveCount(1);
  await secondMemberContext.close();
});
