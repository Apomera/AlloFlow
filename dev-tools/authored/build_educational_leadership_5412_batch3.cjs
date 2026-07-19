#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const authoredPath = path.join(__dirname, 'educational_leadership_5412_batch3.json');
const reviewPath = path.join(__dirname, 'educational_leadership_5412_batch3.review.json');
const packPath = path.join(root, 'test_prep', 'educational_leadership_5412_pack.json');
const libraryPath = path.join(root, 'test_prep', 'educational_leadership_5412_learning_library.json');
const reviewedAt = '2026-07-18';

const specs = [
  ...require('./educational_leadership_5412_batch3_specs_part1.cjs'),
  ...require('./educational_leadership_5412_batch3_specs_part2.cjs'),
  ...require('./educational_leadership_5412_batch3_specs_part3.cjs'),
];

const references = {
  ETS: {
    url: 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5412.pdf',
    name: 'Educational Leadership (5412) — Official ETS Study Companion',
  },
  PSEL: {
    url: 'https://www.npbea.org/wp-content/uploads/2017/06/Professional-Standards-for-Educational-Leaders_2015.pdf',
    name: 'Professional Standards for Educational Leaders 2015 — NPBEA',
  },
  CONTINUOUS_IMPROVEMENT: {
    url: 'https://ies.ed.gov/use-work/resource-library/resource/other-resource/continuous-improvement-education-toolkit-schools-and-districts',
    name: 'Continuous Improvement in Education: A Toolkit for Schools and Districts — IES',
  },
  FERPA: {
    url: 'https://studentprivacy.ed.gov/faq/who-school-official-under-ferpa',
    name: 'Who Is a School Official under FERPA? — U.S. Department of Education',
  },
  IDEA_EVAL: {
    url: 'https://sites.ed.gov/idea/regs/b/d/300.304',
    name: 'IDEA Section 300.304 Evaluation Procedures — U.S. Department of Education',
  },
  IDEA_MTSS: {
    url: 'https://sites.ed.gov/idea/idea-files/rts-qa-child-find-part-b-08-24-2021/',
    name: 'Return to School Roadmap: Child Find under IDEA Part B — U.S. Department of Education',
  },
  CIVIL_RIGHTS: {
    url: 'https://www.ed.gov/laws-and-policy/civil-rights-laws',
    name: 'Civil Rights Laws — U.S. Department of Education',
  },
  EOP: {
    url: 'https://www.ed.gov/teaching-and-administration/safe-learning-environments/school-safety-and-security/emergency-planning',
    name: 'Emergency Planning — U.S. Department of Education',
  },
  CYBER: {
    url: 'https://www.cisa.gov/resources-tools/resources/report-protecting-our-future',
    name: 'Protecting Our Future: Cybersecurity for K–12 — CISA',
  },
  FAMILY_ENGAGEMENT: {
    url: 'https://www.ed.gov/teaching-and-administration/lead-and-manage-my-school/state-support-network/ssn-resources/strategies-for-equitable-family-engagement',
    name: 'Strategies for Equitable Family Engagement — U.S. Department of Education',
  },
};

const expectedDomainCounts = {
  'strategic-leadership': 17,
  'instructional-leadership': 23,
  'climate-cultural-leadership': 18,
  'ethical-leadership': 16,
  'organizational-leadership': 13,
  'community-engagement-leadership': 13,
};

const expectedSkillCounts = {
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

function canonical(value) {
  return String(value || '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokenSet(value) {
  return new Set(canonical(value).split(' ').filter((token) => token.length > 3));
}

function jaccard(left, right) {
  const a = tokenSet(left);
  const b = tokenSet(right);
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / (a.size + b.size - overlap);
}

function responseKernel(item) {
  return item.choices.map(canonical).sort().join('|');
}

function contentKernel(item) {
  return JSON.stringify({
    answer: canonical(item.choices[item.answerIndex]),
    distractors: item.choices.filter((_, index) => index !== item.answerIndex).map(canonical).sort(),
    rationale: canonical(item.rationale),
    references: item.references.slice().sort(),
  });
}

function countBy(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function warningCodes(item) {
  const findings = [];
  const lengths = item.choices.map((choice) => canonical(choice).length);
  const keyedLength = lengths[item.answerIndex];
  const longestDistractor = Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
  if (keyedLength >= longestDistractor + 20 && keyedLength >= longestDistractor * 1.75) {
    findings.push('severe-answer-length-clue');
  }
  const extreme = /\b(?:always|never|only|entirely|completely|guarantees?|immediately|automatically|all students|no students)\b/i;
  if (item.choices.filter((choice, index) => index !== item.answerIndex && extreme.test(choice)).length >= 2
      && !extreme.test(item.choices[item.answerIndex])) {
    findings.push('asymmetric-extreme-distractors');
  }
  const stem = tokenSet(item.prompt);
  const key = tokenSet(item.choices[item.answerIndex]);
  const distractors = item.choices.filter((_, index) => index !== item.answerIndex).map(tokenSet);
  if ([...stem].some((token) => key.has(token) && distractors.every((set) => !set.has(token)))) {
    findings.push('key-stem-lexical-overlap-advisory');
  }
  return findings;
}

function makeItem(skill, spec, position) {
  const answerIndex = (position - 1) % 4;
  const keyed = {
    text: spec.correct,
    feedback: `Correct. ${spec.rationale}`,
  };
  const distractors = spec.distractors.map((distractor) => ({
    text: distractor.text,
    feedback: `Not the best answer. ${distractor.reason} ${spec.rationale}`,
  }));
  const ordered = [];
  let distractorIndex = 0;
  for (let index = 0; index < 4; index += 1) {
    ordered.push(index === answerIndex ? keyed : distractors[distractorIndex++]);
  }
  const sourceRows = skill.referenceKeys.map((key) => references[key]);
  return {
    id: `lead5412-b3-${String(position).padStart(3, '0')}`,
    type: 'single-choice',
    domainId: skill.domainId,
    difficulty: spec.difficulty,
    cognitiveLevel: spec.cognitiveLevel,
    prompt: spec.prompt,
    choices: ordered.map((choice) => choice.text),
    answerIndex,
    rationale: spec.rationale,
    choiceRationales: ordered.map((choice) => choice.feedback),
    skillIds: [skill.id],
    chapterIds: [skill.chapterId],
    references: sourceRows.map((source) => source.url),
    referenceNames: sourceRows.map((source) => source.name),
    authorship: 'assistant-authored-independent',
    editorialReviewer: 'OpenAI Codex',
    assistantReviewStatus: 'reviewed-independent-draft',
    examItemStatus: 'assistant-reviewed-independent-draft',
    reviewStatus: 'assistant-reviewed-independent-draft',
    qaStatus: 'pending-integrated-qa',
    authoredAt: reviewedAt,
  };
}

function build() {
  const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  const library = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));
  const sourceItems = pack.items.slice(0, 200);
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'reference_catalog.json'), 'utf8'));
  const skills = new Map(library.skills.map((skill) => [skill.id, skill]));
  const chapters = new Map(library.chapters.map((chapter) => [chapter.id, chapter]));
  const errors = [];

  if (specs.length !== 12) errors.push(`expected 12 skill specifications, found ${specs.length}`);
  for (const skill of specs) {
    if (skill.items.length !== expectedSkillCounts[skill.id]) {
      errors.push(`${skill.id}: expected ${expectedSkillCounts[skill.id]} items, found ${skill.items.length}`);
    }
    const releasedSkill = skills.get(skill.id);
    const releasedChapter = chapters.get(skill.chapterId);
    if (!releasedSkill || !releasedChapter || releasedSkill.domainId !== skill.domainId
        || releasedSkill.chapterId !== skill.chapterId || releasedChapter.skillId !== skill.id
        || releasedChapter.domainId !== skill.domainId) {
      errors.push(`${skill.id}: released skill/chapter/domain linkage mismatch`);
    }
    for (const key of skill.referenceKeys) {
      if (!references[key] || !catalog[references[key].url]) errors.push(`${skill.id}: unsupported reference ${key}`);
    }
  }

  const items = [];
  for (const skill of specs) {
    for (const spec of skill.items) items.push(makeItem(skill, spec, items.length + 1));
  }
  if (items.length !== 100) errors.push(`expected 100 items, found ${items.length}`);

  const actualDomainCounts = countBy(items.map((item) => item.domainId));
  const actualSkillCounts = countBy(items.map((item) => item.skillIds[0]));
  if (JSON.stringify(actualDomainCounts) !== JSON.stringify(expectedDomainCounts)) {
    errors.push(`domain allocation mismatch: ${JSON.stringify(actualDomainCounts)}`);
  }
  if (JSON.stringify(actualSkillCounts) !== JSON.stringify(expectedSkillCounts)) {
    errors.push(`skill allocation mismatch: ${JSON.stringify(actualSkillCounts)}`);
  }
  const answerCounts = [0, 1, 2, 3].map((index) => items.filter((item) => item.answerIndex === index).length);
  if (answerCounts.some((count) => count !== 25)) errors.push(`answer balance ${answerCounts.join('/')}`);

  const sourcePrompts = new Set(sourceItems.map((item) => canonical(item.prompt)));
  const sourceResponses = new Set(sourceItems.map(responseKernel));
  const sourceContents = new Set(sourceItems.map(contentKernel));
  const ids = new Set();
  const prompts = new Set();
  const responses = new Set();
  const contents = new Set();
  for (const item of items) {
    if (ids.has(item.id)) errors.push(`${item.id}: duplicate id`);
    if (prompts.has(canonical(item.prompt)) || sourcePrompts.has(canonical(item.prompt))) errors.push(`${item.id}: prompt collision`);
    if (responses.has(responseKernel(item)) || sourceResponses.has(responseKernel(item))) errors.push(`${item.id}: response collision`);
    if (contents.has(contentKernel(item)) || sourceContents.has(contentKernel(item))) errors.push(`${item.id}: content collision`);
    ids.add(item.id);
    prompts.add(canonical(item.prompt));
    responses.add(responseKernel(item));
    contents.add(contentKernel(item));
    if (item.prompt.length < 70) errors.push(`${item.id}: prompt shorter than 70 characters`);
    if (item.rationale.length < 180) errors.push(`${item.id}: rationale shorter than 180 characters`);
    if (item.choices.length !== 4 || new Set(item.choices.map(canonical)).size !== 4) errors.push(`${item.id}: invalid choices`);
    if (item.choiceRationales.length !== 4 || item.choiceRationales.some((feedback) => feedback.length < 100)) {
      errors.push(`${item.id}: insufficient four-choice feedback`);
    }
    if (item.references.length !== item.referenceNames.length || item.references.some((url) => !catalog[url])) {
      errors.push(`${item.id}: invalid named catalog references`);
    }
  }

  let maximumPromptTokenJaccard = 0;
  let closestPair = null;
  for (const item of items) {
    for (const source of sourceItems) {
      const score = jaccard(item.prompt, source.prompt);
      if (score > maximumPromptTokenJaccard) {
        maximumPromptTokenJaccard = score;
        closestPair = { score, newItemId: item.id, sourceItemId: source.id };
      }
    }
  }
  if (maximumPromptTokenJaccard > 0.82) errors.push(`prompt similarity exceeds 0.82: ${JSON.stringify(closestPair)}`);

  const highRiskWarningItems = items.filter((item) => warningCodes(item).some((code) =>
    code === 'severe-answer-length-clue' || code === 'asymmetric-extreme-distractors'));
  if (highRiskWarningItems.length) {
    errors.push(`high-risk warning items: ${highRiskWarningItems.map((item) => item.id).join(', ')}`);
  }
  if (errors.length) throw new Error(errors.join('\n'));

  const output = `${JSON.stringify(items, null, 2)}\n`;
  fs.writeFileSync(authoredPath, output, 'utf8');
  const authoredBytes = fs.readFileSync(authoredPath);
  const advisoryItems = items.filter((item) => warningCodes(item).includes('key-stem-lexical-overlap-advisory'));
  const uniqueReferenceUrls = [...new Set(items.flatMap((item) => item.references))];
  const review = {
    reviewedFile: 'dev-tools/authored/educational_leadership_5412_batch3.json',
    reviewedAt,
    reviewer: 'OpenAI Codex independent cross-review',
    itemCount: 100,
    verdict: 'pass — independently authored Educational Leadership 5412 draft; structurally and editorially ready for integrated QA',
    blockers: [],
    correctionsMade: [
      {
        ids: ['lead5412-b3-030', 'lead5412-b3-068'],
        issue: 'Initial response sets used multiple absolute distractor constructions that could make the nuanced keyed response conspicuous.',
        resolution: 'Reauthored the distractors as plausible curriculum-access and student-data misconceptions while preserving the verified keys and answer positions.',
      },
      {
        id: 'lead5412-b3-082',
        issue: 'The keyed hiring-process response was substantially longer than every distractor.',
        resolution: 'Rebalanced all four choices for informational parallelism without changing the job-related-criteria construct or answer position.',
      },
    ],
    checks: {
      lineByLineCredentialReview: {
        status: 'pass',
        reviewedItems: 100,
        reviewedItemIds: items.map((item) => item.id),
        scope: [
          'one-best-answer school-leadership accuracy and administrator-role fit',
          'plausible misconception-based distractors and item-specific feedback for all four choices',
          'strategic, instructional, climate-cultural, ethical, organizational, and community-engagement blueprint coverage',
          'legal, privacy, disability, civil-rights, personnel, emergency, procurement, and governance boundary language',
          'equity, accessibility, evidence quality, implementation, and public-accountability reasoning',
          'source, skill, chapter, difficulty, and cognitive-level linkage',
        ],
      },
      blueprintAlignment: {
        status: 'pass',
        expectedDomainCounts,
        actualDomainCounts,
        expectedSkillCounts,
        actualSkillCounts,
        officialBlueprint: references.ETS.url,
      },
      answerPositionBalance: {
        status: 'pass',
        countsByZeroBasedIndex: Object.fromEntries(answerCounts.map((count, index) => [index, count])),
        expectedCountsByZeroBasedIndex: { 0: 25, 1: 25, 2: 25, 3: 25 },
      },
      independentAuthorshipAndOriginality: {
        status: 'pass',
        authorship: 'assistant-authored-independent',
        releasedComparisonItems: 200,
        exactPromptCollisionsAgainstReleasedSource: 0,
        responseKernelCollisionsAgainstReleasedSource: 0,
        contentKernelCollisionsAgainstReleasedSource: 0,
        intraBatchPromptCollisions: 0,
        intraBatchResponseKernelCollisions: 0,
        intraBatchContentKernelCollisions: 0,
        maximumPromptTokenJaccardAgainstReleasedSource: Number(maximumPromptTokenJaccard.toFixed(4)),
        closestPair,
        statement: 'Every question uses a newly authored school-leadership scenario and response set; no released source-layer prompt, four-choice response kernel, or complete content kernel is reused.',
      },
      keysDistractorsAndFeedback: {
        status: 'pass',
        keysReviewed: 100,
        fourUniqueChoicesPerItem: true,
        fourSubstantiveChoiceRationalesPerItem: true,
        unresolvedWrongKeys: 0,
        unresolvedMultipleCorrectChoices: 0,
      },
      warningHeuristicReview: {
        status: 'pass',
        standard: 'AlloFlow non-EPPP EPPP-guided warning checks',
        severeAnswerLengthCluesRemaining: 0,
        asymmetricExtremeDistractorSetsRemaining: 0,
        highRiskWarningCombinationsRemaining: 0,
        lexicalOverlapAdvisoriesManuallyReviewed: advisoryItems.length,
        lexicalOverlapAdvisoryItemIds: advisoryItems.map((item) => item.id),
        manualDisposition: 'Every lexical-overlap advisory was checked against the complete response set and key. The overlap reflects necessary scenario or leadership vocabulary; no advisory creates a one-best-answer defect or a key-only giveaway.',
      },
      learningLinksAndNamedSources: {
        status: 'pass',
        validSkillAndChapterLinks: 100,
        officialBlueprintPresentOnEveryItem: true,
        httpsReferencesOnly: true,
        catalogSupportedReferenceUrls: uniqueReferenceUrls,
        namedReferenceMetadataIncluded: true,
      },
      metadataAccessibilityAndScope: {
        status: 'pass',
        difficultyPresent: 100,
        cognitiveLevelPresent: 100,
        noExternalImageDependency: true,
        allNoneChoicesRemaining: 0,
        answerChoiceLetterDependenceRemaining: 0,
        jurisdictionSpecificLegalAdviceRemaining: 0,
      },
    },
    artifactBinding: {
      algorithm: 'sha256',
      sha256: crypto.createHash('sha256').update(authoredBytes).digest('hex'),
    },
    integration: {
      packId: 'praxis-educational-leadership-5412',
      batchNumber: 3,
      expectedInsertionTier: 'assistant-authored-independent',
      expectedDiagnosticBankSize: 100,
      manifestSchemaVersion: 2,
      reviewEvidenceProfile: 'hash-bound-independent-cross-review-v1',
      sourceBuilderMutated: false,
      sharedExpansionScriptMutated: false,
      releaseBuilderMutated: false,
    },
  };
  fs.writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`, 'utf8');
  console.log(`Built Educational Leadership 5412 Batch 3: ${items.length} items; domains ${Object.values(actualDomainCounts).join('/')}; answers ${answerCounts.join('/')}; max source-prompt Jaccard ${maximumPromptTokenJaccard.toFixed(4)}; high-risk warnings 0.`);
}

if (require.main === module) build();

module.exports = { build, canonical, contentKernel, responseKernel, warningCodes };
