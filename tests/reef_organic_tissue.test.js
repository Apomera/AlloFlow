import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/reef_3d_explore.js', 'utf8');
// Evaluate the actual palette and actual GLSL gate expression, so changing
// a pale palette entry cannot silently recolour a bleached decorative colony.
const start = source.indexOf('    function palette() {');
const end = source.indexOf('    function pickC(', start);
const palette = new Function('lin', 'var PALETTE=null;' + source.slice(start, end) + ';return palette();')(
  hex => new T.Color(hex).convertSRGBToLinear()
);
const expression = source.match(/vReefSkeleton\.y=([^;]+);/)[1];
const smooth = (lo, hi, x) => { const t = Math.max(0, Math.min(1, (x - lo) / (hi - lo))); return t * t * (3 - 2 * t); };
const evaluate = new Function('smoothstep', 'min', 'instanceColor', 'return ' + expression);
const gate = color => evaluate(smooth, Math.min, { r: color[0], g: color[1], b: color[2] });

describe('organic coral pigment health gate', () => {
  it('excludes every real white and pale-sheen bleached preset from added living pigment', () => {
    for (const color of [palette.white, ...palette.sheen]) expect(gate(color), color.join(',')).toBe(0);
  });

  it('keeps every healthy hard-coral palette fully active at the entire colony brightness range', () => {
    for (const colors of Object.values(palette.form)) for (const color of colors) for (const brightness of [.88, 1, 1.12]) {
      expect(gate(color.map(channel => channel * brightness)), color.join(',') + ' × ' + brightness).toBe(1);
    }
  });
});
