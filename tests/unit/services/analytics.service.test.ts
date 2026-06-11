// tests/unit/services/analytics.service.test.ts
import '../../setup';
import { AnalyticsService } from '../../../src/services/analytics.service';
import {
  createTestUser,
  createTestRestaurant,
  createTestOrder,
} from '../../helpers/test.helpers';
import { OrderStatus, PaymentStatus } from '../../../src/types/order.types';
import { TimeFrame } from '../../../src/types/analytics.types';
import Order from '../../../src/models/order.model';
import mongoose from 'mongoose';

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let ownerId: string;
  let restaurantId: string;
  let customerId: string;

  beforeAll(() => {
    analyticsService = new AnalyticsService();
  });

  beforeEach(async () => {
    const { user: owner } = await createTestUser({ role: 'restaurant', email: 'owner@test.com' });
    ownerId = owner._id.toString();

    const restaurant = await createTestRestaurant(ownerId);
    restaurantId = restaurant._id.toString();

    const { user: customer } = await createTestUser({ role: 'customer', email: 'customer@test.com' });
    customerId = customer._id.toString();
  });

  describe('getDashboardSummary', () => {
    beforeEach(async () => {
      // Create completed orders
      for (let i = 0; i < 5; i++) {
        await createTestOrder(customerId, restaurantId, {
          status: OrderStatus.DELIVERED,
          paymentStatus: PaymentStatus.COMPLETED,
          total: 30 + i * 5,
        });
      }
    });

    it('should return dashboard summary for restaurant owner', async () => {
      const dashboard = await analyticsService.getDashboardSummary(
        restaurantId,
        ownerId,
        'restaurant'
      );

      expect(dashboard).toBeDefined();
      expect(dashboard.totalOrders).toBe(5);
      expect(dashboard.totalRevenue).toBeGreaterThan(0);
      expect(dashboard.averageOrderValue).toBeGreaterThan(0);
    });

    it('should return dashboard summary for admin', async () => {
      const { user: admin } = await createTestUser({ role: 'admin', email: 'admin@test.com' });

      const dashboard = await analyticsService.getDashboardSummary(
        restaurantId,
        admin._id.toString(),
        'admin'
      );

      expect(dashboard).toBeDefined();
      expect(dashboard.totalOrders).toBe(5);
    });

    it('should deny access to non-owners', async () => {
      const { user: otherOwner } = await createTestUser({ role: 'restaurant', email: 'other@test.com' });

      await expect(
        analyticsService.getDashboardSummary(restaurantId, otherOwner._id.toString(), 'restaurant')
      ).rejects.toThrow('You do not have access');
    });

    it('should deny access to customers', async () => {
      await expect(
        analyticsService.getDashboardSummary(restaurantId, customerId, 'customer')
      ).rejects.toThrow('You do not have permission');
    });
  });

  describe('getSalesData', () => {
    beforeEach(async () => {
      // Create orders spread across days
      for (let i = 0; i < 10; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        await createTestOrder(customerId, restaurantId, {
          status: OrderStatus.DELIVERED,
          paymentStatus: PaymentStatus.COMPLETED,
          total: 25 + Math.random() * 20,
          createdAt: date,
        });
      }
    });

    it('should return daily sales data', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const salesData = await analyticsService.getSalesData(
        restaurantId,
        TimeFrame.DAY,
        startDate,
        endDate,
        ownerId,
        'restaurant'
      );

      expect(salesData.length).toBeGreaterThan(0);
      expect(salesData[0]).toHaveProperty('period');
      expect(salesData[0]).toHaveProperty('totalOrders');
      expect(salesData[0]).toHaveProperty('totalRevenue');
      expect(salesData[0]).toHaveProperty('averageOrderValue');
    });

    it('should return empty array for time range with no orders', async () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2020-01-31');

      const salesData = await analyticsService.getSalesData(
        restaurantId,
        TimeFrame.DAY,
        startDate,
        endDate,
        ownerId,
        'restaurant'
      );

      expect(salesData).toHaveLength(0);
    });
  });

  describe('getPopularItems', () => {
    beforeEach(async () => {
      // Create orders with different items
      const item1Id = new mongoose.Types.ObjectId();
      const item2Id = new mongoose.Types.ObjectId();
      for (let i = 0; i < 5; i++) {
        await createTestOrder(customerId, restaurantId, {
          status: OrderStatus.DELIVERED,
          items: [
            { menuItemId: item1Id, name: 'Popular Burger', price: 15, quantity: 3 },
            { menuItemId: item2Id, name: 'Fries', price: 5, quantity: 1 },
          ],
        });
      }
    });

    it('should return popular items sorted by order count', async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const items = await analyticsService.getPopularItems(restaurantId, since);

      expect(items.length).toBeGreaterThan(0);
      expect(items[0].name).toBe('Popular Burger');
      expect(items[0].totalOrdered).toBe(15); // 3 * 5 orders
    });

    it('should respect limit parameter', async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const items = await analyticsService.getPopularItems(restaurantId, since, 1);
      expect(items).toHaveLength(1);
    });
  });

  describe('getPeakHours', () => {
    it('should return peak ordering hours', async () => {
      // Create orders
      for (let i = 0; i < 3; i++) {
        await createTestOrder(customerId, restaurantId, {
          status: OrderStatus.DELIVERED,
        });
      }

      const since = new Date();
      since.setDate(since.getDate() - 30);

      const peakHours = await analyticsService.getPeakHours(restaurantId, since);

      expect(peakHours.length).toBeGreaterThan(0);
      expect(peakHours[0]).toHaveProperty('hour');
      expect(peakHours[0]).toHaveProperty('orderCount');
    });
  });

  describe('getDeliveryPerformance', () => {
    it('should return delivery metrics', async () => {
      // Create delivered orders with timing
      const now = new Date();
      for (let i = 0; i < 3; i++) {
        const createdAt = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
        const estimated = new Date(createdAt.getTime() + 45 * 60 * 1000); // 45 min estimate
        const actual = new Date(createdAt.getTime() + 40 * 60 * 1000); // 40 min actual

        await createTestOrder(customerId, restaurantId, {
          status: OrderStatus.DELIVERED,
          createdAt,
          estimatedDeliveryTime: estimated,
          actualDeliveryTime: actual,
        });
      }

      const since = new Date();
      since.setDate(since.getDate() - 30);

      const performance = await analyticsService.getDeliveryPerformance(restaurantId, since);

      expect(performance).toHaveProperty('averageDeliveryTime');
      expect(performance).toHaveProperty('onTimeDeliveryRate');
      expect(performance).toHaveProperty('totalDeliveries');
    });

    it('should return zero values when no deliveries exist', async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const performance = await analyticsService.getDeliveryPerformance(restaurantId, since);

      expect(performance.averageDeliveryTime).toBe(0);
      expect(performance.totalDeliveries).toBe(0);
    });
  });

  describe('getCustomerRetention', () => {
    it('should calculate retention metrics', async () => {
      // Create orders from the same customer in two periods
      const currentPeriod = new Date();
      const previousPeriod = new Date();
      previousPeriod.setDate(previousPeriod.getDate() - 35);

      await createTestOrder(customerId, restaurantId, {
        createdAt: previousPeriod,
        status: OrderStatus.DELIVERED,
      });
      await createTestOrder(customerId, restaurantId, {
        createdAt: currentPeriod,
        status: OrderStatus.DELIVERED,
      });

      const since = new Date();
      since.setDate(since.getDate() - 30);

      const retention = await analyticsService.getCustomerRetention(restaurantId, since);

      expect(retention).toHaveProperty('newCustomers');
      expect(retention).toHaveProperty('returningCustomers');
      expect(retention).toHaveProperty('retentionRate');
    });
  });
});
