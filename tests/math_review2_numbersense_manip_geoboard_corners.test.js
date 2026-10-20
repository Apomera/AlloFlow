import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Geoboard "Build a quadrilateral / pentagon (N segments)". The checker counted
// segments, so a triangle with an extra peg in the middle of one side passed as
// a quadrilateral: that peg lies on a straight line and is not a corner. A
// polygon has N sides when its band turns at N pegs.
//
// MR2_NUMBERSENSE_MANIP_SRC points the suite at another copy of the tool
// (mutation check: the pre-fix copy must turn these red).

const FILE = process.env.MR2_NUMBERSENSE_MANIP_SRC || 'stem_lab/stem_tool_manipulatives.js';

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

const CHALLENGES = {
  tri: { q: 'Build a triangle (3 segments, all pegs different).', type: 'tri', segs: 3 },
  quad: { q: 'Build a quadrilateral (4 segments forming a closed shape).', type: 'quad', segs: 4 },
  penta: { q: 'Build a pentagon (5 segments).', type: 'penta', segs: 5 }
};
// A closed band through the pegs in order.
const band = (...pegs) => pegs.map((p, i) => { const q = pegs[(i + 1) % pegs.length]; return { x1: p[0], y1: p[1], x2: q[0], y2: q[1] }; });

async function grade(kind, segments) {
  if (root) { await React.act(async () => { root.unmount(); }); root = null; }
  const tool = window.StemLab._registry.base10;
  const view = { state: null };
  function App() {
    const [state, setState] = React.useState({ _manipulatives: { mode: 'geoboard', gbChallenge: CHALLENGES[kind], geoboardSegments: segments } });
    view.state = state._manipulatives;
    return tool.render(makeCtx({ toolData: state, setToolData: setState }));
  }
  document.body.innerHTML = '<div id="m-root"></div>';
  root = ReactDOMClient.createRoot(document.getElementById('m-root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  const check = [...document.querySelectorAll('button')].find((b) => /^Check \(current perim/.test(b.textContent));
  expect(check, 'geoboard Check').toBeTruthy();
  await React.act(async () => { check.click(); });
  return view.state.gbFeedback;
}

describe('a peg on a straight side is not a corner', () => {
  it('a triangle with a midpoint peg is not a quadrilateral', async () => {
    const fb = await grade('quad', band([0, 0], [1, 0], [2, 0], [0, 2]));
    expect(fb.ok).toBe(false);
    expect(fb.msg).toMatch(/not a corner/);
  });

  it('a square with one side split is not a pentagon', async () => {
    expect((await grade('penta', band([0, 0], [1, 0], [2, 0], [2, 2], [0, 2]))).ok).toBe(false);
  });

  it('a band that doubles back along itself is not a quadrilateral', async () => {
    expect((await grade('quad', band([0, 0], [2, 0], [1, 0], [1, 2]))).ok).toBe(false);
  });

  it('real polygons still pass, in either direction and with any slope', async () => {
    expect((await grade('tri', band([0, 0], [3, 1], [1, 3]))).ok).toBe(true);
    expect((await grade('quad', band([0, 0], [2, 0], [2, 1], [0, 2]))).ok).toBe(true);
    expect((await grade('quad', band([1, 0], [3, 2], [2, 4], [0, 2]))).ok).toBe(true);
    expect((await grade('penta', band([0, 0], [2, 0], [3, 1], [1, 3], [0, 2]))).ok).toBe(true);
    expect((await grade('penta', band([0, 2], [1, 3], [3, 1], [2, 0], [0, 0]))).ok).toBe(true);
    // A non-convex (arrowhead) quadrilateral has four real corners.
    expect((await grade('quad', band([0, 0], [4, 0], [2, 1], [2, 4]))).ok).toBe(true);
  });
});
