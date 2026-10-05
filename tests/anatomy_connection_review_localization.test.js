import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const manifest = JSON.parse(fs.readFileSync('dev-tools/i18n/anatomy_connection_review_20261002.json', 'utf8'));
const languages = ['french', 'spanish_latin_america', 'arabic'];
const keys = [
  'connection_review_progress', 'connection_review_scope', 'connection_review_practice',
  'connection_review_correct', 'connection_review_incorrect', 'connection_review_saved',
  'connection_review_all', 'connection_review_read', 'connection_review_check',
  'connection_review_unanswered', 'connection_review_first_correct', 'connection_review_first_review'
];
const placeholders = value => [...value.matchAll(/\{[^{}]+\}/g)].map(match => match[0]).sort();

describe('Anatomy connection practice localization', () => {
  it('registers the twelve owned and two reused English labels in both catalogs', () => {
    expect(manifest.namespace).toBe('stem.anatomy');
    expect(Object.keys(manifest.english)).toEqual(keys);
    expect(Object.keys(manifest.translations)).toEqual(languages);
    expect(Object.keys(manifest.reusedEnglish)).toEqual(['link_ref_hide', 'practice_flow_spotter_your_answer']);
    expect(manifest.coverage).toEqual({ languageCount: 3, keysPerLanguage: 12, translatedValues: 36, reusedLabels: 2, desktopMirrors: true });
    for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
      const dictionary = JSON.parse(fs.readFileSync(file, 'utf8')).stem.anatomy;
      for (const [key, value] of Object.entries({ ...manifest.english, ...manifest.reusedEnglish })) expect(dictionary[key], key + ' in ' + file).toBe(value);
    }
  });

  it.each(languages)('preserves complete %s controls, first-answer placeholders, and existing reused copy in both catalogs', language => {
    const catalog = fs.readFileSync('lang/' + language + '.js', 'utf8');
    const mirror = fs.readFileSync('desktop/web-app/public/lang/' + language + '.js', 'utf8');
    expect(mirror).toBe(catalog);
    const dictionary = JSON.parse(catalog).stem.anatomy;
    expect(Object.keys(manifest.translations[language])).toEqual(keys);
    for (const key of keys) {
      const value = dictionary[key];
      expect(typeof value, key).toBe('string'); expect(value.trim(), key).not.toBe('');
      expect(value, key).toBe(manifest.translations[language][key]);
      expect(value, key).not.toBe(manifest.english[key]);
      expect(placeholders(value), key).toEqual(placeholders(manifest.english[key]));
    }
    expect(placeholders(dictionary.connection_review_progress)).toEqual(['{answered}', '{correct}', '{explored}', '{total}']);
    for (const [key, value] of Object.entries(manifest.reusedTranslations[language])) {
      expect(dictionary[key], key).toBe(value);
      expect(value.trim(), key).not.toBe(''); expect(value, key).not.toBe(manifest.reusedEnglish[key]);
    }
  });

  it('keeps Arabic review controls native and preserves all progress fields', () => {
    for (const key of keys) {
      const text = manifest.translations.arabic[key].replace(/\{[^{}]+\}/g, '');
      expect(text, key).toMatch(/[\u0600-\u06ff]/); expect(text, key).not.toMatch(/[A-Za-z]/);
    }
    const progress = manifest.translations.arabic.connection_review_progress.replace('{explored}', '7').replace('{answered}', '3').replace('{total}', '10').replace('{correct}', '2');
    expect(progress).toContain('3/10'); expect(progress).toContain('7'); expect(progress).toContain('2');
    expect(progress).not.toMatch(/\{[^{}]+\}/);
  });
});
