import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const sourcePath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_native_items.json');
const auditPath = path.join(root, 'test_prep', 'eppp_native_quality_audit_wave_05.json');
const diagnosticsPath = path.join(root, 'test_prep', 'eppp_distractor_quality_diagnostics.json');
const ids = [
  'eppp-v3-intervention-002',
  'eppp-v3-intervention-066',
  'eppp-v3-intervention-010',
  'eppp-v2-professional-050',
  'eppp-v2-professional-045',
  'eppp-b024-professional-1',
  'eppp-v2-cognitive-affective-031',
  'eppp-v2-assessment-059',
];
const expectedKeys = [3, 3, 3, 3, 2, 3, 0, 3];
const extremeCuePattern = /\b(?:always|never|only|every|entirely|exclusively|regardless|automatically|guaranteed|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;

describe('EPPP distractor-quality repair wave 05', () => {
  it('contains eight advanced, source-backed application or analysis rewrites', () => {
    const sourceText = fs.readFileSync(sourcePath, 'utf8');
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(sourceText);
    const bank = JSON.parse(sourceText);
    const byId = new Map(bank.map((item) => [item.id, item]));
    ids.forEach((id, index) => {
      const item = byId.get(id);
      expect(item).toBeTruthy();
      expect(item.answerIndex).toBe(expectedKeys[index]);
      expect(item.difficulty).toBe('advanced');
      expect(['application', 'analysis']).toContain(item.cognitiveProcess);
      expect(item.wordingReviewWave).toBe('eppp-native-quality-wave-05');
      expect(item.choices).toHaveLength(4);
      expect(new Set(item.choices.map((choice) => choice.toLowerCase())).size).toBe(4);
      expect(item.choiceRationales).toHaveLength(4);
      expect(item.choiceRationales.every((feedback) => feedback.length >= 100)).toBe(true);
      expect(item.sourceDetails.length).toBeGreaterThan(0);
      expect(item.sourceDetails.every((source) => source.title.length >= 20 && source.credibility.length >= 100)).toBe(true);
      expect(item.choices.some((choice) => /\b(?:all|none) of the above\b/i.test(choice))).toBe(false);
      expect(item.choices.some((choice) => extremeCuePattern.test(choice))).toBe(false);
      expect(item.prompt).not.toMatch(/^complete the statement\b/i);
      expect(item.distractorDesign).toHaveLength(3);
    });
  });

  it('records explicit challenge criteria and preserved answer positions', () => {
    const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
    expect(audit.challengeCriteria).toHaveLength(6);
    expect(audit.summary).toMatchObject({
      totalItems: 1500,
      rewrittenItems: 8,
      advancedItems: 8,
      appliedOrAnalysisItems: 8,
      keyPositionsPreserved: 8,
      aggregateResponseOptionsAdded: 0,
      optionSpecificExplanations: 32,
      status: 'pass',
    });
    expect(audit.items.map((item) => item.id)).toEqual(ids);
  });

  it('clears lexical, extreme, and advanced-recall warnings for the repaired tranche', () => {
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
});
