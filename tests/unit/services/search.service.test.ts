// tests/unit/services/search.service.test.ts
import '../../setup';
import '../../../src/models/restaurant.model';
import '../../../src/models/menu.model';
import { SearchService } from '../../../src/services/search.service';
import {
  createTestUser,
  createTestRestaurant,
  createTestMenuItem,
} from '../../helpers/test.helpers';
import { DietaryRestriction, Allergen } from '../../../src/types/search.types';

describe('SearchService', () => {
  let searchService: SearchService;
  let restaurantOwnerId: string;
  let restaurantId: string;

  beforeAll(() => {
    searchService = new SearchService();
  });

  beforeEach(async () => {
    const { user: owner } = await createTestUser({ role: 'restaurant', email: 'owner@test.com' });
    restaurantOwnerId = owner._id.toString();

    const restaurant = await createTestRestaurant(restaurantOwnerId);
    restaurantId = restaurant._id.toString();
  });

  describe('searchRestaurants', () => {
    it('should return all active restaurants with no filters', async () => {
      const result = await searchService.searchRestaurants({});
      expect(result.restaurants).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should filter by cuisine', async () => {
      const result = await searchService.searchRestaurants({ cuisine: 'italian' });
      expect(result.restaurants).toHaveLength(1);

      const result2 = await searchService.searchRestaurants({ cuisine: 'mexican' });
      expect(result2.restaurants).toHaveLength(0);
    });

    it('should filter by minimum rating', async () => {
      const result = await searchService.searchRestaurants({ rating: 4.0 });
      expect(result.restaurants).toHaveLength(1);

      const result2 = await searchService.searchRestaurants({ rating: 5.0 });
      expect(result2.restaurants).toHaveLength(0);
    });

    it('should filter by max delivery time', async () => {
      const result = await searchService.searchRestaurants({ maxDeliveryTime: 45 });
      expect(result.restaurants).toHaveLength(1);

      const result2 = await searchService.searchRestaurants({ maxDeliveryTime: 15 });
      expect(result2.restaurants).toHaveLength(0);
    });

    it('should filter by max minimum order value', async () => {
      const result = await searchService.searchRestaurants({ maxMinOrderValue: 20 });
      expect(result.restaurants).toHaveLength(1);

      const result2 = await searchService.searchRestaurants({ maxMinOrderValue: 5 });
      expect(result2.restaurants).toHaveLength(0);
    });

    it('should paginate results correctly', async () => {
      // Create additional restaurants
      for (let i = 0; i < 5; i++) {
        await createTestRestaurant(restaurantOwnerId, {
          name: `Restaurant ${i}`,
          email: `restaurant${i}@test.com`,
        });
      }

      const result = await searchService.searchRestaurants({ page: 1, limit: 3 });
      expect(result.restaurants).toHaveLength(3);
      expect(result.totalPages).toBe(2);
      expect(result.page).toBe(1);

      const result2 = await searchService.searchRestaurants({ page: 2, limit: 3 });
      expect(result2.restaurants).toHaveLength(3);
      expect(result2.page).toBe(2);
    });

    it('should limit max results to 100', async () => {
      const result = await searchService.searchRestaurants({ limit: 200 });
      // Should cap at 100 internally
      expect(result.page).toBe(1);
    });

    it('should handle multiple cuisine filters', async () => {
      await createTestRestaurant(restaurantOwnerId, {
        name: 'Mexican Place',
        cuisine: ['mexican'],
        email: 'mex@test.com',
      });

      const result = await searchService.searchRestaurants({ cuisine: ['italian', 'mexican'] });
      expect(result.restaurants).toHaveLength(2);
    });
  });

  describe('searchMenuItems', () => {
    beforeEach(async () => {
      await createTestMenuItem(restaurantId, {
        name: 'Vegan Salad',
        category: 'salad',
        price: 9.99,
        dietaryRestrictions: [DietaryRestriction.VEGAN, DietaryRestriction.GLUTEN_FREE],
        allergens: [],
        spiceLevel: 0,
      });
      await createTestMenuItem(restaurantId, {
        name: 'Spicy Chicken',
        category: 'main',
        price: 14.99,
        dietaryRestrictions: [],
        allergens: [Allergen.WHEAT],
        spiceLevel: 3,
      });
      await createTestMenuItem(restaurantId, {
        name: 'Nut-Free Pasta',
        category: 'pasta',
        price: 11.99,
        dietaryRestrictions: [DietaryRestriction.VEGETARIAN],
        allergens: [Allergen.WHEAT, Allergen.MILK],
        spiceLevel: 1,
      });
    });

    it('should return all menu items with no filters', async () => {
      const result = await searchService.searchMenuItems({});
      expect(result.items.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter by restaurant ID', async () => {
      const result = await searchService.searchMenuItems({ restaurantId });
      expect(result.items).toHaveLength(3);
    });

    it('should filter by category', async () => {
      const result = await searchService.searchMenuItems({ category: 'salad', restaurantId });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Vegan Salad');
    });

    it('should filter by dietary restrictions', async () => {
      const result = await searchService.searchMenuItems({
        dietaryRestrictions: [DietaryRestriction.VEGAN],
        restaurantId,
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Vegan Salad');
    });

    it('should filter by allergen-free', async () => {
      const result = await searchService.searchMenuItems({
        allergenFree: [Allergen.WHEAT],
        restaurantId,
      });
      // Only vegan salad has no wheat allergen
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Vegan Salad');
    });

    it('should filter by max spice level', async () => {
      const result = await searchService.searchMenuItems({
        maxSpiceLevel: 1,
        restaurantId,
      });
      expect(result.items).toHaveLength(2); // Vegan Salad (0) and Nut-Free Pasta (1)
    });

    it('should filter by price range', async () => {
      const result = await searchService.searchMenuItems({
        priceMin: 10,
        priceMax: 13,
        restaurantId,
      });
      expect(result.items).toHaveLength(1); // Nut-Free Pasta (11.99) falls in $10-$13 range
    });

    it('should paginate menu item results', async () => {
      const result = await searchService.searchMenuItems({ page: 1, limit: 2, restaurantId });
      expect(result.items).toHaveLength(2);
      expect(result.totalPages).toBe(2);
    });
  });
});
