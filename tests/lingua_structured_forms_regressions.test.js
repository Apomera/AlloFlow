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

function helper(name) {
  const value = Lingua && Lingua[name];
  expect(typeof value, `${name} must remain exported for structured-form regressions`).toBe('function');
  return value;
}

function structuredLesson() {
  return {
    title: 'Flexible French forms',
    goal: 'Use related forms in context.',
    scenario: 'Describing past events and people.',
    vocabulary: [
      {
        id: 'word-parler',
        term: 'parler',
        meaning: 'to speak',
        features: [{ id: 'feature-word-class', label: 'word class', value: 'verb' }],
        forms: [
          {
            schemaVersion: 2,
            id: 'form-imperfect-first',
            label: 'ongoing past, first person',
            form: 'parlais',
            pronunciation: 'par-LEH',
            note: 'Used for an ongoing or repeated past action.',
            example: 'Je parlais avec mon ami.',
            examplePronunciation: 'zhuh par-LEH ah-VEK mon ah-MEE',
            translation: 'I was speaking with my friend.',
            includeInPractice: true,
            features: [
              { id: 'feature-tense-imperfect', label: 'tense', value: 'imperfect' },
              { id: 'feature-person-first', label: 'person', value: 'first' },
              { id: 'feature-number-singular', label: 'number', value: 'singular' },
            ],
          },
          {
            schemaVersion: 2,
            id: 'form-past-participle',
            label: 'past participle',
            form: 'parlé',
            pronunciation: 'par-LAY',
            note: 'Used in compound past forms.',
            example: "J'ai parlé.",
            examplePronunciation: 'zhay par-LAY',
            translation: 'I spoke.',
            includeInPractice: true,
            features: [{ id: 'feature-form-participle', label: 'form type', value: 'participle' }],
          },
        ],
      },
      {
        id: 'word-heureux',
        term: 'heureux',
        meaning: 'happy',
        forms: [
          {
            schemaVersion: 2,
            id: 'form-feminine',
            label: 'feminine singular',
            form: 'heureuse',
            pronunciation: 'uh-RUHZ',
            note: 'Agrees with a feminine singular noun.',
            includeInPractice: true,
            features: [
              { id: 'feature-gender-feminine', label: 'gender', value: 'feminine' },
              { id: 'feature-number-singular-2', label: 'number', value: 'singular' },
            ],
          },
        ],
      },
    ],
    phrases: [],
    conversation: [],
  };
}

function practiceSet(now = 100) {
  return helper('_savePracticeSet')(
    [],
    'French',
    structuredLesson(),
    { level: 'Beginner', topic: 'Flexible forms' },
    now,
    'structured-forms-set',
  )[0];
}

describe('Lingua structured vocabulary and form contracts', () => {
  it('includes legacy forms by default and honors an explicit schema-v2 exclusion', () => {
    const normalizeWordForms = helper('_normalizeWordForms');
    const formPracticeItems = helper('_formPracticeItems');

    const legacy = normalizeWordForms([{
      id: 'legacy-form',
      label: 'plural',
      form: 'livres',
      includeInPractice: false,
    }])[0];
    const excluded = normalizeWordForms([{
      schemaVersion: 2,
      id: 'excluded-form',
      label: 'teacher reference only',
      form: 'forme-de-référence',
      includeInPractice: false,
    }])[0];

    expect(legacy).toMatchObject({ schemaVersion: 2, includeInPractice: true });
    expect(excluded).toMatchObject({ schemaVersion: 2, includeInPractice: false });

    const items = formPracticeItems({
      vocabulary: [{
        id: 'word-livre',
        term: 'livre',
        meaning: 'book',
        forms: [legacy, excluded],
      }],
    }, [], 'French', 100);
    expect(items.map((item) => item.form)).toEqual(['livres']);

    const excludedOnly = formPracticeItems({
      vocabulary: [{ id: 'word-reference', term: 'référence', meaning: 'reference', forms: [excluded] }],
    }, [], 'French', 100);
    expect(excludedOnly).toEqual([]);
  });

  it('normalizes arbitrary feature parameters with a strict upper bound', () => {
    const normalizeGrammarFeatures = helper('_normalizeGrammarFeatures');
    const arbitrary = [
      ['tense', 'imperfect'],
      ['gender', 'feminine'],
      ['noun class', 'class 7'],
      ['speaker-to-listener relation', 'honorific'],
      ['evidentiality', 'reported'],
      ['animacy', 'animate'],
      ['script', 'traditional'],
      ['mutation', 'soft'],
      ['polarity', 'negative'],
      ['custom classroom distinction', 'teacher-defined'],
    ].map(([label, value], index) => ({ id: `feature-${index}`, label, value }));

    const normalized = normalizeGrammarFeatures(arbitrary);
    expect(normalized).toHaveLength(8);
    expect(normalized.map((feature) => feature.label)).toEqual([
      'tense',
      'gender',
      'noun class',
      'speaker-to-listener relation',
      'evidentiality',
      'animacy',
      'script',
      'mutation',
    ]);
    expect(normalized.every((feature) => feature.id && feature.value)).toBe(true);
  });

  it('round-trips lossless form details through the structured JSON adapter', () => {
    const normalizeWordForms = helper('_normalizeWordForms');
    const wordFormsJson = helper('_wordFormsJson');
    const original = structuredLesson().vocabulary[0].forms;

    const normalized = normalizeWordForms(original);
    const restored = normalizeWordForms(JSON.parse(wordFormsJson(normalized)));

    expect(restored).toEqual(normalized);
    expect(restored[0]).toMatchObject({
      schemaVersion: 2,
      id: 'form-imperfect-first',
      pronunciation: 'par-LEH',
      example: 'Je parlais avec mon ami.',
      examplePronunciation: 'zhuh par-LEH ah-VEK mon ah-MEE',
      translation: 'I was speaking with my friend.',
      includeInPractice: true,
      features: [
        { id: 'feature-tense-imperfect', label: 'tense', value: 'imperfect' },
        { id: 'feature-person-first', label: 'person', value: 'first' },
        { id: 'feature-number-singular', label: 'number', value: 'singular' },
      ],
    });
  });

  it('keeps practice identities stable when words and forms are reordered', () => {
    const formPracticeItems = helper('_formPracticeItems');
    const lesson = structuredLesson();
    const reordered = {
      ...lesson,
      vocabulary: [
        lesson.vocabulary[1],
        { ...lesson.vocabulary[0], forms: lesson.vocabulary[0].forms.slice().reverse() },
      ],
    };
    const identityMap = (items) => Object.fromEntries(
      items.map((item) => [`${item.base}::${item.form}`, {
        id: item.id,
        reviewId: item.reviewId,
        wordId: item.wordId,
        formId: item.formId,
      }]),
    );

    const before = identityMap(formPracticeItems(lesson, [], 'French', 100));
    const after = identityMap(formPracticeItems(reordered, [], 'French', 100));

    expect(after).toEqual(before);
    expect(new Set(Object.values(before).map((item) => item.id)).size).toBe(Object.keys(before).length);
  });

  it('exports and imports structured practice sets as version 3 without dropping form data', () => {
    const createPracticeSetExport = helper('_createPracticeSetExport');
    const parsePracticeSetImport = helper('_parsePracticeSetImport');
    const portable = createPracticeSetExport(practiceSet(100), 200);

    expect(portable).toMatchObject({ product: 'AlloFlow Lingua Practice Set', version: 3 });
    const imported = parsePracticeSetImport(JSON.stringify(portable), 300, 'French');
    const form = imported.lesson.vocabulary[0].forms[0];

    expect(imported).toMatchObject({ language: 'French', archived: false, createdAt: 300, updatedAt: 300 });
    expect(form).toMatchObject({
      id: 'form-imperfect-first',
      pronunciation: 'par-LEH',
      example: 'Je parlais avec mon ami.',
      examplePronunciation: 'zhuh par-LEH ah-VEK mon ah-MEE',
      translation: 'I was speaking with my friend.',
      features: expect.arrayContaining([
        { id: 'feature-tense-imperfect', label: 'tense', value: 'imperfect' },
      ]),
    });
  });

  it('accepts version-3 backups and round-trips the current version-4 format', () => {
    const createBackup = helper('_createBackup');
    const parseBackup = helper('_parseBackup');
    const progress = {
      saved: [{
        language: 'French',
        term: 'parler',
        meaning: 'to speak',
        forms: structuredLesson().vocabulary[0].forms,
      }],
    };
    const backup = createBackup(
      { known: 'English', target: 'French', level: 'Beginner' },
      progress,
      {},
      {},
      {},
      400,
      [practiceSet(100)],
      {},
    );

    expect(backup.version).toBe(4);
    const restoredV4 = parseBackup(JSON.stringify(backup));
    const restoredV3 = parseBackup(JSON.stringify({ ...backup, version: 3 }));

    expect(restoredV4).not.toBe(null);
    expect(restoredV3).not.toBe(null);
    expect(restoredV4.version).toBe(4);
    expect(restoredV3.version).toBe(4);
    expect(restoredV4.progress.saved[0].forms[0]).toMatchObject({
      id: 'form-imperfect-first',
      pronunciation: 'par-LEH',
      example: 'Je parlais avec mon ami.',
      features: expect.arrayContaining([
        { id: 'feature-tense-imperfect', label: 'tense', value: 'imperfect' },
      ]),
    });
  });

  it('sanitizes form schedules without retaining raw typed answers or a legacy raw alias', () => {
    const normalizeFormReviews = helper('_normalizeFormReviews');
    const normalizeProgress = helper('_normalizeProgress');
    const secret = 'PRIVATE RAW TYPED ANSWER';
    const rawSchedule = {
      language: 'French',
      wordId: 'word-parler',
      formId: 'form-imperfect-first',
      base: 'parler',
      meaning: 'to speak',
      label: 'ongoing past, first person',
      form: 'parlais',
      typedAnswer: secret,
      rawAnswer: secret,
      actual: secret,
      transcript: secret,
      reviewStage: 1,
      nextReviewAt: 500,
      reviews: 1,
      lastReviewedAt: 400,
      lastRating: 'learning',
      reviewHistory: [{
        at: 400,
        rating: 'learning',
        interval: 100,
        stage: 1,
        typedAnswer: secret,
      }],
    };

    const reviews = normalizeFormReviews([rawSchedule]);
    expect(reviews).toHaveLength(1);
    expect(JSON.stringify(reviews)).not.toContain(secret);

    const progress = normalizeProgress({ formSchedules: [rawSchedule] });
    expect(progress.formReviews).toHaveLength(1);
    expect(progress).not.toHaveProperty('formSchedules');
    expect(JSON.stringify(progress)).not.toContain(secret);
  });
});
