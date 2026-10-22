import { Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { STATUS_CODES } from '../utils/statusCodes.js';

export const isAdmin = (req: any, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'Access denied. Admin privileges required.');
  }
  next();
};