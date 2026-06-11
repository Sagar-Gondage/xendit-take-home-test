// src/controllers/payment.controller.ts
import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service';
import { BadRequestError } from '../utils/errors';

export class PaymentController {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  public processPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orderId, paymentMethod } = req.body;
      
      if (!orderId || !paymentMethod || !paymentMethod.type) {
        throw new BadRequestError('Order ID and payment method are required');
      }
      
      const result = await this.paymentService.processPayment(orderId, paymentMethod);
      
      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  public getPaymentStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orderId } = req.params;
      const paymentStatus = await this.paymentService.getPaymentStatus(orderId);
      
      res.status(200).json({
        status: 'success',
        data: {
          paymentStatus
        }
      });
    } catch (error) {
      next(error);
    }
  };

  public refundPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orderId } = req.params;
      const result = await this.paymentService.refundPayment(orderId);
      
      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
}
