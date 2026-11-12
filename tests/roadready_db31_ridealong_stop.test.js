import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 31, debrief lane (db31), item 6. In a slow-frame Ride-Along run (about 4 frames a
// second; the drive loop caps a frame at 0.1 s) the automatic driver rolled the first stop sign:
// "ROLLING STOP! -20 safety". Its stopping point depended on how far the car moved in one frame.
//
// This steps the tool's own longitudinal physics (pedal response, tire model, net force, motion
// integration: the functions updatePhysics calls) through a stop sign with the tool's own
// Ride-Along planner and pedals, at several frame times, and grades the result with the rule
// checkSignalCompliance applies: a full stop is speed <= 0.15 m/s for 0.5 s with the car's centre
// within 1.5 m of the stop position; crossing the line faster than 0.3 m/s without one is a
// rolling stop.

const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(TOOL, 'utf8');
let RR;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

// The Ride-Along controller before round 31 (kept only as a fixture: it shows that this
// stepper reproduces the failure the play-through found, so the test below can fail).
function oldController(RRx, ahead, speedMph, weather, record, now) {
  let target = Infinity;
  if (!record.complete) {
    let stopTarget = RRx.rideAlongApproachSpeedMph(ahead, weather, 1.2);
    if (ahead < 1.8) stopTarget = 0;
    target = stopTarget;
    if (ahead < 2.2 && speedMph < 0.7) {
      if (record.stoppedAt == null) record.stoppedAt = now;
      if (now - record.stoppedAt >= 1.2) record.complete = true;
    } else if (speedMph >= 0.7) record.stoppedAt = null;
  }
  return { target, pedals(t, v) {
    const err = t - v;
    if (t <= 0.5) return { throttle: 0, brake: v > 0.35 ? Math.min(1, 0.25 + v / 18) : 0.18 };
    if (err > 2) return { throttle: Math.min(0.85, err / 12), brake: 0 };
    if (err < -2) return { throttle: 0, brake: Math.min(0.85, -err / 14) };
    return { throttle: v < t ? 0.1 : 0, brake: 0 };
  } };
}

// One Ride-Along approach to a stop sign. Returns what the stop-sign check would record.
function drive({ dt, weather = 'clear', limitMph = 25, startAhead = 90, controller = 'tool', vehicleId = 'sedan' }) {
  const veh = RR.VEHICLES.find((v) => v.id === vehicleId);
  const mu0 = RR.frictionCoef(weather);
  let cruise = Math.max(8, limitMph - 3);
  if (weather === 'snow') cruise *= 0.55; else if (weather === 'rain' || weather === 'fog') cruise *= 0.75;
  const car = { v: cruise * RR.MPH_TO_MS, throttle: 0, brake: 0 };
  let ahead = startAhead; // front bumper to the stop line, metres
  let now = 0;
  const record = { stoppedAt: null, complete: false };
  const sign = { stopped: false, violated: false, fullStopStartedAt: null, stopAhead: null, crossedAtMps: null };
  let peakDecel = 0;
  for (let i = 0; i < 60 / dt && ahead > -25; i++) {
    now += dt;
    const mph = car.v * RR.MS_TO_MPH;
    // the planner sees the control only while the line is ahead and inside the plan distance
    // (raPlanDistance in the tool's loop: at least 25 m, or the stopping distance plus 8 m)
    const planDistance = Math.max(25, RR.stoppingDistance(mph, weather, 0.8).total_ft / RR.FT_PER_M + 8);
    let target = cruise, pedals;
    if (ahead > 0 && ahead <= planDistance && !record.complete) {
      if (controller === 'old') {
        const o = oldController(RR, ahead, mph, weather, record, now);
        target = Math.min(target, o.target);
        pedals = o.pedals(target, mph);
      } else {
        const plan = RR.rideAlongStopPlan(ahead, car.v, dt, weather, 0.7);
        target = Math.min(target, plan.targetMph);
        if (plan.hold && car.v <= 0.15) {
          if (record.stoppedAt == null) record.stoppedAt = now;
          if (now - record.stoppedAt >= 1.2) record.complete = true;
        } else if (mph >= 0.7 || !plan.hold) record.stoppedAt = null;
        pedals = RR.rideAlongPedals(target, mph, plan.brake);
      }
    } else {
      pedals = controller === 'old' ? oldController(RR, 99, mph, weather, { complete: true }, now).pedals(target, mph) : RR.rideAlongPedals(target, mph, 0);
    }
    // ---- the tool's longitudinal physics for one frame (updatePhysics) ----
    const pr = RR.drivingPedalResponse(car.throttle, car.brake, pedals.throttle, pedals.brake, dt, 'D');
    car.throttle = pr.throttle; car.brake = pr.brake;
    const tire = RR.computeTireDynamics(weather, car.v * RR.MS_TO_MPH, car.brake, 0, { tread32: 7, psi: 32, absEnabled: true }, 0, 1);
    let maxThrust = veh.powerKW * 1000 / Math.max(1, car.v);
    if (car.v < 2) maxThrust = veh.powerKW * 500;
    const thrust = car.throttle * Math.min(maxThrust, veh.mass * tire.mu * 9.81 * 0.6);
    const Fd = RR.dragForce(car.v, veh.cd, veh.area);
    const Fr = RR.rollingForce(veh.mass, RR.rollingCoef(weather, true));
    const brakeForce = tire.brakingMu * veh.mass * 9.81;
    const accel = RR.longitudinalNetForce(thrust, Fd + Fr + brakeForce, car.v, 0) / veh.mass;
    const stopAtRest = RR.longitudinalNetForce(thrust, Fr + brakeForce, 0, 0) === 0;
    const motion = RR.integrateDrivingMotion(car.v, accel, dt, 'D', car.throttle === 0 && car.brake === 0 ? 0.05 : 0, stopAtRest);
    // the hard-brake rule only counts braking at 10 mph or more (RR_HARD_BRAKE_MIN_MPH)
    if (car.v * RR.MS_TO_MPH >= 10) peakDecel = Math.max(peakDecel, (car.v - motion.speed) / dt);
    const prevAhead = ahead;
    car.v = motion.speed;
    ahead -= motion.distance;
    // ---- checkSignalCompliance, stop-sign branch ----
    const atStopLine = Math.abs(ahead - 0.25) < 1.5; // car centre vs. vehicleStopCenterCoordinate
    if (atStopLine && car.v <= 0.15) {
      if (sign.fullStopStartedAt == null) sign.fullStopStartedAt = now;
      if (!sign.stopped && now - sign.fullStopStartedAt >= 0.5) { sign.stopped = true; sign.stopAhead = ahead; }
    } else if (car.v > 0.3) sign.fullStopStartedAt = null;
    if (!sign.violated && prevAhead > 0 && ahead <= 0 && car.v > 0.3 && !sign.stopped) { sign.violated = true; sign.crossedAtMps = car.v; }
  }
  return { ...sign, finalAhead: ahead, complete: record.complete, peakDecel, hardBrakeAt: 0.8 * mu0 * 0.92 * 9.81 };
}

describe('Road Ready db31: the stop rule this test grades with is the one in the tool', () => {
  it('checkSignalCompliance still uses 1.5 m / 0.15 m/s / 0.5 s / 0.3 m/s, and the stop position is 0.25 m behind the line', () => {
    const check = src.slice(src.indexOf('        var checkSignalCompliance = function'), src.indexOf('        var updatePeds = function'));
    expect(check).toContain('var atStopLine = stopDistance < 1.5 && approach.sameRoad;');
    expect(check).toContain('if (atStopLine && stoppedSpeed <= 0.15) {');
    expect(check).toContain('timeRef.current - s._fullStopStartedAt >= 0.5');
    expect(check).toContain('if (!s._violated && crossed && stoppedSpeed > 0.3 && !s._stopped) {');
    expect(src).toContain('return intersectionStopLineCoordinate(intersectionCenter, direction) - direction * (frontOverhang + 0.25);');
    // and the frame is capped at 0.1 s, so 4 fps runs the planner at dt = 0.1
    expect(src).toContain('var dt = Math.min(0.1, (now - lastT) / 1000);');
  });

  it('the stepper reproduces the play-through: the old controller rolls the stop sign at dt 0.1', () => {
    const r = drive({ dt: 0.1, controller: 'old' });
    expect(r.violated).toBe(true);
    expect(r.stopped).toBe(false);
  });
});

describe('Road Ready db31: Ride-Along comes to a complete stop at any frame rate (item 6)', () => {
  const DTS = [0.2, 0.1, 0.05, 0.033, 0.016];

  it.each(DTS)('dry road, dt %s: a full stop inside the stop box, no rolling stop', (dt) => {
    const r = drive({ dt });
    expect(r.violated, 'rolled the stop sign at ' + (r.crossedAtMps || 0).toFixed(2) + ' m/s').toBe(false);
    expect(r.stopped).toBe(true);
    expect(r.complete).toBe(true); // the autopilot's own dwell finished, so it drives on
    expect(r.stopAhead).toBeGreaterThan(0); // the front bumper is behind the line
    expect(r.stopAhead).toBeLessThan(1.75);
    expect(r.finalAhead).toBeLessThan(-5); // and it did drive on afterwards
  });

  it.each(['rain', 'fog', 'snow'])('%s: the same at dt 0.2, 0.1, 0.033 and 0.016', (weather) => {
    for (const dt of [0.2, 0.1, 0.033, 0.016]) {
      const r = drive({ dt, weather });
      expect(r.violated, weather + ' dt ' + dt).toBe(false);
      expect(r.stopped, weather + ' dt ' + dt).toBe(true);
      expect(r.complete, weather + ' dt ' + dt).toBe(true);
    }
  });

  it('other speed limits and the school bus (longest vehicle) also stop, at dt 0.2 and 0.016', () => {
    for (const dt of [0.2, 0.016]) for (const limitMph of [15, 35, 45]) for (const vehicleId of ['sedan', 'school_bus']) {
      const r = drive({ dt, limitMph, vehicleId, startAhead: 160 });
      expect(r.violated, dt + ' ' + limitMph + ' ' + vehicleId).toBe(false);
      expect(r.stopped, dt + ' ' + limitMph + ' ' + vehicleId).toBe(true);
    }
  });

  it('the stop lands in nearly the same place at every frame rate', () => {
    const at = DTS.map((dt) => drive({ dt }).stopAhead);
    expect(Math.max(...at) - Math.min(...at)).toBeLessThan(0.6);
  });

  it('it is a normal stop, not a hard brake (the old schedule braked past the hard-brake line)', () => {
    expect(src).toContain('var RR_HARD_BRAKE_MIN_MPH = 10;');
    for (const weather of ['clear', 'rain', 'snow']) for (const dt of DTS) {
      const r = drive({ dt, weather });
      expect(r.peakDecel, weather + ' dt ' + dt).toBeLessThan(r.hardBrakeAt);
    }
    expect(drive({ dt: 0.1, controller: 'old' }).peakDecel).toBeGreaterThan(drive({ dt: 0.1 }).hardBrakeAt);
  });

  it('the planner: far away it does not brake; past the envelope it brakes; in the box it holds', () => {
    const far = RR.rideAlongStopPlan(80, 9, 0.1, 'clear', 0.7);
    expect(far.brake).toBe(0);
    expect(far.hold).toBe(false);
    const late = RR.rideAlongStopPlan(6, 9, 0.1, 'clear', 0.7);
    expect(late.brake).toBeGreaterThan(0.5);
    const box = RR.rideAlongStopPlan(0.9, 0.4, 0.1, 'clear', 0.7);
    expect(box.hold).toBe(true);
    expect(box.targetMph).toBe(0);
    expect(box.brake).toBeGreaterThanOrEqual(0.3);
    // a slower frame means braking begins farther out, never later
    const a = RR.rideAlongStopPlan(20, 9, 0.016, 'clear', 0.7), b = RR.rideAlongStopPlan(20, 9, 0.2, 'clear', 0.7);
    expect(b.targetMph).toBeLessThan(a.targetMph);
    // the stop brake always beats the throttle
    expect(RR.rideAlongPedals(20, 5, 0.4)).toEqual({ throttle: 0, brake: 0.4 });
    expect(RR.rideAlongPedals(20, 5, 0).throttle).toBeGreaterThan(0);
  });

  // A pedestrian (or animal, or crossing rider) standing in the lane. In the tool, rel.ahead is centre to centre and
  // the plan keeps clearance = half the car + the person's radius + 0.9 m; contact is at half the car + the radius.
  it.each(['clear', 'rain', 'snow'])('a person standing in the lane (%s): the car stops short at every frame rate, without a hard brake', (weather) => {
    const veh = RR.VEHICLES.find((v) => v.id === 'sedan');
    const halfCar = RR.vehicleFootprint('sedan').length / 2, radius = 0.3;
    const clearance = halfCar + radius + 0.9;
    for (const dt of [0.2, 0.1, 0.033, 0.016]) {
      let cruise = 22; if (weather === 'snow') cruise *= 0.55; else if (weather === 'rain') cruise *= 0.75;
      const car = { v: cruise * RR.MPH_TO_MS, throttle: 0, brake: 0 };
      let ahead = 80, closest = Infinity, peak = 0, stoppedFor = 0;
      for (let i = 0; i < 40 / dt; i++) {
        const mph = car.v * RR.MS_TO_MPH;
        const planDistance = Math.max(25, RR.stoppingDistance(mph, weather, 0.8).total_ft / RR.FT_PER_M + 8);
        let target = cruise, stopBrake = 0;
        if (ahead > 0 && ahead <= planDistance) { const plan = RR.rideAlongStopPlan(ahead, car.v, dt, weather, clearance + 0.5); target = Math.min(target, plan.targetMph); stopBrake = plan.brake; }
        const pedals = RR.rideAlongPedals(target, mph, stopBrake);
        const pr = RR.drivingPedalResponse(car.throttle, car.brake, pedals.throttle, pedals.brake, dt, 'D');
        car.throttle = pr.throttle; car.brake = pr.brake;
        const tire = RR.computeTireDynamics(weather, mph, car.brake, 0, { tread32: 7, psi: 32, absEnabled: true }, 0, 1);
        let maxThrust = veh.powerKW * 1000 / Math.max(1, car.v); if (car.v < 2) maxThrust = veh.powerKW * 500;
        const thrust = car.throttle * Math.min(maxThrust, veh.mass * tire.mu * 9.81 * 0.6);
        const Fr = RR.rollingForce(veh.mass, RR.rollingCoef(weather, true)), brakeForce = tire.brakingMu * veh.mass * 9.81;
        const accel = RR.longitudinalNetForce(thrust, RR.dragForce(car.v, veh.cd, veh.area) + Fr + brakeForce, car.v, 0) / veh.mass;
        const motion = RR.integrateDrivingMotion(car.v, accel, dt, 'D', car.throttle === 0 && car.brake === 0 ? 0.05 : 0, RR.longitudinalNetForce(thrust, Fr + brakeForce, 0, 0) === 0);
        if (mph >= 10) peak = Math.max(peak, (car.v - motion.speed) / dt);
        car.v = motion.speed; ahead -= motion.distance;
        closest = Math.min(closest, ahead);
        if (car.v <= 0.05) stoppedFor += dt;
      }
      expect(closest, weather + ' dt ' + dt + ': contact').toBeGreaterThan(halfCar + radius + 0.2);
      expect(closest, weather + ' dt ' + dt + ': stops near the hazard, not far short').toBeLessThan(clearance + 1.0);
      expect(stoppedFor, weather + ' dt ' + dt).toBeGreaterThan(5);
      expect(peak, weather + ' dt ' + dt + ': hard brake').toBeLessThan(0.8 * RR.frictionCoef(weather) * 0.92 * 9.81);
    }
    const ride = src.slice(src.indexOf('            var raPlanFullStopFor = function(actor, radius, key, label) {'), src.indexOf('            var raPeds = pedsRef.current || [];'));
    expect(ride).toContain('var hazardPlan = rideAlongStopPlan(rel.ahead, raSpeedMps, dt, scn.weather, clearance + 0.5);');
    expect(ride).toContain('raStopBrake = Math.max(raStopBrake, hazardPlan.brake);');
  });

  it('the drive loop uses the planner for stop signs and red lights, and counts the stop only inside the box', () => {
    const ride = src.slice(src.indexOf('          // ─── Ride-Along autopilot override ───'), src.indexOf('            // Traffic-aware headway.'));
    expect(ride).toContain('var raStopPlan = rideAlongStopPlan(raControlAhead, raSpeedMps, dt, scn.weather, 0.7);');
    expect(ride).toContain('if (raStopPlan.hold && raSpeedMps <= 0.15) {');
    expect(ride).toContain('var raLightPlan = rideAlongStopPlan(raControlAhead, raSpeedMps, dt, scn.weather, 1.0);');
    expect(src).toContain('var raPedals = rideAlongPedals(raTarget, raSpeedMph, raStopBrake);');
  });
});
