#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { reviewWave, reviewDate, corrections } = require('./eppp_diagram_quality_wave_04_data.cjs');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'test_prep', 'eppp_legacy');
const deployRoot = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_legacy');
const artifactName = 'eppp_diagram_review_wave_04';
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

function assertPlacement(source, correction, allowCorrected, allowMissingOriginal = false, scopeLabel = 'source') {
  const chapters = loadChapter(source, correction.sourceFile);
  const chapter = chapters.find((entry) => String(entry && entry.id || '') === correction.chapterId);
  if (!chapter) throw new Error(`${correction.placementId}: ${scopeLabel} did not register ${correction.chapterId}.`);
  const section = Array.isArray(chapter.sections) ? chapter.sections[correction.sectionIndex - 1] : null;
  if (!section || section.heading !== correction.expectedHeading) {
    throw new Error(`${correction.placementId}: expected ${scopeLabel} section ${correction.sectionIndex} heading ${JSON.stringify(correction.expectedHeading)}.`);
  }
  const diagram = section.interactiveDiagram;
  if (!diagram || typeof diagram.svg !== 'string') {
    if (allowMissingOriginal) return { chapter, section, diagram: null, isCorrected: false, isMissing: true };
    throw new Error(`${correction.placementId}: expected an inline SVG diagram in ${scopeLabel}.`);
  }

  const isCorrected = diagram.title === correction.title && diagram.description === correction.description && diagram.svg === correction.svg;
  if (allowCorrected && isCorrected) return { chapter, section, diagram, isCorrected: true, isMissing: false };
  if (String(diagram.title || '') !== correction.expectedOriginal.title
      || diagram.description !== correction.expectedOriginal.description
      || sha256(diagram.svg) !== correction.expectedOriginal.svgSha256) {
    throw new Error(`${correction.placementId}: current ${scopeLabel} diagram differs from both the guarded original and the wave 04 result; refusing to overwrite it.`);
  }
  return { chapter, section, diagram, isCorrected: false, isMissing: false };
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

function serializeDiagramObject(correction) {
  return [
    '{',
    `                title: ${JSON.stringify(correction.title)},`,
    `                description: ${JSON.stringify(correction.description)},`,
    `                svg: ${JSON.stringify(correction.svg)}`,
    '            }',
  ].join('\n');
}

function findMatchingDelimiter(source, openIndex, openCharacter, closeCharacter) {
  if (source[openIndex] !== openCharacter) throw new Error(`Expected ${openCharacter} at offset ${openIndex}.`);
  let depth = 1;
  let stringQuote = null;
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
    if (stringQuote) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === stringQuote) {
        stringQuote = null;
      }
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      stringQuote = character;
    } else if (character === '/' && next === '/') {
      lineComment = true;
      index += 1;
    } else if (character === '/' && next === '*') {
      blockComment = true;
      index += 1;
    } else if (character === openCharacter) {
      depth += 1;
    } else if (character === closeCharacter) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error(`Unclosed ${openCharacter} at offset ${openIndex}.`);
}

function skipTriviaAndCommas(source, start, end) {
  let index = start;
  while (index < end) {
    if (/\s|,/.test(source[index])) {
      index += 1;
    } else if (source[index] === '/' && source[index + 1] === '/') {
      const newline = source.indexOf('\n', index + 2);
      index = newline < 0 ? end : newline + 1;
    } else if (source[index] === '/' && source[index + 1] === '*') {
      const close = source.indexOf('*/', index + 2);
      if (close < 0 || close >= end) throw new Error(`Unclosed block comment at offset ${index}.`);
      index = close + 2;
    } else {
      break;
    }
  }
  return index;
}

function findSectionObjectRanges(source) {
  const sectionsMatch = /\bsections\s*:/.exec(source);
  if (!sectionsMatch) throw new Error('Chapter source has no sections property.');
  const arrayOpen = source.indexOf('[', sectionsMatch.index + sectionsMatch[0].length);
  if (arrayOpen < 0) throw new Error('Chapter sections property is not an array literal.');
  const arrayClose = findMatchingDelimiter(source, arrayOpen, '[', ']');
  const ranges = [];
  let cursor = arrayOpen + 1;
  while (cursor < arrayClose) {
    cursor = skipTriviaAndCommas(source, cursor, arrayClose);
    if (cursor >= arrayClose) break;
    if (source[cursor] !== '{') throw new Error(`Expected a section object at offset ${cursor}.`);
    const close = findMatchingDelimiter(source, cursor, '{', '}');
    if (close > arrayClose) throw new Error(`Section object at offset ${cursor} escapes the sections array.`);
    ranges.push({ start: cursor, end: close });
    cursor = close + 1;
  }
  return ranges;
}

function findTopLevelObjectProperty(source, objectRange, propertyName) {
  let braceDepth = 1;
  let bracketDepth = 0;
  let parenDepth = 0;
  let stringQuote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = objectRange.start + 1; index < objectRange.end; index += 1) {
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
    if (stringQuote) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === stringQuote) {
        stringQuote = null;
      }
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      stringQuote = character;
      continue;
    }
    if (character === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === '{') {
      braceDepth += 1;
      continue;
    }
    if (character === '}') {
      braceDepth -= 1;
      continue;
    }
    if (character === '[') {
      bracketDepth += 1;
      continue;
    }
    if (character === ']') {
      bracketDepth -= 1;
      continue;
    }
    if (character === '(') {
      parenDepth += 1;
      continue;
    }
    if (character === ')') {
      parenDepth -= 1;
      continue;
    }
    if (braceDepth !== 1 || bracketDepth !== 0 || parenDepth !== 0) continue;
    if (!/[A-Za-z_$]/.test(character)) continue;

    const identifierMatch = source.slice(index, objectRange.end).match(/^[A-Za-z_$][\w$]*/);
    if (!identifierMatch) continue;
    const identifier = identifierMatch[0];
    const propertyStart = index;
    index += identifier.length - 1;
    if (identifier !== propertyName) continue;

    let cursor = index + 1;
    while (cursor < objectRange.end && /\s/.test(source[cursor])) cursor += 1;
    if (source[cursor] !== ':') continue;
    cursor += 1;
    while (cursor < objectRange.end && /\s/.test(source[cursor])) cursor += 1;
    if (source[cursor] !== '{') throw new Error(`${propertyName} must be an object literal.`);
    const valueEnd = findMatchingDelimiter(source, cursor, '{', '}');
    if (valueEnd > objectRange.end) throw new Error(`${propertyName} escapes its section object.`);
    return { propertyStart, valueStart: cursor, valueEnd };
  }
  return null;
}

function replaceInteractiveBlock(source, correction, allowMissingOriginal = false) {
  const sectionRanges = findSectionObjectRanges(source);
  const sectionRange = sectionRanges[correction.sectionIndex - 1];
  if (!sectionRange) throw new Error(`${correction.placementId}: section ${correction.sectionIndex} object is missing.`);
  const property = findTopLevelObjectProperty(source, sectionRange, 'interactiveDiagram');
  const serialized = serializeDiagramObject(correction);
  if (property) {
    return source.slice(0, property.valueStart) + serialized + source.slice(property.valueEnd + 1);
  }
  if (!allowMissingOriginal) throw new Error(`${correction.placementId}: interactiveDiagram property is missing.`);

  let previousContent = sectionRange.end - 1;
  while (previousContent > sectionRange.start && /\s/.test(source[previousContent])) previousContent -= 1;
  const needsComma = source[previousContent] !== ',' && source[previousContent] !== '{';
  return source.slice(0, previousContent + 1)
    + `${needsComma ? ',' : ''}\n            interactiveDiagram: ${serialized}`
    + source.slice(previousContent + 1);
}

function cloneChapterWithoutTargetDiagram(source, correction) {
  const chapters = loadChapter(source, correction.sourceFile);
  const chapter = chapters.find((entry) => String(entry && entry.id || '') === correction.chapterId);
  if (!chapter) throw new Error(`${correction.placementId}: chapter missing during structural validation.`);
  const clone = JSON.parse(JSON.stringify(chapter));
  const section = Array.isArray(clone.sections) ? clone.sections[correction.sectionIndex - 1] : null;
  if (!section) throw new Error(`${correction.placementId}: target section missing during structural validation.`);
  delete section.interactiveDiagram;
  return clone;
}

function assertChapterStructurePreserved(before, after, correction, scopeLabel) {
  const beforeChapter = cloneChapterWithoutTargetDiagram(before, correction);
  const afterChapter = cloneChapterWithoutTargetDiagram(after, correction);
  const beforeHeadings = beforeChapter.sections.map((section) => section.heading);
  const afterHeadings = afterChapter.sections.map((section) => section.heading);
  if (beforeHeadings.length !== afterHeadings.length) {
    throw new Error(`${correction.placementId}: ${scopeLabel} section count changed (${beforeHeadings.length} to ${afterHeadings.length}).`);
  }
  if (JSON.stringify(beforeHeadings) !== JSON.stringify(afterHeadings)) {
    throw new Error(`${correction.placementId}: ${scopeLabel} section headings or positions changed.`);
  }
  if (JSON.stringify(beforeChapter) !== JSON.stringify(afterChapter)) {
    throw new Error(`${correction.placementId}: ${scopeLabel} non-target chapter content changed.`);
  }
}

function mojibakeCount(source) {
  return (String(source).match(/[\u00e2\u00c3\u00c2\u00ce\u00cf]/g) || []).length;
}

function assertNoMojibakeRegression(before, after, correction, scopeLabel) {
  const beforeCount = mojibakeCount(before);
  const afterCount = mojibakeCount(after);
  if (afterCount > beforeCount) {
    throw new Error(`${correction.placementId}: ${scopeLabel} introduced mojibake (${beforeCount} to ${afterCount} markers).`);
  }
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

// Read and pre-validate every canonical and deploy copy before writing any file.
const scopes = [
  {
    key: 'source',
    label: 'canonical source',
    root: sourceRoot,
    allowMissingOriginal(correction) { return false; },
  },
  {
    key: 'deploy',
    label: 'public deploy copy',
    root: deployRoot,
    allowMissingOriginal(correction) { return Boolean(correction.allowMissingOriginalInDeploy); },
  },
].map((scope) => ({ ...scope, originalByFile: new Map(), candidateByFile: new Map() }));

for (const correction of corrections) {
  if (!/^diagram-placement-ch-\d+-section-\d{2}$/.test(correction.placementId)) throw new Error(`${correction.placementId}: invalid placement ID.`);
  if (!correction.sourceDetails.length || correction.sourceDetails.some((source) => !source.title || !source.organization || !source.url || !source.whyReputable)) {
    throw new Error(`${correction.placementId}: complete named source details are required.`);
  }
  if (correction.references.length !== correction.sourceDetails.length || correction.sourceDetails.some((source) => !correction.references.includes(source.url))) {
    throw new Error(`${correction.placementId}: references must exactly mirror named source URLs.`);
  }
  validateSvg(correction);
  for (const scope of scopes) {
    const filePath = path.join(scope.root, correction.sourceFile);
    if (!fs.existsSync(filePath)) throw new Error(`${correction.placementId}: ${scope.label} file ${correction.sourceFile} is missing.`);
    if (!scope.originalByFile.has(correction.sourceFile)) {
      const original = fs.readFileSync(filePath, 'utf8');
      scope.originalByFile.set(correction.sourceFile, original);
      scope.candidateByFile.set(correction.sourceFile, original);
    }
    assertPlacement(
      scope.originalByFile.get(correction.sourceFile),
      correction,
      true,
      scope.allowMissingOriginal(correction),
      scope.label,
    );
  }
}

for (const scope of scopes) {
  for (const correction of corrections) {
    const original = scope.originalByFile.get(correction.sourceFile);
    const structuralBaseline = applyContentReplacements(original, correction);
    let candidate = scope.candidateByFile.get(correction.sourceFile);
    candidate = applyContentReplacements(candidate, correction);
    const allowMissingOriginal = scope.allowMissingOriginal(correction);
    const current = assertPlacement(candidate, correction, true, allowMissingOriginal, scope.label);
    if (!current.isCorrected) candidate = replaceInteractiveBlock(candidate, correction, allowMissingOriginal && current.isMissing);
    assertChapterStructurePreserved(structuralBaseline, candidate, correction, scope.label);
    assertNoMojibakeRegression(original, candidate, correction, scope.label);
    scope.candidateByFile.set(correction.sourceFile, candidate);
  }
}

// Validate every complete in-memory candidate before writing any source, deploy copy, or artifact.
for (const scope of scopes) {
  for (const correction of corrections) {
    const original = scope.originalByFile.get(correction.sourceFile);
    const structuralBaseline = applyContentReplacements(original, correction);
    const candidate = scope.candidateByFile.get(correction.sourceFile);
    const result = assertPlacement(candidate, correction, true, false, scope.label);
    if (!result.isCorrected) throw new Error(`${correction.placementId}: corrected ${scope.label} candidate failed runtime validation.`);
    assertChapterStructurePreserved(structuralBaseline, candidate, correction, scope.label);
    assertNoMojibakeRegression(original, candidate, correction, scope.label);
    for (const replacement of correction.contentReplacements || []) {
      if (occurrenceCount(candidate, replacement.from) !== 0 || occurrenceCount(candidate, replacement.to) !== 1) {
        throw new Error(`${correction.placementId}: ${scope.label} chapter wording repair failed post-validation.`);
      }
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
  projectedCatalogCounts: {
    sourceReviewedDiagramPlacementsBefore: 22,
    sourceReviewedDiagramPlacementsAfter: 28,
    reviewRequiredDiagramPlacementsBefore: 36,
    reviewRequiredDiagramPlacementsAfter: 30,
  },
  items,
};

const markdown = `# EPPP diagram review wave 04

Reviewed: ${reviewDate}

Status: **assisted editorial, accessibility, and source review complete; independent qualified expert validation pending**

This wave corrects six inline instructional diagrams and records their current chapter placements. It does not claim psychometric calibration, clinical guidance, production validation, or independent expert validation.

## Result

- Corrected and source-reviewed inline diagram placements: ${items.length}
- Distinct named sources: ${artifact.summary.distinctNamedSources}
- Projected source-reviewed placement count after learning-library regeneration: 22 -> 28
- Projected review-required placement count after learning-library regeneration: 36 -> 30
- Independently expert validated: 0

## Sources and corrections

${items.map((item) => `### ${item.sequence}. ${item.title}

Placement: ${item.chapterId}, section ${item.sectionIndex} - ${item.expectedHeading}

${item.correctionSummary}

${item.sourceDetails.map((source) => `- [${source.title}](${source.url}) - ${source.organization}. ${source.whyReputable}`).join('\n')}

Review note: ${item.reviewNote}`).join('\n\n')}
`;

for (const scope of scopes) {
  for (const [sourceFile, candidate] of scope.candidateByFile) {
    writeFileWithRetry(path.join(scope.root, sourceFile), candidate);
  }
}
const jsonText = JSON.stringify(artifact, null, 2) + '\n';
for (const artifactRoot of artifactRoots) {
  writeFileWithRetry(path.join(artifactRoot, `${artifactName}.json`), jsonText);
  writeFileWithRetry(path.join(artifactRoot, `${artifactName}.md`), markdown);
}

console.log(`EPPP diagram quality wave 04: corrected and source-reviewed ${items.length} inline placements.`);
