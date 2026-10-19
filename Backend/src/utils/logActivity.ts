import { ActivityLog } from '../models/ActivityLog.model.js';
import { logger } from './logger.js';

interface LogActivityParams {
  userId: string;
  action: 'USER_REGISTER' | 'USER_LOGIN' | 'IMAGE_RESIZE' | 'IMAGE_CLEAN' | 'CREDIT_DEDUCT';
  details?: Record<string, any>;
  ipAddress?: string;
}

export const logActivity = async ({ userId, action, details = {}, ipAddress }: LogActivityParams) => {
  try {
    await ActivityLog.create({
      userId,
      action,
      details,
      ipAddress,
    });
  } catch (error: any) {
    logger.error(`❌ Failed to create activity log: ${error.message}`);
  }
};