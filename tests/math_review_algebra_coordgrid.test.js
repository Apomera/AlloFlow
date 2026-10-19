// Math review (algebra lane): Coordinate Grid function compiler (unary minus) and
// the slope / distance graders. MATH_REVIEW_COORDGRID points the suite at another
// copy of the tool (mutation checks).
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MATH_REVIEW_COORDGRID || 'stem_lab/stem_tool_coordgrid.js';
const src = fs.readFileSync(FILE, 'utf8');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
beforeEach(() => { resetStemLab(); loadTool(FILE, 'coordinate'); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; });

const compileFunc = (() => {
  const start = src.indexOf('var compileFunc = function');
  const end = src.indexOf('var addFunc', start);
  // eslint-disable-next-line no-new-func
  return new Function(src.slice(start, end) + '\nreturn compileFunc;')();
})();

describe('function plotter: signs', () => {
  it('graphs a leading minus before a power as the negative of the power', () => {
    for (const [expr, x, y] of [['-x^2', 3, -9], ['-2^2', 0, -4], ['-x^2+4', 1, 3], ['-(x+1)^2', 1, -4], ['2*-x^2', 2, -8], ['(-x)^2', 3, 9]]) {
      const fn = compileFunc(expr);
      expect(fn, expr).toBeTypeOf('function');
      expect(fn(x), expr).toBe(y);
    }
  });

  it('reads doubled signs as math, not as JavaScript ++ / --', () => {
    for (const [expr, x, y] of [['--x', 3, 3], ['3--x', 1, 4], ['x--3', 1, 4], ['x - -3', 1, 4], ['++x', 2, 2], ['x++1', 2, 3]]) {
      const fn = compileFunc(expr);
      expect(fn, expr).toBeTypeOf('function');
      expect(fn(x), expr).toBe(y);
    }
  });

  it('does not draw a line across the pole of 0.5/(x - 0.25)', () => {
    const html = renderTool('coordinate', { _coordGrid: { funcsOn: true, funcs: [{ id: 'f1', expr: '0.5/(x-0.25)', color: '#6366f1', visible: true }] } });
    const pole = (0.25 + 10) * 20;
    const lines = [...html.matchAll(/<polyline points="([^"]+)"[^>]*stroke="#6366f1"/g)].map((m) => m[1].split(' ').map((p) => Number(p.split(',')[0])));
    expect(lines.length).toBeGreaterThan(1);
    for (const xs of lines) expect(xs.every((x) => x < pole) || xs.every((x) => x > pole), xs[0] + '..' + xs[xs.length - 1]).toBe(true);
    // A smooth zero crossing is still one unbroken curve.
    const steep = renderTool('coordinate', { _coordGrid: { funcsOn: true, funcs: [{ id: 'f2', expr: '2x+0.1', color: '#10b981', visible: true }] } });
    expect([...steep.matchAll(/<polyline points="[^"]+"[^>]*stroke="#10b981"/g)].length).toBe(1);
  });

  it('keeps a sign that belongs to an exponent', () => {
    expect(compileFunc('2^-x')(1)).toBe(0.5);
    expect(compileFunc('x^-1')(2)).toBe(0.5);
    expect(compileFunc('x**-2')(2)).toBe(0.25);
    expect(compileFunc('2x+1')(3)).toBe(7);
  });
});

async function mount(cg) {
  let latest;
  function App() {
    const [state, setState] = React.useState({ _coordGrid: cg });
    latest = state;
    return window.StemLab._registry.coordinate.render(makeCtx({
      toolData: state, setToolData: setState, exploreScore: { correct: 0, total: 0 }, setExploreScore: vi.fn(), awardXP: vi.fn(), announceToSR: vi.fn(), addToast: vi.fn()
    }));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  return () => latest._coordGrid;
}
async function check() {
  const b = document.querySelector('button[aria-label="Check"]');
  expect(b).toBeTruthy();
  await React.act(() => b.click());
}
const slopeChallenge = (p1, p2, slopeData) => ({ type: 'slope', p1, p2, slopeData });

describe('slope grader', () => {
  it('accepts "Undefined" for a vertical segment', async () => {
    const state = await mount({ gridChallenge: slopeChallenge({ x: 3, y: 1 }, { x: 3, y: 5 }, { rise: 4, run: 0, value: 'undefined', display: 'undefined' }),
      gridFeedback: { riseAnswer: '4', runAnswer: '0', slopeAnswer: 'Undefined' }, gridPoints: [] });
    await check();
    expect(state().gridFeedback.correct).toBe(true);
    expect(state().slopesSolved).toBe(1);
  });

  it('accepts an equivalent fraction and the typographic minus sign', async () => {
    for (const answer of ['-2/4', '−1/2', '2/-4', '-0.5']) {
      if (root) { await React.act(() => root.unmount()); root = null; }
      const state = await mount({ gridChallenge: slopeChallenge({ x: 0, y: 0 }, { x: -4, y: 2 }, { rise: 2, run: -4, value: -0.5, display: '-1/2' }),
        gridFeedback: { riseAnswer: '2', runAnswer: '-4', slopeAnswer: answer }, gridPoints: [] });
      await check();
      expect(state().gridFeedback.correct, answer).toBe(true);
    }
  });

  it('still rejects a wrong slope', async () => {
    const state = await mount({ gridChallenge: slopeChallenge({ x: 0, y: 0 }, { x: -4, y: 2 }, { rise: 2, run: -4, value: -0.5, display: '-1/2' }),
      gridFeedback: { riseAnswer: '2', runAnswer: '-4', slopeAnswer: '1/2' }, gridPoints: [], streak: 2 });
    await check();
    expect(state().gridFeedback.correct).toBe(false);
    expect(state().streak).toBe(0);
  });

  it('does not grade, reveal, or break the streak on blank boxes', async () => {
    const state = await mount({ gridChallenge: slopeChallenge({ x: 0, y: 0 }, { x: 2, y: 6 }, { rise: 6, run: 2, value: 3, display: '3' }),
      gridFeedback: { riseAnswer: '', runAnswer: '', slopeAnswer: '' }, gridPoints: [], streak: 2 });
    await check();
    expect(state().streak).toBe(2);
    expect(String(state().gridFeedback.msg || '')).not.toContain('should be');
  });
});

describe('distance grader', () => {
  it('does not print NaN or break the streak on a blank answer', async () => {
    const state = await mount({ gridChallenge: { type: 'distance', p1: { x: 0, y: 0 }, p2: { x: 3, y: 4 }, distance: 5 },
      gridFeedback: { distanceAnswer: '' }, gridPoints: [], streak: 2 });
    await check();
    expect(String(state().gridFeedback.msg || '')).not.toContain('NaN');
    expect(state().streak).toBe(2);
    expect(document.body.textContent).not.toContain('NaN');
  });

  it('still grades a number', async () => {
    const state = await mount({ gridChallenge: { type: 'distance', p1: { x: 0, y: 0 }, p2: { x: 3, y: 4 }, distance: 5 },
      gridFeedback: { distanceAnswer: '5' }, gridPoints: [], streak: 2 });
    await check();
    expect(state().gridFeedback.correct).toBe(true);
    expect(state().streak).toBe(3);
  });
});
