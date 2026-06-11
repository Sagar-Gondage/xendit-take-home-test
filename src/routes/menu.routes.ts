// src/routes/menu.routes.ts
import { Router } from 'express';
import { MenuController } from '../controllers/menu.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../types/user.types';

const router = Router();
const menuController = new MenuController();

// Public routes
router.get('/restaurant/:restaurantId', menuController.getMenuItemsByRestaurant);
router.get('/search', menuController.searchMenuItems);
router.get('/:id', menuController.getMenuItemById);

// Protected routes - Restaurant owner only
router.post(
  '/',
  authenticate,
  authorize(UserRole.RESTAURANT, UserRole.ADMIN),
  menuController.createMenuItem
);

router.put(
  '/:id',
  authenticate,
  authorize(UserRole.RESTAURANT, UserRole.ADMIN),
  menuController.updateMenuItem
);

router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.RESTAURANT, UserRole.ADMIN),
  menuController.deleteMenuItem
);

export default router;
