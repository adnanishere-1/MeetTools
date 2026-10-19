import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { STATUS_CODES } from '../utils/statusCodes.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: 'user' | 'admin';
  };
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(STATUS_CODES.UNAUTHORIZED, 'Access denied. No token provided.');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
      id: string;
      role: 'user' | 'admin';
    };

    req.user = decoded;
    next();
  } catch (error) {
    throw new ApiError(STATUS_CODES.UNAUTHORIZED, 'Invalid or expired token.');
  }
};