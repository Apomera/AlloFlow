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
const readJson = (name) => JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep', name), 'utf8'));

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
    });
  });

  it('records which four packs still declare no topic universe', () => {
    // Pinned deliberately: these four are 2,200 items whose topic coverage no
    // gate can verify. Declaring a universe for one should update this list.
    const undeclared = packFiles
      .map((packFile) => readJson(packFile.replace('.json', '_qa.json')).blueprintCoverage)
      .filter((coverage) => !coverage.topics.universeDeclared)
      .map((coverage) => coverage.packId)
      .sort();
    expect(undeclared).toEqual([
      'ap-biology-foundation-pilot',
      'ap-chemistry-foundation-pilot',
      'ap-physics-1-foundation-pilot',
      'ap-psychology-pilot',
    ]);
  });
});
