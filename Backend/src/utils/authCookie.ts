import type { Request, CookieOptions } from "express";

export type AuthScope = "user" | "admin";

export const AUTH_COOKIE_NAMES: Record<AuthScope, string> = {
  user: "meettools_user_token",
  admin: "meettools_admin_token",
};

export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const getAuthScope = (req: Request): AuthScope =>
  req.headers["x-auth-scope"] === "admin" ? "admin" : "user";