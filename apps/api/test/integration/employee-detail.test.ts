import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedReference } from "../../prisma/seed/seed-reference.js";
import { createApp } from "../../src/app.js";
import { getCurrentUser } from "../../src/services/audit.js";
import { resetDatabase, testPrisma } from "./helpers/db.js";
import { createEmployees } from "./helpers/fixtures.js";

const app = createApp({ corsOrigin: "http://localhost:5173", prisma: testPrisma });

beforeAll(async () => {
  await resetDatabase();
  await seedReference(testPrisma);
  // Anna moved from Germany to the UK; her stored current pay matches the latest entry.
  await createEmployees(testPrisma, [
    {
      employeeCode: "E00001",
      firstName: "Anna",
      lastName: "Schmidt",
      countryCode: "GB",
      jobTitle: "Software Engineer",
      level: 4,
      baseSalary: 68_000,
      targetBonus: 8_160,
      hireDate: "2022-03-01",
    },
  ]);
  const anna = await testPrisma.employee.findUniqueOrThrow({ where: { employeeCode: "E00001" } });
  await testPrisma.compensationEntry.createMany({
    data: [
      {
        employeeId: anna.id,
        effectiveDate: new Date("2022-03-01"),
        baseSalary: 70_000,
        targetBonus: 7_000,
        currency: "EUR",
        reason: "HIRE",
      },
      {
        employeeId: anna.id,
        effectiveDate: new Date("2023-04-01"),
        baseSalary: 77_000,
        targetBonus: 9_240,
        currency: "EUR",
        reason: "PROMOTION",
        note: "Promoted to L4",
      },
      {
        employeeId: anna.id,
        effectiveDate: new Date("2024-06-01"),
        baseSalary: 68_000,
        targetBonus: 8_160,
        currency: "GBP",
        reason: "MARKET_ADJUSTMENT",
      },
    ],
  });

  const actor = await getCurrentUser(testPrisma);
  const audit = (createdAt: string, field: string, from: string, to: string, reason: string) => ({
    actorId: actor.id,
    employeeId: anna.id,
    entityType: "EMPLOYEE" as const,
    entityId: anna.id,
    action: "UPDATE" as const,
    changes: [{ field, from, to }],
    reason,
    createdAt: new Date(createdAt),
  });
  await testPrisma.auditLog.createMany({
    data: [
      audit("2026-10-01T09:00:00Z", "lastName", "Schmid", "Schmidt", "Typo in surname"),
      audit(
        "2026-10-15T09:00:00Z",
        "email",
        "anna@example.com",
        "anna.schmidt@example.com",
        "New email",
      ),
    ],
  });
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("GET /employees/:code", () => {
  it("returns the profile, current pay and the timeline newest first", async () => {
    const res = await request(app).get("/employees/E00001");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      employeeCode: "E00001",
      firstName: "Anna",
      country: { code: "GB", name: "United Kingdom" },
      department: "Engineering",
      jobTitle: "Software Engineer",
      level: 4,
      status: "ACTIVE",
      hireDate: "2022-03-01",
      baseSalary: 68_000,
      targetBonus: 8_160,
      totalCash: 76_160,
      currency: "GBP",
    });
    expect(
      res.body.compensation.map((e: Record<string, unknown>) => [
        e.effectiveDate,
        e.reason,
        e.currency,
        e.baseChangePct,
      ]),
    ).toEqual([
      ["2024-06-01", "MARKET_ADJUSTMENT", "GBP", null], // currency changed: no %
      ["2023-04-01", "PROMOTION", "EUR", 0.1],
      ["2022-03-01", "HIRE", "EUR", null],
    ]);
    expect(res.body.compensation[1].note).toBe("Promoted to L4");
  });

  it("accepts a lower-case code", async () => {
    const res = await request(app).get("/employees/e00001");
    expect(res.status).toBe(200);
    expect(res.body.employeeCode).toBe("E00001");
  });

  it("returns 404 with a clear message for an unknown code", async () => {
    const res = await request(app).get("/employees/E99999");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: "EMPLOYEE_NOT_FOUND", message: "Employee E99999 not found" },
    });
  });
});

describe("GET /employees/:code/audit", () => {
  it("returns the audit history newest first, with who and why", async () => {
    const res = await request(app).get("/employees/E00001/audit");

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([
      expect.objectContaining({
        createdAt: "2026-10-15T09:00:00.000Z",
        actor: { id: expect.any(Number), name: "HR Manager" },
        action: "UPDATE",
        changes: [{ field: "email", from: "anna@example.com", to: "anna.schmidt@example.com" }],
        reason: "New email",
      }),
      expect.objectContaining({
        createdAt: "2026-10-01T09:00:00.000Z",
        changes: [{ field: "lastName", from: "Schmid", to: "Schmidt" }],
        reason: "Typo in surname",
      }),
    ]);
  });

  it("returns 404 for an unknown code", async () => {
    expect((await request(app).get("/employees/E99999/audit")).status).toBe(404);
  });
});
