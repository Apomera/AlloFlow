import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  repositoryFixture, ADMIN, EVALUATOR, TEACHER_ONE,
} from './helpers/educator_evaluation_gs_harness.js';

describe('educator evaluation district operations center', () => {
  it('returns the authorized directory only to an administrator', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    expect(harness.invokeError('getPortalAdminOperations').code).toBe('denied');
    harness.setActiveEmail(ADMIN);
    const result = harness.invoke('getPortalAdminOperations');
    expect(result.directory.educators.length).toBeGreaterThan(2);
    expect(result.directory.members.some(member => member.email === TEACHER_ONE)).toBe(true);
    expect(result.directory.assignments.some(item => item.teacherId === 't1')).toBe(true);
  });

  it('reviews, confirms, and audits member changes without trusting a browser actor', () => {
    const harness = repositoryFixture();
    const reviewed = harness.invoke('reviewPortalDirectoryChange', {
      kind: 'member',
      candidate: { email: 'new.teacher@district.example', displayName: 'New Teacher', role: 'teacher', teacherId: 'peer-01', active: true },
    }).review;
    expect(reviewed).toMatchObject({ kind: 'member', action: 'create' });
    expect(harness.invokeError('performPortalDirectoryChange', { reviewToken: reviewed.token }).code).toBe('acknowledgment_required');
    const result = harness.invoke('performPortalDirectoryChange', { reviewToken: reviewed.token, acknowledgeImpact: true });
    expect(result.directory.members).toContainEqual(expect.objectContaining({ email: 'new.teacher@district.example', teacherId: 'peer-01', active: true }));
    expect(harness.rows('Audit').some(row => row[2] === 'MEMBER_UPDATED')).toBe(true);
  });

  it('invalidates a directory review after a concurrent membership change', () => {
    const harness = repositoryFixture();
    const reviewed = harness.invoke('reviewPortalDirectoryChange', {
      kind: 'assignment', candidate: { teacherId: 't1', evaluatorEmail: EVALUATOR, active: false },
    }).review;
    const concurrent = harness.invoke('reviewPortalDirectoryChange', {
      kind: 'member',
      candidate: { email: 'new.evaluator@district.example', displayName: 'New Evaluator', role: 'evaluator', active: true },
    }).review;
    harness.invoke('performPortalDirectoryChange', {
      reviewToken: concurrent.token, acknowledgeImpact: true,
    });
    expect(harness.invokeError('performPortalDirectoryChange', { reviewToken: reviewed.token, acknowledgeImpact: true }).code).toBe('review_stale');
  });

  it('keeps one active managed account per educator record', () => {
    const harness = repositoryFixture();
    const error = harness.invokeError('reviewPortalDirectoryChange', {
      kind: 'member',
      candidate: { email: 'duplicate.teacher@district.example', displayName: 'Duplicate Teacher', role: 'teacher', teacherId: 't1', active: true },
    });
    expect(error.code).toBe('bad_member');
    expect(error.message).toMatch(/already linked/i);
  });

  it('previews and applies a bulk due-date schedule while skipping finalized cycles', () => {
    const harness = repositoryFixture();
    const reviewed = harness.invoke('reviewPortalCycleSchedule', { dueDate: '2027-06-15', applyTo: 'all_open', building: 'Main Building' }).review;
    expect(reviewed.affectedEducators).toBeGreaterThan(0);
    expect(reviewed.sample.length).toBeGreaterThan(0);
    const result = harness.invoke('performPortalCycleSchedule', { reviewToken: reviewed.token, acknowledgeImpact: true });
    expect(result).toMatchObject({ ok: true, status: 'completed', dueDate: '2027-06-15', recoveryPending: false });
    const boot = harness.invoke('bootstrap');
    boot.workspace.teachers.filter(teacher => !teacher.finalizedAt).forEach(teacher => expect(teacher.dueDate).toBe('2027-06-15'));
    expect(harness.rows('Audit').some(row => row[2] === 'CYCLE_SCHEDULE_UPDATED')).toBe(true);
  });

  it('requires a server review before changing district configuration and audits the confirmed values', () => {
    const harness = repositoryFixture();
    const before = harness.invoke('bootstrap');
    const bypass = structuredClone(before.workspace);
    bypass.config.organization = 'Unreviewed District';
    expect(harness.invokeError('saveWorkspace', { expectedVersion: before.revision, workspace: bypass, mutation: { event: 'CONFIG_UPDATED' } }).code).toBe('review_required');

    const candidate = { ...before.workspace.config, organization: 'Reviewed District', frameworkProfile: 'pa_act13', pepgPracticeWeight: null, aiReflectionEnabled: true };
    const reviewed = harness.invoke('reviewPortalWorkspaceConfiguration', { config: candidate }).review;
    expect(reviewed.changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'organization', current: 'Sample School District', candidate: 'Reviewed District' }),
      expect.objectContaining({ field: 'frameworkProfile' }),
      expect.objectContaining({ field: 'aiReflectionEnabled', current: 'Off', candidate: 'Allowed' }),
    ]));
    expect(reviewed.impacts).toMatchObject({ activeEducators: expect.any(Number), openCycles: expect.any(Number), frameworkOrWeightChange: true, finalizedRecordsRetainSnapshots: true });
    expect(harness.invokeError('performPortalWorkspaceConfiguration', { reviewToken: reviewed.token }).code).toBe('acknowledgment_required');
    const result = harness.invoke('performPortalWorkspaceConfiguration', { reviewToken: reviewed.token, acknowledgeImpact: true });
    expect(result).toMatchObject({ ok: true, status: 'completed', recoveryPending: false });
    const after = harness.invoke('bootstrap');
    expect(after.workspace.config).toMatchObject({ organization: 'Reviewed District', frameworkProfile: 'pa_act13', frameworkVersion: 'pa-act13-classroom-2021', pepgPracticeWeight: null, aiReflectionEnabled: true });
    expect(after.workspace.audit).toContainEqual(expect.objectContaining({ event: 'CONFIGURATION_UPDATED', entityType: 'workspace_configuration', entityId: 'configuration' }));
    expect(harness.rows('Audit').some(row => row[2] === 'CONFIGURATION_UPDATED')).toBe(true);
    expect(harness.invokeError('performPortalWorkspaceConfiguration', { reviewToken: reviewed.token, acknowledgeImpact: true }).code).toBe('review_required');
  });

  it('limits configuration review to administrators and invalidates it after another workspace commit', () => {
    const harness = repositoryFixture();
    const boot = harness.invoke('bootstrap');
    harness.setActiveEmail(EVALUATOR);
    expect(harness.invokeError('reviewPortalWorkspaceConfiguration', { config: { ...boot.workspace.config, organization: 'Denied' } }).code).toBe('denied');
    harness.setActiveEmail(ADMIN);
    const reviewed = harness.invoke('reviewPortalWorkspaceConfiguration', { config: { ...boot.workspace.config, organization: 'Stale proposal' } }).review;
    const schedule = harness.invoke('reviewPortalCycleSchedule', { dueDate: '2027-06-20', applyTo: 'all_open' }).review;
    harness.invoke('performPortalCycleSchedule', { reviewToken: schedule.token, acknowledgeImpact: true });
    expect(harness.invokeError('performPortalWorkspaceConfiguration', { reviewToken: reviewed.token, acknowledgeImpact: true }).code).toBe('review_stale');
  });

  it('creates a verified private, purpose-bound district export and audit event', () => {
    const harness = repositoryFixture();
    const reviewed = harness.invoke('reviewPortalDistrictExport', { scope: 'educator_record', teacherId: 't1', purpose: 'Reviewed annual HR handoff' }).review;
    expect(reviewed).toMatchObject({ scope: 'educator_record', teacherId: 't1', educatorName: 'Teacher One' });
    expect(harness.invokeError('performPortalDistrictExport', { reviewToken: reviewed.token }).code).toBe('acknowledgment_required');
    const result = harness.invoke('performPortalDistrictExport', { reviewToken: reviewed.token, acknowledgePolicy: true });
    const file = harness.driveFiles.get(result.export.id);
    expect(file.sharingAccess).toBe('PRIVATE');
    const envelope = JSON.parse(file.content);
    expect(envelope).toMatchObject({ kind: 'alloflow-educator-evaluation-authorized-export', scope: 'educator_record', purpose: 'Reviewed annual HR handoff', sourceRevision: expect.any(Number) });
    expect(envelope.payload.teacher.id).toBe('t1');
    expect(JSON.stringify(envelope.payload)).not.toContain('Teacher Two');
    expect(harness.rows('Audit').some(row => row[2] === 'DISTRICT_EXPORT_CREATED' && row[5] === result.export.id)).toBe(true);
  });

  it('lists verified annual archives and creates a private restore rehearsal without changing live state', () => {
    const harness = repositoryFixture();
    const rolloverReview = harness.invoke('reviewPortalAnnualRollover', { nextAcademicYear: '2027-28' }).review;
    harness.invoke('performPortalAnnualRollover', { reviewToken: rolloverReview.token, acknowledgeArchive: true, acknowledgeOpenCycles: true });
    const before = harness.invoke('bootstrap');
    const archives = harness.invoke('getPortalAnnualArchives').archives;
    expect(archives).toHaveLength(1);
    expect(archives[0]).toMatchObject({ verified: true, fromAcademicYear: '2026-27', plannedNextAcademicYear: '2027-28' });
    const review = harness.invoke('reviewPortalArchiveRestoreRehearsal', { archiveId: archives[0].id }).review;
    expect(review).toMatchObject({ activeAcademicYear: '2027-28', liveWorkspaceWillChange: false });
    const result = harness.invoke('performPortalArchiveRestoreRehearsal', { reviewToken: review.token, acknowledgeNoLiveRestore: true });
    expect(result.liveWorkspaceChanged).toBe(false);
    expect(harness.driveFiles.get(result.candidate.id).sharingAccess).toBe('PRIVATE');
    const after = harness.invoke('bootstrap');
    expect(after.revision).toBe(before.revision);
    expect(after.workspace.config.academicYear).toBe('2027-28');
    expect(harness.rows('Audit').some(row => row[2] === 'RESTORE_REHEARSAL_CREATED')).toBe(true);
  });

  it('refuses a valid archive-shaped file outside the repository archive folder', () => {
    const harness = repositoryFixture();
    const rolloverReview = harness.invoke('reviewPortalAnnualRollover', { nextAcademicYear: '2027-28' }).review;
    harness.invoke('performPortalAnnualRollover', { reviewToken: rolloverReview.token, acknowledgeArchive: true, acknowledgeOpenCycles: true });
    const archive = harness.invoke('getPortalAnnualArchives').archives[0];
    harness.driveFiles.get(archive.id).parentFolderId = harness.properties.get('EE_FOLDER_ID');
    expect(harness.invokeError('reviewPortalArchiveRestoreRehearsal', { archiveId: archive.id }).code).toBe('not_found');
  });

  it('requires reviewed notice delivery and locks its exact outcome through recovery checks', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'educator_evaluation_source.jsx'), 'utf8');
    expect(source).toContain("typeof repository.reviewNotification !== 'function'");
    expect(source).toContain('const prior = await repository.getNotificationOutcome({ teacherId: teacher.id, target });');
    expect(source).toContain("!['not_started', 'no_unresolved'].includes(String(prior.status).toLowerCase())");
    expect(source).toContain('const repeatApproved = repeatPriorNotice === true');
    expect(source).toContain('if (!repeatApproved) {');
    expect(source).toContain('repeatEligible: !!(result && result.repeatEligible)');
    expect(source).toContain("'Prepare another reviewed notice'");
    expect(source).toContain("beginNotificationReview('', true)");
    expect(source).toContain("beginNotificationReview(notificationState.recipient, notificationState.repeatPrior === true)");
    expect(source).toContain("result.status === 'recipient_selection_required'");
    expect(source).toContain("status: 'selecting_recipient'");
    expect(source).toContain('!review.token || !review.portalUrl');
    expect(source).toContain('const lookup = { teacherId: notificationState.teacherId, target: notificationState.target, reviewToken:');
    expect(source).toContain('repository.sendNotification({ teacherId: lookup.teacherId, target: lookup.target, reviewToken: lookup.reviewToken, acknowledged: true })');
    expect(source).toContain('if (result && result.preDispatch === true) responseError.preDispatch = true;');
    expect(source).toContain("if (error && error.preDispatch === true)");
    expect(source).toContain('scopedOutcome = await repository.getNotificationOutcome({ teacherId: lookup.teacherId, target: lookup.target });');
    expect(source).toContain("!['not_started', 'no_unresolved'].includes(String(scopedOutcome.status).toLowerCase())");
    expect(source).toContain("recordNotificationOutcome({ teacherId: lookup.teacherId, target: lookup.target, reviewToken: '' }, scopedOutcome)");
    expect(source).toContain('This send was refused before dispatch, but the portal could not verify whether an earlier notice for this educator and target is unresolved.');
    expect(source).toContain('Nothing was sent; you may prepare a fresh review.');
    expect(source).toContain("if (status === 'not_started')");
    expect(source).toContain("if (!['completed', 'recovery_pending', 'delivery_unknown'].includes(status)) status = 'delivery_unknown'");
    expect(source).toContain("setNotificationReceipts((current) => Object.assign({}, current, { [key]: receipt }))");
    expect(source).toContain('audit recovery is pending. Do not resend this notice');
    expect(source).toContain('The exact delivery outcome is still unknown. Do not resend this notice; check the exact notice outcome.');
    expect(source).toContain('The notice response was lost. Do not resend this notice. Check the exact notice outcome before taking any other action.');
    expect(source).toContain('const outcomeRequest = { teacherId: receipt.teacherId, target: receipt.target };');
    expect(source).toContain('if (receipt.reviewToken) outcomeRequest.reviewToken = receipt.reviewToken;');
    expect(source).toContain('repository.getNotificationOutcome(outcomeRequest)');
    expect(source).toContain("'Exact notice receipt'");
    expect(source).toContain("notificationReceipt.status !== 'completed'");
    expect(source).toContain("'Check exact notice outcome'");
    expect(source).toContain('disabled={!selectedTeacher || notificationBusy || notificationActionsDisabled || !!notificationReceipt}');
  });

  it('maps the integrity-review envelope and treats historical Message/Audit extras as informational', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'educator_evaluation_source.jsx'), 'utf8');
    expect(source).toContain('const review = Object.assign({}, response, ticket)');
    expect(source).toContain("const counts = review.counts && typeof review.counts === 'object'");
    expect(source).toContain("const samples = review.samples && typeof review.samples === 'object'");
    expect(source).toContain("const parity = review.parity && typeof review.parity === 'object'");
    expect(source).toContain('Array.isArray(review.issueSamples)');
    expect(source).toContain('Array.isArray(review.effects)');
    expect(source).toContain('suppliedEffects.length ? suppliedEffects : fallbackEffects');
    expect(source).toContain('counts.totalRepairable');
    expect(source).toContain('counts.totalAmbiguous');
    expect(source).toContain('secondaryDuplicateMessageIdCount');
    expect(source).toContain('secondaryDuplicateAuditIdCount');
    expect(source).toContain('secondaryDuplicateSnapshotIdCount');
    expect(source).toContain('ledgerOnlySnapshots: aeSetupHealthCount(checks.secondaryLedgerOnlySnapshotCount)');
    expect(source).toContain('historicalLedgerOnly: aeSetupHealthCount(checks.secondaryLedgerOnlyMessageCount)');
    expect(source).toContain('parityCounts.duplicate + parityCounts.ledgerOnlySnapshots + parityCounts.ambiguous');
    expect(source).toContain('historical Message/Audit extra (informational)');
    expect(source).toContain("projection match') + (parityCounts.historicalLedgerOnly");
    expect(source).toContain('!(checks.secondaryManualReviewRequired || checks.secondaryInspectionUnavailable || checks.secondaryReconciliationRequired || parityIssueTotal > 0)');
    expect(source).toContain('health.recoveryQueues');
    expect(source).toContain('health.emailQuota');
    expect(source).toContain('ref={headingRef} tabIndex={-1}');
  });

  it('wires the operations-center UX and all authenticated portal adapters', () => {
    const root = process.cwd();
    const source = fs.readFileSync(path.join(root, 'educator_evaluation_source.jsx'), 'utf8');
    const builder = fs.readFileSync(path.join(root, '_build_educator_evaluation_apps_script.js'), 'utf8');
    expect(source).toContain('function AeDistrictOperations');
    expect(source).toContain('District operations center');
    expect(source).toContain('Review member change');
    expect(source).toContain('Review schedule impact');
    expect(source).toContain('Create verified private export');
    expect(source).toContain('Load and verify annual archives');
    expect(source).toContain('function AeSetupObservability');
    expect(source).toContain('function AeIntegrityRepairReview');
    expect(source).toContain('function AeReleasedAccessRecoveryReview');
    expect(source).toContain('Review ledger repair');
    expect(source).toContain('Confirm reviewed repair');
    expect(source).toContain('repository.reviewWorkspaceIntegrity()');
    expect(source).toContain('reviewToken: review.token, acknowledgeRepair: true');
    expect(source).toContain('disabled={!repairable || !acknowledged || busy}');
    expect(source).toContain('Automatic ledger repair is unavailable.');
    expect(source).toContain('secondaryMismatchedMessageCount');
    expect(source).toContain('secondaryDuplicateAuditIdCount');
    expect(source).toContain('secondaryLedgerOnlySnapshotCount');
    expect(source).toContain('auditChainVerifiedRows');
    expect(source).toContain('pendingRecoveryTotal');
    expect(source).toContain('oldestRecoveryAgeHours');
    expect(source).toContain('emailQuotaRemaining');
    expect(source).toContain('releaseQueueCount');
    expect(source).toContain('repository.reviewReleasedAccessRecovery({})');
    expect(source).toContain('reviewToken: review.token, acknowledgeAccessPolicy: true');
    expect(source).toContain('disabled={manualReviewRequired || !acknowledged || busy}');
    expect(source).toContain('Released-summary access recovery review');
    expect(source).toContain('exportState.review.authorizedExportsAcl');
    expect(source).toContain('!exportAclReview || !aeValidAuthorizedExportsAclReview(exportAclReview)');
    expect(source).toContain("disabled={!exportAck || exportAclBlocked || exportState.status === 'performing'}");
    expect(source).toContain('Authorized Exports access review');
    expect(source).toContain('Existing files');
    expect(source).toContain('Drifted files');
    expect(source).toContain('Explicit access grants');
    expect(source).toContain('Folder drift');
    expect(builder).toContain("reviewWorkspaceIntegrity: () => callPortalAdminRpc('reviewPortalWorkspaceIntegrity')");
    expect(builder).toContain("reconcileWorkspaceIntegrity: (request) => callPortalAdminRpc('reconcilePortalWorkspaceIntegrity', request)");
    expect(builder).toContain("reviewReleasedAccessRecovery: (request) => callPortalAdminRpc('reviewPortalReleasedEvaluationAccessRecovery', request)");
    expect(builder).toContain("reconcileReleasedAccess: (request) => callPortalAdminRpc('reconcilePortalReleasedEvaluationAccess', request)");
    for (const method of ['reviewPortalWorkspaceIntegrity', 'reconcilePortalWorkspaceIntegrity', 'reviewPortalReleasedEvaluationAccessRecovery', 'reconcilePortalReleasedEvaluationAccess', 'getPortalAdminOperations', 'reviewPortalDirectoryChange', 'performPortalDirectoryChange', 'reviewPortalCycleSchedule', 'performPortalCycleSchedule', 'reviewPortalWorkspaceConfiguration', 'performPortalWorkspaceConfiguration', 'reviewPortalDistrictExport', 'performPortalDistrictExport', 'getPortalAnnualArchives', 'reviewPortalArchiveRestoreRehearsal', 'performPortalArchiveRestoreRehearsal']) {
      expect(builder).toContain(`'${method}'`);
    }
  });

  it('keeps direct directory mutators private and exposes only the reviewed RPC workflow', () => {
    const root = process.cwd();
    const server = fs.readFileSync(path.join(root, 'apps_script', 'educator_evaluation', 'Code.gs'), 'utf8');
    const builder = fs.readFileSync(path.join(root, '_build_educator_evaluation_apps_script.js'), 'utf8');
    expect(server).not.toMatch(/^function adminUpsertMember\s*\(/m);
    expect(server).not.toMatch(/^function adminUpsertAssignment\s*\(/m);
    expect(server).toMatch(/^function upsertMemberRow_\s*\(/m);
    expect(server).toMatch(/^function upsertAssignmentRow_\s*\(/m);
    expect(server).toMatch(/function performPortalDirectoryChange\([\s\S]*?upsertMemberRow_\(/);
    expect(server).toMatch(/function performPortalDirectoryChange\([\s\S]*?upsertAssignmentRow_\(/);
    expect(builder).toContain("reviewDirectoryChange: (request) => callPortalAdminRpc('reviewPortalDirectoryChange', request)");
    expect(builder).toContain("performDirectoryChange: (request) => callPortalAdminRpc('performPortalDirectoryChange', request)");
    expect(builder).not.toContain('adminUpsertMember');
    expect(builder).not.toContain('adminUpsertAssignment');
  });
});
