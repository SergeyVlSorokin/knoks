import { expect, test, type Page } from "@playwright/test";
import { createMemberAndClients, signIn } from "./support/workspace";

const week = "2099-09-14";
const date = "2099-09-14";
const capError = /A Member cannot record more than 24 hours on one date\.|Time changed concurrently\. Reload and try again\./;

async function openReview(page: Page) {
  await page.goto("/invoice-bases?create=true");
  const setup = page.getByRole("form", { name: "Review available billable time" });
  await setup.getByLabel("Client").selectOption({ label: "Concurrent Client" });
  await setup.getByLabel("From date").fill(date);
  await setup.getByLabel("To date").fill(date);
  await setup.getByRole("button", { name: "Review time" }).click();
  return page.getByRole("region", { name: "Available Billable Time review" });
}

test("independent browser sessions preserve single outcomes at the daily cap and Invoice Basis lifecycle boundaries", async ({
  browser,
  page,
}) => {
  test.setTimeout(120_000);
  const password = await createMemberAndClients(
    page,
    { displayName: "Concurrent Member", username: "concurrent-member" },
    ["Concurrent Client", "Boundary Client"],
  );
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Display name").fill("Concurrent Administrator");
  await page.getByLabel("Username", { exact: true }).fill("concurrent-administrator");
  await page.getByLabel("Role").selectOption("administrator");
  await page.getByRole("button", { name: "Create Administrator" }).click();
  const receipt = page.getByRole("dialog", { name: "Credential receipt" });
  const secondAdministratorPassword = await receipt.getByTestId("initial-password").textContent();
  expect(secondAdministratorPassword).toBeTruthy();
  await receipt.getByRole("button", { name: "Dismiss receipt" }).click();

  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await signIn(memberPage, "concurrent-member", password);
  await expect(memberPage).toHaveURL(/\/my-time$/, { timeout: 15_000 });
  await memberPage.goto(`/my-time?week=${week}`);
  await memberPage.getByLabel("Add a standing Client row").selectOption({
    label: "Concurrent Client",
  });
  await memberPage.getByRole("button", { name: "Add row" }).click();
  await expect(memberPage.getByRole("row", { name: "Concurrent Client" })).toBeVisible();

  const baseEntry = memberPage.getByLabel("Concurrent Client, Mon 2099-09-14");
  await baseEntry.fill("23:00");
  await baseEntry.press("Enter");
  await expect(baseEntry).toHaveText(/23:00.*B/);

  const secondMemberContext = await browser.newContext();
  const secondMemberPage = await secondMemberContext.newPage();
  await signIn(secondMemberPage, "concurrent-member", password);
  await expect(secondMemberPage).toHaveURL(/\/my-time$/, { timeout: 15_000 });
  await secondMemberPage.goto(`/my-time?week=${week}`);

  const firstCell = memberPage
    .getByRole("grid", { name: "Weekly time" })
    .getByRole("button", { name: /Concurrent Client, Mon 2099-09-14/ });
  const secondCell = secondMemberPage
    .getByRole("grid", { name: "Weekly time" })
    .getByRole("button", { name: /Concurrent Client, Mon 2099-09-14/ });
  await expect(secondCell).toBeVisible();
  await Promise.all([firstCell.click(), secondCell.click()]);

  const firstDialog = memberPage.getByRole("dialog", {
    name: "Concurrent Client, Mon 2099-09-14 Time Entries",
  });
  const secondDialog = secondMemberPage.getByRole("dialog", {
    name: "Concurrent Client, Mon 2099-09-14 Time Entries",
  });
  await firstDialog.getByLabel("New entry duration").fill("1:00");
  await secondDialog.getByLabel("New entry duration").fill("1:00");
  await Promise.all([
    firstDialog.locator("form").last().evaluate((form) => (form as HTMLFormElement).requestSubmit()),
    secondDialog.locator("form").last().evaluate((form) => (form as HTMLFormElement).requestSubmit()),
  ]);

  await expect
    .poll(async () => {
      const firstError = await memberPage.getByText(capError).isVisible();
      const secondError = await secondMemberPage.getByText(capError).isVisible();
      return Number(firstError) + Number(secondError);
    })
    .toBe(1);
  await memberPage.reload();
  await expect(memberPage.getByLabel("Whole week summary")).toHaveText(/24:00.*0:00.*24:00/);
  await memberPage.getByLabel("Add a standing Client row").selectOption({
    label: "Boundary Client",
  });
  await memberPage.getByRole("button", { name: "Add row" }).click();
  const overCapEntry = memberPage.getByLabel("Boundary Client, Mon 2099-09-14");
  await overCapEntry.fill("0:01");
  await overCapEntry.press("Enter");
  await expect(overCapEntry).toHaveValue("0:01");
  await expect(
    memberPage.getByText("A Member cannot record more than 24 hours on one date."),
  ).toBeVisible();
  await expect(memberPage.getByLabel("Whole week summary")).toHaveText(/24:00.*0:00.*24:00/);

  const secondAdministratorContext = await browser.newContext();
  const secondAdministratorPage = await secondAdministratorContext.newPage();
  await signIn(
    secondAdministratorPage,
    "concurrent-administrator",
    secondAdministratorPassword!,
  );
  await expect(secondAdministratorPage).toHaveURL(/\/administration$/, { timeout: 15_000 });

  const firstReview = await openReview(page);
  const secondReview = await openReview(secondAdministratorPage);
  await expect(firstReview).toContainText("2 selected · 24:00");
  await expect(secondReview).toContainText("2 selected · 24:00");
  await firstReview.getByRole("button", { name: "Create Invoice Basis" }).click();
  await expect(firstReview).toContainText("0 selected · 0:00");
  await secondReview.getByRole("button", { name: "Create Invoice Basis" }).click();
  await secondAdministratorPage.reload();
  await expect(
    secondAdministratorPage.getByRole("region", {
      name: "Available Billable Time review",
    }),
  ).toContainText("0 selected · 0:00");

  await page.goto("/invoice-bases");
  const history = page.getByRole("region", { name: "Invoice Basis History" });
  const basis = history.getByRole("link", { name: /Inspect Invoice Basis #/ });
  await expect(basis).toHaveCount(1);
  await basis.click();
  await page.waitForURL(/\/invoice-bases\/[^/]+$/);
  const basisUrl = page.url();
  const staleVoidPage = await secondAdministratorContext.newPage();
  await staleVoidPage.goto(basisUrl);
  await expect(staleVoidPage.getByLabel("Reason for voiding")).toBeVisible();

  const firstReason = page.getByLabel("Reason for voiding");
  const secondReason = staleVoidPage.getByLabel("Reason for voiding");
  await firstReason.fill("Concurrent correction");
  await secondReason.fill("Concurrent correction");
  await page.getByRole("button", { name: "Void Invoice Basis" }).click();
  await expect(page.getByText("Voided", { exact: true })).toBeVisible();
  await staleVoidPage.getByRole("button", { name: "Void Invoice Basis" }).click();
  await expect(
    staleVoidPage.getByText(
      "This Invoice Basis has already been voided. Reload to see the updated state.",
    ),
  ).toBeVisible();

  await memberPage.reload();
  await expect(memberPage.getByLabel("Concurrent Client, Mon 2099-09-14")).toHaveText(/24:00.*B/);

  await secondAdministratorContext.close();
  await secondMemberContext.close();
  await memberContext.close();
});
