import { AuditLogQuerySchema } from "@salary/shared";
import { Router } from "express";
import type { PrismaClient } from "../db/client.js";
import { parseOrThrow } from "../http/errors.js";
import { getAuditLog } from "../services/audit-log-service.js";

export function auditRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    const query = parseOrThrow(AuditLogQuerySchema, req.query);
    res.json(await getAuditLog(prisma, query));
  });

  return router;
}
