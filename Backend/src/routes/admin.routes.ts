
import { Router } from "express";

import { authenticateAdmin } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/isadmin.js";
import { getDashboardStats } from "../controllers/admin.controller.js";

const router = Router();

router.use(authenticateAdmin);
router.use(isAdmin);

router.get("/dashboard", getDashboardStats);

export default router;
