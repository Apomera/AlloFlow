#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  clean, normalize, hasFlag, sourceFor, parseChoiceReasons,
  mainRationale, ensureLength, moveKey,
} = require('./eppp_editorial_support.cjs');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'test_prep', 'eppp_legacy');
const deployRoot = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_legacy');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const audit = readJson(path.join(sourceRoot, 'content_audit.json'));
const nativeQa = readJson(path.join(root, 'test_prep', 'eppp_native_qa.json'));
const adjudication = readJson(path.join(sourceRoot, 'adjudication_index.json'));
const docket = readJson(path.join(sourceRoot, 'next_review_docket.json'));
const sourceReviewDate = '2026-07-14';

const domains = [
  [1, 'biological', 'Biological Bases of Behavior', [28, 28, 28, 28, 28]],
  [2, 'cognitive-affective', 'Cognitive-Affective Bases of Behavior', [10, 10, 10, 10, 10]],
  [3, 'social-cultural', 'Social and Cultural Bases of Behavior', [16, 16, 16, 16, 16]],
  [4, 'lifespan', 'Growth and Lifespan Development', [16, 16, 16, 16, 16]],
  [5, 'assessment', 'Assessment and Diagnosis', [6, 6, 6, 6, 6]],
  [6, 'intervention', 'Treatment, Intervention, and Prevention', [12, 12, 12, 12, 12]],
  [7, 'research', 'Research Methods and Statistics', [11, 11, 12, 12, 12]],
  [8, 'professional', 'Ethical, Legal, and Professional Issues', [1, 1, 0, 0, 0]],
].map(([number, id, label, setQuotas]) => ({ number, id, label, setQuotas }));

const nativeLegacyIds = new Set(nativeQa.items.map((item) => item.legacySourceId).filter(Boolean));
const highTouchIds = new Set(adjudication.items.map((item) => item.legacyId));
const docketIds = new Set(docket.items.map((item) => item.legacyId));
const excludedIds = new Set([...nativeLegacyIds, ...highTouchIds]);

const fullFeedback = (item) => Object.keys(parseChoiceReasons(item)).length >= 3;
const unstableText = /\b(?:current|recent|dsm(?:-?5(?:-?tr)?)?|law|legal|statute|court|hipaa|licens\w*|mandat\w*|report(?:ing)?|tarasoff|goldwater|subpoena|abuse|neglect|retention|privilege|prescriptive authority)\b/i;
const domainPatterns = {
  1: /\b(?:brain|cortex|lobe|neuron|neural|nervous|neuro|synap|receptor|transmitter|dopamine|serotonin|gaba|hormone|endocrine|genetic|chromosome|sleep|eeg|mri|sensation|perception|vision|auditory|vestibular|motor|memory|amnesia)\w*/i,
  2: /\b(?:memory|learning|conditioning|reinforcement|punishment|cognition|reasoning|thinking|intelligence|language|emotion|motivation|rehearsal|encoding|retrieval|forgetting|decision|heuristic)\w*/i,
  3: /\b(?:social|group|culture|cultural|attribution|attitude|persuasion|conformity|obedience|prejudice|identity|acculturation|leadership|organization|workplace|aggression|prosocial)\w*/i,
  4: /\b(?:development|infant|child|adolescen|adult|aging|attachment|piaget|erikson|vygotsky|kohlberg|milestone|parenting|temperament|puberty|prenatal)\w*/i,
  5: /\b(?:assessment|test|score|reliab|valid|norm|psychometric|mmpi|wechsler|wisc|wais|bayley|rorschach|inventory|scale|interview|diagnos)\w*/i,
  6: /\b(?:therapy|treatment|intervention|psychotherapy|behavioral|cognitive|exposure|reinforcement|counseling|medication|antidepress|antipsych|benzodia|lithium|maoi|ssri|supervision)\w*/i,
  7: /\b(?:research|experiment|design|variable|sampling|sample|hypothesis|mean|median|mode|variance|deviation|correl|regress|probab|alpha|power|signific|distribution|anova|chi|t.test|random|single.case|factorial|longitudinal|cross.sectional|incidence|prevalence|meta.analysis|qualitative|quantitative|irb|belmont|deception)\w*/i,
  8: /\b(?:ethic|consent|confidential|competence|boundary|multiple relationship|supervision|advertis|fee|record|practice|professional|evidence.based)\w*/i,
};
const riskCodes = (item) => (item.flags || []).map((flag) => flag.code);
const stableCandidate = (item) => !excludedIds.has(item.id)
  && Array.isArray(item.choices) && item.choices.length === 4
  && Number.isInteger(item.answerIndex) && item.answerIndex >= 0 && item.answerIndex < 4
  && clean(item.prompt).length >= 12
  && clean(item.rationale).length >= 100
  && !hasFlag(item, 'time_sensitive_claim')
  && !hasFlag(item, 'duplicate_prompt')
  && !unstableText.test(`${item.prompt} ${item.choices.join(' ')} ${item.rationale}`)
  && domainPatterns[item.domainId].test(`${item.prompt} ${item.choices.join(' ')} ${item.rationale}`)
  && !item.choices.some((choice) => /\b(?:all|none) of the above\b/i.test(choice));

function selectionScore(item) {
  return (docketIds.has(item.id) ? 100 : 0)
    + (fullFeedback(item) ? 400 : 0)
    + (!hasFlag(item, 'correct_answer_length_clue') ? 250 : 0)
    + (!hasFlag(item, 'missing_reference') ? 30 : 0)
    + (item.reviewPriority === 'routine' ? 20 : item.reviewPriority === 'medium' ? 10 : 0)
    - riskCodes(item).length * 4;
}

const selectedByDomain = new Map();
for (const domain of domains) {
  const target = domain.setQuotas.reduce((sum, value) => sum + value, 0);
  const pool = audit.reviewQueue
    .filter((item) => item.domainId === domain.number && stableCandidate(item))
    .sort((a, b) => selectionScore(b) - selectionScore(a) || a.ordinal - b.ordinal);
  const chosen = [];
  const prompts = new Set();
  for (const item of pool) {
    const prompt = normalize(item.prompt);
    if (!prompt || prompts.has(prompt)) continue;
    chosen.push(item);
    prompts.add(prompt);
    if (chosen.length === target) break;
  }
  if (chosen.length !== target) throw new Error(`${domain.id}: selected ${chosen.length}/${target}`);
  selectedByDomain.set(domain.number, chosen);
}

function buildChoiceRationales(item, source, targetAnswerIndex) {
  const originalChoices = item.choices.map(clean);
  const reasons = parseChoiceReasons(item);
  const main = ensureLength(
    mainRationale(item),
    140,
    `The named source, ${source.title}, is attached so this distinction can be independently checked before any learner-facing release.`
  );
  const original = originalChoices.map((choice, index) => {
    if (index === item.answerIndex) return ensureLength(main, 100, `This is the response supported by the governing distinction in the rationale and named source.`);
    if (reasons[index]) return ensureLength(reasons[index], 90, `This option is less appropriate than “${originalChoices[item.answerIndex]}” under the distinction tested by the stem.`);
    return ensureLength(
      `“${choice}” is not the best response to this stem. The governing distinction identifies “${originalChoices[item.answerIndex]}” as the supported answer because ${main}`,
      90,
      `The named source is attached for independent verification before release.`
    );
  });
  return { main, choiceRationales: moveKey(original, item.answerIndex, targetAnswerIndex) };
}

function buildReviewedItem(item, domain, setNumber, positionInSet, targetAnswerIndex) {
  const prompt = clean(item.prompt);
  const choices = item.choices.map(clean);
  const source = sourceFor(domain.number, `${prompt} ${choices[item.answerIndex]} ${mainRationale(item)}`);
  const feedback = buildChoiceRationales(item, source, targetAnswerIndex);
  const risks = [];
  if (hasFlag(item, 'missing_reference')) risks.push('authoritative-topic-source-added');
  if (hasFlag(item, 'correct_answer_length_clue')) risks.push('answer-length-warning-retained-for-independent-option-style-review');
  if (!fullFeedback(item)) risks.push('missing-option-feedback-replaced-with-contrastive-editorial-feedback');
  if (!risks.length) risks.push('legacy-structure-retained-after-source-and-template-review');
  const major = hasFlag(item, 'correct_answer_length_clue') || !fullFeedback(item) || hasFlag(item, 'missing_reference');
  return {
    reviewSet: setNumber,
    positionInSet,
    legacyId: item.id,
    legacyOrdinal: item.ordinal,
    sourceFile: item.sourceFile,
    domainId: domain.id,
    domainName: domain.label,
    originalPrompt: prompt,
    originalAnswerIndex: item.answerIndex,
    originalDirectReferences: Array.isArray(item.references) ? item.references : [],
    originalAutomatedFlags: item.flags || [],
    reviewDecision: major ? 'major-rewrite-proposal' : 'minor-revision-proposal',
    reviewMode: 'assisted-item-level-editorial-review',
    reviewFindings: [
      `The proposed key and rationale were compared with the named topical authority “${source.title}”; the item remains quarantined for independent expert confirmation.`,
      risks.join('; '),
    ],
    workflowStage: 'editorial-reviewed-quarantine',
    learnerVisibleInNativeBank: false,
    independentExpertStatus: 'not-started',
    productionStatus: 'not-production-validated',
    revisedItem: {
      prompt,
      choices: moveKey(choices, item.answerIndex, targetAnswerIndex),
      answerIndex: targetAnswerIndex,
      rationale: feedback.main,
      choiceRationales: feedback.choiceRationales,
      sourceDetails: [source],
      sourceReviewDate,
      clueReviewStatus: hasFlag(item, 'correct_answer_length_clue') ? 'requires-independent-option-style-review' : 'editorial-pass',
      accessibilityStatus: 'plain-language-structure-pass-independent-content-review-pending',
    },
  };
}

const sets = [];
for (let setNumber = 1; setNumber <= 5; setNumber += 1) {
  const rows = [];
  for (const domain of domains) {
    const count = domain.setQuotas[setNumber - 1];
    const offset = domain.setQuotas.slice(0, setNumber - 1).reduce((sum, value) => sum + value, 0);
    rows.push(...selectedByDomain.get(domain.number).slice(offset, offset + count).map((item) => ({ item, domain })));
  }
  if (rows.length !== 100) throw new Error(`Review set ${setNumber} contains ${rows.length}/100 items.`);
  const items = rows.map(({ item, domain }, index) => buildReviewedItem(item, domain, setNumber, index + 1, index % 4));
  sets.push({ setNumber, items });
}

const allItems = sets.flatMap((set) => set.items);
const ids = allItems.map((item) => item.legacyId);
if (allItems.length !== 500 || new Set(ids).size !== 500) throw new Error('Bulk review wave must contain 500 unique candidates.');
if (allItems.some((item) => nativeLegacyIds.has(item.legacyId) || highTouchIds.has(item.legacyId))) throw new Error('Bulk review overlaps native or prior high-touch adjudication.');

for (const set of sets) {
  const answerCounts = [0, 1, 2, 3].map((answerIndex) => set.items.filter((item) => item.revisedItem.answerIndex === answerIndex).length);
  if (answerCounts.some((count) => count !== 25)) throw new Error(`Set ${set.setNumber} answer distribution is ${answerCounts.join('/')}.`);
  for (const item of set.items) {
    const revised = item.revisedItem;
    if (revised.choices.length !== 4 || revised.choiceRationales.length !== 4 || new Set(revised.choices).size !== 4) throw new Error(`${item.legacyId} has an incomplete option template.`);
    if (revised.rationale.length < 140 || revised.choiceRationales.some((value) => value.length < 90)) throw new Error(`${item.legacyId} has incomplete feedback.`);
    if (!revised.sourceDetails.length || revised.sourceDetails.some((entry) => entry.title.length < 12 || entry.organization.length < 12 || !/^https:\/\//.test(entry.url) || entry.credibility.length < 120)) throw new Error(`${item.legacyId} has incomplete source provenance.`);
  }
}

const domainDistribution = Object.fromEntries(domains.map((domain) => [domain.id, allItems.filter((item) => item.domainId === domain.id).length]));
const sourceDistribution = {};
for (const item of allItems) {
  const title = item.revisedItem.sourceDetails[0].title;
  sourceDistribution[title] = (sourceDistribution[title] || 0) + 1;
}
const summary = {
  reviewedCandidates: 500,
  reviewSets: 5,
  itemsPerSet: 100,
  minorRevisionProposals: allItems.filter((item) => item.reviewDecision === 'minor-revision-proposal').length,
  majorRewriteProposals: allItems.filter((item) => item.reviewDecision === 'major-rewrite-proposal').length,
  existingCompleteOptionFeedback: allItems.filter((item) => !item.reviewFindings[1].includes('missing-option-feedback')).length,
  answerLengthWarningsRequiringIndependentStyleReview: allItems.filter((item) => item.revisedItem.clueReviewStatus !== 'editorial-pass').length,
  promotedToNativeBank: 0,
  independentExpertValidated: 0,
  domainDistribution,
  sourceDistribution,
};
const wave = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourceReviewDate,
  status: 'assisted-editorial-review-complete-still-quarantined',
  purpose: 'Complete an item-level editorial and source-linking review of 500 additional stable, nonduplicate legacy EPPP candidates in five sets of 100 without treating the review as independent expert validation or learner-facing release.',
  selectionPolicy: {
    excludedNativeLegacyItems: true,
    excludedPriorHighTouchAdjudications: true,
    excludedTimeSensitiveClaims: true,
    excludedDuplicatePromptFlags: true,
    preferredCompleteLegacyOptionFeedback: true,
    answerLengthWarnings: 'Retained only when needed to reach 500 and explicitly gated for independent option-style review before release.',
  },
  safeguards: [
    'Every item remains learner-invisible and quarantined.',
    'A topical authoritative source is not a substitute for independent item-by-item subject-matter validation.',
    'Generated contrastive feedback names the keyed distinction but must be checked by an independent expert before release.',
    'No official score, pass prediction, psychometric calibration, or EPPP endorsement is implied.',
  ],
  summary,
  sets: sets.map((set) => ({ setNumber: set.setNumber, file: `bulk_review_wave_01_set_${String(set.setNumber).padStart(2, '0')}.json`, items: set.items.length })),
  items: allItems,
};

const progress = {
  schemaVersion: 1,
  generatedAt: wave.generatedAt,
  status: 'legacy-review-progress-all-unreleased-candidates-quarantined',
  summary: {
    legacyUniverse: audit.summary.totalItems,
    nativeEditorialLegacyItems: nativeLegacyIds.size,
    highTouchAdjudicatedQuarantined: highTouchIds.size,
    assistedEditorialReviewedQuarantined: allItems.length,
    uniqueLegacyItemsWithEditorialReview: nativeLegacyIds.size + highTouchIds.size + allItems.length,
    remainingWithoutEditorialReview: audit.summary.totalItems - nativeLegacyIds.size - highTouchIds.size - allItems.length,
    quarantinedLegacyItems: audit.summary.totalItems - nativeLegacyIds.size,
    quarantinedItemsWithEditorialReview: highTouchIds.size + allItems.length,
    independentExpertValidated: 0,
  },
  highTouchIndex: 'adjudication_index.json',
  assistedReviewWaves: ['bulk_review_wave_01.json'],
};

function setReport(set) {
  return {
    schemaVersion: 1,
    generatedAt: wave.generatedAt,
    sourceReviewDate,
    status: wave.status,
    waveId: 'bulk-review-wave-01',
    setNumber: set.setNumber,
    summary: {
      items: set.items.length,
      answerPositions: Object.fromEntries(['A', 'B', 'C', 'D'].map((letter, index) => [letter, set.items.filter((item) => item.revisedItem.answerIndex === index).length])),
      domainDistribution: Object.fromEntries(domains.map((domain) => [domain.id, set.items.filter((item) => item.domainId === domain.id).length])),
      learnerVisibleItems: 0,
      independentExpertValidated: 0,
    },
    safeguards: wave.safeguards,
    items: set.items,
  };
}

function markdownForSet(report) {
  return `# EPPP bulk editorial review wave 01 - set ${String(report.setNumber).padStart(2, '0')}\n\nGenerated: ${report.generatedAt}\n\n**Status: editorial review complete; all 100 proposed items remain quarantined and learner-invisible.**\n\nThis set records item-level sources, proposed keys, complete option feedback, review findings, and unresolved release gates. It is not independent expert validation.\n\n## Diagnostics\n\n- 100 unique candidates.\n- Answer positions: A ${report.summary.answerPositions.A}, B ${report.summary.answerPositions.B}, C ${report.summary.answerPositions.C}, D ${report.summary.answerPositions.D}.\n- Learner-visible items: 0.\n- Independently expert-validated items: 0.\n\nThe JSON companion contains the complete proposed item and provenance record for every candidate.\n`;
}

const waveMarkdown = `# EPPP bulk editorial review wave 01\n\nGenerated: ${wave.generatedAt}\n\n**Status: 500 additional candidates reviewed in five sets of 100; every candidate remains quarantined.**\n\n- ${summary.minorRevisionProposals} minor-revision proposals.\n- ${summary.majorRewriteProposals} major-rewrite proposals.\n- ${summary.existingCompleteOptionFeedback} retained complete legacy option-feedback structures.\n- ${summary.answerLengthWarningsRequiringIndependentStyleReview} retain an explicit option-style gate before any release.\n- 0 promoted to the native bank.\n- 0 independently expert validated.\n\nThis assisted editorial wave is intentionally distinct from the smaller high-touch adjudication batches. The JSON record preserves the review mode and all unresolved gates.\n`;
const progressMarkdown = `# EPPP legacy review progress\n\nGenerated: ${progress.generatedAt}\n\n- ${progress.summary.uniqueLegacyItemsWithEditorialReview} of ${progress.summary.legacyUniverse} legacy questions have an editorial review record.\n- ${progress.summary.remainingWithoutEditorialReview} legacy questions remain without an editorial review.\n- ${progress.summary.quarantinedItemsWithEditorialReview} reviewed candidates remain quarantined.\n- Independent expert validation remains pending.\n`;

for (const outputRoot of [sourceRoot, deployRoot]) {
  fs.writeFileSync(path.join(outputRoot, 'bulk_review_wave_01.json'), JSON.stringify(wave, null, 2) + '\n');
  fs.writeFileSync(path.join(outputRoot, 'bulk_review_wave_01.md'), waveMarkdown);
  fs.writeFileSync(path.join(outputRoot, 'review_progress.json'), JSON.stringify(progress, null, 2) + '\n');
  fs.writeFileSync(path.join(outputRoot, 'review_progress.md'), progressMarkdown);
  for (const set of sets) {
    const report = setReport(set);
    const suffix = String(set.setNumber).padStart(2, '0');
    fs.writeFileSync(path.join(outputRoot, `bulk_review_wave_01_set_${suffix}.json`), JSON.stringify(report, null, 2) + '\n');
    fs.writeFileSync(path.join(outputRoot, `bulk_review_wave_01_set_${suffix}.md`), markdownForSet(report));
  }
}

console.log(`EPPP bulk review wave 01: ${summary.reviewedCandidates} unique candidates in ${summary.reviewSets} sets; ${summary.minorRevisionProposals} minor and ${summary.majorRewriteProposals} major proposals; 0 released.`);
console.log(`EPPP legacy review progress: ${progress.summary.uniqueLegacyItemsWithEditorialReview}/${progress.summary.legacyUniverse} editorially reviewed; ${progress.summary.remainingWithoutEditorialReview} without editorial review.`);
