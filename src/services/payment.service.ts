// src/services/payment.service.ts
import Order from '../models/order.model';
import { PaymentStatus } from '../types/order.types';
import { NotFoundError, BadRequestError } from '../utils/errors';

// In a real application, this would integrate with actual payment gateways
// For this take-home test, we'll simulate payment processing

interface PaymentMethod {
  type: 'credit_card' | 'paypal' | 'apple_pay' | 'google_pay';
  details: any;
}

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export class PaymentService {
  public async processPayment(orderId: string, paymentMethod: PaymentMethod): Promise<PaymentResult> {
    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }
    
    // Check if payment is already processed
    if (order.paymentStatus === PaymentStatus.COMPLETED) {
      throw new BadRequestError('Payment has already been processed for this order');
    }
    
    // Simulate payment processing
    // In a real application, this would call a payment gateway API
    const success = Math.random() > 0.1; // 90% success rate for simulation
    
    if (success) {
      // Generate a fake transaction ID
      const transactionId = `txn_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
      
      // Update order payment status
      order.paymentStatus = PaymentStatus.COMPLETED;
      order.paymentMethod = paymentMethod.type;
      await order.save();
      
      return {
        success: true,
        transactionId
      };
    } else {
      // Update order payment status
      order.paymentStatus = PaymentStatus.FAILED;
      await order.save();
      
      return {
        success: false,
        error: 'Payment processing failed. Please try again with a different payment method.'
      };
    }
  }
  
  public async getPaymentStatus(orderId: string): Promise<PaymentStatus> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }
    
    return order.paymentStatus;
  }
  
  public async refundPayment(orderId: string): Promise<PaymentResult> {
    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }
    
    // Check if payment can be refunded
    if (order.paymentStatus !== PaymentStatus.COMPLETED) {
      throw new BadRequestError('Cannot refund payment that has not been completed');
    }
    
    // Simulate refund processing
    // In a real application, this would call a payment gateway API
    const success = Math.random() > 0.05; // 95% success rate for simulation
    
    if (success) {
      // Update order payment status
      order.paymentStatus = PaymentStatus.REFUNDED;
      await order.save();
      
      return {
        success: true
      };
    } else {
      return {
        success: false,
        error: 'Refund processing failed. Please try again later.'
      };
    }
  }
}
