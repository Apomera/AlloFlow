import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath) => JSON.parse(fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8'));

const expectedIds = [
  'knowledge-check-9a082181ed2ac88c',
  'knowledge-check-827953b02399d522',
  'knowledge-check-f7c496001793e118',
  'knowledge-check-0e9d304bdba8fa51',
  'knowledge-check-468bbb5c828e5de2',
  'knowledge-check-93566d0f6bb7cdeb',
  'knowledge-check-1a4afbf8d679a80c',
  'knowledge-check-07714fbf6edbe086',
].sort();

describe('EPPP knowledge-check source-review wave 05', () => {
  const wave = read('test_prep/eppp_knowledge_check_review_wave_05.json');
  const priorWaves = [1, 2, 3, 4].map((number) =>
    read(`test_prep/eppp_knowledge_check_review_wave_0${number}.json`),
  );
  const catalog = read('test_prep/eppp_learning_library.json');

  it('adds one unique check from every official domain with balanced answer positions', () => {
    expect(wave).toMatchObject({
      schemaVersion: 1,
      reviewWave: 'knowledge-check-wave-05',
      reviewDate: '2026-07-28',
    });
    expect(wave.summary).toMatchObject({
      items: 8,
      domains: 8,
      itemsPerDomain: 1,
      sourceReviewedEditorialPass: 8,
      independentExpertReviewPending: 8,
      productionValidationPending: 8,
    });
    expect(wave.items.map((item) => item.legacyId).sort()).toEqual(expectedIds);
    expect(new Set(wave.items.map((item) => item.legacyId)).size).toBe(8);
    expect(Object.values(wave.summary.domainCounts)).toEqual(Array(8).fill(1));
    expect([0, 1, 2, 3].map((position) => wave.items.filter((item) => item.answerIndex === position).length))
      .toEqual([2, 2, 2, 2]);

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
      expect(item.reviewWave).toBe('knowledge-check-wave-05');
      expect(item.reviewDate).toBe('2026-07-28');
      expect(item.reviewNote.length).toBeGreaterThan(80);
      expect(item.independentExpertStatus).toBe('not-started');
      expect(item.productionStatus).toBe('not-production-validated');
    }
  });

  it('integrates each wave 05 record exactly once and advances the cumulative release gate', () => {
    const inventory = new Map(catalog.knowledgeChecks.map((item) => [item.id, item]));
    const released = catalog.chapters.flatMap((chapter) => chapter.knowledgeChecks);
    const releasedIds = released.map((item) => item.id);

    expect(catalog.summary.knowledgeChecks).toBe(109);
    expect(catalog.summary.sourceReviewedKnowledgeChecks).toBeGreaterThanOrEqual(72);
    expect(catalog.summary.releasedKnowledgeChecks).toBe(catalog.summary.sourceReviewedKnowledgeChecks);
    expect(catalog.summary.reviewRequiredKnowledgeChecks).toBe(catalog.summary.knowledgeChecks - catalog.summary.sourceReviewedKnowledgeChecks);
    expect(catalog.knowledgeChecks).toHaveLength(catalog.summary.knowledgeChecks);
    expect(released).toHaveLength(catalog.summary.releasedKnowledgeChecks);
    for (const id of expectedIds) {
      expect(inventory.get(id)).toMatchObject({
        reviewStatus: 'source-reviewed-editorial-pass',
        reviewArtifact: 'eppp_knowledge_check_review_wave_05.json',
      });
      expect(releasedIds.filter((candidate) => candidate === id)).toHaveLength(1);
      expect(Object.values(inventory.get(id).checks).every((status) => status === 'pass')).toBe(true);
    }
    expect(catalog.knowledgeChecks.filter((item) => item.reviewStatus === 'review-required'))
      .toHaveLength(catalog.summary.reviewRequiredKnowledgeChecks);
  });

  it('preserves the legal, developmental, clinical, historical, and denominator boundaries targeted by the wave', () => {
    const byId = new Map(wave.items.map((item) => [item.legacyId, item]));
    expect(byId.get('knowledge-check-9a082181ed2ac88c').rationale).toContain('court makes the legal determination');
    expect(byId.get('knowledge-check-827953b02399d522').rationale).toContain('Development is domain-specific');
    expect(byId.get('knowledge-check-f7c496001793e118').rationale).toContain('External pressure, attendance, or compliance');
    expect(byId.get('knowledge-check-0e9d304bdba8fa51').rationale).toContain('does not establish that a medication is clinically inactive');
    expect(byId.get('knowledge-check-468bbb5c828e5de2').rationale).toContain('does not establish a universal inverse relation');
    expect(byId.get('knowledge-check-93566d0f6bb7cdeb').rationale).toContain('not diagnoses, universal sequences, or scripts');
    expect(byId.get('knowledge-check-1a4afbf8d679a80c').rationale).toContain('Exposure was not randomly assigned');
    expect(byId.get('knowledge-check-07714fbf6edbe086').rationale).toContain('risk double counting');
  });

  it('keeps source and deployment catalog copies synchronized', () => {
    expect(read('desktop/web-app/public/test_prep/eppp_learning_library.json')).toEqual(catalog);
    expect(read('desktop/web-app/public/test_prep/eppp_learning_library_qa.json'))
      .toEqual(read('test_prep/eppp_learning_library_qa.json'));
  });
});
