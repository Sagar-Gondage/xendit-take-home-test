// src/services/order.service.ts
import Order from '../models/order.model';
import Restaurant from '../models/restaurant.model';
import MenuItem from '../models/menu.model';
import User from '../models/user.model';
import { IOrder, OrderStatus, PaymentStatus, IOrderItem } from '../types/order.types';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import { notificationService } from './notification.service';
import { LoyaltyService } from './loyalty.service';
import { NotificationType } from '../types/notification.types';

const loyaltyService = new LoyaltyService();

// Map order statuses to notification types and messages
const ORDER_STATUS_NOTIFICATIONS: Record<OrderStatus, { type: NotificationType; title: string; message: string } | null> = {
  [OrderStatus.PENDING]: {
    type: NotificationType.ORDER_PLACED,
    title: 'Order Placed',
    message: 'Your order has been placed successfully and is awaiting confirmation.',
  },
  [OrderStatus.CONFIRMED]: {
    type: NotificationType.ORDER_CONFIRMED,
    title: 'Order Confirmed',
    message: 'Your order has been confirmed by the restaurant.',
  },
  [OrderStatus.PREPARING]: {
    type: NotificationType.ORDER_PREPARING,
    title: 'Order Being Prepared',
    message: 'The restaurant is now preparing your order.',
  },
  [OrderStatus.OUT_FOR_DELIVERY]: {
    type: NotificationType.ORDER_OUT_FOR_DELIVERY,
    title: 'Out for Delivery',
    message: 'Your order is on its way! Track your delivery in real-time.',
  },
  [OrderStatus.DELIVERED]: {
    type: NotificationType.ORDER_DELIVERED,
    title: 'Order Delivered',
    message: 'Your order has been delivered. Enjoy your meal!',
  },
  [OrderStatus.CANCELLED]: {
    type: NotificationType.ORDER_CANCELLED,
    title: 'Order Cancelled',
    message: 'Your order has been cancelled.',
  },
};

export class OrderService {
  public async getAllOrders(userId: string, role: string): Promise<IOrder[]> {
    let filter = {};

    // Filter orders based on user role
    if (role === 'customer') {
      filter = { customerId: userId };
    } else if (role === 'restaurant') {
      // Get all restaurants owned by this user
      const restaurants = await Restaurant.find({ ownerId: userId });
      const restaurantIds = restaurants.map((restaurant: any) => restaurant._id);
      filter = { restaurantId: { $in: restaurantIds } };
    } else if (role === 'delivery') {
      filter = { deliveryPersonId: userId };
    }
    // Admin can see all orders (no filter)

    return Order.find(filter).sort({ createdAt: -1 });
  }

  public async getOrderById(id: string, userId: string, role: string): Promise<IOrder> {
    const order = await Order.findById(id);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Check if user has permission to view this order
    if (role === 'customer' && order.customerId.toString() !== userId) {
      throw new ForbiddenError('You are not authorized to view this order');
    } else if (role === 'restaurant') {
      const restaurant = await Restaurant.findById(order.restaurantId);
      if (!restaurant || restaurant.ownerId.toString() !== userId) {
        throw new ForbiddenError('You are not authorized to view this order');
      }
    } else if (role === 'delivery' && order.deliveryPersonId?.toString() !== userId) {
      throw new ForbiddenError('You are not authorized to view this order');
    }

    return order;
  }

  public async createOrder(orderData: Partial<IOrder>, userId: string): Promise<IOrder> {
    // Validate required fields
    if (!orderData.restaurantId || !orderData.items || orderData.items.length === 0) {
      throw new BadRequestError('Missing required order information');
    }

    // Verify restaurant exists
    const restaurant = await Restaurant.findById(orderData.restaurantId);
    if (!restaurant) {
      throw new NotFoundError('Restaurant not found');
    }

    // Verify menu items exist and calculate prices
    let subtotal = 0;
    const orderItems: IOrderItem[] = [];

    for (const item of orderData.items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (!menuItem) {
        throw new NotFoundError(`Menu item ${item.menuItemId} not found`);
      }

      if (!menuItem.isAvailable) {
        throw new BadRequestError(`Menu item ${menuItem.name} is not available`);
      }

      // Calculate item price including customizations
      let itemPrice = menuItem.price;
      const customizations = [];

      if (item.customizations && item.customizations.length > 0) {
        for (const customization of item.customizations) {
          // Verify customization is valid
          const menuCustomization = menuItem.customizationOptions.find(
            (opt: any) => opt.name === customization.name
          );

          if (!menuCustomization) {
            throw new BadRequestError(`Invalid customization: ${customization.name}`);
          }

          const option = menuCustomization.options.find(
            (opt: any) => opt.name === customization.option
          );

          if (!option) {
            throw new BadRequestError(`Invalid option: ${customization.option} for ${customization.name}`);
          }

          itemPrice += option.price;
          customizations.push({
            name: customization.name,
            option: customization.option,
            price: option.price,
          });
        }
      }

      const totalItemPrice = itemPrice * item.quantity;
      subtotal += totalItemPrice;

      orderItems.push({
        menuItemId: item.menuItemId,
        name: menuItem.name,
        quantity: item.quantity,
        price: itemPrice,
        customizations,
      });
    }

    // Calculate delivery fee and tax
    const deliveryFee = 2.99; // Fixed delivery fee for simplicity
    const taxRate = 0.08; // 8% tax rate
    const tax = subtotal * taxRate;
    const total = subtotal + deliveryFee + tax;

    // Get user address for delivery
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Create the order
    const order = await Order.create({
      customerId: userId,
      restaurantId: orderData.restaurantId,
      items: orderItems,
      subtotal,
      deliveryFee,
      tax,
      total,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: orderData.paymentMethod || 'credit_card',
      deliveryAddress: orderData.deliveryAddress || user.address,
      specialInstructions: orderData.specialInstructions,
      estimatedDeliveryTime: new Date(Date.now() + 45 * 60000), // 45 minutes from now
    });

    // Send ORDER_PLACED notification (Task 4 requirement)
    try {
      await notificationService.sendNotification(userId, {
        type: NotificationType.ORDER_PLACED,
        title: 'Order Placed',
        message: `Your order has been placed successfully. Estimated delivery: 45 minutes.`,
        data: { orderId: order._id?.toString() },
      });
    } catch (err) {
      // Notification failure should not block order creation
      console.error('[OrderService] Failed to send ORDER_PLACED notification:', err);
    }

    return order;
  }

  public async updateOrderStatus(id: string, status: OrderStatus, userId: string, role: string): Promise<IOrder> {
    const order = await Order.findById(id);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Check if user has permission to update this order
    if (role === 'restaurant') {
      const restaurant = await Restaurant.findById(order.restaurantId);
      if (!restaurant || restaurant.ownerId.toString() !== userId) {
        throw new ForbiddenError('You are not authorized to update this order');
      }

      // Restaurant can only update to these statuses
      const allowedStatuses = [
        OrderStatus.CONFIRMED,
        OrderStatus.PREPARING,
        OrderStatus.CANCELLED,
      ];

      if (!allowedStatuses.includes(status)) {
        throw new BadRequestError(`Restaurant cannot set order status to ${status}`);
      }
    } else if (role === 'delivery') {
      if (order.deliveryPersonId?.toString() !== userId) {
        throw new ForbiddenError('You are not authorized to update this order');
      }

      // Delivery person can only update to these statuses
      const allowedStatuses = [
        OrderStatus.OUT_FOR_DELIVERY,
        OrderStatus.DELIVERED,
      ];

      if (!allowedStatuses.includes(status)) {
        throw new BadRequestError(`Delivery person cannot set order status to ${status}`);
      }
    } else if (role === 'customer') {
      if (order.customerId.toString() !== userId) {
        throw new ForbiddenError('You are not authorized to update this order');
      }

      // Customer can only cancel the order
      if (status !== OrderStatus.CANCELLED) {
        throw new BadRequestError('Customer can only cancel the order');
      }

      // Customer can only cancel if order is still pending or confirmed
      if (![OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(order.status)) {
        throw new BadRequestError('Cannot cancel order that is already being prepared or delivered');
      }
    }

    // Update order status
    order.status = status;

    // If order is delivered, set actual delivery time
    if (status === OrderStatus.DELIVERED) {
      order.actualDeliveryTime = new Date();
    }

    await order.save();

    // Send real-time notification to customer (Task 4 requirement)
    const notifConfig = ORDER_STATUS_NOTIFICATIONS[status];
    if (notifConfig) {
      try {
        await notificationService.sendNotification(order.customerId.toString(), {
          type: notifConfig.type,
          title: notifConfig.title,
          message: notifConfig.message,
          data: { orderId: id, status },
        });

        // Also broadcast to order room so all subscribers (e.g. delivery person) get it
        await notificationService.broadcastToOrder(id, {
          type: notifConfig.type,
          title: notifConfig.title,
          message: notifConfig.message,
          data: { orderId: id, status },
        });
      } catch (err) {
        console.error('[OrderService] Failed to send status notification:', err);
      }
    }

    // When order is delivered, award loyalty points (Task 3 requirement)
    if (status === OrderStatus.DELIVERED) {
      try {
        const updatedAccount = await loyaltyService.earnPoints(
          order.customerId.toString(),
          id,
          order.total
        );

        // Check if the user got a tier upgrade and notify them
        const tierUpgradeNotif = {
          type: NotificationType.LOYALTY_POINTS_EARNED,
          title: 'Points Earned!',
          message: `You earned ${updatedAccount.history[updatedAccount.history.length - 1]?.points || 0} loyalty points for this order.`,
          data: {
            orderId: id,
            points: updatedAccount.points,
            tier: updatedAccount.tier,
          },
        };

        await notificationService.sendNotification(order.customerId.toString(), tierUpgradeNotif);
      } catch (err) {
        console.error('[OrderService] Failed to award loyalty points:', err);
      }
    }

    return order;
  }

  public async assignDeliveryPerson(id: string, deliveryPersonId: string): Promise<IOrder> {
    const order = await Order.findById(id);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Verify delivery person exists and has delivery role
    const deliveryPerson = await User.findById(deliveryPersonId);
    if (!deliveryPerson || deliveryPerson.role !== 'delivery') {
      throw new BadRequestError('Invalid delivery person');
    }

    // Assign delivery person
    order.deliveryPersonId = deliveryPersonId;
    await order.save();

    return order;
  }

  public async cancelOrder(id: string, userId: string, role: string): Promise<void> {
    const order = await Order.findById(id);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Check if user has permission to cancel this order
    if (role === 'customer' && order.customerId.toString() !== userId) {
      throw new ForbiddenError('You are not authorized to cancel this order');
    } else if (role === 'restaurant') {
      const restaurant = await Restaurant.findById(order.restaurantId);
      if (!restaurant || restaurant.ownerId.toString() !== userId) {
        throw new ForbiddenError('You are not authorized to cancel this order');
      }
    }

    // Can only cancel if order is still pending or confirmed
    if (![OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(order.status)) {
      throw new BadRequestError('Cannot cancel order that is already being prepared or delivered');
    }

    // Update order status
    order.status = OrderStatus.CANCELLED;
    await order.save();

    // Notify customer of cancellation (Task 4 requirement)
    try {
      await notificationService.sendNotification(order.customerId.toString(), {
        type: NotificationType.ORDER_CANCELLED,
        title: 'Order Cancelled',
        message: 'Your order has been cancelled.',
        data: { orderId: id },
      });
    } catch (err) {
      console.error('[OrderService] Failed to send cancellation notification:', err);
    }
  }
}
