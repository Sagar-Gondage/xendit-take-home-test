// tests/unit/services/i18n.service.test.ts
import '../../setup';
import { I18nService } from '../../../src/services/i18n.service';
import Translation from '../../../src/models/translation.model';
import { SupportedLanguage } from '../../../src/types/i18n.types';

// Setup MongoDB in-memory server
import '../../setup';

describe('I18nService', () => {
  let i18nService: I18nService;

  beforeAll(() => {
    i18nService = new I18nService();
  });

  describe('upsertTranslation', () => {
    it('should create a new translation', async () => {
      const result = await i18nService.upsertTranslation({
        entityType: 'menu_item',
        entityId: 'item123',
        language: SupportedLanguage.ES,
        fields: { name: 'Pizza Margarita', description: 'Pizza con queso y tomate' },
      });

      expect(result).toBeDefined();
      expect(result.entityType).toBe('menu_item');
      expect(result.language).toBe(SupportedLanguage.ES);
      expect(result.fields.name).toBe('Pizza Margarita');
    });

    it('should update an existing translation', async () => {
      await i18nService.upsertTranslation({
        entityType: 'menu_item',
        entityId: 'item123',
        language: SupportedLanguage.ES,
        fields: { name: 'Pizza Original' },
      });

      const updated = await i18nService.upsertTranslation({
        entityType: 'menu_item',
        entityId: 'item123',
        language: SupportedLanguage.ES,
        fields: { name: 'Pizza Actualizada' },
      });

      expect(updated.fields.name).toBe('Pizza Actualizada');

      // Verify only one translation exists
      const count = await Translation.countDocuments({
        entityType: 'menu_item',
        entityId: 'item123',
        language: SupportedLanguage.ES,
      });
      expect(count).toBe(1);
    });

    it('should reject invalid language', async () => {
      await expect(
        i18nService.upsertTranslation({
          entityType: 'menu_item',
          entityId: 'item123',
          language: 'invalid' as SupportedLanguage,
          fields: { name: 'Test' },
        })
      ).rejects.toThrow('Unsupported language');
    });

    it('should reject missing required fields', async () => {
      await expect(
        i18nService.upsertTranslation({
          entityType: '' as any,
          entityId: 'item123',
          language: SupportedLanguage.FR,
          fields: { name: 'Test' },
        })
      ).rejects.toThrow();
    });
  });

  describe('getTranslation', () => {
    beforeEach(async () => {
      await i18nService.upsertTranslation({
        entityType: 'menu_item',
        entityId: 'item456',
        language: SupportedLanguage.FR,
        fields: { name: 'Salade Verte', description: 'Une salade fraîche' },
      });
    });

    it('should return translation for existing entity', async () => {
      const result = await i18nService.getTranslation('menu_item', 'item456', SupportedLanguage.FR);

      expect(result).toBeDefined();
      expect(result!.fields.name).toBe('Salade Verte');
    });

    it('should return null for non-existent translation', async () => {
      const result = await i18nService.getTranslation('menu_item', 'item456', SupportedLanguage.ZH);
      expect(result).toBeNull();
    });

    it('should return null for non-existent entity', async () => {
      const result = await i18nService.getTranslation('menu_item', 'nonexistent', SupportedLanguage.FR);
      expect(result).toBeNull();
    });
  });

  describe('getAllTranslations', () => {
    beforeEach(async () => {
      await i18nService.upsertTranslation({
        entityType: 'restaurant',
        entityId: 'rest1',
        language: SupportedLanguage.ES,
        fields: { name: 'Restaurante Test' },
      });
      await i18nService.upsertTranslation({
        entityType: 'restaurant',
        entityId: 'rest1',
        language: SupportedLanguage.FR,
        fields: { name: 'Restaurant Test' },
      });
      await i18nService.upsertTranslation({
        entityType: 'restaurant',
        entityId: 'rest1',
        language: SupportedLanguage.JA,
        fields: { name: 'テストレストラン' },
      });
    });

    it('should return all translations for an entity', async () => {
      const results = await i18nService.getAllTranslations('restaurant', 'rest1');
      expect(results).toHaveLength(3);
    });

    it('should return empty array for entity with no translations', async () => {
      const results = await i18nService.getAllTranslations('restaurant', 'nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('getBatchTranslations', () => {
    beforeEach(async () => {
      await i18nService.upsertTranslation({
        entityType: 'menu_item',
        entityId: 'id1',
        language: SupportedLanguage.ES,
        fields: { name: 'Item 1' },
      });
      await i18nService.upsertTranslation({
        entityType: 'menu_item',
        entityId: 'id2',
        language: SupportedLanguage.ES,
        fields: { name: 'Item 2' },
      });
      await i18nService.upsertTranslation({
        entityType: 'menu_item',
        entityId: 'id3',
        language: SupportedLanguage.FR,
        fields: { name: 'Item 3 FR' },
      });
    });

    it('should return translations map for requested IDs', async () => {
      const map = await i18nService.getBatchTranslations(
        'menu_item',
        ['id1', 'id2', 'id3'],
        SupportedLanguage.ES
      );

      expect(map.size).toBe(2); // Only id1 and id2 have Spanish
      expect(map.get('id1')!.fields.name).toBe('Item 1');
      expect(map.get('id2')!.fields.name).toBe('Item 2');
    });
  });

  describe('getSystemMessages', () => {
    beforeEach(async () => {
      await i18nService.upsertTranslation({
        entityType: 'system',
        entityId: undefined,
        language: SupportedLanguage.ES,
        fields: {
          'order.confirmed': 'Tu pedido ha sido confirmado',
          'order.cancelled': 'Tu pedido ha sido cancelado',
        },
      });
    });

    it('should return system messages for a language', async () => {
      const messages = await i18nService.getSystemMessages(SupportedLanguage.ES);
      expect(messages['order.confirmed']).toBe('Tu pedido ha sido confirmado');
    });

    it('should return empty object for language with no system messages', async () => {
      const messages = await i18nService.getSystemMessages(SupportedLanguage.ZH);
      expect(messages).toEqual({});
    });
  });

  describe('deleteTranslation', () => {
    beforeEach(async () => {
      await i18nService.upsertTranslation({
        entityType: 'menu_item',
        entityId: 'del1',
        language: SupportedLanguage.FR,
        fields: { name: 'À supprimer' },
      });
    });

    it('should delete a specific translation', async () => {
      await i18nService.deleteTranslation('menu_item', 'del1', SupportedLanguage.FR);

      const result = await i18nService.getTranslation('menu_item', 'del1', SupportedLanguage.FR);
      expect(result).toBeNull();
    });

    it('should throw when translation does not exist', async () => {
      await expect(
        i18nService.deleteTranslation('menu_item', 'nonexistent', SupportedLanguage.FR)
      ).rejects.toThrow('Translation not found');
    });
  });

  describe('deleteAllTranslations', () => {
    beforeEach(async () => {
      await i18nService.upsertTranslation({
        entityType: 'menu_item',
        entityId: 'delall1',
        language: SupportedLanguage.FR,
        fields: { name: 'French' },
      });
      await i18nService.upsertTranslation({
        entityType: 'menu_item',
        entityId: 'delall1',
        language: SupportedLanguage.ES,
        fields: { name: 'Spanish' },
      });
    });

    it('should delete all translations for an entity', async () => {
      await i18nService.deleteAllTranslations('menu_item', 'delall1');

      const results = await i18nService.getAllTranslations('menu_item', 'delall1');
      expect(results).toHaveLength(0);
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return all supported languages', () => {
      const languages = i18nService.getSupportedLanguages();
      expect(languages).toContain(SupportedLanguage.EN);
      expect(languages).toContain(SupportedLanguage.ES);
      expect(languages).toContain(SupportedLanguage.FR);
      expect(languages).toContain(SupportedLanguage.ZH);
      expect(languages).toContain(SupportedLanguage.JA);
      expect(languages).toContain(SupportedLanguage.ID);
    });
  });

  describe('applyTranslation', () => {
    it('should apply translation fields to entity', () => {
      const entity = { name: 'Pizza', description: 'Cheese pizza', price: 12.99 };
      const translation = {
        entityType: 'menu_item',
        entityId: '123',
        language: SupportedLanguage.ES,
        fields: { name: 'Pizza', description: 'Pizza de queso' },
      };

      const result = i18nService.applyTranslation(entity, translation as any);
      expect(result.name).toBe('Pizza');
      expect(result.description).toBe('Pizza de queso');
      expect(result.price).toBe(12.99); // Unchanged
      expect(result._language).toBe(SupportedLanguage.ES);
    });

    it('should return entity unchanged if no translation', () => {
      const entity = { name: 'Original', price: 10 };
      const result = i18nService.applyTranslation(entity, null);
      expect(result).toEqual(entity);
    });
  });
});
