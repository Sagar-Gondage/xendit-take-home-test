// src/models/menu.model.ts
import mongoose, { Schema, Document } from 'mongoose';
import { IMenuItem, ICustomizationOption } from '../types/menu.types';

const customizationOptionSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
  },
  options: [
    {
      name: {
        type: String,
        required: true,
      },
      price: {
        type: Number,
        required: true,
        min: 0,
      },
    },
  ],
  required: {
    type: Boolean,
    default: false,
  },
  multiSelect: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

const menuItemSchema: Schema = new Schema(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
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
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    image: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    dietaryRestrictions: {
      type: [String],
      enum: ['vegetarian', 'vegan', 'gluten_free', 'halal', 'kosher', 'dairy_free', 'nut_free'],
      default: [],
    },
    allergens: {
      type: [String],
      enum: ['peanuts', 'tree_nuts', 'milk', 'eggs', 'wheat', 'soy', 'fish', 'shellfish', 'sesame'],
      default: [],
    },
    spiceLevel: {
      type: Number,
      min: 0,
      max: 4,
      default: 0,
    },
    popularity: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    customizationOptions: {
      type: [customizationOptionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Create index for searching by name and category
menuItemSchema.index({ name: 'text', description: 'text', category: 'text' });

// Create index for filtering by restaurant
menuItemSchema.index({ restaurantId: 1 });

const MenuItem = mongoose.model<IMenuItem & Document>('MenuItem', menuItemSchema);

export default MenuItem;
