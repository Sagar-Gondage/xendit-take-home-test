// src/routes/scheduling.routes.ts
import { Router } from 'express';
import { SchedulingController } from '../controllers/scheduling.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../types/user.types';

const router = Router();
const schedulingController = new SchedulingController();

// All scheduling routes require authentication as customer
router.post(
  '/',
  authenticate,
  authorize(UserRole.CUSTOMER),
  schedulingController.scheduleOrder
);

router.get(
  '/',
  authenticate,
  authorize(UserRole.CUSTOMER),
  schedulingController.getScheduledOrders
);

router.put(
  '/:id',
  authenticate,
  authorize(UserRole.CUSTOMER),
  schedulingController.modifyScheduledOrder
);

router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.CUSTOMER),
  schedulingController.cancelScheduledOrder
);

export default router;
