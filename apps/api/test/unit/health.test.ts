import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import type { PrismaClient } from "../../src/db/client.js";

// These routes never touch the database, so an empty stand-in client is enough.
const app = createApp({ corsOrigin: "http://localhost:5173", prisma: {} as PrismaClient });

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("unknown routes", () => {
  it("return 404 with the standard error shape", async () => {
    const res = await request(app).get("/does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: "NOT_FOUND", message: "Route GET /does-not-exist not found" },
    });
  });
});

describe("malformed JSON bodies", () => {
  it("return 400 INVALID_JSON instead of a 500", async () => {
    const res = await request(app)
      .post("/employees")
      .set("Content-Type", "application/json")
      .send("{not json");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { code: "INVALID_JSON", message: "Malformed JSON body" } });
  });
});
