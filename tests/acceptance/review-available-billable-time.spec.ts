import { expect, test } from "@playwright/test";
import { createMemberAndClients, signIn } from "./support/workspace";

test("Administrator reviews grouped Available Billable Time without collapsing details changing selection", async ({ browser, page }) => {
  test.setTimeout(120_000);
  const password = await createMemberAndClients(
    page,
    { displayName: "Review Member", username: "review-member" },
    ["Review Client"],
  );

  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await signIn(memberPage, "review-member", password);
  await expect(memberPage).toHaveURL(/\/my-time$/, { timeout: 15_000 });

  await memberPage.goto("/my-time?week=2099-07-13");
  await memberPage.getByLabel("Add a standing Client row").selectOption({ label: "Review Client" });
  await memberPage.getByRole("button", { name: "Add row" }).click();
  const grid = memberPage.getByRole("grid", { name: "Weekly time" });
  const mondayInput = memberPage.getByLabel("Review Client, Mon 2099-07-13");
  await mondayInput.fill("1:00");
  await mondayInput.press("Enter");
  const mondayCell = grid.getByRole("button", { name: /Review Client, Mon 2099-07-13/ });
  await mondayCell.click();
  const entries = memberPage.getByRole("dialog", { name: "Review Client, Mon 2099-07-13 Time Entries" });
  const billableDescription = "Billable review description that must remain completely visible";
  await entries.locator("form").first().locator('textarea[name="description"]').fill(billableDescription);
  await entries.locator("form").first().evaluate((form) => (form as HTMLFormElement).requestSubmit());
  await entries.getByLabel("New entry duration").fill("0:30");
  await entries.getByLabel("New entry description").fill("Internal preparation");
  await entries.locator("form").last().locator('select[name="classification"]').selectOption("non_billable");
  await entries.locator("form").last().evaluate((form) => (form as HTMLFormElement).requestSubmit());
  await memberPage.goto("/my-time?week=2099-07-13");
  const tuesdayInput = memberPage.getByLabel("Review Client, Tue 2099-07-14");
  await tuesdayInput.fill("0:45");
  await tuesdayInput.press("Enter");

  await memberPage.goto("/my-time?week=2099-06-29");
  const earlierCell = memberPage.getByLabel("Review Client, Mon 2099-06-29");
  await earlierCell.fill("0:45");
  await earlierCell.press("Enter");

  await memberPage.goto("/my-time?week=2099-07-20");
  const laterCell = memberPage.getByLabel("Review Client, Mon 2099-07-20");
  await laterCell.fill("1:15");
  await laterCell.press("Enter");

  await page.goto("/invoice-bases?create=true");
  await expect(page).toHaveURL(/\/invoice-bases/);
  const setup = page.getByRole("form", { name: "Review available billable time" });
  await setup.getByLabel("Client").selectOption({ label: "Review Client" });
  await setup.getByLabel("From date").fill("2099-07-13");
  await setup.getByLabel("To date").fill("2099-07-14");
  await setup.getByRole("button", { name: "Review time" }).click();
  await page.waitForLoadState("networkidle");

  const review = page.getByRole("region", { name: "Available Billable Time review" });
  await expect(review).toContainText("2 selected · 1:45");
  await expect(review).toContainText("0 excluded · 0:00");
  await expect(review).toContainText("Non-billable context: 1 entry · 0:30");
  await expect(review).toContainText("2099-07-13 · Review Member · 0:30 · Internal preparation");
  await expect(review).toContainText("Earlier Available Billable Time: 1 entry · 0:45; oldest date 2099-06-29");
  await expect(review).toContainText("Later Available Billable Time: 1 entry · 1:15");

  const memberGroup = review.getByRole("group", { name: "Review Member available time" });
  await expect(memberGroup).toContainText("1:45 of 1:45 selected · 2 of 2 records");
  const includeAll = memberGroup.getByLabel("Include all Available Billable Time for Review Member");
  const tuesdayEntry = memberGroup.getByLabel("Include 2099-07-14, Review Member, 0:45");
  await expect(tuesdayEntry).toBeHidden();
  await memberGroup.getByRole("button", { name: "Expand Review Member" }).click();
  await expect(tuesdayEntry).toBeVisible();
  await expect(memberGroup).toContainText(billableDescription);
  await memberGroup.getByRole("button", { name: "Collapse Review Member" }).click();
  await expect(tuesdayEntry).toBeHidden();
  await expect(review).toContainText("2 selected · 1:45");
  await memberGroup.getByRole("button", { name: "Expand Review Member" }).click();

  await tuesdayEntry.click();
  await expect(memberGroup).toContainText("1:00 of 1:45 selected · 1 of 2 records");
  await expect(review).toContainText("1 selected · 1:00");
  await includeAll.click();
  await expect(memberGroup).toContainText("1:45 of 1:45 selected · 2 of 2 records");
  await includeAll.click();
  await expect(memberGroup).toContainText("0:00 of 1:45 selected · 0 of 2 records");
  await expect(review).toContainText("0 selected · 0:00");
  await expect(review).toContainText("2 excluded · 1:45");
  await expect(review.getByRole("button", { name: "Create Invoice Basis" })).toBeDisabled();
  await page.goto("/administration");
  await page.waitForLoadState("networkidle");
  const client = page.getByRole("article", { name: "Review Client Client" });
  await client.getByRole("button", { name: "Archive" }).click();
  await expect(client).toContainText("Archived");
  await page.goto("/invoice-bases?create=true");
  const archivedSetup = page.getByRole("form", { name: "Review available billable time" });
  await archivedSetup.getByLabel("Client").selectOption({ label: "Review Client (archived)" });
  await archivedSetup.getByLabel("From date").fill("2099-07-13");
  await archivedSetup.getByLabel("To date").fill("2099-07-13");
  await archivedSetup.getByRole("button", { name: "Review time" }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("region", { name: "Available Billable Time review" })).toContainText("Review Client (archived)");


  await memberPage.goto("/invoice-bases");
  await expect(memberPage).toHaveURL(/\/my-time$/);
  await memberContext.close();
});
