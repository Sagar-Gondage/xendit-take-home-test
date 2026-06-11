// src/controllers/scheduling.controller.ts
import { Request, Response, NextFunction } from 'express';
import { SchedulingService } from '../services/scheduling.service';
import { BadRequestError } from '../utils/errors';

export class SchedulingController {
  private schedulingService: SchedulingService;

  constructor() {
    this.schedulingService = new SchedulingService();
  }

  public scheduleOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId) {
        throw new BadRequestError('User ID is required');
      }

      const { orderId, scheduledFor } = req.body;

      if (!orderId || !scheduledFor) {
        throw new BadRequestError('orderId and scheduledFor are required');
      }

      const scheduledDate = new Date(scheduledFor);
      if (isNaN(scheduledDate.getTime())) {
        throw new BadRequestError('Invalid date format for scheduledFor');
      }

      const order = await this.schedulingService.scheduleOrder(
        orderId,
        scheduledDate,
        req.user.userId
      );

      res.status(200).json({
        status: 'success',
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  };

  public getScheduledOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId) {
        throw new BadRequestError('User ID is required');
      }

      const orders = await this.schedulingService.getScheduledOrders(req.user.userId);

      res.status(200).json({
        status: 'success',
        results: orders.length,
        data: { orders },
      });
    } catch (error) {
      next(error);
    }
  };

  public modifyScheduledOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId) {
        throw new BadRequestError('User ID is required');
      }

      const { id } = req.params;
      const { scheduledFor } = req.body;

      if (!scheduledFor) {
        throw new BadRequestError('scheduledFor is required');
      }

      const scheduledDate = new Date(scheduledFor);
      if (isNaN(scheduledDate.getTime())) {
        throw new BadRequestError('Invalid date format for scheduledFor');
      }

      const order = await this.schedulingService.modifyScheduledOrder(
        id,
        scheduledDate,
        req.user.userId
      );

      res.status(200).json({
        status: 'success',
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  };

  public cancelScheduledOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId) {
        throw new BadRequestError('User ID is required');
      }

      const { id } = req.params;
      const order = await this.schedulingService.cancelScheduledOrder(id, req.user.userId);

      res.status(200).json({
        status: 'success',
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  };
}
