// companionPlanting GARDEN_SCENARIOS — answer-position bias.
//
// Authored distribution was 2/8/0/0: 80% of correct answers in slot 2 and slots
// 3 and 4 never correct, with no shuffle, so the scenario quiz was guessable by
// position. The tool now rotates each scenario by a per-question offset.
//
// Keying for this bank (verify per tool — it differs across the catalog):
//   correctness -> oi === sc.correct        (INDEX, so `correct` is remapped)
//   feedback    -> sc.explain               (ONE string per scenario, not
//                                            per-option, so nothing to reorder)
//
// Applied once to the bank rather than per render: the active scenario is
// re-read as GARDEN_SCENARIOS[gardenScenarioIdx] every render, so a render-time
// Math.random() would deal new options mid-question.
//
// Source-literal extraction (large file); CRLF normalised because line endings
// vary per file in this repo.

import fs from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';

const SRC_PATH = 'stem_lab/stem_tool_companionplanting.js';
let built;

function dist(arr) {
  const c = [0, 0, 0, 0];
  arr.forEach((q) => { if (q.options && q.options.length === 4) c[q.correct]++; });
  return c;
}

beforeAll(() => {
  const src = fs.readFileSync(SRC_PATH, 'utf8').replace(/\r\n/g, '\n');
  const ls = src.indexOf('          var GARDEN_SCENARIOS = [');
  const le = src.indexOf('\n          ];', ls);
  const hs = src.indexOf('          function cgRotateScenario(sc, seedIdx) {');
  const he = src.indexOf('\n          }', hs);
  if (ls < 0 || hs < 0) throw new Error('companionPlanting source markers not found');
  built = new Function(
    '  var __alloT = function (k, fb) { return fb == null ? k : fb; };\n' +
    src.slice(ls, le + 13) + '\n' +
    src.slice(hs, he + 12) + '\n' +
    'return { authored: GARDEN_SCENARIOS, rotated: GARDEN_SCENARIOS.map(cgRotateScenario), rotate: cgRotateScenario };'
  )();
});

describe('companionPlanting — garden scenarios', () => {
  it('documents the authored bias: 80% slot 2, slots 3 and 4 dead', () => {
    const d = dist(built.authored);
    expect(built.authored.length).toBeGreaterThanOrEqual(10);
    expect(d[2]).toBe(0);
    expect(d[3]).toBe(0);
    expect(d[1] / built.authored.length).toBeGreaterThanOrEqual(0.7);
  });

  it('rotation leaves no dead slot and no dominant slot', () => {
    const d = dist(built.rotated);
    for (let p = 0; p < 4; p++) {
      expect(d[p], 'slot ' + p + ' of ' + d.join('/')).toBeGreaterThan(0);
    }
    expect(Math.max(...d) / built.rotated.length).toBeLessThan(0.5);
  });

  it('preserves the option set and the correct-answer TEXT', () => {
    built.authored.forEach((A, i) => {
      const R = built.rotated[i];
      expect(R.options.slice().sort(), 'scenario ' + i).toEqual(A.options.slice().sort());
      expect(R.options[R.correct], 'scenario ' + i + ' answer text').toBe(A.options[A.correct]);
    });
  });

  it('leaves the scenario prose and identity untouched', () => {
    built.authored.forEach((A, i) => {
      const R = built.rotated[i];
      expect(R.explain, 'scenario ' + i).toBe(A.explain);
      expect(R.id, 'scenario ' + i).toBe(A.id);
      expect(R.scenario, 'scenario ' + i).toBe(A.scenario);
    });
  });

  it('is deterministic and does not mutate the authored bank', () => {
    const A = built.authored[0];
    const before = A.options.slice();
    expect(built.rotate(A, 0).options).toEqual(built.rotate(A, 0).options);
    expect(A.options).toEqual(before);
  });
});
