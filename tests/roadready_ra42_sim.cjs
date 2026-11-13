// Road Ready ra42: a drive-loop stepper for tests. It cuts the REAL code out of the tool's source and steps it in
// the drive loop's order: the Ride-Along block + the tool's own physics (the ra33 stepper), then the flagger-hold
// block of the drive loop, updateSignals, updateTraffic and updateCyclists.
// makeSim(RR, src, { scenario, learner: 'ridealong' | 'scripted' }) -> S
//   S.step(dt); S.traffic, S.cyclists, S.controls, S.world, S.car; S.vehicle(...), S.rider(...), S.flaggerFor(...), S.placeCar(...)
'use strict';

function makeSim(RR, src, opts) {
  opts = opts || {};
  var cut = function(from, to) { var a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('cannot find ' + from); return src.slice(a, b); };
  var scn = Object.assign({}, RR.SCENARIOS.find(function(s) { return s.id === opts.scenario; }));
  var world = RR.createScenarioWorld(scn);
  var veh = RR.VEHICLES.find(function(v) { return v.id === 'sedan'; });
  var size = RR.vehicleFootprint(veh.id);
  var pose = RR.drivingStartPose(world, scn.id, Math.floor(96 * 0.85));
  var car = { x: pose.x, y: pose.y, heading: pose.heading, speed: 0, throttle: 0, brake: 0, steering: 0 };
  var S = { car: car, scn: scn, veh: veh, world: world, size: size, t: 0, traffic: [], cyclists: [], controls: [], hardBrakes: 0, staticHits: 0, lastAccel: 0,
    ras: { lastNarration: 0, lastSignalId: null, lastCellAnnounced: -999, announcedHazards: {}, stopControls: {}, lastBusKey: null, lastRailKey: null, autoSignal: 0 } };
  var time = { current: 0 };
  var scope = Object.assign({}, RR, {
    rideAlongSupportsScenario: function() { return true; },
    rideAlongRef: { current: true }, d: { freeExplore: false }, infiniteWorldRef: { current: world },
    rideAlongStateRef: { current: S.ras }, timeRef: time, graceRef: { current: { until: 0 } },
    car: car, veh: veh, scn: scn, emergencyRef: { current: null }, signalsRef: { current: S.controls }, trafficRef: { current: S.traffic },
    pedsRef: { current: [] }, wildlifeRef: { current: null }, cyclistsRef: { current: S.cyclists },
    blinkerRef: { current: 0 }, gearRef: { current: 'D' }, setDriveGearUi: function() {},
    applyTurnSignal: function(next) { scope.blinkerRef.current = next; },
    speak: function() {}, __alloT: function(key, fallback) { return fallback; },
    RR_CURB_YIELD_HOLD_MAX: RR.RR_CURB_YIELD_HOLD_MAX || 4, currentScenario: scn, currentVehicle: { id: veh.id }, carRef: { current: car },
    statsRef: { current: { safetyScore: 100, crashes: 0 } }, stopSignQueueRef: { current: {} }, intersectionReservationRef: { current: {} },
    blackBoxRef: { current: [] }, addToast: function() {}, audioRef: { current: {} }, eventToastRef: { current: null }
  });
  var a = src.indexOf('          // ─── Ride-Along autopilot override ───');
  var b = src.indexOf('          // In Park: no movement at all');
  if (a < 0 || b < a) throw new Error('Ride-Along block not found');
  var rideAlong = new Function('scope', 'with (scope) { var throttleInput = 0, brakeInput = 0, steerLeft = 0, steerRight = 0, gpSteer = 0;\n' + src.slice(a, b) +
    '\nreturn { throttle: throttleInput, brake: brakeInput, steerLeft: steerLeft, steerRight: steerRight }; }');
  var mk = function(body, name) { return new Function('scope', 'with(scope) {' + body + '\nreturn ' + name + ';}')(scope); };
  var updateTraffic = mk(cut('        var updateTraffic = function(dt) {', '        var updateWildlife = function(dt)'), 'updateTraffic');
  var updateCyclists = mk(cut('        var updateCyclists = function(dt) {', '        // ── Bus stop-arm compliance ──'), 'updateCyclists');
  var hold = new Function('scope', 'with(scope) { return function(dt) {' +
    cut('              // ra33: tell each work-zone flagger who is in', '              updateSignals(signalsRef.current, dt);') + '}; }')(scope);
  var physics = function(dt) {
    scope.dt = dt; scope.gear = scope.gearRef.current;
    var input = opts.learner === 'scripted' ? { throttle: 0, brake: 0, steerLeft: 0, steerRight: 0 } : rideAlong(scope);
    if (opts.learner === 'scripted') {
      // a learner who keeps its line and speed (S.scriptLat, S.car.speed), or stays S.keepNear.offset m from an actor (off the road)
      var here = RR.mainRoadLocalPoint(world, car.x, car.y);
      var nextSt = S.keepNear ? RR.mainRoadLocalPoint(world, S.keepNear.actor.x, S.keepNear.actor.y).longitudinal + S.keepNear.offset : here.longitudinal - Math.abs(car.speed) * dt;
      var p = RR.mainRoadWorldPoint(world, nextSt, S.keepNear ? S.keepNear.lat : S.scriptLat);
      car.x = p.x; car.y = p.y; car.heading = -Math.PI / 2 - p.heading;
      return;
    }
    var gear = scope.gearRef.current;
    var throttleInput = input.throttle, brakeInput = input.brake;
    if (gear === 'P') { throttleInput = 0; car.speed = 0; }
    var pr = RR.drivingPedalResponse(car.throttle, car.brake, throttleInput, brakeInput, dt, gear);
    car.throttle = pr.throttle; car.brake = pr.brake;
    var absSpeed = Math.abs(car.speed), mph = absSpeed * RR.MS_TO_MPH;
    car.steering = RR.drivingResponse(car.steering, (input.steerRight - input.steerLeft) * 0.6, 8 - Math.min(4, absSpeed * 0.1), dt);
    var getCell = function(x, y) { return world.getCell(x, y); };
    var surf = RR.aggregateWheelSurfaceDynamics(RR.sampleVehicleWheelContacts(car, size, getCell, null));
    var tire = RR.computeTireDynamics(scn.weather, mph, car.brake, car.steering, { tread32: 7, psi: 32, absEnabled: true }, 0, surf.gripMultiplier);
    var maxThrust = veh.powerKW * 1000 / Math.max(1, absSpeed); if (absSpeed < 2) maxThrust = veh.powerKW * 500;
    var thrust = car.throttle * Math.min(maxThrust, veh.mass * tire.mu * 9.81 * 0.6);
    var Fr = RR.rollingForce(veh.mass, RR.rollingCoef(scn.weather, true) * surf.rollingMultiplier), brakeForce = tire.brakingMu * veh.mass * 9.81;
    var Fg = veh.mass * 9.81 * RR.drivingRoadGrade(world, car);
    var longForce = RR.longitudinalNetForce(thrust, brakeForce, car.speed, 0);
    var accel = gear === 'P' ? 0 : RR.longitudinalNetForce(thrust, RR.dragForce(absSpeed, veh.cd, veh.area) + Fr + brakeForce, car.speed, Fg) / veh.mass;
    var motion = RR.integrateDrivingMotion(car.speed, accel, dt, gear, car.throttle === 0 && car.brake === 0 && gear === 'D' ? 0.05 : 0, RR.longitudinalNetForce(thrust, Fr + brakeForce, 0, Fg) === 0);
    car.speed = motion.speed;
    var geo = RR.drivingSteeringGeometry(car.speed, car.steering, veh.id);
    var gripAvail = tire.mu * 9.81, used = Math.abs(longForce) / veh.mass;
    var latAvail = Math.sqrt(Math.max(0, gripAvail * gripAvail - used * used));
    var eff = Math.min(1, latAvail / Math.max(0.001, geo.lateralAcceleration)) * tire.steeringFactor * surf.steeringMultiplier;
    var fp = RR.integrateDrivingPose(car.heading, motion.distance, geo.curvature * eff);
    var next = { x: car.x + fp.dx, y: car.y + fp.dy, heading: fp.heading };
    var hit = RR.vehicleGridCollision(next, size, getCell);
    if (hit.hit && hit.cell !== 8) S.staticHits++;
    car.heading = next.heading; car.x = next.x; car.y = next.y;
    var line = -Math.max(0.5, RR.frictionCoef(scn.weather) * 0.92 * 9.81) * 0.8;
    if (car.brake > 0 && accel < line && mph >= RR.RR_HARD_BRAKE_MIN_MPH && S.lastAccel >= line) S.hardBrakes++;
    S.lastAccel = accel;
  };
  S.step = function(dt) {
    time.current = S.t;
    physics(dt);
    S.t += dt; time.current = S.t;
    hold(dt);
    RR.updateSignals(S.controls, dt);
    updateTraffic(dt);
    updateCyclists(dt);
    var f = RR.mainRoadLocalPoint(world, car.x, car.y);
    S.station = f.longitudinal; S.lateral = f.lateral;
    return S;
  };
  S.place = function(o, station, lateral, dir) {
    var p = RR.mainRoadWorldPoint(world, station, lateral);
    o.x = p.x; o.y = p.y; o.heading = (dir > 0 ? Math.PI / 2 : -Math.PI / 2) - p.heading; o._roadStation = station; return o;
  };
  S.vehicle = function(id, type, station, lateral, dir, speed, extra) {
    var o = S.place({ id: id, type: type, laneOffset: lateral, speed: speed, personality: { followMult: 1, speedBias: 1, aggro: 0, rollsStops: 0 } }, station, lateral, dir);
    Object.assign(o, extra || {}); S.traffic.push(o); return o;
  };
  S.rider = function(id, type, station, lateral, dir, speed) {
    var o = S.place({ id: id, type: type, speed: speed, _cruiseSpeed: speed, _bikeLane: lateral }, station, lateral, dir);
    S.cyclists.push(o); return o;
  };
  S.flaggerFor = function(ci, state, timer) {
    var bd = RR.workZoneBoundsForChunk(ci), sx = world.spline ? world.spline.centerAt(bd.playerStopY) : 48;
    var f = { x: sx, y: bd.playerStopY, type: 'flagger', state: state, timer: timer || 0, greenDur: 10, yellowDur: 2, redDur: 8, allRedDur: 1,
      _lastFrontY: null, _stopped: false, _violated: false, _chunk: ci, _workZoneStartY: bd.startY, _workZoneEndY: bd.endY };
    S.controls.push(f); return f;
  };
  S.placeCar = function(station, lateral, speed) { S.place(car, station, lateral, -1); car.speed = speed || 0; S.scriptLat = lateral; };
  S.local = function(o) { return RR.mainRoadLocalPoint(world, o.x, o.y); };
  // a frame for tests/roadready_zn34_invariants.cjs, motorcycles included as vehicles (they are motor vehicles)
  S.frame = function(INV) {
    var fr = INV.recordFrame(RR, world, S.t, car, 'sedan', S.traffic.concat(S.cyclists.filter(function(c) { return c.type === 'motorcycle'; }).map(function(c) {
      return { id: c.id, type: 'motorcycle', x: c.x, y: c.y, heading: c.heading, speed: c.speed }; })), S.controls);
    fr.actors.forEach(function(x) { if (x.type === 'motorcycle') { var fs = RR.vulnerableRoadUserFootprint({ type: 'motorcycle' }); x.len = fs.length; x.wid = fs.width; } });
    return fr;
  };
  return S;
}

module.exports = { makeSim: makeSim };
