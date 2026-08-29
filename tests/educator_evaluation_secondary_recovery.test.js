import { describe, expect, it } from 'vitest';
import {
  repositoryFixture,
  ADMIN,
  EVALUATOR,
  TEACHER_ONE,
  FIXED_NOW,
} from './helpers/educator_evaluation_gs_harness.js';

const dataRows = (harness, sheetName) => harness.rows(sheetName).slice(1);

const reviewAndReconcile = (harness) => {
  const response = harness.invoke('reviewPortalWorkspaceIntegrity');
  expect(response.review).toMatchObject({ repairable: true, manualReviewRequired: false });
  return harness.invoke('reconcilePortalWorkspaceIntegrity', {
    reviewToken: response.review.token,
    acknowledgeRepair: true,
  });
};

const readSecondaryJournal = (harness) => {
  const raw = harness.properties.get('EE_SECONDARY_RECOVERY_JOURNAL');
  expect(raw).toBeTruthy();
  return JSON.parse(raw);
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
  return boot.revision;
};

const receiptAuditEntry = (harness) => {
  harness.setActiveEmail(TEACHER_ONE);
  const boot = harness.invoke('bootstrap');
  return boot.workspace.audit.find((item) => item.event === 'RECEIPT_OPENED' && item.teacherId === 't1');
};

describe('educator evaluation typed secondary recovery', () => {
  it('keeps setup health read-only, then repairs a pending canonical commit exactly once', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(TEACHER_ONE);
    const before = harness.invoke('bootstrap');
    before.workspace.comments.push({
      id: 'pending-comment-t1',
      teacherId: 't1',
      recordType: 'walkthrough',
      recordId: 'walk-t1',
      text: 'Please clarify the next instructional step.',
    });

    const workspaceFile = harness.driveFiles.get(harness.properties.get('EE_WORKSPACE_FILE_ID'));
    const pendingFile = harness.driveFiles.get(harness.properties.get('EE_PENDING_COMMIT_FILE_ID'));
    const originalWorkspaceContent = workspaceFile.content;
    const originalSetContent = workspaceFile.setContent;
    let primaryWriteAttempts = 0;
    workspaceFile.setContent = () => {
      primaryWriteAttempts += 1;
      throw new Error('Injected primary workspace commit failure');
    };

    const failure = harness.invokeError('saveWorkspace', {
      expectedVersion: before.revision,
      workspace: before.workspace,
      mutation: {
        teacherId: 't1',
        event: 'COMMENTED',
        entityType: 'walkthrough',
        entityId: 'walk-t1',
        version: 1,
      },
    });
    expect(failure.code).toBe('commit_recovery_required');
    expect(primaryWriteAttempts).toBe(1);
    expect(workspaceFile.content).toBe(originalWorkspaceContent);
    expect(pendingFile.content).not.toBe('');
    expect(harness.properties.get('EE_COMMIT_RECOVERY_REQUIRED')).toBe('1');
    expect(readSecondaryJournal(harness)).toMatchObject({
      workspaceIndexes: true,
      configuration: false,
      auditEntries: [],
      manualReviewRequired: false,
    });

    harness.setActiveEmail(ADMIN);
    const health = harness.invoke('getPortalSetupHealth');
    expect(health.checks).toMatchObject({
      workspaceCommitRecoveryRequired: true,
      workspaceRevision: before.revision,
      secondaryReconciliationRequired: true,
      secondaryWorkspaceIndexesRequired: true,
      secondaryMissingMessageCount: 0,
      secondaryMissingAuditCount: 0,
    });
    expect(primaryWriteAttempts).toBe(1);
    expect(workspaceFile.content).toBe(originalWorkspaceContent);
    expect(pendingFile.content).not.toBe('');
    expect(harness.properties.get('EE_COMMIT_RECOVERY_REQUIRED')).toBe('1');

    workspaceFile.setContent = originalSetContent;
    const messageRowsBefore = dataRows(harness, 'Messages').length;
    const auditRowsBefore = dataRows(harness, 'Audit').length;
    const repaired = reviewAndReconcile(harness);
    expect(repaired).toMatchObject({
      ok: true,
      status: 'completed',
      recoveryPending: false,
      repaired: {
        workspaceIndexRows: 2,
        operationAuditEntries: 0,
        pendingCommit: true,
      },
      remaining: {
        missingMessages: 0,
        missingAuditRows: 0,
        missingSnapshots: 0,
        operationAuditEntries: 0,
      },
    });
    expect(pendingFile.content).toBe('');
    expect(harness.properties.has('EE_COMMIT_RECOVERY_REQUIRED')).toBe(false);
    expect(harness.properties.has('EE_SECONDARY_RECOVERY_JOURNAL')).toBe(false);
    expect(harness.properties.has('EE_SECONDARY_RECONCILE_REQUIRED')).toBe(false);

    const messageMatches = dataRows(harness, 'Messages').filter((row) => row[0] === 'pending-comment-t1');
    expect(messageMatches).toHaveLength(1);
    expect(messageMatches[0].slice(1)).toEqual([
      't1', 'walkthrough', 'walk-t1', TEACHER_ONE, 'teacher',
      'Please clarify the next instructional step.', FIXED_NOW,
    ]);
    expect(dataRows(harness, 'Messages')).toHaveLength(messageRowsBefore + 1);

    harness.setActiveEmail(ADMIN);
    const recoveredWorkspace = harness.invoke('bootstrap').workspace;
    const commentAudit = recoveredWorkspace.audit.find((item) => item.event === 'COMMENTED' && item.entityId === 'walk-t1');
    expect(commentAudit).toBeTruthy();
    expect(dataRows(harness, 'Audit').filter((row) => row[0] === commentAudit.id)).toHaveLength(1);
    expect(dataRows(harness, 'Audit')).toHaveLength(auditRowsBefore + 1);

    const messageRowsAfter = dataRows(harness, 'Messages').length;
    const auditRowsAfter = dataRows(harness, 'Audit').length;
    expect(reviewAndReconcile(harness)).toMatchObject({
      status: 'none',
      recoveryPending: false,
      repaired: { workspaceIndexRows: 0, operationAuditEntries: 0, pendingCommit: false },
    });
    expect(dataRows(harness, 'Messages')).toHaveLength(messageRowsAfter);
    expect(dataRows(harness, 'Audit')).toHaveLength(auditRowsAfter);
  });

  it('replays an exact queued directory audit once and then clears its journal', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(ADMIN);
    const review = harness.invoke('reviewPortalDirectoryChange', {
      kind: 'member',
      candidate: {
        email: 'audit.recovery@district.example',
        displayName: 'Audit Recovery Evaluator',
        role: 'evaluator',
        active: true,
      },
    }).review;

    harness.setFailSheetAppend('Audit', true);
    const changed = harness.invoke('performPortalDirectoryChange', {
      reviewToken: review.token,
      acknowledgeImpact: true,
    });
    expect(changed).toMatchObject({ ok: true, status: 'recovery_pending', recoveryPending: true, auditPending: true });

    const journal = readSecondaryJournal(harness);
    expect(journal).toMatchObject({
      workspaceIndexes: false,
      configuration: false,
      manualReviewRequired: false,
    });
    expect(journal.auditEntries).toHaveLength(1);
    const queued = journal.auditEntries[0];
    expect(queued).toMatchObject({
      event: 'MEMBER_UPDATED',
      summary: 'Repository membership created or updated',
      entityType: 'member',
      actorEmail: ADMIN,
      actorRole: 'admin',
    });
    expect(dataRows(harness, 'Audit').filter((row) => row[0] === queued.id)).toHaveLength(0);

    harness.setFailSheetAppend('Audit', false);
    const rowsBefore = dataRows(harness, 'Audit').length;
    const repaired = reviewAndReconcile(harness);
    expect(repaired).toMatchObject({
      status: 'completed',
      recoveryPending: false,
      repaired: { workspaceIndexRows: 0, operationAuditEntries: 1, pendingCommit: false },
      remaining: { operationAuditEntries: 0 },
    });
    const matches = dataRows(harness, 'Audit').filter((row) => row[0] === queued.id);
    expect(matches).toHaveLength(1);
    expect(matches[0].slice(1, 10)).toEqual([
      '', 'MEMBER_UPDATED', 'Repository membership created or updated', 'member', queued.entityId,
      1, ADMIN, 'admin', FIXED_NOW,
    ]);
    expect(dataRows(harness, 'Audit')).toHaveLength(rowsBefore + 1);
    expect(harness.properties.has('EE_SECONDARY_RECOVERY_JOURNAL')).toBe(false);
    expect(harness.properties.has('EE_SECONDARY_RECONCILE_REQUIRED')).toBe(false);

    const rowsAfter = dataRows(harness, 'Audit').length;
    expect(reviewAndReconcile(harness)).toMatchObject({
      status: 'none',
      recoveryPending: false,
      repaired: { operationAuditEntries: 0 },
    });
    expect(dataRows(harness, 'Audit')).toHaveLength(rowsAfter);
  });

  it('reports a sent notification as recovery pending until its exact audit entry is repaired', () => {
    const harness = repositoryFixture();
    harness.setFailSheetAppend('Audit', true);
    harness.setActiveEmail(EVALUATOR);

    const review = harness.invoke('reviewPortalNotification', { teacherId: 't1', target: 'teacher' }).review;
    const notificationRequest = {
      teacherId: 't1', target: 'teacher', reviewToken: review.token, acknowledged: true,
    };
    const sent = harness.invoke('sendPortalNotification', notificationRequest);
    expect(sent).toMatchObject({
      ok: true,
      sent: true,
      target: 'teacher',
      status: 'recovery_pending',
      recoveryPending: true,
      auditPending: true,
    });
    expect(harness.sentMail).toHaveLength(1);

    const journal = readSecondaryJournal(harness);
    expect(journal.auditEntries).toHaveLength(1);
    const queued = journal.auditEntries[0];
    expect(queued).toMatchObject({
      event: 'NOTIFICATION_SENT',
      entityType: 'notification',
      entityId: 'teacher',
      teacherId: 't1',
      actorEmail: EVALUATOR,
      actorRole: 'evaluator',
    });
    expect(dataRows(harness, 'Audit').filter((row) => row[0] === queued.id)).toHaveLength(0);

    const retry = harness.invoke('sendPortalNotification', notificationRequest);
    expect(retry).toMatchObject({
      ok: true,
      sent: true,
      status: 'recovery_pending',
      auditPending: true,
      idempotent: true,
    });
    expect(harness.sentMail).toHaveLength(1);

    harness.setFailSheetAppend('Audit', false);
    harness.setActiveEmail(ADMIN);
    expect(reviewAndReconcile(harness)).toMatchObject({
      status: 'completed',
      recoveryPending: false,
      repaired: { operationAuditEntries: 1 },
      remaining: { operationAuditEntries: 0 },
    });
    expect(dataRows(harness, 'Audit').filter((row) => row[0] === queued.id)).toHaveLength(1);
    expect(reviewAndReconcile(harness).status).toBe('none');
    expect(dataRows(harness, 'Audit').filter((row) => row[0] === queued.id)).toHaveLength(1);
  });

  it('uses the same canonical receipt audit ID in workspace and ledger', () => {
    const harness = repositoryFixture();
    seedReleasedSummary(harness);
    harness.setActiveEmail(TEACHER_ONE);
    const first = harness.invoke('recordReleasedSummaryOpened', { teacherId: 't1' });
    expect(first).toMatchObject({
      ok: true,
      status: 'completed',
      recoveryPending: false,
      auditPending: false,
    });

    const entry = receiptAuditEntry(harness);
    expect(entry).toBeTruthy();
    const rows = dataRows(harness, 'Audit').filter((row) => row[2] === 'RECEIPT_OPENED');
    expect(rows).toHaveLength(1);
    expect(rows[0][0]).toBe(entry.id);
    expect(rows[0].slice(1, 10)).toEqual([
      't1', 'RECEIPT_OPENED', 'Educator opened the released summary link',
      'released_summary', 't1', 1, TEACHER_ONE, 'teacher', FIXED_NOW,
    ]);

    harness.setActiveEmail(TEACHER_ONE);
    expect(harness.invoke('recordReleasedSummaryOpened', { teacherId: 't1' })).toMatchObject({
      ok: true,
      duplicate: true,
      openedAt: first.openedAt,
    });
    expect(dataRows(harness, 'Audit').filter((row) => row[0] === entry.id)).toHaveLength(1);
  });

  it('recovers a receipt audit-sink failure from the canonical workspace exactly once', () => {
    const harness = repositoryFixture();
    seedReleasedSummary(harness);
    harness.setFailSheetAppend('Audit', true);
    harness.setActiveEmail(TEACHER_ONE);
    const opened = harness.invoke('recordReleasedSummaryOpened', { teacherId: 't1' });
    expect(opened).toMatchObject({
      ok: true,
      status: 'recovery_pending',
      recoveryPending: true,
      auditPending: true,
    });
    const entry = receiptAuditEntry(harness);
    expect(entry).toBeTruthy();
    expect(dataRows(harness, 'Audit').filter((row) => row[0] === entry.id)).toHaveLength(0);
    expect(readSecondaryJournal(harness)).toMatchObject({
      workspaceIndexes: true,
      auditEntries: [],
      manualReviewRequired: false,
    });

    harness.setFailSheetAppend('Audit', false);
    harness.setActiveEmail(ADMIN);
    const repaired = reviewAndReconcile(harness);
    expect(repaired).toMatchObject({
      status: 'completed',
      recoveryPending: false,
      repaired: { workspaceIndexRows: 1, operationAuditEntries: 0 },
    });
    expect(dataRows(harness, 'Audit').filter((row) => row[0] === entry.id)).toHaveLength(1);
    expect(reviewAndReconcile(harness).status).toBe('none');
    expect(dataRows(harness, 'Audit').filter((row) => row[0] === entry.id)).toHaveLength(1);
  });

  it('recovers a receipt whose primary commit was pending without inventing another audit ID', () => {
    const harness = repositoryFixture();
    const originalRevision = seedReleasedSummary(harness);
    const workspaceFile = harness.driveFiles.get(harness.properties.get('EE_WORKSPACE_FILE_ID'));
    const originalSetContent = workspaceFile.setContent;
    workspaceFile.setContent = () => { throw new Error('Injected primary workspace commit failure'); };

    harness.setActiveEmail(TEACHER_ONE);
    const opened = harness.invoke('recordReleasedSummaryOpened', { teacherId: 't1' });
    expect(opened).toMatchObject({
      ok: true,
      status: 'recovery_pending',
      recoveryPending: true,
      auditPending: true,
    });
    expect(harness.properties.get('EE_COMMIT_RECOVERY_REQUIRED')).toBe('1');
    expect(dataRows(harness, 'Audit').filter((row) => row[2] === 'RECEIPT_OPENED')).toHaveLength(0);

    harness.setActiveEmail(ADMIN);
    const health = harness.invoke('getPortalSetupHealth');
    expect(health.checks).toMatchObject({
      workspaceRevision: originalRevision,
      workspaceCommitRecoveryRequired: true,
      secondaryWorkspaceIndexesRequired: true,
    });

    workspaceFile.setContent = originalSetContent;
    const repaired = reviewAndReconcile(harness);
    expect(repaired).toMatchObject({
      status: 'completed',
      recoveryPending: false,
      revision: originalRevision + 1,
      repaired: { workspaceIndexRows: 1, operationAuditEntries: 0, pendingCommit: true },
    });

    const entry = receiptAuditEntry(harness);
    expect(entry).toBeTruthy();
    expect(dataRows(harness, 'Audit').filter((row) => row[0] === entry.id)).toHaveLength(1);
    harness.setActiveEmail(ADMIN);
    expect(reviewAndReconcile(harness).status).toBe('none');
    expect(dataRows(harness, 'Audit').filter((row) => row[0] === entry.id)).toHaveLength(1);
  });

  it('denies reconciliation to non-administrators', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(TEACHER_ONE);
    const teacherDenied = harness.invokeError('reconcilePortalWorkspaceIntegrity');
    expect(teacherDenied.code).toBe('denied');
    expect(String(teacherDenied.message || teacherDenied)).toContain('Administrator');

    harness.setActiveEmail(EVALUATOR);
    const evaluatorDenied = harness.invokeError('reconcilePortalWorkspaceIntegrity');
    expect(evaluatorDenied.code).toBe('denied');
  });
});
