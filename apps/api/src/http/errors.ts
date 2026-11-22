import type { ErrorRequestHandler, RequestHandler } from "express";
import type { z } from "zod";

export type ErrorBody = {
  error: { code: string; message: string; details?: unknown };
};

/** An error with an HTTP status and a stable machine-readable code, safe to show to clients. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** Parses input with a zod schema, throwing a 400 VALIDATION_ERROR listing every problem. */
export function parseOrThrow<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid request", details);
  }
  return result.data;
}

export const notFoundHandler: RequestHandler = (req, res) => {
  const body: ErrorBody = {
    error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.path} not found` },
  };
  res.status(404).json(body);
};

/** express.json() marks malformed bodies with this type. */
function isJsonParseError(err: unknown): boolean {
  return (
    typeof err === "object" && err !== null && "type" in err && err.type === "entity.parse.failed"
  );
}

// Express identifies error handlers by their four-argument signature, so `_next` must stay.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    const body: ErrorBody = { error: { code: err.code, message: err.message } };
    if (err.details !== undefined) body.error.details = err.details;
    res.status(err.status).json(body);
    return;
  }
  if (isJsonParseError(err)) {
    const body: ErrorBody = { error: { code: "INVALID_JSON", message: "Malformed JSON body" } };
    res.status(400).json(body);
    return;
  }
  console.error(err);
  const body: ErrorBody = {
    error: { code: "INTERNAL", message: "Something went wrong" },
  };
  res.status(500).json(body);
};
