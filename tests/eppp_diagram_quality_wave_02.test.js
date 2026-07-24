import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (relativePath) => fs.readFileSync(resolve(root, relativePath), 'utf8');
const json = (relativePath) => JSON.parse(read(relativePath));
const expectedKeys = [
  'neuronActionPotential',
  'brainRegions',
  'eriksonStages',
  'operantConditioning',
  'reliabilityValidity',
  'typesOfValidity',
  'cbtTriangle',
  'dbtModules',
];

function loadDiagrams() {
  const windowObject = {};
  const context = vm.createContext({
    window: windowObject,
    document: { readyState: 'complete', addEventListener() {} },
    console: { log() {}, warn() {}, error() {} },
    setTimeout(callback) { if (typeof callback === 'function') callback(); return 1; },
    clearTimeout() {},
  });
  windowObject.window = windowObject;
  vm.runInContext(read('test_prep/eppp_legacy/js/textbook_diagrams.js'), context, { timeout: 15000 });
  return windowObject._epppDiagrams;
}

describe('EPPP diagram quality review wave 02', () => {
  it('records eight corrected, fully named source-review records and one audited placement apiece', () => {
    const wave = json('test_prep/eppp_diagram_review_wave_02.json');
    expect(wave).toMatchObject({
      schemaVersion: 1,
      reviewWave: 'eppp-diagram-review-wave-02',
      reviewDate: '2026-07-16',
      status: 'assisted-editorial-source-review-complete-expert-pending',
      summary: {
        reviewedDiagramTemplates: 8,
        correctedDiagramTemplates: 8,
        sourceReviewedDiagramTemplates: 8,
        placementRecords: 8,
        independentExpertValidated: 0,
        status: 'pass',
      },
    });
    expect(wave.items.map((item) => item.key)).toEqual(expectedKeys);
    for (const item of wave.items) {
      expect(item).toMatchObject({
        reviewStatus: 'source-reviewed-editorial-pass',
        reviewWave: wave.reviewWave,
        reviewDate: wave.reviewDate,
        placementCount: 1,
        independentExpertStatus: 'not-started',
        productionStatus: 'not-production-validated',
        checks: {
          textAlternative: 'editorial-pass',
          conceptAccuracy: 'assisted-editorial-pass-expert-pending',
          labelQuality: 'editorial-pass',
          sourceSupport: 'topically-aligned-reputable-source',
          expertReview: 'pending-independent-review',
        },
      });
      expect(item.placements).toHaveLength(1);
      expect(item.references).toEqual(item.sourceDetails.map((source) => source.url));
      expect(item.sourceDetails.length).toBeGreaterThan(0);
      for (const source of item.sourceDetails) {
        expect(source.title.length).toBeGreaterThanOrEqual(10);
        expect(source.organization.length).toBeGreaterThanOrEqual(20);
        expect(source.url).toMatch(/^https:\/\//);
        expect(source.whyReputable.length).toBeGreaterThanOrEqual(120);
      }
      expect(item.reviewNote).toMatch(/Independent qualified expert validation remains pending\.$/);
    }
  });

  it('publishes the audited content and removes misleading motion, wording, and false affordances', () => {
    const source = read('test_prep/eppp_legacy/js/textbook_diagrams.js');
    const diagrams = loadDiagrams();

    for (const correctedText of [
      'Example Myelinated Multipolar Neuron — Schematic',
      'Schematic node-to-node sequence',
      'Cerebral Lobes &amp; Selected Landmarks — Left Lateral Schematic',
      "Erikson's Eight-Stage Psychosocial Theory",
      'Proposed sequence; conflicts may be revisited across life',
      'Four Operant-Consequence Contingencies',
      'A consequence is classified by its observed effect on future behavior',
      'Target Analogy: Precision, Bias, and Validity',
      'Unified Validity: Sources of Evidence',
      'Simplified CBT Formulation',
      'DBT Skills-Training Modules',
      'Teaching selected skills alone should not be labeled comprehensive DBT',
    ]) expect(source).toContain(correctedText);

    for (const supersededText of [
      'terminal buttons',
      'The green pulse shows the action potential traveling',
      'Broca\'s and Wernicke\'s areas are highlighted with pulsing circles',
      'The green dot traces the lifespan journey',
      'flashing green box highlights Negative Reinforcement',
      'Consistent AND hits the mark!',
      'Construct Validity and its Subtypes',
      'Intervening at any corner of the triangle impacts the others',
      'relies heavily on four core skills modules',
    ]) expect(source).not.toContain(supersededText);

    expect(diagrams.eriksonStages.svg.match(/Ego strength:/g)).toHaveLength(8);
    expect(diagrams.eriksonStages.svg.match(/font-size:9px;fill:#94a3b8">Ego strength:/g)).toHaveLength(8);
    expect(diagrams.eriksonStages.svg).not.toMatch(/<animate\b/);
    expect(diagrams.brainRegions.svg).toContain('Cerebral Lobes &amp; Selected Landmarks');
    expect(diagrams.dbtModules.svg).toContain('Identify &amp; Label Emotions');
    const bareAmpersandPattern = /&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-f]+;)/i;
    expect(expectedKeys.every((key) => !bareAmpersandPattern.test(diagrams[key].svg)), 'audited SVG text uses XML-safe ampersands').toBe(true);
    expect(diagrams.operantConditioning.svg).not.toContain('diagram-fade-pulse');
    expect(diagrams.cbtTriangle.svg).not.toMatch(/\.cbt-node:hover|cursor:\s*pointer|transition:\s*all/);
    expect(diagrams.dbtModules.svg).not.toMatch(/\.dbt-quad:hover|cursor:\s*pointer|transition:\s*all/);
    expect(expectedKeys.every((key) => !/Content QA|migration provenance|legacy EPPP/i.test(diagrams[key].description))).toBe(true);
  });

  it('uses collision-safe SVG fragments and preserves footer space', () => {
    const diagrams = loadDiagrams();
    expect(diagrams.reliabilityValidity.svg).toContain('viewBox="0 0 650 270"');
    expect(diagrams.reliabilityValidity.svg).toContain('id="rvTarget"');
    expect(diagrams.reliabilityValidity.svg.match(/href="#rvTarget"/g)).toHaveLength(3);
    expect(diagrams.reliabilityValidity.svg).toContain('id="rvHit"');
    expect(diagrams.reliabilityValidity.svg.match(/href="#rvHit"/g)).toHaveLength(15);
    expect(diagrams.reliabilityValidity.svg).not.toMatch(/id="target"|href="#target"|bullseye-hit|drugArrow/);
    expect(diagrams.cbtTriangle.svg).toContain('id="cbtArrowHead"');
    expect(diagrams.cbtTriangle.svg).toContain('url(#cbtArrowHead)');
    expect(diagrams.cbtTriangle.svg).not.toMatch(/id="arrowHead"|url\(#arrowHead\)/);
  });

  it('routes each shared diagram only to its audited section and preserves runtime section IDs', () => {
    const catalog = json('test_prep/eppp_learning_library.json');
    expect(catalog.summary).toMatchObject({
      diagramTemplates: 25,
      usedDiagramTemplates: 15,
      unusedDiagramTemplates: 10,
      diagramPlacements: 58,
      sharedTemplateDiagramPlacements: 16,
      inlineDiagramPlacements: 42,
      sourceReviewedDiagramTemplates: 15,
      sourceReviewedDiagramPlacements: 22,
    });
    const expectedHeadings = {
      neuronActionPotential: 'The Neuron & Neural Communication',
      brainRegions: 'Cerebral Cortex: The Four Lobes',
      eriksonStages: 'Erikson & Marcia: Identity as Developmental Work',
      operantConditioning: 'Behavioral Techniques: Operant Approaches',
      reliabilityValidity: 'Reliability: Is the Test Consistent?',
      typesOfValidity: 'Validity: Does the Test Measure What It Claims?',
      cbtTriangle: 'Why This Chapter Matters',
      dbtModules: 'Dialectical Behavior Therapy (Linehan)',
    };
    for (const key of expectedKeys) {
      const placements = catalog.diagramPlacements.filter((placement) => placement.templateKey === key);
      expect(placements, key).toHaveLength(1);
      expect(placements[0]).toMatchObject({
        sectionHeading: expectedHeadings[key],
        reviewStatus: 'source-reviewed-editorial-pass',
        reviewArtifact: 'eppp_diagram_review_wave_02.json',
      });
      const chapter = catalog.chapters.find((entry) => entry.id === placements[0].chapterId);
      const section = chapter.sections.find((entry) => entry.diagramPlacementId === placements[0].id);
      expect(section).toMatchObject({
        id: `${placements[0].chapterId}-section-${placements[0].sectionIndex}`,
        runtimeSectionId: placements[0].sectionId,
      });
    }
    expect(catalog.diagramPlacements.filter((placement) => placement.reviewStatus === 'review-required')).toHaveLength(36);
    expect(catalog.diagramPlacements.filter((placement) => placement.reviewStatus === 'review-required').every((placement) => placement.origin === 'inline')).toBe(true);
  });

  it('publishes exact mirrors and runs wave 02 between wave 01 and library generation', () => {
    for (const relativePath of [
      'test_prep/eppp_legacy/js/textbook_diagrams.js',
      'test_prep/eppp_diagram_review_wave_02.json',
      'test_prep/eppp_diagram_review_wave_02.md',
    ]) expect(read(`desktop/web-app/public/${relativePath}`)).toBe(read(relativePath));

    const builder = read('_build_test_prep_hub_module.js');
    const wave01Call = 'node "${DIAGRAM_QUALITY_WAVE_01_SCRIPT}"';
    const wave02Call = 'node "${DIAGRAM_QUALITY_WAVE_02_SCRIPT}"';
    const libraryCall = 'node "${LEARNING_LIBRARY_SCRIPT}"';
    expect(builder).toContain("const DIAGRAM_QUALITY_WAVE_02_SCRIPT = path.join(ROOT, 'dev-tools', 'repair_eppp_diagram_quality_wave_02.cjs');");
    expect(builder.indexOf(wave01Call)).toBeLessThan(builder.indexOf(wave02Call));
    expect(builder.indexOf(wave02Call)).toBeLessThan(builder.indexOf(libraryCall));
    expect(read('test_prep/eppp_diagram_review_wave_02.md')).not.toMatch(/Content QA passed/i);
    const learningQa = json('test_prep/eppp_learning_library_qa.json');
    expect(learningQa.findings).toContain('Shared renderer accessibility controls are implemented. 22 of 58 learner-visible placements have source-review records; 36 placements still need concept and label review.');
    expect(learningQa.findings.join(' ')).not.toMatch(/(?:each|every) (?:diagram|placement) still needs concept and label review/i);
  });
});
