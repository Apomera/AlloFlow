import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Adaptive practice for Typing Practice (SECTION 2d): per-key stats that are
// rate-based and decay, a Leitner review schedule, the mistake classifier,
// Focused Practice built from real words, and the rate-based recommendation.
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_typingpractice.js'), 'utf8');

function loadLessonCore() {
  const kbStart = source.indexOf('  var KB_LAYOUT = [');
  const kb = source.slice(kbStart, source.indexOf('];', kbStart) + 2);
  const start = source.indexOf('  // SECTION 2d: LESSON PATH');
  const end = source.indexOf('  // SECTION 2c: AUDIO CUES');
  if (kbStart < 0 || start < 0 || end < start) throw new Error('Lesson section not found');
  const body = source.slice(start, end);
  const names = [...body.matchAll(/^  (?:function|var) ([A-Za-z_][A-Za-z0-9_]*)/gm)].map((m) => m[1]);
  return Function(
    '__alloTPT',
    kb + '\n' + body + '\nreturn { ' + names.map((n) => n + ': ' + n).join(', ') + ' };'
  )((key, fallback) => fallback);
}

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

const core = loadLessonCore();
const DAY = core.TYPING_PRACTICE_DAY_MS;
const T0 = Date.UTC(2026, 0, 5, 15, 0, 0);
const LESSONS = core.TYPING_PRACTICE_LESSONS;
const ALL_LETTERS = core.typingPracticeLessonById('lesson-all-letters').allowedKeys;

function session(text, errorIndexes, now, actual = () => 'x') {
  return {
    text,
    typedLength: text.length,
    now,
    mistakes: errorIndexes.map((index) => ({ index, expected: text[index], actual: actual(text[index]) }))
  };
}

function weakQzStats() {
  let stats = null;
  for (let i = 0; i < 3; i += 1) {
    stats = core.typingPracticeUpdateKeyStats(stats, session('q z q z q z q z q z e t a o', [0, 2, 4, 6, 8, 1, 3], T0 + i * 1000));
  }
  return stats;
}

describe('Typing Practice per-key stats', () => {
  it('normalises errors by attempts, so a common key is not always the weakest', () => {
    let stats = core.typingPracticeUpdateKeyStats(null, session('e '.repeat(100).trim(), [0, 20, 40, 60, 80], T0));
    stats = core.typingPracticeUpdateKeyStats(stats, session('z '.repeat(15).trim(), [0, 4, 8, 12, 16], T0));
    expect(stats.keys.e.attempts).toBe(100);
    expect(stats.keys.z.attempts).toBe(15);
    expect(stats.keys.z.ewmaErrRate).toBeGreaterThan(stats.keys.e.ewmaErrRate * 3);
    const ranked = core.typingPracticeWeakKeys(stats, T0, ['e', 'z']);
    expect(ranked[0].key).toBe('z');
    expect(ranked.some((w) => w.key === 'e' && w.reason === 'error-rate')).toBe(false);
  });

  it('decays: clean sessions bring an old weakness back down', () => {
    let stats = core.typingPracticeUpdateKeyStats(null, session('z '.repeat(15).trim(), [0, 4, 8, 12, 16], T0));
    for (let d = 1; d <= 6; d += 1) stats = core.typingPracticeUpdateKeyStats(stats, session('z '.repeat(15).trim(), [], T0 + d * DAY));
    expect(stats.keys.z.ewmaErrRate).toBeLessThan(0.08);
    expect(core.typingPracticeWeakKeys(stats, T0 + 6 * DAY, ['z']).some((w) => w.reason === 'error-rate')).toBe(false);
  });

  it('keeps capitals apart from lowercase and counts Shift mistakes', () => {
    const stats = core.typingPracticeUpdateKeyStats(null, session('Aa Aa Aa', [0, 3], T0, () => 'a'));
    expect(stats.keys.A.errors).toBe(2);
    expect(stats.keys.a.errors).toBe(0);
    expect(stats.kinds.shift).toBe(2);
    expect(stats.bigrams.Aa.attempts).toBe(3);
  });

  it('schedules reviews after 1, 3 and 7 days and never skips ahead on the same day', () => {
    const text = 'f '.repeat(20).trim();
    let stats = core.typingPracticeUpdateKeyStats(null, session(text, [], T0));
    expect(stats.keys.f).toMatchObject({ box: 1, nextReviewAt: T0 + DAY });
    stats = core.typingPracticeUpdateKeyStats(stats, session(text, [], T0 + 3600e3));
    expect(stats.keys.f).toMatchObject({ box: 1, nextReviewAt: T0 + DAY });
    expect(core.typingPracticeWeakKeys(stats, T0 + DAY / 2, ['f'])).toEqual([]);
    expect(core.typingPracticeWeakKeys(stats, T0 + DAY + 1, ['f'])[0]).toMatchObject({ key: 'f', reason: 'review' });
    stats = core.typingPracticeUpdateKeyStats(stats, session(text, [], T0 + DAY + 10));
    expect(stats.keys.f).toMatchObject({ box: 2, nextReviewAt: T0 + DAY + 10 + 3 * DAY });
    stats = core.typingPracticeUpdateKeyStats(stats, session(text, [], T0 + 5 * DAY));
    expect(stats.keys.f).toMatchObject({ box: 3, nextReviewAt: T0 + 12 * DAY });
    stats = core.typingPracticeUpdateKeyStats(stats, session(text, [0, 2, 4, 6, 8, 10], T0 + 13 * DAY));
    expect(stats.keys.f).toMatchObject({ box: 2, nextReviewAt: T0 + 16 * DAY });
  });

  it('repairs hostile or missing saved stats', () => {
    const repaired = core.typingPracticeNormalizeKeyStats({
      keys: { a: { attempts: -5, errors: 99, ewmaErrRate: 7, box: 9 }, toolong: {} },
      bigrams: 'no',
      kinds: { shift: 'NaN', neighbor: 2 }
    });
    expect(repaired.keys).toEqual({ a: { attempts: 0, errors: 0, ewmaErrRate: 1, lastSeen: 0, box: 3, nextReviewAt: 0 } });
    expect(repaired.kinds).toEqual({ neighbor: 2 });
    expect(core.typingPracticeNormalizeKeyStats(null)).toEqual({ v: 1, sessions: 0, updatedAt: 0, keys: {}, bigrams: {}, kinds: {} });
    expect(Object.keys(core.typingPracticeNormalizeKeyStats(JSON.parse('{"keys":{"__proto__":{"attempts":3}}}')).keys)).toEqual([]);
  });
});

describe('Typing Practice mistake classifier', () => {
  it('names the kind of slip from key positions and fingers', () => {
    const cases = [
      ['f', 'd', 'neighbor'], ['g', 'h', 'neighbor'], ['e', 'r', 'neighbor'],
      ['f', 'r', 'same-finger'], ['f', 'v', 'same-finger'], ['k', 'i', 'same-finger'],
      ['f', 'j', 'wrong-hand'], ['q', 'p', 'wrong-hand'],
      ['A', 'a', 'shift'], ['!', '1', 'shift'], ['?', '/', 'shift'],
      ['e', 'x', 'other'], [' ', 'a', 'other'], ['é', 'e', 'other']
    ];
    cases.forEach(([expected, typed, kind]) => {
      expect([expected, typed, core.typingPracticeClassifyMistake(expected, typed)]).toEqual([expected, typed, kind]);
    });
  });
});

describe('Typing Practice Focused Practice', () => {
  it('targets the weak keys with real words and stays inside the unlocked keys', () => {
    const stats = weakQzStats();
    const plan = core.typingPracticeBuildAdaptivePractice(stats, ALL_LETTERS, 3, 'medium', T0 + 5000);
    expect(plan.reason).toBe('weak-keys');
    expect(plan.focusKeys).toEqual(expect.arrayContaining(['q', 'z']));
    let tokens = 0;
    let hits = 0;
    for (let seed = 0; seed < 30; seed += 1) {
      const text = core.typingPracticeBuildAdaptivePractice(stats, ALL_LETTERS, seed, 'medium', T0 + 5000).text;
      expect(core.typingPracticeCheckTextKeys(text, ALL_LETTERS).ok).toBe(true);
      expect(text).not.toMatch(/(.)\1\1/);
      text.split(' ').forEach((t) => { tokens += 1; if (/[qz]/.test(t)) hits += 1; });
    }
    expect(hits / tokens).toBeGreaterThanOrEqual(0.45);
  });

  it('never uses a locked key, and falls back to review or general practice', () => {
    const homeRow = LESSONS[3].allowedKeys;
    const text = core.typingPracticeBuildAdaptivePractice(weakQzStats(), homeRow, 1, 'long', T0 + 5000).text;
    expect(core.typingPracticeCheckTextKeys(text, homeRow).ok).toBe(true);
    expect(core.typingPracticeBuildAdaptivePractice(null, ALL_LETTERS, 1, 'short').reason).toBe('general');
    const learned = core.typingPracticeUpdateKeyStats(null, session('f j '.repeat(10).trim(), [], T0));
    expect(core.typingPracticeBuildAdaptivePractice(learned, ['f', 'j'], 1, 'short', T0 + 2 * DAY).reason).toBe('review');
  });
});

describe('Typing Practice next-step recommendation', () => {
  const next = core.typingPracticeNextLesson(0, []);

  it('continues the path when there is no key data', () => {
    expect(core.typingPracticeRecommendNext({ keyStats: null, now: T0, unlockedKeys: ALL_LETTERS, nextLesson: next }))
      .toMatchObject({ kind: 'continue', lessonId: 'lesson-fj' });
  });

  it('suggests Focused Practice only for recent, significant weak keys', () => {
    const stats = weakQzStats();
    expect(core.typingPracticeRecommendNext({ keyStats: stats, now: T0 + 5000, unlockedKeys: ALL_LETTERS, nextLesson: next }).kind).toBe('focus');
    expect(core.typingPracticeRecommendNext({ keyStats: stats, now: T0 + 30 * DAY, unlockedKeys: ALL_LETTERS, nextLesson: next }).kind).not.toBe('focus');
  });

  it('does not let a few lifetime slips at low rates take over', () => {
    let stats = null;
    for (let d = 0; d < 4; d += 1) stats = core.typingPracticeUpdateKeyStats(stats, session('asdf jkl; '.repeat(10).trim(), [0, 51], T0 + d * DAY));
    const rec = core.typingPracticeRecommendNext({
      keyStats: stats, now: T0 + 4 * DAY, unlockedKeys: LESSONS[3].allowedKeys, nextLesson: core.typingPracticeNextLesson(0, ['lesson-fj'])
    });
    expect(rec.kind).toBe('continue');
  });

  it('reviews when a returning student has several keys well overdue, else keeps to the path', () => {
    const stats = core.typingPracticeUpdateKeyStats(null, session('asdf '.repeat(10).trim(), [], T0));
    expect(core.typingPracticeRecommendNext({ keyStats: stats, now: T0 + 2 * DAY, unlockedKeys: LESSONS[3].allowedKeys, nextLesson: next }).kind).toBe('continue');
    const away = core.typingPracticeRecommendNext({ keyStats: stats, now: T0 + 6 * DAY, unlockedKeys: LESSONS[3].allowedKeys, nextLesson: next });
    expect(away.kind).toBe('review');
    expect(away.focusKeys.length).toBeGreaterThanOrEqual(3);
    expect(core.typingPracticeRecommendNext({ keyStats: stats, now: T0 + 2 * DAY, unlockedKeys: LESSONS[3].allowedKeys, nextLesson: null }).kind).toBe('review');
    expect(core.typingPracticeRecommendNext({ keyStats: null, now: T0, unlockedKeys: ALL_LETTERS, nextLesson: null }).kind).toBe('none');
  });

  it('wires the rate-based rule into the menu coach pick instead of lifetime totals', () => {
    const rec = extractFunction('computePracticeRecommendation');
    expect(rec).toContain('typingPracticeRecommendNext(');
    expect(rec).not.toContain('aggregateErrors[k] >= 2');
    expect(rec).toContain("drillId: 'lesson'");
  });
});

describe('Typing Practice lesson data in saves', () => {
  it('discarding the latest session restores keyStats and removes its lesson record', () => {
    const discard = Function(
      'typingPracticeComparableSessions',
      'typingPracticeEvaluateMastery',
      'return (' + extractFunction('typingPracticeDiscardSessionUpdates') + ')'
    )((s) => s, () => ({ mastered: false }));
    const before = { v: 1, sessions: 1, updatedAt: 1, keys: { f: { attempts: 3, errors: 0, ewmaErrRate: 0, lastSeen: 1, box: 1, nextReviewAt: 2 } }, bigrams: {}, kinds: {} };
    const discarded = { date: '2026-07-01T10:00:00.000Z', drillId: 'lesson', lessonId: 'lesson-fj', charCount: 10, errors: 0 };
    const updates = discard({
      sessions: [discarded],
      lifetime: { totalSessions: 1, totalCharsTyped: 10, totalErrorsLogged: 0 },
      keyStats: { v: 1, sessions: 2, keys: {} },
      keyStatsUndo: { date: discarded.date, stats: before },
      lessonsDone: { 'lesson-fj': { date: discarded.date, accuracy: 95 }, 'lesson-dk': { date: 'earlier', accuracy: 90 } }
    }, discarded);
    expect(updates.keyStats).toEqual(before);
    expect(updates.keyStatsUndo).toBeNull();
    expect(updates.lessonsDone).toEqual({ 'lesson-dk': { date: 'earlier', accuracy: 90 } });
  });

  it('backup validation accepts the new fields and rejects malformed ones', () => {
    const validate = Function(
      'KEYBOARD_LAYOUTS', 'MAX_PASSAGE_LIBRARY', 'MAX_CUSTOM_LIBRARY',
      'return (' + extractFunction('typingPracticeValidateBackupState') + ')'
    )({ 'qwerty-us': {} }, 12, 5);
    expect(() => validate({ keyStats: null, lessonsDone: {} })).not.toThrow();
    expect(() => validate({ keyStats: { keys: {} }, lessonsDone: { 'lesson-fj': { date: 'd' } } })).not.toThrow();
    expect(() => validate({ keyStats: [] })).toThrow('keyStats must be an object or null.');
    expect(() => validate({ lessonsDone: [] })).toThrow('lessonsDone must be an object.');
  });

  it('normalises older saves on load and repairs restored lesson fields', () => {
    expect(source).toContain('state.keyStats = typingPracticeNormalizeKeyStats(rawState.keyStats);');
    expect(source).toContain('state.lessonsDone = typingPracticeNormalizeLessonsDone(rawState.lessonsDone);');
    expect(source).toContain('restoredState.lessonsDone = typingPracticeNormalizeLessonsDone(restoredState.lessonsDone);');
  });
});
