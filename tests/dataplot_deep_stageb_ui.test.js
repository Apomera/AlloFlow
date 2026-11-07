import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setup, teardown, mount, click, flush, typeInto, key, pts, byText, M, React, loadTool, FILE } from './dataplot_deep_helpers.js';

// Data Plot stage B (2026-11-03), mounted through React: best fit by eye, residual check,
// two-way tables, sampling, the data project, and the hand-off to Data Lab (CODAP).
beforeEach(() => setup());
afterEach(async () => {
  await teardown(); vi.restoreAllMocks();
  delete window.__alloDataLabInbox; delete window.__alloEnsureStemPluginLoaded; delete window.StemLab.openInDataLab;
});

const tabs = () => Array.from(document.querySelectorAll('[role=tab]')).map((b) => b.id.replace('data-plot-tab-', ''));
const $ = (sel) => document.querySelector(sel);
const choose = (scope, id) => click($(scope + ' [data-choice="' + id + '"]'));
// Mirrors the tool's handle placement (10% in from each end of the x axis) and the 1/20-step snap.
function handlesFor(set) {
  const m = M(), xs = set.pts.map((p) => p.x), ys = set.pts.map((p) => p.y);
  const ax = m.niceAxis(Math.min(...xs), Math.max(...xs)), ay = m.niceAxis(Math.min(...ys), Math.max(...ys));
  return { xA: ax.min + 0.1 * (ax.max - ax.min), xB: ax.max - 0.1 * (ax.max - ax.min), step: ay.step / 20, ay };
}

describe('tabs by grade band', () => {
  it('K-5 gets the data project; 6-8 and 9-12 get best fit, two-way tables and sampling', async () => {
    // Stage C (2026-11-03) reordered the tabs on purpose: each band's Start-here tabs come first.
    await mount({}, { ctx: { gradeBand: 'k2' } });
    expect(tabs()).toEqual(['chart', 'quiz', 'project', 'stats', 'tools']);
    await mount({}, { ctx: { gradeBand: 'g68' } });
    expect(tabs()).toEqual(['chart', 'stats', 'quiz', 'compare', 'samples', 'twoway', 'fit', 'cause', 'project', 'tools', 'inquiry']);
    expect(document.querySelectorAll('[role=tab][tabindex="0"]').length).toBe(1);
    await mount({ activeTab: 'fit' }, { ctx: { gradeBand: 'g68' } });
    expect($('[data-dataplot-fit-mode]')).toBeNull();
    await mount({ activeTab: 'fit' }, { ctx: { gradeBand: 'g912' } });
    expect(document.querySelectorAll('[data-dataplot-fit-mode]').length).toBe(2);
    expect($('#data-plot-panel-fit').getAttribute('role')).toBe('tabpanel');
  });
});

describe('every tab mounts cleanly', () => {
  it('each tab, at each grade band, with and without data, logs no console errors and labels its panel', async () => {
    const err = vi.spyOn(console, 'error'), warn = vi.spyOn(console, 'warn');
    for (const gradeBand of ['k2', 'g68', 'g912', undefined]) {
      for (const tab of ['chart', 'stats', 'fit', 'twoway', 'samples', 'compare', 'quiz', 'cause', 'project', 'tools', 'inquiry']) {
        for (const data of [{}, { points: pts([3, 7, 4, 9, 12, 8, 15]), fitLab: { mode: 'resid' }, project: { step: 3, values: [1, 2, 2] } }]) {
          await mount(Object.assign({ activeTab: tab }, data), { ctx: { gradeBand } });
          const panel = document.querySelector('[role=tabpanel]');
          expect(panel, tab + ' ' + gradeBand).not.toBeNull();
          expect(document.getElementById(panel.getAttribute('aria-labelledby'))).not.toBeNull();
        }
      }
    }
    expect(err).not.toHaveBeenCalled(); expect(warn).not.toHaveBeenCalled();
  }, 60000); // 88 mounts: the 5 s default timed out under parallel load (stage C), on the stage-B file too.
  it('old saved state of any shape still loads', async () => {
    for (const bad of [{ fitLab: 'x', twoWay: [1], sampling: { draws: { 5: 'lots' }, n: 7 }, project: { values: [null, 'a', 3], plan: 4, step: 99 }, skillsDone: 3 }, { fitLab: { yA: NaN, tries: 'two' }, residLab: { seed: Infinity } }]) {
      for (const tab of ['fit', 'twoway', 'samples', 'project']) await mount(Object.assign({ activeTab: tab }, bad), { ctx: { gradeBand: 'g912' } });
    }
    expect(document.querySelector('[role=tabpanel]')).not.toBeNull();
  });
});

describe('best fit by eye', () => {
  it('a line placed on the least-squares line earns XP once and shows the comparison', async () => {
    const set = M().genFitSet(1, '68'), L = M().linFit(set.pts), hp = handlesFor(set);
    const m = await mount({ activeTab: 'fit' }, { ctx: { gradeBand: 'g68' } });
    expect($('[data-dataplot-lsrl]')).toBeNull();
    await typeInto($('[data-dataplot-fit-slider="yA"]'), String(L.m * hp.xA + L.b));
    await typeInto($('[data-dataplot-fit-slider="yB"]'), String(L.m * hp.xB + L.b));
    await click($('[data-dataplot-fit-check]'));
    expect(m.award).toHaveBeenCalledTimes(1);
    expect(m.award.mock.calls[0][0]).toBe('dataPlot'); expect(m.award.mock.calls[0][1]).toBe(10);
    expect($('[data-dataplot-lsrl]')).not.toBeNull();
    const ssrLs = M().ssrOf(set.pts, L.m, L.b);
    expect($('[data-dataplot-fit-result]').textContent).toContain(String(Math.round(ssrLs * 10) / 10));
    expect(m.latest.skillsDone['fit:gen:68:1']).toBe(true);
    await click($('[data-dataplot-fit-check]'));
    expect(m.award).toHaveBeenCalledTimes(1);
  });
  it('a flat line gets a named misconception and a second try before the reveal; the reveal pays nothing', async () => {
    const m = await mount({ activeTab: 'fit' }, { ctx: { gradeBand: 'g68' } });
    await click($('[data-dataplot-fit-check]'));
    expect($('[data-dataplot-lsrl]')).toBeNull();
    const fb = $('[data-dataplot-fit-result]').textContent;
    expect(fb).toMatch(/Misconception|tilt|steeper|flatter|slopes/);
    expect(m.latest.missedLog[0].type).toBe('fit');
    expect(m.say.mock.calls.map((c) => c[0]).join(' ')).toMatch(/check again/);
    await click($('[data-dataplot-fit-check]'));
    // Stage C: no auto-reveal after the second miss; the student asks for it.
    expect($('[data-dataplot-lsrl]')).toBeNull();
    await click($('[data-dataplot-reveal="fit"]'));
    expect($('[data-dataplot-lsrl]')).not.toBeNull();
    expect(m.award).not.toHaveBeenCalled();
    // Copying the revealed line now earns nothing for this set.
    const set = M().genFitSet(1, '68'), L = M().linFit(set.pts), hp = handlesFor(set);
    await typeInto($('[data-dataplot-fit-slider="yA"]'), String(L.m * hp.xA + L.b));
    await typeInto($('[data-dataplot-fit-slider="yB"]'), String(L.m * hp.xB + L.b));
    await click($('[data-dataplot-fit-check]'));
    expect(m.award).not.toHaveBeenCalled();
  });
  it('with reveals turned off by the teacher, the least-squares line stays hidden after two misses', async () => {
    await mount({ activeTab: 'fit', teacher: { allowReveal: false } }, { ctx: { gradeBand: 'g68' } });
    await click($('[data-dataplot-fit-check]'));
    await click($('[data-dataplot-fit-check]'));
    expect($('[data-dataplot-lsrl]')).toBeNull();
    expect($('[data-dataplot-reveal="fit"]')).toBeNull();
    expect($('[data-dataplot-reveal-off="fit"]')).not.toBeNull();
  });
  it('dragging an end with the pointer moves the line; the table and description follow', async () => {
    const set = M().genFitSet(1, '68'), hp = handlesFor(set);
    const m = await mount({ activeTab: 'fit' }, { ctx: { gradeBand: 'g68' } });
    const svg = $('[data-dataplot-fit-svg]'), hA = $('[data-dataplot-fit-handle="yA"]');
    // jsdom has no layout: the tool's mapping then uses scale 1 and centres the 440x320 box in a 0x0 rect.
    const target = hp.ay.min + 0.25 * (hp.ay.max - hp.ay.min);
    const sy = (320 - 46) - (target - hp.ay.min) / (hp.ay.max - hp.ay.min) * (320 - 18 - 46);
    const ev = (type, y) => { const e = new Event(type, { bubbles: true, cancelable: true }); Object.defineProperty(e, 'clientY', { value: y }); Object.defineProperty(e, 'pointerId', { value: 1 }); return e; };
    await React.act(async () => { hA.dispatchEvent(ev('pointerdown', 0)); });
    await React.act(async () => { svg.dispatchEvent(ev('pointermove', sy - 160)); });
    await React.act(async () => { svg.dispatchEvent(ev('pointerup', sy - 160)); });
    await flush();
    expect(Math.abs(m.latest.fitLab.yA - target)).toBeLessThanOrEqual(hp.step / 2 + 1e-9);
    expect($('[data-dataplot-fit-desc]').textContent).toMatch(/points are above it/);
    expect($('[data-dataplot-fit-table]').querySelectorAll('tbody tr').length).toBe(set.pts.length);
  });
});

describe('residual plot check (9-12)', () => {
  it('predict first, then a named misconception, then the answer on the second try', async () => {
    let seed = 1; while (M().genResidSet(seed).kind !== 'curve') seed++;
    const m = await mount({ activeTab: 'fit', fitLab: { mode: 'resid' }, residLab: { seed } }, { ctx: { gradeBand: 'g912' } });
    expect($('[data-dataplot-resid-svg]')).toBeNull();
    await choose('[data-dataplot-resid-predict]', 'yes');
    expect($('[data-dataplot-resid-svg]')).not.toBeNull();
    await choose('[data-dataplot-resid-question]', 'yes');
    expect($('[data-dataplot-resid-question]').textContent).toMatch(/high R² proves/);
    await choose('[data-dataplot-resid-question]', 'curve');
    expect($('[data-dataplot-resid-answer]').getAttribute('data-dataplot-resid-answer')).toBe('curve');
    expect(m.award).toHaveBeenCalledWith('dataPlot', 5, expect.any(String));
  });
});

describe('two-way tables', () => {
  it('build the table from records, then judge the association by percents', async () => {
    const g = M().genTwoWay(1);
    const m = await mount({ activeTab: 'twoway' }, { ctx: { gradeBand: 'g68' } });
    expect($('[data-dataplot-tw-records]').querySelectorAll('tbody tr').length).toBe(g.records.length);
    const cell = (r, c) => $('[data-dataplot-tw-cell="' + r + ',' + c + '"]');
    await typeInto(cell(0, 0), String(g.counts[0][0] + 1));
    for (const [r, c] of [[0, 1], [1, 0], [1, 1]]) await typeInto(cell(r, c), String(g.counts[r][c]));
    await click($('[data-dataplot-tw-check]'));
    expect(cell(0, 0).getAttribute('aria-invalid')).toBe('true');
    expect(m.award).not.toHaveBeenCalled();
    await typeInto(cell(0, 0), String(g.counts[0][0]));
    await click($('[data-dataplot-tw-check]'));
    expect(cell(0, 0)).toBeNull();
    expect(m.award).toHaveBeenCalledWith('dataPlot', 3, expect.any(String));
    await click($('[data-dataplot-tw-view="row"]'));
    const n0 = g.counts[0][0] + g.counts[0][1];
    expect($('[data-dataplot-tw-table]').textContent).toContain(String(Math.round(g.counts[0][0] / n0 * 1000) / 10) + '%');
    await choose('[data-dataplot-tw-assoc]', 'yes_count');
    expect($('[data-dataplot-tw-assoc]').textContent).toMatch(/comparing raw counts/);
    await choose('[data-dataplot-tw-assoc]', g.assoc ? 'yes_pct' : 'no_pct');
    expect($('[data-dataplot-tw-verdict]').getAttribute('data-dataplot-tw-verdict')).toBe(g.assoc ? 'yes' : 'no');
    expect(m.award).toHaveBeenLastCalledWith('dataPlot', 5, expect.any(String));
  });
  it('my own category data builds its own table and states what the percents show', async () => {
    // Stage C: the student's own table is now graded (answer + reason) like the generated ones.
    const m = await mount({ activeTab: 'twoway', twoWay: { mode: 'mine', customText: 'A,yes\nA,yes\nA,yes\nA,no\nB,no\nB,no\nB,no\nB,yes' } }, { ctx: { gradeBand: 'g68' } });
    expect($('[data-dataplot-tw-table]').textContent).toContain('3');
    await choose('[data-dataplot-tw-mine-verdict]', 'yes_pct');
    expect($('[data-dataplot-tw-mine-verdict]').textContent).toMatch(/75% of A, 25% of B.*50 points.*association/);
    expect(m.award).not.toHaveBeenCalled();
  });
});

describe('sampling distributions', () => {
  it('predict first; "a bigger sample changes the average" is named with the real numbers', async () => {
    const m = await mount({ activeTab: 'samples' }, { ctx: { gradeBand: 'g68' } });
    expect($('[data-dataplot-sp-draw="100"]').disabled).toBe(true);
    await choose('[data-dataplot-sp-predict]', 'higher');
    await click($('[data-dataplot-sp-lock]'));
    await click($('[data-dataplot-sp-draw="100"]'));
    await click($('[data-dataplot-sp-size="25"]'));
    await click($('[data-dataplot-sp-draw="100"]'));
    expect(m.latest.sampling.draws).toEqual({ 5: 100, 25: 100 });
    const pop = M().genPopulation('commute');
    const sdS = (a) => { const mu = a.reduce((s, v) => s + v, 0) / a.length; return Math.sqrt(a.reduce((s, v) => s + (v - mu) ** 2, 0) / (a.length - 1)); };
    const s5 = sdS(M().sampleMeans(pop, 5, 100, 1)), s25 = sdS(M().sampleMeans(pop, 25, 100, 1));
    expect(s25).toBeLessThan(s5);
    await click($('[data-dataplot-sp-check]'));
    const res = $('[data-dataplot-sp-result]').textContent;
    expect(res).toMatch(/a bigger sample changes the average/);
    expect(res).toContain(String(Math.round(s5 * 100) / 100)); expect(res).toContain(String(Math.round(s25 * 100) / 100));
    expect(m.award).not.toHaveBeenCalled();
    expect(m.latest.missedLog.slice(-1)[0].type).toBe('sampling');
    expect($('[data-dataplot-sp-table]').querySelectorAll('tbody tr').length).toBe(2);
  });
  it('a right prediction earns XP once', async () => {
    const m = await mount({ activeTab: 'samples', sampling: { pred: 'narrower', draws: { 5: 20, 50: 20 } } }, { ctx: { gradeBand: 'g68' } });
    await click($('[data-dataplot-sp-check]'));
    expect(m.award).toHaveBeenCalledWith('dataPlot', 10, expect.any(String));
    expect($('[data-dataplot-sp-check]')).toBeNull();
  });
});

describe('data project (K-5 and up)', () => {
  it('question check, collect by keyboard, display, then a CER write-up that needs a number', async () => {
    const m = await mount({ activeTab: 'project' }, { ctx: { gradeBand: 'g35' } });
    await choose('[data-dataplot-pj-sq]', 'yes'); // first item, "How tall am I?", is NOT statistical
    await click($('[data-dataplot-pj-sq-check]'));
    expect($('[data-dataplot-pj-sq]').textContent).toMatch(/has one answer/);
    await click($('[data-dataplot-pj-step="1"]'));
    await choose('[data-dataplot-pj-plan]', 'category');
    await click($('[data-dataplot-pj-step="2"]'));
    for (const v of ['apple', 'pear', 'apple', 'kiwi', 'apple', 'pear']) { await typeInto($('#dp-pj-in'), v); await key($('#dp-pj-in'), 'Enter'); }
    expect(m.latest.project.values).toEqual(['apple', 'pear', 'apple', 'kiwi', 'apple', 'pear']);
    await click($('[data-dataplot-pj-step="3"]'));
    expect($('[data-dataplot-pj-summary]').textContent).toMatch(/apple: 3 \(50%\)/);
    await click($('[data-dataplot-pj-step="4"]'));
    await typeInto($('[data-dataplot-cer="claim"]'), 'Apples are our favourite fruit.');
    await typeInto($('[data-dataplot-cer="evidence"]'), 'Apples got the most votes.');
    await typeInto($('[data-dataplot-cer="reasoning"]'), 'This shows apples win because more people chose them.');
    await click($('[data-dataplot-pj-finish]'));
    expect($('[data-dataplot-cer-miss]').textContent).toMatch(/at least one number/);
    expect(m.award).not.toHaveBeenCalled();
    await typeInto($('[data-dataplot-cer="evidence"]'), '3 of 6 people chose apples.');
    await click($('[data-dataplot-pj-finish]'));
    expect(m.award).toHaveBeenCalledWith('dataPlot', 15, expect.any(String));
    await click($('[data-dataplot-pj-finish]'));
    expect(m.award).toHaveBeenCalledTimes(1);
    expect(m.latest.skillsDone.project).toBe(true);
  });
  it('project numbers open in the Chart tab', async () => {
    const m = await mount({ activeTab: 'project', project: { step: 3, values: [4, 6, 6, 9] } }, { ctx: { gradeBand: 'g68' } });
    await click($('[data-dataplot-pj-to-chart]'));
    expect(m.latest.activeTab).toBe('chart');
    expect(m.latest.points).toEqual([{ x: 1, y: 4 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 9 }]);
    expect(m.latest.chartType).toBe('dotplot');
  });
});

describe('send to Data Lab (CODAP)', () => {
  it('uses the real Data Lab hook when it is loaded, with a dataset Data Lab accepts', async () => {
    loadTool('stem_lab/stem_tool_datalab.js', 'dataLab');
    const hook = vi.spyOn(window.StemLab, 'openInDataLab').mockImplementation(() => ({ ok: true, status: 'opening' }));
    const m = await mount({ points: pts([3, 5, 4]), xLabel: 'Day', yLabel: 'Rain (mm)' }, { ctx: { gradeBand: 'g68' } });
    await click($('[data-dataplot-codap]'));
    expect(hook).toHaveBeenCalledTimes(1);
    const ds = hook.mock.calls[0][0];
    expect(ds.rows).toEqual([[1, 3], [2, 5], [3, 4]]);
    expect(ds.attributes.map((a) => a.name)).toEqual(['Day', 'Rain (mm)']);
    hook.mockRestore();
    expect(window.StemLab.dataLab.normalizeDataset(ds).ok).toBe(true);
    expect(m.say.mock.calls.map((c) => c[0]).join(' ')).toMatch(/Sent 3 rows to CODAP/);
  });
  it('without Data Lab loaded, leaves the dataset in its inbox and opens Data Lab', async () => {
    window.__alloEnsureStemPluginLoaded = vi.fn(() => true);
    const m = await mount({ points: pts([3, 5, 4]) }, { ctx: { gradeBand: 'g68' } });
    await click($('[data-dataplot-codap]'));
    expect(window.__alloDataLabInbox).toHaveLength(1);
    expect(window.__alloDataLabInbox[0].rows).toHaveLength(3);
    expect(window.__alloEnsureStemPluginLoaded).toHaveBeenCalledWith('dataLab');
    expect(m.setTool).toHaveBeenCalledWith('dataLab');
  });
  it('the sampling tab sends one row per sample mean', async () => {
    loadTool('stem_lab/stem_tool_datalab.js', 'dataLab');
    const hook = vi.spyOn(window.StemLab, 'openInDataLab').mockImplementation(() => ({ ok: true }));
    await mount({ activeTab: 'samples', sampling: { pred: 'narrower', draws: { 5: 3, 25: 2 } } }, { ctx: { gradeBand: 'g68' } });
    await click($('[data-dataplot-codap]'));
    const ds = hook.mock.calls[0][0], pop = M().genPopulation('commute');
    expect(ds.rows.map((r) => r.slice(0, 2))).toEqual([[5, 1], [5, 2], [5, 3], [25, 1], [25, 2]]);
    expect(ds.rows[3][2]).toBeCloseTo(M().sampleMeans(pop, 25, 1, 1)[0], 3);
    hook.mockRestore();
    expect(window.StemLab.dataLab.normalizeDataset(ds).ok).toBe(true);
  });
  it('a built two-way table sends its records as two categorical columns', async () => {
    loadTool('stem_lab/stem_tool_datalab.js', 'dataLab');
    const hook = vi.spyOn(window.StemLab, 'openInDataLab').mockImplementation(() => ({ ok: true }));
    const g = M().genTwoWay(1);
    await mount({ activeTab: 'twoway', twoWay: { key: 'twoway:1', seed: 1, built: true } }, { ctx: { gradeBand: 'g68' } });
    await click($('[data-dataplot-codap]'));
    const ds = hook.mock.calls[0][0];
    expect(ds.rows).toHaveLength(g.records.length);
    expect(ds.attributes.every((a) => a.type === 'categorical')).toBe(true);
    hook.mockRestore();
    expect(window.StemLab.dataLab.normalizeDataset(ds).ok).toBe(true);
  });
});

describe('teacher summary and the import hook', () => {
  it('missed best-fit and sampling items are named in the teacher panel', async () => {
    await mount({ missedLog: [{ type: 'fit', key: 'k', mis: 'Misconception: X', at: 1 }, { type: 'sampling', key: 'commute', mis: 'Y', at: 2 }] }, { ctx: { isTeacherMode: true } });
    const tb = $('[data-dataplot-teacher] tbody').textContent;
    expect(tb).toMatch(/Best fit/); expect(tb).toMatch(/Sampling/);
  });
  it('the teacher panel counts finished stage-B activities', async () => {
    await mount({ skillsDone: { 'fit:gen:68:1': true, 'fit:gen:68:2': true, 'resid:3': true, 'twoway:1': true, project: true } }, { ctx: { isTeacherMode: true } });
    expect($('[data-dataplot-teacher-done]').textContent).toBe('Finished on this device: 2 best-fit lines, 1 residual check, 1 two-way table, 0 sampling experiments, data project finished.');
  });
  it('quest hooks keep their ids and report translated progress', () => {
    const q = window.StemLab._registry.dataPlot.questHooks;
    expect(q.map((x) => x.id)).toEqual(['plot_5_points', 'plot_10_points', 'view_residuals']);
    // Only the student's own points (ownPts) count (dataplot_engage_followup).
    expect(q[0].progress({ points: [{ x: 1, y: 1 }, { x: 2, y: 2 }], ownPts: { '1,1': 1, '2,2': 1 } })).toBe('2/5 points you placed');
    expect(q[2].progress({ showResiduals: true })).toBe('Viewing!');
    const ten = Array.from({ length: 10 }, (_, i) => ({ x: i, y: i }));
    expect(q[1].check({ points: ten, ownPts: Object.fromEntries(ten.map((p) => [p.x + ',' + p.y, 1])) })).toBe(true);
    expect(q[1].check({ points: ten })).toBe(false);
  });
  it('dataPlotImport keeps its contract', async () => {
    const r = window.StemLab.dataPlotImport({ title: 'T', xLabel: 'a', yLabel: 'b', source: 'Skate Lab', points: [{ x: 1, y: 2 }, { x: 'z', y: 1 }] });
    expect(r).toEqual({ ok: true, count: 1, dropped: 1, queued: true });
    delete window.StemLab._dataPlotInbox;
  });
});
