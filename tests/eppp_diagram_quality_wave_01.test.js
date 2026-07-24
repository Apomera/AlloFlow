import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (relativePath) => fs.readFileSync(resolve(root, relativePath), 'utf8');
const json = (relativePath) => JSON.parse(read(relativePath));
const expectedKeys = ['hpaAxis', 'memoryModel', 'synapseDrugs', 'visualPathway', 'freudIceberg', 'kohlbergMoral', 'aschConformity'];

describe('EPPP diagram quality review wave 01', () => {
  it('records seven corrected, sourced templates and every current placement', () => {
    const wave = json('test_prep/eppp_diagram_review_wave_01.json');
    expect(wave.reviewWave).toBe('eppp-diagram-review-wave-01');
    expect(wave.reviewDate).toBe('2026-07-16');
    expect(wave.status).toBe('assisted-editorial-source-review-complete-expert-pending');
    expect(wave.summary).toMatchObject({
      reviewedDiagramTemplates: 7,
      correctedDiagramTemplates: 7,
      sourceReviewedDiagramTemplates: 7,
      independentExpertValidated: 0,
      status: 'pass',
    });
    expect(wave.items.map((item) => item.key)).toEqual(expectedKeys);
    expect(wave.summary.placementRecords).toBe(wave.items.reduce((sum, item) => sum + item.placements.length, 0));
    for (const item of wave.items) {
      expect(item.reviewStatus, item.key).toBe('source-reviewed-editorial-pass');
      expect(item.reviewWave, item.key).toBe(wave.reviewWave);
      expect(item.reviewDate, item.key).toBe(wave.reviewDate);
      expect(item.placementCount, item.key).toBe(item.placements.length);
      expect(item.placements.length, item.key).toBeGreaterThan(0);
      expect(item.placements.every((placement) => placement.chapterId && placement.chapterTitle && placement.sectionHeading && placement.legacySource), item.key).toBe(true);
      expect(item.references, item.key).toEqual(item.sourceDetails.map((source) => source.url));
      expect(item.sourceDetails.length, item.key).toBeGreaterThan(0);
      for (const source of item.sourceDetails) {
        expect(source.title.length, item.key).toBeGreaterThanOrEqual(10);
        expect(source.organization.length, item.key).toBeGreaterThan(20);
        expect(source.url, item.key).toMatch(/^https:\/\//);
        expect(source.whyReputable.length, item.key).toBeGreaterThan(120);
      }
      expect(item.reviewNote, item.key).toMatch(/Independent qualified expert validation remains pending\.$/);
      expect(item.checks, item.key).toMatchObject({
        textAlternative: 'editorial-pass',
        conceptAccuracy: 'assisted-editorial-pass-expert-pending',
        labelQuality: 'editorial-pass',
        sourceSupport: 'topically-aligned-reputable-source',
        expertReview: 'pending-independent-review',
      });
    }
  });

  it('removes the seven audited overclaims and preserves the intended qualifications', () => {
    const source = read('test_prep/eppp_legacy/js/textbook_diagrams.js');
    for (const oldText of [
      'Chronic activation leads to hippocampal damage and mood disorders.',
      '7±2 items, 15-30s',
      'Infinite cap, Permanent',
      'Both SSRIs and MAOIs result in MORE neurotransmitter',
      'damage after the chiasm affects one entire visual field',
      'Completely hidden',
      'ethics of care" more prevalent in women',
      'about 32% of trials',
      'Gives in to majority',
      '"...1"',
    ]) expect(source).not.toContain(oldText);
    for (const correctedText of [
      'does not determine that a person will develop a disorder',
      'Atkinson–Shiffrin Modal Model of Memory',
      'Large capacity, durable',
      'MAOIs inhibit intracellular metabolism of monoamines',
      'optic-radiation lesions can produce quadrantanopia',
      'Historical theory, not an anatomical map',
      'only small average gender differences',
      '36.8% of critical trials',
      'Response is not predetermined',
    ]) expect(source).toContain(correctedText);
  });

  it('publishes exact source/deployment mirrors and build-order integration', () => {
    for (const relativePath of [
      'test_prep/eppp_legacy/js/textbook_diagrams.js',
      'test_prep/eppp_diagram_review_wave_01.json',
      'test_prep/eppp_diagram_review_wave_01.md',
    ]) {
      expect(read(`desktop/web-app/public/${relativePath}`)).toBe(read(relativePath));
    }
    const builder = read('_build_test_prep_hub_module.js');
    expect(builder).toContain("const DIAGRAM_QUALITY_WAVE_01_SCRIPT = path.join(ROOT, 'dev-tools', 'repair_eppp_diagram_quality_wave_01.cjs');");
    expect(builder.indexOf('node "${DIAGRAM_QUALITY_WAVE_01_SCRIPT}"')).toBeGreaterThan(-1);
    expect(builder.indexOf('node "${DIAGRAM_QUALITY_WAVE_01_SCRIPT}"')).toBeLessThan(builder.indexOf('node "${LEARNING_LIBRARY_SCRIPT}"'));
    expect(read('test_prep/eppp_diagram_review_wave_01.md')).not.toMatch(/Content QA passed/i);
  });
});
