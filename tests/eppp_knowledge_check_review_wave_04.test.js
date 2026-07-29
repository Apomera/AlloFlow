import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath) => JSON.parse(fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8'));

const expectedIds = [
  'knowledge-check-68341ede6e4fd195',
  'knowledge-check-d874f90d659fd30f',
  'knowledge-check-7385a079b1062377',
  'knowledge-check-489818f6b3d9fe27',
  'knowledge-check-8e519b8927d70bb4',
  'knowledge-check-b5316ced7caa3214',
  'knowledge-check-4d592d6de0a3ce9a',
  'knowledge-check-07344d032cbe42ed',
  'knowledge-check-65f1dc954dbe81cb',
  'knowledge-check-451dd5cdf4bfb487',
  'knowledge-check-35c91210a1758a8f',
  'knowledge-check-9f01306e26f50c17',
  'knowledge-check-59289ad835424d84',
  'knowledge-check-ea8e9d2caf9b2f0b',
  'knowledge-check-82b666fcdb6a7bce',
  'knowledge-check-c4635089c3c2f23c',
].sort();

describe('EPPP knowledge-check source-review wave 04', () => {
  const wave = read('test_prep/eppp_knowledge_check_review_wave_04.json');
  const priorWaves = [1, 2, 3].map((number) =>
    read(`test_prep/eppp_knowledge_check_review_wave_0${number}.json`),
  );
  const catalog = read('test_prep/eppp_learning_library.json');

  it('adds two unique checks from every official domain without overlapping prior waves', () => {
    expect(wave).toMatchObject({
      schemaVersion: 1,
      reviewWave: 'knowledge-check-wave-04',
      reviewDate: '2026-07-28',
    });
    expect(wave.summary).toMatchObject({
      items: 16,
      domains: 8,
      itemsPerDomain: 2,
      sourceReviewedEditorialPass: 16,
      independentExpertReviewPending: 16,
      productionValidationPending: 16,
    });
    expect(wave.items.map((item) => item.legacyId).sort()).toEqual(expectedIds);
    expect(new Set(wave.items.map((item) => item.legacyId)).size).toBe(16);
    expect(Object.values(wave.summary.domainCounts)).toEqual(Array(8).fill(2));
    expect([0, 1, 2, 3].map((position) => wave.items.filter((item) => item.answerIndex === position).length))
      .toEqual([4, 4, 4, 4]);

    const priorIds = new Set(priorWaves.flatMap((priorWave) => priorWave.items.map((item) => item.legacyId)));
    expect(wave.items.some((item) => priorIds.has(item.legacyId))).toBe(false);
  });

  it('documents challenging options, bounded rationales, reputable sources, and explicit review gates', () => {
    for (const item of wave.items) {
      expect(item.legacyId).toMatch(/^knowledge-check-[a-f0-9]{16}$/);
      expect(item.chapterId).toMatch(/^ch-\d+$/);
      expect(item.sectionId).toMatch(/^ch-\d+-section-\d+$/);
      expect(item.prompt.length).toBeGreaterThan(60);
      expect(item.choices).toHaveLength(4);
      expect(new Set(item.choices).size).toBe(4);
      expect(item.choices.every((choice) => choice.length > 45)).toBe(true);
      expect(Number.isInteger(item.answerIndex)).toBe(true);
      expect(item.answerIndex).toBeGreaterThanOrEqual(0);
      expect(item.answerIndex).toBeLessThan(4);
      expect(item.rationale.length).toBeGreaterThan(400);
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
      expect(item.reviewWave).toBe('knowledge-check-wave-04');
      expect(item.reviewDate).toBe('2026-07-28');
      expect(item.reviewNote.length).toBeGreaterThan(75);
      expect(item.independentExpertStatus).toBe('not-started');
      expect(item.productionStatus).toBe('not-production-validated');
    }
  });

  it('integrates each wave 04 record exactly once and advances the cumulative release gate', () => {
    const inventory = new Map(catalog.knowledgeChecks.map((item) => [item.id, item]));
    const released = catalog.chapters.flatMap((chapter) => chapter.knowledgeChecks);
    const releasedIds = released.map((item) => item.id);

    expect(catalog.summary.knowledgeChecks).toBe(109);
    expect(catalog.summary.sourceReviewedKnowledgeChecks).toBeGreaterThanOrEqual(64);
    expect(catalog.summary.releasedKnowledgeChecks).toBe(catalog.summary.sourceReviewedKnowledgeChecks);
    expect(catalog.summary.reviewRequiredKnowledgeChecks).toBe(catalog.summary.knowledgeChecks - catalog.summary.sourceReviewedKnowledgeChecks);
    expect(catalog.knowledgeChecks).toHaveLength(catalog.summary.knowledgeChecks);
    expect(released).toHaveLength(catalog.summary.releasedKnowledgeChecks);
    for (const id of expectedIds) {
      expect(inventory.get(id)).toMatchObject({
        reviewStatus: 'source-reviewed-editorial-pass',
        reviewArtifact: 'eppp_knowledge_check_review_wave_04.json',
      });
      expect(releasedIds.filter((candidate) => candidate === id)).toHaveLength(1);
      expect(Object.values(inventory.get(id).checks).every((status) => status === 'pass')).toBe(true);
    }
    expect(catalog.knowledgeChecks.filter((item) => item.reviewStatus === 'review-required'))
      .toHaveLength(catalog.summary.reviewRequiredKnowledgeChecks);
  });

  it('preserves the high-risk inference boundaries targeted by the wave', () => {
    const byId = new Map(wave.items.map((item) => [item.legacyId, item]));
    expect(byId.get('knowledge-check-68341ede6e4fd195').rationale).toContain('halfway between the lower asymptote c and 1');
    expect(byId.get('knowledge-check-d874f90d659fd30f').rationale).toContain('observations differ in duration');
    expect(byId.get('knowledge-check-7385a079b1062377').rationale).toContain('not blanket immunity');
    expect(byId.get('knowledge-check-489818f6b3d9fe27').rationale).toContain('distributive mismatch');
    expect(byId.get('knowledge-check-8e519b8927d70bb4').rationale).toContain('six conditions');
    expect(byId.get('knowledge-check-b5316ced7caa3214').rationale).toContain('not interchangeable synonyms');
    expect(byId.get('knowledge-check-4d592d6de0a3ce9a').rationale).toContain('globally left-brained');
    expect(byId.get('knowledge-check-07344d032cbe42ed').rationale).toContain('sweat glands');
    expect(byId.get('knowledge-check-65f1dc954dbe81cb').rationale).toContain('competing perceptual-motor accounts');
    expect(byId.get('knowledge-check-451dd5cdf4bfb487').rationale).toContain('item-level miscalibration');
    expect(byId.get('knowledge-check-35c91210a1758a8f').rationale).toContain('does not identify an unmeasured mediator');
    expect(byId.get('knowledge-check-9f01306e26f50c17').rationale).toContain('victim receives help');
    expect(byId.get('knowledge-check-59289ad835424d84').rationale).toContain('does not guarantee a disorder');
    expect(byId.get('knowledge-check-ea8e9d2caf9b2f0b').rationale).toContain('not validated screening or diagnostic instruments');
    expect(byId.get('knowledge-check-82b666fcdb6a7bce').rationale).toContain('does not retroactively create random assignment');
    expect(byId.get('knowledge-check-c4635089c3c2f23c').rationale).toContain('chronological age and birth cohort vary together');
  });

  it('keeps source and deployment catalog copies synchronized', () => {
    expect(read('desktop/web-app/public/test_prep/eppp_learning_library.json')).toEqual(catalog);
    expect(read('desktop/web-app/public/test_prep/eppp_learning_library_qa.json'))
      .toEqual(read('test_prep/eppp_learning_library_qa.json'));
  });
});
