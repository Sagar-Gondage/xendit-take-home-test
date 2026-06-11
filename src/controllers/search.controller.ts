// src/controllers/search.controller.ts
import { Request, Response, NextFunction } from 'express';
import { SearchService } from '../services/search.service';
import { IRestaurantSearchFilters, IMenuSearchFilters } from '../types/search.types';

export class SearchController {
  private searchService: SearchService;

  constructor() {
    this.searchService = new SearchService();
  }

  public searchRestaurants = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters: IRestaurantSearchFilters = {
        search: req.query.search as string,
        cuisine: req.query.cuisine as string | string[],
        rating: req.query.rating ? Number(req.query.rating) : undefined,
        latitude: req.query.latitude ? Number(req.query.latitude) : undefined,
        longitude: req.query.longitude ? Number(req.query.longitude) : undefined,
        maxDistance: req.query.maxDistance ? Number(req.query.maxDistance) : undefined,
        isCurrentlyOpen: req.query.isCurrentlyOpen === 'true',
        maxDeliveryTime: req.query.maxDeliveryTime ? Number(req.query.maxDeliveryTime) : undefined,
        maxMinOrderValue: req.query.maxMinOrderValue ? Number(req.query.maxMinOrderValue) : undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      };

      const result = await this.searchService.searchRestaurants(filters);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public searchMenuItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters: IMenuSearchFilters = {
        search: req.query.search as string,
        restaurantId: req.query.restaurantId as string,
        category: req.query.category as string,
        dietaryRestrictions: req.query.dietaryRestrictions
          ? (Array.isArray(req.query.dietaryRestrictions)
            ? req.query.dietaryRestrictions as any
            : [req.query.dietaryRestrictions as any])
          : undefined,
        allergenFree: req.query.allergenFree
          ? (Array.isArray(req.query.allergenFree)
            ? req.query.allergenFree as any
            : [req.query.allergenFree as any])
          : undefined,
        spiceLevel: req.query.spiceLevel ? Number(req.query.spiceLevel) : undefined,
        maxSpiceLevel: req.query.maxSpiceLevel ? Number(req.query.maxSpiceLevel) : undefined,
        priceMin: req.query.priceMin ? Number(req.query.priceMin) : undefined,
        priceMax: req.query.priceMax ? Number(req.query.priceMax) : undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      };

      const result = await this.searchService.searchMenuItems(filters);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
