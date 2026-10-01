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

describe('cell — EXTRA_QUIZ wiring', () => {
  // EXTRA_QUIZ held 200 authored questions and was referenced nowhere, while the
  // live bank had 20. The two use different field names (question/correctAnswer
  // vs q/a), and this quiz grades by TEXT, case-insensitively:
  //     opt.toLowerCase() === quizQuestion.a.toLowerCase()
  // so a mismapped answer produces a question where every choice is wrong.
  // Evaluate the real literals and the real append rather than trusting either.
  let liveBank;

  beforeAll(async () => {
    const { runInNewContext } = await import('node:vm');
    const src = fs.readFileSync(SRC_PATH, 'utf8');
    const slice = (from, to) => {
      const i = src.indexOf(from);
      if (i < 0) throw new Error('missing marker: ' + from);
      const j = src.indexOf(to, i);
      return src.slice(i, j + to.length);
    };
    const program = [
      slice('var EXTRA_QUIZ = [', '\n          ];'),
      slice('var QUIZ_BANK = [', '\n          ];'),
      slice('Array.prototype.push.apply(QUIZ_BANK, EXTRA_QUIZ.map(', '.filter(Boolean));')
    ].join('\n');
    liveBank = runInNewContext('(function(){ ' + program + '; return QUIZ_BANK; })()',
      { Math, Number, Array, Object, String, isFinite });
  });

  it('adds the dormant bank to the live one', () => {
    const wired = liveBank.filter(q => q.explanation);
    expect(wired.length, 'all 200 dormant questions should be wired in').toBe(200);
    expect(liveBank.length).toBe(220);
  });

  it('leaves every multiple-choice question answerable', () => {
    liveBank.forEach(q => {
      if (!Array.isArray(q.options)) return;   // organism-spotter entries have none
      const matches = q.options.filter(o => String(o).toLowerCase() === String(q.a).toLowerCase());
      expect(matches.length, `"${String(q.q).slice(0, 60)}" must have exactly one correct option`).toBe(1);
    });
  });

  it('spreads the wired answers across slots once rotated', () => {
    // Every authored question puts its answer first, the wired ones included,
    // so the rotation is what keeps the quiz from being passable by position.
    const counts = [0, 0, 0, 0];
    liveBank.forEach((q, i) => {
      if (!Array.isArray(q.options) || q.options.length !== 4) return;
      const shown = rotate(q, i);
      counts[shown.options.findIndex(o => String(o).toLowerCase() === String(shown.a).toLowerCase())]++;
    });
    const total = counts.reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(200);
    counts.forEach((n, p) => expect(n, `slot ${p} of ${counts.join('/')}`).toBeGreaterThan(0));
    expect(Math.max(...counts) / total).toBeLessThan(0.4);
  });
});
