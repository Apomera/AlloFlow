import { describe, expect, it } from 'vitest';
import {
  repositoryFixture,
  ADMIN,
  EVALUATOR,
  TEACHER_ONE,
  FIXED_NOW,
} from './helpers/educator_evaluation_gs_harness.js';

const reviewIntegrity = (harness) => harness.invoke('reviewPortalWorkspaceIntegrity');
const performReviewedRepair = (harness, review) => harness.invoke('reconcilePortalWorkspaceIntegrity', {
  reviewToken: review.review.token,
  acknowledgeRepair: true,
});
const sendReviewedNotification = (harness) => {
  const review = harness.invoke('reviewPortalNotification', { teacherId: 't1', target: 'teacher' }).review;
  return harness.invoke('sendPortalNotification', {
    teacherId: 't1', target: 'teacher', reviewToken: review.token, acknowledged: true,
  });
};

const canonicalComment = (overrides = {}) => ({
  id: 'parity-comment-t1',
  teacherId: 't1',
  recordType: 'walkthrough',
  recordId: 'walk-t1',
  text: 'Canonical educator comment.',
  role: 'Teacher',
  author: 'Educator One',
  authorEmail: TEACHER_ONE,
  authorRole: 'teacher',
  at: FIXED_NOW,
  version: 1,
  ...overrides,
});

const seedCanonicalComment = (harness, comment = canonicalComment()) => {
  const boot = harness.invoke('bootstrap');
  boot.workspace.comments.push(comment);
  harness.replaceWorkspace(boot.workspace);
  return comment;
};

describe('educator evaluation semantic secondary-ledger parity', () => {
  it('reports content-free recovery and quota observability without mutating repository state', () => {
    const harness = repositoryFixture();
    harness.properties.set('EE_SECONDARY_RECOVERY_JOURNAL', JSON.stringify({ version: 1, at: '2026-08-12T12:00:00.000Z', workspaceIndexes: true, configuration: false, auditEntries: [], manualReviewRequired: false }));
    harness.properties.set('EE_SECONDARY_RECONCILE_REQUIRED', '1');
    harness.properties.set('EE_RELEASE_RECOVERY_REQUIRED', JSON.stringify({ kind: 'released_summary_acl_recovery', version: 1, at: '2026-08-11T12:00:00.000Z', stage: 'document_build' }));
    harness.properties.set('EE_ROLLOVER_RECOVERY_REQUIRED', JSON.stringify({ at: '2026-08-10T12:00:00.000Z', stage: 'archive_verified' }));
    const rowsBefore = JSON.stringify({ messages: harness.rows('Messages'), audit: harness.rows('Audit'), snapshots: harness.rows('Snapshots'), config: harness.rows('Config') });
    const propertiesBefore = Object.fromEntries(harness.properties);

    const health = harness.invoke('getPortalSetupHealth');
    expect(health.checkedAt).toBe(FIXED_NOW);
    expect(health.checks).toMatchObject({
      checkedAt: FIXED_NOW,
      auditChainIntact: true,
      auditChainVerifiedRows: health.checks.auditChainRows,
      pendingRecoveryTotal: expect.any(Number),
      oldestRecoveryAt: '2026-08-10T12:00:00.000Z',
      emailQuotaAvailable: true,
      emailQuotaRemaining: 100,
      releaseQueueCount: 1,
      secondaryMismatchedMessageCount: 0,
      secondaryDuplicateAuditCount: 0,
      secondaryLedgerOnlySnapshotCount: 0,
    });
    expect(health.checks.pendingRecoveryTotal).toBeGreaterThanOrEqual(3);
    expect(health.checks.oldestRecoveryAgeHours).toBeGreaterThan(0);
    expect(health.recoveryQueues).toMatchObject({
      secondary: { pending: true, oldestAt: '2026-08-12T12:00:00.000Z' },
      releasedSummary: { pending: true, count: 1, oldestAt: '2026-08-11T12:00:00.000Z' },
      annualRollover: { pending: true, count: 1, oldestAt: '2026-08-10T12:00:00.000Z' },
    });
    expect(health.emailQuota).toEqual({ available: true, remainingDaily: 100 });
    expect(JSON.stringify({ messages: harness.rows('Messages'), audit: harness.rows('Audit'), snapshots: harness.rows('Snapshots'), config: harness.rows('Config') })).toBe(rowsBefore);
    expect(Object.fromEntries(harness.properties)).toEqual(propertiesBefore);
  });

  it('detects a canonical content mismatch without returning record text and refuses repair', () => {
    const harness = repositoryFixture();
    const comment = seedCanonicalComment(harness);
    harness.appendSheetRow('Messages', [
      comment.id, comment.teacherId, comment.recordType, comment.recordId,
      comment.authorEmail, comment.authorRole, 'Different ledger text.', comment.at,
    ]);

    const beforeRows = harness.rows('Messages');
    const beforeProperties = Object.fromEntries(harness.properties);
    const response = reviewIntegrity(harness);
    expect(response.review).toMatchObject({ repairable: false, manualReviewRequired: true });
    expect(response.review.counts).toMatchObject({ mismatchedMessages: 1, totalAmbiguous: 1 });
    expect(response.review.samples.mismatched[0]).toMatchObject({ ledger: 'messages', issue: 'canonical_mismatch' });
    expect(JSON.stringify(response)).not.toContain('Different ledger text.');
    expect(harness.rows('Messages')).toEqual(beforeRows);
    expect(Object.fromEntries(harness.properties)).toEqual(beforeProperties);

    const denied = harness.invokeError('reconcilePortalWorkspaceIntegrity', {
      reviewToken: response.review.token,
      acknowledgeRepair: true,
    });
    expect(denied.code).toBe('manual_recovery_required');
    expect(harness.rows('Messages')).toEqual(beforeRows);
  });

  it('detects duplicate IDs globally while retaining unique message and audit history as informational', () => {
    const harness = repositoryFixture();
    const comment = canonicalComment({ id: 'historical-message' });
    harness.appendSheetRow('Messages', [comment.id, comment.teacherId, comment.recordType, comment.recordId, comment.authorEmail, comment.authorRole, comment.text, comment.at]);

    const informational = reviewIntegrity(harness);
    expect(informational.review.repairable).toBe(true);
    expect(informational.review.counts).toMatchObject({ ledgerOnlyMessages: 1 });
    expect(informational.review.counts.ledgerOnlyAuditRows).toBeGreaterThanOrEqual(1);

    harness.appendSheetRow('Messages', [comment.id, comment.teacherId, comment.recordType, comment.recordId, comment.authorEmail, comment.authorRole, comment.text, comment.at]);
    const duplicate = reviewIntegrity(harness);
    expect(duplicate.review).toMatchObject({ repairable: false, manualReviewRequired: true });
    expect(duplicate.review.counts).toMatchObject({ duplicateMessages: 1 });
    expect(duplicate.review.samples.duplicates[0]).toMatchObject({ ledger: 'messages', issue: 'duplicate_id', occurrences: 2 });
  });

  it('treats ledger-only finalized snapshots and duplicate academic-year keys as ambiguous', () => {
    const harness = repositoryFixture();
    harness.appendSheetRow('Snapshots', ['unexpected-snapshot','t1','T-001','2025-26','Central','professional',FIXED_NOW,2,2,2,2,2,'PA Act 13 / Danielson 2021']);
    let response = reviewIntegrity(harness);
    expect(response.review).toMatchObject({ repairable: false, manualReviewRequired: true });
    expect(response.review.counts).toMatchObject({ ledgerOnlySnapshots: 1 });
    expect(response.review.samples.ledgerOnlySnapshots[0]).toMatchObject({ ledger: 'snapshots', issue: 'unexpected_ledger_only' });

    const duplicateConfigHarness = repositoryFixture();
    duplicateConfigHarness.appendSheetRow('Config', ['academicYear', '2026-27']);
    response = reviewIntegrity(duplicateConfigHarness);
    expect(response.review).toMatchObject({ repairable: false, manualReviewRequired: true });
    expect(response.configuration).toMatchObject({ duplicate: true, keyCount: 2 });
    expect(response.review.counts.configurationMismatch).toBe(true);
  });

  it('normalizes equivalent typed dates and numbers and produces a stable read-only fingerprint', () => {
    const harness = repositoryFixture();
    const snapshotRow = harness.rows('Snapshots')[1];
    harness.setSheetCell('Snapshots', 1, 6, new Date(snapshotRow[6]));
    for (let column = 7; column <= 11; column += 1) {
      if (snapshotRow[column] !== '' && snapshotRow[column] != null) harness.setSheetCell('Snapshots', 1, column, String(snapshotRow[column]));
    }
    const rowsBefore = JSON.stringify({ messages: harness.rows('Messages'), audit: harness.rows('Audit'), snapshots: harness.rows('Snapshots') });
    const propertiesBefore = Object.fromEntries(harness.properties);
    const first = reviewIntegrity(harness);
    const second = reviewIntegrity(harness);
    expect(first.review).toMatchObject({ repairable: true, manualReviewRequired: false });
    expect(first.review.fingerprint).toBe(second.review.fingerprint);
    expect(first.review.token).not.toBe(second.review.token);
    expect(JSON.stringify({ messages: harness.rows('Messages'), audit: harness.rows('Audit'), snapshots: harness.rows('Snapshots') })).toBe(rowsBefore);
    expect(Object.fromEntries(harness.properties)).toEqual(propertiesBefore);
  });

  it('reads Audit once and derives parity, outbox, chain, and fingerprint from that captured snapshot', () => {
    const harness = repositoryFixture();
    harness.setFailSheetAppend('Audit', true);
    harness.setActiveEmail(EVALUATOR);
    expect(sendReviewedNotification(harness).auditPending).toBe(true);
    const journal = JSON.parse(harness.properties.get('EE_SECONDARY_RECOVERY_JOURNAL'));
    const queued = journal.auditEntries[0];
    harness.setFailSheetAppend('Audit', false);
    harness.invoke('appendCanonicalAuditRow_', queued);
    harness.setActiveEmail(ADMIN);

    const baseline = reviewIntegrity(harness);
    expect(baseline).toMatchObject({
      auditChainIntact: true,
      parity: { mismatchedAuditRows: 0 },
      outbox: { exactPresent: 1, mismatched: 0 },
    });

    const canonicalIds = new Set(harness.invoke('bootstrap').workspace.audit.map((entry) => entry.id));
    const auditRows = harness.rows('Audit');
    const canonicalRowIndex = auditRows.findIndex((row, index) => index > 0 && canonicalIds.has(row[0]));
    const queuedRowIndex = auditRows.findIndex((row, index) => index > 0 && row[0] === queued.id);
    expect(canonicalRowIndex).toBeGreaterThan(0);
    expect(queuedRowIndex).toBeGreaterThan(0);

    harness.resetSheetReadCounts();
    harness.setSheetReadHook('Audit', ({ count }) => {
      if (count !== 1) return;
      harness.setSheetCell('Audit', canonicalRowIndex, 3, 'Tampered canonical summary after snapshot');
      harness.setSheetCell('Audit', queuedRowIndex, 3, 'Tampered queued summary after snapshot');
    });
    const captured = reviewIntegrity(harness);
    expect(harness.sheetReadCount('Audit')).toBe(1);
    expect(captured.review.fingerprint).toBe(baseline.review.fingerprint);
    expect(captured).toMatchObject({
      auditChainIntact: true,
      parity: { mismatchedAuditRows: 0 },
      outbox: { exactPresent: 1, mismatched: 0 },
    });

    harness.setSheetReadHook('Audit', null);
    const changed = reviewIntegrity(harness);
    expect(changed.review.fingerprint).not.toBe(captured.review.fingerprint);
    expect(changed.auditChainIntact).toBe(false);
    expect(changed.parity.mismatchedAuditRows).toBeGreaterThanOrEqual(1);
    expect(changed.outbox).toMatchObject({ exactPresent: 0, mismatched: 1 });
  });

  it('preserves standalone helper reads when optional ledger snapshots are omitted', () => {
    const harness = repositoryFixture();
    const workspace = harness.invoke('bootstrap').workspace;
    const emptyJournal = {
      version: 1,
      at: '',
      workspaceIndexes: false,
      configuration: false,
      auditEntries: [],
      manualReviewRequired: false,
    };

    harness.resetSheetReadCounts();
    expect(harness.invoke('secondaryIndexStatus_', workspace)).toMatchObject({ mismatchedAuditRows: 0, ambiguous: false });
    expect(harness.sheetReadCount('Audit')).toBe(1);

    harness.resetSheetReadCounts();
    expect(harness.invoke('operationAuditOutboxStatus_', emptyJournal)).toMatchObject({ queued: 0, missing: 0, ambiguous: false });
    expect(harness.sheetReadCount('Audit')).toBe(1);

    harness.resetSheetReadCounts();
    expect(harness.invoke('auditChainStatus_')).toMatchObject({ ok: true });
    expect(harness.sheetReadCount('Audit')).toBe(1);
  });

  it('rejects missing, stale, reused, and actor-mismatched reviews', () => {
    const harness = repositoryFixture();
    expect(harness.invokeError('reconcilePortalWorkspaceIntegrity', { acknowledgeRepair: true }).code).toBe('review_required');

    const stale = reviewIntegrity(harness);
    harness.appendSheetRow('Messages', ['post-review-history','t1','walkthrough','walk-t1',TEACHER_ONE,'teacher','Historical message.',FIXED_NOW]);
    expect(harness.invokeError('reconcilePortalWorkspaceIntegrity', { reviewToken: stale.review.token, acknowledgeRepair: true }).code).toBe('review_stale');
    expect(harness.invokeError('reconcilePortalWorkspaceIntegrity', { reviewToken: stale.review.token, acknowledgeRepair: true }).code).toBe('review_required');

    const clean = reviewIntegrity(harness);
    expect(harness.invokeError('reconcilePortalWorkspaceIntegrity', { reviewToken: clean.review.token }).code).toBe('acknowledgment_required');
    expect(performReviewedRepair(harness, clean).status).toBe('none');
    expect(harness.invokeError('reconcilePortalWorkspaceIntegrity', { reviewToken: clean.review.token, acknowledgeRepair: true }).code).toBe('review_required');

    const actorBound = reviewIntegrity(harness);
    harness.setActiveEmail(EVALUATOR);
    expect(harness.invokeError('reconcilePortalWorkspaceIntegrity', { reviewToken: actorBound.review.token, acknowledgeRepair: true }).code).toBe('denied');
    expect(harness.invokeError('reviewPortalWorkspaceIntegrity').code).toBe('denied');
  });

  it('repairs reviewed missing rows exactly once and rejects a same-ID outbox payload mismatch', () => {
    const harness = repositoryFixture();
    const comment = seedCanonicalComment(harness);
    let review = reviewIntegrity(harness);
    expect(review.review).toMatchObject({ repairable: true, manualReviewRequired: false });
    expect(review.review.counts).toMatchObject({ missingMessages: 1, totalRepairable: 1 });
    expect(performReviewedRepair(harness, review)).toMatchObject({ status: 'completed', recoveryPending: false, repaired: { workspaceIndexRows: 1 } });
    expect(harness.rows('Messages').slice(1).filter((row) => row[0] === comment.id)).toHaveLength(1);
    review = reviewIntegrity(harness);
    expect(performReviewedRepair(harness, review).status).toBe('none');
    expect(harness.rows('Messages').slice(1).filter((row) => row[0] === comment.id)).toHaveLength(1);

    const outboxHarness = repositoryFixture();
    outboxHarness.setFailSheetAppend('Audit', true);
    outboxHarness.setActiveEmail(EVALUATOR);
    expect(sendReviewedNotification(outboxHarness).auditPending).toBe(true);
    const journal = JSON.parse(outboxHarness.properties.get('EE_SECONDARY_RECOVERY_JOURNAL'));
    const queued = journal.auditEntries[0];
    outboxHarness.setFailSheetAppend('Audit', false);
    outboxHarness.invoke('appendCanonicalAuditRow_', { ...queued, summary: 'Different operation payload' });
    outboxHarness.setActiveEmail(ADMIN);
    const outboxReview = reviewIntegrity(outboxHarness);
    expect(outboxReview.review.repairable).toBe(false);
    expect(outboxReview.outbox).toMatchObject({ mismatched: 1, ambiguous: true });
    expect(outboxHarness.invokeError('reconcilePortalWorkspaceIntegrity', { reviewToken: outboxReview.review.token, acknowledgeRepair: true }).code).toBe('manual_recovery_required');
    expect(JSON.parse(outboxHarness.properties.get('EE_SECONDARY_RECOVERY_JOURNAL')).auditEntries).toHaveLength(1);
  });
});
