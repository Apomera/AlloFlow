#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { reviewWave, reviewDate, corrections } = require('./eppp_diagram_quality_wave_07_data.cjs');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'test_prep', 'eppp_legacy');
const deployRoot = path.join(root, 'desktop', 'web-app', 'public', 'test_prep', 'eppp_legacy');
const artifactName = 'eppp_diagram_review_wave_07';
const artifactRoots = [
  path.join(root, 'test_prep'),
  path.join(root, 'desktop', 'web-app', 'public', 'test_prep'),
];

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

function loadChapter(source, correction) {
  const windowObject = { TextbookChapters: [] };
  windowObject.window = windowObject;
  vm.runInNewContext(source, { window: windowObject, console: { log() {}, warn() {}, error() {} } }, {
    filename: correction.sourceFile,
    timeout: 15000,
  });
  const chapter = windowObject.TextbookChapters.find((entry) => String(entry && entry.id || '') === correction.chapterId);
  if (!chapter) throw new Error(`${correction.placementId}: did not register ${correction.chapterId}.`);
  const section = Array.isArray(chapter.sections) ? chapter.sections[correction.sectionIndex - 1] : null;
  if (!section || section.heading !== correction.expectedHeading) {
    throw new Error(`${correction.placementId}: expected section ${correction.sectionIndex} heading ${JSON.stringify(correction.expectedHeading)}.`);
  }
  if (!section.interactiveDiagram || typeof section.interactiveDiagram.svg !== 'string') {
    throw new Error(`${correction.placementId}: expected an inline SVG diagram.`);
  }
  return { chapter, section, diagram: section.interactiveDiagram };
}

function applyExactReplacements(value, replacements, placementId, label) {
  let result = value;
  for (const replacement of replacements || []) {
    const currentCount = occurrenceCount(result, replacement.from);
    if (currentCount === 0 && occurrenceCount(result, replacement.to) >= replacement.expectedCount) continue;
    if (currentCount !== replacement.expectedCount) {
      throw new Error(`${placementId}: ${label} replacement expected ${replacement.expectedCount} occurrence(s), found ${currentCount}.`);
    }
    result = result.split(replacement.from).join(replacement.to);
  }
  return result;
}

function desiredSvg(diagram, correction) {
  const currentHash = sha256(diagram.svg);
  if (currentHash === correction.correctedSvgSha256) return diagram.svg;
  if (currentHash !== correction.expectedOriginal.svgSha256) {
    throw new Error(`${correction.placementId}: SVG differs from both the guarded original and wave 07 result; refusing to overwrite it.`);
  }
  const candidate = applyExactReplacements(diagram.svg, correction.svgReplacements, correction.placementId, 'SVG');
  if (sha256(candidate) !== correction.correctedSvgSha256) {
    throw new Error(`${correction.placementId}: transformed SVG did not match the declared corrected fingerprint.`);
  }
  return candidate;
}

function inspectPlacement(source, correction, allowCorrected, scopeLabel) {
  const loaded = loadChapter(source, correction);
  const { diagram } = loaded;
  const currentHash = sha256(diagram.svg);
  const originalMetadata = String(diagram.title || '') === correction.expectedOriginal.title
    && String(diagram.description || '') === correction.expectedOriginal.description;
  const correctedMetadata = String(diagram.title || '') === correction.title
    && String(diagram.description || '') === correction.description;
  const isCorrected = correctedMetadata && currentHash === correction.correctedSvgSha256;
  if (allowCorrected && isCorrected) return { ...loaded, isCorrected, desiredSvg: diagram.svg };
  if (!originalMetadata && !correctedMetadata) {
    throw new Error(`${correction.placementId}: ${scopeLabel} metadata differs from both the guarded original and wave 07 result; refusing to overwrite it.`);
  }
  if (currentHash !== correction.expectedOriginal.svgSha256 && currentHash !== correction.correctedSvgSha256) {
    throw new Error(`${correction.placementId}: ${scopeLabel} SVG differs from both the guarded original and wave 07 result; refusing to overwrite it.`);
  }
  return { ...loaded, isCorrected: false, desiredSvg: desiredSvg(diagram, correction) };
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

function findMatchingBrace(source, openIndex) {
  let depth = 1;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = openIndex + 1; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (character === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') quote = character;
    else if (character === '/' && next === '/') {
      lineComment = true;
      index += 1;
    } else if (character === '/' && next === '*') {
      blockComment = true;
      index += 1;
    } else if (character === '{') depth += 1;
    else if (character === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error(`Unclosed object beginning at offset ${openIndex}.`);
}

function serializeDiagram(correction, svg) {
  return [
    '{',
    `                title: ${JSON.stringify(correction.title)},`,
    `                description: ${JSON.stringify(correction.description)},`,
    `                svg: ${JSON.stringify(svg)}`,
    '            }',
  ].join('\n');
}

function replaceSoleDiagramObject(source, correction, svg) {
  const matches = Array.from(source.matchAll(/\binteractiveDiagram\b\s*:\s*\{/g));
  if (matches.length !== 1) {
    throw new Error(`${correction.placementId}: expected exactly one interactiveDiagram property in ${correction.sourceFile}, found ${matches.length}.`);
  }
  const openIndex = source.indexOf('{', matches[0].index);
  const closeIndex = findMatchingBrace(source, openIndex);
  return source.slice(0, openIndex) + serializeDiagram(correction, svg) + source.slice(closeIndex + 1);
}

function cloneChapterWithoutDiagram(source, correction) {
  const { chapter } = loadChapter(source, correction);
  const clone = JSON.parse(JSON.stringify(chapter));
  delete clone.sections[correction.sectionIndex - 1].interactiveDiagram;
  return clone;
}

function assertStructurePreserved(before, after, correction, scopeLabel) {
  const beforeChapter = cloneChapterWithoutDiagram(before, correction);
  const afterChapter = cloneChapterWithoutDiagram(after, correction);
  if (JSON.stringify(beforeChapter) !== JSON.stringify(afterChapter)) {
    throw new Error(`${correction.placementId}: ${scopeLabel} non-target chapter content changed.`);
  }
}

function mojibakeCount(source) {
  return (String(source).match(/[\u00e2\u00c3\u00c2\u00ce\u00cf]/g) || []).length;
}

function validateSvg(diagram, correction) {
  const { title, description, svg } = diagram;
  if (!title.trim() || description.trim().length < 120) {
    throw new Error(`${correction.placementId}: title and a full 120+ character alternative are required.`);
  }
  const labelled = svg.match(/<svg\b[^>]*\brole="img"[^>]*\baria-labelledby="([^"]+)"[^>]*>/i);
  if (!labelled) throw new Error(`${correction.placementId}: SVG must use role=img and aria-labelledby.`);
  const labelledIds = labelled[1].trim().split(/\s+/);
  const titleMatches = Array.from(svg.matchAll(/<title\s+id="([^"]+)"[^>]*>[\s\S]*?<\/title>/gi));
  const descMatches = Array.from(svg.matchAll(/<desc\s+id="([^"]+)"[^>]*>[\s\S]*?<\/desc>/gi));
  if (labelledIds.length !== 2 || titleMatches.length !== 1 || descMatches.length !== 1
      || titleMatches[0][1] !== labelledIds[0] || descMatches[0][1] !== labelledIds[1]) {
    throw new Error(`${correction.placementId}: aria-labelledby must resolve to one direct title and one direct description.`);
  }
  const ids = Array.from(svg.matchAll(/\bid="([^"]+)"/g), (match) => match[1]);
  if (new Set(ids).size !== ids.length) throw new Error(`${correction.placementId}: duplicate SVG IDs are not allowed.`);
  const references = [
    ...Array.from(svg.matchAll(/url\(#([^)]+)\)/g), (match) => match[1]),
    ...Array.from(svg.matchAll(/(?:href|xlink:href)="#([^"]+)"/g), (match) => match[1]),
  ];
  if (references.some((id) => !ids.includes(id))) {
    throw new Error(`${correction.placementId}: every SVG fragment reference must resolve locally.`);
  }
  const fontSizes = Array.from(svg.matchAll(/font-size="([0-9.]+)"/g), (match) => Number(match[1]));
  if (!fontSizes.length || fontSizes.some((value) => !Number.isFinite(value) || value < 12)) {
    throw new Error(`${correction.placementId}: every explicit SVG font size must be at least 12.`);
  }
  if (/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-f]+;)/i.test(svg)) {
    throw new Error(`${correction.placementId}: SVG contains a bare ampersand.`);
  }
  if (/[\u00e2\u00c3\u00c2\u00ce\u00cf]/.test(`${title} ${description} ${svg}`)) {
    throw new Error(`${correction.placementId}: learner-facing diagram text contains a mojibake marker.`);
  }
  if (/<animate(?:Transform|Motion)?\b|\banimation\s*:|cursor\s*:\s*pointer|:hover|\bon(?:click|mouse|focus)\s*=/i.test(svg)) {
    throw new Error(`${correction.placementId}: static reviewed diagrams cannot expose motion or false interaction affordances.`);
  }
}

const scopes = [
  { label: 'canonical source', root: sourceRoot },
  { label: 'public deploy copy', root: deployRoot },
].map((scope) => ({ ...scope, originals: new Map(), candidates: new Map() }));

for (const correction of corrections) {
  if (!/^diagram-placement-ch-\d+-section-\d{2}$/.test(correction.placementId)) {
    throw new Error(`${correction.placementId}: invalid placement ID.`);
  }
  if (!correction.sourceDetails.length || correction.sourceDetails.some((source) => (
    !source.title || !source.organization || !source.url || !source.whyReputable
  ))) throw new Error(`${correction.placementId}: complete named source details are required.`);
  if (correction.references.length !== correction.sourceDetails.length
      || correction.sourceDetails.some((source) => !correction.references.includes(source.url))) {
    throw new Error(`${correction.placementId}: references must exactly mirror named source URLs.`);
  }
  for (const scope of scopes) {
    const filePath = path.join(scope.root, correction.sourceFile);
    if (!fs.existsSync(filePath)) throw new Error(`${correction.placementId}: ${scope.label} file is missing.`);
    const original = fs.readFileSync(filePath, 'utf8');
    scope.originals.set(correction.sourceFile, original);
    inspectPlacement(original, correction, true, scope.label);
  }
}

for (const scope of scopes) {
  for (const correction of corrections) {
    const original = scope.originals.get(correction.sourceFile);
    let candidate = applyContentReplacements(original, correction);
    const current = inspectPlacement(candidate, correction, true, scope.label);
    if (!current.isCorrected) candidate = replaceSoleDiagramObject(candidate, correction, current.desiredSvg);
    assertStructurePreserved(applyContentReplacements(original, correction), candidate, correction, scope.label);
    if (mojibakeCount(candidate) > mojibakeCount(original)) {
      throw new Error(`${correction.placementId}: ${scope.label} introduced mojibake.`);
    }
    scope.candidates.set(correction.sourceFile, candidate);
  }
}

for (const scope of scopes) {
  for (const correction of corrections) {
    const original = scope.originals.get(correction.sourceFile);
    const candidate = scope.candidates.get(correction.sourceFile);
    const result = inspectPlacement(candidate, correction, true, scope.label);
    if (!result.isCorrected) throw new Error(`${correction.placementId}: corrected candidate failed runtime validation.`);
    validateSvg(result.diagram, correction);
    assertStructurePreserved(applyContentReplacements(original, correction), candidate, correction, scope.label);
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
    meaning: 'This wave records assisted editorial, accessibility, and source-alignment review for all 18 previously review-required inline diagram placements.',
    releaseBoundary: 'Independent review by a qualified subject-matter expert and production validation remain pending.',
  },
  summary: {
    reviewedDiagramPlacements: items.length,
    correctedDiagramPlacements: items.length,
    sourceReviewedDiagramPlacements: items.length,
    learnerMetadataExpanded: items.filter((item) => corrections.find((entry) => entry.placementId === item.placementId).expectedOriginal.title === '').length,
    svgLabelSizeCorrections: corrections.reduce((sum, item) => sum + item.svgReplacements.reduce((count, replacement) => count + replacement.expectedCount, 0), 0),
    distinctNamedSources: new Set(items.flatMap((item) => item.references)).size,
    independentExpertValidated: 0,
    status: 'pass',
  },
  projectedCatalogCounts: {
    sourceReviewedDiagramPlacementsBefore: 40,
    sourceReviewedDiagramPlacementsAfter: 58,
    reviewRequiredDiagramPlacementsBefore: 18,
    reviewRequiredDiagramPlacementsAfter: 0,
  },
  items,
};

const markdown = `# EPPP diagram review wave 07

Reviewed: ${reviewDate}

Status: **assisted editorial, accessibility, and source review complete; independent qualified expert validation pending**

This wave reviews all 18 previously review-required inline instructional diagrams. It preserves already-qualified diagrams behind exact fingerprints, expands five missing learner-facing titles and alternatives, and corrects one undersized SVG label. It does not claim psychometric calibration, clinical guidance, production validation, or independent expert validation.

## Result

- Source-reviewed inline diagram placements: ${items.length}
- Learner-facing metadata expansions: ${artifact.summary.learnerMetadataExpanded}
- SVG label-size corrections: ${artifact.summary.svgLabelSizeCorrections}
- Distinct named sources: ${artifact.summary.distinctNamedSources}
- Projected source-reviewed placement count after learning-library regeneration: 40 -> 58
- Projected review-required placement count after learning-library regeneration: 18 -> 0
- Independently expert validated: 0

## Sources and corrections

${items.map((item) => `### ${item.sequence}. ${item.title}

Placement: ${item.chapterId}, section ${item.sectionIndex} - ${item.expectedHeading}

${item.correctionSummary}

${item.sourceDetails.map((source) => `- [${source.title}](${source.url}) - ${source.organization}. ${source.whyReputable}`).join('\n')}

Review note: ${item.reviewNote}`).join('\n\n')}
`;

for (const scope of scopes) {
  for (const [sourceFile, candidate] of scope.candidates) {
    writeFileWithRetry(path.join(scope.root, sourceFile), candidate);
  }
}
const jsonText = `${JSON.stringify(artifact, null, 2)}\n`;
for (const artifactRoot of artifactRoots) {
  writeFileWithRetry(path.join(artifactRoot, `${artifactName}.json`), jsonText);
  writeFileWithRetry(path.join(artifactRoot, `${artifactName}.md`), markdown);
}

console.log(`EPPP diagram quality wave 07: source-reviewed ${items.length} inline placements; projected review-required count is 0.`);
