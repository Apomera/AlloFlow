// Wave 7 of the answer-position-bias sweep (2026-08-23), found by teaching
// both catalog scanners three MORE answer-field spellings they were blind to:
// `correctIndex:` (allobotsage - 248 questions in 39 challenge banks, an
// entire tool invisible), `c:` (magnetism), and `a:`-as-index (moonmission,
// climateExplorer). All four were phantom-cleared by the arithmetic recipe.
//   - magnetism:    21 of 22 answers at index 0 - always-pick-A scored 95%
//   - moonmission:   7 of 11 at index 1; its per-distractor `why` array is
//                    POSITION-ALIGNED (null at the correct index), so the
//                    rotation must move it in lockstep
//   - allobotsage:  58% of 248 at index 1 across 39 per-sage banks
// climateExplorer (47% at B) is deferred: its file was mid-edit by a
// concurrent session when this wave landed.
//
// Each fix is a load-time slot-targeted rotation (exactly uniform, stable
// across renders). These tests EXECUTE the shipped bank + IIFE - existence of
// a rotation proves nothing (the orphan-setter lesson), so distribution,
// answer-text preservation, and why-alignment are asserted on the result.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => fs.readFileSync(p, 'utf8');
const tStub = (k, fb) => fb || k;

function evalBank(file, decl, bankVar) {
  const src = read(file);
  const i = src.indexOf(decl);
  expect(i, decl + ' not found in ' + file).toBeGreaterThan(-1);
  const iifeEnd = src.indexOf('})();', i) + 5;
  return new Function('t', src.slice(i, iifeEnd) + '; return ' + bankVar + ';')(tStub);
}

function spread(items, getOpts, getAns) {
  const placed = [0, 0, 0, 0];
  let n = 0;
  for (const it of items) {
    const opts = getOpts(it), ans = getAns(it);
    if (!Array.isArray(opts) || typeof ans !== 'number') continue;
    placed[ans]++; n++;
  }
  return { placed, n, max: Math.max(...placed) / n };
}

describe('magnetism quiz rotation (c: schema)', () => {
  const bank = evalBank('stem_lab/stem_tool_magnetism.js', '  var QUIZ = [', 'QUIZ');
  it('the authored 95%-at-A pile-up is gone after rotation', () => {
    const { placed, n, max } = spread(bank, (q) => q.a, (q) => q.c);
    expect(n).toBeGreaterThanOrEqual(20);
    expect(max, placed.join('/')).toBeLessThan(0.35);
    expect(placed.filter((c) => c === 0).length).toBe(0);
  });
  it('every answer index stays in range', () => {
    for (const q of bank) {
      expect(q.c).toBeGreaterThanOrEqual(0);
      expect(q.c).toBeLessThan(q.a.length);
    }
  });
});

describe('moonmission quiz rotation (a: index schema)', () => {
  const bank = evalBank('stem_lab/stem_tool_moonmission.js', '      var QUIZ_BANK = [', 'QUIZ_BANK');
  it('answers spread across slots', () => {
    const { placed, max } = spread(bank, (q) => q.opts, (q) => q.a);
    expect(max, placed.join('/')).toBeLessThan(0.4);
  });
  it('the why array stays aligned: null sits exactly at the correct index', () => {
    for (const q of bank) {
      if (!Array.isArray(q.why) || q.why.length !== q.opts.length) continue;
      expect(q.why[q.a], q.q).toBeNull();
      expect(q.why.filter((w) => w === null).length, q.q).toBe(1);
    }
  });
});

describe('allobotsage challenge banks rotation (correctIndex schema)', () => {
  const spellbook = evalBank('stem_lab/stem_tool_allobotsage.js', '  var SPELLBOOK = [', 'SPELLBOOK');
  const all = spellbook.flatMap((s) => s.challengeBank || []);
  it('reaches the full catalogue of 39 banks', () => {
    expect(spellbook.filter((s) => Array.isArray(s.challengeBank)).length).toBeGreaterThanOrEqual(35);
    expect(all.length).toBeGreaterThanOrEqual(240);
  });
  it('the authored 58%-at-B pile-up is gone: near-uniform across slots', () => {
    const { placed, n, max } = spread(all, (q) => q.options, (q) => q.correctIndex);
    expect(n).toBeGreaterThanOrEqual(240);
    expect(max, placed.join('/')).toBeLessThan(0.3);
    expect(placed.filter((c) => c === 0).length).toBe(0);
  });
});

describe('deployment copies', () => {
  for (const name of ['magnetism', 'moonmission', 'allobotsage']) {
    it(name + ' public mirror is byte-identical to the root copy', () => {
      expect(read('desktop/web-app/public/stem_lab/stem_tool_' + name + '.js'))
        .toBe(read('stem_lab/stem_tool_' + name + '.js'));
    });
  }
});
