// tests/unit/services/order.service.test.ts
import '../../setup';
import { OrderService } from '../../../src/services/order.service';
import Order from '../../../src/models/order.model';
import { Notification } from '../../../src/models/notification.model';
import { LoyaltyPoints } from '../../../src/models/loyalty.model';
import {
  createTestUser,
  createTestRestaurant,
  createTestMenuItem,
  createTestOrder,
} from '../../helpers/test.helpers';
import { OrderStatus } from '../../../src/types/order.types';
import { NotificationType } from '../../../src/types/notification.types';

// Setup MongoDB in-memory server
import '../../setup';

describe('OrderService', () => {
  let orderService: OrderService;
  let customerId: string;
  let restaurantId: string;
  let restaurantOwnerId: string;
  let menuItemId: string;

  beforeAll(() => {
    orderService = new OrderService();
  });

  beforeEach(async () => {
    const { user: customer } = await createTestUser({
      role: 'customer',
      email: 'customer@order.test',
    });
    customerId = customer._id.toString();

    const { user: owner } = await createTestUser({
      role: 'restaurant',
      email: 'owner@order.test',
    });
    restaurantOwnerId = owner._id.toString();

    const restaurant = await createTestRestaurant(restaurantOwnerId);
    restaurantId = restaurant._id.toString();

    const menuItem = await createTestMenuItem(restaurantId, { price: 15.99 });
    menuItemId = menuItem._id.toString();
  });

  // ─────────────────────────────────────────────
  // createOrder
  // ─────────────────────────────────────────────
  describe('createOrder', () => {
    it('should create an order and persist it to the database', async () => {
      const order = await orderService.createOrder(
        {
          restaurantId,
          // Cast needed: service resolves name/price from DB, they are not user-supplied
          items: [{ menuItemId, quantity: 1, customizations: [] } as any],
          paymentMethod: 'credit_card',
        },
        customerId
      );

      expect(order).toBeDefined();
      expect(order.customerId.toString()).toBe(customerId);
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.total).toBeGreaterThan(0);

      const saved = await Order.findById(order._id);
      expect(saved).not.toBeNull();
    });

    it('should send an ORDER_PLACED notification after successful creation (Task 4)', async () => {
      await orderService.createOrder(
        {
          restaurantId,
          items: [{ menuItemId, quantity: 1, customizations: [] } as any],
        },
        customerId
      );

      await new Promise((r) => setTimeout(r, 150));

      const notifications = await Notification.find({
        userId: customerId,
        type: NotificationType.ORDER_PLACED,
      });

      expect(notifications.length).toBeGreaterThanOrEqual(1);
      expect(notifications[0].title).toBe('Order Placed');
    });

    it('should calculate total = subtotal + deliveryFee + tax correctly', async () => {
      const order = await orderService.createOrder(
        {
          restaurantId,
          items: [{ menuItemId, quantity: 2, customizations: [] } as any],
        },
        customerId
      );

      // Two items at 15.99 = 31.98 subtotal + 2.99 fee + 8% tax
      expect(order.subtotal).toBeCloseTo(31.98, 1);
      expect(order.deliveryFee).toBe(2.99);
      expect(order.tax).toBeCloseTo(31.98 * 0.08, 1);
      expect(order.total).toBeCloseTo(order.subtotal + order.deliveryFee + order.tax, 1);
    });

    it('should throw NotFoundError if restaurant does not exist', async () => {
      await expect(
        orderService.createOrder(
          {
            restaurantId: '507f1f77bcf86cd799439011',
            items: [{ menuItemId, quantity: 1, customizations: [] } as any],
          },
          customerId
        )
      ).rejects.toThrow('Restaurant not found');
    });

    it('should throw NotFoundError if menu item does not exist', async () => {
      await expect(
        orderService.createOrder(
          {
            restaurantId,
            items: [{ menuItemId: '507f1f77bcf86cd799439011', quantity: 1, customizations: [] } as any],
          },
          customerId
        )
      ).rejects.toThrow('Menu item');
    });

    it('should throw BadRequestError if items array is empty', async () => {
      await expect(
        orderService.createOrder({ restaurantId, items: [] }, customerId)
      ).rejects.toThrow('Missing required order information');
    });
  });

  // ─────────────────────────────────────────────
  // updateOrderStatus
  // ─────────────────────────────────────────────
  describe('updateOrderStatus', () => {
    let orderId: string;

    beforeEach(async () => {
      const order = await createTestOrder(customerId, restaurantId, {
        status: OrderStatus.PENDING,
      });
      orderId = order._id.toString();
    });

    it('should update order status to CONFIRMED (restaurant role)', async () => {
      const updated = await orderService.updateOrderStatus(
        orderId,
        OrderStatus.CONFIRMED,
        restaurantOwnerId,
        'restaurant'
      );
      expect(updated.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should send ORDER_CONFIRMED notification when status changes to CONFIRMED (Task 4)', async () => {
      await orderService.updateOrderStatus(
        orderId,
        OrderStatus.CONFIRMED,
        restaurantOwnerId,
        'restaurant'
      );

      await new Promise((r) => setTimeout(r, 150));

      const notification = await Notification.findOne({
        userId: customerId,
        type: NotificationType.ORDER_CONFIRMED,
      });

      expect(notification).not.toBeNull();
      expect(notification!.title).toBe('Order Confirmed');
    });

    it('should send ORDER_PREPARING notification when status changes to PREPARING (Task 4)', async () => {
      await orderService.updateOrderStatus(orderId, OrderStatus.CONFIRMED, restaurantOwnerId, 'restaurant');
      await orderService.updateOrderStatus(orderId, OrderStatus.PREPARING, restaurantOwnerId, 'restaurant');

      await new Promise((r) => setTimeout(r, 150));

      const notification = await Notification.findOne({
        userId: customerId,
        type: NotificationType.ORDER_PREPARING,
      });
      expect(notification).not.toBeNull();
      expect(notification!.title).toBe('Order Being Prepared');
    });

    it('should award loyalty points when order is DELIVERED (Task 3)', async () => {
      const { user: deliveryUser } = await createTestUser({
        role: 'delivery',
        email: 'delivery@order.test',
      });
      await Order.findByIdAndUpdate(orderId, {
        deliveryPersonId: deliveryUser._id,
        status: OrderStatus.OUT_FOR_DELIVERY,
      });

      await orderService.updateOrderStatus(
        orderId,
        OrderStatus.DELIVERED,
        deliveryUser._id.toString(),
        'delivery'
      );

      await new Promise((r) => setTimeout(r, 200));

      const loyaltyAccount = await LoyaltyPoints.findOne({ userId: customerId });
      expect(loyaltyAccount).not.toBeNull();
      expect(loyaltyAccount!.points).toBeGreaterThan(0);
    });

    it('should send LOYALTY_POINTS_EARNED notification after delivery (Task 3 + Task 4)', async () => {
      const { user: deliveryUser } = await createTestUser({
        role: 'delivery',
        email: 'delivery2@order.test',
      });
      await Order.findByIdAndUpdate(orderId, {
        deliveryPersonId: deliveryUser._id,
        status: OrderStatus.OUT_FOR_DELIVERY,
      });

      await orderService.updateOrderStatus(
        orderId,
        OrderStatus.DELIVERED,
        deliveryUser._id.toString(),
        'delivery'
      );

      await new Promise((r) => setTimeout(r, 200));

      const loyaltyNotif = await Notification.findOne({
        userId: customerId,
        type: NotificationType.LOYALTY_POINTS_EARNED,
      });
      expect(loyaltyNotif).not.toBeNull();
      expect(loyaltyNotif!.title).toBe('Points Earned!');
    });

    it('should set actualDeliveryTime when order is DELIVERED', async () => {
      const { user: deliveryUser } = await createTestUser({
        role: 'delivery',
        email: 'delivery3@order.test',
      });
      await Order.findByIdAndUpdate(orderId, {
        deliveryPersonId: deliveryUser._id,
        status: OrderStatus.OUT_FOR_DELIVERY,
      });

      const before = new Date();
      await orderService.updateOrderStatus(
        orderId,
        OrderStatus.DELIVERED,
        deliveryUser._id.toString(),
        'delivery'
      );
      const after = new Date();

      const order = await Order.findById(orderId);
      expect(order!.actualDeliveryTime).toBeDefined();
      expect(order!.actualDeliveryTime!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(order!.actualDeliveryTime!.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });

    it('should throw ForbiddenError if restaurant owner is not owner of this restaurant', async () => {
      const { user: otherOwner } = await createTestUser({
        role: 'restaurant',
        email: 'other@order.test',
      });

      await expect(
        orderService.updateOrderStatus(orderId, OrderStatus.CONFIRMED, otherOwner._id.toString(), 'restaurant')
      ).rejects.toThrow('not authorized');
    });

    it('should throw BadRequestError if restaurant tries to set DELIVERED status', async () => {
      await expect(
        orderService.updateOrderStatus(orderId, OrderStatus.DELIVERED, restaurantOwnerId, 'restaurant')
      ).rejects.toThrow('Restaurant cannot set order status');
    });

    it('should throw NotFoundError for non-existent order', async () => {
      await expect(
        orderService.updateOrderStatus('507f1f77bcf86cd799439011', OrderStatus.CONFIRMED, restaurantOwnerId, 'restaurant')
      ).rejects.toThrow('Order not found');
    });
  });

  // ─────────────────────────────────────────────
  // cancelOrder
  // ─────────────────────────────────────────────
  describe('cancelOrder', () => {
    let orderId: string;

    beforeEach(async () => {
      const order = await createTestOrder(customerId, restaurantId, {
        status: OrderStatus.PENDING,
      });
      orderId = order._id.toString();
    });

    it('should cancel a PENDING order and set status to CANCELLED', async () => {
      await orderService.cancelOrder(orderId, customerId, 'customer');

      const order = await Order.findById(orderId);
      expect(order!.status).toBe(OrderStatus.CANCELLED);
    });

    it('should send ORDER_CANCELLED notification after cancellation (Task 4)', async () => {
      await orderService.cancelOrder(orderId, customerId, 'customer');

      await new Promise((r) => setTimeout(r, 150));

      const notification = await Notification.findOne({
        userId: customerId,
        type: NotificationType.ORDER_CANCELLED,
      });

      expect(notification).not.toBeNull();
      expect(notification!.title).toBe('Order Cancelled');
    });

    it('should throw BadRequestError if order is already PREPARING', async () => {
      await Order.findByIdAndUpdate(orderId, { status: OrderStatus.PREPARING });

      await expect(
        orderService.cancelOrder(orderId, customerId, 'customer')
      ).rejects.toThrow('Cannot cancel');
    });

    it('should throw ForbiddenError if customer tries to cancel someone elses order', async () => {
      const { user: otherUser } = await createTestUser({
        role: 'customer',
        email: 'other2@order.test',
      });

      await expect(
        orderService.cancelOrder(orderId, otherUser._id.toString(), 'customer')
      ).rejects.toThrow('not authorized');
    });
  });

  // ─────────────────────────────────────────────
  // getAllOrders / getOrderById
  // ─────────────────────────────────────────────
  describe('getAllOrders', () => {
    it('should return only the customers own orders (customer role)', async () => {
      await createTestOrder(customerId, restaurantId);
      await createTestOrder(customerId, restaurantId);

      const { user: otherCustomer } = await createTestUser({
        role: 'customer',
        email: 'other3@order.test',
      });
      await createTestOrder(otherCustomer._id.toString(), restaurantId);

      const orders = await orderService.getAllOrders(customerId, 'customer');
      expect(orders.length).toBe(2);
      orders.forEach((o) => expect(o.customerId.toString()).toBe(customerId));
    });

    it('should return orders for restaurants owned by the owner (restaurant role)', async () => {
      await createTestOrder(customerId, restaurantId);

      const orders = await orderService.getAllOrders(restaurantOwnerId, 'restaurant');
      expect(orders.length).toBeGreaterThanOrEqual(1);
    });

    it('should return all orders for admin role', async () => {
      await createTestOrder(customerId, restaurantId);
      const orders = await orderService.getAllOrders('any-admin-id', 'admin');
      expect(orders.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getOrderById', () => {
    it('should return the order for the owning customer', async () => {
      const order = await createTestOrder(customerId, restaurantId);
      const found = await orderService.getOrderById(
        (order._id as any).toString(),
        customerId,
        'customer'
      );
      expect((found._id as any).toString()).toBe((order._id as any).toString());
    });

    it('should throw ForbiddenError if customer requests another customers order', async () => {
      const order = await createTestOrder(customerId, restaurantId);
      const { user: other } = await createTestUser({ role: 'customer', email: 'other4@order.test' });

      await expect(
        orderService.getOrderById(
          (order._id as any).toString(),
          other._id.toString(),
          'customer'
        )
      ).rejects.toThrow('not authorized');
    });

    it('should throw NotFoundError for a non-existent order id', async () => {
      await expect(
        orderService.getOrderById('507f1f77bcf86cd799439011', customerId, 'customer')
      ).rejects.toThrow('Order not found');
    });
  });
});
