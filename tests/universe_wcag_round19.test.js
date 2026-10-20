// Universe Explorer WCAG 2.2 pass (2026-10-19). Fixes found by a whole-tool audit (axe A/AA/2.2 plus
// reflow at 320 px, target size, focus indication, text spacing, motion):
//   1.4.10 reflow   the speed-race select was 370 px wide and pushed a 320 px page to 429 px;
//   2.5.8 targets   sliders 4 and 16 px tall, an 18 px checkbox and an 8 px colour bar of clickable segments;
//   4.1.2 state     the spectral colour bar showed which class is chosen only by position.
//
// UNIVERSE_TOOL_UNDER_TEST points the suite at another copy, for mutation checks.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { sliceBetween } from './helpers/anchored_slice.js';

const TOOL = process.env.UNIVERSE_TOOL_UNDER_TEST || 'stem_lab/stem_tool_universe.js';
const SRC = readFileSync(TOOL, 'utf8');
let pure;
beforeAll(() => { resetStemLab(); loadTool(TOOL, 'universe'); pure = window.__universePure; });
const rule = (selector) => sliceBetween(SRC, selector + '{', '}', { label: selector });
const render = (state) => renderTool('universe', { universe: Object.assign({ tutorialDismissed: true }, state) });
const bar = (state) => sliceBetween(render(Object.assign({ showSpectral: true }, state)), 'class="uni-spectral-bar', 'Hottest (O)');

describe('1.4.10 reflow (source)', () => {
  it('keeps the race-destination select inside its container', () => {
    expect(rule('[data-universe-tool] .uni-race-head select').includes('max-width:100%')).toBe(true);
  });
});

describe('2.5.8 target size (source)', () => {
  it('gives every slider a 24 px hit area and keeps thin tracks thin', () => {
    expect(rule('[data-universe-tool] input[type=range]').includes('min-height:24px')).toBe(true);
    const thin = rule('[data-universe-tool] input[type=range].appearance-none');
    expect(thin.includes('height:24px') && thin.includes('padding:10px 0') && thin.includes('background-clip:content-box')).toBe(true);
  });

  it('makes checkboxes and the evidence-review box at least 24 px', () => {
    expect(rule('[data-universe-tool] input[type=checkbox]').includes('min-width:24px')).toBe(true);
    const review = rule('[data-universe-tool] .uni-review-check input');
    expect(review.includes('width:24px') && review.includes('height:24px')).toBe(true);
    expect(SRC.includes('width:18px;height:18px;flex:none')).toBe(false);
  });

  it('gives a stand-alone external link a 24 px target without touching links inside sentences', () => {
    const link = rule('[data-universe-tool] p > a[target=_blank]:only-child');
    expect(link.includes('min-height:24px')).toBe(true);
    expect(SRC.includes('[data-universe-tool] a[target=_blank]{')).toBe(false);
  });

  it('makes the spectral colour bar 24 px tall, even on hover', () => {
    expect(rule('[data-universe-tool] .uni-spectral-bar').includes('height:24px')).toBe(true);
    expect(rule('[data-universe-tool] .uni-spectral-bar > div').includes('height:100%')).toBe(true);
  });
});

describe('4.1.2 spectral colour bar (rendered)', () => {
  const pressed = (html) => (html.match(/aria-pressed="true"/g) || []).length;

  it('exposes which class is chosen, and only one', () => {
    const html = bar({ spectralIdx: 2 });
    expect(pressed(html)).toBe(1);
    const at = (idx) => bar({ spectralIdx: idx }).split('<div role="button"').slice(1).findIndex((seg) => seg.includes('aria-pressed="true"'));
    expect(at(0)).toBe(0);
    expect(at(2)).toBe(2);
    expect(at(6)).toBe(6);
  });

  it('defaults to G (index 4) and ignores a bad index', () => {
    const at = (state) => bar(state).split('<div role="button"').slice(1).findIndex((seg) => seg.includes('aria-pressed="true"'));
    expect(at({})).toBe(4);
    expect(at({ spectralIdx: 99 })).toBe(4);
    expect(at({ spectralIdx: -1 })).toBe(4);
  });

  it('keeps all seven segments keyboard reachable', () => {
    const segs = bar({}).split('<div role="button"').slice(1);
    expect(segs.length).toBe(7);
    segs.forEach((seg) => expect(seg.includes('tabindex="0"')).toBe(true));
  });
});

// ── 1.4.11 non-text contrast: ratios are computed from the colours in the CSS itself ──
const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const colourIn = (css, re) => { const m = re.exec(css); expect(m, 'colour not found in: ' + css.slice(0, 80)).toBeTruthy(); return m[1]; };
const SURFACES = { white: '#ffffff', page: '#f4f7fc', darkPage: '#080f1f', darkPanel: '#111d32', slateCard: '#334155' };

describe('1.4.11 field and slider contrast (source)', () => {
  it('draws select borders at 3:1 or better on white and on the dark panel', () => {
    ['[data-universe-tool] .uni-race-head select', '[data-universe-tool] .uni-transit-controls select', '[data-universe-tool] .uni-whatif-input'].forEach((sel) => {
      const c = colourIn(rule(sel), /border:1px solid (#[0-9a-f]{6})/);
      expect(ratio(c, SURFACES.white), sel + ' on white').toBeGreaterThanOrEqual(3);
      expect(ratio(c, SURFACES.darkPanel), sel + ' on dark panel').toBeGreaterThanOrEqual(3);
    });
  });

  it('brightens the What-If field border on the dark slate card it sits on', () => {
    const c = colourIn(rule('[data-universe-tool][data-uni-theme=dark] .uni-whatif-input'), /border-color:(#[0-9a-f]{6})/);
    expect(ratio(c, SURFACES.slateCard)).toBeGreaterThanOrEqual(3);
  });

  it('draws the search field border at 3:1 on both page colours', () => {
    const c = colourIn(rule('[data-universe-tool] #universe-topic-search'), /border-color:(#[0-9a-f]{6})!important/);
    expect(ratio(c, SURFACES.page)).toBeGreaterThanOrEqual(3);
    expect(ratio(c, SURFACES.darkPage)).toBeGreaterThanOrEqual(3);
  });

  it('draws the unfilled timeline track at 3:1 on both page colours', () => {
    const track = sliceBetween(SRC, '#universe-cosmic-time::-webkit-slider-runnable-track{', '}');
    const c = colourIn(track, /var\(--uni-position\),(#[0-9a-f]{6}) var\(--uni-position\)\)/);
    expect(ratio(c, SURFACES.page)).toBeGreaterThanOrEqual(3);
    expect(ratio(c, SURFACES.darkPage)).toBeGreaterThanOrEqual(3);
  });

  it('draws thin slider tracks at 3:1 on white and on the dark card', () => {
    const c = colourIn(rule('[data-universe-tool] input[type=range].appearance-none'), /background-color:(#[0-9a-f]{6})/);
    expect(ratio(c, SURFACES.white)).toBeGreaterThanOrEqual(3);
    expect(ratio(c, SURFACES.darkPage)).toBeGreaterThanOrEqual(3);
  });
});

describe('1.4.3 class letters on the spectral circles', () => {
  const circles = (state) => render(Object.assign({ showSpectral: true }, state)).split('<button aria-label="Select spectral class ').slice(1);

  it('picks readable ink for any colour, shading the circle only when it has to', () => {
    ['#6366f1', '#818cf8', '#c4b5fd', '#fde68a', '#fbbf24', '#fb923c', '#ef4444', '#ffffff', '#000000', '#808080'].forEach((hex) => {
      const { ink, bg } = pure.universeReadableInk(hex);
      expect(pure.universeContrast(bg, ink), hex).toBeGreaterThanOrEqual(4.5);
    });
    expect(pure.universeReadableInk('#fde68a')).toEqual({ ink: '#0f172a', bg: '#fde68a' });
    expect(pure.universeReadableInk('#6366f1').bg).not.toBe('#6366f1');
  });

  it('renders every class letter at 4.5:1 or better, with no opacity dimming', () => {
    const btns = circles({});
    expect(btns.length).toBe(7);
    btns.forEach((b) => {
      const bg = /background:(#[0-9a-f]{6})/.exec(b), fg = /[^-]color:(#[0-9a-f]{6})/.exec(b);
      expect(bg && fg, b.slice(0, 120)).toBeTruthy();
      expect(pure.universeContrast(bg[1], fg[1]), b.slice(0, 40)).toBeGreaterThanOrEqual(4.5);
      expect(b.includes('opacity-60'), 'opacity lowers contrast').toBe(false);
    });
  });

  it('keeps the large class letter in the card header readable too', () => {
    [0, 3, 4, 6].forEach((idx) => {
      const html = render({ showSpectral: true, spectralIdx: idx });
      const m = /w-12 h-12 rounded-full[^>]*style="background:(#[0-9a-f]{6});color:(#[0-9a-f]{6})/.exec(html);
      expect(m, 'header circle for class ' + idx).toBeTruthy();
      expect(pure.universeContrast(m[1], m[2])).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('exposes which circle is chosen', () => {
    const btns = circles({ spectralIdx: 3 });
    const pressed = btns.map((b) => b.includes('aria-pressed="true"'));
    expect(pressed).toEqual([false, false, false, true, false, false, false]);
  });
});
