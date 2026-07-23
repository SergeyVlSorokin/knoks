import { expect, test } from "@playwright/test";
import { createMemberAndClients, signIn, signInAsAdministrator } from "./support/workspace";

test("Member navigates a Swedish-local week and keeps private standing Client rows", async ({
  browser,
  page,
}) => {
  const memberPassword = await createMemberAndClients(
    page,
    { displayName: "Weekly Grid Member", username: "weekly-grid-member" },
    ["Northwind", "Contoso"],
  );

  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await signIn(memberPage, "weekly-grid-member", memberPassword);
  await expect(memberPage).toHaveURL(/\/my-time$/, { timeout: 15_000 });

  const grid = memberPage.getByRole("grid", { name: "Weekly time" });
  await expect(grid).toBeVisible();
  await expect(grid.getByRole("columnheader")).toHaveCount(9);
  const dayWidths = await grid
    .getByRole("columnheader")
    .evaluateAll((headers) =>
      headers.slice(1, 8).map((header) => Math.round(header.getBoundingClientRect().width)),
    );
  expect(Math.max(...dayWidths) - Math.min(...dayWidths)).toBeLessThanOrEqual(1);
  await expect(grid.getByRole("row")).toHaveCount(2);
  const currentStockholmDate = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .slice(5);
  await expect(
    grid.getByRole("columnheader", { name: new RegExp(currentStockholmDate) }),
  ).toBeVisible();

  await memberPage.getByLabel("Add a standing Client row").selectOption({ label: "Northwind" });
  await memberPage.getByRole("button", { name: "Add row" }).click();
  await expect(grid.getByRole("row", { name: /Northwind/ })).toBeVisible();
  await expect(grid.getByRole("row", { name: /Northwind/ }).getByRole("gridcell")).toHaveCount(8);

  await memberPage.goto("/my-time?week=2026-07-15");
  await expect(grid.getByRole("columnheader", { name: /Mon 07-13/ })).toBeVisible();
  await expect(grid.getByRole("columnheader", { name: /Sun 07-19/ })).toBeVisible();
  await expect(memberPage.getByText("Week 29 · 2026-07-13 – 2026-07-19")).toBeVisible();
  await expect(grid.getByRole("columnheader", { name: "Week" })).toBeVisible();

  await memberPage.getByRole("link", { name: "Previous week" }).click();
  await expect(memberPage).toHaveURL(/week=2026-07-06/);
  await expect(grid.getByRole("columnheader", { name: /Mon 07-06/ })).toBeVisible();
  await expect(grid.getByRole("columnheader", { name: /Sun 07-12/ })).toBeVisible();

  await memberPage.getByRole("link", { name: "Next week" }).click();
  await expect(memberPage).toHaveURL(/week=2026-07-13/);
  await expect(grid.getByRole("row", { name: /Northwind/ })).toBeVisible();

  await grid.getByRole("row", { name: /Northwind/ }).getByRole("button", { name: "Remove row" }).click();
  await expect(grid.getByRole("row", { name: /Northwind/ })).toBeHidden();

  await memberContext.close();

  const secondMemberContext = await browser.newContext();
  const secondMemberPage = await secondMemberContext.newPage();
  await signInAsAdministrator(secondMemberPage);
  await expect(secondMemberPage).toHaveURL(/\/administration$/, { timeout: 15_000 });
  await secondMemberPage.getByRole("link", { name: "My time" }).click();
  await expect(secondMemberPage.getByRole("grid", { name: "Weekly time" }).getByRole("row")).toHaveCount(2);
  await secondMemberContext.close();
});

test("Member cannot remove a standing Client row that contains weekly Time Entries", async ({
  browser,
  page,
}) => {
  const memberPassword = await createMemberAndClients(
    page,
    { displayName: "Standing Row Time Member", username: "standing-row-time-member" },
    ["Northwind"],
  );

  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await signIn(memberPage, "standing-row-time-member", memberPassword);
  await expect(memberPage).toHaveURL(/\/my-time$/, { timeout: 15_000 });
  await memberPage.goto("/my-time?week=2099-07-13");

  const grid = memberPage.getByRole("grid", { name: "Weekly time" });
  await memberPage.getByLabel("Add a standing Client row").selectOption({ label: "Northwind" });
  await memberPage.getByRole("button", { name: "Add row" }).click();

  const row = grid.getByRole("row", { name: /Northwind/ });
  await expect(row.getByRole("button", { name: "Remove row" })).toBeVisible();
  const monday = memberPage.getByLabel("Northwind, Mon 2099-07-13");
  await monday.fill("1:00");
  await monday.press("Enter");

  await expect(monday).toHaveText(/1:00.*B/);
  await expect(row.getByRole("button", { name: "Remove row" })).toBeHidden();
  await memberContext.close();
});
