import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 40, lane_shoulder (sh40). Found in the confirmation sweep (dawn s2 t 117, -10 crash "into vehicle"):
// an AI truck pulled over for a fire truck stood at the AI shoulder line (3.53 m) of a one-lane road; its
// body reached to 2.53 m, and Ride-Along keeping its lane (1.58 m, body to 2.48 m) drove past it with 0.03 m
// to spare and touched it. Round 39 (bk39) made Ride-Along follow a vehicle whose body reaches INTO its
// path; one that comes within 0.15 m of the car's side on the line it follows is a leader too now. Steps the REAL
// Ride-Along block (cut from the source, as roadready_bk39_ridealong_rider does).
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
    const S = { car, scn, world, size, t: 0, dist: 0, traffic: [], hardBrakes: 0, lastAccel: 0,
      ras: { lastNarration: 0, lastSignalId: null, lastCellAnnounced: -999, announcedHazards: {}, stopControls: {}, lastBusKey: null, lastRailKey: null, autoSignal: 0 } };
    const scope = Object.assign({}, RR, {
      rideAlongSupportsScenario: () => true,
      rideAlongRef: { current: true }, d: { freeExplore: false }, infiniteWorldRef: { current: world },
      rideAlongStateRef: { current: S.ras }, timeRef: { current: 0 }, graceRef: { current: { until: 4 } },
      car, veh, scn, emergencyRef: { current: null }, signalsRef: { current: [] }, trafficRef: { current: S.traffic },
      pedsRef: { current: [] }, wildlifeRef: { current: null }, cyclistsRef: { current: [] },
      blinkerRef: { current: 0 }, gearRef: { current: 'P' }, setDriveGearUi() {},
      applyTurnSignal(next) { scope.blinkerRef.current = next; },
      speak() {}, __alloT(key, fallback) { return fallback; }
    });
    S.step = function (dt) {
      scope.timeRef.current = S.t; scope.dt = dt; scope.gear = scope.gearRef.current;
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
      const line = -Math.max(0.5, RR.frictionCoef(scn.weather) * 0.92 * 9.81) * 0.8;
      if (car.brake > 0 && accel < line && mph >= RR.RR_HARD_BRAKE_MIN_MPH && S.lastAccel >= line && S.t > 5) S.hardBrakes++;
      S.lastAccel = accel;
      S.t += dt; S.dist += Math.abs(motion.distance);
      const f = RR.mainRoadLocalPoint(world, car.x, car.y);
      S.station = f.longitudinal; S.lateral = f.lateral;
      return S;
    };
    return S;
  };
}
const actor = (world, station, lateral, type) => { const p = RR.mainRoadWorldPoint(world, station, lateral); return { x: p.x, y: p.y, heading: -Math.PI / 2 - p.heading, speed: 0, type, laneOffset: lateral, _roadStation: station, id: 'pulled_' + type }; };

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  drive = makeStepper();
});

// a vehicle stopped where the AI pulls over for an emergency vehicle (trafficRightShoulderOffset), 70 m ahead
function meet(scenario, type, dt, lateral) {
  const S = drive({ scenario });
  for (let i = 0; i < 12 / dt; i++) S.step(dt);
  const profile = RR.roadProfileAt(S.world, S.station, RR.getContinuousScenarioProfile(scenario));
  const size = RR.vehicleFootprint(type);
  const lat = lateral != null ? lateral(S, size) : RR.trafficRightShoulderOffset(profile, -1);
  const v = actor(S.world, S.station - 70, lat, type);
  S.traffic.push(v);
  let contact = false, minSide = Infinity;
  for (let i = 0; i < 25 / dt; i++) {
    S.step(dt);
    if (RR.vehicleRectsOverlap(S.car, S.size, v, size)) contact = true;
    const rel = RR.roadAwareRelativePosition(S.world, S.car, v);
    if (Math.abs(rel.ahead) < (S.size.length + size.length) / 2) minSide = Math.min(minSide, RR.vehicleSideClearance(S.car, S.size, v, size));
  }
  return { S, contact, minSide, rel: RR.roadAwareRelativePosition(S.world, S.car, v), gapAtStart: Math.abs(lat - S.lateral) - (S.size.width + size.width) / 2 };
}

describe('Road Ready sh40: Ride-Along does not squeeze past a vehicle pulled over beside its lane', () => {
  it.each([0.1, 0.033])('one-lane roads (residential, dawn): a truck or a car at the AI pull-over line is followed and stopped behind, not passed with centimetres to spare (dt %s)', (dt) => {
    for (const scenario of ['residential', 'dawn']) for (const type of ['truck', 'car']) {
      const r = meet(scenario, type, dt);
      const why = scenario + ' ' + type + ' gap ' + r.gapAtStart.toFixed(2) + ' minSide ' + r.minSide;
      expect(r.contact, why).toBe(false);
      expect(r.rel.ahead, why + ': stopped behind it').toBeGreaterThan(0);
      expect(Math.abs(r.S.car.speed), why).toBeLessThan(0.15);
      expect(r.S.hardBrakes, why).toBe(0);
    }
  });

  it('guard: a vehicle 0.4 m clear of the car\'s side is still passed (as bk39\'s 0.3 m van), and so is a car in the next lane of a two-lane road', () => {
    const r = meet('residential', 'car', 0.1, (S, size) => S.lateral + (S.size.width + size.width) / 2 + 0.4);
    expect(r.contact).toBe(false);
    expect(r.rel.ahead, 'passed it').toBeLessThan(0);
    const next = meet('suburban', 'car', 0.1, (S) => S.lateral - 3.1);
    expect(next.rel.ahead, 'passed the car in the inner lane').toBeLessThan(0);
  });
});
