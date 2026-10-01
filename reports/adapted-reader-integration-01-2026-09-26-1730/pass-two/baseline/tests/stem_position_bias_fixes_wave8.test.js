// Wave 8 of the answer-position-bias sweep (2026-08-23): climateExplorer,
// deferred from wave 7 because its file was mid-edit by a concurrent session.
//
// The bank uses `a:` as its answer INDEX, a spelling both catalog scanners
// were blind to until wave 7; once visible, 27 of its 30 four-option answers
// sat at B or C and the file had been phantom-cleared on arithmetic. A
// load-time slot rotation now spreads the 40 questions 12/10/10/8. Grading
// is `oi === q.a` (index), so the rotation remaps `a` in lockstep.
//
// Executes the SHIPPED bank + IIFE - the existence of a rotation proves
// nothing on its own (the orphan-setter lesson).
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p) => fs.readFileSync(p, 'utf8');

function evalBank() {
  const src = read('stem_lab/stem_tool_climateExplorer.js');
  const i = src.indexOf('      var QUIZ = [');
  expect(i).toBeGreaterThan(-1);
  const iifeEnd = src.indexOf('})();', i) + 5;
  return new Function('t', src.slice(i, iifeEnd) + '; return QUIZ;')((k, fb) => fb || k);
}

describe('climateExplorer quiz rotation (a: index schema)', () => {
  const bank = evalBank();

  it('reaches the whole bank and keeps every index in range', () => {
    expect(bank.length).toBeGreaterThanOrEqual(38);
    for (const q of bank) {
      expect(q.a, q.q).toBeGreaterThanOrEqual(0);
      expect(q.a, q.q).toBeLessThan(q.opts.length);
    }
  });

  it('the authored B/C pile-up is gone: no slot above 35%, no dead slot among four-option items', () => {
    const placed = [0, 0, 0, 0];
    let four = 0;
    for (const q of bank) {
      if (q.opts.length !== 4) continue;
      placed[q.a]++; four++;
    }
    expect(four).toBeGreaterThanOrEqual(20);
    expect(Math.max(...placed) / four, placed.join('/')).toBeLessThan(0.35);
    expect(placed.filter((c) => c === 0).length).toBe(0);
  });

  it('the rotation is applied to the bank the tool grades against', () => {
    const src = read('stem_lab/stem_tool_climateExplorer.js');
    expect(src).toContain('QUIZ.forEach(function (item) {');
    expect(src).toContain('var isCorrect = oi === q.a;');
  });

  it('public mirror is byte-identical to the root copy', () => {
    expect(read('desktop/web-app/public/stem_lab/stem_tool_climateExplorer.js'))
      .toBe(read('stem_lab/stem_tool_climateExplorer.js'));
  });
});
