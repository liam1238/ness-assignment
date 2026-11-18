import type { ErrorRequestHandler } from "express";
import { AppError } from "../domain/errors";

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof AppError) {
    const body: { error: { code: string; message: string; details?: unknown } } =
      {
        error: {
          code: err.code,
          message: err.message,
        },
      };
    if (err.details && err.details.length > 0) {
      body.error.details = err.details;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  if (err && typeof err === "object" && "type" in err && err.type === "entity.parse.failed") {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: [{ field: "body", message: "Malformed JSON" }],
      },
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    },
  });
};