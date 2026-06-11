// src/models/notification.model.ts
import mongoose, { Schema, Document } from 'mongoose';
import { INotification, INotificationPreferences, NotificationType } from '../types/notification.types';

const notificationSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

const notificationPreferencesSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    orderUpdates: {
      type: Boolean,
      default: true,
    },
    deliveryUpdates: {
      type: Boolean,
      default: true,
    },
    promotions: {
      type: Boolean,
      default: true,
    },
    loyaltyUpdates: {
      type: Boolean,
      default: true,
    },
    customMessages: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Notification = mongoose.model<INotification & Document>('Notification', notificationSchema);
export const NotificationPreferences = mongoose.model<INotificationPreferences & Document>(
  'NotificationPreferences',
  notificationPreferencesSchema
);
