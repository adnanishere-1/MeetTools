import { Router } from 'express';
import { 
  resizeImage, 
  uploadAndResizeImage, 
  getJobResultStatus 
} from '../controllers/image.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { upload } from '../middlewares/multer.middleware.js';
import { apiLimiter } from '../middlewares/rate-limit.middleware.js';
import { resizeImageSchema } from '../validators/image.validator.js';

const router = Router();

// Rate limit and authenticate all image routes
router.use(apiLimiter);
router.use(authenticate);

// Resize route (checks 15 images/day limit)
router.post(
  '/resize',
  upload.single('image'),
  validate(resizeImageSchema),
  resizeImage
);

// Upload & resize route (checks 15 images/day limit)
router.post(
  '/upload',
  upload.single('image'),
  validate(resizeImageSchema),
  uploadAndResizeImage
);

// Check job processing status and get preview/download link
router.get(
  '/status/:jobId',
  getJobResultStatus
);

export default router;