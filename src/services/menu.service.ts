// src/services/menu.service.ts
import MenuItem from '../models/menu.model';
import Restaurant from '../models/restaurant.model';
import { IMenuItem } from '../types/menu.types';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';

export class MenuService {
  public async getMenuItemsByRestaurant(restaurantId: string): Promise<IMenuItem[]> {
    // Verify restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      throw new NotFoundError('Restaurant not found');
    }
    
    return MenuItem.find({ restaurantId, isAvailable: true });
  }
  
  public async getMenuItemById(id: string): Promise<IMenuItem> {
    const menuItem = await MenuItem.findById(id);
    
    if (!menuItem) {
      throw new NotFoundError('Menu item not found');
    }
    
    return menuItem;
  }
  
  public async createMenuItem(menuItemData: IMenuItem, userId: string): Promise<IMenuItem> {
    // Verify restaurant exists and user is the owner
    const restaurant = await Restaurant.findById(menuItemData.restaurantId);
    
    if (!restaurant) {
      throw new NotFoundError('Restaurant not found');
    }
    
    if (restaurant.ownerId.toString() !== userId) {
      throw new ForbiddenError('You are not authorized to add menu items to this restaurant');
    }
    
    // Validate required fields
    if (!menuItemData.name || !menuItemData.price || !menuItemData.category) {
      throw new BadRequestError('Missing required menu item information');
    }
    
    return MenuItem.create(menuItemData);
  }
  
  public async updateMenuItem(id: string, menuItemData: Partial<IMenuItem>, userId: string): Promise<IMenuItem> {
    const menuItem = await MenuItem.findById(id);
    
    if (!menuItem) {
      throw new NotFoundError('Menu item not found');
    }
    
    // Verify user is the restaurant owner
    const restaurant = await Restaurant.findById(menuItem.restaurantId);
    
    if (!restaurant) {
      throw new NotFoundError('Restaurant not found');
    }
    
    if (restaurant.ownerId.toString() !== userId) {
      throw new ForbiddenError('You are not authorized to update menu items for this restaurant');
    }
    
    // Update the menu item
    Object.assign(menuItem, menuItemData);
    await menuItem.save();
    
    return menuItem;
  }
  
  public async deleteMenuItem(id: string, userId: string): Promise<void> {
    const menuItem = await MenuItem.findById(id);
    
    if (!menuItem) {
      throw new NotFoundError('Menu item not found');
    }
    
    // Verify user is the restaurant owner
    const restaurant = await Restaurant.findById(menuItem.restaurantId);
    
    if (!restaurant) {
      throw new NotFoundError('Restaurant not found');
    }
    
    if (restaurant.ownerId.toString() !== userId) {
      throw new ForbiddenError('You are not authorized to delete menu items for this restaurant');
    }
    
    await MenuItem.findByIdAndDelete(id);
  }
  
  public async searchMenuItems(query: string, filters: any = {}): Promise<IMenuItem[]> {
    const searchQuery: any = { isAvailable: true };
    
    if (query) {
      searchQuery.$text = { $search: query };
    }
    
    if (filters.category) {
      searchQuery.category = filters.category;
    }
    
    if (filters.priceMin || filters.priceMax) {
      searchQuery.price = {};
      
      if (filters.priceMin) {
        searchQuery.price.$gte = Number(filters.priceMin);
      }
      
      if (filters.priceMax) {
        searchQuery.price.$lte = Number(filters.priceMax);
      }
    }
    
    return MenuItem.find(searchQuery).sort({ price: 1 });
  }
}
