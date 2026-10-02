import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const manifest = JSON.parse(fs.readFileSync('dev-tools/i18n/anatomy_connection_journey_20261002.json', 'utf8'));
const placeholders = value => [...value.matchAll(/\{[^{}]+\}/g)].map(match => match[0]).sort();
const languages = ['french', 'spanish_latin_america', 'arabic'];
const keys = [
  'connection_journey_from', 'connection_journey_return', 'connection_journey_inspect',
  'connection_journey_help', 'connection_journey_marker', 'connection_journey_current',
  'connection_journey_resume'
];

describe('Anatomy connection journey localization', () => {
  it('registers the seven English labels in both catalogs with accurate coverage', () => {
    expect(manifest.namespace).toBe('stem.anatomy');
    expect(Object.keys(manifest.english)).toEqual(keys);
    expect(Object.keys(manifest.translations)).toEqual(languages);
    expect(manifest.coverage).toEqual({ languageCount: 3, keysPerLanguage: 7, translatedValues: 21, desktopMirrors: true });
    for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
      const dictionary = JSON.parse(fs.readFileSync(file, 'utf8')).stem.anatomy;
      for (const key of keys) expect(dictionary[key], key + ' in ' + file).toBe(manifest.english[key]);
    }
  });

  it.each(languages)('preserves complete %s controls and exact placeholders in both copies', language => {
    const catalog = fs.readFileSync('lang/' + language + '.js', 'utf8');
    const mirror = fs.readFileSync('desktop/web-app/public/lang/' + language + '.js', 'utf8');
    expect(mirror).toBe(catalog);
    const dictionary = JSON.parse(catalog).stem.anatomy;
    expect(Object.keys(manifest.translations[language])).toEqual(keys);
    for (const key of keys) {
      const value = dictionary[key];
      expect(typeof value, key).toBe('string');
      expect(value.trim(), key).not.toBe('');
      expect(value, key).toBe(manifest.translations[language][key]);
      expect(value, key).not.toBe(manifest.english[key]);
      expect(placeholders(value), key).toEqual(placeholders(manifest.english[key]));
    }
  });

  it('keeps Arabic control text native while allowing interpolated anatomy names', () => {
    const rows = manifest.translations.arabic;
    for (const key of keys) {
      const text = rows[key].replace(/\{[^{}]+\}/g, '');
      expect(text, key).toMatch(/[\u0600-\u06ff]/);
      expect(text, key).not.toMatch(/[A-Za-z]/);
    }
    const marker = rows.connection_journey_marker.replace('{structure}', 'الحويصلات الهوائية').replace('{system}', 'الجهاز التنفسي');
    expect(marker).toContain('الحويصلات الهوائية');
    expect(marker).toContain('الجهاز التنفسي');
    expect(marker).not.toMatch(/\{[^{}]+\}/);
  });
});
