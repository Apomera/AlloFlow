import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

const LEARNING_RECORD_PRODUCT = 'AlloFlow Lingua Learning Record';
let Lingua;

beforeAll(() => {
  window.React = window.React || {
    useState: (value) => [value, () => {}],
    useEffect: () => {},
    useMemo: (fn) => fn(),
    useRef: () => ({ current: null }),
    createElement: () => null,
    Fragment: 'fragment',
  };
  loadAlloModule('lingua_practice_module.js');
  Lingua = window.AlloModules.LinguaPractice;
  if (!Lingua) throw new Error('LinguaPractice did not register');
});

function helper(name) {
  expect(typeof Lingua?.[name], `${name} must remain exported`).toBe('function');
  return Lingua[name];
}

function submission(overrides = {}) {
  return {
    product: LEARNING_RECORD_PRODUCT,
    version: 2,
    submissionId: 'submission-default',
    generatedAt: '2026-08-01T12:00:00.000Z',
    learnerCodename: 'Learner',
    language: { target: 'French' },
    practiceSet: { id: 'set-alpha', title: 'French foundations' },
    assignment: {
      id: 'assignment-alpha',
      practiceSetId: 'set-alpha',
      title: 'French foundations',
      revision: 2,
      targets: {},
      createdAt: 1000,
      updatedAt: 2000,
    },
    summary: {},
    ...overrides,
  };
}

describe('Lingua assignment workflow contracts', () => {
  it('normalizes bounded assignment metadata, generic targets, and the legacy edit alias', () => {
    const normalizeAssignment = helper('_normalizeAssignment');
    const normalized = normalizeAssignment({
      id: 'assignment:alpha',
      practiceSetId: 'set-alpha',
      title: '  French\n\tFoundations  ',
      instructions: '  Complete each activity once.  ',
      dueDate: '2026-09-03',
      revision: 5000,
      allowLearnerEdit: true,
      targets: {
        formAttempts: 205,
        spokenAttempts: '2.6',
        listeningAttempts: -4,
        chatTurns: 'not-a-number',
        reviews: 0,
      },
      createdAt: -20,
      updatedAt: 1600,
    }, 'fallback-set', 1700);

    expect(normalized).toEqual({
      schemaVersion: 1,
      id: 'assignment:alpha',
      practiceSetId: 'set-alpha',
      status: 'published',
      title: 'French Foundations',
      instructions: 'Complete each activity once.',
      dueDate: '2026-09-03',
      revision: 999,
      allowPersonalCopy: true,
      targets: {
        formAttempts: 200,
        spokenAttempts: 3,
        listeningAttempts: 0,
        chatTurns: 3,
        reviews: 0,
      },
      createdAt: 0,
      updatedAt: 1600,
    });

    expect(normalizeAssignment({ id: 'not valid', dueDate: '09/03/2026' }, 'fallback-set', 1700))
      .toMatchObject({ id: '', practiceSetId: 'fallback-set', dueDate: '', revision: 0, allowPersonalCopy: false });
  });

  it('keeps a stable assignment ID while incrementing revisions and resets identity for a different set', () => {
    const assignmentForSave = helper('_assignmentForSave');
    const first = assignmentForSave({ title: 'Unit one' }, 'set-alpha', 1000);
    const second = assignmentForSave(first, 'set-alpha', 2000);
    const moved = assignmentForSave(second, 'set-beta', 3000);

    expect(first).toMatchObject({
      id: 'lingua-assignment-1000-set-alpha',
      practiceSetId: 'set-alpha',
      revision: 1,
      createdAt: 1000,
      updatedAt: 1000,
    });
    expect(second).toMatchObject({
      id: first.id,
      practiceSetId: 'set-alpha',
      revision: 2,
      createdAt: 1000,
      updatedAt: 2000,
    });
    expect(moved).toMatchObject({
      id: 'lingua-assignment-3000-set-beta',
      practiceSetId: 'set-beta',
      revision: 1,
      createdAt: 3000,
      updatedAt: 3000,
    });
    expect(moved.id).not.toBe(first.id);
  });

  it('summarizes transparent activity targets without treating disabled targets as incomplete', () => {
    const assignmentProgress = helper('_assignmentProgress');
    const result = assignmentProgress({
      practiceSet: { id: 'set-alpha' },
      summary: { formAttempts: 2, spokenAttempts: 2, listeningAttempts: 99 },
    }, {
      id: 'assignment-alpha',
      practiceSetId: 'set-alpha',
      targets: { formAttempts: 4, spokenAttempts: 2, listeningAttempts: 0, chatTurns: 0, reviews: 0 },
    });

    expect(result).toEqual({
      counts: { formAttempts: 2, spokenAttempts: 2, listeningAttempts: 99, chatTurns: 0, reviews: 0 },
      targets: { formAttempts: 4, spokenAttempts: 2, listeningAttempts: 0, chatTurns: 0, reviews: 0 },
      completedTargets: 1,
      totalTargets: 2,
      percent: 75,
      complete: false,
    });

    expect(assignmentProgress({ summary: {} }, {
      targets: { formAttempts: 0, spokenAttempts: 0, listeningAttempts: 0, chatTurns: 0, reviews: 0 },
    })).toMatchObject({ completedTargets: 0, totalTargets: 0, percent: 100, complete: true });
  });

  it('creates an assignment-scoped v2 record without unrelated same-language evidence or raw private artifacts', () => {
    const createLearningRecord = helper('_createLearningRecord');
    const assignment = {
      id: 'assignment-alpha',
      practiceSetId: 'set-alpha',
      title: 'French foundations',
      instructions: 'Practice the assigned set.',
      dueDate: '2026-09-03',
      revision: 2,
      targets: { formAttempts: 2, spokenAttempts: 1, listeningAttempts: 0, chatTurns: 0, reviews: 0 },
      createdAt: 1000,
      updatedAt: 1100,
      teacherSecret: 'assignment-secret',
    };
    const lesson = {
      title: 'French foundations',
      sourceText: 'source-secret',
      generatedImage: 'image-secret',
      vocabulary: [
        { term: 'parler', meaning: 'to speak', forms: [{ label: 'past participle', form: 'parl\u00e9' }] },
        { term: '\u00eatre', meaning: 'to be' },
      ],
    };
    const progress = {
      sourceText: 'source-secret',
      rawChat: [{ text: 'chat-secret' }],
      audio: 'audio-secret',
      generatedImages: ['image-secret'],
      saved: [
        { language: 'French', term: 'parler', meaning: 'to speak', note: 'note-secret', privateSecret: 'word-secret', reviews: 4, forms: [{ label: 'past participle', form: 'parl\u00e9' }] },
        { language: 'French', term: 'baguette', meaning: 'bread', note: 'unrelated-note-secret' },
        { language: 'Spanish', term: 'parler', meaning: 'not the target language' },
      ],
      reflections: [{ id: 'reflection-private', language: 'French', text: 'reflection-secret', at: 1200 }],
      activityLog: [
        { id: 'activity-matching-form', language: 'French', kind: 'formAttempts', count: 2, at: 2000, practiceSetId: 'set-alpha', assignmentId: 'assignment-alpha', assignmentRevision: 2 },
        { id: 'activity-matching-speech', language: 'French', kind: 'spokenAttempts', count: 1, at: 2100, practiceSetId: 'set-alpha', assignmentId: 'assignment-alpha', assignmentRevision: 2 },
        { id: 'activity-old-revision', language: 'French', kind: 'listeningAttempts', count: 9, at: 2200, practiceSetId: 'set-alpha', assignmentId: 'assignment-alpha', assignmentRevision: 1 },
        { id: 'activity-other-assignment', language: 'French', kind: 'reviews', count: 7, at: 2300, practiceSetId: 'set-beta', assignmentId: 'assignment-beta', assignmentRevision: 2 },
        { id: 'activity-unscoped', language: 'French', kind: 'chatTurns', count: 6, at: 2400 },
        { id: 'activity-other-language', language: 'Spanish', kind: 'formAttempts', count: 8, at: 2500, practiceSetId: 'set-alpha', assignmentId: 'assignment-alpha', assignmentRevision: 2 },
      ],
      formEvidence: [
        { id: 'form-matching', language: 'French', practiceSetId: 'set-alpha', assignmentId: 'assignment-alpha', assignmentRevision: 2, itemId: 'form-1', label: 'past participle', expected: 'parl\u00e9', typedAnswer: 'typed-answer-secret', status: 'correct', score: 100, at: 2050 },
        { id: 'form-other-assignment', language: 'French', practiceSetId: 'set-beta', assignmentId: 'assignment-beta', assignmentRevision: 2, itemId: 'form-2', label: 'plural', expected: 'baguettes', status: 'incorrect', score: 0, at: 2150 },
        { id: 'form-old-revision', language: 'French', practiceSetId: 'set-alpha', assignmentId: 'assignment-alpha', assignmentRevision: 1, itemId: 'form-3', label: 'old', expected: 'old', status: 'correct', score: 100, at: 2250 },
      ],
      pronunciationEvidence: [
        { id: 'speech-matching', language: 'French', practiceSetId: 'set-alpha', assignmentId: 'assignment-alpha', assignmentRevision: 2, sourceId: 'phrase-0', coverage: 80, precision: 75, transcriptMatch: 77, matchedUnits: 2, totalUnits: 3, focusUnits: ['bonjour'], transcript: 'transcript-secret', rawRecognition: { secret: 'recognizer-secret' }, unit: 'word', at: 2060 },
        { id: 'speech-other-assignment', language: 'French', practiceSetId: 'set-beta', assignmentId: 'assignment-beta', assignmentRevision: 2, sourceId: 'phrase-1', coverage: 99, precision: 99, transcriptMatch: 99, matchedUnits: 3, totalUnits: 3, unit: 'word', at: 2160 },
      ],
    };

    const record = createLearningRecord(
      { known: 'English', target: 'French', level: 'Beginner', register: 'Neutral' },
      progress,
      lesson,
      'set-alpha',
      { learnerCodename: 'Moon', assignment, includeReflections: false, rawChat: 'chat-secret' },
      5000,
    );

    expect(record).toMatchObject({
      product: LEARNING_RECORD_PRODUCT,
      version: 2,
      learnerCodename: 'Moon',
      assignment: { id: 'assignment-alpha', practiceSetId: 'set-alpha', revision: 2 },
      practiceSet: { id: 'set-alpha', title: 'French foundations' },
      scope: { kind: 'assignment', completeness: 'scoped' },
      summary: {
        formAttempts: 2,
        spokenAttempts: 1,
        listeningAttempts: 0,
        chatTurns: 0,
        reviews: 0,
        savedCount: 1,
        assignedVocabularyCount: 2,
        assignedVocabularySavedCount: 1,
        activityCount: 3,
      },
    });
    expect(record.activity.map((item) => item.id)).toEqual(['activity-matching-speech', 'activity-matching-form']);
    expect(record.formEvidence.map((item) => item.id)).toEqual(['form-matching']);
    expect(record.pronunciationEvidence.map((item) => item.id)).toEqual(['speech-matching']);
    expect(record.savedWords.map((item) => item.term)).toEqual(['parler']);
    expect(record.reflections).toEqual([]);
    expect(record.privacy.excluded).toEqual(['source material', 'raw chat', 'speech transcripts', 'typed answers', 'audio', 'generated images']);

    const serialized = JSON.stringify(record);
    [
      'source-secret', 'image-secret', 'chat-secret', 'audio-secret', 'note-secret',
      'word-secret', 'reflection-secret', 'typed-answer-secret', 'transcript-secret',
      'recognizer-secret', 'assignment-secret', 'baguette', 'activity-other-assignment',
    ].forEach((secret) => expect(serialized).not.toContain(secret));
  });

  it('sorts newest submissions first, deduplicates by stable submission ID, and caps the dashboard ledger', () => {
    const normalizeSubmissionRecords = helper('_normalizeSubmissionRecords');
    const records = normalizeSubmissionRecords([
      { historyId: 'history-old', data: submission({ submissionId: 'duplicate-id', generatedAt: '2026-08-01T10:00:00.000Z', learnerCodename: 'Old attempt' }) },
      { historyId: 'history-second', data: submission({ submissionId: 'second-id', generatedAt: '2026-08-01T11:00:00.000Z', learnerCodename: 'Second' }) },
      { historyId: 'history-new', data: submission({ submissionId: 'duplicate-id', generatedAt: '2026-08-01T12:00:00.000Z', learnerCodename: 'Newest attempt' }) },
      { historyId: 'ignored', data: { product: 'Not Lingua', submissionId: 'ignored' } },
    ]);

    expect(records.map((item) => item.id)).toEqual(['history-new', 'history-second']);
    expect(records[0]).toMatchObject({ submissionId: 'duplicate-id', learnerCodename: 'Newest attempt' });

    const oversized = normalizeSubmissionRecords(Array.from({ length: 205 }, (_, index) => submission({
      submissionId: `submission-${index}`,
      generatedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
    })));
    expect(oversized).toHaveLength(200);
    expect(oversized[0].submissionId).toBe('submission-204');
    expect(oversized.at(-1).submissionId).toBe('submission-5');
  });

  it('normalizes legacy language-wide records and preserves the explicit dashboard warning label', () => {
    const normalizeSubmissionRecords = helper('_normalizeSubmissionRecords');
    const [legacy] = normalizeSubmissionRecords([{
      historyId: 'history-legacy',
      savedAt: '2025-12-20T09:30:00.000Z',
      data: {
        product: LEARNING_RECORD_PRODUCT,
        language: { target: 'French' },
        practiceSet: { id: 'legacy-set', title: 'Legacy French set' },
        summary: { formAttempts: '3', spokenAttempts: -5, savedCount: '2' },
      },
    }]);

    expect(legacy).toMatchObject({
      id: 'history-legacy',
      version: 1,
      learnerCodename: 'Learner',
      generatedAt: '2025-12-20T09:30:00.000Z',
      language: 'French',
      practiceSet: { id: 'legacy-set', title: 'Legacy French set' },
      assignment: { id: '', practiceSetId: 'legacy-set', revision: 0 },
      summary: { formAttempts: 3, spokenAttempts: 0, savedCount: 2 },
    });
    expect(Lingua._uiStrings.English.dashboard_legacy).toMatch(/legacy language-wide record/i);
  });
});
