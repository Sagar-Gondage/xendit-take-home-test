// src/controllers/delivery.controller.ts
import { Request, Response, NextFunction } from 'express';
import { DeliveryService } from '../services/delivery.service';
import { BadRequestError } from '../utils/errors';

export class DeliveryController {
  private deliveryService: DeliveryService;

  constructor() {
    this.deliveryService = new DeliveryService();
  }

  public getAvailableDeliveryPersonnel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const deliveryPersonnel = await this.deliveryService.getAvailableDeliveryPersonnel();
      
      res.status(200).json({
        status: 'success',
        results: deliveryPersonnel.length,
        data: {
          deliveryPersonnel
        }
      });
    } catch (error) {
      next(error);
    }
  };

  public getOrdersForDelivery = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId) {
        throw new BadRequestError('User ID is required');
      }
      
      const orders = await this.deliveryService.getOrdersForDelivery(req.user.userId);
      
      res.status(200).json({
        status: 'success',
        results: orders.length,
        data: {
          orders
        }
      });
    } catch (error) {
      next(error);
    }
  };

  public updateDeliveryLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId) {
        throw new BadRequestError('User ID is required');
      }
      
      const { orderId, location, status, message } = req.body;
      
      if (!orderId || !location || !location.latitude || !location.longitude) {
        throw new BadRequestError('Order ID and location are required');
      }
      
      // Add timestamp to location
      const locationWithTimestamp = {
        ...location,
        timestamp: new Date()
      };
      
      await this.deliveryService.updateDeliveryLocation(req.user.userId, {
        orderId,
        location: locationWithTimestamp,
        status,
        message
      });
      
      res.status(200).json({
        status: 'success',
        data: null
      });
    } catch (error) {
      next(error);
    }
  };

  public getDeliveryLocationUpdates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId || !req.user.role) {
        throw new BadRequestError('User ID and role are required');
      }
      
      const { orderId } = req.params;
      const locationUpdates = await this.deliveryService.getDeliveryLocationUpdates(
        orderId,
        req.user.userId,
        req.user.role
      );
      
      res.status(200).json({
        status: 'success',
        results: locationUpdates.length,
        data: {
          locationUpdates
        }
      });
    } catch (error) {
      next(error);
    }
  };

  public estimateDeliveryTime = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orderId } = req.params;
      const estimatedTime = await this.deliveryService.estimateDeliveryTime(orderId);
      
      res.status(200).json({
        status: 'success',
        data: {
          estimatedDeliveryTime: estimatedTime
        }
      });
    } catch (error) {
      next(error);
    }
  };
}
