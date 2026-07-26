import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath) => JSON.parse(fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8'));

const expectedIds = [
  'knowledge-check-3553ec5ab9049c0a',
  'knowledge-check-ab9f44edb5dd32ea',
  'knowledge-check-0530630349fe0939',
  'knowledge-check-75d41899e26687d2',
  'knowledge-check-1929fee96d4cea5d',
  'knowledge-check-ef42513ad95d1389',
  'knowledge-check-07d9448964f9f9c0',
  'knowledge-check-7f99f599ea05108b',
  'knowledge-check-779bafcc3807889c',
  'knowledge-check-afb4df58f3cc0a5e',
  'knowledge-check-4e184d9f45c18dd0',
  'knowledge-check-4fec73f32cf59fa2',
  'knowledge-check-06539c1509589991',
  'knowledge-check-e138d772802db4b8',
  'knowledge-check-9b00da33331b6245',
  'knowledge-check-4941690ab57fa348',
].sort();

describe('EPPP knowledge-check source-review wave 03', () => {
  const wave = read('test_prep/eppp_knowledge_check_review_wave_03.json');
  const wave01 = read('test_prep/eppp_knowledge_check_review_wave_01.json');
  const wave02 = read('test_prep/eppp_knowledge_check_review_wave_02.json');
  const catalog = read('test_prep/eppp_learning_library.json');

  it('adds two unique checks from every official domain without overlapping prior waves', () => {
    expect(wave).toMatchObject({ schemaVersion: 1, reviewWave: 'knowledge-check-wave-03', reviewDate: '2026-07-26' });
    expect(wave.summary).toMatchObject({ items: 16, domains: 8, itemsPerDomain: 2, sourceReviewedEditorialPass: 16 });
    expect(wave.items.map((item) => item.legacyId).sort()).toEqual(expectedIds);
    expect(new Set(wave.items.map((item) => item.legacyId)).size).toBe(16);
    expect(Object.values(wave.summary.domainCounts)).toEqual(Array(8).fill(2));
    expect([0, 1, 2, 3].map((position) => wave.items.filter((item) => item.answerIndex === position).length)).toEqual([4, 4, 4, 4]);
    const priorIds = new Set([...wave01.items, ...wave02.items].map((item) => item.legacyId));
    expect(wave.items.some((item) => priorIds.has(item.legacyId))).toBe(false);
    for (const item of wave.items) {
      expect(item.legacyId).toMatch(/^knowledge-check-[a-f0-9]{16}$/);
      expect(item.chapterId).toMatch(/^ch-\d+$/);
      expect(item.sectionId).toMatch(/^ch-\d+-section-\d+$/);
      expect(item.reviewStatus).toBe('source-reviewed-editorial-pass');
      expect(item.reviewWave).toBe('knowledge-check-wave-03');
      expect(item.reviewDate).toBe('2026-07-26');
    }
  });

  it('documents valid answer positions, challenging distractors, nuanced rationales, and reputable sources', () => {
    for (const item of wave.items) {
      expect(item.prompt.length).toBeGreaterThan(30);
      expect(item.choices).toHaveLength(4);
      expect(new Set(item.choices).size).toBe(4);
      expect(Number.isInteger(item.answerIndex)).toBe(true);
      expect(item.answerIndex).toBeGreaterThanOrEqual(0);
      expect(item.answerIndex).toBeLessThan(4);
      expect(item.rationale.length).toBeGreaterThan(300);
      expect(item.rationale).not.toMatch(/&(?:mdash|ndash|nbsp|ldquo|rdquo|rsquo);/i);
      expect(item.references).toEqual(item.sourceDetails.map((source) => source.url));
      expect(item.sourceDetails.length).toBeGreaterThanOrEqual(1);
      expect(item.sourceDetails.every((source) => source.title && source.organization && /^https:\/\//.test(source.url) && source.whyReputable.length > 80)).toBe(true);
      expect(item.reviewNote.length).toBeGreaterThan(55);
      expect(item.independentExpertStatus).toBe('not-started');
      expect(item.productionStatus).toBe('not-production-validated');
    }
  });

  it('integrates each wave 03 record exactly once and updates the cumulative gate', () => {
    const inventory = new Map(catalog.knowledgeChecks.map((item) => [item.id, item]));
    const released = catalog.chapters.flatMap((chapter) => chapter.knowledgeChecks);
    const releasedIds = released.map((item) => item.id);
    expect(catalog.summary).toMatchObject({ knowledgeChecks: 109, sourceReviewedKnowledgeChecks: 48, releasedKnowledgeChecks: 48, reviewRequiredKnowledgeChecks: 61 });
    expect(released).toHaveLength(48);
    for (const id of expectedIds) {
      expect(inventory.get(id)).toMatchObject({ reviewStatus: 'source-reviewed-editorial-pass', reviewArtifact: 'eppp_knowledge_check_review_wave_03.json' });
      expect(releasedIds.filter((candidate) => candidate === id)).toHaveLength(1);
      expect(Object.values(inventory.get(id).checks).every((status) => status === 'pass')).toBe(true);
    }
    expect(catalog.knowledgeChecks.filter((item) => item.reviewStatus === 'review-required')).toHaveLength(61);
  });

  it('preserves legal, clinical, developmental, classic-study, and statistical inference boundaries', () => {
    const byId = new Map(wave.items.map((item) => [item.legacyId, item]));
    expect(byId.get('knowledge-check-ab9f44edb5dd32ea').rationale).toContain('not automatically required for every FBA');
    expect(byId.get('knowledge-check-75d41899e26687d2').choices[0]).toContain('malpractice cannot be decided from the exposure alone');
    expect(byId.get('knowledge-check-1929fee96d4cea5d').rationale).toContain('one reported shift');
    expect(byId.get('knowledge-check-ef42513ad95d1389').rationale).toContain('not a universally replicated structural equation');
    expect(byId.get('knowledge-check-07d9448964f9f9c0').rationale).toContain('not a one-to-one lesion map');
    expect(byId.get('knowledge-check-7f99f599ea05108b').rationale).toContain('does not establish the entire therapeutic mechanism');
    expect(byId.get('knowledge-check-779bafcc3807889c').rationale).toContain('possible, not inevitable');
    expect(byId.get('knowledge-check-afb4df58f3cc0a5e').rationale).toContain('does not uniquely establish that account');
    expect(byId.get('knowledge-check-4e184d9f45c18dd0').rationale).toContain('not a robust, pervasive average effect');
    expect(byId.get('knowledge-check-4fec73f32cf59fa2').rationale).toContain('does not estimate how all adults behave');
    expect(byId.get('knowledge-check-06539c1509589991').rationale).toContain('does not diagnose asphyxia');
    expect(byId.get('knowledge-check-e138d772802db4b8').rationale).toContain('not an autism diagnosis');
    expect(byId.get('knowledge-check-9b00da33331b6245').rationale).toContain('prediction, verification, and replication');
    expect(byId.get('knowledge-check-4941690ab57fa348').rationale).toContain('not merely a test of medians');
  });

  it('keeps source and deployment catalog copies synchronized', () => {
    expect(read('desktop/web-app/public/test_prep/eppp_learning_library.json')).toEqual(catalog);
    expect(read('desktop/web-app/public/test_prep/eppp_learning_library_qa.json')).toEqual(read('test_prep/eppp_learning_library_qa.json'));
  });
});
