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

      // 2026-11-23 the dial split in two: a top-down orbit (the Moon's far half always
      // dark, a plain half-disc with no terminator) and a "View from Earth" inset that
      // draws the lit shape, closed by the terminator arc. Run the shipped inset builder.
      const top = source.split('\n').find((l) => l.includes("'M ' + moonX"));
      expect(top, 'the top-down Moon half-shadow must exist').toBeTruthy();
      expect(top).toContain("' A 9 9 0 0 1 ' + moonX");
      const start = source.indexOf('var illum = (1 - Math.cos(rad)) / 2;');
      expect(start, 'the observer-view phase builder must exist').toBeGreaterThan(-1);
      const end = source.indexOf('// Synodic lunar age', start);
      const block = source.slice(start, end);
      expect(block).toContain('var litPath = illum < 0.01');
      // eslint-disable-next-line no-new-func
      const view = new Function('normPos', 'var rad = normPos * Math.PI / 180;\n' + block + '\nreturn { d: litPath, r: obsR, illum: illum };');

      const RADIUS = view(90).r;
      for (const pos of [20, 45, 70, 90, 120, 150, 210, 240, 270, 300, 340]) {
        const { d } = view(pos);
        const { rx, ry } = terminatorRadii(d);
        // ry must span the disc, or SVG scales both radii up to reach the endpoints
        // and the shadow spills outside the Moon.
        expect(ry, `orbit ${pos}: terminator ry must span the disc`).toBeCloseTo(RADIUS, 6);
        expect(rx, `orbit ${pos}: terminator rx must stay inside the disc`)
          .toBeLessThanOrEqual(RADIUS + 1e-9);
      }

      // A straight terminator at the quarters, nothing lit at new, a whole disc at full.
      expect(terminatorRadii(view(90).d).rx).toBeLessThan(0.5);
      expect(terminatorRadii(view(270).d).rx).toBeLessThan(0.5);
      expect(view(0).d).toBe('');
      expect(view(180).illum).toBeCloseTo(1, 6);
      // The bulge shrinks monotonically from new to quarter.
      const bulges = [15, 30, 60, 89].map((p) => terminatorRadii(view(p).d).rx);
      for (let i = 1; i < bulges.length; i++) expect(bulges[i]).toBeLessThan(bulges[i - 1]);
    });

    it(`keeps the Venus phase shadow inside Venus (${path})`, () => {
      // The 10-12 Venus investigation draws its discs with phaseDisc(): a lit semicircle
      // closed by the terminator arc, over a night-side circle. Run the shipped function.
      const start = source.indexOf('function phaseDisc(cx, cy, radius, cosine, id)');
      expect(start, 'the Venus phase disc builder must exist').toBeGreaterThan(-1);
      let end = source.indexOf('{', start), depth = 1;
      while (depth) { end++; if (source[end] === '{') depth++; if (source[end] === '}') depth--; }
      const React = { createElement: (type, props, ...kids) => ({ type, props: props || {}, kids }) };
      // eslint-disable-next-line no-new-func
      const phaseDisc = new Function('React', 'return (' + source.slice(start, end + 1) + ');')(React);
      const litPath = (radius, cosine) => phaseDisc(0, 0, radius, cosine, 'v').kids.find((k) => k.type === 'path').props.d;

      for (const size of [6, 14, 22, 44]) {
        for (const cosine of [-0.75, -0.25, 0.25, 0.75, 1]) {
          const d = litPath(size, cosine);
          const limb = d.match(/A\s+(-?[\d.]+)\s+(-?[\d.]+)/);
          expect(Number(limb[1]), 'the lit limb is the disc itself').toBeCloseTo(size, 6);
          expect(Number(limb[2])).toBeCloseTo(size, 6);
          const { rx, ry } = terminatorRadii(d);
          expect(ry, `size ${size}, cos ${cosine}: ry must span the disc`).toBeCloseTo(size, 6);
          expect(rx, `size ${size}, cos ${cosine}: rx must stay inside the disc`)
            .toBeLessThanOrEqual(size + 1e-9);
          expect(rx).toBeCloseTo(Math.abs(cosine) * size, 6);
        }
      }
    });
  }
});
