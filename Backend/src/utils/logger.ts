
import "dotenv/config";

import pino from "pino";

const isProduction =
  process.env.NODE_ENV === "production";

export const logger = pino({
  level:
    process.env.LOG_LEVEL ||
    (isProduction ? "info" : "debug"),

  // Sensitive data ko logs mein hide karein
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
      "password",
      "token",
      "accessToken",
      "refreshToken",
      "meettools_token",
      "otp",
      "*.password",
      "*.token",
      "*.accessToken",
      "*.refreshToken",
      "*.otp",
    ],
    censor: "[REDACTED]",
  },

  // Development mein pehle wala
  // colorful, readable logger style
  transport: !isProduction
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
          singleLine: false,
        },
      }
    : undefined,

  // Production mein standard JSON logs
  base: isProduction
    ? { env: "production" }
    : undefined,
});
