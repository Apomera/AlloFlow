import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath) => JSON.parse(fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8'));

const expectedIds = [
  'knowledge-check-5bb8ef38fb5cccab',
  'knowledge-check-5d743c0b5a34a0a1',
  'knowledge-check-c0025f429f7dd3a7',
  'knowledge-check-8b926856694e3be1',
  'knowledge-check-bc837560c740d303',
  'knowledge-check-62ba02f4088a829b',
].sort();

describe('EPPP knowledge-check source-review wave 06', () => {
  const wave = read('test_prep/eppp_knowledge_check_review_wave_06.json');
  const priorWaves = [1, 2, 3, 4, 5].map((number) =>
    read(`test_prep/eppp_knowledge_check_review_wave_0${number}.json`),
  );
  const catalog = read('test_prep/eppp_learning_library.json');

  it('completes the integrative queue with unique records and balanced answer positions', () => {
    expect(wave).toMatchObject({
      schemaVersion: 1,
      reviewWave: 'knowledge-check-wave-06',
      reviewDate: '2026-07-28',
    });
    expect(wave.summary).toMatchObject({
      items: 6,
      domains: 2,
      sourceReviewedEditorialPass: 6,
      independentExpertReviewPending: 6,
      productionValidationPending: 6,
      domainCounts: {
        'Integrative & Test Strategy': 2,
        'Integrative Seminars': 4,
      },
    });
    expect(wave.items.map((item) => item.legacyId).sort()).toEqual(expectedIds);
    expect(new Set(wave.items.map((item) => item.legacyId)).size).toBe(6);
    expect([0, 1, 2, 3].map((position) => wave.items.filter((item) => item.answerIndex === position).length))
      .toEqual([2, 2, 1, 1]);

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
      expect(item.reviewWave).toBe('knowledge-check-wave-06');
      expect(item.reviewDate).toBe('2026-07-28');
      expect(item.reviewNote.length).toBeGreaterThan(80);
      expect(item.independentExpertStatus).toBe('not-started');
      expect(item.productionStatus).toBe('not-production-validated');
    }
  });

  it('integrates each wave 06 record exactly once and advances the cumulative release gate', () => {
    const inventory = new Map(catalog.knowledgeChecks.map((item) => [item.id, item]));
    const released = catalog.chapters.flatMap((chapter) => chapter.knowledgeChecks);
    const releasedIds = released.map((item) => item.id);

    expect(catalog.summary.knowledgeChecks).toBe(109);
    expect(catalog.summary.sourceReviewedKnowledgeChecks).toBeGreaterThanOrEqual(78);
    expect(catalog.summary.releasedKnowledgeChecks).toBe(catalog.summary.sourceReviewedKnowledgeChecks);
    expect(catalog.summary.reviewRequiredKnowledgeChecks).toBe(catalog.summary.knowledgeChecks - catalog.summary.sourceReviewedKnowledgeChecks);
    expect(catalog.knowledgeChecks).toHaveLength(catalog.summary.knowledgeChecks);
    expect(released).toHaveLength(catalog.summary.releasedKnowledgeChecks);
    for (const id of expectedIds) {
      expect(inventory.get(id)).toMatchObject({
        reviewStatus: 'source-reviewed-editorial-pass',
        reviewArtifact: 'eppp_knowledge_check_review_wave_06.json',
      });
      expect(releasedIds.filter((candidate) => candidate === id)).toHaveLength(1);
      expect(Object.values(inventory.get(id).checks).every((status) => status === 'pass')).toBe(true);
    }
    expect(catalog.knowledgeChecks.filter((item) => item.reviewStatus === 'review-required'))
      .toHaveLength(catalog.summary.reviewRequiredKnowledgeChecks);
  });

  it('preserves the exam-rule, clinical, regulatory, and score-conversion boundaries targeted by the wave', () => {
    const byId = new Map(wave.items.map((item) => [item.legacyId, item]));
    expect(byId.get('knowledge-check-5bb8ef38fb5cccab').rationale)
      .toContain('advantageous to answer every item');
    expect(byId.get('knowledge-check-5d743c0b5a34a0a1').rationale)
      .toContain('does not endorse a rigid seconds-per-item rule');
    expect(byId.get('knowledge-check-c0025f429f7dd3a7').rationale)
      .toContain('removed the Clozapine REMS effective June 13, 2025');
    expect(byId.get('knowledge-check-8b926856694e3be1').rationale)
      .toContain('not every lithium-NSAID combination produces toxicity');
    expect(byId.get('knowledge-check-bc837560c740d303').rationale)
      .toContain('relative-liability comparison');
    expect(byId.get('knowledge-check-62ba02f4088a829b').rationale)
      .toContain('applicable manual or empirical percentile table should control');
  });

  it('keeps source and deployment catalog copies synchronized', () => {
    expect(read('desktop/web-app/public/test_prep/eppp_learning_library.json')).toEqual(catalog);
    expect(read('desktop/web-app/public/test_prep/eppp_learning_library_qa.json'))
      .toEqual(read('test_prep/eppp_learning_library_qa.json'));
  });
});
