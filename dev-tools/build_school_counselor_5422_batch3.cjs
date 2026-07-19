#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');
const { canonical, tokenSet, warningCodes } = require('./non_eppp_warning_checks.cjs');
const skillBanks = require('./school_counselor_5422/item_content.cjs');

const root = path.resolve(__dirname, '..');
const authoredDir = path.join(__dirname, 'authored');
const outputPath = path.join(authoredDir, 'school_counselor_5422_batch3.json');
const reviewedAt = '2026-07-19';

const specs = [
  ...require('./authored/school_counselor_5422_batch3_define_individual.cjs'),
  ...require('./authored/school_counselor_5422_batch3_deliver_team.cjs'),
  ...require('./authored/school_counselor_5422_batch3_manage.cjs'),
  ...require('./authored/school_counselor_5422_batch3_assess.cjs'),
];

const expectedSkillCounts = {
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

const expectedDomainCounts = { define: 25, deliver: 40, manage: 20, assess: 15 };

function countBy(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function sameCounts(actual, expected) {
  const stable = (value) => Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
  return JSON.stringify(stable(actual)) === JSON.stringify(stable(expected));
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

function jaccard(left, right) {
  const a = tokenSet(left);
  const b = tokenSet(right);
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / (a.size + b.size - overlap);
}

function feedbackForDistractor(distractor) {
  return `Not the best answer. ${distractor.reason} Recheck the scenario's purpose, evidence, student access, professional role, and safest appropriate next step.`;
}

function makeItem(bank, spec, position, catalog) {
  const answerIndex = (position - 1) % 4;
  const correct = { text: spec.correct, feedback: `Correct. ${spec.rationale}` };
  const distractors = spec.distractors.map((entry) => ({
    text: entry.text,
    feedback: feedbackForDistractor(entry),
  }));
  const ordered = [];
  let distractorIndex = 0;
  for (let index = 0; index < 4; index += 1) {
    ordered.push(index === answerIndex ? correct : distractors[distractorIndex++]);
  }
  return {
    id: `sc5422-b3-${String(position).padStart(3, '0')}`,
    type: 'single-choice',
    domainId: bank.domainId,
    difficulty: spec.difficulty,
    cognitiveLevel: spec.cognitiveLevel,
    prompt: spec.prompt,
    choices: ordered.map((entry) => entry.text),
    answerIndex,
    rationale: spec.rationale,
    choiceRationales: ordered.map((entry) => entry.feedback),
    skillIds: [bank.id],
    chapterIds: [bank.chapterId],
    references: bank.references.slice(),
    referenceNames: bank.references.map((url) => catalog[url]?.title),
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
  const pack = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'school_counselor_5422_pack.json'), 'utf8'));
  const library = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'school_counselor_5422_learning_library.json'), 'utf8'));
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'reference_catalog.json'), 'utf8'));
  const sourceItems = pack.items.slice(0, 200);
  const releasedSkills = new Map(library.skills.map((skill) => [skill.id, skill]));
  const releasedChapters = new Map(library.chapters.map((chapter) => [chapter.id, chapter]));
  const specsBySkill = new Map();
  const errors = [];

  for (const spec of specs) {
    if (!spec || !expectedSkillCounts[spec.skillId]) {
      errors.push(`unexpected or missing skillId: ${spec?.skillId || '(missing)'}`);
      continue;
    }
    if (!specsBySkill.has(spec.skillId)) specsBySkill.set(spec.skillId, []);
    specsBySkill.get(spec.skillId).push(spec);
    if (String(spec.prompt || '').trim().length < 70) errors.push(`${spec.skillId}: prompt shorter than 70 characters`);
    if (String(spec.rationale || '').trim().length < 120) errors.push(`${spec.skillId}: rationale shorter than 120 characters`);
    if (!Array.isArray(spec.distractors) || spec.distractors.length !== 3) {
      errors.push(`${spec.skillId}: exactly three distractors are required`);
    } else {
      for (const distractor of spec.distractors) {
        if (String(distractor?.text || '').trim().length < 20 || String(distractor?.reason || '').trim().length < 55) {
          errors.push(`${spec.skillId}: distractor text or reason is not substantive`);
        }
      }
    }
    if (!String(spec.correct || '').trim() || !String(spec.difficulty || '').trim()
        || !String(spec.cognitiveLevel || '').trim()) {
      errors.push(`${spec.skillId}: correct response, difficulty, and cognitive level are required`);
    }
  }

  if (specs.length !== 100) errors.push(`expected 100 specifications, found ${specs.length}`);
  const actualSpecCounts = countBy(specs.map((spec) => spec.skillId));
  if (!sameCounts(actualSpecCounts, expectedSkillCounts)) {
    errors.push(`skill allocation mismatch: ${JSON.stringify(actualSpecCounts)}`);
  }

  const items = [];
  for (const bank of skillBanks) {
    const releasedSkill = releasedSkills.get(bank.id);
    const releasedChapter = releasedChapters.get(bank.chapterId);
    if (!releasedSkill || !releasedChapter || releasedSkill.domainId !== bank.domainId
        || releasedSkill.chapterId !== bank.chapterId || releasedChapter.skillId !== bank.id
        || releasedChapter.domainId !== bank.domainId) {
      errors.push(`${bank.id}: released skill/chapter/domain linkage mismatch`);
    }
    for (const url of bank.references) {
      if (!catalog[url]?.title) errors.push(`${bank.id}: catalog title missing for ${url}`);
    }
    for (const spec of specsBySkill.get(bank.id) || []) {
      items.push(makeItem(bank, spec, items.length + 1, catalog));
    }
  }

  if (items.length !== 100) errors.push(`expected 100 items, found ${items.length}`);
  if (!sameCounts(countBy(items.map((item) => item.domainId)), expectedDomainCounts)) {
    errors.push(`domain allocation mismatch: ${JSON.stringify(countBy(items.map((item) => item.domainId)))}`);
  }
  const answerCounts = [0, 1, 2, 3].map((index) => items.filter((item) => item.answerIndex === index).length);
  if (answerCounts.some((count) => count !== 25)) errors.push(`answer balance ${answerCounts.join('/')}`);

  const priorPromptKeys = new Set(sourceItems.map((item) => canonical(item.prompt)));
  const priorResponseKernels = new Set(sourceItems.map(responseKernel));
  const priorContentKernels = new Set(sourceItems.map(contentKernel));
  const itemPromptKeys = new Set();
  const itemResponseKernels = new Set();
  const itemContentKernels = new Set();
  let maximumPromptSimilarity = 0;
  let closestPair = null;
  let keyedLongestOrTiedCount = 0;
  const warningItems = [];

  for (const item of items) {
    const promptKey = canonical(item.prompt);
    const responseKey = responseKernel(item);
    const contentKey = contentKernel(item);
    if (itemPromptKeys.has(promptKey) || priorPromptKeys.has(promptKey)) errors.push(`${item.id}: prompt collision`);
    if (itemResponseKernels.has(responseKey) || priorResponseKernels.has(responseKey)) errors.push(`${item.id}: response collision`);
    if (itemContentKernels.has(contentKey) || priorContentKernels.has(contentKey)) errors.push(`${item.id}: content collision`);
    itemPromptKeys.add(promptKey);
    itemResponseKernels.add(responseKey);
    itemContentKernels.add(contentKey);

    if (item.choices.length !== 4 || new Set(item.choices.map(canonical)).size !== 4) errors.push(`${item.id}: invalid choices`);
    if (item.choiceRationales.length !== 4 || item.choiceRationales.some((feedback) => feedback.length < 100)) {
      errors.push(`${item.id}: insufficient four-choice feedback`);
    }
    if (item.references.length !== item.referenceNames.length || item.referenceNames.some((name) => !name)) {
      errors.push(`${item.id}: invalid named references`);
    }

    const lengths = item.choices.map((choice) => canonical(choice).length);
    if (lengths[item.answerIndex] >= Math.max(...lengths.filter((_, index) => index !== item.answerIndex))) {
      keyedLongestOrTiedCount += 1;
    }
    const actionableWarnings = warningCodes(item).filter((code) => code !== 'key-stem-lexical-leakage');
    if (actionableWarnings.length) warningItems.push({ id: item.id, codes: actionableWarnings });

    for (const sourceItem of sourceItems) {
      const score = jaccard(item.prompt, sourceItem.prompt);
      if (score > maximumPromptSimilarity) {
        maximumPromptSimilarity = score;
        closestPair = { score, newItemId: item.id, sourceItemId: sourceItem.id };
      }
    }
  }

  if (maximumPromptSimilarity > 0.82) errors.push(`prompt similarity exceeds 0.82: ${JSON.stringify(closestPair)}`);
  if (keyedLongestOrTiedCount > 35) errors.push(`keyed answer is longest or tied in ${keyedLongestOrTiedCount} items (maximum 35)`);
  if (warningItems.length) errors.push(`shared warning findings: ${JSON.stringify(warningItems.slice(0, 24))}`);
  if (errors.length) throw new Error(errors.join('\n'));

  const output = `${JSON.stringify(items, null, 2)}\n`;
  if (process.argv.includes('--check')) {
    console.log(`Validated School Counselor 5422 authored Batch 3: ${items.length} items; domains 25/40/20/15; keys 25/25/25/25; keyed-longest ${keyedLongestOrTiedCount}; max source-prompt Jaccard ${maximumPromptSimilarity.toFixed(4)}.`);
    return;
  }
  writeGeneratedFile(outputPath, output);
  console.log(`Built School Counselor 5422 authored Batch 3: ${items.length} items; domains 25/40/20/15; keys 25/25/25/25; keyed-longest ${keyedLongestOrTiedCount}; max source-prompt Jaccard ${maximumPromptSimilarity.toFixed(4)}.`);
}

build();
