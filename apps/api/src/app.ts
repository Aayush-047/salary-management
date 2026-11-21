import cors from "cors";
import express, { type Express } from "express";
import type { Config } from "./config.js";
import { errorHandler, notFoundHandler } from "./http/errors.js";

/** Builds the Express app without listening, so tests can exercise it directly. */
export function createApp(config: Config): Express {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
