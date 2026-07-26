import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const sourcePath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_native_items.json');
const catalogPath = path.join(root, 'test_prep', 'reference_catalog.json');
const deployCatalogPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'reference_catalog.json');
const auditPath = path.join(root, 'test_prep', 'eppp_native_quality_audit_wave_11.json');
const diagnosticsPath = path.join(root, 'test_prep', 'eppp_distractor_quality_diagnostics.json');
const docketPath = path.join(root, 'test_prep', 'eppp_distractor_action_docket.json');
const feedbackPath = path.join(root, 'test_prep', 'eppp_option_feedback_diagnostics.json');
const qaPath = path.join(root, 'test_prep', 'eppp_native_qa.json');
const runnerPath = path.join(root, 'dev-tools', 'run_eppp_native_quality_wave.cjs');
const repairPath = path.join(root, 'dev-tools', 'repair_eppp_native_quality_wave_11.cjs');
const runtimePath = path.join(root, 'test_prep_hub_module.js');
const deployRuntimePath = path.join(root, 'desktop/web-app', 'public', 'test_prep_hub_module.js');
const ids = [
  'eppp-b017-biological-1',
  'eppp-b020-social-1',
  'eppp-v3-professional-073',
  'eppp-v2-assessment-064',
  'eppp-v2-cognitive-affective-015',
  'eppp-b004-professional-2',
  'eppp-v3-professional-055',
  'eppp-b028-intervention-2',
];
const expectedKeys = [0, 1, 0, 0, 0, 3, 2, 3];
const extremeCuePattern = /\b(?:always|never|only|every|entirely|exclusively|without|regardless|automatically|guarantee(?:d|s)?|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;
const genericFeedbackPattern = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim)\b/i;

describe('EPPP distractor-quality repair wave 11', () => {
  it('contains eight source-backed application or analysis rewrites with preserved keys', () => {
    const sourceText = fs.readFileSync(sourcePath, 'utf8');
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(sourceText);
    const bank = JSON.parse(sourceText);
    const byId = new Map(bank.map((item) => [item.id, item]));
    ids.forEach((id, index) => {
      const item = byId.get(id);
      expect(item).toBeTruthy();
      expect(item.answerIndex).toBe(expectedKeys[index]);
      expect(['application', 'analysis']).toContain(item.cognitiveProcess);
      expect(item.wordingReviewWave).toBe('eppp-native-quality-wave-11');
      expect(item.prompt).not.toMatch(/^complete the statement\b/i);
      expect(item.choices).toHaveLength(4);
      expect(new Set(item.choices.map((choice) => choice.toLowerCase())).size).toBe(4);
      expect(item.choices.some((choice) => extremeCuePattern.test(choice))).toBe(false);
      expect(item.choiceRationales).toHaveLength(4);
      expect(item.choiceRationales[item.answerIndex]).toBe(item.rationale);
      expect(item.choiceRationales.every((feedback) => feedback.length >= 120 && !genericFeedbackPattern.test(feedback))).toBe(true);
      expect(item.references).toHaveLength(item.sourceDetails.length);
      expect(item.sourceDetails.every((source) => item.references.includes(source.url) && source.title.length >= 20 && source.organization.length >= 10 && source.summary.length >= 120 && source.credibility.length >= 120)).toBe(true);
      expect(item.distractorDesign).toHaveLength(3);
      expect(item.sourceReviewBasis).toBe('item-specific-authoritative-source-review');
      expect(item).not.toHaveProperty('sourceAnchorItemId');
      expect(item).not.toHaveProperty('sourceMatchScore');
    });
  });

  it('records a passing audit and clears every selected warning family', () => {
    const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
    expect(audit.summary).toMatchObject({totalItems: 1500, rewrittenItems: 8, domainsCovered: 6, appliedOrAnalysisItems: 8, keyPositionsPreserved: 8, optionSpecificExplanations: 32, selectedItemsWithWarningsAfter: 0, selectedWarningIdsAfter: [], status: 'pass'});
    expect(audit.items.map((item) => item.id)).toEqual(ids);
    expect(audit.items.every((item) => item.diagnosticsAfter.length === 0)).toBe(true);
    const diagnostics = JSON.parse(fs.readFileSync(diagnosticsPath, 'utf8'));
    const selected = new Set(ids);
    expect(diagnostics.uniqueKeyStemLexicalLeakage.some((item) => selected.has(item.id))).toBe(false);
    expect(diagnostics.asymmetricExtremeDistractors.some((item) => selected.has(item.id))).toBe(false);
    expect(diagnostics.advancedDirectRecall.some((item) => selected.has(item.id))).toBe(false);
    expect(diagnostics.semanticConceptDuplicates.pairs.some((pair) => selected.has(pair.leftId) || selected.has(pair.rightId))).toBe(false);
    const docket = JSON.parse(fs.readFileSync(docketPath, 'utf8'));
    expect(docket.actionItems.some((item) => selected.has(item.id))).toBe(false);
  });

  it('separates related concepts through distinct applied decisions', () => {
    const bank = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const byId = new Map(bank.map((item) => [item.id, item]));
    const prospective = byId.get('eppp-b004-professional-2');
    const emergent = byId.get('eppp-v3-professional-055');
    expect(prospective.prompt).toContain('Before accepting');
    expect(emergent.prompt).toContain('Midway through therapy');
    expect(prospective.choices[prospective.answerIndex]).not.toBe(emergent.choices[emergent.answerIndex]);
    expect(byId.get('eppp-v3-professional-073').prompt).not.toMatch(/Standard 2\.02/i);
    expect(byId.get('eppp-v2-assessment-064').prompt).not.toMatch(/Beck Depression Inventory|BDI-II/i);
    expect(byId.get('eppp-v2-cognitive-affective-015').prompt).not.toMatch(/System 1|dual-process theory/i);
    expect(byId.get('eppp-b028-intervention-2').prompt).not.toMatch(/exposure and response prevention|\bERP\b/i);
  });

  it('publishes synchronized source records through the reusable wave runner', () => {
    const bank = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const byId = new Map(bank.map((item) => [item.id, item]));
    const catalogText = fs.readFileSync(catalogPath, 'utf8');
    expect(fs.readFileSync(deployCatalogPath, 'utf8')).toBe(catalogText);
    const catalog = JSON.parse(catalogText);
    for (const id of ids) for (const source of byId.get(id).sourceDetails) expect(catalog[source.url]).toMatchObject({title: source.title, organization: source.organization, summary: source.summary, credibility: source.credibility, metadataSource: 'pack-authored'});
    expect(fs.readFileSync(runnerPath, 'utf8')).toContain('function runNativeQualityWave');
    expect(fs.readFileSync(repairPath, 'utf8')).toContain("waveNumber: '11'");
  });

  it('clears option-feedback warnings and passes native QA for revised items', () => {
    const feedback = JSON.parse(fs.readFileSync(feedbackPath, 'utf8'));
    const qa = JSON.parse(fs.readFileSync(qaPath, 'utf8'));
    const selected = new Set(ids);
    expect(feedback.optionFindings.some((item) => selected.has(item.id))).toBe(false);
    expect(qa.summary).toMatchObject({totalItems: 1500, passedItems: 1500, reviewRequiredItems: 0, status: 'pass'});
    expect(qa.items.filter((item) => selected.has(item.id)).every((item) => item.qaStatus === 'pass')).toBe(true);
  });

  it('synchronizes the revised bank into both runtime modules', () => {
    const sourceRuntime = fs.readFileSync(runtimePath, 'utf8');
    expect(fs.readFileSync(deployRuntimePath, 'utf8')).toBe(sourceRuntime);
    expect(sourceRuntime).toContain('frequently coactivated cortical pathways');
    expect(sourceRuntime).toContain('patient with acute suicide risk');
    expect(sourceRuntime).toContain('prospective client is treasurer of a nonprofit');
  });
});
