import { expect, test, type Page } from "@playwright/test";

/*
 * An HR journey through the UI: add an employee, promote them, correct a mistake, then record
 * that they left. The steps build on each other, so they run in order; this project runs after
 * the read-only list tests (see playwright.config.ts) so its writes can't change their counts.
 */
test.describe.configure({ mode: "serial" });

let page: Page;
let detailUrl: string;

const dialog = () => page.getByRole("dialog");
const field = (label: string) =>
  dialog()
    .getByLabel(new RegExp(`^${label}`))
    .first();
async function choose(label: string, option: string) {
  await field(label).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
const toast = (text: string | RegExp) =>
  page.locator(".mantine-Notification-root", { hasText: text });
const changeHistory = () => page.getByText("Change history").locator("xpath=../..");

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
});

test.afterAll(async () => {
  await page.close();
});

test("explains missing fields in plain words before anything is sent", async () => {
  await page.goto("/employees");
  await page.getByRole("button", { name: "Add employee" }).click();
  await dialog().getByRole("button", { name: "Add employee" }).click();

  await expect(dialog().getByText("Required")).toHaveCount(2); // first and last name
  await expect(dialog().getByText("Choose a country")).toBeVisible();
  await expect(dialog().getByText("Enter an amount", { exact: true })).toBeVisible();

  await dialog().getByRole("button", { name: "Cancel" }).click();
  await expect(dialog()).toBeHidden();
});

test("adds an employee and opens their page", async () => {
  await page.getByRole("button", { name: "Add employee" }).click();
  await field("First name").fill("Lena");
  await field("Last name").fill("Fischer");
  await field("Email").fill("lena.fischer.e2e@example.com");
  await choose("Country", "Germany");
  await choose("Job title", "Data Scientist");
  await choose("Level", "L3");
  await field("Hire date").fill("2025-01-15");
  await field("Base salary").fill("78000");
  await field("Target bonus").fill("7800");
  await dialog().getByRole("button", { name: "Add employee" }).click();

  await expect(page).toHaveURL(/\/employees\/E10001$/);
  await expect(toast("Lena Fischer added as E10001")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lena Fischer" })).toBeVisible();
  await expect(page.getByText("€78,000").first()).toBeVisible();
  await expect(changeHistory().getByText("Employee created")).toBeVisible();
  detailUrl = page.url();
});

test("records a promotion with a new level and pay in one step", async () => {
  await page.getByRole("button", { name: "Change pay" }).click();
  await choose("Reason", "Promotion");
  await choose("New level", "L4");
  await field("Effective date").fill("2026-01-01");
  await field("New base salary").fill("86000");
  await field("New target bonus").fill("10300");
  await expect(dialog().getByText("+10.3% vs current")).toBeVisible();
  await dialog().getByRole("button", { name: "Record promotion" }).click();

  await expect(toast("Promotion recorded")).toBeVisible();
  await expect(page.getByText("Data Scientist · L4 · Data · Germany")).toBeVisible();
  await expect(changeHistory().getByText("Promoted")).toBeVisible();
});

test("shows a broken business rule inside the form, then saves a valid correction", async () => {
  await page.getByRole("button", { name: "Correct the 2026-01-01 entry" }).click();
  await field("Effective date").fill("2024-12-31");
  await field("What was wrong").fill("Wrong date");
  await dialog().getByRole("button", { name: "Save correction" }).click();
  await expect(dialog().getByText("is before the hire date 2025-01-15")).toBeVisible();

  await field("Effective date").fill("2026-01-01");
  await field("Base salary").fill("86500");
  await field("What was wrong").fill("Offer letter said 86,500");
  await dialog().getByRole("button", { name: "Save correction" }).click();

  await expect(toast("Pay entry corrected")).toBeVisible();
  await expect(page.getByText("€86,500").first()).toBeVisible();
  const correction = changeHistory().getByText("Pay entry corrected").locator("xpath=../..");
  await expect(correction).toContainText("Offer letter said 86,500");
  await expect(correction).toContainText("86,000");
  await expect(correction).toContainText("86,500");
});

test("records that the employee left and makes the profile read-only", async () => {
  await page.getByRole("button", { name: "Terminate" }).click();
  await field("Last day").fill("2026-06-30");
  await field("Reason").fill("Resigned");
  await dialog().getByRole("button", { name: "Mark as left" }).click();

  await expect(toast(/marked as left/)).toBeVisible();
  await expect(page.getByText("Left 2026-06-30")).toBeVisible();
  await expect(page.getByRole("button", { name: "Change pay" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Correct the / })).toHaveCount(2);

  // A reload proves it was saved, not just shown.
  await page.goto(detailUrl);
  await expect(page.getByText("Left 2026-06-30")).toBeVisible();
});

test("the organisation-wide audit log shows the journey's changes and filters them", async () => {
  await page.goto("/audit");
  const lena = page.locator(".mantine-Paper-root", { hasText: "Lena Fischer" });
  // Created, promoted, corrected and left: four changes for her.
  await expect(lena).toHaveCount(4);

  await page.locator("label", { hasText: /^Left$/ }).click();
  await expect(page).toHaveURL(/action=TERMINATE/);
  await expect(lena).toHaveCount(1);
  await expect(lena).toContainText("Left the company");
  await expect(lena).toContainText("Resigned");
});
