import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const manifest = JSON.parse(fs.readFileSync('dev-tools/i18n/anatomy_spotter_study_20261002.json', 'utf8'));
const languages = ['french', 'spanish_latin_america', 'arabic'];
const expectedPlaceholders = {
  spot_journey_activity_help: [], spot_journey_study_origin: ['{name}'],
  spot_journey_return: [], spot_journey_study_help: [],
  spot_journey_score: ['{correct}', '{total}'], spot_journey_marked: [],
  spot_journey_study_announcement: ['{name}'], spot_journey_choose_help: []
};
const keys = Object.keys(expectedPlaceholders);
const placeholders = text => [...text.matchAll(/\{[^{}]+\}/g)].map(match => match[0]).sort();
const interpolate = (text, values) => text.replace(/\{([^{}]+)\}/g, (_, key) => values[key]);

describe('Anatomy Spotter study localization', () => {
  it('registers all eight English study controls and preserves earlier answer and study labels', () => {
    expect(manifest.namespace).toBe('stem.anatomy');
    expect(Object.keys(manifest.english)).toEqual(keys);
    expect(Object.keys(manifest.translations)).toEqual(languages);
    expect(manifest.coverage).toEqual({ languageCount: 3, keysPerLanguage: 8, translatedValues: 24, desktopMirrors: true });
    for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
      const dictionary = JSON.parse(fs.readFileSync(file, 'utf8')).stem.anatomy;
      for (const key of keys) {
        expect(dictionary[key], key + ' in ' + file).toBe(manifest.english[key]);
        expect(placeholders(dictionary[key]), key).toEqual(expectedPlaceholders[key]);
      }
      expect(dictionary.practice_flow_spotter_your_answer).toBe('Your answer');
      expect(dictionary.connection_review_scope).toBe('Practice again. Your first answer and progress stay saved.');
      expect(dictionary.case_journey_hidden).toBe('Explanation hidden. Your reasoning stays saved.');
    }
  });

  it.each(languages)('keeps complete native %s study wording, placeholders, and desktop parity', language => {
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
    const score = interpolate(dictionary.spot_journey_score, { correct: 2, total: 6 });
    expect(score).toContain('2'); expect(score).toContain('6'); expect(score).not.toMatch(/\{[^{}]+\}/);
    const origin = interpolate(dictionary.spot_journey_study_origin, { name: 'STRUCTURE NAME' });
    const announcement = interpolate(dictionary.spot_journey_study_announcement, { name: 'STRUCTURE NAME' });
    expect(origin).toContain('STRUCTURE NAME'); expect(announcement).toContain('STRUCTURE NAME');
    expect(origin).not.toMatch(/\{[^{}]+\}/); expect(announcement).not.toMatch(/\{[^{}]+\}/);
    expect(dictionary.practice_flow_spotter_your_answer).toBeTruthy();
    expect(dictionary.spot_ref_study).toBeTruthy();
    expect(dictionary.case_journey_hidden).toBeTruthy();
    expect(dictionary.connection_review_scope).toBeTruthy();
  });

  it.each(['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'])('uses registered fallback wording for all eight new controls in %s', file => {
    const source = fs.readFileSync(file, 'utf8');
    for (const key of keys) {
      const pattern = new RegExp("\\bt\\(\\s*(['\"])stem\\.anatomy\\." + key + "\\1\\s*,\\s*(['\"])(.*?)\\2");
      const call = source.match(pattern);
      expect(call, key).not.toBeNull();
      expect(call?.[3], key).toBe(manifest.english[key]);
    }
  });

  it('keeps Arabic study and answer instructions native while preserving counts and names', () => {
    const dictionary = manifest.translations.arabic;
    for (const key of keys) {
      const label = dictionary[key].replace(/\{[^{}]+\}/g, '');
      expect(label, key).toMatch(/[\u0600-\u06ff]/);
      expect(label, key).not.toMatch(/[A-Za-z]/);
    }
    expect(interpolate(dictionary.spot_journey_study_announcement, { name: 'القلب' })).toContain('القلب');
    const score = interpolate(dictionary.spot_journey_score, { correct: 3, total: 8 });
    expect(score).toContain('3'); expect(score).toContain('8');
  });
});
