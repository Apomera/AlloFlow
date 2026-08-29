import { describe, expect, it } from 'vitest';
import { repositoryFixture, TEACHER_ONE, EVALUATOR, ADMIN } from './helpers/educator_evaluation_gs_harness.js';

const mutatingDriveOperations = new Set(['addViewer', 'removeViewer', 'removeEditor', 'setSharing', 'setShareableByEditors', 'setTrashed', 'moveTo']);
const driveMutationCount = (harness) => harness.driveOperations.filter((item) => mutatingDriveOperations.has(item.operation)).length;

const saveAs = (harness, email, mutate, mutation) => {
  harness.setActiveEmail(email);
  const boot = harness.invoke('bootstrap');
  mutate(boot.workspace);
  return harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation });
};

const releaseAndShare = () => {
  const harness = repositoryFixture();
  const evidenceToken = 'walkthrough:walk-t1';
  saveAs(harness, EVALUATOR, (workspace) => {
    const teacher = workspace.teachers.find((item) => item.id === 't1');
    teacher.ratings = { domains: { d1: 3, d2: 2, d3: 2, d4: 3 }, building: 2, teacher: 2, lea: 2 };
    teacher.annualRationales = { d1: 'Annual rationale 1', d2: 'Annual rationale 2', d3: 'Annual rationale 3', d4: 'Annual rationale 4' };
    teacher.annualEvidenceRefs = { d1: [evidenceToken], d2: [evidenceToken], d3: [evidenceToken], d4: [evidenceToken] };
  }, { teacherId: 't1', event: 'RATING_UPDATED', entityType: 'evaluation', entityId: 't1', version: 1 });
  saveAs(harness, EVALUATOR, (workspace) => {
    workspace.teachers.find((item) => item.id === 't1').finalizedAt = '2026-08-13T17:00:00.000Z';
  }, { teacherId: 't1', event: 'RELEASED', entityType: 'educator_cycle', entityId: 't1', version: 1 });
  harness.setActiveEmail(EVALUATOR);
  const review = harness.invoke('reviewPortalReleasedEvaluationShare', { teacherId: 't1' }).review;
  const shared = harness.invoke('sharePortalReleasedEvaluation', { teacherId: 't1', reviewToken: review.token });
  harness.setActiveEmail(ADMIN);
  return { harness, shared };
};

const recoveryItem = (documentId, stage = 'compensation', at = '2026-08-13T18:00:00.000Z') => ({
  kind: 'released_summary_acl_recovery', version: 1, at,
  teacherId: 't1', documentId, stage, actorEmail: EVALUATOR,
});

const setRecoveryItems = (harness, items) => {
  if (!items.length) harness.properties.delete('EE_RELEASE_RECOVERY_REQUIRED');
  else harness.properties.set('EE_RELEASE_RECOVERY_REQUIRED', JSON.stringify(items.length === 1 ? items[0] : items));
};

const readRecoveryItems = (harness) => {
  const raw = harness.properties.get('EE_RELEASE_RECOVERY_REQUIRED');
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
};

const seedReviewedOrphan = () => {
  const { harness, shared } = releaseAndShare();
  const folderId = harness.properties.get('EE_RELEASED_FOLDER_ID');
  const orphan = harness.createDriveFile({ id: 'reviewed-orphan-file', name: 'Uncommitted released summary', parentFolderId: folderId });
  setRecoveryItems(harness, [recoveryItem(orphan.id)]);
  return { harness, shared, folderId, orphan };
};

const confirmationSnapshot = (harness, fileIds) => ({
  workspace: harness.driveFiles.get(harness.properties.get('EE_WORKSPACE_FILE_ID')).content,
  queue: harness.properties.get('EE_RELEASE_RECOVERY_REQUIRED'),
  audit: JSON.stringify(harness.rows('Audit')),
  acls: JSON.stringify(fileIds.map((id) => [id, harness.fileAcl(id)])),
  mutations: driveMutationCount(harness),
  fileCount: harness.driveFiles.size,
  folderCount: harness.driveFolders.size,
});

describe('released-summary orphan recovery reviewed scope', () => {
  it('discloses and quarantines only the exact reviewed orphan queue item', () => {
    const { harness, orphan, folderId } = seedReviewedOrphan();
    const reviewed = recoveryItem(orphan.id, 'compensation');
    const unreviewedSameDocument = recoveryItem(orphan.id, 'share_acl', '2026-08-13T18:01:00.000Z');
    setRecoveryItems(harness, [reviewed, unreviewedSameDocument]);
    harness.seedFileAcl(orphan.id, {
      viewers: ['stale.viewer@district.example'], editors: ['stale.editor@district.example'],
      sharingAccess: 'DOMAIN_WITH_LINK', shareableByEditors: true, parentFolderId: folderId,
    });

    const review = harness.invoke('reviewPortalReleasedEvaluationAccessRecovery', {}).review;
    expect(review.counts).toMatchObject({ queuedItems: 2, orphanQueueItems: 1, orphanCandidates: 1, orphanManualReviewCandidates: 0 });
    expect(review.effects).toEqual(expect.arrayContaining([
      expect.stringContaining('exactly 1 reviewed unregistered released-summary recovery file'),
    ]));
    const serialized = JSON.stringify(review);
    expect(serialized).not.toContain(orphan.id);
    expect(serialized).not.toContain(TEACHER_ONE);
    expect(serialized).not.toContain(EVALUATOR);

    const result = harness.invoke('reconcilePortalReleasedEvaluationAccess', {
      reviewToken: review.token, acknowledgeAccessPolicy: true,
    });
    expect(result).toMatchObject({ quarantinedOrphans: 1, orphanRecoveryFailed: 0, accessRecoveryPending: true });
    expect(harness.fileAcl(orphan.id)).toMatchObject({
      owner: ADMIN, viewers: [], commenters: [], editors: [], sharingAccess: 'PRIVATE',
      shareableByEditors: false, parentFolderId: folderId, trashed: true,
    });
    expect(readRecoveryItems(harness)).toEqual([unreviewedSameDocument]);
  });

  it.each([
    ['added queue item', ({ harness, folderId, orphan }) => {
      const added = harness.createDriveFile({ id: 'added-after-review', parentFolderId: folderId });
      setRecoveryItems(harness, [recoveryItem(orphan.id), recoveryItem(added.id, 'document_build', '2026-08-13T18:02:00.000Z')]);
      return [orphan.id, added.id];
    }],
    ['removed queue item', ({ harness }) => { setRecoveryItems(harness, []); return []; }],
    ['replaced queue item', ({ harness, folderId }) => {
      const replacement = harness.createDriveFile({ id: 'replacement-after-review', parentFolderId: folderId });
      setRecoveryItems(harness, [recoveryItem(replacement.id)]);
      return [replacement.id];
    }],
    ['reparented candidate', ({ harness, orphan }) => {
      harness.seedFileAcl(orphan.id, { parentFolderId: harness.properties.get('EE_FOLDER_ID') });
      return [];
    }],
    ['changed candidate ACL', ({ harness, folderId, orphan }) => {
      harness.seedFileAcl(orphan.id, { viewers: ['changed.after.review@district.example'], parentFolderId: folderId });
      return [];
    }],
    ['changed candidate sharing permission', ({ harness, folderId, orphan }) => {
      harness.seedFileAcl(orphan.id, { sharingPermission: 'EDIT', parentFolderId: folderId });
      return [];
    }],
    ['changed candidate owner', ({ harness, folderId, orphan }) => {
      harness.seedFileAcl(orphan.id, { ownerEmail: 'other.owner@district.example', parentFolderId: folderId });
      return [];
    }],
    ['changed candidate retention state', ({ harness, orphan }) => { harness.driveFiles.get(orphan.id).trashed = true; return []; }],
  ])('rejects %s as stale before any Drive or workspace mutation', (_label, drift) => {
    const fixture = seedReviewedOrphan();
    const review = fixture.harness.invoke('reviewPortalReleasedEvaluationAccessRecovery', {}).review;
    const extraIds = drift(fixture) || [];
    const before = confirmationSnapshot(fixture.harness, [fixture.orphan.id].concat(extraIds));

    expect(fixture.harness.invokeError('reconcilePortalReleasedEvaluationAccess', {
      reviewToken: review.token, acknowledgeAccessPolicy: true,
    }).code).toBe('review_stale');
    expect(confirmationSnapshot(fixture.harness, [fixture.orphan.id].concat(extraIds))).toEqual(before);
  });

  it('requires manual review for duplicate or unverified candidate custody without mutation', () => {
    for (const mode of ['duplicate', 'wrong_owner']) {
      const { harness, orphan, folderId } = seedReviewedOrphan();
      if (mode === 'duplicate') setRecoveryItems(harness, [recoveryItem(orphan.id, 'compensation'), recoveryItem(orphan.id, 'document_build', '2026-08-13T18:02:00.000Z')]);
      else harness.seedFileAcl(orphan.id, { ownerEmail: 'other.owner@district.example', parentFolderId: folderId });
      const beforeMutations = driveMutationCount(harness);
      const workspaceBefore = harness.driveFiles.get(harness.properties.get('EE_WORKSPACE_FILE_ID')).content;
      const queueBefore = harness.properties.get('EE_RELEASE_RECOVERY_REQUIRED');
      const review = harness.invoke('reviewPortalReleasedEvaluationAccessRecovery', {}).review;
      expect(review).toMatchObject({ repairable: false, manualReviewRequired: true });
      expect(review.counts.orphanManualReviewCandidates).toBeGreaterThan(0);
      expect(JSON.stringify(review)).not.toContain(orphan.id);
      expect(harness.invokeError('reconcilePortalReleasedEvaluationAccess', {
        reviewToken: review.token, acknowledgeAccessPolicy: true,
      }).code).toBe('manual_recovery_required');
      expect(driveMutationCount(harness)).toBe(beforeMutations);
      expect(harness.driveFiles.get(harness.properties.get('EE_WORKSPACE_FILE_ID')).content).toBe(workspaceBefore);
      expect(harness.properties.get('EE_RELEASE_RECOVERY_REQUIRED')).toBe(queueBefore);
    }
  });
});
