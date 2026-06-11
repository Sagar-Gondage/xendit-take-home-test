// tests/unit/services/notification.service.test.ts
import '../../setup';
import { NotificationService } from '../../../src/services/notification.service';
import { Notification, NotificationPreferences } from '../../../src/models/notification.model';
import { NotificationType } from '../../../src/types/notification.types';
import { createTestUser } from '../../helpers/test.helpers';

// Setup MongoDB in-memory server
import '../../setup';

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let userId: string;

  beforeAll(() => {
    notificationService = new NotificationService();
  });

  beforeEach(async () => {
    const { user } = await createTestUser({ email: 'notif@test.com' });
    userId = user._id.toString();
  });

  describe('sendNotification', () => {
    it('should create and store a notification', async () => {
      await notificationService.sendNotification(userId, {
        type: NotificationType.ORDER_CONFIRMED,
        title: 'Order Confirmed',
        message: 'Your order has been confirmed',
        data: { orderId: '123' },
      });

      const notifications = await Notification.find({ userId });
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe(NotificationType.ORDER_CONFIRMED);
      expect(notifications[0].title).toBe('Order Confirmed');
      expect(notifications[0].isRead).toBe(false);
    });

    it('should store notification with metadata', async () => {
      await notificationService.sendNotification(userId, {
        type: NotificationType.PAYMENT_PROCESSED,
        title: 'Payment Received',
        message: 'Your payment of $25.00 was successful',
        data: { amount: 25.0, orderId: 'abc' },
      });

      const notification = await Notification.findOne({ userId });
      expect(notification!.data).toEqual({ amount: 25.0, orderId: 'abc' });
    });
  });

  describe('getUserNotifications', () => {
    beforeEach(async () => {
      // Create multiple notifications
      for (let i = 0; i < 5; i++) {
        await Notification.create({
          userId,
          type: NotificationType.ORDER_CONFIRMED,
          title: `Notification ${i}`,
          message: `Message ${i}`,
          isRead: i < 2, // First 2 are read
        });
      }
    });

    it('should return paginated notifications', async () => {
      const result = await notificationService.getUserNotifications(userId, 1, 3);

      expect(result.notifications).toHaveLength(3);
      expect(result.total).toBe(5);
      expect(result.unreadCount).toBe(3);
    });

    it('should return only unread notifications when filter is applied', async () => {
      const result = await notificationService.getUserNotifications(userId, 1, 20, true);

      expect(result.notifications).toHaveLength(3);
    });

    it('should return notifications sorted by most recent first', async () => {
      const result = await notificationService.getUserNotifications(userId, 1, 10);

      for (let i = 0; i < result.notifications.length - 1; i++) {
        const current = new Date(result.notifications[i].createdAt!).getTime();
        const next = new Date(result.notifications[i + 1].createdAt!).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });

  describe('markAsRead', () => {
    it('should mark specified notifications as read', async () => {
      const n1 = await Notification.create({
        userId,
        type: NotificationType.ORDER_CONFIRMED,
        title: 'N1',
        message: 'M1',
        isRead: false,
      });
      const n2 = await Notification.create({
        userId,
        type: NotificationType.ORDER_CONFIRMED,
        title: 'N2',
        message: 'M2',
        isRead: false,
      });

      await notificationService.markAsRead(userId, [n1._id.toString(), n2._id.toString()]);

      const updated1 = await Notification.findById(n1._id);
      const updated2 = await Notification.findById(n2._id);
      expect(updated1!.isRead).toBe(true);
      expect(updated2!.isRead).toBe(true);
    });

    it('should not mark notifications from other users', async () => {
      const { user: otherUser } = await createTestUser({ email: 'other@notif.com' });
      const notification = await Notification.create({
        userId: otherUser._id.toString(),
        type: NotificationType.ORDER_CONFIRMED,
        title: 'Other',
        message: 'Other message',
        isRead: false,
      });

      await notificationService.markAsRead(userId, [notification._id.toString()]);

      const unchanged = await Notification.findById(notification._id);
      expect(unchanged!.isRead).toBe(false);
    });
  });

  describe('getUserPreferences', () => {
    it('should return default preferences if none exist', async () => {
      const prefs = await notificationService.getUserPreferences(userId);

      expect(prefs).toBeDefined();
      expect(prefs.userId.toString()).toBe(userId);
    });

    it('should return existing preferences', async () => {
      await NotificationPreferences.create({
        userId,
        orderUpdates: true,
        promotions: false,
        deliveryUpdates: true,
      });

      const prefs = await notificationService.getUserPreferences(userId);
      expect(prefs.promotions).toBe(false);
    });
  });

  describe('updatePreferences', () => {
    it('should update notification preferences', async () => {
      await notificationService.updatePreferences(userId, {
        orderUpdates: false,
        promotions: true,
      });

      const prefs = await NotificationPreferences.findOne({ userId });
      expect(prefs!.orderUpdates).toBe(false);
      expect(prefs!.promotions).toBe(true);
    });
  });
});
