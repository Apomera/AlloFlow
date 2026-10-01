import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// The asteroid-impact mini-tool prints an energy and a crater width for whatever
// diameter the reader picks, which makes it checkable against events we measured.
//
// It used to fail every one of them. `energy = size^3.5 * 0.4` megatons put
// Chelyabinsk (20 m) at 28,600 Mt against a measured ~0.5, and
// `crater = size^0.78 * 1.16` km gave Barringer's ~50 m impactor a 25 km crater
// against a real 1.2 km. That 0.78 exponent and 1.16 coefficient are real - they
// come from Collins, Melosh & Marcus (2005) - but they describe a TRANSIENT crater
// in METRES, and the velocity and gravity terms beside them had been dropped.
//
// So the test is the obvious one: run the shipped model on real impactors and hold
// it to the observed numbers.
const PATHS = [
  'stem_lab/stem_tool_solarsystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js',
];

// Finds the `;` that ends a statement, skipping any inside quoted copy - the
// consequence strings are prose and contain punctuation of their own.
function statementEnd(source, from) {
  let quote = null;
  for (let i = from; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
    } else if (c === "'" || c === '"') quote = c;
    else if (c === ';') return i;
  }
  throw new Error('unterminated statement');
}

function impactModel(source) {
  const from = source.indexOf('var energy = 5.43e-5');
  expect(from, 'the impact energy model must exist').toBeGreaterThan(-1);
  const tail = source.indexOf("' kt TNT';", from);
  expect(tail, 'the energy readout must exist').toBeGreaterThan(from);
  const block = source.slice(from, tail + "' kt TNT';".length);
  // eslint-disable-next-line no-new-func
  return new Function('size', block + ' return { energy: energy, craterKm: craterKm, energyStr: energyStr };');
}

describe('asteroid impact model reproduces measured impacts', () => {
  for (const path of PATHS) {
    const source = readFileSync(path, 'utf8');

    it(`matches Chelyabinsk, Tunguska, Barringer and Chicxulub (${path})`, () => {
      // The made-up power laws must not come back.
      expect(source).not.toContain('Math.pow(size, 3.5) * 0.4');
      expect(source).not.toContain('Math.pow(size, 0.78) * 1.16');

      const model = impactModel(source);

      // Chelyabinsk, 2013: ~20 m, ~0.5 Mt, airburst - no crater.
      const chelyabinsk = model(20);
      expect(chelyabinsk.energy).toBeGreaterThan(0.2);
      expect(chelyabinsk.energy).toBeLessThan(1.2);

      // Tunguska, 1908: ~50-60 m, estimates spanning 3-15 Mt.
      const tunguska = model(60);
      expect(tunguska.energy).toBeGreaterThan(3);
      expect(tunguska.energy).toBeLessThan(20);

      // Barringer (Meteor Crater): ~50 m impactor, 1.19 km crater.
      const barringer = model(50);
      expect(barringer.craterKm).toBeGreaterThan(0.8);
      expect(barringer.craterKm).toBeLessThan(2);

      // Chicxulub: 10-15 km impactor, ~180 km crater. A schematic that lands
      // within a factor of two on a 180 km structure is doing its job; one that
      // says 1,500 km is not.
      const chicxulub = model(12000);
      expect(chicxulub.craterKm).toBeGreaterThan(90);
      expect(chicxulub.craterKm).toBeLessThan(360);
    });

    it(`keeps the readout legible at both ends of the slider (${path})`, () => {
      const model = impactModel(source);
      // The slider runs 0.5 m to 5,000 m. The old readout printed "0 MT TNT" for
      // everything below a megaton, which is most of the interesting range.
      expect(model(0.5).energyStr).not.toMatch(/^0 /);
      expect(model(0.5).energyStr).toContain('kt');
      expect(model(20).energyStr).toContain('kt');
      expect(model(60).energyStr).toContain('Mt');
      expect(model(5000).energyStr).toContain('Gt');
      // Strictly increasing energy and crater across the slider.
      const sizes = [0.5, 5, 20, 60, 200, 1000, 5000];
      for (let i = 1; i < sizes.length; i++) {
        expect(model(sizes[i]).energy).toBeGreaterThan(model(sizes[i - 1]).energy);
        expect(model(sizes[i]).craterKm).toBeGreaterThan(model(sizes[i - 1]).craterKm);
      }
    });

    it(`describes consequences at the scale they happened (${path})`, () => {
      // Chelyabinsk broke windows across a city; it did not destroy one, and the
      // top of a 5 km slider is not a sterilizing impact - that needs a body
      // hundreds of kilometres across.
      expect(source).not.toContain("size < 50 ? 'City destroyed; tsunamis'");
      expect(source).not.toContain("'Sterilizing impact'");
      const from = source.indexOf('var consequence = size <');
      expect(from, 'the consequence bands must exist').toBeGreaterThan(-1);
      const bands = source.slice(from, statementEnd(source, from) + 1);
      // eslint-disable-next-line no-new-func
      const describe_ = new Function('size', bands + ' return consequence;');
      expect(describe_(20)).toMatch(/airburst/i);
      expect(describe_(60)).toMatch(/city|crater/i);
      expect(describe_(5000)).toMatch(/extinction|global/i);
      // Every step up the slider must be a different sentence at some point.
      const said = [0.5, 20, 60, 500, 1500, 5000].map(describe_);
      expect(new Set(said).size).toBeGreaterThanOrEqual(5);
    });
  }
});
