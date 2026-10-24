// Universe Explorer, twelfth pass (2026-10-19): a body silhouette filled by where its atoms
// were made, an exoplanet size line-up to scale, and telescope mirrors drawn to scale beside
// a person (Webb's 18 segments, the ELT's hundreds).
//
// UNIVERSE_TOOL_UNDER_TEST points the suite at another copy, for mutation checks.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { sliceBetween } from './helpers/anchored_slice.js';

const TOOL = process.env.UNIVERSE_TOOL_UNDER_TEST || 'stem_lab/stem_tool_universe.js';
let pure;
beforeAll(() => { resetStemLab(); loadTool(TOOL, 'universe'); pure = window.__universePure; });
const render = (state) => renderTool('universe', { universe: Object.assign({ tutorialDismissed: true }, state) });
const count = (html, text) => html.split(text).length - 1;
const svgOf = (html, start) => sliceBetween(html, start, '</svg>', { label: start });

describe('Planet sizes (pure)', () => {
  it('uses measured sizes for our planets and typical sizes inside each card’s range', () => {
    const r = Object.fromEntries(pure.UNIVERSE_PLANET_SIZES.map((p) => [p.id, p.r]));
    expect(r.earth).toBe(1);
    expect(r.neptune).toBeCloseTo(3.88, 2);
    expect(r.jupiter).toBeCloseTo(11.21, 2);
    expect(r.super).toBeGreaterThanOrEqual(1.2); expect(r.super).toBeLessThanOrEqual(2);
    expect(r.mini).toBeGreaterThanOrEqual(2); expect(r.mini).toBeLessThanOrEqual(4);
    expect(r.hotjup / r.jupiter).toBeGreaterThanOrEqual(1); expect(r.hotjup / r.jupiter).toBeLessThanOrEqual(2);
  });
});

describe('Exoplanet line-up (rendered)', () => {
  it('draws every planet to the same scale', () => {
    const svg = svgOf(render({ showExoplanets: true }), 'How big are they?');
    expect(count(svg, 'data-planet="')).toBe(6);
    const radius = (id) => parseFloat(new RegExp('data-planet="' + id + '"><circle cx="[^"]+" cy="[^"]+" r="([^"]+)"').exec(svg)[1]);
    expect(radius('jupiter') / radius('earth')).toBeCloseTo(11.21, 2);
    expect(radius('neptune') / radius('earth')).toBeCloseTo(3.88, 2);
  });
});

describe('Atoms-by-origin figure (rendered)', () => {
  const done = { 0: 'massive', 1: 'lowmass', 2: 'bigbang', 3: 'lowmass', 4: 'massive', 5: 'massive', 6: 'whitedwarf', 7: 'merger', 8: 'merger' };
  it('appears once every element is placed, with bands sized by share of mass', () => {
    expect(render({ showElements: true, elementSort: { 0: 'massive' } }).includes('class="uni-body-figure"')).toBe(false);
    const svg = svgOf(render({ showElements: true, elementSort: done }), 'class="uni-body-figure"');
    const band = (id) => parseFloat(new RegExp('height="([^"]+)" fill="[^"]+" data-src="' + id + '"').exec(svg)[1]) - 0.6;
    const origin = pure.universeBodyByOrigin();
    expect(count(svg, 'data-src="')).toBe(3);
    expect(band('massive') / band('bigbang')).toBeCloseTo(origin.massive / origin.bigbang, 1);
    expect(band('lowmass') / band('bigbang')).toBeCloseTo(origin.lowmass / origin.bigbang, 1);
  });
});

describe('Mirrors to scale (rendered)', () => {
  const mirror = (m) => svgOf(render({ showTelescopes: true, telescopeGuess: 0, telescopeLogD: Math.log10(m) }), 'class="uni-lab-svg uni-mirror-scale"');
  it('draws Webb as 18 segments and the ELT as hundreds', () => {
    expect(count(mirror(6.5), '<polygon')).toBe(18);
    const elt = count(mirror(39), '<polygon');
    expect(elt).toBeGreaterThan(700); expect(elt).toBeLessThan(950);
    expect(count(mirror(2.4), '<polygon')).toBe(0);
  });

  it('keeps the person and the mirror on one scale', () => {
    const hubble = mirror(2.4), eye = mirror(0.007);
    expect(parseFloat(/class="uni-mirror-disc" cx="[^"]+" cy="[^"]+" r="([^"]+)"/.exec(hubble)[1])).toBeCloseTo(66, 3);
    expect(eye.includes('stroke="#fde047"'), 'a pointer finds a pupil-sized mirror').toBe(true);
    expect(hubble.includes('stroke="#fde047"')).toBe(false);
  });
});
