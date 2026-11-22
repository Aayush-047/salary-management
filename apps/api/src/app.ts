import cors from "cors";
import express, { type Express } from "express";
import type { PrismaClient } from "./db/client.js";
import { errorHandler, notFoundHandler } from "./http/errors.js";
import { employeesRouter } from "./routes/employees.js";

export type AppDependencies = {
  corsOrigin: string;
  prisma: PrismaClient;
};

/** Builds the Express app without listening, so tests can exercise it directly. */
export function createApp({ corsOrigin, prisma }: AppDependencies): Express {
  const app = express();

  app.use(cors({ origin: corsOrigin }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.use("/employees", employeesRouter(prisma));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
