import { describe, expect, it } from 'vitest';

import {
  repositoryFixture,
  EVALUATOR,
  TEACHER_ONE,
} from './helpers/educator_evaluation_gs_harness.js';

const COMPLETE_DOMAINS = { d1: 3, d2: 2, d3: 3, d4: 2 };
const COMPLETE_RATIONALES = {
  d1: 'Planning judgment based on released evidence.',
  d2: 'Environment judgment based on released evidence.',
  d3: 'Instruction judgment based on released evidence.',
  d4: 'Professional-responsibility judgment based on released evidence.',
};
const COMPLETE_REFS = {
  d1: ['walkthrough:walk-t1'],
  d2: ['walkthrough:walk-t1'],
  d3: ['walkthrough:walk-t1'],
  d4: ['walkthrough:walk-t1'],
};

function stageAnnualJudgment(harness, overrides = {}) {
  harness.setActiveEmail(EVALUATOR);
  const boot = harness.invoke('bootstrap');
  const profile = boot.workspace.teachers.find((item) => item.id === 't1');
  profile.ratings = {
    domains: { ...COMPLETE_DOMAINS, ...(overrides.domains || {}) },
    building: 2,
    teacher: 2,
    lea: 2,
  };
  profile.annualRationales = {
    ...COMPLETE_RATIONALES,
    ...(overrides.rationales || {}),
  };
  profile.annualEvidenceRefs = {
    ...COMPLETE_REFS,
    ...(overrides.refs || {}),
  };
  return harness.invoke('saveWorkspace', {
    expectedVersion: boot.revision,
    workspace: boot.workspace,
    mutation: { event: 'RATING_UPDATED' },
  });
}

function releaseAnnualJudgment(harness) {
  harness.setActiveEmail(EVALUATOR);
  const boot = harness.invoke('bootstrap');
  const profile = boot.workspace.teachers.find((item) => item.id === 't1');
  profile.finalizedAt = '2000-01-01T00:00:00.000Z';
  return harness.invoke('saveWorkspace', {
    expectedVersion: boot.revision,
    workspace: boot.workspace,
    mutation: {
      teacherId: 't1',
      event: 'RELEASED',
      entityType: 'educator_cycle',
      entityId: 't1',
      version: 1,
    },
  });
}

function releaseError(harness) {
  harness.setActiveEmail(EVALUATOR);
  const boot = harness.invoke('bootstrap');
  const profile = boot.workspace.teachers.find((item) => item.id === 't1');
  profile.finalizedAt = '2000-01-01T00:00:00.000Z';
  return harness.invokeError('saveWorkspace', {
    expectedVersion: boot.revision,
    workspace: boot.workspace,
    mutation: {
      teacherId: 't1',
      event: 'RELEASED',
      entityType: 'educator_cycle',
      entityId: 't1',
      version: 1,
    },
  });
}

function addUnlockedSpm(harness) {
  harness.setActiveEmail(TEACHER_ONE);
  let boot = harness.invoke('bootstrap');
  boot.workspace.spms.push({
    id: 'spm-unlocked',
    teacherId: 't1',
    status: 'draft',
    version: 1,
    context: 'Annual evidence regression fixture',
    baseline: 'Baseline evidence',
    goal: 'Document expected growth',
    measures: 'Common assessment',
    actionPlan: 'Teach, assess, and adjust',
    results: '',
    reflection: '',
    revisions: [],
  });
  const created = harness.invoke('saveWorkspace', {
    expectedVersion: boot.revision,
    workspace: boot.workspace,
    mutation: {
      teacherId: 't1',
      event: 'CREATED',
      entityType: 'spm',
      entityId: 'spm-unlocked',
      version: 1,
    },
  });
  if (!created.ok) return created;
  boot = harness.invoke('bootstrap');
  boot.workspace.spms.find((item) => item.id === 'spm-unlocked').status = 'submitted';
  return harness.invoke('saveWorkspace', {
    expectedVersion: boot.revision,
    workspace: boot.workspace,
    mutation: {
      teacherId: 't1',
      event: 'SUBMITTED',
      entityType: 'spm',
      entityId: 'spm-unlocked',
      version: 1,
    },
  });
}

describe('Educator Evaluation annual judgment provenance', () => {
  it('requires a rationale and at least one eligible released evidence record for every rated domain', () => {
    const missingRationale = repositoryFixture();
    expect(stageAnnualJudgment(missingRationale, { rationales: { d3: '' } }).ok).toBe(true);
    let error = releaseError(missingRationale);
    expect(error.code).toBe('invalid_transition');
    expect(String(error.message || error)).toMatch(/written rationale for every rated domain/i);

    const missingEvidence = repositoryFixture();
    expect(stageAnnualJudgment(missingEvidence, { refs: { d2: [] } }).ok).toBe(true);
    error = releaseError(missingEvidence);
    expect(error.code).toBe('invalid_transition');
    expect(String(error.message || error)).toMatch(/at least one eligible evidence record for every rated domain/i);
  });

  it('rejects malformed references at the storage boundary', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const boot = harness.invoke('bootstrap');
    const profile = boot.workspace.teachers.find((item) => item.id === 't1');
    profile.ratings = { domains: COMPLETE_DOMAINS, building: 2, teacher: 2, lea: 2 };
    profile.annualRationales = COMPLETE_RATIONALES;
    profile.annualEvidenceRefs = { ...COMPLETE_REFS, d1: ['unsupported:walk-t1'] };
    const error = harness.invokeError('saveWorkspace', {
      expectedVersion: boot.revision,
      workspace: boot.workspace,
      mutation: { event: 'RATING_UPDATED' },
    });
    expect(error.code).toBe('bad_request');
    expect(String(error.message || error)).toMatch(/invalid record type/i);
  });

  it.each([
    ['unresolved record', 'walkthrough:missing-record'],
    ['private walkthrough', 'walkthrough:walk-t1-private'],
    ['another educator\'s released record', 'walkthrough:walk-t2'],
    ['unpublished formal-observation evidence', 'formal_observation:obs-t1'],
  ])('rejects a canonical reference to an ineligible %s', (_label, token) => {
    const harness = repositoryFixture();
    expect(stageAnnualJudgment(harness, { refs: { d1: [token] } }).ok).toBe(true);
    const error = releaseError(harness);
    expect(error.code).toBe('invalid_transition');
    expect(String(error.message || error)).toMatch(/this educator's published walkthrough, published formal-observation evidence, or locked student performance measure/i);
  });

  it('rejects an unlocked student performance measure reference', () => {
    const harness = repositoryFixture();
    expect(addUnlockedSpm(harness).ok).toBe(true);
    expect(stageAnnualJudgment(harness, { refs: { d4: ['spm:spm-unlocked'] } }).ok).toBe(true);
    const error = releaseError(harness);
    expect(error.code).toBe('invalid_transition');
    expect(String(error.message || error)).toMatch(/locked student performance measure/i);
  });

  it('does not let rationale or evidence provenance substitute for a missing weighted rating', () => {
    const harness = repositoryFixture();
    expect(stageAnnualJudgment(harness, {
      domains: { d4: null },
      rationales: { d4: 'This must not survive without a rating.' },
      refs: { d4: ['walkthrough:walk-t1'] },
    }).ok).toBe(true);
    const error = releaseError(harness);
    expect(error.code).toBe('invalid_transition');
    expect(String(error.message || error)).toMatch(/every weighted rating input/i);
  });

  it('server-finalizes eligible provenance and preserves it in the immutable cycle snapshot', () => {
    const harness = repositoryFixture();
    expect(stageAnnualJudgment(harness).ok).toBe(true);
    const released = releaseAnnualJudgment(harness);
    expect(released.ok).toBe(true);
    const profile = released.workspace.teachers.find((item) => item.id === 't1');
    expect(profile.annualRationales).toEqual(COMPLETE_RATIONALES);
    expect(profile.annualEvidenceRefs).toEqual(COMPLETE_REFS);
    const snapshot = released.workspace.cycleSnapshots.find(
      (item) => item.teacherId === 't1' && item.academicYear === '2026-27',
    );
    expect(snapshot).toMatchObject({
      domainRatings: COMPLETE_DOMAINS,
      annualRationales: COMPLETE_RATIONALES,
      annualEvidenceRefs: COMPLETE_REFS,
    });
  });
});

describe('Educator Evaluation controlled walkthrough draft discard', () => {
  it('deletes only the exact unpublished, uncommented draft and records the audited action', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const boot = harness.invoke('bootstrap');
    boot.workspace.walkthroughs = boot.workspace.walkthroughs.filter((item) => item.id !== 'walk-t1-private');
    const saved = harness.invoke('saveWorkspace', {
      expectedVersion: boot.revision,
      workspace: boot.workspace,
      mutation: {
        teacherId: 't1',
        event: 'DRAFT_DISCARDED',
        entityType: 'walkthrough',
        entityId: 'walk-t1-private',
        version: 1,
      },
    });
    expect(saved.ok).toBe(true);
    expect(saved.workspace.walkthroughs.some((item) => item.id === 'walk-t1-private')).toBe(false);
    expect(saved.workspace.walkthroughs.some((item) => item.id === 'walk-t1')).toBe(true);
    expect(saved.workspace.audit[0]).toMatchObject({
      teacherId: 't1',
      event: 'DRAFT_DISCARDED',
      entityType: 'walkthrough',
      entityId: 'walk-t1-private',
    });
    expect(harness.rows('Audit').at(-1)[2]).toBe('DRAFT_DISCARDED');
  });

  it('preserves an omitted draft unless the caller uses the exact discard action', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const boot = harness.invoke('bootstrap');
    boot.workspace.walkthroughs = boot.workspace.walkthroughs.filter((item) => item.id !== 'walk-t1-private');
    const saved = harness.invoke('saveWorkspace', {
      expectedVersion: boot.revision,
      workspace: boot.workspace,
      mutation: { event: 'DRAFT_SAVED' },
    });
    expect(saved.ok).toBe(true);
    expect(saved.workspace.walkthroughs.some((item) => item.id === 'walk-t1-private')).toBe(true);
  });

  it('rejects deletion of published walkthrough evidence', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const boot = harness.invoke('bootstrap');
    boot.workspace.walkthroughs = boot.workspace.walkthroughs.filter((item) => item.id !== 'walk-t1');
    const error = harness.invokeError('saveWorkspace', {
      expectedVersion: boot.revision,
      workspace: boot.workspace,
      mutation: {
        teacherId: 't1',
        event: 'DRAFT_DISCARDED',
        entityType: 'walkthrough',
        entityId: 'walk-t1',
        version: 1,
      },
    });
    expect(error.code).toBe('immutable');
    expect(harness.invoke('bootstrap').workspace.walkthroughs.some((item) => item.id === 'walk-t1')).toBe(true);
  });

  it('rejects comments on unpublished walkthroughs and keeps an untouched draft discardable', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    let boot = harness.invoke('bootstrap');
    boot.workspace.comments.push({
      id: 'private-draft-comment',
      teacherId: 't1',
      recordType: 'walkthrough',
      recordId: 'walk-t1-private',
      text: 'Shared review context.',
    });
    const commentError = harness.invokeError('saveWorkspace', {
      expectedVersion: boot.revision,
      workspace: boot.workspace,
      mutation: {
        teacherId: 't1',
        event: 'COMMENTED',
        entityType: 'walkthrough',
        entityId: 'walk-t1-private',
        version: 1,
      },
    });
    expect(commentError.code).toBe('invalid_transition');
    expect(harness.invoke('bootstrap').workspace.comments.some((item) => item.id === 'private-draft-comment')).toBe(false);

    boot = harness.invoke('bootstrap');
    boot.workspace.walkthroughs = boot.workspace.walkthroughs.filter((item) => item.id !== 'walk-t1-private');
    const discarded = harness.invoke('saveWorkspace', {
      expectedVersion: boot.revision,
      workspace: boot.workspace,
      mutation: {
        teacherId: 't1',
        event: 'DRAFT_DISCARDED',
        entityType: 'walkthrough',
        entityId: 'walk-t1-private',
        version: 1,
      },
    });
    expect(discarded.ok).toBe(true);
    expect(discarded.workspace.walkthroughs.some((item) => item.id === 'walk-t1-private')).toBe(false);
  });

  it('cannot use DRAFT_DISCARDED to delete another record type', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const boot = harness.invoke('bootstrap');
    boot.workspace.observations = boot.workspace.observations.filter((item) => item.id !== 'obs-t1');
    const error = harness.invokeError('saveWorkspace', {
      expectedVersion: boot.revision,
      workspace: boot.workspace,
      mutation: {
        teacherId: 't1',
        event: 'DRAFT_DISCARDED',
        entityType: 'formal_observation',
        entityId: 'obs-t1',
        version: 1,
      },
    });
    expect(error.code).toBe('invalid_transition');
    expect(harness.invoke('bootstrap').workspace.observations.some((item) => item.id === 'obs-t1')).toBe(true);
  });
});
