import { expect, test } from "@playwright/test";

test("reader can inspect the implemented-only Fortnox Tid comparison", async ({ page }) => {
  await page.goto("/fortnox-time-comparison");

  await expect(page.getByRole("heading", { name: "Consulting Time compared with Fortnox Tid" })).toBeVisible();
  await expect(page.getByText("Implemented behavior only", { exact: true })).toBeVisible();
  await expect(page.getByText("This page is publicly accessible by URL.", { exact: true })).toBeVisible();
  await expect(page.getByText("It is a scope review, not a parity score or roadmap.")).toBeVisible();

  const sourceLink = page.getByRole("link", { name: "Fortnox Tid source" }).first();
  await expect(sourceLink).toHaveAttribute("href", "https://www.fortnox.se/produkt/fortnox-tid");
});
