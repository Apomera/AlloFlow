import { describe, expect, it } from 'vitest';

import {
  repositoryFixture,
  ADMIN,
} from './helpers/educator_evaluation_gs_harness.js';

const createExport = (harness) => {
  harness.setActiveEmail(ADMIN);
  const review = harness.invoke('reviewPortalDistrictExport', {
    scope: 'educator_record',
    teacherId: 't1',
    purpose: 'Privacy revalidation regression',
  }).review;
  return harness.invoke('performPortalDistrictExport', {
    reviewToken: review.token,
    acknowledgePolicy: true,
  });
};

const reviewExport = (harness) => harness.invoke('reviewPortalDistrictExport', {
  scope: 'status_csv',
  purpose: 'Privacy failure regression',
}).review;

const rollover = (harness, nextAcademicYear) => {
  harness.setActiveEmail(ADMIN);
  const review = harness.invoke('reviewPortalAnnualRollover', { nextAcademicYear }).review;
  return harness.invoke('performPortalAnnualRollover', {
    reviewToken: review.token,
    acknowledgeArchive: true,
    acknowledgeOpenCycles: true,
  });
};

const rehearse = (harness, archiveId) => {
  harness.setActiveEmail(ADMIN);
  const review = harness.invoke('reviewPortalArchiveRestoreRehearsal', { archiveId }).review;
  return harness.invoke('performPortalArchiveRestoreRehearsal', {
    reviewToken: review.token,
    acknowledgeNoLiveRestore: true,
  });
};

const privateOwnerOnly = {
  owner: ADMIN,
  viewers: [],
  commenters: [],
  editors: [],
  sharingAccess: 'PRIVATE',
  shareableByEditors: false,
};

const mutatingDriveOperations = new Set([
  'addViewer', 'addEditor', 'removeViewer', 'removeEditor',
  'setSharing', 'setShareableByEditors', 'setTrashed', 'moveTo',
]);
const driveMutationCount = (harness) => harness.driveOperations
  .filter((item) => mutatingDriveOperations.has(item.operation)).length;

const placeArchiveAfterDecoys = (harness, archiveId, decoyCount) => {
  const folderId = harness.properties.get('EE_ANNUAL_ARCHIVES_FOLDER_ID');
  const archive = harness.driveFiles.get(archiveId);
  harness.driveFiles.delete(archiveId);
  for (let index = 0; index < decoyCount; index += 1) {
    harness.createDriveFile({
      id: `annual-lookup-decoy-${String(index).padStart(3, '0')}`,
      name: `Annual lookup decoy ${index}.json`,
      content: '{}',
      parentFolderId: folderId,
    });
  }
  harness.driveFiles.set(archiveId, archive);
  return archive;
};

const exactRepositorySnapshot = (harness) => ({
  workspace: harness.driveFiles.get(harness.properties.get('EE_WORKSPACE_FILE_ID')).content,
  properties: Object.fromEntries([...harness.properties.entries()].sort(([left], [right]) => left.localeCompare(right))),
  audit: harness.rows('Audit'),
  drive: JSON.stringify({
    files: [...harness.driveFiles.entries()],
    folders: [...harness.driveFolders.entries()],
  }),
  driveMutations: driveMutationCount(harness),
});

describe('Educator Evaluation sensitive Drive privacy revalidation', () => {
  it('repairs and reuses the existing Authorized exports folder, then fails closed when privacy cannot be read back', () => {
    const harness = repositoryFixture();
    const first = createExport(harness);
    const folderId = harness.properties.get('EE_AUTHORIZED_EXPORTS_FOLDER_ID');
    const folderCount = harness.driveFolders.size;

    harness.seedFolderAcl(folderId, {
      viewers: ['stale.viewer@district.example'],
      editors: ['stale.editor@district.example'],
      sharingAccess: 'DOMAIN_WITH_LINK',
      shareableByEditors: true,
    });
    const repaired = createExport(harness);
    expect(harness.properties.get('EE_AUTHORIZED_EXPORTS_FOLDER_ID')).toBe(folderId);
    expect(harness.driveFolders.size).toBe(folderCount);
    expect(harness.folderAcl(folderId)).toMatchObject(privateOwnerOnly);
    expect(harness.fileAcl(first.export.id).parentFolderId).toBe(folderId);
    expect(harness.fileAcl(repaired.export.id).parentFolderId).toBe(folderId);

    harness.seedFolderAcl(folderId, { viewers: ['sticky.viewer@district.example'] });
    harness.setDriveFault({
      operation: 'removeViewer',
      fileId: folderId,
      email: 'sticky.viewer@district.example',
      mode: 'sticky',
    });
    const filesBeforeExplicitFailure = harness.driveFiles.size;
    let review = reviewExport(harness);
    let error = harness.invokeError('performPortalDistrictExport', {
      reviewToken: review.token,
      acknowledgePolicy: true,
    });
    expect(error.code).toBe('protection_failed');
    expect(harness.properties.get('EE_AUTHORIZED_EXPORTS_FOLDER_ID')).toBe(folderId);
    expect(harness.driveFolders.size).toBe(folderCount);
    expect(harness.driveFiles.size).toBe(filesBeforeExplicitFailure);

    harness.clearDriveFaults();
    harness.seedFolderAcl(folderId, { viewers: [], sharingAccess: 'DOMAIN_WITH_LINK' });
    harness.setDriveFault({ operation: 'setSharing', fileId: folderId, mode: 'sticky' });
    const filesBeforeLinkFailure = harness.driveFiles.size;
    review = reviewExport(harness);
    error = harness.invokeError('performPortalDistrictExport', {
      reviewToken: review.token,
      acknowledgePolicy: true,
    });
    expect(error.code).toBe('protection_failed');
    expect(harness.properties.get('EE_AUTHORIZED_EXPORTS_FOLDER_ID')).toBe(folderId);
    expect(harness.driveFolders.size).toBe(folderCount);
    expect(harness.driveFiles.size).toBe(filesBeforeLinkFailure);
  });

  it('reviews existing export ACL drift without mutation, then repairs every prior export before creating another', () => {
    const harness = repositoryFixture();
    const first = createExport(harness);
    const filesBefore = harness.driveFiles.size;
    harness.seedFileAcl(first.export.id, {
      viewers: ['prior.viewer@district.example'],
      editors: ['prior.editor@district.example'],
      sharingAccess: 'DOMAIN_WITH_LINK',
      shareableByEditors: true,
    });

    const beforeReview = harness.fileAcl(first.export.id);
    const review = reviewExport(harness);
    expect(review.authorizedExportsAcl).toMatchObject({
      status: 'drift_detected',
      inspectable: true,
      manualReviewRequired: false,
      fileCount: 1,
      driftedFileCount: 1,
      explicitAccessCount: 2,
    });
    expect(harness.fileAcl(first.export.id)).toMatchObject(beforeReview);
    expect(harness.driveFiles.size).toBe(filesBefore);

    const completed = harness.invoke('performPortalDistrictExport', {
      reviewToken: review.token,
      acknowledgePolicy: true,
    });
    expect(completed.status).toBe('completed');
    expect(harness.fileAcl(first.export.id)).toMatchObject(privateOwnerOnly);
    expect(harness.fileAcl(completed.export.id)).toMatchObject(privateOwnerOnly);
    expect(harness.driveFiles.size).toBe(filesBefore + 1);
  });

  it('invalidates an export review when a same-count named ACL changes before confirmation', () => {
    const harness = repositoryFixture();
    const first = createExport(harness);
    harness.seedFileAcl(first.export.id, { viewers: ['reviewed.viewer@district.example'] });
    const review = reviewExport(harness);
    const filesBefore = harness.driveFiles.size;

    harness.seedFileAcl(first.export.id, { viewers: ['changed.viewer@district.example'] });
    const error = harness.invokeError('performPortalDistrictExport', {
      reviewToken: review.token,
      acknowledgePolicy: true,
    });
    expect(error.code).toBe('review_stale');
    expect(harness.driveFiles.size).toBe(filesBefore);
    expect(harness.fileAcl(first.export.id).viewers).toEqual(['changed.viewer@district.example']);
  });

  it('requires manual review when an existing export principal cannot be identified and creates no file', () => {
    const harness = repositoryFixture();
    const first = createExport(harness);
    const unidentified = 'unidentified.viewer@district.example';
    harness.seedFileAcl(first.export.id, { viewers: [unidentified] });
    harness.setDriveUserIdentityMode(unidentified, 'blank');
    const filesBefore = harness.driveFiles.size;

    const review = reviewExport(harness);
    expect(review.authorizedExportsAcl).toMatchObject({
      status: 'manual_review_required',
      inspectable: false,
      manualReviewRequired: true,
    });
    const error = harness.invokeError('performPortalDistrictExport', {
      reviewToken: review.token,
      acknowledgePolicy: true,
    });
    expect(error.code).toBe('acl_manual_review_required');
    expect(harness.driveFiles.size).toBe(filesBefore);
    expect(harness.fileAcl(first.export.id).viewers).toEqual([unidentified]);
  });

  it('requires manual review when Authorized Exports custody or managed location changes', () => {
    const cases = [
      {
        name: 'folder owner',
        mutate: (harness, folderId) => harness.seedFolderAcl(folderId, { ownerEmail: 'other.owner@district.example' }),
      },
      {
        name: 'folder location',
        mutate: (harness, folderId) => harness.seedFolderAcl(folderId, { parentFolderId: 'outside-managed-repository' }),
      },
      {
        name: 'file owner',
        mutate: (harness, folderId, fileId) => harness.seedFileAcl(fileId, { ownerEmail: 'other.owner@district.example', parentFolderId: folderId }),
      },
    ];
    for (const scenario of cases) {
      const harness = repositoryFixture();
      const first = createExport(harness);
      const folderId = harness.properties.get('EE_AUTHORIZED_EXPORTS_FOLDER_ID');
      scenario.mutate(harness, folderId, first.export.id);
      const filesBefore = harness.driveFiles.size;
      const folderBefore = harness.folderAcl(folderId);
      const fileBefore = harness.fileAcl(first.export.id);

      const review = reviewExport(harness);
      expect(review.authorizedExportsAcl, scenario.name).toMatchObject({
        status: 'manual_review_required',
        inspectable: false,
        manualReviewRequired: true,
      });
      expect(harness.invokeError('performPortalDistrictExport', {
        reviewToken: review.token,
        acknowledgePolicy: true,
      }).code, scenario.name).toBe('acl_manual_review_required');
      expect(harness.driveFiles.size, scenario.name).toBe(filesBefore);
      expect(harness.folderAcl(folderId), scenario.name).toMatchObject(folderBefore);
      expect(harness.fileAcl(first.export.id), scenario.name).toMatchObject(fileBefore);
    }
  });

  it('fails closed when Authorized Exports exceeds the bounded ACL inspection limit', () => {
    const harness = repositoryFixture();
    const first = createExport(harness);
    const folderId = harness.properties.get('EE_AUTHORIZED_EXPORTS_FOLDER_ID');
    for (let index = 0; index < 250; index += 1) {
      harness.createDriveFile({
        id: `authorized-export-history-${String(index).padStart(3, '0')}`,
        name: `Historical private export ${index}`,
        parentFolderId: folderId,
      });
    }
    const filesBefore = harness.driveFiles.size;
    const folderAclBefore = harness.folderAcl(folderId);
    const firstAclBefore = harness.fileAcl(first.export.id);
    const artifactJournalBefore = harness.properties.get('EE_ARTIFACT_OPERATION_JOURNAL');

    const error = harness.invokeError('reviewPortalDistrictExport', {
      scope: 'status_csv',
      purpose: 'Bounded inventory refusal regression',
    });
    expect(error.code).toBe('acl_manual_review_required');
    expect(error.message).toContain('bounded ACL inspection limit');
    expect(harness.driveFiles.size).toBe(filesBefore);
    expect(harness.folderAcl(folderId)).toMatchObject(folderAclBefore);
    expect(harness.fileAcl(first.export.id)).toMatchObject(firstAclBefore);
    expect(harness.properties.get('EE_ARTIFACT_OPERATION_JOURNAL')).toBe(artifactJournalBefore);
  });

  it('revalidates the Annual archives folder and files when archives are listed and selected for rehearsal', () => {
    const harness = repositoryFixture();
    rollover(harness, '2027-28');
    const folderId = harness.properties.get('EE_ANNUAL_ARCHIVES_FOLDER_ID');
    const archiveId = [...harness.driveFiles.values()].find((file) => file.parentFolderId === folderId).id;

    harness.seedFolderAcl(folderId, {
      viewers: ['archive.viewer@district.example'],
      editors: ['archive.editor@district.example'],
      sharingAccess: 'DOMAIN_WITH_LINK',
      shareableByEditors: true,
    });
    harness.seedFileAcl(archiveId, {
      viewers: ['file.viewer@district.example'],
      editors: ['file.editor@district.example'],
      sharingAccess: 'ANYONE_WITH_LINK',
      shareableByEditors: true,
    });
    const listed = harness.invoke('getPortalAnnualArchives');
    expect(listed.archives).toHaveLength(1);
    expect(listed.archives[0]).toMatchObject({ id: archiveId, verified: true });
    expect(harness.folderAcl(folderId)).toMatchObject(privateOwnerOnly);
    expect(harness.fileAcl(archiveId)).toMatchObject(privateOwnerOnly);

    harness.seedFileAcl(archiveId, {
      commenters: ['archive.commenter@district.example'],
      sharingAccess: 'DOMAIN_WITH_LINK',
      shareableByEditors: true,
    });
    const review = harness.invoke('reviewPortalArchiveRestoreRehearsal', { archiveId }).review;
    expect(review.archiveId).toBe(archiveId);
    expect(harness.fileAcl(archiveId)).toMatchObject(privateOwnerOnly);

    harness.seedFileAcl(archiveId, { sharingAccess: 'DOMAIN_WITH_LINK' });
    harness.setDriveFault({ operation: 'setSharing', fileId: archiveId, mode: 'sticky' });
    const error = harness.invokeError('reviewPortalArchiveRestoreRehearsal', { archiveId });
    expect(error.code).toBe('protection_failed');
  });

  it('finds a selected annual archive at the exact bounded lookup limit', () => {
    const harness = repositoryFixture();
    rollover(harness, '2027-28');
    const archiveId = JSON.parse(harness.properties.get('EE_LAST_ROLLOVER')).archiveId;
    const archive = placeArchiveAfterDecoys(harness, archiveId, 249);
    const originalGetId = archive.getId.bind(archive);
    let selectedIdReads = 0;
    archive.getId = () => {
      selectedIdReads += 1;
      return originalGetId();
    };

    const result = harness.invoke('reviewPortalArchiveRestoreRehearsal', { archiveId });
    expect(result.review.archiveId).toBe(archiveId);
    expect(selectedIdReads).toBeGreaterThan(0);
  });

  it('refuses an annual archive lookup beyond 250 items before reading item 251 and without mutation', () => {
    const harness = repositoryFixture();
    rollover(harness, '2027-28');
    const archiveId = JSON.parse(harness.properties.get('EE_LAST_ROLLOVER')).archiveId;
    const archive = placeArchiveAfterDecoys(harness, archiveId, 250);
    const originalGetId = archive.getId.bind(archive);
    let selectedIdReads = 0;
    archive.getId = () => {
      selectedIdReads += 1;
      return originalGetId();
    };
    const before = exactRepositorySnapshot(harness);

    const error = harness.invokeError('reviewPortalArchiveRestoreRehearsal', { archiveId });

    expect(error.code).toBe('acl_manual_review_required');
    expect(error.message).toContain('bounded lookup inspection limit');
    expect(selectedIdReads).toBe(0);
    expect(exactRepositorySnapshot(harness)).toEqual(before);
  });

  it('checks prior annual artifacts before rollover and does not create the next archive when an ACL survives removal', () => {
    const harness = repositoryFixture();
    rollover(harness, '2027-28');
    const folderId = harness.properties.get('EE_ANNUAL_ARCHIVES_FOLDER_ID');
    const priorArchive = [...harness.driveFiles.values()].find((file) => file.parentFolderId === folderId);
    harness.seedFolderAcl(folderId, { sharingAccess: 'DOMAIN_WITH_LINK', shareableByEditors: true });
    harness.seedFileAcl(priorArchive.id, { viewers: ['sticky.archive.viewer@district.example'] });
    harness.setDriveFault({
      operation: 'removeViewer',
      fileId: priorArchive.id,
      email: 'sticky.archive.viewer@district.example',
      mode: 'sticky',
    });
    const archiveCountBefore = [...harness.driveFiles.values()].filter((file) => file.parentFolderId === folderId).length;
    let review = harness.invoke('reviewPortalAnnualRollover', { nextAcademicYear: '2028-29' }).review;
    const error = harness.invokeError('performPortalAnnualRollover', {
      reviewToken: review.token,
      acknowledgeArchive: true,
      acknowledgeOpenCycles: true,
    });
    expect(error.code).toBe('protection_failed');
    expect(harness.invoke('bootstrap').workspace.config.academicYear).toBe('2027-28');
    expect([...harness.driveFiles.values()].filter((file) => file.parentFolderId === folderId)).toHaveLength(archiveCountBefore);
    expect(harness.properties.has('EE_ROLLOVER_RECOVERY_REQUIRED')).toBe(false);

    harness.clearDriveFaults();
    review = harness.invoke('reviewPortalAnnualRollover', { nextAcademicYear: '2028-29' }).review;
    const completed = harness.invoke('performPortalAnnualRollover', {
      reviewToken: review.token,
      acknowledgeArchive: true,
      acknowledgeOpenCycles: true,
    });
    expect(completed.status).toBe('completed');
    expect(harness.folderAcl(folderId)).toMatchObject(privateOwnerOnly);
    expect(harness.fileAcl(priorArchive.id)).toMatchObject(privateOwnerOnly);
    expect([...harness.driveFiles.values()].filter((file) => file.parentFolderId === folderId)).toHaveLength(archiveCountBefore + 1);
  });

  it('revalidates the Restore rehearsals folder and prior candidates before creating another candidate', () => {
    const harness = repositoryFixture();
    rollover(harness, '2027-28');
    const archiveId = harness.invoke('getPortalAnnualArchives').archives[0].id;
    const first = rehearse(harness, archiveId);
    const folderId = harness.properties.get('EE_RESTORE_REHEARSALS_FOLDER_ID');

    harness.seedFolderAcl(folderId, {
      viewers: ['rehearsal.viewer@district.example'],
      sharingAccess: 'DOMAIN_WITH_LINK',
      shareableByEditors: true,
    });
    harness.seedFileAcl(first.candidate.id, {
      viewers: ['candidate.viewer@district.example'],
      editors: ['candidate.editor@district.example'],
      sharingAccess: 'ANYONE_WITH_LINK',
      shareableByEditors: true,
    });
    const second = rehearse(harness, archiveId);
    expect(harness.folderAcl(folderId)).toMatchObject(privateOwnerOnly);
    expect(harness.fileAcl(first.candidate.id)).toMatchObject(privateOwnerOnly);
    expect(harness.fileAcl(second.candidate.id)).toMatchObject(privateOwnerOnly);

    harness.seedFileAcl(first.candidate.id, { viewers: ['sticky.candidate@district.example'] });
    harness.setDriveFault({
      operation: 'removeViewer',
      fileId: first.candidate.id,
      email: 'sticky.candidate@district.example',
      mode: 'sticky',
    });
    const candidatesBefore = [...harness.driveFiles.values()].filter((file) => file.parentFolderId === folderId).length;
    harness.setActiveEmail(ADMIN);
    const review = harness.invoke('reviewPortalArchiveRestoreRehearsal', { archiveId }).review;
    const error = harness.invokeError('performPortalArchiveRestoreRehearsal', {
      reviewToken: review.token,
      acknowledgeNoLiveRestore: true,
    });
    expect(error.code).toBe('protection_failed');
    expect([...harness.driveFiles.values()].filter((file) => file.parentFolderId === folderId)).toHaveLength(candidatesBefore);
  });

  it('binds export confirmation to the exact reviewed file IDs, including same-count replacement', () => {
    const shrinkHarness = repositoryFixture();
    const first = createExport(shrinkHarness);
    const folderId = shrinkHarness.properties.get('EE_AUTHORIZED_EXPORTS_FOLDER_ID');
    const shrinkReview = reviewExport(shrinkHarness);
    expect(shrinkReview.authorizedExportsAcl.inventoryFingerprint).toEqual(expect.any(String));
    shrinkHarness.seedFileAcl(first.export.id, { parentFolderId: 'outside-managed-repository' });
    const shrinkFilesBefore = shrinkHarness.driveFiles.size;
    const shrinkMutationsBefore = driveMutationCount(shrinkHarness);
    const shrinkError = shrinkHarness.invokeError('performPortalDistrictExport', {
      reviewToken: shrinkReview.token,
      acknowledgePolicy: true,
    });
    expect(shrinkError.code).toBe('review_stale');
    expect(shrinkHarness.driveFiles.size).toBe(shrinkFilesBefore);
    expect(driveMutationCount(shrinkHarness)).toBe(shrinkMutationsBefore);

    const replacementHarness = repositoryFixture();
    const original = createExport(replacementHarness);
    const replacementFolderId = replacementHarness.properties.get('EE_AUTHORIZED_EXPORTS_FOLDER_ID');
    const replacementReview = reviewExport(replacementHarness);
    replacementHarness.seedFileAcl(original.export.id, { parentFolderId: 'outside-managed-repository' });
    replacementHarness.createDriveFile({
      id: 'same-count-replacement-export',
      name: 'Replacement export.json',
      content: '{}',
      parentFolderId: replacementFolderId,
    });
    const replacementFilesBefore = replacementHarness.driveFiles.size;
    const replacementMutationsBefore = driveMutationCount(replacementHarness);
    const replacementError = replacementHarness.invokeError('performPortalDistrictExport', {
      reviewToken: replacementReview.token,
      acknowledgePolicy: true,
    });
    expect(replacementError.code).toBe('review_stale');
    expect(replacementHarness.driveFiles.size).toBe(replacementFilesBefore);
    expect(driveMutationCount(replacementHarness)).toBe(replacementMutationsBefore);
    expect([...replacementHarness.driveFiles.values()].filter((file) => file.parentFolderId === replacementFolderId)).toHaveLength(1);
    expect([...shrinkHarness.driveFiles.values()].filter((file) => file.parentFolderId === folderId)).toHaveLength(0);
  });

  it('rechecks the exact reviewed export inventory after privacy protection and creates no artifact on a move race', () => {
    const harness = repositoryFixture();
    const first = createExport(harness);
    const second = createExport(harness);
    const firstFile = harness.driveFiles.get(first.export.id);
    const secondFile = harness.driveFiles.get(second.export.id);
    harness.seedFileAcl(first.export.id, { viewers: ['privacy.repair@district.example'] });
    const review = reviewExport(harness);
    const originalSetSharing = firstFile.setSharing.bind(firstFile);
    firstFile.setSharing = (access, permission) => {
      const result = originalSetSharing(access, permission);
      secondFile.parentFolderId = 'outside-managed-repository';
      return result;
    };
    const filesBefore = harness.driveFiles.size;
    const journalBefore = harness.properties.get('EE_ARTIFACT_OPERATION_JOURNAL');
    const error = harness.invokeError('performPortalDistrictExport', {
      reviewToken: review.token,
      acknowledgePolicy: true,
    });
    expect(error.code).toBe('review_stale');
    expect(harness.driveFiles.size).toBe(filesBefore);
    expect(harness.properties.get('EE_ARTIFACT_OPERATION_JOURNAL')).toBe(journalBefore);
  });

  it('fails without mutation when the latest annual archive folder, file custody, or content hash is no longer exact', () => {
    const scenarios = [
      {
        mutate: (harness, folderId) => harness.seedFolderAcl(folderId, { ownerEmail: 'other.owner@district.example' }),
        code: 'acl_manual_review_required',
      },
      {
        mutate: (harness, _folderId, archiveId) => harness.seedFileAcl(archiveId, { parentFolderId: 'outside-managed-repository' }),
        code: 'acl_manual_review_required',
      },
      {
        mutate: (harness, _folderId, archiveId) => { harness.driveFiles.get(archiveId).trashed = true; },
        code: 'acl_manual_review_required',
      },
      {
        mutate: (harness, _folderId, archiveId) => { harness.driveFiles.get(archiveId).content += '\n'; },
        code: 'manual_recovery_required',
      },
    ];
    for (const scenario of scenarios) {
      const harness = repositoryFixture();
      rollover(harness, '2027-28');
      const folderId = harness.properties.get('EE_ANNUAL_ARCHIVES_FOLDER_ID');
      const archiveId = JSON.parse(harness.properties.get('EE_LAST_ROLLOVER')).archiveId;
      const review = harness.invoke('reviewPortalAnnualRollover', { nextAcademicYear: '2028-29' }).review;
      scenario.mutate(harness, folderId, archiveId);
      const filesBefore = harness.driveFiles.size;
      const mutationsBefore = driveMutationCount(harness);
      const error = harness.invokeError('performPortalAnnualRollover', {
        reviewToken: review.token,
        acknowledgeArchive: true,
        acknowledgeOpenCycles: true,
      });
      expect(error.code).toBe(scenario.code);
      expect(harness.driveFiles.size).toBe(filesBefore);
      expect(driveMutationCount(harness)).toBe(mutationsBefore);
      expect(harness.properties.has('EE_ROLLOVER_RECOVERY_REQUIRED')).toBe(false);
      expect(harness.invoke('bootstrap').workspace.config.academicYear).toBe('2027-28');
    }
  });

  it('fails without mutation when a restore folder or journaled candidate leaves exact custody or changes content', () => {
    const scenarios = [
      {
        mutate: (harness, folderId) => harness.seedFolderAcl(folderId, { parentFolderId: 'outside-managed-repository' }),
        code: 'acl_manual_review_required',
      },
      {
        mutate: (harness, _folderId, candidateId) => harness.seedFileAcl(candidateId, { ownerEmail: 'other.owner@district.example' }),
        code: 'manual_recovery_required',
      },
      {
        mutate: (harness, _folderId, candidateId) => harness.seedFileAcl(candidateId, { parentFolderId: 'outside-managed-repository' }),
        code: 'manual_recovery_required',
      },
      {
        mutate: (harness, _folderId, candidateId) => { harness.driveFiles.get(candidateId).content += '\n'; },
        code: 'manual_recovery_required',
      },
    ];
    for (const scenario of scenarios) {
      const harness = repositoryFixture();
      rollover(harness, '2027-28');
      const archiveId = harness.invoke('getPortalAnnualArchives').archives[0].id;
      const first = rehearse(harness, archiveId);
      const folderId = harness.properties.get('EE_RESTORE_REHEARSALS_FOLDER_ID');
      const review = harness.invoke('reviewPortalArchiveRestoreRehearsal', { archiveId }).review;
      scenario.mutate(harness, folderId, first.candidate.id);
      const filesBefore = harness.driveFiles.size;
      const mutationsBefore = driveMutationCount(harness);
      const error = harness.invokeError('performPortalArchiveRestoreRehearsal', {
        reviewToken: review.token,
        acknowledgeNoLiveRestore: true,
      });
      expect(error.code).toBe(scenario.code);
      expect(harness.driveFiles.size).toBe(filesBefore);
      expect(driveMutationCount(harness)).toBe(mutationsBefore);
    }
  });
});
