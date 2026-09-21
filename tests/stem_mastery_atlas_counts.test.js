import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// The Mastery Atlas reads 13 tools' persisted state from window slots and
// localStorage. That state is user-writable and outlives any release, so its
// shape is untrusted. Two counting faults showed through to the learner:
//
//   * `(s.field || s)` fell back to the WHOLE state object when the nested
//     mastery map was absent, so a tool holding only settings (volume, theme,
//     tutorialSeen, lastTab) reported "4 / 15" mastered when nothing was.
//   * no count was bounded by the total it is displayed against, so a large
//     or corrupt map rendered "200 / 15" with a progress bar past its track.
//
// These tests run the SHIPPED entry table and helpers.

const HUB = 'stem_lab/stem_lab_module.js';
const source = () => readFileSync(HUB, 'utf8');

function extractBalanced(src, openAt, openChar, closeChar) {
  let depth = 0, quote = null, lineComment = false, blockComment = false;
  for (let i = openAt; i < src.length; i++) {
    const char = src[i], next = src[i + 1];
    if (lineComment) { if (char === '\n') lineComment = false; continue; }
    if (blockComment) { if (char === '*' && next === '/') { blockComment = false; i++; } continue; }
    if (quote) { if (char === '\\') { i++; continue; } if (char === quote) quote = null; continue; }
    if (char === '/' && next === '/') { lineComment = true; i++; continue; }
    if (char === '/' && next === '*') { blockComment = true; i++; continue; }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === openChar) depth++;
    if (char === closeChar) { depth--; if (depth === 0) return src.slice(openAt, i + 1); }
  }
  throw new Error('Could not find balanced ' + openChar + closeChar);
}

// A `var NAME = function ... };` assignment, taken whole.
function varFn(src, name) {
  const at = src.indexOf('var ' + name + ' = function');
  expect(at, 'hub no longer declares ' + name).toBeGreaterThanOrEqual(0);
  const braceAt = src.indexOf('{', at);
  return src.slice(at, braceAt) + extractBalanced(src, braceAt, '{', '}') + ';';
}

function loadAtlas() {
  const src = source();
  const entriesAt = src.indexOf('var _atlasEntries = [');
  expect(entriesAt, '_atlasEntries moved').toBeGreaterThanOrEqual(0);
  const sandbox = {
    window: {},
    localStorage: { getItem: () => null },
    JSON, Object, Math, isFinite, Number, Array,
    t: () => null
  };
  runInNewContext([
    varFn(src, '_readSlot'),
    varFn(src, '_atlasCardCount'),
    varFn(src, '_atlasMapCount'),
    varFn(src, '_atlasClamp'),
    varFn(src, '_countPetsDecoderMastery'),
    'var _atlasEntries = ' + extractBalanced(src, src.indexOf('[', entriesAt), '[', ']') + ';',
    'this.entries = _atlasEntries; this.mapCount = _atlasMapCount; this.clamp = _atlasClamp;'
  ].join('\n'), sandbox);
  return sandbox;
}

// Put a shape in one tool's window slot and read that tool's count.
function countWith(sandbox, id, value) {
  const entry = sandbox.entries.find((e) => e.id === id);
  expect(entry, 'no atlas entry ' + id).toBeTruthy();
  sandbox.window[entry.slot] = value;
  try { return entry.count(); } finally { delete sandbox.window[entry.slot]; }
}

// Tools whose count reads a nested map, with the field each one uses.
const MAP_TOOLS = [
  ['birdLab', 'lifeList'],
  ['opticsLab', 'quizMastery'],
  ['statsLab', 'quizMastery'],
  ['weldLab', 'defectCatalog'],
  ['renewablesLab', 'quizMastery'],
  ['firstResponse', 'faMastery'],
  ['throwlab', 'pitchLocker'],
  ['playlab', 'playCatalog'],
  ['roadReady', 'permitMastery'],
  ['assessmentLiteracy', 'junkMastery'],
  ['fisherLab', 'speciesCaught']
];

const SETTINGS_ONLY = { volume: 0.8, theme: 'dark', lastTab: 'quiz', tutorialSeen: true };

describe('the atlas does not invent mastery', () => {
  it.each(MAP_TOOLS)('%s reports 0 when only settings are stored', (id) => {
    // The regression: this counted the four settings keys.
    expect(countWith(loadAtlas(), id, SETTINGS_ONLY)).toBe(0);
  });

  it.each(MAP_TOOLS)('%s counts the real map when present', (id, field) => {
    const state = Object.assign({}, SETTINGS_ONLY, { [field]: { a: 1, b: 2, c: 3 } });
    expect(countWith(loadAtlas(), id, state)).toBe(3);
  });

  it('reports 0 for a tool that has never been opened', () => {
    const sb = loadAtlas();
    for (const e of sb.entries) expect(e.count()).toBe(0);
  });
});

describe('no tile can exceed its own total', () => {
  it.each(MAP_TOOLS)('%s clamps a huge map to its total', (id, field) => {
    const sb = loadAtlas();
    const entry = sb.entries.find((e) => e.id === id);
    const many = {};
    for (let i = 0; i < 500; i++) many['k' + i] = 1;
    const n = countWith(sb, id, { [field]: many });
    // The bar is width:(current/total*100)% and the label reads "N / total".
    expect(n).toBeLessThanOrEqual(entry.total);
  });

  it('clamps the numeric aquaculture counter in both directions', () => {
    const sb = loadAtlas();
    const total = sb.entries.find((e) => e.id === 'aquacultureLab').total;
    expect(countWith(sb, 'aquacultureLab', { droppersDeployed: -5 })).toBe(0);
    expect(countWith(sb, 'aquacultureLab', { droppersDeployed: 1e9 })).toBe(total);
    expect(countWith(sb, 'aquacultureLab', { droppersDeployed: 3 })).toBe(3);
  });

  it('keeps every count a whole number', () => {
    const sb = loadAtlas();
    expect(countWith(sb, 'aquacultureLab', { droppersDeployed: 2.7 })).toBe(2);
  });

  it('never returns a negative or non-finite count for any tool', () => {
    const SHAPES = [undefined, null, 42, -1, 'ready', true, [], [1, 2, 3], {}, { quizMastery: 'x' }, { lifeList: 7 }, NaN, Infinity];
    for (const shape of SHAPES) {
      const sb = loadAtlas();
      for (const e of sb.entries) {
        const n = countWith(sb, e.id, shape);
        expect(Number.isFinite(n), e.id + ' <- ' + String(shape)).toBe(true);
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(e.total);
      }
    }
  });
});

describe('_atlasMapCount only counts real maps', () => {
  it('rejects arrays, strings, numbers and null', () => {
    const { mapCount } = loadAtlas();
    expect(mapCount(null, 'f')).toBe(0);
    expect(mapCount('str', 'f')).toBe(0);
    expect(mapCount(7, 'f')).toBe(0);
    expect(mapCount([1, 2, 3], 'f')).toBe(0);
    expect(mapCount({ f: [1, 2, 3] }, 'f')).toBe(0);
    expect(mapCount({ f: 'abc' }, 'f')).toBe(0);
  });

  it('does NOT fall back to the holder when the field is absent', () => {
    const { mapCount } = loadAtlas();
    // This fallback is what invented mastery from settings keys.
    expect(mapCount({ a: 1, b: 2 }, 'missingField')).toBe(0);
  });

  it('counts the map when the field holds one', () => {
    const { mapCount } = loadAtlas();
    expect(mapCount({ f: { x: 1, y: 2 } }, 'f')).toBe(2);
  });

  it('counts the holder itself when no field is named', () => {
    const { mapCount } = loadAtlas();
    expect(mapCount({ x: 1, y: 2 })).toBe(2);
  });
});

describe('every atlas entry is well formed', () => {
  it('declares a positive total and a count function', () => {
    const sb = loadAtlas();
    expect(sb.entries.length).toBeGreaterThan(0);
    for (const e of sb.entries) {
      expect(typeof e.count, e.id).toBe('function');
      expect(e.total, e.id).toBeGreaterThan(0);
      expect(typeof e.slot, e.id).toBe('string');
      expect(typeof e.lsKey, e.id).toBe('string');
    }
  });

  it('routes every count through the clamp', () => {
    const src = source();
    const entriesAt = src.indexOf('var _atlasEntries = [');
    const arr = extractBalanced(src, src.indexOf('[', entriesAt), '[', ']');
    const counts = arr.match(/count: function \(\) \{[^}]*\}/g) || [];
    expect(counts.length).toBeGreaterThan(0);
    for (const c of counts) expect(c, c.slice(0, 80)).toContain('_atlasClamp(');
  });
});
