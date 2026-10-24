// Statistics Lab math-review fixes (2026-10-18). Each block pins one verified
// defect: the original file fails it, the fixed file passes it.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { React, ReactDOMClient, loadTool, renderTool, resetStemLab, makeCtx } from './helpers/stem_widgets_smoke_harness.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC_PATH = process.env.MATH_REVIEW_STATSLAB_SRC || 'stem_lab/stem_tool_statslab.js';
const SRC = readFileSync(resolve(process.cwd(), SRC_PATH), 'utf8');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function state(overrides = {}) {
  return {
    testsRun: 0, mode: 'data', wizardStep: 0, wizardAnswers: {}, selectedTest: null, sampleId: null,
    twoColData: { aLabel: 'X', bLabel: 'Y', a: [], b: [] },
    multiColData: { groups: [{ label: 'Group 1', values: [] }, { label: 'Group 2', values: [] }] },
    oneColData: { values: [], mu0: 0 },
    chiGofData: { observed: [], expected: [], labels: [] },
    chiIndepData: { rows: ['Row 1', 'Row 2'], cols: ['Col 1', 'Col 2'], table: [[0, 0], [0, 0]] },
    twoWayData: null,
    multiRegData: { x: [], y: [], xLabels: ['X1'] },
    powerInputs: { test: 'ttest_independent', effectSize: 0.5, alpha: 0.05, power: 0.8, n: null, solveFor: 'n', vizD: 0.5, vizN: 30, vizAlpha: 0.05 },
    lastResult: null, lastTestType: null,
    interpretationDraft: '', aiGradeResponse: null, aiGradeLoading: false, aiGradeOpens: 0,
    showMath: false, showWizard: false,
    ...overrides,
  };
}
const render = (s) => renderTool('statsLab', { statsLab: s });
const has = (html, s) => html.indexOf(s) !== -1;

// Live mount: real React state, so typed text and clicks re-render like the app.
let mounted = [];
function mount(s) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const xp = [];
  const box = { data: s };
  function Host() {
    const [td, setTd] = React.useState({ statsLab: s });
    box.data = td.statsLab;
    const ctx = makeCtx({
      toolData: td,
      setToolData: (fn) => setTd((prev) => (typeof fn === 'function' ? fn(prev) : fn)),
      awardXP: (...args) => xp.push(args),
    });
    return window.StemLab._registry.statsLab.render(ctx);
  }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => { root.render(React.createElement(Host)); });
  const m = { container, xp, box, root };
  mounted.push(m);
  return m;
}
function button(container, text) {
  return [...container.querySelectorAll('button')].find((b) => b.textContent.indexOf(text) !== -1);
}
function setValue(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
}
// One keystroke at a time, appending to whatever the textarea shows now.
function typeKeys(container, label, keys) {
  for (const ch of keys) {
    const el = container.querySelector('textarea[aria-label="' + label + '"]');
    setValue(el, el.value + ch);
    React.act(() => { el.dispatchEvent(new window.Event('input', { bubbles: true })); });
  }
  return container.querySelector('textarea[aria-label="' + label + '"]').value;
}

beforeEach(() => {
  resetStemLab();
  loadTool(SRC_PATH, 'statsLab');
});
afterEach(() => {
  mounted.forEach((m) => { React.act(() => m.root.unmount()); m.container.remove(); });
  mounted = [];
  delete window.jStat;
});

describe('#1 scatter plot reads r from the regression fit', () => {
  const SLEEP = [4, 5, 5, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 6, 7, 8, 5, 9, 6, 7];
  const SCORE = [62, 68, 71, 75, 78, 82, 79, 85, 88, 84, 90, 92, 89, 73, 81, 87, 65, 91, 76, 83];

  it('the Pearson test screen with the Sleep x Score sample renders', () => {
    const html = render(state({ mode: 'test', selectedTest: 'pearson', twoColData: { aLabel: 'Sleep', bLabel: 'Score', a: SLEEP, b: SCORE } }));
    const r = window.__StatsLabCore.pearson(SLEEP, SCORE).r;
    expect(has(html, 'r=' + r.toFixed(2) + ', r²=' + (r * r).toFixed(2)), 'fit note shows r').toBe(true);
  });

  it('a falling trend shows a negative r in the fit note and the label', () => {
    // x 1..5, y 10,8,7,4,2: Sxy = -20, Sxx = 10, Syy = 40.8, r = -20/sqrt(408) = -0.990
    const html = render(state({ mode: 'results', selectedTest: 'linearRegression', lastTestType: 'linearRegression',
      lastResult: window.__StatsLabCore.linearRegression([1, 2, 3, 4, 5], [10, 8, 7, 4, 2]),
      twoColData: { aLabel: 'X', bLabel: 'Y', a: [1, 2, 3, 4, 5], b: [10, 8, 7, 4, 2] } }));
    expect(has(html, '(r=-0.99, r²=0.98)')).toBe(true);
    expect(has(html, 'n=5, r=-0.99"')).toBe(true);
  });
});

describe('#2 APA write-up for two-way and repeated-measures ANOVA', () => {
  const clean = (arr) => (arr || []).filter((v) => typeof v === 'number' && isFinite(v));
  const slice = (from, to) => SRC.slice(SRC.indexOf(from), SRC.indexOf(to, SRC.indexOf(from)));
  const fns = () => new Function('_clean', 'mean', '_pF',
    slice('function anova_twoWay(', 'function anova_repeatedMeasures(') +
    slice('function anova_repeatedMeasures(', 'function multipleRegression(') +
    '\nreturn { twoWay: anova_twoWay, rm: anova_repeatedMeasures };')(clean, window.AlloStats.mean, () => NaN);

  it('the two-way ANOVA results screen renders', () => {
    const matrix = [[[8, 9, 10, 8, 9], [14, 15, 16, 15, 14]], [[7, 9, 8, 10, 8], [18, 19, 20, 18, 19]], [[5, 6, 4, 5, 6], [9, 10, 8, 9, 11]]];
    const res = fns().twoWay(matrix, 'Fertilizer', 'Light');
    const html = render(state({ mode: 'results', selectedTest: 'anova_twoWay', lastTestType: 'anova_twoWay', lastResult: res,
      twoWayData: { factorAName: 'Fertilizer', factorBName: 'Light', factorALevels: ['Organic', 'Synthetic', 'None'], factorBLevels: ['Low', 'High'], matrix } }));
    expect(has(html, 'Two-way ANOVA')).toBe(true);
  });

  it('repeated measures reports F(dfCond, dfError) and partial eta squared', () => {
    // 4 subjects x 3 conditions: SScond 18.167, SSsubj 22.917, SStotal 42.917,
    // SSerror 1.833; F = 9.083 / 0.3056 = 29.73; partial eta2 = 18.167 / 20 = 0.908.
    const rows = [[1, 2, 3], [2, 3, 5], [3, 5, 6], [4, 5, 8]];
    const res = fns().rm(rows);
    const html = render(state({ mode: 'results', selectedTest: 'anova_repeatedMeasures', lastTestType: 'anova_repeatedMeasures', lastResult: res,
      multiColData: { groups: [0, 1, 2].map((c) => ({ label: 'C' + (c + 1), values: rows.map((r) => r[c]) })) } }));
    expect(has(html, 'F(2, 6) = 29.73')).toBe(true);
    expect(has(html, 'partial η² = 0.908')).toBe(true);
  });
});

describe('#3 XP reaches the hub as awardXP(activityId, points, reason)', () => {
  const okCall = (xp, pts) => xp.some((c) => c[0] === 'statsLab' && c[1] === pts && typeof c[2] === 'string');
  const resultsState = () => state({ mode: 'results', lastTestType: 'ttest_oneSample', selectedTest: 'ttest_oneSample',
    oneColData: { values: [5, 6, 8], mu0: 5 }, lastResult: window.__StatsLabCore.ttestOneSample([5, 6, 8], 5) });

  it('running a test', async () => {
    // Test double for the CDN jStat (only what a one-sample t-test touches).
    window.jStat = { studentt: { cdf: () => 0.5, inv: () => 2 } };
    const m = mount(state({ mode: 'test', selectedTest: 'ttest_oneSample', oneColData: { values: [5, 6, 8], mu0: 5 } }));
    await React.act(async () => { button(m.container, 'Run test').click(); await new Promise((r) => setTimeout(r, 0)); });
    expect(okCall(m.xp, 15), JSON.stringify(m.xp)).toBe(true);
  });

  it('copying the APA write-up and exporting the report', () => {
    window.StemLab.writeClipboard = () => Promise.resolve();
    const m = mount(resultsState());
    React.act(() => { button(m.container, 'Copy APA').click(); });
    expect(okCall(m.xp, 5), JSON.stringify(m.xp)).toBe(true);
    React.act(() => { button(m.container, 'Export full report').click(); });
    expect(okCall(m.xp, 10), JSON.stringify(m.xp)).toBe(true);
  });

  it('submitting the AP quiz', () => {
    const m = mount(resultsState());
    React.act(() => { button(m.container, 'Start 5-question quiz').click(); });
    for (let q = 0; q < 5; q++) {
      const firstChoices = [...m.container.querySelectorAll('button')].filter((b) => b.textContent.indexOf('A.') === 0);
      React.act(() => { firstChoices[q].click(); });
    }
    React.act(() => { button(m.container, 'Submit quiz').click(); });
    const call = m.xp.find((c) => /quiz/.test(String(c[2])) || /quiz/.test(String(c[1])));
    expect(call && call[0], JSON.stringify(m.xp)).toBe('statsLab');
    expect(typeof call[1]).toBe('number');
  });
});

describe('#4 value textareas keep what the student is typing', () => {
  it.each([
    ['Column A values', '12\n15', (d) => d.twoColData.a, [12, 15]],
    ['Column B values', '2.5', (d) => d.twoColData.b, [2.5]],
    ['Group 1 values', '-3\n4', (d) => d.multiColData.groups[0].values, [-3, 4]],
    ['Single column values', '7,8.25', (d) => d.oneColData.values, [7, 8.25]],
  ])('%s', (label, keys, pick, want) => {
    const m = mount(state({ mode: 'data' }));
    const shown = typeKeys(m.container, label, keys);
    expect(shown).toBe(keys);
    expect(pick(m.box.data)).toEqual(want);
  });
});

describe('#6 chi-square goodness of fit rescales proportions to the observed N', () => {
  it('expected entered as proportions or ratios', () => {
    const gof = window.AlloStats.chiSquareGoodnessOfFit;
    // O = 30, 70 against a fair split: E = 50, 50, chi2 = 400/50 + 400/50 = 16.
    expect(gof([30, 70], [0.5, 0.5]).chiSquared).toBeCloseTo(16, 10);
    expect(gof([30, 70], [0.5, 0.5]).expected).toEqual([50, 50]);
    expect(gof([25, 75], [1, 3]).chiSquared).toBeCloseTo(0, 10);
    expect(gof([30, 70], [50, 50]).chiSquared).toBeCloseTo(16, 10);
  });

  it('the observed-vs-expected chart shows the rescaled counts', () => {
    const html = render(state({ mode: 'test', selectedTest: 'chiSquareGoodnessOfFit',
      chiGofData: { observed: [30, 70], expected: [0.5, 0.5], labels: ['Heads', 'Tails'] } }));
    expect(has(html, '>50.0</text>')).toBe(true);
  });
});

describe('#7 CSV paste keeps paired rows aligned', () => {
  async function paste(text) {
    const m = mount(state({ mode: 'data' }));
    const el = m.container.querySelector('textarea[aria-label="CSV paste for two columns"]');
    setValue(el, text);
    await React.act(async () => { el.dispatchEvent(new window.Event('paste', { bubbles: true })); await new Promise((r) => setTimeout(r, 90)); });
    return m.box.data.twoColData;
  }
  it('a blank cell mid-column drops that incomplete row instead of shifting the column', async () => {
    const t = await paste('Before,After\n10,9\n11,\n,30\n13,12\n14,13');
    expect(t.a).toEqual([10, 13, 14]);
    expect(t.b).toEqual([9, 12, 13]);
  });
  it('a shorter second column (trailing blanks) is still read column by column', async () => {
    const t = await paste('A,B\n1,5\n2,6\n3,\n4,');
    expect(t.a).toEqual([1, 2, 3, 4]);
    expect(t.b).toEqual([5, 6]);
  });
});

describe('#9 partial or malformed saved state still renders', () => {
  it.each([
    ['no chiGofData', (s) => { delete s.chiGofData; }],
    ['no chiIndepData', (s) => { delete s.chiIndepData; }],
    ['no multiRegData', (s) => { delete s.multiRegData; }],
  ])('data tab with %s', (_label, mutate) => {
    const s = state({ mode: 'data' });
    mutate(s);
    expect(() => render(s)).not.toThrow();
  });

  it('non-array bucket fields', () => {
    expect(() => render(state({ mode: 'data', chiGofData: { observed: 'abc', expected: [], labels: [] } }))).not.toThrow();
  });

  it('a group saved without a values array', () => {
    const groups = [{ label: 'A' }, null, { label: 'C', values: [1, 2] }];
    expect(() => render(state({ mode: 'data', multiColData: { groups } }))).not.toThrow();
    expect(() => render(state({ mode: 'test', selectedTest: 'anova_oneWay', multiColData: { groups } }))).not.toThrow();
  });
});

describe('#10 Type I/II visualizer accepts d = 0', () => {
  it('d = 0 stays 0 and power equals alpha', () => {
    const html = render(state({ mode: 'power', powerInputs: { test: 'ttest_independent', effectSize: 0.5, alpha: 0.05, power: 0.8, n: null, solveFor: 'n', vizD: 0, vizN: 30, vizAlpha: 0.05 } }));
    expect(/id="sl-viz-d"[^>]*value="0"/.test(html)).toBe(true);
    expect(/Power \(1−β\): <b[^>]*>0\.050<\/b>/.test(html)).toBe(true);
  });
});
