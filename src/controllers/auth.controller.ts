// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AuthService, RegisterUserInput, LoginUserInput } from '../services/auth.service';
import { BadRequestError } from '../utils/errors';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userData: RegisterUserInput = req.body;
      
      // Validate required fields
      if (!userData.email || !userData.password || !userData.name || !userData.phone || !userData.address) {
        throw new BadRequestError('Missing required fields');
      }
      
      const result = await this.authService.register(userData);
      
      res.status(201).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const loginData: LoginUserInput = req.body;
      
      // Validate required fields
      if (!loginData.email || !loginData.password) {
        throw new BadRequestError('Email and password are required');
      }
      
      const result = await this.authService.login(loginData);
      
      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  public getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId) {
        throw new BadRequestError('User ID is required');
      }
      
      const user = await this.authService.getUserProfile(req.user.userId);
      
      res.status(200).json({
        status: 'success',
        data: {
          user: {
            _id: user._id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            address: user.address,
            role: user.role
          }
        }
      });
    } catch (error) {
      next(error);
    }
  };
}
