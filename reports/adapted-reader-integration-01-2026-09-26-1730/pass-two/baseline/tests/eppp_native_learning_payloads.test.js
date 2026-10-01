import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path, { resolve } from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const { buildDiagramCatalog, slug } = require('../dev-tools/eppp_diagram_catalog.cjs');
const { migrateLegacyHtmlContent } = require('../dev-tools/eppp_learning_content_migration.cjs');
const {
  VECTOR_FORMAT,
  buildNativeDiagramProjection,
  buildNativeGlossaryProjection,
  migrateLegacySvgDiagram,
  normalizeTerm,
  occurrenceCount,
} = require('../dev-tools/eppp_native_learning_payloads.cjs');

const {
  openEpppMigrationSourceArchive,
} = require('../dev-tools/eppp_migration_source_archive.cjs');
const root = resolve(process.cwd());
const migrationArchive = openEpppMigrationSourceArchive({ workspaceRoot: root });
const migrationExecution = migrationArchive.manifest.execution.learningLibrary;
const deployRoot = path.join(root, 'desktop', 'web-app', 'public', 'test_prep');
const sha256 = (value) => crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
const normalize = (value) => String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim();

function loadLegacyLearningSources() {
  const windowObject = {};
  const documentStub = {
    readyState: 'complete',
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  const context = vm.createContext({
    window: windowObject,
    document: documentStub,
    console: { log() {}, warn() {}, error() {} },
  });
  windowObject.window = windowObject;
  windowObject.document = documentStub;
  const chapterSourceById = new Map();
  const run = (relativePath) => vm.runInContext(
    migrationArchive.readText(relativePath),
    context,
    { filename: relativePath, timeout: 15000 },
  );
  for (const relativePath of migrationExecution.chapters) {
    const before = (windowObject.TextbookChapters || []).length;
    run(relativePath);
    for (const chapter of (windowObject.TextbookChapters || []).slice(before)) {
      chapterSourceById.set(String(chapter.id || ''), relativePath);
    }
  }
  for (const relativePath of migrationExecution.diagrams) run(relativePath);
  for (const relativePath of migrationExecution.glossary) run(relativePath);
  return {
    chapters: windowObject.TextbookChapters || [],
    diagramTemplates: windowObject._epppDiagrams || {},
    termDefinitions: windowObject._epppTermDefs || {},
    termDefinitionsSource: migrationArchive.readText(migrationExecution.glossary[0]),
    chapterSourceById,
  };
}

function textLabels(rawSvg) {
  const fragment = JSDOM.fragment(String(rawSvg || ''));
  return Array.from(fragment.querySelectorAll('title, desc, text'))
    .map((element) => normalize(element.textContent))
    .filter(Boolean);
}

function expectedAlternative(diagram) {
  const title = normalize(diagram && diagram.title);
  const caption = normalize(diagram && diagram.caption);
  const description = normalize(diagram && diagram.description);
  const labels = textLabels(diagram && diagram.svg);
  return [
    title && `Title: ${title}`,
    caption && `Caption: ${caption}`,
    description && `Description: ${description}`,
    labels.length && `Diagram labels in source reading order:\n${labels.map(
      (label, index) => `${index + 1}. ${label}`,
    ).join('\n')}`,
  ].filter(Boolean).join('\n\n');
}

function nativeChaptersFromLegacy(chapters) {
  return chapters.map((chapter, chapterIndex) => ({
    id: String(chapter.id || `chapter-${chapterIndex + 1}`),
    title: normalize(chapter.title),
    domain: normalize(chapter.domain),
    domainNumber: Number(chapter.domainNumber) || null,
    sections: (Array.isArray(chapter.sections) ? chapter.sections : []).map((section, sectionIndex) => ({
      id: `${String(chapter.id || `chapter-${chapterIndex + 1}`)}-section-${sectionIndex + 1}`,
      heading: normalize(section.heading),
      content: migrateLegacyHtmlContent(section.content).plainText,
      keyTerms: (Array.isArray(section.keyTerms) ? section.keyTerms : []).map(normalize).filter(Boolean),
    })),
  }));
}

function independentlyCountDeclarations(source) {
  const terms = [];
  const pattern = /^\s*(['"])((?:\\.|(?!\1).)*)\1\s*:/gm;
  for (const match of source.matchAll(pattern)) {
    terms.push(vm.runInNewContext(`${match[1]}${match[2]}${match[1]}`, Object.create(null)));
  }
  return terms;
}

const sources = loadLegacyLearningSources();
const diagramCatalog = buildDiagramCatalog({
  root,
  chapters: sources.chapters,
  diagramTemplates: sources.diagramTemplates,
  chapterSourceById: sources.chapterSourceById,
});
const diagramProjection = buildNativeDiagramProjection({
  diagramTemplates: sources.diagramTemplates,
  chapters: sources.chapters,
  diagramCatalog,
  chapterSourceById: sources.chapterSourceById,
});
const glossaryProjection = buildNativeGlossaryProjection({
  legacyDefinitions: sources.termDefinitions,
  legacySource: sources.termDefinitionsSource,
  chapters: nativeChaptersFromLegacy(sources.chapters),
});

describe('EPPP inert native diagram migration', () => {
  it('derives a complete unique payload set and one binding for every legacy placement', () => {
    const templateObjects = new Set(Object.values(sources.diagramTemplates));
    const expectedInline = sources.chapters.flatMap((chapter) => chapter.sections || [])
      .filter((section) => section.interactiveDiagram && !templateObjects.has(section.interactiveDiagram));
    const expectedPayloadCount = Object.keys(sources.diagramTemplates).length + expectedInline.length;

    expect(diagramProjection.records).toHaveLength(expectedPayloadCount);
    expect(diagramProjection.placementBindings).toHaveLength(diagramCatalog.placements.length);
    expect(new Set(diagramProjection.records.map((record) => record.id)).size).toBe(expectedPayloadCount);
    expect(new Set(diagramProjection.placementBindings.map((record) => record.placementId)).size)
      .toBe(diagramCatalog.placements.length);
    expect(diagramProjection.summary).toMatchObject({
      nativeDiagramPayloads: expectedPayloadCount,
      nativeTemplateDiagramPayloads: Object.keys(sources.diagramTemplates).length,
      nativeInlineDiagramPayloads: expectedInline.length,
      nativeDiagramPlacements: diagramCatalog.placements.length,
      nativeDiagramTextAlternatives: expectedPayloadCount,
    });
    expect(diagramProjection.migration).toMatchObject({
      status: 'complete-native-projection-expert-pending',
      format: VECTOR_FORMAT,
      sourceDiagramPayloads: expectedPayloadCount,
      nativeDiagramPayloads: expectedPayloadCount,
      learnerVisiblePlacements: diagramCatalog.placements.length,
      mappedLearnerVisiblePlacements: diagramCatalog.placements.length,
      missingPlacementMappings: 0,
      duplicatePayloadIds: 0,
    });
    expect(diagramProjection.migration.reviewBoundary).toContain('not independent qualified-expert review');
  });

  it('preserves source fingerprints, labels, reading order, descriptions, and complete alternatives', () => {
    const templateById = new Map(Object.entries(sources.diagramTemplates).map(([key, diagram]) => [
      `diagram-${slug(key)}`,
      diagram,
    ]));
    const placementByDiagramId = new Map(diagramCatalog.placements.map((placement) => [
      placement.diagramId,
      placement,
    ]));
    const chapterById = new Map(sources.chapters.map((chapter) => [String(chapter.id), chapter]));

    for (const record of diagramProjection.records) {
      let sourceDiagram = templateById.get(record.id);
      if (!sourceDiagram) {
        const placement = placementByDiagramId.get(record.id);
        const chapter = chapterById.get(placement.chapterId);
        sourceDiagram = chapter.sections[placement.sectionIndex - 1].interactiveDiagram;
      }
      const labels = textLabels(sourceDiagram.svg);
      expect(record.fingerprints.legacySvg).toBe(sha256(sourceDiagram.svg));
      expect(record.title).toBe(normalize(sourceDiagram.title));
      expect(record.caption).toBe(normalize(sourceDiagram.caption));
      expect(record.description).toBe(normalize(sourceDiagram.description));
      expect(record.readingOrder.map((entry) => entry.text)).toEqual(labels);
      expect(record.readingOrder.map((entry) => entry.order))
        .toEqual(labels.map((_, index) => index + 1));
      expect(record.textAlternative).toMatchObject({
        complete: true,
        title: normalize(sourceDiagram.title),
        caption: normalize(sourceDiagram.caption),
        description: normalize(sourceDiagram.description),
        orderedLabels: labels,
        orderedText: expectedAlternative(sourceDiagram),
      });
      expect(record.fingerprints.completeTextAlternative)
        .toBe(sha256(record.textAlternative.orderedText));
      expect(record.placementIds.length).toBeGreaterThanOrEqual(0);
    }
  });

  it('stores only inert allowlisted primitives and local references without raw markup', () => {
    const allowedTypes = new Set([
      'group', 'rect', 'circle', 'ellipse', 'line', 'path', 'polygon', 'text',
      'accessibility-title', 'accessibility-description', 'use', 'definitions', 'linear-gradient', 'radial-gradient', 'gradient-stop',
      'marker', 'clip-path', 'filter', 'gaussian-blur', 'composite', 'drop-shadow',
    ]);
    const serialized = JSON.stringify(diagramProjection.records);
    expect(serialized).not.toMatch(/<(?:svg|script|style|foreignObject)\b/i);
    expect(serialized).not.toMatch(/javascript\s*:|data\s*:|https?:\/\/|xlink:href/i);

    for (const record of diagramProjection.records) {
      expect(record).not.toHaveProperty('svg');
      expect(record).not.toHaveProperty('html');
      expect(record.safety).toMatchObject({
        rawMarkupStored: false,
        externalReferencesAllowed: false,
        scriptsAllowed: false,
        eventHandlersAllowed: false,
        foreignObjectsAllowed: false,
        activeStylesStored: false,
        motionEnabledByDefault: false,
      });
      const sourceIds = new Set();
      const references = [];
      const visit = (nodes) => {
        for (const node of nodes) {
          expect(allowedTypes.has(node.type)).toBe(true);
          expect(node).not.toHaveProperty('style');
          expect(node).not.toHaveProperty('class');
          for (const [name, value] of Object.entries(node.attributes)) {
            expect(name).not.toMatch(/^on/i);
            expect(value).not.toMatch(/javascript\s*:|data\s*:|https?:\/\/|expression\s*\(|@import/i);
            if (name === 'id') sourceIds.add(value);
            if (name === 'href') references.push(value.slice(1));
            if (['clip-path', 'filter', 'marker-start', 'marker-end'].includes(name)) {
              const match = value.match(/#([A-Za-z_][A-Za-z0-9_.:-]*)/);
              if (match) references.push(match[1]);
            }
          }
          if (node.children) visit(node.children);
        }
      };
      visit(record.vector.nodes);
      expect(references.every((reference) => sourceIds.has(reference))).toBe(true);
      expect(record.vector.motion.every((motion) => motion.enabledByDefault === false)).toBe(true);
    }
  });

  it('rejects executable elements, event handlers, foreign objects, and external references/styles', () => {
    const wrap = (body) => ({ title: 'Fixture', description: 'Fixture description', svg: `<svg viewBox="0 0 100 100">${body}</svg>` });
    expect(() => migrateLegacySvgDiagram(wrap('<script>alert(1)</script>'))).toThrow(/Forbidden/);
    expect(() => migrateLegacySvgDiagram(wrap('<foreignObject><div>unsafe</div></foreignObject>'))).toThrow(/Forbidden/);
    expect(() => migrateLegacySvgDiagram(wrap('<rect x="0" y="0" width="10" height="10" onclick="bad()"/>'))).toThrow(/Event handler/);
    expect(() => migrateLegacySvgDiagram(wrap('<use href="https://example.com/x.svg#node"/>'))).toThrow(/Unsafe/);
    expect(() => migrateLegacySvgDiagram(wrap('<style>.x{fill:url(https://example.com/x.svg)}</style><rect class="x" x="0" y="0" width="10" height="10"/>'))).toThrow(/Unsafe/);
    expect(() => migrateLegacySvgDiagram(wrap('<use href="#missing"/>'))).toThrow(/Unresolved local/);
    expect(() => migrateLegacySvgDiagram(wrap('<image href="data:image/png;base64,abc"/>'))).toThrow(/Forbidden/);
  });
});

describe('EPPP native glossary migration', () => {
  it('projects every effective legacy term exactly once and records overwritten source declarations', () => {
    const effectiveEntries = Object.entries(sources.termDefinitions);
    const declarations = independentlyCountDeclarations(sources.termDefinitionsSource);
    const duplicateDeclarations = declarations.length - new Set(declarations).size;

    expect(glossaryProjection.records).toHaveLength(effectiveEntries.length);
    expect(new Set(glossaryProjection.records.map((record) => record.id)).size)
      .toBe(effectiveEntries.length);
    expect(new Set(glossaryProjection.records.map((record) => record.normalizedTerm)).size)
      .toBe(effectiveEntries.length);
    expect(glossaryProjection.migration).toMatchObject({
      status: 'complete-native-projection-expert-pending',
      format: 'alloflow-native-glossary-v1',
      sourceDeclarations: declarations.length,
      effectiveLegacyTerms: effectiveEntries.length,
      overwrittenDuplicateDeclarations: duplicateDeclarations,
      nativeTerms: effectiveEntries.length,
      missingMappings: 0,
      duplicateNativeIds: 0,
      duplicateNormalizedTerms: 0,
      sourceAssetSha256: sha256(sources.termDefinitionsSource),
    });
    expect(glossaryProjection.migration.duplicateSourceKeys)
      .toHaveLength(new Set(declarations.filter((term, index) => declarations.indexOf(term) !== index)).size);
    expect(glossaryProjection.migration.reviewBoundary)
      .toContain('do not constitute independent qualified-expert review');
  });

  it('preserves normalized term-definition semantics, stable IDs, and pending review gates', () => {
    const effectiveEntries = Object.entries(sources.termDefinitions);
    for (const [index, [legacyTerm, legacyDefinition]] of effectiveEntries.entries()) {
      const record = glossaryProjection.records[index];
      expect(record).toMatchObject({
        schemaVersion: 1,
        term: normalize(legacyTerm),
        normalizedTerm: normalizeTerm(legacyTerm),
        definition: normalize(legacyDefinition),
        reviewStatus: 'migration-parity-only-expert-pending',
        independentExpertStatus: 'not-started',
        productionStatus: 'not-production-validated',
        sourceMetadata: {
          legacyAsset: 'migration_sources/eppp/v1/js/textbook_term_defs.js',
          effectiveObjectIndex: index + 1,
        },
      });
      expect(record.id).toMatch(/^eppp-term-[a-f0-9]{16}$/);
      expect(record.fingerprints).toMatchObject({
        algorithm: 'sha256',
        legacyTerm: sha256(legacyTerm),
        legacyDefinition: sha256(legacyDefinition),
        normalizedTerm: sha256(normalizeTerm(legacyTerm)),
        normalizedDefinition: sha256(normalize(legacyDefinition)),
      });
      expect(Object.keys(record)).not.toContain('html');
      expect(Object.keys(record)).not.toContain('source');
    }
    expect(JSON.stringify(glossaryProjection.records)).not.toMatch(/<(?:script|style|iframe)\b/i);
  });

  it('derives only exact-definition aliases and evidence-backed chapter/domain occurrences', () => {
    const byTerm = new Map(glossaryProjection.records.map((record) => [record.term, record]));
    const nativeChapters = nativeChaptersFromLegacy(sources.chapters);
    for (const record of glossaryProjection.records) {
      for (const alias of record.aliases) {
        const aliasRecord = byTerm.get(alias);
        expect(aliasRecord).toBeTruthy();
        expect(normalize(aliasRecord.definition).toLocaleLowerCase('en-US'))
          .toBe(normalize(record.definition).toLocaleLowerCase('en-US'));
        expect(aliasRecord.aliases).toContain(record.term);
        expect(record.aliasDerivation).toBe('exact-normalized-definition-match-in-legacy-payload');
      }
      expect(record.linkage.occurrenceCount)
        .toBe(record.linkage.occurrences.reduce((sum, occurrence) => sum + occurrence.occurrences, 0));
      expect(record.chapterIds)
        .toEqual([...new Set(record.linkage.occurrences.map((occurrence) => occurrence.chapterId))]);
      expect(record.domainIds)
        .toEqual([...new Set(record.linkage.occurrences.map((occurrence) => occurrence.domainId).filter(Number.isFinite))].sort((a, b) => a - b));
      for (const occurrence of record.linkage.occurrences) {
        const chapter = nativeChapters.find((candidate) => candidate.id === occurrence.chapterId);
        const section = chapter.sections.find((candidate) => candidate.id === occurrence.sectionId);
        expect(occurrence.occurrences).toBe(occurrenceCount([
          section.heading,
          section.content,
          ...section.keyTerms,
        ].join('\n'), record.term));
        expect(occurrence.occurrences).toBeGreaterThan(0);
      }
    }
  }, 30000);

  it('rejects active glossary markup rather than storing it', () => {
    expect(() => buildNativeGlossaryProjection({
      legacyDefinitions: { unsafe: '<script>alert(1)</script>' },
      legacySource: "window._epppTermDefs = {\n  'unsafe': '<script>alert(1)</script>'\n};",
      chapters: [],
    })).toThrow(/Unsupported EPPP glossary markup element/);
  });
});

describe('EPPP generated native learning payload deployment', () => {
  it('publishes the native diagrams, glossary, migration manifests, and byte-identical mirrors', () => {
    const sourceCatalogPath = path.join(root, 'test_prep', 'eppp_learning_library.json');
    const deployCatalogPath = path.join(deployRoot, 'eppp_learning_library.json');
    const sourceQaPath = path.join(root, 'test_prep', 'eppp_learning_library_qa.json');
    const deployQaPath = path.join(deployRoot, 'eppp_learning_library_qa.json');
    const catalog = JSON.parse(fs.readFileSync(sourceCatalogPath, 'utf8'));
    const effectiveTerms = Object.keys(sources.termDefinitions).length;

    expect(catalog.migrationSourceArchive).toMatchObject({
      archiveId: migrationArchive.manifest.archiveId,
      root: migrationArchive.archiveRootRelative,
      manifestSha256: migrationArchive.manifestSha256,
      payloadSha256: migrationArchive.payloadSha256,
      verifiedFiles: migrationArchive.manifest.files.length,
    });
    expect(catalog.nativeDiagrams).toHaveLength(diagramProjection.records.length);
    expect(catalog.glossary).toHaveLength(effectiveTerms);
    expect(catalog.diagramMigration).toMatchObject({
      nativeDiagramPayloads: diagramProjection.records.length,
      learnerVisiblePlacements: diagramCatalog.placements.length,
      missingPlacementMappings: 0,
    });
    expect(catalog.glossaryMigration).toMatchObject({
      effectiveLegacyTerms: effectiveTerms,
      nativeTerms: effectiveTerms,
      missingMappings: 0,
    });
    expect(catalog.summary).toMatchObject({
      nativeDiagramPayloads: diagramProjection.records.length,
      nativeDiagramPlacements: diagramCatalog.placements.length,
      glossaryTerms: effectiveTerms,
    });
    expect(fs.readFileSync(deployCatalogPath).equals(fs.readFileSync(sourceCatalogPath))).toBe(true);
    expect(fs.readFileSync(deployQaPath).equals(fs.readFileSync(sourceQaPath))).toBe(true);
  });
});
