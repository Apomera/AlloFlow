import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = readFileSync('stem_lab/stem_tool_beehive.js', 'utf8');
let BH;

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = window.__RR_TEST_EXPORTS__ || {};
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
});

describe('Beehive seeded daily model', () => {
  it('replays an identical random stream from the same seed', () => {
    const first = BH.bhCreateSeededRandom(18436572);
    const second = BH.bhCreateSeededRandom(18436572);
    const a = Array.from({ length: 24 }, () => first.rand());
    const b = Array.from({ length: 24 }, () => second.rand());

    expect(a).toEqual(b);
    a.forEach((draw) => {
      expect(draw).toBeGreaterThanOrEqual(0);
      expect(draw).toBeLessThan(1);
    });
  });

  it('resumes at the exact next draw from a saved random-state cursor', () => {
    const uninterrupted = BH.bhCreateSeededRandom(90210);
    Array.from({ length: 11 }, () => uninterrupted.rand());
    const cursor = uninterrupted.getState();
    const expectedTail = Array.from({ length: 8 }, () => uninterrupted.rand());

    const resumed = BH.bhCreateSeededRandom(cursor);
    expect(Array.from({ length: 8 }, () => resumed.rand())).toEqual(expectedTail);
  });

  it('produces distinct streams for distinct seeds', () => {
    const a = BH.bhCreateSeededRandom(1);
    const b = BH.bhCreateSeededRandom(2);
    expect(Array.from({ length: 8 }, () => a.rand()))
      .not.toEqual(Array.from({ length: 8 }, () => b.rand()));
  });

  it('clamps learner-entered seeds instead of wrapping to a surprising value', () => {
    expect(BH.bhSeedFromInput(-25)).toBe(0);
    expect(BH.bhSeedFromInput(12.9)).toBe(12);
    expect(BH.bhSeedFromInput(4294967296)).toBe(4294967295);
    expect(BH.bhSeedFromInput('not a number')).toBe(BH.BEEHIVE_DEFAULT_SEED);
  });

  it('creates a bounded, different fresh seed without consuming the colony stream', () => {
    const first = BH.bhFreshExperimentSeed(1234, 987654321);
    const repeated = BH.bhFreshExperimentSeed(1234, 987654321);
    expect(first).toBe(repeated);
    expect(first).not.toBe(1234);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThanOrEqual(4294967295);
  });

  it('creates replayable new colonies with normalized seed metadata', () => {
    const state = BH.bhCreateNewColonyState(4294967301);
    expect(state.modelVersion).toBe(BH.BEEHIVE_COLONY_MODEL_VERSION);
    expect(state.simulationSeed).toBe(5);
    expect(state.randomState).toBe(5);
    expect(state.seededFromDay).toBe(0);
    expect(BH.bhExperimentProvenance(state)).toMatchObject({
      modelVersion: BH.BEEHIVE_COLONY_MODEL_VERSION,
      simulationSeed: 5,
      randomState: 5,
      seededFromDay: 0,
      exactFromStart: true,
    });
  });

  it('migrates an older save from its current day without overstating replay history', () => {
    const provenance = BH.bhExperimentProvenance({ day: 47 });
    expect(provenance.simulationSeed).toBe(BH.BEEHIVE_DEFAULT_SEED);
    expect(provenance.randomState).toBe(BH.BEEHIVE_DEFAULT_SEED);
    expect(provenance.seededFromDay).toBe(47);
    expect(provenance.exactFromStart).toBe(false);
  });
});

describe('Beehive reproducibility surfaces', () => {
  it('shows an editable seed before Day 1 and locks it after the run begins', () => {
    const setup = renderTool('beehive', { beehive: { viewMode: 'beekeeper', day: 0, simulationSeed: 1234 } });
    const active = renderTool('beehive', { beehive: { viewMode: 'beekeeper', day: 1, simulationSeed: 1234, randomState: 5678, seededFromDay: 0 } });

    expect(setup).toContain('data-beehive-experiment-provenance="true"');
    expect(setup).toContain('data-beehive-seed="1234"');
    expect(setup).toContain('data-beehive-seed-input="true"');
    expect(setup).toContain('<fieldset');
    expect(setup).toContain('Repeatable experiment setup');
    expect(setup).toContain('A seed is the recipe for the simulation');
    expect(setup).toContain('data-beehive-seed-status="setup"');
    expect(setup).toContain('data-beehive-fresh-seed="true"');
    expect(setup).toContain('Fair-comparison tip:');
    expect(setup).toMatch(/data-beehive-seed-input="true"[^>]*aria-readonly="false"|aria-readonly="false"[^>]*data-beehive-seed-input="true"/);

    expect(active).toContain('data-beehive-seed="1234"');
    expect(active).toContain('data-beehive-seed-status="locked"');
    expect(active).toContain('The recipe is read-only after Day 1');
    expect(active).not.toContain('data-beehive-fresh-seed="true"');
    expect(active).toMatch(/data-beehive-seed-input="true"[^>]*aria-readonly="true"|aria-readonly="true"[^>]*data-beehive-seed-input="true"/);
  });

  it('explains legacy migration honestly and offers two clear restart paths', () => {
    const legacy = renderTool('beehive', { beehive: { viewMode: 'beekeeper', day: 47 } });
    const collapsed = renderTool('beehive', { beehive: { viewMode: 'beekeeper', day: 68, colonySurvived: false, simulationSeed: 2468, randomState: 1357, seededFromDay: 0 } });

    expect(legacy).toContain('data-beehive-seed-migration-note="true"');
    expect(legacy).toContain('days before that point cannot be replayed exactly');
    expect(collapsed).toContain('Choose your next experiment');
    expect(collapsed).toContain('data-beehive-restart="same-seed"');
    expect(collapsed).toContain('data-beehive-restart="fresh-seed"');
    expect(collapsed).toContain('Replay same seed');
    expect(collapsed).toContain('Use a new seed');
  });

  it('includes model, seed, cursor, migration day, scope, and replay requirements in exports', () => {
    [
      '## Repeatable Experiment Details',
      '**Event recipe (seed):**',
      '**Daily colony model:**',
      '**Resume code:**',
      '**Tracking began:** Day',
      '**Exact replay:** Use the same model version, seed, starting colony, and management choices.',
      '**Controlled comparison:** Keep the seed, stock, site, and timing the same; change one management choice.',
      '**Scope:** Covers Beekeeper daily colony outcomes.',
    ].forEach((text) => expect(SOURCE).toContain(text));
  });

  it('persists one seeded cursor across a batch instead of reseeding each day', () => {
    expect(SOURCE).toContain('var seededRandom = bhCreateSeededRandom(savedProvenance.randomState);');
    expect(SOURCE).toContain('var seededCfg = bhCfg(seededRandom.rand);');
    expect(SOURCE).toContain('var _br = bhStepColony(_bs, seededCfg);');
    expect(SOURCE).toContain('b.randomState = seededRandom.getState();');
  });
});
