// Bridge Lab in other languages. The host loads a language pack as-is and never fills a key the pack lacks, so a
// pack that is missing a key, or holds the English copied in, shows English to that learner. This gate resolves every
// string the tool references the way the host does (nested dotted walk of the pack) and renders the tool in the language.
// BRIDGELAB_PACK_DIR lets a mutation check run against edited copies of the packs.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
vi.setConfig({ testTimeout: 120000, hookTimeout: 120000 });

const PACK_DIR = process.env.BRIDGELAB_PACK_DIR || 'lang';
const SOURCE_PATH = 'stem_lab/stem_tool_bridgelab.js';
const SOURCE = readFileSync(SOURCE_PATH, 'utf8');
// BRIDGELAB_UI lets a mutation check run against an edited copy of ui_strings.js.
const UI = JSON.parse(readFileSync(process.env.BRIDGELAB_UI || 'ui_strings.js', 'utf8')).stem.bridgelab;
// Languages whose Bridge Lab text has been translated. Add a slug here when its pack is done.
const TRANSLATED = ['spanish_latin_america', 'french', 'arabic', 'chinese_simplified'];
const SCRIPT = { arabic: /[؀-ۿ]/g, chinese_simplified: /[一-鿿]/g };

// Static keys, plus the two the tool builds at runtime: '<bridge type id>_desc' and '<material id>_desc'.
const RUNTIME_IDS = [...SOURCE.matchAll(/^\s*\{?\s*id:\s*'([a-z_]+)',\s*(?:name|icon):/gm)].map(m => m[1] + '_desc');
const USED = [...new Set([...SOURCE.matchAll(/['"]stem\.bridgelab\.([A-Za-z0-9_.]+)['"]/g)].map(m => m[1]).concat(RUNTIME_IDS))].filter(k => k in UI);
const packs = {};
for (const slug of TRANSLATED) packs[slug] = JSON.parse(readFileSync(PACK_DIR + '/' + slug + '.js', 'utf8'));
// The host's strict dotted walk.
function lookup(pack, key) { let n = pack; for (const part of key.split('.')) { if (n == null || typeof n !== 'object') return null; n = n[part]; } return typeof n === 'string' ? n : null; }
const placeholders = s => (s.match(/\{[A-Za-z0-9_]+\}/g) || []).sort().join(' ');

describe('a changed English string is re-translated in every finished pack', () => {
  // The 2026-10-27 fact-check corrected 47 strings (dates, counts, causes). Each finished translation of a corrected string
  // described the OLD claim until it was redone, and nothing failed in the meantime. This records which English each
  // translation was made from (tests/fixtures/bridgelab_translation_source.json) so a change to the English is caught.
  it('the English of every used key is the English the packs were translated from', () => {
    const recorded = JSON.parse(readFileSync('tests/fixtures/bridgelab_translation_source.json', 'utf8'));
    const sha = s => createHash('sha256').update(s).digest('hex').slice(0, 12);
    const changed = USED.filter(k => recorded[k] !== sha(UI[k]));
    expect(changed.slice(0, 12), 'English changed (or is new) since the translations were made. Re-translate these keys in every pack in TRANSLATED, '
      + 'then run node dev-tools/bridgelab_record_translation_source.cjs. Do not re-record just to silence this.').toEqual([]);
  });
});

describe('every string the tool references is translated in each finished pack', () => {
  it('references a meaningful number of keys, including the runtime-built descriptions', () => {
    expect(USED.length).toBeGreaterThan(1400);
    for (const k of ['beam_desc', 'cable_stayed_desc', 'steel_desc', 'composite_desc']) expect(USED, k).toContain(k);
  });
  for (const slug of TRANSLATED) {
    it(slug + ': no referenced key is missing, and nearly none is still English', () => {
      const bridge = (packs[slug].stem || {}).bridgelab || {};
      const missing = USED.filter(k => typeof bridge[k] !== 'string' || !bridge[k].trim());
      expect(missing.slice(0, 10), 'missing from ' + slug).toEqual([]);
      const english = USED.filter(k => /[A-Za-z]{3,}/.test(UI[k]) && bridge[k] === UI[k]);
      // A unit, a bare name or an NGSS code can read the same in the target language; a pack that is mostly English cannot.
      expect(english.length, 'still English in ' + slug + ': ' + english.slice(0, 12).join(', ')).toBeLessThanOrEqual(30);
      // The bridge-type and material descriptions are built at runtime, which a static key scan cannot see; none may stay English.
      expect(RUNTIME_IDS.filter(k => k in UI && bridge[k] === UI[k]), 'runtime-built descriptions still English in ' + slug).toEqual([]);
    });
    it(slug + ': no value is older English wording (it differs from the current English but is still English)', () => {
      // Found 2026-10-27: eight keys had been reworded in English after the packs were built, so the packs held the OLD English;
      // "differs from the current English" is not the same as "translated".
      const bridge = packs[slug].stem.bridgelab;
      const FUNCTION_WORDS = new Set('the and of is are that with this for it be from by as which when you your can will not or if at an'.split(' '));
      const looksEnglish = s => { const w = s.toLowerCase().match(/[a-z']+/g) || []; const hits = w.filter(x => FUNCTION_WORDS.has(x)).length; return w.length >= 5 && hits >= 2 && hits / w.length >= 0.08; };
      const stale = USED.filter(k => bridge[k] !== UI[k] && looksEnglish(bridge[k]));
      expect(stale.slice(0, 10), 'old English left in ' + slug).toEqual([]);
    });
    it(slug + ': placeholders, brand terms and gluing whitespace survive', () => {
      const bridge = packs[slug].stem.bridgelab, bad = [];
      for (const k of USED) {
        const en = UI[k], tr = bridge[k];
        if (placeholders(en) !== placeholders(tr)) bad.push(k + ' placeholders');
        for (const term of ['AlloFlow', 'XP', 'UDL', 'IEP', 'WCAG']) if (new RegExp('\\b' + term + '\\b').test(en) && !tr.includes(term)) bad.push(k + ' lost ' + term);
        // A value glued to the next string needs its trailing space, except after CJK full-width punctuation, which is spaced by the glyph.
        const cjkStop = /[：；，。、？！）]$/.test(tr);
        if ((/\s$/.test(en) !== /\s$/.test(tr) && !(cjkStop && /\s$/.test(en))) || /^\s/.test(en) !== /^\s/.test(tr)) bad.push(k + ' whitespace');
        if (tr.includes('�') || /\\u[0-9a-fA-F]{4}/.test(tr)) bad.push(k + ' junk');
      }
      expect(bad.slice(0, 10)).toEqual([]);
    });
    if (SCRIPT[slug]) it(slug + ': long prose is in the target script, not Latin', () => {
      const bridge = packs[slug].stem.bridgelab;
      const latinHeavy = USED.filter(k => UI[k].length > 60 && (() => { const t = bridge[k].replace(/\{[A-Za-z0-9_]+\}/g, ''); const l = (t.match(/[A-Za-z]/g) || []).length, s = (t.match(SCRIPT[slug]) || []).length; return l > s; })());
      expect(latinHeavy.slice(0, 8)).toEqual([]);
    });
  }
});

describe('the tool renders in each language', () => {
  const mounts = [];
  const prevAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  beforeAll(() => { resetStemLab(); loadTool(SOURCE_PATH, 'bridgeLab'); });
  beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
  afterEach(() => { mounts.splice(0).forEach(v => v.unmount()); globalThis.IS_REACT_ACT_ENVIRONMENT = prevAct; });
  function mount(slug, patch) {
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    const t = (k, fb) => (slug ? lookup(packs[slug], k) : null) ?? fb;
    function App() {
      const [data, setData] = React.useState({ bridgeLab: { tab: 'build', bridgeView: '2d', introDismissed: true, ...patch } });
      return window.StemLab._registry.bridgeLab.render(makeCtx({ toolData: data, setToolData: setData, awardXP() {}, addToast() {}, t }));
    }
    act(() => root.render(React.createElement(App)));
    const view = { host, unmount() { act(() => root.unmount()); host.remove(); } };
    mounts.push(view); return view;
  }
  const bridge = slug => packs[slug].stem.bridgelab;

  for (const slug of TRANSLATED) {
    it(slug + ': tab labels, the challenge list and an active challenge appear in the language, with no raw placeholders', () => {
      const b = bridge(slug);
      const list = mount(slug, {});
      const tabs = [...list.host.querySelectorAll('[role=tab]')].map(el => el.getAttribute('aria-label'));
      expect(tabs).toContain(b.stress_test);
      expect(tabs).toContain(b.quiz);
      const items = [...list.host.querySelectorAll('[data-bridge-challenge]')].map(el => el.textContent);
      expect(items.length).toBe(5);
      expect(items.some(t => t.includes(b.challenge_haul_road)), 'haul road title').toBe(true);
      expect(items.every(t => !/\{[a-z]+\}/.test(t)), 'raw placeholder in the list').toBe(true);
      expect(items[0]).toContain(b.challenge_not_tried);

      const ex = { span: 36, nBays: 6, loadMode: 'vehicle', vehicleLoad: 300, vehiclePos: 0.5, trussStyle: 'warren', height: 6, lateralBraceEvery: 1, materialId: 'steel', crossSectionMm2: 13000 };
      const active = mount(slug, { challengeId: 'haul_road', ...ex });
      const card = active.host.querySelector('[data-bridge-challenge-active]').textContent;
      expect(card).toContain(b.challenge_haul_road_story);
      expect(card).toContain(b.challenge_met);
      expect(card).toContain(b.challenge_record);
      expect(card, 'raw placeholder on the card').not.toMatch(/\{[a-z]+\}/);
      expect(card).toMatch(/36/);
      // the worst-position sentence is filled in: a distance in metres and a member name
      expect(card).toMatch(/\bDL0\b|\bDL\d\b|\bTC\d\b|\bBC\d\b/);
    });

    it(slug + ': the Stress Test and Materials tabs show pack text, including the runtime-built descriptions', () => {
      const b = bridge(slug);
      const stress = mount(slug, {}).host.textContent;
      // Plain strings that render verbatim: count how many of this pack's longer values appear on screen.
      const shown = USED.map(k => b[k]).filter(v => v.length >= 14 && !/\{[a-z]+\}/.test(v) && stress.includes(v)).length;
      expect(shown, 'pack strings visible on Stress Test').toBeGreaterThanOrEqual(25);
      expect(stress).not.toMatch(/\{[a-z]+\}/);
      const materials = mount(slug, { tab: 'materials' }).host.textContent;
      for (const k of ['wood_desc', 'steel_desc', 'composite_desc']) expect(materials.includes(b[k]), k + ' on Materials').toBe(true);
      const types = mount(slug, { tab: 'types' }).host.textContent;
      expect(types.includes(b.truss_desc), 'truss_desc on Bridge Types').toBe(true);
    });
  }

  it('with no pack the tool falls back to its own English (the host path for English and for a missing key)', () => {
    const v = mount(null, {});
    expect([...v.host.querySelectorAll('[role=tab]')].map(el => el.getAttribute('aria-label'))).toContain('Stress Test');
  });
});
