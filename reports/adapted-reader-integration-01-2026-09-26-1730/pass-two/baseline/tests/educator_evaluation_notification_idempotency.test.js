import { describe, expect, it } from 'vitest';
import {
  repositoryFixture,
  ADMIN,
  DOMAIN,
  EVALUATOR,
  TEACHER_ONE,
  FIXED_NOW,
} from './helpers/educator_evaluation_gs_harness.js';

const notificationReviewKeys = (harness) => harness.cacheKeys()
  .filter((key) => key.startsWith('EE_NOTIFICATION_REVIEW_'));

const notificationAuditRows = (harness) => harness.rows('Audit').slice(1)
  .filter((row) => row[2] === 'NOTIFICATION_SENT');

const reviewNotification = (harness, request = {}) => harness.invoke('reviewPortalNotification', {
  teacherId: 't1',
  target: 'teacher',
  ...request,
});

const performNotification = (harness, review, request = {}) => harness.invoke('sendPortalNotification', {
  teacherId: review.teacherId,
  target: review.target,
  reviewToken: review.token,
  acknowledged: true,
  ...request,
});

const reviewAndReconcile = (harness) => {
  const response = harness.invoke('reviewPortalWorkspaceIntegrity');
  expect(response.review).toMatchObject({ repairable: true, manualReviewRequired: false });
  return harness.invoke('reconcilePortalWorkspaceIntegrity', {
    reviewToken: response.review.token,
    acknowledgeRepair: true,
  });
};

describe('educator evaluation portal notification idempotency', () => {
  it('sends a generic content-free link once and exactly replays the deterministic Audit receipt', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const secret = 'Student-specific evidence that must never enter email';
    const reviewed = reviewNotification(harness, {
      text: secret,
      evaluationBody: secret,
      educatorName: 'Teacher One',
      rating: 'Unsatisfactory',
      recipient: TEACHER_ONE,
    });

    expect(reviewed).toMatchObject({
      ok: true,
      review: {
        teacherId: 't1',
        educatorName: 'Teacher One',
        target: 'teacher',
        recipient: TEACHER_ONE,
        contentFree: true,
        genericPortalLink: true,
        portalUrl: 'https://script.google.com/macros/s/evaluation-deployment/exec',
      },
    });
    expect(reviewed.review).not.toHaveProperty('remainingMailQuota');
    expect(notificationReviewKeys(harness)).toEqual([`EE_NOTIFICATION_REVIEW_${reviewed.review.token}`]);

    const first = performNotification(harness, reviewed.review, {
      text: secret,
      evaluationBody: secret,
      educatorName: 'Teacher One',
      rating: 'Unsatisfactory',
      recipient: TEACHER_ONE,
    });
    expect(first).toMatchObject({
      ok: true,
      sent: true,
      status: 'completed',
      idempotent: false,
      recoveryPending: false,
    });
    expect(harness.sentMail).toHaveLength(1);
    expect(notificationReviewKeys(harness)).toEqual([]);
    expect(harness.properties.has('EE_NOTIFICATION_OPERATION_JOURNAL')).toBe(false);
    expect(harness.properties.has('EE_NOTIFICATION_RECOVERY_REQUIRED')).toBe(false);
    expect(harness.invoke('getPortalNotificationOutcome', {
      teacherId: 't1',
      target: 'teacher',
    })).toMatchObject({
      ok: true,
      status: 'completed',
      sent: true,
      idempotent: true,
      priorCompletion: true,
      repeatEligible: true,
    });
    expect(harness.sentMail).toHaveLength(1);

    const mail = harness.sentMail[0];
    expect(mail).toMatchObject({
      to: TEACHER_ONE,
      subject: 'AlloFlow evaluation portal activity',
      noReply: true,
    });
    expect(mail.body).toContain('https://script.google.com/macros/s/evaluation-deployment/exec');
    for (const forbidden of [secret, 'Teacher One', 'Unsatisfactory', 'teacher.one@', 'teacherId=', 'recordId=', '?teacher=', '?view=']) {
      expect(mail.body).not.toContain(forbidden);
    }

    const auditRows = notificationAuditRows(harness);
    expect(auditRows).toHaveLength(1);
    const auditId = auditRows[0][0];
    expect(auditId).toMatch(/^audit-notification-/);

    harness.properties.set('EE_COMMIT_RECOVERY_REQUIRED', JSON.stringify({
      stage: 'workspace_commit',
      at: FIXED_NOW,
    }));
    expect(performNotification(harness, reviewed.review)).toMatchObject({
      ok: true,
      sent: true,
      status: 'completed',
      idempotent: true,
    });
    expect(harness.invoke('getPortalNotificationOutcome', {
      teacherId: 't1',
      target: 'teacher',
      reviewToken: reviewed.review.token,
    })).toMatchObject({
      ok: true,
      sent: true,
      status: 'completed',
      idempotent: true,
    });
    expect(harness.sentMail).toHaveLength(1);
    expect(notificationAuditRows(harness).map((row) => row[0])).toEqual([auditId]);
  });

  it('treats a delivered-then-thrown Mail response as permanently delivery unknown', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const reviewed = reviewNotification(harness).review;
    harness.setMailSendMode('deliver_then_throw');

    const uncertain = performNotification(harness, reviewed);
    expect(uncertain).toMatchObject({
      ok: true,
      sent: null,
      status: 'delivery_unknown',
      deliveryUnknown: true,
      idempotent: false,
    });
    expect(uncertain).not.toHaveProperty('preDispatch');
    expect(harness.sentMail).toHaveLength(1);
    expect(notificationAuditRows(harness)).toHaveLength(0);
    const operation = JSON.parse(harness.properties.get('EE_NOTIFICATION_OPERATION_JOURNAL'));
    expect(operation).toMatchObject({ version: 1 });
    expect(operation.integrityHash).toBeTruthy();
    expect(operation.entries).toHaveLength(1);
    expect(operation.entries[0]).toMatchObject({ stage: 'delivery_unknown', teacherId: 't1', target: 'teacher' });
    expect(operation.entries[0].integrityHash).toBeTruthy();
    expect(JSON.stringify(operation)).not.toContain(TEACHER_ONE);

    harness.setMailSendMode('normal');
    expect(performNotification(harness, reviewed)).toMatchObject({
      status: 'delivery_unknown',
      sent: null,
      idempotent: true,
    });
    expect(harness.invoke('getPortalNotificationOutcome', {
      teacherId: 't1',
      target: 'teacher',
      reviewToken: reviewed.token,
    })).toMatchObject({ status: 'delivery_unknown', sent: null, idempotent: true });
    expect(harness.invoke('getPortalNotificationOutcome', {
      teacherId: 't1',
      target: 'teacher',
    })).toMatchObject({ status: 'delivery_unknown', sent: null, idempotent: true });
    expect(harness.sentMail).toHaveLength(1);

    harness.setActiveEmail(ADMIN);
    expect(harness.invoke('getPortalNotificationOutcome', {
      teacherId: 't1',
      target: 'teacher',
    })).toMatchObject({ status: 'delivery_unknown', sent: null, idempotent: true });
    expect(harness.invokeError('reviewPortalNotification', {
      teacherId: 't1',
      target: 'teacher',
    }).code).toBe('notification_recovery_required');
    expect(harness.sentMail).toHaveLength(1);

    harness.setActiveEmail(EVALUATOR);
    expect(harness.invokeError('reviewPortalNotification', {
      teacherId: 't1',
      target: 'teacher',
    }).code).toBe('notification_recovery_required');
    expect(harness.sentMail).toHaveLength(1);

    harness.setActiveEmail(ADMIN);
    expect(harness.invoke('getPortalSetupHealth').checks).toMatchObject({
      notificationRecoveryRequired: true,
      notificationRecoveryManualRequired: false,
      notificationRecoveryCount: 1,
      notificationDeliveryUnknownCount: 1,
    });
  });

  it('queues the exact Audit intent after append failure and never resends while recovery is pending', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const reviewed = reviewNotification(harness).review;
    harness.setFailSheetAppend('Audit', true);

    expect(performNotification(harness, reviewed)).toMatchObject({
      ok: true,
      sent: true,
      status: 'recovery_pending',
      recoveryPending: true,
      auditPending: true,
      idempotent: false,
      manualReviewRequired: false,
    });
    expect(harness.sentMail).toHaveLength(1);

    const operation = JSON.parse(harness.properties.get('EE_NOTIFICATION_OPERATION_JOURNAL'));
    const secondary = JSON.parse(harness.properties.get('EE_SECONDARY_RECOVERY_JOURNAL'));
    expect(operation.entries).toHaveLength(1);
    expect(operation.entries[0].stage).toBe('audit_pending');
    expect(secondary.auditEntries).toHaveLength(1);
    expect(secondary.auditEntries[0]).toEqual(operation.entries[0].auditEntry);
    const auditId = secondary.auditEntries[0].id;
    expect(auditId).toMatch(/^audit-notification-/);

    expect(performNotification(harness, reviewed)).toMatchObject({
      ok: true,
      sent: true,
      status: 'recovery_pending',
      idempotent: true,
    });
    expect(harness.invoke('getPortalNotificationOutcome', {
      teacherId: 't1',
      target: 'teacher',
      reviewToken: reviewed.token,
    })).toMatchObject({ status: 'recovery_pending', sent: true, idempotent: true });
    expect(harness.invoke('getPortalNotificationOutcome', {
      teacherId: 't1',
      target: 'teacher',
    })).toMatchObject({ status: 'recovery_pending', sent: true, idempotent: true });
    expect(harness.sentMail).toHaveLength(1);
    expect(notificationAuditRows(harness)).toHaveLength(0);
    expect(harness.invokeError('reviewPortalNotification', {
      teacherId: 't1',
      target: 'teacher',
    }).code).toBe('notification_recovery_required');

    harness.setFailSheetAppend('Audit', false);
    harness.setActiveEmail(ADMIN);
    expect(reviewAndReconcile(harness)).toMatchObject({
      status: 'completed',
      recoveryPending: false,
      repaired: { operationAuditEntries: 1 },
      remaining: { operationAuditEntries: 0 },
    });

    harness.setActiveEmail(EVALUATOR);
    expect(harness.invoke('getPortalNotificationOutcome', {
      teacherId: 't1',
      target: 'teacher',
      reviewToken: reviewed.token,
    })).toMatchObject({ status: 'completed', sent: true, idempotent: true });
    expect(performNotification(harness, reviewed)).toMatchObject({
      status: 'completed',
      sent: true,
      idempotent: true,
    });
    expect(harness.sentMail).toHaveLength(1);
    expect(notificationAuditRows(harness).filter((row) => row[0] === auditId)).toHaveLength(1);
    expect(harness.properties.has('EE_NOTIFICATION_OPERATION_JOURNAL')).toBe(false);
  });

  it('recognizes an Audit append-then-throw as completed without queuing or resending', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const reviewed = reviewNotification(harness).review;
    harness.setThrowAfterSheetAppend('Audit', true);

    expect(performNotification(harness, reviewed)).toMatchObject({
      ok: true,
      sent: true,
      status: 'completed',
      idempotent: false,
      recoveryPending: false,
    });
    expect(harness.sentMail).toHaveLength(1);
    expect(notificationAuditRows(harness)).toHaveLength(1);
    expect(harness.properties.has('EE_NOTIFICATION_OPERATION_JOURNAL')).toBe(false);
    expect(harness.properties.has('EE_SECONDARY_RECOVERY_JOURNAL')).toBe(false);

    harness.setThrowAfterSheetAppend('Audit', false);
    expect(performNotification(harness, reviewed)).toMatchObject({
      status: 'completed',
      sent: true,
      idempotent: true,
    });
    expect(harness.sentMail).toHaveLength(1);
    expect(notificationAuditRows(harness)).toHaveLength(1);
  });

  it('recovers a completed unique scoped journal without a token or another Mail call', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const reviewed = reviewNotification(harness).review;
    harness.setMailSendMode('deliver_then_throw');

    expect(performNotification(harness, reviewed)).toMatchObject({
      status: 'delivery_unknown',
      sent: null,
    });
    const operation = JSON.parse(harness.properties.get('EE_NOTIFICATION_OPERATION_JOURNAL'));
    expect(operation.entries).toHaveLength(1);
    harness.invoke('appendCanonicalAuditRow_', operation.entries[0].auditEntry);
    harness.setMailSendMode('normal');

    const outcome = harness.invoke('getPortalNotificationOutcome', {
      teacherId: 't1',
      target: 'teacher',
    });
    expect(outcome).toMatchObject({
      ok: true,
      status: 'completed',
      sent: true,
      idempotent: true,
    });
    expect(outcome).not.toHaveProperty('preDispatch');
    expect(harness.sentMail).toHaveLength(1);
    expect(notificationAuditRows(harness)).toHaveLength(1);
    expect(harness.properties.has('EE_NOTIFICATION_OPERATION_JOURNAL')).toBe(false);

    expect(harness.invoke('getPortalNotificationOutcome', {
      teacherId: 't1',
      target: 'teacher',
    })).toMatchObject({
      ok: true,
      status: 'completed',
      sent: true,
      idempotent: true,
      priorCompletion: true,
      repeatEligible: true,
    });
    expect(harness.sentMail).toHaveLength(1);
  });

  it('returns no_unresolved for a tokenless scope with no history and never sends Mail', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);

    expect(harness.invoke('getPortalNotificationOutcome', {
      teacherId: 't1',
      target: 'teacher',
    })).toMatchObject({
      ok: true,
      status: 'no_unresolved',
      recoveryPending: false,
    });
    expect(harness.sentMail).toHaveLength(0);
    expect(harness.properties.has('EE_NOTIFICATION_OPERATION_JOURNAL')).toBe(false);
  });

  it('allows only one Mail send when two reviews were issued before either token dispatched', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const firstReview = reviewNotification(harness).review;
    const staleReview = reviewNotification(harness).review;
    expect(staleReview.token).not.toBe(firstReview.token);

    expect(performNotification(harness, firstReview)).toMatchObject({
      ok: true,
      status: 'completed',
      sent: true,
      idempotent: false,
    });
    const staleAttempt = performNotification(harness, staleReview);
    expect(staleAttempt).toMatchObject({
      ok: false,
      code: 'review_stale',
      preDispatch: true,
    });
    expect(harness.sentMail).toHaveLength(1);
    expect(notificationAuditRows(harness)).toHaveLength(1);
    expect(notificationReviewKeys(harness)).toEqual([]);
    expect(harness.properties.has('EE_NOTIFICATION_OPERATION_JOURNAL')).toBe(false);
  });

  it('returns a successful recipient-selection contract and binds the selected authorized evaluator', () => {
    const harness = repositoryFixture();
    const secondEvaluator = `other.principal@${DOMAIN}`;
    harness.appendSheetRow('Assignments', ['t1', secondEvaluator, true]);
    harness.setActiveEmail(TEACHER_ONE);

    const selection = reviewNotification(harness, { target: 'evaluator' });
    expect(selection).toMatchObject({
      ok: true,
      status: 'recipient_selection_required',
      recipients: [
        { email: secondEvaluator, displayName: 'Principal Morgan' },
        { email: EVALUATOR, displayName: 'Principal Rivera' },
      ],
    });
    expect(selection.candidates).toEqual(selection.recipients);
    expect(selection).not.toHaveProperty('review');
    expect(selection).not.toHaveProperty('remainingMailQuota');
    expect(notificationReviewKeys(harness)).toEqual([]);

    const reviewed = reviewNotification(harness, {
      target: 'evaluator',
      recipient: EVALUATOR,
    });
    expect(reviewed).toMatchObject({
      ok: true,
      review: {
        teacherId: 't1',
        target: 'evaluator',
        recipient: EVALUATOR,
        contentFree: true,
      },
    });
    expect(performNotification(harness, reviewed.review)).toMatchObject({
      ok: true,
      sent: true,
      status: 'completed',
    });
    expect(harness.sentMail).toHaveLength(1);
    expect(harness.sentMail[0].to).toBe(EVALUATOR);
  });

  it('refuses quota, pending-commit, and full-outbox reviews before caching a token or sending mail', () => {
    const quotaHarness = repositoryFixture();
    quotaHarness.setActiveEmail(EVALUATOR);
    quotaHarness.setRemainingMailQuota(0);
    const quotaProperties = Object.fromEntries(quotaHarness.properties);
    const quotaAudit = JSON.stringify(quotaHarness.rows('Audit'));
    expect(quotaHarness.invokeError('reviewPortalNotification', {
      teacherId: 't1',
      target: 'teacher',
    }).code).toBe('mail_quota_exhausted');
    expect(notificationReviewKeys(quotaHarness)).toEqual([]);
    expect(quotaHarness.sentMail).toHaveLength(0);
    expect(Object.fromEntries(quotaHarness.properties)).toEqual(quotaProperties);
    expect(JSON.stringify(quotaHarness.rows('Audit'))).toBe(quotaAudit);

    const commitHarness = repositoryFixture();
    commitHarness.setActiveEmail(EVALUATOR);
    commitHarness.properties.set('EE_COMMIT_RECOVERY_REQUIRED', JSON.stringify({
      stage: 'workspace_commit',
      at: FIXED_NOW,
    }));
    const commitProperties = Object.fromEntries(commitHarness.properties);
    expect(commitHarness.invokeError('reviewPortalNotification', {
      teacherId: 't1',
      target: 'teacher',
    }).code).toBe('commit_recovery_required');
    expect(notificationReviewKeys(commitHarness)).toEqual([]);
    expect(commitHarness.sentMail).toHaveLength(0);
    expect(Object.fromEntries(commitHarness.properties)).toEqual(commitProperties);
    expect(notificationAuditRows(commitHarness)).toHaveLength(0);

    const outboxHarness = repositoryFixture();
    for (let index = 0; index < 12; index += 1) {
      outboxHarness.invoke('recordOperationAuditRecovery_', {
        id: `queued-outbox-${String(index + 1).padStart(2, '0')}`,
        teacherId: 't2',
        event: 'OUTBOX_TEST',
        summary: 'Existing bounded recovery entry',
        actor: 'Repository Administrator',
        actorEmail: ADMIN,
        actorRole: 'admin',
        role: 'Evaluator',
        at: FIXED_NOW,
        entityType: 'workspace',
        entityId: `outbox-${index + 1}`,
        version: 1,
      });
    }
    const outboxBefore = outboxHarness.properties.get('EE_SECONDARY_RECOVERY_JOURNAL');
    expect(JSON.parse(outboxBefore).auditEntries).toHaveLength(12);
    outboxHarness.setActiveEmail(EVALUATOR);
    expect(outboxHarness.invokeError('reviewPortalNotification', {
      teacherId: 't1',
      target: 'teacher',
    }).code).toBe('busy');
    expect(notificationReviewKeys(outboxHarness)).toEqual([]);
    expect(outboxHarness.sentMail).toHaveLength(0);
    expect(outboxHarness.properties.get('EE_SECONDARY_RECOVERY_JOURNAL')).toBe(outboxBefore);
    expect(outboxHarness.properties.has('EE_NOTIFICATION_OPERATION_JOURNAL')).toBe(false);
    expect(notificationAuditRows(outboxHarness)).toHaveLength(0);
  });

  it('fails closed before Mail when the sealed dispatch intent cannot be persisted', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const reviewed = reviewNotification(harness).review;
    const originalSet = harness.properties.set.bind(harness.properties);
    harness.properties.set = (key, value) => {
      if (key === 'EE_NOTIFICATION_OPERATION_JOURNAL') throw new Error('Injected notification journal property failure');
      return originalSet(key, value);
    };
    let response;
    try {
      response = harness.invoke('sendPortalNotification', {
        teacherId: 't1',
        target: 'teacher',
        reviewToken: reviewed.token,
        acknowledged: true,
      });
    } finally {
      harness.properties.set = originalSet;
    }

    expect(response).toMatchObject({
      ok: false,
      code: 'manual_recovery_required',
      preDispatch: true,
    });
    expect(harness.sentMail).toHaveLength(0);
    expect(notificationAuditRows(harness)).toHaveLength(0);
    expect(harness.properties.has('EE_NOTIFICATION_OPERATION_JOURNAL')).toBe(false);
    expect(harness.properties.get('EE_NOTIFICATION_RECOVERY_MANUAL_REQUIRED')).toBe('1');
  });

  it('rejects same-token actor and target drift before Mail, then permits only the exact reviewed scope', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const reviewed = reviewNotification(harness).review;

    expect(harness.invoke('sendPortalNotification', {
      teacherId: 't1',
      target: 'evaluator',
      reviewToken: reviewed.token,
      acknowledged: true,
    })).toMatchObject({ ok: false, code: 'review_required', preDispatch: true });
    harness.setActiveEmail(ADMIN);
    expect(harness.invoke('sendPortalNotification', {
      teacherId: 't1',
      target: 'teacher',
      reviewToken: reviewed.token,
      acknowledged: true,
    })).toMatchObject({ ok: false, code: 'review_required', preDispatch: true });
    expect(harness.sentMail).toHaveLength(0);
    expect(notificationAuditRows(harness)).toHaveLength(0);

    harness.setActiveEmail(EVALUATOR);
    expect(performNotification(harness, reviewed)).toMatchObject({
      ok: true,
      sent: true,
      status: 'completed',
    });
    expect(harness.sentMail).toHaveLength(1);
  });

  it('classifies an ambiguous send lock as delivery unknown, never as a pre-dispatch retry signal', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const reviewed = reviewNotification(harness).review;
    harness.setLockAvailable(false);

    const response = performNotification(harness, reviewed);
    expect(response).toMatchObject({
      ok: true,
      status: 'delivery_unknown',
      sent: null,
      deliveryUnknown: true,
      idempotent: true,
    });
    expect(response).not.toHaveProperty('preDispatch');
    expect(harness.sentMail).toHaveLength(0);
    expect(notificationAuditRows(harness)).toHaveLength(0);
  });
});
