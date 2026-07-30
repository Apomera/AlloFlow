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

  it('scoreGain derives from nectar COLLECTED, while honeyGain is the change in stores', () => {
    // These were the same number until 2026-07-30, when honeyGain was found to be reporting gross
    // nectar: the UI told the player "+4.85 lb honey" every day while stores sat pinned at 0,
    // because the colony ate more than it foraged. Score still tracks foraging effort; honeyGain
    // now tracks the larder, which is what the word "gain" claims.
    const s = state();
    const { next } = BH.bhStepColony(s, cfg());
    expect(next.honeyGrossIn).toBeGreaterThanOrEqual(0);
    expect(next.scoreGain).toBe(Math.round(next.honeyGrossIn * 10));
    expect(next.honeyGain).toBeCloseTo(next.honey - s.honey, 1);
    expect(next.flowerVisits).toBeGreaterThanOrEqual(0);
  });

  it('reports gross income and consumption separately, so a hive can forage hard and still lose', () => {
    // The genuinely interesting lesson, and the one the old single number hid.
    const { next } = BH.bhStepColony(state({ day: 100, workers: 30000, honey: 40 }), cfg());
    expect(next.honeyGrossIn).toBe(0);        // winter: no foraging
    expect(next.honeyConsumed).toBeGreaterThan(0);
    expect(next.honeyGain).toBeLessThan(0);
  });

  it('is deterministic: same input + same rand sequence → identical output (kills the two-path drift)', () => {
    const a = BH.bhStepColony(state(), cfg({ rand: seq([0.0, 0.0]) }));
    const b = BH.bhStepColony(state(), cfg({ rand: seq([0.0, 0.0]) }));
    expect(a.next).toEqual(b.next);
    expect(a.event).toEqual(b.event);
  });
});

describe('bhStepColony — seasonal biology', () => {
  // Worker mortality was 0.005/day until 2026-07-30 — a 200-day summer bee, which let the
  // population run away to ~90,000. At a realistic 0.03 (about a five-week summer bee) whether a
  // colony grows depends on the BROOD-TO-ADULT RATIO, which is the real relationship and the one
  // worth pinning. Replacement needs brood ≈ workers × mortality / emergeRate, so roughly
  // 20,000 adults need ~15,000 brood just to hold steady.
  it('summer grows the worker force when brood outpaces replacement', () => {
    const s = state({ day: 45, workers: 20000, brood: 22000, varroaLevel: 3 });
    const { next } = BH.bhStepColony(s, cfg());
    expect(next.workers).toBeGreaterThan(s.workers); // emergence > mortality
  });

  it('summer SHRINKS the worker force when brood is below replacement', () => {
    // The complement, and the thing the old mortality made impossible to express: a colony can be
    // in high summer with a laying queen and still be dwindling.
    const s = state({ day: 45, workers: 20000, brood: 8000, varroaLevel: 3 });
    const { next } = BH.bhStepColony(s, cfg());
    expect(next.workers).toBeLessThan(s.workers);
  });

  it('winter halts brood production and burns honey stores (no foraging)', () => {
    const s = state({ day: 100, workers: 15000, brood: 4000, honey: 60 }); // day 100 → season 3
    const { next } = BH.bhStepColony(s, cfg());
    expect(next.honeyGrossIn).toBe(0);        // forageMult 0 → no nectar
    expect(next.honeyGain).toBeLessThan(0);   // net change: the title's "burns stores"
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

describe('bhForecastColony - management outlook', () => {
  it('is deterministic, event-free, and does not mutate the live state', () => {
    const live = state({ workers: 200000, capacity: 80 });
    const before = structuredClone(live);
    const forecastCfg = cfg({ rand: seq([0, 0, 0]) });
    const a = BH.bhForecastColony(live, forecastCfg, 7);
    const b = BH.bhForecastColony(live, forecastCfg, 7);

    expect(a).toEqual(b);
    expect(live).toEqual(before);
    expect(a.daysProjected).toBe(7);
    expect(a.timeline).toHaveLength(7);
  });

  it('projects winter honey consumption using the canonical colony stepper', () => {
    const outlook = BH.bhForecastColony(
      state({ day: 100, honey: 60, workers: 15000, brood: 4000 }),
      cfg(),
      7
    );

    expect(outlook.end.honey).toBeLessThan(60);
    expect(outlook.delta.honey).toBeLessThan(0);
  });

  it('surfaces management thresholds and caps the horizon at 30 days', () => {
    const outlook = BH.bhForecastColony(
      state({ varroaLevel: 34, diseaseRisk: 54, honey: 9 }),
      cfg(),
      90
    );
    const riskIds = outlook.risks.map((risk) => risk.id);

    expect(outlook.daysRequested).toBe(30);
    expect(outlook.status).toBe('critical');
    expect(riskIds).toContain('honey');
    expect(riskIds).toContain('varroa');
    expect(riskIds).toContain('disease');
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

// ── Realism calibration, 2026-07-30 ─────────────────────────────────────────
// A full-year probe (tests/beehive_realism_probe.test.js) found the simulation taught the
// opposite of beekeeping: honey consumption ran ~7x life so a default colony hit 0 lb by day 25
// and never recovered, running out of stores cost NOTHING (a colony sat at 0 lb through an entire
// winter and came out with 68,730 bees), worker mortality implied a 200-day summer bee so the
// population ran away to ~90,000, and varroa grew fast enough to cap the colony by day 40.
//
// These pin the corrected biology against real reference figures rather than against the
// implementation, so a future retune has to stay inside what a real hive does.
describe('bhStepColony — realism calibration', () => {
  const REAL = {
    // Strong Langstroth colony, northern climate.
    summerConsumptionPerDay: [0.4, 1.6],   // lb/day at 40,000 workers
    peakLayingPerDay: [1500, 2000],        // eggs/day at 100% queen health
    overwinterReserve: 60,                 // lb needed going into winter
  };

  it('consumes honey at roughly the rate a real colony does', () => {
    // The defect that made the game unwinnable. Measured on a summer day at 40,000 workers.
    const s = state({ day: 45, workers: 40000, brood: 20000, honey: 100 });
    const { next } = BH.bhStepColony(s, cfg());
    expect(next.honeyConsumed).toBeGreaterThanOrEqual(REAL.summerConsumptionPerDay[0]);
    expect(next.honeyConsumed).toBeLessThanOrEqual(REAL.summerConsumptionPerDay[1]);
  });

  it('keeps peak laying inside what a real queen achieves', () => {
    const P = BH.SIMULATION_PARAMS;
    // Highest seasonal brood multiplier the stepper can apply, at full queen health.
    const peak = P.baseBroodPerDay * 1.2;
    expect(peak).toBeGreaterThanOrEqual(REAL.peakLayingPerDay[0]);
    expect(peak).toBeLessThanOrEqual(REAL.peakLayingPerDay[1]);
  });

  it('implies a summer worker lifespan of weeks, not months', () => {
    // 1/mortality is the mean adult lifespan in days. A summer bee lives about five weeks; the
    // old 0.005 implied 200 days, which is what let the population reach 90,000.
    const meanLifeDays = 1 / BH.SIMULATION_PARAMS.baseWorkerMortality;
    expect(meanLifeDays).toBeGreaterThan(20);
    expect(meanLifeDays).toBeLessThan(60);
  });

  describe('starvation has consequences', () => {
    it('kills workers and costs brood when stores hit zero', () => {
      // foragingEfficiency 0 = a dearth. Empty stores alone are NOT starvation: a colony with an
      // empty larder in a good flow forages its way out, which is correct and is what the first
      // version of this test got wrong. Starvation is income failing to cover consumption.
      const s = state({ day: 45, workers: 30000, brood: 20000, honey: 0, foragingEfficiency: 0 });
      const { next } = BH.bhStepColony(s, cfg());
      expect(next.starving).toBe(true);
      expect(next.starveDeaths).toBeGreaterThan(0);
      expect(next.workers).toBeLessThan(s.workers);
      expect(next.brood).toBeLessThan(s.brood);   // brood is abandoned before adults give up
    });

    it('is far deadlier in winter, when there is nothing to forage into', () => {
      const summer = BH.bhStepColony(state({ day: 45, workers: 30000, brood: 0, honey: 0 }), cfg());
      const winter = BH.bhStepColony(state({ day: 100, workers: 30000, brood: 0, honey: 0 }), cfg());
      expect(winter.next.starveDeaths).toBeGreaterThan(summer.next.starveDeaths);
    });

    it('does NOT fire while there are stores left', () => {
      const { next } = BH.bhStepColony(state({ day: 45, workers: 30000, honey: 50 }), cfg());
      expect(next.starving).toBe(false);
      expect(next.starveDeaths).toBe(0);
    });
  });

  it('varroa actually accumulates day over day', () => {
    // Regression guard for a rounding trap: varroaLevel was stored via Math.round(), so once mite
    // growth was slowed to a realistic ~0.19/day every day's gain was truncated away and varroa
    // sat frozen forever. The old unrealistic 1.2/day was large enough to hide this.
    let s = state({ day: 45, brood: 20000, varroaLevel: 10 });
    const first = BH.bhStepColony(s, cfg()).next;
    expect(first.varroaLevel).toBeGreaterThan(10);
    for (let i = 0; i < 20; i++) s = Object.assign({}, s, BH.bhStepColony(s, cfg()).next);
    expect(s.varroaLevel).toBeGreaterThan(12);   // three weeks of brood rearing is visible
    expect(s.varroaLevel).toBeLessThan(30);      // but not a month-to-collapse cliff
  });

  it('warns about overwintering stores that would pass unremarked in spring', () => {
    // 30 lb is a working buffer in spring and a death sentence in autumn. A flat threshold cannot
    // express that, which is why the forecaster is season-aware.
    const autumn = BH.bhForecastColony(state({ day: 70, honey: 30 }), cfg(), 30);
    const spring = BH.bhForecastColony(state({ day: 10, honey: 30 }), cfg(), 30);
    expect(autumn.risks.map((r) => r.id)).toContain('honey');
    expect(spring.risks.map((r) => r.id)).not.toContain('honey');
    const detail = autumn.risks.find((r) => r.id === 'honey').detail;
    // The message must name the requirement, not just the projection — "28 lb" means nothing
    // without "against about 45 lb".
    expect(detail).toMatch(/against about \d+ lb/);
  });

  it('a default colony can actually build an overwintering reserve across a year', () => {
    // The whole point. Under the old numbers this was impossible at any setting.
    let s = state({ day: 0, workers: 20000, brood: 6000, honey: 40, varroaLevel: 3 });
    const c = cfg();
    let peak = s.honey;
    for (let i = 0; i < 90; i++) {           // spring through autumn
      s = Object.assign({}, s, BH.bhStepColony(s, c).next);
      peak = Math.max(peak, s.honey);
    }
    expect(peak).toBeGreaterThanOrEqual(REAL.overwinterReserve);
    expect(peak).toBeLessThan(260);          // and not an implausible bonanza
    expect(s.workers).toBeGreaterThan(15000);
    expect(s.workers).toBeLessThan(70000);   // real peak is 50,000-60,000
  });
});

// ── The summer dearth + harvest tension, 2026-07-30 ─────────────────────────
// A real northern nectar year is not one long season. The main flow finishes in late July and
// almost nothing blooms until goldenrod, so a colony is at its largest and hungriest exactly when
// the forage stops. Before this the sim's honey only ever rose during foraging months, so there
// was no reason to be careful about harvesting early — and harvest left a flat 15 lb in every
// season, which under realistic consumption is a winter kill the player got points for.
describe('bhStepColony — the summer dearth', () => {
  const P = () => BH.SIMULATION_PARAMS;

  it('shuts the flow off mid-summer and flags it', () => {
    const mid = Math.floor((P().dearthStartDay + P().dearthEndDay) / 2);
    const { next } = BH.bhStepColony(state({ day: mid, workers: 32000, brood: 30000, honey: 70 }), cfg());
    expect(next.inDearth).toBe(true);
    // Flower traffic must agree with the empty super; showing full foraging would contradict it.
    const flowing = BH.bhStepColony(state({ day: 40, workers: 32000, brood: 30000, honey: 70 }), cfg()).next;
    expect(next.honeyGrossIn).toBeLessThan(flowing.honeyGrossIn * 0.25);
    expect(next.flowerVisits).toBeLessThan(flowing.flowerVisits);
  });

  it('makes a big colony LOSE stores during the dearth', () => {
    // The tension. A hive at its peak population with no income goes backwards.
    const mid = Math.floor((P().dearthStartDay + P().dearthEndDay) / 2);
    const { next } = BH.bhStepColony(state({ day: mid, workers: 32000, brood: 30000, honey: 70 }), cfg());
    expect(next.honeyGain).toBeLessThan(0);
  });

  it('is over by the time goldenrod arrives', () => {
    const after = BH.bhStepColony(state({ day: P().dearthEndDay + 2, workers: 32000, honey: 70 }), cfg()).next;
    expect(after.inDearth).toBe(false);
    expect(after.honeyGrossIn).toBeGreaterThan(0);
  });

  it('leaves the year total realistic rather than just removing honey', () => {
    // A dearth that simply deleted the crop would be a different kind of wrong.
    let s = state({ day: 0, workers: 20000, brood: 6000, honey: 40, varroaLevel: 3 });
    const c = cfg();
    let peak = s.honey;
    for (let i = 0; i < 120; i++) {
      s = Object.assign({}, s, BH.bhStepColony(s, c).next);
      peak = Math.max(peak, s.honey);
    }
    expect(peak).toBeGreaterThanOrEqual(60);   // still an overwinterable crop
    expect(s.honey).toBeGreaterThan(40);       // and it survives the year with stores
  });
});

describe('harvest reserve is seasonal', () => {
  it('demands far more before winter than during buildup', () => {
    const r = BH.SIMULATION_PARAMS.seasonReserve;
    expect(Array.isArray(r)).toBe(true);
    expect(r).toHaveLength(4);
    expect(r[2]).toBeGreaterThanOrEqual(55);   // autumn: the real overwintering figure
    expect(r[2]).toBeGreaterThan(r[0]);        // and much more than spring
    // Summer must cover crossing the dearth, not just the day of the harvest.
    expect(r[1]).toBeGreaterThan(20);
  });

  it('is the same table the forecaster judges against', () => {
    // Two copies would drift, and a forecaster promising 60 lb while harvest leaves 15 is the kind
    // of contradiction that makes a simulation untrustworthy.
    const autumn = BH.bhForecastColony(state({ day: 70, honey: 30 }), cfg(), 30);
    const honeyRisk = autumn.risks.find((r) => r.id === 'honey');
    expect(honeyRisk).toBeTruthy();
    const stated = Number((honeyRisk.detail.match(/against about (\d+) lb/) || [])[1]);
    expect(BH.SIMULATION_PARAMS.seasonReserve).toContain(stated);
  });
});

// ── Winterizing, 2026-07-30 ─────────────────────────────────────────────────
// Added alongside the Split action to give the beekeeper real responses to mechanics the sim
// already had: crowding could only be answered with a super or a swarm, and winter starvation had
// no preparation move at all. Winterizing has to bite in the SIMULATION, not just in a toast —
// its first draft only nudged foragingEfficiency, which winter multiplies by zero, so it would
// have been a button that did nothing (the dead-mechanic class).
describe('bhStepColony — winterizing', () => {
  it('cuts winter honey burn and cold losses', () => {
    const base = { day: 100, workers: 20000, brood: 0, honey: 60, varroaLevel: 5 };
    const plain = BH.bhStepColony(state(base), cfg()).next;
    const wrapped = BH.bhStepColony(state(Object.assign({}, base, { winterized: true })), cfg()).next;
    expect(wrapped.honeyConsumed).toBeLessThan(plain.honeyConsumed);
    expect(wrapped.workers).toBeGreaterThan(plain.workers);
    expect(wrapped.winterized).toBe(true);
  });

  it('does nothing in summer, because wrapping a hive in June traps heat', () => {
    const base = { day: 45, workers: 20000, brood: 10000, honey: 60 };
    const plain = BH.bhStepColony(state(base), cfg()).next;
    const wrapped = BH.bhStepColony(state(Object.assign({}, base, { winterized: true })), cfg()).next;
    expect(wrapped.honeyConsumed).toBe(plain.honeyConsumed);
    expect(wrapped.winterized).toBe(false);   // the flag is set, the EFFECT is out of season
  });

  it('reduces the winter burn without replacing the need for stores', () => {
    // A wrap that let a colony winter on nothing would teach the wrong lesson.
    let s = state({ day: 90, workers: 20000, brood: 0, honey: 12, winterized: true, foragingEfficiency: 0 });
    const c = cfg();
    for (let i = 0; i < 30; i++) s = Object.assign({}, s, BH.bhStepColony(s, c).next);
    expect(s.honey).toBeLessThan(12);          // it still burns stores
  });
});

describe('honey production accounting', () => {
  it('gross income is never negative, so cumulative production cannot fall', () => {
    // totalHoney accumulates honeyGrossIn and gates the produce_honey badge. Accumulating the NET
    // change instead would make "total honey produced" drop during a dearth and un-earn the badge.
    const mid = Math.floor((BH.SIMULATION_PARAMS.dearthStartDay + BH.SIMULATION_PARAMS.dearthEndDay) / 2);
    for (const day of [10, 45, mid, 70, 100]) {
      const { next } = BH.bhStepColony(state({ day, workers: 30000, brood: 20000, honey: 50 }), cfg());
      expect(next.honeyGrossIn, 'day ' + day).toBeGreaterThanOrEqual(0);
    }
  });
});
