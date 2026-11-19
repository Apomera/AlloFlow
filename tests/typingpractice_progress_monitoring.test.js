import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_typingpractice.js'), 'utf8');

function extractFunction(name) {
  const start = source.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('Function not found: ' + name);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = brace; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('Unterminated function: ' + name);
}

// SECTION 9 is self-contained apart from a few helpers, stubbed here.
const sectionStart = source.indexOf('  var TYPING_PRACTICE_PROBE_BANDS');
const sectionEnd = source.indexOf('  function typingPracticeDiscardSessionUpdates(');
expect(sectionStart).toBeGreaterThan(0);
expect(sectionEnd).toBeGreaterThan(sectionStart);
const LESSON_IDS = ['lesson-fj', 'lesson-dk'];
const TIER_ORDER = ['home-row', 'top-row', 'bottom-row', 'common-words', 'capitalization', 'number-row', 'symbols', 'passage'];
const exportNames = [
  'TYPING_PRACTICE_PROBE_BANDS', 'TYPING_PRACTICE_PROBE_FORMS', 'TYPING_PRACTICE_PLACEMENT_STEPS',
  'typingPracticeProbeBand', 'typingPracticeProbeFormById', 'typingPracticeNextProbeForm', 'typingPracticeNetWpm',
  'typingPracticeTrackUncorrected', 'typingPracticeCountUncorrected', 'typingPracticeUncorrectedFromEvents',
  'typingPracticeProbeSessions', 'typingPracticeProbeBaseline', 'typingPracticeNormalizeIepGoal', 'typingPracticeProbeMeetsGoal',
  'typingPracticeGoalStatus', 'typingPracticeTrend', 'typingPracticeAimLine', 'typingPracticeTrendVsAim',
  'typingPracticeProbeSummaryText', 'typingPracticeProbeChartModel', 'typingPracticeRenderProbeChart', 'typingPracticeSvgString',
  'typingPracticeBuildReportHtml', 'typingPracticeReportTextToHtml', 'typingPracticePlacementPassed', 'typingPracticePlacementLevel',
  'typingPracticeApplyPlacement', 'typingPracticeTeacherUnlock', 'typingPracticeNormalizeLessonBests', 'typingPracticeUpdateLessonBest'
];
const lib = Function(
  '__alloTPT', 'applySessionFilters', 'typingPracticeTierText', 'TIER_ORDER', 'typingPracticeLessonById', 'typingPracticeNum',
  source.slice(sectionStart, sectionEnd) + '\nreturn {' + exportNames.map((n) => n + ': ' + n).join(', ') + '};'
)(
  (k, fb) => fb,
  (sessions) => sessions,
  (tierId) => 'text for ' + tierId,
  TIER_ORDER,
  (id) => (LESSON_IDS.indexOf(id) !== -1 ? { id } : null),
  (v, min, max, fallback) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback; }
);

const wordsLine = source.split('\n').find((line) => line.includes('var TYPING_PRACTICE_WORDS_TEXT = '));
const WORDS = wordsLine.slice(wordsLine.indexOf("'") + 1, wordsLine.lastIndexOf("'")).split(' ');
const rank = {};
WORDS.forEach((w, i) => { if (rank[w] === undefined) rank[w] = i; });

function formMetrics(text) {
  const words = text.split(' ');
  const bare = words.map((w) => w.toLowerCase().replace(/[^a-z]/g, ''));
  return {
    len: text.length,
    avgWordLen: text.replace(/[^a-zA-Z]/g, '').length / words.length,
    capShare: (text.match(/[A-Z]/g) || []).length / text.length * 100,
    punctShare: (text.match(/[.,?]/g) || []).length / text.length * 100,
    meanRank: bare.reduce((a, w) => a + rank[w], 0) / bare.length,
    unknown: bare.filter((w) => rank[w] === undefined)
  };
}
const spread = (values) => Math.max(...values) - Math.min(...values);

const DAY = 24 * 60 * 60 * 1000;
function probe(dayOffset, netWpm, accuracy, extra = {}) {
  return Object.assign({
    date: new Date(Date.UTC(2026, 8, 1) + dayOffset * DAY).toISOString(),
    drillId: 'benchmark', wpm: netWpm + 1, netWpm, accuracy, charCount: 90,
    measurementComparable: true, metricComparable: true,
    probe: { formId: 'g23-a', band: '2-3', durationSec: 60 },
    accommodationsUsed: ['showKeyboard', 'dyslexiaFont', 'assessmentMode']
  }, extra);
}

describe('Benchmark probe forms', () => {
  it('has at least 6 frozen forms per grade band with unique ids, built from the word list', () => {
    const ids = new Set();
    expect(lib.TYPING_PRACTICE_PROBE_BANDS).toEqual(['K', '1', '2-3', '4-5', '6-8', '9-12']);
    lib.TYPING_PRACTICE_PROBE_BANDS.forEach((band) => {
      const forms = lib.TYPING_PRACTICE_PROBE_FORMS[band];
      expect(forms.length).toBeGreaterThanOrEqual(6);
      forms.forEach((form) => {
        expect(ids.has(form.id)).toBe(false);
        ids.add(form.id);
        expect(typeof form.seed).toBe('number');
        expect(formMetrics(form.text).unknown).toEqual([]);
        expect(form.text).not.toMatch(/ {2}/);
      });
    });
  });

  it('keeps forms within a band equivalent in length, word length, frequency and capitals/punctuation', () => {
    lib.TYPING_PRACTICE_PROBE_BANDS.forEach((band) => {
      const m = lib.TYPING_PRACTICE_PROBE_FORMS[band].map((f) => formMetrics(f.text));
      expect(spread(m.map((x) => x.len)), band + ' length').toBeLessThanOrEqual(3);
      expect(spread(m.map((x) => x.avgWordLen)), band + ' word length').toBeLessThanOrEqual(0.5);
      expect(spread(m.map((x) => x.capShare)), band + ' capitals').toBeLessThanOrEqual(0.2);
      expect(spread(m.map((x) => x.punctShare)), band + ' punctuation').toBeLessThanOrEqual(0.2);
      const meanRank = m.reduce((a, x) => a + x.meanRank, 0) / m.length;
      m.forEach((x) => expect(Math.abs(x.meanRank - meanRank) / meanRank, band + ' frequency').toBeLessThanOrEqual(0.06));
    });
    // Younger bands use only the most frequent, shorter words.
    [['K', 300, 2, 5], ['1', 600, 2, 6], ['2-3', 1200, 1, 99]].forEach(([band, maxRank, minLen, maxLen]) => {
      lib.TYPING_PRACTICE_PROBE_FORMS[band].forEach((f) => {
        f.text.toLowerCase().replace(/[^a-z ]/g, '').split(' ').forEach((w) => {
          expect(rank[w], band + ' word ' + w).toBeLessThan(maxRank);
          expect(w.length, band + ' word ' + w).toBeGreaterThanOrEqual(minLen);
          expect(w.length, band + ' word ' + w).toBeLessThanOrEqual(maxLen);
        });
      });
    });
    // Younger bands: lowercase letters only; older bands add capitals and punctuation.
    ['K', '1'].forEach((band) => lib.TYPING_PRACTICE_PROBE_FORMS[band].forEach((f) => expect(f.text).toMatch(/^[a-z ]+$/)));
    ['2-3', '4-5', '6-8', '9-12'].forEach((band) => lib.TYPING_PRACTICE_PROBE_FORMS[band].forEach((f) => expect(f.text).toMatch(/[A-Z]/)));
  });

  it('rotates forms so the same form never comes twice in a row', () => {
    let last = null;
    const seen = [];
    for (let i = 0; i < 12; i += 1) {
      const form = lib.typingPracticeNextProbeForm('4-5', last);
      expect(form.id).not.toBe(last);
      expect(form.band).toBe('4-5');
      seen.push(form.id);
      last = form.id;
    }
    expect(new Set(seen).size).toBe(6);
    expect(lib.typingPracticeNextProbeForm('nope', null).band).toBe('2-3');
    expect(lib.typingPracticeProbeFormById('g68-c').band).toBe('6-8');
  });

  it('keeps the band of the first check unless a teacher picks one', () => {
    expect(lib.typingPracticeProbeBand({}, '6-8')).toBe('6-8');
    expect(lib.typingPracticeProbeBand({ probeBaseline: { band: '4-5' } }, '6-8')).toBe('4-5');
    expect(lib.typingPracticeProbeBand({ probeBand: '9-12', probeBaseline: { band: '4-5' } }, '6-8')).toBe('9-12');
    expect(lib.typingPracticeProbeBand({}, null)).toBe('2-3');
  });
});

describe('Net WPM', () => {
  it('subtracts uncorrected errors per minute and never goes below 0', () => {
    expect(lib.typingPracticeNetWpm(250, 0, 60000)).toEqual({ gross: 50, net: 50 });
    expect(lib.typingPracticeNetWpm(250, 5, 60000)).toEqual({ gross: 50, net: 45 });
    expect(lib.typingPracticeNetWpm(250, 10, 120000)).toEqual({ gross: 25, net: 20 });
    expect(lib.typingPracticeNetWpm(10, 30, 60000).net).toBe(0);
  });

  it('counts only wrong keys still in place at the end', () => {
    let marks = lib.typingPracticeTrackUncorrected({}, [
      { index: 0, correct: true, advanced: true },
      { index: 1, correct: false, advanced: true },
      { index: 2, correct: false, advanced: true }
    ]);
    expect(lib.typingPracticeCountUncorrected(marks, 3)).toBe(2);
    // Backspace to 2, then the right key: position 2 is fixed.
    marks = lib.typingPracticeTrackUncorrected(marks, [{ index: 2, correct: true, advanced: true }]);
    expect(lib.typingPracticeCountUncorrected(marks, 3)).toBe(1);
    // Correct as you go: a wrong key does not advance and is never left in.
    expect(lib.typingPracticeCountUncorrected(lib.typingPracticeTrackUncorrected({}, [{ index: 0, correct: false, advanced: false }]), 1)).toBe(0);
    // Backspaced positions past the typed length do not count.
    expect(lib.typingPracticeCountUncorrected({ 5: true }, 3)).toBe(0);
    expect(lib.typingPracticeUncorrectedFromEvents([{ index: 1 }, { index: 9 }], 4, true)).toEqual({ 1: true });
    expect(lib.typingPracticeUncorrectedFromEvents([{ index: 1 }], 4, false)).toEqual({});
  });

  it('stores net WPM on every session and a probe record on checks', () => {
    expect(source).toContain('var wpmPair = typingPracticeNetWpm(typedLength, uncorrectedErrors, activeMs);');
    expect(source).toContain('netWpm: wpmPair.net,');
    expect(source).toContain('summary.probe = { formId: probeFormRec.id, band: probeFormRec.band, durationSec: summary.durationSec };');
    expect(source).toContain('uncorrectedRef.current = typingPracticeTrackUncorrected(uncorrectedRef.current, result.steps);');
  });
});

describe('IEP goal status from benchmark checks only', () => {
  const goal = lib.typingPracticeNormalizeIepGoal({ measure: 'probe', netWpm: 20, accuracy: 90, criterion: '3 of 4 consecutive' });

  it('reads older goals as probe goals and keeps the new fields', () => {
    expect(lib.typingPracticeNormalizeIepGoal({ targetWpm: 15, targetAccuracy: 85, notes: 'n' })).toEqual({
      measure: 'probe', netWpm: 15, accuracy: 85, criterion: '3 of 4 consecutive', targetDate: null, notes: 'n'
    });
    expect(lib.typingPracticeNormalizeIepGoal({ netWpm: 30, criterion: 'median of last 3', targetDate: '2027-05-01' }))
      .toMatchObject({ netWpm: 30, criterion: 'median of last 3', targetDate: '2027-05-01' });
    expect(lib.typingPracticeNormalizeIepGoal({ netWpm: 30, criterion: 'whenever', targetDate: 'soon' }))
      .toMatchObject({ criterion: '3 of 4 consecutive', targetDate: null });
  });

  it('ignores practice sessions and pasted checks, even fast ones', () => {
    const sessions = [
      { date: '2026-09-01T10:00:00Z', drillId: 'home-row', wpm: 60, accuracy: 100 },
      probe(1, 25, 95, { measurementComparable: false }),
      probe(2, 25, 95, { probe: { formId: 'g23-b', band: '2-3', counted: false } }),
      probe(3, 10, 95)
    ];
    const probes = lib.typingPracticeProbeSessions(sessions, '2-3');
    expect(probes).toHaveLength(1);
    expect(lib.typingPracticeGoalStatus(probes, goal).status).toBe('not-enough');
    expect(lib.typingPracticeGoalStatus(lib.typingPracticeProbeSessions([sessions[0]], '2-3'), goal).status).toBe('no-probes');
    expect(lib.typingPracticeGoalStatus([], null).status).toBe('no-goal');
  });

  it('applies the 3 of 4 consecutive rule to the latest 4 checks', () => {
    const met3of4 = [probe(0, 25, 95), probe(7, 15, 95), probe(14, 22, 92), probe(21, 21, 90)];
    expect(lib.typingPracticeGoalStatus(met3of4, goal)).toMatchObject({ status: 'met', metCount: 3, windowSize: 4 });
    const accuracyShort = [probe(0, 25, 80), probe(7, 25, 85), probe(14, 25, 95), probe(21, 25, 95)];
    expect(lib.typingPracticeGoalStatus(accuracyShort, goal)).toMatchObject({ status: 'not-yet', metCount: 2 });
    const older = [probe(0, 25, 95), probe(7, 25, 95), probe(14, 25, 95), probe(21, 10, 95), probe(28, 10, 95)];
    expect(lib.typingPracticeGoalStatus(older, goal).status).toBe('not-yet');
    expect(lib.typingPracticeGoalStatus([probe(0, 25, 95), probe(7, 25, 95)], goal)).toMatchObject({ status: 'not-enough', needed: 1 });
  });

  it('applies the median of last 3 rule', () => {
    const medianGoal = Object.assign({}, goal, { criterion: 'median of last 3' });
    expect(lib.typingPracticeGoalStatus([probe(0, 5, 99), probe(7, 21, 91), probe(14, 30, 80), probe(21, 22, 95)], medianGoal))
      .toMatchObject({ status: 'met', medianNet: 22, medianAccuracy: 91 });
    expect(lib.typingPracticeGoalStatus([probe(0, 19, 99), probe(7, 30, 99), probe(14, 10, 99)], medianGoal).status).toBe('not-yet');
    expect(lib.typingPracticeGoalStatus([probe(0, 30, 99), probe(7, 30, 99)], medianGoal)).toMatchObject({ status: 'not-enough', needed: 1 });
  });

  it('decides goal-met at save time from checks only', () => {
    expect(source).toContain('if (summary.metricComparable && state.iepGoal && probeCounts) {');
    expect(source).not.toContain('var metNow = wpm >= state.iepGoal.targetWpm && accuracy >= state.iepGoal.targetAccuracy;');
  });
});

describe('Trend and aim line', () => {
  it('reports the least-squares slope in net WPM per week', () => {
    const trend = lib.typingPracticeTrend([probe(0, 10, 95), probe(7, 12, 95), probe(14, 14, 95)]);
    expect(trend.n).toBe(3);
    expect(trend.perWeek).toBe(2);
    const noisy = lib.typingPracticeTrend([probe(0, 10, 95), probe(7, 14, 95), probe(14, 12, 95), probe(21, 16, 95)]);
    expect(noisy.perWeek).toBe(1.6);
    expect(lib.typingPracticeTrend([probe(0, 10, 95)])).toBeNull();
    expect(lib.typingPracticeTrend([probe(0, 10, 95), probe(0, 12, 95)])).toBeNull();
  });

  it('draws the aim line from the baseline check to the goal on the target date', () => {
    const baseline = { date: '2026-09-01T12:00:00', netWpm: 10 };
    const aim = lib.typingPracticeAimLine(baseline, { netWpm: 20, targetDate: '2026-11-10' });
    expect(aim.startNet).toBe(10);
    expect(aim.endNet).toBe(20);
    expect(aim.perWeek).toBe(1);
    expect(lib.typingPracticeAimLine(baseline, { netWpm: 20, targetDate: null })).toBeNull();
    expect(lib.typingPracticeAimLine(baseline, { netWpm: 20, targetDate: '2026-08-01' })).toBeNull();
  });

  it('compares the trend with the aim line in plain words', () => {
    const probes = [probe(0, 10, 95), probe(7, 12, 95), probe(14, 14, 95)];
    const baseline = { date: probes[0].date, netWpm: 10, accuracy: 95 };
    const trend = lib.typingPracticeTrend(probes);
    expect(lib.typingPracticeTrendVsAim(trend, { slope: 1 })).toBe('on-track');
    expect(lib.typingPracticeTrendVsAim(trend, { slope: 3 })).toBe('below');
    expect(lib.typingPracticeTrendVsAim(lib.typingPracticeTrend(probes.slice(0, 2)), { slope: 1 })).toBe('not-enough');
    const text = lib.typingPracticeProbeSummaryText(probes, baseline, { netWpm: 30, targetDate: '2026-12-01' });
    expect(text).toContain('3 benchmark checks');
    expect(text).toContain('Trend: +2 net WPM per week.');
    expect(text).toContain('Aim line:');
  });
});

describe('Placement check', () => {
  const pass = (wpm) => ({ wpm, accuracy: 96, comparable: true });

  it('never places a student higher than their accuracy supports', () => {
    expect(lib.typingPracticePlacementLevel([{ wpm: 80, accuracy: 85, comparable: true }])).toBe(0);
    expect(lib.typingPracticePlacementLevel([pass(30), pass(30), { wpm: 60, accuracy: 89, comparable: true }, pass(30)])).toBe(2);
    expect(lib.typingPracticePlacementLevel([pass(30), pass(30), pass(30), pass(30)])).toBe(4);
    expect(lib.typingPracticePlacementLevel([pass(30), { wpm: 30, accuracy: 99, comparable: false }])).toBe(1);
    expect(lib.typingPracticePlacementLevel([pass(5)])).toBe(0);
    expect(lib.TYPING_PRACTICE_PLACEMENT_STEPS).toHaveLength(4);
  });

  it('never lowers existing progress', () => {
    const kept = lib.typingPracticeApplyPlacement(5, [pass(30), pass(30)], '2026-09-01T00:00:00Z');
    expect(kept).toMatchObject({ masteryLevel: 5, raised: false });
    expect(kept.placement).toMatchObject({ placedLevel: 2, previousLevel: 5, appliedLevel: 5 });
    const raised = lib.typingPracticeApplyPlacement(0, [pass(30), pass(30), pass(30)], '2026-09-01T00:00:00Z');
    expect(raised).toMatchObject({ masteryLevel: 3, raised: true });
    expect(raised.placement.results.map((r) => r.passed)).toEqual([true, true, true]);
  });

  it('runs outside practice sessions and only raises the tier', () => {
    expect(source).toContain('if (activeDrill && activeDrill.isPlacement) {');
    expect(source).toContain('if (plApplied.raised) { plUpdates.masteryLevel = plApplied.masteryLevel;');
  });
});

describe('Teacher unlock', () => {
  it('works only with the teacher flag, only upward, and records the teacher', () => {
    expect(lib.typingPracticeTeacherUnlock({ masteryLevel: 1 }, 4, false)).toBeNull();
    expect(lib.typingPracticeTeacherUnlock({ masteryLevel: 4 }, 2, true)).toBeNull();
    const plan = lib.typingPracticeTeacherUnlock({ masteryLevel: 1, teacherUnlocks: [] }, 4, true, '2026-09-01T00:00:00Z');
    expect(plan).toEqual({ masteryLevel: 4, teacherUnlocks: [{ date: '2026-09-01T00:00:00Z', fromLevel: 1, toLevel: 4, by: 'teacher' }] });
    expect(lib.typingPracticeTeacherUnlock({ masteryLevel: 0 }, 99, true).masteryLevel).toBe(7);
  });

  it('is gated on ctx.isTeacherMode in the UI and shown in the report', () => {
    expect(source).toContain('teacher && unlockOptions.length ? h(');
    expect(source).toContain("var teacher = !!ctx.isTeacherMode;");
    expect(source).toContain('typingPracticeTeacherUnlock(state, chosen, !!ctx.isTeacherMode, new Date().toISOString())');
    expect(source).toContain("(unlocked by a teacher, not earned in drills)");
  });
});

describe('Lesson Path personal bests', () => {
  it('keeps one best per lesson and ignores unknown lessons and assisted runs', () => {
    let plan = lib.typingPracticeUpdateLessonBest({}, 'lesson-fj', { wpm: 12, accuracy: 90, date: 'a' }, true);
    expect(plan).toMatchObject({ changed: true, isNewBest: false });
    plan = lib.typingPracticeUpdateLessonBest(plan.bests, 'lesson-dk', { wpm: 30, accuracy: 99, date: 'b' }, true);
    plan = lib.typingPracticeUpdateLessonBest(plan.bests, 'lesson-fj', { wpm: 14, accuracy: 88, date: 'c' }, true);
    expect(plan).toMatchObject({ changed: true, isNewBest: true });
    expect(plan.bests).toEqual({ 'lesson-fj': { wpm: 14, accuracy: 88, date: 'c' }, 'lesson-dk': { wpm: 30, accuracy: 99, date: 'b' } });
    expect(lib.typingPracticeUpdateLessonBest(plan.bests, 'lesson-fj', { wpm: 50, accuracy: 99, date: 'd' }, false).changed).toBe(false);
    expect(lib.typingPracticeUpdateLessonBest(plan.bests, 'lesson-zz', { wpm: 50, accuracy: 99, date: 'd' }, true).changed).toBe(false);
    expect(lib.typingPracticeNormalizeLessonBests({ 'lesson-fj': { wpm: '9', accuracy: 200 }, bogus: { wpm: 1 } })).toEqual({ 'lesson-fj': { wpm: 9, accuracy: 100, date: '' } });
  });

  it('no longer writes the mixed lesson record at save time, and discard rebuilds the lesson best', () => {
    expect(source).toContain('var lessonBestPlan = typingPracticeUpdateLessonBest(state.lessonBests, summary.lessonId,');
    const discard = Function(
      'typingPracticeComparableSessions', 'typingPracticeEvaluateMastery', 'typingPracticeProbeBaseline',
      'typingPracticeNormalizeLessonBests', 'typingPracticeUpdateLessonBest',
      'return (' + extractFunction('typingPracticeDiscardSessionUpdates') + ')'
    )((s) => s.filter(Boolean), () => ({ mastered: false }), lib.typingPracticeProbeBaseline, lib.typingPracticeNormalizeLessonBests, lib.typingPracticeUpdateLessonBest);
    const older = { date: '2026-09-01T00:00:00Z', drillId: 'lesson', lessonId: 'lesson-fj', wpm: 10, accuracy: 90 };
    const latest = { date: '2026-09-02T00:00:00Z', drillId: 'lesson', lessonId: 'lesson-fj', wpm: 20, accuracy: 95 };
    const updates = discard({ sessions: [older, latest], lessonBests: { 'lesson-fj': { wpm: 20, accuracy: 95, date: latest.date } } }, latest);
    expect(updates.lessonBests).toEqual({ 'lesson-fj': { wpm: 10, accuracy: 90, date: older.date } });
  });
});

describe('Baseline is the first benchmark check', () => {
  it('uses the first counted check, falling back to nothing (old baseline stays separate)', () => {
    const sessions = [{ date: '2026-08-01T00:00:00Z', drillId: 'home-row', wpm: 9, accuracy: 80 }, probe(3, 14, 92), probe(10, 16, 93)];
    expect(lib.typingPracticeProbeBaseline({ sessions }, '2-3')).toMatchObject({ netWpm: 14, accuracy: 92, band: '2-3' });
    expect(lib.typingPracticeProbeBaseline({ sessions: [sessions[0]], baseline: { wpm: 9 } }, '2-3')).toBeNull();
    expect(source).toContain("'First practice session (not a benchmark): {wpm} WPM at {acc}% on {date}.'");
    expect(source).toContain("lines.push('FIRST PRACTICE SESSION (not a benchmark)');");
    expect(source).toContain("lines.push('CURRENT PERFORMANCE (benchmark checks, band ' + probeBand + ')');");
  });

  it('compares the summary chip with the first check, never with practice', () => {
    expect(source).toContain("if (!s.probe || s.probe.counted === false || s.isProbeBaseline) return null;");
    expect(source).not.toContain('var wpmDelta = s.wpm - state.baseline.wpm;');
  });
});

describe('Benchmark check mode', () => {
  it('forces the assessment display, offers no warmup and no retry of the same form', () => {
    expect(source).toContain('var assessmentDisplay = !!(state.accommodations.assessmentMode || (activeDrill && activeDrill.isProbe));');
    expect(source).not.toMatch(/if \(state\.accommodations\.assessmentMode\) return null;/);
    expect(source).toContain("isCheckIn ? null : h('label', {");
    expect(source).toContain("s.probe ? h('button', {");
    expect(source).toContain("(s.drillId !== 'passage' && !s.probe) ? h('button', {");
    expect(source).toContain('var form = typingPracticeNextProbeForm(typingPracticeProbeBand(state, hostGradeBand), state.probeLastFormId);');
    expect(source).toContain("'Type the whole passage once. There is no time limit, so go at a steady pace that feels comfortable.'");
  });
});

describe('Progress chart and printed report', () => {
  const state = {
    studentName: 'J.D.',
    sessions: [probe(0, 10, 92), probe(7, 13, 94), probe(14, 15, 95)],
    iepGoal: { measure: 'probe', netWpm: 25, accuracy: 90, criterion: '3 of 4 consecutive', targetDate: '2027-01-15' },
    probeBaseline: null
  };

  it('renders an SVG with a text alternative through either element factory', () => {
    const model = lib.typingPracticeProbeChartModel(state.sessions, lib.typingPracticeProbeBaseline(state, '2-3'), lib.typingPracticeNormalizeIepGoal(state.iepGoal));
    expect(model.points).toHaveLength(3);
    expect(model.trend).not.toBeNull();
    expect(model.aim).not.toBeNull();
    const svg = lib.typingPracticeRenderProbeChart(lib.typingPracticeSvgString, model, { titleId: 't1', descId: 'd1', desc: 'Summary sentence.' }).__html;
    expect(svg).toMatch(/^<svg [^>]*role="img"/);
    expect(svg).toContain('aria-labelledby="t1 d1"');
    expect(svg).toContain('<title id="t1">');
    expect(svg).toContain('<desc id="d1">Summary sentence.</desc>');
    expect(svg).toContain('stroke-dasharray="8 5"');
    expect(svg).not.toMatch(/font-size="(?:[0-9]|1[01])"/);
  });

  it('prints semantic HTML with headings, a table, the chart and a plain-language summary', () => {
    const html = lib.typingPracticeBuildReportHtml(state, null, 'PRACTICE SESSIONS\n  Average WPM: 12');
    expect(html).toContain('<h1>');
    expect(html).toContain('<h2 id="tp-r-summary">Summary</h2>');
    expect(html).toMatch(/<table><caption>Benchmark checks, oldest first<\/caption><thead><tr><th scope="col">Date<\/th>/);
    expect(html).toContain('<svg ');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-labelledby="tp-r-chart-title tp-r-chart-desc"');
    expect(html).toContain('Trend: +2.5 net WPM per week.');
    expect(html).toContain('<th scope="row">');
    expect(html).toContain('dyslexia font');
    expect(html).not.toContain('assessment mode');
    expect(html).toContain('<h3>PRACTICE SESSIONS</h3>');
    expect(html).not.toContain('<pre>');
    expect(html).toContain('<dt>Status</dt><dd>Not yet met</dd>');
  });

  it('wires print to the HTML report and keeps the text export', () => {
    expect(source).toContain("var report = { text: reportText, html: typingPracticeBuildReportHtml(state, filterOpts, reportText) };");
    expect(source).toContain("printIEPReport(report, state.studentName || '', addToast)");
    const print = extractFunction('printIEPReport');
    expect(print).not.toContain('<pre>');
    expect(source).toContain('value: buildIEPReport(state, filterOpts),');
    expect(lib.typingPracticeReportTextToHtml('HEADING\n  - item <b>\nplain')).toBe('<h3>HEADING</h3>\n<ul>\n<li>item &lt;b&gt;</li>\n</ul>\n<p>plain</p>');
  });

  it('shows the probe table and chart text alternative in Progress', () => {
    expect(source).toContain("typingPracticeRenderProbeChart(h, typingPracticeProbeChartModel(probes, baseline, goal), {");
    expect(source).toContain("'aria-labelledby': 'tp-probe-table-caption'");
    expect(source).toContain('renderProbeProgress(),');
  });
});

describe('Saves and backups', () => {
  it('declares defaults for every new field', () => {
    const defaults = source.slice(source.indexOf('var DEFAULT_STATE = {'), source.indexOf('var MAX_CUSTOM_LIBRARY'));
    ['probeBaseline: null', 'probeBand: null', 'probeLastFormId: null', 'activeProbe: null', 'placement: null', 'placementRun: null', 'teacherUnlocks: []', 'lessonBests: {}']
      .forEach((field) => expect(defaults).toContain(field));
  });

  it('accepts the new fields in a backup and rejects malformed ones', () => {
    const validate = Function(
      'KEYBOARD_LAYOUTS', 'DRILLS', 'MAX_PASSAGE_LIBRARY', 'MAX_CUSTOM_LIBRARY', 'TYPING_PRACTICE_PROBE_BANDS',
      'return (' + extractFunction('typingPracticeValidateBackupState') + ')'
    )({ 'qwerty-us': {} }, { benchmark: {} }, 12, 5, lib.TYPING_PRACTICE_PROBE_BANDS);
    expect(() => validate({ lessonBests: {}, teacherUnlocks: [{ date: 'x', toLevel: 2 }], probeBaseline: null, placement: { placedLevel: 1 }, probeBand: '4-5' })).not.toThrow();
    expect(() => validate({ teacherUnlocks: 'all' })).toThrow('Teacher unlocks must be a short list.');
    expect(() => validate({ probeBand: 'college' })).toThrow('Unknown benchmark band.');
    expect(() => validate({ probeBaseline: [] })).toThrow('probeBaseline must be an object or null.');
    expect(() => validate({ lessonBests: [] })).toThrow('lessonBests must be an object.');
  });

  it('imports benchmark goal fields from a profile without changing older goals', () => {
    const bounded = Function('return (' + extractFunction('typingPracticeBoundedNumber') + ')')();
    const importGoal = Function('typingPracticeBoundedNumber', 'return (' + extractFunction('typingPracticeImportedIepGoal') + ')')(bounded);
    expect(importGoal({ targetWpm: 25, targetAccuracy: 90 })).toEqual({ targetWpm: 25, targetAccuracy: 90 });
    expect(importGoal({ measure: 'probe', netWpm: 20, accuracy: 92, criterion: 'median of last 3', targetDate: '2027-03-01' }))
      .toEqual({ measure: 'probe', netWpm: 20, accuracy: 92, criterion: 'median of last 3', targetDate: '2027-03-01' });
    expect(() => importGoal({ criterion: 'sometimes' })).toThrow('Imported goal rule is not recognized.');
  });

  it('keeps XP behaviour: checks are ordinary sessions for the practice grant', () => {
    const xp = Function('return (' + extractFunction('typingPracticeSessionXpGrants') + ')')();
    const grants = xp({ drillId: 'benchmark', drillName: 'Benchmark check', measurementComparable: true, probe: { formId: 'g23-a' }, accommodationsUsed: [] }, {}, {}, {}, false);
    expect(grants.grants.map((g) => g.id)).toEqual(['typingPractice_practice']);
  });
});
