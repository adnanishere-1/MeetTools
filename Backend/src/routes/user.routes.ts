
import { Router } from 'express';

import {
  getProfile,
  updateProfile,
  getUserCredits,
  updateCookieConsent,
} from '../controllers/user.controller.js';

import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { apiLimiter } from '../middlewares/rate-limit.middleware.js';
import { updateProfileSchema } from '../validators/user.validator.js';

const router = Router();

router.use(apiLimiter);
router.use(authenticate);

router.get('/me', getProfile);

router.put(
  '/me',
  validate(updateProfileSchema),
  updateProfile
);

router.get('/credits', getUserCredits);
router.put('/cookie-consent', updateCookieConsent);

export default router;
