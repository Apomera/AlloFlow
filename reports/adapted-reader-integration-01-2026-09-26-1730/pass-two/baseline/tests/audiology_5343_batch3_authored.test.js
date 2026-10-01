import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const authoredPath = path.join(root, 'dev-tools', 'authored', 'audiology_5343_batch3.json');
const reviewPath = path.join(root, 'dev-tools', 'authored', 'audiology_5343_batch3.review.json');
const authoredBytes = fs.readFileSync(authoredPath);
const items = JSON.parse(authoredBytes.toString('utf8'));
const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
const pack = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'audiology_5343_pack.json'), 'utf8'));
const library = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'audiology_5343_learning_library.json'), 'utf8'));
const skillBanks = require('../dev-tools/audiology_5343/item_content.cjs');
const { corrections, expectedAnswerIndices } = require('../dev-tools/audiology_5343/source_review_corrections.cjs');

const expectedDomains = {
  'foundations-audiology': 20,
  'prevention-screening': 10,
  assessment: 35,
  intervention: 25,
  'professional-ethical': 10,
};
const expectedSkills = {
  'auditory-anatomy-acoustics': 10,
  'psychoacoustics-development': 10,
  'hearing-prevention-conservation': 5,
  'screening-ehdi-school': 5,
  'behavioral-audiologic-assessment': 9,
  'immittance-oae-electrophysiology': 9,
  'vestibular-tinnitus-apd-assessment': 8,
  'integrated-pediatric-diagnostic': 9,
  'hearing-aid-selection-verification': 9,
  'implants-assistive-technology': 8,
  'audiologic-rehabilitation-education': 8,
  'professional-ethical-evidence-practice': 10,
};
const expectedCorrectionKeys = {
  'aud5343-b1-006': 1,
  'aud5343-b1-013': 0,
  'aud5343-b1-030': 1,
  'aud5343-b1-046': 1,
  'aud5343-b1-058': 1,
  'aud5343-b2-006': 1,
  'aud5343-b2-025': 0,
  'aud5343-b2-046': 1,
  'aud5343-b2-058': 1,
  'aud5343-b2-077': 0,
};

const canonical = (value) => String(value || '').normalize('NFKD').toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ').trim();
const tokenSet = (value) => new Set(canonical(value).split(' ').filter((token) => token.length > 3));
const responseKernel = (item) => item.choices.map(canonical).sort().join('|');

function warningCodes(item) {
  const findings = [];
  const lengths = item.choices.map((choice) => canonical(choice).length);
  const keyedLength = lengths[item.answerIndex];
  const longestDistractor = Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
  if (keyedLength >= longestDistractor + 20 && keyedLength >= longestDistractor * 1.5) findings.push('severe-answer-length-clue');
  const stem = tokenSet(item.prompt);
  const keyed = tokenSet(item.choices[item.answerIndex]);
  const distractors = item.choices.filter((_, index) => index !== item.answerIndex).map(tokenSet);
  if ([...stem].some((token) => keyed.has(token) && distractors.every((set) => !set.has(token)))) findings.push('key-stem-lexical-leakage');
  const extreme = /\b(?:always|never|only|entirely|completely|guarantees?|immediately|automatically|all students|no students)\b/i;
  if (item.choices.filter((choice, index) => index !== item.answerIndex && extreme.test(choice)).length >= 2
      && !extreme.test(item.choices[item.answerIndex])) findings.push('asymmetric-extreme-distractors');
  const key = canonical(item.choices[item.answerIndex]);
  if (item.choiceRationales.some((feedback, index) => index !== item.answerIndex
      && key.length >= 25 && canonical(feedback).includes(key))) findings.push('incorrect-option-full-key-echo');
  return findings;
}

describe('Praxis Audiology 5343 assistant-authored Batch 3', () => {
  it('contains exactly 100 independent items at the 20/10/35/25/10 blueprint and 25-per-position key balance', () => {
    expect(items).toHaveLength(100);
    expect(items.map((item) => item.id)).toEqual(Array.from({ length: 100 }, (_, index) => `aud5343-b3-${String(index + 1).padStart(3, '0')}`));
    expect(Object.fromEntries(Object.keys(expectedDomains).map((domainId) => [domainId, items.filter((item) => item.domainId === domainId).length]))).toEqual(expectedDomains);
    expect(Object.fromEntries(Object.keys(expectedSkills).map((skillId) => [skillId, items.filter((item) => item.skillIds[0] === skillId).length]))).toEqual(expectedSkills);
    expect([0, 1, 2, 3].map((answerIndex) => items.filter((item) => item.answerIndex === answerIndex).length)).toEqual([25, 25, 25, 25]);
  });

  it('provides complete credential-specific feedback, named sources, and compatible learning links', () => {
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
      expect(item.rationale.length).toBeGreaterThanOrEqual(180);
      expect(item.choiceRationales).toHaveLength(4);
      expect(item.choiceRationales.every((feedback) => feedback.length >= 100)).toBe(true);
      expect(item.references).toContain('https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5343.pdf');
      expect(item.references.length).toBe(item.referenceNames.length);
      expect(item.references.every((reference) => reference.startsWith('https://'))).toBe(true);
      expect(item.referenceNames.every((name) => name.length >= 15)).toBe(true);
      expect(item.skillIds).toHaveLength(1);
      expect(item.chapterIds).toHaveLength(1);
      const skill = skills.get(item.skillIds[0]);
      const chapter = chapters.get(item.chapterIds[0]);
      expect(skill).toMatchObject({ domainId: item.domainId, chapterId: item.chapterIds[0] });
      expect(chapter).toMatchObject({ domainId: item.domainId, skillId: item.skillIds[0] });
    }
  });

  it('keeps the authored, review, generator, and source-correction artifacts free of encoding corruption', () => {
    const authoredDir = path.dirname(authoredPath);
    const files = fs.readdirSync(authoredDir)
      .filter((name) => /^audiology_5343_batch3.*\.(?:cjs|json)$/.test(name))
      .map((name) => path.join(authoredDir, name));
    files.push(path.join(root, 'dev-tools', 'audiology_5343', 'source_review_corrections.cjs'));
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      expect(text, file).not.toMatch(/\uFFFD|[ÃÂâ]/);
    }
  });

  it('is internally unique and distinct from every prior released Audiology activity', () => {
    const ids = new Set(items.map((item) => item.id));
    const prior = pack.items.filter((item) => !ids.has(item.id))
      .map((item) => corrections[item.id] ? { ...item, ...corrections[item.id] } : item);
    const priorPrompts = new Set(prior.map((item) => canonical(item.prompt)));
    const priorKernels = new Set(prior.map(responseKernel));
    expect(new Set(items.map((item) => canonical(item.prompt))).size).toBe(100);
    expect(new Set(items.map(responseKernel)).size).toBe(100);
    items.forEach((item) => {
      expect(priorPrompts.has(canonical(item.prompt))).toBe(false);
      expect(priorKernels.has(responseKernel(item))).toBe(false);
    });
    expect(review.checks.independentAuthorshipAndOriginality.maximumPromptTokenJaccardAgainstReleasedPack).toBeLessThanOrEqual(0.82);
  });

  it('clears the independently flagged length and extreme-choice defects without moving keys', () => {
    for (const itemNumber of [60, 64, 81, 82, 91]) {
      const item = items[itemNumber - 1];
      expect(warningCodes(item), item.id).toEqual([]);
      expect(item.answerIndex).toBe((itemNumber - 1) % 4);
    }
    expect(items.filter((item) => warningCodes(item).includes('severe-answer-length-clue'))).toEqual([]);
    expect(items.filter((item) => warningCodes(item).includes('asymmetric-extreme-distractors'))).toEqual([]);
  });

  it('has an exact SHA-256-bound independent review artifact with no blockers', () => {
    expect(review.reviewedFile).toBe('dev-tools/authored/audiology_5343_batch3.json');
    expect(review.reviewedAt).toBe('2026-07-18');
    expect(review.reviewer).toContain('OpenAI Codex independent cross-review');
    expect(review.itemCount).toBe(100);
    const sourceSha256 = crypto.createHash('sha256').update(authoredBytes).digest('hex');
    expect(review.sourceSha256).toBe(sourceSha256);
    expect(review.verdict).toMatch(/^pass/i);
    expect(review.blockers).toEqual([]);
    expect(Object.values(review.checks).every((check) => check.status === 'pass')).toBe(true);
    expect(review.checks.editorialWarningHeuristics).toMatchObject({
      answerLengthCluesRemaining: 0,
      asymmetricExtremeDistractorSetsRemaining: 0,
      unresolvedLexicalClues: 0,
    });
    expect(review.artifactBinding).toEqual({ algorithm: 'sha256', sha256: sourceSha256 });
  });
});

describe('Praxis Audiology 5343 priority-docket source corrections', () => {
  it('defines exactly ten durable corrections and preserves every released answer position and concept', () => {
    expect(Object.keys(corrections).sort()).toEqual(Object.keys(expectedCorrectionKeys).sort());
    expect(expectedAnswerIndices).toEqual(expectedCorrectionKeys);
    const conceptChecks = {
      'aud5343-b1-006': /bilateral.*cochlear nuclei/i,
      'aud5343-b2-006': /bilateral.*cochlear nuclei/i,
      'aud5343-b1-013': /energetic masking/i,
      'aud5343-b1-030': /surveillance|evaluation/i,
      'aud5343-b2-025': /level and duration/i,
      'aud5343-b1-046': /afferent.*brainstem.*efferent/i,
      'aud5343-b2-046': /afferent.*brainstem.*efferent/i,
      'aud5343-b1-058': /mixed loss/i,
      'aud5343-b2-058': /mixed loss/i,
      'aud5343-b2-077': /electrode.*map levels.*audibility/i,
    };
    for (const [itemId, answerIndex] of Object.entries(expectedCorrectionKeys)) {
      const correction = corrections[itemId];
      expect(correction.choices).toHaveLength(4);
      expect(correction.choiceRationales).toHaveLength(4);
      expect(correction.choiceRationales.every((feedback) => feedback.length >= 100)).toBe(true);
      expect(correction.choices[answerIndex]).toMatch(conceptChecks[itemId]);
      expect(warningCodes({ ...correction, answerIndex }), itemId).toEqual([]);
    }
  });

  it('targets valid source positions and is wired into the focused source builder before release validation', () => {
    const sourcePositions = new Set();
    for (let batchNumber = 1; batchNumber <= 2; batchNumber += 1) {
      let position = 0;
      for (const skill of skillBanks) {
        for (const spec of skill.questions) {
          position += 1;
          const id = `aud5343-b${batchNumber}-${String(position).padStart(3, '0')}`;
          if (corrections[id]) {
            sourcePositions.add(id);
            expect((position - 1) % 4).toBe(expectedAnswerIndices[id]);
            expect(spec.correct.length).toBeGreaterThan(0);
          }
        }
      }
    }
    expect([...sourcePositions].sort()).toEqual(Object.keys(corrections).sort());
    const builder = fs.readFileSync(path.join(root, 'dev-tools', 'build_audiology_5343_pack.cjs'), 'utf8');
    expect(builder).toContain("require('./audiology_5343/source_review_corrections.cjs')");
    expect(builder).toContain('Object.assign(item, correction');
    expect(builder.indexOf('Object.assign(item, correction')).toBeLessThan(builder.indexOf("if (items.length !== 200"));
  });
});
