// Data Plot independent hunt of the engagement build (2026-11-04). Fail-first against the start copy:
// DATAPLOT_DEEP_SRC=C:/tmp/stem_engage_2026-11-04/dataplot/hunt/start_stem_tool_dataplot.js
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setup, teardown, mount, click, flush, key, typeInto, setValue, React, M } from './dataplot_deep_helpers.js';

beforeEach(() => { setup(); try { localStorage.clear(); } catch (e) {} });
afterEach(async () => { await teardown(); vi.restoreAllMocks(); });

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const ids = (m) => m.award.mock.calls.map((c) => c[0]);
const g68 = { ctx: { gradeBand: 'g68' } };
const said = (m) => m.say.mock.calls.map((c) => String(c[0])).join(' | ');
// Least squares by hand: y = 2x - 0.2, R² = 0.9959..., r = 0.998.
const P = [{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 5 }, { x: 4, y: 8 }, { x: 5, y: 10 }];
// Everything a screen reader or a saved page could reach: text plus every attribute.
function everything() {
  const parts = [document.body.textContent];
  $$('*').forEach((el) => { for (const a of el.attributes) parts.push(a.value); });
  return parts.join(' \n ');
}
const LEAK = /R²\s*=?\s*-?\d|\br\s*=\s*-?\d|0\.99[0-9]|2\.00x|2x\s*[−-]\s*0\.2|Fitted .* model:|Using the .* model/;
// The Inquiry tab has its own generated data and its own r slider: only the student's numbers count there.
const LEAK_INQUIRY = /0\.99[0-9]|2\.00x|Fitted .* model:|Using the .* model/;
async function addTyped(x, y) {
  await typeInto($('#dp-x-input'), String(x));
  await typeInto($('#dp-y-input'), String(y));
  await click($$('button').find((b) => /\+ Add row/.test(b.textContent)));
}

describe('grades 6-8: nothing shows the fit before the student\'s line', () => {
  for (const tab of ['chart', 'stats', 'quiz', 'compare', 'samples', 'twoway', 'fit', 'cause', 'project', 'tools', 'inquiry']) {
    it('tab ' + tab + ' with every chart option saved on', async () => {
      await mount({ points: P, activeTab: tab, showCI: true, showResiduals: true, showResidualPlot: true, showLabels: true, showSpearman: true, tableMode: true, predX: '3', statsPred: { committed: true }, fitLab: { mode: 'resid' } }, g68);
      expect((tab === 'inquiry' ? LEAK_INQUIRY : LEAK).exec(everything())).toBeNull();
    });
  }
  it('a saved 95% CI toggle does not draw the band around the hidden line', async () => {
    await mount({ points: P, showCI: true }, g68);
    expect($('svg[data-dataplot-svg] path[fill-opacity="0.12"]')).toBeNull();
    await mount({ points: P, showCI: true, myLine: { shown: true } }, { ctx: { gradeBand: 'g912' } });
    expect($('svg[data-dataplot-svg] path[fill-opacity="0.12"]')).not.toBeNull();
  });
  it('a snapshot label carries no R² until the fit is on show', async () => {
    const snaps = [];
    const setToolSnapshots = (f) => { const v = f(snaps.slice()); snaps.length = 0; snaps.push(...v); };
    await mount({ points: P }, { ctx: { gradeBand: 'g68', setToolSnapshots } });
    await click($('button[aria-label="Take a snapshot of this data"]'));
    expect(snaps[0].label).not.toMatch(/R²/);
    expect(snaps[0].label).toContain('5');
  });
  it('a chart saved while the fit is hidden does not show or store R²', async () => {
    await mount({ points: P, showGallery: true }, g68);
    await click($$('button').find((b) => /Save/.test(b.textContent)));
    await flush();
    const stored = JSON.parse(localStorage.getItem('alloflow_dataplot_charts'));
    expect(stored[0].r2 == null).toBe(true);
    expect($$('[data-dataplot-table]').length).toBeGreaterThan(0);
    expect(/R²\s*=/.test(document.body.textContent)).toBe(false);
  });
  it('the AI coach is not told r while the fit is hidden', async () => {
    const callGemini = vi.fn().mockResolvedValue('{"questions":["a","b","c"]}');
    await mount({ points: P, activeTab: 'tools' }, { ctx: { gradeBand: 'g68', callGemini } });
    await click($$('button').find((b) => /Ask me questions/.test(b.textContent)));
    await flush();
    expect(callGemini).toHaveBeenCalled();
    expect(callGemini.mock.calls[0][0]).not.toMatch(/Pearson/);
  });
  it('the Tools tab question does not point at a model the student cannot see', async () => {
    await mount({ points: P, activeTab: 'tools' }, g68);
    expect($('[data-dataplot-questions]').textContent).not.toMatch(/fitted model/);
    await mount({ points: P, activeTab: 'tools', myLine: { shown: true } }, g68);
    expect($('[data-dataplot-questions]').textContent).toMatch(/fitted model/);
  });
  it('a saved model that cannot fit these data does not open the gate', async () => {
    // Exponential needs y > 0: the linear fit is still real, and must stay hidden.
    const neg = [{ x: 1, y: -2 }, { x: 2, y: 4 }, { x: 3, y: 5 }, { x: 4, y: 8 }, { x: 5, y: 10 }];
    await mount({ points: neg, regressionType: 'exponential' }, g68);
    expect($('[data-dataplot-myline]')).not.toBeNull();
    expect($('[data-regression-model]')).toBeNull();
    expect($('[data-dataplot-description]').textContent).not.toMatch(/r = /);
  });
  it('Show best fit with a model that cannot fit says why, not an empty equation', async () => {
    const neg = [{ x: 1, y: -2 }, { x: 2, y: 4 }, { x: 3, y: 5 }, { x: 4, y: 8 }, { x: 5, y: 10 }];
    const m = await mount({ points: neg, regressionType: 'exponential' }, g68);
    await click($('[data-dataplot-show-fit]'));
    expect(said(m)).not.toMatch(/now shown: \./);
  });
  it('emptying the chart point by point arms the gate again for the next data', async () => {
    const m = await mount({ points: [{ x: 1, y: 1 }], myLine: { shown: true, moved: true, xA: 1, xB: 2, yA: 1, yB: 2 }, tableMode: true }, g68);
    await click($('button[aria-label^="Delete row 1"]'));
    expect(m.latest.points.length).toBe(0);
    await addTyped(1, 2); await addTyped(2, 4); await addTyped(3, 5);
    expect($('[data-dataplot-myline]')).not.toBeNull();
    expect($('[data-dataplot-equation]')).toBeNull();
  });
  it('comparing with a saved non-linear model draws the same best-fit line the text names', async () => {
    const m = await mount({ points: P, regressionType: 'quadratic', myLine: { moved: true, xA: 1.4, xB: 4.6, yA: 3, yB: 9 } }, g68);
    await click($('[data-dataplot-show-fit="compare"]'));
    expect(m.latest.regressionType).toBe('linear');
    expect($('svg[data-dataplot-svg] [data-dataplot-fit="linear"]')).not.toBeNull();
  });
  it('teacher no-reveal: the plain Show best fit button waits for a line', async () => {
    await mount({ points: P, teacher: { allowReveal: false } }, g68);
    expect($('[data-dataplot-myline]')).not.toBeNull();
    expect($('[data-dataplot-show-fit]')).toBeNull();
    await mount({ points: P, teacher: { allowReveal: false }, myLine: { moved: true, xA: 1.4, xB: 4.6, yA: 3, yB: 9 } }, g68);
    expect($('[data-dataplot-show-fit="compare"]')).not.toBeNull();
    await mount({ points: P, teacher: { allowReveal: false }, chartType: 'pie' }, g68);
    expect($('[data-dataplot-myline]').textContent).not.toMatch(/show the best-fit line now/);
    await mount({ points: P, teacher: { allowReveal: false }, activeTab: 'tools' }, g68);
    expect($('[data-dataplot-pred-locked]').textContent).not.toMatch(/Show best fit/);
  });
});

describe('own points', () => {
  it('holding Enter on the chart adds one point, not dozens', async () => {
    const m = await mount({}, g68);
    const box = $('[data-dataplot-cursor]');
    await key(box, 'Enter');
    for (let i = 0; i < 20; i++) await key($('[data-dataplot-cursor]'), 'Enter', { repeat: true });
    expect(m.latest.points.length).toBe(1);
  });
  it('the same spot over and over is one placed point for the badges and quests', async () => {
    const m = await mount({}, g68);
    for (let i = 0; i < 12; i++) await key($('[data-dataplot-cursor]'), 'Enter');
    expect(m.latest.points.length).toBe(12);
    expect(ids(m)).toContain('dataPlot_badge_first_point');
    expect(ids(m)).not.toContain('dataPlot_badge_ten_points');
    const [q5, q10] = window.StemLab._registry.dataPlot.questHooks;
    expect(q5.check(m.latest)).toBe(false);
    expect(q10.check(m.latest)).toBe(false);
  });
  it('ten different points still earn Data Collector', async () => {
    const m = await mount({ tableMode: true });
    for (let i = 1; i <= 10; i++) await addTyped(i, 2 * i + (i % 3));
    expect(ids(m)).toContain('dataPlot_badge_ten_points');
  });
  it('correcting your own point in the table keeps it yours; a preset point stays a preset point', async () => {
    const mine = [1, 2, 3, 4, 5].map((x) => ({ x, y: 2 * x }));
    const own = {}; mine.forEach((p) => { own[p.x + ',' + p.y] = 1; });
    const m = await mount({ points: mine, ownPts: own, tableMode: true, myLine: { shown: true } }, { ctx: { gradeBand: 'g912' } });
    const cell = $('input[aria-label="y, row 2"]');
    await React.act(async () => { setValue(cell, '4.5'); cell.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); });
    await flush();
    expect(m.latest.points[1].y).toBe(4.5);
    expect(M().ownMatchCount(m.latest.points, m.latest.ownPts)).toBe(5);
  });
  it('editing a preset point does not make it the student\'s', async () => {
    const m = await mount({ points: P, tableMode: true }, { ctx: { gradeBand: 'g912' } });
    const cell = $('input[aria-label="y, row 2"]');
    await React.act(async () => { setValue(cell, '4.5'); cell.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); });
    await flush();
    expect(M().ownMatchCount(m.latest.points, m.latest.ownPts)).toBe(0);
  });
  it('progress-only reload: earned badges stay, nothing pays again, the tool works', async () => {
    const seven = { scatter: true, line: true, bar: true, pie: true, histogram: true, boxplot: true, dotplot: true };
    const m = await mount({ earnedBadges: { first_point: 5, ten_points: 5, all_charts: 5, strong_r2: 5 }, chartsOwn: seven, chartsViewed: seven, dpScore: 3 }, g68);
    expect(m.award).not.toHaveBeenCalled();
    expect(window.StemLab._registry.dataPlot.questHooks[0].check(m.latest)).toBe(false);
    await key($('[data-dataplot-cursor]'), 'Enter');
    expect(m.award).not.toHaveBeenCalled();
    expect(m.latest.earnedBadges.first_point).toBe(5);
    expect(m.latest.points.length).toBe(1);
  });
});

describe('frozen axes', () => {
  it('a value that rounds onto the edge of a frozen axis does not rescale it', () => {
    const { viewAxis } = M();
    // 3 * 0.1 is 0.30000000000000004: a click at the left edge rounds to 0.3.
    const lo = 3 * 0.1, hi = 1.1;
    const ax = viewAxis(lo, hi, [0.3, 0.7]);
    expect(ax.min).toBe(lo); expect(ax.max).toBe(hi);
  });
  it('a real outsider still widens the axis, so no point is lost', () => {
    const ax = M().viewAxis(0, 10, [12]);
    expect(ax.max).toBeGreaterThanOrEqual(12);
    const ax2 = M().viewAxis(0, 10, [-3]);
    expect(ax2.min).toBeLessThanOrEqual(-3);
  });
  it('Fit axes keeps both ends of the student\'s line on the chart', async () => {
    const pts = [{ x: 40, y: 50 }, { x: 41, y: 51 }, { x: 42, y: 53 }];
    await mount({ points: pts, view: { x0: 0, x1: 1000, y0: 0, y1: 1000 }, myLine: { moved: true, xA: 40.2, xB: 41.8, yA: 5, yB: 95 } }, g68);
    await click($('[data-dataplot-fit-axes]'));
    const svg = $('svg[data-dataplot-svg]');
    $$('[data-dataplot-my-handle]').forEach((c) => {
      const cy = +c.getAttribute('cy');
      expect(cy).toBeGreaterThanOrEqual(18); expect(cy).toBeLessThanOrEqual(274);
    });
    $$('[data-dataplot-my-slider]').forEach((s) => {
      const label = s.closest('label').textContent;
      expect(+s.value).toBeGreaterThanOrEqual(+s.min); expect(+s.value).toBeLessThanOrEqual(+s.max);
      expect(label).toBeTruthy();
    });
    expect(svg).not.toBeNull();
  });
});

describe('controls that take themselves away hand focus on', () => {
  const pts = [{ x: 4, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 8 }];
  it('Fit axes moves focus to Undo axis fit, and back', async () => {
    await mount({ points: pts, view: { x0: 0, x1: 100, y0: 0, y1: 100 } }, g68);
    let b = $('[data-dataplot-fit-axes]');
    b.focus();
    await click(b);
    expect($('[data-dataplot-fit-axes]')).toBeNull();
    expect(document.activeElement).toBe($('[data-dataplot-undo-fit]'));
    b = $('[data-dataplot-undo-fit]');
    await click(b);
    expect($('[data-dataplot-undo-fit]')).toBeNull();
    expect(document.activeElement).toBe($('[data-dataplot-fit-axes]'));
  });
});

describe('the keyboard cursor', () => {
  it('moves by an even half step on an axis whose half step is not whole', async () => {
    const m = await mount({ view: { x0: 0, x1: 25, y0: 0, y1: 25 } }, g68);
    const box = $('[data-dataplot-cursor]');
    await key(box, 'Home');
    const seen = [];
    for (let i = 0; i < 3; i++) { await key($('[data-dataplot-cursor]'), 'ArrowRight'); seen.push(said(m).split(' | ').pop()); }
    const xs = seen.map((s) => parseFloat(/x ([-\d.]+)/.exec(s)[1]));
    expect(xs[1] - xs[0]).toBeCloseTo(2.5, 6);
    expect(xs[2] - xs[1]).toBeCloseTo(2.5, 6);
  });
  it('tiny data: the cursor and the line still sit on the axes', async () => {
    const tiny = [1, 2, 3, 4, 5].map((i) => ({ x: i * 1e-7, y: i * 2e-7 }));
    await mount({ points: tiny, view: null }, g68);
    $$('[data-dataplot-my-handle]').forEach((c) => {
      const cy = +c.getAttribute('cy');
      expect(cy).toBeGreaterThanOrEqual(18); expect(cy).toBeLessThanOrEqual(274);
    });
  });
});

describe('after the comparison', () => {
  const moved = { moved: true, xA: 1.4, xB: 4.6, yA: 3, yB: 9 };
  it('focus lands on the result, not on the page', async () => {
    await mount({ points: P, myLine: moved }, g68);
    const btn = $('[data-dataplot-show-fit="compare"]');
    btn.focus();
    await click(btn);
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement.closest('[data-dataplot-myline-result]')).not.toBeNull();
  });
  it('focus lands on the model after a plain Show best fit', async () => {
    await mount({ points: P }, g68);
    const btn = $('[data-dataplot-show-fit="show"]');
    btn.focus();
    await click(btn);
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement.closest('[data-dataplot-regression]')).not.toBeNull();
  });
  it('the keyboard can still move the line, as a pointer can', async () => {
    const m = await mount({ points: P, myLine: Object.assign({ shown: true }, moved) }, g68);
    expect($$('[data-dataplot-my-handle]').length).toBe(2);
    const s = $('[data-dataplot-my-slider="yA"]');
    expect(s).not.toBeNull();
    await React.act(async () => { setValue(s, '4'); s.dispatchEvent(new Event('input', { bubbles: true })); });
    await flush();
    expect(m.latest.myLine.yA).toBe(4);
    expect(m.latest.myLine.shown).toBe(true);
  });
});

describe('truth and hostile state in the new code', () => {
  const moved = { moved: true, xA: 1.4, xB: 4.6, yA: 3, yB: 5 };
  const exact = [1, 2, 3, 4, 5].map((x) => ({ x, y: 2 * x }));
  it('points exactly on a line: no "— times as large"', async () => {
    const m = await mount({ points: exact, myLine: moved }, g68);
    await click($('[data-dataplot-show-fit="compare"]'));
    const box = $('[data-dataplot-myline-result]').textContent;
    expect(box).not.toMatch(/times as large/);
    expect(box).toMatch(/goes through every point/);
    expect(said(m)).toMatch(/goes through every point/);
  });
  it('two points always fit exactly: the same honest sentence', async () => {
    await mount({ points: [{ x: 1, y: 2 }, { x: 3, y: 8 }], myLine: { shown: true, moved: true, xA: 1.2, xB: 2.8, yA: 2, yB: 2 } }, g68);
    expect($('[data-dataplot-myline-result]').textContent).toMatch(/goes through every point/);
  });
  it('real scatter: the sum, the best fit and the ratio match a hand calculation', async () => {
    await mount({ points: P, myLine: { shown: true, moved: true, xA: 1, xB: 5, yA: 2, yB: 10 } }, g68);
    // Line y = 2x. Residuals 0, 0, -1, 0, 0: sum 1. Best fit y = 2x - 0.2: sum 0.8 (hand: 0.04 + 0.04 + 0.64 + 0.04 + 0.04). Ratio 1.25.
    const box = $('[data-dataplot-myline-result]').textContent;
    expect(box).toMatch(/squared residuals of 1\./);
    expect(box).toMatch(/has 0\.8\./);
    expect(box).toMatch(/1\.25 times/);
  });
  it('both sets of squares differ by more than colour', async () => {
    await mount({ points: P, myLine: { shown: true, moved: true, xA: 1.4, xB: 4.6, yA: 3, yB: 5 } }, g68);
    const ls = $$('[data-dataplot-my-square="ls"]'), mine = $$('[data-dataplot-my-square="mine"]');
    expect(ls.length).toBeGreaterThan(0); expect(mine.length).toBeGreaterThan(0);
    expect(ls[0].getAttribute('stroke-dasharray')).toBeTruthy();
    expect(mine[0].getAttribute('stroke-dasharray')).toBeNull();
  });
  it('hostile saves reach the new code without a crash or a console error', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const states = [
      { points: P, view: { x0: 'a', x1: 1, y0: 0, y1: 1 }, viewPrev: 5, myLine: 'x', ownPts: [1, 2], chartsOwn: 'y', dsPick: 7 },
      { points: P, view: { x0: -1e308, x1: 1e308, y0: -1e308, y1: 1e308 } },
      { points: P, view: { x0: 0, x1: 1e-300, y0: 0, y1: 1e-300 } },
      { points: P, myLine: { moved: true, xA: Infinity, xB: 'q', yA: null, yB: {}, squares: 'zz', shown: 'yes' } },
      { points: P, myLine: { moved: true, xA: 2, xB: 2, yA: 1, yB: 2 } },
      { points: P, ownPts: { '1,2': -4, '2,4': 'x', '3,5': Infinity, '4,8': 1e9 } },
      { points: [{ x: 1e21, y: 1e-21 }, { x: 2e21, y: 2e-21 }, { x: 0, y: 0 }], view: null },
    ];
    for (const st of states) {
      const m = await mount(st, g68);
      const box = $('[data-dataplot-cursor]');
      if (box) { await key(box, 'ArrowRight'); await key($('[data-dataplot-cursor]'), 'Enter'); }
      m.latest.points.forEach((p) => { expect(Number.isFinite(p.x)).toBe(true); expect(Number.isFinite(p.y)).toBe(true); });
    }
    expect(err.mock.calls.filter((c) => /NaN|Infinity|Error/.test(String(c[0])))).toEqual([]);
  });
});
