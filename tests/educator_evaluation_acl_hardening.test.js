import { describe, expect, it } from 'vitest';
import { repositoryFixture, TEACHER_ONE, EVALUATOR, ADMIN } from './helpers/educator_evaluation_gs_harness.js';

const saveAs = (harness, email, mutate, mutation) => {
  harness.setActiveEmail(email);
  const boot = harness.invoke('bootstrap');
  mutate(boot.workspace);
  return harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation });
};

const reconcileWorkspaceIntegrity = (harness) => {
  const review = harness.invoke('reviewPortalWorkspaceIntegrity').review;
  return harness.invoke('reconcilePortalWorkspaceIntegrity', {
    reviewToken: review.token,
    acknowledgeRepair: true,
  });
};

const reconcileReleasedAccess = (harness, request = {}) => {
  const review = harness.invoke('reviewPortalReleasedEvaluationAccessRecovery', request).review;
  return harness.invoke('reconcilePortalReleasedEvaluationAccess', {
    reviewToken: review.token,
    acknowledgeAccessPolicy: true,
  });
};

const mutatingDriveOperations = new Set(['addViewer', 'removeViewer', 'removeEditor', 'setSharing', 'setShareableByEditors', 'setTrashed', 'moveTo']);
const driveMutationCount = (harness) => harness.driveOperations.filter((item) => mutatingDriveOperations.has(item.operation)).length;

const finalizeTeacher = (harness) => {
  const evidenceToken = 'walkthrough:walk-t1';
  const rated = saveAs(harness, EVALUATOR, (workspace) => {
    const record = workspace.teachers.find((item) => item.id === 't1');
    record.ratings = { domains: { d1: 3, d2: 2, d3: 2, d4: 3 }, building: 2, teacher: 2, lea: 2 };
    record.annualRationales = { d1: 'Annual rationale 1', d2: 'Annual rationale 2', d3: 'Annual rationale 3', d4: 'Annual rationale 4' };
    record.annualEvidenceRefs = { d1: [evidenceToken], d2: [evidenceToken], d3: [evidenceToken], d4: [evidenceToken] };
  }, { teacherId: 't1', event: 'RATING_UPDATED', entityType: 'evaluation', entityId: 't1', version: 1 });
  expect(rated.ok).toBe(true);
  const finalized = saveAs(harness, EVALUATOR, (workspace) => {
    workspace.teachers.find((item) => item.id === 't1').finalizedAt = '2026-08-13T17:00:00.000Z';
  }, { teacherId: 't1', event: 'RELEASED', entityType: 'educator_cycle', entityId: 't1', version: 1 });
  expect(finalized.ok).toBe(true);
};

const releaseAndShare = () => {
  const harness = repositoryFixture();
  finalizeTeacher(harness);
  harness.setActiveEmail(EVALUATOR);
  const review = harness.invoke('reviewPortalReleasedEvaluationShare', { teacherId: 't1' }).review;
  const shared = harness.invoke('sharePortalReleasedEvaluation', { teacherId: 't1', reviewToken: review.token });
  return { harness, shared };
};

const applyDirectoryChange = (harness, kind, candidate) => {
  harness.setActiveEmail(ADMIN);
  const review = harness.invoke('reviewPortalDirectoryChange', { kind, candidate }).review;
  return harness.invoke('performPortalDirectoryChange', { reviewToken: review.token, acknowledgeImpact: true });
};

const recoveryItems = (harness) => {
  const raw = harness.properties.get('EE_RELEASE_RECOVERY_REQUIRED');
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
};

describe('released-summary ACL adversarial hardening', () => {
  it('requires a current review and rejects an invalid educator scope without mutation', () => {
    const { harness, shared } = releaseAndShare();
    harness.setActiveEmail(ADMIN);
    const workspaceId = harness.properties.get('EE_WORKSPACE_FILE_ID');
    const before = {
      workspace: harness.driveFiles.get(workspaceId).content,
      recovery: harness.properties.get('EE_RELEASE_RECOVERY_REQUIRED'),
      audit: JSON.stringify(harness.rows('Audit')),
      acl: JSON.stringify(harness.fileAcl(shared.doc.id)),
      mutations: driveMutationCount(harness),
    };
    expect(harness.invokeError('reconcilePortalReleasedEvaluationAccess', { acknowledgeAccessPolicy: true }).code).toBe('review_required');
    expect(harness.invokeError('reviewPortalReleasedEvaluationAccessRecovery', { teacherId: 'missing-teacher' }).code).toBe('not_found');
    expect(harness.driveFiles.get(workspaceId).content).toBe(before.workspace);
    expect(harness.properties.get('EE_RELEASE_RECOVERY_REQUIRED')).toBe(before.recovery);
    expect(JSON.stringify(harness.rows('Audit'))).toBe(before.audit);
    expect(JSON.stringify(harness.fileAcl(shared.doc.id))).toBe(before.acl);
    expect(driveMutationCount(harness)).toBe(before.mutations);
  });

  it('blocks released-access recovery review while annual-rollover recovery is pending without mutation', () => {
    const { harness, shared } = releaseAndShare();
    harness.setActiveEmail(ADMIN);
    const marker = JSON.stringify({ stage: 'workspace_commit' });
    harness.properties.set('EE_ROLLOVER_RECOVERY_REQUIRED', marker);
    const workspaceId = harness.properties.get('EE_WORKSPACE_FILE_ID');
    const pendingId = harness.properties.get('EE_PENDING_COMMIT_FILE_ID');
    const before = {
      workspace: harness.driveFiles.get(workspaceId).content,
      pending: harness.driveFiles.get(pendingId).content,
      properties: JSON.stringify([...harness.properties.entries()].sort()),
      audit: JSON.stringify(harness.rows('Audit')),
      acl: JSON.stringify(harness.fileAcl(shared.doc.id)),
      files: harness.driveFiles.size,
      folders: harness.driveFolders.size,
      operations: JSON.stringify(harness.driveOperations),
      mutations: driveMutationCount(harness),
    };

    expect(harness.invokeError('reviewPortalReleasedEvaluationAccessRecovery', {}).code).toBe('rollover_recovery_required');
    expect(harness.properties.get('EE_ROLLOVER_RECOVERY_REQUIRED')).toBe(marker);
    expect(harness.driveFiles.get(workspaceId).content).toBe(before.workspace);
    expect(harness.driveFiles.get(pendingId).content).toBe(before.pending);
    expect(JSON.stringify([...harness.properties.entries()].sort())).toBe(before.properties);
    expect(JSON.stringify(harness.rows('Audit'))).toBe(before.audit);
    expect(JSON.stringify(harness.fileAcl(shared.doc.id))).toBe(before.acl);
    expect(harness.driveFiles.size).toBe(before.files);
    expect(harness.driveFolders.size).toBe(before.folders);
    expect(JSON.stringify(harness.driveOperations)).toBe(before.operations);
    expect(driveMutationCount(harness)).toBe(before.mutations);
  });

  it('binds a content-free recovery review to its administrator and consumes it once', () => {
    const { harness, shared } = releaseAndShare();
    const secondAdmin = 'recovery.admin@district.example';
    expect(applyDirectoryChange(harness, 'member', { email: secondAdmin, displayName: 'Recovery Admin', role: 'admin', active: true }).status).toBe('completed');
    harness.setActiveEmail(ADMIN);
    const review = harness.invoke('reviewPortalReleasedEvaluationAccessRecovery', {}).review;
    expect(review).toMatchObject({ scope: 'all', repairable: true, manualReviewRequired: false });
    expect(review.counts).toMatchObject({ targetEducators: 1, targetDocuments: 1, batchDocuments: 1 });
    const serialized = JSON.stringify(review);
    expect(serialized).not.toContain(shared.doc.id);
    expect(serialized).not.toContain(TEACHER_ONE);
    expect(serialized).not.toContain(EVALUATOR);
    expect(harness.invokeError('reconcilePortalReleasedEvaluationAccess', { reviewToken: review.token }).code).toBe('acknowledgment_required');
    harness.setActiveEmail(secondAdmin);
    expect(harness.invokeError('reconcilePortalReleasedEvaluationAccess', { reviewToken: review.token, acknowledgeAccessPolicy: true }).code).toBe('review_required');
    harness.setActiveEmail(ADMIN);
    expect(harness.invoke('reconcilePortalReleasedEvaluationAccess', { reviewToken: review.token, acknowledgeAccessPolicy: true }).ok).toBe(true);
    expect(harness.invokeError('reconcilePortalReleasedEvaluationAccess', { reviewToken: review.token, acknowledgeAccessPolicy: true }).code).toBe('review_required');
  });

  it('invalidates a released-summary recovery review when its queue changes', () => {
    const { harness, shared } = releaseAndShare();
    harness.setActiveEmail(ADMIN);
    const review = harness.invoke('reviewPortalReleasedEvaluationAccessRecovery', {}).review;
    harness.properties.set('EE_RELEASE_RECOVERY_REQUIRED', JSON.stringify({ kind: 'released_summary_acl_recovery', version: 1, at: '2026-08-13T18:00:00.000Z', teacherId: 't1', documentId: shared.doc.id, stage: 'directory_acl' }));
    const beforeMutations = driveMutationCount(harness);
    expect(harness.invokeError('reconcilePortalReleasedEvaluationAccess', { reviewToken: review.token, acknowledgeAccessPolicy: true }).code).toBe('review_stale');
    expect(driveMutationCount(harness)).toBe(beforeMutations);
  });

  it('requires manual review for unreadable or oversized recovery metadata without mutation', () => {
    const recoveryMetadata = [
      '{not-json',
      JSON.stringify(Array.from({ length: 25 }, (_, index) => ({
        kind: 'released_summary_acl_recovery', version: 1,
        at: '2026-08-13T18:00:00.000Z', teacherId: 't1',
        documentId: `overflow-document-${index}`, stage: 'directory_acl',
      }))),
    ];
    for (const raw of recoveryMetadata) {
      const { harness } = releaseAndShare();
      harness.setActiveEmail(ADMIN);
      harness.properties.set('EE_RELEASE_RECOVERY_REQUIRED', raw);
      const beforeMutations = driveMutationCount(harness);
      const workspaceId = harness.properties.get('EE_WORKSPACE_FILE_ID');
      const workspaceBefore = harness.driveFiles.get(workspaceId).content;

      const review = harness.invoke('reviewPortalReleasedEvaluationAccessRecovery', {}).review;
      expect(review).toMatchObject({ repairable: false, manualReviewRequired: true });
      expect(review.issueSamples).toEqual(expect.arrayContaining([
        expect.objectContaining({ category: 'recovery_metadata' }),
      ]));
      expect(harness.invokeError('reconcilePortalReleasedEvaluationAccess', {
        reviewToken: review.token,
        acknowledgeAccessPolicy: true,
      }).code).toBe('manual_recovery_required');
      expect(harness.properties.get('EE_RELEASE_RECOVERY_REQUIRED')).toBe(raw);
      expect(harness.driveFiles.get(workspaceId).content).toBe(workspaceBefore);
      expect(driveMutationCount(harness)).toBe(beforeMutations);
    }
  });

  it('invalidates a released-summary recovery review when directory membership changes', () => {
    const { harness } = releaseAndShare();
    harness.setActiveEmail(ADMIN);
    const review = harness.invoke('reviewPortalReleasedEvaluationAccessRecovery', {}).review;
    harness.appendSheetRow('Members', ['drift.admin@district.example', 'Drift Admin', 'admin', '', true]);
    const beforeMutations = driveMutationCount(harness);
    expect(harness.invokeError('reconcilePortalReleasedEvaluationAccess', { reviewToken: review.token, acknowledgeAccessPolicy: true }).code).toBe('review_stale');
    expect(driveMutationCount(harness)).toBe(beforeMutations);
  });

  it('invalidates a released-summary recovery review when the workspace revision changes', () => {
    const { harness } = releaseAndShare();
    harness.setActiveEmail(ADMIN);
    const review = harness.invoke('reviewPortalReleasedEvaluationAccessRecovery', {}).review;
    const configReview = harness.invoke('reviewPortalWorkspaceConfiguration', { config: { evaluatorName: 'Changed after access review' } }).review;
    expect(harness.invoke('performPortalWorkspaceConfiguration', { reviewToken: configReview.token, acknowledgeImpact: true }).ok).toBe(true);
    const beforeMutations = driveMutationCount(harness);
    expect(harness.invokeError('reconcilePortalReleasedEvaluationAccess', { reviewToken: review.token, acknowledgeAccessPolicy: true }).code).toBe('review_stale');
    expect(driveMutationCount(harness)).toBe(beforeMutations);
  });

  it('invalidates a released-summary recovery review when a reviewed document ACL changes', () => {
    const { harness, shared } = releaseAndShare();
    harness.setActiveEmail(ADMIN);
    const review = harness.invoke('reviewPortalReleasedEvaluationAccessRecovery', {}).review;
    harness.seedFileAcl(shared.doc.id, {
      viewers: [EVALUATOR, TEACHER_ONE, 'changed.after.review@district.example'],
      parentFolderId: harness.properties.get('EE_RELEASED_FOLDER_ID'),
    });
    const beforeMutations = driveMutationCount(harness);
    expect(harness.invokeError('reconcilePortalReleasedEvaluationAccess', { reviewToken: review.token, acknowledgeAccessPolicy: true }).code).toBe('review_stale');
    expect(driveMutationCount(harness)).toBe(beforeMutations);
    expect(harness.fileAcl(shared.doc.id).viewers).toContain('changed.after.review@district.example');
  });

  it('does not let an educator-scoped review consume global folder recovery', () => {
    const { harness } = releaseAndShare();
    harness.setActiveEmail(ADMIN);
    const folderId = harness.properties.get('EE_RELEASED_FOLDER_ID');
    const recovery = JSON.stringify({ kind: 'released_summary_acl_recovery', version: 1, at: '2026-08-13T18:00:00.000Z', teacherId: '', documentId: folderId, stage: 'release_folder_acl' });
    harness.properties.set('EE_RELEASE_RECOVERY_REQUIRED', recovery);
    const beforeMutations = driveMutationCount(harness);
    expect(harness.invokeError('reviewPortalReleasedEvaluationAccessRecovery', { teacherId: 't1' }).code).toBe('release_recovery_required');
    expect(harness.properties.get('EE_RELEASE_RECOVERY_REQUIRED')).toBe(recovery);
    expect(driveMutationCount(harness)).toBe(beforeMutations);
  });

  it('repairs reviewed released-folder ACL drift before reconciling documents', () => {
    const { harness } = releaseAndShare();
    harness.setActiveEmail(ADMIN);
    const folderId = harness.properties.get('EE_RELEASED_FOLDER_ID');
    harness.seedFolderAcl(folderId, {
      viewers: ['stale.folder.viewer@district.example'],
      editors: ['stale.folder.editor@district.example'],
      sharingAccess: 'DOMAIN_WITH_LINK',
      shareableByEditors: true,
    });

    const review = harness.invoke('reviewPortalReleasedEvaluationAccessRecovery', {}).review;
    expect(review).toMatchObject({ repairable: true, manualReviewRequired: false });
    expect(review.counts.folderQueueItems).toBe(1);
    expect(review.issueSamples).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: 'folder_acl_drift' }),
    ]));
    expect(harness.folderAcl(folderId).viewers).toEqual(['stale.folder.viewer@district.example']);

    const recovered = harness.invoke('reconcilePortalReleasedEvaluationAccess', {
      reviewToken: review.token,
      acknowledgeAccessPolicy: true,
    });
    expect(recovered.status).toBe('completed');
    expect(harness.folderAcl(folderId)).toMatchObject({
      owner: ADMIN, viewers: [], commenters: [], editors: [],
      sharingAccess: 'PRIVATE', shareableByEditors: false, trashed: false,
      parentFolderId: harness.properties.get('EE_FOLDER_ID'),
    });
    expect(recoveryItems(harness)).toEqual([]);
  });

  it('fails closed when released-folder principals cannot be inspected', () => {
    const { harness } = releaseAndShare();
    harness.setActiveEmail(ADMIN);
    const folderId = harness.properties.get('EE_RELEASED_FOLDER_ID');
    const unidentified = 'unidentified.folder.viewer@district.example';
    harness.seedFolderAcl(folderId, { viewers: [unidentified] });
    harness.setDriveUserIdentityMode(unidentified, 'blank');
    const beforeMutations = driveMutationCount(harness);

    const review = harness.invoke('reviewPortalReleasedEvaluationAccessRecovery', {}).review;
    expect(review).toMatchObject({ repairable: false, manualReviewRequired: true });
    expect(review.issueSamples).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: 'manual_folder_review' }),
    ]));
    expect(harness.invokeError('reconcilePortalReleasedEvaluationAccess', {
      reviewToken: review.token,
      acknowledgeAccessPolicy: true,
    }).code).toBe('manual_recovery_required');
    expect(driveMutationCount(harness)).toBe(beforeMutations);
    expect(harness.folderAcl(folderId).viewers).toEqual([unidentified]);
  });

  it('refreshes a commenter to viewer once and leaves an exact viewer ACL idempotent', () => {
    const { harness, shared } = releaseAndShare();
    const folderId = harness.properties.get('EE_RELEASED_FOLDER_ID');
    harness.seedFileAcl(shared.doc.id, {
      viewers: [EVALUATOR], commenters: [TEACHER_ONE], editors: [], sharingAccess: 'PRIVATE',
      shareableByEditors: true, parentFolderId: folderId,
    });
    harness.driveOperations.splice(0);

    harness.setActiveEmail(EVALUATOR);
    let review = harness.invoke('reviewPortalReleasedEvaluationShare', { teacherId: 't1' }).review;
    expect(harness.invoke('sharePortalReleasedEvaluation', { teacherId: 't1', reviewToken: review.token }).ok).toBe(true);
    expect(harness.fileAcl(shared.doc.id)).toMatchObject({
      viewers: [EVALUATOR, TEACHER_ONE].sort(), commenters: [], editors: [], sharingAccess: 'PRIVATE', shareableByEditors: false,
    });
    const firstOps = harness.driveOperations.filter((item) => item.fileId === shared.doc.id);
    expect(firstOps).toEqual(expect.arrayContaining([
      expect.objectContaining({ operation: 'getAccess', email: TEACHER_ONE }),
      expect.objectContaining({ operation: 'removeViewer', email: TEACHER_ONE }),
      expect.objectContaining({ operation: 'addViewer', email: TEACHER_ONE }),
    ]));

    harness.driveOperations.splice(0);
    review = harness.invoke('reviewPortalReleasedEvaluationShare', { teacherId: 't1' }).review;
    expect(harness.invoke('sharePortalReleasedEvaluation', { teacherId: 't1', reviewToken: review.token }).ok).toBe(true);
    expect(harness.driveOperations.filter((item) => item.fileId === shared.doc.id && ['addViewer', 'removeViewer', 'removeEditor'].includes(item.operation))).toEqual([]);
  });

  it('repairs broad folder permissions before touching the existing released document', () => {
    const { harness, shared } = releaseAndShare();
    const folderId = harness.properties.get('EE_RELEASED_FOLDER_ID');
    harness.seedFolderAcl(folderId, {
      viewers: ['folder.viewer@district.example'], commenters: ['folder.commenter@district.example'],
      editors: ['folder.editor@district.example'], sharingAccess: 'DOMAIN_WITH_LINK', shareableByEditors: true,
    });
    harness.setActiveEmail(EVALUATOR);
    const review = harness.invoke('reviewPortalReleasedEvaluationShare', { teacherId: 't1' }).review;
    const verified = harness.invoke('sharePortalReleasedEvaluation', { teacherId: 't1', reviewToken: review.token });
    expect(verified).toMatchObject({ ok: true, created: false, doc: { id: shared.doc.id } });
    expect(harness.folderAcl(folderId)).toMatchObject({
      owner: ADMIN, viewers: [], commenters: [], editors: [], sharingAccess: 'PRIVATE', shareableByEditors: false,
      parentFolderId: harness.properties.get('EE_FOLDER_ID'), trashed: false,
    });
    expect(harness.documents).toHaveLength(1);
  });

  it('journals a trashed managed folder and requires successful folder recovery before document reconciliation', () => {
    const { harness, shared } = releaseAndShare();
    const folderId = harness.properties.get('EE_RELEASED_FOLDER_ID');
    harness.seedFolderAcl(folderId, { trashed: true });
    harness.setActiveEmail(EVALUATOR);
    const review = harness.invoke('reviewPortalReleasedEvaluationShare', { teacherId: 't1' }).review;
    harness.driveOperations.splice(0);
    const failure = harness.invokeError('sharePortalReleasedEvaluation', { teacherId: 't1', reviewToken: review.token });
    expect(failure.code).toBe('release_recovery_required');
    expect(recoveryItems(harness)).toContainEqual(expect.objectContaining({ documentId: folderId, stage: 'release_folder_acl' }));
    expect(harness.driveOperations.filter((item) => item.fileId === shared.doc.id && ['addViewer', 'removeViewer', 'removeEditor', 'setSharing'].includes(item.operation))).toEqual([]);

    harness.setActiveEmail(ADMIN);
    const blockedReview = harness.invoke('reviewPortalReleasedEvaluationAccessRecovery', {}).review;
    expect(blockedReview).toMatchObject({ repairable: false, manualReviewRequired: true });
    const beforeBlockedConfirmation = driveMutationCount(harness);
    expect(harness.invokeError('reconcilePortalReleasedEvaluationAccess', {
      reviewToken: blockedReview.token,
      acknowledgeAccessPolicy: true,
    }).code).toBe('manual_recovery_required');
    expect(driveMutationCount(harness)).toBe(beforeBlockedConfirmation);
    harness.seedFolderAcl(folderId, { trashed: false });
    const recovered = reconcileReleasedAccess(harness);
    expect(recovered.status).toBe('completed');
    expect(recoveryItems(harness)).toEqual([]);
  });

  it('keeps retirement intent through a failed pass and continuously strips access from restored retired files', () => {
    const { harness, shared } = releaseAndShare();
    harness.setActiveEmail(ADMIN);
    const boot = harness.invoke('bootstrap');
    boot.workspace.releaseRegistry.find((item) => item.id === shared.doc.id).status = 'unavailable';
    harness.replaceWorkspace(boot.workspace);
    harness.seedFileAcl(shared.doc.id, {
      viewers: [EVALUATOR, TEACHER_ONE, 'stale.viewer@district.example'], sharingAccess: 'PRIVATE',
      parentFolderId: harness.properties.get('EE_RELEASED_FOLDER_ID'),
    });
    harness.setDriveFault({ operation: 'removeViewer', fileId: shared.doc.id, email: 'stale.viewer@district.example', mode: 'sticky' });
    const failed = reconcileReleasedAccess(harness);
    expect(failed.status).toBe('recovery_pending');
    expect(harness.invoke('bootstrap').workspace.releaseRegistry.find((item) => item.id === shared.doc.id).status).toBe('retirement_pending');

    harness.clearDriveFaults();
    const retired = reconcileReleasedAccess(harness);
    expect(retired.status).toBe('completed');
    expect(harness.fileAcl(shared.doc.id)).toMatchObject({ viewers: [], commenters: [], editors: [], sharingAccess: 'PRIVATE' });
    expect(harness.invoke('bootstrap').workspace.releaseRegistry.find((item) => item.id === shared.doc.id)).toMatchObject({ status: 'retired', grants: [] });

    harness.seedFileAcl(shared.doc.id, { viewers: ['restored.viewer@district.example'] });
    expect(reconcileReleasedAccess(harness).status).toBe('completed');
    expect(harness.fileAcl(shared.doc.id).viewers).toEqual([]);
  });

  it('records directory ACL intent before a failing row append and clears it only after recovery', () => {
    const { harness } = releaseAndShare();
    const replacement = 'intent.evaluator@district.example';
    expect(applyDirectoryChange(harness, 'member', { email: replacement, displayName: 'Intent Evaluator', role: 'evaluator', active: true }).status).toBe('completed');
    harness.setActiveEmail(ADMIN);
    const review = harness.invoke('reviewPortalDirectoryChange', {
      kind: 'assignment', candidate: { teacherId: 't1', evaluatorEmail: replacement, active: true },
    }).review;
    harness.setFailSheetAppend('Assignments', true);
    harness.invokeError('performPortalDirectoryChange', { reviewToken: review.token, acknowledgeImpact: true });
    expect(recoveryItems(harness)).toContainEqual(expect.objectContaining({ teacherId: 't1', documentId: '', stage: 'directory_acl_pending' }));
    expect(harness.rows('Assignments').some((row) => row[0] === 't1' && row[1] === replacement)).toBe(false);

    harness.setFailSheetAppend('Assignments', false);
    const recovered = reconcileReleasedAccess(harness);
    expect(recovered.status).toBe('completed');
    expect(recoveryItems(harness)).toEqual([]);
  });

  it('continues ACL reconciliation after an audit append failure and converges a scope larger than one batch', () => {
    const { harness, shared } = releaseAndShare();
    harness.setFailSheetAppend('Audit', true);
    const changed = applyDirectoryChange(harness, 'assignment', { teacherId: 't1', evaluatorEmail: EVALUATOR, active: false });
    expect(changed).toMatchObject({ status: 'recovery_pending', recoveryPending: true, auditPending: true });
    expect(harness.fileAcl(shared.doc.id).viewers).toEqual([TEACHER_ONE]);
    expect(harness.properties.get('EE_SECONDARY_RECONCILE_REQUIRED')).toBe('1');
    harness.setFailSheetAppend('Audit', false);

    harness.setActiveEmail(ADMIN);
    const boot = harness.invoke('bootstrap');
    const seed = boot.workspace.releaseRegistry.find((item) => item.id === shared.doc.id);
    const folderId = harness.properties.get('EE_RELEASED_FOLDER_ID');
    for (let index = 0; index < 25; index += 1) {
      const id = `batch-history-${String(index).padStart(2, '0')}`;
      harness.createDriveFile({ id, name: `Historical ${index}`, parentFolderId: folderId });
      harness.seedFileAcl(id, { viewers: [TEACHER_ONE], sharingAccess: 'PRIVATE', parentFolderId: folderId });
      boot.workspace.releaseRegistry.push({ ...seed, id, url: `https://docs.google.com/document/d/${id}`, status: 'historical' });
    }
    harness.replaceWorkspace(boot.workspace);
    const firstReview = harness.invoke('reviewPortalReleasedEvaluationAccessRecovery', {}).review;
    expect(firstReview.counts).toMatchObject({ targetDocuments: 26, batchDocuments: 20, deferredDocuments: 6 });
    const first = harness.invoke('reconcilePortalReleasedEvaluationAccess', { reviewToken: firstReview.token, acknowledgeAccessPolicy: true });
    expect(first).toMatchObject({ status: 'recovery_pending', deferred: 6 });
    const second = reconcileReleasedAccess(harness);
    expect(second).toMatchObject({ status: 'recovery_pending', recoveryPending: true, accessRecoveryPending: false, auditPending: true, deferred: 0 });
    const after = harness.invoke('bootstrap');
    expect(after.workspace.releaseRegistry.some((item) => ['recovery_pending', 'retirement_pending'].includes(item.status))).toBe(false);
    expect(recoveryItems(harness)).toEqual([]);
    expect(reconcileWorkspaceIntegrity(harness)).toMatchObject({ status: 'completed', recoveryPending: false });
  });

  it('reports access reconciliation audit repair separately from Drive recovery', () => {
    const { harness, shared } = releaseAndShare();
    harness.setActiveEmail(ADMIN);
    harness.setFailSheetAppend('Audit', true);

    const result = reconcileReleasedAccess(harness);
    expect(result).toMatchObject({
      ok: true,
      status: 'recovery_pending',
      recoveryPending: true,
      accessRecoveryPending: false,
      auditPending: true,
      reconciled: 1,
      failed: 0,
      deferred: 0,
    });
    expect(harness.fileAcl(shared.doc.id)).toMatchObject({
      viewers: [EVALUATOR, TEACHER_ONE].sort(),
      editors: [],
      sharingAccess: 'PRIVATE',
    });
    expect(recoveryItems(harness)).toEqual([]);

    const workspace = harness.invoke('bootstrap').workspace;
    const entry = workspace.audit.find((item) => item.event === 'RELEASED_DOC_ACCESS_RECONCILED' && item.teacherId === 't1');
    expect(entry).toBeTruthy();
    expect(harness.rows('Audit').slice(1).filter((row) => row[0] === entry.id)).toHaveLength(0);

    harness.setFailSheetAppend('Audit', false);
    expect(reconcileWorkspaceIntegrity(harness)).toMatchObject({
      status: 'completed',
      recoveryPending: false,
      repaired: { workspaceIndexRows: 1 },
    });
    expect(harness.rows('Audit').slice(1).filter((row) => row[0] === entry.id)).toHaveLength(1);
  });
});
