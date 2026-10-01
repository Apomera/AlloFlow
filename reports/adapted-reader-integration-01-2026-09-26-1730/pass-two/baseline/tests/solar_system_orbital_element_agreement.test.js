import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// The tool holds orbital elements in two places that a learner can compare
// side by side: the render-scope PLANETS table, which drives the 3D Keplerian
// orrery, and the module-scope body list behind the 2D orbit-model lens. They
// were quietly disagreeing — the lens took its semi-major axes from JPL but its
// eccentricities from the NASA fact sheet's current-epoch figures, so it drew
// Neptune about a third more elliptical than the 3D view of the same orbit.
//
// This guard fails if the two ever drift apart again. It also refuses to pass
// vacuously: if either table cannot be parsed, that is a failure, not a clean
// run, because a scanner that matches nothing reports "no problems found".
const PATHS = [
  'stem_lab/stem_tool_solarsystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js',
];

function parsePlanetTable(source) {
  const start = source.indexOf('var PLANETS = [');
  const end = source.indexOf('];', start);
  const block = source.slice(start, end);
  const out = {};
  for (const m of block.matchAll(/\{ key: '(\w+)',(.*)/g)) {
    const body = m[2];
    const e = /orbitE: ([0-9.]+)/.exec(body);
    if (e) out[m[1].toLowerCase()] = Number(e[1]);
  }
  return out;
}

function parseLensBodies(source) {
  const out = {};
  for (const m of source.matchAll(/\{\s*id:\s*"(\w+)"([\s\S]{0,400}?)\}/g)) {
    const e = /\be:\s*([0-9.]+)/.exec(m[2]);
    const a = /\ba:\s*([0-9.]+)/.exec(m[2]);
    if (e && a) out[m[1]] = { e: Number(e[1]), a: Number(a[1]) };
  }
  return out;
}

describe('solar system orbital elements agree across both orbit views', () => {
  for (const path of PATHS) {
    it(`keeps eccentricity consistent between the planet table and the orbit lens (${path})`, () => {
      const source = readFileSync(path, 'utf8');
      const planets = parsePlanetTable(source);
      const lens = parseLensBodies(source);

      // Calibration: a parse that finds nothing must not read as agreement.
      expect(Object.keys(planets).length).toBeGreaterThanOrEqual(9);
      expect(Object.keys(lens).length).toBeGreaterThanOrEqual(8);

      const shared = Object.keys(planets).filter((k) => lens[k]);
      expect(shared.length).toBeGreaterThanOrEqual(8);

      for (const key of shared) {
        expect(
          Math.abs(planets[key] - lens[key].e),
          `${key}: planet table e=${planets[key]} but orbit lens e=${lens[key].e}`,
        ).toBeLessThan(0.0006);
      }
    });
  }
});
