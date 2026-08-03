// The app language picker must label each language in ITSELF.
//
// It used to render the English `display` name, passed through
// t('languages_list.<name>') when a key happened to exist. Only 14 of 64 options
// had one, so the list read as a half-translated mix — "Inglés, Acholi, Amharic,
// Árabe, Bengali..." — and even a complete set would fail the person the picker
// exists for: someone who reads only Somali cannot find their language in a
// Vietnamese-labelled list.
//
// Endonyms are legible to their own speaker regardless of the current UI
// language, which is why OS and browser pickers work this way, and it is 63
// strings instead of 63x63.
//
// The endonyms live in dev-tools/update_lang_manifest.cjs, NOT hand-edited into
// lang/manifest.json, so regenerating the manifest cannot silently drop them.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let manifest, generator, source, module_;

// Same rule the component uses.
const NON_LATIN = /[^ -ɏḀ-ỿ\s().,'’-]/;
function optionLabel(entry) {
  const endonym = entry.endonym || entry.value;
  if (endonym === entry.value) return entry.value;
  const needsGloss = NON_LATIN.test(endonym) && !/[()]/.test(entry.value);
  return needsGloss ? `${endonym} (${entry.value})` : endonym;
}

beforeAll(() => {
  manifest = JSON.parse(readFileSync(resolve(process.cwd(), 'lang/manifest.json'), 'utf8'));
  generator = readFileSync(resolve(process.cwd(), 'dev-tools/update_lang_manifest.cjs'), 'utf8');
  source = readFileSync(resolve(process.cwd(), 'ui_language_selector_source.jsx'), 'utf8');
  module_ = readFileSync(resolve(process.cwd(), 'ui_language_selector_module.js'), 'utf8');
});

describe('manifest carries an endonym for every language', () => {
  it('every entry has a non-empty endonym', () => {
    const missing = manifest.available.filter((e) => !e.endonym || !String(e.endonym).trim());
    expect(missing.map((e) => e.slug), 'entries without an endonym').toEqual([]);
  });

  it('endonyms come from the generator, so a regen cannot drop them', () => {
    expect(generator).toContain('const ENDONYMS = {');
    expect(generator, 'the generator must emit endonym on each entry').toMatch(/endonym[,:]/);
    // spot-check a few that are easy to get wrong
    for (const [slug, endonym] of [['arabic', 'العربية'], ['burmese', 'မြန်မာ'],
      ['chinese_simplified', '简体中文'], ['marshallese', 'Kajin Ṃajeḷ'], ['karen', 'ကညီကျိာ်']]) {
      const entry = manifest.available.find((e) => e.slug === slug);
      expect(entry, `${slug} missing from manifest`).toBeTruthy();
      expect(entry.endonym, `${slug} endonym`).toBe(endonym);
    }
  });

  it('the two Spanish, Portuguese and Chinese packs stay distinguishable', () => {
    // Regression guard: collapsing these to a bare "Español" / "Português" /
    // "中文" would make the picker ambiguous between real, separate packs.
    const of = (s) => manifest.available.find((e) => e.slug === s)?.endonym;
    const pairs = [['spanish_castilian', 'spanish_latin_america'],
      ['portuguese_brazil', 'portuguese_portugal'],
      ['chinese_simplified', 'chinese_traditional']];
    for (const [a, b] of pairs) expect(of(a), `${a} vs ${b}`).not.toBe(of(b));
    expect(of('portuguese_angola')).not.toBe(of('portuguese_brazil'));
  });
});

describe('the picker renders endonyms', () => {
  it('the source labels options with the endonym, not a languages_list lookup', () => {
    expect(source, 'still using the old languages_list lookup')
      .not.toContain('languages_list.${lang}');
    expect(source).toContain('optionLabel(lang)');
  });

  it('the built module carries the change (source was rebuilt)', () => {
    // A source edit that is never rebuilt DOES NOT SHIP — the CDN serves the module.
    expect(module_).toContain('optionLabel');
    expect(module_).not.toContain('languages_list.${lang}');
  });

  it('the option VALUE stays the English display name', () => {
    // setUiLanguage and the pack lookup key off the English name; only the
    // label changes. Swapping the value would break language switching.
    expect(source).toContain('value={lang.value}');
    expect(source).toContain("{ value: 'English', endonym: 'English' }");
  });

  it('produces a readable label for every language, with no nested brackets', () => {
    const opts = [{ value: 'English', endonym: 'English' },
      ...manifest.available.map((e) => ({ value: e.display, endonym: e.endonym }))];
    for (const o of opts) {
      const label = optionLabel(o);
      expect(label.trim().length, `${o.value} produced an empty label`).toBeGreaterThan(0);
      const opens = (label.match(/\(/g) || []).length;
      expect(opens, `${o.value} -> "${label}" has nested brackets`).toBeLessThanOrEqual(1);
    }
  });

  it('glosses non-Latin endonyms so a teacher can still find them', () => {
    const amharic = manifest.available.find((e) => e.slug === 'amharic');
    expect(optionLabel({ value: amharic.display, endonym: amharic.endonym })).toBe('አማርኛ (Amharic)');
    const french = manifest.available.find((e) => e.slug === 'french');
    expect(optionLabel({ value: french.display, endonym: french.endonym })).toBe('Français');
  });
});
