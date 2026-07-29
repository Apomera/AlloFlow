import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath) => JSON.parse(fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8'));

const expectedIds = [
  'knowledge-check-1ecef8143975e305',
  'knowledge-check-f834f2ddbd7558ae',
  'knowledge-check-bbe71b7c842b8242',
  'knowledge-check-39ab56ea1cd78922',
  'knowledge-check-c30cb125193c92da',
  'knowledge-check-9feffd843f729c72',
  'knowledge-check-ec0a57cae0f7e71c',
  'knowledge-check-a867253a7a9be846',
  'knowledge-check-ea24db735ee5824f',
  'knowledge-check-39ef201538b198a1',
  'knowledge-check-b2d4a9ffbd6262d8',
  'knowledge-check-7932125100f8c528',
].sort();

describe('EPPP knowledge-check source-review wave 07', () => {
  const wave = read('test_prep/eppp_knowledge_check_review_wave_07.json');
  const priorWaves = [1, 2, 3, 4, 5, 6].map((number) =>
    read(`test_prep/eppp_knowledge_check_review_wave_0${number}.json`),
  );

  it('adds two unique checks from every remaining domain with balanced answer positions', () => {
    expect(wave).toMatchObject({
      schemaVersion: 1,
      reviewWave: 'knowledge-check-wave-07',
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
      expect(item.reviewWave).toBe('knowledge-check-wave-07');
      expect(item.reviewDate).toBe('2026-07-28');
      expect(item.reviewNote.length).toBeGreaterThan(80);
      expect(item.independentExpertStatus).toBe('not-started');
      expect(item.productionStatus).toBe('not-production-validated');
    }
  });

  it('integrates each wave 07 record once and advances durable cumulative release bounds', () => {
    const catalog = read('test_prep/eppp_learning_library.json');
    const inventory = new Map(catalog.knowledgeChecks.map((item) => [item.id, item]));
    const released = catalog.chapters.flatMap((chapter) => chapter.knowledgeChecks);
    const releasedIds = released.map((item) => item.id);

    expect(catalog.summary.knowledgeChecks).toBeGreaterThanOrEqual(109);
    expect(catalog.summary.sourceReviewedKnowledgeChecks).toBeGreaterThanOrEqual(90);
    expect(catalog.summary.releasedKnowledgeChecks).toBeGreaterThanOrEqual(90);
    expect(catalog.summary.reviewRequiredKnowledgeChecks).toBeLessThanOrEqual(19);
    expect(released.length).toBeGreaterThanOrEqual(90);
    for (const id of expectedIds) {
      expect(inventory.get(id)).toMatchObject({
        reviewStatus: 'source-reviewed-editorial-pass',
        reviewArtifact: 'eppp_knowledge_check_review_wave_07.json',
      });
      expect(releasedIds.filter((candidate) => candidate === id)).toHaveLength(1);
      expect(Object.values(inventory.get(id).checks).every((status) => status === 'pass')).toBe(true);
    }
    expect(catalog.knowledgeChecks.filter((item) => item.reviewStatus === 'review-required').length)
      .toBeLessThanOrEqual(19);
  });

  it('preserves the screening, motive, systems, reward, culture, development, and inference boundaries targeted by the wave', () => {
    const byId = new Map(wave.items.map((item) => [item.legacyId, item]));
    expect(byId.get('knowledge-check-1ecef8143975e305').rationale).toContain('not as a stand-alone diagnosis');
    expect(byId.get('knowledge-check-f834f2ddbd7558ae').rationale).toContain('does not by itself establish why');
    expect(byId.get('knowledge-check-bbe71b7c842b8242').rationale).toContain('hypothesis for assessment, not a diagnosis');
    expect(byId.get('knowledge-check-39ab56ea1cd78922').rationale).toContain('lack of supervisory power is not lack of accountability');
    expect(byId.get('knowledge-check-c30cb125193c92da').rationale).toContain('does not establish a single neural mechanism');
    expect(byId.get('knowledge-check-9feffd843f729c72').rationale).toContain('do not support the blanket claim that every reward undermines motivation');
    expect(byId.get('knowledge-check-ec0a57cae0f7e71c').rationale).toContain('not as a necessary and sufficient cause');
    expect(byId.get('knowledge-check-a867253a7a9be846').rationale).toContain('not a scored stand-alone diagnostic instrument');
    expect(byId.get('knowledge-check-ea24db735ee5824f').rationale).toContain('not be read as one-way causation or individual destiny');
    expect(byId.get('knowledge-check-39ef201538b198a1').rationale).toContain('does not establish Alzheimer');
    expect(byId.get('knowledge-check-b2d4a9ffbd6262d8').rationale).toContain('does not prove this specific finding false');
    expect(byId.get('knowledge-check-7932125100f8c528').rationale).toContain('population estimates depend on design and analytic assumptions');
  });

  it('keeps source and deployment catalog copies synchronized after catalog regeneration', () => {
    expect(read('desktop/web-app/public/test_prep/eppp_learning_library.json'))
      .toEqual(read('test_prep/eppp_learning_library.json'));
    expect(read('desktop/web-app/public/test_prep/eppp_learning_library_qa.json'))
      .toEqual(read('test_prep/eppp_learning_library_qa.json'));
  });
});
