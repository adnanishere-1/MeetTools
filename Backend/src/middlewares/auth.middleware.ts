
import {
  Request,
  Response,
  NextFunction,
} from 'express';

import jwt, {
  JwtPayload,
  TokenExpiredError,
  JsonWebTokenError,
} from 'jsonwebtoken';

import { User } from '../models/User.model.js';
import { ApiError } from '../utils/ApiError.js';
import { STATUS_CODES } from '../utils/statusCodes.js';

// Authenticated Request Interface
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    _id?: string;
    role: 'user' | 'admin';
  };
}

// JWT Payload Interface
interface AuthTokenPayload extends JwtPayload {
  id: string;
  role: 'user' | 'admin';
}

// Authentication Middleware
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Read token from HttpOnly cookie
    const cookieToken: unknown =
      req.cookies?.meettools_token;

    // 2. Read Bearer token for existing API compatibility
    const authHeader = req.headers.authorization;

    const bearerToken =
      authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : undefined;

    // 3. Prefer cookie authentication
    const token =
      typeof cookieToken === 'string' && cookieToken
        ? cookieToken
        : bearerToken;

    // Safe debugging (never print JWT itself)
    if (process.env.NODE_ENV === 'development') {
      console.log('[AUTH DEBUG]', {
        path: req.originalUrl,
        method: req.method,
        cookieParserWorking:
          req.cookies !== undefined,
        cookiePresent: Boolean(
          typeof cookieToken === 'string' &&
          cookieToken
        ),
        bearerPresent: Boolean(bearerToken),
      });
    }

    // 4. No token found
    if (!token) {
      return next(
        new ApiError(
          STATUS_CODES.UNAUTHORIZED,
          'Access denied. Please login first.'
        )
      );
    }

    // 5. Check JWT secret
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error(
        'JWT_SECRET is missing from environment variables.'
      );

      return next(
        new ApiError(
          500,
          'Authentication server configuration error.'
        )
      );
    }

    // 6. Verify JWT
    const verified = jwt.verify(
      token,
      jwtSecret,
      {
        algorithms: ['HS256'],
      }
    );

    if (
      typeof verified === 'string' ||
      typeof verified.id !== 'string' ||
      !verified.id
    ) {
      return next(
        new ApiError(
          STATUS_CODES.UNAUTHORIZED,
          'Invalid authentication token.'
        )
      );
    }

    const decoded = verified as AuthTokenPayload;

    // 7. Verify user exists in MongoDB
    const user = await User.findById(decoded.id)
      .select('_id role isEmailVerified');

    if (!user) {
      return next(
        new ApiError(
          STATUS_CODES.UNAUTHORIZED,
          'User account no longer exists.'
        )
      );
    }

    // 8. Ensure email is verified
    if (!user.isEmailVerified) {
      return next(
        new ApiError(
          STATUS_CODES.FORBIDDEN,
          'Please verify your email first.'
        )
      );
    }

    // 9. Validate role from database
    if (
      user.role !== 'admin' &&
      user.role !== 'user'
    ) {
      return next(
        new ApiError(
          STATUS_CODES.FORBIDDEN,
          'Invalid account role.'
        )
      );
    }

    // 10. Attach authenticated user
    req.user = {
      id: String(user._id),
      _id: String(user._id),
      role: user.role,
    };

    // 11. Authentication successful
    next();
  } catch (error: unknown) {
    // Expired JWT
    if (error instanceof TokenExpiredError) {
      return next(
        new ApiError(
          STATUS_CODES.UNAUTHORIZED,
          'Your session has expired. Please login again.'
        )
      );
    }

    // Invalid JWT
    if (error instanceof JsonWebTokenError) {
      return next(
        new ApiError(
          STATUS_CODES.UNAUTHORIZED,
          'Invalid authentication session.'
        )
      );
    }

    // Invalid MongoDB ObjectId
    if (
      error instanceof Error &&
      error.name === 'CastError'
    ) {
      return next(
        new ApiError(
          STATUS_CODES.UNAUTHORIZED,
          'Invalid user authentication data.'
        )
      );
    }

    // Other unexpected errors
    next(error);
  }
};
