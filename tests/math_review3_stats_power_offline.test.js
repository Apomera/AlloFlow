// Stats Lab math review 3 (2026-10-20): the power calculator waited for the jStat
// CDN before every calculation, so the t-test, ANOVA and chi-square sizes (exact
// and self-contained since 10-19/10-20) failed offline with "Stats library failed
// to load". Those now compute at once with no jStat; only the correlation
// calculator, which still uses jStat's normal quantile, waits for it, and says so
// clearly when it cannot load. Expected sizes: G*Power 3.1 (ANOVA f = .25, k = 3:
// 53 per group; chi-square w = .3, df = 1: N = 88; t-test d = .5: 64 per group).
// MATH_REVIEW3_STATS points the suite at another copy (mutation checks).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { React, ReactDOMClient, loadTool, resetStemLab, makeCtx } from './helpers/stem_widgets_smoke_harness.js';

const SRC_PATH = process.env.MATH_REVIEW3_STATS || 'stem_lab/stem_tool_statslab.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const BASE = { effectSize: 0.5, alpha: 0.05, power: 0.8, n: null, solveFor: 'n', vizD: 0.5, vizN: 30, vizAlpha: 0.05 };
let mounted = [];
let toasts = [];
function mount(powerInputs) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  function Host() {
    const [td, setTd] = React.useState({ statsLab: { mode: 'power', testsRun: 0, powerInputs: Object.assign({}, BASE, powerInputs) } });
    const ctx = makeCtx({ toolData: td, addToast: (msg, kind) => toasts.push([msg, kind]), setToolData: (fn) => setTd((prev) => (typeof fn === 'function' ? fn(prev) : fn)) });
    return window.StemLab._registry.statsLab.render(ctx);
  }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => { root.render(React.createElement(Host)); });
  const m = { container, root };
  mounted.push(m);
  return m;
}
// Click and read the page in the same tick: an offline calculation must not wait.
async function calculate(m) {
  const btn = [...m.container.querySelectorAll('button')].find((b) => b.textContent.indexOf('Calculate required sample size') !== -1);
  expect(btn, 'calculate button').toBeTruthy();
  await React.act(async () => { btn.click(); });
  return m.container.textContent;
}
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  resetStemLab();
  delete window.jStat;
  toasts = [];
  loadTool(SRC_PATH, 'statsLab');
});
afterEach(() => {
  mounted.forEach((m) => { React.act(() => m.root.unmount()); m.container.remove(); });
  mounted = [];
  delete window.jStat;
  const tag = document.getElementById('jstat-cdn');
  if (tag) tag.remove();
});

describe('offline (no jStat): the self-contained calculators answer immediately', () => {
  it('one-way ANOVA', async () => {
    const text = await calculate(mount({ test: 'anova_oneWay', effectSize: 0.25, k: 3 }));
    expect(text.includes('53 subjects per group'), text.slice(0, 300)).toBe(true);
    expect(text.includes('159 total across 3 groups')).toBe(true);
  });

  it('chi-square', async () => {
    const text = await calculate(mount({ test: 'chiSquare', effectSize: 0.3, df: 1 }));
    expect(text.includes('88 total observations'), text.slice(0, 300)).toBe(true);
  });

  it('independent t-test', async () => {
    const text = await calculate(mount({ test: 'ttest_independent', effectSize: 0.5 }));
    expect(text.includes('64 subjects per group'), text.slice(0, 300)).toBe(true);
    expect(text.includes('128 total')).toBe(true);
  });

  it('none of them shows the library-failure toast', async () => {
    for (const test of ['anova_oneWay', 'chiSquare', 'ttest_independent']) await calculate(mount({ test }));
    await React.act(async () => { await flush(); });
    expect(toasts).toEqual([]);
  });
});

describe('the correlation calculator still needs jStat', () => {
  it('says clearly what is missing when the library cannot load', async () => {
    const m = mount({ test: 'pearson', effectSize: 0.3 });
    // Mounting preloads jStat; make this click start its own load, then fail it.
    const pre = document.getElementById('jstat-cdn');
    if (pre) pre.remove();
    await calculate(m);
    const tag = document.getElementById('jstat-cdn');
    expect(tag, 'a jStat load was started').toBeTruthy();
    await React.act(async () => { tag.dispatchEvent(new Event('error')); await flush(); await flush(); });
    const text = m.container.textContent;
    expect(text.includes('needs the jStat statistics library'), text.slice(0, 400)).toBe(true);
    expect(text.includes('work offline')).toBe(true);
    expect(toasts.some(([msg, kind]) => kind === 'error' && msg.includes('jStat'))).toBe(true);
  });

  it('computes as before once jStat is present', async () => {
    // Minimal jStat double: the normal quantile the Fisher-z formula reads.
    const cdf = (z) => { let s = 0, t = z; for (let n = 0; n < 300; n++) { s += t / (2 * n + 1); t *= -z * z / (2 * (n + 1)); } return 0.5 + s / Math.sqrt(2 * Math.PI); };
    const inv = (p) => { let lo = -10, hi = 10; for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (cdf(mid) < p) lo = mid; else hi = mid; } return (lo + hi) / 2; };
    window.jStat = { studentt: {}, normal: { inv: (p) => inv(p), cdf: (z) => cdf(z) } };
    const m = mount({ test: 'pearson', effectSize: 0.3 });
    await calculate(m);
    await React.act(async () => { await flush(); });
    // Fisher z: n = ceil(((1.959964 + 0.841621) / atanh(.3))^2 + 3) = 85.
    expect(m.container.textContent.includes('85 participants'), m.container.textContent.slice(0, 300)).toBe(true);
  });
});
