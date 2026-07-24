import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
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
});

beforeEach(() => {
  localStorage.clear();
});

const reward = (overrides = {}) => Object.assign({
  id: 'haven-event-0001',
  reasonId: 'ready_to_learn',
  amount: 1,
  at: Date.parse('2026-07-18T14:00:00Z'),
}, overrides);

describe('AlloHaven classroom reward ledger', () => {
  it('credits fixed-schema recognition exactly once', () => {
    const initial = { tokens: 2, earnings: [{ source: 'pomodoro', tokens: 2, date: '2026-07-18T13:00:00Z' }] };
    const first = M.applyClassroomRewards(initial, [reward()]);
    expect(first.applied).toHaveLength(1);
    expect(first.state.tokens).toBe(3);
    expect(first.state.earnings.at(-1)).toMatchObject({
      source: 'classroom-recognition',
      tokens: 1,
      metadata: {
        rewardId: 'haven-event-0001',
        reasonId: 'ready_to_learn',
        delivery: 'live-session',
      },
    });

    const repeatedSnapshot = M.applyClassroomRewards(first.state, [reward()]);
    expect(repeatedSnapshot.applied).toEqual([]);
    expect(repeatedSnapshot.state.tokens).toBe(3);
    expect(repeatedSnapshot.state.earnings).toHaveLength(2);
  });

  it('rejects unknown reasons, excessive amounts, and malformed ids', () => {
    expect(M.normalizeClassroomReward(reward({ reasonId: 'teacher_free_text' }))).toBeNull();
    expect(M.normalizeClassroomReward(reward({ amount: 3 }))).toBeNull();
    expect(M.normalizeClassroomReward(reward({ id: 'bad id' }))).toBeNull();
  });

  it('consumes the local inbox and removes it after applying', () => {
    localStorage.setItem('alloflow_allohaven_classroom_reward_inbox_v1', JSON.stringify([
      reward(),
      reward({ id: 'haven-event-0002', reasonId: 'collaboration', amount: 2 }),
    ]));
    const result = M.consumeClassroomRewardInbox({ tokens: 0, earnings: [] });
    expect(result.state.tokens).toBe(3);
    expect(result.applied).toHaveLength(2);
    expect(localStorage.getItem('alloflow_allohaven_classroom_reward_inbox_v1')).toBeNull();
  });

  it('surfaces the newest private recognition as creative reward progress', () => {
    const state = M.applyClassroomRewards({ tokens: 0, earnings: [] }, [
      reward({ id: 'haven-event-older', reasonId: 'ready_to_learn', at: Date.parse('2026-07-18T13:00:00Z') }),
      reward({ id: 'haven-event-newer', reasonId: 'collaboration', amount: 2, at: Date.parse('2026-07-18T15:00:00Z') }),
    ]).state;
    const card = M.getClassroomRewardCardState(state, 3);
    expect(card).toMatchObject({
      rewardId: 'haven-event-newer',
      reasonId: 'collaboration',
      reasonLabel: 'Collaboration',
      tokens: 3,
      cost: 3,
      ready: true,
      remaining: 0,
    });
  });

  it('shows keep-saving progress and stays dismissed until a newer reward arrives', () => {
    const earning = {
      source: 'classroom-recognition', tokens: 1, date: '2026-07-18T14:00:00Z',
      metadata: { rewardId: 'haven-event-0001', reasonId: 'used_support' },
    };
    const waiting = M.getClassroomRewardCardState({ tokens: 1, earnings: [earning] }, 3);
    expect(waiting).toMatchObject({ ready: false, remaining: 2, reasonLabel: 'Used a support or asked for help' });
    expect(M.getClassroomRewardCardState({
      tokens: 1,
      earnings: [earning],
      classroomRewardCardDismissedId: 'haven-event-0001',
    }, 3)).toBeNull();
  });

  it('derives a newest-first bounded private recognition history', () => {
    const earnings = Array.from({ length: 25 }, (_, index) => ({
      source: 'classroom-recognition',
      tokens: (index % 2) + 1,
      date: new Date(Date.parse('2026-07-01T12:00:00Z') + index * 60000).toISOString(),
      metadata: {
        rewardId: `haven-event-${String(index).padStart(4, '0')}`,
        reasonId: index % 2 ? 'collaboration' : 'goal_progress',
        teacherNote: 'must never surface',
      },
    }));
    earnings.push({ source: 'pomodoro', tokens: 99, date: '2026-07-19T12:00:00Z' });

    const recent = M.getClassroomRecognitionHistory({ earnings }, 8);
    expect(recent).toHaveLength(8);
    expect(recent[0]).toMatchObject({
      rewardId: 'haven-event-0024',
      reasonLabel: 'Individual goal progress',
      amount: 1,
    });
    expect(recent[0]).not.toHaveProperty('teacherNote');
    expect(recent.every((item, index) => index === 0 || recent[index - 1].timestamp >= item.timestamp)).toBe(true);
    expect(M.getClassroomRecognitionHistory({ earnings }, 100)).toHaveLength(20);
  });

  it('deduplicates reward ids in private recognition history', () => {
    const earning = {
      source: 'classroom-recognition', tokens: 2, date: '2026-07-18T14:00:00Z',
      metadata: { rewardId: 'haven-event-duplicate', reasonId: 'self_regulation' },
    };
    expect(M.getClassroomRecognitionHistory({ earnings: [earning, earning] }, 8)).toHaveLength(1);
  });
});

describe('live-session reward transport source contract', () => {
  const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
  const haven = readFileSync(resolve(process.cwd(), 'allohaven_module.js'), 'utf8');

  it('allowlists only the bounded havenRewards leaf and writes through the privacy gate', () => {
    expect(anti).toContain("'havenRewards',");
    expect(anti).toContain('writeToSession(sessionRef, { [`roster.${uid}.havenRewards`]: nextRewards })');
    expect(anti).toContain('.slice(-20)');
  });

  it('uses enum reasons and does not sync teacher observation text', () => {
    const sender = anti.slice(anti.indexOf('const handleRecognizeStudent'), anti.indexOf('// Plan T Slice Ta'));
    expect(sender).toContain('reasonId: havenRewardReasonId');
    expect(sender).toContain('amount,');
    expect(sender).toContain('const awardedAt = Date.now()');
    expect(sender).toContain('at: awardedAt');
    expect(sender).not.toMatch(/note|observation|behaviorText|comment/i);
  });

  it('renders an accessible private recognition control in the live dock', () => {
    expect(anti).toContain('aria-label="AlloHaven recognition reason"');
    expect(anti).toContain("aria-label={'Recognize ' + (entry.name || 'student')");
    expect(anti).toContain('Awards are private; no behavior notes are synced.');
  });

  it('batches group and class recognition below the mailbox patch ceiling', () => {
    const sender = anti.slice(anti.indexOf('const handleRecognizeStudents'), anti.indexOf('// Plan T Slice Ta'));
    expect(sender).toContain('index += 40');
    expect(sender).toContain('payload[`roster.${item.uid}.havenRewards`] = item.rewards');
    expect(sender).toContain('await writeToSession(sessionRef, payload)');
    expect(sender).toContain('Array.from(new Set(');
    expect(sender).toContain('.slice(-20)');
  });

  it('offers private whole-class and populated-group actions without rankings', () => {
    expect(anti).toContain("handleRecognizeStudents(Object.keys(rosterEntries), 'students')");
    expect(anti).toContain("handleRecognizeStudents(groupUids, 'students in ' + groupLabel)");
    expect(anti).toContain('Recognize all connected students with ');
    expect(anti).not.toMatch(/haven(?:Reward)?Leaderboard|publicHavenBalance/i);
  });

  it('offers an accessible optional path into all three creative reward choices', () => {
    const card = haven.slice(haven.indexOf('function renderClassroomRewardCard'), haven.indexOf('function renderTodayCard'));
    expect(card).toContain("'aria-label': 'Private classroom recognition creative reward'");
    expect(card).toContain("role: 'progressbar'");
    expect(card).toContain('AI-generated decoration');
    expect(card).toContain('make your own drawing');
    expect(card).toContain('upload an image');
    expect(card).toContain('there is no deadline');
    expect(card).toContain("setStateField('classroomRewardCardDismissedId', card.rewardId)");
    expect(card).toContain("handleEmptyCellClick(surface, cellIndex)");
    expect(card).not.toMatch(/leaderboard|rank|lost streak|expires/i);
  });

  it('keeps a bounded accessible private recognition history after card dismissal', () => {
    const historyUi = haven.slice(
      haven.indexOf('function renderClassroomRecognitionHistoryLink'),
      haven.indexOf('function renderTodayCard'),
    );
    expect(historyUi).toContain("'aria-label': 'Private classroom recognition history'");
    expect(historyUi).toContain("state.activeModal !== 'classroom-recognition-history'");
    expect(historyUi).toContain("'aria-labelledby': 'ah-classroom-recognition-history-title'");
    expect(historyUi).toContain("'aria-label': 'Recent classroom recognition events'");
    expect(historyUi).toContain('visible only in your AlloHaven');
    expect(historyUi).toContain('never teacher notes or a public score');
    expect(historyUi).toContain('Showing up to 8 recent events.');
    expect(historyUi).not.toMatch(/leaderboard|rank|streak|expires/i);
  });

  it('derives a bounded deduplicated teacher delivery audit from fixed-schema rewards', () => {
    const helper = anti.slice(
      anti.indexOf('const buildAlloHavenRecognitionAudit'),
      anti.indexOf('const queueAlloHavenClassroomRewards'),
    );
    expect(helper).toContain('Math.min(20');
    expect(helper).toContain('normalizeAlloHavenClassroomReward(rawReward)');
    expect(helper).toContain('seen.has(reward.id)');
    expect(helper).toContain('.sort((a, b) => b.at - a.at).slice(0, boundedLimit)');
    expect(helper).toContain('reasonLabel: reason ? reason.label');
    expect(helper).not.toMatch(/balance|note|observation|comment/i);
  });

  it('locks individual and batch sends immediately and always releases the lock', () => {
    const handlers = anti.slice(
      anti.indexOf('const handleRecognizeStudent ='),
      anti.indexOf('// Plan T Slice Ta'),
    );
    expect(handlers).toContain('if (havenRewardSendLockRef.current ||');
    expect(handlers).toContain('havenRewardSendLockRef.current = true;');
    expect(handlers.match(/havenRewardSendLockRef\.current = false;/g)).toHaveLength(3);
    expect(handlers.match(/finally \{/g)).toHaveLength(2);
    expect(handlers).toContain('setHavenRewardReceipt({');
    expect(handlers).toContain('partial: true');
  });

  it('renders an accessible teacher-only receipt and expandable recent audit', () => {
    const panel = anti.slice(
      anti.indexOf('<div style={dockGroupLabel}>Recognize</div>'),
      anti.indexOf('// Students: delivery status'),
    );
    expect(panel).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(panel).toContain('aria-controls="allohaven-recognition-delivery-audit"');
    expect(panel).toContain('aria-label="Recent private AlloHaven recognition deliveries"');
    expect(panel).toContain('Teacher-only delivery audit. No balances, rankings, or behavior notes.');
    expect(panel).not.toMatch(/publicHavenBalance|leaderboard|behaviorNote:/i);
  });

  it('keeps recognition off by default and validates a fixed-schema session config', () => {
    const config = anti.slice(
      anti.indexOf('const ALLOHAVEN_RECOGNITION_CAPS'),
      anti.indexOf('const buildAlloHavenRecognitionAudit'),
    );
    const gate = anti.slice(
      anti.indexOf('const writeToSession ='),
      anti.indexOf('window.__alloWriteToSession'),
    );
    expect(anti).toContain("'havenRecognitionConfig',");
    expect(config).toContain('Object.freeze([2, 4, 6, 8])');
    expect(config).toContain('enabled: false, perStudentTokenCap: 4');
    expect(config).toContain("typeof config.enabled !== 'boolean'");
    expect(config).toContain('ALLOHAVEN_RECOGNITION_CAPS.includes(perStudentTokenCap)');
    expect(gate).toContain("hasOwnProperty.call(safePayload, 'havenRecognitionConfig')");
    expect(gate).toContain('invalid AlloHaven recognition config');
  });

  it('enforces the feature flag and strict cap for individual and batch sends', () => {
    const handlers = anti.slice(
      anti.indexOf('const handleRecognizeStudent ='),
      anti.indexOf('// Plan T Slice Ta'),
    );
    expect(handlers.match(/if \(!havenRecognitionConfig\.enabled\)/g)).toHaveLength(2);
    expect(handlers).toContain('tokensUsed + amount > havenRecognitionConfig.perStudentTokenCap');
    expect(handlers).toContain('let cappedCount = 0');
    expect(handlers).toContain('}).filter(Boolean)');
    expect(handlers).toContain('All selected students are at the session recognition limit');
    expect(handlers).toContain('skippedCount: cappedCount');
    expect(handlers).not.toMatch(/partialAmount|prorate|overdraft/i);
  });

  it('renders an accessible opt-in switch and cap-aware teacher controls', () => {
    const panel = anti.slice(
      anti.indexOf('<div style={dockGroupLabel}>Recognize</div>'),
      anti.indexOf('// Students: delivery status'),
    );
    expect(panel).toContain('role="switch"');
    expect(panel).toContain('aria-checked={havenRecognitionConfig.enabled}');
    expect(panel).toContain('aria-label="AlloHaven per-student session token cap"');
    expect(panel).toContain('It remains off by default.');
    expect(panel).toContain('skipped at session cap');
    expect(anti).toContain('disabled={!canRecognizeStudent}');
    expect(anti).toContain('rewardTokensRemaining >= havenRewardAmount');
    expect(panel).not.toMatch(/leaderboard|publicHavenBalance|token removal/i);
  });});
