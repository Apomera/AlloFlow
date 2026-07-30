import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const { openEpppMigrationSourceArchive } = require('../dev-tools/eppp_migration_source_archive.cjs');
const root = process.cwd();
const migrationArchive = openEpppMigrationSourceArchive({ workspaceRoot: root });
const migrationExecution = migrationArchive.manifest.execution.learningLibrary;
const sourceCatalogPath = path.resolve(root, 'test_prep/eppp_learning_library.json');
const deployCatalogPath = path.resolve(root, 'desktop/web-app/public/test_prep/eppp_learning_library.json');
const sourceQaPath = path.resolve(root, 'test_prep/eppp_learning_library_qa.json');
const deployQaPath = path.resolve(root, 'desktop/web-app/public/test_prep/eppp_learning_library_qa.json');

const readText = (filePath) => fs.readFileSync(filePath, 'utf8');
const readJson = (filePath) => JSON.parse(readText(filePath));
const sha256 = (value) => createHash('sha256').update(String(value), 'utf8').digest('hex');
const fingerprintManifest = (entries) => sha256(JSON.stringify(entries));

function loadLegacyChapters() {
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
    setTimeout(callback) {
      if (typeof callback === 'function') callback();
      return 1;
    },
    clearTimeout() {},
  });
  windowObject.window = windowObject;
  windowObject.document = documentStub;
  const run = (relativePath) => vm.runInContext(
    migrationArchive.readText(relativePath),
    context,
    { filename: relativePath, timeout: 15000 },
  );
  for (const relativePath of migrationExecution.baseData) run(relativePath);
  for (const relativePath of migrationExecution.chapters) run(relativePath);
  return windowObject.TextbookChapters || [];
}

const semanticBoundaryElements = new Set([
  'address', 'article', 'aside', 'blockquote', 'br', 'dd', 'div', 'dl', 'dt',
  'figcaption', 'figure', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table',
  'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul',
]);

function semanticText(node) {
  if (node.nodeType === 3) return String(node.nodeValue || '');
  if (node.nodeType !== 1 && node.nodeType !== 11) return '';
  const text = Array.from(node.childNodes).map(semanticText).join('');
  if (node.nodeType === 1 && semanticBoundaryElements.has(node.tagName.toLowerCase())) {
    return ` ${text} `;
  }
  return text;
}

function semanticTokens(value) {
  const text = semanticText(JSDOM.fragment(String(value || '')));
  return text.match(/[\p{L}\p{M}]+(?:['’.-][\p{L}\p{M}]+)*|\p{N}+(?:[.,]\p{N}+)*|[<>=≤≥]+/gu) || [];
}

function plainRecordFingerprint(record, fields) {
  return sha256(JSON.stringify(Object.fromEntries(fields.map((field) => [field, record[field]]))));
}

function rawRecordFingerprint(record, fields) {
  return sha256(JSON.stringify(Object.fromEntries(fields.map(
    (field) => [field, String(record && record[field] || '')],
  ))));
}

function assertSafeRuns(runs) {
  expect(Array.isArray(runs)).toBe(true);
  for (const run of runs) {
    expect(['text', 'strong', 'emphasis', 'code', 'subscript', 'superscript', 'line-break', 'link'])
      .toContain(run.type);
    if (run.type === 'text') {
      expect(Object.keys(run).sort()).toEqual(['text', 'type']);
      expect(typeof run.text).toBe('string');
    } else if (run.type === 'line-break') {
      expect(Object.keys(run)).toEqual(['type']);
    } else {
      expect(Object.keys(run).every((key) => ['type', 'url', 'children'].includes(key))).toBe(true);
      if (run.type === 'link') expect(run.url).toMatch(/^https:\/\//i);
      assertSafeRuns(run.children);
    }
  }
}

function assertSafeBlocks(blocks) {
  expect(Array.isArray(blocks)).toBe(true);
  expect(blocks.length).toBeGreaterThan(0);
  for (const block of blocks) {
    expect(['paragraph', 'list', 'table']).toContain(block.type);
    if (block.type === 'paragraph') {
      expect(Object.keys(block).every((key) => ['type', 'text', 'runs', 'variant'].includes(key))).toBe(true);
      expect(block.text).toBeTruthy();
      if (block.variant !== undefined) expect(block.variant).toBe('formula');
      assertSafeRuns(block.runs);
    } else if (block.type === 'list') {
      expect(Object.keys(block).sort()).toEqual(['items', 'ordered', 'type']);
      expect(typeof block.ordered).toBe('boolean');
      expect(block.items.length).toBeGreaterThan(0);
      for (const item of block.items) {
        expect(Object.keys(item).every((key) => ['children', 'runs', 'text'].includes(key))).toBe(true);
        expect(item.text || (item.children && item.children.length)).toBeTruthy();
        assertSafeRuns(item.runs);
        if (item.children !== undefined) assertSafeBlocks(item.children);
      }
    } else {
      expect(Object.keys(block).sort()).toEqual(['rows', 'type']);
      expect(block.rows.length).toBeGreaterThan(0);
      for (const row of block.rows) {
        expect(Object.keys(row)).toEqual(['cells']);
        expect(row.cells.length).toBeGreaterThan(0);
        for (const cell of row.cells) {
          expect(Object.keys(cell).sort()).toEqual(['columnSpan', 'kind', 'runs', 'text']);
          expect(['header', 'cell']).toContain(cell.kind);
          expect(cell.columnSpan).toBeGreaterThanOrEqual(1);
          assertSafeRuns(cell.runs);
        }
      }
    }
  }
}

const legacyChapters = loadLegacyChapters();
const catalog = readJson(sourceCatalogPath);
const nativeSections = catalog.chapters.flatMap((chapter) => chapter.sections.map((section) => ({
  chapterId: chapter.id,
  section,
})));
const nativeByMapping = new Map(nativeSections.map(({ chapterId, section }) => [
  `${chapterId}:${section.legacySectionIndex}`,
  section,
]));

describe('EPPP complete native learning-content migration', () => {
  it('binds generated content to the verified immutable migration archive', () => {
    expect(catalog.migrationSourceArchive).toEqual({
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
    });
    expect(catalog.contentMigration.sourceArchive).toEqual(catalog.migrationSourceArchive);
  });

  it('preserves every legacy section one-to-one without preview truncation or semantic loss', () => {
    const expectedMappings = [];
    let sourceCharacters = 0;
    const sourceManifest = [];
    const plainTextManifest = [];
    const structuredManifest = [];

    expect(legacyChapters).toHaveLength(49);
    for (const [chapterIndex, legacyChapter] of legacyChapters.entries()) {
      const chapterId = String(legacyChapter.id || `chapter-${chapterIndex + 1}`);
      for (const [sectionIndex, legacySection] of (legacyChapter.sections || []).entries()) {
        const legacySectionIndex = sectionIndex + 1;
        const mappingKey = `${chapterId}:${legacySectionIndex}`;
        const native = nativeByMapping.get(mappingKey);
        const rawSource = String(legacySection.content || '');
        expectedMappings.push(mappingKey);
        sourceCharacters += rawSource.length;

        expect(native, `missing native mapping ${mappingKey}`).toBeTruthy();
        expect(native).toMatchObject({
          id: `${chapterId}-section-${legacySectionIndex}`,
          legacySectionIndex,
          contentSchemaVersion: 1,
          contentComplete: true,
          contentTruncated: false,
          sourceContentCharacters: rawSource.length,
          contentCharacters: native.content.length,
          preview: native.content.slice(0, 320),
          previewTruncated: native.content.length > 320,
          reviewStatus: 'source-reviewed-editorial-pass',
        });
        expect(Object.prototype.hasOwnProperty.call(native, 'source')).toBe(false);
        expect(native.contentFingerprints).toEqual({
          algorithm: 'sha256',
          legacySource: sha256(rawSource),
          plainText: sha256(native.content),
          structuredBlocks: sha256(JSON.stringify(native.contentBlocks)),
        });
        expect(semanticTokens(native.content)).toEqual(semanticTokens(rawSource));
        expect(native.content).not.toMatch(/<(?:script|style|iframe|object|embed|form|input|button)\b/i);
        assertSafeBlocks(native.contentBlocks);

        sourceManifest.push({
          chapterId,
          sectionId: native.id,
          legacySectionIndex,
          sourceCharacters: rawSource.length,
          sha256: sha256(rawSource),
        });
        plainTextManifest.push({
          chapterId,
          sectionId: native.id,
          legacySectionIndex,
          characters: native.content.length,
          sha256: sha256(native.content),
        });
        structuredManifest.push({
          chapterId,
          sectionId: native.id,
          legacySectionIndex,
          sha256: sha256(JSON.stringify(native.contentBlocks)),
        });
      }
    }

    const nativeMappings = nativeSections.map(
      ({ chapterId, section }) => `${chapterId}:${section.legacySectionIndex}`,
    );
    expect(expectedMappings).toHaveLength(278);
    expect(nativeMappings).toHaveLength(278);
    expect(new Set(expectedMappings).size).toBe(278);
    expect(new Set(nativeMappings).size).toBe(278);
    expect([...nativeMappings].sort()).toEqual([...expectedMappings].sort());
    expect(new Set(nativeSections.map(({ section }) => section.id)).size).toBe(278);

    expect(catalog.contentMigration).toMatchObject({
      schemaVersion: 1,
      status: 'complete-native-projection-expert-pending',
      sections: 278,
      completeSections: 278,
      missingSections: 0,
      duplicateMappings: 0,
      duplicateSectionIds: 0,
      sourceContentCharacters: sourceCharacters,
      expandableCases: 50,
      reflectiveCodas: 49,
    });
    expect(catalog.contentMigration.mappingManifestSha256).toBe(fingerprintManifest(
      nativeSections.map(({ chapterId, section }) => ({
        chapterId,
        sectionId: section.id,
        legacySectionIndex: section.legacySectionIndex,
      })),
    ));
    expect(catalog.contentMigration.sourceManifestSha256).toBe(fingerprintManifest(sourceManifest));
    expect(catalog.contentMigration.plainTextManifestSha256).toBe(fingerprintManifest(plainTextManifest));
    expect(catalog.contentMigration.structuredManifestSha256).toBe(fingerprintManifest(structuredManifest));
    expect(catalog.contentMigration.previewTruncatedSections).toBe(265);
    expect(catalog.contentMigration.previewTruncatedSections).toBe(
      nativeSections.filter(({ section }) => section.previewTruncated).length,
    );
    expect(catalog.summary.completeSectionContents).toBe(278);
    expect(catalog.summary.previewTruncatedSections).toBe(catalog.contentMigration.previewTruncatedSections);
    expect(catalog.contentMigration.safety).toContain('Raw or executable HTML is not embedded');
    expect(catalog.contentMigration.reviewBoundary).toContain('do not replace independent qualified-expert review');
  }, 30000);

  it('retains comparison operators that the former regex preview path could misread as tags', () => {
    const fullNativeText = nativeSections.map(({ section }) => section.content).join('\n');
    expect(fullNativeText).toContain('Mean < Median < Mode');
    expect(fullNativeText).toContain('p < .05');
  });

  it('preserves all expandable cases, reflective codas, and chapter source references safely', () => {
    const caseFields = ['title', 'clinicalDescription', 'diagnosis', 'explanation'];
    const codaFields = ['teaser', 'content', 'studyNote'];
    const caseManifest = [];
    const codaManifest = [];
    const referenceManifest = [];
    let expandableCases = 0;
    let reflectiveCodas = 0;
    let sourceReferences = 0;

    for (const [chapterIndex, legacyChapter] of legacyChapters.entries()) {
      const chapterId = String(legacyChapter.id || `chapter-${chapterIndex + 1}`);
      const nativeChapter = catalog.chapters.find((chapter) => chapter.id === chapterId);
      expect(nativeChapter).toBeTruthy();

      for (const [sectionIndex, legacySection] of (legacyChapter.sections || []).entries()) {
        const nativeSection = nativeByMapping.get(`${chapterId}:${sectionIndex + 1}`);
        if (!legacySection.expandableCase) {
          expect(nativeSection.expandableCase).toBeNull();
          continue;
        }
        expandableCases += 1;
        const nativeCase = nativeSection.expandableCase;
        expect(nativeCase).toBeTruthy();
        expect(Object.prototype.hasOwnProperty.call(nativeCase, 'source')).toBe(false);
        expect(nativeCase.sourceCharacters).toBe(caseFields.reduce(
          (sum, field) => sum + String(legacySection.expandableCase[field] || '').length,
          0,
        ));
        expect(nativeCase.plainTextCharacters).toBe(caseFields.reduce(
          (sum, field) => sum + nativeCase[field].length,
          0,
        ));
        expect(nativeCase.contentFingerprints).toEqual({
          algorithm: 'sha256',
          legacySource: rawRecordFingerprint(legacySection.expandableCase, caseFields),
          plainText: plainRecordFingerprint(nativeCase, caseFields),
          structuredFields: sha256(JSON.stringify(nativeCase.structuredFields)),
        });
        for (const field of caseFields) {
          expect(semanticTokens(nativeCase[field])).toEqual(
            semanticTokens(legacySection.expandableCase[field]),
          );
          assertSafeBlocks(nativeCase.structuredFields[field]);
        }
        caseManifest.push({
          type: 'expandable-case',
          chapterId,
          sectionId: nativeSection.id,
          legacySectionIndex: sectionIndex + 1,
          sourceCharacters: nativeCase.sourceCharacters,
          plainTextCharacters: nativeCase.plainTextCharacters,
          contentFingerprints: nativeCase.contentFingerprints,
        });
      }

      if (legacyChapter.aiCoda) {
        reflectiveCodas += 1;
        const nativeCoda = nativeChapter.reflectiveCoda;
        expect(nativeCoda).toBeTruthy();
        expect(Object.prototype.hasOwnProperty.call(nativeCoda, 'source')).toBe(false);
        expect(nativeCoda.contentFingerprints).toEqual({
          algorithm: 'sha256',
          legacySource: rawRecordFingerprint(legacyChapter.aiCoda, codaFields),
          plainText: plainRecordFingerprint(nativeCoda, codaFields),
          structuredFields: sha256(JSON.stringify(nativeCoda.structuredFields)),
        });
        for (const field of codaFields) {
          expect(semanticTokens(nativeCoda[field])).toEqual(semanticTokens(legacyChapter.aiCoda[field]));
          assertSafeBlocks(nativeCoda.structuredFields[field]);
        }
        codaManifest.push({
          type: 'reflective-coda',
          chapterId,
          sourceCharacters: nativeCoda.sourceCharacters,
          plainTextCharacters: nativeCoda.plainTextCharacters,
          contentFingerprints: nativeCoda.contentFingerprints,
        });
      } else {
        expect(nativeChapter.reflectiveCoda).toBeNull();
      }

      const legacyReferences = Array.isArray(legacyChapter.references) ? legacyChapter.references : [];
      expect(nativeChapter.references).toHaveLength(legacyReferences.length);
      expect(nativeChapter.sourceReferences).toHaveLength(legacyReferences.length);
      for (const [referenceIndex, legacyReference] of legacyReferences.entries()) {
        sourceReferences += 1;
        const nativeReference = nativeChapter.sourceReferences[referenceIndex];
        expect(nativeReference).toMatchObject({
          id: `${chapterId}-reference-${referenceIndex + 1}`,
          legacyReferenceIndex: referenceIndex + 1,
          sourceCharacters: String(legacyReference || '').length,
          textCharacters: nativeReference.text.length,
        });
        expect(nativeReference.contentFingerprints).toEqual({
          algorithm: 'sha256',
          legacySource: sha256(String(legacyReference || '')),
          plainText: sha256(nativeReference.text),
          structuredBlocks: sha256(JSON.stringify(nativeReference.blocks)),
        });
        expect(nativeChapter.references[referenceIndex]).toBe(nativeReference.text);
        expect(semanticTokens(nativeReference.text)).toEqual(semanticTokens(legacyReference));
        assertSafeBlocks(nativeReference.blocks);
        referenceManifest.push({
          type: 'source-reference',
          chapterId,
          legacyReferenceIndex: referenceIndex + 1,
          sourceCharacters: nativeReference.sourceCharacters,
          textCharacters: nativeReference.textCharacters,
          contentFingerprints: nativeReference.contentFingerprints,
        });
      }
    }

    expect(expandableCases).toBe(50);
    expect(reflectiveCodas).toBe(49);
    expect(catalog.contentMigration).toMatchObject({
      expandableCases,
      reflectiveCodas,
      sourceReferences,
      supplementalManifestSha256: fingerprintManifest([
        ...caseManifest,
        ...codaManifest,
        ...referenceManifest,
      ]),
    });
    expect(catalog.summary).toMatchObject({ expandableCases, reflectiveCodas, sourceReferences });
  }, 30000);

  it('keeps generated source and deploy catalogs and QA reports byte-identical', () => {
    expect(readText(deployCatalogPath)).toBe(readText(sourceCatalogPath));
    expect(readText(deployQaPath)).toBe(readText(sourceQaPath));
  });
});
