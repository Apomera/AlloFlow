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
  var GAP_PLATFORM_HALF_M = 2.2;
  var GAP_FALL_DEPTH_M = 0.72;
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

  function wrappedAngleError(valueDeg, targetDeg) {
    var delta = (finite(valueDeg, 0) - finite(targetDeg, 0)) % 360;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return Math.abs(delta);
  }

  function interpolateMotionState(before, after, amount) {
    amount = clamp(amount, 0, 1);
    return {
      t: lerp(before.t, after.t, amount),
      x: lerp(before.x, after.x, amount),
      y: lerp(before.y, after.y, amount),
      z: lerp(before.z, after.z, amount),
      vx: lerp(before.vx, after.vx, amount),
      vy: lerp(before.vy, after.vy, amount),
      vz: lerp(before.vz, after.vz, amount)
    };
  }

  function motionStateAtConstantAcceleration(state, ax, ay, az, deltaTime) {
    var halfTimeSquared = 0.5 * deltaTime * deltaTime;
    return {
      t: state.t + deltaTime,
      x: state.x + state.vx * deltaTime + ax * halfTimeSquared,
      y: state.y + state.vy * deltaTime + ay * halfTimeSquared,
      z: state.z + state.vz * deltaTime + az * halfTimeSquared,
      vx: state.vx + ax * deltaTime,
      vy: state.vy + ay * deltaTime,
      vz: state.vz + az * deltaTime
    };
  }

  function levelCrossingDelta(position, velocity, acceleration, level, maxDelta) {
    var c = position - level;
    var epsilon = 0.000000001;
    var candidates = [];
    if (Math.abs(acceleration) < epsilon) {
      if (Math.abs(velocity) < epsilon) return null;
      candidates.push(-c / velocity);
    } else {
      var discriminant = velocity * velocity - 2 * acceleration * c;
      if (discriminant < 0) return null;
      var root = Math.sqrt(Math.max(0, discriminant));
      candidates.push((-velocity - root) / acceleration);
      candidates.push((-velocity + root) / acceleration);
    }
    candidates = candidates.filter(function(delta) {
      return delta > epsilon && delta <= maxDelta + epsilon;
    });
    if (!candidates.length) return null;
    return Math.min.apply(Math, candidates);
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
      y: lerp(before.y, after.y, amount),
      z: lerp(before.z, after.z, amount),
      vx: lerp(before.vx, after.vx, amount),
      vy: lerp(before.vy, after.vy, amount),
      vz: lerp(before.vz, after.vz, amount),
      aerodynamicBodyWorkJ: lerp(
        finite(before.aerodynamicBodyWorkJ, 0),
        finite(after.aerodynamicBodyWorkJ, 0),
        amount
      ),
      aerodynamicDissipationJ: lerp(
        finite(before.aerodynamicDissipationJ, 0),
        finite(after.aerodynamicDissipationJ, 0),
        amount
      ),
      windWorkJ: lerp(
        finite(before.windWorkJ, 0),
        finite(after.windWorkJ, 0),
        amount
      ),
      mechanicalJ: lerp(
        finite(before.mechanicalJ, 0),
        finite(after.mechanicalJ, 0),
        amount
      )
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

  function transitionCanvasRotation(point) {
    var tangentX = finite(point && point.vx, 1);
    var tangentY = finite(point && point.vy, 0);
    return -Math.atan2(tangentY, tangentX) * 180 / Math.PI;
  }

  function smoothStep01(value) {
    var amount = clamp(finite(value, 0), 0, 1);
    return amount * amount * (3 - 2 * amount);
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
    var rampDepthM = clamp(finite(opts.rampDepthM, 2.4), 1.2, 4.5);

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
    var trickToleranceDeg = target === 0 ? 30 : Math.max(35, target * 0.08);
    var trickGoalMet = hAir >= 0.15 && rotationError <= trickToleranceDeg;
    var contactAlignmentToleranceDeg = 35;
    var contactAlignmentErrorDeg = wrappedAngleError(completed, 0);
    var contactSafe = hAir >= 0.15 &&
      contactAlignmentErrorDeg <= contactAlignmentToleranceDeg;
    var runSuccessful = trickGoalMet && contactSafe;
    var landed = contactSafe;
    var outcome = runSuccessful
      ? 'landed'
      : (contactSafe ? 'trick-missed' : 'unsafe-contact');
    var effectiveInertia = mass * vehicle.spinRadiusM * vehicle.spinRadiusM * bodyPosition.inertiaRatio;
    var angularMomentum = effectiveInertia * (airSpinRate * Math.PI / 180);
    var transition = buildHalfpipeTransition(exitSpeed, gravity, rampDepthM);
    var peakLoadPoint = transition.path[0];
    for (var loadIndex = 1; loadIndex < transition.path.length; loadIndex++) {
      if (transition.path[loadIndex].normalG > peakLoadPoint.normalG) {
        peakLoadPoint = transition.path[loadIndex];
      }
    }
    var rollTime = transition.duration;
    var bottomTime = transition.bottom.t;
    var safeReentryDuration = Math.max(0, rollTime - bottomTime);
    var reentryDuration = contactSafe ? safeReentryDuration : 0;
    var airLandingTime = rollTime + airTime;
    var takeoffRotationDeg = transitionCanvasRotation(transition.path[transition.path.length - 1]);
    var landingRotationDeg = takeoffRotationDeg + completed;
    var reentryOrientationTurns = Math.round(completed / 360);
    var reentryAlignmentDuration = contactSafe
      ? Math.min(0.22, reentryDuration * 0.35)
      : 0;
    var reentryPeakPoint = transition.bottom;
    for (var reentryLoadIndex = Math.floor(transition.path.length / 2); reentryLoadIndex < transition.path.length; reentryLoadIndex++) {
      if (transition.path[reentryLoadIndex].normalG > reentryPeakPoint.normalG) {
        reentryPeakPoint = transition.path[reentryLoadIndex];
      }
    }
    var reentryPeakTime = contactSafe
      ? airLandingTime + Math.max(0, rollTime - reentryPeakPoint.t)
      : airLandingTime;
    var motionDuration = airLandingTime + reentryDuration;
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
      bottomTime: bottomTime,
      airLandingTime: airLandingTime,
      reentryDuration: reentryDuration,
      safeReentryDuration: safeReentryDuration,
      reentryPeakTime: reentryPeakTime,
      motionDuration: motionDuration,
      transitionPath: transition.path,
      bottomSpeed: transition.bottom.speedMps,
      bottomNormalG: transition.bottom.normalG,
      peakNormalG: peakLoadPoint.normalG,
      peakLoadTime: peakLoadPoint.t,
      peakLoadX: peakLoadPoint.x,
      peakLoadY: peakLoadPoint.y,
      reentryPeakNormalG: contactSafe ? reentryPeakPoint.normalG : 0,
      reentryPeakTransitionTime: reentryPeakPoint.t,
      reentryPeakX: reentryPeakPoint.x,
      reentryPeakY: reentryPeakPoint.y,
      runMechanicalJ: runMechanicalJ,
      runEnergyJ: runEnergyJ,
      rotationTarget: target,
      spinRate: spinRate,
      airSpinRate: airSpinRate,
      takeoffRotationDeg: takeoffRotationDeg,
      landingRotationDeg: landingRotationDeg,
      reentryOrientationTurns: reentryOrientationTurns,
      reentryAlignmentDuration: reentryAlignmentDuration,
      completed: completed,
      rotation: target,
      rotationError: rotationError,
      trickToleranceDeg: trickToleranceDeg,
      trickGoalMet: trickGoalMet,
      contactAlignmentToleranceDeg: contactAlignmentToleranceDeg,
      contactAlignmentErrorDeg: contactAlignmentErrorDeg,
      contactSafe: contactSafe,
      reentryModeled: contactSafe,
      runSuccessful: runSuccessful,
      outcome: outcome,
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
    var energyInputJ = 0.5 * mass * speed * speed;
    var vx = speed * Math.cos(radians);
    var vy = speed * Math.sin(radians);
    var vz = 0;
    var x = 0;
    var y = 0;
    var z = 0;
    var time = 0;
    var step = 0;
    var dt = 1 / 180;
    var aerodynamicBodyWorkJ = 0;
    var aerodynamicDissipationJ = 0;
    var windWorkJ = 0;
    var minimumAerodynamicDissipationJ = 0;

    function attachAerodynamicEnergy(state) {
      state.aerodynamicBodyWorkJ = aerodynamicBodyWorkJ;
      state.aerodynamicDissipationJ = aerodynamicDissipationJ;
      state.windWorkJ = windWorkJ;
      state.mechanicalJ = energyInputJ + aerodynamicBodyWorkJ;
      return state;
    }

    function recordAerodynamicSegment(before, after) {
      if (!airDrag) return;
      var segmentTime = Math.max(0, after.t - before.t);
      if (segmentTime <= 0) return;
      // The existing solver holds aerodynamic acceleration constant over each
      // accepted segment. Recover that segment's drag impulse by subtracting
      // gravity from the total velocity change, then evaluate work at the
      // trapezoidal mean velocity used by the position integrator.
      var dragImpulseX = mass * (after.vx - before.vx);
      var dragImpulseY = mass * (after.vy - before.vy + gravity * segmentTime);
      var dragImpulseZ = mass * (after.vz - before.vz);
      var meanVx = 0.5 * (before.vx + after.vx);
      var meanVy = 0.5 * (before.vy + after.vy);
      var meanVz = 0.5 * (before.vz + after.vz);
      var segmentWindWorkJ = dragImpulseX * wind.xMps +
        dragImpulseZ * wind.zMps;
      var segmentDissipationJ = -(
        dragImpulseX * (meanVx - wind.xMps) +
        dragImpulseY * meanVy +
        dragImpulseZ * (meanVz - wind.zMps)
      );
      var segmentBodyWorkJ = segmentWindWorkJ - segmentDissipationJ;
      aerodynamicBodyWorkJ += segmentBodyWorkJ;
      windWorkJ += segmentWindWorkJ;
      aerodynamicDissipationJ += segmentDissipationJ;
      minimumAerodynamicDissipationJ = Math.min(
        minimumAerodynamicDissipationJ,
        segmentDissipationJ
      );
    }

    var path = [attachAerodynamicEnergy({
      t: 0,
      x: 0,
      y: 0,
      z: 0,
      vx: vx,
      vy: vy,
      vz: vz
    })];
    var peakM = 0;
    var peakTime = 0;
    var gapM = gapFt / M2FT;
    var idealVx = speed * Math.cos(radians);
    var idealVy = speed * Math.sin(radians);
    var idealAirTime = (2 * idealVy) / gravity;
    var maxSolverTimeS = Math.min(240, Math.max(12, idealAirTime * 2 + 8));
    var maxSolverSteps = Math.ceil(maxSolverTimeS / dt);
    var termination = null;
    var terminationReason = '';
    var groundPlaneCrossing = null;
    var solverLimited = false;

    while (step < maxSolverSteps) {
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

      var next = {
        t: nextTime,
        x: nextX,
        y: nextY,
        z: nextZ,
        vx: nextVx,
        vy: nextVy,
        vz: nextVz
      };
      if (![next.t, next.x, next.y, next.z, next.vx, next.vy, next.vz].every(Number.isFinite)) {
        termination = attachAerodynamicEnergy(previous);
        terminationReason = 'non-finite';
        solverLimited = true;
        break;
      }

      var stepPeakDelta = ay < 0 && previous.vy > 0 && nextVy <= 0
        ? -previous.vy / ay
        : null;
      var stepPeak = stepPeakDelta != null && stepPeakDelta <= dt
        ? motionStateAtConstantAcceleration(previous, ax, ay, az, stepPeakDelta)
        : next;
      if (stepPeak.y > peakM) {
        peakM = stepPeak.y;
        peakTime = stepPeak.t;
      }

      if ((previous.y > 0 || (previous.t === 0 && previous.vy > 0)) &&
          nextY <= 0 && nextVy < 0) {
        var deckDelta = levelCrossingDelta(previous.y, previous.vy, ay, 0, dt);
        var deckCrossing = deckDelta == null
          ? interpolateMotionState(previous, next,
            clamp(previous.y / Math.max(0.000001, previous.y - nextY), 0, 1))
          : motionStateAtConstantAcceleration(previous, ax, ay, az, deckDelta);
        deckCrossing.y = 0;
        if (!groundPlaneCrossing) groundPlaneCrossing = deckCrossing;
        if (deckCrossing.x >= gapM - 0.000001 &&
            Math.abs(deckCrossing.z) <= GAP_PLATFORM_HALF_M + 0.000001) {
          termination = deckCrossing;
          terminationReason = 'platform-top';
          recordAerodynamicSegment(previous, termination);
          attachAerodynamicEnergy(termination);
          path.push(termination);
          break;
        }
      }

      if (previous.x < gapM && nextX >= gapM && previous.y < 0) {
        var wallDelta = levelCrossingDelta(previous.x, previous.vx, ax, gapM, dt);
        var wallCrossing = wallDelta == null
          ? interpolateMotionState(previous, next,
            clamp((gapM - previous.x) / Math.max(0.000001, nextX - previous.x), 0, 1))
          : motionStateAtConstantAcceleration(previous, ax, ay, az, wallDelta);
        if (wallCrossing.y < 0 &&
            wallCrossing.y >= -GAP_FALL_DEPTH_M &&
            Math.abs(wallCrossing.z) <= GAP_PLATFORM_HALF_M + 0.000001) {
          wallCrossing.x = gapM;
          termination = wallCrossing;
          terminationReason = 'platform-face';
          recordAerodynamicSegment(previous, termination);
          attachAerodynamicEnergy(termination);
          path.push(termination);
          break;
        }
      }

      if (nextY <= -GAP_FALL_DEPTH_M && nextVy < 0) {
        var fallDelta = levelCrossingDelta(
          previous.y,
          previous.vy,
          ay,
          -GAP_FALL_DEPTH_M,
          dt
        );
        termination = fallDelta == null
          ? interpolateMotionState(previous, next,
            clamp((previous.y + GAP_FALL_DEPTH_M) /
              Math.max(0.000001, previous.y - nextY), 0, 1))
          : motionStateAtConstantAcceleration(previous, ax, ay, az, fallDelta);
        termination.y = -GAP_FALL_DEPTH_M;
        terminationReason = 'fall-boundary';
        recordAerodynamicSegment(previous, termination);
        attachAerodynamicEnergy(termination);
        path.push(termination);
        break;
      }

      recordAerodynamicSegment(previous, next);
      x = nextX;
      y = nextY;
      z = nextZ;
      vx = nextVx;
      vy = nextVy;
      vz = nextVz;
      time = nextTime;
      step += 1;
      if (step % 2 === 0) {
        path.push(attachAerodynamicEnergy({
          t: time,
          x: x,
          y: y,
          z: z,
          vx: vx,
          vy: vy,
          vz: vz
        }));
      }
    }

    if (!termination) {
      termination = attachAerodynamicEnergy({
        t: time,
        x: x,
        y: y,
        z: z,
        vx: vx,
        vy: vy,
        vz: vz
      });
      terminationReason = 'time-limit';
      solverLimited = true;
      if (path[path.length - 1].t !== termination.t) path.push(termination);
    }

    var rangePoint = groundPlaneCrossing || termination;
    var rangeResolved = !!groundPlaneCrossing;
    var airTime = termination.t;
    var rangeM = Math.max(0, rangePoint.x);
    var clearance = rangeM - gapM;
    var crossDriftM = rangePoint.z;
    var withinLane = Math.abs(crossDriftM) <= LANDING_LANE_HALF_M;
    var landedInDistance = clearance >= 0 && clearance <= LANDING_ZONE_M;
    var distanceOutcome = !rangeResolved
      ? null
      : (clearance < 0 ? 'short' : (clearance <= LANDING_ZONE_M ? 'zone' : 'overshoot'));
    var laneOutcome = !rangeResolved ? null : (withinLane ? 'inside' : 'outside');
    var hasTerrainContact = terminationReason === 'platform-top' ||
      terminationReason === 'platform-face';
    var hasLandingContact = terminationReason === 'platform-top';
    var contactSafe = hasLandingContact;
    var runSuccessful = hasLandingContact && landedInDistance && withinLane;
    var landed = contactSafe;
    var outcome = solverLimited
      ? 'solver-limit'
      : (terminationReason === 'platform-face'
        ? 'platform-face'
        : (hasLandingContact
          ? (runSuccessful ? 'landed' : (withinLane ? 'overshot' : 'off-lane'))
          : (clearance < 0 ? 'fell-short' : 'fell-off-platform')));
    var outcomeReason = solverLimited
      ? 'The numerical model reached its safety limit before resolving contact.'
      : (terminationReason === 'platform-face'
        ? 'The trajectory passed below deck height and reached the platform face.'
        : (terminationReason === 'fall-boundary'
          ? 'The trajectory missed the supporting platform and continued into the gap.'
          : (runSuccessful
            ? 'The rider contacted the platform inside the target distance and lane.'
            : (hasLandingContact
              ? (withinLane
                ? 'The rider contacted the deck beyond the marked landing zone.'
                : 'The rider contacted the deck outside the marked landing lane.')
              : 'The trajectory did not reach supported deck terrain.'))));
    var landingSpeed = Math.sqrt(
      termination.vx * termination.vx + termination.vy * termination.vy + termination.vz * termination.vz
    );
    var landingAngleDeg = Math.atan2(
      Math.abs(termination.vy),
      Math.max(0.01, Math.sqrt(termination.vx * termination.vx + termination.vz * termination.vz))
    ) * 180 / Math.PI;
    var landingCompressionM = clamp(
      finite(opts.landingCompressionM, LANDING_COMPRESSION_M),
      0.1,
      0.9
    );
    var landingVerticalSpeedMps = hasLandingContact ? Math.abs(termination.vy) : 0;
    var landingImpactG = hasLandingContact
      ? 1 + (termination.vy * termination.vy) / (2 * gravity * landingCompressionM)
      : 0;
    var landingStopTimeS = hasLandingContact && landingVerticalSpeedMps > 0.000001
      ? (2 * landingCompressionM) / landingVerticalSpeedMps
      : 0;
    // A half-sine support-force pulse preserves the stopping distance, net
    // impulse, and average load while avoiding an unrealistic flat force step.
    // Its peak is pi/2 times the average deceleration component.
    var landingPeakG = hasLandingContact
      ? 1 + (Math.PI / 2) * Math.max(0, landingImpactG - 1)
      : 0;
    var landingNetImpulseNs = mass * landingVerticalSpeedMps;
    var landingAbsorbedEnergyJ = 0.5 * mass * landingVerticalSpeedMps * landingVerticalSpeedMps;
    var landingGravityWorkJ = hasLandingContact
      ? mass * gravity * landingCompressionM
      : 0;
    // The support force removes the touchdown vertical kinetic energy while
    // gravity adds energy as the rider's COM moves through the stopping
    // distance. This is a work magnitude, not a claim that all energy becomes
    // heat; some may be stored elastically or absorbed by the rider.
    var landingSupportWorkAbsorbedJ = landingAbsorbedEnergyJ + landingGravityWorkJ;
    var landingAverageForceN = mass * gravity * landingImpactG;
    var landingPeakForceN = mass * gravity * landingPeakG;
    var landingContactImpulseNs = landingAverageForceN * landingStopTimeS;
    // Tangential braking and rolling resistance are intentionally outside this
    // model. Preserve the full deck-plane touchdown velocity only for the
    // vertical contact-pulse duration and report that displacement as contact
    // travel, not a stopping distance.
    var settleTime = hasLandingContact ? landingStopTimeS : 0;
    var postContactVelocityXMps = hasLandingContact ? termination.vx : 0;
    var postContactVelocityZMps = hasLandingContact ? termination.vz : 0;
    var postContactVelocityMps = Math.sqrt(
      postContactVelocityXMps * postContactVelocityXMps +
      postContactVelocityZMps * postContactVelocityZMps
    );
    var contactTravelXM = postContactVelocityXMps * settleTime;
    var contactTravelZM = postContactVelocityZMps * settleTime;
    var contactTravelM = Math.sqrt(
      contactTravelXM * contactTravelXM +
      contactTravelZM * contactTravelZM
    );
    var contactEndM = rangeM + contactTravelXM;
    var contactEndZ = crossDriftM + contactTravelZM;
    var landingKineticJ = 0.5 * mass * landingSpeed * landingSpeed;
    var terminationPotentialJ = mass * gravity * termination.y;
    var landingMechanicalJ = landingKineticJ + terminationPotentialJ;
    var aerodynamicNetWorkJ = windWorkJ - aerodynamicDissipationJ;
    var energyClosureResidualJ = landingMechanicalJ -
      (energyInputJ + aerodynamicNetWorkJ);
    var thermalJ = aerodynamicDissipationJ;
    var mechanicalJ = landingMechanicalJ;
    var rangeIdealM = speed * speed * Math.sin(2 * radians) / gravity;
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
    var closeness = rangeResolved ? Math.abs(clearance - LANDING_ZONE_M * 0.45) : LANDING_ZONE_M * 2;
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
      motionDuration: 0.45 + airTime + settleTime,
      approachTime: 0.45,
      settleTime: settleTime,
      flightEndTime: airTime,
      maxSolverTimeS: maxSolverTimeS,
      solverResolved: !solverLimited,
      solverLimited: solverLimited,
      rangeResolved: rangeResolved,
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
      terminalCrossDriftM: termination.z,
      withinLane: withinLane,
      landedInDistance: landedInDistance,
      distanceOutcome: distanceOutcome,
      laneOutcome: laneOutcome,
      hasTerrainContact: hasTerrainContact,
      hasLandingContact: hasLandingContact,
      contactSafe: contactSafe,
      runSuccessful: runSuccessful,
      outcome: outcome,
      outcomeReason: outcomeReason,
      terminationReason: terminationReason,
      terminationPoint: termination,
      groundPlaneCrossing: groundPlaneCrossing,
      contactPoint: hasTerrainContact ? termination : null,
      landingContactPoint: hasLandingContact ? termination : null,
      landed: landed,
      landingSpeed: landingSpeed,
      landingAngleDeg: landingAngleDeg,
      landingCompressionM: landingCompressionM,
      landingImpactG: landingImpactG,
      landingAverageG: landingImpactG,
      landingPeakG: landingPeakG,
      landingVerticalSpeedMps: landingVerticalSpeedMps,
      landingStopTimeS: landingStopTimeS,
      landingNetImpulseNs: landingNetImpulseNs,
      landingAbsorbedEnergyJ: landingAbsorbedEnergyJ,
      landingVerticalKineticRemovedJ: landingAbsorbedEnergyJ,
      landingGravityWorkJ: landingGravityWorkJ,
      landingSupportWorkAbsorbedJ: landingSupportWorkAbsorbedJ,
      landingContactImpulseNs: landingContactImpulseNs,
      landingAverageForceN: landingAverageForceN,
      landingPeakForceN: landingPeakForceN,
      postContactVelocityMps: postContactVelocityMps,
      postContactVelocityXMps: postContactVelocityXMps,
      postContactVelocityZMps: postContactVelocityZMps,
      contactTravelM: contactTravelM,
      contactTravelXM: contactTravelXM,
      contactTravelZM: contactTravelZM,
      contactEndM: contactEndM,
      contactEndZ: contactEndZ,
      rolloutVelocityMps: 0,
      rolloutDistanceM: 0,
      rolloutEndM: rangeM,
      landingVelocity: { x: termination.vx, y: termination.vy, z: termination.vz },
      flightPath: path,
      score: score,
      energyInputJ: energyInputJ,
      mechanicalJ: mechanicalJ,
      thermalJ: thermalJ,
      landingKineticJ: landingKineticJ,
      flightKineticEnergyJ: landingKineticJ,
      terminationPotentialJ: terminationPotentialJ,
      flightPotentialEnergyJ: terminationPotentialJ,
      landingMechanicalJ: landingMechanicalJ,
      flightMechanicalEnergyJ: landingMechanicalJ,
      aerodynamicBodyWorkJ: aerodynamicBodyWorkJ,
      aerodynamicNetWorkJ: aerodynamicNetWorkJ,
      aerodynamicDissipationJ: aerodynamicDissipationJ,
      minimumAerodynamicDissipationJ: minimumAerodynamicDissipationJ,
      windWorkJ: windWorkJ,
      energyBalanceInputJ: energyInputJ + Math.max(0, windWorkJ),
      energyBalanceOutputJ: landingMechanicalJ + aerodynamicDissipationJ +
        Math.max(0, -windWorkJ),
      energyClosureResidualJ: energyClosureResidualJ,
      landingZoneM: LANDING_ZONE_M,
      landingLaneHalfM: LANDING_LANE_HALF_M,
      platformHalfM: GAP_PLATFORM_HALF_M,
      fallDepthM: GAP_FALL_DEPTH_M
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
    var trickRotation = 0;
    var surfaceRotationDeg = null;
    var alignmentProgress = 0;
    var alignmentErrorDeg = 0;
    var hasSurfaceContact = false;
    var hasSupport = false;
    var phase;
    var airLandingTime = finite(sim.airLandingTime, sim.rollTime + sim.airTime);
    var bottomTime = finite(sim.bottomTime,
      sim.transitionPath[Math.floor(sim.transitionPath.length / 2)].t);
    var reentryDuration = Math.max(0, finite(sim.reentryDuration, sim.motionDuration - airLandingTime));

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
      surfaceRotationDeg = transitionCanvasRotation(point);
      rotation = surfaceRotationDeg;
      alignmentProgress = 1;
      hasSurfaceContact = true;
      hasSupport = true;
      phase = point.theta < -0.32
        ? 'dropping in'
        : (point.theta <= 0.32 ? 'compressing at the bottom' : 'driving up the wall');
    } else if (elapsed < airLandingTime) {
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
      trickRotation = sim.airSpinRate * flightTime;
      rotation = finite(sim.takeoffRotationDeg, -90) + trickRotation;
      phase = q < 0.46 ? 'rising' : (q < 0.54 ? 'at the apex' : (q < 0.96 ? 'falling' : 'approaching contact'));
    } else if (sim.reentryModeled === false) {
      x = 4;
      y = sim.rampDepthM;
      vx = 0;
      vy = -sim.exitSpeed;
      speedMps = sim.exitSpeed;
      normalG = 0;
      nx = 0;
      ny = 0;
      trickRotation = sim.completed;
      rotation = finite(sim.landingRotationDeg,
        finite(sim.takeoffRotationDeg, -90) + sim.completed);
      surfaceRotationDeg = finite(sim.takeoffRotationDeg, -90) +
        360 * finite(sim.reentryOrientationTurns, Math.round(sim.completed / 360));
      alignmentErrorDeg = finite(sim.contactAlignmentErrorDeg,
        wrappedAngleError(sim.completed, 0));
      hasSurfaceContact = true;
      hasSupport = false;
      phase = 'unsafe contact — simulation stopped';
    } else {
      var reentryTime = clamp(elapsed - airLandingTime, 0, reentryDuration);
      var reverseTransitionTime = clamp(sim.rollTime - reentryTime, bottomTime, sim.rollTime);
      var returnPoint = transitionPointAt(sim.transitionPath, reverseTransitionTime);
      x = returnPoint.x;
      y = returnPoint.y;
      vx = -returnPoint.vx;
      vy = -returnPoint.vy;
      speedMps = returnPoint.speedMps;
      normalG = returnPoint.normalG;
      nx = returnPoint.nx;
      ny = returnPoint.ny;
      trickRotation = sim.completed;
      surfaceRotationDeg = transitionCanvasRotation(returnPoint) +
        360 * finite(sim.reentryOrientationTurns, Math.round(sim.completed / 360));
      var landingRotationDeg = finite(sim.landingRotationDeg,
        finite(sim.takeoffRotationDeg, -90) + sim.completed);
      var alignmentDuration = Math.max(0.000001, finite(sim.reentryAlignmentDuration,
        Math.min(0.22, reentryDuration * 0.35)));
      alignmentProgress = smoothStep01(reentryTime / alignmentDuration);
      rotation = lerp(landingRotationDeg, surfaceRotationDeg, alignmentProgress);
      alignmentErrorDeg = Math.abs(surfaceRotationDeg - rotation);
      hasSurfaceContact = true;
      hasSupport = true;
      phase = reentryTime < Math.min(0.18, reentryDuration * 0.25)
        ? 're-entering the wall'
        : (reverseTransitionTime > bottomTime + reentryDuration * 0.36
          ? 'driving down the return wall'
          : 'compressing on the return');
    }

    var peJ = Math.max(0, sim.massKg * sim.gravity * y);
    var keJ = 0.5 * sim.massKg * speedMps * speedMps;
    var loadSquat = normalG > 0
      ? clamp((normalG - 1) / Math.max(0.1, sim.peakNormalG - 1), 0, 1)
      : 0;
    return {
      x: x,
      y: y,
      z: 0,
      vx: vx,
      vy: vy,
      vz: 0,
      speedMps: speedMps,
      rotation: rotation,
      trickRotation: trickRotation,
      surfaceRotationDeg: surfaceRotationDeg,
      alignmentProgress: alignmentProgress,
      alignmentErrorDeg: alignmentErrorDeg,
      hasSurfaceContact: hasSurfaceContact,
      hasSupport: hasSupport,
      outcome: sim.outcome,
      phase: phase,
      time: elapsed,
      peJ: peJ,
      keJ: keJ,
      thermalJ: sim.thermalJ,
      normalG: normalG,
      loadSquat: loadSquat,
      nx: nx,
      ny: ny
    };
  }

  function getLandingPeakG(sim) {
    if (sim && sim.hasLandingContact === false) return 0;
    var averageG = Math.max(1, finite(sim && sim.landingImpactG, 1));
    return Math.max(1, finite(sim && sim.landingPeakG,
      1 + (Math.PI / 2) * Math.max(0, averageG - 1)));
  }

  function sampleGapJump(sim, progress) {
    progress = clamp(progress, 0, 1);
    var elapsed = progress * sim.motionDuration;
    var flightTime = elapsed - sim.approachTime;
    var point;
    var phase;
    var afterLandingTime = 0;
    var landingProgress = 0;
    var landingPulse = 0;
    var landingCompressionUsedM = 0;
    var hasSurfaceContact = false;
    var hasSupport = false;

    if (flightTime < 0) {
      var approachQ = clamp(elapsed / sim.approachTime, 0, 1);
      point = {
        t: 0,
        x: -sim.speedMps * sim.approachTime * (1 - approachQ),
        y: 0,
        z: 0,
        vx: sim.speedMps,
        vy: 0,
        vz: 0,
        aerodynamicBodyWorkJ: 0,
        aerodynamicDissipationJ: 0,
        windWorkJ: 0,
        mechanicalJ: sim.energyInputJ
      };
      hasSurfaceContact = true;
      hasSupport = true;
      phase = 'approaching the ramp';
    } else if (flightTime <= sim.airTime || !sim.hasLandingContact) {
      point = trajectoryPointAt(sim.flightPath, flightTime);
      if (flightTime >= sim.airTime - 0.000001) {
        if (sim.hasLandingContact) {
          hasSurfaceContact = true;
          hasSupport = true;
          phase = 'platform contact';
        } else {
          hasSurfaceContact = !!sim.hasTerrainContact;
          phase = sim.solverLimited
            ? 'model limit reached'
            : (sim.outcome === 'platform-face'
              ? 'hit the platform face'
              : (sim.outcome === 'fell-short' ? 'fell short of the platform' : 'fell outside the platform'));
        }
      } else {
        phase = Math.abs(point.vy) < 0.28 ? 'at the apex' : (point.vy > 0 ? 'rising' : 'falling');
      }
    } else {
      var touchdown = trajectoryPointAt(sim.flightPath, sim.airTime);
      afterLandingTime = Math.max(0, flightTime - sim.airTime);
      landingProgress = sim.landingStopTimeS > 0
        ? clamp(afterLandingTime / sim.landingStopTimeS, 0, 1)
        : 1;
      landingPulse = Math.sin(Math.PI * landingProgress);
      landingCompressionUsedM = sim.landingCompressionM *
        (landingProgress + Math.sin(Math.PI * landingProgress) / Math.PI);
      var verticalVelocityScale = 0.5 * (1 + Math.cos(Math.PI * landingProgress));
      var postContactVelocityXMps = finite(sim.postContactVelocityXMps, touchdown.vx);
      var postContactVelocityZMps = finite(sim.postContactVelocityZMps, touchdown.vz);
      point = {
        t: touchdown.t + afterLandingTime,
        x: touchdown.x + postContactVelocityXMps * afterLandingTime,
        y: 0,
        z: touchdown.z + postContactVelocityZMps * afterLandingTime,
        vx: postContactVelocityXMps,
        vy: touchdown.vy * verticalVelocityScale,
        vz: postContactVelocityZMps,
        aerodynamicBodyWorkJ: finite(touchdown.aerodynamicBodyWorkJ, sim.aerodynamicBodyWorkJ),
        aerodynamicDissipationJ: finite(touchdown.aerodynamicDissipationJ, sim.aerodynamicDissipationJ),
        windWorkJ: finite(touchdown.windWorkJ, sim.windWorkJ),
        mechanicalJ: finite(touchdown.mechanicalJ, sim.flightMechanicalEnergyJ)
      };
      hasSurfaceContact = true;
      hasSupport = true;
      phase = afterLandingTime < sim.landingStopTimeS - 0.000001
        ? 'absorbing the landing'
        : 'contact pulse complete';
    }

    var speedMps = Math.sqrt(point.vx * point.vx + point.vy * point.vy + point.vz * point.vz);
    var keJ = 0.5 * sim.massKg * speedMps * speedMps;
    var landingContactActive = !!sim.hasLandingContact && isLandingContactPhase(phase);
    var normalG = phase === 'absorbing the landing'
      ? 1 + (getLandingPeakG(sim) - 1) * landingPulse
      : ((phase === 'approaching the ramp' ||
          phase === 'platform contact' ||
          phase === 'contact pulse complete') ? 1 : 0);
    var comCompressionRatio = sim.landingCompressionM > 0
      ? clamp(landingCompressionUsedM / sim.landingCompressionM, 0, 1)
      : 0;
    var comVerticalVelocityMps = point.vy;
    var landingVerticalKineticRemainingJ = landingContactActive
      ? 0.5 * sim.massKg * comVerticalVelocityMps * comVerticalVelocityMps
      : 0;
    var landingVerticalKineticRemovedJ = landingContactActive
      ? clamp(
        sim.landingAbsorbedEnergyJ - landingVerticalKineticRemainingJ,
        0,
        sim.landingAbsorbedEnergyJ
      )
      : 0;
    var landingGravityWorkSoFarJ = landingContactActive
      ? sim.massKg * sim.gravity * landingCompressionUsedM
      : 0;
    var landingSupportWorkAbsorbedSoFarJ = landingVerticalKineticRemovedJ +
      landingGravityWorkSoFarJ;
    var peJ = sim.massKg * sim.gravity *
      (point.y - (landingContactActive ? landingCompressionUsedM : 0));
    var aerodynamicDissipationSoFarJ = flightTime < 0
      ? 0
      : finite(point.aerodynamicDissipationJ, sim.aerodynamicDissipationJ);
    var windWorkSoFarJ = flightTime < 0
      ? 0
      : finite(point.windWorkJ, sim.windWorkJ);
    var aerodynamicNetWorkSoFarJ = windWorkSoFarJ -
      aerodynamicDissipationSoFarJ;
    var currentMechanicalEnergyJ = sim.energyInputJ +
      aerodynamicNetWorkSoFarJ - landingSupportWorkAbsorbedSoFarJ;
    var thermalJ = aerodynamicDissipationSoFarJ +
      landingSupportWorkAbsorbedSoFarJ;
    var landingNetImpulseDeliveredNs = landingContactActive
      ? clamp(
        sim.massKg * (sim.landingVerticalSpeedMps - Math.abs(comVerticalVelocityMps)),
        0,
        sim.landingNetImpulseNs
      )
      : 0;
    var landingSupportImpulseDeliveredNs = landingContactActive
      ? clamp(
        sim.massKg * sim.gravity * afterLandingTime + landingNetImpulseDeliveredNs,
        0,
        sim.landingContactImpulseNs
      )
      : 0;
    var comVelocityAngleDeg = -Math.atan2(
      comVerticalVelocityMps,
      Math.max(0.1, point.vx)
    ) * 180 / Math.PI;
    // Once supported platform contact begins, the board follows the flat deck.
    // COM velocity remains separate so the rider can continue compressing.
    var boardRotationDeg = landingContactActive ? 0 : comVelocityAngleDeg;
    var aerodynamicForceActive = !!sim.airDrag &&
      (phase === 'rising' || phase === 'at the apex' || phase === 'falling');
    var relativeAirX = aerodynamicForceActive ? point.vx - sim.wind.xMps : 0;
    var relativeAirY = aerodynamicForceActive ? point.vy : 0;
    var relativeAirZ = aerodynamicForceActive ? point.vz - sim.wind.zMps : 0;
    var relativeAirSpeedMps = Math.sqrt(
      relativeAirX * relativeAirX +
      relativeAirY * relativeAirY +
      relativeAirZ * relativeAirZ
    );
    var airForceFactor = aerodynamicForceActive
      ? 0.5 * AIR_DENSITY * sim.vehicle.dragArea * relativeAirSpeedMps
      : 0;
    var airForceX = -airForceFactor * relativeAirX;
    var airForceY = -airForceFactor * relativeAirY;
    var airForceZ = -airForceFactor * relativeAirZ;
    var airForceMagnitudeN = Math.sqrt(
      airForceX * airForceX +
      airForceY * airForceY +
      airForceZ * airForceZ
    );
    return {
      x: point.x,
      y: point.y,
      z: point.z,
      boardX: point.x,
      boardY: point.y,
      boardZ: point.z,
      vx: point.vx,
      vy: point.vy,
      vz: point.vz,
      comVerticalVelocityMps: comVerticalVelocityMps,
      speedMps: speedMps,
      rotation: boardRotationDeg,
      boardRotationDeg: boardRotationDeg,
      comVelocityAngleDeg: comVelocityAngleDeg,
      phase: phase,
      time: elapsed,
      flightTime: clamp(flightTime, 0, sim.airTime),
      landingProgress: landingProgress,
      landingPulse: landingPulse,
      landingSquat: comCompressionRatio,
      landingCompressionUsedM: landingCompressionUsedM,
      comCompressionM: landingCompressionUsedM,
      comCompressionRatio: comCompressionRatio,
      hasSurfaceContact: hasSurfaceContact,
      hasSupport: hasSupport,
      hasBoardSupport: hasSupport,
      outcome: sim.outcome,
      peJ: peJ,
      keJ: keJ,
      thermalJ: thermalJ,
      currentMechanicalEnergyJ: currentMechanicalEnergyJ,
      aerodynamicBodyWorkJ: aerodynamicNetWorkSoFarJ,
      aerodynamicNetWorkJ: aerodynamicNetWorkSoFarJ,
      aerodynamicDissipationJ: aerodynamicDissipationSoFarJ,
      windWorkJ: windWorkSoFarJ,
      energyClosureResidualJ: currentMechanicalEnergyJ -
        (keJ + peJ),
      relativeAirSpeedMps: relativeAirSpeedMps,
      airForceX: airForceX,
      airForceY: airForceY,
      airForceZ: airForceZ,
      airForceMagnitudeN: airForceMagnitudeN,
      normalG: normalG,
      supportForceN: hasSupport ? sim.massKg * sim.gravity * normalG : 0,
      landingNetImpulseDeliveredNs: landingNetImpulseDeliveredNs,
      landingSupportImpulseDeliveredNs: landingSupportImpulseDeliveredNs,
      landingVerticalKineticRemainingJ: landingVerticalKineticRemainingJ,
      landingVerticalKineticRemovedJ: landingVerticalKineticRemovedJ,
      landingGravityWorkSoFarJ: landingGravityWorkSoFarJ,
      landingSupportWorkAbsorbedSoFarJ: landingSupportWorkAbsorbedSoFarJ
    };
  }

  function isLandingContactPhase(phase) {
    return phase === 'platform contact' ||
      phase === 'absorbing the landing' ||
      phase === 'contact pulse complete';
  }

  window.__alloSkatePhysicsPure = {
    simHalfpipe: simHalfpipe,
    simGapJump: simGapJump,
    sampleHalfpipe: sampleHalfpipe,
    sampleGapJump: sampleGapJump,
    trajectoryPointAt: trajectoryPointAt,
    transitionPointAt: transitionPointAt,
    transitionCanvasRotation: transitionCanvasRotation,
    wrappedAngleError: wrappedAngleError,
    buildHalfpipeTransition: buildHalfpipeTransition,
    halfpipeY: halfpipeY,
    getSurface: getSurface,
    getWind: getWind,
    getBodyPosition: getBodyPosition,
    describeSimulationChange: describeSimulationChange,
    phaseLearningText: phaseLearningText,
    constants: {
      gravity: G,
      metersToFeet: M2FT,
      mpsToMph: MPS2MPH,
      riderKg: RIDER_KG,
      landingZoneM: LANDING_ZONE_M,
      landingLaneHalfM: LANDING_LANE_HALF_M,
      gapPlatformHalfM: GAP_PLATFORM_HALF_M,
      gapFallDepthM: GAP_FALL_DEPTH_M,
      landingCompressionM: LANDING_COMPRESSION_M,
      airDensity: AIR_DENSITY
    }
  };

  function installStyles() {
    if (typeof document === 'undefined' || document.getElementById('skatelab-physics-v2-css')) return;
    var style = document.createElement('style');
    style.id = 'skatelab-physics-v2-css';
    style.textContent = [
      '.skatelab-shell .sk-stage-actions{display:flex;align-items:center;justify-content:flex-end;gap:7px;flex-wrap:wrap}.skatelab-shell .sk-phase-insight{margin:4px 2px 8px;color:var(--sk-text);font-size:.8rem;line-height:1.45}.skatelab-shell .sk-phase-insight strong{color:var(--sk-cyan)}.skatelab-shell .sk-phase-jumps{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}.skatelab-shell .sk-phase-jump{min-block-size:36px;border:1px solid var(--sk-border);border-radius:8px;background:transparent;color:var(--sk-muted);padding:5px 8px;font-size:.72rem;font-weight:750;cursor:pointer}.skatelab-shell .sk-phase-jump[aria-current=true]{border-color:var(--sk-cyan);color:var(--sk-text);background:color-mix(in srgb,var(--sk-cyan) 10%,transparent)}.skatelab-shell .sk-phase-jump:disabled{opacity:.5;cursor:not-allowed}.skatelab-shell .sk-comparison-insight{display:block;margin-bottom:5px;color:var(--sk-text)}.skatelab-shell .sk-comparison-insight strong{color:var(--sk-compare)}',
      '@container(max-width:520px){.skatelab-shell .sk-stage-actions{width:100%;justify-content:flex-start}.skatelab-shell .sk-stage-actions .sk-secondary{width:auto}.skatelab-shell .sk-telemetry-detail{display:none}.skatelab-shell .sk-timeline-control{padding-bottom:12px}.skatelab-shell .sk-phase-marker small{display:none}.skatelab-shell .sk-phase-marker{bottom:5px}.skatelab-shell .sk-phase-jumps{gap:5px}.skatelab-shell .sk-phase-jump{flex:1 1 auto;padding-inline:7px}}',
      '@container(max-width:380px){.skatelab-shell .sk-canvas{aspect-ratio:1/1}.skatelab-shell .sk-metrics{grid-template-columns:1fr}.skatelab-shell .sk-live-telemetry span{padding-inline:5px}}',
      '@media(any-pointer:coarse){.skatelab-shell button,.skatelab-shell summary,.skatelab-shell select,.skatelab-shell input[type=range],.skatelab-shell .sk-radio-grid span{min-block-size:44px!important;touch-action:manipulation}.skatelab-shell input[type=range]{block-size:44px}}',
      '.skatelab-shell{--sk-bg:var(--allo-stem-canvas,#0b1220);--sk-panel:var(--allo-stem-panel,#172033);--sk-text:var(--allo-stem-text,#edf5ff);--sk-muted:var(--allo-stem-text-soft,#a8b5c7);--sk-border:var(--allo-stem-border,#34425a);--sk-accent:#f6b83f;--sk-cyan:#4ed7e8;--sk-green:#5ee092;--sk-red:#fb7185;--sk-compare:#a78bfa;color:var(--sk-text);max-width:1240px;margin:0 auto;padding:18px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;container-type:inline-size}.theme-default .skatelab-shell{--sk-cyan:#0e7490;--sk-green:#15803d;--sk-red:#be123c;--sk-compare:#6d28d9}',
      // ★ Was `html:not(.theme-contrast)`, a guard that never fired — the theme
      // class lives on <main>, never on <html>, so contrast got this dark card
      // instead of its own black-and-yellow. The .theme-contrast rule below is
      // the real exclusion and wins on specificity.
      '.skatelab-shell{--sk-bg:#0f172a;--sk-panel:#1e293b;--sk-text:#e2e8f0;--sk-muted:#b6c3d5;--sk-border:#475569;--sk-cyan:#67e8f9;--sk-green:#86efac;--sk-red:#fda4af;--sk-compare:#c4b5fd;background:#0f172a}',
      '.theme-contrast .skatelab-shell{--sk-bg:#000000;--sk-panel:#000000;--sk-text:#ffff00;--sk-muted:#ffff00;--sk-border:#ffff00;--sk-cyan:#00ffff;--sk-green:#00ff00;--sk-red:#ff6b6b;--sk-compare:#ffffff;background:#000000}',
      '.skatelab-shell *{box-sizing:border-box}.skatelab-shell button,.skatelab-shell input,.skatelab-shell select,.skatelab-shell textarea,.skatelab-shell summary{font:inherit}.skatelab-shell button,.skatelab-shell summary,.skatelab-shell input,.skatelab-shell select{min-block-size:40px}.skatelab-shell button:focus-visible,.skatelab-shell input:focus-visible,.skatelab-shell select:focus-visible,.skatelab-shell textarea:focus-visible,.skatelab-shell summary:focus-visible{outline:3px solid var(--sk-cyan);outline-offset:3px}',
      '.sk-header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:15px}.sk-heading{display:flex;gap:12px;align-items:flex-start}.sk-back{border:1px solid var(--sk-border);background:transparent;color:var(--sk-text);border-radius:11px;padding:8px 11px;cursor:pointer}.sk-title{margin:0;font-size:clamp(1.45rem,3vw,2.15rem);line-height:1.02;letter-spacing:-.03em}.sk-kicker{margin:6px 0 0;color:var(--sk-muted);font-size:.9rem}.sk-view-switch{display:flex;gap:5px;padding:4px;border:1px solid var(--sk-border);background:color-mix(in srgb,var(--sk-panel) 84%,transparent);border-radius:13px}.sk-view-switch button{border:0;background:transparent;color:var(--sk-muted);border-radius:9px;padding:7px 12px;font-weight:750;cursor:pointer}.sk-view-switch button[aria-pressed=true]{background:var(--sk-accent);color:#251600;box-shadow:0 3px 12px rgba(246,184,63,.24)}',
      '.sk-workbench{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(300px,350px);gap:15px;align-items:start}.sk-stage,.sk-controls,.sk-panel,.sk-metric{border:1px solid var(--sk-border);background:color-mix(in srgb,var(--sk-panel) 91%,transparent);border-radius:17px}.sk-stage{padding:11px;min-width:0;background:linear-gradient(160deg,color-mix(in srgb,var(--sk-panel) 96%,transparent),color-mix(in srgb,var(--sk-bg) 90%,transparent))}.sk-canvas-frame{position:relative;overflow:hidden;border-radius:14px;background:#06101e;box-shadow:inset 0 0 0 1px rgba(148,163,184,.26),0 12px 34px rgba(2,8,20,.20)}.sk-canvas{display:block;width:100%;height:auto;aspect-ratio:16/9}.sk-stage-toolbar{display:flex;align-items:center;justify-content:space-between;gap:9px;flex-wrap:wrap;padding:10px 2px 4px}.sk-live-telemetry{display:flex;align-items:center;gap:0;flex-wrap:wrap;color:var(--sk-muted);font-size:.74rem;font-variant-numeric:tabular-nums}.sk-live-telemetry span{padding:3px 8px;border-right:1px solid var(--sk-border)}.sk-live-telemetry span:first-child{padding-left:0}.sk-live-telemetry span:last-child{border-right:0}.sk-live-telemetry .sk-phase{color:var(--sk-cyan);font-weight:850;text-transform:uppercase;letter-spacing:.045em}.sk-stage-legend{display:block;padding:6px 2px 2px;font-size:.72rem;color:var(--sk-muted);line-height:1.4}.sk-stage-legend b{color:var(--sk-text)}.sk-timeline{display:grid;grid-template-columns:minmax(120px,190px) minmax(0,1fr);align-items:center;gap:11px;padding:9px 10px;margin:3px 0;border-radius:11px;background:color-mix(in srgb,var(--sk-bg) 75%,transparent)}.sk-timeline label{display:flex;justify-content:space-between;gap:8px;color:var(--sk-muted);font-size:.76rem;font-weight:750}.sk-timeline output{color:var(--sk-cyan);font-variant-numeric:tabular-nums}.sk-timeline-control{position:relative;min-width:0;padding-bottom:24px}.sk-timeline input{display:block;width:100%;accent-color:var(--sk-cyan)}.sk-phase-markers{position:absolute;left:7px;right:7px;bottom:0;height:20px;pointer-events:none}.sk-phase-marker{position:absolute;bottom:0;display:grid;justify-items:center;gap:1px;transform:translateX(-50%);color:var(--sk-muted);white-space:nowrap}.sk-phase-marker:first-child{transform:none}.sk-phase-marker:last-child{transform:translateX(-100%)}.sk-phase-marker i{display:block;width:2px;height:6px;background:var(--sk-cyan);opacity:.8}.sk-phase-marker small{font-size:.7rem;line-height:1.1;text-transform:uppercase;letter-spacing:.035em}.sk-sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}.sk-canvas-summary{margin:8px 0 0;padding:8px 10px;border-left:3px solid var(--sk-cyan);background:color-mix(in srgb,var(--sk-cyan) 7%,transparent);font-size:.8rem;line-height:1.45;color:var(--sk-muted)}',
      '.sk-timeline{align-items:start}.sk-trace-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap;min-height:18px;margin-bottom:2px;color:var(--sk-muted);font-size:.7rem;font-weight:750}.sk-trace-head span:last-child{color:var(--sk-text);font-variant-numeric:tabular-nums;text-align:right}.sk-timeline-trace{display:block;width:100%;height:48px;margin:0 0 2px;overflow:visible}.sk-trace-axis,.sk-trace-reference,.sk-trace-peak,.sk-trace-previous,.sk-trace-modeled,.sk-trace-cursor,.sk-trace-current{vector-effect:non-scaling-stroke}.sk-trace-axis{stroke:var(--sk-border);stroke-width:1}.sk-trace-reference{stroke:color-mix(in srgb,var(--sk-muted) 44%,transparent);stroke-width:1}.sk-trace-peak{stroke:var(--sk-muted);stroke-width:1;stroke-dasharray:3 3}.sk-trace-previous{fill:none;stroke:var(--sk-compare);stroke-width:1.5;stroke-dasharray:3 4;stroke-linecap:round;stroke-linejoin:round}.sk-trace-modeled{fill:none;stroke:var(--sk-red);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.sk-trace-cursor{stroke:var(--sk-text);stroke-width:1;opacity:.46}.sk-trace-current{stroke:var(--sk-text);stroke-width:3;stroke-linecap:round}',
      '.sk-controls{padding:14px;display:grid;gap:13px;background:linear-gradient(180deg,color-mix(in srgb,var(--sk-panel) 96%,transparent),color-mix(in srgb,var(--sk-panel) 87%,transparent))}.sk-mode-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px}.sk-mode-tabs button{border:1px solid var(--sk-border);background:transparent;color:var(--sk-muted);border-radius:10px;padding:8px;font-weight:800;cursor:pointer}.sk-mode-tabs button[aria-selected=true]{border-color:var(--sk-accent);background:color-mix(in srgb,var(--sk-accent) 16%,transparent);color:var(--sk-text)}.sk-control-group{display:grid;gap:11px}.sk-control{display:grid;gap:5px}.sk-control-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;font-size:.82rem;font-weight:750}.sk-control-head output{max-width:58%;color:var(--sk-cyan);font-variant-numeric:tabular-nums;text-align:right;font-size:.75rem}.sk-help{font-size:.72rem;line-height:1.4;color:var(--sk-muted);margin:0}.skatelab-shell input[type=range]{width:100%;accent-color:var(--sk-accent)}.skatelab-shell select,.skatelab-shell input[type=number],.skatelab-shell textarea{width:100%;border:1px solid var(--sk-border);background:var(--sk-bg);color:var(--sk-text);border-radius:9px;padding:8px 10px}',
      '.sk-radio-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(78px,1fr));gap:6px}.sk-radio-grid label{position:relative}.sk-radio-grid input{position:absolute;opacity:0;pointer-events:none}.sk-radio-grid span{display:flex;min-height:40px;align-items:center;justify-content:center;text-align:center;border:1px solid var(--sk-border);border-radius:9px;padding:6px;color:var(--sk-muted);font-size:.74rem;font-weight:750;cursor:pointer}.sk-radio-grid input:checked+span{border-color:var(--sk-cyan);background:color-mix(in srgb,var(--sk-cyan) 13%,transparent);color:var(--sk-text);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--sk-cyan) 42%,transparent)}.sk-radio-grid input:focus-visible+span{outline:3px solid var(--sk-cyan);outline-offset:3px}.sk-checks{display:grid;grid-template-columns:1fr 1fr;gap:8px}.sk-check{display:flex;align-items:center;gap:7px;color:var(--sk-muted);font-size:.78rem}.sk-check input,.sk-switch input{accent-color:var(--sk-accent);inline-size:18px;block-size:18px}.sk-switch{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;padding:9px 10px;border-radius:10px;background:color-mix(in srgb,var(--sk-bg) 60%,transparent);color:var(--sk-muted);font-size:.78rem;font-weight:750}.sk-switch output{color:var(--sk-cyan);font-size:.72rem;text-transform:uppercase;letter-spacing:.04em}',
      '.sk-advanced{border-top:1px solid var(--sk-border);padding-top:7px}.sk-advanced summary{cursor:pointer;color:var(--sk-text);font-size:.8rem;font-weight:800}.sk-advanced-body{display:grid;gap:10px;padding-top:10px}.sk-model-note{margin:0;padding:9px 10px;border-left:3px solid var(--sk-accent);background:color-mix(in srgb,var(--sk-accent) 7%,transparent);color:var(--sk-muted);font-size:.73rem;line-height:1.45}.sk-actions{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end}.sk-run{border:0;border-radius:11px;background:linear-gradient(135deg,#ffc857,#e79024);color:#281600;font-weight:900;padding:10px 16px;cursor:pointer;box-shadow:0 8px 22px rgba(231,144,36,.24)}.sk-run:disabled{opacity:.55;cursor:not-allowed;box-shadow:none}.sk-secondary{border:1px solid var(--sk-border);border-radius:10px;background:transparent;color:var(--sk-text);padding:8px 11px;font-weight:750;cursor:pointer}.sk-status{min-height:1.4em;padding:8px 9px;border-radius:9px;background:color-mix(in srgb,var(--sk-bg) 55%,transparent);font-size:.78rem;color:var(--sk-muted);line-height:1.4}.sk-status[data-result=success]{color:var(--sk-green)}.sk-status[data-result=miss]{color:var(--sk-red)}',
      '.sk-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:9px;margin-top:12px}.sk-metric{position:relative;overflow:hidden;padding:11px 12px;min-width:0}.sk-metric:before{content:"";position:absolute;inset:0 auto 0 0;width:3px;background:var(--sk-cyan);opacity:.72}.sk-metric-value{display:block;font-size:clamp(1rem,2vw,1.25rem);font-weight:850;color:var(--sk-text);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sk-metric-label{display:block;margin-top:3px;color:var(--sk-muted);font-size:.7rem;text-transform:uppercase;letter-spacing:.055em}.sk-below{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr);gap:12px;margin-top:12px}.sk-panel{padding:14px;min-width:0}.sk-panel h3{margin:0 0 9px;font-size:.92rem}.sk-ledger-row{display:flex;height:12px;border-radius:999px;overflow:hidden;background:color-mix(in srgb,var(--sk-border) 55%,transparent);margin:8px 0}.sk-ledger-mechanical{background:var(--sk-cyan)}.sk-ledger-thermal{background:var(--sk-accent)}.sk-ledger-wind{background:var(--sk-compare)}.sk-ledger-labels{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:.75rem;color:var(--sk-muted)}.sk-equation{display:block;margin-top:10px;padding:10px;border-radius:9px;background:var(--sk-bg);color:var(--sk-text);font-size:.76rem;line-height:1.58;white-space:normal}',
      '.sk-question{margin:0 0 10px;color:var(--sk-muted);font-size:.82rem;line-height:1.45}.sk-estimate{display:grid;grid-template-columns:auto minmax(90px,140px);align-items:center;gap:8px;margin-bottom:9px}.sk-estimate label{font-size:.78rem;font-weight:750}.sk-error{color:var(--sk-red);font-size:.75rem;margin:0}.sk-details{margin-top:12px;border-top:1px solid var(--sk-border);padding-top:10px}.sk-details summary{cursor:pointer;font-weight:800;color:var(--sk-text);padding:2px 0}.sk-notes{display:grid;gap:8px;margin-top:10px}.sk-table-wrap{overflow-x:auto}.sk-table{width:100%;border-collapse:collapse;font-size:.74rem}.sk-table th,.sk-table td{text-align:left;padding:7px 6px;border-bottom:1px solid var(--sk-border);white-space:nowrap}.sk-table th{color:var(--sk-muted);font-weight:750}.sk-result-good{color:var(--sk-green);font-weight:800}.sk-result-miss{color:var(--sk-red);font-weight:800}.sk-footer-note{margin:12px 2px 0;color:var(--sk-muted);font-size:.72rem;line-height:1.4}',
      '@container(max-width:900px){.sk-workbench{grid-template-columns:1fr}.sk-below{grid-template-columns:1fr}.sk-controls{order:2}.sk-stage{order:1}}@container(max-width:820px){.sk-workbench{grid-template-columns:1fr}.sk-below{grid-template-columns:1fr}.sk-metrics{grid-template-columns:repeat(auto-fit,minmax(135px,1fr))}}@container(max-width:520px){.skatelab-shell{padding:9px}.sk-header{display:grid}.sk-view-switch{width:100%}.sk-view-switch button{flex:1}.sk-canvas{aspect-ratio:4/3}.sk-stage-toolbar{align-items:flex-start}.sk-live-telemetry{width:100%}.sk-timeline{grid-template-columns:1fr;gap:5px}.sk-checks{grid-template-columns:1fr}.sk-radio-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sk-actions{grid-template-columns:1fr}.sk-secondary{width:100%}.sk-estimate{grid-template-columns:1fr}.sk-title{font-size:1.45rem}.sk-metrics{grid-template-columns:1fr 1fr}.sk-control-head{align-items:flex-start}.sk-control-head output{max-width:55%}}',
      '@media(forced-colors:active){.sk-trace-axis,.sk-trace-reference,.sk-trace-peak{stroke:CanvasText!important}.sk-trace-previous{stroke:LinkText!important}.sk-trace-modeled,.sk-trace-cursor,.sk-trace-current{stroke:Highlight!important}}',
      '@media(prefers-reduced-motion:reduce){.skatelab-shell *{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important;animation-iteration-count:1!important}}@media(forced-colors:active){.skatelab-shell button,.skatelab-shell input,.skatelab-shell select,.skatelab-shell textarea,.sk-stage,.sk-controls,.sk-panel,.sk-metric,.sk-switch,.sk-timeline{forced-color-adjust:auto;border-color:CanvasText!important}.skatelab-shell button:focus-visible,.skatelab-shell input:focus-visible,.skatelab-shell select:focus-visible,.skatelab-shell textarea:focus-visible,.skatelab-shell summary:focus-visible{outline:3px solid Highlight!important}.sk-canvas-frame{border:2px solid CanvasText}.sk-canvas-summary,.sk-model-note{border-color:CanvasText!important}}'
    ].join('');
    document.head.appendChild(style);
  }

  installStyles();

  function canvasFrame(canvas) {
    if (!canvas || typeof canvas.getContext !== 'function') return null;
    var rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
    var measuredWidth = Math.round((rect && rect.width) || 0);
    var measuredHeight = Math.round((rect && rect.height) || 0);
    var width = measuredWidth > 0 ? measuredWidth : 960;
    var height = measuredHeight > 0 ? measuredHeight : Math.round(width * 0.5625);
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
    var compact = width < 520;
    var sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#061327');
    sky.addColorStop(0.48, '#183151');
    sky.addColorStop(0.76, '#152238');
    sky.addColorStop(1, '#08111f');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    var horizon = Math.round(height * 0.56);
    ctx.save();
    ctx.globalAlpha = compact ? 0.44 : 0.72;
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
    var spacing = compact ? Math.max(64, Math.round(width / 6)) : Math.max(42, Math.round(width / 15));
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
    if (!compact) {
      ctx.fillStyle = '#a9bad0';
      ctx.font = '500 11px ui-sans-serif, system-ui';
      ctx.fillText(subtitle, 18, 43);
    }
  }

  function drawGuideLabel(ctx, text, x, y, color, width) {
    ctx.save();
    ctx.font = '700 12px ui-monospace, monospace';
    var labelWidth = Math.max(48, ctx.measureText ? ctx.measureText(text).width + 12 : text.length * 6 + 12);
    if (Number.isFinite(width)) x = clamp(x, 8, Math.max(8, width - labelWidth - 8));
    ctx.fillStyle = 'rgba(5,13,25,.82)';
    ctx.fillRect(x - 5, y - 13, labelWidth, 18);
    ctx.fillStyle = color || '#d8e5f4';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function outcomeMarkerStyle(sim) {
    if (sim.mode === 'halfpipe') {
      if (sim.outcome === 'unsafe-contact') {
        return { symbol: 'X', label: 'UNSAFE ANGLE — RUN STOPPED', color: '#fb7185' };
      }
      if (sim.outcome === 'trick-missed') {
        return { symbol: '!', label: 'SAFE CONTACT — TARGET MISSED', color: '#f6b83f' };
      }
      return { symbol: '✓', label: 'SAFE CONTACT — TARGET MET', color: '#5ee092' };
    }
    if (sim.outcome === 'solver-limit') {
      return { symbol: '□', label: 'MODEL LIMIT', color: '#d8e5f4' };
    }
    if (sim.outcome === 'platform-face') {
      return { symbol: 'X', label: 'PLATFORM FACE IMPACT', color: '#fb7185' };
    }
    if (sim.outcome === 'fell-short') {
      return { symbol: '↓', label: 'FELL SHORT', color: '#f6b83f' };
    }
    if (sim.outcome === 'fell-off-platform') {
      return { symbol: '↓', label: 'MISSED PLATFORM', color: '#f6b83f' };
    }
    if (sim.outcome === 'off-lane') {
      return { symbol: 'X', label: 'DECK CONTACT — OFF LANE', color: '#fb7185' };
    }
    if (sim.outcome === 'overshot') {
      return { symbol: 'X', label: 'DECK CONTACT — OVERSHOOT', color: '#fb7185' };
    }
    return { symbol: '✓', label: 'LANDING ZONE', color: '#5ee092' };
  }

  function drawOutcomeMarker(ctx, x, y, sim, width) {
    var style = outcomeMarkerStyle(sim);
    var labelWidth;
    ctx.save();
    ctx.font = '800 11px ui-monospace, monospace';
    labelWidth = Math.max(72, ctx.measureText ? ctx.measureText(style.label).width + 13 : style.label.length * 7);
    var labelX = clamp(x + 16, 8, Math.max(8, width - labelWidth - 8));
    var markerX = labelX - 10;
    ctx.fillStyle = 'rgba(5,13,25,.9)';
    ctx.fillRect(labelX - 5, y - 12, labelWidth, 18);
    ctx.strokeStyle = style.color;
    ctx.fillStyle = style.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(markerX, y - 4, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillText(style.symbol, markerX, y);
    ctx.textAlign = 'left';
    ctx.fillText(style.label, labelX, y);
    ctx.restore();
  }

  function drawEnergyHud(ctx, sim, sample, width) {
    var compact = width < 520;
    var barWidth = compact ? Math.min(150, width * 0.46) : Math.min(260, width * 0.34);
    var x = width - barWidth - 18;
    var y = compact ? 58 : 18;
    var isGapEnergy = sim.mode === 'gap';

    if (isGapEnergy) {
      var signedMotionHeight = finite(
        sample.currentMechanicalEnergyJ,
        sample.keJ + sample.peJ
      );
      var deckPotential = finite(sample.peJ, 0);
      var motionHeightOutput = Math.max(0, finite(sample.keJ, 0)) +
        Math.max(0, deckPotential);
      var deckPotentialRelease = Math.max(0, -deckPotential);
      var movingAirWork = finite(sample.windWorkJ, 0);
      var airRelativeLoss = Math.max(0, finite(sample.aerodynamicDissipationJ, 0));
      var supportTransfer = Math.max(
        0,
        finite(sample.landingSupportWorkAbsorbedSoFarJ, 0)
      );
      var windExport = Math.max(0, -movingAirWork);
      var sourceEnergy = Math.max(
        1,
        finite(sim.energyInputJ, 0) + Math.max(0, movingAirWork) +
          deckPotentialRelease
      );
      var motionWidth = barWidth * clamp(motionHeightOutput / sourceEnergy, 0, 1);
      var lossWidth = barWidth * clamp(airRelativeLoss / sourceEnergy, 0, 1);
      var supportWidth = barWidth * clamp(supportTransfer / sourceEnergy, 0, 1);
      var windExportWidth = barWidth * clamp(windExport / sourceEnergy, 0, 1);
      var cursor = x;

      ctx.save();
      ctx.fillStyle = 'rgba(5,13,25,.72)';
      ctx.fillRect(x - 9, y - 9, barWidth + 18, 48);
      ctx.font = '700 11px ui-sans-serif, system-ui';
      ctx.fillStyle = '#d8e5f4';
      ctx.fillText('LIVE ENERGY FLOW', x, y);
      ctx.fillStyle = 'rgba(148,163,184,.28)';
      ctx.fillRect(x, y + 7, barWidth, 10);
      [
        { width: motionWidth, color: '#4ed7e8' },
        { width: lossWidth, color: '#f6b83f' },
        { width: supportWidth, color: '#5ee092' },
        { width: windExportWidth, color: '#c4b5fd' }
      ].forEach(function(segment) {
        if (segment.width <= 0) return;
        var drawableWidth = Math.max(
          0,
          Math.min(segment.width, x + barWidth - cursor)
        );
        if (drawableWidth <= 0) return;
        ctx.fillStyle = segment.color;
        ctx.fillRect(cursor, y + 7, drawableWidth, 10);
        cursor += drawableWidth;
      });
      ctx.fillStyle = '#a9bad0';
      ctx.font = '500 11px ui-monospace, monospace';
      var fullEnergyLabel = supportTransfer > 0
        ? 'signed E ' + Math.round(signedMotionHeight) + ' J · support ' +
          Math.round(supportTransfer) + ' J'
        : 'motion+height ' + Math.round(signedMotionHeight) + ' J · net air ' +
          signedDelta(sample.aerodynamicNetWorkJ, 0, ' J');
      var shortEnergyLabel = supportTransfer > 0
        ? 'Eref ' + Math.round(signedMotionHeight) + ' · support ' +
          Math.round(supportTransfer) + ' J'
        : 'Eref ' + Math.round(signedMotionHeight) + ' · air ' +
          signedDelta(sample.aerodynamicNetWorkJ, 0, ' J');
      var fittedEnergyLabel = compact ? shortEnergyLabel : fullEnergyLabel;
      if (ctx.measureText &&
          ctx.measureText(fittedEnergyLabel).width > barWidth) {
        fittedEnergyLabel = shortEnergyLabel;
      }
      if (ctx.measureText &&
          ctx.measureText(fittedEnergyLabel).width > barWidth) {
        fittedEnergyLabel = 'Eref ' + Math.round(signedMotionHeight) + ' J';
      }
      ctx.fillText(fittedEnergyLabel, x, y + 31);
      ctx.restore();
      return;
    }

    var kinetic = Math.max(0, finite(sample.keJ, sim.mechanicalJ));
    var potential = Math.max(0, finite(sample.peJ, 0));
    var thermal = Math.max(0, finite(sample.thermalJ, sim.thermalJ || 0));
    var total = Math.max(1, kinetic + potential + thermal);

    ctx.save();
    ctx.fillStyle = 'rgba(5,13,25,.72)';
    ctx.fillRect(x - 9, y - 9, barWidth + 18, 48);
    ctx.font = '700 11px ui-sans-serif, system-ui';
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
    ctx.font = '500 11px ui-monospace, monospace';
    ctx.fillText(compact
      ? 'KE ' + Math.round(kinetic) + '  PE ' + Math.round(potential) + '  L ' + Math.round(thermal)
      : 'KE ' + Math.round(kinetic) + '  PE ' + Math.round(potential) +
        '  loss ' + Math.round(thermal) + ' J', x, y + 31);
    ctx.restore();
  }

  function drawMotionFooter(ctx, sample, width, height, detail, predictionLocked) {
    ctx.save();
    ctx.font = '700 11px ui-monospace, monospace';
    var timeLabel = finite(sample.time, 0).toFixed(2) + ' s';
    var speedLabel = (finite(sample.speedMps, 0) * MPS2MPH).toFixed(1) + ' mph';
    var footerText = predictionLocked
      ? 'prediction locked  |  run to reveal'
      : sample.phase + '  |  ' + timeLabel + '  |  ' + speedLabel;
    var availableWidth = Math.max(80, width - 38);
    if (!predictionLocked && ctx.measureText && ctx.measureText(footerText).width > availableWidth) {
      footerText = sample.phase + '  |  ' + timeLabel;
    }
    if (!predictionLocked && ctx.measureText && ctx.measureText(footerText).width > availableWidth) {
      var shortPhase = String(sample.phase || '').slice(0, 18);
      if (shortPhase.length < String(sample.phase || '').length) shortPhase += '…';
      footerText = shortPhase + '  |  ' + timeLabel;
    }
    ctx.fillStyle = 'rgba(5,13,25,.78)';
    ctx.fillRect(12, height - 34, Math.min(width - 24, 330), 23);
    ctx.fillStyle = '#d8e5f4';
    ctx.fillText(footerText, 19, height - 19);
    if (!predictionLocked && detail && width > 620) {
      ctx.fillStyle = '#9fb2ca';
      ctx.font = '600 11px ui-monospace, monospace';
      ctx.fillText(detail, width - Math.min(285, width * 0.37), height - 19);
    }
    ctx.restore();
  }

  function drawSkater2D(ctx, x, y, rotationDeg, vehicleId, bodyPositionId, compression, visualScale) {
    var boardLength = vehicleId === 'bmx' ? 36 : 28;
    var tucked = bodyPositionId === 'tuck';
    var open = bodyPositionId === 'open';
    var landingSquat = clamp(finite(compression, 0), 0, 1);
    var riderScale = finite(visualScale, 1);
    var rotationRad = rotationDeg * Math.PI / 180;
    var torsoTop = lerp(tucked ? -17 : -25, -14, landingSquat);
    var headY = lerp(tucked ? -24 : -32, -21, landingSquat);
    var comReferenceLocalY = -16;
    var comCurrentLocalY = lerp(comReferenceLocalY, -7, landingSquat);

    function localToScreen(localX, localY) {
      return {
        x: x + (Math.cos(rotationRad) * localX - Math.sin(rotationRad) * localY) * riderScale,
        y: y + (Math.sin(rotationRad) * localX + Math.cos(rotationRad) * localY) * riderScale
      };
    }
    var anchors = {
      board: { x: x, y: y },
      comReference: localToScreen(0, comReferenceLocalY),
      comCurrent: localToScreen(0, comCurrentLocalY)
    };

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotationRad);
    if (typeof ctx.scale === 'function') {
      ctx.scale(riderScale, riderScale);
    }
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
    return anchors;
  }

  function drawComCompressionCue(ctx, anchors, sample, sim, width) {
    if (!anchors || !anchors.comCurrent || !anchors.comReference ||
        !isLandingContactPhase(sample.phase)) return;
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(78,215,232,.86)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(anchors.comReference.x, anchors.comReference.y);
    ctx.lineTo(anchors.comCurrent.x, anchors.comCurrent.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(216,229,244,.72)';
    ctx.fillStyle = '#06101e';
    ctx.beginPath();
    ctx.arc(anchors.comReference.x, anchors.comReference.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#4ed7e8';
    ctx.beginPath();
    ctx.arc(anchors.comCurrent.x, anchors.comCurrent.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (width > 560) {
      drawGuideLabel(ctx,
        'COM ↓ ' + rounded(sample.comCompressionM, 2) + ' / ' +
          rounded(sim.landingCompressionM, 2) + ' m',
        anchors.board.x - 126,
        anchors.board.y - 8,
        '#4ed7e8',
        width
      );
    }
  }

  function drawHalfpipe2D(ctx, width, height, sim, sample, config) {
    drawBackdrop(ctx, width, height, 'HALFPIPE | SIDE ELEVATION', 'Tangent-following motion, flight attitude, contact, and transition loads');
    var comparisonHalf2D = config.compareSim && config.compareSim.mode === 'halfpipe'
      ? config.compareSim
      : null;
    var compactHalfpipe = width < 520;
    var marginX = Math.max(compactHalfpipe ? 36 : 52, width * 0.08);
    var baseY = height - (compactHalfpipe ? 48 : 60);
    var sx = (width - marginX * 2) / 9.3;
    var halfpipeHeightCeiling = config.predictionLocked
      ? Math.max(4.7, sim.rampDepthM + 2.4)
      : Math.max(
        sim.rampDepthM + sim.hAir,
        comparisonHalf2D ? comparisonHalf2D.rampDepthM + comparisonHalf2D.hAir : 0
      );
    var sy = Math.min((height - (compactHalfpipe ? 110 : 140)) / Math.max(4.7, halfpipeHeightCeiling), sx * 0.82);
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

    if (!config.predictionLocked) {
      var peakLoadMarker = map(sim.peakLoadX, sim.peakLoadY);
      ctx.save();
      ctx.strokeStyle = '#fb7185';
      ctx.fillStyle = '#fb7185';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(peakLoadMarker.x, peakLoadMarker.y - 2);
      ctx.lineTo(peakLoadMarker.x, peakLoadMarker.y - 18);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(peakLoadMarker.x, peakLoadMarker.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      drawGuideLabel(ctx, 'peak ' + sim.peakNormalG.toFixed(1) + ' g',
        clamp(peakLoadMarker.x + 8, 10, width - 98), peakLoadMarker.y - 22, '#fb7185', width);
    }

    if (!config.predictionLocked) {
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
      drawGuideLabel(ctx, width < 520 ? '+' + sim.hFt.toFixed(1) + ' ft' : '+' + sim.hFt.toFixed(1) + ' ft apex',
        apex.x + 39, apex.y - 4, '#72dce8', width);

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
    }

    if (!config.predictionLocked && comparisonHalf2D) {
      ctx.save();
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = 'rgba(196,181,253,.76)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (var previousHalfStep = 0; previousHalfStep <= 64; previousHalfStep++) {
        var previousHalfSample = sampleHalfpipe(comparisonHalf2D, previousHalfStep / 64);
        var previousHalfPoint = map(previousHalfSample.x, previousHalfSample.y);
        if (previousHalfStep === 0) ctx.moveTo(previousHalfPoint.x, previousHalfPoint.y);
        else ctx.lineTo(previousHalfPoint.x, previousHalfPoint.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      var previousHalfApex = map(4, comparisonHalf2D.rampDepthM + comparisonHalf2D.hAir);
      ctx.strokeStyle = '#c4b5fd';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(previousHalfApex.x, previousHalfApex.y, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    var airStart = sim.rollTime / sim.motionDuration;
    var airEnd = finite(sim.airLandingTime, sim.rollTime + sim.airTime) / sim.motionDuration;
    if (config.progress > airStart) {
      var airProgress = clamp((config.progress - airStart) / Math.max(0.0001, airEnd - airStart), 0, 1);
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
      var trailCount = width < 520 ? 5 : 9;
      for (var trail = 0; trail < trailCount; trail++) {
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

    drawSkater2D(ctx, p.x, p.y, sample.rotation, sim.vehicle.id, sim.bodyPosition.id,
      sample.loadSquat, width < 520 ? 1.16 : 1.08);
    if (sample.time >= sim.airLandingTime - 0.000001) {
      drawOutcomeMarker(ctx, p.x, p.y - 42, sim, width);
    }
    if (config.showVectors) {
      drawArrow(ctx, p.x, p.y - 18, p.x + clamp(sample.vx * 5, -52, 52), p.y - 18 - clamp(sample.vy * 5, -52, 52), '#4ed7e8', 'v');
      if (sample.normalG === 0) {
        drawArrow(ctx, p.x + 17, p.y - 25, p.x + 17, p.y + 22, '#fb7185', 'g');
      } else {
        var normalLength = clamp(sample.normalG * 12, 10, 52);
        drawArrow(ctx, p.x + 17, p.y - 18, p.x + 17 + sample.nx * normalLength, p.y - 18 - sample.ny * normalLength, '#5ee092', 'N');
      }
    }
    if (config.showEnergy && !config.predictionLocked) drawEnergyHud(ctx, sim, sample, width);
    drawMotionFooter(ctx, sample, width, height,
      sample.time >= sim.airLandingTime - 0.000001
        ? outcomeMarkerStyle(sim).label.toLowerCase()
        : sim.bodyPosition.label + ' body | ' + sim.surface.label + ' surface',
      config.predictionLocked);
  }

  function drawLaneInset2D(ctx, sim, sample, width) {
    var compact = width < 520;
    var insetWidth = Math.min(170, width * (compact ? 0.44 : 0.28));
    var insetHeight = 58;
    var x = width - insetWidth - 18;
    var y = compact ? 116 : 68;
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
    if (sample && sample.airForceMagnitudeN > 0.01 &&
        Math.abs(sample.airForceZ) > 0.01) {
      var lateralForceRatio = sample.airForceZ /
        Math.max(0.001, sample.airForceMagnitudeN);
      var forceArrowLength = clamp(Math.abs(lateralForceRatio) * 18, 10, 18);
      var forceArrowX = x + insetWidth * 0.42;
      drawArrow(
        ctx,
        forceArrowX,
        centerY,
        forceArrowX,
        centerY - Math.sign(lateralForceRatio) * forceArrowLength,
        '#f6b83f',
        'F_air,z'
      );
    }
    ctx.fillStyle = sim.withinLane ? '#5ee092' : '#fb7185';
    ctx.beginPath();
    ctx.arc(x + insetWidth - 14, centerY - sim.crossDriftM * driftScale, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a9bad0';
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.fillText(compact
      ? 'DRIFT ' + sim.crossDriftFt.toFixed(1) + ' FT'
      : 'TOP VIEW | drift ' + sim.crossDriftFt.toFixed(1) + ' ft', x + 9, y + 12);
    ctx.restore();
  }

  function drawGap2D(ctx, width, height, sim, sample, config) {
    drawBackdrop(ctx, width, height, 'GAP JUMP | SIDE ELEVATION', sim.airDrag ? 'Quadratic drag, wind, and terrain-aware contact' : 'Ideal flight with terrain-aware contact');
    var comparisonGap2D = config.compareSim && config.compareSim.mode === 'gap'
      ? config.compareSim
      : null;
    var maxWorldX = config.predictionLocked
      ? Math.max(sim.gapM + sim.landingZoneM + 0.7, 5)
      : Math.max(
        sim.rangeM,
        sim.rangeIdealM,
        finite(sim.contactEndM, finite(sim.rolloutEndM, sim.rangeM)) + 0.25,
        sim.gapM + sim.landingZoneM + 0.7,
        comparisonGap2D ? comparisonGap2D.rangeM : 0,
        comparisonGap2D ? finite(comparisonGap2D.contactEndM, finite(comparisonGap2D.rolloutEndM, comparisonGap2D.rangeM)) + 0.25 : 0,
        comparisonGap2D ? comparisonGap2D.gapM + comparisonGap2D.landingZoneM + 0.7 : 0,
        5
      );
    var compactGap = width < 520;
    var left = compactGap ? 44 : 70;
    var right = width - (compactGap ? 26 : 44);
    var baseY = height - (compactGap ? 54 : 72);
    var sx = (right - left) / maxWorldX;
    var gapHeightCeiling = config.predictionLocked
      ? 2.4
      : Math.max(sim.peakM, comparisonGap2D ? comparisonGap2D.peakM : 0);
    var sy = Math.min((height - (compactGap ? 118 : 152)) / Math.max(2.4, gapHeightCeiling * 1.24), sx);
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

    if (!config.predictionLocked) {
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
      drawGuideLabel(ctx, width < 520 ? sim.peakFt.toFixed(1) + ' ft' : sim.peakFt.toFixed(1) + ' ft apex',
        apex.x + 7, apex.y - 5, '#7aa7ff', width);
    }

    if (!config.predictionLocked && sim.airDrag && sim.idealFlightPath && sim.idealFlightPath.length) {
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
      drawGuideLabel(ctx, width < 520 ? 'no drag' : 'ideal no-drag',
        idealLabelPoint.x + 7, idealLabelPoint.y - 8, '#f6b83f', width);
    }

    if (!config.predictionLocked) {
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
    }

    if (!config.predictionLocked && comparisonGap2D) {
      ctx.save();
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = 'rgba(196,181,253,.76)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (var previousGapIndex = 0; previousGapIndex < comparisonGap2D.flightPath.length; previousGapIndex++) {
        var previousGapWorld = comparisonGap2D.flightPath[previousGapIndex];
        var previousGapPoint = map(previousGapWorld.x, previousGapWorld.y);
        if (previousGapIndex === 0) ctx.moveTo(previousGapPoint.x, previousGapPoint.y);
        else ctx.lineTo(previousGapPoint.x, previousGapPoint.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      var previousGapLanding = map(comparisonGap2D.rangeM, 0);
      ctx.strokeStyle = '#c4b5fd';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(previousGapLanding.x, previousGapLanding.y, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    var modeledLanding = map(sim.rangeM, 0);
    var contactEnd = map(Math.max(sim.rangeM, finite(sim.contactEndM, sim.rangeM)), 0);
    if (!config.predictionLocked && finite(sim.contactTravelM, 0) > 0.02) {
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = sim.runSuccessful ? 'rgba(94,224,146,.72)' : 'rgba(251,113,133,.76)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(modeledLanding.x, modeledLanding.y - 4);
      ctx.lineTo(contactEnd.x, contactEnd.y - 4);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(contactEnd.x, contactEnd.y - 4, 3.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      if (width > 560) {
        drawGuideLabel(ctx, 'contact travel ' + (sim.contactTravelM * M2FT).toFixed(1) + ' ft',
          clamp((modeledLanding.x + contactEnd.x) * 0.5 - 42, 10, width - 132),
          modeledLanding.y - 18, sim.runSuccessful ? '#5ee092' : '#fb7185', width);
      }
    }
    if (!config.predictionLocked && sim.hasLandingContact) {
      ctx.save();
      ctx.fillStyle = sim.runSuccessful ? '#5ee092' : '#fb7185';
      ctx.beginPath();
      ctx.arc(modeledLanding.x, modeledLanding.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

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
      var trailCount = width < 520 ? 5 : 9;
      for (var trail = 0; trail < trailCount; trail++) {
        var pp = Math.max(0, config.progress - trail * 0.022);
        var ghost = sampleGapJump(sim, pp);
        var gp = map(ghost.x, ghost.y);
        ctx.globalAlpha = 0.25 * (1 - trail / 10);
        ctx.fillStyle = '#72dce8';
        ctx.beginPath();
        ctx.arc(gp.x, gp.y - 13, 4.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    var supportedShadow = sample.x <= 0.000001 ||
      (sample.x >= sim.gapM && Math.abs(sample.z) <= sim.platformHalfM && sample.y >= 0);
    if (supportedShadow) {
      var groundX = clamp(p.x, 10, width - 20);
      ctx.save();
      ctx.globalAlpha = clamp(0.34 - Math.max(0, sample.y) * 0.08, 0.08, 0.34);
      ctx.fillStyle = '#020712';
      ctx.beginPath();
      ctx.arc(groundX, baseY + 3, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (!config.predictionLocked && isLandingContactPhase(sample.phase)) {
      ctx.save();
      ctx.strokeStyle = '#5ee092';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.72;
      ctx.beginPath();
      ctx.moveTo(p.x - 15, p.y + 5);
      ctx.lineTo(p.x + 15, p.y + 5);
      ctx.stroke();
      if (sample.phase === 'absorbing the landing') {
        ctx.globalAlpha = 0.28 + 0.5 * finite(sample.landingPulse, 0);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y + 2, 8 + 10 * finite(sample.landingPulse, 0), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    var riderAnchors2D = drawSkater2D(ctx, p.x, p.y, sample.rotation, sim.vehicle.id, 'neutral',
      sample.landingSquat, width < 520 ? 1.16 : 1.08);
    if (sample.flightTime >= sim.airTime - 0.000001) {
      drawOutcomeMarker(ctx, p.x, p.y - (isLandingContactPhase(sample.phase) ? 62 : 42), sim, width);
    }
    if (!config.predictionLocked) drawComCompressionCue(ctx, riderAnchors2D, sample, sim, width);
    if (config.showVectors) {
      drawArrow(ctx, p.x, p.y - 18, p.x + clamp(sample.vx * 4.5, -55, 55), p.y - 18 - clamp(sample.vy * 4.5, -55, 55), '#4ed7e8', 'v');
      if (sample.phase !== 'approaching the ramp' && !isLandingContactPhase(sample.phase)) {
        drawArrow(ctx, p.x + 16, p.y - 24, p.x + 16, p.y + 23, '#fb7185', 'g');
      } else if (isLandingContactPhase(sample.phase)) {
        drawArrow(ctx, p.x + 16, p.y - 4, p.x + 16, p.y - clamp(sample.normalG * 10, 18, 58), '#5ee092', 'N');
      }
      if (sample.airForceMagnitudeN > 0.01) {
        var airForceLength2D = clamp(sample.airForceMagnitudeN * 1.8, 18, 55);
        var airForceUnitX2D = sample.airForceX / sample.airForceMagnitudeN;
        var airForceUnitY2D = sample.airForceY / sample.airForceMagnitudeN;
        drawArrow(
          ctx,
          p.x - 10,
          p.y - 42,
          p.x - 10 + airForceUnitX2D * airForceLength2D,
          p.y - 42 - airForceUnitY2D * airForceLength2D,
          '#f6b83f',
          'F_air'
        );
      }
    }
    if (config.showEnergy && !config.predictionLocked) drawEnergyHud(ctx, sim, sample, width);
    if (!config.predictionLocked && Math.abs(sim.crossDriftM) > 0.02) {
      drawLaneInset2D(ctx, sim, sample, width);
    }

    drawGuideLabel(ctx, sim.gapFt.toFixed(0) + ' ft gap',
      left + (landingX - left) * 0.38, baseY + 28, '#d8e5f4', width);
    drawMotionFooter(ctx, sample, width, height,
      sample.flightTime >= sim.airTime - 0.000001
        ? outcomeMarkerStyle(sim).label.toLowerCase()
        : (sample.flightTime > 0 && sim.airDrag
          ? 'net air ' + signedDelta(sample.aerodynamicNetWorkJ, 0, ' J') +
            ' | air-relative loss ' + Math.round(sample.aerodynamicDissipationJ) + ' J'
          : 'load ' + sample.normalG.toFixed(1) + ' g | peak ' +
            getLandingPeakG(sim).toFixed(1) + ' g | drift ' +
            sim.crossDriftFt.toFixed(1) + ' ft'),
      config.predictionLocked);
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

  function drawSkater3D(ctx, width, height, camera, point, rotationDeg, vehicleId, bodyPositionId, compression, orientationPlane) {
    var center = project3D(point, camera, width, height);
    var rad = rotationDeg * Math.PI / 180;
    var visualScale = width < 520 ? 1.15 : 1.07;
    var followsSidePlane = orientationPlane === 'side';
    var boardAxis = followsSidePlane
      ? { x: Math.cos(rad), y: -Math.sin(rad), z: 0 }
      : { x: Math.cos(rad), y: 0, z: Math.sin(rad) };
    var bodyUp = followsSidePlane
      ? { x: Math.sin(rad), y: Math.cos(rad), z: 0 }
      : { x: 0, y: 1, z: 0 };

    function localPoint(alongBoard, aboveBoard, lateral) {
      return {
        x: point.x + boardAxis.x * alongBoard * visualScale + bodyUp.x * aboveBoard * visualScale,
        y: point.y + boardAxis.y * alongBoard * visualScale + bodyUp.y * aboveBoard * visualScale,
        z: point.z + boardAxis.z * alongBoard * visualScale + bodyUp.z * aboveBoard * visualScale +
          finite(lateral, 0) * visualScale
      };
    }

    var left = project3D(localPoint(-0.36, 0, 0), camera, width, height);
    var right = project3D(localPoint(0.36, 0, 0), camera, width, height);
    var tucked = bodyPositionId === 'tuck';
    var landingSquat = clamp(finite(compression, 0), 0, 1);
    var legHeight = lerp(tucked ? 0.16 : 0.22, 0.1, landingSquat);
    var torsoHeight = lerp(tucked ? 0.42 : 0.58, 0.31, landingSquat);
    var headHeight = lerp(tucked ? 0.66 : 0.86, 0.54, landingSquat);
    var hip = project3D(localPoint(0, legHeight, 0), camera, width, height);
    var torso = project3D(localPoint(0, torsoHeight, 0), camera, width, height);
    var shoulder = project3D(localPoint(0, torsoHeight * 0.82, 0), camera, width, height);
    var head = project3D(localPoint(0, headHeight, 0), camera, width, height);
    var leftFoot = project3D(localPoint(-0.17, 0.035, -0.025), camera, width, height);
    var rightFoot = project3D(localPoint(0.17, 0.035, 0.025), camera, width, height);
    var armReach = tucked ? 0.19 : 0.29;
    var armHeight = torsoHeight * (tucked ? 0.62 : 0.58);
    var leftHand = project3D(localPoint(-armReach, armHeight, -0.1), camera, width, height);
    var rightHand = project3D(localPoint(armReach, armHeight, 0.1), camera, width, height);
    var comReference = project3D(localPoint(0, 0.42, 0), camera, width, height);
    var comCurrent = project3D(localPoint(0, lerp(0.42, 0.22, landingSquat), 0), camera, width, height);

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
      var leftWheel = project3D(localPoint(-0.28, -0.055, 0), camera, width, height);
      var rightWheel = project3D(localPoint(0.28, -0.055, 0), camera, width, height);
      ctx.strokeStyle = '#72dce8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(leftWheel.x, leftWheel.y, 5, 0, Math.PI * 2);
      ctx.moveTo(rightWheel.x + 5, rightWheel.y);
      ctx.arc(rightWheel.x, rightWheel.y, 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = '#f2f7ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(torso.x, torso.y);
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(leftFoot.x, leftFoot.y);
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(rightFoot.x, rightFoot.y);
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.lineTo(leftHand.x, leftHand.y);
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.lineTo(rightHand.x, rightHand.y);
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
    return {
      board: center,
      comReference: comReference,
      comCurrent: comCurrent
    };
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
    drawBackdrop(ctx, width, height, 'HALFPIPE | 3D ORBIT', 'Board pitch follows terrain through supported motion, flight, and contact');
    drawGround3D(ctx, width, height, config.camera);
    var comparisonHalf3D = config.compareSim && config.compareSim.mode === 'halfpipe'
      ? config.compareSim
      : null;

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

    if (!config.predictionLocked) {
      var peakLoadMarker = project3D({ x: sim.peakLoadX, y: sim.peakLoadY + 0.06, z: -1.88 }, config.camera, width, height);
      ctx.save();
      ctx.strokeStyle = '#fb7185';
      ctx.fillStyle = '#fb7185';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(peakLoadMarker.x, peakLoadMarker.y - 2);
      ctx.lineTo(peakLoadMarker.x, peakLoadMarker.y - 15);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(peakLoadMarker.x, peakLoadMarker.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      drawGuideLabel(ctx, 'peak ' + sim.peakNormalG.toFixed(1) + ' g',
        clamp(peakLoadMarker.x + 7, 10, width - 98), peakLoadMarker.y - 19, '#fb7185', width);
    }

    var trajectory = [];
    var completedTrajectory = [];
    for (var pathStep = 0; pathStep <= 60; pathStep++) {
      var progress = pathStep / 60;
      var point = sampleHalfpipe(sim, progress);
      trajectory.push({ x: point.x, y: point.y, z: 0 });
      if (progress <= config.progress) completedTrajectory.push({ x: point.x, y: point.y, z: 0 });
    }
    if (!config.predictionLocked && comparisonHalf3D) {
      var previousHalfTrajectory3D = [];
      for (var previousHalf3DStep = 0; previousHalf3DStep <= 64; previousHalf3DStep++) {
        var previousHalf3DSample = sampleHalfpipe(comparisonHalf3D, previousHalf3DStep / 64);
        previousHalfTrajectory3D.push({
          x: previousHalf3DSample.x,
          y: previousHalf3DSample.y,
          z: 0
        });
      }
      path3D(ctx, previousHalfTrajectory3D, config.camera, width, height, '#c4b5fd', 2, [3, 5]);
    }
    if (!config.predictionLocked) {
      path3D(ctx, trajectory, config.camera, width, height, 'rgba(114,220,232,.56)', 2, [6, 6]);
      path3D(ctx, completedTrajectory, config.camera, width, height, '#4ed7e8', 3);
    }

    if (config.showTrail) {
      ctx.save();
      var trailCount = width < 520 ? 5 : 9;
      for (var trail = 0; trail < trailCount; trail++) {
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
    var riderAnchors3D = drawSkater3D(ctx, width, height, config.camera, sample, sample.rotation, sim.vehicle.id, sim.bodyPosition.id, sample.loadSquat, 'side');
    var center = riderAnchors3D.board;
    if (sample.time >= sim.airLandingTime - 0.000001) {
      drawOutcomeMarker(ctx, center.x, center.y - 36, sim, width);
    }
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
    if (config.showEnergy && !config.predictionLocked) drawEnergyHud(ctx, sim, sample, width);
    drawMotionFooter(ctx, sample, width, height,
      sample.time >= sim.airLandingTime - 0.000001
        ? outcomeMarkerStyle(sim).label.toLowerCase()
        : 'camera ' + Math.round(config.camera) + ' deg | ' + sim.bodyPosition.label + ' body',
      config.predictionLocked);
  }

  function drawGap3D(ctx, width, height, sim, sample, config) {
    drawBackdrop(ctx, width, height, 'GAP JUMP | 3D ORBIT', 'Depth, drift, terrain contact, and support-load response');
    drawGround3D(ctx, width, height, config.camera);
    var comparisonGap3D = config.compareSim && config.compareSim.mode === 'gap'
      ? config.compareSim
      : null;
    var span = config.predictionLocked
      ? Math.max(sim.gapM + sim.landingZoneM, 5)
      : Math.max(
        sim.rangeM,
        sim.rangeIdealM,
        finite(sim.contactEndM, finite(sim.rolloutEndM, sim.rangeM)),
        sim.gapM + sim.landingZoneM,
        comparisonGap3D ? comparisonGap3D.rangeM : 0,
        comparisonGap3D ? finite(comparisonGap3D.contactEndM, finite(comparisonGap3D.rolloutEndM, comparisonGap3D.rangeM)) : 0,
        comparisonGap3D ? comparisonGap3D.gapM + comparisonGap3D.landingZoneM : 0,
        5
      );
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
      { x: landingX, y: 0.5, z: -2.2 }, { x: 6, y: 0.5, z: -2.2 },
      { x: 6, y: 0.5, z: 2.2 }, { x: landingX, y: 0.5, z: 2.2 }
    ], config.camera, width, height, 'rgba(52,68,90,.96)', '#9fb2ca');
    polygon3D(ctx, [
      { x: landingX, y: 0.525, z: -laneHalf }, { x: landingEnd, y: 0.525, z: -laneHalf },
      { x: landingEnd, y: 0.525, z: laneHalf }, { x: landingX, y: 0.525, z: laneHalf }
    ], config.camera, width, height, 'rgba(94,224,146,.28)', '#5ee092');

    path3D(ctx, [{ x: landingX, y: 0.54, z: -laneHalf }, { x: 6, y: 0.54, z: -laneHalf }], config.camera, width, height, 'rgba(216,229,244,.66)', 1.5);
    path3D(ctx, [{ x: landingX, y: 0.54, z: laneHalf }, { x: 6, y: 0.54, z: laneHalf }], config.camera, width, height, 'rgba(216,229,244,.66)', 1.5);

    if (!config.predictionLocked && finite(sim.contactTravelM, 0) > 0.02) {
      path3D(ctx, [
        { x: lipX + sim.rangeM * k, y: 0.545, z: sim.crossDriftM },
        {
          x: lipX + finite(sim.contactEndM, sim.rangeM) * k,
          y: 0.545,
          z: finite(sim.contactEndZ, sim.crossDriftM)
        }
      ], config.camera, width, height, sim.runSuccessful ? 'rgba(94,224,146,.76)' : 'rgba(251,113,133,.76)', 2, [4, 4]);
    }

    if (!config.predictionLocked && sim.airDrag && sim.idealFlightPath && sim.idealFlightPath.length) {
      var idealTrajectory = [];
      for (var idealIndex = 0; idealIndex < sim.idealFlightPath.length; idealIndex++) {
        var idealPoint = sim.idealFlightPath[idealIndex];
        idealTrajectory.push({ x: lipX + idealPoint.x * k, y: 0.5 + idealPoint.y, z: 0 });
      }
      path3D(ctx, idealTrajectory, config.camera, width, height, 'rgba(246,184,63,.72)', 1.5, [3, 6]);
    }

    if (!config.predictionLocked && comparisonGap3D) {
      var previousGapTrajectory3D = [];
      for (var previousGap3DIndex = 0; previousGap3DIndex < comparisonGap3D.flightPath.length; previousGap3DIndex++) {
        var previousGap3DPoint = comparisonGap3D.flightPath[previousGap3DIndex];
        previousGapTrajectory3D.push({
          x: lipX + previousGap3DPoint.x * k,
          y: 0.5 + previousGap3DPoint.y,
          z: previousGap3DPoint.z
        });
      }
      path3D(ctx, previousGapTrajectory3D, config.camera, width, height, '#c4b5fd', 2, [3, 5]);
    }

    var trajectory = [];
    var completedTrajectory = [];
    for (var i = 0; i < sim.flightPath.length; i++) {
      var flightPoint = sim.flightPath[i];
      var worldPoint = { x: lipX + flightPoint.x * k, y: 0.5 + flightPoint.y, z: flightPoint.z };
      trajectory.push(worldPoint);
      if (flightPoint.t <= sample.flightTime) completedTrajectory.push(worldPoint);
    }
    if (!config.predictionLocked) {
      path3D(ctx, trajectory, config.camera, width, height, 'rgba(114,220,232,.56)', 2, [6, 6]);
      path3D(ctx, completedTrajectory, config.camera, width, height, '#4ed7e8', 3);
    }

    if (config.showTrail) {
      ctx.save();
      var trailCount = width < 520 ? 5 : 9;
      for (var trail = 0; trail < trailCount; trail++) {
        var ghostProgress = Math.max(0, config.progress - trail * 0.022);
        var ghostSample = sampleGapJump(sim, ghostProgress);
        var ghostPoint = { x: lipX + ghostSample.x * k, y: 0.5 + ghostSample.y, z: ghostSample.z };
        var ghostProjection = project3D(ghostPoint, config.camera, width, height);
        ctx.globalAlpha = 0.25 * (1 - trail / 10);
        ctx.fillStyle = '#72dce8';
        ctx.beginPath();
        ctx.arc(ghostProjection.x, ghostProjection.y - 7, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    var skaterPoint = { x: lipX + sample.x * k, y: 0.5 + sample.y, z: sample.z };
    var supportedShadow = sample.x <= 0.000001 ||
      (sample.x >= sim.gapM && Math.abs(sample.z) <= sim.platformHalfM && sample.y >= 0);
    if (supportedShadow) {
      drawShadow3D(ctx, width, height, config.camera,
        { x: skaterPoint.x, y: 0.52, z: skaterPoint.z }, Math.max(0, sample.y));
    }
    if (!config.predictionLocked && isLandingContactPhase(sample.phase)) {
      var supportProjection = project3D({
        x: skaterPoint.x,
        y: 0.54,
        z: skaterPoint.z
      }, config.camera, width, height);
      ctx.save();
      ctx.strokeStyle = '#5ee092';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.72;
      ctx.beginPath();
      ctx.moveTo(supportProjection.x - 15, supportProjection.y + 4);
      ctx.lineTo(supportProjection.x + 15, supportProjection.y + 4);
      ctx.stroke();
      if (sample.phase === 'absorbing the landing') {
        ctx.globalAlpha = 0.28 + 0.5 * finite(sample.landingPulse, 0);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(supportProjection.x, supportProjection.y + 1,
          8 + 10 * finite(sample.landingPulse, 0), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    var gapRiderAnchors3D = drawSkater3D(ctx, width, height, config.camera, skaterPoint, sample.rotation, sim.vehicle.id, 'neutral', sample.landingSquat, 'side');
    var center = gapRiderAnchors3D.board;
    if (sample.flightTime >= sim.airTime - 0.000001) {
      drawOutcomeMarker(ctx, center.x, center.y - (isLandingContactPhase(sample.phase) ? 56 : 36), sim, width);
    }
    if (!config.predictionLocked) drawComCompressionCue(ctx, gapRiderAnchors3D, sample, sim, width);
    if (config.showVectors) {
      drawArrow(ctx, center.x, center.y - 14, center.x + clamp(sample.vx * 4, -52, 52), center.y - 14 - clamp(sample.vy * 4, -52, 52), '#4ed7e8', 'v');
      if (sample.phase !== 'approaching the ramp' && !isLandingContactPhase(sample.phase)) {
        drawArrow(ctx, center.x + 14, center.y - 18, center.x + 14, center.y + 30, '#fb7185', 'g');
      } else if (isLandingContactPhase(sample.phase)) {
        drawArrow(ctx, center.x + 14, center.y - 2, center.x + 14, center.y - clamp(sample.normalG * 9, 18, 56), '#5ee092', 'N');
      }
      if (sample.airForceMagnitudeN > 0.01) {
        var displayForceX = sample.airForceX * k;
        var displayForceY = sample.airForceY;
        var displayForceZ = sample.airForceZ;
        var displayForceMagnitude = Math.sqrt(
          displayForceX * displayForceX +
          displayForceY * displayForceY +
          displayForceZ * displayForceZ
        );
        var airForceLength3D = clamp(sample.airForceMagnitudeN * 0.025, 0.42, 0.9);
        var airForceStart3D = {
          x: skaterPoint.x,
          y: skaterPoint.y + 0.34,
          z: skaterPoint.z
        };
        var airForceEnd3D = {
          x: airForceStart3D.x + displayForceX /
            Math.max(0.001, displayForceMagnitude) * airForceLength3D,
          y: airForceStart3D.y + displayForceY /
            Math.max(0.001, displayForceMagnitude) * airForceLength3D,
          z: airForceStart3D.z + displayForceZ /
            Math.max(0.001, displayForceMagnitude) * airForceLength3D
        };
        var airForceStartProjection = project3D(
          airForceStart3D,
          config.camera,
          width,
          height
        );
        var airForceEndProjection = project3D(
          airForceEnd3D,
          config.camera,
          width,
          height
        );
        drawArrow(
          ctx,
          airForceStartProjection.x,
          airForceStartProjection.y,
          airForceEndProjection.x,
          airForceEndProjection.y,
          '#f6b83f',
          'F_air'
        );
      }
    }
    if (config.showEnergy && !config.predictionLocked) drawEnergyHud(ctx, sim, sample, width);

    if (!config.predictionLocked && sim.airDrag) {
      var idealLandingMarker = project3D({ x: lipX + sim.rangeIdealM * k, y: 0.54, z: 0 }, config.camera, width, height);
      ctx.save();
      ctx.strokeStyle = '#f6b83f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(idealLandingMarker.x, idealLandingMarker.y, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (!config.predictionLocked && comparisonGap3D) {
      var previousLandingMarker3D = project3D({
        x: lipX + comparisonGap3D.rangeM * k,
        y: 0.54,
        z: comparisonGap3D.crossDriftM
      }, config.camera, width, height);
      ctx.save();
      ctx.strokeStyle = '#c4b5fd';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(previousLandingMarker3D.x, previousLandingMarker3D.y, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    var landingMarker = project3D({ x: lipX + sim.rangeM * k, y: 0.54, z: sim.crossDriftM }, config.camera, width, height);
    if (!config.predictionLocked && sim.hasLandingContact) {
      ctx.save();
      ctx.fillStyle = sim.runSuccessful ? '#5ee092' : '#fb7185';
      ctx.beginPath();
      ctx.arc(landingMarker.x, landingMarker.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      drawGuideLabel(ctx, (sim.withinLane ? 'lane ' : 'off lane ') +
        Math.abs(sim.crossDriftFt).toFixed(1) + ' ft', landingMarker.x + 8,
        landingMarker.y - 7, sim.withinLane ? '#5ee092' : '#fb7185', width);
    }
    drawMotionFooter(ctx, sample, width, height,
      sample.flightTime >= sim.airTime - 0.000001
        ? outcomeMarkerStyle(sim).label.toLowerCase()
        : (sample.flightTime > 0 && sim.airDrag
          ? 'net air ' + signedDelta(sample.aerodynamicNetWorkJ, 0, ' J') +
            ' | air-relative loss ' + Math.round(sample.aerodynamicDissipationJ) + ' J'
          : 'load ' + sample.normalG.toFixed(1) + ' g | peak ' +
            getLandingPeakG(sim).toFixed(1) + ' g | ideal air'),
      config.predictionLocked);
  }

  function drawScene(canvas, sim, progress, config) {
    var frame = canvasFrame(canvas);
    if (!frame) return;
    config = config || {};
    progress = config.predictionLocked
      ? 0
      : clamp(finite(progress, 0), 0, 1);
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
    rampDepthM: 2.4,
    landingCompressionM: LANDING_COMPRESSION_M,
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
    previousSim: null,
    experiments: [],
    stats: { runs: 0, successful: 0, withinTen: 0 },
    viewsUsed: { '2d': true },
    surfacesTested: { standard: true }
  };

  function rounded(value, digits) {
    return finite(value, 0).toFixed(digits == null ? 1 : digits);
  }

  function isComparableSimulation(candidate) {
    if (!candidate || !Number.isFinite(candidate.motionDuration) || candidate.motionDuration <= 0) return false;
    if (candidate.mode === 'halfpipe') {
      return Array.isArray(candidate.transitionPath) && candidate.transitionPath.length > 1 &&
        Number.isFinite(candidate.peakNormalG) && Number.isFinite(candidate.hFt);
    }
    if (candidate.mode === 'gap') {
      return Array.isArray(candidate.flightPath) && candidate.flightPath.length > 1 &&
        Number.isFinite(candidate.landingStopTimeS) && Number.isFinite(candidate.landingImpactG);
    }
    return false;
  }

  function simulationSignature(candidate) {
    if (!isComparableSimulation(candidate)) return '';
    if (candidate.mode === 'halfpipe') {
      return [
        candidate.mode,
        rounded(candidate.pumps, 4),
        rounded(candidate.gravity, 4),
        rounded(candidate.riderMassKg, 4),
        rounded(candidate.rampDepthM, 4),
        rounded(candidate.rotationTarget, 4),
        rounded(candidate.spinRate, 4),
        candidate.vehicle && candidate.vehicle.id,
        candidate.surface && candidate.surface.id,
        candidate.bodyPosition && candidate.bodyPosition.id
      ].join('|');
    }
    return [
      candidate.mode,
      rounded(candidate.speedMph, 4),
      rounded(candidate.angleDeg, 4),
      rounded(candidate.gapFt, 4),
      rounded(candidate.gravity, 4),
      rounded(candidate.riderMassKg, 4),
      rounded(candidate.landingCompressionM, 4),
      candidate.airDrag ? 'drag' : 'ideal',
      candidate.vehicle && candidate.vehicle.id,
      candidate.wind && candidate.wind.id
    ].join('|');
  }

  function simulationSuccessful(candidate) {
    if (!candidate) return false;
    return typeof candidate.runSuccessful === 'boolean'
      ? candidate.runSuccessful
      : !!candidate.landed;
  }

  function signedDelta(value, digits, unit) {
    var threshold = Math.pow(10, -(digits == null ? 1 : digits)) * 0.5;
    var cleaned = Math.abs(finite(value, 0)) < threshold ? 0 : finite(value, 0);
    return (cleaned > 0 ? '+' : '') + rounded(cleaned, digits) + (unit || '');
  }

  function simulationInputChanges(current, previous) {
    if (!isComparableSimulation(current) || !isComparableSimulation(previous) ||
        current.mode !== previous.mode) return [];

    function objectLabel(value) {
      if (!value) return 'unknown';
      return String(value.label || value.id || value);
    }

    var definitions = current.mode === 'halfpipe' ? [
      { key: 'pumps', label: 'Pumps', digits: 0, unit: '', value: function(model) { return model.pumps; } },
      { key: 'gravity', label: 'Gravity', digits: 2, unit: ' m/s²', value: function(model) { return model.gravity; } },
      { key: 'riderMassKg', label: 'Rider mass', digits: 0, unit: ' kg', value: function(model) { return model.riderMassKg; } },
      { key: 'rampDepthM', label: 'Ramp depth', digits: 1, unit: ' m', value: function(model) { return model.rampDepthM; } },
      { key: 'rotationTarget', label: 'Rotation target', digits: 0, unit: '°', value: function(model) { return model.rotationTarget; } },
      { key: 'spinRate', label: 'Spin rate', digits: 0, unit: '°/s', value: function(model) { return model.spinRate; } },
      { key: 'vehicle', label: 'Ride', value: function(model) { return objectLabel(model.vehicle); } },
      { key: 'surface', label: 'Surface', value: function(model) { return objectLabel(model.surface); } },
      { key: 'bodyPosition', label: 'Body position', value: function(model) { return objectLabel(model.bodyPosition); } }
    ] : [
      { key: 'speedMph', label: 'Takeoff speed', digits: 0, unit: ' mph', value: function(model) { return model.speedMph; } },
      { key: 'angleDeg', label: 'Ramp angle', digits: 0, unit: '°', value: function(model) { return model.angleDeg; } },
      { key: 'gapFt', label: 'Gap distance', digits: 0, unit: ' ft', value: function(model) { return model.gapFt; } },
      { key: 'gravity', label: 'Gravity', digits: 2, unit: ' m/s²', value: function(model) { return model.gravity; } },
      { key: 'riderMassKg', label: 'Rider mass', digits: 0, unit: ' kg', value: function(model) { return model.riderMassKg; } },
      { key: 'landingCompressionM', label: 'Landing absorption', digits: 2, unit: ' m', value: function(model) { return model.landingCompressionM; } },
      { key: 'airDrag', label: 'Air drag', value: function(model) { return model.airDrag ? 'on' : 'off'; } },
      { key: 'vehicle', label: 'Ride', value: function(model) { return objectLabel(model.vehicle); } },
      { key: 'wind', label: 'Wind', value: function(model) { return objectLabel(model.wind); } }
    ];

    return definitions.reduce(function(changes, definition) {
      var currentValue = definition.value(current);
      var previousValue = definition.value(previous);
      var numeric = Number.isFinite(currentValue) && Number.isFinite(previousValue);
      var changed = numeric
        ? Math.abs(currentValue - previousValue) > 0.000001
        : currentValue !== previousValue;
      if (!changed) return changes;
      function format(value) {
        return numeric
          ? rounded(value, definition.digits == null ? 1 : definition.digits) + (definition.unit || '')
          : String(value);
      }
      changes.push({
        key: definition.key,
        label: definition.label,
        numeric: numeric,
        previousValue: previousValue,
        currentValue: currentValue,
        previousText: format(previousValue),
        currentText: format(currentValue)
      });
      return changes;
    }, []);
  }

  function describeSimulationChange(current, previous, isMeasured) {
    var changes = simulationInputChanges(current, previous);
    if (!changes.length) return '';
    var first = changes[0];
    var introduction;
    var comparisonKind = isMeasured ? 'result' : 'prediction';
    if (changes.length === 1) {
      if (first.numeric) {
        introduction = 'One-variable ' + comparisonKind + ': ' + first.label + ' ' +
          (first.currentValue > first.previousValue ? 'increased' : 'decreased') +
          ' from ' + first.previousText + ' to ' + first.currentText + '. ';
      } else {
        introduction = 'One-variable ' + comparisonKind + ': ' + first.label +
          ' changed from ' + first.previousText +
          ' to ' + first.currentText + '. ';
      }
    } else {
      var labels = changes.slice(0, 3).map(function(change) { return change.label.toLowerCase(); });
      introduction = 'Combined-input ' + comparisonKind + ': multiple inputs changed (' + labels.join(', ') +
        (changes.length > 3 ? ', plus ' + (changes.length - 3) + ' more' : '') +
        '), so treat these as combined effects rather than a one-variable cause. ';
    }

    if (current.mode === 'halfpipe') {
      if (changes.length === 1 && first.key === 'rotationTarget') {
        return introduction + 'The requested goal changes the success criterion, not the takeoff motion; modeled rotation changed ' +
          signedDelta(current.completed - previous.completed, 0, '°') +
          ' and contact-angle error changed ' +
          signedDelta(current.contactAlignmentErrorDeg - previous.contactAlignmentErrorDeg, 1, '°') + '.';
      }
      if (changes.length === 1 &&
          (first.key === 'bodyPosition' || first.key === 'spinRate')) {
        return introduction + 'Modeled rotation changed ' +
          signedDelta(current.completed - previous.completed, 0, '°') +
          '; air height changed ' + signedDelta(current.hFt - previous.hFt, 1, ' ft') +
          '; contact-angle error changed ' +
          signedDelta(current.contactAlignmentErrorDeg - previous.contactAlignmentErrorDeg, 1, '°') + '.';
      }
      return introduction + 'Air height changed ' +
        signedDelta(current.hFt - previous.hFt, 1, ' ft') +
        '; peak transition load changed ' +
        signedDelta(current.peakNormalG - previous.peakNormalG, 1, ' g') +
        '; modeled rotation changed ' +
        signedDelta(current.completed - previous.completed, 0, '°') + '.';
    }

    if (changes.length === 1 && first.key === 'landingCompressionM') {
      if (!current.hasLandingContact || !previous.hasLandingContact) {
        return introduction + 'At least one setup missed supported deck contact, so a landing-load comparison is not available.';
      }
      return introduction + 'Peak supported load changed ' +
        signedDelta(getLandingPeakG(current) - getLandingPeakG(previous), 1, ' g') +
        '; contact-pulse duration changed ' +
        signedDelta(current.landingStopTimeS - previous.landingStopTimeS, 2, ' s') + '.';
    }
    if (changes.length === 1 && first.key === 'gapFt') {
      return introduction + 'The modeled trajectory range changed ' +
        signedDelta(current.rangeFt - previous.rangeFt, 1, ' ft') +
        ', while platform clearance changed ' +
        signedDelta((current.clearance - previous.clearance) * M2FT, 1, ' ft') +
        '. Outcome: ' + String(current.outcome || 'unresolved').replace(/-/g, ' ') + '.';
    }
    if (changes.length === 1 && first.key === 'wind') {
      return introduction + 'Range changed ' +
        signedDelta(current.rangeFt - previous.rangeFt, 1, ' ft') +
        '; lateral drift changed ' +
        signedDelta(Math.abs(current.crossDriftFt) - Math.abs(previous.crossDriftFt), 1, ' ft') + '.';
    }
    var gapSummary = introduction + 'Range changed ' +
      signedDelta(current.rangeFt - previous.rangeFt, 1, ' ft') +
      '; apex height changed ' +
      signedDelta(current.peakFt - previous.peakFt, 1, ' ft') + '.';
    if (current.hasLandingContact && previous.hasLandingContact) {
      gapSummary += ' Peak supported load changed ' +
        signedDelta(getLandingPeakG(current) - getLandingPeakG(previous), 1, ' g') + '.';
    } else {
      gapSummary += ' A supported landing-load comparison is unavailable because at least one setup missed the deck.';
    }
    return gapSummary;
  }

  function phaseLearningText(sim, sample) {
    if (!sim || !sample) return '';
    var phase = String(sample.phase || '');
    if (sim.mode === 'halfpipe') {
      if (phase === 'dropping in') {
        return 'Gravity converts height into speed; surface loss reduces the mechanical energy that reaches the bottom.';
      }
      if (phase === 'compressing at the bottom' || phase === 'compressing on the return') {
        return 'Speed and tight curvature combine here, so the surface-normal load reaches a local maximum.';
      }
      if (phase === 'driving up the wall' || phase === 'driving down the return wall') {
        return 'Kinetic energy is converting back into gravitational potential energy as the rider climbs.';
      }
      if (phase === 'rising' || phase === 'at the apex' || phase === 'falling' ||
          phase === 'approaching contact') {
        return phase === 'at the apex'
          ? 'Vertical velocity is momentarily near zero, but gravity still accelerates the rider downward.'
          : 'The rider is in free flight: support load is zero, while body position changes angular speed.';
      }
      if (phase === 'unsafe contact — simulation stopped') {
        return 'Terrain contact occurred without safe tangent alignment, so no support impulse or return path is invented.';
      }
      if (phase === 're-entering the wall') {
        return 'Safe tangent alignment lets the wall begin redirecting the rider into the transition.';
      }
      return 'The surface is redirecting the rider toward the bottom while normal load rises with speed and curvature.';
    }

    if (phase === 'approaching the ramp') {
      return 'Takeoff speed and ramp angle set the horizontal and vertical launch-velocity components.';
    }
    var aerodynamicEvidence = sim.airDrag
      ? ' Net aerodynamic change so far is ' +
        signedDelta(sample.aerodynamicNetWorkJ, 0, ' J') +
        ': moving-air work ' + signedDelta(sample.windWorkJ, 0, ' J') +
        ' minus ' + Math.round(sample.aerodynamicDissipationJ) +
        ' J transferred to the wake and turbulence.'
      : ' In the ideal-air model, moving-air work and aerodynamic dissipation are both zero.';
    if (phase === 'rising') {
      return 'Gravity reduces vertical speed; aerodynamic force changes horizontal, vertical, and lateral motion.' +
        aerodynamicEvidence;
    }
    if (phase === 'at the apex') {
      return 'Vertical velocity is near zero at the apex, while horizontal and lateral motion continue.' +
        aerodynamicEvidence;
    }
    if (phase === 'falling') {
      return 'Gravity increases downward speed; the terrain event, not deck height alone, determines contact.' +
        aerodynamicEvidence;
    }
    if (phase === 'platform contact') {
      return 'The board is supported at deck height while the rider’s center of mass still moves downward at ' +
        rounded(Math.abs(sample.comVerticalVelocityMps), 2) +
        ' m/s; the surface begins redirecting that vertical momentum. Flight ended with a net aerodynamic change of ' +
        signedDelta(sample.aerodynamicNetWorkJ, 0, ' J') + '.';
    }
    if (phase === 'absorbing the landing') {
      return 'The board stays on the deck while the rider’s center of mass has moved ' +
        rounded(sample.comCompressionM, 2) + ' of ' + rounded(sim.landingCompressionM, 2) +
        ' m downward; ' + rounded(Math.abs(sample.comVerticalVelocityMps), 2) +
        ' m/s remains under a ' + rounded(sample.normalG, 1) + ' g support load.';
    }
    if (phase === 'contact pulse complete') {
      return 'The board remains supported and modeled COM compression has reached ' +
        rounded(sample.comCompressionM, 2) +
        ' m; vertical speed is zero. Rebound, braking, and rolling resistance are outside this model.';
    }
    if (phase === 'hit the platform face') {
      return 'The platform face is terrain contact without deck support; its impact response is not modeled.';
    }
    if (phase === 'model limit reached') {
      return 'The safety horizon ended before terrain contact could be resolved, so no landing claim is made.';
    }
    return 'The trajectory missed supported terrain, so the model reports no landing load.';
  }

  function resultText(sim) {
    if (sim.mode === 'halfpipe') {
      if (sim.runSuccessful) {
        return 'Target met — safe re-entry: ' + rounded(sim.hFt, 1) + ' ft above the lip, ' +
          rounded(sim.airTime, 2) + ' s airborne, and ' + Math.round(sim.completed) +
          '° of rotation with a ' + sim.bodyPosition.label.toLowerCase() +
          ' body position. The tangent-matched re-entry carries the rider back to the bottom under a ' +
          rounded(finite(sim.reentryPeakNormalG, sim.peakNormalG), 1) + ' g peak transition load.';
      }
      if (sim.contactSafe) {
        return 'Safe re-entry, target missed: the board is within ' +
          rounded(sim.contactAlignmentErrorDeg, 0) + '° of the wall tangent, but the model reached ' +
          Math.round(sim.completed) + '° against a ' + Math.round(sim.rotationTarget) +
          '° target. The rider returns through the transition.';
      }
      return 'Unsafe contact angle: the trick target ' + (sim.trickGoalMet ? 'was met' : 'was not met') +
        ', but the board reaches contact ' + rounded(sim.contactAlignmentErrorDeg, 0) +
        '° away from the wall tangent. The simulation stops at first contact instead of inventing a return.';
    }
    if (sim.solverLimited) {
      return 'Model limit reached before terrain contact could be resolved. Try a less extreme launch setup.';
    }
    if (!sim.hasLandingContact) {
      if (sim.outcome === 'platform-face') {
        return 'Platform-face impact below deck height. This event has terrain contact without deck support; impact response is not modeled, so no contact load is reported.';
      }
      if (sim.outcome === 'fell-short') {
        return 'Fell short of the platform by ' + rounded(Math.abs(sim.clearance) * M2FT, 1) +
          ' ft. The path continues below deck height, so no supported landing load is reported.';
      }
      return 'Missed the supported platform. The path continues below deck height outside the platform footprint, so no supported landing load is reported.';
    }
    var landingLoadText = ' Estimated landing load: ' + rounded(sim.landingImpactG, 1) +
      ' g average and ' + rounded(getLandingPeakG(sim), 1) + ' g peak over ' +
      rounded(sim.landingStopTimeS, 2) + ' s.';
    if (sim.runSuccessful) {
      return 'Landing zone reached: ' + rounded(sim.rangeFt, 1) + ' ft traveled, ' +
        rounded(sim.clearance * M2FT, 1) + ' ft into the platform, ' +
        rounded(Math.abs(sim.crossDriftFt), 1) + ' ft of lateral drift, and an estimated landing load of ' +
        rounded(sim.landingImpactG, 1) + ' g average and ' + rounded(getLandingPeakG(sim), 1) +
        ' g peak over ' + rounded(sim.landingStopTimeS, 2) + ' s.';
    }
    if (!sim.withinLane) {
      return 'Deck contact outside the landing lane: crosswind moved the rider ' +
        rounded(Math.abs(sim.crossDriftFt), 1) + ' ft laterally.' + landingLoadText;
    }
    return 'Deck contact past the landing zone by ' + ((sim.clearance - sim.landingZoneM) * M2FT).toFixed(1) + ' ft.' +
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
          return (data.experiments || []).some(function(entry) {
            return entry.mode === 'gap' &&
              (typeof entry.runSuccessful === 'boolean' ? entry.runSuccessful : entry.landed);
          });
        },
        progress: function(data) {
          return (data.experiments || []).some(function(entry) {
            return entry.mode === 'gap' &&
              (typeof entry.runSuccessful === 'boolean' ? entry.runSuccessful : entry.landed);
          }) ? 'complete' : 'pending';
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
        rampDepthM: d.rampDepthM,
        bodyPositionId: d.bodyPositionId
      }) : simGapJump({
        speedMph: d.speedMph,
        angleDeg: d.angleDeg,
        gapFt: d.gapFt,
        vehicle: d.vehicle,
        gravity: d.gravity,
        windId: d.windId,
        riderMassKg: d.riderMassKg,
        landingCompressionM: d.landingCompressionM,
        airDrag: d.airDrag !== false
      });

      var currentSimulationSignature = simulationSignature(sim);
      var lastSimulationSignature = simulationSignature(d.lastSim);
      var previousSimulationSignature = simulationSignature(d.previousSim);
      var currentResult = isComparableSimulation(d.lastResult) &&
        d.lastResult.mode === mode &&
        simulationSignature(d.lastResult) === currentSimulationSignature
        ? d.lastResult
        : null;
      var comparisonSim = isComparableSimulation(d.lastSim) &&
        d.lastSim.mode === mode &&
        lastSimulationSignature !== currentSimulationSignature
        ? d.lastSim
        : (isComparableSimulation(d.previousSim) &&
          d.previousSim.mode === mode &&
          previousSimulationSignature !== currentSimulationSignature
            ? d.previousSim
            : null);

      var canvasRef = React.useRef(null);
      var animationRef = React.useRef(null);
      var playbackRef = React.useRef(null);
      var runningState = React.useState(false);
      var running = runningState[0];
      var setRunning = runningState[1];
      var pausedState = React.useState(false);
      var paused = pausedState[0];
      var setPaused = pausedState[1];
      var localStatusState = React.useState(null);
      var localStatus = localStatusState[0];
      var setLocalStatus = localStatusState[1];
      var playheadState = React.useState(0);
      var playhead = playheadState[0];
      var setPlayhead = playheadState[1];
      var playheadRef = React.useRef(0);
      var lastTelemetryPaintRef = React.useRef(0);

      function setModelStatus(model, text) {
        setLocalStatus({
          signature: simulationSignature(model),
          text: String(text || '')
        });
      }

      function commitPlayhead(nextProgress) {
        nextProgress = clamp(finite(nextProgress, 0), 0, 1);
        playheadRef.current = nextProgress;
        setPlayhead(nextProgress);
      }

      function renderConfig(activeModel, revealPrediction) {
        activeModel = activeModel || sim;
        var lockPrediction = !!predictionLocked && revealPrediction !== true;
        var compareForDraw = comparisonSim &&
          simulationSignature(comparisonSim) !== simulationSignature(activeModel)
          ? comparisonSim
          : null;
        return {
          view: viewMode,
          camera: finite(d.cameraAzimuth, 38),
          showVectors: !lockPrediction && d.showVectors !== false,
          showTrail: !lockPrediction && d.showTrail !== false,
          showEnergy: !lockPrediction && d.showEnergy !== false,
          predictionLocked: lockPrediction,
          compareSim: lockPrediction ? null : compareForDraw
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
        d.riderMassKg, d.rampDepthM, d.landingCompressionM, d.bodyPositionId, d.airDrag, d.cameraAzimuth,
        d.showVectors, d.showTrail, d.showEnergy, d.lastSim, d.previousSim
      ]);

      React.useEffect(function() {
        return function() {
          if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
          playbackRef.current = null;
        };
      }, []);

      function finishRun(finishedSim, shouldLog) {
        animationRef.current = null;
        playbackRef.current = null;
        commitPlayhead(1);
        setPaused(false);
        setRunning(false);
        if (shouldLog || simulationSignature(finishedSim) === currentSimulationSignature) {
          setModelStatus(finishedSim, resultText(finishedSim));
        } else {
          setLocalStatus(null);
        }
        if (typeof announceToSR === 'function') announceToSR(resultText(finishedSim));
        if (!shouldLog) return;

        upd(function(current) {
          var actual = finishedSim.mode === 'halfpipe' ? finishedSim.hFt : finishedSim.rangeFt;
          var estimate = Number(current.estimateValue);
          var hasEstimate = Number.isFinite(estimate) && estimate >= 0 && String(current.estimateValue).trim() !== '';
          var errorPct = hasEstimate ? Math.abs(estimate - actual) / Math.max(0.01, actual) * 100 : null;
          var stats = Object.assign({}, current.stats || DEFAULTS.stats);
          stats.runs = (stats.runs || 0) + 1;
          stats.successful = (stats.successful || 0) + (simulationSuccessful(finishedSim) ? 1 : 0);
          stats.withinTen = (stats.withinTen || 0) + (errorPct !== null && errorPct <= 10 ? 1 : 0);
          var entry = {
            id: Date.now(),
            mode: finishedSim.mode,
            view: current.viewMode,
            setup: finishedSim.mode === 'halfpipe'
              ? current.pumps + ' pumps · ' + current.rampDepthM + ' m ramp · ' + current.surfaceId +
                ' · ' + current.rotationTarget + '° target · ' +
                getBodyPosition(current.bodyPositionId).label.toLowerCase()
              : current.speedMph + ' mph · ' + current.angleDeg + '° · ' + current.gapFt +
                ' ft gap · ' + current.landingCompressionM + ' m absorption · ' +
                getWind(current.windId).label.toLowerCase() +
                (current.airDrag === false ? ' · ideal air' : ' · drag on'),
            measured: actual,
            unit: 'ft',
            estimate: hasEstimate ? estimate : null,
            errorPct: errorPct,
            landed: finishedSim.landed,
            contactSafe: !!finishedSim.contactSafe,
            trickGoalMet: finishedSim.mode === 'halfpipe' ? !!finishedSim.trickGoalMet : null,
            outcome: finishedSim.outcome,
            runSuccessful: simulationSuccessful(finishedSim)
          };
          return {
            lastResult: finishedSim,
            lastSim: finishedSim,
            previousSim: isComparableSimulation(current.lastSim) ? current.lastSim : null,
            experiments: [entry].concat(current.experiments || []).slice(0, 8),
            stats: stats
          };
        });
      }

      function animateModel(model, shouldLog) {
        if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
        playbackRef.current = null;
        commitPlayhead(0);
        lastTelemetryPaintRef.current = 0;
        setPaused(false);
        setRunning(true);
        setModelStatus(model, model.mode === 'halfpipe' ? 'Running the energy model…' : 'Solving the projectile path…');
        var reduced = false;
        try {
          reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        } catch (err) {
          reduced = false;
        }
        if (reduced) {
          commitPlayhead(1);
          drawScene(canvasRef.current, model, 1, renderConfig(model, true));
          finishRun(model, shouldLog);
          return;
        }

        var session = {
          model: model,
          shouldLog: !!shouldLog,
          duration: clamp(model.motionDuration * 1100, 2600, 5200),
          progress: 0,
          anchorTime: null,
          paused: false,
          frame: null
        };
        function frame(time) {
          if (playbackRef.current !== session || session.paused) return;
          if (session.anchorTime === null) {
            session.anchorTime = time - session.progress * session.duration;
          }
          var progress = clamp((time - session.anchorTime) / session.duration, 0, 1);
          session.progress = progress;
          playheadRef.current = progress;
          if (time - lastTelemetryPaintRef.current >= 90 || progress >= 1) {
            lastTelemetryPaintRef.current = time;
            setPlayhead(progress);
          }
          drawScene(canvasRef.current, model, progress, renderConfig(model, true));
          if (progress < 1) animationRef.current = requestAnimationFrame(frame);
          else {
            animationRef.current = null;
            if (playbackRef.current !== session) return;
            finishRun(model, session.shouldLog);
          }
        }
        session.frame = frame;
        playbackRef.current = session;
        animationRef.current = requestAnimationFrame(session.frame);
      }

      function pausePlayback() {
        var session = playbackRef.current;
        if (!running || paused || !session) return;
        session.progress = playheadRef.current;
        session.anchorTime = null;
        session.paused = true;
        if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
        commitPlayhead(session.progress);
        setPaused(true);
        var pausedSample = session.model.mode === 'halfpipe'
          ? sampleHalfpipe(session.model, session.progress)
          : sampleGapJump(session.model, session.progress);
        setModelStatus(session.model, 'Paused at ' + pausedSample.phase + ' · ' +
          rounded(pausedSample.time, 2) + ' seconds.');
      }

      function resumePlayback() {
        var session = playbackRef.current;
        if (!running || !paused || !session) return;
        session.progress = playheadRef.current;
        session.anchorTime = null;
        session.paused = false;
        lastTelemetryPaintRef.current = 0;
        setPaused(false);
        setModelStatus(session.model, session.model.mode === 'halfpipe'
          ? 'Resuming the energy model…'
          : 'Resuming the projectile path…');
        animationRef.current = requestAnimationFrame(session.frame);
      }

      function togglePlayback() {
        if (paused) resumePlayback();
        else pausePlayback();
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
        setLocalStatus(null);
        upd({ mode: nextMode });
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

      function inspectPlayhead(nextProgress) {
        if (running || predictionLocked) return;
        nextProgress = clamp(finite(nextProgress, 0), 0, 1);
        commitPlayhead(nextProgress);
        if (canvasRef.current) drawScene(canvasRef.current, sim, nextProgress, renderConfig());
        var inspected = mode === 'halfpipe'
          ? sampleHalfpipe(sim, nextProgress)
          : sampleGapJump(sim, nextProgress);
        setModelStatus(sim, 'Inspecting ' + inspected.phase + ' at ' +
          rounded(inspected.time, 2) + ' seconds. ' + phaseLearningText(sim, inspected));
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
      var result = currentResult;
      var predictionLocked = !!d.estimateChallenge && !result && !running;
      var displayPlayhead = predictionLocked ? 0 : playhead;
      var currentSample = mode === 'halfpipe'
        ? sampleHalfpipe(sim, displayPlayhead)
        : sampleGapJump(sim, displayPlayhead);
      var windEnergyOutJ = mode === 'gap' ? Math.max(0, -sim.windWorkJ) : 0;
      var deckPotentialReleaseJ = mode === 'gap'
        ? Math.max(0, -sim.flightPotentialEnergyJ)
        : 0;
      var energyLedgerSourceJ = mode === 'gap'
        ? sim.energyInputJ + Math.max(0, sim.windWorkJ) + deckPotentialReleaseJ
        : sim.energyInputJ;
      var energyLedgerMotionHeightJ = mode === 'gap'
        ? sim.flightKineticEnergyJ + Math.max(0, sim.flightPotentialEnergyJ)
        : sim.mechanicalJ;
      var mechanicalPct = clamp(
        (energyLedgerMotionHeightJ / Math.max(1, energyLedgerSourceJ)) * 100,
        0,
        100
      );
      var thermalPct = mode === 'gap'
        ? clamp(
          sim.aerodynamicDissipationJ / Math.max(1, energyLedgerSourceJ) * 100,
          0,
          100
        )
        : 100 - mechanicalPct;
      var windEnergyOutPct = mode === 'gap'
        ? clamp(windEnergyOutJ / Math.max(1, energyLedgerSourceJ) * 100, 0, 100)
        : 0;
      var metricData = mode === 'halfpipe' ? [
        { label: 'Lip speed', value: rounded(sim.vMph, 1) + ' mph' },
        { label: 'Air above lip', value: rounded(sim.hFt, 1) + ' ft' },
        { label: 'Hang time', value: rounded(sim.airTime, 2) + ' s' },
        { label: 'Modeled rotation', value: Math.round(sim.completed) + '°' },
        { label: 'Rotation error', value: rounded(sim.rotationError, 0) + '°' },
        { label: 'Peak transition load', value: rounded(sim.peakNormalG, 1) + ' g' }
      ] : [
        { label: 'Horizontal range', value: rounded(sim.rangeFt, 1) + ' ft' },
        { label: 'Peak height', value: rounded(sim.peakFt, 1) + ' ft' },
        { label: 'Flight time', value: rounded(sim.airTime, 2) + ' s' },
        {
          label: sim.hasLandingContact ? 'Landing load' : 'Contact load',
          value: sim.hasLandingContact
            ? rounded(getLandingPeakG(sim), 1) + ' g peak'
            : (sim.hasTerrainContact ? 'Impact not modeled' : 'No contact')
        },
        {
          label: sim.hasLandingContact ? 'Landing angle' : 'Terminal angle',
          value: rounded(sim.landingAngleDeg, 0) + '°'
        },
        { label: 'Lateral drift', value: rounded(Math.abs(sim.crossDriftFt), 1) + ' ft' }
      ];

      var phaseEvents = mode === 'halfpipe' ? [
        { label: 'start', progress: 0, time: 0 },
        { label: 'bottom', progress: sim.bottomTime / sim.motionDuration, time: sim.bottomTime },
        { label: 'lip', progress: sim.rollTime / sim.motionDuration, time: sim.rollTime },
        { label: 'apex', progress: (sim.rollTime + sim.airTime * 0.5) / sim.motionDuration, time: sim.rollTime + sim.airTime * 0.5 },
        { label: sim.reentryModeled ? 're-entry' : 'contact', progress: sim.airLandingTime / sim.motionDuration, time: sim.airLandingTime },
        { label: sim.reentryModeled ? 'return' : 'stop', progress: 1, time: sim.motionDuration }
      ] : [
        { label: 'start', progress: 0, time: 0 },
        { label: 'ramp', progress: sim.approachTime / sim.motionDuration, time: sim.approachTime },
        { label: 'apex', progress: (sim.approachTime + sim.peakTime) / sim.motionDuration, time: sim.approachTime + sim.peakTime },
        { label: sim.hasLandingContact ? 'contact' : 'miss', progress: (sim.approachTime + sim.airTime) / sim.motionDuration, time: sim.approachTime + sim.airTime },
        { label: sim.hasLandingContact ? 'pulse end' : 'stop', progress: 1, time: sim.motionDuration }
      ];
      var phaseTimingText = predictionLocked ? 'Timing hidden until the model runs' : phaseEvents.map(function(event) {
        return event.label + ' ' + rounded(event.time, 2) + ' seconds';
      }).join(', ');
      var activePhaseEventIndex = 0;
      var activePhaseDistance = Infinity;
      phaseEvents.forEach(function(event, index) {
        var distance = Math.abs(displayPlayhead - event.progress);
        if (distance <= activePhaseDistance) {
          activePhaseDistance = distance;
          activePhaseEventIndex = index;
        }
      });

      var traceProgressValues = [];
      function addTraceProgress(value) {
        var traceProgress = clamp(value, 0, 1);
        for (var traceSeen = 0; traceSeen < traceProgressValues.length; traceSeen++) {
          if (Math.abs(traceProgressValues[traceSeen] - traceProgress) < 0.0000001) return;
        }
        traceProgressValues.push(traceProgress);
      }
      function traceEventProgresses(model) {
        if (model.mode === 'halfpipe') {
          var modelAirLandingTime = finite(model.airLandingTime, model.rollTime + model.airTime);
          return [
            model.peakLoadTime / model.motionDuration,
            model.rollTime / model.motionDuration,
            modelAirLandingTime / model.motionDuration,
            finite(model.reentryPeakTime, modelAirLandingTime) / model.motionDuration
          ];
        }
        return [
          model.approachTime / model.motionDuration,
          (model.approachTime + model.airTime) / model.motionDuration,
          (model.approachTime + model.airTime + model.landingStopTimeS) / model.motionDuration
        ];
      }
      function addTraceEvents(model) {
        traceEventProgresses(model).forEach(function(eventProgress) {
          addTraceProgress(eventProgress - 0.00001);
          addTraceProgress(eventProgress);
          addTraceProgress(eventProgress + 0.00001);
        });
      }
      for (var traceStep = 0; traceStep <= 96; traceStep++) {
        addTraceProgress(traceStep / 96);
      }
      addTraceEvents(sim);
      if (comparisonSim) addTraceEvents(comparisonSim);
      traceProgressValues.sort(function(a, b) { return a - b; });

      function buildTraceSamples(model) {
        return traceProgressValues.map(function(traceProgress) {
          var traceSample = model.mode === 'halfpipe'
            ? sampleHalfpipe(model, traceProgress)
            : sampleGapJump(model, traceProgress);
          return { progress: traceProgress, loadG: Math.max(0, finite(traceSample.normalG, 0)) };
        });
      }
      var traceSamples = buildTraceSamples(sim);
      var comparisonTraceSamples = comparisonSim ? buildTraceSamples(comparisonSim) : [];
      var traceMaxG = 1;
      traceSamples.concat(comparisonTraceSamples).forEach(function(traceSample) {
        traceMaxG = Math.max(traceMaxG, traceSample.loadG);
      });
      var traceTopY = 3;
      var traceBottomY = 27;
      function traceSvgX(traceProgress) {
        return 1 + clamp(traceProgress, 0, 1) * 98;
      }
      function traceSvgY(loadG) {
        return traceBottomY - clamp(loadG / traceMaxG, 0, 1) * (traceBottomY - traceTopY);
      }
      function buildTracePath(samples) {
        return samples.map(function(traceSample, traceIndex) {
          return (traceIndex === 0 ? 'M ' : 'L ') +
            rounded(traceSvgX(traceSample.progress), 2) + ' ' +
            rounded(traceSvgY(traceSample.loadG), 2);
        }).join(' ');
      }
      var tracePath = buildTracePath(traceSamples);
      var comparisonTracePath = comparisonTraceSamples.length ? buildTracePath(comparisonTraceSamples) : '';
      var tracePeakProgress = mode === 'halfpipe'
        ? sim.peakLoadTime / sim.motionDuration
        : (sim.approachTime + sim.airTime + sim.landingStopTimeS * 0.5) / sim.motionDuration;
      var traceReentryPeakProgress = mode === 'halfpipe'
        ? sim.reentryPeakTime / sim.motionDuration
        : null;
      var tracePeakLoadG = mode === 'halfpipe' ? sim.peakNormalG : getLandingPeakG(sim);
      var comparisonPeakLoadG = comparisonSim
        ? (mode === 'halfpipe' ? comparisonSim.peakNormalG : getLandingPeakG(comparisonSim))
        : 0;
      var traceCurrentLoadG = Math.max(0, finite(currentSample.normalG, 0));
      var traceCurrentX = traceSvgX(displayPlayhead);
      var traceCurrentY = traceSvgY(traceCurrentLoadG);
      var tracePeakX = traceSvgX(tracePeakProgress);
      var tracePeakY = traceSvgY(tracePeakLoadG);
      var traceReentryPeakX = mode === 'halfpipe' ? traceSvgX(traceReentryPeakProgress) : 0;
      var traceReentryPeakY = mode === 'halfpipe'
        ? traceSvgY(finite(sim.reentryPeakNormalG, sim.peakNormalG))
        : 0;
      var traceReferenceY = traceSvgY(1);
      var traceHeaderLabel = mode === 'halfpipe' ? 'Transition normal load (g)' : 'Support load (g)';
      var traceHeaderDetail = mode === 'halfpipe'
        ? 'now ' + rounded(traceCurrentLoadG, 1) + ' g · peak ' + rounded(sim.peakNormalG, 1) + ' g'
        : (sim.hasLandingContact
          ? 'now ' + rounded(traceCurrentLoadG, 1) + ' g · peak ' +
            rounded(getLandingPeakG(sim), 1) + ' g · avg ' + rounded(sim.landingImpactG, 1) +
            ' g for ' + rounded(sim.landingStopTimeS, 2) + ' s' +
            (isLandingContactPhase(currentSample.phase)
              ? ' · COM ↓ ' + rounded(currentSample.comCompressionM, 2) + ' m'
              : '')
          : 'now ' + rounded(traceCurrentLoadG, 1) + ' g · no supported landing contact');
      if (comparisonSim) {
        traceHeaderDetail += ' · Δ ' + signedDelta(tracePeakLoadG - comparisonPeakLoadG, 1, ' g') + ' vs previous';
      }
      var traceSummary = mode === 'halfpipe'
        ? 'Transition normal load trace over ' + rounded(sim.motionDuration, 2) +
          ' seconds: changing support through the drop-in and 0 g during flight. ' +
          (sim.reentryModeled
            ? 'A tangent-matched wall re-entry repeats a ' + rounded(sim.reentryPeakNormalG, 1) +
              ' g transition-load peak before the return to the bottom. '
            : 'The board reaches the wall outside the contact tolerance, so the model stops before assigning a support force or return path. ') +
          'Current load at ' + rounded(currentSample.time, 2) + ' seconds is ' + rounded(traceCurrentLoadG, 1) + ' g.'
        : 'Support load trace over ' + rounded(sim.motionDuration, 2) +
          ' seconds: 1 g on approach and 0 g in free flight. ' +
          (sim.hasLandingContact
            ? 'Platform contact creates a smooth half-sine landing pulse with ' +
              rounded(sim.landingImpactG, 1) + ' g average and ' + rounded(getLandingPeakG(sim), 1) +
              ' g peak load over ' + rounded(sim.landingStopTimeS, 2) +
              ' seconds. The board stays at deck height while the rider COM compresses through ' +
              rounded(sim.landingCompressionM, 2) +
              ' meters; horizontal speed is held constant only during that contact window, and braking afterward is outside this model. '
            : (sim.hasTerrainContact
              ? 'The path hits the platform face without deck support; that impact response is not modeled. '
              : 'The trajectory misses supported deck terrain, so there is no landing pulse or supported contact response. ')) +
          'Current load at ' + rounded(currentSample.time, 2) + ' seconds is ' + rounded(traceCurrentLoadG, 1) + ' g.' +
          (isLandingContactPhase(currentSample.phase)
            ? ' Current COM compression is ' + rounded(currentSample.comCompressionM, 2) +
              ' meters, with ' + Math.round(currentSample.landingNetImpulseDeliveredNs) +
              ' newton-seconds of net vertical impulse delivered.'
            : '');
      if (comparisonSim) {
        traceSummary += ' The dashed lavender line is the previous run, with a peak load of ' +
          rounded(comparisonPeakLoadG, 1) + ' g over ' + rounded(comparisonSim.motionDuration, 2) +
          ' seconds. The current peak-load difference is ' +
          signedDelta(tracePeakLoadG - comparisonPeakLoadG, 1, ' g') + '.';
      }
      if (predictionLocked) {
        traceHeaderDetail = 'Run to reveal measured loads';
        traceSummary = traceHeaderLabel + ' is hidden for the prediction challenge until this setup runs.';
      }

      var currentAirForceSummary = mode === 'gap' && sim.airDrag &&
        currentSample.airForceMagnitudeN > 0.01
        ? ' At this phase F-air is ' +
          rounded(currentSample.airForceMagnitudeN, 1) + ' newtons' +
          (Math.abs(currentSample.airForceZ) > 0.01
            ? ', with a ' + rounded(Math.abs(currentSample.airForceZ), 1) +
              ' newton lateral component toward the ' +
              (currentSample.airForceZ > 0 ? 'right' : 'left')
            : '') + '.'
        : '';
      var canvasSummary = mode === 'halfpipe'
        ? 'The ' + viewMode.toUpperCase() + ' view shows a ' + sim.vehicle.label.toLowerCase() +
          ' following the curved halfpipe transition through drop-in and flight. During supported motion, the board follows the local surface tangent. ' +
          (sim.reentryModeled
            ? 'The board reaches the wall inside the contact-angle tolerance, follows the return-wall tangent, and travels back toward the bottom. '
            : 'The board reaches the wall ' + rounded(sim.contactAlignmentErrorDeg, 0) +
              ' degrees away from its tangent, so the simulation stops at first unsafe contact without inventing a return. ') +
          'A ' +
          sim.bodyPosition.label.toLowerCase() + ' body position changes rotational inertia in flight, while the rider compresses along the surface normal as support load rises. Current ' +
          rounded(sim.rampDepthM, 1) + '-meter ramp model: ' + rounded(sim.hFt, 1) +
          ' feet above the lip, ' + rounded(sim.bottomNormalG, 1) + ' g at the bottom, a ' +
          rounded(sim.peakNormalG, 1) + ' g peak transition load, and ' + Math.round(sim.completed) +
          ' degrees of rotation. Outcome: ' + outcomeMarkerStyle(sim).label.toLowerCase() + '.'
        : 'The ' + viewMode.toUpperCase() + ' view shows a ' + sim.vehicle.label.toLowerCase() +
          ' following a ' + (sim.airDrag ? 'drag-adjusted projectile arc beside an amber ideal no-drag reference' : 'no-drag projectile arc') +
          ' across a ' + rounded(sim.gapFt, 0) + ' foot gap. Current model range is ' + rounded(sim.rangeFt, 1) +
          ' feet and lateral drift at deck height is ' + rounded(Math.abs(sim.crossDriftFt), 1) + ' feet. ' +
          (sim.airDrag
            ? 'The amber F-air arrow points opposite air-relative motion. Moving-air work is ' +
              signedDelta(sim.windWorkJ, 0, ' joules') + ', air-relative dissipation is ' +
              Math.round(sim.aerodynamicDissipationJ) +
              ' joules, and the resulting net aerodynamic energy change is ' +
              signedDelta(sim.aerodynamicNetWorkJ, 0, ' joules') + '.' +
              currentAirForceSummary + ' '
            : 'Ideal air sets aerodynamic force, moving-air work, and air-relative dissipation to zero. ') +
          (sim.hasLandingContact
            ? 'The platform supports contact at ' + rounded(sim.landingAngleDeg, 0) +
              ' degrees. The landing pulse reaches ' + rounded(getLandingPeakG(sim), 1) +
              ' g peak with a ' + rounded(sim.landingImpactG, 1) + ' g average over ' +
              rounded(sim.landingStopTimeS, 2) +
              ' seconds. Once support begins, the board follows the flat deck while a cyan COM marker moves downward through up to ' +
              rounded(sim.landingCompressionM, 2) +
              ' meters; green marks the moving board-support point. Current COM compression is ' +
              rounded(currentSample.comCompressionM, 2) + ' meters, with ' +
              rounded(Math.abs(currentSample.comVerticalVelocityMps), 2) +
              ' meters per second of downward speed remaining. During that contact pulse the rider travels ' +
              rounded(sim.contactTravelM * M2FT, 1) +
              ' feet along the deck plane; braking after the pulse is outside this model. '
            : (sim.hasTerrainContact
              ? 'The path reaches the platform face below deck height. That unsupported impact is identified, but its force response is not modeled. '
              : 'The path continues below deck height without supported contact or a landing pulse. ')) +
          'Outcome: ' + outcomeMarkerStyle(sim).label.toLowerCase() + '.';

      var comparisonExplanation = !predictionLocked && comparisonSim
        ? describeSimulationChange(sim, comparisonSim, !!result)
        : '';
      var phaseInsight = predictionLocked
        ? 'Run the model to unlock phase-by-phase evidence.'
        : phaseLearningText(sim, currentSample);

      if (predictionLocked) {
        canvasSummary = 'Prediction challenge ready. The calculated trajectory and measured outcomes stay hidden until this setup runs.';
      }
      var localStatusText = localStatus &&
        localStatus.signature === currentSimulationSignature
        ? localStatus.text
        : '';
      var statusText = predictionLocked
        ? 'Prediction locked: run the model to reveal the measured outcome.'
        : (localStatusText || (result ? resultText(result) : 'Predicted result: ' + resultText(sim)));

      var gapEnergyEquation = mode === 'gap'
        ? (sim.airDrag
          ? 'Aerodynamic flight balance: E-motion+height = E-launch + W-moving-air − D-air-relative = ' +
            Math.round(sim.energyInputJ) + ' J ' +
            signedDelta(sim.windWorkJ, 0, ' J') + ' − ' +
            Math.round(sim.aerodynamicDissipationJ) + ' J = ' +
            Math.round(sim.flightMechanicalEnergyJ) +
            ' J. Net aerodynamic change W-moving-air − D-air-relative = ' +
            signedDelta(sim.aerodynamicNetWorkJ, 0, ' J') +
            '; terminal deck-reference potential = ' +
            signedDelta(sim.flightPotentialEnergyJ, 0, ' J') +
            '; numerical closure residual = ' +
            rounded(sim.energyClosureResidualJ, 6) + ' J. '
          : 'Ideal-air flight balance: moving-air work = 0 J and air-relative loss = 0 J, so E-motion+height = E-launch = ' +
            Math.round(sim.energyInputJ) + ' J; numerical closure residual = ' +
            rounded(sim.energyClosureResidualJ, 6) + ' J. ')
        : '';
      var equation = mode === 'halfpipe'
        ? 'Transition depth d = ' + rounded(sim.rampDepthM, 2) + ' m: v-bottom = √(v-lip² + 2gd) = ' +
          rounded(sim.bottomSpeed, 2) + ' m/s; N/(mg) = v²/(rg) + n-y = ' +
          rounded(sim.bottomNormalG, 2) + ' at the bottom; peak transition load = ' +
          rounded(sim.peakNormalG, 2) + ' g at x = ' + rounded(sim.peakLoadX, 2) +
          ' m. Launch: ½mv² = ' + Math.round(sim.energyInputJ) + ' J input → ηE = ' +
          Math.round(sim.mechanicalJ) + ' J mechanical; h = E/(mg) = ' + rounded(sim.hAir, 2) +
          ' m; θ = ωt = ' + rounded(sim.airSpinRate, 0) + '°/s × ' + rounded(sim.airTime, 2) +
          ' s = ' + Math.round(sim.completed) + '°. Tucking changes I and therefore ω. ' +
          'Board attitude: φ-surface = −atan2(v-y, v-x), and φ-flight = φ-lip + ωt. ' +
          (sim.reentryModeled
            ? 'Contact is within ' + rounded(sim.contactAlignmentToleranceDeg, 0) +
              '° of the local tangent, so the return transition is modeled and normal load reaches ' +
              rounded(sim.reentryPeakNormalG, 2) + ' g before the rider returns to the bottom.'
            : 'Contact is ' + rounded(sim.contactAlignmentErrorDeg, 1) +
              '° from the local tangent, outside the ' + rounded(sim.contactAlignmentToleranceDeg, 0) +
              '° limit, so the model terminates without assigning a return path or support impulse.')
        : (!sim.hasLandingContact
          ? (sim.hasTerrainContact
            ? gapEnergyEquation + 'Projectile motion is integrated every 1/180 s to a platform-face impact below deck height. The event is recorded as unsupported terrain contact; face-impact force and post-impact motion are not calculated.'
            : gapEnergyEquation + 'Projectile motion is integrated every 1/180 s until the path reaches actual terrain or the declared fall boundary. This run did not reach a supported platform top, so landing force and compression are not calculated.')
          : (sim.airDrag
          ? gapEnergyEquation + 'Quadratic drag: a = -½ρ(CdA/m)|v-relative|v-relative, integrated every 1/180 s. ' +
            'Range = ' + rounded(sim.rangeM, 2) + ' m versus ' + rounded(sim.rangeIdealM, 2) +
            ' m for the ideal no-drag reference. Half-sine landing pulse: average N/(mg) ≈ 1 + v-y²/(2gd-stop) = ' +
            rounded(sim.landingImpactG, 2) + ' g; peak = 1 + (π/2)(average - 1) = ' +
            rounded(getLandingPeakG(sim), 2) + ' g. Stopping time: Δt ≈ 2d-stop/|v-y| = ' +
            rounded(sim.landingStopTimeS, 3) + ' s; vertical kinetic energy removed = ½m(v-y)² = ' +
            Math.round(sim.landingVerticalKineticRemovedJ) + ' J; gravity adds mgd = ' +
            Math.round(sim.landingGravityWorkJ) + ' J during COM compression, so the support-work magnitude is ' +
            Math.round(sim.landingSupportWorkAbsorbedJ) + ' J; net vertical impulse: Δp-y = m|v-y| = ' +
            Math.round(sim.landingNetImpulseNs) + ' N·s; mean contact force = ' +
            rounded(sim.landingAverageForceN / 1000, 2) + ' kN; peak contact force = ' +
            rounded(sim.landingPeakForceN / 1000, 2) + ' kN for a ' +
            rounded(sim.landingCompressionM, 2) + ' m compression.'
          : gapEnergyEquation + 'Ideal reference: t = 2v·sin(θ)/g = ' + rounded(sim.airTime, 2) +
            ' s; R = v²sin(2θ)/g = ' + rounded(sim.rangeIdealM, 2) +
            ' m; h-max = v-y²/(2g) = ' + rounded(sim.peakM, 2) +
            ' m. Half-sine landing pulse: average load = ' + rounded(sim.landingImpactG, 2) +
            ' g; peak load = ' + rounded(getLandingPeakG(sim), 2) +
            ' g. Stopping time: Δt ≈ 2d-stop/|v-y| = ' + rounded(sim.landingStopTimeS, 3) +
            ' s; vertical kinetic energy removed = ½m(v-y)² = ' +
            Math.round(sim.landingVerticalKineticRemovedJ) + ' J; gravity adds mgd = ' +
            Math.round(sim.landingGravityWorkJ) + ' J during COM compression, so the support-work magnitude is ' +
            Math.round(sim.landingSupportWorkAbsorbedJ) + ' J; net vertical impulse: Δp-y = m|v-y| = ' +
            Math.round(sim.landingNetImpulseNs) + ' N·s; mean contact force = ' +
            rounded(sim.landingAverageForceN / 1000, 2) + ' kN; peak contact force = ' +
            rounded(sim.landingPeakForceN / 1000, 2) + ' kN for a ' +
            rounded(sim.landingCompressionM, 2) + ' m compression.'));
      if (predictionLocked) {
        equation = 'Enter a prediction, then run this setup to reveal its calculated trajectory, energy values, and measured outcome.';
      }

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

      var gapAerodynamicNote = mode === 'gap'
        ? (sim.airDrag
          ? 'Aerodynamic energy: moving-air work ' + signedDelta(sim.windWorkJ, 0, ' J') +
            ' · air-relative loss ' + Math.round(sim.aerodynamicDissipationJ) +
            ' J · net aerodynamic change ' + signedDelta(sim.aerodynamicNetWorkJ, 0, ' J') +
            ' · terminal motion + height ' + Math.round(sim.flightMechanicalEnergyJ) +
            ' J · closure residual ' + rounded(sim.energyClosureResidualJ, 6) + ' J. '
          : 'Ideal air: moving-air work, air-relative loss, and net aerodynamic change are all 0 J. ')
        : '';
      var advancedModelNote;
      if (predictionLocked) {
        advancedModelNote = 'Calculated loads, energy transfers, trajectory differences, and contact forces are hidden until this setup runs.';
      } else if (mode === 'halfpipe') {
        advancedModelNote = 'Transition loads: ' + rounded(sim.bottomNormalG, 1) + ' g at the bottom · ' +
          rounded(sim.peakNormalG, 1) + ' g peak at x = ' + rounded(sim.peakLoadX, 1) +
          ' m. Effective rotational inertia: ' + rounded(sim.effectiveInertia, 1) +
          ' kg·m² · angular momentum: ' + rounded(sim.angularMomentum, 1) + ' kg·m²/s.';
      } else if (!sim.hasLandingContact) {
        advancedModelNote = sim.hasTerrainContact
          ? gapAerodynamicNote + 'The trajectory reaches the platform face without deck support. The event is recorded, but face-impact force and post-impact motion are not modeled. Outcome: ' +
            outcomeMarkerStyle(sim).label.toLowerCase() + '.'
          : gapAerodynamicNote + 'No supported platform contact occurred, so landing absorption, stopping time, contact force, and impulse are not calculated. Outcome: ' +
            outcomeMarkerStyle(sim).label.toLowerCase() + '.';
      } else {
        advancedModelNote = gapAerodynamicNote + 'Ideal range reference: ' +
          rounded(sim.rangeIdealM * M2FT, 1) + ' ft · modeled range delta: ' +
          (sim.rangeDeltaFt >= 0 ? '+' : '') + rounded(sim.rangeDeltaFt, 1) +
          ' ft · landing absorption: ' + rounded(sim.landingCompressionM, 2) +
          ' m of rider-COM travel while the board stays on the deck · stopping time: ' +
          rounded(sim.landingStopTimeS, 3) +
          ' s · vertical kinetic energy removed: ' + Math.round(sim.landingVerticalKineticRemovedJ) +
          ' J · gravity work during compression: ' + Math.round(sim.landingGravityWorkJ) +
          ' J · support-work magnitude: ' + Math.round(sim.landingSupportWorkAbsorbedJ) +
          ' J · net vertical impulse: ' + Math.round(sim.landingNetImpulseNs) +
          ' N·s · mean contact force: ' + rounded(sim.landingAverageForceN / 1000, 2) +
          ' kN · peak contact force: ' + rounded(sim.landingPeakForceN / 1000, 2) +
          ' kN · average / peak load: ' + rounded(sim.landingImpactG, 1) + ' / ' +
          rounded(getLandingPeakG(sim), 1) + ' g · deck-plane contact travel: ' +
          rounded(sim.contactTravelM * M2FT, 1) + ' ft. Tangential braking after the contact pulse is not modeled.';
      }

      var advancedControls = h('details', { className: 'sk-advanced' },
        h('summary', null, 'Advanced physics'),
        h('div', { className: 'sk-advanced-body' },
          rangeControl('sk-rider-mass', 'Rider mass', d.riderMassKg, 35, 110, 1, ' kg', function(event) {
            upd({ riderMassKg: Number(event.target.value) });
          }, mode === 'halfpipe'
            ? 'Mass changes the joules in the ledger, while ideal height still follows speed and gravity.'
            : 'With drag enabled, a larger mass has more inertia relative to the same frontal area.'),
          mode === 'halfpipe'
            ? rangeControl('sk-ramp-depth', 'Ramp depth', d.rampDepthM, 1.2, 4.5, 0.1, ' m', function(event) {
                upd({ rampDepthM: Number(event.target.value) });
              }, 'Depth changes gravitational speed gain and the transition curvature without changing lip launch energy.')
            : rangeControl('sk-landing-compression', 'Landing absorption', d.landingCompressionM, 0.1, 0.9, 0.05, ' m', function(event) {
                upd({ landingCompressionM: Number(event.target.value) });
              }, 'More stopping distance lengthens the force pulse and lowers both average and peak contact load.'),
          h('p', { className: 'sk-model-note' }, advancedModelNote)
        )
      );

      return h('div', {
        className: 'skatelab-shell',
        'data-skatelab-overhaul': 'physics-first',
        'data-skatelab-prediction-locked': predictionLocked ? 'true' : 'false'
      },
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
                'aria-label': predictionLocked
                  ? 'Prediction challenge ready. Live motion telemetry is hidden until this setup runs.'
                  : 'Live motion telemetry: ' + currentSample.phase + ', ' +
                    rounded(currentSample.time, 2) + ' seconds, ' +
                    rounded(currentSample.speedMps * MPS2MPH, 1) + ' miles per hour, ' +
                    (mode === 'halfpipe'
                      ? rounded(currentSample.normalG, 1) + ' g normal load, ' +
                        Math.round(currentSample.trickRotation) + ' degrees of trick rotation, ' +
                        (currentSample.normalG > 0.05
                          ? rounded(currentSample.alignmentErrorDeg, 1) + ' degrees from the local surface tangent'
                          : 'airborne')
                      : (isLandingContactPhase(currentSample.phase)
                        ? 'board supported at deck height, ' +
                          rounded(currentSample.comCompressionM, 2) + ' of ' +
                          rounded(sim.landingCompressionM, 2) +
                          ' meters of rider center-of-mass compression, ' +
                          rounded(Math.abs(currentSample.comVerticalVelocityMps), 2) +
                          ' meters per second of downward center-of-mass speed remaining, ' +
                          rounded(currentSample.normalG, 1) + ' g support load, and ' +
                          Math.round(currentSample.landingNetImpulseDeliveredNs) +
                          ' newton-seconds of net vertical impulse delivered'
                        : rounded(Math.abs(currentSample.z) * M2FT, 1) +
                          ' feet lateral drift, ' +
                          (sim.airDrag
                            ? signedDelta(currentSample.aerodynamicNetWorkJ, 0, ' joules') +
                              ' net aerodynamic change from ' +
                              signedDelta(currentSample.windWorkJ, 0, ' joules') +
                              ' of moving-air work and ' +
                              Math.round(currentSample.aerodynamicDissipationJ) +
                              ' joules of air-relative dissipation'
                            : 'ideal air with zero aerodynamic energy transfer')))
              },
                h('span', { className: 'sk-phase' }, predictionLocked ? 'prediction locked' : currentSample.phase),
                h('span', null, predictionLocked ? 'Run to reveal measurements' : rounded(currentSample.time, 2) + ' s'),
                !predictionLocked && h('span', { className: 'sk-telemetry-detail' },
                  rounded(currentSample.speedMps * MPS2MPH, 1) + ' mph'),
                !predictionLocked && h('span', { className: 'sk-telemetry-detail' }, mode === 'halfpipe'
                  ? Math.round(currentSample.trickRotation) + '° trick'
                  : (isLandingContactPhase(currentSample.phase)
                    ? rounded(Math.abs(currentSample.comVerticalVelocityMps), 2) + ' m/s ↓ COM'
                    : rounded(Math.max(0, currentSample.y) * M2FT, 1) + ' ft high')),
                !predictionLocked && h('span', null, mode === 'halfpipe'
                  ? (currentSample.normalG > 0.05 ? rounded(currentSample.normalG, 1) + ' g load' : 'airborne')
                  : (isLandingContactPhase(currentSample.phase)
                    ? 'COM ↓ ' + rounded(currentSample.comCompressionM, 2) + ' m · ' +
                      rounded(currentSample.normalG, 1) + ' g'
                    : (sim.airDrag && currentSample.flightTime > 0
                      ? 'net air ' + signedDelta(currentSample.aerodynamicNetWorkJ, 0, ' J')
                      : rounded(Math.abs(currentSample.z) * M2FT, 1) + ' ft drift')))
              ),
              h('div', { className: 'sk-stage-actions' },
                running && h('button', {
                  type: 'button',
                  className: 'sk-secondary',
                  'data-skatelab-playback-toggle': 'true',
                  'aria-pressed': paused,
                  onClick: togglePlayback
                }, paused ? 'Resume motion' : 'Pause motion'),
                !running && !predictionLocked && d.lastSim && d.lastSim.mode === mode && h('button', {
                  type: 'button',
                  className: 'sk-secondary',
                  onClick: function() { animateModel(d.lastSim, false); }
                }, 'Replay')
              )
            ),
            h('p', { id: 'sk-phase-insight', className: 'sk-phase-insight' },
              h('strong', null, predictionLocked ? 'Phase evidence: ' : 'Focus now: '),
              phaseInsight
            ),
            h('div', { className: 'sk-timeline' },
              h('label', { htmlFor: 'sk-playhead' },
                h('span', null, 'Motion timeline'),
                h('output', { htmlFor: 'sk-playhead' }, Math.round(displayPlayhead * 100) + '%')
              ),
              h('div', { className: 'sk-timeline-control' },
                h('div', { className: 'sk-trace-head', 'aria-hidden': 'true' },
                  h('span', null, traceHeaderLabel),
                  h('span', null, traceHeaderDetail)
                ),
                h('svg', {
                  className: 'sk-timeline-trace is-load',
                  viewBox: '0 0 100 30',
                  preserveAspectRatio: 'none',
                  role: 'img',
                  'aria-label': traceSummary,
                  focusable: 'false'
                },
                  h('title', null, traceHeaderLabel),
                  h('desc', null, traceSummary),
                  h('line', { className: 'sk-trace-axis', x1: 1, y1: traceBottomY, x2: 99, y2: traceBottomY }),
                  !predictionLocked && h('line', { className: 'sk-trace-reference', x1: 1, y1: traceReferenceY, x2: 99, y2: traceReferenceY }),
                  !predictionLocked && h('line', { className: 'sk-trace-peak', x1: tracePeakX, y1: tracePeakY, x2: tracePeakX, y2: traceBottomY }),
                  !predictionLocked && mode === 'halfpipe' && sim.reentryModeled && h('line', {
                    className: 'sk-trace-peak sk-trace-reentry-peak',
                    x1: traceReentryPeakX,
                    y1: traceReentryPeakY,
                    x2: traceReentryPeakX,
                    y2: traceBottomY
                  }),
                  !predictionLocked && comparisonTracePath && h('path', { className: 'sk-trace-previous', d: comparisonTracePath }),
                  !predictionLocked && h('path', { className: 'sk-trace-modeled', d: tracePath }),
                  !predictionLocked && h('line', { className: 'sk-trace-cursor', x1: traceCurrentX, y1: traceTopY, x2: traceCurrentX, y2: traceBottomY }),
                  !predictionLocked && h('line', {
                    className: 'sk-trace-current',
                    x1: traceCurrentX - 0.8,
                    y1: traceCurrentY,
                    x2: traceCurrentX + 0.8,
                    y2: traceCurrentY
                  })
                ),
                h('input', {
                  id: 'sk-playhead',
                  type: 'range',
                  min: 0,
                  max: 100,
                  step: 1,
                  value: Math.round(displayPlayhead * 100),
                  disabled: running || predictionLocked,
                  'aria-describedby': 'sk-phase-times sk-phase-insight',
                  onChange: function(event) {
                    inspectPlayhead(Number(event.target.value) / 100);
                  }
                }),
                !predictionLocked && h('div', { className: 'sk-phase-markers', 'aria-hidden': 'true' },
                  phaseEvents.map(function(event) {
                    return h('span', {
                      key: event.label,
                      className: 'sk-phase-marker',
                      style: { left: clamp(event.progress, 0, 1) * 100 + '%' }
                    },
                      h('i', null),
                      h('small', null, event.label)
                    );
                  })
                ),
                !predictionLocked && h('div', {
                  className: 'sk-phase-jumps',
                  role: 'group',
                  'aria-label': 'Jump to a motion phase'
                },
                  phaseEvents.map(function(event, index) {
                    return h('button', {
                      key: 'jump-' + event.label,
                      type: 'button',
                      className: 'sk-phase-jump',
                      disabled: running,
                      'aria-current': index === activePhaseEventIndex ? 'true' : undefined,
                      'aria-label': 'Jump to ' + event.label + ' at ' +
                        rounded(event.time, 2) + ' seconds',
                      onClick: function() { inspectPlayhead(event.progress); }
                    }, event.label);
                  })
                ),
                h('span', { id: 'sk-phase-times', className: 'sk-sr-only' },
                  'Phase timing: ' + phaseTimingText + '.')
              )
            ),
            h('div', { className: 'sk-stage-legend' },
              h('b', null, viewMode === '3d' ? 'Perspective model' : 'Side elevation'),
              ' · cyan = modeled motion' + (mode === 'gap' ? ' or rider COM' : '') +
                ' · rose = gravity or transition-load peaks · green = ' +
                (mode === 'gap' ? 'board support or landing lane' : 'normal force') +
                ' · amber = ' +
                (mode === 'gap' ? 'ideal no-drag reference or F-air vector' : 'surface energy loss') +
                (comparisonSim ? ' · lavender dashed = previous run' : '')
            ),
            h('p', { id: 'sk-canvas-summary', className: 'sk-canvas-summary' },
              comparisonExplanation && h('span', { className: 'sk-comparison-insight' },
                h('strong', null, 'Cause-and-effect check: '),
                comparisonExplanation
              ),
              h('span', null, canvasSummary)
            )
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
                  h('span', null, 'Motion + force vectors')
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
                    onChange: function(event) {
                      commitPlayhead(0);
                      setLocalStatus(null);
                      upd({ estimateChallenge: event.target.checked });
                    }
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
              }, running ? (paused ? 'Paused' : 'Running…') :
                (mode === 'halfpipe' ? 'Drop In!' : 'Launch Jump')),
              h('button', {
                type: 'button',
                className: 'sk-secondary',
                disabled: running,
                onClick: function() {
                  commitPlayhead(0);
                  setLocalStatus(null);
                  upd(mode === 'halfpipe'
                    ? { pumps: 3, surfaceId: 'standard', rampDepthM: 2.4, rotationTarget: 360, spinRate: 260, bodyPositionId: 'neutral' }
                    : { speedMph: 17, angleDeg: 35, gapFt: 15, landingCompressionM: LANDING_COMPRESSION_M, windId: 'calm', airDrag: true });
                }
              }, 'Reset setup')
            ),
            h('div', {
              className: 'sk-status',
              role: 'status',
              'aria-live': 'polite',
              'aria-atomic': 'true',
              'data-result': result ? (simulationSuccessful(result) ? 'success' : 'miss') : ''
            }, statusText)
          )
        ),

        h('section', { className: 'sk-metrics', 'aria-label': 'Live model outputs' },
          metricData.map(function(metric) {
            return h('div', { className: 'sk-metric', key: metric.label },
              h('span', { className: 'sk-metric-value' }, predictionLocked ? '—' : metric.value),
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
              'aria-label': predictionLocked
                ? 'Energy ledger values are hidden until this setup runs'
                : (mode === 'halfpipe'
                  ? rounded(mechanicalPct, 0) + ' percent mechanical energy and ' +
                    rounded(thermalPct, 0) + ' percent thermal transfer'
                  : 'Gap flight energy balance: ' + Math.round(sim.energyInputJ) +
                    ' joules at launch plus ' + signedDelta(sim.windWorkJ, 0, ' joules') +
                    ' of moving-air work equals ' + Math.round(sim.flightMechanicalEnergyJ) +
                    ' joules of motion plus height and ' +
                    Math.round(sim.aerodynamicDissipationJ) +
                    ' joules of air-relative dissipation, with a numerical residual of ' +
                    rounded(sim.energyClosureResidualJ, 6) + ' joules')
            },
              h('div', { className: 'sk-ledger-mechanical', style: { width: (predictionLocked ? 0 : mechanicalPct) + '%' } }),
              h('div', { className: 'sk-ledger-thermal', style: { width: (predictionLocked ? 0 : thermalPct) + '%' } }),
              mode === 'gap' && h('div', {
                className: 'sk-ledger-wind',
                style: { width: (predictionLocked ? 0 : windEnergyOutPct) + '%' }
              })
            ),
            h('div', { className: 'sk-ledger-labels' },
              mode === 'halfpipe'
                ? [
                    h('span', { key: 'mechanical' }, predictionLocked ? '— mechanical' : Math.round(sim.mechanicalJ) + ' J mechanical'),
                    h('span', { key: 'thermal' }, predictionLocked ? '— thermal' : Math.round(sim.thermalJ) + ' J thermal'),
                    h('span', { key: 'input' }, predictionLocked ? '— input' : Math.round(sim.energyInputJ) + ' J input')
                  ]
                : [
                    h('span', { key: 'launch' }, predictionLocked ? '— launch' : Math.round(sim.energyInputJ) + ' J launch'),
                    h('span', { key: 'wind' }, predictionLocked ? '— wind work' : signedDelta(sim.windWorkJ, 0, ' J') + ' moving-air work'),
                    h('span', { key: 'air-loss' }, predictionLocked ? '— air-relative loss' : Math.round(sim.aerodynamicDissipationJ) + ' J air-relative loss'),
                    h('span', { key: 'flight-mechanical' }, predictionLocked ? '— motion + height' : Math.round(sim.flightMechanicalEnergyJ) + ' J signed motion + height')
                  ]
            ),
            h('code', { className: 'sk-equation' }, equation)
          ),
          h('section', { className: 'sk-panel', 'aria-labelledby': 'sk-question-title' },
            h('h3', { id: 'sk-question-title' }, 'What should you test next?'),
            h('p', { className: 'sk-question' }, mode === 'halfpipe'
              ? 'Hold pump energy and takeoff spin constant while comparing body positions. Then hold the launch setup constant and vary ramp depth. Which input changes rotation, hang time, or transition load, and do the drop-in and re-entry peaks match?'
              : 'Compare the cyan modeled path with the amber ideal path, then add a crosswind. Finally, hold the trajectory setup constant and change landing absorption. Which input changes range, load, or lateral drift?'),
            h('p', { className: 'sk-question' },
              predictionLocked
                ? 'Commit your estimate, run the model, and then explain which force or setup variable caused the revealed result.'
                : [
                    h('strong', { key: 'lead' }, simulationSuccessful(sim)
                      ? 'Current model meets the target. '
                      : (sim.landed ? 'Current model makes physical contact but misses the target. ' : 'Current model misses supported contact. ')),
                    mode === 'halfpipe'
                      ? 'Trick error is ' + rounded(sim.rotationError, 0) + '°, contact alignment error is ' +
                        rounded(sim.contactAlignmentErrorDeg, 0) + '°, and effective inertia is ' +
                        rounded(sim.effectiveInertia, 1) + ' kg·m².'
                      : (sim.hasLandingContact
                        ? 'The landing zone is ' + rounded(sim.landingZoneM * M2FT, 1) +
                          ' ft long; modeled drift is ' + rounded(Math.abs(sim.crossDriftFt), 1) +
                          ' ft; estimated landing load is ' + rounded(sim.landingImpactG, 1) +
                          ' g average and ' + rounded(getLandingPeakG(sim), 1) + ' g peak.'
                        : 'The trajectory reaches ' + rounded(sim.rangeFt, 1) +
                          ' ft at deck height, then continues without a supported landing contact.')
                  ]
            )
          )
        ),

        h('details', { className: 'sk-panel sk-details', 'data-skatelab-inquiry-panel': 'true' },
          h('summary', null, 'Physics inquiry and experiment log'),
          h('div', { className: 'sk-notes' },
            h('label', { htmlFor: 'sk-hypothesis' }, mode === 'halfpipe'
              ? 'Your hypothesis: will ramp depth change air height, transition load, or both? Will the ideal drop-in and re-entry repeat the same peak load? How will tucking change rotation?'
              : 'Your hypothesis: which forces change range or landing position, and how will absorption distance change landing load and stopping time?'),
            h('textarea', {
              id: 'sk-hypothesis',
              rows: 3,
              value: d.hypothesis,
              'aria-label': __alloT('stem.skatelab.hypothesis_input', 'Skate physics investigation hypothesis'),
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
                          h('td', {
                            className: (typeof entry.runSuccessful === 'boolean' ? entry.runSuccessful : entry.landed)
                              ? 'sk-result-good'
                              : 'sk-result-miss'
                          }, typeof entry.runSuccessful === 'boolean'
                            ? (entry.runSuccessful
                              ? 'Target met'
                              : (entry.outcome ? String(entry.outcome).replace(/-/g, ' ') : 'Missed'))
                            : (entry.landed ? 'Landed' : 'Missed'))
                        );
                      })
                    )
                  )
                )
          )
        ),

        h('p', { className: 'sk-footer-note' },
          'This is a simplified educational model: rigid surfaces, constant gravity, a point-mass rider, optional quadratic drag without aerodynamic lift, and an impulse-matched half-sine landing-force pulse estimated from the selected absorption distance (currently ' +
          rounded(d.landingCompressionM, 2) + ' m in gap mode). Real skating needs supervision, protective gear, and a properly maintained park.'
        )
      );
    }
  });
})();
