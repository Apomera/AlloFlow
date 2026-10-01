import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Complement to stem_bikelab_accessibility.test.js: verifies the safety-quiz
// bank and pins the Fisher-Yates fix on the reaction-game scenario sampler.

const src = fs.readFileSync('stem_lab/stem_tool_bikelab.js', 'utf8');
const publicSrc = () => fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_bikelab.js', 'utf8');

const QUESTIONS = (() => {
  const start = src.indexOf('var QUESTIONS = [');
  const end = src.indexOf('];', start);
  expect(start).toBeGreaterThan(-1);
  // eslint-disable-next-line no-new-func
  return new Function('t', src.slice(start, end + 2) + '\nreturn QUESTIONS;')((k, fb) => fb);
})();

describe('safety quiz bank', () => {
  it('every question has exactly one correct choice with unique labels', () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(9);
    for (const q of QUESTIONS) {
      const correct = q.choices.filter((c) => c.correct);
      expect(correct.length, q.q).toBe(1);
      const labels = q.choices.map((c) => c.label);
      expect(new Set(labels).size, q.q).toBe(labels.length);
      expect(q.explain.length, q.q).toBeGreaterThan(20);
    }
  });

  it('correct answers occupy at least two distinct positions', () => {
    const positions = new Set(QUESTIONS.map((q) => q.choices.findIndex((c) => c.correct)));
    expect(positions.size).toBeGreaterThanOrEqual(2);
  });

  it('hand-signal answers match the US convention', () => {
    const byQ = (needle) => QUESTIONS.find((q) => q.q.includes(needle));
    const correctOf = (q) => q.choices.find((c) => c.correct).label;
    expect(correctOf(byQ('LEFT'))).toContain('straight out');
    expect(correctOf(byQ('RIGHT'))).toContain('bent up');
    expect(correctOf(byQ('slowing or stopping'))).toContain('down');
  });
});

describe('scenario sampler (source pins)', () => {
  it('uses Fisher-Yates, not the biased comparator', () => {
    expect(src).not.toContain('Math.random() - 0.5');
    expect(src).toContain('var pool = SCENARIOS.slice();');
    expect(src).toContain('pool[fy] = pool[fj]; pool[fj] = ft;');
  });
});

describe('deployment copies', () => {
  it('public mirror is byte-identical to the root copy', () => {
    expect(publicSrc()).toBe(src);
  });
});
