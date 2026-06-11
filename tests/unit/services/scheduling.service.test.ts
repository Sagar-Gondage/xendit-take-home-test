// tests/unit/services/scheduling.service.test.ts
import '../../setup';
import { SchedulingService } from '../../../src/services/scheduling.service';
import {
  createTestUser,
  createTestRestaurant,
  createTestOrder,
} from '../../helpers/test.helpers';
import { OrderStatus } from '../../../src/types/order.types';
import Order from '../../../src/models/order.model';

// Setup MongoDB in-memory server
import '../../setup';

describe('SchedulingService', () => {
  let schedulingService: SchedulingService;
  let customerId: string;
  let restaurantId: string;

  beforeAll(() => {
    schedulingService = new SchedulingService();
  });

  beforeEach(async () => {
    const { user: customer } = await createTestUser({ role: 'customer', email: 'customer@test.com' });
    customerId = customer._id.toString();

    const { user: owner } = await createTestUser({ role: 'restaurant', email: 'owner@test.com' });
    const allDayHours = {
      monday: { open: '00:00', close: '23:59' },
      tuesday: { open: '00:00', close: '23:59' },
      wednesday: { open: '00:00', close: '23:59' },
      thursday: { open: '00:00', close: '23:59' },
      friday: { open: '00:00', close: '23:59' },
      saturday: { open: '00:00', close: '23:59' },
      sunday: { open: '00:00', close: '23:59' },
    };
    const restaurant = await createTestRestaurant(owner._id.toString(), { operatingHours: allDayHours });
    restaurantId = restaurant._id.toString();
  });

  describe('scheduleOrder', () => {
    it('should schedule an order for future delivery', async () => {
      const order = await createTestOrder(customerId, restaurantId);
      const scheduledFor = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now

      const result = await schedulingService.scheduleOrder(
        order._id.toString(),
        scheduledFor,
        customerId
      );

      expect(result.isScheduled).toBe(true);
      expect(result.scheduledFor).toEqual(scheduledFor);
      expect(result.scheduledStatus).toBe('scheduled');
    });

    it('should reject scheduling for a non-existent order', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const scheduledFor = new Date(Date.now() + 2 * 60 * 60 * 1000);

      await expect(
        schedulingService.scheduleOrder(fakeId, scheduledFor, customerId)
      ).rejects.toThrow('Order not found');
    });

    it('should reject scheduling for another user\'s order', async () => {
      const { user: otherUser } = await createTestUser({ email: 'other@test.com' });
      const order = await createTestOrder(customerId, restaurantId);
      const scheduledFor = new Date(Date.now() + 2 * 60 * 60 * 1000);

      await expect(
        schedulingService.scheduleOrder(order._id.toString(), scheduledFor, otherUser._id.toString())
      ).rejects.toThrow('You can only schedule your own orders');
    });

    it('should reject scheduling for non-pending orders', async () => {
      const order = await createTestOrder(customerId, restaurantId, {
        status: OrderStatus.CONFIRMED,
      });
      const scheduledFor = new Date(Date.now() + 2 * 60 * 60 * 1000);

      await expect(
        schedulingService.scheduleOrder(order._id.toString(), scheduledFor, customerId)
      ).rejects.toThrow('Only pending orders can be scheduled');
    });

    it('should reject scheduling less than 30 minutes from now', async () => {
      const order = await createTestOrder(customerId, restaurantId);
      const scheduledFor = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await expect(
        schedulingService.scheduleOrder(order._id.toString(), scheduledFor, customerId)
      ).rejects.toThrow('Scheduled time must be at least 30 minutes from now');
    });

    it('should reject scheduling more than 7 days from now', async () => {
      const order = await createTestOrder(customerId, restaurantId);
      const scheduledFor = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000); // 8 days

      await expect(
        schedulingService.scheduleOrder(order._id.toString(), scheduledFor, customerId)
      ).rejects.toThrow('Scheduled time cannot be more than 7 days from now');
    });
  });

  describe('getScheduledOrders', () => {
    it('should return scheduled orders for a user', async () => {
      const order1 = await createTestOrder(customerId, restaurantId, {
        isScheduled: true,
        scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000),
        scheduledStatus: 'scheduled',
      });
      const order2 = await createTestOrder(customerId, restaurantId, {
        isScheduled: true,
        scheduledFor: new Date(Date.now() + 4 * 60 * 60 * 1000),
        scheduledStatus: 'scheduled',
      });

      const results = await schedulingService.getScheduledOrders(customerId);
      expect(results).toHaveLength(2);
    });

    it('should not return cancelled scheduled orders', async () => {
      await createTestOrder(customerId, restaurantId, {
        isScheduled: true,
        scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000),
        scheduledStatus: 'cancelled',
      });

      const results = await schedulingService.getScheduledOrders(customerId);
      expect(results).toHaveLength(0);
    });

    it('should sort orders by scheduled time ascending', async () => {
      const later = new Date(Date.now() + 4 * 60 * 60 * 1000);
      const sooner = new Date(Date.now() + 2 * 60 * 60 * 1000);

      await createTestOrder(customerId, restaurantId, {
        isScheduled: true,
        scheduledFor: later,
        scheduledStatus: 'scheduled',
      });
      await createTestOrder(customerId, restaurantId, {
        isScheduled: true,
        scheduledFor: sooner,
        scheduledStatus: 'scheduled',
      });

      const results = await schedulingService.getScheduledOrders(customerId);
      expect(results[0].scheduledFor!.getTime()).toBeLessThan(results[1].scheduledFor!.getTime());
    });
  });

  describe('modifyScheduledOrder', () => {
    it('should update the scheduled time', async () => {
      const order = await createTestOrder(customerId, restaurantId, {
        isScheduled: true,
        scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000),
        scheduledStatus: 'scheduled',
      });

      const newTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
      const result = await schedulingService.modifyScheduledOrder(
        order._id.toString(),
        newTime,
        customerId
      );

      expect(result.scheduledFor).toEqual(newTime);
    });

    it('should reject modification of non-scheduled orders', async () => {
      const order = await createTestOrder(customerId, restaurantId);
      const newTime = new Date(Date.now() + 3 * 60 * 60 * 1000);

      await expect(
        schedulingService.modifyScheduledOrder(order._id.toString(), newTime, customerId)
      ).rejects.toThrow('Order is not in a modifiable scheduled state');
    });

    it('should reject modification by non-owner', async () => {
      const { user: otherUser } = await createTestUser({ email: 'other2@test.com' });
      const order = await createTestOrder(customerId, restaurantId, {
        isScheduled: true,
        scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000),
        scheduledStatus: 'scheduled',
      });

      const newTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
      await expect(
        schedulingService.modifyScheduledOrder(order._id.toString(), newTime, otherUser._id.toString())
      ).rejects.toThrow('You can only modify your own orders');
    });
  });

  describe('cancelScheduledOrder', () => {
    it('should cancel a scheduled order', async () => {
      const order = await createTestOrder(customerId, restaurantId, {
        isScheduled: true,
        scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000),
        scheduledStatus: 'scheduled',
      });

      const result = await schedulingService.cancelScheduledOrder(
        order._id.toString(),
        customerId
      );

      expect(result.scheduledStatus).toBe('cancelled');
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('should reject cancellation of non-scheduled orders', async () => {
      const order = await createTestOrder(customerId, restaurantId);

      await expect(
        schedulingService.cancelScheduledOrder(order._id.toString(), customerId)
      ).rejects.toThrow('Order is not in a cancellable scheduled state');
    });
  });

  describe('processScheduledOrders', () => {
    it('should process orders due within 15 minutes', async () => {
      // Create order scheduled for now (within processing window)
      await createTestOrder(customerId, restaurantId, {
        isScheduled: true,
        scheduledFor: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
        scheduledStatus: 'scheduled',
      });

      const processed = await schedulingService.processScheduledOrders();
      expect(processed).toHaveLength(1);
      expect(processed[0].scheduledStatus).toBe('processing');
      expect(processed[0].status).toBe(OrderStatus.CONFIRMED);
    });

    it('should not process orders scheduled far in the future', async () => {
      await createTestOrder(customerId, restaurantId, {
        isScheduled: true,
        scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
        scheduledStatus: 'scheduled',
      });

      const processed = await schedulingService.processScheduledOrders();
      expect(processed).toHaveLength(0);
    });

    it('should not process already processing orders', async () => {
      await createTestOrder(customerId, restaurantId, {
        isScheduled: true,
        scheduledFor: new Date(Date.now() + 5 * 60 * 1000),
        scheduledStatus: 'processing',
      });

      const processed = await schedulingService.processScheduledOrders();
      expect(processed).toHaveLength(0);
    });
  });
});
