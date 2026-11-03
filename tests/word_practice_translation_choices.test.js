import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

function core() {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync('word_practice_core.js', 'utf8'), context);
  return context.AlloWordPracticeCore;
}
const item = { word: 'Leaf', definition: '', example: '', translations: [
  { language: 'Arabic', text: 'ورقة' }, { language: 'French', text: 'feuille' },
  { language: 'ar', text: 'ورقة نبات' }, { language: 'zh-Hant', text: '葉' },
  { language: 'zh-Hans', text: '叶' }, { language: '', text: 'Unlabelled passage' },
  { language: 'Community language', text: 'Authored local passage' },
] };

describe('translation language choices', () => {
  it('uses the same language identity for a saved glossary origin without crossing script or regional variants', () => {
    const api = core();
    const entry = { word: 'Leaf', definitionLanguage: 'ar', etymology: 'Legacy English origin.', etymologyByLang: { Arabic: 'أصل الكلمة.' } };
    expect(api.normalizeInput({ words: [entry] }).items[0].origin).toBe('أصل الكلمة.');
    expect(api.normalizeInput({ words: [{ ...entry, definitionLanguage: 'ar-Latn' }] }).items[0].origin).toBe('Legacy English origin.');
    expect(api.normalizeInput({ words: [{ ...entry, etymologyByLang: { ...entry.etymologyByLang, ar: 'النسخة المحددة.' } }] }).items[0].origin).toBe('النسخة المحددة.');
  });
  it('defaults to all authored translations and distinguishes all from none', () => {
    const api = core();
    expect(api.normalizeOptions({}).translationLanguages).toBeNull();
    const all = api.visibleTranslations(item, {});
    expect(all).toEqual(item.translations);
    expect(all).not.toBe(item.translations);
    expect(api.visibleTranslations(item, { translationLanguages: [] })).toEqual([]);
    expect(api.hasMeaning(item, { translationLanguages: [] })).toBe(false);
    expect(api.hasMeaning(item, {})).toBe(true);
    expect(api.hasMeaning({ ...item, definition: 'A plant part.' }, { translationLanguages: [] })).toBe(true);
  });
  it('groups aliases in the requested order while keeping scripts, regions and original text distinct', () => {
    const api = core();
    const before = JSON.stringify(item);
    const options = api.normalizeOptions({ translationLanguages: ['French', 'AR', 'Arabic', 'zh_Hant', ' community   LANGUAGE ', ''] });
    expect(options.translationLanguages).toEqual(['fr', 'ar', 'zh-hant', 'community language', '']);
    expect(api.visibleTranslations(item, options).map(row => row.text)).toEqual(['feuille', 'ورقة', 'ورقة نبات', '葉', 'Authored local passage', 'Unlabelled passage']);
    expect(api.visibleTranslations(item, { translationLanguages: ['zh-Hans'] }).map(row => row.text)).toEqual(['叶']);
    expect(api.translationLanguageKey('pt-BR')).not.toBe(api.translationLanguageKey('pt-PT'));
    expect(JSON.stringify(item)).toBe(before);
  });
  it('round trips choices without deleting source translations and supports partial option overrides', () => {
    const api = core();
    const input = { words: [item], options: { translationLanguages: ['fr'], cardFont: 'georgia', translationTextScale: 1.4 } };
    const saved = JSON.parse(api.serializePack(input));
    expect(saved.items[0].translations).toHaveLength(item.translations.length);
    expect(saved.options).toMatchObject({ translationLanguages: ['fr'], cardFont: 'georgia', translationTextScale: 1.4 });
    const restored = api.normalizeInput(saved), options = api.normalizeOptions({ ...restored.options, cardTextScale: 1.2 });
    expect(api.visibleTranslations(restored.items[0], options).map(row => row.text)).toEqual(['feuille']);
    expect(api.visibleTranslations(restored.items[0], { translationLanguages: null })).toEqual(restored.items[0].translations);
    expect(api.normalizeOptions({ translationLanguages: 'Arabic' }).translationLanguages).toBeNull();
    expect(api.normalizeOptions({ translationLanguages: [null, 1] }).translationLanguages).toBeNull();
    expect(api.normalizeOptions({ translationLanguages: Array.from({ length: 300 }, (_, i) => 'Community ' + i) }).translationLanguages).toHaveLength(256);
  });
});
