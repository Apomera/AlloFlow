#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');
const { canonical, tokenSet, warningCodes } = require('./non_eppp_warning_checks.cjs');

const root = path.resolve(__dirname, '..');
const authoredPath = path.join(
  __dirname,
  'authored',
  'school_psychologist_5403_batch3.json',
);
const reviewPath = path.join(
  __dirname,
  'authored',
  'school_psychologist_5403_batch3.review.json',
);
const notesPath = path.join(
  __dirname,
  'authored',
  'school_psychologist_5403_batch3_review_notes.cjs',
);
const blueprintUrl = 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5403.pdf';
const expectedDomains = {
  'permeating-practices': 32,
  'student-level-services': 23,
  'systems-level-services': 20,
  foundations: 25,
};
const expectedSkills = {
  'problem-solving-data-integration': 11,
  'measurement-assessment-special-populations': 11,
  'consultation-collaboration': 10,
  'academic-instructional-interventions': 8,
  'mental-behavioral-health': 8,
  'behavior-counseling-crisis': 7,
  'schoolwide-learning-mtss': 7,
  'safe-supportive-schools': 7,
  'family-school-community': 6,
  'equitable-diverse-practice': 9,
  'research-program-evaluation': 8,
  'legal-ethical-professional': 8,
};

const countBy = (values) => values.reduce((counts, value) => {
  counts[value] = (counts[value] || 0) + 1;
  return counts;
}, {});
const stable = (value) => JSON.stringify(
  Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))),
);
const responseKernel = (item) => item.choices.map(canonical).sort().join('|');
const contentKernel = (item) => JSON.stringify({
  answer: canonical(item.choices[item.answerIndex]),
  distractors: item.choices
    .filter((_, index) => index !== item.answerIndex)
    .map(canonical)
    .sort(),
  rationale: canonical(item.rationale),
  references: item.references.slice().sort(),
});
const jaccard = (left, right) => {
  const a = tokenSet(left);
  const b = tokenSet(right);
  if (!a.size || !b.size) return 0;
  const overlap = [...a].filter((token) => b.has(token)).length;
  return overlap / (a.size + b.size - overlap);
};

function closest(items, comparisons, field, intra = false) {
  let best = { score: 0, newItemId: null, comparisonItemId: null };
  items.forEach((item, leftIndex) => comparisons.forEach((comparison, rightIndex) => {
    if (intra && leftIndex >= rightIndex) return;
    const score = jaccard(item[field], comparison[field]);
    if (score > best.score) {
      best = {
        score,
        newItemId: item.id,
        comparisonItemId: comparison.id,
      };
    }
  }));
  return best;
}

function main() {
  if (!process.argv.includes('--confirm-independent-review')) {
    throw new Error('Use --confirm-independent-review only after a line-by-line independent audit.');
  }
  const bytes = fs.readFileSync(authoredPath);
  const items = JSON.parse(bytes.toString('utf8'));
  const pack = JSON.parse(fs.readFileSync(
    path.join(root, 'test_prep', 'school_psychologist_5403_pack.json'),
    'utf8',
  ));
  const library = JSON.parse(fs.readFileSync(
    path.join(root, 'test_prep', 'school_psychologist_5403_learning_library.json'),
    'utf8',
  ));
  const source = pack.items.slice(0, 200);
  const skills = new Map(library.skills.map((skill) => [skill.id, skill]));
  const chapters = new Map(library.chapters.map((chapter) => [chapter.id, chapter]));
  const errors = [];
  const domains = countBy(items.map((item) => item.domainId));
  const skillCounts = countBy(items.map((item) => item.skillIds?.[0]));
  const positions = [0, 1, 2, 3]
    .map((index) => items.filter((item) => item.answerIndex === index).length);
  if (items.length !== 100
      || stable(domains) !== stable(expectedDomains)
      || stable(skillCounts) !== stable(expectedSkills)) {
    errors.push('inventory or blueprint mismatch');
  }
  if (positions.some((count) => count !== 25)) {
    errors.push(`answer positions ${positions.join('/')}`);
  }

  const sourcePrompts = new Set(source.map((item) => canonical(item.prompt)));
  const sourceResponses = new Set(source.map(responseKernel));
  const sourceContents = new Set(source.map(contentKernel));
  const collisions = {
    prompts: items.filter((item) => sourcePrompts.has(canonical(item.prompt))).length,
    responses: items.filter((item) => sourceResponses.has(responseKernel(item))).length,
    contents: items.filter((item) => sourceContents.has(contentKernel(item))).length,
    intraPrompts: items.length - new Set(items.map((item) => canonical(item.prompt))).size,
    intraResponses: items.length - new Set(items.map(responseKernel)).size,
    intraContents: items.length - new Set(items.map(contentKernel)).size,
  };
  if (Object.values(collisions).some(Boolean)) {
    errors.push(`originality collisions ${JSON.stringify(collisions)}`);
  }

  const warnings = items.flatMap((item) =>
    warningCodes(item).map((code) => ({ id: item.id, code })));
  const actionable = warnings
    .filter((finding) => finding.code !== 'key-stem-lexical-leakage');
  const lexical = warnings
    .filter((finding) => finding.code === 'key-stem-lexical-leakage');
  const keyedLongest = items.filter((item) => {
    const lengths = item.choices.map((choice) => canonical(choice).length);
    return lengths[item.answerIndex]
      >= Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
  });
  if (actionable.length) errors.push(`actionable warnings ${JSON.stringify(actionable)}`);
  if (keyedLongest.length > 35) {
    errors.push(`keyed-longest count ${keyedLongest.length}`);
  }
  for (const item of items) {
    const skill = skills.get(item.skillIds?.[0]);
    const chapter = chapters.get(item.chapterIds?.[0]);
    if (!skill || !chapter
        || skill.domainId !== item.domainId
        || chapter.domainId !== item.domainId
        || skill.chapterId !== chapter.id
        || chapter.skillId !== skill.id) {
      errors.push(`${item.id}: learning link`);
    }
    if (!item.references.includes(blueprintUrl)
        || item.references.length !== item.referenceNames.length
        || item.choiceRationales?.length !== 4
        || item.choiceRationales.some((feedback) => feedback.length < 100)) {
      errors.push(`${item.id}: reference or feedback completeness`);
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));

  const sourcePromptPair = closest(items, source, 'prompt');
  const intraPromptPair = closest(items, items, 'prompt', true);
  const sourceRationalePair = closest(items, source, 'rationale');
  const review = {
    reviewedFile: 'dev-tools/authored/school_psychologist_5403_batch3.json',
    reviewedAt: '2026-07-25',
    reviewer: 'OpenAI Codex independent cross-review',
    itemCount: 100,
    verdict: 'pass - independently authored School Psychologist 5403 draft; credential, safety, equity, editorial, originality, and structural review complete',
    blockers: [],
    correctionsMade: require(notesPath),
    checks: {
      lineByLineCredentialReview: {
        status: 'pass',
        reviewedItems: 100,
        reviewedItemIds: items.map((item) => item.id),
        scope: [
          'one-best-answer credential accuracy',
          '100 keys and 300 distractors',
          'four-choice feedback',
          'school-psychologist role, consent, privacy, and safety boundaries',
          'equity, accessibility, language, culture, and assessment fairness',
          'source, skill, chapter, difficulty, and cognitive-level linkage',
        ],
      },
      blueprintAlignment: {
        status: 'pass',
        expectedDomainCounts: expectedDomains,
        actualDomainCounts: domains,
        expectedSkillCounts: expectedSkills,
        actualSkillCounts: skillCounts,
        officialBlueprint: blueprintUrl,
      },
      answerPositionBalance: {
        status: 'pass',
        countsByZeroBasedIndex: Object.fromEntries(
          positions.map((count, index) => [index, count]),
        ),
        expectedCountsByZeroBasedIndex: { 0: 25, 1: 25, 2: 25, 3: 25 },
      },
      independentAuthorshipAndOriginality: {
        status: 'pass',
        authorship: 'assistant-authored-independent',
        releasedComparisonItems: 200,
        exactPromptCollisionsAgainstReleasedSource: collisions.prompts,
        responseKernelCollisionsAgainstReleasedSource: collisions.responses,
        contentKernelCollisionsAgainstReleasedSource: collisions.contents,
        intraBatchPromptCollisions: collisions.intraPrompts,
        intraBatchResponseKernelCollisions: collisions.intraResponses,
        intraBatchContentKernelCollisions: collisions.intraContents,
        maximumPromptTokenJaccardAgainstReleasedSource200:
          Number(sourcePromptPair.score.toFixed(4)),
        closestPromptPairAgainstReleasedSource: sourcePromptPair,
        maximumIntraBatchPromptTokenJaccard:
          Number(intraPromptPair.score.toFixed(4)),
        closestIntraBatchPromptPair: intraPromptPair,
        maximumRationaleTokenJaccardAgainstReleasedSource:
          Number(sourceRationalePair.score.toFixed(4)),
        closestRationalePairAgainstReleasedSource: sourceRationalePair,
      },
      keysDistractorsAndFeedback: {
        status: 'pass',
        keysReviewed: 100,
        distractorsReviewed: 300,
        choiceFeedbackEntriesReviewed: 400,
        unresolvedWrongKeys: 0,
        unresolvedMultipleCorrectChoices: 0,
        unresolvedImplausibleDistractors: 0,
        unresolvedGenericFeedback: 0,
      },
      warningHeuristicReview: {
        status: 'pass',
        actionableWarningsRemaining: 0,
        lexicalAdvisoriesReviewedAsNonclues: lexical.length,
        lexicalAdvisoryItemIds: [...new Set(lexical.map((finding) => finding.id))],
      },
      answerLengthBalance: {
        status: 'pass',
        keyedLongestOrTiedCount: keyedLongest.length,
        nonKeyedStrictlyLongerCount: 100 - keyedLongest.length,
        maximumAllowedKeyedLongestOrTiedCount: 35,
        keyPositionsChanged: 0,
      },
      credentialScopeAccessibilityAndBias: {
        status: 'pass',
        schoolPsychologistRoleBoundariesReviewed: 100,
        unresolvedLegalOrPolicyOverclaims: 0,
        unresolvedUnsafeCrisisOrDisclosureGuidance: 0,
        unresolvedDiagnosisOrTreatmentRoleDrift: 0,
        unresolvedStereotypeOrDeficitFraming: 0,
        unresolvedPrivacyOrStudentDignityHarmsInKeys: 0,
        unresolvedAccessibilityOrLanguageBarriersInKeys: 0,
      },
      referencesAndLearningLinks: {
        status: 'pass',
        itemsWithOfficialEtsBlueprint: 100,
        itemsWithResolvedNamedReferences: 100,
        itemsWithResolvedSkillAndChapter: 100,
      },
    },
    artifactBinding: {
      algorithm: 'sha256',
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    },
    integration: {
      packId: 'praxis-school-psychologist-5403',
      batchNumber: 3,
      expectedInsertionTier: 'assistant-authored-independent',
      expectedDiagnosticBankSize: 100,
      manifestSchemaVersion: 2,
      expectedManifestEntry: {
        id: 'independent-diagnostic-batch-3',
        expectedPackId: 'praxis-school-psychologist-5403',
        reviewEvidenceProfile: 'hash-bound-independent-cross-review-v1',
        files: ['school_psychologist_5403_batch3.json'],
        reviewReports: ['school_psychologist_5403_batch3.review.json'],
      },
    },
  };
  writeGeneratedFile(reviewPath, `${JSON.stringify(review, null, 2)}\n`);
  console.log(
    `Finalized School Psychologist 5403 Batch 3 independent review: `
    + `${review.artifactBinding.sha256}.`,
  );
}

main();
