// Class Goals (docs/GROUP_CONTINGENCY_DESIGN.md, Ring A) — end-to-end pins.
//
// Student side runs REAL code: allohaven_module's ledger must accept the new
// 'group_goal' reason and credit it exactly once. Teacher side is inside
// AlloFlowANTI.txt (not headlessly importable), so its load-bearing wiring is
// pinned as source contracts: fan-out goes through the standard batched
// recognition path with the reason override, the goal label never rides the
// wire, and the individual-recognition dropdown doesn't offer group_goal.

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let M;
const ANTI = readFileSync('AlloFlowANTI.txt', 'utf8');

beforeAll(() => {
  const React = require(resolve(process.cwd(), 'prismflow-deploy/node_modules/react'));
  globalThis.React = window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('allohaven_module.js');
  M = window.AlloModules.AlloHavenInternals;
});

beforeEach(() => {
  localStorage.clear();
});

describe('student side: group_goal through the real ledger', () => {
  const groupReward = (overrides = {}) => Object.assign({
    id: 'haven-goal-00001',
    reasonId: 'group_goal',
    amount: 1,
    at: Date.parse('2026-07-21T14:00:00Z'),
  }, overrides);

  it('accepts group_goal, credits once, and labels it "Class goal achieved"', () => {
    const first = M.applyClassroomRewards({ tokens: 0, earnings: [] }, [groupReward()]);
    expect(first.applied).toHaveLength(1);
    expect(first.state.tokens).toBe(1);
    expect(first.state.earnings.at(-1).metadata.reasonId).toBe('group_goal');
    // Idempotent across repeated session snapshots (same event id).
    const again = M.applyClassroomRewards(first.state, [groupReward()]);
    expect(again.applied).toEqual([]);
    expect(again.state.tokens).toBe(1);
    expect(M.classroomRewardReasonLabel('group_goal')).toBe('Class goal achieved');
  });

  it('still rejects free-text reasons and >2-token amounts (earn-only, fixed schema)', () => {
    expect(M.normalizeClassroomReward(groupReward({ reasonId: 'lined_up_quietly_free_text' }))).toBeNull();
    expect(M.normalizeClassroomReward(groupReward({ amount: 3 }))).toBeNull();
    expect(M.normalizeClassroomReward(groupReward({ amount: -1 }))).toBeNull();
  });

  it('root module and public mirror are byte-identical', () => {
    expect(readFileSync('prismflow-deploy/public/allohaven_module.js', 'utf8'))
      .toBe(readFileSync('allohaven_module.js', 'utf8'));
  });
});

describe('teacher side: ANTI source contracts', () => {
  it('group_goal is a first-class reason with the student-facing label', () => {
    expect(ANTI).toContain("{ id: 'group_goal', label: 'Class goal achieved' }");
  });

  it('individual-recognition dropdown does not offer group_goal', () => {
    expect(ANTI).toContain("ALLOHAVEN_CLASSROOM_REWARD_REASONS.filter(reason => reason.id !== 'group_goal').map(reason => (");
  });

  it('award fans out through the standard batched path with the reason override', () => {
    expect(ANTI).toContain("{ reasonId: 'group_goal', amount: goal.tokens }");
    // The override actually reaches the wire event and the receipt…
    expect(ANTI).toContain('reasonId: effectiveReasonId,');
    expect(ANTI).toMatch(/const effectiveReasonId = \(overrides && ALLOHAVEN_CLASSROOM_REWARD_REASON_IDS\.has\(overrides\.reasonId\)\)/);
    // …and metCount only advances when something was actually delivered.
    expect(ANTI).toContain('if (!delivered) return;');
    expect(ANTI).toContain('return delivered;');
  });

  it('goal labels stay device-local: the wire event is exactly {id, reasonId, amount, at}', () => {
    const rewardShape = ANTI.slice(ANTI.indexOf('const handleRecognizeStudents'), ANTI.indexOf('const handleAwardClassGoal'));
    // The reward object literal that lands in roster.{uid}.havenRewards
    // carries only the fixed schema — never the teacher's goal label.
    expect(rewardShape).toMatch(/reasonId: effectiveReasonId,\s*\n\s*amount,\s*\n\s*at: awardedAt\s*\n\s*\};/);
    expect(rewardShape).not.toContain('goal.label');
    expect(rewardShape).not.toContain('goalLabel');
  });

  it('normalizeClassGoals enforces the earn-only fixed schema', () => {
    expect(ANTI).toContain("tokens: Number(goal.tokens) === 2 ? 2 : 1,");
    expect(ANTI).toContain("allowance: Math.max(0, Math.min(5, Math.floor(Number(goal.allowance) || 0)))");
    expect(ANTI).toContain('return out.slice(0, 20);');
  });

  it('every built-in template names a positive accomplishment (no absence-of-problem framing)', () => {
    const block = ANTI.slice(ANTI.indexOf('const CLASS_GOAL_TEMPLATES'), ANTI.indexOf('const CLASS_GOAL_TEMPLATE_IDS'));
    const labels = [...block.matchAll(/label: '([^']+)'/g)].map(m => m[1].toLowerCase());
    expect(labels.length).toBeGreaterThanOrEqual(8);
    for (const bad of ['no ', 'not ', 'without', 'stop', 'avoid', 'zero ', 'quiet']) {
      expect(labels.some(l => l.includes(bad))).toBe(false);
    }
  });

  it('classGoals travel with roster import (teacher_source)', () => {
    const teacherSrc = readFileSync('teacher_source.jsx', 'utf8');
    expect(teacherSrc).toContain('...(Array.isArray(data.classGoals) ? { classGoals: data.classGoals } : {})');
  });
});
