// src/controllers/i18n.controller.ts
import { Request, Response, NextFunction } from 'express';
import { I18nService } from '../services/i18n.service';
import { SupportedLanguage } from '../types/i18n.types';
import { BadRequestError } from '../utils/errors';

export class I18nController {
  private i18nService: I18nService;

  constructor() {
    this.i18nService = new I18nService();
  }

  public upsertTranslation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { entityType, entityId, language, fields } = req.body;

      if (!entityType || !language || !fields) {
        throw new BadRequestError('entityType, language, and fields are required');
      }

      const translation = await this.i18nService.upsertTranslation({
        entityType,
        entityId,
        language,
        fields,
      });

      res.status(200).json({
        status: 'success',
        data: { translation },
      });
    } catch (error) {
      next(error);
    }
  };

  public getTranslation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { entityType, entityId } = req.params;
      const language = req.query.language as SupportedLanguage;

      if (!language) {
        throw new BadRequestError('language query parameter is required');
      }

      const translation = await this.i18nService.getTranslation(entityType, entityId, language);

      res.status(200).json({
        status: 'success',
        data: { translation },
      });
    } catch (error) {
      next(error);
    }
  };

  public getAllTranslations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { entityType, entityId } = req.params;

      const translations = await this.i18nService.getAllTranslations(entityType, entityId);

      res.status(200).json({
        status: 'success',
        results: translations.length,
        data: { translations },
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteTranslation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { entityType, entityId } = req.params;
      const language = req.query.language as SupportedLanguage;

      if (!language) {
        throw new BadRequestError('language query parameter is required');
      }

      await this.i18nService.deleteTranslation(entityType, entityId, language);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  public getSupportedLanguages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const languages = this.i18nService.getSupportedLanguages();

      res.status(200).json({
        status: 'success',
        data: { languages },
      });
    } catch (error) {
      next(error);
    }
  };

  public getSystemMessages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const language = req.query.language as SupportedLanguage;
      if (!language) {
        throw new BadRequestError('language query parameter is required');
      }

      const messages = await this.i18nService.getSystemMessages(language);

      res.status(200).json({
        status: 'success',
        data: { messages },
      });
    } catch (error) {
      next(error);
    }
  };
}
