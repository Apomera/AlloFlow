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
  if (!M || !M.getAlloHavenDailyPlan || !M.spendAlloHavenTokens) {
    throw new Error('AlloHavenInternals seam missing daily/economy helpers');
  }
});

function baseState(overrides = {}) {
  return Object.assign({
    tokens: 0,
    earnings: [],
    decorations: [],
    rooms: [{ id: 'main', label: 'Room', wallSlots: 2, floorSlots: 2, unlocked: true }],
    activeRoomId: 'main',
    dailyState: {
      date: '2026-04-10',
      pomodorosCompleted: 0,
      reflectionsSubmitted: 0,
      quizTokensEarnedToday: 0,
      storyWalkTokensEarnedToday: 0,
    },
    goals: [],
    pomodoroState: { active: false },
  }, overrides);
}

describe('AlloHaven daily flow planner', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('prioritizes due memory review before a fresh focus sprint', () => {
    vi.setSystemTime(new Date(2026, 3, 10, 9, 0, 0));
    const state = baseState({
      decorations: [{
        id: 'deck-1',
        template: 'poster',
        placement: { roomId: 'main', surface: 'wall', cellIndex: 0 },
        linkedContent: { type: 'flashcards', lastReviewedAt: null, cards: [{ front: 'A', back: 'B' }] },
      }],
    });
    const plan = M.getAlloHavenDailyPlan(state, '2026-04-10');
    expect(plan.snapshot.dueDeckCount).toBe(1);
    expect(plan.next).toMatchObject({ action: 'review', title: 'Daily reps' });
    expect(plan.steps.find((s) => s.id === 'review')).toMatchObject({ status: 'todo', count: 1 });
  });

  it('walks the core loop from focus to reflection to decoration to goals', () => {
    vi.setSystemTime(new Date(2026, 3, 10, 9, 0, 0));
    expect(M.getAlloHavenDailyPlan(baseState(), '2026-04-10').next.action).toBe('pomodoro');

    const afterFocus = baseState({
      dailyState: Object.assign({}, baseState().dailyState, { pomodorosCompleted: 1 }),
    });
    expect(M.getAlloHavenDailyPlan(afterFocus, '2026-04-10').next.action).toBe('reflection');

    const afterReflection = baseState({
      tokens: M.DECORATION_COST,
      dailyState: Object.assign({}, baseState().dailyState, { pomodorosCompleted: 1, reflectionsSubmitted: 1 }),
    });
    expect(M.getAlloHavenDailyPlan(afterReflection, '2026-04-10').next.action).toBe('decorate');

    const afterDecoration = baseState({
      tokens: M.DECORATION_COST,
      dailyState: Object.assign({}, baseState().dailyState, { pomodorosCompleted: 1, reflectionsSubmitted: 1 }),
      decorations: [{
        id: 'd-today',
        isStarter: false,
        earnedAt: '2026-04-10T10:00:00',
        placement: { roomId: 'main', surface: 'floor', cellIndex: 0 },
      }],
    });
    expect(M.getAlloHavenDailyPlan(afterDecoration, '2026-04-10').next.action).toBe('goals');
  });

  it('separates earned, spent, and net tokens for the local day', () => {
    vi.setSystemTime(new Date(2026, 3, 10, 23, 30, 0));
    const snapshot = M.getAlloHavenDailySnapshot(baseState({
      earnings: [
        { source: 'pomodoro', tokens: 5, date: '2026-04-10T09:00:00' },
        { source: 'custom-upload', tokens: -3, date: '2026-04-10T10:00:00' },
        { source: 'old', tokens: 99, date: '2026-04-09T23:00:00' },
      ],
      decorations: [
        { id: 'starter', isStarter: true, earnedAt: '2026-04-10T08:00:00' },
        { id: 'today', isStarter: false, earnedAt: '2026-04-10T10:00:00' },
      ],
    }), '2026-04-10');
    expect(snapshot.tokensEarnedToday).toBe(5);
    expect(snapshot.tokensSpentToday).toBe(3);
    expect(snapshot.tokensNetToday).toBe(2);
    expect(snapshot.decorationsToday).toBe(1);
  });
});

describe('AlloHaven economy ledger helpers', () => {
  it('spends tokens immutably and refuses unaffordable spends', () => {
    const prev = { tokens: 3, earnings: [{ source: 'seed', tokens: 3, date: '2026-04-10T08:00:00' }] };
    const spent = M.spendAlloHavenTokens(prev, 3, 'custom-upload', { template: 'custom-upload' }, '2026-04-10T09:00:00');
    expect(spent.ok).toBe(true);
    expect(prev.tokens).toBe(3);
    expect(spent.state.tokens).toBe(0);
    expect(spent.state.earnings.at(-1)).toMatchObject({
      source: 'custom-upload',
      tokens: -3,
      date: '2026-04-10T09:00:00',
      metadata: { template: 'custom-upload' },
    });

    const failed = M.spendAlloHavenTokens({ tokens: 2, earnings: [] }, 3, 'custom-upload', {}, '2026-04-10T09:00:00');
    expect(failed.ok).toBe(false);
    expect(failed.state.tokens).toBe(2);
    expect(failed.state.earnings).toEqual([]);
  });

  it('records refunds as positive ledger entries without erasing the original spend', () => {
    const spent = M.spendAlloHavenTokens({ tokens: 5, earnings: [] }, 3, 'decoration', { template: 'plants' }, '2026-04-10T09:00:00');
    const refunded = M.refundAlloHavenTokens(spent.state, 3, 'empty result', { template: 'plants' }, '2026-04-10T09:01:00');
    expect(refunded.state.tokens).toBe(5);
    expect(refunded.state.earnings).toHaveLength(2);
    expect(refunded.state.earnings[0]).toMatchObject({ source: 'decoration', tokens: -3 });
    expect(refunded.state.earnings[1]).toMatchObject({
      source: 'refund',
      tokens: 3,
      date: '2026-04-10T09:01:00',
      metadata: { reason: 'empty result', template: 'plants' },
    });
  });
});
