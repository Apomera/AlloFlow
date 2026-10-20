// Stats Lab math review 3 (2026-10-20): t-test sample size. The calculator treated
// the test statistic as normal with SD 1 and said 5 per group at d = 2, where
// G*Power says 6. The answer is the smallest equal n whose exact two-sided power
// P(|T'| > t_crit), T' ~ noncentral t(2n - 2, d * sqrt(n / 2)), reaches the
// target: G*Power 3.1's "means: difference between two independent means".
// Expected sizes are G*Power output; the achieved powers and the noncentral-t
// values were cross-checked with a separate numerical integration (below), not
// with the tool's series. The one-sample rows (G*Power N = 199, 34, 15, 8, 5)
// check the same exact helper with df = n - 1 and ncp = d * sqrt(n).
// MATH_REVIEW3_STATS points the suite at another copy (mutation checks).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { React, ReactDOMClient, loadTool, resetStemLab, makeCtx } from './helpers/stem_widgets_smoke_harness.js';

const SRC_PATH = process.env.MATH_REVIEW3_STATS || 'stem_lab/stem_tool_statslab.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// ── Independent reference: P(T' <= t) = E[ Phi(t * U / sqrt(df) - delta) ], U ~ chi(df),
// by Simpson's rule over U. No series, no incomplete beta.
function lnGamma(x) {
  let acc = 0;
  while (x < 10) { acc -= Math.log(x); x += 1; }
  const x2 = x * x;
  return acc + (x - 0.5) * Math.log(x) - x + 0.5 * Math.log(2 * Math.PI) +
    1 / (12 * x) - 1 / (360 * x * x2) + 1 / (1260 * x * x2 * x2) - 1 / (1680 * x * x2 * x2 * x2);
}
function erfc(x) {
  if (x < 0) return 2 - erfc(-x);
  if (x < 3) {
    let s = 0, term = x;
    for (let n = 0; n < 500; n++) { s += term / (2 * n + 1); term *= -x * x / (n + 1); if (Math.abs(term) < 1e-20) break; }
    return 1 - 2 / Math.sqrt(Math.PI) * s;
  }
  let f = x, C = x, D = 0;
  for (let i = 1; i < 300; i++) {
    D = 1 / (x + (i / 2) * D); C = x + (i / 2) / C;
    const del = C * D; f *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return Math.exp(-x * x) / Math.sqrt(Math.PI) / f;
}
const Phi = (z) => 0.5 * erfc(-z / Math.SQRT2);
function refNctCdf(t, df, delta) {
  const lc = (df / 2 - 1) * Math.log(2) + lnGamma(df / 2);
  const pdf = (u) => (u <= 0 ? (df === 1 ? Math.sqrt(2 / Math.PI) : 0) : Math.exp((df - 1) * Math.log(u) - u * u / 2 - lc));
  const N = 8000, h = (Math.sqrt(df) + 12) / N;
  let s = 0;
  for (let i = 0; i <= N; i++) {
    const u = i * h, w = i === 0 || i === N ? 1 : (i % 2 ? 4 : 2);
    s += w * pdf(u) * Phi(t * u / Math.sqrt(df) - delta);
  }
  return s * h / 3;
}

// [d, n per group, total N, G*Power actual power]
const TWO_SAMPLE = [
  [0.2, 394, 788, 0.8006], [0.5, 64, 128, 0.8015], [0.8, 26, 52, 0.8075],
  [1.2, 12, 24, 0.8021], [2.0, 6, 12, 0.8764],
];
// [d, N] one-sample, two-sided, alpha .05, power .80
const ONE_SAMPLE = [[0.2, 199], [0.5, 34], [0.8, 15], [1.2, 8], [2.0, 5]];

let mounted = [];
function mount(powerInputs) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  function Host() {
    const [td, setTd] = React.useState({ statsLab: { mode: 'power', testsRun: 0, powerInputs } });
    const ctx = makeCtx({ toolData: td, setToolData: (fn) => setTd((prev) => (typeof fn === 'function' ? fn(prev) : fn)) });
    return window.StemLab._registry.statsLab.render(ctx);
  }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => { root.render(React.createElement(Host)); });
  const m = { container, root };
  mounted.push(m);
  return m;
}
async function calculate(m) {
  const btn = [...m.container.querySelectorAll('button')].find((b) => b.textContent.indexOf('Calculate required sample size') !== -1);
  expect(btn, 'calculate button').toBeTruthy();
  await React.act(async () => { btn.click(); await new Promise((r) => setTimeout(r, 0)); });
  return m.container.textContent;
}

beforeEach(() => {
  resetStemLab();
  delete window.jStat; // the exact t-test needs no CDN library
  loadTool(SRC_PATH, 'statsLab');
});
afterEach(() => {
  mounted.forEach((m) => { React.act(() => m.root.unmount()); m.container.remove(); });
  mounted = [];
  const tag = document.getElementById('jstat-cdn');
  if (tag) tag.remove();
});

describe('independent t-test sample size uses the exact noncentral t', () => {
  it('the calculator shows 6 per group (12 total) at d = 2, offline', async () => {
    const m = mount({ test: 'ttest_independent', effectSize: 2, alpha: 0.05, power: 0.8, n: null, solveFor: 'n', vizD: 0.5, vizN: 30, vizAlpha: 0.05 });
    const text = await calculate(m);
    expect(text.includes('6 subjects per group'), (text.match(/You need[\s\S]{0,120}/) || [text.slice(0, 200)])[0]).toBe(true);
    expect(text.includes('12 total')).toBe(true);
  });

  it.each(TWO_SAMPLE)('d = %s: %s per group, N = %s (G*Power), power %s', (d, n, N, pw) => {
    const core = window.__StatsLabCore;
    const r = core.powerTTest({ d, alpha: 0.05, power: 0.8, solve: 'n' });
    expect(r.error, r.error).toBeUndefined();
    expect(r.n).toBe(n);
    expect(r.total_n).toBe(N);
    expect(r.power).toBeCloseTo(pw, 3);
    // Smallest such n: one fewer falls short.
    expect(core.powerTTest({ d, n: n - 1, alpha: 0.05, solve: 'power' }).power).toBeLessThan(0.8);
  });

  it('other alpha and power targets (G*Power: 105 per group at power .95, 96 at alpha .01)', () => {
    const core = window.__StatsLabCore;
    expect(core.powerTTest({ d: 0.5, alpha: 0.05, power: 0.95, solve: 'n' }).n).toBe(105);
    expect(core.powerTTest({ d: 0.5, alpha: 0.01, power: 0.8, solve: 'n' }).n).toBe(96);
  });

  it.each(ONE_SAMPLE)('one-sample d = %s: N = %s through the same exact helper', (d, N) => {
    const pw = (n) => window.__StatsLabCore.powerNoncentralT(0.05, n - 1, d * Math.sqrt(n));
    expect(pw(N)).toBeGreaterThanOrEqual(0.8);
    expect(pw(N - 1)).toBeLessThan(0.8);
  });

  it('the noncentral t CDF matches an independent integration', () => {
    const nct = window.__StatsLabCore.nctCdf;
    for (const [t, df, delta] of [[2, 10, 1], [-1.5, 5, 0.5], [3, 30, 2.5], [1, 1, 3], [-2.2, 22, 2.8], [0, 7, 1.3], [4.5, 3, 6], [2.0, 200, -1.0]]) {
      expect(Math.abs(nct(t, df, delta) - refNctCdf(t, df, delta)), t + ', ' + df + ', ' + delta).toBeLessThan(1e-7);
    }
    // delta = 0 is the central t: P(T <= 2.228139) = .975 at df = 10 (table value).
    expect(nct(2.228138851986, 10, 0)).toBeCloseTo(0.975, 9);
  });

  it('solve for power and for the detectable d agree with each other', () => {
    const core = window.__StatsLabCore;
    const p = core.powerTTest({ d: 0.5, n: 64, alpha: 0.05, solve: 'power' }).power;
    expect(p).toBeCloseTo(0.8015, 3);
    const dMin = core.powerTTest({ n: 64, alpha: 0.05, power: 0.8, solve: 'd' }).d;
    expect(dMin).toBeGreaterThan(0.49);
    expect(dMin).toBeLessThan(0.5);
    expect(core.powerTTest({ d: dMin, n: 64, alpha: 0.05, solve: 'power' }).power).toBeCloseTo(0.8, 6);
  });

  it('rejects inputs with no answer instead of looping', () => {
    const core = window.__StatsLabCore;
    expect(core.powerTTest({ d: 0, alpha: 0.05, power: 0.8, solve: 'n' }).error).toBeTruthy();
    expect(core.powerTTest({ d: NaN, alpha: 0.05, power: 0.8, solve: 'n' }).error).toBeTruthy();
    expect(core.powerTTest({ d: 0.5, alpha: 1.5, power: 0.8, solve: 'n' }).error).toBeTruthy();
    expect(core.powerTTest({ d: 0.001, alpha: 0.05, power: 0.8, solve: 'n' }).error).toBeTruthy();
  });
});
