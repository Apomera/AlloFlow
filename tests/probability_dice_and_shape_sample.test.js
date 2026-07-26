// Two Probability Lab visuals that used to be wrong in ways no other test
// could see, because both failures are geometric rather than structural:
//
//  1. The die faces. d4 and d20 were the same up-pointing triangle and only
//     the fill colour told them apart, which is no signal at all for a
//     colour-blind student. The d10 was drawn as a rhombus, but a d10 is a
//     pentagonal trapezohedron and its faces are kites.
//  2. The "distribution shape discovery" widget. Three sliders drove nothing
//     but a text label, so "sweep and notice" had nothing to notice. It now
//     draws the expected distribution AND a live 60-draw sample.
//
// Both are pinned here by behaviour (distinct silhouettes, numerals inside
// their faces, sample tracks the weights) rather than by digest, so an
// intentional restyle doesn't fail but a regression to flat/identical does.

import fs from 'node:fs';
import vm from 'node:vm';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = fs.readFileSync('stem_lab/stem_tool_probability.js', 'utf8');

// Lift the geometry out of the tool without booting it: polyPts + DIE_SHAPES
// are a self-contained block between the helper and the renderer.
function diceGeometry() {
  const start = SRC.indexOf('var polyPts = function');
  const end = SRC.indexOf('var diceFace = function');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const sandbox = { Math };
  vm.runInNewContext(SRC.slice(start, end) + '\nout = DIE_SHAPES;', sandbox);
  return sandbox.out;
}

function pointInPolygon(x, y, pts) {
  let inside = false;
  const n = pts.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = pts[i * 2], yi = pts[i * 2 + 1];
    const xj = pts[j * 2], yj = pts[j * 2 + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const SIDES = [4, 8, 10, 12, 20];
const BOX = 80;

// Relative luminance / contrast ratio (WCAG 2.x).
const channel = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const luminance = (hex) => 0.2126 * channel(parseInt(hex.slice(1, 3), 16))
  + 0.7152 * channel(parseInt(hex.slice(3, 5), 16))
  + 0.0722 * channel(parseInt(hex.slice(5, 7), 16));
const contrastVsWhite = (hex) => 1.05 / (luminance(hex) + 0.05);

describe('Probability Lab die faces', () => {
  it('gives every die type its own silhouette, not just its own colour', () => {
    const shapes = diceGeometry();
    const signatures = SIDES.map((n) => {
      const s = shapes[n];
      return n + '=' + (s.points(BOX).length / 2) + 'v' + (s.ring ? '+ring' : '')
        + ':' + s.points(BOX).map((v) => Math.round(v)).join(',');
    });
    const bare = signatures.map((sig) => sig.slice(sig.indexOf('=') + 1));
    expect(new Set(bare).size).toBe(SIDES.length);
    // The d4/d20 collision specifically: same vertex count, so the d20 needs
    // its surrounding hexagon to stay tellable apart in greyscale.
    expect(shapes[20].ring).toBeTypeOf('function');
    expect(shapes[20].ring(BOX).length / 2).toBe(6);
    // A d10 face is a kite (4 vertices), not a triangle.
    expect(shapes[10].points(BOX).length / 2).toBe(4);
    // A d12 face is a pentagon.
    expect(shapes[12].points(BOX).length / 2).toBe(5);
  });

  it('keeps every face inside the box and every numeral inside its face', () => {
    const shapes = diceGeometry();
    for (const n of SIDES) {
      const shape = shapes[n];
      const pts = shape.points(BOX);
      for (let i = 0; i < pts.length; i++) {
        expect(pts[i], 'd' + n + ' vertex out of the viewBox').toBeGreaterThanOrEqual(-0.5);
        expect(pts[i], 'd' + n + ' vertex out of the viewBox').toBeLessThanOrEqual(BOX + 0.5);
      }
      // Widest numeral the die can roll, sized the way diceFace sizes it.
      const digits = String(n).length;
      const fontSize = BOX * (n >= 10 ? 0.32 : 0.42) * (shape.fontScale || 1);
      const baseline = BOX * shape.textCY + fontSize * 0.36;
      const halfWidth = (digits * fontSize * 0.62) / 2;
      const capTop = baseline - fontSize * 0.72;
      for (const [x, y] of [[BOX / 2 - halfWidth, baseline], [BOX / 2 + halfWidth, baseline],
        [BOX / 2 - halfWidth, capTop], [BOX / 2 + halfWidth, capTop]]) {
        expect(pointInPolygon(x, y, pts), 'numeral "' + n + '" spills outside the d' + n + ' face').toBe(true);
      }
    }
  });

  it('keeps the die palette legible as button text on white and as white numerals', () => {
    const shapes = diceGeometry();
    for (const n of [4, 6, 8, 10, 12, 20]) {
      // One colour serves both directions, so 4.5:1 against white covers the
      // die-type button label AND the white numeral painted on the face.
      expect(contrastVsWhite(shapes[n].fill), 'd' + n + ' fill ' + shapes[n].fill)
        .toBeGreaterThanOrEqual(4.5);
    }
  });

  it('does not dress an unexpected die size in the d20 face', () => {
    const shapes = diceGeometry();
    expect(shapes._).toBeTruthy();
    expect(shapes._.points(BOX)).not.toEqual(shapes[20].points(BOX));
  });
});

describe('Probability Lab distribution shape discovery', () => {
  const render = (distribHunt) =>
    renderTool('probability', { probability: { distribHunt: Object.assign({ sampleNonce: 0, log: [] }, distribHunt) } });
  const summary = (html) => (/aria-label="Expected versus observed: ([^"]+)"/.exec(html) || [])[1];
  const observed = (html) => [...summary(html).matchAll(/(\d+) of 60/g)].map((m) => Number(m[1]));

  beforeEach(() => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_probability.js', 'probability');
  });

  it('draws expected rules, observed bars and the raw draws', () => {
    const html = render({ pLow: 33, pMid: 34, pHigh: 33 });
    expect((html.match(/border-top:2px dashed/g) || []).length).toBe(3);
    expect((html.match(/width:8px;height:8px/g) || []).length).toBe(60);
    expect(summary(html)).toMatch(/low \d+ of 60/);
  });

  it('redraws the sample when a weight moves — not just the label', () => {
    const flat = render({ pLow: 33, pMid: 34, pHigh: 33 });
    const peaked = render({ pLow: 10, pMid: 80, pHigh: 10 });
    expect(summary(flat)).not.toBe(summary(peaked));
    expect(observed(peaked)[1]).toBeGreaterThan(observed(flat)[1]);
  });

  it('is deterministic per setting, and re-rolls only on New sample', () => {
    const a = render({ pLow: 20, pMid: 60, pHigh: 20 });
    const b = render({ pLow: 20, pMid: 60, pHigh: 20 });
    const c = render({ pLow: 20, pMid: 60, pHigh: 20, sampleNonce: 1 });
    expect(summary(a)).toBe(summary(b));
    expect(summary(c)).not.toBe(summary(a));
  });

  it('tracks the weights monotonically across a sweep', () => {
    const mids = [0, 25, 50, 75, 100].map((pMid) => observed(render({ pLow: 25, pMid, pHigh: 25 }))[1]);
    expect(mids[0]).toBeLessThan(mids[4]);
    expect(mids[4]).toBeGreaterThan(30);
    expect(mids[0]).toBeLessThan(5);
    // Every sample is exactly 60 draws, whatever the weights.
    for (const pMid of [0, 40, 100]) {
      expect(observed(render({ pLow: 25, pMid, pHigh: 25 })).reduce((a, b) => a + b, 0)).toBe(60);
    }
  });
});
