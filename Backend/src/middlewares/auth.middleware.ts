
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
import { User } from "../models/User.model.js";
import { ApiError } from "../utils/ApiError.js";
import { STATUS_CODES } from "../utils/statusCodes.js";

// =====================================
// Types
// =====================================

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    _id: string;
    role: "user" | "admin";
  };
}

type TokenPayload = JwtPayload & {
  id?: string;
  userId?: string;
  sub?: string;
};

// =====================================
// Authentication Middleware
// =====================================

export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    req.user = undefined;

    const cookieToken = req.cookies?.meetools_token;

    const authHeader = req.headers.authorization;

    const bearerToken =
      typeof authHeader === "string" &&
      authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : undefined;

    const token =
      typeof cookieToken === "string" && cookieToken
        ? cookieToken
        : bearerToken;

    if (!token) {
      throw new ApiError(
        STATUS_CODES.UNAUTHORIZED,
        "Authentication required."
      );
    }

    let decoded: string | JwtPayload;

    try {
      decoded = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ["HS256"],
      });
    } catch {
      throw new ApiError(
        STATUS_CODES.UNAUTHORIZED,
        "Invalid or expired authentication token."
      );
    }

    if (typeof decoded === "string") {
      throw new ApiError(
        STATUS_CODES.UNAUTHORIZED,
        "Invalid authentication token."
      );
    }

    const payload = decoded as TokenPayload;

    const userId =
      payload.id ??
      payload.userId ??
      payload.sub;

    if (
      typeof userId !== "string" ||
      !mongoose.isValidObjectId(userId)
    ) {
      throw new ApiError(
        STATUS_CODES.UNAUTHORIZED,
        "Invalid authentication identity."
      );
    }

    const user = await User.findById(userId).select(
      "_id role isEmailVerified"
    );

    if (!user) {
      throw new ApiError(
        STATUS_CODES.UNAUTHORIZED,
        "Account no longer exists."
      );
    }

    if (user.isEmailVerified !== true) {
      throw new ApiError(
        STATUS_CODES.FORBIDDEN,
        "Please verify your email before continuing."
      );
    }

    if (
      user.role !== "user" &&
      user.role !== "admin"
    ) {
      throw new ApiError(
        STATUS_CODES.FORBIDDEN,
        "Account role is not permitted."
      );
    }

    req.user = {
      id: user._id.toString(),
      _id: user._id.toString(),
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};
