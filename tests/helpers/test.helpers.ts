// tests/helpers/test.helpers.ts
import mongoose from 'mongoose';
import User from '../../src/models/user.model';
import Restaurant from '../../src/models/restaurant.model';
import MenuItem from '../../src/models/menu.model';
import Order from '../../src/models/order.model';
import { UserRole } from '../../src/types/user.types';
import { OrderStatus, PaymentStatus } from '../../src/types/order.types';
import { generateToken } from '../../src/utils/jwt';

export const createTestUser = async (overrides: any = {}) => {
  const defaults = {
    email: `test${Date.now()}@example.com`,
    password: 'password123',
    name: 'Test User',
    phone: '+1234567890',
    address: {
      street: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
      country: 'US',
    },
    role: UserRole.CUSTOMER,
  };
  const userData = { ...defaults, ...overrides };
  const user = await User.create(userData);
  const token = generateToken({ userId: user._id.toString(), role: user.role });
  return { user, token };
};

export const createTestRestaurant = async (ownerId: string, overrides: any = {}) => {
  const defaults = {
    name: 'Test Restaurant',
    description: 'A test restaurant',
    cuisine: ['italian', 'pizza'],
    address: {
      street: '456 Restaurant Ave',
      city: 'Food City',
      state: 'FC',
      zipCode: '67890',
      country: 'US',
    },
    location: {
      type: 'Point',
      coordinates: [-73.935242, 40.730610], // NYC area
    },
    ownerId,
    phone: '+1987654321',
    email: 'restaurant@test.com',
    contactPhone: '+1987654321',
    logo: 'https://example.com/logo.png',
    operatingHours: {
      monday: { open: '08:00', close: '22:00' },
      tuesday: { open: '08:00', close: '22:00' },
      wednesday: { open: '08:00', close: '22:00' },
      thursday: { open: '08:00', close: '22:00' },
      friday: { open: '08:00', close: '23:00' },
      saturday: { open: '09:00', close: '23:00' },
      sunday: { open: '09:00', close: '21:00' },
    },
    isActive: true,
    rating: 4.5,
    averageDeliveryTime: 30,
    minimumOrderValue: 10,
    totalOrders: 100,
  };
  return Restaurant.create({ ...defaults, ...overrides });
};

export const createTestMenuItem = async (restaurantId: string, overrides: any = {}) => {
  const defaults = {
    restaurantId,
    name: 'Test Pizza',
    description: 'A delicious test pizza',
    price: 12.99,
    category: 'pizza',
    image: 'https://example.com/pizza.jpg',
    isAvailable: true,
    dietaryRestrictions: [],
    allergens: [],
    spiceLevel: 0,
    popularity: 50,
    averageRating: 4.2,
  };
  return MenuItem.create({ ...defaults, ...overrides });
};

export const createTestOrder = async (
  customerId: string,
  restaurantId: string,
  overrides: any = {}
) => {
  const defaults = {
    customerId,
    restaurantId,
    items: [
      {
        menuItemId: new mongoose.Types.ObjectId(),
        name: 'Test Item',
        price: 15.99,
        quantity: 2,
      },
    ],
    subtotal: 31.98,
    deliveryFee: 5.0,
    tax: 3.20,
    total: 40.18,
    status: OrderStatus.PENDING,
    paymentStatus: PaymentStatus.PENDING,
    paymentMethod: 'credit_card',
    deliveryAddress: {
      street: '789 Delivery Rd',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
      country: 'US',
    },
  };
  return Order.create({ ...defaults, ...overrides });
};

export const generateAuthToken = (userId: string, role: UserRole = UserRole.CUSTOMER) => {
  return generateToken({ userId, role });
};
