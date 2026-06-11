// src/services/delivery.service.ts
import Order from '../models/order.model';
import User from '../models/user.model';
import { OrderStatus } from '../types/order.types';
import { UserRole } from '../types/user.types';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';

interface ILocation {
  latitude: number;
  longitude: number;
  timestamp: Date;
}

interface IDeliveryUpdate {
  orderId: string;
  location: ILocation;
  status?: OrderStatus;
  message?: string;
}

// In a real application, this would be stored in a database
// For simplicity in this take-home test, we'll use an in-memory store
const deliveryLocationStore: Map<string, ILocation[]> = new Map();

export class DeliveryService {
  public async getAvailableDeliveryPersonnel(): Promise<any[]> {
    // In a real application, this would include logic to find delivery personnel
    // who are currently available and nearby
    return User.find({ role: UserRole.DELIVERY })
      .select('_id name phone')
      .lean();
  }
  
  public async getOrdersForDelivery(deliveryPersonId: string): Promise<any[]> {
    return Order.find({
      deliveryPersonId,
      status: {
        $in: [
          OrderStatus.CONFIRMED,
          OrderStatus.PREPARING,
          OrderStatus.OUT_FOR_DELIVERY
        ]
      }
    })
    .select('_id restaurantId customerId status estimatedDeliveryTime deliveryAddress')
    .sort({ estimatedDeliveryTime: 1 })
    .lean();
  }
  
  public async updateDeliveryLocation(
    deliveryPersonId: string,
    update: IDeliveryUpdate
  ): Promise<void> {
    const { orderId, location, status } = update;
    
    // Verify order exists and belongs to this delivery person
    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }
    
    if (order.deliveryPersonId?.toString() !== deliveryPersonId) {
      throw new ForbiddenError('You are not assigned to this order');
    }
    
    // Store location update
    if (!deliveryLocationStore.has(orderId)) {
      deliveryLocationStore.set(orderId, []);
    }
    
    deliveryLocationStore.get(orderId)?.push(location);
    
    // Update order status if provided
    if (status) {
      // Validate status transition
      const validTransitions: Record<OrderStatus, OrderStatus[]> = {
        [OrderStatus.PENDING]: [],
        [OrderStatus.CONFIRMED]: [OrderStatus.OUT_FOR_DELIVERY],
        [OrderStatus.PREPARING]: [OrderStatus.OUT_FOR_DELIVERY],
        [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
        [OrderStatus.DELIVERED]: [],
        [OrderStatus.CANCELLED]: []
      };
      
      if (!validTransitions[order.status].includes(status)) {
        throw new BadRequestError(`Cannot transition from ${order.status} to ${status}`);
      }
      
      order.status = status;
      
      // If order is delivered, set actual delivery time
      if (status === OrderStatus.DELIVERED) {
        order.actualDeliveryTime = new Date();
      }
      
      await order.save();
    }
  }
  
  public async getDeliveryLocationUpdates(orderId: string, userId: string, role: string): Promise<ILocation[]> {
    // Verify order exists
    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }
    
    // Check if user has permission to view this order's location
    if (role === UserRole.CUSTOMER && order.customerId.toString() !== userId) {
      throw new ForbiddenError('You are not authorized to track this order');
    } else if (role === UserRole.DELIVERY && order.deliveryPersonId?.toString() !== userId) {
      throw new ForbiddenError('You are not assigned to this order');
    }
    
    // Return location updates
    return deliveryLocationStore.get(orderId) || [];
  }
  
  public async estimateDeliveryTime(orderId: string): Promise<Date> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }
    
    // In a real application, this would use the current location, traffic data,
    // and historical delivery times to calculate an accurate estimate
    // For simplicity, we'll just return the existing estimate or update it
    
    if (order.status === OrderStatus.OUT_FOR_DELIVERY) {
      // Recalculate based on current time
      const estimatedTimeMinutes = 20; // 20 minutes from now
      const newEstimate = new Date(Date.now() + estimatedTimeMinutes * 60000);
      
      order.estimatedDeliveryTime = newEstimate;
      await order.save();
      
      return newEstimate;
    }
    
    return order.estimatedDeliveryTime || new Date(Date.now() + 45 * 60000);
  }
}
