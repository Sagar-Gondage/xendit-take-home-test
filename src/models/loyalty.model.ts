// src/models/loyalty.model.ts
import mongoose, { Schema, Document } from 'mongoose';
import { ILoyaltyPoints, IReward, IRedemption, LoyaltyTier, IPointTransaction } from '../types/loyalty.types';

const pointTransactionSchema: Schema = new Schema({
  type: {
    type: String,
    enum: ['earned', 'redeemed', 'expired', 'bonus'],
    required: true,
  },
  points: {
    type: Number,
    required: true,
  },
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
  },
  description: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const loyaltyPointsSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    points: {
      type: Number,
      default: 0,
      min: 0,
    },
    lifetimePoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    tier: {
      type: String,
      enum: Object.values(LoyaltyTier),
      default: LoyaltyTier.BRONZE,
    },
    history: {
      type: [pointTransactionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

loyaltyPointsSchema.index({ userId: 1 });
loyaltyPointsSchema.index({ tier: 1 });

const rewardSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    pointsCost: {
      type: Number,
      required: true,
      min: 1,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    maxDiscount: {
      type: Number,
    },
    minOrderValue: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    validFrom: {
      type: Date,
      required: true,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    tier: {
      type: String,
      enum: Object.values(LoyaltyTier),
      default: LoyaltyTier.BRONZE,
    },
  },
  {
    timestamps: true,
  }
);

rewardSchema.index({ isActive: 1, tier: 1 });

const redemptionSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rewardId: {
      type: Schema.Types.ObjectId,
      ref: 'Reward',
      required: true,
    },
    pointsUsed: {
      type: Number,
      required: true,
      min: 1,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    status: {
      type: String,
      enum: ['pending', 'applied', 'expired'],
      default: 'pending',
    },
    code: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

redemptionSchema.index({ userId: 1, status: 1 });
redemptionSchema.index({ code: 1 });

export const LoyaltyPoints = mongoose.model<ILoyaltyPoints & Document>('LoyaltyPoints', loyaltyPointsSchema);
export const Reward = mongoose.model<IReward & Document>('Reward', rewardSchema);
export const Redemption = mongoose.model<IRedemption & Document>('Redemption', redemptionSchema);
