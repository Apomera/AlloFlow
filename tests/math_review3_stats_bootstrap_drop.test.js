// Stats Lab math review 3 (2026-10-20): the bootstrap scored a resample whose
// statistic is undefined (r or slope when every resampled x is the same, F when
// no resampled group has any spread) as 0, which drags the interval toward 0 at
// small n. Those resamples are now dropped and counted, and the page says how
// many. The expected samples are rebuilt here by replaying the same random
// draws with an independent computation of r, the slope and F.
// MATH_REVIEW3_STATS points the suite at another copy (mutation checks).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { React, ReactDOMClient, loadTool, resetStemLab, makeCtx } from './helpers/stem_widgets_smoke_harness.js';

const SRC_PATH = process.env.MATH_REVIEW3_STATS || 'stem_lab/stem_tool_statslab.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Seeded generator so the tool's draws can be replayed exactly.
function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
const realRandom = Math.random;
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const same = (a) => a.every((v) => v === a[0]);
function refR(x, y) {
  if (same(x) || same(y)) return NaN;
  const mx = mean(x), my = mean(y);
  let sxy = 0, sxx = 0, syy = 0;
  x.forEach((v, i) => { sxy += (v - mx) * (y[i] - my); sxx += (v - mx) ** 2; syy += (y[i] - my) ** 2; });
  return Math.max(-1, Math.min(1, sxy / Math.sqrt(sxx * syy)));
}
function refSlope(x, y) {
  if (same(x)) return NaN;
  const mx = mean(x), my = mean(y);
  let sxy = 0, sxx = 0;
  x.forEach((v, i) => { sxy += (v - mx) * (y[i] - my); sxx += (v - mx) ** 2; });
  return sxy / sxx;
}
function refF(groups) {
  if (groups.every(same)) return NaN;
  const all = groups.flat(), gm = mean(all), k = groups.length, N = all.length;
  let ssb = 0, ssw = 0;
  groups.forEach((g) => { const m = mean(g); ssb += g.length * (m - gm) ** 2; g.forEach((v) => { ssw += (v - m) ** 2; }); });
  return (ssb / (k - 1)) / (ssw / (N - k));
}
// Replay: the tool draws one Math.random() per resampled element, in order.
function replayPairs(seed, a, b, stat, reps) {
  const rnd = lcg(seed), n = a.length, out = [];
  for (let k = 0; k < reps; k++) {
    const idx = Array.from({ length: n }, () => Math.floor(rnd() * n));
    out.push(stat(idx.map((i) => a[i]), idx.map((i) => b[i])));
  }
  return out;
}
function replayGroups(seed, groups, reps) {
  const rnd = lcg(seed), out = [];
  for (let k = 0; k < reps; k++) out.push(refF(groups.map((g) => g.map(() => g[Math.floor(rnd() * g.length)]))));
  return out;
}
const finite = (v) => typeof v === 'number' && isFinite(v);

beforeEach(() => { resetStemLab(); delete window.jStat; loadTool(SRC_PATH, 'statsLab'); });
afterEach(() => { Math.random = realRandom; });

function run(seed, d, type) {
  Math.random = lcg(seed);
  try { return window.__StatsLabCore.bootstrapCI(d, type, 0.95, 1000); } finally { Math.random = realRandom; }
}
function expectSamples(boot, expected) {
  const kept = expected.filter(finite).sort((p, q) => p - q);
  expect(boot.error, boot.error).toBeUndefined();
  expect(boot.dropped).toBe(expected.length - kept.length);
  expect(boot.requested).toBe(1000);
  expect(boot.nReps).toBe(kept.length);
  expect(boot.samples.length).toBe(kept.length);
  boot.samples.forEach((s, i) => expect(Math.abs(s - kept[i]) <= 1e-9 * Math.max(1, Math.abs(kept[i])), 'sample ' + i).toBe(true));
}

describe('undefined resamples are dropped, not scored 0', () => {
  it('Pearson r at n = 4: resamples with one repeated x are dropped and counted', () => {
    const a = [1, 2, 3, 4], b = [2, 1, 4, 3];
    const boot = run(7, { twoColData: { a, b } }, 'pearson');
    const expected = replayPairs(7, a, b, refR, 1000);
    expect(expected.filter((v) => !finite(v)).length).toBeGreaterThan(0);
    expectSamples(boot, expected);
  });

  it('slope: constant-x resamples are dropped, while a flat y keeps its real slope of 0', () => {
    const a = [1, 1, 1, 2, 3], b = [3, 4, 5, 9, 9];
    const boot = run(11, { twoColData: { a, b } }, 'linearRegression');
    const expected = replayPairs(11, a, b, refSlope, 1000);
    expect(expected.filter((v) => !finite(v)).length).toBeGreaterThan(50);
    expectSamples(boot, expected);
    // x varies, y is flat in many resamples: slope 0 is defined and must stay.
    const flat = run(3, { twoColData: { a: [1, 2, 3, 4], b: [5, 5, 5, 6] } }, 'linearRegression');
    const flatExpected = replayPairs(3, [1, 2, 3, 4], [5, 5, 5, 6], refSlope, 1000);
    expect(flatExpected.filter((v) => v === 0).length).toBeGreaterThan(0);
    expectSamples(flat, flatExpected);
    expect(flat.samples.filter((v) => v === 0).length).toBe(flatExpected.filter((v) => v === 0).length);
  });

  it('one-way ANOVA F: resamples with no within-group spread are dropped', () => {
    const groups = [[1, 1, 2], [5, 5, 6], [9, 9, 9]];
    const boot = run(5, { multiColData: { groups: groups.map((values, i) => ({ label: 'G' + i, values })) } }, 'anova_oneWay');
    const expected = replayGroups(5, groups, 1000);
    expect(expected.filter((v) => !finite(v)).length).toBeGreaterThan(50);
    expectSamples(boot, expected);
    expect(boot.samples.includes(0)).toBe(false);
  });

  it('nothing is dropped when every resample is defined (mean difference)', () => {
    const boot = run(9, { twoColData: { a: [4, 5, 6, 7], b: [1, 2, 2, 3] } }, 'ttest_independent');
    expect(boot.dropped).toBe(0);
    expect(boot.nReps).toBe(1000);
  });

  it('data whose own statistic is undefined get a message, not an interval', () => {
    const boot = run(1, { twoColData: { a: [2, 2, 2, 2], b: [1, 2, 3, 4] } }, 'pearson');
    expect(typeof boot.error).toBe('string');
  });
});

describe('the page reports the dropped resamples', () => {
  it('shows how many of the 1000 were dropped', async () => {
    const a = [1, 1, 1, 2, 3], b = [3, 4, 5, 9, 9];
    const lastResult = window.__StatsLabCore.linearRegression(a, b);
    const container = document.createElement('div');
    document.body.appendChild(container);
    function Host() {
      const [td, setTd] = React.useState({ statsLab: { mode: 'results', testsRun: 1, lastTestType: 'linearRegression', lastResult, twoColData: { a, b, aLabel: 'x', bLabel: 'y' } } });
      return window.StemLab._registry.statsLab.render(makeCtx({ toolData: td, setToolData: (fn) => setTd((prev) => (typeof fn === 'function' ? fn(prev) : fn)) }));
    }
    const root = ReactDOMClient.createRoot(container);
    await React.act(async () => { root.render(React.createElement(Host)); });
    const btn = [...container.querySelectorAll('button')].find((x) => x.textContent.indexOf('Bootstrap: 1000 resamples') !== -1);
    expect(btn, 'bootstrap button').toBeTruthy();
    Math.random = lcg(11);
    await React.act(async () => { btn.click(); });
    Math.random = realRandom;
    const dropped = replayPairs(11, a, b, refSlope, 1000).filter((v) => !finite(v)).length;
    const note = container.querySelector('[data-sl-boot-dropped]');
    expect(note, 'dropped-resamples note').toBeTruthy();
    expect(note.textContent).toContain(dropped + ' of 1000 resamples were dropped');
    expect(note.textContent).toContain('The interval uses the other ' + (1000 - dropped) + '.');
    await React.act(async () => root.unmount());
    container.remove();
  });
});
