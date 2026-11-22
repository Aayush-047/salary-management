import {
  ChangePaySchema,
  CreateEmployeeSchema,
  RelocateSchema,
  EmployeeListQuerySchema,
  TerminateSchema,
  UpdateEmployeeSchema,
} from "@salary/shared";
import { Router } from "express";
import type { PrismaClient } from "../db/client.js";
import type { Clock } from "../domain/clock.js";
import { parseOrThrow } from "../http/errors.js";
import { changePay, relocate } from "../services/compensation-service.js";
import { getEmployeeAudit, getEmployeeDetail } from "../services/employee-detail-service.js";
import { listEmployees } from "../services/employee-service.js";
import {
  createEmployee,
  terminateEmployee,
  updateEmployee,
} from "../services/employee-write-service.js";

export function employeesRouter(prisma: PrismaClient, clock: Clock): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    const query = parseOrThrow(EmployeeListQuerySchema, req.query);
    res.json(await listEmployees(prisma, query));
  });

  router.post("/", async (req, res) => {
    const input = parseOrThrow(CreateEmployeeSchema, req.body);
    res.status(201).json(await createEmployee(prisma, clock, input));
  });

  router.get("/:code", async (req, res) => {
    res.json(await getEmployeeDetail(prisma, req.params.code));
  });

  router.patch("/:code", async (req, res) => {
    const input = parseOrThrow(UpdateEmployeeSchema, req.body);
    res.json(await updateEmployee(prisma, clock, req.params.code, input));
  });

  router.post("/:code/terminate", async (req, res) => {
    const input = parseOrThrow(TerminateSchema, req.body);
    res.json(await terminateEmployee(prisma, clock, req.params.code, input));
  });

  router.post("/:code/compensation", async (req, res) => {
    const input = parseOrThrow(ChangePaySchema, req.body);
    res.status(201).json(await changePay(prisma, clock, req.params.code, input));
  });

  router.post("/:code/relocate", async (req, res) => {
    const input = parseOrThrow(RelocateSchema, req.body);
    res.json(await relocate(prisma, clock, req.params.code, input));
  });

  router.get("/:code/audit", async (req, res) => {
    res.json(await getEmployeeAudit(prisma, req.params.code));
  });

  return router;
}
