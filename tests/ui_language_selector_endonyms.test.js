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

let manifest, generator, source, module_, launchSource, launchModule, quickstart, ui;

// Same rule the component uses.
function optionLabel(entry) {
  const endonym = entry.endonym || entry.value;
  if (endonym === entry.value) return entry.value;
  return endonym + ' — ' + entry.value;
}
beforeAll(() => {
  manifest = JSON.parse(readFileSync(resolve(process.cwd(), 'lang/manifest.json'), 'utf8'));
  generator = readFileSync(resolve(process.cwd(), 'dev-tools/update_lang_manifest.cjs'), 'utf8');
  source = readFileSync(resolve(process.cwd(), 'ui_language_selector_source.jsx'), 'utf8');
  module_ = readFileSync(resolve(process.cwd(), 'ui_language_selector_module.js'), 'utf8');
  launchSource = readFileSync(resolve(process.cwd(), 'view_launch_pad_source.jsx'), 'utf8');
  launchModule = readFileSync(resolve(process.cwd(), 'view_launch_pad_module.js'), 'utf8');
  quickstart = readFileSync(resolve(process.cwd(), 'quickstart_source.jsx'), 'utf8');
  ui = JSON.parse(readFileSync(resolve(process.cwd(), 'ui_strings.js'), 'utf8'));
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
  it('keeps every initially focusable language control named before translations settle', () => {
    expect(source).toContain('const languageCopy = (key, fallback) => {');
    for (const fallback of [
      "languageCopy('language_selector.select_label', 'Select UI Language')",
      "languageCopy('language_selector.search_placeholder', 'Enter Language...')",
      "languageCopy('language_selector.set_custom_label', 'Set Custom Language')",
      "languageCopy('language_selector.upload_tooltip', 'Import Language Pack')",
    ]) expect(source).toContain(fallback);
  });

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

  it('produces a readable native-plus-English label for every language', () => {
    const opts = [{ value: 'English', endonym: 'English' },
      ...manifest.available.map((e) => ({ value: e.display, endonym: e.endonym }))];
    for (const o of opts) {
      const label = optionLabel(o);
      expect(label.trim().length, o.value + ' produced an empty label').toBeGreaterThan(0);
      if (o.endonym === o.value) {
        expect(label).toBe(o.value);
      } else {
        expect(label).toContain(o.endonym);
        expect(label).toContain(o.value);
        expect(label).toContain(' — ');
      }
      const firstOpen = label.indexOf('(');
      const firstClose = label.indexOf(')', firstOpen);
      const secondOpen = label.indexOf('(', firstOpen + 1);
      expect(firstOpen === -1 || secondOpen === -1 || secondOpen > firstClose).toBe(true);
    }
  });
  it('shows the English name for Latin and non-Latin endonyms', () => {
    const amharic = manifest.available.find((e) => e.slug === 'amharic');
    expect(optionLabel({ value: amharic.display, endonym: amharic.endonym })).toBe('አማርኛ — Amharic');
    const french = manifest.available.find((e) => e.slug === 'french');
    expect(optionLabel({ value: french.display, endonym: french.endonym })).toBe('Français — French');
  });
});

describe('BOTH UI-language pickers use endonyms', () => {
  // There are two surfaces that switch the app's own language: the header
  // selector and the launch pad menu. Fixing one and not the other would leave
  // the same user hitting an English-only list depending on where they clicked.
  it('the launch pad menu labels options with the endonym', () => {
    expect(launchSource).toContain('lpLangLabel(lang)');
    expect(launchSource, 'launch pad still renders the raw English name')
      .not.toMatch(/\{selected \? '✓ ' : '  '\}\{langName\}/);
  });

  it('the launch pad trigger button shows the endonym too', () => {
    // The closed button previously printed currentUiLanguage, i.e. the English
    // name, even once the list itself was localized.
    expect(launchSource).toContain('lpCurrentLabel()');
  });

  it('the launch pad built module carries the change', () => {
    expect(launchModule).toContain('lpLangLabel');
    expect(launchModule).toContain('lpCurrentLabel');
  });

  it('both pickers use the local manifest before remote fallbacks', () => {
    expect(source.indexOf('./lang/manifest.json')).toBeGreaterThanOrEqual(0);
    expect(launchSource.indexOf('./lang/manifest.json')).toBeGreaterThanOrEqual(0);
  });

  it('both pickers keep a complete object-shaped fallback offline', () => {
    const fallbackBlock = (text) => text.match(/(?:const|var) FALLBACK_LANGUAGE_OPTIONS = \[[\s\S]*?\];/)?.[0] || '';
    const expectedCount = manifest.available.length + 1; // English plus every manifest entry
    expect((fallbackBlock(source).match(/\{ value:/g) || []).length).toBe(expectedCount);
    expect((fallbackBlock(launchSource).match(/\{ value:/g) || []).length).toBe(expectedCount);
    expect(launchSource).toContain('useState(FALLBACK_LANGUAGE_OPTIONS)');
  });

  it('both pickers use the same native-plus-English separator', () => {
    expect(source).toContain("return endonym + ' — ' + entry.value + suffix;");
    expect(launchSource).toContain("return endonym + ' — ' + entry.value + suffix;");
  });
  it('every surface that calls setUiLanguage is one of these two', () => {
    // If a third UI-language switcher appears, it needs the same treatment.
    const known = ['ui_language_selector_source.jsx', 'view_launch_pad_source.jsx'];
    for (const f of known) {
      expect(readFileSync(resolve(process.cwd(), f), 'utf8')).toContain('setUiLanguage(');
    }
  });
});

describe('the wizard language picker is deliberately NOT endonym-based', () => {
  // quickstart's "Add a common language" is a different kind of control: a
  // teacher recording which languages their families speak. That is data entry
  // ABOUT other people, so it belongs in the teacher's own UI language — unlike
  // a self-selection picker, where the reader may not read the current UI
  // language at all. languages_list therefore stays.
  it('still uses languages_list', () => {
    expect(quickstart).toContain("t('languages_list.Spanish')");
  });

  it('every language it offers resolves in ui_strings', () => {
    const used = [...new Set([...quickstart.matchAll(/languages_list\.([A-Za-z ()]+)'/g)].map((m) => m[1]))];
    expect(used.length, 'expected the wizard to offer several languages').toBeGreaterThan(5);
    const missing = used.filter((k) => typeof ui.languages_list?.[k] !== 'string');
    expect(missing, `wizard offers languages with no ui_strings entry: ${missing.join(', ')}`).toEqual([]);
  });

  it('languages_list is still referenced, so it must not be deleted', () => {
    expect(typeof ui.languages_list, 'languages_list removed while still in use').toBe('object');
    expect(Object.keys(ui.languages_list).length).toBeGreaterThan(10);
  });
});
