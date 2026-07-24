import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(resolve(root, relativePath), 'utf8'));
const readText = (relativePath) => fs.readFileSync(resolve(root, relativePath), 'utf8');
const unstableText = /\b(?:current|recent|dsm(?:-?5(?:-?tr)?)?|law|legal|statute|court|hipaa|licens\w*|mandat\w*|report(?:ing)?|tarasoff|goldwater|subpoena|abuse|neglect|retention|privilege|prescriptive authority)\b/i;

describe('EPPP bulk editorial review wave 01', () => {
  it('reviews 500 additional unique candidates in five balanced sets without releasing them', () => {
    const wave = readJson('test_prep/eppp_legacy/bulk_review_wave_01.json');
    const nativeIds = new Set(readJson('test_prep/eppp_native_qa.json').items.map((item) => item.legacySourceId).filter(Boolean));
    const highTouchIds = new Set(readJson('test_prep/eppp_legacy/adjudication_index.json').items.map((item) => item.legacyId));
    const ids = wave.items.map((item) => item.legacyId);

    expect(wave.status).toBe('assisted-editorial-review-complete-still-quarantined');
    expect(wave.sourceReviewDate).toBe('2026-07-14');
    expect(wave.summary.reviewedCandidates).toBe(500);
    expect(wave.summary.reviewSets).toBe(5);
    expect(wave.summary.itemsPerSet).toBe(100);
    expect(wave.summary.minorRevisionProposals + wave.summary.majorRewriteProposals).toBe(500);
    expect(wave.summary.promotedToNativeBank).toBe(0);
    expect(wave.summary.independentExpertValidated).toBe(0);
    expect(wave.items).toHaveLength(500);
    expect(new Set(ids).size).toBe(500);
    expect(wave.items.some((item) => nativeIds.has(item.legacyId) || highTouchIds.has(item.legacyId))).toBe(false);
    expect(wave.items.every((item) => item.workflowStage === 'editorial-reviewed-quarantine' && item.learnerVisibleInNativeBank === false)).toBe(true);
    expect(wave.items.every((item) => item.independentExpertStatus === 'not-started' && item.productionStatus === 'not-production-validated')).toBe(true);
  });

  it('excludes unstable claims and requires complete question, feedback, and provenance templates', () => {
    const wave = readJson('test_prep/eppp_legacy/bulk_review_wave_01.json');
    for (const item of wave.items) {
      const revised = item.revisedItem;
      expect(unstableText.test(`${item.originalPrompt} ${revised.choices.join(' ')} ${revised.rationale}`)).toBe(false);
      expect(revised.choices).toHaveLength(4);
      expect(new Set(revised.choices).size).toBe(4);
      expect(revised.answerIndex).toBeGreaterThanOrEqual(0);
      expect(revised.answerIndex).toBeLessThanOrEqual(3);
      expect(revised.rationale.length).toBeGreaterThanOrEqual(140);
      expect(revised.rationale).not.toMatch(/^(?:correct(?: answer)?|answer)\s*:?\s*(?:\([A-D]\)|[A-D][).:\-])/i);
      expect(revised.choiceRationales).toHaveLength(4);
      expect(revised.choiceRationales.every((value) => value.length >= 90)).toBe(true);
      expect(revised.sourceDetails.length).toBeGreaterThan(0);
      for (const source of revised.sourceDetails) {
        expect(source.title.length).toBeGreaterThanOrEqual(12);
        expect(source.organization.length).toBeGreaterThanOrEqual(12);
        expect(source.url).toMatch(/^https:\/\//);
        expect(source.credibility.length).toBeGreaterThanOrEqual(120);
      }
    }
  });

  it('keeps each set at 100 items with exactly 25 answers in every position', () => {
    const wave = readJson('test_prep/eppp_legacy/bulk_review_wave_01.json');
    for (let setNumber = 1; setNumber <= 5; setNumber += 1) {
      const suffix = String(setNumber).padStart(2, '0');
      const report = readJson(`test_prep/eppp_legacy/bulk_review_wave_01_set_${suffix}.json`);
      const waveItems = wave.items.filter((item) => item.reviewSet === setNumber);
      expect(report.items).toHaveLength(100);
      expect(report.items.map((item) => item.legacyId)).toEqual(waveItems.map((item) => item.legacyId));
      expect(report.summary.answerPositions).toEqual({ A: 25, B: 25, C: 25, D: 25 });
      expect(report.summary.learnerVisibleItems).toBe(0);
      expect(report.summary.independentExpertValidated).toBe(0);
    }
  });

  it('reports 920 legacy questions without an editorial review after this wave', () => {
    const progress = readJson('test_prep/eppp_legacy/review_progress.json');
    expect(progress.summary).toEqual({
      legacyUniverse: 2933,
      nativeEditorialLegacyItems: 1443,
      highTouchAdjudicatedQuarantined: 70,
      assistedEditorialReviewedQuarantined: 500,
      uniqueLegacyItemsWithEditorialReview: 2013,
      remainingWithoutEditorialReview: 920,
      quarantinedLegacyItems: 1490,
      quarantinedItemsWithEditorialReview: 570,
      independentExpertValidated: 0,
    });
  });

  it('keeps every generated deployment artifact identical to its source companion', () => {
    const names = ['bulk_review_wave_01.json', 'bulk_review_wave_01.md', 'review_progress.json', 'review_progress.md'];
    for (let setNumber = 1; setNumber <= 5; setNumber += 1) {
      const suffix = String(setNumber).padStart(2, '0');
      names.push(`bulk_review_wave_01_set_${suffix}.json`, `bulk_review_wave_01_set_${suffix}.md`);
    }
    for (const name of names) {
      expect(readText(`desktop/web-app/public/test_prep/eppp_legacy/${name}`)).toBe(readText(`test_prep/eppp_legacy/${name}`));
    }
  });
});
