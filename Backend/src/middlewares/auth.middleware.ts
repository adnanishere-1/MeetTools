import type {
  Request,
  Response,
  NextFunction,
} from "express";

import jwt, { type JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";

import { env } from "../config/env.js";
import { User } from "../models/User.model.js";
import { ApiError } from "../utils/ApiError.js";
import { STATUS_CODES } from "../utils/statusCodes.js";
import {
  AUTH_COOKIE_NAMES,
  getAuthScope,
  type AuthScope,
} from "../utils/authCookie.js";

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

const getCookieToken = (
  req: Request,
  scope: AuthScope
): string | undefined => {
  const cookieName = AUTH_COOKIE_NAMES[scope];

  // Read cookie parsed by cookie-parser.
  const parsedToken = req.cookies?.[cookieName];

  if (
    typeof parsedToken === "string" &&
    parsedToken.trim().length > 0
  ) {
    return parsedToken.trim();
  }

  // Fallback: read raw Cookie header.
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) {
    return undefined;
  }

  const tokenCookie = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) =>
      cookie.startsWith(`${cookieName}=`)
    );

  if (!tokenCookie) {
    return undefined;
  }

  const rawValue = tokenCookie.slice(
    cookieName.length + 1
  );

  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
};

export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    req.user = undefined;

    const scope = getAuthScope(req);
    const cookieToken = getCookieToken(req, scope);

    const authHeader = req.headers.authorization;

    const bearerToken =
      typeof authHeader === "string" &&
      authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : undefined;

    const token = cookieToken || bearerToken;

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
      payload.id ?? payload.userId ?? payload.sub;

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

    // The session scope must match the account role.
    if (user.role !== scope) {
      throw new ApiError(
        STATUS_CODES.UNAUTHORIZED,
        "Session does not match this area."
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