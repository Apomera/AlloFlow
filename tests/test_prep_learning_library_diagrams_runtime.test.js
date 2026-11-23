import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const root = process.cwd();
const source = fs.readFileSync(resolve(root, 'test_prep_hub_source.jsx'), 'utf8');
const modulesDir = resolve(root, 'desktop/web-app/node_modules');
const React = require(resolve(modulesDir, 'react'));
const ReactDOMServer = require(resolve(modulesDir, 'react-dom/server'));
const { transformSync } = require(resolve(modulesDir, '@babel/core'));
const transformReactJsx = require(resolve(modulesDir, '@babel/plugin-transform-react-jsx'));

function loadDiagramRuntimeApi() {
  const start = source.indexOf('function testPrepSafeHttpsUrl(');
  const end = source.indexOf('\nfunction TestPrepHub(props)', start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const expose = `
globalThis.__diagramRuntimeApi = {
  payloads: testPrepLearningLibraryDiagramPayloads,
  prepareConcept: testPrepPrepareConceptDiagram,
  records: testPrepNativeChapterDiagramRecords,
  Diagram: TestPrepNativeDiagramPlacement,
  glossaryView: testPrepBuildNativeGlossaryView,
  Glossary: TestPrepNativeGlossaryLibrary,
  blocksAreSafe: testPrepNativeBlocksAreSafe,
  renderBlocks: testPrepRenderNativeBlocks,
  chapterSearchText: testPrepNativeChapterSearchText,
  chapterSpeechText: testPrepNativeChapterSpeechText
};`;
  const compiled = transformSync(source.slice(start, end) + expose, {
    babelrc: false,
    configFile: false,
    plugins: [[transformReactJsx, {
      runtime: 'classic',
      pragma: 'React.createElement',
      pragmaFrag: 'React.Fragment',
    }]],
  }).code;
  const sandbox = {
    React,
    URL,
    localStorage: { getItem: () => null },
    testPrepSlug(value, fallback = 'item') {
      const normalized = String(value == null ? '' : value).trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return normalized || fallback;
    },
    window: { matchMedia: () => ({ matches: true }) },
    globalThis: null,
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(compiled, sandbox, { filename: 'test-prep-diagrams-runtime.jsx' });
  return sandbox.__diagramRuntimeApi;
}

const api = loadDiagramRuntimeApi();

const EXPECTED_CONCEPT_DIAGRAM_COUNTS = {
  ap_biology_foundation_pilot: 8,
  ap_calculus_ab_foundation_pilot: 8,
  ap_chemistry_foundation_pilot: 9,
  ap_physics_1_foundation_pilot: 8,
  ap_psychology_pilot: 5,
  ap_statistics_foundation_pilot: 5,
  ap_us_government_foundation_pilot: 5,
  ap_us_history_foundation_pilot: 9,
  audiology_5343: 12,
  speech_language_pathology_5331: 12,
  school_psychologist_5403: 12,
  school_counselor_5422: 12,
  teaching_reading_5205: 12,
  reading_specialist_5302: 12,
  esol_5362: 12,
  early_childhood_5025: 12,
  special_education_5355: 12,
  special_education_behavior_emotional_5372: 12,
  special_education_early_childhood_5692: 12,
  special_education_intellectual_disabilities_5322: 12,
  special_education_learning_disabilities_5383: 12,
  special_education_severe_profound_5547: 12,
  praxis_core_5752: 12,
  parapro: 12,
  plt_early_childhood_5621: 12,
  plt_k6_5622: 12,
  plt_5_9_5623: 12,
  plt_7_12_5624: 12,
  educational_leadership_5412: 12,
  school_librarian_5312: 12,
};

describe('Test Prep Hub live alloflow-diagram-v1 textbook diagram runtime coverage', () => {
  it('prepares, places, and renders all 321 alloflow-diagram-v1 diagrams across all 30 non-EPPP libraries (8 AP + 22 Praxis/ParaPro at 12/12 chapters) plus EPPP native vectors = 388 diagrams across 31/31 libraries', () => {
    const allLibStems = fs.readdirSync(resolve(root, 'test_prep'))
      .filter((f) => f.endsWith('_learning_library.json'))
      .map((f) => f.replace('_learning_library.json', ''))
      .sort();
    expect(allLibStems).toHaveLength(31);
    const nonEpppStems = allLibStems.filter((s) => s !== 'eppp');
    expect(Object.keys(EXPECTED_CONCEPT_DIAGRAM_COUNTS).sort()).toEqual(nonEpppStems);
    let totalRendered = 0;
    for (const [stem, expectedCount] of Object.entries(EXPECTED_CONCEPT_DIAGRAM_COUNTS)) {
      const lib = JSON.parse(
        fs.readFileSync(resolve(root, `test_prep/${stem}_learning_library.json`), 'utf8')
      );
      const payloads = api.payloads(lib);
      expect(payloads, `${stem} live diagram payloads`).toHaveLength(expectedCount);
      expect(lib.diagramPlacements, `${stem} diagramPlacements`).toHaveLength(expectedCount);
      expect(lib.summary?.diagrams, `${stem} summary.diagrams`).toBe(expectedCount);

      // Every diagram must be unique in title and nodes and prepare cleanly for static concept rendering
      const titles = new Set();
      for (const diagram of lib.diagrams) {
        expect(titles.has(diagram.title), `${stem}/${diagram.id} duplicate title`).toBe(false);
        titles.add(diagram.title);
        const prepared = api.prepareConcept(diagram);
        expect(prepared.ok, `${stem}/${diagram.id}: ${prepared.reason}`).toBe(true);
        expect(prepared.nodes.length, `${stem}/${diagram.id} nodes`).toBeGreaterThanOrEqual(4);
        expect(prepared.edges.length, `${stem}/${diagram.id} edges`).toBeGreaterThanOrEqual(3);
        expect(prepared.orderedText.length, `${stem}/${diagram.id} orderedText`).toBeGreaterThanOrEqual(100);
      }

      // Every placement must resolve to an actual chapter + section and render concept-rendered markup
      for (const placement of lib.diagramPlacements) {
        const chapter = lib.chapters.find((c) => c.id === placement.chapterId);
        expect(chapter, `${stem}/${placement.id} chapter ${placement.chapterId}`).toBeTruthy();
        const section = (chapter.sections || []).find((s) => s.id === placement.sectionId);
        expect(section, `${stem}/${placement.id} section ${placement.sectionId}`).toBeTruthy();
        const records = api.records(lib, chapter, section);
        const matched = records.find((r) => r.payload && r.payload.id === placement.diagramId);
        expect(matched, `${stem}/${placement.id} runtime record`).toBeTruthy();

        const html = ReactDOMServer.renderToStaticMarkup(React.createElement(api.Diagram, {
          placement: matched.placement,
          payload: matched.payload,
          index: 0,
          onReadAloud: () => {},
          readAloudActive: false,
        }));
        expect(html, `${stem}/${placement.id} rendered status`).toContain('data-native-diagram-status="concept-rendered"');
        expect(html, `${stem}/${placement.id} rendered format`).toContain('data-learning-diagram-format="alloflow-diagram-v1"');
        expect(html, `${stem}/${placement.id} read-aloud button`).toContain('Read diagram aloud');
        totalRendered += 1;
      }
      if (!stem.startsWith('ap_')) {
        const coveredChapters = new Set((lib.diagramPlacements || []).map((p) => p.chapterId));
        expect(coveredChapters.size, `${stem} 100% chapter diagram coverage`).toBe((lib.chapters || []).length);
      }
    }
    expect(totalRendered).toBe(321);
    const epppLib = JSON.parse(fs.readFileSync(resolve(root, 'test_prep/eppp_learning_library.json'), 'utf8'));
    expect(epppLib.nativeDiagrams.length).toBeGreaterThanOrEqual(67);
  });

  it('renders searchable, chapter-linked, dynamically titled study glossaries across 100% of learning libraries (31/31: 729 curated AP/Praxis + 1,583 EPPP = 2,312 terms)', () => {
    const expectedGlossaries = {
      ap_biology_foundation_pilot: 24,
      ap_calculus_ab_foundation_pilot: 24,
      ap_chemistry_foundation_pilot: 27,
      ap_physics_1_foundation_pilot: 24,
      ap_psychology_pilot: 25,
      ap_statistics_foundation_pilot: 25,
      ap_us_government_foundation_pilot: 25,
      ap_us_history_foundation_pilot: 27,
      audiology_5343: 24,
      speech_language_pathology_5331: 24,
      school_psychologist_5403: 24,
      school_counselor_5422: 24,
      teaching_reading_5205: 24,
      reading_specialist_5302: 24,
      esol_5362: 24,
      early_childhood_5025: 24,
      special_education_5355: 24,
      special_education_behavior_emotional_5372: 24,
      special_education_early_childhood_5692: 24,
      special_education_intellectual_disabilities_5322: 24,
      special_education_learning_disabilities_5383: 24,
      special_education_severe_profound_5547: 24,
      praxis_core_5752: 24,
      parapro: 24,
      plt_early_childhood_5621: 24,
      plt_k6_5622: 24,
      plt_5_9_5623: 24,
      plt_7_12_5624: 24,
      educational_leadership_5412: 24,
      school_librarian_5312: 24,
    };
    const allLibFiles = fs.readdirSync(resolve(root, 'test_prep')).filter((f) => f.endsWith('_learning_library.json'));
    expect(allLibFiles.length).toBe(31);
    let totalTerms = 0;
    for (const [stem, count] of Object.entries(expectedGlossaries)) {
      const lib = JSON.parse(fs.readFileSync(resolve(root, `test_prep/${stem}_learning_library.json`), 'utf8'));
      expect(lib.glossary, `${stem} glossary`).toHaveLength(count);
      expect(lib.summary?.glossaryTerms, `${stem} summary.glossaryTerms`).toBe(count);
      const view = api.glossaryView(lib.glossary, lib.chapters, {});
      expect(view.total, `${stem} glossaryView.total`).toBe(count);
      if (stem !== 'ap_us_history_foundation_pilot') {
        expect(view.chapterOptions.length, `${stem} chapterOptions`).toBeGreaterThanOrEqual(5);
        expect(view.domainOptions.length, `${stem} domainOptions`).toBeGreaterThanOrEqual(3);
      }
      const html = ReactDOMServer.renderToStaticMarkup(React.createElement(api.Glossary, {
        glossary: lib.glossary,
        chapters: lib.chapters,
        libraryTitle: lib.shortTitle || lib.title || stem,
        query: '',
        chapterId: 'all',
        domainId: 'all',
        visibleCount: 100,
        onQueryChange: () => {},
        onChapterChange: () => {},
        onDomainChange: () => {},
        onShowMore: () => {},
        onReadAloud: () => {},
        readAloudActive: false,
      }));
      expect(html, `${stem} dynamic non-EPPP title`).not.toContain('EPPP study glossary');
      expect(html, `${stem} read-aloud`).toContain('Read term aloud');
      totalTerms += count;
    }
    expect(totalTerms).toBe(729);
    const epppLib = JSON.parse(fs.readFileSync(resolve(root, 'test_prep/eppp_learning_library.json'), 'utf8'));
    expect(epppLib.glossary.length).toBeGreaterThanOrEqual(1583);
  });

  it('renders worked examples and misconception guidance across all 8 AP libraries (171/171 sections) and AP Calculus AB blocks in search, speech, and React markup', () => {
    const apExpectedSections = {
      ap_biology_foundation_pilot: 24,
      ap_calculus_ab_foundation_pilot: 24,
      ap_chemistry_foundation_pilot: 27,
      ap_physics_1_foundation_pilot: 24,
      ap_psychology_pilot: 15,
      ap_statistics_foundation_pilot: 15,
      ap_us_government_foundation_pilot: 15,
      ap_us_history_foundation_pilot: 27,
    };
    let totalSections = 0;
    for (const [stem, expectedSecCount] of Object.entries(apExpectedSections)) {
      const lib = JSON.parse(fs.readFileSync(resolve(root, `test_prep/${stem}_learning_library.json`), 'utf8'));
      const prompts = new Set();
      let libSections = 0;
      for (const chapter of lib.chapters || []) {
        const searchText = api.chapterSearchText(chapter);
        const speechText = api.chapterSpeechText(lib, chapter);
        expect(speechText, `${stem}/${chapter.id} workedExample speech`).toContain('Worked example.');
        expect(speechText, `${stem}/${chapter.id} misconceptions speech`).toContain('Common misconceptions and repairs.');
        if (stem === 'ap_calculus_ab_foundation_pilot') {
          expect(searchText, `${chapter.id} introduction in searchText`).toContain(chapter.introduction);
        }
        for (const section of chapter.sections || []) {
          expect(section.workedExample?.prompt, `${stem}/${section.id} workedExample.prompt`).toBeTruthy();
          expect(Array.isArray(section.workedExample?.steps) && section.workedExample.steps.length >= 2, `${stem}/${section.id} workedExample.steps`).toBe(true);
          const minMisconceptions = stem === 'ap_calculus_ab_foundation_pilot' ? 1 : 2;
          expect(Array.isArray(section.misconceptionGuidance) && section.misconceptionGuidance.length >= minMisconceptions, `${stem}/${section.id} misconceptionGuidance`).toBe(true);
          prompts.add(section.workedExample.prompt.toLowerCase());
          expect(searchText, `${stem}/${section.id} workedExample in searchText`).toContain(section.workedExample.prompt);
          if (stem === 'ap_calculus_ab_foundation_pilot') {
            expect(api.blocksAreSafe(section.blocks), `${section.id} safe blocks`).toBe(true);
            const html = ReactDOMServer.renderToStaticMarkup(
              React.createElement('div', null, api.renderBlocks(section.blocks, section.id, section.title))
            );
            expect(html, `${section.id} rendered prose`).toContain(section.blocks[0].text.slice(0, 30));
            expect(searchText, `${section.id} title in searchText`).toContain(section.title);
          }
          libSections += 1;
          totalSections += 1;
        }
      }
      expect(libSections, `${stem} section count`).toBe(expectedSecCount);
      expect(prompts.size, `${stem} unique workedExample prompts`).toBe(expectedSecCount);
    }
    expect(totalSections).toBe(171);
  });

  it('indexes and speaks 264 applied case vignettes across 100% of chapters in all 22 Praxis/ParaPro libraries plus EPPP vignettes', () => {
    const praxisStems = Object.keys(EXPECTED_CONCEPT_DIAGRAM_COUNTS).filter((s) => !s.startsWith('ap_'));
    expect(praxisStems).toHaveLength(22);
    let totalCases = 0;
    for (const stem of praxisStems) {
      const lib = JSON.parse(fs.readFileSync(resolve(root, `test_prep/${stem}_learning_library.json`), 'utf8'));
      const titles = new Set();
      let libCases = 0;
      for (const chapter of lib.chapters || []) {
        const chapterCases = (chapter.sections || []).filter((s) => s.expandableCase && s.expandableCase.title);
        expect(chapterCases.length, `${stem}/${chapter.id} case count`).toBeGreaterThanOrEqual(1);
        const searchText = api.chapterSearchText(chapter);
        const speechText = api.chapterSpeechText(lib, chapter);
        for (const sec of chapterCases) {
          const c = sec.expandableCase;
          expect(c.clinicalDescription && c.diagnosis && c.explanation, `${stem}/${sec.id} case fields`).toBeTruthy();
          expect(c.label && c.presentationLabel && c.answerLabel && c.explanationLabel, `${stem}/${sec.id} role-authentic labels`).toBeTruthy();
          expect(searchText, `${stem}/${sec.id} case title in searchText`).toContain(c.title);
          expect(speechText, `${stem}/${sec.id} case label in speechText`).toContain(c.label);
          expect(speechText, `${stem}/${sec.id} case title in speechText`).toContain(c.title);
          titles.add(c.title.toLowerCase());
          libCases += 1;
          totalCases += 1;
        }
      }
      expect(libCases, `${stem} total applied cases`).toBe(12);
      expect(titles.size, `${stem} unique case titles`).toBe(12);
    }
    expect(totalCases).toBe(264);
    const epppLib = JSON.parse(fs.readFileSync(resolve(root, 'test_prep/eppp_learning_library.json'), 'utf8'));
    const epppCases = (epppLib.chapters || []).flatMap((c) => c.sections || []).filter((s) => s.expandableCase).length;
    expect(epppCases).toBeGreaterThan(0);
  });

  it('indexes and speaks high-yield chapterTakeaways across 100% of chapters in all 30 non-EPPP libraries (321/321 chapters)', () => {
    const stems = Object.keys(EXPECTED_CONCEPT_DIAGRAM_COUNTS);
    expect(stems).toHaveLength(30);
    let totalChapters = 0;
    let totalTakeaways = 0;
    for (const stem of stems) {
      const lib = JSON.parse(fs.readFileSync(resolve(root, `test_prep/${stem}_learning_library.json`), 'utf8'));
      for (const chapter of lib.chapters || []) {
        const takeaways = chapter.chapterTakeaways || [];
        expect(takeaways.length, `${stem}/${chapter.id} chapterTakeaways`).toBeGreaterThanOrEqual(3);
        const searchText = api.chapterSearchText(chapter);
        const speechText = api.chapterSpeechText(lib, chapter);
        expect(speechText, `${stem}/${chapter.id} takeaways heading in speechText`).toContain('Chapter takeaways.');
        expect(searchText, `${stem}/${chapter.id} first takeaway in searchText`).toContain(takeaways[0]);
        expect(speechText, `${stem}/${chapter.id} first takeaway in speechText`).toContain(takeaways[0]);
        totalChapters += 1;
        totalTakeaways += takeaways.length;
      }
    }
    expect(totalChapters).toBe(321);
    expect(totalTakeaways).toBeGreaterThanOrEqual(963);
  });

  it('normalizes 199 interactive workshops across 100% of non-EPPP libraries (30/30: 8 AP + 22 Praxis/ParaPro)', () => {
    const stems = Object.keys(EXPECTED_CONCEPT_DIAGRAM_COUNTS);
    expect(stems).toHaveLength(30);
    let totalWorkshops = 0;
    for (const stem of stems) {
      const lib = JSON.parse(fs.readFileSync(resolve(root, `test_prep/${stem}_learning_library.json`), 'utf8'));
      const raw = lib.constructedResponseWorkshops || [];
      const minWorkshops = stem.startsWith('ap_') ? 2 : 6;
      expect(raw.length, `${stem} workshops count`).toBeGreaterThanOrEqual(minWorkshops);
      const ids = new Set();
      const titles = new Set();
      for (const w of raw) {
        expect(w.id && w.title, `${stem} workshop id/title`).toBeTruthy();
        ids.add(w.id);
        titles.add(String(w.title).toLowerCase());
        totalWorkshops += 1;
      }
      expect(ids.size, `${stem} unique workshop ids`).toBe(raw.length);
      expect(titles.size, `${stem} unique workshop titles`).toBe(raw.length);
    }
    expect(totalWorkshops).toBe(199);
  });

  it('provides 158 high-yield Quick Reference cards across 100% of non-EPPP libraries (30/30: 8 AP + 22 Praxis/ParaPro)', () => {
    const stems = Object.keys(EXPECTED_CONCEPT_DIAGRAM_COUNTS);
    expect(stems).toHaveLength(30);
    let totalCards = 0;
    for (const stem of stems) {
      const lib = JSON.parse(fs.readFileSync(resolve(root, `test_prep/${stem}_learning_library.json`), 'utf8'));
      const cards = lib.quickReference || [];
      expect(cards.length, `${stem} quickReference count`).toBeGreaterThanOrEqual(3);
      const ids = new Set();
      const titles = new Set();
      for (const card of cards) {
        expect(card.id && card.title && card.purpose, `${stem} quickRef metadata`).toBeTruthy();
        expect(Array.isArray(card.checklist) && card.checklist.length >= 2, `${stem}/${card.id} checklist`).toBe(true);
        expect(Array.isArray(card.formulas) && card.formulas.length >= 2, `${stem}/${card.id} formulas`).toBe(true);
        expect(Array.isArray(card.decisionRules) && card.decisionRules.length >= 2, `${stem}/${card.id} decisionRules`).toBe(true);
        expect(Array.isArray(card.cautions) && card.cautions.length >= 2, `${stem}/${card.id} cautions`).toBe(true);
        expect(card.officialExamReference, `${stem}/${card.id} honest non-official flag`).toBe(false);
        ids.add(card.id);
        titles.add(String(card.title).toLowerCase());
        totalCards += 1;
      }
      expect(ids.size, `${stem} unique quickRef ids`).toBe(cards.length);
      expect(titles.size, `${stem} unique quickRef titles`).toBe(cards.length);
    }
    expect(totalCards).toBe(158);
  });

  it('provides 217 interactive Misconception Playbooks linked to real pack items across 100% of non-EPPP libraries (30/30: 8 AP + 22 Praxis/ParaPro)', () => {
    const stems = Object.keys(EXPECTED_CONCEPT_DIAGRAM_COUNTS);
    expect(stems).toHaveLength(30);
    let totalPlaybooks = 0;
    for (const stem of stems) {
      const lib = JSON.parse(fs.readFileSync(resolve(root, `test_prep/${stem}_learning_library.json`), 'utf8'));
      const rem = lib.misconceptionRemediationPlaybooks || [];
      const top = lib.topicRemediationPlaybooks || [];
      const total = rem.length + top.length;
      expect(total, `${stem} playbook count`).toBeGreaterThanOrEqual(6);
      if (rem.length > 0) {
        const famById = new Map((lib.misconceptionFamilies || []).map((f) => [f.id, f]));
        const ids = new Set();
        for (const pb of rem) {
          const fam = famById.get(pb.familyId);
          expect(fam, `${stem}/${pb.id} linked family`).toBeTruthy();
          expect(Array.isArray(fam.itemIds) && fam.itemIds.length >= 10, `${stem}/${pb.id} linked real itemIds`).toBe(true);
          expect(pb.title && pb.recognitionCue && pb.repairQuestion, `${stem}/${pb.id} cue/repair`).toBeTruthy();
          expect(Array.isArray(pb.stages) && pb.stages.length >= 4, `${stem}/${pb.id} stages`).toBe(true);
          ids.add(pb.id);
        }
        expect(ids.size, `${stem} unique playbook ids`).toBe(rem.length);
      }
      totalPlaybooks += total;
    }
    expect(totalPlaybooks).toBe(217);
  });
});
