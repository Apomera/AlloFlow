import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let rosterIdentity;
let inboxMeta;
let pipeline;

beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('teacher_module.js');
  loadAlloModule('doc_pipeline_module.js');
  loadAlloModule('allo_sheet/transfer_adapter.js');
  loadAlloModule('view_submission_inbox_module.js');
  rosterIdentity = window.AlloModules.RosterIdentityInternals;
  inboxMeta = window.AlloModules.SubmissionInbox._meta;
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
    addToast: () => {}, t: key => key, isRtlLang: () => false,
    updateExportPreview: () => {}, getDefaultTitle: () => 'Document', state: {},
  });
});

describe('Submission Inbox identity foundation', () => {
  it('migrates legacy rosters once, preserves the class ID through key rotation, and assigns opaque learner IDs', () => {
    const legacy = {
      className: 'Class A',
      groups: {},
      students: { 'Calm Otter': '', 'Bright Fox': '' },
      submissionKey: { classId: 'legacy-class-id', publicJwk: { kty: 'RSA' } },
    };
    const migrated = rosterIdentity.ensureRosterIdentity(legacy);
    expect(migrated.classId).toBe('legacy-class-id');
    expect(migrated.learnerIds['Calm Otter']).toMatch(/^LRN-/);
    expect(migrated.learnerIds['Bright Fox']).toMatch(/^LRN-/);
    expect(migrated.learnerIds['Calm Otter']).not.toBe(migrated.learnerIds['Bright Fox']);
    expect(rosterIdentity.ensureRosterIdentity(migrated)).toBe(migrated);

    const rotated = rosterIdentity.ensureRosterIdentity({
      ...migrated,
      submissionKey: { classId: 'replacement-key-class-id', publicJwk: { kty: 'RSA' } },
    });
    expect(rotated.classId).toBe('legacy-class-id');
  });

  it('prunes removed learners and gives a re-added codename a fresh identity', () => {
    const first = rosterIdentity.ensureRosterIdentity({ groups: {}, students: { 'Calm Otter': '' } });
    const priorId = first.learnerIds['Calm Otter'];
    const removed = rosterIdentity.ensureRosterIdentity({ ...first, students: {} });
    expect(removed.learnerIds).toEqual({});
    const readded = rosterIdentity.ensureRosterIdentity({ ...removed, students: { 'Calm Otter': '' } });
    expect(readded.learnerIds['Calm Otter']).toMatch(/^LRN-/);
    expect(readded.learnerIds['Calm Otter']).not.toBe(priorId);
  });

  it('embeds the same bounded opaque identity in encrypted and plain-JSON student exports', () => {
    const history = [{ type: 'simplified', id: 'resource-1', title: 'Reading', data: 'Text' }];
    const config = { classId: 'CLS-test-123', assignmentId: 'ASG-test-456' };
    const plainHtml = pipeline.generateFullPackHTML(history, 'Identity test', false, {}, config);
    const plainDom = new JSDOM(plainHtml);
    const plainIdentity = JSON.parse(plainDom.window.document.getElementById('alloflow-submission-identity').textContent);
    expect(plainIdentity).toEqual(config);
    expect(plainHtml).toContain("kind: 'alloflow-student-submission'");
    expect(plainHtml).toContain('assignmentId: identity.assignmentId');

    const encryptedHtml = pipeline.generateFullPackHTML(history, 'Identity test', false, {}, {
      ...config,
      classPublicJwk: { kty: 'RSA', n: 'test', e: 'AQAB' },
    });
    const encryptedDom = new JSDOM(encryptedHtml);
    const encryptedIdentity = JSON.parse(encryptedDom.window.document.getElementById('alloflow-submission-identity').textContent);
    expect(encryptedIdentity).toEqual(config);
    expect(encryptedHtml).toContain('schemaVersion: 2');
    expect(encryptedHtml).toContain('assignmentId: identity.assignmentId');
    expect(encryptedHtml).not.toContain('LRN-');
  });

  it('carries validated due metadata and reports late status without inferring missing work', () => {
    const dueAt = '2026-09-01T14:00:00.000Z';
    const config = { classId: 'CLS-due-123', assignmentId: 'ASG-due-456', dueAt, dueTimeZone: 'America/New_York' };
    const html = pipeline.generateFullPackHTML([{ type: 'simplified', id: 'resource-due', title: 'Due test', data: 'Text' }], 'Due test', false, {}, config);
    const identity = JSON.parse(new JSDOM(html).window.document.getElementById('alloflow-submission-identity').textContent);
    expect(identity.dueDate).toEqual({ schemaVersion: 1, dueAt, timeZone: 'America/New_York', source: 'teacher-export' });
    expect(inboxMeta.parseDueAt(dueAt)).toBe(Date.parse(dueAt));
    expect(inboxMeta.parseDueAt('2026-09-01T14:00')).toBeNull();
    expect(inboxMeta.deriveLateStatus(Date.parse(dueAt), Date.parse(dueAt))).toBe('on_time');
    expect(inboxMeta.deriveLateStatus(Date.parse(dueAt) + 1, Date.parse(dueAt))).toBe('late');
    expect(inboxMeta.deriveLateStatus(Date.parse(dueAt), null)).toBe('unknown_due_date');

    const source = {
      kind: 'submission-inbox-allosheet-source-v1', sourceEntryCount: 5,
      entries: Array.from({ length: 5 }, (_, i) => ({
        assignmentKey: 'S1', assignmentLabel: 'Assignment', learnerToken: 'L' + (i + 1),
        submittedTime: Date.parse(dueAt) + (i === 0 ? 1 : 0), gradedTime: Date.parse('2026-08-20T12:00:00Z'),
        dueAtTime: Date.parse(dueAt), gradeResults: [], stableAssignmentIdentity: true, stableLearnerIdentity: true,
        reviewState: 'reviewed'
      }))
    };
    const artifact = inboxMeta.buildAlloSheetEnvelope(source, { createdAt: '2026-08-21T00:00:00Z', dateRange: 'all', assignmentKeys: ['S1'], datasets: { submissionSummary: true, scoreSummary: false } });
    const row = artifact.tables.find(table => table.id === 'saved_submission_summary').rows[0].values;
    expect(row.due_date_status).toBe('suppressed_small_groups');
    expect(row.late_submission_count).toBeNull();
    expect(artifact.provenance.dueDateSemantics.missingWorkSupport).toBe(false);
  });
  it('makes review attestation revision-sensitive and treats legacy states as unreviewed', () => {
    const grades = {
      q2: { score: 70, status: 'partial', feedback: 'Needs evidence', origin: 'ai' },
      q1: { score: 90, status: 'correct', feedback: 'Clear', origin: 'teacher-anchor' },
    };
    const signature = inboxMeta.gradeReviewSignature(grades);
    expect(signature).toBe(inboxMeta.gradeReviewSignature({ q1: grades.q1, q2: grades.q2 }));
    expect(inboxMeta.gradeReviewSignature({ ...grades, q2: { ...grades.q2, score: 71 } })).not.toBe(signature);
    expect(inboxMeta.normalizeSavedReviewState('reviewed')).toBe('reviewed');
    expect(inboxMeta.normalizeSavedReviewState('pending')).toBe('not_reviewed');
    expect(inboxMeta.normalizeSavedReviewState(undefined)).toBe('not_reviewed');
  });

  it('keeps the main app and teacher key lifecycle wired to stable identities', () => {
    const app = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
    const teacher = readFileSync(resolve(process.cwd(), 'teacher_source.jsx'), 'utf8');
    expect(app).toContain('alloNormalizeRosterIdentity(parsed)');
    expect(app).toContain('assignmentId: offlineAssignmentId');
    expect(app).toContain('return alloStableAssignmentId(history');
    expect(teacher).toContain('const classId = normalizedRoster.classId');
    expect(teacher).toContain("const keyId = alloTeacherStableId('KEY')");
    expect(teacher).toContain('exportVersion: 3');
    expect(teacher).toContain('learnerIds: asRecord(data.learnerIds)');
  });
});
