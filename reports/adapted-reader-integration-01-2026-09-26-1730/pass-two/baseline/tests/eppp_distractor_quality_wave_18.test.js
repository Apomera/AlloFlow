import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const json = (relativePath) => JSON.parse(read(relativePath));
const wave = require('../dev-tools/eppp_native_quality_wave_18_data.cjs');
const { assertNativeQualityWaveReplayPreimage } = require('../dev-tools/run_eppp_native_quality_wave.cjs');

const ids = [
  'eppp-b009-biological-1',
  'eppp-b009-social-2',
  'eppp-b010-social-1',
  'eppp-b012-biological-1',
  'eppp-b012-biological-2',
  'eppp-b012-cognitive-1',
  'eppp-b012-intervention-1',
  'eppp-b014-intervention-1',
  'eppp-b016-lifespan-1',
  'eppp-b017-lifespan-1',
];
const expectedKeys = [0, 2, 0, 0, 2, 1, 1, 1, 1, 0];
const expectedDomains = [
  'biological',
  'social-cultural',
  'social-cultural',
  'biological',
  'biological',
  'cognitive-affective',
  'intervention',
  'intervention',
  'lifespan',
  'lifespan',
];
const requiredReferenceById = new Map([
  ['eppp-b009-biological-1', 'https://doi.org/10.1016/j.conb.2006.09.002'],
  ['eppp-b009-social-2', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3100161/'],
  ['eppp-b010-social-1', 'https://doi.org/10.1016/j.obhdp.2006.01.005'],
  ['eppp-b012-biological-1', 'https://doi.org/10.1016/S0301-0511(00)00058-2'],
  ['eppp-b012-biological-2', 'https://doi.org/10.1038/nrn2555'],
  ['eppp-b012-cognitive-1', 'https://doi.org/10.1037/0022-3514.35.9.677'],
  ['eppp-b012-intervention-1', 'https://www.ncbi.nlm.nih.gov/sites/books/NBK459285/'],
  ['eppp-b014-intervention-1', 'https://openstax.org/books/psychology/pages/16-2-types-of-treatment'],
  ['eppp-b016-lifespan-1', 'https://openstax.org/books/fundamentals-nursing/pages/38-2-specific-developmental-theories'],
  ['eppp-b017-lifespan-1', 'https://www.ncbi.nlm.nih.gov/books/NBK537095/'],
]);
const extremeCuePattern = /\b(?:always|never|only|every|entirely|exclusively|without|regardless|automatically|guarantee(?:d|s)?|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;
const genericFeedbackPattern = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim)\b/i;

describe('EPPP distractor-quality repair wave 18', () => {
  it('ships ten protected-key application or analysis rewrites with item-specific sources', () => {
    const sourceText = read('test_prep/eppp_native_items.json');
    expect(read('desktop/web-app/public/test_prep/eppp_native_items.json')).toBe(sourceText);
    const byId = new Map(JSON.parse(sourceText).map((item) => [item.id, item]));

    ids.forEach((id, index) => {
      const item = byId.get(id);
      expect(item).toBeTruthy();
      expect(item.domainId).toBe(expectedDomains[index]);
      expect(item.difficulty).toBe('foundation');
      expect(item.answerIndex).toBe(expectedKeys[index]);
      expect(['application', 'analysis']).toContain(item.cognitiveProcess);
      expect(item.wordingReviewWave).toBe('eppp-native-quality-wave-18');
      expect(item.optionFeedbackRefinementWave).toBe('eppp-native-quality-wave-18');
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
  });

  it('records a passing audit and clears every warning for the selected tranche', () => {
    const auditText = read('test_prep/eppp_native_quality_audit_wave_18.json');
    expect(read('desktop/web-app/public/test_prep/eppp_native_quality_audit_wave_18.json')).toBe(auditText);
    const audit = JSON.parse(auditText);
    expect(audit.summary).toMatchObject({
      totalItems: 1500,
      rewrittenItems: 10,
      domainsCovered: 5,
      appliedOrAnalysisItems: 10,
      keyPositionsPreserved: 10,
      optionSpecificExplanations: 40,
      selectedItemsWithWarningsAfter: 0,
      selectedWarningIdsAfter: [],
      warningCountsBefore: {
        asymmetricExtremeDistractorCandidates: 130,
      },
      status: 'pass',
    });
    expect(audit.items.map((item) => item.id)).toEqual(ids);
    expect(audit.items.every((item) => item.diagnosticsAfter.length === 0)).toBe(true);

    const diagnostics = json('test_prep/eppp_distractor_quality_diagnostics.json');
    const selected = new Set(ids);
    expect(diagnostics.uniqueKeyStemLexicalLeakage.some((item) => selected.has(item.id))).toBe(false);
    expect(diagnostics.asymmetricExtremeDistractors.some((item) => selected.has(item.id))).toBe(false);
    expect(diagnostics.advancedDirectRecall.some((item) => selected.has(item.id))).toBe(false);
    expect(diagnostics.semanticConceptDuplicates.pairs.some(
      (pair) => selected.has(pair.leftId) || selected.has(pair.rightId),
    )).toBe(false);
    expect(json('test_prep/eppp_distractor_action_docket.json').actionItems.some(
      (item) => selected.has(item.id),
    )).toBe(false);
  });

  it('keeps its own after-state replayable and runs before the frozen halving campaign', () => {
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

    const runner = read('dev-tools/repair_eppp_native_quality_wave_18.cjs');
    expect(runner).toContain("waveNumber: '18'");
    expect(runner).toContain('expectedRevisionCount: 10');
    const builder = read('dev-tools/build_eppp_1500_expansion.cjs');
    expect(builder.indexOf("runReplayScript('./repair_eppp_native_quality_wave_18.cjs');")).toBeGreaterThan(-1);
    expect(builder.indexOf("runReplayScript('./repair_eppp_native_quality_wave_18.cjs');"))
      .toBeLessThan(builder.indexOf('runDistractorHalvingCampaign();'));
  });

  it('publishes synchronized source metadata and warning-free option feedback', () => {
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
