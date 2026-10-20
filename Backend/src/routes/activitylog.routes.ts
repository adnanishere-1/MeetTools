import { Router } from 'express';
import { getUserActivities } from '../controllers/activity.controller';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { apiLimiter } from '../middlewares/rate-limit.middleware';
import { getActivityLogsQuerySchema } from '../validators/activitylog.validator';

const router = Router();

// Secure all activity routes with rate limiting & authentication
router.use(apiLimiter);
router.use(authenticate);


router.get('/', validate(getActivityLogsQuerySchema), getUserActivities);

export default router;