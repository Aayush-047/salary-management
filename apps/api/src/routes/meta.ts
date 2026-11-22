import { Router } from "express";
import type { PrismaClient } from "../db/client.js";
import { getMeta } from "../services/meta-service.js";

/** Reference data changes rarely, so browsers may reuse it for a few minutes. */
const CACHE_SECONDS = 300;

export function metaRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    res.set("Cache-Control", `public, max-age=${CACHE_SECONDS}`);
    res.json(await getMeta(prisma));
  });

  return router;
}
