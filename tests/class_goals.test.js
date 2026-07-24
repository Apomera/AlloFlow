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
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
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
    expect(readFileSync('desktop/web-app/public/allohaven_module.js', 'utf8'))
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
    const rewardShape = ANTI.slice(ANTI.indexOf('const handleRecognizeStudents'), ANTI.indexOf('const _bumpClassGoalMet'));
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

describe('Ring B/C: teams, tracked criteria, independent checklist (ANTI contracts)', () => {
  it('goal schema validates mode, team, and tracked shapes', () => {
    expect(ANTI).toContain("mode: goal.mode === 'independent' ? 'independent' : 'interdependent',");
    expect(ANTI).toMatch(/\/\^group:\[A-Za-z0-9_-\]\{1,60\}\$\/\.test\(goal\.team\)/);
    expect(ANTI).toMatch(/\/\^pod:\\d\{1,2\}\$\/\.test\(goal\.team\)/);
    expect(ANTI).toContain("const CLASS_GOAL_TRACKED_METRICS = Object.freeze({ xp_total: 1, responded_each: 1 });");
  });

  it('pod teams resolve through the seating module with codename normalization', () => {
    const resolver = ANTI.slice(ANTI.indexOf('const resolveClassGoalTeamUids'), ANTI.indexOf('const evaluateClassGoalProgress'));
    expect(resolver).toContain("typeof SC.listPods !== 'function'");
    expect(resolver).toContain('normalizeRosterSessionCodename');
  });

  it('allowance is functional for responded_each (team minus responders ≤ allowance)', () => {
    expect(ANTI).toContain('(uids.length - responders) <= goal.allowance');
  });

  it('NOTIFY-CONFIRM INVARIANT: the tracked-goal effect never awards', () => {
    const start = ANTI.indexOf('// Notify-confirm prompt (§4.6)');
    const end = ANTI.indexOf('}, [sessionData, rosterKey, isTeacherMode, activeSessionCode]);', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const effect = ANTI.slice(start, end);
    expect(effect).toContain('evaluateClassGoalProgress');
    expect(effect).toContain('addToast');
    // The effect must not touch any award path or write to the session.
    expect(effect).not.toContain('handleRecognizeStudents');
    expect(effect).not.toContain('handleAwardClassGoal');
    expect(effect).not.toContain('handleAwardIndependentGoal');
    expect(effect).not.toContain('writeToSession');
    // One prompt per goal per session.
    expect(effect).toContain('classGoalNotifiedRef.current[goal.id] = true;');
  });

  it('independent awards ride the existing goal_progress reason and count deliveries', () => {
    expect(ANTI).toContain("{ reasonId: 'goal_progress', amount: goal.tokens }");
    expect(ANTI).toContain('_bumpClassGoalMet(goal, delivered, delivered);');
  });

  it('interdependent awards are team-scoped and bail with guidance when the team is empty', () => {
    expect(ANTI).toContain('const teamUids = resolveClassGoalTeamUids(goal, (sessionData && sessionData.roster) || {}, rosterKey);');
    expect(ANTI).toContain('No connected students matched this pod');
  });

  it('tracked criteria are an option, never a default — teacher-observed is the default path', () => {
    expect(ANTI).toContain('<option value="none">Teacher observed (none)</option>');
    expect(ANTI).toContain("trackedMetric: 'none'");
  });
});

describe('session record: goals met land in the roster summary', () => {
  // Run the REAL builder extracted from ANTI (same harness as
  // roster_session_history.test.js).
  const helperStart = ANTI.indexOf('const normalizeRosterSessionCodename');
  const helperEnd = ANTI.indexOf('const generateSessionCode', helperStart);
  // eslint-disable-next-line no-new-func
  const helpers = new Function(ANTI.slice(helperStart, helperEnd) + '\nreturn { buildRosterSessionSummary };')();

  it('summary includes only THIS session’s goal awards, schema-clamped', () => {
    const summary = helpers.buildRosterSessionSummary({
      sessionCode: 'AB123', mode: 'firebase', endedAt: '2026-07-21T11:00:00.000Z',
      rosterKey: {
        students: { 'Brave Otter': 'blue' },
        classGoalLog: [
          { goalId: 'goal-1', label: 'Smooth transition', mode: 'interdependent', tokens: 1, delivered: 17, sessionCode: 'AB123', at: 1 },
          { goalId: 'goal-2', label: 'Everyone participated', mode: 'independent', tokens: 9, delivered: 4.7, sessionCode: 'AB123', at: 2 },
          { goalId: 'goal-3', label: 'Other session', mode: 'interdependent', tokens: 1, delivered: 5, sessionCode: 'ZZ999', at: 3 },
          { goalId: 'goal-4', label: 'No session', tokens: 1, delivered: 5, sessionCode: null, at: 4 },
        ],
      },
      sessionData: { createdAt: '2026-07-21T10:00:00.000Z', roster: {} },
    });
    expect(summary.classGoals).toHaveLength(2);
    expect(summary.classGoals[0]).toMatchObject({ label: 'Smooth transition', mode: 'interdependent', tokens: 1, delivered: 17 });
    expect(summary.classGoals[1]).toMatchObject({ mode: 'independent', tokens: 1, delivered: 4 }); // tokens 9 → 1 (only exactly-2 passes), 4.7 → 4 floor
  });

  it('_bumpClassGoalMet stamps the award log with the session code', () => {
    expect(ANTI).toContain('sessionCode: activeSessionCode || null,');
    expect(ANTI).toContain(']).slice(-60),');
  });

  it('teacher history card renders goals met and import preserves the log', () => {
    const teacherSrc = readFileSync('teacher_source.jsx', 'utf8');
    expect(teacherSrc).toContain('Class Goals met:');
    expect(teacherSrc).toContain('...(Array.isArray(data.classGoalLog) ? { classGoalLog: data.classGoalLog.slice(-60) } : {})');
  });
});
