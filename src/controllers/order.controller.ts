// src/controllers/order.controller.ts
import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';
import { BadRequestError } from '../utils/errors';
import { OrderStatus } from '../types/order.types';

export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  public getAllOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId || !req.user.role) {
        throw new BadRequestError('User ID and role are required');
      }
      
      const orders = await this.orderService.getAllOrders(req.user.userId, req.user.role);
      
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

  public getOrderById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId || !req.user.role) {
        throw new BadRequestError('User ID and role are required');
      }
      
      const { id } = req.params;
      const order = await this.orderService.getOrderById(id, req.user.userId, req.user.role);
      
      res.status(200).json({
        status: 'success',
        data: {
          order
        }
      });
    } catch (error) {
      next(error);
    }
  };

  public createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId) {
        throw new BadRequestError('User ID is required');
      }
      
      const order = await this.orderService.createOrder(req.body, req.user.userId);
      
      res.status(201).json({
        status: 'success',
        data: {
          order
        }
      });
    } catch (error) {
      next(error);
    }
  };

  public updateOrderStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId || !req.user.role) {
        throw new BadRequestError('User ID and role are required');
      }
      
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status || !Object.values(OrderStatus).includes(status as OrderStatus)) {
        throw new BadRequestError('Valid order status is required');
      }
      
      const order = await this.orderService.updateOrderStatus(
        id, 
        status as OrderStatus, 
        req.user.userId, 
        req.user.role
      );
      
      res.status(200).json({
        status: 'success',
        data: {
          order
        }
      });
    } catch (error) {
      next(error);
    }
  };

  public assignDeliveryPerson = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { deliveryPersonId } = req.body;
      
      if (!deliveryPersonId) {
        throw new BadRequestError('Delivery person ID is required');
      }
      
      const order = await this.orderService.assignDeliveryPerson(id, deliveryPersonId);
      
      res.status(200).json({
        status: 'success',
        data: {
          order
        }
      });
    } catch (error) {
      next(error);
    }
  };

  public cancelOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId || !req.user.role) {
        throw new BadRequestError('User ID and role are required');
      }
      
      const { id } = req.params;
      await this.orderService.cancelOrder(id, req.user.userId, req.user.role);
      
      res.status(204).json({
        status: 'success',
        data: null
      });
    } catch (error) {
      next(error);
    }
  };
}
