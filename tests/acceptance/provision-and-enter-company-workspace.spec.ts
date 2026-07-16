import { expect, test } from "@playwright/test";

const credentials = {
  username: "ada",
  password: "correct horse battery staple",
};

test("provisioned Administrator enters the ordinary workspace and can sign out", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.getByLabel("Username").fill(credentials.username);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/administration$/);
  await expect(
    page.getByRole("link", { name: /Northstar Consulting/ }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Administration" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Clients" })).toBeVisible();
  await expect(page.getByRole("link", { name: "My time" })).toBeVisible();
  await page.getByRole("link", { name: "My time" }).first().click();
  await expect(page).toHaveURL(/\/my-time$/);
  await expect(page.getByRole("heading", { name: "My time" })).toBeVisible();

  const sessionCookie = (await context.cookies()).find(
    (cookie) => cookie.name === "consulting_time_session",
  );
  expect(sessionCookie).toBeDefined();
  expect(sessionCookie?.expires).toBe(-1);
  expect(sessionCookie?.httpOnly).toBe(true);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/administration");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("a browser-close session does not carry into a reopened browser", async ({ browser }) => {
  const firstBrowserSession = await browser.newContext();
  const firstPage = await firstBrowserSession.newPage();
  await firstPage.goto("/sign-in");
  await firstPage.getByLabel("Username").fill(credentials.username);
  await firstPage.getByLabel("Password").fill(credentials.password);
  await firstPage.getByRole("button", { name: "Sign in" }).click();
  await expect(firstPage).toHaveURL(/\/administration$/);
  await firstBrowserSession.close();

  const reopenedBrowserSession = await browser.newContext();
  const reopenedPage = await reopenedBrowserSession.newPage();
  await reopenedPage.goto("/administration");
  await expect(reopenedPage).toHaveURL(/\/sign-in$/);
  await reopenedBrowserSession.close();
});

test("there is no public registration or bootstrap surface", async ({ page }) => {
  for (const path of ["/register", "/workspace/new", "/bootstrap"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
  }
});
