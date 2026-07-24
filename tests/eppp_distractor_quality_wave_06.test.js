import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const sourcePath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_native_items.json');
const auditPath = path.join(root, 'test_prep', 'eppp_native_quality_audit_wave_06.json');
const diagnosticsPath = path.join(root, 'test_prep', 'eppp_distractor_quality_diagnostics.json');
const feedbackDiagnosticsPath = path.join(root, 'test_prep', 'eppp_option_feedback_diagnostics.json');
const ids = [
  'eppp-v2-assessment-026',
  'eppp-v2-cognitive-affective-039',
  'eppp-v2-lifespan-040',
  'eppp-v3-social-cultural-002',
  'eppp-v2-social-cultural-047',
  'eppp-v2-intervention-006',
  'eppp-v3-professional-030',
  'eppp-v2-professional-073',
];
const expectedKeys = [2, 0, 0, 0, 1, 3, 1, 3];
const extremeCuePattern = /\b(?:always|never|only|every|entirely|exclusively|regardless|automatically|guaranteed|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;
const genericFeedbackPattern = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim|does not represent the best available answer)\b/i;

describe('EPPP distractor and feedback repair wave 06', () => {
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
      expect(item.wordingReviewWave).toBe('eppp-native-quality-wave-06');
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
      item.choiceRationales.forEach((feedback, optionIndex) => {
        if (optionIndex !== item.answerIndex) expect(feedback).not.toMatch(genericFeedbackPattern);
      });
    });
  });

  it('records source corrections, feedback gates, and preserved answer positions', () => {
    const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
    expect(audit.correctedAccuracyIssues).toHaveLength(5);
    expect(audit.feedbackCriteria).toHaveLength(5);
    expect(audit.summary).toMatchObject({
      totalItems: 1500,
      rewrittenItems: 8,
      advancedItems: 8,
      appliedOrAnalysisItems: 8,
      keyPositionsPreserved: 8,
      aggregateResponseOptionsAdded: 0,
      optionSpecificExplanations: 32,
      detailedIncorrectOptionExplanations: 24,
      status: 'pass',
    });
    expect(audit.items.map((item) => item.id)).toEqual(ids);
  });

  it('clears lexical, extreme, advanced-recall, and feedback warnings for the repaired tranche', () => {
    const diagnostics = JSON.parse(fs.readFileSync(diagnosticsPath, 'utf8'));
    const feedback = JSON.parse(fs.readFileSync(feedbackDiagnosticsPath, 'utf8'));
    const lexical = new Set(diagnostics.uniqueKeyStemLexicalLeakage.map((item) => item.id));
    const extreme = new Set(diagnostics.asymmetricExtremeDistractors.map((item) => item.id));
    const recall = new Set(diagnostics.advancedDirectRecall.map((item) => item.id));
    const feedbackWarnings = new Set(feedback.optionFindings.map((item) => item.id));
    ids.forEach((id) => {
      expect(lexical.has(id)).toBe(false);
      expect(extreme.has(id)).toBe(false);
      expect(recall.has(id)).toBe(false);
      expect(feedbackWarnings.has(id)).toBe(false);
    });
  });
});
