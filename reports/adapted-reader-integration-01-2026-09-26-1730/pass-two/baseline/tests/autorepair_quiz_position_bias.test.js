// autoRepair question banks — answer-position bias.
//
// Authored distributions were QUIZ 0/64/4/0 and DAMAGE_CASES 1/44/0/0: 108 of
// 113 correct answers sat in slot 2, slot 4 was never correct, and neither bank
// was shuffled — so the quiz could be scored by position instead of diagnosis.
// Both banks are now rotated once by a per-question offset.
//
// Keying for these banks (it differs across the catalog, so it is checked per
// tool before reordering):
//   correctness -> i === question.correct   (INDEX, so `correct` is remapped)
//   explanation -> a single `why` string / no per-option feedback array
//
// NOTE: `choices:` is a third option-array key in this repo (alongside
// `options:` and `a:`) and hid 68 of these questions from the first sweep;
// dev-tools/scan_answer_position_bias.cjs now covers it.
//
// Source-literal extraction rather than loadTool (large file), CRLF normalised.

import fs from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';

const SRC_PATH = 'stem_lab/stem_tool_autorepair.js';
let built;

function quizDist(bank) {
  const c = [0, 0, 0, 0];
  bank.forEach((q) => { if (Array.isArray(q.choices) && q.choices.length === 4) c[q.correct]++; });
  return c;
}
function caseDist(bank) {
  const c = [0, 0, 0, 0];
  bank.forEach((cs) => ['part', 'cause', 'sev'].forEach((k) => {
    const s = cs[k];
    if (s && Array.isArray(s.a) && s.a.length === 4) c[s.correct]++;
  }));
  return c;
}

beforeAll(() => {
  const src = fs.readFileSync(SRC_PATH, 'utf8').replace(/\r\n/g, '\n');
  const span = (a, b) => {
    const i = src.indexOf(a); const e = src.indexOf(b, i);
    if (i < 0 || e < 0) throw new Error('span failed: ' + a);
    return src.slice(i, e + b.length);
  };
  const hs = src.indexOf('  function arRotateChoices(');
  const he = src.indexOf('\n  }', src.indexOf('  function arRotateCaseBank('));
  if (hs < 0 || he < 0) throw new Error('autoRepair rotation helpers not found');
  built = new Function(
    span('  var DAMAGE_CASES = [', '\n  ];') + '\n' +
    span('  var QUIZ = [', '\n  ];') + '\n' +
    src.slice(hs, he + 4) + '\n' +
    'return { quizA: QUIZ, caseA: DAMAGE_CASES, quizR: arRotateQuizBank(QUIZ), caseR: arRotateCaseBank(DAMAGE_CASES) };'
  )();
});

describe('autoRepair — authored banks are position-biased', () => {
  it('documents the bias the rotation exists to fix', () => {
    const q = quizDist(built.quizA);
    const c = caseDist(built.caseA);
    const total = q.reduce((a, b) => a + b, 0) + c.reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(100);
    expect(q[3]).toBe(0);
    expect(c[3]).toBe(0);
    expect((q[1] + c[1]) / total).toBeGreaterThan(0.9);
  });
});

describe('autoRepair — rotation spreads answers without altering questions', () => {
  it('QUIZ: no dead slot, none dominant', () => {
    const d = quizDist(built.quizR);
    const total = d.reduce((a, b) => a + b, 0);
    for (let p = 0; p < 4; p++) expect(d[p], 'slot ' + p + ' of ' + d.join('/')).toBeGreaterThan(0);
    expect(Math.max(...d) / total).toBeLessThan(0.4);
  });

  it('DAMAGE_CASES: no dead slot, none dominant', () => {
    const d = caseDist(built.caseR);
    const total = d.reduce((a, b) => a + b, 0);
    for (let p = 0; p < 4; p++) expect(d[p], 'slot ' + p + ' of ' + d.join('/')).toBeGreaterThan(0);
    expect(Math.max(...d) / total).toBeLessThan(0.4);
  });

  it('QUIZ keeps its option set, answer TEXT and prose', () => {
    built.quizA.forEach((A, i) => {
      if (!Array.isArray(A.choices)) return;
      const R = built.quizR[i];
      expect(R.choices.slice().sort(), 'q' + i).toEqual(A.choices.slice().sort());
      expect(R.choices[R.correct], 'q' + i + ' answer text').toBe(A.choices[A.correct]);
      expect(R.why, 'q' + i + ' why').toBe(A.why);
      expect(R.stem, 'q' + i + ' stem').toBe(A.stem);
    });
  });

  it('DAMAGE_CASES keeps every sub-question intact', () => {
    built.caseA.forEach((A, i) => {
      const R = built.caseR[i];
      expect(R.id).toBe(A.id);
      expect(R.visual).toBe(A.visual);
      ['part', 'cause', 'sev'].forEach((k) => {
        if (!A[k] || !Array.isArray(A[k].a)) return;
        expect(R[k].a.slice().sort(), i + '.' + k).toEqual(A[k].a.slice().sort());
        expect(R[k].a[R[k].correct], i + '.' + k + ' answer text').toBe(A[k].a[A[k].correct]);
        expect(R[k].q, i + '.' + k + ' prompt').toBe(A[k].q);
      });
    });
  });

  it('does not mutate the authored banks', () => {
    const before = built.quizA[0].choices.slice();
    built.quizR[0];
    expect(built.quizA[0].choices).toEqual(before);
  });
});
