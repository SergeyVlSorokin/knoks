import { expect, test } from "@playwright/test";
import { createMemberAndClients, signIn } from "./support/workspace";

test("Member opens a constituent cell, corrects entries, and sees accountable history", async ({
  browser,
  page,
}) => {
  test.setTimeout(120_000);
  const password = await createMemberAndClients(
    page,
    { displayName: "Correction Member", username: "correction-member" },
    ["Correction Client"],
  );

  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await signIn(memberPage, "correction-member", password);
  await expect(memberPage).toHaveURL(/\/my-time$/, { timeout: 15_000 });
  await memberPage.goto("/my-time?week=2099-07-13");

  await memberPage.getByLabel("Add a standing Client row").selectOption({ label: "Correction Client" });
  await memberPage.getByRole("button", { name: "Add row" }).click();
  await expect(memberPage.getByRole("grid", { name: "Weekly time" }).getByRole("row", { name: "Correction Client" })).toBeVisible();
  const grid = memberPage.getByRole("grid", { name: "Weekly time" });
  const cell = () => grid.getByRole("button", { name: /Correction Client, Mon 2099-07-13/ });
  const emptyCell = memberPage.getByLabel("Correction Client, Mon 2099-07-13");
  await emptyCell.fill("1:00");
  await emptyCell.press("Enter");
  await expect(cell()).toHaveText(/1:00.*B/);

  await cell().click();
  const dialog = memberPage.getByRole("dialog", { name: "Correction Client, Mon 2099-07-13 Time Entries" });
  await expect(dialog).toContainText("1 constituent record");
  await expect(dialog).toContainText("created by Correction Member");

  await dialog.getByLabel("New entry duration").fill("0:30");
  await dialog.getByLabel("New entry description").fill("Discovery");
  await dialog.locator('form').last().locator('select[name="classification"]').selectOption("non_billable");
  await dialog.locator("form").last().evaluate((form) => (form as HTMLFormElement).requestSubmit());
  await expect(cell()).toHaveText(/1:30.*B 1:00 · NB 0:30/);
  await dialog.getByRole("button", { name: "Close Time Entries" }).click();
  await cell().click();

  const reopened = memberPage.getByRole("dialog", { name: "Correction Client, Mon 2099-07-13 Time Entries" });
  const entries = reopened.locator("ol").first().locator(":scope > li");
  await expect(entries).toHaveCount(2);
  await entries.first().locator('input[name="duration"]').fill("1:30");
  await entries.first().locator('textarea[name="description"]').fill("Client workshop");
  await entries.first().locator("form").first().evaluate((form) => (form as HTMLFormElement).requestSubmit());
  await expect(cell()).toHaveText(/2:00.*B 1:30 · NB 0:30/);
  await reopened.getByRole("button", { name: "Close Time Entries" }).dispatchEvent("click");
  await cell().click();

  const corrected = memberPage.getByRole("dialog", { name: "Correction Client, Mon 2099-07-13 Time Entries" });
  await expect(corrected).toContainText("Before:");
  await expect(corrected).toContainText("After:");
  const deletedEntry = corrected.locator("ol").first().locator(":scope > li").filter({ hasText: "Discovery" });
  await deletedEntry.locator("form").nth(1).evaluate((form) => (form as HTMLFormElement).requestSubmit());
  await expect(cell()).toHaveText(/1:30.*B/);
  await corrected.getByRole("button", { name: "Close Time Entries" }).dispatchEvent("click");
  await cell().click();

  const afterDelete = memberPage.getByRole("dialog", { name: "Correction Client, Mon 2099-07-13 Time Entries" });
  await expect(afterDelete).toContainText("Deleted entry history");
  await expect(afterDelete).toContainText("Before: 2099-07-13; 30 minutes");

  const staleContext = await browser.newContext();
  const stalePage = await staleContext.newPage();
  await signIn(stalePage, "correction-member", password);
  await expect(stalePage).toHaveURL(/\/my-time$/, { timeout: 15_000 });
  await stalePage.goto("/my-time?week=2099-07-13");
  const staleCell = stalePage.getByRole("grid", { name: "Weekly time" }).getByRole("button", { name: /Correction Client, Mon 2099-07-13/ });
  await staleCell.click();
  const staleDialog = stalePage.getByRole("dialog", { name: "Correction Client, Mon 2099-07-13 Time Entries" });
  const staleEntry = staleDialog.locator("ol").first().locator(":scope > li").filter({ hasText: "Client workshop" });
  await staleEntry.locator('input[name="duration"]').fill("1:20");

  const currentEntry = afterDelete.locator("ol").first().locator(":scope > li").filter({ hasText: "Client workshop" });
  await currentEntry.locator('input[name="duration"]').fill("1:45");
  await currentEntry.locator("form").first().evaluate((form) => (form as HTMLFormElement).requestSubmit());

  await staleEntry.locator("form").first().evaluate((form) => (form as HTMLFormElement).requestSubmit());
  await expect(staleDialog).toContainText("Time changed concurrently. Reload and try again.");

  await page.goto("/administration");
  const memberAccount = page.getByRole("article", { name: "Correction Member account" });
  await memberAccount.getByRole("button", { name: "Deactivate account" }).click();
  const confirmation = page.getByRole("dialog", { name: "Deactivate Correction Member" });
  await confirmation.getByRole("button", { name: "Permanently deactivate" }).click();
  await expect(memberAccount).toContainText("Inactive");
  await page.goto("/my-time?week=2099-07-13");
  const adminCell = page.getByRole("grid", { name: "Weekly time" }).getByRole("button", { name: /Correction Client, Mon 2099-07-13/ });
  await expect(adminCell).toBeVisible();
  await adminCell.click();
  const adminDialog = page.getByRole("dialog", { name: "Correction Client, Mon 2099-07-13 Time Entries" });
  await expect(adminDialog).toContainText("Deactivated Member identity");
  const adminEntry = adminDialog.locator("ol").first().locator(":scope > li").filter({ hasText: "Client workshop" });
  await adminEntry.locator('input[name="duration"]').fill("2:00");
  await adminEntry.locator("form").first().evaluate((form) => (form as HTMLFormElement).requestSubmit());
  await expect(adminCell).toHaveText(/2:00.*B/);
  await adminEntry.locator("form").nth(1).evaluate((form) => (form as HTMLFormElement).requestSubmit());
  await expect(page.getByRole("grid", { name: "Weekly time" }).getByRole("row", { name: "Correction Client" })).toBeHidden();

  await staleContext.close();
  await memberContext.close();
});
