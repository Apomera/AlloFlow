#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { buildDiagramCatalog } = require('./eppp_diagram_catalog.cjs');

const root = path.resolve(__dirname, '..');
const legacyRoot = path.join(root, 'test_prep', 'eppp_legacy');
const deployRoot = path.join(root, 'desktop/web-app', 'public', 'test_prep');
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
const diagramCatalog = buildDiagramCatalog({ root, chapters, diagramTemplates, chapterSourceById });
const diagramPlacementBySectionId = new Map(diagramCatalog.placements.map((placement) => [placement.sectionId, placement]));
const overridesPath = path.join(root, 'test_prep', 'eppp_learning_review_overrides.json');
const reviewOverrides = fs.existsSync(overridesPath) ? JSON.parse(fs.readFileSync(overridesPath, 'utf8')) : { memoryAids: {} };
const flashcardWavePattern = /^eppp_flashcard_review_wave_\d+\.json$/i;
const memoryAidWavePattern = /^eppp_memory_aid_review_wave_\d+\.json$/i;
const knowledgeCheckWavePattern = /^eppp_knowledge_check_review_wave_\d+\.json$/i;
const flashcardWaveRecords = new Map();
for (const filename of fs.readdirSync(path.join(root, 'test_prep')).filter((entry) => flashcardWavePattern.test(entry)).sort()) {
  const wave = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', filename), 'utf8'));
  for (const item of (Array.isArray(wave.items) ? wave.items : [])) {
    const id = String(item && item.id || '');
    if (!id) throw new Error(`Flashcard review wave ${filename} has an item without an id.`);
    if (flashcardWaveRecords.has(id)) throw new Error(`Flashcard ${id} appears in more than one review wave.`);
    flashcardWaveRecords.set(id, { ...item, reviewArtifact: filename });
  }
}
const memoryAidWaveRecords = new Map();
for (const filename of fs.readdirSync(path.join(root, 'test_prep')).filter((entry) => memoryAidWavePattern.test(entry)).sort()) {
  const wave = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', filename), 'utf8'));
  for (const item of (Array.isArray(wave.items) ? wave.items : [])) {
    const legacyId = String(item && item.legacyId || '');
    const title = String(item && item.title || '');
    if (!legacyId || !title) throw new Error(`Memory-aid review wave ${filename} has an item without a legacyId or title.`);
    if (memoryAidWaveRecords.has(legacyId)) throw new Error(`Memory aid ${legacyId} appears in more than one review wave.`);
    memoryAidWaveRecords.set(legacyId, { ...item, reviewArtifact: filename });
  }
}
const knowledgeCheckWaveRecords = new Map();
for (const filename of fs.readdirSync(path.join(root, 'test_prep')).filter((entry) => knowledgeCheckWavePattern.test(entry)).sort()) {
  const wave = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', filename), 'utf8'));
  for (const item of (Array.isArray(wave.items) ? wave.items : [])) {
    const legacyId = String(item && item.legacyId || '');
    if (!legacyId) throw new Error(`Knowledge-check review wave ${filename} has an item without a legacyId.`);
    if (knowledgeCheckWaveRecords.has(legacyId)) throw new Error(`Knowledge check ${legacyId} appears in more than one review wave.`);
    knowledgeCheckWaveRecords.set(legacyId, { ...item, reviewArtifact: filename });
  }
}
const domainByNumber = new Map(domains.map((domain) => [Number(domain.id), String(domain.name)]));
const reviewChecks = ['source-support', 'accuracy-and-currency', 'instructional-quality', 'accessibility', 'bias-and-context', 'expert-review'];

const knowledgeCheckRecords = [];
const discoveredKnowledgeCheckIds = new Set();
const chapterRecords = chapters.map((chapter, chapterIndex) => {
  const override = reviewOverrides.chapters && reviewOverrides.chapters[String(chapter.id || '')] || {};
  const releasedKnowledgeChecks = [];
  const sections = (Array.isArray(chapter.sections) ? chapter.sections : []).map((section, sectionIndex) => {
    const chapterId = String(chapter.id || 'chapter-' + (chapterIndex + 1));
    const id = chapterId + '-section-' + (sectionIndex + 1);
    const runtimeSectionId = chapterId + '-section-' + sectionIndex;
    const placement = diagramPlacementBySectionId.get(runtimeSectionId);
    const legacyCheck = section && section.knowledgeCheck;
    let knowledgeCheckId = null;
    let knowledgeCheckReviewStatus = null;
    if (legacyCheck) {
      const legacyPrompt = cleanText(legacyCheck.question);
      const legacyChoices = (Array.isArray(legacyCheck.options) ? legacyCheck.options : []).map(cleanText);
      knowledgeCheckId = stableId('knowledge-check', [chapterId, sectionIndex, legacyPrompt, ...legacyChoices]);
      if (discoveredKnowledgeCheckIds.has(knowledgeCheckId)) throw new Error(`Duplicate knowledge-check id ${knowledgeCheckId}.`);
      discoveredKnowledgeCheckIds.add(knowledgeCheckId);
      const waveOverride = knowledgeCheckWaveRecords.get(knowledgeCheckId) || {};
      const prompt = cleanText(waveOverride.prompt || legacyPrompt);
      const choices = (Array.isArray(waveOverride.choices) ? waveOverride.choices : legacyChoices).map(cleanText);
      const answerIndex = Number(waveOverride.answerIndex ?? legacyCheck.answer);
      if (!prompt || choices.length < 2 || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= choices.length) {
        throw new Error(`Knowledge check ${knowledgeCheckId} has an invalid prompt, choices, or answer index.`);
      }
      knowledgeCheckReviewStatus = cleanText(waveOverride.reviewStatus) || 'review-required';
      const isSourceReviewed = knowledgeCheckReviewStatus === 'source-reviewed-editorial-pass';
      const record = {
        id: knowledgeCheckId,
        legacyId: knowledgeCheckId,
        chapterId,
        sectionId: id,
        runtimeSectionId,
        domainId: Number(chapter.domainNumber) || null,
        domain: cleanText(chapter.domain) || domainByNumber.get(Number(chapter.domainNumber)) || 'Unassigned',
        prompt,
        choices,
        answerIndex,
        rationale: cleanText(waveOverride.rationale || legacyCheck.rationale),
        reviewStatus: knowledgeCheckReviewStatus,
        references: Array.isArray(waveOverride.references) ? waveOverride.references.map(cleanText).filter(Boolean) : [],
        sourceDetails: Array.isArray(waveOverride.sourceDetails) ? waveOverride.sourceDetails.map((source) => ({
          title: cleanText(source && source.title),
          organization: cleanText(source && source.organization),
          url: cleanText(source && source.url),
          whyReputable: cleanText(source && source.whyReputable),
        })).filter((source) => source.title && source.url && source.whyReputable) : [],
        reviewNote: cleanText(waveOverride.reviewNote),
        reviewMode: cleanText(waveOverride.reviewMode),
        reviewWave: cleanText(waveOverride.reviewWave),
        reviewDate: cleanText(waveOverride.reviewDate),
        reviewArtifact: cleanText(waveOverride.reviewArtifact),
        checks: {
          answerKey: isSourceReviewed ? 'pass' : 'pending',
          distractors: isSourceReviewed ? 'pass' : 'pending',
          rationale: isSourceReviewed ? 'pass' : 'pending',
          sourceSupport: isSourceReviewed ? 'pass' : 'pending',
          biasAndContext: isSourceReviewed ? 'pass' : 'pending',
        },
      };
      knowledgeCheckRecords.push(record);
      if (isSourceReviewed) releasedKnowledgeChecks.push(record);
    }
    return {
      id,
      runtimeSectionId,
      heading: cleanText(section && section.heading) || 'Untitled section',
      preview: cleanText(section && section.content).slice(0, 320),
      keyTerms: (Array.isArray(section && section.keyTerms) ? section.keyTerms : []).map(cleanText).filter(Boolean),
      hasDiagram: Boolean(placement),
      diagramPlacementId: placement ? placement.id : null,
      diagramId: placement ? placement.diagramId : null,
      diagramOrigin: placement ? placement.origin : null,
      diagramTemplateKey: placement ? placement.templateKey : null,
      diagramDescription: placement ? placement.description : '',
      hasKnowledgeCheck: !!legacyCheck,
      knowledgeCheckId,
      knowledgeCheckReviewStatus,
      hasExpandableCase: !!(section && section.expandableCase),
      reviewStatus: 'review-required',
    };
  });
  return {
    id: String(chapter.id || 'chapter-' + (chapterIndex + 1)),
    title: cleanText(chapter.title) || 'Untitled chapter',
    domain: cleanText(chapter.domain) || domainByNumber.get(Number(chapter.domainNumber)) || 'Unassigned',
    domainNumber: Number(chapter.domainNumber) || null,
    examWeight: cleanText(chapter.examWeight),
    sectionCount: sections.length,
    diagramCount: sections.filter((section) => section.hasDiagram).length,
    knowledgeCheckCount: sections.filter((section) => section.hasKnowledgeCheck).length,
    releasedKnowledgeCheckCount: releasedKnowledgeChecks.length,
    referenceCount: Array.isArray(chapter.references) ? chapter.references.length : 0,
    hasAiReflectiveCoda: !!chapter.aiCoda,
    legacySource: chapterSourceById.get(String(chapter.id || '')) || '',
    reviewStatus: override.reviewStatus || 'review-required',
    reviewNote: cleanText(override.reviewNote),
    reviewReferences: Array.isArray(override.references) ? override.references.map(cleanText).filter(Boolean) : [],
    checks: Object.fromEntries(reviewChecks.map((check) => [check, override.checks && override.checks[check] || (check === 'accessibility' ? 'shared-renderer-pass-content-review-pending' : 'pending')])),
    knowledgeChecks: releasedKnowledgeChecks,
    sections,
  };
});
for (const legacyId of knowledgeCheckWaveRecords.keys()) {
  if (!discoveredKnowledgeCheckIds.has(legacyId)) throw new Error(`Knowledge-check review wave references unknown legacyId ${legacyId}.`);
}

const flashcards = [];
for (const domain of domains) {
  for (const card of (Array.isArray(domain.flashcards) ? domain.flashcards : [])) {
    const legacyFront = cleanText(card && card.front);
    const legacyBack = cleanText(card && card.back);
    const id = stableId('flashcard', [domain.id, legacyFront, legacyBack]);
    const waveOverride = flashcardWaveRecords.get(id) || {};
    const manualOverride = reviewOverrides.flashcards && reviewOverrides.flashcards[legacyFront] || {};
    const override = { ...waveOverride, ...manualOverride };
    const front = cleanText(waveOverride.front || legacyFront);
    const back = cleanText(waveOverride.back || legacyBack);
    const checks = waveOverride.id ? {
        atomicAnswer: override.checks && override.checks.atomicAnswer || (override.reviewStatus ? 'editorial-pass' : 'pending'),
        sourceSupport: override.checks && override.checks.sourceSupport || (override.reviewStatus === 'source-reviewed-editorial-pass' ? 'pass' : 'pending'),
        duplication: override.checks && override.checks.duplication || (override.reviewStatus ? 'pass' : 'pending'),
        accessibility: override.checks && override.checks.accessibility || (front && back ? 'structure-pass' : 'review-required'),
        accuracyAndCurrency: override.checks && override.checks.accuracyAndCurrency || 'pending',
        biasAndContext: override.checks && override.checks.biasAndContext || 'pending',
      } : {
        atomicAnswer: override.reviewStatus ? 'editorial-pass' : 'pending',
        sourceSupport: override.reviewStatus === 'source-reviewed-editorial-pass' ? 'pass' : 'pending',
        duplication: override.reviewStatus ? 'pass' : 'pending',
        accessibility: front && back ? 'structure-pass' : 'review-required',
      };
    const waveMetadata = waveOverride.id ? {
      legacyFront,
      legacyBack,
      revisionApplied: Boolean(waveOverride.revisionApplied),
      revisionReason: cleanText(waveOverride.revisionReason),
      reviewMode: cleanText(override.reviewMode),
      reviewWave: cleanText(override.reviewWave),
      reviewDate: cleanText(override.reviewDate),
      reviewArtifact: cleanText(waveOverride.reviewArtifact),
      sourceDetails: Array.isArray(override.sourceDetails) ? override.sourceDetails : [],
      contentDisposition: cleanText(override.contentDisposition) || 'retain-after-rewrite',
      independentExpertStatus: cleanText(override.independentExpertStatus) || 'not-started',
      productionStatus: cleanText(override.productionStatus) || 'not-production-validated',
      learnerVisible: override.learnerVisible === true,
    } : override.reviewStatus === 'source-reviewed-editorial-pass' ? {
      contentDisposition: cleanText(override.contentDisposition) || 'retain-after-rewrite',
      independentExpertStatus: cleanText(override.independentExpertStatus) || 'not-started',
      productionStatus: cleanText(override.productionStatus) || 'not-production-validated',
      learnerVisible: override.learnerVisible === true,
    } : {};
    flashcards.push({
      id,
      domainId: Number(domain.id),
      domain: cleanText(domain.name),
      front,
      back,
      reviewStatus: override.reviewStatus || 'review-required',
      references: Array.isArray(override.references) ? override.references : [],
      reviewNote: String(override.reviewNote || ''),
      checks,
      ...waveMetadata,
    });
  }
}

const aidRecords = memoryAids.map((aid) => {
  const legacyId = stableId('memory-aid', [aid.domainId, aid.title, aid.type, aid.content]);
  const waveOverride = memoryAidWaveRecords.get(legacyId) || {};
  const manualOverride = reviewOverrides.memoryAids && reviewOverrides.memoryAids[String(aid.title || '')] || {};
  const override = { ...waveOverride, ...manualOverride };
  return ({
  id: legacyId,
  domainId: Number(aid.domainId),
  domain: domainByNumber.get(Number(aid.domainId)) || 'Unassigned',
  title: cleanText(aid.title) || 'Untitled memory aid',
  type: cleanText(aid.type) || 'unspecified',
  content: cleanText(override.content || aid.content),
  tags: (Array.isArray(aid.tags) ? aid.tags : []).map(cleanText).filter(Boolean),
  reviewStatus: override.reviewStatus || 'review-required',
  references: Array.isArray(override.references) ? override.references : [],
  sourceDetails: Array.isArray(override.sourceDetails) ? override.sourceDetails.map((source) => ({
    title: cleanText(source && source.title),
    organization: cleanText(source && source.organization),
    url: cleanText(source && source.url),
    whyReputable: cleanText(source && source.whyReputable),
  })).filter((source) => source.title && source.url && source.whyReputable) : [],
  reviewNote: String(override.reviewNote || ''),
  reviewArtifact: cleanText(waveOverride.reviewArtifact),
  checks: {
    accuracyAndCurrency: override.reviewStatus ? 'editorial-pass' : 'pending',
    oversimplification: override.reviewStatus ? 'editorial-pass' : 'pending',
    biasAndContext: override.reviewStatus ? 'editorial-pass' : 'pending',
    sourceSupport: override.reviewStatus === 'source-reviewed-editorial-pass' ? 'pass' : 'pending',
  },
  });
});

const diagramRecords = diagramCatalog.templates;
const diagramPlacementRecords = diagramCatalog.placements;

const catalog = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  libraryId: 'eppp-learning-library',
  reviewStandard: {
    checks: reviewChecks,
    meaning: 'Content remains review-required until claim-level source, accuracy, instructional, accessibility, bias/context, and qualified expert gates are complete.',
    accessibilityBaseline: 'The shared renderer provides keyboard controls, persistent section progress, diagram text alternatives, learner motion controls, and reduced-motion support.',
    diagramCatalog: 'Shared templates and concrete learner-visible placements are cataloged separately. Inline diagrams exist only as placements; unused templates remain visible in the template registry but are not counted as placements.',
  },
  summary: {
    chapters: chapterRecords.length,
    sections: chapterRecords.reduce((sum, chapter) => sum + chapter.sectionCount, 0),
    diagrams: diagramRecords.length,
    ...diagramCatalog.summary,
    knowledgeChecks: knowledgeCheckRecords.length,
    flashcards: flashcards.length,
    memoryAids: aidRecords.length,
    qaPassedChapters: chapterRecords.filter((chapter) => chapter.reviewStatus === 'qa-passed').length,
    sourceReviewedChapters: chapterRecords.filter((chapter) => chapter.reviewStatus === 'source-reviewed-editorial-pass').length,
    qaPassedFlashcards: flashcards.filter((card) => card.reviewStatus === 'qa-passed').length,
    sourceReviewedFlashcards: flashcards.filter((card) => card.reviewStatus === 'source-reviewed-editorial-pass').length,
    retainedReviewedFlashcards: flashcards.filter((card) => card.reviewStatus === 'source-reviewed-editorial-pass' && card.contentDisposition !== 'retire-redundant').length,
    retiredRedundantFlashcards: flashcards.filter((card) => card.contentDisposition === 'retire-redundant').length,
    qaPassedMemoryAids: aidRecords.filter((aid) => aid.reviewStatus === 'qa-passed').length,
    qaPassedKnowledgeChecks: knowledgeCheckRecords.filter((item) => item.reviewStatus === 'qa-passed').length,
    sourceReviewedKnowledgeChecks: knowledgeCheckRecords.filter((item) => item.reviewStatus === 'source-reviewed-editorial-pass').length,
    releasedKnowledgeChecks: knowledgeCheckRecords.filter((item) => item.reviewStatus === 'source-reviewed-editorial-pass').length,
    reviewRequiredKnowledgeChecks: knowledgeCheckRecords.filter((item) => item.reviewStatus === 'review-required').length,
    sourceReviewedMemoryAids: aidRecords.filter((aid) => aid.reviewStatus === 'source-reviewed-editorial-pass').length,
    releasedMemoryAids: aidRecords.filter((aid) => aid.reviewStatus === 'source-reviewed-editorial-pass').length,
    releasedFlashcards: flashcards.filter((card) => card.reviewStatus === 'source-reviewed-editorial-pass' && card.contentDisposition !== 'retire-redundant').length,
    editorialReviewedSourcePendingMemoryAids: aidRecords.filter((aid) => aid.reviewStatus === 'editorial-reviewed-source-pending').length,
  },
  chapters: chapterRecords,
  knowledgeChecks: knowledgeCheckRecords,
  diagrams: diagramRecords,
  diagramPlacements: diagramPlacementRecords,
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
    `Shared renderer accessibility controls are implemented. ${catalog.summary.sourceReviewedDiagramPlacements} of ${catalog.summary.diagramPlacements} learner-visible placements have source-review records; ${catalog.summary.diagramPlacements - catalog.summary.sourceReviewedDiagramPlacements} placements still need concept and label review.`,
    `${catalog.summary.diagramPlacements} learner-visible diagram placements are cataloged: ${catalog.summary.sharedTemplateDiagramPlacements} use shared templates and ${catalog.summary.inlineDiagramPlacements} are inline chapter diagrams. ${catalog.summary.unusedDiagramTemplates} shared templates are currently unused.`,
    `${catalog.summary.sourceReviewedFlashcards} of ${catalog.summary.flashcards} flashcards have source-review records; ${catalog.summary.flashcards - catalog.summary.sourceReviewedFlashcards} remain in first-pass review, and independent qualified expert validation is still pending.`,
    `${catalog.summary.retiredRedundantFlashcards} source-reviewed duplicate flashcards are explicitly retired from future learner release rather than counted as distinct study targets.`,
    `${catalog.summary.sourceReviewedKnowledgeChecks} of ${catalog.summary.knowledgeChecks} knowledge checks have source-review records and are released to their chapter payloads; ${catalog.summary.reviewRequiredKnowledgeChecks} remain gated for review.`,
  ],
};

for (const outputRoot of [path.join(root, 'test_prep'), deployRoot]) {
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.writeFileSync(path.join(outputRoot, 'eppp_learning_library.json'), JSON.stringify(catalog, null, 2) + '\n');
  fs.writeFileSync(path.join(outputRoot, 'eppp_learning_library_qa.json'), JSON.stringify(report, null, 2) + '\n');
}

console.log(`EPPP learning library: ${catalog.summary.chapters} chapters, ${catalog.summary.sections} sections, ${catalog.summary.diagrams} diagrams, ${catalog.summary.flashcards} flashcards, ${catalog.summary.memoryAids} memory aids cataloged.`);
console.log('Learning-library QA status: ' + report.status + '.');
