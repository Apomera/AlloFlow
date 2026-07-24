import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const sourcePath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_native_items.json');
const catalogPath = path.join(root, 'test_prep', 'reference_catalog.json');
const deployCatalogPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'reference_catalog.json');
const auditPath = path.join(root, 'test_prep', 'eppp_native_quality_audit_wave_10.json');
const diagnosticsPath = path.join(root, 'test_prep', 'eppp_distractor_quality_diagnostics.json');
const docketPath = path.join(root, 'test_prep', 'eppp_distractor_action_docket.json');
const feedbackPath = path.join(root, 'test_prep', 'eppp_option_feedback_diagnostics.json');
const qaPath = path.join(root, 'test_prep', 'eppp_native_qa.json');
const runnerPath = path.join(root, 'dev-tools', 'run_eppp_native_quality_wave.cjs');
const repairPath = path.join(root, 'dev-tools', 'repair_eppp_native_quality_wave_10.cjs');
const runtimePath = path.join(root, 'test_prep_hub_module.js');
const deployRuntimePath = path.join(root, 'desktop/web-app', 'public', 'test_prep_hub_module.js');
const ids = [
  'eppp-b024-assessment-3',
  'eppp-b015-professional-1',
  'eppp-b023-professional-1',
  'eppp-v2-assessment-028',
  'eppp-v3-social-cultural-015',
  'eppp-v2-intervention-032',
  'eppp-b026-professional-1',
  'eppp-v2-professional-020',
];
const expectedKeys = [2, 1, 0, 0, 2, 1, 2, 1];
const extremeCuePattern = /\b(?:always|never|only|every|entirely|exclusively|without|regardless|automatically|guarantee(?:d|s)?|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;
const genericFeedbackPattern = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim)\b/i;

describe('EPPP distractor-quality repair wave 10', () => {
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
      expect(item.wordingReviewWave).toBe('eppp-native-quality-wave-10');
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
    expect(audit.summary).toMatchObject({totalItems: 1500, rewrittenItems: 8, domainsCovered: 4, appliedOrAnalysisItems: 8, keyPositionsPreserved: 8, optionSpecificExplanations: 32, selectedItemsWithWarningsAfter: 0, selectedWarningIdsAfter: [], status: 'pass'});
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
    const adjudication = byId.get('eppp-b015-professional-1');
    const deliberation = byId.get('eppp-b023-professional-1');
    expect(adjudication.prompt).toContain('complaint');
    expect(deliberation.prompt).toContain('consultation plans');
    expect(adjudication.choices[adjudication.answerIndex]).not.toBe(deliberation.choices[deliberation.answerIndex]);
    expect(byId.get('eppp-v2-assessment-028').prompt).not.toMatch(/standard error of estimate|\bSEE\b/i);
    expect(byId.get('eppp-v2-assessment-028').choices[0]).toContain('residual spread');
    expect(byId.get('eppp-v2-intervention-032').prompt).not.toMatch(/Acceptance and Commitment Therapy|\bACT\b|traditional CBT/i);
    expect(byId.get('eppp-v2-intervention-032').choices[1]).toContain('chosen value');
    expect(byId.get('eppp-v3-social-cultural-015').prompt).toContain('coin flip');
  });

  it('publishes synchronized source records through the reusable wave runner', () => {
    const bank = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const byId = new Map(bank.map((item) => [item.id, item]));
    const catalogText = fs.readFileSync(catalogPath, 'utf8');
    expect(fs.readFileSync(deployCatalogPath, 'utf8')).toBe(catalogText);
    const catalog = JSON.parse(catalogText);
    for (const id of ids) for (const source of byId.get(id).sourceDetails) expect(catalog[source.url]).toMatchObject({title: source.title, organization: source.organization, summary: source.summary, credibility: source.credibility, metadataSource: 'pack-authored'});
    expect(fs.readFileSync(runnerPath, 'utf8')).toContain('function runNativeQualityWave');
    expect(fs.readFileSync(repairPath, 'utf8')).toContain("waveNumber: '10'");
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
    expect(sourceRuntime).toContain('assigned by coin flip to Blue or Green');
    expect(sourceRuntime).toContain('residual standard deviation of 5.8 rating points');
    expect(sourceRuntime).toContain('exchanging original artwork for psychotherapy sessions');
  });
});
