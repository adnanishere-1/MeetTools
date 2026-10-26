import { Router } from 'express';
import { 
  resizeImage, 
  uploadAndResizeImage, 
  getJobResultStatus 
} from '../controllers/image.controller.js';
import { optionalAuthenticate } from '../middlewares/optionalAuth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { upload } from '../middlewares/multer.middleware.js';
import { apiLimiter } from '../middlewares/rate-limit.middleware.js';
import { resizeImageSchema } from '../validators/image.validator.js';

const router = Router();

// Sirf Rate Limiter global rakho
router.use(apiLimiter);

// Resize route - Guest aur Logged-in dono ke liye (Optional Auth ke sath)
router.post(
  '/resize',
  optionalAuthenticate, 
  upload.single('image'),
  validate(resizeImageSchema),
  resizeImage
);

// Upload & resize route
router.post(
  '/upload',
  optionalAuthenticate,
  upload.single('image'),
  validate(resizeImageSchema),
  uploadAndResizeImage
);

// Status check route
router.get(
  '/status/:jobId',
  getJobResultStatus
);

export default router;