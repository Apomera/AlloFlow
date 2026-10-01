import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// The interior cutaway draws each layer from an `r` fraction and prints a `thick`
// label beside it. Nothing tied the two together, so a layer could say one thing and
// show another - and Pluto did: its core was drawn at half the radius beside a label
// reading "~850 km", which is 72% of Pluto's 1,188 km. The picture taught that Pluto
// is mostly ice with a small core; the number, and the science, say two-thirds rock.
//
// This checks the drawing against its own captions. `r` is a layer's OUTER radius as
// a fraction of the planet's, so the band drawn for it is r[i] - r[i+1], and the last
// entry's `r` IS the core radius.
const PATHS = [
  'stem_lab/stem_tool_solarsystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js',
];

// A skin too thin to see gets floored to a visible band. Jupiter's 50 km of cloud
// tops is 0.07% of its radius: at true scale it is a sub-pixel line. The panel above
// the cutaway says "boundaries and thicknesses are approximate and not to scale", and
// this is the one place that licence is spent.
const VISIBLE_FLOOR = 0.015;
const TOLERANCE = 0.25;

function planetRadiiKm(source) {
  const radii = {};
  const re = /key: '(\w+)'[^\n]*?diameter: '([\d,]+) km'/g;
  let m;
  while ((m = re.exec(source))) {
    if (!(m[1] in radii)) radii[m[1]] = Number(m[2].replace(/,/g, '')) / 2;
  }
  return radii;
}

// "~1,850 km radius" -> {lo: 1850, hi: 1850}; "5-35 km" -> {lo: 5, hi: 35}
function parseThickness(text) {
  const nums = text.replace(/,/g, '').match(/[\d.]+/g);
  if (!nums || !nums.length) return null;
  const values = nums.map(Number);
  return { lo: Math.min(...values), hi: Math.max(...values) };
}

function readInteriorLayers(source) {
  const start = source.indexOf('function getSolarInteriorLayers(planetKey) {');
  expect(start, 'getSolarInteriorLayers must exist').toBeGreaterThan(-1);
  const body = source.slice(start, source.indexOf('\n          }', start));
  const blocks = {};
  // Each planet is `if (planetKey === 'X') return [ ... ];`, and the bare trailing
  // `return [` is Pluto's default.
  const re = /(?:planetKey === '(\w+)'\) return|\n\s+return) \[([\s\S]*?)\n\s+\];/g;
  let m;
  let pending = null;
  while ((m = re.exec(body))) {
    const rows = [];
    const rowRe = /r: ([\d.]+)[\s\S]*?thick: '([^']+)'/g;
    let r;
    while ((r = rowRe.exec(m[2]))) rows.push({ r: Number(r[1]), thick: r[2] });
    if (m[1]) blocks[m[1]] = rows;
    else pending = rows;
  }
  if (pending) blocks.Pluto = pending;
  return blocks;
}

describe('interior cutaway agrees with its own labels', () => {
  for (const path of PATHS) {
    const source = readFileSync(path, 'utf8');

    it(`draws every layer at the thickness it prints (${path})`, () => {
      const radii = planetRadiiKm(source);
      const blocks = readInteriorLayers(source);
      // Guard against a parse that silently matches nothing.
      expect(Object.keys(blocks).sort()).toEqual(
        ['Earth', 'Jupiter', 'Mars', 'Mercury', 'Neptune', 'Pluto', 'Saturn', 'Uranus', 'Venus'],
      );

      for (const [planet, layers] of Object.entries(blocks)) {
        const R = radii[planet];
        expect(R, `${planet} needs a diameter in PLANETS`).toBeGreaterThan(0);
        expect(layers.length, `${planet} needs layers`).toBeGreaterThanOrEqual(3);
        expect(layers[0].r, `${planet} starts at the surface`).toBe(1);

        for (let i = 0; i < layers.length; i++) {
          const isCore = i === layers.length - 1;
          // Radii must march inward, or the cutaway would draw a layer inside out.
          if (!isCore) {
            expect(layers[i].r, `${planet} layer ${i} outside layer ${i + 1}`)
              .toBeGreaterThan(layers[i + 1].r);
          }
          const drawnKm = (isCore ? layers[i].r : layers[i].r - layers[i + 1].r) * R;
          const stated = parseThickness(layers[i].thick);
          expect(stated, `${planet} layer ${i} needs a thickness`).not.toBeNull();

          // The floor is only licensed where the true band really is invisible.
          if (stated.hi / R < VISIBLE_FLOOR) {
            expect(drawnKm / R, `${planet} "${layers[i].thick}" floored beyond the visible minimum`)
              .toBeLessThanOrEqual(VISIBLE_FLOOR * 1.1);
            continue;
          }
          expect(drawnKm, `${planet} draws "${layers[i].thick}" as ${Math.round(drawnKm)} km`)
            .toBeGreaterThanOrEqual(stated.lo * (1 - TOLERANCE));
          expect(drawnKm, `${planet} draws "${layers[i].thick}" as ${Math.round(drawnKm)} km`)
            .toBeLessThanOrEqual(stated.hi * (1 + TOLERANCE));
        }
      }
    });

    it(`keeps Pluto two-thirds rock (${path})`, () => {
      const blocks = readInteriorLayers(source);
      const core = blocks.Pluto[blocks.Pluto.length - 1];
      // Published models put the rock core near 850 km of Pluto's 1,188 km radius.
      expect(core.r).toBeGreaterThan(0.65);
      expect(core.r).toBeLessThan(0.78);
    });
  }
});
