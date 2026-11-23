import { expect, test } from "@playwright/test";

/*
 * CSV import through the UI. It writes data, so it runs in the "actions" project after the
 * read-only checks; employee codes depend on what ran before, so they are not asserted.
 */
const HEADER = "firstName,lastName,email,country,jobTitle,level,hireDate,baseSalary,targetBonus";
const csvFile = (name: string, rows: string[]) => ({
  name,
  mimeType: "text/csv",
  buffer: Buffer.from(`${[HEADER, ...rows].join("\n")}\n`),
});

test("shows every problem and imports nothing until the file is fixed", async ({ page }) => {
  await page.goto("/import");
  await expect(page.getByText("All or nothing:")).toBeVisible();

  await page
    .locator('input[type="file"]')
    .setInputFiles(
      csvFile("with-problems.csv", [
        "Ivo,Marek,ivo.e2e@example.com,DE,Data Scientist,3,2026-01-15,78.000,7800",
        "Anna,Neumann,anna.neumann@example.com,DE,Software Engineer,3,2023-09-25,58600,4100",
      ]),
    );

  const problems = page.getByRole("table", { name: "Import problems" });
  await expect(problems.locator("tbody tr")).toHaveText([
    /2\s*baseSalary\s*Use a whole number without dots/,
    /3\s*email\s*Already in the system as E\d{5}/,
  ]);
  await expect(page.getByText("nothing will be imported yet")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Import \d/ })).toHaveCount(0);
});

test("imports a valid file in one go and shows the new employees", async ({ page }) => {
  await page.goto("/import");
  await page
    .locator('input[type="file"]')
    .setInputFiles(
      csvFile("new-starters.csv", [
        "Ivo,Marek,ivo.e2e@example.com,DE,Data Scientist,3,2026-01-15,78000,7800",
        'Zoe,Quinn,zoe.e2e@example.com,US,Product Manager,4,2025-06-01,"152,000",22800',
      ]),
    );

  await expect(page.getByText("new-starters.csv is ready to import")).toBeVisible();
  await expect(page.getByText("2 employees: 1 in Germany and 1 in United States")).toBeVisible();
  await page.getByRole("button", { name: "Import 2 employees" }).click();

  await expect(page.getByText(/^Imported 2 employees$/).first()).toBeVisible();
  await page.getByRole("link", { name: "View the new employees" }).click();

  const newest = page.locator("table tbody tr");
  await expect(newest.nth(0)).toContainText("Zoe Quinn");
  await expect(newest.nth(1)).toContainText("Ivo Marek");
});
