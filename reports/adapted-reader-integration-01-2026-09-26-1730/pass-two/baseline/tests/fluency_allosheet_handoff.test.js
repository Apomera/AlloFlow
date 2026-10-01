import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let F;

beforeAll(() => {
  loadAlloModule('fluency_module.js');
  F = window.AlloModules.Fluency;
});

const cell = (table, id, key) => {
  const row = table.rows.find((entry) => entry.values?.[id] === key);
  return row?.values || {};
};

describe('Reading and Math Fluency -> AlloSheet handoff', () => {
  const reading = {
    recordId: 'raw-reading-id',
    timestamp: '2026-07-31T12:00:00.000Z',
    sourceText: 'The passage must never be transferred.',
    referenceText: 'Nor should this reference text.',
    audioBase64: 'secret-audio',
    transcript: 'secret transcript',
    feedback: 'private feedback',
    wordData: [
      { word: 'The', status: 'correct' },
      { word: 'cat', status: 'mispronounced', said: 'cap' },
      { word: 'ran', status: 'missed' },
    ],
    insertions: ['um'],
    wcpm: 44,
    accuracy: 67,
    durationSeconds: 60,
    totalReferenceWordCount: 3,
    correctWords: 1,
    review: { status: 'reviewed', reviewer: 'Ms. Private', note: 'do not export' },
    passageMetadata: {
      passageId: 'passage-private',
      title: 'Private passage title',
      grade: '3',
      calibrated: true,
      passageSetId: 'set-a',
      formId: 'form-a',
    },
  };
  const math = {
    date: '2026-07-30T12:00:00.000Z',
    operation: 'multiplication',
    difficulty: 'single',
    dcpm: 18,
    accuracy: 80,
    totalAttempted: 5,
    totalCorrect: 4,
    totalDigitsCorrect: 6,
    elapsedSeconds: 30,
    problems: [{ problem: '9 x 7', studentAnswer: '63', correctAnswer: 63 }],
  };

  it('exports bounded measures and excludes raw reading/math content', () => {
    const artifact = F.buildFluencyAlloSheetEnvelope({ readingAssessments: [reading], mathFluencyHistory: [math] }, {
      createdAt: '2026-07-31T13:00:00.000Z',
      dateRange: 'all',
    });
    const measures = artifact.tables.find((table) => table.id === 'fluency-measures');
    expect(measures.rowCount).toBe(2);
    expect(JSON.stringify(artifact)).not.toContain('passage must never');
    expect(JSON.stringify(artifact)).not.toContain('secret-audio');
    expect(JSON.stringify(artifact)).not.toContain('\"said\":\"cap\"');
    expect(JSON.stringify(artifact)).not.toContain('9 x 7');
    expect(JSON.stringify(artifact)).not.toContain('Ms. Private');
    expect(cell(measures, 'measure_family', 'reading')).toMatchObject({
      measure: 'wcpm', rate: 44, accuracy_percent: 67, substitutions: 1, omissions: 1, insertions: 1,
      benchmark_status: 'calibrated-form', review_status: 'educator-reviewed',
    });
    expect(cell(measures, 'measure_family', 'math')).toMatchObject({
      measure: 'dcpm', rate: 18, accuracy_percent: 80, operation: 'multiplication', error_count: 1,
    });
  });

  it('suppresses trend and error aggregates until three sessions exist', () => {
    const artifact = F.buildFluencyAlloSheetEnvelope({ readingAssessments: [reading] }, {
      createdAt: '2026-07-31T13:00:00.000Z',
      dateRange: 'all',
    });
    expect(artifact.metadata.aggregateStatus).toBe('partial; suppressed (<3 sessions per family)');
    expect(artifact.tables.find((table) => table.id === 'fluency-trend-summary').rows[0].values).toMatchObject({
      sample_count: null, median_rate: null, benchmark_ready: false,
      privacy_status: 'suppressed (<3 sessions)',
    });
    expect(artifact.tables.find((table) => table.id === 'fluency-error-summary').rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ values: expect.objectContaining({ measure_family: 'reading', error_category: 'suppressed', error_count: null }) }),
    ]));
  });

  it('keeps calibrated benchmark claims descriptive unless the evidence helper has three parallel forms', () => {
    const reads = [0, 1, 2].map((index) => ({
      ...reading,
      recordId: `r-${index}`,
      timestamp: `2026-07-${28 + index}T12:00:00.000Z`,
      wcpm: 40 + index,
      passageMetadata: { calibrated: true, passageSetId: 'set-a', formId: `form-${index}`, grade: '3' },
    }));
    const artifact = F.buildFluencyAlloSheetEnvelope({ readingAssessments: reads }, {
      createdAt: '2026-07-31T13:00:00.000Z',
      dateRange: 'all',
    });
    const trend = artifact.tables.find((table) => table.id === 'fluency-trend-summary').rows[0].values;
    expect(trend).toMatchObject({ sample_count: 3, evidence_kind: 'calibrated-parallel-forms', benchmark_ready: true });
    expect(artifact.provenance.excludedFields).toEqual(expect.arrayContaining(['wordData', 'audio/base64', 'problem text', 'reviewer identity']));
  });

  it('supports date-range filtering without inferring missing dates', () => {
    const artifact = F.buildFluencyAlloSheetEnvelope({ readingAssessments: [
      { ...reading, timestamp: '2026-07-20T12:00:00.000Z' },
      { ...reading, timestamp: '2026-06-01T12:00:00.000Z' },
    ] }, { createdAt: '2026-07-31T13:00:00.000Z', dateRange: '30d' });
    expect(artifact.metadata.readingSessionCount).toBe(1);
    expect(artifact.tables.find((table) => table.id === 'fluency-measures').rowCount).toBe(1);
  });
});
