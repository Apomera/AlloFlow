// Number Line engagement build (2026-11-04): free landmark rewards, opening on
// the path, the Explore line as a slider, K-2 phone readability and the
// trimmed Fractions tab. NUMBERLINE_ENGAGE_SRC points the suite at another copy
// (the start copy must turn these tests red).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.NUMBERLINE_ENGAGE_SRC || 'stem_lab/stem_tool_numberline.js';
let root = null, latest = null, xp = [], errors = [], sr = [];

beforeEach(() => {
  resetStemLab();
  if (!window.ResizeObserver) { window.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} }; globalThis.ResizeObserver = window.ResizeObserver; }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({}, { get: (tg, k) => (k in tg ? tg[k] : () => {}), set: (tg, k, v) => { tg[k] = v; return true; } }));
  loadTool(FILE, 'numberline');
  xp = []; errors = []; sr = [];
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ').slice(0, 300)); });
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null; document.body.innerHTML = ''; vi.restoreAllMocks();
  delete window.matchMedia; delete window.speechSynthesis; delete window.SpeechSynthesisUtterance;
  delete window.Element.prototype.scrollIntoView;
});

async function mount(nl, over) {
  document.body.innerHTML = '<div id="root"></div>';
  function App() {
    const [state, setState] = React.useState({ _numberline: Object.assign({ muted: true }, nl) });
    latest = state._numberline;
    return window.StemLab._registry.numberline.render(makeCtx(Object.assign({
      toolData: state, setToolData: setState,
      awardXP: (id, amt, why) => xp.push([id, amt, why]),
      announceToSR: (m) => sr.push(m), addToast: () => {},
    }, over || {})));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => root.render(React.createElement(App)));
  await React.act(async () => {});
}
async function click(el) { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); }
async function key(el, k) { await React.act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); }); }
async function type(el, value) {
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}
const btn = (label) => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === label || b.getAttribute('aria-label') === label);
const pathBtn = (id) => document.querySelector('[data-nl-path-step="' + id + '"] button');
const landmarkXp = () => xp.filter((x) => x[0] === 'numberlineLandmark');
const B23 = { gradeLevel: '2nd Grade' }, K2 = { gradeBand: 'k2', gradeLevel: '1st Grade' }, B45 = { gradeLevel: '5th Grade' }, B6 = { gradeBand: 'g68', gradeLevel: '6th Grade' };
const placeItem = (o) => Object.assign({ v: 2, id: 'eng-item-1', type: 'placeWhole', band: 'b23', answer: 'position', tries: 0, target: 7, text: '7', snap: 1, tol: 0.49, line: { min: 0, max: 10, step: 1, labels: [0, 5, 10] } }, o);
const ppState = (item) => ({ tab: 'challenges', challengeMode: 'place', ppSolvedByType: { placeWhole: 9 }, pp: { item, pos: null, text: '', tries: 0, hints: 0, status: 'open', fb: null, exampleOpen: false } });
const narrowScreen = () => { window.matchMedia = (q) => ({ matches: /max-width/.test(q), media: q, addEventListener() {}, removeEventListener() {} }); };

describe('1. landmarks pay only for the student\'s own move', () => {
  it('the starting marker (1/2) and every chip pay nothing and leave the path step at 0', async () => {
    await mount({ tab: 'fracdec' }, B45);
    expect(landmarkXp()).toEqual([]);
    expect(Object.keys(latest.fdLandmarksFound || {})).toEqual([]);
    await click(btn('3 over 6')); // equivalent-fraction chip
    for (const label of ['1 over 4 equals 0.25', '3 over 4 equals 0.75', '1 over 2 equals 0.5', '1 over 8 equals 0.125']) await click(btn(label));
    await click(btn('Add 1/4'));
    expect(landmarkXp()).toEqual([]);
    expect(Object.keys(latest.fdLandmarksFound || {})).toEqual([]);
    expect(document.querySelector('[data-nl-path-step="landmarks"]').textContent).toContain('0 of 3 done');
  });
  it('arrow keys, a drag and a typed value each find a landmark once', async () => {
    await mount({ tab: 'fracdec', fdValue: 0.5, fdDen: 4 }, B45);
    const s = () => document.querySelector('svg[role="slider"]');
    await key(s(), 'ArrowRight'); // 3/4
    expect(landmarkXp()).toEqual([['numberlineLandmark', 3, 'landmark 3/4']]);
    // Drag: pointer at 25% of the usable width (fallback mapping without a CTM).
    s().getBoundingClientRect = () => ({ left: 0, top: 0, width: 700, height: 170, right: 700, bottom: 170 });
    await React.act(async () => { s().dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 200, clientY: 80, button: 0 })); });
    await React.act(async () => { window.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true })); });
    expect(latest.fdValue).toBeCloseTo(0.25, 6);
    expect(landmarkXp().map((x) => x[2])).toEqual(['landmark 3/4', 'landmark 1/4']);
    await type(document.getElementById('fdNum'), '1');
    await type(document.getElementById('fdDenInput'), '8');
    await click(btn('Plot fraction'));
    expect(landmarkXp().map((x) => x[2])).toEqual(['landmark 3/4', 'landmark 1/4', 'landmark 1/8']);
    // Typing the landmark the marker already sits on still counts as finding it.
    await React.act(async () => root.unmount()); root = null; xp = [];
    await mount({ tab: 'fracdec' }, B45);
    await type(document.getElementById('fdNum'), '1');
    await type(document.getElementById('fdDenInput'), '2');
    await click(btn('Plot fraction'));
    expect(landmarkXp()).toEqual([['numberlineLandmark', 3, 'landmark 1/2']]);
  });
  it('legacy found landmarks still count and are never paid again', async () => {
    await mount({ tab: 'fracdec', fdValue: 0, fdDen: 4, fdLandmarksFound: { '0': true, '1/2': true, '1/4': true } }, B45);
    expect(document.querySelector('[data-nl-path-step="landmarks"]').getAttribute('data-done')).toBe('true');
    await key(document.querySelector('svg[role="slider"]'), 'ArrowRight');
    expect(landmarkXp()).toEqual([]);
  });
});

describe('2. a first visit opens on the band\'s path activity; step buttons land on it', () => {
  it('opens on step 1 for each band, quietly, and keeps a saved tab', async () => {
    await mount({}, B45);
    expect(latest.tab).toBe('fracdec');
    expect(document.querySelector('[role="tabpanel"]').id).toBe('numberline-panel-fracdec');
    await React.act(async () => root.unmount()); root = null;
    sr = [];
    await mount({}, B23);
    expect(latest.tab).toBe('challenges');
    expect(latest.pp.item.type).toBe('placeWhole');
    expect(sr).toEqual([]); // no announcement on open
    await React.act(async () => root.unmount()); root = null;
    await mount({}, B6);
    expect([latest.tab, latest.ic.item.kind]).toEqual(['intctx', 'icPlace']);
    await React.act(async () => root.unmount()); root = null;
    await mount({ ppSolvedByType: { placeWhole: 2 } }, B23);
    expect([latest.tab, latest.pp.item.type]).toEqual(['challenges', 'roundLine']); // next unfinished step
    await React.act(async () => root.unmount()); root = null;
    await mount({ tab: 'explore' }, B23);
    expect(latest.tab).toBe('explore');
    expect(latest.pp == null).toBe(true);
  });
  it('a step button scrolls to the activity and focuses its first learning control', async () => {
    const scrolled = [];
    window.Element.prototype.scrollIntoView = function (o) { scrolled.push([this, o]); };
    await mount({ tab: 'explore' }, B45);
    await click(pathBtn('placeFraction'));
    const slider = document.querySelector('[data-place-practice] svg[role="slider"]');
    expect(slider).toBeTruthy();
    expect(document.activeElement).toBe(slider);
    expect(scrolled.some((x) => x[0] === slider)).toBe(true);
    await click(pathBtn('landmarks'));
    expect(document.activeElement).toBe(document.querySelector('#numberline-panel-fracdec svg[role="slider"]'));
    await click(pathBtn('cer'));
    expect(document.activeElement.getAttribute('data-nl-cer')).toBeTruthy();
    expect(errors).toEqual([]);
  });
});

describe('3. the Explore line is a slider; the form stays', () => {
  it('tap, arrow keys and Keep add a marker with no XP', async () => {
    await mount({ tab: 'explore', range: { min: 0, max: 20 } });
    const s = () => document.querySelector('#numberline-panel-explore svg[role="slider"]');
    expect(s()).toBeTruthy();
    expect(s().getAttribute('aria-valuetext')).toMatch(/^No marker yet/);
    expect(btn('Keep this marker').disabled).toBe(true);
    s().getBoundingClientRect = () => ({ left: 0, top: 0, width: 700, height: 120, right: 700, bottom: 120 });
    await React.act(async () => { s().dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 350, clientY: 60, button: 0 })); });
    await React.act(async () => { window.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true })); });
    expect(latest.exploreProbe).toBe(10);
    await key(s(), 'ArrowRight');
    expect(latest.exploreProbe).toBe(11);
    expect(s().getAttribute('aria-valuetext')).toBe('Marker at 11');
    expect(document.querySelector('[data-nl-probe] text').textContent).toBe('11');
    await key(s(), 'End');
    expect(latest.exploreProbe).toBe(20);
    await click(btn('Keep a marker at 20'));
    expect(latest.markers.map((m) => m.value)).toEqual([20]);
    expect(document.querySelector('input[aria-label="Minimum value"]')).toBeTruthy(); // the form stays
    expect(document.getElementById('nlMarkerVal')).toBeTruthy();
    expect(xp).toEqual([]);
  });
});

describe('4. K-2 phone readability', () => {
  it('K-2: Hear the question speaks the prompt; level and keys sit behind disclosures; the description is screen-reader only', async () => {
    const spoken = [];
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
    window.speechSynthesis = { speak: (u) => spoken.push(u.text), cancel: () => {} };
    await mount(ppState(placeItem()), K2);
    await click(btn('Hear the question'));
    expect(spoken).toEqual(['Place a marker at 7 on the number line.']);
    const pp = document.querySelector('[data-place-practice]');
    expect(pp.querySelector('details [role="group"][aria-label="Practice level"]')).toBeTruthy();
    expect(document.getElementById('nl-pp-desc').className).toContain('sr-only');
    expect([...pp.querySelectorAll('details summary')].map((x) => x.textContent)).toContain('Keyboard keys');
    expect(xp).toEqual([]);
  });
  it('K-2 whole-number lines are 0-10 or 0-20; older bands are unchanged', async () => {
    await mount({ tab: 'explore' }, K2);
    const E = window.StemLab._registry.numberline._engine;
    const maxes = new Set();
    const r1 = E.seeded(7), r2 = E.seeded(7);
    for (let i = 0; i < 300; i++) maxes.add(E.genItem('placeWhole', 'b23', r1, { young: true }).line.max);
    expect([...maxes].sort((a, b) => a - b)).toEqual([10, 20]);
    const older = new Set();
    for (let i = 0; i < 300; i++) older.add(E.genItem('placeWhole', 'b23', r2).line.max);
    expect([...older].sort((a, b) => a - b)).toEqual([10, 20, 100, 1000]);
  });
  it('3rd grade (not K-2) has no read-aloud and keeps the visible description', async () => {
    await mount(ppState(placeItem()), { gradeBand: 'g35', gradeLevel: '3rd Grade' });
    expect(btn('Hear the question')).toBeUndefined();
    expect(document.getElementById('nl-pp-desc').className).not.toContain('sr-only');
  });
  it('phone width: lines use a narrow drawing with bigger labels and no sideways scroll', async () => {
    narrowScreen();
    await mount(ppState(placeItem()), K2);
    const s = document.querySelector('[data-place-practice] svg[role="slider"]');
    expect(s.getAttribute('viewBox')).toBe('0 0 380 160');
    const labels = [...s.querySelectorAll('text')].map((x) => Number(x.getAttribute('font-size')));
    expect(Math.min(...labels)).toBeGreaterThanOrEqual(20); // 20/380 of a 300 px line = 15.8 px
    await React.act(async () => root.unmount()); root = null;
    await mount({ tab: 'explore', range: { min: 0, max: 20 } }, K2);
    const ex = document.querySelector('#numberline-panel-explore svg[role="slider"]');
    expect(ex.getAttribute('viewBox')).toBe('0 0 360 120');
    expect(ex.closest('[role="region"]')).toBeNull();
    const shown = [...ex.querySelectorAll('text')].map((x) => x.textContent);
    expect(shown).toEqual(['0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20']);
    expect(ex.getAttribute('aria-describedby')).toBe('nl-explore-desc');
    expect(document.getElementById('nl-explore-desc').textContent).toContain('Labelled ticks every 2. Unlabelled big ticks every 1.');
    // The path shows only the next step until the student asks for all of them.
    const steps = () => [...document.querySelectorAll('[data-nl-path-step]')].map((li) => li.getAttribute('data-nl-path-step'));
    expect(steps()).toEqual(['placeWhole']);
    await click(btn('Show all 5 steps'));
    expect(steps()).toEqual(['placeWhole', 'roundLine', 'skip', 'measure', 'lineplot']);
    expect(btn('Show only the next step').getAttribute('aria-expanded')).toBe('true');
  });
});

describe('5. the Fractions tab: core first, the rest under More; the marker no longer covers a label', () => {
  it('the line comes first and the extras sit in a closed disclosure', async () => {
    await mount({ tab: 'fracdec' }, B45);
    const panel = document.getElementById('numberline-panel-fracdec');
    const slider = panel.querySelector('svg[role="slider"]');
    const parts = panel.querySelector('[role="group"][aria-label="Divide the line into:"]');
    expect(slider.compareDocumentPosition(parts) & window.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const more = panel.querySelector('details[data-fd-more]');
    expect(more).toBeTruthy();
    expect(more.open).toBe(false);
    for (const label of ['1 over 2 equals 0.5', 'Add 1/2', '→ Plot the sum on the line']) expect(more.contains(btn(label)), label).toBe(true);
    expect(more.contains(document.getElementById('fdNum'))).toBe(false); // typed plotting stays in the core
    await React.act(async () => { more.open = true; more.dispatchEvent(new window.Event('toggle')); });
    expect(latest.fdMoreOpen).toBe(true);
  });
  it('the 1/2 marker stem leaves a gap where the "2/4" label sits', async () => {
    await mount({ tab: 'fracdec', fdValue: 0.5, fdDen: 4 }, B45);
    const lines = [...document.querySelectorAll('g.allo-fd-marker line')].map((l) => [Number(l.getAttribute('y1')), Number(l.getAttribute('y2'))]);
    expect(lines.length).toBeGreaterThan(0);
    for (const [a, b] of lines) expect(a < 60 && b > 50, 'marker stem crosses the label band ' + a + '-' + b).toBe(false);
    const label = [...document.querySelectorAll('svg[role="slider"] text')].find((x) => x.textContent === '2/4');
    expect(label.getAttribute('paint-order')).toBe('stroke');
  });
});
