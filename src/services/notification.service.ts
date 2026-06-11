// src/services/notification.service.ts
import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { Notification, NotificationPreferences } from '../models/notification.model';
import { INotification, NotificationType, INotificationPreferences } from '../types/notification.types';
import { verifyToken } from '../utils/jwt';

export class NotificationService {
  private io: SocketServer | null = null;
  private userSockets: Map<string, Set<string>> = new Map();

  /**
   * Initialize Socket.IO server
   */
  public initialize(httpServer: HttpServer): SocketServer {
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      path: '/socket.io',
    });

    this.io.use((socket: Socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      try {
        const decoded = verifyToken(token as string);
        (socket as any).userId = decoded.userId;
        (socket as any).userRole = decoded.role;
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const userId = (socket as any).userId;

      // Track user socket
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      // Join user's personal room
      socket.join(`user:${userId}`);

      // Handle joining order rooms
      socket.on('join:order', (orderId: string) => {
        socket.join(`order:${orderId}`);
      });

      // Handle leaving order rooms
      socket.on('leave:order', (orderId: string) => {
        socket.leave(`order:${orderId}`);
      });

      // Handle custom messages from restaurant owners
      socket.on('message:send', async (data: { userId: string; message: string; orderId?: string }) => {
        if ((socket as any).userRole === 'restaurant') {
          await this.sendNotification(data.userId, {
            type: NotificationType.CUSTOM_MESSAGE,
            title: 'Message from Restaurant',
            message: data.message,
            data: { orderId: data.orderId },
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        const userSocketSet = this.userSockets.get(userId);
        if (userSocketSet) {
          userSocketSet.delete(socket.id);
          if (userSocketSet.size === 0) {
            this.userSockets.delete(userId);
          }
        }
      });
    });

    return this.io;
  }

  /**
   * Send a notification to a user
   */
  public async sendNotification(
    userId: string,
    notification: {
      type: NotificationType;
      title: string;
      message: string;
      data?: Record<string, any>;
    }
  ): Promise<INotification> {
    // Check user preferences
    const preferences = await this.getUserPreferences(userId);
    if (!this.shouldSendNotification(notification.type, preferences)) {
      // Still save but don't emit
      return Notification.create({ userId, ...notification, isRead: false });
    }

    // Save notification to database
    const savedNotification = await Notification.create({
      userId,
      ...notification,
      isRead: false,
    });

    // Emit via WebSocket if user is connected
    if (this.io) {
      this.io.to(`user:${userId}`).emit('notification', {
        id: savedNotification._id,
        ...notification,
        createdAt: savedNotification.createdAt,
      });
    }

    return savedNotification;
  }

  /**
   * Send notification to all users in an order room
   */
  public async broadcastToOrder(
    orderId: string,
    notification: {
      type: NotificationType;
      title: string;
      message: string;
      data?: Record<string, any>;
    }
  ): Promise<void> {
    if (this.io) {
      this.io.to(`order:${orderId}`).emit('order:update', {
        orderId,
        ...notification,
      });
    }
  }

  /**
   * Send real-time delivery location update
   */
  public emitDeliveryLocationUpdate(
    orderId: string,
    location: { latitude: number; longitude: number }
  ): void {
    if (this.io) {
      this.io.to(`order:${orderId}`).emit('delivery:location', {
        orderId,
        location,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Get notifications for a user
   */
  public async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<{ notifications: INotification[]; total: number; unreadCount: number }> {
    const query: any = { userId };
    if (unreadOnly) {
      query.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId, isRead: false }),
    ]);

    return {
      notifications: notifications as INotification[],
      total,
      unreadCount,
    };
  }

  /**
   * Mark notification(s) as read
   */
  public async markAsRead(userId: string, notificationIds?: string[]): Promise<void> {
    const query: any = { userId };
    if (notificationIds && notificationIds.length > 0) {
      query._id = { $in: notificationIds };
    }
    await Notification.updateMany(query, { isRead: true });
  }

  /**
   * Get or create notification preferences for a user
   */
  public async getUserPreferences(userId: string): Promise<INotificationPreferences> {
    let preferences = await NotificationPreferences.findOne({ userId });
    if (!preferences) {
      preferences = await NotificationPreferences.create({
        userId,
        orderUpdates: true,
        deliveryUpdates: true,
        promotions: true,
        loyaltyUpdates: true,
        customMessages: true,
      });
    }
    return preferences;
  }

  /**
   * Update notification preferences
   */
  public async updatePreferences(
    userId: string,
    preferences: Partial<INotificationPreferences>
  ): Promise<INotificationPreferences> {
    const updated = await NotificationPreferences.findOneAndUpdate(
      { userId },
      { $set: preferences },
      { new: true, upsert: true }
    );
    return updated!;
  }

  /**
   * Check if notification should be sent based on user preferences
   */
  private shouldSendNotification(
    type: NotificationType,
    preferences: INotificationPreferences
  ): boolean {
    switch (type) {
      case NotificationType.ORDER_PLACED:
      case NotificationType.ORDER_CONFIRMED:
      case NotificationType.ORDER_PREPARING:
      case NotificationType.ORDER_DELIVERED:
      case NotificationType.ORDER_CANCELLED:
        return preferences.orderUpdates;
      case NotificationType.ORDER_OUT_FOR_DELIVERY:
      case NotificationType.DELIVERY_LOCATION_UPDATE:
        return preferences.deliveryUpdates;
      case NotificationType.LOYALTY_POINTS_EARNED:
      case NotificationType.LOYALTY_TIER_UPGRADE:
        return preferences.loyaltyUpdates;
      case NotificationType.CUSTOM_MESSAGE:
        return preferences.customMessages;
      default:
        return true;
    }
  }

  /**
   * Get Socket.IO instance (for external use)
   */
  public getIO(): SocketServer | null {
    return this.io;
  }

  /**
   * Check if a user is currently connected
   */
  public isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }
}

// Singleton instance
export const notificationService = new NotificationService();
