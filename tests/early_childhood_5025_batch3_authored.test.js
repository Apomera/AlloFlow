import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const authoredPath = path.join(root, 'dev-tools', 'authored', 'early_childhood_5025_batch3.json');
const reviewPath = path.join(root, 'dev-tools', 'authored', 'early_childhood_5025_batch3.review.json');
const authoredBytes = fs.readFileSync(authoredPath);
const items = JSON.parse(authoredBytes.toString('utf8'));
const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
const pack = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'early_childhood_5025_pack.json'), 'utf8'));
const deployedPack = JSON.parse(fs.readFileSync(path.join(root, 'desktop/web-app', 'public', 'test_prep', 'early_childhood_5025_pack.json'), 'utf8'));
const standalone = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'early_childhood_5025_items.json'), 'utf8'));
const deployedStandalone = JSON.parse(fs.readFileSync(path.join(root, 'desktop/web-app', 'public', 'test_prep', 'early_childhood_5025_items.json'), 'utf8'));
const library = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'early_childhood_5025_learning_library.json'), 'utf8'));
const { corrections } = require('../dev-tools/early_childhood_5025/source_review_corrections.cjs');
const { warningCodes: projectWarningCodes } = require('../dev-tools/non_eppp_warning_checks.cjs');

const expectedDomains = {
  'language-literacy': 30,
  mathematics: 25,
  'social-studies': 14,
  science: 14,
  'health-physical-arts': 17,
};
const expectedCorrectionKeys = {
  'ec5025-b1-059': 2,
  'ec5025-b2-059': 2,
  'ec5025-b1-070': 1,
  'ec5025-b2-070': 1,
  'ec5025-b1-088': 3,
  'ec5025-b2-088': 3,
  'ec5025-b1-093': 0,
  'ec5025-b2-093': 0,
  'ec5025-b1-098': 1,
};
const canonical = (value) => String(value || '').toLowerCase().normalize('NFKD')
  .replace(/\+/g, ' plus ').replace(/[−–-]/g, ' minus ').replace(/=/g, ' equals ')
  .replace(/□/g, ' unknown ').replace(/[^a-z0-9]+/g, ' ').trim();
const responseKernel = (item) => item.choices.map(canonical).sort().join('|');
const tokenSet = (value) => new Set(canonical(value).split(' ').filter((token) => token.length > 3));

function flaggedWarningCodes(item) {
  const findings = [];
  const choices = item.choices;
  const key = choices[item.answerIndex];
  const lengths = choices.map((choice) => canonical(choice).length);
  const answerLength = lengths[item.answerIndex];
  const longestWrong = Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
  if (answerLength >= longestWrong + 20 && answerLength >= longestWrong * 1.75) findings.push('severe-answer-length-clue');
  const stem = tokenSet(item.prompt);
  const keyed = tokenSet(key);
  const distractors = choices.filter((_, index) => index !== item.answerIndex).map(tokenSet);
  if ([...stem].some((token) => keyed.has(token) && distractors.every((set) => !set.has(token)))) findings.push('key-stem-lexical-leakage');
  const extreme = /\b(?:always|never|only|entirely|completely|guarantees?|immediately|automatically|all students|no students)\b/i;
  if (choices.filter((choice, index) => index !== item.answerIndex && extreme.test(choice)).length >= 2 && !extreme.test(key)) {
    findings.push('asymmetric-extreme-distractors');
  }
  const normalizedKey = canonical(key);
  for (let index = 0; index < item.choiceRationales.length; index++) {
    if (index !== item.answerIndex && normalizedKey.length >= 25 && canonical(item.choiceRationales[index]).includes(normalizedKey)) {
      findings.push('incorrect-option-full-key-echo');
    }
  }
  return [...new Set(findings)];
}

describe('Early Childhood Education 5025 assistant-authored Batch 3', () => {
  it('contains exactly 100 independent items with the exact diagnostic blueprint and key balance', () => {
    expect(items).toHaveLength(100);
    expect(items.map((item) => item.id)).toEqual(Array.from({ length: 100 }, (_, index) => `ec5025-b3-${String(index + 1).padStart(3, '0')}`));
    expect(Object.fromEntries(Object.keys(expectedDomains).map((domainId) => [domainId, items.filter((item) => item.domainId === domainId).length]))).toEqual(expectedDomains);
    expect([0, 1, 2, 3].map((key) => items.filter((item) => item.answerIndex === key).length)).toEqual([25, 25, 25, 25]);
  });

  it('uses complete authored-item metadata, learning links, named HTTPS sources, and substantive feedback', () => {
    const skills = new Map(library.skills.map((skill) => [skill.id, skill]));
    const chapters = new Map(library.chapters.map((chapter) => [chapter.id, chapter]));
    for (const item of items) {
      expect(item.type).toBe('single-choice');
      expect(item.authorship).toBe('assistant-authored-independent');
      expect(item.sourceItemId).toBeUndefined();
      expect(item.reviewStatus).toBe('assistant-reviewed-independent-draft');
      expect(item.qaStatus).toBe('pending-integrated-qa');
      expect(item.difficulty).toMatch(/^(developing|application|analysis)$/);
      expect(item.cognitiveLevel).toMatch(/^(understand|apply|analyze)$/);
      expect(item.choices).toHaveLength(4);
      expect(new Set(item.choices.map(canonical)).size).toBe(4);
      expect(item.rationale.length).toBeGreaterThanOrEqual(80);
      expect(item.choiceRationales).toHaveLength(4);
      item.choiceRationales.forEach((feedback) => expect(feedback.length).toBeGreaterThanOrEqual(40));
      expect(item.skillIds).toHaveLength(1);
      expect(item.chapterIds).toHaveLength(1);
      const skill = skills.get(item.skillIds[0]);
      expect(skill.domainId).toBe(item.domainId);
      expect(skill.chapterId).toBe(item.chapterIds[0]);
      expect(chapters.has(item.chapterIds[0])).toBe(true);
      expect(item.references.length).toBe(item.referenceNames.length);
      expect(item.references.every((reference) => reference.startsWith('https://'))).toBe(true);
      expect(item.referenceNames.every((name) => name.length >= 20)).toBe(true);
    }
  });

  it('is structurally distinct from the released 5025 activities and internally unique', () => {
    const releasedPrompts = new Set(pack.items.slice(0, 200).map((item) => canonical(item.prompt)));
    const releasedKernels = new Set(pack.items.slice(0, 200).map(responseKernel));
    expect(new Set(items.map((item) => canonical(item.prompt))).size).toBe(100);
    expect(new Set(items.map(responseKernel)).size).toBe(100);
    items.forEach((item) => {
      expect(releasedPrompts.has(canonical(item.prompt))).toBe(false);
      expect(releasedKernels.has(responseKernel(item))).toBe(false);
    });
  });

  it('clears high-risk wording cues and keeps the receptive-vocabulary item semantically aligned', () => {
    for (const item of items) {
      expect(projectWarningCodes(item).filter((code) => code !== 'incorrect-option-feedback-detail')).toEqual([]);
    }
    const receptive = items.find((item) => item.id === 'ec5025-b3-002');
    expect(receptive.prompt).toMatch(/picture of a dog/i);
    expect(receptive.choices[receptive.answerIndex]).toMatch(/receptive understanding/i);
    expect(receptive.choiceRationales[2]).toMatch(/no printed word was presented/i);
  });

  it('has an exact SHA-256-bound independent review artifact with no blockers', () => {
    expect(review.reviewedFile).toBe('dev-tools/authored/early_childhood_5025_batch3.json');
    expect(review.reviewedAt).toBe('2026-07-18');
    expect(review.reviewer).toContain('OpenAI Codex independent cross-review');
    expect(review.itemCount).toBe(100);
    expect(review.verdict).toMatch(/^pass/i);
    expect(review.blockers).toEqual([]);
    expect(review.correctionsMade.length).toBeGreaterThanOrEqual(5);
    expect(review.checks.warningHeuristicReview).toMatchObject({ status: 'pass', highRiskWarningsRemaining: 0 });
    expect(Object.values(review.checks).every((check) => check.status === 'pass')).toBe(true);
    expect(review.artifactBinding).toEqual({
      algorithm: 'sha256',
      sha256: crypto.createHash('sha256').update(authoredBytes).digest('hex'),
    });
  });
});

describe('Early Childhood Education 5025 score-4 source corrections', () => {
  it('defines exactly nine corrections, preserves their keys, and clears all four flagged warning codes', () => {
    expect(Object.keys(corrections)).toHaveLength(9);
    expect(Object.keys(corrections).sort()).toEqual(Object.keys(expectedCorrectionKeys).sort());
    for (const [id, expectedKey] of Object.entries(expectedCorrectionKeys)) {
      const item = pack.items.find((candidate) => candidate.id === id);
      expect(item.answerIndex).toBe(expectedKey);
      expect(item).toMatchObject(corrections[id]);
      expect(flaggedWarningCodes(item)).toEqual([]);
    }
  });

  it('keeps corrected current source, standalone, and deployment artifacts synchronized', () => {
    for (const id of Object.keys(corrections)) {
      const variants = [pack.items, deployedPack.items, standalone, deployedStandalone]
        .map((collection) => collection.find((item) => item.id === id));
      expect(variants.every(Boolean)).toBe(true);
      expect(variants.slice(1)).toEqual([variants[0], variants[0], variants[0]]);
    }
  });
});
