import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(resolve(root, relativePath), 'utf8'));
const readText = (relativePath) => fs.readFileSync(resolve(root, relativePath), 'utf8');
const unstableReviewedText = /\b(?:tarasoff|subpoena|court order|goldwater|psypact|hipaa|dsm(?:-?5(?:-?tr)?)?|mandatory reporting|duty to warn|black box|fda|dosage)\b/i;

describe('EPPP flashcard review wave 01', () => {
  it('reviews 100 unique cards across all eight domains without releasing them', () => {
    const wave = readJson('test_prep/eppp_flashcard_review_wave_01.json');
    const ids = wave.items.map((item) => item.id);

    expect(wave.status).toBe('assisted-editorial-review-complete-expert-pending');
    expect(wave.reviewDate).toBe('2026-07-14');
    expect(wave.summary.reviewedFlashcards).toBe(100);
    expect(wave.summary.domainsRepresented).toBe(8);
    expect(wave.summary.revisedFlashcards).toBeGreaterThanOrEqual(80);
    expect(wave.summary.independentExpertValidated).toBe(0);
    expect(wave.summary.learnerVisible).toBe(0);
    expect(wave.items).toHaveLength(100);
    expect(new Set(ids).size).toBe(100);
    expect(Object.values(wave.domainBreakdown).reduce((sum, entry) => sum + entry.reviewed, 0)).toBe(100);
    expect(wave.items.every((item) => item.independentExpertStatus === 'not-started')).toBe(true);
    expect(wave.items.every((item) => item.productionStatus === 'not-production-validated')).toBe(true);
    expect(wave.items.every((item) => item.learnerVisible === false)).toBe(true);
  });

  it('requires a focused template, explicit revisions, and full reputable-source details', () => {
    const wave = readJson('test_prep/eppp_flashcard_review_wave_01.json');

    for (const item of wave.items) {
      expect(item.front.length).toBeGreaterThanOrEqual(8);
      expect(item.front.length).toBeLessThanOrEqual(220);
      expect(item.back.length).toBeGreaterThanOrEqual(20);
      expect(item.back.length).toBeLessThanOrEqual(900);
      expect(unstableReviewedText.test(`${item.front} ${item.back}`)).toBe(false);
      expect(item.reviewStatus).toBe('source-reviewed-editorial-pass');
      expect(item.reviewMode).toBe('assisted-flashcard-editorial-review');
      expect(item.reviewNote).toMatch(/Independent qualified expert validation remains pending\.$/);
      expect(item.references).toHaveLength(1);
      expect(item.sourceDetails).toHaveLength(1);
      const source = item.sourceDetails[0];
      expect(source.title.length).toBeGreaterThanOrEqual(12);
      expect(source.organization.length).toBeGreaterThanOrEqual(12);
      expect(source.url).toMatch(/^https:\/\//);
      expect(source.credibility.length).toBeGreaterThanOrEqual(120);
      expect(item.references).toEqual([source.url]);
      expect(item.checks.atomicAnswer).toBe('editorial-pass');
      expect(item.checks.sourceSupport).toBe('topically-aligned-reputable-source');
      expect(item.checks.duplication).toBe('editorial-pass');
      if (item.revisionApplied) {
        expect(item.revisionReason.length).toBeGreaterThanOrEqual(30);
        expect(item.front !== item.legacyFront || item.back !== item.legacyBack).toBe(true);
      }
    }
  });

  it('integrates the revised records into the reusable library while retaining the expert gate', () => {
    const wave = readJson('test_prep/eppp_flashcard_review_wave_01.json');
    const library = readJson('test_prep/eppp_learning_library.json');
    const cardsById = new Map(library.flashcards.map((card) => [card.id, card]));

    expect(library.summary.flashcards).toBe(415);
    expect(library.summary.sourceReviewedFlashcards).toBe(415);
    expect(wave.summary.previouslySourceReviewed).toBe(9);
    expect(wave.summary.sourceReviewedAfterIntegration).toBe(109);
    expect(wave.summary.remainingFirstPass).toBe(306);
    for (const item of wave.items) {
      const card = cardsById.get(item.id);
      expect(card).toBeTruthy();
      expect(card.front).toBe(item.front);
      expect(card.back).toBe(item.back);
      expect(card.reviewWave).toBe(item.reviewWave);
      expect(card.reviewArtifact).toBe('eppp_flashcard_review_wave_01.json');
      expect(card.sourceDetails).toEqual(item.sourceDetails);
      expect(card.independentExpertStatus).toBe('not-started');
      expect(card.learnerVisible).toBe(false);
    }
  });

  it('keeps generated source and deployment companions identical and omits internal QA slogans', () => {
    const names = [
      'eppp_flashcard_review_wave_01.json',
      'eppp_flashcard_review_wave_01.md',
      'eppp_learning_library.json',
      'eppp_learning_library_qa.json',
    ];
    for (const name of names) {
      const source = readText(`test_prep/${name}`);
      expect(readText(`desktop/web-app/public/test_prep/${name}`)).toBe(source);
      expect(source).not.toMatch(/Content QA passed/i);
    }

    for (const name of ['content_inventory.json', 'content_inventory.md']) {
      expect(readText(`desktop/web-app/public/test_prep/eppp_legacy/${name}`)).toBe(readText(`test_prep/eppp_legacy/${name}`));
    }
  });
});
