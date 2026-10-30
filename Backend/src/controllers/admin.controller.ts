
import { Response } from "express";
import { User } from "../models/User.model.js";
import { ActivityLog } from "../models/ActivityLog.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { STATUS_CODES } from "../utils/statusCodes.js";

export const getDashboardStats = asyncHandler(
  async (req: any, res: Response) => {
    const totalUsers = await User.countDocuments();

    const totalAdmins = await User.countDocuments({
      role: "admin",
    });

    const verifiedUsers = await User.countDocuments({
      isEmailVerified: true,
    });

    const oneWeekAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    );

    const oneMonthAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    );

    const newUsersThisWeek = await User.countDocuments({
      createdAt: { $gte: oneWeekAgo },
    });

    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: oneMonthAgo },
    });

    // Count the actual tool actions stored by
    // ActivityLog.model.ts.
    const toolActions = [
      "TOOL_USE",
      "IMAGE_RESIZE",
      "IMAGE_CLEAN",
    ];

    const actionStats = await ActivityLog.aggregate([
      {
        $match: {
          action: { $in: toolActions },
        },
      },
      {
        $addFields: {
          resolvedToolId: {
            $ifNull: [
              "$details.toolId",
              {
                $switch: {
                  branches: [
                    {
                      case: {
                        $eq: ["$action", "IMAGE_RESIZE"],
                      },
                      then: "Image Resize",
                    },
                    {
                      case: {
                        $eq: ["$action", "IMAGE_CLEAN"],
                      },
                      then: "Image Clean",
                    },
                  ],
                  default: "Other Tool",
                },
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$resolvedToolId",
          count: { $sum: 1 },
          guestCount: {
            $sum: {
              $cond: [
                { $eq: [{ $ifNull: ["$userId", null] }, null] },
                1,
                0,
              ],
            },
          },
          userCount: {
            $sum: {
              $cond: [
                { $ne: [{ $ifNull: ["$userId", null] }, null] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Show all activity types in Recent Activity,
    // including registration and login.
    const recentLogs = await ActivityLog.find()
      .populate("userId", "name email role")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const totalToolUses = actionStats.reduce(
      (sum, item) => sum + item.count,
      0
    );

    const guestUses = actionStats.reduce(
      (sum, item) => sum + item.guestCount,
      0
    );

    const loggedInUses = actionStats.reduce(
      (sum, item) => sum + item.userCount,
      0
    );

    const recentActivities = recentLogs.map(
      (log: any) => ({
        _id: log._id,
        userId: log.userId,
        action: log.action,
        toolId:
          log.details?.toolId ||
          (log.action === "IMAGE_RESIZE"
            ? "Image Resize"
            : log.action === "IMAGE_CLEAN"
              ? "Image Clean"
              : log.action === "USER_REGISTER"
                ? "Registration"
                : log.action === "USER_LOGIN"
                  ? "Login"
                  : log.action === "CREDIT_DEDUCT"
                    ? "Credits"
                    : "Unknown"),
        visitorType: log.userId ? "user" : "guest",
        createdAt: log.createdAt,
      })
    );

    return res.status(STATUS_CODES.OK).json({
      success: true,
      stats: {
        totalUsers,
        totalAdmins,
        verifiedUsers,
        newUsersThisWeek,
        newUsersThisMonth,
        totalToolUses,
        guestUses,
        loggedInUses,
      },
      actionStats,
      recentActivities,
    });
  }
);
