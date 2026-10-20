// Stats Lab math review 2 (2026-10-19): one-way ANOVA sample size.
// The old calculator treated F as normal with SD 1 and reported 31 per group
// for f = .25, k = 3, alpha .05, power .80. The answer is the smallest equal
// n whose exact noncentral-F power reaches the target: F'(k - 1, N - k,
// lambda = f^2 N), N = k n, which is G*Power's fixed-effects omnibus model.
// Expected values: G*Power 3.1 a priori output (total N and actual power);
// the k = 2 rows also equal the published two-sample t-test sizes for
// d = 2f (394, 64, 26 per group).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { React, ReactDOMClient, loadTool, resetStemLab, makeCtx } from './helpers/stem_widgets_smoke_harness.js';

const SRC_PATH = process.env.MATH_REVIEW2_STATS_SRC || 'stem_lab/stem_tool_statslab.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Reference distributions for the jStat double (the old code path reads
// jStat.centralF.inv and jStat.normal.cdf; the CDN copy is not loaded here).
function lnGamma(x) {
  // Shift to x >= 10, then Stirling's series.
  let acc = 0;
  while (x < 10) { acc -= Math.log(x); x += 1; }
  const x2 = x * x;
  return acc + (x - 0.5) * Math.log(x) - x + 0.5 * Math.log(2 * Math.PI) +
    1 / (12 * x) - 1 / (360 * x * x2) + 1 / (1260 * x * x2 * x2) - 1 / (1680 * x * x2 * x2 * x2);
}
function incBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  if (x > (a + 1) / (a + b + 2)) return 1 - incBeta(1 - x, b, a);
  // Continued fraction, evaluated by the forward recurrence of convergents.
  let A0 = 1, B0 = 1, A1 = 1, B1 = 1 - (a + b) * x / (a + 1);
  let f = A1 / B1;
  for (let m = 1; m < 10000; m++) {
    const e = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
    const A2 = A1 + e * A0, B2 = B1 + e * B0;
    const o = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1));
    const A3 = A2 + o * A1, B3 = B2 + o * B1;
    A0 = A2 / B3; B0 = B2 / B3; A1 = A3 / B3; B1 = 1;
    const next = A1;
    if (Math.abs(next - f) < 1e-15 * Math.abs(next)) { f = next; break; }
    f = next;
  }
  return Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x)) * f / a;
}
function erf(x) {
  const ax = Math.abs(x);
  let s = 0, term = ax;
  for (let n = 0; n < 400; n++) { s += term / (2 * n + 1); term *= -ax * ax / (n + 1); if (Math.abs(term) < 1e-17) break; }
  const v = ax > 5 ? 1 : 2 / Math.sqrt(Math.PI) * s;
  return x < 0 ? -v : v;
}
const normCdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
function invert(cdf, p) {
  let lo = 0, hi = 1;
  while (cdf(hi) < p) hi *= 2;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (cdf(mid) < p) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
const fCdf = (F, d1, d2) => (F <= 0 ? 0 : incBeta(d1 * F / (d1 * F + d2), d1 / 2, d2 / 2));
function installJStat() {
  window.jStat = {
    studentt: { cdf: () => 0.5, inv: (p, df) => Math.sqrt(invert((F) => fCdf(F, 1, df), 2 * p - 1)) },
    centralF: { inv: (p, d1, d2) => invert((F) => fCdf(F, d1, d2), p), cdf: fCdf },
    normal: {
      cdf: (z, mu, sd) => normCdf((z - (mu || 0)) / (sd || 1)),
      // The page's Type I/II chart reads normal.inv when jStat is present.
      inv: (p) => (p >= 0.5 ? 1 : -1) * (invert((z) => normCdf(z), Math.max(p, 1 - p))),
    },
  };
}

// [f, k, n per group, total N]
const GPOWER = [
  [0.10, 2, 394, 788], [0.10, 3, 323, 969], [0.10, 4, 274, 1096], [0.10, 5, 240, 1200],
  [0.25, 2, 64, 128], [0.25, 3, 53, 159], [0.25, 4, 45, 180], [0.25, 5, 40, 200],
  [0.40, 2, 26, 52], [0.40, 3, 22, 66], [0.40, 4, 19, 76], [0.40, 5, 16, 80],
];

let mounted = [];
function mount(powerInputs) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const s = { mode: 'power', testsRun: 0, powerInputs };
  function Host() {
    const [td, setTd] = React.useState({ statsLab: s });
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
  await React.act(async () => { btn.click(); await new Promise((r) => setTimeout(r, 0)); });
  return m.container.textContent;
}

beforeEach(() => {
  resetStemLab();
  installJStat();
  loadTool(SRC_PATH, 'statsLab');
});
afterEach(() => {
  mounted.forEach((m) => { React.act(() => m.root.unmount()); m.container.remove(); });
  mounted = [];
  delete window.jStat;
});

describe('one-way ANOVA power uses the exact noncentral F', () => {
  it('the calculator shows 53 per group (159 total) for f = .25, k = 3, alpha .05, power .80', async () => {
    const m = mount({ test: 'anova_oneWay', effectSize: 0.25, k: 3, alpha: 0.05, power: 0.8, n: null, solveFor: 'n', vizD: 0.5, vizN: 30, vizAlpha: 0.05 });
    const text = await calculate(m);
    expect(text.includes('53 subjects per group'), (text.match(/You need[\s\S]{0,152}/) || [''])[0]).toBe(true);
    expect(text.includes('159 total across 3 groups')).toBe(true);
  });

  it.each(GPOWER)('f = %s, k = %s: %s per group, N = %s', (f, k, n, N) => {
    const r = window.__StatsLabCore.powerANOVA({ f, k, alpha: 0.05, power: 0.8, solve: 'n' });
    expect(r.error, r.error).toBeUndefined();
    expect(r.n).toBe(n);
    expect(r.total_n).toBe(N);
    expect(r.power).toBeGreaterThanOrEqual(0.8);
  });

  it('reports the achieved power G*Power prints', () => {
    const core = window.__StatsLabCore;
    expect(core.powerANOVA({ f: 0.25, k: 3, alpha: 0.05, power: 0.8, solve: 'n' }).power).toBeCloseTo(0.8049, 3);
    // k = 2 is the two-sample t-test with d = 2f: n = 64 gives 0.8014596.
    expect(core.powerANOVA({ f: 0.25, k: 2, alpha: 0.05, power: 0.8, solve: 'n' }).power).toBeCloseTo(0.8015, 3);
  });

  it('other alpha and power targets', () => {
    const core = window.__StatsLabCore;
    // Same model, other targets (exact sums, worked outside the tool):
    // power .95 -> N = 252 (84 per group, power .9515);
    // alpha .01 -> N = 228 (76 per group, power .8029).
    expect(core.powerANOVA({ f: 0.25, k: 3, alpha: 0.05, power: 0.95, solve: 'n' }).n).toBe(84);
    expect(core.powerANOVA({ f: 0.25, k: 3, alpha: 0.01, power: 0.8, solve: 'n' }).n).toBe(76);
  });

  it('rejects inputs that have no answer instead of looping', () => {
    const core = window.__StatsLabCore;
    expect(core.powerANOVA({ f: 0, k: 3, alpha: 0.05, power: 0.8, solve: 'n' }).error).toBeTruthy();
    expect(core.powerANOVA({ f: NaN, k: 3, alpha: 0.05, power: 0.8, solve: 'n' }).error).toBeTruthy();
    expect(core.powerANOVA({ f: 0.25, k: 1, alpha: 0.05, power: 0.8, solve: 'n' }).error).toBeTruthy();
  });
});
