import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { buildDiagramCatalog } = require('../dev-tools/eppp_diagram_catalog.cjs');
const root = resolve(import.meta.dirname, '..');
const read = (relativePath) => fs.readFileSync(resolve(root, relativePath), 'utf8');
const json = (relativePath) => JSON.parse(read(relativePath));

const expected = [
  ['diagram-placement-ch-11-section-05', 'ch-11', 5, 'js/textbook_ch11.js'],
  ['diagram-placement-ch-5-section-07', 'ch-5', 7, 'js/textbook_ch5.js'],
  ['diagram-placement-ch-14-section-02', 'ch-14', 2, 'js/textbook_ch14.js'],
  ['diagram-placement-ch-17-section-02', 'ch-17', 2, 'js/textbook_ch17.js'],
  ['diagram-placement-ch-13-section-05', 'ch-13', 5, 'js/textbook_ch13.js'],
  ['diagram-placement-ch-19-section-02', 'ch-19', 2, 'js/textbook_ch19.js'],
];

const chapterCache = new Map();
let diagramCatalogCache = null;

function loadChapter(sourceFile, chapterId, base = 'test_prep/eppp_legacy') {
  const cacheKey = `${base}/${sourceFile}#${chapterId}`;
  if (chapterCache.has(cacheKey)) return chapterCache.get(cacheKey);
  const windowObject = { TextbookChapters: [] };
  windowObject.window = windowObject;
  vm.runInNewContext(read(`${base}/${sourceFile}`), { window: windowObject }, { timeout: 15000 });
  const chapter = windowObject.TextbookChapters.find((entry) => entry.id === chapterId);
  chapterCache.set(cacheKey, chapter);
  return chapter;
}

function loadCurrentDiagramCatalog() {
  if (diagramCatalogCache) return diagramCatalogCache;
  const windowObject = {};
  windowObject.window = windowObject;
  const documentStub = {
    readyState: 'complete',
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  windowObject.document = documentStub;
  const context = vm.createContext({
    window: windowObject,
    document: documentStub,
    console: { log() {}, warn() {}, error() {} },
    setTimeout(callback) { if (typeof callback === 'function') callback(); return 1; },
    clearTimeout() {},
  });
  const html = read('test_prep/eppp_legacy/index.html');
  const scriptPaths = Array.from(
    html.matchAll(/<script\s+src=["']([^"']+\.js)(?:\?[^"']*)?["']/gi),
    (match) => match[1],
  );
  for (const relativePath of scriptPaths.filter((entry) => /^js\/textbook_ch(?:\d+|\d+_\d+)\.js$/i.test(entry))) {
    vm.runInContext(read(`test_prep/eppp_legacy/${relativePath}`), context, { filename: relativePath, timeout: 15000 });
  }
  vm.runInContext(read('test_prep/eppp_legacy/js/textbook_diagrams.js'), context, { filename: 'textbook_diagrams.js', timeout: 15000 });
  diagramCatalogCache = buildDiagramCatalog({
    root,
    chapters: windowObject.TextbookChapters,
    diagramTemplates: windowObject._epppDiagrams,
  });
  return diagramCatalogCache;
}
function assertAccessibleStaticSvg(diagram, placementId) {
  expect(diagram.title.trim().length, `${placementId} title`).toBeGreaterThan(0);
  expect(diagram.description.length, `${placementId} full alternative`).toBeGreaterThanOrEqual(120);
  const document = new DOMParser().parseFromString(diagram.svg, 'application/xml');
  expect(document.querySelector('parsererror'), `${placementId} XML`).toBeNull();
  const svg = document.documentElement;
  expect(svg.getAttribute('role')).toBe('img');
  const labelledIds = (svg.getAttribute('aria-labelledby') || '').trim().split(/\s+/);
  expect(labelledIds, `${placementId} labelled-by pair`).toHaveLength(2);
  expect(svg.querySelectorAll(':scope > title')).toHaveLength(1);
  expect(svg.querySelectorAll(':scope > desc')).toHaveLength(1);
  expect(svg.querySelector(':scope > title').id).toBe(labelledIds[0]);
  expect(svg.querySelector(':scope > desc').id).toBe(labelledIds[1]);

  const ids = Array.from(svg.querySelectorAll('[id]'), (node) => node.id);
  expect(new Set(ids).size, `${placementId} unique IDs`).toBe(ids.length);
  for (const match of diagram.svg.matchAll(/url\(#([^)]+)\)|(?:href|xlink:href)="#([^"]+)"/g)) {
    expect(ids, `${placementId} resolves fragment`).toContain(match[1] || match[2]);
  }
  const fontSizes = Array.from(diagram.svg.matchAll(/font-size="([0-9.]+)"/g), (match) => Number(match[1]));
  expect(fontSizes.length, `${placementId} explicit labels`).toBeGreaterThan(0);
  expect(fontSizes.every((size) => size >= 12), `${placementId} minimum font size`).toBe(true);
  expect(diagram.svg).not.toMatch(/<animate(?:Transform|Motion)?\b|\banimation\s*:|cursor\s*:\s*pointer|:hover|\bon(?:click|mouse|focus)\s*=/i);
  expect(`${diagram.title} ${diagram.description} ${diagram.svg}`).not.toMatch(/Content QA|migration provenance|legacy EPPP/i);
}

describe('EPPP inline diagram quality review wave 04', () => {
  it('records six placement-level reviews with complete named sources and explicit expert-pending status', () => {
    const wave = json('test_prep/eppp_diagram_review_wave_04.json');
    expect(wave).toMatchObject({
      schemaVersion: 1,
      reviewWave: 'eppp-diagram-review-wave-04',
      reviewDate: '2026-07-28',
      status: 'assisted-editorial-source-review-complete-expert-pending',
      summary: {
        reviewedDiagramPlacements: 6,
        correctedDiagramPlacements: 6,
        sourceReviewedDiagramPlacements: 6,
        independentExpertValidated: 0,
        status: 'pass',
      },
      projectedCatalogCounts: {
        sourceReviewedDiagramPlacementsBefore: 22,
        sourceReviewedDiagramPlacementsAfter: 28,
        reviewRequiredDiagramPlacementsBefore: 36,
        reviewRequiredDiagramPlacementsAfter: 30,
      },
    });
    expect(wave.items.map((item) => item.placementId)).toEqual(expected.map(([placementId]) => placementId));
    for (const item of wave.items) {
      expect(item).not.toHaveProperty('key');
      expect(item).toMatchObject({
        reviewStatus: 'source-reviewed-editorial-pass',
        reviewWave: wave.reviewWave,
        reviewDate: wave.reviewDate,
        independentExpertStatus: 'pending-independent-qualified-expert-review',
        productionStatus: 'not-production-validated',
        checks: {
          textAlternative: 'editorial-pass',
          conceptAccuracy: 'assisted-editorial-pass-expert-pending',
          labelQuality: 'editorial-pass-minimum-12',
          sourceSupport: 'topically-aligned-reputable-source',
          expertReview: 'pending-independent-review',
        },
      });
      expect(item.reviewNote).toMatch(/Independent qualified expert validation remains pending\.$/);
      expect(item.references).toEqual(item.sourceDetails.map((source) => source.url));
      expect(item.sourceDetails.length).toBeGreaterThan(0);
      for (const source of item.sourceDetails) {
        expect(source.title.length).toBeGreaterThanOrEqual(10);
        expect(source.organization.length).toBeGreaterThanOrEqual(20);
        expect(source.url).toMatch(/^https:\/\//);
        expect(source.whyReputable.length).toBeGreaterThanOrEqual(120);
      }
    }
  });

  it('publishes accessible, static, namespaced diagrams with full alternatives', () => {
    for (const [placementId, chapterId, sectionIndex, sourceFile] of expected) {
      const chapter = loadChapter(sourceFile, chapterId);
      const diagram = chapter.sections[sectionIndex - 1].interactiveDiagram;
      assertAccessibleStaticSvg(diagram, placementId);
      const prefix = placementId.match(/ch-(\d+)/)[1];
      const labelledIds = diagram.svg.match(/aria-labelledby="([^"]+)"/)[1].split(/\s+/);
      expect(labelledIds.every((id) => id.toLowerCase().startsWith(`ch${prefix}`)), `${placementId} namespaced accessible IDs`).toBe(true);
    }
  });

  it('preserves the instructional concepts while removing misleading shortcuts', () => {
    const ch5 = read('test_prep/eppp_legacy/js/textbook_ch5.js');
    const ch11 = read('test_prep/eppp_legacy/js/textbook_ch11.js');
    const ch13 = read('test_prep/eppp_legacy/js/textbook_ch13.js');
    const ch14 = read('test_prep/eppp_legacy/js/textbook_ch14.js');
    const ch17 = read('test_prep/eppp_legacy/js/textbook_ch17.js');
    const ch19 = read('test_prep/eppp_legacy/js/textbook_ch19.js');

    expect(ch5).toContain('Differential Diagnosis Uses Parallel, Revisable Hypotheses');
    expect(ch5).toContain('allow multiple explanations');
    expect(ch11).toContain('Programs may combine features; this is not a universal linear maturity score.');
    expect(ch13).toContain('Six Proposed Relational Conditions');
    expect(ch13).toContain('not proof that three techniques alone guarantee change');
    expect(ch14).toContain('AUTOMATIC THOUGHTS / APPRAISALS');
    expect(ch14).toContain('EMOTION + PHYSIOLOGY');
    expect(ch14).not.toContain('Rapid, distorted cognitions');
    expect(ch17).toContain('not guaranteed effects');
    expect(ch17).toContain('universal, selective, and indicated population-risk categories');
    expect(ch19).toContain('RETURN, PAUSE, OR REASSESSMENT CAN OCCUR');
    expect(ch19).toContain('not a stable trait, moral rank, or guaranteed treatment sequence');
  });

  it('preserves every Chapter 14 section plus the REBT and ERP legacy placement content', () => {
    const expectedHeadings = [
      'Why This Chapter Matters',
      'Beck\u2019s Cognitive Therapy',
      'Rational Emotive Behavior Therapy (Ellis)',
      'Dialectical Behavior Therapy (Linehan)',
      'Acceptance and Commitment Therapy (Hayes)',
      'Behavioral Techniques: Exposure Therapies',
      'Behavioral Techniques: Operant Approaches',
    ];
    for (const base of ['test_prep/eppp_legacy', 'desktop/web-app/public/test_prep/eppp_legacy']) {
      const chapter = loadChapter('js/textbook_ch14.js', 'ch-14', base);
      expect(chapter.sections.map((section) => section.heading), `${base} section headings`).toEqual(expectedHeadings);

      const rebt = chapter.sections[2];
      expect(rebt.content).toContain('The ABC(DE) Model');
      expect(rebt.content).toContain('Where is the evidence you MUST succeed?');
      expect(rebt.keyTerms).toContain('REBT');
      expect(rebt.knowledgeCheck.answer).toBe(2);
      expect(rebt.knowledgeCheck.question).toContain('Where is the evidence that you MUST?');

      const exposure = chapter.sections[5];
      expect(exposure.heading).toBe('Behavioral Techniques: Exposure Therapies');
      expect(exposure.content).toMatch(/Exposure and Response Prevention \(ERP\)/);
      expect(exposure.keyTerms).toContain('ERP');
      expect(exposure.knowledgeCheck.question).toContain('During a planned ERP exercise');
      expect(exposure.knowledgeCheck.answer).toBe(1);
      expect(exposure.interactiveDiagram.title).toBe('Exposure Tests Predictions and Builds Retrievable Learning');
      expect(exposure.interactiveDiagram.description).toContain('objectively safe approach');
      expect(exposure.interactiveDiagram.svg).toContain('within-session fear reduction');
    }

    const erpPlacement = loadCurrentDiagramCatalog().placements
      .find((placement) => placement.id === 'diagram-placement-ch-14-section-06');
    expect(erpPlacement).toMatchObject({
      chapterId: 'ch-14',
      sectionIndex: 6,
      sectionId: 'ch-14-section-5',
      sectionHeading: 'Behavioral Techniques: Exposure Therapies',
      description: expect.stringContaining('objectively safe approach'),
    });
  }, 30000);
  it('keeps all wave 04 placements reviewed as later diagram waves advance the live source catalog', () => {
    const diagramCatalog = loadCurrentDiagramCatalog();
    expect(diagramCatalog.summary).toMatchObject({
      diagramPlacements: 58,
      sourceReviewedDiagramPlacements: 58,
    });
    expect(diagramCatalog.placements.filter((placement) => placement.reviewStatus === 'review-required')).toHaveLength(0);
    for (const [placementId] of expected) {
      expect(diagramCatalog.placements.find((placement) => placement.id === placementId)).toMatchObject({
        origin: 'inline',
        reviewStatus: 'source-reviewed-editorial-pass',
        reviewArtifact: 'eppp_diagram_review_wave_04.json',
        reviewWave: 'eppp-diagram-review-wave-04',
        reviewDate: '2026-07-28',
      });
    }
  }, 30000);

  it('updates each public target in place without replacing independently maintained chapter content', () => {
    for (const [placementId, chapterId, sectionIndex, sourceFile] of expected) {
      const sourceChapter = loadChapter(sourceFile, chapterId);
      const publicChapter = loadChapter(sourceFile, chapterId, 'desktop/web-app/public/test_prep/eppp_legacy');
      expect(publicChapter.sections[sectionIndex - 1].interactiveDiagram, `${placementId} public diagram`)
        .toEqual(sourceChapter.sections[sectionIndex - 1].interactiveDiagram);
      for (const base of ['test_prep/eppp_legacy', 'desktop/web-app/public/test_prep/eppp_legacy']) {
        expect(read(`${base}/${sourceFile}`), `${placementId} ${base} encoding`)
          .not.toMatch(/[\u00e2\u00c3\u00c2\u00ce\u00cf]/);
      }
    }
    expect(loadChapter('js/textbook_ch13.js', 'ch-13', 'desktop/web-app/public/test_prep/eppp_legacy').sections[1].content)
      .toContain('the original "talking cure."');

    for (const relativePath of [
      'test_prep/eppp_diagram_review_wave_04.json',
      'test_prep/eppp_diagram_review_wave_04.md',
    ]) expect(read(`desktop/web-app/public/${relativePath}`)).toBe(read(relativePath));

    const builder = read('_build_test_prep_hub_module.js');
    const wave03Call = 'node "${DIAGRAM_QUALITY_WAVE_03_SCRIPT}"';
    const wave04Call = 'node "${DIAGRAM_QUALITY_WAVE_04_SCRIPT}"';
    const libraryCall = 'node "${LEARNING_LIBRARY_SCRIPT}"';
    expect(builder).toContain("const DIAGRAM_QUALITY_WAVE_04_SCRIPT = path.join(ROOT, 'dev-tools', 'repair_eppp_diagram_quality_wave_04.cjs');");
    expect(builder.indexOf(wave03Call)).toBeLessThan(builder.indexOf(wave04Call));
    expect(builder.indexOf(wave04Call)).toBeLessThan(builder.indexOf(libraryCall));
    expect(read('test_prep/eppp_diagram_review_wave_04.md')).not.toMatch(/Content QA passed|migration provenance|legacy EPPP/i);
    expect(read('test_prep/eppp_diagram_review_wave_04.md')).not.toMatch(/[\u00e2\u00c3\u00c2\u00ce\u00cf]/);
  }, 30000);
  it('uses syntax-aware boundaries and validates both copies before any scoped write', () => {
    const repair = read('dev-tools/repair_eppp_diagram_quality_wave_04.cjs');
    expect(repair).toContain('differs from both the guarded original and the wave 04 result; refusing to overwrite it.');
    expect(repair).toContain('const scopes = [');
    expect(repair).toContain('originalByFile: new Map(), candidateByFile: new Map()');
    expect(repair).toContain('function findMatchingDelimiter(');
    expect(repair).toContain('function findSectionObjectRanges(');
    expect(repair).toContain('function findTopLevelObjectProperty(');
    expect(repair).toContain('function assertChapterStructurePreserved(');
    expect(repair).toContain('function assertNoMojibakeRegression(');
    expect(repair).toContain('allowMissingOriginalInDeploy');
    expect(repair.indexOf('// Read and pre-validate every canonical and deploy copy'))
      .toBeLessThan(repair.indexOf('for (const scope of scopes) {\n  for (const [sourceFile, candidate] of scope.candidateByFile)'));
    expect(repair).toContain('references must exactly mirror named source URLs.');
    expect(repair).toContain('failed runtime validation.');
    expect(repair).not.toContain('withNextProperty');
    expect(repair).not.toContain('asLastProperty');
    expect(repair).not.toContain('writeFileWithRetry(path.join(deployRoot, sourceFile), candidate)');
    expect(repair).not.toContain('chapter.reviewStatus');
    expect(repair).not.toContain('section.reviewStatus');
  });
});
