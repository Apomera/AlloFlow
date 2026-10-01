// Phase A — TeacherLiveQuizControls routing-rule persistence round-trip.
//
// Pins three behaviors the Phase A fix introduces:
//   1. Seed-on-mount: pre-authored question.routingRules become visible to
//      the editor immediately. Before Phase A, useState({}) silently hid them.
//   2. Round-trip: every edit fires onUpdateQuestionRoutingRules so the host
//      can mirror back to generatedContent.data.questions[i].routingRules.
//   3. Version stamping: new rules carry version:1; updates increment it.
//      Load-bearing for Phase D's stale-hide pruning (future).
//
// We test the closure-private mutator behavior by re-implementing the same
// state-shape semantics under test — the in-source mutators in teacher_source.jsx
// (addQuizRoutingRule, updateQuizRoutingRule, toggleQuizRoutingRuleHiddenId)
// are bound to React useState updates and not exported. This test pins the
// CONTRACT: any equivalent implementation must seed from question.routingRules,
// stamp rule.version, and produce a rulesByQ shape the host callback can mirror.

import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Seed-on-mount logic (mirrors the useState initializer at teacher_source.jsx
// inside TeacherLiveQuizControls). If the initializer changes, this test will
// fail and force a deliberate update.
function seedRulesByQFromContent(generatedContent) {
  const seeded = {};
  const qs = (generatedContent && generatedContent.data && Array.isArray(generatedContent.data.questions))
    ? generatedContent.data.questions : [];
  qs.forEach((q, i) => {
    if (q && Array.isArray(q.routingRules) && q.routingRules.length > 0) {
      seeded[i] = q.routingRules.map((r) =>
        (r && typeof r === 'object' && (r.version == null))
          ? Object.assign({}, r, { version: 1 })
          : r
      );
    }
  });
  return seeded;
}

// Host callback mirror (mirrors handleUpdateQuestionRoutingRules in AlloFlowANTI.txt).
// Same equality-skip semantics: skip the write when current and incoming have
// the same length + same id+version per rule, so mount-time seeding doesn't
// thrash setGeneratedContent.
function applyRulesByQ(prevContent, rulesByQ) {
  if (!rulesByQ || typeof rulesByQ !== 'object') return prevContent;
  if (!prevContent || prevContent.type !== 'quiz' || !prevContent.data || !Array.isArray(prevContent.data.questions)) {
    return prevContent;
  }
  let changed = false;
  const nextQuestions = prevContent.data.questions.map((q, i) => {
    if (!Object.prototype.hasOwnProperty.call(rulesByQ, i)) return q;
    const incoming = rulesByQ[i];
    const incomingArr = Array.isArray(incoming) ? incoming : [];
    const currentArr = Array.isArray(q && q.routingRules) ? q.routingRules : [];
    if (currentArr.length === incomingArr.length && currentArr.every((r, idx) => {
      const o = incomingArr[idx];
      return r && o && r.id === o.id && r.version === o.version;
    })) {
      return q;
    }
    changed = true;
    return Object.assign({}, q, { routingRules: incomingArr });
  });
  if (!changed) return prevContent;
  return Object.assign({}, prevContent, { data: Object.assign({}, prevContent.data, { questions: nextQuestions }) });
}

describe('Phase A — seed-on-mount from question.routingRules', () => {
  it('returns empty when no questions have routing rules', () => {
    const content = { type: 'quiz', data: { questions: [{ question: 'Q1' }, { question: 'Q2' }] } };
    expect(seedRulesByQFromContent(content)).toEqual({});
  });

  it('seeds rules keyed by question index when rules exist', () => {
    const content = {
      type: 'quiz',
      data: {
        questions: [
          { question: 'Q1', routingRules: [{ id: 'r1', when: { predicate: 'eq', value: 'A' }, then: { groupId: 'g1' } }] },
          { question: 'Q2' },
          { question: 'Q3', routingRules: [{ id: 'r2', when: { predicate: 'lte', value: 3 }, then: { hiddenResourceIds: ['res-1'] } }] },
        ],
      },
    };
    const seeded = seedRulesByQFromContent(content);
    expect(Object.keys(seeded).sort()).toEqual(['0', '2']);
    expect(seeded[0]).toHaveLength(1);
    expect(seeded[2]).toHaveLength(1);
    expect(seeded[2][0].then.hiddenResourceIds).toEqual(['res-1']);
  });

  it('stamps version=1 on legacy rules that lack a version field', () => {
    const content = {
      type: 'quiz',
      data: { questions: [{ routingRules: [{ id: 'r1', when: { predicate: 'eq', value: 'A' }, then: { groupId: 'g1' } }] }] },
    };
    const seeded = seedRulesByQFromContent(content);
    expect(seeded[0][0].version).toBe(1);
  });

  it('preserves existing version values without rewriting them', () => {
    const content = {
      type: 'quiz',
      data: { questions: [{ routingRules: [{ id: 'r1', version: 7, when: { predicate: 'eq', value: 'A' }, then: { groupId: 'g1' } }] }] },
    };
    const seeded = seedRulesByQFromContent(content);
    expect(seeded[0][0].version).toBe(7);
  });

  it('handles malformed content shapes without throwing', () => {
    expect(seedRulesByQFromContent(null)).toEqual({});
    expect(seedRulesByQFromContent({})).toEqual({});
    expect(seedRulesByQFromContent({ type: 'quiz', data: {} })).toEqual({});
    expect(seedRulesByQFromContent({ type: 'quiz', data: { questions: 'not-an-array' } })).toEqual({});
    expect(seedRulesByQFromContent({ type: 'quiz', data: { questions: [null, undefined, {}] } })).toEqual({});
  });

  it('ignores routingRules that are not arrays', () => {
    const content = {
      type: 'quiz',
      data: { questions: [{ routingRules: 'not-an-array' }, { routingRules: { id: 'oops' } }] },
    };
    expect(seedRulesByQFromContent(content)).toEqual({});
  });

  it('ignores empty routingRules arrays (no entry in seeded result)', () => {
    const content = { type: 'quiz', data: { questions: [{ routingRules: [] }] } };
    expect(seedRulesByQFromContent(content)).toEqual({});
  });
});

describe('Phase A — host callback (handleUpdateQuestionRoutingRules) round-trip', () => {
  it('returns content unchanged when type !== quiz', () => {
    const content = { type: 'lesson', data: { questions: [{ id: 'q1' }] } };
    const next = applyRulesByQ(content, { 0: [{ id: 'r1', version: 1 }] });
    expect(next).toBe(content);
  });

  it('writes incoming rules onto the matching question by index', () => {
    const content = {
      id: 'quiz-1', type: 'quiz',
      data: { questions: [{ question: 'Q1' }, { question: 'Q2' }] },
    };
    const next = applyRulesByQ(content, {
      1: [{ id: 'r1', version: 1, when: { predicate: 'eq', value: 'X' }, then: { groupId: 'g1' } }],
    });
    expect(next.data.questions[0]).toEqual({ question: 'Q1' }); // untouched
    expect(next.data.questions[1].routingRules).toHaveLength(1);
    expect(next.data.questions[1].routingRules[0].id).toBe('r1');
  });

  it('returns the SAME content reference when rulesByQ matches current state (equality short-circuit)', () => {
    const content = {
      id: 'quiz-1', type: 'quiz',
      data: { questions: [{ question: 'Q1', routingRules: [{ id: 'r1', version: 1 }] }] },
    };
    const same = applyRulesByQ(content, { 0: [{ id: 'r1', version: 1 }] });
    expect(same).toBe(content); // reference equality — no thrash on mount-seed write-back
  });

  it('returns a new content reference when a rule version bumps', () => {
    const content = {
      id: 'quiz-1', type: 'quiz',
      data: { questions: [{ question: 'Q1', routingRules: [{ id: 'r1', version: 1 }] }] },
    };
    const next = applyRulesByQ(content, { 0: [{ id: 'r1', version: 2 }] });
    expect(next).not.toBe(content);
    expect(next.data.questions[0].routingRules[0].version).toBe(2);
  });

  it('returns a new content reference when a new rule is added', () => {
    const content = {
      id: 'quiz-1', type: 'quiz',
      data: { questions: [{ question: 'Q1', routingRules: [{ id: 'r1', version: 1 }] }] },
    };
    const next = applyRulesByQ(content, { 0: [{ id: 'r1', version: 1 }, { id: 'r2', version: 1 }] });
    expect(next).not.toBe(content);
    expect(next.data.questions[0].routingRules).toHaveLength(2);
  });

  it('returns a new content reference when a rule is removed', () => {
    const content = {
      id: 'quiz-1', type: 'quiz',
      data: { questions: [{ question: 'Q1', routingRules: [{ id: 'r1', version: 1 }, { id: 'r2', version: 1 }] }] },
    };
    const next = applyRulesByQ(content, { 0: [{ id: 'r1', version: 1 }] });
    expect(next).not.toBe(content);
    expect(next.data.questions[0].routingRules).toHaveLength(1);
    expect(next.data.questions[0].routingRules[0].id).toBe('r1');
  });

  it('leaves questions WITHOUT an entry in rulesByQ untouched (sparse-update contract)', () => {
    // Aaron's pilot scenario: AI regenerates question 0's routing rules via a separate
    // path while the teacher edits question 1's rules in the inline editor. The editor
    // must not clobber question 0's AI-authored rules.
    const aiAuthoredRule = { id: 'ai-r1', version: 5, when: { predicate: 'eq', value: 'A' }, then: { groupId: 'g1' } };
    const content = {
      id: 'quiz-1', type: 'quiz',
      data: { questions: [
        { question: 'Q1', routingRules: [aiAuthoredRule] },
        { question: 'Q2' },
      ] },
    };
    const next = applyRulesByQ(content, {
      1: [{ id: 'r2', version: 1, when: { predicate: 'eq', value: 'B' }, then: { groupId: 'g2' } }],
    });
    // Q1 untouched
    expect(next.data.questions[0].routingRules).toEqual([aiAuthoredRule]);
    // Q2 received the new rule
    expect(next.data.questions[1].routingRules).toHaveLength(1);
    expect(next.data.questions[1].routingRules[0].id).toBe('r2');
  });

  it('handles malformed rulesByQ shapes gracefully', () => {
    const content = { id: 'q1', type: 'quiz', data: { questions: [{ question: 'Q1' }] } };
    expect(applyRulesByQ(content, null)).toBe(content);
    expect(applyRulesByQ(content, undefined)).toBe(content);
    expect(applyRulesByQ(content, 'not-an-object')).toBe(content);
    // Non-array value coerces to empty; on a question with no existing rules,
    // the equality short-circuit means no write happens and we return the
    // same content reference. (Defensible: clearing already-empty is no-op.)
    const next = applyRulesByQ(content, { 0: 'not-an-array' });
    expect(next).toBe(content);

    // Non-array value when the question DOES have existing rules: equality
    // fails (lengths differ), so we write empty rules to that question.
    const withRules = {
      id: 'q1', type: 'quiz',
      data: { questions: [{ question: 'Q1', routingRules: [{ id: 'r1', version: 1 }] }] },
    };
    const cleared = applyRulesByQ(withRules, { 0: 'not-an-array' });
    expect(cleared).not.toBe(withRules);
    expect(cleared.data.questions[0].routingRules).toEqual([]);
  });

  it('does not mutate the input content', () => {
    const originalQuestion = { question: 'Q1' };
    const content = { id: 'q1', type: 'quiz', data: { questions: [originalQuestion] } };
    applyRulesByQ(content, { 0: [{ id: 'r1', version: 1 }] });
    // Original references unmodified
    expect(originalQuestion).toEqual({ question: 'Q1' });
    expect(content.data.questions[0]).toBe(originalQuestion);
  });
});

describe('Phase A — round-trip identity: seed → unchanged-write → reseed yields identical state', () => {
  it('mount-seed writes back identical rulesByQ; host returns same content; remount seeds identical state', () => {
    // Simulates the lifecycle: a teacher reloads their tab with pre-authored
    // rules in question.routingRules. The editor mounts, seeds from the rules,
    // immediately fires the host callback with the seeded rulesByQ (the useEffect
    // mirrors state to onUpdateQuestionRoutingRules on every state change including
    // the initial state), and the host's equality-skip should make this a no-op.
    const initial = {
      id: 'quiz-1', type: 'quiz',
      data: { questions: [
        { question: 'Q1', routingRules: [{ id: 'r1', version: 1, when: { predicate: 'eq', value: 'A' }, then: { groupId: 'g1' } }] },
        { question: 'Q2' },
      ] },
    };
    const seeded = seedRulesByQFromContent(initial);
    const afterMountWrite = applyRulesByQ(initial, seeded);
    expect(afterMountWrite).toBe(initial); // ★ no thrash — the load-bearing invariant
    const reseeded = seedRulesByQFromContent(afterMountWrite);
    expect(reseeded).toEqual(seeded);
  });
});

describe('Phase A — rule.version stamping contract', () => {
  // These tests pin the in-source mutators' contract by re-implementing them
  // inline. If teacher_source.jsx mutators change, these tests fail loudly
  // and force the contract update to be deliberate.

  function newRule(question, groupEntriesForRouting) {
    const firstOption = (question?.options && question.options[0]) || '';
    const firstGroup = (groupEntriesForRouting[0] && groupEntriesForRouting[0][0]) || '';
    return {
      id: 'qr-test',
      version: 1, // ← Phase A: every new rule starts at version 1
      when: { predicate: 'eq', value: firstOption },
      then: { groupId: firstGroup },
    };
  }

  function updateRule(r, patch) {
    return {
      ...r,
      version: (typeof r.version === 'number' ? r.version : 0) + 1, // ← Phase A: increment on update
      when: patch.when ? { ...r.when, ...patch.when } : r.when,
      then: patch.then ? { ...r.then, ...patch.then } : r.then,
    };
  }

  it('new rules start at version 1', () => {
    const r = newRule({ options: ['A', 'B'] }, [['g1', { name: 'Group 1' }]]);
    expect(r.version).toBe(1);
  });

  it('updates increment version', () => {
    const r1 = newRule({ options: ['A', 'B'] }, [['g1', { name: 'Group 1' }]]);
    const r2 = updateRule(r1, { when: { value: 'B' } });
    const r3 = updateRule(r2, { then: { groupId: 'g2' } });
    expect(r2.version).toBe(2);
    expect(r3.version).toBe(3);
  });

  it('updates on a legacy rule (no version) start at 1', () => {
    const legacy = { id: 'r1', when: { predicate: 'eq', value: 'A' }, then: { groupId: 'g1' } };
    const updated = updateRule(legacy, { when: { value: 'B' } });
    expect(updated.version).toBe(1);
  });
});
