// Dino Lab — the anatomy tab told learners they were detectives, then gave
// them six cards to read.
//
// Every ANATOMY entry already pairs a fossil type with what it TELLS you, so
// the detecting was one step away: hide the pairing and ask. The tab now opens
// with "Read the evidence" — a question quoting what some fossil reveals, and
// six choices for which fossil that is.
//
// Deliberately unscored and untimed. The point is to make a student commit
// before the card confirms it, not to grade them on six facts.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');

function anatomyEntries() {
  const open = SRC.indexOf('var ANATOMY = [');
  expect(open, 'ANATOMY not found').toBeGreaterThan(-1);
  const close = SRC.indexOf('\n  ];', open);
  const block = SRC.slice(open, close);
  return [...block.matchAll(/\{ id: '([a-z]+)', icon: '([^']+)', name: '([^']+)'/g)]
    .map((m) => ({ id: m[1], icon: m[2], name: m[3] }));
}

describe('the anatomy tab asks before it tells', () => {
  it('has an evidence challenge at all', () => {
    expect(SRC).toContain('Read the evidence');
    expect(SRC).toContain('var evQ = ANATOMY[modIndex(d.evidenceIdx, ANATOMY.length)]');
  });

  it('asks the question from the data, not from a second copy of it', () => {
    // The prompt quotes evQ.tells and the feedback uses evQ.what. If either
    // were retyped here, the activity could drift from the cards below it and
    // teach two different things on one screen.
    expect(SRC).toMatch(/evQ\.tells/);
    expect(SRC).toMatch(/evQ\.what/);
    expect(SRC).toMatch(/evQ\.name/);
  });

  it('offers every fossil type as a choice', () => {
    // A challenge with three options out of six would leak the answer.
    expect(SRC).toContain('var evChoices = ANATOMY.map(function (a) { return a.id; })');
    expect(anatomyEntries().length).toBeGreaterThanOrEqual(5);
  });

  it('locks in the answer instead of letting a learner retry until right', () => {
    // Committing is the whole mechanism; a free retry turns it back into
    // reading with extra steps.
    expect(SRC).toContain('if (evAnswered) return;');
  });

  it('names the right answer even when the learner missed it', () => {
    // "wrong" with no correction teaches nothing.
    expect(SRC).toMatch(/is the one that answers it/);
  });

  it('marks state in the accessible name, not only in colour', () => {
    // The green/amber backgrounds are the visual channel; these are the other
    // one. WCAG 1.4.1.
    expect(SRC).toContain("'. Correct answer.'");
    expect(SRC).toContain("'. You chose this. Not the best fit.'");
    expect(SRC).toContain("'. Choose this fossil.'");
  });

  it('keeps answered choices focusable rather than disabling them', () => {
    // `disabled` would drop the buttons out of the tab order at exactly the
    // moment a screen reader user wants to read the result.
    expect(SRC).toContain("'aria-disabled': evAnswered ? 'true' : undefined");
    expect(SRC).not.toMatch(/disabled: evAnswered/);
  });

  it('lets the learner move to another find', () => {
    expect(SRC).toContain('function evNext()');
    expect(SRC).toMatch(/Next find/);
  });

  it('wraps around instead of running out', () => {
    expect(SRC).toContain('% ANATOMY.length');
  });

  it('does not keep a score', () => {
    // There is a graded quiz tab already. This one is a thinking prompt, and
    // scoring it would change what it is for.
    const open = SRC.indexOf('var evQ = ANATOMY[');
    const block = SRC.slice(open, SRC.indexOf('return el(\'div\', null, sectionTitle', open));
    expect(block).not.toMatch(/evidenceCorrect|evidenceScore|correctCount/);
  });
});
