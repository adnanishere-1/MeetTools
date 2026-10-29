
import type {
  Request,
  Response,
  NextFunction,
} from "express";

import jwt, {
  type JwtPayload,
} from "jsonwebtoken";

import mongoose from "mongoose";

import { env } from "../config/env.js";

// =====================================
// Types
// =====================================

type OptionalAuthRequest = Request & {
  user?: {
    id: string;
    _id: string;
    role?: "user" | "admin";
  };
};

type TokenPayload = JwtPayload & {
  id?: string;
  userId?: string;
  role?: string;
};

// =====================================
// Optional Authentication Middleware
// =====================================

/**
 * @desc    Authenticate user if a valid
 *          JWT cookie is available.
 *
 * @access  Public / Guest / Logged-in
 *
 * Valid token   -> req.user populated
 * Missing token -> continue as guest
 * Invalid token -> continue as guest
 *
 * Must be registered after cookie-parser.
 */
export const optionalAuthenticate = (
  req: OptionalAuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  // Never trust user data already attached
  // by an unrelated middleware.
  req.user = undefined;

  // Read HttpOnly cookie.
  const token =
    req.cookies?.meettools_token;

  // No cookie means guest request.
  if (
    typeof token !== "string" ||
    !token
  ) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      env.JWT_SECRET,
      {
        algorithms: ["HS256"],
      }
    );

    if (
      typeof decoded === "string"
    ) {
      next();
      return;
    }

    const payload =
      decoded as TokenPayload;

    // Support common JWT user ID fields.
    const userId =
      payload.id ??
      payload.userId ??
      payload.sub;

    if (
      typeof userId !== "string" ||
      !mongoose.isValidObjectId(userId)
    ) {
      next();
      return;
    }

    req.user = {
      id: userId,
      _id: userId,

      ...(payload.role === "user" ||
      payload.role === "admin"
        ? {
            role: payload.role,
          }
        : {}),
    };

    next();
  } catch {
    // Expired, invalid or malformed token:
    // allow public image tools as guest.
    req.user = undefined;
    next();
  }
};
