// src/routes/payment.routes.ts
import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../types/user.types';

const router = Router();
const paymentController = new PaymentController();

// Customer routes
router.post(
  '/process',
  authenticate,
  authorize(UserRole.CUSTOMER),
  paymentController.processPayment
);

// Public routes (with authentication)
router.get(
  '/:orderId/status',
  authenticate,
  paymentController.getPaymentStatus
);

// Admin and restaurant owner routes
router.post(
  '/:orderId/refund',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.RESTAURANT),
  paymentController.refundPayment
);

export default router;
