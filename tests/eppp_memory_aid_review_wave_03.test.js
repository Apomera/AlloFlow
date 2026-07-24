import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const read = (path) => JSON.parse(fs.readFileSync(resolve(process.cwd(), path), 'utf8'));

describe('EPPP memory-aid review wave 03', () => {
  const wave = read('test_prep/eppp_memory_aid_review_wave_03.json');
  const catalog = read('test_prep/eppp_learning_library.json');

  it('contains exactly two stable-ID reviews per EPPP domain', () => {
    expect(wave.summary).toEqual({ items: 16, domains: 8, itemsPerDomain: 2 });
    expect(wave.items).toHaveLength(16);
    expect(new Set(wave.items.map((item) => item.legacyId)).size).toBe(16);
    for (let domainId = 1; domainId <= 8; domainId += 1) expect(wave.items.filter((item) => item.domainId === domainId)).toHaveLength(2);
  });

  it('provides claim-level source provenance for every replacement', () => {
    expect(wave.items.every((item) => item.reviewStatus === 'source-reviewed-editorial-pass' && item.content.length >= 500 && item.references.length === item.sourceDetails.length)).toBe(true);
    expect(wave.items.every((item) => item.sourceDetails.every((source) => source.title && source.organization && /^https:\/\//.test(source.url) && source.whyReputable.length >= 80))).toBe(true);
    expect(wave.items.every((item) => item.reviewDate === '2026-07-23' && item.reviewMode === 'claim-level-source-and-editorial-review')).toBe(true);
  });

  it('applies every reviewed replacement once without relying on duplicate titles', () => {
    const applied = catalog.memoryAids.filter((aid) => aid.reviewArtifact === 'eppp_memory_aid_review_wave_03.json');
    expect(applied).toHaveLength(16);
    expect(new Set(applied.map((aid) => aid.id))).toEqual(new Set(wave.items.map((item) => item.legacyId)));
    expect(applied.every((aid) => aid.reviewStatus === 'source-reviewed-editorial-pass' && aid.sourceDetails.length > 0)).toBe(true);
  });

  it('removes deterministic clinical, cultural, psychometric, and legal shortcuts', () => {
    const reviewed = wave.items.map((item) => item.content).join(' ');
    for (const claim of ['inverted-U like a hill', 'Integration = Best outcomes', '4 D\'s in order', 'CBT has the most empirical support across disorders', 'EPPP: 500 = passing score (fixed standard)', 'When in doubt, REPORT', 'most states have adopted similar statutes']) expect(reviewed).not.toContain(claim);
    expect(wave.items.find((item) => item.title === 'Neurotransmitter Functions').content).toContain('many-to-many map');
    expect(wave.items.find((item) => item.title === 'Kubler-Ross Grief Stages').content).toContain('not a required sequence');
    expect(wave.items.find((item) => item.title === 'Mandated Reporting Details').content).toContain('current-law lookup');
    expect(wave.items.find((item) => item.title === 'Criterion-Referenced vs. Norm-Referenced Tests').content).toContain('currently recommends 500');
    expect(reviewed).not.toMatch(/\uFFFD|\u00e2\u20ac|\u00c3/);
  });
});
