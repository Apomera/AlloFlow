import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const sourcePath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_native_items.json');
const catalogPath = path.join(root, 'test_prep', 'reference_catalog.json');
const deployCatalogPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'reference_catalog.json');
const auditPath = path.join(root, 'test_prep', 'eppp_option_feedback_audit_wave_07.json');
const diagnosticsPath = path.join(root, 'test_prep', 'eppp_option_feedback_diagnostics.json');
const ids = [
  'eppp-b001-assessment-2',
  'eppp-b003-assessment-2',
  'eppp-b001-biological-2',
  'eppp-b003-biological-1',
  'eppp-b001-cognitive-1',
  'eppp-b001-cognitive-2',
  'eppp-b001-intervention-1',
  'eppp-b001-intervention-2',
  'eppp-b001-lifespan-2',
  'eppp-b003-lifespan-1',
  'eppp-b001-professional-1',
  'eppp-b001-professional-2',
  'eppp-b001-research-2',
  'eppp-b005-research-1',
  'eppp-b003-social-1',
  'eppp-b003-social-2',
];
const expectedKeys = [2, 2, 2, 0, 1, 3, 1, 3, 3, 1, 1, 3, 2, 0, 0, 2];
const genericFeedbackPattern = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|makes an absolute or unconditional claim|does not represent the best available answer)\b/i;
const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const wordCount = (value) => String(value || '').trim().split(/\s+/).filter(Boolean).length;

describe('EPPP incorrect-option explanation repair wave 07', () => {
  it('keeps source and deployment data synchronized and preserves every answer position', () => {
    const sourceText = fs.readFileSync(sourcePath, 'utf8');
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(sourceText);
    expect(fs.readFileSync(deployCatalogPath, 'utf8')).toBe(fs.readFileSync(catalogPath, 'utf8'));
    const bank = JSON.parse(sourceText);
    const byId = new Map(bank.map((item) => [item.id, item]));

    ids.forEach((id, index) => {
      const item = byId.get(id);
      expect(item).toBeTruthy();
      expect(item.answerIndex).toBe(expectedKeys[index]);
      expect(item.optionFeedbackReviewWave).toBe('eppp-option-feedback-wave-01');
      expect(item.optionFeedbackRefinementWave).toBe('eppp-option-feedback-wave-07');
      expect(item.optionFeedbackRefinedAt).toBe('2026-07-18');
      expect(item.choices).toHaveLength(4);
      expect(item.choiceRationales).toHaveLength(4);
      expect(item.choiceRationales[item.answerIndex]).toBe(item.rationale);
      const incorrectExplanations = [];
      item.choiceRationales.forEach((feedback, optionIndex) => {
        if (optionIndex === item.answerIndex) return;
        incorrectExplanations.push(normalize(feedback));
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
      expect(new Set(incorrectExplanations).size).toBe(3);
    });
  });

  it('records the narrow accuracy and source corrections with full source metadata', () => {
    const bank = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const byId = new Map(bank.map((item) => [item.id, item]));
    const ltp = byId.get('eppp-b001-biological-2');
    expect(ltp.choices[3]).toContain('AMPA-receptor internalization');
    expect(ltp.choices[3]).not.toContain('Permanent');

    const insomnia = byId.get('eppp-b001-intervention-1');
    expect(insomnia.references).toEqual([
      'https://pmc.ncbi.nlm.nih.gov/articles/PMC7853203/',
      'https://doi.org/10.1146/annurev.clinpsy.3.022806.091516',
    ]);
    const flooding = byId.get('eppp-b001-intervention-2');
    expect(flooding.references).toEqual([
      'https://dictionary.apa.org/flooding',
      'https://dictionary.apa.org/systematic-desensitization',
    ]);
    [insomnia, flooding].forEach((item) => {
      expect(item.sourceDetails).toHaveLength(item.references.length);
      expect(item.sourceDetails.every((source) => source.title.length >= 20 && source.credibility.length >= 100)).toBe(true);
    });

    const intentionToTreat = byId.get('eppp-b001-research-2');
    expect(intentionToTreat.rationale).toContain('Missing outcomes still require');
    expect(intentionToTreat.rationale).toContain('originally assigned group');

    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    [...insomnia.sourceDetails, ...flooding.sourceDetails].forEach((source) => {
      expect(catalog[source.url]).toMatchObject({
        title: source.title,
        organization: source.organization,
        credibility: source.credibility,
        metadataSource: 'pack-authored',
      });
    });
  });

  it('documents all 48 repairs and clears every selected diagnostic warning', () => {
    const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
    expect(audit.summary).toMatchObject({
      totalItems: 1500,
      reviewedItems: 16,
      domainsCovered: 8,
      detailedIncorrectOptionExplanations: 48,
      keyPositionsPreserved: 16,
      selectedOptionsWithWarningsAfter: 0,
      distractorsRefined: 1,
      rationalesRefined: 1,
      itemsWithReferenceCorrections: 2,
      status: 'pass',
    });
    expect(audit.summary.bankWarningsBefore.incorrectOptionsWithWarnings).toBe(4258);
    expect(audit.summary.bankWarningsAfter.incorrectOptionsWithWarnings).toBe(4210);
    expect(audit.items.map((item) => item.id)).toEqual(ids);
    expect(audit.items.every((item) => item.feedbackDesign.length === 3 && item.keyPositionPreserved)).toBe(true);

    const diagnostics = JSON.parse(fs.readFileSync(diagnosticsPath, 'utf8'));
    const wave = diagnostics.waves['eppp-option-feedback-wave-07'];
    expect(wave).toMatchObject({
      reviewWave: 'eppp-option-feedback-wave-07',
      incorrectOptions: 48,
      optionsWithWarnings: 0,
      status: 'pass',
      findings: [],
    });
    expect(wave.ids).toEqual(ids);
    const warningIds = new Set(diagnostics.optionFindings.map((finding) => finding.id));
    ids.forEach((id) => expect(warningIds.has(id)).toBe(false));
  });
});
