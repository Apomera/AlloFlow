import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const sourcePath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_native_items.json');
const auditPath = path.join(root, 'test_prep', 'eppp_native_quality_audit_wave_04.json');
const diagnosticsPath = path.join(root, 'test_prep', 'eppp_distractor_quality_diagnostics.json');
const expansionBuilderPath = path.join(root, 'dev-tools', 'build_eppp_1500_expansion.cjs');
const ids = [
  'eppp-v3-assessment-051',
  'eppp-v2-professional-040',
  'eppp-v2-assessment-005',
  'eppp-v3-intervention-018',
  'eppp-b016-social-1',
  'eppp-b022-assessment-1',
  'eppp-b023-intervention-3',
  'eppp-v2-professional-030',
];
const expectedKeys = [0, 1, 1, 0, 0, 0, 3, 3];
const stableSelectionIds = [
  'eppp-v2-professional-040',
  'eppp-v2-assessment-005',
  'eppp-b016-social-1',
  'eppp-b022-assessment-1',
  'eppp-b023-intervention-3',
  'eppp-v2-professional-030',
];
const historicallyIneligibleAnchorIds = [
  'eppp-b016-social-1',
  'eppp-b022-assessment-1',
  'eppp-b023-intervention-3',
];
const extremeCuePattern = /\b(?:always|never|only|every|entirely|exclusively|regardless|automatically|guaranteed|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;

describe('EPPP distractor-quality repair wave 04', () => {
  it('source and deploy banks contain eight applied, source-backed rewrites', () => {
    const sourceText = fs.readFileSync(sourcePath, 'utf8');
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(sourceText);
    const bank = JSON.parse(sourceText);
    const byId = new Map(bank.map((item) => [item.id, item]));
    ids.forEach((id, index) => {
      const item = byId.get(id);
      expect(item).toBeTruthy();
      expect(item.answerIndex).toBe(expectedKeys[index]);
      expect(['application', 'analysis']).toContain(item.cognitiveProcess);
      expect(item.wordingReviewWave).toBe('eppp-native-quality-wave-04');
      expect(item.choices).toHaveLength(4);
      expect(item.choiceRationales).toHaveLength(4);
      expect(item.choiceRationales.every((feedback) => feedback.length >= 100)).toBe(true);
      expect(item.sourceDetails.length).toBeGreaterThan(0);
      expect(item.sourceDetails.every((source) => source.title.length >= 20 && source.credibility.length >= 100)).toBe(true);
      expect(item.choices.some((choice) => /\b(?:all|none) of the above\b/i.test(choice))).toBe(false);
      expect(item.choices.some((choice) => extremeCuePattern.test(choice))).toBe(false);
      expect(item.prompt).not.toMatch(/^complete the statement\b/i);
    });
  });

  it('wave audit records preserved answer positions and full feedback', () => {
    const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
    expect(audit.summary).toMatchObject({
      totalItems: 1500,
      rewrittenItems: 8,
      appliedOrAnalysisItems: 8,
      keyPositionsPreserved: 8,
      aggregateResponseOptionsAdded: 0,
      optionSpecificExplanations: 32,
      status: 'pass',
    });
    expect(audit.items.map((item) => item.id)).toEqual(ids);
  });

  it('repaired items clear lexical, extreme, and advanced-recall warnings', () => {
    const diagnostics = JSON.parse(fs.readFileSync(diagnosticsPath, 'utf8'));
    const lexical = new Set(diagnostics.uniqueKeyStemLexicalLeakage.map((item) => item.id));
    const extreme = new Set(diagnostics.asymmetricExtremeDistractors.map((item) => item.id));
    const recall = new Set(diagnostics.advancedDirectRecall.map((item) => item.id));
    ids.forEach((id) => {
      expect(lexical.has(id)).toBe(false);
      expect(extreme.has(id)).toBe(false);
      expect(recall.has(id)).toBe(false);
    });
  });

  it('keeps generated concept IDs stable when base prompts, rationales, or source metadata improve', () => {
    const bank = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const byId = new Map(bank.map((item) => [item.id, item]));
    stableSelectionIds.forEach((id) => {
      expect(byId.get(id).expansionSelectionPrompt.length).toBeGreaterThan(20);
      expect(byId.get(id).expansionSelectionRationale.length).toBeGreaterThan(80);
    });
    historicallyIneligibleAnchorIds.forEach((id) => {
      expect(byId.get(id).expansionSelectionAnchorEligible).toBe(false);
    });

    const builder = fs.readFileSync(expansionBuilderPath, 'utf8');
    expect(builder).toContain('expansionSelectionPrompt(a)');
    expect(builder).toContain('expansionSelectionRationale(a)');
    expect(builder).toContain('x.expansionSelectionAnchorEligible!==false');
  });
});
