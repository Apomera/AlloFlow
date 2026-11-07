import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setup, teardown, mount, click, flush, typeInto, pts, setValue, M, React } from './dataplot_deep_helpers.js';

// Data Plot stage C (2026-11-03), mounted through React: the Start-here path per band, one
// reveal pattern on every tab, graded own two-way tables, the XP cap in the teacher summary,
// the tool's own dark surface, and the memoised data table staying in step with the data.
beforeEach(() => setup());
afterEach(async () => { await teardown(); vi.restoreAllMocks(); });

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const steps = () => $$('[data-dataplot-path-step]').map((b) => b.getAttribute('data-dataplot-path-step'));
const choose = (scope, id) => click($(scope + ' [data-choice="' + id + '"]'));
const award = (m) => m.award.mock.calls.filter((c) => c[0] === 'dataPlot').map((c) => c[1]);

describe('Start here: a learning path per grade band', () => {
  it('K-5, 6-8 and 9-12 each get their own steps, and the path tabs are marked', async () => {
    await mount({}, { ctx: { gradeBand: 'g35' } });
    expect($('[data-dataplot-path]').getAttribute('data-dataplot-path')).toBe('k5');
    expect(steps()).toEqual(['pictograph', 'bar', 'dot', 'project']);
    expect($$('[data-dataplot-on-path]').map((b) => b.id)).toEqual(['data-plot-tab-quiz', 'data-plot-tab-project']);
    await mount({}, { ctx: { gradeBand: 'g68' } });
    expect(steps()).toEqual(['centre', 'box', 'compare', 'sampling', 'twoway', 'fiteye']);
    expect($('[data-dataplot-path-progress]').textContent).toBe('0 of 6 done');
    await mount({}, { ctx: { gradeBand: 'g912' } });
    expect(steps()).toEqual(['regression', 'residplot', 'cause']);
    await mount({}, { ctx: {} });
    expect(steps()).toEqual(['regression', 'residplot', 'cause']);
    // The tick marks are ✓ for done steps and the next step is the current one.
    await mount({ skillsDone: { 'fit:gen:912:1': true } }, { ctx: { gradeBand: 'g912' } });
    expect($('[data-dataplot-path-step="regression"]').getAttribute('data-dataplot-path-done')).toBe('true');
    expect($('[data-dataplot-path-step="residplot"]').getAttribute('aria-current')).toBe('step');
  });
  it('a step opens its activity: box plots start a box-plot question, and a right answer ticks it', async () => {
    const m = await mount({}, { ctx: { gradeBand: 'g68' } });
    await click($('[data-dataplot-path-step="box"]'));
    expect(m.latest.activeTab).toBe('quiz');
    expect(m.latest.quizType).toBe('boxPlot');
    const q = m.latest.dpQuiz;
    expect(q.type).toBe('boxPlot');
    expect($('[data-dataplot-box-quiz]').getAttribute('aria-label')).toMatch(/minimum .*Q1 .*median .*Q3 .*maximum/);
    await click($('[data-dataplot-choice="' + q.answer + '"]'));
    expect(m.latest.skillsDone['quiz:boxPlot']).toBe(true);
    expect($('[data-dataplot-path-step="box"]').getAttribute('data-dataplot-path-done')).toBe('true');
    expect($('[data-dataplot-path-progress]').textContent).toBe('1 of 6 done');
  });
  it('the centre step loads example data when there is too little to predict from', async () => {
    const m = await mount({}, { ctx: { gradeBand: 'g68' } });
    await click($('[data-dataplot-path-step="centre"]'));
    expect(m.latest.activeTab).toBe('stats');
    expect(m.latest.points.length).toBeGreaterThanOrEqual(5);
    expect($('[data-dataplot-predict]')).not.toBeNull();
  });
  it('the 9-12 residual step opens the residual-plot activity', async () => {
    const m = await mount({}, { ctx: { gradeBand: 'g912' } });
    await click($('[data-dataplot-path-step="residplot"]'));
    expect(m.latest.activeTab).toBe('fit');
    expect($('[data-dataplot-resid-check]')).not.toBeNull();
  });
});

describe('the XP cap stays at 100, and the teacher sees it', () => {
  it('past the cap a right answer pays nothing but still ticks the path and is counted for the teacher', async () => {
    const m = await mount({ quizXpTotal: 100, quizXpItems: {} }, { ctx: { gradeBand: 'g35', isTeacherMode: true } });
    expect($('[data-dataplot-xp-capped]')).not.toBeNull();
    await click($('[data-dataplot-path-step="dot"]'));
    await click($('[data-dataplot-choice="' + m.latest.dpQuiz.answer + '"]'));
    expect(award(m)).toEqual([]);
    expect(m.latest.quizXpTotal).toBe(100);
    expect(m.latest.skillsDone['quiz:dotPlot']).toBe(true);
    expect(m.latest.xpCapCorrect).toBe(1);
    const xp = $('[data-dataplot-teacher-xp]');
    expect(xp.getAttribute('data-dataplot-teacher-xp')).toBe('capped');
    expect(xp.textContent).toBe('XP cap reached: 100 of 100 XP earned here. Correct work since then (no XP): 1.');
    expect($('[data-dataplot-teacher-path]').textContent).toMatch(/1 of 4 steps done\. Done: Read a dot plot\./);
  });
  it('below the cap the teacher sees the running total', async () => {
    await mount({ quizXpTotal: 35 }, { ctx: { isTeacherMode: true } });
    expect($('[data-dataplot-teacher-xp]').textContent).toBe('XP earned here: 35 of 100 (the cap).');
  });
  it('the mean-versus-median demo stays inside the cap (it used to add a flat 5)', async () => {
    const m = await mount({ points: pts([1, 2, 3]), activeTab: 'stats', shiftDemo: { pred: 'mean' }, quizXpTotal: 98, quizXpItems: {} });
    await React.act(async () => { const s = $('[data-dataplot-shift] input[type=range]'); setValue(s, '100'); s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); });
    await flush();
    expect(award(m)).toEqual([2]);
    expect(m.latest.quizXpTotal).toBe(100);
  });
});

describe('one reveal pattern on every tab: two tries, then Show the answer, worth nothing', () => {
  it('quiz: after two misses the answer stays hidden until asked for', async () => {
    const m = await mount({ activeTab: 'quiz', quizType: 'matchChart' });
    await click($('[data-dataplot-quiz-new]'));
    const q = m.latest.dpQuiz, wrong = q.choices.filter((c) => c.id !== q.answer).map((c) => c.id), said = m.say.mock.calls.length;
    await click($('[data-dataplot-choice="' + wrong[0] + '"]'));
    await click($('[data-dataplot-choice="' + wrong[1] + '"]'));
    expect(m.latest.dpQuiz.answered).toBe(true);
    expect($('[data-dataplot-quiz-feedback]').textContent).not.toMatch(/The answer is/);
    expect($('[data-dataplot-choice="' + q.answer + '"]').className).not.toMatch(/bg-emerald-100/);
    expect(m.say.mock.calls.slice(said).map((c) => c[0]).join(' ')).not.toMatch(/The answer is/);
    await click($('[data-dataplot-reveal="quiz"]'));
    expect($('[data-dataplot-quiz-feedback]').textContent).toContain('The answer is ' + q.answerText);
    expect(m.latest.dpQuiz.revealed).toBe(true);
    expect(award(m)).toEqual([]);
  });
  it('quiz with reveals off: a note, no button', async () => {
    const m = await mount({ activeTab: 'quiz', quizType: 'matchChart', teacher: { allowReveal: false } });
    await click($('[data-dataplot-quiz-new]'));
    const q = m.latest.dpQuiz, wrong = q.choices.filter((c) => c.id !== q.answer).map((c) => c.id);
    await click($('[data-dataplot-choice="' + wrong[0] + '"]'));
    await click($('[data-dataplot-choice="' + wrong[1] + '"]'));
    expect($('[data-dataplot-reveal="quiz"]')).toBeNull();
    expect($('[data-dataplot-reveal-off="quiz"]')).not.toBeNull();
  });
  it('cause cards: hints first, then two misses hide the explanation until asked for', async () => {
    const m = await mount({ activeTab: 'cause', causeIdx: 0 });
    expect($('[data-hint-ladder]')).not.toBeNull();
    await click($('[data-dataplot-cause-opt="cause"]'));
    await click($('[data-dataplot-cause-opt="reverse"]'));
    expect(m.latest.causeAnswers.icecream).toMatchObject({ done: true, correct: false });
    expect($('[data-dataplot-cause-explain]')).toBeNull();
    await click($('[data-dataplot-reveal="cause"]'));
    expect($('[data-dataplot-cause-explain]').textContent).toMatch(/The answer is .*Hot weather/);
    expect(award(m)).toEqual([]);
    expect(m.latest.skillsDone || {}).not.toHaveProperty('cause:icecream');
  });
  it('residual check: two misses, then the answer on request', async () => {
    let seed = 1; while (M().genResidSet(seed).kind !== 'curve') seed++;
    const m = await mount({ activeTab: 'fit', fitLab: { mode: 'resid' }, residLab: { key: 'resid:' + seed, seed, pred: 'yes' } }, { ctx: { gradeBand: 'g912' } });
    await choose('[data-dataplot-resid-question]', 'yes');
    await choose('[data-dataplot-resid-question]', 'fan');
    expect($('[data-dataplot-resid-answer]')).toBeNull();
    await click($('[data-dataplot-reveal="resid"]'));
    expect($('[data-dataplot-resid-answer]').getAttribute('data-dataplot-resid-answer')).toBe('curve');
    expect(award(m)).toEqual([]);
  });
  it('two-way association: two misses, then the verdict on request, worth nothing', async () => {
    const g = M().genTwoWay(1);
    const m = await mount({ activeTab: 'twoway', twoWay: { key: 'twoway:1', seed: 1, built: true } }, { ctx: { gradeBand: 'g68' } });
    await choose('[data-dataplot-tw-assoc]', 'yes_count');
    await choose('[data-dataplot-tw-assoc]', 'no_size');
    expect($('[data-dataplot-tw-verdict]')).toBeNull();
    await click($('[data-dataplot-reveal="twoway"]'));
    expect($('[data-dataplot-tw-verdict]').getAttribute('data-dataplot-tw-verdict')).toBe(g.assoc ? 'yes' : 'no');
    expect(award(m)).toEqual([]);
  });
});

describe('grading a student own two-way table', () => {
  const text = 'Grade 7, yes\nGrade 7, yes\nGrade 7, yes\nGrade 7, yes\nGrade 7, yes\nGrade 7, no\nGrade 8, no\nGrade 8, yes\nGrade 8, no\nGrade 6, yes\nGrade 6, no';
  it('a raw-counts answer is named with every row size and percent; the right answer ticks the path with no XP', async () => {
    const m = await mount({ activeTab: 'twoway', twoWay: { mode: 'mine', customText: text } }, { ctx: { gradeBand: 'g68' } });
    expect($$('[data-dataplot-tw-mine-verdict] [data-choice]').map((b) => b.getAttribute('data-choice'))).toEqual(['yes_pct', 'no_pct', 'weak_pct', 'yes_count', 'no_size']);
    await choose('[data-dataplot-tw-mine-verdict]', 'yes_count');
    const fb = $('[data-dataplot-tw-mine-verdict]').textContent;
    expect(fb).toMatch(/comparing raw counts/);
    expect(fb).toContain('Grade 7: 6, Grade 8: 3, Grade 6: 2');
    expect(fb).toContain('83.3% of Grade 7, 33.3% of Grade 8, 50% of Grade 6');
    expect(m.latest.missedLog.slice(-1)[0].type).toBe('twoway');
    await choose('[data-dataplot-tw-mine-verdict]', 'yes_pct');
    expect($('[data-dataplot-tw-verdict]').getAttribute('data-dataplot-tw-verdict')).toBe('yes');
    expect($('[data-dataplot-tw-verdict]').textContent).toMatch(/With only 11 records/);
    expect(Object.keys(m.latest.skillsDone).some((k) => k.startsWith('twmine:'))).toBe(true);
    expect(award(m)).toEqual([]);
  });
  it('a near-equal table is "no", and saying yes names the small gap', async () => {
    await mount({ activeTab: 'twoway', twoWay: { mode: 'mine', customText: 'A,y\nA,n\nB,y\nB,n\nA,y\nA,n\nB,y\nB,n' } }, { ctx: { gradeBand: 'g68' } });
    await choose('[data-dataplot-tw-mine-verdict]', 'yes_pct');
    expect($('[data-dataplot-tw-mine-verdict]').textContent).toMatch(/biggest gap is only 0 points/);
  });
});

describe('the tool paints its own dark surface', () => {
  it('dark: a dark root, the class remap, and light ink on dark charts; contrast mode wins over dark', async () => {
    await mount({ points: pts([3, 5, 4, 9, 12]) }, { ctx: { isDark: true } });
    const root = $('[data-dataplot-root]');
    expect(root.getAttribute('data-dp-theme')).toBe('dark');
    expect(root.style.background).toMatch(/rgb\(15, 23, 42\)|#0f172a/);
    expect(root.querySelector('style').textContent).toContain('[data-dp-theme="dark"] .bg-white{background-color:#1e293b!important}');
    const svg = $('[data-dataplot-svg]');
    expect(svg.style.background).toMatch(/rgb\(15, 23, 42\)|#0f172a/);
    const fills = Array.from(svg.querySelectorAll('text')).map((x) => x.getAttribute('fill'));
    expect(fills.length).toBeGreaterThan(3);
    // None of the light-theme inks (dark text on white) survive on the dark chart.
    fills.forEach((f) => expect(['#1e293b', '#475569', '#334155', '#0f766e', '#0f172a']).not.toContain(f));
    await mount({ points: pts([3, 5, 4, 9, 12]) }, { ctx: { isDark: true, isContrast: true } });
    expect($('[data-dataplot-root]').getAttribute('data-dp-theme')).toBeNull();
    await mount({ points: pts([3, 5, 4, 9, 12]) }, { ctx: {} });
    expect($('[data-dataplot-root]').getAttribute('data-dp-theme')).toBeNull();
    expect($('[data-dataplot-svg]').style.background).toMatch(/rgb\(255, 255, 255\)|#ffffff/);
  });
});

describe('every tab mounts in dark mode', () => {
  it('each tab at each band, dark and teacher, logs no console errors', async () => {
    const err = vi.spyOn(console, 'error'), warn = vi.spyOn(console, 'warn');
    for (const gradeBand of ['k2', 'g68', 'g912']) {
      for (const tab of M().TAB_ORDER_BY_LEVEL[gradeBand === 'k2' ? 'k5' : gradeBand === 'g68' ? '68' : '912']) {
        await mount({ activeTab: tab, points: pts([3, 7, 4, 9, 12, 8, 15]) }, { ctx: { gradeBand, isDark: true, isTeacherMode: true } });
        expect($('[role=tabpanel]'), tab).not.toBeNull();
        expect($('[data-dataplot-root]').getAttribute('data-dp-theme')).toBe('dark');
      }
    }
    expect(err).not.toHaveBeenCalled(); expect(warn).not.toHaveBeenCalled();
  }, 60000);
});

describe('the memoised data table follows the data', () => {
  it('deleting a row, editing a value and changing the model all reach the table', async () => {
    const m = await mount({ points: pts([3, 5, 4, 9, 12, 8]), tableMode: true }, { ctx: { gradeBand: 'g912' } });
    const rows = () => $$('[data-dataplot-table] tbody tr');
    expect(rows().length).toBe(6);
    await click($('[aria-label="Delete row 2 (2, 5)"]'));
    expect(rows().length).toBe(5);
    expect(rows()[1].querySelectorAll('input')[1].value).toBe('4');
    const resid = () => rows()[0].querySelectorAll('td')[2].textContent;
    const before = resid();
    await click($('[data-regression-model="quadratic"]'));
    expect(resid()).not.toBe(before);
    const yIn = rows()[0].querySelectorAll('input')[1];
    await React.act(async () => { setValue(yIn, '30'); yIn.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); });
    await flush();
    expect(m.latest.points[0].y).toBe(30);
    expect(rows()[0].querySelectorAll('input')[1].value).toBe('30');
    // Undo restores the old value in the table too.
    await click($$('button').find((b) => /Undo/.test(b.textContent)));
    expect(m.latest.points[0].y).toBe(3);
    expect(rows()[0].querySelectorAll('input')[1].value).toBe('3');
  });
});
