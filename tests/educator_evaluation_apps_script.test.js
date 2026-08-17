// Educator Evaluation Apps Script repository -- real Code.gs in a VM.
// These mocks supply district-owned Apps Script primitives; the policy under
// test remains the production server implementation.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { makeAppsScriptHarness, repositoryFixture, teacher, snapshot, GS_SOURCE, DOMAIN, ADMIN, EVALUATOR, TEACHER_ONE, TEACHER_TWO, FIXED_NOW } from './helpers/educator_evaluation_gs_harness.js';

const teacherIds = workspace => workspace.teachers.map(item => item.id).sort();
function createSubmittedSpm(harness, id = 'spm-t1') {
  harness.setActiveEmail(TEACHER_ONE);
  let boot = harness.invoke('bootstrap');
  boot.workspace.spms.push({
    id, teacherId: 't1', status: 'draft', version: 1,
    context: 'Grade 5 mathematics unit', baseline: 'Baseline evidence',
    goal: 'Students will demonstrate expected growth', measures: 'Common assessment and work samples',
    actionPlan: 'Teach, assess, and adjust', results: '', reflection: '', revisions: [],
  });
  let saved = harness.invoke('saveWorkspace', {
    expectedVersion: boot.revision, workspace: boot.workspace,
    mutation: { teacherId: 't1', event: 'CREATED', entityType: 'spm', entityId: id, version: 1 },
  });
  boot = harness.invoke('bootstrap');
  const spm = boot.workspace.spms.find(item => item.id === id);
  spm.status = 'submitted';
  spm.submittedAt = '2000-01-01T00:00:00.000Z';
  saved = harness.invoke('saveWorkspace', {
    expectedVersion: boot.revision, workspace: boot.workspace,
    mutation: { teacherId: 't1', event: 'SUBMITTED', entityType: 'spm', entityId: id, version: 1 },
  });
  if (!saved.ok) throw new Error('SPM fixture failed');
  return saved;
}

function saveObservationStep(harness, email, event, mutate) {
  harness.setActiveEmail(email);
  const boot = harness.invoke('bootstrap');
  const observation = boot.workspace.observations.find(item => item.id === 'obs-t1');
  mutate(observation);
  const saved = harness.invoke('saveWorkspace', {
    expectedVersion: boot.revision, workspace: boot.workspace,
    mutation: { teacherId: 't1', event, entityType: 'formal_observation', entityId: 'obs-t1', version: 1 },
  });
  if (!saved.ok) throw new Error('Observation step failed: ' + JSON.stringify(saved));
  return saved;
}

function advanceObservationToSigned(harness) {
  saveObservationStep(harness, TEACHER_ONE, 'SUBMITTED', observation => {
    observation.prework = { plan: 'Canonical lesson plan', outcomes: 'Canonical expected outcomes', resources: 'Canonical resources', assessment: 'Canonical assessment', artifactReferences: 'artifact-1' };
    observation.preworkSubmittedAt = '2000-01-01T00:00:00.000Z';
  });
  saveObservationStep(harness, EVALUATOR, 'CONFERENCED', observation => {
    observation.preConferenceNotes = 'Canonical pre-conference note';
    observation.preConferenceAt = '2000-01-01T00:00:00.000Z';
  });
  saveObservationStep(harness, EVALUATOR, 'OBSERVATION_STARTED', observation => {
    observation.observedLocal = '2026-08-13T09:30';
    observation.observedAt = '2000-01-01T00:00:00.000Z';
  });
  saveObservationStep(harness, EVALUATOR, 'EVIDENCE_PUBLISHED', observation => {
    observation.evidence = 'Canonical published evidence';
    observation.componentTags = ['2c', '3b'];
    observation.privacyChecked = true;
    observation.evidencePublishedAt = '2000-01-01T00:00:00.000Z';
  });
  saveObservationStep(harness, TEACHER_ONE, 'SUBMITTED', observation => {
    observation.reflection = 'Canonical teacher reflection';
    observation.reflectionSubmittedAt = '2000-01-01T00:00:00.000Z';
  });
  saveObservationStep(harness, EVALUATOR, 'CONFERENCED', observation => {
    observation.postConferenceNotes = 'Canonical post-conference note';
    observation.postConferenceAt = '2000-01-01T00:00:00.000Z';
  });
  return saveObservationStep(harness, EVALUATOR, 'SIGNED', observation => {
    observation.ratings = { d1: 2, d2: 2, d3: 3, d4: 2 };
    observation.rationales = { d1: 'Canonical rationale 1', d2: 'Canonical rationale 2', d3: 'Canonical rationale 3', d4: 'Canonical rationale 4' };
    observation.evaluatorSignedAt = '2000-01-01T00:00:00.000Z';
  });
}

describe('Educator Evaluation Apps Script identity and authorization', () => {
  it('fails closed when Workspace identity is missing, outside the domain, or not a member', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail('');
    expect(harness.invokeError('bootstrap').code).toBe('identity_unavailable');
    harness.setActiveEmail('principal@outside.example');
    expect(harness.invokeError('bootstrap').code).toBe('wrong_domain');
    harness.setActiveEmail(`unknown@${DOMAIN}`);
    expect(harness.invokeError('bootstrap').code).toBe('not_member');
  });

  it('combines active membership, role, and explicit evaluator assignment', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const evaluator = harness.invoke('bootstrap');
    expect(teacherIds(evaluator.workspace)).toContain('t1');
    expect(teacherIds(evaluator.workspace)).toContain('peer-10');
    expect(teacherIds(evaluator.workspace)).not.toContain('t2');

    harness.setActiveEmail(TEACHER_ONE);
    const teacherView = harness.invoke('bootstrap');
    expect(teacherIds(teacherView.workspace)).toEqual(['t1']);
    expect(teacherView.workspace.walkthroughs.map(item => item.id)).toEqual(['walk-t1']);
    expect(teacherView.workspace.audit.every(item => item.teacherId === 't1')).toBe(true);
  });

  it('denies another teacher even when actor fields are forged', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(TEACHER_ONE);
    const boot = harness.invoke('bootstrap');
    boot.workspace.comments.push({ id: 'forged-comment', teacherId: 't2', recordType: 'walkthrough', recordId: 'walk-t2', text: 'Unauthorized', actorEmail: TEACHER_TWO, actorRole: 'admin', author: 'Forged administrator' });
    const error = harness.invokeError('saveWorkspace', {
      expectedVersion: boot.revision, workspace: boot.workspace,
      mutation: { teacherId: 't2', event: 'COMMENTED', entityType: 'walkthrough', entityId: 'walk-t2' },
    });
    expect(error.code).toBe('denied');
    expect(harness.rows('Messages')).toHaveLength(1);
  });
});

describe('Educator Evaluation Apps Script concurrency and append-only records', () => {
  it('returns an optimistic-version conflict without overwriting current state', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(ADMIN);
    const current = harness.invoke('bootstrap');
    const stale = harness.invoke('saveWorkspace', {
      expectedVersion: current.revision - 1, workspace: current.workspace,
      mutation: { event: 'STALE', summary: 'Stale write', entityType: 'workspace', entityId: 'workspace', version: 1 },
    });
    expect(stale).toMatchObject({ ok: false, code: 'conflict', revision: current.revision });
    expect(harness.invoke('bootstrap').revision).toBe(current.revision);
  });

  it('server-stamps message and audit actor/time and prevents edits', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(TEACHER_ONE);
    let boot = harness.invoke('bootstrap');
    boot.workspace.comments.push({
      id: 'client-id', teacherId: 't1', recordType: 'walkthrough', recordId: 'walk-t1', text: 'Please clarify the next step.',
      author: 'Forged Principal', role: 'Evaluator', at: '2000-01-01T00:00:00.000Z', version: 999,
    });
    const messageSave = harness.invoke('saveWorkspace', {
      expectedVersion: boot.revision, workspace: boot.workspace,
      mutation: { teacherId: 't1', event: 'COMMENTED', entityType: 'walkthrough', entityId: 'walk-t1' },
    });
    const message = messageSave.workspace.comments.find(item => item.id === 'client-id');
    expect(message).toMatchObject({ teacherId: 't1', author: 'Teacher One', role: 'Teacher', at: FIXED_NOW, version: 1 });
    expect(harness.rows('Messages').at(-1).slice(1)).toEqual([
      't1', 'walkthrough', 'walk-t1', TEACHER_ONE, 'teacher', 'Please clarify the next step.', FIXED_NOW,
    ]);
    const audit = harness.rows('Audit').at(-1);
    expect(audit[2]).toBe('COMMENTED');
    expect(audit[7]).toBe(TEACHER_ONE);
    expect(audit[8]).toBe('teacher');

    boot = harness.invoke('bootstrap');
    boot.workspace.comments.find(item => item.id === 'client-id').text = 'Edited after publication';
    const immutable = harness.invokeError('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { event: 'DRAFT_SAVED' } });
    expect(immutable.code).toBe('immutable');

    harness.setClock('2026-08-13T17:16:00.000Z');
    boot = harness.invoke('bootstrap');
    boot.workspace.walkthroughs.find(item => item.id === 'walk-t1').teacherAcknowledgedAt = '1999-01-01T00:00:00.000Z';
    const acknowledgment = harness.invoke('saveWorkspace', {
      expectedVersion: boot.revision, workspace: boot.workspace,
      mutation: { teacherId: 't1', event: 'ACKNOWLEDGED', entityType: 'walkthrough', entityId: 'walk-t1', version: 1 },
    });
    expect(acknowledgment.workspace.walkthroughs.find(item => item.id === 'walk-t1').teacherAcknowledgedAt).toBe('2026-08-13T17:16:00.000Z');
  });
  it('exposes one canonical public mutation path', () => {
    expect(GS_SOURCE).not.toContain('function appendPortalMessage(');
    expect(GS_SOURCE).not.toContain('function recordPortalReceipt(');
    expect(GS_SOURCE).toContain('function saveWorkspace(');
  });
  it('keeps message JSON literal while neutralizing formula text in the Sheet index', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(TEACHER_ONE);
    const formula = '=SUM(1,1)';
    const boot = harness.invoke('bootstrap');
    boot.workspace.comments.push({ id: 'formula-comment', teacherId: 't1', recordType: 'walkthrough', recordId: 'walk-t1', text: formula });
    const saved = harness.invoke('saveWorkspace', {
      expectedVersion: boot.revision, workspace: boot.workspace,
      mutation: { teacherId: 't1', event: 'COMMENTED', entityType: 'walkthrough', entityId: 'walk-t1' },
    });
    expect(saved.workspace.comments.find(item => item.id === 'formula-comment').text).toBe(formula);
    expect(harness.invoke('bootstrap').workspace.comments.at(-1).text).toBe(formula);
    expect(harness.rows('Messages').at(-1)[6]).toBe(String.fromCharCode(39) + formula);
    expect((GS_SOURCE.match(/[.]appendRow[(]/g) || []).length).toBe(1);
    expect((GS_SOURCE.match(/[.]setValues[(]/g) || []).length).toBe(1);
  });
  it('rejects multiple new records in one save and leaves no partial repository writes', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const boot = harness.invoke('bootstrap');
    const base = { teacherId: 't1', frameworkVersion: 'Forged', prework: {}, ratings: {}, rationales: {} };
    boot.workspace.observations.push({ ...base, id: 'obs-bulk-a' }, { ...base, id: 'obs-bulk-b' });
    const auditRows = harness.rows('Audit').length;
    const error = harness.invokeError('saveWorkspace', {
      expectedVersion: boot.revision, workspace: boot.workspace,
      mutation: { teacherId: 't1', event: 'ASSIGNED', entityType: 'formal_observation', entityId: 'obs-bulk-a' },
    });
    expect(error.code).toBe('invalid_transition');
    expect(harness.invoke('bootstrap').workspace.observations.some(item => item.id.startsWith('obs-bulk-'))).toBe(false);
    expect(harness.rows('Audit')).toHaveLength(auditRows);
  });

  it('does not append a Messages row when later milestone validation rejects the save', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(TEACHER_ONE);
    const boot = harness.invoke('bootstrap');
    boot.workspace.comments.push({ id: 'rejected-comment', teacherId: 't1', recordType: 'walkthrough', recordId: 'walk-t1', text: 'Must not become an orphan row' });
    boot.workspace.walkthroughs.find(item => item.id === 'walk-t1').teacherAcknowledgedAt = '2000-01-01T00:00:00.000Z';
    const messageRows = harness.rows('Messages').length;
    const error = harness.invokeError('saveWorkspace', {
      expectedVersion: boot.revision, workspace: boot.workspace,
      mutation: { teacherId: 't1', event: 'COMMENTED', entityType: 'walkthrough', entityId: 'walk-t1' },
    });
    expect(error.code).toBe('invalid_transition');
    expect(harness.rows('Messages')).toHaveLength(messageRows);
    expect(harness.invoke('bootstrap').workspace.comments.some(item => item.id === 'rejected-comment')).toBe(false);
  });

});

describe('Educator Evaluation Apps Script notification and cohort privacy', () => {
  it('sends only a content-free portal notification to the authorized recipient', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const secret = 'Student-specific evidence that must never enter email';
    const result = harness.invoke('sendPortalNotification', {
      teacherId: 't1', target: 'teacher', text: secret, evaluationBody: secret,
      educatorName: 'Teacher One', rating: 'Unsatisfactory', recipient: `attacker@${DOMAIN}`,
    });
    expect(result).toMatchObject({ ok: true, sent: true, target: 'teacher' });
    expect(harness.sentMail).toHaveLength(1);
    const mail = harness.sentMail[0];
    expect(mail.to).toBe(TEACHER_ONE);
    expect(mail.subject).toBe('AlloFlow evaluation portal activity');
    expect(mail.body).toContain('Sign in with your district Google account');
    expect(mail.body).toContain('contains no evaluation content');
    expect(mail.body).not.toContain(secret);
    expect(mail.body).not.toContain('Teacher One');
    expect(mail.body).not.toContain('Unsatisfactory');
  });

  it('does not notify an assigned evaluator whose member account is inactive', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(ADMIN);
    harness.invoke('adminUpsertMember', { email: EVALUATOR, displayName: 'Principal Rivera', role: 'evaluator', active: false });
    harness.setActiveEmail(TEACHER_ONE);
    const error = harness.invokeError('sendPortalNotification', { teacherId: 't1', target: 'evaluator' });
    expect(error.code).toBe('not_configured');
    expect(harness.sentMail).toHaveLength(0);
  });

  it('suppresses fewer than ten distinct peers without exposing the count', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const result = harness.invoke('getPortalCohortStats', {
      teacherId: 't1', metric: 'finalScore', from: '2026-01-01', to: '2026-12-31',
    });
    expect(result).toMatchObject({ ok: true, suppressed: true, minimum: 10, metric: 'finalScore', selectedMean: 2.5 });
    expect(result).not.toHaveProperty('peerCount');
    expect(result).not.toHaveProperty('cohortMedian');
  });

  it('uses one mean per distinct teacher and reveals a median at ten peers', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const result = harness.invoke('getPortalCohortStats', { teacherId: 't1', metric: 'finalScore' });
    expect(result).toMatchObject({
      ok: true, suppressed: false, minimum: 10, peerCount: 10, selectedMean: 2.5,
      cohortMedian: 1.9, aggregation: 'median_of_distinct_teacher_means',
    });
  });
});

describe('Educator Evaluation Apps Script hardened setup and request boundary', () => {
  it('permits initial setup only for the effective deployment owner and recovers an interrupted initialization', () => {
    const attacker = makeAppsScriptHarness();
    attacker.setActiveEmail('attacker@' + DOMAIN);
    const denied = attacker.invokeError('setupEvaluationRepository', { allowedDomain: DOMAIN, bootstrapAdmin: 'attacker@' + DOMAIN });
    expect(denied.code).toBe('denied');
    expect(attacker.properties.has('EE_SETUP_STATE')).toBe(false);

    const owner = makeAppsScriptHarness();
    owner.properties.set('EE_SETUP_STATE', 'initializing');
    owner.properties.set('EE_ALLOWED_DOMAIN', DOMAIN);
    owner.properties.set('EE_SPREADSHEET_ID', 'abandoned-sheet');
    owner.properties.set('EE_WORKSPACE_FILE_ID', 'abandoned-workspace');
    const recovered = owner.invoke('setupEvaluationRepository', { allowedDomain: DOMAIN, bootstrapAdmin: ADMIN });
    expect(recovered.ok).toBe(true);
    expect(owner.properties.get('EE_SETUP_STATE')).toBe('ready');
    expect(GS_SOURCE).toContain('DriveApp.Permission.VIEW');
    expect(GS_SOURCE).not.toContain('DriveApp.Permission.NONE);');
  });

  it('fails closed when workspace metadata file id or digest is altered', () => {
    const harness = repositoryFixture();
    harness.setSheetCell('Workspace', 1, 3, 'tampered-digest');
    expect(harness.invokeError('bootstrap').code).toBe('corrupt');
  });

  it('prevents setup and member updates from removing the active bootstrap/last administrator', () => {
    const setup = makeAppsScriptHarness();
    const badSetup = setup.invokeError('setupEvaluationRepository', {
      allowedDomain: DOMAIN, bootstrapAdmin: ADMIN,
      members: [{ email: ADMIN, displayName: 'Overwritten owner', role: 'evaluator', active: false }],
    });
    expect(badSetup.code).toBe('bad_config');

    const harness = repositoryFixture();
    harness.setActiveEmail(ADMIN);
    const demote = harness.invokeError('adminUpsertMember', { email: ADMIN, displayName: 'Repository Administrator', role: 'evaluator', active: true });
    expect(demote.code).toBe('bad_member');
    const deactivate = harness.invokeError('adminUpsertMember', { email: ADMIN, displayName: 'Repository Administrator', role: 'admin', active: false });
    expect(deactivate.code).toBe('bad_member');
    expect(harness.invoke('verifyDeploymentIdentity')).toMatchObject({ email: ADMIN, role: 'admin' });
  });

  it('rejects teacher memberships and assignments that reference undeclared educators', () => {
    const harness = makeAppsScriptHarness();
    const error = harness.invokeError('setupEvaluationRepository', {
      allowedDomain: DOMAIN,
      bootstrapAdmin: ADMIN,
      members: [{ email: TEACHER_ONE, displayName: 'Teacher One', role: 'teacher', teacherId: 'missing-teacher' }],
      assignments: [{ teacherId: 'missing-teacher', evaluatorEmail: ADMIN }],
      teachers: [],
    });
    expect(error.code).toBe('bad_config');
  });

  it('disables generic HTTP mutation dispatch even for a configured member', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(ADMIN);
    const output = harness.invoke('doPost', {
      postData: { contents: JSON.stringify({ action: 'saveWorkspace', payload: { expectedVersion: 0 } }) },
    });
    expect(JSON.parse(output.content)).toMatchObject({ ok: false, code: 'method_not_allowed' });
  });
});

describe('Educator Evaluation Apps Script evidence ownership and projections', () => {
  it('publishes a new walkthrough in one save with server-owned observer and timestamps', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const boot = harness.invoke('bootstrap');
    boot.workspace.walkthroughs.push({
      id: 'walk-one-save', teacherId: 't1', date: '2026-08-13', durationMin: 11,
      evidence: 'Students explained and compared their strategies.', interpretation: 'Plan a follow-up question.',
      privacyChecked: true, publishedAt: '2000-01-01T00:00:00.000Z', teacherAcknowledgedAt: '2000-01-01T00:00:00.000Z',
      observer: 'Forged Observer', startedAt: '2000-01-01T00:00:00.000Z', componentTags: ['3b'],
    });
    const saved = harness.invoke('saveWorkspace', {
      expectedVersion: boot.revision, workspace: boot.workspace,
      mutation: { teacherId: 't1', event: 'EVIDENCE_PUBLISHED', entityType: 'walkthrough', entityId: 'walk-one-save', version: 99 },
    });
    const record = saved.workspace.walkthroughs.find(item => item.id === 'walk-one-save');
    expect(record).toMatchObject({
      observer: 'Principal Rivera', startedAt: FIXED_NOW, publishedAt: FIXED_NOW,
      teacherAcknowledgedAt: null, createdAt: FIXED_NOW, updatedAt: FIXED_NOW, version: 1,
    });
    harness.setActiveEmail(TEACHER_ONE);
    expect(harness.invoke('bootstrap').workspace.walkthroughs.some(item => item.id === 'walk-one-save')).toBe(true);
  });

  it('does not let an evaluator forge the teacher acknowledgment on a published walkthrough', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const boot = harness.invoke('bootstrap');
    boot.workspace.walkthroughs.find(item => item.id === 'walk-t1').teacherAcknowledgedAt = '2000-01-01T00:00:00.000Z';
    const error = harness.invokeError('saveWorkspace', {
      expectedVersion: boot.revision, workspace: boot.workspace,
      mutation: { teacherId: 't1', event: 'ACKNOWLEDGED', entityType: 'walkthrough', entityId: 'walk-t1', version: 1 },
    });
    expect(error.code).toBe('invalid_transition');
  });

  it('redacts private drafts by role and preserves canonical fields when redacted projections return', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    let boot = harness.invoke('bootstrap');
    let observation = boot.workspace.observations.find(item => item.id === 'obs-t1');
    Object.assign(observation, {
      evidence: 'Private evaluator evidence', privacyChecked: true, componentTags: ['3b'],
      ratings: { d1: 2, d2: 2, d3: 2, d4: 2 },
      rationales: { d1: 'Evaluator rationale 1', d2: 'Evaluator rationale 2', d3: 'Evaluator rationale 3', d4: 'Evaluator rationale 4' },
    });
    harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { event: 'DRAFT_SAVED' } });

    harness.setActiveEmail(TEACHER_ONE);
    boot = harness.invoke('bootstrap');
    observation = boot.workspace.observations.find(item => item.id === 'obs-t1');
    expect(observation.evidence).toBe('');
    expect(observation.componentTags).toEqual([]);
    expect(observation.ratings).toEqual({ d1: null, d2: null, d3: null, d4: null });
    observation.evidence = 'Teacher-forged evaluator evidence';
    observation.ratings = { d1: 3, d2: 3, d3: 3, d4: 3 };
    observation.prework = { plan: 'Teacher private draft', outcomes: 'Expected outcomes', resources: '', assessment: '', artifactReferences: '' };
    harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { event: 'DRAFT_SAVED' } });

    harness.setActiveEmail(EVALUATOR);
    boot = harness.invoke('bootstrap');
    observation = boot.workspace.observations.find(item => item.id === 'obs-t1');
    expect(observation.evidence).toBe('Private evaluator evidence');
    expect(observation.ratings).toEqual({ d1: 2, d2: 2, d3: 2, d4: 2 });
    expect(observation.prework).toEqual({ plan: '', outcomes: '', resources: '', assessment: '', artifactReferences: '' });
    observation.prework.plan = 'Evaluator-forged private prework';
    harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { event: 'DRAFT_SAVED' } });

    harness.setActiveEmail(TEACHER_ONE);
    observation = harness.invoke('bootstrap').workspace.observations.find(item => item.id === 'obs-t1');
    expect(observation.prework.plan).toBe('Teacher private draft');
    expect(observation.evidence).toBe('');
  });

  it('preserves submitted teacher prework and reflection across evaluator whole-workspace saves', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(TEACHER_ONE);
    let boot = harness.invoke('bootstrap');
    let observation = boot.workspace.observations.find(item => item.id === 'obs-t1');
    observation.prework = { plan: 'Original submitted plan', outcomes: 'Original outcomes', resources: 'Approved resource', assessment: 'Exit ticket', artifactReferences: '' };
    observation.preworkSubmittedAt = '2000-01-01T00:00:00.000Z';
    harness.invoke('saveWorkspace', {
      expectedVersion: boot.revision, workspace: boot.workspace,
      mutation: { teacherId: 't1', event: 'SUBMITTED', entityType: 'formal_observation', entityId: 'obs-t1', version: 1 },
    });

    harness.setActiveEmail(EVALUATOR);
    boot = harness.invoke('bootstrap');
    observation = boot.workspace.observations.find(item => item.id === 'obs-t1');
    expect(observation.prework.plan).toBe('Original submitted plan');
    observation.prework.plan = 'Evaluator attempted replacement';
    harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { event: 'DRAFT_SAVED' } });

    boot = harness.invoke('bootstrap');
    observation = boot.workspace.observations.find(item => item.id === 'obs-t1');
    observation.preConferenceAt = '2000-01-01T00:00:00.000Z';
    harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { teacherId: 't1', event: 'CONFERENCED', entityType: 'formal_observation', entityId: 'obs-t1' } });
    boot = harness.invoke('bootstrap');
    observation = boot.workspace.observations.find(item => item.id === 'obs-t1');
    observation.observedAt = '2000-01-01T00:00:00.000Z';
    harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { teacherId: 't1', event: 'OBSERVATION_STARTED', entityType: 'formal_observation', entityId: 'obs-t1' } });
    boot = harness.invoke('bootstrap');
    observation = boot.workspace.observations.find(item => item.id === 'obs-t1');
    Object.assign(observation, { evidence: 'Published evidence', privacyChecked: true, evidencePublishedAt: '2000-01-01T00:00:00.000Z' });
    harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { teacherId: 't1', event: 'EVIDENCE_PUBLISHED', entityType: 'formal_observation', entityId: 'obs-t1' } });

    harness.setActiveEmail(TEACHER_ONE);
    boot = harness.invoke('bootstrap');
    observation = boot.workspace.observations.find(item => item.id === 'obs-t1');
    observation.reflection = 'Original submitted reflection';
    observation.reflectionSubmittedAt = '2000-01-01T00:00:00.000Z';
    harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { teacherId: 't1', event: 'SUBMITTED', entityType: 'formal_observation', entityId: 'obs-t1' } });

    harness.setActiveEmail(EVALUATOR);
    boot = harness.invoke('bootstrap');
    observation = boot.workspace.observations.find(item => item.id === 'obs-t1');
    expect(observation.reflection).toBe('Original submitted reflection');
    observation.prework.plan = 'Second evaluator replacement';
    observation.reflection = 'Evaluator attempted reflection replacement';
    harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { event: 'DRAFT_SAVED' } });

    harness.setActiveEmail(TEACHER_ONE);
    observation = harness.invoke('bootstrap').workspace.observations.find(item => item.id === 'obs-t1');
    expect(observation.prework.plan).toBe('Original submitted plan');
    expect(observation.reflection).toBe('Original submitted reflection');
    expect(observation.preworkSubmittedAt).toBe(FIXED_NOW);
    expect(observation.reflectionSubmittedAt).toBe(FIXED_NOW);
  });
  it('server-clears teacher-owned fields and framework provenance on a new observation', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const boot = harness.invoke('bootstrap');
    boot.workspace.observations.push({ id: 'obs-forged-seed', teacherId: 't1', frameworkVersion: 'Forged framework', prework: { plan: 'Forged plan', outcomes: 'Forged outcomes' }, reflection: 'Forged reflection', ackChecked: true, preworkSubmittedAt: '2000-01-01T00:00:00.000Z', reflectionSubmittedAt: '2000-01-01T00:00:00.000Z', teacherAcknowledgedAt: '2000-01-01T00:00:00.000Z', finalizedAt: '2000-01-01T00:00:00.000Z', ratings: {}, rationales: {} });
    const saved = harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { teacherId: 't1', event: 'ASSIGNED', entityType: 'formal_observation', entityId: 'obs-forged-seed' } });
    const record = saved.workspace.observations.find(item => item.id === 'obs-forged-seed');
    expect(record.frameworkVersion).toBe(boot.workspace.config.frameworkVersion);
    expect(record.prework).toEqual({ plan: '', outcomes: '', resources: '', assessment: '', artifactReferences: '' });
    expect(record.reflection).toBe('');
    expect(record.ackChecked).toBe(false);
    for (const field of ['preworkSubmittedAt', 'reflectionSubmittedAt', 'teacherAcknowledgedAt', 'finalizedAt']) expect(record[field]).toBeNull();
  });

  it('locks observation provenance and milestone snapshots after signature', () => {
    const harness = repositoryFixture();
    advanceObservationToSigned(harness);
    harness.setActiveEmail(EVALUATOR);
    const boot = harness.invoke('bootstrap');
    const observation = boot.workspace.observations.find(item => item.id === 'obs-t1');
    const canonical = JSON.parse(JSON.stringify(observation));
    Object.assign(observation, { createdAt: '2001-01-01T00:00:00.000Z', frameworkVersion: 'Forged', version: 999, preConferenceNotes: 'Forged pre note', observedLocal: 'forged', evidence: 'Forged evidence', componentTags: ['4f'], privacyChecked: false, postConferenceNotes: 'Forged post note', ratings: { d1: 0, d2: 0, d3: 0, d4: 0 }, rationales: { d1: 'x', d2: 'x', d3: 'x', d4: 'x' } });
    observation.prework.plan = 'Forged plan';
    observation.reflection = 'Forged reflection';
    const saved = harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { event: 'DRAFT_SAVED' } });
    const retained = saved.workspace.observations.find(item => item.id === 'obs-t1');
    for (const field of ['createdAt', 'frameworkVersion', 'version', 'preConferenceNotes', 'observedLocal', 'evidence', 'componentTags', 'privacyChecked', 'postConferenceNotes', 'prework', 'reflection', 'ratings', 'rationales']) expect(retained[field]).toEqual(canonical[field]);
    harness.setActiveEmail(TEACHER_ONE);
    const teacherRecord = harness.invoke('bootstrap').workspace.observations.find(item => item.id === 'obs-t1');
    expect(teacherRecord.preConferenceNotes).toBe('');
    expect(teacherRecord.postConferenceNotes).toBe('Canonical post-conference note');
  });

  it('hides annual ratings and weights from the teacher until official release', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    let boot = harness.invoke('bootstrap');
    let profile = boot.workspace.teachers.find(item => item.id === 't1');
    profile.ratings = { domains: { d1: 2, d2: 2, d3: 2, d4: 2 }, building: 2, teacher: 2, lea: 2 };
    harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { event: 'RATING_UPDATED' } });
    harness.setActiveEmail(TEACHER_ONE);
    profile = harness.invoke('bootstrap').workspace.teachers.find(item => item.id === 't1');
    expect(profile.ratings.domains).toEqual({ d1: null, d2: null, d3: null, d4: null });
    expect(profile.finalScore).toBeNull();
    expect(profile.weightSnapshot).toBeNull();
    harness.setActiveEmail(EVALUATOR);
    boot = harness.invoke('bootstrap');
    profile = boot.workspace.teachers.find(item => item.id === 't1');
    profile.finalizedAt = '2000-01-01T00:00:00.000Z';
    harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { teacherId: 't1', event: 'RELEASED', entityType: 'educator_cycle', entityId: 't1' } });
    harness.setActiveEmail(TEACHER_ONE);
    profile = harness.invoke('bootstrap').workspace.teachers.find(item => item.id === 't1');
    expect(profile.ratings.domains).toEqual({ d1: 2, d2: 2, d3: 2, d4: 2 });
    expect(profile.finalScore).toBe(2);
    expect(profile.weightSnapshot.length).toBeGreaterThan(0);
  });

});

describe('Educator Evaluation Apps Script SPM authority', () => {
  it('server-stamps the evaluator first-open milestone and appends its OPENED audit receipt', () => {
    const harness = repositoryFixture();
    createSubmittedSpm(harness);
    harness.setActiveEmail(EVALUATOR);
    const boot = harness.invoke('bootstrap');
    const spm = boot.workspace.spms.find(item => item.id === 'spm-t1');
    spm.firstOpenedAt = '2000-01-01T00:00:00.000Z';
    const saved = harness.invoke('saveWorkspace', {
      expectedVersion: boot.revision, workspace: boot.workspace,
      mutation: { teacherId: 't1', event: 'OPENED', entityType: 'spm', entityId: 'spm-t1', version: 1 },
    });
    expect(saved.workspace.spms.find(item => item.id === 'spm-t1').firstOpenedAt).toBe(FIXED_NOW);
    const audit = harness.rows('Audit').at(-1);
    expect(audit[2]).toBe('OPENED');
    expect(audit[7]).toBe(EVALUATOR);
    expect(audit[9]).toBe(FIXED_NOW);
  });

  it('prevents a teacher from changing an approved proposal while retaining results ownership', () => {
    const harness = repositoryFixture();
    createSubmittedSpm(harness);
    harness.setActiveEmail(EVALUATOR);
    let boot = harness.invoke('bootstrap');
    let spm = boot.workspace.spms.find(item => item.id === 'spm-t1');
    spm.firstOpenedAt = '2000-01-01T00:00:00.000Z';
    harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { teacherId: 't1', event: 'OPENED', entityType: 'spm', entityId: 'spm-t1' } });
    boot = harness.invoke('bootstrap');
    spm = boot.workspace.spms.find(item => item.id === 'spm-t1');
    spm.status = 'approved';
    harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { teacherId: 't1', event: 'APPROVED', entityType: 'spm', entityId: 'spm-t1' } });

    harness.setActiveEmail(TEACHER_ONE);
    boot = harness.invoke('bootstrap');
    spm = boot.workspace.spms.find(item => item.id === 'spm-t1');
    const approvedContext = spm.context;
    spm.context = 'Teacher attempted to alter approved proposal';
    spm.results = 'Teacher-owned interim results';
    spm.reflection = 'Teacher-owned reflection';
    harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { event: 'DRAFT_SAVED' } });
    boot = harness.invoke('bootstrap');
    spm = boot.workspace.spms.find(item => item.id === 'spm-t1');
    expect(spm.context).toBe(approvedContext);
    expect(spm.results).toBe('Teacher-owned interim results');
    expect(spm.reflection).toBe('Teacher-owned reflection');
  });

  it('rejects an evaluator jump from submitted directly to locked', () => {
    const harness = repositoryFixture();
    createSubmittedSpm(harness);
    harness.setActiveEmail(EVALUATOR);
    const boot = harness.invoke('bootstrap');
    const spm = boot.workspace.spms.find(item => item.id === 'spm-t1');
    Object.assign(spm, { status: 'locked', rating: 3, ratingRationale: 'Forged shortcut', lockedAt: '2000-01-01T00:00:00.000Z' });
    const error = harness.invokeError('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { teacherId: 't1', event: 'FINALIZED', entityType: 'spm', entityId: 'spm-t1' } });
    expect(error.code).toBe('invalid_transition');
  });
  it('updates current SPM timestamps across return, resubmit, second return, and approval', () => {
    const harness = repositoryFixture();
    createSubmittedSpm(harness);
    harness.setActiveEmail(EVALUATOR);
    let boot = harness.invoke('bootstrap');
    let spm = boot.workspace.spms.find(item => item.id === 'spm-t1');
    spm.firstOpenedAt = '2000-01-01T00:00:00.000Z';
    harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { teacherId: 't1', event: 'OPENED', entityType: 'spm', entityId: 'spm-t1' } });

    harness.setClock('2026-08-13T17:20:00.000Z');
    boot = harness.invoke('bootstrap');
    spm = boot.workspace.spms.find(item => item.id === 'spm-t1');
    Object.assign(spm, { status: 'returned', pendingReturnReason: 'Clarify the measure.' });
    harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { teacherId: 't1', event: 'RETURNED', entityType: 'spm', entityId: 'spm-t1' } });

    harness.setClock('2026-08-13T17:30:00.000Z');
    harness.setActiveEmail(TEACHER_ONE);
    boot = harness.invoke('bootstrap');
    spm = boot.workspace.spms.find(item => item.id === 'spm-t1');
    Object.assign(spm, { status: 'submitted', measures: 'Clarified measure and work samples', version: 2 });
    let saved = harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { teacherId: 't1', event: 'SUBMITTED', entityType: 'spm', entityId: 'spm-t1' } });
    expect(saved.workspace.spms.find(item => item.id === 'spm-t1').submittedAt).toBe('2026-08-13T17:30:00.000Z');

    harness.setClock('2026-08-13T17:40:00.000Z');
    harness.setActiveEmail(EVALUATOR);
    boot = harness.invoke('bootstrap');
    spm = boot.workspace.spms.find(item => item.id === 'spm-t1');
    Object.assign(spm, { status: 'returned', pendingReturnReason: 'Add a comparison point.' });
    saved = harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { teacherId: 't1', event: 'RETURNED', entityType: 'spm', entityId: 'spm-t1' } });
    expect(saved.workspace.spms.find(item => item.id === 'spm-t1').returnedAt).toBe('2026-08-13T17:40:00.000Z');

    harness.setClock('2026-08-13T17:50:00.000Z');
    harness.setActiveEmail(TEACHER_ONE);
    boot = harness.invoke('bootstrap');
    spm = boot.workspace.spms.find(item => item.id === 'spm-t1');
    Object.assign(spm, { status: 'submitted', baseline: 'Baseline with comparison point', version: 3 });
    saved = harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { teacherId: 't1', event: 'SUBMITTED', entityType: 'spm', entityId: 'spm-t1' } });
    expect(saved.workspace.spms.find(item => item.id === 'spm-t1').submittedAt).toBe('2026-08-13T17:50:00.000Z');

    harness.setClock('2026-08-13T18:00:00.000Z');
    harness.setActiveEmail(EVALUATOR);
    boot = harness.invoke('bootstrap');
    spm = boot.workspace.spms.find(item => item.id === 'spm-t1');
    spm.status = 'approved';
    saved = harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { teacherId: 't1', event: 'APPROVED', entityType: 'spm', entityId: 'spm-t1' } });
    const approved = saved.workspace.spms.find(item => item.id === 'spm-t1');
    expect(approved.approvedAt).toBe('2026-08-13T18:00:00.000Z');
    expect(approved.firstOpenedAt).toBe(FIXED_NOW);
  });

  it('redacts SPM rating and rationale from the teacher until the evaluator locks results', () => {
    const harness = repositoryFixture();
    createSubmittedSpm(harness);
    harness.setActiveEmail(EVALUATOR);
    let boot = harness.invoke('bootstrap');
    let spm = boot.workspace.spms.find(item => item.id === 'spm-t1');
    spm.firstOpenedAt = '2000-01-01T00:00:00.000Z';
    harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { teacherId: 't1', event: 'OPENED', entityType: 'spm', entityId: 'spm-t1' } });
    boot = harness.invoke('bootstrap');
    spm = boot.workspace.spms.find(item => item.id === 'spm-t1');
    spm.status = 'approved';
    harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { teacherId: 't1', event: 'APPROVED', entityType: 'spm', entityId: 'spm-t1' } });
    harness.setActiveEmail(TEACHER_ONE);
    boot = harness.invoke('bootstrap');
    spm = boot.workspace.spms.find(item => item.id === 'spm-t1');
    Object.assign(spm, { status: 'results_submitted', results: 'Documented student growth', reflection: 'Reflection on the unit' });
    harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { teacherId: 't1', event: 'SUBMITTED', entityType: 'spm', entityId: 'spm-t1' } });
    harness.setActiveEmail(EVALUATOR);
    boot = harness.invoke('bootstrap');
    spm = boot.workspace.spms.find(item => item.id === 'spm-t1');
    Object.assign(spm, { rating: 3, ratingRationale: 'Evaluator-only draft rationale' });
    harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { event: 'RATING_UPDATED' } });
    harness.setActiveEmail(TEACHER_ONE);
    spm = harness.invoke('bootstrap').workspace.spms.find(item => item.id === 'spm-t1');
    expect(spm.rating).toBeNull();
    expect(spm.ratingRationale).toBe('');
    harness.setActiveEmail(EVALUATOR);
    boot = harness.invoke('bootstrap');
    spm = boot.workspace.spms.find(item => item.id === 'spm-t1');
    spm.status = 'locked';
    harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { teacherId: 't1', event: 'FINALIZED', entityType: 'spm', entityId: 'spm-t1' } });
    harness.setActiveEmail(TEACHER_ONE);
    spm = harness.invoke('bootstrap').workspace.spms.find(item => item.id === 'spm-t1');
    expect(spm.rating).toBe(3);
    expect(spm.ratingRationale).toBe('Evaluator-only draft rationale');
  });

});

describe('Educator Evaluation Apps Script server-derived lifecycle records', () => {
  it('omits audit entries for drafts and freezes server-policy weights at first activity', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const auditRows = harness.rows('Audit').length;
    let boot = harness.invoke('bootstrap');
    let peer = boot.workspace.teachers.find(item => item.id === 'peer-02');
    peer.ratings.domains.d1 = 1;
    const saved = harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { teacherId: 'peer-02', event: 'DRAFT_SAVED', entityType: 'educator_cycle', entityId: 'peer-02' } });
    peer = saved.workspace.teachers.find(item => item.id === 'peer-02');
    expect(harness.rows('Audit')).toHaveLength(auditRows);
    expect(peer.cycleLockedAt).toBe(FIXED_NOW);
    expect(peer.weightSnapshot.map(item => [item.id, item.weight])).toEqual([
      ['observation', 70], ['building', 10], ['teacher', 10], ['lea', 10],
    ]);

    boot = harness.invoke('bootstrap');
    peer = boot.workspace.teachers.find(item => item.id === 'peer-02');
    peer.buildingData = false;
    const error = harness.invokeError('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation: { event: 'DRAFT_SAVED' } });
    expect(error.code).toBe('immutable');
  });

  it('ignores client snapshots, weights, timestamps, and scores when releasing a cycle', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const boot = harness.invoke('bootstrap');
    const peer = boot.workspace.teachers.find(item => item.id === 'peer-01');
    peer.ratings = { domains: { d1: 2, d2: 2, d3: 2, d4: 2 }, building: 2, teacher: 2, lea: 2 };
    peer.weightSnapshot = [{ id: 'observation', label: 'Forged', short: 'X', weight: 100, color: '#000000' }];
    peer.cycleLockedAt = '2000-01-01T00:00:00.000Z';
    peer.finalizedAt = '2000-01-01T00:00:00.000Z';
    peer.finalScore = 0.1;
    boot.workspace.cycleSnapshots.push(snapshot('client-forged-snapshot', 'peer-01', 0.1));
    const saved = harness.invoke('saveWorkspace', {
      expectedVersion: boot.revision, workspace: boot.workspace,
      mutation: { teacherId: 'peer-01', event: 'RELEASED', entityType: 'educator_cycle', entityId: 'peer-01', version: 1 },
    });
    const released = saved.workspace.teachers.find(item => item.id === 'peer-01');
    expect(released.finalizedAt).toBe(FIXED_NOW);
    expect(released.finalScore).toBe(2);
    expect(released.weightSnapshot.map(item => [item.id, item.weight])).toEqual([
      ['observation', 70], ['building', 10], ['teacher', 10], ['lea', 10],
    ]);
    const snapshots = saved.workspace.cycleSnapshots.filter(item => item.teacherId === 'peer-01');
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatchObject({ finalizedAt: FIXED_NOW, finalScore: 2, academicYear: '2026-27' });
    expect(snapshots[0].id).not.toBe('client-forged-snapshot');
    expect(snapshots[0].weightSnapshot).toEqual(released.weightSnapshot);
  });
});

describe('district package documentation', () => {
  const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const README = fs.readFileSync(path.join(ROOT, 'apps_script', 'educator_evaluation', 'README.md'), 'utf8');

  it('documents every public server entry point IT is expected to deploy', () => {
    // Trailing-underscore names are private helpers; everything else is callable
    // from the portal or the Apps Script editor and belongs in the README.
    const publicFns = [...GS_SOURCE.matchAll(/^function ([a-zA-Z][a-zA-Z0-9]*)\s*\(/gm)]
      .map((match) => match[1])
      .filter((name) => !name.endsWith('_'));
    expect(publicFns.length).toBeGreaterThan(8);
    // Whole-word only: a plain substring check would accept a renamed mention
    // such as getPortalSetupHealthXX and quietly pass while the docs are wrong.
    const documented = (name) => {
      for (let at = README.indexOf(name); at !== -1; at = README.indexOf(name, at + 1)) {
        const after = README.charAt(at + name.length) || ' ';
        const before = at === 0 ? ' ' : README.charAt(at - 1);
        if (!/[A-Za-z0-9_]/.test(after) && !/[A-Za-z0-9_]/.test(before)) return true;
      }
      return false;
    };
    const undocumented = publicFns.filter((name) => !documented(name));
    expect(undocumented).toEqual([]);
  });

  it('tells administrators how released summaries are shared and receipted', () => {
    expect(README).toContain('sharePortalReleasedEvaluation');
    expect(README).toContain('VIEWER');
    expect(README).toContain('idempotent');
    expect(README).toContain('recordReleasedSummaryOpened');
    expect(README).toContain('deployment.portalUrl');
  });
});
