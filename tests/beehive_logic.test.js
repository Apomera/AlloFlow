// Beehive (beehive) logic suite — direct tests of the module-scope colony
// stepper bhStepColony() and the curriculum data tables, via the
// production-inert window.__RR_TEST_EXPORTS__ hook (block at the end of
// stem_lab/stem_tool_beehive.js). Same pattern as tests/flightsim_logic.test.js.
//
// bhStepColony is the SINGLE source of truth now called by BOTH advanceDay
// (single day) and advanceDays (batch) — so testing it here covers both paths.
// It is pure except for cfg.rand(), which we inject as a deterministic sequence.

import { describe, it, expect, beforeAll } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = window.__RR_TEST_EXPORTS__ || {};
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
  if (!BH) throw new Error('beehive did not populate __RR_TEST_EXPORTS__ — is the export block present?');
});

// rand that yields a fixed sequence then a default (0.99 = "no event fires").
function seq(values, dflt = 0.99) {
  let i = 0;
  return () => (i < values.length ? values[i++] : dflt);
}

const IDENTITY_SUB = { honey: 1, spring: 1, winter: 1, varroa: 1 };
const IDENTITY_SITE = { forage: 1, disease: 1 };
const SWARM = { id: 'swarm', effect: { workers: -12000, morale: -8 } };

function cfg(overrides) {
  return Object.assign({
    params: BH.SIMULATION_PARAMS,
    subMods: IDENTITY_SUB,
    siteMods: IDENTITY_SITE,
    gardenBonus: 0,
    hiveEvents: [SWARM],
    diseaseEvents: [{ id: 'nosema', effect: { workers: -1500, morale: -6, diseaseRisk: 4 } }],
    rand: seq([])
  }, overrides || {});
}

function state(overrides) {
  return Object.assign({
    day: 45,              // summer (season 1)
    workers: 20000, brood: 8000, drones: 500, queenHealth: 100,
    honey: 40, pollen: 20, wax: 5, varroaLevel: 5, morale: 80,
    foragingEfficiency: 70, habitat: 50, pesticideExposure: 0,
    diseaseRisk: 0, activeEvent: null, capacity: 80
  }, overrides || {});
}

describe('bhStepColony — core invariants', () => {
  it('advances the day by exactly one and returns finite, non-negative populations', () => {
    const { next } = BH.bhStepColony(state(), cfg());
    expect(next.day).toBe(46);
    ['workers', 'brood', 'drones', 'honey', 'pollen', 'wax'].forEach((k) => {
      expect(Number.isFinite(next[k])).toBe(true);
      expect(next[k]).toBeGreaterThanOrEqual(0);
    });
  });

  it('clamps varroa, morale and queen health to 0..100', () => {
    const { next } = BH.bhStepColony(state({ varroaLevel: 99, morale: 2, queenHealth: 1, brood: 30000 }), cfg());
    [next.varroaLevel, next.morale, next.queenHealth].forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    });
  });

  it('scoreGain and honeyGain derive from nectar collected (score = round(nectar*10))', () => {
    const { next } = BH.bhStepColony(state(), cfg());
    expect(next.honeyGain).toBeGreaterThanOrEqual(0);
    expect(next.scoreGain).toBe(Math.round(next.honeyGain * 10));
    expect(next.flowerVisits).toBeGreaterThanOrEqual(0);
  });

  it('is deterministic: same input + same rand sequence → identical output (kills the two-path drift)', () => {
    const a = BH.bhStepColony(state(), cfg({ rand: seq([0.0, 0.0]) }));
    const b = BH.bhStepColony(state(), cfg({ rand: seq([0.0, 0.0]) }));
    expect(a.next).toEqual(b.next);
    expect(a.event).toEqual(b.event);
  });
});

describe('bhStepColony — seasonal biology', () => {
  it('summer with a healthy queen grows the worker force', () => {
    const s = state({ day: 45, workers: 20000, brood: 12000, varroaLevel: 3 });
    const { next } = BH.bhStepColony(s, cfg());
    expect(next.workers).toBeGreaterThan(s.workers); // emergence > mortality
  });

  it('winter halts brood production and burns honey stores (no foraging)', () => {
    const s = state({ day: 100, workers: 15000, brood: 4000, honey: 60 }); // day 100 → season 3
    const { next } = BH.bhStepColony(s, cfg());
    expect(next.honeyGain).toBe(0);          // forageMult 0 → no nectar
    expect(next.honey).toBeLessThan(s.honey); // consumption only
    expect(next.brood).toBeLessThanOrEqual(s.brood); // broodRate 0 → only emergence removes brood
  });
});

describe('bhStepColony — varroa & pests', () => {
  it('varroa grows while brood is present', () => {
    const s = state({ varroaLevel: 10, brood: 12000 });
    const { next } = BH.bhStepColony(s, cfg());
    expect(next.varroaLevel).toBeGreaterThan(s.varroaLevel);
  });

  it('a varroa-resistant subspecies (mods.varroa=0.6) grows mites slower than the default stock', () => {
    const s = state({ varroaLevel: 10, brood: 12000 });
    const def = BH.bhStepColony(s, cfg({ subMods: IDENTITY_SUB })).next;
    const russ = BH.bhStepColony(s, cfg({ subMods: { honey: 0.88, spring: 0.85, winter: 1.1, varroa: 0.6 } })).next;
    expect(russ.varroaLevel).toBeLessThan(def.varroaLevel);
  });

  it('pesticide exposure never increases and is a finite number', () => {
    const s = state({ pesticideExposure: 50 });
    const { next } = BH.bhStepColony(s, cfg());
    expect(next.pesticideExposure).toBeLessThanOrEqual(50);
    expect(Number.isFinite(next.pesticideExposure)).toBe(true);
  });
});

describe('bhStepColony — events', () => {
  it('a crowded colony swarms (the Add-Super mechanic): capacity too low → swarm event fires', () => {
    // workers 200000 vs capacity 80 → crowdRatio ≈ 7 (> 1). rand=0 guarantees the gate.
    const s = state({ workers: 200000, capacity: 80, day: 45 });
    const { event } = BH.bhStepColony(s, cfg({ rand: seq([0.0]) }));
    expect(event).not.toBeNull();
    expect(event.id).toBe('swarm');
  });

  it('a roomy colony (high capacity) does NOT swarm at the same population', () => {
    const s = state({ workers: 200000, capacity: 800, day: 45 }); // capacity*350 = 280000 > workers
    const { event } = BH.bhStepColony(s, cfg({ rand: seq([0.99, 0.99]) }));
    // swarm gate fails; random-event gate also fails at 0.99 → no event
    expect(event).toBeNull();
  });

  it('applies a fired hive event\'s effect deltas on top of the normal daily change', () => {
    const gift = { id: 'nectar_flow', effect: { honey: 100, morale: 10 } };
    const s = state({ workers: 5000, capacity: 800, honey: 40, morale: 50 }); // not crowded
    // Baseline: same day, no event (rand high). Then the event's deltas must be
    // exactly the difference — isolating them from the seasonal morale/honey math.
    const base = BH.bhStepColony(s, cfg({ hiveEvents: [gift], rand: seq([0.99, 0.99]) })).next;
    const withEv = BH.bhStepColony(s, cfg({ hiveEvents: [gift], rand: seq([0.0, 0.0]) }));
    expect(withEv.event.id).toBe('nectar_flow');
    expect(withEv.next.morale - base.morale).toBe(10);  // exactly the event's morale delta
    expect(Math.round((withEv.next.honey - base.honey) * 10) / 10).toBe(100); // exactly +100 honey
  });

  it('fires a disease event when disease risk is high', () => {
    const s = state({ diseaseRisk: 60, varroaLevel: 8, workers: 5000, capacity: 800 });
    const { event } = BH.bhStepColony(s, cfg({ rand: seq([0.0, 0.0]) }));
    expect(event).not.toBeNull();
    expect(event.id).toBe('nosema');
  });

  it('does not fire events before day 4 (grace period)', () => {
    const s = state({ day: 2, workers: 200000, capacity: 1 }); // maximally crowded but too early
    const { event } = BH.bhStepColony(s, cfg({ rand: seq([0.0, 0.0]) }));
    expect(event).toBeNull();
  });
});

describe('curriculum data — shape + accuracy regression guards', () => {
  it('SIMULATION_PARAMS carries the expected tuning knobs', () => {
    expect(BH.SIMULATION_PARAMS.foragerRatio).toBe(0.4);
    expect(BH.SIMULATION_PARAMS.baseBroodPerDay).toBe(1500);
    expect(BH.SIMULATION_PARAMS.randomEventChance).toBeGreaterThan(0);
  });

  it('BEE_SPECIES leads with Apis mellifera and has many entries', () => {
    expect(BH.BEE_SPECIES.length).toBeGreaterThan(8);
    expect(BH.BEE_SPECIES[0].scientific).toContain('Apis mellifera');
  });

  it('waggle table is internally consistent with the animated canvas (~1 km/sec, not the old 75ms/100m)', () => {
    const dist = BH.WAGGLE_DANCE_GUIDE.find((e) => e.concept === 'Distance encoding');
    expect(dist).toBeTruthy();
    expect(dist.mechanism).toContain('1 km');
    expect(dist.mechanism).not.toContain('75ms'); // the discarded, self-inconsistent figure
    // the worked math problem must agree with the 1 km/sec rule too
    const mp = BH.BEE_MATH_PROBLEMS.find((p) => /conversion rate/.test(p.problem || ''));
    expect(mp.solution).toContain('1000 m/sec');
  });

  it('bumblebee range no longer wrongly excludes "most of Asia"', () => {
    const bumble = BH.BEE_SPECIES.find((s) => /Bombus/.test(s.scientific));
    expect(bumble).toBeTruthy();
    expect(bumble.range).not.toContain('most of Asia');
    expect(bumble.range).toMatch(/Andes|temperate Asia/);
  });

  it('queen mating timing is corrected to ~day 5-10 (not 1-3 days post-emergence)', () => {
    const queen = BH.COLONY_ROLES.find((r) => r.role === 'Queen');
    expect(queen).toBeTruthy();
    expect(queen.reproduction).not.toContain('1-3 days post-emergence');
    expect(queen.reproduction).toMatch(/day 5-10|week after emerging/);
  });

  it('the buzz-pitch trivia names the correct octave (B♭ below middle C)', () => {
    const buzz = BH.BEE_TRIVIA.find((t) => /230 times per second/.test(t.fact || ''));
    expect(buzz).toBeTruthy();
    expect(buzz.fact).toContain('B♭');
    expect(buzz.fact).not.toContain('B note above middle C');
  });

  it('every exported curriculum table is a non-empty array (dead-data wiring sanity)', () => {
    const tables = ['BEE_SPECIES', 'COLONY_ROLES', 'WAGGLE_DANCE_GUIDE', 'POLLINATOR_PLANTS',
      'COLONY_THREATS', 'HONEY_VARIETALS', 'BEE_GLOSSARY', 'BEE_ANATOMY', 'BEE_MATH_PROBLEMS',
      'LAB_ACTIVITIES', 'BEE_MISCONCEPTIONS', 'ECOSYSTEM_CONNECTIONS', 'BEEKEEPING_COSTS'];
    tables.forEach((t) => {
      expect(Array.isArray(BH[t]), t + ' should be an array').toBe(true);
      expect(BH[t].length, t + ' should be non-empty').toBeGreaterThan(0);
    });
  });
});
