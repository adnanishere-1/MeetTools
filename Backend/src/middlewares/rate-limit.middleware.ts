
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";

import { redis } from "../config/redis.js";

// =====================================
// Shared Redis Store
// =====================================

const createRedisStore = (prefix: string) =>
  new RedisStore({
    sendCommand: (...args: string[]) =>
      redis.call(args[0]!, args.slice(1)) as Promise<number>,
    prefix,
  });

// =====================================
// General API Limiter
// =====================================

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,

  standardHeaders: "draft-7",
  legacyHeaders: false,

  store: createRedisStore("rate-limit:api:"),

  message: {
    success: false,
    message:
      "Too many requests. Please try again after 15 minutes.",
  },

  skip: (req) => req.method === "OPTIONS",

  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message:
        "Too many requests. Please try again after 15 minutes.",
    });
  },
});

// =====================================
// Authentication Limiter
// =====================================

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,

  standardHeaders: "draft-7",
  legacyHeaders: false,

  store: createRedisStore("rate-limit:auth:"),

  message: {
    success: false,
    message:
      "Too many authentication attempts. Please try again after 15 minutes.",
  },

  skip: (req) => req.method === "OPTIONS",

  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message:
        "Too many authentication attempts. Please try again after 15 minutes.",
    });
  },
});
