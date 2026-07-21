import { expect, test } from "@playwright/test";
import { createMemberAndClients, signIn } from "./support/workspace";
import postgres from "postgres";

test("Administrator inspects an immutable Invoice Basis with subtotals, grand totals, and rename tracking, and Member time is locked", async ({ browser, page }) => {
  test.setTimeout(120_000);

  // 1. Create a Member and a Client
  const password = await createMemberAndClients(
    page,
    { displayName: "Inspect Member", username: "inspect-member" },
    ["Inspect Client"],
  );

  // 2. Member logs in and records two billable entries with descriptions
  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await signIn(memberPage, "inspect-member", password);
  await expect(memberPage).toHaveURL(/\/my-time$/, { timeout: 15_000 });

  await memberPage.goto("/my-time?week=2099-07-13");
  await memberPage.getByLabel("Add a standing Client row").selectOption({ label: "Inspect Client" });
  await memberPage.getByRole("button", { name: "Add row" }).click();

  const grid = memberPage.getByRole("grid", { name: "Weekly time" });
  
  // Enter 1:00 on Monday 2099-07-13
  const mondayInput = memberPage.getByLabel("Inspect Client, Mon 2099-07-13");
  await mondayInput.fill("1:00");
  await mondayInput.press("Enter");

  // Add description to Monday
  const mondayCell = grid.getByRole("button", { name: /Inspect Client, Mon 2099-07-13/ });
  await mondayCell.click();
  const mondayDialog = memberPage.getByRole("dialog", { name: "Inspect Client, Mon 2099-07-13 Time Entries" });
  await mondayDialog.locator("form").first().locator('textarea[name="description"]').fill("Monday inspect description");
  await mondayDialog.locator("form").first().evaluate((form) => (form as HTMLFormElement).requestSubmit());

  // Enter 1:30 on Tuesday 2099-07-14
  await memberPage.goto("/my-time?week=2099-07-13"); // Wait for dialog to close and state to update
  const tuesdayInput = memberPage.getByLabel("Inspect Client, Tue 2099-07-14");
  await tuesdayInput.fill("1:30");
  await tuesdayInput.press("Enter");

  // Add description to Tuesday
  const tuesdayCell = grid.getByRole("button", { name: /Inspect Client, Tue 2099-07-14/ });
  await tuesdayCell.click();
  const tuesdayDialog = memberPage.getByRole("dialog", { name: "Inspect Client, Tue 2099-07-14 Time Entries" });
  await tuesdayDialog.locator("form").first().locator('textarea[name="description"]').fill("Tuesday inspect description");
  await tuesdayDialog.locator("form").first().evaluate((form) => (form as HTMLFormElement).requestSubmit());
  await memberPage.goto("/my-time?week=2099-07-13"); // Wait/persist

  // 3. Administrator reviews Available Billable Time and creates Invoice Basis
  await page.goto("/invoice-bases?create=true");
  await expect(page).toHaveURL(/\/invoice-bases/);
  const setup = page.getByRole("form", { name: "Review available billable time" });
  await setup.getByLabel("Client").selectOption({ label: "Inspect Client" });
  await setup.getByLabel("From date").fill("2099-07-13");
  await setup.getByLabel("To date").fill("2099-07-14");
  await setup.getByRole("button", { name: "Review time" }).click();
  await page.waitForLoadState("networkidle");

  const review = page.getByRole("region", { name: "Available Billable Time review" });
  await expect(review).toContainText("2 selected · 2:30");

  const createBtn = review.getByRole("button", { name: "Create Invoice Basis" });
  await createBtn.click();
  await page.waitForLoadState("networkidle");

  // 4. Verify history lists the Invoice Basis per Client
  await page.goto("/invoice-bases?create=true");
  const historySetup = page.getByRole("form", { name: "Review available billable time" });
  await historySetup.getByLabel("Client").selectOption({ label: "Inspect Client" });
  await historySetup.getByLabel("From date").fill("2099-07-13");
  await historySetup.getByLabel("To date").fill("2099-07-14");
  await historySetup.getByRole("button", { name: "Review time" }).click();
  await page.waitForLoadState("networkidle");

  const historyBlock = page.getByRole("region", { name: "Invoice Basis History" });
  await expect(historyBlock).toContainText("#1");
  await expect(historyBlock).toContainText("2099-07-13 to 2099-07-14");
  await expect(historyBlock).toContainText("Ada Admin");

  // 5. Inspect the Invoice Basis
  const inspectLink = historyBlock.getByRole("link", { name: "Inspect Invoice Basis #1" });
  await inspectLink.click();
  await page.waitForLoadState("networkidle");

  // Assert URL contains the UUID
  await expect(page).toHaveURL(/\/invoice-bases\/[0-9a-fA-F-]{36}$/);

  // Assert details on the inspection page
  await expect(page.getByRole("heading", { name: "Basis #1" })).toBeVisible();
  await expect(page.getByText("Inspect Client", { exact: true })).toBeVisible();
  await expect(page.getByText("Inclusive Swedish-local range: 2099-07-13 to 2099-07-14")).toBeVisible();
  await expect(page.getByText("Created by Ada Admin")).toBeVisible();

  // Assert original Time Entry composition
  const compositionSection = page.getByRole("region", { name: "Inspect Member composition" });
  await expect(compositionSection.getByRole("heading", { name: "Inspect Member" })).toBeVisible();
  
  // Subtotal check (Swedish decimal rounding)
  // 150 minutes = 2.5 hours. Indepedently rounded half-up: 2,50 h
  await expect(compositionSection.getByText("Subtotal: 2:30 (2,50 h)")).toBeVisible();
  
  // Individual entry verification
  await expect(compositionSection.getByText("2099-07-13")).toBeVisible();
  await expect(compositionSection.getByText("Billable").first()).toBeVisible();
  await expect(compositionSection.getByText("Monday inspect description")).toBeVisible();
  await expect(compositionSection.getByText("2099-07-14")).toBeVisible();
  await expect(compositionSection.getByText("Tuesday inspect description")).toBeVisible();

  // Grand totals verification
  await expect(page.getByText("Authoritative Total").locator("xpath=../span").last()).toHaveText("2:30");
  await expect(page.getByText("Decimal Total").locator("xpath=../span").last()).toHaveText("2,50 h");

  // 6. Test Client Rename displays current Client name while keeping ID same
  await page.goto("/administration");
  await page.waitForLoadState("networkidle");
  const clientCard = page.getByRole("article", { name: "Inspect Client Client" });
  await clientCard.getByRole("button", { name: "Rename" }).click();
  await clientCard.getByLabel("Client name").fill("Renamed Inspect Client");
  await clientCard.getByRole("button", { name: "Save name" }).click();
  await expect(clientCard.getByText("Renamed Inspect Client")).toBeVisible();

  // Go back to the inspection page by extracting the ID from URL
  const path = page.url(); // currently on /administration
  // Let's go to /invoice-bases first, then click inspect
  await page.goto("/invoice-bases?create=true");
  const renameHistorySetup = page.getByRole("form", { name: "Review available billable time" });
  await renameHistorySetup.getByLabel("Client").selectOption({ label: "Renamed Inspect Client" });
  await renameHistorySetup.getByLabel("From date").fill("2099-07-13");
  await renameHistorySetup.getByLabel("To date").fill("2099-07-14");
  await renameHistorySetup.getByRole("button", { name: "Review time" }).click();
  await page.waitForLoadState("networkidle");

  const renameHistoryBlock = page.getByRole("region", { name: "Invoice Basis History" });
  await renameHistoryBlock.getByRole("link", { name: "Inspect Invoice Basis #1" }).click();
  await page.waitForLoadState("networkidle");

  // Assert URL contains the UUID
  await expect(page).toHaveURL(/\/invoice-bases\/[0-9a-fA-F-]{36}$/);

  // Verify the new name is displayed
  await expect(page.locator("main").getByText("Renamed Inspect Client", { exact: true })).toBeVisible();
  // Ensure the old name is NOT displayed as the primary client name
  await expect(page.locator("main").getByText("Inspect Client", { exact: true })).toBeHidden();

  // 7. Included Billable Time cannot be edited or deleted while the Invoice Basis is active
  await memberPage.goto("/my-time?week=2099-07-13");
  await memberPage.waitForLoadState("networkidle");
  const memberMondayCell = memberPage.getByRole("button", { name: /Renamed Inspect Client, Mon 2099-07-13/ });
  await memberMondayCell.click();
  
  const memberMondayDialog = memberPage.getByRole("dialog", { name: "Renamed Inspect Client, Mon 2099-07-13 Time Entries" });
  await expect(memberMondayDialog.getByText("Included Billable Time is locked.")).toBeVisible();
  await expect(memberMondayDialog.getByRole("button", { name: "Save entry" })).toBeDisabled();
  await expect(memberMondayDialog.getByRole("button", { name: "Delete entry" })).toBeDisabled();

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
