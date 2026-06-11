// src/routes/order.routes.ts
import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../types/user.types';

const router = Router();
const orderController = new OrderController();

// Protected routes - Customer only
router.post(
  '/',
  authenticate,
  authorize(UserRole.CUSTOMER),
  orderController.createOrder
);

// Protected routes - All authenticated users
router.get(
  '/',
  authenticate,
  orderController.getAllOrders
);

router.get(
  '/:id',
  authenticate,
  orderController.getOrderById
);

router.put(
  '/:id/status',
  authenticate,
  orderController.updateOrderStatus
);

router.delete(
  '/:id',
  authenticate,
  orderController.cancelOrder
);

// Protected routes - Admin only
router.put(
  '/:id/assign',
  authenticate,
  authorize(UserRole.ADMIN),
  orderController.assignDeliveryPerson
);

export default router;
