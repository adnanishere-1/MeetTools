import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { STATUS_CODES } from '../utils/statusCodes.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    _id?: string;
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
      _id?: string;
      role: 'user' | 'admin';
    };

    // Dono formats ensure kar rahe hain taaki controller mein issue na ho
    req.user = {
      ...decoded,
      id: decoded.id || decoded._id!,
      _id: decoded._id || decoded.id,
    };

    next();
  } catch (error) {
    throw new ApiError(STATUS_CODES.UNAUTHORIZED, 'Invalid or expired token.');
  }
};