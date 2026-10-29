// Five taxa in this catalog have direct fossil evidence relevant to colour.
// Their displayed appearance still involves reconstruction; screen swatches
// are not literal colour readings from fossils.
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
import { parseExpressionAt } from 'acorn';

const SRC = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');

function colourChipSource() {
  const start = SRC.indexOf("readoutChip('Colour '");
  expect(start, 'the colour chip was not found').toBeGreaterThan(-1);
  const expression = parseExpressionAt(SRC, start, { ecmaVersion: 'latest' });
  const call = expression.type === 'SequenceExpression' ? expression.expressions[0] : expression;
  expect(call.type).toBe('CallExpression');
  return SRC.slice(call.start, call.end);
}

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
      if (id === 'microraptor') {
        expect(f({ id }).note).toMatch(/melanosomes support iridescent black plumage/);
        expect(f({ id }).note).toMatch(/sheen, hue shifts, and viewing angles are illustrative rather than measured/);
        continue;
      }
      expect(f({ id }).note.toLowerCase(), `${id} states measured colour with no hedge`)
        .toMatch(/remain(s)? reconstructed|reconstructed/);
    }
  });
});

describe('the displayed colour claim follows the evidence and active palette', () => {
  function chip(evidence, paletteMode) {
    // Evaluate the actual rendered expression rather than duplicating its gate.
    const render = new Function('integumentEvidence', 'surfaceHypothesis', 'readoutChip', 'return '+colourChipSource()+';');
    return render(evidence, Object.freeze({paletteMode}), (label, border) => ({label, border}));
  }
  for (const direct of [false,true]) for (const [mode,showsPigment] of [['natural',true],['neutral',false],['classic',false],['avian',true]]) {
    it('labels '+mode+' with direct pigment evidence '+direct, () => {
      const evidence=Object.freeze({direct}), rendered=chip(evidence,mode), supported=direct&&showsPigment;
      expect(rendered.label).toBe(supported?'Colour from fossil pigment':'Colour illustrated');
      expect(rendered.border).toBe(supported?'rgba(232,121,249,0.72)':'rgba(148,163,184,0.55)');
      expect(evidence.direct).toBe(direct);
    });
  }
  it('keeps species evidence intact when a simplified display suppresses the pigment claim', () => {
    const classify=classifier();
    for (const id of [...MEASURED,'tyrannosaurus']) {
      const evidence=classify({id}),before=JSON.parse(JSON.stringify(evidence));
      for (const mode of ['neutral','classic']) expect(chip(evidence,mode).label).toBe('Colour illustrated');
      expect(evidence).toEqual(before);
      expect(chip(evidence,'natural').label).toBe(MEASURED.includes(id)?'Colour from fossil pigment':'Colour illustrated');
    }
  });
});
