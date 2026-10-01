import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath) => JSON.parse(fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8'));

const expectedIds = [
  'knowledge-check-d335fd83aa8ad97c',
  'knowledge-check-67819ac286663041',
  'knowledge-check-d614ba7edc6af5e5',
  'knowledge-check-97e00d15171c5bbd',
  'knowledge-check-b478e4361ac886f0',
  'knowledge-check-ce66a37e0098d776',
  'knowledge-check-484b1c12245b343b',
  'knowledge-check-80f5b4b1e7021c2f',
  'knowledge-check-d6482e3b3b744d52',
  'knowledge-check-6607bca9f2de16e3',
  'knowledge-check-ed93476d937a6bae',
  'knowledge-check-be3d8ddd0366c457',
].sort();

describe('EPPP knowledge-check source-review wave 08', () => {
  const wave = read('test_prep/eppp_knowledge_check_review_wave_08.json');
  const priorWaves = Array.from({ length: 7 }, (_, index) =>
    read(`test_prep/eppp_knowledge_check_review_wave_0${index + 1}.json`),
  );

  it('adds exactly two unique checks from each target domain with balanced answer positions', () => {
    expect(wave).toMatchObject({
      schemaVersion: 1,
      reviewWave: 'knowledge-check-wave-08',
      reviewDate: '2026-07-28',
    });
    expect(wave.summary).toMatchObject({
      items: 12,
      domains: 6,
      itemsPerDomain: 2,
      sourceReviewedEditorialPass: 12,
      independentExpertReviewPending: 12,
      productionValidationPending: 12,
    });
    expect(wave.items.map((item) => item.legacyId).sort()).toEqual(expectedIds);
    expect(new Set(wave.items.map((item) => item.legacyId)).size).toBe(12);
    expect(Object.values(wave.summary.domainCounts)).toEqual(Array(6).fill(2));
    expect([0, 1, 2, 3].map((position) => wave.items.filter((item) => item.answerIndex === position).length))
      .toEqual([3, 3, 3, 3]);

    const priorIds = new Set(priorWaves.flatMap((priorWave) => priorWave.items.map((item) => item.legacyId)));
    expect(wave.items.some((item) => priorIds.has(item.legacyId))).toBe(false);
  });

  it('documents challenging options, bounded rationales, reputable sources, and explicit review gates', () => {
    for (const item of wave.items) {
      expect(item.legacyId).toMatch(/^knowledge-check-[a-f0-9]{16}$/);
      expect(item.chapterId).toMatch(/^ch-\d+$/);
      expect(item.sectionId).toMatch(/^ch-\d+-section-\d+$/);
      expect(item.prompt.length).toBeGreaterThan(70);
      expect(item.choices).toHaveLength(4);
      expect(new Set(item.choices).size).toBe(4);
      expect(item.choices.every((choice) => choice.length > 55)).toBe(true);
      expect(Number.isInteger(item.answerIndex)).toBe(true);
      expect(item.answerIndex).toBeGreaterThanOrEqual(0);
      expect(item.answerIndex).toBeLessThan(4);
      expect(item.rationale.length).toBeGreaterThan(430);
      expect(item.rationale).not.toMatch(/&(?:mdash|ndash|nbsp|ldquo|rdquo|rsquo);/i);
      expect(item.references).toEqual(item.sourceDetails.map((source) => source.url));
      expect(item.sourceDetails.length).toBeGreaterThanOrEqual(1);
      expect(item.sourceDetails.every((source) =>
        source.title &&
        source.organization &&
        /^https:\/\//.test(source.url) &&
        source.whyReputable.length > 90
      )).toBe(true);
      expect(item.reviewStatus).toBe('source-reviewed-editorial-pass');
      expect(item.reviewMode).toBe('claim-level-source-review-and-editorial-rewrite');
      expect(item.reviewWave).toBe('knowledge-check-wave-08');
      expect(item.reviewDate).toBe('2026-07-28');
      expect(item.reviewNote.length).toBeGreaterThan(80);
      expect(item.independentExpertStatus).toBe('not-started');
      expect(item.productionStatus).toBe('not-production-validated');
    }
  });

  it('integrates each wave 08 record once and advances durable cumulative release bounds', () => {
    const catalog = read('test_prep/eppp_learning_library.json');
    const inventory = new Map(catalog.knowledgeChecks.map((item) => [item.id, item]));
    const released = catalog.chapters.flatMap((chapter) => chapter.knowledgeChecks);
    const releasedIds = released.map((item) => item.id);

    expect(catalog.summary.knowledgeChecks).toBeGreaterThanOrEqual(109);
    expect(catalog.summary.sourceReviewedKnowledgeChecks).toBeGreaterThanOrEqual(102);
    expect(catalog.summary.releasedKnowledgeChecks).toBe(catalog.summary.sourceReviewedKnowledgeChecks);
    expect(catalog.summary.reviewRequiredKnowledgeChecks).toBeLessThanOrEqual(7);
    expect(catalog.summary.reviewRequiredKnowledgeChecks)
      .toBe(catalog.summary.knowledgeChecks - catalog.summary.sourceReviewedKnowledgeChecks);
    expect(catalog.knowledgeChecks).toHaveLength(catalog.summary.knowledgeChecks);
    expect(released).toHaveLength(catalog.summary.releasedKnowledgeChecks);
    for (const id of expectedIds) {
      expect(inventory.get(id)).toMatchObject({
        reviewStatus: 'source-reviewed-editorial-pass',
        reviewArtifact: 'eppp_knowledge_check_review_wave_08.json',
      });
      expect(releasedIds.filter((candidate) => candidate === id)).toHaveLength(1);
      expect(Object.values(inventory.get(id).checks).every((status) => status === 'pass')).toBe(true);
    }
    expect(catalog.knowledgeChecks.filter((item) => item.reviewStatus === 'review-required'))
      .toHaveLength(catalog.summary.reviewRequiredKnowledgeChecks);
  });

  it('preserves the assessment, model, classic-study, emergency, developmental, and causal boundaries targeted by the wave', () => {
    const byId = new Map(wave.items.map((item) => [item.legacyId, item]));
    expect(byId.get('knowledge-check-d335fd83aa8ad97c').rationale)
      .toContain('format alone cannot guarantee reliability');
    expect(byId.get('knowledge-check-67819ac286663041').rationale)
      .toContain('supplements rather than replaces');
    expect(byId.get('knowledge-check-d614ba7edc6af5e5').rationale)
      .toContain('not exclusive to REBT');
    expect(byId.get('knowledge-check-97e00d15171c5bbd').rationale)
      .toContain('does not diagnose the relationship or make divorce certain');
    expect(byId.get('knowledge-check-b478e4361ac886f0').rationale)
      .toContain('does not uniquely identify one learning architecture');
    expect(byId.get('knowledge-check-ce66a37e0098d776').rationale)
      .toContain('not evidence that every unattended word received full semantic analysis');
    expect(byId.get('knowledge-check-484b1c12245b343b').rationale)
      .toContain('mean-median-mode ordering is a heuristic, not the definition of skewness');
    expect(byId.get('knowledge-check-80f5b4b1e7021c2f').rationale)
      .toContain('does not establish that ice cream itself causes or prevents drowning');
    expect(byId.get('knowledge-check-d6482e3b3b744d52').rationale)
      .toContain('does not guarantee zero conformity');
    expect(byId.get('knowledge-check-6607bca9f2de16e3').rationale)
      .toContain('does not make nonhelpers apathetic by definition');
    expect(byId.get('knowledge-check-ed93476d937a6bae').rationale)
      .toContain('failure of manual search is not a pure readout');
    expect(byId.get('knowledge-check-be3d8ddd0366c457').rationale)
      .toContain('do not support a categorical women-care/men-justice rule');
  });

  it('keeps source and deployment catalog copies synchronized after catalog regeneration', () => {
    expect(read('desktop/web-app/public/test_prep/eppp_learning_library.json'))
      .toEqual(read('test_prep/eppp_learning_library.json'));
    expect(read('desktop/web-app/public/test_prep/eppp_learning_library_qa.json'))
      .toEqual(read('test_prep/eppp_learning_library_qa.json'));
  });
});
