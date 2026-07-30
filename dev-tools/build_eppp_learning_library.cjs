#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { buildDiagramCatalog } = require('./eppp_diagram_catalog.cjs');
const {
  copyReferencedReviewArtifacts,
  resolveReferencedReviewArtifacts,
} = require('./eppp_learning_artifact_support.cjs');
const {
  fingerprintManifest,
  migrateLegacyHtmlContent,
  migrateLegacyTextRecord,
} = require('./eppp_learning_content_migration.cjs');
const {
  buildNativeDiagramProjection,
  buildNativeGlossaryProjection,
} = require('./eppp_native_learning_payloads.cjs');
const {
  openEpppMigrationSourceArchive,
} = require('./eppp_migration_source_archive.cjs');

const root = path.resolve(__dirname, '..');
const deployRoot = path.join(root, 'desktop/web-app', 'public', 'test_prep');
const migrationArchive = openEpppMigrationSourceArchive({ workspaceRoot: root });
const migrationExecution = migrationArchive.manifest.execution.learningLibrary;
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

function writeFileWithRetry(filePath, contents) {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      fs.writeFileSync(filePath, contents, 'utf8');
      return;
    } catch (error) {
      lastError = error;
      if (!['EBUSY', 'EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
  throw lastError;
}

function run(relativePath) {
  vm.runInContext(
    migrationArchive.readText(relativePath),
    context,
    { filename: relativePath, timeout: 15000 },
  );
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

for (const relativePath of migrationExecution.baseData) run(relativePath);
for (const relativePath of migrationExecution.flashcards) run(relativePath);
for (const relativePath of migrationExecution.memoryAids) run(relativePath);
const chapterSourceById = new Map();
for (const relativePath of migrationExecution.chapters) {
  const before = (windowObject.TextbookChapters || []).length;
  run(relativePath);
  for (const chapter of (windowObject.TextbookChapters || []).slice(before)) chapterSourceById.set(String(chapter.id || ''), relativePath);
}
for (const relativePath of migrationExecution.diagrams) run(relativePath);
for (const relativePath of migrationExecution.glossary) run(relativePath);

const termDefinitionsSource = migrationArchive.readText(migrationExecution.glossary[0]);
const domains = vm.runInContext('EPPPData.domains', context);
const memoryAids = vm.runInContext('MemoryAids.aids', context);
const chapters = windowObject.TextbookChapters || [];
const diagramTemplates = windowObject._epppDiagrams || {};
const termDefinitions = windowObject._epppTermDefs || {};
const diagramCatalog = buildDiagramCatalog({ root, chapters, diagramTemplates, chapterSourceById });
const nativeDiagramProjection = buildNativeDiagramProjection({
  diagramTemplates,
  chapters,
  diagramCatalog,
  chapterSourceById,
});
const diagramPlacementBySectionId = new Map(diagramCatalog.placements.map((placement) => [placement.sectionId, placement]));
const overridesPath = path.join(root, 'test_prep', 'eppp_learning_review_overrides.json');
const reviewOverrides = fs.existsSync(overridesPath) ? JSON.parse(fs.readFileSync(overridesPath, 'utf8')) : { memoryAids: {} };
const referenceCatalogPath = path.join(root, 'test_prep', 'reference_catalog.json');
const referenceCatalog = fs.existsSync(referenceCatalogPath) ? JSON.parse(fs.readFileSync(referenceCatalogPath, 'utf8')) : {};
const reviewedSourceCorrections = {
  'https://pubmed.ncbi.nlm.nih.gov/31420757/': {
    title: 'Tardive Dyskinesia: Treatment Update',
    organization: 'Current Neurology and Neuroscience Reports; PubMed, U.S. National Library of Medicine',
  },
  'https://pubmed.ncbi.nlm.nih.gov/11818582/': {
    title: 'Psychoneuroimmunology and Psychosomatic Medicine: Back to the Future',
    organization: 'Psychosomatic Medicine; PubMed, U.S. National Library of Medicine',
  },
};
const flashcardWavePattern = /^eppp_flashcard_review_wave_\d+\.json$/i;
const memoryAidWavePattern = /^eppp_memory_aid_review_wave_\d+\.json$/i;
const memoryAidCorrectionWavePattern = /^eppp_memory_aid_correction_wave_\d+\.json$/i;
const knowledgeCheckWavePattern = /^eppp_knowledge_check_review_wave_\d+\.json$/i;
function orderedMemoryAidWaveFiles(directory) {
  const files = fs.readdirSync(directory)
    .filter((entry) => memoryAidWavePattern.test(entry))
    .map((filename) => {
      const match = filename.match(/_(\d+)\.json$/i);
      return { filename, waveNumber: Number(match && match[1]) };
    })
    .sort((left, right) => left.waveNumber - right.waveNumber || left.filename.localeCompare(right.filename));
  for (let index = 0; index < files.length; index += 1) {
    const expectedWaveNumber = index + 1;
    if (files[index].waveNumber !== expectedWaveNumber) {
      throw new Error(`Memory-aid review waves must be contiguous from Wave 01; expected Wave ${String(expectedWaveNumber).padStart(2, '0')} before ${files[index].filename}.`);
    }
  }
  return files.map((entry) => entry.filename);
}
function orderedMemoryAidCorrectionWaveFiles(directory) {
  const files = fs.readdirSync(directory)
    .filter((entry) => memoryAidCorrectionWavePattern.test(entry))
    .map((filename) => {
      const match = filename.match(/_(\d+)\.json$/i);
      return { filename, waveNumber: Number(match && match[1]) };
    })
    .sort((left, right) => left.waveNumber - right.waveNumber || left.filename.localeCompare(right.filename));
  for (let index = 0; index < files.length; index += 1) {
    const expectedWaveNumber = index + 1;
    if (files[index].waveNumber !== expectedWaveNumber) {
      throw new Error(`Memory-aid correction waves must be contiguous from Wave 01; expected Wave ${String(expectedWaveNumber).padStart(2, '0')} before ${files[index].filename}.`);
    }
  }
  return files.map((entry) => entry.filename);
}
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
for (const filename of orderedMemoryAidWaveFiles(path.join(root, 'test_prep'))) {
  const wave = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', filename), 'utf8'));
  for (const item of (Array.isArray(wave.items) ? wave.items : [])) {
    const legacyId = String(item && item.legacyId || '');
    const title = String(item && item.title || '');
    if (!legacyId || !title) throw new Error(`Memory-aid review wave ${filename} has an item without a legacyId or title.`);
    if (memoryAidWaveRecords.has(legacyId)) throw new Error(`Memory aid ${legacyId} appears in more than one review wave.`);
    memoryAidWaveRecords.set(legacyId, { ...item, reviewArtifact: filename });
  }
}
const knownMemoryAidById = new Map(memoryAids.map((aid) => [
  stableId('memory-aid', [aid.domainId, aid.title, aid.type, aid.content]),
  aid,
]));
const memoryAidCorrectionRecords = new Map();
for (const filename of orderedMemoryAidCorrectionWaveFiles(path.join(root, 'test_prep'))) {
  const wave = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', filename), 'utf8'));
  for (const item of (Array.isArray(wave.items) ? wave.items : [])) {
    const legacyId = String(item && item.legacyId || '');
    const expectedTitle = cleanText(item && item.expectedTitle);
    const supersedesArtifact = cleanText(item && item.supersedesArtifact);
    const aid = knownMemoryAidById.get(legacyId);
    if (!legacyId || !expectedTitle || !supersedesArtifact) {
      throw new Error(`Memory-aid correction wave ${filename} has an item without a legacyId, expectedTitle, or supersedesArtifact.`);
    }
    if (!aid) throw new Error(`Memory-aid correction wave ${filename} targets unknown legacyId ${legacyId}.`);
    if (cleanText(aid.title) !== expectedTitle) {
      throw new Error(`Memory-aid correction ${legacyId} expected title "${expectedTitle}" but found "${cleanText(aid.title)}".`);
    }
    if (memoryAidCorrectionRecords.has(legacyId)) {
      throw new Error(`Memory aid ${legacyId} appears in more than one correction wave.`);
    }
    const numberedReview = memoryAidWaveRecords.get(legacyId);
    const manualReview = reviewOverrides.memoryAids && reviewOverrides.memoryAids[String(aid.title || '')] || {};
    const actualSupersededArtifact = numberedReview
      ? numberedReview.reviewArtifact
      : (manualReview.reviewStatus === 'source-reviewed-editorial-pass' ? 'eppp_learning_review_overrides.json' : '');
    if (!actualSupersededArtifact || actualSupersededArtifact !== supersedesArtifact) {
      throw new Error(`Memory-aid correction ${legacyId} expected to supersede ${supersedesArtifact} but the reviewed base is ${actualSupersededArtifact || 'missing'}.`);
    }
    if (item.reviewStatus !== 'source-reviewed-editorial-pass') {
      throw new Error(`Memory-aid correction ${legacyId} must preserve source-reviewed-editorial-pass status.`);
    }
    if (item.independentExpertStatus !== 'not-started' || item.productionStatus !== 'not-production-validated') {
      throw new Error(`Memory-aid correction ${legacyId} must preserve explicit expert-pending and production-pending gates.`);
    }
    const references = Array.isArray(item.references) ? item.references : [];
    const sourceUrls = Array.isArray(item.sourceDetails) ? item.sourceDetails.map((source) => source && source.url) : [];
    if (!references.length || JSON.stringify(references) !== JSON.stringify(sourceUrls)) {
      throw new Error(`Memory-aid correction ${legacyId} must have exactly aligned references and sourceDetails URLs.`);
    }
    memoryAidCorrectionRecords.set(legacyId, { ...item, reviewArtifact: filename });
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
function reviewedSourceDetails(references) {
  return (Array.isArray(references) ? references : []).map((urlValue) => {
    const url = cleanText(urlValue);
    const source = { ...(referenceCatalog[url] || {}), ...(reviewedSourceCorrections[url] || {}) };
    let fallbackOrganization = 'Authoritative source';
    try { fallbackOrganization = new URL(url).hostname; } catch {}
    return {
      title: cleanText(source.title) || 'Reviewed source for this flashcard',
      organization: cleanText(source.organization) || fallbackOrganization,
      url,
      credibility: cleanText(source.credibility || source.summary) || 'This source is retained in the EPPP reference catalog and was reviewed for direct topical alignment with the flashcard claim.',
    };
  }).filter((source) => source.url);
}

const domainByNumber = new Map(domains.map((domain) => [Number(domain.id), String(domain.name)]));
const reviewChecks = ['source-support', 'accuracy-and-currency', 'instructional-quality', 'accessibility', 'bias-and-context', 'expert-review'];

const knowledgeCheckRecords = [];
const discoveredKnowledgeCheckIds = new Set();
const chapterRecords = chapters.map((chapter, chapterIndex) => {
  const chapterId = String(chapter.id || 'chapter-' + (chapterIndex + 1));
  const sourceReferences = (Array.isArray(chapter.references) ? chapter.references : []).map((reference, referenceIndex) => {
    const migration = migrateLegacyHtmlContent(reference);
    if (!migration.plainText || !migration.blocks.length) {
      throw new Error(`Chapter ${chapterId} reference ${referenceIndex + 1} did not produce native content.`);
    }
    return {
      id: `${chapterId}-reference-${referenceIndex + 1}`,
      legacyReferenceIndex: referenceIndex + 1,
      text: migration.plainText,
      blocks: migration.blocks,
      sourceCharacters: migration.sourceCharacters,
      textCharacters: migration.plainTextCharacters,
      contentFingerprints: migration.fingerprints,
    };
  });
  const reflectiveCoda = chapter.aiCoda
    ? migrateLegacyTextRecord(chapter.aiCoda, ['teaser', 'content', 'studyNote'])
    : null;
  const override = reviewOverrides.chapters && reviewOverrides.chapters[String(chapter.id || '')] || {};
  const chapterReviewStatus = override.reviewStatus || 'review-required';
  const chapterIsSourceReviewed = chapterReviewStatus === 'source-reviewed-editorial-pass';
  const chapterReviewReferences = Array.isArray(override.references) ? override.references.map(cleanText).filter(Boolean) : [];
  const chapterReviewChecks = Object.fromEntries(reviewChecks.map((check) => [check, override.checks && override.checks[check] || (check === 'accessibility' ? 'shared-renderer-pass-content-review-pending' : 'pending')]));
  if (chapterIsSourceReviewed && (!chapterReviewReferences.length || reviewChecks.some((check) => !override.checks || !override.checks[check]))) {
    throw new Error('Source-reviewed chapter ' + (chapter.id || chapterIndex + 1) + ' lacks complete chapter-level provenance.');
  }
  const releasedKnowledgeChecks = [];
  const sections = (Array.isArray(chapter.sections) ? chapter.sections : []).map((section, sectionIndex) => {
    const id = chapterId + '-section-' + (sectionIndex + 1);
    const runtimeSectionId = chapterId + '-section-' + sectionIndex;
    const placement = diagramPlacementBySectionId.get(runtimeSectionId);
    const legacyCheck = section && section.knowledgeCheck;
    const contentMigration = migrateLegacyHtmlContent(section && section.content);
    if (!contentMigration.plainText || !contentMigration.blocks.length) {
      throw new Error(`Section ${id} did not produce complete native content.`);
    }
    const expandableCase = section && section.expandableCase
      ? migrateLegacyTextRecord(section.expandableCase, ['title', 'clinicalDescription', 'diagnosis', 'explanation'])
      : null;
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
      legacySectionIndex: sectionIndex + 1,
      heading: cleanText(section && section.heading) || 'Untitled section',
      contentSchemaVersion: 1,
      contentComplete: true,
      contentTruncated: false,
      content: contentMigration.plainText,
      contentBlocks: contentMigration.blocks,
      sourceContentCharacters: contentMigration.sourceCharacters,
      contentCharacters: contentMigration.plainTextCharacters,
      contentFingerprints: contentMigration.fingerprints,
      preview: contentMigration.plainText.slice(0, 320),
      previewTruncated: contentMigration.plainText.length > 320,
      keyTerms: (Array.isArray(section && section.keyTerms) ? section.keyTerms : []).map(cleanText).filter(Boolean),
      hasDiagram: Boolean(placement),
      diagramPlacementId: placement ? placement.id : null,
      diagramId: placement ? placement.diagramId : null,
      nativeDiagramId: placement ? placement.diagramId : null,
      diagramOrigin: placement ? placement.origin : null,
      diagramTemplateKey: placement ? placement.templateKey : null,
      diagramDescription: placement ? placement.description : '',
      hasKnowledgeCheck: !!legacyCheck,
      knowledgeCheckId,
      knowledgeCheckReviewStatus,
      hasExpandableCase: !!(section && section.expandableCase),
      expandableCase,
      reviewStatus: chapterReviewStatus,
      reviewScope: chapterIsSourceReviewed ? 'containing-chapter' : 'section-review-pending',
      reviewArtifact: chapterIsSourceReviewed ? 'eppp_learning_review_overrides.json' : '',
      reviewEvidenceChapterId: chapterIsSourceReviewed ? chapterId : null,
      reviewReferences: [...chapterReviewReferences],
      reviewNote: cleanText(override.reviewNote),
      checks: { ...chapterReviewChecks },
    };
  });
  return {
    id: chapterId,
    legacyChapterIndex: chapterIndex + 1,
    title: cleanText(chapter.title) || 'Untitled chapter',
    domain: cleanText(chapter.domain) || domainByNumber.get(Number(chapter.domainNumber)) || 'Unassigned',
    domainNumber: Number(chapter.domainNumber) || null,
    examWeight: cleanText(chapter.examWeight),
    sectionCount: sections.length,
    diagramCount: sections.filter((section) => section.hasDiagram).length,
    knowledgeCheckCount: sections.filter((section) => section.hasKnowledgeCheck).length,
    releasedKnowledgeCheckCount: releasedKnowledgeChecks.length,
    referenceCount: sourceReferences.length,
    references: sourceReferences.map((reference) => reference.text),
    sourceReferences,
    hasAiReflectiveCoda: !!chapter.aiCoda,
    reflectiveCoda,
    legacySource: chapterSourceById.get(String(chapter.id || '')) || '',
    reviewStatus: chapterReviewStatus,
    reviewNote: cleanText(override.reviewNote),
    reviewReferences: chapterReviewReferences,
    checks: chapterReviewChecks,
    knowledgeChecks: releasedKnowledgeChecks,
    sections,
  };
});

const expectedLegacySectionMappings = chapters.flatMap((chapter, chapterIndex) => {
  const chapterId = String(chapter.id || 'chapter-' + (chapterIndex + 1));
  return (Array.isArray(chapter.sections) ? chapter.sections : []).map((section, sectionIndex) => ({
    chapterId,
    legacySectionIndex: sectionIndex + 1,
  }));
});
const nativeSectionRecords = chapterRecords.flatMap((chapter) => chapter.sections.map((section) => ({
  chapterId: chapter.id,
  section,
})));
if (expectedLegacySectionMappings.length !== 278) {
  throw new Error(`The phase-one EPPP native migration is locked to 278 reviewed legacy sections; found ${expectedLegacySectionMappings.length}. Deliberately review and update the migration gate before changing this total.`);
}
const expectedMappingKeys = expectedLegacySectionMappings.map((entry) => `${entry.chapterId}:${entry.legacySectionIndex}`);
const nativeMappingKeys = nativeSectionRecords.map(({ chapterId, section }) => `${chapterId}:${section.legacySectionIndex}`);
const duplicateMappingKeys = nativeMappingKeys.filter((key, index) => nativeMappingKeys.indexOf(key) !== index);
const missingMappingKeys = expectedMappingKeys.filter((key) => !nativeMappingKeys.includes(key));
const unexpectedMappingKeys = nativeMappingKeys.filter((key) => !expectedMappingKeys.includes(key));
const nativeSectionIds = nativeSectionRecords.map(({ section }) => section.id);
const duplicateSectionIds = nativeSectionIds.filter((id, index) => nativeSectionIds.indexOf(id) !== index);
if (duplicateMappingKeys.length || missingMappingKeys.length || unexpectedMappingKeys.length || duplicateSectionIds.length) {
  throw new Error([
    'EPPP native section mapping is not one-to-one.',
    duplicateMappingKeys.length ? `duplicate mappings: ${[...new Set(duplicateMappingKeys)].join(', ')}` : '',
    missingMappingKeys.length ? `missing mappings: ${missingMappingKeys.join(', ')}` : '',
    unexpectedMappingKeys.length ? `unexpected mappings: ${unexpectedMappingKeys.join(', ')}` : '',
    duplicateSectionIds.length ? `duplicate section ids: ${[...new Set(duplicateSectionIds)].join(', ')}` : '',
  ].filter(Boolean).join(' '));
}
const incompleteNativeSections = nativeSectionRecords.filter(({ section }) => (
  section.contentComplete !== true
  || section.contentTruncated !== false
  || !section.content
  || !Array.isArray(section.contentBlocks)
  || !section.contentBlocks.length
  || section.contentCharacters !== section.content.length
));
if (incompleteNativeSections.length) {
  throw new Error(`EPPP native content is incomplete for: ${incompleteNativeSections.map(({ section }) => section.id).join(', ')}`);
}
const sourceContentManifest = nativeSectionRecords.map(({ chapterId, section }) => ({
  chapterId,
  sectionId: section.id,
  legacySectionIndex: section.legacySectionIndex,
  sourceCharacters: section.sourceContentCharacters,
  sha256: section.contentFingerprints.legacySource,
}));
const plainTextContentManifest = nativeSectionRecords.map(({ chapterId, section }) => ({
  chapterId,
  sectionId: section.id,
  legacySectionIndex: section.legacySectionIndex,
  characters: section.contentCharacters,
  sha256: section.contentFingerprints.plainText,
}));
const structuredContentManifest = nativeSectionRecords.map(({ chapterId, section }) => ({
  chapterId,
  sectionId: section.id,
  legacySectionIndex: section.legacySectionIndex,
  sha256: section.contentFingerprints.structuredBlocks,
}));
const supplementalContentManifest = [
  ...nativeSectionRecords
    .filter(({ section }) => section.expandableCase)
    .map(({ chapterId, section }) => ({
      type: 'expandable-case',
      chapterId,
      sectionId: section.id,
      legacySectionIndex: section.legacySectionIndex,
      sourceCharacters: section.expandableCase.sourceCharacters,
      plainTextCharacters: section.expandableCase.plainTextCharacters,
      contentFingerprints: section.expandableCase.contentFingerprints,
    })),
  ...chapterRecords
    .filter((chapter) => chapter.reflectiveCoda)
    .map((chapter) => ({
      type: 'reflective-coda',
      chapterId: chapter.id,
      sourceCharacters: chapter.reflectiveCoda.sourceCharacters,
      plainTextCharacters: chapter.reflectiveCoda.plainTextCharacters,
      contentFingerprints: chapter.reflectiveCoda.contentFingerprints,
    })),
  ...chapterRecords.flatMap((chapter) => chapter.sourceReferences.map((reference) => ({
    type: 'source-reference',
    chapterId: chapter.id,
    legacyReferenceIndex: reference.legacyReferenceIndex,
    sourceCharacters: reference.sourceCharacters,
    textCharacters: reference.textCharacters,
    contentFingerprints: reference.contentFingerprints,
  }))),
];
const migrationSourceArchive = {
  schemaVersion: migrationArchive.manifest.schemaVersion,
  archiveId: migrationArchive.manifest.archiveId,
  root: migrationArchive.archiveRootRelative,
  manifestSha256: migrationArchive.manifestSha256,
  payloadSha256: migrationArchive.payloadSha256,
  verifiedFiles: migrationArchive.manifest.files.length,
  learningExecutionInputs: Object.values(migrationExecution).flat().length,
  questionAuditExecutionInputs: Object.values(
    migrationArchive.manifest.execution.questionAudit,
  ).flat().length,
};
const contentMigration = {
  schemaVersion: 1,
  status: 'complete-native-projection-expert-pending',
  legacySource: 'Historical Pass the EPPP JavaScript inputs preserved in the immutable migration archive',
  sourceArchive: migrationSourceArchive,
  sections: expectedLegacySectionMappings.length,
  completeSections: nativeSectionRecords.length,
  missingSections: missingMappingKeys.length,
  duplicateMappings: duplicateMappingKeys.length,
  duplicateSectionIds: duplicateSectionIds.length,
  previewTruncatedSections: nativeSectionRecords.filter(({ section }) => section.previewTruncated).length,
  sourceContentCharacters: sourceContentManifest.reduce((sum, entry) => sum + entry.sourceCharacters, 0),
  plainTextCharacters: plainTextContentManifest.reduce((sum, entry) => sum + entry.characters, 0),
  expandableCases: nativeSectionRecords.filter(({ section }) => section.expandableCase).length,
  reflectiveCodas: chapterRecords.filter((chapter) => chapter.reflectiveCoda).length,
  sourceReferences: chapterRecords.reduce((sum, chapter) => sum + chapter.sourceReferences.length, 0),
  mappingManifestSha256: fingerprintManifest(nativeSectionRecords.map(({ chapterId, section }) => ({
    chapterId,
    sectionId: section.id,
    legacySectionIndex: section.legacySectionIndex,
  }))),
  sourceManifestSha256: fingerprintManifest(sourceContentManifest),
  plainTextManifestSha256: fingerprintManifest(plainTextContentManifest),
  structuredManifestSha256: fingerprintManifest(structuredContentManifest),
  supplementalManifestSha256: fingerprintManifest(supplementalContentManifest),
  safety: 'Legacy markup is parsed into an allowlisted native block/run schema plus a plain-text fallback. Raw or executable HTML is not embedded in the generated catalog.',
  reviewBoundary: 'Migration fingerprints establish source-to-native fidelity only; they do not replace independent qualified-expert review or production validation.',
};

const glossaryProjection = buildNativeGlossaryProjection({
  legacyDefinitions: termDefinitions,
  legacySource: termDefinitionsSource,
  chapters: chapterRecords,
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
    const reviewStatus = override.reviewStatus || 'review-required';
    const contentDisposition = cleanText(override.contentDisposition) || 'retain-after-rewrite';
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
        accuracyAndCurrency: override.reviewStatus === 'source-reviewed-editorial-pass' ? 'assisted-review-pass-expert-pending' : 'pending',
        biasAndContext: override.reviewStatus === 'source-reviewed-editorial-pass' ? 'assisted-review-pass-expert-pending' : 'pending',
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
      contentDisposition,
      independentExpertStatus: cleanText(override.independentExpertStatus) || 'not-started',
      productionStatus: cleanText(override.productionStatus) || 'not-production-validated',
      reviewArtifactLearnerVisible: override.learnerVisible === true,
    } : override.reviewStatus === 'source-reviewed-editorial-pass' ? {
      reviewMode: cleanText(override.reviewMode || reviewOverrides.reviewMode),
      reviewWave: cleanText(override.reviewWave || reviewOverrides.reviewWave),
      reviewDate: cleanText(override.reviewDate || reviewOverrides.reviewDate),
      reviewArtifact: 'eppp_learning_review_overrides.json',
      sourceDetails: reviewedSourceDetails(override.references),
      contentDisposition,
      independentExpertStatus: cleanText(override.independentExpertStatus) || 'not-started',
      productionStatus: cleanText(override.productionStatus) || 'not-production-validated',
      reviewArtifactLearnerVisible: override.learnerVisible === true,
    } : {};
    flashcards.push({
      id,
      domainId: Number(domain.id),
      domain: cleanText(domain.name),
      front,
      back,
      reviewStatus,
      references: Array.isArray(override.references) ? override.references : [],
      reviewNote: String(override.reviewNote || ''),
      checks,
      ...waveMetadata,
      learnerVisible: reviewStatus === 'source-reviewed-editorial-pass'
        && contentDisposition !== 'retire-redundant',
    });
  }
}

const aidRecords = memoryAids.map((aid) => {
  const legacyId = stableId('memory-aid', [aid.domainId, aid.title, aid.type, aid.content]);
  const waveOverride = memoryAidWaveRecords.get(legacyId) || {};
  const correctionOverride = memoryAidCorrectionRecords.get(legacyId) || {};
  const manualOverride = reviewOverrides.memoryAids && reviewOverrides.memoryAids[String(aid.title || '')] || {};
  // Numbered review waves are later, claim-level adjudications and therefore
  // supersede older title-keyed manual placeholders such as source-pending.
  const override = { ...manualOverride, ...waveOverride, ...correctionOverride };
  return ({
  id: legacyId,
  domainId: Number(aid.domainId),
  domain: domainByNumber.get(Number(aid.domainId)) || 'Unassigned',
  title: cleanText(override.title || aid.title) || 'Untitled memory aid',
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
  reviewArtifact: cleanText(correctionOverride.reviewArtifact || waveOverride.reviewArtifact || (manualOverride.reviewStatus === 'source-reviewed-editorial-pass' ? 'eppp_learning_review_overrides.json' : '')),
  correctionArtifact: cleanText(correctionOverride.reviewArtifact),
  supersedesArtifact: cleanText(correctionOverride.supersedesArtifact),
  independentExpertStatus: cleanText(correctionOverride.independentExpertStatus) || (override.reviewStatus === 'source-reviewed-editorial-pass' ? 'not-started' : ''),
  productionStatus: cleanText(correctionOverride.productionStatus) || (override.reviewStatus === 'source-reviewed-editorial-pass' ? 'not-production-validated' : ''),
  checks: {
    accuracyAndCurrency: override.reviewStatus ? 'editorial-pass' : 'pending',
    oversimplification: override.reviewStatus ? 'editorial-pass' : 'pending',
    biasAndContext: override.reviewStatus ? 'editorial-pass' : 'pending',
    sourceSupport: override.reviewStatus === 'source-reviewed-editorial-pass' ? 'pass' : 'pending',
  },
  });
});
const unmatchedMemoryAidCorrections = [...memoryAidCorrectionRecords.keys()].filter((legacyId) => !aidRecords.some((item) => item.id === legacyId));
if (unmatchedMemoryAidCorrections.length) {
  throw new Error(`Memory-aid corrections were not projected: ${unmatchedMemoryAidCorrections.join(', ')}`);
}
const correctedBlankArtifacts = aidRecords.filter((item) => memoryAidCorrectionRecords.has(item.id) && !item.reviewArtifact);
if (correctedBlankArtifacts.length) {
  throw new Error(`Corrected memory aids lack reviewArtifact: ${correctedBlankArtifacts.map((item) => item.id).join(', ')}`);
}
const releasedMemoryAidMetadataDefects = aidRecords.filter((item) => {
  if (item.reviewStatus !== 'source-reviewed-editorial-pass') return false;
  const references = Array.isArray(item.references) ? item.references : [];
  const sourceUrls = Array.isArray(item.sourceDetails) ? item.sourceDetails.map((source) => source && source.url) : [];
  return !item.reviewArtifact
    || !references.length
    || JSON.stringify(references) !== JSON.stringify(sourceUrls)
    || item.independentExpertStatus !== 'not-started'
    || item.productionStatus !== 'not-production-validated';
});
if (releasedMemoryAidMetadataDefects.length) {
  throw new Error(`Released memory aids lack complete artifact, source, or pending-gate metadata: ${releasedMemoryAidMetadataDefects.map((item) => item.id).join(', ')}`);
}

const diagramRecords = diagramCatalog.templates;
const diagramPlacementRecords = diagramCatalog.placements;

const catalog = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  libraryId: 'eppp-learning-library',
  migrationSourceArchive,
  reviewStandard: {
    checks: reviewChecks,
    meaning: 'Review status records completed source and editorial gates separately from the independent expert-review and production-validation gates, which remain explicitly pending.',
    accessibilityBaseline: 'The shared renderer provides keyboard controls, persistent section progress, diagram text alternatives, learner motion controls, and reduced-motion support.',
    sectionProvenance: 'A section marked source-reviewed-editorial-pass inherits the containing chapter review and names that parent scope; knowledge-check and diagram reviews remain independent.',
    diagramCatalog: 'Shared templates and concrete learner-visible placements are cataloged separately. Inline diagrams exist only as placements; unused templates remain visible in the template registry but are not counted as placements.',
    nativeDiagramMigration: 'Every shared or inline legacy diagram is projected into an allowlisted inert vector schema with local-only references, complete ordered text alternatives, stable placement bindings, and SHA-256 parity manifests. Migration parity is not independent expert review.',
    glossaryMigration: 'The effective legacy term-definition payload is projected one-to-one into normalized plain text with stable IDs, exact-definition aliases, occurrence-derived chapter/domain links, duplicate-source diagnostics, and SHA-256 parity manifests. Migration parity is not independent expert review.',
    learnerVisibility: 'A flashcard is learner-visible in the integrated runtime only when it is source-reviewed-editorial-pass and is not retired as redundant. Visibility does not imply independent expert validation or production validation.',
    contentMigration: 'All 278 legacy sections are projected one-to-one into a safe native block/run schema with a complete plain-text fallback, stable mapping metadata, and SHA-256 fidelity manifests. This migration gate is separate from expert and production approval.',
  },
  summary: {
    chapters: chapterRecords.length,
    sections: chapterRecords.reduce((sum, chapter) => sum + chapter.sectionCount, 0),
    completeSectionContents: contentMigration.completeSections,
    previewTruncatedSections: contentMigration.previewTruncatedSections,
    expandableCases: contentMigration.expandableCases,
    reflectiveCodas: contentMigration.reflectiveCodas,
    sourceReferences: contentMigration.sourceReferences,
    diagrams: diagramRecords.length,
    ...diagramCatalog.summary,
    ...nativeDiagramProjection.summary,
    ...glossaryProjection.summary,
    knowledgeChecks: knowledgeCheckRecords.length,
    flashcards: flashcards.length,
    memoryAids: aidRecords.length,
    qaPassedChapters: chapterRecords.filter((chapter) => chapter.reviewStatus === 'qa-passed').length,
    sourceReviewedChapters: chapterRecords.filter((chapter) => chapter.reviewStatus === 'source-reviewed-editorial-pass').length,
    sourceReviewedSections: chapterRecords.flatMap((chapter) => chapter.sections).filter((section) => section.reviewStatus === 'source-reviewed-editorial-pass').length,
    reviewRequiredSections: chapterRecords.flatMap((chapter) => chapter.sections).filter((section) => section.reviewStatus === 'review-required').length,
    qaPassedFlashcards: flashcards.filter((card) => card.reviewStatus === 'qa-passed').length,
    sourceReviewedFlashcards: flashcards.filter((card) => card.reviewStatus === 'source-reviewed-editorial-pass').length,
    retainedReviewedFlashcards: flashcards.filter((card) => card.reviewStatus === 'source-reviewed-editorial-pass' && card.contentDisposition !== 'retire-redundant').length,
    retiredRedundantFlashcards: flashcards.filter((card) => card.contentDisposition === 'retire-redundant').length,
    learnerVisibleFlashcards: flashcards.filter((card) => card.learnerVisible === true).length,
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
  contentMigration,
  diagramMigration: nativeDiagramProjection.migration,
  glossaryMigration: glossaryProjection.migration,
  chapters: chapterRecords,
  knowledgeChecks: knowledgeCheckRecords,
  diagrams: diagramRecords,
  diagramPlacements: diagramPlacementRecords,
  nativeDiagrams: nativeDiagramProjection.records,
  glossary: glossaryProjection.records,
  flashcards,
  memoryAids: aidRecords,
};
const referencedReviewArtifacts = resolveReferencedReviewArtifacts({
  catalog,
  sourceRoot: path.join(root, 'test_prep'),
}).map((artifact) => artifact.filename);
catalog.reviewArtifacts = referencedReviewArtifacts;
catalog.summary.referencedReviewArtifacts = referencedReviewArtifacts.length;

const sourceEditorialQueuesComplete =
  catalog.summary.reviewRequiredSections === 0
  && catalog.diagramMigration.missingPlacementMappings === 0
  && catalog.glossaryMigration.missingMappings === 0
  && catalog.summary.sourceReviewedDiagramPlacements === catalog.summary.diagramPlacements
  && catalog.summary.sourceReviewedFlashcards === catalog.summary.flashcards
  && catalog.summary.sourceReviewedMemoryAids === catalog.summary.memoryAids
  && catalog.summary.editorialReviewedSourcePendingMemoryAids === 0
  && catalog.summary.reviewRequiredKnowledgeChecks === 0;

const report = {
  schemaVersion: 1,
  generatedAt: catalog.generatedAt,
  libraryId: catalog.libraryId,
  standard: catalog.reviewStandard,
  summary: catalog.summary,
  status: sourceEditorialQueuesComplete
    ? 'first-pass-complete-expert-pending'
    : 'review-in-progress',
  findings: [
    'Historical content is preserved in a manifest-bound immutable archive but is not automatically approved for native publication.',
    `Verified ${catalog.migrationSourceArchive.verifiedFiles} immutable migration-source files against manifest SHA-256 ${catalog.migrationSourceArchive.manifestSha256} before projection.`,
    `${catalog.contentMigration.completeSections} of ${catalog.contentMigration.sections} legacy sections have complete one-to-one native content projections with source, plain-text, structured-block, and supplemental-content SHA-256 manifests; no raw executable HTML is embedded. This is a migration-fidelity result, not an expert-validation claim.`,
    `${catalog.summary.sourceReviewedSections} of ${catalog.summary.sections} section records inherit source/editorial review from their explicitly reviewed parent chapters; this does not claim independent section-level expert validation.`,
    `Shared renderer accessibility controls are implemented. ${catalog.summary.sourceReviewedDiagramPlacements} of ${catalog.summary.diagramPlacements} learner-visible placements have source-review records; ${catalog.summary.diagramPlacements - catalog.summary.sourceReviewedDiagramPlacements} placements still need concept and label review.`,
    `${catalog.summary.diagramPlacements} learner-visible diagram placements are cataloged: ${catalog.summary.sharedTemplateDiagramPlacements} use shared templates and ${catalog.summary.inlineDiagramPlacements} are inline chapter diagrams. ${catalog.summary.unusedDiagramTemplates} shared templates are currently unused.`,
    `${catalog.summary.nativeDiagramPayloads} native diagram payloads cover all ${catalog.summary.nativeDiagramPlacements} learner-visible placements with inert vector trees and complete ordered text alternatives; raw SVG/HTML is not embedded, and migration parity is not an independent expert-review claim.`,
    `${catalog.summary.glossaryTerms} effective legacy glossary terms have one-to-one native text projections; ${catalog.summary.glossaryDuplicateSourceDeclarations} overwritten legacy source declarations remain explicitly diagnosed, and migration parity is not an independent expert-review claim.`,
    `${catalog.summary.sourceReviewedFlashcards} of ${catalog.summary.flashcards} flashcards have source-review records; ${catalog.summary.flashcards - catalog.summary.sourceReviewedFlashcards} remain in first-pass review, and independent qualified expert validation is still pending.`,
    `${catalog.summary.retiredRedundantFlashcards} source-reviewed duplicate flashcards are explicitly retired from future learner release rather than counted as distinct study targets.`,
    `${catalog.summary.learnerVisibleFlashcards} retained source-reviewed flashcards are learner-visible in the integrated runtime; learner visibility does not claim independent expert validation or production readiness.`,
    `${catalog.summary.sourceReviewedMemoryAids} of ${catalog.summary.memoryAids} memory aids have source-review records and are released; ${catalog.summary.memoryAids - catalog.summary.sourceReviewedMemoryAids} remain in the editorial/source-review queue, and independent qualified expert validation is still pending.`,
    `${catalog.summary.sourceReviewedKnowledgeChecks} of ${catalog.summary.knowledgeChecks} knowledge checks have source-review records and are released to their chapter payloads; ${catalog.summary.reviewRequiredKnowledgeChecks} remain gated for review.`,
  ],
};

const catalogJson = JSON.stringify(catalog, null, 2) + '\n';
const reportJson = JSON.stringify(report, null, 2) + '\n';
if (process.env.EPPP_LIBRARY_VALIDATE_ONLY === '1') {
  console.log(`EPPP learning library validation-only: ${catalog.summary.sourceReviewedMemoryAids}/${catalog.summary.memoryAids} memory aids pass projection guards; no catalog files written.`);
} else {
  const copiedReviewArtifacts = copyReferencedReviewArtifacts({
    catalog,
    sourceRoot: path.join(root, 'test_prep'),
    deployRoot,
  });
  if (JSON.stringify(copiedReviewArtifacts) !== JSON.stringify(referencedReviewArtifacts)) {
    throw new Error('EPPP learning review artifact deployment set does not match the generated catalog.');
  }
  for (const outputRoot of [path.join(root, 'test_prep'), deployRoot]) {
    fs.mkdirSync(outputRoot, { recursive: true });
    writeFileWithRetry(path.join(outputRoot, 'eppp_learning_library.json'), catalogJson);
    writeFileWithRetry(path.join(outputRoot, 'eppp_learning_library_qa.json'), reportJson);
  }
}

console.log(`EPPP learning library: ${catalog.summary.chapters} chapters, ${catalog.summary.sections} sections, ${catalog.summary.nativeDiagramPayloads} native diagram payloads, ${catalog.summary.glossaryTerms} glossary terms, ${catalog.summary.flashcards} flashcards, ${catalog.summary.memoryAids} memory aids cataloged.`);
console.log('Learning-library QA status: ' + report.status + '.');
