import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 33, auto lane (ra33). Ride-Along is the mode a student who cannot use the controls rides in,
// so it has to drive correctly. This file steps the REAL Ride-Along block of updatePhysics (cut from
// the tool's source) with the tool's own physics functions, on the tool's own scenario roads:
// bends, the highway ramp, snow, the work-zone flagger, an emergency vehicle, a cyclist.
// The whole-app sweep (lane_auto/harness/sweep2.cjs) is the acceptance run; this is the part of it
// that fits in a unit test.

const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(TOOL, 'utf8');
let RR, drive;
const DTS = [0.2, 0.1, 0.033, 0.016];
const ROADS = ['residential', 'suburban', 'highway', 'rural', 'night', 'fog', 'rain', 'snow', 'construction', 'school_zone', 'downtown', 'dawn'];

function makeStepper() {
  const a = src.indexOf('          // ─── Ride-Along autopilot override ───');
  const b = src.indexOf('          // In Park: no movement at all');
  if (a < 0 || b < a) throw new Error('Ride-Along block not found');
  const run = new Function('scope', 'with (scope) { var throttleInput = 0, brakeInput = 0, steerLeft = 0, steerRight = 0, gpSteer = 0;\n' + src.slice(a, b) +
    '\nreturn { throttle: throttleInput, brake: brakeInput, steerLeft: steerLeft, steerRight: steerRight }; }');
  return function (opts) {
    const scn = Object.assign({}, RR.SCENARIOS.find((s) => s.id === opts.scenario), opts.weather ? { weather: opts.weather } : {});
    const world = opts.world || RR.createScenarioWorld(scn);
    const veh = RR.VEHICLES.find((v) => v.id === (opts.vehicle || 'sedan'));
    const size = RR.vehicleFootprint(veh.id);
    const pose = RR.drivingStartPose(world, scn.id, Math.floor(96 * 0.85));
    const car = { x: pose.x, y: pose.y, heading: pose.heading, speed: 0, throttle: 0, brake: 0, steering: 0 };
    const S = { car, scn, veh, world, size, t: 0, dist: 0, said: [], blinker: 0, blinkerLog: [], traffic: opts.traffic || [], cyclists: opts.cyclists || [], controls: opts.signals || [],
      emergency: null, wildlife: null, maxDecel: 0, maxLat: 0, hardBrakes: 0, skidSeconds: 0, offRoadSeconds: 0, maxMph: 0, cones: 0, maxBendDemand: 0, lastAccel: 0,
      ras: { lastNarration: 0, lastSignalId: null, lastCellAnnounced: -999, announcedHazards: {}, stopControls: {}, lastBusKey: null, lastRailKey: null, autoSignal: 0 } };
    const grace = opts.grace == null ? 4 : opts.grace;
    const scope = Object.assign({}, RR, {
      // the controller itself is under test, on every road, whether or not Ride-Along is offered there (rideAlong: false)
      rideAlongSupportsScenario: () => true,
      rideAlongRef: { current: true }, d: { freeExplore: !!opts.freeExplore }, infiniteWorldRef: { current: world },
      rideAlongStateRef: { current: S.ras }, timeRef: { current: 0 }, graceRef: { current: { until: grace } },
      car, veh, scn, emergencyRef: { current: null }, signalsRef: { current: S.controls }, trafficRef: { current: S.traffic },
      pedsRef: { current: [] }, wildlifeRef: { current: null }, cyclistsRef: { current: S.cyclists },
      blinkerRef: { current: 0 }, gearRef: { current: 'P' }, setDriveGearUi() {},
      applyTurnSignal(next) { scope.blinkerRef.current = next; S.blinker = next; S.blinkerLog.push([+S.t.toFixed(2), next]); },
      speak(text) { S.said.push(String(text)); }, __alloT(key, fallback) { return fallback; }
    });
    S.step = function (dt) {
      scope.timeRef.current = S.t; scope.dt = dt; scope.gear = scope.gearRef.current;
      scope.emergencyRef.current = S.emergency; scope.wildlifeRef.current = S.wildlife;
      const input = opts.manual ? Object.assign({ steerLeft: 0, steerRight: 0 }, opts.manual(S)) : run(scope);
      if (opts.manual && S.t >= grace) scope.gearRef.current = 'D';
      const gear = scope.gearRef.current;
      let throttleInput = input.throttle, brakeInput = input.brake;
      if (gear === 'P') { throttleInput = 0; car.speed = 0; }
      const pr = RR.drivingPedalResponse(car.throttle, car.brake, throttleInput, brakeInput, dt, gear);
      car.throttle = pr.throttle; car.brake = pr.brake;
      const absSpeed = Math.abs(car.speed), mph = absSpeed * RR.MS_TO_MPH;
      car.steering = RR.drivingResponse(car.steering, (input.steerRight - input.steerLeft) * 0.6, 8 - Math.min(4, absSpeed * 0.1), dt);
      const getCell = (x, y) => world.getCell(x, y);
      const surf = RR.aggregateWheelSurfaceDynamics(RR.sampleVehicleWheelContacts(car, size, getCell, null));
      const tire = RR.computeTireDynamics(scn.weather, mph, car.brake, car.steering, { tread32: 7, psi: 32, absEnabled: true }, 0, surf.gripMultiplier);
      let maxThrust = veh.powerKW * 1000 / Math.max(1, absSpeed); if (absSpeed < 2) maxThrust = veh.powerKW * 500;
      const thrust = car.throttle * Math.min(maxThrust, veh.mass * tire.mu * 9.81 * 0.6);
      const Fr = RR.rollingForce(veh.mass, RR.rollingCoef(scn.weather, true) * surf.rollingMultiplier), brakeForce = tire.brakingMu * veh.mass * 9.81;
      const Fg = veh.mass * 9.81 * RR.drivingRoadGrade(world, car);
      const longForce = RR.longitudinalNetForce(thrust, brakeForce, car.speed, 0);
      const accel = gear === 'P' ? 0 : RR.longitudinalNetForce(thrust, RR.dragForce(absSpeed, veh.cd, veh.area) + Fr + brakeForce, car.speed, Fg) / veh.mass;
      const motion = RR.integrateDrivingMotion(car.speed, accel, dt, gear, car.throttle === 0 && car.brake === 0 && gear === 'D' ? 0.05 : 0, RR.longitudinalNetForce(thrust, Fr + brakeForce, 0, Fg) === 0);
      car.speed = motion.speed;
      const geo = RR.drivingSteeringGeometry(car.speed, car.steering, veh.id);
      const gripAvail = tire.mu * 9.81, used = Math.abs(longForce) / veh.mass;
      const latAvail = Math.sqrt(Math.max(0, gripAvail * gripAvail - used * used));
      if (geo.lateralAcceleration > latAvail * 1.3 && absSpeed > 4 && S.t > 3) S.skidSeconds += dt; // the tool's skid test
      const eff = Math.min(1, latAvail / Math.max(0.001, geo.lateralAcceleration)) * tire.steeringFactor * surf.steeringMultiplier;
      const fp = RR.integrateDrivingPose(car.heading, motion.distance, geo.curvature * eff);
      const next = { x: car.x + fp.dx, y: car.y + fp.dy, heading: fp.heading };
      const hit = RR.vehicleGridCollision(next, size, getCell);
      if (hit.hit && hit.cell === 8) S.cones++;
      car.heading = next.heading; car.x = next.x; car.y = next.y;
      // the tool's hard-brake line: 80% of the surface's braking ceiling, from 10 mph up
      const line = -Math.max(0.5, RR.frictionCoef(scn.weather) * 0.92 * 9.81) * 0.8;
      if (car.brake > 0 && accel < line && mph >= RR.RR_HARD_BRAKE_MIN_MPH && S.lastAccel >= line && S.t > 5) S.hardBrakes++;
      S.lastAccel = accel;
      S.t += dt; S.dist += Math.abs(motion.distance);
      const f = RR.mainRoadLocalPoint(world, car.x, car.y);
      S.station = f.longitudinal; S.lateral = f.lateral; S.mph = Math.abs(car.speed) * RR.MS_TO_MPH; S.accel = accel;
      S.latAccel = geo.lateralAcceleration * eff; S.offRoadSeconds += surf.offRoadFraction > 0 ? dt : 0;
      if (S.t > grace + 1) { S.maxLat = Math.max(S.maxLat, S.latAccel); S.maxDecel = Math.max(S.maxDecel, -accel); S.maxMph = Math.max(S.maxMph, S.mph); }
      return S;
    };
    S.laneError = () => { // distance from the nearest legal lane centre
      const lanes = RR.roadLaneArrowSpecs(RR.roadProfileAt(world, S.station, null)).filter((l) => l.direction === -1).map((l) => l.offset);
      return Math.min.apply(null, lanes.map((o) => Math.abs(o - S.lateral)));
    };
    return S;
  };
}
// a scripted road user that keeps its lane at a constant speed (the learner travels toward smaller stations)
const actor = (world, station, lateral, speedMps, type, dir) => { const p = RR.mainRoadWorldPoint(world, station, lateral); const sign = dir || -1; return { x: p.x, y: p.y, heading: sign > 0 ? Math.PI / 2 - p.heading : -Math.PI / 2 - p.heading, speed: speedMps, type: type || 'car', laneOffset: lateral, _roadStation: station, id: 't' + station, _lat: lateral, _dir: sign }; };
const advance = (world, list, dt) => list.forEach((o) => { o._roadStation += o._dir * o.speed * dt; const p = RR.mainRoadWorldPoint(world, o._roadStation, o._lat); o.x = p.x; o.y = p.y; o.heading = o._dir > 0 ? Math.PI / 2 - p.heading : -Math.PI / 2 - p.heading; });

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  drive = makeStepper();
});

describe('Road Ready ra33: Ride-Along holds its lane and its speed through bends', () => {
  it.each(ROADS)('%s for 75 s on an open road: stays within 0.7 m of its lane, corners inside the planned grip, no hard brake, no skid, never off the pavement', (id) => {
    const S = drive({ scenario: id });
    const limit = RR.rideAlongLateralLimit(S.scn.weather);
    expect(limit).toBeCloseTo(RR.RR_RIDEALONG_GRIP_SHARE * RR.frictionCoef(S.scn.weather) * 9.81, 9); // derived from the tool's grip
    let worstLane = 0;
    for (let i = 0; i < 750; i++) {
      S.step(0.1);
      const onRamp = id === 'highway' && S.station > 60;
      if (S.t > 6 && !onRamp) worstLane = Math.max(worstLane, S.laneError());
    }
    expect(S.dist, 'the car drives').toBeGreaterThan(id === 'snow' ? 250 : id === 'school_zone' ? 300 : 500);
    expect(worstLane, 'lane keeping').toBeLessThan(0.7);
    expect(S.maxLat, 'sideways pull').toBeLessThan(limit * 1.2);
    expect(S.hardBrakes).toBe(0);
    expect(S.skidSeconds).toBe(0);
    expect(S.offRoadSeconds).toBe(0);
    expect(S.maxMph).toBeLessThanOrEqual(S.scn.speedLimit);
  });

  it.each(['rural', 'dawn', 'snow'])('%s: the speed at every bend is at or under sqrt(lateral limit x radius), at dt 0.2 / 0.1 / 0.033 / 0.016', (id) => {
    for (const dt of DTS) {
      const S = drive({ scenario: id });
      const limit = RR.rideAlongLateralLimit(S.scn.weather);
      let worst = 0, checked = 0;
      for (let i = 0; i < 32 / dt; i++) {
        S.step(dt);
        if (S.t < 8) continue;
        const lane = S.lateral;
        const curvature = Math.abs(RR.rideAlongPathCurvature((s) => RR.mainRoadWorldPoint(S.world, s, lane), S.station));
        const v = Math.abs(S.car.speed);
        if (curvature > 1 / 150) { checked++; worst = Math.max(worst, v * v * curvature / limit); }
      }
      expect(checked, id + ' dt ' + dt).toBeGreaterThan(20);
      expect(worst, id + ' dt ' + dt + ': v^2 / R against the limit').toBeLessThan(1.25);
      expect(S.hardBrakes, id + ' dt ' + dt).toBe(0);
    }
  });

  it('the plan slows BEFORE a bend at the gentle rate, and the steering law is pure pursuit through the tool\'s own steering model', () => {
    // a 40 m bend that begins 80 m ahead on an otherwise straight road
    const pointAt = (s) => (s < 80 ? { x: 0, y: s } : { x: 40 - 40 * Math.cos((s - 80) / 40), y: 80 + 40 * Math.sin((s - 80) / 40) });
    for (const weather of ['clear', 'rain', 'snow']) {
      const lateral = RR.rideAlongLateralLimit(weather), slowing = 0.25 * RR.frictionCoef(weather) * 9.81;
      const bend = Math.sqrt(lateral * 40);
      const far = RR.rideAlongCurvePlan(pointAt, 0, 1, 20, weather);
      expect(far.bendMph).toBeCloseTo(bend * RR.MS_TO_MPH, 0);
      expect(far.radius).toBeGreaterThan(38); expect(far.radius).toBeLessThan(42.5);
      // from the speed allowed now, the car reaches the bend at the bend speed with the gentle rate
      const allowedNow = far.speedMph * RR.MPH_TO_MS;
      expect(allowedNow).toBeGreaterThan(bend);
      expect((allowedNow * allowedNow - bend * bend) / (2 * slowing)).toBeLessThanOrEqual(80); // 80 m to the bend
      expect(RR.rideAlongCurvePlan(pointAt, 100, 1, 5, weather).speedMph).toBeCloseTo(bend * RR.MS_TO_MPH, 0); // in the bend
    }
    expect(RR.rideAlongCurvePlan((s) => ({ x: 0, y: s }), 0, 1, 20, 'clear').speedMph).toBe(Infinity); // a straight road: no cap
    // steering: the arc through the aim point, inverted through drivingSteeringGeometry
    for (const speed of [3, 9, 15, 27]) for (const side of [-2, -0.5, 0.5, 2]) {
      const car = { x: 0, y: 0, heading: 0, speed };
      const input = RR.rideAlongSteerInput(car, 14, side, 'sedan');
      const wanted = 2 * side / (14 * 14 + side * side);
      const got = RR.drivingSteeringGeometry(speed, input * 0.6, 'sedan').curvature;
      if (Math.abs(input) < 1) expect(got).toBeCloseTo(wanted, 6); else expect(Math.abs(got)).toBeLessThan(Math.abs(wanted));
    }
    expect(RR.rideAlongLookAheadMeters(0)).toBe(5);
    expect(RR.rideAlongLookAheadMeters(10)).toBeCloseTo(12, 9);
    expect(RR.rideAlongLookAheadMeters(40)).toBe(30);
    const block = src.slice(src.indexOf('          // ─── Ride-Along autopilot override ───'), src.indexOf('          // In Park: no movement at all'));
    expect(block).toContain('var raSteer = rideAlongSteerInput(car, raAim.x, raAim.y, veh.id);');
    expect(block).not.toContain('headingErr * 1.2');
  });
});

describe('Road Ready ra33: Snow pulls away', () => {
  it('Ride-Along moves off from the start of the Snow drive and of a Free Explore snow drive (it stood still for the whole trip)', () => {
    for (const dt of DTS) {
      const S = drive({ scenario: 'snow' });
      for (let i = 0; i < 20 / dt; i++) S.step(dt);
      expect(S.dist, 'snow scenario, dt ' + dt).toBeGreaterThan(25);
      expect(S.hardBrakes).toBe(0);
    }
    for (const seed of [1001, 1002, 1003, 1004, 1005]) {
      const world = RR.createFreeExploreWorld(seed, 'suburban');
      const S = drive({ scenario: 'suburban', weather: 'snow', world, freeExplore: true });
      S.step(0.1);
      expect(S.laneError(), 'starts in a lane, seed ' + seed).toBeLessThan(0.2); // it started on the grass
      for (let i = 0; i < 200; i++) S.step(0.1);
      expect(S.dist, 'free explore snow, seed ' + seed).toBeGreaterThan(25);
      expect(S.offRoadSeconds).toBe(0);
    }
  });

  it('a learner holding the gas key pulls away in snow too, and the grade under the parked car is a real hill, not the bank\'s ripple', () => {
    const S = drive({ scenario: 'snow', manual: (s) => ({ throttle: s.t >= 4 ? 1 : 0, brake: 0 }) });
    const startGrade = RR.drivingRoadGrade(S.world, S.car);
    expect(Math.abs(startGrade)).toBeLessThan(0.08); // read 0.10 (the clamp) with the old 1 m sample: thrust could not beat it
    for (let i = 0; i < 100; i++) S.step(0.1);
    expect(S.car.speed * RR.MS_TO_MPH).toBeGreaterThan(8);
    // the grade is the height difference between the axles
    const p = RR.mainRoadWorldPoint(S.world, 40, 1.6), h = -Math.PI / 2 - p.heading, half = RR.RR_GRADE_HALF_WHEELBASE_METERS;
    const front = RR.roadSurfacePoseAt(S.world, p.x + Math.cos(h) * half, p.y + Math.sin(h) * half).height;
    const rear = RR.roadSurfacePoseAt(S.world, p.x - Math.cos(h) * half, p.y - Math.sin(h) * half).height;
    expect(RR.drivingRoadGrade(S.world, { x: p.x, y: p.y, heading: h })).toBeCloseTo(Math.max(-0.1, Math.min(0.1, (front - rear) / (2 * half))), 9);
    expect(half * 2).toBeCloseTo(RR.vehicleFootprint('sedan').length * 0.6, 1); // a sedan's wheelbase in the steering model
  });
});

describe('Road Ready ra33: the highway ramp', () => {
  // traffic: a list of [station, speed mph] in the lane beside the ramp
  const merge = (cars, dt) => {
    const S = drive({ scenario: 'highway' });
    const layout = RR.scenarioRoadLayout('highway');
    const outer = layout.laneCenters[layout.laneCenters.length - 1];
    cars.forEach((c) => S.traffic.push(actor(S.world, c[0], outer, c[1] * RR.MPH_TO_MS, 'car')));
    const out = { S, outer, signalBeforeMove: null, moveStart: null, mergedAt: null, mphAtMove: null, minFront: Infinity, minRear: Infinity, events: [], state: null };
    let prev = { x: S.car.x, y: S.car.y, speed: 0 };
    for (let i = 0; i < 40 / dt && (S.station == null || S.station > 20); i++) {
      advance(S.world, S.traffic, dt);
      S.step(dt);
      const ramp = RR.highwayRampPoseAt(S.station, layout);
      const res = RR.assessHighwayMergeFrame(out.state, prev, S.car, S.blinker, dt, layout); out.state = res.state; res.events.forEach((e) => out.events.push(e));
      prev = { x: S.car.x, y: S.car.y, speed: S.car.speed };
      if (out.moveStart == null && ramp.active && S.station > 84 && S.lateral < ramp.offset - 0.6) { out.moveStart = S.t; out.mphAtMove = S.mph; out.signalBeforeMove = S.blinkerLog.filter((b) => b[1] === -1).map((b) => b[0])[0]; out.blinkerAtMove = S.blinker; }
      if (out.mergedAt == null && Math.abs(S.lateral - outer) < 0.6) { out.mergedAt = S.t; out.mergedStation = S.station; }
      // while the car is between the ramp and the lane, or in the lane: room in front and behind
      if (S.lateral < outer + layout.laneWidth * 0.75) S.traffic.forEach((o) => {
        const ahead = S.station - o._roadStation, bodies = 4.5;
        if (ahead >= 0) out.minFront = Math.min(out.minFront, (ahead - bodies) / Math.max(1, Math.abs(S.car.speed)));
        else out.minRear = Math.min(out.minRear, (-ahead - bodies) / Math.max(1, o.speed));
      });
    }
    return out;
  };
  it.each(DTS)('an empty lane: left signal first, up to speed, in the lane before the ramp narrows (dt %s)', (dt) => {
    const m = merge([], dt);
    expect(m.moveStart, 'the car moved over on the wide part of the ramp').not.toBeNull();
    expect(m.signalBeforeMove).toBeLessThanOrEqual(m.moveStart - 2); // signalled at least 2 s before moving
    expect(m.blinkerAtMove).toBe(-1);
    expect(m.mphAtMove).toBeGreaterThanOrEqual(45);
    expect(m.mergedStation).toBeGreaterThan(84);
    expect(m.events).toEqual(['merge_complete']); // the tool's own merge assessment
    expect(m.S.hardBrakes).toBe(0);
    expect(m.S.offRoadSeconds).toBe(0);
  });
  it('a car level with the ramp, and a line of cars 3 s apart: the car waits for a gap, then merges with room in front and behind', () => {
    for (const cars of [[[285, 55]], [[330, 60], [250, 60], [170, 60]], [[300, 62], [217, 62], [134, 62], [383, 62], [466, 62]], [[292, 50], [240, 50]]]) {
      const m = merge(cars, 0.1);
      const label = JSON.stringify(cars);
      expect(m.mergedAt, label).not.toBeNull();
      expect(m.blinkerAtMove, label).toBe(-1);
      expect(m.minFront, label + ': gap in front, seconds').toBeGreaterThan(2.0); // under 2 s the tool scores tailgating
      expect(m.minRear, label + ': gap behind, seconds of the other driver').toBeGreaterThan(1.5);
      expect(m.events.indexOf('missing_merge_signal'), label).toBe(-1);
      expect(m.S.hardBrakes, label).toBe(0);
    }
  });
  it('the ramp is a lane: the dashboard does not call it a lane departure', () => {
    expect(src).toContain('if (departureAssessment.outsideEdge && departureProfile.highway && departureTravelSign < 0 && offset > 0) {');
    expect(src).toContain('} else if (departureAssessment.outsideEdge && signalOn === 0) {');
  });
});

describe('Road Ready ra33: the work zone', () => {
  const flaggerFor = (world, state) => { const b = RR.workZoneBoundsForChunk(1); const p = RR.mainRoadWorldPoint(world, b.playerStopY, 0); return { x: p.x, y: b.playerStopY, type: 'flagger', state, timer: 0, greenDur: 10, yellowDur: 2, redDur: 8, _chunk: 1, _workZoneStartY: b.startY, _workZoneEndY: b.endY }; };
  it.each(DTS)('STOP paddle: the car rests before the flagger\'s stop line, one taper before the cones; SLOW: it goes through beside the cones without touching one (dt %s)', (dt) => {
    for (const stopState of ['red', 'yellow']) {
      const S = drive({ scenario: 'construction' });
      const flagger = flaggerFor(S.world, stopState); S.controls.push(flagger);
      const b = RR.workZoneBoundsForChunk(1);
      expect(b.playerStopY - b.endY).toBe(RR.RR_WORK_ZONE_TAPER_METERS);
      for (let i = 0; i < 25 / dt; i++) S.step(dt);
      const front = S.station - S.size.length / 2;
      expect(Math.abs(S.car.speed), stopState).toBeLessThan(0.15);
      expect(front, stopState + ': front bumper is before the line').toBeGreaterThan(b.playerStopY);
      expect(front - b.playerStopY, stopState).toBeLessThan(3);
      expect(S.hardBrakes).toBe(0);
      flagger.state = 'green';
      for (let i = 0; i < 25 / dt; i++) S.step(dt);
      expect(S.station, 'through the zone').toBeLessThan(b.opposingStopY);
      expect(S.cones, 'cones touched').toBe(0);
      expect(S.maxMph).toBeLessThanOrEqual(25.5);
      expect(S.hardBrakes).toBe(0);
    }
  });
});

describe('Road Ready ra33: emergency vehicles', () => {
  const emergencyRun = (id, dt, opts) => {
    const S = drive({ scenario: id });
    if (opts && opts.signal) S.controls.push(opts.signal(S.world));
    for (let i = 0; i < (id === 'highway' ? 30 : 14) / dt; i++) S.step(dt); // up to speed (on the highway: merged)
    const profile = RR.roadProfileAt(S.world, S.station, RR.getContinuousScenarioProfile(id));
    const laneStart = S.lateral;
    const em = Object.assign(actor(S.world, S.station + 78, laneStart, Math.abs(S.car.speed) + 12, 'ambulance'), { kind: 'ambulance', life: 20, responded: false, checked: false, _travelSign: -1, _homeLaneOff: laneStart });
    S.emergency = em;
    let arrivedAt = null, safeAt = null, signalAt = null, t0 = S.t, edgeFirst = null, worstInJunction = null;
    for (let i = 0; i < 30 / dt; i++) {
      // the responder closes, then holds 7 m behind the car until it has room to pass
      const gap = em._roadStation - S.station;
      const lateralGap = Math.abs(S.lateral - em._lat);
      // (once the car has pulled over and stopped, the tool gives the responder a passing line)
      em.speed = (gap > 7.5 || lateralGap > 2.1 || em.responded) ? Math.abs(S.car.speed) + 12 : Math.abs(S.car.speed);
      advance(S.world, [em], dt);
      S.step(dt);
      if (signalAt == null && S.blinker === 1) signalAt = S.t;
      if (edgeFirst == null && Math.abs(S.lateral - laneStart) > 0.4) edgeFirst = S.t;
      if (arrivedAt == null && em._roadStation - S.station < 7.5) arrivedAt = S.t;
      const check = RR.emergencyPullOverAssessment(profile, -1, laneStart, S.lateral, S.car.speed);
      if (safeAt == null && check.safe) { safeAt = S.t; em.responded = true; }
      if (opts && opts.junctionStation != null && Math.abs(S.car.speed) < 0.3 && Math.abs(S.station - opts.junctionStation) < 8) worstInJunction = S.station;
      if (em._roadStation < S.station - 25) S.emergency = null; // gone by
    }
    return { S, arrivedAt, safeAt, signalAt, edgeFirst, t0, worstInJunction };
  };
  it.each(['residential', 'suburban', 'rural', 'night', 'highway'])('%s: signals right, moves to the right side, then stops, in time, without a hard brake; then signals left and drives on', (id) => {
    for (const dt of id === 'residential' ? DTS : [0.1]) {
      const r = emergencyRun(id, dt);
      const label = id + ' dt ' + dt;
      expect(r.signalAt, label + ': right signal').not.toBeNull();
      expect(r.signalAt, label).toBeLessThanOrEqual(r.edgeFirst); // the signal comes before the move
      expect(r.safeAt, label + ': pulled right and stopped (the tool\'s own check)').not.toBeNull();
      if (r.arrivedAt != null) expect(r.safeAt - r.arrivedAt, label + ': inside the tool\'s 8 s').toBeLessThan(8);
      expect(r.S.hardBrakes, label).toBe(0);
      expect(r.S.offRoadSeconds, label + ': on the pavement').toBe(0);
      // after it has gone by, the car comes back into its lane and drives on
      expect(r.S.laneError(), label + ': back in lane').toBeLessThan(0.5);
      expect(r.S.mph, label + ': moving again').toBeGreaterThan(5);
      expect(r.S.blinkerLog.some((b) => b[1] === -1), label + ': left signal to come back').toBe(true);
    }
  });
  it('does not stop inside a junction: it drives through, then pulls over', () => {
    // a stop-controlled junction the car has already stopped for is 16 m ahead when the siren starts
    const r = emergencyRun('night', 0.1, { junctionStation: null });
    expect(r.safeAt).not.toBeNull();
    const block = src.slice(src.indexOf('          // ─── Ride-Along autopilot override ───'), src.indexOf('          // In Park: no movement at all'));
    expect(block).toContain('if (raEmSigAhead > -9 && raEmSigAhead < 22 &&');
    expect(block).toContain('if (raEmJunction && !ras.pulledOver) { raEmergencyHold = false; raEmergencyYield = false; }');
  });
  it('a driver held at a red light or in its queue is not charged for staying put (rrHeldAtControl)', () => {
    const world = RR.createScenarioWorld(RR.SCENARIOS.find((s) => s.id === 'suburban'));
    const station = 40, light = (state) => { const p = RR.mainRoadWorldPoint(world, station - 10, 0); return { x: p.x, y: p.y, type: 'light', state, timer: 0, _phase: state === 'green' ? 'main_green' : state === 'yellow' ? 'main_yellow' : 'cross_green', _crossState: state === 'red' ? 'green' : 'red' }; };
    const lane = RR.scenarioRoadLayout('suburban').laneCenters[1];
    const carAt = (s) => { const p = RR.mainRoadWorldPoint(world, s, lane); return { x: p.x, y: p.y, heading: -Math.PI / 2 - p.heading, speed: 0 }; };
    const line = RR.playerControlApproach(world, light('red'), carAt(station), 4.5).controlCoordinate;
    const atLine = carAt(line + 2.25 + 1);
    expect(RR.rrHeldAtControl(world, atLine, 4.5, [light('red')], [])).toBe(true);
    expect(RR.rrHeldAtControl(world, atLine, 4.5, [light('yellow')], [])).toBe(true);
    expect(RR.rrHeldAtControl(world, atLine, 4.5, [light('green')], [])).toBe(false);
    expect(RR.rrHeldAtControl(world, carAt(line + 40), 4.5, [light('red')], [])).toBe(false); // far from the line: room to pull over
    const queued = carAt(line + 20), ahead = Object.assign(carAt(line + 20 - 7), { type: 'car' });
    expect(RR.rrHeldAtControl(world, queued, 4.5, [light('red')], [ahead])).toBe(true); // in the queue
    expect(RR.rrHeldAtControl(world, queued, 4.5, [light('red')], [Object.assign({}, ahead, { speed: 6 })])).toBe(false);
    expect(src).toContain("} else if (responseTimedOut && stopped && !pulledRight && rrHeldAtControl(infiniteWorldRef.current, car,");
  });
});

describe('Road Ready ra33: cyclists, and slowing without a hard brake', () => {
  it.each([0.1, 0.033])('a cyclist on a straight street is passed with 3 ft or more; on a winding road, in a work zone or with a car coming, the car stays behind; never a hard brake (dt %s)', (dt) => {
    for (const [id, oncoming] of [['residential', false], ['residential', true], ['rural', false], ['suburban', false]]) {
      const S = drive({ scenario: id });
      for (let i = 0; i < 10 / dt; i++) S.step(dt);
      const profile = RR.roadProfileAt(S.world, S.station, RR.getContinuousScenarioProfile(id));
      const riderLane = RR.bicycleLaneOffsetFor(profile, -1);
      const rider = actor(S.world, S.station - 60, riderLane, 12 * RR.MPH_TO_MS, 'cyclist');
      S.cyclists.push(rider);
      const riderSize = RR.vulnerableRoadUserFootprint(rider);
      let closest = Infinity, passed = false;
      for (let i = 0; i < 40 / dt; i++) {
        if (oncoming && i % Math.round(2.5 / dt) === 0) S.traffic.push(actor(S.world, S.station - 70, -RR.roadLayoutFor(profile).laneCenters[0], 10, 'car', 1));
        advance(S.world, [rider].concat(S.traffic), dt);
        S.step(dt);
        const rel = RR.roadAwareRelativePosition(S.world, S.car, rider);
        if (Math.abs(rel.ahead) <= 1.7 && S.car.speed > rider.speed + 0.25) closest = Math.min(closest, RR.worldUnitsToFeet(RR.vehicleSideClearance(S.car, S.size, rider, riderSize)));
        if (rel.ahead < -6) passed = true;
      }
      const label = id + (oncoming ? ' with oncoming traffic' : '') + ' dt ' + dt;
      expect(S.hardBrakes, label).toBe(0);
      expect(closest, label + ': side gap while overtaking, ft').toBeGreaterThanOrEqual(3);
      if (id === 'rural' || oncoming) expect(passed, label + ': stays behind').toBe(false);
      if (id === 'residential' && !oncoming) expect(passed, label + ': passes').toBe(true);
    }
  });

  it('a lower speed target is reached at the comfortable rate; only a stop planner may brake harder', () => {
    const block = src.slice(src.indexOf('          // ─── Ride-Along autopilot override ───'), src.indexOf('          // In Park: no movement at all'));
    expect(block).toContain('brakeInput = Math.min(brakeInput, Math.max(raStopBrake, RR_RIDEALONG_GRIP_SHARE * frictionCoef(scn.weather) / 1.05));');
    // behind a moving leader, closer than the comfort envelope but with room for a firm stop: the comfortable rate
    for (const [gap, v, lead, weather] of [[59, 25.5, 27.9, 'clear'], [30, 16, 15, 'clear'], [40, 13, 13, 'rain'], [45, 8, 8, 'snow']]) {
      const plan = RR.rideAlongFollowPlan(gap, v, lead, 0.1, weather);
      const mu = RR.frictionCoef(weather);
      expect(plan.brake * 1.05 * 9.81, weather + ' ' + gap).toBeLessThanOrEqual(0.3 * mu * 9.81 + 1e-9);
      expect(plan.targetMph).toBeGreaterThanOrEqual(v * RR.MS_TO_MPH - 1.5 - 1e-9);
    }
    // really too close: the planner still brakes as hard as it must
    expect(RR.rideAlongFollowPlan(6, 20, 3, 0.1, 'clear').brake).toBeGreaterThan(0.5);
  });
});
