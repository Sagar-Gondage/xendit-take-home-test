// src/types/i18n.types.ts

export enum SupportedLanguage {
  EN = 'en',
  ES = 'es',
  FR = 'fr',
  ZH = 'zh',
  JA = 'ja',
  ID = 'id', // Indonesian - relevant for Xendit
}

export interface ITranslation {
  _id?: string;
  entityType: 'restaurant' | 'menu_item' | 'system';
  entityId?: string;
  language: SupportedLanguage;
  fields: Record<string, string>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITranslationRequest {
  entityType: 'restaurant' | 'menu_item' | 'system';
  entityId?: string;
  language: SupportedLanguage;
  fields: Record<string, string>;
}
