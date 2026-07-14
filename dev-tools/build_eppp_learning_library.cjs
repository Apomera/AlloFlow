#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const legacyRoot = path.join(root, 'test_prep', 'eppp_legacy');
const deployRoot = path.join(root, 'prismflow-deploy', 'public', 'test_prep');
const html = fs.readFileSync(path.join(legacyRoot, 'index.html'), 'utf8');
const scriptPaths = Array.from(html.matchAll(/<script\s+src=["']([^"']+\.js)(?:\?[^"']*)?["']/gi), (match) => match[1]);
const windowObject = {};
const documentStub = { readyState: 'complete', addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; } };
const context = vm.createContext({
  window: windowObject,
  document: documentStub,
  console: { log() {}, warn() {}, error() {} },
  setTimeout(callback) { if (typeof callback === 'function') callback(); return 1; },
  clearTimeout() {},
});
windowObject.window = windowObject;
windowObject.document = documentStub;

function run(relativePath) {
  const target = path.join(legacyRoot, relativePath);
  if (!fs.existsSync(target)) throw new Error('Missing learning-library asset: ' + relativePath);
  vm.runInContext(fs.readFileSync(target, 'utf8'), context, { filename: relativePath, timeout: 15000 });
}

function cleanText(value) {
  return String(value || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function stableId(prefix, parts) {
  const digest = crypto.createHash('sha256').update(parts.map(cleanText).join('\n')).digest('hex').slice(0, 16);
  return prefix + '-' + digest;
}

run('js/data.js');
for (const relativePath of scriptPaths.filter((entry) => /^js\/flashcards_(?:data|batch\d+)\.js$/i.test(entry))) run(relativePath);
run('js/memory_aids.js');
const chapterSourceById = new Map();
for (const relativePath of scriptPaths.filter((entry) => /^js\/textbook_ch(?:\d+|\d+_\d+)\.js$/i.test(entry))) {
  const before = (windowObject.TextbookChapters || []).length;
  run(relativePath);
  for (const chapter of (windowObject.TextbookChapters || []).slice(before)) chapterSourceById.set(String(chapter.id || ''), relativePath);
}
run('js/textbook_diagrams.js');

const domains = vm.runInContext('EPPPData.domains', context);
const memoryAids = vm.runInContext('MemoryAids.aids', context);
const chapters = windowObject.TextbookChapters || [];
const diagramTemplates = windowObject._epppDiagrams || {};
const overridesPath = path.join(root, 'test_prep', 'eppp_learning_review_overrides.json');
const reviewOverrides = fs.existsSync(overridesPath) ? JSON.parse(fs.readFileSync(overridesPath, 'utf8')) : { memoryAids: {} };
const domainByNumber = new Map(domains.map((domain) => [Number(domain.id), String(domain.name)]));
const reviewChecks = ['source-support', 'accuracy-and-currency', 'instructional-quality', 'accessibility', 'bias-and-context', 'expert-review'];

const chapterRecords = chapters.map((chapter, chapterIndex) => {
  const override = reviewOverrides.chapters && reviewOverrides.chapters[String(chapter.id || '')] || {};
  const sections = (Array.isArray(chapter.sections) ? chapter.sections : []).map((section, sectionIndex) => ({
    id: String(chapter.id || 'chapter-' + (chapterIndex + 1)) + '-section-' + (sectionIndex + 1),
    heading: cleanText(section && section.heading) || 'Untitled section',
    preview: cleanText(section && section.content).slice(0, 320),
    keyTerms: (Array.isArray(section && section.keyTerms) ? section.keyTerms : []).map(cleanText).filter(Boolean),
    hasDiagram: !!(section && section.interactiveDiagram),
    diagramDescription: cleanText(section && section.interactiveDiagram && section.interactiveDiagram.description),
    hasKnowledgeCheck: !!(section && section.knowledgeCheck),
    hasExpandableCase: !!(section && section.expandableCase),
    reviewStatus: 'review-required',
  }));
  return {
    id: String(chapter.id || 'chapter-' + (chapterIndex + 1)),
    title: cleanText(chapter.title) || 'Untitled chapter',
    domain: cleanText(chapter.domain) || domainByNumber.get(Number(chapter.domainNumber)) || 'Unassigned',
    domainNumber: Number(chapter.domainNumber) || null,
    examWeight: cleanText(chapter.examWeight),
    sectionCount: sections.length,
    diagramCount: sections.filter((section) => section.hasDiagram).length,
    knowledgeCheckCount: sections.filter((section) => section.hasKnowledgeCheck).length,
    referenceCount: Array.isArray(chapter.references) ? chapter.references.length : 0,
    hasAiReflectiveCoda: !!chapter.aiCoda,
    legacySource: chapterSourceById.get(String(chapter.id || '')) || '',
    reviewStatus: override.reviewStatus || 'review-required',
    reviewNote: cleanText(override.reviewNote),
    reviewReferences: Array.isArray(override.references) ? override.references.map(cleanText).filter(Boolean) : [],
    checks: Object.fromEntries(reviewChecks.map((check) => [check, override.checks && override.checks[check] || (check === 'accessibility' ? 'shared-renderer-pass-content-review-pending' : 'pending')])),
    sections,
  };
});

const flashcards = [];
for (const domain of domains) {
  for (const card of (Array.isArray(domain.flashcards) ? domain.flashcards : [])) {
    const front = cleanText(card && card.front);
    const back = cleanText(card && card.back);
    const override = reviewOverrides.flashcards && reviewOverrides.flashcards[front] || {};
    flashcards.push({
      id: stableId('flashcard', [domain.id, front, back]),
      domainId: Number(domain.id),
      domain: cleanText(domain.name),
      front,
      back,
      reviewStatus: override.reviewStatus || 'review-required',
      references: Array.isArray(override.references) ? override.references : [],
      reviewNote: String(override.reviewNote || ''),
      checks: { atomicAnswer: override.reviewStatus ? 'editorial-pass' : 'pending', sourceSupport: override.reviewStatus === 'source-reviewed-editorial-pass' ? 'pass' : 'pending', duplication: override.reviewStatus ? 'pass' : 'pending', accessibility: front && back ? 'structure-pass' : 'review-required' },
    });
  }
}

const aidRecords = memoryAids.map((aid) => {
  const override = reviewOverrides.memoryAids && reviewOverrides.memoryAids[String(aid.title || '')] || {};
  return ({
  id: stableId('memory-aid', [aid.domainId, aid.title, aid.type, aid.content]),
  domainId: Number(aid.domainId),
  domain: domainByNumber.get(Number(aid.domainId)) || 'Unassigned',
  title: cleanText(aid.title) || 'Untitled memory aid',
  type: cleanText(aid.type) || 'unspecified',
  content: cleanText(aid.content),
  tags: (Array.isArray(aid.tags) ? aid.tags : []).map(cleanText).filter(Boolean),
  reviewStatus: override.reviewStatus || 'review-required',
  references: Array.isArray(override.references) ? override.references : [],
  reviewNote: String(override.reviewNote || ''),
  checks: {
    accuracyAndCurrency: override.reviewStatus ? 'editorial-pass' : 'pending',
    oversimplification: override.reviewStatus ? 'editorial-pass' : 'pending',
    biasAndContext: override.reviewStatus ? 'editorial-pass' : 'pending',
    sourceSupport: override.reviewStatus === 'source-reviewed-editorial-pass' ? 'pass' : 'pending',
  },
  });
});

const diagramRecords = Object.entries(diagramTemplates).map(([key, diagram]) => ({
  id: 'diagram-' + key.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase(),
  key,
  description: cleanText(diagram && diagram.description),
  hasSvg: /<svg\b/i.test(String(diagram && diagram.svg || '')),
  reviewStatus: 'review-required',
  checks: {
    textAlternative: cleanText(diagram && diagram.description) ? 'shared-renderer-pass-content-review-pending' : 'review-required',
    reducedMotion: 'shared-renderer-pass',
    keyboardDependency: 'shared-renderer-pass',
    conceptAccuracy: 'pending',
    labelQuality: 'pending',
  },
}));

const catalog = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  libraryId: 'eppp-learning-library',
  reviewStandard: {
    checks: reviewChecks,
    meaning: 'Content remains review-required until claim-level source, accuracy, instructional, accessibility, bias/context, and qualified expert gates are complete.',
    accessibilityBaseline: 'The shared renderer provides keyboard controls, persistent section progress, diagram text alternatives, learner motion controls, and reduced-motion support.',
  },
  summary: {
    chapters: chapterRecords.length,
    sections: chapterRecords.reduce((sum, chapter) => sum + chapter.sectionCount, 0),
    diagrams: diagramRecords.length,
    diagramPlacements: chapterRecords.reduce((sum, chapter) => sum + chapter.diagramCount, 0),
    knowledgeChecks: chapterRecords.reduce((sum, chapter) => sum + chapter.knowledgeCheckCount, 0),
    flashcards: flashcards.length,
    memoryAids: aidRecords.length,
    qaPassedChapters: chapterRecords.filter((chapter) => chapter.reviewStatus === 'qa-passed').length,
    sourceReviewedChapters: chapterRecords.filter((chapter) => chapter.reviewStatus === 'source-reviewed-editorial-pass').length,
    qaPassedFlashcards: flashcards.filter((card) => card.reviewStatus === 'qa-passed').length,
    sourceReviewedFlashcards: flashcards.filter((card) => card.reviewStatus === 'source-reviewed-editorial-pass').length,
    qaPassedMemoryAids: aidRecords.filter((aid) => aid.reviewStatus === 'qa-passed').length,
    sourceReviewedMemoryAids: aidRecords.filter((aid) => aid.reviewStatus === 'source-reviewed-editorial-pass').length,
    editorialReviewedSourcePendingMemoryAids: aidRecords.filter((aid) => aid.reviewStatus === 'editorial-reviewed-source-pending').length,
  },
  chapters: chapterRecords,
  diagrams: diagramRecords,
  flashcards,
  memoryAids: aidRecords,
};

const report = {
  schemaVersion: 1,
  generatedAt: catalog.generatedAt,
  libraryId: catalog.libraryId,
  standard: catalog.reviewStandard,
  summary: catalog.summary,
  status: 'review-in-progress',
  findings: [
    'Legacy content is preserved but is not automatically approved for native publication.',
    'Shared renderer accessibility controls are implemented; each diagram still needs concept and label review.',
    'Claim-level content, flashcard, and memory-aid source review remains pending.',
  ],
};

for (const outputRoot of [path.join(root, 'test_prep'), deployRoot]) {
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.writeFileSync(path.join(outputRoot, 'eppp_learning_library.json'), JSON.stringify(catalog, null, 2) + '\n');
  fs.writeFileSync(path.join(outputRoot, 'eppp_learning_library_qa.json'), JSON.stringify(report, null, 2) + '\n');
}

console.log(`EPPP learning library: ${catalog.summary.chapters} chapters, ${catalog.summary.sections} sections, ${catalog.summary.diagrams} diagrams, ${catalog.summary.flashcards} flashcards, ${catalog.summary.memoryAids} memory aids cataloged.`);
console.log('Learning-library QA status: ' + report.status + '.');
