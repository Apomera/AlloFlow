import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The stage words are placed by fractions of the canvas, tuned on a wide desktop scene. The bar
// over the canvas (title block + weather chips) is a DOM overlay measured in CSS pixels, so the
// narrower the canvas the larger the share of it that bar covers.
//
// ★ Found by adding a CANVAS CROP to the phone-viewport pass of dev-tools/wc_scene_shots.cjs.
// The mobile shots were full-page only, which renders the scene a few hundred pixels wide inside
// an 8,000px column — far too small to judge anything drawn on it. Cropped, two collisions were
// immediately obvious and had presumably always been there: "Condensation" sat entirely behind the
// title block, and the long "INVISIBLE VAPOR — PATH SHOWN" callout ran straight through
// "Precipitation". Neither is visible at desktop width, the only width ever looked at.
//
// Evidence callouts have arrows drawn to them, so they may only RESERVE space. Stage labels carry
// no arrow, so they step down until clear.
const PATHS = [
  resolve(process.cwd(), 'stem_lab/stem_tool_watercycle.js'),
  resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'),
];
const src = readFileSync(PATHS[0], 'utf8');

function slicePlacement(text) {
  const start = text.indexOf('            var wcLabelRects2d = [];');
  const end = text.indexOf('            function evidenceLabel2d(', start);
  expect(start, 'placement helpers present').toBeGreaterThan(-1);
  expect(end, 'placement helpers bounded').toBeGreaterThan(start);
  // cW/cH/dpr/tick/canvasEl come from the draw scope; a canvas whose rect has no width makes the
  // chrome measurement return nothing, so a test controls the blockers entirely through reserve().
  // eslint-disable-next-line no-new-func
  return new Function('cW', 'cH', 'dpr', 'tick', 'canvasEl', text.slice(start, end) + `
    return { overlap: wcRectsOverlap2d, place: wcPlaceLabelY2d, reserve: wcReserveLabelRect2d,
      rects: wcLabelRects2d, chrome: wcCanvasChromeRects2d };`);
}
const build = (canvasEl) => slicePlacement(src)(1040, 520, 1, 0,
  canvasEl || { parentElement: null, getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }) });

describe('Water Cycle canvas label placement', () => {
  it('treats touching edges as clear and true overlap as a clash', () => {
    const { overlap } = build();
    const a = { x: 0, y: 0, w: 10, h: 10 };
    expect(overlap(a, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
    expect(overlap(a, { x: 0, y: 10, w: 10, h: 10 })).toBe(false);
    expect(overlap(a, { x: 9, y: 9, w: 10, h: 10 })).toBe(true);
    expect(overlap(a, { x: 2, y: 2, w: 2, h: 2 })).toBe(true);
  });

  it('steps a label clear of one already placed at the same spot', () => {
    const api = build();
    const first = api.place(100, 100, 120, 19);
    expect(first).toBe(100);
    const second = api.place(100, 100, 120, 19);
    expect(second).toBeGreaterThanOrEqual(119);
    // Once moved, it must not overlap the one it was avoiding.
    expect(api.overlap({ x: 100, y: second, w: 120, h: 19 }, { x: 100, y: first, w: 120, h: 19 })).toBe(false);
  });

  it('steps clear of reserved chrome without being asked to move it', () => {
    const api = build();
    // Stand in for the title block over the top-left of the canvas.
    api.reserve(10, 10, 260, 60);
    const y = api.place(60, 30, 130, 19);
    expect(y).toBeGreaterThan(30);
    expect(api.overlap({ x: 60, y, w: 130, h: 19 }, { x: 10, y: 10, w: 260, h: 60 })).toBe(false);
  });

  it('leaves a label where it was asked rather than dropping it when nothing is free', () => {
    const api = build();
    // Fill the whole column below the target so no step can succeed.
    for (let y = 0; y < 520; y += 5) api.reserve(0, y, 1040, 19);
    const y = api.place(100, 300, 120, 19);
    expect(y).toBe(300);
    // A label is never lost, even in the impossible case.
    expect(api.rects.some((r) => r.y === 300)).toBe(true);
  });

  it('survives a canvas with no measurable chrome', () => {
    // The measurement is an enhancement wrapped in try/catch: a detached canvas, a zero-size rect
    // or a missing parent must never stop a frame.
    expect(() => build().chrome()).not.toThrow();
    expect(build().chrome()).toEqual([]);
    const hostile = { get parentElement() { throw new Error('detached'); }, getBoundingClientRect: () => ({ left: 0, top: 0, width: 9, height: 9 }) };
    expect(() => build(hostile).chrome()).not.toThrow();
  });

  it('is wired: evidence reserves, stages step, and the register clears each frame', () => {
    // An evidence callout has an arrow pointing at it, so it registers where it is and stays.
    expect(src).toContain('wcReserveLabelRect2d(x - paddingX, y - 9 * dpr, labelWidth, 18 * dpr);');
    // A stage label has no arrow, so it may move.
    expect(src).toContain('stageLabelY2d = wcPlaceLabelY2d(stageLabelX2d - 4 * dpr, stageLabelY2d - 14 * dpr, stageLabelWidth2d + 8 * dpr, 19 * dpr) + 14 * dpr;');
    // Without the reset the register would grow every frame and eventually push every label away.
    expect(src).toContain('wcLabelRects2d.length = 0;');
    expect(src.indexOf('wcLabelRects2d.length = 0;'))
      .toBeLessThan(src.indexOf('drawMatterEnergyEvidence2d(activeProcess2d'));
    expect(readFileSync(PATHS[0], 'utf8')).toBe(readFileSync(PATHS[1], 'utf8'));
  });
});
