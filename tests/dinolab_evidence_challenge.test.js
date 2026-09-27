// Optional matching practice shares its descriptions with the fossil atlas.
// It remains unscored and explains both the match and its limits.
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

describe('optional fossil matching practice', () => {
  it('has an evidence challenge at all', () => {
    expect(SRC).toContain('Read the evidence');
    expect(SRC).toContain('var evQ = ANATOMY[modIndex(d.evidenceIdx, ANATOMY.length)]');
  });

  it('asks the question from the data, not from a second copy of it', () => {
    // Both views resolve the same data and translation keys.
    for (const field of ['tells', 'what', 'name', 'limit']) expect(SRC).toContain("fossilText(evQ, '" + field + "')");
  });

  it('offers every fossil type as a choice', () => {
    // Every fossil type remains available for comparison.
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
    expect(SRC).toMatch(/is the best match here/);
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
    const block = SRC.slice(open, SRC.indexOf('function renderSites()', open));
    expect(block).not.toMatch(/evidenceCorrect|evidenceScore|correctCount/);
  });
});
