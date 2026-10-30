
import { z } from "zod";

const emailSchema = z
  .string({ error: "Email is required" })
  .trim()
  .toLowerCase()
  .email("Invalid email address")
  .max(254, "Email address is too long");

const passwordSchema = z
  .string({ error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must not exceed 128 characters")
  .regex(/[A-Z]/, "Password needs an uppercase letter")
  .regex(/[a-z]/, "Password needs a lowercase letter")
  .regex(/[0-9]/, "Password needs a number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password needs a special character"
  );

const otpSchema = z
  .string({ error: "OTP is required" })
  .regex(/^\d{6}$/, "OTP must contain exactly 6 digits");

const consentsSchema = z
  .object({
    essentialCookies: z.boolean().optional(),

    termsAndPrivacyAccepted: z
      .boolean()
      .refine((accepted) => accepted === true, {
        message:
          "You must accept the Terms and Privacy Policy",
      }),

    analyticsConsent: z.boolean().default(false),
    marketingConsent: z.boolean().default(false),
  })
  .strict();

export const registerSchema = z.object({
  body: z
    .object({
      name: z
        .string({ error: "Name is required" })
        .trim()
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name must not exceed 100 characters"),

      email: emailSchema,

      password: passwordSchema,

      // Allow admin secret key during registration
      adminSecretKey: z
        .string()
        .min(1)
        .optional(),

      consents: consentsSchema,
    })
    .strict(),
});

export const verifyOTPSchema = z.object({
  body: z
    .object({
      email: emailSchema,
      otp: otpSchema,
    })
    .strict(),
});

export const resendOTPSchema = z.object({
  body: z
    .object({
      email: emailSchema,
    })
    .strict(),
});

export const loginSchema = z.object({
  body: z
    .object({
      email: emailSchema,
      password: z
        .string({ error: "Password is required" })
        .min(1, "Password is required"),
    })
    .strict(),
});
