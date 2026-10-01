import { describe, expect, it } from 'vitest';
import {
  repositoryFixture,
  ADMIN,
  EVALUATOR,
  TEACHER_ONE,
} from './helpers/educator_evaluation_gs_harness.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

function seedPendingCommit(harness, workspace, revision) {
  const pendingId = harness.properties.get('EE_PENDING_COMMIT_FILE_ID');
  const content = JSON.stringify({
    revision,
    actorEmail: ADMIN,
    at: '2026-08-13T17:15:30.000Z',
    workspace,
  });
  harness.driveFiles.get(pendingId).content = content;
  harness.properties.set('EE_COMMIT_RECOVERY_REQUIRED', '1');
  return { pendingId, content };
}

function reviewAndReconcile(harness) {
  const review = harness.invoke('reviewPortalWorkspaceIntegrity').review;
  return harness.invoke('reconcilePortalWorkspaceIntegrity', {
    reviewToken: review.token,
    acknowledgeRepair: true,
  });
}

describe('educator evaluation backend hardening', () => {
  it('requires explicit ScriptLock proof and clears an exact current-revision journal idempotently', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(ADMIN);
    const current = harness.invoke('bootstrap');
    const pending = seedPendingCommit(harness, current.workspace, current.revision);
    const canonicalBefore = harness.driveFiles.get(harness.properties.get('EE_WORKSPACE_FILE_ID')).content;

    expect(harness.invokeError('completePendingCommit_').code).toBe('server_error');
    expect(harness.driveFiles.get(pending.pendingId).content).toBe(pending.content);
    expect(harness.driveFiles.get(harness.properties.get('EE_WORKSPACE_FILE_ID')).content).toBe(canonicalBefore);

    const repaired = reviewAndReconcile(harness);
    expect(repaired).toMatchObject({
      ok: true,
      status: 'completed',
      recoveryPending: false,
      revision: current.revision,
      repaired: { pendingCommit: true },
    });
    expect(harness.driveFiles.get(pending.pendingId).content).toBe('');
    expect(harness.properties.has('EE_COMMIT_RECOVERY_REQUIRED')).toBe(false);
    expect(harness.driveFiles.get(harness.properties.get('EE_WORKSPACE_FILE_ID')).content).toBe(canonicalBefore);
  });

  it('retains a stale journal when canonical state advances after review but before locked completion', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(ADMIN);
    const before = harness.invoke('bootstrap');
    const pendingWorkspace = clone(before.workspace);
    pendingWorkspace.config.evaluatorInitials = 'PEND';
    const pending = seedPendingCommit(harness, pendingWorkspace, before.revision + 1);
    const review = harness.invoke('reviewPortalWorkspaceIntegrity').review;

    const newerWorkspace = clone(before.workspace);
    newerWorkspace.config.evaluatorInitials = 'NEWER';
    let injected = false;
    harness.resetSheetReadCounts();
    harness.setSheetReadHook('Workspace', ({ row }) => {
      if (injected || row !== 2) return;
      injected = true;
      harness.replaceWorkspace(newerWorkspace);
      harness.setSheetCell('Workspace', 1, 1, before.revision + 2);
    });
    const lockBefore = harness.scriptLockSnapshot();
    const error = harness.invokeError('reconcilePortalWorkspaceIntegrity', {
      reviewToken: review.token,
      acknowledgeRepair: true,
    });
    harness.setSheetReadHook('Workspace', null);

    expect(injected).toBe(true);
    expect(error.code).toBe('manual_recovery_required');
    expect(harness.driveFiles.get(pending.pendingId).content).toBe(pending.content);
    expect(harness.properties.get('EE_COMMIT_RECOVERY_REQUIRED')).toBe('1');
    const lockAfter = harness.scriptLockSnapshot();
    expect(lockAfter).toMatchObject({
      acquired: lockBefore.acquired + 1,
      released: lockBefore.released + 1,
      held: false,
    });
    const canonical = harness.invoke('bootstrap');
    expect(canonical.revision).toBe(before.revision + 2);
    expect(canonical.workspace.config.evaluatorInitials).toBe('NEWER');
  });

  it('refuses a different revision-zero journal when canonical metadata is missing', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(ADMIN);
    const current = harness.invoke('bootstrap');
    const canonicalId = harness.properties.get('EE_WORKSPACE_FILE_ID');
    const canonicalBefore = harness.driveFiles.get(canonicalId).content;
    const different = clone(current.workspace);
    different.config.evaluatorInitials = 'EVIL';
    const pending = seedPendingCommit(harness, different, 0);
    for (let column = 0; column < 6; column += 1) harness.setSheetCell('Workspace', 1, column, '');

    const review = harness.invoke('reviewPortalWorkspaceIntegrity').review;
    const error = harness.invokeError('reconcilePortalWorkspaceIntegrity', {
      reviewToken: review.token,
      acknowledgeRepair: true,
    });
    expect(error.code).toBe('manual_recovery_required');
    expect(harness.driveFiles.get(canonicalId).content).toBe(canonicalBefore);
    expect(harness.driveFiles.get(pending.pendingId).content).toBe(pending.content);
    expect(harness.properties.get('EE_COMMIT_RECOVERY_REQUIRED')).toBe('1');
  });

  it('returns setup health with nested zero parity when metadata is unavailable during commit recovery', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(ADMIN);
    const current = harness.invoke('bootstrap');
    const pendingWorkspace = clone(current.workspace);
    pendingWorkspace.config.evaluatorInitials = 'PEND';
    seedPendingCommit(harness, pendingWorkspace, current.revision + 1);
    for (let column = 0; column < 6; column += 1) harness.setSheetCell('Workspace', 1, column, '');

    const health = harness.invoke('getPortalSetupHealth');
    expect(health).toMatchObject({ ok: true });
    expect(health.checks).toMatchObject({
      workspaceMetadataIntact: false,
      workspaceCommitRecoveryRequired: true,
      secondaryReconciliationRequired: true,
      secondaryInspectionUnavailable: true,
      secondaryAmbiguousIssueCount: 0,
    });
    expect(health.parity).toMatchObject({
      messages: { blankIdRows: 0 },
      audit: { blankIdRows: 0 },
      snapshots: { blankIdRows: 0 },
    });
  });

  it('neutralizes formulas after control whitespace in editable profile CSV fields', () => {
    const harness = repositoryFixture();
    const code = '\t=SUM(1)';
    const name = '\u000b+CMD';
    const building = ' \r\n@HYPERLINK';
    const assignment = '\f-2+3';
    const csv = harness.invoke('statusExportCsv_', { teachers: [{
      code,
      name,
      building,
      assignment,
      active: true,
      cycleStatus: 'open',
      dueDate: '',
      finalizedAt: '',
    }] });

    for (const value of [code, name, building, assignment]) {
      expect(csv).toContain(`"'${value}"`);
      expect(csv).not.toContain(`"${value}"`);
    }
  });

  it('rejects comments on unpublished walkthroughs for evaluators', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const boot = harness.invoke('bootstrap');
    const messageRowsBefore = harness.rows('Messages').length;
    boot.workspace.comments.push({
      id: 'forged-private-comment',
      teacherId: 't1',
      recordType: 'walkthrough',
      recordId: 'walk-t1-private',
      text: 'This evaluator-only draft must not become a shared thread.',
    });
    const error = harness.invokeError('saveWorkspace', {
      expectedVersion: boot.revision,
      workspace: boot.workspace,
      mutation: {
        teacherId: 't1',
        event: 'COMMENTED',
        entityType: 'walkthrough',
        entityId: 'walk-t1-private',
      },
    });
    expect(error.code).toBe('invalid_transition');
    expect(harness.rows('Messages')).toHaveLength(messageRowsBefore);
    expect(harness.invoke('bootstrap').workspace.comments.some((item) => item.id === 'forged-private-comment')).toBe(false);
  });

  it('filters legacy private-walkthrough comments and audit metadata from teacher bootstrap', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(ADMIN);
    const admin = harness.invoke('bootstrap');
    admin.workspace.comments.push(
      { id: 'legacy-private-comment', teacherId: 't1', recordType: 'walkthrough', recordId: 'walk-t1-private', text: 'Legacy private note.' },
      { id: 'legacy-public-comment', teacherId: 't1', recordType: 'walkthrough', recordId: 'walk-t1', text: 'Published thread.' },
    );
    harness.replaceWorkspace(admin.workspace);

    harness.setActiveEmail(TEACHER_ONE);
    const teacher = harness.invoke('bootstrap').workspace;
    expect(teacher.walkthroughs.some((item) => item.id === 'walk-t1-private')).toBe(false);
    expect(teacher.comments.some((item) => item.id === 'legacy-private-comment')).toBe(false);
    expect(teacher.comments.some((item) => item.id === 'legacy-public-comment')).toBe(true);
    expect(teacher.audit.some((item) => item.entityType === 'walkthrough' && item.entityId === 'walk-t1-private')).toBe(false);
    expect(teacher.audit.some((item) => item.entityType === 'walkthrough' && item.entityId === 'walk-t1')).toBe(true);
  });
});