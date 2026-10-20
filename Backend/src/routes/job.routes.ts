import { Router } from 'express';
import { getJobStatus, getUserJobs } from '../controllers/job.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { apiLimiter } from '../middlewares/rate-limit.middleware.js';
import {
  getJobByIdSchema,
  getUserJobsQuerySchema,
} from '../validators/job.validator.js';

const router = Router();

// Sabhi Job routes authenticated aur rate limited hain
router.use(apiLimiter);
router.use(authenticate);


router.get('/', validate(getUserJobsQuerySchema), getUserJobs);


router.get('/:jobId', validate(getJobByIdSchema), getJobStatus);

export default router;