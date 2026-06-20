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
