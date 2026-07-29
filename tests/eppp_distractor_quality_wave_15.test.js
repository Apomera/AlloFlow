import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const json = (relativePath) => JSON.parse(read(relativePath));
const ids = [
  'eppp-v2-lifespan-031',
  'eppp-v2-lifespan-048',
  'eppp-v2-professional-035',
  'eppp-v2-professional-057',
  'eppp-v2-professional-068',
  'eppp-v2-research-005',
  'eppp-v2-social-cultural-050',
  'eppp-v2-research-014',
];
const expectedKeys = [3, 0, 0, 2, 1, 1, 0, 2];
const extremeCuePattern = /\b(?:always|never|only|every|entirely|exclusively|without|regardless|automatically|guarantee(?:d|s)?|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;
const genericFeedbackPattern = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim)\b/i;

describe('EPPP distractor-quality repair wave 15', () => {
  it('ships eight source-backed application or analysis rewrites with preserved keys', () => {
    const sourceText = read('test_prep/eppp_native_items.json');
    expect(read('desktop/web-app/public/test_prep/eppp_native_items.json')).toBe(sourceText);
    const byId = new Map(JSON.parse(sourceText).map((item) => [item.id, item]));

    ids.forEach((id, index) => {
      const item = byId.get(id);
      expect(item).toBeTruthy();
      expect(item.answerIndex).toBe(expectedKeys[index]);
      expect(['application', 'analysis']).toContain(item.cognitiveProcess);
      expect(item.wordingReviewWave).toBe('eppp-native-quality-wave-15');
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
    const auditText = read('test_prep/eppp_native_quality_audit_wave_15.json');
    expect(read('desktop/web-app/public/test_prep/eppp_native_quality_audit_wave_15.json')).toBe(auditText);
    const audit = JSON.parse(auditText);
    expect(audit.summary).toMatchObject({
      totalItems: 1500,
      rewrittenItems: 8,
      domainsCovered: 4,
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

  it('tests applied distinctions and preserves evidence boundaries', () => {
    const byId = new Map(json('test_prep/eppp_native_items.json').map((item) => [item.id, item]));
    expect(byId.get('eppp-v2-lifespan-031').rationale).toMatch(/organization of behavior across the procedure/i);
    expect(byId.get('eppp-v2-lifespan-048').rationale).toMatch(/physical maturation, sociocultural pressures, and individual values/i);
    expect(byId.get('eppp-v2-professional-035').rationale).toMatch(/Standard 8\.11/i);
    expect(byId.get('eppp-v2-professional-057').rationale).toMatch(/rather than assuming sameness or stereotyping/i);
    expect(byId.get('eppp-v2-professional-068').rationale).toMatch(/applicable law and organizational requirements/i);
    expect(byId.get('eppp-v2-research-005').rationale).toMatch(/adjusted association and causation/i);
    expect(byId.get('eppp-v2-social-cultural-050').rationale).toMatch(/descriptive norms.*injunctive norms/i);
    expect(byId.get('eppp-v2-research-014').rationale).toMatch(/order and treatment-by-order effects may still require analysis/i);
  });

  it('publishes synchronized sources, clean feedback, native QA, and runtime content', () => {
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
    expect(read('dev-tools/repair_eppp_native_quality_wave_15.cjs')).toContain("waveNumber: '15'");
    const selected = new Set(ids);
    expect(json('test_prep/eppp_option_feedback_diagnostics.json').optionFindings.some((item) => selected.has(item.id))).toBe(false);
    const qa = json('test_prep/eppp_native_qa.json');
    expect(qa.summary).toMatchObject({ totalItems: 1500, passedItems: 1500, reviewRequiredItems: 0, status: 'pass' });
    expect(qa.items.filter((item) => selected.has(item.id)).every((item) => item.qaStatus === 'pass')).toBe(true);

    const sourceRuntime = read('test_prep_hub_module.js');
    expect(read('desktop/web-app/public/test_prep_hub_module.js')).toBe(sourceRuntime);
    expect(sourceRuntime).toContain('Most guests in this hotel reuse their towels');
    expect(sourceRuntime).toContain('grant narrative');
    expect(sourceRuntime).toContain('background speech');
  });
});
