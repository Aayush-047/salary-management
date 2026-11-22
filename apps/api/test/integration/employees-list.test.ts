import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedReference } from "../../prisma/seed/seed-reference.js";
import { createApp } from "../../src/app.js";
import { resetDatabase, testPrisma } from "./helpers/db.js";
import { createEmployees, type TestEmployee } from "./helpers/fixtures.js";

/*
 * Eight hand-made employees so every expected result is exact.
 * USD equivalents (base / total cash) are noted to explain the pay-sort expectations.
 */
const EMPLOYEES: TestEmployee[] = [
  // $81.2k / $89.3k
  {
    employeeCode: "E00001",
    firstName: "Anna",
    lastName: "Schmidt",
    countryCode: "DE",
    jobTitle: "Software Engineer",
    level: 3,
    baseSalary: 70_000,
    targetBonus: 7_000,
    hireDate: "2022-03-01",
  },
  // $58.0k / $62.1k
  {
    employeeCode: "E00002",
    firstName: "Ben",
    lastName: "Weber",
    countryCode: "DE",
    jobTitle: "QA Engineer",
    level: 2,
    baseSalary: 50_000,
    targetBonus: 3_500,
  },
  // $100k / $110k
  {
    employeeCode: "E00003",
    firstName: "Carla",
    lastName: "Diaz",
    countryCode: "US",
    jobTitle: "Software Engineer",
    level: 3,
    baseSalary: 100_000,
    targetBonus: 10_000,
  },
  // ¥10,000,000 ≈ $66.0k / $72.6k: largest raw number, mid-table in USD
  {
    employeeCode: "E00004",
    firstName: "Daisuke",
    lastName: "Sato",
    countryCode: "JP",
    jobTitle: "Software Engineer",
    level: 3,
    baseSalary: 10_000_000,
    targetBonus: 1_000_000,
  },
  // $79.8k / $99.0k: below Anna on base, above her on total cash
  {
    employeeCode: "E00005",
    firstName: "Emma",
    lastName: "Brown",
    countryCode: "GB",
    jobTitle: "Account Executive",
    level: 4,
    baseSalary: 60_000,
    targetBonus: 14_400,
  },
  // $11.3k / $11.9k
  {
    employeeCode: "E00006",
    firstName: "Farah",
    lastName: "Khan",
    countryCode: "IN",
    jobTitle: "Data Analyst",
    level: 1,
    baseSalary: 1_000_000,
    targetBonus: 50_000,
  },
  // terminated
  {
    employeeCode: "E00007",
    firstName: "George",
    lastName: "Hall",
    countryCode: "GB",
    jobTitle: "Recruiter",
    level: 2,
    baseSalary: 40_000,
    targetBonus: 2_800,
    terminationDate: "2025-06-30",
  },
  // $230k / $264.5k
  {
    employeeCode: "E00008",
    firstName: "Mia",
    lastName: "Schmidt",
    countryCode: "US",
    jobTitle: "Product Manager",
    level: 5,
    baseSalary: 230_000,
    targetBonus: 34_500,
  },
];

const app = createApp({ corsOrigin: "http://localhost:5173", prisma: testPrisma });

/** GET /employees and return "First Last" names in response order. */
async function names(query: Record<string, string | string[]> = {}): Promise<string[]> {
  const res = await request(app).get("/employees").query(query);
  expect(res.status).toBe(200);
  return res.body.items.map(
    (e: { firstName: string; lastName: string }) => `${e.firstName} ${e.lastName}`,
  );
}

beforeAll(async () => {
  await resetDatabase();
  await seedReference(testPrisma);
  await createEmployees(testPrisma, EMPLOYEES);
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("GET /employees defaults", () => {
  it("lists active employees sorted by last then first name", async () => {
    expect(await names()).toEqual([
      "Emma Brown",
      "Carla Diaz",
      "Farah Khan",
      "Daisuke Sato",
      "Anna Schmidt",
      "Mia Schmidt",
      "Ben Weber",
    ]);
  });

  it("returns each employee with derived fields and ISO dates", async () => {
    const res = await request(app).get("/employees").query({ search: "E00001" });

    expect(res.body.items).toEqual([
      {
        id: expect.any(Number),
        employeeCode: "E00001",
        firstName: "Anna",
        lastName: "Schmidt",
        email: "anna.schmidt@example.com",
        country: { code: "DE", name: "Germany" },
        department: "Engineering",
        jobTitle: "Software Engineer",
        level: 3,
        status: "ACTIVE",
        hireDate: "2022-03-01",
        terminationDate: null,
        baseSalary: 70_000,
        targetBonus: 7_000,
        totalCash: 77_000,
        currency: "EUR",
      },
    ]);
  });
});

describe("pagination", () => {
  it("returns the requested page with totals", async () => {
    const res = await request(app).get("/employees").query({ pageSize: "3", page: "3" });

    expect(res.body).toMatchObject({ page: 3, pageSize: 3, total: 7, totalPages: 3 });
    expect(res.body.items.map((e: { lastName: string }) => e.lastName)).toEqual(["Weber"]);
  });

  it("returns an empty page beyond the end, with the real total", async () => {
    const res = await request(app).get("/employees").query({ pageSize: "3", page: "9" });

    expect(res.body).toMatchObject({ items: [], total: 7, totalPages: 3 });
  });
});

describe("filters", () => {
  it("filters by status", async () => {
    expect(await names({ status: "TERMINATED" })).toEqual(["George Hall"]);
    expect(await names({ status: "ALL" })).toHaveLength(8);
  });

  it("filters by one or several countries", async () => {
    expect(await names({ country: "DE" })).toEqual(["Anna Schmidt", "Ben Weber"]);
    expect(await names({ country: ["DE", "GB"] })).toEqual([
      "Emma Brown",
      "Anna Schmidt",
      "Ben Weber",
    ]);
  });

  it("filters by department through the job title", async () => {
    expect(await names({ department: "Engineering" })).toEqual([
      "Carla Diaz",
      "Daisuke Sato",
      "Anna Schmidt",
      "Ben Weber",
    ]);
  });

  it("combines job title and level filters", async () => {
    expect(await names({ jobTitle: "Software Engineer", level: "3" })).toEqual([
      "Carla Diaz",
      "Daisuke Sato",
      "Anna Schmidt",
    ]);
    expect(await names({ level: ["3", "4"] })).toEqual([
      "Emma Brown",
      "Carla Diaz",
      "Daisuke Sato",
      "Anna Schmidt",
    ]);
  });
});

describe("search", () => {
  it.each([
    { search: "SCHMI", expected: ["Anna Schmidt", "Mia Schmidt"] },
    { search: "anna schmidt", expected: ["Anna Schmidt"] },
    { search: "e00003", expected: ["Carla Diaz"] },
    { search: "farah.khan@", expected: ["Farah Khan"] },
    { search: "100%", expected: [] },
  ])("'$search' matches name, email or code", async ({ search, expected }) => {
    expect(await names({ search })).toEqual(expected);
  });
});

describe("sorting", () => {
  it("sorts base salary by USD equivalent, not the raw local amount", async () => {
    expect(await names({ sortBy: "baseSalary" })).toEqual([
      "Farah Khan",
      "Ben Weber",
      "Daisuke Sato",
      "Emma Brown",
      "Anna Schmidt",
      "Carla Diaz",
      "Mia Schmidt",
    ]);
  });

  it("sorts total cash (base + bonus) by USD equivalent", async () => {
    expect(await names({ sortBy: "totalCash", sortDir: "desc" })).toEqual([
      "Mia Schmidt",
      "Carla Diaz",
      "Emma Brown",
      "Anna Schmidt",
      "Daisuke Sato",
      "Ben Weber",
      "Farah Khan",
    ]);
  });

  it("sorts by employee code descending", async () => {
    const result = await names({ sortBy: "employeeCode", sortDir: "desc" });
    expect(result[0]).toBe("Mia Schmidt");
    expect(result.at(-1)).toBe("Anna Schmidt");
  });
});

describe("invalid input", () => {
  it.each([
    { name: "pageSize above 100", query: { pageSize: "500" }, path: "pageSize" },
    { name: "level 9", query: { level: "9" }, path: "level.0" },
    { name: "an unknown sort field", query: { sortBy: "password" }, path: "sortBy" },
    { name: "an unknown status", query: { status: "GONE" }, path: "status" },
  ])("rejects $name with 400 VALIDATION_ERROR", async ({ query, path }) => {
    const res = await request(app).get("/employees").query(query);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: "VALIDATION_ERROR", message: "Invalid request" });
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path })]),
    );
  });
});
