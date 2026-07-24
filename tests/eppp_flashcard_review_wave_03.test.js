import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const json = (name) => JSON.parse(fs.readFileSync(resolve(root, name), 'utf8'));
const text = (name) => fs.readFileSync(resolve(root, name), 'utf8');

describe('EPPP flashcard review wave 03', () => {
  it('rewrites 100 new cards across all domains without releasing them', () => {
    const earlierIds = new Set([
      ...json('test_prep/eppp_flashcard_review_wave_01.json').items,
      ...json('test_prep/eppp_flashcard_review_wave_02.json').items,
    ].map((item) => item.id));
    const wave = json('test_prep/eppp_flashcard_review_wave_03.json');
    const ids = wave.items.map((item) => item.id);

    expect(wave.status).toBe('assisted-editorial-review-complete-expert-pending');
    expect(wave.reviewDate).toBe('2026-07-15');
    expect(wave.summary).toMatchObject({
      reviewedFlashcards: 100,
      domainsRepresented: 8,
      distinctNamedSources: 29,
      revisedFlashcards: 100,
      independentExpertValidated: 0,
      learnerVisible: 0,
      previouslySourceReviewed: 209,
      sourceReviewedAfterIntegration: 309,
      remainingFirstPass: 106,
    });
    expect(wave.items).toHaveLength(100);
    expect(new Set(ids).size).toBe(100);
    expect(ids.every((id) => !earlierIds.has(id))).toBe(true);
    expect(Object.values(wave.domainBreakdown).reduce((sum, entry) => sum + entry.reviewed, 0)).toBe(100);
    expect(wave.items.every((item) => item.revisionApplied)).toBe(true);
    expect(wave.items.every((item) => item.independentExpertStatus === 'not-started')).toBe(true);
    expect(wave.items.every((item) => item.productionStatus === 'not-production-validated')).toBe(true);
    expect(wave.items.every((item) => item.learnerVisible === false)).toBe(true);
  });

  it('uses focused wording and complete reputable-source records', () => {
    const wave = json('test_prep/eppp_flashcard_review_wave_03.json');
    for (const item of wave.items) {
      expect(item.front.length).toBeGreaterThanOrEqual(8);
      expect(item.front.length).toBeLessThanOrEqual(220);
      expect(item.back.length).toBeGreaterThanOrEqual(40);
      expect(item.back.length).toBeLessThanOrEqual(900);
      expect(item.front !== item.legacyFront || item.back !== item.legacyBack).toBe(true);
      expect(item.reviewStatus).toBe('source-reviewed-editorial-pass');
      expect(item.reviewNote).toMatch(/Independent qualified expert validation remains pending\.$/);
      expect(item.revisionReason.length).toBeGreaterThanOrEqual(30);
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

  it('integrates into the reusable library while retaining expert gates', () => {
    const wave = json('test_prep/eppp_flashcard_review_wave_03.json');
    const library = json('test_prep/eppp_learning_library.json');
    const cards = new Map(library.flashcards.map((card) => [card.id, card]));
    expect(library.summary.sourceReviewedFlashcards).toBe(415);
    expect(library.flashcards.filter((card) => card.reviewStatus === 'review-required')).toHaveLength(0);
    for (const item of wave.items) {
      const card = cards.get(item.id);
      expect(card).toMatchObject({
        front: item.front,
        back: item.back,
        reviewWave: 'eppp-flashcard-review-wave-03',
        reviewArtifact: 'eppp_flashcard_review_wave_03.json',
        independentExpertStatus: 'not-started',
        learnerVisible: false,
      });
      expect(card.sourceDetails).toEqual(item.sourceDetails);
    }
  });

  it('keeps source and deployment companions identical without internal QA slogans', () => {
    for (const name of ['eppp_flashcard_review_wave_03.json', 'eppp_flashcard_review_wave_03.md', 'eppp_learning_library.json', 'eppp_learning_library_qa.json']) {
      const source = text(`test_prep/${name}`);
      expect(text(`desktop/web-app/public/test_prep/${name}`)).toBe(source);
      expect(source).not.toMatch(/Content QA passed/i);
    }
    for (const name of ['content_inventory.json', 'content_inventory.md']) {
      expect(text(`desktop/web-app/public/test_prep/eppp_legacy/${name}`)).toBe(text(`test_prep/eppp_legacy/${name}`));
    }
  });
});
