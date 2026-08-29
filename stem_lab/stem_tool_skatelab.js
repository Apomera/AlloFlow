// Skate Lab — a physics-first 2D / 3D motion workbench.
// One deterministic model drives both views, the numeric readouts,
// the energy ledger, and the experiment log.

window.StemLab = window.StemLab || {
  _registry: {},
  _order: [],
  registerTool: function(id, config) {
    config.id = id;
    config.ready = config.ready !== false;
    this._registry[id] = config;
    if (this._order.indexOf(id) === -1) this._order.push(id);
  },
  getRegisteredTools: function() {
    var self = this;
    return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean);
  },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) {
    var tool = this._registry[id];
    if (!tool || !tool.render) return null;
    try { return tool.render(ctx); } catch (err) { return null; }
  }
};

(function() {
  'use strict';

  if (window.StemLab.isRegistered && window.StemLab.isRegistered('skatelab')) return;

  var G = 9.81;
  var M2FT = 3.28084;
  var MPS2MPH = 2.23694;
  var MPH2MPS = 0.44704;
  var RIDER_KG = 62;
  var LANDING_ZONE_M = 1.2;
  var LANDING_LANE_HALF_M = 0.9;
  var LANDING_COMPRESSION_M = 0.45;
  var AIR_DENSITY = 1.225;

  var SURFACES = {
    wax: { id: 'wax', label: 'Waxed', efficiency: 0.96, note: '4% transferred to heat' },
    standard: { id: 'standard', label: 'Concrete', efficiency: 0.86, note: '14% transferred to heat' },
    rough: { id: 'rough', label: 'Rough', efficiency: 0.70, note: '30% transferred to heat' }
  };

  var WINDS = {
    head_strong: { id: 'head_strong', label: 'Strong headwind', xMps: -7, zMps: 0 },
    head: { id: 'head', label: 'Headwind', xMps: -4.5, zMps: 0 },
    calm: { id: 'calm', label: 'Calm', xMps: 0, zMps: 0 },
    tail: { id: 'tail', label: 'Tailwind', xMps: 4.5, zMps: 0 },
    tail_strong: { id: 'tail_strong', label: 'Strong tailwind', xMps: 7, zMps: 0 },
    cross_left: { id: 'cross_left', label: 'Crosswind left', xMps: 0, zMps: -6 },
    cross_right: { id: 'cross_right', label: 'Crosswind right', xMps: 0, zMps: 6 }
  };

  var VEHICLES = {
    skate: {
      id: 'skate',
      label: 'Skateboard',
      mass: 4,
      pumpEfficiency: 1,
      rotationScale: 1,
      dragArea: 0.34,
      spinRadiusM: 0.52
    },
    bmx: {
      id: 'bmx',
      label: 'BMX',
      mass: 12,
      pumpEfficiency: 0.78,
      rotationScale: 0.72,
      dragArea: 0.48,
      spinRadiusM: 0.68
    }
  };

  var BODY_POSITIONS = {
    open: {
      id: 'open',
      label: 'Open',
      spinMultiplier: 1 / 1.22,
      inertiaRatio: 1.22,
      note: 'larger rotational inertia'
    },
    neutral: {
      id: 'neutral',
      label: 'Neutral',
      spinMultiplier: 1,
      inertiaRatio: 1,
      note: 'baseline rotational inertia'
    },
    tuck: {
      id: 'tuck',
      label: 'Tucked',
      spinMultiplier: 1 / 0.74,
      inertiaRatio: 0.74,
      note: 'smaller rotational inertia'
    }
  };

  var LEGACY_TRICKS = {
    ollie: { rotation: 0, spinRate: 0 },
    kickflip: { rotation: 360, spinRate: 260 },
    spin180: { rotation: 180, spinRate: 180 },
    spin360: { rotation: 360, spinRate: 260 },
    spin540: { rotation: 540, spinRate: 380 },
    spin720: { rotation: 720, spinRate: 500 }
  };

  function finite(value, fallback) {
    value = Number(value);
    return Number.isFinite(value) ? value : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, amount) {
    return a + (b - a) * amount;
  }

  function getSurface(id) { return SURFACES[id] || SURFACES.standard; }
  function getWind(id) { return WINDS[id] || WINDS.calm; }
  function getVehicle(id) { return VEHICLES[id] || VEHICLES.skate; }
  function getBodyPosition(id) { return BODY_POSITIONS[id] || BODY_POSITIONS.neutral; }
  function getLegacyTrick(id) { return LEGACY_TRICKS[id] || LEGACY_TRICKS.spin360; }

  function halfpipeY(x, depth) {
    var normalized = clamp(Math.abs(x) / 4, 0, 1);
    return depth * (1 - Math.sqrt(Math.max(0, 1 - normalized * normalized)));
  }

  function trajectoryPointAt(path, time) {
    if (!path || !path.length) return { t: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 };
    if (time <= path[0].t) return path[0];
    if (time >= path[path.length - 1].t) return path[path.length - 1];

    var low = 0;
    var high = path.length - 1;
    while (high - low > 1) {
      var middle = Math.floor((low + high) / 2);
      if (path[middle].t <= time) low = middle;
      else high = middle;
    }
    var before = path[low];
    var after = path[high];
    var span = Math.max(0.000001, after.t - before.t);
    var amount = clamp((time - before.t) / span, 0, 1);
    return {
      t: time,
      x: lerp(before.x, after.x, amount),
      y: Math.max(0, lerp(before.y, after.y, amount)),
      z: lerp(before.z, after.z, amount),
      vx: lerp(before.vx, after.vx, amount),
      vy: lerp(before.vy, after.vy, amount),
      vz: lerp(before.vz, after.vz, amount)
    };
  }


  function transitionPointAt(path, time) {
    if (!path || !path.length) {
      return { t: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, speedMps: 0, normalG: 0, nx: 0, ny: 1, theta: 0 };
    }
    if (time <= path[0].t) return path[0];
    if (time >= path[path.length - 1].t) return path[path.length - 1];

    var low = 0;
    var high = path.length - 1;
    while (high - low > 1) {
      var middle = Math.floor((low + high) / 2);
      if (path[middle].t <= time) low = middle;
      else high = middle;
    }
    var before = path[low];
    var after = path[high];
    var span = Math.max(0.000001, after.t - before.t);
    var amount = clamp((time - before.t) / span, 0, 1);
    return {
      t: time,
      x: lerp(before.x, after.x, amount),
      y: lerp(before.y, after.y, amount),
      z: 0,
      vx: lerp(before.vx, after.vx, amount),
      vy: lerp(before.vy, after.vy, amount),
      vz: 0,
      speedMps: lerp(before.speedMps, after.speedMps, amount),
      normalG: lerp(before.normalG, after.normalG, amount),
      nx: lerp(before.nx, after.nx, amount),
      ny: lerp(before.ny, after.ny, amount),
      theta: lerp(before.theta, after.theta, amount)
    };
  }

  function buildHalfpipeTransition(exitSpeed, gravity, depth) {
    var halfWidth = 4;
    var steps = 180;
    var path = [];
    var elapsed = 0;
    var previous = null;

    for (var i = 0; i <= steps; i++) {
      var theta = -Math.PI / 2 + Math.PI * i / steps;
      var x = halfWidth * Math.sin(theta);
      var y = depth * (1 - Math.cos(theta));
      var dxDTheta = halfWidth * Math.cos(theta);
      var dyDTheta = depth * Math.sin(theta);
      var tangentScale = Math.max(0.000001, Math.sqrt(dxDTheta * dxDTheta + dyDTheta * dyDTheta));
      var speedMps = Math.sqrt(Math.max(0, exitSpeed * exitSpeed + 2 * gravity * (depth - y)));
      var tx = dxDTheta / tangentScale;
      var ty = dyDTheta / tangentScale;
      var nx = -dyDTheta / tangentScale;
      var ny = dxDTheta / tangentScale;
      var curvatureRadius = Math.pow(tangentScale, 3) / Math.max(0.000001, halfWidth * depth);
      var normalG = Math.max(0, speedMps * speedMps / (curvatureRadius * gravity) + ny);

      if (previous) {
        var dx = x - previous.x;
        var dy = y - previous.y;
        var ds = Math.sqrt(dx * dx + dy * dy);
        elapsed += 2 * ds / Math.max(0.000001, previous.speedMps + speedMps);
      }

      var point = {
        t: elapsed,
        x: x,
        y: y,
        z: 0,
        vx: speedMps * tx,
        vy: speedMps * ty,
        vz: 0,
        speedMps: speedMps,
        normalG: normalG,
        nx: nx,
        ny: ny,
        theta: theta
      };
      path.push(point);
      previous = point;
    }

    return {
      path: path,
      duration: elapsed,
      bottom: path[Math.floor(steps / 2)]
    };
  }

  function simHalfpipe(opts) {
    opts = opts || {};
    var gravity = clamp(finite(opts.gravity, G), 0.5, 25);
    var pumps = clamp(finite(opts.pumps, 3), 0, 6);
    var riderMassKg = clamp(finite(opts.riderMassKg, RIDER_KG), 35, 110);
    var vehicle = getVehicle(opts.vehicle);
    var surface = getSurface(opts.surfaceId);
    var bodyPosition = getBodyPosition(opts.bodyPositionId);
    var legacy = getLegacyTrick(opts.trickId);
    var target = clamp(finite(opts.rotationTarget, legacy.rotation), 0, 1080);
    var spinRate = clamp(finite(opts.spinRate, legacy.spinRate), 0, 900);
    var mass = riderMassKg + vehicle.mass;
    var rampDepthM = 2.4;

    // Pumps add repeatable speed before takeoff. Surface efficiency determines
    // how much of that launch-energy pool remains mechanical at the lip.
    var baselineSpeed = 5.2;
    var lipSpeedRaw = baselineSpeed + pumps * 0.75 * vehicle.pumpEfficiency;
    var baselineEnergyJ = 0.5 * mass * baselineSpeed * baselineSpeed;
    var energyInputJ = 0.5 * mass * lipSpeedRaw * lipSpeedRaw;
    var pumpWorkJ = Math.max(0, energyInputJ - baselineEnergyJ);
    var mechanicalJ = energyInputJ * surface.efficiency;
    var thermalJ = energyInputJ - mechanicalJ;
    var exitSpeed = Math.sqrt((2 * mechanicalJ) / mass);
    var hAir = mechanicalJ / (mass * gravity);
    var airTime = (2 * exitSpeed) / gravity;

    // In flight, angular momentum is conserved. Pulling into a tuck reduces
    // effective rotational inertia, so angular speed rises by the inverse ratio.
    var airSpinRate = spinRate * vehicle.rotationScale * bodyPosition.spinMultiplier;
    var completed = airSpinRate * airTime;
    var rotationError = Math.abs(completed - target);
    var tolerance = target === 0 ? 30 : Math.max(35, target * 0.08);
    var landed = hAir >= 0.15 && rotationError <= tolerance;
    var effectiveInertia = mass * vehicle.spinRadiusM * vehicle.spinRadiusM * bodyPosition.inertiaRatio;
    var angularMomentum = effectiveInertia * (airSpinRate * Math.PI / 180);
    var transition = buildHalfpipeTransition(exitSpeed, gravity, rampDepthM);
    var rollTime = transition.duration;
    var motionDuration = rollTime + airTime;
    var runMechanicalJ = mechanicalJ + mass * gravity * rampDepthM;
    var runEnergyJ = runMechanicalJ + thermalJ;
    var score = Math.round(clamp(
      100 - rotationError * 0.12 + hAir * 6 - (thermalJ / energyInputJ) * 25,
      0,
      100
    ));

    return {
      mode: 'halfpipe',
      pumps: pumps,
      riderMassKg: riderMassKg,
      vehicle: vehicle,
      bodyPosition: bodyPosition,
      surface: surface,
      gravity: gravity,
      massKg: mass,
      baselineSpeed: baselineSpeed,
      lipSpeedRaw: lipSpeedRaw,
      exitSpeed: exitSpeed,
      vMps: exitSpeed,
      vMph: exitSpeed * MPS2MPH,
      hAir: hAir,
      hFt: hAir * M2FT,
      airTime: airTime,
      rollTime: rollTime,
      motionDuration: motionDuration,
      transitionPath: transition.path,
      bottomSpeed: transition.bottom.speedMps,
      bottomNormalG: transition.bottom.normalG,
      runMechanicalJ: runMechanicalJ,
      runEnergyJ: runEnergyJ,
      rotationTarget: target,
      spinRate: spinRate,
      airSpinRate: airSpinRate,
      completed: completed,
      rotation: target,
      rotationError: rotationError,
      effectiveInertia: effectiveInertia,
      angularMomentum: angularMomentum,
      landed: landed,
      score: score,
      baselineEnergyJ: baselineEnergyJ,
      pumpWorkJ: pumpWorkJ,
      energyInputJ: energyInputJ,
      mechanicalJ: mechanicalJ,
      thermalJ: thermalJ,
      rampDepthM: rampDepthM
    };
  }

  function simGapJump(opts) {
    opts = opts || {};
    var gravity = clamp(finite(opts.gravity, G), 0.5, 25);
    var speedMph = clamp(finite(opts.speedMph, 17), 1, 60);
    var angleDeg = clamp(finite(opts.angleDeg, 35), 1, 85);
    var gapFt = clamp(finite(opts.gapFt, 15), 2, 80);
    var riderMassKg = clamp(finite(opts.riderMassKg, RIDER_KG), 35, 110);
    var vehicle = getVehicle(opts.vehicle);
    var wind = getWind(opts.windId);
    var airDrag = opts.airDrag !== false;
    var speed = speedMph * MPH2MPS;
    var radians = angleDeg * Math.PI / 180;
    var mass = riderMassKg + vehicle.mass;
    var vx = speed * Math.cos(radians);
    var vy = speed * Math.sin(radians);
    var vz = 0;
    var x = 0;
    var y = 0;
    var z = 0;
    var time = 0;
    var step = 0;
    var dt = 1 / 180;
    var path = [{ t: 0, x: 0, y: 0, z: 0, vx: vx, vy: vy, vz: vz }];
    var peakM = 0;
    var peakTime = 0;
    var landing = path[0];

    while (time < 12) {
      var previous = { t: time, x: x, y: y, z: z, vx: vx, vy: vy, vz: vz };
      var relX = vx - wind.xMps;
      var relY = vy;
      var relZ = vz - wind.zMps;
      var relSpeed = Math.sqrt(relX * relX + relY * relY + relZ * relZ);
      var dragFactor = airDrag ? (0.5 * AIR_DENSITY * vehicle.dragArea * relSpeed / mass) : 0;
      var ax = -dragFactor * relX;
      var ay = -gravity - dragFactor * relY;
      var az = -dragFactor * relZ;
      var nextVx = vx + ax * dt;
      var nextVy = vy + ay * dt;
      var nextVz = vz + az * dt;
      var nextX = x + (vx + nextVx) * 0.5 * dt;
      var nextY = y + (vy + nextVy) * 0.5 * dt;
      var nextZ = z + (vz + nextVz) * 0.5 * dt;
      var nextTime = time + dt;

      if (nextY <= 0 && nextVy < 0 && nextTime > 0.08) {
        var fraction = clamp(previous.y / Math.max(0.000001, previous.y - nextY), 0, 1);
        landing = {
          t: lerp(previous.t, nextTime, fraction),
          x: lerp(previous.x, nextX, fraction),
          y: 0,
          z: lerp(previous.z, nextZ, fraction),
          vx: lerp(previous.vx, nextVx, fraction),
          vy: lerp(previous.vy, nextVy, fraction),
          vz: lerp(previous.vz, nextVz, fraction)
        };
        path.push(landing);
        break;
      }

      x = nextX;
      y = nextY;
      z = nextZ;
      vx = nextVx;
      vy = nextVy;
      vz = nextVz;
      time = nextTime;
      step += 1;
      if (y > peakM) {
        peakM = y;
        peakTime = time;
      }
      if (step % 2 === 0) path.push({ t: time, x: x, y: y, z: z, vx: vx, vy: vy, vz: vz });
      landing = { t: time, x: x, y: Math.max(0, y), z: z, vx: vx, vy: vy, vz: vz };
    }

    var airTime = landing.t;
    var rangeM = Math.max(0, landing.x);
    var gapM = gapFt / M2FT;
    var clearance = rangeM - gapM;
    var crossDriftM = landing.z;
    var withinLane = Math.abs(crossDriftM) <= LANDING_LANE_HALF_M;
    var landedInDistance = clearance >= 0 && clearance <= LANDING_ZONE_M;
    var landed = landedInDistance && withinLane;
    var landingSpeed = Math.sqrt(
      landing.vx * landing.vx + landing.vy * landing.vy + landing.vz * landing.vz
    );
    var landingAngleDeg = Math.atan2(
      Math.abs(landing.vy),
      Math.max(0.01, Math.sqrt(landing.vx * landing.vx + landing.vz * landing.vz))
    ) * 180 / Math.PI;
    var landingCompressionM = LANDING_COMPRESSION_M;
    var landingImpactG = 1 + (landing.vy * landing.vy) / (2 * gravity * landingCompressionM);
    var energyInputJ = 0.5 * mass * speed * speed;
    var landingKineticJ = 0.5 * mass * landingSpeed * landingSpeed;
    var thermalJ = airDrag ? clamp(energyInputJ - landingKineticJ, 0, energyInputJ) : 0;
    var mechanicalJ = energyInputJ - thermalJ;
    var rangeIdealM = speed * speed * Math.sin(2 * radians) / gravity;
    var idealVx = speed * Math.cos(radians);
    var idealVy = speed * Math.sin(radians);
    var idealAirTime = (2 * idealVy) / gravity;
    var idealFlightPath = [];
    for (var idealStep = 0; idealStep <= 72; idealStep++) {
      var idealTime = idealAirTime * idealStep / 72;
      idealFlightPath.push({
        t: idealTime,
        x: idealVx * idealTime,
        y: Math.max(0, idealVy * idealTime - 0.5 * gravity * idealTime * idealTime),
        z: 0,
        vx: idealVx,
        vy: idealVy - gravity * idealTime,
        vz: 0
      });
    }
    var rangeDeltaM = rangeM - rangeIdealM;
    var closeness = Math.abs(clearance - LANDING_ZONE_M * 0.45);
    var lanePenalty = withinLane ? 0 : (Math.abs(crossDriftM) - LANDING_LANE_HALF_M) * 30;
    var score = Math.round(clamp(100 - closeness * 38 - lanePenalty + peakM * 2, 0, 100));

    return {
      mode: 'gap',
      riderMassKg: riderMassKg,
      vehicle: vehicle,
      wind: wind,
      airDrag: airDrag,
      gravity: gravity,
      massKg: mass,
      speedMph: speedMph,
      speedMps: speed,
      angleDeg: angleDeg,
      gapFt: gapFt,
      gapM: gapM,
      vx: speed * Math.cos(radians),
      vy: speed * Math.sin(radians),
      vz: 0,
      airTime: airTime,
      motionDuration: 0.45 + airTime + 0.25,
      approachTime: 0.45,
      settleTime: 0.25,
      rangeM: rangeM,
      rangeFt: rangeM * M2FT,
      rangeIdealM: rangeIdealM,
      rangeDeltaM: rangeDeltaM,
      rangeDeltaFt: rangeDeltaM * M2FT,
      idealAirTime: idealAirTime,
      idealFlightPath: idealFlightPath,
      peakM: peakM,
      peakFt: peakM * M2FT,
      peakTime: peakTime,
      clearance: clearance,
      crossDriftM: crossDriftM,
      crossDriftFt: crossDriftM * M2FT,
      withinLane: withinLane,
      landedInDistance: landedInDistance,
      landed: landed,
      landingSpeed: landingSpeed,
      landingAngleDeg: landingAngleDeg,
      landingCompressionM: landingCompressionM,
      landingImpactG: landingImpactG,
      landingVelocity: { x: landing.vx, y: landing.vy, z: landing.vz },
      flightPath: path,
      score: score,
      energyInputJ: energyInputJ,
      mechanicalJ: mechanicalJ,
      thermalJ: thermalJ,
      landingKineticJ: landingKineticJ,
      landingZoneM: LANDING_ZONE_M,
      landingLaneHalfM: LANDING_LANE_HALF_M
    };
  }

  function sampleHalfpipe(sim, progress) {
    progress = clamp(progress, 0, 1);
    var elapsed = progress * sim.motionDuration;
    var x;
    var y;
    var vx;
    var vy;
    var speedMps;
    var normalG;
    var nx;
    var ny;
    var rotation;
    var phase;

    if (elapsed < sim.rollTime) {
      var point = transitionPointAt(sim.transitionPath, elapsed);
      x = point.x;
      y = point.y;
      vx = point.vx;
      vy = point.vy;
      speedMps = point.speedMps;
      normalG = point.normalG;
      nx = point.nx;
      ny = point.ny;
      rotation = 0;
      phase = point.theta < -0.32
        ? 'dropping in'
        : (point.theta <= 0.32 ? 'compressing at the bottom' : 'driving up the wall');
    } else {
      var flightTime = clamp(elapsed - sim.rollTime, 0, sim.airTime);
      var q = flightTime / Math.max(0.000001, sim.airTime);
      x = 4;
      y = sim.rampDepthM + sim.exitSpeed * flightTime - 0.5 * sim.gravity * flightTime * flightTime;
      vx = 0;
      vy = sim.exitSpeed - sim.gravity * flightTime;
      speedMps = Math.abs(vy);
      normalG = 0;
      nx = 0;
      ny = 0;
      rotation = sim.airSpinRate * flightTime;
      phase = q < 0.46 ? 'rising' : (q < 0.54 ? 'at the apex' : (q < 0.96 ? 'falling' : 'landing'));
    }

    var peJ = Math.max(0, sim.massKg * sim.gravity * y);
    var keJ = 0.5 * sim.massKg * speedMps * speedMps;
    return {
      x: x,
      y: y,
      z: 0,
      vx: vx,
      vy: vy,
      vz: 0,
      speedMps: speedMps,
      rotation: rotation,
      phase: phase,
      time: elapsed,
      peJ: peJ,
      keJ: keJ,
      thermalJ: sim.thermalJ,
      normalG: normalG,
      nx: nx,
      ny: ny
    };
  }

  function sampleGapJump(sim, progress) {
    progress = clamp(progress, 0, 1);
    var elapsed = progress * sim.motionDuration;
    var flightTime = elapsed - sim.approachTime;
    var point;
    var phase;

    if (flightTime < 0) {
      var approachQ = clamp(elapsed / sim.approachTime, 0, 1);
      point = {
        t: 0,
        x: -sim.speedMps * sim.approachTime * (1 - approachQ),
        y: 0,
        z: 0,
        vx: sim.speedMps,
        vy: 0,
        vz: 0
      };
      phase = 'approaching the ramp';
    } else if (flightTime <= sim.airTime) {
      point = trajectoryPointAt(sim.flightPath, flightTime);
      phase = Math.abs(point.vy) < 0.28 ? 'at the apex' : (point.vy > 0 ? 'rising' : 'falling');
    } else {
      point = trajectoryPointAt(sim.flightPath, sim.airTime);
      phase = 'landing';
    }

    var speedMps = Math.sqrt(point.vx * point.vx + point.vy * point.vy + point.vz * point.vz);
    var peJ = Math.max(0, sim.massKg * sim.gravity * point.y);
    var keJ = 0.5 * sim.massKg * speedMps * speedMps;
    var thermalJ = sim.airDrag
      ? clamp(sim.energyInputJ - peJ - keJ, 0, sim.thermalJ)
      : 0;
    return {
      x: point.x,
      y: point.y,
      z: point.z,
      vx: point.vx,
      vy: point.vy,
      vz: point.vz,
      speedMps: speedMps,
      rotation: Math.atan2(point.vy, Math.max(0.1, point.vx)) * 180 / Math.PI,
      phase: phase,
      time: elapsed,
      flightTime: clamp(flightTime, 0, sim.airTime),
      peJ: peJ,
      keJ: keJ,
      thermalJ: thermalJ,
      normalG: phase === 'landing' ? sim.landingImpactG : (phase === 'approaching the ramp' ? 1 : 0)
    };
  }

  window.__alloSkatePhysicsPure = {
    simHalfpipe: simHalfpipe,
    simGapJump: simGapJump,
    sampleHalfpipe: sampleHalfpipe,
    sampleGapJump: sampleGapJump,
    trajectoryPointAt: trajectoryPointAt,
    transitionPointAt: transitionPointAt,
    buildHalfpipeTransition: buildHalfpipeTransition,
    halfpipeY: halfpipeY,
    getSurface: getSurface,
    getWind: getWind,
    getBodyPosition: getBodyPosition,
    constants: {
      gravity: G,
      metersToFeet: M2FT,
      mpsToMph: MPS2MPH,
      riderKg: RIDER_KG,
      landingZoneM: LANDING_ZONE_M,
      landingLaneHalfM: LANDING_LANE_HALF_M,
      landingCompressionM: LANDING_COMPRESSION_M,
      airDensity: AIR_DENSITY
    }
  };

  function installStyles() {
    if (typeof document === 'undefined' || document.getElementById('skatelab-physics-v2-css')) return;
    var style = document.createElement('style');
    style.id = 'skatelab-physics-v2-css';
    style.textContent = [
      '.skatelab-shell{--sk-bg:var(--allo-stem-canvas,#0b1220);--sk-panel:var(--allo-stem-panel,#172033);--sk-text:var(--allo-stem-text,#edf5ff);--sk-muted:var(--allo-stem-text-soft,#a8b5c7);--sk-border:var(--allo-stem-border,#34425a);--sk-accent:#f6b83f;--sk-cyan:#4ed7e8;--sk-green:#5ee092;--sk-red:#fb7185;color:var(--sk-text);max-width:1240px;margin:0 auto;padding:18px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;container-type:inline-size}.theme-default .skatelab-shell{--sk-cyan:#0e7490;--sk-green:#15803d;--sk-red:#be123c}',
      '.skatelab-shell *{box-sizing:border-box}.skatelab-shell button,.skatelab-shell input,.skatelab-shell select,.skatelab-shell textarea,.skatelab-shell summary{font:inherit}.skatelab-shell button,.skatelab-shell summary,.skatelab-shell input,.skatelab-shell select{min-block-size:40px}.skatelab-shell button:focus-visible,.skatelab-shell input:focus-visible,.skatelab-shell select:focus-visible,.skatelab-shell textarea:focus-visible,.skatelab-shell summary:focus-visible{outline:3px solid var(--sk-cyan);outline-offset:3px}',
      '.sk-header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:15px}.sk-heading{display:flex;gap:12px;align-items:flex-start}.sk-back{border:1px solid var(--sk-border);background:transparent;color:var(--sk-text);border-radius:11px;padding:8px 11px;cursor:pointer}.sk-title{margin:0;font-size:clamp(1.45rem,3vw,2.15rem);line-height:1.02;letter-spacing:-.03em}.sk-kicker{margin:6px 0 0;color:var(--sk-muted);font-size:.9rem}.sk-view-switch{display:flex;gap:5px;padding:4px;border:1px solid var(--sk-border);background:color-mix(in srgb,var(--sk-panel) 84%,transparent);border-radius:13px}.sk-view-switch button{border:0;background:transparent;color:var(--sk-muted);border-radius:9px;padding:7px 12px;font-weight:750;cursor:pointer}.sk-view-switch button[aria-pressed=true]{background:var(--sk-accent);color:#251600;box-shadow:0 3px 12px rgba(246,184,63,.24)}',
      '.sk-workbench{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(300px,350px);gap:15px;align-items:start}.sk-stage,.sk-controls,.sk-panel,.sk-metric{border:1px solid var(--sk-border);background:color-mix(in srgb,var(--sk-panel) 91%,transparent);border-radius:17px}.sk-stage{padding:11px;min-width:0;background:linear-gradient(160deg,color-mix(in srgb,var(--sk-panel) 96%,transparent),color-mix(in srgb,var(--sk-bg) 90%,transparent))}.sk-canvas-frame{position:relative;overflow:hidden;border-radius:14px;background:#06101e;box-shadow:inset 0 0 0 1px rgba(148,163,184,.26),0 12px 34px rgba(2,8,20,.20)}.sk-canvas{display:block;width:100%;height:auto;aspect-ratio:16/9}.sk-stage-toolbar{display:flex;align-items:center;justify-content:space-between;gap:9px;flex-wrap:wrap;padding:10px 2px 4px}.sk-live-telemetry{display:flex;align-items:center;gap:0;flex-wrap:wrap;color:var(--sk-muted);font-size:.74rem;font-variant-numeric:tabular-nums}.sk-live-telemetry span{padding:3px 8px;border-right:1px solid var(--sk-border)}.sk-live-telemetry span:first-child{padding-left:0}.sk-live-telemetry span:last-child{border-right:0}.sk-live-telemetry .sk-phase{color:var(--sk-cyan);font-weight:850;text-transform:uppercase;letter-spacing:.045em}.sk-stage-legend{display:block;padding:6px 2px 2px;font-size:.72rem;color:var(--sk-muted);line-height:1.4}.sk-stage-legend b{color:var(--sk-text)}.sk-timeline{display:grid;grid-template-columns:minmax(120px,190px) minmax(0,1fr);align-items:center;gap:11px;padding:9px 10px;margin:3px 0;border-radius:11px;background:color-mix(in srgb,var(--sk-bg) 75%,transparent)}.sk-timeline label{display:flex;justify-content:space-between;gap:8px;color:var(--sk-muted);font-size:.76rem;font-weight:750}.sk-timeline output{color:var(--sk-cyan);font-variant-numeric:tabular-nums}.sk-timeline input{width:100%;accent-color:var(--sk-cyan)}.sk-canvas-summary{margin:8px 0 0;padding:8px 10px;border-left:3px solid var(--sk-cyan);background:color-mix(in srgb,var(--sk-cyan) 7%,transparent);font-size:.8rem;line-height:1.45;color:var(--sk-muted)}',
      '.sk-controls{padding:14px;display:grid;gap:13px;background:linear-gradient(180deg,color-mix(in srgb,var(--sk-panel) 96%,transparent),color-mix(in srgb,var(--sk-panel) 87%,transparent))}.sk-mode-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px}.sk-mode-tabs button{border:1px solid var(--sk-border);background:transparent;color:var(--sk-muted);border-radius:10px;padding:8px;font-weight:800;cursor:pointer}.sk-mode-tabs button[aria-selected=true]{border-color:var(--sk-accent);background:color-mix(in srgb,var(--sk-accent) 16%,transparent);color:var(--sk-text)}.sk-control-group{display:grid;gap:11px}.sk-control{display:grid;gap:5px}.sk-control-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;font-size:.82rem;font-weight:750}.sk-control-head output{max-width:58%;color:var(--sk-cyan);font-variant-numeric:tabular-nums;text-align:right;font-size:.75rem}.sk-help{font-size:.72rem;line-height:1.4;color:var(--sk-muted);margin:0}.skatelab-shell input[type=range]{width:100%;accent-color:var(--sk-accent)}.skatelab-shell select,.skatelab-shell input[type=number],.skatelab-shell textarea{width:100%;border:1px solid var(--sk-border);background:var(--sk-bg);color:var(--sk-text);border-radius:9px;padding:8px 10px}',
      '.sk-radio-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(78px,1fr));gap:6px}.sk-radio-grid label{position:relative}.sk-radio-grid input{position:absolute;opacity:0;pointer-events:none}.sk-radio-grid span{display:flex;min-height:40px;align-items:center;justify-content:center;text-align:center;border:1px solid var(--sk-border);border-radius:9px;padding:6px;color:var(--sk-muted);font-size:.74rem;font-weight:750;cursor:pointer}.sk-radio-grid input:checked+span{border-color:var(--sk-cyan);background:color-mix(in srgb,var(--sk-cyan) 13%,transparent);color:var(--sk-text);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--sk-cyan) 42%,transparent)}.sk-radio-grid input:focus-visible+span{outline:3px solid var(--sk-cyan);outline-offset:3px}.sk-checks{display:grid;grid-template-columns:1fr 1fr;gap:8px}.sk-check{display:flex;align-items:center;gap:7px;color:var(--sk-muted);font-size:.78rem}.sk-check input,.sk-switch input{accent-color:var(--sk-accent);inline-size:18px;block-size:18px}.sk-switch{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;padding:9px 10px;border-radius:10px;background:color-mix(in srgb,var(--sk-bg) 60%,transparent);color:var(--sk-muted);font-size:.78rem;font-weight:750}.sk-switch output{color:var(--sk-cyan);font-size:.72rem;text-transform:uppercase;letter-spacing:.04em}',
      '.sk-advanced{border-top:1px solid var(--sk-border);padding-top:7px}.sk-advanced summary{cursor:pointer;color:var(--sk-text);font-size:.8rem;font-weight:800}.sk-advanced-body{display:grid;gap:10px;padding-top:10px}.sk-model-note{margin:0;padding:9px 10px;border-left:3px solid var(--sk-accent);background:color-mix(in srgb,var(--sk-accent) 7%,transparent);color:var(--sk-muted);font-size:.73rem;line-height:1.45}.sk-actions{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end}.sk-run{border:0;border-radius:11px;background:linear-gradient(135deg,#ffc857,#e79024);color:#281600;font-weight:900;padding:10px 16px;cursor:pointer;box-shadow:0 8px 22px rgba(231,144,36,.24)}.sk-run:disabled{opacity:.55;cursor:not-allowed;box-shadow:none}.sk-secondary{border:1px solid var(--sk-border);border-radius:10px;background:transparent;color:var(--sk-text);padding:8px 11px;font-weight:750;cursor:pointer}.sk-status{min-height:1.4em;padding:8px 9px;border-radius:9px;background:color-mix(in srgb,var(--sk-bg) 55%,transparent);font-size:.78rem;color:var(--sk-muted);line-height:1.4}.sk-status[data-result=success]{color:var(--sk-green)}.sk-status[data-result=miss]{color:var(--sk-red)}',
      '.sk-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:9px;margin-top:12px}.sk-metric{position:relative;overflow:hidden;padding:11px 12px;min-width:0}.sk-metric:before{content:"";position:absolute;inset:0 auto 0 0;width:3px;background:var(--sk-cyan);opacity:.72}.sk-metric-value{display:block;font-size:clamp(1rem,2vw,1.25rem);font-weight:850;color:var(--sk-text);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sk-metric-label{display:block;margin-top:3px;color:var(--sk-muted);font-size:.7rem;text-transform:uppercase;letter-spacing:.055em}.sk-below{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr);gap:12px;margin-top:12px}.sk-panel{padding:14px;min-width:0}.sk-panel h3{margin:0 0 9px;font-size:.92rem}.sk-ledger-row{display:flex;height:12px;border-radius:999px;overflow:hidden;background:color-mix(in srgb,var(--sk-border) 55%,transparent);margin:8px 0}.sk-ledger-mechanical{background:var(--sk-cyan)}.sk-ledger-thermal{background:var(--sk-accent)}.sk-ledger-labels{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:.75rem;color:var(--sk-muted)}.sk-equation{display:block;margin-top:10px;padding:10px;border-radius:9px;background:var(--sk-bg);color:var(--sk-text);font-size:.76rem;line-height:1.58;white-space:normal}',
      '.sk-question{margin:0 0 10px;color:var(--sk-muted);font-size:.82rem;line-height:1.45}.sk-estimate{display:grid;grid-template-columns:auto minmax(90px,140px);align-items:center;gap:8px;margin-bottom:9px}.sk-estimate label{font-size:.78rem;font-weight:750}.sk-error{color:var(--sk-red);font-size:.75rem;margin:0}.sk-details{margin-top:12px;border-top:1px solid var(--sk-border);padding-top:10px}.sk-details summary{cursor:pointer;font-weight:800;color:var(--sk-text);padding:2px 0}.sk-notes{display:grid;gap:8px;margin-top:10px}.sk-table-wrap{overflow-x:auto}.sk-table{width:100%;border-collapse:collapse;font-size:.74rem}.sk-table th,.sk-table td{text-align:left;padding:7px 6px;border-bottom:1px solid var(--sk-border);white-space:nowrap}.sk-table th{color:var(--sk-muted);font-weight:750}.sk-result-good{color:var(--sk-green);font-weight:800}.sk-result-miss{color:var(--sk-red);font-weight:800}.sk-footer-note{margin:12px 2px 0;color:var(--sk-muted);font-size:.72rem;line-height:1.4}',
      '@container(max-width:900px){.sk-workbench{grid-template-columns:1fr}.sk-below{grid-template-columns:1fr}.sk-controls{order:2}.sk-stage{order:1}}@container(max-width:820px){.sk-workbench{grid-template-columns:1fr}.sk-below{grid-template-columns:1fr}.sk-metrics{grid-template-columns:repeat(auto-fit,minmax(135px,1fr))}}@container(max-width:520px){.skatelab-shell{padding:9px}.sk-header{display:grid}.sk-view-switch{width:100%}.sk-view-switch button{flex:1}.sk-canvas{aspect-ratio:4/3}.sk-stage-toolbar{align-items:flex-start}.sk-live-telemetry{width:100%}.sk-timeline{grid-template-columns:1fr;gap:5px}.sk-checks{grid-template-columns:1fr}.sk-radio-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sk-actions{grid-template-columns:1fr}.sk-secondary{width:100%}.sk-estimate{grid-template-columns:1fr}.sk-title{font-size:1.45rem}.sk-metrics{grid-template-columns:1fr 1fr}.sk-control-head{align-items:flex-start}.sk-control-head output{max-width:55%}}',
      '@media(prefers-reduced-motion:reduce){.skatelab-shell *{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important;animation-iteration-count:1!important}}@media(forced-colors:active){.skatelab-shell button,.skatelab-shell input,.skatelab-shell select,.skatelab-shell textarea,.sk-stage,.sk-controls,.sk-panel,.sk-metric,.sk-switch,.sk-timeline{forced-color-adjust:auto;border-color:CanvasText!important}.skatelab-shell button:focus-visible,.skatelab-shell input:focus-visible,.skatelab-shell select:focus-visible,.skatelab-shell textarea:focus-visible,.skatelab-shell summary:focus-visible{outline:3px solid Highlight!important}.sk-canvas-frame{border:2px solid CanvasText}.sk-canvas-summary,.sk-model-note{border-color:CanvasText!important}}'
    ].join('');
    document.head.appendChild(style);
  }

  installStyles();

  function canvasFrame(canvas) {
    if (!canvas || typeof canvas.getContext !== 'function') return null;
    var rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
    var width = Math.max(320, Math.round((rect && rect.width) || 960));
    var height = Math.max(220, Math.round((rect && rect.height) || width * 0.5625));
    var dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, width: width, height: height };
  }

  function drawArrow(ctx, x1, y1, x2, y2, color, label) {
    var angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 8 * Math.cos(angle - Math.PI / 6), y2 - 8 * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - 8 * Math.cos(angle + Math.PI / 6), y2 - 8 * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    if (label) {
      ctx.font = '700 11px ui-sans-serif, system-ui';
      ctx.fillText(label, x2 + 6, y2 - 5);
    }
    ctx.restore();
  }

  function drawBackdrop(ctx, width, height, title, subtitle) {
    var sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#061327');
    sky.addColorStop(0.48, '#183151');
    sky.addColorStop(0.76, '#152238');
    sky.addColorStop(1, '#08111f');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    var horizon = Math.round(height * 0.56);
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = '#0b1728';
    var blockWidth = Math.max(30, Math.round(width / 17));
    for (var building = -1; building < 19; building++) {
      var buildingX = building * blockWidth;
      var buildingH = 18 + ((building * 17 + 31) % 42);
      ctx.fillRect(buildingX, horizon - buildingH, blockWidth - 4, buildingH);
      ctx.fillStyle = 'rgba(246,184,63,.28)';
      if (building % 3 === 0) ctx.fillRect(buildingX + 8, horizon - buildingH + 10, 4, 3);
      ctx.fillStyle = '#0b1728';
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.strokeStyle = '#365273';
    ctx.lineWidth = 1;
    var spacing = Math.max(42, Math.round(width / 15));
    for (var x = 0; x < width; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, horizon);
      ctx.lineTo(width / 2 + (x - width / 2) * 1.8, height);
      ctx.stroke();
    }
    for (var gridY = horizon; gridY < height; gridY += Math.max(22, (gridY - horizon) * 0.34 + 16)) {
      ctx.beginPath();
      ctx.moveTo(0, gridY);
      ctx.lineTo(width, gridY);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(114,220,232,.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width * 0.08, horizon);
    ctx.lineTo(width * 0.08, horizon - 78);
    ctx.lineTo(width * 0.13, horizon - 105);
    ctx.stroke();
    ctx.fillStyle = 'rgba(114,220,232,.16)';
    ctx.beginPath();
    ctx.arc(width * 0.13, horizon - 105, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#f7fafc';
    ctx.font = '800 14px ui-sans-serif, system-ui';
    ctx.fillText(title, 18, 25);
    ctx.fillStyle = '#a9bad0';
    ctx.font = '500 11px ui-sans-serif, system-ui';
    ctx.fillText(subtitle, 18, 43);
  }

  function drawGuideLabel(ctx, text, x, y, color) {
    ctx.save();
    ctx.font = '700 10px ui-monospace, monospace';
    var labelWidth = Math.max(48, ctx.measureText ? ctx.measureText(text).width + 12 : text.length * 6 + 12);
    ctx.fillStyle = 'rgba(5,13,25,.82)';
    ctx.fillRect(x - 5, y - 12, labelWidth, 17);
    ctx.fillStyle = color || '#d8e5f4';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawEnergyHud(ctx, sim, sample, width) {
    var barWidth = Math.min(260, width * 0.34);
    var x = width - barWidth - 18;
    var y = 18;
    var kinetic = Math.max(0, finite(sample.keJ, sim.mechanicalJ));
    var potential = Math.max(0, finite(sample.peJ, 0));
    var thermal = Math.max(0, finite(sample.thermalJ, sim.thermalJ || 0));
    var total = Math.max(1, kinetic + potential + thermal);

    ctx.save();
    ctx.fillStyle = 'rgba(5,13,25,.72)';
    ctx.fillRect(x - 9, y - 9, barWidth + 18, 48);
    ctx.font = '700 10px ui-sans-serif, system-ui';
    ctx.fillStyle = '#d8e5f4';
    ctx.fillText('LIVE ENERGY', x, y);
    ctx.fillStyle = 'rgba(148,163,184,.28)';
    ctx.fillRect(x, y + 7, barWidth, 10);
    ctx.fillStyle = '#4ed7e8';
    ctx.fillRect(x, y + 7, barWidth * (kinetic / total), 10);
    ctx.fillStyle = '#7aa7ff';
    ctx.fillRect(x + barWidth * (kinetic / total), y + 7, barWidth * (potential / total), 10);
    ctx.fillStyle = '#f6b83f';
    ctx.fillRect(x + barWidth * ((kinetic + potential) / total), y + 7, barWidth * (thermal / total), 10);
    ctx.fillStyle = '#a9bad0';
    ctx.font = '500 9px ui-monospace, monospace';
    ctx.fillText('KE ' + Math.round(kinetic) + '  PE ' + Math.round(potential) + '  loss ' + Math.round(thermal) + ' J', x, y + 31);
    ctx.restore();
  }

  function drawMotionFooter(ctx, sample, width, height, detail) {
    ctx.save();
    ctx.fillStyle = 'rgba(5,13,25,.78)';
    ctx.fillRect(12, height - 34, Math.min(width - 24, 330), 23);
    ctx.fillStyle = '#d8e5f4';
    ctx.font = '700 10px ui-monospace, monospace';
    var timeLabel = finite(sample.time, 0).toFixed(2) + ' s';
    var speedLabel = (finite(sample.speedMps, 0) * MPS2MPH).toFixed(1) + ' mph';
    ctx.fillText(sample.phase + '  |  ' + timeLabel + '  |  ' + speedLabel, 19, height - 19);
    if (detail && width > 620) {
      ctx.fillStyle = '#9fb2ca';
      ctx.font = '600 10px ui-monospace, monospace';
      ctx.fillText(detail, width - Math.min(285, width * 0.37), height - 19);
    }
    ctx.restore();
  }

  function drawSkater2D(ctx, x, y, rotationDeg, vehicleId, bodyPositionId) {
    var boardLength = vehicleId === 'bmx' ? 36 : 28;
    var tucked = bodyPositionId === 'tuck';
    var open = bodyPositionId === 'open';
    var torsoTop = tucked ? -17 : -25;
    var headY = tucked ? -24 : -32;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotationDeg * Math.PI / 180);
    ctx.shadowColor = 'rgba(78,215,232,.28)';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#f8c55c';
    ctx.fillStyle = '#f8c55c';
    ctx.lineCap = 'round';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-boardLength / 2, 2);
    ctx.lineTo(boardLength / 2, 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (vehicleId === 'bmx') {
      ctx.strokeStyle = '#72dce8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-11, 5, 7, 0, Math.PI * 2);
      ctx.moveTo(18, 5);
      ctx.arc(11, 5, 7, 0, Math.PI * 2);
      ctx.moveTo(-11, 5);
      ctx.lineTo(0, -9);
      ctx.lineTo(11, 5);
      ctx.lineTo(-4, 5);
      ctx.lineTo(0, -9);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#72dce8';
      ctx.beginPath();
      ctx.arc(-9, 5, 2.4, 0, Math.PI * 2);
      ctx.arc(9, 5, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = '#f2f7ff';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(0, torsoTop);
    ctx.moveTo(0, torsoTop + 6);
    ctx.lineTo(open ? -15 : -10, tucked ? -9 : -12);
    ctx.moveTo(0, torsoTop + 6);
    ctx.lineTo(open ? 15 : 11, tucked ? -10 : -14);
    ctx.moveTo(0, -4);
    ctx.lineTo(tucked ? -10 : -8, 1);
    ctx.moveTo(0, -4);
    ctx.lineTo(tucked ? 10 : 9, 1);
    ctx.stroke();
    ctx.fillStyle = '#f2f7ff';
    ctx.beginPath();
    ctx.arc(0, headY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.arc(0, headY - 1, 6.5, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawHalfpipe2D(ctx, width, height, sim, sample, config) {
    drawBackdrop(ctx, width, height, 'HALFPIPE | SIDE ELEVATION', 'Timed energy transfer, forces, and angular motion');
    var marginX = Math.max(52, width * 0.08);
    var baseY = height - 60;
    var sx = (width - marginX * 2) / 9.3;
    var sy = Math.min((height - 140) / Math.max(4.7, sim.rampDepthM + sim.hAir), sx * 0.82);
    function map(x, y) { return { x: width / 2 + x * sx, y: baseY - y * sy }; }

    ctx.save();
    ctx.beginPath();
    for (var i = 0; i <= 80; i++) {
      var wx = -4 + (8 * i / 80);
      var wy = halfpipeY(wx, sim.rampDepthM);
      var point = map(wx, wy);
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.lineTo(map(4, -0.35).x, map(4, -0.35).y);
    ctx.lineTo(map(-4, -0.35).x, map(-4, -0.35).y);
    ctx.closePath();
    var concrete = ctx.createLinearGradient(0, baseY - sim.rampDepthM * sy, 0, baseY + 20);
    concrete.addColorStop(0, '#50627a');
    concrete.addColorStop(0.52, '#2d3c51');
    concrete.addColorStop(1, '#182437');
    ctx.fillStyle = concrete;
    ctx.fill();
    ctx.strokeStyle = '#a9bad0';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.globalAlpha = sim.surface.id === 'rough' ? 0.34 : 0.19;
    ctx.strokeStyle = sim.surface.id === 'wax' ? '#72dce8' : '#b3c2d4';
    ctx.lineWidth = 1;
    for (var texture = -3.5; texture <= 3.5; texture += 0.7) {
      var texturePoint = map(texture, halfpipeY(texture, sim.rampDepthM));
      ctx.beginPath();
      ctx.moveTo(texturePoint.x - 5, texturePoint.y + 5);
      ctx.lineTo(texturePoint.x + 7, texturePoint.y + 13);
      ctx.stroke();
    }
    ctx.restore();

    var leftLip = map(-4, sim.rampDepthM);
    var rightLip = map(4, sim.rampDepthM);
    ctx.strokeStyle = '#f6b83f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(leftLip.x - 18, leftLip.y);
    ctx.lineTo(leftLip.x + 6, leftLip.y);
    ctx.moveTo(rightLip.x - 5, rightLip.y);
    ctx.lineTo(rightLip.x + 19, rightLip.y);
    ctx.stroke();

    var apex = map(4, sim.rampDepthM + sim.hAir);
    ctx.save();
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = 'rgba(114,220,232,.58)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rightLip.x, apex.y);
    ctx.lineTo(apex.x + 55, apex.y);
    ctx.moveTo(apex.x + 34, apex.y);
    ctx.lineTo(apex.x + 34, rightLip.y);
    ctx.stroke();
    ctx.restore();
    drawGuideLabel(ctx, '+' + sim.hFt.toFixed(1) + ' ft apex', apex.x + 39, apex.y - 4, '#72dce8');

    ctx.save();
    ctx.setLineDash([5, 6]);
    ctx.strokeStyle = 'rgba(114,220,232,.52)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var t = 0; t <= 28; t++) {
      var tq = t / 28;
      var pathPoint = map(4, sim.rampDepthM + 4 * sim.hAir * tq * (1 - tq));
      if (t === 0) ctx.moveTo(pathPoint.x, pathPoint.y);
      else ctx.lineTo(pathPoint.x, pathPoint.y);
    }
    ctx.stroke();
    ctx.restore();

    var airStart = sim.rollTime / sim.motionDuration;
    if (config.progress > airStart) {
      var airProgress = clamp((config.progress - airStart) / Math.max(0.0001, 1 - airStart), 0, 1);
      ctx.save();
      ctx.strokeStyle = '#4ed7e8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (var done = 0; done <= 24; done++) {
        var dq = airProgress * done / 24;
        var donePoint = map(4, sim.rampDepthM + 4 * sim.hAir * dq * (1 - dq));
        if (done === 0) ctx.moveTo(donePoint.x, donePoint.y);
        else ctx.lineTo(donePoint.x, donePoint.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    if (config.showTrail) {
      ctx.save();
      for (var trail = 0; trail < 9; trail++) {
        var pp = Math.max(0, config.progress - trail * 0.021);
        var ghost = sampleHalfpipe(sim, pp);
        var gp = map(ghost.x, ghost.y);
        ctx.globalAlpha = 0.25 * (1 - trail / 10);
        ctx.fillStyle = '#72dce8';
        ctx.beginPath();
        ctx.arc(gp.x, gp.y - 14, 4.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    var p = map(sample.x, sample.y);
    var surfaceY = sample.x >= 3.98 ? sim.rampDepthM : halfpipeY(sample.x, sim.rampDepthM);
    var shadow = map(sample.x, surfaceY);
    ctx.save();
    ctx.globalAlpha = clamp(0.34 - Math.max(0, sample.y - surfaceY) * 0.07, 0.08, 0.34);
    ctx.fillStyle = '#020712';
    ctx.beginPath();
    ctx.arc(shadow.x, shadow.y + 3, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    drawSkater2D(ctx, p.x, p.y, sample.rotation, sim.vehicle.id, sim.bodyPosition.id);
    if (config.showVectors) {
      drawArrow(ctx, p.x, p.y - 18, p.x + clamp(sample.vx * 5, -52, 52), p.y - 18 - clamp(sample.vy * 5, -52, 52), '#4ed7e8', 'v');
      if (sample.normalG === 0) {
        drawArrow(ctx, p.x + 17, p.y - 25, p.x + 17, p.y + 22, '#fb7185', 'g');
      } else {
        var normalLength = clamp(sample.normalG * 12, 10, 52);
        drawArrow(ctx, p.x + 17, p.y - 18, p.x + 17 + sample.nx * normalLength, p.y - 18 - sample.ny * normalLength, '#5ee092', 'N');
      }
    }
    if (config.showEnergy) drawEnergyHud(ctx, sim, sample, width);
    drawMotionFooter(ctx, sample, width, height, sim.bodyPosition.label + ' body | ' + sim.surface.label + ' surface');
  }

  function drawLaneInset2D(ctx, sim, width) {
    var insetWidth = Math.min(170, width * 0.28);
    var insetHeight = 58;
    var x = width - insetWidth - 18;
    var y = 68;
    var centerY = y + insetHeight / 2;
    var driftScale = (insetHeight * 0.38) / Math.max(sim.landingLaneHalfM, Math.abs(sim.crossDriftM), 0.5);

    ctx.save();
    ctx.fillStyle = 'rgba(5,13,25,.76)';
    ctx.fillRect(x, y, insetWidth, insetHeight);
    ctx.strokeStyle = 'rgba(159,178,202,.48)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 9, centerY - sim.landingLaneHalfM * driftScale);
    ctx.lineTo(x + insetWidth - 9, centerY - sim.landingLaneHalfM * driftScale);
    ctx.moveTo(x + 9, centerY + sim.landingLaneHalfM * driftScale);
    ctx.lineTo(x + insetWidth - 9, centerY + sim.landingLaneHalfM * driftScale);
    ctx.stroke();
    ctx.strokeStyle = '#4ed7e8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 12, centerY);
    ctx.lineTo(x + insetWidth - 14, centerY - sim.crossDriftM * driftScale);
    ctx.stroke();
    ctx.fillStyle = sim.withinLane ? '#5ee092' : '#fb7185';
    ctx.beginPath();
    ctx.arc(x + insetWidth - 14, centerY - sim.crossDriftM * driftScale, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a9bad0';
    ctx.font = '600 9px ui-monospace, monospace';
    ctx.fillText('TOP VIEW | drift ' + sim.crossDriftFt.toFixed(1) + ' ft', x + 9, y + 12);
    ctx.restore();
  }

  function drawGap2D(ctx, width, height, sim, sample, config) {
    drawBackdrop(ctx, width, height, 'GAP JUMP | SIDE ELEVATION', sim.airDrag ? 'Quadratic air drag, wind, and landing geometry' : 'Ideal projectile reference: drag disabled');
    var maxWorldX = Math.max(sim.rangeM, sim.rangeIdealM, sim.gapM + sim.landingZoneM + 0.7, 5);
    var left = 70;
    var right = width - 44;
    var baseY = height - 72;
    var sx = (right - left) / maxWorldX;
    var sy = Math.min((height - 152) / Math.max(2.4, sim.peakM * 1.24), sx);
    function map(x, y) { return { x: left + x * sx, y: baseY - y * sy }; }

    var pit = ctx.createLinearGradient(0, baseY - 4, 0, height);
    pit.addColorStop(0, '#111b2c');
    pit.addColorStop(1, '#030711');
    ctx.fillStyle = pit;
    ctx.fillRect(left, baseY - 1, Math.max(0, map(sim.gapM, 0).x - left), height - baseY + 1);

    ctx.fillStyle = '#28384d';
    ctx.beginPath();
    ctx.moveTo(0, baseY + 34);
    ctx.lineTo(left, baseY);
    ctx.lineTo(left + 9, baseY);
    ctx.lineTo(left + 9, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#a9bad0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, baseY + 34);
    ctx.lineTo(left, baseY);
    ctx.stroke();

    var landingX = map(sim.gapM, 0).x;
    var landingEndX = map(sim.gapM + sim.landingZoneM, 0).x;
    var platform = ctx.createLinearGradient(0, baseY, 0, height);
    platform.addColorStop(0, '#43556d');
    platform.addColorStop(1, '#1d2a3d');
    ctx.fillStyle = platform;
    ctx.fillRect(landingX, baseY, width - landingX, height - baseY);
    ctx.fillStyle = 'rgba(94,224,146,.24)';
    ctx.fillRect(landingX, baseY - 10, Math.max(4, landingEndX - landingX), 10);
    ctx.strokeStyle = '#5ee092';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(landingX, baseY);
    ctx.lineTo(landingEndX, baseY);
    ctx.stroke();

    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#d8e5f4';
    ctx.lineWidth = 1;
    for (var stripe = landingX + 10; stripe < landingEndX; stripe += 18) {
      ctx.beginPath();
      ctx.moveTo(stripe, baseY - 9);
      ctx.lineTo(stripe + 8, baseY);
      ctx.stroke();
    }
    ctx.restore();

    var apexPoint = trajectoryPointAt(sim.flightPath, sim.peakTime);
    var apex = map(apexPoint.x, apexPoint.y);
    ctx.save();
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = 'rgba(122,167,255,.52)';
    ctx.beginPath();
    ctx.moveTo(apex.x, apex.y);
    ctx.lineTo(apex.x, baseY);
    ctx.stroke();
    ctx.restore();
    drawGuideLabel(ctx, sim.peakFt.toFixed(1) + ' ft apex', apex.x + 7, apex.y - 5, '#7aa7ff');

    if (sim.airDrag && sim.idealFlightPath && sim.idealFlightPath.length) {
      ctx.save();
      ctx.setLineDash([3, 6]);
      ctx.strokeStyle = 'rgba(246,184,63,.72)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (var idealIndex = 0; idealIndex < sim.idealFlightPath.length; idealIndex++) {
        var idealTrajectoryPoint = map(sim.idealFlightPath[idealIndex].x, sim.idealFlightPath[idealIndex].y);
        if (idealIndex === 0) ctx.moveTo(idealTrajectoryPoint.x, idealTrajectoryPoint.y);
        else ctx.lineTo(idealTrajectoryPoint.x, idealTrajectoryPoint.y);
      }
      ctx.stroke();
      ctx.restore();

      var idealLabelWorld = sim.idealFlightPath[Math.floor(sim.idealFlightPath.length * 0.7)];
      var idealLabelPoint = map(idealLabelWorld.x, idealLabelWorld.y);
      drawGuideLabel(ctx, 'ideal no-drag', idealLabelPoint.x + 7, idealLabelPoint.y - 8, '#f6b83f');
    }

    ctx.save();
    ctx.setLineDash([5, 6]);
    ctx.strokeStyle = 'rgba(114,220,232,.52)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var i = 0; i < sim.flightPath.length; i++) {
      var trajectoryPoint = map(sim.flightPath[i].x, sim.flightPath[i].y);
      if (i === 0) ctx.moveTo(trajectoryPoint.x, trajectoryPoint.y);
      else ctx.lineTo(trajectoryPoint.x, trajectoryPoint.y);
    }
    ctx.stroke();
    ctx.restore();

    var modeledLanding = map(sim.rangeM, 0);
    ctx.save();
    ctx.fillStyle = sim.landed ? '#5ee092' : '#fb7185';
    ctx.beginPath();
    ctx.arc(modeledLanding.x, modeledLanding.y, 5, 0, Math.PI * 2);
    ctx.fill();
    if (sample.phase === 'landing') {
      ctx.globalAlpha = 0.52;
      ctx.strokeStyle = sim.landed ? '#5ee092' : '#fb7185';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(modeledLanding.x, modeledLanding.y, 11, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    if (sample.flightTime > 0) {
      ctx.save();
      ctx.strokeStyle = '#4ed7e8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (var done = 0; done <= 30; done++) {
        var doneTime = sample.flightTime * done / 30;
        var doneWorld = trajectoryPointAt(sim.flightPath, doneTime);
        var donePoint = map(doneWorld.x, doneWorld.y);
        if (done === 0) ctx.moveTo(donePoint.x, donePoint.y);
        else ctx.lineTo(donePoint.x, donePoint.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    var p = map(sample.x, sample.y);
    if (config.showTrail) {
      ctx.save();
      for (var trail = 0; trail < 9; trail++) {
        var pp = Math.max(0, config.progress - trail * 0.022);
        var ghost = sampleGapJump(sim, pp);
        var gp = map(Math.max(0, ghost.x), ghost.y);
        ctx.globalAlpha = 0.25 * (1 - trail / 10);
        ctx.fillStyle = '#72dce8';
        ctx.beginPath();
        ctx.arc(gp.x, gp.y - 13, 4.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    var groundX = clamp(p.x, landingX, width - 20);
    ctx.save();
    ctx.globalAlpha = clamp(0.34 - sample.y * 0.08, 0.08, 0.34);
    ctx.fillStyle = '#020712';
    ctx.beginPath();
    ctx.arc(groundX, baseY + 3, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    drawSkater2D(ctx, p.x, p.y, sample.rotation, sim.vehicle.id, 'neutral');
    if (config.showVectors) {
      drawArrow(ctx, p.x, p.y - 18, p.x + clamp(sample.vx * 4.5, -55, 55), p.y - 18 - clamp(sample.vy * 4.5, -55, 55), '#4ed7e8', 'v');
      if (sample.phase !== 'approaching the ramp' && sample.phase !== 'landing') {
        drawArrow(ctx, p.x + 16, p.y - 24, p.x + 16, p.y + 23, '#fb7185', 'g');
      } else if (sample.phase === 'landing') {
        drawArrow(ctx, p.x + 16, p.y - 4, p.x + 16, p.y - clamp(sim.landingImpactG * 10, 24, 58), '#5ee092', 'N');
      }
      if (sim.airDrag && (Math.abs(sim.wind.xMps) > 0.01 || Math.abs(sim.wind.zMps) > 0.01)) {
        var windValue = Math.abs(sim.wind.xMps) > Math.abs(sim.wind.zMps) ? sim.wind.xMps : sim.wind.zMps;
        drawArrow(ctx, p.x - 10, p.y - 44, p.x - 10 + (windValue >= 0 ? 38 : -38), p.y - 44, '#f6b83f', 'air');
      }
    }
    if (config.showEnergy) drawEnergyHud(ctx, sim, sample, width);
    if (Math.abs(sim.crossDriftM) > 0.02) drawLaneInset2D(ctx, sim, width);

    drawGuideLabel(ctx, sim.gapFt.toFixed(0) + ' ft gap', left + (landingX - left) * 0.38, baseY + 28, '#d8e5f4');
    drawMotionFooter(ctx, sample, width, height, 'impact ' + sim.landingImpactG.toFixed(1) + ' g | drift ' + sim.crossDriftFt.toFixed(1) + ' ft');
  }

  function project3D(point, camera, width, height) {
    var azimuth = camera * Math.PI / 180;
    var cos = Math.cos(azimuth);
    var sin = Math.sin(azimuth);
    var rx = point.x * cos - point.z * sin;
    var rz = point.x * sin + point.z * cos;
    var pitch = 24 * Math.PI / 180;
    var ry = point.y * Math.cos(pitch) - rz * Math.sin(pitch);
    var depth = point.y * Math.sin(pitch) + rz * Math.cos(pitch);
    var perspective = 1 / (1 + clamp(depth * 0.035, -0.28, 0.5));
    var scale = Math.min(width / 12.5, height / 7.2) * perspective;
    return {
      x: width * 0.5 + rx * scale,
      y: height * 0.72 - ry * scale,
      depth: depth,
      scale: scale
    };
  }

  function path3D(ctx, points, camera, width, height, stroke, lineWidth, dash) {
    if (!points || points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth || 1;
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    for (var i = 0; i < points.length; i++) {
      var p = project3D(points[i], camera, width, height);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function polygon3D(ctx, points, camera, width, height, fill, stroke) {
    ctx.save();
    ctx.beginPath();
    for (var i = 0; i < points.length; i++) {
      var p = project3D(points[i], camera, width, height);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  function mesh3D(ctx, faces, camera, width, height) {
    var sorted = faces.map(function(face) {
      var depth = 0;
      for (var i = 0; i < face.points.length; i++) {
        depth += project3D(face.points[i], camera, width, height).depth;
      }
      return { face: face, depth: depth / face.points.length };
    }).sort(function(a, b) { return b.depth - a.depth; });
    sorted.forEach(function(entry) {
      polygon3D(ctx, entry.face.points, camera, width, height, entry.face.fill, entry.face.stroke || 'rgba(159,178,202,.18)');
    });
  }

  function drawGround3D(ctx, width, height, camera) {
    for (var x = -7; x <= 7; x++) {
      path3D(
        ctx,
        [{ x: x, y: 0, z: -5 }, { x: x, y: 0, z: 5 }],
        camera,
        width,
        height,
        x === 0 ? 'rgba(114,220,232,.34)' : 'rgba(91,125,160,.25)',
        x === 0 ? 1.5 : 1
      );
    }
    for (var z = -5; z <= 5; z++) {
      path3D(
        ctx,
        [{ x: -7, y: 0, z: z }, { x: 7, y: 0, z: z }],
        camera,
        width,
        height,
        z === 0 ? 'rgba(114,220,232,.34)' : 'rgba(91,125,160,.25)',
        z === 0 ? 1.5 : 1
      );
    }
  }

  function drawSkater3D(ctx, width, height, camera, point, rotationDeg, vehicleId, bodyPositionId) {
    var center = project3D(point, camera, width, height);
    var rad = rotationDeg * Math.PI / 180;
    var axis = { x: Math.cos(rad) * 0.36, y: 0, z: Math.sin(rad) * 0.36 };
    var left = project3D({ x: point.x - axis.x, y: point.y, z: point.z - axis.z }, camera, width, height);
    var right = project3D({ x: point.x + axis.x, y: point.y, z: point.z + axis.z }, camera, width, height);
    var tucked = bodyPositionId === 'tuck';
    var torsoHeight = tucked ? 0.42 : 0.58;
    var headHeight = tucked ? 0.66 : 0.86;
    var torso = project3D({ x: point.x, y: point.y + torsoHeight, z: point.z }, camera, width, height);
    var head = project3D({ x: point.x, y: point.y + headHeight, z: point.z }, camera, width, height);

    ctx.save();
    ctx.shadowColor = 'rgba(78,215,232,.32)';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#f8c55c';
    ctx.lineWidth = vehicleId === 'bmx' ? 5 : 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (vehicleId === 'bmx') {
      ctx.strokeStyle = '#72dce8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(left.x, left.y + 3, 5, 0, Math.PI * 2);
      ctx.moveTo(right.x + 5, right.y + 3);
      ctx.arc(right.x, right.y + 3, 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = '#f2f7ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(torso.x, torso.y);
    ctx.moveTo(torso.x, torso.y);
    ctx.lineTo(torso.x - (tucked ? 7 : 12), torso.y + 10);
    ctx.moveTo(torso.x, torso.y);
    ctx.lineTo(torso.x + (tucked ? 8 : 12), torso.y + 8);
    ctx.stroke();
    ctx.fillStyle = '#f2f7ff';
    ctx.beginPath();
    ctx.arc(head.x, head.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.arc(head.x, head.y - 1, 6.5, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return center;
  }

  function drawShadow3D(ctx, width, height, camera, point, lift) {
    var shadow = project3D(point, camera, width, height);
    ctx.save();
    ctx.globalAlpha = clamp(0.32 - finite(lift, 0) * 0.07, 0.07, 0.32);
    ctx.fillStyle = '#020712';
    ctx.beginPath();
    ctx.arc(shadow.x, shadow.y + 3, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawHalfpipe3D(ctx, width, height, sim, sample, config) {
    drawBackdrop(ctx, width, height, 'HALFPIPE | 3D ORBIT', 'Filled transition mesh with the same timed physics');
    drawGround3D(ctx, width, height, config.camera);

    var faces = [];
    var xSteps = 24;
    var zSteps = 5;
    for (var xi = 0; xi < xSteps; xi++) {
      var x0 = -4 + 8 * xi / xSteps;
      var x1 = -4 + 8 * (xi + 1) / xSteps;
      var y0 = halfpipeY(x0, sim.rampDepthM);
      var y1 = halfpipeY(x1, sim.rampDepthM);
      for (var zi = 0; zi < zSteps; zi++) {
        var z0 = -1.8 + 3.6 * zi / zSteps;
        var z1 = -1.8 + 3.6 * (zi + 1) / zSteps;
        faces.push({
          points: [
            { x: x0, y: y0, z: z0 },
            { x: x1, y: y1, z: z0 },
            { x: x1, y: y1, z: z1 },
            { x: x0, y: y0, z: z1 }
          ],
          fill: (xi + zi) % 2 === 0 ? 'rgba(61,79,103,.88)' : 'rgba(46,63,84,.90)'
        });
      }
    }
    mesh3D(ctx, faces, config.camera, width, height);

    var front = [];
    var back = [];
    for (var i = 0; i <= 48; i++) {
      var x = -4 + 8 * i / 48;
      var y = halfpipeY(x, sim.rampDepthM);
      front.push({ x: x, y: y, z: -1.8 });
      back.push({ x: x, y: y, z: 1.8 });
    }
    path3D(ctx, front, config.camera, width, height, '#b8c7d9', 3);
    path3D(ctx, back, config.camera, width, height, '#7388a3', 2);
    path3D(ctx, [{ x: -4, y: sim.rampDepthM, z: -1.95 }, { x: -4, y: sim.rampDepthM, z: 1.95 }], config.camera, width, height, '#f6b83f', 3);
    path3D(ctx, [{ x: 4, y: sim.rampDepthM, z: -1.95 }, { x: 4, y: sim.rampDepthM, z: 1.95 }], config.camera, width, height, '#f6b83f', 3);

    var trajectory = [];
    var completedTrajectory = [];
    for (var pathStep = 0; pathStep <= 60; pathStep++) {
      var progress = pathStep / 60;
      var point = sampleHalfpipe(sim, progress);
      trajectory.push({ x: point.x, y: point.y, z: 0 });
      if (progress <= config.progress) completedTrajectory.push({ x: point.x, y: point.y, z: 0 });
    }
    path3D(ctx, trajectory, config.camera, width, height, 'rgba(114,220,232,.56)', 2, [6, 6]);
    path3D(ctx, completedTrajectory, config.camera, width, height, '#4ed7e8', 3);

    if (config.showTrail) {
      ctx.save();
      for (var trail = 0; trail < 9; trail++) {
        var ghostProgress = Math.max(0, config.progress - trail * 0.022);
        var ghostSample = sampleHalfpipe(sim, ghostProgress);
        var ghostProjection = project3D(ghostSample, config.camera, width, height);
        ctx.globalAlpha = 0.25 * (1 - trail / 10);
        ctx.fillStyle = '#72dce8';
        ctx.beginPath();
        ctx.arc(ghostProjection.x, ghostProjection.y - 8, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    var surfacePoint = {
      x: sample.x,
      y: sample.x >= 3.98 ? sim.rampDepthM : halfpipeY(sample.x, sim.rampDepthM),
      z: 0
    };
    drawShadow3D(ctx, width, height, config.camera, surfacePoint, Math.max(0, sample.y - surfacePoint.y));
    var center = drawSkater3D(ctx, width, height, config.camera, sample, sample.rotation, sim.vehicle.id, sim.bodyPosition.id);
    if (config.showVectors) {
      drawArrow(ctx, center.x, center.y - 16, center.x + clamp(sample.vx * 4, -50, 50), center.y - 16 - clamp(sample.vy * 4, -50, 50), '#4ed7e8', 'v');
      if (sample.normalG === 0) {
        drawArrow(ctx, center.x + 15, center.y - 20, center.x + 15, center.y + 28, '#fb7185', 'g');
      } else {
        var normalScale = clamp(sample.normalG * 0.18, 0.35, 1.2);
        var normalStart = project3D({ x: sample.x, y: sample.y + 0.12, z: 0 }, config.camera, width, height);
        var normalEnd = project3D({ x: sample.x + sample.nx * normalScale, y: sample.y + 0.12 + sample.ny * normalScale, z: 0 }, config.camera, width, height);
        drawArrow(ctx, normalStart.x, normalStart.y, normalEnd.x, normalEnd.y, '#5ee092', 'N');
      }
    }
    if (config.showEnergy) drawEnergyHud(ctx, sim, sample, width);
    drawMotionFooter(ctx, sample, width, height, 'camera ' + Math.round(config.camera) + ' deg | ' + sim.bodyPosition.label + ' body');
  }

  function drawGap3D(ctx, width, height, sim, sample, config) {
    drawBackdrop(ctx, width, height, 'GAP JUMP | 3D ORBIT', 'Depth, crosswind drift, landing lane, and impact angle');
    drawGround3D(ctx, width, height, config.camera);
    var span = Math.max(sim.rangeM, sim.rangeIdealM, sim.gapM + sim.landingZoneM, 5);
    var k = 8 / span;
    var lipX = -4;
    var landingX = lipX + sim.gapM * k;
    var landingEnd = lipX + (sim.gapM + sim.landingZoneM) * k;
    var laneHalf = sim.landingLaneHalfM;

    polygon3D(ctx, [
      { x: -6, y: 0, z: -2.2 }, { x: lipX, y: 0.5, z: -2.2 },
      { x: lipX, y: 0.5, z: 2.2 }, { x: -6, y: 0, z: 2.2 }
    ], config.camera, width, height, 'rgba(52,68,90,.94)', '#9fb2ca');
    polygon3D(ctx, [
      { x: landingX, y: 0, z: -2.2 }, { x: 6, y: 0, z: -2.2 },
      { x: 6, y: 0, z: 2.2 }, { x: landingX, y: 0, z: 2.2 }
    ], config.camera, width, height, 'rgba(52,68,90,.96)', '#9fb2ca');
    polygon3D(ctx, [
      { x: landingX, y: 0.025, z: -laneHalf }, { x: landingEnd, y: 0.025, z: -laneHalf },
      { x: landingEnd, y: 0.025, z: laneHalf }, { x: landingX, y: 0.025, z: laneHalf }
    ], config.camera, width, height, 'rgba(94,224,146,.28)', '#5ee092');

    path3D(ctx, [{ x: landingX, y: 0.04, z: -laneHalf }, { x: 6, y: 0.04, z: -laneHalf }], config.camera, width, height, 'rgba(216,229,244,.66)', 1.5);
    path3D(ctx, [{ x: landingX, y: 0.04, z: laneHalf }, { x: 6, y: 0.04, z: laneHalf }], config.camera, width, height, 'rgba(216,229,244,.66)', 1.5);

    if (sim.airDrag && sim.idealFlightPath && sim.idealFlightPath.length) {
      var idealTrajectory = [];
      for (var idealIndex = 0; idealIndex < sim.idealFlightPath.length; idealIndex++) {
        var idealPoint = sim.idealFlightPath[idealIndex];
        idealTrajectory.push({ x: lipX + idealPoint.x * k, y: 0.5 + idealPoint.y, z: 0 });
      }
      path3D(ctx, idealTrajectory, config.camera, width, height, 'rgba(246,184,63,.72)', 1.5, [3, 6]);
    }

    var trajectory = [];
    var trajectoryShadow = [];
    var completedTrajectory = [];
    for (var i = 0; i < sim.flightPath.length; i++) {
      var flightPoint = sim.flightPath[i];
      var worldPoint = { x: lipX + flightPoint.x * k, y: 0.5 + flightPoint.y, z: flightPoint.z };
      trajectory.push(worldPoint);
      trajectoryShadow.push({ x: worldPoint.x, y: 0.02, z: worldPoint.z });
      if (flightPoint.t <= sample.flightTime) completedTrajectory.push(worldPoint);
    }
    path3D(ctx, trajectoryShadow, config.camera, width, height, 'rgba(2,7,18,.58)', 3);
    path3D(ctx, trajectory, config.camera, width, height, 'rgba(114,220,232,.56)', 2, [6, 6]);
    path3D(ctx, completedTrajectory, config.camera, width, height, '#4ed7e8', 3);

    if (config.showTrail) {
      ctx.save();
      for (var trail = 0; trail < 9; trail++) {
        var ghostProgress = Math.max(0, config.progress - trail * 0.022);
        var ghostSample = sampleGapJump(sim, ghostProgress);
        var ghostPoint = { x: lipX + Math.max(0, ghostSample.x) * k, y: 0.5 + ghostSample.y, z: ghostSample.z };
        var ghostProjection = project3D(ghostPoint, config.camera, width, height);
        ctx.globalAlpha = 0.25 * (1 - trail / 10);
        ctx.fillStyle = '#72dce8';
        ctx.beginPath();
        ctx.arc(ghostProjection.x, ghostProjection.y - 7, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    var skaterPoint = { x: lipX + Math.max(0, sample.x) * k, y: 0.5 + sample.y, z: sample.z };
    drawShadow3D(ctx, width, height, config.camera, { x: skaterPoint.x, y: 0.02, z: skaterPoint.z }, sample.y);
    var center = drawSkater3D(ctx, width, height, config.camera, skaterPoint, sample.rotation, sim.vehicle.id, 'neutral');
    if (config.showVectors) {
      drawArrow(ctx, center.x, center.y - 14, center.x + clamp(sample.vx * 4, -52, 52), center.y - 14 - clamp(sample.vy * 4, -52, 52), '#4ed7e8', 'v');
      if (sample.phase !== 'approaching the ramp' && sample.phase !== 'landing') {
        drawArrow(ctx, center.x + 14, center.y - 18, center.x + 14, center.y + 30, '#fb7185', 'g');
      } else if (sample.phase === 'landing') {
        drawArrow(ctx, center.x + 14, center.y - 2, center.x + 14, center.y - clamp(sim.landingImpactG * 9, 24, 56), '#5ee092', 'N');
      }
    }
    if (config.showEnergy) drawEnergyHud(ctx, sim, sample, width);

    if (sim.airDrag) {
      var idealLandingMarker = project3D({ x: lipX + sim.rangeIdealM * k, y: 0.04, z: 0 }, config.camera, width, height);
      ctx.save();
      ctx.strokeStyle = '#f6b83f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(idealLandingMarker.x, idealLandingMarker.y, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    var landingMarker = project3D({ x: lipX + sim.rangeM * k, y: 0.04, z: sim.crossDriftM }, config.camera, width, height);
    ctx.fillStyle = sim.landed ? '#5ee092' : '#fb7185';
    ctx.beginPath();
    ctx.arc(landingMarker.x, landingMarker.y, 5, 0, Math.PI * 2);
    ctx.fill();
    if (sample.phase === 'landing') {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = sim.landed ? '#5ee092' : '#fb7185';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(landingMarker.x, landingMarker.y, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    drawGuideLabel(ctx, (sim.withinLane ? 'lane ' : 'off lane ') + Math.abs(sim.crossDriftFt).toFixed(1) + ' ft', landingMarker.x + 8, landingMarker.y - 7, sim.withinLane ? '#5ee092' : '#fb7185');
    drawMotionFooter(ctx, sample, width, height, 'impact ' + sim.landingImpactG.toFixed(1) + ' g | ' + (sim.airDrag ? 'drag on' : 'ideal air'));
  }

  function drawScene(canvas, sim, progress, config) {
    var frame = canvasFrame(canvas);
    if (!frame) return;
    progress = clamp(finite(progress, 0), 0, 1);
    config = config || {};
    config.progress = progress;
    var sample = sim.mode === 'halfpipe' ? sampleHalfpipe(sim, progress) : sampleGapJump(sim, progress);
    if (config.view === '3d') {
      if (sim.mode === 'halfpipe') drawHalfpipe3D(frame.ctx, frame.width, frame.height, sim, sample, config);
      else drawGap3D(frame.ctx, frame.width, frame.height, sim, sample, config);
    } else {
      if (sim.mode === 'halfpipe') drawHalfpipe2D(frame.ctx, frame.width, frame.height, sim, sample, config);
      else drawGap2D(frame.ctx, frame.width, frame.height, sim, sample, config);
    }
  }

  var DEFAULTS = {
    mode: 'halfpipe',
    viewMode: '2d',
    vehicle: 'skate',
    gravity: G,
    surfaceId: 'standard',
    windId: 'calm',
    riderMassKg: RIDER_KG,
    bodyPositionId: 'neutral',
    airDrag: true,
    pumps: 3,
    rotationTarget: 360,
    spinRate: 260,
    speedMph: 17,
    angleDeg: 35,
    gapFt: 15,
    cameraAzimuth: 38,
    showVectors: true,
    showTrail: true,
    showEnergy: true,
    estimateChallenge: false,
    estimateValue: '',
    hypothesis: '',
    lastResult: null,
    lastSim: null,
    experiments: [],
    stats: { runs: 0, successful: 0, withinTen: 0 },
    viewsUsed: { '2d': true },
    surfacesTested: { standard: true }
  };

  function rounded(value, digits) {
    return finite(value, 0).toFixed(digits == null ? 1 : digits);
  }

  function resultText(sim) {
    if (sim.mode === 'halfpipe') {
      if (sim.landed) {
        return 'Aligned landing: ' + rounded(sim.hFt, 1) + ' ft above the lip, ' +
          rounded(sim.airTime, 2) + ' s airborne, and ' + Math.round(sim.completed) +
          '° of rotation with a ' + sim.bodyPosition.label.toLowerCase() + ' body position.';
      }
      return 'Rotation mismatch: the model reached ' + Math.round(sim.completed) + '° against a ' +
        Math.round(sim.rotationTarget) + '° target. Adjust pump energy, spin rate, or body position.';
    }
    var landingLoadText = ' Estimated landing load: ' + rounded(sim.landingImpactG, 1) + ' g.';
    if (sim.landed) {
      return 'Landing zone reached: ' + rounded(sim.rangeFt, 1) + ' ft traveled, ' +
        rounded(sim.clearance * M2FT, 1) + ' ft into the platform, ' +
        rounded(Math.abs(sim.crossDriftFt), 1) + ' ft of lateral drift, and an estimated ' +
        rounded(sim.landingImpactG, 1) + ' g landing load.';
    }
    if (sim.clearance < 0) {
      return 'Short of the platform by ' + rounded(Math.abs(sim.clearance) * M2FT, 1) +
        ' ft. Change speed, angle, gravity, drag, or wind.' + landingLoadText;
    }
    if (!sim.withinLane && sim.landedInDistance) {
      return 'Distance reached, but crosswind moved the rider ' + rounded(Math.abs(sim.crossDriftFt), 1) +
        ' ft laterally outside the landing lane.' + landingLoadText;
    }
    return 'Past the landing zone by ' + ((sim.clearance - 1.2) * M2FT).toFixed(1) + ' ft.' +
      ' Reduce range or widen your safety margin.' + landingLoadText;
  }

  window.StemLab.registerTool('skatelab', {
    icon: '🛹',
    label: 'Skate Lab',
    desc: 'A 2D and 3D skate-physics simulator for energy, forces, rotation, and projectile motion.',
    color: 'amber',
    category: 'science',
    gradeRange: '6-12',
    questHooks: [
      {
        id: 'sk_run_model',
        label: 'Run your first physics model',
        icon: '▶',
        check: function(data) { return ((data.stats && data.stats.runs) || 0) >= 1; },
        progress: function(data) { return ((data.stats && data.stats.runs) || 0) + '/1 runs'; }
      },
      {
        id: 'sk_compare_views',
        label: 'Compare the 2D and 3D views',
        icon: '◫',
        check: function(data) { return !!(data.viewsUsed && data.viewsUsed['2d'] && data.viewsUsed['3d']); },
        progress: function(data) {
          var used = data.viewsUsed || {};
          return (used['2d'] ? 1 : 0) + (used['3d'] ? 1 : 0) + '/2 views';
        }
      },
      {
        id: 'sk_surface_test',
        label: 'Compare all three surfaces',
        icon: '≈',
        check: function(data) { return Object.keys(data.surfacesTested || {}).length >= 3; },
        progress: function(data) { return Object.keys(data.surfacesTested || {}).length + '/3 surfaces'; }
      },
      {
        id: 'sk_estimate_within_10',
        label: 'Estimate within 10%',
        icon: '±',
        check: function(data) { return ((data.stats && data.stats.withinTen) || 0) >= 1; },
        progress: function(data) { return ((data.stats && data.stats.withinTen) || 0) + '/1 estimates'; }
      },
      {
        id: 'sk_clear_gap',
        label: 'Model a safe gap landing',
        icon: '✓',
        check: function(data) {
          return (data.experiments || []).some(function(entry) { return entry.mode === 'gap' && entry.landed; });
        },
        progress: function(data) {
          return (data.experiments || []).some(function(entry) { return entry.mode === 'gap' && entry.landed; }) ? 'complete' : 'pending';
        }
      }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var toolData = ctx.toolData || {};
      var setToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var announceToSR = ctx.announceToSR;
      var __alloT = function(key, fallback) {
        try {
          return typeof ctx.t === 'function' ? (ctx.t(key, fallback) || fallback) : fallback;
        } catch (err) {
          return fallback;
        }
      };

      var seeded = toolData.skatelab || {};
      var d = Object.assign({}, DEFAULTS, seeded);
      d.stats = Object.assign({}, DEFAULTS.stats, seeded.stats || {});
      d.viewsUsed = Object.assign({}, DEFAULTS.viewsUsed, seeded.viewsUsed || {});
      d.surfacesTested = Object.assign({}, DEFAULTS.surfacesTested, seeded.surfacesTested || {});
      d.experiments = Array.isArray(seeded.experiments) ? seeded.experiments : [];

      if (!toolData.skatelab && typeof setToolData === 'function') {
        setToolData(function(previous) {
          previous = previous || {};
          return Object.assign({}, previous, { skatelab: Object.assign({}, DEFAULTS) });
        });
      }

      function upd(patch) {
        if (typeof setToolData !== 'function') return;
        setToolData(function(previous) {
          previous = previous || {};
          var current = Object.assign({}, DEFAULTS, previous.skatelab || {});
          current.stats = Object.assign({}, DEFAULTS.stats, current.stats || {});
          current.viewsUsed = Object.assign({}, DEFAULTS.viewsUsed, current.viewsUsed || {});
          current.surfacesTested = Object.assign({}, DEFAULTS.surfacesTested, current.surfacesTested || {});
          current.experiments = Array.isArray(current.experiments) ? current.experiments : [];
          var values = typeof patch === 'function' ? patch(current) : patch;
          return Object.assign({}, previous, { skatelab: Object.assign({}, current, values || {}) });
        });
      }

      var mode = d.mode === 'gap' ? 'gap' : 'halfpipe';
      var viewMode = d.viewMode === '3d' ? '3d' : '2d';
      var sim = mode === 'halfpipe' ? simHalfpipe({
        pumps: d.pumps,
        vehicle: d.vehicle,
        gravity: d.gravity,
        surfaceId: d.surfaceId,
        rotationTarget: d.rotationTarget,
        spinRate: d.spinRate,
        riderMassKg: d.riderMassKg,
        bodyPositionId: d.bodyPositionId
      }) : simGapJump({
        speedMph: d.speedMph,
        angleDeg: d.angleDeg,
        gapFt: d.gapFt,
        vehicle: d.vehicle,
        gravity: d.gravity,
        windId: d.windId,
        riderMassKg: d.riderMassKg,
        airDrag: d.airDrag !== false
      });

      var canvasRef = React.useRef(null);
      var animationRef = React.useRef(null);
      var runningState = React.useState(false);
      var running = runningState[0];
      var setRunning = runningState[1];
      var localStatusState = React.useState('');
      var localStatus = localStatusState[0];
      var setLocalStatus = localStatusState[1];
      var playheadState = React.useState(0);
      var playhead = playheadState[0];
      var setPlayhead = playheadState[1];
      var playheadRef = React.useRef(0);
      var lastTelemetryPaintRef = React.useRef(0);

      function commitPlayhead(nextProgress) {
        nextProgress = clamp(finite(nextProgress, 0), 0, 1);
        playheadRef.current = nextProgress;
        setPlayhead(nextProgress);
      }

      function renderConfig() {
        return {
          view: viewMode,
          camera: finite(d.cameraAzimuth, 38),
          showVectors: d.showVectors !== false,
          showTrail: d.showTrail !== false,
          showEnergy: d.showEnergy !== false
        };
      }

      React.useEffect(function() {
        if (!canvasRef.current) return undefined;
        function redraw() {
          if (!running && canvasRef.current) {
            drawScene(canvasRef.current, sim, playheadRef.current, renderConfig());
          }
        }
        redraw();
        var observer = null;
        if (typeof window !== 'undefined' && typeof window.ResizeObserver === 'function') {
          observer = new window.ResizeObserver(redraw);
          observer.observe(canvasRef.current.parentElement || canvasRef.current);
        } else if (typeof window !== 'undefined' && window.addEventListener) {
          window.addEventListener('resize', redraw);
        }
        return function() {
          if (observer) observer.disconnect();
          else if (typeof window !== 'undefined' && window.removeEventListener) window.removeEventListener('resize', redraw);
        };
      }, [
        running, mode, viewMode, d.pumps, d.vehicle, d.gravity, d.surfaceId,
        d.rotationTarget, d.spinRate, d.speedMph, d.angleDeg, d.gapFt, d.windId,
        d.riderMassKg, d.bodyPositionId, d.airDrag, d.cameraAzimuth,
        d.showVectors, d.showTrail, d.showEnergy
      ]);

      React.useEffect(function() {
        return function() {
          if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
      }, []);

      function finishRun(finishedSim, shouldLog) {
        commitPlayhead(1);
        setRunning(false);
        setLocalStatus(resultText(finishedSim));
        if (typeof announceToSR === 'function') announceToSR(resultText(finishedSim));
        if (!shouldLog) return;

        upd(function(current) {
          var actual = finishedSim.mode === 'halfpipe' ? finishedSim.hFt : finishedSim.rangeFt;
          var estimate = Number(current.estimateValue);
          var hasEstimate = Number.isFinite(estimate) && estimate >= 0 && String(current.estimateValue).trim() !== '';
          var errorPct = hasEstimate ? Math.abs(estimate - actual) / Math.max(0.01, actual) * 100 : null;
          var stats = Object.assign({}, current.stats || DEFAULTS.stats);
          stats.runs = (stats.runs || 0) + 1;
          stats.successful = (stats.successful || 0) + (finishedSim.landed ? 1 : 0);
          stats.withinTen = (stats.withinTen || 0) + (errorPct !== null && errorPct <= 10 ? 1 : 0);
          var entry = {
            id: Date.now(),
            mode: finishedSim.mode,
            view: current.viewMode,
            setup: finishedSim.mode === 'halfpipe'
              ? current.pumps + ' pumps · ' + current.surfaceId + ' · ' + current.rotationTarget +
                '° target · ' + getBodyPosition(current.bodyPositionId).label.toLowerCase()
              : current.speedMph + ' mph · ' + current.angleDeg + '° · ' + current.gapFt +
                ' ft gap · ' + getWind(current.windId).label.toLowerCase() +
                (current.airDrag === false ? ' · ideal air' : ' · drag on'),
            measured: actual,
            unit: 'ft',
            estimate: hasEstimate ? estimate : null,
            errorPct: errorPct,
            landed: finishedSim.landed
          };
          return {
            lastResult: finishedSim,
            lastSim: finishedSim,
            experiments: [entry].concat(current.experiments || []).slice(0, 8),
            stats: stats
          };
        });
      }

      function animateModel(model, shouldLog) {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        commitPlayhead(0);
        lastTelemetryPaintRef.current = 0;
        setRunning(true);
        setLocalStatus(model.mode === 'halfpipe' ? 'Running the energy model…' : 'Solving the projectile path…');
        var reduced = false;
        try {
          reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        } catch (err) {
          reduced = false;
        }
        if (reduced) {
          commitPlayhead(1);
          drawScene(canvasRef.current, model, 1, renderConfig());
          finishRun(model, shouldLog);
          return;
        }

        var start = null;
        var duration = clamp(model.motionDuration * 1100, 2600, 5200);
        function frame(time) {
          if (start === null) start = time;
          var progress = clamp((time - start) / duration, 0, 1);
          playheadRef.current = progress;
          if (time - lastTelemetryPaintRef.current >= 90 || progress >= 1) {
            lastTelemetryPaintRef.current = time;
            setPlayhead(progress);
          }
          drawScene(canvasRef.current, model, progress, renderConfig());
          if (progress < 1) animationRef.current = requestAnimationFrame(frame);
          else {
            animationRef.current = null;
            finishRun(model, shouldLog);
          }
        }
        animationRef.current = requestAnimationFrame(frame);
      }

      function chooseView(nextView) {
        if (running) return;
        upd(function(current) {
          var used = Object.assign({}, current.viewsUsed || {});
          used[nextView] = true;
          return { viewMode: nextView, viewsUsed: used };
        });
      }

      function chooseSurface(nextSurface) {
        if (running) return;
        upd(function(current) {
          var tested = Object.assign({}, current.surfacesTested || {});
          tested[nextSurface] = true;
          return { surfaceId: nextSurface, surfacesTested: tested };
        });
      }

      function chooseMode(nextMode) {
        if (running || nextMode === mode) return;
        commitPlayhead(0);
        upd({ mode: nextMode, lastResult: null });
      }

      function modeKeyDown(event) {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        var next = mode === 'halfpipe' ? 'gap' : 'halfpipe';
        chooseMode(next);
        if (typeof document !== 'undefined') {
          setTimeout(function() {
            var target = document.getElementById('sk-mode-tab-' + next);
            if (target) target.focus();
          }, 0);
        }
      }

      function rangeControl(id, label, value, min, max, step, unit, onChange, help) {
        return h('div', { className: 'sk-control' },
          h('div', { className: 'sk-control-head' },
            h('label', { htmlFor: id }, label),
            h('output', { htmlFor: id }, value + unit)
          ),
          h('input', {
            id: id,
            type: 'range',
            min: min,
            max: max,
            step: step,
            value: value,
            disabled: running,
            onChange: onChange
          }),
          help && h('p', { className: 'sk-help' }, help)
        );
      }

      function radioGrid(name, value, options, onChange) {
        return h('div', { className: 'sk-radio-grid', role: 'radiogroup', 'aria-label': name },
          options.map(function(option) {
            var id = 'sk-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + option.id;
            return h('label', { key: option.id, htmlFor: id },
              h('input', {
                id: id,
                type: 'radio',
                name: 'sk-' + name,
                value: option.id,
                checked: value === option.id,
                disabled: running,
                onChange: function() { onChange(option.id); }
              }),
              h('span', null, option.label)
            );
          })
        );
      }

      var estimateNumber = Number(d.estimateValue);
      var estimateValid = String(d.estimateValue).trim() !== '' && Number.isFinite(estimateNumber) && estimateNumber >= 0;
      var estimateBlocked = !!d.estimateChallenge && !estimateValid;
      var result = d.lastResult && d.lastResult.mode === mode ? d.lastResult : null;
      var currentSample = mode === 'halfpipe'
        ? sampleHalfpipe(sim, playhead)
        : sampleGapJump(sim, playhead);
      var mechanicalPct = clamp((sim.mechanicalJ / Math.max(1, sim.energyInputJ)) * 100, 0, 100);
      var thermalPct = 100 - mechanicalPct;
      var bottomLoad = mode === 'halfpipe' ? sim.bottomNormalG : 0;
      var metricData = mode === 'halfpipe' ? [
        { label: 'Lip speed', value: rounded(sim.vMph, 1) + ' mph' },
        { label: 'Air above lip', value: rounded(sim.hFt, 1) + ' ft' },
        { label: 'Hang time', value: rounded(sim.airTime, 2) + ' s' },
        { label: 'Modeled rotation', value: Math.round(sim.completed) + '°' },
        { label: 'Rotation error', value: rounded(sim.rotationError, 0) + '°' },
        { label: 'Bottom load', value: rounded(bottomLoad, 1) + ' g' }
      ] : [
        { label: 'Horizontal range', value: rounded(sim.rangeFt, 1) + ' ft' },
        { label: 'Peak height', value: rounded(sim.peakFt, 1) + ' ft' },
        { label: 'Flight time', value: rounded(sim.airTime, 2) + ' s' },
        { label: 'Landing load', value: rounded(sim.landingImpactG, 1) + ' g' },
        { label: 'Landing angle', value: rounded(sim.landingAngleDeg, 0) + '°' },
        { label: 'Lateral drift', value: rounded(Math.abs(sim.crossDriftFt), 1) + ' ft' }
      ];

      var canvasSummary = mode === 'halfpipe'
        ? 'The ' + viewMode.toUpperCase() + ' view shows a ' + sim.vehicle.label.toLowerCase() +
          ' following the curved halfpipe transition, converting potential and kinetic energy, then using a ' +
          sim.bodyPosition.label.toLowerCase() + ' body position to change rotational inertia. Current model: ' +
          rounded(sim.hFt, 1) + ' feet above the lip, ' + rounded(sim.bottomNormalG, 1) +
          ' g at the bottom, and ' + Math.round(sim.completed) + ' degrees of rotation.'
        : 'The ' + viewMode.toUpperCase() + ' view shows a ' + sim.vehicle.label.toLowerCase() +
          ' following a ' + (sim.airDrag ? 'drag-adjusted projectile arc beside an amber ideal no-drag reference' : 'no-drag projectile arc') +
          ' across a ' + rounded(sim.gapFt, 0) + ' foot gap. Current model range is ' + rounded(sim.rangeFt, 1) +
          ' feet, lateral drift is ' + rounded(Math.abs(sim.crossDriftFt), 1) + ' feet, landing angle is ' +
          rounded(sim.landingAngleDeg, 0) + ' degrees, and estimated landing load is ' +
          rounded(sim.landingImpactG, 1) + ' g.';

      var statusText = localStatus || (result ? resultText(result) : 'Predicted result: ' + resultText(sim));

      var equation = mode === 'halfpipe'
        ? 'Transition: v-bottom = √(v-lip² + 2gd) = ' + rounded(sim.bottomSpeed, 2) +
          ' m/s; N/(mg) = v²/(rg) + n-y = ' + rounded(sim.bottomNormalG, 2) +
          ' at the bottom. Launch: ½mv² = ' + Math.round(sim.energyInputJ) + ' J input → ηE = ' +
          Math.round(sim.mechanicalJ) + ' J mechanical; h = E/(mg) = ' + rounded(sim.hAir, 2) +
          ' m; θ = ωt = ' + rounded(sim.airSpinRate, 0) + '°/s × ' + rounded(sim.airTime, 2) +
          ' s = ' + Math.round(sim.completed) + '°. Tucking changes I and therefore ω.'
        : (sim.airDrag
          ? 'Quadratic drag: a = -½ρ(CdA/m)|v-relative|v-relative, integrated every 1/180 s. ' +
            'Range = ' + rounded(sim.rangeM, 2) + ' m versus ' + rounded(sim.rangeIdealM, 2) +
            ' m for the ideal no-drag reference. Estimated landing load: N/(mg) ≈ 1 + v-y²/(2gd-stop) = ' +
            rounded(sim.landingImpactG, 2) + ' for a ' + rounded(sim.landingCompressionM, 2) + ' m compression.'
          : 'Ideal reference: t = 2v·sin(θ)/g = ' + rounded(sim.airTime, 2) +
            ' s; R = v²sin(2θ)/g = ' + rounded(sim.rangeIdealM, 2) +
            ' m; h-max = v-y²/(2g) = ' + rounded(sim.peakM, 2) +
            ' m; estimated landing load = ' + rounded(sim.landingImpactG, 2) + ' g.');

      var controls = mode === 'halfpipe'
        ? h('div', { className: 'sk-control-group' },
            rangeControl('sk-pumps', 'Pumps', d.pumps, 0, 6, 1, '', function(event) {
              upd({ pumps: Number(event.target.value) });
            }, 'Each pump adds speed, so kinetic energy rises with v².'),
            h('div', { className: 'sk-control' },
              h('div', { className: 'sk-control-head' }, h('span', null, 'Surface'), h('output', null, getSurface(d.surfaceId).note)),
              radioGrid('Surface', d.surfaceId, [SURFACES.wax, SURFACES.standard, SURFACES.rough], chooseSurface)
            ),
            h('div', { className: 'sk-control' },
              h('div', { className: 'sk-control-head' }, h('label', { htmlFor: 'sk-rotation-target' }, 'Rotation target'), h('output', { htmlFor: 'sk-rotation-target' }, d.rotationTarget + '°')),
              h('select', {
                id: 'sk-rotation-target',
                value: d.rotationTarget,
                disabled: running,
                onChange: function(event) { upd({ rotationTarget: Number(event.target.value) }); }
              },
                [0, 180, 360, 540, 720].map(function(value) {
                  return h('option', { key: value, value: value }, value === 0 ? 'No spin' : value + '°');
                })
              )
            ),
            rangeControl('sk-spin-rate', 'Takeoff angular speed', d.spinRate, 0, 700, 10, '°/s', function(event) {
              upd({ spinRate: Number(event.target.value) });
            }, 'The body-position model changes this rate through rotational inertia.'),
            h('div', { className: 'sk-control' },
              h('div', { className: 'sk-control-head' },
                h('span', null, 'Body position'),
                h('output', null, getBodyPosition(d.bodyPositionId).note)
              ),
              radioGrid('Body position', d.bodyPositionId, [
                BODY_POSITIONS.open,
                BODY_POSITIONS.neutral,
                BODY_POSITIONS.tuck
              ], function(value) { upd({ bodyPositionId: value }); })
            )
          )
        : h('div', { className: 'sk-control-group' },
            rangeControl('sk-speed', 'Takeoff speed', d.speedMph, 8, 32, 1, ' mph', function(event) {
              upd({ speedMph: Number(event.target.value) });
            }, 'Range grows approximately with the square of speed.'),
            rangeControl('sk-angle', 'Ramp angle', d.angleDeg, 10, 70, 1, '°', function(event) {
              upd({ angleDeg: Number(event.target.value) });
            }, 'On level ground without wind or drag, range peaks at 45°.'),
            rangeControl('sk-gap', 'Gap distance', d.gapFt, 8, 30, 1, ' ft', function(event) {
              upd({ gapFt: Number(event.target.value) });
            }),
            h('div', { className: 'sk-control' },
              h('div', { className: 'sk-control-head' }, h('span', null, 'Wind'), h('output', null, getWind(d.windId).label)),
              radioGrid('Wind', d.windId, [
                WINDS.head,
                WINDS.calm,
                WINDS.tail,
                WINDS.cross_left,
                WINDS.cross_right
              ], function(value) { upd({ windId: value }); }),
              h('p', { className: 'sk-help' }, d.airDrag === false
                ? 'Wind has no effect in the ideal no-drag model.'
                : 'Wind changes relative airspeed; crosswind also changes lateral landing position.')
            ),
            h('label', { className: 'sk-switch', htmlFor: 'sk-air-drag' },
              h('input', {
                id: 'sk-air-drag',
                type: 'checkbox',
                checked: d.airDrag !== false,
                disabled: running,
                onChange: function(event) { upd({ airDrag: event.target.checked }); }
              }),
              h('span', null, 'Quadratic air drag'),
              h('output', null, d.airDrag === false ? 'Ideal' : 'Realistic')
            )
          );

      var advancedControls = h('details', { className: 'sk-advanced' },
        h('summary', null, 'Advanced physics'),
        h('div', { className: 'sk-advanced-body' },
          rangeControl('sk-rider-mass', 'Rider mass', d.riderMassKg, 35, 110, 1, ' kg', function(event) {
            upd({ riderMassKg: Number(event.target.value) });
          }, mode === 'halfpipe'
            ? 'Mass changes the joules in the ledger, while ideal height still follows speed and gravity.'
            : 'With drag enabled, a larger mass has more inertia relative to the same frontal area.'),
          h('p', { className: 'sk-model-note' }, mode === 'halfpipe'
            ? 'Effective rotational inertia: ' + rounded(sim.effectiveInertia, 1) + ' kg·m² · angular momentum: ' +
              rounded(sim.angularMomentum, 1) + ' kg·m²/s.'
            : 'Ideal range reference: ' + rounded(sim.rangeIdealM * M2FT, 1) + ' ft · modeled range delta: ' +
              (sim.rangeDeltaFt >= 0 ? '+' : '') + rounded(sim.rangeDeltaFt, 1) + ' ft · drag loss: ' +
              Math.round(sim.thermalJ) + ' J · estimated landing load: ' + rounded(sim.landingImpactG, 1) + ' g.')
        )
      );

      return h('div', { className: 'skatelab-shell', 'data-skatelab-overhaul': 'physics-first' },
        h('header', { className: 'sk-header' },
          h('div', { className: 'sk-heading' },
            h('button', {
              type: 'button',
              className: 'sk-back',
              onClick: function() { if (typeof setStemLabTool === 'function') setStemLabTool(null); },
              'aria-label': __alloT('stem.skatelab.back_to_stem_lab', 'Back to STEM Lab')
            }, '←'),
            h('div', null,
              h('h2', { className: 'sk-title' }, __alloT('stem.skatelab.title', 'Skate Lab')),
              h('p', { className: 'sk-kicker' }, __alloT('stem.skatelab.subtitle', 'Build a setup. Run the model. Explain the motion.'))
            )
          ),
          h('div', { className: 'sk-view-switch', role: 'group', 'aria-label': 'Simulation view' },
            h('button', {
              type: 'button',
              'aria-pressed': viewMode === '2d',
              disabled: running,
              onClick: function() { chooseView('2d'); }
            }, '2D side view'),
            h('button', {
              type: 'button',
              'aria-pressed': viewMode === '3d',
              disabled: running,
              onClick: function() { chooseView('3d'); }
            }, '3D orbit view')
          )
        ),

        h('div', { className: 'sk-workbench' },
          h('section', { className: 'sk-stage', 'data-skatelab-run-focus': 'true', 'aria-label': 'Simulation stage' },
            h('div', { className: 'sk-canvas-frame' },
              h('canvas', {
                ref: canvasRef,
                className: 'sk-canvas',
                role: 'img',
                'data-a11y-static': 'true',
                'aria-label': (function() {
                  return mode === 'halfpipe' ? 'Halfpipe physics simulation in ' + viewMode.toUpperCase() + ' view' :
                    'Gap-jump projectile simulation in ' + viewMode.toUpperCase() + ' view';
                })(),
                'aria-describedby': 'sk-canvas-summary'
              }, 'A visual simulation of skate physics. The full numeric description appears below.')
            ),
            h('div', { className: 'sk-stage-toolbar' },
              h('div', {
                className: 'sk-live-telemetry',
                'aria-label': 'Live motion telemetry: ' + currentSample.phase + ', ' +
                  rounded(currentSample.time, 2) + ' seconds, ' +
                  rounded(currentSample.speedMps * MPS2MPH, 1) + ' miles per hour, ' +
                  (mode === 'halfpipe'
                    ? rounded(currentSample.normalG, 1) + ' g normal load'
                    : rounded(Math.abs(currentSample.z) * M2FT, 1) + ' feet lateral drift')
              },
                h('span', { className: 'sk-phase' }, currentSample.phase),
                h('span', null, rounded(currentSample.time, 2) + ' s'),
                h('span', null, rounded(currentSample.speedMps * MPS2MPH, 1) + ' mph'),
                h('span', null, mode === 'halfpipe'
                  ? Math.round(currentSample.rotation) + '° rotation'
                  : rounded(Math.max(0, currentSample.y) * M2FT, 1) + ' ft high'),
                h('span', null, mode === 'halfpipe'
                  ? (currentSample.normalG > 0.05 ? rounded(currentSample.normalG, 1) + ' g load' : 'airborne')
                  : (currentSample.phase === 'landing'
                    ? rounded(sim.landingImpactG, 1) + ' g landing'
                    : rounded(Math.abs(currentSample.z) * M2FT, 1) + ' ft drift'))
              ),
              d.lastSim && d.lastSim.mode === mode && h('button', {
                type: 'button',
                className: 'sk-secondary',
                disabled: running,
                onClick: function() { animateModel(d.lastSim, false); }
              }, 'Replay')
            ),
            h('div', { className: 'sk-timeline' },
              h('label', { htmlFor: 'sk-playhead' },
                h('span', null, 'Motion timeline'),
                h('output', { htmlFor: 'sk-playhead' }, Math.round(playhead * 100) + '%')
              ),
              h('input', {
                id: 'sk-playhead',
                type: 'range',
                min: 0,
                max: 100,
                step: 1,
                value: Math.round(playhead * 100),
                disabled: running,
                onChange: function(event) {
                  var nextProgress = Number(event.target.value) / 100;
                  commitPlayhead(nextProgress);
                  if (canvasRef.current) drawScene(canvasRef.current, sim, nextProgress, renderConfig());
                  var inspected = mode === 'halfpipe'
                    ? sampleHalfpipe(sim, nextProgress)
                    : sampleGapJump(sim, nextProgress);
                  setLocalStatus('Inspecting ' + inspected.phase + ' at ' + rounded(inspected.time, 2) + ' seconds.');
                }
              })
            ),
            h('div', { className: 'sk-stage-legend' },
              h('b', null, viewMode === '3d' ? 'Perspective model' : 'Side elevation'),
              ' · cyan = modeled motion · rose = gravity · green = normal force or landing lane · amber = ' +
                (mode === 'gap' ? 'ideal no-drag reference' : 'surface energy loss')
            ),
            h('p', { id: 'sk-canvas-summary', className: 'sk-canvas-summary' }, canvasSummary)
          ),

          h('aside', { className: 'sk-controls', 'aria-label': 'Physics controls' },
            h('div', { className: 'sk-mode-tabs', role: 'tablist', 'aria-label': 'Experiment type' },
              h('button', {
                type: 'button',
                id: 'sk-mode-tab-halfpipe',
                role: 'tab',
                'aria-selected': mode === 'halfpipe',
                'aria-controls': 'sk-mode-panel',
                tabIndex: mode === 'halfpipe' ? 0 : -1,
                disabled: running,
                onKeyDown: modeKeyDown,
                onClick: function() { chooseMode('halfpipe'); }
              }, 'Halfpipe energy'),
              h('button', {
                type: 'button',
                id: 'sk-mode-tab-gap',
                role: 'tab',
                'aria-selected': mode === 'gap',
                'aria-controls': 'sk-mode-panel',
                tabIndex: mode === 'gap' ? 0 : -1,
                disabled: running,
                onKeyDown: modeKeyDown,
                onClick: function() { chooseMode('gap'); }
              }, 'Gap projectile')
            ),
            h('div', {
              id: 'sk-mode-panel',
              role: 'tabpanel',
              'aria-labelledby': 'sk-mode-tab-' + mode,
              className: 'sk-control-group'
            },
              h('div', { className: 'sk-control' },
                h('div', { className: 'sk-control-head' }, h('span', null, 'Rider setup'), h('output', null, getVehicle(d.vehicle).label)),
                radioGrid('Vehicle', d.vehicle, [VEHICLES.skate, VEHICLES.bmx], function(value) { upd({ vehicle: value }); })
              ),
              h('div', { className: 'sk-control' },
                h('div', { className: 'sk-control-head' }, h('label', { htmlFor: 'sk-gravity' }, 'Gravity'), h('output', { htmlFor: 'sk-gravity' }, rounded(d.gravity, 2) + ' m/s²')),
                h('select', {
                  id: 'sk-gravity',
                  value: d.gravity,
                  disabled: running,
                  onChange: function(event) { upd({ gravity: Number(event.target.value) }); }
                },
                  h('option', { value: 9.81 }, 'Earth · 9.81 m/s²'),
                  h('option', { value: 3.71 }, 'Mars · 3.71 m/s²'),
                  h('option', { value: 1.62 }, 'Moon · 1.62 m/s²')
                )
              ),
              controls,
              advancedControls,
              viewMode === '3d' && rangeControl('sk-camera', 'Camera azimuth', d.cameraAzimuth, -55, 55, 1, '°', function(event) {
                upd({ cameraAzimuth: Number(event.target.value) });
              }, 'Rotate the perspective without changing the physics.'),
              h('div', { className: 'sk-checks' },
                h('label', { className: 'sk-check' },
                  h('input', {
                    type: 'checkbox',
                    checked: d.showVectors !== false,
                    disabled: running,
                    onChange: function(event) { upd({ showVectors: event.target.checked }); }
                  }),
                  h('span', null, 'Force vectors')
                ),
                h('label', { className: 'sk-check' },
                  h('input', {
                    type: 'checkbox',
                    checked: d.showTrail !== false,
                    disabled: running,
                    onChange: function(event) { upd({ showTrail: event.target.checked }); }
                  }),
                  h('span', null, 'Motion trail')
                ),
                h('label', { className: 'sk-check' },
                  h('input', {
                    type: 'checkbox',
                    checked: d.showEnergy !== false,
                    disabled: running,
                    onChange: function(event) { upd({ showEnergy: event.target.checked }); }
                  }),
                  h('span', null, 'Energy HUD')
                ),
                h('label', { className: 'sk-check' },
                  h('input', {
                    type: 'checkbox',
                    checked: !!d.estimateChallenge,
                    disabled: running,
                    onChange: function(event) { upd({ estimateChallenge: event.target.checked }); }
                  }),
                  h('span', null, 'Require estimate')
                )
              )
            ),
            h('div', { className: 'sk-estimate' },
              h('label', { htmlFor: 'sk-estimate' }, mode === 'halfpipe' ? 'Estimate air height (ft)' : 'Estimate range (ft)'),
              h('input', {
                id: 'sk-estimate',
                type: 'number',
                min: 0,
                step: 0.1,
                value: d.estimateValue,
                disabled: running,
                'aria-invalid': d.estimateChallenge && !estimateValid ? 'true' : undefined,
                'aria-describedby': d.estimateChallenge && !estimateValid ? 'sk-estimate-error' : undefined,
                onChange: function(event) { upd({ estimateValue: event.target.value }); }
              })
            ),
            d.estimateChallenge && !estimateValid && h('p', { id: 'sk-estimate-error', className: 'sk-error', role: 'alert' }, 'Enter an estimate of zero or greater before running.'),
            h('div', { className: 'sk-actions' },
              h('button', {
                type: 'button',
                className: 'sk-run',
                'data-skatelab-launch': 'true',
                disabled: running || estimateBlocked,
                onClick: function() { animateModel(sim, true); }
              }, running ? 'Running…' : (mode === 'halfpipe' ? 'Drop In!' : 'Launch Jump')),
              h('button', {
                type: 'button',
                className: 'sk-secondary',
                disabled: running,
                onClick: function() {
                  commitPlayhead(0);
                  setLocalStatus('');
                  upd(mode === 'halfpipe'
                    ? { pumps: 3, surfaceId: 'standard', rotationTarget: 360, spinRate: 260, bodyPositionId: 'neutral' }
                    : { speedMph: 17, angleDeg: 35, gapFt: 15, windId: 'calm', airDrag: true });
                }
              }, 'Reset setup')
            ),
            h('div', {
              className: 'sk-status',
              role: 'status',
              'aria-live': 'polite',
              'aria-atomic': 'true',
              'data-result': result ? (result.landed ? 'success' : 'miss') : ''
            }, statusText)
          )
        ),

        h('section', { className: 'sk-metrics', 'aria-label': 'Live model outputs' },
          metricData.map(function(metric) {
            return h('div', { className: 'sk-metric', key: metric.label },
              h('span', { className: 'sk-metric-value' }, metric.value),
              h('span', { className: 'sk-metric-label' }, metric.label)
            );
          })
        ),

        h('div', { className: 'sk-below' },
          h('section', { className: 'sk-panel', 'aria-labelledby': 'sk-energy-title' },
            h('h3', { id: 'sk-energy-title' }, 'Energy ledger'),
            h('div', {
              className: 'sk-ledger-row',
              role: 'img',
              'aria-label': rounded(mechanicalPct, 0) + ' percent mechanical energy and ' + rounded(thermalPct, 0) + ' percent thermal transfer'
            },
              h('div', { className: 'sk-ledger-mechanical', style: { width: mechanicalPct + '%' } }),
              h('div', { className: 'sk-ledger-thermal', style: { width: thermalPct + '%' } })
            ),
            h('div', { className: 'sk-ledger-labels' },
              h('span', null, Math.round(sim.mechanicalJ) + ' J mechanical'),
              h('span', null, Math.round(sim.thermalJ) + ' J thermal'),
              h('span', null, Math.round(sim.energyInputJ) + ' J input')
            ),
            h('code', { className: 'sk-equation' }, equation)
          ),
          h('section', { className: 'sk-panel', 'aria-labelledby': 'sk-question-title' },
            h('h3', { id: 'sk-question-title' }, 'What should you test next?'),
            h('p', { className: 'sk-question' }, mode === 'halfpipe'
              ? 'Hold pump energy and takeoff spin constant. Compare open, neutral, and tucked body positions. Which changes rotation without changing hang time?'
              : 'Compare the cyan modeled path with the amber ideal path, then add a crosswind. Which changes range, landing load, and lateral drift?'),
            h('p', { className: 'sk-question' },
              h('strong', null, sim.landed ? 'Current model lands. ' : 'Current model misses. '),
              mode === 'halfpipe'
                ? 'Rotation error is ' + rounded(sim.rotationError, 0) + '° and effective inertia is ' + rounded(sim.effectiveInertia, 1) + ' kg·m².'
                : 'The landing zone is ' + rounded(sim.landingZoneM * M2FT, 1) + ' ft long and ' +
                  rounded(sim.landingLaneHalfM * M2FT * 2, 1) + ' ft wide; modeled drift is ' +
                  rounded(Math.abs(sim.crossDriftFt), 1) + ' ft; estimated landing load is ' +
                  rounded(sim.landingImpactG, 1) + ' g.'
            )
          )
        ),

        h('details', { className: 'sk-panel sk-details', 'data-skatelab-inquiry-panel': 'true' },
          h('summary', null, 'Physics inquiry and experiment log'),
          h('div', { className: 'sk-notes' },
            h('label', { htmlFor: 'sk-hypothesis' }, mode === 'halfpipe'
              ? 'Your hypothesis: what controls hang time most? How will tucking change rotation?'
              : 'Your hypothesis: how will drag or crosswind change range and landing position?'),
            h('textarea', {
              id: 'sk-hypothesis',
              rows: 3,
              value: d.hypothesis,
              'aria-label': __alloT('stem.skatelab.hypothesis_input', 'Skate flight hang-time hypothesis'),
              placeholder: 'Write a claim you can test by changing one variable at a time…',
              onChange: function(event) { upd({ hypothesis: event.target.value }); }
            }),
            d.experiments.length === 0
              ? h('p', { className: 'sk-question' }, 'Run an experiment to add measured results here.')
              : h('div', { className: 'sk-table-wrap' },
                  h('table', { className: 'sk-table' },
                    h('caption', { style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' } }, 'Recent Skate Lab experiments'),
                    h('thead', null,
                      h('tr', null,
                        h('th', { scope: 'col' }, 'Mode'),
                        h('th', { scope: 'col' }, 'Setup'),
                        h('th', { scope: 'col' }, 'Measured'),
                        h('th', { scope: 'col' }, 'Estimate error'),
                        h('th', { scope: 'col' }, 'Outcome')
                      )
                    ),
                    h('tbody', null,
                      d.experiments.map(function(entry) {
                        return h('tr', { key: entry.id },
                          h('td', null, entry.mode === 'halfpipe' ? 'Halfpipe' : 'Gap'),
                          h('td', null, entry.setup),
                          h('td', null, rounded(entry.measured, 1) + ' ' + entry.unit),
                          h('td', null, entry.errorPct == null ? '—' : rounded(entry.errorPct, 1) + '%'),
                          h('td', { className: entry.landed ? 'sk-result-good' : 'sk-result-miss' }, entry.landed ? 'Landed' : 'Missed')
                        );
                      })
                    )
                  )
                )
          )
        ),

        h('p', { className: 'sk-footer-note' },
          'This is a simplified educational model: rigid surfaces, constant gravity, a point-mass rider, optional quadratic drag without aerodynamic lift, and landing load estimated from 0.45 m of compression. Real skating needs supervision, protective gear, and a properly maintained park.'
        )
      );
    }
  });
})();
