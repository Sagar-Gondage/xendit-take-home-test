// src/models/restaurant.model.ts
import mongoose, { Schema, Document } from 'mongoose';
import { IRestaurant, ILocation, IOperatingHours } from '../types/restaurant.types';

const locationSchema: Schema = new Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true,
  },
});

const operatingHoursSchema: Schema = new Schema({
  monday: { open: String, close: String },
  tuesday: { open: String, close: String },
  wednesday: { open: String, close: String },
  thursday: { open: String, close: String },
  friday: { open: String, close: String },
  saturday: { open: String, close: String },
  sunday: { open: String, close: String },
}, { _id: false });

const restaurantSchema: Schema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    logo: {
      type: String,
      required: true,
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    location: {
      type: locationSchema,
      required: true,
      index: '2dsphere',
    },
    cuisine: {
      type: [String],
      required: true,
    },
    operatingHours: {
      type: operatingHoursSchema,
      required: true,
    },
    contactPhone: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    averageDeliveryTime: {
      type: Number, // in minutes
      default: 30,
      min: 0,
    },
    minimumOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create index for geospatial queries
restaurantSchema.index({ location: '2dsphere' });

// Create index for searching by name
restaurantSchema.index({ name: 'text', description: 'text' });

const Restaurant = mongoose.model<IRestaurant & Document>('Restaurant', restaurantSchema);

export default Restaurant;
