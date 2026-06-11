// src/controllers/loyalty.controller.ts
import { Request, Response, NextFunction } from 'express';
import { LoyaltyService } from '../services/loyalty.service';
import { BadRequestError } from '../utils/errors';

export class LoyaltyController {
  private loyaltyService: LoyaltyService;

  constructor() {
    this.loyaltyService = new LoyaltyService();
  }

  public getAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId) {
        throw new BadRequestError('User ID is required');
      }

      const account = await this.loyaltyService.getLoyaltyAccount(req.user.userId);

      res.status(200).json({
        status: 'success',
        data: { account },
      });
    } catch (error) {
      next(error);
    }
  };

  public getPointHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId) {
        throw new BadRequestError('User ID is required');
      }

      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await this.loyaltyService.getPointHistory(req.user.userId, page, limit);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getAvailableRewards = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId) {
        throw new BadRequestError('User ID is required');
      }

      const rewards = await this.loyaltyService.getAvailableRewards(req.user.userId);

      res.status(200).json({
        status: 'success',
        results: rewards.length,
        data: { rewards },
      });
    } catch (error) {
      next(error);
    }
  };

  public redeemReward = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId) {
        throw new BadRequestError('User ID is required');
      }

      const { rewardId } = req.body;
      if (!rewardId) {
        throw new BadRequestError('rewardId is required');
      }

      const redemption = await this.loyaltyService.redeemReward(req.user.userId, rewardId);

      res.status(201).json({
        status: 'success',
        data: { redemption },
      });
    } catch (error) {
      next(error);
    }
  };

  public applyRedemption = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId) {
        throw new BadRequestError('User ID is required');
      }

      const { code, orderId } = req.body;
      if (!code || !orderId) {
        throw new BadRequestError('code and orderId are required');
      }

      const result = await this.loyaltyService.applyRedemptionToOrder(
        code,
        orderId,
        req.user.userId
      );

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getTierConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const config = this.loyaltyService.getTierConfig();

      res.status(200).json({
        status: 'success',
        data: { tiers: config },
      });
    } catch (error) {
      next(error);
    }
  };
}
