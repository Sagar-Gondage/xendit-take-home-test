// src/routes/restaurant.routes.ts
import { Router } from 'express';
import { RestaurantController } from '../controllers/restaurant.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../types/user.types';

const router = Router();
const restaurantController = new RestaurantController();

// Public routes
router.get('/', restaurantController.getAllRestaurants);
router.get('/nearby', restaurantController.getNearbyRestaurants);
router.get('/:id', restaurantController.getRestaurantById);

// Protected routes - Restaurant owner only
router.post(
  '/',
  authenticate,
  authorize(UserRole.RESTAURANT, UserRole.ADMIN),
  restaurantController.createRestaurant
);

router.put(
  '/:id',
  authenticate,
  authorize(UserRole.RESTAURANT, UserRole.ADMIN),
  restaurantController.updateRestaurant
);

router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.RESTAURANT, UserRole.ADMIN),
  restaurantController.deleteRestaurant
);

export default router;
