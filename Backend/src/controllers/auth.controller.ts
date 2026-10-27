import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import disposableDomains from 'disposable-email-domains';
import { User } from '../models/User.model.js';
import { ActivityLog } from '../models/ActivityLog.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { STATUS_CODES } from '../utils/statusCodes.js';
import { sendEmail } from '../utils/email.js';

const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, consents, adminSecretKey } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Name, email, and password are required');
  }

  // 🛡️ Temp Mail / Disposable Email Block Check
  const emailDomain = email.split('@')[1]?.toLowerCase();
  if (!emailDomain || disposableDomains.includes(emailDomain)) {
    throw new ApiError(
      STATUS_CODES.BAD_REQUEST, 
      'Temporary or disposable email addresses are not allowed. Please use a real email address.'
    );
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(STATUS_CODES.CONFLICT, 'User with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const clientIp = (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;

  // Safe Key Matching (Trim karke check karein)
  const envKey = process.env.ADMIN_SECRET_KEY?.trim();
  const sentKey = adminSecretKey?.trim();

  let role: 'user' | 'admin' = 'user';
  let isEmailVerified = false;
  let otp: string | undefined = undefined;
  let otpExpiresAt: Date | undefined = undefined;

  if (sentKey && envKey && sentKey === envKey) {
    role = 'admin';
    isEmailVerified = true;
    console.log('✅ Admin Key Matched! Making user an Admin.');
  } else {
    console.log('⚠️ Admin Key Not Matched or Missing. Registering as Normal User.');
    otp = generateOTP();
    otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
  }

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    isEmailVerified,
    otp,
    otpExpiresAt,
    consents: {
      essentialCookies: true,
      analyticsConsent: Boolean(consents?.analyticsConsent),
      marketingConsent: Boolean(consents?.marketingConsent),
      termsAndPrivacyAccepted: Boolean(consents?.termsAndPrivacyAccepted),
      consentGivenAt: new Date(),
      ipAddress: clientIp,
    },
  });

  await ActivityLog.create({
    userId: user._id,
    action: 'USER_REGISTER',
    details: { role: user.role, isEmailVerified: user.isEmailVerified },
    ipAddress: clientIp,
  });

  if (role === 'admin') {
    return res.status(STATUS_CODES.CREATED).json({
      success: true,
      message: 'Admin account created and auto-verified successfully. You can log in directly.',
      userId: user._id,
      role: user.role,
    });
  }

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

export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Email and OTP are required');
  }

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

  user.isEmailVerified = true;
  user.otp = undefined;
  user.otpExpiresAt = undefined;
  await user.save();

  return res.status(STATUS_CODES.OK).json({
    success: true,
    message: 'Email verified successfully. You can now log in.',
  });
});

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

  const clientIp = (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;

  await ActivityLog.create({
    userId: user._id,
    action: 'USER_LOGIN',
    details: { email: user.email },
    ipAddress: clientIp,
  });

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

export const logout = asyncHandler(async (req: Request, res: Response) => {
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