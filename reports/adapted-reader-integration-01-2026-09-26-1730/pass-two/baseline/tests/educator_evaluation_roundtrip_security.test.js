import { expect, it } from 'vitest';
import { repositoryFixture, TEACHER_ONE, ADMIN, EVALUATOR } from './helpers/educator_evaluation_gs_harness.js';

function finalizedFixture() {
  const harness = repositoryFixture();
  const workspace = harness.invoke('bootstrap').workspace;
  const record = workspace.observations.find(o => o.id === 'obs-t1');
  record.preConferenceNotes = 'Private evaluator preparation that must stay private.';
  record.finalizedAt = '2026-08-13T17:15:30.000Z';
  harness.replaceWorkspace(workspace);
  harness.setActiveEmail(TEACHER_ONE);
  return harness;
}

it('accepts an unchanged finalized formal record from its redacted educator projection', () => {
  const h = finalizedFixture();
  const boot = h.invoke('bootstrap');
  expect(boot.workspace.observations.find(o => o.id === 'obs-t1').preConferenceNotes).toBe('');
  const result = h.invoke('saveWorkspace', { workspace: boot.workspace, expectedVersion: boot.revision });
  expect(result.ok).toBe(true);
  expect(result.revision).toBe(boot.revision);
  expect(result.workspace.observations.find(o => o.id === 'obs-t1').preConferenceNotes).toBe('');
  h.setActiveEmail(ADMIN);
  expect(h.invoke('bootstrap').workspace.observations.find(o => o.id === 'obs-t1').preConferenceNotes).toBe('Private evaluator preparation that must stay private.');
});

it('still refuses educator changes to finalized evidence and retains the canonical private notes', () => {
  const h = finalizedFixture();
  const boot = h.invoke('bootstrap');
  const record = boot.workspace.observations.find(o => o.id === 'obs-t1');
  record.preConferenceNotes = 'Forged private note';
  record.evidence = 'Forged finalized evidence';
  expect(() => h.invoke('saveWorkspace', { workspace: boot.workspace, expectedVersion: boot.revision })).toThrow(/Finalized formal observations cannot be edited/);
  expect(h.invoke('bootstrap').revision).toBe(boot.revision);
});


it('accepts the browser SPM return transition without losing its reviewed reason', () => {
  const h = repositoryFixture();
  const workspace = h.invoke('bootstrap').workspace;
  workspace.spms.push(h.invoke('sanitizeSpm_', {
    id: 'spm-1', teacherId: 't1', status: 'submitted',
    firstOpenedAt: '2026-08-13T17:15:30.000Z',
    pendingReturnReason: 'Clarify the success criterion.',
  }));
  h.replaceWorkspace(workspace);
  h.setActiveEmail(EVALUATOR);
  const boot = h.invoke('bootstrap');
  const next = boot.workspace.spms[0];
  next.status = 'returned'; next.returnReason = ''; next.pendingReturnReason = '';
  const request = { workspace: boot.workspace, expectedVersion: boot.revision, mutation: { event: 'RETURNED', teacherId: 't1', entityType: 'spm', entityId: 'spm-1', version: 1 } };
  expect(() => h.invoke('saveWorkspace', request)).toThrow(/requires a reason/);
  next.returnReason = 'Clarify the success criterion.';
  const result = h.invoke('saveWorkspace', request).workspace.spms[0];
  expect(result.status).toBe('returned');
  expect(result.returnReason).toBe('Clarify the success criterion.');
  expect(result.pendingReturnReason).toBe('');
});


it('accepts unchanged locked SPMs in subsequent evaluator saves and still refuses edits', () => {
  const h = repositoryFixture();
  const workspace = h.invoke('bootstrap').workspace;
  workspace.spms.push(h.invoke('sanitizeSpm_', { id: 'locked-1', teacherId: 't1', status: 'locked', rating: 2, ratingRationale: 'Approved fictional judgment.', lockedAt: '2026-08-13T17:15:30.000Z' }));
  h.replaceWorkspace(workspace); h.setActiveEmail(EVALUATOR);
  const boot = h.invoke('bootstrap');
  const request = { workspace: boot.workspace, expectedVersion: boot.revision };
  expect(h.invoke('saveWorkspace', request)).toMatchObject({ ok: true, revision: boot.revision });
  boot.workspace.spms[0].rating = 3;
  expect(() => h.invoke('saveWorkspace', request)).toThrow(/Locked SPM records cannot be edited/);
});
