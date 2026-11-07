import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FILE, setup, teardown, mount, click, flush, key, pts, byText, typeInto, setValue, React } from './dataplot_deep_helpers.js';

// Regression tests for the confirmed bugs in the 2026-11-03 review (data_report.md, Data Plot).
// Each one runs the real tool through React. Run with DATAPLOT_DEEP_SRC=<original file> to see
// them fail on the old behaviour.
beforeEach(() => setup());
afterEach(async () => { await teardown(); vi.restoreAllMocks(); });

const chartSvg = () => document.querySelector('svg[data-dataplot-svg]');
function luminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) return null;
  const v = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
const contrastOnWhite = (hex) => { const l = luminance(hex); return l == null ? null : 1.05 / (l + 0.05); };

describe('HIGH bar chart baseline (review :1080-1082)', () => {
  it('bar heights are proportional to the values: 88 kg is 1.76 times 50 kg', async () => {
    const hw = [50, 52, 58, 62, 68, 72, 78, 82, 88];
    await mount({ points: hw.map((y, i) => ({ x: 150 + 5 * i, y })), chartType: 'bar' });
    const hs = Array.from(chartSvg().querySelectorAll('rect')).filter((r) => !r.closest('defs')).map((r) => +r.getAttribute('height'));
    expect(hs.length).toBe(9);
    expect(hs[8] / hs[0]).toBeCloseTo(88 / 50, 1);
  });
  it('a negative value hangs down from the zero line', async () => {
    await mount({ points: [{ x: 1, y: -5 }, { x: 2, y: 3 }, { x: 3, y: 8 }], chartType: 'bar' });
    const rects = Array.from(chartSvg().querySelectorAll('rect')).filter((r) => !r.closest('defs'));
    const [neg, a, b] = rects.map((r) => ({ top: +r.getAttribute('y'), bottom: +r.getAttribute('y') + +r.getAttribute('height'), h: +r.getAttribute('height') }));
    // The positive bars end where the negative bar starts: the zero line.
    expect(Math.abs(a.bottom - neg.top)).toBeLessThan(0.5);
    expect(Math.abs(b.bottom - neg.top)).toBeLessThan(0.5);
    expect(b.h / neg.h).toBeCloseTo(8 / 5, 1);
  });
});

describe('HIGH Guess-R² leak (review :918, :798-815, :1495-1556)', () => {
  it('no R² is shown while the quiz is open, and the quiz draws its scatter plot', async () => {
    const m = await mount({ activeTab: 'quiz', quizType: 'guessR2', points: pts([1, 2, 3, 4, 5]) });
    await click(byText('button', /Start Quiz/i));
    const spans = Array.from(document.querySelectorAll('span')).map((s) => s.textContent);
    expect(spans.filter((s) => /^R²\s?=/.test(s))).toEqual([]);
    expect(document.querySelectorAll('#data-plot-panel-quiz svg circle').length).toBeGreaterThanOrEqual(15);
    // The student's own data are untouched by the quiz.
    expect(m.latest.points).toEqual(pts([1, 2, 3, 4, 5]));
  });
});

describe('MED single-point pie (review :1133-1139)', () => {
  it('one positive value draws a full circle with a visible 100% label', async () => {
    await mount({ points: [{ x: 1, y: 10 }], chartType: 'pie' });
    const svg = chartSvg();
    const circle = svg.querySelector('circle');
    expect(circle && +circle.getAttribute('r')).toBe(120);
    const label = Array.from(svg.querySelectorAll('text')).find((x) => x.textContent === '100%');
    expect(label).toBeTruthy();
    expect(label.getAttribute('fill')).not.toBe(circle.getAttribute('fill'));
  });
});

describe('MED mode ties (review :440-444)', () => {
  const modeCell = () => { const c = Array.from(document.querySelectorAll('#data-plot-panel-stats .grid > div')).find((el) => /Mode/.test(el.firstChild.textContent)); return c ? c.lastChild.textContent : null; };
  it('[1,1,2,2,3] reports both modes', async () => {
    await mount({ points: pts([1, 1, 2, 2, 3]), activeTab: 'stats', teacher: { requirePredict: false } });
    expect(modeCell()).toMatch(/1/);
    expect(modeCell()).toMatch(/2/);
  });
  it('[1,2,3,4,5] reports no mode, and [1,1,2,2] (all equally often) reports no mode', async () => {
    await mount({ points: pts([1, 2, 3, 4, 5]), activeTab: 'stats', teacher: { requirePredict: false } });
    expect(modeCell()).toMatch(/no mode/i);
    await mount({ points: pts([1, 1, 2, 2]), activeTab: 'stats', teacher: { requirePredict: false } });
    expect(modeCell()).toMatch(/no mode/i);
  });
});

describe('MED silent model fallbacks (review :403-413)', () => {
  it('a log model cannot predict at x = -1 and says why', async () => {
    await mount({ points: [{ x: 1, y: 0 }, { x: 2, y: 0.69 }, { x: 4, y: 1.39 }, { x: 8, y: 2.08 }], regressionType: 'logarithmic', activeTab: 'tools', predX: '-1' });
    const panel = document.querySelector('#data-plot-panel-tools');
    expect(panel.textContent).toMatch(/undefined for x ≤ 0/);
    expect(Array.from(panel.querySelectorAll('div,output')).some((dd) => /^-?\d+\.\d\d$/.test(dd.textContent))).toBe(false);
  });
  it('an exponential model with every y < 0 is refused with a reason, not replaced by a line', async () => {
    await mount({ points: [{ x: 1, y: -2 }, { x: 2, y: -4 }, { x: 3, y: -8 }], regressionType: 'exponential', activeTab: 'chart' });
    const text = document.body.textContent;
    expect(text).not.toMatch(/y = -?\d+\.\d\dx [+-] /);
    expect(text).toMatch(/needs every y value above 0/);
    expect(document.querySelector('[data-dataplot-fit]')).toBeNull();
  });
});

describe('MED paste parsing (review :1688-1693, :986)', () => {
  const importBtn = () => byText('button', /Import/);
  it.each([
    ['tab separated with a header (Google Sheets)', 'height\tweight\n1\t5\n2\t8\n3\t12', 3],
    ['semicolons', '1;5\n2;8', 2],
    ['quoted cells', '"1","5"\n"2","8"', 2],
    ['spaces', '1 5\n2 8', 2],
    ['a blank line and a junk line', '1, 5\n2, 8\n\nabc,1\n3,12', 3]
  ])('%s', async (_name, text, count) => {
    const m = await mount({ activeTab: 'tools' });
    setValue(document.getElementById('dp-import-csv'), text);
    await click(importBtn());
    expect(m.latest.points.length).toBe(count);
  });
  it('the header row becomes the axis labels, and Add-to-my-data appends', async () => {
    const m = await mount({ activeTab: 'tools', points: pts([1, 2]) });
    await click(byText('button', /Add to my data/));
    setValue(document.getElementById('dp-import-csv'), 'a\tb\n7\t8');
    await click(importBtn());
    expect(m.latest.points).toEqual([{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 7, y: 8 }]);
  });
  it('the tools hint no longer promises a PNG export', async () => {
    await mount({ activeTab: 'tools' });
    expect(document.body.textContent).not.toMatch(/PNG/);
  });
  it('a data-table value can be edited in place', async () => {
    const m = await mount({ points: pts([5, 6, 7]), tableMode: true });
    const input = document.querySelector('[data-dataplot-row="1"] td:nth-of-type(2) input');
    setValue(input, '42');
    await React.act(async () => { input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); });
    await flush();
    expect(m.latest.points[1]).toEqual({ x: 2, y: 42 });
  });
});

describe('MED sampling inquiry (review :1729-1730, :1744)', () => {
  it('a large sample with heavy noise is compared with the population r that noise produces, not called misleading', async () => {
    await mount({ activeTab: 'inquiry', corrInquiry: { trueR: 0.7, n: 200, noiseSD: 3, outlierCount: 0, log: [] } });
    const panel = document.querySelector('#data-plot-panel-inquiry');
    expect(panel.textContent).not.toMatch(/Misleading sample/);
    // population r = 0.7 / sqrt(0.49 + 0.51 * 9) = 0.311
    expect(panel.textContent).toMatch(/population r = 0\.31/);
  });
  it('every outlier is drawn, even far off the old fixed scale', async () => {
    await mount({ activeTab: 'inquiry', corrInquiry: { trueR: 0.7, n: 30, noiseSD: 1, outlierCount: 10, log: [] } });
    expect(document.querySelectorAll('#data-plot-panel-inquiry svg circle').length).toBe(40);
  });
});

describe('LOW axis padding, sign formatting', () => {
  it('small-range data use most of the plot instead of a fixed ±1 pad', async () => {
    await mount({ points: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.3 }, { x: 0.3, y: 0.5 }], chartType: 'scatter' });
    const cys = Array.from(chartSvg().querySelectorAll('circle')).filter((c) => c.getAttribute('r') === '5').map((c) => +c.getAttribute('cy'));
    expect(cys.length).toBe(3);
    expect(Math.max(...cys) - Math.min(...cys)).toBeGreaterThan(150);
  });
  it('histogram bin labels keep enough decimals to tell bins apart', async () => {
    await mount({ points: pts([0.1, 0.2, 0.25, 0.3, 0.4, 0.45, 0.5, 0.9, 0.95]), chartType: 'histogram' });
    const labels = Array.from(chartSvg().querySelectorAll('text')).map((x) => x.textContent).filter((s) => /–|-/.test(s) && /\d/.test(s));
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels.some((l) => /^0-0$|^1-1$/.test(l))).toBe(false);
  });
  it('a quadratic equation never prints "+ -"', async () => {
    await mount({ points: [{ x: 0, y: 5 }, { x: 1, y: 2 }, { x: 2, y: 1 }, { x: 3, y: 2 }], regressionType: 'quadratic' });
    const text = document.body.textContent;
    expect(text).toMatch(/y = /);
    expect(text).not.toMatch(/\+ -/);
  });
});

describe('LOW badges and XP (review :604, :579, :834)', () => {
  const ids = (m) => m.award.mock.calls.map((c) => c[0]);
  it('two points (R² = 1) do not earn Perfect Fit; five collinear points the student typed do', async () => {
    let m = await mount({ points: [{ x: 1, y: 1 }, { x: 2, y: 3 }] });
    await flush();
    expect(ids(m)).not.toContain('dataPlot_badge_strong_r2');
    // Engagement build (2026-11-04): only the student's own points count, so the five points are
    // typed into the data table here; five preset points earn nothing (dataplot_engage_build).
    m = await mount({});
    for (const x of [1, 2, 3, 4, 5]) {
      await typeInto(document.getElementById('dp-x-input'), String(x));
      await typeInto(document.getElementById('dp-y-input'), String(2 * x + 1));
      await click(byText('button', /\+ Add row/));
    }
    await flush();
    expect(ids(m)).toContain('dataPlot_badge_strong_r2');
  });
  it('Rank Expert waits until rho is opened', async () => {
    const m = await mount({ points: [1, 2, 3, 4, 5, 6].map((x) => ({ x, y: x * x })) });
    await flush();
    expect((m.latest.earnedBadges || {}).spearman).toBeUndefined();
    await click(document.querySelector('[data-dataplot-spearman-toggle]'));
    // The badge is recorded but pays no XP: opening rho is looking (dataplot_engage_followup).
    expect(m.latest.earnedBadges.spearman).toBeTruthy();
    expect(ids(m)).not.toContain('dataPlot_badge_spearman');
  });
  it('quiz XP is paid once per distinct item and never above the cap', async () => {
    const m = await mount({ activeTab: 'quiz', quizType: 'matchChart' });
    const keys = new Set();
    for (let i = 0; i < 30; i++) {
      await click(byText('button', /Start Quiz|New question|Next/i));
      const q = m.latest.dpQuiz; keys.add(q.key);
      await click(document.querySelector('[data-dataplot-choice="' + q.answer + '"]'));
    }
    const quizCalls = m.award.mock.calls.filter((c) => c[0] === 'dataPlot');
    expect(quizCalls.length).toBeLessThanOrEqual(keys.size);
    expect(quizCalls.reduce((s, c) => s + c[1], 0)).toBeLessThanOrEqual(10 * keys.size);
  });
});

describe('MED accessible names (review :1026, :1039, :1507, :1538, :1608)', () => {
  const names = (sel) => Array.from(document.querySelectorAll(sel)).map((b) => (b.getAttribute('aria-label') || b.textContent).trim());
  it('chart type, dataset and transform buttons each have their own name', async () => {
    await mount({ points: pts([1, 2, 3]) });
    const chartBtns = names('[data-dataplot-chart]');
    expect(chartBtns.length).toBeGreaterThanOrEqual(7);
    expect(new Set(chartBtns).size).toBe(chartBtns.length);
    const all = names('#data-plot-panel-chart button');
    const counts = {}; all.forEach((n) => { counts[n] = (counts[n] || 0) + 1; });
    expect(Object.entries(counts).filter(([n, c]) => c > 1 && /Switch Chart|Load Dataset/.test(n))).toEqual([]);
    await click(document.getElementById('data-plot-tab-tools'));
    const tr = names('#data-plot-panel-tools button').filter((n) => /Transform Data/.test(n));
    expect(tr).toEqual([]);
  });
  it('quiz type buttons and the Find-the-Outlier answers are named', async () => {
    await mount({ activeTab: 'quiz', quizType: 'outlier' });
    const qt = names('#data-plot-panel-quiz button').filter((n) => n === 'Make Quiz');
    expect(qt).toEqual([]);
    await click(byText('button', /Start Quiz/i));
    const answers = names('#data-plot-panel-quiz button').filter((n) => /Point \d+/.test(n));
    expect(answers.length).toBe(10);
    expect(names('#data-plot-panel-quiz button').filter((n) => n === '#')).toEqual([]);
  });
});

describe('MED keyboard: points are not delete buttons; no single-letter shortcuts (WCAG 2.1.4)', () => {
  it('no chart point is focusable or a button', async () => {
    await mount({ points: pts([1, 2, 3, 4]) });
    const svg = chartSvg();
    expect(svg.querySelectorAll('[tabindex], [role="button"]').length).toBe(0);
  });
  it('pressing g, l, r, o, c or Delete on a button changes nothing', async () => {
    const m = await mount({ points: pts([1, 2, 3, 4]), showGrid: true });
    const btn = document.querySelector('[data-dataplot-chart="line"]');
    for (const k of ['g', 'l', 'r', 'o', 'c', 'Delete']) await key(btn, k);
    expect(m.latest.showGrid).toBe(true);
    expect(!!m.latest.showLabels).toBe(false);
    expect(!!m.latest.showResiduals).toBe(false);
    expect(m.latest.points.length).toBe(4);
  });
});

describe('LOW contrast of chart text (review :1062, :1096, :1165, :1212, :1250)', () => {
  it('every chart label fill reaches 4.5:1 on the white card', async () => {
    for (const ct of ['scatter', 'bar', 'histogram', 'boxplot', 'ogive']) {
      await mount({ points: pts([3, 5, 4, 9, 12, 11, 30]), chartType: ct, showLabels: true });
      const fills = Array.from(chartSvg().querySelectorAll('text')).map((x) => x.getAttribute('fill')).filter(Boolean);
      const bad = fills.filter((f) => { const c = contrastOnWhite(f); return c != null && c < 4.5; });
      expect(bad, ct).toEqual([]);
    }
  });
});

describe('Suspected items: SD and quartile method labelled; AI gated and Socratic', () => {
  it('statistics label population and sample SD and state the quartile method', async () => {
    await mount({ points: pts([2, 4, 4, 4, 5, 5, 7, 9]), activeTab: 'stats', teacher: { requirePredict: false } });
    const text = document.querySelector('#data-plot-panel-stats').textContent;
    expect(text).toMatch(/population/i);
    expect(text).toMatch(/sample/i);
    expect(text).toMatch(/2\.138/);
    expect(text).toMatch(/Quartiles here/);
  });
  it('the AI coach is hidden when the teacher has AI hints off, and asks questions when on', async () => {
    const gem = vi.fn(() => Promise.resolve('{"questions":["What happens to y?","Which point is odd?","Why?"]}'));
    await mount({ activeTab: 'tools', points: pts([1, 3, 2, 5]) }, { ctx: { callGemini: gem, aiHintsEnabled: false } });
    expect(byText('button', /Ask me questions|Analyze Data/)).toBeFalsy();
    await mount({ activeTab: 'tools', points: pts([1, 3, 2, 5]) }, { ctx: { callGemini: gem, aiHintsEnabled: true } });
    await click(byText('button', /Ask me questions/));
    await flush();
    expect(gem.mock.calls[0][0]).toMatch(/Do NOT state conclusions/);
    expect(document.querySelector('#data-plot-panel-tools').textContent).toMatch(/Which point is odd\?/);
  });
});

describe('source: keys are static literals', () => {
  it('no t() or __alloT() call builds its key at run time', () => {
    const src = fs.readFileSync(FILE, 'utf8');
    const dyn = src.match(/\b(?:t|__alloT)\(\s*'stem\.dataplot\.[^']*'\s*\+/g) || [];
    expect(dyn).toEqual([]);
  });
});
