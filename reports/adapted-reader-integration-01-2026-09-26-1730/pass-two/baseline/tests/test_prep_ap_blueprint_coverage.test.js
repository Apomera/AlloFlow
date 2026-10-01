import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// The eight AP QA reports used to publish three different shapes, and the three
// that had a `coverage` key disagreed with each other (booleans vs raw count
// maps). `blueprintCoverage` is the one block every AP report now carries, so
// "zero findings" means the same thing in each of them.
const require = createRequire(import.meta.url);
const { buildApBlueprintCoverage } = require(resolve(process.cwd(), 'dev-tools/ap_blueprint_coverage_core.cjs'));

const packFiles = fs.readdirSync(resolve(process.cwd(), 'test_prep')).filter((name) => /^ap_.*_pilot\.json$/.test(name));
// The AP packs run to several megabytes each and live on a synced drive, so
// parse each file once and share it across assertions.
const jsonCache = new Map();
const readJson = (name) => {
  if (!jsonCache.has(name)) jsonCache.set(name, JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep', name), 'utf8')));
  return jsonCache.get(name);
};
const SLOW = 60_000;

function basePack() {
  return {
    id: 'probe', version: '1.0.0',
    domains: [{ id: 'u1' }, { id: 'u2' }],
    blueprint: { officialFrameworkTopicIds: ['1.1', '1.2', '1.3'] },
    items: [
      { domainId: 'u1', topicIds: ['1.1'], answerIndex: 0, choices: ['a', 'b', 'c', 'd'] },
      { domainId: 'u2', topicIds: ['1.2'], answerIndex: 1, choices: ['a', 'b', 'c', 'd'] },
    ],
  };
}

describe('AP blueprint coverage block', () => {
  it('finds every defect it is meant to find', () => {
    // Calibrated on known-bad input: a gate never seen failing is not a gate.
    const gaps = buildApBlueprintCoverage({ pack: basePack(), library: {} });
    expect(gaps.topics.missing).toEqual(['1.3']);
    expect(gaps.topics.coveragePercent).toBe(66.7);
    expect(gaps.gaps).toContain('declared-topics-without-items');
    expect(gaps.assessment).toBe('gaps-present');

    const emptyUnit = buildApBlueprintCoverage({ pack: { ...basePack(), domains: [{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }] }, library: {} });
    expect(emptyUnit.units.missing).toEqual(['u3']);
    expect(emptyUnit.gaps).toContain('units-without-items');

    const offBlueprint = buildApBlueprintCoverage({ pack: { ...basePack(), items: [{ domainId: 'u1', topicIds: ['9.9'], answerIndex: 0, choices: ['a', 'b'] }] }, library: {} });
    expect(offBlueprint.topics.offBlueprint).toEqual(['9.9']);
    expect(offBlueprint.gaps).toContain('items-on-undeclared-topics');

    const skewed = buildApBlueprintCoverage({ pack: { ...basePack(), items: basePack().items.map((item) => ({ ...item, answerIndex: 1 })) }, library: {} });
    expect(skewed.answerBalance.dominantSharePercent).toBe(100);

    // An out-of-range or missing key is not counted as a keyed item.
    const unkeyed = buildApBlueprintCoverage({ pack: { ...basePack(), items: [{ domainId: 'u1', topicIds: ['1.1'], answerIndex: 9, choices: ['a', 'b'] }, { domainId: 'u1', topicIds: ['1.1'] }] }, library: {} });
    expect(unkeyed.answerBalance.keyedItemCount).toBe(0);
    expect(unkeyed.answerBalance.dominantSharePercent).toBeNull();
  });

  it('reports an undeclared topic universe as a gap, never as full coverage', () => {
    // The failure this exists to prevent: with no declared universe, "topics
    // represented / topics observed" is 100% by construction and can never fail.
    const undeclared = buildApBlueprintCoverage({ pack: { ...basePack(), blueprint: {} }, library: {} });
    expect(undeclared.topics.universeDeclared).toBe(false);
    expect(undeclared.topics.declaredCount).toBeNull();
    expect(undeclared.topics.coveragePercent).toBeNull();
    expect(undeclared.topics.representedCount).toBeNull();
    expect(undeclared.gaps).toContain('topic-universe-not-declared');
    expect(undeclared.assessment).toBe('gaps-present');
  });

  it('catches every kind of unresolved cross reference', () => {
    // These ids become navigation in the Hub's study-plan view: a route section
    // is a "Read the lesson first" button, itemIds are a practice set. An id
    // that resolves to nothing is a dead control, so each kind is calibrated.
    const library = {
      chapters: [{ id: 'c1', sections: [{ id: 's1', knowledgeChecks: [{ id: 'k1' }] }] }],
      flashcards: [{ id: 'f1' }],
      memoryAids: [{ id: 'a1' }],
      topicDiagnosticRoutes: [{
        id: 'r1', chapterId: 'c-gone', sectionIds: ['s1', 's-gone'], flashcardIds: ['f-gone'],
        memoryAidIds: ['a1'], knowledgeCheckIds: ['k-gone'], itemIds: ['i-gone'],
        diagnosticSets: [{ id: 'set1', sectionId: 's-gone-too', itemIds: ['i-gone-too'] }],
      }],
      reviewLadders: [{ id: 'l1', itemIds: ['i-ladder-gone'] }],
      studySessionPlans: [{ id: 'p1', itemIds: ['i-session-gone'] }],
    };
    const pack = {
      ...basePack(),
      items: [{ id: 'i1', domainId: 'u1', topicIds: ['1.1'], answerIndex: 0, choices: ['a', 'b'], learningSectionId: 's-item-gone', chapterIds: ['c-item-gone'] }],
    };
    const coverage = buildApBlueprintCoverage({ pack, library });
    expect(coverage.crossReferences.unresolved).toEqual({
      'item-learning-section': 1,
      'item-chapter': 1,
      'route-chapter': 1,
      'route-section': 1,
      'route-flashcard': 1,
      'route-knowledge-check': 1,
      'route-item': 1,
      'set-section': 1,
      'set-item': 1,
      'reviewLadders-item': 1,
      'studySessionPlans-item': 1,
    });
    expect(coverage.crossReferences.unresolvedCount).toBe(11);
    expect(coverage.crossReferences.examples.length).toBeGreaterThan(0);
    expect(coverage.crossReferences.examples[0]).toMatch(/->/);
    expect(coverage.gaps).toContain('unresolved-cross-references');

    // A resolvable id must not be reported.
    const clean = buildApBlueprintCoverage({
      pack: { ...basePack(), items: [{ id: 'i1', domainId: 'u1', topicIds: ['1.1'], answerIndex: 0, choices: ['a', 'b'], learningSectionId: 's1', chapterIds: ['c1'] }] },
      library: { chapters: [{ id: 'c1', sections: [{ id: 's1' }] }] },
    });
    expect(clean.crossReferences.unresolvedCount).toBe(0);
    expect(clean.crossReferences.checked).toBe(2);
    expect(clean.gaps).not.toContain('unresolved-cross-references');
  });

  it('reports lesson depth per chapter', () => {
    const coverage = buildApBlueprintCoverage({
      pack: basePack(),
      library: { chapters: [{ id: 'c1' }, { id: 'c2' }], summary: { sections: 6 } },
    });
    expect(coverage.lessonDepth).toEqual({ chapterCount: 2, sectionCount: 6, sectionsPerChapter: 3 });
    const noChapters = buildApBlueprintCoverage({ pack: basePack(), library: {} });
    expect(noChapters.lessonDepth.sectionsPerChapter).toBeNull();
  });

  it('counts library layers and names the empty ones', () => {
    const coverage = buildApBlueprintCoverage({
      pack: basePack(),
      library: { chapters: [{ id: 'c' }], flashcards: [{ id: 'f' }], glossary: [], sourceCatalog: [{ id: 's' }], summary: { sections: 3, knowledgeChecks: 2 } },
    });
    expect(coverage.library.chapters).toBe(1);
    expect(coverage.library.sections).toBe(3);
    expect(coverage.library.sourceCatalog).toBe(1);
    expect(coverage.emptyLibraryLayers).toContain('glossaryTerms');
    expect(coverage.emptyLibraryLayers).toContain('diagrams');
    expect(coverage.emptyLibraryLayers).not.toContain('chapters');
  });

  it('makes no claim beyond structural coverage', () => {
    const coverage = buildApBlueprintCoverage({ pack: basePack(), library: {} });
    expect(coverage.boundary).toMatch(/Not content validity/);
    expect(coverage.boundary).toMatch(/release eligibility/);
    expect(Object.keys(coverage)).not.toContain('score');
    expect(Object.keys(coverage)).not.toContain('readiness');
  });

  it('is present and self-consistent in all eight shipped AP QA reports', () => {
    expect(packFiles.length).toBe(8);
    packFiles.forEach((packFile) => {
      const qaFile = packFile.replace('.json', '_qa.json');
      const pack = readJson(packFile);
      const report = readJson(qaFile);
      const coverage = report.blueprintCoverage;
      expect(coverage, qaFile + ' must publish blueprintCoverage').toBeTruthy();
      expect(coverage.schemaVersion).toBe(1);
      expect(coverage.packId).toBe(pack.id);
      expect(coverage.itemCount).toBe(pack.items.length);
      expect(coverage.units.declaredCount).toBe(pack.domains.length);
      // Every declared unit carries items in every shipped pack today.
      expect(coverage.units.missing, pack.id + ' has a unit with no items').toEqual([]);
      expect(coverage.gaps).not.toContain('units-without-items');
      expect(coverage.gaps).not.toContain('no-items');
      // No shipped pack may route items to topics outside a declared blueprint.
      expect(coverage.topics.offBlueprint, pack.id + ' routes items off blueprint').toEqual([]);
      if (coverage.topics.universeDeclared) {
        expect(coverage.topics.missing, pack.id + ' declares topics with no items').toEqual([]);
        expect(coverage.topics.coveragePercent).toBe(100);
        expect(coverage.topics.minItemsPerDeclaredTopic).toBeGreaterThan(0);
      } else {
        expect(coverage.topics.coveragePercent).toBeNull();
        expect(coverage.gaps).toContain('topic-universe-not-declared');
      }
      // Answer keys are balanced across positions in every shipped bank.
      expect(coverage.answerBalance.keyedItemCount).toBe(pack.items.length);
      expect(coverage.answerBalance.dominantSharePercent).toBeLessThanOrEqual(40);
      // Every id the study-plan view turns into navigation must resolve.
      expect(coverage.crossReferences.checked).toBeGreaterThan(0);
      expect(coverage.crossReferences.unresolved, pack.id + ' has dead references').toEqual({});
      expect(coverage.crossReferences.unresolvedCount).toBe(0);
      expect(coverage.gaps).not.toContain('unresolved-cross-references');
    });
  }, SLOW);

  it('gives every pack three lesson sections per unit', () => {
    // Biology and Chemistry each gave a unit a single native lesson section
    // while every other pack gave three. Both were raised to three per unit on
    // 2026-09-06, with items re-routed to the section for their own topic.
    const thin = packFiles
      .map((packFile) => readJson(packFile.replace('.json', '_qa.json')).blueprintCoverage)
      .filter((coverage) => coverage.lessonDepth.sectionsPerChapter < 3)
      .map((coverage) => coverage.packId);
    expect(thin).toEqual([]);
    expect(readJson('ap_biology_foundation_pilot_qa.json').blueprintCoverage.lessonDepth).toEqual({ chapterCount: 8, sectionCount: 24, sectionsPerChapter: 3 });
    expect(readJson('ap_chemistry_foundation_pilot_qa.json').blueprintCoverage.lessonDepth).toEqual({ chapterCount: 9, sectionCount: 27, sectionsPerChapter: 3 });
  }, SLOW);

  // Shared for the two backfilled packs: every item routes to the section that
  // lists its topic, every section receives items, every section is a full rich
  // lesson with a section-bound check, and check keys are spread across positions.
  function expectTopicRoutedLibrary(packFile, libraryFile, specModule, chapterCount) {
    const pack = readJson(packFile);
    const library = readJson(libraryFile);
    const specs = require(resolve(process.cwd(), specModule));
    const unitSpecs = specs[Object.keys(specs)[0]];
    const sectionIds = new Set(library.chapters.flatMap((chapter) => chapter.sections.map((section) => section.id)));
    const used = {};
    pack.items.forEach((item) => {
      expect(sectionIds.has(item.learningSectionId), item.id).toBe(true);
      used[item.learningSectionId] = (used[item.learningSectionId] || 0) + 1;
      const unit = Number(item.chapterIds[0].slice(-2));
      const spec = unitSpecs[unit - 1];
      const topic = item.topicIds[0];
      const expectedIndex = spec.section1Topics.includes(topic) ? 1 : spec.sections.findIndex((section) => section.topics.includes(topic)) + 2;
      expect(expectedIndex, item.id + ' topic ' + topic + ' is assigned to no section').toBeGreaterThan(0);
      expect(item.learningSectionId.endsWith('-section-0' + expectedIndex), item.id + ' topic ' + topic).toBe(true);
    });
    expect(Object.keys(used)).toHaveLength(chapterCount * 3);
    library.chapters.forEach((chapter) => {
      expect(chapter.sections).toHaveLength(3);
      expect(chapter.knowledgeChecks).toHaveLength(3);
      chapter.sections.forEach((section) => {
        // Thresholds match each pack's own QA gate (Chemistry's original
        // sections carry two retrieval prompts; the new ones carry three).
        expect(section.examples.length).toBeGreaterThanOrEqual(2);
        expect(section.nonExamples.length).toBeGreaterThanOrEqual(2);
        expect(section.retrievalPrompts.length).toBeGreaterThanOrEqual(2);
        expect(section.workedDataExample.rows.length).toBeGreaterThanOrEqual(2);
        expect(section.transferMove).toBeTruthy();
        expect(chapter.knowledgeChecks.some((check) => check.sectionId === section.id)).toBe(true);
      });
      chapter.knowledgeChecks.forEach((check) => {
        expect(check.choices).toHaveLength(4);
        expect(check.choices[check.answerIndex]).toBeTruthy();
      });
    });
    const positions = {};
    library.chapters.flatMap((chapter) => chapter.knowledgeChecks).forEach((check) => { positions[check.answerIndex] = (positions[check.answerIndex] || 0) + 1; });
    expect(Object.keys(positions)).toHaveLength(4);
    expect(Math.max(...Object.values(positions))).toBeLessThanOrEqual(Math.ceil(chapterCount * 3 * 0.4));
  }

  it('routes every Biology item to the lesson section for its own topic', () => {
    expectTopicRoutedLibrary('ap_biology_foundation_pilot.json', 'ap_biology_foundation_pilot_learning_library.json', 'dev-tools/ap_biology_lesson_sections.cjs', 8);
  }, SLOW);

  it('routes every Chemistry item to the lesson section for its own topic', () => {
    expectTopicRoutedLibrary('ap_chemistry_foundation_pilot.json', 'ap_chemistry_foundation_pilot_learning_library.json', 'dev-tools/ap_chemistry_lesson_sections.cjs', 9);
  }, SLOW);

  it('declares a framework topic universe for every pack whose ids are framework ids', () => {
    // Biology, Chemistry and Psychology were transcribed from their official
    // CEDs on 2026-09-06 and matched their packs exactly. AP Physics 1 is the
    // one holdout: its item topicIds are an internal numbering, so no official
    // universe is declared for it and its coverage stays unmeasured on purpose.
    const undeclared = packFiles
      .map((packFile) => readJson(packFile.replace('.json', '_qa.json')).blueprintCoverage)
      .filter((coverage) => !coverage.topics.universeDeclared)
      .map((coverage) => coverage.packId);
    expect(undeclared).toEqual(['ap-physics-1-foundation-pilot']);

    const physics = readJson('ap_physics_1_foundation_pilot.json');
    expect(physics.blueprint.topicIdScheme).toBe('internal-pack-numbering');
    expect(physics.blueprint.topicIdSchemeNote).toMatch(/does not correspond/);
    expect(physics.blueprint.officialFrameworkTopicCountReference).toBe(43);
    expect(physics.blueprint.officialFrameworkTopicIds).toBeUndefined();
  }, SLOW);

  it('declares only topic ids the pack actually uses, with a recorded source', () => {
    const { AP_FRAMEWORK_TOPIC_IDS } = require(resolve(process.cwd(), 'dev-tools/ap_framework_topics.cjs'));
    const expected = {
      'ap-biology-foundation-pilot': 60,
      'ap-chemistry-foundation-pilot': 91,
      'ap-psychology-pilot': 35,
    };
    Object.entries(expected).forEach(([packId, count]) => {
      expect(AP_FRAMEWORK_TOPIC_IDS[packId]).toHaveLength(count);
      const packFile = packFiles.find((name) => readJson(name).id === packId);
      const pack = readJson(packFile);
      const declared = pack.blueprint.officialFrameworkTopicIds;
      expect(declared, packId).toEqual(AP_FRAMEWORK_TOPIC_IDS[packId]);
      expect(pack.blueprint.officialFrameworkTopicCount).toBe(count);
      expect(pack.blueprint.officialFrameworkTopicSource.url).toMatch(/^https:\/\/apcentral\.collegeboard\.org\//);
      expect(pack.blueprint.officialFrameworkTopicSource.transcribedAt).toBe('2026-09-06');
      // The declared universe must be exactly what the items use: no aspirational
      // topics, and no item routed outside the declared framework.
      const used = new Set();
      pack.items.forEach((item) => (item.topicIds || []).forEach((topicId) => used.add(String(topicId))));
      expect([...used].sort(), packId).toEqual([...declared].sort());
    });
    // No titles or other CED prose are reproduced, only the numbering.
    Object.values(AP_FRAMEWORK_TOPIC_IDS).flat().forEach((id) => expect(id).toMatch(/^\d{1,2}\.\d{1,2}$/));
  }, SLOW);
});
