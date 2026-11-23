import { MAX_IMPORT_BYTES } from "@salary/shared";
import express, { Router, type Request } from "express";
import { z } from "zod";
import type { PrismaClient } from "../db/client.js";
import type { Clock } from "../domain/clock.js";
import { HttpError, parseOrThrow } from "../http/errors.js";
import { checkImport, importEmployees } from "../services/import-service.js";

/** The CSV is the raw request body (any content type), up to the size limit. */
const csvBody = express.text({ type: () => true, limit: MAX_IMPORT_BYTES });

const FilenameSchema = z.object({
  filename: z.string().trim().min(1).max(200).default("upload.csv"),
});

function readUpload(req: Request): { text: string; filename: string } {
  if (typeof req.body !== "string") {
    throw new HttpError(400, "NO_FILE", "Send the CSV file as the request body");
  }
  return { text: req.body, filename: parseOrThrow(FilenameSchema, req.query).filename };
}

export function importsRouter(prisma: PrismaClient, clock: Clock): Router {
  const router = Router();

  /** Checks a file and reports every problem; saves nothing. */
  router.post("/employees/check", csvBody, async (req, res) => {
    const { text, filename } = readUpload(req);
    res.json(await checkImport(prisma, clock, text, filename));
  });

  /** Imports every row or none (re-checks the file first). */
  router.post("/employees", csvBody, async (req, res) => {
    const { text, filename } = readUpload(req);
    res.status(201).json(await importEmployees(prisma, clock, text, filename));
  });

  return router;
}
