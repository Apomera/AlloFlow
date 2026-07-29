import fs from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath) => JSON.parse(fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8'));
const forbidden = /[\u00c2\u00c3\u00e2\u00f0\ufffd]|&(?:mdash|ndash|nbsp|ldquo|rdquo|rsquo);/iu;

describe('EPPP memory-aid Wave 08 final modular artifact', () => {
  const wave = read('test_prep/eppp_memory_aid_review_wave_08.json');
  const catalog = read('test_prep/eppp_learning_library.json');
  const manifest = read('dev-tools/eppp_memory_aid_wave08/manifest.json');
  const correction = read('test_prep/eppp_memory_aid_correction_wave_01.json');
  const builderSource = fs.readFileSync(resolve(process.cwd(), 'dev-tools/build_eppp_learning_library.cjs'), 'utf8');
  const wrapperSource = fs.readFileSync(resolve(process.cwd(), 'dev-tools/build_eppp_learning_library_with_reviews.cjs'), 'utf8');
  const moduleItems = Object.entries(manifest.domains).flatMap(([domainId, entry]) =>
    read(`dev-tools/eppp_memory_aid_wave08/${entry.module}`).items.map((item) => ({
      ...item,
      domainId: Number(domainId),
      reviewWave: 'eppp-memory-aid-review-wave-08',
    })),
  ).sort((left, right) => left.domainId - right.domainId || left.legacyId.localeCompare(right.legacyId));

  it('contains the exact fixed 149-item scope once across eight complete domains', () => {
    expect(Object.values(manifest.domains).every((entry) => entry.status === 'complete')).toBe(true);
    expect(wave.summary).toMatchObject({
      items: 149,
      domains: 8,
      sourceReviewedEditorialPass: 149,
      independentExpertReviewPending: 149,
      productionValidationPending: 149,
    });
    expect(wave.items).toHaveLength(149);
    expect(new Set(wave.items.map((item) => item.legacyId)).size).toBe(149);
    expect(wave.items.map((item) => item.legacyId).sort()).toEqual(moduleItems.map((item) => item.legacyId).sort());
    expect(Object.values(wave.summary.domainCounts).reduce((sum, count) => sum + count, 0)).toBe(149);
  });

  it('is a deterministic ordered projection of the eight explicit modules', () => {
    expect(wave.items).toEqual(moduleItems);
    expect(wave.items).toEqual([...wave.items].sort((left, right) =>
      left.domainId - right.domainId || left.legacyId.localeCompare(right.legacyId),
    ));
  });

  it('requires substantive clean content, directly aligned provenance, and explicit gates', () => {
    expect(wave.summary.uniqueSources).toBe(new Set(wave.items.flatMap((item) => item.references)).size);
    expect(wave.summary.uniqueSources).toBeGreaterThanOrEqual(80);
    for (const item of wave.items) {
      expect(item.content.length).toBeGreaterThan(180);
      expect(JSON.stringify(item)).not.toMatch(forbidden);
      expect(item.content).not.toContain('**Source-review boundary:**');
      expect(item.reviewNote).not.toContain('Preserved the existing');
      expect(item.references).toEqual(item.sourceDetails.map((source) => source.url));
      expect(item.sourceDetails.length).toBeGreaterThanOrEqual(1);
      expect(item.sourceDetails.every((source) =>
        /^https:\/\//.test(source.url) &&
        source.whyReputable.length > 100
      )).toBe(true);
      expect(item.reviewStatus).toBe('source-reviewed-editorial-pass');
      expect(item.reviewMode).toBe('claim-level-source-and-editorial-correction');
      expect(item.reviewWave).toBe('eppp-memory-aid-review-wave-08');
      expect(item.independentExpertStatus).toBe('not-started');
      expect(item.productionStatus).toBe('not-production-validated');
    }
  });

  it('wires deterministic post-review corrections into the coordinated build', () => {
    expect(correction.summary.items).toBe(42);
    expect(correction.items).toHaveLength(42);
    expect(new Set(correction.items.map((item) => item.legacyId)).size).toBe(42);
    expect(correction.items.every((item) =>
      item.reviewStatus === 'source-reviewed-editorial-pass'
      && item.independentExpertStatus === 'not-started'
      && item.productionStatus === 'not-production-validated'
      && item.references.length > 0
      && JSON.stringify(item.references) === JSON.stringify(item.sourceDetails.map((source) => source.url))
    )).toBe(true);
    const composeIndex = wrapperSource.indexOf('compose_eppp_memory_aid_review_wave_08.cjs');
    const correctionIndex = wrapperSource.indexOf('build_eppp_memory_aid_correction_wave_01.cjs');
    const catalogIndex = wrapperSource.indexOf('build_eppp_learning_library.cjs');
    expect(composeIndex).toBeLessThan(correctionIndex);
    expect(correctionIndex).toBeLessThan(catalogIndex);
    expect(builderSource).toContain('memoryAidCorrectionWavePattern');
    expect(builderSource).toContain('{ ...manualOverride, ...waveOverride, ...correctionOverride }');
  });
  it('requires the coordinated library build to integrate all reviewed aids with provenance', () => {
    expect(catalog.summary.memoryAids).toBe(255);
    expect(catalog.summary.sourceReviewedMemoryAids).toBe(255);
    expect(catalog.summary.releasedMemoryAids).toBe(255);
    expect(catalog.memoryAids.filter((item) => item.reviewStatus === 'review-required')).toHaveLength(0);
    expect(catalog.memoryAids.every((item) => item.reviewStatus === 'source-reviewed-editorial-pass')).toBe(true);
    expect(catalog.memoryAids.every((item) => typeof item.reviewArtifact === 'string' && item.reviewArtifact.length > 0)).toBe(true);
    const correctionIds = new Set(correction.items.map((item) => item.legacyId));
    const corrected = catalog.memoryAids.filter((item) => correctionIds.has(item.id));
    expect(corrected).toHaveLength(42);
    expect(corrected.every((item) => item.reviewArtifact === 'eppp_memory_aid_correction_wave_01.json'
      && item.correctionArtifact === 'eppp_memory_aid_correction_wave_01.json'
      && item.supersedesArtifact)).toBe(true);
  });
});
