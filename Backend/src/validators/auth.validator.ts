
import { z } from "zod";

// =====================================
// Shared Validation Schemas
// =====================================

const emailSchema = z
  .string({
    error: "Email is required",
  })
  .trim()
  .toLowerCase()
  .email("Invalid email address")
  .max(
    254,
    "Email address is too long"
  );

const passwordSchema = z
  .string({
    error: "Password is required",
  })
  .min(
    8,
    "Password must be at least 8 characters long"
  )
  .max(
    128,
    "Password must not exceed 128 characters"
  )
  .regex(
    /[A-Z]/,
    "Password must contain at least one uppercase letter"
  )
  .regex(
    /[a-z]/,
    "Password must contain at least one lowercase letter"
  )
  .regex(
    /[0-9]/,
    "Password must contain at least one number"
  )
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character"
  );

const otpSchema = z
  .string({
    error: "OTP is required",
  })
  .regex(
    /^\d{6}$/,
    "OTP must contain exactly 6 digits"
  );

const consentsSchema = z
  .object({
    analyticsConsent: z
      .boolean()
      .optional(),

    marketingConsent: z
      .boolean()
      .optional(),

    termsAndPrivacyAccepted: z
      .boolean()
      .refine(
        (value) => value === true,
        "You must accept the terms and privacy policy"
      ),
  })
  .strict()
  .optional();

// =====================================
// Register
// =====================================

export const registerSchema = z.object({
  body: z
    .object({
      name: z
        .string({
          error: "Name is required",
        })
        .trim()
        .min(
          2,
          "Name must be at least 2 characters"
        )
        .max(
          100,
          "Name must not exceed 100 characters"
        ),

      email: emailSchema,

      password: passwordSchema,

      // Retained for compatibility.
      // Admin authorization must happen
      // securely in the auth service.
      adminSecretKey: z
        .string()
        .optional(),

      // Legacy/top-level consent fields.
      termsAndPrivacyAccepted: z
        .boolean()
        .optional(),

      essentialCookies: z
        .boolean()
        .optional(),

      analyticsConsent: z
        .boolean()
        .optional(),

      marketingConsent: z
        .boolean()
        .optional(),

      // Nested consent structure.
      consents: consentsSchema,
    })
    .strict()
    .superRefine((data, ctx) => {
      const topLevelAccepted =
        data.termsAndPrivacyAccepted === true;

      const nestedAccepted =
        data.consents
          ?.termsAndPrivacyAccepted === true;

      // Terms acceptance is mandatory.
      if (
        !topLevelAccepted &&
        !nestedAccepted
      ) {
        ctx.addIssue({
          code: "custom",
          path: [
            "termsAndPrivacyAccepted",
          ],
          message:
            "You must accept the terms and privacy policy",
        });
      }

      // Prevent contradictory consent values.
      if (
        data.termsAndPrivacyAccepted !== undefined &&
        data.consents
          ?.termsAndPrivacyAccepted !== undefined &&
        data.termsAndPrivacyAccepted !==
          data.consents.termsAndPrivacyAccepted
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["consents"],
          message:
            "Conflicting terms acceptance values",
        });
      }

      if (
        data.analyticsConsent !== undefined &&
        data.consents?.analyticsConsent !== undefined &&
        data.analyticsConsent !==
          data.consents.analyticsConsent
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["consents"],
          message:
            "Conflicting analytics consent values",
        });
      }

      if (
        data.marketingConsent !== undefined &&
        data.consents?.marketingConsent !== undefined &&
        data.marketingConsent !==
          data.consents.marketingConsent
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["consents"],
          message:
            "Conflicting marketing consent values",
        });
      }
    }),
});

// =====================================
// Verify OTP
// =====================================

export const verifyOTPSchema = z.object({
  body: z
    .object({
      email: emailSchema,
      otp: otpSchema,
    })
    .strict(),
});

// =====================================
// Resend OTP
// =====================================

export const resendOTPSchema = z.object({
  body: z
    .object({
      email: emailSchema,
    })
    .strict(),
});

// =====================================
// Login
// =====================================

export const loginSchema = z.object({
  body: z
    .object({
      email: emailSchema,

      // Login must not apply registration
      // complexity rules to existing passwords.
      password: z
        .string({
          error: "Password is required",
        })
        .min(
          1,
          "Password is required"
        ),
    })
    .strict(),
});
