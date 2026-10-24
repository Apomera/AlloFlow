// @vitest-environment jsdom
//
// A corrupt or hostile saved value cannot crash a math tool or inflate a
// badge (math review 3, autosave lane).
//
// localStorage is editable by anyone at the keyboard and can be truncated or
// stale. The hub type-checks every math progress field on restore: counters
// must be finite non-negative numbers, flags exactly true, maps plain objects
// of true (or of counts), id lists unique short ids. Anything else is dropped
// and the tool keeps its own default.
//
// Before the restore had its own helper, the component did
//   Object.assign({}, prev, saved, { _persisted: true })
// so '999' (a string) passed `>= 5`, an array of 4 junk entries passed
// `Object.keys(x).length >= 4`, and a string of 10 letters passed
// `(list || []).length >= 10`.
import { describe, it, expect } from 'vitest';
import {
  loadHub, MATH_TOOLS, fullBucket, saveAndRestore, questState, toolCreatesBucket, seedDefaults,
} from './helpers/math_review3_autosave_fixtures.js';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Hostile stand-ins chosen from the CORRECT value's shape (not from the hub).
function hostileFor(value) {
  if (value === true) return 'true';
  if (typeof value === 'number') return '999';
  if (Array.isArray(value)) return 'abcdefghijklmnop';                 // .length 16
  if (value && typeof value === 'object') {
    const vals = Object.values(value);
    if (vals.length && vals.every((v) => typeof v === 'number')) return { a: '50', b: -1, c: {}, d: 1e12 };
    return ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'];  // Object.keys().length 12
  }
  return { junk: true };
}
function hostileBucket(tool) {
  const out = {};
  Object.entries(tool.progress).forEach(([f, v]) => { out[f] = hostileFor(v); });
  return out;
}
// Parse a payload string the way the component does (raw JSON text allows
// 1e999 = Infinity and own "__proto__" keys, which object literals cannot).
function hydrateText(hub, text, prev) {
  return hub.hydrate(prev || {}, JSON.parse(text));
}

describe('hostile saved values are rejected field by field', () => {
  it.each(MATH_TOOLS.map((t) => [t.key, t]))('%s: no hostile value survives a restore', (key, tool) => {
    const hub = loadHub();
    let next = hydrateText(hub, JSON.stringify({ [key]: hostileBucket(tool) }));
    const create = toolCreatesBucket(tool);
    if (create) next = hub.applyPending(Object.assign({}, next, create(next)));
    const restored = next[key] || {};
    // Nothing in the hostile bucket is valid, so each field must come back
    // absent (the tool's default applies), as an empty map, or, for a nested
    // record of counts (score, plateGame), zero-filled.
    const leaked = [];
    Object.keys(tool.progress).forEach((f) => {
      if (!Object.prototype.hasOwnProperty.call(restored, f)) return;
      const v = restored[f];
      if (create && f in seedDefaults(tool) && v === seedDefaults(tool)[f]) return; // the tool's own seed
      const empty = v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every((x) => x === 0);
      if (!empty) leaked.push(f + '=' + JSON.stringify(v));
    });
    expect(leaked, key + ' kept hostile values').toEqual([]);
  });

  it('counters: strings, negatives, Infinity, over-cap, objects and booleans are all refused', () => {
    const hub = loadHub();
    const text = '{"_numberline":{"roundingSolved":"7","fractionSolved":-3,"negativeSolved":1e999,"placeSolved":1e12,"aiAsked":{},"bestStreak":true,"supportedCorrect":[5],"independentCorrect":4}}';
    const nl = hydrateText(hub, text)._numberline;
    expect(nl).toEqual({ independentCorrect: 4 });
  });

  it('maps: arrays, strings and non-true entries are refused; prototype keys are skipped', () => {
    const hub = loadHub();
    const text = '{"_fractions":{"badges":{"__proto__":{"polluted":true},"constructor":true,"firstSlice":true,"streak3":false,"score10":"yes","score25":{},"allTypes":0},' +
      '"challengeTypesUsed":["a","b","c","d","e","f","g"],"tabsVisited":"practice,compare","tabScores":{"practice":3,"compare":"9","wall":-2},' +
      '"score":{"correct":"12","total":15},"plateGame":"lots"}}';
    const f = hydrateText(hub, text)._fractions;
    expect(Object.keys(f.badges)).toEqual(['firstSlice']);
    expect(Object.getPrototypeOf(f.badges)).toBe(Object.prototype);
    expect(({}).polluted).toBeUndefined();
    expect(f).not.toHaveProperty('challengeTypesUsed');
    expect(f).not.toHaveProperty('tabsVisited');
    expect(f.tabScores).toEqual({ practice: 3 });
    expect(f.score).toEqual({ correct: 0, total: 15 });
    expect(f).not.toHaveProperty('plateGame');
  });

  it('id lists: a string, junk entries and duplicates cannot pad a badge count', () => {
    const hub = loadHub();
    const ids = Array.from({ length: 900 }, (_, i) => 'b' + i);
    const text = JSON.stringify({
      algebraCAS: { _badgesEarned: 'xxxxxxxxxxxxxxxx' },
      graphCalc: { badges: ['firstGraph', 'firstGraph', 'firstGraph', null, {}, true, -1, '', 'x'.repeat(500), 'zeroFinder'], _challengesDone: ids },
    });
    const next = hydrateText(hub, text);
    expect(next.algebraCAS).toBeUndefined();
    expect(next.graphCalc.badges).toEqual(['firstGraph', 'zeroFinder']);
    expect(next.graphCalc._challengesDone.length).toBe(500);
  });

  it('tallies must be {attempts, correct} with correct <= attempts', () => {
    const hub = loadHub();
    const text = JSON.stringify({ _multExt: { factScores: { '3x4': { attempts: 2, correct: 9 }, '6x7': 'all', '2x2': { attempts: 3, correct: 3, note: 'x' } } } });
    expect(hydrateText(hub, text)._multExt.factScores).toEqual({ '2x2': { attempts: 3, correct: 3 } });
  });

  it('oversized maps and over-long keys are capped', () => {
    const hub = loadHub();
    const big = {};
    for (let i = 0; i < 5000; i++) big['k' + i] = true;
    big['y'.repeat(301)] = true;
    const next = hydrateText(hub, JSON.stringify({ _coordGrid: { revealedItems: big } }));
    const keys = Object.keys(next._coordGrid.revealedItems);
    expect(keys.length).toBe(2000);
    expect(keys.some((k) => k.length > 300)).toBe(false);
  });

  it('a bucket that is not an object never replaces the tool defaults', () => {
    const hub = loadHub();
    const prev = { funcGrapher: { type: 'quadratic', a: 1 }, calculus: { mode: 'riemann' } };
    const next = hydrateText(hub, JSON.stringify({ funcGrapher: 7, calculus: null, _fractions: 'x', algebraCAS: [1, 2, 3], _stemProgressPending: { statsLab: 'x' } }), prev);
    expect(next.funcGrapher).toEqual({ type: 'quadratic', a: 1 });
    expect(next.calculus).toEqual({ mode: 'riemann' });
    expect(next).not.toHaveProperty('_fractions');
    expect(next).not.toHaveProperty('algebraCAS');
    expect(next).not.toHaveProperty('_stemProgressPending');
  });
});

describe("hostile values cannot complete a tool's own quests", () => {
  const withProgressHooks = MATH_TOOLS.filter((t) => t.questTrue.length);
  it.each(withProgressHooks.map((t) => [t.id, t]))('%s', (id, tool) => {
    resetStemLab();
    const cfg = loadTool('stem_lab/' + tool.file, tool.id);
    const hub = loadHub();
    let next = hydrateText(hub, JSON.stringify({ [tool.key]: hostileBucket(tool) }));
    const create = toolCreatesBucket(tool);
    if (create) next = hub.applyPending(Object.assign({}, next, create(next)));
    const state = questState(cfg, tool.id, next);
    const hooks = (cfg.questHooks || []).filter((h) => tool.questTrue.includes(h.id));
    expect(hooks.length, id + ' quest hooks found').toBe(tool.questTrue.length);
    const done = hooks.filter((h) => h.check(state)).map((h) => h.id);
    expect(done, id + ' quests completed by junk').toEqual([]);
  });
});

describe('every math tool still renders after a restore', () => {
  // Restoring into an EMPTY toolData is the worst case: no host defaults, so
  // the tool sees a bucket holding progress fields only.
  const cases = [];
  MATH_TOOLS.forEach((t) => { cases.push([t.id + ' (clean progress)', t, 'clean']); cases.push([t.id + ' (hostile values)', t, 'hostile']); });
  it.each(cases)('%s', (label, tool, kind) => {
    resetStemLab();
    loadTool('stem_lab/' + tool.file, tool.id);
    const hub = loadHub();
    const next = kind === 'clean'
      ? saveAndRestore(hub, { [tool.key]: fullBucket(tool) }, {}).next
      : hydrateText(hub, JSON.stringify({ [tool.key]: hostileBucket(tool) }));
    const errors = [];
    const origError = console.error;
    console.error = (...a) => { errors.push(a.map(String).join(' ').slice(0, 300)); };
    let html;
    try {
      html = renderTool(tool.id, next, { labToolData: next });
    } finally {
      console.error = origError;
    }
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(200);
    expect(errors.filter((e) => /Render error|TypeError|ReferenceError|is not a function|Cannot read/.test(e)), label).toEqual([]);
    // A progress-only bucket must not leave the tool computing on missing
    // fields: no more NaN / "undefined" on screen than a first visit shows.
    const fresh = renderTool(tool.id, {}, { labToolData: {} });
    const count = (s, re) => (s.match(re) || []).length;
    expect(count(html, /NaN/g), label + ' NaN').toBeLessThanOrEqual(count(fresh, /NaN/g));
    expect(count(html, /undefined/g), label + ' undefined').toBeLessThanOrEqual(count(fresh, /undefined/g));
  });
});
