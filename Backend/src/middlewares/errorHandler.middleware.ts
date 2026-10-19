import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { STATUS_CODES } from '../utils/statusCodes.js';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, [], err.stack);
  }

  logger.error(`❌ [Error] ${error.message}${error.stack ? `\n${error.stack}` : ''}`);

  return res.status(error.statusCode).json({
    success: false,
    message: error.message,
    errors: error.errors,
    ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
  });
};