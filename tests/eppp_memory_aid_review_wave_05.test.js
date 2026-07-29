import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const read = (path) => JSON.parse(fs.readFileSync(resolve(process.cwd(), path), 'utf8'));
const correctionArtifact = 'eppp_memory_aid_correction_wave_01.json';

describe('EPPP memory-aid review wave 05', () => {
  const wave = read('test_prep/eppp_memory_aid_review_wave_05.json');
  const catalog = read('test_prep/eppp_learning_library.json');
  const referenceCatalog = read('test_prep/reference_catalog.json');
  const corrections = read('test_prep/' + correctionArtifact);
  const priorWaves = [1, 2, 3, 4].flatMap((number) => read(`test_prep/eppp_memory_aid_review_wave_0${number}.json`).items);
  const catalogById = new Map(catalog.memoryAids.map((aid) => [aid.id, aid]));
  const correctionById = new Map(corrections.items.map((item) => [item.legacyId, item]));


  const expectCatalogRepresentation = (item) => {
    const aid = catalogById.get(item.legacyId);
    expect(aid, item.legacyId).toBeTruthy();
    if (aid.reviewArtifact !== 'eppp_memory_aid_review_wave_05.json') {
      expect(aid.reviewArtifact, item.legacyId).toBe(correctionArtifact);
      expect(correctionById.get(item.legacyId)?.supersedesArtifact, item.legacyId)
        .toBe('eppp_memory_aid_review_wave_05.json');
    }
    return aid;
  };

  it('closes exactly the two stable source-pending records without overlap', () => {
    expect(wave.summary).toEqual({ items: 2, domains: 2, itemsPerDomain: 1 });
    expect(wave.items.map((item) => item.legacyId)).toEqual([
      'memory-aid-8f73cb6379241610',
      'memory-aid-185b0998347f44f8',
    ]);
    expect(new Set(wave.items.map((item) => item.domainId))).toEqual(new Set([2, 7]));
    const priorIds = new Set(priorWaves.map((item) => item.legacyId));
    for (const item of wave.items) {
      const legacy = expectCatalogRepresentation(item);
      expect(legacy.domainId).toBe(item.domainId);
      expect(priorIds.has(item.legacyId)).toBe(false);
      expect(legacy.reviewStatus).toBe('source-reviewed-editorial-pass');
    }
  });

  it('provides complete claim-level provenance that the catalog rebuild can retain', () => {
    expect(wave.status).toContain('independent-expert-review-pending');
    for (const item of wave.items) {
      expect(item.reviewStatus).toBe('source-reviewed-editorial-pass');
      expect(item.reviewDate).toBe('2026-07-28');
      expect(item.reviewMode).toBe('claim-level-source-and-editorial-review');
      expect(item.content.length).toBeGreaterThanOrEqual(700);
      expect(item.references).toEqual(item.sourceDetails.map((source) => source.url));
      expect(item.references.length).toBeGreaterThanOrEqual(2);
      for (const source of item.sourceDetails) {
        expect(source.title).toBeTruthy();
        expect(source.organization).toBeTruthy();
        expect(source.url).toMatch(/^https:\/\//);
        expect(source.whyReputable.length).toBeGreaterThanOrEqual(100);
        const existing = referenceCatalog[source.url];
        if (existing) {
          expect(existing.title).toBeTruthy();
          expect(existing.credibility).toBeTruthy();
        }
      }
    }
  });

  it('rejects a universal research ladder and preserves design-specific inference limits', () => {
    const item = wave.items.find((entry) => entry.title === 'Research Design Hierarchy');
    expect(item.content).toContain('There is no universal research-design ladder');
    expect(item.content).toContain('Random assignment');
    expect(item.content).toContain('Observational designs');
    expect(item.content).toContain('Qualitative and case-based approaches');
    expect(item.content).toContain('Systematic reviews and meta-analyses synthesize studies');
    expect(item.content).toContain('body of evidence');
    expect(item.content).not.toContain('Highest level of evidence!');
    expect(item.references).toContain('https://pubmed.ncbi.nlm.nih.gov/12821702/');
    expect(item.references).toContain('https://training.cochrane.org/handbook/current/chapter-10');
  });

  it('frames Maslow as a qualified historical proposal rather than a validated strict pyramid', () => {
    const item = wave.items.find((entry) => entry.title === "Maslow's Hierarchy of Needs");
    expect(item.content).toContain('partly satisfied and partly unsatisfied');
    expect(item.content).toContain('reversals of the average order occur');
    expect(item.content).toContain('framework for future research');
    expect(item.content).toContain('only partial support');
    expect(item.content).toContain('not a diagnosis');
    expect(item.content).not.toMatch(/universally validated|an empirically validated strict pyramid/i);
    expect(item.references).toContain('https://doi.org/10.1037/h0054346');
    expect(item.references).toContain('https://doi.org/10.1016/0030-5073(76)90038-6');
  });

  it('keeps the wave free of mojibake and retains the independent-review caveat', () => {
    expect(JSON.stringify(wave)).not.toMatch(/\uFFFD|\u00e2\u20ac|\u00c3/);
    expect(wave.safeguards.join(' ')).toContain('do not constitute independent qualified expert');
  });

  it('closes the source-pending queue in the rebuilt cumulative catalog', () => {
    expect(catalog.summary.sourceReviewedMemoryAids).toBeGreaterThanOrEqual(74);
    expect(catalog.summary.releasedMemoryAids).toBe(catalog.summary.sourceReviewedMemoryAids);
    expect(catalog.summary.editorialReviewedSourcePendingMemoryAids).toBe(0);
    expect(catalog.memoryAids.filter((aid) => aid.reviewStatus === 'review-required')).toHaveLength(
      catalog.summary.memoryAids - catalog.summary.sourceReviewedMemoryAids,
    );
  });
});
