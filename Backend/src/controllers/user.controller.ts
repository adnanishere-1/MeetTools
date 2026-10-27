import { Response } from 'express';
import { User } from '../models/User.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { STATUS_CODES } from '../utils/statusCodes.js';

/**
 * @desc    Get Current User Profile
 * @route   GET /api/v1/users/me
 * @access  Private
 */
export const getProfile = asyncHandler(async (req: any, res: Response) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'User not found');
  }

  return res.status(STATUS_CODES.OK).json({
    success: true,
    user,
  });
});

/**
 * @desc    Update User Profile details (Name, Avatar)
 * @route   PUT /api/v1/users/me
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req: any, res: Response) => {
  const { name, avatar } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'User not found');
  }

  if (name) user.name = name;
  if (avatar) user.avatar = avatar;

  await user.save();

  return res.status(STATUS_CODES.OK).json({
    success: true,
    message: 'Profile updated successfully',
    user,
  });
});

/**
 * @desc    Get User Remaining Credits
 * @route   GET /api/v1/users/credits
 * @access  Private
 */
export const getUserCredits = asyncHandler(async (req: any, res: Response) => {
  const user = await User.findById(req.user.id).select('credits');
  if (!user) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'User not found');
  }

  return res.status(STATUS_CODES.OK).json({
    success: true,
    credits: user.credits,
  });
});

/**
 * @desc    Update Cookie Consent Status in Database
 * @route   PUT /api/v1/users/cookie-consent
 * @access  Private
 */
export const updateCookieConsent = asyncHandler(async (req: any, res: Response) => {
  const { consent } = req.body; // 'accepted' or 'rejected'

  if (!['accepted', 'rejected'].includes(consent)) {
    throw new ApiError(STATUS_CODES.BAD_REQUEST, 'Invalid consent value');
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(STATUS_CODES.NOT_FOUND, 'User not found');
  }

  user.consents.analyticsConsent = consent === 'accepted';
  user.consents.marketingConsent = consent === 'accepted';
  user.consents.termsAndPrivacyAccepted = consent === 'accepted';
  user.consents.consentGivenAt = new Date();
  user.consents.ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();

  await user.save();

  return res.status(STATUS_CODES.OK).json({
    success: true,
    message: 'Cookie consent updated successfully',
    consents: user.consents,
  });
});