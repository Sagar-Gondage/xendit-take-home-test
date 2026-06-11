// src/controllers/analytics.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { TimeFrame } from '../types/analytics.types';
import { BadRequestError } from '../utils/errors';

export class AnalyticsController {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  public getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { restaurantId } = this.extractParams(req);

      const dashboard = await this.analyticsService.getDashboardSummary(
        restaurantId,
        req.user!.userId,
        req.user!.role
      );

      res.status(200).json({
        status: 'success',
        data: { dashboard },
      });
    } catch (error) {
      next(error);
    }
  };

  public getSalesData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { restaurantId, timeFrame, startDate, endDate } = this.extractParams(req);

      const salesData = await this.analyticsService.getSalesData(
        restaurantId,
        timeFrame,
        startDate,
        endDate,
        req.user!.userId,
        req.user!.role
      );

      res.status(200).json({
        status: 'success',
        data: { salesData },
      });
    } catch (error) {
      next(error);
    }
  };

  public getPopularItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { restaurantId, startDate } = this.extractParams(req);
      const limit = req.query.limit ? Number(req.query.limit) : 10;

      const popularItems = await this.analyticsService.getPopularItems(
        restaurantId,
        startDate,
        limit
      );

      res.status(200).json({
        status: 'success',
        data: { popularItems },
      });
    } catch (error) {
      next(error);
    }
  };

  public getPeakHours = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { restaurantId, startDate } = this.extractParams(req);

      const peakHours = await this.analyticsService.getPeakHours(restaurantId, startDate);

      res.status(200).json({
        status: 'success',
        data: { peakHours },
      });
    } catch (error) {
      next(error);
    }
  };

  public getDeliveryPerformance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { restaurantId, startDate } = this.extractParams(req);

      const performance = await this.analyticsService.getDeliveryPerformance(
        restaurantId,
        startDate
      );

      res.status(200).json({
        status: 'success',
        data: { performance },
      });
    } catch (error) {
      next(error);
    }
  };

  public getCustomerRetention = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { restaurantId, startDate } = this.extractParams(req);

      const retention = await this.analyticsService.getCustomerRetention(
        restaurantId,
        startDate
      );

      res.status(200).json({
        status: 'success',
        data: { retention },
      });
    } catch (error) {
      next(error);
    }
  };

  public exportData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { restaurantId, startDate, endDate } = this.extractParams(req);

      const data = await this.analyticsService.exportData(
        restaurantId,
        startDate,
        endDate,
        req.user!.userId,
        req.user!.role
      );

      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  private extractParams(req: Request) {
    const restaurantId = req.query.restaurantId as string;
    if (!restaurantId) {
      throw new BadRequestError('restaurantId query parameter is required');
    }

    const timeFrame = (req.query.timeFrame as TimeFrame) || TimeFrame.WEEK;
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : thirtyDaysAgo;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : now;

    return { restaurantId, timeFrame, startDate, endDate };
  }
}
