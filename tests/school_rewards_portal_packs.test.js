// School Rewards portal language packs (2026-09-03).
//
// The portal is the one AlloFlow surface that cannot use the shared t() helper
// or the 63 lang/*.js packs: Google serves it from the school's own Apps Script
// project. It therefore carries its own catalogue, published as per-language
// packs. These tests pin the pipeline that replaced the hand-maintained
// dictionary: the catalogue and the sources agree, everything shipped is
// derived from them rather than edited twice, and a language that is listed but
// not embedded really does load at runtime.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const read = (...p) => readFileSync(resolve(ROOT, ...p), 'utf8');
const json = (...p) => JSON.parse(read(...p));

const CATALOGUE = json('apps_script', 'school_rewards', 'portal_strings.json');
const INDEX = json('apps_script', 'school_rewards', 'i18n', 'index.json');
const PORTAL = read('apps_script', 'school_rewards', 'Portal.html');
const SOURCES = readdirSync(resolve(ROOT, 'apps_script/school_rewards/i18n_src'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => json('apps_script', 'school_rewards', 'i18n_src', f));

const placeholders = (text) => (String(text).match(/\{\d\}/g) || []).sort().join(',');

describe('catalogue', () => {
  it('is keyed the way the rest of the repository keys strings, so it can merge into ui_strings', () => {
    expect(CATALOGUE.namespace).toBe('schoolrewards_portal');
    const hash = (value) => { let h = 2166136261; for (const ch of String(value)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
    const keyFor = (english) => {
      const stem = String(english).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 58) || 'copy';
      return `${stem}_${hash(english)}`;
    };
    for (const [key, english] of Object.entries(CATALOGUE.strings)) expect(key, english).toBe(keyFor(english));
    for (const [key, entry] of Object.entries(CATALOGUE.patterns)) expect(key, entry.en).toBe(keyFor(entry.en));
    expect(Object.keys(CATALOGUE.strings).length).toBeGreaterThan(300);
  });

  it('gives every pattern a matcher that its own English satisfies', () => {
    for (const [key, entry] of Object.entries(CATALOGUE.patterns)) {
      const example = entry.en.replace(/\{\d\}/g, '7');
      expect(new RegExp(entry.match).test(example), key + ' :: ' + entry.en).toBe(true);
    }
  });

  it('never asks for school-entered content to be translated', () => {
    const all = [...Object.values(CATALOGUE.strings), ...Object.values(CATALOGUE.patterns).map((p) => p.en)];
    for (const text of all) {
      expect(text, text).not.toMatch(/@/);
      expect(text, text).not.toMatch(/\bRef [A-Z0-9]{4,}/);
    }
  });
});

describe('language sources', () => {
  it('only use catalogue keys, and keep every placeholder the English has', () => {
    expect(SOURCES.length).toBeGreaterThan(0);
    for (const source of SOURCES) {
      expect(source.code).toMatch(/^[a-z]{2}(-[A-Za-z]{2,4})?$/);
      expect(source.name.length).toBeGreaterThan(1);
      for (const key of Object.keys(source.strings || {})) expect(CATALOGUE.strings[key], `${source.code}: unknown string key ${key}`).toBeTruthy();
      for (const [key, value] of Object.entries(source.patterns || {})) {
        const entry = CATALOGUE.patterns[key];
        expect(entry, `${source.code}: unknown pattern key ${key}`).toBeTruthy();
        expect(placeholders(value), `${source.code} :: ${entry.en}`).toBe(placeholders(entry.en));
      }
    }
  });
});

describe('published packs', () => {
  it('are derived from the sources, keyed by the English the portal renders, and mirrored', () => {
    for (const source of SOURCES) {
      const pack = json('apps_script', 'school_rewards', 'i18n', source.code + '.json');
      expect(read('desktop', 'web-app', 'public', 'apps_script', 'school_rewards', 'i18n', source.code + '.json'))
        .toBe(read('apps_script', 'school_rewards', 'i18n', source.code + '.json'));
      for (const [key, value] of Object.entries(source.strings || {})) expect(pack.strings[CATALOGUE.strings[key]]).toBe(value);
      const total = Object.keys(CATALOGUE.strings).length + Object.keys(CATALOGUE.patterns).length;
      const translated = Object.keys(source.strings || {}).length + Object.keys(source.patterns || {}).length;
      expect(pack.coverage).toBe(Math.round((translated / total) * 100));
      // {1} became the $1 the portal's replace understands.
      for (const [, replacement] of pack.patterns) expect(replacement).not.toMatch(/\{\d\}/);
    }
  });

  it('ship Spanish complete: adding English without translating it should fail here', () => {
    const es = INDEX.languages.find((l) => l.code === 'es');
    expect(es.coverage).toBe(100);
    expect(es.entries).toBe(INDEX.total);
  });

  it('are listed in an index that the menu and the repository both follow', () => {
    expect(INDEX.languages[0].code).toBe('en');
    expect(INDEX.total).toBe(Object.keys(CATALOGUE.strings).length + Object.keys(CATALOGUE.patterns).length);
    const codes = INDEX.languages.map((l) => l.code);
    expect(codes).toEqual(['en', ...SOURCES.map((s) => s.code)]);
    // Code.gs validates a student's saved preference and cannot read the index,
    // so its list is generated from the same place.
    const gs = read('apps_script', 'school_rewards', 'Code.gs');
    expect(gs).toContain('var SR_LANGUAGES = [' + codes.map((c) => JSON.stringify(c)).join(', ') + '];');
    expect(gs).toContain('Generated by _build_school_rewards_i18n.js');
  });

  it('are embedded in the portal from the same build, so offline and published can never drift', () => {
    const block = PORTAL.slice(PORTAL.indexOf('/* SR_I18N_DATA_START */'), PORTAL.indexOf('/* SR_I18N_DATA_END */'));
    expect(block).toContain('Generated by _build_school_rewards_i18n.js');
    const es = json('apps_script', 'school_rewards', 'i18n', 'es.json');
    const packs = JSON.parse(block.slice(block.indexOf('var PACKS=') + 'var PACKS='.length, block.indexOf('};\n', block.indexOf('var PACKS=')) + 1));
    expect(packs.es).toEqual(es.strings);
    const meta = JSON.parse(block.slice(block.indexOf('var LANGUAGES=') + 'var LANGUAGES='.length, block.indexOf('];', block.indexOf('var LANGUAGES=')) + 1));
    expect(meta).toEqual(INDEX.languages.filter((l) => l.code !== 'en').map((l) => ({ code: l.code, name: l.name, coverage: l.coverage })));
  });
});

describe('runtime', () => {
  const BLOCK = PORTAL.slice(PORTAL.indexOf('/* SR_I18N_START */'), PORTAL.indexOf('/* SR_I18N_END */'));
  // A language that is published but not embedded: the mechanism this pass
  // added, exercised with a stand-in pack so no invented translation ships.
  const withExtra = BLOCK.replace(/var LANGUAGES=\[/, 'var LANGUAGES=[{"code":"qq","name":"Testish","coverage":100},');
  const PACK = { code: 'qq', name: 'Testish', coverage: 100, strings: { Overview: 'Ovarvyu', 'Award points': 'Awart pointz' }, patterns: [['^(\\d+) points$', '$1 pointz']] };

  function fixture(block, html) {
    document.body.innerHTML = `<main class="shell"><div class="top"><h1 id="school-title">School Rewards</h1><select id="lang-select"><option value="en">English</option><option value="es">Español</option></select></div>${html}</main>`;
    // eslint-disable-next-line no-new-func
    new Function(block)();
    return window.srI18n;
  }
  beforeEach(() => { localStorage.clear(); Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true }); });
  afterEach(() => { delete window.srI18n; delete globalThis.fetch; document.body.innerHTML = ''; });

  it('labels a partly translated language with its coverage so nobody is surprised', () => {
    fixture(BLOCK, '');
    const option = document.querySelector('#lang-select option[value="es"]');
    const es = INDEX.languages.find((l) => l.code === 'es');
    expect(option.textContent).toBe(es.coverage >= INDEX.fullEnough ? es.name : `${es.name} (${es.coverage}%)`);
    expect(document.querySelector('#lang-select option[value="en"]').textContent).toBe('English');
  });

  it('fetches a published pack that is not embedded, then applies it', async () => {
    globalThis.fetch = vi.fn(async (url) => {
      expect(String(url)).toBe('https://alloflow-cdn.pages.dev/apps_script/school_rewards/i18n/qq.json');
      return { ok: true, json: async () => PACK };
    });
    const i18n = fixture(withExtra, '<div id="a">Overview</div><div id="b">12 points</div>');
    expect(document.querySelector('#lang-select option[value="qq"]').textContent).toBe('Testish');
    i18n.setLanguage('qq');
    await new Promise((res) => setTimeout(res, 20));
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(i18n.language()).toBe('qq');
    expect(document.getElementById('a').textContent).toBe('Ovarvyu');
    expect(document.getElementById('b').textContent).toBe('12 pointz');
    // Cached: choosing it again does not fetch twice.
    i18n.setLanguage('en');
    i18n.setLanguage('qq');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('stays in English when the pack cannot be fetched, rather than half-translating', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('offline'); });
    const i18n = fixture(withExtra, '<div id="a">Overview</div>');
    i18n.setLanguage('qq');
    await new Promise((res) => setTimeout(res, 20));
    expect(i18n.language()).toBe('en');
    expect(document.getElementById('a').textContent).toBe('Overview');
  });

  it('leaves the language menu in its own language, so a lost reader can find their way back', () => {
    const i18n = fixture(BLOCK, '');
    i18n.setLanguage('es');
    expect(document.querySelector('#lang-select option[value="en"]').textContent).toBe('English');
    expect(document.querySelector('#lang-select option[value="es"]').textContent).toBe('Español');
    // The menu's own label is translated even though its options are not.
    expect(i18n.translate('Language', 'es')).toBe('Idioma');
  });

  it('still switches to an embedded language with no network at all', () => {
    const i18n = fixture(BLOCK, '<div id="a">Award points</div>');
    i18n.setLanguage('es');
    expect(i18n.language()).toBe('es');
    expect(document.getElementById('a').textContent).toBe('Otorgar puntos');
    expect(i18n.coverage('es')).toBe(INDEX.languages.find((l) => l.code === 'es').coverage);
  });
});
