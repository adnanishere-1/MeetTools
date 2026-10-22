import { Response } from 'express';
import { User } from '../models/User.model.js';
import { ActivityLog } from '../models/ActivityLog.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { STATUS_CODES } from '../utils/statusCodes.js';

export const getDashboardStats = asyncHandler(async (req: any, res: Response) => {
  const totalUsers = await User.countDocuments();
  const totalAdmins = await User.countDocuments({ role: 'admin' });
  const verifiedUsers = await User.countDocuments({ isEmailVerified: true });

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: oneWeekAgo } });
  const newUsersThisMonth = await User.countDocuments({ createdAt: { $gte: oneMonthAgo } });

  const actionStats = await ActivityLog.aggregate([
    { $group: { _id: '$action', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const recentActivities = await ActivityLog.find()
    .populate('userId', 'name email role')
    .sort({ createdAt: -1 })
    .limit(20);

  return res.status(STATUS_CODES.OK).json({
    success: true,
    stats: {
      totalUsers,
      totalAdmins,
      verifiedUsers,
      newUsersThisWeek,
      newUsersThisMonth,
    },
    actionStats,
    recentActivities,
  });
});