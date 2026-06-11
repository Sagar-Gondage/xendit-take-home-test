// src/services/i18n.service.ts
import Translation from '../models/translation.model';
import { ITranslation, ITranslationRequest, SupportedLanguage } from '../types/i18n.types';
import { NotFoundError, BadRequestError } from '../utils/errors';

export class I18nService {
  /**
   * Create or update a translation
   */
  public async upsertTranslation(translationData: ITranslationRequest): Promise<ITranslation> {
    if (!translationData.entityType || !translationData.language || !translationData.fields) {
      throw new BadRequestError('entityType, language, and fields are required');
    }

    if (!Object.values(SupportedLanguage).includes(translationData.language)) {
      throw new BadRequestError(`Unsupported language: ${translationData.language}`);
    }

    const filter = {
      entityType: translationData.entityType,
      entityId: translationData.entityId || null,
      language: translationData.language,
    };

    const translation = await Translation.findOneAndUpdate(
      filter,
      { $set: { fields: translationData.fields } },
      { new: true, upsert: true }
    );

    return translation;
  }

  /**
   * Get translation for a specific entity
   */
  public async getTranslation(
    entityType: string,
    entityId: string,
    language: SupportedLanguage
  ): Promise<ITranslation | null> {
    return Translation.findOne({ entityType, entityId, language }).lean();
  }

  /**
   * Get all translations for an entity (all languages)
   */
  public async getAllTranslations(entityType: string, entityId: string): Promise<ITranslation[]> {
    return Translation.find({ entityType, entityId }).lean();
  }

  /**
   * Get translations for multiple entities of the same type
   */
  public async getBatchTranslations(
    entityType: string,
    entityIds: string[],
    language: SupportedLanguage
  ): Promise<Map<string, ITranslation>> {
    const translations = await Translation.find({
      entityType,
      entityId: { $in: entityIds },
      language,
    }).lean();

    const map = new Map<string, ITranslation>();
    for (const t of translations) {
      if (t.entityId) {
        map.set(t.entityId, t);
      }
    }
    return map;
  }

  /**
   * Get system messages in a specific language
   */
  public async getSystemMessages(language: SupportedLanguage): Promise<Record<string, string>> {
    const translation = await Translation.findOne({
      entityType: 'system',
      language,
    }).lean();

    return translation?.fields || {};
  }

  /**
   * Delete a translation
   */
  public async deleteTranslation(
    entityType: string,
    entityId: string,
    language: SupportedLanguage
  ): Promise<void> {
    const result = await Translation.deleteOne({ entityType, entityId, language });
    if (result.deletedCount === 0) {
      throw new NotFoundError('Translation not found');
    }
  }

  /**
   * Delete all translations for an entity
   */
  public async deleteAllTranslations(entityType: string, entityId: string): Promise<void> {
    await Translation.deleteMany({ entityType, entityId });
  }

  /**
   * Get supported languages
   */
  public getSupportedLanguages(): SupportedLanguage[] {
    return Object.values(SupportedLanguage);
  }

  /**
   * Apply translations to an entity object
   */
  public applyTranslation(entity: any, translation: ITranslation | null): any {
    if (!translation || !translation.fields) {
      return entity;
    }

    const translated = { ...entity };
    for (const [field, value] of Object.entries(translation.fields)) {
      if (field in translated) {
        translated[field] = value;
      }
    }
    translated._language = translation.language;
    return translated;
  }
}
