import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { buildDiagramCatalog } = require('../dev-tools/eppp_diagram_catalog.cjs');
const { corrections } = require('../dev-tools/eppp_diagram_quality_wave_05_data.cjs');
const root = resolve(import.meta.dirname, '..');
const read = (relativePath) => fs.readFileSync(resolve(root, relativePath), 'utf8');
const json = (relativePath) => JSON.parse(read(relativePath));

const expected = [
  ['diagram-placement-ch-48-section-01', 'ch-48', 1, 'js/textbook_ch48.js'],
  ['diagram-placement-ch-7-section-03', 'ch-7', 3, 'js/textbook_ch7.js'],
  ['diagram-placement-ch-16-section-02', 'ch-16', 2, 'js/textbook_ch16.js'],
  ['diagram-placement-ch-20-section-04', 'ch-20', 4, 'js/textbook_ch20.js'],
  ['diagram-placement-ch-21-section-02', 'ch-21', 2, 'js/textbook_ch21.js'],
  ['diagram-placement-ch-15-section-02', 'ch-15', 2, 'js/textbook_ch15.js'],
];

const expectedHeadings = {
  'ch-7': [
    'Why This Chapter Matters',
    'Structure of the APA Ethics Code',
    'The Five General Principles',
    'The Ten Ethical Standards',
    'Multiple Relationships (Standard 3.05)',
    'Informed Consent (Standard 3.10)',
    'Confidentiality & Its Limits (Standard 4)',
    'Ethical Decision-Making Models',
    'Resolving Ethical Violations (Standard 1.04 & 1.05)',
  ],
  'ch-15': [
    'Why This Chapter Matters',
    'Structural Family Therapy (Minuchin)',
    'Strategic Family Therapy (Haley & MRI)',
    'Bowenian Family Systems Theory',
    'Gottman Method Couples Therapy',
    'Emotionally Focused Therapy (Johnson)',
    'Group Therapy: Yalom\u2019s Therapeutic Factors',
    'Narrative Therapy (White & Epston)',
  ],
  'ch-16': [
    'Why This Chapter Matters',
    'Evidence-Based Practice in Psychology (EBPP)',
    'The Common Factors Debate',
    'Dose-Response and Therapy Outcomes',
    'Antidepressant Medications',
    'Antipsychotic, Anxiolytic & Mood Stabilizer Medications',
    'Stimulants and ADHD Medications',
  ],
  'ch-20': [
    'Why This Chapter Matters',
    'The Neuron & Neural Communication',
    'Cerebral Cortex: The Four Lobes',
    'Language Areas: Broca\u2019s and Wernicke\u2019s',
    'Subcortical Structures',
    'Lateralization & Split-Brain Research',
  ],
  'ch-21': [
    'Why This Chapter Matters',
    'Major Neurotransmitters',
    'The Endocrine System & Stress Response',
    'Behavioral Genetics',
    'Sensation, Perception & Sleep',
  ],
  'ch-48': [
    'The Normal Distribution & Standard Scores',
    'Item Response Theory (IRT)',
  ],
};

const chapterCache = new Map();

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
  return buildDiagramCatalog({
    root,
    chapters: windowObject.TextbookChapters,
    diagramTemplates: windowObject._epppDiagrams,
  });
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

describe('EPPP inline diagram quality review wave 05', () => {
  it('records six high-risk placement reviews with named sources and explicit expert-pending status', () => {
    const wave = json('test_prep/eppp_diagram_review_wave_05.json');
    expect(wave).toMatchObject({
      schemaVersion: 1,
      reviewWave: 'eppp-diagram-review-wave-05',
      reviewDate: '2026-07-28',
      status: 'assisted-editorial-source-review-complete-expert-pending',
      summary: {
        reviewedDiagramPlacements: 6,
        correctedDiagramPlacements: 6,
        sourceReviewedDiagramPlacements: 6,
        distinctNamedSources: 9,
        independentExpertValidated: 0,
        status: 'pass',
      },
      projectedCatalogCounts: {
        sourceReviewedDiagramPlacementsBefore: 28,
        sourceReviewedDiagramPlacementsAfter: 34,
        reviewRequiredDiagramPlacementsBefore: 30,
        reviewRequiredDiagramPlacementsAfter: 24,
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

  it('publishes accessible, static, namespaced diagrams with full alternatives and 12-unit labels', () => {
    for (const [placementId, chapterId, sectionIndex, sourceFile] of expected) {
      const chapter = loadChapter(sourceFile, chapterId);
      const diagram = chapter.sections[sectionIndex - 1].interactiveDiagram;
      assertAccessibleStaticSvg(diagram, placementId);
      const prefix = placementId.match(/ch-(\d+)/)[1];
      const labelledIds = diagram.svg.match(/aria-labelledby="([^"]+)"/)[1].split(/\s+/);
      expect(labelledIds.every((id) => id.toLowerCase().startsWith(`ch${prefix}`)), `${placementId} namespaced accessible IDs`).toBe(true);
    }
  });

  it('replaces misleading shortcuts with source-bounded learner interpretations', () => {
    const diagrams = new Map(expected.map(([placementId, chapterId, sectionIndex, sourceFile]) => [
      chapterId,
      loadChapter(sourceFile, chapterId).sections[sectionIndex - 1].interactiveDiagram,
    ]));
    expect(diagrams.get('ch-48').svg).toContain('34.13%');
    expect(diagrams.get('ch-48').svg).toContain('13.59%');
    expect(diagrams.get('ch-48').svg).toContain('Linear transforms do not make data normal.');
    expect(diagrams.get('ch-7').svg).toContain('aspirational guides');
    expect(diagrams.get('ch-7').svg).toContain('separate Ethical Standards');
    expect(diagrams.get('ch-16').svg).toContain('not interchangeable votes');
    expect(diagrams.get('ch-16').svg).toContain('Monitor benefits, harms, feasibility, and fit');
    expect(diagrams.get('ch-20').svg).toContain('not one-region / one-function rules');
    expect(diagrams.get('ch-20').svg).not.toContain('(Speech Production)');
    expect(diagrams.get('ch-21').svg).toContain('partial agonism');
    expect(diagrams.get('ch-21').svg).toContain('not one-chemical diagnoses');
    expect(diagrams.get('ch-21').svg).not.toContain('BLOCKADE =');
    expect(diagrams.get('ch-15').svg).toContain('Theory labels, not diagnoses or universal judgments.');
    expect(diagrams.get('ch-15').svg).toContain('development, culture, safety, caregiving');
  });

  it('preserves exact chapter section counts, headings, and neighboring high-yield sections in both copies', () => {
    for (const [, chapterId, , sourceFile] of expected) {
      for (const base of ['test_prep/eppp_legacy', 'desktop/web-app/public/test_prep/eppp_legacy']) {
        const chapter = loadChapter(sourceFile, chapterId, base);
        expect(chapter.sections.map((section) => section.heading), `${base} ${chapterId} headings`)
          .toEqual(expectedHeadings[chapterId]);
      }
    }
    const ch20 = loadChapter('js/textbook_ch20.js', 'ch-20');
    expect(ch20.sections[3].knowledgeCheck.answer).toBe(1);
    expect(ch20.sections[4].heading).toBe('Subcortical Structures');
    const ch48 = loadChapter('js/textbook_ch48.js', 'ch-48');
    expect(ch48.sections[0].knowledgeCheck.answer).toBe(2);
    expect(ch48.sections[1].heading).toBe('Item Response Theory (IRT)');
  }, 30000);

  it('keeps Wave 05 placements reviewed as later waves advance the live source catalog', () => {
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
        reviewArtifact: 'eppp_diagram_review_wave_05.json',
        reviewWave: 'eppp-diagram-review-wave-05',
        reviewDate: '2026-07-28',
      });
    }
  }, 30000);

  it('updates each public target in place and orders wave 05 after wave 04 but before generated learning assets', () => {
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
    for (const relativePath of [
      'test_prep/eppp_diagram_review_wave_05.json',
      'test_prep/eppp_diagram_review_wave_05.md',
    ]) expect(read(`desktop/web-app/public/${relativePath}`)).toBe(read(relativePath));

    const builder = read('_build_test_prep_hub_module.js');
    const wave04Call = 'node "${DIAGRAM_QUALITY_WAVE_04_SCRIPT}"';
    const wave05Call = 'node "${DIAGRAM_QUALITY_WAVE_05_SCRIPT}"';
    const libraryCall = 'node "${LEARNING_LIBRARY_SCRIPT}"';
    expect(builder).toContain("const DIAGRAM_QUALITY_WAVE_05_SCRIPT = path.join(ROOT, 'dev-tools', 'repair_eppp_diagram_quality_wave_05.cjs');");
    expect(builder.indexOf(wave04Call)).toBeLessThan(builder.indexOf(wave05Call));
    expect(builder.indexOf(wave05Call)).toBeLessThan(builder.indexOf(libraryCall));
    expect(read('test_prep/eppp_diagram_review_wave_05.md')).not.toMatch(/Content QA passed|migration provenance|legacy EPPP/i);
    expect(read('test_prep/eppp_diagram_review_wave_05.md')).not.toMatch(/[\u00e2\u00c3\u00c2\u00ce\u00cf]/);
  });

  it('uses guarded fingerprints, syntax-aware boundaries, and pre-write structural validation for both copies', () => {
    expect(corrections.map((item) => item.placementId)).toEqual(expected.map(([placementId]) => placementId));
    expect(corrections.every((item) => /^[a-f0-9]{64}$/.test(item.expectedOriginal.svgSha256))).toBe(true);
    const repair = read('dev-tools/repair_eppp_diagram_quality_wave_05.cjs');
    expect(repair).toContain("require('./eppp_diagram_quality_wave_05_data.cjs')");
    expect(repair).toContain('differs from both the guarded original and the wave 05 result; refusing to overwrite it.');
    expect(repair).toContain('const scopes = [');
    expect(repair).toContain('originalByFile: new Map(), candidateByFile: new Map()');
    expect(repair).toContain('function findMatchingDelimiter(');
    expect(repair).toContain('function findSectionObjectRanges(');
    expect(repair).toContain('function findTopLevelObjectProperty(');
    expect(repair).toContain('function assertChapterStructurePreserved(');
    expect(repair).toContain('function assertNoMojibakeRegression(');
    expect(repair.indexOf('// Read and pre-validate every canonical and deploy copy'))
      .toBeLessThan(repair.indexOf('for (const scope of scopes) {\n  for (const [sourceFile, candidate] of scope.candidateByFile)'));
    expect(repair).not.toContain('withNextProperty');
    expect(repair).not.toContain('asLastProperty');
    expect(repair).not.toContain('writeFileWithRetry(path.join(deployRoot, sourceFile), candidate)');
    expect(repair).not.toContain('chapter.reviewStatus');
    expect(repair).not.toContain('section.reviewStatus');
  });
});
