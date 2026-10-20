// Stats Lab math review 2 (2026-10-19): chi-square sample size.
// The old calculator replaced the noncentral chi-square with a normal curve
// and came out 2-3% short: 85 instead of 88 for w = .3, df = 1, while still
// printing "power >= 0.80" (the true power at 85 is about .79). The answer is
// the smallest N with P(X' > crit) >= target, X' ~ noncentral chi-square(df,
// lambda = w^2 N), which is G*Power's model. df = 1 values are G*Power 3.1
// output (785, 88, 32); the df > 1 rows are the same exact sum worked outside
// the tool.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { React, ReactDOMClient, loadTool, resetStemLab, makeCtx } from './helpers/stem_widgets_smoke_harness.js';

const SRC_PATH = process.env.MATH_REVIEW2_STATS_SRC || 'stem_lab/stem_tool_statslab.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function erf(x) {
  const ax = Math.abs(x);
  let s = 0, term = ax;
  for (let n = 0; n < 400; n++) { s += term / (2 * n + 1); term *= -ax * ax / (n + 1); if (Math.abs(term) < 1e-17) break; }
  const v = ax > 5 ? 1 : 2 / Math.sqrt(Math.PI) * s;
  return x < 0 ? -v : v;
}
// Upper .05 critical values of chi-square (tables) for the jStat double that
// the old code path reads; the CDN copy is not loaded under vitest.
const CHI_CRIT_05 = { 1: 3.841458820694124, 2: 5.991464547107979, 4: 9.487729036781154 };
function installJStat() {
  window.jStat = {
    studentt: { cdf: () => 0.5, inv: () => 2 },
    chisquare: { inv: (p, df) => { if (Math.abs(p - 0.95) > 1e-12 || !CHI_CRIT_05[df]) throw new Error('no table value'); return CHI_CRIT_05[df]; } },
    normal: {
      cdf: (z, mu, sd) => 0.5 * (1 + erf(((z - (mu || 0)) / (sd || 1)) / Math.SQRT2)),
      // The page's Type I/II chart reads normal.inv when jStat is present.
      inv: (p) => {
        const q = Math.max(p, 1 - p);
        let lo = 0, hi = 10;
        for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (0.5 * (1 + erf(mid / Math.SQRT2)) < q) lo = mid; else hi = mid; }
        return (p >= 0.5 ? 1 : -1) * (lo + hi) / 2;
      },
    },
  };
}

// [w, df, N]
const CASES = [
  [0.1, 1, 785], [0.3, 1, 88], [0.5, 1, 32],
  [0.3, 2, 108], [0.3, 4, 133], [0.5, 4, 48],
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

describe('chi-square power uses the exact noncentral chi-square', () => {
  it('the calculator shows 88 total observations for w = .3, df = 1', async () => {
    const m = mount({ test: 'chiSquare', effectSize: 0.3, df: 1, alpha: 0.05, power: 0.8, n: null, solveFor: 'n', vizD: 0.5, vizN: 30, vizAlpha: 0.05 });
    const btn = [...m.container.querySelectorAll('button')].find((b) => b.textContent.indexOf('Calculate required sample size') !== -1);
    await React.act(async () => { btn.click(); await new Promise((r) => setTimeout(r, 0)); });
    const text = m.container.textContent;
    expect(text.includes('88 total observations'), (text.match(/You need[\s\S]{0,112}/) || [''])[0]).toBe(true);
  });

  it.each(CASES)('w = %s, df = %s: N = %s', (w, df, N) => {
    const r = window.__StatsLabCore.powerChiSquare({ w, df, alpha: 0.05, power: 0.8, solve: 'n' });
    expect(r.error, r.error).toBeUndefined();
    expect(r.n).toBe(N);
    expect(r.power).toBeGreaterThanOrEqual(0.8);
  });

  it('df = 1 power equals the two-sided z test it reduces to', () => {
    // With df = 1, X' = Z^2 for Z ~ N(sqrt(lambda), 1), so
    // power = Phi(sqrt(lambda) - 1.96) + Phi(-sqrt(lambda) - 1.96). N = 88, w = .3.
    const ncp = Math.sqrt(0.09 * 88), z = 1.959963984540054;
    const Phi = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
    const r = window.__StatsLabCore.powerChiSquare({ w: 0.3, df: 1, alpha: 0.05, power: 0.8, solve: 'n' });
    expect(r.power).toBeCloseTo(Phi(ncp - z) + Phi(-ncp - z), 6);
  });

  it('rejects inputs that have no answer', () => {
    const core = window.__StatsLabCore;
    expect(core.powerChiSquare({ w: 0, df: 1, alpha: 0.05, power: 0.8, solve: 'n' }).error).toBeTruthy();
    expect(core.powerChiSquare({ w: 0.3, df: 0, alpha: 0.05, power: 0.8, solve: 'n' }).error).toBeTruthy();
  });
});
