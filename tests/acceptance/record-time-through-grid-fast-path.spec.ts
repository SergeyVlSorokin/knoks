import { expect, test } from "@playwright/test";
import { createMemberAndClients, signIn } from "./support/workspace";

async function addRows(page: import("@playwright/test").Page) {
  for (const client of ["Fast Path Northwind", "Fast Path Contoso"]) {
    await page.getByLabel("Add a standing Client row").selectOption({ label: client });
    await page.getByRole("button", { name: "Add row" }).click();
    await expect(page.getByRole("grid", { name: "Weekly time" }).getByRole("row", { name: client })).toBeVisible();
  }
}

test("Member records exact time in the weekly grid and keeps spreadsheet traversal", async ({
  browser,
  page,
}) => {
  test.setTimeout(90_000);
  const password = await createMemberAndClients(
    page,
    { displayName: "Grid Fast Path Member", username: "grid-fast-path-member" },
    ["Fast Path Northwind", "Fast Path Contoso"],
  );
  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await signIn(memberPage, "grid-fast-path-member", password);
  await expect(memberPage).toHaveURL(/\/my-time$/, { timeout: 15_000 });
  await memberPage.goto("/my-time?week=2099-07-13");
  await addRows(memberPage);

  const emptyContosoMonday = memberPage.getByLabel(
    "Fast Path Contoso, Mon 2099-07-13",
  );
  await emptyContosoMonday.focus();
  await emptyContosoMonday.press("Tab");
  await expect(
    memberPage.getByLabel("Fast Path Contoso, Tue 2099-07-14"),
  ).toBeFocused();
  await memberPage.getByLabel("Fast Path Contoso, Tue 2099-07-14").press("Shift+Tab");
  await emptyContosoMonday.press("Enter");
  await expect(
    memberPage.getByLabel("Fast Path Northwind, Mon 2099-07-13"),
  ).toBeFocused();
  await expect(
    memberPage.getByText("Use a positive duration that resolves to exact whole minutes."),
  ).toBeHidden();

  const contosoMonday = memberPage.getByLabel("Fast Path Contoso, Mon 2099-07-13");
  await contosoMonday.fill("1:30");
  await contosoMonday.press("Enter");
  await expect(contosoMonday).toHaveText(/1:30.*B/);
  await expect(memberPage.getByLabel("Fast Path Northwind, Mon 2099-07-13")).toBeFocused();

  const northwindMonday = memberPage.getByLabel("Fast Path Northwind, Mon 2099-07-13");
  await northwindMonday.fill("0:30");
  await northwindMonday.press("Tab");
  await expect(memberPage.getByLabel("Fast Path Northwind, Tue 2099-07-14")).toBeFocused();

  const northwindTuesday = memberPage.getByLabel("Fast Path Northwind, Tue 2099-07-14");
  await northwindTuesday.fill("1,5");
  await northwindTuesday.press("Shift+Enter");
  await expect(memberPage.getByLabel("Fast Path Contoso, Tue 2099-07-14")).toBeFocused();

  const invalid = memberPage.getByLabel("Fast Path Contoso, Tue 2099-07-14");
  await invalid.fill("1,333");
  await invalid.press("Tab");
  await expect(invalid).toHaveValue("1,333");
  await expect(invalid).toBeFocused();
  await expect(memberPage.getByText("Use a positive duration that resolves to exact whole minutes.")).toBeVisible();

  for (const value of ["0", "-1:00", "not-time"]) {
    await invalid.fill(value);
    await invalid.press("Enter");
    await expect(invalid).toHaveValue(value);
    await expect(memberPage.getByText("Use a positive duration that resolves to exact whole minutes.")).toBeVisible();
  }

  await invalid.fill("0,5");
  await invalid.press("Shift+Tab");
  await expect(contosoMonday).toBeFocused();

  // Test saving on blur
  const northwindWednesday = memberPage.getByLabel("Fast Path Northwind, Wed 2099-07-15");
  await northwindWednesday.fill("2:15");
  // Click on the heading to blur the input and trigger save
  await memberPage.getByRole("heading", { name: "My time" }).click();
  await expect(northwindWednesday).toHaveText(/2:15.*B/);

  await expect(memberPage.getByLabel("Fast Path Northwind week summary")).toHaveText(
    /4:15.*0:00.*4:15/,
  );
  await expect(memberPage.getByLabel("Mon 2099-07-13 summary")).toHaveText(
    /2:00.*0:00.*2:00/,
  );
  await expect(memberPage.getByLabel("Whole week summary")).toHaveText(
    /6:15.*0:00.*6:15/,
  );

  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  await signIn(secondPage, "grid-fast-path-member", password);
  await expect(secondPage).toHaveURL(/\/my-time$/, { timeout: 15_000 });
  await secondPage.goto("/my-time?week=2099-07-13");

  const firstDuplicate = memberPage.getByLabel("Fast Path Northwind, Sun 2099-07-19");
  const secondDuplicate = secondPage.getByLabel("Fast Path Northwind, Sun 2099-07-19");
  await firstDuplicate.fill("1:00");
  await secondDuplicate.fill("1:00");
  await firstDuplicate.press("Enter");
  await expect(firstDuplicate).toHaveText(/1:00.*B/);
  await secondDuplicate.press("Enter");
  await expect(secondDuplicate).toHaveText(/2:00.*B/);
  await memberPage.reload();
  await expect(memberPage.getByLabel("Fast Path Northwind, Sun 2099-07-19")).toHaveText(
    /2:00.*B/,
  );

  await secondContext.close();
  await memberContext.close();
});
