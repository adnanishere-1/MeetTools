
import nodemailer, {
  type Transporter,
} from "nodemailer";

import { logger } from "./logger.js";

// =====================================
// Types
// =====================================

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

// =====================================
// SMTP Configuration
// =====================================

// Create the transporter once and reuse it.
// Lazy initialization ensures environment
// variables are read when first needed.

let transporter: Transporter | null = null;

function getRequiredEnv(
  name: string
): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} is missing in environment variables.`
    );
  }

  return value;
}

function getEmailTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  const emailUser = getRequiredEnv(
    "EMAIL_USER"
  );

  const emailPass = getRequiredEnv(
    "EMAIL_PASS"
  );

  transporter = nodemailer.createTransport({
    service: "gmail",

    auth: {
      user: emailUser,
      pass: emailPass,
    },

    // Avoid hanging indefinitely if SMTP
    // server is slow or unreachable.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  return transporter;
}

// =====================================
// Validation Helpers
// =====================================

function validateEmailAddress(
  email: string
): string {
  if (
    typeof email !== "string" ||
    !email.trim()
  ) {
    throw new Error(
      "Recipient email address is required."
    );
  }

  const normalizedEmail = email.trim();

  // Basic format check.
  // Full email validation should also happen
  // in the request validation layer.
  const emailPattern =
    /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

  if (
    normalizedEmail.length > 254 ||
    !emailPattern.test(normalizedEmail)
  ) {
    throw new Error(
      "Invalid recipient email address."
    );
  }

  return normalizedEmail;
}

function validateSubject(
  subject: string
): string {
  if (
    typeof subject !== "string" ||
    !subject.trim()
  ) {
    throw new Error(
      "Email subject is required."
    );
  }

  const normalizedSubject = subject.trim();

  if (
    normalizedSubject.length > 200 ||
    /[\r\n]/.test(normalizedSubject)
  ) {
    throw new Error(
      "Invalid email subject."
    );
  }

  return normalizedSubject;
}

// =====================================
// Send Email
// =====================================

export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailOptions): Promise<boolean> {
  try {
    // Step 1: Validate input.
    const recipient =
      validateEmailAddress(to);

    const safeSubject =
      validateSubject(subject);

    if (
      typeof html !== "string" ||
      !html.trim()
    ) {
      throw new Error(
        "Email HTML content is required."
      );
    }

    // Step 2: Load SMTP configuration.
    const emailUser = getRequiredEnv(
      "EMAIL_USER"
    );

    const mailTransporter =
      getEmailTransporter();

    // Step 3: Send email.
    const info = await mailTransporter.sendMail({
      from: {
        name: "MeetTools Support",
        address: emailUser,
      },

      to: recipient,
      subject: safeSubject,
      html,

      // Avoid relying on HTML alone.
      text: html
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/\s+/g, " ")
        .trim(),
    });

    // Step 4: Verify SMTP accepted the recipient.
    const accepted = (info.accepted ?? []).some(
      (address) =>
        address.toLowerCase() ===
        recipient.toLowerCase()
    );

    if (!accepted) {
      throw new Error(
        "SMTP server did not accept the recipient."
      );
    }

    // Do not log OTPs or email body.
    logger.info(
      {
        messageId: info.messageId,
      },
      "📧 MeetTools email accepted by SMTP server"
    );

    return true;
  } catch (error: unknown) {
    logger.error(
      {
        err: error,
      },
      "❌ MeetTools email sending failed"
    );

    // Preserve the original error for debugging.
    throw error;
  }
}
