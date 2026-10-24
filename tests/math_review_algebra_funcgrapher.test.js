// Math review (algebra lane): Function Grapher touching roots, turning points,
// rational poles, Find-the-Root option values, Name That Graph parameters.
// MATH_REVIEW_FUNCGRAPHER points the suite at another copy (mutation checks).
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MATH_REVIEW_FUNCGRAPHER || 'stem_lab/stem_tool_funcgrapher.js';
const src = fs.readFileSync(FILE, 'utf8');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null;
beforeEach(() => { resetStemLab(); loadTool(FILE, 'funcGrapher'); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function scan(evalF, evalDeriv) {
  const start = src.indexOf('var roots = [];');
  const end = src.indexOf('// Numerical integral', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function('evalF', 'evalDeriv', 'xR', 'yR', src.slice(start, end) + '\nreturn { roots: roots, critPts: critPts };')(
    evalF, evalDeriv, { xMin: -10, xMax: 10 }, { yMin: -10, yMax: 10 });
}

describe('roots that touch the axis', () => {
  it('finds the double root of x^2 and (x - 2)^2', () => {
    const sq = scan((x) => x * x, (x) => 2 * x);
    expect(sq.roots.length).toBe(1);
    expect(sq.roots[0]).toBeCloseTo(0, 6);
    const shifted = scan((x) => x * x - 4 * x + 4, (x) => 2 * x - 4);
    expect(shifted.roots.length).toBe(1);
    expect(shifted.roots[0]).toBeCloseTo(2, 6);
  });

  it('puts the |x| corner at (0, 0) and counts it as the root', () => {
    const abs = scan(Math.abs, (x) => (x === 0 ? NaN : Math.sign(x)));
    expect(abs.critPts.length).toBe(1);
    expect(abs.critPts[0].x.toFixed(1)).toBe('0.0');
    expect(abs.critPts[0].y.toFixed(2)).toBe('0.00');
    expect(abs.roots.map((r) => r.toFixed(2))).toEqual(['0.00']);
  });

  it('finds every touching root of sin(x) - 1 and keeps crossing roots unchanged', () => {
    const wave = scan((x) => Math.sin(x) - 1, (x) => Math.cos(x));
    expect(wave.roots.length).toBe(3);
    [-3 * Math.PI / 2, Math.PI / 2, 5 * Math.PI / 2].forEach((r, i) => expect(wave.roots[i]).toBeCloseTo(r, 5));
    const quad = scan((x) => x * x - 4, (x) => 2 * x);
    expect(quad.roots.length).toBe(2);
    expect(scan((x) => 1 / x, (x) => -1 / (x * x)).roots).toEqual([]);
  });
});

describe('rational pole between two samples', () => {
  it('does not join the two branches of 0.5/x', () => {
    const html = renderTool('funcGrapher', { funcGrapher: { type: 'rational', a: 0.5, b: 0, c: 0, traceX: 2 } });
    const pole = 45 + (10 / 20) * (440 - 90);
    const curves = [...html.matchAll(/<polyline points="([^"]+)"[^>]*stroke="#4f46e5"/g)].map((m) => m[1].split(' ').map((p) => Number(p.split(',')[0])));
    expect(curves.length).toBeGreaterThan(1);
    for (const xs of curves) expect(xs.every((x) => x < pole) || xs.every((x) => x > pole), xs[0] + '..' + xs[xs.length - 1]).toBe(true);
  });
});

describe('Find the Root options', () => {
  it('never shows floating-point noise such as 0.33000000000000007', () => {
    const start = src.indexOf('var FG_LABELS =');
    const end = src.indexOf('// Start a challenge based on the current mode', start);
    // eslint-disable-next-line no-new-func
    const eng = new Function('gradeBand', 'd', src.slice(start, end) + '\nreturn { makeRootQuiz };')('3-5', {});
    for (let i = 0; i < 3000; i++) {
      const q = eng.makeRootQuiz();
      for (const opt of q.opts) expect(String(opt), q.a + 'x + ' + q.b).toMatch(/^-?\d+(\.\d{1,2})?$/);
    }
  });
});

describe('Name That Graph', () => {
  it('draws a real wave for a trig question even when b was 0', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({ measureText: () => ({ width: 20 }) }, { get: (t, key) => (key === 'then' ? undefined : t[key] || (() => {})) }));
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    let latest;
    function App() {
      const [state, setState] = React.useState({ funcGrapher: { type: 'linear', a: 1, b: 0, c: 0, fgChallengeMode: 'name' } });
      latest = state;
      return window.StemLab._registry.funcGrapher.render(makeCtx({ toolData: state, setToolData: setState, gradeLevel: '5th Grade' }));
    }
    root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(() => root.render(React.createElement(App)));
    const seq = [0.8, 0, 0.3, 0.55, 0.1, 0.2, 0.3];
    let k = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => seq[k++ % seq.length]);
    const start = document.querySelector('button[aria-label="Start Challenge"]');
    expect(start).toBeTruthy();
    await React.act(() => start.click());
    expect(latest.funcGrapher.fgQuiz.type).toBe('trig');
    expect(latest.funcGrapher.type).toBe('trig');
    expect(latest.funcGrapher.b).not.toBe(0);
    expect(latest.funcGrapher.a).not.toBe(0);
  });
});
