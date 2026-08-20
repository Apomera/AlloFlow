import fs from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const packPath = resolve(root, 'test_prep/ap_psychology_pilot.json');
const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
const cedUrl = 'https://apcentral.collegeboard.org/media/pdf/ap-psychology-course-and-exam-description.pdf';
const clarificationsUrl = 'https://apcentral.collegeboard.org/media/pdf/ap-psychology-course-and-exam-description-clarifications.pdf';

function countsBy(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

describe('AP Psychology independent pilot', () => {
  it('matches the declared five-unit midpoint sampler', () => {
    const itemCountsByDomain = countsBy(pack.items.map((item) => item.domainId));

    expect(pack.schemaVersion).toBe(1);
    expect(pack.itemSchemaVersion).toBe(2);
    expect(pack.status).toBe('preview');
    expect(pack.items).toHaveLength(500);
    expect(pack.domains).toHaveLength(5);
    expect(new Set(pack.domains.map((domain) => domain.id)).size).toBe(5);

    for (const domain of pack.domains) {
      expect(domain.officialWeightMin).toBe(0.15);
      expect(domain.officialWeightMax).toBe(0.25);
      expect(domain.itemCount).toBe(100);
      expect(itemCountsByDomain[domain.id]).toBe(100);
    }
    expect(pack.domains.reduce((sum, domain) => sum + domain.weight, 0)).toBeCloseTo(1, 10);
  });

  it('holds the pilot science-practice and answer-position distributions exactly', () => {
    expect(countsBy(pack.items.map((item) => item.practiceId))).toEqual({ P1: 325, P2: 125, P3: 50 });
    expect(pack.practiceDistribution).toMatchObject({
      'P1-concept-application': 325,
      'P2-research-methods-and-design': 125,
      'P3-data-interpretation': 50,
      'P4-argumentation': 0,
    });

    expect(countsBy(pack.items.map((item) => String(item.answerIndex)))).toEqual({
      0: 125,
      1: 125,
      2: 125,
      3: 125,
    });
    expect(pack.answerPositionDistribution).toEqual({ 0: 125, 1: 125, 2: 125, 3: 125 });
  });

  it('provides one best answer and substantive option-specific feedback for every item', () => {
    const itemIds = pack.items.map((item) => item.id);
    const prompts = pack.items.map((item) => item.prompt.trim());

    expect(new Set(itemIds).size).toBe(itemIds.length);
    expect(new Set(prompts).size).toBe(prompts.length);

    for (const item of pack.items) {
      expect(item.type).toBe('single-choice');
      expect(['P1', 'P2', 'P3']).toContain(item.practiceId);
      expect(item.topicIds.length).toBeGreaterThan(0);
      expect(item.prompt.trim()).not.toBe('');
      expect(item.rationale.trim()).not.toBe('');
      expect(item.choices).toHaveLength(4);
      expect(item.choiceRationales).toHaveLength(4);
      expect(new Set(item.choices.map((choice) => choice.trim())).size).toBe(4);
      expect(item.choices.every((choice) => choice.trim())).toBe(true);
      expect(item.choiceRationales.every((rationale) => rationale.trim())).toBe(true);
      expect(item.answerIndex).toBeGreaterThanOrEqual(0);
      expect(item.answerIndex).toBeLessThan(item.choices.length);
      expect(item.editorialChecks).toMatchObject({
        singleBestAnswer: true,
        parallelPlausibleOptions: true,
        noKeywordGiveaway: true,
        completeOptionFeedback: true,
      });
    }
  });

  it('declares independent provenance without treating declarations as completed expert review', () => {
    expect(pack.released).toBe(false);
    expect(pack.calibrated).toBe(false);
    expect(pack.releaseGates).toMatchObject({
      independentRightsReview: 'pending',
      independentAccessibilityReview: 'pending',
      apPsychologySubjectExpertReview: 'pending',
      fieldTesting: 'not-started',
      psychometricCalibration: 'not-started',
      releaseEligible: false,
    });
    expect(pack.expertReviewGate).toMatchObject({ status: 'pending', releaseBlocked: true });
    expect(pack.accessibilityGate).toMatchObject({
      independentReviewStatus: 'pending',
      productionVoiceValidationStatus: 'pending',
    });
    expect(pack.rightsPolicy).toMatchObject({
      secureCollegeBoardContentUsed: false,
      copiedOrRephrasedCollegeBoardQuestions: false,
      status: 'pending-independent-rights-review',
    });

    for (const item of pack.items) {
      expect(item.provenance).toBe('native-original');
      expect(item.officialItem).toBe(false);
      expect(item.rights).toMatchObject({
        secureContentUsed: false,
        copiedOfficialQuestion: false,
        sourceUse: 'facts-and-blueprint-only',
        status: 'pending-independent-rights-review',
      });
      expect(item.expertReview).toMatchObject({ status: 'pending', releaseBlocked: true });
      expect(item.accessibility).toMatchObject({
        textOnly: true,
        linearReadingOrder: true,
        handsFreeContentCompatible: true,
        status: 'pending-independent-accessibility-review',
      });
      expect(item.psychometricStatus).toBe('not-calibrated');
      expect(item.releaseEligible).toBe(false);
    }
  });

  it('links each item to the public blueprint and at least one attributable factual source', () => {
    expect(pack.officialBlueprintUrl).toBe(cedUrl);
    expect(pack.clarificationsUrl).toBe(clarificationsUrl);
    expect(pack.blueprint).toMatchObject({
      cedEffectiveLabel: 'Fall 2025',
      cedFrameworkVersion: 'V.1',
      cedClarificationsImplemented: 'October 2025',
      examFormatReferenceYear: 2026,
      examModeReference: 'fully-digital',
    });

    const sourceUrls = new Set(pack.sourceCatalog.map((source) => source.url));
    expect(sourceUrls).toContain(cedUrl);
    expect(sourceUrls).toContain(clarificationsUrl);
    expect(sourceUrls).toContain(pack.officialExamUrl);

    for (const item of pack.items) {
      expect(item.references).toContain(cedUrl);
      expect(item.sourceDetails.length).toBeGreaterThan(0);
      for (const source of item.sourceDetails) {
        expect(source.title.trim()).not.toBe('');
        expect(source.organization.trim()).not.toBe('');
        expect(source.url).toMatch(/^https:\/\//);
        expect(source.credibility.trim()).not.toBe('');
        expect(item.references).toContain(source.url);
      }
    }
  });

  it('does not imply constructed-response scoring or official score prediction', () => {
    expect(pack.capabilities).toMatchObject({
      responseTypes: ['single-choice'],
      stimulusGroupsIncluded: false,
      constructedResponseIncluded: false,
      frqWorkshopsIncluded: true,
    });
    expect(pack.capabilities.limitations.some((limitation) => /AAQ.*EBQ/i.test(limitation))).toBe(true);
    expect(pack.capabilities.limitations.some((limitation) => /No official-score or readiness inference/i.test(limitation))).toBe(true);
    expect(pack.disclaimer).toMatch(/unofficial/i);
    expect(pack.disclaimer).toMatch(/not official AP scores/i);
    expect(pack.disclaimer).toMatch(/not diagnosis, treatment, or medical advice/i);
  });
});
