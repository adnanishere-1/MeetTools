
import { Router } from 'express';
import {
  register,
  verifyOTP,
  resendOTP,
  login,
  logout,
} from '../controllers/auth.controller.js';

import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { apiLimiter } from '../middlewares/rate-limit.middleware.js';

import {
  registerSchema,
  verifyOTPSchema,
  resendOTPSchema,
  loginSchema,
} from '../validators/auth.validator.js';

const router = Router();

router.use(apiLimiter);

router.post('/register', validate(registerSchema), register);
router.post('/verify-otp', validate(verifyOTPSchema), verifyOTP);
router.post('/resend-otp', validate(resendOTPSchema), resendOTP);
router.post('/login', validate(loginSchema), login);

router.post('/logout', authenticate, logout);

export default router;
