// src/routes/delivery.routes.ts
import { Router } from 'express';
import { DeliveryController } from '../controllers/delivery.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../types/user.types';

const router = Router();
const deliveryController = new DeliveryController();

// Admin routes
router.get(
  '/personnel',
  authenticate,
  authorize(UserRole.ADMIN),
  deliveryController.getAvailableDeliveryPersonnel
);

// Delivery personnel routes
router.get(
  '/orders',
  authenticate,
  authorize(UserRole.DELIVERY),
  deliveryController.getOrdersForDelivery
);

router.post(
  '/location',
  authenticate,
  authorize(UserRole.DELIVERY),
  deliveryController.updateDeliveryLocation
);

// Public routes (with authentication)
router.get(
  '/orders/:orderId/track',
  authenticate,
  deliveryController.getDeliveryLocationUpdates
);

router.get(
  '/orders/:orderId/eta',
  authenticate,
  deliveryController.estimateDeliveryTime
);

export default router;
