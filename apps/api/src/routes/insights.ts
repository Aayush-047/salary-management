import { OutlierQuerySchema, PayStatsQuerySchema } from "@salary/shared";
import { Router } from "express";
import type { PrismaClient } from "../db/client.js";
import { parseOrThrow } from "../http/errors.js";
import { getOutliers, getPayStats } from "../services/insights-service.js";

export function insightsRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get("/pay-stats", async (req, res) => {
    const query = parseOrThrow(PayStatsQuerySchema, req.query);
    res.json(await getPayStats(prisma, query));
  });

  router.get("/outliers", async (req, res) => {
    const query = parseOrThrow(OutlierQuerySchema, req.query);
    res.json(await getOutliers(prisma, query));
  });

  return router;
}
