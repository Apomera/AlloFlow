import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE = readFileSync(resolve(process.cwd(), 'educator_evaluation_source.jsx'), 'utf8');

function component(name, nextName) {
  const start = SOURCE.indexOf('function ' + name);
  const end = nextName ? SOURCE.indexOf('function ' + nextName, start + 1) : SOURCE.length;
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return SOURCE.slice(start, end);
}

describe('finalized-cycle client closure', () => {
  it('makes the shared comment composer read-only for every finalized educator record', () => {
    const thread = component('AeThread', 'AeFrameworkReference');
    expect(SOURCE).toContain("function aeCycleFinalized(teacher)");
    expect(thread).toContain('const cycleFinalized = aeCycleFinalized(teacher);');
    expect(thread).toContain('const commentsReadOnly = readOnlyPreview || cycleFinalized;');
    expect(thread).toContain('if (!commentText || commentsReadOnly) return;');
    expect(thread).toContain('readOnly={commentsReadOnly}');
    expect(thread).toContain('disabled={commentsReadOnly || !text.trim()}');
    expect(thread).toContain('Comments are closed for this finalized cycle.');
  });

  it('blocks new walkthrough, formal-observation, and SPM records for finalized cycles', () => {
    const walkthroughs = component('AeWalkthroughs', 'AeObservationStepper');
    const formals = component('AeFormalObservations', 'AeSpm');
    const spm = component('AeSpm', 'AeAuditExport');

    expect(walkthroughs).toContain("teacher.active !== false && !aeCycleFinalized(teacher)");
    expect(walkthroughs).toContain('disabled={!showForm && (cycleFinalized || (teachers.length === 0 && !canAddStaff))}');
    expect(walkthroughs).toContain("showForm && role === 'evaluator' && (!cycleFinalized || editingRecord)");
    expect(walkthroughs).toContain("!record.publishedAt && role === 'evaluator' && !aeCycleFinalized(teacher)");
    expect(walkthroughs).toContain('disabled={readOnlyPreview || aeCycleFinalized(teacher)}');
    expect(formals).toContain('disabled={!selectedTeacher || cycleFinalized || records.some');
    expect(formals).toContain('<fieldset disabled={cycleFinalized}');
    expect(spm).toContain("role === 'teacher' && selectedTeacher && !cycleFinalized");
    expect(spm).toContain('<fieldset disabled={cycleFinalized}');
    [walkthroughs, formals, spm].forEach((body) => {
      expect(body).toContain('<AeFinalizedCycleNotice teacher={selectedTeacher}/>');
    });
  });

  it('keeps client mutators closed even if a stale control invokes them', () => {
    const panel = component('EducatorEvaluationPanel', '');
    expect(panel).toContain('const isTeacherCycleClosed = (teacherId)');
    expect(panel).toContain("if (!target || target.active === false || aeCycleFinalized(target)) return '';");
    expect(panel.match(/if \(!target \|\| target.active === false \|\| aeCycleFinalized\(target\)\) return '';/g)).toHaveLength(3);
    expect(panel).toContain('record.teacherAcknowledgedAt || isTeacherCycleClosed(record.teacherId)');
    expect(panel).toContain("record.finalizedAt || isTeacherCycleClosed(record.teacherId)");
    expect(panel).toContain("record.status === 'locked' || isTeacherCycleClosed(record.teacherId)");
    expect(panel).toContain('if (isTeacherCycleClosed(teacherId)) return false;');
  });
});
