import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(resolve(root, relativePath), 'utf8'));
const readText = (relativePath) => fs.readFileSync(resolve(root, relativePath), 'utf8');

describe('EPPP flashcard review wave 02', () => {
  it('reviews and rewrites 100 new cards across all eight domains without releasing them', () => {
    const wave01 = readJson('test_prep/eppp_flashcard_review_wave_01.json');
    const wave02 = readJson('test_prep/eppp_flashcard_review_wave_02.json');
    const wave01Ids = new Set(wave01.items.map((item) => item.id));
    const wave02Ids = wave02.items.map((item) => item.id);

    expect(wave02.status).toBe('assisted-editorial-review-complete-expert-pending');
    expect(wave02.reviewDate).toBe('2026-07-14');
    expect(wave02.summary).toMatchObject({
      reviewedFlashcards: 100,
      domainsRepresented: 8,
      revisedFlashcards: 100,
      independentExpertValidated: 0,
      learnerVisible: 0,
      previouslySourceReviewed: 109,
      sourceReviewedAfterIntegration: 209,
      remainingFirstPass: 206,
    });
    expect(wave02.items).toHaveLength(100);
    expect(new Set(wave02Ids).size).toBe(100);
    expect(wave02Ids.every((id) => !wave01Ids.has(id))).toBe(true);
    expect(Object.values(wave02.domainBreakdown).reduce((sum, entry) => sum + entry.reviewed, 0)).toBe(100);
    expect(wave02.items.every((item) => item.revisionApplied)).toBe(true);
    expect(wave02.items.every((item) => item.independentExpertStatus === 'not-started')).toBe(true);
    expect(wave02.items.every((item) => item.productionStatus === 'not-production-validated')).toBe(true);
    expect(wave02.items.every((item) => item.learnerVisible === false)).toBe(true);
  });

  it('uses focused cards and complete reputable-source records', () => {
    const wave = readJson('test_prep/eppp_flashcard_review_wave_02.json');

    for (const item of wave.items) {
      expect(item.front.length).toBeGreaterThanOrEqual(8);
      expect(item.front.length).toBeLessThanOrEqual(220);
      expect(item.back.length).toBeGreaterThanOrEqual(40);
      expect(item.back.length).toBeLessThanOrEqual(900);
      expect(item.back).not.toBe(item.legacyBack);
      expect(item.reviewStatus).toBe('source-reviewed-editorial-pass');
      expect(item.reviewMode).toBe('assisted-flashcard-editorial-review');
      expect(item.reviewNote).toMatch(/Independent qualified expert validation remains pending\.$/);
      expect(item.revisionReason.length).toBeGreaterThanOrEqual(30);
      expect(item.references).toHaveLength(1);
      expect(item.sourceDetails).toHaveLength(1);
      const source = item.sourceDetails[0];
      expect(source.title.length).toBeGreaterThanOrEqual(12);
      expect(source.organization.length).toBeGreaterThanOrEqual(12);
      expect(source.url).toMatch(/^https:\/\//);
      expect(source.credibility.length).toBeGreaterThanOrEqual(120);
      expect(item.references).toEqual([source.url]);
      expect(item.checks).toMatchObject({
        atomicAnswer: 'editorial-pass',
        sourceSupport: 'topically-aligned-reputable-source',
        duplication: 'editorial-pass',
        accuracyAndCurrency: 'assisted-review-pass-expert-pending',
      });
    }
  });

  it('integrates the revised records into the reusable library while retaining the expert gate', () => {
    const wave = readJson('test_prep/eppp_flashcard_review_wave_02.json');
    const library = readJson('test_prep/eppp_learning_library.json');
    const cardsById = new Map(library.flashcards.map((card) => [card.id, card]));

    expect(library.summary.flashcards).toBe(415);
    expect(library.summary.sourceReviewedFlashcards).toBe(415);
    expect(library.flashcards.filter((card) => card.reviewStatus === 'review-required')).toHaveLength(0);
    for (const item of wave.items) {
      const card = cardsById.get(item.id);
      expect(card).toBeTruthy();
      expect(card.front).toBe(item.front);
      expect(card.back).toBe(item.back);
      expect(card.reviewWave).toBe('eppp-flashcard-review-wave-02');
      expect(card.reviewArtifact).toBe('eppp_flashcard_review_wave_02.json');
      expect(card.sourceDetails).toEqual(item.sourceDetails);
      expect(card.independentExpertStatus).toBe('not-started');
      expect(card.learnerVisible).toBe(false);
    }
  });

  it('keeps source and deployment companions identical and omits internal QA slogans', () => {
    for (const name of [
      'eppp_flashcard_review_wave_02.json',
      'eppp_flashcard_review_wave_02.md',
      'eppp_learning_library.json',
      'eppp_learning_library_qa.json',
    ]) {
      const source = readText(`test_prep/${name}`);
      expect(readText(`desktop/web-app/public/test_prep/${name}`)).toBe(source);
      expect(source).not.toMatch(/Content QA passed/i);
    }

    for (const name of ['content_inventory.json', 'content_inventory.md']) {
      expect(readText(`desktop/web-app/public/test_prep/eppp_legacy/${name}`)).toBe(readText(`test_prep/eppp_legacy/${name}`));
    }
  });
});
