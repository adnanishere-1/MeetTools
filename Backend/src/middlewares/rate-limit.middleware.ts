
import rateLimit from "express-rate-limit";

// =====================================
// Configuration
// =====================================

const FIFTEEN_MINUTES = 15 * 60 * 1000;

// =====================================
// Standard API Rate Limiter
// =====================================

/**
 * Maximum 100 requests per 15 minutes
 * per client IP.
 *
 * Suitable for general API endpoints.
 */
export const apiLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,

  limit: 100,

  standardHeaders: "draft-7",
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many requests from this IP, please try again after 15 minutes.",
  },

  // Do not count CORS preflight requests.
  skip: (req) => req.method === "OPTIONS",
});

// =====================================
// Authentication Rate Limiter
// =====================================

/**
 * Maximum 5 authentication requests
 * per 15 minutes per client IP.
 *
 * Apply to sensitive authentication
 * endpoints rather than the entire
 * auth router.
 */
export const authLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,

  limit: 5,

  standardHeaders: "draft-7",
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many authentication attempts, please try again after 15 minutes.",
  },

  skip: (req) => req.method === "OPTIONS",
});
