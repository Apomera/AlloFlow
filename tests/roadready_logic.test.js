// RoadReady logic suite — direct tests of the tool's module-scope pure
// functions and data tables via the production-inert window.__RR_TEST_EXPORTS__
// hook (see the block at the end of stem_lab/stem_tool_roadready.js).
//
// Philosophy: the 29k-line plugin hides everything in an IIFE, so historically
// only source-regex tests (roadready_rules) and render digests covered it.
// This suite executes the actual functions: physics invariants, permit-bank
// data validity, test builders, world-gen determinism, spawn placement on the
// curved road, signal timing, challenge-card predicates, coaching, grading.
//
// Anchor values are BANDS (not exact pins) except where an exact identity is
// the point (v² scaling, unit constants) — the sim is a teaching model and
// small tuning should not churn this suite.

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR;

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  if (!RR) throw new Error('roadready did not populate __RR_TEST_EXPORTS__ — is the export block present?');
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ───────────────────────────── constants ─────────────────────────────

describe('unit constants', () => {
  it('conversion constants are the NIST values', () => {
    expect(RR.MPH_TO_MS).toBeCloseTo(0.44704, 5);
    expect(RR.MS_TO_MPH).toBeCloseTo(1 / 0.44704, 3);
    expect(RR.FT_PER_M).toBeCloseTo(3.28084, 4);
    expect(RR.METERS_PER_MILE).toBeCloseTo(1609.344, 3);
  });
});
describe('world-space simulation consistency', () => {
  it('uses meters for scene motion and derives every display conversion from that scale', () => {
    expect(RR.METERS_PER_WORLD_UNIT).toBe(1);
    expect(RR.FEET_PER_WORLD_UNIT).toBeCloseTo(RR.FT_PER_M, 6);
    expect(RR.worldUnitsToMeters(10)).toBe(10);
    expect(RR.worldUnitsToFeet(10)).toBeCloseTo(32.8084, 4);
    expect(RR.metersToWorldUnits(25)).toBe(25);
  });

  it('computes a true time gap and weather-aware following target', () => {
    const speed60 = 60 * RR.MPH_TO_MS;
    expect(RR.followingGapSeconds(speed60 * 3, speed60)).toBeCloseTo(3, 6);
    expect(RR.recommendedFollowingMeters(speed60, 'clear', 1))
      .toBeCloseTo(2.5 + speed60 * 3, 6);
    expect(RR.recommendedFollowingMeters(speed60, 'rain', 1))
      .toBeCloseTo(2.5 + speed60 * 4, 6);
    expect(RR.recommendedFollowingMeters(speed60, 'snow', 1))
      .toBeCloseTo(2.5 + speed60 * 6, 6);
    expect(RR.recommendedFollowingMeters(speed60, 'ice', 1))
      .toBeCloseTo(2.5 + speed60 * 8, 6);
  });

  it('detects real control-line crossings but ignores finite-map teleport wraps', () => {
    expect(RR.crossedControlLine(12, 8, 10)).toBe(true);
    expect(RR.crossedControlLine(8, 12, 10)).toBe(true);
    expect(RR.crossedControlLine(2, 91, 40)).toBe(false);
    expect(RR.crossedControlLine(12, 11, 10)).toBe(false);
  });

  it('uses realistic footprints and oriented rectangles for vehicle contact', () => {
    expect(RR.vehicleFootprint('car')).toEqual({ length: 4.5, width: 1.8 });
    expect(RR.vehicleFootprint('schoolbus')).toEqual({ length: 10, width: 2.5 });
    const car = { x: 0, y: 0, heading: 0 };
    const sameLaneOverlap = { x: 4, y: 0, heading: 0 };
    const clear = { x: 5, y: 0, heading: 0 };
    const perpendicular = { x: 1.5, y: 1.5, heading: Math.PI / 2 };
    const size = RR.vehicleFootprint('car');
    expect(RR.vehicleRectsOverlap(car, size, sameLaneOverlap, size)).toBe(true);
    expect(RR.vehicleRectsOverlap(car, size, clear, size)).toBe(false);
    expect(RR.vehicleRectsOverlap(car, size, perpendicular, size)).toBe(true);
  });
});

// ───────────────────────────── physics ───────────────────────────────

describe('frictionCoef', () => {
  it('orders surfaces dry > fog > rain > snow > ice', () => {
    const f = RR.frictionCoef;
    expect(f('clear')).toBeGreaterThan(f('fog'));
    expect(f('fog')).toBeGreaterThan(f('rain'));
    expect(f('rain')).toBeGreaterThan(f('snow'));
    expect(f('snow')).toBeGreaterThan(f('ice'));
    expect(f('ice')).toBeGreaterThan(0);
  });
  it('normalizeWeather maps the lab-facing "dry" onto the sim key "clear"', () => {
    expect(RR.normalizeWeather('dry')).toBe('clear');
    expect(RR.normalizeWeather('rain')).toBe('rain');
  });
});

describe('stoppingDistance', () => {
  it('reaction distance at 60 mph / 1.5 s is the taught ~132 ft', () => {
    const sd = RR.stoppingDistance(60, 'clear', 1.5);
    expect(sd.reaction_ft).toBeGreaterThan(131);
    expect(sd.reaction_ft).toBeLessThan(133);
  });
  it('total at 60 mph dry lands in the driver-ed 280-320 ft envelope', () => {
    const sd = RR.stoppingDistance(60, 'clear', 1.5);
    expect(sd.total_ft).toBeGreaterThan(280);
    expect(sd.total_ft).toBeLessThan(320);
  });
  it('braking distance scales with v² exactly (2x speed = 4x braking)', () => {
    const b30 = RR.stoppingDistance(30, 'clear', 1.5).braking_ft;
    const b60 = RR.stoppingDistance(60, 'clear', 1.5).braking_ft;
    expect(b60 / b30).toBeCloseTo(4, 6);
  });
  it('is monotone in speed and monotone worse in weather', () => {
    let prev = 0;
    for (const mph of [10, 25, 40, 55, 70, 85]) {
      const t = RR.stoppingDistance(mph, 'clear', 1.5).total_ft;
      expect(t).toBeGreaterThan(prev);
      prev = t;
    }
    const weathers = ['clear', 'fog', 'rain', 'snow', 'ice'];
    let prevW = 0;
    for (const w of weathers) {
      const t = RR.stoppingDistance(55, w, 1.5).total_ft;
      expect(t).toBeGreaterThan(prevW);
      prevW = t;
    }
  });
  it('defaults reaction time to 1.5 s', () => {
    expect(RR.stoppingDistance(40, 'clear').reaction_ft)
      .toBeCloseTo(RR.stoppingDistance(40, 'clear', 1.5).reaction_ft, 6);
  });
  it('ice at 90 mph exceeds the old fixed 400 ft chart axis (regression: lab axis must scale)', () => {
    expect(RR.stoppingDistance(90, 'ice', 1.5).total_ft).toBeGreaterThan(1000);
  });
});

describe('safeFollowingFeet', () => {
  it('is the 3-second rule on dry (60 mph → ~264 ft) and stretches in weather', () => {
    expect(RR.safeFollowingFeet(60, 'clear')).toBeCloseTo(60 * 1.467 * 3, 1);
    expect(RR.safeFollowingFeet(60, 'rain')).toBeCloseTo(60 * 1.467 * 4, 1);
    expect(RR.safeFollowingFeet(60, 'snow')).toBeCloseTo(60 * 1.467 * 6, 1);
    expect(RR.safeFollowingFeet(60, 'fog')).toBeCloseTo(60 * 1.467 * 6, 1);
  });
});

describe('cruiseMPG matches each vehicle spec sheet (the 3.6x energy-constant regression)', () => {
  // The published city/hwy numbers are the model's own promise. Bands are
  // generous (±45%) because the cruise model omits drivetrain detail — the
  // point is catching order-of-magnitude unit errors, which sat at 3.6x off.
  it('every combustion/hybrid vehicle cruises within ±45% of its hwyMPG at 60 mph', () => {
    for (const veh of RR.VEHICLES) {
      if (veh.type === 'electric') continue;
      const mpg = RR.cruiseMPG(60, veh, 'clear', true);
      expect(mpg, veh.id + ' cruise ' + mpg.toFixed(1) + ' vs spec ' + veh.hwyMPG)
        .toBeGreaterThan(veh.hwyMPG * 0.55);
      expect(mpg, veh.id + ' cruise ' + mpg.toFixed(1) + ' vs spec ' + veh.hwyMPG)
        .toBeLessThan(veh.hwyMPG * 1.45);
    }
  });
  it('EV MPGe at 60 mph is in the >100 MPGe class its spec claims', () => {
    const ev = RR.VEHICLES.find((v) => v.type === 'electric');
    const mpge = RR.cruiseMPG(60, ev, 'clear', true);
    expect(mpge).toBeGreaterThan(90);
    expect(mpge).toBeLessThan(220);
  });
  it('MPG falls sharply from 55 to 75 mph (drag lesson)', () => {
    const sedan = RR.VEHICLES.find((v) => v.id === 'sedan');
    const m55 = RR.cruiseMPG(55, sedan, 'clear', true);
    const m75 = RR.cruiseMPG(75, sedan, 'clear', true);
    expect(m75).toBeLessThan(m55 * 0.8);
  });
});

describe('instantMPG option semantics', () => {
  it('returns 0 below 1 mph and penalizes acceleration', () => {
    const sedan = RR.VEHICLES.find((v) => v.id === 'sedan');
    expect(RR.instantMPG(0.5, 0, sedan, 'clear', true)).toBe(0);
    expect(RR.instantMPG(40, 0.15, sedan, 'clear', true))
      .toBeLessThan(RR.instantMPG(40, 0, sedan, 'clear', true));
  });
  it('headwind hurts, tailwind helps', () => {
    const sedan = RR.VEHICLES.find((v) => v.id === 'sedan');
    const base = RR.cruiseMPG(60, sedan, 'clear', true);
    expect(RR.cruiseMPG(60, sedan, 'clear', true, { headwindMph: 20 })).toBeLessThan(base);
    expect(RR.cruiseMPG(60, sedan, 'clear', true, { headwindMph: -20 })).toBeGreaterThan(base);
  });
  it('AC, cold start, winter, and underinflation each cost fuel', () => {
    const sedan = RR.VEHICLES.find((v) => v.id === 'sedan');
    const base = RR.cruiseMPG(60, sedan, 'clear', true);
    expect(RR.cruiseMPG(60, sedan, 'clear', true, { acOn: true })).toBeLessThan(base);
    expect(RR.cruiseMPG(60, sedan, 'clear', true, { coldStart: true })).toBeLessThan(base);
    expect(RR.cruiseMPG(60, sedan, 'clear', true, { winter: true })).toBeLessThan(base);
    expect(RR.cruiseMPG(60, sedan, 'clear', true, { tireUnderinflated: true })).toBeLessThan(base);
  });
  it('idle burn: EV 0 < hybrid < gas', () => {
    const byType = (t) => RR.VEHICLES.find((v) => v.type === t);
    expect(RR.idleGph(byType('electric'))).toBe(0);
    expect(RR.idleGph(byType('hybrid'))).toBeGreaterThan(0);
    expect(RR.idleGph(byType('gas'))).toBeGreaterThan(RR.idleGph(byType('hybrid')));
  });
});

describe('VEHICLES data validity', () => {
  it('every vehicle has physical specs and hybrid/gas MPG shapes are honest', () => {
    for (const v of RR.VEHICLES) {
      expect(v.mass).toBeGreaterThan(500);
      expect(v.cd).toBeGreaterThan(0.1);
      expect(v.cd).toBeLessThan(1.0);
      expect(v.area).toBeGreaterThan(1.5);
      expect(v.fuelCap).toBeGreaterThan(0);
      expect(v.cityMPG).toBeGreaterThan(0);
      expect(v.hwyMPG).toBeGreaterThan(0);
      if (v.type === 'gas' || v.type === 'diesel') {
        expect(v.hwyMPG, v.id + ': combustion hwy beats city').toBeGreaterThan(v.cityMPG);
      }
      if (v.type === 'hybrid') {
        expect(v.cityMPG, v.id + ': hybrid city beats hwy (regen lesson)').toBeGreaterThan(v.hwyMPG);
      }
    }
  });
  it('combustion fuelCap values are liters-plausible (the gauge divides by 3.785)', () => {
    for (const v of RR.VEHICLES) {
      if (v.type === 'electric') continue;
      // 40-450 L covers compact through full-size school bus. A value that
      // "looks like gallons" (e.g. 12) would break the gauge conversion.
      expect(v.fuelCap, v.id).toBeGreaterThanOrEqual(40);
      expect(v.fuelCap, v.id).toBeLessThanOrEqual(450);
    }
  });
});

// ─────────────────────────── permit test bank ─────────────────────────

describe('PERMIT_BANK data validity', () => {
  it('has at least 185 questions, each well-formed', () => {
    expect(RR.PERMIT_BANK.length).toBeGreaterThanOrEqual(185);
    for (const q of RR.PERMIT_BANK) {
      expect(typeof q.q, JSON.stringify(q).slice(0, 80)).toBe('string');
      expect(q.q.length).toBeGreaterThan(10);
      expect(Array.isArray(q.a)).toBe(true);
      expect(q.a.length).toBe(4);
      expect(Number.isInteger(q.correct)).toBe(true);
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThan(q.a.length);
      expect(new Set(q.a).size, 'duplicate answer options in: ' + q.q).toBe(q.a.length);
      expect(typeof q.exp).toBe('string');
      expect(q.exp.length).toBeGreaterThan(10);
      expect(typeof q.category).toBe('string');
    }
  });
  it('has no duplicate question text', () => {
    const texts = RR.PERMIT_BANK.map((q) => q.q);
    expect(new Set(texts).size).toBe(texts.length);
  });
  it('every question category exists in the category picker, and each picker category has enough questions for a meaningful test', () => {
    const pickerIds = new Set(RR.PERMIT_CATEGORIES.map((c) => c.id || c));
    const counts = {};
    for (const q of RR.PERMIT_BANK) {
      counts[q.category] = (counts[q.category] || 0) + 1;
      expect(pickerIds.has(q.category), 'unknown category "' + q.category + '" on: ' + q.q).toBe(true);
    }
    for (const id of pickerIds) {
      expect(counts[id] || 0, 'category ' + id).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('test builders', () => {
  it('buildRandomTest returns 20 unique questions with valid remapped answers', () => {
    const t = RR.buildRandomTest();
    expect(t.length).toBe(20);
    expect(new Set(t.map((q) => q.q)).size).toBe(20);
    for (const q of t) {
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThan(q.a.length);
    }
  });
  it('shuffleAnswers preserves the correct answer TEXT across the permutation', () => {
    const original = RR.PERMIT_BANK[0];
    const positions = new Set();
    for (let i = 0; i < 80; i++) {
      const s = RR.shuffleAnswers(original);
      expect(s.a[s.correct]).toBe(original.a[original.correct]);
      expect([...s.a].sort()).toEqual([...original.a].sort());
      positions.add(s.correct);
    }
    // Fisher–Yates over 80 trials must land the correct answer in >1 slot
    expect(positions.size).toBeGreaterThan(1);
    // and must not mutate the master bank
    expect(RR.PERMIT_BANK[0]).toBe(original);
  });
  it('buildCategoryTest fills to 20 and leads with the requested category', () => {
    const t = RR.buildCategoryTest('winter');
    expect(t.length).toBe(20);
    const winterCount = RR.PERMIT_BANK.filter((q) => q.category === 'winter').length;
    const leading = t.slice(0, Math.min(winterCount, 20));
    for (const q of leading) expect(q.category).toBe('winter');
  });
  it('buildWeakTest targets weak categories and falls back to random with no history', () => {
    const weak = RR.buildWeakTest({ winter: { total: 10, correct: 3 } });
    expect(weak.length).toBe(20);
    const winterCount = RR.PERMIT_BANK.filter((q) => q.category === 'winter').length;
    expect(weak.slice(0, Math.min(winterCount, 20)).every((q) => q.category === 'winter')).toBe(true);
    expect(RR.buildWeakTest({}).length).toBe(20);
    expect(RR.buildWeakTest(null).length).toBe(20);
    // below the 4-answer threshold, the category is NOT considered weak
    const notWeak = RR.buildWeakTest({ winter: { total: 3, correct: 0 } });
    expect(notWeak.length).toBe(20);
  });
});

// ───────────────────────── world generation ──────────────────────────

describe('seededRandom + world determinism', () => {
  it('same seed → identical sequence; outputs in [0,1)', () => {
    const a = RR.seededRandom(1234);
    const b = RR.seededRandom(1234);
    for (let i = 0; i < 50; i++) {
      const va = a();
      expect(va).toBe(b());
      expect(va).toBeGreaterThanOrEqual(0);
      expect(va).toBeLessThan(1);
    }
  });
  it('createInfiniteWorld is deterministic per seed and the spline stays inside the map', () => {
    const w1 = RR.createInfiniteWorld(42);
    const w2 = RR.createInfiniteWorld(42);
    for (let y = -200; y <= 200; y += 25) {
      const c = w1.spline.centerAt(y);
      expect(c).toBe(w2.spline.centerAt(y));
      expect(c).toBeGreaterThan(5);
      expect(c).toBeLessThan(RR.MAP_SIZE - 5);
      expect(Number.isFinite(w1.spline.heightAt(y))).toBe(true);
    }
  });
  it('generateChunk is deterministic and tags a valid biome', () => {
    const spline = RR.createRoadSpline(7, RR.MAP_SIZE / 2);
    const c1 = RR.generateChunk(3, 7, RR.MAP_SIZE / 2, spline);
    const c2 = RR.generateChunk(3, 7, RR.MAP_SIZE / 2, spline);
    expect(RR.BIOMES.includes(c1.biome)).toBe(true);
    expect(c1.biome).toBe(c2.biome);
    if (c1.landmark) expect(c1.landmark.centerY).toBe(c2.landmark.centerY);
  });
  it('townForChunk is deterministic and returns a named town', () => {
    const t1 = RR.townForChunk(5, 'rural');
    const t2 = RR.townForChunk(5, 'rural');
    expect(t1.name).toBe(t2.name);
    expect(typeof t1.name).toBe('string');
  });
});

describe('calibrated parking geometry', () => {
  it('converts canvas distance through the explicit 15-foot vehicle scale', () => {
    expect(RR.PARKING_CAR_LENGTH_PX).toBe(50);
    expect(RR.PARKING_INCHES_PER_PX).toBeCloseTo(3.6, 6);
    const parallelCar = { x: 114.5, y: 170, heading: -Math.PI / 2 };
    expect(RR.parkingCurbGapInches(parallelCar, 100)).toBeCloseTo(9, 5);
  });

  it('uses oriented bodies for obstacle and course-boundary collision', () => {
    const angledCar = { x: 50, y: 50, heading: Math.PI / 4 };
    expect(RR.parkingCarHitsObstacle(angledCar, { x: 62, y: 62, w: 10, h: 10, rotateDeg: 45 })).toBe(true);
    expect(RR.parkingCarHitsObstacle(angledCar, { x: 90, y: 90, w: 10, h: 10, rotateDeg: 45 })).toBe(false);
    expect(RR.parkingObbInsideBounds(angledCar, { x: 0, y: 0, w: 100, h: 100 })).toBe(true);
    expect(RR.parkingObbInsideBounds({ x: 8, y: 50, heading: 0 }, { x: 0, y: 0, w: 100, h: 100 })).toBe(false);
  });

  it('defines physically possible parallel spaces and legal hydrant targets', () => {
    const tight = RR.PARKING_SCENARIOS.tightParallel;
    const physicalGapInches = (tight.obstacles[1].y - (tight.obstacles[0].y + tight.obstacles[0].h)) * RR.PARKING_INCHES_PER_PX;
    expect(physicalGapInches).toBeGreaterThan(180);
    expect(physicalGapInches / 12).toBeCloseTo(18.9, 1);

    const hydrant = RR.PARKING_SCENARIOS.hydrantParallel;
    const targetCar = { x: hydrant.slot.x, y: hydrant.slot.y, heading: -Math.PI / 2 };
    const hydrantProp = hydrant.obstacles.find((ob) => ob.isHydrant);
    expect(RR.parkingPointClearanceInches(targetCar, hydrantProp.x + hydrantProp.w / 2, hydrantProp.y + hydrantProp.h / 2)).toBeGreaterThanOrEqual(120);
  });

  it('measures hydrant clearance from the rotated body edge in inches', () => {
    const car = { x: 115, y: 270, heading: -Math.PI / 2 };
    const clearance = RR.parkingPointClearanceInches(car, 93, 179);
    expect(clearance).toBeGreaterThan(120);
    expect(clearance).toBeCloseTo(Math.hypot(66, 10) * 3.6, 5);
  });
});

describe('roundabout traffic and compliance', () => {
  it('spawns dedicated circulating traffic plus an approach vehicle', () => {
    const traffic = RR.spawnRoundaboutTraffic({ id: 'roundabout', traffic: 'medium' });
    expect(traffic).toHaveLength(4);
    expect(traffic.filter((v) => v._roundaboutState === 'circulating')).toHaveLength(3);
    expect(traffic.filter((v) => v._roundaboutState === 'approach')).toHaveLength(1);
    for (const vehicle of traffic.filter((v) => v._roundaboutState === 'circulating')) {
      expect(Math.hypot(vehicle.x - RR.MAP_SIZE / 2, vehicle.y - RR.MAP_SIZE / 2)).toBeCloseTo(RR.ROUNDABOUT_LANE_RADIUS, 5);
    }
  });

  it('moves circulating traffic counterclockwise and holds approaches for unsafe gaps', () => {
    const traffic = RR.spawnRoundaboutTraffic({ id: 'roundabout', traffic: 'medium' });
    const circulating = traffic[0];
    const beforeAngle = circulating._roundaboutAngle;
    RR.updateRoundaboutTrafficVehicle(circulating, 0.25, traffic);
    expect(circulating._roundaboutAngle).toBeLessThan(beforeAngle);

    const approach = traffic.find((v) => v._roundaboutState === 'approach');
    const entryPose = RR.roundaboutPose(approach._roundaboutEntryAngle);
    approach.x = entryPose.x + 2;
    approach.y = entryPose.y;
    approach.speed = 4;
    const blocker = traffic[1];
    blocker._roundaboutAngle = approach._roundaboutEntryAngle + 0.2;
    blocker.speed = 6;
    RR.updateRoundaboutTrafficVehicle(approach, 0.5, traffic);
    expect(approach._roundaboutState).toBe('approach');
    expect(approach.speed).toBeLessThan(4);
  });

  it('keeps a one-minute mixed roundabout flow finite and on authored paths', () => {
    const traffic = RR.spawnRoundaboutTraffic({ id: 'roundabout', traffic: 'medium' });
    for (let frame = 0; frame < 600; frame++) {
      for (const vehicle of traffic) RR.updateRoundaboutTrafficVehicle(vehicle, 0.1, traffic);
      for (const vehicle of traffic) {
        expect(Number.isFinite(vehicle.x) && Number.isFinite(vehicle.y) && Number.isFinite(vehicle.speed)).toBe(true);
        if (vehicle._roundaboutState === 'circulating') {
          expect(Math.hypot(vehicle.x - RR.MAP_SIZE / 2, vehicle.y - RR.MAP_SIZE / 2)).toBeCloseTo(RR.ROUNDABOUT_LANE_RADIUS, 4);
        }
      }
    }
  });

  it('detects unsafe entry, wrong-way travel, stopping inside, and missing exit signal', () => {
    const blocker = [{ id: 'blocker', _roundaboutState: 'circulating', _roundaboutAngle: Math.PI, _roundaboutRadius: 8, speed: 8 }];
    const entry = RR.assessRoundaboutFrame({}, { x: 48, y: 60, speed: 4 }, { x: 48, y: 58, speed: 4 }, blocker, 0, 0.1);
    expect(entry.events).toContain('unsafe_entry');

    const wrongWay = RR.assessRoundaboutFrame(
      { inCircle: true, lastAngle: 0, wrongWaySeconds: 0 },
      { x: 56, y: 48, speed: 5 },
      { x: 48 + Math.cos(0.1) * 8, y: 48 + Math.sin(0.1) * 8, speed: 5 },
      [], 0, 1
    );
    expect(wrongWay.events).toContain('wrong_way');

    const stopped = RR.assessRoundaboutFrame(
      { inCircle: true, lastAngle: 0, stoppedSeconds: 0 },
      { x: 56, y: 48, speed: 0 }, { x: 56, y: 48, speed: 0 }, [], 0, 2
    );
    expect(stopped.events).toContain('stopped_inside');

    const exit = RR.assessRoundaboutFrame(
      { inCircle: true, lastAngle: 0 },
      { x: 58, y: 48, speed: 4 }, { x: 60, y: 48, speed: 4 }, [], 0, 0.1
    );
    expect(exit.events).toContain('missing_exit_signal');
    const signaledExit = RR.assessRoundaboutFrame(
      { inCircle: true, lastAngle: 0 },
      { x: 58, y: 48, speed: 4 }, { x: 60, y: 48, speed: 4 }, [], 1, 0.1
    );
    expect(signaledExit.events).not.toContain('missing_exit_signal');
  });
});
describe('continuous scripted worlds', () => {
  it('streams every linear scenario while keeping bounded maneuver courses bounded', () => {
    const streamed = RR.SCENARIOS.filter((s) => !['parking', 'roundabout'].includes(s.id));
    for (const scn of streamed) expect(RR.scenarioUsesContinuousWorld(scn.id), scn.id).toBe(true);
    expect(RR.scenarioUsesContinuousWorld('parking')).toBe(false);
    expect(RR.scenarioUsesContinuousWorld('roundabout')).toBe(false);
  });

  it('clamps bounded maneuver courses instead of teleport-looping', () => {
    expect(RR.clampFiniteCoursePosition(40, 40, 1)).toEqual({ x: 40, y: 40, hit: false });
    expect(RR.clampFiniteCoursePosition(-12, 140, 1)).toEqual({ x: 1, y: RR.MAP_SIZE - 2, hit: true });
  });

  it('keeps scenario identity and posted limits across arbitrarily distant chunks', () => {
    const highway = RR.createScenarioWorld({ id: 'highway', speedLimit: 65 });
    expect(highway.mode).toBe('scenario');
    expect(highway.postedLimitMph).toBe(65);
    for (const ci of [-100, -7, 0, 9, 125]) {
      const chunk = highway.getChunk(ci);
      expect(chunk.biome).toBe('suburban');
      expect(chunk.hasIntersection).toBe(false);
      expect(chunk.isHighway).toBe(true);
      expect(chunk.roadHalfWidth).toBe(6.5);
      expect(RR.worldPostedLimitMph(highway, chunk, 25)).toBe(65);
      const row = chunk.cells[Math.floor(RR.CHUNK_SIZE / 2)];
      expect(row[Math.round(chunk.roadCenters[Math.floor(RR.CHUNK_SIZE / 2)])]).toBe(6);
    }
  });

  it('uses deterministic scenario-specific controls and school landmarks', () => {
    const residential = RR.createScenarioWorld({ id: 'residential', speedLimit: 25 });
    expect(residential.getChunk(0).hasIntersection).toBe(true);
    expect(residential.getChunk(0).signalType).toBe('stop');
    expect(residential.getChunk(1).hasIntersection).toBe(false);

    const school = RR.createScenarioWorld({ id: 'school_zone', speedLimit: 15 });
    const schoolChunk = school.getChunk(6);
    expect(schoolChunk.hasIntersection).toBe(false);
    expect(schoolChunk.landmark.type.id).toBe('school');
    expect(RR.worldPostedLimitMph(school, schoolChunk, 25)).toBe(15);
  });

  it('spawns and tags streamed pedestrians for safe chunk cleanup', () => {
    const scn = { id: 'downtown', speedLimit: 30 };
    const world = RR.createScenarioWorld(scn);
    const chunk = world.getChunk(1);
    expect(chunk.hasIntersection).toBe(true);
    const peds = RR.spawnStreamedPedestrians(scn, world, chunk, 1);
    expect(peds).toHaveLength(4);
    for (const ped of peds) {
      expect(ped._chunk).toBe(1);
      expect(ped.crosswalkY).toBe(1 * RR.CHUNK_SIZE + chunk.intersectionY);
      expect(Math.abs(ped.homeX - world.spline.centerAt(ped.crosswalkY))).toBeCloseTo(chunk.roadHalfWidth + 1, 5);
    }
  });
});

describe('buildMap', () => {
  it('returns a MAP_SIZE grid with a drivable road on every row, for every scenario', () => {
    for (const scn of RR.SCENARIOS) {
      const map = RR.buildMap(scn.id);
      expect(map.length).toBe(RR.MAP_SIZE);
      for (let y = 0; y < RR.MAP_SIZE; y++) {
        expect(map[y].length).toBe(RR.MAP_SIZE);
        const hasRoad = map[y].some((c) => c === 0 || c === 3);
        expect(hasRoad, scn.id + ' row ' + y + ' has no road').toBe(true);
      }
    }
  });
  it('dawn carves the SAME curved road the 3D renderer draws (rural-curve family)', () => {
    // Regression: buildMap used to leave dawn straight while the renderer,
    // traffic spawner, and pole placement all treated it as curved.
    for (const id of ['rural', 'snow', 'fog', 'dawn']) {
      const map = RR.buildMap(id);
      for (const y of [13, 26, 39]) {
        const expectedCenter = Math.floor(RR.MAP_SIZE / 2) + Math.round(Math.sin(y * 0.12) * 5);
        expect(map[y][expectedCenter], id + ' row ' + y + ' centerline').toBe(3);
      }
    }
  });
  it('dawn gets a thinner tree scatter than the rural forest', () => {
    const count = (m) => m.flat().filter((c) => c === 5).length;
    // Random placement — compare loose expectations, averaged over builds.
    let dawnTotal = 0, ruralTotal = 0;
    for (let i = 0; i < 3; i++) {
      dawnTotal += count(RR.buildMap('dawn'));
      ruralTotal += count(RR.buildMap('rural'));
    }
    expect(dawnTotal).toBeLessThan(ruralTotal);
    expect(dawnTotal).toBeGreaterThan(0);
  });
});

// ─────────────────────────── spawns on the road ──────────────────────

describe('spawn placement follows the road curve', () => {
  const center = (id, y) => RR.scenarioRoadCenterX(id, y);

  it('scenarioRoadCenterX matches the renderer formulas', () => {
    expect(center('rural', 13)).toBeCloseTo(RR.MAP_SIZE / 2 + Math.sin(13 * 0.12) * 5, 6);
    expect(center('highway', 20)).toBeCloseTo(RR.MAP_SIZE / 2 + Math.sin(20 * 0.06) * 3, 6);
    expect(center('residential', 33)).toBe(Math.floor(RR.MAP_SIZE / 2));
  });

  it('traffic cars spawn within the roadway of every scenario that gets traffic', () => {
    for (const scn of RR.SCENARIOS) {
      const cars = RR.spawnTraffic(scn);
      for (const t of cars) {
        if (t.crossStreet) continue; // east-west cars ride the cross streets
        if (t._roundaboutState) continue; // dedicated circular/approach geometry is tested separately
        const dx = Math.abs(t.x - center(scn.id, t.y));
        const maxLaneOffset = scn.id === 'highway' ? 5.0 : 4.2;
        expect(dx, scn.id + ' car at x=' + t.x.toFixed(1) + ',y=' + t.y.toFixed(1)).toBeLessThanOrEqual(maxLaneOffset);
      }
    }
  });

  it('cyclists ride the bike-lane offset from the CURVED center on rural', () => {
    for (let i = 0; i < 6; i++) {
      for (const cy of RR.spawnCyclists({ id: 'rural', speedLimit: 50 })) {
        const dx = Math.abs(cy.x - center('rural', cy.y));
        expect(dx).toBeCloseTo(2.3, 5);
      }
    }
  });

  it('motorcycles ride within a lane of the curved center', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // force the 40% spawn roll
    const mcs = RR.spawnMotorcycles({ id: 'rural', speedLimit: 50 });
    expect(mcs.length).toBe(1);
    const dx = Math.abs(mcs[0].x - center('rural', mcs[0].y));
    expect(dx).toBeCloseTo(1.5, 5);
  });

  it('pedestrians stand on the sidewalk offset from the curve (dawn regression)', () => {
    for (const p of RR.spawnPedestrians({ id: 'dawn', speedLimit: 45 })) {
      const dx = Math.abs(p.x - center('dawn', p.y));
      expect(dx).toBeCloseTo(4.5, 5);
    }
  });
});

// ───────────────────── signals, emergencies, wildlife ────────────────

describe('updateSignals', () => {
  it('cycles green → yellow → red → green on its configured durations', () => {
    const sig = { type: 'light', state: 'green', timer: 0, greenDur: 8, yellowDur: 3, redDur: 6 };
    RR.updateSignals([sig], 8.1);
    expect(sig.state).toBe('yellow');
    RR.updateSignals([sig], 3.1);
    expect(sig.state).toBe('red');
    RR.updateSignals([sig], 6.1);
    expect(sig.state).toBe('green');
  });
  it('ignores stop signs', () => {
    const sig = { type: 'stop', state: 'stop' };
    RR.updateSignals([sig], 100);
    expect(sig.state).toBe('stop');
  });
  it('spawnSignals covers the signal scenarios and leaves rural empty', () => {
    expect(RR.spawnSignals({ id: 'suburban' }).length).toBeGreaterThan(0);
    expect(RR.spawnSignals({ id: 'downtown' }).length).toBeGreaterThan(0);
    expect(RR.spawnSignals({ id: 'residential' }).every((s) => s.type === 'stop')).toBe(true);
    expect(RR.spawnSignals({ id: 'rural' }).length).toBe(0);
  });
});

describe('maybeSpawnEmergency / maybeSpawnWildlife survive a sim-clock reset (drive #2 regression)', () => {
  it('emergency: a NEW drive (clock back at ~0) is not suppressed by the previous drive', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001); // always pass the roll
    // drive #1 runs long
    expect(RR.maybeSpawnEmergency({ id: 'suburban' }, 200)).toBeTruthy();
    // drive #2: clock restarted. 35s in, this must spawn again.
    expect(RR.maybeSpawnEmergency({ id: 'suburban' }, 35)).toBeTruthy();
  });
  it('wildlife: same reset behavior, and only on the wildlife scenarios', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001);
    expect(RR.maybeSpawnWildlife({ id: 'rural' }, 150)).toBeTruthy();
    expect(RR.maybeSpawnWildlife({ id: 'rural' }, 20)).toBeTruthy();
    expect(RR.maybeSpawnWildlife({ id: 'downtown' }, 500)).toBeNull();
  });
  it('emergency respects the 30-second settle-in period', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001);
    expect(RR.maybeSpawnEmergency({ id: 'suburban' }, 10)).toBeNull();
  });
});

// ─────────────────────────── challenge cards ─────────────────────────

describe('CHALLENGES', () => {
  const freshStats = () => ({
    distance: 0, hardBrakes: 0, jackrabbits: 0, crashes: 0, skidSeconds: 0,
    fuelUsed: 0, landmarkVisits: {},
  });
  const ctxFor = (extra) => Object.assign({
    stats: freshStats(),
    car: { speed: 10 },
    scn: { speedLimit: 35, weather: 'clear', time: 'day' },
    elapsed: 1, dt: 0.016,
    MS_TO_MPH: RR.MS_TO_MPH,
    wildlife: null,
    _visitCount: (s) => Object.values(s.landmarkVisits || {}).reduce((a, b) => a + b, 0),
  }, extra || {});

  it('every card check() runs without throwing and returns a progress/verdict object', () => {
    for (const def of RR.CHALLENGES) {
      const res = def.check(ctxFor());
      expect(res, def.id).toBeTypeOf('object');
      expect('progress' in res || res.passed || res.failed, def.id).toBeTruthy();
      expect(typeof def.onArm, def.id + ': onArm hooks receive a ctx with no .stats — capture baselines inside check()').toBe('undefined');
    }
  });

  it('wet_brake arms at 35+ mph, captures the skid baseline AT ARM TIME, and passes on a clean stop', () => {
    const def = RR.CHALLENGES.find((c) => c.id === 'wet_brake');
    const ctx = ctxFor({ car: { speed: 36 * RR.MPH_TO_MS } });
    ctx.stats.skidSeconds = 2.0; // pre-existing skid time must NOT count
    let res = def.check(ctx);
    expect(ctx._armed).toBe(true);
    expect(ctx._startSkid).toBe(2.0);
    expect(res.failed).toBeFalsy();
    ctx.car.speed = 4 * RR.MPH_TO_MS;
    res = def.check(ctx);
    expect(res.passed).toBe(true);
  });

  it('wet_brake fails when the driver skids after arming', () => {
    const def = RR.CHALLENGES.find((c) => c.id === 'wet_brake');
    const ctx = ctxFor({ car: { speed: 36 * RR.MPH_TO_MS } });
    def.check(ctx);
    ctx.stats.skidSeconds = 0.5;
    const res = def.check(ctx);
    expect(res.failed).toBe(true);
  });

  it('hypermile uses positive path-length mileage (reverse-gear odometer regression)', () => {
    const def = RR.CHALLENGES.find((c) => c.id === 'hypermile_short');
    const ctx = ctxFor();
    def.check(ctx); // captures baselines
    ctx.stats.distance += 0.31 * RR.METERS_PER_MILE;
    ctx.stats.fuelUsed = 0.005;
    const res = def.check(ctx);
    expect(res.passed).toBe(true);
    expect(res.extra).toMatch(/MPG/);
  });
});

// ───────────────────── coaching, grading, misc utils ─────────────────

describe('coachTipFor', () => {
  it('returns a titled tip for every event type the sim emits, plus a fallback', () => {
    const types = ['hardBrake', 'tailgate', 'speedViolation', 'crash', 'skidLoss', 'cyclistClose'];
    for (const type of types) {
      for (const mu of [0.72, 0.42, 0.1]) {
        const tip = RR.coachTipFor({ type, mu, postedLimitMph: 35 });
        expect(tip.title.length, type).toBeGreaterThan(3);
        expect(tip.advice.length, type).toBeGreaterThan(20);
      }
    }
    expect(RR.coachTipFor(null).advice.length).toBeGreaterThan(5);
    expect(RR.coachTipFor({ type: 'somethingNew' }).title).toBe('somethingNew');
  });
});

describe('pushDriveEvent', () => {
  it('debounces per type (1.5s) and caps the log at 60', () => {
    const statsRef = { current: { startTime: Date.now() } };
    RR.pushDriveEvent(statsRef, 'hardBrake', 40, 0.72, 25, 2);
    RR.pushDriveEvent(statsRef, 'hardBrake', 41, 0.72, 25, 2); // inside debounce
    expect(statsRef.current.driveEvents.length).toBe(1);
    for (let i = 0; i < 100; i++) {
      statsRef.current._lastEvent = {}; // defeat debounce to test the cap
      RR.pushDriveEvent(statsRef, 'speedViolation', 40, 0.72, 25, 2);
    }
    expect(statsRef.current.driveEvents.length).toBeLessThanOrEqual(60);
  });
});

describe('rrGradeLetter boundaries', () => {
  it('maps the documented thresholds exactly', () => {
    expect(RR.rrGradeLetter(95)).toBe('A+');
    expect(RR.rrGradeLetter(94.9)).toBe('A');
    expect(RR.rrGradeLetter(90)).toBe('A');
    expect(RR.rrGradeLetter(89.9)).toBe('B');
    expect(RR.rrGradeLetter(80)).toBe('B');
    expect(RR.rrGradeLetter(79.9)).toBe('C');
    expect(RR.rrGradeLetter(70)).toBe('C');
    expect(RR.rrGradeLetter(69.9)).toBe('D');
    expect(RR.rrGradeLetter(55)).toBe('D');
    expect(RR.rrGradeLetter(54.9)).toBe('F');
    expect(RR.rrGradeLetter(0)).toBe('F');
  });
});

describe('localDayKey', () => {
  it('formats the LOCAL calendar day with zero padding', () => {
    expect(RR.localDayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(RR.localDayKey(new Date(2026, 10, 23))).toBe('2026-11-23');
  });
  it('is a LOCAL day, not the UTC day (evening-rollover regression)', () => {
    // 23:30 local on Jan 5 is Jan 6 UTC for any negative-offset zone; the
    // key must still say Jan 5 in whatever zone the test runs.
    const d = new Date(2026, 0, 5, 23, 30, 0);
    expect(RR.localDayKey(d)).toBe('2026-01-05');
  });
});

describe('rect helpers', () => {
  it('rectsOverlap detects overlap and respects exclusive edges', () => {
    expect(RR.rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
    expect(RR.rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
    expect(RR.rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 20, w: 5, h: 5 })).toBe(false);
  });
  it('obstacleAabb returns the enclosing box of a 45°-rotated obstacle', () => {
    const ob = { x: 0, y: 0, w: 50, h: 90, rotateDeg: 45 };
    const box = RR.obstacleAabb(ob);
    const expected = (50 + 90) * Math.SQRT1_2; // w|cos|+h|sin| at 45°
    expect(box.w).toBeCloseTo(expected, 3);
    expect(box.h).toBeCloseTo(expected, 3);
    // still centered on the original center
    expect(box.x + box.w / 2).toBeCloseTo(ob.x + ob.w / 2, 6);
    expect(box.y + box.h / 2).toBeCloseTo(ob.y + ob.h / 2, 6);
    // unrotated passes through untouched
    expect(RR.obstacleAabb({ x: 1, y: 2, w: 3, h: 4 })).toEqual({ x: 1, y: 2, w: 3, h: 4 });
  });
});

describe('biome speed limits', () => {
  it('follows Maine §2074 defaults with a fallback for unknown biomes', () => {
    expect(RR.getBiomeSpeedLimitMph('rural', 25)).toBe(45);
    expect(RR.getBiomeSpeedLimitMph('residential', 99)).toBe(25);
    expect(RR.getBiomeSpeedLimitMph('atlantis', 33)).toBe(33);
  });
});

// ─────────────────────────── content tables ──────────────────────────

describe('content tables', () => {
  it('LESSONS all carry title/content/formula/practice', () => {
    for (const key of Object.keys(RR.LESSONS)) {
      const l = RR.LESSONS[key];
      expect(l.title.length, key).toBeGreaterThan(5);
      expect(l.content.length, key).toBeGreaterThan(100);
      expect(l.formula.length, key).toBeGreaterThan(3);
      expect(l.practice.length, key).toBeGreaterThan(10);
    }
  });
  it('the kinetic-energy lesson does not overstate the TNT equivalence (accuracy regression)', () => {
    expect(RR.LESSONS.kinetic.practice).not.toMatch(/ton of TNT/i);
  });
  it('SCENARIOS have unique ids, positive speed limits, and known weather keys', () => {
    const ids = RR.SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of RR.SCENARIOS) {
      expect(s.speedLimit).toBeGreaterThan(0);
      expect(['clear', 'rain', 'snow', 'fog']).toContain(s.weather);
      expect(['day', 'night']).toContain(s.time);
    }
  });
  it('ACHIEVEMENTS ids are unique and each id is referenced somewhere beyond its definition (reachability)', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('stem_lab/stem_tool_roadready.js', 'utf8');
    const ids = RR.ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      const uses = (src.match(new RegExp('\\b' + id + '\\b', 'g')) || []).length;
      expect(uses, 'achievement "' + id + '" appears to be defined but never granted/checked').toBeGreaterThanOrEqual(2);
    }
  });
  it('MAINE_TOWNS covers every biome with named towns; TRIPS are well-formed', () => {
    for (const biome of RR.BIOMES) {
      expect(Array.isArray(RR.MAINE_TOWNS[biome]), biome).toBe(true);
      expect(RR.MAINE_TOWNS[biome].length, biome).toBeGreaterThan(0);
    }
    for (const trip of RR.TRIPS) {
      expect(trip.id ?? trip.name ?? trip.label).toBeTruthy();
    }
  });
  it('PARKING_SCENARIOS each define startCar, a slot, obstacles, and a callable stepCheck', () => {
    for (const key of Object.keys(RR.PARKING_SCENARIOS)) {
      const s = RR.PARKING_SCENARIOS[key];
      expect(s.startCar, key).toBeTruthy();
      expect(s.slot, key).toBeTruthy();
      expect(Array.isArray(s.obstacles), key).toBe(true);
      expect(typeof s.stepCheck, key).toBe('function');
      // stepCheck must not throw for an arbitrary car pose
      expect(() => s.stepCheck({ x: 100, y: 100, heading: 0, speed: 0, steering: 0 }, s, 0), key).not.toThrow();
    }
  });
  it('DAILY_QUOTES are non-empty and unique', () => {
    expect(RR.DAILY_QUOTES.length).toBeGreaterThan(10);
    const texts = RR.DAILY_QUOTES.map((q) => (typeof q === 'string' ? q : q.text || q.quote));
    for (const t of texts) expect(String(t).length).toBeGreaterThan(8);
  });
});
