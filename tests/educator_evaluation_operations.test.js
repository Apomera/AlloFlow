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
    harness.invoke('adminUpsertMember', { email: 'new.evaluator@district.example', displayName: 'New Evaluator', role: 'evaluator', active: true });
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
    for (const method of ['getPortalAdminOperations', 'reviewPortalDirectoryChange', 'performPortalDirectoryChange', 'reviewPortalCycleSchedule', 'performPortalCycleSchedule', 'reviewPortalDistrictExport', 'performPortalDistrictExport', 'getPortalAnnualArchives', 'reviewPortalArchiveRestoreRehearsal', 'performPortalArchiveRestoreRehearsal']) {
      expect(builder).toContain(`'${method}'`);
    }
  });
});
