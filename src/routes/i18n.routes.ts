// src/routes/i18n.routes.ts
import { Router } from 'express';
import { I18nController } from '../controllers/i18n.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../types/user.types';

const router = Router();
const i18nController = new I18nController();

// Public routes
router.get('/languages', i18nController.getSupportedLanguages);
router.get('/messages', i18nController.getSystemMessages);
router.get('/:entityType/:entityId', i18nController.getTranslation);
router.get('/:entityType/:entityId/all', i18nController.getAllTranslations);

// Admin/Restaurant routes for managing translations
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.RESTAURANT),
  i18nController.upsertTranslation
);

router.delete(
  '/:entityType/:entityId',
  authenticate,
  authorize(UserRole.ADMIN),
  i18nController.deleteTranslation
);

export default router;
