import { describe, expect, it } from 'vitest';

import {
  repositoryFixture,
  ADMIN,
} from './helpers/educator_evaluation_gs_harness.js';

const filesInFolder = (harness, folderId) => [...harness.driveFiles.values()]
  .filter(file => file.parentFolderId === folderId && !file.trashed);

const auditRows = (harness, event, entityId) => harness.rows('Audit')
  .filter(row => row[2] === event && (!entityId || row[5] === entityId));

const mutatingDriveOperations = new Set([
  'addViewer', 'addEditor', 'removeViewer', 'removeEditor',
  'setSharing', 'setShareableByEditors', 'setTrashed', 'moveTo',
]);

const exportCapacitySnapshot = (harness, folderId) => ({
  workspace: harness.driveFiles.get(harness.properties.get('EE_WORKSPACE_FILE_ID')).content,
  properties: Object.fromEntries([...harness.properties.entries()].sort(([left], [right]) => left.localeCompare(right))),
  audit: harness.rows('Audit'),
  files: JSON.stringify([...harness.driveFiles.entries()]),
  folders: JSON.stringify([...harness.driveFolders.entries()]),
  folderFileCount: filesInFolder(harness, folderId).length,
  driveMutations: harness.driveOperations.filter(item => mutatingDriveOperations.has(item.operation)).length,
});

const seedAuthorizedExportInventory = (harness, count) => {
  harness.setActiveEmail(ADMIN);
  harness.invoke('authorizedExportsFolder_');
  const folderId = harness.properties.get('EE_AUTHORIZED_EXPORTS_FOLDER_ID');
  for (let index = 0; index < count; index += 1) {
    harness.createDriveFile({
      id: `capacity-export-${String(index).padStart(3, '0')}`,
      name: `Capacity export ${index}.json`,
      content: '{}',
      parentFolderId: folderId,
    });
  }
  return folderId;
};

const createAnnualArchiveForRehearsal = (harness) => {
  harness.setActiveEmail(ADMIN);
  const review = harness.invoke('reviewPortalAnnualRollover', { nextAcademicYear: '2027-28' }).review;
  harness.invoke('performPortalAnnualRollover', {
    reviewToken: review.token,
    acknowledgeArchive: true,
    acknowledgeOpenCycles: true,
  });
  return harness.invoke('getPortalAnnualArchives').archives[0];
};

const seedRestoreRehearsalInventory = (harness, count) => {
  harness.setActiveEmail(ADMIN);
  harness.invoke('restoreRehearsalsFolder_');
  const folderId = harness.properties.get('EE_RESTORE_REHEARSALS_FOLDER_ID');
  for (let index = 0; index < count; index += 1) {
    harness.createDriveFile({
      id: `capacity-rehearsal-${String(index).padStart(3, '0')}`,
      name: `Capacity restore rehearsal ${index}.json`,
      content: '{}',
      parentFolderId: folderId,
    });
  }
  return folderId;
};

const reviewAttemptWithTokenCounters = (harness, request) => harness.invoke(`(function (reviewRequest) {
  var originalNewId = newId_, originalGetScriptCache = CacheService.getScriptCache;
  var cache = originalGetScriptCache(), generated = 0, cachePuts = 0;
  newId_ = function (prefix) { generated++; return originalNewId(prefix); };
  CacheService.getScriptCache = function () {
    return {
      get: function (key) { return cache.get(key); },
      put: function () { cachePuts++; return cache.put.apply(cache, arguments); },
      remove: function (key) { return cache.remove(key); },
    };
  };
  try {
    reviewPortalDistrictExport(reviewRequest);
    return { ok: true, generated: generated, cachePuts: cachePuts };
  } catch (error) {
    return { ok: false, code: error.code || '', message: error.message || '', generated: generated, cachePuts: cachePuts };
  } finally {
    newId_ = originalNewId;
    CacheService.getScriptCache = originalGetScriptCache;
  }
})`, request);

const reviewRehearsalAttemptWithTokenCounters = (harness, request) => harness.invoke(`(function (reviewRequest) {
  var originalNewId = newId_, originalGetScriptCache = CacheService.getScriptCache;
  var cache = originalGetScriptCache(), generated = 0, cachePuts = 0;
  newId_ = function (prefix) { generated++; return originalNewId(prefix); };
  CacheService.getScriptCache = function () {
    return {
      get: function (key) { return cache.get(key); },
      put: function () { cachePuts++; return cache.put.apply(cache, arguments); },
      remove: function (key) { return cache.remove(key); },
    };
  };
  try {
    reviewPortalArchiveRestoreRehearsal(reviewRequest);
    return { ok: true, generated: generated, cachePuts: cachePuts };
  } catch (error) {
    return { ok: false, code: error.code || '', message: error.message || '', generated: generated, cachePuts: cachePuts };
  } finally {
    newId_ = originalNewId;
    CacheService.getScriptCache = originalGetScriptCache;
  }
})`, request);

const refreshCachedExportFingerprints = (harness, token) => harness.invoke(`(function (reviewToken) {
  var cache = CacheService.getScriptCache(), key = adminReviewCacheKey_(reviewToken);
  var review = JSON.parse(cache.get(key)), acl = inspectAuthorizedExportsAcl_();
  review.authorizedExportsAclFingerprint = acl.fingerprint;
  review.authorizedExportsInventoryFingerprint = acl.inventoryFingerprint;
  cache.put(key, JSON.stringify(review), EE_ADMIN_REVIEW_SECONDS);
  return { fileCount: acl.fileCount, fingerprint: acl.fingerprint, inventoryFingerprint: acl.inventoryFingerprint };
})`, token);

const artifactAuditStatusReadCount = (harness, entry) => harness.invoke(`(function (journalEntry) {
  var originalDataRows = dataRows_, auditReads = 0;
  dataRows_ = function (sheet, width) {
    if (sheet && sheet.name === 'Audit' && width === 12) auditReads++;
    return originalDataRows(sheet, width);
  };
  try {
    return { status: artifactOperationAuditStatus_(journalEntry), auditReads: auditReads };
  } finally {
    dataRows_ = originalDataRows;
  }
})`, entry);

describe('educator evaluation artifact operation idempotency', () => {
  it('allows file 250, recovers its lost response, and exact-replays it in either iterator position', () => {
    const harness = repositoryFixture();
    const folderId = seedAuthorizedExportInventory(harness, 249);
    const review = harness.invoke('reviewPortalDistrictExport', {
      scope: 'status_csv',
      purpose: 'Capacity boundary exact replay regression',
    }).review;

    harness.setDriveFault({ operation: 'setSharing', occurrence: 1, mode: 'throw' });
    expect(harness.invokeError('performPortalDistrictExport', {
      reviewToken: review.token,
      acknowledgePolicy: true,
    }).code).toBe('artifact_recovery_required');
    expect(filesInFolder(harness, folderId)).toHaveLength(250);

    const pendingEntry = JSON.parse(harness.properties.get('EE_ARTIFACT_OPERATION_JOURNAL')).entries[0];
    const boundaryFile = filesInFolder(harness, folderId).find(file => file.name === pendingEntry.fileName);
    expect(boundaryFile).toBeTruthy();
    expect([...harness.driveFiles.keys()].at(-1)).toBe(boundaryFile.id);

    harness.clearDriveFaults();
    const recovered = harness.invoke('performPortalDistrictExport', {
      reviewToken: review.token,
      acknowledgePolicy: true,
    });
    expect(recovered).toMatchObject({ status: 'completed', idempotent: true, export: { id: boundaryFile.id } });
    expect(filesInFolder(harness, folderId)).toHaveLength(250);

    const remaining = [...harness.driveFiles.entries()].filter(([id]) => id !== boundaryFile.id);
    harness.driveFiles.clear();
    harness.driveFiles.set(boundaryFile.id, boundaryFile);
    for (const [id, file] of remaining) harness.driveFiles.set(id, file);
    expect([...harness.driveFiles.keys()][0]).toBe(boundaryFile.id);

    const replayed = harness.invoke('performPortalDistrictExport', {
      reviewToken: review.token,
      acknowledgePolicy: true,
    });
    expect(replayed).toMatchObject({ status: 'completed', idempotent: true, export: { id: boundaryFile.id, sha256: recovered.export.sha256 } });
    expect(filesInFolder(harness, folderId)).toHaveLength(250);
    expect(auditRows(harness, 'DISTRICT_EXPORT_CREATED', boundaryFile.id)).toHaveLength(1);
  });

  it('refuses a 250-file review before generating or caching a token and without repository mutation', () => {
    const harness = repositoryFixture();
    const folderId = seedAuthorizedExportInventory(harness, 250);
    const before = exportCapacitySnapshot(harness, folderId);
    const attempt = reviewAttemptWithTokenCounters(harness, {
      scope: 'status_csv',
      purpose: 'Full capacity review refusal regression',
    });

    expect(attempt).toMatchObject({
      ok: false,
      code: 'acl_manual_review_required',
      generated: 0,
      cachePuts: 0,
    });
    expect(attempt.message).toContain('bounded ACL inspection limit');
    expect(exportCapacitySnapshot(harness, folderId)).toEqual(before);
    expect(harness.properties.has('EE_ARTIFACT_OPERATION_JOURNAL')).toBe(false);
  });

  it('refuses a 251-file review before reading item 251, generating a token, or mutating the repository', () => {
    const harness = repositoryFixture();
    const folderId = seedAuthorizedExportInventory(harness, 251);
    const sentinel = harness.driveFiles.get('capacity-export-250');
    const originalGetId = sentinel.getId.bind(sentinel);
    let sentinelReads = 0;
    sentinel.getId = () => {
      sentinelReads += 1;
      return originalGetId();
    };
    const before = exportCapacitySnapshot(harness, folderId);
    const attempt = reviewAttemptWithTokenCounters(harness, {
      scope: 'status_csv',
      purpose: 'Over-capacity bounded review refusal regression',
    });

    expect(attempt).toMatchObject({
      ok: false,
      code: 'acl_manual_review_required',
      generated: 0,
      cachePuts: 0,
    });
    expect(attempt.message).toContain('bounded ACL inspection limit');
    expect(sentinelReads).toBe(0);
    expect(exportCapacitySnapshot(harness, folderId)).toEqual(before);
    expect(harness.properties.has('EE_ARTIFACT_OPERATION_JOURNAL')).toBe(false);
  });

  it('keeps inventory drift stale and separately enforces full capacity under the perform lock', () => {
    const staleHarness = repositoryFixture();
    const staleFolderId = seedAuthorizedExportInventory(staleHarness, 249);
    const staleReview = staleHarness.invoke('reviewPortalDistrictExport', {
      scope: 'status_csv',
      purpose: 'Capacity race staleness regression',
    }).review;
    staleHarness.createDriveFile({
      id: 'capacity-race-file',
      name: 'Capacity race file.json',
      content: '{}',
      parentFolderId: staleFolderId,
    });
    const staleBefore = exportCapacitySnapshot(staleHarness, staleFolderId);
    expect(staleHarness.invokeError('performPortalDistrictExport', {
      reviewToken: staleReview.token,
      acknowledgePolicy: true,
    }).code).toBe('review_stale');
    expect(staleHarness.cachedAdminReview(staleReview.token)).toBeNull();
    expect(exportCapacitySnapshot(staleHarness, staleFolderId)).toEqual(staleBefore);

    const lockedHarness = repositoryFixture();
    const lockedFolderId = seedAuthorizedExportInventory(lockedHarness, 249);
    const lockedReview = lockedHarness.invoke('reviewPortalDistrictExport', {
      scope: 'status_csv',
      purpose: 'Locked capacity recheck regression',
    }).review;
    lockedHarness.createDriveFile({
      id: 'capacity-legacy-file',
      name: 'Capacity legacy file.json',
      content: '{}',
      parentFolderId: lockedFolderId,
    });
    expect(refreshCachedExportFingerprints(lockedHarness, lockedReview.token).fileCount).toBe(250);
    const lockedBefore = exportCapacitySnapshot(lockedHarness, lockedFolderId);
    expect(lockedHarness.invokeError('performPortalDistrictExport', {
      reviewToken: lockedReview.token,
      acknowledgePolicy: true,
    }).code).toBe('acl_manual_review_required');
    expect(lockedHarness.cachedAdminReview(lockedReview.token)).not.toBeNull();
    expect(exportCapacitySnapshot(lockedHarness, lockedFolderId)).toEqual(lockedBefore);
    expect(lockedHarness.properties.has('EE_ARTIFACT_OPERATION_JOURNAL')).toBe(false);
  });

  it('recovers a district export created before a privacy-response fault and replays one file and audit', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(ADMIN);
    const review = harness.invoke('reviewPortalDistrictExport', {
      scope: 'educator_record',
      teacherId: 't1',
      purpose: 'Idempotent export recovery regression',
    }).review;

    // The first setSharing protects the newly created folder; the second is
    // reached only after createFile returned the new export.
    harness.setDriveFault({ operation: 'setSharing', occurrence: 2, mode: 'throw' });
    const interrupted = harness.invokeError('performPortalDistrictExport', {
      reviewToken: review.token,
      acknowledgePolicy: true,
    });
    expect(interrupted.code).toBe('artifact_recovery_required');

    const folderId = harness.properties.get('EE_AUTHORIZED_EXPORTS_FOLDER_ID');
    expect(filesInFolder(harness, folderId)).toHaveLength(1);
    expect(harness.properties.get('EE_ARTIFACT_RECOVERY_REQUIRED')).toBe('1');
    expect(harness.invoke('getPortalSetupHealth')).toMatchObject({
      checks: {
        artifactRecoveryRequired: true,
        artifactRecoveryPending: true,
        artifactRecoveryManualRequired: false,
        artifactRecoveryCount: 1,
        artifactRecoveryOldestAt: expect.any(String),
      },
      recoveryQueues: {
        artifactOperations: { pending: true, count: 1, manualReviewRequired: false },
      },
    });
    expect(harness.invokeError('saveWorkspace', {}).code).toBe('artifact_recovery_required');

    harness.clearDriveFaults();
    const recovered = harness.invoke('performPortalDistrictExport', {
      reviewToken: review.token,
      acknowledgePolicy: true,
    });
    expect(recovered).toMatchObject({
      ok: true,
      status: 'completed',
      recoveryPending: false,
      idempotent: true,
    });

    // Model a client losing the successful response and sending the same
    // reviewed confirmation again.
    const replayed = harness.invoke('performPortalDistrictExport', {
      reviewToken: review.token,
      acknowledgePolicy: true,
    });
    expect(replayed).toMatchObject({ idempotent: true, export: { id: recovered.export.id, sha256: recovered.export.sha256 } });
    expect(filesInFolder(harness, folderId)).toHaveLength(1);
    const exportAudit = auditRows(harness, 'DISTRICT_EXPORT_CREATED', recovered.export.id);
    expect(exportAudit).toHaveLength(1);
    expect(exportAudit[0][3]).toContain('Idempotent export recovery regression');
    expect(harness.properties.has('EE_ARTIFACT_RECOVERY_REQUIRED')).toBe(false);
    expect(harness.invoke('getPortalSetupHealth').checks.artifactRecoveryRequired).toBe(false);
  });

  it('derives the mutation gate from the sealed journal and repairs missing or stale recovery markers', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(ADMIN);
    const review = harness.invoke('reviewPortalDistrictExport', {
      scope: 'status_csv',
      purpose: 'Journal-derived recovery gate regression',
    }).review;

    harness.setDriveFault({ operation: 'setSharing', occurrence: 2, mode: 'throw' });
    expect(harness.invokeError('performPortalDistrictExport', {
      reviewToken: review.token,
      acknowledgePolicy: true,
    }).code).toBe('artifact_recovery_required');

    // Model a crash after the integrity-protected pending journal landed but
    // before its advisory fast-path marker became durable.
    harness.properties.delete('EE_ARTIFACT_RECOVERY_REQUIRED');
    expect(harness.invokeError('saveWorkspace', {}).code).toBe('artifact_recovery_required');
    expect(harness.properties.get('EE_ARTIFACT_RECOVERY_REQUIRED')).toBe('1');

    harness.clearDriveFaults();
    expect(harness.invoke('performPortalDistrictExport', {
      reviewToken: review.token,
      acknowledgePolicy: true,
    })).toMatchObject({ status: 'completed', recoveryPending: false, idempotent: true });

    // Model the opposite crash window: every journal entry completed but the
    // advisory marker was left behind. The sealed journal remains authoritative.
    harness.properties.set('EE_ARTIFACT_RECOVERY_REQUIRED', '1');
    expect(harness.invoke('getPortalSetupHealth')).toMatchObject({
      checks: {
        artifactRecoveryRequired: false,
        artifactRecoveryPending: false,
        artifactRecoveryManualRequired: false,
        artifactRecoveryCount: 0,
      },
      recoveryQueues: {
        artifactOperations: { pending: false, count: 0, manualReviewRequired: false },
      },
    });
    // Setup health is observability-only and must not repair the stale marker.
    expect(harness.properties.get('EE_ARTIFACT_RECOVERY_REQUIRED')).toBe('1');
    expect(harness.invoke('reviewPortalDistrictExport', {
      scope: 'status_csv',
      purpose: 'Stale marker reconciliation regression',
    }).review.token).toEqual(expect.any(String));
    expect(harness.properties.has('EE_ARTIFACT_RECOVERY_REQUIRED')).toBe(false);
  });

  it('drains a failed artifact audit append through reviewed integrity repair and completes the same token', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(ADMIN);
    const review = harness.invoke('reviewPortalDistrictExport', {
      scope: 'status_csv',
      purpose: 'Reviewed audit outbox recovery regression',
    }).review;

    harness.setFailSheetAppend('Audit', true);
    const pending = harness.invoke('performPortalDistrictExport', {
      reviewToken: review.token,
      acknowledgePolicy: true,
    });
    expect(pending).toMatchObject({
      ok: true,
      status: 'recovery_pending',
      recoveryPending: true,
      auditPending: true,
      idempotent: false,
      export: { id: expect.any(String), sha256: expect.any(String) },
    });

    const folderId = harness.properties.get('EE_AUTHORIZED_EXPORTS_FOLDER_ID');
    expect(filesInFolder(harness, folderId)).toHaveLength(1);
    expect(auditRows(harness, 'DISTRICT_EXPORT_CREATED', pending.export.id)).toHaveLength(0);

    harness.setFailSheetAppend('Audit', false);
    const integrityReview = harness.invoke('reviewPortalWorkspaceIntegrity');
    expect(integrityReview).toMatchObject({
      status: 'recovery_pending',
      recoveryPending: true,
      manualReviewRequired: false,
      repairable: true,
      counts: { operationAuditEntries: 1 },
      outbox: { queued: 1, missing: 1, ambiguous: false },
    });
    const repaired = harness.invoke('reconcilePortalWorkspaceIntegrity', {
      reviewToken: integrityReview.review.token,
      acknowledgeRepair: true,
    });
    expect(repaired).toMatchObject({
      status: 'completed',
      recoveryPending: false,
      manualReviewRequired: false,
      repaired: { operationAuditEntries: 1 },
      remaining: { operationAuditEntries: 0 },
      auditChainIntact: true,
    });

    const completed = harness.invoke('performPortalDistrictExport', {
      reviewToken: review.token,
      acknowledgePolicy: true,
    });
    expect(completed).toMatchObject({
      status: 'completed',
      recoveryPending: false,
      idempotent: true,
      export: { id: pending.export.id, sha256: pending.export.sha256 },
    });
    expect(filesInFolder(harness, folderId)).toHaveLength(1);
    expect(auditRows(harness, 'DISTRICT_EXPORT_CREATED', pending.export.id)).toHaveLength(1);
  });

  it('uses one Audit sheet fetch for exact artifact audit lookup and full chain verification', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(ADMIN);
    const review = harness.invoke('reviewPortalDistrictExport', {
      scope: 'status_csv',
      purpose: 'Single audit snapshot regression',
    }).review;
    harness.invoke('performPortalDistrictExport', {
      reviewToken: review.token,
      acknowledgePolicy: true,
    });

    const journal = JSON.parse(harness.properties.get('EE_ARTIFACT_OPERATION_JOURNAL'));
    expect(artifactAuditStatusReadCount(harness, journal.entries[0])).toEqual({
      status: 'canonical',
      auditReads: 1,
    });
  });

  it('allows restore rehearsal file 250, recovers its lost response, and exact-replays it in either iterator position', () => {
    const harness = repositoryFixture();
    const archive = createAnnualArchiveForRehearsal(harness);
    const before = harness.invoke('bootstrap');
    const folderId = seedRestoreRehearsalInventory(harness, 249);
    const review = harness.invoke('reviewPortalArchiveRestoreRehearsal', { archiveId: archive.id }).review;

    harness.setDriveFault({ operation: 'setSharing', occurrence: 1, mode: 'throw' });
    expect(harness.invokeError('performPortalArchiveRestoreRehearsal', {
      reviewToken: review.token,
      acknowledgeNoLiveRestore: true,
    }).code).toBe('artifact_recovery_required');
    expect(filesInFolder(harness, folderId)).toHaveLength(250);

    const pendingEntry = JSON.parse(harness.properties.get('EE_ARTIFACT_OPERATION_JOURNAL')).entries
      .find(entry => entry.kind === 'restore_rehearsal');
    const boundaryFile = filesInFolder(harness, folderId).find(file => file.name === pendingEntry.fileName);
    expect(boundaryFile).toBeTruthy();
    expect([...harness.driveFiles.keys()].at(-1)).toBe(boundaryFile.id);

    harness.clearDriveFaults();
    const recovered = harness.invoke('performPortalArchiveRestoreRehearsal', {
      reviewToken: review.token,
      acknowledgeNoLiveRestore: true,
    });
    expect(recovered).toMatchObject({ status: 'completed', idempotent: true, candidate: { id: boundaryFile.id } });
    expect(filesInFolder(harness, folderId)).toHaveLength(250);

    const remaining = [...harness.driveFiles.entries()].filter(([id]) => id !== boundaryFile.id);
    harness.driveFiles.clear();
    harness.driveFiles.set(boundaryFile.id, boundaryFile);
    for (const [id, file] of remaining) harness.driveFiles.set(id, file);
    expect([...harness.driveFiles.keys()][0]).toBe(boundaryFile.id);

    const replayed = harness.invoke('performPortalArchiveRestoreRehearsal', {
      reviewToken: review.token,
      acknowledgeNoLiveRestore: true,
    });
    expect(replayed).toMatchObject({
      status: 'completed',
      idempotent: true,
      candidate: { id: boundaryFile.id, sha256: recovered.candidate.sha256 },
    });
    expect(filesInFolder(harness, folderId)).toHaveLength(250);
    expect(auditRows(harness, 'RESTORE_REHEARSAL_CREATED', boundaryFile.id)).toHaveLength(1);
    const after = harness.invoke('bootstrap');
    expect(after.revision).toBe(before.revision);
    expect(after.workspace.config.academicYear).toBe(before.workspace.config.academicYear);
  });

  it('refuses a 250-file restore rehearsal review before generating or caching a token and without repository mutation', () => {
    const harness = repositoryFixture();
    const archive = createAnnualArchiveForRehearsal(harness);
    const folderId = seedRestoreRehearsalInventory(harness, 250);
    const before = exportCapacitySnapshot(harness, folderId);
    const attempt = reviewRehearsalAttemptWithTokenCounters(harness, { archiveId: archive.id });

    expect(attempt).toMatchObject({
      ok: false,
      code: 'acl_manual_review_required',
      generated: 0,
      cachePuts: 0,
    });
    expect(attempt.message).toContain('bounded ACL inspection limit');
    expect(exportCapacitySnapshot(harness, folderId)).toEqual(before);
    expect(harness.properties.has('EE_ARTIFACT_OPERATION_JOURNAL')).toBe(false);
  });

  it('refuses a 251-file restore rehearsal review before reading item 251 or mutating the repository', () => {
    const harness = repositoryFixture();
    const archive = createAnnualArchiveForRehearsal(harness);
    const folderId = seedRestoreRehearsalInventory(harness, 251);
    const sentinel = harness.driveFiles.get('capacity-rehearsal-250');
    const originalGetId = sentinel.getId.bind(sentinel);
    let sentinelReads = 0;
    sentinel.getId = () => {
      sentinelReads += 1;
      return originalGetId();
    };
    const before = exportCapacitySnapshot(harness, folderId);
    const attempt = reviewRehearsalAttemptWithTokenCounters(harness, { archiveId: archive.id });

    expect(attempt).toMatchObject({
      ok: false,
      code: 'acl_manual_review_required',
      generated: 0,
      cachePuts: 0,
    });
    expect(attempt.message).toContain('bounded ACL inspection limit');
    expect(sentinelReads).toBe(0);
    expect(exportCapacitySnapshot(harness, folderId)).toEqual(before);
    expect(harness.properties.has('EE_ARTIFACT_OPERATION_JOURNAL')).toBe(false);
  });

  it('rejects a post-review restore inventory race before journaling or creating another candidate', () => {
    const harness = repositoryFixture();
    const archive = createAnnualArchiveForRehearsal(harness);
    const folderId = seedRestoreRehearsalInventory(harness, 249);
    const review = harness.invoke('reviewPortalArchiveRestoreRehearsal', { archiveId: archive.id }).review;
    harness.createDriveFile({
      id: 'capacity-rehearsal-race-file',
      name: 'Capacity restore rehearsal race.json',
      content: '{}',
      parentFolderId: folderId,
    });
    const before = exportCapacitySnapshot(harness, folderId);

    expect(harness.invokeError('performPortalArchiveRestoreRehearsal', {
      reviewToken: review.token,
      acknowledgeNoLiveRestore: true,
    }).code).toBe('review_stale');
    expect(harness.cachedAdminReview(review.token)).toBeNull();
    expect(exportCapacitySnapshot(harness, folderId)).toEqual(before);
    expect(filesInFolder(harness, folderId)).toHaveLength(250);
    expect(harness.properties.has('EE_ARTIFACT_OPERATION_JOURNAL')).toBe(false);
    expect(auditRows(harness, 'RESTORE_REHEARSAL_CREATED')).toHaveLength(0);
  });

  it('recovers a restore rehearsal created before a privacy-response fault without changing live state', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(ADMIN);
    const rolloverReview = harness.invoke('reviewPortalAnnualRollover', { nextAcademicYear: '2027-28' }).review;
    harness.invoke('performPortalAnnualRollover', {
      reviewToken: rolloverReview.token,
      acknowledgeArchive: true,
      acknowledgeOpenCycles: true,
    });
    const before = harness.invoke('bootstrap');
    const archive = harness.invoke('getPortalAnnualArchives').archives[0];
    const review = harness.invoke('reviewPortalArchiveRestoreRehearsal', { archiveId: archive.id }).review;
    expect(harness.invoke('getPortalArtifactOperationOutcome', {
      kind: 'restore_rehearsal',
      reviewToken: review.token,
    })).toEqual({ ok: true, status: 'not_started', reviewUsable: true });

    // Exact custody inspection avoids redundant privacy writes. The first
    // setSharing protects the new folder; the second follows candidate create.
    harness.setDriveFault({ operation: 'setSharing', occurrence: 2, mode: 'throw' });
    const interrupted = harness.invokeError('performPortalArchiveRestoreRehearsal', {
      reviewToken: review.token,
      acknowledgeNoLiveRestore: true,
    });
    expect(interrupted.code).toBe('artifact_recovery_required');
    expect(harness.invoke('getPortalArtifactOperationOutcome', {
      kind: 'restore_rehearsal',
      reviewToken: review.token,
    })).toEqual({ ok: true, status: 'pending' });

    const folderId = harness.properties.get('EE_RESTORE_REHEARSALS_FOLDER_ID');
    expect(filesInFolder(harness, folderId)).toHaveLength(1);

    harness.clearDriveFaults();
    const recovered = harness.invoke('performPortalArchiveRestoreRehearsal', {
      reviewToken: review.token,
      acknowledgeNoLiveRestore: true,
    });
    const replayed = harness.invoke('performPortalArchiveRestoreRehearsal', {
      reviewToken: review.token,
      acknowledgeNoLiveRestore: true,
    });
    expect(recovered).toMatchObject({ status: 'completed', recoveryPending: false, idempotent: true, liveWorkspaceChanged: false });
    expect(replayed).toMatchObject({ idempotent: true, candidate: { id: recovered.candidate.id, sha256: recovered.candidate.sha256 } });
    expect(harness.invoke('getPortalArtifactOperationOutcome', {
      kind: 'restore_rehearsal',
      reviewToken: review.token,
    })).toEqual({ ok: true, status: 'completed' });
    expect(filesInFolder(harness, folderId)).toHaveLength(1);
    expect(auditRows(harness, 'RESTORE_REHEARSAL_CREATED', recovered.candidate.id)).toHaveLength(1);

    const after = harness.invoke('bootstrap');
    expect(after.revision).toBe(before.revision);
    expect(after.workspace.config.academicYear).toBe(before.workspace.config.academicYear);
  });

  it('fails closed and reports manual review when artifact journal integrity is ambiguous', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(ADMIN);
    const review = harness.invoke('reviewPortalDistrictExport', {
      scope: 'status_csv',
      purpose: 'Artifact journal integrity regression',
    }).review;
    harness.invoke('performPortalDistrictExport', {
      reviewToken: review.token,
      acknowledgePolicy: true,
    });

    const stored = JSON.parse(harness.properties.get('EE_ARTIFACT_OPERATION_JOURNAL'));
    stored.entries[0].contentHash = stored.entries[0].contentHash.replace(/.$/, value => value === 'A' ? 'B' : 'A');
    harness.properties.set('EE_ARTIFACT_OPERATION_JOURNAL', JSON.stringify(stored));

    expect(harness.invokeError('reviewPortalDistrictExport', {
      scope: 'status_csv',
      purpose: 'Must fail closed',
    }).code).toBe('manual_recovery_required');
    expect(harness.invoke('getPortalSetupHealth')).toMatchObject({
      checks: {
        artifactRecoveryRequired: true,
        artifactRecoveryManualRequired: true,
        artifactRecoveryCount: 1,
      },
      recoveryQueues: {
        artifactOperations: { pending: true, count: 1, manualReviewRequired: true },
      },
    });
  });

  it('retains every recent completion receipt and evicts one only after its replay window ages out', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(ADMIN);
    const completed = [];

    for (let index = 0; index < 6; index += 1) {
      const review = harness.invoke('reviewPortalDistrictExport', {
        scope: 'status_csv',
        purpose: `Retained completion receipt ${index + 1}`,
      }).review;
      completed.push({
        token: review.token,
        result: harness.invoke('performPortalDistrictExport', {
          reviewToken: review.token,
          acknowledgePolicy: true,
        }),
      });
    }

    const folderId = harness.properties.get('EE_AUTHORIZED_EXPORTS_FOLDER_ID');
    const beforeFiles = filesInFolder(harness, folderId).map(file => file.id).sort();
    const blockedReview = harness.invoke('reviewPortalDistrictExport', {
      scope: 'status_csv',
      purpose: 'Must wait for replay retention',
    }).review;
    const blocked = harness.invokeError('performPortalDistrictExport', {
      reviewToken: blockedReview.token,
      acknowledgePolicy: true,
    });

    expect(blocked.code).toBe('busy');
    expect(filesInFolder(harness, folderId).map(file => file.id).sort()).toEqual(beforeFiles);
    expect(JSON.parse(harness.properties.get('EE_ARTIFACT_OPERATION_JOURNAL')).entries).toHaveLength(6);

    const replayed = harness.invoke('performPortalDistrictExport', {
      reviewToken: completed[0].token,
      acknowledgePolicy: true,
    });
    expect(replayed).toMatchObject({
      idempotent: true,
      export: { id: completed[0].result.export.id, sha256: completed[0].result.export.sha256 },
    });
    expect(filesInFolder(harness, folderId).map(file => file.id).sort()).toEqual(beforeFiles);

    // Move just beyond the 900-second receipt window. A genuinely new seventh
    // operation may now replace the oldest bounded receipt, while the exact
    // private artifact itself remains in Drive and therefore needs manual
    // inspection if an already-unconfirmed browser asks about that old token.
    harness.setClock('2026-08-13T17:30:31.000Z');
    const agedReview = harness.invoke('reviewPortalDistrictExport', {
      scope: 'status_csv',
      purpose: 'Aged receipt replacement regression',
    }).review;
    harness.invoke('performPortalDistrictExport', {
      reviewToken: agedReview.token,
      acknowledgePolicy: true,
    });
    expect(JSON.parse(harness.properties.get('EE_ARTIFACT_OPERATION_JOURNAL')).entries).toHaveLength(6);
    expect(filesInFolder(harness, folderId)).toHaveLength(beforeFiles.length + 1);
    expect(harness.invoke('getPortalArtifactOperationOutcome', {
      kind: 'district_export',
      reviewToken: completed[0].token,
    })).toEqual({ ok: true, status: 'not_started', reviewUsable: false });
  });

  it('reports only locked exact-token outcome state and identifies an unusable pre-intent review', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(ADMIN);
    const review = harness.invoke('reviewPortalDistrictExport', {
      scope: 'status_csv',
      purpose: 'Outcome probe regression',
    }).review;

    expect(harness.invoke('getPortalArtifactOperationOutcome', {
      kind: 'district_export',
      reviewToken: review.token,
    })).toEqual({ ok: true, status: 'not_started', reviewUsable: true });

    const boot = harness.invoke('bootstrap');
    const configReview = harness.invoke('reviewPortalWorkspaceConfiguration', {
      config: { ...boot.workspace.config, evaluatorName: 'Changed after export review' },
    }).review;
    harness.invoke('performPortalWorkspaceConfiguration', {
      reviewToken: configReview.token,
      acknowledgeImpact: true,
    });
    expect(harness.invokeError('performPortalDistrictExport', {
      reviewToken: review.token,
      acknowledgePolicy: true,
    }).code).toBe('review_stale');
    expect(harness.invoke('getPortalArtifactOperationOutcome', {
      kind: 'district_export',
      reviewToken: review.token,
    })).toEqual({ ok: true, status: 'not_started', reviewUsable: false });

    const pendingReview = harness.invoke('reviewPortalDistrictExport', {
      scope: 'status_csv',
      purpose: 'Pending probe regression',
    }).review;
    harness.setDriveFault({ operation: 'setSharing', occurrence: 2, mode: 'throw' });
    expect(harness.invokeError('performPortalDistrictExport', {
      reviewToken: pendingReview.token,
      acknowledgePolicy: true,
    }).code).toBe('artifact_recovery_required');
    expect(harness.invoke('getPortalArtifactOperationOutcome', {
      kind: 'district_export',
      reviewToken: pendingReview.token,
    })).toEqual({ ok: true, status: 'pending' });

    harness.clearDriveFaults();
    harness.invoke('performPortalDistrictExport', {
      reviewToken: pendingReview.token,
      acknowledgePolicy: true,
    });
    expect(harness.invoke('getPortalArtifactOperationOutcome', {
      kind: 'district_export',
      reviewToken: pendingReview.token,
    })).toEqual({ ok: true, status: 'completed' });

    harness.setActiveEmail(ADMIN);
    harness.setNextScriptLockTryLockHook(() => harness.setActiveEmail('teacher.one@district.example'));
    expect(harness.invokeError('getPortalArtifactOperationOutcome', {
      kind: 'district_export',
      reviewToken: pendingReview.token,
    }).code).toBe('denied');

    harness.setActiveEmail('teacher.one@district.example');
    expect(harness.invokeError('getPortalArtifactOperationOutcome', {
      kind: 'district_export',
      reviewToken: pendingReview.token,
    }).code).toBe('denied');
  });
});
