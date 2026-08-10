// cell (Micro World) quiz — answer-position bias.
//
// Every authored question in QUIZ_BANK lists its correct answer FIRST: measured
// 10/10 correct answers at slot 1, slots 2-4 never correct. The question is
// re-derived from quizIdx on every render, so the tool now applies a
// deterministic per-question rotation (a Math.random() shuffle there would deal
// new options under the student's cursor mid-question).
//
// The rotation must move wrongFeedback with the options: correctness compares
// option TEXT, but feedback is read positionally as wrongFeedback[selected].
//
// Source-literal extraction rather than loadTool — this file is ~1MB.

import fs from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';

const SRC_PATH = 'stem_lab/stem_tool_cell.js';
let rotate;
let bank;

beforeAll(() => {
  const src = fs.readFileSync(SRC_PATH, 'utf8');
  const fnStart = src.indexOf('function cellRotateQuizOptions');
  const fnEnd = src.indexOf('\n          }', fnStart);
  if (fnStart < 0) throw new Error('cellRotateQuizOptions not found');
  rotate = new Function(src.slice(fnStart, fnEnd + 12) + '; return cellRotateQuizOptions;')();

  bank = [];
  const re = /a:\s*'((?:[^'\\]|\\.)*)',\s*options:\s*\[([^\]]+)\]/g;
  let m;
  while ((m = re.exec(src))) {
    const opts = [];
    const ore = /'((?:[^'\\]|\\.)*)'/g;
    let o;
    while ((o = ore.exec(m[2]))) opts.push(o[1]);
    if (opts.length === 4) bank.push({ a: m[1], options: opts });
  }
});

describe('cell — quiz answer position', () => {
  it('finds the multiple-choice bank', () => {
    expect(bank.length).toBeGreaterThanOrEqual(10);
    for (const q of bank) expect(q.options).toContain(q.a);
  });

  it('rotation spreads correct answers across slots (authored bank is 100% slot 1)', () => {
    const authored = [0, 0, 0, 0];
    const rotated = [0, 0, 0, 0];
    bank.forEach((q, i) => {
      authored[q.options.indexOf(q.a)]++;
      rotated[rotate(q, i).options.indexOf(q.a)]++;
    });
    // the authored bias is real — this documents why the rotation exists
    expect(authored[0]).toBe(bank.length);
    // after rotation no slot may be dead, and none may dominate
    for (let p = 0; p < 4; p++) {
      expect(rotated[p], 'slot ' + p + ' of ' + rotated.join('/')).toBeGreaterThan(0);
    }
    expect(Math.max(...rotated) / bank.length).toBeLessThan(0.5);
  });

  it('keeps every option and never drops or duplicates the answer', () => {
    bank.forEach((q, i) => {
      const out = rotate(q, i);
      expect(out.options.slice().sort()).toEqual(q.options.slice().sort());
      expect(out.options.filter(o => o === q.a).length).toBe(1);
    });
  });

  it('moves positional wrongFeedback with its own option', () => {
    bank.forEach((q, i) => {
      const withFeedback = { a: q.a, options: q.options, wrongFeedback: ['f0', 'f1', 'f2', 'f3'] };
      const out = rotate(withFeedback, i);
      q.options.forEach((optText, origIdx) => {
        const newIdx = out.options.indexOf(optText);
        expect(out.wrongFeedback[newIdx], 'question ' + i + ' option ' + origIdx).toBe('f' + origIdx);
      });
    });
  });

  it('is stable across repeated derivations of the same question', () => {
    bank.forEach((q, i) => {
      expect(rotate(q, i).options).toEqual(rotate(q, i).options);
    });
  });

  it('does not mutate the authored bank', () => {
    const q = bank[1];
    const snapshot = q.options.slice();
    rotate(q, 1);
    expect(q.options).toEqual(snapshot);
  });
});
