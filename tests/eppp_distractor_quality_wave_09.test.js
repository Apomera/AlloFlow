import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const sourcePath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_native_items.json');
const catalogPath = path.join(root, 'test_prep', 'reference_catalog.json');
const deployCatalogPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'reference_catalog.json');
const auditPath = path.join(root, 'test_prep', 'eppp_native_quality_audit_wave_09.json');
const diagnosticsPath = path.join(root, 'test_prep', 'eppp_distractor_quality_diagnostics.json');
const feedbackPath = path.join(root, 'test_prep', 'eppp_option_feedback_diagnostics.json');
const qaPath = path.join(root, 'test_prep', 'eppp_native_qa.json');
const runnerPath = path.join(root, 'dev-tools', 'run_eppp_native_quality_wave.cjs');
const repairPath = path.join(root, 'dev-tools', 'repair_eppp_native_quality_wave_09.cjs');
const runtimePath = path.join(root, 'test_prep_hub_module.js');
const deployRuntimePath = path.join(root, 'desktop/web-app', 'public', 'test_prep_hub_module.js');
const ids = [
  'eppp-v2-social-cultural-036',
  'eppp-v3-assessment-033',
  'eppp-v3-biological-046',
  'eppp-v3-intervention-031',
  'eppp-v3-professional-041',
  'eppp-v3-professional-074',
  'eppp-v3-social-cultural-025',
  'eppp-v2-intervention-044',
];
const expectedKeys = [2, 2, 1, 2, 0, 1, 1, 1];
const extremeCuePattern = /\b(?:always|never|only|every|entirely|exclusively|without|regardless|automatically|guarantee(?:d|s)?|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;
const genericFeedbackPattern = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim)\b/i;

describe('EPPP distractor-quality repair wave 09', () => {
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
      expect(item.wordingReviewWave).toBe('eppp-native-quality-wave-09');
      expect(item.prompt).not.toMatch(/^complete the statement\b/i);
      expect(item.choices).toHaveLength(4);
      expect(new Set(item.choices.map((choice) => choice.toLowerCase())).size).toBe(4);
      expect(item.choices.some((choice) => extremeCuePattern.test(choice))).toBe(false);
      expect(item.choiceRationales).toHaveLength(4);
      expect(item.choiceRationales[item.answerIndex]).toBe(item.rationale);
      expect(item.choiceRationales.every((feedback) => (
        feedback.length >= 120 && !genericFeedbackPattern.test(feedback)
      ))).toBe(true);
      expect(item.references).toHaveLength(item.sourceDetails.length);
      expect(item.sourceDetails.every((source) => (
        item.references.includes(source.url)
        && source.title.length >= 20
        && source.organization.length >= 10
        && source.summary.length >= 120
        && source.credibility.length >= 120
      ))).toBe(true);
      expect(item.distractorDesign).toHaveLength(3);
      expect(item.sourceReviewBasis).toBe('item-specific-authoritative-source-review');
      expect(item).not.toHaveProperty('sourceAnchorItemId');
      expect(item).not.toHaveProperty('sourceMatchScore');
    });
  });

  it('records a passing audit and clears all selected warning families', () => {
    const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
    expect(audit.summary).toMatchObject({
      totalItems: 1500,
      rewrittenItems: 8,
      domainsCovered: 5,
      appliedOrAnalysisItems: 8,
      keyPositionsPreserved: 8,
      optionSpecificExplanations: 32,
      selectedItemsWithWarningsAfter: 0,
      selectedWarningIdsAfter: [],
      status: 'pass',
    });
    expect(audit.items.map((item) => item.id)).toEqual(ids);
    expect(audit.items.every((item) => item.diagnosticsAfter.length === 0)).toBe(true);

    const diagnostics = JSON.parse(fs.readFileSync(diagnosticsPath, 'utf8'));
    const selected = new Set(ids);
    expect(diagnostics.uniqueKeyStemLexicalLeakage.some((item) => selected.has(item.id))).toBe(false);
    expect(diagnostics.asymmetricExtremeDistractors.some((item) => selected.has(item.id))).toBe(false);
    expect(diagnostics.advancedDirectRecall.some((item) => selected.has(item.id))).toBe(false);
    expect(diagnostics.semanticConceptDuplicates.pairs.some((pair) => (
      selected.has(pair.leftId) || selected.has(pair.rightId)
    ))).toBe(false);
  });

  it('reframes validity and IPT coverage away from the prior duplicate concepts', () => {
    const bank = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const byId = new Map(bank.map((item) => [item.id, item]));
    const validity = byId.get('eppp-v3-assessment-033');
    const interpersonal = byId.get('eppp-v2-intervention-044');

    expect(validity.prompt).not.toMatch(/\bTOMM\b/i);
    expect(validity.rationale).toContain('invalid performance is not synonymous');
    expect(validity.rationale).not.toMatch(/one .* establish(?:es)? (?:malingering|motive)/i);
    expect(interpersonal.prompt).toContain('after retirement');
    expect(interpersonal.prompt).not.toMatch(/\bIPT\b/);
    expect(interpersonal.choices[interpersonal.answerIndex]).toContain('Map the transition');
  });

  it('publishes synchronized source records through the reusable wave runner', () => {
    const bank = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const byId = new Map(bank.map((item) => [item.id, item]));
    const catalogText = fs.readFileSync(catalogPath, 'utf8');
    expect(fs.readFileSync(deployCatalogPath, 'utf8')).toBe(catalogText);
    const catalog = JSON.parse(catalogText);

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

    const runner = fs.readFileSync(runnerPath, 'utf8');
    const repair = fs.readFileSync(repairPath, 'utf8');
    expect(runner).toContain('function runNativeQualityWave');
    expect(runner).toContain('warningCountsBefore');
    expect(repair).toContain("waveNumber: '09'");
  });

  it('clears option-feedback warnings and passes native QA for the revised items', () => {
    const feedback = JSON.parse(fs.readFileSync(feedbackPath, 'utf8'));
    const qa = JSON.parse(fs.readFileSync(qaPath, 'utf8'));
    const selected = new Set(ids);
    expect(feedback.optionFindings.some((item) => selected.has(item.id))).toBe(false);
    expect(qa.summary).toMatchObject({
      totalItems: 1500,
      passedItems: 1500,
      reviewRequiredItems: 0,
      status: 'pass',
    });
    expect(qa.items.filter((item) => selected.has(item.id)).every((item) => item.qaStatus === 'pass')).toBe(true);
  });

  it('synchronizes the revised bank into both runtime modules', () => {
    const sourceRuntime = fs.readFileSync(runtimePath, 'utf8');
    expect(fs.readFileSync(deployRuntimePath, 'utf8')).toBe(sourceRuntime);
    expect(sourceRuntime).toContain('markedly below chance on an easy two-choice recognition task');
    expect(sourceRuntime).toContain('after retirement, describing loss of professional identity');
    expect(sourceRuntime).toContain('essential equipment is broken');
  });
});
