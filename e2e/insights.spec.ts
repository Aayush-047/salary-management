import { expect, test, type Page } from "@playwright/test";

/*
 * Read-only checks of the Insights page and the currency selector against the deterministic
 * seed (seed 42, 10,000 employees), so exact numbers can be asserted. Runs in the "read-only"
 * project, before the HR journey changes any data.
 */

/** A summary tile by its label (scoped to the tile grid: labels like "Below peers" also appear in controls). */
const tile = (page: Page, label: string) =>
  page
    .locator(".mantine-SimpleGrid-root .mantine-Paper-root", {
      has: page.getByText(label, { exact: true }),
    })
    .first();

test("pay explorer summarises the organisation and breaks it down", async ({ page }) => {
  await page.goto("/insights");

  await expect(tile(page, "Employees")).toContainText("9,436");
  await expect(page.getByRole("table", { name: "Pay statistics" }).locator("tbody tr")).toHaveCount(
    7,
  );
  await expect(page.getByText("Each country in its own currency")).toBeVisible();

  await page.locator("label", { hasText: /^Level$/ }).click();
  await expect(page).toHaveURL(/groupBy=level/);
  const levels = page
    .getByRole("table", { name: "Pay statistics" })
    .locator("tbody tr td:first-child");
  await expect(levels).toHaveText(["L1", "L2", "L3", "L4", "L5", "L6"]);
});

test("outliers finds the people paid far from their peers, and Back returns to them", async ({
  page,
}) => {
  await page.goto("/insights?tab=outliers");

  await expect(tile(page, "Below peers")).toContainText("105");
  await expect(tile(page, "Above peers")).toContainText("102");
  await expect(tile(page, "Not compared")).toContainText("338");
  const outlierUrl = page.url();

  await page.getByRole("table", { name: "Pay outliers" }).locator("tbody tr a").first().click();
  await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
  await page.getByRole("link", { name: "Back to outliers" }).click();
  await expect(page).toHaveURL(outlierUrl);
});

test("recent changes keeps both dates when they are set one after the other", async ({ page }) => {
  await page.goto("/insights?tab=changes");
  await expect(page.getByRole("table", { name: "Largest raises" })).toBeVisible();

  // No pause between the two: a past bug made the second change drop the first.
  await page.getByLabel("From").fill("2026-01-01");
  await page.getByLabel("To").fill("2026-03-31");

  await expect(page).toHaveURL(/from=2026-01-01&to=2026-03-31/);
  await expect(tile(page, "Pay changes")).toContainText("600");
  await expect(page.getByText("Period 2026-01-01 to 2026-03-31")).toBeVisible();
});

test("the currency selector converts amounts and shows the original on hover", async ({ page }) => {
  await page.goto("/employees?country=DE&sortBy=totalCash&sortDir=desc");
  const firstBase = page.locator("table tbody tr").first().locator("td").nth(5);
  await expect(firstBase).toHaveText("€195,200");

  await page.getByRole("combobox", { name: "Display currency" }).click();
  await page.getByRole("option", { name: "Show in USD" }).click();

  await expect(firstBase).toHaveText("≈ $226,432");
  await firstBase.locator("span").hover();
  await expect(page.getByRole("tooltip")).toHaveText("€195,200 (local)");
});
