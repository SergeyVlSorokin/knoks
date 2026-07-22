import { expect, test } from "@playwright/test";
import { createMemberAndClients, signIn } from "./support/workspace";
import postgres from "postgres";

test("Administrator voids an Invoice Basis, releasing time entries for correction and preserving immutable history", async ({ browser, page }) => {
  test.setTimeout(120_000);

  // 1. Create a Member and a Client
  const password = await createMemberAndClients(
    page,
    { displayName: "Void Member", username: "void-member" },
    ["Void Client"],
  );

  // 2. Member logs in and records two billable entries with descriptions
  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await signIn(memberPage, "void-member", password);
  await expect(memberPage).toHaveURL(/\/my-time$/, { timeout: 15_000 });

  await memberPage.goto("/my-time?week=2099-08-10");
  await memberPage.getByLabel("Add a standing Client row").selectOption({ label: "Void Client" });
  await memberPage.getByRole("button", { name: "Add row" }).click();

  const grid = memberPage.getByRole("grid", { name: "Weekly time" });
  
  // Enter 2:00 on Monday 2099-08-10
  const mondayInput = memberPage.getByLabel("Void Client, Mon 2099-08-10");
  await mondayInput.fill("2:00");
  await mondayInput.press("Enter");

  // Add description to Monday
  const mondayCell = grid.getByRole("button", { name: /Void Client, Mon 2099-08-10/ });
  await mondayCell.click();
  const mondayDialog = memberPage.getByRole("dialog", { name: "Void Client, Mon 2099-08-10 Time Entries" });
  await mondayDialog.locator("form").first().locator('textarea[name="description"]').fill("Monday void description");
  await mondayDialog.locator("form").first().evaluate((form) => (form as HTMLFormElement).requestSubmit());

  // Enter 3:00 on Tuesday 2099-08-11
  await memberPage.goto("/my-time?week=2099-08-10"); // Wait/refresh
  const tuesdayInput = memberPage.getByLabel("Void Client, Tue 2099-08-11");
  await tuesdayInput.fill("3:00");
  await tuesdayInput.press("Enter");

  // Add description to Tuesday
  const tuesdayCell = grid.getByRole("button", { name: /Void Client, Tue 2099-08-11/ });
  await tuesdayCell.click();
  const tuesdayDialog = memberPage.getByRole("dialog", { name: "Void Client, Tue 2099-08-11 Time Entries" });
  await tuesdayDialog.locator("form").first().locator('textarea[name="description"]').fill("Tuesday void description");
  await tuesdayDialog.locator("form").first().evaluate((form) => (form as HTMLFormElement).requestSubmit());
  await memberPage.goto("/my-time?week=2099-08-10"); // Wait/persist

  // 3. Administrator reviews Available Billable Time and creates Invoice Basis #1
  await page.goto("/invoice-bases?create=true");
  await expect(page).toHaveURL(/\/invoice-bases/);
  const setup = page.getByRole("form", { name: "Review available billable time" });
  await setup.getByLabel("Client").selectOption({ label: "Void Client" });
  await setup.getByLabel("From date").fill("2099-08-10");
  await setup.getByLabel("To date").fill("2099-08-11");
  await setup.getByRole("button", { name: "Review time" }).click();
  await page.waitForLoadState("networkidle");

  const review = page.getByRole("region", { name: "Available Billable Time review" });
  await expect(review).toContainText("2 selected · 5:00");

  const createBtn = review.getByRole("button", { name: "Create Invoice Basis" });
  await createBtn.click();
  await page.waitForLoadState("networkidle");

  // 4. Verify in Member view that the Time Entries are locked
  await memberPage.goto("/my-time?week=2099-08-10");
  await memberPage.waitForLoadState("networkidle");
  const memberMondayCell = memberPage.getByRole("button", { name: /Void Client, Mon 2099-08-10/ });
  await memberMondayCell.click();
  const memberMondayDialog = memberPage.getByRole("dialog", { name: "Void Client, Mon 2099-08-10 Time Entries" });
  await expect(memberMondayDialog.getByText("Included Billable Time is locked.")).toBeVisible();
  await expect(memberMondayDialog.getByRole("button", { name: "Save entry" })).toBeDisabled();
  await expect(memberMondayDialog.getByRole("button", { name: "Delete entry" })).toBeDisabled();
  await memberPage.getByRole("button", { name: "Close" }).click();

  // 5. Administrator inspects Invoice Basis #1
  await page.goto("/invoice-bases");
  const historyBlock = page.getByRole("region", { name: "Invoice Basis History" });
  await expect(historyBlock).toContainText("#1");
  await historyBlock.getByRole("link", { name: "Inspect Invoice Basis #1" }).click();
  await page.waitForLoadState("networkidle");

  // Verify status is "Active"
  await expect(page.getByText("Active", { exact: true })).toBeVisible();
  
  // Verify warning message exists
  await expect(page.getByText("Warning: external correction remains the Administrator's responsibility.")).toBeVisible();

  // 6. Enter a valid non-blank reason and void the Invoice Basis
  const reasonInput = page.locator('input[name="voidReason"]');
  await reasonInput.fill("Mistake in date selection");
  const voidBtn = page.getByRole("button", { name: "Void Invoice Basis" });
  await voidBtn.click();
  await page.waitForLoadState("networkidle");

  // 7. Verify status updates to "Voided"
  await expect(page.getByText("Voided", { exact: true })).toBeVisible();
  await expect(page.getByText("Active", { exact: true })).toBeHidden();
  await expect(page.getByText("Reason: Mistake in date selection")).toBeVisible();
  await expect(page.getByText(/Voided:.*by Ada Admin/)).toBeVisible();

  // Verify the void form is now hidden
  await expect(page.getByRole("button", { name: "Void Invoice Basis" })).toBeHidden();

  // Verify sequence number (#1) and original composition items are preserved
  await expect(page.getByRole("heading", { name: "Basis #1" })).toBeVisible();
  const compositionSection = page.getByRole("region", { name: "Void Member composition" });
  await expect(compositionSection.getByText("Monday void description")).toBeVisible();
  await expect(compositionSection.getByText("Tuesday void description")).toBeVisible();

  // 8. Verify Member view: Released Time Entries are now editable again!
  await memberPage.goto("/my-time?week=2099-08-10");
  await memberPage.waitForLoadState("networkidle");
  const memberMondayCellReleased = memberPage.getByRole("button", { name: /Void Client, Mon 2099-08-10/ });
  await memberMondayCellReleased.click();
  const memberMondayDialogReleased = memberPage.getByRole("dialog", { name: "Void Client, Mon 2099-08-10 Time Entries" });
  await expect(memberMondayDialogReleased.getByText("Included Billable Time is locked.")).toBeHidden();
  await expect(memberMondayDialogReleased.getByRole("button", { name: "Save entry" })).toBeEnabled();
  await expect(memberMondayDialogReleased.getByRole("button", { name: "Delete entry" })).toBeEnabled();

  // Member edits Monday time entry to verify it is editable
  await memberMondayDialogReleased.locator("form").first().locator('textarea[name="description"]').fill("Monday corrected description");
  await memberMondayDialogReleased.locator("form").first().getByRole("button", { name: "Save entry" }).click();
  await memberPage.goto("/my-time?week=2099-08-10"); // persist/wait

  // 9. Verify Released Entries appear in Available Billable Time Review again and can be included in a subsequent Invoice Basis
  await page.goto("/invoice-bases?create=true");
  const setup2 = page.getByRole("form", { name: "Review available billable time" });
  await setup2.getByLabel("Client").selectOption({ label: "Void Client" });
  await setup2.getByLabel("From date").fill("2099-08-10");
  await setup2.getByLabel("To date").fill("2099-08-11");
  await setup2.getByRole("button", { name: "Review time" }).click();
  await page.waitForLoadState("networkidle");

  const review2 = page.getByRole("region", { name: "Available Billable Time review" });
  // Expand Void Member's entries
  await review2.getByRole("button", { name: "Expand Void Member" }).click();
  // Verify corrected description is visible in review
  await expect(review2).toContainText("Monday corrected description");

  // Create another Invoice Basis
  const createBtn2 = review2.getByRole("button", { name: "Create Invoice Basis" });
  await createBtn2.click();
  await page.waitForLoadState("networkidle");

  // Verify the new Invoice Basis has sequence number #2, proving #1 is not reused
  await page.goto("/invoice-bases");
  const historyBlock2 = page.getByRole("region", { name: "Invoice Basis History" });
  await expect(historyBlock2).toContainText("#2");
  await expect(historyBlock2).toContainText("#1"); // #1 is still listed as voided

  // Clean up contexts
  await memberContext.close();
});

test.afterAll(async () => {
  const databaseUrl = process.env.DATABASE_URL ?? "postgres://consulting_time:consulting_time@127.0.0.1:55432/consulting_time";
  const sqlClient = postgres(databaseUrl, { max: 1 });
  try {
    await sqlClient`truncate table client, invoice_basis, invoice_basis_item, time_entry, time_entry_audit cascade`;
    await sqlClient`delete from account where username != 'ada'`;
    await sqlClient`update company_workspace set next_invoice_basis_sequence = 1 where id = 1`;
  } finally {
    await sqlClient.end();
  }
});
