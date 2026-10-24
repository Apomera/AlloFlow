// Math review 3: Math Manipulatives "Polygon Builder: Build a polygon with 5+ segments".
// The badge counted segments, so any 5 strokes on the geoboard (an open zigzag, a
// star of spokes, five copies of one segment) earned it. Decision (Aaron, 10-19): it
// needs a polygon, a closed band that encloses area, made of 5 or more segments.
// MATH_REVIEW3_MANIP points the suite at another copy (mutation checks).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MATH_REVIEW3_MANIP || 'stem_lab/stem_tool_manipulatives.js';

class NoopObserver { observe() {} unobserve() {} disconnect() {} }
if (!window.ResizeObserver) window.ResizeObserver = NoopObserver;
const ctx2d = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => { t[k] = v; return true; } });

let root = null;
beforeEach(() => {
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx2d);
  resetStemLab();
  loadTool(FILE, 'base10');
});
afterEach(async () => {
  if (root) { await React.act(async () => { root.unmount(); }); root = null; }
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function mount(manipState) {
  if (root) { await React.act(async () => { root.unmount(); }); root = null; }
  const tool = window.StemLab._registry.base10;
  const view = { state: null };
  function App() {
    const [state, setState] = React.useState({ _manipulatives: manipState });
    view.state = state._manipulatives;
    return tool.render(makeCtx({ toolData: state, setToolData: setState }));
  }
  document.body.innerHTML = '<div id="m-root"></div>';
  root = ReactDOMClient.createRoot(document.getElementById('m-root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  return view;
}
async function switchTo(mode) {
  const select = document.querySelector('nav[aria-label="Math manipulative tools"] select');
  expect(select, 'mode picker').toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
  await React.act(async () => { setter.call(select, mode); select.dispatchEvent(new Event('change', { bubbles: true })); });
}
async function clickPeg(x, y) {
  const peg = document.querySelector('[data-gb-peg="' + x + ',' + y + '"]');
  expect(peg, 'peg ' + x + ',' + y).toBeTruthy();
  await React.act(async () => { peg.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
}
// Draw a band peg by peg, the way a student does: select a peg, then the next.
async function drawPath(pegs) {
  for (let i = 0; i + 1 < pegs.length; i++) { await clickPeg(pegs[i][0], pegs[i][1]); await clickPeg(pegs[i + 1][0], pegs[i + 1][1]); }
}
const band = (...pegs) => pegs.map((p, i) => { const q = pegs[(i + 1) % pegs.length]; return { x1: p[0], y1: p[1], x2: q[0], y2: q[1] }; });
const seg = (a, b) => ({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] });
const earned = (view) => !!(view.state.earnedBadges && view.state.earnedBadges.gb_polygon);

// Badges are checked on the next badge pass; a mode change runs one.
async function badgeAfter(segments) {
  const view = await mount({ mode: 'geoboard', geoboardSegments: segments });
  await switchTo('blocks');
  return earned(view);
}

describe('Polygon Builder needs a closed polygon of 5+ segments', () => {
  it('five open segments are not a polygon', async () => {
    expect(await badgeAfter([seg([0, 0], [1, 0]), seg([1, 0], [2, 1]), seg([2, 1], [3, 0]), seg([3, 0], [4, 1]), seg([4, 1], [4, 3])])).toBe(false);
  });

  it('five spokes from one peg are not a polygon', async () => {
    expect(await badgeAfter([seg([2, 2], [0, 0]), seg([2, 2], [4, 0]), seg([2, 2], [4, 4]), seg([2, 2], [0, 4]), seg([2, 2], [2, 0])])).toBe(false);
  });

  it('five copies of one segment are not a polygon', async () => {
    const s = seg([0, 0], [3, 0]);
    expect(await badgeAfter([s, s, s, s, s])).toBe(false);
  });

  it('a closed band whose pegs all lie on one line encloses nothing', async () => {
    expect(await badgeAfter(band([0, 0], [1, 0], [2, 0], [3, 0], [4, 0]))).toBe(false);
  });

  it('a closed quadrilateral is a polygon, but has only 4 segments', async () => {
    expect(await badgeAfter(band([0, 0], [3, 0], [3, 3], [0, 3]))).toBe(false);
  });

  it('a closed pentagon earns it', async () => {
    expect(await badgeAfter(band([1, 0], [3, 0], [4, 2], [2, 4], [0, 2]))).toBe(true);
  });

  it('a closed hexagon (more than 5 segments) earns it', async () => {
    expect(await badgeAfter(band([1, 0], [3, 0], [4, 2], [3, 4], [1, 4], [0, 2]))).toBe(true);
  });

  it('saved segments that are not segments do not crash the badge pass', async () => {
    // The pass runs in every mode, so read them from another mode.
    const view = await mount({ mode: 'blocks', geoboardSegments: [null, 5, 'x', {}, seg([0, 0], [1, 1])] });
    // A throw inside the click handler reaches window as an error event, not the test.
    const errors = [];
    const onError = (e) => { errors.push(String(e.error || e.message)); e.preventDefault(); };
    window.addEventListener('error', onError);
    try { await switchTo('abacus'); } finally { window.removeEventListener('error', onError); }
    expect(errors, 'badge pass threw').toEqual([]);
    expect(view.state.mode).toBe('abacus');
    expect(earned(view)).toBe(false);
  });

  it('closing a pentagon peg by peg on the board earns it there and then', async () => {
    const view = await mount({ mode: 'geoboard' });
    await drawPath([[1, 0], [3, 0], [4, 2], [2, 4], [0, 2]]);
    expect(view.state.geoboardSegments.length).toBe(4);
    expect(earned(view), 'open path').toBe(false);
    await drawPath([[0, 2], [1, 0]]);
    expect(view.state.geoboardSegments.length).toBe(5);
    expect(earned(view), 'closed pentagon').toBe(true);
  });
});
