import { Router } from 'express';
import { resizeImage, uploadAndResizeImage } from '../controllers/image.controller';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { upload } from '../middlewares/multer.middleware.js';
import { apiLimiter } from '../middlewares/rate-limit.middleware';
import { resizeImageSchema } from '../validators/image.validator.js';

const router = Router();

// Saare image processing routes authenticated aur rate limited hain
router.use(apiLimiter);
router.use(authenticate);


router.post(
  '/resize',
  upload.single('image'),
  validate(resizeImageSchema),
  resizeImage
);


router.post(
  '/upload',
  upload.single('image'),
  validate(resizeImageSchema),
  uploadAndResizeImage
);

export default router;