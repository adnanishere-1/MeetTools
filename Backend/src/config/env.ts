
import "dotenv/config";

import { z } from "zod";

// =====================================
// Reusable Validators
// =====================================

const portSchema = z
  .coerce
  .number()
  .int("Port must be an integer")
  .min(1, "Port must be greater than 0")
  .max(65535, "Port must be less than 65536");

const requiredString = (name: string) =>
  z
    .string({
      error: `${name} is required`,
    })
    .trim()
    .min(1, `${name} cannot be empty`);

const secretSchema = (name: string) =>
  requiredString(name).min(
    32,
    `${name} must contain at least 32 characters`
  );

// =====================================
// Environment Schema
// =====================================

const envSchema = z
  .object({
    // Server
    PORT: portSchema.default(5000),

    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),

    // MongoDB
    MONGO_URI: requiredString("MONGO_URI"),

    // Redis
    REDIS_HOST: z
      .string()
      .trim()
      .min(1)
      .default("localhost"),

    REDIS_PORT: portSchema.default(6379),

    REDIS_USERNAME: z
      .string()
      .trim()
      .optional(),

    REDIS_PASSWORD: z
      .string()
      .optional(),

    REDIS_TLS: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),

    // JWT
    JWT_SECRET: secretSchema("JWT_SECRET"),

    JWT_REFRESH_SECRET: secretSchema(
      "JWT_REFRESH_SECRET"
    ),

    // ImageKit
    IMAGEKIT_PUBLIC_KEY: requiredString(
      "IMAGEKIT_PUBLIC_KEY"
    ),

    IMAGEKIT_PRIVATE_KEY: requiredString(
      "IMAGEKIT_PRIVATE_KEY"
    ),

    IMAGEKIT_URL_ENDPOINT: z.url(
      "IMAGEKIT_URL_ENDPOINT must be a valid URL"
    ),

    // Optional email configuration
    EMAIL_USER: z
      .string()
      .trim()
      .optional(),

    EMAIL_PASS: z
      .string()
      .optional(),

    BREVO_API_KEY: z
      .string()
      .trim()
      .optional(),

    EMAIL_FROM: z
      .string()
      .trim()
      .optional(),

    EMAIL_FROM_NAME: z
      .string()
      .trim()
      .optional(),

    // Frontend URLs
    // Multiple origins can be comma-separated.
    FRONTEND_URL: z
      .string()
      .trim()
      .min(1, "FRONTEND_URL cannot be empty")
      .default("http://localhost:3000"),

    CLIENT_URL: z
      .string()
      .trim()
      .optional(),
  })
  .superRefine((data, ctx) => {
    // =====================================
    // JWT Secret Separation
    // =====================================

    if (data.JWT_SECRET === data.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["JWT_REFRESH_SECRET"],
        message:
          "JWT_SECRET and JWT_REFRESH_SECRET must be different.",
      });
    }

    // =====================================
    // Frontend URL Validation
    // =====================================

    const frontendUrls = [
      data.FRONTEND_URL,
      ...(data.CLIENT_URL
        ? data.CLIENT_URL.split(",")
        : []),
    ]
      .flatMap((value) => value.split(","))
      .map((value) => value.trim())
      .filter(Boolean);

    for (const frontendUrl of frontendUrls) {
      try {
        const parsedUrl = new URL(frontendUrl);

        if (
          parsedUrl.protocol !== "http:" &&
          parsedUrl.protocol !== "https:"
        ) {
          throw new Error("Unsupported URL protocol");
        }

        if (
          data.NODE_ENV === "production" &&
          parsedUrl.protocol !== "https:"
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["FRONTEND_URL"],
            message:
              "Production frontend URLs must use HTTPS.",
          });
        }

        if (
          data.NODE_ENV === "production" &&
          (
            parsedUrl.hostname === "localhost" ||
            parsedUrl.hostname === "127.0.0.1"
          )
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["FRONTEND_URL"],
            message:
              "Localhost frontend URLs are not allowed in production.",
          });
        }
      } catch {
        ctx.addIssue({
          code: "custom",
          path: ["FRONTEND_URL"],
          message: `Invalid frontend URL: ${frontendUrl}`,
        });
      }
    }

    // =====================================
    // Production Redis Security
    // =====================================

    if (data.NODE_ENV === "production") {
      if (!data.REDIS_PASSWORD) {
        ctx.addIssue({
          code: "custom",
          path: ["REDIS_PASSWORD"],
          message:
            "REDIS_PASSWORD is required in production.",
        });
      }

      if (!data.REDIS_TLS) {
        ctx.addIssue({
          code: "custom",
          path: ["REDIS_TLS"],
          message:
            "REDIS_TLS must be true in production.",
        });
      }
    }
  });

// =====================================
// Validate Environment Variables
// =====================================

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    "Invalid MeetTools environment configuration:"
  );

  console.error(
    z.prettifyError(parsedEnv.error)
  );

  process.exit(1);
}

// =====================================
// Export Validated Environment
// =====================================

export const env = parsedEnv.data;
