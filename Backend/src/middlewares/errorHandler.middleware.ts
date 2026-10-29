
import type {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from "express";

import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";
import { STATUS_CODES } from "../utils/statusCodes.js";

// =====================================
// Global Error Handler
// =====================================

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Response already started ho chuka ho
  // to Express ko error handle karne dein.
  if (res.headersSent) {
    next(err);
    return;
  }

  const isProduction =
    process.env.NODE_ENV === "production";

  const isApiError = err instanceof ApiError;

  // Known ApiError ka status preserve karein.
  // Unknown errors ko 500 return karein.
  const statusCode = isApiError
    ? err.statusCode
    : STATUS_CODES.INTERNAL_SERVER_ERROR;

  const safeStatusCode =
    Number.isInteger(statusCode) &&
    statusCode >= 400 &&
    statusCode <= 599
      ? statusCode
      : STATUS_CODES.INTERNAL_SERVER_ERROR;

  // Production mein unexpected errors
  // ki internal details expose na karein.
  const message = isApiError
    ? err.message
    : isProduction
      ? "Internal Server Error"
      : err instanceof Error
        ? err.message
        : "Internal Server Error";

  const errors = isApiError
    ? err.errors
    : [];

  // Original error server logs mein record karein.
  // Request body, cookies aur auth headers
  // log nahi karne.
  logger.error(
    {
      err,
      method: req.method,
      path: req.path,
      statusCode: safeStatusCode,
    },
    "❌ MeetTools API Error"
  );

  res.status(safeStatusCode).json({
    success: false,
    message,
    errors,

    ...(!isProduction && err instanceof Error
      ? { stack: err.stack }
      : {}),
  });
};
