import { OutlierQuerySchema, PayStatsQuerySchema, RecentChangesQuerySchema } from "@salary/shared";
import type { Clock } from "../domain/clock.js";
import { Router } from "express";
import type { PrismaClient } from "../db/client.js";
import { parseOrThrow } from "../http/errors.js";
import { getOutliers, getPayStats, getRecentChanges } from "../services/insights-service.js";

export function insightsRouter(prisma: PrismaClient, clock: Clock): Router {
  const router = Router();

  router.get("/pay-stats", async (req, res) => {
    const query = parseOrThrow(PayStatsQuerySchema, req.query);
    res.json(await getPayStats(prisma, query));
  });

  router.get("/outliers", async (req, res) => {
    const query = parseOrThrow(OutlierQuerySchema, req.query);
    res.json(await getOutliers(prisma, query));
  });

  router.get("/recent-changes", async (req, res) => {
    const query = parseOrThrow(RecentChangesQuerySchema, req.query);
    res.json(await getRecentChanges(prisma, clock, query));
  });

  return router;
}
