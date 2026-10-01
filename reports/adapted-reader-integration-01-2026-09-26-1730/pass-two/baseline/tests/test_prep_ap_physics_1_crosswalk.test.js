import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// The AP Physics 1 pack numbers topics on an internal scheme whose ids look like
// framework ids but index different topics. This crosswalk relates the two so
// framework coverage can be discussed at all. It is a draft: rows marked
// `inferred` are judgement calls awaiting subject-expert confirmation, and these
// assertions exist to keep that boundary honest as the pack changes.
const require = createRequire(import.meta.url);
const {
  AP_PHYSICS_1_FRAMEWORK_TOPICS,
  AP_PHYSICS_1_CROSSWALK,
  buildCrosswalkSummary,
} = require(resolve(process.cwd(), 'dev-tools/ap_physics_1_topic_crosswalk.cjs'));

const readJson = (name) => JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep', name), 'utf8'));
const SLOW = 60_000;

describe('AP Physics 1 topic crosswalk', () => {
  it('records all 43 framework topics with well-formed ids', () => {
    const ids = Object.keys(AP_PHYSICS_1_FRAMEWORK_TOPICS);
    expect(ids).toHaveLength(43);
    ids.forEach((id) => {
      expect(id).toMatch(/^[1-8]\.\d{1,2}$/);
      expect(AP_PHYSICS_1_FRAMEWORK_TOPICS[id].length).toBeGreaterThan(3);
    });
    // Unit sizes as published: 5, 9, 5, 4, 6, 6, 4, 4.
    const perUnit = ids.reduce((counts, id) => {
      const unit = id.split('.')[0];
      counts[unit] = (counts[unit] || 0) + 1;
      return counts;
    }, {});
    expect(perUnit).toEqual({ 1: 5, 2: 9, 3: 5, 4: 4, 5: 6, 6: 6, 7: 4, 8: 4 });
  });

  it('maps every pack topic exactly once and only onto real framework topics', () => {
    const packTopics = AP_PHYSICS_1_CROSSWALK.map((row) => row.pack);
    expect(new Set(packTopics).size).toBe(packTopics.length);
    AP_PHYSICS_1_CROSSWALK.forEach((row) => {
      expect(['exact', 'high', 'inferred', 'unmapped']).toContain(row.confidence);
      row.framework.forEach((id) => expect(AP_PHYSICS_1_FRAMEWORK_TOPICS[id], row.pack + ' -> ' + id).toBeDefined());
      // Anything not a clean title match must explain itself.
      if (row.confidence !== 'exact') expect(row.note, row.pack + ' needs a note').toBeTruthy();
      if (row.confidence === 'unmapped') expect(row.framework).toEqual([]);
      else expect(row.framework.length).toBeGreaterThan(0);
    });
  });

  it('covers every topic the pack actually ships, and no others', () => {
    const pack = readJson('ap_physics_1_foundation_pilot.json');
    const used = new Set();
    pack.items.forEach((item) => (item.topicIds || []).forEach((id) => used.add(String(id))));
    const crosswalked = new Set(AP_PHYSICS_1_CROSSWALK.map((row) => row.pack));
    expect([...used].sort(), 'pack topics missing from the crosswalk').toEqual([...crosswalked].sort());
  }, SLOW);

  it('names the framework topics with no pack topic behind them', () => {
    const summary = buildCrosswalkSummary();
    expect(summary.frameworkTopicCount).toBe(43);
    expect(summary.packTopicCount).toBe(39);
    expect(summary.mappedFrameworkTopicCount).toBe(37);
    // Six framework topics have no mapped pack topic. Comparing raw ids across
    // the two numbering schemes gives a different and wrong answer, which is
    // exactly the mistake this crosswalk exists to prevent.
    expect(summary.uncoveredFrameworkTopicIds).toEqual(['2.8', '3.4', '5.2', '5.6', '6.2', '6.6']);
    // 2.9 Circular Motion and 6.5 Rolling ARE covered, by pack 2.6 and pack 6.2.
    expect(summary.uncoveredFrameworkTopicIds).not.toContain('2.9');
    expect(summary.uncoveredFrameworkTopicIds).not.toContain('6.5');
  });

  it('keeps its draft boundary explicit while inferred rows remain', () => {
    const summary = buildCrosswalkSummary();
    expect(summary.rowsByConfidence.inferred).toBeGreaterThan(0);
    expect(summary.status).toBe('draft-pending-subject-expert-review');
    expect(summary.boundary).toMatch(/subject-expert confirmation/);
    expect(summary.boundary).toMatch(/may be published/);
    // A pack topic spanning several framework topics does not establish coverage
    // of each, and two pack topics claiming one framework topic is a real overlap.
    expect(summary.oneToManyPackTopics).toEqual(['2.3', '3.3']);
    expect(summary.frameworkTopicsClaimedByMultiplePackTopics).toEqual(['2.1', '3.1', '3.2', '6.3']);
  });

  it('is referenced from the pack, which still declares no framework universe', () => {
    const pack = readJson('ap_physics_1_foundation_pilot.json');
    expect(pack.blueprint.topicIdScheme).toBe('internal-pack-numbering');
    expect(pack.blueprint.topicCrosswalkModule).toBe('dev-tools/ap_physics_1_topic_crosswalk.cjs');
    expect(pack.blueprint.topicCrosswalkStatus).toBe('draft-pending-subject-expert-review');
    // Until the crosswalk is reviewed, no official universe may be declared.
    expect(pack.blueprint.officialFrameworkTopicIds).toBeUndefined();
    expect(pack.blueprint.topicIdSchemeNote).toMatch(/2\.8 Spring Forces/);
    expect(pack.blueprint.topicIdSchemeNote).toMatch(/remains unmeasured/);
  }, SLOW);
});
