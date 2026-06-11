// src/routes/notification.routes.ts
import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const notificationController = new NotificationController();

// All notification routes require authentication
router.get(
  '/',
  authenticate,
  notificationController.getNotifications
);

router.put(
  '/read',
  authenticate,
  notificationController.markAsRead
);

router.get(
  '/preferences',
  authenticate,
  notificationController.getPreferences
);

router.put(
  '/preferences',
  authenticate,
  notificationController.updatePreferences
);

export default router;
