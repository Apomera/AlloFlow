// The quiz shuffled its four options with sort(() => Math.random() - 0.5),
// which is not a shuffle. Distractor selection used the same comparator, so
// some regions were systematically over-offered as wrong answers.
//
// The uniformity check runs against the shuffle itself, lifted out of the
// source, because a few hundred renders cannot separate a 31% bias from 25%
// without being flaky. The same test then runs the OLD comparator through the
// identical bounds and requires it to fail them, so the gate cannot quietly
// stop discriminating. The rendering tests below tie the helper to its call
// sites.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_brainatlas.js';
const src = readFileSync(FILE, 'utf8');

function liftShuffle() {
  const start = src.indexOf('function brainAtlasShuffle(list) {');
  expect(start, 'brainAtlasShuffle not found in source').toBeGreaterThan(-1);
  let depth = 0;
  let i = src.indexOf('{', start);
  const open = i;
  for (; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') { depth -= 1; if (depth === 0) break; }
  }
  const body = src.slice(open + 1, i);
  // eslint-disable-next-line no-new-func
  return new Function('window', 'list', body + '\nreturn undefined;').bind(null, undefined);
}

function positionShares(shuffle, size, trials) {
  const base = [];
  for (let i = 0; i < size; i += 1) base.push(i);
  const counts = new Array(size).fill(0);
  for (let n = 0; n < trials; n += 1) counts[shuffle(base).indexOf(size - 1)] += 1;
  return counts.map((c) => c / trials);
}

const OLD = (list) => list.slice().sort(() => Math.random() - 0.5);

describe('brainAtlas quiz does not favour any answer position', () => {
  beforeEach(() => { resetStemLab(); vi.useFakeTimers(); });

  it('no longer orders anything with a random sort comparator', () => {
    const uses = src.match(/\.sort\(function \(\) \{ return Math\.random\(\) - 0\.5; \}\)/g) || [];
    expect(uses).toHaveLength(0);
    expect(src).toContain('function brainAtlasShuffle');
  });

  it('prefers the platform shuffle and keeps a real Fisher-Yates locally', () => {
    expect(src).toContain('window.fisherYatesShuffle');
    expect(src).toMatch(/for \(var i = out\.length - 1; i > 0; i--\)/);
    expect(src).toMatch(/Math\.floor\(Math\.random\(\) \* \(i \+ 1\)\)/);
  });

  it('lands each of four options in each slot about a quarter of the time', () => {
    const shares = positionShares(liftShuffle(), 4, 120000);
    shares.forEach((s, i) => {
      expect(s, 'slot ' + i + ' got ' + (s * 100).toFixed(2) + '%').toBeGreaterThan(0.24);
      expect(s, 'slot ' + i + ' got ' + (s * 100).toFixed(2) + '%').toBeLessThan(0.26);
    });
  }, 30000);

  it('rejects the comparator it replaced, so the bounds still discriminate', () => {
    const shares = positionShares(OLD, 4, 120000);
    const fails = shares.some((s) => s <= 0.24 || s >= 0.26);
    expect(fails, 'the old sort comparator passed the uniformity bounds, so they are too loose: '
      + shares.map((s) => (s * 100).toFixed(1) + '%').join(' ')).toBe(true);
  }, 30000);

  it('is uniform for three items too, where the old comparator was worst', () => {
    const shares = positionShares(liftShuffle(), 3, 120000);
    shares.forEach((s, i) => {
      expect(s, 'slot ' + i + ' got ' + (s * 100).toFixed(2) + '%').toBeGreaterThan(0.32);
      expect(s, 'slot ' + i + ' got ' + (s * 100).toFixed(2) + '%').toBeLessThan(0.35);
    });
    const oldShares = positionShares(OLD, 3, 120000);
    expect(Math.max(...oldShares) / Math.min(...oldShares)).toBeGreaterThan(2);
  }, 30000);

  it('keeps every element exactly once', () => {
    const shuffle = liftShuffle();
    const base = ['a', 'b', 'c', 'd', 'e'];
    for (let n = 0; n < 200; n += 1) {
      const out = shuffle(base);
      expect(out.slice().sort()).toEqual(base.slice().sort());
      expect(base).toEqual(['a', 'b', 'c', 'd', 'e']);
    }
  });

  it('still offers four options with the answer among them', () => {
    // the answer for a question index is the same region every round while the
    // distractors are redrawn, so the region present every time is the answer
    const sets = [];
    for (let i = 0; i < 12; i += 1) {
      resetStemLab();
      const tool = loadTool(FILE, 'brainAtlas');
      const store = newStore({ brainAtlas: { view: 'lateral', quizMode: true, quizIdx: 0 } });
      tool.render(makeCtx({}, store));
      sets.push((store.toolData.brainAtlas._brainQuizOpts || []).map((o) => o && o.id));
    }
    sets.forEach((set) => expect(set).toHaveLength(4));
    const counts = new Map();
    sets.forEach((set) => new Set(set).forEach((id) => counts.set(id, (counts.get(id) || 0) + 1)));
    const always = [...counts.entries()].filter(([, c]) => c === sets.length).map(([id]) => id);
    expect(always, 'no stable answer across rounds').toHaveLength(1);
    // and the distractors really do vary
    expect(counts.size).toBeGreaterThan(4);
  }, 30000);
});
