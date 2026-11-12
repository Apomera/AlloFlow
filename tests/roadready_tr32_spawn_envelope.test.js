import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 32, traffic lane (tr32), item 1: nothing appears inside the learner's stopping distance.
// Play-through: a cyclist appeared 12 m straight ahead, in the learner's lane, twice.
// The distances below are never typed in: they come from the tool's own stoppingDistance().

const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(TOOL, 'utf8');
let RR;
const cut = (from, to) => {
  const a = src.indexOf(from), b = src.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error('cannot find ' + from);
  return src.slice(a, b);
};
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});
const stopMeters = (mph, weather) => RR.stoppingDistance(mph, weather).total_ft / RR.FT_PER_M;
let wildlifeClock = 500;
const straightWorld = (profile) => ({ profile, chunks: {}, getChunk: () => profile, spline: { centerAt: () => 48, headingAt: () => 0, heightAt: () => 0 } });

describe('Road Ready tr32: the spawn envelope is the tool\'s stopping distance plus a margin', () => {
  it('envelope = stoppingDistance(speed, weather) + 10 m, for the faster of the car\'s speed and the posted limit', () => {
    for (const weather of ['clear', 'rain', 'fog', 'snow']) for (const mph of [0, 15, 25, 35, 45, 55, 65]) {
      const v = mph * RR.MPH_TO_MS;
      expect(RR.rrSpawnEnvelopeMeters(v, weather, 0)).toBeCloseTo(stopMeters(mph, weather) + RR.RR_SPAWN_MARGIN_METERS, 2);
      // a car waiting at a stop sign in a 45 zone still gets the 45 mph envelope
      expect(RR.rrSpawnEnvelopeMeters(0, weather, 45)).toBeCloseTo(stopMeters(45, weather) + 10, 2);
      const ahead = RR.rrSpawnAheadMinMeters(v, weather, mph, 0);
      expect(ahead).toBeGreaterThanOrEqual(stopMeters(mph, weather) + 10 - 1e-9);
      expect(ahead).toBeGreaterThanOrEqual(64); // past the next chunk of road
      // an oncoming actor also covers ground while the learner reacts (1.5 s)
      expect(RR.rrSpawnAheadMinMeters(v, weather, mph, 12)).toBeGreaterThanOrEqual(stopMeters(mph, weather) + 10 + 18 - 1e-9);
    }
    expect(RR.RR_SPAWN_AHEAD_FLOOR_METERS).toBe(2 * RR.CHUNK_SIZE);
  });

  it('a recycled actor goes ahead beyond the minimum or at least 24 m behind, and is kept until one chunk past its band', () => {
    for (let i = 0; i <= 20; i++) for (let j = 0; j <= 20; j++) {
      const place = RR.rrRecyclePlacement(70, i / 20, j / 20);
      if (place.side > 0) { expect(place.distance).toBeGreaterThanOrEqual(70); expect(place.distance).toBeLessThanOrEqual(70 + RR.CHUNK_SIZE); }
      else { expect(place.distance).toBeGreaterThanOrEqual(24); expect(place.distance).toBeLessThanOrEqual(RR.MAP_SIZE * 0.6); }
    }
    expect(RR.rrRecycleAheadRangeMeters(70)).toBeGreaterThan(70 + RR.CHUNK_SIZE);
    expect(RR.rrRecycleAheadRangeMeters(0)).toBeGreaterThanOrEqual(RR.MAP_SIZE * 0.6);
    // the streamed road is built 8 chunks ahead: the band for 65 mph on a dry road is inside it
    expect(RR.rrRecycleAheadRangeMeters(RR.rrSpawnAheadMinMeters(65 * RR.MPH_TO_MS, 'clear', 65, 65 * RR.MPH_TO_MS))).toBeLessThan(RR.RR_STREAM_CHUNKS_AHEAD * RR.CHUNK_SIZE);
  });
});

describe('Road Ready tr32: AI cars are recycled outside the envelope (updateTraffic)', () => {
  it.each([[0, 'clear', 25], [11, 'clear', 25], [20, 'clear', 45], [15.6, 'snow', 35], [29, 'clear', 65]])(
    'learner at %s m/s, %s, limit %s: 300 recycles, none ahead inside the envelope, none within 24 m behind', (speed, weather, limit) => {
      const make = new Function('scope', 'with(scope) {' + cut('        var updateTraffic = function(dt) {', '        var updateWildlife = function(dt)') + '\nreturn updateTraffic;}');
      const profile = { roadHalfWidth: 3.5, lanes: 2 };
      const world = straightWorld(profile);
      const car = { x: 49.6, y: 1000, heading: -Math.PI / 2, speed };
      const aheadSeen = [], behindSeen = [];
      for (let n = 0; n < 300; n++) {
        const oncoming = n % 2 === 0;
        const actor = { ...RR.mainRoadWorldPoint(world, 1000 + (n % 3 === 0 ? 70 : -260), oncoming ? -1.6 : 1.6), heading: oncoming ? Math.PI / 2 : -Math.PI / 2,
          type: 'car', id: 'a' + n, laneOffset: oncoming ? -1.6 : 1.6, speed: 9, personality: { followMult: 1, speedBias: 1, aggro: 0, rollsStops: 0 } };
        const scope = { ...RR, RR_CURB_YIELD_HOLD_MAX: 4, trafficRef: { current: [actor] }, infiniteWorldRef: { current: world },
          currentScenario: { id: 'rural', speedLimit: limit, weather }, currentVehicle: { id: 'sedan' }, carRef: { current: car },
          pedsRef: { current: [] }, signalsRef: { current: [] }, cyclistsRef: { current: [] }, emergencyRef: { current: null },
          statsRef: { current: { safetyScore: 100, crashes: 0 } }, timeRef: { current: 30 }, stopSignQueueRef: { current: {} }, intersectionReservationRef: { current: {} },
          blackBoxRef: { current: [] }, addToast() {}, speak() {}, audioRef: { current: {} }, eventToastRef: { current: null } };
        make(scope)(1 / 30);
        expect(String(actor.id)).toMatch(/^respawn_/); // it was far out of range, so it was recycled
        const ahead = (1000 - actor._roadStation); // the learner travels toward smaller stations
        if (ahead > 0) aheadSeen.push({ ahead, need: RR.rrSpawnAheadMinMeters(speed, weather, limit, Math.sin(actor.heading) > 0 ? limit * RR.MPH_TO_MS : 0) });
        else behindSeen.push(-ahead);
      }
      expect(aheadSeen.length).toBeGreaterThan(60);
      expect(behindSeen.length).toBeGreaterThan(60);
      for (const s of aheadSeen) {
        expect(s.ahead).toBeGreaterThanOrEqual(s.need - 1e-6);
        expect(s.ahead).toBeGreaterThanOrEqual(stopMeters(Math.max(speed * RR.MS_TO_MPH, limit), weather) + 10 - 1e-6);
      }
      expect(Math.min(...behindSeen)).toBeGreaterThanOrEqual(RR.RR_SPAWN_BEHIND_MIN_METERS - 1e-6);
    });
});

describe('Road Ready tr32: riders are recycled outside the envelope and ride at the road edge (updateCyclists)', () => {
  const riderScene = (speed, riderDir, startOffset) => {
    const profile = { lanes: 2, roadHalfWidth: 3.5 };
    const world = straightWorld(profile);
    const lane = RR.vulnerableRoadUserLaneOffset(profile, 'cyclist', riderDir, 0);
    const rider = { ...RR.mainRoadWorldPoint(world, 1000 + startOffset, lane), heading: riderDir * Math.PI / 2, type: 'cyclist', speed: 6, _cruiseSpeed: 6, _roadStation: 1000 + startOffset, _bikeLane: lane };
    const scope = { ...RR, MAP_SIZE: 96, RR_CURB_YIELD_HOLD_MAX: 4, currentVehicle: { id: 'sedan' }, currentScenario: { id: 'residential', weather: 'clear', speedLimit: 25 },
      infiniteWorldRef: { current: world }, cyclistsRef: { current: [rider] }, trafficRef: { current: [] }, signalsRef: { current: [] }, pedsRef: { current: [] },
      emergencyRef: { current: null }, wildlifeRef: { current: null }, carRef: { current: { ...RR.mainRoadWorldPoint(world, 1000, 1.6), heading: -Math.PI / 2, speed } },
      timeRef: { current: 20 }, statsRef: { current: { safetyScore: 100, crashes: 0 } } };
    const update = new Function('scope', 'with(scope){' + cut('        var updateCyclists = function(dt) {', '        // ── Bus stop-arm compliance') + '\nreturn updateCyclists;}')(scope);
    return { rider, scope, update };
  };

  it('400 recycles at 25 mph: a rider never appears ahead inside the envelope (the play-through saw 12 m)', () => {
    const speed = 25 * RR.MPH_TO_MS;
    let nearestAhead = Infinity, nearestBehind = Infinity, aheadCount = 0;
    for (let n = 0; n < 400; n++) {
      const dir = n % 2 === 0 ? -1 : 1;
      const s = riderScene(speed, dir, 120); // far behind the learner: out of range
      s.update(1 / 30);
      const ahead = 1000 - s.rider._roadStation;
      expect(Math.abs(ahead)).not.toBeCloseTo(120, 3); // it was recycled
      if (ahead > 0) { aheadCount++; nearestAhead = Math.min(nearestAhead, ahead); expect(ahead).toBeGreaterThanOrEqual(RR.rrSpawnAheadMinMeters(speed, 'clear', 25, dir > 0 ? 6 : 0) - 1e-6); }
      else nearestBehind = Math.min(nearestBehind, -ahead);
    }
    expect(aheadCount).toBeGreaterThan(100);
    expect(nearestAhead).toBeGreaterThanOrEqual(64);
    expect(nearestAhead).toBeGreaterThan(stopMeters(25, 'clear') + 10);
    expect(nearestBehind).toBeGreaterThanOrEqual(24 - 1e-6);
  });

  it('a rider ahead of the learner stays in play out to the recycle range (it is not snatched away at 58 m)', () => {
    const speed = 25 * RR.MPH_TO_MS;
    const s = riderScene(speed, -1, -80); // 80 m ahead, riding the learner's way
    s.update(1 / 30);
    expect(1000 - s.rider._roadStation).toBeGreaterThan(79);
    expect(1000 - s.rider._roadStation).toBeLessThan(81);
  });

  it('riders keep to the paved shoulder outside the white edge line: a lane-centred car does not touch them, but passes closer than 3 ft', () => {
    for (const profile of [{ roadHalfWidth: 3.5 }, { roadHalfWidth: 4.5 }, { roadHalfWidth: 6.5, lanesPerDirection: 2 }]) {
      const layout = RR.roadLayoutFor(profile);
      const riderSize = RR.vulnerableRoadUserFootprint({ type: 'cyclist' });
      const riderAt = RR.bicycleLaneOffsetFor(profile, -1);
      expect(RR.bicycleLaneOffsetFor(profile, 1)).toBeCloseTo(-riderAt, 9);
      expect(riderAt - riderSize.width / 2).toBeGreaterThanOrEqual(layout.edgeLineOffset - 1e-9); // not in the travel lane
      expect(riderAt + riderSize.width / 2).toBeLessThanOrEqual(layout.pavedHalfWidth); // still on pavement
      const carSize = RR.vehicleFootprint('sedan');
      const laneCentre = layout.laneCenters[layout.laneCenters.length - 1];
      const car = { x: laneCentre, y: 0, heading: -Math.PI / 2 }, rider = { x: riderAt, y: 0, heading: -Math.PI / 2 };
      expect(RR.vehicleRectsOverlap(car, carSize, rider, riderSize)).toBe(false);
      const clearanceFt = RR.worldUnitsToFeet(RR.vehicleSideClearance(car, carSize, rider, riderSize));
      expect(clearanceFt).toBeGreaterThan(1.5);
      if (profile.roadHalfWidth !== 4.5) expect(clearanceFt).toBeLessThan(3); // (a 4.2 m lane leaves 4 ft) the learner has to move left to leave 3 ft (29-A section 2070(1-A))
      // moved left by half a metre, still inside the lane, the pass is legal
      const moved = { x: laneCentre - 0.5, y: 0, heading: -Math.PI / 2 };
      expect(RR.worldUnitsToFeet(RR.vehicleSideClearance(moved, carSize, rider, riderSize))).toBeGreaterThan(3);
      expect(laneCentre - 0.5 - carSize.width / 2).toBeGreaterThan(0);
    }
  });

  it('at the start of a drive a rider ahead of the learner is at least 40 m away (was 8 m, pushed to 12 m)', () => {
    expect(RR.RR_START_RIDER_AHEAD_METERS).toBe(40);
    const start = cut('        // Riders are frozen during the safety scan.', '        statsRef.current = { startTime: Date.now()');
    expect(start).toContain('var riderAheadFloor = safeStartWorld && riderStationDelta * safeStartPlayerDirection > 0 ? RR_START_RIDER_AHEAD_METERS : 0;');
    expect(start).toContain('if (riderAheadFloor) safeStartPushActor(cy, riderAheadFloor, riderAheadFloor);');
  });
});

describe('Road Ready tr32: roadside hazards may be sudden, but a stop is always possible', () => {
  it('the old three-second lead was shorter than the tool\'s stopping distance from 51 mph dry, 32 mph in rain, 17 mph in snow', () => {
    const oldLead = (mph) => Math.max(18, Math.min(70, mph * RR.MPH_TO_MS * 3.2));
    const firstShort = (weather) => { for (let mph = 1; mph <= 80; mph++) if (oldLead(mph) < stopMeters(mph, weather)) return mph; return null; };
    expect(firstShort('clear')).toBe(51);
    expect(firstShort('rain')).toBe(32);
    expect(firstShort('snow')).toBe(17);
  });

  it('rrRoadsideHazardMinMeters = stopping distance from the car\'s speed (capped at the limit) + 5 m of bodies', () => {
    for (const weather of ['clear', 'rain', 'fog', 'snow']) for (const limit of [25, 35, 45, 50]) for (let mph = 0; mph <= limit + 20; mph += 5) {
      const need = RR.rrRoadsideHazardMinMeters(mph * RR.MPH_TO_MS, weather, limit);
      expect(need).toBeCloseTo(stopMeters(Math.min(mph, limit), weather) + RR.RR_ROADSIDE_HAZARD_BODY_METERS, 2);
    }
    expect(RR.rrRoadsideHazardMinMeters(20, 'clear', 0)).toBeCloseTo(stopMeters(20 * RR.MS_TO_MPH, 'clear') + 5, 2); // no limit given: the real speed
  });

  it.each([['snow', 35, 35], ['snow', 35, 20], ['rural', 50, 50], ['dawn', 45, 45], ['fog', 30, 30], ['rural', 50, 62]])(
    'the real updateWildlife in %s (limit %s) at %s mph: the animal starts beyond the stopping distance, off the pavement', (id, limit, mph) => {
      const weather = id === 'snow' ? 'snow' : id === 'fog' ? 'fog' : 'clear';
      const profile = { roadHalfWidth: 3.5 };
      const world = straightWorld(profile);
      const car = { ...RR.mainRoadWorldPoint(world, 1000, 1.6), heading: -Math.PI / 2, speed: mph * RR.MPH_TO_MS };
      const scope = { ...RR, wildlifeRef: { current: null }, carRef: { current: car }, currentScenario: { id, weather, speedLimit: limit },
        infiniteWorldRef: { current: world }, timeRef: { current: 100 + Math.random() }, statsRef: { current: { safetyScore: 100 } },
        rideAlongRef: { current: false }, showDriveAlert() {}, speak() {}, addToast() {}, eventToastRef: { current: null }, currentVehicle: { id: 'sedan' },
        __alloT: (key, fallback) => fallback };
      const update = new Function('scope', 'with(scope) {' + cut('        var updateWildlife = function(dt) {', '        var updateEmergency = function(dt) {') + '\nreturn updateWildlife;}')(scope);
      const random = vi.spyOn(Math, 'random').mockReturnValue(0.001);
      wildlifeClock += 5; scope.timeRef.current = wildlifeClock;
      try { update(1 / 30); } finally { random.mockRestore(); }
      const animal = scope.wildlifeRef.current;
      expect(animal, 'an animal was spawned').toBeTruthy();
      const ahead = 1000 - animal._roadStation;
      // a stop from the car's speed (the limit, for a driver over it) at the tool's 1.5 s reaction time fits in the distance
      expect(ahead).toBeGreaterThanOrEqual(stopMeters(Math.min(mph, limit), weather) + 5 - 1e-6);
      expect(Math.abs(RR.mainRoadLocalPoint(world, animal.x, animal.y).lateral)).toBeGreaterThan(RR.roadLayoutFor(profile).pavedHalfWidth);
    });

  it('landmark events (ball, pedestrian, tractor) start only while the landmark is still beyond the stopping distance', () => {
    const block = cut('          // ─── LANDMARK-TRIGGERED EVENTS ───', '          // Update stats');
    expect(block).toContain('var landmarkEventNeed = rrRoadsideHazardMinMeters(car.speed, scn.weather, scn.speedLimit);');
    expect(block).toContain('if (elmAhead < Math.max(landmarkEventLead, landmarkEventNeed + 12) && elmAhead > Math.max(12, landmarkEventNeed)) {');
    expect(block).not.toContain('if (elmAhead < landmarkEventLead && elmAhead > 12) {');
    // the old window opened at 12 m; the stopping distance passes 12 m at 14 mph
    let first = null; for (let mph = 1; mph < 40 && first == null; mph++) if (stopMeters(mph, 'clear') > 12) first = mph;
    expect(first).toBe(14);
  });

  it('school bus: lights that come on inside the stopping distance are not scored, and no child runs out in front of a car that cannot stop', () => {
    const block = cut('        var checkBusCompliance = function() {', '        var checkPedestrianYield = function() {');
    expect(block).toContain('bus._busTooLate = busAhead > 0 && busAhead < rrRoadsideHazardMinMeters(car.speed, currentScenario.weather, 0);');
    expect(block).toContain('if (bus._busTooLate) { bus._busCompArmed = false; bus._playerBusPreviousAhead = busAhead; continue; }');
    expect(block).toContain('if (Math.random() < 0.5 && busAhead >= rrRoadsideHazardMinMeters(');
    // run it: lights on with the bus 12 m ahead at 25 mph (stopping distance 25.6 m): passing is not a violation
    const world = straightWorld({ roadHalfWidth: 3.5 });
    const run = (busAheadAtOnset) => {
      const car = { ...RR.mainRoadWorldPoint(world, 1000, 1.6), heading: -Math.PI / 2, speed: 25 * RR.MPH_TO_MS };
      const bus = { ...RR.mainRoadWorldPoint(world, 1000 - busAheadAtOnset, -1.6), heading: Math.PI / 2, type: 'schoolbus', speed: 0, _stopArmActive: false, id: 'bus' };
      const stats = { safetyScore: 100, majorViolations: 0 };
      const events = [];
      const scope = { ...RR, carRef: { current: car }, trafficRef: { current: [bus] }, infiniteWorldRef: { current: world }, currentScenario: { id: 'residential', weather: 'clear', speedLimit: 25 },
        statsRef: { current: stats }, timeRef: { current: 50 }, wildlifeRef: { current: null }, showDriveAlert() {}, addToast() {}, speak() {}, eventToastRef: { current: null },
        rrScoredEvent: (ref, type) => { events.push(type); }, __alloT: (key, fallback) => fallback };
      const check = new Function('scope', 'with(scope) {' + block + '\nreturn checkBusCompliance;}')(scope);
      check(); // lights off
      bus._stopArmActive = true;
      for (let i = 0; i < 200; i++) { car.y -= car.speed / 30; scope.timeRef.current += 1 / 30; check(); }
      return { stats, events, tooLate: bus._busTooLate };
    };
    const late = run(12);
    expect(late.tooLate).toBe(true);
    expect(late.events).toEqual([]);
    expect(late.stats.safetyScore).toBe(100);
    const fair = run(60); // lights on 60 m away: driving past at speed is still the -25 violation
    expect(fair.tooLate).toBe(false);
    expect(fair.events).toEqual(['schoolBusPass']);
    expect(fair.stats.safetyScore).toBe(75);
  });

  it('railroad: a warning that starts inside the stopping distance is not blocked or scored; one that starts farther out still is', () => {
    const block = cut('          // Active railroad gates are physical controls.', '          // Wall collision (bounce + penalty)');
    expect(block).toContain('if (rrState.stopRequired && crossing._rrTooLateCycle === rrState.cycle && !missedStop) continue;');
    const run = (lineAheadAtOnset) => {
      const crossing = { centerX: 48, centerY: 500, heading: 0, halfWidth: 3.5, chunkIdx: 1, cycleOffset: 0, activeControl: true };
      const world = straightWorld({ roadHalfWidth: 3.5 }); world._railroadCrossings = [crossing];
      const speed = 25 * RR.MPH_TO_MS;
      // car centre so that the front bumper is lineAheadAtOnset before the stop line when the lights start (t = 20)
      const stopLineY = 500 + RR.vehicleFootprint('sedan').length / 2 + 0.77 + 15 * 0.3048;
      const car = { x: 49.6, y: stopLineY + lineAheadAtOnset + speed * 1.0, heading: -Math.PI / 2, speed };
      const stats = { safetyScore: 100, majorViolations: 0, crashes: 0 };
      const events = [];
      const scope = { ...RR, car, currentVehicle: { id: 'sedan' }, infiniteWorldRef: { current: world }, timeRef: { current: 19 }, statsRef: { current: stats },
        eventToastRef: { current: null }, addToast() {}, scn: { weather: 'clear' }, dt: 1 / 30, newX: car.x, newY: car.y, motionBlocked: false,
        rrScoredEvent: (ref, type) => { events.push(type); }, __alloT: (key, fallback) => fallback };
      const step = new Function('scope', 'with(scope) {' + block + '\nreturn { x: newX, y: newY, motionBlocked }; }');
      let blocked = false;
      for (let i = 0; i < 30 * 5; i++) {
        scope.newX = car.x; scope.newY = car.y - car.speed / 30; scope.motionBlocked = false;
        const r = step(scope);
        car.x = r.x; car.y = r.y; if (r.motionBlocked) blocked = true;
        scope.timeRef.current += 1 / 30;
      }
      return { stats, events, blocked, passed: car.y < 495 };
    };
    const stop25 = stopMeters(25, 'clear');
    const late = run(stop25 - 8);
    expect(late.events).toEqual([]);
    expect(late.blocked).toBe(false);
    expect(late.passed).toBe(true);
    const fair = run(stop25 + 8);
    expect(fair.events).toEqual(['railroadGate']);
    expect(fair.blocked).toBe(true);
  });
});
