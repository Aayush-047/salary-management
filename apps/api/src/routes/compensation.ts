import { CorrectCompensationSchema } from "@salary/shared";
import { Router } from "express";
import { z } from "zod";
import type { PrismaClient } from "../db/client.js";
import type { Clock } from "../domain/clock.js";
import { parseOrThrow } from "../http/errors.js";
import { correctCompensation } from "../services/compensation-service.js";

const EntryIdSchema = z.coerce.number().int().positive();

export function compensationRouter(prisma: PrismaClient, clock: Clock): Router {
  const router = Router();

  router.patch("/:id", async (req, res) => {
    const id = parseOrThrow(EntryIdSchema, req.params.id);
    const input = parseOrThrow(CorrectCompensationSchema, req.body);
    res.json(await correctCompensation(prisma, clock, id, input));
  });

  return router;
}
