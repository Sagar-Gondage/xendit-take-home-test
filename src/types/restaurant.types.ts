// src/types/restaurant.types.ts

export interface ILocation {
  type: string;
  coordinates: [number, number]; // [longitude, latitude]
}

export interface IOperatingHours {
  monday: { open: string; close: string };
  tuesday: { open: string; close: string };
  wednesday: { open: string; close: string };
  thursday: { open: string; close: string };
  friday: { open: string; close: string };
  saturday: { open: string; close: string };
  sunday: { open: string; close: string };
}

export interface IRestaurant {
  _id?: string;
  ownerId: string;
  name: string;
  description: string;
  logo: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  location: ILocation;
  cuisine: string[];
  operatingHours: IOperatingHours;
  contactPhone: string;
  rating: number;
  averageDeliveryTime: number;
  minimumOrderValue: number;
  totalOrders: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
