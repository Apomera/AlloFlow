import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { revisions, wave07WarningSnapshot } = require('../dev-tools/eppp_option_feedback_wave_08_data.cjs');

const root = process.cwd();
const sourcePath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_native_items.json');
const catalogPath = path.join(root, 'test_prep', 'reference_catalog.json');
const deployCatalogPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'reference_catalog.json');
const auditPath = path.join(root, 'test_prep', 'eppp_option_feedback_audit_wave_08.json');
const diagnosticsPath = path.join(root, 'test_prep', 'eppp_option_feedback_diagnostics.json');
const distractorDiagnosticsPath = path.join(root, 'test_prep', 'eppp_distractor_quality_diagnostics.json');
const ids = [
  'eppp-b007-assessment-2',
  'eppp-b005-assessment-1',
  'eppp-b003-biological-2',
  'eppp-b004-biological-2',
  'eppp-b002-cognitive-1',
  'eppp-b002-cognitive-2',
  'eppp-b002-intervention-2',
  'eppp-b003-intervention-1',
  'eppp-b003-lifespan-2',
  'eppp-b004-lifespan-1',
  'eppp-b002-professional-1',
  'eppp-b002-professional-2',
  'eppp-b007-research-1',
  'eppp-b008-research-1',
  'eppp-b004-social-2',
  'eppp-b006-social-1',
];
const expectedKeys = [2, 0, 2, 2, 1, 3, 3, 1, 3, 1, 1, 3, 0, 0, 2, 0];
const genericFeedbackPattern = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim|does not represent the best available answer)\b/i;
const extremeCuePattern = /\b(?:always|never|only|every|entirely|exclusively|regardless|automatically|guaranteed|completely|identical|none|all|immediately|universally|solely|definitively|perfectly|strictly|absolutely|permanently|categorically)\b/i;
const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const wordCount = (value) => String(value || '').trim().split(/\s+/).filter(Boolean).length;

describe('EPPP incorrect-option explanation repair wave 08', () => {
  it('preserves answer positions and supplies three detailed nonredundant explanations per item', () => {
    const sourceText = fs.readFileSync(sourcePath, 'utf8');
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(sourceText);
    expect(fs.readFileSync(deployCatalogPath, 'utf8')).toBe(fs.readFileSync(catalogPath, 'utf8'));
    const bank = JSON.parse(sourceText);
    const byId = new Map(bank.map((item) => [item.id, item]));

    ids.forEach((id, index) => {
      const item = byId.get(id);
      expect(item).toBeTruthy();
      expect(revisions[id].expectedAnswerIndex).toBe(expectedKeys[index]);
      expect(item.answerIndex).toBe(expectedKeys[index]);
      expect(item.optionFeedbackReviewWave).toBe('eppp-option-feedback-wave-01');
      const refinementWave = /^eppp-option-feedback-wave-(\d+)$/.exec(item.optionFeedbackRefinementWave || '');
      expect(refinementWave).toBeTruthy();
      expect(Number(refinementWave[1])).toBeGreaterThanOrEqual(8);
      expect(item.optionFeedbackRefinedAt >= '2026-07-18').toBe(true);
      expect(item.choices).toHaveLength(4);
      expect(new Set(item.choices.map(normalize)).size).toBe(4);
      expect(item.choices.some((choice) => extremeCuePattern.test(choice))).toBe(false);
      expect(item.choices.some((choice) => /\b(?:all|none) of the above\b/i.test(choice))).toBe(false);
      expect(item.choiceRationales).toHaveLength(4);
      expect(item.choiceRationales[item.answerIndex]).toBe(item.rationale);
      const explanations = [];
      item.choiceRationales.forEach((feedback, optionIndex) => {
        if (optionIndex === item.answerIndex) return;
        explanations.push(normalize(feedback));
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
  });

  it('records the source repairs and challenge refinements without changing keys', () => {
    const bank = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const byId = new Map(bank.map((item) => [item.id, item]));
    const td = byId.get('eppp-b004-biological-2');
    expect(td.prompt).toBe('A patient develops persistent involuntary orofacial and limb movements after taking a medication for several years. Which medication history is most characteristic of tardive dyskinesia?');
    expect(td.references).toEqual(['https://doi.org/10.1177/0706743719828968']);
    expect(td.references).not.toContain('https://doi.org/10.4088/JCP.tv17016ah4c');

    const vta = byId.get('eppp-b003-biological-2');
    expect(vta.choices.join(' ')).toContain('dorsal-striatal');
    expect(vta.choices.join(' ')).toContain('prolactin');
    const principleA = byId.get('eppp-b002-professional-1');
    expect(principleA.choices.join(' ')).toContain('accuracy, honesty, and truthfulness');
    expect(principleA.choices.join(' ')).toContain('privacy, confidentiality, and self-determination');
    expect(byId.get('eppp-b002-cognitive-1').choices[1]).toBe('Biological preparedness shapes conditioning selectivity');
    expect(byId.get('eppp-b002-professional-2').choices[3]).toBe('Its nature, anticipated course, fees, third-party involvement, and limits of confidentiality');
    const constructValidity = byId.get('eppp-b007-research-1');
    expect(constructValidity.prompt).toContain('different measurement methods');
    expect(byId.get('eppp-b007-assessment-2').choices[2]).toBe('Shows unequal conditional response probabilities across groups matched on the target ability');
    expect(byId.get('eppp-b008-research-1').choices[0]).toBe('The chance that a study enters the available literature depends on result direction or statistical significance');
    const asch = byId.get('eppp-b004-social-2');
    expect(asch.choices[asch.answerIndex]).toContain('dissenter');
    expect(asch.rationale).toContain('did not have to give the objectively correct answer');

    const strengthened = [
      'eppp-b007-assessment-2',
      'eppp-b005-assessment-1',
      'eppp-b004-biological-2',
      'eppp-b004-lifespan-1',
      'eppp-b008-research-1',
      'eppp-b006-social-1',
    ].map((id) => byId.get(id));
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    strengthened.forEach((item) => {
      expect(item.sourceDetails).toHaveLength(item.references.length);
      item.sourceDetails.forEach((source) => {
        expect(source.title.length).toBeGreaterThanOrEqual(20);
        expect(source.credibility.length).toBeGreaterThanOrEqual(100);
        expect(catalog[source.url]).toMatchObject({
          title: source.title,
          organization: source.organization,
          credibility: source.credibility,
          metadataSource: 'pack-authored',
        });
      });
    });
  });

  it('documents all 48 explanation repairs and clears the active-wave diagnostics', () => {
    const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
    expect(audit).toMatchObject({ reviewWave: 'eppp-option-feedback-wave-08', reviewedAt: '2026-07-18' });
    expect(wave07WarningSnapshot).toEqual({
      itemsWithWarnings: 1453,
      incorrectOptionsWithWarnings: 4210,
      insufficientDetailOptions: 1491,
      genericTemplateOptions: 2654,
      choiceRestatementOptions: 1935,
      fullKeyEchoOptions: 1660,
    });
    expect(audit.summary).toMatchObject({
      totalItems: 1500,
      reviewedItems: 16,
      domainsCovered: 8,
      detailedIncorrectOptionExplanations: 48,
      keyPositionsPreserved: 16,
      selectedOptionsWithWarningsAfter: 0,
      choicesRefined: 24,
      challengeRefinedItems: 12,
      promptsRefined: 2,
      rationalesRefined: 1,
      itemsWithStrengthenedReferences: 6,
      status: 'pass',
    });
    expect(audit.summary.bankWarningsBefore).toEqual(wave07WarningSnapshot);
    expect(audit.summary.bankWarningsAfter.incorrectOptionsWithWarnings).toBe(4162);
    expect(audit.items.map((item) => item.id)).toEqual(ids);
    expect(audit.items.every((item, index) => item.expectedAnswerIndex === expectedKeys[index] && item.feedbackDesign.length === 3 && item.keyPositionPreserved)).toBe(true);

    const diagnostics = JSON.parse(fs.readFileSync(diagnosticsPath, 'utf8'));
    const wave08 = diagnostics.waves['eppp-option-feedback-wave-08'];
    expect(wave08).toMatchObject({
      reviewWave: 'eppp-option-feedback-wave-08',
      status: 'pass',
      findings: [],
    });
    expect(wave08.ids).toEqual(ids);
    expect(wave08.incorrectOptions).toBe(48);
    expect(wave08.optionsWithWarnings).toBe(0);
    const warningIds = new Set(diagnostics.optionFindings.map((finding) => finding.id));
    ids.forEach((id) => expect(warningIds.has(id)).toBe(false));

    const distractorDiagnostics = JSON.parse(fs.readFileSync(distractorDiagnosticsPath, 'utf8'));
    // Later reviewed waves may remove additional lexical cues without changing wave-08 content.
    expect(distractorDiagnostics.summary.uniqueKeyStemLexicalLeakageCandidates).toBeLessThanOrEqual(187);
  });
});
