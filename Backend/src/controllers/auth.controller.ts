
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomInt, timingSafeEqual } from "node:crypto";
import disposableDomains from "disposable-email-domains";

import { User } from "../models/User.model.js";
import { ActivityLog } from "../models/ActivityLog.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { STATUS_CODES } from "../utils/statusCodes.js";
import { sendEmail } from "../utils/email.js";

// ==========================================
// Types
// ==========================================

interface RegistrationConsents {
  essentialCookies?: boolean;
  analyticsConsent?: boolean;
  marketingConsent?: boolean;
  termsAndPrivacyAccepted?: boolean;
}

interface RegisterBody {
  name?: string;
  email?: string;
  password?: string;
  consents?: RegistrationConsents;
  adminSecretKey?: string;
}

interface LoginBody {
  email?: string;
  password?: string;
}

interface OTPBody {
  email?: string;
  otp?: string;
}

// ==========================================
// Helpers
// ==========================================

const generateOTP = (): string => {
  return randomInt(100000, 1000000).toString();
};

const normalizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

const getClientIp = (req: Request): string => {
  return (
    req.ip ||
    req.socket.remoteAddress ||
    "unknown"
  );
};

const getRequestBody = <T>(req: Request): T => {
  if (
    !req.body ||
    typeof req.body !== "object" ||
    Array.isArray(req.body)
  ) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST,
      "Request body is missing or invalid. Please send JSON data."
    );
  }

  return req.body as T;
};

// FIXED: Correct email regex
const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidPassword = (
  password: string
): boolean => {
  return (
    typeof password === "string" &&
    password.length >= 8
  );
};

const isValidOTP = (otp: string): boolean => {
  return /^\d{6}$/.test(otp);
};

const isAdminSecretValid = (
  providedKey: string | undefined
): boolean => {
  const configuredKey =
    process.env.ADMIN_SECRET_KEY?.trim();

  const submittedKey = providedKey?.trim();

  if (!configuredKey || !submittedKey) {
    return false;
  }

  const configuredBuffer =
    Buffer.from(configuredKey);

  const submittedBuffer =
    Buffer.from(submittedKey);

  if (
    configuredBuffer.length !==
    submittedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    configuredBuffer,
    submittedBuffer
  );
};

const getPublicUser = (
  user: InstanceType<typeof User>
) => {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    credits: user.credits,
  };
};

// ==========================================
// Register
// ==========================================

export const register = asyncHandler(
  async (req: Request, res: Response) => {
    const body =
      getRequestBody<RegisterBody>(req);

    const {
      name,
      email,
      password,
      consents,
      adminSecretKey,
    } = body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        "Name, email, and password are required"
      );
    }

    const normalizedName = name.trim();
    const normalizedEmail =
      normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        "Please enter a valid email address"
      );
    }

    if (!isValidPassword(password)) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        "Password must contain at least 8 characters"
      );
    }

    // Disposable email protection
    const emailDomain =
      normalizedEmail.split("@")[1];

    if (
      !emailDomain ||
      disposableDomains.includes(emailDomain)
    ) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        "Temporary or disposable email addresses are not allowed. Please use a real email address."
      );
    }

    // Check existing user
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      throw new ApiError(
        STATUS_CODES.CONFLICT,
        "User with this email already exists"
      );
    }

    // Validate consents
    if (
      !consents ||
      typeof consents !== "object" ||
      Array.isArray(consents) ||
      consents.termsAndPrivacyAccepted !== true
    ) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        "You must accept the Terms and Privacy Policy"
      );
    }

    // Determine role
    const adminKeyMatched =
      typeof adminSecretKey === "string" &&
      isAdminSecretValid(adminSecretKey);

    // Reject incorrect admin secret
    if (
      adminSecretKey !== undefined &&
      !adminKeyMatched
    ) {
      throw new ApiError(
        STATUS_CODES.FORBIDDEN,
        "Invalid admin secret key"
      );
    }

    const role: "user" | "admin" =
      adminKeyMatched ? "admin" : "user";

    const isEmailVerified = adminKeyMatched;

    const otp = adminKeyMatched
      ? undefined
      : generateOTP();

    const otpExpiresAt = adminKeyMatched
      ? undefined
      : new Date(Date.now() + 5 * 60 * 1000);

    // Hash password
    const hashedPassword =
      await bcrypt.hash(password, 10);

    const clientIp = getClientIp(req);

    // Create user
    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      isEmailVerified,
      otp,
      otpExpiresAt,
      consents: {
        essentialCookies: true,
        analyticsConsent:
          consents.analyticsConsent === true,
        marketingConsent:
          consents.marketingConsent === true,
        termsAndPrivacyAccepted: true,
        consentGivenAt: new Date(),
        ipAddress: clientIp,
      },
    });

    // Activity log
    await ActivityLog.create({
      userId: user._id,
      action: "USER_REGISTER",
      details: {
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      ipAddress: clientIp,
    });

    // Admin registration
    if (adminKeyMatched) {
      return res
        .status(STATUS_CODES.CREATED)
        .json({
          success: true,
          message:
            "Admin account created and auto-verified successfully. You can log in directly.",
          userId: String(user._id),
          role: user.role,
        });
    }

    // Send verification email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Welcome to MeetTools!</h2>

        <p>Your email verification OTP is:</p>

        <h1 style="color: #0066cc; letter-spacing: 4px;">
          ${otp}
        </h1>

        <p>
          This OTP will expire in
          <strong>5 minutes</strong>.
        </p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: "Verify your MeetTools Account",
      html: emailHtml,
    });

    return res
      .status(STATUS_CODES.CREATED)
      .json({
        success: true,
        message:
          "User registered successfully. Verification OTP sent to your email.",
        userId: String(user._id),
      });
  }
);

// ==========================================
// Verify OTP
// ==========================================

export const verifyOTP = asyncHandler(
  async (req: Request, res: Response) => {
    const body = getRequestBody<OTPBody>(req);
    const { email, otp } = body;

    if (
      typeof email !== "string" ||
      typeof otp !== "string" ||
      !email.trim() ||
      !otp.trim()
    ) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        "Email and OTP are required"
      );
    }

    const normalizedEmail =
      normalizeEmail(email);

    const normalizedOTP = otp.trim();

    if (!isValidOTP(normalizedOTP)) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        "OTP must contain exactly 6 digits"
      );
    }

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+otp +otpExpiresAt");

    if (!user) {
      throw new ApiError(
        STATUS_CODES.NOT_FOUND,
        "User not found"
      );
    }

    if (user.isEmailVerified) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        "Email is already verified"
      );
    }

    if (
      !user.otp ||
      !user.otpExpiresAt ||
      user.otp !== normalizedOTP
    ) {
      throw new ApiError(
        STATUS_CODES.UNAUTHORIZED,
        "Invalid OTP"
      );
    }

    if (
      Date.now() >
      user.otpExpiresAt.getTime()
    ) {
      throw new ApiError(
        STATUS_CODES.UNAUTHORIZED,
        "OTP has expired. Please request a new one."
      );
    }

    user.isEmailVerified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;

    await user.save();

    return res
      .status(STATUS_CODES.OK)
      .json({
        success: true,
        message:
          "Email verified successfully. You can now log in.",
      });
  }
);

// ==========================================
// Resend OTP
// ==========================================

export const resendOTP = asyncHandler(
  async (req: Request, res: Response) => {
    const body = getRequestBody<OTPBody>(req);
    const { email } = body;

    if (
      typeof email !== "string" ||
      !email.trim()
    ) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        "Email is required"
      );
    }

    const normalizedEmail =
      normalizeEmail(email);

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      throw new ApiError(
        STATUS_CODES.NOT_FOUND,
        "User not found"
      );
    }

    if (user.isEmailVerified) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        "Account is already verified"
      );
    }

    const otp = generateOTP();

    user.otp = otp;
    user.otpExpiresAt = new Date(
      Date.now() + 5 * 60 * 1000
    );

    await user.save();

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>MeetTools OTP Resend</h2>

        <p>Your new verification OTP is:</p>

        <h1 style="color: #0066cc; letter-spacing: 4px;">
          ${otp}
        </h1>

        <p>
          This code expires in
          <strong>5 minutes</strong>.
        </p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: "New MeetTools OTP",
      html: emailHtml,
    });

    return res
      .status(STATUS_CODES.OK)
      .json({
        success: true,
        message:
          "New OTP sent to email successfully.",
      });
  }
);

// ==========================================
// Login
// ==========================================

export const login = asyncHandler(
  async (req: Request, res: Response) => {
    const body =
      getRequestBody<LoginBody>(req);

    const { email, password } = body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      throw new ApiError(
        STATUS_CODES.BAD_REQUEST,
        "Valid email and password are required"
      );
    }

    const normalizedEmail =
      normalizeEmail(email);

    // Find user
    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (
      !user ||
      !(await bcrypt.compare(
        password,
        user.password || ""
      ))
    ) {
      throw new ApiError(
        STATUS_CODES.UNAUTHORIZED,
        "Invalid credentials"
      );
    }

    // Email verification
    if (!user.isEmailVerified) {
      throw new ApiError(
        STATUS_CODES.FORBIDDEN,
        "Please verify your email before logging in"
      );
    }

    // JWT configuration
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error(
        "JWT_SECRET is not configured"
      );
    }

    const token = jwt.sign(
      {
        id: String(user._id),
        role: user.role,
      },
      jwtSecret,
      {
        expiresIn: "7d",
      }
    );

    // HttpOnly authentication cookie
    res.cookie("meettools_token", token, {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Login activity
    const clientIp = getClientIp(req);

    await ActivityLog.create({
      userId: user._id,
      action: "USER_LOGIN",
      details: {
        email: user.email,
      },
      ipAddress: clientIp,
    });

    // Login response
    return res
      .status(STATUS_CODES.OK)
      .json({
        success: true,
        message: "Logged in successfully",
        user: getPublicUser(user),
      });
  }
);

// ==========================================
// Logout
// ==========================================

export const logout = asyncHandler(
  async (_req: Request, res: Response) => {
    res.clearCookie("meettools_token", {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return res
      .status(STATUS_CODES.OK)
      .json({
        success: true,
        message: "Logged out successfully",
      });
  }
);
