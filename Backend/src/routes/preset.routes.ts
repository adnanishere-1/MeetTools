import { Router } from 'express';
import {
  createPreset,
  getUserPresets,
  deletePreset,
} from '../controllers/preset.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { apiLimiter } from '../middlewares/rate-limit.middleware.js';
import {
  createPresetSchema,
  presetIdParamSchema,
} from '../validators/preset.validator.js';

const router = Router();

router.use(apiLimiter);
router.use(authenticate);

router.post('/', validate(createPresetSchema), createPreset);
router.get('/', getUserPresets);
router.delete('/:presetId', validate(presetIdParamSchema), deletePreset);

export default router;