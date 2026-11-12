import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 32, traffic lane (tr32), item 2. Wave 2 moved Ride-Along's stop signs, red lights and
// pedestrian stops onto a kinematic planner. Railroad crossings, stopped school buses and following
// traffic still used the old speed schedule. This steps the tool's own longitudinal physics (the
// stepper of roadready_db31_ridealong_stop.test.js) through those three with the tool's planner
// and pedals, at dt 0.2 / 0.1 / 0.033 / 0.016, and grades with the tool's own rules.

const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(TOOL, 'utf8');
let RR;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});
const DTS = [0.2, 0.1, 0.033, 0.016];
const cruiseFor = (limitMph, weather) => { let c = Math.max(8, limitMph - 3); if (weather === 'snow') c *= 0.55; else if (weather === 'rain' || weather === 'fog') c *= 0.75; return c; };
// raPlanDistance in the drive loop
const planDistanceFor = (mph, weather) => Math.max(25, RR.stoppingDistance(mph, weather, 0.8).total_ft / RR.FT_PER_M + 8, RR.rideAlongComfortStopMeters ? RR.rideAlongComfortStopMeters(mph * RR.MPH_TO_MS, weather) : 0);
const hardBrakeLine = (weather) => 0.8 * RR.frictionCoef(weather) * 0.92 * 9.81;
const secondsFor = (weather) => (weather === 'rain' ? 5 : weather === 'snow' || weather === 'fog' ? 6 : 4);

// One frame of the tool's longitudinal physics (updatePhysics): returns the distance moved.
function physics(car, pedals, dt, weather, veh) {
  const pr = RR.drivingPedalResponse(car.throttle, car.brake, pedals.throttle, pedals.brake, dt, 'D');
  car.throttle = pr.throttle; car.brake = pr.brake;
  const tire = RR.computeTireDynamics(weather, car.v * RR.MS_TO_MPH, car.brake, 0, { tread32: 7, psi: 32, absEnabled: true }, 0, 1);
  let maxThrust = veh.powerKW * 1000 / Math.max(1, car.v);
  if (car.v < 2) maxThrust = veh.powerKW * 500;
  const thrust = car.throttle * Math.min(maxThrust, veh.mass * tire.mu * 9.81 * 0.6);
  const Fr = RR.rollingForce(veh.mass, RR.rollingCoef(weather, true)), brakeForce = tire.brakingMu * veh.mass * 9.81;
  const accel = RR.longitudinalNetForce(thrust, RR.dragForce(car.v, veh.cd, veh.area) + Fr + brakeForce, car.v, 0) / veh.mass;
  const motion = RR.integrateDrivingMotion(car.v, accel, dt, 'D', car.throttle === 0 && car.brake === 0 ? 0.05 : 0, RR.longitudinalNetForce(thrust, Fr + brakeForce, 0, 0) === 0);
  const before = car.v;
  car.v = motion.speed;
  return { distance: motion.distance, decel: before * RR.MS_TO_MPH >= 10 ? (before - motion.speed) / dt : 0 };
}

// ---- following: the leader cruises, brakes hard to a stop, waits, drives on ----
function follow({ dt, weather = 'clear', limitMph = 25, leadMph = 18, leadBrake = 6, controller = 'tool' }) {
  const veh = RR.VEHICLES.find((v) => v.id === 'sedan');
  const cruise = cruiseFor(limitMph, weather);
  const car = { v: cruise * RR.MPH_TO_MS, throttle: 0, brake: 0 };
  const length = RR.vehicleFootprint('sedan').length;
  const lead = { x: 90, v: leadMph * RR.MPH_TO_MS };
  let x = 0, t = 0, minGap = Infinity, peak = 0, tailgateSeconds = 0, minSeconds = Infinity, settledSeconds = [], stopBehind = null;
  const stopAt = 40, goAt = 58, end = 80;
  for (let i = 0; i < end / dt; i++) {
    t += dt;
    // leader: cruise, then a hard stop, then away again
    if (t >= stopAt && t < goAt) lead.v = Math.max(0, lead.v - leadBrake * RR.frictionCoef(weather) / 0.72 * dt);
    else if (t >= goAt) lead.v = Math.min(leadMph * RR.MPH_TO_MS, lead.v + 1.5 * dt);
    lead.x += lead.v * dt;
    const gap = lead.x - x - length; // bumper to bumper
    const mph = car.v * RR.MS_TO_MPH;
    let target = cruise, stopBrake = 0, pedals;
    const range = Math.max(planDistanceFor(mph, weather), RR.recommendedFollowingMeters(car.v, weather, 1) + 20);
    if (controller === 'old') {
      // the schedule before round 32: seen only inside the plan distance; leader's speed minus up to 14 mph
      if (gap + length < Math.max(25, RR.stoppingDistance(mph, weather, 0.8).total_ft / RR.FT_PER_M + 8)) {
        const desired = RR.recommendedFollowingMeters(car.v, weather, 1);
        if (gap < desired) { const fraction = Math.max(0, Math.min(1, gap / Math.max(1, desired))); let ft = Math.max(0, lead.v * RR.MS_TO_MPH - (1 - fraction) * 14); if (gap < 2) ft = 0; target = Math.min(target, ft); }
      }
      pedals = RR.rideAlongPedals(target, mph, 0);
    } else {
      if (gap + length < range) { const plan = RR.rideAlongFollowPlan(gap, car.v, lead.v, dt, weather); target = Math.min(target, plan.targetMph); stopBrake = plan.brake; }
      pedals = RR.rideAlongPedals(target, mph, stopBrake);
    }
    const step = physics(car, pedals, dt, weather, veh);
    x += step.distance; peak = Math.max(peak, step.decel);
    const after = lead.x - x - length;
    minGap = Math.min(minGap, after);
    if (car.v > 5) {
      const seconds = after / car.v;
      minSeconds = Math.min(minSeconds, seconds);
      // checkCollisions: a tailgate is less than half the safe following distance, above 5 m/s
      if (after * RR.FT_PER_M < RR.safeFollowingFeet(car.v * RR.MS_TO_MPH, weather) * 0.5) tailgateSeconds += dt;
      if (t > 25 && t < stopAt) settledSeconds.push(seconds);
    }
    if (t > goAt - 2 && t < goAt && stopBehind == null && car.v < 0.05) stopBehind = after;
  }
  return { minGap, peak, tailgateSeconds, minSeconds, settled: settledSeconds.length ? Math.min(...settledSeconds) : null, stopBehind, finalMph: car.v * RR.MS_TO_MPH, travelled: x };
}

// ---- railroad: warning active until `clearAt`; distance is front bumper to the stop line ----
function rail({ dt, weather = 'clear', limitMph = 35, vehicleId = 'sedan', warning = true, controller = 'tool' }) {
  const veh = RR.VEHICLES.find((v) => v.id === vehicleId);
  const cruise = cruiseFor(limitMph, weather);
  const car = { v: cruise * RR.MPH_TO_MS, throttle: 0, brake: 0 };
  const bus = RR.railroadRequiresFullStop(vehicleId, {});
  const zone = (50 - 15) * 0.3048; // the stop zone behind the line (15 to 50 ft from the rail)
  let ahead = 120, t = 0, crossedWhileRequired = false, peak = 0, restAt = null, dwell = 0, busDone = false;
  const clearAt = 30;
  for (let i = 0; i < 60 / dt && ahead > -25; i++) {
    t += dt;
    const required = (warning && t < clearAt) || (bus && !busDone);
    const mph = car.v * RR.MS_TO_MPH;
    let target = cruise, stopBrake = 0, pedals;
    if (required && ahead >= -1e-6 && ahead <= planDistanceFor(mph, weather)) {
      if (controller === 'old') {
        let rt = RR.rideAlongApproachSpeedMph(ahead, weather, 1.3);
        const inZone = ahead >= 0 && ahead <= zone;
        if (ahead < 2 || (inZone && car.v < 0.15)) rt = 0;
        target = Math.min(target, rt);
      } else {
        const plan = RR.rideAlongStopPlan(ahead, car.v, dt, weather, 1.0);
        target = Math.min(target, plan.targetMph); stopBrake = plan.brake;
      }
    }
    pedals = RR.rideAlongPedals(target, mph, stopBrake);
    const before = ahead;
    const step = physics(car, pedals, dt, weather, veh);
    ahead -= step.distance; peak = Math.max(peak, step.decel);
    // updateRailroadStop: a continuous 0.8 s below 0.15 m/s inside the zone completes the mandatory stop
    const inZoneNow = ahead >= -1e-6 && ahead <= zone + 1e-6;
    dwell = inZoneNow && car.v < 0.15 ? dwell + dt : 0;
    if (bus && dwell >= 0.8) busDone = true;
    if (car.v < 0.05 && restAt == null && inZoneNow) restAt = ahead;
    // the player block: crossing the line while a stop is required is the violation (and is blocked)
    if (before >= -1e-6 && ahead < -1e-6 && ((warning && t < clearAt) || (bus && !busDone))) crossedWhileRequired = true;
  }
  return { crossedWhileRequired, peak, restAt, zone, finalAhead: ahead, busDone };
}

// ---- stopped school bus with red lights: ahead is centre to centre along the road ----
function busStop({ dt, weather = 'clear', limitMph = 25, vehicleId = 'sedan', controller = 'tool' }) {
  const veh = RR.VEHICLES.find((v) => v.id === vehicleId);
  const cruise = cruiseFor(limitMph, weather);
  const car = { v: cruise * RR.MPH_TO_MS, throttle: 0, brake: 0 };
  const half = RR.vehicleFootprint(vehicleId).length / 2, busHalf = RR.vehicleFootprint('schoolbus').length / 2;
  let ahead = 110, t = 0, peak = 0, closest = Infinity, credited = false, passedMoving = false;
  const lightsOff = 80; // long enough for the slowest approach (snow, 15 mph zone)
  for (let i = 0; i < 130 / dt && ahead > -30; i++) {
    t += dt;
    const active = t < lightsOff;
    const mph = car.v * RR.MS_TO_MPH;
    let target = cruise, stopBrake = 0;
    const lookAhead = Math.max(planDistanceFor(mph, weather), RR.schoolBusApproachDistanceWorld(car.v, weather));
    if (active && ahead > 0 && ahead < lookAhead) {
      if (controller === 'old') {
        const clearance = half + busHalf + 3;
        let bt = RR.rideAlongApproachSpeedMph(ahead, weather, clearance);
        if (ahead < clearance + 1) bt = 0;
        target = Math.min(target, bt);
      } else {
        const plan = RR.rideAlongStopPlan(ahead, car.v, dt, weather, half + busHalf + 2 + 0.5);
        target = Math.min(target, plan.targetMph); stopBrake = plan.brake;
      }
    }
    const before = ahead;
    const step = physics(car, RR.rideAlongPedals(target, mph, stopBrake), dt, weather, veh);
    ahead -= step.distance; peak = Math.max(peak, step.decel);
    if (active) closest = Math.min(closest, ahead);
    // checkBusCompliance: credit for a stop 2 to 12 m before the bus; the violation is crossing its station above 2.3 m/s
    if (active && ahead >= 2 && ahead <= 12 && car.v <= 0.15) credited = true;
    if (active && before > 0 && ahead <= 0 && car.v > 2.3) passedMoving = true;
  }
  return { peak, closest, credited, passedMoving, contactAt: half + busHalf, finalAhead: ahead };
}

describe('Road Ready tr32: Ride-Along behind another vehicle (rideAlongFollowPlan)', () => {
  it.each(DTS)('dry, dt %s: holds the 4-second gap, stops behind a leader that brakes hard, drives on, never tailgates or brakes hard', (dt) => {
    const r = follow({ dt });
    expect(r.minGap, 'contact').toBeGreaterThan(1.5);
    expect(r.tailgateSeconds).toBe(0);
    expect(r.settled, 'gap once settled, in seconds').toBeGreaterThanOrEqual(4 - 0.35);
    expect(r.stopBehind).toBeGreaterThan(2);
    expect(r.stopBehind).toBeLessThan(9);
    expect(r.peak).toBeLessThan(hardBrakeLine('clear'));
    expect(r.finalMph).toBeGreaterThan(10); // it drove on after the leader left
  });

  it.each(['rain', 'fog', 'snow'])('%s: the weather gap (followingSecondsFor) at every frame time', (weather) => {
    for (const dt of DTS) {
      const limitMph = weather === 'snow' ? 35 : 45;
      const r = follow({ dt, weather, limitMph, leadMph: cruiseFor(limitMph, weather) - 5 });
      expect(r.minGap, weather + ' ' + dt).toBeGreaterThan(1.5);
      expect(r.tailgateSeconds, weather + ' ' + dt).toBe(0);
      expect(r.settled, weather + ' ' + dt).toBeGreaterThanOrEqual(secondsFor(weather) - 0.5);
      expect(r.peak, weather + ' ' + dt).toBeLessThan(hardBrakeLine(weather));
    }
    expect(RR.recommendedFollowingMeters(10, weather, 1)).toBeCloseTo(2.5 + 10 * secondsFor(weather), 9); // the tool's table
  });

  it('the schedule it replaces held about 2 seconds, not 4, and braked hard behind the stopping leader (this stepper can fail)', () => {
    const old = follow({ dt: 0.1, controller: 'old' });
    expect(old.settled).toBeLessThan(3.2);
    expect(old.peak).toBeGreaterThan(hardBrakeLine('clear'));
    expect(follow({ dt: 0.1 }).settled).toBeGreaterThan(old.settled + 0.6);
  });

  it('the plan: gap target, the stop "line" where a hard-braking leader would rest, a 3 m standstill gap', () => {
    const v = 10;
    const atGap = RR.rideAlongFollowPlan(RR.recommendedFollowingMeters(v, 'clear', 1), v, v, 0.1, 'clear');
    expect(atGap.targetMph).toBeCloseTo(v * RR.MS_TO_MPH, 3);
    expect(atGap.brake).toBe(0);
    expect(RR.rideAlongFollowPlan(15, v, v, 0.1, 'clear').targetMph).toBeLessThan(v * RR.MS_TO_MPH); // too close: drop back
    const stopped = RR.rideAlongFollowPlan(8, v, 0, 0.1, 'clear'); // a stopped car 8 m ahead at 22 mph
    expect(stopped.brake).toBeGreaterThan(0.5);
    const queue = RR.rideAlongFollowPlan(3.1, 0, 0, 0.1, 'clear');
    expect(queue.hold).toBe(true);
    expect(queue.targetMph).toBe(0);
    expect(RR.rideAlongFollowPlan(2, 0.5, 0.2, 0.1, 'clear').targetMph).toBe(0);
    expect(RR.RR_RIDEALONG_STANDSTILL_GAP_METERS).toBe(3);
  });

  it('the drive loop uses the plan for vehicles and riders, and looks for a leader out to the following gap', () => {
    const ride = src.slice(src.indexOf('          // ─── Ride-Along autopilot override ───'), src.indexOf('            // ─── Narration: announce what the driver is responding to ───'));
    expect(ride).toContain('var raFollowPlan = rideAlongFollowPlan(raClearGap, raSpeedMps,');
    expect(ride).toContain('raStopBrake = Math.max(raStopBrake, raFollowPlan.brake);');
    expect(ride).toContain('recommendedFollowingMeters(raSpeedMps, scn.weather, 1) + 20) &&');
    expect(ride).toContain('var raRiderPlan = rideAlongFollowPlan(raRiderClear, raSpeedMps,');
    expect(ride).toContain('var raCrossPlan = rideAlongStopPlan(raCrossRel.ahead, raSpeedMps, dt, scn.weather, raCrossClearance + 0.5);');
    // nothing in the autopilot plans a stop from the old schedule any more
    expect(ride).not.toContain('rideAlongApproachSpeedMph(');
  });
});

describe('Road Ready tr32: Ride-Along at a railroad crossing (rideAlongStopPlan)', () => {
  it.each(DTS)('active warning, dt %s: stops in the 15 to 50 ft band, never crosses the line while the warning is on, no hard brake', (dt) => {
    for (const weather of ['clear', 'rain', 'snow']) for (const limitMph of [25, 35, 45]) {
      const r = rail({ dt, weather, limitMph });
      const what = weather + ' ' + limitMph + ' dt ' + dt;
      expect(r.crossedWhileRequired, what).toBe(false);
      expect(r.restAt, what).not.toBeNull();
      expect(r.restAt, what).toBeGreaterThanOrEqual(0);
      expect(r.restAt, what).toBeLessThanOrEqual(r.zone);
      expect(r.peak, what).toBeLessThan(hardBrakeLine(weather));
      expect(r.finalAhead, what).toBeLessThan(-5); // it crossed after the warning ended
    }
  });

  it.each(DTS)('school bus, no train, dt %s: the mandatory full stop in the band (0.8 s), then it crosses', (dt) => {
    for (const weather of ['clear', 'snow']) {
      const r = rail({ dt, weather, vehicleId: 'school_bus', warning: false });
      expect(r.crossedWhileRequired, weather).toBe(false);
      expect(r.busDone, weather).toBe(true);
      expect(r.restAt, weather).toBeGreaterThanOrEqual(0);
      expect(r.restAt, weather).toBeLessThanOrEqual(r.zone);
      expect(r.finalAhead, weather).toBeLessThan(-5);
      expect(r.peak, weather).toBeLessThan(hardBrakeLine(weather));
    }
  });

  it('the rule it is graded with is the tool\'s: band 15 to 50 ft from the rail, 0.8 s below 0.15 m/s', () => {
    expect(src).toContain('var RR_RAIL_MIN_CLEARANCE = 15 * 0.3048;');
    expect(src).toContain('var RR_RAIL_MAX_CLEARANCE = 50 * 0.3048;');
    expect(src).toContain('record.timer = approach.inStopZone && Math.abs(vehicle.speed) < 0.15 ? record.timer + dt : 0;');
    expect(src).toContain('record.complete = record.timer >= 0.8;');
    const ride = src.slice(src.indexOf('            var raNearestRail = null;'), src.indexOf('            var raNearestVulnerable = null;'));
    expect(ride).toContain('var raRailPlan = rideAlongStopPlan(raRail.distanceToLine, Math.abs(car.speed), dt, scn.weather, 1.0);');
    expect(ride).toContain('raStopBrake = Math.max(raStopBrake, raRailStopBrake);');
    expect(ride).toContain('if (raRailState.stopRequired && raCrossing._rrTooLateCycle === raRailState.cycle && !raBusStop) raRailMustStop = false;');
  });
});

describe('Road Ready tr32: Ride-Along at a stopped school bus (rideAlongStopPlan)', () => {
  it.each(DTS)('dt %s: stops 2 to 12 m before the bus (the credited stop), never passes it, no hard brake, then drives on', (dt) => {
    for (const weather of ['clear', 'rain', 'snow']) for (const limitMph of [15, 25, 40]) {
      const r = busStop({ dt, weather, limitMph });
      const what = weather + ' ' + limitMph + ' dt ' + dt;
      expect(r.passedMoving, what).toBe(false);
      expect(r.closest, what).toBeGreaterThan(r.contactAt + 1);
      expect(r.credited, what).toBe(true);
      expect(r.peak, what).toBeLessThan(hardBrakeLine(weather));
      expect(r.finalAhead, what).toBeLessThan(-5);
    }
  });

  it('the old schedule braked past the hard-brake line on the same approach', () => {
    const old = busStop({ dt: 0.1, controller: 'old' });
    expect(old.peak).toBeGreaterThan(hardBrakeLine('clear'));
    expect(busStop({ dt: 0.1 }).peak).toBeLessThan(hardBrakeLine('clear'));
  });

  it('the drive loop plans the bus stop with the planner, and skips a bus whose lights came on too late to stop', () => {
    const ride = src.slice(src.indexOf('            // Traffic-aware headway.'), src.indexOf('            var raNearestRail = null;'));
    expect(ride).toContain('var raBusClearance = raPlayerSize.length * 0.5 + tcSize.length * 0.5 + 2;');
    expect(ride).toContain(': rideAlongStopPlan(raBusRequirement.ahead, raSpeedMps, dt, scn.weather, raBusClearance + 0.5);');
    expect(ride).toContain('var raBusPlan = tc._busTooLate ? { targetMph: Infinity, brake: 0 }');
  });
});

describe('Road Ready tr32: Ride-Along yields and passes correctly', () => {
  it('after its full stop it waits for a vehicle in the junction and for a driver who stopped first; it cannot deadlock', () => {
    const sign = { x: 48, y: 50 };
    expect(RR.rrStopSignClearForLearner(sign, [], 10, 11.2)).toBe(true);
    expect(RR.rrStopSignClearForLearner(sign, [{ x: 50, y: 51, speed: 4 }], 10, 11.2)).toBe(false); // crossing now
    expect(RR.rrStopSignClearForLearner(sign, [{ x: 50, y: 51, speed: 0 }], 10, 11.2)).toBe(true);
    const first = { x: 56, y: 51.5, speed: 0, _stopArrivedAt: 8 }; // stopped at this sign 2 s before the learner
    expect(RR.rrStopSignClearForLearner(sign, [first], 10, 11.2)).toBe(false);
    expect(RR.rrStopSignClearForLearner(sign, [Object.assign({}, first, { _stopArrivedAt: 10.5 })], 10, 11.2)).toBe(true); // arrived after the learner
    expect(RR.rrStopSignClearForLearner(sign, [first], 10, 8 + RR.RR_STOP_ORDER_PATIENCE_SECONDS + 4.1)).toBe(true); // patience ran out
    expect(RR.rrStopSignClearForLearner(sign, [Object.assign({}, first, { x: 90 })], 10, 11.2)).toBe(true); // a car at another sign is ignored
    const ride = src.slice(src.indexOf('          // ─── Ride-Along autopilot override ───'), src.indexOf('            // Traffic-aware headway.'));
    expect(ride).toContain('rrStopSignClearForLearner(raControl, trafficRef.current, raStopRecord.stoppedAt, rNow)) {');
  });

  it('a bicycle at the road edge is passed with more than 3 ft and the car stays on its side of the centre line; no room means stay behind', () => {
    const profile = { roadHalfWidth: 3.5 };
    const riderAt = RR.bicycleLaneOffsetFor(profile, -1), rider = RR.vulnerableRoadUserFootprint({ type: 'cyclist' });
    for (const id of ['sedan', 'suv']) {
      const size = RR.vehicleFootprint(id);
      const centre = RR.rideAlongRiderPassOffset(riderAt, rider.width, size.width, profile);
      expect(centre, id).not.toBeNull();
      expect(centre - size.width / 2, id + ': left side of the car').toBeGreaterThanOrEqual(0);
      const gapFt = RR.worldUnitsToFeet(RR.vehicleSideClearance({ x: centre, y: 0, heading: -Math.PI / 2 }, size, { x: riderAt, y: 0, heading: -Math.PI / 2 }, rider));
      expect(gapFt, id).toBeGreaterThan(3.9);
    }
    // a 2.5 m wide school bus cannot leave 3 ft inside a 3.2 m lane: it waits behind the rider
    expect(RR.rideAlongRiderPassOffset(riderAt, rider.width, RR.vehicleFootprint('school_bus').width, profile)).toBeNull();
    // the old riding line (2.8 m, inside the lane) left no legal pass inside the lane at all
    expect(RR.rideAlongRiderPassOffset(2.8, rider.width, 1.8, profile)).toBeNull();
    expect(RR.rideAlongRiderPassOffset(riderAt, rider.width, 1.8, { roadHalfWidth: 4.5, oneWay: true, oneWayLanes: 2 })).toBeNull();
    const ride = src.slice(src.indexOf('            var raCyclists = cyclistsRef.current || [];'), src.indexOf('            // ─── Narration: announce what the driver is responding to ───'));
    expect(ride).toContain('if (raRiderRel.ahead < 20) raTarget = Math.min(raTarget, Math.abs(Number(raRider.speed) || 0) * MS_TO_MPH + 10);');
    expect(ride).toContain('raLaneOffset = (raLaneOffset < 0 ? -1 : 1) * raRiderPassMagnitude;');
  });
});

describe('Road Ready tr32: Ride-Along does not brake hard for things a careful driver sees coming', () => {
  const ride = () => src.slice(src.indexOf('          // ─── Ride-Along autopilot override ───'), src.indexOf('            // ─── Narration: announce what the driver is responding to ───'));

  it('fixed controls are planned from the comfortable stopping distance (a full-grip distance meant a hard brake from 35 mph up)', () => {
    for (const weather of ['clear', 'rain', 'snow']) for (const mph of [15, 25, 35, 45, 62]) {
      const v = mph * RR.MPH_TO_MS;
      const comfort = v * v / (2 * 0.3 * RR.frictionCoef(weather) * 9.81);
      expect(RR.rideAlongComfortStopMeters(v, weather)).toBeCloseTo(comfort + v + 10, 6);
      // the planner's own envelope at that distance is at least the present speed: no braking beyond the comfortable rate is needed
      const plan = RR.rideAlongStopPlan(RR.rideAlongComfortStopMeters(v, weather), v, 0.1, weather, 1.0);
      expect(plan.brake, weather + ' ' + mph).toBe(0);
    }
    expect(ride()).toContain('var raControlDistance = Math.max(raPlanDistance, rideAlongComfortStopMeters(raSpeedMps, scn.weather));');
    expect(ride()).toContain('if (raSignalAhead == null || raSignalAhead <= 0 || raSignalAhead > raControlDistance) continue;');
    expect(ride()).toContain('raBusRequirement.ahead < Math.max(raControlDistance,');
  });

  it('slowing for an emergency vehicle uses the comfortable rate, not the whole pedal (that was a scored hard brake)', () => {
    expect(ride()).toContain('if (raEmergencyYield) raTarget = raSpeedMph > 3 ? Math.min(raTarget, raSpeedMph - 1) : 0;');
    expect(ride()).toContain('var raStopBrake = raEmergencyYield && raSpeedMph > 3 ? 0.3 * frictionCoef(scn.weather) / 1.05 : 0;');
    for (const weather of ['clear', 'rain', 'snow']) {
      const mu = RR.frictionCoef(weather);
      const pedals = RR.rideAlongPedals(29, 30, 0.3 * mu / 1.05);
      expect(pedals.throttle).toBe(0);
      expect(pedals.brake * 1.05 * 9.81).toBeLessThan(hardBrakeLine(weather)); // a whole pedal is 1.05 g (computeTireDynamics)
      // the old command: target 0 at 30 mph asks for the whole pedal
      expect(RR.rideAlongPedals(0, 30, 0).brake).toBe(1);
    }
  });

  it('an oncoming car in its own lane is not planned as an obstacle; a person crossing anywhere on the road is waited for', () => {
    expect(ride()).toContain('Math.abs(raTrafficRel.lateralDifference) >= (raPlayerSize.width + tcSize.width) * 0.5 + 0.6;');
    expect(ride()).toContain('raCrossSideClearance < 0.6 && !raOncomingInOwnLane) {');
    expect(ride()).toContain('var pathWidth = raPlayerSize.width * 0.5 + radius + 0.75 + raHazardPathExtra;');
    expect(ride()).toContain('if (!raPedLeaving && raPedRel.ahead > raPlayerSize.length * 0.5 + 1.7) {');
    expect(ride()).toContain('raHazardPathExtra = roadLayoutFor(raLiveProfile).pavedHalfWidth + 1.5;');
  });

  it('yellow light: go only when the car reaches the line before the red and a comfortable stop is no longer possible', () => {
    expect(ride()).toContain('raControlAhead < rideAlongComfortStopMeters(raSpeedMps, scn.weather) - 10 && raSpeedMps > 1 &&');
    expect(ride()).toContain("raControlAhead / raSpeedMps < (Number(raControl.yellowDur) || 3) - (Number(raControl.timer) || 0) - 0.3) {");
  });
});
