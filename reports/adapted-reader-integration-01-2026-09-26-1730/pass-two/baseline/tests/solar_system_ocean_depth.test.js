import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Earth's dive in drone mode. The ocean zone table is written in scene units, but the
// readouts turned the sub's height into metres at 50 m a unit (100 m for the depth
// record) measured from y = 0, the floor of the sunlight zone. So a sub just under the
// surface read "Depth 500 m" while the zone beside it said Sunlight Zone and the light
// said 100%, and the record depth came out double the depth shown. One mapping now
// goes through the table's own boundaries, and pressure and light follow from depth.
const PATHS = process.env.SOLAR_SOURCE ? [process.env.SOLAR_SOURCE] : [
  'stem_lab/stem_tool_solarsystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js',
];

function sliceFunction(source, name) {
  const start = source.indexOf('function ' + name + '(');
  expect(start, `${name} must exist`).toBeGreaterThan(-1);
  let depth = 0;
  for (let j = source.indexOf('{', start); j < source.length; j++) {
    if (source[j] === '{') depth++;
    else if (source[j] === '}' && --depth === 0) return source.slice(start, j + 1);
  }
  throw new Error('unbalanced ' + name);
}

function load(source) {
  const knots = source.match(/var SOLAR_OCEAN_DEPTH_KNOTS = (\[[^;]+\]);/);
  expect(knots, 'the depth knots').toBeTruthy();
  // eslint-disable-next-line no-new-func
  return new Function('SOLAR_OCEAN_DEPTH_KNOTS',
    sliceFunction(source, 'solarOceanConditions') + '\n' + sliceFunction(source, 'solarOceanLightText') +
    '\nreturn { at: solarOceanConditions, light: solarOceanLightText };')(JSON.parse(knots[1]));
}

// The ocean zone rows: name key, minY, maxY and pressure string.
function oceanZones(source) {
  const block = source.slice(source.indexOf('var oceanZones = ['), source.indexOf('oceanAtmo = {'));
  const rows = [];
  const re = /minY: (-?\d+), maxY: (-?\d+), pressure: '([^']+)'/g;
  let m;
  while ((m = re.exec(block))) rows.push({ minY: Number(m[1]), maxY: Number(m[2]), pressure: m[3] });
  return rows;
}

describe('Earth dive: depth, pressure and light', () => {
  for (const path of PATHS) {
    const source = readFileSync(path, 'utf8');
    const O = load(source);
    const zones = oceanZones(source);

    it(path + ': maps the sub height to depth through the zone table\'s own boundaries', () => {
      expect(zones.length).toBe(5);
      const floors = zones.filter((z) => z.minY > -999).map((z) => O.at(z.minY).depthM);
      expect(floors, 'sunlight, twilight, midnight and abyssal floors').toEqual([200, 1000, 4000, 6000]);
      // Just under the surface (the sub's y = 8 ceiling) is shallow, sunlit water.
      const top = O.at(8);
      expect(top.depthM).toBeGreaterThan(0);
      expect(top.depthM).toBeLessThan(20);
      expect(top.lightFrac).toBeGreaterThan(0.6);
      expect(O.at(-30).depthM, 'the deepest trench').toBe(11000);
      let prev = -1;
      for (let y = 8.5; y >= -30; y -= 0.25) { const d = O.at(y).depthM; expect(d).toBeGreaterThanOrEqual(prev); prev = d; }
    });

    it(path + ': pressure and sunlight follow from depth, and the zone table agrees with them', () => {
      expect(O.at(0).pressureAtm, '200 m of seawater').toBeCloseTo(20.9, 1);
      expect(O.at(0).lightFrac, '1% at 200 m: the floor of the sunlight zone').toBeCloseTo(0.01, 6);
      expect(O.light(O.at(0).lightFrac)).toBe('1%');
      expect(O.light(O.at(-5).lightFrac), 'none left by 1,000 m').toBe('<0.01%');
      // Each zone's printed pressure range is the model's pressure at its top and floor.
      const tops = [0, 200, 1000, 4000, 6000], floors = [200, 1000, 4000, 6000, 11000];
      zones.forEach((z, i) => {
        const [lo, hi] = z.pressure.replace(/,/g, '').match(/[\d.]+/g).map(Number);
        const p = (d) => 1 + d / 10.06;
        expect(Math.abs(lo - p(tops[i])) / p(tops[i]), z.pressure + ' low end').toBeLessThan(0.06);
        expect(Math.abs(hi - p(floors[i])) / p(floors[i]), z.pressure + ' high end').toBeLessThan(0.06);
      });
    });

    it(path + ': every ocean depth readout uses the mapping', () => {
      // (The gas-giant probe's altitude record keeps its own 50 m-a-unit scale.)
      const outsideGas = source.replace('gasAtmo.depthRecord = Math.abs(playerPos.y * scaleFactor);', '');
      expect(outsideGas).not.toMatch(/Math\.abs\(playerPos\.y \* scaleFactor\)/);
      expect(source).not.toMatch(/Math\.abs\(playerPos\.y\) \* scaleFactor/);
      expect(source).not.toMatch(/playerPos\.y \* 100/);
      expect(source).not.toMatch(/oceanScienceZone\.lightLevel/);
      expect((source.match(/solarOceanConditions\(playerPos\.y\)/g) || []).length, 'science line, scan, photo, HUD, record, specimen card').toBeGreaterThanOrEqual(6);
    });
  }
});
