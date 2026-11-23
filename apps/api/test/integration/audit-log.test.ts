import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedReference } from "../../prisma/seed/seed-reference.js";
import { createApp } from "../../src/app.js";
import { getCurrentUser } from "../../src/services/audit.js";
import { resetDatabase, testPrisma } from "./helpers/db.js";
import { createEmployees } from "./helpers/fixtures.js";

const app = createApp({ corsOrigin: "http://localhost:5173", prisma: testPrisma });
const log = (query: Record<string, string> = {}) => request(app).get("/audit").query(query);
const summary = (body: {
  items: { employee: { employeeCode: string }; action: string; createdAt: string }[];
}) => body.items.map((i) => `${i.createdAt.slice(0, 10)} ${i.employee.employeeCode} ${i.action}`);

beforeAll(async () => {
  await resetDatabase();
  await seedReference(testPrisma);
  await createEmployees(testPrisma, [
    {
      employeeCode: "E00001",
      firstName: "Anna",
      lastName: "Schmidt",
      countryCode: "DE",
      jobTitle: "Software Engineer",
      level: 3,
      baseSalary: 70_000,
      targetBonus: 7_000,
    },
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
    {
      employeeCode: "E00003",
      firstName: "Mia",
      lastName: "Schmidt",
      countryCode: "US",
      jobTitle: "Product Manager",
      level: 5,
      baseSalary: 230_000,
      targetBonus: 34_500,
    },
  ]);
  const actor = await getCurrentUser(testPrisma);
  const ids = new Map((await testPrisma.employee.findMany()).map((e) => [e.employeeCode, e.id]));
  const row = (
    code: string,
    action: "CREATE" | "UPDATE" | "TERMINATE",
    createdAt: string,
    reason: string,
  ) => ({
    actorId: actor.id,
    employeeId: ids.get(code)!,
    entityType: "EMPLOYEE" as const,
    entityId: ids.get(code)!,
    action,
    changes: [{ field: "level", from: 2, to: 3 }],
    reason,
    createdAt: new Date(createdAt),
  });
  await testPrisma.auditLog.createMany({
    data: [
      row("E00001", "CREATE", "2026-01-10T09:00:00Z", "Imported from staff.csv"),
      row("E00001", "UPDATE", "2026-02-05T09:00:00Z", "Promotion"),
      row("E00002", "TERMINATE", "2026-03-20T09:00:00Z", "Resigned"),
      row("E00003", "UPDATE", "2026-03-31T23:30:00Z", "Typo"),
    ],
  });
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("GET /audit", () => {
  it("lists every change newest first, with the employee and who made it", async () => {
    const res = await log();

    expect(res.status).toBe(200);
    expect(summary(res.body)).toEqual([
      "2026-03-31 E00003 UPDATE",
      "2026-03-20 E00002 TERMINATE",
      "2026-02-05 E00001 UPDATE",
      "2026-01-10 E00001 CREATE",
    ]);
    expect(res.body.items[1]).toMatchObject({
      employee: { employeeCode: "E00002", firstName: "Ben", lastName: "Weber" },
      actor: { name: "HR Manager" },
      reason: "Resigned",
      changes: [{ field: "level", from: 2, to: 3 }],
    });
    expect(res.body).toMatchObject({ page: 1, pageSize: 50, total: 4, totalPages: 1 });
  });

  it("filters by action", async () => {
    expect(summary((await log({ action: "TERMINATE" })).body)).toEqual([
      "2026-03-20 E00002 TERMINATE",
    ]);
  });

  it("filters by period, including the whole last day", async () => {
    const res = await log({ from: "2026-02-01", to: "2026-03-31" });

    expect(summary(res.body)).toEqual([
      "2026-03-31 E00003 UPDATE", // 23:30 on the last day still counts
      "2026-03-20 E00002 TERMINATE",
      "2026-02-05 E00001 UPDATE",
    ]);
  });

  it.each([
    { search: "schmidt", expected: ["E00003", "E00001", "E00001"] },
    { search: "anna schmidt", expected: ["E00001", "E00001"] },
    { search: "e00002", expected: ["E00002"] },
    { search: "nobody", expected: [] },
  ])("finds changes for employees matching '$search'", async ({ search, expected }) => {
    const res = await log({ search });
    expect(
      res.body.items.map((i: { employee: { employeeCode: string } }) => i.employee.employeeCode),
    ).toEqual(expected);
  });

  it("pages through results", async () => {
    const res = await log({ pageSize: "3", page: "2" });

    expect(res.body).toMatchObject({ page: 2, total: 4, totalPages: 2 });
    expect(summary(res.body)).toEqual(["2026-01-10 E00001 CREATE"]);
  });

  it("rejects an invalid period", async () => {
    const res = await log({ from: "2026-03-01", to: "2026-01-01" });
    expect(res.status).toBe(400);
  });
});
