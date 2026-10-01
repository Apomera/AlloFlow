import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let F;

beforeAll(() => {
  loadAlloModule('fluency_module.js');
  F = window.AlloModules.Fluency;
});

describe('fluency running-record metrics', () => {
  it('counts self-corrections as correct and insertions as errors', () => {
    const words = [
      { word: 'One', status: 'correct' },
      { word: 'two', status: 'self_corrected', said: 'too' },
      { word: 'three', status: 'mispronounced', said: 'tree' },
      { word: 'four', status: 'missed' },
    ];
    expect(F.calculateLocalFluencyMetrics(words, 60, 4, ['um'])).toEqual({
      accuracy: 25,
      wcpm: 1,
      correctWords: 1,
    });
    expect(F.calculateRunningRecordMetrics(words, ['um'])).toMatchObject({
      substitutions: 1,
      omissions: 1,
      insertions: 1,
      selfCorrections: 1,
      totalErrors: 3,
      accuracy: 25,
      accuracyPct: 25,
      readingLevel: 'frustrational',
    });
  });
});

describe('teacher-reviewed fluency records', () => {
  const automated = {
    recordId: 'read-1',
    timestamp: '2026-07-14T12:00:00.000Z',
    durationSeconds: 60,
    totalReferenceWordCount: 4,
    accuracy: 75,
    wcpm: 3,
    wordData: [
      { word: 'One', status: 'correct' },
      { word: 'two', status: 'mispronounced', said: 'too', lowConfidence: true },
      { word: 'three', status: 'correct' },
      { word: 'four', status: 'correct' },
    ],
    insertions: [],
    review: { status: 'unreviewed' },
  };

  it('recalculates scores and preserves the automated snapshot', () => {
    const reviewed = F.applyFluencyReview(automated, {
      wordData: automated.wordData.map((word, index) =>
        index === 1 ? { ...word, status: 'correct', said: '' } : word
      ),
      reviewer: 'Ms. Rivera',
      note: 'Listened to the recording.',
    }, {
      reviewedAt: '2026-07-14T13:00:00.000Z',
    });

    expect(reviewed).toMatchObject({
      accuracy: 100,
      wcpm: 4,
      review: {
        status: 'reviewed',
        reviewer: 'Ms. Rivera',
        revision: 1,
        correctedWordCount: 1,
      },
    });
    expect(reviewed.automatedSnapshot.wordData[1]).toMatchObject({
      status: 'mispronounced',
      said: 'too',
    });
    expect(reviewed.reviewAudit).toHaveLength(1);
    expect(automated.review.status).toBe('unreviewed');
  });

  it('appends revisions without replacing the first automated snapshot', () => {
    const first = F.applyFluencyReview(automated, { wordData: automated.wordData }, {
      reviewer: 'Teacher A',
      reviewedAt: '2026-07-14T13:00:00.000Z',
    });
    const secondWords = first.wordData.map((word, index) =>
      index === 1 ? { ...word, status: 'correct' } : word
    );
    const second = F.applyFluencyReview(first, { wordData: secondWords }, {
      reviewer: 'Teacher B',
      reviewedAt: '2026-07-14T14:00:00.000Z',
    });
    expect(second.review.revision).toBe(2);
    expect(second.reviewAudit).toHaveLength(2);
    expect(second.automatedSnapshot.wordData[1].status).toBe('mispronounced');
    expect(second.reviewAudit[1].previous.wordData[1].status).toBe('mispronounced');
  });
});

describe('passage comparability and median-of-three evidence', () => {
  it('identifies repeated readings as descriptive practice evidence', () => {
    const reads = [60, 70, 80].map((wcpm, index) => ({
      recordId: 'r' + index,
      timestamp: `2026-07-1${index + 1}T12:00:00.000Z`,
      wcpm,
      accuracy: 90 + index,
      passageMetadata: {
        passageId: 'same-passage',
        calibrated: false,
        passageSetId: null,
        formId: null,
      },
    }));
    expect(F.summarizeFluencyEvidence(reads)).toMatchObject({
      sampleCount: 3,
      medianWcpm: 70,
      medianAccuracy: 91,
      evidenceKind: 'repeated-reading',
      benchmarkReady: false,
    });
  });

  it('requires three calibrated, distinct parallel forms from one set', () => {
    const reads = [85, 90, 95].map((wcpm, index) => ({
      recordId: 'p' + index,
      timestamp: `2026-07-1${index + 1}T12:00:00.000Z`,
      wcpm,
      accuracy: 96,
      passageMetadata: {
        passageId: 'passage-' + index,
        calibrated: true,
        passageSetId: 'grade-3-winter-a',
        formId: 'form-' + index,
      },
    }));
    expect(F.summarizeFluencyEvidence(reads)).toMatchObject({
      medianWcpm: 90,
      evidenceKind: 'calibrated-parallel-forms',
      benchmarkReady: true,
    });
  });

  it('creates stable uncalibrated metadata for ordinary generated text', () => {
    const a = F.createFluencyPassageMetadata('One two three.', { grade: '3' });
    const b = F.createFluencyPassageMetadata('One   two three.', { grade: '3' });
    expect(a.passageId).toBe(b.passageId);
    expect(a).toMatchObject({ wordCount: 3, calibrated: false, grade: '3' });
  });
});
