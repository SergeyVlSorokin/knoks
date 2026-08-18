import { expect, test } from "@playwright/test";

test("reader can explore the Fortnox handoff plan", async ({ page }) => {
  await page.goto("/fortnox-handoff-plan");

  await expect(page.getByRole("heading", { name: "How time becomes an invoice draft or payroll transaction" })).toBeVisible();
  await expect(page.getByText("A click-to-explore explanation of the planned direct handoff.", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Invoice draft flow" }).click();
  await expect(page.getByRole("heading", { name: "Invoice draft flow" })).toBeVisible();
  await expect(page.getByText("Send one aggregate invoice basis", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Setup & boundaries" }).click();
  await page.getByText("What happens when a handoff cannot proceed?", { exact: true }).click();
  await expect(page.getByText("uncertain outcomes are reconciled before retrying", { exact: false })).toBeVisible();
});
