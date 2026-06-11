// src/routes/search.routes.ts
import { Router } from 'express';
import { SearchController } from '../controllers/search.controller';

const router = Router();
const searchController = new SearchController();

// Public routes - no auth required for search
router.get('/restaurants', searchController.searchRestaurants);
router.get('/menu', searchController.searchMenuItems);

export default router;
