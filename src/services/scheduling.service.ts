// src/services/scheduling.service.ts
import Order from '../models/order.model';
import Restaurant from '../models/restaurant.model';
import { IOrder, OrderStatus } from '../types/order.types';
import { NotFoundError, BadRequestError } from '../utils/errors';

export class SchedulingService {
  /**
   * Schedule an order for future delivery
   */
  public async scheduleOrder(
    orderId: string,
    scheduledFor: Date,
    userId: string
  ): Promise<IOrder> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.customerId.toString() !== userId) {
      throw new BadRequestError('You can only schedule your own orders');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestError('Only pending orders can be scheduled');
    }

    // Validate scheduling time
    const now = new Date();
    const minScheduleTime = new Date(now.getTime() + 30 * 60000); // At least 30 min ahead
    const maxScheduleTime = new Date(now.getTime() + 7 * 24 * 60 * 60000); // Max 7 days ahead

    if (scheduledFor < minScheduleTime) {
      throw new BadRequestError('Scheduled time must be at least 30 minutes from now');
    }

    if (scheduledFor > maxScheduleTime) {
      throw new BadRequestError('Scheduled time cannot be more than 7 days from now');
    }

    // Validate that restaurant is open at the scheduled time
    const restaurant = await Restaurant.findById(order.restaurantId);
    if (!restaurant) {
      throw new NotFoundError('Restaurant not found');
    }

    const isOpen = this.isRestaurantOpenAt(restaurant, scheduledFor);
    if (!isOpen) {
      throw new BadRequestError('Restaurant is not open at the scheduled time');
    }

    // Update the order with scheduling info
    order.isScheduled = true;
    order.scheduledFor = scheduledFor;
    order.scheduledStatus = 'scheduled';
    await order.save();

    return order;
  }

  /**
   * Get all scheduled orders for a user
   */
  public async getScheduledOrders(userId: string): Promise<IOrder[]> {
    return Order.find({
      customerId: userId,
      isScheduled: true,
      scheduledStatus: { $in: ['scheduled', 'processing'] },
    }).sort({ scheduledFor: 1 });
  }

  /**
   * Modify a scheduled order's time
   */
  public async modifyScheduledOrder(
    orderId: string,
    newScheduledFor: Date,
    userId: string
  ): Promise<IOrder> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.customerId.toString() !== userId) {
      throw new BadRequestError('You can only modify your own orders');
    }

    if (!order.isScheduled || order.scheduledStatus !== 'scheduled') {
      throw new BadRequestError('Order is not in a modifiable scheduled state');
    }

    // Validate the new time
    const now = new Date();
    const minScheduleTime = new Date(now.getTime() + 30 * 60000);
    const maxScheduleTime = new Date(now.getTime() + 7 * 24 * 60 * 60000);

    if (newScheduledFor < minScheduleTime) {
      throw new BadRequestError('Scheduled time must be at least 30 minutes from now');
    }

    if (newScheduledFor > maxScheduleTime) {
      throw new BadRequestError('Scheduled time cannot be more than 7 days from now');
    }

    // Validate restaurant hours
    const restaurant = await Restaurant.findById(order.restaurantId);
    if (!restaurant) {
      throw new NotFoundError('Restaurant not found');
    }

    if (!this.isRestaurantOpenAt(restaurant, newScheduledFor)) {
      throw new BadRequestError('Restaurant is not open at the new scheduled time');
    }

    order.scheduledFor = newScheduledFor;
    await order.save();

    return order;
  }

  /**
   * Cancel a scheduled order
   */
  public async cancelScheduledOrder(orderId: string, userId: string): Promise<IOrder> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.customerId.toString() !== userId) {
      throw new BadRequestError('You can only cancel your own orders');
    }

    if (!order.isScheduled || order.scheduledStatus !== 'scheduled') {
      throw new BadRequestError('Order is not in a cancellable scheduled state');
    }

    order.scheduledStatus = 'cancelled';
    order.status = OrderStatus.CANCELLED;
    await order.save();

    return order;
  }

  /**
   * Process scheduled orders that are due (called by cron)
   */
  public async processScheduledOrders(): Promise<IOrder[]> {
    const now = new Date();
    // Process orders scheduled within the next 15 minutes
    const processingWindow = new Date(now.getTime() + 15 * 60000);

    const dueOrders = await Order.find({
      isScheduled: true,
      scheduledStatus: 'scheduled',
      scheduledFor: { $lte: processingWindow },
    });

    const processedOrders: IOrder[] = [];

    for (const order of dueOrders) {
      order.scheduledStatus = 'processing';
      order.status = OrderStatus.CONFIRMED;
      await order.save();
      processedOrders.push(order);
    }

    return processedOrders;
  }

  /**
   * Check if restaurant is open at a specific time
   */
  private isRestaurantOpenAt(restaurant: any, dateTime: Date): boolean {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const day = dayNames[dateTime.getDay()];
    const time = `${String(dateTime.getHours()).padStart(2, '0')}:${String(dateTime.getMinutes()).padStart(2, '0')}`;

    const hours = restaurant.operatingHours?.[day];
    if (!hours || !hours.open || !hours.close) {
      return false;
    }

    return time >= hours.open && time <= hours.close;
  }
}
