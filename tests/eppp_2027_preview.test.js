import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'test_prep/eppp_2027_preview_pack.json');
const deployPath = resolve(process.cwd(), 'desktop/web-app/public/test_prep/eppp_2027_preview_pack.json');
const reportPath = resolve(process.cwd(), 'test_prep/eppp_2027_preview_qa.json');
const pack = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const blueprintUrl = 'https://asppb.net/future-eppp-content-areas-2027/';
const expectedPresentationMetadata = {
  title: 'Unofficial Integrated EPPP 2027 Blueprint Preview',
  shortTitle: '2027 Blueprint Preview (Unofficial)',
  description: 'An independently authored, unofficial 20-item scenario-based sampler proportionally aligned to ASPPB\'s published future six-domain blueprint; not an official or psychometrically calibrated EPPP form.',
  previewBadge: 'Unofficial',
};
const expectedBlueprintMetadata = {
  blueprintLabel: 'Integrated EPPP future six-domain blueprint (fall 2027)',
  blueprintEffective: 'Future integrated EPPP blueprint planned for fall 2027 and later administrations',
  officialBlueprintUrl: blueprintUrl,
  transitionNotice: 'This unofficial preview follows ASPPB\'s future integrated six-domain blueprint. Current EPPP Part 1-Knowledge and Part 2-Skills administrations in 2026 and 2027 continue to use their separately published blueprints.',
  transitionUrl: blueprintUrl,
};
const allNonePattern = /\b(?:all|none)\s+of\s+(?:the\s+)?(?:above|these|those|options)\b/i;
const categoricalCuePattern = /\b(?:always|never|only|every|entirely|completely|automatically|guarantees?|proves?|eliminates?|invalidates?)\b/i;
const countWords = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean).length;
const expectedQaExceptions = {
  'eppp-2027-preview-ethical-02': {
    categoricalDistractors: 'Two audit-prescribed distractors intentionally test categorical legal errors about record subsets and subpoena force; the keyed response preserves jurisdiction-sensitive conditional reasoning.',
  },
};

const expectedDomains = {
  'scientific-orientation': { weight: 0.15, itemCount: 3 },
  assessment: { weight: 0.20, itemCount: 4 },
  intervention: { weight: 0.20, itemCount: 4 },
  'consultation-supervision': { weight: 0.10, itemCount: 2 },
  'interpersonal-relationships': { weight: 0.15, itemCount: 3 },
  'ethical-professional-practice': { weight: 0.20, itemCount: 4 },
};

const supportedAnswers = new Map([
  ['eppp-2027-preview-scientific-01', 'Disclose dual roles, examine power and nonresponse effects, use independent procedures when feasible, and limit conclusions to this sample and setting.'],
  ['eppp-2027-preview-scientific-02', 'The estimate is precise but smaller than the prespecified threshold for a clinically important benefit.'],
  ['eppp-2027-preview-scientific-03', 'In this sample, higher use was associated with higher odds of anxiety; the cross-sectional design does not establish temporal or causal direction.'],
  ['eppp-2027-preview-assessment-01', 'Explain the low positive predictive value and obtain a fuller assessment before making a diagnosis.'],
  ['eppp-2027-preview-assessment-02', 'Consult test guidance and the client, prefer an accessible validated alternative, and document interpretation limits if a nonstandard modification remains necessary.'],
  ['eppp-2027-preview-assessment-03', 'Follow test-specific restart rules; document the disruption and withhold the standard score if validity remains uncertain.'],
  ['eppp-2027-preview-assessment-04', 'Investigate setting, timing, and informant perspectives, then integrate the discrepancy with interviews and observations.'],
  ['eppp-2027-preview-intervention-01', 'Defer clinical use while evaluating evidence, data practices, accessibility, crisis handling, and client choice.'],
  ['eppp-2027-preview-intervention-02', 'Review the outcome and alliance data with the client, reassess safety and formulation, and collaboratively agree on a modification.'],
  ['eppp-2027-preview-intervention-03', '"You see other problems as more important, yet drinking is affecting work. What would you like to change?"'],
  ['eppp-2027-preview-intervention-04', 'Combine local data and community input to select an evidence-informed strategy, preserve core components, and monitor outcomes.'],
  ['eppp-2027-preview-consultation-01', 'Create a written supervision and escalation plan, verify competence, ensure immediate supervisory access, and directly monitor the work.'],
  ['eppp-2027-preview-consultation-02', 'Clarify intended outcomes with interest holders, reconstruct the program logic, choose feasible process and outcome indicators, and state design limits.'],
  ['eppp-2027-preview-interpersonal-01', 'Check the meaning with the client through the interpreter, examine the psychologist\'s assumptions, and adapt pacing and gaze.'],
  ['eppp-2027-preview-interpersonal-02', 'Reflect on the reaction, seek consultation, ask how the client wants support provided, and adjust the psychologist\'s role.'],
  ['eppp-2027-preview-interpersonal-03', 'With consent, establish shared goals and roles with the family, exchange relevant information, and schedule joint review.'],
  ['eppp-2027-preview-ethical-01', 'Avoid client-data use until the psychologist has evaluated purpose-specific evidence and subgroup performance, data flows and retention, recording consent, human verification, competence, and failure procedures.'],
  ['eppp-2027-preview-ethical-02', 'Verify the subpoena and applicable law, preserve privilege, and obtain legal consultation before authorizing or opposing any disclosure.'],
  ['eppp-2027-preview-ethical-03', 'Privately raise the reidentification risk, verify valid authorization, and seek correction before presentation; escalate if the concern remains unresolved.'],
  ['eppp-2027-preview-ethical-04', 'Stop the faulty workflow, assess its scope, transparently correct records and claims, notify appropriate parties, and prevent recurrence.'],
]);

describe('Integrated EPPP 2027 Preview data pack', () => {
  it('matches the official future-domain weights exactly in a 20-item sampler', () => {
    expect(pack).toMatchObject({
      schemaVersion: 1,
      id: 'eppp-integrated-2027-preview',
      status: 'preview',
      batchSize: 20,
    });
    expect(pack.items).toHaveLength(20);
    expect(pack.domains).toHaveLength(6);
    for (const [domainId, expected] of Object.entries(expectedDomains)) {
      const declared = pack.domains.find((domain) => domain.id === domainId);
      expect(declared, domainId).toMatchObject(expected);
      expect(pack.items.filter((item) => item.domainId === domainId), domainId).toHaveLength(expected.itemCount);
    }
    expect(pack.blueprint.url).toBe(blueprintUrl);
    expect(pack.blueprint.operationalTiming).toBe('Fall 2027 and forward');
    expect(pack).toMatchObject(expectedBlueprintMetadata);
    expect(pack).toMatchObject(expectedPresentationMetadata);
    const remoteAdministration = pack.items.find((item) => item.id === 'eppp-2027-preview-assessment-03');
    expect(remoteAdministration).toMatchObject({
      competencyTag: '2.C.2',
      competencyLabel: 'Use relevant guidelines for nonstandard assessment administration, scoring, and interpretation',
    });
  });

  it('locks the twenty reviewed answer keys and exact five-per-position balance', () => {
    expect(supportedAnswers.size).toBe(20);
    for (const [id, supportedAnswer] of supportedAnswers) {
      const item = pack.items.find((candidate) => candidate.id === id);
      expect(item, id).toBeTruthy();
      expect(item.choices[item.answerIndex], id).toBe(supportedAnswer);
    }
    expect([0, 1, 2, 3].map((answerIndex) => pack.items.filter((item) => item.answerIndex === answerIndex).length)).toEqual([5, 5, 5, 5]);
  });

  it('requires advanced scenarios, four plausible options, and complete option-specific feedback', () => {
    for (const item of pack.items) {
      expect(item.type, item.id).toBe('single-choice');
      expect(item.difficulty, item.id).toBe('advanced');
      expect(item.prompt.length, item.id).toBeGreaterThanOrEqual(150);
      expect(item.choices, item.id).toHaveLength(4);
      expect(new Set(item.choices.map((choice) => choice.toLowerCase())).size, item.id).toBe(4);
      expect(item.choices.some((choice) => allNonePattern.test(choice)), item.id).toBe(false);
      expect(item.choiceRationales, item.id).toHaveLength(4);
      expect(item.choiceRationales.every((entry) => entry.trim().length >= 70), item.id).toBe(true);
      expect(item.rationale.length, item.id).toBeGreaterThanOrEqual(170);
      expect(item.editorialChecks, item.id).toEqual({
        scenarioBased: true,
        singleBestAnswer: true,
        parallelPlausibleOptions: true,
        noKeywordGiveaway: true,
        noAllOrNoneOption: true,
      });

      const optionWords = item.choices.map(countWords);
      const distractorWords = optionWords.filter((_, index) => index !== item.answerIndex);
      const distractorAverage = distractorWords.reduce((sum, count) => sum + count, 0) / distractorWords.length;
      const expectedExceptions = expectedQaExceptions[item.id] || {};
      if (optionWords[item.answerIndex] - distractorAverage > 3) {
        expect(expectedExceptions.keyedOptionLength, item.id + ' lacks an approved keyed-length exception').toBeTruthy();
        expect(item.qaExceptions?.keyedOptionLength, item.id).toBe(expectedExceptions.keyedOptionLength);
      } else {
        expect(item.qaExceptions?.keyedOptionLength, item.id).toBeUndefined();
      }

      const categoricalDistractors = item.choices.filter((choice, index) => index !== item.answerIndex && categoricalCuePattern.test(choice)).length;
      const keyHasCategoricalCue = categoricalCuePattern.test(item.choices[item.answerIndex]);
      if (categoricalDistractors >= 2 && !keyHasCategoricalCue) {
        expect(expectedExceptions.categoricalDistractors, item.id + ' lacks an approved categorical-cue exception').toBeTruthy();
        expect(item.qaExceptions?.categoricalDistractors, item.id).toBe(expectedExceptions.categoricalDistractors);
      } else {
        expect(item.qaExceptions?.categoricalDistractors, item.id).toBeUndefined();
      }
      expect(item.qaExceptions || {}, item.id).toEqual(expectedExceptions);
    }
    expect(pack.items.filter((item) => item.qaExceptions).map((item) => item.id).sort()).toEqual(Object.keys(expectedQaExceptions).sort());
  });

  it('provides a named authoritative source and credibility explanation for every URL', () => {
    for (const item of pack.items) {
      expect(item.references.includes(blueprintUrl), item.id).toBe(true);
      expect(item.references.length, item.id).toBeGreaterThanOrEqual(2);
      expect(item.sourceDetails, item.id).toHaveLength(item.references.length);
      for (const reference of item.references) {
        const source = item.sourceDetails.find((detail) => detail.url === reference);
        expect(source, `${item.id}: ${reference}`).toBeTruthy();
        expect(source.title.length, item.id).toBeGreaterThanOrEqual(20);
        expect(source.organization.length, item.id).toBeGreaterThanOrEqual(8);
        expect(source.credibility.length, item.id).toBeGreaterThanOrEqual(100);
      }
    }
    const sourceUrls = new Set(pack.items.flatMap((item) => item.references));
    expect(sourceUrls).toContain('https://www.bmj.com/content/335/7624/806');
    expect(sourceUrls).toContain('https://www.apa.org/about/policy/guidelines-psychological-assessment-evaluation.pdf');
    expect(sourceUrls).toContain('https://www.apa.org/about/policy/guidelines-assessment-intervention-disabilities.pdf');
    expect(sourceUrls).toContain('https://www.ftc.gov/business-guidance/resources/mobile-health-apps-interactive-tool');
    expect(sourceUrls).toContain('https://www.hhs.gov/hipaa/for-individuals/court-orders-subpoenas/index.html');
    expect(sourceUrls).toContain('https://www.hhs.gov/hipaa/for-professionals/faq/706/what-satisfactory-assurances-must-a-covered-entity-receive-before-it-responds-to-a-subpoena/index.html');
    expect(sourceUrls).not.toContain('https://www.bmj.com/content/340/bmj.c869');
    expect(sourceUrls).not.toContain('https://www.ada.gov/resources/testing-accommodations/');
  });

  it('is explicit that this is an unofficial future preview rather than a current or official form', () => {
    expect(pack).toMatchObject(expectedPresentationMetadata);
    expect(pack.title).toBe('Unofficial Integrated EPPP 2027 Blueprint Preview');
    expect(pack.shortTitle).toBe('2027 Blueprint Preview (Unofficial)');
    expect(pack.previewBadge).toBe('Unofficial');
    expect(pack.disclaimer).toMatch(/Unofficial/i);
    expect(pack.disclaimer).toMatch(/Not affiliated/i);
    expect(pack.disclaimer).toContain('future blueprint');
    expect(pack.disclaimer).toContain('current EPPP Part 1 and Part 2');
    expect(pack.disclaimer).toContain('2026 and 2027');
    expect(pack.items.every((item) => item.officialItem === false)).toBe(true);
    expect(pack.items.every((item) => !('legacySourceId' in item) && !('migrationStatus' in item))).toBe(true);
  });

  it('passes focused QA and keeps source and deployment artifacts byte-identical', () => {
    expect(report.summary).toMatchObject({
      totalItems: 20,
      passedItems: 20,
      reviewRequiredItems: 0,
      answerPositions: { A: 5, B: 5, C: 5, D: 5 },
      findings: 0,
      status: 'pass',
    });
    expect(report.items.every((item) => item.qaStatus === 'pass' && item.checks.every((check) => check.status === 'pass'))).toBe(true);
    expect(pack).toMatchObject(expectedBlueprintMetadata);
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
    expect(fs.readFileSync(resolve(process.cwd(), 'desktop/web-app/public/test_prep/eppp_2027_preview_qa.json'), 'utf8')).toBe(fs.readFileSync(reportPath, 'utf8'));
    expect(fs.readFileSync(resolve(process.cwd(), 'desktop/web-app/public/test_prep/eppp_2027_preview_qa.md'), 'utf8')).toBe(fs.readFileSync(resolve(process.cwd(), 'test_prep/eppp_2027_preview_qa.md'), 'utf8'));
  });
});
