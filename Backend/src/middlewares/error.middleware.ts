
import type {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from "express";

import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

// =====================================
// Helpers
// =====================================

function isValidHttpErrorStatus(
  status: unknown
): status is number {
  return (
    typeof status === "number" &&
    Number.isInteger(status) &&
    status >= 400 &&
    status <= 599
  );
}

function getErrorMessage(
  error: unknown
): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

// =====================================
// Global Error Handler
// =====================================

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // If response headers have already been sent,
  // delegate to Express default error handler.
  if (res.headersSent) {
    next(err);
    return;
  }

  const isProduction =
    process.env.NODE_ENV === "production";

  // ApiError represents an intentional
  // application error with a safe message.
  const isApiError = err instanceof ApiError;

  const statusCode = isApiError
    ? err.statusCode
    : 500;

  const safeStatusCode =
    isValidHttpErrorStatus(statusCode)
      ? statusCode
      : 500;

  // Do not expose internal errors in production.
  const message = isApiError
    ? err.message
    : isProduction
      ? "Internal Server Error"
      : getErrorMessage(err);

  const errors = isApiError
    ? err.errors
    : [];

  // Log the original error on the backend.
  // Avoid logging cookies, authorization
  // headers, passwords or request bodies.
  logger.error(
    {
      err,
      method: req.method,
      path: req.path,
      statusCode: safeStatusCode,
    },
    "❌ MeetTools API request failed"
  );

  // Return a consistent JSON response.
  res.status(safeStatusCode).json({
    success: false,
    message,
    errors,

    ...(!isProduction && err instanceof Error
      ? { stack: err.stack }
      : {}),
  });
};
