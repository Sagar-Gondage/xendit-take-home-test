// src/services/search.service.ts
import Restaurant from '../models/restaurant.model';
import MenuItem from '../models/menu.model';
import { IRestaurantSearchFilters, IMenuSearchFilters } from '../types/search.types';
import { IRestaurant } from '../types/restaurant.types';
import { IMenuItem } from '../types/menu.types';

export class SearchService {
  /**
   * Advanced restaurant search with geospatial, time-based, and multi-criteria filtering
   */
  public async searchRestaurants(filters: IRestaurantSearchFilters): Promise<{
    restaurants: IRestaurant[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const query: any = { isActive: true };

    // Text search
    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    // Cuisine filter
    if (filters.cuisine) {
      const cuisines = Array.isArray(filters.cuisine) ? filters.cuisine : [filters.cuisine];
      query.cuisine = { $in: cuisines };
    }

    // Rating filter
    if (filters.rating) {
      query.rating = { $gte: Number(filters.rating) };
    }

    // Delivery time filter
    if (filters.maxDeliveryTime) {
      query.averageDeliveryTime = { $lte: Number(filters.maxDeliveryTime) };
    }

    // Minimum order value filter
    if (filters.maxMinOrderValue !== undefined) {
      query.minimumOrderValue = { $lte: Number(filters.maxMinOrderValue) };
    }

    // Currently open filter
    if (filters.isCurrentlyOpen) {
      const now = new Date();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = dayNames[now.getDay()];
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      query[`operatingHours.${currentDay}.open`] = { $lte: currentTime };
      query[`operatingHours.${currentDay}.close`] = { $gte: currentTime };
    }

    // Geospatial query (distance)
    if (filters.latitude && filters.longitude) {
      const maxDistance = filters.maxDistance || 5000; // default 5km
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [filters.longitude, filters.latitude],
          },
          $maxDistance: maxDistance,
        },
      };
    }

    // Sorting
    let sort: any = {};
    if (filters.sortBy) {
      const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
      switch (filters.sortBy) {
        case 'rating':
          sort = { rating: sortOrder };
          break;
        case 'deliveryTime':
          sort = { averageDeliveryTime: sortOrder };
          break;
        case 'minOrderValue':
          sort = { minimumOrderValue: sortOrder };
          break;
        case 'distance':
          // Distance sorting is handled by $near automatically
          break;
        default:
          sort = { rating: -1 };
      }
    } else {
      sort = { rating: -1 };
    }

    const [restaurants, total] = await Promise.all([
      Restaurant.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Restaurant.countDocuments(query),
    ]);

    return {
      restaurants: restaurants as IRestaurant[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Advanced menu item search with dietary, allergen, and popularity filters
   */
  public async searchMenuItems(filters: IMenuSearchFilters): Promise<{
    items: IMenuItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const query: any = { isAvailable: true };

    // Text search
    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    // Restaurant filter
    if (filters.restaurantId) {
      query.restaurantId = filters.restaurantId;
    }

    // Category filter
    if (filters.category) {
      query.category = filters.category;
    }

    // Dietary restrictions filter (items must have ALL specified restrictions)
    if (filters.dietaryRestrictions && filters.dietaryRestrictions.length > 0) {
      query.dietaryRestrictions = { $all: filters.dietaryRestrictions };
    }

    // Allergen-free filter (items must NOT contain any specified allergens)
    if (filters.allergenFree && filters.allergenFree.length > 0) {
      query.allergens = { $nin: filters.allergenFree };
    }

    // Spice level filter
    if (filters.spiceLevel !== undefined) {
      query.spiceLevel = Number(filters.spiceLevel);
    } else if (filters.maxSpiceLevel !== undefined) {
      query.spiceLevel = { $lte: Number(filters.maxSpiceLevel) };
    }

    // Price range filter
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      query.price = {};
      if (filters.priceMin !== undefined) {
        query.price.$gte = Number(filters.priceMin);
      }
      if (filters.priceMax !== undefined) {
        query.price.$lte = Number(filters.priceMax);
      }
    }

    // Sorting
    let sort: any = {};
    if (filters.sortBy) {
      const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
      switch (filters.sortBy) {
        case 'price':
          sort = { price: sortOrder };
          break;
        case 'popularity':
          sort = { popularity: sortOrder };
          break;
        case 'rating':
          sort = { averageRating: sortOrder };
          break;
        case 'name':
          sort = { name: sortOrder };
          break;
        default:
          sort = { popularity: -1 };
      }
    } else {
      sort = { popularity: -1 };
    }

    const [items, total] = await Promise.all([
      MenuItem.find(query).sort(sort).skip(skip).limit(limit).lean(),
      MenuItem.countDocuments(query),
    ]);

    return {
      items: items as IMenuItem[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
