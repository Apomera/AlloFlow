import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let Hub;
let packIdentity;
let learnerIdentity;

const pack = {
  id: 'learner-revision-fixture',
  version: '2026.2',
  title: 'Learner revision fixture',
  shortTitle: 'Learner fixture',
  status: 'ready',
  batchSize: 1,
  domains: [{ id: 'general', label: 'General', weight: 1 }],
  items: [{ id: 'question-1', domainId: 'general', prompt: 'Question?', choices: ['Yes', 'No'], answerIndex: 0 }],
};

const manifestEntry = {
  id: pack.id,
  version: pack.version,
  loadMode: 'lazy',
  sha256: 'a'.repeat(64),
  learningLibrarySha256: 'b'.repeat(64),
};

beforeAll(() => {
  window.React = window.React || {
    useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
    useEffect: () => {},
    useRef: () => ({ current: null }),
    createElement: () => null,
    Fragment: 'fragment',
  };
  loadAlloModule('test_prep_hub_module.js');
  Hub = window.AlloModules.TestPrepHub;
  packIdentity = Hub.resolvePackContentIdentity(pack, manifestEntry);
  learnerIdentity = Hub.resolveLearnerDataIdentity(pack, manifestEntry);
});

describe('Test Prep revision-scoped learner data', () => {
  it('binds learning records to both the pack and learning-library revision', () => {
    expect(packIdentity.packContentFingerprint).toBe(`sha256:${'a'.repeat(64)}`);
    expect(learnerIdentity).toMatchObject({ packVersion: pack.version });
    expect(learnerIdentity.packContentFingerprint).toMatch(/^tp-content-v1:[a-f0-9]{32}$/);
    expect(learnerIdentity.packContentFingerprint).not.toBe(packIdentity.packContentFingerprint);

    const revisedLibrary = Hub.resolveLearnerDataIdentity(pack, {
      ...manifestEntry,
      learningLibrarySha256: 'c'.repeat(64),
    });
    expect(revisedLibrary.packContentFingerprint).not.toBe(learnerIdentity.packContentFingerprint);
  });

  it('retains legacy saved-review links while exposing only exact-revision links', () => {
    const legacy = Hub.normalizeReviewItems({ [pack.id]: ['question-1'] });
    expect(Hub.reviewItemsForPack(legacy, pack.id, packIdentity)).toEqual([]);
    expect(Hub.retainedReviewItemCount(legacy, pack.id, packIdentity)).toBe(1);

    const updated = Hub.setReviewItemsForPack(legacy, pack.id, packIdentity, ['question-1']);
    expect(updated).toMatchObject({ schemaVersion: 2 });
    expect(updated.scopes).toHaveLength(2);
    expect(Hub.reviewItemsForPack(updated, pack.id, packIdentity)).toEqual(['question-1']);
    expect(Hub.retainedReviewItemCount(updated, pack.id, packIdentity)).toBe(1);
  });

  it('separates current annotations from retained annotations', () => {
    const legacy = Hub.normalizeAnnotations({ records: [{ id: 'legacy-note', packId: pack.id, text: 'Legacy note' }] });
    const withCurrent = Hub.upsertAnnotation(legacy, {
      id: 'current-note',
      packId: pack.id,
      text: 'Current note',
      ...learnerIdentity,
    }, 100);

    expect(Hub.annotationsForPack(withCurrent, pack.id, learnerIdentity).map((record) => record.id)).toEqual(['current-note']);
    expect(Hub.retainedAnnotationCount(withCurrent, pack.id, learnerIdentity)).toBe(1);
  });

  it('keeps legacy flashcard and chapter progress without applying it to revised content', () => {
    const legacyFlashcards = Hub.normalizeFlashcardStore({
      'legacy-card': { rating: 'know', repetitions: 1, intervalDays: 1, lastReviewedAt: 10, dueAt: 20 },
    }, pack.id);
    expect(Hub.flashcardScheduleForPack(legacyFlashcards, pack.id, learnerIdentity)).toEqual({});
    expect(Hub.retainedFlashcardCount(legacyFlashcards, pack.id, learnerIdentity)).toBe(1);

    const currentFlashcards = Hub.setFlashcardScheduleForPack(legacyFlashcards, pack.id, learnerIdentity, {
      'current-card': { rating: 'learning', repetitions: 1, intervalDays: 1, lastReviewedAt: 30, dueAt: 40 },
    });
    expect(Hub.flashcardScheduleForPack(currentFlashcards, pack.id, learnerIdentity)).toHaveProperty('current-card');
    expect(Hub.retainedFlashcardCount(currentFlashcards, pack.id, learnerIdentity)).toBe(1);

    const legacyChapters = Hub.normalizeChapterProgressStore({ 'legacy-section': true });
    expect(Hub.chapterProgressForPack(legacyChapters, 'eppp-part-one', learnerIdentity)).toEqual({});
    expect(Hub.retainedChapterProgressCount(legacyChapters, 'eppp-part-one', learnerIdentity)).toBe(1);

    const currentChapters = Hub.setChapterProgressForPack(legacyChapters, 'eppp-part-one', learnerIdentity, { 'current-section': true });
    expect(Hub.chapterProgressForPack(currentChapters, 'eppp-part-one', learnerIdentity)).toEqual({ 'current-section': true });
    expect(Hub.retainedChapterProgressCount(currentChapters, 'eppp-part-one', learnerIdentity)).toBe(1);
  });

  it('round-trips scoped learner data in schema 4 and treats schema 3 annotations/reviews as legacy', () => {
    const reviews = Hub.setReviewItemsForPack({}, pack.id, packIdentity, ['question-1']);
    const annotations = Hub.upsertAnnotation({}, { id: 'note-1', packId: pack.id, text: 'Portable current note', ...learnerIdentity }, 100);
    const flashcardStore = Hub.setFlashcardScheduleForPack({}, pack.id, learnerIdentity, {
      'card-1': { rating: 'know', repetitions: 1, intervalDays: 1, lastReviewedAt: 10, dueAt: 20 },
    });
    const chapterProgress = Hub.setChapterProgressForPack({}, pack.id, learnerIdentity, { 'section-1': true });
    const payload = Hub.exportProgress({ attempts: [] }, reviews, 500, {
      annotations,
      flashcardStores: { byPack: { [pack.id]: flashcardStore } },
      chapterProgress,
    });
    const restored = Hub.importProgress(payload);

    expect(payload.schemaVersion).toBe(4);
    expect(Hub.reviewItemsForPack(restored.reviewItems, pack.id, packIdentity)).toEqual(['question-1']);
    expect(Hub.annotationsForPack(restored.annotations, pack.id, learnerIdentity)).toHaveLength(1);
    expect(restored.flashcardStores.byPack[pack.id]).toBeTruthy();
    expect(Hub.chapterProgressForPack(restored.chapterProgress, pack.id, learnerIdentity)).toEqual({ 'section-1': true });

    const legacy = Hub.importProgress({
      schemaVersion: 3,
      kind: 'alloflow-test-prep-progress',
      progress: { attempts: [] },
      reviewItems: { [pack.id]: ['question-1'] },
      annotations: { records: [{ id: 'forged-current', packId: pack.id, text: 'Old note', ...learnerIdentity }] },
    });
    expect(Hub.reviewItemsForPack(legacy.reviewItems, pack.id, packIdentity)).toEqual([]);
    expect(Hub.retainedReviewItemCount(legacy.reviewItems, pack.id, packIdentity)).toBe(1);
    expect(Hub.annotationsForPack(legacy.annotations, pack.id, learnerIdentity)).toEqual([]);
    expect(Hub.retainedAnnotationCount(legacy.annotations, pack.id, learnerIdentity)).toBe(1);
    expect(legacy.flashcardStores).toBeNull();
    expect(legacy.chapterProgress).toBeNull();
  });
});
