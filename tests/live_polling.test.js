// Unit tests for the pure routing helpers exported by live_polling_module.js
// (window.AlloModules.LivePolling): matchesPredicate, evaluateRoutingRules,
// isAbilityTieredName.
//
// evaluateRoutingRules decides which differentiated group a student is auto-
// routed into based on their poll response — a wrong predicate would mis-sort
// students. isAbilityTieredName backs the equity guardrail that warns teachers
// off ability-tracking group names. Both are pure (no Firebase/React needed).

import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

let LP;
beforeAll(() => {
  loadAlloModule('live_polling_module.js');
  LP = window.AlloModules.LivePolling;
  if (!LP) throw new Error('LivePolling failed to register');
});

describe('matchesPredicate', () => {
  it('eq compares strictly', () => {
    expect(LP.matchesPredicate({ predicate: 'eq', value: 'x' }, 'x')).toBe(true);
    expect(LP.matchesPredicate({ predicate: 'eq', value: 'x' }, 'y')).toBe(false);
  });
  it('lte / gte require a numeric response and value', () => {
    expect(LP.matchesPredicate({ predicate: 'lte', value: 3 }, 2)).toBe(true);
    expect(LP.matchesPredicate({ predicate: 'lte', value: 3 }, 4)).toBe(false);
    expect(LP.matchesPredicate({ predicate: 'lte', value: 3 }, 'two')).toBe(false);
    expect(LP.matchesPredicate({ predicate: 'gte', value: 3 }, 5)).toBe(true);
  });
  it('between is inclusive and array-bounded', () => {
    expect(LP.matchesPredicate({ predicate: 'between', value: [2, 4] }, 3)).toBe(true);
    expect(LP.matchesPredicate({ predicate: 'between', value: [2, 4] }, 2)).toBe(true);
    expect(LP.matchesPredicate({ predicate: 'between', value: [2, 4] }, 5)).toBe(false);
  });
  it('in checks array membership', () => {
    expect(LP.matchesPredicate({ predicate: 'in', value: ['a', 'b'] }, 'b')).toBe(true);
    expect(LP.matchesPredicate({ predicate: 'in', value: ['a', 'b'] }, 'c')).toBe(false);
  });
  it('returns false for missing or unknown predicate', () => {
    expect(LP.matchesPredicate(null, 1)).toBe(false);
    expect(LP.matchesPredicate({}, 1)).toBe(false);
    expect(LP.matchesPredicate({ predicate: 'zzz', value: 1 }, 1)).toBe(false);
  });
});

describe('evaluateRoutingRules', () => {
  it("returns the first matching rule's groupId", () => {
    const rules = [
      { when: { predicate: 'lte', value: 2 }, then: { groupId: 'support' } },
      { when: { predicate: 'gte', value: 8 }, then: { groupId: 'extension' } },
    ];
    expect(LP.evaluateRoutingRules(rules, 1)).toBe('support');
    expect(LP.evaluateRoutingRules(rules, 9)).toBe('extension');
  });
  it('returns null when nothing matches or rules are empty/invalid', () => {
    expect(LP.evaluateRoutingRules([{ when: { predicate: 'gte', value: 4 }, then: { groupId: 'x' } }], 1)).toBeNull();
    expect(LP.evaluateRoutingRules([], 3)).toBeNull();
    expect(LP.evaluateRoutingRules(null, 3)).toBeNull();
  });
  it('first match wins when multiple rules match', () => {
    const rules = [
      { when: { predicate: 'lte', value: 10 }, then: { groupId: 'first' } },
      { when: { predicate: 'lte', value: 10 }, then: { groupId: 'second' } },
    ];
    expect(LP.evaluateRoutingRules(rules, 5)).toBe('first');
  });
  it('ignores malformed rules (missing then.groupId)', () => {
    expect(LP.evaluateRoutingRules([{ when: { predicate: 'eq', value: 1 }, then: {} }], 1)).toBeNull();
  });
});

describe('isAbilityTieredName (equity guardrail)', () => {
  it('flags ability-tracking group names', () => {
    expect(LP.isAbilityTieredName('Struggling Readers')).toBe(true);
    expect(LP.isAbilityTieredName('gifted group')).toBe(true);
    expect(LP.isAbilityTieredName('Tier 2')).toBe(true);
    expect(LP.isAbilityTieredName('remedial')).toBe(true);
    expect(LP.isAbilityTieredName('Advanced')).toBe(true);
  });
  it('passes choice-themed names', () => {
    expect(LP.isAbilityTieredName('Pirate Crew')).toBe(false);
    expect(LP.isAbilityTieredName('Space Explorers')).toBe(false);
  });
  it('returns false for non-strings', () => {
    expect(LP.isAbilityTieredName(null)).toBe(false);
    expect(LP.isAbilityTieredName(42)).toBe(false);
  });
});

describe('custom rating scales + anonymous result sharing', () => {
  it('builds a bounded custom rating scale with labels', () => {
    const scale = LP.buildRatingScale(0, 3, '0 = Not yet\n1 = A little\n2 = Mostly\n3 = Got it');
    expect(scale.min).toBe(0);
    expect(scale.max).toBe(3);
    expect(scale.labels['0']).toBe('Not yet');
    expect(scale.labels['3']).toBe('Got it');
  });

  it('summarizes rating responses without codenames or per-student rows', () => {
    const poll = { id: 'p1', type: 'rating', prompt: 'How ready?', scale: LP.buildRatingScale(1, 4, '1 = Not ready\n4 = Ready') };
    const summary = LP.buildPollResultsSummary(poll, [
      { uid: 'u1', codename: 'Daring Sloth', response: 4 },
      { uid: 'u2', codename: 'Quiet Star', response: 2 },
      { uid: 'u3', codename: 'Blue Fox', response: 4 },
    ], 5);
    expect(summary.totalResponses).toBe(3);
    expect(summary.guestCount).toBe(5);
    expect(summary.items.find((item) => item.value === 4)).toMatchObject({ count: 2, percent: 67, label: 'Ready' });
    expect(JSON.stringify(summary)).not.toContain('Daring Sloth');
    expect(JSON.stringify(summary)).not.toContain('u1');
  });

  it('suppresses free-text content when sharing results', () => {
    const summary = LP.buildPollResultsSummary({ id: 'p2', type: 'freetext', prompt: 'What do you need?' }, [
      { codename: 'A', response: 'I need help with step 2.' },
    ], 1);
    expect(summary.freeTextSuppressed).toBe(true);
    expect(summary.items).toEqual([{ value: 'responses', label: 'Free-text responses received', count: 1, percent: 100 }]);
    expect(JSON.stringify(summary)).not.toContain('step 2');
  });

  it('host broadcasts shared results over open data channels', () => {
    const host = LP.createHost({ sessionCode: 'ABCD' });
    const sent = [];
    host.peers.set('u1', { dc: { readyState: 'open', send: (msg) => sent.push(JSON.parse(msg)) } });
    host.peers.set('u2', { dc: { readyState: 'closed', send: () => { throw new Error('should not send'); } } });
    host.broadcastPollResults('p3', { prompt: 'Ready?', items: [] });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ type: 'pollResults', payload: { pollId: 'p3', prompt: 'Ready?', items: [] } });
  });
});
describe('live polling reliability helpers', () => {
  it('keeps one connected row per student after reconnect', () => {
    const guests = LP.upsertLiveGuest([{ uid: 'u1', codename: 'First Name' }], 'u1', 'Fresh Name');
    expect(guests).toEqual([{ uid: 'u1', codename: 'Fresh Name' }]);
  });

  it('keeps the latest response per student instead of inflating response counts', () => {
    const responses = LP.upsertPollResponse([
      { uid: 'u1', codename: 'Learner', response: 2, timestamp: 1 },
      { uid: 'u2', codename: 'Partner', response: 4, timestamp: 1 },
    ], { uid: 'u1', codename: 'Learner', response: 5, timestamp: 2 });
    expect(responses).toHaveLength(2);
    expect(responses.find((r) => r.uid === 'u1')).toMatchObject({ response: 5, timestamp: 2 });
  });

  it('deduplicates repeat submissions before building anonymous aggregates', () => {
    const poll = { id: 'p4', type: 'rating', prompt: 'Ready?', scale: LP.buildRatingScale(1, 5, '5 = Ready') };
    const summary = LP.buildPollResultsSummary(poll, [
      { uid: 'u1', codename: 'Learner', response: 1, timestamp: 1 },
      { uid: 'u1', codename: 'Learner', response: 5, timestamp: 2 },
      { uid: 'u2', codename: 'Partner', response: 5, timestamp: 1 },
    ], 2);
    expect(summary.totalResponses).toBe(2);
    expect(summary.items.find((item) => item.value === 1)).toMatchObject({ count: 0, percent: 0 });
    expect(summary.items.find((item) => item.value === 5)).toMatchObject({ count: 2, percent: 100 });
  });

  it('ignores stale poll-close messages once a newer poll is active', () => {
    expect(LP.shouldApplyPollClose({ id: 'poll-new' }, { pollId: 'poll-old' })).toBe(false);
    expect(LP.shouldApplyPollClose({ id: 'poll-new' }, { pollId: 'poll-new' })).toBe(true);
    expect(LP.shouldApplyPollClose({ id: 'poll-new' }, {})).toBe(true);
  });
});