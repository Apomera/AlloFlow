import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (relativePath) => fs.readFileSync(resolve(root, relativePath), 'utf8');
const json = (relativePath) => JSON.parse(read(relativePath));

const expected = [
  ['diagram-placement-ch-6-section-02', 'ch-6', 2, 'js/textbook_ch6.js'],
  ['diagram-placement-ch-8-section-05', 'ch-8', 5, 'js/textbook_ch8.js'],
  ['diagram-placement-ch-9-section-03', 'ch-9', 3, 'js/textbook_ch9.js'],
  ['diagram-placement-ch-9-section-07', 'ch-9', 7, 'js/textbook_ch9.js'],
  ['diagram-placement-ch-10-section-03', 'ch-10', 3, 'js/textbook_ch10.js'],
  ['diagram-placement-ch-18-section-02', 'ch-18', 2, 'js/textbook_ch18.js'],
];

function loadChapter(sourceFile, chapterId) {
  const windowObject = { TextbookChapters: [] };
  windowObject.window = windowObject;
  vm.runInNewContext(read(`test_prep/eppp_legacy/${sourceFile}`), { window: windowObject }, { timeout: 15000 });
  return windowObject.TextbookChapters.find((chapter) => chapter.id === chapterId);
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

describe('EPPP inline diagram quality review wave 03', () => {
  it('records six placement-level reviews with complete named sources and explicit expert-pending status', () => {
    const wave = json('test_prep/eppp_diagram_review_wave_03.json');
    expect(wave).toMatchObject({
      schemaVersion: 1,
      reviewWave: 'eppp-diagram-review-wave-03',
      reviewDate: '2026-07-17',
      status: 'assisted-editorial-source-review-complete-expert-pending',
      summary: {
        reviewedDiagramPlacements: 6,
        correctedDiagramPlacements: 6,
        sourceReviewedDiagramPlacements: 6,
        independentExpertValidated: 0,
        status: 'pass',
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

  it('removes binary legal and clinical shortcuts while preserving the tested distinctions', () => {
    const ch6 = read('test_prep/eppp_legacy/js/textbook_ch6.js');
    const ch8 = read('test_prep/eppp_legacy/js/textbook_ch8.js');
    const ch9 = read('test_prep/eppp_legacy/js/textbook_ch9.js');
    const ch10 = read('test_prep/eppp_legacy/js/textbook_ch10.js');
    const ch18 = read('test_prep/eppp_legacy/js/textbook_ch18.js');

    expect(ch6).toContain('Factual + rational understanding');
    expect(ch6).toContain('Rational ability to consult with counsel');
    expect(ch8).toContain('Level can differ by domain or task');
    expect(ch8).toContain('not a competence verdict');
    expect(ch9).toContain('Common professional-negligence elements (jurisdiction-specific)');
    expect(ch9).toContain('not necessarily an ethics, licensing, contract, or other proceeding');
    expect(ch9).toContain('A demand is not automatic permission for unrestricted disclosure');
    expect(ch9).toContain('Subpoena/process: do not ignore; HIPAA conditions and protective routes may apply.');
    expect(ch10).toContain('Scores &amp; responses?');
    expect(ch10).toContain('Items &amp; manuals?');
    expect(ch10).not.toContain('RELEASE with authorization');
    expect(ch10).not.toContain('DO NOT RELEASE');
    expect(ch10).toContain('No automatic “release all” • No automatic “never release”');
    expect(ch18).toContain('CONCURRENT TRIAGE');
    expect(ch18).toContain('stages may overlap, repeat, or change order');
    expect(ch18).not.toContain('Crisis Intervention Staircase');
  });

  it('publishes exact public mirrors and orders wave 03 before generated learning assets', () => {
    for (const relativePath of [
      'test_prep/eppp_legacy/js/textbook_ch6.js',
      'test_prep/eppp_legacy/js/textbook_ch8.js',
      'test_prep/eppp_legacy/js/textbook_ch9.js',
      'test_prep/eppp_legacy/js/textbook_ch10.js',
      'test_prep/eppp_legacy/js/textbook_ch18.js',
      'test_prep/eppp_diagram_review_wave_03.json',
      'test_prep/eppp_diagram_review_wave_03.md',
    ]) expect(read(`desktop/web-app/public/${relativePath}`)).toBe(read(relativePath));

    const builder = read('_build_test_prep_hub_module.js');
    const wave02Call = 'node "${DIAGRAM_QUALITY_WAVE_02_SCRIPT}"';
    const wave03Call = 'node "${DIAGRAM_QUALITY_WAVE_03_SCRIPT}"';
    const libraryCall = 'node "${LEARNING_LIBRARY_SCRIPT}"';
    expect(builder).toContain("const DIAGRAM_QUALITY_WAVE_03_SCRIPT = path.join(ROOT, 'dev-tools', 'repair_eppp_diagram_quality_wave_03.cjs');");
    expect(builder.indexOf(wave02Call)).toBeLessThan(builder.indexOf(wave03Call));
    expect(builder.indexOf(wave03Call)).toBeLessThan(builder.indexOf(libraryCall));
    expect(read('test_prep/eppp_diagram_review_wave_03.md')).not.toMatch(/Content QA passed|migration provenance|legacy EPPP/i);
  });

  it('pre-validates placement identity, original fingerprints, sources, and every candidate before writing', () => {
    const repair = read('dev-tools/repair_eppp_diagram_quality_wave_03.cjs');
    expect(repair).toContain('current diagram differs from both the guarded original and the wave 03 result; refusing to overwrite it.');
    expect(repair).toContain('const sourceByFile = new Map();');
    expect(repair).toContain('const candidateByFile = new Map(sourceByFile);');
    expect(repair.indexOf('// Read and pre-validate every source')).toBeLessThan(repair.indexOf('for (const [sourceFile, candidate] of candidateByFile)'));
    expect(repair).toContain('references must exactly mirror named source URLs.');
    expect(repair).toContain('corrected candidate failed runtime validation.');
  });
});
