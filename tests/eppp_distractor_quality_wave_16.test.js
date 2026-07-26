import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const json = (relativePath) => JSON.parse(read(relativePath));
const ids = [
  'eppp-v2-intervention-031',
  'eppp-b015-cognitive-1',
  'eppp-v3-intervention-060',
  'eppp-b016-cognitive-1',
  'eppp-v2-cognitive-affective-007',
  'eppp-b016-professional-1',
  'eppp-b027-professional-4',
  'eppp-v3-intervention-006',
];
const expectedKeys = [0, 1, 0, 1, 0, 1, 3, 3];
const extremeCuePattern = /\b(?:always|never|only|every|entirely|exclusively|without|regardless|automatically|guarantee(?:d|s)?|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;
const genericFeedbackPattern = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim)\b/i;

describe('EPPP distractor-quality repair wave 16', () => {
  it('ships eight source-backed application or analysis rewrites with preserved keys', () => {
    const sourceText = read('test_prep/eppp_native_items.json');
    expect(read('desktop/web-app/public/test_prep/eppp_native_items.json')).toBe(sourceText);
    const byId = new Map(JSON.parse(sourceText).map((item) => [item.id, item]));

    ids.forEach((id, index) => {
      const item = byId.get(id);
      expect(item).toBeTruthy();
      expect(item.answerIndex).toBe(expectedKeys[index]);
      expect(['application', 'analysis']).toContain(item.cognitiveProcess);
      expect(item.wordingReviewWave).toBe('eppp-native-quality-wave-16');
      expect(item.prompt).not.toMatch(/^complete the statement\b/i);
      expect(item.choices).toHaveLength(4);
      expect(new Set(item.choices.map((choice) => choice.toLowerCase())).size).toBe(4);
      expect(item.choices.some((choice) => extremeCuePattern.test(choice))).toBe(false);
      expect(item.choiceRationales).toHaveLength(4);
      expect(item.choiceRationales[item.answerIndex]).toBe(item.rationale);
      expect(item.choiceRationales.every((feedback) => feedback.length >= 120 && !genericFeedbackPattern.test(feedback))).toBe(true);
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

  it('records a passing audit and clears every selected warning family', () => {
    const auditText = read('test_prep/eppp_native_quality_audit_wave_16.json');
    expect(read('desktop/web-app/public/test_prep/eppp_native_quality_audit_wave_16.json')).toBe(auditText);
    const audit = JSON.parse(auditText);
    expect(audit.summary).toMatchObject({
      totalItems: 1500,
      rewrittenItems: 8,
      domainsCovered: 3,
      appliedOrAnalysisItems: 8,
      keyPositionsPreserved: 8,
      optionSpecificExplanations: 32,
      selectedItemsWithWarningsAfter: 0,
      selectedWarningIdsAfter: [],
      status: 'pass',
    });
    expect(audit.items.map((item) => item.id)).toEqual(ids);
    expect(audit.items.every((item) => item.diagnosticsAfter.length === 0)).toBe(true);

    const diagnostics = json('test_prep/eppp_distractor_quality_diagnostics.json');
    const selected = new Set(ids);
    expect(diagnostics.uniqueKeyStemLexicalLeakage.some((item) => selected.has(item.id))).toBe(false);
    expect(diagnostics.asymmetricExtremeDistractors.some((item) => selected.has(item.id))).toBe(false);
    expect(diagnostics.advancedDirectRecall.some((item) => selected.has(item.id))).toBe(false);
    expect(diagnostics.semanticConceptDuplicates.pairs.some((pair) => selected.has(pair.leftId) || selected.has(pair.rightId))).toBe(false);
    expect(json('test_prep/eppp_distractor_action_docket.json').actionItems.some((item) => selected.has(item.id))).toBe(false);
  });

  it('separates neighboring memory, intervention, and forensic decisions', () => {
    const byId = new Map(json('test_prep/eppp_native_items.json').map((item) => [item.id, item]));
    expect(byId.get('eppp-v2-intervention-031').rationale).toMatch(/crisis survival/i);
    expect(byId.get('eppp-b015-cognitive-1').rationale).toMatch(/organismic state/i);
    expect(byId.get('eppp-v3-intervention-060').rationale).toMatch(/Symptom elimination.*not a prerequisite/i);
    expect(byId.get('eppp-b016-cognitive-1').rationale).toMatch(/Same-room and same-state manipulations/i);
    expect(byId.get('eppp-v2-cognitive-affective-007').rationale).toMatch(/no encoding operation is superior independent/i);
    expect(byId.get('eppp-b016-professional-1').rationale).toMatch(/Payment by a party does not convert/i);
    expect(byId.get('eppp-b027-professional-4').rationale).toMatch(/discrepancy is evidence to investigate/i);
    expect(byId.get('eppp-v3-intervention-006').rationale).toMatch(/social-ecological formulation/i);
  });

  it('publishes synchronized sources, clean feedback, native QA, and runtime content', () => {
    const sourceCatalog = read('test_prep/reference_catalog.json');
    expect(read('desktop/web-app/public/test_prep/reference_catalog.json')).toBe(sourceCatalog);
    const catalog = JSON.parse(sourceCatalog);
    const byId = new Map(json('test_prep/eppp_native_items.json').map((item) => [item.id, item]));
    for (const id of ids) {
      for (const source of byId.get(id).sourceDetails) {
        expect(catalog[source.url]).toMatchObject({
          title: source.title,
          organization: source.organization,
          summary: source.summary,
          credibility: source.credibility,
          metadataSource: 'pack-authored',
        });
      }
    }
    expect(read('dev-tools/repair_eppp_native_quality_wave_16.cjs')).toContain("waveNumber: '16'");
    const selected = new Set(ids);
    expect(json('test_prep/eppp_option_feedback_diagnostics.json').optionFindings.some((item) => selected.has(item.id))).toBe(false);
    const qa = json('test_prep/eppp_native_qa.json');
    expect(qa.summary).toMatchObject({ totalItems: 1500, passedItems: 1500, reviewRequiredItems: 0, status: 'pass' });
    expect(qa.items.filter((item) => selected.has(item.id)).every((item) => item.qaStatus === 'pass')).toBe(true);

    const sourceRuntime = read('test_prep_hub_module.js');
    expect(read('desktop/web-app/public/test_prep_hub_module.js')).toBe(sourceRuntime);
    expect(sourceRuntime).toContain('get through the evening');
    expect(sourceRuntime).toContain('I must get rid of anxious thoughts');
    expect(sourceRuntime).toContain('probation-involved adolescent');
  });
});
