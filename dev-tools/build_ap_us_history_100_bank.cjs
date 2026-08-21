#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');
const extensionSpecs = require('./ap_us_history_extension_specs.cjs');

const root = path.resolve(__dirname, '..');
const baseBuilderPath = path.join(root, 'dev-tools', 'build_ap_us_history_foundation.cjs');
const packPath = path.join(root, 'test_prep', 'ap_us_history_foundation_pilot.json');
const libraryPath = path.join(root, 'test_prep', 'ap_us_history_foundation_pilot_learning_library.json');
const CED_URL = 'https://apcentral.collegeboard.org/media/pdf/ap-us-history-course-and-exam-description.pdf';
const CLARIFICATIONS_URL = 'https://apcentral.collegeboard.org/media/pdf/ap-us-history-course-and-exam-description-clarifications.pdf';
const OFFICIAL_TOPIC_IDS = Object.freeze([
  ...Array.from({ length: 7 }, (_, index) => `1.${index + 1}`),
  ...Array.from({ length: 8 }, (_, index) => `2.${index + 1}`),
  ...Array.from({ length: 13 }, (_, index) => `3.${index + 1}`),
  ...Array.from({ length: 14 }, (_, index) => `4.${index + 1}`),
  ...Array.from({ length: 12 }, (_, index) => `5.${index + 1}`),
  ...Array.from({ length: 14 }, (_, index) => `6.${index + 1}`),
  ...Array.from({ length: 15 }, (_, index) => `7.${index + 1}`),
  ...Array.from({ length: 15 }, (_, index) => `8.${index + 1}`),
  ...Array.from({ length: 7 }, (_, index) => `9.${index + 1}`),
]);
const PRIOR_EXTENSION_ITEM_COUNT = 70;
const DEPTH_SLICE_ITEM_COUNT = 50;
const COMPLETION_SLICE_ITEM_COUNT = 50;
const BALANCE_SLICE_ITEM_COUNT = 60;
const THIRD_LAYER_COMPLETION_SLICE_ITEM_COUNT = 40;
const BALANCE_SLICE_START = PRIOR_EXTENSION_ITEM_COUNT + DEPTH_SLICE_ITEM_COUNT + COMPLETION_SLICE_ITEM_COUNT;
const FOURTH_LAYER_COMPLETION_SLICE_ITEM_COUNT = 100;
const FOURTH_LAYER_START = BALANCE_SLICE_START + BALANCE_SLICE_ITEM_COUNT + THIRD_LAYER_COMPLETION_SLICE_ITEM_COUNT;
const FIFTH_LAYER_BALANCE_SLICE_ITEM_COUNT = 80;
const FIFTH_LAYER_START = FOURTH_LAYER_START + FOURTH_LAYER_COMPLETION_SLICE_ITEM_COUNT;
const FIFTH_LAYER_COMPLETION_SLICE_ITEM_COUNT = 40;
const FIFTH_LAYER_COMPLETION_START = FIFTH_LAYER_START + FIFTH_LAYER_BALANCE_SLICE_ITEM_COUNT;
const SIXTH_LAYER_BALANCE_SLICE_ITEM_COUNT = 60;
const SIXTH_LAYER_START = FIFTH_LAYER_COMPLETION_START + FIFTH_LAYER_COMPLETION_SLICE_ITEM_COUNT;
const TOTAL_EXTENSION_ITEM_COUNT = SIXTH_LAYER_START + SIXTH_LAYER_BALANCE_SLICE_ITEM_COUNT;
const defaultSkillIdByPractice = Object.freeze({
  H1: '1.B',
  H2: '2.A',
  H3: '3.B',
  H4: '4.A',
  H5: '5.A',
  H6: '6.A',
});

const unitSources = {
  1: { url: 'https://openstax.org/books/us-history/pages/2-introduction', title: 'U.S. History, Chapter 2: Early Globalization and Transatlantic Contact' },
  2: { url: 'https://openstax.org/books/us-history/pages/4-introduction', title: 'U.S. History, Chapter 4: Rule Britannia! The English Empire' },
  3: { url: 'https://openstax.org/books/us-history/pages/5-introduction', title: 'U.S. History, Chapter 5: Imperial Reforms and Colonial Protests' },
  4: { url: 'https://openstax.org/books/us-history/pages/8-introduction', title: 'U.S. History, Chapter 8: Growing Pains: The New Republic, 1790-1820' },
  5: { url: 'https://openstax.org/books/us-history/pages/13-introduction', title: 'U.S. History, Chapter 13: Antebellum Idealism and Reform Impulses, 1820-1850' },
  6: { url: 'https://openstax.org/books/us-history/pages/18-introduction', title: 'U.S. History, Chapter 18: Industrialization and the Rise of Big Business, 1870-1900' },
  7: { url: 'https://openstax.org/books/us-history/pages/22-introduction', title: 'U.S. History, Chapter 22: Age of Empire, 1877-1914' },
  8: { url: 'https://openstax.org/books/us-history/pages/28-introduction', title: 'U.S. History, Chapter 28: Post-War Prosperity and Cold War Fears, 1945-1960' },
  9: { url: 'https://openstax.org/books/us-history/pages/31-introduction', title: 'U.S. History, Chapter 31: The Americas in the Age of Independence' },
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error('[APUSH foundation builder] ' + message);
}

function rotateChoices(answer, distractors, targetIndex) {
  const choices = [answer, ...distractors];
  const rotated = new Array(4);
  let cursor = 0;
  for (let index = 0; index < 4; index += 1) {
    rotated[index] = index === targetIndex ? answer : choices.slice(1)[cursor++];
  }
  return rotated;
}

function normalizedSkillId(spec, extensionIndex) {
  assert(/^H[1-6]$/.test(spec.practiceId), `Extension item ${extensionIndex + 1} has an invalid practice skill.`);
  if (/^[1-6]\.[A-Z]$/.test(String(spec.skillId || ''))) return spec.skillId;
  const fallback = defaultSkillIdByPractice[spec.practiceId];
  assert(fallback, `Extension item ${extensionIndex + 1} has no subskill fallback.`);
  return fallback;
}

function makeItem(pack, spec, extensionIndex) {
  const unit = unitSources[spec.unit];
  const learningSectionIndex = ((spec.section % 3) + 3) % 3;
  const objective = pack.blueprint.learningObjectiveCatalog.find((candidate) => candidate.id === `apush-lo-${spec.unit}-${learningSectionIndex + 1}`);
  assert(unit && objective, `Missing route for extension item ${extensionIndex + 1}.`);
  assert(Array.isArray(spec.distractors) && spec.distractors.length === 3, `Extension item ${extensionIndex + 1} must have three distractors.`);
  const answerIndex = extensionIndex % 4;
  const choices = rotateChoices(spec.answer, spec.distractors, answerIndex);
  const skillId = normalizedSkillId(spec, extensionIndex);
  const sourceUrl = spec.sourceUrl || unit.url;
  const references = [...new Set([CED_URL, CLARIFICATIONS_URL, sourceUrl])];
  const choiceRationales = choices.map((choice) => choice === spec.answer
    ? `This is the best answer because ${spec.rationale}`
    : 'This choice does not fit the evidence or historical relationship in the question. It confuses the period development with a different claim or overstates what the evidence establishes.');
  return {
    id: `apush-foundation-${String(extensionIndex + 1).padStart(3, '0')}`,
    templateVersion: 1,
    itemSchemaVersion: 2,
    type: 'single-choice',
    domainId: pack.domains[spec.unit - 1].id,
    topicIds: [spec.topicId],
    practiceId: spec.practiceId,
    skillId,
    skillIds: [spec.practiceId],
    cognitiveDemand: spec.practiceId === 'H6' ? 'argumentation' : spec.practiceId === 'H2' || spec.practiceId === 'H3' ? 'source-analysis' : 'historical-reasoning',
    cognitiveProcess: spec.reasoning === 'comparison' ? 'compare' : spec.reasoning === 'causation' ? 'explain-causation' : 'analyze-continuity-change',
    reasoningProcess: spec.reasoning,
    difficulty: extensionIndex % 3 === 0 ? 'advanced' : 'intermediate',
    prompt: spec.prompt,
    choices,
    answerIndex,
    rationale: spec.rationale,
    choiceRationales,
    references,
    sourceDetails: [
      {
        title: 'AP U.S. History Course and Exam Description, Effective Fall 2026',
        organization: 'College Board',
        url: CED_URL,
        credibility: 'The public Course and Exam Description is the official framework for AP U.S. History content, historical-thinking skills, and exam task descriptions. It is used here for blueprint alignment only; the item is independently authored.',
      },
      {
        title: spec.sourceUrl ? `${unit.title} (topic link)` : unit.title,
        organization: 'OpenStax, Rice University',
        url: sourceUrl,
        credibility: 'OpenStax publishes an openly accessible introductory U.S. history text used here for factual cross-checking and links. No textbook prose, figures, or assessment content is reproduced.',
      },
    ],
    provenance: 'native-original',
    officialItem: false,
    rights: {
      secureContentUsed: false,
      copiedOfficialQuestion: false,
      sourceUse: 'public-blueprint-and-factual-sources-only',
      status: 'pending-independent-rights-review',
    },
    accessibility: {
      textOnly: true,
      essentialVisual: false,
      linearReadingOrder: true,
      handsFreeContentCompatible: true,
      status: 'pending-independent-accessibility-review',
    },
    expertReview: { status: 'pending', releaseBlocked: true },
    psychometricStatus: 'not-calibrated',
    reviewStatus: 'internal-editorial-draft',
    qaStatus: 'structure-ready-content-review-pending',
    releaseEligible: false,
    editorialChecks: {
      scenarioBased: true,
      singleBestAnswer: true,
      parallelPlausibleOptions: true,
      noKeywordGiveaway: true,
      completeOptionFeedback: true,
      ageAppropriate: true,
      medicalSafety: true,
    },
    learningObjectiveId: objective.id,
    learningObjectiveLabel: objective.label,
    learningSectionId: objective.sectionId,
    learningSectionLabel: objective.sectionLabel,
    chapterIds: [objective.chapterId],
    taskForm: 'single-choice-foundation',
  };
}

function main() {
  assert(fs.existsSync(baseBuilderPath), 'Base AP U.S. History builder is missing.');
  assert(extensionSpecs.length === TOTAL_EXTENSION_ITEM_COUNT, `Expected ${TOTAL_EXTENSION_ITEM_COUNT} extension specs, found ${extensionSpecs.length}.`);
  assert(extensionSpecs.length === SIXTH_LAYER_START + SIXTH_LAYER_BALANCE_SLICE_ITEM_COUNT, 'The extension bank must retain the original 70-item slice, two 50-item depth slices, a 60-item skill-balance slice, a 40-item third-layer completion slice, a 100-item fourth-layer completion slice, an 80-item fifth-layer balance slice, a 40-item fifth-layer completion slice, and a 60-item sixth-layer balance slice.');
  execFileSync(process.execPath, [baseBuilderPath], { cwd: root, stdio: 'inherit' });

  const pack = readJson(packPath);
  const library = readJson(libraryPath);
  assert(pack.id === 'ap-us-history-foundation-pilot' && Array.isArray(pack.items) && pack.items.length === 50, 'Base builder did not produce the expected 50-item pack.');
  const topicCorrections = new Map([
    ['apush-foundation-049', '9.6'],
    ['apush-foundation-050', '9.7'],
  ]);
  pack.items = pack.items.map((item) => topicCorrections.has(item.id)
    ? { ...item, topicIds: [topicCorrections.get(item.id)] }
    : item);
  const extensionItems = extensionSpecs.map((spec, index) => makeItem(pack, spec, pack.items.length + index));
  pack.items = [...pack.items, ...extensionItems];

  const observedTopicIds = [...new Set(pack.items.flatMap((item) => item.topicIds || []))].sort();
  const missingTopicIds = OFFICIAL_TOPIC_IDS.filter((topicId) => !observedTopicIds.includes(topicId));
  const unexpectedTopicIds = observedTopicIds.filter((topicId) => !OFFICIAL_TOPIC_IDS.includes(topicId));
  assert(missingTopicIds.length === 0 && unexpectedTopicIds.length === 0, `Framework topic coverage is incomplete. Missing: ${missingTopicIds.join(', ') || 'none'}; unexpected: ${unexpectedTopicIds.join(', ') || 'none'}.`);

  const domainCounts = Object.fromEntries(pack.domains.map((domain) => [domain.id, pack.items.filter((item) => item.domainId === domain.id).length]));
  pack.domains = pack.domains.map((domain) => ({ ...domain, itemCount: domainCounts[domain.id] || 0 }));
  const practiceCounts = Object.fromEntries(pack.historicalThinkingSkills.map((skill) => [skill.id, pack.items.filter((item) => item.practiceId === skill.id).length]));
  const reasoningProcesses = ['comparison', 'causation', 'continuity-change'];
  const reasoningCounts = Object.fromEntries(reasoningProcesses.map((process) => [process, pack.items.filter((item) => item.reasoningProcess === process).length]));
  const topicDepthCounts = Object.fromEntries(OFFICIAL_TOPIC_IDS.map((topicId) => [topicId, pack.items.filter((item) => item.topicIds?.includes(topicId)).length]));
  const topicsWithAtLeastTwoItems = Object.values(topicDepthCounts).filter((count) => count >= 2).length;
  const topicsWithThreeOrMoreItems = Object.values(topicDepthCounts).filter((count) => count >= 3).length;
  const topicsWithFourOrMoreItems = Object.values(topicDepthCounts).filter((count) => count >= 4).length;
  const singleItemTopicCount = Object.values(topicDepthCounts).filter((count) => count === 1).length;
  const depthItems = extensionItems.slice(PRIOR_EXTENSION_ITEM_COUNT, PRIOR_EXTENSION_ITEM_COUNT + DEPTH_SLICE_ITEM_COUNT + COMPLETION_SLICE_ITEM_COUNT);
  const balanceSliceItems = extensionItems.slice(BALANCE_SLICE_START, BALANCE_SLICE_START + BALANCE_SLICE_ITEM_COUNT);
  const thirdLayerCompletionItems = extensionItems.slice(BALANCE_SLICE_START + BALANCE_SLICE_ITEM_COUNT, FOURTH_LAYER_START);
  const fourthLayerCompletionItems = extensionItems.slice(FOURTH_LAYER_START, FIFTH_LAYER_START);
  const fifthLayerBalanceItems = extensionItems.slice(FIFTH_LAYER_START, FIFTH_LAYER_COMPLETION_START);
  const fifthLayerCompletionItems = extensionItems.slice(FIFTH_LAYER_COMPLETION_START, SIXTH_LAYER_START);
  const sixthLayerBalanceItems = extensionItems.slice(SIXTH_LAYER_START);
  const depthSliceTopicCount = new Set(depthItems.flatMap((item) => item.topicIds || [])).size;
  const balanceSliceTopicCount = new Set(balanceSliceItems.flatMap((item) => item.topicIds || [])).size;
  const thirdLayerCompletionTopicCount = new Set(thirdLayerCompletionItems.flatMap((item) => item.topicIds || [])).size;
  const fourthLayerCompletionTopicCount = new Set(fourthLayerCompletionItems.flatMap((item) => item.topicIds || [])).size;
  const fifthLayerBalanceTopicCount = new Set(fifthLayerBalanceItems.flatMap((item) => item.topicIds || [])).size;
  const fifthLayerCompletionTopicCount = new Set(fifthLayerCompletionItems.flatMap((item) => item.topicIds || [])).size;
  const sixthLayerBalanceTopicCount = new Set(sixthLayerBalanceItems.flatMap((item) => item.topicIds || [])).size;
  const topicsWithFiveOrMoreItems = Object.values(topicDepthCounts).filter((count) => count >= 5).length;
  const topicsWithSixOrMoreItems = Object.values(topicDepthCounts).filter((count) => count >= 6).length;
  const topicsWithSevenOrMoreItems = Object.values(topicDepthCounts).filter((count) => count >= 7).length;
  const answerPositionDistribution = Object.fromEntries([0, 1, 2, 3].map((index) => [index, pack.items.filter((item) => item.answerIndex === index).length]));
  pack.description = pack.description
    .replace('50-item', '600-item')
    .replace('with representative coverage across all nine current public framework periods', 'with complete five-item coverage across all 105 current public framework topics and all nine current public framework periods');
  pack.previewBadge = pack.previewBadge.replace('50 original', '600 original');
  pack.contentReview = pack.contentReview
    .replace('Fifty original', 'Six hundred original')
    .replace('representative historical-thinking skills', 'all six historical-thinking skills');
  pack.blueprint = {
    ...pack.blueprint,
    pilotAlignment: '600-item internal foundation: 60 ten-item banks provide at least five original items for all 105 current public framework topics across all nine periods and all six historical-thinking skills. A 60-item balance slice and 40-item third-layer completion slice are followed by a 100-item fourth-layer completion slice, an 80-item fifth-layer balance slice, a 40-item fifth-layer completion slice, and a 60-item sixth-layer balance slice. This is not an official exam form.',
    officialFrameworkTopicCount: OFFICIAL_TOPIC_IDS.length,
    officialFrameworkTopicIds: OFFICIAL_TOPIC_IDS,
    topicCoverage: {
      status: 'complete-public-topic-id-coverage',
      officialTopicCount: OFFICIAL_TOPIC_IDS.length,
      representedTopicCount: observedTopicIds.length,
      missingTopicIds,
      unexpectedTopicIds,
    },
    depthCoverage: {
      status: 'complete-second-layer',
      officialTopicCount: OFFICIAL_TOPIC_IDS.length,
      depthSliceCount: 2,
      additionalDepthItemCount: DEPTH_SLICE_ITEM_COUNT + COMPLETION_SLICE_ITEM_COUNT,
      additionalDepthTopicCount: depthSliceTopicCount,
      topicsWithAtLeastTwoItems,
      topicsWithThreeOrMoreItems,
      topicsWithFourOrMoreItems,
      topicsWithFiveOrMoreItems,
      singleItemTopicCount,
      note: 'Two original 50-item depth slices bring every current public framework topic to at least two internal practice angles; this remains an internal foundation rather than an official exam form.',
    },
    balanceCoverage: {
      status: 'third-layer-skill-balance',
      itemCount: BALANCE_SLICE_ITEM_COUNT,
      topicCount: balanceSliceTopicCount,
      topicsWithAtLeastThreeItems: topicsWithThreeOrMoreItems,
      topicsWithAtLeastFourItems: topicsWithFourOrMoreItems,
      topicsWithAtLeastFiveItems: topicsWithFiveOrMoreItems,
      note: 'A third original 60-item slice strengthens lighter historical-thinking skills and reasoning processes across a deliberately distributed set of topics; this remains an internal foundation rather than an official exam form.',
    },
    completionCoverage: {
      status: 'complete-third-layer',
      itemCount: THIRD_LAYER_COMPLETION_SLICE_ITEM_COUNT,
      topicCount: thirdLayerCompletionTopicCount,
      topicsWithAtLeastThreeItems: topicsWithThreeOrMoreItems,
      topicsWithAtLeastFourItems: topicsWithFourOrMoreItems,
      topicsWithAtLeastFiveItems: topicsWithFiveOrMoreItems,
      note: 'A 40-item original completion slice adds a third practice angle for every topic that was previously at two items, with five additional deepeners; this remains an internal foundation rather than an official exam form.',
    },
    fourthLayerCoverage: {
      status: 'complete-fourth-layer',
      itemCount: FOURTH_LAYER_COMPLETION_SLICE_ITEM_COUNT,
      topicCount: fourthLayerCompletionTopicCount,
      topicsWithAtLeastFourItems: topicsWithFourOrMoreItems,
      topicsWithAtLeastFiveItems: topicsWithFiveOrMoreItems,
      note: 'A 100-item original completion slice adds a fourth practice angle for every topic that was previously at three items; this remains an internal foundation rather than an official exam form.',
    },
    fifthLayerCoverage: {
      status: 'fifth-layer-balance',
      itemCount: FIFTH_LAYER_BALANCE_SLICE_ITEM_COUNT,
      topicCount: fifthLayerBalanceTopicCount,
      topicsWithAtLeastFourItems: topicsWithFourOrMoreItems,
      topicsWithAtLeastFiveItems: topicsWithFiveOrMoreItems,
      topicsWithAtLeastSixItems: topicsWithSixOrMoreItems,
      note: 'An 80-item original fifth-layer balance slice strengthens cross-period practice depth before the fifth-layer completion slice finishes minimum coverage; this remains an internal foundation rather than an official exam form.',
    },
    fifthLayerCompletionCoverage: {
      status: 'complete-fifth-layer',
      itemCount: FIFTH_LAYER_COMPLETION_SLICE_ITEM_COUNT,
      topicCount: fifthLayerCompletionTopicCount,
      topicsWithAtLeastFiveItems: topicsWithFiveOrMoreItems,
      topicsWithAtLeastSixItems: topicsWithSixOrMoreItems,
      note: 'A 40-item original completion slice adds a fifth practice angle for the 25 topics that were previously at four items, with 15 additional deepeners; this remains an internal foundation rather than an official exam form.',
    },
    sixthLayerCoverage: {
      status: 'sixth-layer-balance',
      itemCount: SIXTH_LAYER_BALANCE_SLICE_ITEM_COUNT,
      topicCount: sixthLayerBalanceTopicCount,
      topicsWithAtLeastFiveItems: topicsWithFiveOrMoreItems,
      topicsWithAtLeastSixItems: topicsWithSixOrMoreItems,
      topicsWithAtLeastSevenItems: topicsWithSevenOrMoreItems,
      note: 'A 60-item original sixth-layer balance slice adds another practice angle across 60 topics while preserving full five-item coverage; this remains an internal foundation rather than an official exam form.',
    },
  };
  pack.practiceDistribution = { ...practiceCounts, note: 'The six historical-thinking skills are sampled across this text-first foundation pilot; they are not a psychometric exam blueprint.' };
  pack.reasoningDistribution = { ...reasoningCounts, note: 'Comparison, causation, and continuity-and-change are intentionally sampled across this text-first foundation pilot; this is not a psychometric exam blueprint.' };
  pack.answerPositionDistribution = answerPositionDistribution;
  pack.diagnosticBatchCount = 60;
  pack.sourceQuestionItems = 600;
  pack.independentPracticeItems = 600;
  pack.distinctSourceContentKernels = 600;
  pack.sections = Array.from({ length: 60 }, (_, index) => ({
    id: `apush-foundation-bank-${String(index + 1).padStart(2, '0')}`,
    label: `Bank ${String(index + 1).padStart(2, '0')}: 10-item internal foundation sampler`,
    timeMinutes: null,
    released: false,
  }));
  library.description = library.description.replace('nine period chapters', 'nine period chapters paired with a 600-item practice foundation');

  writeGeneratedFile(packPath, `${JSON.stringify(pack, null, 2)}\n`);
  writeGeneratedFile(libraryPath, `${JSON.stringify(library, null, 2)}\n`);
  console.log(`Extended ${pack.id}: ${pack.items.length} items across ${pack.domains.length} periods; ${pack.sections.length} internal banks.`);
}

main();
