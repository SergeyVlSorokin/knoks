import { expect, test } from "@playwright/test";
import { createMemberAndClients, signIn } from "./support/workspace";
import postgres from "postgres";

test("Administrator commits an Invoice Basis atomically, handles partial selections, and resolves concurrency conflicts", async ({ browser, page }) => {
  test.setTimeout(120_000);

  // 1. Create a Member and a Client
  const password = await createMemberAndClients(
    page,
    { displayName: "Invoice Member", username: "invoice-member" },
    ["Invoice Client"],
  );

  // 2. Member logs in and records two billable entries
  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await signIn(memberPage, "invoice-member", password);
  await expect(memberPage).toHaveURL(/\/my-time$/, { timeout: 15_000 });

  await memberPage.goto("/my-time?week=2099-07-13");
  await memberPage.getByLabel("Add a standing Client row").selectOption({ label: "Invoice Client" });
  await memberPage.getByRole("button", { name: "Add row" }).click();

  const grid = memberPage.getByRole("grid", { name: "Weekly time" });
  const mondayInput = memberPage.getByLabel("Invoice Client, Mon 2099-07-13");
  await mondayInput.fill("1:00");
  await mondayInput.press("Enter");

  const tuesdayInput = memberPage.getByLabel("Invoice Client, Tue 2099-07-14");
  await tuesdayInput.fill("2:00");
  await tuesdayInput.press("Enter");

  // Verify entries are recorded
  await expect(grid.getByRole("button", { name: /Invoice Client, Mon 2099-07-13/ })).toBeVisible();
  await expect(grid.getByRole("button", { name: /Invoice Client, Tue 2099-07-14/ })).toBeVisible();

  // 3. Administrator page 1 reviews Available Billable Time
  await page.goto("/invoice-bases");
  await expect(page).toHaveURL(/\/invoice-bases$/);
  const setup1 = page.getByRole("form", { name: "Review available billable time" });
  await setup1.getByLabel("Client").selectOption({ label: "Invoice Client" });
  await setup1.getByLabel("From date").fill("2099-07-13");
  await setup1.getByLabel("To date").fill("2099-07-14");
  await setup1.getByRole("button", { name: "Review time" }).click();
  await page.waitForLoadState("networkidle");

  const review1 = page.getByRole("region", { name: "Available Billable Time review" });
  await expect(review1).toContainText("2 selected · 3:00");

  // 4. Test "Deselect All" disables the button
  const memberGroup1 = review1.getByRole("group", { name: "Invoice Member available time" });
  const includeAll1 = memberGroup1.getByLabel("Include all Available Billable Time for Invoice Member");
  
  // By default all are selected, so clicking "Include all" deselects all.
  await includeAll1.click();
  await expect(review1).toContainText("0 selected · 0:00");
  await expect(review1.getByRole("button", { name: "Create Invoice Basis" })).toBeDisabled();

  // 5. Select only Tuesday (2:00) so Monday (1:00) is excluded
  await memberGroup1.getByRole("button", { name: "Expand Invoice Member" }).click();
  const tuesdayCheckbox1 = memberGroup1.getByLabel("Include 2099-07-14, Invoice Member, 2:00");
  await tuesdayCheckbox1.click();
  await expect(review1).toContainText("1 selected · 2:00");
  await expect(review1).toContainText("1 excluded · 1:00");

  // 6. Creating from a partial selection requires confirmation showing excluded entries count and duration
  let confirmMessage = "";
  page.once("dialog", async (dialog) => {
    confirmMessage = dialog.message();
    await dialog.accept(); // Accept creation
  });

  const createBtn1 = review1.getByRole("button", { name: "Create Invoice Basis" });
  await createBtn1.click();
  await page.waitForLoadState("networkidle");

  // Verify the dialog message states the excluded entry count and duration
  expect(confirmMessage).toContain("excludes 1 entry");
  expect(confirmMessage).toContain("1:00");

  // After successful creation, the Tuesday entry (which is now included) should be gone, and only Monday remains
  await expect(review1).toContainText("1 selected · 1:00");
  await expect(review1).toContainText("0 excluded · 0:00");
  await expect(memberGroup1).toContainText("Invoice Member");

  // 7. Verify concurrency control with a second administrator session
  // Create another admin page context
  const admin2Context = await browser.newContext();
  const admin2Page = await admin2Context.newPage();
  await signIn(admin2Page, "ada", "correct horse battery staple");
  await expect(admin2Page).toHaveURL(/\/administration$/, { timeout: 15_000 });
  await admin2Page.goto("/invoice-bases");
  const setup2 = admin2Page.getByRole("form", { name: "Review available billable time" });
  await setup2.getByLabel("Client").selectOption({ label: "Invoice Client" });
  await setup2.getByLabel("From date").fill("2099-07-13");
  await setup2.getByLabel("To date").fill("2099-07-14");
  await setup2.getByRole("button", { name: "Review time" }).click();
  await admin2Page.waitForLoadState("networkidle");

  const review2 = admin2Page.getByRole("region", { name: "Available Billable Time review" });
  // Currently, only Monday (1:00) is available (Tuesday was already committed)
  await expect(review2).toContainText("1 selected · 1:00");

  // Now, in Member session, modify or delete the Monday entry so that the Admin's view becomes stale
  await memberPage.goto("/my-time?week=2099-07-13");
  const mondayCell = grid.getByRole("button", { name: /Invoice Client, Mon 2099-07-13/ });
  await mondayCell.click();
  const entriesDialog = memberPage.getByRole("dialog", { name: "Invoice Client, Mon 2099-07-13 Time Entries" });
  // Edit Monday entry description to make version stale
  await entriesDialog.locator("form").first().locator('textarea[name="description"]').fill("Stale description");
  await entriesDialog.locator("form").first().evaluate((form) => (form as HTMLFormElement).requestSubmit());
  await memberPage.goto("/my-time?week=2099-07-13"); // Wait to persist

  // Now, Administrator 2 tries to commit Monday entry (stale)
  const createBtn2 = review2.getByRole("button", { name: "Create Invoice Basis" });
  await createBtn2.click();

  // It should fail with a reload error since the entry has a newer version in DB
  await expect(review2).toContainText("Time entries changed concurrently. Reload and try again.");

  // Clean up contexts
  await memberContext.close();
  await admin2Context.close();
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
