import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = fs.readFileSync(resolve(root, 'test_prep_hub_source.jsx'), 'utf8');

describe('Test Prep learner-data revision source guards', () => {
  it('uses exact revision selectors at every learner-data read and write boundary', () => {
    for (const marker of [
      'testPrepReviewItemsForPack(reviewItems, selectedPack.id, selectedPackContentIdentity)',
      'testPrepSetReviewItemsForPack(reviewItems, selectedPack.id, selectedPackContentIdentity, nextPackItems)',
      'testPrepAnnotationsForPack(annotations, selectedPack.id, selectedLearnerDataIdentity)',
      'testPrepSetFlashcardScheduleForPack(flashcardStore, selectedPack.id, selectedLearnerDataIdentity, next)',
      'testPrepNativeChapterProgressForPack(previousStore, selectedPackContextId, selectedLearnerDataIdentity)',
    ]) expect(source, marker).toContain(marker);
  });

  it('keeps retained records visible as history without applying them to current content', () => {
    expect(source).toContain('saved question link');
    expect(source).toContain('annotation');
    expect(source).toContain('flashcard schedule entr');
    expect(source).toContain('completed section marker');
    expect(source).toContain('They remain in backups but do not affect this revision');
    expect(source).toContain('They remain in backups but are not attached to the current material.');
  });

  it('backs up and restores flashcard schedules and chapter completion under schema 4', () => {
    expect(source).toContain('schemaVersion: 4');
    expect(source).toContain('flashcardStores: normalizeTestPrepFlashcardStores(optional.flashcardStores)');
    expect(source).toContain('chapterProgress: normalizeTestPrepNativeChapterProgressStore(optional.chapterProgress)');
    expect(source).toContain('writeAllTestPrepFlashcardStores(imported.flashcardStores)');
    expect(source).toContain('writeTestPrepNativeChapterProgressStore(imported.chapterProgress)');
  });
});
