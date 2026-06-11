// src/types/search.types.ts

export enum DietaryRestriction {
  VEGETARIAN = 'vegetarian',
  VEGAN = 'vegan',
  GLUTEN_FREE = 'gluten_free',
  HALAL = 'halal',
  KOSHER = 'kosher',
  DAIRY_FREE = 'dairy_free',
  NUT_FREE = 'nut_free',
}

export enum Allergen {
  PEANUTS = 'peanuts',
  TREE_NUTS = 'tree_nuts',
  MILK = 'milk',
  EGGS = 'eggs',
  WHEAT = 'wheat',
  SOY = 'soy',
  FISH = 'fish',
  SHELLFISH = 'shellfish',
  SESAME = 'sesame',
}

export enum SpiceLevel {
  NONE = 0,
  MILD = 1,
  MEDIUM = 2,
  HOT = 3,
  EXTRA_HOT = 4,
}

export interface IRestaurantSearchFilters {
  search?: string;
  cuisine?: string | string[];
  rating?: number;
  latitude?: number;
  longitude?: number;
  maxDistance?: number; // in meters
  isCurrentlyOpen?: boolean;
  maxDeliveryTime?: number; // in minutes
  minOrderValue?: number;
  maxMinOrderValue?: number;
  sortBy?: 'rating' | 'distance' | 'deliveryTime' | 'minOrderValue';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface IMenuSearchFilters {
  search?: string;
  restaurantId?: string;
  category?: string;
  dietaryRestrictions?: DietaryRestriction[];
  allergenFree?: Allergen[];
  spiceLevel?: number;
  maxSpiceLevel?: number;
  priceMin?: number;
  priceMax?: number;
  sortBy?: 'price' | 'popularity' | 'rating' | 'name';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
