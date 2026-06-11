// src/routes/loyalty.routes.ts
import { Router } from 'express';
import { LoyaltyController } from '../controllers/loyalty.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../types/user.types';

const router = Router();
const loyaltyController = new LoyaltyController();

// Public route - tier info
router.get('/tiers', loyaltyController.getTierConfig);

// Customer-only routes
router.get(
  '/account',
  authenticate,
  authorize(UserRole.CUSTOMER),
  loyaltyController.getAccount
);

router.get(
  '/history',
  authenticate,
  authorize(UserRole.CUSTOMER),
  loyaltyController.getPointHistory
);

router.get(
  '/rewards',
  authenticate,
  authorize(UserRole.CUSTOMER),
  loyaltyController.getAvailableRewards
);

router.post(
  '/redeem',
  authenticate,
  authorize(UserRole.CUSTOMER),
  loyaltyController.redeemReward
);

router.post(
  '/apply',
  authenticate,
  authorize(UserRole.CUSTOMER),
  loyaltyController.applyRedemption
);

export default router;
