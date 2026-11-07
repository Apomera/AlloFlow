// Data Plot engagement follow-up (2026-11-04): the last rewards that paid for looking now need the
// student's own work, and the 6-8 Tools-tab prediction waits for the student's line like the chart.
// Run against the start copy with
// DATAPLOT_DEEP_SRC=C:/tmp/stem_engage_2026-11-04/dataplot/followup_start_stem_tool_dataplot.js
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setup, teardown, mount, click, flush, typeInto } from './dataplot_deep_helpers.js';

beforeEach(() => setup());
afterEach(async () => { await teardown(); vi.restoreAllMocks(); });

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const ids = (m) => m.award.mock.calls.map((c) => c[0]);
async function addTyped(x, y) {
  await typeInto($('#dp-x-input'), String(x));
  await typeInto($('#dp-y-input'), String(y));
  await click($$('button').find((b) => /\+ Add row/.test(b.textContent)));
}
async function clickEveryChart() {
  const types = $$('[data-dataplot-chart]').map((b) => b.getAttribute('data-dataplot-chart'));
  for (const id of types) await click($('[data-dataplot-chart="' + id + '"]'));
  return types;
}
const preset = Array.from({ length: 10 }, (_, i) => ({ x: i + 1, y: 3 * i + 2 }));

describe('Chart Master needs charts made from the student\'s own points', () => {
  it('switching through every chart type with a preset loaded pays nothing', async () => {
    const m = await mount({ points: preset });
    const types = await clickEveryChart();
    expect(types.length).toBeGreaterThanOrEqual(7);
    expect(ids(m)).not.toContain('dataPlot_badge_all_charts');
    expect((m.latest.earnedBadges || {}).all_charts).toBeUndefined();
  });
  it('a preset with three typed points mixed in is still not the student\'s own chart', async () => {
    const m = await mount({ points: preset });
    for (const x of [20, 21, 22]) await addTyped(x, x);
    await clickEveryChart();
    expect(ids(m)).not.toContain('dataPlot_badge_all_charts');
  });
  it('three typed points shown in each of 7 chart types earn it once', async () => {
    const m = await mount({});
    for (const x of [1, 2, 3]) await addTyped(x, 2 * x);
    await clickEveryChart();
    expect(ids(m).filter((id) => id === 'dataPlot_badge_all_charts').length).toBe(1);
    expect(Object.keys(m.latest.chartsOwn).length).toBeGreaterThanOrEqual(7);
  });
  it('legacy: an earned Chart Master stays earned and is not paid again; old looking-only views do not earn it', async () => {
    const seven = { scatter: true, line: true, bar: true, pie: true, histogram: true, boxplot: true, dotplot: true };
    let m = await mount({ earnedBadges: { all_charts: 5 }, chartsViewed: seven, points: preset });
    await clickEveryChart();
    expect(ids(m)).not.toContain('dataPlot_badge_all_charts');
    expect(m.latest.earnedBadges.all_charts).toBe(5);
    m = await mount({ chartsViewed: seven, points: preset });
    await click($('[data-dataplot-chart="scatter"]'));
    expect(ids(m)).not.toContain('dataPlot_badge_all_charts');
  });
  it('the badge says what it needs', async () => {
    await mount({ showBadges: true });
    expect(document.body.textContent).toContain('Show all 7 chart types with at least 3 points you placed yourself');
    expect(document.body.textContent).not.toContain('View all 7 chart types');
  });
});

describe('Rank Expert keeps its badge but pays no XP (there is nothing about rho to answer)', () => {
  it('opening rho records the badge with no XP', async () => {
    const m = await mount({ points: [1, 2, 3, 4, 5, 6].map((x) => ({ x, y: x * x })) });
    await click($('[data-dataplot-spearman-toggle]'));
    expect(m.latest.earnedBadges.spearman).toBeTruthy();
    expect(ids(m)).not.toContain('dataPlot_badge_spearman');
    expect(m.award.mock.calls.filter((c) => /spearman/i.test(String(c[0])))).toEqual([]);
  });
  it('legacy: an earned Rank Expert stays earned', async () => {
    const m = await mount({ earnedBadges: { spearman: 7 }, points: [1, 2, 3, 4, 5, 6].map((x) => ({ x, y: x * x })) });
    await click($('[data-dataplot-spearman-toggle]'));
    expect(m.latest.earnedBadges.spearman).toBe(7);
    expect(m.award.mock.calls).toEqual([]);
  });
});

describe('the point quests count only the student\'s own points', () => {
  const hooks = () => window.StemLab._registry.dataPlot.questHooks;
  const five = [1, 2, 3, 4, 5].map((x) => ({ x, y: x }));
  it('five or ten preset points complete neither quest', () => {
    const [q5, q10] = hooks();
    expect(q5.check({ points: five })).toBe(false);
    expect(q10.check({ points: preset })).toBe(false);
    expect(q5.progress({ points: five })).toBe('0/5 points you placed');
  });
  it('points the student placed (ownPts) complete them, and a preset beside them adds nothing', () => {
    const [q5, q10] = hooks();
    const own = { '1,1': 1, '2,2': 1, '3,3': 1, '4,4': 1, '5,5': 1 };
    expect(q5.check({ points: five, ownPts: own })).toBe(true);
    expect(q5.progress({ points: five, ownPts: own })).toBe('5/5 points you placed');
    expect(q10.check({ points: five.concat(preset), ownPts: own })).toBe(false);
    expect(q10.progress({ points: five.concat(preset), ownPts: own })).toBe('5/10 points you placed');
    expect(q5.check({})).toBe(false);
    expect(q5.check({ points: five, ownPts: { '1,1': 'x' } })).toBe(false);
  });
  it('typing points in the tool completes plot_5_points', async () => {
    const m = await mount({});
    for (const x of [1, 2, 3, 4, 5]) await addTyped(x, 2 * x);
    expect(hooks()[0].check(m.latest)).toBe(true);
  });
});

describe('grades 6-8: the Tools-tab prediction waits for the student\'s line', () => {
  const P = [{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 5 }, { x: 4, y: 8 }, { x: 5, y: 10 }];
  const g68 = { ctx: { gradeBand: 'g68' } };
  it('before a line is drawn, no model value or equation is shown', async () => {
    await mount({ points: P, activeTab: 'tools', predX: '3' }, g68);
    const card = $('[data-dataplot-predict-tool]');
    expect(card).not.toBeNull();
    // Least squares (by hand): y = 2x − 0.2, so x = 3 gives 5.80.
    expect(card.textContent).not.toContain('5.80');
    expect(card.textContent).not.toMatch(/y = 2\.00x/);
    expect($('#dp-pred-x')).toBeNull();
    expect($('[data-dataplot-pred-locked]').textContent).toBe('Draw your own line on the chart first, or press Show best fit there. Then you can predict with the fitted model.');
  });
  it('after Show best fit, the prediction uses the fitted model', async () => {
    await mount({ points: P, activeTab: 'tools', predX: '3', myLine: { shown: true } }, g68);
    expect($('[data-dataplot-pred-locked]')).toBeNull();
    expect($('[data-dataplot-predict-tool] output').textContent).toBe('5.80');
  });
  it('grades 9-12 predict at once', async () => {
    await mount({ points: P, activeTab: 'tools', predX: '3' }, { ctx: { gradeBand: 'g912' } });
    expect($('[data-dataplot-pred-locked]')).toBeNull();
    expect($('[data-dataplot-predict-tool] output').textContent).toBe('5.80');
  });
});
