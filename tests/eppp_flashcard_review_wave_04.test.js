import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const json = (name) => JSON.parse(fs.readFileSync(resolve(root, name), 'utf8'));
const text = (name) => fs.readFileSync(resolve(root, name), 'utf8');

describe('EPPP flashcard review wave 04', () => {
  it('reviews and dispositions every remaining legacy card across all domains', () => {
    const earlierIds = new Set([1, 2, 3].flatMap((number) => json(`test_prep/eppp_flashcard_review_wave_0${number}.json`).items).map((item) => item.id));
    const wave = json('test_prep/eppp_flashcard_review_wave_04.json');
    const ids = wave.items.map((item) => item.id);

    expect(wave.status).toBe('assisted-editorial-review-complete-expert-pending');
    expect(wave.reviewDate).toBe('2026-07-15');
    expect(wave.summary).toMatchObject({
      reviewedFlashcards: 106,
      domainsRepresented: 8,
      distinctNamedSources: 28,
      revisedFlashcards: 106,
      independentExpertValidated: 0,
      learnerVisible: 0,
      previouslySourceReviewed: 309,
      sourceReviewedAfterIntegration: 415,
      remainingFirstPass: 0,
      retainedAfterReview: 27,
      retiredAsRedundant: 79,
    });
    expect(wave.items).toHaveLength(106);
    expect(new Set(ids).size).toBe(106);
    expect(ids.every((id) => !earlierIds.has(id))).toBe(true);
    expect(Object.values(wave.domainBreakdown).reduce((sum, entry) => sum + entry.reviewed, 0)).toBe(106);
    expect(wave.items.every((item) => item.revisionApplied)).toBe(true);
    expect(wave.items.every((item) => ['retain-after-rewrite', 'retire-redundant'].includes(item.contentDisposition))).toBe(true);
    expect(wave.items.every((item) => item.independentExpertStatus === 'not-started')).toBe(true);
    expect(wave.items.every((item) => item.learnerVisible === false)).toBe(true);
  });

  it('keeps complete source and review records for retained and retired content', () => {
    const wave = json('test_prep/eppp_flashcard_review_wave_04.json');
    for (const item of wave.items) {
      expect(item.front.length).toBeGreaterThanOrEqual(8);
      expect(item.back.length).toBeGreaterThanOrEqual(40);
      expect(item.back.length).toBeLessThanOrEqual(900);
      expect(item.front !== item.legacyFront || item.back !== item.legacyBack).toBe(true);
      expect(item.revisionReason.length).toBeGreaterThanOrEqual(60);
      expect(item.reviewStatus).toBe('source-reviewed-editorial-pass');
      expect(item.reviewNote).toMatch(/Independent qualified expert validation remains pending\.$/);
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

  it('completes first-pass integration without making retired cards release candidates', () => {
    const wave = json('test_prep/eppp_flashcard_review_wave_04.json');
    const library = json('test_prep/eppp_learning_library.json');
    const cards = new Map(library.flashcards.map((card) => [card.id, card]));

    expect(library.summary).toMatchObject({
      flashcards: 415,
      sourceReviewedFlashcards: 415,
      retainedReviewedFlashcards: 336,
      retiredRedundantFlashcards: 79,
    });
    expect(library.flashcards.filter((card) => card.reviewStatus === 'review-required')).toHaveLength(0);
    expect(library.flashcards.filter((card) => card.contentDisposition === 'retire-redundant')).toHaveLength(79);
    expect(library.flashcards.filter((card) => card.contentDisposition === 'retire-redundant').every((card) => card.learnerVisible === false)).toBe(true);
    for (const item of wave.items) {
      expect(cards.get(item.id)).toMatchObject({
        front: item.front,
        back: item.back,
        reviewWave: 'eppp-flashcard-review-wave-04',
        reviewArtifact: 'eppp_flashcard_review_wave_04.json',
        contentDisposition: item.contentDisposition,
        independentExpertStatus: 'not-started',
        learnerVisible: false,
      });
    }
  });

  it('keeps source and deployment companions identical without internal QA slogans', () => {
    for (const name of ['eppp_flashcard_review_wave_04.json', 'eppp_flashcard_review_wave_04.md', 'eppp_learning_library.json', 'eppp_learning_library_qa.json']) {
      const source = text(`test_prep/${name}`);
      expect(text(`desktop/web-app/public/test_prep/${name}`)).toBe(source);
      expect(source).not.toMatch(/Content QA passed/i);
    }
    for (const name of ['content_inventory.json', 'content_inventory.md']) {
      expect(text(`desktop/web-app/public/test_prep/eppp_legacy/${name}`)).toBe(text(`test_prep/eppp_legacy/${name}`));
    }
  });
});
