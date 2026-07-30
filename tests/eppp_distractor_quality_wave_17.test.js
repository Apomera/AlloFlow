import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const json = (relativePath) => JSON.parse(read(relativePath));
const wave = require('../dev-tools/eppp_native_quality_wave_17_data.cjs');
const { assertNativeQualityWaveReplayPreimage } = require('../dev-tools/run_eppp_native_quality_wave.cjs');

const ids = [
  'eppp-v2-biological-033',
  'eppp-v3-biological-032',
  'eppp-b026-assessment-4',
  'eppp-b013-professional-1',
  'eppp-b009-professional-1',
  'eppp-b014-professional-1',
  'eppp-b009-intervention-1',
  'eppp-b013-social-1',
  'eppp-b010-research-2',
  'eppp-b014-research-2',
];
const expectedKeys = [0, 1, 3, 1, 1, 1, 1, 0, 2, 2];
const expectedDomains = [
  'biological',
  'biological',
  'assessment',
  'professional',
  'professional',
  'professional',
  'intervention',
  'social-cultural',
  'research',
  'research',
];
const requiredReferenceById = new Map([
  ['eppp-v2-biological-033', 'https://openstax.org/books/psychology-2e/pages/3-4-the-brain-and-spinal-cord'],
  ['eppp-v3-biological-032', 'https://openstax.org/books/psychology-2e/pages/3-4-the-brain-and-spinal-cord'],
  ['eppp-b026-assessment-4', 'https://www.testingstandards.net/uploads/7/6/6/4/76643089/standards_2014edition.pdf'],
  ['eppp-b013-professional-1', 'https://www.apa.org/ethics/code'],
  ['eppp-b009-professional-1', 'https://www.apa.org/ethics/code'],
  ['eppp-b014-professional-1', 'https://www.apa.org/ethics/code'],
  ['eppp-b009-intervention-1', 'https://doi.org/10.1016/j.brat.2005.06.006'],
  ['eppp-b013-social-1', 'https://doi.org/10.1037/0033-2909.125.1.47'],
  ['eppp-b010-research-2', 'https://ies.ed.gov/ncee/wwc/Handbooks'],
  ['eppp-b014-research-2', 'https://www.itl.nist.gov/div898/handbook/prc/section1/prc131.htm'],
]);
const extremeCuePattern = /\b(?:always|never|only|every|entirely|exclusively|without|regardless|automatically|guarantee(?:d|s)?|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;
const genericFeedbackPattern = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim)\b/i;

describe('EPPP distractor-quality repair wave 17', () => {
  it('ships ten protected-key application or analysis rewrites with direct sources', () => {
    const sourceText = read('test_prep/eppp_native_items.json');
    expect(read('desktop/web-app/public/test_prep/eppp_native_items.json')).toBe(sourceText);
    const byId = new Map(JSON.parse(sourceText).map((item) => [item.id, item]));

    ids.forEach((id, index) => {
      const item = byId.get(id);
      expect(item).toBeTruthy();
      expect(item.id).toBe(id);
      expect(item.domainId).toBe(expectedDomains[index]);
      expect(item.difficulty).toBe('foundation');
      expect(item.answerIndex).toBe(expectedKeys[index]);
      expect(['application', 'analysis']).toContain(item.cognitiveProcess);
      expect(item.wordingReviewWave).toBe('eppp-native-quality-wave-17');
      expect(item.optionFeedbackRefinementWave).toBe('eppp-native-quality-wave-17');
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

  it('records a passing audit and removes every selected warning, including the Broca pair', () => {
    const auditText = read('test_prep/eppp_native_quality_audit_wave_17.json');
    expect(read('desktop/web-app/public/test_prep/eppp_native_quality_audit_wave_17.json')).toBe(auditText);
    const audit = JSON.parse(auditText);
    expect(audit.summary).toMatchObject({
      totalItems: 1500,
      rewrittenItems: 10,
      domainsCovered: 6,
      appliedOrAnalysisItems: 10,
      keyPositionsPreserved: 10,
      optionSpecificExplanations: 40,
      selectedItemsWithWarningsAfter: 0,
      selectedWarningIdsAfter: [],
      warningCountContext: {
        before: expect.stringContaining('not recomputed'),
        after: expect.stringContaining('before the downstream distractor-halving campaign'),
        interpretation: expect.stringContaining('item-level'),
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
    expect(diagnostics.semanticConceptDuplicates.pairs.some((pair) => (
      new Set([pair.leftId, pair.rightId]).has('eppp-v2-biological-033')
      && new Set([pair.leftId, pair.rightId]).has('eppp-v3-biological-032')
    ))).toBe(false);
    expect(json('test_prep/eppp_distractor_action_docket.json').actionItems.some(
      (item) => selected.has(item.id),
    )).toBe(false);
  });

  it('keeps the wave marker as a recognized idempotent replay after-state', () => {
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

    const runner = read('dev-tools/repair_eppp_native_quality_wave_17.cjs');
    expect(runner).toContain("waveNumber: '17'");
    expect(runner).toContain('expectedRevisionCount: 10');
    const builder = read('dev-tools/build_eppp_1500_expansion.cjs');
    expect(builder.indexOf("runReplayScript('./repair_eppp_native_quality_wave_17.cjs');")).toBeGreaterThan(-1);
    expect(builder.indexOf("runReplayScript('./repair_eppp_native_quality_wave_17.cjs');"))
      .toBeLessThan(builder.indexOf('runDistractorHalvingCampaign();'));
  });

  it('publishes synchronized catalogs, feedback, QA, and lazy pack content', () => {
    const sourceCatalog = read('test_prep/reference_catalog.json');
    expect(read('desktop/web-app/public/test_prep/reference_catalog.json')).toBe(sourceCatalog);
    const catalog = JSON.parse(sourceCatalog);
    const byId = new Map(json('test_prep/eppp_native_items.json').map((item) => [item.id, item]));
    for (const id of ids) {
      for (const source of byId.get(id).sourceDetails) {
        expect(catalog[source.url]).toMatchObject({ metadataSource: 'pack-authored' });
        expect(catalog[source.url].title.length).toBeGreaterThanOrEqual(20);
        expect(catalog[source.url].organization.length).toBeGreaterThanOrEqual(5);
        expect(catalog[source.url].summary.length).toBeGreaterThanOrEqual(120);
        expect(catalog[source.url].credibility.length).toBeGreaterThanOrEqual(120);
      }
    }

    const selected = new Set(ids);
    expect(json('test_prep/eppp_option_feedback_diagnostics.json').optionFindings.some(
      (item) => selected.has(item.id),
    )).toBe(false);
    const qa = json('test_prep/eppp_native_qa.json');
    expect(qa.summary).toMatchObject({
      totalItems: 1500,
      passedItems: 1500,
      reviewRequiredItems: 0,
      status: 'pass',
    });
    expect(qa.items.filter((item) => selected.has(item.id)).every(
      (item) => item.qaStatus === 'pass',
    )).toBe(true);

    const sourcePack = read('test_prep/eppp_part_one_pack.json');
    expect(read('desktop/web-app/public/test_prep/eppp_part_one_pack.json')).toBe(sourcePack);
    expect(sourcePack).toContain('follows two-step spoken commands');
    expect(sourcePack).toContain('incompatible with screen readers');
    expect(sourcePack).toContain('smaller classes and more experienced teachers');
  });
});
