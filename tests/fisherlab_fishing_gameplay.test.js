import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const PRODUCTIVE_COD_SETUP = {
  region: 'maine',
  speciesId: 'cod',
  spotId: 'rocky-ledge',
  tackleId: 'bottom-jig',
  targetDepth: 'bottom',
  conditions: {
    tide: 'ebb',
    waterTemperatureC: 6,
    current: 'moderate'
  },
  presentation: {
    technique: 'vertical-jig',
    retrieveSpeed: 'slow'
  }
};

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_fisherlab.js', 'fisherLab');
});

describe('Fisher Lab fishing setup choices', () => {
  it('publishes discoverable spots and tackle with usable fishing affordances', () => {
    const { getFishingSpot, getFishingTackle } = window.__FisherLabCore;
    const ledge = getFishingSpot('maine', 'rocky-ledge');
    const jig = getFishingTackle('bottom-jig');

    expect(ledge).toMatchObject({
      id: 'rocky-ledge',
      region: 'maine',
      depthZone: 'bottom'
    });
    expect(ledge.habitatTags).toContain('rocky');
    expect(ledge.speciesAffinity.cod).toBeGreaterThan(0);

    expect(jig).toMatchObject({
      id: 'bottom-jig',
      depthZone: 'bottom',
      technique: 'vertical-jig'
    });
    expect(jig.speciesAffinity.cod).toBeGreaterThan(0);
  });

  it('makes habitat, depth, tackle, conditions, and presentation causally matter', () => {
    const { scoreFishingSetup } = window.__FisherLabCore;
    const productive = scoreFishingSetup(PRODUCTIVE_COD_SETUP);
    const wrongHabitat = scoreFishingSetup({ ...PRODUCTIVE_COD_SETUP, spotId: 'open-water' });
    const wrongDepth = scoreFishingSetup({ ...PRODUCTIVE_COD_SETUP, targetDepth: 'surface' });
    const wrongTackle = scoreFishingSetup({ ...PRODUCTIVE_COD_SETUP, tackleId: 'sabiki' });
    const poorConditions = scoreFishingSetup({
      ...PRODUCTIVE_COD_SETUP,
      conditions: { tide: 'slack', waterTemperatureC: 18, current: 'calm' }
    });
    const poorPresentation = scoreFishingSetup({
      ...PRODUCTIVE_COD_SETUP,
      presentation: { technique: 'fast-retrieve', retrieveSpeed: 'fast' }
    });

    expect(productive).toMatchObject({
      total: expect.any(Number),
      components: {
        habitat: expect.any(Number),
        depth: expect.any(Number),
        tackle: expect.any(Number),
        conditions: expect.any(Number),
        presentation: expect.any(Number)
      },
      evidence: expect.any(Array)
    });
    expect(productive.evidence.length).toBeGreaterThan(0);

    expect(productive.components.habitat).toBeGreaterThan(wrongHabitat.components.habitat);
    expect(productive.components.depth).toBeGreaterThan(wrongDepth.components.depth);
    expect(productive.components.tackle).toBeGreaterThan(wrongTackle.components.tackle);
    expect(productive.components.conditions).toBeGreaterThan(poorConditions.components.conditions);
    expect(productive.components.presentation).toBeGreaterThan(poorPresentation.components.presentation);

    [wrongHabitat, wrongDepth, wrongTackle, poorConditions, poorPresentation].forEach((result) => {
      expect(productive.total).toBeGreaterThan(result.total);
    });
  });
});

describe('Fisher Lab deterministic fishing encounters', () => {
  it('selects the same encounter from the same seed without global randomness', () => {
    const { createFishingEncounter } = window.__FisherLabCore;
    const randomSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Seeded fishing encounters must not use Math.random');
    });

    try {
      const first = createFishingEncounter({ ...PRODUCTIVE_COD_SETUP, seed: 'casco-class-7' });
      const replay = createFishingEncounter({ ...PRODUCTIVE_COD_SETUP, seed: 'casco-class-7' });

      expect(replay).toEqual(first);
      expect(first).toMatchObject({
        seed: 'casco-class-7',
        speciesId: expect.any(String),
        phase: 'ready',
        landed: false,
        setupScore: {
          total: expect.any(Number)
        },
        encounterScore: {
          total: expect.any(Number)
        },
        biteChance: expect.any(Number)
      });
      expect(first.biteChance).toBeGreaterThanOrEqual(0);
      expect(first.biteChance).toBeLessThanOrEqual(1);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('lets informed setup choices improve encounter affinity and bite likelihood', () => {
    const { createFishingEncounter } = window.__FisherLabCore;
    const productive = createFishingEncounter({ ...PRODUCTIVE_COD_SETUP, seed: 'comparison-seed' });
    const mismatched = createFishingEncounter({
      ...PRODUCTIVE_COD_SETUP,
      spotId: 'open-water',
      tackleId: 'sabiki',
      targetDepth: 'surface',
      conditions: { tide: 'slack', waterTemperatureC: 18, current: 'calm' },
      presentation: { technique: 'fast-retrieve', retrieveSpeed: 'fast' },
      seed: 'comparison-seed'
    });

    expect(productive.setupScore.total).toBeGreaterThan(mismatched.setupScore.total);
    expect(productive.biteChance).toBeGreaterThan(mismatched.biteChance);
  });

  it('scores bycatch evidence and bite likelihood against the species actually encountered', () => {
    const { createFishingEncounter, scoreFishingSetup } = window.__FisherLabCore;
    let bycatch = null;
    for (let index = 0; index < 100 && !bycatch; index += 1) {
      const candidate = createFishingEncounter({ ...PRODUCTIVE_COD_SETUP, seed: `bycatch-${index}` });
      if (candidate.speciesId !== PRODUCTIVE_COD_SETUP.speciesId) bycatch = candidate;
    }

    expect(bycatch).not.toBeNull();
    const expected = scoreFishingSetup({ ...PRODUCTIVE_COD_SETUP, speciesId: bycatch.speciesId });
    expect(bycatch.encounterScore).toEqual(expected);
    expect(bycatch.encounterAffinity).toBe(expected.total);
    expect(bycatch.biteChance).toBeCloseTo(Math.min(1, 0.12 + expected.total / 115), 8);
  });

  it('publishes regional voyage evidence without inventing Great Lakes tides', () => {
    const { getFishingScenarioConditions } = window.__FisherLabCore;
    expect(getFishingScenarioConditions('greatlakes', 'rainy', 'sunset')).toMatchObject({
      tide: 'none',
      waterTemperatureC: 7,
      current: 'moderate',
      weather: 'rainy',
      timeOfDay: 'sunset'
    });
  });
});

describe('Fisher Lab fishing skill checks', () => {
  it('distinguishes an accurate cast from an off-target cast', () => {
    const { evaluateCast } = window.__FisherLabCore;
    const placed = evaluateCast({ accuracy: 0.95, distanceRatio: 0.85, assistMode: false });
    const offTarget = evaluateCast({ accuracy: 0.1, distanceRatio: 0.2, assistMode: false });

    expect(placed).toMatchObject({ success: true, outcome: 'placed', feedback: expect.any(String) });
    expect(offTarget).toMatchObject({ success: false, outcome: 'off-target', feedback: expect.any(String) });
  });

  it('uses the bite window to distinguish a hookset from a missed bite', () => {
    const { evaluateHookset } = window.__FisherLabCore;
    const hooked = evaluateHookset({ reactionMs: 500, biteWindowMs: 900, assistMode: false });
    const missed = evaluateHookset({ reactionMs: 1500, biteWindowMs: 900, assistMode: false });

    expect(hooked).toMatchObject({ success: true, outcome: 'hooked', feedback: expect.any(String) });
    expect(missed).toMatchObject({ success: false, outcome: 'missed-bite', feedback: expect.any(String) });
  });

  it('distinguishes controlled tension, slack line, and a line break', () => {
    const { evaluateFight } = window.__FisherLabCore;
    const controlled = evaluateFight({ tensionSamples: [0.42, 0.55, 0.63, 0.51], assistMode: false });
    const slack = evaluateFight({ tensionSamples: [0.05, 0.08, 0.12, 0.09], assistMode: false });
    const broken = evaluateFight({ tensionSamples: [0.72, 0.91, 0.98, 1], assistMode: false });

    expect(controlled).toMatchObject({ success: true, outcome: 'landed', feedback: expect.any(String) });
    expect(slack).toMatchObject({ success: false, outcome: 'slack-line', feedback: expect.any(String) });
    expect(broken).toMatchObject({ success: false, outcome: 'line-break', feedback: expect.any(String) });
  });

  it('widens timing and tension tolerances in assist mode without guaranteeing success', () => {
    const { evaluateHookset, evaluateFight } = window.__FisherLabCore;
    const standardHookset = evaluateHookset({ reactionMs: 1100, biteWindowMs: 900, assistMode: false });
    const assistedHookset = evaluateHookset({ reactionMs: 1100, biteWindowMs: 900, assistMode: true });
    const standardFight = evaluateFight({ tensionSamples: [0.22, 0.48, 0.78, 0.51], assistMode: false });
    const assistedFight = evaluateFight({ tensionSamples: [0.22, 0.48, 0.78, 0.51], assistMode: true });
    const recoveredFight = evaluateFight({ tensionSamples: [0.45, 0.8, 0.65, 0.6], assistMode: false });
    const abandonedHookset = evaluateHookset({ reactionMs: 5000, biteWindowMs: 900, assistMode: true });
    const abandonedFight = evaluateFight({ tensionSamples: [0, 0, 0, 0], assistMode: true });

    expect(standardHookset.success).toBe(false);
    expect(assistedHookset).toMatchObject({ success: true, assisted: true });
    expect(standardFight.success).toBe(false);
    expect(assistedFight).toMatchObject({ success: true, assisted: true });
    expect(recoveredFight).toMatchObject({ success: true, outcome: 'landed' });
    expect(abandonedHookset.success).toBe(false);
    expect(abandonedFight.success).toBe(false);
  });
});

describe('Fisher Lab fishing phase loop', () => {
  it('requires cast, presentation, bite, hookset, and fight in order', () => {
    const {
      createFishingEncounter,
      evaluateCast,
      evaluateHookset,
      evaluateFight,
      advanceFishingPhase
    } = window.__FisherLabCore;
    const encounter = createFishingEncounter({ ...PRODUCTIVE_COD_SETUP, seed: 'phase-loop' });
    const castResult = evaluateCast({ accuracy: 0.95, distanceRatio: 0.85, assistMode: false });
    const hooksetResult = evaluateHookset({ reactionMs: 500, biteWindowMs: 900, assistMode: false });
    const fightResult = evaluateFight({ tensionSamples: [0.42, 0.55, 0.63, 0.51], assistMode: false });

    const cannotLandFromReady = advanceFishingPhase(encounter, { type: 'fight', result: fightResult });
    expect(cannotLandFromReady).toMatchObject({ phase: 'ready', landed: false });

    const presented = advanceFishingPhase(encounter, { type: 'cast', result: castResult });
    expect(presented).toMatchObject({ phase: 'presentation', landed: false });

    const cannotSkipBite = advanceFishingPhase(presented, { type: 'hookset', result: hooksetResult });
    expect(cannotSkipBite).toMatchObject({ phase: 'presentation', landed: false });

    const bite = advanceFishingPhase(presented, { type: 'bite' });
    expect(bite).toMatchObject({ phase: 'bite', landed: false });

    const fight = advanceFishingPhase(bite, { type: 'hookset', result: hooksetResult });
    expect(fight).toMatchObject({ phase: 'fight', landed: false });

    const landed = advanceFishingPhase(fight, { type: 'fight', result: fightResult });
    expect(landed).toMatchObject({ phase: 'landed', landed: true });
  });

  it('never turns the cast action into an instant catch shortcut', () => {
    const { createFishingEncounter, evaluateCast, advanceFishingPhase } = window.__FisherLabCore;
    const encounter = createFishingEncounter({ ...PRODUCTIVE_COD_SETUP, seed: 'no-shortcut' });
    const castResult = evaluateCast({ accuracy: 1, distanceRatio: 0.85, assistMode: true });
    const afterCast = advanceFishingPhase(encounter, { type: 'cast', result: castResult });

    expect(afterCast.phase).toBe('presentation');
    expect(afterCast.landed).toBe(false);
    expect(afterCast.phase).not.toBe('landed');
  });
});
