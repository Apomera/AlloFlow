import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

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

function requireHelper(name) {
  const helper = Lingua && Lingua[name];
  if (typeof helper !== 'function') {
    throw new Error(`${name} must be exported for focused form spaced-review regression coverage`);
  }
  return helper;
}

function requirePositiveInteger(name) {
  const value = Lingua && Lingua[name];
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be exported as a positive integer for bounded persistence coverage`);
  }
  return value;
}

function formCard(overrides = {}) {
  return {
    wordId: 'word-parler',
    formId: 'form-nous-present',
    base: 'parler',
    meaning: 'to speak',
    label: 'nous, present',
    form: 'parlons',
    note: 'first-person plural',
    pronunciation: 'par-lon',
    ...overrides,
  };
}

describe('Lingua per-form spaced review', () => {
  it('uses stable language-generic content identity across reorder and Unicode-equivalent input', () => {
    const formReviewId = requireHelper('_formReviewId');
    const formPracticeItems = requireHelper('_formPracticeItems');
    const lesson = {
      vocabulary: [
        {
          term: 'parler',
          meaning: 'to speak',
          forms: [
            { label: 'nous, present', form: 'parlons' },
            { label: 'completed aspect', form: 'avais parl\u00e9' },
          ],
        },
        {
          term: '\u8a71\u3059',
          meaning: 'to speak',
          forms: [{ label: '\u4e01\u5be7\u4f53', form: '\u8a71\u3057\u307e\u3059' }],
        },
      ],
    };
    const reordered = {
      vocabulary: lesson.vocabulary.slice().reverse().map((word) => ({
        ...word,
        forms: word.forms.slice().reverse(),
      })),
    };

    const byContent = (items) => Object.fromEntries(
      items.map((item) => [`${item.base}::${item.label}::${item.form}`, item.reviewId]),
    );
    expect(byContent(formPracticeItems(reordered, [], 'French', 100)))
      .toEqual(byContent(formPracticeItems(lesson, [], 'French', 100)));

    const composed = formReviewId('French', {
      base: '  \u00c9TUDIER ', meaning: ' to study ', label: ' PASS\u00c9 COMPOS\u00c9 ', form: ' ai \u00e9tudi\u00e9 ',
    });
    const decomposed = formReviewId(' french ', {
      base: 'e\u0301tudier', meaning: 'TO STUDY', label: 'passe\u0301 compose\u0301', form: 'ai e\u0301tudie\u0301',
    });
    expect(decomposed).toBe(composed);
    expect(composed).toMatch(/^[a-zA-Z0-9._:-]+$/);
    expect(formReviewId('French', { base: 'parler', label: 'present', form: 'parle' }))
      .not.toBe(formReviewId('French', { base: 'parler', label: 'present', form: 'parl\u00e9' }));
    expect(formReviewId('Japanese', { base: '\u8a71\u3059', label: '\u4e01\u5be7\u4f53', form: '\u8a71\u3057\u307e\u3059' }))
      .toMatch(/^[a-zA-Z0-9._:-]+$/);
  });

  it('enrolls exactly one sanitized card and preserves its original enrollment time', () => {
    const enrollFormReview = requireHelper('_enrollFormReview');
    const privateItem = formCard({
      typedAnswer: 'PRIVATE-TYPED-ANSWER',
      actual: 'PRIVATE-ACTUAL',
      rawTranscript: 'PRIVATE-TRANSCRIPT',
      audioBlob: 'PRIVATE-AUDIO',
    });
    const original = { saved: [], formReviews: [], marker: { keep: true } };
    const first = enrollFormReview(original, privateItem, 'French', {
      practiceSetId: 'set-1', assignmentId: 'assignment-1', assignmentRevision: 2,
    }, 1_000);

    expect(original.formReviews).toEqual([]);
    expect(first.formReviews).toHaveLength(1);
    expect(first.formReviews[0]).toMatchObject({
      kind: 'form',
      language: 'French',
      base: 'parler',
      label: 'nous, present',
      form: 'parlons',
      practiceSetId: 'set-1',
      assignmentId: 'assignment-1',
      assignmentRevision: 2,
      enrolledAt: 1_000,
      reviews: 0,
      reviewHistory: [],
    });

    const second = enrollFormReview(first, { ...privateItem, note: 'updated note' }, 'French', {
      practiceSetId: 'set-2',
    }, 2_000);
    expect(second.formReviews).toHaveLength(1);
    expect(second.formReviews[0]).toMatchObject({ enrolledAt: 1_000, note: 'updated note', practiceSetId: 'set-2' });
    const serialized = JSON.stringify(second.formReviews);
    for (const secret of ['PRIVATE-TYPED-ANSWER', 'PRIVATE-ACTUAL', 'PRIVATE-TRANSCRIPT', 'PRIVATE-AUDIO']) {
      expect(serialized).not.toContain(secret);
    }
    for (const field of ['typedAnswer', 'actual', 'rawTranscript', 'audioBlob']) {
      expect(second.formReviews[0]).not.toHaveProperty(field);
    }
  });

  it.each(['again', 'hard', 'learning', 'know'])('rates a form with the existing %s interval engine', (rating) => {
    const enrollFormReview = requireHelper('_enrollFormReview');
    const applyFormReviewRating = requireHelper('_applyFormReviewRating');
    const scheduleReview = requireHelper('_scheduleReview');
    const item = formCard();
    const enrolled = enrollFormReview({ formReviews: [] }, item, 'French', { practiceSetId: 'set-1' }, 1_000);
    const before = enrolled.formReviews[0];
    const at = 50_000;
    const expected = scheduleReview(before, rating, at);
    const result = applyFormReviewRating(enrolled, item, 'French', rating, at, { practiceSetId: 'set-1' });
    const persisted = result.progress.formReviews.find((entry) => entry.id === before.id);

    expect(result.record).toMatchObject({
      id: expected.id,
      reviewStage: expected.reviewStage,
      nextReviewAt: expected.nextReviewAt,
      lastReviewedAt: expected.lastReviewedAt,
      lastRating: expected.lastRating,
      lapses: expected.lapses,
      reviews: expected.reviews,
    });
    expect(persisted).toMatchObject({
      reviewStage: expected.reviewStage,
      nextReviewAt: expected.nextReviewAt,
      lastReviewedAt: at,
      lastRating: rating,
      reviews: 1,
    });
    expect(persisted.reviewHistory[0]).toEqual(expected.reviewHistory[0]);
  });

  it('changes only the rated form and rejects an invalid rating without mutation', () => {
    const enrollFormReview = requireHelper('_enrollFormReview');
    const applyFormReviewRating = requireHelper('_applyFormReviewRating');
    const firstItem = formCard();
    const secondItem = formCard({ formId: 'form-vous-present', label: 'vous, present', form: 'parlez' });
    let progress = enrollFormReview({ saved: [{ id: 'unrelated-word' }], formReviews: [] }, firstItem, 'French', {}, 100);
    progress = enrollFormReview(progress, secondItem, 'French', {}, 200);
    const secondBefore = progress.formReviews.find((entry) => entry.formId === secondItem.formId);

    const rated = applyFormReviewRating(progress, firstItem, 'French', 'know', 5_000, {});
    const secondAfter = rated.progress.formReviews.find((entry) => entry.formId === secondItem.formId);
    expect(secondAfter).toEqual(secondBefore);
    expect(rated.progress.saved).toEqual(progress.saved);
    expect(rated.progress.formReviews.find((entry) => entry.formId === firstItem.formId)).toMatchObject({
      lastRating: 'know', reviews: 1, lastReviewedAt: 5_000,
    });

    const invalid = applyFormReviewRating(progress, firstItem, 'French', 'mastered', 6_000, {});
    expect(invalid).toEqual({ progress, record: null });
  });

  it('bounds and sanitizes persisted form schedules, including the legacy alias', () => {
    const normalizeFormReviews = requireHelper('_normalizeFormReviews');
    const maxFormReviews = requirePositiveInteger('_maxFormReviews');
    const oversized = Array.from({ length: maxFormReviews + 25 }, (_, index) => ({
      language: 'French',
      wordId: `word-${index}`,
      formId: `form-${index}`,
      base: `base ${index}`,
      meaning: `meaning ${index}`,
      label: `label ${index}`,
      form: `form value ${index}`,
      enrolledAt: index,
      typedAnswer: `PRIVATE-TYPED-${index}`,
      rawTranscript: `PRIVATE-TRANSCRIPT-${index}`,
    }));
    const bounded = normalizeFormReviews(oversized);
    expect(bounded).toHaveLength(maxFormReviews);
    expect(new Set(bounded.map((entry) => entry.id)).size).toBe(maxFormReviews);
    expect(JSON.stringify(bounded)).not.toContain('PRIVATE-TYPED-');
    expect(JSON.stringify(bounded)).not.toContain('PRIVATE-TRANSCRIPT-');

    const [sanitized] = normalizeFormReviews([{
      language: 'French',
      base: 'parler',
      form: 'parlons',
      label: 'x'.repeat(500),
      enrolledAt: Number.POSITIVE_INFINITY,
      nextReviewAt: Number.POSITIVE_INFINITY,
      reviews: Number.POSITIVE_INFINITY,
      lapses: -20,
      reviewStage: 99,
      lastReviewedAt: Number.NaN,
      lastRating: 'mastered',
      reviewHistory: [{ at: 10, rating: 'know', interval: 20, stage: 2 }, { at: -1, rating: 'invalid' }],
      actual: 'PRIVATE-ACTUAL',
      rawTranscript: 'PRIVATE-RAW-TRANSCRIPT',
    }]);
    expect(sanitized.label.length).toBeLessThanOrEqual(160);
    for (const field of ['enrolledAt', 'nextReviewAt', 'reviews', 'lapses', 'lastReviewedAt']) {
      expect(Number.isFinite(sanitized[field]), `${field} must be finite`).toBe(true);
      expect(sanitized[field]).toBeGreaterThanOrEqual(0);
    }
    expect(sanitized).toMatchObject({ reviewStage: 5, lastRating: '' });
    expect(sanitized.reviewHistory).toEqual([{ at: 10, rating: 'know', interval: 20, stage: 2 }]);
    expect(sanitized).not.toHaveProperty('actual');
    expect(sanitized).not.toHaveProperty('rawTranscript');

    const normalizedProgress = Lingua._normalizeProgress({
      formSchedules: [{ ...formCard(), language: 'French', typedAnswer: 'PRIVATE-LEGACY-TYPED', rawTranscript: 'PRIVATE-LEGACY-TRANSCRIPT' }],
    });
    expect(normalizedProgress.formReviews).toHaveLength(1);
    expect(normalizedProgress).not.toHaveProperty('formSchedules');
    expect(JSON.stringify(normalizedProgress)).not.toContain('PRIVATE-LEGACY-');
  });

  it('migrates legacy backups to sanitized formReviews and rejects future versions', () => {
    const createBackup = requireHelper('_createBackup');
    const parseBackup = requireHelper('_parseBackup');
    const current = createBackup(
      { known: 'English', target: 'French', level: 'Beginner' },
      { saved: [], formReviews: [] },
      {}, {}, {}, 10_000, [], {},
    );
    expect(current.version).toBeGreaterThanOrEqual(4);

    const legacy = JSON.parse(JSON.stringify(current));
    legacy.version = 3;
    delete legacy.progress.formReviews;
    legacy.progress.formSchedules = [{
      ...formCard(),
      language: 'French',
      enrolledAt: 123,
      typedAnswer: 'PRIVATE-BACKUP-TYPED',
      rawTranscript: 'PRIVATE-BACKUP-TRANSCRIPT',
    }];
    const migrated = parseBackup(JSON.stringify(legacy));
    expect(migrated).not.toBeNull();
    expect(migrated.version).toBe(current.version);
    expect(migrated.progress.formReviews).toHaveLength(1);
    expect(migrated.progress.formReviews[0]).toMatchObject({ language: 'French', base: 'parler', form: 'parlons' });
    expect(migrated.progress).not.toHaveProperty('formSchedules');
    expect(JSON.stringify(migrated)).not.toContain('PRIVATE-BACKUP-');

    const versionOne = JSON.parse(JSON.stringify(current));
    versionOne.version = 1;
    versionOne.progress = { saved: [] };
    expect(parseBackup(versionOne).progress.formReviews).toEqual([]);

    const future = { ...current, version: current.version + 1 };
    expect(parseBackup(future)).toBeNull();
  });
});
