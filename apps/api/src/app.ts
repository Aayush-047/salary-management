import cors from "cors";
import express, { type Express } from "express";
import type { PrismaClient } from "./db/client.js";
import { systemClock, type Clock } from "./domain/clock.js";
import { errorHandler, notFoundHandler } from "./http/errors.js";
import { compensationRouter } from "./routes/compensation.js";
import { employeesRouter } from "./routes/employees.js";
import { insightsRouter } from "./routes/insights.js";
import { metaRouter } from "./routes/meta.js";

export type AppDependencies = {
  corsOrigin: string;
  prisma: PrismaClient;
  /** Source of "today" for date rules; tests pass a fixed clock. */
  clock?: Clock;
};

/** Builds the Express app without listening, so tests can exercise it directly. */
export function createApp({ corsOrigin, prisma, clock = systemClock }: AppDependencies): Express {
  const app = express();

  app.use(cors({ origin: corsOrigin }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.use("/employees", employeesRouter(prisma, clock));
  app.use("/compensation", compensationRouter(prisma, clock));
  app.use("/meta", metaRouter(prisma));
  app.use("/insights", insightsRouter(prisma));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
