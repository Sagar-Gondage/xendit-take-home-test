// src/controllers/notification.controller.ts
import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { BadRequestError } from '../utils/errors';

export class NotificationController {
  public getNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId) {
        throw new BadRequestError('User ID is required');
      }

      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const unreadOnly = req.query.unreadOnly === 'true';

      const result = await notificationService.getUserNotifications(
        req.user.userId,
        page,
        limit,
        unreadOnly
      );

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId) {
        throw new BadRequestError('User ID is required');
      }

      const { notificationIds } = req.body;
      if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
        throw new BadRequestError('notificationIds array is required');
      }

      await notificationService.markAsRead(req.user.userId, notificationIds);

      res.status(200).json({
        status: 'success',
        message: 'Notifications marked as read',
      });
    } catch (error) {
      next(error);
    }
  };

  public getPreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId) {
        throw new BadRequestError('User ID is required');
      }

      const preferences = await notificationService.getUserPreferences(req.user.userId);

      res.status(200).json({
        status: 'success',
        data: { preferences },
      });
    } catch (error) {
      next(error);
    }
  };

  public updatePreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId) {
        throw new BadRequestError('User ID is required');
      }

      const preferences = await notificationService.updatePreferences(
        req.user.userId,
        req.body
      );

      res.status(200).json({
        status: 'success',
        data: { preferences },
      });
    } catch (error) {
      next(error);
    }
  };
}
