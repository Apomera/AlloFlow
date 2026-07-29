import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const read = (path) => JSON.parse(fs.readFileSync(resolve(process.cwd(), path), 'utf8'));
const correctionArtifact = 'eppp_memory_aid_correction_wave_01.json';
const normalizeTitle = (value) => String(value || '')
  .normalize('NFKD')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[\p{P}\p{S}]+/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

describe('EPPP memory-aid review wave 04', () => {
  const wave = read('test_prep/eppp_memory_aid_review_wave_04.json');
  const catalog = read('test_prep/eppp_learning_library.json');
  const referenceCatalog = read('test_prep/reference_catalog.json');
  const corrections = read('test_prep/' + correctionArtifact);
  const priorWaves = [1, 2, 3].flatMap((number) => read(`test_prep/eppp_memory_aid_review_wave_0${number}.json`).items);
  const catalogById = new Map(catalog.memoryAids.map((aid) => [aid.id, aid]));
  const correctionById = new Map(corrections.items.map((item) => [item.legacyId, item]));
  const titleCounts = Object.groupBy(catalog.memoryAids, (aid) => normalizeTitle(aid.title));


  const expectCatalogRepresentation = (item) => {
    const aid = catalogById.get(item.legacyId);
    expect(aid, item.legacyId).toBeTruthy();
    if (aid.reviewArtifact !== 'eppp_memory_aid_review_wave_04.json') {
      expect(aid.reviewArtifact, item.legacyId).toBe(correctionArtifact);
      expect(correctionById.get(item.legacyId)?.supersedesArtifact, item.legacyId)
        .toBe('eppp_memory_aid_review_wave_04.json');
    }
    return aid;
  };

  it('contains exactly two stable-ID reviews per EPPP domain', () => {
    expect(wave.summary).toEqual({ items: 16, domains: 8, itemsPerDomain: 2 });
    expect(wave.items).toHaveLength(16);
    expect(new Set(wave.items.map((item) => item.legacyId)).size).toBe(16);
    for (let domainId = 1; domainId <= 8; domainId += 1) {
      expect(wave.items.filter((item) => item.domainId === domainId)).toHaveLength(2);
    }
  });

  it('targets existing unreleased stable IDs without overlapping earlier waves or duplicate-title groups', () => {
    const priorIds = new Set(priorWaves.map((item) => item.legacyId));
    for (const item of wave.items) {
      const legacy = expectCatalogRepresentation(item);
      expect(legacy.domainId).toBe(item.domainId);
      expect(priorIds.has(item.legacyId)).toBe(false);
      expect(titleCounts[normalizeTitle(legacy.title)]).toHaveLength(1);
    }
  });

  it('provides claim-level provenance already present in the repository catalog', () => {
    expect(wave.status).toContain('independent-expert-review-pending');
    for (const item of wave.items) {
      expect(item.reviewStatus).toBe('source-reviewed-editorial-pass');
      expect(item.reviewDate).toBe('2026-07-28');
      expect(item.reviewMode).toBe('claim-level-source-and-editorial-review');
      expect(item.content.length).toBeGreaterThanOrEqual(500);
      expect(item.references.length).toBeGreaterThan(0);
      expect(item.references).toEqual(item.sourceDetails.map((source) => source.url));
      for (const source of item.sourceDetails) {
        expect(source.title).toBeTruthy();
        expect(source.organization).toBeTruthy();
        expect(source.url).toMatch(/^https:\/\//);
        expect(source.whyReputable.length).toBeGreaterThanOrEqual(80);
        expect(referenceCatalog[source.url]).toBeTruthy();
      }
    }
  });

  it('removes the most consequential deterministic, stigmatizing, and unsafe legacy shortcuts', () => {
    const reviewed = wave.items.map((item) => item.content).join(' ');
    for (const claim of [
      'Too little water = depression',
      'Left = Language & Logic, Right = Rhythm & Recognition',
      '7±2 items',
      'Frustration ALWAYS leads to aggression',
      'Fixation: smoking, overeating, dependency',
      'male moral reasoning as norm',
      'IQ ~70 or below',
      'The body "converts" psychological stress',
      'Maximum anxiety, ALL AT ONCE',
      'ALL behavior is CHOSEN',
      'Highest level of evidence!',
      'Every person has EQUAL chance (gold standard)',
      'Psychologists are MANDATORY reporters in all 50 states',
      "NEVER terminate because client can't pay"
    ]) {
      expect(reviewed).not.toContain(claim);
    }
    expect(wave.items.find((item) => item.title === 'Child Abuse Reporting').content).toContain('current-jurisdiction');
    expect(wave.items.find((item) => item.title === 'Child Abuse Reporting').references).toContain('https://www.childwelfare.gov/pubpdfs/manda.pdf');
    expect(wave.items.find((item) => item.title === 'Child Abuse Reporting').references).not.toContain('https://www.childwelfare.gov/resources/mandatory-reporting-child-abuse-and-neglect/');
    expect(wave.items.find((item) => item.title === 'Intellectual Disability Criteria').content).toContain('an IQ cutoff alone is insufficient');
    expect(wave.items.find((item) => item.title === 'Stereotype Threat').content).toContain('null or smaller replications');
    expect(wave.safeguards.join(' ')).toContain('do not constitute independent qualified expert');
    expect(reviewed).not.toMatch(/\uFFFD|\u00e2\u20ac|\u00c3/);
  });
});
