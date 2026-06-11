// src/types/loyalty.types.ts

export enum LoyaltyTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

export interface ILoyaltyTierConfig {
  tier: LoyaltyTier;
  minPoints: number;
  pointsMultiplier: number; // e.g., 1.5x for silver
  benefits: string[];
}

export interface ILoyaltyPoints {
  _id?: string;
  userId: string;
  points: number;
  lifetimePoints: number;
  tier: LoyaltyTier;
  history: IPointTransaction[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPointTransaction {
  type: 'earned' | 'redeemed' | 'expired' | 'bonus';
  points: number;
  orderId?: string;
  description: string;
  expiresAt?: Date;
  createdAt: Date;
}

export interface IReward {
  _id?: string;
  name: string;
  description: string;
  pointsCost: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount?: number;
  minOrderValue?: number;
  isActive: boolean;
  validFrom: Date;
  validUntil: Date;
  tier: LoyaltyTier; // minimum tier required
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IRedemption {
  _id?: string;
  userId: string;
  rewardId: string;
  pointsUsed: number;
  orderId?: string;
  status: 'pending' | 'applied' | 'expired';
  code: string;
  expiresAt: Date;
  createdAt?: Date;
}
