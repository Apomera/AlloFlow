import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const authoredPath = path.join(root, 'dev-tools', 'authored', 'school_counselor_5422_batch3.json');
const reviewPath = path.join(root, 'dev-tools', 'authored', 'school_counselor_5422_batch3.review.json');
const authoredBytes = fs.readFileSync(authoredPath);
const items = JSON.parse(authoredBytes.toString('utf8'));
const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
const pack = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'school_counselor_5422_pack.json'), 'utf8'));
const library = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'school_counselor_5422_learning_library.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'reference_catalog.json'), 'utf8'));
const { canonical, tokenSet, warningCodes } = require('../dev-tools/non_eppp_warning_checks.cjs');

const specs = [
  ...require('../dev-tools/authored/school_counselor_5422_batch3_define_individual.cjs'),
  ...require('../dev-tools/authored/school_counselor_5422_batch3_deliver_team.cjs'),
  ...require('../dev-tools/authored/school_counselor_5422_batch3_manage.cjs'),
  ...require('../dev-tools/authored/school_counselor_5422_batch3_assess.cjs'),
];

const expectedDomains = { define: 25, deliver: 40, manage: 20, assess: 15 };
const expectedSkills = {
  'counselor-role-national-model': 8,
  'development-learning-family-systems': 8,
  'ethics-law-equity-wellness': 9,
  'individual-counseling-academic-career': 14,
  'group-classroom-crisis-prevention': 13,
  'consultation-collaboration-mtss-referrals': 13,
  'program-foundations-alignment': 7,
  'program-goals-data-psychometrics': 7,
  'program-operations-technology-resources': 6,
  'program-assessment-implementation': 5,
  'results-data-interpretation-reporting': 5,
  'continuous-improvement-advocacy': 5,
};

const countBy = (values) => values.reduce((counts, value) => {
  counts[value] = (counts[value] || 0) + 1;
  return counts;
}, {});
const responseKernel = (item) => item.choices.map(canonical).sort().join('|');
const contentKernel = (item) => `${canonical(item.prompt)}::${responseKernel(item)}`;
const jaccard = (left, right) => {
  const a = tokenSet(left);
  const b = tokenSet(right);
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
};

describe('Praxis School Counselor 5422 assistant-authored Batch 3', () => {
  it('contains 100 items at the exact 25/40/20/15 blueprint with balanced keys', () => {
    expect(items).toHaveLength(100);
    expect(specs).toHaveLength(100);
    expect(items.map((item) => item.id)).toEqual(Array.from(
      { length: 100 },
      (_, index) => `sc5422-b3-${String(index + 1).padStart(3, '0')}`,
    ));
    expect(countBy(items.map((item) => item.domainId))).toEqual(expectedDomains);
    expect(countBy(items.map((item) => item.skillIds[0]))).toEqual(expectedSkills);
    expect([0, 1, 2, 3].map((index) => items.filter((item) => item.answerIndex === index).length))
      .toEqual([25, 25, 25, 25]);
  });

  it('preserves every reviewed key and misconception-specific distractor explanation', () => {
    const specsBySkill = new Map();
    for (const spec of specs) {
      if (!specsBySkill.has(spec.skillId)) specsBySkill.set(spec.skillId, []);
      specsBySkill.get(spec.skillId).push(spec);
    }
    const orderedSpecs = library.skills.flatMap((skill) => specsBySkill.get(skill.id) || []);
    expect(orderedSpecs).toHaveLength(100);
    items.forEach((item, index) => {
      const spec = orderedSpecs[index];
      expect(item.answerIndex).toBe(index % 4);
      expect(item.choices[item.answerIndex], item.id).toBe(spec.correct);
      expect(item.choices.filter((_, choiceIndex) => choiceIndex !== item.answerIndex), item.id)
        .toEqual(spec.distractors.map((entry) => entry.text));
      expect(item.rationale, item.id).toBe(spec.rationale);
      expect(spec.distractors.every((entry) => entry.reason.length >= 55), item.id).toBe(true);
    });
  });

  it('provides complete feedback, compatible learning links, and exact catalog source titles', () => {
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
      });
      expect(item.sourceItemId).toBeUndefined();
      expect(item.prompt.length).toBeGreaterThanOrEqual(70);
      expect(item.rationale.length).toBeGreaterThanOrEqual(120);
      expect(item.choices).toHaveLength(4);
      expect(new Set(item.choices.map(canonical)).size).toBe(4);
      expect(item.choiceRationales).toHaveLength(4);
      expect(item.choiceRationales.every((feedback) => feedback.length >= 100)).toBe(true);
      expect(item.references).toContain('https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/dw1272f63e/pdfs/5422.pdf');
      expect(item.references.length).toBe(item.referenceNames.length);
      item.references.forEach((url, sourceIndex) => {
        expect(catalog[url], `${item.id}: ${url}`).toBeDefined();
        expect(item.referenceNames[sourceIndex], item.id).toBe(catalog[url].title);
      });
      const skill = skills.get(item.skillIds[0]);
      const chapter = chapters.get(item.chapterIds[0]);
      expect(skill).toMatchObject({ domainId: item.domainId, chapterId: item.chapterIds[0] });
      expect(chapter).toMatchObject({ domainId: item.domainId, skillId: item.skillIds[0] });
    }
  });

  it('is internally unique and independently distinct from all 200 released source questions', () => {
    const sourceItems = pack.items.slice(0, 200);
    expect(new Set(items.map((item) => canonical(item.prompt))).size).toBe(100);
    expect(new Set(items.map(responseKernel)).size).toBe(100);
    expect(new Set(items.map(contentKernel)).size).toBe(100);
    const sourcePrompts = new Set(sourceItems.map((item) => canonical(item.prompt)));
    const sourceResponses = new Set(sourceItems.map(responseKernel));
    items.forEach((item) => {
      expect(sourcePrompts.has(canonical(item.prompt)), item.id).toBe(false);
      expect(sourceResponses.has(responseKernel(item)), item.id).toBe(false);
    });
    const maximumSimilarity = Math.max(...items.flatMap((item) =>
      sourceItems.map((source) => jaccard(item.prompt, source.prompt))));
    expect(maximumSimilarity).toBeLessThan(0.82);
    expect(Number(maximumSimilarity.toFixed(4)))
      .toBe(review.checks.independentAuthorshipAndOriginality.maximumPromptTokenJaccardAgainstReleasedSource200);
  });

  it('has no actionable shared warning findings and controls the batch-level answer-length clue', () => {
    const warnings = items.flatMap((item) => warningCodes(item)
      .filter((code) => code !== 'key-stem-lexical-leakage')
      .map((code) => ({ id: item.id, code })));
    expect(warnings).toEqual([]);
    const keyedLongestOrTied = items.filter((item) => {
      const lengths = item.choices.map((choice) => canonical(choice).length);
      return lengths[item.answerIndex] >= Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
    });
    expect(keyedLongestOrTied.length).toBeLessThanOrEqual(35);
    expect(review.checks.warningHeuristicReview).toMatchObject({
      status: 'pass',
      actionableWarningsRemaining: 0,
    });
    expect(review.checks.answerLengthBalance).toMatchObject({
      status: 'pass',
      keyedLongestOrTiedCount: keyedLongestOrTied.length,
      maximumAllowedKeyedLongestOrTiedCount: 35,
    });
  });

  it('ships an exact SHA-256-bound independent cross-review handoff', () => {
    expect(review).toMatchObject({
      reviewedFile: 'dev-tools/authored/school_counselor_5422_batch3.json',
      reviewedAt: '2026-07-19',
      reviewer: 'OpenAI Codex independent cross-review',
      itemCount: 100,
      blockers: [],
    });
    expect(review.verdict).toMatch(/^pass/i);
    expect(Object.values(review.checks).every((check) => check.status === 'pass')).toBe(true);
    expect(review.checks.lineByLineCredentialReview.reviewedItemIds).toEqual(items.map((item) => item.id));
    expect(review.checks.keysDistractorsAndFeedback).toMatchObject({
      keysReviewed: 100,
      distractorsReviewed: 300,
      unresolvedWrongKeys: 0,
      unresolvedMultipleCorrectChoices: 0,
      unresolvedGenericFeedback: 0,
    });
    expect(review.artifactBinding).toEqual({
      algorithm: 'sha256',
      sha256: crypto.createHash('sha256').update(authoredBytes).digest('hex'),
    });
    expect(review.integration).toMatchObject({
      packId: 'praxis-school-counselor-5422',
      batchNumber: 3,
      expectedInsertionTier: 'assistant-authored-independent',
      expectedDiagnosticBankSize: 100,
      manifestSchemaVersion: 2,
    });
  });
});
