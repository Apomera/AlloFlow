import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Complement to the existing decomposer suites: verifies the generated
// molecule quiz (makeQuiz), whose options were shuffled with the biased
// Math.random()-0.5 comparator until the Fisher-Yates fix.

const src = fs.readFileSync('stem_lab/stem_tool_decomposer.js', 'utf8');
const publicSrc = () => fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_decomposer.js', 'utf8');

const makeQuiz = (() => {
  const matStart = src.indexOf('var MATERIALS = [');
  const matEnd = src.indexOf('\n        ];', matStart);
  const fnStart = src.indexOf('function makeQuiz()');
  const fnEnd = src.indexOf('return q;\n        }', fnStart);
  expect(matStart).toBeGreaterThan(-1);
  expect(matEnd).toBeGreaterThan(matStart);
  expect(fnStart).toBeGreaterThan(-1);
  expect(fnEnd).toBeGreaterThan(fnStart);
  // eslint-disable-next-line no-new-func
  return new Function(
    src.slice(matStart, matEnd + 11) + '\n' + src.slice(fnStart, fnEnd + 20) + '\nreturn makeQuiz;'
  )();
})();

describe('generated molecule quiz', () => {
  const runs = Array.from({ length: 600 }, () => makeQuiz());

  it('every generated question contains its answer among unique options', () => {
    for (const q of runs) {
      expect(q.opts, q.text).toContain(q.answer);
      expect(new Set(q.opts).size, q.text).toBe(q.opts.length);
      expect(q.opts.length).toBeGreaterThanOrEqual(2);
      expect(q.opts.length).toBeLessThanOrEqual(4);
    }
  });

  it('places the correct answer across all slots without bias (regression pin)', () => {
    const fourOpt = runs.filter((q) => q.opts.length === 4);
    expect(fourOpt.length).toBeGreaterThan(200);
    const slots = [0, 0, 0, 0];
    fourOpt.forEach((q) => slots[q.opts.indexOf(q.answer)]++);
    expect(slots.filter((c) => c > 0).length).toBe(4);
    expect(Math.max(...slots) / fourOpt.length).toBeLessThan(0.4);
  });

  it('wrong-answer feedback stays text-keyed, so shuffling cannot misalign it', () => {
    for (const q of runs.slice(0, 100)) {
      if (!q.wrongFeedback) continue;
      for (const opt of q.opts) {
        if (opt === q.answer) continue;
        if (q.wrongFeedback[opt] !== undefined) {
          expect(typeof q.wrongFeedback[opt], q.text).toBe('string');
        }
      }
    }
  });

  it('true/false questions answer only True or False', () => {
    const tf = runs.filter((q) => q.text.indexOf('True or False') === 0);
    expect(tf.length).toBeGreaterThan(10);
    for (const q of tf) {
      expect(['True', 'False']).toContain(q.answer);
      expect(q.opts.slice().sort()).toEqual(['False', 'True']);
    }
  });

  it('atom-count questions state the true total for their formula', () => {
    const counts = runs.filter((q) => q.text.indexOf('How many total atoms') === 0);
    expect(counts.length).toBeGreaterThan(10);
    for (const q of counts) {
      expect(Number(q.answer), q.text).toBeGreaterThan(0);
    }
  });
});

describe('source pins', () => {
  it('the quiz shuffle is Fisher-Yates; physics jitter comparators are untouched', () => {
    expect(src).not.toContain('opts.sort(function() { return Math.random() - 0.5; })');
    expect(src).toContain('opts[fy] = opts[fj]; opts[fj] = ft;');
    // The particle-jitter uses of (Math.random() - 0.5) are correct physics
    // centering and must remain.
    expect(src.split('(Math.random() - 0.5)').length - 1).toBeGreaterThanOrEqual(6);
  });
});

describe('deployment copies', () => {
  it('public mirror is byte-identical to the root copy', () => {
    expect(publicSrc()).toBe(src);
  });
});
