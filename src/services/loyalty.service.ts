// src/services/loyalty.service.ts
import { LoyaltyPoints, Reward, Redemption } from '../models/loyalty.model';
import Order from '../models/order.model';
import { ILoyaltyPoints, IReward, IRedemption, LoyaltyTier, ILoyaltyTierConfig } from '../types/loyalty.types';
import { NotFoundError, BadRequestError } from '../utils/errors';
import crypto from 'crypto';

// Tier configuration
const TIER_CONFIG: ILoyaltyTierConfig[] = [
  {
    tier: LoyaltyTier.BRONZE,
    minPoints: 0,
    pointsMultiplier: 1,
    benefits: ['Earn 1 point per $1 spent'],
  },
  {
    tier: LoyaltyTier.SILVER,
    minPoints: 500,
    pointsMultiplier: 1.5,
    benefits: ['Earn 1.5 points per $1 spent', 'Free delivery on orders over $30'],
  },
  {
    tier: LoyaltyTier.GOLD,
    minPoints: 2000,
    pointsMultiplier: 2,
    benefits: ['Earn 2 points per $1 spent', 'Free delivery', 'Priority support'],
  },
  {
    tier: LoyaltyTier.PLATINUM,
    minPoints: 5000,
    pointsMultiplier: 3,
    benefits: ['Earn 3 points per $1 spent', 'Free delivery', 'Priority support', 'Exclusive rewards'],
  },
];

// Points expire after 12 months
const POINTS_EXPIRY_MONTHS = 12;

export class LoyaltyService {
  /**
   * Get or create loyalty account for a user
   */
  public async getLoyaltyAccount(userId: string) {
    let account = await LoyaltyPoints.findOne({ userId });
    if (!account) {
      account = await LoyaltyPoints.create({
        userId,
        points: 0,
        lifetimePoints: 0,
        tier: LoyaltyTier.BRONZE,
        history: [],
      });
    }
    return account;
  }

  /**
   * Earn points from a completed order
   */
  public async earnPoints(userId: string, orderId: string, orderTotal: number): Promise<ILoyaltyPoints> {
    const account = await this.getLoyaltyAccount(userId);
    const tierConfig = TIER_CONFIG.find(t => t.tier === account.tier) || TIER_CONFIG[0];

    // Calculate points: 1 point per $1 * multiplier, rounded down
    const basePoints = Math.floor(orderTotal);
    const earnedPoints = Math.floor(basePoints * tierConfig.pointsMultiplier);

    // Set expiration date
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + POINTS_EXPIRY_MONTHS);

    // Add to history
    account.history.push({
      type: 'earned',
      points: earnedPoints,
      orderId,
      description: `Earned ${earnedPoints} points from order`,
      expiresAt,
      createdAt: new Date(),
    });

    account.points += earnedPoints;
    account.lifetimePoints += earnedPoints;

    // Check for tier upgrade
    const newTier = this.calculateTier(account.lifetimePoints);
    if (newTier !== account.tier) {
      account.tier = newTier;
    }

    await account.save();

    // Update order with points earned
    await Order.findByIdAndUpdate(orderId, { loyaltyPointsEarned: earnedPoints });

    return account;
  }

  /**
   * Redeem points for a reward
   */
  public async redeemReward(userId: string, rewardId: string): Promise<IRedemption> {
    const account = await this.getLoyaltyAccount(userId);
    const reward = await Reward.findById(rewardId);

    if (!reward) {
      throw new NotFoundError('Reward not found');
    }

    if (!reward.isActive) {
      throw new BadRequestError('This reward is no longer active');
    }

    const now = new Date();
    if (now < reward.validFrom || now > reward.validUntil) {
      throw new BadRequestError('This reward is not currently valid');
    }

    // Check tier requirement
    const tierOrder = [LoyaltyTier.BRONZE, LoyaltyTier.SILVER, LoyaltyTier.GOLD, LoyaltyTier.PLATINUM];
    const userTierIndex = tierOrder.indexOf(account.tier);
    const requiredTierIndex = tierOrder.indexOf(reward.tier);

    if (userTierIndex < requiredTierIndex) {
      throw new BadRequestError(`This reward requires ${reward.tier} tier or higher`);
    }

    // Check points balance
    if (account.points < reward.pointsCost) {
      throw new BadRequestError(
        `Insufficient points. You have ${account.points} but need ${reward.pointsCost}`
      );
    }

    // Deduct points
    account.points -= reward.pointsCost;
    account.history.push({
      type: 'redeemed',
      points: -reward.pointsCost,
      description: `Redeemed ${reward.pointsCost} points for ${reward.name}`,
      createdAt: new Date(),
    });
    await account.save();

    // Create redemption code
    const code = this.generateRedemptionCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30-day expiry

    const redemption = await Redemption.create({
      userId,
      rewardId,
      pointsUsed: reward.pointsCost,
      status: 'pending',
      code,
      expiresAt,
    });

    return redemption;
  }

  /**
   * Apply a redemption code to an order
   */
  public async applyRedemptionToOrder(
    code: string,
    orderId: string,
    userId: string
  ): Promise<{ discount: number }> {
    const redemption = await Redemption.findOne({ code, userId, status: 'pending' });
    if (!redemption) {
      throw new NotFoundError('Redemption code not found or already used');
    }

    if (new Date() > redemption.expiresAt) {
      redemption.status = 'expired';
      await redemption.save();
      throw new BadRequestError('Redemption code has expired');
    }

    const reward = await Reward.findById(redemption.rewardId);
    if (!reward) {
      throw new NotFoundError('Reward not found');
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.customerId.toString() !== userId) {
      throw new BadRequestError('You can only apply codes to your own orders');
    }

    // Check minimum order value
    if (reward.minOrderValue && order.subtotal < reward.minOrderValue) {
      throw new BadRequestError(
        `Minimum order value of $${reward.minOrderValue} required for this reward`
      );
    }

    // Calculate discount
    let discount: number;
    if (reward.discountType === 'percentage') {
      discount = order.subtotal * (reward.discountValue / 100);
      if (reward.maxDiscount) {
        discount = Math.min(discount, reward.maxDiscount);
      }
    } else {
      discount = reward.discountValue;
    }

    discount = Math.min(discount, order.total); // Can't discount more than total

    // Update order
    order.loyaltyDiscount = discount;
    order.redemptionCode = code;
    order.total = order.total - discount;
    await order.save();

    // Mark redemption as applied
    redemption.status = 'applied';
    redemption.orderId = orderId;
    await redemption.save();

    return { discount };
  }

  /**
   * Get available rewards for a user's tier
   */
  public async getAvailableRewards(userId: string): Promise<IReward[]> {
    const account = await this.getLoyaltyAccount(userId);
    const tierOrder = [LoyaltyTier.BRONZE, LoyaltyTier.SILVER, LoyaltyTier.GOLD, LoyaltyTier.PLATINUM];
    const userTierIndex = tierOrder.indexOf(account.tier);

    const now = new Date();
    return Reward.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
      tier: { $in: tierOrder.slice(0, userTierIndex + 1) },
    }).sort({ pointsCost: 1 });
  }

  /**
   * Expire old points (called by cron job)
   */
  public async expirePoints(): Promise<number> {
    const now = new Date();
    const accounts = await LoyaltyPoints.find({
      'history.type': 'earned',
      'history.expiresAt': { $lte: now },
    });

    let totalExpired = 0;

    for (const account of accounts) {
      let expiredPoints = 0;

      for (const transaction of account.history) {
        if (
          transaction.type === 'earned' &&
          transaction.expiresAt &&
          transaction.expiresAt <= now
        ) {
          expiredPoints += transaction.points;
          transaction.type = 'expired';
        }
      }

      if (expiredPoints > 0) {
        account.points = Math.max(0, account.points - expiredPoints);
        account.history.push({
          type: 'expired',
          points: -expiredPoints,
          description: `${expiredPoints} points expired`,
          createdAt: new Date(),
        });
        await account.save();
        totalExpired += expiredPoints;
      }
    }

    return totalExpired;
  }

  /**
   * Get tier configuration
   */
  public getTierConfig(): ILoyaltyTierConfig[] {
    return TIER_CONFIG;
  }

  /**
   * Get user's point history
   */
  public async getPointHistory(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ history: any[]; total: number }> {
    const account = await this.getLoyaltyAccount(userId);
    const history = account.history
      .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice((page - 1) * limit, page * limit);

    return {
      history,
      total: account.history.length,
    };
  }

  private calculateTier(lifetimePoints: number): LoyaltyTier {
    let tier = LoyaltyTier.BRONZE;
    for (const config of TIER_CONFIG) {
      if (lifetimePoints >= config.minPoints) {
        tier = config.tier;
      }
    }
    return tier;
  }

  private generateRedemptionCode(): string {
    return `RWD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }
}
