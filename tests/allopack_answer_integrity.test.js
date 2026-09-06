// Answer-key integrity for every quiz in the catalog.
//
// The shape suite already checks that `correctAnswer` is byte-identical to SOME option. That is
// not enough. If two options are the same string, or if the correct answer matches more than one,
// the item is unanswerable: a student can pick a correct string and be marked wrong, which is the
// worst failure a pack can have because it punishes the student who understood.
//
// None of this can tell you whether the key is TRUE — only a human reading it against the world
// can do that, and that was done by hand on 2026-09-06 (38 math answers verified arithmetically,
// 190 multiple-choice items reviewed, all correct). What this file holds is the part a machine
// can keep holding for free.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve(process.cwd(), 'allopacks');
const files = readdirSync(dir).filter((f) => f.endsWith('.allopack.json'));
const load = (f) => JSON.parse(readFileSync(resolve(dir, f), 'utf8').replace(/^﻿/, ''));

describe.each(files)('answer integrity: %s', (file) => {
  const quiz = load(file).history.find((r) => r.type === 'quiz');

  it('no multiple-choice item repeats an option', () => {
    if (!quiz) return;
    for (const q of quiz.data.questions.filter((x) => x.type === 'mcq')) {
      const norm = q.options.map((o) => o.trim().toLowerCase());
      const dupes = [...new Set(norm.filter((o, i) => norm.indexOf(o) !== i))];
      expect(dupes, 'repeated option in "' + q.question + '": ' + dupes.join(' | ')).toEqual([]);
    }
  });

  it('the correct answer matches exactly one option', () => {
    if (!quiz) return;
    for (const q of quiz.data.questions.filter((x) => x.type === 'mcq')) {
      const hits = q.options.filter((o) => o === q.correctAnswer).length;
      expect(hits, '"' + q.question + '" has ' + hits + ' options equal to its correct answer').toBe(1);
    }
  });

  it('every short-answer item carries a usable expected answer', () => {
    if (!quiz) return;
    for (const q of quiz.data.questions.filter((x) => x.type === 'shortAnswer')) {
      // A teacher grades against this. A stub is worse than nothing, because it looks done.
      expect(String(q.expectedAnswer || '').trim().length,
        'thin expectedAnswer for "' + q.question + '"').toBeGreaterThan(20);
    }
  });

  it('math problems state an answer and show their working', () => {
    const math = load(file).history.find((r) => r.type === 'math');
    if (!math) return;
    for (const p of math.data.problems) {
      expect(String(p.answer || '').trim().length, 'empty answer for "' + p.question + '"').toBeGreaterThan(0);
      expect(p.steps.length, 'no worked steps for "' + p.question + '"').toBeGreaterThanOrEqual(2);
      for (const s of p.steps) {
        expect(String(s.explanation || '').trim().length, 'empty step in "' + p.question + '"').toBeGreaterThan(10);
      }
    }
  });
});
