import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { corrections } = require('../dev-tools/eppp_diagram_quality_wave_07_data.cjs');
const root = resolve(import.meta.dirname, '..');
const read = (relativePath) => fs.readFileSync(resolve(root, relativePath), 'utf8');
const json = (relativePath) => JSON.parse(read(relativePath));
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const expected = [
  ['diagram-placement-ch-3-section-11', 'ch-3', 11, 'js/textbook_ch5_3.js'],
  ['diagram-placement-ch-4-section-03', 'ch-4', 3, 'js/textbook_ch4.js'],
  ['diagram-placement-ch-12-section-02', 'ch-12', 2, 'js/textbook_ch12.js'],
  ['diagram-placement-ch-23-section-03', 'ch-23', 3, 'js/textbook_ch23.js'],
  ['diagram-placement-ch-24-section-03', 'ch-24', 3, 'js/textbook_ch24.js'],
  ['diagram-placement-ch-26-section-03', 'ch-26', 3, 'js/textbook_ch26.js'],
  ['diagram-placement-ch-27-section-03', 'ch-27', 3, 'js/textbook_ch27.js'],
  ['diagram-placement-ch-29-section-02', 'ch-29', 2, 'js/textbook_ch29.js'],
  ['diagram-placement-ch-30-section-02', 'ch-30', 2, 'js/textbook_ch30.js'],
  ['diagram-placement-ch-31-section-03', 'ch-31', 3, 'js/textbook_ch31.js'],
  ['diagram-placement-ch-32-section-02', 'ch-32', 2, 'js/textbook_ch32.js'],
  ['diagram-placement-ch-33-section-02', 'ch-33', 2, 'js/textbook_ch33.js'],
  ['diagram-placement-ch-35-section-05', 'ch-35', 5, 'js/textbook_ch35.js'],
  ['diagram-placement-ch-37-section-02', 'ch-37', 2, 'js/textbook_ch37.js'],
  ['diagram-placement-ch-38-section-04', 'ch-38', 4, 'js/textbook_ch38.js'],
  ['diagram-placement-ch-39-section-02', 'ch-39', 2, 'js/textbook_ch39.js'],
  ['diagram-placement-ch-47-section-01', 'ch-47', 1, 'js/textbook_ch47.js'],
  ['diagram-placement-ch-49-section-01', 'ch-49', 1, 'js/textbook_ch49.js'],
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
  expect(`${diagram.title} ${diagram.description} ${diagram.svg}`).not.toMatch(/[\u00e2\u00c3\u00c2\u00ce\u00cf]/);
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

describe('EPPP inline diagram quality review wave 07', () => {
  it('records all 18 remaining placements with source review and expert validation still pending', () => {
    const wave = json('test_prep/eppp_diagram_review_wave_07.json');
    expect(wave).toMatchObject({
      schemaVersion: 1,
      reviewWave: 'eppp-diagram-review-wave-07',
      reviewDate: '2026-07-28',
      status: 'assisted-editorial-source-review-complete-expert-pending',
      summary: {
        reviewedDiagramPlacements: 18,
        correctedDiagramPlacements: 18,
        sourceReviewedDiagramPlacements: 18,
        learnerMetadataExpanded: 5,
        svgLabelSizeCorrections: 1,
        distinctNamedSources: 23,
        independentExpertValidated: 0,
        status: 'pass',
      },
      projectedCatalogCounts: {
        sourceReviewedDiagramPlacementsBefore: 40,
        sourceReviewedDiagramPlacementsAfter: 58,
        reviewRequiredDiagramPlacementsBefore: 18,
        reviewRequiredDiagramPlacementsAfter: 0,
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
      expect(item.references).toEqual(item.sourceDetails.map((source) => source.url));
      expect(item.sourceDetails.length).toBeGreaterThan(0);
      expect(item.sourceDetails.every((source) => source.whyReputable.length >= 100)).toBe(true);
    }
  });

  it('publishes accessible static diagrams with exact corrected fingerprints in both mirrors', () => {
    for (const [placementId, chapterId, sectionIndex, sourceFile] of expected) {
      const correction = corrections.find((entry) => entry.placementId === placementId);
      const sourceChapter = loadChapter(sourceFile, chapterId);
      const publicChapter = loadChapter(sourceFile, chapterId, 'desktop/web-app/public/test_prep/eppp_legacy');
      const diagram = sourceChapter.sections[sectionIndex - 1].interactiveDiagram;
      assertAccessibleStaticSvg(diagram, placementId);
      expect(diagram.title).toBe(correction.title);
      expect(diagram.description).toBe(correction.description);
      expect(hash(diagram.svg)).toBe(correction.correctedSvgSha256);
      expect(publicChapter.sections[sectionIndex - 1].interactiveDiagram).toEqual(diagram);
      expect(read(`desktop/web-app/public/test_prep/eppp_legacy/${sourceFile}`))
        .toBe(read(`test_prep/eppp_legacy/${sourceFile}`));
    }
  }, 30000);

  it('expands the five missing learner titles and removes ch-47 encoding ambiguity', () => {
    for (const chapterId of ['ch-23', 'ch-24', 'ch-26', 'ch-27', 'ch-49']) {
      const target = expected.find(([, id]) => id === chapterId);
      const diagram = loadChapter(target[3], chapterId).sections[target[2] - 1].interactiveDiagram;
      expect(diagram.title.length).toBeGreaterThan(20);
      expect(diagram.description.length).toBeGreaterThanOrEqual(120);
    }
    const autonomic = loadChapter('js/textbook_ch23.js', 'ch-23').sections[2].interactiveDiagram;
    expect(autonomic.svg).not.toContain('font-size="11"');
    const medication = loadChapter('js/textbook_ch47.js', 'ch-47').sections[0].interactiveDiagram;
    expect(medication.description).toContain('recognition-only safety map, not a prescribing guide');
    expect(medication.description).not.toMatch(/[\u2014\u00e2\u00c3\u00c2\u00ce\u00cf]/);
  });

  it('publishes byte-identical artifacts and runs Wave 07 after Wave 06 before library generation', () => {
    for (const relativePath of [
      'test_prep/eppp_diagram_review_wave_07.json',
      'test_prep/eppp_diagram_review_wave_07.md',
    ]) expect(read(`desktop/web-app/public/${relativePath}`)).toBe(read(relativePath));
    const builder = read('_build_test_prep_hub_module.js');
    const wave06Call = 'node "${DIAGRAM_QUALITY_WAVE_06_SCRIPT}"';
    const wave07Call = 'node "${DIAGRAM_QUALITY_WAVE_07_SCRIPT}"';
    const libraryCall = 'node "${LEARNING_LIBRARY_SCRIPT}"';
    expect(builder).toContain("const DIAGRAM_QUALITY_WAVE_07_SCRIPT = path.join(ROOT, 'dev-tools', 'repair_eppp_diagram_quality_wave_07.cjs');");
    expect(builder.indexOf(wave06Call)).toBeLessThan(builder.indexOf(wave07Call));
    expect(builder.indexOf(wave07Call)).toBeLessThan(builder.indexOf(libraryCall));
    expect(read('test_prep/eppp_diagram_review_wave_07.md')).not.toMatch(/Content QA passed|migration provenance|legacy EPPP/i);
    expect(read('test_prep/eppp_diagram_review_wave_07.md')).not.toMatch(/[\u00e2\u00c3\u00c2\u00ce\u00cf]/);
  });

  it('uses exact original/corrected fingerprints and validates every candidate before writing', () => {
    expect(corrections.map((item) => item.placementId)).toEqual(expected.map(([placementId]) => placementId));
    expect(corrections.every((item) => /^[a-f0-9]{64}$/.test(item.expectedOriginal.svgSha256))).toBe(true);
    expect(corrections.every((item) => /^[a-f0-9]{64}$/.test(item.correctedSvgSha256))).toBe(true);
    expect(corrections.filter((item) => item.svgReplacements.length).map((item) => item.placementId))
      .toEqual(['diagram-placement-ch-23-section-03']);
    const repair = read('dev-tools/repair_eppp_diagram_quality_wave_07.cjs');
    expect(repair).toContain("require('./eppp_diagram_quality_wave_07_data.cjs')");
    expect(repair).toContain('differs from both the guarded original and wave 07 result; refusing to overwrite it.');
    expect(repair).toContain('transformed SVG did not match the declared corrected fingerprint');
    expect(repair.indexOf('for (const correction of corrections) {'))
      .toBeLessThan(repair.indexOf('for (const [sourceFile, candidate] of scope.candidates)'));
    expect(repair).not.toContain('chapter.reviewStatus');
    expect(repair).not.toContain('section.reviewStatus');
  });
});
