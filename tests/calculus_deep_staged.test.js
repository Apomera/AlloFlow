// Calculus stage D (2026-11-04): an independent tester's regressions. Each block failed on the
// stage C file (C:\tmp\stem_tool_deep_2026-11-03\work_calculus\stageD_start.js) and passes now.
// The math is run, not grepped; the flows are driven through the real UI in jsdom.
// CALCULUS_DEEP_FILE points the suite at another copy of the tool.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.CALCULUS_DEEP_FILE || 'stem_lab/stem_tool_calculus.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root = null, container = null, errors = [], C = null;

beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({ measureText: () => ({ width: 20 }), createLinearGradient: () => ({ addColorStop() {} }) }, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } }));
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  errors = [];
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ').slice(0, 400)); });
  loadTool(FILE, 'calculus');
  C = window.__CalculusCore;
  window._calcImpCache = {};
  window._calcMainImpCache = {};
  container = document.createElement('div');
  document.body.appendChild(container);
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null;
  container.remove();
  vi.restoreAllMocks();
});

async function mount(init, extra) {
  const out = { latest: null, xp: [] };
  function App() {
    const [state, setState] = React.useState({ calculus: Object.assign({}, init || {}) });
    out.latest = state.calculus;
    return window.StemLab._registry.calculus.render(makeCtx(Object.assign({ toolData: state, setToolData: setState, awardXP: (id, n, why) => out.xp.push([id, n, why]), addToast: () => {} }, extra || {})));
  }
  root = ReactDOMClient.createRoot(container);
  await React.act(async () => root.render(React.createElement(App)));
  return out;
}
async function unmount() { if (root) await React.act(async () => root.unmount()); root = null; }
const btn = (text, scope) => [...(scope || container).querySelectorAll('button')].find((b) => (b.textContent || '').includes(text));
async function click(el) { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); }
async function type(el, value) {
  expect(el, 'input to type in').toBeTruthy();
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const radio = (labelText, scope) => { const l = [...(scope || container).querySelectorAll('label')].find((x) => (x.textContent || '').includes(labelText)); expect(l, 'radio ' + labelText).toBeTruthy(); return l.querySelector('input[type="radio"]'); };
const imp = (text, a, b) => C.improper(C.compile(text).f, a, b);

describe('improper integrals: an integral that swings forever never converges', () => {
  it('the decade table no longer hides the swing of cos x and friends (they diverge)', () => {
    // Old verdicts: cos x on [0, ∞) "converges to −0.0433", on [1, ∞) "−0.885", cos(πx) "0",
    // sin(1/x)/x² on (0, 1] "−0.067". Each integral swings by a fixed amount however far out.
    for (const [t, a, b] of [['cos(x)', 0, Infinity], ['cos(x)', 1, Infinity], ['cos(x)', -Infinity, 0], ['cos(pi x)', 0, Infinity], ['sin(1/x)/x^2', 0, 1]]) {
      const r = imp(t, a, b);
      expect(r.kind, t + ' on [' + a + ', ' + b + ']').toBe('diverges');
      expect(r.direction, t).toBe('osc');
      expect(C.gradeImproper(r, { kind: 'div' }, C.compile(t).f).correct, t).toBe(true);
    }
  });

  it('oscillating integrals whose swings die out still converge to the right value', () => {
    const conv = [['sin(x)/x', 0, Infinity, Math.PI / 2], ['cos(x)/x', 1, Infinity, -0.3374039229], ['e^(-x)cos(x)', 0, Infinity, 0.5], ['sin(1/x)', 0, 1, 0.5040670619],
      ['e^(-x)', 0, Infinity, 1], ['1/sqrt(x)', 0, 1, 2], ['ln(x)', 0, 1, -1], ['1/(1 + x^2)', -Infinity, Infinity, Math.PI], ['x^(-1/3)', -1, 8, 4.5]];
    for (const [t, a, b, v] of conv) {
      const r = imp(t, a, b);
      expect(r.kind, t).toBe('converges');
      expect(Math.abs(r.value - v), t + ' value').toBeLessThan(0.006);
    }
    expect(imp('sin(x)', 0, Infinity).kind).toBe('diverges');
    expect(imp('1/x', 1, Infinity).kind).toBe('diverges');
  });

  it('a swing too fast to sample is not called divergent (sin(x²) converges; the table cannot tell)', () => {
    // Old: "diverges toward −∞" from a garbage table row. Fresnel's integral converges to √(π/8).
    expect(imp('sin(x^2)', 0, Infinity).kind).toBe('unclear');
  });

  it('in the panel: "diverges" on cos x is marked right, and the reveal explains the hidden swing', async () => {
    const m = await mount({ tab: 'integral', impText: 'cos(x)', impA: '0', impB: 'inf' });
    const panel = () => container.querySelector('[data-calc-improper]');
    await click(radio('Diverges', panel()));
    await click(btn('Commit my prediction', panel()));
    expect(panel().textContent).toContain('Correct.');
    expect(panel().textContent).toContain('the swings do not shrink');
    expect(panel().textContent).toContain('So the integral diverges');
    expect(m.xp.length).toBe(1);
    expect(errors).toEqual([]);
  });
});

describe('limits: steady but slow approaches are read correctly', () => {
  it('a power root settles on its limit instead of being called oscillation', () => {
    // Old: x^(1/3), cbrt(x), sqrt(|x|) and |x|^0.1 at 0 were all "oscillating: the values never settle".
    for (const t of ['x^(1/3)', 'cbrt(x)', 'sqrt(|x|)', '|x|^0.1', 'x^(1/5)']) {
      const p = C.limitProbe(C.compile(t).f, 0);
      expect(p.kind, t).toBe('continuous');
      expect(p.limit, t).toBe(0);
      expect(C.gradeLimit(p, { kind: 'number', value: '0' }).correct, t).toBe(true);
    }
    const r = C.limitProbe(C.compile('sqrt(x)').f, 0);
    expect(r.right).toMatchObject({ kind: 'finite', limit: 0 });
    expect(r.kind).toBe('onesided');
  });

  it('a slow blow-up is infinite, not oscillation', () => {
    expect(C.limitProbe(C.compile('ln|x|').f, 0)).toMatchObject({ kind: 'infinite', limit: '-inf' });
    expect(C.limitProbe(C.compile('1/sqrt(|x|)').f, 0)).toMatchObject({ kind: 'infinite', limit: '+inf' });
    const odd = C.limitProbe(C.compile('1/x^(1/3)').f, 0);
    expect([odd.left.kind, odd.right.kind, odd.limit]).toEqual(['-inf', '+inf', null]);
  });

  it('table rounding no longer misreports a hole value (12, not 11.9999)', () => {
    const p = C.limitProbe(C.compile('(x^3 - 8)/(x - 2)').f, 2);
    expect(p.limit).toBe(12);
    expect([p.left.limit, p.right.limit]).toEqual([12, 12]);
    expect(C.limitProbe(C.compile('x ln|x|').f, 0).limit).toBe(0);
  });

  it('what still has no limit is unchanged', () => {
    expect(C.limitProbe(C.compile('sin(1/x)').f, 0).kind).toBe('oscillating');
    expect(C.limitProbe(C.compile('1/x').f, 0)).toMatchObject({ kind: 'infinite', limit: null });
    expect(C.limitProbe(C.compile('floor(x)').f, 1).kind).toBe('jump');
    expect(C.limitProbe(C.compile('|x|/x').f, 0).kind).toBe('jump');
    expect(C.limitProbe(C.compile('(x^2 - 1)/(x - 1)').f, 1)).toMatchObject({ kind: 'hole', limit: 2 });
  });

  it('in Explore mode the student who predicts lim x^(1/3) = 0 at 0 is marked right', async () => {
    await mount({ tab: 'limits', limitMode: 'explore', fnMode: 'typed', fnText: 'x^(1/3)', limitA: 0 });
    await click(radio('A number:'));
    await type(container.querySelector('input[aria-label="Predicted limit value"]'), '0');
    await click(btn('Commit my prediction'));
    expect(container.textContent).toContain('Correct: the limit is 0.');
    expect(container.textContent).toContain('continuous: the limit equals f(a)');
    expect(errors).toEqual([]);
  });
});

describe("Euler's method: the only truthful answer is 'about halved'", () => {
  it('a seed where the first-order error nearly cancels is not graded against the textbook answer', () => {
    // Old: halving = 'quarter' here, so "about halved" was marked wrong with "Euler is first order",
    // and "a quarter" was marked right with "Correct: halving h about halves the error".
    const s = C.eulerStudy(2, 0.5, 1.5, 2);
    expect(s.halving).toBeNull();
    expect(s.cancels).toBe(true);
    expect(C.gradeEuler(s, 'quarter').correct).toBe(false);
    const seen = new Set();
    for (let o = 0; o < 5; o++) for (let x = -3; x <= 3; x += 0.5) for (let y = -3; y <= 3; y += 0.5) seen.add(String(C.eulerStudy(o, x, y, 2).halving));
    expect([...seen].sort()).toEqual(['half', 'null']);
    expect(C.eulerStudy(0, 0, 1, 2).halving).toBe('half');
  });

  it('the panel says why there is no prediction at that seed, instead of "grows too fast"', async () => {
    await mount({ tab: 'visualize', vizView: 'slope', vizOde: 2, vizSlopeX: 0.5, vizSlopeY: 1.5 });
    const panel = container.querySelector('[data-calc-euler]');
    expect(panel.textContent).toContain('almost cancel');
    expect(panel.textContent).not.toContain('grows too fast');
    expect(panel.querySelector('input[type="radio"]')).toBeNull();
  });

  it('XP for the halving prediction is paid once per equation, not once per seed', async () => {
    let m = await mount({ tab: 'visualize', vizView: 'slope', vizOde: 0, vizSlopeX: 0, vizSlopeY: 1 });
    await click(radio('It is about halved'));
    await click(btn('Commit my prediction'));
    expect(m.xp.length).toBe(1);
    const paid = m.latest.missionXP;
    await unmount();
    // Same equation, a new seed: the answer is the same, so no new XP.
    m = await mount({ tab: 'visualize', vizView: 'slope', vizOde: 0, vizSlopeX: 0, vizSlopeY: 0.5, missionXP: paid });
    await click(radio('It is about halved'));
    await click(btn('Commit my prediction'));
    expect(container.textContent).toContain('Correct: halving h about halves the error.');
    expect(m.xp.length, 'a new seed of the same equation pays nothing').toBe(0);
    await unmount();
    // A different equation still pays.
    m = await mount({ tab: 'visualize', vizView: 'slope', vizOde: 1, vizSlopeX: 0, vizSlopeY: 0.5, missionXP: paid });
    await click(radio('It is about halved'));
    await click(btn('Commit my prediction'));
    expect(m.xp.length).toBe(1);
    expect(errors).toEqual([]);
  });
});

describe('saved state: a partial derivative-inquiry bucket', () => {
  it('fills in defaults instead of showing "undefinedx²" and NaN', async () => {
    for (const bucket of [{ log: [] }, 'junk', 7, { a: 'x', b: null }]) {
      await mount({ tab: 'derivHunt', derivHunt: bucket });
      const t = container.textContent;
      expect(t, JSON.stringify(bucket)).not.toMatch(/undefined|NaN/);
      expect(t).toContain('f(x)=1x² + 0x + 0');
      await unmount();
    }
    expect(errors).toEqual([]);
  });
});
describe('Integral tab wording for a bounded function with a missing point', () => {
  it('|x|/x on [-1, 1] is not described as unbounded (it is undefined at 0, never large)', async () => {
    await mount({ tab: 'integral', fnMode: 'typed', fnText: '|x|/x', xMin: -1, xMax: 1, overUnderChecked: true });
    const t = container.textContent + ' ' + [...container.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).join(' ');
    expect(t).toContain('Improper (convergent)');
    expect(t).not.toMatch(/(f|function) is unbounded near/);
    expect(t).toContain('not defined or not bounded near x = 0');
    expect(errors).toEqual([]);
  });
});
describe('saved bounds far outside the sliders', () => {
  it('are clamped, so the one-grid-line-per-integer graph cannot freeze the page', async () => {
    // Old: a saved xMax of 1e7 drew a 10-million-step loop each render, and -1e308 never ended.
    await mount({ tab: 'integral', xMin: 0, xMax: 1e7, overUnderChecked: true });
    const label = [...container.querySelectorAll('svg[aria-label]')].map((s) => s.getAttribute('aria-label')).join(' ');
    expect(label).toContain('from 0 to 1000');
    await unmount();
    const t0 = Date.now();
    await mount({ tab: 'derivative', xMin: -1e308, xMax: -1e308, x0: -1e308 });
    expect(container.textContent).toContain('Derivative: slope at a point');
    expect(Date.now() - t0).toBeLessThan(15000);
    expect(errors).toEqual([]);
  });
});
describe('saved state: damaged mission results and score', () => {
  it('a null step record does not crash the Rates tab, and an object score is not printed as [object Object]', async () => {
    // Old: misResults [null] threw "Cannot read properties of null (reading 'ok')" and blanked the
    // tool; calcScore {} showed "[object Object]" and the next correct answer made it "[object Object]1".
    const seed = 4242;
    await mount({ tab: 'apply', misKind: 'ladder', misSeed: seed, misIdx: 1, misResults: [null, 'x'], calcScore: {}, calcStreak: [] });
    const t = container.textContent;
    expect(t).toContain('The sliding ladder');
    expect(t).not.toContain('[object Object]');
    expect(errors).toEqual([]);
  });
});