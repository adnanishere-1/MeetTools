import { Router } from 'express';
import { getDashboardStats } from '../controllers/admin.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { isAdmin } from '../middlewares/isadmin.js';

const router = Router();

router.use(authenticate, isAdmin);

router.get('/dashboard', getDashboardStats);

export default router;