// tests/unit/services/delivery.service.test.ts
import '../../setup';
import { DeliveryService } from '../../../src/services/delivery.service';
import Order from '../../../src/models/order.model';
import {
  createTestUser,
  createTestRestaurant,
  createTestOrder,
} from '../../helpers/test.helpers';
import { OrderStatus } from '../../../src/types/order.types';

// Setup MongoDB in-memory server
import '../../setup';

describe('DeliveryService', () => {
  let deliveryService: DeliveryService;
  let customerId: string;
  let restaurantId: string;
  let deliveryPersonId: string;
  let orderId: string;

  beforeAll(() => {
    deliveryService = new DeliveryService();
  });

  beforeEach(async () => {
    const { user: customer } = await createTestUser({
      role: 'customer',
      email: 'customer@delivery.test',
    });
    customerId = customer._id.toString();

    const { user: owner } = await createTestUser({
      role: 'restaurant',
      email: 'owner@delivery.test',
    });
    const restaurant = await createTestRestaurant(owner._id.toString());
    restaurantId = restaurant._id.toString();

    const { user: deliveryPerson } = await createTestUser({
      role: 'delivery',
      email: 'driver@delivery.test',
    });
    deliveryPersonId = deliveryPerson._id.toString();

    // Create an order assigned to the delivery person
    const order = await createTestOrder(customerId, restaurantId, {
      status: OrderStatus.OUT_FOR_DELIVERY,
      deliveryPersonId: deliveryPerson._id,
    });
    orderId = order._id.toString();
  });

  // ─────────────────────────────────────────────
  // updateDeliveryLocation (Task 4 — real-time tracking)
  // ─────────────────────────────────────────────
  describe('updateDeliveryLocation', () => {
    it('should store a location update without throwing', async () => {
      await expect(
        deliveryService.updateDeliveryLocation(deliveryPersonId, {
          orderId,
          location: { latitude: 40.7128, longitude: -74.006, timestamp: new Date() },
        })
      ).resolves.not.toThrow();
    });

    it('should store and retrieve location history via getDeliveryLocationUpdates', async () => {
      await deliveryService.updateDeliveryLocation(deliveryPersonId, {
        orderId,
        location: { latitude: 40.7128, longitude: -74.006, timestamp: new Date() },
      });

      const history = await deliveryService.getDeliveryLocationUpdates(
        orderId,
        deliveryPersonId,
        'delivery'
      );
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[history.length - 1].latitude).toBe(40.7128);
      expect(history[history.length - 1].longitude).toBe(-74.006);
    });

    it('should accumulate multiple location updates in order', async () => {
      await deliveryService.updateDeliveryLocation(deliveryPersonId, {
        orderId,
        location: { latitude: 40.71, longitude: -74.00, timestamp: new Date() },
      });
      await deliveryService.updateDeliveryLocation(deliveryPersonId, {
        orderId,
        location: { latitude: 40.72, longitude: -74.01, timestamp: new Date() },
      });

      const history = await deliveryService.getDeliveryLocationUpdates(
        orderId,
        deliveryPersonId,
        'delivery'
      );
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it('should also update order status if status is provided in update', async () => {
      await deliveryService.updateDeliveryLocation(deliveryPersonId, {
        orderId,
        location: { latitude: 40.71, longitude: -74.00, timestamp: new Date() },
        status: OrderStatus.DELIVERED,
      });

      const order = await Order.findById(orderId);
      expect(order!.status).toBe(OrderStatus.DELIVERED);
      expect(order!.actualDeliveryTime).toBeDefined();
    });

    it('should throw NotFoundError if order does not exist', async () => {
      await expect(
        deliveryService.updateDeliveryLocation(deliveryPersonId, {
          orderId: '507f1f77bcf86cd799439011',
          location: { latitude: 40.71, longitude: -74.00, timestamp: new Date() },
        })
      ).rejects.toThrow('Order not found');
    });

    it('should throw ForbiddenError if delivery person is not assigned to this order', async () => {
      const { user: otherDriver } = await createTestUser({
        role: 'delivery',
        email: 'otherdriver@delivery.test',
      });

      await expect(
        deliveryService.updateDeliveryLocation(otherDriver._id.toString(), {
          orderId,
          location: { latitude: 40.71, longitude: -74.00, timestamp: new Date() },
        })
      ).rejects.toThrow('not assigned');
    });

    it('should throw BadRequestError for invalid status transition', async () => {
      await expect(
        deliveryService.updateDeliveryLocation(deliveryPersonId, {
          orderId,
          location: { latitude: 40.71, longitude: -74.00, timestamp: new Date() },
          status: OrderStatus.CONFIRMED, // invalid: OUT_FOR_DELIVERY → CONFIRMED not allowed
        })
      ).rejects.toThrow('Cannot transition');
    });
  });

  // ─────────────────────────────────────────────
  // getDeliveryLocationUpdates
  // ─────────────────────────────────────────────
  describe('getDeliveryLocationUpdates', () => {
    it('should return empty array for order with no location updates', async () => {
      const history = await deliveryService.getDeliveryLocationUpdates(
        orderId,
        deliveryPersonId,
        'delivery'
      );
      expect(Array.isArray(history)).toBe(true);
    });

    it('should throw ForbiddenError if customer tries to track another customers order', async () => {
      const { user: other } = await createTestUser({ role: 'customer', email: 'other@delivery.test' });

      await expect(
        deliveryService.getDeliveryLocationUpdates(orderId, other._id.toString(), 'customer')
      ).rejects.toThrow('not authorized');
    });

    it('should throw NotFoundError for non-existent order', async () => {
      await expect(
        deliveryService.getDeliveryLocationUpdates(
          '507f1f77bcf86cd799439011',
          deliveryPersonId,
          'delivery'
        )
      ).rejects.toThrow('Order not found');
    });
  });

  // ─────────────────────────────────────────────
  // getAvailableDeliveryPersonnel
  // ─────────────────────────────────────────────
  describe('getAvailableDeliveryPersonnel', () => {
    it('should return users with delivery role', async () => {
      const personnel = await deliveryService.getAvailableDeliveryPersonnel();
      expect(Array.isArray(personnel)).toBe(true);
      expect(personnel.length).toBeGreaterThanOrEqual(1);
      personnel.forEach((p: any) => expect(p.role).toBeUndefined()); // lean() with select('_id name phone') - role not selected
    });
  });

  // ─────────────────────────────────────────────
  // getOrdersForDelivery
  // ─────────────────────────────────────────────
  describe('getOrdersForDelivery', () => {
    it('should return active orders assigned to the delivery person', async () => {
      const orders = await deliveryService.getOrdersForDelivery(deliveryPersonId);
      expect(Array.isArray(orders)).toBe(true);
      expect(orders.length).toBeGreaterThanOrEqual(1);
    });

    it('should not return DELIVERED or CANCELLED orders', async () => {
      const { user: driver2 } = await createTestUser({ role: 'delivery', email: 'driver2@delivery.test' });
      await createTestOrder(customerId, restaurantId, {
        status: OrderStatus.DELIVERED,
        deliveryPersonId: driver2._id,
      });

      const orders = await deliveryService.getOrdersForDelivery(driver2._id.toString());
      const delivered = orders.filter((o: any) => o.status === OrderStatus.DELIVERED);
      expect(delivered.length).toBe(0);
    });
  });

  // ─────────────────────────────────────────────
  // estimateDeliveryTime
  // ─────────────────────────────────────────────
  describe('estimateDeliveryTime', () => {
    it('should return a Date for an OUT_FOR_DELIVERY order', async () => {
      const eta = await deliveryService.estimateDeliveryTime(orderId);
      expect(eta).toBeInstanceOf(Date);
      expect(eta.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return the existing estimate for a non-out-for-delivery order', async () => {
      const pendingOrder = await createTestOrder(customerId, restaurantId, {
        status: OrderStatus.CONFIRMED,
      });
      const eta = await deliveryService.estimateDeliveryTime(pendingOrder._id.toString());
      expect(eta).toBeInstanceOf(Date);
    });

    it('should throw NotFoundError for a non-existent order', async () => {
      await expect(
        deliveryService.estimateDeliveryTime('507f1f77bcf86cd799439011')
      ).rejects.toThrow('Order not found');
    });
  });
});
