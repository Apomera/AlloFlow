import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  ADMIN,
  EVALUATOR,
  TEACHER_ONE,
  repositoryFixture,
} from './helpers/educator_evaluation_gs_harness.js';

const DRIVE_MUTATIONS = new Set([
  'addViewer', 'addEditor', 'removeViewer', 'removeEditor',
  'setSharing', 'setShareableByEditors', 'setTrashed', 'moveTo',
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function releasedEntry(id, teacherId = 't1') {
  return {
    id,
    url: `https://docs.google.com/document/d/${id}/edit`,
    teacherId,
    academicYear: '2026-27',
    releasedAt: '2026-08-13T17:15:30.000Z',
    releasedBy: EVALUATOR,
    grants: [EVALUATOR, TEACHER_ONE].sort(),
    aclMode: 'private_named_viewers',
    aclVersion: 1,
    aclVerifiedAt: '2026-08-13T17:15:30.000Z',
    status: 'active',
  };
}

function releasedDoc(id) {
  const entry = releasedEntry(id);
  return {
    id: entry.id,
    url: entry.url,
    academicYear: entry.academicYear,
    at: entry.releasedAt,
    by: entry.releasedBy,
    sharedWith: TEACHER_ONE,
    grants: entry.grants,
    aclMode: entry.aclMode,
    aclVersion: entry.aclVersion,
    aclVerifiedAt: entry.aclVerifiedAt,
    accessReviewedAt: entry.aclVerifiedAt,
    history: [],
  };
}

describe('educator evaluation locked administrator and directory scope binding', () => {
  it('re-authorizes the same administrator after acquiring the lock without consuming the review', () => {
    const harness = repositoryFixture();
    const reviewed = harness.invoke('reviewPortalCycleSchedule', {
      dueDate: '2027-06-30',
      applyTo: 'all_open',
    }).review;
    const before = clone(harness.invoke('bootstrap'));

    harness.setNextScriptLockTryLockHook(() => harness.setActiveEmail(EVALUATOR));
    expect(harness.invokeError('performPortalCycleSchedule', {
      reviewToken: reviewed.token,
      acknowledgeImpact: true,
    }).code).toBe('denied');
    harness.setActiveEmail(ADMIN);

    expect(harness.invoke('bootstrap')).toEqual(before);
    expect(harness.invoke('performPortalCycleSchedule', {
      reviewToken: reviewed.token,
      acknowledgeImpact: true,
    })).toMatchObject({ ok: true, status: 'completed', dueDate: '2027-06-30' });
  });

  it('binds a directory review to the exact row, revision, teacher IDs, document IDs, and release scope', () => {
    const harness = repositoryFixture();
    const workspace = harness.invoke('bootstrap').workspace;
    const teacher = workspace.teachers.find(item => item.id === 't1');
    teacher.releasedDoc = releasedDoc('released-doc-a');
    workspace.releaseRegistry = [releasedEntry('released-doc-a')];
    harness.replaceWorkspace(workspace);

    const reviewed = harness.invoke('reviewPortalDirectoryChange', {
      kind: 'assignment',
      candidate: { teacherId: 't1', evaluatorEmail: EVALUATOR, active: false },
    }).review;
    const cached = harness.cachedAdminReview(reviewed.token);
    expect(cached).toMatchObject({
      actorEmail: ADMIN,
      operation: 'directory',
      kind: 'assignment',
      current: { teacherId: 't1', evaluatorEmail: EVALUATOR, active: true },
      revision: harness.rows('Workspace')[1][1],
      affectedTeacherIds: ['t1'],
      affectedDocumentIds: ['released-doc-a'],
      workspaceScopeFingerprint: expect.any(String),
    });
    expect(cached.workspaceScopeFingerprint.length).toBeGreaterThan(20);

    const changed = clone(workspace);
    changed.releaseRegistry.push(releasedEntry('released-doc-b'));
    harness.replaceWorkspace(changed); // Keep the same revision to exercise the scope fingerprint.
    const assignmentsBefore = clone(harness.rows('Assignments'));
    const driveMutationsBefore = harness.driveOperations.filter(item => DRIVE_MUTATIONS.has(item.operation));

    expect(harness.invokeError('performPortalDirectoryChange', {
      reviewToken: reviewed.token,
      acknowledgeImpact: true,
    }).code).toBe('review_stale');
    expect(harness.rows('Assignments')).toEqual(assignmentsBefore);
    expect(harness.driveOperations.filter(item => DRIVE_MUTATIONS.has(item.operation))).toEqual(driveMutationsBefore);
  });

  it('keeps locked reauthorization first and uses only the reviewed directory scope', () => {
    const server = fs.readFileSync(path.join(process.cwd(), 'apps_script', 'educator_evaluation', 'Code.gs'), 'utf8');
    const names = [
      'reconcilePortalReleasedEvaluationAccess',
      'performPortalDirectoryChange',
      'performPortalCycleSchedule',
      'performPortalWorkspaceConfiguration',
      'performPortalAnnualRollover',
      'reconcilePortalAnnualRollover',
    ];
    for (const name of names) {
      const start = server.indexOf(`function ${name}(`);
      const next = server.indexOf('\nfunction ', start + 10);
      const body = server.slice(start, next === -1 ? undefined : next);
      expect(start, name).toBeGreaterThanOrEqual(0);
      expect(body, name).toMatch(/try\s*\{\s*actor\s*=\s*requireSameAdminLocked_\(actor\);/);
    }
    expect(server).toMatch(/function requireSameActorLocked_\(actor\)[\s\S]*?lockedActor = currentActor_\(\)[\s\S]*?lockedEmail !== expectedEmail[\s\S]*?lockedRole !== expectedRole[\s\S]*?lockedTeacherId !== expectedTeacherId/);
    expect(server).toMatch(/function requireSameAdminLocked_\(actor\)[\s\S]*?var lockedActor = requireSameActorLocked_\(actor\);[\s\S]*?lockedActor\.role !== 'admin'/);
    expect(server).toMatch(/affectedTeacherIds = review\.affectedTeacherIds\.slice\(\)/);
    expect(server).toMatch(/affectedDocumentIds = review\.affectedDocumentIds\.slice\(\)/);
    expect(server).toContain('workspaceScopeFingerprint: scope.workspaceScopeFingerprint');
    expect(server).toContain('reviewedDocumentIds: reviewedDocumentIds');
    for (const name of ['performPortalDistrictExport', 'performPortalArchiveRestoreRehearsal']) {
      const start = server.indexOf(`function ${name}(`);
      const next = server.indexOf('\nfunction ', start + 10);
      const body = server.slice(start, next === -1 ? undefined : next);
      expect(body, name).toMatch(/assertNoAnnualRolloverRecovery_\(\{ allowArtifactRecovery: true \}\);[\s\S]*?actor\s*=\s*requireSameAdminLocked_\(actor\);/);
    }
  });
});
