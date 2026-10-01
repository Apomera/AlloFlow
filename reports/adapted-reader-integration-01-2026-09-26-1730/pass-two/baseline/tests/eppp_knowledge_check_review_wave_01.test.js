import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath) => JSON.parse(fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8'));

const expectedIds = [
  'knowledge-check-6e353989172af693',
  'knowledge-check-d76a76f7bf1de8ba',
  'knowledge-check-bcab77572f80a7e2',
  'knowledge-check-8e1c264e7dcc7939',
  'knowledge-check-4d7ca9d61c084560',
  'knowledge-check-e91e8e1ea9392789',
  'knowledge-check-c14f59ac2954d022',
  'knowledge-check-682e0cf3631d69d1',
  'knowledge-check-7ab5d132da1c049b',
  'knowledge-check-f0c0f3f14f4399bd',
  'knowledge-check-67fbaa91b34656d8',
  'knowledge-check-033e8a3e18bf1273',
  'knowledge-check-b4b92a336dde43e0',
  'knowledge-check-b25c5ab32653cd68',
  'knowledge-check-8b961bbc696a7d86',
  'knowledge-check-ab7eed899445fa05',
].sort();

describe('EPPP knowledge-check source-review wave 01', () => {
  const wave = read('test_prep/eppp_knowledge_check_review_wave_01.json');
  const catalog = read('test_prep/eppp_learning_library.json');

  it('covers all eight official domains with two stable, unique checks each', () => {
    expect(wave.summary).toMatchObject({ items: 16, domains: 8, itemsPerDomain: 2, sourceReviewedEditorialPass: 16 });
    expect(wave.items.map((item) => item.legacyId).sort()).toEqual(expectedIds);
    expect(new Set(wave.items.map((item) => item.legacyId)).size).toBe(16);
    expect(Object.values(wave.summary.domainCounts)).toEqual(Array(8).fill(2));
    for (const item of wave.items) {
      expect(item.legacyId).toMatch(/^knowledge-check-[a-f0-9]{16}$/);
      expect(item.chapterId).toMatch(/^ch-\d+$/);
      expect(item.sectionId).toMatch(/^ch-\d+-section-\d+$/);
      expect(item.reviewStatus).toBe('source-reviewed-editorial-pass');
    }
  });

  it('records answer-key, distractor, rationale, and claim-level source evidence', () => {
    for (const item of wave.items) {
      expect(item.prompt.length).toBeGreaterThan(30);
      expect(item.choices).toHaveLength(4);
      expect(new Set(item.choices).size).toBe(4);
      expect(Number.isInteger(item.answerIndex)).toBe(true);
      expect(item.answerIndex).toBeGreaterThanOrEqual(0);
      expect(item.answerIndex).toBeLessThan(item.choices.length);
      expect(item.rationale.length).toBeGreaterThan(220);
      expect(item.rationale).not.toMatch(/&(?:mdash|ndash|nbsp|ldquo|rdquo|rsquo);/i);
      expect(item.references).toEqual(item.sourceDetails.map((source) => source.url));
      expect(item.sourceDetails.length).toBeGreaterThanOrEqual(1);
      for (const source of item.sourceDetails) {
        expect(source.title.length).toBeGreaterThan(8);
        expect(source.organization.length).toBeGreaterThan(3);
        expect(source.url).toMatch(/^https:\/\//);
        expect(source.whyReputable.length).toBeGreaterThan(70);
      }
      expect(item.reviewNote.length).toBeGreaterThan(45);
      expect(item.independentExpertStatus).toBe('not-started');
      expect(item.productionStatus).toBe('not-production-validated');
    }
  });

  it('publishes every wave 01 check while preserving the cumulative review gate', () => {
    expect(catalog.knowledgeChecks).toHaveLength(109);
    const reviewed = catalog.knowledgeChecks.filter((item) => item.reviewStatus === 'source-reviewed-editorial-pass');
    const gated = catalog.knowledgeChecks.filter((item) => item.reviewStatus === 'review-required');
    const released = catalog.chapters.flatMap((chapter) => chapter.knowledgeChecks);

    expect(reviewed.map((item) => item.id)).toEqual(expect.arrayContaining(expectedIds));
    expect(released.map((item) => item.id)).toEqual(expect.arrayContaining(expectedIds));
    expect(reviewed.length + gated.length).toBe(109);
    expect(released).toHaveLength(reviewed.length);
    expect(catalog.summary.knowledgeChecks).toBe(109);
    expect(catalog.summary.sourceReviewedKnowledgeChecks).toBeGreaterThanOrEqual(16);
    expect(catalog.summary.releasedKnowledgeChecks).toBe(catalog.summary.sourceReviewedKnowledgeChecks);
    expect(catalog.summary.reviewRequiredKnowledgeChecks).toBe(109 - catalog.summary.sourceReviewedKnowledgeChecks);
    expect(released.filter((item) => expectedIds.includes(item.id)).every((item) => item.reviewArtifact === 'eppp_knowledge_check_review_wave_01.json')).toBe(true);
    expect(released.every((item) => Object.values(item.checks).every((status) => status === 'pass'))).toBe(true);
    expect(gated.every((item) => Object.values(item.checks).every((status) => status === 'pending'))).toBe(true);

    const byId = new Map(catalog.knowledgeChecks.map((item) => [item.id, item]));
    const sectionsWithChecks = catalog.chapters.flatMap((chapter) => chapter.sections).filter((section) => section.hasKnowledgeCheck);
    expect(sectionsWithChecks).toHaveLength(109);
    expect(sectionsWithChecks.every((section) => byId.has(section.knowledgeCheckId))).toBe(true);
    expect(sectionsWithChecks.filter((section) => section.knowledgeCheckReviewStatus === 'source-reviewed-editorial-pass')).toHaveLength(reviewed.length);
  });

  it('preserves the high-risk clinical, legal, cultural, and research safeguards', () => {
    const byId = new Map(wave.items.map((item) => [item.legacyId, item]));
    expect(byId.get('knowledge-check-6e353989172af693').rationale).toContain('does not by itself prove deception');
    expect(byId.get('knowledge-check-bcab77572f80a7e2').rationale).toContain('do not replace a license');
    expect(byId.get('knowledge-check-8e1c264e7dcc7939').rationale).toContain('rejects a universal seven-year rule');
    expect(byId.get('knowledge-check-4d7ca9d61c084560').rationale).toContain('continuous supervision');
    expect(byId.get('knowledge-check-e91e8e1ea9392789').rationale).toContain('declines compulsory detailed recounting');
    expect(byId.get('knowledge-check-c14f59ac2954d022').rationale).toContain('can resemble or coexist with agitation and anxiety');
    expect(byId.get('knowledge-check-682e0cf3631d69d1').rationale).toContain('typical agents such as haloperidol generally should not be prescribed');
    expect(byId.get('knowledge-check-f0c0f3f14f4399bd').rationale).toContain('language proficiency');
    expect(byId.get('knowledge-check-ab7eed899445fa05').rationale).not.toContain('exactly the problem with the Tuskegee study');
  });

  it('keeps source and deployment catalog copies synchronized', () => {
    expect(read('desktop/web-app/public/test_prep/eppp_learning_library.json')).toEqual(catalog);
    expect(read('desktop/web-app/public/test_prep/eppp_learning_library_qa.json')).toEqual(read('test_prep/eppp_learning_library_qa.json'));
  });
});
