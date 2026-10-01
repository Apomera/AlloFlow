import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const authoredPath = path.join(root, 'dev-tools', 'authored', 'educational_leadership_5412_batch3.json');
const reviewPath = path.join(root, 'dev-tools', 'authored', 'educational_leadership_5412_batch3.review.json');
const authoredBytes = fs.readFileSync(authoredPath);
const items = JSON.parse(authoredBytes.toString('utf8'));
const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
const pack = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'educational_leadership_5412_pack.json'), 'utf8'));
const library = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'educational_leadership_5412_learning_library.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'reference_catalog.json'), 'utf8'));
const { contentKernel, responseKernel, warningCodes } = require('../dev-tools/authored/build_educational_leadership_5412_batch3.cjs');

const expectedDomains = {
  'strategic-leadership': 17,
  'instructional-leadership': 23,
  'climate-cultural-leadership': 18,
  'ethical-leadership': 16,
  'organizational-leadership': 13,
  'community-engagement-leadership': 13,
};

const expectedSkills = {
  'mission-vision-goals-core-values': 9,
  'continuous-improvement-change-strategy': 8,
  'professional-capacity-feedback-learning': 12,
  'curriculum-instruction-assessment-accountability': 11,
  'inclusive-community-belonging-student-support': 9,
  'culture-collaboration-conflict-wellbeing': 9,
  'ethics-professional-norms-equity-decisions': 8,
  'law-rights-due-process-privacy': 8,
  'operations-budget-resources-technology': 7,
  'personnel-safety-crisis-continuity': 6,
  'family-engagement-communication-partnerships': 7,
  'community-advocacy-governance-accountability': 6,
};

const canonical = (value) => String(value || '').normalize('NFKD').toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ').trim();

describe('Praxis Educational Leadership 5412 assistant-authored Batch 3', () => {
  it('contains exactly 100 items at the released 17/23/18/16/13/13 blueprint with 25 keys per position', () => {
    expect(items).toHaveLength(100);
    expect(items.map((item) => item.id)).toEqual(Array.from(
      { length: 100 },
      (_, index) => `lead5412-b3-${String(index + 1).padStart(3, '0')}`,
    ));
    expect(Object.fromEntries(Object.keys(expectedDomains).map((domainId) => [
      domainId,
      items.filter((item) => item.domainId === domainId).length,
    ]))).toEqual(expectedDomains);
    expect(Object.fromEntries(Object.keys(expectedSkills).map((skillId) => [
      skillId,
      items.filter((item) => item.skillIds[0] === skillId).length,
    ]))).toEqual(expectedSkills);
    expect([0, 1, 2, 3].map((answerIndex) =>
      items.filter((item) => item.answerIndex === answerIndex).length)).toEqual([25, 25, 25, 25]);
  });

  it('provides complete credential-specific feedback, metadata, named catalog sources, and valid learning links', () => {
    const skills = new Map(library.skills.map((skill) => [skill.id, skill]));
    const chapters = new Map(library.chapters.map((chapter) => [chapter.id, chapter]));
    for (const item of items) {
      expect(item).toMatchObject({
        type: 'single-choice',
        authorship: 'assistant-authored-independent',
        editorialReviewer: 'OpenAI Codex',
        assistantReviewStatus: 'reviewed-independent-draft',
        examItemStatus: 'assistant-reviewed-independent-draft',
        reviewStatus: 'assistant-reviewed-independent-draft',
        qaStatus: 'pending-integrated-qa',
        authoredAt: '2026-07-18',
      });
      expect(item.sourceItemId).toBeUndefined();
      expect(item.prompt.length).toBeGreaterThanOrEqual(70);
      expect(item.rationale.length).toBeGreaterThanOrEqual(180);
      expect(item.choices).toHaveLength(4);
      expect(new Set(item.choices.map(canonical)).size).toBe(4);
      expect(item.choiceRationales).toHaveLength(4);
      expect(item.choiceRationales.every((feedback) => feedback.length >= 100)).toBe(true);
      expect(item.choiceRationales[item.answerIndex]).toMatch(/^Correct\./);
      expect(item.choiceRationales.filter((_, index) => index !== item.answerIndex)
        .every((feedback) => /^Not the best answer\./.test(feedback))).toBe(true);
      expect(item.references).toContain('https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5412.pdf');
      expect(item.references).toHaveLength(item.referenceNames.length);
      expect(item.references.every((url) => Boolean(catalog[url]))).toBe(true);
      expect(item.referenceNames.every((name) => name.length >= 15)).toBe(true);
      expect(item.difficulty.length).toBeGreaterThan(0);
      expect(item.cognitiveLevel.length).toBeGreaterThan(0);
      expect(item.skillIds).toHaveLength(1);
      expect(item.chapterIds).toHaveLength(1);
      const skill = skills.get(item.skillIds[0]);
      const chapter = chapters.get(item.chapterIds[0]);
      expect(skill).toMatchObject({ domainId: item.domainId, chapterId: item.chapterIds[0] });
      expect(chapter).toMatchObject({ domainId: item.domainId, skillId: item.skillIds[0] });
    }
  });

  it('has unique prompts, response kernels, and content kernels against the released 200-question source layer', () => {
    const source = pack.items.slice(0, 200);
    const sourcePrompts = new Set(source.map((item) => canonical(item.prompt)));
    const sourceResponses = new Set(source.map(responseKernel));
    const sourceContents = new Set(source.map(contentKernel));
    expect(new Set(items.map((item) => canonical(item.prompt))).size).toBe(100);
    expect(new Set(items.map(responseKernel)).size).toBe(100);
    expect(new Set(items.map(contentKernel)).size).toBe(100);
    for (const item of items) {
      expect(sourcePrompts.has(canonical(item.prompt)), item.id).toBe(false);
      expect(sourceResponses.has(responseKernel(item)), item.id).toBe(false);
      expect(sourceContents.has(contentKernel(item)), item.id).toBe(false);
    }
    expect(review.checks.independentAuthorshipAndOriginality.maximumPromptTokenJaccardAgainstReleasedSource)
      .toBeLessThanOrEqual(0.82);
  });

  it('clears severe answer-length and asymmetric-extreme warnings, including the three corrected response sets', () => {
    for (const item of items) {
      expect(warningCodes(item).filter((code) => code !== 'key-stem-lexical-overlap-advisory'), item.id)
        .toEqual([]);
    }
    for (const itemNumber of [30, 68, 82]) {
      const item = items[itemNumber - 1];
      expect(warningCodes(item), item.id).not.toContain('severe-answer-length-clue');
      expect(warningCodes(item), item.id).not.toContain('asymmetric-extreme-distractors');
      expect(item.answerIndex).toBe((itemNumber - 1) % 4);
    }
  });

  it('keeps legal, privacy, emergency, cyber, and family-engagement items tied to authoritative released sources', () => {
    const bySkill = (skillId) => items.filter((item) => item.skillIds[0] === skillId);
    const expectedSources = {
      'law-rights-due-process-privacy': [
        'https://studentprivacy.ed.gov/faq/who-school-official-under-ferpa',
        'https://sites.ed.gov/idea/regs/b/d/300.304',
        'https://www.ed.gov/laws-and-policy/civil-rights-laws',
      ],
      'operations-budget-resources-technology': [
        'https://www.cisa.gov/resources-tools/resources/report-protecting-our-future',
      ],
      'personnel-safety-crisis-continuity': [
        'https://www.ed.gov/teaching-and-administration/safe-learning-environments/school-safety-and-security/emergency-planning',
      ],
      'family-engagement-communication-partnerships': [
        'https://www.ed.gov/teaching-and-administration/lead-and-manage-my-school/state-support-network/ssn-resources/strategies-for-equitable-family-engagement',
      ],
    };
    for (const [skillId, urls] of Object.entries(expectedSources)) {
      expect(bySkill(skillId).length).toBe(expectedSkills[skillId]);
      for (const item of bySkill(skillId)) {
        for (const url of urls) expect(item.references, item.id).toContain(url);
      }
    }
  });

  it('has exact manifest-v2-compatible SHA-256 review evidence with all 100 keys manually reviewed', () => {
    expect(review).toMatchObject({
      reviewedFile: 'dev-tools/authored/educational_leadership_5412_batch3.json',
      reviewedAt: '2026-07-18',
      reviewer: 'OpenAI Codex independent cross-review',
      itemCount: 100,
      blockers: [],
      integration: {
        packId: 'praxis-educational-leadership-5412',
        batchNumber: 3,
        expectedInsertionTier: 'assistant-authored-independent',
        expectedDiagnosticBankSize: 100,
        manifestSchemaVersion: 2,
        reviewEvidenceProfile: 'hash-bound-independent-cross-review-v1',
      },
    });
    expect(review.verdict).toMatch(/^pass/i);
    expect(review.correctionsMade).toHaveLength(2);
    expect(Object.values(review.checks).every((check) => check.status === 'pass')).toBe(true);
    expect(review.checks.lineByLineCredentialReview.reviewedItemIds).toEqual(items.map((item) => item.id));
    expect(review.checks.keysDistractorsAndFeedback.keysReviewed).toBe(100);
    expect(review.artifactBinding).toEqual({
      algorithm: 'sha256',
      sha256: crypto.createHash('sha256').update(authoredBytes).digest('hex'),
    });
  });
});
