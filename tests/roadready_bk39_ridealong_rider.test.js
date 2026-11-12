import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 39, lane_bike (bk39). Ride-Along around bicycles on the suburban road. Steps the REAL Ride-Along
// block of updatePhysics (cut from the tool's source, as tests/roadready_ra33_ridealong.test.js does)
// with the tool's own physics functions on the tool's own scenario road.
//  A. A rider waiting at the road edge before a red stop line, 12 m ahead, with the turned-body gap under
//     3 ft + 0.2 m: Ride-Along set its target to "rider speed - 2 mph" = 0 with no stop plan, and the
//     zero-target pedal (0.25 + mph / 18) was a scored hard brake (round 38 sweep: rain s1 t 97, suburban
//     s5 t 22; same geometry here: 11 to 12 mph, the rider 11.6 m ahead body to body).
//  B. The emergency pull-over moved the car onto a rider coming up on its right (round 38 suburban s9).
// Maine 29-A §2070(1-A): "leaving a distance between the motor vehicle and the bicycle ... of not less than
// 3 feet while the motor vehicle is passing"; §2054(4): "as near as practicable to the right-hand curb".
const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(TOOL, 'utf8');
let RR, drive;

function makeStepper() {
  const a = src.indexOf('          // ─── Ride-Along autopilot override ───');
  const b = src.indexOf('          // In Park: no movement at all');
  if (a < 0 || b < a) throw new Error('Ride-Along block not found');
  const run = new Function('scope', 'with (scope) { var throttleInput = 0, brakeInput = 0, steerLeft = 0, steerRight = 0, gpSteer = 0;\n' + src.slice(a, b) +
    '\nreturn { throttle: throttleInput, brake: brakeInput, steerLeft: steerLeft, steerRight: steerRight }; }');
  return function (opts) {
    const scn = Object.assign({}, RR.SCENARIOS.find((s) => s.id === opts.scenario), opts.weather ? { weather: opts.weather } : {});
    const world = RR.createScenarioWorld(scn);
    const veh = RR.VEHICLES.find((v) => v.id === 'sedan');
    const size = RR.vehicleFootprint(veh.id);
    const pose = RR.drivingStartPose(world, scn.id, Math.floor(96 * 0.85));
    const car = { x: pose.x, y: pose.y, heading: pose.heading, speed: 0, throttle: 0, brake: 0, steering: 0 };
    const S = { car, scn, world, size, t: 0, dist: 0, blinker: 0, traffic: [], cyclists: [], controls: [], emergency: null, hardBrakes: 0, lastAccel: 0, hbLog: [],
      ras: { lastNarration: 0, lastSignalId: null, lastCellAnnounced: -999, announcedHazards: {}, stopControls: {}, lastBusKey: null, lastRailKey: null, autoSignal: 0 } };
    const grace = 4;
    const scope = Object.assign({}, RR, {
      rideAlongSupportsScenario: () => true,
      rideAlongRef: { current: true }, d: { freeExplore: false }, infiniteWorldRef: { current: world },
      rideAlongStateRef: { current: S.ras }, timeRef: { current: 0 }, graceRef: { current: { until: grace } },
      car, veh, scn, emergencyRef: { current: null }, signalsRef: { current: S.controls }, trafficRef: { current: S.traffic },
      pedsRef: { current: [] }, wildlifeRef: { current: null }, cyclistsRef: { current: S.cyclists },
      blinkerRef: { current: 0 }, gearRef: { current: 'P' }, setDriveGearUi() {},
      applyTurnSignal(next) { scope.blinkerRef.current = next; S.blinker = next; },
      speak() {}, __alloT(key, fallback) { return fallback; }
    });
    S.step = function (dt) {
      scope.timeRef.current = S.t; scope.dt = dt; scope.gear = scope.gearRef.current;
      scope.emergencyRef.current = S.emergency;
      const input = run(scope);
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
      const eff = Math.min(1, latAvail / Math.max(0.001, geo.lateralAcceleration)) * tire.steeringFactor * surf.steeringMultiplier;
      const fp = RR.integrateDrivingPose(car.heading, motion.distance, geo.curvature * eff);
      car.heading = fp.heading; car.x += fp.dx; car.y += fp.dy;
      // the tool's hard-brake line: 80% of the surface's braking ceiling, from RR_HARD_BRAKE_MIN_MPH up
      const line = -Math.max(0.5, RR.frictionCoef(scn.weather) * 0.92 * 9.81) * 0.8;
      if (car.brake > 0 && accel < line && mph >= RR.RR_HARD_BRAKE_MIN_MPH && S.lastAccel >= line && S.t > 5) { S.hardBrakes++; S.hbLog.push(+S.t.toFixed(1) + 's@' + mph.toFixed(1) + 'mph'); }
      S.lastAccel = accel;
      S.t += dt; S.dist += Math.abs(motion.distance);
      const f = RR.mainRoadLocalPoint(world, car.x, car.y);
      S.station = f.longitudinal; S.lateral = f.lateral; S.mph = Math.abs(car.speed) * RR.MS_TO_MPH;
      return S;
    };
    return S;
  };
}
// a scripted road user that keeps its lane at a constant speed (the learner travels toward smaller stations)
const actor = (world, station, lateral, speedMps, type) => { const p = RR.mainRoadWorldPoint(world, station, lateral); return { x: p.x, y: p.y, heading: -Math.PI / 2 - p.heading, speed: speedMps, type: type || 'car', laneOffset: lateral, _roadStation: station, id: 't' + station, _lat: lateral }; };
const advance = (world, list, dt) => list.forEach((o) => { o._roadStation -= o.speed * dt; const p = RR.mainRoadWorldPoint(world, o._roadStation, o._lat); o.x = p.x; o.y = p.y; o.heading = -Math.PI / 2 - p.heading; });
const lightAt = (world, station) => { const p = RR.mainRoadWorldPoint(world, station, 0); return { x: p.x, y: p.y, type: 'light', state: 'red', timer: 0, _phase: 'cross_green', _crossState: 'green' }; };

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  drive = makeStepper();
});

describe('Road Ready bk39 A: a rider waiting before a red stop line', () => {
  const approach = (weather, dt, ahead, inward) => {
    const S = drive({ scenario: 'suburban', weather });
    for (let i = 0; i < 12 / dt; i++) S.step(dt);
    const profile = RR.roadProfileAt(S.world, S.station, RR.getContinuousScenarioProfile('suburban'));
    const light = lightAt(S.world, S.station - ahead - 12);
    S.controls.push(light);
    const lineSt = RR.playerControlApproach(S.world, light, S.car, S.size.length).controlCoordinate;
    // the rider waits at the road edge just before the line (1.2 m back, as in the sweep snapshots)
    const rider = actor(S.world, lineSt + 1.2, RR.bicycleLaneOffsetFor(profile, -1) - inward, 0, 'cyclist');
    S.cyclists.push(rider);
    const riderSize = RR.vulnerableRoadUserFootprint(rider);
    const r = { S, rider, contact: false, closestBeside: Infinity, closestPassing: Infinity };
    const watch = () => {
      if (RR.vehicleRectsOverlap(S.car, S.size, rider, riderSize)) r.contact = true;
      const rel = RR.roadAwareRelativePosition(S.world, S.car, rider);
      const gapFt = RR.worldUnitsToFeet(RR.vehicleSideClearance(S.car, S.size, rider, riderSize));
      if (Math.abs(rel.ahead) <= (S.size.length + riderSize.length) / 2) {
        r.closestBeside = Math.min(r.closestBeside, gapFt);
        if (S.car.speed > rider.speed + 0.25) r.closestPassing = Math.min(r.closestPassing, gapFt);
      }
    };
    for (let i = 0; i < 25 / dt; i++) { S.step(dt); watch(); }
    r.stoppedMps = Math.abs(S.car.speed);
    r.stopRel = RR.roadAwareRelativePosition(S.world, S.car, rider).ahead;
    // green: the rider rides off at 5 m/s and the car follows or passes it
    Object.assign(light, { state: 'green', _phase: 'main_green', _crossState: 'red' });
    rider.speed = 5;
    const distAtGreen = S.dist;
    for (let i = 0; i < 20 / dt; i++) { advance(S.world, [rider], dt); S.step(dt); watch(); }
    r.afterGreen = S.dist - distAtGreen;
    return r;
  };

  it.each([0.1, 0.033])('clear, rain and snow, from 40 / 60 / 90 m: the stop is planned, never a hard brake; the car stops, never touches the rider, never draws level closer than 3 ft, and drives on at green (dt %s)', (dt) => {
    const bad = [];
    for (const weather of ['clear', 'rain', 'snow']) for (const ahead of [40, 60, 90]) for (const inward of [0, 0.2]) {
      const r = approach(weather, dt, ahead, inward);
      const label = weather + ' from ' + ahead + ' m, rider ' + inward + ' m in';
      if (r.S.hardBrakes) bad.push(label + ': hard brake ' + r.S.hbLog.join(' '));
      if (r.contact) bad.push(label + ': contact');
      if (r.stoppedMps > 0.15) bad.push(label + ': not stopped, ' + r.stoppedMps.toFixed(2));
      if (r.closestBeside < 3) bad.push(label + ': level with the rider at ' + r.closestBeside.toFixed(2) + ' ft');
      if (r.closestPassing < 3) bad.push(label + ': passed at ' + r.closestPassing.toFixed(2) + ' ft');
      if (!(r.afterGreen > 30)) bad.push(label + ': did not drive on after green (' + r.afterGreen.toFixed(1) + ' m)');
    }
    expect(bad).toEqual([]);
  });

  it('the hold-back is planned: behind a waiting rider 11.6 m ahead at 11 to 12 mph the brake stays under the hard-brake line (the old zero target did not); under a moving rider the car still eases below the rider', () => {
    expect(typeof RR.rideAlongRiderHoldBack).toBe('function');
    for (const [weather, mph] of [['rain', 11.1], ['rain', 11.6], ['clear', 12.3], ['clear', 17.6], ['snow', 10]]) {
      const v = mph * RR.MPH_TO_MS, mu = RR.frictionCoef(weather);
      const hardLine = Math.max(0.5, mu * 0.92 * 9.81) * 0.8;
      const hold = RR.rideAlongRiderHoldBack(11.6, v, 0, 0.1, weather, 2);
      const pedals = RR.rideAlongPedals(hold.targetMph, mph, hold.brake);
      expect(hold.targetMph, weather + ' ' + mph).toBeGreaterThan(0.5); // not the zero-target pedal
      // the drive loop's rule above a 0.5 mph target: no harder than the stop plan or the comfortable rate
      const brake = Math.min(pedals.brake, Math.max(hold.brake, RR.RR_RIDEALONG_GRIP_SHARE * mu / 1.05));
      expect(brake * 1.05 * 9.81, weather + ' ' + mph + ': planned deceleration').toBeLessThan(hardLine);
      expect(brake * 1.05 * 9.81).toBeGreaterThan(0); // it does brake
      // what the old rule asked for: target 0, the pedal's 0.25 + mph / 18
      expect(RR.rideAlongPedals(0, mph, 0).brake).toBeCloseTo(Math.min(1, 0.25 + mph / 18), 9);
    }
    // a moving rider: under the rider's speed by the old 2 mph or by the follow plan, whichever is lower
    const moving = RR.rideAlongRiderHoldBack(8, 6, 4, 0.1, 'clear', 2);
    expect(moving.targetMph).toBeLessThanOrEqual(4 * RR.MS_TO_MPH - 2 + 1e-9);
    // in the stop box behind a stopped rider: hold
    expect(RR.rideAlongRiderHoldBack(3.1, 0.05, 0, 0.1, 'clear', 2).targetMph).toBe(0);
    // level with the rider (no room ahead): unchanged, rider speed - ease
    expect(RR.rideAlongRiderHoldBack(0, 3, 2, 0.1, 'clear', -0.4).targetMph).toBeCloseTo(2 * RR.MS_TO_MPH + 0.4, 9);
  });
});

describe('Road Ready bk39 B: the emergency pull-over never moves onto a rider', () => {
  // the rider keeps its line at the road edge and brakes (up to 3 m/s^2) to stay 1.5 m behind a body in
  // its path, so a contact left is one the car made by moving in where the rider was or could not stop
  const riderStep = (S, rider, riderSize, cruise, dt) => {
    const rel = RR.roadAwareRelativePosition(S.world, rider, S.car);
    const clear = rel.ahead - (S.size.length + riderSize.length) / 2;
    let want = cruise;
    if (rel.ahead > 0 && Math.abs(rel.lat) < (S.size.width + riderSize.width) / 2 + 0.3) want = Math.min(cruise, Math.sqrt(Math.max(0, 2 * 3 * (clear - 1.5))));
    rider.speed = want < rider.speed ? Math.max(want, rider.speed - 3 * dt) : Math.min(want, rider.speed + 1 * dt);
  };
  const pullOver = (riderBehind, riderMps, dt) => {
    const S = drive({ scenario: 'suburban' });
    for (let i = 0; i < 14 / dt; i++) S.step(dt);
    const profile = RR.roadProfileAt(S.world, S.station, RR.getContinuousScenarioProfile('suburban'));
    // the rider is met the usual way (seen 90 m ahead); the siren starts when it is riderBehind behind the car
    const rider = actor(S.world, S.station - 90, RR.bicycleLaneOffsetFor(profile, -1), riderMps, 'cyclist');
    S.cyclists.push(rider);
    const riderSize = RR.vulnerableRoadUserFootprint(rider);
    for (let i = 0; i < 60 / dt && RR.roadAwareRelativePosition(S.world, S.car, rider).ahead > -riderBehind; i++) { riderStep(S, rider, riderSize, riderMps, dt); advance(S.world, [rider], dt); S.step(dt); }
    const laneStart = S.lateral;
    const em = Object.assign(actor(S.world, S.station + 78, laneStart, Math.abs(S.car.speed) + 12, 'ambulance'), { kind: 'ambulance', life: 30, responded: false, checked: false, _travelSign: -1, _homeLaneOff: laneStart });
    S.emergency = em;
    const r = { S, contact: null, safeAt: null, heldByRider: false, minGap: Infinity, minLevel: Infinity };
    for (let i = 0; i < 30 / dt; i++) {
      const gap = em._roadStation - S.station;
      const lateralGap = Math.abs(S.lateral - em._lat);
      em.speed = (gap > 7.5 || lateralGap > 2.1 || em.responded) ? Math.abs(S.car.speed) + 12 : Math.abs(S.car.speed);
      // the ambulance passes in the lane; the rider rides on at the road edge
      em._roadStation -= em.speed * dt; const ep = RR.mainRoadWorldPoint(S.world, em._roadStation, em._lat); em.x = ep.x; em.y = ep.y; em.heading = -Math.PI / 2 - ep.heading;
      riderStep(S, rider, riderSize, riderMps, dt);
      advance(S.world, [rider], dt);
      S.step(dt);
      if (r.contact == null && RR.vehicleRectsOverlap(S.car, S.size, rider, riderSize)) r.contact = +S.t.toFixed(1);
      const rel = RR.roadAwareRelativePosition(S.world, S.car, rider);
      // the tool's own overtaking test (checkCyclistPassing): the car faster than the rider, within 1.7 m
      if (Math.abs(rel.ahead) <= 1.7 && S.car.speed > rider.speed + 0.25) r.minGap = Math.min(r.minGap, RR.worldUnitsToFeet(RR.vehicleSideClearance(S.car, S.size, rider, riderSize)));
      if (Math.abs(rel.ahead) <= (S.size.length + riderSize.length) / 2) r.minLevel = Math.min(r.minLevel, RR.worldUnitsToFeet(RR.vehicleSideClearance(S.car, S.size, rider, riderSize)));
      const check = RR.emergencyPullOverAssessment(profile, -1, laneStart, S.lateral, S.car.speed);
      if (r.safeAt == null && check.safe) { r.safeAt = S.t; em.responded = true; }
      if (check.stopped && !check.pulledRight && RR.rrHeldAtControl(S.world, S.car, S.size.length, [], [], [rider])) r.heldByRider = true;
      if (em._roadStation < S.station - 25) S.emergency = null;
    }
    return r;
  };

  it.each([0.1, 0.033])('a rider at the road edge on the right, 25 m ahead to 15 m behind when the siren starts, at 4.5 to 7 m/s: no contact, never overtakes it closer than 3 ft (never level within 1 ft); the car pulls over clear of the rider or stops in lane while the rider is beside; no hard brake (dt %s)', (dt) => {
    const bad = [];
    for (const behind of [-25, -12, -4, 0, 3, 8, 15]) for (const mps of [4.5, 5.5, 7]) {
      const r = pullOver(behind, mps, dt);
      const label = 'rider ' + behind + ' m behind at ' + mps + ' m/s';
      if (r.contact != null) bad.push(label + ': contact at t ' + r.contact);
      if (r.minGap < 3) bad.push(label + ': overtook at ' + r.minGap.toFixed(2) + ' ft');
      if (r.minLevel < 1) bad.push(label + ': level at ' + r.minLevel.toFixed(2) + ' ft');
      if (r.safeAt == null && !r.heldByRider) bad.push(label + ': neither pulled over nor held by the rider');
      if (r.S.hardBrakes) bad.push(label + ': hard brake ' + r.S.hbLog.join(' '));
    }
    expect(bad).toEqual([]);
  });

  it('rideAlongRiderBlocksPullOver: a rider level on the right (the tool\'s own test), or one who will draw level before the move is done', () => {
    expect(typeof RR.rideAlongRiderBlocksPullOver).toBe('function');
    const world = RR.createScenarioWorld(RR.SCENARIOS.find((s) => s.id === 'suburban'));
    const profile = RR.roadProfileAt(world, 100, RR.getContinuousScenarioProfile('suburban'));
    const lane = RR.scenarioRoadLayout('suburban').laneCenters[1], edge = RR.bicycleLaneOffsetFor(profile, -1);
    const car = Object.assign(actor(world, 100, lane, 4, 'sedan'));
    const rider = (behind, mps, lat) => actor(world, 100 + behind, lat == null ? edge : lat, mps, 'cyclist');
    expect(RR.rideAlongRiderBlocksPullOver(world, car, 4.5, [rider(1, 5)], 2)).toBe(true); // level
    expect(RR.rrHeldAtControl(world, car, 4.5, [], [], [rider(1, 5)])).toBe(true); // the same test as the scoring's
    expect(RR.rideAlongRiderBlocksPullOver(world, car, 4.5, [rider(9, 6)], 2.5)).toBe(true); // 2 m/s faster, level in 2.5 s
    expect(RR.rideAlongRiderBlocksPullOver(world, car, 4.5, [rider(9, 6)], 1)).toBe(false); // the move is done first
    expect(RR.rideAlongRiderBlocksPullOver(world, car, 4.5, [rider(9, 3)], 10)).toBe(false); // slower: never level
    expect(RR.rideAlongRiderBlocksPullOver(world, car, 4.5, [rider(1, 5, -edge)], 2)).toBe(false); // on the left
    expect(RR.rideAlongRiderBlocksPullOver(world, car, 4.5, [Object.assign(rider(1, 5), { _hit: true })], 2)).toBe(false);
    expect(RR.rideAlongRiderBlocksPullOver(world, car, 4.5, [], 2)).toBe(false);
  });
});

describe('Road Ready bk39: a vehicle pulled half onto a narrow shoulder is in the car\'s path', () => {
  // round 39 lane sweep, suburban s8 t 91: a van ahead pulled right for a police car to lateral 6.49 on a
  // narrow shoulder; its body still reached 0.1 m into Ride-Along's lane (car at 4.66). Ride-Along took
  // leaders only within 0.45 lane widths of its line (1.4 m) and drove into the van's side (-10 crash, twice).
  const meet = (reach, dt) => {
    const S = drive({ scenario: 'suburban' });
    for (let i = 0; i < 12 / dt; i++) S.step(dt);
    const vanSize = RR.vehicleFootprint('van');
    const lat = S.lateral + (S.size.width + vanSize.width) * 0.5 - reach;
    const van = Object.assign(actor(S.world, S.station - 70, lat, 0, 'van'), { id: 'van1' });
    S.traffic.push(van);
    let contact = false;
    const d0 = S.dist;
    for (let i = 0; i < 25 / dt; i++) { S.step(dt); if (RR.vehicleRectsOverlap(S.car, S.size, van, vanSize)) contact = true; }
    return { S, contact, rel: RR.roadAwareRelativePosition(S.world, S.car, van), driven: S.dist - d0 };
  };
  it.each([0.1, 0.033])('a stopped van 0.1 to 0.4 m into the lane: the car stops behind it, no contact, no hard brake; one 0.3 m clear of the lane is passed (dt %s)', (dt) => {
    for (const reach of [0.1, 0.25, 0.4]) {
      const r = meet(reach, dt);
      expect(r.contact, 'reach ' + reach).toBe(false);
      expect(r.rel.ahead, 'reach ' + reach + ': stopped behind it').toBeGreaterThan(0);
      expect(Math.abs(r.S.car.speed), 'reach ' + reach).toBeLessThan(0.15);
      expect(r.S.hardBrakes, 'reach ' + reach).toBe(0);
    }
    const clear = meet(-0.3, dt);
    expect(clear.contact).toBe(false);
    expect(clear.rel.ahead, 'passed it').toBeLessThan(0);
    expect(clear.S.hardBrakes).toBe(0);
  });
});