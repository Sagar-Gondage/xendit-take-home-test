// src/services/restaurant.service.ts
import Restaurant from '../models/restaurant.model';
import { IRestaurant } from '../types/restaurant.types';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';

export class RestaurantService {
  public async getAllRestaurants(query: any = {}): Promise<IRestaurant[]> {
    const { cuisine, rating, search } = query;
    
    const filter: any = { isActive: true };
    
    if (cuisine) {
      filter.cuisine = { $in: Array.isArray(cuisine) ? cuisine : [cuisine] };
    }
    
    if (rating) {
      filter.rating = { $gte: Number(rating) };
    }
    
    if (search) {
      filter.$text = { $search: search };
    }
    
    return Restaurant.find(filter).sort({ rating: -1 });
  }
  
  public async getRestaurantById(id: string): Promise<IRestaurant> {
    const restaurant = await Restaurant.findById(id);
    
    if (!restaurant) {
      throw new NotFoundError('Restaurant not found');
    }
    
    return restaurant;
  }
  
  public async createRestaurant(restaurantData: IRestaurant, userId: string): Promise<IRestaurant> {
    // Set the owner ID to the current user
    restaurantData.ownerId = userId;
    
    // Validate required fields
    if (!restaurantData.name || !restaurantData.description || !restaurantData.address) {
      throw new BadRequestError('Missing required restaurant information');
    }
    
    return Restaurant.create(restaurantData);
  }
  
  public async updateRestaurant(id: string, restaurantData: Partial<IRestaurant>, userId: string): Promise<IRestaurant> {
    const restaurant = await Restaurant.findById(id);
    
    if (!restaurant) {
      throw new NotFoundError('Restaurant not found');
    }
    
    // Check if the user is the owner of the restaurant
    if (restaurant.ownerId.toString() !== userId) {
      throw new ForbiddenError('You are not authorized to update this restaurant');
    }
    
    // Update the restaurant
    Object.assign(restaurant, restaurantData);
    await restaurant.save();
    
    return restaurant;
  }
  
  public async deleteRestaurant(id: string, userId: string): Promise<void> {
    const restaurant = await Restaurant.findById(id);
    
    if (!restaurant) {
      throw new NotFoundError('Restaurant not found');
    }
    
    // Check if the user is the owner of the restaurant
    if (restaurant.ownerId.toString() !== userId) {
      throw new ForbiddenError('You are not authorized to delete this restaurant');
    }
    
    await Restaurant.findByIdAndDelete(id);
  }
  
  public async getNearbyRestaurants(lat: number, lng: number, maxDistance: number = 5000): Promise<IRestaurant[]> {
    return Restaurant.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: maxDistance
        }
      },
      isActive: true
    }).limit(20);
  }
}
