import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 33, auto lane (ra33): the road and the other road users. The work zone (an oncoming driver
// came through it in the learner's lane and hit the car at 6 to 7 s of every drive), the roads' kinks,
// curve warning signs, where a Free Explore drive starts, riders on the one-way street, children
// who run out, and how the car comes up behind a stopped queue.

const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(TOOL, 'utf8');
let RR;
const ROADS = ['residential', 'suburban', 'highway', 'rural', 'night', 'fog', 'rain', 'snow', 'construction', 'school_zone', 'downtown', 'dawn'];
const worldFor = (id) => RR.createScenarioWorld(RR.SCENARIOS.find((s) => s.id === id));
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('cannot find ' + from); return src.slice(a, b); };
const seeded = (seed) => { let a = (seed * 2654435761) >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

describe('Road Ready ra33: the work zone is a one-lane, two-way zone with a flagger at each end', () => {
  it('each flagger station is one taper outside the cones; the oncoming driver is in its own lane at both stations and beside the cones in between', () => {
    const b = RR.workZoneBoundsForChunk(1);
    expect(b.startY).toBe(35); expect(b.endY).toBe(61);
    expect(b.playerStopY).toBe(61 + RR.RR_WORK_ZONE_TAPER_METERS);
    expect(b.opposingStopY).toBe(35 - RR.RR_WORK_ZONE_TAPER_METERS);
    expect(RR.RR_WORK_ZONE_TAPER_METERS).toBeGreaterThanOrEqual(15); // 50 ft: the shortest one-lane, two-way taper
    expect(RR.workZoneStopLineForDirection(b, -1)).toBe(b.playerStopY);
    expect(RR.workZoneStopLineForDirection(b, 1)).toBe(b.opposingStopY);
    expect(RR.workZoneStopLineForDirection({ _workZoneStartY: 35, _workZoneEndY: 61 }, -1)).toBe(b.playerStopY);
    const lane = 1.6, half = RR.vehicleFootprint('truck').width / 2;
    expect(RR.workZoneOpposingLaneOffset(b.opposingStopY, b, lane)).toBeCloseTo(-lane, 9);
    expect(RR.workZoneOpposingLaneOffset(b.playerStopY, b, lane)).toBeCloseTo(-lane, 9);
    for (let s = b.startY - 2; s <= b.endY + 2; s += 0.5) expect(RR.workZoneOpposingLaneOffset(s, b, lane)).toBeCloseTo(lane, 9); // the open lane beside the cones
    for (let s = b.playerStopY - 3; s < b.playerStopY + 40; s += 0.5) expect(RR.workZoneOpposingLaneOffset(s, b, lane) + half, 'station ' + s).toBeLessThan(0.75); // back across before the learner's line
    // the move across is smooth: never more than 0.45 m sideways per metre
    for (let s = b.opposingStopY - 5; s < b.playerStopY + 5; s += 0.25) expect(Math.abs(RR.workZoneOpposingLaneOffset(s + 0.25, b, lane) - RR.workZoneOpposingLaneOffset(s, b, lane))).toBeLessThan(0.45 * 0.25 + 1e-9);
    const world = worldFor('construction');
    expect(RR.workZoneSectionAt(world, 50, 0)).toEqual(b);
    expect(RR.workZoneSectionAt(world, b.playerStopY + 1, 0)).toBeNull();
    expect(RR.workZoneSectionAt(world, b.playerStopY + 1, 5)).toEqual(b);
    expect(RR.workZoneSectionAt(world, 100, 0)).toBeNull(); // between this zone and the next
    // the learner starts before the flagger station, not at the cones
    expect(RR.drivingStartPose(world, 'construction', 81).station).toBeGreaterThanOrEqual(b.playerStopY + 14);
    // the 3D flaggers stand at the stations
    expect(src).toContain('var wzFlagLocal = wzFlagSpec.local - wzFlagSpec.forwardSign * RR_WORK_ZONE_TAPER_METERS;');
  });

  it.each([1, 2, 3, 4, 5])('the real updateTraffic: a driver coming the other way is never on the learner\'s side where the learner waits (seed %s)', (seed) => {
    const world = worldFor('construction');
    const b = RR.workZoneBoundsForChunk(1);
    const learnerLine = RR.workZoneStopLineForDirection(b, -1);
    const make = new Function('scope', 'with(scope) {' + cut('        var updateTraffic = function(dt) {', '        var updateWildlife = function(dt)') + '\nreturn updateTraffic;}');
    const lane = RR.scenarioRoadLayout('construction').laneCenters[0];
    const learnerSize = RR.vehicleFootprint('sedan');
    // the learner waits at the flagger's line, in its own lane
    const lp = RR.mainRoadWorldPoint(world, learnerLine + learnerSize.length / 2 + 1, lane);
    const car = { x: lp.x, y: lp.y, heading: -Math.PI / 2 - lp.heading, speed: 0 };
    const start = RR.mainRoadWorldPoint(world, b.startY - 30 - seed * 3, -lane);
    const ai = { x: start.x, y: start.y, heading: Math.PI / 2 - start.heading, type: ['car', 'suv', 'pickup', 'van', 'car'][seed - 1], id: 'south', laneOffset: -lane, speed: 9, _roadStation: b.startY - 30 - seed * 3,
      personality: { followMult: 1, speedBias: 1, aggro: 0, rollsStops: 0 } };
    const sp = RR.mainRoadWorldPoint(world, b.playerStopY, 0);
    const flagger = { x: sp.x, y: b.playerStopY, type: 'flagger', state: 'red', timer: 0, greenDur: 10, yellowDur: 2, redDur: 600, _chunk: 1, _workZoneStartY: b.startY, _workZoneEndY: b.endY };
    const time = { current: 30 };
    const scope = { ...RR, RR_CURB_YIELD_HOLD_MAX: 4, trafficRef: { current: [ai] }, infiniteWorldRef: { current: world },
      currentScenario: { id: 'construction', speedLimit: 35, weather: 'clear', traffic: 'medium' }, currentVehicle: { id: 'sedan' }, carRef: { current: car },
      pedsRef: { current: [] }, signalsRef: { current: [flagger] }, cyclistsRef: { current: [] }, emergencyRef: { current: null },
      statsRef: { current: { safetyScore: 100, crashes: 0 } }, timeRef: time, stopSignQueueRef: { current: {} }, intersectionReservationRef: { current: {} },
      blackBoxRef: { current: [] }, addToast() {}, speak() {}, audioRef: { current: {} }, eventToastRef: { current: null } };
    const realRandom = Math.random; Math.random = seeded(seed);
    let worstAtLine = -Infinity, touched = false, usedOpenLane = false, last = ai._roadStation, steps = 0;
    try {
      const update = make(scope);
      for (; steps < 900 && String(ai.id) === 'south' && last < learnerLine + 30; steps++) {
        time.current += 0.1;
        update(0.1);
        const f = RR.mainRoadLocalPoint(world, ai.x, ai.y);
        last = f.longitudinal;
        const size = RR.vehicleFootprint(ai.type);
        if (f.longitudinal > b.startY && f.longitudinal < b.endY && f.lateral > 0.8) usedOpenLane = true;
        // from 3 m before the learner's line onward: which side of the centre line is its body on?
        if (f.longitudinal >= learnerLine - 3) worstAtLine = Math.max(worstAtLine, f.lateral + size.width / 2);
        if (RR.vehicleRectsOverlap(car, learnerSize, ai, size)) touched = true;
      }
    } finally { Math.random = realRandom; }
    expect(last, 'the driver went through the zone').toBeGreaterThan(learnerLine);
    expect(usedOpenLane, 'it used the open lane beside the cones').toBe(true);
    expect(touched, 'it did not touch the waiting learner').toBe(false);
    expect(worstAtLine, 'its left side is on its own side of the centre line where the learner waits').toBeLessThan(0.75);
  });

  it.each([['green', 12], ['yellow', 9], ['green', 15.6]])('the real updateTraffic: with the paddle at STOP for it (%s), a driver coming the other way at %s m/s waits behind its own flagger', (state, speed) => {
    const world = worldFor('construction');
    const b = RR.workZoneBoundsForChunk(1);
    const make = new Function('scope', 'with(scope) {' + cut('        var updateTraffic = function(dt) {', '        var updateWildlife = function(dt)') + '\nreturn updateTraffic;}');
    const lane = RR.scenarioRoadLayout('construction').laneCenters[0];
    const lp = RR.mainRoadWorldPoint(world, b.opposingStopY + 14, lane); // the learner is coming through the single lane
    const car = { x: lp.x, y: lp.y, heading: -Math.PI / 2 - lp.heading, speed: 0 };
    const start = RR.mainRoadWorldPoint(world, b.opposingStopY - 34, -lane);
    const ai = { x: start.x, y: start.y, heading: Math.PI / 2 - start.heading, type: 'car', id: 'south', laneOffset: -lane, speed, _roadStation: b.opposingStopY - 34,
      personality: { followMult: 1, speedBias: 1, aggro: 0, rollsStops: 0 } };
    const sp = RR.mainRoadWorldPoint(world, b.playerStopY, 0);
    const flagger = { x: sp.x, y: b.playerStopY, type: 'flagger', state, timer: 0, greenDur: 600, yellowDur: 600, redDur: 8, _flaggerNextState: 'red', _chunk: 1, _workZoneStartY: b.startY, _workZoneEndY: b.endY };
    const time = { current: 30 };
    const scope = { ...RR, RR_CURB_YIELD_HOLD_MAX: 4, trafficRef: { current: [ai] }, infiniteWorldRef: { current: world },
      currentScenario: { id: 'construction', speedLimit: 35, weather: 'clear', traffic: 'medium' }, currentVehicle: { id: 'sedan' }, carRef: { current: car },
      pedsRef: { current: [] }, signalsRef: { current: [flagger] }, cyclistsRef: { current: [] }, emergencyRef: { current: null },
      statsRef: { current: { safetyScore: 100, crashes: 0 } }, timeRef: time, stopSignQueueRef: { current: {} }, intersectionReservationRef: { current: {} },
      blackBoxRef: { current: [] }, addToast() {}, speak() {}, audioRef: { current: {} }, eventToastRef: { current: null } };
    const realRandom = Math.random; Math.random = seeded(3);
    let furthest = -Infinity;
    try {
      const update = make(scope);
      for (let i = 0; i < 300 && String(ai.id) === 'south'; i++) {
        time.current += 0.1; update(0.1);
        furthest = Math.max(furthest, RR.mainRoadLocalPoint(world, ai.x, ai.y).longitudinal + RR.vehicleFootprint('car').length / 2);
      }
    } finally { Math.random = realRandom; }
    expect(String(ai.id)).toBe('south');
    expect(furthest, 'front bumper against its stop line').toBeLessThanOrEqual(b.opposingStopY + 0.3);
    expect(Math.abs(ai.speed)).toBeLessThan(0.3);
    expect(RR.mainRoadLocalPoint(world, ai.x, ai.y).lateral, 'waits in its own lane').toBeLessThan(-lane + 0.3);
  });

  it('the flagger holds the all-stop until the single lane is empty, and does not turn STOP in the face of a driver who cannot stop', () => {
    const base = () => ({ type: 'flagger', state: 'green', timer: 0, greenDur: 10, yellowDur: 2, redDur: 8, _workZoneStartY: 35, _workZoneEndY: 61 });
    const T = RR.RR_WORK_ZONE_TAPER_METERS;
    const inside = { station: 50, travelSign: -1, speed: 8, length: 4.5, stopMeters: 30 };
    // yellow = both paddles STOP. A vehicle anywhere between the two stop lines holds it.
    let s = Object.assign(base(), { state: 'yellow', _flaggerNextState: 'red' });
    expect(RR.workZoneFlaggerHold(s, [inside])).toBe('clearing');
    expect(RR.workZoneFlaggerHold(s, [{ ...inside, station: 61 + T + 4 }])).toBeNull(); // waiting behind the line
    expect(RR.workZoneFlaggerHold(s, [{ ...inside, station: 35 - T - 4, travelSign: 1 }])).toBeNull();
    s._zoneHold = 'clearing';
    for (let i = 0; i < 100; i++) RR.updateSignals([s], 0.1); // 10 s: longer than the 2 s all-stop
    expect(s.state).toBe('yellow');
    s._zoneHold = null; RR.updateSignals([s], 0.1);
    expect(s.state).toBe('red'); // the other side goes only now
    // SLOW for the learner (green), time is up, the learner is 20 m from the line at 11 m/s: cannot stop gently
    s = Object.assign(base(), { timer: 10.05 });
    const close = { station: 61 + T + 2.25 + 20, travelSign: -1, speed: 11, length: 4.5, stopMeters: RR.rideAlongComfortStopMeters(11, 'clear') };
    expect(RR.workZoneFlaggerHold(s, [close])).toBe('committed');
    expect(RR.workZoneFlaggerHold(s, [{ ...close, station: 61 + T + 2.25 - 2 }])).toBe('committed'); // still while its front crosses the line
    expect(RR.workZoneFlaggerHold(s, [{ ...close, station: close.station + 80 }])).toBeNull(); // far enough to stop
    expect(RR.workZoneFlaggerHold(s, [{ ...close, speed: 0 }])).toBeNull(); // already waiting
    expect(RR.workZoneFlaggerHold(s, [{ ...close, travelSign: 1 }])).toBeNull(); // the side that has STOP
    s._zoneHold = 'committed'; RR.updateSignals([s], 0.1);
    expect(s.state).toBe('green');
    for (let i = 0; i < 210; i++) RR.updateSignals([s], 0.1); // not for ever: 20 s at most
    expect(s.state).toBe('yellow');
    // no hold: the old timing is unchanged
    s = base(); RR.updateSignals([s], 10.1); expect(s).toMatchObject({ state: 'yellow', _flaggerNextState: 'red' });
    // wired into the drive loop, and no driver "turns left" at a flagger
    expect(src).toContain("if (wzSignal && wzSignal.type === 'flagger') wzSignal._zoneHold = workZoneFlaggerHold(wzSignal, wzHoldVehicles);");
    expect(src).toContain("if (s.type === 'flagger') return;");
    expect(src).toContain('!workZoneSectionAt(infiniteWorldRef.current, respawnY, 8) &&');
  });

  it('a car in the middle of the open lane does not touch a cone: each cone\'s collision square lies on the closed side of the cone', () => {
    const world = worldFor('construction');
    const chunk = world.getChunk(1);
    const size = RR.vehicleFootprint('sedan');
    let cones = 0;
    for (let row = 0; row < RR.CHUNK_SIZE; row++) for (let x = 0; x < RR.MAP_SIZE; x++) {
      if (chunk.cells[row][x] !== 8) continue;
      cones++;
      const station = RR.CHUNK_SIZE + row;
      // the square's edge on the open-lane side, measured from the road centre
      const edge = (x + 1) - world.spline.centerAt(station + 0.5);
      const index = Math.round((row - 3) / 3.1);
      expect(edge, 'cone ' + index).toBeLessThanOrEqual(RR.workZoneConeOffset(index) + 0.25 + 0.6); // +0.6: the road leans across the square
      expect(edge, 'cone ' + index).toBeLessThan(0.45);
    }
    expect(cones).toBe(9);
    const lane = RR.scenarioRoadLayout('construction').laneCenters[0];
    for (let s = 90; s > 10; s -= 0.25) {
      const p = RR.mainRoadWorldPoint(world, s, lane);
      const hit = RR.vehicleGridCollision({ x: p.x, y: p.y, heading: -Math.PI / 2 - p.heading }, size, (gx, gy) => world.getCell(gx, gy));
      expect(hit.hit && hit.cell === 8, 'station ' + s).toBe(false);
    }
  });
});

describe('Road Ready ra33: roads without kinks, and curve warning signs', () => {
  it.each(ROADS)('%s: over 3 km the road never turns sharply in one metre (it used to bounce off the edge of its corridor)', (id) => {
    const world = worldFor(id);
    let worst = 0;
    for (let s = 300; s > -2700; s -= 1) worst = Math.max(worst, Math.abs(world.spline.headingAt(s + 1) - world.spline.headingAt(s)));
    // the road type's own wiggle per metre is the bound; the old bounce was 0.1 to 0.3 rad on every road
    const own = id === 'highway' ? 0.006 : id === 'downtown' ? 0.004 : ['rural', 'fog', 'snow', 'dawn'].includes(id) ? 0.075 : id === 'construction' ? 0.04 : ['residential', 'school_zone'].includes(id) ? 0.02 : 0.015;
    expect(worst, id).toBeLessThan(own * 1.9 + 0.012);
    // and it stays inside its corridor
    const layout = RR.scenarioRoadLayout(id);
    for (let s = 300; s > -2700; s -= 7) { const x = world.spline.centerAt(s); expect(x).toBeGreaterThan(layout.pavedHalfWidth + 5); expect(x).toBeLessThan(RR.MAP_SIZE - layout.pavedHalfWidth - 5); }
  });

  it('a curve warning sign carries the speed that keeps the sideways pull at 0.22 g on the tightest bend near it, and is posted when that is 10 mph or more under the limit', () => {
    expect(RR.rideAlongLateralLimit('clear') / 9.81).toBeCloseTo(0.3 * 0.72, 6);
    const posted = {};
    for (const id of ROADS) {
      const world = worldFor(id), limit = RR.SCENARIOS.find((s) => s.id === id).speedLimit;
      const inner = RR.scenarioRoadLayout(id).laneCenters.slice(-1)[0];
      posted[id] = [];
      for (let ci = 0; ci > -45; ci -= RR.RR_CURVE_SIGN_EVERY_CHUNKS) {
        // the same number, worked out here from the road itself
        let tightest = 0;
        for (let s = (ci - 3) * 32; s <= (ci + 4) * 32; s += 4) tightest = Math.max(tightest, Math.abs(RR.rideAlongPathCurvature((y) => RR.mainRoadWorldPoint(world, y, 0), s)));
        const mph = Math.floor(Math.sqrt(RR.rideAlongLateralLimit('clear') * (1 / tightest - inner)) * RR.MS_TO_MPH / 5) * 5;
        const sign = RR.roadCurveAdvisoryMph(world, ci);
        if (mph <= limit - 10) { expect(sign, id + ' chunk ' + ci).toBe(mph); posted[id].push(sign); } else expect(sign, id + ' chunk ' + ci).toBeNull();
      }
    }
    // the winding roads are signed all the way; the town roads need none
    for (const id of ['rural', 'dawn', 'snow']) { expect(posted[id].length).toBe(15); posted[id].forEach((mph) => { expect(mph).toBeGreaterThanOrEqual(15); expect(mph).toBeLessThanOrEqual(25); }); }
    for (const id of ['residential', 'suburban', 'night', 'rain', 'school_zone', 'downtown']) expect(posted[id], id).toEqual([]);
    // the sign is built with the chunk, from that function
    expect(src).toContain('var cvAdvisoryMph = positiveModulo(ci, RR_CURVE_SIGN_EVERY_CHUNKS) === 0 ? roadCurveAdvisoryMph(iw, ci) : null;');
    expect(src).toContain("cvCtx.fillText(String(cvAdvisoryMph), 128, 352);");
  });
});

describe('Road Ready ra33: where a drive starts, and who is on the road', () => {
  it('a Free Explore drive starts in a lane of ITS road, on the pavement (it started 2.5 m to the side, on the grass)', () => {
    for (const map of ['suburban', 'residential', 'rural']) for (const seed of [1001, 1002, 1003, 1004, 1005, 4242, 77777]) {
      const world = RR.createFreeExploreWorld(seed, map);
      const pose = RR.drivingStartPose(world, map, 81);
      const lanes = RR.authoredTrafficLaneOffsets(world.getChunk(Math.floor(pose.station / 32)), -1);
      expect(Math.min(...lanes.map((o) => Math.abs(o - pose.lateral))), map + ' ' + seed).toBeLessThan(1e-9);
      const surface = RR.aggregateWheelSurfaceDynamics(RR.sampleVehicleWheelContacts({ x: pose.x, y: pose.y, heading: pose.heading }, RR.vehicleFootprint('sedan'), (x, y) => world.getCell(x, y), null));
      expect(surface.offRoadFraction, map + ' ' + seed).toBe(0);
    }
    // scenario drives start where they did
    for (const id of ['residential', 'suburban', 'rural', 'downtown']) {
      const pose = RR.drivingStartPose(worldFor(id), id, 81);
      expect(pose.lateral).toBe(RR.scenarioRoadLayout(id).laneCenters.slice(-1)[0]);
    }
  });

  it('riders go with the traffic on the one-way downtown street', () => {
    const realRandom = Math.random; Math.random = seeded(7);
    try {
      const downtown = RR.SCENARIOS.find((s) => s.id === 'downtown'), residential = RR.SCENARIOS.find((s) => s.id === 'residential');
      const way = RR.getContinuousScenarioProfile('downtown').oneWayDirection < 0 ? -Math.PI / 2 : Math.PI / 2;
      let riders = 0, both = new Set();
      for (let i = 0; i < 200; i++) {
        RR.spawnCyclists(downtown).concat(RR.spawnMotorcycles(downtown)).forEach((r) => { riders++; expect(r.heading).toBe(way); });
        RR.spawnCyclists(residential).forEach((r) => both.add(r.heading));
      }
      expect(riders).toBeGreaterThan(400);
      expect(both.size).toBe(2); // two-way streets still have riders both ways
    } finally { Math.random = realRandom; }
  });

  it('a child runs out only where a driver who reacts can still stop (the real updatePeds), at one rate whatever the frame rate', () => {
    const world = worldFor('school_zone');
    const make = new Function('scope', 'with(scope) {' + cut('        var updatePeds = function(dt) {', '        var checkCollisions = function(dt) {') + '\nreturn updatePeds;}');
    const crosswalk = -40;
    const run = (carAhead, mph, dt, frames) => {
      const side = RR.mainRoadWorldPoint(world, crosswalk, 4.5);
      const kid = { x: side.x, y: side.y, homeX: side.x, homeY: side.y, kind: 'kid', waitingAtCrosswalk: true, crosswalkY: crosswalk, crossing: false, crossDirection: 1,
        _curvedRoadFrame: true, _roadStation: crosswalk, _sidewalkLateral: 4.5, _sidewalkOffset: 4.5, dartCooldown: 0, vx: 0, vy: 0, _chunk: -99 };
      const cp = RR.mainRoadWorldPoint(world, crosswalk + carAhead + 2.25, 1.6);
      const car = { x: cp.x, y: cp.y, heading: -Math.PI / 2 - cp.heading, speed: mph * RR.MPH_TO_MS };
      // a red hand: only a dart can start this child across
      const scope = { ...RR, pedsRef: { current: [kid] }, signalsRef: { current: [{ type: 'light', state: 'green', _phase: 'main_green', _crossState: 'red', x: side.x, y: crosswalk, _chunk: -99 }] },
        trafficRef: { current: [] }, cyclistsRef: { current: [] }, emergencyRef: { current: null }, carRef: { current: car }, currentVehicle: { id: 'sedan' },
        currentScenario: { id: 'school_zone', weather: 'clear', speedLimit: 15 }, infiniteWorldRef: { current: world }, timeRef: { current: 50 }, addToast() {}, statsRef: { current: {} } };
      const update = make(scope);
      let started = 0;
      for (let i = 0; i < frames; i++) { scope.timeRef.current += dt; update(dt); if (kid.crossing) { started++; kid.crossing = false; kid._sidewalkLateral = 4.5; kid.dartCooldown = 0; } }
      return started;
    };
    const realRandom = Math.random;
    try {
      Math.random = () => 0; // every chance is taken
      const need = RR.rrRoadsideHazardMinMeters(12 * RR.MPH_TO_MS, 'clear', 15);
      expect(run(2, 12, 0.1, 50), '2 m in front of a moving car').toBe(0);
      expect(run(need - 2, 12, 0.1, 50), 'inside the stopping distance').toBe(0);
      expect(run(need + 2, 12, 0.1, 5), 'beyond it').toBeGreaterThan(0);
      expect(run(2, 0, 0.1, 5), 'in front of a stopped car').toBeGreaterThan(0);
      // the same rate at 10 and at 60 frames a second: 60 s of waiting each
      Math.random = seeded(11); const slow = run(60, 12, 0.1, 6000);
      Math.random = seeded(12); const fast = run(60, 12, 1 / 60, 36000);
      expect(slow).toBeGreaterThan(20);
      expect(fast / slow).toBeGreaterThan(0.6); expect(fast / slow).toBeLessThan(1.6); // was 6 times as often at 60 Hz
    } finally { Math.random = realRandom; }
  });
});

describe('Road Ready ra33: a scenario can be marked "Ride-Along not ready"', () => {
  it('rideAlong: false on a scenario removes the Ride-Along option there, with a plain note; no scenario carries the flag unless the notes say so', () => {
    const flagged = RR.SCENARIOS.filter((s) => s.rideAlong === false).map((s) => s.id);
    expect(flagged).toEqual(['suburban', 'highway', 'rural', 'night', 'fog', 'rain', 'construction']); // the round 33 sweep: see NOTES.md
    for (const id of ['residential', 'snow', 'school_zone', 'downtown', 'dawn']) expect(RR.rideAlongSupportsScenario(id, false), id).toBe(true);
    for (const id of flagged) expect(RR.rideAlongSupportsScenario(id, false), id).toBe(false);
    const rural = RR.SCENARIOS.find((s) => s.id === 'dawn');
    expect(RR.rideAlongSupportsScenario('dawn', false)).toBe(true);
    rural.rideAlong = false;
    try {
      expect(RR.rideAlongNotReady('dawn')).toBe(true);
      expect(RR.rideAlongSupportsScenario('dawn', false)).toBe(false);
      expect(RR.rideAlongSupportsScenario('rural', true)).toBe(true); // Free Explore roads are judged by their own sweep
      expect(RR.rideAlongNotReady('snow')).toBe(false);
    } finally { delete rural.rideAlong; }
    expect(RR.rideAlongSupportsScenario('parking', false)).toBe(false); // the hands-on courses are unchanged
    expect(RR.rideAlongNotReady('parking')).toBe(false);
    expect(src).toContain("__alloT('stem.roadready.ra33_not_ready', 'Ride-Along is not ready for this road yet.')");
  });

  it('new traffic from the Free Explore slider is put outside the learner\'s stopping envelope when it is put ahead', () => {
    const world = RR.createFreeExploreWorld(1001, 'suburban');
    const pose = RR.drivingStartPose(world, 'suburban', 81);
    for (const mph of [25, 40, 55]) {
      const car = { x: pose.x, y: pose.y, heading: pose.heading, speed: mph * RR.MPH_TO_MS };
      const realRandom = Math.random; Math.random = seeded(mph);
      let traffic;
      try { traffic = RR.reconcileFreeExploreTrafficPopulation(world, [], { id: 'suburban', traffic: 'light', weather: 'clear', speedLimit: mph }, 'heavy', car, seeded(mph + 1)); } finally { Math.random = realRandom; }
      expect(traffic.length).toBeGreaterThan(2);
      traffic.forEach((t) => {
        const ahead = pose.station - RR.mainRoadLocalPoint(world, t.x, t.y).longitudinal;
        if (ahead > 0) expect(ahead, mph + ' mph').toBeGreaterThanOrEqual(RR.rrSpawnAheadMinMeters(car.speed, 'clear', mph, 0) - 1e-6);
        else expect(-ahead).toBeGreaterThanOrEqual(24 - 1e-6);
      });
    }
  });
});

describe('Road Ready ra33: coming up behind a stopped vehicle', () => {
  it.each([0.2, 0.1, 0.033, 0.016])('the car is never both close and quick: over 5 m/s the gap stays above half the following time, and it stops 3 m short without a hard brake (dt %s)', (dt) => {
    const veh = RR.VEHICLES.find((v) => v.id === 'sedan');
    for (const [weather, limit] of [['clear', 25], ['clear', 40], ['rain', 45], ['fog', 30], ['snow', 35]]) {
      let cruise = Math.max(8, limit - 3); if (weather === 'snow') cruise *= 0.55; else if (weather !== 'clear') cruise *= 0.75;
      const car = { v: cruise * RR.MPH_TO_MS, throttle: 0, brake: 0 };
      let gap = 150, t = 0, worst = Infinity, hard = 0, lastAccel = 0;
      const line = -Math.max(0.5, RR.frictionCoef(weather) * 0.92 * 9.81) * 0.8, comfort = RR.RR_RIDEALONG_GRIP_SHARE * RR.frictionCoef(weather) / 1.05;
      while (t < 90 && !(car.v < 0.05 && gap < 8)) {
        t += dt;
        const mph = car.v * RR.MS_TO_MPH;
        const plan = RR.rideAlongFollowPlan(gap, car.v, 0, dt, weather);
        const target = Math.min(cruise, plan.targetMph);
        const pedals = RR.rideAlongPedals(target, mph, plan.brake);
        if (target > 0.5) pedals.brake = Math.min(pedals.brake, Math.max(plan.brake, comfort)); // the drive loop's comfortable-rate rule
        const pr = RR.drivingPedalResponse(car.throttle, car.brake, pedals.throttle, pedals.brake, dt, 'D'); car.throttle = pr.throttle; car.brake = pr.brake;
        const tire = RR.computeTireDynamics(weather, mph, car.brake, 0, { tread32: 7, psi: 32, absEnabled: true }, 0, 1);
        let maxThrust = veh.powerKW * 1000 / Math.max(1, car.v); if (car.v < 2) maxThrust = veh.powerKW * 500;
        const thrust = car.throttle * Math.min(maxThrust, veh.mass * tire.mu * 9.81 * 0.6);
        const Fr = RR.rollingForce(veh.mass, RR.rollingCoef(weather, true)), brakeForce = tire.brakingMu * veh.mass * 9.81;
        const accel = RR.longitudinalNetForce(thrust, RR.dragForce(car.v, veh.cd, veh.area) + Fr + brakeForce, car.v, 0) / veh.mass;
        const m = RR.integrateDrivingMotion(car.v, accel, dt, 'D', car.throttle === 0 && car.brake === 0 ? 0.05 : 0, RR.longitudinalNetForce(thrust, Fr + brakeForce, 0, 0) === 0);
        if (car.brake > 0 && accel < line && mph >= 10 && lastAccel >= line) hard++;
        lastAccel = accel; car.v = m.speed; gap -= m.distance;
        if (car.v > 5) worst = Math.min(worst, gap / car.v);
      }
      const label = weather + ' ' + limit + ' mph dt ' + dt;
      expect(worst, label + ': seconds of gap while over 5 m/s').toBeGreaterThan(0.5 * RR.safeFollowingFeet(10, weather) / 14.67); // under that the tool scores tailgating
      expect(car.v, label).toBeLessThan(0.05);
      expect(gap, label).toBeGreaterThan(2); expect(gap, label).toBeLessThan(6);
      expect(hard, label).toBe(0);
    }
  });
});
