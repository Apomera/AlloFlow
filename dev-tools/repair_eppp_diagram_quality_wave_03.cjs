#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { reviewWave, reviewDate, corrections } = require('./eppp_diagram_quality_wave_03_data.cjs');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'test_prep', 'eppp_legacy');
const deployRoot = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_legacy');
const artifactName = 'eppp_diagram_review_wave_03';
const artifactRoots = [path.join(root, 'test_prep'), path.join(root, 'desktop/web-app', 'public', 'test_prep')];

function normalize(source) {
  return String(source).replace(/\r\n/g, '\n');
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function occurrenceCount(haystack, needle) {
  return needle ? haystack.split(needle).length - 1 : 0;
}

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

function loadChapter(source, sourceFile) {
  const windowObject = { TextbookChapters: [] };
  windowObject.window = windowObject;
  const context = vm.createContext({ window: windowObject, console: { log() {}, warn() {}, error() {} } });
  vm.runInContext(source, context, { filename: sourceFile, timeout: 15000 });
  return windowObject.TextbookChapters || [];
}

function assertPlacement(source, correction, allowCorrected) {
  const chapters = loadChapter(source, correction.sourceFile);
  const chapter = chapters.find((entry) => String(entry && entry.id || '') === correction.chapterId);
  if (!chapter) throw new Error(`${correction.placementId}: source did not register ${correction.chapterId}.`);
  const section = Array.isArray(chapter.sections) ? chapter.sections[correction.sectionIndex - 1] : null;
  if (!section || section.heading !== correction.expectedHeading) {
    throw new Error(`${correction.placementId}: expected section ${correction.sectionIndex} heading ${JSON.stringify(correction.expectedHeading)}.`);
  }
  const diagram = section.interactiveDiagram;
  if (!diagram || typeof diagram.svg !== 'string') throw new Error(`${correction.placementId}: expected an inline SVG diagram.`);

  const isCorrected = diagram.title === correction.title && diagram.description === correction.description && diagram.svg === correction.svg;
  if (allowCorrected && isCorrected) return { chapter, section, diagram, isCorrected: true };
  if (String(diagram.title || '') !== correction.expectedOriginal.title
      || diagram.description !== correction.expectedOriginal.description
      || sha256(diagram.svg) !== correction.expectedOriginal.svgSha256) {
    throw new Error(`${correction.placementId}: current diagram differs from both the guarded original and the wave 03 result; refusing to overwrite it.`);
  }
  return { chapter, section, diagram, isCorrected: false };
}

function applyContentReplacements(source, correction) {
  let candidate = source;
  for (const replacement of correction.contentReplacements || []) {
    const oldCount = occurrenceCount(candidate, replacement.from);
    const newCount = occurrenceCount(candidate, replacement.to);
    if (oldCount === 0 && newCount === 1) continue;
    if (oldCount !== 1 || newCount !== 0) {
      throw new Error(`${correction.placementId}: guarded chapter wording expected once (old=${oldCount}, new=${newCount}).`);
    }
    candidate = candidate.replace(replacement.from, replacement.to);
  }
  return candidate;
}

function serializeDiagram(correction, trailingComma) {
  return [
    '            interactiveDiagram: {',
    `                title: ${JSON.stringify(correction.title)},`,
    `                description: ${JSON.stringify(correction.description)},`,
    `                svg: ${JSON.stringify(correction.svg)}`,
    `            }${trailingComma ? ',' : ''}`,
  ].join('\n');
}

function replaceInteractiveBlock(source, correction) {
  const headingNeedle = `            heading: '${correction.expectedHeading.replace(/'/g, "\\'")}',`;
  if (occurrenceCount(source, headingNeedle) !== 1) {
    throw new Error(`${correction.placementId}: expected exactly one guarded heading in ${correction.sourceFile}.`);
  }
  const headingAt = source.indexOf(headingNeedle);
  const startNeedle = '            interactiveDiagram: {';
  const start = source.indexOf(startNeedle, headingAt + headingNeedle.length);
  if (start < 0) throw new Error(`${correction.placementId}: interactiveDiagram block is missing.`);
  const nextSection = source.indexOf('\n        {\n            heading:', headingAt + headingNeedle.length);
  if (nextSection >= 0 && start > nextSection) throw new Error(`${correction.placementId}: diagram was not found inside the expected section.`);

  const withNextProperty = source.indexOf('\n            },\n            knowledgeCheck:', start);
  const asLastProperty = source.indexOf('\n            }\n        }', start);
  let closeAt;
  let trailingComma;
  if (withNextProperty >= 0 && (asLastProperty < 0 || withNextProperty < asLastProperty)) {
    closeAt = withNextProperty + '\n            },'.length;
    trailingComma = true;
  } else if (asLastProperty >= 0) {
    closeAt = asLastProperty + '\n            }'.length;
    trailingComma = false;
  } else {
    throw new Error(`${correction.placementId}: could not find the guarded diagram-block boundary.`);
  }
  return source.slice(0, start) + serializeDiagram(correction, trailingComma) + source.slice(closeAt);
}

function validateSvg(correction) {
  const { svg, title, description, placementId } = correction;
  if (!title.trim() || description.trim().length < 120) throw new Error(`${placementId}: title and a full 120+ character alternative are required.`);
  const labelled = svg.match(/<svg\b[^>]*\brole="img"[^>]*\baria-labelledby="([^"]+)"[^>]*>/i);
  if (!labelled) throw new Error(`${placementId}: SVG must use role=img and aria-labelledby.`);
  const labelledIds = labelled[1].trim().split(/\s+/);
  if (labelledIds.length !== 2 || labelledIds.some((id) => !id)) throw new Error(`${placementId}: aria-labelledby must name exactly a title and description ID.`);
  const titleMatches = Array.from(svg.matchAll(/<title\s+id="([^"]+)"[^>]*>[\s\S]*?<\/title>/gi));
  const descMatches = Array.from(svg.matchAll(/<desc\s+id="([^"]+)"[^>]*>[\s\S]*?<\/desc>/gi));
  if (titleMatches.length !== 1 || descMatches.length !== 1 || titleMatches[0][1] !== labelledIds[0] || descMatches[0][1] !== labelledIds[1]) {
    throw new Error(`${placementId}: aria-labelledby must resolve to one direct title and one direct description.`);
  }
  const ids = Array.from(svg.matchAll(/\bid="([^"]+)"/g), (match) => match[1]);
  if (new Set(ids).size !== ids.length) throw new Error(`${placementId}: duplicate SVG IDs are not allowed.`);
  const references = [
    ...Array.from(svg.matchAll(/url\(#([^)]+)\)/g), (match) => match[1]),
    ...Array.from(svg.matchAll(/(?:href|xlink:href)="#([^"]+)"/g), (match) => match[1]),
  ];
  if (references.some((id) => !ids.includes(id))) throw new Error(`${placementId}: every SVG fragment reference must resolve locally.`);
  const fontSizes = Array.from(svg.matchAll(/font-size="([0-9.]+)"/g), (match) => Number(match[1]));
  if (!fontSizes.length || fontSizes.some((value) => !Number.isFinite(value) || value < 12)) throw new Error(`${placementId}: every explicit SVG font size must be at least 12.`);
  if (/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-f]+;)/i.test(svg)) throw new Error(`${placementId}: SVG contains a bare ampersand.`);
  if (/<animate(?:Transform|Motion)?\b|\banimation\s*:|cursor\s*:\s*pointer|:hover|\bon(?:click|mouse|focus)\s*=/i.test(svg)) {
    throw new Error(`${placementId}: static reviewed diagrams cannot expose motion or false interaction affordances.`);
  }
  if (/Content QA|migration provenance|legacy EPPP/i.test(`${title} ${description} ${svg}`)) {
    throw new Error(`${placementId}: learner content contains internal QA or migration language.`);
  }
}

// Read and pre-validate every source and every correction before writing any file.
const sourceByFile = new Map();
for (const correction of corrections) {
  if (!/^diagram-placement-ch-\d+-section-\d{2}$/.test(correction.placementId)) throw new Error(`${correction.placementId}: invalid placement ID.`);
  if (!correction.sourceDetails.length || correction.sourceDetails.some((source) => !source.title || !source.organization || !source.url || !source.whyReputable)) {
    throw new Error(`${correction.placementId}: complete named source details are required.`);
  }
  if (correction.references.length !== correction.sourceDetails.length || correction.sourceDetails.some((source) => !correction.references.includes(source.url))) {
    throw new Error(`${correction.placementId}: references must exactly mirror named source URLs.`);
  }
  validateSvg(correction);
  const sourcePath = path.join(sourceRoot, correction.sourceFile);
  if (!fs.existsSync(sourcePath)) throw new Error(`${correction.placementId}: source file ${correction.sourceFile} is missing.`);
  if (!sourceByFile.has(correction.sourceFile)) sourceByFile.set(correction.sourceFile, normalize(fs.readFileSync(sourcePath, 'utf8')));
  assertPlacement(sourceByFile.get(correction.sourceFile), correction, true);
}

const candidateByFile = new Map(sourceByFile);
for (const correction of corrections) {
  let candidate = candidateByFile.get(correction.sourceFile);
  candidate = applyContentReplacements(candidate, correction);
  const current = assertPlacement(candidate, correction, true);
  if (!current.isCorrected) candidate = replaceInteractiveBlock(candidate, correction);
  candidateByFile.set(correction.sourceFile, candidate);
}

// Validate complete in-memory chapter candidates, including all corrections sharing ch9.
for (const correction of corrections) {
  const candidate = candidateByFile.get(correction.sourceFile);
  const result = assertPlacement(candidate, correction, true);
  if (!result.isCorrected) throw new Error(`${correction.placementId}: corrected candidate failed runtime validation.`);
  for (const replacement of correction.contentReplacements || []) {
    if (occurrenceCount(candidate, replacement.from) !== 0 || occurrenceCount(candidate, replacement.to) !== 1) {
      throw new Error(`${correction.placementId}: chapter wording repair failed post-validation.`);
    }
  }
}

const items = corrections.map((correction, index) => ({
  sequence: index + 1,
  placementId: correction.placementId,
  chapterId: correction.chapterId,
  sectionIndex: correction.sectionIndex,
  expectedHeading: correction.expectedHeading,
  sourceFile: correction.sourceFile,
  title: correction.title,
  reviewStatus: correction.reviewStatus,
  reviewWave: correction.reviewWave,
  reviewDate: correction.reviewDate,
  correctionSummary: correction.correctionSummary,
  reviewNote: correction.reviewNote,
  references: correction.references,
  sourceDetails: correction.sourceDetails,
  checks: correction.checks,
  independentExpertStatus: 'pending-independent-qualified-expert-review',
  productionStatus: 'not-production-validated',
}));

const artifact = {
  schemaVersion: 1,
  reviewWave,
  reviewDate,
  status: 'assisted-editorial-source-review-complete-expert-pending',
  standard: {
    meaning: 'This wave records an assisted editorial, accessibility, and source-alignment pass for six inline instructional diagram placements.',
    releaseBoundary: 'Independent review by a qualified subject-matter expert and production validation remain pending.',
  },
  summary: {
    reviewedDiagramPlacements: items.length,
    correctedDiagramPlacements: items.length,
    sourceReviewedDiagramPlacements: items.length,
    distinctNamedSources: new Set(items.flatMap((item) => item.references)).size,
    independentExpertValidated: 0,
    status: 'pass',
  },
  items,
};

const markdown = `# EPPP diagram review wave 03

Reviewed: ${reviewDate}

Status: **assisted editorial, accessibility, and source review complete; independent qualified expert validation pending**

This wave corrects six inline instructional diagrams and records their current chapter placements. It does not claim psychometric calibration, clinical guidance, legal advice, production validation, or independent expert validation.

## Result

- Corrected and source-reviewed inline diagram placements: ${items.length}
- Distinct named sources: ${artifact.summary.distinctNamedSources}
- Independently expert validated: 0

## Sources and corrections

${items.map((item) => `### ${item.sequence}. ${item.title}

Placement: ${item.chapterId}, section ${item.sectionIndex} — ${item.expectedHeading}

${item.correctionSummary}

${item.sourceDetails.map((source) => `- [${source.title}](${source.url}) — ${source.organization}. ${source.whyReputable}`).join('\n')}

Review note: ${item.reviewNote}`).join('\n\n')}
`;

for (const [sourceFile, candidate] of candidateByFile) {
  writeFileWithRetry(path.join(sourceRoot, sourceFile), candidate);
  writeFileWithRetry(path.join(deployRoot, sourceFile), candidate);
}
const jsonText = JSON.stringify(artifact, null, 2) + '\n';
for (const artifactRoot of artifactRoots) {
  writeFileWithRetry(path.join(artifactRoot, `${artifactName}.json`), jsonText);
  writeFileWithRetry(path.join(artifactRoot, `${artifactName}.md`), markdown);
}

console.log(`EPPP diagram quality wave 03: corrected and source-reviewed ${items.length} inline placements.`);
