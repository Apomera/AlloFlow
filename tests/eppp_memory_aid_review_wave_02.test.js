import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const read = (path) => JSON.parse(fs.readFileSync(resolve(process.cwd(), path), 'utf8'));

describe('EPPP memory-aid review wave 02', () => {
  const wave = read('test_prep/eppp_memory_aid_review_wave_02.json');
  const catalog = read('test_prep/eppp_learning_library.json');

  it('contains exactly two stable-ID reviews per EPPP domain', () => {
    expect(wave.summary).toEqual({ items: 16, domains: 8, itemsPerDomain: 2 });
    expect(wave.items).toHaveLength(16);
    expect(new Set(wave.items.map((item) => item.legacyId)).size).toBe(16);
    for (let domainId = 1; domainId <= 8; domainId += 1) expect(wave.items.filter((item) => item.domainId === domainId)).toHaveLength(2);
  });

  it('provides full source names, organizations, URLs, and reputation rationales', () => {
    expect(wave.items.every((item) => item.reviewStatus === 'source-reviewed-editorial-pass' && item.content.length >= 300 && item.references.length === item.sourceDetails.length)).toBe(true);
    expect(wave.items.every((item) => item.sourceDetails.every((source) => source.title && source.organization && /^https:\/\//.test(source.url) && source.whyReputable.length >= 60))).toBe(true);
  });

  it('applies every reviewed replacement once without promoting title duplicates', () => {
    const applied = catalog.memoryAids.filter((aid) => aid.reviewArtifact === 'eppp_memory_aid_review_wave_02.json');
    expect(applied).toHaveLength(16);
    expect(new Set(applied.map((aid) => aid.id))).toEqual(new Set(wave.items.map((item) => item.legacyId)));
    expect(applied.every((aid) => aid.reviewStatus === 'source-reviewed-editorial-pass' && aid.sourceDetails.length > 0)).toBe(true);
  });

  it('removes the most unsafe or misleading legacy shortcuts', () => {
    const reviewed = wave.items.map((item) => item.content).join(' ');
    const forbiddenClaims = ["Risk factors for suicide:**", "Power should be", "Gold standard for OCD", "HIGHEST rate, MOST resistant", "organism is PASSIVE", "EPPP scaled | **500**"];
    for (const claim of forbiddenClaims) expect(reviewed).not.toContain(claim);

    const questionMarkCount = (reviewed.match(/\?/g) || []).length;
    expect(questionMarkCount).toBe(1);
    expect(wave.items.find((item) => item.legacyId === 'memory-aid-a592a33b2c4587f7')?.content).toContain('effect?');
    expect(JSON.stringify(wave.items.flatMap((item) => item.sourceDetails))).not.toContain("?");
    expect(wave.items.find((item) => item.title === 'Suicide Risk Assessment').content).toContain('direct, dynamic safety assessment');
    expect(wave.items.find((item) => item.title === 'Test Bias & Fairness').content).toContain('not automatically proof of bias');
  });
});
