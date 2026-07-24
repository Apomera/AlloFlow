#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { buildDiagramCatalog } = require('./eppp_diagram_catalog.cjs');

const root = path.resolve(__dirname, '..');
const runtimeRoot = path.join(root, 'test_prep', 'eppp_legacy');
const deployRoot = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_legacy');
const indexPath = path.join(runtimeRoot, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');
const scriptPaths = Array.from(html.matchAll(/<script\s+src=["']([^"']+\.js)(?:\?[^"']*)?["']/gi), (match) => match[1]);

const quietConsole = { log() {}, warn() {}, error() {} };
const windowObject = {};
const documentStub = { readyState: 'complete', addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; } };
const context = vm.createContext({
  console: quietConsole,
  window: windowObject,
  document: documentStub,
  setTimeout: (callback) => { if (typeof callback === 'function') callback(); return 1; },
  clearTimeout() {},
});
windowObject.window = windowObject;
windowObject.document = documentStub;

function run(relativePath) {
  const filePath = path.join(runtimeRoot, relativePath);
  if (!fs.existsSync(filePath)) throw new Error('Missing loaded EPPP asset: ' + relativePath);
  vm.runInContext(fs.readFileSync(filePath, 'utf8'), context, { filename: relativePath, timeout: 15000 });
}

run('js/data.js');
for (const relativePath of scriptPaths.filter((entry) => /^js\/flashcards_(?:data|batch\d+)\.js$/i.test(entry))) run(relativePath);
const domains = vm.runInContext('EPPPData.domains', context);
const flashcardsByDomain = domains.map((domain) => ({
  domainId: domain.id,
  domainName: domain.name,
  count: Array.isArray(domain.flashcards) ? domain.flashcards.length : 0,
}));

run('js/memory_aids.js');
const memoryAids = vm.runInContext('MemoryAids.aids', context);
const memoryAidTypes = memoryAids.reduce((counts, aid) => {
  const type = String(aid.type || 'unspecified');
  counts[type] = (counts[type] || 0) + 1;
  return counts;
}, {});

const chapterScripts = scriptPaths.filter((entry) => /^js\/textbook_ch(?:\d+|\d+_\d+)\.js$/i.test(entry));
const chapterSourceById = new Map();
for (const relativePath of chapterScripts) {
  const before = (windowObject.TextbookChapters || []).length;
  run(relativePath);
  for (const chapter of (windowObject.TextbookChapters || []).slice(before)) chapterSourceById.set(String(chapter.id || ''), relativePath);
}
run('js/textbook_diagrams.js');
run('js/textbook_term_defs.js');
const chapters = windowObject.TextbookChapters || [];
const diagrams = windowObject._epppDiagrams || {};
const diagramCatalog = buildDiagramCatalog({ root, chapters, diagramTemplates: diagrams, chapterSourceById });
const termDefinitions = windowObject._epppTermDefs || {};

const chapterByDomain = {};
let sections = 0;
let knowledgeChecks = 0;
let chapterReferences = 0;
let aiCodas = 0;
let observedDiagramPlacements = 0;
for (const chapter of chapters) {
  const domain = String(chapter.domain || 'Unassigned');
  chapterByDomain[domain] = (chapterByDomain[domain] || 0) + 1;
  const chapterSections = Array.isArray(chapter.sections) ? chapter.sections : [];
  sections += chapterSections.length;
  knowledgeChecks += chapterSections.filter((section) => section && section.knowledgeCheck).length;
  observedDiagramPlacements += chapterSections.filter((section) => section && section.interactiveDiagram).length;
  chapterReferences += Array.isArray(chapter.references) ? chapter.references.length : 0;
  if (chapter.aiCoda) aiCodas += 1;
}

if (observedDiagramPlacements !== diagramCatalog.placements.length) throw new Error('Diagram placement catalog does not match learner-visible chapter placements.');

const legacyAudit = JSON.parse(fs.readFileSync(path.join(runtimeRoot, 'content_audit.json'), 'utf8'));
const nativeQaPath = path.join(root, 'test_prep', 'eppp_native_qa.json');
const nativeQa = fs.existsSync(nativeQaPath) ? JSON.parse(fs.readFileSync(nativeQaPath, 'utf8')) : null;
const learningQaPath = path.join(root, 'test_prep', 'eppp_learning_library_qa.json');
const learningQa = fs.existsSync(learningQaPath) ? JSON.parse(fs.readFileSync(learningQaPath, 'utf8')) : null;
const learningSummary = learningQa && learningQa.summary ? learningQa.summary : {};
const reviewedChapters = Number(learningSummary.sourceReviewedChapters || 0);
const reviewedFlashcards = Number(learningSummary.sourceReviewedFlashcards || 0);
const reviewedMemoryAids = Number(learningSummary.sourceReviewedMemoryAids || 0);
const retainedReviewedFlashcards = Number(learningSummary.retainedReviewedFlashcards || 0);
const retiredRedundantFlashcards = Number(learningSummary.retiredRedundantFlashcards || 0);
const editorialMemoryAids = Number(learningSummary.editorialReviewedSourcePendingMemoryAids || 0);
const navigationPages = Array.from(html.matchAll(/class=["'][^"']*nav-item[^"']*["'][^>]*data-page=["']([^"']+)["']/gi), (match) => match[1]);
const learnerModes = [...new Set(navigationPages)].filter((page) => !['dashboard', 'settings', 'about'].includes(page));

const nativeDomainIds = ['biological', 'cognitive-affective', 'social-cultural', 'lifespan', 'assessment', 'intervention', 'research', 'professional'];
const migratedNativeItems = nativeQa ? nativeQa.items.filter((item) => item.legacySourceId) : [];
const nativeCounts = migratedNativeItems.reduce((counts, item) => {
  counts[item.domainId] = (counts[item.domainId] || 0) + 1;
  return counts;
}, {});
const domainTargets = domains.map((domain, index) => {
  const weightPercent = Number(domain.weight) <= 1 ? Number(domain.weight) * 100 : Number(domain.weight);
  const legacyDomain = legacyAudit.byDomain.find((candidate) => Number(candidate.domainId) === Number(domain.id));
  const target = legacyDomain ? Number(legacyDomain.total) : 0;
  const legacySharePercent = legacyAudit.summary.totalItems ? Math.round(target / legacyAudit.summary.totalItems * 1000) / 10 : 0;
  const nativeDomainId = nativeDomainIds[index];
  const currentQaPassed = nativeCounts[nativeDomainId] || 0;
  return { domainId: domain.id, nativeDomainId, domainName: domain.name, weightPercent, legacySharePercent, target, currentQaPassed, remaining: Math.max(0, target - currentQaPassed) };
});
const nativeTargetQuestions = domainTargets.reduce((sum, domain) => sum + domain.target, 0);
const nativeCurrentQuestions = domainTargets.reduce((sum, domain) => sum + domain.currentQaPassed, 0);

const report = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  summary: {
    legacyQuestions: legacyAudit.summary.totalItems,
    nativeQaQuestions: nativeQa ? nativeQa.summary.passedItems : 0,
    nativeOriginalQaQuestions: nativeQa ? nativeQa.items.filter((item) => !item.legacySourceId && !item.authoredSourceId).length : 0,
    sourceAuthoredQaQuestions: nativeQa ? nativeQa.items.filter((item) => item.authoredSourceId).length : 0,
    legacyReviewPassedQuestions: nativeCurrentQuestions,
    nativeTargetQuestions,
    nativeRemainingToTarget: Math.max(0, nativeTargetQuestions - nativeCurrentQuestions),
    flashcards: flashcardsByDomain.reduce((sum, domain) => sum + domain.count, 0),
    memoryAids: memoryAids.length,
    textbookChapters: chapters.length,
    textbookSections: sections,
    knowledgeChecks,
    diagramTemplates: diagramCatalog.summary.diagramTemplates,
    usedDiagramTemplates: diagramCatalog.summary.usedDiagramTemplates,
    unusedDiagramTemplates: diagramCatalog.summary.unusedDiagramTemplates,
    diagramPlacements: diagramCatalog.summary.diagramPlacements,
    sharedTemplateDiagramPlacements: diagramCatalog.summary.sharedTemplateDiagramPlacements,
    inlineDiagramPlacements: diagramCatalog.summary.inlineDiagramPlacements,
    sourceReviewedDiagramTemplates: diagramCatalog.summary.sourceReviewedDiagramTemplates,
    sourceReviewedDiagramPlacements: diagramCatalog.summary.sourceReviewedDiagramPlacements,
    termDefinitions: Object.keys(termDefinitions).length,
    chapterReferences,
    aiReflectiveCodas: aiCodas,
    sourceReviewedChapters: reviewedChapters,
    sourceReviewedFlashcards: reviewedFlashcards,
    sourceReviewedMemoryAids: reviewedMemoryAids,
    retainedReviewedFlashcards,
    retiredRedundantFlashcards,
    editorialReviewedSourcePendingMemoryAids: editorialMemoryAids,
    learnerModes: learnerModes.length,
  },
  flashcardsByDomain,
  memoryAidTypes,
  diagramInventory: {
    summary: diagramCatalog.summary,
    templates: diagramCatalog.templates,
    placements: diagramCatalog.placements,
  },
  chaptersByDomain: Object.entries(chapterByDomain).map(([domain, count]) => ({ domain, count })),
  migrationTracks: [
    { contentType: 'legacy questions', count: legacyAudit.summary.totalItems, status: 'active-full-review', nextGate: 're-author or correct, source QA, item-writing QA, accessibility, independent expert validation' },
    { contentType: 'textbook chapters', count: chapters.length, status: reviewedChapters ? 'review-in-progress' : 'legacy-preserved-review-not-started', reviewedCount: reviewedChapters, nextGate: `${chapters.length - reviewedChapters} chapters still need claim-level source audit and editorial review; all chapters still require independent expert review` },
    { contentType: 'interactive diagrams', count: diagramCatalog.summary.diagramPlacements, templateCount: diagramCatalog.summary.diagramTemplates, usedTemplateCount: diagramCatalog.summary.usedDiagramTemplates, unusedTemplateCount: diagramCatalog.summary.unusedDiagramTemplates, inlinePlacementCount: diagramCatalog.summary.inlineDiagramPlacements, reviewedCount: diagramCatalog.summary.sourceReviewedDiagramPlacements, status: diagramCatalog.summary.sourceReviewedDiagramPlacements === diagramCatalog.summary.diagramPlacements ? 'first-pass-complete-expert-pending' : (diagramCatalog.summary.sourceReviewedDiagramPlacements ? 'review-in-progress' : 'legacy-preserved-review-not-started'), nextGate: 'remaining placements need concept accuracy, label, text-alternative, source-support, bias/context, and independent expert review' },
    { contentType: 'flashcards', count: flashcardsByDomain.reduce((sum, domain) => sum + domain.count, 0), status: reviewedFlashcards === flashcardsByDomain.reduce((sum, domain) => sum + domain.count, 0) ? 'first-pass-complete-expert-pending' : (reviewedFlashcards ? 'review-in-progress' : 'legacy-preserved-review-not-started'), reviewedCount: reviewedFlashcards, retainedCount: retainedReviewedFlashcards, retiredRedundantCount: retiredRedundantFlashcards, nextGate: reviewedFlashcards === flashcardsByDomain.reduce((sum, domain) => sum + domain.count, 0) ? 'independent qualified expert validation and release decisions for retained cards; retired duplicate cards remain excluded' : 'remaining cards need deduplication, atomic-answer review, source support and clue checks' },
    { contentType: 'memory aids', count: memoryAids.length, status: (reviewedMemoryAids || editorialMemoryAids) ? 'review-in-progress' : 'legacy-preserved-review-not-started', reviewedCount: reviewedMemoryAids, editorialSourcePendingCount: editorialMemoryAids, nextGate: 'remaining aids need oversimplification, outdated-guidance, bias, and source review' },
    { contentType: 'term definitions', count: Object.keys(termDefinitions).length, status: 'legacy-preserved-review-not-started', nextGate: 'definition/source/version audit and cross-link review' },
  ],
  learnerModes,
  nativeRoadmap: { targetQuestions: nativeTargetQuestions, stages: [100, 300, 1000, 2000, nativeTargetQuestions], domainTargets, practiceSampling: 'Build practice sets using blueprint weights even though the reviewed source pool is not distributed in those proportions.' },
  chapterScripts,
  migrationNote: 'Counts describe the preserved legacy workspace. Only content that passes native source, instructional, accessibility, and QA review should be promoted into AlloFlow-native learning tools.',
};

const s = report.summary;
const markdown = `# Pass the EPPP learning-content inventory

Generated: ${report.generatedAt}

## Inventory

| Content type | Count |
| --- | ---: |
| Legacy learner-visible questions | ${s.legacyQuestions} |
| Total native QA-passed questions | ${s.nativeQaQuestions} |
| Native-original QA-passed questions | ${s.nativeOriginalQaQuestions} |
| Legacy questions migrated and QA-passed | ${s.legacyReviewPassedQuestions} |
| Legacy full-review target | ${s.nativeTargetQuestions} |
| Remaining to target | ${s.nativeRemainingToTarget} |
| Flashcards | ${s.flashcards} |
| Memory aids and mnemonics | ${s.memoryAids} |
| Textbook chapters | ${s.textbookChapters} |
| Textbook sections | ${s.textbookSections} |
| Embedded knowledge checks | ${s.knowledgeChecks} |
| Interactive diagram templates | ${s.diagramTemplates} |
| Used shared diagram templates | ${s.usedDiagramTemplates} |
| Unused shared diagram templates | ${s.unusedDiagramTemplates} |
| Diagram placements in chapters | ${s.diagramPlacements} |
| Shared-template diagram placements | ${s.sharedTemplateDiagramPlacements} |
| Inline diagram placements | ${s.inlineDiagramPlacements} |
| Searchable term definitions | ${s.termDefinitions} |
| Chapter reference entries | ${s.chapterReferences} |
| AI-reflective chapter codas | ${s.aiReflectiveCodas} |
| Learner modes/pages | ${s.learnerModes} |

## Complete 2,933-question review program

| Domain | Blueprint weight | Legacy-pool share | Legacy items QA passed | Review universe | Remaining |
| --- | ---: | ---: | ---: | ---: | ---: |
${domainTargets.map((domain) => `| ${domain.domainName} | ${domain.weightPercent}% | ${domain.legacySharePercent}% | ${domain.currentQaPassed} | ${domain.target} | ${domain.remaining} |`).join('\n')}

Recommended release gates: 100-question foundation, 300-question alpha, 1,000-question beta, 2,000-question expansion, and the complete 2,933-question reviewed universe. Reviewing all questions does not guarantee publishing every original wording: failures must be corrected, diversified, or retired. Practice forms should sample by blueprint weight rather than mirror the uneven legacy-pool distribution.

## Flashcards by domain

| Domain | Cards |
| --- | ---: |
${flashcardsByDomain.map((domain) => `| ${domain.domainName} | ${domain.count} |`).join('\n')}

## Chapters by domain label

| Domain | Chapters |
| --- | ---: |
${report.chaptersByDomain.map((domain) => `| ${domain.domain} | ${domain.count} |`).join('\n')}

## Native migration tracks

| Content | Count | Status | Next gate |
| --- | ---: | --- | --- |
${report.migrationTracks.map((track) => `| ${track.contentType} | ${track.count} | ${track.status} | ${track.nextGate} |`).join('\n')}

## Learner modes

${learnerModes.map((mode) => `- ${mode}`).join('\n')}

> ${report.migrationNote}
`;

for (const outputRoot of [runtimeRoot, deployRoot]) {
  fs.writeFileSync(path.join(outputRoot, 'content_inventory.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(outputRoot, 'content_inventory.md'), markdown, 'utf8');
}

console.log('EPPP content inventory:');
for (const [key, value] of Object.entries(report.summary)) console.log(key + ': ' + value);
