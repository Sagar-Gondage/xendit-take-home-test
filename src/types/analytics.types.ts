// src/types/analytics.types.ts

export enum TimeFrame {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export interface ISalesData {
  period: string;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

export interface IPopularItem {
  menuItemId: string;
  name: string;
  totalOrdered: number;
  totalRevenue: number;
}

export interface IPeakHour {
  hour: number;
  orderCount: number;
}

export interface IDeliveryPerformance {
  averageDeliveryTime: number; // in minutes
  onTimeDeliveryRate: number; // percentage
  totalDeliveries: number;
}

export interface ICustomerRetention {
  newCustomers: number;
  returningCustomers: number;
  retentionRate: number;
}

export interface IDashboardSummary {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  averageDeliveryTime: number;
  customerRetention: ICustomerRetention;
  topItems: IPopularItem[];
  peakHours: IPeakHour[];
}

export interface IAnalyticsQuery {
  restaurantId?: string;
  timeFrame: TimeFrame;
  startDate?: Date;
  endDate?: Date;
}
