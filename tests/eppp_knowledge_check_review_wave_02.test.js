import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';
const read = (relativePath) => JSON.parse(fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8'));
const expectedIds = ['knowledge-check-21d1436de9cb7825','knowledge-check-3e681f798139b39a','knowledge-check-e2de3c5b45ca52b0','knowledge-check-859c96501a806e58','knowledge-check-3f0cd52860438657','knowledge-check-a08ce22420fae4ce','knowledge-check-00c8f653423b6373','knowledge-check-a3d605541e93d3a9','knowledge-check-9e3412c360f26f39','knowledge-check-2dae48215c727eed','knowledge-check-af4d594cf6d7bf40','knowledge-check-acdc5f5ce3b70db4','knowledge-check-e77404777e6e9eb3','knowledge-check-d618789af58acc09','knowledge-check-5f22b09acfe5dc19','knowledge-check-52708d9f28539b52'].sort();
describe('EPPP knowledge-check source-review wave 02', () => {
  const wave = read('test_prep/eppp_knowledge_check_review_wave_02.json');
  const wave01 = read('test_prep/eppp_knowledge_check_review_wave_01.json');
  const catalog = read('test_prep/eppp_learning_library.json');
  it('adds two unique checks from every official domain without overlapping wave 01', () => {
    expect(wave.summary).toMatchObject({ items: 16, domains: 8, itemsPerDomain: 2, sourceReviewedEditorialPass: 16 });
    expect(wave.items.map((item) => item.legacyId).sort()).toEqual(expectedIds);
    expect(Object.values(wave.summary.domainCounts)).toEqual(Array(8).fill(2));
    expect(wave.items.some((item) => wave01.items.some((prior) => prior.legacyId === item.legacyId))).toBe(false);
    for (const item of wave.items) { expect(item.legacyId).toMatch(/^knowledge-check-[a-f0-9]{16}$/); expect(item.reviewStatus).toBe('source-reviewed-editorial-pass'); expect(item.reviewWave).toBe('knowledge-check-wave-02'); }
  });
  it('documents valid answer positions, distinct distractors, rationales, and reputable sources', () => {
    for (const item of wave.items) {
      expect(item.prompt.length).toBeGreaterThan(30); expect(item.choices).toHaveLength(4); expect(new Set(item.choices).size).toBe(4);
      expect(item.answerIndex).toBeGreaterThanOrEqual(0); expect(item.answerIndex).toBeLessThan(4); expect(item.rationale.length).toBeGreaterThan(300);
      expect(item.rationale).not.toMatch(/&(?:mdash|ndash|nbsp|ldquo|rdquo|rsquo);/i); expect(item.references).toEqual(item.sourceDetails.map((source) => source.url));
      expect(item.sourceDetails.length).toBeGreaterThanOrEqual(1); expect(item.sourceDetails.every((source) => source.title && source.organization && /^https:\/\//.test(source.url) && source.whyReputable.length > 80)).toBe(true);
      expect(item.reviewNote.length).toBeGreaterThan(55); expect(item.independentExpertStatus).toBe('not-started'); expect(item.productionStatus).toBe('not-production-validated');
    }
  });
  it('integrates each wave 02 record exactly once and updates the cumulative gate', () => {
    const inventory = new Map(catalog.knowledgeChecks.map((item) => [item.id, item])); const released = catalog.chapters.flatMap((chapter) => chapter.knowledgeChecks); const releasedIds = released.map((item) => item.id);
    expect(catalog.summary).toMatchObject({ knowledgeChecks: 109, sourceReviewedKnowledgeChecks: 32, releasedKnowledgeChecks: 32, reviewRequiredKnowledgeChecks: 77 }); expect(released).toHaveLength(32);
    for (const id of expectedIds) { expect(inventory.get(id)).toMatchObject({ reviewStatus: 'source-reviewed-editorial-pass', reviewArtifact: 'eppp_knowledge_check_review_wave_02.json' }); expect(releasedIds.filter((candidate) => candidate === id)).toHaveLength(1); expect(Object.values(inventory.get(id).checks).every((status) => status === 'pass')).toBe(true); }
    expect(catalog.knowledgeChecks.filter((item) => item.reviewStatus === 'review-required')).toHaveLength(77);
  });
  it('preserves clinical, ethical, cultural, developmental, and research-inference boundaries', () => {
    const byId = new Map(wave.items.map((item) => [item.legacyId, item]));
    expect(byId.get('knowledge-check-21d1436de9cb7825').rationale).toContain('prompt medical evaluation'); expect(byId.get('knowledge-check-3e681f798139b39a').rationale).toContain('clinical sample');
    expect(byId.get('knowledge-check-e2de3c5b45ca52b0').choices[2]).not.toContain('unavoidable'); expect(byId.get('knowledge-check-859c96501a806e58').rationale).toContain('keeps Standards 9.04 and 9.11 distinct');
    expect(byId.get('knowledge-check-3f0cd52860438657').rationale).toContain('not the only outcome or a mandatory stopping rule'); expect(byId.get('knowledge-check-a08ce22420fae4ce').rationale).toContain('can coexist');
    expect(byId.get('knowledge-check-00c8f653423b6373').rationale).toContain('It does not mean that 70% of any one person'); expect(byId.get('knowledge-check-9e3412c360f26f39').rationale).toContain('not specific enough by itself');
    expect(byId.get('knowledge-check-af4d594cf6d7bf40').rationale).toContain('not make a single score diagnostic'); expect(byId.get('knowledge-check-acdc5f5ce3b70db4').rationale).toContain('cannot determine an individual client');
    expect(byId.get('knowledge-check-e77404777e6e9eb3').rationale).toContain('not proof of maltreatment'); expect(byId.get('knowledge-check-d618789af58acc09').rationale).toContain('does not say every adolescent lacks reasoning capacity');
    expect(byId.get('knowledge-check-52708d9f28539b52').rationale).toContain('double-blind? is not a universal solution');
  });
  it('keeps source and deployment catalog copies synchronized', () => { expect(read('prismflow-deploy/public/test_prep/eppp_learning_library.json')).toEqual(catalog); expect(read('prismflow-deploy/public/test_prep/eppp_learning_library_qa.json')).toEqual(read('test_prep/eppp_learning_library_qa.json')); });
});
