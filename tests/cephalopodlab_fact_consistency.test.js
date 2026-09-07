// Cephalopod Lab — cross-section fact consistency.
//
// This tool states the same numbers in many places: the glossary, the facts
// pool, SKIN_ANATOMY, the world-records table, quiz explanations, the
// Camouflage Lab primer and several teaching cards all describe the same
// animal. Nothing kept them in agreement, and two had drifted apart:
//
//   * each arm's ganglion held "~40 million neurons" in the glossary and
//     "~50 million neurons" in the facts pool. The tool's own totals settle
//     it — ~500M overall, ~170M central, so ~330M across eight arms — and
//     8 x 50M would overshoot the stated total.
//   * cuttlefish chromatophore density was "~250 per mm²" in five places
//     (two of them citing Hanlon & Messenger 2018) and "~200 per square mm"
//     in two uncited ones.
//
// A contradiction like this is worse than a plain error: whichever sentence a
// student reads first is the one they will carry, and the disagreement is
// invisible unless you read the whole 22,000-line file at once. These tests
// pin the agreement, not the truth of any figure — if a number is wrong, fix
// it everywhere and update the expectation in one place here.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SOURCE = 'stem_lab/stem_tool_cephalopodlab.js';
const DEPLOY = 'desktop/web-app/public/stem_lab/stem_tool_cephalopodlab.js';
const src = readFileSync(SOURCE, 'utf8');

describe('Cephalopod Lab repeated facts agree with each other', () => {
  it('states one arm-ganglion neuron count, consistent with the stated totals', () => {
    // every mention of neurons in a single arm ganglion
    const perArm = Array.from(src.matchAll(/ganglion[^.]{0,60}?~?(\d+) million neurons/gi)).map((m) => Number(m[1]));
    expect(perArm.length).toBeGreaterThan(0);
    expect(new Set(perArm).size).toBe(1);
    const each = perArm[0];
    // and it must square with the tool's own total and central-brain figures
    expect(src).toMatch(/~500 million neurons/);
    expect(src).toMatch(/~?170 ?[Mm]/);
    expect(each * 8 + 170).toBeLessThanOrEqual(520);
    expect(each * 8 + 170).toBeGreaterThanOrEqual(480);
  });

  it('states one cuttlefish chromatophore density', () => {
    const densities = Array.from(src.matchAll(/(\d+) (?:chromatophores )?per (?:square mm|mm²|square millimet)/gi)).map((m) => Number(m[1]));
    expect(densities.length).toBeGreaterThan(3);
    // a stated range is allowed to mention its lower bound, so ignore 100
    const headline = densities.filter((n) => n !== 100);
    expect(new Set(headline).size).toBe(1);
    expect(headline[0]).toBe(250);
  });

  it('states one number of hearts, and the same split between them', () => {
    expect(src).not.toMatch(/(two|2) hearts/i);
    const branchial = Array.from(src.matchAll(/(two|2) branchial hearts/gi));
    expect(branchial.length).toBeGreaterThan(0);
    // "three hearts" and "one systemic" must both be present and never contradicted
    expect(src).toMatch(/(three|3) hearts/i);
    expect(src).not.toMatch(/(two|three|3) systemic hearts/i);
  });

  it('keeps the two live copies byte-identical', () => {
    expect(readFileSync(DEPLOY, 'utf8')).toBe(src);
  });
});

describe('Cephalopod Lab species datasets do not contradict each other', () => {
  // SPECIES (field guide) and CONSERVATION_STATUS are keyed differently
  // (giantPac vs giantPacific, blueRing vs blueRinged ...), so they are matched
  // on the scientific name — the one field both datasets agree on.
  const fgSeg = src.slice(src.indexOf('  var SPECIES = ['), src.indexOf('var HABITATS'));
  const species = Array.from(fgSeg.matchAll(/\{ id: '([A-Za-z]+)', name: '([^']*)', scientific: '([^']*)'[\s\S]*?conservation: '([^']*)'/g))
    .map((m) => ({ id: m[1], name: m[2], sci: m[3], cons: m[4] }));
  const csStart = src.indexOf('var CONSERVATION_STATUS = {');
  const records = Array.from(src.slice(csStart, csStart + 20000).matchAll(/\n {8}([A-Za-z]+): \{\n\s*species: '([^']*)',\n\s*iucn: '([^']*)'/g))
    .map((m) => ({ key: m[1], species: m[2], iucn: m[3] }));

  it('reads both datasets', () => {
    expect(species.length).toBe(15);
    expect(records.length).toBe(12);
  });

  it('never presents a non-IUCN word as an IUCN category', () => {
    // "Threatened" is not a Red List category and CITES is a trade listing, not
    // a status. The nautilus entry used to conflate the two.
    const VALID = /Least Concern|Near Threatened|Vulnerable|Endangered|Critically Endangered|Data Deficient|Not Evaluated|Not (formally )?assessed/;
    species.forEach((sp) => {
      if (/\bThreatened\b/.test(sp.cons)) {
        // only allowed as part of "Near Threatened"
        expect(sp.cons).toMatch(/Near Threatened/);
      }
      if (/IUCN/.test(sp.cons)) expect(sp.cons).toMatch(VALID);
    });
  });

  it('agrees with the IUCN record wherever a species has one', () => {
    const findRecord = (sp) => {
      const genus = sp.sci.split(' ')[0];
      return records.find((r) => r.species.indexOf(sp.sci) === 0)
        || records.find((r) => genus && r.species.indexOf(genus + ' spp.') === 0)
        || null;
    };
    const matched = species.map((sp) => ({ sp, rec: findRecord(sp) })).filter((x) => x.rec);
    // most of the guide should resolve to a record; if this drops, the two
    // datasets have drifted apart again
    expect(matched.length).toBeGreaterThanOrEqual(11);
    matched.forEach(({ sp, rec }) => {
      const head = rec.iucn.split(' ')[0];
      if (head === 'Least') expect(sp.cons).toMatch(/Least Concern/);
      if (head === 'Not') expect(sp.cons).toMatch(/Not (formally )?(assessed|Evaluated)/i);
      if (head === 'Vulnerable') expect(sp.cons).toMatch(/Vulnerable/);
    });
  });
});

describe('Cephalopod Lab species join', () => {
  const aliasSeg = src.slice(src.indexOf('var SPECIES_RECORD_ID = {'), src.indexOf('  var SPECIES = ['));
  const alias = Object.fromEntries(Array.from(aliasSeg.matchAll(/\n\s{4}([A-Za-z]+): '([A-Za-z]+)'/g)).map((m) => [m[1], m[2]]));
  const fgSeg = src.slice(src.indexOf('  var SPECIES = ['), src.indexOf('var HABITATS'));
  const fgIds = Array.from(fgSeg.matchAll(/\{ id: '([A-Za-z]+)', name: '/g)).map((m) => m[1]);
  const ddSeg = src.slice(src.indexOf('var SPECIES_DEEP_DIVES = {'), src.indexOf('var CONSERVATION_STATUS'));
  const ddKeys = Array.from(ddSeg.matchAll(/\n {8}([A-Za-z]+): \{\n\s*species: /g)).map((m) => m[1]);
  const csSeg = src.slice(src.indexOf('var CONSERVATION_STATUS = {'), src.indexOf('var CONSERVATION_STATUS = {') + 20000);
  const csKeys = Array.from(csSeg.matchAll(/\n {8}([A-Za-z]+): \{\n\s*species: /g)).map((m) => m[1]);

  it('maps only real field-guide species', () => {
    expect(Object.keys(alias).length).toBeGreaterThanOrEqual(11);
    Object.keys(alias).forEach((fgId) => expect(fgIds).toContain(fgId));
  });

  it('every mapped target exists in both of the datasets it joins', () => {
    Object.values(alias).forEach((recordId) => {
      expect(ddKeys, 'deep dive missing ' + recordId).toContain(recordId);
      expect(csKeys, 'conservation record missing ' + recordId).toContain(recordId);
    });
  });

  it('does not silently drop a species that has a record under another key', () => {
    // an unmapped field-guide species must genuinely have no record, otherwise
    // the join is incomplete and the two datasets can drift again
    const unmapped = fgIds.filter((id) => !alias[id]);
    unmapped.forEach((id) => {
      expect(ddKeys, id + ' has a deep dive but no alias').not.toContain(id);
      expect(csKeys, id + ' has a conservation record but no alias').not.toContain(id);
    });
  });
});

describe('Cephalopod Lab data accents stay readable as text', () => {
  // Several datasets carry a period or event colour — deep Triassic browns, the
  // sky blue of a glaciation. Those are fine as a band fill with white on top,
  // but used directly as TEXT on this tool's dark ground they collapse: the
  // Triassic heading measured 1.88:1. axe cannot see it, because the root
  // paints a gradient and axe reports gradient-backed text as unmeasurable, so
  // this pins the rule in source instead.
  const textSites = [
    /color: clReadableInk\(era\.color\)/,
    /color: clReadableInk\(ext\.color\)/,
    /color: clReadableInk\(stage\.color\)/,
  ];

  it('routes every data colour used as heading text through the ink helper', () => {
    textSites.forEach((re) => expect(src).toMatch(re));
    // and no raw data colour is used as text at those sites any more
    expect(src).not.toMatch(/fontWeight: 900, color: era\.color/);
    expect(src).not.toMatch(/fontWeight: 900, color: ext\.color[^)]/);
    expect(src).not.toMatch(/fontWeight: 900, color: stage\.color/);
  });

  it('lifts a dark accent to a readable ink and leaves a light one alone', () => {
    // reimplement the helper's contract to check its stated behaviour
    const GROUND = [16, 24, 45];
    const lum = (rgb) => {
      const c = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const ratio = (rgb) => (Math.max(lum(rgb), lum(GROUND)) + 0.05) / (Math.min(lum(rgb), lum(GROUND)) + 0.05);
    const hexToRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    // the Triassic brown is the colour that failed at 1.88:1
    expect(ratio(hexToRgb('#7c2d12'))).toBeLessThan(2.5);
    // the helper must aim above the 4.5 line, since the real ground measures
    // lighter than a naive constant
    expect(src).toMatch(/var want = minRatio \|\| 5\.2;/);
    expect(src).toMatch(/var GROUND = \[16, 24, 45\];/);
  });
});
