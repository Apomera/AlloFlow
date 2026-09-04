import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Three claims the planet cards make that are easy to lose in a refactor and
// invisible in a screenshot diff:
//
//  1. ONE sun. The shared shading pass used a horizontal linear ramp, so its light
//     sat due left on the equator while the highlight ten lines below it sat up and
//     to the left. A ramp also lights a sphere wrong: brightness follows the angle
//     between the normal and the light, which on screen is a RADIAL falloff from the
//     sub-solar point.
//  2. Retrograde worlds turn backwards. In the IAU convention an axial tilt past 90
//     degrees IS retrograde rotation, and Venus (177.4), Uranus (97.8) and Pluto
//     (122.5) are all recorded that way in the planet table. Venus' card carried the
//     fact line "Rotates backwards!" while its globe turned with everyone else's.
//  3. Distance and air thickness reach the picture. Sunlight falls off with the
//     square of distance and surface pressure spans seven orders of magnitude across
//     these worlds, so Pluto cannot be lit like Mercury or haloed like Venus.
const PATHS = [
  'stem_lab/stem_tool_solarsystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js',
];

// Pulls `function name(...) { ... }` out by balancing braces, so the test reads the
// shipped implementation rather than a copy that can drift away from it.
function sliceFunction(source, name) {
  const start = source.indexOf('function ' + name + '(');
  expect(start, `${name} must exist`).toBeGreaterThan(-1);
  let depth = 0;
  let i = source.indexOf('{', start);
  for (let j = i; j < source.length; j++) {
    if (source[j] === '{') depth++;
    else if (source[j] === '}') {
      depth--;
      if (depth === 0) return source.slice(start, j + 1);
    }
  }
  throw new Error(`unbalanced braces in ${name}`);
}

function sliceObject(source, name) {
  const start = source.indexOf('var ' + name + ' = {');
  expect(start, `${name} must exist`).toBeGreaterThan(-1);
  const end = source.indexOf('};', start);
  // eslint-disable-next-line no-eval
  return eval('(' + source.slice(source.indexOf('{', start), end + 1) + ')');
}

// tiltDeg lives on one line per planet in the PLANETS table.
function readTilts(source) {
  const tilts = {};
  const re = /key: '(\w+)'[^\n]*?tiltDeg: (-?[\d.]+)/g;
  let m;
  while ((m = re.exec(source))) if (!(m[1] in tilts)) tilts[m[1]] = Number(m[2]);
  return tilts;
}

describe('planet card light and spin', () => {
  for (const path of PATHS) {
    const source = readFileSync(path, 'utf8');

    it(`lights every card from one sun (${path})`, () => {
      // The ramp that gave a sphere a full-moon face must not come back.
      expect(source).not.toMatch(
        /createLinearGradient\(\s*cx - planetR,\s*cy,\s*cx \+ planetR,\s*cy\s*\)/,
      );
      expect(source).toContain('var SOLAR_CARD_SUN = {');
      const sun = sliceObject(source, 'SOLAR_CARD_SUN');
      // Upper left, and a real direction rather than a degenerate one.
      expect(sun.x).toBeLessThan(0);
      expect(sun.y).toBeLessThan(0);
      expect(Math.hypot(sun.x, sun.y)).toBeGreaterThan(0.2);

      // Everything that implies a light direction reads that one point.
      const shade = sliceFunction(source, 'solarSunShade');
      expect(shade).toContain('SOLAR_CARD_SUN.x');
      expect(shade).toContain('SOLAR_CARD_SUN.y');
      expect(shade).toContain('createRadialGradient');
      // Mercury's glare belongs on the sunward FACE: an airless world has nothing
      // outside its limb to scatter light, which is the whole point of Mercury.
      const glare = source.slice(source.indexOf('var glareX ='));
      expect(glare.slice(0, 1400)).toContain('SOLAR_CARD_SUN.x');
      expect(glare.slice(0, 1400)).toMatch(/ctx\.clip\(\)/);
    });

    it(`turns the retrograde worlds backwards (${path})`, () => {
      const tilts = readTilts(source);
      // Guard against a rename quietly emptying the table and passing vacuously.
      expect(Object.keys(tilts).length).toBeGreaterThanOrEqual(9);
      expect(tilts.Venus).toBeGreaterThan(90);
      expect(tilts.Uranus).toBeGreaterThan(90);
      expect(tilts.Pluto).toBeGreaterThan(90);

      const spinRates = sliceObject(source, 'SOLAR_SPIN_RATE');
      const scope = { SOLAR_SPIN_RATE: spinRates, solarTiltDeg: (k) => tilts[k] || 0 };
      // eslint-disable-next-line no-new-func
      const spin = new Function(
        'SOLAR_SPIN_RATE',
        'solarTiltDeg',
        sliceFunction(source, 'solarCardSpinRate') + '; return solarCardSpinRate;',
      )(scope.SOLAR_SPIN_RATE, scope.solarTiltDeg);

      for (const key of ['Venus', 'Uranus', 'Pluto']) {
        expect(spin(key), `${key} spins retrograde`).toBeLessThan(0);
      }
      for (const key of ['Mercury', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Neptune']) {
        expect(spin(key), `${key} spins prograde`).toBeGreaterThan(0);
      }
    });

    it(`puts distance and air thickness into the picture (${path})`, () => {
      const au = sliceObject(source, 'SOLAR_SEMI_MAJOR_AU');
      // eslint-disable-next-line no-new-func
      const illum = new Function(
        'SOLAR_SEMI_MAJOR_AU',
        sliceFunction(source, 'solarCardIllum') + '; return solarCardIllum;',
      )(au);

      // Strictly dimmer with distance, and Mercury brighter than Earth.
      const order = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
      for (let i = 1; i < order.length; i++) {
        expect(illum(order[i]), `${order[i]} dimmer than ${order[i - 1]}`)
          .toBeLessThan(illum(order[i - 1]));
      }
      expect(illum('Mercury')).toBeGreaterThan(1);
      expect(illum('Earth')).toBeCloseTo(1, 5);
      // Still legible: a card rendered at the true 1/1560 would simply be black.
      expect(illum('Pluto')).toBeGreaterThan(0.2);

      const depth = sliceObject(source, 'SOLAR_ATMOSPHERE_DEPTH');
      expect(depth.Venus).toBeGreaterThan(depth.Earth);
      expect(depth.Earth).toBeGreaterThan(depth.Mars);
      expect(depth.Mars).toBeGreaterThan(depth.Pluto);
      // Airless worlds are decided by solarHasAtmosphere, not by this table.
      expect(depth.Mercury).toBeUndefined();
    });
  }
});

// The moons were laid out and sized by their position in NOTABLE_MOONS rather than by
// the real figures the same rows carry. That drew Titan inside Mimas, and made
// Miranda - the smallest of Uranus' three - the biggest dot, directly beside a
// tooltip calling Titania the largest moon of Uranus.
describe('moon layout comes from the moon data', () => {
  function readMoonRows(source, planet) {
    // Several unrelated tables also key on planet names, so anchor inside this one.
    const table = source.indexOf('var NOTABLE_MOONS = {');
    expect(table, 'NOTABLE_MOONS must exist').toBeGreaterThan(-1);
    const start = source.indexOf(`${planet}: [`, table);
    expect(start, `${planet} must be in NOTABLE_MOONS`).toBeGreaterThan(-1);
    const block = source.slice(start, source.indexOf('],', start));
    const rows = [];
    const re = /diameter: '([^']+)'[^\n]*?dist: '([^']+)'/g;
    let m;
    while ((m = re.exec(block))) rows.push({ diameter: m[1], dist: m[2] });
    return rows;
  }

  for (const path of PATHS) {
    const source = readFileSync(path, 'utf8');

    it(`ranks, sizes and paces moons from their real figures (${path})`, () => {
      // The index-based layout must not come back.
      expect(source).not.toContain('planetR * 1.3 + mi * 18');
      expect(source).not.toContain('(mi === 0 ? 2 : 0)');
      expect(source).toContain('moonRank[mi]');
      // Kepler: an inner moon goes round faster.
      expect(source).toMatch(/Math\.pow\(moonInnerKm \/ moonKm\[mi\], 0?\.\d+\)/);

      // eslint-disable-next-line no-new-func
      const parseKm = new Function(
        sliceFunction(source, 'solarParseKm') + '; return solarParseKm;',
      )();
      expect(parseKm('1,221,870 km')).toBe(1221870);
      expect(parseKm('396 km')).toBe(396);
      expect(parseKm(undefined)).toBe(0);

      // Saturn is the case that proves the reorder does something: in list order the
      // moons run Titan, Enceladus, Mimas, Iapetus, but by distance Mimas is innermost
      // and by size Titan is the largest.
      const saturn = readMoonRows(source, 'Saturn');
      expect(saturn.length).toBeGreaterThanOrEqual(4);
      const dists = saturn.map((r) => parseKm(r.dist));
      const widths = saturn.map((r) => parseKm(r.diameter));
      expect(dists.every((d) => d > 0)).toBe(true);
      expect(widths.every((w) => w > 0)).toBe(true);
      // List order is NOT distance order, so drawing by index was drawing it wrong.
      const byDistance = dists.slice().sort((a, b) => a - b);
      expect(dists).not.toEqual(byDistance);
      // Titan, listed first, is the widest but not the innermost.
      expect(widths.indexOf(Math.max(...widths))).toBe(0);
      expect(dists.indexOf(Math.min(...dists))).not.toBe(0);
    });
  }
});
