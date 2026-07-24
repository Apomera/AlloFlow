// Logic-characterization tests for allohaven_module.js — the progress / skill /
// streak / spaced-repetition aggregators that feed the AlloHaven clinical/IEP recap
// packet (computeTenureStats) and the memory-garden review surface.
//
// WHY (pilot-facing): AlloHaven is the 27.6k-line SEL/wellbeing module with no prior
// coverage; computeTenureStats is summarized into a printable IEP-adjacent packet, and
// the skill-level / streak / card-mastery / due-date math drives what students see.
// These are pure functions — pinned here against fixtures (Date frozen for the
// time-dependent ones). Exposed via a read-only seam (AlloHavenInternals).

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let M;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('allohaven_module.js');
  M = window.AlloModules.AlloHavenInternals;
  if (!M || !M.computeTenureStats) throw new Error('AlloHavenInternals seam not present');
});

describe('computeSkillLevel — thresholds [0,3,8,15,25,40,60,90,130,180]', () => {
  it('count 0 → level 0, next threshold 3, 0%', () => {
    expect(M.computeSkillLevel(0)).toMatchObject({ level: 0, current: 0, nextThreshold: 3, pct: 0, atMax: false });
  });
  it('count at a threshold → that level, 0% into it', () => {
    expect(M.computeSkillLevel(3)).toMatchObject({ level: 1, nextThreshold: 8, pct: 0 });
  });
  it('partway between thresholds → correct pct toward next', () => {
    expect(M.computeSkillLevel(5)).toMatchObject({ level: 1, pct: 40 });  // (5-3)/(8-3)=40%
    expect(M.computeSkillLevel(7)).toMatchObject({ level: 1, pct: 80 });
  });
  it('at/above the top threshold → max level, 100%, null next', () => {
    expect(M.computeSkillLevel(180)).toMatchObject({ level: 9, atMax: true, pct: 100, nextThreshold: null });
    expect(M.computeSkillLevel(250)).toMatchObject({ level: 9, atMax: true });
  });
});

describe('cardMasteryBucket — spaced-repetition mastery', () => {
  it('unseen (no attempts) → gray', () => {
    expect(M.cardMasteryBucket({ correctCount: 0, missCount: 0 }).id).toBe('gray');
  });
  it('>=3 attempts, <40% correct → red (needs work)', () => {
    expect(M.cardMasteryBucket({ correctCount: 1, missCount: 5 }).id).toBe('red');
  });
  it('>=3 attempts, >=80% correct → green (mastered)', () => {
    expect(M.cardMasteryBucket({ correctCount: 8, missCount: 1 }).id).toBe('green');
  });
  it('few attempts or middling accuracy → yellow (wobbly)', () => {
    expect(M.cardMasteryBucket({ correctCount: 1, missCount: 1 }).id).toBe('yellow'); // <3 total
    expect(M.cardMasteryBucket({ correctCount: 2, missCount: 1 }).id).toBe('yellow'); // 67%
  });
});

describe('computeStreak / computeTenureStats / daysUntilDue (Date frozen)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('computeStreak: empty → 0/0; longest counts consecutive days regardless of today', () => {
    vi.setSystemTime(new Date('2026-03-01T12:00:00Z'));
    expect(M.computeStreak([])).toEqual({ current: 0, longest: 0 });
    expect(M.computeStreak(['2026-02-01', '2026-02-02', '2026-02-03', '2026-02-05'])).toMatchObject({ current: 0, longest: 3 });
    expect(M.computeStreak(['2026-02-01', '2026-02-01', '2026-02-02'])).toMatchObject({ longest: 2 }); // dedup
  });
  it('computeStreak: current counts back from today', () => {
    vi.setSystemTime(new Date('2026-02-03T12:00:00Z'));
    expect(M.computeStreak(['2026-02-01', '2026-02-02', '2026-02-03'])).toEqual({ current: 3, longest: 3 });
  });

  it('computeTenureStats: empty save → null', () => {
    vi.setSystemTime(new Date('2026-02-11T00:00:00Z'));
    expect(M.computeTenureStats({})).toBeNull();
  });
  it('computeTenureStats: aggregates tokens / decorations / moods / words', () => {
    vi.setSystemTime(new Date('2026-02-11T00:00:00Z'));
    const state = {
      earnings: [{ date: '2026-02-01', tokens: 10 }, { date: '2026-02-02', tokens: 5 }, { date: '2026-02-03', tokens: -3 }],
      decorations: [
        { earnedAt: '2026-02-01', isStarter: true },
        { earnedAt: '2026-02-02', isCustomUpload: true, isFavorite: true, studentReflection: 'nice', mood: 'happy', subjects: ['math'] },
        { earnedAt: '2026-02-03', mood: 'happy', subjects: ['math', 'reading'] },
      ],
      journalEntries: [{ date: '2026-02-01', text: 'hello world today' }],
      visits: ['2026-02-01', '2026-02-02'],
      stories: [], goals: [], achievements: {},
    };
    const r = M.computeTenureStats(state);
    expect(r).toMatchObject({
      tokensEarned: 15, tokensSpent: 3,
      decorationCount: 2, customCount: 1, favoriteCount: 1, withReflection: 1,
      totalWords: 3, journalCount: 1, storyCount: 0, goalsDone: 0,
      streakLongest: 2, daysSince: 10,
    });
    expect(r.topMoods[0]).toMatchObject({ id: 'happy', count: 2 });
    expect(r.topSubjects[0]).toMatchObject({ id: 'math', count: 2 });
    expect(Array.isArray(r.skills)).toBe(true);
  });

  it('daysUntilDue: no linkedContent / no review → null; else thresholds by best score', () => {
    const now = new Date('2026-02-20T00:00:00Z').getTime();
    vi.setSystemTime(now);
    const day = 24 * 60 * 60 * 1000;
    expect(M.daysUntilDue({})).toBeNull();
    expect(M.daysUntilDue({ linkedContent: { type: 'quiz' } })).toBeNull(); // no lastReviewedAt
    // score < 60 → 2-day cycle; reviewed 1 day ago → 1 day left
    expect(M.daysUntilDue({ linkedContent: { type: 'quiz', lastReviewedAt: new Date(now - day).toISOString(), bestQuizScore: 50 } })).toBe(1);
    // score >= 90 → 10-day cycle; reviewed 1 day ago → 9 days left
    expect(M.daysUntilDue({ linkedContent: { type: 'quiz', lastReviewedAt: new Date(now - day).toISOString(), bestQuizScore: 95 } })).toBe(9);
    // overdue → 0
    expect(M.daysUntilDue({ linkedContent: { type: 'quiz', lastReviewedAt: new Date(now - 5 * day).toISOString(), bestQuizScore: 50 } })).toBe(0);
  });
});
