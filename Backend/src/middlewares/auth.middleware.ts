
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
};

const getCookieToken = (
  req: Request,
  cookieName: string
): string | undefined => {
  const parsedToken = req.cookies?.[cookieName];

  if (
    typeof parsedToken === "string" &&
    parsedToken.trim()
  ) {
    return parsedToken.trim();
  }

  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) return undefined;

  const tokenCookie = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) =>
      cookie.startsWith(`${cookieName}=`)
    );

  if (!tokenCookie) return undefined;

  const rawValue = tokenCookie.slice(
    cookieName.length + 1
  );

  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
};

const createAuthenticate = (
  cookieName: string,
  requiredRole: "user" | "admin"
) => {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      req.user = undefined;

      const cookieToken = getCookieToken(
        req,
        cookieName
      );

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
        decoded = jwt.verify(
          token,
          env.JWT_SECRET,
          { algorithms: ["HS256"] }
        );
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

      if (user.role !== requiredRole) {
        throw new ApiError(
          STATUS_CODES.FORBIDDEN,
          "You are not authorized to access this session."
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
};

// User routes use only the user cookie.
export const authenticate = createAuthenticate(
  "meettools_token",
  "user"
);

// Admin routes use only the admin cookie.
export const authenticateAdmin = createAuthenticate(
  "meettools_admin_token",
  "admin"
);
