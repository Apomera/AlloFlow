import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let M;

beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('dynamic_assessment_module.js');
  M = window.AlloModules.DynamicAssessment._meta;
});

function result(itemId, phase, correct, level, attemptedAt) {
  return {
    itemId,
    phase,
    finalCorrect: !!correct,
    promptLevelReached: level || 0,
    scoreAwarded: correct ? 5 - (level || 0) : 0,
    supportType: level ? 'cue' : 'none',
    accessReadAloudHelped: false,
    accessSimplifiedHelped: false,
    accessL1Helped: false,
    observationTags: [],
    studentResponseText: 'PRIVATE RESPONSE MUST NOT TRANSFER',
    examinerObservation: 'PRIVATE NOTE MUST NOT TRANSFER',
    attemptedAt: attemptedAt || '2026-07-31T12:05:00.000Z'
  };
}

function session(id, date, itemId = 'math-e-01') {
  return {
    id,
    studentNickname: 'Ada Learner',
    domain: 'math',
    difficulty: 'easy',
    mode: 'clinician',
    dateStarted: date + 'T12:00:00.000Z',
    dateCompleted: date + 'T12:15:00.000Z',
    sessionItemIds: [itemId],
    itemResults: [
      result(itemId, 'pretest', false, 0, date + 'T12:03:00.000Z'),
      result(itemId, 'mediation', true, 2, date + 'T12:07:00.000Z'),
      result(itemId, 'posttest', true, 0, date + 'T12:12:00.000Z')
    ]
  };
}

describe('Dynamic Assessment → AlloSheet handoff', () => {
  it('builds bounded coded tables without raw responses or examiner notes', () => {
    const artifact = M.buildDynamicAssessmentAlloSheetEnvelope({
      studentIdentifier: 'Ada Learner',
      sessions: [session('da-1', '2026-07-31')]
    }, {
      mode: 'detailed',
      includeStudentIdentifier: false,
      createdAt: '2026-08-01T12:00:00.000Z'
    });

    expect(artifact.kind).toBe('alloflow.tabular.v1');
    expect(artifact.source.tool).toBe('dynamic-assessment');
    expect(artifact.privacy.transferEnablesAI).toBe(false);
    expect(artifact.capabilities).toEqual({ writeBack: false, aiEnabled: false });
    expect(artifact.classification.identifierIncluded).toBe(false);
    expect(artifact.tables.map((table) => table.id)).toEqual([
      'da-session-summary', 'da-probe-results', 'da-progress-summary'
    ]);
    const probe = artifact.tables.find((table) => table.id === 'da-probe-results');
    expect(probe.rows[0].values.learner_code).toBe('learner-1');
    expect(probe.rows[0].values.construct).toBe('Subtraction word problem');
    expect(JSON.stringify(artifact)).not.toContain('PRIVATE RESPONSE MUST NOT TRANSFER');
    expect(JSON.stringify(artifact)).not.toContain('PRIVATE NOTE MUST NOT TRANSFER');
    expect(JSON.stringify(artifact)).not.toContain('Ada Learner');
  });

  it('requires explicit identifier opt-in and records provenance exclusions', () => {
    const artifact = M.buildDynamicAssessmentAlloSheetEnvelope({
      studentIdentifier: 'Ada Learner', sessions: [session('da-2', '2026-07-31')]
    }, { mode: 'summary', includeStudentIdentifier: true, createdAt: '2026-08-01T12:00:00.000Z' });
    expect(artifact.classification.identifierIncluded).toBe(true);
    expect(artifact.tables[0].columns.some((column) => column.key === 'student_identifier')).toBe(true);
    expect(artifact.provenance.excludedFields).toContain('studentResponseText');
    expect(artifact.provenance.excludedFields).toContain('examinerObservation');
  });

  it('suppresses derived progress rates until five sessions are available', () => {
    const artifact = M.buildDynamicAssessmentAlloSheetEnvelope({
      sessions: [session('da-1', '2026-07-27'), session('da-2', '2026-07-28')]
    }, { mode: 'summary', createdAt: '2026-08-01T12:00:00.000Z' });
    const progress = artifact.tables.find((table) => table.id === 'da-progress-summary');
    expect(progress.rows[0].values.session_count).toBe(2);
    expect(progress.rows[0].values.pretest_pass_rate).toBeNull();
    expect(progress.rows[0].values.modifiability_sensitivity).toBeNull();
    expect(progress.rows[0].values.privacy_status).toContain('suppressed');
    expect(artifact.provenance.suppression.minimumAggregateSessions).toBe(5);
  });

  it('applies the date filter without inferring missing work', () => {
    const artifact = M.buildDynamicAssessmentAlloSheetEnvelope({
      sessions: [session('recent', '2026-07-31'), session('old', '2026-06-01')]
    }, { mode: 'summary', dateRange: '7d', createdAt: '2026-08-01T12:00:00.000Z' });
    const summary = artifact.tables.find((table) => table.id === 'da-session-summary');
    expect(summary.sourceRowCount).toBe(1);
    expect(summary.rows).toHaveLength(1);
    expect(artifact.provenance.suppression.missingWorkInferred).toBe(false);
  });
});
