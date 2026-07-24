import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { revisions, wave08WarningSnapshot } = require('../dev-tools/eppp_option_feedback_wave_09_data.cjs');

const root = process.cwd();
const sourcePath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_native_items.json');
const catalogPath = path.join(root, 'test_prep', 'reference_catalog.json');
const deployCatalogPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'reference_catalog.json');
const auditPath = path.join(root, 'test_prep', 'eppp_option_feedback_audit_wave_09.json');
const diagnosticsPath = path.join(root, 'test_prep', 'eppp_option_feedback_diagnostics.json');
const distractorDiagnosticsPath = path.join(root, 'test_prep', 'eppp_distractor_quality_diagnostics.json');
const expansionBuilderPath = path.join(root, 'dev-tools', 'build_eppp_1500_expansion.cjs');
const ids = [
  'eppp-b004-assessment-2',
  'eppp-b008-assessment-1',
  'eppp-b008-research-2',
  'eppp-b009-research-1',
  'eppp-b005-biological-1',
  'eppp-b006-biological-1',
  'eppp-b003-cognitive-1',
  'eppp-b003-cognitive-2',
  'eppp-b005-lifespan-1',
  'eppp-b005-lifespan-2',
  'eppp-b003-intervention-2',
  'eppp-b004-intervention-1',
  'eppp-b003-professional-1',
  'eppp-b003-professional-2',
  'eppp-b007-social-1',
  'eppp-b007-social-2',
];
const expectedKeys = [2, 0, 2, 0, 0, 0, 1, 3, 1, 3, 3, 1, 1, 3, 0, 2];
const expectedBefore = {
  itemsWithWarnings: 1437,
  incorrectOptionsWithWarnings: 4162,
  insufficientDetailOptions: 1491,
  genericTemplateOptions: 2606,
  choiceRestatementOptions: 1887,
  fullKeyEchoOptions: 1612,
};
const expectedAfter = {
  itemsWithWarnings: 1421,
  incorrectOptionsWithWarnings: 4114,
  insufficientDetailOptions: 1491,
  genericTemplateOptions: 2558,
  choiceRestatementOptions: 1839,
  fullKeyEchoOptions: 1564,
};
const challengeAnchors = {
  'eppp-b004-assessment-2': ['already predicts treatment dropout', 'internal-consistency coefficient'],
  'eppp-b008-assessment-1': ['95% interval of 66–74', 'population mean'],
  'eppp-b008-research-2': ['confirmatory factor analysis', 'multiple related dimensions'],
  'eppp-b009-research-1': ['visible audit team', 'Observer-expectancy bias'],
  'eppp-b005-biological-1': ['switch task rules', 'prepotent-response inhibition'],
  'eppp-b006-biological-1': ['biallelic PAH variants', 'medical-food supplementation'],
  'eppp-b003-cognitive-1': ['forced-compliance experiment', 'insufficient external justification'],
  'eppp-b003-cognitive-2': ['comparably intense pieces of information', 'Mood-congruent memory'],
  'eppp-b005-lifespan-1': ['fluid reasoning', 'unfamiliar visual pattern'],
  'eppp-b005-lifespan-2': ['onset of gonadarche', 'Hypothalamic GnRH'],
  'eppp-b003-intervention-2': ['explanatory model of distress', 'adapt intervention skills collaboratively'],
  'eppp-b004-intervention-1': ['cycles of conflict and withdrawal', 'possible avoidance'],
  'eppp-b003-professional-1': ['medical episodes', 'appropriate assistance or consultation'],
  'eppp-b003-professional-2': ['ongoing video therapy', 'legal authorization in relevant jurisdictions'],
  'eppp-b007-social-1': ['successful launch', 'self-serving'],
  'eppp-b007-social-2': ['intergroup-contact program', 'structured conditions strengthen'],
};
const genericFeedbackPattern = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim|does not represent the best available answer)\b/i;
const extremeCuePattern = /\b(?:always|never|only|every|entirely|exclusively|regardless|automatically|guaranteed|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;
const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const wordCount = (value) => String(value || '').trim().split(/\s+/).filter(Boolean).length;

describe('EPPP incorrect-option explanation repair wave 09', () => {
  it('replays quality and feedback waves in the canonical expansion build', () => {
    const builder = fs.readFileSync(expansionBuilderPath, 'utf8');
    const steps = [
      "require('./repair_eppp_native_quality_wave_05.cjs')",
      "require('./repair_eppp_native_quality_wave_06.cjs')",
      "require('./repair_eppp_option_feedback_wave_07.cjs')",
      "require('./repair_eppp_option_feedback_wave_08.cjs')",
      "require('./repair_eppp_option_feedback_wave_09.cjs')",
      "require('./audit_eppp_distractor_quality.cjs')",
      "require('./audit_eppp_option_feedback.cjs')",
    ];
    const positions = steps.map((step) => builder.indexOf(step));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
    const replayGuard = "if(existingBank.length===1500&&existingBank.filter(x=>x.expansionBatch===batchId).length===500)";
    const freshSelection = 'const bank=existingBank,base=bank.filter';
    expect(builder.indexOf(replayGuard)).toBeGreaterThanOrEqual(0);
    expect(builder.indexOf(replayGuard)).toBeLessThan(builder.indexOf(freshSelection));
    expect(builder).toContain('without reselecting mutable legacy candidates');
  });

  it('integrates all 16 application-level revisions without changing answer positions', () => {
    const sourceText = fs.readFileSync(sourcePath, 'utf8');
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(sourceText);
    const bank = JSON.parse(sourceText);
    const byId = new Map(bank.map((item) => [item.id, item]));
    expect(Object.keys(revisions)).toEqual(ids);
    const keyLengthAdvantages = [];

    ids.forEach((id, index) => {
      const revision = revisions[id];
      const item = byId.get(id);
      const authoredChoices = [0, 1, 2, 3].map((optionIndex) => revision.choices[optionIndex]);
      const incorrectIndexes = [0, 1, 2, 3].filter((optionIndex) => optionIndex !== expectedKeys[index]);
      const [promptAnchor, choiceAnchor] = challengeAnchors[id];

      expect(item).toBeTruthy();
      expect(revision.expectedAnswerIndex).toBe(expectedKeys[index]);
      expect(item.answerIndex).toBe(expectedKeys[index]);
      expect(revision.difficulty).toBe('intermediate');
      expect(item.difficulty).toBe('intermediate');
      expect(item.optionFeedbackReviewWave).toBe('eppp-option-feedback-wave-01');
      expect(item.optionFeedbackRefinementWave).toBe('eppp-option-feedback-wave-09');
      expect(item.optionFeedbackRefinedAt).toBe('2026-07-18');
      expect(revision.sourceCheck.length).toBeGreaterThanOrEqual(100);
      expect(revision.feedbackDesign).toHaveLength(3);
      expect(new Set(revision.feedbackDesign).size).toBe(3);
      expect(revision.qualityFlags.length).toBeGreaterThan(0);

      expect(item.prompt).toBe(revision.prompt);
      expect(item.prompt.length).toBeGreaterThanOrEqual(120);
      expect(item.prompt).toContain(promptAnchor);
      expect(item.choices).toEqual(authoredChoices);
      expect(item.choices.join(' ')).toContain(choiceAnchor);
      expect(item.choices.every((choice) => choice.length >= 40)).toBe(true);
      expect(new Set(item.choices.map(normalize)).size).toBe(4);
      expect(item.choices.some((choice) => extremeCuePattern.test(choice))).toBe(false);
      expect(item.choices.some((choice) => /\brequire(?:s|d)?\b/i.test(choice))).toBe(false);
      expect(item.choices.some((choice) => /\b(?:all|none) of the above\b/i.test(choice))).toBe(false);
      const distractorLengths = incorrectIndexes.map((optionIndex) => item.choices[optionIndex].length);
      keyLengthAdvantages.push(item.choices[item.answerIndex].length - Math.max(...distractorLengths));
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
    });
    expect(keyLengthAdvantages.filter((advantage) => advantage > 0).length).toBeLessThanOrEqual(4);
    expect(Math.max(...keyLengthAdvantages)).toBeLessThanOrEqual(7);
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

  it('records the exact wave-08 baseline, wave-09 reduction, and active diagnostics record', () => {
    const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
    expect(wave08WarningSnapshot).toEqual(expectedBefore);
    expect(audit).toMatchObject({ reviewWave: 'eppp-option-feedback-wave-09', reviewedAt: '2026-07-18' });
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
    const wave09 = diagnostics.waves['eppp-option-feedback-wave-09'];
    expect(wave09).toMatchObject({
      reviewWave: 'eppp-option-feedback-wave-09',
      incorrectOptions: 48,
      optionsWithWarnings: 0,
      status: 'pass',
      findings: [],
    });
    expect(wave09.ids).toEqual(ids);
    const warningIds = new Set(diagnostics.optionFindings.map((finding) => finding.id));
    ids.forEach((id) => expect(warningIds.has(id)).toBe(false));

    const challengeDiagnostics = JSON.parse(fs.readFileSync(distractorDiagnosticsPath, 'utf8'));
    expect(challengeDiagnostics.summary.forbiddenAggregateChoices).toBe(0);
    ['uniqueKeyStemLexicalLeakage', 'asymmetricExtremeDistractors', 'advancedDirectRecall'].forEach((findingKey) => {
      const flaggedIds = new Set(challengeDiagnostics[findingKey].map((finding) => finding.id));
      ids.forEach((id) => expect(flaggedIds.has(id)).toBe(false));
    });
  });
});
