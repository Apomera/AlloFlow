import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Both phase dials draw a lit disc with a dark shape over it: a semicircle for the
// unlit half, closed by an elliptical arc for the terminator. That terminator ellipse
// must be squashed HORIZONTALLY - its ry has to span the full disc, because the chord
// it closes is the vertical diameter.
//
// The Moon dial had the two radii the wrong way round: `A 9 (9 * (1 - 2 * illum))`
// gave it rx 9 and a shrinking ry. SVG rescales radii that are too small to reach
// their endpoints, so at a waxing crescent the arc was blown up to rx 18 - twice the
// Moon's own radius - and the shadow bulged out well past the disc. It happened to
// look right at new, quarter and full, which is presumably how it survived.
//
// The Venus phase tool, ten lines of code away, had it the right way round the whole
// time. That is the tell: when two places draw the same figure and only one is wrong,
// the working one is the specification.
const PATHS = [
  'stem_lab/stem_tool_solarsystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js',
];

// Pulls the two radii of the SECOND arc out of a built path string.
function terminatorRadii(d) {
  const arcs = d.match(/A\s+(-?[\d.]+)\s+(-?[\d.]+)/g);
  expect(arcs, 'path must contain two arcs').not.toBeNull();
  expect(arcs.length).toBe(2);
  const [, rx, ry] = arcs[1].match(/A\s+(-?[\d.]+)\s+(-?[\d.]+)/);
  return { rx: Math.abs(Number(rx)), ry: Math.abs(Number(ry)) };
}

describe('phase terminators are squashed across the disc, not along it', () => {
  for (const path of PATHS) {
    const source = readFileSync(path, 'utf8');

    it(`keeps the Moon dial shadow inside the Moon (${path})`, () => {
      // The swapped form must not come back.
      expect(source).not.toContain("' A 9 ' + (9 * (1 - 2 * illum)) + ' 0 0 '");

      const line = source.split('\n').find((l) => l.includes("'M ' + moonX"));
      expect(line, 'the Moon terminator path must exist').toBeTruthy();
      const expr = line.slice(line.indexOf("'M ' + moonX"), line.indexOf(", fill:"));
      // eslint-disable-next-line no-new-func
      const pathFor = new Function('moonX', 'moonY', 'illum', 'return ' + expr + ';');

      const RADIUS = 9;
      for (const illum of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
        const { rx, ry } = terminatorRadii(pathFor(100, 100, illum));
        // ry must span the disc, or SVG scales both radii up to reach the endpoints
        // and the shadow spills outside the Moon.
        expect(ry, `illum ${illum}: terminator ry must span the disc`).toBeCloseTo(RADIUS, 6);
        expect(rx, `illum ${illum}: terminator rx must stay inside the disc`)
          .toBeLessThanOrEqual(RADIUS + 1e-9);
      }

      // A straight terminator at the quarters, a full circle at new, nothing at full.
      expect(terminatorRadii(pathFor(100, 100, 0.5)).rx).toBeCloseTo(0, 6);
      expect(terminatorRadii(pathFor(100, 100, 0)).rx).toBeCloseTo(RADIUS, 6);
      expect(terminatorRadii(pathFor(100, 100, 1)).rx).toBeCloseTo(RADIUS, 6);
      // The bulge shrinks monotonically from new to quarter.
      const bulges = [0, 0.2, 0.35, 0.5].map((i) => terminatorRadii(pathFor(100, 100, i)).rx);
      for (let i = 1; i < bulges.length; i++) expect(bulges[i]).toBeLessThan(bulges[i - 1]);
    });

    it(`keeps the Venus phase shadow inside Venus (${path})`, () => {
      const line = source.split('\n').find((l) => l.includes("'M ' + (335)"));
      expect(line, 'the Venus terminator path must exist').toBeTruthy();
      const expr = line.slice(line.indexOf("'M ' + (335)"), line.indexOf(", fill:"));
      // eslint-disable-next-line no-new-func
      const pathFor = new Function('apparentSize', 'illum', 'return ' + expr + ';');

      for (const size of [6, 14, 22]) {
        for (const illum of [0, 0.25, 0.5, 0.75, 1]) {
          const { rx, ry } = terminatorRadii(pathFor(size, illum));
          expect(ry, `size ${size}, illum ${illum}: ry must span the disc`).toBeCloseTo(size, 6);
          expect(rx, `size ${size}, illum ${illum}: rx must stay inside the disc`)
            .toBeLessThanOrEqual(size + 1e-9);
        }
      }
    });
  }
});
