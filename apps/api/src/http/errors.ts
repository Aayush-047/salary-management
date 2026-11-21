import type { ErrorRequestHandler, RequestHandler } from "express";

export type ErrorBody = {
  error: { code: string; message: string; details?: unknown };
};

export const notFoundHandler: RequestHandler = (req, res) => {
  const body: ErrorBody = {
    error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.path} not found` },
  };
  res.status(404).json(body);
};

// Express identifies error handlers by their four-argument signature, so `_next` must stay.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  const body: ErrorBody = {
    error: { code: "INTERNAL", message: "Something went wrong" },
  };
  res.status(500).json(body);
};
