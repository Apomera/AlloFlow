import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Quiz-bank verification for Dino Lab and Evo Lab, whose authored banks
// stacked correct answers on option B (25/34 and 9/12 respectively) until the
// deterministic rotations were added.

const dino = fs.readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');
const evo = fs.readFileSync('stem_lab/stem_tool_evolab.js', 'utf8');
const pub = (f) => fs.readFileSync('desktop/web-app/public/stem_lab/' + f, 'utf8');

function loadDino(withRotation) {
  const start = dino.indexOf('var QUIZ = [');
  const end = dino.indexOf(withRotation ? '// ── Paleontology glossary ──' : '// The authored bank put 25 of 34', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function(dino.slice(start, end) + '\nreturn QUIZ;')();
}

function loadEvo(withRotation) {
  const start = evo.indexOf('var QUESTIONS = [', evo.indexOf('function MisconceptionsQuiz()'));
  const end = evo.indexOf(withRotation ? 'var ROUND_COUNT = QUESTIONS.length;' : "// The authored bank put 9 of 12", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function('t', evo.slice(start, end) + '\nreturn QUESTIONS;')((k, fb) => fb);
}

describe('Dino Lab quiz rotation', () => {
  const raw = loadDino(false);
  const rotated = loadDino(true);

  it('the authored bank stacked 25 of 34 answers on B (the tell)', () => {
    const slots = [0, 0, 0, 0];
    raw.forEach((q) => slots[q.answer]++);
    expect(slots[1]).toBeGreaterThanOrEqual(25);
    expect(slots[3]).toBe(0);
  });

  it('rotation spreads answers across all four slots and preserves answer text', () => {
    const slots = [0, 0, 0, 0];
    rotated.forEach((q) => slots[q.answer]++);
    expect(slots.filter((c) => c > 0).length).toBe(4);
    expect(Math.max(...slots)).toBeLessThanOrEqual(12);
    rotated.forEach((q, i) => {
      expect(q.options[q.answer], q.id).toBe(raw[i].options[raw[i].answer]);
      expect(q.options.slice().sort()).toEqual(raw[i].options.slice().sort());
    });
  });

  it('every question is well-formed and key science answers hold', () => {
    for (const q of rotated) {
      expect(q.options.length, q.id).toBe(4);
      expect(new Set(q.options).size, q.id).toBe(4);
      expect(q.explain.length, q.id).toBeGreaterThan(30);
    }
    const byId = Object.fromEntries(rotated.map((q) => [q.id, q]));
    expect(byId.q1.options[byId.q1.answer]).toBe('Birds');
    expect(byId.q3.options[byId.q3.answer]).toBe('Pteranodon');
    expect(byId.q7.options[byId.q7.answer]).toBe('Us, today');
  });
});

describe('Evo Lab misconceptions quiz rotation', () => {
  const raw = loadEvo(false);
  const rotated = loadEvo(true);

  it('the authored bank put 9 of 12 correct choices at b, none at a (the tell)', () => {
    const ids = raw.map((q) => (q.choices.find((c) => c.correct) || {}).id);
    expect(ids.filter((id) => id === 'b').length).toBeGreaterThanOrEqual(9);
    expect(ids.filter((id) => id === 'a').length).toBe(0);
  });

  it('rotation spreads correct choices across positions, preserving each set and single correct', () => {
    const positions = rotated.map((q) => q.choices.findIndex((c) => c.correct));
    expect(new Set(positions).size).toBeGreaterThanOrEqual(3);
    rotated.forEach((q, i) => {
      const correct = q.choices.filter((c) => c.correct);
      expect(correct.length, 'q' + i).toBe(1);
      expect(correct[0].id).toBe(raw[i].choices.find((c) => c.correct).id);
      expect(q.choices.map((c) => c.id).slice().sort()).toEqual(raw[i].choices.map((c) => c.id).slice().sort());
    });
  });

  it('the science-of-science answers hold', () => {
    const correctOf = (needle) => {
      const q = rotated.find((qq) => qq.q.includes(needle));
      return q.choices.find((c) => c.correct).label;
    };
    expect(correctOf('just a theory')).toContain('well-tested explanation');
    expect(correctOf('mutations')).toMatch(/random|neutral/i);
  });
});

describe('deployment copies', () => {
  it('public mirrors are byte-identical to the root copies', () => {
    expect(pub('stem_tool_dinolab.js')).toBe(dino);
    expect(pub('stem_tool_evolab.js')).toBe(evo);
  });
});
