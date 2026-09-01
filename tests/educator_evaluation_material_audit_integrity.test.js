import { describe, expect, it } from 'vitest';

import {
  repositoryFixture,
  EVALUATOR,
  FIXED_NOW,
} from './helpers/educator_evaluation_gs_harness.js';

const PROFILE_SUMMARY = 'Educator profile updated';
const RATING_SUMMARY = 'Educator annual judgment updated';

const profileMutation = (overrides = {}) => ({
  teacherId: 't1',
  event: 'PROFILE_UPDATED',
  summary: 'Untrusted client profile summary',
  entityType: 'educator_cycle',
  entityId: 't1',
  version: 1,
  ...overrides,
});

const ratingMutation = (overrides = {}) => ({
  teacherId: 't1',
  event: 'RATING_UPDATED',
  summary: 'Untrusted client rating summary',
  entityType: 'educator_cycle',
  entityId: 't1',
  version: 1,
  ...overrides,
});

function saveAs(harness, mutate, mutation, email = EVALUATOR) {
  harness.setActiveEmail(email);
  const boot = harness.invoke('bootstrap');
  mutate(boot.workspace);
  return harness.invoke('saveWorkspace', {
    expectedVersion: boot.revision,
    workspace: boot.workspace,
    mutation,
  });
}

function latestAuditRow(harness) {
  return harness.rows('Audit').at(-1);
}

function expectCanonicalAuditRow(row, expected) {
  expect(row.slice(1, 10)).toEqual([
    expected.teacherId,
    expected.event,
    expected.summary,
    expected.entityType,
    expected.entityId,
    expected.version || 1,
    EVALUATOR,
    'evaluator',
    FIXED_NOW,
  ]);
}

function expectAtomicRejection(harness, mutate, mutation, code = 'invalid_transition') {
  harness.setActiveEmail(EVALUATOR);
  const before = harness.invoke('bootstrap');
  const submitted = JSON.parse(JSON.stringify(before.workspace));
  const auditBefore = harness.rows('Audit');
  mutate(submitted);

  const error = harness.invokeError('saveWorkspace', {
    expectedVersion: before.revision,
    workspace: submitted,
    mutation,
  });

  expect(error.code).toBe(code);
  const after = harness.invoke('bootstrap');
  expect(after.revision).toBe(before.revision);
  expect(after.workspace).toEqual(before.workspace);
  expect(harness.rows('Audit')).toEqual(auditBefore);
  return error;
}

function activityTimestamps(workspace) {
  const collect = (items) => (items || [])
    .map((item) => [item.id, item.updatedAt || null])
    .sort((left, right) => left[0].localeCompare(right[0]));
  return {
    teachers: (workspace.teachers || [])
      .map((teacher) => [teacher.id, teacher.lastActivityAt || null])
      .sort((left, right) => left[0].localeCompare(right[0])),
    walkthroughs: collect(workspace.walkthroughs),
    observations: collect(workspace.observations),
    spms: collect(workspace.spms),
  };
}

function seedResultsSubmittedSpm(harness) {
  harness.setActiveEmail(EVALUATOR);
  const boot = harness.invoke('bootstrap');
  boot.workspace.spms.push({
    id: 'spm-material-audit',
    teacherId: 't1',
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    status: 'results_submitted',
    version: 1,
    context: 'Course context',
    baseline: 'Baseline measure',
    goal: 'Growth goal',
    measures: 'District assessment',
    actionPlan: 'Instructional plan',
    returnReason: '',
    pendingReturnReason: '',
    results: 'Documented results',
    reflection: 'Educator reflection',
    rating: null,
    ratingRationale: '',
    approvedBy: 'Principal Rivera',
    revisions: [],
    submittedAt: FIXED_NOW,
    firstOpenedAt: FIXED_NOW,
    returnedAt: null,
    approvedAt: FIXED_NOW,
    resultsSubmittedAt: FIXED_NOW,
    lockedAt: null,
  });
  harness.replaceWorkspace(harness.invoke('sanitizeStoredWorkspace_', boot.workspace));
}

describe('educator evaluation material audit integrity', () => {
  it('writes one canonical PROFILE_UPDATED audit with server-owned actor attribution', () => {
    const harness = repositoryFixture();
    const auditBefore = harness.rows('Audit').length;
    const saved = saveAs(harness, (workspace) => {
      workspace.teachers.find((teacher) => teacher.id === 't1').assignment = 'Instructional coach';
    }, profileMutation({ summary: 'Instructional coach' }));

    expect(saved.ok).toBe(true);
    expect(harness.rows('Audit')).toHaveLength(auditBefore + 1);
    const row = latestAuditRow(harness);
    expectCanonicalAuditRow(row, {
      teacherId: 't1',
      event: 'PROFILE_UPDATED',
      summary: PROFILE_SUMMARY,
      entityType: 'educator_cycle',
      entityId: 't1',
    });
    expect(JSON.stringify(row)).not.toContain('Instructional coach');
    expect(saved.workspace.audit[0]).toMatchObject({
      teacherId: 't1',
      event: 'PROFILE_UPDATED',
      summary: PROFILE_SUMMARY,
      entityType: 'educator_cycle',
      entityId: 't1',
      actor: 'Principal Rivera',
      actorEmail: EVALUATOR,
      actorRole: 'evaluator',
      at: FIXED_NOW,
    });
  });

  it('writes one canonical content-free RATING_UPDATED audit for a bound annual judgment', () => {
    const harness = repositoryFixture();
    const auditBefore = harness.rows('Audit').length;
    const sensitiveRationale = 'Confidential rationale text must not enter the audit summary.';
    const saved = saveAs(harness, (workspace) => {
      const teacher = workspace.teachers.find((item) => item.id === 't1');
      teacher.ratings.domains.d1 = 3;
      teacher.annualRationales.d1 = sensitiveRationale;
    }, ratingMutation({ summary: sensitiveRationale }));

    expect(saved.ok).toBe(true);
    expect(harness.rows('Audit')).toHaveLength(auditBefore + 1);
    const row = latestAuditRow(harness);
    expectCanonicalAuditRow(row, {
      teacherId: 't1',
      event: 'RATING_UPDATED',
      summary: RATING_SUMMARY,
      entityType: 'educator_cycle',
      entityId: 't1',
    });
    expect(JSON.stringify(row)).not.toContain(sensitiveRationale);
  });

  it('derives the canonical annual-rating scope for the legacy event-only payload', () => {
    const harness = repositoryFixture();
    const auditBefore = harness.rows('Audit').length;
    const saved = saveAs(harness, (workspace) => {
      workspace.teachers.find((teacher) => teacher.id === 't1').ratings.domains.d2 = 2;
    }, { event: 'RATING_UPDATED', summary: 'Client-controlled summary' });

    expect(saved.ok).toBe(true);
    expect(harness.rows('Audit')).toHaveLength(auditBefore + 1);
    expectCanonicalAuditRow(latestAuditRow(harness), {
      teacherId: 't1',
      event: 'RATING_UPDATED',
      summary: RATING_SUMMARY,
      entityType: 'educator_cycle',
      entityId: 't1',
    });
  });

  it.each([
    ['PROFILE_UPDATED', profileMutation()],
    ['RATING_UPDATED', ratingMutation()],
  ])('keeps repeated no-op %s saves quiet and idempotent', (_event, mutation) => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const auditBefore = harness.rows('Audit');
    const before = harness.invoke('bootstrap');
    const original = before.workspace;

    const first = saveAs(harness, () => {}, mutation);
    const second = saveAs(harness, () => {}, mutation);
    expect(first).toMatchObject({ ok: true, revision: before.revision, version: before.revision });
    expect(second).toMatchObject({ ok: true, revision: before.revision, version: before.revision });
    expect(harness.rows('Audit')).toEqual(auditBefore);

    const persisted = harness.invoke('bootstrap').workspace;
    expect(persisted.teachers).toEqual(original.teachers);
    expect(persisted.walkthroughs).toEqual(original.walkthroughs);
    expect(persisted.observations).toEqual(original.observations);
    expect(persisted.spms).toEqual(original.spms);
  });

  it('does not fan out activity timestamps during a scoped no-op profile save', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const before = harness.invoke('bootstrap');
    const timestampsBefore = activityTimestamps(before.workspace);
    const auditBefore = harness.rows('Audit');
    harness.setClock('2026-09-01T12:00:00.000Z');

    const saved = harness.invoke('saveWorkspace', {
      expectedVersion: before.revision,
      workspace: before.workspace,
      mutation: profileMutation(),
    });

    expect(saved.ok).toBe(true);
    expect(activityTimestamps(saved.workspace)).toEqual(timestampsBefore);
    expect(harness.rows('Audit')).toEqual(auditBefore);
  });

  it.each([
    ['profile change mislabeled as rating', (workspace) => {
      workspace.teachers.find((teacher) => teacher.id === 't1').assignment = 'Mislabeled assignment';
    }, ratingMutation()],
    ['rating change mislabeled as profile', (workspace) => {
      workspace.teachers.find((teacher) => teacher.id === 't1').ratings.domains.d1 = 3;
    }, profileMutation()],
  ])('atomically rejects a %s', (_label, mutate, mutation) => {
    expectAtomicRejection(repositoryFixture(), mutate, mutation);
  });

  it('atomically rejects a claimed t1 mutation that actually changes an authorized peer', () => {
    expectAtomicRejection(repositoryFixture(), (workspace) => {
      workspace.teachers.find((teacher) => teacher.id === 'peer-02').assignment = 'Changed peer assignment';
    }, profileMutation());
  });

  it('atomically rejects one material event that changes two educators', () => {
    expectAtomicRejection(repositoryFixture(), (workspace) => {
      workspace.teachers.find((teacher) => teacher.id === 't1').assignment = 'First changed assignment';
      workspace.teachers.find((teacher) => teacher.id === 'peer-02').assignment = 'Second changed assignment';
    }, profileMutation());
  });

  it('atomically rejects profile and annual-rating changes for the same educator in one save', () => {
    expectAtomicRejection(repositoryFixture(), (workspace) => {
      const teacher = workspace.teachers.find((item) => item.id === 't1');
      teacher.assignment = 'Changed assignment';
      teacher.ratings.domains.d1 = 3;
    }, profileMutation());
  });

  it.each([
    ['wrong educator entity id', profileMutation({ entityId: 'peer-02' })],
    ['wrong entity type', profileMutation({ entityType: 'formal_observation', entityId: 'obs-t1' })],
  ])('atomically rejects a material profile change with the %s', (_label, mutation) => {
    expectAtomicRejection(repositoryFixture(), (workspace) => {
      workspace.teachers.find((teacher) => teacher.id === 't1').assignment = 'Binding mismatch';
    }, mutation);
  });

  it('atomically rejects an annual rating piggybacked on a durable walkthrough publication', () => {
    expectAtomicRejection(repositoryFixture(), (workspace) => {
      workspace.teachers.find((teacher) => teacher.id === 't1').ratings.domains.d1 = 3;
      workspace.walkthroughs.find((record) => record.id === 'walk-t1-private').publishedAt = '2030-01-01T00:00:00.000Z';
    }, {
      teacherId: 't1',
      event: 'EVIDENCE_PUBLISHED',
      entityType: 'walkthrough',
      entityId: 'walk-t1-private',
      version: 1,
    });
  });

  it('atomically rejects an annual rating combined with a private walkthrough evidence edit', () => {
    expectAtomicRejection(repositoryFixture(), (workspace) => {
      workspace.teachers.find((teacher) => teacher.id === 't1').ratings.domains.d1 = 3;
      workspace.walkthroughs.find((record) => record.id === 'walk-t1-private').evidence = 'Altered private evaluator evidence';
    }, ratingMutation());
  });

  it('keeps record-level formal-observation RATING_UPDATED saves quiet', () => {
    const harness = repositoryFixture();
    const auditBefore = harness.rows('Audit');
    const saved = saveAs(harness, (workspace) => {
      workspace.observations.find((record) => record.id === 'obs-t1').ratings.d1 = 2;
    }, {
      teacherId: 't1',
      event: 'RATING_UPDATED',
      entityType: 'formal_observation',
      entityId: 'obs-t1',
      version: 1,
    });

    expect(saved.ok).toBe(true);
    expect(saved.workspace.observations.find((record) => record.id === 'obs-t1').ratings.d1).toBe(2);
    expect(harness.rows('Audit')).toEqual(auditBefore);
  });

  it('keeps record-level SPM RATING_UPDATED saves quiet', () => {
    const harness = repositoryFixture();
    seedResultsSubmittedSpm(harness);
    const auditBefore = harness.rows('Audit');
    const saved = saveAs(harness, (workspace) => {
      const spm = workspace.spms.find((record) => record.id === 'spm-material-audit');
      spm.rating = 3;
      spm.ratingRationale = 'Evaluator record-level rationale';
    }, {
      teacherId: 't1',
      event: 'RATING_UPDATED',
      entityType: 'spm',
      entityId: 'spm-material-audit',
      version: 1,
    });

    expect(saved.ok).toBe(true);
    expect(saved.workspace.spms.find((record) => record.id === 'spm-material-audit')).toMatchObject({
      rating: 3,
      ratingRationale: 'Evaluator record-level rationale',
    });
    expect(harness.rows('Audit')).toEqual(auditBefore);
  });
});
