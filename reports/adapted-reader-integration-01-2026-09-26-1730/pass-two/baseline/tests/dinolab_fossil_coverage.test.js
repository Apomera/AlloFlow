// Dino Lab grades every reconstruction by how much fossil there actually is -
// limited / moderate / strong - and then printed that grade as plain grey body
// text, styled identically for all three. A student comparing a well-known
// animal with a highly speculative one got no visual signal at all, in a tool
// whose whole argument is "look at the evidence".
//
// Adding the grade to the chip row exposed a real bug behind it: the
// classifier tested LIMITED before STRONG, so T. rex - "Dozens of partial
// skeletons" - matched both patterns and was graded LIMITED, because the
// strong signal was thrown away.
//
// Reordering alone would have mis-rescued Ankylosaurus, whose text says "no
// single COMPLETE SKELETON is known" - a negation the strong pattern reads as
// a positive. That one genuinely is limited.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');

// Run the SHIPPED classifier, not a retyped copy.
function grader() {
  const open = SRC.indexOf('var evidence = String((dn && dn.howKnow)');
  expect(open, 'the coverage classifier was not found').toBeGreaterThan(-1);
  const close = SRC.indexOf('return profile;', open);
  // eslint-disable-next-line no-new-func
  return new Function('dn', 'var profile = {};\n' + SRC.slice(open, close) + '\nreturn profile.coverage;');
}

function catalog() {
  const starts = [...SRC.matchAll(/id: '([a-z0-9_]+)', name: '([^']+)', common: '([^']+)',/g)]
    .map((m) => ({ i: m.index, common: m[3] }));
  expect(starts.length).toBeGreaterThan(300);
  return starts.map((st, k) => {
    // Bound by the NEXT entry - a fixed window bleeds into the following record.
    const end = k + 1 < starts.length ? starts[k + 1].i : st.i + 1500;
    const b = SRC.slice(st.i, end);
    return { common: st.common, howKnow: (b.match(/howKnow: '([^']*)'/) || [])[1] || '' };
  });
}

describe('the coverage grade matches the evidence text', () => {
  it('calls dozens of partial skeletons strong, not sparse', () => {
    // The original bug, stated as the claim it got wrong.
    const g = grader();
    expect(g({ howKnow: 'Dozens of partial skeletons, including "Sue" and "Stan".' })).toBe('strong');
  });

  it('does not read a NEGATED completeness claim as strong', () => {
    // "no single complete skeleton is known" is limited evidence, however the
    // words "complete skeleton" appear in it.
    const g = grader();
    expect(g({ howKnow: 'Skulls, armor, and tail clubs, though no single complete skeleton is known.' }))
      .toBe('limited');
    expect(g({ howKnow: 'No complete skeleton has ever been found; known from fragments.' }))
      .toBe('limited');
  });

  it('still grades genuinely sparse evidence as limited', () => {
    const g = grader();
    expect(g({ howKnow: 'A handful of fragments scaled from relatives.' })).toBe('limited');
    expect(g({ howKnow: 'Known from just a partial jaw.' })).toBe('limited');
  });

  it('still grades genuinely rich evidence as strong', () => {
    const g = grader();
    expect(g({ howKnow: 'Abundant skulls and skeletons across the American West.' })).toBe('strong');
    expect(g({ howKnow: 'Many skeletons from the Morrison Formation.' })).toBe('strong');
  });

  it('falls back to moderate when neither signal is present', () => {
    const g = grader();
    expect(g({ howKnow: 'Snout and tail material from Morocco.' })).toBe('moderate');
    expect(g({ howKnow: '' })).toBe('moderate');
  });

  it('leaves no species whose text says abundant but grades sparse', () => {
    // The sweep that found the bug. Catches the NEXT entry written this way.
    const g = grader();
    const STRONG = /abundant|hundreds|dozens|many skeletons|multiple skeletons|several good/;
    const NEGATED = /no (single )?complete skeleton|no complete|never found a complete/;
    const wrong = catalog()
      .filter((d) => STRONG.test(d.howKnow.toLowerCase()))
      .filter((d) => !NEGATED.test(d.howKnow.toLowerCase()))
      .filter((d) => g({ howKnow: d.howKnow }) !== 'strong')
      .map((d) => `${d.common}: ${d.howKnow.slice(0, 70)}`);
    expect(wrong, 'graded sparse despite abundant evidence:\n  ' + wrong.join('\n  ')).toEqual([]);
  });

  it('keeps well-known animals out of the sparse bucket', () => {
    // A named sanity check - these are among the best-known dinosaurs alive
    // or extinct, and a student seeing "sparse" on T. rex would rightly
    // distrust the whole scale.
    const g = grader();
    const byName = Object.fromEntries(catalog().map((d) => [d.common, d.howKnow]));
    for (const name of ['T. rex', 'Triceratops', 'Stegosaurus']) {
      expect(byName[name], `${name} missing from the catalog`).toBeTruthy();
      expect(g({ howKnow: byName[name] }), `${name} is graded sparse`).not.toBe('limited');
    }
  });
});

describe('the grade is visible, not just readable', () => {
  it('appears as a chip in the 3D readout row', () => {
    expect(SRC).toMatch(/readoutChip\('Fossils '/);
  });

  it('uses a different colour for each tier', () => {
    // Identical colours would put it back where it started.
    const open = SRC.indexOf("readoutChip('Fossils '");
    expect(open, 'the coverage chip was not found').toBeGreaterThan(-1);
    const next = SRC.indexOf("readoutChip('Body '", open);
    expect(next, 'could not bound the coverage chip').toBeGreaterThan(open);
    const block = SRC.slice(open, next);
    const colours = [...block.matchAll(/rgba\([^)]+\)/g)].map((m) => m[0]);
    expect(new Set(colours).size, 'the three coverage tiers share a colour').toBe(3);
  });

  it('names the tier in words, not colour alone', () => {
    // Colour is not available to every student.
    expect(SRC).toContain("'abundant'");
    expect(SRC).toContain("'sparse'");
    expect(SRC).toContain("'partial'");
  });

  it('keeps the longer explanation too', () => {
    expect(SRC).toContain('reconstructionProfile.coverageNote');
  });
});
