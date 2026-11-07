// Area & Perimeter Lab engagement build (2026-11-04): the Tile Explorer hides
// its totals until the student counts (or predicts), paints by dragging and by
// Shift + arrow keys, and walks the fence unit by unit; the default tab and
// "Start"/"Open" follow the band's path and land focus on the activity; the
// top is folded to a "Next" line and the starred tabs plus "More activities".
// AP_FILE lets the fail-first checks run against the start copy.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.AP_FILE || 'stem_lab/stem_tool_areaperimeter.js';
const ID = 'areaPerimeter';
let root = null;

beforeEach(() => {
  resetStemLab();
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(async () => {
  if (root) await React.act(async () => { root.unmount(); });
  root = null;
  delete Element.prototype.scrollIntoView;
});

async function mount(initial, overrides = {}) {
  if (root) { await React.act(async () => { root.unmount(); }); root = null; }
  document.body.innerHTML = '<div id="root"></div>';
  const tool = loadTool(FILE, ID);
  let latest;
  function App() {
    const [state, setState] = React.useState(initial);
    latest = state;
    return tool.render(makeCtx(Object.assign({ toolData: state, setToolData: setState }, overrides)));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  return () => latest._areaPerimeter || {};
}
function button(label) {
  return [...document.querySelectorAll('button')].find((el) => el.textContent.trim() === label || el.getAttribute('aria-label') === label);
}
async function click(label) {
  const el = button(label);
  expect(el, label).toBeTruthy();
  await React.act(async () => { el.click(); });
}
async function clickTile(key) {
  await React.act(async () => { document.querySelector(`[data-ap-tile="${key}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true })); });
}
async function key(el, k, extra = {}) {
  await React.act(async () => { el.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true }, extra))); });
}
async function settle(ms = 120) {
  await React.act(async () => { await new Promise((r) => setTimeout(r, ms)); });
}
const metric = (k) => document.querySelector(`[data-ap-metric="m-${k}"]`) || [...document.querySelectorAll('#ap-mode-panel div')].find((el) => el.children.length === 0 && el.textContent === (k === 'area' ? 'Area' : 'Perimeter')).parentElement;
const metricValue = (k) => metric(k).children[1].textContent;
const panelText = () => document.getElementById('ap-mode-panel').textContent;
const tabIds = () => [...document.querySelectorAll('[role="tab"]')].map((el) => el.id.replace('ap-tab-', ''));

describe('the Tile Explorer hides its totals until they are counted or predicted', () => {
  it('shows no area or perimeter on any route before counting (text, desc, text alternative, announcements)', async () => {
    const speak = vi.fn();
    await mount({ _areaPerimeter: { mode: 'explore', width: 6, height: 4 } }, { announceToSR: speak });
    expect(metricValue('area')).toBe('?');
    expect(metricValue('perimeter')).toBe('?');
    const text = panelText();
    expect(text).not.toMatch(/24 square units|20 units|of 24|\/ 24|6 × 4|2\(6 \+ 4\)/);
    expect(document.getElementById('ap-explore-desc').textContent).not.toMatch(/24|20/);
    expect(document.querySelector('[data-ap-explore-text-alt]').textContent).not.toMatch(/24|20/);
    expect(document.querySelector('[aria-label="Rectangle measurements"]')).toBeNull();
    expect(document.querySelector('[data-ap-tile-count]').textContent).toBe('Tiles counted: 0');
    // Every aria-label / title in the activity is free of the totals too.
    const attrs = [...document.querySelectorAll('#ap-mode-panel [aria-label], #ap-mode-panel title, #ap-mode-panel desc')].map((el) => el.getAttribute('aria-label') || el.textContent);
    expect(attrs.filter((a) => /\b(24|20)\b/.test(a))).toEqual([]);
    await clickTile('0-0');
    await clickTile('1-0');
    expect(speak.mock.calls.at(-1)[0]).toBe('Revealed the unit square at column 2, row 1. 2 revealed so far.');
    await click('Play the perimeter as sound');
    expect(speak.mock.calls.at(-1)[0]).not.toMatch(/20|in all/);
  });

  it('shows the area when the last square is counted, and says so once', async () => {
    const speak = vi.fn();
    const state = await mount({ _areaPerimeter: { mode: 'explore', width: 3, height: 2 } }, { announceToSR: speak });
    for (const k of ['0-0', '1-0', '2-0', '0-1', '1-1']) await clickTile(k);
    expect(metricValue('area')).toBe('?');
    await clickTile('2-1');
    expect(metricValue('area')).toBe('6 square units');
    expect(metricValue('perimeter')).toBe('?');
    expect(speak.mock.calls.at(-1)[0]).toContain('You counted every square. The area is 6 square units.');
    expect(state().areaSeenFor).toBe('3x2');
    expect(state().revealedBest).toBe(6);
    // Un-painting a square keeps the area the student counted.
    await clickTile('0-0');
    expect(metricValue('area')).toBe('6 square units');
    expect(speak.mock.calls.filter((c) => /You counted every square/.test(c[0]))).toHaveLength(1);
  });

  it('Reveal all is a reveal, not a count: no revealedBest, and gone when the teacher turns reveals off', async () => {
    const state = await mount({ _areaPerimeter: { mode: 'explore', width: 6, height: 4, revealedBest: 3 } });
    await click('Reveal all');
    expect(metricValue('area')).toBe('24 square units');
    expect(state().revealedBest).toBe(3);
    loadTool(FILE, ID);
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { mode: 'explore', teacherNoReveal: true } });
    expect(button('Reveal all')).toBeUndefined();
  });

  it('keeps the totals hidden while predicting and shows both after the check', async () => {
    const state = await mount({ _areaPerimeter: { mode: 'explore', width: 4, height: 3, predictMeasurements: true, revealedTiles: Object.fromEntries(['0-0', '1-0', '2-0', '3-0', '0-1', '1-1', '2-1', '3-1', '0-2', '1-2', '2-2', '3-2'].map((k) => [k, true])) } });
    expect(metricValue('area')).toBe('?');
    expect(metricValue('perimeter')).toBe('?');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    for (const [id, value] of [['ap-predict-area', '12'], ['ap-predict-perimeter', '14']]) {
      const input = document.getElementById(id);
      await React.act(async () => { setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
    }
    await click('Check my prediction');
    expect(state().measurementsShown).toBe(true);
    expect(metricValue('area')).toBe('12 square units');
    expect(metricValue('perimeter')).toBe('14 units');
  });
});

describe('walk the fence', () => {
  it('walks unit by unit and shows the perimeter only when the walk is back at the start', async () => {
    const speak = vi.fn();
    const state = await mount({ _areaPerimeter: { mode: 'explore', width: 6, height: 4 } }, { announceToSR: speak });
    for (let i = 1; i < 20; i += 1) await click('Walk one unit');
    expect(document.querySelector('[data-ap-walk-status]').textContent).toBe('Units walked: 19');
    expect(metricValue('perimeter')).toBe('?');
    expect(speak.mock.calls.at(-1)[0]).toBe('Units walked: 19');
    expect(document.getElementById('ap-explore-desc').textContent).not.toContain('20');
    await click('Walk one unit');
    expect(metricValue('perimeter')).toBe('20 units');
    expect(speak.mock.calls.at(-1)[0]).toBe('Back at the start. You walked 20 units all the way around, so the perimeter is 20 units.');
    expect(state().perimeterSeenFor).toBe('6x4');
    expect(document.querySelector('[data-ap-walker]').getAttribute('data-ap-walker')).toBe('20');
    await click('Walk the fence again');
    expect(state().boundaryWalk).toEqual({ sig: '6x4', n: 0 });
    expect(metricValue('perimeter')).toBe('20 units');
  });

  it('counts a pointer walk only along the fence, one step at a time, never across the inside', () => {
    loadTool(FILE, ID);
    const P = window.AreaPerimeterPure;
    // The fence path is the perimeter, unit by unit, clockwise from the top-left.
    expect(P.fencePoint(6, 4, 0)).toEqual({ x: 0, y: 0 });
    expect(P.fencePoint(6, 4, 6)).toEqual({ x: 6, y: 0 });
    expect(P.fencePoint(6, 4, 10)).toEqual({ x: 6, y: 4 });
    expect(P.fencePoint(6, 4, 16)).toEqual({ x: 0, y: 4 });
    expect(P.fencePoint(6, 4, 20)).toEqual({ x: 0, y: 0 });
    // A drag along the top edge counts each unit.
    let n = 0;
    for (const x of [0.4, 1.1, 1.9, 3.0, 4.2, 5.0, 6.0]) n = P.stepWalk(n, 6, 4, x, -0.3, 1);
    expect(n).toBe(6);
    // A jump to the far side, or a point inside the rectangle, does not count.
    expect(P.stepWalk(6, 6, 4, 0.2, 4.1, 1)).toBe(6);
    expect(P.stepWalk(6, 6, 4, 3, 2, 1)).toBe(6);
    // Down the right side and on round to the start: the walk ends at the perimeter.
    for (let s = 7; s <= 20; s += 1) { const p = P.fencePoint(6, 4, s); n = P.stepWalk(n, 6, 4, p.x + 0.1, p.y, 1); }
    expect(n).toBe(20);
    expect(P.stepWalk(20, 6, 4, 0.5, 0, 1)).toBe(20);
    // Every rectangle: walking every unit reaches exactly 2(w + h).
    for (let w = 1; w <= 20; w += 1) for (let h = 1; h <= 16; h += 1) {
      let k = 0;
      for (let s = 1; s <= 2 * (w + h); s += 1) { const p = P.fencePoint(w, h, s); k = P.stepWalk(k, w, h, p.x, p.y, 0.5); }
      expect(k, w + 'x' + h).toBe(2 * (w + h));
    }
  });
});

describe('paint with the keyboard: Shift + arrow keys', () => {
  it('paints the square you leave and the one you reach; a plain arrow only moves', async () => {
    const speak = vi.fn();
    const state = await mount({ _areaPerimeter: { mode: 'explore', width: 4, height: 2 } }, { announceToSR: speak });
    const first = document.querySelector('[data-ap-tile="0-0"]');
    first.focus();
    await key(first, 'ArrowRight');
    expect(state().revealedTiles || {}).toEqual({});
    expect(document.activeElement.getAttribute('data-ap-tile')).toBe('1-0');
    await key(document.activeElement, 'ArrowRight', { shiftKey: true });
    expect(state().revealedTiles).toEqual({ '1-0': true, '2-0': true });
    expect(document.activeElement.getAttribute('data-ap-tile')).toBe('2-0');
    expect(speak.mock.calls.at(-1)[0]).toBe('Revealed the unit square at column 3, row 1. 2 revealed so far.');
    await key(document.activeElement, 'ArrowDown', { shiftKey: true });
    expect(Object.keys(state().revealedTiles).sort()).toEqual(['1-0', '2-0', '2-1']);
  });

  it('maps pointer positions to squares and the corner handle to whole units inside the drawing', () => {
    loadTool(FILE, ID);
    const P = window.AreaPerimeterPure;
    const L = P.tileLayout(6, 4);
    expect(L.cell).toBe(46);
    expect(P.cellAtPoint(L, 6, 4, L.originX + 46 * 2.5, L.originY + 46 * 0.5)).toEqual({ c: 2, r: 0 });
    expect(P.cellAtPoint(L, 6, 4, L.originX - 1, L.originY + 3)).toBeNull();
    expect(P.resizeFromPoint(L, L.originX + 46 * 8.2, L.originY + 46 * 2.6)).toEqual({ w: 8, h: 3 });
    // The handle cannot drag the rectangle out of the drawing or below 1 x 1.
    const far = P.resizeFromPoint(L, 5000, 5000);
    expect(L.originX + far.w * L.cell).toBeLessThanOrEqual(630 + 1e-9);
    expect(L.originY + far.h * L.cell).toBeLessThanOrEqual(386 + 1e-9);
    expect(P.resizeFromPoint(L, -50, -50)).toEqual({ w: 1, h: 1 });
    // A letterboxed SVG ("meet" scaling) maps client pixels back to the viewBox.
    expect(P.svgPointFromBox({ left: 0, top: 0, width: 1280, height: 390 }, 640, 195, 640, 390)).toEqual({ x: 320, y: 195 });
  });
});

describe('the default tab and Start/Open follow the band path', () => {
  it('opens the next path step on a first visit (with that step’s problem), and pins it on the first action', async () => {
    loadTool(FILE, ID);
    document.body.innerHTML = renderTool(ID, {}, { gradeLevel: '5th Grade' });
    expect(document.getElementById('ap-mode-panel').getAttribute('aria-labelledby')).toBe('ap-tab-challenge');
    const P = window.AreaPerimeterPure;
    const grade = document.querySelector('[data-challenge-grade]').getAttribute('data-challenge-grade');
    const type = document.querySelector('[data-challenge-type]').getAttribute('data-challenge-type');
    expect(grade).toBe('4');
    expect(['rect_area', 'rect_perimeter', 'missing_side_area', 'missing_side_perimeter', 'square_side']).toContain(type);
    document.body.innerHTML = renderTool(ID, {}, { gradeLevel: '3rd Grade' });
    expect(document.getElementById('ap-mode-panel').getAttribute('aria-labelledby')).toBe('ap-tab-explore');
    // Grade 3 with the tile step done: the next step (Same Fence Lab) opens.
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { revealedBest: 20 } }, { gradeLevel: '3rd Grade' });
    expect(document.getElementById('ap-mode-panel').getAttribute('aria-labelledby')).toBe('ap-tab-fence');
    document.body.innerHTML = renderTool(ID, {}, { gradeLevel: '7th Grade' });
    expect(document.querySelector('[data-challenge-grade]').getAttribute('data-challenge-grade')).toBe('6');
    expect(P.bandPaths.g67[0].mode).toBe('challenge');
    const state = await mount({}, { gradeLevel: '3rd Grade' });
    await clickTile('0-0');
    expect(state().mode).toBe('explore');
  });

  it('Start scrolls to the activity and puts focus on its first task', async () => {
    const scrolled = [];
    Element.prototype.scrollIntoView = function (opts) { scrolled.push([this.id || this.getAttribute('data-ap-tile'), opts]); };
    const state = await mount({ _areaPerimeter: { mode: 'compare' } }, { gradeLevel: '5th Grade' });
    await click('Start step 1: Area and perimeter formulas');
    await settle();
    expect(state().mode).toBe('challenge');
    expect(document.activeElement.id).toBe('ap-answer');
    expect(scrolled.at(-1)[0]).toBe('ap-answer');
    await mount({ _areaPerimeter: { mode: 'compare' } }, { gradeLevel: '3rd Grade' });
    await click('Start step 1: Tile a rectangle');
    await settle();
    expect(document.activeElement.getAttribute('data-ap-tile')).toBe('0-0');
    // Open in the full list does the same.
    await click('Show all steps');
    await click('Open step 2: Same fence, different gardens');
    await settle();
    expect(document.getElementById('ap-mode-panel').contains(document.activeElement)).toBe(true);
    expect(document.activeElement.id).not.toBe('ap-mode-panel');
  });
});

describe('a calmer top: a Next line and the starred tabs plus More', () => {
  it('folds the path to one Next line, with the full list a click away', async () => {
    const state = await mount({}, { gradeLevel: '5th Grade' });
    expect(document.getElementById('ap-path-list')).toBeNull();
    const next = document.querySelector('[data-ap-path-next]');
    expect(next.getAttribute('data-ap-path-next')).toBe('formulas');
    expect(next.textContent).toContain('Next: step 1, Area and perimeter formulas.');
    expect(next.textContent).toContain('0 of 3');
    const toggle = document.querySelector('[data-ap-action="path-toggle"]');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await click('Show all steps');
    expect(document.querySelectorAll('[data-ap-path-step]')).toHaveLength(4);
    expect(state().pathOpen).toBe(true);
  });

  it('shows students the starred tabs and folds the rest under More activities; teachers see every tab', async () => {
    const state = await mount({ _areaPerimeter: { mode: 'challenge' } }, { gradeLevel: '5th Grade' });
    expect(tabIds()).toEqual(['challenge', 'composite', 'units']);
    const more = button('More activities (7)');
    expect(more.getAttribute('aria-expanded')).toBe('false');
    expect(more.getAttribute('aria-controls')).toBe('ap-tablist');
    await click('More activities (7)');
    expect(tabIds()).toHaveLength(10);
    await click('Fewer activities');
    // Arrow keys move through the tabs on screen.
    await key(document.getElementById('ap-tab-units'), 'ArrowRight');
    expect(state().mode).toBe('challenge');
    expect(document.activeElement.id).toBe('ap-tab-challenge');
    // An open activity from the More list stays on screen when folded.
    loadTool(FILE, ID);
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { mode: 'circles' } }, { gradeLevel: '5th Grade' });
    expect(tabIds()).toEqual(['challenge', 'composite', 'units', 'circles']);
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { mode: 'circles' } }, { gradeLevel: '5th Grade', isTeacherMode: true });
    expect(tabIds()).toHaveLength(10);
    expect(document.querySelector('[data-ap-action="tabs-more"]')).toBeNull();
  });
});
