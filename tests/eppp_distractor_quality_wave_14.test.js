import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const json = (relativePath) => JSON.parse(read(relativePath));
const ids = [
  'eppp-v2-biological-045',
  'eppp-v2-cognitive-affective-035',
  'eppp-v2-cognitive-affective-056',
  'eppp-v2-intervention-001',
  'eppp-v2-intervention-026',
  'eppp-v2-intervention-030',
  'eppp-v2-intervention-050',
  'eppp-v2-intervention-068',
];
const expectedKeys = [0, 0, 1, 2, 3, 3, 3, 1];
const extremeCuePattern = /\b(?:always|never|only|every|entirely|exclusively|without|regardless|automatically|guarantee(?:d|s)?|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;
const genericFeedbackPattern = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim)\b/i;

describe('EPPP distractor-quality repair wave 14', () => {
  it('ships eight source-backed application or analysis rewrites with preserved keys', () => {
    const sourceText = read('test_prep/eppp_native_items.json');
    expect(read('desktop/web-app/public/test_prep/eppp_native_items.json')).toBe(sourceText);
    const byId = new Map(JSON.parse(sourceText).map((item) => [item.id, item]));

    ids.forEach((id, index) => {
      const item = byId.get(id);
      expect(item).toBeTruthy();
      expect(item.answerIndex).toBe(expectedKeys[index]);
      expect(['application', 'analysis']).toContain(item.cognitiveProcess);
      expect(item.wordingReviewWave).toBe('eppp-native-quality-wave-14');
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
    const auditText = read('test_prep/eppp_native_quality_audit_wave_14.json');
    expect(read('desktop/web-app/public/test_prep/eppp_native_quality_audit_wave_14.json')).toBe(auditText);
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

  it('tests neighboring constructs and preserves important evidence boundaries', () => {
    const byId = new Map(json('test_prep/eppp_native_items.json').map((item) => [item.id, item]));
    expect(byId.get('eppp-v2-biological-045').rationale).toMatch(/without establishing one universal mechanism/i);
    expect(byId.get('eppp-v2-cognitive-affective-035').prompt).toMatch(/visual, auditory, or kinesthetic learner/i);
    expect(byId.get('eppp-v2-cognitive-affective-035').rationale).toMatch(/distinguished this proposal from fixed learning styles/i);
    expect(byId.get('eppp-v2-intervention-026').choices[3]).toMatch(/psychodynamic conflict material/i);
    expect(byId.get('eppp-v2-intervention-030').rationale).toMatch(/distinct from proving/i);
    expect(byId.get('eppp-v2-intervention-050').rationale).toMatch(/social-negative-reinforcement function/i);
    expect(byId.get('eppp-v2-intervention-068').rationale).toMatch(/externalizing conversations/i);
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
    expect(read('dev-tools/repair_eppp_native_quality_wave_14.cjs')).toContain("waveNumber: '14'");
    expect(read('dev-tools/qa_eppp_native_pack.cjs')).toContain("'www.gse.harvard.edu'");
    expect(read('dev-tools/build_test_prep_reference_catalog.cjs')).toContain("detail.metadataSource !== 'pack-authored'");
    expect(read('dev-tools/build_test_prep_reference_catalog.cjs')).toContain("item.sourceReviewBasis === 'item-specific-authoritative-source-review'");

    const selected = new Set(ids);
    expect(json('test_prep/eppp_option_feedback_diagnostics.json').optionFindings.some((item) => selected.has(item.id))).toBe(false);
    const qa = json('test_prep/eppp_native_qa.json');
    expect(qa.summary).toMatchObject({ totalItems: 1500, passedItems: 1500, reviewRequiredItems: 0, status: 'pass' });
    expect(qa.items.filter((item) => selected.has(item.id)).every((item) => item.qaStatus === 'pass')).toBe(true);

    const sourceRuntime = read('test_prep_hub_module.js');
    expect(read('desktop/web-app/public/test_prep_hub_module.js')).toBe(sourceRuntime);
    expect(sourceRuntime).toContain('most of its grant on software');
    expect(sourceRuntime).toContain('closed feedback loop uses measured neural activity');
    expect(sourceRuntime).toContain('Failure story');
  });
});
