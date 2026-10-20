import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { STATUS_CODES } from '../utils/statusCodes.js';
import { sendEmail } from '../utils/email.js';

// Helper: 6-Digit OTP generator
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * @desc    Register new user & send verification OTP
 * @route   POST /api/v1/auth/register
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, consents } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Name, email, and password are required');
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(STATUS_CODES.CONFLICT, 'User with this email already exists');
  }

  // Hash Password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Generate 6-digit OTP & 5-minute Expiry
  const otp = generateOTP();
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const clientIp = (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;

  // Create User
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    otp,
    otpExpiresAt,
    isEmailVerified: false,
    consents: {
      essentialCookies: true,
      analyticsConsent: Boolean(consents?.analyticsConsent),
      marketingConsent: Boolean(consents?.marketingConsent),
      termsAndPrivacyAccepted: Boolean(consents?.termsAndPrivacyAccepted),
      consentGivenAt: new Date(),
      ipAddress: clientIp,
    },
  });

  // Send Verification Email
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2>Welcome to MeetTools!</h2>
      <p>Your email verification OTP is:</p>
      <h1 style="color: #0066cc; letter-spacing: 4px;">${otp}</h1>
      <p>This OTP will expire in <strong>5 minutes</strong>.</p>
    </div>
  `;

  await sendEmail({
    to: user.email,
    subject: 'Verify your MeetTools Account',
    html: emailHtml,
  });

  return res.status(STATUS_CODES.CREATED).json({
    success: true,
    message: 'User registered successfully. Verification OTP sent to your email.',
    userId: user._id,
  });
});

/**
 * @desc    Verify OTP for email verification
 * @route   POST /api/v1/auth/verify-otp
 */
export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Email and OTP are required');
  }

  // Fetch user including hidden otp fields
  const user = await User.findOne({ email }).select('+otp +otpExpiresAt');

  if (!user) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'User not found');
  }

  if (user.isEmailVerified) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Email is already verified');
  }

  if (!user.otp || !user.otpExpiresAt || user.otp !== otp) {
    throw new ApiError(STATUS_CODES.UNAUTHORIZED, 'Invalid OTP');
  }

  if (new Date() > user.otpExpiresAt) {
    throw new ApiError(STATUS_CODES.UNAUTHORIZED, 'OTP has expired. Please request a new one.');
  }

  // Update user verification status and clear OTP
  user.isEmailVerified = true;
  user.otp = undefined;
  user.otpExpiresAt = undefined;
  await user.save();

  return res.status(STATUS_CODES.OK).json({
    success: true,
    message: 'Email verified successfully. You can now log in.',
  });
});

/**
 * @desc    Resend OTP
 * @route   POST /api/v1/auth/resend-otp
 */
export const resendOTP = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Email is required');
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'User not found');
  }

  if (user.isEmailVerified) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Account is already verified');
  }

  const otp = generateOTP();
  user.otp = otp;
  user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await user.save();

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2>MeetTools OTP Resend</h2>
      <p>Your new verification OTP is:</p>
      <h1 style="color: #0066cc; letter-spacing: 4px;">${otp}</h1>
      <p>This code expires in <strong>5 minutes</strong>.</p>
    </div>
  `;

  await sendEmail({
    to: user.email,
    subject: 'New MeetTools OTP',
    html: emailHtml,
  });

  return res.status(STATUS_CODES.OK).json({
    success: true,
    message: 'New OTP sent to email successfully.',
  });
});

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Email and password are required');
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password || ''))) {
    throw new ApiError(STATUS_CODES.UNAUTHORIZED, 'Invalid credentials');
  }

  if (!user.isEmailVerified) {
    throw new ApiError(STATUS_CODES.FORBIDDEN, 'Please verify your email before logging in');
  }

  // Generate JWT Access Token
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );

  return res.status(STATUS_CODES.OK).json({
    success: true,
    message: 'Logged in successfully',
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      credits: user.credits,
    },
  });
});

/**
 * @desc    Logout user & clear cookie / invalidate session
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  // Agar aap HttpOnly Cookies use kar rahe hain:
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  return res.status(STATUS_CODES.OK).json({
    success: true,
    message: 'Logged out successfully',
  });
});