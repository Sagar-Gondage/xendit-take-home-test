// src/services/analytics.service.ts
import mongoose from 'mongoose';
import NodeCache from 'node-cache';
import Order from '../models/order.model';
import Restaurant from '../models/restaurant.model';
import { OrderStatus, PaymentStatus } from '../types/order.types';
import {
  ISalesData,
  IPopularItem,
  IPeakHour,
  IDeliveryPerformance,
  ICustomerRetention,
  IDashboardSummary,
  IAnalyticsQuery,
  TimeFrame,
} from '../types/analytics.types';
import { NotFoundError, ForbiddenError } from '../utils/errors';

// Cache with 5-minute TTL
const analyticsCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

export class AnalyticsService {
  /**
   * Get dashboard summary for a restaurant
   */
  public async getDashboardSummary(
    restaurantId: string,
    userId: string,
    role: string
  ): Promise<IDashboardSummary> {
    await this.verifyAccess(restaurantId, userId, role);

    const cacheKey = `dashboard:${restaurantId}`;
    const cached = analyticsCache.get<IDashboardSummary>(cacheKey);
    if (cached) return cached;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      orderStats,
      topItems,
      peakHours,
      deliveryPerformance,
      customerRetention,
    ] = await Promise.all([
      this.getOrderStats(restaurantId, thirtyDaysAgo),
      this.getPopularItems(restaurantId, thirtyDaysAgo, 5),
      this.getPeakHours(restaurantId, thirtyDaysAgo),
      this.getDeliveryPerformance(restaurantId, thirtyDaysAgo),
      this.getCustomerRetention(restaurantId, thirtyDaysAgo),
    ]);

    const summary: IDashboardSummary = {
      totalOrders: orderStats.totalOrders,
      totalRevenue: orderStats.totalRevenue,
      averageOrderValue: orderStats.averageOrderValue,
      averageDeliveryTime: deliveryPerformance.averageDeliveryTime,
      customerRetention,
      topItems,
      peakHours,
    };

    analyticsCache.set(cacheKey, summary);
    return summary;
  }

  /**
   * Get sales data aggregated by time frame
   */
  public async getSalesData(
    restaurantId: string,
    timeFrame: TimeFrame,
    startDate: Date,
    endDate: Date,
    userId: string,
    role: string
  ): Promise<ISalesData[]> {
    await this.verifyAccess(restaurantId, userId, role);

    const cacheKey = `sales:${restaurantId}:${timeFrame}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = analyticsCache.get<ISalesData[]>(cacheKey);
    if (cached) return cached;

    let dateFormat: string;
    switch (timeFrame) {
      case TimeFrame.DAY:
        dateFormat = '%Y-%m-%d';
        break;
      case TimeFrame.WEEK:
        dateFormat = '%Y-W%V';
        break;
      case TimeFrame.MONTH:
        dateFormat = '%Y-%m';
        break;
    }

    const pipeline = [
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $ne: OrderStatus.CANCELLED },
          paymentStatus: PaymentStatus.COMPLETED,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          averageOrderValue: { $avg: '$total' },
        },
      },
      {
        $sort: { _id: 1 as const },
      },
      {
        $project: {
          _id: 0,
          period: '$_id',
          totalOrders: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          averageOrderValue: { $round: ['$averageOrderValue', 2] },
        },
      },
    ];

    const results = await Order.aggregate(pipeline);
    analyticsCache.set(cacheKey, results);
    return results;
  }

  /**
   * Get popular menu items
   */
  public async getPopularItems(
    restaurantId: string,
    since: Date,
    limit: number = 10
  ): Promise<IPopularItem[]> {
    const pipeline = [
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          createdAt: { $gte: since },
          status: { $ne: OrderStatus.CANCELLED },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menuItemId',
          name: { $first: '$items.name' },
          totalOrdered: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      { $sort: { totalOrdered: -1 as const } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          menuItemId: '$_id',
          name: 1,
          totalOrdered: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
        },
      },
    ];

    return Order.aggregate(pipeline);
  }

  /**
   * Get peak ordering hours
   */
  public async getPeakHours(restaurantId: string, since: Date): Promise<IPeakHour[]> {
    const pipeline = [
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          createdAt: { $gte: since },
          status: { $ne: OrderStatus.CANCELLED },
        },
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { orderCount: -1 as const } },
      {
        $project: {
          _id: 0,
          hour: '$_id',
          orderCount: 1,
        },
      },
    ];

    return Order.aggregate(pipeline);
  }

  /**
   * Get delivery performance metrics
   */
  public async getDeliveryPerformance(
    restaurantId: string,
    since: Date
  ): Promise<IDeliveryPerformance> {
    const pipeline = [
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          createdAt: { $gte: since },
          status: OrderStatus.DELIVERED,
          actualDeliveryTime: { $exists: true },
          estimatedDeliveryTime: { $exists: true },
        },
      },
      {
        $addFields: {
          deliveryTimeMinutes: {
            $divide: [
              { $subtract: ['$actualDeliveryTime', '$createdAt'] },
              60000, // Convert ms to minutes
            ],
          },
          wasOnTime: {
            $lte: ['$actualDeliveryTime', '$estimatedDeliveryTime'],
          },
        },
      },
      {
        $group: {
          _id: null,
          averageDeliveryTime: { $avg: '$deliveryTimeMinutes' },
          totalDeliveries: { $sum: 1 },
          onTimeDeliveries: {
            $sum: { $cond: ['$wasOnTime', 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          averageDeliveryTime: { $round: ['$averageDeliveryTime', 1] },
          totalDeliveries: 1,
          onTimeDeliveryRate: {
            $round: [
              { $multiply: [{ $divide: ['$onTimeDeliveries', '$totalDeliveries'] }, 100] },
              1,
            ],
          },
        },
      },
    ];

    const results = await Order.aggregate(pipeline);
    return results[0] || { averageDeliveryTime: 0, onTimeDeliveryRate: 0, totalDeliveries: 0 };
  }

  /**
   * Get customer retention metrics
   */
  public async getCustomerRetention(
    restaurantId: string,
    since: Date
  ): Promise<ICustomerRetention> {
    const previousPeriod = new Date(since);
    previousPeriod.setDate(previousPeriod.getDate() - 30);

    // Get customers who ordered in the current period
    const currentCustomers = await Order.distinct('customerId', {
      restaurantId,
      createdAt: { $gte: since },
      status: { $ne: OrderStatus.CANCELLED },
    });

    // Get customers who ordered in the previous period
    const previousCustomers = await Order.distinct('customerId', {
      restaurantId,
      createdAt: { $gte: previousPeriod, $lt: since },
      status: { $ne: OrderStatus.CANCELLED },
    });

    const previousSet = new Set(previousCustomers.map((id: any) => id.toString()));
    const returningCustomers = currentCustomers.filter((id: any) => previousSet.has(id.toString()));

    return {
      newCustomers: currentCustomers.length - returningCustomers.length,
      returningCustomers: returningCustomers.length,
      retentionRate:
        previousCustomers.length > 0
          ? Math.round((returningCustomers.length / previousCustomers.length) * 100 * 10) / 10
          : 0,
    };
  }

  /**
   * Export data as JSON (could be extended to CSV)
   */
  public async exportData(
    restaurantId: string,
    startDate: Date,
    endDate: Date,
    userId: string,
    role: string
  ): Promise<any> {
    await this.verifyAccess(restaurantId, userId, role);

    const [salesDaily, popularItems, peakHours, deliveryPerf, retention] = await Promise.all([
      this.getSalesData(restaurantId, TimeFrame.DAY, startDate, endDate, userId, role),
      this.getPopularItems(restaurantId, startDate),
      this.getPeakHours(restaurantId, startDate),
      this.getDeliveryPerformance(restaurantId, startDate),
      this.getCustomerRetention(restaurantId, startDate),
    ]);

    return {
      exportedAt: new Date(),
      period: { startDate, endDate },
      salesData: salesDaily,
      popularItems,
      peakHours,
      deliveryPerformance: deliveryPerf,
      customerRetention: retention,
    };
  }

  private async getOrderStats(restaurantId: string, since: Date) {
    const pipeline = [
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          createdAt: { $gte: since },
          status: { $ne: OrderStatus.CANCELLED },
          paymentStatus: PaymentStatus.COMPLETED,
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          averageOrderValue: { $avg: '$total' },
        },
      },
    ];

    const results = await Order.aggregate(pipeline);
    return results[0] || { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0 };
  }

  private async verifyAccess(restaurantId: string, userId: string, role: string): Promise<void> {
    if (role === 'admin') return;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw new NotFoundError('Restaurant not found');
    }

    if (role === 'restaurant' && restaurant.ownerId.toString() !== userId) {
      throw new ForbiddenError('You do not have access to this restaurant\'s analytics');
    }

    if (role !== 'restaurant' && role !== 'admin') {
      throw new ForbiddenError('You do not have permission to view analytics');
    }
  }
}
