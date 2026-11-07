import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setup, teardown, mount, click, flush, key, pts, byText, setValue, M, React, ReactDOMClient, loadTool, makeCtx } from './dataplot_deep_helpers.js';

// Data Plot deep enhancement (2026-11-03): generated practice, predict-then-check, mean vs
// median, two-group comparison, correlation vs causation, grade bands, teacher hooks,
// graph access and the lab import hook. Every expected number is computed here independently.
beforeEach(() => setup());
afterEach(async () => { await teardown(); vi.restoreAllMocks(); delete window.StemLab._dataPlotInbox; });

function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const tt = (k, fb) => fb;
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const med = (a) => { const s = a.slice().sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
function quart(a) { const s = a.slice().sort((x, y) => x - y), n = s.length; return { q1: med(s.slice(0, Math.floor(n / 2))), q3: med(s.slice(Math.ceil(n / 2))) }; }

describe('pure helpers', () => {
  it('modes, quartiles, SD and MAD', () => {
    const m = M();
    expect(m.modesOf([1, 1, 2, 2, 3])).toMatchObject({ kind: 'many', modes: [1, 2], count: 2 });
    expect(m.modesOf([4, 4, 1])).toMatchObject({ kind: 'one', modes: [4] });
    expect(m.modesOf([1, 2, 3]).kind).toBe('none');
    expect(m.modesOf([1, 1, 2, 2]).kind).toBe('all');
    expect(m.quartilesOf([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])).toMatchObject({ q1: 3, q3: 9 });
    expect(m.sdOf([2, 4, 4, 4, 5, 5, 7, 9], false)).toBeCloseTo(2, 12);
    expect(m.sdOf([2, 4, 4, 4, 5, 5, 7, 9], true)).toBeCloseTo(Math.sqrt(32 / 7), 12);
    expect(m.madOf([2, 4, 6])).toBeCloseTo(4 / 3, 12);
  });
  it('fitStatus names why a model cannot fit', () => {
    const m = M();
    expect(m.fitStatus('linear', [{ x: 1, y: 1 }, { x: 1, y: 2 }])).toMatchObject({ ok: false, why: 'sameX' });
    expect(m.fitStatus('exponential', [{ x: 1, y: 1 }, { x: 2, y: -1 }])).toMatchObject({ ok: false, why: 'yNotPositive', count: 1 });
    expect(m.fitStatus('logarithmic', [{ x: 0, y: 1 }, { x: 2, y: 3 }])).toMatchObject({ ok: false, why: 'xNotPositive' });
    expect(m.fitStatus('quadratic', [{ x: 1, y: 1 }, { x: 2, y: 2 }])).toMatchObject({ ok: false, why: 'need3' });
    expect(m.fitStatus('quadratic', [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 1 }]).ok).toBe(true);
  });
  it('equations use a true minus sign', () => {
    const m = M();
    expect(m.equationText('linear', { m: 2, b: -4 })).toBe('y = 2.00x − 4.00');
    expect(m.equationText('linear', { m: -2, b: 4 })).toBe('y = −2.00x + 4.00');
    expect(m.equationText('quadratic', { a: 1, b: -3, c: 0 })).toBe('y = 1.0000x² − 3.00x + 0.00');
  });
  it('niceAxis pads small ranges a little and keeps zero for bars', () => {
    const m = M();
    const a = m.niceAxis(0.1, 0.3);
    expect(a.min).toBeLessThanOrEqual(0.1); expect(a.max).toBeGreaterThanOrEqual(0.3); expect(a.max - a.min).toBeLessThan(0.5);
    const b = m.niceAxis(50, 88, true);
    expect(b.min).toBe(0); expect(b.max).toBeGreaterThanOrEqual(88);
    const c = m.niceAxis(-5, 8, true);
    expect(c.min).toBeLessThanOrEqual(-5); expect(c.max).toBeGreaterThanOrEqual(8);
  });
  it('parseTable handles Sheets, decimal commas, thousands, one column, and reports skipped lines', () => {
    const m = M();
    expect(m.parseTable('t\td\n0\t1,5\n1\t2,25').points).toEqual([{ x: 0, y: 1.5 }, { x: 1, y: 2.25 }]);
    expect(m.parseTable('x;y\n1;1,5\n2;1.234,5').points).toEqual([{ x: 1, y: 1.5 }, { x: 2, y: 1234.5 }]);
    expect(m.parseTable('"size","price"\n"1,200","250,000"').points).toEqual([{ x: 1200, y: 250000 }]);
    const one = m.parseTable('score\n70\n85\n90');
    expect(one.singleColumn).toBe(true);
    expect(one.points).toEqual([{ x: 1, y: 70 }, { x: 2, y: 85 }, { x: 3, y: 90 }]);
    const junk = m.parseTable('1,2\nhello\n3,4');
    expect(junk.points.length).toBe(2); expect(junk.skipped).toEqual([2]);
  });
  it('the inquiry population r equals the slider at noise SD 1 and weakens with more noise', () => {
    const m = M();
    expect(m.inquiryPopulationR(0.7, 1)).toBeCloseTo(0.7, 12);
    expect(m.inquiryPopulationR(0.7, 3)).toBeCloseTo(0.7 / Math.sqrt(0.49 + 0.51 * 9), 12);
    expect(m.inquiryPopulationR(-0.5, 0)).toBe(-1);
  });
});

describe('generated practice', () => {
  const TYPES = ['readBar', 'dotPlot', 'centre', 'spread', 'correlation', 'guessR2', 'residual', 'matchChart', 'outlier'];
  it('every item, across 400 seeded draws, grades its own answer correct and has 4+ distinct options when it has options', () => {
    const m = M(); const rand = seeded(42);
    for (let i = 0; i < 400; i++) {
      const type = TYPES[i % TYPES.length], q = m.genQuizItem(type, tt, rand, { pictograph: i % 2 === 0 });
      expect(q.key, type).toBeTruthy();
      expect(m.gradeQuiz(q, q.answer).correct, type + ' ' + q.key).toBe(true);
      if (q.choices) {
        const ids = q.choices.map((c) => c.id);
        expect(new Set(ids).size, type).toBe(ids.length);
        expect(ids, type).toContain(String(q.answer));
        expect(ids.length, type).toBeGreaterThanOrEqual(3);
      }
      expect(q.hints.length).toBe(4);
      expect(JSON.parse(JSON.stringify(q))).toEqual(q);
    }
  });
  it('centre and spread answers match an independent computation', () => {
    const m = M(); const rand = seeded(7);
    for (let i = 0; i < 300; i++) {
      const q = m.genQuizItem(i % 2 ? 'centre' : 'spread', tt, rand);
      const v = q.chart.values, kind = q.key.split(':')[1];
      const want = kind === 'mean' ? mean(v) : kind === 'median' ? med(v) : kind === 'range' ? Math.max(...v) - Math.min(...v)
        : kind === 'iqr' ? quart(v).q3 - quart(v).q1 : kind === 'mad' ? Math.round(mean(v.map((x) => Math.abs(x - mean(v)))) * 100) / 100 : null;
      if (kind === 'mode') { const c = {}; v.forEach((x) => { c[x] = (c[x] || 0) + 1; }); const top = Math.max(...Object.values(c)); expect(Object.keys(c).filter((k) => c[k] === top).map(Number)).toEqual([q.numeric.answer]); }
      else expect(q.numeric.answer, q.key).toBeCloseTo(want, 9);
    }
  });
  it('named misconceptions fire for the classic wrong answers', () => {
    const m = M(); const rand = seeded(99);
    let checkedMean = 0, checkedResidual = 0;
    for (let i = 0; i < 200 && (checkedMean < 5 || checkedResidual < 5); i++) {
      const q = m.genQuizItem(i % 2 ? 'centre' : 'residual', tt, rand);
      if (q.type === 'centre' && q.key.startsWith('centre:mean')) { const sum = q.chart.values.reduce((s, x) => s + x, 0); expect(m.gradeQuiz(q, String(sum)).feedback).toMatch(/total/); checkedMean++; }
      if (q.type === 'residual') { expect(m.gradeQuiz(q, String(-q.numeric.answer)).feedback).toMatch(/sign/i); checkedResidual++; }
    }
    expect(checkedMean).toBeGreaterThan(0); expect(checkedResidual).toBeGreaterThan(0);
  });
  it('a wrong first answer gets a misconception and a second try; a revealed answer earns no XP', async () => {
    const m = await mount({ activeTab: 'quiz', quizType: 'correlation' });
    await click(document.querySelector('[data-dataplot-quiz-new]'));
    const q = m.latest.dpQuiz, wrong = q.choices.find((c) => c.id !== q.answer).id;
    await click(document.querySelector('[data-dataplot-choice="' + wrong + '"]'));
    expect(m.latest.dpQuiz.answered).toBe(false);
    expect(document.querySelector('[data-dataplot-quiz-feedback]').textContent).toMatch(/Misconception|direction|pattern/i);
    expect(document.querySelector('[data-dataplot-choice="' + wrong + '"]').disabled).toBe(true);
    await click(document.querySelector('[data-dataplot-choice="' + q.answer + '"]'));
    expect(m.latest.dpQuiz.correct).toBe(true);
    expect(m.award.mock.calls.filter((c) => c[0] === 'dataPlot').map((c) => c[1])).toEqual([5]);
    // New item: climb the hint ladder to the answer, then answer: no XP.
    await click(byText('button', /Next/));
    const before = m.award.mock.calls.length;
    for (let i = 0; i < 4; i++) await click(document.querySelector('[data-hint-next]'));
    expect(m.latest.dpQuiz.revealed).toBe(true);
    await click(document.querySelector('[data-dataplot-choice="' + m.latest.dpQuiz.answer + '"]'));
    expect(m.award.mock.calls.slice(before).filter((c) => c[0] === 'dataPlot')).toEqual([]);
  });
  it('the teacher can stop the hint ladder short of the answer', async () => {
    const m = await mount({ activeTab: 'quiz', quizType: 'matchChart', teacher: { allowReveal: false } });
    await click(document.querySelector('[data-dataplot-quiz-new]'));
    for (let i = 0; i < 5; i++) { const b = document.querySelector('[data-hint-next]'); if (b) await click(b); }
    expect(m.latest.dpQuiz.revealed).toBe(false);
    expect(document.querySelector('[data-hint-ladder]').textContent).not.toMatch(/The answer is/);
  });
  it('quiz XP stops at the cap', async () => {
    const m = await mount({ activeTab: 'quiz', quizType: 'centre', quizXpTotal: 95, quizXpItems: {} });
    await click(document.querySelector('[data-dataplot-quiz-new]'));
    document.getElementById('dp-quiz-num').value = m.latest.dpQuiz.answer;
    await click(document.querySelector('[data-dataplot-quiz-check]'));
    expect(m.award.mock.calls.filter((c) => c[0] === 'dataPlot').map((c) => c[1])).toEqual([5]);
    expect(m.latest.quizXpTotal).toBe(100);
  });
});

describe('predict-then-check on the Statistics tab', () => {
  it('statistics stay hidden until shape, centre and spread are committed', async () => {
    const ys = [2, 3, 3, 4, 4, 4, 5, 5, 6, 15];
    const m = await mount({ points: pts(ys), activeTab: 'stats' });
    expect(document.querySelector('[data-dataplot-stat="median"]')).toBeNull();
    expect(document.querySelector('[data-dataplot-predict]')).not.toBeNull();
    await click(byText('[data-dataplot-predict] button', /Skewed right/));
    const inputs = document.querySelectorAll('[data-dataplot-predict] input');
    await React.act(async () => { setValue(inputs[0], '4'); inputs[0].dispatchEvent(new Event('input', { bubbles: true })); setValue(inputs[1], '2'); inputs[1].dispatchEvent(new Event('input', { bubbles: true })); });
    await flush();
    await click(document.querySelector('[data-dataplot-pred-commit]'));
    expect(document.querySelector('[data-dataplot-stat="median"]').textContent).toMatch(/4/);
    expect(document.querySelector('[data-dataplot-pred-result]').textContent).toMatch(/Yes/);
    // Accurate predictions earn a small XP award, once.
    expect(m.award.mock.calls.filter((c) => c[0] === 'dataPlot').map((c) => c[1])).toEqual([5]);
  });
});

describe('worked examples that fade', () => {
  it('example 1 is fully worked; example 2 leaves the MAD for the student and checks it', async () => {
    const m = await mount({ points: pts([1, 2, 3]), activeTab: 'stats' }, { ctx: { gradeBand: 'g68' } });
    const sec = () => document.querySelector('[data-dataplot-worked="mad"]');
    expect(sec().querySelectorAll('input').length).toBe(0);
    await click(sec().querySelector('[data-dataplot-worked-next]'));
    expect(sec().querySelectorAll('input').length).toBe(1);
    const v = [3, 5, 6, 9, 12], mu = mean(v), mad = mean(v.map((x) => Math.abs(x - mu)));
    const input = sec().querySelector('input');
    input.value = String(mad + 1);
    await click(sec().querySelector('li[data-dataplot-worked-step="yours"] button'));
    expect(sec().textContent).toMatch(/Not yet/);
    sec().querySelector('input').value = String(mad);
    await click(sec().querySelector('li[data-dataplot-worked-step="yours"] button'));
    expect(sec().querySelector('[data-dataplot-worked-step="right"]').textContent).toContain('2.8');
    expect(m.latest.worked.answers[3].ok).toBe(true);
  });
  it('K-5 works the median and 9-12 works the SD', async () => {
    await mount({ activeTab: 'stats' }, { ctx: { gradeBand: 'k2' } });
    expect(document.querySelector('[data-dataplot-worked="median"]').textContent).toMatch(/The median is 5\./);
    await mount({ activeTab: 'stats' }, { ctx: { gradeBand: 'g912' } });
    expect(document.querySelector('[data-dataplot-worked="sd"]').textContent).toMatch(/σ = √4 = 2\./);
  });
});

describe('drag an outlier: mean versus median', () => {
  it('the slider unlocks after a prediction, and the mean moves further than the median', async () => {
    const m = await mount({ points: pts([1, 2, 3]), activeTab: 'stats' });
    const slider = document.querySelector('[data-dataplot-shift] input[type=range]');
    expect(slider.disabled).toBe(true);
    await click(byText('[data-dataplot-shift] button', /^The median$/));
    expect(document.querySelector('[data-dataplot-shift] input[type=range]').disabled).toBe(false);
    await React.act(async () => { const s = document.querySelector('[data-dataplot-shift] input[type=range]'); setValue(s, '100'); s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); });
    await flush();
    expect(m.latest.shiftDemo.value).toBe(100);
    const base = [5, 6, 6, 7, 8, 8, 9, 10, 12];
    const dMean = mean(base.concat([100])) - mean(base.concat([10])), dMed = med(base.concat([100])) - med(base.concat([10]));
    expect(dMean).toBeGreaterThan(dMed);
    const verdict = document.querySelector('[data-dataplot-shift-verdict]');
    expect(verdict.getAttribute('data-dataplot-shift-verdict')).toBe('median');
    expect(verdict.textContent).toMatch(/Misconception/);
  });
});

describe('two-group comparison', () => {
  it('parallel plots, prediction check against the medians and IQRs, then a saved write-up', async () => {
    const m = await mount({ activeTab: 'compare' });
    expect(document.querySelector('[data-dataplot-compare-svg]')).not.toBeNull();
    const groups = document.querySelectorAll('[data-dataplot-cmp-predict] [role=radiogroup]');
    await click(byText('button', /Sunny window/, groups[0]));
    await click(byText('button', /Sunny window/, groups[1]));
    await click(document.querySelector('[data-dataplot-cmp-check]'));
    const nums = document.querySelector('[data-dataplot-cmp-numbers]').textContent;
    const A = [14, 16, 15, 18, 17, 15, 19, 16, 14, 17, 18, 20], B = [9, 11, 10, 12, 8, 13, 10, 11, 9, 12, 10, 15];
    expect(nums).toContain(String(med(A))); expect(nums).toContain(String(med(B)));
    expect(nums).toMatch(/Sunny window is larger/);
    const areas = document.querySelectorAll('[data-dataplot-writeup] textarea');
    await React.act(async () => { ['Both roughly symmetric, B has one high value.', 'Sunny median 16.5 is higher than shady 10.5.', 'IQRs are similar: 3 and 2.5 cm.'].forEach((v, i) => { setValue(areas[i], v); areas[i].dispatchEvent(new Event('input', { bubbles: true })); }); });
    await flush();
    await click(document.querySelector('[data-dataplot-cmp-finish]'));
    expect(m.latest.compare.done.plants).toBe(true);
    expect(m.award.mock.calls.filter((c) => c[0] === 'dataPlot').map((c) => c[1])).toEqual([10]);
  });
});

describe('correlation or causation cards', () => {
  it('a wrong choice names the misconception and allows a second try; XP once per card', async () => {
    const m = await mount({ activeTab: 'cause', causeIdx: 0 });
    await click(document.querySelector('[data-dataplot-cause-opt="cause"]'));
    expect(document.querySelector('[data-dataplot-cause]').textContent).toMatch(/correlation proves causation/);
    await click(document.querySelector('[data-dataplot-cause-opt="lurking"]'));
    expect(m.latest.causeAnswers.icecream).toMatchObject({ done: true, correct: true, tries: 2 });
    expect(document.querySelector('[data-dataplot-cause]').textContent).toMatch(/Hot weather/);
    expect(m.award.mock.calls.filter((c) => c[0] === 'dataPlot').map((c) => c[1])).toEqual([3]);
    expect(m.latest.missedLog.length).toBe(1);
  });
  it('every card has one correct option and texts for it', () => {
    const m = M();
    expect(m.CAUSE_CARDS.length).toBeGreaterThanOrEqual(8);
    m.CAUSE_CARDS.forEach((c) => expect(['cause', 'lurking', 'reverse', 'chance']).toContain(c.answer));
  });
});

describe('grade bands and teacher hooks', () => {
  const tabs = () => Array.from(document.querySelectorAll('[role=tab]')).map((b) => b.id.replace('data-plot-tab-', ''));
  const quizTypes = () => Array.from(document.querySelectorAll('[data-dataplot-quiz-type]')).map((b) => b.getAttribute('data-dataplot-quiz-type'));
  it('K-5 gets pictographs, bars, dot plots and chart reading; 9-12 gets regression and residuals', async () => {
    await mount({ points: pts([2, 4, 3]) }, { ctx: { gradeBand: 'g35' } });
    // Stage B (2026-11-03) added the data project for K-5 on purpose; stage C put the
    // Start-here tabs first, split pictographs from bar charts and added box plots for 6-8.
    expect(tabs()).toEqual(['chart', 'quiz', 'project', 'stats', 'tools']);
    expect(document.querySelector('[data-dataplot-chart="pictograph"]')).not.toBeNull();
    expect(document.querySelector('[data-dataplot-regression]')).toBeNull();
    await click(document.getElementById('data-plot-tab-quiz'));
    expect(quizTypes()).toEqual(['pictograph', 'readBar', 'dotPlot', 'matchChart']);
    await mount({ points: pts([2, 4, 3]), activeTab: 'quiz' }, { ctx: { gradeBand: 'g68' } });
    expect(quizTypes()).toEqual(['dotPlot', 'centre', 'spread', 'boxPlot', 'outlier', 'matchChart']);
    await mount({ points: pts([2, 4, 3]), activeTab: 'quiz' }, { ctx: { gradeBand: 'g912' } });
    expect(quizTypes()).toEqual(['correlation', 'guessR2', 'residual', 'outlier', 'matchChart']);
  });
  it('a K-5 pictograph reads with a key, and the quiz draws it', async () => {
    const m = await mount({ points: [{ x: 1, y: 6 }, { x: 2, y: 3 }], chartType: 'pictograph' }, { ctx: { gradeBand: 'k2' } });
    expect(document.body.textContent).toMatch(/Key: each ● = 1/);
    await click(document.getElementById('data-plot-tab-quiz'));
    await click(document.querySelector('[data-dataplot-quiz-new]'));
    expect(m.latest.dpQuiz.chart.kind).toBe('pictograph');
  });
  it('the teacher panel locks the level and summarises missed items', async () => {
    const m = await mount({ missedLog: [{ type: 'centre', key: 'a', mis: 'That is the total.', at: 1 }, { type: 'centre', key: 'b', mis: 'That is the total.', at: 2 }] }, { ctx: { isTeacherMode: true } });
    const panel = document.querySelector('[data-dataplot-teacher]');
    expect(panel.textContent).toMatch(/That is the total\./);
    expect(panel.querySelector('tbody').textContent).toMatch(/2/);
    const sel = panel.querySelector('select');
    await React.act(async () => { sel.value = '912'; sel.dispatchEvent(new Event('change', { bubbles: true })); });
    await flush();
    expect(m.latest.teacher.lockLevel).toBe('912');
    expect(document.querySelector('[data-dataplot-level-btn="k5"]').disabled).toBe(true);
    await mount({}, { ctx: { isTeacherMode: false } });
    expect(document.querySelector('[data-dataplot-teacher]')).toBeNull();
  });
});

describe('graph access: description, table, explorer, sound plan', () => {
  it('the chart has a text description that names the trend and a real data table', async () => {
    await mount({ points: [150, 155, 160, 165, 170].map((x, i) => ({ x, y: [50, 52, 58, 62, 68][i] })), xLabel: 'Height', yLabel: 'Weight' });
    const svg = document.querySelector('svg[data-dataplot-svg]');
    expect(svg.getAttribute('aria-describedby')).toBe('dp-chart-desc');
    const desc = document.getElementById('dp-chart-desc').textContent;
    expect(desc).toMatch(/As Height increases, Weight tends to increase/);
    expect(desc).toMatch(/very strong positive/);
    const table = document.querySelector('[data-dataplot-table] table');
    expect(table.querySelectorAll('th[scope=col]').length).toBeGreaterThanOrEqual(3);
    expect(table.querySelectorAll('tbody tr').length).toBe(5);
  });
  it('arrow keys in the point explorer step through the points in x order and announce them', async () => {
    const m = await mount({ points: [{ x: 3, y: 9 }, { x: 1, y: 1 }, { x: 2, y: 4 }] });
    const ex = document.querySelector('[data-dataplot-explorer]');
    expect(ex.getAttribute('tabindex')).toBe('0');
    await key(ex, 'ArrowRight');
    expect(m.latest.exploreIdx).toBe(0);
    await key(ex, 'End');
    expect(m.latest.exploreIdx).toBe(2);
    // Step announcements are throttled by the shared core (a burst collapses to its last).
    await React.act(async () => { await new Promise((r) => setTimeout(r, 220)); });
    const said = m.say.mock.calls.map((c) => c[0]).join(' | ');
    expect(said).toMatch(/Point 1 of 3: x 1, y 1/);
    expect(said).toMatch(/Point 3 of 3: x 3, y 9/);
    expect(document.querySelector('[data-dataplot-explore]')).not.toBeNull();
  });
  it('the shared graph core turns the data into a rising sound plan', () => {
    const GA = window.StemLab._graphAccess;
    expect(GA && GA.version).toBeGreaterThanOrEqual(2);
    const series = M().seriesByX([{ x: 2, y: 4 }, { x: 1, y: 1 }, { x: 2, y: 6 }, { x: 3, y: 9 }]);
    expect(series).toEqual([{ x: 1, y: 1 }, { x: 2, y: 5 }, { x: 3, y: 9 }]);
    const plan = GA.sonifyPlan(series, { zeros: [] });
    const f = plan.segments[0].map((s) => s.freq);
    expect(f[2]).toBeGreaterThan(f[1]); expect(f[1]).toBeGreaterThan(f[0]);
  });
});

describe('lab import hook', () => {
  it('with the sending tool\'s ctx, data land in toolData and Charts & Graphs opens in Regression mode', () => {
    let lab = { heatLab: { x: 1 } };
    const ctx = { setToolData: (fn) => { lab = fn(lab); }, setStemLabTool: vi.fn() };
    const res = window.StemLab.dataPlotImport({ title: 'Run 3', source: 'Heat Lab', xLabel: 'Time (s)', yLabel: 'Temp (°C)', points: [{ x: 0, y: 20 }, { x: 10, y: 35 }, { x: 'bad', y: 1 }, null] }, ctx);
    expect(res).toMatchObject({ ok: true, count: 2, dropped: 2 });
    expect(lab.heatLab).toEqual({ x: 1 });
    expect(lab.dataPlot.points).toEqual([{ x: 0, y: 20 }, { x: 10, y: 35 }]);
    expect(lab.dataPlot).toMatchObject({ xLabel: 'Time (s)', yLabel: 'Temp (°C)', activeTab: 'chart' });
    expect(lab._dataStudio.studioMode).toBe('regression');
    expect(ctx.setStemLabTool).toHaveBeenCalledWith('dataPlot');
  });
  it('without a ctx, the data wait in an inbox that Data Plot reads when it renders', async () => {
    const res = window.StemLab.dataPlotImport({ source: 'Skate Lab', points: [{ x: 1, y: 2 }, { x: 2, y: 3 }] });
    expect(res).toMatchObject({ ok: true, queued: true });
    const m = await mount({ points: pts([9]) });
    await flush();
    expect(m.latest.points).toEqual([{ x: 1, y: 2 }, { x: 2, y: 3 }]);
    expect(m.latest.undoStack[m.latest.undoStack.length - 1]).toEqual(pts([9]));
    expect(window.StemLab._dataPlotInbox).toBeNull();
    expect(m.say.mock.calls.map((c) => c[0]).join(' ')).toMatch(/Imported 2 points from Skate Lab/);
  });
  it('bad payloads are refused', () => {
    expect(window.StemLab.dataPlotImport(null)).toMatchObject({ ok: false });
    expect(window.StemLab.dataPlotImport({ points: [{ x: NaN, y: 1 }] })).toMatchObject({ ok: false, reason: 'no-points' });
  });
});

describe('embedding inside Charts & Graphs', () => {
  it('switching Data Studio between its modes keeps hooks balanced and the plotter working', async () => {
    loadTool('stem_lab/stem_tool_datastudio.js', 'dataStudio');
    const errSpy = vi.spyOn(console, 'error');
    let setLab;
    function Host() {
      const [lab, setL] = React.useState({ _dataStudio: { studioMode: 'regression' }, dataPlot: { points: pts([1, 3, 2, 5]) } });
      setLab = setL;
      const ctx = makeCtx({ toolData: lab, setToolData: setL, update: (id, k, v) => setL((p) => { const n = Object.assign({}, p); n[id] = Object.assign({}, p[id] || {}); n[id][k] = v; return n; }), updateMulti: (id, o) => setL((p) => { const n = Object.assign({}, p); n[id] = Object.assign({}, p[id] || {}, o); return n; }) });
      return window.StemLab._registry.dataStudio.render(ctx);
    }
    const host = document.getElementById('root');
    const r = ReactDOMClient.createRoot(host);
    await React.act(async () => r.render(React.createElement(Host)));
    expect(document.querySelector('[aria-label="Data Plot sections"]')).not.toBeNull();
    expect(byText('h3', /Regression & Residuals/)).toBeTruthy();
    await React.act(async () => setLab((p) => Object.assign({}, p, { _dataStudio: { studioMode: 'charts' } })));
    expect(document.querySelector('[aria-label="Data Plot sections"]')).toBeNull();
    await React.act(async () => setLab((p) => Object.assign({}, p, { _dataStudio: { studioMode: 'regression' } })));
    expect(document.querySelector('[aria-label="Data Plot sections"]')).not.toBeNull();
    await React.act(async () => r.unmount());
    expect(errSpy.mock.calls.map((c) => String(c[0]).slice(0, 160))).toEqual([]);
  });
});
