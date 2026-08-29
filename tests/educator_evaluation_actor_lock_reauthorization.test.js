import { describe, expect, it } from 'vitest';
import {
  ADMIN,
  EVALUATOR,
  FIXED_NOW,
  GS_SOURCE,
  TEACHER_ONE,
  repositoryFixture,
} from './helpers/educator_evaluation_gs_harness.js';

const SHEETS = ['Config', 'Members', 'Assignments', 'Workspace', 'Receipts', 'Messages', 'Audit', 'Snapshots'];
const MUTATING_DRIVE_OPERATIONS = new Set([
  'addViewer', 'addEditor', 'removeViewer', 'removeEditor',
  'setSharing', 'setShareableByEditors', 'setTrashed', 'moveTo',
]);

const clone = (value) => JSON.parse(JSON.stringify(value));

const mutationSnapshot = (harness) => ({
  properties: [...harness.properties.entries()].sort(([left], [right]) => left.localeCompare(right)),
  sheets: Object.fromEntries(SHEETS.map((name) => [name, harness.rows(name)])),
  files: [...harness.driveFiles.values()].map((file) => ({
    id: file.id,
    name: file.name,
    content: file.content,
    ownerEmail: file.ownerEmail,
    parentFolderId: file.parentFolderId,
    trashed: !!file.trashed,
    sharingAccess: file.sharingAccess,
    sharingPermission: file.sharingPermission,
    shareableByEditors: !!file.shareableByEditors,
    viewers: [...file.viewers].sort(),
    commenters: [...file.commenters].sort(),
    editors: [...file.editors].sort(),
  })).sort((left, right) => left.id.localeCompare(right.id)),
  folders: [...harness.driveFolders.values()].map((folder) => ({
    id: folder.id,
    name: folder.name,
    ownerEmail: folder.ownerEmail,
    parentFolderId: folder.parentFolderId,
    trashed: !!folder.trashed,
    sharingAccess: folder.sharingAccess,
    sharingPermission: folder.sharingPermission,
    shareableByEditors: !!folder.shareableByEditors,
    viewers: [...folder.viewers].sort(),
    commenters: [...folder.commenters].sort(),
    editors: [...folder.editors].sort(),
  })).sort((left, right) => left.id.localeCompare(right.id)),
  driveMutations: harness.driveOperations.filter((item) => MUTATING_DRIVE_OPERATIONS.has(item.operation)),
  documents: clone(harness.documents),
  sentMail: clone(harness.sentMail),
});

const rowIndex = (harness, sheetName, predicate) => {
  const index = harness.rows(sheetName).findIndex(predicate);
  expect(index, sheetName).toBeGreaterThan(0);
  return index;
};

const setAssignmentActive = (harness, active) => {
  const index = rowIndex(harness, 'Assignments', (row) => row[0] === 't1' && row[1] === EVALUATOR);
  harness.setSheetCell('Assignments', index, 2, active);
};

const setMemberActive = (harness, email, active) => {
  const index = rowIndex(harness, 'Members', (row) => row[0] === email);
  harness.setSheetCell('Members', index, 4, active);
};

const setMemberRole = (harness, email, role) => {
  const index = rowIndex(harness, 'Members', (row) => row[0] === email);
  harness.setSheetCell('Members', index, 2, role);
};

const saveAs = (harness, email, mutate, mutation) => {
  harness.setActiveEmail(email);
  const boot = harness.invoke('bootstrap');
  mutate(boot.workspace);
  return harness.invoke('saveWorkspace', {
    expectedVersion: boot.revision,
    workspace: boot.workspace,
    mutation,
  });
};

const finalizeTeacher = (harness) => {
  const evidenceToken = 'walkthrough:walk-t1';
  expect(saveAs(harness, EVALUATOR, (workspace) => {
    const teacher = workspace.teachers.find((item) => item.id === 't1');
    teacher.ratings = { domains: { d1: 3, d2: 2, d3: 2, d4: 3 }, building: 2, teacher: 2, lea: 2 };
    teacher.annualRationales = {
      d1: 'Annual rationale 1',
      d2: 'Annual rationale 2',
      d3: 'Annual rationale 3',
      d4: 'Annual rationale 4',
    };
    teacher.annualEvidenceRefs = {
      d1: [evidenceToken],
      d2: [evidenceToken],
      d3: [evidenceToken],
      d4: [evidenceToken],
    };
  }, {
    teacherId: 't1',
    event: 'RATING_UPDATED',
    entityType: 'evaluation',
    entityId: 't1',
    version: 1,
  }).ok).toBe(true);
  expect(saveAs(harness, EVALUATOR, (workspace) => {
    workspace.teachers.find((item) => item.id === 't1').finalizedAt = '2026-08-13T17:00:00.000Z';
  }, {
    teacherId: 't1',
    event: 'RELEASED',
    entityType: 'educator_cycle',
    entityId: 't1',
    version: 1,
  }).ok).toBe(true);
};

const seedReleasedSummary = (harness) => {
  harness.setActiveEmail(ADMIN);
  const boot = harness.invoke('bootstrap');
  const teacher = boot.workspace.teachers.find((item) => item.id === 't1');
  teacher.releasedDoc = {
    id: 'released-doc-t1',
    url: 'https://docs.google.com/document/d/released-doc-t1',
    academicYear: '2026-27',
    at: FIXED_NOW,
    by: EVALUATOR,
    sharedWith: TEACHER_ONE,
    grants: [EVALUATOR, TEACHER_ONE],
    aclMode: 'private_named_viewers',
    aclVersion: 1,
    aclVerifiedAt: FIXED_NOW,
    history: [],
  };
  harness.replaceWorkspace(boot.workspace);
};

const createAnnualArchive = (harness) => {
  harness.setActiveEmail(ADMIN);
  const review = harness.invoke('reviewPortalAnnualRollover', { nextAcademicYear: '2027-28' }).review;
  return harness.invoke('performPortalAnnualRollover', {
    reviewToken: review.token,
    acknowledgeArchive: true,
    acknowledgeOpenCycles: true,
  }).archive;
};

const driftAnnualArchiveAcl = (harness, archiveId) => {
  const folderId = harness.properties.get('EE_ANNUAL_ARCHIVES_FOLDER_ID');
  harness.seedFolderAcl(folderId, {
    viewers: ['archive-folder-drift@district.example'],
    sharingAccess: 'DOMAIN_WITH_LINK',
    shareableByEditors: true,
  });
  harness.seedFileAcl(archiveId, {
    viewers: ['archive-file-drift@district.example'],
    sharingAccess: 'ANYONE_WITH_LINK',
    shareableByEditors: true,
  });
};

const seedPendingWorkspaceCommit = (harness) => {
  const boot = harness.invoke('bootstrap');
  const pendingId = harness.properties.get('EE_PENDING_COMMIT_FILE_ID');
  harness.driveFiles.get(pendingId).content = JSON.stringify({
    revision: boot.revision + 1,
    actorEmail: ADMIN,
    at: FIXED_NOW,
    workspace: boot.workspace,
  });
  harness.properties.set('EE_COMMIT_RECOVERY_REQUIRED', '1');
};

const seedPendingArtifactRecovery = (harness) => {
  const review = harness.invoke('reviewPortalDistrictExport', {
    scope: 'status_csv',
    purpose: 'Archive listing artifact recovery gate regression',
  }).review;
  harness.setDriveFault({ operation: 'setSharing', occurrence: 2, mode: 'throw' });
  expect(harness.invokeError('performPortalDistrictExport', {
    reviewToken: review.token,
    acknowledgePolicy: true,
  }).code).toBe('artifact_recovery_required');
  harness.clearDriveFaults();
  expect(harness.properties.get('EE_ARTIFACT_RECOVERY_REQUIRED')).toBe('1');
  const journal = JSON.parse(harness.properties.get('EE_ARTIFACT_OPERATION_JOURNAL'));
  expect(journal.entries.some((entry) => entry.stage !== 'completed')).toBe(true);
};

const functionBody = (name) => {
  const start = GS_SOURCE.indexOf(`function ${name}(`);
  expect(start, name).toBeGreaterThanOrEqual(0);
  const next = GS_SOURCE.indexOf('\nfunction ', start + 10);
  return GS_SOURCE.slice(start, next === -1 ? undefined : next);
};

describe('educator evaluation lock-time actor reauthorization', () => {
  it('rejects a save when the evaluator assignment is removed while waiting without any endpoint mutation', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const boot = harness.invoke('bootstrap');
    boot.workspace.walkthroughs.find((item) => item.id === 'walk-t1-private').interpretation = 'Must not be saved after assignment removal.';
    const request = {
      expectedVersion: boot.revision,
      workspace: boot.workspace,
      mutation: {
        teacherId: 't1',
        event: 'DRAFT_SAVED',
        entityType: 'walkthrough',
        entityId: 'walk-t1-private',
        version: 1,
      },
    };
    let afterRevocation;
    harness.setNextScriptLockTryLockHook(() => {
      setAssignmentActive(harness, false);
      afterRevocation = mutationSnapshot(harness);
    });

    expect(harness.invokeError('saveWorkspace', request).code).toBe('denied');
    expect(mutationSnapshot(harness)).toEqual(afterRevocation);

    setAssignmentActive(harness, true);
    expect(harness.invoke('saveWorkspace', request).ok).toBe(true);
  });

  it('rejects a notification when the evaluator assignment is removed while waiting without mail, throttle, or audit mutation', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const review = harness.invoke('reviewPortalNotification', { teacherId: 't1', target: 'teacher' }).review;
    const request = {
      teacherId: 't1', target: 'teacher', reviewToken: review.token, acknowledged: true,
    };
    let afterRevocation;
    harness.setNextScriptLockTryLockHook(() => {
      setAssignmentActive(harness, false);
      afterRevocation = mutationSnapshot(harness);
    });

    expect(harness.invoke('sendPortalNotification', request)).toMatchObject({
      ok: false,
      code: 'denied',
      preDispatch: true,
    });
    expect(mutationSnapshot(harness)).toEqual(afterRevocation);

    setAssignmentActive(harness, true);
    expect(harness.invoke('sendPortalNotification', request)).toMatchObject({ ok: true, sent: true });
    expect(harness.sentMail).toHaveLength(1);
  });

  it('rejects a released-summary share when the evaluator assignment is removed while waiting and preserves the exact review token', () => {
    const harness = repositoryFixture();
    finalizeTeacher(harness);
    harness.setActiveEmail(EVALUATOR);
    const review = harness.invoke('reviewPortalReleasedEvaluationShare', { teacherId: 't1' }).review;
    const request = { teacherId: 't1', reviewToken: review.token };
    let afterRevocation;
    harness.setNextScriptLockTryLockHook(() => {
      setAssignmentActive(harness, false);
      afterRevocation = mutationSnapshot(harness);
    });

    expect(harness.invokeError('sharePortalReleasedEvaluation', request).code).toBe('denied');
    expect(mutationSnapshot(harness)).toEqual(afterRevocation);

    setAssignmentActive(harness, true);
    expect(harness.invoke('sharePortalReleasedEvaluation', request)).toMatchObject({ ok: true, created: true });
  });

  it('rejects an open receipt when the teacher is deactivated while waiting without workspace or audit mutation', () => {
    const harness = repositoryFixture();
    seedReleasedSummary(harness);
    harness.setActiveEmail(TEACHER_ONE);
    const request = { teacherId: 't1' };
    let afterRevocation;
    harness.setNextScriptLockTryLockHook(() => {
      setMemberActive(harness, TEACHER_ONE, false);
      afterRevocation = mutationSnapshot(harness);
    });

    expect(harness.invokeError('recordReleasedSummaryOpened', request).code).toBe('denied');
    expect(mutationSnapshot(harness)).toEqual(afterRevocation);

    setMemberActive(harness, TEACHER_ONE, true);
    expect(harness.invoke('recordReleasedSummaryOpened', request)).toMatchObject({ ok: true, status: 'completed' });
  });

  it('rejects integrity repair when the administrator is demoted while waiting and leaves its review token unconsumed', () => {
    const harness = repositoryFixture();
    harness.properties.set('EE_SECONDARY_RECOVERY_JOURNAL', JSON.stringify({
      version: 1,
      at: FIXED_NOW,
      workspaceIndexes: true,
      configuration: false,
      auditEntries: [],
      manualReviewRequired: false,
    }));
    harness.properties.set('EE_SECONDARY_RECONCILE_REQUIRED', '1');
    harness.setActiveEmail(ADMIN);
    const review = harness.invoke('reviewPortalWorkspaceIntegrity').review;
    const cachedReview = harness.cachedAdminReview(review.token);
    const request = { reviewToken: review.token, acknowledgeRepair: true };
    let afterRevocation;
    harness.setNextScriptLockTryLockHook(() => {
      setMemberRole(harness, ADMIN, 'evaluator');
      afterRevocation = mutationSnapshot(harness);
    });

    expect(harness.invokeError('reconcilePortalWorkspaceIntegrity', request).code).toBe('denied');
    expect(mutationSnapshot(harness)).toEqual(afterRevocation);
    expect(harness.cachedAdminReview(review.token)).toEqual(cachedReview);

    setMemberRole(harness, ADMIN, 'admin');
    expect(harness.invoke('reconcilePortalWorkspaceIntegrity', request).ok).toBe(true);
    expect(harness.cachedAdminReview(review.token)).toBeNull();
  });

  it('rejects annual archive custody inspection when the administrator is demoted while waiting without endpoint mutation', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(ADMIN);
    const locksBefore = harness.scriptLockSnapshot();
    expect(locksBefore).toMatchObject({ held: false });
    expect(locksBefore.acquired).toBe(locksBefore.released);
    let afterRevocation;
    harness.setNextScriptLockTryLockHook(() => {
      setMemberRole(harness, ADMIN, 'evaluator');
      afterRevocation = mutationSnapshot(harness);
    });

    expect(harness.invokeError('getPortalAnnualArchives').code).toBe('denied');
    expect(mutationSnapshot(harness)).toEqual(afterRevocation);
    expect(harness.scriptLockSnapshot()).toEqual({
      acquired: locksBefore.acquired + 1,
      released: locksBefore.released + 1,
      held: false,
    });

    setMemberRole(harness, ADMIN, 'admin');
    expect(harness.invoke('getPortalAnnualArchives')).toMatchObject({ ok: true, archives: expect.any(Array) });
    expect(harness.scriptLockSnapshot()).toEqual({
      acquired: locksBefore.acquired + 2,
      released: locksBefore.released + 2,
      held: false,
    });
  });

  it('blocks annual archive custody repair behind a pending workspace commit without mutation', () => {
    const harness = repositoryFixture();
    const archive = createAnnualArchive(harness);
    seedPendingWorkspaceCommit(harness);
    driftAnnualArchiveAcl(harness, archive.id);
    const before = mutationSnapshot(harness);

    expect(harness.invokeError('getPortalAnnualArchives').code).toBe('commit_recovery_required');
    expect(mutationSnapshot(harness)).toEqual(before);
    const locks = harness.scriptLockSnapshot();
    expect(locks).toMatchObject({ held: false });
    expect(locks.acquired).toBe(locks.released);
  });

  it('blocks annual archive custody repair behind a consistently journaled artifact recovery without mutation', () => {
    const harness = repositoryFixture();
    const archive = createAnnualArchive(harness);
    seedPendingArtifactRecovery(harness);
    driftAnnualArchiveAcl(harness, archive.id);
    const before = mutationSnapshot(harness);

    expect(harness.invokeError('getPortalAnnualArchives').code).toBe('artifact_recovery_required');
    expect(mutationSnapshot(harness)).toEqual(before);
    const locks = harness.scriptLockSnapshot();
    expect(locks).toMatchObject({ held: false });
    expect(locks.acquired).toBe(locks.released);
  });

  it('keeps exact actor and current target checks before every locked side effect', () => {
    const helper = functionBody('requireSameActorLocked_');
    expect(helper).toContain('lockedActor = currentActor_()');
    expect(helper).toContain('lockedEmail !== expectedEmail');
    expect(helper).toContain('lockedRole !== expectedRole');
    expect(helper).toContain('lockedTeacherId !== expectedTeacherId');

    for (const name of [
      'saveWorkspace',
      'sharePortalReleasedEvaluation',
      'recordReleasedSummaryOpened',
    ]) {
      expect(functionBody(name), name).toMatch(/try\s*\{\s*actor = requireSameActorLocked_\(actor\);/);
    }
    expect(functionBody('saveWorkspace')).toMatch(/requireSameActorLocked_\(actor\);[\s\S]*?requireTeacherAccess_\(actor, lockedTeacherId\);[\s\S]*?writeWorkspaceState_/);
    expect(functionBody('reviewPortalNotification')).toMatch(/requireSameActorLocked_\(actor\);[\s\S]*?assertNotificationOperationGates_\(\);[\s\S]*?requireTeacherAccess_\(actor, teacherId\);[\s\S]*?notificationRecipientResolution_[\s\S]*?allowedDomain = normalizeDomain_/);
    expect(functionBody('sendPortalNotification')).toMatch(/actor = requireSameActorLocked_\(actor\);[\s\S]*?requireTeacherAccess_\(actor, teacherId\);[\s\S]*?notificationKnownOperation_[\s\S]*?assertNotificationReviewAvailable_[\s\S]*?assertNotificationOperationGates_\(\);[\s\S]*?notificationRecipientResolution_[\s\S]*?allowedDomain = normalizeDomain_[\s\S]*?upsertNotificationOperationEntry_[\s\S]*?MailApp\.sendEmail/);
    expect(functionBody('sharePortalReleasedEvaluation')).toMatch(/requireSameActorLocked_\(actor\);[\s\S]*?requireTeacherAccess_\(actor, teacherId\);[\s\S]*?recipient = teacherMemberEmail_[\s\S]*?allowedDomain = normalizeDomain_[\s\S]*?requireReleaseReview_/);
    expect(functionBody('recordReleasedSummaryOpened')).toMatch(/requireSameActorLocked_\(actor\);[\s\S]*?requireTeacherAccess_\(actor, teacherId\);[\s\S]*?writeWorkspaceState_/);
    expect(functionBody('reconcilePortalWorkspaceIntegrity')).toMatch(/try\s*\{\s*actor = requireSameAdminLocked_\(actor\);[\s\S]*?cache\.get\(key\)/);
    expect(functionBody('requireSameAdminLocked_')).toMatch(/requireSameActorLocked_\(actor\);[\s\S]*?lockedActor\.role !== 'admin'/);

    const annualArchives = functionBody('getPortalAnnualArchives');
    expect(annualArchives).toMatch(/try\s*\{\s*requireSameAdminLocked_\(actor\);/);
    expect(annualArchives).toMatch(/requireSameAdminLocked_\(actor\);[\s\S]*?assertNoArtifactOperationRecovery_\(\);[\s\S]*?assertNoPendingWorkspaceCommit_\(\);[\s\S]*?protectSensitiveFolderFiles_\(folder, 'Annual archives'\)/);
    expect(annualArchives).not.toContain('assertNoAnnualRolloverRecovery_');
    expect(annualArchives).toMatch(/finally\s*\{\s*lock\.releaseLock\(\);\s*\}/);
  });
});
