import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const createdAt = '2026-07-29T12:00:00.000Z';
let handoff;

function gradeMap(results, prefix = 'SECRET_RESPONSE_KEY_Z9') {
  return Object.fromEntries(results.map((result, index) => [
    `${prefix}_${String(index).padStart(3, '0')}`,
    {
      ...result,
      feedback: `SECRET_FEEDBACK_Z9_${index}`,
      rationale: `SECRET_RATIONALE_Z9_${index}`,
    },
  ]));
}

function savedEntry({
  assignment = 'SECRET_ASSIGNMENT_ALPHA_Z9',
  className = 'SECRET_CLASS_ORCHID_Z9',
  nickname = 'SECRET_LEARNER_Z9',
  submittedAt = '2026-07-20T10:00:00.000Z',
  gradedAt = '2026-07-20T12:00:00.000Z',
  results = [{ score: 90, status: 'correct' }],
  rubric = 'SECRET_RUBRIC_Z9',
  source = 'offline-html',
  extra = {},
} = {}) {
  return {
    nickname,
    docTitle: assignment,
    className,
    submittedAt,
    gradedAt,
    source,
    responses: {
      SECRET_RESPONSE_FIELD_Z9: 'SECRET_RAW_RESPONSE_Z9',
    },
    grades: gradeMap(results),
    rubric,
    storageKey: 'SECRET_STORAGE_KEY_Z9',
    filename: 'SECRET_FILENAME_Z9.alloflow',
    privateKey: 'SECRET_CRYPTO_KEY_Z9',
    workEvidence: {
      transcript: 'SECRET_WORK_EVIDENCE_Z9',
      notebook: 'SECRET_NOTEBOOK_Z9',
    },
    ...extra,
  };
}

function scoreFixture() {
  const alphaScores = [
    ...Array(5).fill({ score: 10, status: 'correct' }),
    ...Array(5).fill({ score: 50, status: 'partially-correct' }),
    ...Array(5).fill({ score: 75, status: 'incorrect' }),
    ...Array(5).fill({ score: 90, status: 'unclear' }),
  ];
  const alpha = alphaScores.map((result, index) => {
    const day = String(index + 1).padStart(2, '0');
    return savedEntry({
      assignment: 'SECRET_ASSIGNMENT_ALPHA_Z9',
      className: 'SECRET_CLASS_ORCHID_Z9',
      nickname: `SECRET_LEARNER_ALPHA_Z9_${index}`,
      submittedAt: `2026-07-${day}T10:00:00.000Z`,
      gradedAt: `2026-07-${day}T12:00:00.000Z`,
      results: [result],
      rubric: index % 2 === 0 ? `SECRET_RUBRIC_Z9_${index}` : '',
    });
  });
  const beta = Array.from({ length: 5 }, (_, index) => {
    const day = String(index + 21).padStart(2, '0');
    return savedEntry({
      assignment: 'SECRET_ASSIGNMENT_BETA_Z9',
      className: 'SECRET_CLASS_CEDAR_Z9',
      nickname: `SECRET_LEARNER_BETA_Z9_${index}`,
      submittedAt: `2026-07-${day}T10:00:00.000Z`,
      gradedAt: `2026-07-${day}T12:00:00.000Z`,
      results: [{ score: 100, status: 'correct' }],
      rubric: '',
    });
  });
  return [...beta, ...alpha];
}

function column(key, label, type) {
  return { key, label, type };
}

beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('allo_sheet/transfer_adapter.js');
  loadAlloModule('view_submission_inbox_module.js');
  handoff = window.AlloModules.SubmissionInbox?._meta;
  if (!handoff?.buildAlloSheetEnvelope) {
    throw new Error('Submission Inbox AlloSheet metadata has not been generated.');
  }
});

describe('Submission Inbox -> AlloSheet aggregate privacy boundary', () => {
  it('emits the two exact fixed tables under aggregate-only, no-AI, no-writeback metadata', () => {
    const artifact = handoff.buildAlloSheetEnvelope(scoreFixture(), {
      createdAt,
      dateRange: '90d',
      attemptPolicy: 'latest-per-class-nickname',
      datasets: { submissionSummary: true, scoreSummary: true },
      includeStudentIdentifiers: true,
      includeAssignmentTitles: true,
      includeRawResponses: true,
      aiEnabled: true,
      writeBack: true,
    });

    expect(artifact).toMatchObject({
      kind: 'alloflow.tabular.v1',
      version: 1,
      source: {
        tool: 'submission-inbox',
        label: 'Submission Inbox saved gradebook',
        version: '1',
      },
      title: 'Submission Inbox saved-grade summaries',
      createdAt,
      classification: {
        level: 'aggregate-education-data',
        studentIdentifierIncluded: false,
        freeTextNotesIncluded: false,
      },
      privacy: {
        scope: 'aggregate-saved-gradebook-summary',
        identifierIncluded: false,
        reducedData: true,
        notesIncluded: false,
        transferEnablesAI: false,
      },
      capabilities: { writeBack: false, aiEnabled: false },
    });
    expect(artifact.tables.map(table => table.id)).toEqual([
      'saved_submission_summary',
      'saved_score_summary',
    ]);

    expect(artifact.tables[0].columns).toEqual([
      column('assignment_code', 'Assignment code', 'category'),
      column('teacher_saved_submission_count', 'Teacher-saved submissions', 'number'),
      column('unique_class_nickname_count', 'Unique saved class nicknames', 'number'),
      column('submissions_with_saved_rubric', 'Submissions with a saved rubric', 'number'),
      column('submissions_without_saved_rubric', 'Submissions without a saved rubric', 'number'),
      column('first_submitted_date', 'First submitted date', 'date'),
      column('last_submitted_date', 'Last submitted date', 'date'),
      column('last_saved_date', 'Last saved date', 'date'),
      column('saved_record_status', 'Saved record status', 'category'),
    ]);
    expect(artifact.tables[1].columns).toEqual([
      column('assignment_code', 'Assignment code', 'category'),
      column('teacher_saved_submission_count', 'Teacher-saved submissions', 'number'),
      column('scored_response_count', 'Scored responses', 'number'),
      column('grading_error_count', 'Grading errors', 'number'),
      column('invalid_score_result_count', 'Invalid score results', 'number'),
      column('average_score_percent', 'Average score (percent)', 'number'),
      column('minimum_score_percent', 'Minimum score (percent)', 'number'),
      column('maximum_score_percent', 'Maximum score (percent)', 'number'),
      column('score_band_below_40_count', 'Scores below 40', 'number'),
      column('score_band_40_64_count', 'Scores from 40 to 64', 'number'),
      column('score_band_65_84_count', 'Scores from 65 to 84', 'number'),
      column('score_band_85_100_count', 'Scores from 85 to 100', 'number'),
      column('correct_status_count', 'Correct status count', 'number'),
      column('partial_status_count', 'Partial status count', 'number'),
      column('incorrect_status_count', 'Incorrect status count', 'number'),
      column('unclear_status_count', 'Unclear status count', 'number'),
      column('other_status_count', 'Other status count', 'number'),
      column('score_sample_status', 'Score sample status', 'category'),
      column('minimum_reportable_score_count', 'Minimum reportable score count', 'number'),
    ]);

    expect(artifact.tables[0]).toMatchObject({
      title: 'Saved submission summary',
      rowCount: 2,
      sourceRowCount: 2,
      truncated: false,
    });
    expect(artifact.tables[0].rows.map(row => row.values)).toEqual([
      {
        assignment_code: 'A001',
        teacher_saved_submission_count: 20,
        unique_class_nickname_count: 20,
        submissions_with_saved_rubric: 10,
        submissions_without_saved_rubric: 10,
        first_submitted_date: '2026-07-01',
        last_submitted_date: '2026-07-20',
        last_saved_date: '2026-07-20',
        saved_record_status: 'teacher_saved_not_review_attested',
      },
      {
        assignment_code: 'A002',
        teacher_saved_submission_count: 5,
        unique_class_nickname_count: 5,
        submissions_with_saved_rubric: 0,
        submissions_without_saved_rubric: 5,
        first_submitted_date: '2026-07-21',
        last_submitted_date: '2026-07-25',
        last_saved_date: '2026-07-25',
        saved_record_status: 'teacher_saved_not_review_attested',
      },
    ]);
    expect(artifact.tables[1]).toMatchObject({
      title: 'Saved score summary',
      rowCount: 2,
      sourceRowCount: 2,
      truncated: false,
    });
    expect(artifact.tables[1].rows[0].values).toEqual({
      assignment_code: 'A001',
      teacher_saved_submission_count: 20,
      scored_response_count: 20,
      grading_error_count: 0,
      invalid_score_result_count: 0,
      average_score_percent: 56.25,
      minimum_score_percent: 10,
      maximum_score_percent: 90,
      score_band_below_40_count: 5,
      score_band_40_64_count: 5,
      score_band_65_84_count: 5,
      score_band_85_100_count: 5,
      correct_status_count: 5,
      partial_status_count: 5,
      incorrect_status_count: 5,
      unclear_status_count: 5,
      other_status_count: 0,
      score_sample_status: 'available',
      minimum_reportable_score_count: 5,
    });
    expect(artifact.tables[1].rows[1].values).toMatchObject({
      assignment_code: 'A002',
      teacher_saved_submission_count: 5,
      scored_response_count: 5,
      average_score_percent: 100,
      minimum_score_percent: 100,
      maximum_score_percent: 100,
      score_band_85_100_count: 5,
      correct_status_count: 5,
      score_sample_status: 'available',
    });
    expect(artifact.provenance).toMatchObject({
      measurementWindow: '90d',
      attemptPolicy: 'latest-per-class-nickname',
      assignmentCodeType: 'transfer-local-order-code',
      sourceSavedEntryCount: 25,
      eligibleSavedEntryCount: 25,
      includedSavedEntryCount: 25,
      excludedMalformedEntryCount: 0,
      truncatedSourceEntryCount: 0,
      truncatedGradeResultCount: 0,
      maximumGradeResultsPerSavedEntry: 200,
      selectedAssignmentCount: 2,
      omittedAssignmentOptionCount: 0,
      minimumReportableScoreCount: 5,
      suppressedScoreSummaryCount: 0,
      scoreSuppressionRule: 'all-derived-score-statistics-if-any-nonzero-band-or-status-is-below-five',
      dueDateSupport: false,
      humanReviewAttestation: false,
      savedRecordsMayContainAIAssistedScores: true,
      resubmissionPolicy: 'latest-per-class-nickname',
      identitySemantics: {
        stableLearnerIdentitySupport: false,
        learnerGrouping: 'normalized-class-name-plus-nickname',
        stableAssignmentIdentitySupport: false,
        assignmentGrouping: 'normalized-class-name-plus-document-title',
      },
    });
    expect(artifact.provenance.excludedFields).toEqual([
      'student-and-class-identifiers',
      'assignment-titles-and-response-keys',
      'raw-responses-and-feedback',
      'rubric-context-exemplars-and-anchors',
      'files-cryptographic-material-and-work-evidence',
    ]);

    const serialized = JSON.stringify(artifact);
    [
      'SECRET_ASSIGNMENT',
      'SECRET_CLASS',
      'SECRET_LEARNER',
      'SECRET_RESPONSE_FIELD',
      'SECRET_RESPONSE_KEY',
      'SECRET_RAW_RESPONSE',
      'SECRET_FEEDBACK',
      'SECRET_RATIONALE',
      'SECRET_RUBRIC',
      'SECRET_STORAGE_KEY',
      'SECRET_FILENAME',
      'SECRET_CRYPTO_KEY',
      'SECRET_WORK_EVIDENCE',
      'SECRET_NOTEBOOK',
    ].forEach(secret => expect(serialized).not.toContain(secret));
    expect(serialized).not.toContain('"grades"');
    expect(serialized).not.toContain('"responses"');
    expect(serialized).not.toContain('"className"');
    expect(serialized).not.toContain('"docTitle"');
  });

  it('keeps same-title assignments in different classes distinct only in source review', () => {
    const title = 'SECRET_SHARED_ASSIGNMENT_Z9';
    const firstClass = 'SECRET_CLASS_REDWOOD_Z9';
    const secondClass = 'SECRET_CLASS_MAPLE_Z9';
    const entries = [
      savedEntry({
        assignment: title,
        className: firstClass,
        nickname: 'SECRET_SAME_NICKNAME_Z9',
        results: [{ score: 80, status: 'correct' }],
      }),
      savedEntry({
        assignment: title,
        className: secondClass,
        nickname: 'SECRET_SAME_NICKNAME_Z9',
        gradedAt: '2026-07-21T12:00:00.000Z',
        results: [{ score: 90, status: 'correct' }],
      }),
    ];
    const options = handoff.getAlloSheetOptions(entries, {
      createdAt,
      dateRange: 'all',
      attemptPolicy: 'latest-per-class-nickname',
    });
    const sourceOnly = JSON.stringify(options.assignments);

    expect(options.assignmentCount).toBe(2);
    expect(options.assignments).toHaveLength(2);
    expect(sourceOnly).toContain(title);
    expect(sourceOnly).toContain(firstClass);
    expect(sourceOnly).toContain(secondClass);

    const artifact = handoff.buildAlloSheetEnvelope(entries, {
      createdAt,
      dateRange: 'all',
      attemptPolicy: 'latest-per-class-nickname',
      datasets: { submissionSummary: true, scoreSummary: false },
    });
    expect(artifact.tables).toHaveLength(1);
    expect(artifact.tables[0].rows.map(row => row.values.assignment_code)).toEqual([
      'A001',
      'A002',
    ]);
    expect(artifact.tables[0].rows.map(
      row => row.values.teacher_saved_submission_count,
    )).toEqual([1, 1]);
    expect(artifact.tables[0].rows.map(
      row => row.values.unique_class_nickname_count,
    )).toEqual([1, 1]);
    expect(JSON.stringify(artifact)).not.toContain(title);
    expect(JSON.stringify(artifact)).not.toContain(firstClass);
    expect(JSON.stringify(artifact)).not.toContain(secondClass);
  });

  it('applies 30-day, 90-day, and all-history windows and excludes future or undated saves', () => {
    const entries = [
      savedEntry({
        assignment: 'SECRET_DATE_RECENT_Z9',
        nickname: 'SECRET_DATE_LEARNER_RECENT_Z9',
        submittedAt: '2026-07-20T10:00:00.000Z',
        gradedAt: '2026-07-20T12:00:00.000Z',
      }),
      savedEntry({
        assignment: 'SECRET_DATE_MIDDLE_Z9',
        nickname: 'SECRET_DATE_LEARNER_MIDDLE_Z9',
        submittedAt: '2026-06-10T10:00:00.000Z',
        gradedAt: '2026-06-10T12:00:00.000Z',
      }),
      savedEntry({
        assignment: 'SECRET_DATE_OLD_Z9',
        nickname: 'SECRET_DATE_LEARNER_OLD_Z9',
        submittedAt: '2026-01-10T10:00:00.000Z',
        gradedAt: '2026-01-10T12:00:00.000Z',
      }),
      savedEntry({
        assignment: 'SECRET_DATE_FUTURE_Z9',
        nickname: 'SECRET_DATE_LEARNER_FUTURE_Z9',
        submittedAt: '2026-07-30T10:00:00.000Z',
        gradedAt: '2026-07-30T12:00:00.000Z',
      }),
      savedEntry({
        assignment: 'SECRET_DATE_UNDATED_Z9',
        nickname: 'SECRET_DATE_LEARNER_UNDATED_Z9',
        submittedAt: 'not-a-date',
        gradedAt: 'not-a-date',
      }),
    ];
    const get = dateRange => handoff.getAlloSheetOptions(entries, {
      createdAt,
      dateRange,
      attemptPolicy: 'all-saved',
    });

    expect(get('30d')).toMatchObject({
      dateRange: '30d',
      eligibleEntryCount: 1,
      assignmentCount: 1,
    });
    expect(get('90d')).toMatchObject({
      dateRange: '90d',
      eligibleEntryCount: 2,
      assignmentCount: 2,
    });
    const all = get('all');
    expect(all).toMatchObject({
      dateRange: 'all',
      eligibleEntryCount: 3,
      assignmentCount: 3,
    });
    expect(JSON.stringify(all.assignments)).not.toContain('SECRET_DATE_FUTURE_Z9');
    expect(JSON.stringify(all.assignments)).not.toContain('SECRET_DATE_UNDATED_Z9');

    const artifact = handoff.buildAlloSheetEnvelope(entries, {
      createdAt,
      dateRange: 'all',
      attemptPolicy: 'all-saved',
      datasets: { submissionSummary: true, scoreSummary: false },
    });
    expect(artifact.tables[0].rowCount).toBe(3);
    expect(artifact.provenance).toMatchObject({
      measurementWindow: 'all',
      eligibleSavedEntryCount: 3,
      includedSavedEntryCount: 3,
    });
    expect(JSON.stringify(artifact)).not.toContain('SECRET_DATE_');
  });


  it('rejects impossible calendar timestamps and invalid Date objects without dropping valid leap dates', () => {
    const invalidDate = new Date(Number.NaN);
    const entries = [
      savedEntry({
        assignment: 'SECRET_STRICT_VALID_LEAP_Z9',
        nickname: 'SECRET_STRICT_VALID_LEAP_LEARNER_Z9',
        submittedAt: '2024-02-29T23:59:59.999Z',
        gradedAt: '2024-02-29T23:59:59.999Z',
      }),
      savedEntry({
        assignment: 'SECRET_STRICT_NON_LEAP_Z9',
        nickname: 'SECRET_STRICT_NON_LEAP_LEARNER_Z9',
        submittedAt: '2025-02-29T12:00:00-05:00',
        gradedAt: '2025-02-29T12:00:00-05:00',
      }),
      savedEntry({
        assignment: 'SECRET_STRICT_FEBRUARY_30_Z9',
        nickname: 'SECRET_STRICT_FEBRUARY_30_LEARNER_Z9',
        submittedAt: '2026-02-30T00:00:00Z',
        gradedAt: '2026-02-30T00:00:00Z',
      }),
      savedEntry({
        assignment: 'SECRET_STRICT_INVALID_DATE_OBJECT_Z9',
        nickname: 'SECRET_STRICT_INVALID_DATE_OBJECT_LEARNER_Z9',
        submittedAt: invalidDate,
        gradedAt: invalidDate,
      }),
      savedEntry({
        assignment: 'SECRET_STRICT_INVALID_SUBMITTED_Z9',
        nickname: 'SECRET_STRICT_INVALID_SUBMITTED_LEARNER_Z9',
        submittedAt: invalidDate,
        gradedAt: '2026-07-20T12:00:00.000Z',
      }),
    ];
    const prepared = handoff.prepareAlloSheetSource(entries);
    const findPrepared = fragment => prepared.entries.find(
      entry => entry.assignmentLabel.includes(fragment),
    );

    expect(prepared.entries).toHaveLength(5);
    expect(findPrepared('SECRET_STRICT_VALID_LEAP_Z9').gradedTime).toBe(
      Date.parse('2024-02-29T23:59:59.999Z'),
    );
    expect(findPrepared('SECRET_STRICT_NON_LEAP_Z9').gradedTime).toBeNull();
    expect(findPrepared('SECRET_STRICT_FEBRUARY_30_Z9').gradedTime).toBeNull();
    expect(findPrepared('SECRET_STRICT_INVALID_DATE_OBJECT_Z9').gradedTime).toBeNull();
    expect(findPrepared('SECRET_STRICT_INVALID_SUBMITTED_Z9')).toMatchObject({
      submittedTime: null,
      gradedTime: Date.parse('2026-07-20T12:00:00.000Z'),
    });

    const options = handoff.getAlloSheetOptions(prepared, {
      createdAt,
      dateRange: 'all',
      attemptPolicy: 'all-saved',
    });
    expect(options).toMatchObject({
      eligibleEntryCount: 2,
      assignmentCount: 2,
    });
    expect(JSON.stringify(options.assignments)).not.toContain('SECRET_STRICT_NON_LEAP_Z9');
    expect(JSON.stringify(options.assignments)).not.toContain('SECRET_STRICT_FEBRUARY_30_Z9');
    expect(JSON.stringify(options.assignments)).not.toContain('SECRET_STRICT_INVALID_DATE_OBJECT_Z9');

    const artifact = handoff.buildAlloSheetEnvelope(prepared, {
      createdAt,
      dateRange: 'all',
      attemptPolicy: 'all-saved',
      datasets: { submissionSummary: true, scoreSummary: false },
    });
    expect(artifact.tables[0].rows.map(row => row.values)).toEqual([
      {
        assignment_code: 'A001',
        teacher_saved_submission_count: 1,
        unique_class_nickname_count: 1,
        submissions_with_saved_rubric: 1,
        submissions_without_saved_rubric: 0,
        first_submitted_date: '',
        last_submitted_date: '',
        last_saved_date: '2026-07-20',
        saved_record_status: 'teacher_saved_not_review_attested',
      },
      {
        assignment_code: 'A002',
        teacher_saved_submission_count: 1,
        unique_class_nickname_count: 1,
        submissions_with_saved_rubric: 1,
        submissions_without_saved_rubric: 0,
        first_submitted_date: '2024-02-29',
        last_submitted_date: '2024-02-29',
        last_saved_date: '2024-02-29',
        saved_record_status: 'teacher_saved_not_review_attested',
      },
    ]);
    expect(artifact.provenance).toMatchObject({
      sourceSavedEntryCount: 5,
      eligibleSavedEntryCount: 2,
      includedSavedEntryCount: 2,
      excludedMalformedEntryCount: 0,
    });
    expect(JSON.stringify(artifact)).not.toContain('SECRET_STRICT_');
  });

  it('uses the latest save per normalized class nickname and assignment/class group by default while preserving an explicit all-saved view', () => {
    const assignment = 'SECRET_REPEAT_ASSIGNMENT_Z9';
    const entries = [
      savedEntry({
        assignment,
        className: 'SECRET_REPEAT_CLASS_Z9',
        nickname: 'SECRET_REPEAT_LEARNER_Z9',
        gradedAt: '2026-07-10T12:00:00.000Z',
        results: [{ score: 100, status: 'error' }],
      }),
      savedEntry({
        assignment,
        className: 'SECRET_REPEAT_CLASS_Z9',
        nickname: 'secret_repeat_learner_z9',
        gradedAt: '2026-07-20T12:00:00.000Z',
        results: [{ score: 90, status: 'correct' }],
      }),
      savedEntry({
        assignment,
        className: 'SECRET_REPEAT_CLASS_Z9',
        nickname: 'SECRET_REPEAT_SECOND_LEARNER_Z9',
        gradedAt: '2026-07-21T12:00:00.000Z',
        results: [{ score: 85, status: 'correct' }],
      }),
    ];
    const build = attemptPolicy => handoff.buildAlloSheetEnvelope(entries, {
      createdAt,
      dateRange: 'all',
      attemptPolicy,
      datasets: { submissionSummary: true, scoreSummary: true },
    });
    const latest = build('latest-per-class-nickname');
    const allSaved = build('all-saved');
    const latestScores = latest.tables[1].rows[0].values;
    const allScores = allSaved.tables[1].rows[0].values;

    expect(latest.provenance).toMatchObject({
      attemptPolicy: 'latest-per-class-nickname',
      resubmissionPolicy: 'latest-per-class-nickname',
      eligibleSavedEntryCount: 2,
      includedSavedEntryCount: 2,
    });
    expect(latest.tables[0].rows[0].values).toMatchObject({
      teacher_saved_submission_count: 2,
      unique_class_nickname_count: 2,
    });
    expect(latestScores).toMatchObject({
      teacher_saved_submission_count: 2,
      scored_response_count: 2,
      grading_error_count: 0,
    });

    expect(allSaved.provenance).toMatchObject({
      attemptPolicy: 'all-saved',
      resubmissionPolicy: 'all-saved',
      eligibleSavedEntryCount: 3,
      includedSavedEntryCount: 3,
    });
    expect(allSaved.tables[0].rows[0].values).toMatchObject({
      teacher_saved_submission_count: 3,
      unique_class_nickname_count: 2,
    });
    expect(allScores).toMatchObject({
      teacher_saved_submission_count: 3,
      scored_response_count: 2,
      grading_error_count: 1,
    });
  });

  it('counts grading errors and invalid or out-of-range numeric results without coercion', () => {
    const artifact = handoff.buildAlloSheetEnvelope([
      savedEntry({
        assignment: 'SECRET_INVALID_SCORE_ASSIGNMENT_Z9',
        results: [
          { score: 80, status: 'correct' },
          { score: 50, status: 'partially-correct' },
          { score: -1, status: 'incorrect' },
          { score: 101, status: 'incorrect' },
          { score: '90', status: 'correct' },
          { score: Number.NaN, status: 'unclear' },
          { score: 99, status: 'error' },
          { score: -5, status: 'error' },
        ],
      }),
    ], {
      createdAt,
      dateRange: 'all',
      datasets: { submissionSummary: false, scoreSummary: true },
    });
    const values = artifact.tables[0].rows[0].values;

    expect(artifact.tables.map(table => table.id)).toEqual(['saved_score_summary']);
    expect(values).toMatchObject({
      teacher_saved_submission_count: 1,
      scored_response_count: 2,
      grading_error_count: 2,
      invalid_score_result_count: 4,
      average_score_percent: null,
      minimum_score_percent: null,
      maximum_score_percent: null,
      score_sample_status: 'suppressed_small_groups',
      minimum_reportable_score_count: 5,
    });
    [
      'score_band_below_40_count',
      'score_band_40_64_count',
      'score_band_65_84_count',
      'score_band_85_100_count',
      'correct_status_count',
      'partial_status_count',
      'incorrect_status_count',
      'unclear_status_count',
      'other_status_count',
    ].forEach(key => expect(values[key]).toBeNull());
  });

  it('suppresses every derived score distribution when total or any nonzero subgroup is below five', () => {
    const entryFor = (assignment, results) => savedEntry({
      assignment,
      nickname: `SECRET_${assignment}_LEARNER_Z9`,
      results,
    });
    const entries = [
      entryFor('SECRET_SUPPRESS_NO_VALID_Z9', [
        { score: -1, status: 'correct' },
        { score: 50, status: 'error' },
      ]),
      entryFor('SECRET_SUPPRESS_TOTAL_FOUR_Z9', Array(4).fill({
        score: 90,
        status: 'correct',
      })),
      entryFor('SECRET_SUPPRESS_BAND_SPLIT_Z9', [
        ...Array(4).fill({ score: 90, status: 'correct' }),
        { score: 50, status: 'correct' },
      ]),
      entryFor('SECRET_SUPPRESS_STATUS_SPLIT_Z9', [
        ...Array(4).fill({ score: 90, status: 'correct' }),
        { score: 90, status: 'partial' },
      ]),
      entryFor('SECRET_REPORTABLE_ONE_GROUP_Z9', Array(5).fill({
        score: 90,
        status: 'correct',
      })),
      entryFor('SECRET_REPORTABLE_TWO_BANDS_Z9', [
        ...Array(5).fill({ score: 50, status: 'correct' }),
        ...Array(5).fill({ score: 90, status: 'correct' }),
      ]),
    ];
    const artifact = handoff.buildAlloSheetEnvelope(entries, {
      createdAt,
      dateRange: 'all',
      attemptPolicy: 'all-saved',
      datasets: { submissionSummary: false, scoreSummary: true },
    });
    const rows = artifact.tables[0].rows.map(row => row.values);
    const byStatusAndCount = (status, count) => rows.find(
      values => values.score_sample_status === status
        && values.scored_response_count === count,
    );

    expect(byStatusAndCount('no_valid_scores', 0)).toMatchObject({
      average_score_percent: null,
      grading_error_count: 1,
      invalid_score_result_count: 1,
    });
    expect(byStatusAndCount('suppressed_small_groups', 4)).toBeTruthy();
    expect(rows.filter(
      values => values.score_sample_status === 'suppressed_small_groups'
        && values.scored_response_count === 5,
    )).toHaveLength(2);
    expect(rows.filter(
      values => values.score_sample_status === 'suppressed_small_groups',
    ).every(values => values.average_score_percent === null
      && values.correct_status_count === null
      && values.score_band_85_100_count === null)).toBe(true);

    const oneGroup = byStatusAndCount('available', 5);
    expect(oneGroup).toMatchObject({
      average_score_percent: 90,
      minimum_score_percent: 90,
      maximum_score_percent: 90,
      score_band_85_100_count: 5,
      correct_status_count: 5,
    });
    const twoBands = byStatusAndCount('available', 10);
    expect(twoBands).toMatchObject({
      average_score_percent: 70,
      score_band_40_64_count: 5,
      score_band_85_100_count: 5,
      correct_status_count: 10,
    });
    expect(artifact.provenance).toMatchObject({
      minimumReportableScoreCount: 5,
      suppressedScoreSummaryCount: 3,
    });
  });


  it('reduces more than the engine apply-argument threshold without losing score extrema', () => {
    const scorePattern = [0, 50, 75, 100];
    const sharedGrades = gradeMap(Array.from({ length: 200 }, (_, index) => ({
      score: scorePattern[index % scorePattern.length],
      status: 'correct',
    })), 'SECRET_LARGE_RESPONSE_KEY_Z9');
    const entries = Array.from({ length: 751 }, (_, index) => ({
      source: 'offline-html',
      nickname: 'SECRET_LARGE_LEARNER_Z9_' + index,
      docTitle: 'SECRET_LARGE_ASSIGNMENT_Z9',
      className: 'SECRET_LARGE_CLASS_Z9',
      submittedAt: '2026-07-20T10:00:00.000Z',
      gradedAt: '2026-07-20T12:00:00.000Z',
      grades: sharedGrades,
      rubric: '',
    }));

    const options = handoff.getAlloSheetOptions(entries, {
      createdAt,
      dateRange: 'all',
      attemptPolicy: 'all-saved',
    });
    expect(options).toMatchObject({
      eligibleEntryCount: 751,
      assignmentCount: 1,
      assignments: [{
        key: 'S1',
        savedEntryCount: 751,
      }],
    });

    const artifact = handoff.buildAlloSheetEnvelope(entries, {
      createdAt,
      dateRange: 'all',
      attemptPolicy: 'all-saved',
      datasets: { submissionSummary: false, scoreSummary: true },
    });
    expect(artifact.tables).toHaveLength(1);
    expect(artifact.tables[0].rows[0].values).toMatchObject({
      teacher_saved_submission_count: 751,
      scored_response_count: 150200,
      average_score_percent: 56.25,
      minimum_score_percent: 0,
      maximum_score_percent: 100,
      score_band_below_40_count: 37550,
      score_band_40_64_count: 37550,
      score_band_65_84_count: 37550,
      score_band_85_100_count: 37550,
      correct_status_count: 150200,
      score_sample_status: 'available',
    });
    expect(artifact.provenance).toMatchObject({
      includedSavedEntryCount: 751,
      truncatedGradeResultCount: 0,
      maximumGradeResultsPerSavedEntry: 200,
      suppressedScoreSummaryCount: 0,
    });
    expect(JSON.stringify(artifact)).not.toContain('SECRET_LARGE_');
  });

  it('orders naturally, caps source entries, assignment options, and grade results, and reports every cap', () => {
    const entries = [
      savedEntry({
        assignment: 'SECRET_CAP_MALFORMED_Z9',
        nickname: 'SECRET_CAP_MALFORMED_LEARNER_Z9',
        source: 'unsupported-source',
      }),
      ...Array.from({ length: 2004 }, (_, offset) => {
        const index = offset + 1;
        const resultCount = index === 1 ? 205 : index <= 50 ? 5 : 0;
        return savedEntry({
          assignment: `SECRET_CAP_ASSIGNMENT_Z9_${String(index).padStart(4, '0')}`,
          className: 'SECRET_CAP_CLASS_Z9',
          nickname: `SECRET_CAP_LEARNER_Z9_${String(index).padStart(4, '0')}`,
          results: Array.from({ length: resultCount }, () => ({
            score: 90,
            status: 'correct',
          })),
        });
      }),
    ];
    const options = handoff.getAlloSheetOptions(entries, {
      createdAt,
      dateRange: 'all',
      attemptPolicy: 'all-saved',
    });

    expect(options).toMatchObject({
      eligibleEntryCount: 1999,
      assignmentCount: 1999,
      omittedAssignmentCount: 1949,
    });
    expect(options.assignments).toHaveLength(50);
    expect(options.assignments[0]).toMatchObject({ key: 'S1' });
    expect(options.assignments[0].label).toContain('SECRET_CAP_ASSIGNMENT_Z9_0001');
    expect(options.assignments[49].label).toContain('SECRET_CAP_ASSIGNMENT_Z9_0050');
    expect(options.source).toMatchObject({
      excludedEntryCount: 1,
      truncatedEntryCount: 5,
      truncatedGradeResultCount: 5,
    });
    expect(options.source.entries[0].gradeResults).toHaveLength(200);
    expect(handoff.getAlloSheetOptions(entries, {
      createdAt,
      dateRange: 'all',
      attemptPolicy: 'all-saved',
    })).toEqual(options);

    const build = () => handoff.buildAlloSheetEnvelope(entries, {
      createdAt,
      dateRange: 'all',
      attemptPolicy: 'all-saved',
      datasets: { submissionSummary: true, scoreSummary: true },
    });
    const artifact = build();
    expect(build()).toEqual(artifact);
    expect(artifact.tables.every(table => table.rowCount === 50)).toBe(true);
    expect(artifact.tables[0].rows.map(
      row => row.values.assignment_code,
    )).toEqual(Array.from({ length: 50 }, (_, index) =>
      `A${String(index + 1).padStart(3, '0')}`
    ));
    expect(artifact.tables[1].rows[0].values).toMatchObject({
      scored_response_count: 200,
      score_sample_status: 'available',
      correct_status_count: 200,
    });
    expect(artifact.tables[1].rows.slice(1).every(
      row => row.values.scored_response_count === 5
        && row.values.score_sample_status === 'available',
    )).toBe(true);
    expect(artifact.provenance).toMatchObject({
      sourceSavedEntryCount: 2005,
      eligibleSavedEntryCount: 1999,
      includedSavedEntryCount: 50,
      excludedMalformedEntryCount: 1,
      truncatedSourceEntryCount: 5,
      truncatedGradeResultCount: 5,
      maximumGradeResultsPerSavedEntry: 200,
      selectedAssignmentCount: 50,
      omittedAssignmentOptionCount: 1949,
      minimumReportableScoreCount: 5,
      suppressedScoreSummaryCount: 0,
      dueDateSupport: false,
      humanReviewAttestation: false,
      savedRecordsMayContainAIAssistedScores: true,
    });
    const prepared = handoff.prepareAlloSheetSource(entries);
    expect(prepared).toMatchObject({
      sourceEntryCount: 2005,
      excludedEntryCount: 1,
      truncatedEntryCount: 5,
      truncatedGradeResultCount: 5,
    });
    const preparedArtifact = handoff.buildAlloSheetEnvelope(prepared, {
      createdAt,
      dateRange: 'all',
      attemptPolicy: 'all-saved',
      datasets: { submissionSummary: true, scoreSummary: true },
    });
    expect(preparedArtifact.provenance).toMatchObject({
      truncatedSourceEntryCount: 5,
      truncatedGradeResultCount: 5,
      maximumGradeResultsPerSavedEntry: 200,
    });
    expect(preparedArtifact).toEqual(artifact);
    expect(JSON.stringify(artifact)).not.toContain('SECRET_CAP_');
  });

  it('rejects empty dataset or assignment selections instead of widening the transfer', () => {
    const entries = [savedEntry()];
    expect(() => handoff.buildAlloSheetEnvelope(entries, {
      createdAt,
      datasets: { submissionSummary: false, scoreSummary: false },
    })).toThrow(/at least one summary table/i);
    expect(() => handoff.buildAlloSheetEnvelope(entries, {
      createdAt,
      assignmentKeys: [],
    })).toThrow(/at least one saved assignment summary/i);
  });
});

describe('Submission Inbox -> AlloSheet packaging and host wiring', () => {
  const rootModule = readFileSync(
    resolve(process.cwd(), 'view_submission_inbox_module.js'),
    'utf8',
  );
  const webModule = readFileSync(
    resolve(process.cwd(), 'desktop/web-app/public/view_submission_inbox_module.js'),
    'utf8',
  );
  const desktopModule = readFileSync(
    resolve(process.cwd(), 'desktop/app-build/view_submission_inbox_module.js'),
    'utf8',
  );
  const syncSource = readFileSync(
    resolve(process.cwd(), 'dev-tools/sync_allosheet_assets.cjs'),
    'utf8',
  );
  const hostSource = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

  it('ships the generated module byte-identically to both popup package mirrors', () => {
    expect(rootModule).toContain('siBuildSubmissionInboxAlloSheetEnvelope');
    expect(rootModule).toContain('allosheetMinimumScoreGroup');
    expect(syncSource).toContain("'view_submission_inbox_module.js'");
    expect(webModule).toBe(rootModule);
    expect(desktopModule).toBe(rootModule);
  });

  it('threads a receipt-aware callback through the Submission Inbox host mount', () => {
    const start = hostSource.indexOf('{isSubmissionInboxOpen && (() => {');
    const end = hostSource.indexOf('<CDNModuleGate moduleKey="SeatingChart.SeatingChartPanel"', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const mount = hostSource.slice(start, end);

    expect(mount).toMatch(/onOpenAlloSheet\s*=\s*\{\s*\(artifact\)\s*=>/);
    expect(mount).toContain('window.AlloSheetHostBridge');
    expect(mount).toContain('bridge.openTransfer');
    expect(mount).toContain('transfer.delivered');
    expect(mount).toMatch(/bridge\.open\(\{[^}]*artifact/s);
    expect(mount).toContain('return false');
  });
});
