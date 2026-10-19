import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { STATUS_CODES } from '../utils/statusCodes.js';
import { ActivityLog } from '../models/ActivityLog.model.js';

/**
 * @desc    Get current user's activity history
 * @route   GET /api/v1/activity
 * @access  Private
 */
export const getUserActivities = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.id;

  const logs = await ActivityLog.find({ userId })
    .sort({ createdAt: -1 })
    .limit(50);

  return res.status(STATUS_CODES.OK).json({
    success: true,
    count: logs.length,
    data: logs,
  });
});