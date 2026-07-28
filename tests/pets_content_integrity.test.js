// Pets Lab — scientific-integrity invariants.
//
// This tool is heavily and well cited, which is exactly why the few
// weakly-sourced numbers in it were dangerous: they read with the same
// authority as the AVMA/CDC-backed material around them. These tests pin
// the HEDGES, not the wording, so the prose can be rewritten freely but a
// contested figure can't quietly return as a bare fact.
//
// Pattern follows the worldbuilder-penmanship overclaim invariant: assert on
// source content, because these strings live in sub-views SSR can't reach.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(
  path.resolve(process.cwd(), 'stem_lab/stem_tool_pets.js'),
  'utf8'
);

/** Text within `window` chars either side of each occurrence of `needle`. */
function contextsAround(needle, window = 700) {
  const out = [];
  let i = SRC.indexOf(needle);
  while (i !== -1) {
    out.push(SRC.slice(Math.max(0, i - window), i + needle.length + window));
    i = SRC.indexOf(needle, i + needle.length);
  }
  return out;
}

const HEDGE = /shakier|rough|not seriously disputed|advocacy|feral-colony|unowned|trivia rather than data|wide range|be careful|treat it as|treat the direction/i;

describe('Pets Lab — contested figures stay hedged', () => {
  it('the outdoor-cat lifespan figure is never stated as a bare fact', () => {
    // The "2-5 years outdoors" number leans on feral-colony data, not owned
    // cats. Every place it appears must acknowledge that. Scoped to the
    // cat-lifespan claim so unrelated 2-5 ranges (service-dog waitlists,
    // hamster years) don't trip it.
    const claims = [...SRC.matchAll(/[^\n]*\b(?:outdoor|indoor)[^\n]*2–5[^\n]*/gi)].map((m) => m[0]);
    expect(claims.length).toBeGreaterThan(0);
    for (const c of claims) {
      expect(c, 'an unhedged "2-5 years" outdoor-cat claim is present').toMatch(HEDGE);
    }
  });

  it('does not claim a precise indoor:outdoor lifespan multiplier', () => {
    // "3-4x longer" was the overclaim; the direction is sound, the
    // multiplier is not measured.
    expect(SRC).not.toMatch(/3–4× longer/);
    expect(SRC).not.toMatch(/live ~?3–4× LONGER/i);
  });

  it('cites the Loss et al. predation estimate as a range, not just a midpoint', () => {
    // "2.4 billion", not the WCAG 2.4.7 reference in the stylesheet block.
    const ctxs = [...contextsAround('2.4 billion'), ...contextsAround('2.4 BILLION')];
    expect(ctxs.length).toBeGreaterThan(0);
    for (const c of ctxs) {
      // Wherever the 2.4-billion midpoint appears it must sit next to the
      // published range (1.3-4 billion) or be explicitly called a midpoint.
      expect(c, 'the 2.4-billion midpoint is quoted without its range').toMatch(
        /1\.3–4|midpoint/i
      );
    }
  });

  it('attributes most free-roaming predation to unowned cats', () => {
    // Loss et al. attribute the majority to un-owned cats; presenting the
    // total as pet-owner impact overstates what keeping YOUR cat in achieves.
    const ctxs = contextsAround('billion');
    const mentionsUnowned = ctxs.some((c) => /unowned|feral|stray/i.test(c));
    expect(mentionsUnowned).toBe(true);
  });

  it('flags bite-force PSI numbers as television trivia, not measurement', () => {
    if (!SRC.includes('PSI')) return; // fine to drop them entirely
    for (const c of contextsAround('PSI')) {
      expect(c, 'PSI figures presented without a sourcing caveat').toMatch(
        /television|TV |not a controlled study|trivia/i
      );
    }
  });

  it('keeps the load-bearing pit-bull claims that ARE well supported', () => {
    // Hedging the PSI trivia must not soften the anatomy or the
    // breed-vs-individual point, which are the parts that matter.
    expect(SRC).toMatch(/no dog breed has a jaw-locking mechanism/i);
    expect(SRC).toMatch(/individual than breed-determined/i);
  });
});

describe('Pets Lab — the quiz agrees with the reference material', () => {
  it('the outdoor-cat quiz answer does not assert the precise multiplier', () => {
    const i = SRC.indexOf("stem: 'A friend says \"outdoor cats are happier");
    expect(i).toBeGreaterThan(-1);
    const item = SRC.slice(i, i + 1800);
    expect(item).toMatch(/substantially longer/i);
    expect(item).not.toMatch(/12–18 yr vs 2–5 yr/);
    // ...and still explains WHY the answer is right.
    expect(item).toMatch(/traffic|predators|disease/i);
  });

  it('every quiz item still has a rationale', () => {
    const start = SRC.indexOf('var QUIZ = [');
    // Search forward from `start`: `function renderQuizMode` appears EARLIER
    // in the file, so an unanchored search sliced backwards and matched zero.
    const end = SRC.indexOf('function renderQuiz(', start);
    const quizSrc = SRC.slice(start, end);
    const stems = (quizSrc.match(/\bstem:/g) || []).length;
    const whys = (quizSrc.match(/\bwhy:/g) || []).length;
    expect(stems).toBeGreaterThanOrEqual(15);
    expect(whys).toBe(stems);
  });
});
