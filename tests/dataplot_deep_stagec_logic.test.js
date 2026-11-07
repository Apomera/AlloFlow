import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setup, teardown, M } from './dataplot_deep_helpers.js';

// Data Plot stage C (2026-11-03), pure logic: box-plot practice, the K-5 pictograph type,
// the band learning paths and their ticks, grading a student's own two-way table, and
// translated quest labels. Expected values are computed here independently.
beforeEach(() => setup());
afterEach(async () => { await teardown(); });

function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const tt = (k, fb) => fb;
const med = (a) => { const s = a.slice().sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
function five(a) { const s = a.slice().sort((x, y) => x - y), n = s.length; return { min: s[0], q1: med(s.slice(0, Math.floor(n / 2))), med: med(s), q3: med(s.slice(Math.ceil(n / 2))), max: s[n - 1] }; }
const f2 = (v) => String(Math.round(v * 100) / 100);

describe('box-plot practice (6-8)', () => {
  it('400 seeded items: the labelled five numbers and every answer match an independent computation', () => {
    const m = M(); const rand = seeded(11); const kinds = {};
    for (let i = 0; i < 400; i++) {
      const q = m.genQuizItem('boxPlot', tt, rand);
      expect(q.type).toBe('boxPlot');
      const f = five(q.chart.values), s = q.chart.sum;
      expect(s).toEqual(f);
      expect(f.min < f.q1 && f.q1 < f.med && f.med < f.q3 && f.q3 < f.max, q.key).toBe(true);
      const kind = q.key.split(':')[1]; kinds[kind] = (kinds[kind] || 0) + 1;
      const want = { median: f2(f.med), iqr: f2(f.q3 - f.q1), range: f2(f.max - f.min), half: '50', whisker: 'same' }[kind];
      expect(q.answer, q.key).toBe(want);
      expect(m.gradeQuiz(q, q.answer).correct).toBe(true);
      const ids = q.choices.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length); expect(ids).toContain(q.answer); expect(ids.length).toBeGreaterThanOrEqual(3);
      expect(q.hints.length).toBe(4);
      // No answer text in the first three hints.
      q.hints.slice(0, 3).forEach((h) => expect(h).not.toMatch(/The answer is/));
      if (kind === 'median') {
        expect(Math.abs((f.q1 + f.q3) / 2 - f.med)).toBeGreaterThanOrEqual(1);
        const mid = f2((f.q1 + f.q3) / 2);
        if (ids.includes(mid)) expect(m.gradeQuiz(q, mid).feedback).toMatch(/halfway across the box/);
      }
      if (kind === 'iqr' && ids.includes(f2(f.max - f.min))) expect(m.gradeQuiz(q, f2(f.max - f.min)).feedback).toMatch(/That is the range/);
      if (kind === 'range' && ids.includes(f2(f.q3 - f.q1))) expect(m.gradeQuiz(q, f2(f.q3 - f.q1)).feedback).toMatch(/That is the IQR/);
      if (kind === 'whisker') {
        const lw = f.q1 - f.min, rw = f.max - f.q3;
        expect(Math.max(lw, rw)).toBeGreaterThanOrEqual(2 * Math.min(lw, rw));
        expect(q.text).toMatch(rw > lw ? /right whisker is longer/ : /left whisker is longer/);
        expect(m.gradeQuiz(q, 'long').feedback).toMatch(/a longer part of a box plot holds more data/);
        expect(q.key).toBe('box:whisker');
      }
      if (kind === 'half') { expect(m.gradeQuiz(q, '25').feedback).toMatch(/quarter/); expect(q.key).toBe('box:half'); }
    }
    expect(Object.keys(kinds).sort()).toEqual(['half', 'iqr', 'median', 'range', 'whisker']);
  });
  it('box plots belong to 6-8; K-5 gets pictographs and bar charts as separate types', () => {
    const m = M();
    expect(m.QUIZ_BY_LEVEL['68']).toContain('boxPlot');
    expect(m.QUIZ_BY_LEVEL.k5.slice(0, 2)).toEqual(['pictograph', 'readBar']);
    const rand = seeded(3);
    for (let i = 0; i < 40; i++) {
      const p = m.genQuizItem('pictograph', tt, rand), b = m.genQuizItem('readBar', tt, rand, {});
      expect(p.type).toBe('pictograph'); expect(p.chart.kind).toBe('pictograph'); expect(p.key.startsWith('pic:bar:')).toBe(true);
      expect(b.chart.kind).toBe('bar'); expect(m.gradeQuiz(p, p.answer).correct).toBe(true);
    }
  });
});

describe('learning paths', () => {
  it('each band has 3 to 6 steps, on tabs that band can open, with the band core tabs first', () => {
    const m = M();
    expect(m.LEARNING_PATHS.k5.map((s) => s.id)).toEqual(['pictograph', 'bar', 'dot', 'project']);
    expect(m.LEARNING_PATHS['68'].map((s) => s.id)).toEqual(['centre', 'box', 'compare', 'sampling', 'twoway', 'fiteye']);
    expect(m.LEARNING_PATHS['912'].map((s) => s.id)).toEqual(['regression', 'residplot', 'cause']);
    for (const band of ['k5', '68', '912']) {
      const steps = m.LEARNING_PATHS[band], order = m.TAB_ORDER_BY_LEVEL[band];
      expect(steps.length).toBeGreaterThanOrEqual(3); expect(steps.length).toBeLessThanOrEqual(6);
      const pathTabs = [...new Set(steps.map((s) => s.tab))];
      pathTabs.forEach((tab) => expect(order).toContain(tab));
      // Chart (the data home) first, then every path tab before any other tab.
      expect(order[0]).toBe('chart');
      const lastPath = Math.max(...pathTabs.map((tab) => order.indexOf(tab)));
      expect(order.slice(1, lastPath + 1).every((tab) => pathTabs.includes(tab))).toBe(true);
      steps.filter((s) => s.quiz).forEach((s) => expect(m.QUIZ_BY_LEVEL[band]).toContain(s.quiz));
    }
    // No activity was dropped: 6-8 and 9-12 keep all eleven tabs.
    expect([...m.TAB_ORDER_BY_LEVEL['68']].sort()).toEqual([...m.TAB_ORDER_BY_LEVEL['912']].sort());
    expect(m.TAB_ORDER_BY_LEVEL['68'].length).toBe(11);
  });
  it('ticks come from saved progress flags, with old quiz-XP keys as a fallback', () => {
    const m = M(), step = (band, id) => m.LEARNING_PATHS[band].find((s) => s.id === id), done = (band, id, st) => m.pathStepDone(step(band, id), st);
    for (const [band, id] of [['k5', 'pictograph'], ['k5', 'bar'], ['k5', 'dot'], ['k5', 'project'], ['68', 'centre'], ['68', 'box'], ['68', 'compare'], ['68', 'sampling'], ['68', 'twoway'], ['68', 'fiteye'], ['912', 'regression'], ['912', 'residplot'], ['912', 'cause']]) {
      expect(done(band, id, {}), id).toBe(false);
    }
    expect(done('k5', 'pictograph', { skillsDone: { 'quiz:pictograph': true } })).toBe(true);
    expect(done('k5', 'bar', { quizXpItems: { 'bar:most:fruit:1-2-3-4': true } })).toBe(true);
    expect(done('k5', 'dot', { skillsDone: { 'quiz:dotPlot': true } })).toBe(true);
    expect(done('k5', 'project', { skillsDone: { project: true } })).toBe(true);
    expect(done('68', 'centre', { skillsDone: { pred: true } })).toBe(true);
    expect(done('68', 'centre', { skillsDone: { 'quiz:centre': true } })).toBe(false);
    expect(done('68', 'centre', { skillsDone: { 'quiz:centre': true, 'quiz:spread': true } })).toBe(true);
    expect(done('68', 'box', { quizXpItems: { 'box:half': true } })).toBe(true);
    expect(done('68', 'compare', { skillsDone: { 'compare:plants': true } })).toBe(true);
    expect(done('68', 'sampling', { skillsDone: { 'sampling:commute': true } })).toBe(true);
    expect(done('68', 'twoway', { skillsDone: { 'twmine:123': true } })).toBe(true);
    expect(done('68', 'fiteye', { skillsDone: { 'fit:gen:68:1': true } })).toBe(true);
    expect(done('912', 'residplot', { skillsDone: { 'resid:4': true } })).toBe(true);
    const three = { 'cause:icecream': true, 'cause:fertilizer': true, 'cause:doctor': true };
    expect(done('912', 'cause', { skillsDone: three })).toBe(false);
    expect(done('912', 'cause', { skillsDone: three, causeAnswers: { shoesize: { done: true, correct: true } } })).toBe(true);
    expect(done('912', 'cause', { skillsDone: three, causeAnswers: { shoesize: { done: true, correct: false } } })).toBe(false);
  });
});

describe('grading a student own two-way table', () => {
  const table = (text) => { const m = M(), p = m.parseCategoryPairs(text), tb = m.twoWayFrom(p.records, p.rows, p.cols); return { tb, st: m.twoWayStats(tb) }; };
  it('the answer follows the conditional percents: association, none, or weak', () => {
    const m = M();
    const yes = table('A,y\nA,y\nA,y\nA,n\nB,n\nB,n\nB,n\nB,y');           // 75% vs 25%
    expect(yes.st.verdict).toBe('yes'); expect(m.twoWayGrade(yes.tb, yes.st, 'yes_pct').correct).toBe(true);
    const no = table('A,y\nA,n\nB,y\nB,n\nA,y\nA,n\nB,y\nB,n');            // 50% vs 50%
    expect(no.st.verdict).toBe('no'); expect(m.twoWayGrade(no.tb, no.st, 'no_pct').correct).toBe(true);
    // 60% of 10 vs 45% of 20: a 15-point gap, between the 8 and 20 point lines.
    const weakText = [].concat(Array(6).fill('A,y'), Array(4).fill('A,n'), Array(9).fill('B,y'), Array(11).fill('B,n')).join('\n');
    const weak = table(weakText);
    expect(weak.st.gap).toBeCloseTo(0.15, 9); expect(weak.st.verdict).toBe('weak');
    expect(m.twoWayGrade(weak.tb, weak.st, 'weak_pct').correct).toBe(true);
    expect(m.twoWayGrade(weak.tb, weak.st, 'yes_pct')).toMatchObject({ correct: false, mis: 'weakGap' });
  });
  it('wrong reasons are named: raw counts, unequal sizes, and misread gaps', () => {
    const m = M();
    const yes = table('A,y\nA,y\nA,y\nA,y\nA,y\nA,n\nB,n\nB,y\nB,n');      // unequal groups: 6 and 3
    expect(m.twoWayGrade(yes.tb, yes.st, 'yes_count')).toMatchObject({ correct: false, mis: 'rawCounts', equalSizes: false });
    expect(m.twoWayGrade(yes.tb, yes.st, 'no_size').mis).toBe('unequal');
    expect(m.twoWayGrade(yes.tb, yes.st, 'no_pct').mis).toBe('bigGap');
    const no = table('A,y\nA,n\nB,y\nB,n');
    expect(m.twoWayGrade(no.tb, no.st, 'yes_pct').mis).toBe('smallGap');
    expect(m.twoWayGrade(no.tb, no.st, 'yes_count').equalSizes).toBe(true);
    // A 3 x 3 table works too.
    const big = table('a,x\na,x\nb,y\nb,y\nc,z\nc,z');
    expect(big.st.verdict).toBe('yes'); expect(m.twoWayGrade(big.tb, big.st, 'yes_pct').correct).toBe(true);
  });
});

describe('quest labels follow the current language', () => {
  it('labels are read through the last render translator', () => {
    const reg = window.StemLab._registry.dataPlot;
    expect(reg.questHooks[0].label).toBe('Plot 5+ data points');
    // Any render hands the module its translator; labels read it on every access.
    reg.render({ React: { createElement: () => null }, t: (k, fb) => (k === 'stem.dataplot.quest_plot5' ? 'Trace 5 points ou plus' : fb) });
    expect(reg.questHooks[0].label).toBe('Trace 5 points ou plus');
    expect(reg.questHooks.map((q) => q.id)).toEqual(['plot_5_points', 'plot_10_points', 'view_residuals']);
  });
});
