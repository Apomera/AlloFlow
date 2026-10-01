// Only five dinosaurs in this catalog have colour we actually MEASURED, from
// fossil melanosomes: Microraptor, Sinosauropteryx, Psittacosaurus, Anchiornis
// and Borealopelta. For the other 357 the colour on screen is an
// evidence-compatible illustration - a choice, not a finding.
//
// The tool knew this (integumentEvidenceFor carries a `direct` flag) but said
// it only inside the screen-reader description, about 10,000 characters in. A
// student looking at Microraptor had no way to see they were looking at one of
// the few dinosaurs whose real colour is known.
//
// Now it is a chip: vivid magenta "Colour from fossil pigment" versus muted
// grey "Colour illustrated" - the muting itself carrying the message.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');

// Run the SHIPPED classifier rather than a retyped copy.
function classifier() {
  const open = SRC.indexOf('function integumentEvidenceFor');
  expect(open, 'integumentEvidenceFor not found').toBeGreaterThan(-1);
  const close = SRC.indexOf('\n  }', open) + 4;
  // eslint-disable-next-line no-new-func
  return new Function(SRC.slice(open, close) + '\nreturn integumentEvidenceFor;')();
}

function speciesIds() {
  const ids = [...SRC.matchAll(/id: '([a-z0-9_]+)', name: '([^']+)', common: '([^']+)',/g)]
    .map((m) => ({ id: m[1], common: m[3] }));
  expect(ids.length).toBeGreaterThan(300);
  return ids;
}

const MEASURED = ['microraptor', 'sinosauropteryx', 'psittacosaurus', 'anchiornis', 'borealopelta'];

describe('the direct-evidence set is exactly the melanosome taxa', () => {
  it('marks all five as direct', () => {
    const f = classifier();
    for (const id of MEASURED) {
      expect(f({ id }).direct, `${id} lost its direct colour evidence`).toBe(true);
    }
  });

  it('marks nobody else as direct', () => {
    // A false positive here would tell a student we know a colour we do not.
    // That is the worse error of the two, so it gets its own sweep.
    const f = classifier();
    const wrong = speciesIds()
      .filter((s) => !MEASURED.includes(s.id))
      .filter((s) => f({ id: s.id }).direct)
      .map((s) => s.common);
    expect(wrong, 'claimed measured colour without evidence: ' + wrong.join(', ')).toEqual([]);
  });

  it('gives every species a label and a hedged note', () => {
    const f = classifier();
    const bare = speciesIds()
      .map((s) => ({ s, e: f({ id: s.id }) }))
      .filter(({ e }) => !e.label || !e.note)
      .map(({ s }) => s.common);
    expect(bare, 'species with no colour-evidence text: ' + bare.join(', ')).toEqual([]);
  });

  it('keeps the reconstruction hedge on the measured ones too', () => {
    // Even a melanosome reconstruction involves inference. Each note must say
    // what is still reconstructed, or the chip overclaims.
    const f = classifier();
    for (const id of MEASURED) {
      expect(f({ id }).note.toLowerCase(), `${id} states measured colour with no hedge`)
        .toMatch(/remain(s)? reconstructed|reconstructed/);
    }
  });
});

describe('the distinction is visible in the readout row', () => {
  it('shows a colour-evidence chip', () => {
    expect(SRC).toMatch(/readoutChip\('Colour '/);
  });

  it('says which of the two it is, in words', () => {
    // Colour alone is not available to every student.
    expect(SRC).toContain("'from fossil pigment'");
    expect(SRC).toContain("'illustrated'");
  });

  it('uses a different colour for each case', () => {
    const open = SRC.indexOf("readoutChip('Colour '");
    expect(open, 'the colour chip was not found').toBeGreaterThan(-1);
    // Bound by the NEXT chip - a fixed window would count its colours too.
    const next = SRC.indexOf("readoutChip('Fossils '", open);
    expect(next, 'could not bound the colour chip').toBeGreaterThan(open);
    const block = SRC.slice(open, next);
    const colours = [...block.matchAll(/rgba\([^)]+\)/g)].map((m) => m[0]);
    expect(colours.length, 'expected two colours').toBe(2);
    expect(new Set(colours).size, 'both cases share a colour').toBe(2);
  });

  it('reads the flag rather than hardcoding a species list', () => {
    // A hardcoded list in the view would drift from the classifier.
    const open = SRC.indexOf("readoutChip('Colour '");
    const next = SRC.indexOf("readoutChip('Fossils '", open);
    const block = SRC.slice(open, next);
    expect(block).toContain('integumentEvidence.direct');
    for (const id of MEASURED) {
      expect(block.toLowerCase(), `the chip hardcodes ${id}`).not.toContain(id);
    }
  });
});
