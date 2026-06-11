// src/controllers/menu.controller.ts
import { Request, Response, NextFunction } from 'express';
import { MenuService } from '../services/menu.service';
import { BadRequestError } from '../utils/errors';

export class MenuController {
  private menuService: MenuService;

  constructor() {
    this.menuService = new MenuService();
  }

  public getMenuItemsByRestaurant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { restaurantId } = req.params;
      const menuItems = await this.menuService.getMenuItemsByRestaurant(restaurantId);
      
      res.status(200).json({
        status: 'success',
        results: menuItems.length,
        data: {
          menuItems
        }
      });
    } catch (error) {
      next(error);
    }
  };

  public getMenuItemById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const menuItem = await this.menuService.getMenuItemById(id);
      
      res.status(200).json({
        status: 'success',
        data: {
          menuItem
        }
      });
    } catch (error) {
      next(error);
    }
  };

  public createMenuItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId) {
        throw new BadRequestError('User ID is required');
      }
      
      const menuItem = await this.menuService.createMenuItem(req.body, req.user.userId);
      
      res.status(201).json({
        status: 'success',
        data: {
          menuItem
        }
      });
    } catch (error) {
      next(error);
    }
  };

  public updateMenuItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId) {
        throw new BadRequestError('User ID is required');
      }
      
      const { id } = req.params;
      const menuItem = await this.menuService.updateMenuItem(id, req.body, req.user.userId);
      
      res.status(200).json({
        status: 'success',
        data: {
          menuItem
        }
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteMenuItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId) {
        throw new BadRequestError('User ID is required');
      }
      
      const { id } = req.params;
      await this.menuService.deleteMenuItem(id, req.user.userId);
      
      res.status(204).json({
        status: 'success',
        data: null
      });
    } catch (error) {
      next(error);
    }
  };

  public searchMenuItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { query, ...filters } = req.query;
      const menuItems = await this.menuService.searchMenuItems(query as string, filters);
      
      res.status(200).json({
        status: 'success',
        results: menuItems.length,
        data: {
          menuItems
        }
      });
    } catch (error) {
      next(error);
    }
  };
}
