// SkySchool (flightSim) logic suite — direct tests of the module-scope flight
// physics + data tables via the production-inert window.__RR_TEST_EXPORTS__
// hook (block at the end of stem_lab/stem_tool_flightsim.js). Same pattern as
// tests/roadready_logic.test.js.
//
// The Physics object is SHARED MUTABLE state (the sim pokes WEIGHT/WING_AREA/
// IS_HELICOPTER/... into it per aircraft), so every test that touches it goes
// through savePhysics()/restorePhysics().

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let FS;

const PHYS_KEYS = ['G', 'RHO_SL', 'WING_AREA', 'WEIGHT', 'MAX_THRUST', 'CL_PER_AOA',
  'CL0', 'CD0', 'CD_INDUCED_K', 'IS_HELICOPTER', 'IS_DRONE', 'SPRINT_MODE',
  'MAX_SPEED_KTS', 'AGL_CEILING'];
let physSnapshot = {};

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = window.__RR_TEST_EXPORTS__ || {};
  loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  if (!FS) throw new Error('flightsim did not populate __RR_TEST_EXPORTS__ — is the export block present?');
  PHYS_KEYS.forEach((k) => { physSnapshot[k] = FS.Physics[k]; });
});

afterEach(() => {
  vi.restoreAllMocks();
  PHYS_KEYS.forEach((k) => {
    if (physSnapshot[k] === undefined) delete FS.Physics[k];
    else FS.Physics[k] = physSnapshot[k];
  });
});

const KTS_PER_FTS = 0.5924838;

function groundState(overrides) {
  return Object.assign({
    speed: 0, altitude: 0, vsi: 0, heading: 0,
    lat: 43.646, lon: -70.309,
    aoa: 0, stalling: false, onGround: true, fieldElev: 0,
  }, overrides || {});
}

function stepN(state, controls, seconds, dt) {
  dt = dt || 1 / 60;
  let s = state;
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) s = FS.Physics.step(s, dt, controls);
  return s;
}

// ───────────────────────── atmosphere + aero core ─────────────────────

describe('Physics.airDensity (ISA approximation)', () => {
  it('is sea-level density at 0 and decreases monotonically with altitude', () => {
    expect(FS.Physics.airDensity(0)).toBeCloseTo(0.002377, 6);
    let prev = Infinity;
    for (const alt of [0, 5000, 10000, 20000, 40000, 80000]) {
      const rho = FS.Physics.airDensity(alt);
      expect(rho).toBeLessThan(prev);
      expect(rho).toBeGreaterThan(0);
      prev = rho;
    }
  });
  it('never returns NaN, even above the linear model ceiling (the clamp regression)', () => {
    for (const alt of [140000, 145531, 200000, 1e7]) {
      const rho = FS.Physics.airDensity(alt);
      expect(Number.isNaN(rho), 'alt ' + alt).toBe(false);
      expect(rho).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Physics lift/drag/stall', () => {
  it('lift scales with speed² below the CL clamp', () => {
    const l50 = FS.Physics.liftForce(50, 0, 0);
    const l100 = FS.Physics.liftForce(100, 0, 0);
    expect(l100 / l50).toBeCloseTo(4, 6);
  });
  it('CL clamps at 1.6 — absurd AoA produces no more lift than the clamp point', () => {
    expect(FS.Physics.liftForce(100, 0, 30)).toBeCloseTo(FS.Physics.liftForce(100, 0, 13), 6);
  });
  it('C172 sea-level stall speed is the real-world ~48-55 kts', () => {
    const vsKts = FS.Physics.stallSpeed(0) * KTS_PER_FTS;
    expect(vsKts).toBeGreaterThan(45);
    expect(vsKts).toBeLessThan(58);
  });
  it('stall speed rises with altitude (thin-air lesson)', () => {
    expect(FS.Physics.stallSpeed(10000)).toBeGreaterThan(FS.Physics.stallSpeed(0));
  });
  it('drag rises with speed and with AoA (induced drag)', () => {
    expect(FS.Physics.dragForce(200, 0, 0)).toBeGreaterThan(FS.Physics.dragForce(100, 0, 0));
    expect(FS.Physics.dragForce(150, 0, 8)).toBeGreaterThan(FS.Physics.dragForce(150, 0, 0));
  });
});

// ───────────────────────── fixed-wing step() ──────────────────────────

describe('Physics.step — fixed wing', () => {
  it('a parked plane does NOT stall-warn (ground guard regression)', () => {
    const s = FS.Physics.step(groundState(), 1 / 60, { throttle: 0, pitch: 0, bank: 0 });
    expect(s.stalling).toBe(false);
    expect(s.onGround).toBe(true);
  });

  it('TAKEOFF IS POSSIBLE: full throttle reaches rotation speed on the runway (rolling-friction regression)', () => {
    const s = stepN(groundState(), { throttle: 1, pitch: 0, bank: 0 }, 40);
    expect(s.speed * KTS_PER_FTS).toBeGreaterThan(55);
  });

  it('throttle-off in the air bleeds speed (drag is real)', () => {
    const start = groundState({ speed: 200, altitude: 3000, onGround: false });
    const s = stepN(start, { throttle: 0, pitch: 0, bank: 0 }, 5);
    expect(s.speed).toBeLessThan(200);
  });

  it('pitching up at speed produces a climb', () => {
    const start = groundState({ speed: 200, altitude: 3000, onGround: false });
    const s = stepN(start, { throttle: 1, pitch: 8, bank: 0 }, 3);
    expect(s.vsi).toBeGreaterThan(0);
    expect(s.altitude).toBeGreaterThan(3000);
  });

  it('slow flight stalls in the air and loses altitude', () => {
    const start = groundState({ speed: 60, altitude: 3000, onGround: false });
    const s = FS.Physics.step(start, 1 / 60, { throttle: 0, pitch: 0, bank: 0 });
    expect(s.stalling).toBe(true);
  });

  it('bank turns the aircraft (right bank = heading increases)', () => {
    const start = groundState({ speed: 170, altitude: 3000, onGround: false, heading: 90 });
    const right = stepN(start, { throttle: 0.7, pitch: 0, bank: 30 }, 2);
    expect(right.heading).toBeGreaterThan(90);
    const left = stepN(start, { throttle: 0.7, pitch: 0, bank: -30 }, 2);
    expect(((left.heading - 90 + 540) % 360) - 180).toBeLessThan(0);
  });

  it('ground track follows heading: north raises lat, east raises lon', () => {
    const north = stepN(groundState({ speed: 200, altitude: 3000, onGround: false, heading: 0 }),
      { throttle: 0.7, pitch: 0, bank: 0 }, 5);
    expect(north.lat).toBeGreaterThan(43.646);
    const east = stepN(groundState({ speed: 200, altitude: 3000, onGround: false, heading: 90 }),
      { throttle: 0.7, pitch: 0, bank: 0 }, 5);
    expect(east.lon).toBeGreaterThan(-70.309);
  });

  it('altitude clamps at field elevation (Denver runway regression)', () => {
    const start = groundState({ altitude: 5431, fieldElev: 5431 });
    const s = stepN(start, { throttle: 0, pitch: 0, bank: 0 }, 2);
    expect(s.altitude).toBe(5431);
    expect(s.onGround).toBe(true);
  });

  it('Vne caps speed in knots — and SPRINT_MODE exempts the HyperJet', () => {
    FS.Physics.MAX_SPEED_KTS = 163;
    FS.Physics.SPRINT_MODE = false;
    const capped = FS.Physics.step(groundState({ speed: 500, altitude: 5000, onGround: false }),
      1 / 60, { throttle: 1, pitch: 0, bank: 0 });
    expect(capped.speed).toBeLessThanOrEqual(163 * 1.6878 + 0.001);
    FS.Physics.SPRINT_MODE = true;
    const sprint = FS.Physics.step(groundState({ speed: 500, altitude: 5000, onGround: false }),
      1 / 60, { throttle: 1, pitch: 0, bank: 0 });
    expect(sprint.speed).toBeGreaterThan(163 * 1.6878);
  });
});

// ───────────────────── helicopter + drone branches ────────────────────

describe('Physics.step — helicopter', () => {
  function heli() {
    FS.Physics.IS_HELICOPTER = true;
    FS.Physics.IS_DRONE = false;
    FS.Physics.WEIGHT = 11000;
    FS.Physics.MAX_THRUST = 13000;
    FS.Physics.MAX_SPEED_KTS = 174;
  }
  it('full collective climbs; zero collective settles to the ground', () => {
    heli();
    const up = stepN(groundState(), { throttle: 1, pitch: 0, bank: 0 }, 4);
    expect(up.altitude).toBeGreaterThan(0);
    const down = stepN(groundState({ altitude: 50, onGround: false }), { throttle: 0, pitch: 0, bank: 0 }, 20);
    expect(down.altitude).toBe(0);
  });
  it('rotor-disk pitch converts thrust into forward speed', () => {
    heli();
    const s = stepN(groundState({ altitude: 200, onGround: false }), { throttle: 1, pitch: 20, bank: 0 }, 3);
    expect(s.speed).toBeGreaterThan(0);
  });
  it('tail-rotor yaw turns without bank', () => {
    heli();
    const s = FS.Physics.step(groundState({ altitude: 200, onGround: false }), 1,
      { throttle: 0.8, pitch: 0, bank: 0, yawRate: 30 });
    expect(s.heading).toBeCloseTo(30, 0);
  });
});

describe('Physics.step — drone', () => {
  function drone() {
    FS.Physics.IS_DRONE = true;
    FS.Physics.IS_HELICOPTER = false;
    FS.Physics.WEIGHT = 2;
    FS.Physics.MAX_THRUST = 4;
    FS.Physics.MAX_SPEED_KTS = 60;
    FS.Physics.AGL_CEILING = 400;
  }
  it('FAA Part 107: hard-clamps at 400 ft AGL and raises the hitCeiling flag', () => {
    drone();
    let s = groundState({ altitude: 350, onGround: false });
    let sawCeiling = false;
    for (let i = 0; i < 600; i++) {
      s = FS.Physics.step(s, 1 / 60, { throttle: 1, pitch: 0, bank: 0 });
      if (s.hitCeiling) sawCeiling = true;
    }
    expect(s.altitude).toBeLessThanOrEqual(400);
    expect(sawCeiling).toBe(true);
  });
});

// ───────────────────────── navigation helpers ─────────────────────────

describe('haversineNm + bearing', () => {
  it('one degree along the equator is ~60 nm', () => {
    expect(FS.haversineNm(0, 0, 0, 1)).toBeCloseTo(60.04, 0);
  });
  it('identical points are 0 (no NaN from float rounding)', () => {
    expect(FS.haversineNm(43.646, -70.309, 43.646, -70.309)).toBe(0);
  });
  it('PWM→JFK is the real ~237 nm; JFK→LHR the real ~3000 nm', () => {
    const pwmJfk = FS.haversineNm(43.646, -70.309, 40.640, -73.779);
    expect(pwmJfk).toBeGreaterThan(225);
    expect(pwmJfk).toBeLessThan(250);
    const jfkLhr = FS.haversineNm(40.640, -73.779, 51.470, -0.454);
    expect(jfkLhr).toBeGreaterThan(2950);
    expect(jfkLhr).toBeLessThan(3050);
  });
  it('bearing: due north 0°, due east 90°, due south 180°', () => {
    expect(((FS.bearing(0, 0, 10, 0) % 360) + 360) % 360).toBeCloseTo(0, 0);
    expect(FS.bearing(0, 0, 0, 10)).toBeCloseTo(90, 0);
    expect(FS.bearing(0, 0, -10, 0)).toBeCloseTo(180, 0);
  });
});

describe('jetStreamTailwindKts (physics-backed jet stream)', () => {
  it('is zero at and below 20,000 ft even in the core latitude band', () => {
    expect(FS.jetStreamTailwindKts(45, 0)).toBe(0);
    expect(FS.jetStreamTailwindKts(45, 20000)).toBe(0);
  });
  it('is zero outside the 25–65° latitude shoulders at cruise altitude', () => {
    expect(FS.jetStreamTailwindKts(0, 35000)).toBe(0);   // equator
    expect(FS.jetStreamTailwindKts(24, 35000)).toBe(0);
    expect(FS.jetStreamTailwindKts(70, 35000)).toBe(0);  // polar
  });
  it('peaks at ~150 kts over 45° in the 30–45k ft band, in both hemispheres', () => {
    expect(FS.jetStreamTailwindKts(45, 35000)).toBeCloseTo(150, 5);
    expect(FS.jetStreamTailwindKts(-45, 35000)).toBeCloseTo(150, 5);
    expect(FS.jetStreamTailwindKts(45, 30000)).toBeCloseTo(150, 5);
    expect(FS.jetStreamTailwindKts(45, 45000)).toBeCloseTo(150, 5);
  });
  it('ramps in between 20k and 30k ft and fades above 45k ft', () => {
    expect(FS.jetStreamTailwindKts(45, 25000)).toBeCloseTo(75, 5);
    const high = FS.jetStreamTailwindKts(45, 52500);
    expect(high).toBeGreaterThan(0);
    expect(high).toBeLessThan(150);
    expect(FS.jetStreamTailwindKts(45, 60000)).toBe(0);
  });
  it('weakens toward the shoulders and never goes negative', () => {
    const core = FS.jetStreamTailwindKts(45, 35000);
    const edge = FS.jetStreamTailwindKts(60, 35000);
    expect(edge).toBeGreaterThan(0);
    expect(edge).toBeLessThan(core);
    for (let lat = -90; lat <= 90; lat += 5) {
      expect(FS.jetStreamTailwindKts(lat, 35000)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('composeGroundSpeedKts (TAS + wind + jet → GS)', () => {
  it('with no wind and no jet, GS equals TAS on any heading', () => {
    expect(FS.composeGroundSpeedKts(0, 120, 0, 0, 0)).toBeCloseTo(120, 6);
    expect(FS.composeGroundSpeedKts(237, 120, 0, 0, 0)).toBeCloseTo(120, 6);
  });
  it('pure headwind subtracts, pure tailwind adds (met FROM convention)', () => {
    // Flying north (000) into wind FROM the north = headwind
    expect(FS.composeGroundSpeedKts(0, 120, 20, 0, 0)).toBeCloseTo(100, 6);
    // Flying north with wind FROM the south = tailwind
    expect(FS.composeGroundSpeedKts(0, 120, 20, 180, 0)).toBeCloseTo(140, 6);
  });
  it('jet stream adds eastbound and subtracts westbound', () => {
    expect(FS.composeGroundSpeedKts(90, 400, 0, 0, 150)).toBeCloseTo(550, 6);
    expect(FS.composeGroundSpeedKts(270, 400, 0, 0, 150)).toBeCloseTo(250, 6);
    // Flying north across the jet: GS = hypot(400, 150) ≈ 427 (drift, not push)
    expect(FS.composeGroundSpeedKts(0, 400, 0, 0, 150)).toBeCloseTo(Math.hypot(400, 150), 4);
  });
  it('direct crosswind changes GS only quadratically (small for light winds)', () => {
    const gs = FS.composeGroundSpeedKts(0, 120, 15, 90, 0); // wind FROM the east, flying north
    expect(gs).toBeCloseTo(Math.hypot(120, 15), 4);
  });
});

describe('pushTrackPoint (minimap breadcrumb sampler)', () => {
  it('records the first point and points spaced ≥ minNm', () => {
    const trail = [];
    expect(FS.pushTrackPoint(trail, 43.0, -70.0, 0)).toBe(true);
    // 0.1° lat ≈ 6 nm — well past the 0.08 nm default spacing
    expect(FS.pushTrackPoint(trail, 43.1, -70.0, 1)).toBe(true);
    expect(trail).toHaveLength(2);
  });
  it('skips points closer than minNm until maxGapSec elapses', () => {
    const trail = [];
    FS.pushTrackPoint(trail, 43.0, -70.0, 0);
    // ~0.0006 nm away, 1 s later → too close, too soon
    expect(FS.pushTrackPoint(trail, 43.00001, -70.0, 1)).toBe(false);
    // Same tiny offset but 6 s later → time-gated point IS recorded
    expect(FS.pushTrackPoint(trail, 43.0001, -70.0, 6)).toBe(true);
    expect(trail).toHaveLength(2);
  });
  it('never records a parked/identical position, even after a long gap', () => {
    const trail = [];
    FS.pushTrackPoint(trail, 43.0, -70.0, 0);
    expect(FS.pushTrackPoint(trail, 43.0, -70.0, 600)).toBe(false);
    expect(trail).toHaveLength(1);
  });
  it('caps the trail by evicting the oldest points', () => {
    const trail = [];
    for (let i = 0; i < 30; i++) FS.pushTrackPoint(trail, 43 + i * 0.1, -70, i, { cap: 10 });
    expect(trail).toHaveLength(10);
    expect(trail[0].lat).toBeCloseTo(43 + 20 * 0.1, 6); // oldest 20 evicted
    expect(trail[9].lat).toBeCloseTo(43 + 29 * 0.1, 6);
  });
});

// ───────────────────────────── data tables ────────────────────────────

describe('WAYPOINTS', () => {
  it('valid coords, unique ids/codes, real field elevations', () => {
    const ids = new Set(), codes = new Set();
    for (const wp of FS.WAYPOINTS) {
      expect(Math.abs(wp.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(wp.lon)).toBeLessThanOrEqual(180);
      expect(wp.alt).toBeGreaterThanOrEqual(0);
      ids.add(wp.id); codes.add(wp.code);
    }
    expect(ids.size).toBe(FS.WAYPOINTS.length);
    expect(codes.size).toBe(FS.WAYPOINTS.length);
    expect(FS.WAYPOINTS.find((w) => w.code === 'DEN').alt).toBe(5431);
  });
});

describe('GEO_PLACES + SPRINT_ROUTES cross-reference', () => {
  it('places have valid coords and UNIQUE names (discovery + sprints key on name)', () => {
    const names = FS.GEO_PLACES.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
    for (const p of FS.GEO_PLACES) {
      expect(Math.abs(p.lat), p.name).toBeLessThanOrEqual(90);
      expect(Math.abs(p.lon), p.name).toBeLessThanOrEqual(180);
      expect(p.fact.length, p.name).toBeGreaterThan(20);
    }
  });
  it('EVERY sprint-route stop exists in GEO_PLACES (a typo strands the sprint)', () => {
    const names = new Set(FS.GEO_PLACES.map((p) => p.name));
    for (const route of FS.SPRINT_ROUTES) {
      for (const stop of route.places) {
        expect(names.has(stop), route.id + ' references unknown place "' + stop + '"').toBe(true);
      }
      expect(route.speed).toBeGreaterThan(0);
    }
  });
});

describe('AIRCRAFT + CHALLENGES', () => {
  it('aircraft specs are physical and unit-sane (maxSpeed in KNOTS)', () => {
    for (const a of FS.AIRCRAFT) {
      expect(a.weight, a.id).toBeGreaterThan(0);
      expect(a.wingArea, a.id).toBeGreaterThan(0);
      expect(a.maxSpeed, a.id).toBeGreaterThanOrEqual(50);
      expect(a.maxSpeed, a.id).toBeLessThanOrEqual(2000);
      expect(a.maxThrust, a.id).toBeGreaterThanOrEqual(0);
    }
    const heli = FS.AIRCRAFT.find((a) => a.isHelicopter);
    expect(heli.maxThrust, 'a helicopter must out-thrust its weight to hover').toBeGreaterThan(heli.weight);
    const glider = FS.AIRCRAFT.find((a) => a.id === 'glider');
    expect(glider.maxThrust).toBe(0);
  });
  it('challenge aircraft requirements and lesson links resolve', () => {
    const acIds = new Set(FS.AIRCRAFT.map((a) => a.id));
    for (const c of FS.CHALLENGES) {
      if (c.requiresAircraft) expect(acIds.has(c.requiresAircraft), c.id).toBe(true);
      expect(FS.LESSONS[c.lesson], c.id + ' lesson link').toBeTruthy();
      expect(c.goals.length, c.id).toBeGreaterThan(0);
    }
  });
});

describe('ACHIEVEMENTS', () => {
  const baseState = { speed: 0, altitude: 0, onGround: true };
  const baseExtra = { butterLanding: false, isNight: false, discovered: 0, airports: 0, quizScore: 0, perfectSprint: false, oceanCrossing: false, rescuesCompleted: 0 };
  it('unique ids; every check() runs without throwing on a baseline state and does NOT fire', () => {
    const ids = new Set(FS.ACHIEVEMENTS.map((a) => a.id));
    expect(ids.size).toBe(FS.ACHIEVEMENTS.length);
    for (const a of FS.ACHIEVEMENTS) {
      expect(a.check(baseState, baseExtra), a.id + ' fired on a parked plane').toBeFalsy();
    }
  });
  it('each achievement fires under its intended condition', () => {
    const fire = (id, state, extra) => FS.ACHIEVEMENTS.find((a) => a.id === id)
      .check(Object.assign({}, baseState, state), Object.assign({}, baseExtra, extra));
    expect(fire('first_takeoff', { onGround: false, altitude: 200 })).toBeTruthy();
    expect(fire('mile_high', { altitude: 5280 })).toBeTruthy();
    expect(fire('speed100', { speed: 101 / KTS_PER_FTS })).toBeTruthy();
    expect(fire('speed_sound', { speed: 662 / KTS_PER_FTS })).toBeTruthy();
    expect(fire('butter_landing', {}, { butterLanding: true })).toBeTruthy();
    expect(fire('night_flight', { altitude: 1500 }, { isNight: true })).toBeTruthy();
    expect(fire('geo_5', {}, { discovered: 5 })).toBeTruthy();
    expect(fire('airports_all', {}, { airports: 10 })).toBeTruthy();
    expect(fire('quiz_10', {}, { quizScore: 10 })).toBeTruthy();
    expect(fire('cross_ocean', {}, { oceanCrossing: true })).toBeTruthy();
    expect(fire('rescue_one', {}, { rescuesCompleted: 1 })).toBeTruthy();
  });
});

describe('quiz banks', () => {
  it('FLIGHT_QUIZ (+extended): correct answer is one of the options; no duplicate questions', () => {
    const all = FS.FLIGHT_QUIZ.concat(FS.FLIGHT_QUIZ_EXTENDED);
    const texts = all.map((q) => q.question);
    expect(new Set(texts).size).toBe(texts.length);
    for (const q of all) {
      expect(q.options.length, q.question).toBeGreaterThanOrEqual(3);
      expect(q.options, q.question).toContain(q.correct);
      expect(new Set(q.options).size, q.question).toBe(q.options.length);
      expect((q.explanation || '').length, q.question).toBeGreaterThan(10);
    }
  });
  it('ATC scenarios all teach a situation + radio call', () => {
    for (const s of FS.ATC_QUIZ_SCENARIOS) {
      expect(s.situation.length).toBeGreaterThan(20);
      expect(s.whatToSay.length).toBeGreaterThan(10);
    }
  });
});

describe('misc tables', () => {
  it('WORLD_LABELS have valid anchors and altitudes', () => {
    for (const l of FS.WORLD_LABELS) {
      expect(Math.abs(l.lat), l.name).toBeLessThanOrEqual(90);
      expect(Math.abs(l.lon), l.name).toBeLessThanOrEqual(180);
      expect(l.minAlt, l.name).toBeGreaterThan(0);
    }
  });
  it('LESSONS carry title/content/formula; PREFLIGHT_CHECKLIST + presets + glossary + layers are populated', () => {
    for (const key of Object.keys(FS.LESSONS)) {
      expect(FS.LESSONS[key].title.length, key).toBeGreaterThan(5);
      expect(FS.LESSONS[key].content.length, key).toBeGreaterThan(80);
      expect(FS.LESSONS[key].formula.length, key).toBeGreaterThan(2);
    }
    expect(FS.PREFLIGHT_CHECKLIST.length).toBeGreaterThan(3);
    expect(FS.FORCE_CALCULATOR_PRESETS.length).toBeGreaterThan(2);
    expect(FS.AVIATION_GLOSSARY.length).toBeGreaterThan(10);
    expect(FS.ATMOSPHERE_LAYERS.length).toBeGreaterThan(3);
  });
});
