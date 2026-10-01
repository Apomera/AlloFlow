import { describe, expect, it } from 'vitest';
import {
  ADMIN,
  EVALUATOR,
  repositoryFixture,
} from './helpers/educator_evaluation_gs_harness.js';

const SHEETS = [
  'Config',
  'Members',
  'Assignments',
  'Workspace',
  'Messages',
  'Receipts',
  'Audit',
  'Snapshots',
];

const DRIVE_MUTATIONS = new Set([
  'addViewer',
  'addEditor',
  'removeViewer',
  'removeEditor',
  'setSharing',
  'setShareableByEditors',
  'setTrashed',
  'moveTo',
]);

const REVIEW_CASES = [
  ['released share', 'reviewPortalReleasedEvaluationShare', { teacherId: 't1' }],
  ['directory', 'reviewPortalDirectoryChange', {
    kind: 'assignment',
    candidate: { teacherId: 't1', evaluatorEmail: EVALUATOR, active: false },
  }],
  ['schedule', 'reviewPortalCycleSchedule', { dueDate: '2027-06-01', applyTo: 'all_open' }],
  ['configuration', 'reviewPortalWorkspaceConfiguration', { config: { evaluatorInitials: 'PG' } }],
  ['restore rehearsal', 'reviewPortalArchiveRestoreRehearsal', { archiveId: 'missing-archive' }],
  ['annual rollover', 'reviewPortalAnnualRollover', { nextAcademicYear: '2027-28' }],
];

const PERFORM_CASES = [
  ['released share with a missing token', 'sharePortalReleasedEvaluation', { teacherId: 't1' }],
  ['directory with an invalid token', 'performPortalDirectoryChange', {
    reviewToken: 'missing-token',
    acknowledgeImpact: true,
  }],
  ['schedule with a missing token', 'performPortalCycleSchedule', { acknowledgeImpact: true }],
  ['configuration with an invalid token', 'performPortalWorkspaceConfiguration', {
    reviewToken: 'missing-token',
    acknowledgeImpact: true,
  }],
  ['restore rehearsal with a missing token', 'performPortalArchiveRestoreRehearsal', {
    acknowledgeNoLiveRestore: true,
  }],
  ['annual rollover with an invalid token', 'performPortalAnnualRollover', {
    reviewToken: 'missing-token',
    acknowledgeArchive: true,
    acknowledgeOpenCycles: true,
  }],
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function driveItemState(item) {
  return {
    name: item.name,
    content: Object.prototype.hasOwnProperty.call(item, 'content') ? item.content : undefined,
    sharingAccess: item.sharingAccess,
    sharingPermission: item.sharingPermission,
    viewers: [...(item.viewers || [])].sort(),
    commenters: [...(item.commenters || [])].sort(),
    editors: [...(item.editors || [])].sort(),
    parentFolderId: item.parentFolderId || null,
    ownerEmail: item.ownerEmail,
    createdAt: item.createdAt,
    shareableByEditors: !!item.shareableByEditors,
    trashed: !!item.trashed,
  };
}

function driveMapState(items) {
  return [...items.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, item]) => [id, driveItemState(item)]);
}

function repositoryState(harness, options = {}) {
  const workspaceRows = harness.rows('Workspace');
  return clone({
    revision: workspaceRows[1] && workspaceRows[1][1],
    properties: [...harness.properties.entries()].sort(([left], [right]) => left.localeCompare(right)),
    sheets: Object.fromEntries(SHEETS.map(name => [name, harness.rows(name)])),
    files: driveMapState(harness.driveFiles),
    folders: driveMapState(harness.driveFolders),
    driveOperations: options.driveMutationsOnly
      ? harness.driveOperations.filter(item => DRIVE_MUTATIONS.has(item.operation))
      : harness.driveOperations,
    sentMail: harness.sentMail,
    documents: harness.documents,
  });
}

function seedPendingWorkspaceCommit(harness) {
  const before = harness.invoke('bootstrap');
  const pendingWorkspace = clone(before.workspace);
  pendingWorkspace.config.evaluatorInitials = 'PEND';
  const workspaceId = harness.properties.get('EE_WORKSPACE_FILE_ID');
  const pendingId = harness.properties.get('EE_PENDING_COMMIT_FILE_ID');
  harness.driveFiles.get(pendingId).content = JSON.stringify({
    revision: before.revision + 1,
    actorEmail: ADMIN,
    at: '2026-08-13T17:15:30.000Z',
    workspace: pendingWorkspace,
  });
  harness.properties.set('EE_COMMIT_RECOVERY_REQUIRED', '1');
  return {
    workspaceId,
    pendingId,
    canonicalContent: harness.driveFiles.get(workspaceId).content,
    pendingContent: harness.driveFiles.get(pendingId).content,
    revision: before.revision,
  };
}

function expectCommitGateUnchanged(harness, method, request, before) {
  expect(harness.invokeError(method, request).code, method).toBe('commit_recovery_required');
  expect(repositoryState(harness), method).toEqual(before);
}

describe('educator evaluation pending workspace commit gate', () => {
  it('keeps the read-only operations directory available without reconciling the journal', () => {
    const harness = repositoryFixture();
    const pending = seedPendingWorkspaceCommit(harness);
    const before = repositoryState(harness, { driveMutationsOnly: true });

    expect(harness.invoke('getPortalAdminOperations')).toMatchObject({
      ok: true,
      directory: { revision: pending.revision },
    });
    expect(repositoryState(harness, { driveMutationsOnly: true })).toEqual(before);
    expect(harness.driveFiles.get(pending.pendingId).content).toBe(pending.pendingContent);
    expect(harness.properties.get('EE_COMMIT_RECOVERY_REQUIRED')).toBe('1');
  });

  it.each(REVIEW_CASES)('%s review is read-only and cannot advance a pending journal', (_label, method, request) => {
    const harness = repositoryFixture();
    const pending = seedPendingWorkspaceCommit(harness);
    const before = repositoryState(harness);

    expectCommitGateUnchanged(harness, method, request, before);
    expect(harness.driveFiles.get(pending.workspaceId).content).toBe(pending.canonicalContent);
    expect(harness.driveFiles.get(pending.pendingId).content).toBe(pending.pendingContent);
    expect(harness.rows('Workspace')[1][1]).toBe(pending.revision);
    expect(harness.properties.get('EE_COMMIT_RECOVERY_REQUIRED')).toBe('1');
  });

  it.each(PERFORM_CASES)('%s fails closed before token validation and cannot advance a pending journal', (_label, method, request) => {
    const harness = repositoryFixture();
    const pending = seedPendingWorkspaceCommit(harness);
    const before = repositoryState(harness);

    expectCommitGateUnchanged(harness, method, request, before);
    expect(harness.driveFiles.get(pending.workspaceId).content).toBe(pending.canonicalContent);
    expect(harness.driveFiles.get(pending.pendingId).content).toBe(pending.pendingContent);
    expect(harness.rows('Workspace')[1][1]).toBe(pending.revision);
    expect(harness.properties.get('EE_COMMIT_RECOVERY_REQUIRED')).toBe('1');
  });

  it('does not consume a valid review token while a pending journal blocks confirmation', () => {
    const harness = repositoryFixture();
    const review = harness.invoke('reviewPortalCycleSchedule', {
      dueDate: '2027-06-01',
      applyTo: 'all_open',
    }).review;
    const pending = seedPendingWorkspaceCommit(harness);
    const before = repositoryState(harness);
    const request = { reviewToken: review.token, acknowledgeImpact: true };

    expectCommitGateUnchanged(harness, 'performPortalCycleSchedule', request, before);

    harness.properties.delete('EE_COMMIT_RECOVERY_REQUIRED');
    harness.driveFiles.get(pending.pendingId).content = '';
    expect(harness.invoke('performPortalCycleSchedule', request)).toMatchObject({
      ok: true,
      status: 'completed',
      revision: pending.revision + 1,
    });
  });

  it('does not let an archive-retry-ready rollover clear an unrelated workspace journal', () => {
    const harness = repositoryFixture();
    const pending = seedPendingWorkspaceCommit(harness);
    const retryMarker = JSON.stringify({
      stage: 'archive_retry_ready',
      archiveId: 'retained-archive',
      archiveHash: 'retained-hash',
      fromYear: '2026-27',
      toYear: '2027-28',
      sourceRevision: pending.revision,
    });
    harness.properties.set('EE_ROLLOVER_RECOVERY_REQUIRED', retryMarker);
    const before = repositoryState(harness);

    expectCommitGateUnchanged(
      harness,
      'reviewPortalAnnualRollover',
      { nextAcademicYear: '2027-28' },
      before,
    );
    expectCommitGateUnchanged(
      harness,
      'performPortalAnnualRollover',
      {
        reviewToken: 'missing-token',
        acknowledgeArchive: true,
        acknowledgeOpenCycles: true,
      },
      before,
    );
    expect(harness.properties.get('EE_ROLLOVER_RECOVERY_REQUIRED')).toBe(retryMarker);
    expect(harness.properties.get('EE_COMMIT_RECOVERY_REQUIRED')).toBe('1');
  });
});
