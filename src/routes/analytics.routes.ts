// src/routes/analytics.routes.ts
import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../types/user.types';

const router = Router();
const analyticsController = new AnalyticsController();

// Analytics routes - restricted to restaurant owners and admin
router.get(
  '/dashboard',
  authenticate,
  authorize(UserRole.RESTAURANT, UserRole.ADMIN),
  analyticsController.getDashboard
);

router.get(
  '/sales',
  authenticate,
  authorize(UserRole.RESTAURANT, UserRole.ADMIN),
  analyticsController.getSalesData
);

router.get(
  '/popular-items',
  authenticate,
  authorize(UserRole.RESTAURANT, UserRole.ADMIN),
  analyticsController.getPopularItems
);

router.get(
  '/peak-hours',
  authenticate,
  authorize(UserRole.RESTAURANT, UserRole.ADMIN),
  analyticsController.getPeakHours
);

router.get(
  '/delivery-performance',
  authenticate,
  authorize(UserRole.RESTAURANT, UserRole.ADMIN),
  analyticsController.getDeliveryPerformance
);

router.get(
  '/customer-retention',
  authenticate,
  authorize(UserRole.RESTAURANT, UserRole.ADMIN),
  analyticsController.getCustomerRetention
);

router.get(
  '/export',
  authenticate,
  authorize(UserRole.RESTAURANT, UserRole.ADMIN),
  analyticsController.exportData
);

export default router;
