import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let Lingua;
const NOW = Date.UTC(2026, 6, 20, 12);
const DAY = 24 * 60 * 60 * 1000;
const ITEM_KEYS = [
  'assignmentId', 'assignmentRevision', 'focus', 'id', 'itemId',
  'kind', 'label', 'practiceSetId', 'reason', 'sourceId',
].sort();

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

function adaptiveSession(progress, sets, language = 'Spanish', now = NOW, scope = {}, limit) {
  expect(typeof Lingua._adaptivePracticeSession, '_adaptivePracticeSession must be exported').toBe('function');
  return Lingua._adaptivePracticeSession(progress, sets, language, now, scope, limit);
}

function lesson(prefix) {
  return {
    title: `${prefix} practice`,
    goal: `Use ${prefix} language in context.`,
    scenario: `A ${prefix} classroom.`,
    vocabulary: Array.from({ length: 8 }, (_, index) => ({
      id: `${prefix}-word-${index}`,
      term: `${prefix}-term-${index}`,
      meaning: `${prefix}-meaning-${index}`,
      example: `${prefix}-example-${index}`,
      translation: `${prefix}-translation-${index}`,
      forms: [
        { id: `${prefix}-form-${index}-a`, label: `form ${index} a`, form: `${prefix}-formed-${index}-a` },
        { id: `${prefix}-form-${index}-b`, label: `form ${index} b`, form: `${prefix}-formed-${index}-b` },
      ],
    })),
    phrases: Array.from({ length: 6 }, (_, index) => ({
      target: `${prefix}-phrase-${index}`,
      translation: `${prefix}-phrase-meaning-${index}`,
      pronunciation: `${prefix}-pronunciation-${index}`,
    })),
    conversation: [{ coach: `${prefix} coach`, translation: `${prefix} coach meaning`, sample: `${prefix} sample` }],
  };
}

function practiceSet(id, options = {}) {
  const language = options.language || 'Spanish';
  const normalized = Lingua._normalizePracticeSets([{
    id,
    language,
    name: `${id} set`,
    lesson: lesson(options.prefix || id),
    archived: options.archived === true,
    createdAt: options.createdAt || 100,
    updatedAt: options.updatedAt || 100,
  }]);
  expect(normalized).toHaveLength(1);
  return normalized[0];
}

function formReview(set, index, overrides = {}) {
  const item = Lingua._formPracticeItems(set.lesson, [], set.language, NOW)[index];
  expect(item).toBeTruthy();
  return {
    id: item.reviewId,
    kind: 'form',
    language: set.language,
    wordId: item.wordId,
    formId: item.formId,
    base: item.base,
    meaning: item.meaning,
    label: item.label,
    form: item.form,
    practiceSetId: set.id,
    assignmentId: '',
    assignmentRevision: 0,
    reviewStage: 2,
    nextReviewAt: NOW - DAY,
    reviews: 2,
    lapses: 0,
    lastReviewedAt: NOW - 4 * DAY,
    lastRating: 'learning',
    reviewHistory: [{ at: NOW - 4 * DAY, rating: 'learning', interval: 3 * DAY, stage: 2 }],
    ...overrides,
  };
}

function listeningEvidence(set, index, overrides = {}) {
  const item = Lingua._listeningItems(set.lesson, [], set.language)[index];
  expect(item).toBeTruthy();
  return {
    id: `listening-evidence-${set.id}-${index}-${overrides.assignmentRevision || 0}`,
    language: set.language,
    practiceSetId: set.id,
    assignmentId: '',
    assignmentRevision: 0,
    itemId: item.id,
    mode: 'dictation',
    outcome: 'near',
    replay: false,
    slow: false,
    hint: false,
    at: NOW - DAY,
    ...overrides,
  };
}

function speechEvidence(set, phraseIndex, options = {}) {
  const phrase = set.lesson.phrases[phraseIndex];
  const assignmentId = options.assignmentId || '';
  const assignmentRevision = options.assignmentRevision || 0;
  const sourceId = Lingua._pronunciationSourceId({
    language: set.language,
    practiceSetId: set.id,
    assignmentId,
    assignmentRevision,
    target: phrase.target,
  });
  const focus = options.focus || 'repeat-me';
  return [0, 1].map((offset) => ({
    id: `pronunciation-${set.id}-${phraseIndex}-${offset}-${assignmentRevision}`,
    language: set.language,
    practiceSetId: set.id,
    assignmentId,
    assignmentRevision,
    sourceId,
    coverage: 60,
    precision: 60,
    transcriptMatch: 60,
    matchedUnits: 2,
    totalUnits: 3,
    focusUnits: [focus],
    unit: 'word',
    evidenceLevel: 'transcript-only',
    at: NOW - (offset + 1) * DAY,
    ...options.extra,
  }));
}

function assertContract(session) {
  expect(Object.keys(session).sort()).toEqual(['items', 'limit', 'requestedLimit']);
  expect(session.limit).toBe(session.items.length);
  const ids = new Set();
  session.items.forEach((item) => {
    expect(Object.keys(item).sort()).toEqual(ITEM_KEYS);
    expect(ids.has(item.id)).toBe(false);
    ids.add(item.id);
  });
}

describe('Lingua Adaptive Practice v1 pure session contract', () => {
  it('normalizes deterministic session sizes to 5, 7, or 10 and fills across modalities', () => {
    const set = practiceSet('set-variety');
    const cases = [
      { input: undefined, requested: 5 },
      { input: 5, requested: 5 },
      { input: '7', requested: 7 },
      { input: 10, requested: 10 },
      { input: 11, requested: 5 },
    ];

    cases.forEach(({ input, requested }) => {
      const first = adaptiveSession({}, [set], 'Spanish', NOW, {}, input);
      const second = adaptiveSession({}, [set], 'Spanish', NOW, {}, input);
      expect(first).toEqual(second);
      expect(first.requestedLimit).toBe(requested);
      expect(first.limit).toBe(requested);
      expect(first.items).toHaveLength(requested);
      expect(first.items.every((item) => item.reason === 'variety')).toBe(true);
      assertContract(first);
    });

    const ten = adaptiveSession({}, [set], 'Spanish', NOW, {}, 10);
    expect(new Set(ten.items.map((item) => item.kind))).toEqual(new Set([
      'vocabulary-practice', 'form-practice', 'listening-practice', 'speech-practice',
    ]));
  });

  it('places Again and due word/form reviews ahead of variety fillers', () => {
    const set = practiceSet('set-review');
    const progress = {
      saved: [
        { id: 'word-again', language: 'Spanish', term: 'hola', meaning: 'hello', nextReviewAt: NOW - 10, lastRating: 'again', reviewStage: 0 },
        { id: 'word-due', language: 'Spanish', term: 'adios', meaning: 'goodbye', nextReviewAt: NOW - 20, lastRating: 'learning', reviewStage: 2 },
      ],
      formReviews: [
        formReview(set, 0, { lastRating: 'again', nextReviewAt: NOW - 5 }),
        formReview(set, 1, { lastRating: 'learning', nextReviewAt: NOW - 30 }),
      ],
    };

    const session = adaptiveSession(progress, [set], 'Spanish', NOW, {}, 10);
    const reviews = session.items.filter((item) => item.kind.endsWith('-review'));
    expect(reviews).toHaveLength(4);
    expect(reviews.map((item) => [item.kind, item.reason])).toEqual([
      ['word-review', 'again'],
      ['form-review', 'again'],
      ['word-review', 'due'],
      ['form-review', 'due'],
    ]);
    expect(reviews.map((item) => item.label).join(' ')).toContain('hola');
    expect(reviews.map((item) => item.label).join(' ')).toContain('adios');
    expect(session.items.slice(0, 4)).toEqual(reviews);
    assertContract(session);
  });

  it('retries recent non-exact listening evidence and repeated confirmed pronunciation evidence', () => {
    const set = practiceSet('set-evidence');
    const listening = Lingua._listeningItems(set.lesson, [], 'Spanish');
    const speech = speechEvidence(set, 0, { focus: 'phrase-part' });
    const progress = {
      listeningEvidence: [
        listeningEvidence(set, 0, { outcome: 'near', at: NOW - DAY }),
        listeningEvidence(set, 1, { outcome: 'no-match', at: NOW - 2 * DAY }),
        listeningEvidence(set, 2, { outcome: 'exact', at: NOW - 1 }),
        listeningEvidence(set, 3, { outcome: 'near', at: NOW - 90 * DAY }),
      ],
      pronunciationEvidence: speech.concat(speechEvidence(set, 1, { focus: 'single-only' }).slice(0, 1)),
    };

    const session = adaptiveSession(progress, [set], 'Spanish', NOW, {}, 10);
    const listeningRetries = session.items.filter((item) => item.kind === 'listening-retry');
    expect(listeningRetries.map((item) => item.itemId)).toEqual([listening[0].id, listening[1].id]);
    expect(listeningRetries.every((item) => item.reason === 'listening-retry')).toBe(true);
    expect(listeningRetries.some((item) => item.itemId === listening[2].id || item.itemId === listening[3].id)).toBe(false);

    const speechRetries = session.items.filter((item) => item.kind === 'speech-retry');
    expect(speechRetries).toHaveLength(1);
    expect(speechRetries[0]).toMatchObject({
      sourceId: speech[0].sourceId,
      focus: 'phrase-part',
      reason: 'recognizer-repeat',
    });
    assertContract(session);
  });

  it('honors exact assignment revision scope and excludes archived or missing practice sets', () => {
    const current = practiceSet('set-current', { prefix: 'current' });
    const archived = practiceSet('set-archived', { prefix: 'archived', archived: true });
    const scope = { practiceSetId: current.id, assignmentId: 'assignment-a', assignmentRevision: 2 };
    const exactSpeech = speechEvidence(current, 0, { assignmentId: scope.assignmentId, assignmentRevision: scope.assignmentRevision, focus: 'exact-focus' });
    const oldSpeech = speechEvidence(current, 1, { assignmentId: scope.assignmentId, assignmentRevision: 1, focus: 'old-focus' });
    const archivedSpeech = speechEvidence(archived, 0, { assignmentId: scope.assignmentId, assignmentRevision: scope.assignmentRevision, focus: 'archived-focus' });
    const progress = {
      formReviews: [
        formReview(current, 0, { assignmentId: scope.assignmentId, assignmentRevision: 2, lastRating: 'again' }),
        formReview(current, 1, { assignmentId: scope.assignmentId, assignmentRevision: 1, lastRating: 'again' }),
        formReview(current, 2, { assignmentId: 'assignment-b', assignmentRevision: 2, lastRating: 'again' }),
        formReview(archived, 0, { assignmentId: scope.assignmentId, assignmentRevision: 2, lastRating: 'again' }),
        { ...formReview(current, 3), id: 'missing-form', practiceSetId: 'set-missing', assignmentId: scope.assignmentId, assignmentRevision: 2 },
      ],
      listeningEvidence: [
        listeningEvidence(current, 0, { assignmentId: scope.assignmentId, assignmentRevision: 2 }),
        listeningEvidence(current, 1, { assignmentId: scope.assignmentId, assignmentRevision: 1 }),
        listeningEvidence(archived, 0, { assignmentId: scope.assignmentId, assignmentRevision: 2 }),
        { ...listeningEvidence(current, 2), id: 'missing-listening', practiceSetId: 'set-missing', assignmentId: scope.assignmentId, assignmentRevision: 2 },
      ],
      pronunciationEvidence: exactSpeech.concat(oldSpeech, archivedSpeech),
    };

    const session = adaptiveSession(progress, [archived, current], 'Spanish', NOW, scope, 10);
    expect(session.items.length).toBeGreaterThan(0);
    expect(session.items.every((item) => item.practiceSetId === current.id)).toBe(true);
    expect(session.items.every((item) => item.assignmentId === scope.assignmentId && item.assignmentRevision === 2)).toBe(true);
    expect(session.items.filter((item) => item.kind === 'form-review')).toHaveLength(1);
    expect(session.items.filter((item) => item.kind === 'listening-retry')).toHaveLength(1);
    expect(session.items.filter((item) => item.kind === 'speech-retry')).toHaveLength(1);
    expect(JSON.stringify(session)).not.toContain('archived-focus');
    expect(JSON.stringify(session)).not.toContain('old-focus');

    expect(adaptiveSession(progress, [archived, current], 'Spanish', NOW, {
      practiceSetId: 'set-missing', assignmentId: scope.assignmentId, assignmentRevision: 2,
    }, 5)).toEqual({ items: [], requestedLimit: 5, limit: 0 });
    expect(adaptiveSession(progress, [archived], 'Spanish', NOW, {
      practiceSetId: archived.id, assignmentId: scope.assignmentId, assignmentRevision: 2,
    }, 5)).toEqual({ items: [], requestedLimit: 5, limit: 0 });
    assertContract(session);
  });

  it('returns routing metadata only and never mutates or leaks learner response data', () => {
    const set = practiceSet('set-private');
    const privateAnswer = 'PRIVATE_LEARNER_ANSWER';
    const privateTranscript = 'PRIVATE_RAW_TRANSCRIPT';
    const progress = {
      saved: [{
        language: 'Spanish', term: 'seguro', meaning: 'safe', nextReviewAt: 0, lastRating: 'again',
        answer: privateAnswer, transcript: privateTranscript, confidence: 0.01, score: 2,
      }],
      listeningEvidence: [listeningEvidence(set, 0, {
        outcome: 'near', answer: privateAnswer, transcript: privateTranscript, confidence: 0.02, score: 3,
      })],
      pronunciationEvidence: speechEvidence(set, 0, {
        focus: 'safe-focus',
        extra: { answer: privateAnswer, transcript: privateTranscript, confidence: 0.03, score: 4 },
      }),
    };
    const progressBefore = JSON.stringify(progress);
    const setsBefore = JSON.stringify([set]);

    const session = adaptiveSession(progress, [set], 'Spanish', NOW, {}, 10);
    assertContract(session);
    expect(JSON.stringify(progress)).toBe(progressBefore);
    expect(JSON.stringify([set])).toBe(setsBefore);
    const serialized = JSON.stringify(session);
    expect(serialized).not.toContain(privateAnswer);
    expect(serialized).not.toContain(privateTranscript);
    session.items.forEach((item) => {
      expect(item).not.toHaveProperty('answer');
      expect(item).not.toHaveProperty('transcript');
      expect(item).not.toHaveProperty('confidence');
      expect(item).not.toHaveProperty('score');
    });
  });
});
