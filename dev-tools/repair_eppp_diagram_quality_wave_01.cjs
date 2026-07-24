#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { reviewWave, reviewDate, corrections } = require('./eppp_diagram_quality_wave_01_data.cjs');

const root = path.resolve(__dirname, '..');
const legacyRoot = path.join(root, 'test_prep', 'eppp_legacy');
const sourcePath = path.join(legacyRoot, 'js', 'textbook_diagrams.js');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_legacy', 'js', 'textbook_diagrams.js');
const artifactName = 'eppp_diagram_review_wave_01';
const artifactRoots = [path.join(root, 'test_prep'), path.join(root, 'desktop/web-app', 'public', 'test_prep')];

function writeFileWithRetry(filePath, contents) {
  let lastError;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, contents);
      return;
    } catch (error) {
      lastError = error;
      if (!['EBUSY', 'EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
  throw lastError;
}

function occurrenceCount(haystack, needle) {
  if (!needle) return 0;
  return haystack.split(needle).length - 1;
}

function applyGuardedReplacement(source, correctionKey, replacement) {
  const oldCount = occurrenceCount(source, replacement.from);
  const newCount = occurrenceCount(source, replacement.to);
  if (oldCount === 0 && newCount > 0) return source;
  if (oldCount !== 1) {
    throw new Error(`${correctionKey}: expected one occurrence of guarded source text, found ${oldCount}.`);
  }
  return source.replace(replacement.from, replacement.to);
}

let source = fs.readFileSync(sourcePath, 'utf8');
for (const correction of corrections) {
  for (const replacement of correction.replacements) {
    source = applyGuardedReplacement(source, correction.key, replacement);
  }
}
for (const correction of corrections) {
  for (const replacement of correction.replacements) {
    if (occurrenceCount(source, replacement.from) !== 0) throw new Error(`${correction.key}: superseded wording remains after repair.`);
    if (occurrenceCount(source, replacement.to) < 1) throw new Error(`${correction.key}: corrected wording is missing after repair.`);
  }
}
writeFileWithRetry(sourcePath, source);
writeFileWithRetry(deployPath, source);

function discoverPlacements() {
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
    if (!fs.existsSync(target)) throw new Error(`Missing EPPP learning asset ${relativePath}.`);
    vm.runInContext(fs.readFileSync(target, 'utf8'), context, { filename: relativePath, timeout: 15000 });
  }
  run('js/data.js');
  const chapterSourceById = new Map();
  for (const relativePath of scriptPaths.filter((entry) => /^js\/textbook_ch(?:\d+|\d+_\d+)\.js$/i.test(entry))) {
    const before = (windowObject.TextbookChapters || []).length;
    run(relativePath);
    for (const chapter of (windowObject.TextbookChapters || []).slice(before)) chapterSourceById.set(String(chapter.id || ''), relativePath);
  }
  run('js/textbook_diagrams.js');
  const targetKeys = new Set(corrections.map((correction) => correction.key));
  const templateKeyByObject = new Map(Object.entries(windowObject._epppDiagrams || {}).map(([key, diagram]) => [diagram, key]));
  const placements = new Map(Array.from(targetKeys, (key) => [key, []]));
  for (const [chapterIndex, chapter] of (windowObject.TextbookChapters || []).entries()) {
    const chapterId = String(chapter && chapter.id || `chapter-${chapterIndex + 1}`);
    for (const [sectionIndex, section] of (Array.isArray(chapter && chapter.sections) ? chapter.sections : []).entries()) {
      const key = templateKeyByObject.get(section && section.interactiveDiagram);
      if (!targetKeys.has(key)) continue;
      placements.get(key).push({
        chapterId,
        chapterTitle: String(chapter && chapter.title || 'Untitled chapter').trim(),
        sectionIndex: sectionIndex + 1,
        sectionHeading: String(section && section.heading || 'Untitled section').trim(),
        legacySource: chapterSourceById.get(chapterId) || '',
      });
    }
  }
  return placements;
}

const placementsByKey = discoverPlacements();
for (const correction of corrections) {
  if (!placementsByKey.get(correction.key).length) throw new Error(`${correction.key}: no learner placement was discovered.`);
  if (!correction.sourceDetails.length || correction.sourceDetails.some((sourceDetail) => !sourceDetail.title || !sourceDetail.organization || !sourceDetail.url || !sourceDetail.whyReputable)) {
    throw new Error(`${correction.key}: complete named source details are required.`);
  }
  if (correction.references.length !== correction.sourceDetails.length || correction.sourceDetails.some((sourceDetail) => !correction.references.includes(sourceDetail.url))) {
    throw new Error(`${correction.key}: references must mirror source-detail URLs.`);
  }
}

const items = corrections.map((correction, index) => ({
  sequence: index + 1,
  key: correction.key,
  reviewStatus: correction.reviewStatus,
  reviewWave: correction.reviewWave,
  reviewDate: correction.reviewDate,
  correctionSummary: correction.correctionSummary,
  reviewNote: correction.reviewNote,
  placementCount: placementsByKey.get(correction.key).length,
  placements: placementsByKey.get(correction.key),
  references: correction.references,
  sourceDetails: correction.sourceDetails,
  checks: correction.checks,
  independentExpertStatus: 'not-started',
  productionStatus: 'not-production-validated',
}));
const placementCount = items.reduce((sum, item) => sum + item.placementCount, 0);
const artifact = {
  schemaVersion: 1,
  reviewWave,
  reviewDate,
  status: 'assisted-editorial-source-review-complete-expert-pending',
  standard: {
    meaning: 'This wave records an assisted editorial and source-alignment pass for shared instructional diagrams. It is not independent expert validation, psychometric evidence, or clinical guidance.',
    releaseBoundary: 'Source-reviewed editorial status identifies corrected and traceable content; independent qualified expert validation remains pending.',
  },
  summary: {
    reviewedDiagramTemplates: items.length,
    correctedDiagramTemplates: items.length,
    sourceReviewedDiagramTemplates: items.length,
    placementRecords: placementCount,
    distinctNamedSources: new Set(items.flatMap((item) => item.references)).size,
    independentExpertValidated: 0,
    status: 'pass',
  },
  items,
};

const markdown = `# EPPP diagram review wave 01

Reviewed: ${reviewDate}

Status: **assisted editorial and source review complete; independent qualified expert validation pending**

This wave corrects seven shared diagrams and records each current chapter placement. It does not claim psychometric calibration, clinical guidance, or independent expert validation.

## Result

- Corrected and source-reviewed shared diagram templates: ${items.length}
- Current learner placements represented: ${placementCount}
- Distinct named sources: ${artifact.summary.distinctNamedSources}
- Independently expert validated: 0

## Sources and corrections

${items.map((item) => `### ${item.sequence}. ${item.key}

${item.correctionSummary}

Placements: ${item.placements.map((placement) => `${placement.chapterTitle} — ${placement.sectionHeading}`).join('; ')}

${item.sourceDetails.map((sourceDetail) => `- [${sourceDetail.title}](${sourceDetail.url}) — ${sourceDetail.organization}. ${sourceDetail.whyReputable}`).join('\n')}

Review note: ${item.reviewNote}`).join('\n\n')}
`;

const jsonText = JSON.stringify(artifact, null, 2) + '\n';
for (const artifactRoot of artifactRoots) {
  writeFileWithRetry(path.join(artifactRoot, artifactName + '.json'), jsonText);
  writeFileWithRetry(path.join(artifactRoot, artifactName + '.md'), markdown);
}
console.log(`EPPP diagram quality wave 01: corrected ${items.length} templates across ${placementCount} placements.`);
