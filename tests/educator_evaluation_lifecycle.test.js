import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  repositoryFixture, ADMIN, EVALUATOR,
} from './helpers/educator_evaluation_gs_harness.js';

describe('educator evaluation annual rollover lifecycle', () => {
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
    let review = harness.invoke('reviewPortalAnnualRollover', { nextAcademicYear: '2027-28' }).review;
    expect(harness.invokeError('performPortalAnnualRollover', { reviewToken: review.token }).code).toBe('acknowledgment_required');
    expect(harness.properties.get('EE_ANNUAL_ARCHIVES_FOLDER_ID')).toBeUndefined();

    review = harness.invoke('reviewPortalAnnualRollover', { nextAcademicYear: '2027-28' }).review;
    expect(harness.invokeError('performPortalAnnualRollover', {
      reviewToken: review.token,
      acknowledgeArchive: true,
      acknowledgeOpenCycles: false,
    }).code).toBe('acknowledgment_required');
    expect(harness.properties.get('EE_ANNUAL_ARCHIVES_FOLDER_ID')).toBeUndefined();
  });

  it('verifies a private archive before resetting active cycles while retaining roster and history', () => {
    const harness = repositoryFixture();
    const before = harness.invoke('bootstrap');
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

    const after = harness.invoke('bootstrap');
    expect(after.workspace.config.academicYear).toBe('2027-28');
    expect(after.workspace.teachers).toHaveLength(before.workspace.teachers.length);
    expect(after.workspace.walkthroughs).toEqual([]);
    expect(after.workspace.observations).toEqual([]);
    expect(after.workspace.spms).toEqual([]);
    expect(after.workspace.comments).toEqual([]);
    expect(after.workspace.cycleSnapshots).toEqual(before.workspace.cycleSnapshots);
    after.workspace.teachers.forEach(teacher => {
      expect(teacher).toMatchObject({ cycleStatus: 'not_started', dueDate: '', finalizedAt: null, releasedDoc: null, educatorStatement: null });
      expect(teacher.ratings).toEqual({ domains: { d1: null, d2: null, d3: null, d4: null }, building: null, teacher: null, lea: null });
    });
    const storedWorkspace = JSON.parse(harness.driveFiles.get(harness.properties.get('EE_WORKSPACE_FILE_ID')).content);
    expect(storedWorkspace.audit.some(entry => entry.event === 'ANNUAL_ROLLOVER' && entry.entityId === result.archive.id)).toBe(true);
    expect(harness.properties.get('EE_ROLLOVER_RECOVERY_REQUIRED')).toBeUndefined();
    expect(JSON.parse(harness.properties.get('EE_LAST_ROLLOVER'))).toMatchObject({ fromYear: '2026-27', toYear: '2027-28', archiveId: result.archive.id });
  });

  it('keeps an archive and blocks retry when active-state commit fails, then safely reconciles an unchanged workspace', () => {
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
    expect(harness.driveFiles.get(recovery.archiveId).sharingAccess).toBe('PRIVATE');
    expect(harness.invokeError('reviewPortalAnnualRollover', { nextAcademicYear: '2027-28' }).code).toBe('rollover_recovery_required');

    pending.setContent = originalSetContent;
    const reconciled = harness.invoke('reconcilePortalAnnualRollover');
    expect(reconciled).toMatchObject({ ok: true, status: 'archive_only', recoveryPending: false, activeAcademicYear: '2026-27' });
    expect(harness.properties.get('EE_ROLLOVER_RECOVERY_REQUIRED')).toBeUndefined();
    expect(harness.invoke('bootstrap').revision).toBe(before.revision);
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
