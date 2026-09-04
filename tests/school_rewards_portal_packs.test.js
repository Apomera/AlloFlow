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

describe('text that only appears after an action (2026-09-03)', () => {
  const SCRIPT = PORTAL.slice(PORTAL.indexOf('<script>'));
  const SCRIPT_ALL = SCRIPT;
  const literals = (source, re) => [...new Set([...source.matchAll(re)]
    .map((m) => m[m.length - 1].replace(/\\'/g, "'")).filter((t) => /[A-Za-z]{3}/.test(t)))];
  const fragment = (t) => /\s$/.test(t)
    || (!/[.!?:)\]]$/.test(t.trim()) && /\b(and|to|of|than|the|a|in|for|with|is|are|up|item)\s*$/i.test(t));
  const covered = (t) => CATALOGUE.strings && Object.values(CATALOGUE.strings).includes(t);

  it('sends every browser dialog through the translator, since dialogs never touch the page', () => {
    // Only the two helpers may call the browser directly.
    expect([...SCRIPT.matchAll(/window\.(?:confirm|prompt)\(/g)].length).toBe(2);
    expect(SCRIPT).toContain('function confirmT(text){return window.confirm(srT(text))}');
    expect(SCRIPT).toContain('function promptT(text,fallback){return window.prompt(srT(text),fallback)}');
    expect([...SCRIPT.matchAll(/\b(?:confirmT|promptT)\(/g)].length).toBeGreaterThan(20);
  });

  it('has a catalogue entry for every status notice and dialog the portal can show', () => {
    const notices = literals(SCRIPT, /notice\('((?:[^'\\]|\\.)*)'/g);
    const dialogs = literals(SCRIPT, /(?:confirmT|promptT)\('((?:[^'\\]|\\.)*)'/g);
    const missing = [...notices, ...dialogs].filter((t) => !covered(t) && !fragment(t));
    expect(missing).toEqual([]);
    expect(notices.length).toBeGreaterThan(80);
  });

  it('translates those strings, not just lists them', () => {
    const es = json('apps_script', 'school_rewards', 'i18n', 'es.json');
    for (const sample of ['Roster import cancelled.', 'Recording award…', 'Refund this entire order and restore its inventory?', 'Reason for this award correction:']) {
      expect(es.strings[sample], sample).toBeTruthy();
      expect(es.strings[sample]).not.toBe(sample);
    }
  });

  it('stores strings as they render, not as the source escapes them', () => {
    // A catalogue entry holding a raw \u escape can never match the rendered
    // text, so its translation would be silently dead.
    const rawEscape = String.fromCharCode(92) + 'u';
    for (const value of Object.values(CATALOGUE.strings)) expect(value, value).not.toContain(rawEscape);
    const tool = read('dev-tools', 'school_rewards_portal_catalogue.cjs');
    expect(tool).toContain('function decode(raw)');
    expect(tool).toContain('String.fromCharCode(parseInt(hex, 16))');
  });

  it('fills value-carrying messages from one translatable sentence', () => {
    expect(SCRIPT_ALL).toContain('function fmt(template)');
    const templates = Object.values(CATALOGUE.strings).filter((t) => /\{\d\}/.test(t));
    expect(templates.length).toBeGreaterThan(5);
    const es = json('apps_script', 'school_rewards', 'i18n', 'es.json');
    for (const t of templates) {
      const translated = es.strings[t];
      if (!translated) continue;
      const want = (t.match(/\{\d\}/g) || []).sort().join(',');
      const got = (translated.match(/\{\d\}/g) || []).sort().join(',');
      expect(got, t).toBe(want);
    }
  });

  it('reads static markup too, so a card added by hand cannot ship untranslated', () => {
    const tool = read('dev-tools', 'school_rewards_portal_catalogue.cjs');
    expect(tool).toContain('const markupText');
    expect(tool).toContain("replace(/<select id=\"lang-select\"");
    expect(tool).toContain('const DENY = new Set([');
    // The roster importer matches these column names literally.
    for (const header of ['firstName', 'lastInitial', 'homeroom']) expect(tool).toContain(`'${header}'`);
    // And the catalogue really does hold the newest card's text.
    const values = Object.values(CATALOGUE.strings);
    expect(values).toContain('Records requests');
    expect(values).toContain('Redact permanently');
    expect(values).not.toContain('firstName');
  });

  it('ships the practice page builder in the repo, so the page can be rebuilt by anyone', () => {
    const builder = read('dev-tools', 'build_school_rewards_practice.py');
    expect(builder).toContain('os.path.dirname(os.path.dirname(os.path.abspath(__file__)))');
    expect(builder).not.toMatch(/C:\\\\Users/);
    expect(builder).toContain('MUST be rebuilt after any');
    // The checked-in page really is the portal it teaches.
    const practice = read('school-rewards-practice.html');
    const portalBody = PORTAL.replace(/\r\n/g, '\n');
    const marker = portalBody.slice(portalBody.indexOf('<main class="shell">'), portalBody.indexOf('<script>'));
    expect(practice.replace(/\r\n/g, '\n')).toContain(marker);
  });

  it('ships a re-runnable harvester, so editing the source cannot silently drop text again', () => {
    const tool = read('dev-tools', 'school_rewards_portal_catalogue.cjs');
    expect(tool).toContain("literals(script, /notice\\(");
    expect(tool).toContain('--include=server');
    expect(tool).toContain('concatenated fragments');
  });
});

describe('the generator', () => {
  const GEN = read('_build_school_rewards_portal_packs.js');
  const SHARED = read('dev-tools', 'build_language_pack.cjs');
  const numbered = (src) => (src.match(/^\s*' {2}\d\. .*$/gm) || []).map((l) => l.trim().replace(/^'/, '').replace(/',?$/, ''));

  it('asks for exactly what the shared pack builder asks for, so the two cannot drift', () => {
    const mine = numbered(GEN).map((r) => r.replace('{LANG}', 'LANG'));
    const theirs = numbered(SHARED).map((r) => r.replace("' + TARGET_LANG + '", 'LANG'));
    expect(mine.length).toBe(7);
    expect(mine).toEqual(theirs);
  });

  it('has a language tag for every language the app offers, and no duplicates', () => {
    const selector = read('ui_language_selector_source.jsx');
    const table = selector.slice(selector.indexOf('const FALLBACK_LANGUAGE_OPTIONS = ['), selector.indexOf('];', selector.indexOf('const FALLBACK_LANGUAGE_OPTIONS = [')) + 2);
    const names = Array.from(table.matchAll(/\{ value: "([^"]+)"/g), (m) => m[1]).filter((n) => n !== 'English');
    const tags = GEN.slice(GEN.indexOf('const BCP47 = {'), GEN.indexOf('};', GEN.indexOf('const BCP47 = {')));
    for (const name of names) expect(tags, name).toContain(`'${name}':`);
    const codes = Array.from(tags.matchAll(/: '([a-zA-Z-]+)'/g), (m) => m[1]);
    expect(codes.length).toBe(names.length);
    expect(new Set(codes).size).toBe(codes.length);
    // Spanish keeps the code it already shipped with, so saved preferences survive.
    expect(tags).toContain("'Spanish (Latin America)': 'es'");
  });

  it('refuses to invent a pack for a language the product has no translation for', () => {
    expect(GEN).toContain("l.provenance !== 'english-passthrough'");
    expect(GEN).toContain('english-passthrough, no usable translation exists');
    // Provenance travels with the pack rather than being asserted in prose.
    expect(GEN).toContain('provenance: language.provenance');
  });

  it('validates each language before writing it', () => {
    expect(GEN).toContain('placeholder drift in ');
    expect(GEN).toContain('the model may have returned English');
    expect(GEN).toContain('came back identical to English');
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
