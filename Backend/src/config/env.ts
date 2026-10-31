
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

// =====================================
// Environment Schema
// =====================================

const envSchema = z.object({
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
  JWT_SECRET: requiredString("JWT_SECRET"),

  JWT_REFRESH_SECRET: requiredString(
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

  // Optional frontend URL
  FRONTEND_URL: z
    .url("FRONTEND_URL must be a valid URL")
    .default("http://localhost:3000"),
});

// =====================================
// Validate Environment Variables
// =====================================

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    "❌ Invalid MeetTools environment configuration:"
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
