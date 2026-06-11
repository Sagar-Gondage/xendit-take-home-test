// src/models/translation.model.ts
import mongoose, { Schema, Document } from 'mongoose';
import { ITranslation, SupportedLanguage } from '../types/i18n.types';

const translationSchema: Schema = new Schema(
  {
    entityType: {
      type: String,
      enum: ['restaurant', 'menu_item', 'system'],
      required: true,
    },
    entityId: {
      type: String,
    },
    language: {
      type: String,
      enum: Object.values(SupportedLanguage),
      required: true,
    },
    fields: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient lookups
translationSchema.index({ entityType: 1, entityId: 1, language: 1 }, { unique: true });
translationSchema.index({ entityType: 1, language: 1 });

const Translation = mongoose.model<ITranslation & Document>('Translation', translationSchema);

export default Translation;
