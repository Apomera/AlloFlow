// Data Plot engagement build (2026-11-04): stable axes + keyboard add-point cursor, badges for the
// student's own work only, "draw your line first" in grades 6-8, a calmer first screen, and a dot
// plot of the named variable above the step-1 prediction. Expected numbers are worked out here,
// independently of the tool. Run against the start copy with
// DATAPLOT_DEEP_SRC=C:/tmp/stem_engage_2026-11-04/dataplot/build_start_stem_tool_dataplot.js
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setup, teardown, mount, click, flush, key, typeInto, setValue, pts, React } from './dataplot_deep_helpers.js';

beforeEach(() => setup());
afterEach(async () => { await teardown(); vi.restoreAllMocks(); });

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const ids = (m) => m.award.mock.calls.map((c) => c[0]);
// The chart's viewBox is 440 x 320 with the plot box from (56, 18) to (424, 274).
const chartSvg = () => $('svg[data-dataplot-svg]');
const RECT = { left: 0, top: 0, width: 440, height: 320, right: 440, bottom: 320, x: 0, y: 0 };
async function clickChart(sx, sy) {
  const svg = chartSvg();
  svg.getBoundingClientRect = () => RECT;
  await React.act(async () => { svg.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: sx, clientY: sy })); });
  await flush();
}
const dots = () => $$('svg[data-dataplot-svg] [data-dataplot-point] circle:nth-child(2)').map((c) => ({ cx: +c.getAttribute('cx'), cy: +c.getAttribute('cy') }));
const ticks = () => $$('svg[data-dataplot-svg] text').map((t) => t.textContent).join('|');
async function addTyped(x, y) {
  await typeInto($('#dp-x-input'), String(x));
  await typeInto($('#dp-y-input'), String(y));
  await click($$('button').find((b) => /\+ Add row/.test(b.textContent)));
}
// Least squares by hand.
function lsq(ps) {
  const n = ps.length, mx = ps.reduce((s, p) => s + p.x, 0) / n, my = ps.reduce((s, p) => s + p.y, 0) / n;
  let sxy = 0, sxx = 0, syy = 0; ps.forEach((p) => { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; syy += (p.y - my) ** 2; });
  const m = sxy / sxx, b = my - m * mx, ssr = ps.reduce((s, p) => s + (p.y - (m * p.x + b)) ** 2, 0);
  return { m, b, ssr, r2: 1 - ssr / syy };
}

describe('1. stable axes: clicks land where clicked', () => {
  it('three clicks on an empty scatter plot each stay exactly where they were clicked', async () => {
    await mount({});
    const spots = [[240, 146], [130, 230], [380, 60]];
    for (const [sx, sy] of spots) await clickChart(sx, sy);
    const d = dots();
    expect(d.length).toBe(3);
    // A click is rounded to 0.1 of a unit (3.7 viewBox units on a 0-10 axis): within 2 units.
    d.forEach((p, i) => { expect(Math.abs(p.cx - spots[i][0])).toBeLessThan(2); expect(Math.abs(p.cy - spots[i][1])).toBeLessThan(2); });
  });
  it('"Fit axes to my data" zooms to the points, and Undo axis fit puts the view back', async () => {
    const m = await mount({});
    await clickChart(56 + 0.2 * 368, 274 - 0.2 * 256);
    await clickChart(56 + 0.3 * 368, 274 - 0.3 * 256);
    await clickChart(56 + 0.4 * 368, 274 - 0.5 * 256);
    expect(m.latest.view).toEqual({ x0: 0, x1: 10, y0: 0, y1: 10 });
    const before = ticks();
    await click($('[data-dataplot-fit-axes]'));
    expect(m.latest.view).not.toEqual({ x0: 0, x1: 10, y0: 0, y1: 10 });
    expect(m.latest.view.x0).toBeGreaterThan(0);
    expect(m.latest.view.x1).toBeLessThan(10);
    expect(ticks()).not.toBe(before);
    expect(m.say.mock.calls.map((c) => c[0]).join(' ')).toMatch(/Axes fitted to your data/);
    await click($('[data-dataplot-undo-fit]'));
    expect(m.latest.view).toEqual({ x0: 0, x1: 10, y0: 0, y1: 10 });
    expect(ticks()).toBe(before);
  });
  it('loading an example data set fits the axes to it again', async () => {
    const m = await mount({});
    await clickChart(240, 146);
    expect(m.latest.view).toBeTruthy();
    await click($('button[aria-label="Load the Height and weight dataset"]'));
    expect(m.latest.view == null).toBe(true);
    expect(ticks()).toMatch(/150|160/);
  });
});

describe('1b. keyboard add-point cursor', () => {
  it('the chart takes focus; arrows move a cursor (announced) and Enter adds a point there', async () => {
    const m = await mount({});
    const box = $('[data-dataplot-cursor]');
    expect(box).not.toBeNull();
    expect(box.getAttribute('tabindex')).toBe('0');
    expect(box.getAttribute('aria-label')).toMatch(/arrow keys move the cursor/);
    await key(box, 'ArrowRight'); await key(box, 'ArrowRight'); await key(box, 'ArrowUp');
    expect(m.say.mock.calls.map((c) => c[0])).toContain('Cursor at x 7, y 6.');
    expect($('[data-dataplot-cursor-mark]')).not.toBeNull();
    await key(box, 'Enter');
    expect(m.latest.points).toEqual([{ x: 7, y: 6 }]);
    expect(ids(m)).toContain('dataPlot_badge_first_point');
    // Shift moves a whole grid step; the cursor stops at the edge of the plot.
    for (let i = 0; i < 8; i++) await key(box, 'ArrowRight', { shiftKey: true });
    expect(m.say.mock.calls.map((c) => c[0]).slice(-1)[0]).toBe('Cursor at x 10, y 6.');
  });
});

describe('2. badges only for the student\'s own work', () => {
  it('loading a preset pays neither First Plot nor Perfect Fit', async () => {
    const m = await mount({});
    await click($('button[aria-label="Load the Height and weight dataset"]'));
    await flush();
    expect(ids(m)).toEqual([]);
  });
  it('five preset points on a line earn nothing; five typed points on a line earn Perfect Fit', async () => {
    let m = await mount({ points: [1, 2, 3, 4, 5].map((x) => ({ x, y: 2 * x + 1 })) });
    await flush();
    expect(ids(m)).toEqual([]);
    m = await mount({});
    for (const x of [1, 2, 3, 4, 5]) await addTyped(x, 2 * x + 1);
    await flush();
    expect(ids(m)).toContain('dataPlot_badge_first_point');
    expect(ids(m)).toContain('dataPlot_badge_strong_r2');
  });
  it('a preset with five typed points mixed in is not "all placed by you"', async () => {
    const m = await mount({ points: [{ x: 0, y: 1 }, { x: 6, y: 13 }] });
    for (const x of [1, 2, 3, 4, 5]) await addTyped(x, 2 * x + 1);
    await flush();
    expect(ids(m)).toContain('dataPlot_badge_first_point');
    expect(ids(m)).not.toContain('dataPlot_badge_strong_r2');
  });
  it('badges already earned stay earned (nothing is taken away or paid again)', async () => {
    const m = await mount({ earnedBadges: { first_point: 1, strong_r2: 2 }, points: [1, 2, 3, 4, 5].map((x) => ({ x, y: x })) });
    await flush();
    expect(ids(m)).toEqual([]);
    expect(m.latest.earnedBadges).toEqual({ first_point: 1, strong_r2: 2 });
  });
});

describe('3. grades 6-8: draw your line first', () => {
  const P = [{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 5 }, { x: 4, y: 8 }, { x: 5, y: 10 }];
  const g68 = { ctx: { gradeBand: 'g68' } };
  it('the least-squares line, its equation and R² are hidden; two handles and two sliders are offered', async () => {
    await mount({ points: P }, g68);
    expect($('[data-dataplot-fit]')).toBeNull();
    expect($('[data-dataplot-equation]')).toBeNull();
    expect($('[data-dataplot-header-r2]')).toBeNull();
    expect(document.body.textContent).not.toMatch(/R² =|R²=/);
    expect($('#dp-chart-desc').textContent).not.toMatch(/r = /);
    expect($('#dp-chart-desc').textContent).toMatch(/As x increases, y tends to increase\./);
    expect($$('[data-dataplot-my-handle]').length).toBe(2);
    expect($$('[data-dataplot-my-slider]').length).toBe(2);
    expect($('[data-dataplot-show-fit]').textContent).toBe('Show best fit');
  });
  it('after the student places a line and compares, both lines show with the real fit\'s numbers and squares', async () => {
    const m = await mount({ points: P }, g68);
    // Handles sit at x = 1.4 and 4.6 (10% in from each end of the data).
    await typeInto($('[data-dataplot-my-slider="yA"]'), '2');
    await typeInto($('[data-dataplot-my-slider="yB"]'), '10');
    expect(m.latest.myLine).toMatchObject({ moved: true, yA: 2, yB: 10 });
    expect($('[data-dataplot-fit]')).toBeNull();
    expect($('[data-dataplot-show-fit]').textContent).toBe('Compare my line with the best fit');
    await click($('[data-dataplot-show-fit]'));
    // Mine: y = 2.5x − 1.5, SSR 3.5. Least squares (by hand): y = 2x − 0.2, SSR 0.8, R² 0.980.
    const ls = lsq(P);
    expect(ls.m).toBeCloseTo(2, 9); expect(ls.b).toBeCloseTo(-0.2, 9); expect(ls.ssr).toBeCloseTo(0.8, 9);
    const res = $('[data-dataplot-myline-result]').textContent;
    expect(res).toContain('Your line y = 2.50x − 1.50 has a sum of squared residuals of 3.5.');
    expect(res).toContain('The best-fit line y = 2.00x − 0.20 has 0.8.');
    expect(res).toContain('4.38 times');
    expect($('[data-dataplot-fit]')).not.toBeNull();
    expect($('[data-dataplot-my-line]')).not.toBeNull();
    expect($('[data-dataplot-header-r2]').textContent).toBe('R² = ' + ls.r2.toFixed(3));
    expect($$('[data-dataplot-my-square="mine"]').length).toBe(5);
    expect($$('[data-dataplot-my-square="ls"]').length).toBe(5);
    await click($('[data-dataplot-my-squares="mine"]'));
    expect($$('[data-dataplot-my-square="ls"]').length).toBe(0);
    // Looking and comparing pay nothing (the points are a preset).
    expect(m.award.mock.calls).toEqual([]);
  });
  it('Show best fit without a line reveals the model and draws no student line', async () => {
    const m = await mount({ points: P }, g68);
    await click($('[data-dataplot-show-fit]'));
    expect(m.latest.myLine.shown).toBe(true);
    expect($('[data-dataplot-fit]')).not.toBeNull();
    expect($('[data-dataplot-my-line]')).toBeNull();
    expect($('[data-dataplot-equation]').textContent).toBe('y = 2.00x − 0.20');
  });
  it('dragging a handle moves the line and never adds a point', async () => {
    const m = await mount({ points: P }, g68);
    const svg = chartSvg(); svg.getBoundingClientRect = () => RECT;
    const hB = $('[data-dataplot-my-handle="yB"]');
    await React.act(async () => {
      hB.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 300, clientY: 150 }));
      svg.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 300, clientY: 60 }));
    });
    await flush();
    await React.act(async () => {
      chartSvg().dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 300, clientY: 60 }));
      chartSvg().dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 300, clientY: 60 }));
    });
    await flush();
    expect(m.latest.points.length).toBe(5);
    // y axis 0-12: clientY 60 is (274 − 60) / 256 × 12 = 10.03, snapped to 10.
    expect(m.latest.myLine).toMatchObject({ moved: true, yB: 10 });
    expect(m.say.mock.calls.map((c) => c[0]).join(' ')).toMatch(/Your line: y = /);
  });
  it('a new data set hides the model again; grades 9-12 show it at once', async () => {
    const m = await mount({ points: P, myLine: { shown: true } }, g68);
    expect($('[data-dataplot-fit]')).not.toBeNull();
    await click($('button[aria-label="Load the Height and weight dataset"]'));
    expect(m.latest.myLine == null).toBe(true);
    expect($('[data-dataplot-fit]')).toBeNull();
    await mount({ points: P }, { ctx: { gradeBand: 'g912' } });
    expect($('[data-dataplot-fit]')).not.toBeNull();
    expect($('[data-dataplot-myline]')).toBeNull();
  });
});

describe('4. a calmer first screen', () => {
  const tabStops = () => $$('button, select, input, textarea, a[href], [tabindex], summary')
    .filter((el) => !el.disabled && el.tabIndex >= 0 && !el.closest('[hidden]'))
    .filter((el) => { const det = el.closest('details'); return !det || det.open || el.tagName === 'SUMMARY'; });
  it('the first dataset control is within 10 tab stops', async () => {
    await mount({}, { ctx: { gradeBand: 'g68' } });
    const stops = tabStops();
    const first = stops.findIndex((el) => el.matches('[data-dataplot-dataset], button[aria-label^="Load the"]'));
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first + 1).toBeLessThanOrEqual(10);
  });
  it('one path line: a Try button for the next step; every step and the level sit behind a disclosure', async () => {
    const m = await mount({}, { ctx: { gradeBand: 'g68' } });
    const go = $('[data-dataplot-path-go]');
    expect(go.getAttribute('data-dataplot-path-go')).toBe('centre');
    expect(go.textContent).toBe('Try step 1: Predict the centre and spread, then check');
    const more = $('#dp-path-more');
    expect(more.hidden).toBe(true);
    expect(more.querySelector('[data-dataplot-level-btn]')).not.toBeNull();
    const toggle = $('[data-dataplot-path-toggle]');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await click(toggle);
    expect(m.latest.pathOpen).toBe(true);
    expect($('#dp-path-more').hidden).toBe(false);
  });
  it('Try moves focus to the step\'s activity', async () => {
    await mount({}, { ctx: { gradeBand: 'g68' } });
    await click($('[data-dataplot-path-go]'));
    await flush();
    expect(document.activeElement && document.activeElement.id).toBe('data-plot-panel-stats');
  });
  it('the chart comes straight after the toolbar; labels and colours move below it; the explainer is closed', async () => {
    await mount({}, { ctx: { gradeBand: 'g68' } });
    const svg = chartSvg(), xInput = $('input[aria-label="X-axis label"]');
    expect(svg.compareDocumentPosition(xInput) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect($$('[data-dataplot-toolbar]').length).toBe(2);
    const ex = $('details[data-dataplot-explainer]');
    expect(ex).not.toBeNull();
    expect(ex.open).toBe(false);
    expect(ex.querySelector('summary').textContent).toMatch(/^About this tab: /);
  });
});

describe('5. step 1: a dot plot of the named variable, numbers locked until Lock', () => {
  it('the predict card shows the values as dots and holds the statistics back', async () => {
    const ys = [55, 62, 68, 72, 78, 85, 88, 92, 95];
    await mount({ points: pts(ys), yLabel: 'Grade (%)', activeTab: 'stats' }, { ctx: { gradeBand: 'g68' } });
    const plot = $('[data-dataplot-pred-dotplot]');
    expect(plot).not.toBeNull();
    expect(plot.querySelectorAll('circle').length).toBe(ys.length);
    expect(plot.getAttribute('aria-label')).toBe('Dot plot of Grade (%), 9 values. The values in order: 55, 62, 68, 72, 78, 85, 88, 92, 95.');
    expect(plot.getAttribute('aria-label')).not.toMatch(/median|mean|IQR|range/i);
    expect($('#dp-pred-title').textContent).toBe('Predict first, then check: Grade (%)');
    expect($('[data-dataplot-stat]')).toBeNull();
    await click($$('[data-dataplot-predict] button').find((b) => /Roughly symmetric/.test(b.textContent)));
    const inputs = $$('[data-dataplot-predict] input');
    await React.act(async () => { setValue(inputs[0], '78'); inputs[0].dispatchEvent(new Event('input', { bubbles: true })); setValue(inputs[1], '25'); inputs[1].dispatchEvent(new Event('input', { bubbles: true })); });
    await flush();
    await click($('[data-dataplot-pred-commit]'));
    expect($('[data-dataplot-stat]')).not.toBeNull();
  });
});
