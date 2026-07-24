import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { revisions, wave10WarningSnapshot, wave11WarningSnapshot } = require('../dev-tools/eppp_option_feedback_wave_11_data.cjs');

const root = process.cwd();
const sourcePath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_native_items.json');
const catalogPath = path.join(root, 'test_prep', 'reference_catalog.json');
const deployCatalogPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'reference_catalog.json');
const auditPath = path.join(root, 'test_prep', 'eppp_option_feedback_audit_wave_11.json');
const deployAuditPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_option_feedback_audit_wave_11.json');
const diagnosticsPath = path.join(root, 'test_prep', 'eppp_option_feedback_diagnostics.json');
const expansionBuilderPath = path.join(root, 'dev-tools', 'build_eppp_1500_expansion.cjs');
const ids = [
  'eppp-v3-assessment-020',
  'eppp-b008-assessment-2',
  'eppp-b009-research-2',
  'eppp-b010-research-1',
  'eppp-v3-biological-028',
  'eppp-v3-biological-041',
  'eppp-v3-cognitive-affective-034',
  'eppp-b004-cognitive-2',
  'eppp-v3-lifespan-005',
  'eppp-v3-lifespan-036',
  'eppp-v3-intervention-043',
  'eppp-v3-intervention-042',
  'eppp-v3-professional-065',
  'eppp-b004-professional-1',
  'eppp-b008-social-1',
  'eppp-b009-social-1',
];
const expectedKeys = [1, 2, 2, 0, 3, 0, 1, 3, 2, 1, 2, 1, 0, 1, 0, 0];
const expectedBefore = {
  itemsWithWarnings: 1405,
  incorrectOptionsWithWarnings: 4066,
  insufficientDetailOptions: 1481,
  genericTemplateOptions: 2522,
  choiceRestatementOptions: 1809,
  fullKeyEchoOptions: 1538,
};
const expectedAfter = {
  itemsWithWarnings: 1389,
  incorrectOptionsWithWarnings: 4018,
  insufficientDetailOptions: 1465,
  genericTemplateOptions: 2474,
  choiceRestatementOptions: 1767,
  fullKeyEchoOptions: 1517,
};
const expectedCurrent = {
  itemsWithWarnings: 1357,
  incorrectOptionsWithWarnings: 3924,
  insufficientDetailOptions: 1425,
  genericTemplateOptions: 2420,
  choiceRestatementOptions: 1722,
  fullKeyEchoOptions: 1489,
};
const genericFeedbackPattern = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim|does not represent the best available answer)\b/i;
const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const wordCount = (value) => String(value || '').trim().split(/\s+/).filter(Boolean).length;

describe('EPPP incorrect-option explanation repair wave 11', () => {
  it('replays after wave 10 and before the canonical diagnostics', () => {
    const builder = fs.readFileSync(expansionBuilderPath, 'utf8');
    const steps = [
      "require('./repair_eppp_option_feedback_wave_10.cjs')",
      "require('./repair_eppp_option_feedback_wave_11.cjs')",
      "require('./audit_eppp_distractor_quality.cjs')",
      "require('./audit_eppp_option_feedback.cjs')",
    ];
    const positions = steps.map((step) => builder.indexOf(step));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
  });

  it('replaces all 48 selected explanations without changing answer positions', () => {
    const sourceText = fs.readFileSync(sourcePath, 'utf8');
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(sourceText);
    const bank = JSON.parse(sourceText);
    const byId = new Map(bank.map((item) => [item.id, item]));
    const domainCounts = new Map();

    expect(Object.keys(revisions)).toEqual(ids);
    ids.forEach((id, itemIndex) => {
      const revision = revisions[id];
      const item = byId.get(id);
      const incorrectIndexes = [0, 1, 2, 3].filter((optionIndex) => optionIndex !== expectedKeys[itemIndex]);

      expect(item).toBeTruthy();
      expect(revision.expectedAnswerIndex).toBe(expectedKeys[itemIndex]);
      expect(item.answerIndex).toBe(expectedKeys[itemIndex]);
      expect(item.optionFeedbackRefinementWave).toBe('eppp-option-feedback-wave-11');
      expect(item.optionFeedbackRefinedAt).toBe('2026-07-22');
      expect(item.qaReviewedAt).toBe('2026-07-22');
      expect(revision.sourceCheck.length).toBeGreaterThanOrEqual(100);
      expect(revision.feedbackDesign).toHaveLength(3);
      expect(new Set(revision.feedbackDesign).size).toBe(3);
      expect(Object.keys(revision.incorrectFeedback).map(Number).sort()).toEqual(incorrectIndexes);
      expect(item.choiceRationales[item.answerIndex]).toBe(item.rationale);

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

  it('ships complete learner-facing metadata for strengthened citations', () => {
    const bank = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const byId = new Map(bank.map((item) => [item.id, item]));
    const catalogText = fs.readFileSync(catalogPath, 'utf8');
    expect(fs.readFileSync(deployCatalogPath, 'utf8')).toBe(catalogText);
    const catalog = JSON.parse(catalogText);
    const strengthened = ids.filter((id) => revisions[id].sourceDetails);
    expect(strengthened).toHaveLength(6);

    strengthened.forEach((id) => {
      const item = byId.get(id);
      const revision = revisions[id];
      expect(item.references).toEqual(revision.references);
      expect(item.sourceDetails).toEqual(revision.sourceDetails);
      item.sourceDetails.forEach((source) => {
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

  it('records the expected warning reduction and warning-free selected set', () => {
    const auditText = fs.readFileSync(auditPath, 'utf8');
    expect(fs.readFileSync(deployAuditPath, 'utf8')).toBe(auditText);
    const audit = JSON.parse(auditText);
    expect(wave10WarningSnapshot).toEqual(expectedBefore);
    expect(wave11WarningSnapshot).toEqual(expectedAfter);
    expect(audit).toMatchObject({ reviewWave: 'eppp-option-feedback-wave-11', reviewedAt: '2026-07-22' });
    expect(audit.summary).toMatchObject({
      totalItems: 1500,
      reviewedItems: 16,
      domainsCovered: 8,
      detailedIncorrectOptionExplanations: 48,
      keyPositionsPreserved: 16,
      selectedOptionsWithWarningsAfter: 0,
      itemsWithStrengthenedReferences: 6,
      bankWarningsBefore: expectedBefore,
      bankWarningsAfter: expectedAfter,
      status: 'pass',
    });
    expect(audit.items.map((item) => item.id)).toEqual(ids);

    const diagnostics = JSON.parse(fs.readFileSync(diagnosticsPath, 'utf8'));
    const wave11 = diagnostics.waves['eppp-option-feedback-wave-11'];
    expect(wave11).toMatchObject({ incorrectOptions: 48, optionsWithWarnings: 0, status: 'pass', findings: [] });
    expect(wave11.ids).toEqual(ids);
    expect(diagnostics.mostRecentWave).toEqual(wave11);
    expect(diagnostics.latestReviewWave).toBe('eppp-option-feedback-wave-11');
    expect(diagnostics.summary).toMatchObject(expectedCurrent);
  });
});
