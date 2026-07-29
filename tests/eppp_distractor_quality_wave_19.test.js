import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const json = (relativePath) => JSON.parse(read(relativePath));
const wave = require('../dev-tools/eppp_native_quality_wave_19_data.cjs');
const { assertNativeQualityWaveReplayPreimage } = require('../dev-tools/run_eppp_native_quality_wave.cjs');

const ids = [
  'eppp-v2-biological-003',
  'eppp-v3-biological-017',
  'eppp-v2-biological-005',
  'eppp-v2-intervention-072',
  'eppp-v3-intervention-070',
  'eppp-v3-intervention-027',
  'eppp-v3-assessment-061',
  'eppp-v3-assessment-002',
  'eppp-b007-assessment-1',
  'eppp-b012-assessment-1',
];
const expectedKeys = [2, 2, 0, 1, 3, 1, 2, 3, 0, 0];
const expectedDomains = [
  'biological',
  'biological',
  'biological',
  'intervention',
  'intervention',
  'intervention',
  'assessment',
  'assessment',
  'assessment',
  'assessment',
];
const expectedDifficulties = [
  'intermediate',
  'intermediate',
  'intermediate',
  'foundation',
  'foundation',
  'foundation',
  'foundation',
  'intermediate',
  'foundation',
  'foundation',
];
const requiredReferenceById = new Map([
  ['eppp-v2-biological-003', 'https://www.ncbi.nlm.nih.gov/books/NBK470344/'],
  ['eppp-v3-biological-017', 'https://www.ncbi.nlm.nih.gov/books/NBK470344/'],
  ['eppp-v2-biological-005', 'https://www.ncbi.nlm.nih.gov/books/NBK470344/'],
  ['eppp-v2-intervention-072', 'https://doi.org/10.1016/j.brat.2014.04.006'],
  ['eppp-v3-intervention-070', 'https://www.nimh.nih.gov/news/science-updates/2024/my-life-with-ocd'],
  ['eppp-v3-intervention-027', 'https://www.nimh.nih.gov/news/science-updates/2024/my-life-with-ocd'],
  ['eppp-v3-assessment-061', 'https://www.testingstandards.net/uploads/7/6/6/4/76643089/9780935302356.pdf'],
  ['eppp-v3-assessment-002', 'https://www.testingstandards.net/uploads/7/6/6/4/76643089/9780935302356.pdf'],
  ['eppp-b007-assessment-1', 'https://www.testingstandards.net/uploads/7/6/6/4/76643089/9780935302356.pdf'],
  ['eppp-b012-assessment-1', 'https://www.testingstandards.net/uploads/7/6/6/4/76643089/9780935302356.pdf'],
]);
const extremeCuePattern = /\b(?:always|never|only|every|entirely|exclusively|without|regardless|automatically|guarantee(?:d|s)?|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;
const genericFeedbackPattern = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim)\b/i;

describe('EPPP distractor-quality repair wave 19', () => {
  it('ships ten protected-key application or analysis rewrites with item-specific sources', () => {
    const sourceText = read('test_prep/eppp_native_items.json');
    expect(read('desktop/web-app/public/test_prep/eppp_native_items.json')).toBe(sourceText);
    const byId = new Map(JSON.parse(sourceText).map((item) => [item.id, item]));

    ids.forEach((id, index) => {
      const item = byId.get(id);
      expect(item).toBeTruthy();
      expect(item.domainId).toBe(expectedDomains[index]);
      expect(item.difficulty).toBe(expectedDifficulties[index]);
      expect(item.answerIndex).toBe(expectedKeys[index]);
      expect(['application', 'analysis']).toContain(item.cognitiveProcess);
      expect(item.wordingReviewWave).toBe('eppp-native-quality-wave-19');
      expect(item.optionFeedbackRefinementWave).toBe('eppp-native-quality-wave-19');
      expect(item.choices).toHaveLength(4);
      expect(new Set(item.choices.map((choice) => choice.toLowerCase())).size).toBe(4);
      expect(item.choices.some((choice) => extremeCuePattern.test(choice))).toBe(false);
      expect(item.choiceRationales).toHaveLength(4);
      expect(item.choiceRationales[item.answerIndex]).toBe(item.rationale);
      expect(item.choiceRationales.every(
        (feedback) => feedback.length >= 120 && !genericFeedbackPattern.test(feedback),
      )).toBe(true);
      expect(item.references).toContain(requiredReferenceById.get(id));
      expect(item.references).toHaveLength(item.sourceDetails.length);
      expect(item.sourceDetails.every((source) => item.references.includes(source.url)
        && source.title.length >= 20
        && source.organization.length >= 10
        && source.summary.length >= 120
        && source.credibility.length >= 120)).toBe(true);
      expect(item.distractorDesign).toHaveLength(3);
      expect(item.sourceReviewBasis).toBe('item-specific-authoritative-source-review');
    });

    expect(expectedKeys.reduce((counts, key) => {
      counts[key] += 1;
      return counts;
    }, [0, 0, 0, 0])).toEqual([3, 2, 3, 2]);
  });

  it('clears every selected warning and records its pre-campaign global after-state', () => {
    const auditText = read('test_prep/eppp_native_quality_audit_wave_19.json');
    expect(read('desktop/web-app/public/test_prep/eppp_native_quality_audit_wave_19.json')).toBe(auditText);
    const audit = JSON.parse(auditText);
    expect(audit.summary).toMatchObject({
      totalItems: 1500,
      rewrittenItems: 10,
      domainsCovered: 3,
      appliedOrAnalysisItems: 10,
      keyPositionsPreserved: 10,
      optionSpecificExplanations: 40,
      selectedItemsWithWarningsAfter: 0,
      selectedWarningIdsAfter: [],
      warningCountsBefore: {
        uniqueKeyStemLexicalLeakageCandidates: 65,
        asymmetricExtremeDistractorCandidates: 120,
        advancedDirectRecallCandidates: 7,
        semanticConceptDuplicatePairs: 114,
        semanticConceptDuplicateClusters: 58,
      },
      status: 'pass',
    });
    expect(audit.summary.warningCountsAfter).toMatchObject({
      asymmetricExtremeDistractorCandidates: 120,
      advancedDirectRecallCandidates: 7,
    });
    expect(audit.summary.warningCountsAfter.uniqueKeyStemLexicalLeakageCandidates).toBeLessThanOrEqual(67);
    expect(audit.summary.warningCountsAfter.semanticConceptDuplicatePairs).toBeLessThanOrEqual(98);
    expect(audit.summary.warningCountsAfter.semanticConceptDuplicateClusters).toBeLessThanOrEqual(57);
    expect(audit.items.map((item) => item.id)).toEqual(ids);
    expect(audit.items.every(
      (item) => item.diagnosticsBefore.includes('semantic-concept-duplicate-candidate')
        && item.diagnosticsAfter.length === 0,
    )).toBe(true);

    const diagnostics = json('test_prep/eppp_distractor_quality_diagnostics.json');
    const selected = new Set(ids);
    expect(diagnostics.uniqueKeyStemLexicalLeakage.some((item) => selected.has(item.id))).toBe(false);
    expect(diagnostics.asymmetricExtremeDistractors.some((item) => selected.has(item.id))).toBe(false);
    expect(diagnostics.advancedDirectRecall.some((item) => selected.has(item.id))).toBe(false);
    expect(diagnostics.semanticConceptDuplicates.pairs.some(
      (pair) => selected.has(pair.leftId) || selected.has(pair.rightId),
    )).toBe(false);
    expect(diagnostics.summary).toMatchObject({
      asymmetricExtremeDistractorCandidates: 120,
      advancedDirectRecallCandidates: 7,
    });
    expect(diagnostics.summary.uniqueKeyStemLexicalLeakageCandidates).toBeLessThanOrEqual(65);
    expect(diagnostics.summary.semanticConceptDuplicatePairs).toBeLessThanOrEqual(95);
    expect(diagnostics.summary.semanticConceptDuplicateClusters).toBeLessThanOrEqual(54);
  });

  it('keeps its own after-state replayable and runs after wave 18 before the frozen campaign', () => {
    expect(wave.revisions.map((revision) => revision.id)).toEqual(ids);
    wave.revisions.forEach((revision) => {
      const state = assertNativeQualityWaveReplayPreimage({
        item: {
          prompt: revision.prompt,
          wordingReviewWave: wave.reviewWave,
        },
        action: undefined,
        revision,
        reviewWave: wave.reviewWave,
      });
      expect(state.matchesOwnWaveAfterState).toBe(true);
      expect(state.hasOwnWaveMarker).toBe(true);
    });

    const runner = read('dev-tools/repair_eppp_native_quality_wave_19.cjs');
    expect(runner).toContain("waveNumber: '19'");
    expect(runner).toContain('expectedRevisionCount: 10');
    const builder = read('dev-tools/build_eppp_1500_expansion.cjs');
    const wave18Index = builder.indexOf("runReplayScript('./repair_eppp_native_quality_wave_18.cjs');");
    const wave19Index = builder.indexOf("runReplayScript('./repair_eppp_native_quality_wave_19.cjs');");
    expect(wave19Index).toBeGreaterThan(wave18Index);
    expect(wave19Index).toBeLessThan(builder.indexOf('runDistractorHalvingCampaign();'));
  });

  it('publishes synchronized sources and warning-free option teaching feedback', () => {
    const sourceCatalog = read('test_prep/reference_catalog.json');
    expect(read('desktop/web-app/public/test_prep/reference_catalog.json')).toBe(sourceCatalog);
    const catalog = JSON.parse(sourceCatalog);
    const byId = new Map(json('test_prep/eppp_native_items.json').map((item) => [item.id, item]));
    for (const id of ids) {
      for (const source of byId.get(id).sourceDetails) {
        const entry = catalog[source.url];
        expect(entry).toMatchObject({ metadataSource: 'pack-authored' });
        for (const [field, minimum] of Object.entries({ title: 20, organization: 10, summary: 120, credibility: 120 })) {
          expect(String(source[field] || '').length).toBeGreaterThanOrEqual(minimum);
          expect(String(entry[field] || '').length).toBeGreaterThanOrEqual(minimum);
        }
      }
    }

    const selected = new Set(ids);
    expect(json('test_prep/eppp_option_feedback_diagnostics.json').optionFindings.some(
      (item) => selected.has(item.id),
    )).toBe(false);
    const qa = json('test_prep/eppp_native_qa.json');
    expect(qa.items.filter((item) => selected.has(item.id)).every(
      (item) => item.qaStatus === 'pass',
    )).toBe(true);
  });
});
