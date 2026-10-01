import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath) => JSON.parse(fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8'));

const expectedIds = [
  'knowledge-check-aea823d1720bb5a9',
  'knowledge-check-fdee9c83f4a5d9bb',
  'knowledge-check-deb2241cffc3b025',
  'knowledge-check-198c6ebc2b49b1bd',
  'knowledge-check-17d7db3643a43b92',
  'knowledge-check-fb4e6c309a977cc6',
  'knowledge-check-005638f0dde891b7',
].sort();

describe('EPPP knowledge-check source-review wave 09', () => {
  const wave = read('test_prep/eppp_knowledge_check_review_wave_09.json');
  const priorWaves = Array.from({ length: 8 }, (_, index) =>
    read(`test_prep/eppp_knowledge_check_review_wave_0${index + 1}.json`),
  );

  it('closes the exact seven-item remainder with deliberate near-balanced answer positions', () => {
    expect(wave).toMatchObject({
      schemaVersion: 1,
      reviewWave: 'knowledge-check-wave-09',
      reviewDate: '2026-07-28',
    });
    expect(wave.summary).toMatchObject({
      items: 7,
      domains: 2,
      sourceReviewedEditorialPass: 7,
      independentExpertReviewPending: 7,
      productionValidationPending: 7,
      domainCounts: {
        'Social & Cultural Bases of Behavior': 3,
        'Growth & Lifespan Development': 4,
      },
    });
    expect(wave.items.map((item) => item.legacyId).sort()).toEqual(expectedIds);
    expect(new Set(wave.items.map((item) => item.legacyId)).size).toBe(7);
    expect([0, 1, 2, 3].map((position) => wave.items.filter((item) => item.answerIndex === position).length))
      .toEqual([2, 2, 2, 1]);

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
      expect(item.reviewWave).toBe('knowledge-check-wave-09');
      expect(item.reviewDate).toBe('2026-07-28');
      expect(item.reviewNote.length).toBeGreaterThan(80);
      expect(item.independentExpertStatus).toBe('not-started');
      expect(item.productionStatus).toBe('not-production-validated');
    }
  });

  it('integrates every wave 09 record exactly once and closes the cumulative editorial gate after regeneration', () => {
    const catalog = read('test_prep/eppp_learning_library.json');
    const inventory = new Map(catalog.knowledgeChecks.map((item) => [item.id, item]));
    const released = catalog.chapters.flatMap((chapter) => chapter.knowledgeChecks);
    const releasedIds = released.map((item) => item.id);

    expect(catalog.summary.knowledgeChecks).toBe(109);
    expect(catalog.summary.sourceReviewedKnowledgeChecks).toBe(109);
    expect(catalog.summary.releasedKnowledgeChecks).toBe(109);
    expect(catalog.summary.reviewRequiredKnowledgeChecks).toBe(0);
    expect(catalog.knowledgeChecks).toHaveLength(109);
    expect(released).toHaveLength(109);
    for (const id of expectedIds) {
      expect(inventory.get(id)).toMatchObject({
        reviewStatus: 'source-reviewed-editorial-pass',
        reviewArtifact: 'eppp_knowledge_check_review_wave_09.json',
      });
      expect(releasedIds.filter((candidate) => candidate === id)).toHaveLength(1);
      expect(Object.values(inventory.get(id).checks).every((status) => status === 'pass')).toBe(true);
    }
    expect(catalog.knowledgeChecks.filter((item) => item.reviewStatus === 'review-required')).toHaveLength(0);
  });

  it('preserves the model, causal, diagnostic, cultural, developmental, and functional boundaries targeted by the wave', () => {
    const byId = new Map(wave.items.map((item) => [item.legacyId, item]));
    expect(byId.get('knowledge-check-aea823d1720bb5a9').rationale)
      .toContain("tests the model's predicted inference, not a claim");
    expect(byId.get('knowledge-check-fdee9c83f4a5d9bb').rationale)
      .toContain('does not guarantee agreement');
    expect(byId.get('knowledge-check-deb2241cffc3b025').rationale)
      .toContain('not a mental-disorder diagnosis');
    expect(byId.get('knowledge-check-198c6ebc2b49b1bd').rationale)
      .toContain('Scaffolding and the ZPD are related educational concepts, but they are not synonyms');
    expect(byId.get('knowledge-check-17d7db3643a43b92').rationale)
      .toContain('not a diagnosis, immutable trait, or simple rank of maturity');
    expect(byId.get('knowledge-check-fb4e6c309a977cc6').rationale)
      .toContain('not as a universal neurologic stage, diagnosis, or mandate');
    expect(byId.get('knowledge-check-005638f0dde891b7').rationale)
      .toContain('The classification depends on function');
  });

  it('keeps source and deployment catalog copies synchronized after catalog regeneration', () => {
    expect(read('desktop/web-app/public/test_prep/eppp_learning_library.json'))
      .toEqual(read('test_prep/eppp_learning_library.json'));
    expect(read('desktop/web-app/public/test_prep/eppp_learning_library_qa.json'))
      .toEqual(read('test_prep/eppp_learning_library_qa.json'));
  });
});
