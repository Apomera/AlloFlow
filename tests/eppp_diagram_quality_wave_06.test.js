import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { corrections } = require('../dev-tools/eppp_diagram_quality_wave_06_data.cjs');
const root = resolve(import.meta.dirname, '..');
const read = (relativePath) => fs.readFileSync(resolve(root, relativePath), 'utf8');
const json = (relativePath) => JSON.parse(read(relativePath));
const expected = [
  ['diagram-placement-ch-2-section-02', 'ch-2', 2, 'js/textbook_ch5_2.js'],
  ['diagram-placement-ch-14-section-06', 'ch-14', 6, 'js/textbook_ch14.js'],
  ['diagram-placement-ch-22-section-04', 'ch-22', 4, 'js/textbook_ch22.js'],
  ['diagram-placement-ch-28-section-04', 'ch-28', 4, 'js/textbook_ch28.js'],
  ['diagram-placement-ch-34-section-03', 'ch-34', 3, 'js/textbook_ch34.js'],
  ['diagram-placement-ch-36-section-02', 'ch-36', 2, 'js/textbook_ch36.js'],
];

function loadChapter(sourceFile, chapterId, base = 'test_prep/eppp_legacy') {
  const windowObject = { TextbookChapters: [] };
  windowObject.window = windowObject;
  vm.runInNewContext(read(`${base}/${sourceFile}`), { window: windowObject }, { timeout: 15000 });
  return windowObject.TextbookChapters.find((entry) => entry.id === chapterId);
}

function assertAccessibleStaticSvg(diagram, placementId) {
  expect(diagram.title.trim().length, `${placementId} title`).toBeGreaterThan(0);
  expect(diagram.description.length, `${placementId} alternative`).toBeGreaterThanOrEqual(120);
  const document = new DOMParser().parseFromString(diagram.svg, 'application/xml');
  expect(document.querySelector('parsererror'), `${placementId} XML`).toBeNull();
  const svg = document.documentElement;
  expect(svg.getAttribute('role')).toBe('img');
  const labelledIds = (svg.getAttribute('aria-labelledby') || '').trim().split(/\s+/);
  expect(labelledIds).toHaveLength(2);
  expect(svg.querySelector(':scope > title')?.id).toBe(labelledIds[0]);
  expect(svg.querySelector(':scope > desc')?.id).toBe(labelledIds[1]);
  const ids = Array.from(svg.querySelectorAll('[id]'), (node) => node.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const match of diagram.svg.matchAll(/url\(#([^)]+)\)|(?:href|xlink:href)="#([^"]+)"/g)) {
    expect(ids).toContain(match[1] || match[2]);
  }
  const fontSizes = Array.from(diagram.svg.matchAll(/font-size="([0-9.]+)"/g), (match) => Number(match[1]));
  expect(fontSizes.length).toBeGreaterThan(0);
  expect(fontSizes.every((size) => size >= 12)).toBe(true);
  expect(diagram.svg).not.toMatch(/<animate(?:Transform|Motion)?\b|\banimation\s*:|cursor\s*:\s*pointer|:hover|\bon(?:click|mouse|focus)\s*=/i);
}

describe('EPPP inline diagram quality review wave 06', () => {
  it('records six source-reviewed placements across six blueprint domains with expert validation still pending', () => {
    const wave = json('test_prep/eppp_diagram_review_wave_06.json');
    expect(wave).toMatchObject({
      schemaVersion: 1,
      reviewWave: 'eppp-diagram-review-wave-06',
      reviewDate: '2026-07-28',
      status: 'assisted-editorial-source-review-complete-expert-pending',
      summary: {
        reviewedDiagramPlacements: 6,
        correctedDiagramPlacements: 6,
        sourceReviewedDiagramPlacements: 6,
        distinctNamedSources: 12,
        independentExpertValidated: 0,
        status: 'pass',
      },
      projectedCatalogCounts: {
        sourceReviewedDiagramPlacementsBefore: 34,
        sourceReviewedDiagramPlacementsAfter: 40,
        reviewRequiredDiagramPlacementsBefore: 24,
        reviewRequiredDiagramPlacementsAfter: 18,
      },
    });
    expect(wave.items.map((item) => item.placementId)).toEqual(expected.map(([placementId]) => placementId));
    for (const item of wave.items) {
      expect(item).toMatchObject({
        reviewStatus: 'source-reviewed-editorial-pass',
        independentExpertStatus: 'pending-independent-qualified-expert-review',
        productionStatus: 'not-production-validated',
        checks: {
          textAlternative: 'editorial-pass',
          labelQuality: 'editorial-pass-minimum-12',
          conceptAccuracy: 'assisted-editorial-pass-expert-pending',
          expertReview: 'pending-independent-review',
        },
      });
      expect(item.reviewNote).toMatch(/Independent qualified expert validation remains pending\.$/);
      expect(item.references).toEqual(item.sourceDetails.map((source) => source.url));
      expect(item.sourceDetails.length).toBe(2);
      expect(item.sourceDetails.every((source) => source.whyReputable.length >= 120)).toBe(true);
    }
  });

  it('publishes accessible static SVGs and source-bounded learner interpretations in both mirrors', () => {
    for (const [placementId, chapterId, sectionIndex, sourceFile] of expected) {
      const sourceChapter = loadChapter(sourceFile, chapterId);
      const publicChapter = loadChapter(sourceFile, chapterId, 'desktop/web-app/public/test_prep/eppp_legacy');
      const diagram = sourceChapter.sections[sectionIndex - 1].interactiveDiagram;
      assertAccessibleStaticSvg(diagram, placementId);
      expect(publicChapter.sections[sectionIndex - 1].interactiveDiagram).toEqual(diagram);
      expect(read(`desktop/web-app/public/test_prep/eppp_legacy/${sourceFile}`))
        .toBe(read(`test_prep/eppp_legacy/${sourceFile}`));
    }
    expect(loadChapter('js/textbook_ch5_2.js', 'ch-2').sections[1].content).toContain('generic hierarchy cannot establish a one-to-one construct mapping');
    expect(loadChapter('js/textbook_ch14.js', 'ch-14').sections[5].content).toContain('exposure is not forced contact with genuine danger');
    expect(loadChapter('js/textbook_ch22.js', 'ch-22').sections[3].content).toContain('delirium may be superimposed');
    expect(loadChapter('js/textbook_ch28.js', 'ch-28').sections[3].content).toContain('does not automatically preserve standardization');
    expect(loadChapter('js/textbook_ch34.js', 'ch-34').sections[2].content).toContain('rather than assigning a strategy');
    expect(loadChapter('js/textbook_ch36.js', 'ch-36').sections[1].content).toContain('not a stand-alone screen for maltreatment');
  }, 30000);

  it('publishes byte-identical artifacts and orders Wave 06 after Wave 05 but before library generation', () => {
    for (const relativePath of [
      'test_prep/eppp_diagram_review_wave_06.json',
      'test_prep/eppp_diagram_review_wave_06.md',
    ]) expect(read(`desktop/web-app/public/${relativePath}`)).toBe(read(relativePath));
    const builder = read('_build_test_prep_hub_module.js');
    const wave05Call = 'node "${DIAGRAM_QUALITY_WAVE_05_SCRIPT}"';
    const wave06Call = 'node "${DIAGRAM_QUALITY_WAVE_06_SCRIPT}"';
    const libraryCall = 'node "${LEARNING_LIBRARY_SCRIPT}"';
    expect(builder).toContain("const DIAGRAM_QUALITY_WAVE_06_SCRIPT = path.join(ROOT, 'dev-tools', 'repair_eppp_diagram_quality_wave_06.cjs');");
    expect(builder.indexOf(wave05Call)).toBeLessThan(builder.indexOf(wave06Call));
    expect(builder.indexOf(wave06Call)).toBeLessThan(builder.indexOf(libraryCall));
    expect(read('test_prep/eppp_diagram_review_wave_06.md')).not.toMatch(/Content QA passed|migration provenance|legacy EPPP/i);
    expect(read('test_prep/eppp_diagram_review_wave_06.md')).not.toMatch(/[\u00e2\u00c3\u00c2\u00ce\u00cf]/);
  });

  it('uses exact original fingerprints, guarded content replacements, and all-candidate prevalidation', () => {
    expect(corrections.map((item) => item.placementId)).toEqual(expected.map(([placementId]) => placementId));
    expect(corrections.every((item) => /^[a-f0-9]{64}$/.test(item.expectedOriginal.svgSha256))).toBe(true);
    expect(corrections.every((item) => item.contentReplacements.length === 1)).toBe(true);
    const repair = read('dev-tools/repair_eppp_diagram_quality_wave_06.cjs');
    expect(repair).toContain("require('./eppp_diagram_quality_wave_06_data.cjs')");
    expect(repair).toContain('differs from both the guarded original and the wave 06 result; refusing to overwrite it.');
    expect(repair).toContain('originalByFile: new Map(), candidateByFile: new Map()');
    expect(repair.indexOf('// Read and pre-validate every canonical and deploy copy'))
      .toBeLessThan(repair.indexOf('// Validate every complete in-memory candidate before writing'));
    expect(repair).toContain('guarded chapter wording expected once');
    expect(repair).not.toContain('chapter.reviewStatus');
    expect(repair).not.toContain('section.reviewStatus');
  });
});
