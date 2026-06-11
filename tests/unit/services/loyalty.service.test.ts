// tests/unit/services/loyalty.service.test.ts
import '../../setup';
import { LoyaltyService } from '../../../src/services/loyalty.service';
import { LoyaltyPoints, Reward, Redemption } from '../../../src/models/loyalty.model';
import {
  createTestUser,
  createTestRestaurant,
  createTestOrder,
} from '../../helpers/test.helpers';
import { LoyaltyTier } from '../../../src/types/loyalty.types';
import { OrderStatus, PaymentStatus } from '../../../src/types/order.types';

// Setup MongoDB in-memory server
import '../../setup';

describe('LoyaltyService', () => {
  let loyaltyService: LoyaltyService;
  let customerId: string;
  let restaurantId: string;

  beforeAll(() => {
    loyaltyService = new LoyaltyService();
  });

  beforeEach(async () => {
    const { user: customer } = await createTestUser({ role: 'customer', email: 'customer@test.com' });
    customerId = customer._id.toString();

    const { user: owner } = await createTestUser({ role: 'restaurant', email: 'owner@test.com' });
    const restaurant = await createTestRestaurant(owner._id.toString());
    restaurantId = restaurant._id.toString();
  });

  describe('getLoyaltyAccount', () => {
    it('should create a new account if none exists', async () => {
      const account = await loyaltyService.getLoyaltyAccount(customerId);

      expect(account).toBeDefined();
      expect(account.userId.toString()).toBe(customerId);
      expect(account.points).toBe(0);
      expect(account.lifetimePoints).toBe(0);
      expect(account.tier).toBe(LoyaltyTier.BRONZE);
    });

    it('should return existing account', async () => {
      await loyaltyService.getLoyaltyAccount(customerId);
      const account = await loyaltyService.getLoyaltyAccount(customerId);

      expect(account).toBeDefined();
      expect(account.points).toBe(0);
    });
  });

  describe('earnPoints', () => {
    it('should earn points from an order', async () => {
      const order = await createTestOrder(customerId, restaurantId, {
        status: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.COMPLETED,
      });

      const account = await loyaltyService.earnPoints(
        customerId,
        order._id.toString(),
        50.0
      );

      // Bronze tier: 1x multiplier, $50 order = 50 points
      expect(account.points).toBe(50);
      expect(account.lifetimePoints).toBe(50);
    });

    it('should apply tier multiplier for higher tiers', async () => {
      // Manually set account to SILVER tier
      await LoyaltyPoints.create({
        userId: customerId,
        points: 500,
        lifetimePoints: 500,
        tier: LoyaltyTier.SILVER,
        history: [],
      });

      const order = await createTestOrder(customerId, restaurantId);
      const account = await loyaltyService.earnPoints(
        customerId,
        order._id.toString(),
        100.0
      );

      // Silver tier: 1.5x multiplier, $100 order = 150 points
      expect(account.points).toBe(650); // 500 existing + 150 earned
    });

    it('should upgrade tier when lifetime points threshold is met', async () => {
      // Create account at bronze just below silver threshold
      await LoyaltyPoints.create({
        userId: customerId,
        points: 490,
        lifetimePoints: 490,
        tier: LoyaltyTier.BRONZE,
        history: [],
      });

      const order = await createTestOrder(customerId, restaurantId);
      const account = await loyaltyService.earnPoints(
        customerId,
        order._id.toString(),
        20.0 // +20 points → 510 lifetime → silver
      );

      expect(account.tier).toBe(LoyaltyTier.SILVER);
    });

    it('should add expiration date to earned points', async () => {
      const order = await createTestOrder(customerId, restaurantId);
      const account = await loyaltyService.earnPoints(
        customerId,
        order._id.toString(),
        25.0
      );

      const lastTransaction = account.history[account.history.length - 1];
      expect(lastTransaction.type).toBe('earned');
      expect(lastTransaction.expiresAt).toBeDefined();
      // Expiry should be roughly 12 months from now
      const expectedExpiry = new Date();
      expectedExpiry.setMonth(expectedExpiry.getMonth() + 12);
      const diff = Math.abs(lastTransaction.expiresAt!.getTime() - expectedExpiry.getTime());
      expect(diff).toBeLessThan(60000); // Within 1 minute tolerance
    });
  });

  describe('redeemReward', () => {
    let rewardId: string;

    beforeEach(async () => {
      // Give user some points
      await LoyaltyPoints.create({
        userId: customerId,
        points: 200,
        lifetimePoints: 200,
        tier: LoyaltyTier.BRONZE,
        history: [],
      });

      // Create a reward
      const reward = await Reward.create({
        name: 'Free Delivery',
        description: 'Free delivery on your next order',
        pointsCost: 100,
        tier: LoyaltyTier.BRONZE,
        discountType: 'fixed',
        discountValue: 5,
        isActive: true,
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000 * 30),
      });
      rewardId = reward._id.toString();
    });

    it('should successfully redeem a reward', async () => {
      const redemption = await loyaltyService.redeemReward(customerId, rewardId);

      expect(redemption).toBeDefined();
      expect(redemption.userId.toString()).toBe(customerId);
      expect(redemption.pointsUsed).toBe(100);
      expect(redemption.status).toBe('pending');
      expect(redemption.code).toBeDefined();

      // Check points were deducted
      const account = await LoyaltyPoints.findOne({ userId: customerId });
      expect(account!.points).toBe(100);
    });

    it('should reject redemption with insufficient points', async () => {
      // Set points to below reward cost
      await LoyaltyPoints.findOneAndUpdate(
        { userId: customerId },
        { points: 50 }
      );

      await expect(
        loyaltyService.redeemReward(customerId, rewardId)
      ).rejects.toThrow('Insufficient points');
    });

    it('should reject redemption of non-existent reward', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await expect(
        loyaltyService.redeemReward(customerId, fakeId)
      ).rejects.toThrow('Reward not found');
    });

    it('should reject redemption of inactive reward', async () => {
      await Reward.findByIdAndUpdate(rewardId, { isActive: false });

      await expect(
        loyaltyService.redeemReward(customerId, rewardId)
      ).rejects.toThrow('This reward is no longer active');
    });

    it('should reject redemption for users below required tier', async () => {
      // Create a gold-tier reward
      const goldReward = await Reward.create({
        name: 'Gold Reward',
        description: 'Premium reward',
        pointsCost: 50,
        tier: LoyaltyTier.GOLD,
        discountType: 'percentage',
        discountValue: 20,
        isActive: true,
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000 * 30),
      });

      await expect(
        loyaltyService.redeemReward(customerId, goldReward._id.toString())
      ).rejects.toThrow('requires gold tier or higher');
    });
  });

  describe('applyRedemptionToOrder', () => {
    it('should apply redemption discount to an order', async () => {
      // Setup account and reward
      await LoyaltyPoints.create({
        userId: customerId,
        points: 200,
        lifetimePoints: 200,
        tier: LoyaltyTier.BRONZE,
        history: [],
      });

      const reward = await Reward.create({
        name: '$5 Off',
        description: '$5 off your order',
        pointsCost: 50,
        tier: LoyaltyTier.BRONZE,
        discountType: 'fixed',
        discountValue: 5,
        isActive: true,
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000 * 30),
      });

      // Redeem to get code
      const redemption = await loyaltyService.redeemReward(customerId, reward._id.toString());

      // Create order and apply
      const order = await createTestOrder(customerId, restaurantId);
      const result = await loyaltyService.applyRedemptionToOrder(
        redemption.code,
        order._id.toString(),
        customerId
      );

      expect(result.discount).toBe(5);
    });

    it('should reject expired redemption codes', async () => {
      // Create an expired redemption directly
      await Redemption.create({
        userId: customerId,
        rewardId: '507f1f77bcf86cd799439011',
        pointsUsed: 100,
        status: 'pending',
        code: 'EXPIRED123',
        expiresAt: new Date(Date.now() - 86400000), // Expired yesterday
      });

      const order = await createTestOrder(customerId, restaurantId);
      await expect(
        loyaltyService.applyRedemptionToOrder('EXPIRED123', order._id.toString(), customerId)
      ).rejects.toThrow('expired');
    });
  });

  describe('getAvailableRewards', () => {
    beforeEach(async () => {
      await LoyaltyPoints.create({
        userId: customerId,
        points: 100,
        lifetimePoints: 100,
        tier: LoyaltyTier.BRONZE,
        history: [],
      });

      // Create rewards for different tiers
      await Reward.create({
        name: 'Bronze Reward',
        description: 'For bronze',
        pointsCost: 50,
        tier: LoyaltyTier.BRONZE,
        discountType: 'fixed',
        discountValue: 3,
        isActive: true,
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000 * 30),
      });
      await Reward.create({
        name: 'Silver Reward',
        description: 'For silver',
        pointsCost: 100,
        tier: LoyaltyTier.SILVER,
        discountType: 'fixed',
        discountValue: 10,
        isActive: true,
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000 * 30),
      });
    });

    it('should return only rewards available for user tier', async () => {
      const rewards = await loyaltyService.getAvailableRewards(customerId);
      expect(rewards).toHaveLength(1); // Only bronze reward
      expect(rewards[0].name).toBe('Bronze Reward');
    });
  });

  describe('expirePoints', () => {
    it('should expire old points', async () => {
      const pastDate = new Date(Date.now() - 86400000); // Yesterday
      await LoyaltyPoints.create({
        userId: customerId,
        points: 100,
        lifetimePoints: 100,
        tier: LoyaltyTier.BRONZE,
        history: [
          {
            type: 'earned',
            points: 100,
            description: 'Old points',
            expiresAt: pastDate,
            createdAt: new Date(Date.now() - 365 * 86400000),
          },
        ],
      });

      const expired = await loyaltyService.expirePoints();
      expect(expired).toBe(100);

      // Verify account points deducted
      const account = await LoyaltyPoints.findOne({ userId: customerId });
      expect(account!.points).toBe(0);
    });

    it('should not expire points that are not yet due', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 365); // Next year
      await LoyaltyPoints.create({
        userId: customerId,
        points: 100,
        lifetimePoints: 100,
        tier: LoyaltyTier.BRONZE,
        history: [
          {
            type: 'earned',
            points: 100,
            description: 'Fresh points',
            expiresAt: futureDate,
            createdAt: new Date(),
          },
        ],
      });

      const expired = await loyaltyService.expirePoints();
      expect(expired).toBe(0);
    });
  });

  describe('getTierConfig', () => {
    it('should return all tier configurations', () => {
      const config = loyaltyService.getTierConfig();
      expect(config).toHaveLength(4);
      expect(config[0].tier).toBe(LoyaltyTier.BRONZE);
      expect(config[3].tier).toBe(LoyaltyTier.PLATINUM);
    });
  });
});
