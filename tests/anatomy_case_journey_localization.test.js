import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const manifest = JSON.parse(fs.readFileSync('dev-tools/i18n/anatomy_case_journey_20261002.json', 'utf8'));
const languages = ['french', 'spanish_latin_america', 'arabic'];
const expectedPlaceholders = {
  case_journey_atlas_progress: ['{reviewed}', '{total}'],
  case_journey_total_progress: ['{reviewed}', '{total}'],
  case_journey_read: [], case_journey_hint: [],
  case_journey_origin: ['{case}'], case_journey_return: ['{case}'],
  case_journey_showing: ['{case}', '{structure}'], case_journey_hidden: [],
  case_journey_review_saved: ['{case}'], case_journey_draft_count: ['{count}']
};
const keys = Object.keys(expectedPlaceholders);
const placeholders = text => [...text.matchAll(/\{[^{}]+\}/g)].map(match => match[0]).sort();
const interpolate = (text, values) => text.replace(/\{([^{}]+)\}/g, (_, key) => values[key]);

describe('Anatomy Clinical case journey localization', () => {
  it('registers all ten English controls in both catalogs with the required dynamic fields', () => {
    expect(manifest.namespace).toBe('stem.anatomy');
    expect(Object.keys(manifest.english)).toEqual(keys);
    expect(Object.keys(manifest.translations)).toEqual(languages);
    expect(manifest.coverage).toEqual({ languageCount: 3, keysPerLanguage: 10, translatedValues: 30, desktopMirrors: true });
    for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
      const dictionary = JSON.parse(fs.readFileSync(file, 'utf8')).stem.anatomy;
      for (const key of keys) {
        expect(dictionary[key], key + ' in ' + file).toBe(manifest.english[key]);
        expect(placeholders(dictionary[key]), key).toEqual(expectedPlaceholders[key]);
      }
      expect(dictionary.connection_review_scope).toBe('Practice again. Your first answer and progress stay saved.');
      expect(dictionary.link_ref_hide).toBe('Hide explanation and try again');
    }
  });

  it.each(languages)('keeps complete native %s labels, placeholders, and desktop parity', language => {
    const canonical = fs.readFileSync('lang/' + language + '.js', 'utf8');
    expect(fs.readFileSync('desktop/web-app/public/lang/' + language + '.js', 'utf8')).toBe(canonical);
    const dictionary = JSON.parse(canonical).stem.anatomy;
    expect(Object.keys(manifest.translations[language])).toEqual(keys);
    for (const key of keys) {
      expect(typeof dictionary[key], key).toBe('string');
      expect(dictionary[key].trim(), key).not.toBe('');
      expect(dictionary[key], key).toBe(manifest.translations[language][key]);
      expect(dictionary[key], key).not.toBe(manifest.english[key]);
      expect(placeholders(dictionary[key]), key).toEqual(expectedPlaceholders[key]);
    }
    const progress = interpolate(dictionary.case_journey_atlas_progress, { reviewed: 2, total: 6 });
    expect(progress).toContain('2/6'); expect(progress).not.toMatch(/\{[^{}]+\}/);
    const shown = interpolate(dictionary.case_journey_showing, { case: 'CASE TITLE', structure: 'STRUCTURE NAME' });
    expect(shown).toContain('CASE TITLE'); expect(shown).toContain('STRUCTURE NAME'); expect(shown).not.toMatch(/\{[^{}]+\}/);
    expect(interpolate(dictionary.case_journey_draft_count, { count: 37 })).toContain('37/600');
    expect(dictionary.case_ref_try_again).toBeTruthy();
    expect(dictionary.connection_review_scope).toBeTruthy();
  });

  it.each(['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'])('uses the registered default wording for all new Clinical controls in %s', file => {
    const source = fs.readFileSync(file, 'utf8');
    for (const key of keys) {
      const pattern = new RegExp("\\bt\\(\\s*(['\"])stem\\.anatomy\\." + key + "\\1\\s*,\\s*(['\"])(.*?)\\2");
      const call = source.match(pattern);
      expect(call, key).not.toBeNull();
      expect(call?.[3], key).toBe(manifest.english[key]);
    }
  });

  it('keeps Arabic controls native while retaining numeric and case placeholders', () => {
    const dictionary = manifest.translations.arabic;
    for (const key of keys) {
      const label = dictionary[key].replace(/\{[^{}]+\}/g, '');
      expect(label, key).toMatch(/[\u0600-\u06ff]/);
      expect(label, key).not.toMatch(/[A-Za-z]/);
    }
    expect(interpolate(dictionary.case_journey_total_progress, { reviewed: 8, total: 24 })).toContain('8/24');
    expect(interpolate(dictionary.case_journey_return, { case: 'التبادل الغازي' })).toContain('التبادل الغازي');
  });
});
