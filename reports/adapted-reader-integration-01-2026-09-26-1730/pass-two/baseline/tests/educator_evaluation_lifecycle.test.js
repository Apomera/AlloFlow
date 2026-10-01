import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  repositoryFixture, ADMIN, EVALUATOR, TEACHER_ONE,
} from './helpers/educator_evaluation_gs_harness.js';

const reconcileWorkspaceIntegrity = (harness) => {
  const review = harness.invoke('reviewPortalWorkspaceIntegrity').review;
  return harness.invoke('reconcilePortalWorkspaceIntegrity', {
    reviewToken: review.token,
    acknowledgeRepair: true,
  });
};

const reviewedRolloverRequest = (harness, nextAcademicYear = '2027-28') => {
  const review = harness.invoke('reviewPortalAnnualRollover', { nextAcademicYear }).review;
  return {
    reviewToken: review.token,
    acknowledgeArchive: true,
    acknowledgeOpenCycles: true,
  };
};

const annualRolloverAuditEntries = (workspace, archiveId) => (workspace.audit || []).filter(
  entry => entry.event === 'ANNUAL_ROLLOVER' && entry.entityId === archiveId,
);

const annualRolloverAuditRows = (harness, archiveId) => harness.rows('Audit').slice(1).filter(
  row => String(row[2]) === 'ANNUAL_ROLLOVER' && String(row[5]) === archiveId,
);

const academicYearRows = harness => harness.rows('Config').slice(1).filter(
  row => String(row[0]) === 'academicYear',
);

const expectedAuditProjection = entry => [
  entry.id,
  entry.teacherId || '',
  entry.event,
  entry.summary,
  entry.entityType,
  entry.entityId || '',
  entry.version || 1,
  entry.actorEmail || '',
  entry.actorRole || '',
  entry.at,
];

const annualArchiveFiles = (harness, folderId) => [...harness.driveFiles.values()]
  .filter(file => file.parentFolderId === folderId && !file.trashed);

const mutatingDriveOperations = new Set([
  'addViewer', 'addEditor', 'removeViewer', 'removeEditor',
  'setSharing', 'setShareableByEditors', 'setTrashed', 'moveTo',
]);

const rolloverRepositorySnapshot = (harness, folderId) => ({
  workspace: harness.driveFiles.get(harness.properties.get('EE_WORKSPACE_FILE_ID')).content,
  pending: harness.driveFiles.get(harness.properties.get('EE_PENDING_COMMIT_FILE_ID')).content,
  properties: Object.fromEntries([...harness.properties.entries()].sort(([left], [right]) => left.localeCompare(right))),
  audit: harness.rows('Audit'),
  config: harness.rows('Config'),
  files: JSON.stringify([...harness.driveFiles.entries()]),
  folders: JSON.stringify([...harness.driveFolders.entries()]),
  annualArchiveCount: annualArchiveFiles(harness, folderId).length,
  driveMutations: harness.driveOperations.filter(item => mutatingDriveOperations.has(item.operation)).length,
});

const reviewRolloverAttemptWithTokenCounters = (harness, request) => harness.invoke(`(function (reviewRequest) {
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
    reviewPortalAnnualRollover(reviewRequest);
    return { ok: true, generated: generated, cachePuts: cachePuts };
  } catch (error) {
    return { ok: false, code: error.code || '', message: error.message || '', generated: generated, cachePuts: cachePuts };
  } finally {
    newId_ = originalNewId;
    CacheService.getScriptCache = originalGetScriptCache;
  }
})`, request);

const seedAnnualArchiveInventory = (harness, count) => {
  harness.invoke('annualArchivesFolder_');
  const folderId = harness.properties.get('EE_ANNUAL_ARCHIVES_FOLDER_ID');
  for (let index = 0; index < count; index += 1) {
    harness.createDriveFile({
      id: `capacity-annual-archive-${String(index).padStart(3, '0')}`,
      name: `Capacity annual archive ${index}.json`,
      content: '{}',
      parentFolderId: folderId,
    });
  }
  return folderId;
};

const createLostResponseAnnualArchiveIntent = (harness) => {
  harness.invoke('annualArchivesFolder_');
  const folderId = harness.properties.get('EE_ANNUAL_ARCHIVES_FOLDER_ID');
  const folder = harness.driveFolders.get(folderId);
  const before = harness.invoke('bootstrap');
  const review = harness.invoke('reviewPortalAnnualRollover', { nextAcademicYear: '2027-28' }).review;
  const originalCreateFile = folder.createFile;
  folder.createFile = function (...args) {
    originalCreateFile.apply(this, args);
    throw new Error('Injected annual archive create response loss');
  };
  let error;
  try {
    error = harness.invokeError('performPortalAnnualRollover', {
      reviewToken: review.token,
      acknowledgeArchive: true,
      acknowledgeOpenCycles: true,
    });
  } finally {
    folder.createFile = originalCreateFile;
  }
  const recovery = JSON.parse(harness.properties.get('EE_ROLLOVER_RECOVERY_REQUIRED'));
  return { before, error, folderId, recovery };
};

describe('educator evaluation annual rollover lifecycle', () => {
  it('locks setup and repeats the rollover gate after lock admission', () => {
    const busy = repositoryFixture();
    const busyWorkspace = busy.driveFiles.get(busy.properties.get('EE_WORKSPACE_FILE_ID')).content;
    const busyAudit = JSON.stringify(busy.rows('Audit'));
    busy.setLockAvailable(false);
    expect(busy.invokeError('setupEvaluationRepository', {}).code).toBe('busy');
    expect(busy.driveFiles.get(busy.properties.get('EE_WORKSPACE_FILE_ID')).content).toBe(busyWorkspace);
    expect(JSON.stringify(busy.rows('Audit'))).toBe(busyAudit);

    const raced = repositoryFixture();
    const racedWorkspace = raced.driveFiles.get(raced.properties.get('EE_WORKSPACE_FILE_ID')).content;
    const key = 'EE_ROLLOVER_RECOVERY_REQUIRED';
    const marker = JSON.stringify({ stage: 'workspace_commit' });
    raced.properties.set(key, '');
    const originalGet = raced.properties.get;
    let reads = 0;
    raced.properties.get = function (name) {
      if (name !== key) return originalGet.call(raced.properties, name);
      reads += 1;
      if (reads === 2) { raced.properties.set(key, marker); return marker; }
      return '';
    };
    const error = raced.invokeError('setupEvaluationRepository', {});
    raced.properties.get = originalGet;
    expect(error.code).toBe('rollover_recovery_required');
    expect(reads).toBe(2);
    expect(raced.properties.get(key)).toBe(marker);
    expect(raced.driveFiles.get(raced.properties.get('EE_WORKSPACE_FILE_ID')).content).toBe(racedWorkspace);

    const gs = fs.readFileSync(path.join(process.cwd(), 'apps_script', 'educator_evaluation', 'Code.gs'), 'utf8');
    const setup = gs.slice(gs.indexOf('function setupEvaluationRepository'), gs.indexOf('function verifyDeploymentIdentity'));
    expect(setup).toContain('LockService.getScriptLock()');
    expect(setup).toContain('appendOperationAuditBestEffort_(');
    expect(setup).not.toContain('appendAuditRowLocked_(');
  });

  it('limits review and execution to administrators and validates a consecutive school year', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    expect(harness.invokeError('reviewPortalAnnualRollover', { nextAcademicYear: '2027-28' }).code).toBe('denied');

    harness.setActiveEmail(ADMIN);
    expect(harness.invokeError('reviewPortalAnnualRollover', { nextAcademicYear: '2028-30' }).code).toBe('bad_request');
    expect(harness.invokeError('reviewPortalAnnualRollover', { nextAcademicYear: '2026-27' }).code).toBe('bad_request');
    expect(harness.invokeError('reviewPortalAnnualRollover', { nextAcademicYear: '2028-29' }).code).toBe('bad_request');
  });

  it('wires the administrator walkthrough, acknowledgments, health warnings, and portal RPC adapter', () => {
    const root = process.cwd();
    const source = fs.readFileSync(path.join(root, 'educator_evaluation_source.jsx'), 'utf8');
    const builder = fs.readFileSync(path.join(root, '_build_educator_evaluation_apps_script.js'), 'utf8');
    expect(source).toContain('function AeAnnualRollover');
    expect(source).toContain('educator_evaluation.annual_rollover_and_continuity_18pcrtd');
    expect(source).toContain('Annual rollover & continuity');
    expect(source).toContain('reviewAnnualRollover');
    expect(source).toContain('performAnnualRollover');
    expect(source).toContain('Recheck interrupted rollover');
    expect(source).toContain('deploymentOwnerMatchesBootstrapAdmin');
    expect(source).toMatch(/currentUser\.role === 'admin'[\s\S]{0,300}AeAnnualRollover/);
    expect(builder).toContain('.reviewPortalAnnualRollover(request)');
    expect(builder).toContain('.performPortalAnnualRollover(request)');
    expect(builder).toContain('.reconcilePortalAnnualRollover()');
  });

  it('returns a bounded disclosure review with record, cycle, and preservation counts', () => {
    const harness = repositoryFixture();
    const result = harness.invoke('reviewPortalAnnualRollover', { nextAcademicYear: '2027-28' });
    expect(result.review).toMatchObject({
      currentAcademicYear: '2026-27',
      nextAcademicYear: '2027-28',
      archiveCreatedBeforeReset: true,
      rosterRetained: true,
      cycleSnapshotsRetained: true,
      releasedDocumentsDeleted: false,
    });
    expect(result.review.counts.activeEducators).toBeGreaterThan(0);
    expect(result.review.counts.openCycles).toBeGreaterThan(0);
    expect(result.review.counts.records).toMatchObject({ walkthroughs: 3, observations: 2, total: 5 });
    expect(result.review.token).toMatch(/^rollover-review-/);
  });

  it('refuses a 250-file annual archive review before generating or caching a token and without mutation', () => {
    const harness = repositoryFixture();
    const folderId = seedAnnualArchiveInventory(harness, 250);
    const before = rolloverRepositorySnapshot(harness, folderId);
    const attempt = reviewRolloverAttemptWithTokenCounters(harness, { nextAcademicYear: '2027-28' });

    expect(attempt).toMatchObject({
      ok: false,
      code: 'acl_manual_review_required',
      generated: 0,
      cachePuts: 0,
    });
    expect(attempt.message).toContain('bounded custody inspection limit');
    expect(rolloverRepositorySnapshot(harness, folderId)).toEqual(before);
    expect(harness.properties.has('EE_ROLLOVER_RECOVERY_REQUIRED')).toBe(false);
  });

  it('rejects stale reviews after the workspace revision changes', () => {
    const harness = repositoryFixture();
    const review = harness.invoke('reviewPortalAnnualRollover', { nextAcademicYear: '2027-28' }).review;
    const boot = harness.invoke('bootstrap');
    const configReview = harness.invoke('reviewPortalWorkspaceConfiguration', { config: { ...boot.workspace.config, evaluatorInitials: 'RP' } }).review;
    harness.invoke('performPortalWorkspaceConfiguration', { reviewToken: configReview.token, acknowledgeImpact: true });
    const error = harness.invokeError('performPortalAnnualRollover', {
      reviewToken: review.token,
      acknowledgeArchive: true,
      acknowledgeOpenCycles: true,
    });
    expect(error.code).toBe('review_stale');
  });

  it('requires district custody and open-cycle acknowledgments before creating an archive', () => {
    const harness = repositoryFixture();
    const review = harness.invoke('reviewPortalAnnualRollover', { nextAcademicYear: '2027-28' }).review;
    expect(harness.invokeError('performPortalAnnualRollover', { reviewToken: review.token }).code).toBe('acknowledgment_required');
    expect(harness.properties.get('EE_ANNUAL_ARCHIVES_FOLDER_ID')).toBeUndefined();

    expect(harness.invokeError('performPortalAnnualRollover', {
      reviewToken: review.token,
      acknowledgeArchive: true,
      acknowledgeOpenCycles: false,
    }).code).toBe('acknowledgment_required');
    expect(harness.properties.get('EE_ANNUAL_ARCHIVES_FOLDER_ID')).toBeUndefined();

    const result = harness.invoke('performPortalAnnualRollover', {
      reviewToken: review.token,
      acknowledgeArchive: true,
      acknowledgeOpenCycles: true,
    });
    expect(result).toMatchObject({ ok: true, status: 'completed', recoveryPending: false });
    expect(harness.invokeError('performPortalAnnualRollover', {
      reviewToken: review.token,
      acknowledgeArchive: true,
      acknowledgeOpenCycles: true,
    }).code).toBe('review_required');
  });

  it('verifies a private archive before resetting active cycles while retaining roster and history', () => {
    const harness = repositoryFixture();
    const releaseId = 'doc-rollover-registry-01';
    const releaseUrl = `https://docs.google.com/document/d/${releaseId}`;
    const seeded = harness.invoke('bootstrap');
    const releasedTeacher = seeded.workspace.teachers.find((teacher) => teacher.id === 't1');
    releasedTeacher.releasedDoc = {
      id: releaseId, url: releaseUrl, at: '2026-06-15T12:00:00.000Z', by: EVALUATOR,
      sharedWith: TEACHER_ONE, openedAt: '', accessReviewedAt: '2026-06-15T12:05:00.000Z',
      grants: [EVALUATOR, TEACHER_ONE].sort(), aclVerifiedAt: '2026-06-15T12:05:00.000Z',
      aclMode: 'private_named_viewers', aclVersion: 1, history: [],
    };
    seeded.workspace.releaseRegistry = [{
      id: releaseId, teacherId: 't1', url: releaseUrl, academicYear: '2026-27',
      releasedAt: '2026-06-15T12:00:00.000Z', grants: [EVALUATOR, TEACHER_ONE].sort(),
      aclVerifiedAt: '2026-06-15T12:05:00.000Z', aclMode: 'private_named_viewers', aclVersion: 1,
    }];
    harness.replaceWorkspace(seeded.workspace);
    const before = harness.invoke('bootstrap');
    expect(before.workspace.releaseRegistry).toContainEqual(expect.objectContaining({ id: releaseId, teacherId: 't1' }));
    const review = harness.invoke('reviewPortalAnnualRollover', { nextAcademicYear: '2027-28' }).review;
    const result = harness.invoke('performPortalAnnualRollover', {
      reviewToken: review.token,
      acknowledgeArchive: true,
      acknowledgeOpenCycles: true,
    });
    expect(result).toMatchObject({ ok: true, status: 'completed', recoveryPending: false, fromAcademicYear: '2026-27', toAcademicYear: '2027-28' });

    const archiveFile = harness.driveFiles.get(result.archive.id);
    expect(archiveFile.sharingAccess).toBe('PRIVATE');
    const archive = JSON.parse(archiveFile.content);
    expect(archive).toMatchObject({
      kind: 'alloflow-educator-evaluation-annual-archive',
      fromAcademicYear: '2026-27',
      plannedNextAcademicYear: '2027-28',
      sourceRevision: before.revision,
    });
    expect(archive.workspace.walkthroughs).toHaveLength(3);
    expect(archive.workspace.observations).toHaveLength(2);
    expect(archive.workspace.releaseRegistry).toContainEqual(expect.objectContaining({
      id: releaseId, teacherId: 't1', grants: [EVALUATOR, TEACHER_ONE].sort(),
    }));

    const after = harness.invoke('bootstrap');
    expect(after.workspace.config.academicYear).toBe('2027-28');
    expect(after.workspace.teachers).toHaveLength(before.workspace.teachers.length);
    expect(after.workspace.walkthroughs).toEqual([]);
    expect(after.workspace.observations).toEqual([]);
    expect(after.workspace.spms).toEqual([]);
    expect(after.workspace.comments).toEqual([]);
    expect(after.workspace.cycleSnapshots).toEqual(before.workspace.cycleSnapshots);
    expect(after.workspace.releaseRegistry).toContainEqual(expect.objectContaining({
      id: releaseId, teacherId: 't1', grants: [EVALUATOR, TEACHER_ONE].sort(),
    }));
    after.workspace.teachers.forEach(teacher => {
      expect(teacher).toMatchObject({ cycleStatus: 'not_started', dueDate: '', finalizedAt: null, releasedDoc: null, educatorStatement: null });
      expect(teacher.ratings).toEqual({ domains: { d1: null, d2: null, d3: null, d4: null }, building: null, teacher: null, lea: null });
    });
    const storedWorkspace = JSON.parse(harness.driveFiles.get(harness.properties.get('EE_WORKSPACE_FILE_ID')).content);
    expect(storedWorkspace.audit.some(entry => entry.event === 'ANNUAL_ROLLOVER' && entry.entityId === result.archive.id)).toBe(true);
    expect(harness.properties.get('EE_ROLLOVER_RECOVERY_REQUIRED')).toBeUndefined();
    expect(JSON.parse(harness.properties.get('EE_LAST_ROLLOVER'))).toMatchObject({ fromYear: '2026-27', toYear: '2027-28', archiveId: result.archive.id });
  });

  it('exact-replays a sealed annual rollover completion receipt and rejects unsealed tampering without mutation', () => {
    const harness = repositoryFixture();
    const request = reviewedRolloverRequest(harness);
    const completed = harness.invoke('performPortalAnnualRollover', request);
    const folderId = harness.properties.get('EE_ANNUAL_ARCHIVES_FOLDER_ID');

    expect(completed).toMatchObject({
      ok: true,
      status: 'completed',
      recoveryPending: false,
      archive: { id: expect.any(String), hash: expect.any(String) },
      fromAcademicYear: '2026-27',
      toAcademicYear: '2027-28',
    });
    expect(harness.properties.get('EE_ROLLOVER_RECOVERY_REQUIRED')).toBeUndefined();
    const receipt = JSON.parse(harness.properties.get('EE_LAST_ROLLOVER'));
    expect(receipt).toMatchObject({
      version: 2,
      kind: 'annual_rollover_completion',
      archiveId: completed.archive.id,
      archiveHash: completed.archive.hash,
      fromYear: '2026-27',
      toYear: '2027-28',
      integrityHash: expect.any(String),
    });
    const seal = harness.invoke(`(function (completion) {
      var stored = completion.integrityHash;
      delete completion.integrityHash;
      return { stored: stored, computed: hashText_(JSON.stringify(completion)) };
    })`, receipt);
    expect(seal.computed).toBe(seal.stored);

    const beforeReplay = rolloverRepositorySnapshot(harness, folderId);
    const replayed = harness.invoke('reconcilePortalAnnualRollover');
    expect(replayed).toMatchObject({
      ok: true,
      status: 'completed',
      recoveryPending: false,
      idempotent: true,
      archive: { id: completed.archive.id, hash: completed.archive.hash },
      fromAcademicYear: '2026-27',
      toAcademicYear: '2027-28',
      activeAcademicYear: '2027-28',
    });
    expect(rolloverRepositorySnapshot(harness, folderId)).toEqual(beforeReplay);
    expect(annualArchiveFiles(harness, folderId)).toHaveLength(1);
    expect(annualRolloverAuditRows(harness, completed.archive.id)).toHaveLength(1);

    const tampered = { ...receipt, toYear: '2028-29' };
    harness.properties.set('EE_LAST_ROLLOVER', JSON.stringify(tampered));
    const beforeTamperedReplay = rolloverRepositorySnapshot(harness, folderId);
    const error = harness.invokeError('reconcilePortalAnnualRollover');
    expect(error.code).toBe('manual_recovery_required');
    expect(rolloverRepositorySnapshot(harness, folderId)).toEqual(beforeTamperedReplay);
    expect(harness.properties.get('EE_LAST_ROLLOVER')).toBe(JSON.stringify(tampered));
    expect(harness.properties.get('EE_ROLLOVER_RECOVERY_REQUIRED')).toBeUndefined();
    expect(annualArchiveFiles(harness, folderId)).toHaveLength(1);
    expect(annualRolloverAuditRows(harness, completed.archive.id)).toHaveLength(1);
  });

  it('keeps and reuses one exact verified archive after commit failure until the reviewed retry is durable', () => {
    const harness = repositoryFixture();
    const before = harness.invoke('bootstrap');
    const review = harness.invoke('reviewPortalAnnualRollover', { nextAcademicYear: '2027-28' }).review;
    const pending = harness.driveFiles.get(harness.properties.get('EE_PENDING_COMMIT_FILE_ID'));
    const originalSetContent = pending.setContent.bind(pending);
    pending.setContent = () => { throw new Error('Injected pending-journal failure'); };
    const error = harness.invokeError('performPortalAnnualRollover', {
      reviewToken: review.token,
      acknowledgeArchive: true,
      acknowledgeOpenCycles: true,
    });
    expect(error.code).toBe('rollover_recovery_required');
    const recovery = JSON.parse(harness.properties.get('EE_ROLLOVER_RECOVERY_REQUIRED'));
    const archiveFile = harness.driveFiles.get(recovery.archiveId);
    const archiveFolderId = harness.properties.get('EE_ANNUAL_ARCHIVES_FOLDER_ID');
    const annualArchiveIds = () => [...harness.driveFiles.values()]
      .filter(file => file.parentFolderId === archiveFolderId && !file.trashed)
      .map(file => file.id);
    expect(recovery).toMatchObject({
      stage: 'workspace_commit',
      archiveId: archiveFile.id,
      archiveHash: expect.any(String),
      fromYear: '2026-27',
      toYear: '2027-28',
      sourceRevision: before.revision,
    });
    expect(archiveFile.sharingAccess).toBe('PRIVATE');
    expect(annualArchiveIds()).toEqual([recovery.archiveId]);
    expect(harness.invokeError('reviewPortalAnnualRollover', { nextAcademicYear: '2027-28' }).code).toBe('rollover_recovery_required');

    const workspaceIntegrity = reconcileWorkspaceIntegrity(harness);
    expect(workspaceIntegrity.ok).toBe(true);
    expect(harness.properties.get('EE_ROLLOVER_RECOVERY_REQUIRED')).toBeDefined();

    harness.setLockAvailable(false);
    expect(harness.invokeError('reconcilePortalAnnualRollover').code).toBe('busy');
    expect(harness.properties.get('EE_ROLLOVER_RECOVERY_REQUIRED')).toBeDefined();
    harness.setLockAvailable(true);

    pending.setContent = originalSetContent;
    const reconciled = harness.invoke('reconcilePortalAnnualRollover');
    expect(reconciled).toMatchObject({
      ok: true,
      status: 'archive_only',
      recoveryPending: true,
      resumable: true,
      archive: { id: recovery.archiveId, hash: recovery.archiveHash },
      activeAcademicYear: '2026-27',
    });
    const resumable = JSON.parse(harness.properties.get('EE_ROLLOVER_RECOVERY_REQUIRED'));
    expect(resumable).toMatchObject({
      stage: 'archive_retry_ready',
      archiveId: recovery.archiveId,
      archiveHash: recovery.archiveHash,
      fromYear: recovery.fromYear,
      toYear: recovery.toYear,
      sourceRevision: recovery.sourceRevision,
    });
    expect(annualArchiveIds()).toEqual([recovery.archiveId]);
    expect(harness.invoke('bootstrap').revision).toBe(before.revision);

    const retryReview = harness.invoke('reviewPortalAnnualRollover', { nextAcademicYear: '2027-28' }).review;
    expect(retryReview).toMatchObject({
      archiveWillBeReused: true,
      retryArchiveId: recovery.archiveId,
      currentAcademicYear: '2026-27',
      nextAcademicYear: '2027-28',
    });
    expect(harness.properties.get('EE_ROLLOVER_RECOVERY_REQUIRED')).toBeDefined();

    const exactArchiveContent = archiveFile.content;
    archiveFile.setContent(exactArchiveContent + '\n');
    const changedAfterReview = harness.invokeError('performPortalAnnualRollover', {
      reviewToken: retryReview.token,
      acknowledgeArchive: true,
      acknowledgeOpenCycles: true,
    });
    expect(changedAfterReview.code).toBe('manual_recovery_required');
    expect(JSON.parse(harness.properties.get('EE_ROLLOVER_RECOVERY_REQUIRED'))).toMatchObject({
      stage: 'archive_retry_ready',
      archiveId: recovery.archiveId,
      archiveHash: recovery.archiveHash,
    });
    expect(annualArchiveIds()).toEqual([recovery.archiveId]);
    archiveFile.setContent(exactArchiveContent);

    const renewedRetryReview = harness.invoke('reviewPortalAnnualRollover', { nextAcademicYear: '2027-28' }).review;
    const completed = harness.invoke('performPortalAnnualRollover', {
      reviewToken: renewedRetryReview.token,
      acknowledgeArchive: true,
      acknowledgeOpenCycles: true,
    });
    expect(completed).toMatchObject({
      ok: true,
      status: 'completed',
      recoveryPending: false,
      archive: { id: recovery.archiveId, hash: recovery.archiveHash },
      fromAcademicYear: '2026-27',
      toAcademicYear: '2027-28',
    });
    expect(annualArchiveIds()).toEqual([recovery.archiveId]);
    const after = harness.invoke('bootstrap');
    expect(after.revision).toBe(before.revision + 1);
    expect(after.workspace.config.academicYear).toBe('2027-28');
    expect(after.workspace.audit).toContainEqual(expect.objectContaining({
      event: 'ANNUAL_ROLLOVER',
      entityType: 'annual_archive',
      entityId: recovery.archiveId,
    }));
    expect(harness.rows('Audit').some(row => row[2] === 'ANNUAL_ROLLOVER' && row[5] === recovery.archiveId)).toBe(true);
    expect(JSON.parse(harness.properties.get('EE_LAST_ROLLOVER'))).toMatchObject({
      archiveId: recovery.archiveId,
      fromYear: '2026-27',
      toYear: '2027-28',
      revision: before.revision + 1,
    });
    expect(harness.properties.get('EE_ROLLOVER_RECOVERY_REQUIRED')).toBeUndefined();
  });

  it('recovers one deterministic annual archive after its create response is lost and commits it on a newly reviewed retry', () => {
    const harness = repositoryFixture();
    const { before, error, folderId, recovery } = createLostResponseAnnualArchiveIntent(harness);
    const filesAfterFailure = annualArchiveFiles(harness, folderId);

    expect(error.code).toBe('rollover_recovery_required');
    expect(recovery).toMatchObject({
      version: 2,
      kind: 'annual_rollover',
      stage: 'archive_intent',
      archiveId: '',
      archiveHash: expect.any(String),
      contentHash: expect.any(String),
      fileName: expect.stringMatching(/^educator-evaluation-2026-27-archive-rollover_/),
      fromYear: '2026-27',
      toYear: '2027-28',
      sourceRevision: before.revision,
      integrityHash: expect.any(String),
    });
    const seal = harness.invoke(`(function (marker) {
      var stored = marker.integrityHash;
      delete marker.integrityHash;
      return { stored: stored, computed: hashText_(JSON.stringify(marker)) };
    })`, recovery);
    expect(seal.computed).toBe(seal.stored);
    expect(filesAfterFailure).toHaveLength(1);
    expect(filesAfterFailure[0].name).toBe(recovery.fileName);
    expect(harness.invoke('hashText_', filesAfterFailure[0].content)).toBe(recovery.contentHash);
    expect(JSON.parse(filesAfterFailure[0].content)).toMatchObject({
      operationKey: recovery.key,
      sourceRevision: before.revision,
      fromAcademicYear: '2026-27',
      plannedNextAcademicYear: '2027-28',
    });
    const unchanged = harness.invoke('bootstrap');
    expect(unchanged.revision).toBe(before.revision);
    expect(unchanged.workspace.config.academicYear).toBe('2026-27');

    const reconciled = harness.invoke('reconcilePortalAnnualRollover');
    expect(reconciled).toMatchObject({
      ok: true,
      status: 'archive_only',
      recoveryPending: true,
      resumable: true,
      archive: { id: filesAfterFailure[0].id, hash: recovery.archiveHash },
      activeAcademicYear: '2026-27',
    });
    const resumable = JSON.parse(harness.properties.get('EE_ROLLOVER_RECOVERY_REQUIRED'));
    expect(resumable).toMatchObject({
      version: 2,
      key: recovery.key,
      stage: 'archive_retry_ready',
      archiveId: filesAfterFailure[0].id,
      archiveHash: recovery.archiveHash,
      integrityHash: expect.any(String),
    });
    expect(annualArchiveFiles(harness, folderId).map(file => file.id)).toEqual([filesAfterFailure[0].id]);

    const retryReview = harness.invoke('reviewPortalAnnualRollover', { nextAcademicYear: '2027-28' }).review;
    expect(retryReview).toMatchObject({
      archiveWillBeReused: true,
      retryArchiveId: filesAfterFailure[0].id,
    });
    const completed = harness.invoke('performPortalAnnualRollover', {
      reviewToken: retryReview.token,
      acknowledgeArchive: true,
      acknowledgeOpenCycles: true,
    });
    expect(completed).toMatchObject({
      ok: true,
      status: 'completed',
      recoveryPending: false,
      archive: { id: filesAfterFailure[0].id, hash: recovery.archiveHash },
    });
    expect(annualArchiveFiles(harness, folderId).map(file => file.id)).toEqual([filesAfterFailure[0].id]);
    const after = harness.invoke('bootstrap');
    expect(after.revision).toBe(before.revision + 1);
    expect(after.workspace.config.academicYear).toBe('2027-28');
    expect(annualRolloverAuditEntries(after.workspace, filesAfterFailure[0].id)).toHaveLength(1);
    expect(annualRolloverAuditRows(harness, filesAfterFailure[0].id)).toHaveLength(1);
    expect(harness.properties.get('EE_ROLLOVER_RECOVERY_REQUIRED')).toBeUndefined();
  });

  it('fails closed without mutation when a sealed version-2 annual archive intent is tampered without resealing', () => {
    const harness = repositoryFixture();
    const { before, folderId, recovery } = createLostResponseAnnualArchiveIntent(harness);
    const tampered = { ...recovery, sourceRevision: recovery.sourceRevision + 1 };
    harness.properties.set('EE_ROLLOVER_RECOVERY_REQUIRED', JSON.stringify(tampered));
    const beforeReconcile = rolloverRepositorySnapshot(harness, folderId);

    const error = harness.invokeError('reconcilePortalAnnualRollover');
    expect(error.code).toBe('manual_recovery_required');
    expect(rolloverRepositorySnapshot(harness, folderId)).toEqual(beforeReconcile);
    expect(harness.properties.get('EE_ROLLOVER_RECOVERY_REQUIRED')).toBe(JSON.stringify(tampered));
    expect(annualArchiveFiles(harness, folderId)).toHaveLength(1);
    const unchanged = harness.invoke('bootstrap');
    expect(unchanged.revision).toBe(before.revision);
    expect(unchanged.workspace.config.academicYear).toBe('2026-27');
    expect(annualRolloverAuditEntries(unchanged.workspace, annualArchiveFiles(harness, folderId)[0].id)).toHaveLength(0);
  });

  it('retains rollover recovery and queues the exact audit entry until a failed Audit append is reconciled once', () => {
    const harness = repositoryFixture();
    const request = reviewedRolloverRequest(harness);
    harness.setFailSheetAppend('Audit', true);

    const pending = harness.invoke('performPortalAnnualRollover', request);
    expect(pending).toMatchObject({
      ok: true,
      status: 'recovery_pending',
      recoveryPending: true,
      auditPending: true,
      configurationPending: false,
    });
    expect(harness.properties.get('EE_ROLLOVER_RECOVERY_REQUIRED')).toBeDefined();
    expect(harness.properties.get('EE_LAST_ROLLOVER')).toBeUndefined();

    const workspace = harness.invoke('bootstrap').workspace;
    const entries = annualRolloverAuditEntries(workspace, pending.archive.id);
    expect(entries).toHaveLength(1);
    const journal = JSON.parse(harness.properties.get('EE_SECONDARY_RECOVERY_JOURNAL'));
    expect(journal.auditEntries).toEqual([entries[0]]);
    expect(annualRolloverAuditRows(harness, pending.archive.id)).toHaveLength(0);
    expect(academicYearRows(harness).map(row => row.slice(0, 2))).toEqual([
      ['academicYear', '2027-28'],
    ]);

    harness.setFailSheetAppend('Audit', false);
    const completed = harness.invoke('reconcilePortalAnnualRollover');
    expect(completed).toMatchObject({ ok: true, status: 'completed', recoveryPending: false });
    const rows = annualRolloverAuditRows(harness, pending.archive.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].slice(0, 10)).toEqual(expectedAuditProjection(entries[0]));
    expect(harness.invoke('verifyAuditChain')).toMatchObject({ ok: true });
    expect(academicYearRows(harness).map(row => row.slice(0, 2))).toEqual([
      ['academicYear', '2027-28'],
    ]);
    expect(harness.properties.get('EE_ROLLOVER_RECOVERY_REQUIRED')).toBeUndefined();
    expect(JSON.parse(harness.properties.get('EE_LAST_ROLLOVER'))).toMatchObject({
      archiveId: pending.archive.id,
      toYear: '2027-28',
    });

    expect(harness.invoke('reconcilePortalAnnualRollover')).toMatchObject({
      ok: true,
      status: 'completed',
      recoveryPending: false,
      idempotent: true,
      archive: { id: pending.archive.id, hash: pending.archive.hash },
    });
    expect(annualRolloverAuditRows(harness, pending.archive.id)).toHaveLength(1);
  });

  it('retains rollover recovery until a failed academic-year projection is reconciled', () => {
    const harness = repositoryFixture();
    const request = reviewedRolloverRequest(harness);
    harness.setSheetReadHook('Config', () => { throw new Error('Injected Config read failure'); });

    const pending = harness.invoke('performPortalAnnualRollover', request);
    expect(pending).toMatchObject({
      ok: true,
      status: 'recovery_pending',
      recoveryPending: true,
      auditPending: false,
      configurationPending: true,
    });
    expect(harness.properties.get('EE_ROLLOVER_RECOVERY_REQUIRED')).toBeDefined();
    expect(harness.properties.get('EE_LAST_ROLLOVER')).toBeUndefined();
    const journal = JSON.parse(harness.properties.get('EE_SECONDARY_RECOVERY_JOURNAL'));
    expect(journal).toMatchObject({ configuration: true });

    harness.setSheetReadHook('Config', null);
    expect(academicYearRows(harness).map(row => row.slice(0, 2))).toEqual([
      ['academicYear', '2026-27'],
    ]);
    const workspace = harness.invoke('bootstrap').workspace;
    const entries = annualRolloverAuditEntries(workspace, pending.archive.id);
    expect(entries).toHaveLength(1);
    expect(annualRolloverAuditRows(harness, pending.archive.id)).toHaveLength(1);

    const completed = harness.invoke('reconcilePortalAnnualRollover');
    expect(completed).toMatchObject({ ok: true, status: 'completed', recoveryPending: false });
    expect(academicYearRows(harness).map(row => row.slice(0, 2))).toEqual([
      ['academicYear', '2027-28'],
    ]);
    const rows = annualRolloverAuditRows(harness, pending.archive.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].slice(0, 10)).toEqual(expectedAuditProjection(entries[0]));
    expect(harness.invoke('verifyAuditChain')).toMatchObject({ ok: true });
    expect(harness.properties.get('EE_ROLLOVER_RECOVERY_REQUIRED')).toBeUndefined();
    expect(JSON.parse(harness.properties.get('EE_LAST_ROLLOVER'))).toMatchObject({
      archiveId: pending.archive.id,
      toYear: '2027-28',
    });
  });

  it('fails closed when the rollover audit ID already has different canonical content', () => {
    const harness = repositoryFixture();
    const request = reviewedRolloverRequest(harness);
    harness.setFailSheetAppend('Audit', true);
    const pending = harness.invoke('performPortalAnnualRollover', request);
    const workspace = harness.invoke('bootstrap').workspace;
    const [entry] = annualRolloverAuditEntries(workspace, pending.archive.id);
    expect(entry).toBeDefined();

    harness.setFailSheetAppend('Audit', false);
    harness.invoke('appendCanonicalAuditRow_', {
      ...entry,
      summary: `${entry.summary} (different canonical content)`,
    });
    expect(harness.invoke('verifyAuditChain')).toMatchObject({ ok: true });
    const auditBefore = JSON.stringify(harness.rows('Audit'));

    const error = harness.invokeError('reconcilePortalAnnualRollover');
    expect(error.code).toBe('manual_recovery_required');
    expect(JSON.stringify(harness.rows('Audit'))).toBe(auditBefore);
    expect(harness.rows('Audit').slice(1).filter(row => String(row[0]) === entry.id)).toHaveLength(1);
    expect(harness.properties.get('EE_ROLLOVER_RECOVERY_REQUIRED')).toBeDefined();
    expect(harness.properties.get('EE_LAST_ROLLOVER')).toBeUndefined();
  });

  it('fails closed without rewriting duplicate academic-year projections', () => {
    const harness = repositoryFixture();
    const request = reviewedRolloverRequest(harness);
    harness.setSheetReadHook('Config', () => { throw new Error('Injected Config read failure'); });
    const pending = harness.invoke('performPortalAnnualRollover', request);
    harness.setSheetReadHook('Config', null);
    harness.appendSheetRow('Config', ['academicYear', '2027-28']);
    const configBefore = JSON.stringify(harness.rows('Config'));
    const auditBefore = JSON.stringify(harness.rows('Audit'));

    const error = harness.invokeError('reconcilePortalAnnualRollover');
    expect(error.code).toBe('manual_recovery_required');
    expect(JSON.stringify(harness.rows('Config'))).toBe(configBefore);
    expect(JSON.stringify(harness.rows('Audit'))).toBe(auditBefore);
    expect(academicYearRows(harness)).toHaveLength(2);
    expect(annualRolloverAuditRows(harness, pending.archive.id)).toHaveLength(1);
    expect(harness.properties.get('EE_ROLLOVER_RECOVERY_REQUIRED')).toBeDefined();
    expect(harness.properties.get('EE_LAST_ROLLOVER')).toBeUndefined();
  });

  it('fails closed across ordinary mutations while rollover recovery is pending', () => {
    const harness = repositoryFixture();
    const before = harness.invoke('bootstrap');
    const notificationReview = harness.invoke('reviewPortalNotification', {
      teacherId: 't1',
      target: 'teacher',
    }).review;
    const workspaceFile = harness.driveFiles.get(harness.properties.get('EE_WORKSPACE_FILE_ID'));
    const pendingFile = harness.driveFiles.get(harness.properties.get('EE_PENDING_COMMIT_FILE_ID'));
    const beforeState = {
      revision: before.revision,
      workspace: workspaceFile.content,
      pending: pendingFile.content,
      files: harness.driveFiles.size,
      folders: harness.driveFolders.size,
      mail: harness.sentMail.length,
      driveOperations: harness.driveOperations.length,
      members: JSON.stringify(harness.rows('Members')),
      assignments: JSON.stringify(harness.rows('Assignments')),
      audit: JSON.stringify(harness.rows('Audit')),
    };
    harness.properties.set('EE_ROLLOVER_RECOVERY_REQUIRED', JSON.stringify({ stage: 'workspace_commit' }));

    const blockedAdminCalls = [
      ['setupEvaluationRepository', {}],
      ['savePortalWorkspace', { expectedVersion: before.revision, workspace: before.workspace }],
      ['saveWorkspace', { expectedVersion: before.revision, workspace: before.workspace }],
      ['reviewPortalReleasedEvaluationShare', {}],
      ['sharePortalReleasedEvaluation', {}],
      ['reconcilePortalReleasedEvaluationAccess', {}],
      ['reviewPortalDirectoryChange', {}],
      ['performPortalDirectoryChange', {}],
      ['reviewPortalCycleSchedule', {}],
      ['performPortalCycleSchedule', {}],
      ['reviewPortalWorkspaceConfiguration', {}],
      ['performPortalWorkspaceConfiguration', {}],
      ['reviewPortalDistrictExport', {}],
      ['performPortalDistrictExport', {}],
      ['reviewPortalArchiveRestoreRehearsal', {}],
      ['performPortalArchiveRestoreRehearsal', {}],
      ['reviewPortalAnnualRollover', {}],
      ['performPortalAnnualRollover', {}],
    ];
    blockedAdminCalls.forEach(([name, request]) => {
      expect(harness.invokeError(name, request).code, name).toBe('rollover_recovery_required');
    });
    expect(harness.invoke('sendPortalNotification', {
      teacherId: 't1',
      target: 'teacher',
      reviewToken: notificationReview.token,
      acknowledged: true,
    })).toMatchObject({
      ok: false,
      code: 'rollover_recovery_required',
      preDispatch: true,
    });

    harness.setActiveEmail(TEACHER_ONE);
    expect(harness.invokeError('recordReleasedSummaryOpened', { teacherId: 't1' }).code).toBe('rollover_recovery_required');
    harness.setActiveEmail(ADMIN);

    expect(harness.driveFiles.get(harness.properties.get('EE_WORKSPACE_FILE_ID')).content).toBe(beforeState.workspace);
    expect(harness.driveFiles.get(harness.properties.get('EE_PENDING_COMMIT_FILE_ID')).content).toBe(beforeState.pending);
    expect(harness.driveFiles.size).toBe(beforeState.files);
    expect(harness.driveFolders.size).toBe(beforeState.folders);
    expect(harness.sentMail).toHaveLength(beforeState.mail);
    expect(harness.driveOperations).toHaveLength(beforeState.driveOperations);
    expect(JSON.stringify(harness.rows('Members'))).toBe(beforeState.members);
    expect(JSON.stringify(harness.rows('Assignments'))).toBe(beforeState.assignments);
    expect(JSON.stringify(harness.rows('Audit'))).toBe(beforeState.audit);
    expect(harness.invoke('bootstrap').revision).toBe(beforeState.revision);
  });

  it('keeps read-only operations and workspace-integrity recovery available behind the gate', () => {
    const harness = repositoryFixture();
    const marker = JSON.stringify({ stage: 'workspace_commit' });
    harness.properties.set('EE_ROLLOVER_RECOVERY_REQUIRED', marker);

    expect(harness.invoke('bootstrap').ok).toBe(true);
    expect(harness.invoke('verifyDeploymentIdentity').ok).toBe(true);
    expect(harness.invoke('verifyAuditChain').ok).toBe(true);
    expect(harness.invoke('getPortalSetupHealth').checks.annualRolloverRecoveryRequired).toBe(true);
    expect(harness.invoke('getPortalAdminOperations').ok).toBe(true);
    expect(harness.invoke('getPortalAnnualArchives').ok).toBe(true);
    expect(harness.invoke('getPortalCohortStats', { teacherId: 't1' }).ok).toBe(true);

    expect(reconcileWorkspaceIntegrity(harness).ok).toBe(true);
    expect(harness.properties.get('EE_ROLLOVER_RECOVERY_REQUIRED')).toBe(marker);
  });

  it('surfaces owner continuity and rollover recovery state without disclosing another account', () => {
    const harness = repositoryFixture();
    harness.setEffectiveEmail('successor@district.example');
    let checks = harness.invoke('getPortalSetupHealth').checks;
    expect(checks.deploymentOwnerMatchesBootstrapAdmin).toBe(false);
    expect(JSON.stringify(checks)).not.toContain('successor@district.example');
    expect(checks.annualRolloverRecoveryRequired).toBe(false);

    harness.properties.set('EE_ROLLOVER_RECOVERY_REQUIRED', JSON.stringify({ stage: 'workspace_commit' }));
    checks = harness.invoke('getPortalSetupHealth').checks;
    expect(checks.annualRolloverRecoveryRequired).toBe(true);
  });
});
