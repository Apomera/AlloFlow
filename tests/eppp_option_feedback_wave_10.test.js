import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  revisions,
  wave09WarningSnapshot,
  wave10WarningSnapshot,
} = require('../dev-tools/eppp_option_feedback_wave_10_data.cjs');

const root = process.cwd();
const sourcePath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployPath = path.join(root, 'prismflow-deploy', 'public', 'test_prep', 'eppp_native_items.json');
const catalogPath = path.join(root, 'test_prep', 'reference_catalog.json');
const deployCatalogPath = path.join(root, 'prismflow-deploy', 'public', 'test_prep', 'reference_catalog.json');
const auditPath = path.join(root, 'test_prep', 'eppp_option_feedback_audit_wave_10.json');
const diagnosticsPath = path.join(root, 'test_prep', 'eppp_option_feedback_diagnostics.json');
const distractorDiagnosticsPath = path.join(root, 'test_prep', 'eppp_distractor_quality_diagnostics.json');
const expansionBuilderPath = path.join(root, 'dev-tools', 'build_eppp_1500_expansion.cjs');
const ids = [
  'eppp-b014-assessment-2',
  'eppp-v3-assessment-041',
  'eppp-v3-research-002',
  'eppp-v2-research-003',
  'eppp-b013-biological-2',
  'eppp-v2-biological-008',
  'eppp-v3-cognitive-affective-061',
  'eppp-v3-cognitive-affective-059',
  'eppp-b014-lifespan-2',
  'eppp-v3-lifespan-013',
  'eppp-v3-intervention-067',
  'eppp-v2-intervention-025',
  'eppp-b016-professional-2',
  'eppp-b015-professional-2',
  'eppp-b011-social-1',
  'eppp-b026-social-2',
];
const expectedKeys = [2, 2, 2, 3, 2, 3, 2, 0, 3, 2, 0, 2, 3, 3, 0, 1];
const expectedBefore = {
  itemsWithWarnings: 1421,
  incorrectOptionsWithWarnings: 4114,
  insufficientDetailOptions: 1491,
  genericTemplateOptions: 2558,
  choiceRestatementOptions: 1839,
  fullKeyEchoOptions: 1564,
};
const expectedAfter = {
  itemsWithWarnings: 1405,
  incorrectOptionsWithWarnings: 4066,
  insufficientDetailOptions: 1481,
  genericTemplateOptions: 2522,
  choiceRestatementOptions: 1809,
  fullKeyEchoOptions: 1538,
};
const genericFeedbackPattern = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim|does not represent the best available answer)\b/i;
const extremeCuePattern = /\b(?:always|never|only|every|entirely|exclusively|regardless|automatically|guaranteed|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;
const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const wordCount = (value) => String(value || '').trim().split(/\s+/).filter(Boolean).length;

describe('EPPP incorrect-option explanation repair wave 10', () => {
  it('replays wave 10 after wave 09 and before the canonical audits', () => {
    const builder = fs.readFileSync(expansionBuilderPath, 'utf8');
    const steps = [
      "require('./repair_eppp_option_feedback_wave_09.cjs')",
      "require('./repair_eppp_option_feedback_wave_10.cjs')",
      "require('./audit_eppp_distractor_quality.cjs')",
      "require('./audit_eppp_option_feedback.cjs')",
    ];
    const positions = steps.map((step) => builder.indexOf(step));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
  });

  it('integrates 16 challenging revisions across all eight domains without changing answer positions', () => {
    const sourceText = fs.readFileSync(sourcePath, 'utf8');
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(sourceText);
    const bank = JSON.parse(sourceText);
    const byId = new Map(bank.map((item) => [item.id, item]));
    expect(Object.keys(revisions)).toEqual(ids);
    const domainCounts = new Map();

    ids.forEach((id, index) => {
      const revision = revisions[id];
      const item = byId.get(id);
      const authoredChoices = [0, 1, 2, 3].map((optionIndex) => revision.choices[optionIndex]);
      const incorrectIndexes = [0, 1, 2, 3].filter((optionIndex) => optionIndex !== expectedKeys[index]);

      expect(item).toBeTruthy();
      expect(revision.expectedAnswerIndex).toBe(expectedKeys[index]);
      expect(item.answerIndex).toBe(expectedKeys[index]);
      expect(['intermediate', 'advanced']).toContain(revision.difficulty);
      expect(item.difficulty).toBe(revision.difficulty);
      expect(item.optionFeedbackRefinementWave).toBe('eppp-option-feedback-wave-10');
      expect(item.optionFeedbackRefinedAt).toBe('2026-07-18');
      expect(item.qaReviewedAt).toBe('2026-07-18');
      expect(revision.sourceCheck.length).toBeGreaterThanOrEqual(100);
      expect(revision.feedbackDesign).toHaveLength(3);
      expect(new Set(revision.feedbackDesign).size).toBe(3);
      expect(revision.qualityFlags.length).toBeGreaterThan(0);

      expect(item.prompt).toBe(revision.prompt);
      expect(item.prompt.length).toBeGreaterThanOrEqual(120);
      expect(item.choices).toEqual(authoredChoices);
      expect(item.choices.every((choice) => choice.length >= 40)).toBe(true);
      expect(new Set(item.choices.map(normalize)).size).toBe(4);
      expect(item.choices.some((choice) => extremeCuePattern.test(choice))).toBe(false);
      expect(item.choices.some((choice) => /\b(?:all|none) of the above\b/i.test(choice))).toBe(false);
      expect(item.rationale).toBe(revision.rationale);
      expect(item.choiceRationales).toHaveLength(4);
      expect(item.choiceRationales[item.answerIndex]).toBe(item.rationale);
      expect(Object.keys(revision.incorrectFeedback).map(Number).sort()).toEqual(incorrectIndexes);

      const explanations = [];
      incorrectIndexes.forEach((optionIndex) => {
        const feedback = item.choiceRationales[optionIndex];
        explanations.push(normalize(feedback));
        expect(feedback).toBe(revision.incorrectFeedback[optionIndex]);
        expect(feedback.length).toBeGreaterThanOrEqual(100);
        expect(wordCount(feedback)).toBeGreaterThanOrEqual(16);
        expect(feedback).not.toMatch(genericFeedbackPattern);
        const normalizedFeedback = normalize(feedback);
        const normalizedChoice = normalize(item.choices[optionIndex]);
        const normalizedKey = normalize(item.choices[item.answerIndex]);
        expect(normalizedFeedback.startsWith(normalizedChoice.slice(0, Math.min(60, normalizedChoice.length)))).toBe(false);
        expect(normalizedFeedback.includes(normalizedKey)).toBe(false);
        expect(normalizedFeedback).not.toBe(normalize(item.rationale));
      });
      expect(new Set(explanations).size).toBe(3);
      domainCounts.set(item.domainId, (domainCounts.get(item.domainId) || 0) + 1);
    });

    expect(domainCounts.size).toBe(8);
    expect([...domainCounts.values()].every((count) => count === 2)).toBe(true);
  });

  it('keeps complete learner-facing source metadata synchronized with both catalogs', () => {
    const bank = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const byId = new Map(bank.map((item) => [item.id, item]));
    const catalogText = fs.readFileSync(catalogPath, 'utf8');
    expect(fs.readFileSync(deployCatalogPath, 'utf8')).toBe(catalogText);
    const catalog = JSON.parse(catalogText);

    ids.forEach((id) => {
      const item = byId.get(id);
      const revision = revisions[id];
      expect(item.references).toEqual(revision.references);
      expect(item.sourceDetails).toEqual(revision.sourceDetails);
      expect(item.sourceDetails).toHaveLength(item.references.length);
      expect(new Set(item.references).size).toBe(item.references.length);

      item.sourceDetails.forEach((source) => {
        expect(item.references).toContain(source.url);
        expect(source.title.length).toBeGreaterThanOrEqual(20);
        expect(source.organization.length).toBeGreaterThanOrEqual(5);
        expect(source.summary.length).toBeGreaterThanOrEqual(80);
        expect(source.credibility.length).toBeGreaterThanOrEqual(100);
        expect(catalog[source.url]).toMatchObject({
          title: source.title,
          organization: source.organization,
          summary: source.summary,
          credibility: source.credibility,
          metadataSource: 'pack-authored',
        });
      });
    });
  });

  it('records the exact wave-09 baseline, wave-10 reduction, and warning-free selected set', () => {
    const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
    expect(wave09WarningSnapshot).toEqual(expectedBefore);
    expect(wave10WarningSnapshot).toEqual(expectedAfter);
    expect(audit).toMatchObject({ reviewWave: 'eppp-option-feedback-wave-10', reviewedAt: '2026-07-18' });
    expect(audit.summary).toMatchObject({
      totalItems: 1500,
      reviewedItems: 16,
      domainsCovered: 8,
      detailedIncorrectOptionExplanations: 48,
      keyPositionsPreserved: 16,
      selectedOptionsWithWarningsAfter: 0,
      choicesRefined: 64,
      challengeRefinedItems: 16,
      promptsRefined: 16,
      rationalesRefined: 16,
      difficultyRefinedItems: 16,
      itemsWithStrengthenedReferences: 16,
      status: 'pass',
    });
    expect(audit.summary.bankWarningsBefore).toEqual(expectedBefore);
    expect(audit.summary.bankWarningsAfter).toEqual(expectedAfter);
    expect(audit.items.map((item) => item.id)).toEqual(ids);
    expect(audit.items.every((item, index) => (
      item.expectedAnswerIndex === expectedKeys[index]
      && item.answerIndex === expectedKeys[index]
      && item.keyPositionPreserved
      && item.difficultyRefined
      && item.choicesRefined === 4
      && item.promptRefined
      && item.rationaleRefined
      && item.referencesStrengthened
      && item.incorrectOptionExplanations === 3
      && item.feedbackDesign.length === 3
      && item.sourceCheck.length >= 100
    ))).toBe(true);

    const diagnostics = JSON.parse(fs.readFileSync(diagnosticsPath, 'utf8'));
    const wave10 = diagnostics.waves['eppp-option-feedback-wave-10'];
    expect(wave10).toMatchObject({
      reviewWave: 'eppp-option-feedback-wave-10',
      incorrectOptions: 48,
      optionsWithWarnings: 0,
      status: 'pass',
      findings: [],
    });
    expect(wave10.ids).toEqual(ids);
    expect(diagnostics.mostRecentWave).toEqual(diagnostics.waves[diagnostics.latestReviewWave]);
    expect(diagnostics.summary.itemsWithWarnings).toBeLessThanOrEqual(expectedAfter.itemsWithWarnings);
    expect(diagnostics.summary.incorrectOptionsWithWarnings).toBeLessThanOrEqual(expectedAfter.incorrectOptionsWithWarnings);
    const warningIds = new Set(diagnostics.optionFindings.map((finding) => finding.id));
    ids.forEach((id) => expect(warningIds.has(id)).toBe(false));

    const challengeDiagnostics = JSON.parse(fs.readFileSync(distractorDiagnosticsPath, 'utf8'));
    expect(challengeDiagnostics.summary.forbiddenAggregateChoices).toBe(0);
    const selectedIds = new Set(ids);
    const actionableLexicalFindings = challengeDiagnostics.uniqueKeyStemLexicalLeakage.filter((finding) => (
      selectedIds.has(finding.id) && finding.overlapAdvantage > 0
    ));
    expect(actionableLexicalFindings).toEqual([]);
    ['asymmetricExtremeDistractors', 'advancedDirectRecall'].forEach((findingKey) => {
      const flaggedIds = new Set(challengeDiagnostics[findingKey].map((finding) => finding.id));
      ids.forEach((id) => expect(flaggedIds.has(id)).toBe(false));
    });
  });
});
