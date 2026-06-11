// src/types/notification.types.ts

export enum NotificationType {
  ORDER_PLACED = 'order_placed',
  ORDER_CONFIRMED = 'order_confirmed',
  ORDER_PREPARING = 'order_preparing',
  ORDER_OUT_FOR_DELIVERY = 'order_out_for_delivery',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_CANCELLED = 'order_cancelled',
  DELIVERY_LOCATION_UPDATE = 'delivery_location_update',
  PAYMENT_PROCESSED = 'payment_processed',
  PAYMENT_FAILED = 'payment_failed',
  CUSTOM_MESSAGE = 'custom_message',
  LOYALTY_POINTS_EARNED = 'loyalty_points_earned',
  LOYALTY_TIER_UPGRADE = 'loyalty_tier_upgrade',
  SCHEDULED_ORDER_REMINDER = 'scheduled_order_reminder',
}

export interface INotification {
  _id?: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt?: Date;
}

export interface INotificationPreferences {
  userId: string;
  orderUpdates: boolean;
  deliveryUpdates: boolean;
  promotions: boolean;
  loyaltyUpdates: boolean;
  customMessages: boolean;
}

export interface ISocketEvent {
  event: string;
  data: any;
  room?: string;
}
