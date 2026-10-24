// Stats Lab math review 2 (2026-10-19): the AP Bio Hardy-Weinberg sample.
// Observed AA, Aa, aa = 212, 416, 172 (N = 800). The allele frequency comes
// from the same counts: p = (2*212 + 416) / 1600 = .525, q = .475, so the
// expected counts are p^2 N, 2pq N, q^2 N = 220.5, 399, 180.5 (the sample had
// 205.6, 432, 162.4), and estimating p costs a degree of freedom:
// df = 3 - 1 - 1 = 1 (the test used 2).
// chi^2 = 8.5^2/220.5 + 17^2/399 + 8.5^2/180.5 = 1.45225; p = .228 on 1 df.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { React, ReactDOMClient, loadTool, renderTool, resetStemLab, makeCtx } from './helpers/stem_widgets_smoke_harness.js';

const SRC_PATH = process.env.MATH_REVIEW2_STATS_SRC || 'stem_lab/stem_tool_statslab.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function erf(x) {
  const ax = Math.abs(x);
  let s = 0, term = ax;
  for (let n = 0; n < 400; n++) { s += term / (2 * n + 1); term *= -ax * ax / (n + 1); if (Math.abs(term) < 1e-17) break; }
  const v = ax > 5 ? 1 : 2 / Math.sqrt(Math.PI) * s;
  return x < 0 ? -v : v;
}
// Chi-square CDF for the jStat double: df 1 = erf(sqrt(x/2)), df 2 = 1 - e^(-x/2).
function chiCdf(x, df) {
  if (df === 1) return erf(Math.sqrt(x / 2));
  if (df === 2) return 1 - Math.exp(-x / 2);
  throw new Error('chiCdf double: df ' + df);
}

const OBS = [212, 416, 172];
const N = 800;
const pHat = (2 * OBS[0] + OBS[1]) / (2 * N);
const qHat = 1 - pHat;
const EXP = [pHat * pHat * N, 2 * pHat * qHat * N, qHat * qHat * N];
const CHI2 = OBS.reduce((s, o, i) => s + (o - EXP[i]) ** 2 / EXP[i], 0);

let mounted = [];
function mount(s) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const box = { data: s };
  function Host() {
    const [td, setTd] = React.useState({ statsLab: s });
    box.data = td.statsLab;
    const ctx = makeCtx({ toolData: td, setToolData: (fn) => setTd((prev) => (typeof fn === 'function' ? fn(prev) : fn)) });
    return window.StemLab._registry.statsLab.render(ctx);
  }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => { root.render(React.createElement(Host)); });
  const m = { container, root, box };
  mounted.push(m);
  return m;
}
const button = (container, text) => [...container.querySelectorAll('button')].find((b) => b.textContent.indexOf(text) !== -1);

beforeEach(() => {
  resetStemLab();
  window.jStat = { studentt: { cdf: () => 0.5, inv: () => 2 }, chisquare: { cdf: chiCdf } };
  loadTool(SRC_PATH, 'statsLab');
});
afterEach(() => {
  mounted.forEach((m) => { React.act(() => m.root.unmount()); m.container.remove(); });
  mounted = [];
  delete window.jStat;
});

describe('Hardy-Weinberg sample', () => {
  it('hand values', () => {
    expect(pHat).toBe(0.525);
    expect(EXP[0]).toBeCloseTo(220.5, 10);
    expect(EXP[1]).toBeCloseTo(399, 10);
    expect(EXP[2]).toBeCloseTo(180.5, 10);
    expect(CHI2).toBeCloseTo(1.45225, 5);
  });

  it('loading the sample gives p^2 N, 2pq N, q^2 N and one estimated parameter', () => {
    const m = mount({ mode: 'home', testsRun: 0 });
    React.act(() => { button(m.container, 'Hardy-Weinberg Equilibrium').click(); });
    const g = m.box.data.chiGofData;
    expect(g.observed).toEqual(OBS);
    g.expected.forEach((e, i) => expect(e).toBeCloseTo(EXP[i], 6));
    expect(g.estimatedParams).toBe(1);
  });

  it('running it reports chi^2(1) = 1.45, p = .228', async () => {
    const m = mount({ mode: 'home', testsRun: 0 });
    React.act(() => { button(m.container, 'Hardy-Weinberg Equilibrium').click(); });
    await React.act(async () => { button(m.container, 'Run test').click(); await new Promise((r) => setTimeout(r, 0)); });
    const r = m.box.data.lastResult;
    expect(r.error, r.error).toBeUndefined();
    expect(r.df).toBe(1);
    expect(r.chiSquared).toBeCloseTo(CHI2, 6);
    expect(r.p).toBeCloseTo(1 - erf(Math.sqrt(CHI2 / 2)), 6);
    expect(r.p).toBeCloseTo(0.2282, 3);
    expect(window.AlloStats.apaWriteup(r)).toBe('χ²(1, N = 800) = 1.45, p = .228.');
    const html = renderTool('statsLab', { statsLab: Object.assign({}, m.box.data, { showMath: true }) });
    expect(html.indexOf('df = categories - 1 - estimated parameters = 3 - 1 - 1 = 1')).toBeGreaterThan(-1);
  });

  it('the data panel lets the student set the estimated parameters', () => {
    const m = mount({ mode: 'data', testsRun: 0, chiGofData: { observed: OBS.slice(), expected: EXP.slice(), labels: ['AA', 'Aa', 'aa'], estimatedParams: 1 } });
    const input = m.container.querySelector('#sl-gof-estimated');
    expect(input, 'estimated-parameters input').toBeTruthy();
    expect(input.value).toBe('1');
    expect(m.container.querySelector('label[for="sl-gof-estimated"]')).toBeTruthy();
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, '0');
    React.act(() => { input.dispatchEvent(new window.Event('input', { bubbles: true })); });
    expect(m.box.data.chiGofData.estimatedParams).toBe(0);
    const again = m.container.querySelector('#sl-gof-estimated');
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(again, '1');
    React.act(() => { again.dispatchEvent(new window.Event('input', { bubbles: true })); });
    // Adding a category keeps the setting.
    React.act(() => { button(m.container, '+ Add category').click(); });
    expect(m.box.data.chiGofData.observed.length).toBe(4);
    expect(m.box.data.chiGofData.estimatedParams).toBe(1);
  });

  it('df = categories - 1 - estimated parameters, and fixed proportions are unchanged', () => {
    const gof = window.AlloStats.chiSquareGoodnessOfFit;
    expect(gof(OBS, EXP, 1).df).toBe(1);
    expect(gof(OBS, EXP, 0).df).toBe(2);
    expect(gof(OBS, EXP).df).toBe(2);
    expect(gof(OBS, EXP, 2).error).toBeTruthy();
    expect(gof([30, 70], [0.5, 0.5]).df).toBe(1);
  });
});
