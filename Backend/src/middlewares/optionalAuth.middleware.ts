import type {
  Request,
  Response,
  NextFunction,
} from "express";

import jwt, {
  type JwtPayload,
} from "jsonwebtoken";

import mongoose from "mongoose";
import { randomUUID } from "crypto";

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
  guestId?: string;
};

type TokenPayload = JwtPayload & {
  id?: string;
  userId?: string;
  sub?: string;
  role?: string;
};

type GuestPayload = JwtPayload & {
  guestId?: string;
};

// =====================================
// Cookie Configuration
// =====================================

const GUEST_COOKIE = "meettools_guest";

const guestCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: (
    env.NODE_ENV === "production" ? "none" : "lax"
  ) as "none" | "lax",
  path: "/",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

// =====================================
// Optional Authentication
// =====================================

export const optionalAuthenticate = (
  req: OptionalAuthRequest,
  res: Response,
  next: NextFunction
): void => {
  req.user = undefined;
  req.guestId = undefined;

  const token = req.cookies?.meettools_token;

  if (typeof token === "string" && token) {
    try {
      const decoded = jwt.verify(
        token,
        env.JWT_SECRET,
        { algorithms: ["HS256"] }
      );

      if (typeof decoded !== "string") {
        const payload = decoded as TokenPayload;

        const userId =
          payload.id ??
          payload.userId ??
          payload.sub;

        if (
          typeof userId === "string" &&
          mongoose.isValidObjectId(userId)
        ) {
          req.user = {
            id: userId,
            _id: userId,
            ...(payload.role === "user" ||
            payload.role === "admin"
              ? { role: payload.role }
              : {}),
          };

          next();
          return;
        }
      }
    } catch {
      // Invalid or expired login token.
      // Continue as guest.
    }
  }

  // =====================================
  // Guest Identity
  // =====================================

  const guestToken = req.cookies?.[GUEST_COOKIE];

  if (typeof guestToken === "string" && guestToken) {
    try {
      const decoded = jwt.verify(
        guestToken,
        env.JWT_SECRET,
        { algorithms: ["HS256"] }
      );

      if (typeof decoded !== "string") {
        const payload = decoded as GuestPayload;

        if (
          typeof payload.guestId === "string" &&
          payload.guestId.length >= 20 &&
          payload.guestId.length <= 200
        ) {
          req.guestId = payload.guestId;
          next();
          return;
        }
      }
    } catch {
      // Invalid guest token: issue a new identity.
    }
  }

  const guestId = randomUUID();

  const signedGuestToken = jwt.sign(
    { guestId },
    env.JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: "30d",
    }
  );

  res.cookie(
    GUEST_COOKIE,
    signedGuestToken,
    guestCookieOptions
  );

  req.guestId = guestId;

  next();
};