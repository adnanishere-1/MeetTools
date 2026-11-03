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
  role?: string;
};

const ADMIN_COOKIE_NAME = "meettools_admin_token";
const USER_COOKIE_NAME = "meettools_user_token";

const readCookieValue = (
  req: Request,
  name: string
): string | undefined => {
  // Read cookie parsed by cookie-parser.
  const parsedToken = req.cookies?.[name];

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
      cookie.startsWith(`${name}=`)
    );

  if (!tokenCookie) {
    return undefined;
  }

  const rawValue = tokenCookie.slice(
    `${name}=`.length
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

    // FIXED: Pick the cookie matching the active role sent
    // by the frontend so both sessions can coexist.
    const wantAdmin =
      req.headers["x-active-role"] === "admin";

    const adminToken = readCookieValue(
      req,
      ADMIN_COOKIE_NAME
    );

    const userToken = readCookieValue(
      req,
      USER_COOKIE_NAME
    );

    let cookieToken: string | undefined;
    let expectedRole: "user" | "admin" | undefined;

    if (wantAdmin && adminToken) {
      cookieToken = adminToken;
      expectedRole = "admin";
    } else if (userToken) {
      cookieToken = userToken;
      expectedRole = "user";
    } else if (adminToken) {
      cookieToken = adminToken;
      expectedRole = "admin";
    }

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

    // FIXED: Make sure the token belongs to the session
    // the frontend asked for.
    if (
      expectedRole &&
      payload.role !== expectedRole
    ) {
      throw new ApiError(
        STATUS_CODES.UNAUTHORIZED,
        "Session mismatch. Please log in again."
      );
    }

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