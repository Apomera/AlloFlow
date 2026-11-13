import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 41, lane ra41: two Ride-Along faults the round 40 sweep found (lane_shoulder NOTES, F1 and F3).
// F1 (rain s1, -10 emergencyNoPullRight): the car was pulling over for an ambulance when a junction came within
//   the ra33 window (22 m); the rule "clear of any intersection" cancelled the pull-over, the car drifted back and
//   stopped in its lane short of the stop line. Now a pull-over already under way is kept when the car can finish
//   it and stop on the shoulder short of the stop line (rideAlongKeepPullOverAtJunction). Manual p. 10-9: "If you
//   are at an intersection, get out of it before you pull over."
// F3 (rural s4, s5, hard brakes): the rider pass. The pass line was kept for a rider behind the car's rear (s4);
//   a pass "already begun" was finished while the car was slower than the rider and an oncoming car came (s5);
//   an oncoming MOTORCYCLE was not oncoming traffic (it is in the riders' list). Manual p. 8-14, "Taking Dangers
//   One at a Time": "Don't pass yet. Wait until the approaching car passes the bicycle."
// The REAL Ride-Along block is cut from the tool and stepped with the tool's own physics (the ra33 stepper).

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
    const scn = Object.assign({}, RR.SCENARIOS.find((s) => s.id === opts.scenario));
    const world = RR.createScenarioWorld(scn);
    const veh = RR.VEHICLES.find((v) => v.id === 'sedan');
    const size = RR.vehicleFootprint(veh.id);
    const pose = RR.drivingStartPose(world, scn.id, Math.floor(96 * 0.85));
    const car = { x: pose.x, y: pose.y, heading: pose.heading, speed: 0, throttle: 0, brake: 0, steering: 0 };
    const S = { car, scn, veh, world, size, t: 0, traffic: [], cyclists: [], controls: [], emergency: null, hardBrakes: 0, staticHits: 0, lastAccel: 0,
      ras: { lastNarration: 0, lastSignalId: null, lastCellAnnounced: -999, announcedHazards: {}, stopControls: {}, lastBusKey: null, lastRailKey: null, autoSignal: 0 } };
    const grace = 4;
    const scope = Object.assign({}, RR, {
      rideAlongSupportsScenario: () => true,
      rideAlongRef: { current: true }, d: { freeExplore: false }, infiniteWorldRef: { current: world },
      rideAlongStateRef: { current: S.ras }, timeRef: { current: 0 }, graceRef: { current: { until: grace } },
      car, veh, scn, emergencyRef: { current: null }, signalsRef: { current: S.controls }, trafficRef: { current: S.traffic },
      pedsRef: { current: [] }, wildlifeRef: { current: null }, cyclistsRef: { current: S.cyclists },
      blinkerRef: { current: 0 }, gearRef: { current: 'P' }, setDriveGearUi() {},
      applyTurnSignal(next) { scope.blinkerRef.current = next; },
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
      const next = { x: car.x + fp.dx, y: car.y + fp.dy, heading: fp.heading };
      const hit = RR.vehicleGridCollision(next, size, getCell);
      if (hit.hit && hit.cell !== 8) S.staticHits++;
      car.heading = next.heading; car.x = next.x; car.y = next.y;
      // the tool's hard-brake line: 80% of the surface's braking ceiling, from 10 mph up
      const line = -Math.max(0.5, RR.frictionCoef(scn.weather) * 0.92 * 9.81) * 0.8;
      if (car.brake > 0 && accel < line && mph >= RR.RR_HARD_BRAKE_MIN_MPH && S.lastAccel >= line && S.t > 5) S.hardBrakes++;
      S.lastAccel = accel;
      S.t += dt;
      const f = RR.mainRoadLocalPoint(world, car.x, car.y);
      S.station = f.longitudinal; S.lateral = f.lateral; S.mph = Math.abs(car.speed) * RR.MS_TO_MPH;
      return S;
    };
    return S;
  };
}
// a scripted road user that keeps its line at a constant speed (dir -1 = the learner's direction, toward smaller stations)
const actor = (world, station, lateral, speedMps, type, dir) => { const p = RR.mainRoadWorldPoint(world, station, lateral); const sign = dir || -1; return { x: p.x, y: p.y, heading: sign > 0 ? Math.PI / 2 - p.heading : -Math.PI / 2 - p.heading, speed: speedMps, type: type || 'car', laneOffset: lateral, _roadStation: station, id: 't' + station, _lat: lateral, _dir: sign }; };
const advance = (world, list, dt) => list.forEach((o) => { o._roadStation += o._dir * o.speed * dt; const p = RR.mainRoadWorldPoint(world, o._roadStation, o._lat); o.x = p.x; o.y = p.y; o.heading = o._dir > 0 ? Math.PI / 2 - p.heading : -Math.PI / 2 - p.heading; });

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  drive = makeStepper();
});

// The round 40 rain s1 order of events: a light `redAhead` m ahead (the car slows for it), then the ambulance appears
// 78 m behind when the car is `emAt` m from the junction middle. Returns where the car first stops, and whether that
// stop is "pulled right and stopped" by the tool's own check (emergencyPullOverAssessment).
const junctionRun = (id, dt, emAt, state) => {
  const S = drive({ scenario: id });
  for (let i = 0; i < 14 / dt; i++) S.step(dt);
  const sigStation = S.station - 80, sp = RR.mainRoadWorldPoint(S.world, sigStation, 0);
  S.controls.push({ x: sp.x, y: sp.y, type: 'light', state, timer: 0, _phase: state === 'green' ? 'main_green' : 'cross_green', _crossState: state === 'green' ? 'red' : 'green' });
  const stopLine = RR.intersectionStopLineCoordinate(sigStation, -1);
  let em = null, laneStart = null, profile = null, safe = null, firstStop = null, maxLat = -9;
  for (let i = 0; i < 40 / dt; i++) {
    if (!em && S.station - sigStation <= emAt) {
      laneStart = S.lateral; profile = RR.roadProfileAt(S.world, S.station, RR.getContinuousScenarioProfile(id));
      em = Object.assign(actor(S.world, S.station + 78, laneStart, Math.abs(S.car.speed) + 12, 'ambulance'), { kind: 'ambulance', life: 30, responded: false, checked: false, _travelSign: -1, _homeLaneOff: laneStart });
      S.emergency = em;
    }
    if (em && S.emergency) {
      const gap = em._roadStation - S.station, lateralGap = Math.abs(S.lateral - em._lat);
      em.speed = (gap > 7.5 || lateralGap > 2.1 || em.responded) ? Math.abs(S.car.speed) + 12 : Math.abs(S.car.speed);
      advance(S.world, [em], dt);
    }
    S.step(dt);
    if (!em) continue;
    maxLat = Math.max(maxLat, S.lateral);
    const check = RR.emergencyPullOverAssessment(profile, -1, laneStart, S.lateral, S.car.speed);
    const frontBeforeLine = S.station - S.size.length / 2 - stopLine;
    if (firstStop == null && Math.abs(S.car.speed) < 0.3) firstStop = { frontBeforeLine, lat: S.lateral, pulledRight: check.pulledRight };
    if (safe == null && check.safe) { safe = { frontBeforeLine }; em.responded = true; }
    if (em._roadStation < S.station - 25) S.emergency = null;
  }
  return { S, firstStop, safe, laneStart, maxLat };
};

describe('Road Ready ra41 F1: an emergency pull-over under way when a junction comes near is finished short of the stop line', () => {
  it.each(['rain', 'suburban', 'residential', 'night'])('%s, red light ahead: it stops ON THE SHOULDER before the stop line (base: drifted back and stopped in the lane, not pulled right)', (id) => {
    for (const dt of [0.1, 0.033]) {
      const r = junctionRun(id, dt, 32, 'red');
      const label = id + ' dt ' + dt;
      expect(r.firstStop, label).not.toBeNull();
      expect(r.firstStop.pulledRight, label + ': first stop is pulled right').toBe(true);
      expect(r.firstStop.frontBeforeLine, label + ': front bumper before the stop line').toBeGreaterThan(0.3);
      expect(r.safe, label).not.toBeNull();
      expect(r.S.hardBrakes, label).toBe(0);
      expect(r.S.staticHits, label).toBe(0);
    }
  });
  it('residential, green light: room to stop, so it stops on the shoulder short of the junction (base: drove through it first)', () => {
    const r = junctionRun('residential', 0.1, 32, 'green');
    expect(r.firstStop.pulledRight).toBe(true);
    expect(r.firstStop.frontBeforeLine).toBeGreaterThan(0.3);
    expect(r.S.hardBrakes).toBe(0);
  });
  it('guards (as before): not yet under way when the junction comes in: it stays in its lane; too fast to stop short (rain, green): it drives through, then pulls over', () => {
    const notStarted = junctionRun('rain', 0.1, 24, 'red');
    expect(notStarted.maxLat - notStarted.laneStart).toBeLessThan(0.3);
    const fast = junctionRun('rain', 0.1, 32, 'green');
    expect(fast.safe).not.toBeNull();
    expect(fast.safe.frontBeforeLine).toBeLessThan(0); // stopped beyond the junction, as ra33 does
    expect(fast.S.hardBrakes).toBe(0);
  });
  it('rideAlongKeepPullOverAtJunction: decided once per junction, only for a move under way, never past the line', () => {
    const world = RR.createScenarioWorld(RR.SCENARIOS.find((s) => s.id === 'suburban'));
    const profile = RR.roadProfileAt(world, 40, RR.getContinuousScenarioProfile('suburban'));
    const size = RR.vehicleFootprint('sedan');
    const lane = RR.scenarioRoadLayout('suburban').laneCenters[1];
    const sigStation = 20, sp = RR.mainRoadWorldPoint(world, sigStation, 0);
    const light = [{ x: sp.x, y: sp.y, type: 'light', state: 'green', _phase: 'main_green' }];
    const carAt = (s, lat, v) => { const p = RR.mainRoadWorldPoint(world, s, lat); return { x: p.x, y: p.y, heading: -Math.PI / 2 - p.heading, speed: v }; };
    const em = {};
    // under way (the line followed is 0.8 m out), 4 m/s, 18 m from the junction middle: kept, with the stop line distance
    let st = { homeLane: lane, pathOffset: lane + 0.8 };
    const kept = RR.rideAlongKeepPullOverAtJunction(world, carAt(sigStation + 18, lane + 0.3, 4), size, light, st, true, profile, 0.1, 'clear', em);
    expect(kept).not.toBeNull();
    expect(kept.ahead).toBeCloseTo(RR.controlDistanceAhead(world, light[0], carAt(sigStation + 18, lane + 0.3, 4), size.length), 6);
    expect(st._emKeep).toBe(true);
    // the same decision holds as the car stops at the line (no swing back)
    expect(RR.rideAlongKeepPullOverAtJunction(world, carAt(sigStation + 4.1 + 2.25 + 1, lane + 1.2, 0), size, light, st, true, profile, 0.1, 'clear', em)).not.toBeNull();
    // not under way (the line still in the lane): drive on, and that stays the decision for this junction
    st = { homeLane: lane, pathOffset: lane + 0.1 };
    expect(RR.rideAlongKeepPullOverAtJunction(world, carAt(sigStation + 18, lane, 4), size, light, st, true, profile, 0.1, 'clear', em)).toBeNull();
    st.pathOffset = lane + 1;
    expect(RR.rideAlongKeepPullOverAtJunction(world, carAt(sigStation + 16, lane + 0.5, 3), size, light, st, true, profile, 0.1, 'clear', em)).toBeNull();
    // too fast to stop short at 0.45 x grip: drive on
    st = { homeLane: lane, pathOffset: lane + 0.8 };
    expect(RR.rideAlongKeepPullOverAtJunction(world, carAt(sigStation + 18, lane + 0.3, 14), size, light, st, true, profile, 0.1, 'clear', em)).toBeNull();
    // already past the stop line (in the junction): drive on (get out of it first)
    st = { homeLane: lane, pathOffset: lane + 0.8 };
    expect(RR.rideAlongKeepPullOverAtJunction(world, carAt(sigStation + 2, lane + 0.3, 3), size, light, st, true, profile, 0.1, 'clear', em)).toBeNull();
    // out of the window: nothing, and the decision is cleared for the next junction
    expect(RR.rideAlongKeepPullOverAtJunction(world, carAt(sigStation + 18, lane + 0.3, 4), size, light, st, false, profile, 0.1, 'clear', em)).toBeNull();
    expect(st._emKeep).toBeNull();
    // the ra33 rule itself is unchanged; the kept pull-over plans its stop like a red light (margin 1 m)
    const block = src.slice(src.indexOf('          // ─── Ride-Along autopilot override ───'), src.indexOf('          // In Park: no movement at all'));
    expect(block).toContain('if (raEmJunction && !ras.pulledOver) { raEmergencyHold = false; raEmergencyYield = false; }');
    expect(block).toContain('if (raEmKeep) raEmJunction = false;');
    expect(block).toContain('var raEmKeepPlan = rideAlongStopPlan(raEmKeep.ahead, raSpeedMps, dt, scn.weather, 1.0);');
  });
});

// Ride-Along and a cyclist with oncoming traffic. Returns the car's path line, the 3 ft rule as the tool scores it
// (checkCyclistPassing: overtaking, within 1.7 m along the road), rider overlaps, the side clearance to an oncoming
// vehicle when level with it, and hard brakes.
const riderRun = (id, dt, setup) => {
  const S = drive({ scenario: id });
  const W = S.world, lane = RR.scenarioRoadLayout(id).laneCenters[0];
  for (let i = 0; i < setup.warm / dt; i++) S.step(dt);
  const riders = setup.riders(S, W), cars = (setup.cars || (() => []))(S, W);
  riders.forEach((r) => S.cyclists.push(r)); cars.forEach((c) => S.traffic.push(c));
  const R = { lane, towardWithRiderBehind: 0, minPath: 9, minPathOncoming: 9, latLevel: 9, sideLevel: 9, close3ft: 0, overlaps: 0, S };
  let lastPath = null;
  for (let i = 0; i < 25 / dt; i++) {
    advance(W, riders, dt); advance(W, cars, dt);
    S.step(dt);
    const path = S.ras.pathOffset;
    if (path != null) R.minPath = Math.min(R.minPath, path);
    const oncoming = cars.concat(riders.filter((r) => r.type === 'motorcycle'));
    for (const o of oncoming) {
      const rel = RR.roadRelativeTarget(W, S.car, o);
      if (rel.ahead > -4 && rel.ahead < Math.max(40, (Math.abs(S.car.speed) + o.speed) * 5) && path != null) R.minPathOncoming = Math.min(R.minPathOncoming, path);
      if (Math.abs(rel.ahead) < 5) { R.latLevel = Math.min(R.latLevel, S.lateral); R.sideLevel = Math.min(R.sideLevel, RR.vehicleSideClearance(S.car, S.size, o, RR.vehicleFootprint(o.type))); }
    }
    for (const r of riders.filter((x) => x.type === 'cyclist')) {
      const rs = RR.vulnerableRoadUserFootprint(r), rel = RR.roadAwareRelativePosition(W, S.car, r);
      if (RR.vehicleRectsOverlap(S.car, S.size, r, rs)) R.overlaps++;
      if (Math.abs(S.car.speed) > r.speed + 0.25 && Math.abs(rel.ahead) <= 1.7 && RR.worldUnitsToFeet(RR.vehicleSideClearance(S.car, S.size, r, rs)) < 3) R.close3ft++;
      if (rel.ahead < -(S.size.length + rs.length) / 2 && lastPath != null && path < lastPath - 1e-6) R.towardWithRiderBehind++;
    }
    lastPath = path;
  }
  return R;
};
const cyclist = (W, station, v) => Object.assign(actor(W, station, 3.55, v, 'cyclist', -1), { type: 'cyclist' });

describe('Road Ready ra41 F3: the rider pass with oncoming traffic', () => {
  it.each([[6, 4], [5, 5]])('rural, the car sets off with a rider coming up %s m behind at %s m/s: it never moves out toward the centre line for a rider behind its rear (base: out to the pass line, 0.9 m from it)', (behind, v) => {
    for (const dt of [0.1, 0.033]) {
      const r = riderRun('rural', dt, { warm: 3.5, riders: (S, W) => [cyclist(W, S.station + behind, v)] });
      const label = 'dt ' + dt;
      expect(r.towardWithRiderBehind, label).toBe(0);
      expect(r.close3ft, label).toBe(0);
      expect(r.overlaps, label).toBe(0);
      expect(r.S.hardBrakes, label).toBe(0);
    }
  });
  it('rural, set off beside a rider who draws ahead while a car comes the other way: the car stays in its lane until that car has gone (base: kept "its" pass, out to 1.10 m)', () => {
    for (const dt of [0.1, 0.033]) {
      const r = riderRun('rural', dt, { warm: 3.5, riders: (S, W) => [cyclist(W, S.station + 1.1, 6.16)], cars: (S, W) => [actor(W, S.station - 45, -RR.scenarioRoadLayout('rural').laneCenters[0], 6.3, 'car', 1)] });
      const label = 'dt ' + dt;
      expect(r.minPathOncoming, label + ': the line followed while the oncoming car is near').toBeGreaterThan(r.lane - 0.2);
      expect(r.close3ft, label).toBe(0);
      expect(r.overlaps, label).toBe(0);
      expect(r.S.hardBrakes, label).toBe(0);
    }
  });
  it('night, an oncoming MOTORCYCLE: no pass begins while it is near, so the car is in its lane when it comes level (base: 0.8 m from it, out at 1.29 m)', () => {
    for (const dt of [0.1, 0.033]) {
      const r = riderRun('night', dt, { warm: 16, riders: (S, W) => [cyclist(W, S.station - 70, 4), Object.assign(actor(W, S.station - 110, -1.4, 13, 'motorcycle', 1), { type: 'motorcycle' })] });
      const label = 'dt ' + dt;
      expect(r.latLevel, label + ': lateral when level').toBeGreaterThan(r.lane - 0.2);
      expect(r.sideLevel, label + ': side clearance to the motorcycle').toBeGreaterThan(1.2);
      expect(r.close3ft, label).toBe(0);
      expect(r.S.hardBrakes, label).toBe(0);
      // and once it has gone by, the rider is passed (with 3 ft: close3ft above)
      expect(r.minPath, label).toBeLessThan(r.lane - 0.5);
    }
  });
  it('guard: no oncoming traffic: the rider is passed with at least 3 ft (29-A 2070(1-A)), as before', () => {
    const r = riderRun('night', 0.1, { warm: 16, riders: (S, W) => [cyclist(W, S.station - 70, 4)] });
    expect(r.minPath).toBeLessThan(r.lane - 0.5);
    expect(r.close3ft).toBe(0);
    expect(r.overlaps).toBe(0);
    expect(r.S.hardBrakes).toBe(0);
    expect(RR.rideAlongRiderPassOffset(3.55, 0.68, 1.8, RR.getContinuousScenarioProfile('night'))).not.toBeNull();
  });
});
