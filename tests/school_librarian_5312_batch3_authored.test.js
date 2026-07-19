import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const authoredPath = path.join(root, 'dev-tools', 'authored', 'school_librarian_5312_batch3.json');
const reviewPath = path.join(root, 'dev-tools', 'authored', 'school_librarian_5312_batch3.review.json');
const authoredBytes = fs.readFileSync(authoredPath);
const items = JSON.parse(authoredBytes.toString('utf8'));
const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
const pack = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'school_librarian_5312_pack.json'), 'utf8'));
const library = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'school_librarian_5312_learning_library.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'reference_catalog.json'), 'utf8'));
const { canonical, tokenSet, warningCodes } = require('../dev-tools/non_eppp_warning_checks.cjs');
const corrections = require('../dev-tools/authored/school_librarian_5312_batch3/review_corrections.cjs');
const specs = [
  ...require('../dev-tools/authored/school_librarian_5312_batch3/program_administration.cjs'),
  ...require('../dev-tools/authored/school_librarian_5312_batch3/organization_access.cjs'),
  ...require('../dev-tools/authored/school_librarian_5312_batch3/information_access.cjs'),
  ...require('../dev-tools/authored/school_librarian_5312_batch3/teaching_learning.cjs'),
  ...require('../dev-tools/authored/school_librarian_5312_batch3/leadership_advocacy.cjs'),
].map((spec, index) => corrections.applyReviewCorrections(
  spec,
  `sl5312-b3-${String(index + 1).padStart(3, '0')}`,
));

const expectedDomains = {
  'program-administration': 20,
  'organization-access': 19,
  'information-access-learning-environment': 20,
  'teaching-learning': 29,
  'professional-development-leadership-advocacy': 12,
};
const expectedSkills = {
  'program-administration-01': 10,
  'program-administration-02': 10,
  'organization-access-01': 10,
  'organization-access-02': 9,
  'information-access-learning-environment-01': 11,
  'information-access-learning-environment-02': 9,
  'teaching-learning-01': 7,
  'teaching-learning-02': 8,
  'teaching-learning-03': 7,
  'teaching-learning-04': 7,
  'professional-development-leadership-advocacy-01': 6,
  'professional-development-leadership-advocacy-02': 6,
};

const responseKernel = (item) => item.choices.map(canonical).sort().join('|');
const contentKernel = (item) => `${canonical(item.prompt)}::${responseKernel(item)}`;
const jaccard = (left, right) => {
  const a = tokenSet(left);
  const b = tokenSet(right);
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
};

describe('Praxis School Librarian 5312 assistant-authored Batch 3', () => {
  it('contains exactly 100 items at the released 20/19/20/29/12 blueprint with exact key balance', () => {
    expect(items).toHaveLength(100);
    expect(specs).toHaveLength(100);
    expect(items.map((item) => item.id)).toEqual(Array.from(
      { length: 100 },
      (_, index) => `sl5312-b3-${String(index + 1).padStart(3, '0')}`,
    ));
    expect(Object.fromEntries(Object.keys(expectedDomains).map((domainId) => [
      domainId,
      items.filter((item) => item.domainId === domainId).length,
    ]))).toEqual(expectedDomains);
    expect(Object.fromEntries(Object.keys(expectedSkills).map((skillId) => [
      skillId,
      items.filter((item) => item.skillIds[0] === skillId).length,
    ]))).toEqual(expectedSkills);
    expect([0, 1, 2, 3].map((answerIndex) => items.filter((item) => item.answerIndex === answerIndex).length))
      .toEqual([25, 25, 25, 25]);
  });

  it('preserves every manually reviewed key and all 300 reviewed distractors from the corrected specs', () => {
    items.forEach((item, index) => {
      const spec = specs[index];
      expect(item.answerIndex).toBe(index % 4);
      expect(item.choices[item.answerIndex], item.id).toBe(spec.correct);
      expect(item.choices.filter((_, choiceIndex) => choiceIndex !== item.answerIndex), item.id)
        .toEqual(spec.distractors);
      expect(item.choiceRationales[item.answerIndex], item.id).toBe(`Correct. ${spec.rationale}`);
      expect(item.rationale, item.id).toBe(spec.rationale);
    });
  });

  it('provides complete item-specific feedback, compatible learning links, and exact catalog source titles', () => {
    const skills = new Map(library.skills.map((skill) => [skill.id, skill]));
    const chapters = new Map(library.chapters.map((chapter) => [chapter.id, chapter]));
    for (const item of items) {
      expect(item).toMatchObject({
        type: 'single-choice',
        authorship: 'assistant-authored-independent',
        editorialReviewer: 'OpenAI Codex',
        reviewStatus: 'assistant-reviewed-independent-draft',
        qaStatus: 'pending-integrated-qa',
      });
      expect(item.sourceItemId).toBeUndefined();
      expect(item.prompt.length).toBeGreaterThanOrEqual(70);
      expect(item.choices).toHaveLength(4);
      expect(new Set(item.choices.map(canonical)).size).toBe(4);
      expect(item.rationale.length).toBeGreaterThanOrEqual(150);
      expect(item.choiceRationales).toHaveLength(4);
      expect(item.choiceRationales.every((feedback) => feedback.length >= 100)).toBe(true);
      expect(['application', 'analysis']).toContain(item.difficulty);
      expect(['apply', 'analyze', 'evaluate']).toContain(item.cognitiveLevel);
      expect(item.references).toContain('https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5312.pdf');
      expect(item.references.length).toBe(item.referenceNames.length);
      item.references.forEach((url, sourceIndex) => {
        expect(url.startsWith('https://')).toBe(true);
        expect(catalog[url], `${item.id}: ${url}`).toBeDefined();
        expect(item.referenceNames[sourceIndex], item.id).toBe(catalog[url].title);
      });
      expect(item.skillIds).toHaveLength(1);
      expect(item.chapterIds).toHaveLength(1);
      const skill = skills.get(item.skillIds[0]);
      const chapter = chapters.get(item.chapterIds[0]);
      expect(skill).toMatchObject({ domainId: item.domainId, chapterId: item.chapterIds[0] });
      expect(chapter).toMatchObject({ domainId: item.domainId, skillId: item.skillIds[0] });
    }
  });

  it('is internally unique and independently distinct from every released source-layer item', () => {
    const source200 = pack.items.slice(0, 200);
    const sourcePrompts = new Set(source200.map((item) => canonical(item.prompt)));
    const sourceResponseKernels = new Set(source200.map(responseKernel));
    const sourceContentKernels = new Set(source200.map(contentKernel));
    expect(new Set(items.map((item) => canonical(item.prompt))).size).toBe(100);
    expect(new Set(items.map(responseKernel)).size).toBe(100);
    expect(new Set(items.map(contentKernel)).size).toBe(100);
    items.forEach((item) => {
      expect(sourcePrompts.has(canonical(item.prompt)), item.id).toBe(false);
      expect(sourceResponseKernels.has(responseKernel(item)), item.id).toBe(false);
      expect(sourceContentKernels.has(contentKernel(item)), item.id).toBe(false);
    });
    const maximumSimilarity = Math.max(...items.flatMap((item) => source200.map((source) => jaccard(item.prompt, source.prompt))));
    expect(maximumSimilarity).toBeLessThan(0.8);
    expect(Number(maximumSimilarity.toFixed(4)))
      .toBe(review.checks.independentAuthorshipAndOriginality.maximumPromptTokenJaccardAgainstReleasedSource200);
  });

  it('clears every shared non-EPPP clue, extreme-choice, and feedback warning', () => {
    items.forEach((item) => expect(warningCodes(item), item.id).toEqual([]));
    expect(review.checks.warningHeuristicReview).toMatchObject({
      status: 'pass',
      highRiskWarningsRemaining: 0,
      remainingNonblockingCounts: {},
      remainingNonblockingItemIds: [],
    });
  });

  it('removes the cross-item longest-answer clue without moving any keyed position', () => {
    const keyedLongestOrTied = items.filter((item) => {
      const lengths = item.choices.map((choice) => canonical(choice).length);
      return lengths[item.answerIndex] >= Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
    });
    expect(keyedLongestOrTied).toHaveLength(26);
    expect(review.checks.answerLengthBalance).toEqual({
      status: 'pass',
      keyedLongestOrTiedCount: 26,
      nonKeyedStrictlyLongerCount: 74,
      maximumAllowedKeyedLongestOrTiedCount: 30,
      originalKeyedLongestOrTiedCount: 96,
      keyPositionsChanged: 0,
    });
    expect(review.checks.credentialScopeAccessibilityAndBias).toMatchObject({
      status: 'pass',
      schoolLibrarianRoleBoundariesReviewed: 100,
      unresolvedLegalOrPolicyOverclaims: 0,
      unresolvedStereotypeOrDeficitFraming: 0,
      unresolvedLearnerPrivacyOrDignityHarmsInKeys: 0,
      unresolvedInaccessibleRequiredResponseModesInKeys: 0,
    });
  });

  it('ships an exact SHA-256-bound manifest-v2 review handoff without mutating shared release files', () => {
    expect(review.reviewedFile).toBe('dev-tools/authored/school_librarian_5312_batch3.json');
    expect(review.reviewedAt).toBe('2026-07-19');
    expect(review.reviewer).toContain('OpenAI Codex independent cross-review');
    expect(review.itemCount).toBe(100);
    expect(review.verdict).toMatch(/^pass/i);
    expect(review.blockers).toEqual([]);
    expect(Object.values(review.checks).every((check) => check.status === 'pass')).toBe(true);
    expect(review.checks.lineByLineItemReview.reviewedItemIds).toEqual(items.map((item) => item.id));
    expect(review.checks.keysDistractorsAndFeedback).toMatchObject({
      keysReviewed: 100,
      distractorsReviewed: 300,
      unresolvedWrongKeys: 0,
      unresolvedMultipleCorrectChoices: 0,
    });
    expect(review.artifactBinding).toEqual({
      algorithm: 'sha256',
      sha256: crypto.createHash('sha256').update(authoredBytes).digest('hex'),
    });
    expect(review.integration).toMatchObject({
      packId: 'praxis-school-librarian-5312',
      batchNumber: 3,
      expectedInsertionTier: 'assistant-authored-independent',
      expectedDiagnosticBankSize: 100,
      manifestSchemaVersion: 2,
      sourceBuilderMutated: false,
      sharedManifestMutated: false,
      sharedExpansionScriptMutated: false,
      releaseBuilderMutated: false,
      releasedPackMutated: false,
      expectedManifestEntry: {
        id: 'independent-diagnostic-batch-3',
        expectedPackId: 'praxis-school-librarian-5312',
        reviewEvidenceProfile: 'hash-bound-independent-cross-review-v1',
        files: ['school_librarian_5312_batch3.json'],
        reviewReports: ['school_librarian_5312_batch3.review.json'],
      },
    });
  });
});
