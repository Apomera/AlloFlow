// Coordinate Grid deep pass (2026-11-03): one regression test per confirmed bug in
// the 11-03 review (numline_coord_report.md, "Coordinate Grid" items 1-8).
// COORDGRID_DEEP_FILE points the suite at another copy (the pre-fix file must fail).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.COORDGRID_DEEP_FILE || 'stem_lab/stem_tool_coordgrid.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root = null, host = null, latest = null, xp = [], sr = [];
beforeEach(() => { resetStemLab(); loadTool(FILE, 'coordinate'); latest = null; xp = []; sr = []; });
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null;
  if (window._coordGridKeyHandler) { window.removeEventListener('keydown', window._coordGridKeyHandler); window._coordGridKeyHandler = null; }
  document.body.innerHTML = '';
});

async function mount(cg, extra) {
  if (root) { await React.act(async () => root.unmount()); root = null; }
  document.body.innerHTML = '<div id="root"></div>';
  host = document.getElementById('root');
  function App() {
    const [state, setState] = React.useState({ _coordGrid: cg });
    const [es, setEs] = React.useState({ correct: 0, total: 0 });
    latest = state._coordGrid;
    return window.StemLab._registry.coordinate.render(makeCtx(Object.assign({
      toolData: state, setToolData: setState, exploreScore: es, setExploreScore: setEs,
      awardXP: (id, amt, why) => xp.push([id, amt, why]), announceToSR: (m) => sr.push(m), addToast: () => {},
    }, extra || {})));
  }
  root = ReactDOMClient.createRoot(host);
  await React.act(async () => root.render(React.createElement(App)));
}
const click = async (el) => { await React.act(async () => { el.click(); }); };
async function type(el, value) {
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}
async function key(el, k, extra) {
  await React.act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, extra || {}))); });
}
const buttons = () => [...document.querySelectorAll('button')];
const byText = (re) => buttons().find((b) => re.test(b.textContent.trim()));
const byLabel = (l) => document.querySelector('button[aria-label="' + l + '"]');
const inputStarts = (p) => document.querySelector('input[aria-label^="' + p + '"]');
const plotBtn = () => byText(/^(Plot or remove point|Select coordinate)$/);
async function plotXY(x, y) {
  const labels = [...document.querySelectorAll('label')];
  const xi = labels.find((l) => l.textContent.startsWith('X coordinate')).querySelector('input');
  const yi = labels.find((l) => l.textContent.startsWith('Y coordinate')).querySelector('input');
  await type(xi, String(x)); await type(yi, String(y));
  await click(plotBtn());
}
function lum(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const toHex = (c) => {
  if (!c) return null;
  if (c[0] === '#') return c.length === 4 ? '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c.toLowerCase();
  const m = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  return m ? '#' + [m[1], m[2], m[3]].map((n) => (+n).toString(16).padStart(2, '0')).join('') : null;
};

describe('review 1 (HIGH): the distance answer is not on the grid before an attempt', () => {
  it('no √ formula or distance label is drawn until the item is answered', async () => {
    const DIST = { type: 'distance', p1: { x: -1, y: 2 }, p2: { x: 3, y: 5 }, distance: 5 };
    await mount({ cgTab: 'explore', gridChallenge: DIST, gridPoints: [DIST.p1, DIST.p2], gridFeedback: { distanceAnswer: '' } });
    const svgText = [...document.querySelectorAll('svg text')].map((t) => t.textContent);
    expect(svgText.filter((s) => /√|≈|d = 5|= 5\b/.test(s)), svgText.join(' | ')).toEqual([]);
    // The leg lengths are a hint now, not a default.
    expect(svgText.some((s) => /Δx = 4|Δy = 3/.test(s))).toBe(false);
  });
});

describe('review 2 (HIGH): chess "name the square" does not print its answer', () => {
  it('no label, readout, board name or announcement gives the highlighted square away', async () => {
    await mount({ cgTab: 'maps', mapScenario: 'chess', chessPracticeOn: true, chessChallenge: { type: 'name', target: 'c6' }, chessSelected: 'c6' });
    const svg = document.querySelector('#coordinate-map-panel svg');
    const texts = [...svg.querySelectorAll('text')].map((t) => t.textContent);
    expect(texts.includes('c6'), 'square label').toBe(false);
    expect((svg.getAttribute('aria-label') || '').includes('c6'), 'board label').toBe(false);
    const labels = [...svg.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label'));
    expect(labels.some((l) => /\bc6\b/.test(l)), 'square names').toBe(false);
    expect(/Selected:\s*c6/.test(document.body.textContent), 'readout').toBe(false);
  });
});

describe('review 3 (MED): slope read from the other end is correct', () => {
  it('rise -6, run -3, slope 2 for (1, 2) to (4, 8) is marked right and pays', async () => {
    const p1 = { x: 1, y: 2 }, p2 = { x: 4, y: 8 };
    await mount({ cgTab: 'explore', gridChallenge: { type: 'slope', p1, p2, slopeData: { rise: 6, run: 3, value: 2, display: '2' } }, gridPoints: [p1, p2], gridFeedback: { riseAnswer: '-6', runAnswer: '-3', slopeAnswer: '2' } });
    await click(byLabel('Check'));
    expect(latest.gridFeedback.correct).toBe(true);
    expect(latest.revealedItems || {}).toEqual({});
    expect(xp.filter((x) => x[2] === 'slope calc').length).toBe(1);
  });
});

describe('review 4 (MED): a grid action cannot erase a used hint', () => {
  it('hint, then a plot, then the right answer is still a hinted solve (reduced XP)', async () => {
    const p1 = { x: 0, y: 0 }, p2 = { x: 3, y: 2 };
    await mount({ cgTab: 'explore', gridChallenge: { type: 'slope', p1, p2, slopeData: { rise: 2, run: 3, value: 2 / 3, display: '2/3' } }, gridPoints: [p1, p2], gridFeedback: { slopeAnswer: '' } });
    await click(byLabel('Hint'));
    if (byLabel('Hint')) await click(byLabel('Hint'));
    await plotXY(-7, -7);
    await type(inputStarts('Rise'), '2');
    await type(inputStarts('Run'), '3');
    await type(inputStarts('Slope as'), '2/3');
    await click(byLabel('Check'));
    expect(latest.gridFeedback.correct).toBe(true);
    expect(latest.gridFeedback.msg).not.toMatch(/Perfect/);
    const paid = xp.filter((x) => x[2] === 'slope calc');
    expect(paid.length).toBe(1);
    expect(paid[0][1]).toBeLessThan(5);
  });
});

describe('review 5 (MED): lines live in their own state', () => {
  it('turning Connect off, or plotting, keeps the drawn lines', async () => {
    await mount({ cgTab: 'explore' });
    const connect = () => byText(/connect points|connect on/i);
    await click(connect());
    await plotXY(1, 1); await plotXY(4, 3);
    const lines = () => (latest.gridLines || (latest.gridFeedback && latest.gridFeedback.lines) || []).length;
    expect(lines()).toBe(1);
    await click(connect());
    expect(lines(), 'after Connect off').toBe(1);
    await plotXY(-2, -2);
    expect(lines(), 'after a plain plot').toBe(1);
  });
});

describe('review 6 (MED): a swapped ordered pair is named', () => {
  it('(-5, 3) for (3, -5) says the coordinates were swapped', async () => {
    await mount({ cgTab: 'explore', gridChallenge: { type: 'plot', target: { x: 3, y: -5 } }, gridPoints: [{ x: -5, y: 3 }] });
    await click(byLabel('Check'));
    expect(latest.gridFeedback.correct).toBe(false);
    expect(latest.gridFeedback.msg).toMatch(/swap/i);
  });
});

describe('review 7 (MED): keyboard, dark mode and responsive grids', () => {
  it('chess: one Tab stop, the arrow keys move, Enter selects', async () => {
    await mount({ cgTab: 'maps', mapScenario: 'chess', chessSelected: 'e4' });
    const squares = [...document.querySelectorAll('#coordinate-map-panel svg rect')];
    const stops = squares.filter((r) => r.getAttribute('tabindex') === '0');
    expect(stops.length).toBe(1);
    await key(stops[0], 'ArrowRight');
    const now = [...document.querySelectorAll('#coordinate-map-panel svg rect')].find((r) => r.getAttribute('tabindex') === '0');
    await key(now, 'Enter');
    expect(latest.chessSelected).toBe('f4');
  });

  it('battleship: one Tab stop instead of 100', async () => {
    await mount({ cgTab: 'maps', mapScenario: 'battleship', bsShips: [{ size: 2, cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }] }], bsShots: [] });
    const cells = [...document.querySelectorAll('#coordinate-map-panel svg rect')];
    expect(cells.filter((r) => r.getAttribute('tabindex') === '0').length).toBe(1);
    const stop = cells.find((r) => r.getAttribute('tabindex') === '0');
    await key(stop, 'ArrowRight');
    const next = [...document.querySelectorAll('#coordinate-map-panel svg rect')].find((r) => r.getAttribute('tabindex') === '0');
    await key(next, 'Enter');
    expect(latest.bsShots).toEqual([{ x: 1, y: 0, hit: true }]);
  });

  it('world map: a keyboard user can place a pin and answer a practice question', async () => {
    await mount({ cgTab: 'maps', mapScenario: 'world', worldPracticeOn: true, worldChallenge: { lat: 35.68, lon: 139.69, cityName: 'Tokyo, Japan', cityId: 'tokyo' } });
    const lat = [...document.querySelectorAll('label')].find((l) => l.textContent.startsWith('Latitude'));
    const lon = [...document.querySelectorAll('label')].find((l) => l.textContent.startsWith('Longitude'));
    expect(lat && lon, 'typed latitude and longitude boxes').toBeTruthy();
    await type(lat.querySelector('input'), '36');
    await type(lon.querySelector('input'), '140');
    await click(byText(/check my guess/i));
    expect(latest.worldFeedback && latest.worldFeedback.correct).toBe(true);
  });

  it('dark mode: grid axes and lines stand out from the grid surface (3:1)', async () => {
    await mount({ cgTab: 'explore' }, { isDark: true });
    const svg = document.querySelector('svg.allo-cg-grid') || document.querySelector('#coordinate-section-panel svg');
    const bg = toHex(svg.style.background || svg.style.backgroundColor);
    const strokes = [...new Set([...svg.querySelectorAll('line')].map((l) => l.getAttribute('stroke')))];
    expect(bg).toBeTruthy();
    for (const s of strokes) expect(ratio(toHex(s), bg), s + ' on ' + bg).toBeGreaterThanOrEqual(3);
  });

  it('grids scale to their box (viewBox), not a fixed 400 or 500 pixels', async () => {
    await mount({ cgTab: 'explore' });
    const g = document.querySelector('#coordinate-section-panel svg');
    expect(g.getAttribute('viewBox')).toBe('0 0 400 400');
    expect(g.getAttribute('width')).not.toBe('400');
    await mount({ cgTab: 'maps', mapScenario: 'world' });
    const w = document.querySelector('#coordinate-map-panel svg');
    expect(w.getAttribute('viewBox')).toBeTruthy();
    expect(w.getAttribute('width')).not.toBe('500');
  });
});

describe('review 8 (LOW)', () => {
  it('the Quadrant Tour clamps an off-grid focus point onto the grid', async () => {
    await mount({ cgTab: 'quadrants', qtPointX: 15, qtPointY: -14 });
    const c = document.querySelector('svg.allo-cg-grid g.allo-cg-point-pulse circle');
    expect(+c.getAttribute('cx')).toBeLessThanOrEqual(400);
    expect(+c.getAttribute('cy')).toBeLessThanOrEqual(400);
  });

  it('R on a focused button no longer wipes the grid; Clear can be undone', async () => {
    const pts = [{ x: 1, y: 2 }, { x: -3, y: 4 }];
    await mount({ cgTab: 'explore', gridPoints: pts });
    const anyButton = document.querySelector('[data-coordinate-theme] button');
    await key(anyButton, 'r');
    await key(anyButton, 'c');
    expect(latest.gridPoints).toEqual(pts);
    await click(byLabel('Clear'));
    expect(latest.gridPoints).toEqual([]);
    await click(byText(/undo clear/i));
    expect(latest.gridPoints).toEqual(pts);
  });

  it('the world map marker text stays as it is, wrapped in t()', async () => {
    const seen = [];
    await mount({ cgTab: 'maps', mapScenario: 'world', worldCity: 'portland_me' }, { t: (k, fb) => { seen.push(k); return fb; } });
    expect(seen).toContain('stem.coordgrid.aaron_is_here');
    expect(document.body.textContent).toContain('Aaron is here!');
  });
});
