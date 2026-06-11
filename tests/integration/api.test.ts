// tests/integration/api.test.ts
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock the database module to prevent real connection
jest.mock('../../src/config/database', () => ({
  connectDB: jest.fn(),
  disconnectDB: jest.fn(),
}));

import app from '../../src/app';
import User from '../../src/models/user.model';
import Restaurant from '../../src/models/restaurant.model';
import MenuItem from '../../src/models/menu.model';
import Order from '../../src/models/order.model';
import { LoyaltyPoints, Reward } from '../../src/models/loyalty.model';
import { generateToken } from '../../src/utils/jwt';
import { UserRole } from '../../src/types/user.types';
import { OrderStatus, PaymentStatus } from '../../src/types/order.types';
import { LoyaltyTier } from '../../src/types/loyalty.types';
import { SupportedLanguage } from '../../src/types/i18n.types';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Helper to create user + token
const createUser = async (role: UserRole = UserRole.CUSTOMER, email?: string) => {
  const user = await User.create({
    email: email || `${role}${Date.now()}@test.com`,
    password: 'password123',
    name: `Test ${role}`,
    phone: '+1234567890',
    address: {
      street: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
      country: 'US',
    },
    role,
  });
  const token = generateToken({ userId: user._id.toString(), role });
  return { user, token };
};

const createRestaurant = async (ownerId: string) => {
  return Restaurant.create({
    name: 'Test Restaurant',
    description: 'A test restaurant',
    cuisine: ['italian'],
    address: {
      street: '456 Restaurant Ave',
      city: 'Food City',
      state: 'FC',
      zipCode: '67890',
      country: 'US',
    },
    location: {
      type: 'Point',
      coordinates: [-73.935242, 40.730610],
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
  });
};

describe('API Integration Tests', () => {
  describe('Health Check', () => {
    it('GET /health should return 200', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });
  });

  describe('Auth API', () => {
    describe('POST /api/auth/register', () => {
      it('should register a new user', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'newuser@test.com',
            password: 'password123',
            name: 'New User',
            phone: '+1234567890',
            address: {
              street: '123 New St',
              city: 'New City',
              state: 'NC',
              zipCode: '11111',
              country: 'US',
            },
            role: 'customer',
          });

        expect(res.status).toBe(201);
        expect(res.body.data.token).toBeDefined();
        expect(res.body.data.user.email).toBe('newuser@test.com');
      });

      it('should reject duplicate email', async () => {
        await createUser(UserRole.CUSTOMER, 'dup@test.com');

        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'dup@test.com',
            password: 'password123',
            name: 'Dup User',
            phone: '+1234567890',
            address: {
              street: '123 St',
              city: 'City',
              state: 'ST',
              zipCode: '12345',
              country: 'US',
            },
          });

        expect(res.status).toBe(400);
      });

      it('should reject invalid email', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'notanemail',
            password: 'password123',
            name: 'Bad Email',
          });

        expect(res.status).toBeGreaterThanOrEqual(400);
      });
    });

    describe('POST /api/auth/login', () => {
      it('should login with valid credentials', async () => {
        await request(app)
          .post('/api/auth/register')
          .send({
            email: 'login@test.com',
            password: 'password123',
            name: 'Login User',
            phone: '+1234567890',
            address: {
              street: '123 St',
              city: 'City',
              state: 'ST',
              zipCode: '12345',
              country: 'US',
            },
          });

        const res = await request(app)
          .post('/api/auth/login')
          .send({ email: 'login@test.com', password: 'password123' });

        expect(res.status).toBe(200);
        expect(res.body.data.token).toBeDefined();
      });

      it('should reject invalid password', async () => {
        await request(app)
          .post('/api/auth/register')
          .send({
            email: 'badpw@test.com',
            password: 'correctpw',
            name: 'User',
            phone: '+1234567890',
            address: {
              street: '123 St',
              city: 'City',
              state: 'ST',
              zipCode: '12345',
              country: 'US',
            },
          });

        const res = await request(app)
          .post('/api/auth/login')
          .send({ email: 'badpw@test.com', password: 'wrongpw' });

        expect(res.status).toBe(401);
      });
    });

    describe('GET /api/auth/me', () => {
      it('should return user profile with valid token', async () => {
        const { token } = await createUser(UserRole.CUSTOMER, 'me@test.com');

        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data.user.email).toBe('me@test.com');
      });

      it('should reject request without token', async () => {
        const res = await request(app).get('/api/auth/me');
        expect(res.status).toBe(401);
      });

      it('should reject invalid token', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'Bearer invalidtoken123');
        expect(res.status).toBe(401);
      });
    });
  });

  describe('Search API', () => {
    beforeEach(async () => {
      const { user: owner } = await createUser(UserRole.RESTAURANT, 'searchowner@test.com');
      const restaurant = await createRestaurant(owner._id.toString());

      await MenuItem.create({
        restaurantId: restaurant._id,
        name: 'Margherita Pizza',
        description: 'Classic pizza with mozzarella',
        price: 14.99,
        category: 'pizza',
        image: 'https://example.com/pizza.jpg',
        isAvailable: true,
      });
      await MenuItem.create({
        restaurantId: restaurant._id,
        name: 'Caesar Salad',
        description: 'Fresh romaine with caesar dressing',
        price: 9.99,
        category: 'salad',
        image: 'https://example.com/salad.jpg',
        isAvailable: true,
      });
    });

    describe('GET /api/search/restaurants', () => {
      it('should search restaurants', async () => {
        const res = await request(app)
          .get('/api/search/restaurants')
          .query({ search: 'Test' });

        expect(res.status).toBe(200);
        expect(res.body.data.restaurants).toBeDefined();
      });

      it('should filter by cuisine', async () => {
        const res = await request(app)
          .get('/api/search/restaurants')
          .query({ cuisine: 'italian' });

        expect(res.status).toBe(200);
      });
    });

    describe('GET /api/search/menu', () => {
      it('should search menu items', async () => {
        const res = await request(app)
          .get('/api/search/menu')
          .query({ search: 'pizza' });

        expect(res.status).toBe(200);
      });
    });
  });

  describe('Loyalty API', () => {
    let customerToken: string;
    let customerId: string;

    beforeEach(async () => {
      const { user, token } = await createUser(UserRole.CUSTOMER, 'loyaltyuser@test.com');
      customerToken = token;
      customerId = user._id.toString();
    });

    describe('GET /api/loyalty/tiers', () => {
      it('should return tier config (public route)', async () => {
        const res = await request(app).get('/api/loyalty/tiers');

        expect(res.status).toBe(200);
        expect(res.body.data.tiers).toHaveLength(4);
        expect(res.body.data.tiers[0].tier).toBe('bronze');
      });
    });

    describe('GET /api/loyalty/account', () => {
      it('should return loyalty account for authenticated customer', async () => {
        const res = await request(app)
          .get('/api/loyalty/account')
          .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.account.points).toBe(0);
        expect(res.body.data.account.tier).toBe('bronze');
      });

      it('should reject non-customer role', async () => {
        const { token } = await createUser(UserRole.RESTAURANT, 'noncust@test.com');

        const res = await request(app)
          .get('/api/loyalty/account')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
      });

      it('should reject unauthenticated request', async () => {
        const res = await request(app).get('/api/loyalty/account');
        expect(res.status).toBe(401);
      });
    });

    describe('GET /api/loyalty/rewards', () => {
      it('should return available rewards for customer tier', async () => {
        // Create a reward
        await Reward.create({
          name: 'Free Delivery',
          description: 'Free delivery on next order',
          pointsCost: 100,
          tier: LoyaltyTier.BRONZE,
          discountType: 'fixed',
          discountValue: 5,
          isActive: true,
          validFrom: new Date(Date.now() - 86400000),
          validUntil: new Date(Date.now() + 86400000 * 30),
        });

        const res = await request(app)
          .get('/api/loyalty/rewards')
          .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.rewards.length).toBeGreaterThan(0);
      });
    });

    describe('POST /api/loyalty/redeem', () => {
      it('should reject redemption with insufficient points', async () => {
        const reward = await Reward.create({
          name: 'Discount',
          description: 'Discount',
          pointsCost: 500,
          tier: LoyaltyTier.BRONZE,
          discountType: 'fixed',
          discountValue: 10,
          isActive: true,
          validFrom: new Date(Date.now() - 86400000),
          validUntil: new Date(Date.now() + 86400000 * 30),
        });

        const res = await request(app)
          .post('/api/loyalty/redeem')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ rewardId: reward._id.toString() });

        expect(res.status).toBe(400);
      });
    });
  });

  describe('Analytics API', () => {
    let ownerToken: string;
    let ownerId: string;
    let restaurantId: string;

    beforeEach(async () => {
      const { user: owner, token } = await createUser(UserRole.RESTAURANT, 'analyticsowner@test.com');
      ownerToken = token;
      ownerId = owner._id.toString();

      const restaurant = await createRestaurant(ownerId);
      restaurantId = restaurant._id.toString();

      // Create some orders
      const { user: customer } = await createUser(UserRole.CUSTOMER, 'analyticscust@test.com');
      for (let i = 0; i < 3; i++) {
        await Order.create({
          customerId: customer._id,
          restaurantId: restaurant._id,
          items: [{ menuItemId: new mongoose.Types.ObjectId(), name: 'Item', price: 20, quantity: 1 }],
          subtotal: 20,
          deliveryFee: 5,
          tax: 2.5,
          total: 27.5,
          status: OrderStatus.DELIVERED,
          paymentStatus: PaymentStatus.COMPLETED,
          paymentMethod: 'credit_card',
          deliveryAddress: {
            street: '123 St',
            city: 'City',
            state: 'ST',
            zipCode: '12345',
            country: 'US',
          },
        });
      }
    });

    describe('GET /api/analytics/dashboard', () => {
      it('should return dashboard for restaurant owner', async () => {
        const res = await request(app)
          .get('/api/analytics/dashboard')
          .set('Authorization', `Bearer ${ownerToken}`)
          .query({ restaurantId });

        expect(res.status).toBe(200);
        expect(res.body.data.dashboard.totalOrders).toBe(3);
        expect(res.body.data.dashboard.totalRevenue).toBeGreaterThan(0);
      });

      it('should deny access to non-owners', async () => {
        const { token } = await createUser(UserRole.RESTAURANT, 'other@test.com');

        const res = await request(app)
          .get('/api/analytics/dashboard')
          .set('Authorization', `Bearer ${token}`)
          .query({ restaurantId });

        expect(res.status).toBe(403);
      });

      it('should deny access to customers', async () => {
        const { token } = await createUser(UserRole.CUSTOMER, 'custanalytics@test.com');

        const res = await request(app)
          .get('/api/analytics/dashboard')
          .set('Authorization', `Bearer ${token}`)
          .query({ restaurantId });

        expect(res.status).toBe(403);
      });
    });

    describe('GET /api/analytics/popular-items', () => {
      it('should return popular items', async () => {
        const res = await request(app)
          .get('/api/analytics/popular-items')
          .set('Authorization', `Bearer ${ownerToken}`)
          .query({ restaurantId });

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data.popularItems)).toBe(true);
      });
    });

    describe('GET /api/analytics/peak-hours', () => {
      it('should return peak hours data', async () => {
        const res = await request(app)
          .get('/api/analytics/peak-hours')
          .set('Authorization', `Bearer ${ownerToken}`)
          .query({ restaurantId });

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data.peakHours)).toBe(true);
      });
    });
  });

  describe('I18n API', () => {
    let adminToken: string;
    let restaurantToken: string;

    beforeEach(async () => {
      const { token: aToken } = await createUser(UserRole.ADMIN, 'i18nadmin@test.com');
      adminToken = aToken;
      const { token: rToken } = await createUser(UserRole.RESTAURANT, 'i18nrest@test.com');
      restaurantToken = rToken;
    });

    describe('GET /api/i18n/languages', () => {
      it('should return supported languages (public)', async () => {
        const res = await request(app).get('/api/i18n/languages');

        expect(res.status).toBe(200);
        expect(res.body.data.languages).toContain('en');
        expect(res.body.data.languages).toContain('es');
        expect(res.body.data.languages).toContain('id');
      });
    });

    describe('POST /api/i18n', () => {
      it('should create translation as admin', async () => {
        const res = await request(app)
          .post('/api/i18n')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            entityType: 'restaurant',
            entityId: new mongoose.Types.ObjectId().toString(),
            language: 'es',
            fields: { name: 'Restaurante Test', description: 'Un restaurante de prueba' },
          });

        expect(res.status).toBe(200);
        expect(res.body.data.translation.language).toBe('es');
      });

      it('should create translation as restaurant owner', async () => {
        const res = await request(app)
          .post('/api/i18n')
          .set('Authorization', `Bearer ${restaurantToken}`)
          .send({
            entityType: 'menu_item',
            entityId: new mongoose.Types.ObjectId().toString(),
            language: 'fr',
            fields: { name: 'Pizza', description: 'Pizza délicieuse' },
          });

        expect(res.status).toBe(200);
      });

      it('should reject unauthenticated request', async () => {
        const res = await request(app)
          .post('/api/i18n')
          .send({
            entityType: 'restaurant',
            entityId: 'abc',
            language: 'es',
            fields: { name: 'Test' },
          });

        expect(res.status).toBe(401);
      });

      it('should reject customer role', async () => {
        const { token } = await createUser(UserRole.CUSTOMER, 'custlang@test.com');

        const res = await request(app)
          .post('/api/i18n')
          .set('Authorization', `Bearer ${token}`)
          .send({
            entityType: 'restaurant',
            entityId: 'abc',
            language: 'es',
            fields: { name: 'Test' },
          });

        expect(res.status).toBe(403);
      });
    });

    describe('GET /api/i18n/:entityType/:entityId', () => {
      it('should return translation for entity (public)', async () => {
        const entityId = new mongoose.Types.ObjectId().toString();

        // Create a translation first
        await request(app)
          .post('/api/i18n')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            entityType: 'restaurant',
            entityId,
            language: 'ja',
            fields: { name: 'テストレストラン' },
          });

        const res = await request(app)
          .get(`/api/i18n/restaurant/${entityId}`)
          .query({ language: 'ja' });

        expect(res.status).toBe(200);
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
    });

    it('should handle malformed JSON body gracefully', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"bad json');

      expect(res.status).toBe(400);
    });
  });
});
