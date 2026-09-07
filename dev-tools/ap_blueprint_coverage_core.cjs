#!/usr/bin/env node
'use strict';

// One blueprint-coverage block for every AP pack.
//
// Before this module the eight AP QA reports published three different shapes:
// `editorialAdvisories` + `signals` (Biology, Chemistry, Physics 1),
// `editorialReviewQueue` (Psychology, U.S. History), and `advisories` +
// `coverage` (Calculus, Statistics, Government) - and the three `coverage`
// blocks disagreed with each other too (Statistics emitted booleans, Government
// emitted raw count maps). So "zero findings" meant a different thing in each
// report and nothing could be compared across packs.
//
// The honest part of this is the topic universe. Only four packs declare the
// public framework topic ids they are targeting (`blueprint.officialFrameworkTopicIds`
// or `blueprint.selectedFrameworkTopicIds`). For the other four the pack states
// no topic universe at all, so "topics represented / topics observed" would be
// 100% by construction - a gate that can never fail. Those packs report
// `topicUniverseDeclared: false` and a null coverage ratio instead, which is a
// visible gap rather than a passing score.
//
// Nothing here is a psychometric statistic, a difficulty estimate, or a
// readiness signal. It is structural coverage of a declared blueprint plus two
// balance counts that have caught real authoring defects in this repository.

const AP_BLUEPRINT_COVERAGE_SCHEMA_VERSION = 1;

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function countBy(values) {
  const counts = {};
  values.forEach((value) => { if (value) counts[value] = (counts[value] || 0) + 1; });
  return counts;
}

function median(numbers) {
  if (!numbers.length) return 0;
  const sorted = numbers.slice().sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2 * 10) / 10;
}

// The declared universe of framework topics, or null when the pack states none.
function declaredTopicIds(pack) {
  const blueprint = asRecord(pack.blueprint);
  const declared = asArray(blueprint.officialFrameworkTopicIds).length
    ? asArray(blueprint.officialFrameworkTopicIds)
    : asArray(blueprint.selectedFrameworkTopicIds);
  const ids = Array.from(new Set(declared.map((id) => String(id || '').trim()).filter(Boolean)));
  return ids.length ? ids : null;
}

function buildApBlueprintCoverage(input) {
  const pack = asRecord(asRecord(input).pack);
  const library = asRecord(asRecord(input).library);
  const items = asArray(pack.items);
  const domains = asArray(pack.domains);
  const summary = asRecord(library.summary);

  // Units
  const unitIds = domains.map((domain) => String(asRecord(domain).id || '').trim()).filter(Boolean);
  const itemsPerUnit = countBy(items.map((item) => String(asRecord(item).domainId || '').trim()));
  const unitsMissing = unitIds.filter((unitId) => !itemsPerUnit[unitId]);

  // Topics. `observed` is what the items actually carry; `declared` is the
  // public framework universe the pack claims to target, when it claims one.
  const observedTopicIds = [];
  items.forEach((item) => asArray(asRecord(item).topicIds).forEach((topicId) => {
    const id = String(topicId || '').trim();
    if (id) observedTopicIds.push(id);
  }));
  const itemsPerTopic = countBy(observedTopicIds);
  const observedUnique = Object.keys(itemsPerTopic);
  const declared = declaredTopicIds(pack);
  const topicsMissing = declared ? declared.filter((topicId) => !itemsPerTopic[topicId]) : [];
  const topicsOffBlueprint = declared ? observedUnique.filter((topicId) => !declared.includes(topicId)) : [];
  const declaredCounts = declared ? declared.map((topicId) => itemsPerTopic[topicId] || 0) : [];

  // Answer-position balance. A bank whose keys cluster on one position is
  // guessable; this repository has shipped that defect before, so the share is
  // reported for every pack rather than left to a per-pack check.
  const answerCounts = {};
  let keyedItemCount = 0;
  items.forEach((item) => {
    const record = asRecord(item);
    const index = record.answerIndex;
    if (!Number.isInteger(index) || index < 0) return;
    const choiceCount = asArray(record.choices).length;
    if (choiceCount && index >= choiceCount) return;
    answerCounts[index] = (answerCounts[index] || 0) + 1;
    keyedItemCount += 1;
  });
  const dominantAnswerCount = Object.keys(answerCounts).reduce((max, key) => Math.max(max, answerCounts[key]), 0);
  const dominantAnswerShare = keyedItemCount ? Math.round(dominantAnswerCount / keyedItemCount * 1000) / 10 : null;

  // Which library layers this pack actually ships, using the same names the Hub
  // renders them under, so an empty layer is visible instead of implied.
  const layerCounts = {
    chapters: asArray(library.chapters).length,
    sections: Number(summary.sections || 0),
    knowledgeChecks: Number(summary.knowledgeChecks || 0),
    flashcards: asArray(library.flashcards).length,
    memoryAids: asArray(library.memoryAids).length,
    diagrams: asArray(library.diagrams).length,
    diagramPlacements: asArray(library.diagramPlacements).length,
    glossaryTerms: asArray(library.glossary).length,
    constructedResponseWorkshops: asArray(library.constructedResponseWorkshops).length,
    topicDiagnosticRoutes: asArray(library.topicDiagnosticRoutes).length,
    remediationPlaybooks: asArray(library.misconceptionRemediationPlaybooks).length + asArray(library.topicRemediationPlaybooks).length,
    studySessionPlans: asArray(library.studySessionPlans).length,
    spacedReviewPlans: asArray(library.spacedReviewPlans).length,
    sourceCatalog: asArray(library.sourceCatalog).length,
  };
  const emptyLayers = Object.keys(layerCounts).filter((key) => layerCounts[key] === 0);

  // Cross-reference integrity. The Hub's study-plan view turns these ids into
  // navigation: a route's sectionId becomes a "Read the lesson first" button and
  // its itemIds become a practice set. An id that resolves to nothing is a dead
  // control, and nothing else checks these, so they are checked here.
  const chapters = asArray(library.chapters);
  const chapterIdSet = new Set(chapters.map((chapter) => asRecord(chapter).id).filter(Boolean));
  const sectionIdSet = new Set();
  const knowledgeCheckIdSet = new Set();
  chapters.forEach((chapter) => {
    asArray(asRecord(chapter).sections).forEach((section) => {
      const record = asRecord(section);
      if (record.id) sectionIdSet.add(record.id);
      asArray(record.knowledgeChecks).forEach((check) => { if (asRecord(check).id) knowledgeCheckIdSet.add(asRecord(check).id); });
    });
    asArray(asRecord(chapter).knowledgeChecks).forEach((check) => { if (asRecord(check).id) knowledgeCheckIdSet.add(asRecord(check).id); });
  });
  const flashcardIdSet = new Set(asArray(library.flashcards).map((card) => asRecord(card).id).filter(Boolean));
  const memoryAidIdSet = new Set(asArray(library.memoryAids).map((aid) => asRecord(aid).id).filter(Boolean));
  const itemIdSet = new Set(items.map((item) => asRecord(item).id).filter(Boolean));

  const unresolved = {};
  const unresolvedExamples = [];
  let crossReferencesChecked = 0;
  const checkRef = (kind, owner, id, known) => {
    if (!id) return;
    crossReferencesChecked += 1;
    if (known.has(id)) return;
    unresolved[kind] = (unresolved[kind] || 0) + 1;
    if (unresolvedExamples.length < 10) unresolvedExamples.push(kind + ': ' + owner + ' -> ' + id);
  };

  items.forEach((rawItem) => {
    const item = asRecord(rawItem);
    checkRef('item-learning-section', String(item.id || 'item'), item.learningSectionId, sectionIdSet);
    asArray(item.chapterIds).forEach((id) => checkRef('item-chapter', String(item.id || 'item'), id, chapterIdSet));
  });
  asArray(library.topicDiagnosticRoutes).forEach((rawRoute) => {
    const route = asRecord(rawRoute);
    const owner = String(route.id || 'route');
    checkRef('route-chapter', owner, route.chapterId, chapterIdSet);
    asArray(route.sectionIds).forEach((id) => checkRef('route-section', owner, id, sectionIdSet));
    asArray(route.flashcardIds).forEach((id) => checkRef('route-flashcard', owner, id, flashcardIdSet));
    asArray(route.memoryAidIds).forEach((id) => checkRef('route-memory-aid', owner, id, memoryAidIdSet));
    asArray(route.knowledgeCheckIds).forEach((id) => checkRef('route-knowledge-check', owner, id, knowledgeCheckIdSet));
    asArray(route.itemIds).forEach((id) => checkRef('route-item', owner, id, itemIdSet));
    asArray(route.diagnosticSets).forEach((rawSet) => {
      const set = asRecord(rawSet);
      const setOwner = String(set.id || owner);
      checkRef('set-section', setOwner, set.sectionId, sectionIdSet);
      asArray(set.itemIds).forEach((id) => checkRef('set-item', setOwner, id, itemIdSet));
    });
  });
  ['unitReviewRoutes', 'reviewLadders', 'practiceForms', 'studySessionPlans'].forEach((key) => {
    asArray(library[key]).forEach((rawEntry) => {
      const entry = asRecord(rawEntry);
      const owner = String(entry.id || key);
      asArray(entry.itemIds).forEach((id) => checkRef(key + '-item', owner, id, itemIdSet));
    });
  });
  const unresolvedCount = Object.keys(unresolved).reduce((sum, key) => sum + unresolved[key], 0);

  const gaps = [];
  if (unresolvedCount) gaps.push('unresolved-cross-references');
  if (!declared) gaps.push('topic-universe-not-declared');
  if (topicsMissing.length) gaps.push('declared-topics-without-items');
  if (topicsOffBlueprint.length) gaps.push('items-on-undeclared-topics');
  if (unitsMissing.length) gaps.push('units-without-items');
  if (!items.length) gaps.push('no-items');

  return {
    schemaVersion: AP_BLUEPRINT_COVERAGE_SCHEMA_VERSION,
    packId: String(pack.id || ''),
    packVersion: String(pack.version || ''),
    blueprintLabel: String(pack.blueprintLabel || ''),
    itemCount: items.length,
    units: {
      declaredCount: unitIds.length,
      representedCount: unitIds.filter((unitId) => itemsPerUnit[unitId]).length,
      missing: unitsMissing,
      itemsPerUnit,
    },
    topics: {
      // null, not 0 or 100: this pack never said what its topic universe is.
      universeDeclared: Boolean(declared),
      declaredCount: declared ? declared.length : null,
      representedCount: declared ? declared.filter((topicId) => itemsPerTopic[topicId]).length : null,
      coveragePercent: declared && declared.length
        ? Math.round(declared.filter((topicId) => itemsPerTopic[topicId]).length / declared.length * 1000) / 10
        : null,
      missing: topicsMissing,
      offBlueprint: topicsOffBlueprint,
      observedCount: observedUnique.length,
      minItemsPerDeclaredTopic: declared && declared.length ? Math.min.apply(null, declaredCounts) : null,
      medianItemsPerDeclaredTopic: declared && declared.length ? median(declaredCounts) : null,
      itemsPerTopic,
    },
    answerBalance: {
      keyedItemCount,
      counts: answerCounts,
      dominantSharePercent: dominantAnswerShare,
    },
    library: layerCounts,
    emptyLibraryLayers: emptyLayers,
    // Lesson depth per unit. One section per chapter means a unit's entire
    // native lesson is a single section, which the item routing then points
    // every question in that unit at.
    lessonDepth: {
      chapterCount: layerCounts.chapters,
      sectionCount: layerCounts.sections,
      sectionsPerChapter: layerCounts.chapters ? Math.round(layerCounts.sections / layerCounts.chapters * 10) / 10 : null,
    },
    crossReferences: {
      checked: crossReferencesChecked,
      unresolvedCount,
      unresolved,
      examples: unresolvedExamples,
    },
    gaps,
    // A structural summary, never a release, validity, or readiness judgement.
    assessment: gaps.length ? 'gaps-present' : 'structurally-complete',
    boundary: 'Structural blueprint coverage only. Not content validity, fairness, accessibility conformance, rights clearance, psychometric quality, score meaning, or release eligibility.',
  };
}

module.exports = { buildApBlueprintCoverage, AP_BLUEPRINT_COVERAGE_SCHEMA_VERSION };
