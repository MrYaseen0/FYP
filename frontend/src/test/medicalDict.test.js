import { describe, it, expect } from 'vitest';
import { SYMPTOMS, CONDITIONS, MEDICATIONS, ALLERGIES, ONSET_PHRASES, DURATION_PHRASES, DICT_MAP } from '../data/medicalDict';

describe('medicalDict', () => {
  describe('SYMPTOMS', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(SYMPTOMS)).toBe(true);
      expect(SYMPTOMS.length).toBeGreaterThan(0);
    });

    it('contains common symptoms', () => {
      expect(SYMPTOMS).toContain('chest pain');
      expect(SYMPTOMS).toContain('headache');
      expect(SYMPTOMS).toContain('nausea');
      expect(SYMPTOMS).toContain('shortness of breath');
    });

    it('all entries are strings', () => {
      SYMPTOMS.forEach(s => expect(typeof s).toBe('string'));
    });
  });

  describe('CONDITIONS', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(CONDITIONS)).toBe(true);
      expect(CONDITIONS.length).toBeGreaterThan(0);
    });

    it('contains common conditions', () => {
      expect(CONDITIONS).toContain('hypertension');
      expect(CONDITIONS).toContain('type 2 diabetes');
    });
  });

  describe('MEDICATIONS', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(MEDICATIONS)).toBe(true);
      expect(MEDICATIONS.length).toBeGreaterThan(0);
    });

    it('contains common medications', () => {
      expect(MEDICATIONS).toContain('aspirin');
      expect(MEDICATIONS).toContain('metformin');
    });
  });

  describe('ALLERGIES', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(ALLERGIES)).toBe(true);
      expect(ALLERGIES.length).toBeGreaterThan(0);
    });

    it('contains common allergens', () => {
      expect(ALLERGIES).toContain('penicillin');
    });
  });

  describe('ONSET_PHRASES', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(ONSET_PHRASES)).toBe(true);
      expect(ONSET_PHRASES.length).toBeGreaterThan(0);
    });
  });

  describe('DURATION_PHRASES', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(DURATION_PHRASES)).toBe(true);
      expect(DURATION_PHRASES.length).toBeGreaterThan(0);
    });
  });

  describe('DICT_MAP', () => {
    it('maps all form fields to suggestion arrays', () => {
      expect(DICT_MAP.chief_complaint).toBe(SYMPTOMS);
      expect(DICT_MAP.associated_symptoms).toBe(SYMPTOMS);
      expect(DICT_MAP.past_medical_history).toBe(CONDITIONS);
      expect(DICT_MAP.current_medications).toBe(MEDICATIONS);
      expect(DICT_MAP.allergies).toBe(ALLERGIES);
      expect(DICT_MAP.onset).toBe(ONSET_PHRASES);
      expect(DICT_MAP.duration).toBe(DURATION_PHRASES);
    });

    it('has exactly 7 keys', () => {
      expect(Object.keys(DICT_MAP)).toHaveLength(7);
    });

    it('every value is a non-empty array', () => {
      Object.values(DICT_MAP).forEach(arr => {
        expect(Array.isArray(arr)).toBe(true);
        expect(arr.length).toBeGreaterThan(0);
      });
    });
  });
});
