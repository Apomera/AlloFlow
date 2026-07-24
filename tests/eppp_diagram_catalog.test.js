import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path, { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildDiagramCatalog } = require('../dev-tools/eppp_diagram_catalog.cjs');
const read = (relativePath) => JSON.parse(fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8'));
const temporaryRoots = [];

function makeReviewFixture(waves) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eppp-diagram-catalog-'));
  temporaryRoots.push(root);
  fs.mkdirSync(path.join(root, 'test_prep'), { recursive: true });
  waves.forEach((items, index) => fs.writeFileSync(
    path.join(root, 'test_prep', `eppp_diagram_review_wave_${String(index + 1).padStart(2, '0')}.json`),
    JSON.stringify({ reviewWave: `fixture-wave-${index + 1}`, reviewDate: '2026-07-17', items }),
    'utf8',
  ));
  return root;
}

const completeFixtureSource = [{
  title: 'Primary fixture source',
  organization: 'Fixture Standards Organization',
  url: 'https://example.org/primary',
  whyReputable: 'A fixture standing in for a directly reviewed authoritative source.',
}];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe('EPPP diagram template and placement catalog', () => {
  const catalog = read('test_prep/eppp_learning_library.json');
  const inventory = read('test_prep/eppp_legacy/content_inventory.json');

  it('catalogs every learner-visible diagram placement and distinguishes template usage from inline diagrams', () => {
    expect(catalog.schemaVersion).toBe(1);
    expect(catalog.summary).toMatchObject({
      diagrams: 25,
      diagramTemplates: 25,
      usedDiagramTemplates: 15,
      unusedDiagramTemplates: 10,
      diagramPlacements: 58,
      sharedTemplateDiagramPlacements: 16,
      inlineDiagramPlacements: 42,
      sourceReviewedDiagramTemplates: 15,
      sourceReviewedDiagramPlacements: 22,
    });
    expect(catalog.diagrams).toHaveLength(25);
    expect(catalog.diagramPlacements).toHaveLength(58);
    expect(new Set(catalog.diagrams.map((template) => template.id)).size).toBe(25);
    expect(new Set(catalog.diagramPlacements.map((placement) => placement.id)).size).toBe(58);
    expect(catalog.diagrams.filter((template) => template.usageStatus === 'used')).toHaveLength(15);
    expect(catalog.diagrams.filter((template) => template.usageStatus === 'unused')).toHaveLength(10);
  });

  it('cross-links every placement to one learner section with stable provenance and conservative review gates', () => {
    const sections = catalog.chapters.flatMap((chapter) => chapter.sections.map((section) => ({ ...section, chapterId: chapter.id })));
    const placedSections = sections.filter((section) => section.hasDiagram);
    const placementById = new Map(catalog.diagramPlacements.map((placement) => [placement.id, placement]));
    const reviewedWaveByKey = new Map([
      ...['hpaAxis', 'memoryModel', 'synapseDrugs', 'visualPathway', 'freudIceberg', 'kohlbergMoral', 'aschConformity']
        .map((key) => [key, { artifact: 'eppp_diagram_review_wave_01.json', wave: 'eppp-diagram-review-wave-01' }]),
      ...['neuronActionPotential', 'brainRegions', 'eriksonStages', 'operantConditioning', 'reliabilityValidity', 'typesOfValidity', 'cbtTriangle', 'dbtModules']
        .map((key) => [key, { artifact: 'eppp_diagram_review_wave_02.json', wave: 'eppp-diagram-review-wave-02' }]),
    ]);
    const wave03PlacementIds = new Set([
      'diagram-placement-ch-6-section-02',
      'diagram-placement-ch-8-section-05',
      'diagram-placement-ch-9-section-03',
      'diagram-placement-ch-9-section-07',
      'diagram-placement-ch-10-section-03',
      'diagram-placement-ch-18-section-02',
    ]);

    expect(placedSections).toHaveLength(58);
    expect(catalog.diagramPlacements.filter((placement) => placement.reviewStatus === 'source-reviewed-editorial-pass')).toHaveLength(22);
    expect(catalog.diagramPlacements.filter((placement) => placement.reviewStatus === 'review-required')).toHaveLength(36);
    expect(placedSections.every((section) => placementById.has(section.diagramPlacementId))).toBe(true);
    for (const placement of catalog.diagramPlacements) {
      expect(placement.id).toMatch(/^diagram-placement-ch-\d+-section-\d{2}$/);
      expect(placement).toMatchObject({
        chapterId: expect.stringMatching(/^ch-\d+$/),
        chapterTitle: expect.any(String),
        legacySource: expect.stringMatching(/^js\/textbook_ch/),
        sectionId: expect.stringMatching(/^ch-\d+-section-\d+$/),
        sectionHeading: expect.any(String),
        description: expect.any(String),
        hasSvg: true,
        checks: { expertReview: 'pending-independent-review' },
      });
      const reviewedWave = reviewedWaveByKey.get(placement.templateKey);
      if (reviewedWave) {
        expect(placement).toMatchObject({
          origin: 'shared-template',
          reviewStatus: 'source-reviewed-editorial-pass',
          reviewArtifact: reviewedWave.artifact,
          reviewWave: reviewedWave.wave,
          reviewDate: '2026-07-16',
          checks: {
            conceptAccuracy: 'assisted-editorial-pass-expert-pending',
            labelQuality: 'editorial-pass',
            sourceSupport: 'topically-aligned-reputable-source',
          },
        });
        expect(placement.references).toEqual(placement.sourceDetails.map((source) => source.url));
        expect(placement.sourceDetails.length).toBeGreaterThan(0);
        expect(placement.sourceDetails.every((source) => source.title && source.organization && source.url && source.whyReputable)).toBe(true);
      } else if (wave03PlacementIds.has(placement.id)) {
        expect(placement).toMatchObject({
          origin: 'inline',
          templateKey: null,
          reviewStatus: 'source-reviewed-editorial-pass',
          reviewArtifact: 'eppp_diagram_review_wave_03.json',
          reviewWave: 'eppp-diagram-review-wave-03',
          reviewDate: '2026-07-17',
          checks: {
            conceptAccuracy: 'assisted-editorial-pass-expert-pending',
            labelQuality: 'editorial-pass-minimum-12',
            sourceSupport: 'topically-aligned-reputable-source',
            expertReview: 'pending-independent-review',
          },
        });
        expect(placement.references).toEqual(placement.sourceDetails.map((source) => source.url));
        expect(placement.sourceDetails.length).toBeGreaterThan(0);
        expect(placement.sourceDetails.every((source) => source.title && source.organization && source.url && source.whyReputable)).toBe(true);
      } else {
        expect(placement).toMatchObject({
          origin: 'inline',
          reviewStatus: 'review-required',
          reviewArtifact: '',
          checks: { conceptAccuracy: 'pending', labelQuality: 'pending', sourceSupport: 'pending' },
        });
      }
      const section = sections.find((candidate) => candidate.runtimeSectionId === placement.sectionId);
      expect(placement.sectionId).toBe(`${placement.chapterId}-section-${placement.sectionIndex - 1}`);
      expect(section).toMatchObject({
        id: `${placement.chapterId}-section-${placement.sectionIndex}`,
        runtimeSectionId: placement.sectionId,
        chapterId: placement.chapterId,
        diagramPlacementId: placement.id,
        diagramId: placement.diagramId,
        diagramOrigin: placement.origin,
        diagramTemplateKey: placement.templateKey,
      });
    }
  });

  it('links shared placements to used templates and gives inline diagrams location-stable asset IDs', () => {
    const templateByKey = new Map(catalog.diagrams.map((template) => [template.key, template]));
    const shared = catalog.diagramPlacements.filter((placement) => placement.origin === 'shared-template');
    const inline = catalog.diagramPlacements.filter((placement) => placement.origin === 'inline');

    expect(shared).toHaveLength(16);
    expect(inline).toHaveLength(42);
    for (const placement of shared) {
      const template = templateByKey.get(placement.templateKey);
      expect(template).toMatchObject({ id: placement.diagramId, usageStatus: 'used' });
      expect(template.placementIds).toContain(placement.id);
    }
    for (const placement of inline) {
      expect(placement.templateKey).toBeNull();
      expect(placement.diagramId).toMatch(/^diagram-inline-ch-\d+-section-\d{2}$/);
    }
    expect(catalog.diagrams.filter((template) => template.usageStatus === 'unused').every((template) => template.placementCount === 0 && template.placementIds.length === 0)).toBe(true);
    expect(catalog.diagrams.filter((template) => template.usageStatus === 'used').every((template) => template.placementCount === template.placementIds.length && template.placementCount > 0)).toBe(true);
  });

  it('carries only explicit template review-wave evidence into shared placements', () => {
    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eppp-diagram-catalog-'));
    temporaryRoots.push(fixtureRoot);
    fs.mkdirSync(path.join(fixtureRoot, 'test_prep'), { recursive: true });
    fs.writeFileSync(path.join(fixtureRoot, 'test_prep', 'eppp_diagram_review_wave_01.json'), JSON.stringify({
      schemaVersion: 1,
      reviewWave: 'diagram-wave-01',
      reviewDate: '2026-07-16',
      items: [{
        key: 'sharedExample',
        reviewStatus: 'source-reviewed-editorial-pass',
        reviewNote: 'Fixture review record.',
        references: ['https://example.org/primary'],
        sourceDetails: [{
          title: 'Primary fixture source',
          organization: 'Fixture Standards Organization',
          url: 'https://example.org/primary',
          whyReputable: 'A fixture standing in for a directly reviewed authoritative source.',
        }],
        checks: { conceptAccuracy: 'editorial-pass', sourceSupport: 'pass' },
      }],
    }), 'utf8');

    const sharedExample = { description: 'Shared example', svg: '<svg></svg>' };
    const inlineExample = { description: 'Inline example', svg: '<svg></svg>' };
    const result = buildDiagramCatalog({
      root: fixtureRoot,
      diagramTemplates: { sharedExample, unusedExample: { description: 'Unused', svg: '<svg></svg>' } },
      chapters: [{ id: 'ch-1', title: 'Fixture chapter', sections: [
        { heading: 'Shared section', interactiveDiagram: sharedExample },
        { heading: 'Inline section', interactiveDiagram: inlineExample },
      ] }],
      chapterSourceById: new Map([['ch-1', 'js/textbook_ch_fixture.js']]),
    });

    expect(result.templates.find((template) => template.key === 'sharedExample')).toMatchObject({
      reviewStatus: 'source-reviewed-editorial-pass',
      reviewArtifact: 'eppp_diagram_review_wave_01.json',
      reviewWave: 'diagram-wave-01',
      sourceDetails: [expect.objectContaining({ organization: 'Fixture Standards Organization' })],
      checks: { conceptAccuracy: 'editorial-pass', sourceSupport: 'pass' },
    });
    expect(result.placements.find((placement) => placement.origin === 'shared-template').reviewStatus).toBe('source-reviewed-editorial-pass');
    expect(result.placements.find((placement) => placement.origin === 'inline')).toMatchObject({ reviewStatus: 'review-required', reviewArtifact: '' });
    expect(result.templates.find((template) => template.key === 'unusedExample')).toMatchObject({ usageStatus: 'unused', reviewStatus: 'review-required' });
  });

  it('applies explicit placement evidence only to the identified inline diagram', () => {
    const fixtureRoot = makeReviewFixture([[{
      placementId: 'diagram-placement-ch-1-section-01',
      reviewStatus: 'source-reviewed-editorial-pass',
      reviewNote: 'Fixture inline-placement review record.',
      references: ['https://example.org/primary'],
      sourceDetails: completeFixtureSource,
      checks: { conceptAccuracy: 'editorial-pass', sourceSupport: 'pass' },
    }]]);
    const result = buildDiagramCatalog({
      root: fixtureRoot,
      diagramTemplates: {},
      chapters: [{ id: 'ch-1', sections: [
        { heading: 'Reviewed inline', interactiveDiagram: { description: 'Reviewed', svg: '<svg></svg>' } },
        { heading: 'Pending inline', interactiveDiagram: { description: 'Pending', svg: '<svg></svg>' } },
      ] }],
    });

    expect(result.placements[0]).toMatchObject({
      id: 'diagram-placement-ch-1-section-01',
      origin: 'inline',
      reviewStatus: 'source-reviewed-editorial-pass',
      reviewArtifact: 'eppp_diagram_review_wave_01.json',
      sourceDetails: [expect.objectContaining({ organization: 'Fixture Standards Organization' })],
      checks: { conceptAccuracy: 'editorial-pass', sourceSupport: 'pass' },
    });
    expect(result.placements[1]).toMatchObject({ reviewStatus: 'review-required', reviewArtifact: '' });
  });

  it('rejects unknown placement review identities', () => {
    const fixtureRoot = makeReviewFixture([[{ placementId: 'diagram-placement-ch-1-section-99' }]]);
    expect(() => buildDiagramCatalog({
      root: fixtureRoot,
      diagramTemplates: {},
      chapters: [{ id: 'ch-1', sections: [{ interactiveDiagram: { description: 'Inline', svg: '<svg></svg>' } }] }],
    })).toThrow(/unknown placement diagram-placement-ch-1-section-99/);
  });

  it('rejects duplicate template and placement identities across review waves', () => {
    const templateRoot = makeReviewFixture([[{ key: 'sharedExample' }], [{ key: 'sharedExample' }]]);
    expect(() => buildDiagramCatalog({ root: templateRoot, diagramTemplates: {}, chapters: [] }))
      .toThrow(/template sharedExample appears in more than one review wave/);

    const placementRoot = makeReviewFixture([
      [{ placementId: 'diagram-placement-ch-1-section-01' }],
      [{ placementId: 'diagram-placement-ch-1-section-01' }],
    ]);
    expect(() => buildDiagramCatalog({ root: placementRoot, diagramTemplates: {}, chapters: [] }))
      .toThrow(/placement diagram-placement-ch-1-section-01 appears in more than one review wave/);
  });

  it.each([
    ['both identities', { key: 'sharedExample', placementId: 'diagram-placement-ch-1-section-01' }],
    ['neither identity', {}],
  ])('rejects review records with %s', (_label, item) => {
    const fixtureRoot = makeReviewFixture([[item]]);
    expect(() => buildDiagramCatalog({ root: fixtureRoot, diagramTemplates: {}, chapters: [] }))
      .toThrow(/must identify exactly one of key or placementId/);
  });

  it('rejects unsupported statuses and incomplete source-reviewed evidence', () => {
    const unsupportedRoot = makeReviewFixture([[{ key: 'sharedExample', reviewStatus: 'approved' }]]);
    expect(() => buildDiagramCatalog({ root: unsupportedRoot, diagramTemplates: {}, chapters: [] }))
      .toThrow(/unsupported review status approved/);

    const incompleteRoot = makeReviewFixture([[{
      placementId: 'diagram-placement-ch-1-section-01',
      reviewStatus: 'source-reviewed-editorial-pass',
      sourceDetails: [{ title: 'Incomplete source' }],
    }]]);
    expect(() => buildDiagramCatalog({ root: incompleteRoot, diagramTemplates: {}, chapters: [] }))
      .toThrow(/requires complete sourceDetails/);
  });

  it('keeps the richer inventory and both deployment mirrors synchronized', () => {
    expect(inventory.schemaVersion).toBe(2);
    expect(inventory.summary).toMatchObject({
      textbookChapters: catalog.summary.chapters,
      textbookSections: catalog.summary.sections,
      knowledgeChecks: catalog.summary.knowledgeChecks,
      flashcards: catalog.summary.flashcards,
      memoryAids: catalog.summary.memoryAids,
      diagramTemplates: catalog.summary.diagramTemplates,
      usedDiagramTemplates: catalog.summary.usedDiagramTemplates,
      unusedDiagramTemplates: catalog.summary.unusedDiagramTemplates,
      diagramPlacements: catalog.summary.diagramPlacements,
      sharedTemplateDiagramPlacements: catalog.summary.sharedTemplateDiagramPlacements,
      inlineDiagramPlacements: catalog.summary.inlineDiagramPlacements,
      sourceReviewedDiagramTemplates: catalog.summary.sourceReviewedDiagramTemplates,
      sourceReviewedDiagramPlacements: catalog.summary.sourceReviewedDiagramPlacements,
    });
    expect(inventory.diagramInventory.summary).toEqual(expect.objectContaining({
      diagramTemplates: 25,
      usedDiagramTemplates: 15,
      unusedDiagramTemplates: 10,
      diagramPlacements: 58,
      sharedTemplateDiagramPlacements: 16,
      inlineDiagramPlacements: 42,
    }));
    expect(inventory.diagramInventory.templates).toEqual(catalog.diagrams);
    expect(inventory.diagramInventory.placements).toEqual(catalog.diagramPlacements);
    expect(read('desktop/web-app/public/test_prep/eppp_learning_library.json')).toEqual(catalog);
    expect(read('desktop/web-app/public/test_prep/eppp_legacy/content_inventory.json')).toEqual(inventory);
  });
});
