import { EmployeeListQuerySchema } from "@salary/shared";
import { Router } from "express";
import type { PrismaClient } from "../db/client.js";
import { parseOrThrow } from "../http/errors.js";
import { listEmployees } from "../services/employee-service.js";

export function employeesRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    const query = parseOrThrow(EmployeeListQuerySchema, req.query);
    res.json(await listEmployees(prisma, query));
  });

  return router;
}
