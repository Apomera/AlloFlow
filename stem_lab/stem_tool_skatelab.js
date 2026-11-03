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

  // Rolling resistance acts as a friction force F = mu * N along the path, so
  // the heat it makes depends on distance travelled and on the normal force.
  var SURFACES = {
    wax: { id: 'wax', label: 'Waxed', rollingMu: 0.005 },
    standard: { id: 'standard', label: 'Concrete', rollingMu: 0.012 },
    rough: { id: 'rough', label: 'Rough', rollingMu: 0.03 }
  };

  var HALFPIPE_HALF_WIDTH_M = 4;
  var HALFPIPE_MIN_DROP_M = 0.3;
  var HALFPIPE_REST_HEIGHT_M = 0.001;
  // RK4 step at Earth gravity. It is scaled by sqrt(G / g) so every gravity
  // takes the same number of steps per swing and heights match exactly.
  var HALFPIPE_DT_S = 1 / 120;
  var HALFPIPE_MAX_TIME_S = 300;
  var HALFPIPE_NODE_STRIDE = 2;
  // Centre-of-mass rise during one leg extension (a pump stroke).
  var PUMP_STROKE_M = 0.3;
  var FLAT_PUSH_TIME_S = 0.5;
  var FORCE_ARROW_MAX_PX = 84;
  var PLAYBACK_SPEEDS = [0.25, 0.5, 1, 4, 10];

  // Where the rider stands up (extends) on each pass, as a fraction of wall height.
  var PUMP_TIMINGS = {
    bottom: { id: 'bottom', heightFraction: 0 },
    wall: { id: 'wall', heightFraction: 0.7 },
    lip: { id: 'lip', heightFraction: 0.9 }
  };

  // Module-level translator so the pure model text helpers can use ctx.t.
  // ctx.t takes one argument and returns undefined for a missing key, so the
  // fallback is applied here.
  var skatelabTranslate = null;
  var __alloT = function(key, fallback) {
    var value;
    try {
      value = typeof skatelabTranslate === 'function' ? skatelabTranslate(key, fallback) : null;
    } catch (err) {
      value = null;
    }
    return (value == null || value === '' || value === key) ? fallback : value;
  };

  function fillTemplate(template, values) {
    return String(template).replace(/\{(\w+)\}/g, function(match, name) {
      return values && values[name] != null ? String(values[name]) : match;
    });
  }

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
  function getPumpTiming(id) { return PUMP_TIMINGS[id] || PUMP_TIMINGS.bottom; }
  function pumpTimingLabel(id) {
    if (id === 'wall') return __alloT('stem.skatelab.pump_timing_wall', 'High on the wall');
    if (id === 'lip') return __alloT('stem.skatelab.pump_timing_lip', 'Near the lip');
    return __alloT('stem.skatelab.pump_timing_bottom', 'At the bottom');
  }
  // Phase ids double as English labels; this gives each one a translation key.
  function phaseLabel(phase) {
    switch (phase) {
      case 'dropping in': return __alloT('stem.skatelab.phase_dropping_in', 'dropping in');
      case 'compressing at the bottom': return __alloT('stem.skatelab.phase_compressing_bottom', 'compressing at the bottom');
      case 'driving up the wall': return __alloT('stem.skatelab.phase_driving_up', 'driving up the wall');
      case 'rolling back down': return __alloT('stem.skatelab.phase_rolling_back', 'rolling back down');
      case 'rocked to a stop': return __alloT('stem.skatelab.phase_rocked_stop', 'rocked to a stop');
      case 'model time limit reached': return __alloT('stem.skatelab.phase_time_limit', 'model time limit reached');
      case 'rising': return __alloT('stem.skatelab.phase_rising', 'rising');
      case 'at the apex': return __alloT('stem.skatelab.phase_apex', 'at the apex');
      case 'falling': return __alloT('stem.skatelab.phase_falling', 'falling');
      case 'approaching contact': return __alloT('stem.skatelab.phase_approaching_contact', 'approaching contact');
      case 'unsafe contact — simulation stopped': return __alloT('stem.skatelab.phase_unsafe_contact', 'unsafe contact — simulation stopped');
      case 're-entering the wall': return __alloT('stem.skatelab.phase_reentering', 're-entering the wall');
      case 'driving down the return wall': return __alloT('stem.skatelab.phase_return_wall', 'driving down the return wall');
      case 'compressing on the return': return __alloT('stem.skatelab.phase_compressing_return', 'compressing on the return');
      case 'approaching the ramp': return __alloT('stem.skatelab.phase_approaching_ramp', 'approaching the ramp');
      case 'platform contact': return __alloT('stem.skatelab.phase_platform_contact', 'platform contact');
      case 'absorbing the landing': return __alloT('stem.skatelab.phase_absorbing', 'absorbing the landing');
      case 'contact pulse complete': return __alloT('stem.skatelab.phase_pulse_complete', 'contact pulse complete');
      case 'hit the platform face': return __alloT('stem.skatelab.phase_platform_face', 'hit the platform face');
      case 'model limit reached': return __alloT('stem.skatelab.phase_model_limit', 'model limit reached');
      case 'fell short of the platform': return __alloT('stem.skatelab.phase_fell_short', 'fell short of the platform');
      case 'fell outside the platform': return __alloT('stem.skatelab.phase_fell_outside', 'fell outside the platform');
      case 'pushing off': return __alloT('stem.skatelab.phase_pushing_off', 'pushing off');
      case 'coasting': return __alloT('stem.skatelab.phase_coasting', 'coasting');
      case 'stopped': return __alloT('stem.skatelab.phase_stopped', 'stopped');
      case 'not moving': return __alloT('stem.skatelab.phase_not_moving', 'not moving');
      default: return String(phase || '');
    }
  }

  // Timeline event names (phase jump buttons and markers).
  function phaseEventName(id) {
    switch (id) {
      case 'start': return __alloT('stem.skatelab.event_start', 'start');
      case 'bottom': return __alloT('stem.skatelab.event_bottom', 'bottom');
      case 'lip': return __alloT('stem.skatelab.event_lip', 'lip');
      case 'apex': return __alloT('stem.skatelab.event_apex', 'apex');
      case 're-entry': return __alloT('stem.skatelab.event_reentry', 're-entry');
      case 'contact': return __alloT('stem.skatelab.event_contact', 'contact');
      case 'return': return __alloT('stem.skatelab.event_return', 'return');
      case 'stop': return __alloT('stem.skatelab.event_stop', 'stop');
      case 'ramp': return __alloT('stem.skatelab.event_ramp', 'ramp');
      case 'miss': return __alloT('stem.skatelab.event_miss', 'miss');
      case 'pulse end': return __alloT('stem.skatelab.event_pulse_end', 'pulse end');
      default: return String(id || '');
    }
  }

  function landingStanceLabel(stance) {
    return stance === 'forward'
      ? __alloT('stem.skatelab.stance_forward', 'lands riding forward (nose first)')
      : __alloT('stem.skatelab.stance_fakie', 'lands fakie (riding backwards, tail first)');
  }
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


  function transitionCanvasRotation(point) {
    var tangentX = finite(point && point.tx, finite(point && point.vx, 1));
    var tangentY = finite(point && point.ty, finite(point && point.vy, 0));
    return -Math.atan2(tangentY, tangentX) * 180 / Math.PI;
  }

  function smoothStep01(value) {
    var amount = clamp(finite(value, 0), 0, 1);
    return amount * amount * (3 - 2 * amount);
  }

  // The transition is half an ellipse: x = a sin(theta), y = d (1 - cos(theta)),
  // theta from -pi/2 (left lip) to +pi/2 (right lip). The tangent (tx, ty)
  // points toward increasing theta; the normal (nx, ny) points away from the
  // surface, toward the rider.
  function halfpipeTrackPoint(theta, depth) {
    var a = HALFPIPE_HALF_WIDTH_M;
    var sinTheta = Math.sin(theta);
    var cosTheta = Math.cos(theta);
    var dxDTheta = a * cosTheta;
    var dyDTheta = depth * sinTheta;
    var jacobian = Math.max(0.000001, Math.sqrt(dxDTheta * dxDTheta + dyDTheta * dyDTheta));
    return {
      x: a * sinTheta,
      y: depth * (1 - cosTheta),
      jacobian: jacobian,
      tx: dxDTheta / jacobian,
      ty: dyDTheta / jacobian,
      nx: -dyDTheta / jacobian,
      ny: dxDTheta / jacobian,
      curvature: a * depth / (jacobian * jacobian * jacobian)
    };
  }

  // A half-turn spin lands with the board back along the wall, so any multiple
  // of 180 degrees is a safe contact angle.
  function halfTurnAlignmentError(spinDeg) {
    var remainder = Math.abs(finite(spinDeg, 0)) % 180;
    return Math.min(remainder, 180 - remainder);
  }

  // Integrates the rider along the transition from rest with RK4.
  // m dv/dt = -m g t_y - sign(v) mu N,  N = m (g n_y + v^2 kappa).
  // Heat is integrated as its own state (dQ/dt = mu N |v|), so the energy
  // residual KE + PE + Q - (PE0 + W) is a genuine check on the integrator.
  // Events (turning points, bottom crossings, pump triggers, lip take-off)
  // are located by bisection so friction never switches sign inside a step.
  function integrateHalfpipeRun(config) {
    var gravity = config.gravity;
    var depth = config.depth;
    var mass = config.mass;
    var mu = config.mu;
    var timeScale = Math.sqrt(G / gravity);
    var dt = HALFPIPE_DT_S * timeScale * config.stepScale;
    var maxTime = HALFPIPE_MAX_TIME_S * timeScale;
    var lipTheta = Math.PI / 2;
    var triggerY = config.pumpHeightFraction * depth;

    function derivative(theta, v, sigma) {
      var point = halfpipeTrackPoint(theta, depth);
      var normalPerMass = Math.max(0, gravity * point.ny + v * v * point.curvature);
      return {
        theta: v / point.jacobian,
        v: -gravity * point.ty - sigma * mu * normalPerMass,
        q: mass * mu * normalPerMass * Math.abs(v)
      };
    }

    function rk4(state, h, sigma) {
      var k1 = derivative(state.theta, state.v, sigma);
      var k2 = derivative(state.theta + 0.5 * h * k1.theta, state.v + 0.5 * h * k1.v, sigma);
      var k3 = derivative(state.theta + 0.5 * h * k2.theta, state.v + 0.5 * h * k2.v, sigma);
      var k4 = derivative(state.theta + h * k3.theta, state.v + h * k3.v, sigma);
      return {
        t: state.t + h,
        theta: state.theta + h / 6 * (k1.theta + 2 * k2.theta + 2 * k3.theta + k4.theta),
        v: state.v + h / 6 * (k1.v + 2 * k2.v + 2 * k3.v + k4.v),
        q: state.q + h / 6 * (k1.q + 2 * k2.q + 2 * k3.q + k4.q),
        w: state.w
      };
    }

    // Each event function is positive before the event and <= 0 at it.
    function eventValue(name, state, sigma) {
      if (name === 'turn') return sigma * state.v;
      if (name === 'lip') return lipTheta - sigma * state.theta;
      if (name === 'bottom') return -sigma * state.theta;
      return triggerY - depth * (1 - Math.cos(state.theta));
    }

    function locate(name, state, h, sigma) {
      var low = 0;
      var high = h;
      for (var iteration = 0; iteration < 56; iteration++) {
        var middle = 0.5 * (low + high);
        if (eventValue(name, rk4(state, middle, sigma), sigma) > 0) low = middle;
        else high = middle;
      }
      return high;
    }

    var startY = clamp(config.dropHeight, 0, depth);
    var state = {
      t: 0,
      theta: -Math.acos(clamp(1 - startY / depth, -1, 1)),
      v: 0,
      q: 0,
      w: 0
    };
    var sigma = 1;
    var nodes = [];
    var airs = [];
    var pumpEvents = [];
    var turns = [];
    var bottoms = [];
    var pumpsUsed = 0;
    var pumpArmed = false;
    var extended = false;
    var pendingCrouchJ = 0;
    var trickAir = null;
    var afterTrick = false;
    var endReason = '';
    var stepIndex = 0;

    function pushNode(current) {
      if (config.summaryOnly) return;
      var point = halfpipeTrackPoint(current.theta, depth);
      nodes.push({
        t: current.t,
        theta: current.theta,
        v: current.v,
        q: current.q,
        w: current.w,
        n: Math.max(0, gravity * point.ny + current.v * current.v * point.curvature),
        // Energies are stored per node and interpolated as energies, so the
        // live display adds up to the ledger total at every frame.
        ke: 0.5 * mass * current.v * current.v,
        pe: mass * gravity * point.y
      });
    }

    // A pump stroke: the rider extends against the support force N, doing
    // work W = N * stroke. A quick extension turns that work into speed.
    function firePump() {
      var point = halfpipeTrackPoint(state.theta, depth);
      var normalPerMass = Math.max(0, gravity * point.ny + state.v * state.v * point.curvature);
      var workJ = mass * normalPerMass * PUMP_STROKE_M;
      var direction = state.v === 0 ? sigma : (state.v > 0 ? 1 : -1);
      state.v = direction * Math.sqrt(state.v * state.v + 2 * workJ / mass);
      state.w += workJ;
      pushNode(state);
      pumpEvents.push({
        t: state.t,
        kind: 'extend',
        x: point.x,
        y: point.y,
        normalG: normalPerMass / gravity,
        normalForceN: mass * normalPerMass,
        workJ: workJ
      });
      pumpArmed = false;
      extended = true;
    }

    var startPoint = halfpipeTrackPoint(state.theta, depth);
    pushNode(state);
    if (Math.abs(startPoint.ty) <= mu * startPoint.ny) endReason = 'stopped';

    while (!endReason && state.t < maxTime) {
      var trial = rk4(state, dt, sigma);
      var candidates = [];
      if (sigma * state.v > 0 && sigma * trial.v <= 0) candidates.push('turn');
      if (sigma * trial.theta >= lipTheta) candidates.push('lip');
      if (sigma * state.theta < 0 && sigma * trial.theta >= 0) candidates.push('bottom');
      if (pumpArmed && triggerY > 0 && sigma * state.theta >= 0 &&
          eventValue('trigger', state, sigma) > 0 && eventValue('trigger', trial, sigma) <= 0) {
        candidates.push('trigger');
      }

      if (!candidates.length) {
        state = trial;
        stepIndex += 1;
        // The re-crouch at the top of a pass costs N * stroke. At a turning
        // point the rider is at rest, so that small cost is taken from the
        // first kinetic energy of the descent.
        if (pendingCrouchJ > 0 && 0.5 * mass * state.v * state.v > pendingCrouchJ) {
          pushNode(state);
          state.v = (state.v > 0 ? 1 : -1) * Math.sqrt(state.v * state.v - 2 * pendingCrouchJ / mass);
          state.w -= pendingCrouchJ;
          pumpEvents.push({ t: state.t, kind: 'crouch', workJ: -pendingCrouchJ });
          pendingCrouchJ = 0;
          pushNode(state);
        } else if (stepIndex % HALFPIPE_NODE_STRIDE === 0) {
          pushNode(state);
        }
        continue;
      }

      var eventName = candidates[0];
      var eventStep = locate(eventName, state, dt, sigma);
      for (var candidateIndex = 1; candidateIndex < candidates.length; candidateIndex++) {
        var candidateStep = locate(candidates[candidateIndex], state, dt, sigma);
        if (candidateStep < eventStep) {
          eventStep = candidateStep;
          eventName = candidates[candidateIndex];
        }
      }
      state = rk4(state, eventStep, sigma);
      stepIndex += 1;

      if (eventName === 'turn') {
        state.v = 0;
        pushNode(state);
        var turnPoint = halfpipeTrackPoint(state.theta, depth);
        turns.push({ t: state.t, x: turnPoint.x, y: turnPoint.y, side: state.theta >= 0 ? 1 : -1 });
        if (pumpArmed) {
          pumpEvents.push({ t: state.t, kind: 'missed', x: turnPoint.x, y: turnPoint.y, workJ: 0 });
          pumpArmed = false;
        }
        if (extended) {
          pendingCrouchJ = mass * gravity * turnPoint.ny * PUMP_STROKE_M;
          extended = false;
        }
        if (Math.abs(turnPoint.ty) <= mu * turnPoint.ny || turnPoint.y < HALFPIPE_REST_HEIGHT_M) {
          endReason = 'stopped';
          break;
        }
        sigma = -sigma;
      } else if (eventName === 'bottom') {
        state.theta = 0;
        pushNode(state);
        bottoms.push({ t: state.t, v: state.v });
        if (afterTrick) {
          endReason = 'returned';
          break;
        }
        if (pumpsUsed < config.pumps) {
          pumpsUsed += 1;
          pumpArmed = true;
          if (triggerY <= 0) firePump();
        }
      } else if (eventName === 'trigger') {
        pushNode(state);
        firePump();
      } else {
        state.theta = sigma * lipTheta;
        pushNode(state);
        if (pumpArmed) {
          pumpEvents.push({ t: state.t, kind: 'missed', x: sigma * HALFPIPE_HALF_WIDTH_M, y: depth, workJ: 0 });
          pumpArmed = false;
        }
        if (extended) {
          // Re-crouching in the air needs no support force, so it costs nothing.
          pumpEvents.push({ t: state.t, kind: 'crouch', workJ: 0, inAir: true });
          extended = false;
        }
        var takeoffSpeed = Math.abs(state.v);
        var flightTime = 2 * takeoffSpeed / gravity;
        var isTrick = !trickAir && pumpsUsed >= config.pumps;
        var air = {
          index: airs.length,
          takeoffT: state.t,
          landT: state.t + flightTime,
          side: sigma,
          speedMps: takeoffSpeed,
          heightM: takeoffSpeed * takeoffSpeed / (2 * gravity),
          trick: isTrick,
          spinDeg: isTrick ? config.airSpinRate * flightTime : 0,
          q: state.q,
          w: state.w
        };
        airs.push(air);
        if (isTrick) {
          trickAir = air;
          if (halfTurnAlignmentError(air.spinDeg) > config.contactToleranceDeg) {
            endReason = 'unsafe';
            state = { t: air.landT, theta: state.theta, v: -sigma * takeoffSpeed, q: state.q, w: state.w };
            break;
          }
          afterTrick = true;
        }
        state = { t: air.landT, theta: sigma * lipTheta, v: -sigma * takeoffSpeed, q: state.q, w: state.w };
        sigma = -sigma;
        pushNode(state);
      }
    }
    if (!endReason) endReason = 'time-limit';
    return {
      nodes: nodes,
      airs: airs,
      pumpEvents: pumpEvents,
      turns: turns,
      bottoms: bottoms,
      trickAir: trickAir,
      endReason: endReason,
      finalState: state,
      dt: dt,
      pumpsUsed: pumpsUsed
    };
  }

  function halfpipeRunSummary(run, depth) {
    return {
      trickAirHeightM: run.trickAir ? run.trickAir.heightM : 0,
      endTimeS: run.finalState.t,
      thermalJ: run.finalState.q,
      riderWorkJ: run.finalState.w,
      firstTurnHeightM: run.turns.length ? run.turns[0].y : depth
    };
  }

  function simHalfpipe(opts) {
    opts = opts || {};
    var gravity = clamp(finite(opts.gravity, G), 0.5, 25);
    var pumps = Math.round(clamp(finite(opts.pumps, 3), 0, 6));
    var riderMassKg = clamp(finite(opts.riderMassKg, RIDER_KG), 35, 110);
    var vehicle = getVehicle(opts.vehicle);
    var surface = getSurface(opts.surfaceId);
    var bodyPosition = getBodyPosition(opts.bodyPositionId);
    var pumpTiming = getPumpTiming(opts.pumpTimingId);
    var legacy = getLegacyTrick(opts.trickId);
    var target = clamp(finite(opts.rotationTarget, legacy.rotation), 0, 1080);
    var spinRate = clamp(finite(opts.spinRate, legacy.spinRate), 0, 900);
    var mass = riderMassKg + vehicle.mass;
    var rampDepthM = clamp(finite(opts.rampDepthM, 2.4), 1.2, 4.5);
    var dropHeightM = clamp(finite(opts.dropHeightM, rampDepthM), HALFPIPE_MIN_DROP_M, rampDepthM);
    // solverStepScale exists for accuracy checks and convergence tests only.
    var stepScale = clamp(finite(opts.solverStepScale, 1), 0.05, 4);
    var mu = surface.rollingMu;

    // In flight, angular momentum is conserved. Pulling into a tuck reduces
    // effective rotational inertia, so angular speed rises by the inverse ratio.
    var airSpinRate = spinRate * vehicle.rotationScale * bodyPosition.spinMultiplier;
    var trickToleranceDeg = target === 0 ? 30 : Math.max(35, target * 0.08);
    var contactAlignmentToleranceDeg = 35;
    var runConfig = {
      gravity: gravity,
      depth: rampDepthM,
      mass: mass,
      mu: mu,
      dropHeight: dropHeightM,
      pumps: pumps,
      pumpHeightFraction: pumpTiming.heightFraction,
      airSpinRate: airSpinRate,
      contactToleranceDeg: contactAlignmentToleranceDeg,
      stepScale: stepScale,
      summaryOnly: false
    };
    var run = integrateHalfpipeRun(runConfig);
    var nodes = run.nodes;
    var trick = run.trickAir;
    var hasAir = !!trick;
    var exitSpeed = hasAir ? trick.speedMps : 0;
    var airTime = hasAir ? trick.landT - trick.takeoffT : 0;
    var hAir = hasAir ? trick.heightM : 0;
    var completed = hasAir ? trick.spinDeg : 0;
    var rotationError = Math.abs(completed - target);
    var trickGoalMet = hasAir && hAir >= 0.15 && rotationError <= trickToleranceDeg;
    var contactAlignmentErrorDeg = hasAir ? halfTurnAlignmentError(completed) : 0;
    var contactSafe = run.endReason !== 'unsafe';
    var landingHalfTurns = hasAir ? Math.round(completed / 180) : 0;
    var landingStance = hasAir ? (landingHalfTurns % 2 === 0 ? 'fakie' : 'forward') : null;
    var runSuccessful = hasAir && trickGoalMet && contactSafe;
    var outcome = !hasAir
      ? 'no-air'
      : (!contactSafe ? 'unsafe-contact' : (trickGoalMet ? 'landed' : 'trick-missed'));
    var motionDuration = Math.max(0.001, run.finalState.t);
    var effectiveInertia = mass * vehicle.spinRadiusM * vehicle.spinRadiusM * bodyPosition.inertiaRatio;
    var angularMomentum = effectiveInertia * (airSpinRate * Math.PI / 180);

    var firstBottom = run.bottoms.length ? run.bottoms[0] : null;
    var firstBottomNode = null;
    var peakNode = nodes[0];
    var reentryPeakNode = null;
    var trickLandTime = hasAir ? trick.landT : Infinity;
    nodes.forEach(function(node) {
      if (!firstBottomNode && firstBottom && node.t >= firstBottom.t - 1e-12 && Math.abs(node.theta) < 1e-9) {
        firstBottomNode = node;
      }
      if (node.n > peakNode.n) peakNode = node;
      if (node.t >= trickLandTime - 1e-12 && (!reentryPeakNode || node.n > reentryPeakNode.n)) {
        reentryPeakNode = node;
      }
    });
    if (!firstBottomNode) firstBottomNode = nodes[nodes.length - 1];
    var peakPoint = halfpipeTrackPoint(peakNode.theta, rampDepthM);
    var reentryPoint = reentryPeakNode ? halfpipeTrackPoint(reentryPeakNode.theta, rampDepthM) : null;

    var finalState = run.finalState;
    var finalKineticJ;
    var finalPotentialJ;
    if (run.endReason === 'unsafe') {
      finalKineticJ = 0.5 * mass * exitSpeed * exitSpeed;
      finalPotentialJ = mass * gravity * rampDepthM;
    } else {
      var finalPoint = halfpipeTrackPoint(finalState.theta, rampDepthM);
      finalKineticJ = 0.5 * mass * finalState.v * finalState.v;
      finalPotentialJ = mass * gravity * finalPoint.y;
    }
    var startPotentialJ = mass * gravity * dropHeightM;
    var riderWorkJ = finalState.w;
    var thermalJ = finalState.q;
    var energyInputJ = startPotentialJ + riderWorkJ;
    var mechanicalJ = finalKineticJ + finalPotentialJ;
    var energyClosureResidualJ = mechanicalJ + thermalJ - energyInputJ;
    var pumpExtensionWorkJ = 0;
    run.pumpEvents.forEach(function(event) {
      if (event.kind === 'extend') pumpExtensionWorkJ += event.workJ;
    });

    var passPeaks = run.turns.map(function(turn) {
      return { t: turn.t, heightM: turn.y, side: turn.side, air: false };
    }).concat(run.airs.map(function(airEvent) {
      return {
        t: 0.5 * (airEvent.takeoffT + airEvent.landT),
        heightM: rampDepthM + airEvent.heightM,
        side: airEvent.side,
        air: true,
        trick: airEvent.trick
      };
    })).sort(function(a, b) { return a.t - b.t; });

    // Accuracy check: repeat the run with half the time step and report how
    // much the key results move. This is a real convergence check, not an
    // identity of the integrator.
    var numericalCheck = null;
    if (!opts._skipNumericalCheck) {
      var halfRun = integrateHalfpipeRun(Object.assign({}, runConfig, {
        stepScale: stepScale * 0.5,
        summaryOnly: true
      }));
      var fullSummary = halfpipeRunSummary(run, rampDepthM);
      var halfSummary = halfpipeRunSummary(halfRun, rampDepthM);
      numericalCheck = {
        stepS: run.dt,
        halfStepS: halfRun.dt,
        sameOutcome: halfRun.endReason === run.endReason && !!halfRun.trickAir === hasAir,
        airHeightDeltaM: Math.abs(fullSummary.trickAirHeightM - halfSummary.trickAirHeightM),
        firstTurnHeightDeltaM: Math.abs(fullSummary.firstTurnHeightM - halfSummary.firstTurnHeightM),
        durationDeltaS: Math.abs(fullSummary.endTimeS - halfSummary.endTimeS),
        thermalDeltaJ: Math.abs(fullSummary.thermalJ - halfSummary.thermalJ)
      };
    }

    var inputs = {
      pumps: pumps,
      pumpTimingId: pumpTiming.id,
      dropHeightM: dropHeightM,
      rampDepthM: rampDepthM,
      gravity: gravity,
      riderMassKg: riderMassKg,
      vehicle: vehicle.id,
      surfaceId: surface.id,
      bodyPositionId: bodyPosition.id,
      rotationTarget: target,
      spinRate: spinRate
    };

    return {
      mode: 'halfpipe',
      inputs: inputs,
      pumps: pumps,
      pumpTiming: pumpTiming,
      pumpsUsed: run.pumpsUsed,
      riderMassKg: riderMassKg,
      vehicle: vehicle,
      bodyPosition: bodyPosition,
      surface: surface,
      rollingMu: mu,
      gravity: gravity,
      massKg: mass,
      weightN: mass * gravity,
      rampDepthM: rampDepthM,
      dropHeightM: dropHeightM,
      pumpStrokeM: PUMP_STROKE_M,
      solverStepS: run.dt,
      endReason: run.endReason,
      nodes: nodes,
      airs: run.airs,
      pumpEvents: run.pumpEvents,
      turns: run.turns,
      passPeaks: passPeaks,
      hasAir: hasAir,
      trickAir: trick,
      trickSide: hasAir ? trick.side : 1,
      exitSpeed: exitSpeed,
      vMps: exitSpeed,
      vMph: exitSpeed * MPS2MPH,
      hAir: hAir,
      hFt: hAir * M2FT,
      airTime: airTime,
      rollTime: hasAir ? trick.takeoffT : motionDuration,
      bottomTime: firstBottom ? firstBottom.t : motionDuration,
      firstTurnTime: run.turns.length ? run.turns[0].t : motionDuration,
      airLandingTime: hasAir ? trick.landT : motionDuration,
      reentryDuration: hasAir && contactSafe ? Math.max(0, motionDuration - trick.landT) : 0,
      motionDuration: motionDuration,
      bottomSpeed: Math.abs(firstBottomNode.v),
      bottomNormalG: firstBottomNode.n / gravity,
      peakNormalG: peakNode.n / gravity,
      peakLoadTime: peakNode.t,
      peakLoadX: peakPoint.x,
      peakLoadY: peakPoint.y,
      reentryPeakNormalG: reentryPeakNode && contactSafe ? reentryPeakNode.n / gravity : 0,
      reentryPeakTime: reentryPeakNode && contactSafe ? reentryPeakNode.t : (hasAir ? trick.landT : motionDuration),
      reentryPeakX: reentryPoint ? reentryPoint.x : 0,
      reentryPeakY: reentryPoint ? reentryPoint.y : 0,
      forceScaleMaxN: Math.max(mass * gravity, mass * peakNode.n),
      rotationTarget: target,
      spinRate: spinRate,
      airSpinRate: airSpinRate,
      takeoffRotationDeg: hasAir && trick.side < 0 ? 90 : -90,
      landingRotationDeg: hasAir && trick.side < 0 ? 90 : -90,
      landingSpinDeg: completed,
      landingHalfTurns: landingHalfTurns,
      landingStance: landingStance,
      reentryAlignmentDuration: hasAir && contactSafe
        ? Math.min(0.22, Math.max(0.000001, (motionDuration - trick.landT) * 0.35))
        : 0,
      completed: completed,
      rotation: target,
      rotationError: rotationError,
      trickToleranceDeg: trickToleranceDeg,
      trickGoalMet: trickGoalMet,
      contactAlignmentToleranceDeg: contactAlignmentToleranceDeg,
      contactAlignmentErrorDeg: contactAlignmentErrorDeg,
      contactSafe: contactSafe,
      reentryModeled: hasAir && contactSafe,
      runSuccessful: runSuccessful,
      outcome: outcome,
      effectiveInertia: effectiveInertia,
      angularMomentum: angularMomentum,
      landed: hasAir && contactSafe,
      startPotentialJ: startPotentialJ,
      pumpWorkJ: riderWorkJ,
      pumpExtensionWorkJ: pumpExtensionWorkJ,
      riderWorkJ: riderWorkJ,
      energyInputJ: energyInputJ,
      finalKineticJ: finalKineticJ,
      finalPotentialJ: finalPotentialJ,
      mechanicalJ: mechanicalJ,
      thermalJ: thermalJ,
      energyClosureResidualJ: energyClosureResidualJ,
      numericalCheck: numericalCheck
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
    // Only the half-step accuracy check passes a smaller scale.
    dt *= clamp(finite(opts.solverStepScale, 1), 0.05, 1);
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
    // Accuracy check: rerun with half the time step. energyClosureResidualJ
    // below is an identity of the integrator, so it cannot show step error.
    var numericalCheck = null;
    if (!opts._skipNumericalCheck) {
      var halfStep = simGapJump(Object.assign({}, opts, {
        solverStepScale: clamp(finite(opts.solverStepScale, 1), 0.05, 1) * 0.5,
        _skipNumericalCheck: true
      }));
      numericalCheck = {
        stepS: dt,
        halfStepS: dt * 0.5,
        sameOutcome: halfStep.outcome === outcome,
        rangeDeltaM: Math.abs(rangeM - halfStep.rangeM),
        peakDeltaM: Math.abs(peakM - halfStep.peakM),
        airTimeDeltaS: Math.abs(airTime - halfStep.airTime)
      };
    }
    var peakRelativeAirSpeed = 0;
    path.forEach(function(point) {
      var relX = point.vx - wind.xMps;
      var relZ = point.vz - wind.zMps;
      peakRelativeAirSpeed = Math.max(peakRelativeAirSpeed,
        Math.sqrt(relX * relX + point.vy * point.vy + relZ * relZ));
    });
    var peakAirForceN = airDrag
      ? 0.5 * AIR_DENSITY * vehicle.dragArea * peakRelativeAirSpeed * peakRelativeAirSpeed
      : 0;

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
      inputs: {
        speedMph: speedMph,
        angleDeg: angleDeg,
        gapFt: gapFt,
        gravity: gravity,
        riderMassKg: riderMassKg,
        landingCompressionM: landingCompressionM,
        airDrag: airDrag,
        vehicle: vehicle.id,
        windId: wind.id
      },
      weightN: mass * gravity,
      peakAirForceN: peakAirForceN,
      forceScaleMaxN: Math.max(mass * gravity, landingPeakForceN, peakAirForceN),
      numericalCheck: numericalCheck,
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

  function halfpipeNodeAt(nodes, time) {
    if (!nodes || !nodes.length) return { t: 0, theta: 0, v: 0, q: 0, w: 0, n: 0, ke: 0, pe: 0 };
    if (time <= nodes[0].t) return nodes[0];
    if (time >= nodes[nodes.length - 1].t) return nodes[nodes.length - 1];
    var low = 0;
    var high = nodes.length - 1;
    while (high - low > 1) {
      var middle = Math.floor((low + high) / 2);
      if (nodes[middle].t <= time) low = middle;
      else high = middle;
    }
    var before = nodes[low];
    var after = nodes[high];
    var span = after.t - before.t;
    if (span <= 0) return after;
    var amount = clamp((time - before.t) / span, 0, 1);
    return {
      t: time,
      theta: lerp(before.theta, after.theta, amount),
      v: lerp(before.v, after.v, amount),
      q: lerp(before.q, after.q, amount),
      w: lerp(before.w, after.w, amount),
      n: lerp(before.n, after.n, amount),
      ke: lerp(before.ke, after.ke, amount),
      pe: lerp(before.pe, after.pe, amount)
    };
  }

  function sampleHalfpipe(sim, progress) {
    progress = clamp(finite(progress, 0), 0, 1);
    var elapsed = progress * sim.motionDuration;
    var depth = sim.rampDepthM;
    var gravity = sim.gravity;
    var mass = sim.massKg;
    var trick = sim.trickAir;
    var airs = sim.airs || [];
    var air = null;
    for (var airIndex = 0; airIndex < airs.length; airIndex++) {
      if (elapsed >= airs[airIndex].takeoffT && elapsed < airs[airIndex].landT) {
        air = airs[airIndex];
        break;
      }
    }
    var unsafeStop = sim.endReason === 'unsafe' && trick && elapsed >= trick.landT - 0.000000001;
    var x;
    var y;
    var vx;
    var vy;
    var speedMps;
    var normalPerMass = 0;
    var nx = 0;
    var ny = 0;
    var tx = 0;
    var ty = 1;
    var rotation;
    var spinDeg = 0;
    var trickRotation = 0;
    var surfaceRotationDeg = null;
    var alignmentProgress = 0;
    var alignmentErrorDeg = 0;
    var hasSurfaceContact = false;
    var hasSupport = false;
    var airborne = false;
    var thermalJ;
    var riderWorkJ;
    var trackKineticJ = null;
    var trackPotentialJ = null;
    var signedSpeed = 0;
    var curvature = 0;
    var phase;

    if (air || unsafeStop) {
      var flight = air || trick;
      var flightTime = air ? clamp(elapsed - flight.takeoffT, 0, flight.landT - flight.takeoffT) : flight.landT - flight.takeoffT;
      var flightDuration = Math.max(0.000001, flight.landT - flight.takeoffT);
      var q = flightTime / flightDuration;
      x = flight.side * HALFPIPE_HALF_WIDTH_M;
      y = depth + flight.speedMps * flightTime - 0.5 * gravity * flightTime * flightTime;
      vx = 0;
      vy = flight.speedMps - gravity * flightTime;
      speedMps = Math.abs(vy);
      ty = flight.side;
      rotation = flight.side < 0 ? 90 : -90;
      spinDeg = flight.trick ? sim.airSpinRate * flightTime : 0;
      trickRotation = flight.trick ? spinDeg : 0;
      thermalJ = flight.q;
      riderWorkJ = flight.w;
      airborne = !unsafeStop;
      if (unsafeStop) {
        y = depth;
        vy = -flight.speedMps;
        speedMps = flight.speedMps;
        spinDeg = sim.completed;
        trickRotation = sim.completed;
        alignmentErrorDeg = finite(sim.contactAlignmentErrorDeg, halfTurnAlignmentError(sim.completed));
        hasSurfaceContact = true;
        phase = 'unsafe contact — simulation stopped';
      } else {
        phase = q < 0.46 ? 'rising' : (q < 0.54 ? 'at the apex' : (q < 0.96 ? 'falling' : 'approaching contact'));
      }
    } else {
      var node = halfpipeNodeAt(sim.nodes, elapsed);
      var point = halfpipeTrackPoint(node.theta, depth);
      signedSpeed = node.v;
      curvature = point.curvature;
      x = point.x;
      y = point.y;
      tx = point.tx;
      ty = point.ty;
      nx = point.nx;
      ny = point.ny;
      vx = node.v * point.tx;
      vy = node.v * point.ty;
      speedMps = Math.abs(node.v);
      normalPerMass = Math.max(0, gravity * point.ny + node.v * node.v * point.curvature);
      thermalJ = node.q;
      riderWorkJ = node.w;
      trackKineticJ = finite(node.ke, 0.5 * mass * node.v * node.v);
      trackPotentialJ = finite(node.pe, mass * gravity * point.y);
      surfaceRotationDeg = transitionCanvasRotation(point);
      rotation = surfaceRotationDeg;
      alignmentProgress = 1;
      hasSurfaceContact = true;
      hasSupport = true;
      var afterTrick = trick && sim.contactSafe && elapsed >= trick.landT - 0.000000001;
      if (afterTrick) {
        var sinceLanding = elapsed - trick.landT;
        var alignmentDuration = Math.max(0.000001, finite(sim.reentryAlignmentDuration, 0.2));
        var alignedSpin = 180 * finite(sim.landingHalfTurns, Math.round(sim.completed / 180));
        alignmentProgress = smoothStep01(sinceLanding / alignmentDuration);
        spinDeg = lerp(sim.completed, alignedSpin, alignmentProgress);
        alignmentErrorDeg = Math.abs(alignedSpin - spinDeg);
        trickRotation = sim.completed;
        var reentryDuration = Math.max(0.000001, sim.motionDuration - trick.landT);
        phase = sinceLanding < Math.min(0.18, reentryDuration * 0.25)
          ? 're-entering the wall'
          : (Math.abs(node.theta) <= 0.32 ? 'compressing on the return' : 'driving down the return wall');
      } else if (sim.endReason !== 'returned' && elapsed >= sim.motionDuration - 0.000000001) {
        phase = sim.endReason === 'time-limit' ? 'model time limit reached' : 'rocked to a stop';
      } else if (elapsed < sim.bottomTime) {
        phase = 'dropping in';
      } else if (Math.abs(node.theta) <= 0.32) {
        phase = 'compressing at the bottom';
      } else if (node.v * node.theta > 0) {
        phase = 'driving up the wall';
      } else {
        phase = 'rolling back down';
      }
    }

    var normalG = normalPerMass / gravity;
    var normalForceN = mass * normalPerMass;
    var frictionForceN = hasSupport && speedMps > 0.000001 ? sim.rollingMu * normalForceN : 0;
    var motionSign = signedSpeed > 0 ? 1 : (signedSpeed < 0 ? -1 : 0);
    var frictionX = -motionSign * frictionForceN * tx;
    var frictionY = -motionSign * frictionForceN * ty;
    // Rocked to a stop: static friction holds the rider, cancelling the
    // downhill part of the weight (it is at most mu N, or the model would
    // not have stopped there).
    var atRest = hasSupport && sim.endReason === 'stopped' && speedMps <= 0.000001 &&
      elapsed >= sim.motionDuration - 0.000000001;
    if (atRest) {
      var holdN = mass * gravity * ty;
      frictionX = holdN * tx;
      frictionY = holdN * ty;
      frictionForceN = Math.abs(holdN);
    }
    var peJ = trackPotentialJ !== null ? trackPotentialJ : mass * gravity * y;
    var keJ = trackKineticJ !== null ? trackKineticJ : 0.5 * mass * speedMps * speedMps;
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
      spinDeg: spinDeg,
      trickRotation: trickRotation,
      surfaceRotationDeg: surfaceRotationDeg,
      alignmentProgress: alignmentProgress,
      alignmentErrorDeg: alignmentErrorDeg,
      hasSurfaceContact: hasSurfaceContact,
      hasSupport: hasSupport,
      airborne: airborne,
      outcome: sim.outcome,
      phase: phase,
      time: elapsed,
      peJ: peJ,
      keJ: keJ,
      thermalJ: thermalJ,
      riderWorkJ: riderWorkJ,
      energyInputSoFarJ: sim.startPotentialJ + riderWorkJ,
      energyResidualJ: keJ + peJ + thermalJ - (sim.startPotentialJ + riderWorkJ),
      normalG: normalG,
      normalForceN: normalForceN,
      weightN: mass * gravity,
      frictionForceN: frictionForceN,
      frictionX: frictionX,
      frictionY: frictionY,
      frictionStatic: atRest,
      atRest: atRest,
      signedSpeedMps: signedSpeed,
      curvature: curvature,
      loadSquat: loadSquat,
      nx: nx,
      ny: ny,
      tx: tx,
      ty: ty
    };
  }

  // Flat ground: one push of constant force for FLAT_PUSH_TIME_S, then coasting.
  // On level ground N = m g, so rolling friction is the constant force mu m g
  // and the heat made over a distance d is exactly mu m g d.
  function simFlatGround(opts) {
    opts = opts || {};
    var gravity = clamp(finite(opts.gravity, G), 0.5, 25);
    var riderMassKg = clamp(finite(opts.riderMassKg, RIDER_KG), 35, 110);
    var vehicle = getVehicle(opts.vehicle);
    var surface = getSurface(opts.surfaceId);
    var pushForceN = clamp(finite(opts.pushForceN, 200), 20, 400);
    var pushTimeS = FLAT_PUSH_TIME_S;
    var mass = riderMassKg + vehicle.mass;
    var mu = surface.rollingMu;
    var weightN = mass * gravity;
    var frictionN = mu * weightN;
    var moves = pushForceN > frictionN;
    var pushAccel = moves ? (pushForceN - frictionN) / mass : 0;
    var topSpeed = pushAccel * pushTimeS;
    var pushDistanceM = 0.5 * pushAccel * pushTimeS * pushTimeS;
    var coastDecel = mu * gravity;
    var coastTimeS = moves ? topSpeed / coastDecel : 0;
    var coastDistanceM = moves ? topSpeed * topSpeed / (2 * coastDecel) : 0;
    var stopDistanceM = pushDistanceM + coastDistanceM;
    var motionDuration = Math.max(pushTimeS, pushTimeS + coastTimeS);
    var riderWorkJ = moves ? pushForceN * pushDistanceM : 0;
    var thermalJ = frictionN * stopDistanceM;
    var topKineticJ = 0.5 * mass * topSpeed * topSpeed;
    return {
      mode: 'flat',
      inputs: {
        pushForceN: pushForceN,
        gravity: gravity,
        riderMassKg: riderMassKg,
        vehicle: vehicle.id,
        surfaceId: surface.id
      },
      riderMassKg: riderMassKg,
      vehicle: vehicle,
      surface: surface,
      rollingMu: mu,
      gravity: gravity,
      massKg: mass,
      weightN: weightN,
      pushForceN: pushForceN,
      pushTimeS: pushTimeS,
      frictionN: frictionN,
      moves: moves,
      pushAccel: pushAccel,
      pushNetForceN: moves ? pushForceN - frictionN : 0,
      coastDecel: coastDecel,
      topSpeed: topSpeed,
      topSpeedMph: topSpeed * MPS2MPH,
      pushDistanceM: pushDistanceM,
      coastDistanceM: coastDistanceM,
      coastTimeS: coastTimeS,
      stopDistanceM: stopDistanceM,
      stopDistanceFt: stopDistanceM * M2FT,
      motionDuration: motionDuration,
      riderWorkJ: riderWorkJ,
      energyInputJ: riderWorkJ,
      topKineticJ: topKineticJ,
      // The run ends at rest on level ground: no kinetic or height energy left.
      mechanicalJ: 0,
      thermalJ: thermalJ,
      coastFrictionWorkJ: frictionN * coastDistanceM,
      energyClosureResidualJ: riderWorkJ - thermalJ,
      forceScaleMaxN: Math.max(weightN, pushForceN),
      outcome: moves ? 'stopped' : 'no-motion',
      runSuccessful: moves,
      contactSafe: true,
      landed: moves
    };
  }

  function sampleFlat(sim, progress) {
    progress = clamp(finite(progress, 0), 0, 1);
    var elapsed = progress * sim.motionDuration;
    var pushing = sim.moves && elapsed < sim.pushTimeS;
    var x;
    var v;
    var phase;
    var coastTime = 0;
    if (!sim.moves) {
      x = 0;
      v = 0;
      phase = 'not moving';
    } else if (pushing) {
      x = 0.5 * sim.pushAccel * elapsed * elapsed;
      v = sim.pushAccel * elapsed;
      phase = 'pushing off';
    } else {
      coastTime = clamp(elapsed - sim.pushTimeS, 0, sim.coastTimeS);
      v = Math.max(0, sim.topSpeed - sim.coastDecel * coastTime);
      x = sim.pushDistanceM + sim.topSpeed * coastTime - 0.5 * sim.coastDecel * coastTime * coastTime;
      phase = coastTime >= sim.coastTimeS - 0.000000001 ? 'stopped' : 'coasting';
    }
    var moving = v > 0.000001 || pushing;
    var frictionForceN = moving ? sim.frictionN : 0;
    var pushForceN = pushing ? sim.pushForceN : 0;
    var netForceN = pushForceN - frictionForceN;
    var keJ = 0.5 * sim.massKg * v * v;
    var thermalJ = sim.frictionN * x;
    var riderWorkJ = sim.pushForceN * Math.min(x, sim.pushDistanceM) * (sim.moves ? 1 : 0);
    var coastDistanceSoFarM = Math.max(0, x - sim.pushDistanceM);
    return {
      x: x,
      y: 0,
      z: 0,
      vx: v,
      vy: 0,
      vz: 0,
      speedMps: v,
      rotation: 0,
      spinDeg: 0,
      phase: phase,
      time: elapsed,
      outcome: sim.outcome,
      hasSurfaceContact: true,
      hasSupport: true,
      pushing: pushing,
      keJ: keJ,
      peJ: 0,
      thermalJ: thermalJ,
      riderWorkJ: riderWorkJ,
      energyInputSoFarJ: riderWorkJ,
      energyResidualJ: keJ + thermalJ - riderWorkJ,
      coastDistanceSoFarM: coastDistanceSoFarM,
      coastKineticLostJ: pushing ? 0 : 0.5 * sim.massKg * (sim.topSpeed * sim.topSpeed - v * v),
      coastFrictionWorkSoFarJ: sim.frictionN * coastDistanceSoFarM,
      frictionlessX: pushing || !sim.moves ? x : sim.pushDistanceM + sim.topSpeed * (elapsed - sim.pushTimeS),
      weightN: sim.weightN,
      normalForceN: sim.weightN,
      normalG: 1,
      pushForceN: pushForceN,
      frictionForceN: frictionForceN,
      netForceN: netForceN,
      accelerationMps2: netForceN / sim.massKg,
      nx: 0,
      ny: 1,
      tx: 1,
      ty: 0
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
    var comAccelerationYMps2 = 0;
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
      // d/dt of the velocity law below: the COM acceleration of the pulse.
      comAccelerationYMps2 = sim.landingStopTimeS > 0 && landingProgress < 1
        ? -touchdown.vy * 0.5 * Math.PI * Math.sin(Math.PI * landingProgress) / sim.landingStopTimeS
        : 0;
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
      comAccelerationYMps2: comAccelerationYMps2,
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
      weightN: sim.massKg * sim.gravity,
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

  function sampleModel(sim, progress) {
    if (sim.mode === 'halfpipe') return sampleHalfpipe(sim, progress);
    if (sim.mode === 'flat') return sampleFlat(sim, progress);
    return sampleGapJump(sim, progress);
  }

  // Simulations are deterministic, so persisted state keeps only the inputs
  // (plus a tiny summary) and paths are recomputed here. A small cache keeps
  // re-renders during playback from re-integrating the same setup.
  var SIM_CACHE = [];
  var SIM_CACHE_LIMIT = 10;

  function simInputsKey(mode, inputs) {
    var keys = Object.keys(inputs || {}).sort();
    return mode + '|' + keys.map(function(key) { return key + '=' + inputs[key]; }).join('|');
  }

  function runSimulation(mode, inputs) {
    mode = mode === 'gap' || mode === 'flat' ? mode : 'halfpipe';
    var key = simInputsKey(mode, inputs);
    for (var index = 0; index < SIM_CACHE.length; index++) {
      if (SIM_CACHE[index].key === key) return SIM_CACHE[index].sim;
    }
    var sim = mode === 'halfpipe'
      ? simHalfpipe(inputs)
      : (mode === 'flat' ? simFlatGround(inputs) : simGapJump(inputs));
    SIM_CACHE.unshift({ key: key, sim: sim });
    var resolvedKey = simInputsKey(mode, sim.inputs);
    if (resolvedKey !== key) SIM_CACHE.unshift({ key: resolvedKey, sim: sim });
    if (SIM_CACHE.length > SIM_CACHE_LIMIT) SIM_CACHE.length = SIM_CACHE_LIMIT;
    return sim;
  }

  function simInputsFromState(mode, state) {
    state = state || {};
    if (mode === 'gap') {
      return {
        speedMph: state.speedMph,
        angleDeg: state.angleDeg,
        gapFt: state.gapFt,
        gravity: state.gravity,
        riderMassKg: state.riderMassKg,
        landingCompressionM: state.landingCompressionM,
        airDrag: state.airDrag !== false,
        vehicle: state.vehicle,
        windId: state.windId
      };
    }
    if (mode === 'flat') {
      return {
        pushForceN: state.pushForceN,
        gravity: state.gravity,
        riderMassKg: state.riderMassKg,
        vehicle: state.vehicle,
        surfaceId: state.surfaceId
      };
    }
    return {
      pumps: state.pumps,
      pumpTimingId: state.pumpTimingId,
      dropHeightM: state.dropHeightM,
      rampDepthM: state.rampDepthM,
      gravity: state.gravity,
      riderMassKg: state.riderMassKg,
      vehicle: state.vehicle,
      surfaceId: state.surfaceId,
      bodyPositionId: state.bodyPositionId,
      rotationTarget: state.rotationTarget,
      spinRate: state.spinRate,
      trickId: state.trickId
    };
  }

  // Saved runs from before 2026-11 stored whole simulation objects (paths and
  // all). Rebuild their inputs so they reload as current-model runs.
  function legacyInputs(record) {
    function idOf(value) { return value && typeof value === 'object' ? value.id : value; }
    if (record.mode === 'gap') {
      return {
        speedMph: record.speedMph,
        angleDeg: record.angleDeg,
        gapFt: record.gapFt,
        gravity: record.gravity,
        riderMassKg: record.riderMassKg,
        landingCompressionM: record.landingCompressionM,
        airDrag: record.airDrag !== false,
        vehicle: idOf(record.vehicle),
        windId: idOf(record.wind)
      };
    }
    return {
      pumps: record.pumps,
      pumpTimingId: record.pumpTimingId || (record.pumpTiming && record.pumpTiming.id),
      dropHeightM: record.dropHeightM,
      rampDepthM: record.rampDepthM,
      gravity: record.gravity,
      riderMassKg: record.riderMassKg,
      vehicle: idOf(record.vehicle),
      surfaceId: idOf(record.surface) || record.surfaceId,
      bodyPositionId: idOf(record.bodyPosition) || record.bodyPositionId,
      rotationTarget: record.rotationTarget,
      spinRate: record.spinRate
    };
  }

  function hydrateSim(record) {
    if (!record || typeof record !== 'object') return null;
    if (record.mode !== 'halfpipe' && record.mode !== 'gap' && record.mode !== 'flat') return null;
    try {
      var inputs = record.inputs && typeof record.inputs === 'object'
        ? record.inputs
        : legacyInputs(record);
      return runSimulation(record.mode, inputs);
    } catch (err) {
      return null;
    }
  }

  function measuredValueFt(sim) {
    if (!sim) return 0;
    if (sim.mode === 'halfpipe') return sim.hFt;
    if (sim.mode === 'flat') return sim.stopDistanceFt;
    return sim.rangeFt;
  }

  // What toolData keeps for a run: inputs and a summary, no paths.
  function simRecord(sim) {
    sim = hydrateSim(sim) || null;
    if (!sim) return null;
    var inputs = {};
    Object.keys(sim.inputs || {}).forEach(function(key) {
      var value = sim.inputs[key];
      if (value === null || ['number', 'string', 'boolean'].indexOf(typeof value) !== -1) inputs[key] = value;
    });
    return {
      v: 2,
      mode: sim.mode,
      inputs: inputs,
      summary: {
        outcome: String(sim.outcome || ''),
        runSuccessful: !!sim.runSuccessful,
        measuredFt: finite(measuredValueFt(sim), 0)
      }
    };
  }

  // ---------- Stage B: linked representations and inquiry (pure) ----------

  function signOf(value) { return value > 0 ? 1 : (value < 0 ? -1 : 0); }

  // The rider's acceleration from the model's own motion law, used by the
  // free-body panel to check sum F = m a. `applies` is false where the model
  // stops computing contact forces (unsafe contact, a missed landing).
  function modelAcceleration(sim, sample) {
    var g = sim.gravity;
    var none = { ax: 0, ay: 0, az: 0, along: null, toward: null, applies: false };
    if (sim.mode === 'flat') {
      return { ax: finite(sample.accelerationMps2, 0), ay: 0, az: 0, along: null, toward: null, applies: true };
    }
    if (sim.mode === 'halfpipe') {
      if (!sample.hasSupport) {
        return sample.airborne ? { ax: 0, ay: -g, az: 0, along: null, toward: null, applies: true } : none;
      }
      // m dv/dt = -m g t_y - sign(v) mu N  and  N - m g n_y = m v^2 kappa
      var v = finite(sample.signedSpeedMps, 0);
      var kineticFriction = !sample.atRest && sample.frictionForceN > 0
        ? signOf(v) * sim.rollingMu * sample.normalForceN / sim.massKg
        : 0;
      var along = sample.atRest ? 0 : -g * sample.ty - kineticFriction;
      var toward = v * v * finite(sample.curvature, 0);
      return {
        ax: along * sample.tx + toward * sample.nx,
        ay: along * sample.ty + toward * sample.ny,
        az: 0,
        along: along,
        toward: toward,
        applies: true
      };
    }
    var phase = sample.phase;
    if (phase === 'approaching the ramp' || phase === 'platform contact' || phase === 'contact pulse complete') {
      return { ax: 0, ay: 0, az: 0, along: null, toward: null, applies: true };
    }
    if (phase === 'absorbing the landing') {
      return { ax: 0, ay: finite(sample.comAccelerationYMps2, 0), az: 0, along: null, toward: null, applies: true };
    }
    if (phase === 'rising' || phase === 'at the apex' || phase === 'falling') {
      return {
        ax: finite(sample.airForceX, 0) / sim.massKg,
        ay: -g + finite(sample.airForceY, 0) / sim.massKg,
        az: finite(sample.airForceZ, 0) / sim.massKg,
        along: null,
        toward: null,
        applies: true
      };
    }
    return none;
  }

  // Every force on the rider at one instant, from the same sample fields the
  // canvas arrows use, with the net force and the m a check.
  function freeBodyDiagram(sim, sample) {
    var forces = [];
    function add(id, x, y, z, drawn) {
      x = finite(x, 0);
      y = finite(y, 0);
      z = finite(z, 0);
      forces.push({ id: id, x: x, y: y, z: z, magnitudeN: Math.sqrt(x * x + y * y + z * z), drawn: drawn !== false });
    }
    add('weight', 0, -sample.weightN, 0);
    if (sim.mode === 'halfpipe') {
      if (sample.hasSupport && sample.normalForceN > 0.000001) {
        add('normal', sample.nx * sample.normalForceN, sample.ny * sample.normalForceN, 0);
      }
      if (sample.frictionForceN > 0.000001) {
        add(sample.frictionStatic ? 'staticFriction' : 'friction', sample.frictionX, sample.frictionY, 0);
      }
    } else if (sim.mode === 'flat') {
      add('normal', 0, sample.normalForceN, 0);
      if (sample.pushForceN > 0) add('push', sample.pushForceN, 0, 0);
      if (sample.frictionForceN > 0) add('friction', -sample.frictionForceN, 0, 0);
    } else {
      if (sample.supportForceN > 0.000001) add('support', 0, sample.supportForceN, 0);
      if (sample.airForceMagnitudeN > 0) {
        add('air', sample.airForceX, sample.airForceY, sample.airForceZ, sample.airForceMagnitudeN > 0.01);
      }
    }
    var netX = 0;
    var netY = 0;
    var netZ = 0;
    forces.forEach(function(force) { netX += force.x; netY += force.y; netZ += force.z; });
    var accel = modelAcceleration(sim, sample);
    var mass = sim.massKg;
    var maX = mass * accel.ax;
    var maY = mass * accel.ay;
    var maZ = mass * accel.az;
    var result = {
      mode: sim.mode,
      massKg: mass,
      forces: forces,
      netX: netX,
      netY: netY,
      netZ: netZ,
      netN: Math.sqrt(netX * netX + netY * netY + netZ * netZ),
      ax: accel.ax,
      ay: accel.ay,
      az: accel.az,
      accelerationMps2: Math.sqrt(accel.ax * accel.ax + accel.ay * accel.ay + accel.az * accel.az),
      maX: maX,
      maY: maY,
      maZ: maZ,
      maN: Math.sqrt(maX * maX + maY * maY + maZ * maZ),
      residualN: Math.sqrt((netX - maX) * (netX - maX) + (netY - maY) * (netY - maY) + (netZ - maZ) * (netZ - maZ)),
      applies: accel.applies,
      pathFrame: false,
      pixelsPerNewton: forcePixelsPerNewton(sim, 960)
    };
    if (sim.mode === 'halfpipe' && sample.hasSupport) {
      result.pathFrame = true;
      result.netAlongN = netX * sample.tx + netY * sample.ty;
      result.netTowardN = netX * sample.nx + netY * sample.ny;
      result.maAlongN = mass * accel.along;
      result.maTowardN = mass * accel.toward;
    }
    return result;
  }

  function seriesEventTimes(sim) {
    if (sim.mode === 'halfpipe') {
      var times = [];
      (sim.airs || []).forEach(function(air) { times.push(air.takeoffT, air.landT); });
      (sim.pumpEvents || []).forEach(function(event) { if (Number.isFinite(event.t)) times.push(event.t); });
      return times;
    }
    if (sim.mode === 'flat') return [sim.pushTimeS];
    return [sim.approachTime, sim.approachTime + sim.airTime, sim.approachTime + sim.airTime + finite(sim.landingStopTimeS, 0)];
  }

  function seriesPoint(sim, progress) {
    var sample = sampleModel(sim, progress);
    var fbd = freeBodyDiagram(sim, sample);
    var ke = finite(sample.keJ, 0);
    var pe = finite(sample.peJ, 0);
    var heat = finite(sample.thermalJ, 0);
    return {
      progress: progress,
      t: sample.time,
      phase: sample.phase,
      keJ: ke,
      peJ: pe,
      thermalJ: heat,
      workJ: finite(sample.riderWorkJ, 0),
      windJ: finite(sample.windWorkJ, 0),
      totalJ: ke + pe + heat,
      heightM: sim.mode === 'flat' ? finite(sample.x, 0) : finite(sample.y, 0),
      speedMps: finite(sample.speedMps, 0),
      accelMps2: fbd.applies ? (sim.mode === 'flat' ? fbd.ax : fbd.accelerationMps2) : null
    };
  }

  // Dense samples for the energy and motion graphs, cached per simulation.
  var SERIES_CACHE = [];
  function modelTimeSeries(sim) {
    for (var index = 0; index < SERIES_CACHE.length; index++) {
      if (SERIES_CACHE[index].sim === sim) return SERIES_CACHE[index].series;
    }
    var duration = Math.max(0.001, finite(sim.motionDuration, 0.001));
    var count = Math.round(clamp(duration * 40, 300, 3000));
    var progresses = [];
    for (var step = 0; step <= count; step++) progresses.push(step / count);
    seriesEventTimes(sim).forEach(function(time) {
      var at = time / duration;
      if (!(at > 0 && at < 1)) return;
      progresses.push(clamp(at - 0.000001, 0, 1), at, clamp(at + 0.000001, 0, 1));
    });
    progresses.sort(function(a, b) { return a - b; });
    var unique = [];
    progresses.forEach(function(value) {
      if (!unique.length || value - unique[unique.length - 1] > 0.0000000001) unique.push(value);
    });
    var points = unique.map(function(progress) { return seriesPoint(sim, progress); });
    var series = { duration: duration, points: points };
    SERIES_CACHE.unshift({ sim: sim, series: series });
    if (SERIES_CACHE.length > 6) SERIES_CACHE.length = 6;
    return series;
  }

  // Ordinary least squares y = slope x + intercept, with r^2 = Sxy^2/(Sxx Syy).
  function linearFit(points) {
    var clean = (points || []).filter(function(point) {
      return point && Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y));
    }).map(function(point) { return { x: Number(point.x), y: Number(point.y) }; });
    var n = clean.length;
    if (n < 2) return null;
    var meanX = 0;
    var meanY = 0;
    clean.forEach(function(point) { meanX += point.x / n; meanY += point.y / n; });
    var sxx = 0;
    var sxy = 0;
    var syy = 0;
    clean.forEach(function(point) {
      var dx = point.x - meanX;
      var dy = point.y - meanY;
      sxx += dx * dx;
      sxy += dx * dy;
      syy += dy * dy;
    });
    if (!(sxx > 1e-12 * Math.max(1, meanX * meanX))) return null;
    var slope = sxy / sxx;
    return {
      n: n,
      slope: slope,
      intercept: meanY - slope * meanX,
      r2: syy > 0 ? (sxy * sxy) / (sxx * syy) : null
    };
  }

  // Columns the experiment log can sort, plot and export. modes: h = halfpipe,
  // f = flat, g = gap.
  var LOG_COLUMNS = [
    { id: 'mass', unit: 'kg', modes: 'hfg' },
    { id: 'gravity', unit: 'm/s²', modes: 'hfg' },
    { id: 'dropHeight', unit: 'm', modes: 'h' },
    { id: 'pumps', unit: '', modes: 'h' },
    { id: 'mu', unit: '', modes: 'hf' },
    { id: 'startPE', unit: 'J', modes: 'h' },
    { id: 'bottomSpeed', unit: 'm/s', modes: 'h' },
    { id: 'bottomSpeedSq', unit: 'm²/s²', modes: 'h' },
    { id: 'bottomKE', unit: 'J', modes: 'h' },
    { id: 'firstPassHeat', unit: 'J', modes: 'h' },
    { id: 'airHeight', unit: 'm', modes: 'h' },
    { id: 'riderWork', unit: 'J', modes: 'hf' },
    { id: 'heat', unit: 'J', modes: 'hf' },
    { id: 'transitionLoad', unit: 'g', modes: 'h' },
    { id: 'inertia', unit: 'kg·m²', modes: 'h' },
    { id: 'inverseInertia', unit: '1/(kg·m²)', modes: 'h' },
    { id: 'airSpin', unit: '°/s', modes: 'h' },
    { id: 'angMomentum', unit: 'kg·m²/s', modes: 'h' },
    { id: 'pushForce', unit: 'N', modes: 'f' },
    { id: 'friction', unit: 'N', modes: 'f' },
    { id: 'netForce', unit: 'N', modes: 'f' },
    { id: 'pushAccel', unit: 'm/s²', modes: 'f' },
    { id: 'topSpeed', unit: 'm/s', modes: 'f' },
    { id: 'topSpeedSq', unit: 'm²/s²', modes: 'f' },
    { id: 'topKE', unit: 'J', modes: 'f' },
    { id: 'stopDistance', unit: 'm', modes: 'f' },
    { id: 'launchSpeed', unit: 'm/s', modes: 'g' },
    { id: 'launchSpeedSq', unit: 'm²/s²', modes: 'g' },
    { id: 'launchKE', unit: 'J', modes: 'g' },
    { id: 'angle', unit: '°', modes: 'g' },
    { id: 'dragOn', unit: '', modes: 'g' },
    { id: 'range', unit: 'm', modes: 'g' },
    { id: 'peakHeight', unit: 'm', modes: 'g' },
    { id: 'flightTime', unit: 's', modes: 'g' },
    { id: 'absorption', unit: 'm', modes: 'g' },
    { id: 'landingLoad', unit: 'g', modes: 'g' },
    { id: 'airLoss', unit: 'J', modes: 'g' }
  ];

  function peakReachM(sim) {
    var best = finite(sim.dropHeightM, 0);
    (sim.passPeaks || []).forEach(function(peak) { best = Math.max(best, finite(peak.heightM, 0)); });
    return best;
  }

  // The numbers a log row keeps (6 significant figures), computed once when
  // the run finishes so the log never has to re-run 50 simulations.
  function runValues(sim) {
    var values = {};
    function put(key, value) {
      value = Number(value);
      if (Number.isFinite(value)) values[key] = Number(value.toPrecision(6));
    }
    put('mass', sim.massKg);
    put('gravity', sim.gravity);
    if (sim.mode === 'halfpipe') {
      put('dropHeight', sim.dropHeightM);
      put('pumps', sim.pumps);
      put('mu', sim.rollingMu);
      put('startPE', sim.startPotentialJ);
      put('bottomSpeed', sim.bottomSpeed);
      put('bottomSpeedSq', sim.bottomSpeed * sim.bottomSpeed);
      put('bottomKE', 0.5 * sim.massKg * sim.bottomSpeed * sim.bottomSpeed);
      if (sim.turns && sim.turns.length) put('firstPassHeat', halfpipeNodeAt(sim.nodes, sim.turns[0].t).q);
      put('airHeight', sim.hAir);
      put('riderWork', sim.riderWorkJ);
      put('heat', sim.thermalJ);
      put('transitionLoad', sim.peakNormalG);
      put('inertia', sim.effectiveInertia);
      if (sim.effectiveInertia > 0) put('inverseInertia', 1 / sim.effectiveInertia);
      put('airSpin', sim.airSpinRate);
      put('angMomentum', sim.angularMomentum);
    } else if (sim.mode === 'flat') {
      put('mu', sim.rollingMu);
      put('pushForce', sim.pushForceN);
      put('friction', sim.frictionN);
      put('netForce', sim.pushNetForceN);
      put('pushAccel', sim.pushAccel);
      put('topSpeed', sim.topSpeed);
      put('topSpeedSq', sim.topSpeed * sim.topSpeed);
      put('topKE', sim.topKineticJ);
      put('stopDistance', sim.stopDistanceM);
      put('riderWork', sim.riderWorkJ);
      put('heat', sim.thermalJ);
    } else {
      put('launchSpeed', sim.speedMps);
      put('launchSpeedSq', sim.speedMps * sim.speedMps);
      put('launchKE', sim.energyInputJ);
      put('angle', sim.angleDeg);
      put('dragOn', sim.airDrag ? 1 : 0);
      put('range', sim.rangeM);
      put('peakHeight', sim.peakM);
      put('flightTime', sim.airTime);
      put('absorption', sim.landingCompressionM);
      if (sim.hasLandingContact) put('landingLoad', getLandingPeakG(sim));
      put('airLoss', sim.aerodynamicDissipationJ);
    }
    return values;
  }

  function csvCell(value) {
    if (value == null) return '';
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
    var text = String(value);
    // Keep spreadsheet apps from running a cell as a formula.
    if (/^[=+\-@]/.test(text)) text = "'" + text;
    return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }

  // header: [{ id, label }]; rows: arrays of plain values, same order.
  function buildCsv(header, rows) {
    return [header.map(function(column) { return csvCell(column.label); }).join(',')]
      .concat(rows.map(function(row) { return row.map(csvCell).join(','); }))
      .join('\r\n');
  }

  // ---- P3-1 predictions. Every answer is computed by running the model. ----
  var PREDICTION_PROMPTS = {
    hp_mass: { mode: 'halfpipe', options: ['higher', 'same', 'lower'], misconceptions: { higher: 'heavier_higher' } },
    hp_moon: { mode: 'halfpipe', options: ['higher', 'same', 'lower'], misconceptions: { higher: 'low_gravity_higher' } },
    hp_friction: { mode: 'halfpipe', options: ['same', 'lower', 'higher'], misconceptions: { same: 'friction_only_rough' } },
    hp_spin: { mode: 'halfpipe', options: ['lower', 'same', 'higher'], misconceptions: { lower: 'spin_needs_energy' } },
    gap_weight: { mode: 'gap', options: ['none', 'weight', 'upward'], misconceptions: { none: 'weight_disappears', upward: 'motion_needs_force' } },
    gap_45: { mode: 'gap', needsDrag: true, options: ['exact', 'below', 'above'], misconceptions: { exact: 'drag_45_rule' } },
    gap_safe: { mode: 'gap', options: ['safe', 'hard', 'miss'], misconceptions: {} },
    gap_mass: { mode: 'gap', options: ['farther', 'same', 'shorter'], misconceptions: { shorter: 'heavier_falls_faster' } },
    flat_stop: { mode: 'flat', options: ['forever', 'slows', 'instant', 'still'], misconceptions: { forever: 'friction_only_rough', instant: 'motion_needs_force' } },
    flat_mass: { mode: 'flat', options: ['shorter', 'same', 'farther'], misconceptions: { farther: 'heavier_farther' } },
    flat_double: { mode: 'flat', options: ['double', 'more', 'less'], misconceptions: { double: 'double_push_double_distance' } }
  };
  var PREDICTION_ORDER = ['hp_moon', 'hp_mass', 'hp_friction', 'hp_spin', 'gap_weight', 'gap_safe', 'gap_45', 'gap_mass', 'flat_stop', 'flat_double', 'flat_mass'];
  var MISCONCEPTION_IDS = ['heavier_higher', 'low_gravity_higher', 'friction_only_rough', 'spin_needs_energy', 'weight_disappears',
    'drag_45_rule', 'motion_needs_force', 'heavier_falls_faster', 'heavier_farther', 'double_push_double_distance'];

  function predictionPromptsFor(mode, airDrag) {
    return PREDICTION_ORDER.filter(function(id) {
      var prompt = PREDICTION_PROMPTS[id];
      return prompt.mode === mode && (!prompt.needsDrag || airDrag !== false);
    });
  }

  function compareValues(base, other, tolerance) {
    var relative = (other - base) / Math.max(0.000001, Math.abs(base));
    if (Math.abs(relative) <= tolerance) return 'same';
    return relative > 0 ? 'higher' : 'lower';
  }

  function quickSim(mode, inputs, patch) {
    var options = Object.assign({}, inputs, patch || {}, { _skipNumericalCheck: true });
    if (mode === 'halfpipe') return simHalfpipe(options);
    if (mode === 'flat') return simFlatGround(options);
    return simGapJump(options);
  }

  function bestGapAngle(sim) {
    var inputs = Object.assign({}, sim.inputs, { gapFt: 80 });
    function rangeAt(angle) { return quickSim('gap', inputs, { angleDeg: angle }).rangeM; }
    var best = 45;
    var bestRange = -Infinity;
    for (var angle = 20; angle <= 70; angle += 1) {
      var range = rangeAt(angle);
      if (range > bestRange) { bestRange = range; best = angle; }
    }
    var coarse = best;
    for (var fine = coarse - 1; fine <= coarse + 1 + 1e-9; fine += 0.1) {
      var fineAngle = Math.round(fine * 10) / 10;
      var fineRange = rangeAt(fineAngle);
      if (fineRange > bestRange) { bestRange = fineRange; best = fineAngle; }
    }
    return { angle: best, range: bestRange, range45: rangeAt(45) };
  }

  // Works out the model's answer to a prediction prompt for this setup.
  // Returns { promptId, correct, facts, tryPatch, tryProgress }.
  function evaluatePrediction(promptId, sim) {
    var prompt = PREDICTION_PROMPTS[promptId];
    if (!prompt || !sim || prompt.mode !== sim.mode) return null;
    var inputs = sim.inputs || {};
    var facts = {};
    var correct = null;
    var tryPatch = null;
    var tryProgress = null;
    var lightMass = Math.min(sim.riderMassKg, 90);
    var heavyMass = lightMass + 20;
    if (promptId === 'hp_mass') {
      var lightRider = quickSim('halfpipe', inputs, { riderMassKg: lightMass });
      var heavyRider = quickSim('halfpipe', inputs, { riderMassKg: heavyMass });
      facts = { lightMass: lightMass, heavyMass: heavyMass, lightHeight: peakReachM(lightRider), heavyHeight: peakReachM(heavyRider) };
      correct = compareValues(facts.lightHeight, facts.heavyHeight, 0.005);
      tryPatch = { riderMassKg: sim.riderMassKg === heavyMass ? lightMass : heavyMass };
    } else if (promptId === 'hp_moon') {
      var earth = quickSim('halfpipe', inputs, { gravity: 9.81 });
      var moon = quickSim('halfpipe', inputs, { gravity: 1.62 });
      facts = { earthHeight: peakReachM(earth), moonHeight: peakReachM(moon), earthTime: earth.airTime, moonTime: moon.airTime };
      correct = compareValues(facts.earthHeight, facts.moonHeight, 0.005);
      tryPatch = { gravity: sim.gravity === 1.62 ? 9.81 : 1.62 };
    } else if (promptId === 'hp_friction') {
      var coast = quickSim('halfpipe', inputs, { pumps: 0 });
      var turn = coast.turns && coast.turns.length ? coast.turns[0] : null;
      facts = {
        drop: coast.dropHeightM,
        turnHeight: turn ? turn.y : coast.dropHeightM,
        heat: turn ? halfpipeNodeAt(coast.nodes, turn.t).q : 0,
        mu: coast.rollingMu,
        surfaceId: coast.surface.id
      };
      correct = compareValues(facts.drop, facts.turnHeight, 0.0001);
      tryPatch = { pumps: 0 };
    } else if (promptId === 'hp_spin') {
      var open = quickSim('halfpipe', inputs, { bodyPositionId: 'open' });
      var tuck = quickSim('halfpipe', inputs, { bodyPositionId: 'tuck' });
      facts = {
        openHeight: peakReachM(open),
        tuckHeight: peakReachM(tuck),
        openOmega: open.airSpinRate,
        tuckOmega: tuck.airSpinRate,
        openL: open.angularMomentum,
        tuckL: tuck.angularMomentum
      };
      correct = compareValues(facts.openHeight, facts.tuckHeight, 0.005);
      tryPatch = { bodyPositionId: sim.bodyPosition.id === 'tuck' ? 'open' : 'tuck' };
    } else if (promptId === 'gap_weight') {
      var apexProgress = clamp((sim.approachTime + sim.peakTime) / sim.motionDuration, 0, 1);
      var apex = sampleGapJump(sim, apexProgress);
      facts = { weight: apex.weightN, support: apex.supportForceN, air: apex.airForceMagnitudeN };
      correct = apex.supportForceN > 0.000001 ? 'upward' : 'weight';
      tryProgress = apexProgress;
    } else if (promptId === 'gap_45') {
      var best = sim.airDrag ? bestGapAngle(sim) : { angle: 45, range: sim.rangeIdealM, range45: sim.rangeIdealM };
      facts = { bestAngle: best.angle, bestRange: best.range, range45: best.range45 };
      correct = Math.abs(best.angle - 45) < 0.05 ? 'exact' : (best.angle < 45 ? 'below' : 'above');
      tryPatch = { angleDeg: Math.round(best.angle) === 45 ? 44 : Math.round(best.angle) };
    } else if (promptId === 'gap_safe') {
      var peakG = getLandingPeakG(sim);
      facts = { peakG: peakG, landed: !!sim.hasLandingContact, absorption: sim.landingCompressionM };
      correct = !sim.hasLandingContact ? 'miss' : (peakG < 4 ? 'safe' : 'hard');
      tryPatch = sim.hasLandingContact ? { landingCompressionM: peakG < 4 ? 0.15 : 0.8 } : null;
    } else if (promptId === 'gap_mass') {
      var lightJump = quickSim('gap', inputs, { riderMassKg: lightMass });
      var heavyJump = quickSim('gap', inputs, { riderMassKg: heavyMass });
      facts = { lightMass: lightMass, heavyMass: heavyMass, lightRange: lightJump.rangeM, heavyRange: heavyJump.rangeM };
      var jumpChange = compareValues(facts.lightRange, facts.heavyRange, 0.0005);
      correct = jumpChange === 'higher' ? 'farther' : (jumpChange === 'lower' ? 'shorter' : 'same');
      tryPatch = { riderMassKg: sim.riderMassKg === heavyMass ? lightMass : heavyMass };
    } else if (promptId === 'flat_stop') {
      facts = { topSpeed: sim.topSpeed, stopDistance: sim.stopDistanceM, friction: sim.frictionN, mu: sim.rollingMu, push: sim.pushForceN };
      correct = sim.moves ? 'slows' : 'still';
      tryPatch = { surfaceId: 'wax' };
    } else if (promptId === 'flat_mass') {
      var lightPush = quickSim('flat', inputs, { riderMassKg: lightMass });
      var heavyPush = quickSim('flat', inputs, { riderMassKg: heavyMass });
      facts = { lightMass: lightMass, heavyMass: heavyMass, lightDistance: lightPush.stopDistanceM, heavyDistance: heavyPush.stopDistanceM };
      var stopChange = compareValues(facts.lightDistance, facts.heavyDistance, 0.002);
      correct = stopChange === 'higher' ? 'farther' : (stopChange === 'lower' ? 'shorter' : 'same');
      tryPatch = { riderMassKg: sim.riderMassKg === heavyMass ? lightMass : heavyMass };
    } else if (promptId === 'flat_double') {
      var basePush = sim.pushForceN <= 200 ? sim.pushForceN : sim.pushForceN / 2;
      var one = quickSim('flat', inputs, { pushForceN: basePush });
      var two = quickSim('flat', inputs, { pushForceN: basePush * 2 });
      var ratio = one.stopDistanceM > 0.000001 ? two.stopDistanceM / one.stopDistanceM : Infinity;
      facts = { push: basePush, doublePush: basePush * 2, distance: one.stopDistanceM, doubleDistance: two.stopDistanceM, ratio: Number.isFinite(ratio) ? ratio : null };
      correct = Math.abs(ratio - 2) <= 0.02 ? 'double' : (ratio > 2 ? 'more' : 'less');
      tryPatch = { pushForceN: sim.pushForceN === basePush ? basePush * 2 : basePush };
    }
    Object.keys(facts).forEach(function(key) {
      if (typeof facts[key] === 'number') facts[key] = Number.isFinite(facts[key]) ? Number(facts[key].toPrecision(6)) : null;
    });
    return { promptId: promptId, correct: correct, facts: facts, tryPatch: tryPatch, tryProgress: tryProgress };
  }

  function judgePrediction(promptId, choice, evaluation) {
    var prompt = PREDICTION_PROMPTS[promptId];
    if (!prompt || !evaluation) return null;
    var matched = choice === evaluation.correct;
    return {
      matched: matched,
      misconception: matched ? null : (prompt.misconceptions[choice] || null)
    };
  }

  // ---- P3-3 guided investigations. Each plan step is a setup patch. ----
  var HALFPIPE_BASE = { mode: 'halfpipe', vehicle: 'skate', gravity: 9.81, riderMassKg: 62, rampDepthM: 2.4, surfaceId: 'standard',
    pumps: 0, pumpTimingId: 'bottom', dropHeightM: 2.4, bodyPositionId: 'neutral', rotationTarget: 0, spinRate: 0 };
  var GAP_BASE = { mode: 'gap', vehicle: 'skate', gravity: 9.81, riderMassKg: 62, speedMph: 20, angleDeg: 35, gapFt: 15,
    windId: 'calm', airDrag: true, landingCompressionM: LANDING_COMPRESSION_M };
  var FLAT_BASE = { mode: 'flat', vehicle: 'skate', gravity: 9.81, riderMassKg: 62, surfaceId: 'standard', pushForceN: 200 };

  function planSteps(base, vary, values, extra) {
    return values.map(function(value) {
      var patch = Object.assign({}, base, extra || {});
      patch[vary] = value;
      return { patch: patch, vary: vary, value: value };
    });
  }

  var INVESTIGATIONS = [
    { id: 'ke_speed_mass', ngss: 'MS-PS3-1', x: 'launchSpeedSq', y: 'launchKE', altX: 'mass',
      steps: planSteps(GAP_BASE, 'speedMph', [10, 15, 20, 25]).concat(planSteps(GAP_BASE, 'riderMassKg', [40, 85, 110])) },
    { id: 'pe_height', ngss: 'MS-PS3-2', x: 'dropHeight', y: 'startPE', altY: 'bottomKE', speed: 10,
      steps: planSteps(HALFPIPE_BASE, 'dropHeightM', [0.6, 1.2, 1.8, 2.4]) },
    { id: 'energy_where', ngss: 'MS-PS3-5', x: 'mu', y: 'firstPassHeat', altY: 'heat', speed: 10,
      steps: planSteps(HALFPIPE_BASE, 'surfaceId', ['wax', 'standard', 'rough']) },
    { id: 'net_force', ngss: 'HS-PS2-1', x: 'netForce', y: 'pushAccel',
      steps: planSteps(FLAT_BASE, 'pushForceN', [100, 200, 300, 400]).concat(planSteps(FLAT_BASE, 'riderMassKg', [100], { pushForceN: 300 })) },
    { id: 'landing_design', ngss: 'HS-PS2-3', x: 'absorption', y: 'landingLoad',
      steps: planSteps(GAP_BASE, 'landingCompressionM', [0.1, 0.3, 0.5, 0.7, 0.9], { speedMph: 19, angleDeg: 30, gapFt: 20 }) },
    { id: 'tuck_open', ngss: 'HS-PS2 · L = Iω', x: 'inverseInertia', y: 'airSpin', altX: 'inertia', altY: 'angMomentum',
      steps: planSteps(HALFPIPE_BASE, 'bodyPositionId', ['open', 'neutral', 'tuck'], { pumps: 3, spinRate: 260, rotationTarget: 180 }) },
    { id: 'range_angle', ngss: 'HS-PS2-1 · projectile', x: 'angle', y: 'range', group: 'dragOn',
      steps: planSteps(GAP_BASE, 'angleDeg', [25, 35, 45, 55, 65]).concat(planSteps(GAP_BASE, 'angleDeg', [25, 45, 65], { airDrag: false })) }
  ];

  function getInvestigation(id) {
    for (var index = 0; index < INVESTIGATIONS.length; index++) {
      if (INVESTIGATIONS[index].id === id) return INVESTIGATIONS[index];
    }
    return null;
  }

  // Index of the plan step this state matches, or -1.
  function matchPlanStep(investigation, state) {
    if (!investigation || !state) return -1;
    for (var index = 0; index < investigation.steps.length; index++) {
      var patch = investigation.steps[index].patch;
      var matches = Object.keys(patch).every(function(key) {
        var want = patch[key];
        var have = key === 'airDrag' ? state[key] !== false : state[key];
        return typeof want === 'number' ? Math.abs(Number(have) - want) < 0.000001 : have === want;
      });
      if (matches) return index;
    }
    return -1;
  }

  // ---- Stage C P4-1 missions. Each one is checked from a finished model run;
  // the setup patch only opens the right scene and never solves the task. ----
  var MISSION_AIR_TARGET_M = 0.5;
  var MISSION_SMALL_DROP_M = 1.2;
  var MISSION_SMALL_DROP_AIR_M = 0.8;
  var MISSION_TUCK_MAX_SPIN = 330;
  var MISSION_FLAT_TARGET_M = 6;
  var MISSION_ROUGH_MIN_PUSH_N = 150;
  var MISSION_ROUGH_MAX_STOP_M = 3;
  var MISSION_GAP_FT = 20;
  var MISSION_MAX_LANDING_G = 4;
  var MISSION_GUESS_TOLERANCE_PCT = 10;
  var MISSIONS = [
    { id: 'spin_540', mode: 'halfpipe', xp: 20, setup: { mode: 'halfpipe', rotationTarget: 540 } },
    { id: 'tuck_360', mode: 'halfpipe', xp: 20, setup: { mode: 'halfpipe', rotationTarget: 360 } },
    { id: 'fewest_pumps', mode: 'halfpipe', xp: 20, setup: { mode: 'halfpipe', rotationTarget: 0, spinRate: 0 } },
    { id: 'small_drop_air', mode: 'halfpipe', xp: 25, setup: { mode: 'halfpipe', dropHeightM: MISSION_SMALL_DROP_M, rotationTarget: 0, spinRate: 0 } },
    { id: 'moon_hang', mode: 'halfpipe', xp: 20, guess: true, setup: { mode: 'halfpipe', gravity: 1.62 } },
    { id: 'flat_target', mode: 'flat', xp: 15, setup: { mode: 'flat' } },
    { id: 'rough_stop', mode: 'flat', xp: 15, setup: { mode: 'flat', surfaceId: 'rough' } },
    { id: 'gap_drag', mode: 'gap', xp: 20, setup: { mode: 'gap', gapFt: MISSION_GAP_FT, airDrag: true, windId: 'calm' } },
    { id: 'soft_landing', mode: 'gap', xp: 25, setup: { mode: 'gap', gapFt: MISSION_GAP_FT, speedMph: 19, angleDeg: 30, landingCompressionM: 0.1, airDrag: true, windId: 'calm' } },
    { id: 'crosswind_lane', mode: 'gap', xp: 20, setup: { mode: 'gap', windId: 'cross_right', airDrag: true } }
  ];

  function getMission(id) {
    for (var index = 0; index < MISSIONS.length; index++) {
      if (MISSIONS[index].id === id) return MISSIONS[index];
    }
    return null;
  }

  // Fewest pumps (0..sim.pumps) that still reach targetM of air, by re-running
  // the same setup; null if none does.
  function missionMinPumps(sim, targetM) {
    var inputs = sim.inputs || {};
    for (var pumps = 0; pumps <= finite(sim.pumps, 0); pumps++) {
      var trial = pumps === sim.pumps ? sim : quickSim('halfpipe', inputs, { pumps: pumps });
      if (trial.hasAir && trial.hAir >= targetM - 1e-9) return pumps;
    }
    return null;
  }

  // { id, done, value, reason } for one finished run. info.guess is the
  // hang-time prediction typed before the run (moon_hang only).
  function checkMission(id, sim, info) {
    var mission = getMission(id);
    if (!mission || !sim) return null;
    info = info || {};
    var result = { id: id, done: false, value: null, reason: 'not_yet' };
    if (sim.mode !== mission.mode) {
      result.reason = 'mode';
      return result;
    }
    if (id === 'spin_540') {
      result.value = sim.hasAir ? Math.round(finite(sim.completed, 0)) : 0;
      result.done = !!sim.runSuccessful && sim.landingHalfTurns === 3;
    } else if (id === 'tuck_360') {
      result.value = Math.round(finite(sim.spinRate, 0));
      var landed360 = !!sim.runSuccessful && sim.landingHalfTurns === 2;
      result.done = landed360 && sim.spinRate <= MISSION_TUCK_MAX_SPIN + 1e-9;
      if (landed360 && !result.done) result.reason = 'too_fast';
    } else if (id === 'fewest_pumps') {
      result.value = sim.pumps;
      if (sim.hasAir && sim.hAir >= MISSION_AIR_TARGET_M - 1e-9) {
        result.done = missionMinPumps(sim, MISSION_AIR_TARGET_M) === sim.pumps;
        if (!result.done) result.reason = 'fewer_possible';
      }
    } else if (id === 'small_drop_air') {
      result.value = sim.hasAir ? sim.hAir : 0;
      result.done = sim.dropHeightM <= MISSION_SMALL_DROP_M + 1e-9 && !!sim.hasAir && sim.hAir >= MISSION_SMALL_DROP_AIR_M - 1e-9;
    } else if (id === 'moon_hang') {
      result.value = sim.airTime;
      var guess = Number(info.guess);
      var hasGuess = info.guess != null && String(info.guess).trim() !== '' && Number.isFinite(guess) && guess > 0;
      if (Math.abs(sim.gravity - 1.62) > 1e-6) result.reason = 'not_moon';
      else if (!sim.hasAir) result.reason = 'no_air';
      else if (!hasGuess) result.reason = 'no_guess';
      else {
        result.guessErrorPct = Math.abs(guess - sim.airTime) / Math.max(0.000001, sim.airTime) * 100;
        result.done = result.guessErrorPct <= MISSION_GUESS_TOLERANCE_PCT;
        if (!result.done) result.reason = 'guess_off';
      }
    } else if (id === 'flat_target') {
      result.value = sim.moves ? sim.stopDistanceM : 0;
      result.done = !!sim.moves && Math.abs(sim.stopDistanceM - MISSION_FLAT_TARGET_M) <= 1;
    } else if (id === 'rough_stop') {
      result.value = sim.moves ? sim.stopDistanceM : 0;
      result.done = !!sim.surface && sim.surface.id === 'rough' && sim.pushForceN >= MISSION_ROUGH_MIN_PUSH_N - 1e-9 &&
        !!sim.moves && sim.stopDistanceM <= MISSION_ROUGH_MAX_STOP_M;
    } else if (id === 'gap_drag') {
      result.value = sim.rangeFt;
      result.done = !!sim.airDrag && sim.gapFt >= MISSION_GAP_FT - 1e-9 && !!sim.runSuccessful;
    } else if (id === 'soft_landing') {
      result.value = sim.hasLandingContact ? getLandingPeakG(sim) : null;
      result.done = sim.gapFt >= MISSION_GAP_FT - 1e-9 && !!sim.runSuccessful && !!sim.hasLandingContact &&
        getLandingPeakG(sim) < MISSION_MAX_LANDING_G;
    } else if (id === 'crosswind_lane') {
      result.value = Math.abs(finite(sim.crossDriftFt, 0));
      result.done = !!sim.airDrag && !!sim.wind && Math.abs(sim.wind.zMps) > 0 && !!sim.runSuccessful;
    }
    if (result.done) result.reason = 'done';
    return result;
  }

  // ---- Stage C P4-2 scaffold level: Simple (6-8), Standard (9-10), Extended
  // (11-12 / AP). ctx.gradeBand is 'k2' | 'g35' | 'g68' | 'g912'; grades 11
  // and 12 are told apart from 9 and 10 by ctx.gradeLevel. ----
  var SCAFFOLD_LEVELS = ['simple', 'standard', 'extended'];
  function scaffoldLevelFor(gradeBand, gradeLevel, override) {
    if (SCAFFOLD_LEVELS.indexOf(override) !== -1) return override;
    var band = String(gradeBand || '').toLowerCase();
    if (band === 'k2' || band === 'g35' || band === 'g68') return 'simple';
    if (band === 'g912') {
      return /\b(11|12)(th)?\b|college|graduate|university|\bap\b/i.test(String(gradeLevel || '')) ? 'extended' : 'standard';
    }
    return 'standard';
  }

  // ---- Stage C P5-1 sonification, adapted from stem_tool_physics.js
  // physSonifyPlan: pitch follows height on a log scale (speed on flat
  // ground, which has no height), pan follows x, clicks mark landings. Times
  // are model seconds divided by the playback speed, so the sound stays in
  // step with the animation. ----
  var SK_SONIFY = { fMin: 220, fMax: 880, panMax: 0.8, maxSamples: 240, perSecond: 30, landingHz: 150, takeoffHz: 200, stopHz: 120 };
  function skateSonifyPlan(sim, opts) {
    opts = opts || {};
    if (!sim || !(finite(sim.motionDuration, 0) > 0)) return null;
    var speed = finite(opts.speed, 1) > 0 ? finite(opts.speed, 1) : 1;
    var from = clamp(finite(opts.fromProgress, 0), 0, 1);
    var total = sim.motionDuration;
    var startT = from * total;
    if (total - startT < 0.000001) return null;
    var byHeight = sim.mode !== 'flat';
    // Whole-run extents, so a plan that starts mid-run uses the same scale.
    var minY = Infinity;
    var maxY = -Infinity;
    var minX = Infinity;
    var maxX = -Infinity;
    var maxV = 0;
    for (var e = 0; e <= 200; e++) {
      var probe = sampleModel(sim, e / 200);
      minY = Math.min(minY, finite(probe.y, 0));
      maxY = Math.max(maxY, finite(probe.y, 0));
      minX = Math.min(minX, finite(probe.x, 0));
      maxX = Math.max(maxX, finite(probe.x, 0));
      maxV = Math.max(maxV, finite(probe.speedMps, 0));
    }
    var floorY = sim.mode === 'gap' ? Math.min(0, minY) : 0;
    var ref = byHeight ? Math.max(0.5, maxY - floorY) : Math.max(0.1, maxV);
    var ratio = SK_SONIFY.fMax / SK_SONIFY.fMin;
    function freqAt(sample) {
      var value = byHeight ? finite(sample.y, 0) - floorY : finite(sample.speedMps, 0);
      return SK_SONIFY.fMin * Math.pow(ratio, clamp(value / ref, 0, 1));
    }
    function panAt(sample) {
      var x = finite(sample.x, 0);
      if (sim.mode === 'halfpipe') return clamp(SK_SONIFY.panMax * x / HALFPIPE_HALF_WIDTH_M, -SK_SONIFY.panMax, SK_SONIFY.panMax);
      return maxX - minX > 0.000001 ? SK_SONIFY.panMax * (2 * clamp((x - minX) / (maxX - minX), 0, 1) - 1) : 0;
    }
    var count = Math.max(2, Math.min(SK_SONIFY.maxSamples, Math.ceil((total - startT) * SK_SONIFY.perSecond) + 1));
    var samples = [];
    for (var i = 0; i < count; i++) {
      var modelT = startT + (total - startT) * i / (count - 1);
      var sample = sampleModel(sim, modelT / total);
      samples.push({ t: (modelT - startT) / speed, modelT: modelT, freq: freqAt(sample), pan: panAt(sample) });
    }
    var events = [];
    if (sim.mode === 'halfpipe') {
      (sim.airs || []).forEach(function(air) {
        events.push({ kind: 'takeoff', modelT: air.takeoffT, freq: SK_SONIFY.takeoffHz });
        if (Number.isFinite(air.landT)) events.push({ kind: 'landing', modelT: air.landT, freq: SK_SONIFY.landingHz });
      });
    } else if (sim.mode === 'gap') {
      events.push({ kind: 'takeoff', modelT: sim.approachTime, freq: SK_SONIFY.takeoffHz });
      if (sim.hasLandingContact || sim.hasTerrainContact) {
        events.push({ kind: 'landing', modelT: sim.approachTime + sim.airTime, freq: SK_SONIFY.landingHz });
      }
    } else if (sim.moves) {
      events.push({ kind: 'stop', modelT: total, freq: SK_SONIFY.stopHz });
    }
    var cues = events.filter(function(cue) {
      return Number.isFinite(cue.modelT) && cue.modelT >= startT - 0.000001 && cue.modelT <= total + 0.000001;
    }).map(function(cue) {
      return { t: Math.max(0, cue.modelT - startT) / speed, modelT: cue.modelT, kind: cue.kind, freq: cue.freq };
    }).sort(function(a, b) { return a.t - b.t; });
    return {
      duration: (total - startT) / speed,
      samples: samples,
      cues: cues,
      pitchFollows: byHeight ? 'height' : 'speed',
      reference: ref,
      speed: speed,
      fromProgress: from
    };
  }

  // Schedules a plan on a Web Audio context (same shape as physSonifyPlay).
  // Returns { duration, stop } or null; onEnd runs once.
  function skateSonifyPlay(plan, ac, onEnd) {
    if (!plan || !ac || typeof ac.createOscillator !== 'function' || typeof ac.createGain !== 'function') return null;
    var nodes = [];
    var ended = false;
    var timer = null;
    function finish() {
      if (ended) return;
      ended = true;
      if (timer) clearTimeout(timer);
      if (typeof onEnd === 'function') { try { onEnd(); } catch (err) {} }
    }
    try {
      var t0 = ac.currentTime + 0.06;
      var end = t0 + plan.duration;
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      var pan = typeof ac.createStereoPanner === 'function' ? ac.createStereoPanner() : null;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(plan.samples[0].freq, t0);
      if (pan) pan.pan.setValueAtTime(plan.samples[0].pan, t0);
      for (var i = 1; i < plan.samples.length; i++) {
        osc.frequency.exponentialRampToValueAtTime(plan.samples[i].freq, t0 + plan.samples[i].t);
        if (pan) pan.pan.linearRampToValueAtTime(plan.samples[i].pan, t0 + plan.samples[i].t);
      }
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.08, t0 + 0.04);
      gain.gain.setValueAtTime(0.08, Math.max(t0 + 0.05, end - 0.06));
      gain.gain.exponentialRampToValueAtTime(0.0001, end + 0.05);
      osc.connect(gain);
      if (pan) { gain.connect(pan); pan.connect(ac.destination); } else gain.connect(ac.destination);
      osc.start(t0);
      osc.stop(end + 0.08);
      nodes.push({ osc: osc, gain: gain });
      plan.cues.forEach(function(cue) {
        var o = ac.createOscillator();
        var g = ac.createGain();
        var at = t0 + cue.t;
        var length = cue.kind === 'landing' ? 0.05 : 0.08;
        o.type = cue.kind === 'landing' ? 'square' : 'triangle';
        o.frequency.setValueAtTime(cue.freq, at);
        g.gain.setValueAtTime(cue.kind === 'landing' ? 0.09 : 0.05, at);
        g.gain.exponentialRampToValueAtTime(0.001, at + length);
        o.connect(g);
        g.connect(ac.destination);
        o.start(at);
        o.stop(at + length + 0.02);
        nodes.push({ osc: o, gain: g });
      });
      timer = setTimeout(finish, (plan.duration + 0.4) * 1000);
    } catch (err) {
      finish();
      return null;
    }
    return {
      duration: plan.duration,
      stop: function() {
        if (ended) return;
        nodes.forEach(function(node) {
          try { node.gain.gain.cancelScheduledValues(0); node.gain.gain.setValueAtTime(0.0001, ac.currentTime); } catch (err) {}
          try { node.osc.stop(); } catch (err) {}
          try { node.osc.disconnect(); } catch (err) {}
        });
        finish();
      }
    };
  }

  window.__alloSkatePhysicsPure = {
    simHalfpipe: simHalfpipe,
    simGapJump: simGapJump,
    simFlatGround: simFlatGround,
    sampleHalfpipe: sampleHalfpipe,
    sampleGapJump: sampleGapJump,
    sampleFlat: sampleFlat,
    sampleModel: sampleModel,
    runSimulation: runSimulation,
    hydrateSim: hydrateSim,
    simRecord: simRecord,
    halfpipeTrackPoint: halfpipeTrackPoint,
    halfTurnAlignmentError: halfTurnAlignmentError,
    forcePixelsPerNewton: forcePixelsPerNewton,
    phaseLabel: phaseLabel,
    trajectoryPointAt: trajectoryPointAt,
    transitionCanvasRotation: transitionCanvasRotation,
    wrappedAngleError: wrappedAngleError,
    halfpipeY: halfpipeY,
    getSurface: getSurface,
    getWind: getWind,
    getBodyPosition: getBodyPosition,
    getPumpTiming: getPumpTiming,
    describeSimulationChange: describeSimulationChange,
    phaseLearningText: phaseLearningText,
    modelAcceleration: modelAcceleration,
    freeBodyDiagram: freeBodyDiagram,
    modelTimeSeries: modelTimeSeries,
    linearFit: linearFit,
    runValues: runValues,
    buildCsv: buildCsv,
    logColumns: LOG_COLUMNS,
    predictionPrompts: PREDICTION_PROMPTS,
    predictionPromptsFor: predictionPromptsFor,
    evaluatePrediction: evaluatePrediction,
    judgePrediction: judgePrediction,
    misconceptionIds: MISCONCEPTION_IDS,
    investigations: INVESTIGATIONS,
    matchPlanStep: matchPlanStep,
    checkCer: function(entry, keywords) { return checkCer(entry, keywords); },
    simulationSignature: function(candidate) { return simulationSignature(candidate); },
    investigationText: function(id) { return investigationText(id); },
    missions: MISSIONS,
    getMission: getMission,
    checkMission: checkMission,
    missionMinPumps: missionMinPumps,
    missionText: function(id) { return missionText(id); },
    scaffoldLevelFor: scaffoldLevelFor,
    sonifyPlan: skateSonifyPlan,
    sonifyPlay: skateSonifyPlay,
    sonifySettings: SK_SONIFY,
    narrationText: function(sim, sample) { return narrationText(sim, sample); },
    plainSummary: function(sim) { return plainSummary(sim); },
    vocabulary: function(level) { return vocabularyList(level); },
    reportCsv: function(state) { return buildReportCsv(state); },
    reportHtml: function(state, meta) { return buildReportHtml(state, meta); },
    logEntryOutcome: function(entry) { return logEntryOutcome(entry); },
    lockableKeys: function() { return TEACHER_LOCK_KEYS.slice(); },
    constants: {
      halfpipeHalfWidthM: HALFPIPE_HALF_WIDTH_M,
      halfpipeStepS: HALFPIPE_DT_S,
      pumpStrokeM: PUMP_STROKE_M,
      flatPushTimeS: FLAT_PUSH_TIME_S,
      playbackSpeeds: PLAYBACK_SPEEDS.slice(),
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
      '.skatelab-shell .sk-playback{display:flex;align-items:center;gap:6px;flex-wrap:wrap;color:var(--sk-muted);font-size:.74rem;font-weight:750}.skatelab-shell .sk-playback select{width:auto;min-width:0;padding:5px 8px}.skatelab-shell .sk-ledger-work{background:var(--sk-green)}.skatelab-shell .sk-ledger-potential{background:#7aa7ff}.skatelab-shell .sk-energy-list{margin:8px 0 0;padding:0;list-style:none;display:grid;gap:3px;font-size:.76rem;color:var(--sk-muted);font-variant-numeric:tabular-nums}.skatelab-shell .sk-energy-list strong{color:var(--sk-text)}.skatelab-shell .sk-pass-peaks{margin:6px 0 0;font-size:.74rem;color:var(--sk-muted);line-height:1.45}',
      '@container(max-width:520px){.skatelab-shell .sk-stage-actions{width:100%;justify-content:flex-start}.skatelab-shell .sk-stage-actions .sk-secondary{width:auto}.skatelab-shell .sk-telemetry-detail{display:none}.skatelab-shell .sk-timeline-control{padding-bottom:12px}.skatelab-shell .sk-phase-marker small{display:none}.skatelab-shell .sk-phase-marker{bottom:5px}.skatelab-shell .sk-phase-jumps{gap:5px}.skatelab-shell .sk-phase-jump{flex:1 1 auto;padding-inline:7px}}',
      '@container(max-width:380px){.skatelab-shell .sk-canvas{aspect-ratio:1/1}.skatelab-shell .sk-metrics{grid-template-columns:1fr}.skatelab-shell .sk-live-telemetry span{padding-inline:5px}}',
      '@media(any-pointer:coarse){.skatelab-shell button,.skatelab-shell summary,.skatelab-shell select,.skatelab-shell input[type=range],.skatelab-shell .sk-radio-grid span{min-block-size:44px!important;touch-action:manipulation}.skatelab-shell input[type=range]{block-size:44px}}',
      '.skatelab-shell{--sk-bg:var(--allo-stem-canvas,#0b1220);--sk-panel:var(--allo-stem-panel,#172033);--sk-text:var(--allo-stem-text,#edf5ff);--sk-muted:var(--allo-stem-text-soft,#a8b5c7);--sk-border:var(--allo-stem-border,#34425a);--sk-accent:#f6b83f;--sk-cyan:#4ed7e8;--sk-green:#5ee092;--sk-red:#fb7185;--sk-compare:#a78bfa;color:var(--sk-text);max-width:1240px;margin:0 auto;padding:18px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;container-type:inline-size}',
      // ★ Was `html:not(.theme-contrast)`, a guard that never fired — the theme
      // class lives on <main>, never on <html>, so contrast got this dark card
      // instead of its own black-and-yellow. The .theme-contrast rule below is
      // the real exclusion and wins on specificity.
      '.skatelab-shell{--sk-bg:#0f172a;--sk-panel:#1e293b;--sk-text:#e2e8f0;--sk-muted:#b6c3d5;--sk-border:#475569;--sk-cyan:#67e8f9;--sk-green:#86efac;--sk-red:#fda4af;--sk-compare:#c4b5fd;background:#0f172a}',
      '.theme-contrast .skatelab-shell{--sk-bg:#000000;--sk-panel:#000000;--sk-text:#ffff00;--sk-muted:#ffff00;--sk-border:#ffff00;--sk-cyan:#00ffff;--sk-green:#00ff00;--sk-red:#ff6b6b;--sk-compare:#ffffff;background:#000000}',
      '.theme-contrast .skatelab-shell .sk-run{background-image:none!important}',
      '.skatelab-shell *{box-sizing:border-box}.skatelab-shell button,.skatelab-shell input,.skatelab-shell select,.skatelab-shell textarea,.skatelab-shell summary{font:inherit}.skatelab-shell button,.skatelab-shell summary,.skatelab-shell input,.skatelab-shell select{min-block-size:40px}.skatelab-shell button:focus-visible,.skatelab-shell input:focus-visible,.skatelab-shell select:focus-visible,.skatelab-shell textarea:focus-visible,.skatelab-shell summary:focus-visible{outline:3px solid var(--sk-cyan);outline-offset:3px}',
      '.sk-header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:15px}.sk-heading{display:flex;gap:12px;align-items:flex-start}.sk-back{border:1px solid var(--sk-border);background:transparent;color:var(--sk-text);border-radius:11px;padding:8px 11px;cursor:pointer}.sk-title{margin:0;font-size:clamp(1.45rem,3vw,2.15rem);line-height:1.02;letter-spacing:-.03em}.sk-kicker{margin:6px 0 0;color:var(--sk-muted);font-size:.9rem}.sk-view-switch{display:flex;gap:5px;padding:4px;border:1px solid var(--sk-border);background:color-mix(in srgb,var(--sk-panel) 84%,transparent);border-radius:13px}.sk-view-switch button{border:0;background:transparent;color:var(--sk-muted);border-radius:9px;padding:7px 12px;font-weight:750;cursor:pointer}.sk-view-switch button[aria-pressed=true]{background:var(--sk-accent);color:#251600;box-shadow:0 3px 12px rgba(246,184,63,.24)}',
      '.sk-workbench{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(300px,350px);gap:15px;align-items:start}.sk-stage,.sk-controls,.sk-panel,.sk-metric{border:1px solid var(--sk-border);background:color-mix(in srgb,var(--sk-panel) 91%,transparent);border-radius:17px}.sk-stage{padding:11px;min-width:0;background:linear-gradient(160deg,color-mix(in srgb,var(--sk-panel) 96%,transparent),color-mix(in srgb,var(--sk-bg) 90%,transparent))}.sk-canvas-frame{position:relative;overflow:hidden;border-radius:14px;background:#06101e;box-shadow:inset 0 0 0 1px rgba(148,163,184,.26),0 12px 34px rgba(2,8,20,.20)}.sk-canvas{display:block;width:100%;height:auto;aspect-ratio:16/9}.sk-stage-toolbar{display:flex;align-items:center;justify-content:space-between;gap:9px;flex-wrap:wrap;padding:10px 2px 4px}.sk-live-telemetry{display:flex;align-items:center;gap:0;flex-wrap:wrap;color:var(--sk-muted);font-size:.74rem;font-variant-numeric:tabular-nums}.sk-live-telemetry span{padding:3px 8px;border-right:1px solid var(--sk-border)}.sk-live-telemetry span:first-child{padding-left:0}.sk-live-telemetry span:last-child{border-right:0}.sk-live-telemetry .sk-phase{color:var(--sk-cyan);font-weight:850;text-transform:uppercase;letter-spacing:.045em}.sk-stage-legend{display:block;padding:6px 2px 2px;font-size:.72rem;color:var(--sk-muted);line-height:1.4}.sk-stage-legend b{color:var(--sk-text)}.sk-timeline{display:grid;grid-template-columns:minmax(120px,190px) minmax(0,1fr);align-items:center;gap:11px;padding:9px 10px;margin:3px 0;border-radius:11px;background:color-mix(in srgb,var(--sk-bg) 75%,transparent)}.sk-timeline label{display:flex;justify-content:space-between;gap:8px;color:var(--sk-muted);font-size:.76rem;font-weight:750}.sk-timeline output{color:var(--sk-cyan);font-variant-numeric:tabular-nums}.sk-timeline-control{position:relative;min-width:0;padding-bottom:24px}.sk-timeline input{display:block;width:100%;accent-color:var(--sk-cyan)}.sk-phase-markers{position:absolute;left:7px;right:7px;bottom:0;height:20px;pointer-events:none}.sk-phase-marker{position:absolute;bottom:0;display:grid;justify-items:center;gap:1px;transform:translateX(-50%);color:var(--sk-muted);white-space:nowrap}.sk-phase-marker:first-child{transform:none}.sk-phase-marker:last-child{transform:translateX(-100%)}.sk-phase-marker i{display:block;width:2px;height:6px;background:var(--sk-cyan);opacity:.8}.sk-phase-marker small{font-size:.7rem;line-height:1.1;text-transform:uppercase;letter-spacing:.035em}.sk-sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}.sk-canvas-summary{margin:8px 0 0;padding:8px 10px;border-left:3px solid var(--sk-cyan);background:color-mix(in srgb,var(--sk-cyan) 7%,transparent);font-size:.8rem;line-height:1.45;color:var(--sk-muted)}',
      '.sk-timeline{align-items:start}.sk-trace-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap;min-height:18px;margin-bottom:2px;color:var(--sk-muted);font-size:.7rem;font-weight:750}.sk-trace-head span:last-child{color:var(--sk-text);font-variant-numeric:tabular-nums;text-align:right}.sk-timeline-trace{display:block;width:100%;height:48px;margin:0 0 2px;overflow:visible}.sk-trace-axis,.sk-trace-reference,.sk-trace-peak,.sk-trace-previous,.sk-trace-modeled,.sk-trace-cursor,.sk-trace-current{vector-effect:non-scaling-stroke}.sk-trace-axis{stroke:var(--sk-border);stroke-width:1}.sk-trace-reference{stroke:color-mix(in srgb,var(--sk-muted) 44%,transparent);stroke-width:1}.sk-trace-peak{stroke:var(--sk-muted);stroke-width:1;stroke-dasharray:3 3}.sk-trace-previous{fill:none;stroke:var(--sk-compare);stroke-width:1.5;stroke-dasharray:3 4;stroke-linecap:round;stroke-linejoin:round}.sk-trace-modeled{fill:none;stroke:var(--sk-red);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.sk-trace-cursor{stroke:var(--sk-text);stroke-width:1;opacity:.46}.sk-trace-current{stroke:var(--sk-text);stroke-width:3;stroke-linecap:round}',
      '.sk-controls{padding:14px;display:grid;gap:13px;background:linear-gradient(180deg,color-mix(in srgb,var(--sk-panel) 96%,transparent),color-mix(in srgb,var(--sk-panel) 87%,transparent))}.sk-mode-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.sk-mode-tabs button{border:1px solid var(--sk-border);background:transparent;color:var(--sk-muted);border-radius:10px;padding:8px;font-weight:800;cursor:pointer}.sk-mode-tabs button[aria-selected=true]{border-color:var(--sk-accent);background:color-mix(in srgb,var(--sk-accent) 16%,transparent);color:var(--sk-text)}.sk-control-group{display:grid;gap:11px}.sk-control{display:grid;gap:5px}.sk-control-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;font-size:.82rem;font-weight:750}.sk-control-head output{max-width:58%;color:var(--sk-cyan);font-variant-numeric:tabular-nums;text-align:right;font-size:.75rem}.sk-help{font-size:.72rem;line-height:1.4;color:var(--sk-muted);margin:0}.skatelab-shell input[type=range]{width:100%;accent-color:var(--sk-accent)}.skatelab-shell select,.skatelab-shell input[type=number],.skatelab-shell textarea{width:100%;border:1px solid var(--sk-border);background:var(--sk-bg);color:var(--sk-text);border-radius:9px;padding:8px 10px}',
      '.sk-radio-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(78px,1fr));gap:6px}.sk-radio-grid label{position:relative}.sk-radio-grid input{position:absolute;opacity:0;pointer-events:none}.sk-radio-grid span{display:flex;min-height:40px;align-items:center;justify-content:center;text-align:center;border:1px solid var(--sk-border);border-radius:9px;padding:6px;color:var(--sk-muted);font-size:.74rem;font-weight:750;cursor:pointer}.sk-radio-grid input:checked+span{border-color:var(--sk-cyan);background:color-mix(in srgb,var(--sk-cyan) 13%,transparent);color:var(--sk-text);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--sk-cyan) 42%,transparent)}.sk-radio-grid input:focus-visible+span{outline:3px solid var(--sk-cyan);outline-offset:3px}.sk-checks{display:grid;grid-template-columns:1fr 1fr;gap:8px}.sk-check{display:flex;align-items:center;gap:7px;color:var(--sk-muted);font-size:.78rem}.sk-check input,.sk-switch input{accent-color:var(--sk-accent);inline-size:18px;block-size:18px}.sk-switch{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;padding:9px 10px;border-radius:10px;background:color-mix(in srgb,var(--sk-bg) 60%,transparent);color:var(--sk-muted);font-size:.78rem;font-weight:750}.sk-switch output{color:var(--sk-cyan);font-size:.72rem;text-transform:uppercase;letter-spacing:.04em}',
      '.sk-advanced{border-top:1px solid var(--sk-border);padding-top:7px}.sk-advanced summary{cursor:pointer;color:var(--sk-text);font-size:.8rem;font-weight:800}.sk-advanced-body{display:grid;gap:10px;padding-top:10px}.sk-model-note{margin:0;padding:9px 10px;border-left:3px solid var(--sk-accent);background:color-mix(in srgb,var(--sk-accent) 7%,transparent);color:var(--sk-muted);font-size:.73rem;line-height:1.45}.sk-actions{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end}.sk-run{border:0;border-radius:11px;background:linear-gradient(135deg,#ffc857,#e79024);color:#281600;font-weight:900;padding:10px 16px;cursor:pointer;box-shadow:0 8px 22px rgba(231,144,36,.24)}.sk-run:disabled{opacity:.55;cursor:not-allowed;box-shadow:none}.sk-secondary{border:1px solid var(--sk-border);border-radius:10px;background:transparent;color:var(--sk-text);padding:8px 11px;font-weight:750;cursor:pointer}.sk-status{min-height:1.4em;padding:8px 9px;border-radius:9px;background:color-mix(in srgb,var(--sk-bg) 55%,transparent);font-size:.78rem;color:var(--sk-muted);line-height:1.4}.sk-status[data-result=success]{color:var(--sk-green)}.sk-status[data-result=miss]{color:var(--sk-red)}',
      '.sk-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:9px;margin-top:12px}.sk-metric{position:relative;overflow:hidden;padding:11px 12px;min-width:0}.sk-metric:before{content:"";position:absolute;inset:0 auto 0 0;width:3px;background:var(--sk-cyan);opacity:.72}.sk-metric-value{display:block;font-size:clamp(1rem,2vw,1.25rem);font-weight:850;color:var(--sk-text);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sk-metric-label{display:block;margin-top:3px;color:var(--sk-muted);font-size:.7rem;text-transform:uppercase;letter-spacing:.055em}.sk-below{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr);gap:12px;margin-top:12px}.sk-panel{padding:14px;min-width:0}.sk-panel h3{margin:0 0 9px;font-size:.92rem}.sk-ledger-row{display:flex;height:12px;border-radius:999px;overflow:hidden;background:color-mix(in srgb,var(--sk-border) 55%,transparent);margin:8px 0}.sk-ledger-mechanical{background:var(--sk-cyan)}.sk-ledger-thermal{background:var(--sk-accent)}.sk-ledger-wind{background:var(--sk-compare)}.sk-ledger-labels{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:.75rem;color:var(--sk-muted)}.sk-equation{display:block;margin-top:10px;padding:10px;border-radius:9px;background:var(--sk-bg);color:var(--sk-text);font-size:.76rem;line-height:1.58;white-space:normal}',
      '.sk-question{margin:0 0 10px;color:var(--sk-muted);font-size:.82rem;line-height:1.45}.sk-estimate{display:grid;grid-template-columns:auto minmax(90px,140px);align-items:center;gap:8px;margin-bottom:9px}.sk-estimate label{font-size:.78rem;font-weight:750}.sk-error{color:var(--sk-red);font-size:.75rem;margin:0}.sk-details{margin-top:12px;border-top:1px solid var(--sk-border);padding-top:10px}.sk-details summary{cursor:pointer;font-weight:800;color:var(--sk-text);padding:2px 0}.sk-notes{display:grid;gap:8px;margin-top:10px}.sk-table-wrap{overflow-x:auto}.sk-table{width:100%;border-collapse:collapse;font-size:.74rem}.sk-table th,.sk-table td{text-align:left;padding:7px 6px;border-bottom:1px solid var(--sk-border);white-space:nowrap}.sk-table th{color:var(--sk-muted);font-weight:750}.sk-result-good{color:var(--sk-green);font-weight:800}.sk-result-miss{color:var(--sk-red);font-weight:800}.sk-footer-note{margin:12px 2px 0;color:var(--sk-muted);font-size:.72rem;line-height:1.4}',
      '@container(max-width:900px){.sk-workbench{grid-template-columns:1fr}.sk-below{grid-template-columns:1fr}.sk-controls{order:2}.sk-stage{order:1}}@container(max-width:820px){.sk-workbench{grid-template-columns:1fr}.sk-below{grid-template-columns:1fr}.sk-metrics{grid-template-columns:repeat(auto-fit,minmax(135px,1fr))}}@container(max-width:520px){.skatelab-shell{padding:9px}.sk-header{display:grid}.sk-view-switch{width:100%}.sk-view-switch button{flex:1}.sk-canvas{aspect-ratio:4/3}.sk-stage-toolbar{align-items:flex-start}.sk-live-telemetry{width:100%}.sk-timeline{grid-template-columns:1fr;gap:5px}.sk-checks{grid-template-columns:1fr}.sk-radio-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sk-actions{grid-template-columns:1fr}.sk-secondary{width:100%}.sk-estimate{grid-template-columns:1fr}.sk-title{font-size:1.45rem}.sk-metrics{grid-template-columns:1fr 1fr}.sk-control-head{align-items:flex-start}.sk-control-head output{max-width:55%}}',
      // Stage B: linked graphs, free-body panel, predictions, log tools, investigations.
      '.skatelab-shell{--sk-pe:#7aa7ff}.theme-contrast .skatelab-shell{--sk-pe:#ff9bff}.sk-e-ke,.sk-m-height,.sk-fbd-push,.sk-grp-0{--sk-series:var(--sk-cyan)}.sk-e-pe{--sk-series:var(--sk-pe)}.sk-e-heat,.sk-m-accel,.sk-fbd-friction,.sk-fbd-staticFriction,.sk-fbd-air,.sk-grp-1{--sk-series:var(--sk-accent)}.sk-e-work,.sk-m-speed,.sk-fbd-normal,.sk-fbd-support,.sk-grp-2{--sk-series:var(--sk-green)}.sk-e-wind,.sk-m-prev,.sk-grp-3{--sk-series:var(--sk-compare)}.sk-e-total,.sk-fbd-net{--sk-series:var(--sk-text)}.sk-fbd-weight{--sk-series:var(--sk-red)}',
      '.sk-linked{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}.sk-linked>*{min-width:0}.sk-linked-wide{grid-column:1/-1}.sk-linked-panel,.sk-inv-body,.sk-log-tools,.sk-predict,.sk-cer-box,.sk-rubric,.sk-ebars{grid-template-columns:minmax(0,1fr)}.sk-linked-panel{display:grid;gap:6px;align-content:start}.sk-num-table th[scope=row]{white-space:normal}.skatelab-shell .sk-table-wrap:focus-visible{outline:3px solid var(--sk-cyan);outline-offset:2px}.sk-linked-panel h3{margin:0}.sk-ebars{list-style:none;margin:0;padding:0;display:grid;gap:5px}.sk-ebar{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(60px,1fr) auto;align-items:center;gap:8px;font-size:.74rem;color:var(--sk-muted)}.sk-ebar-track{height:10px;border-radius:999px;background:color-mix(in srgb,var(--sk-border) 55%,transparent);overflow:hidden}.sk-ebar-fill{display:block;height:100%;border-radius:999px;background:var(--sk-series)}.sk-ebar-fill.is-negative{background-image:repeating-linear-gradient(45deg,transparent 0 3px,rgba(0,0,0,.5) 3px 6px)}.sk-ebar-value{color:var(--sk-text);font-variant-numeric:tabular-nums;min-width:5em;text-align:right}',
      '.sk-chart{display:block;width:100%;height:auto;overflow:visible}.sk-chart-scrub{display:block;border-radius:10px;cursor:pointer}.sk-chart-scrub:focus-visible{outline:3px solid var(--sk-cyan);outline-offset:3px}.sk-chart-grid{stroke:color-mix(in srgb,var(--sk-border) 75%,transparent);stroke-width:1}.sk-chart-zero,.sk-chart-axis{stroke:var(--sk-muted);stroke-width:1}.sk-chart-tick{fill:var(--sk-muted);font-size:12px;font-family:inherit}.sk-chart-line{fill:none;stroke:var(--sk-series);stroke-width:2.2;stroke-linejoin:round;stroke-linecap:round}.sk-chart-line.is-dashed{stroke-dasharray:7 4}.sk-chart-line.sk-e-heat{stroke-dasharray:2 3}.sk-chart-line.sk-e-work,.sk-chart-line.sk-e-wind{stroke-dasharray:9 3 2 3}.sk-chart-line.sk-e-total{stroke-width:3}.sk-chart-cursor{stroke:var(--sk-text);stroke-width:1.5;stroke-dasharray:3 3}.sk-chart-dot{fill:var(--sk-series);stroke:var(--sk-panel);stroke-width:1.5}.sk-chart-legend{display:flex;flex-wrap:wrap;gap:4px 12px;list-style:none;margin:0;padding:0;font-size:.72rem;color:var(--sk-muted)}.sk-legend-swatch{display:inline-block;width:16px;height:4px;border-radius:2px;margin-right:5px;vertical-align:middle;background:var(--sk-series)}.sk-legend-swatch.is-dashed{background:repeating-linear-gradient(90deg,var(--sk-series) 0 5px,transparent 5px 8px)}',
      '.sk-numbers summary{cursor:pointer;font-weight:800;font-size:.8rem;color:var(--sk-text)}.sk-num-table{width:100%;border-collapse:collapse;font-size:.72rem;margin-top:6px}.sk-num-table caption{text-align:left;color:var(--sk-muted);font-size:.72rem;padding:2px 0 4px}.sk-num-table th,.sk-num-table td{text-align:right;padding:5px 6px;border-bottom:1px solid var(--sk-border);white-space:nowrap;font-variant-numeric:tabular-nums;color:var(--sk-text)}.sk-num-table thead th{color:var(--sk-muted);font-weight:750}.sk-num-table th[scope=row]{text-align:left;font-weight:750}.sk-num-table tr.is-now{background:color-mix(in srgb,var(--sk-cyan) 14%,transparent)}.sk-fbd{display:block;width:100%;max-width:260px;height:auto;margin:2px auto}.sk-fbd-body{fill:var(--sk-muted)}.sk-fbd-shaft{stroke:var(--sk-series);stroke-width:3;stroke-linecap:round}.sk-fbd-shaft.is-dashed{stroke-dasharray:5 4;stroke-width:2}.sk-fbd-head{fill:var(--sk-series)}.sk-fbd-label{fill:var(--sk-text);font-size:13px;font-weight:800;font-family:inherit}.sk-fbd-list{list-style:none;margin:0;padding:0;display:grid;gap:4px;font-size:.76rem;color:var(--sk-text);line-height:1.4}.sk-fbd-verdict{margin:0;font-size:.76rem;color:var(--sk-text);line-height:1.45}',
      '.sk-motion-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.sk-motion-figure{margin:0;min-width:0}.sk-motion-figure figcaption{font-size:.74rem;color:var(--sk-muted)}.sk-motion-figure strong{color:var(--sk-text);font-variant-numeric:tabular-nums}.sk-predict{border:1px solid var(--sk-border);border-radius:12px;padding:10px;margin:0;display:grid;gap:8px;min-width:0;background:color-mix(in srgb,var(--sk-bg) 55%,transparent)}.sk-predict legend{font-weight:850;color:var(--sk-text);padding:0 4px;font-size:.84rem}.sk-predict p{margin:0;font-size:.78rem;line-height:1.45;color:var(--sk-text)}.sk-predict .sk-help{color:var(--sk-muted)}.sk-predict-options{display:grid;gap:6px}.sk-predict-option{display:flex;gap:8px;align-items:flex-start;padding:7px 9px;border:1px solid var(--sk-border);border-radius:9px;font-size:.78rem;color:var(--sk-text);cursor:pointer;min-block-size:40px}.sk-predict-option input{inline-size:18px;block-size:18px;min-block-size:0;accent-color:var(--sk-accent);margin:1px 0 0;flex:none}.sk-predict-option:has(input:checked){border-color:var(--sk-cyan);background:color-mix(in srgb,var(--sk-cyan) 12%,transparent)}.sk-link-button{justify-self:start;border:0;background:transparent;color:var(--sk-cyan);text-decoration:underline;font-weight:750;font-size:.76rem;padding:4px 0;cursor:pointer;text-align:left}',
      '.sk-log-title{margin:12px 0 6px;font-size:.88rem}.sk-log-tools{display:grid;gap:10px;margin-bottom:10px}.sk-log-selects{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end}.sk-log-selects label{display:grid;gap:3px;font-size:.72rem;color:var(--sk-muted);font-weight:750;min-width:0;flex:1 1 140px}.sk-log-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.sk-confirm{display:inline-flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:.76rem;color:var(--sk-text)}.sk-danger{border:1px solid var(--sk-red);border-radius:10px;background:transparent;color:var(--sk-red);padding:6px 10px;font-weight:800;cursor:pointer}.skatelab-shell .sk-small{padding:4px 8px;font-size:.72rem;width:auto}.sk-scatter-figure{margin:0}.sk-scatter{display:block;width:100%;height:auto;max-width:520px}.sk-scatter-point{fill:var(--sk-series);stroke:var(--sk-panel);stroke-width:1}.sk-scatter-fit{stroke:var(--sk-series);stroke-width:2;stroke-dasharray:6 4}.sk-scatter-fits{list-style:none;margin:4px 0 0;padding:0;font-size:.74rem;color:var(--sk-text);display:grid;gap:3px}.sk-scatter-axis{font-size:.72rem;color:var(--sk-muted)}.sk-prediction-record{margin:4px 0}.sk-tally{margin:4px 0;padding-left:18px}',
      '.sk-inv-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin:8px 0}.sk-inv-pick{display:grid;gap:2px;text-align:left;border:1px solid var(--sk-border);border-radius:11px;background:transparent;color:var(--sk-text);padding:8px 10px;cursor:pointer}.sk-inv-pick[aria-pressed=true]{border-color:var(--sk-accent);background:color-mix(in srgb,var(--sk-accent) 14%,transparent)}.sk-inv-ngss{font-size:.68rem;font-weight:850;color:var(--sk-cyan);letter-spacing:.03em}.sk-inv-name{font-weight:800;font-size:.8rem}.sk-inv-progress{font-size:.7rem;color:var(--sk-muted)}.sk-inv-body{display:grid;gap:8px;margin-top:8px;min-width:0}.sk-inv-body h4{margin:0;font-size:.95rem}.sk-inv-body h5{margin:6px 0 0;font-size:.82rem}.sk-inv-question{margin:0;font-size:.82rem;line-height:1.45}.sk-inv-vars{display:grid;grid-template-columns:minmax(0,auto) minmax(0,1fr);gap:4px 10px;margin:0;font-size:.76rem}.sk-inv-vars dt{color:var(--sk-muted);font-weight:750}.sk-inv-vars dd{margin:0;color:var(--sk-text)}.sk-inv-plan{margin:0;padding-left:20px;display:grid;gap:6px;font-size:.78rem}.sk-inv-plan li{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center}.sk-inv-step{font-weight:750;min-width:7em}.sk-inv-axes{display:flex;flex-wrap:wrap;gap:8px}.sk-cer-box{display:grid;gap:4px}.sk-cer-box label{font-weight:800;font-size:.8rem}.sk-frame{margin:0;font-size:.74rem;color:var(--sk-muted);line-height:1.4}.sk-frame span{font-weight:750}.sk-rubric{border:1px solid var(--sk-border);border-radius:10px;padding:8px 10px;margin:0;display:grid;gap:6px;min-width:0}.sk-rubric legend{font-weight:800;font-size:.8rem;padding:0 4px}.sk-rubric .sk-check{align-items:flex-start;color:var(--sk-text)}.sk-cer-feedback{margin:0;padding-left:18px;font-size:.78rem;color:var(--sk-text);display:grid;gap:4px}.sk-cer-feedback.is-complete{color:var(--sk-green)}.sk-hint{border-left:3px solid var(--sk-accent);padding-left:8px}',
      '@container(max-width:820px){.sk-linked{grid-template-columns:minmax(0,1fr)}.sk-motion-grid{grid-template-columns:minmax(0,1fr)}}@container(max-width:520px){.sk-ebar{grid-template-columns:minmax(0,1fr) auto}.sk-ebar-track{grid-column:1/-1;order:3}.sk-inv-vars{grid-template-columns:minmax(0,1fr)}.sk-inv-list{grid-template-columns:minmax(0,1fr)}}',
      '@media(forced-colors:active){.sk-chart-line,.sk-fbd-shaft,.sk-scatter-fit,.sk-chart-axis,.sk-chart-zero{stroke:CanvasText!important}.sk-chart-dot,.sk-fbd-head,.sk-scatter-point,.sk-fbd-body,.sk-chart-tick,.sk-fbd-label{fill:CanvasText!important}.sk-chart-cursor{stroke:Highlight!important}.sk-ebar-fill,.sk-legend-swatch{forced-color-adjust:none;background:CanvasText!important}.sk-predict,.sk-predict-option,.sk-inv-pick,.sk-rubric{border-color:CanvasText!important}}',
      '@media(forced-colors:active){.sk-trace-axis,.sk-trace-reference,.sk-trace-peak{stroke:CanvasText!important}.sk-trace-previous{stroke:LinkText!important}.sk-trace-modeled,.sk-trace-cursor,.sk-trace-current{stroke:Highlight!important}}',
      // Stage C: missions, explanation level, vocabulary, listening tools, teacher controls.
      '.sk-run[aria-disabled=true]{opacity:.62;cursor:not-allowed;box-shadow:none}.sk-predict-needed{margin:0}.sk-locked-note{color:var(--sk-text)}.sk-access{display:grid;gap:8px;margin:6px 0 4px;padding:8px 10px;border:1px solid var(--sk-border);border-radius:11px;background:color-mix(in srgb,var(--sk-bg) 60%,transparent);min-width:0}.sk-access-row{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center}.sk-access .sk-check{color:var(--sk-text)}.sk-step-panel{display:grid;gap:6px;min-width:0}.sk-step-buttons{display:flex;flex-wrap:wrap;gap:8px}.sk-step-text{margin:0;font-size:.78rem;line-height:1.45;color:var(--sk-text)}.sk-shortcuts summary{cursor:pointer;font-weight:800;font-size:.78rem;color:var(--sk-text)}.sk-shortcut-list{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 10px;margin:6px 0 0;font-size:.76rem;color:var(--sk-text)}.sk-shortcut-list dd{margin:0}.skatelab-shell kbd{display:inline-block;min-width:1.6em;padding:1px 6px;border:1px solid var(--sk-border);border-bottom-width:2px;border-radius:5px;font:700 .74rem ui-monospace,monospace;color:var(--sk-text);text-align:center}',
      '.sk-mission-banner,.sk-assignment{border:1px solid var(--sk-accent);border-radius:11px;padding:8px 10px;display:grid;gap:6px;min-width:0;background:color-mix(in srgb,var(--sk-accent) 9%,transparent)}.sk-mission-banner p,.sk-assignment p{margin:0;font-size:.78rem;line-height:1.45;color:var(--sk-text)}.sk-assignment{margin:0 0 12px}.sk-mission-meter{height:8px;border-radius:999px;background:color-mix(in srgb,var(--sk-border) 55%,transparent);overflow:hidden;margin:6px 0}.sk-mission-meter span{display:block;height:100%;background:var(--sk-green)}.sk-mission-list{list-style:none;margin:8px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:8px}.sk-mission{border:1px solid var(--sk-border);border-radius:11px;padding:8px 10px;display:grid;gap:5px;min-width:0;align-content:start}.sk-mission.is-active{border-color:var(--sk-accent);box-shadow:inset 0 0 0 1px var(--sk-accent)}.sk-mission.is-done{border-color:var(--sk-green)}.sk-mission-title{margin:0;font-size:.84rem;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}.sk-mission-xp{font-size:.7rem;color:var(--sk-cyan);font-weight:850}.sk-mission-goal,.sk-mission-status{margin:0;font-size:.76rem;line-height:1.4}.sk-mission-goal{color:var(--sk-text)}.sk-mission-hints{margin:0;padding-left:18px;font-size:.74rem;color:var(--sk-text);display:grid;gap:3px}.sk-mission-guess{display:grid;gap:4px}.sk-mission-guess label{font-size:.76rem;font-weight:750;color:var(--sk-text)}.sk-mission-guess input{max-width:160px}',
      '.sk-support{margin-top:12px;display:grid;grid-template-columns:minmax(0,1fr);gap:8px}.sk-teacher,.sk-missions,.sk-access{grid-template-columns:minmax(0,1fr)}.sk-support h3{margin:0}.sk-level{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;font-size:.78rem;font-weight:750;min-width:0}.sk-level select{flex:1 1 12em;width:auto;max-width:100%;min-width:0}.sk-plain{border-left:3px solid var(--sk-green);padding:6px 10px;background:color-mix(in srgb,var(--sk-green) 8%,transparent)}.sk-plain h4{margin:0 0 4px;font-size:.82rem}.sk-plain p{margin:0;font-size:.82rem;line-height:1.5;color:var(--sk-text)}.sk-vocab{display:flex;flex-wrap:wrap;gap:6px}.sk-vocab-term{border:1px dashed var(--sk-cyan);border-radius:999px;background:transparent;color:var(--sk-text);padding:5px 10px;font-size:.74rem;font-weight:750;cursor:help}.sk-vocab-term[aria-expanded=true]{border-style:solid;background:color-mix(in srgb,var(--sk-cyan) 14%,transparent)}.sk-vocab-def{border:1px solid var(--sk-cyan);border-radius:10px;padding:8px 10px;display:grid;gap:4px}.sk-vocab-def[hidden]{display:none}.sk-vocab-def p{margin:0;font-size:.8rem;line-height:1.45;color:var(--sk-text)}.sk-maths summary{cursor:pointer;font-weight:800;font-size:.8rem;color:var(--sk-text);margin-top:8px}.sk-extended{margin-top:10px;border-left:3px solid var(--sk-compare);padding:6px 10px}.sk-extended h4{margin:0 0 4px;font-size:.82rem}.sk-extended ul{margin:0;padding-left:18px;display:grid;gap:4px;font-size:.76rem;line-height:1.45;color:var(--sk-text)}.sk-teacher{margin:0 0 12px;display:grid;gap:8px}.sk-teacher .sk-check{color:var(--sk-text)}.sk-teacher h4{margin:6px 0 0;font-size:.84rem}',
      '@media(forced-colors:active){.sk-mission,.sk-mission-banner,.sk-assignment,.sk-vocab-term,.sk-vocab-def,.sk-access{border-color:CanvasText!important}.sk-mission-meter span{forced-color-adjust:none;background:CanvasText!important}}',
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
    if (!ctx) return null;
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
    if (sim.mode === 'flat') {
      return sim.moves
        ? { symbol: '■', label: __alloT('stem.skatelab.marker_flat_stopped', 'FRICTION STOPPED THE RIDER'), color: '#5ee092' }
        : { symbol: '!', label: __alloT('stem.skatelab.marker_flat_no_motion', 'PUSH SMALLER THAN FRICTION'), color: '#f6b83f' };
    }
    if (sim.mode === 'halfpipe') {
      if (sim.outcome === 'no-air') {
        return sim.endReason === 'time-limit'
          ? { symbol: '□', label: __alloT('stem.skatelab.marker_time_limit', 'MODEL TIME LIMIT — STILL ROLLING'), color: '#d8e5f4' }
          : { symbol: '•', label: __alloT('stem.skatelab.marker_no_air', 'NO AIR — ROCKED TO A STOP'), color: '#d8e5f4' };
      }
      if (sim.outcome === 'unsafe-contact') {
        return { symbol: 'X', label: __alloT('stem.skatelab.marker_unsafe', 'UNSAFE ANGLE — RUN STOPPED'), color: '#fb7185' };
      }
      if (sim.outcome === 'trick-missed') {
        return { symbol: '!', label: __alloT('stem.skatelab.marker_target_missed', 'SAFE CONTACT — TARGET MISSED'), color: '#f6b83f' };
      }
      return { symbol: '✓', label: __alloT('stem.skatelab.marker_target_met', 'SAFE CONTACT — TARGET MET'), color: '#5ee092' };
    }
    if (sim.outcome === 'solver-limit') {
      return { symbol: '□', label: __alloT('stem.skatelab.marker_model_limit', 'MODEL LIMIT'), color: '#d8e5f4' };
    }
    if (sim.outcome === 'platform-face') {
      return { symbol: 'X', label: __alloT('stem.skatelab.marker_platform_face', 'PLATFORM FACE IMPACT'), color: '#fb7185' };
    }
    if (sim.outcome === 'fell-short') {
      return { symbol: '↓', label: __alloT('stem.skatelab.marker_fell_short', 'FELL SHORT'), color: '#f6b83f' };
    }
    if (sim.outcome === 'fell-off-platform') {
      return { symbol: '↓', label: __alloT('stem.skatelab.marker_missed_platform', 'MISSED PLATFORM'), color: '#f6b83f' };
    }
    if (sim.outcome === 'off-lane') {
      return { symbol: 'X', label: __alloT('stem.skatelab.marker_off_lane', 'DECK CONTACT — OFF LANE'), color: '#fb7185' };
    }
    if (sim.outcome === 'overshot') {
      return { symbol: 'X', label: __alloT('stem.skatelab.marker_overshoot', 'DECK CONTACT — OVERSHOOT'), color: '#fb7185' };
    }
    return { symbol: '✓', label: __alloT('stem.skatelab.marker_landing_zone', 'LANDING ZONE'), color: '#5ee092' };
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
      ctx.fillText(__alloT('stem.skatelab.hud_energy_flow', 'LIVE ENERGY FLOW'), x, y);
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
      var hudValues = {
        energy: Math.round(signedMotionHeight),
        support: Math.round(supportTransfer),
        air: signedDelta(sample.aerodynamicNetWorkJ, 0, ' J')
      };
      var fullEnergyLabel = fillTemplate(supportTransfer > 0
        ? __alloT('stem.skatelab.hud_gap_support', 'signed E {energy} J · support {support} J')
        : __alloT('stem.skatelab.hud_gap_air', 'motion+height {energy} J · net air {air}'), hudValues);
      var shortEnergyLabel = fillTemplate(supportTransfer > 0
        ? __alloT('stem.skatelab.hud_gap_support_short', 'Eref {energy} · support {support} J')
        : __alloT('stem.skatelab.hud_gap_air_short', 'Eref {energy} · air {air}'), hudValues);
      var fittedEnergyLabel = compact ? shortEnergyLabel : fullEnergyLabel;
      if (ctx.measureText &&
          ctx.measureText(fittedEnergyLabel).width > barWidth) {
        fittedEnergyLabel = shortEnergyLabel;
      }
      if (ctx.measureText &&
          ctx.measureText(fittedEnergyLabel).width > barWidth) {
        fittedEnergyLabel = fillTemplate(__alloT('stem.skatelab.hud_gap_tiny', 'Eref {energy} J'), hudValues);
      }
      ctx.fillText(fittedEnergyLabel, x, y + 31);
      ctx.restore();
      return;
    }

    // Halfpipe and flat ground: every joule comes from the starting height
    // (PE0) or from the rider's muscles (W), and ends as KE, PE, or heat.
    var kinetic = Math.max(0, finite(sample.keJ, 0));
    var potential = Math.max(0, finite(sample.peJ, 0));
    var thermal = Math.max(0, finite(sample.thermalJ, 0));
    var riderWork = finite(sample.riderWorkJ, 0);
    var total = Math.max(1, finite(sample.energyInputSoFarJ, kinetic + potential + thermal));

    ctx.save();
    ctx.fillStyle = 'rgba(5,13,25,.72)';
    ctx.fillRect(x - 9, y - 9, barWidth + 18, 48);
    ctx.font = '700 11px ui-sans-serif, system-ui';
    ctx.fillStyle = '#d8e5f4';
    ctx.fillText(__alloT('stem.skatelab.hud_energy_title', 'LIVE ENERGY'), x, y);
    ctx.fillStyle = 'rgba(148,163,184,.28)';
    ctx.fillRect(x, y + 7, barWidth, 10);
    var hudCursor = x;
    [
      { value: kinetic, color: '#4ed7e8' },
      { value: potential, color: '#7aa7ff' },
      { value: thermal, color: '#f6b83f' }
    ].forEach(function(segment) {
      var segmentWidth = Math.max(0, Math.min(barWidth * segment.value / total, x + barWidth - hudCursor));
      if (segmentWidth <= 0) return;
      ctx.fillStyle = segment.color;
      ctx.fillRect(hudCursor, y + 7, segmentWidth, 10);
      hudCursor += segmentWidth;
    });
    ctx.fillStyle = '#a9bad0';
    ctx.font = '500 11px ui-monospace, monospace';
    var fullHudLabel = 'KE ' + Math.round(kinetic) + '  PE ' + Math.round(potential) +
      '  ' + __alloT('stem.skatelab.hud_heat', 'heat') + ' ' + Math.round(thermal) +
      '  W ' + Math.round(riderWork) + ' J';
    var shortHudLabel = 'KE ' + Math.round(kinetic) + ' PE ' + Math.round(potential) +
      ' Q ' + Math.round(thermal);
    var hudLabel = compact ? shortHudLabel : fullHudLabel;
    if (ctx.measureText && ctx.measureText(hudLabel).width > barWidth) hudLabel = shortHudLabel;
    ctx.fillText(hudLabel, x, y + 31);
    ctx.restore();
  }

  // One newtons-to-pixels scale per run, set by the largest force in that
  // run, so every force arrow in a frame can be compared by length.
  function forcePixelsPerNewton(sim, width) {
    var maxForce = Math.max(1, finite(sim && sim.forceScaleMaxN, 0), finite(sim && sim.weightN, 0));
    return (width < 520 ? 0.72 : 1) * FORCE_ARROW_MAX_PX / maxForce;
  }

  function drawForceArrow(ctx, x, y, forceX, forceY, pixelsPerNewton, color, label) {
    var dx = finite(forceX, 0) * pixelsPerNewton;
    var dy = -finite(forceY, 0) * pixelsPerNewton;
    var length = Math.sqrt(dx * dx + dy * dy);
    if (length < 0.0001) return;
    if (length >= 9) {
      drawArrow(ctx, x, y, x + dx, y + dy, color, label);
      return;
    }
    // Too short for an arrowhead at this scale: draw the true-length stroke
    // and keep the label so a small force is still visible and named.
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx, y + dy);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, 1.8, 0, Math.PI * 2);
    ctx.fill();
    if (label) {
      ctx.font = '700 11px ui-sans-serif, system-ui';
      ctx.fillText(label, x + dx + 5, y + dy - 4);
    }
    ctx.restore();
  }

  function drawMotionFooter(ctx, sample, width, height, detail, predictionLocked) {
    ctx.save();
    ctx.font = '700 11px ui-monospace, monospace';
    var timeLabel = finite(sample.time, 0).toFixed(2) + ' s';
    var speedLabel = (finite(sample.speedMps, 0) * MPS2MPH).toFixed(1) + ' mph';
    var footerText = predictionLocked
      ? __alloT('stem.skatelab.footer_locked', 'prediction locked  |  run to reveal')
      : phaseLabel(sample.phase) + '  |  ' + timeLabel + '  |  ' + speedLabel;
    var availableWidth = Math.max(80, width - 38);
    if (!predictionLocked && ctx.measureText && ctx.measureText(footerText).width > availableWidth) {
      footerText = phaseLabel(sample.phase) + '  |  ' + timeLabel;
    }
    if (!predictionLocked && ctx.measureText && ctx.measureText(footerText).width > availableWidth) {
      var shortPhase = phaseLabel(sample.phase).slice(0, 18);
      if (shortPhase.length < phaseLabel(sample.phase).length) shortPhase += '…';
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

  function drawSkater2D(ctx, x, y, rotationDeg, vehicleId, bodyPositionId, compression, visualScale, spinDeg) {
    // A spin turns the rider about the long axis of the body, so in a side
    // view the board foreshortens by cos(spin) and mirrors after a half-turn.
    var spinScale = Math.cos(finite(spinDeg, 0) * Math.PI / 180);
    if (Math.abs(spinScale) < 0.12) spinScale = spinScale < 0 ? -0.12 : 0.12;
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
      ctx.scale(riderScale * spinScale, riderScale);
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

  function halfpipeHeightCeiling(sim) {
    var highest = sim.rampDepthM;
    (sim.airs || []).forEach(function(air) {
      highest = Math.max(highest, sim.rampDepthM + air.heightM);
    });
    return highest;
  }

  function halfpipeOutcomeVisible(sim, sample) {
    return sim.hasAir
      ? sample.time >= sim.airLandingTime - 0.000001
      : sample.time >= sim.motionDuration - 0.000001;
  }

  // Unit directions use y-up world convention; the 3D view passes projected
  // screen directions so the same newton-to-pixel scale applies there.
  function drawHalfpipeForces(ctx, sample, originX, originY, pixelsPerNewton, directions) {
    drawForceArrow(ctx, originX, originY, 0, -sample.weightN, pixelsPerNewton, '#fb7185', 'mg');
    if (sample.hasSupport && sample.normalForceN > 0.000001) {
      var normalDirection = directions && directions.normal ? directions.normal : { x: sample.nx, y: sample.ny };
      drawForceArrow(ctx, originX, originY,
        normalDirection.x * sample.normalForceN, normalDirection.y * sample.normalForceN,
        pixelsPerNewton, '#5ee092', 'N');
    }
    if (sample.frictionForceN > 0.000001) {
      var frictionDirection = directions && directions.friction
        ? directions.friction
        : { x: sample.frictionX / sample.frictionForceN, y: sample.frictionY / sample.frictionForceN };
      drawForceArrow(ctx, originX, originY,
        frictionDirection.x * sample.frictionForceN, frictionDirection.y * sample.frictionForceN,
        pixelsPerNewton, '#f6b83f', 'f');
    }
  }
  function drawHalfpipe2D(ctx, width, height, sim, sample, config) {
    drawBackdrop(ctx, width, height, __alloT('stem.skatelab.canvas_halfpipe_title', 'HALFPIPE | SIDE ELEVATION'),
      __alloT('stem.skatelab.canvas_halfpipe_subtitle', 'Drop in from rest: gravity, rolling friction, pumping, and flight'));
    var comparisonHalf2D = config.compareSim && config.compareSim.mode === 'halfpipe'
      ? config.compareSim
      : null;
    var compactHalfpipe = width < 520;
    var marginX = Math.max(compactHalfpipe ? 36 : 52, width * 0.08);
    var baseY = height - (compactHalfpipe ? 48 : 60);
    var sx = (width - marginX * 2) / 9.3;
    var ceiling = config.predictionLocked
      ? Math.max(4.7, sim.rampDepthM + 2.4)
      : Math.max(halfpipeHeightCeiling(sim), comparisonHalf2D ? halfpipeHeightCeiling(comparisonHalf2D) : 0);
    var sy = Math.min((height - (compactHalfpipe ? 110 : 140)) / Math.max(4.7, ceiling), sx * 0.82);
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

    // Starting height: the dashed line makes it easy to see each pass rise
    // above it (pumping) or fall below it (friction).
    var startPoint = halfpipeTrackPoint(-Math.acos(clamp(1 - sim.dropHeightM / sim.rampDepthM, -1, 1)), sim.rampDepthM);
    var startScreen = map(startPoint.x, startPoint.y);
    ctx.save();
    ctx.setLineDash([2, 5]);
    ctx.strokeStyle = 'rgba(216,229,244,.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(map(-4, sim.dropHeightM).x, startScreen.y);
    ctx.lineTo(map(4, sim.dropHeightM).x, startScreen.y);
    ctx.stroke();
    ctx.restore();
    drawGuideLabel(ctx, __alloT('stem.skatelab.canvas_start_height', 'start') + ' ' + rounded(sim.dropHeightM, 1) + ' m',
      startScreen.x + 8, startScreen.y - 6, '#d8e5f4', width);

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
      drawGuideLabel(ctx, fillTemplate(__alloT('stem.skatelab.canvas_peak_load', 'peak {load} g'), { load: sim.peakNormalG.toFixed(1) }),
        clamp(peakLoadMarker.x + 8, 10, width - 98), peakLoadMarker.y - 22, '#fb7185', width);

      // Highest point of each pass reached so far.
      ctx.save();
      (sim.passPeaks || []).forEach(function(peak) {
        if (peak.t > sample.time + 0.000001) return;
        var peakX = peak.air
          ? peak.side * HALFPIPE_HALF_WIDTH_M
          : peak.side * HALFPIPE_HALF_WIDTH_M * Math.sin(Math.acos(clamp(1 - peak.heightM / sim.rampDepthM, -1, 1)));
        var peakScreen = map(peakX, peak.heightM);
        ctx.fillStyle = peak.trick ? '#4ed7e8' : 'rgba(216,229,244,.78)';
        ctx.beginPath();
        ctx.arc(peakScreen.x - peak.side * 9, peakScreen.y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    if (!config.predictionLocked && sim.hasAir) {
      var trickX = sim.trickSide * 4;
      var trickLip = map(trickX, sim.rampDepthM);
      var apex = map(trickX, sim.rampDepthM + sim.hAir);
      var labelOffset = sim.trickSide > 0 ? 39 : -120;
      ctx.save();
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = 'rgba(114,220,232,.58)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(trickLip.x, apex.y);
      ctx.lineTo(apex.x + 55 * sim.trickSide, apex.y);
      ctx.stroke();
      ctx.restore();
      drawGuideLabel(ctx, fillTemplate(width < 520 ? '+{height} ft' : __alloT('stem.skatelab.canvas_air_apex', '+{height} ft apex'), { height: sim.hFt.toFixed(1) }),
        apex.x + labelOffset, apex.y - 4, '#72dce8', width);
    }

    if (!config.predictionLocked && comparisonHalf2D) {
      ctx.save();
      ctx.strokeStyle = '#c4b5fd';
      ctx.lineWidth = 2;
      (comparisonHalf2D.passPeaks || []).forEach(function(peak) {
        var previousX = peak.air
          ? peak.side * HALFPIPE_HALF_WIDTH_M
          : peak.side * HALFPIPE_HALF_WIDTH_M * Math.sin(Math.acos(clamp(1 - peak.heightM / comparisonHalf2D.rampDepthM, -1, 1)));
        var previousScreen = map(previousX, peak.heightM);
        ctx.beginPath();
        ctx.arc(previousScreen.x - peak.side * 17, previousScreen.y, 3.4, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.restore();
    }

    if (sample.airborne) {
      var liftoff = map(sample.x, sim.rampDepthM);
      var current = map(sample.x, sample.y);
      ctx.save();
      ctx.strokeStyle = '#4ed7e8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(liftoff.x, liftoff.y);
      ctx.lineTo(current.x, current.y);
      ctx.stroke();
      ctx.restore();
    }

    if (config.showTrail) {
      ctx.save();
      var trailCount = width < 520 ? 5 : 9;
      var trailStep = Math.min(0.021, 0.35 / Math.max(0.35, sim.motionDuration));
      for (var trail = 0; trail < trailCount; trail++) {
        var pp = Math.max(0, config.progress - trail * trailStep);
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
    var surfaceY = Math.abs(sample.x) >= 3.98 ? sim.rampDepthM : halfpipeY(sample.x, sim.rampDepthM);
    var shadow = map(sample.x, surfaceY);
    ctx.save();
    ctx.globalAlpha = clamp(0.34 - Math.max(0, sample.y - surfaceY) * 0.07, 0.08, 0.34);
    ctx.fillStyle = '#020712';
    ctx.beginPath();
    ctx.arc(shadow.x, shadow.y + 3, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    drawSkater2D(ctx, p.x, p.y, sample.rotation, sim.vehicle.id, sim.bodyPosition.id,
      sample.loadSquat, width < 520 ? 1.16 : 1.08, sample.spinDeg);
    if (halfpipeOutcomeVisible(sim, sample)) {
      drawOutcomeMarker(ctx, p.x, p.y - 42, sim, width);
    }
    if (config.showVectors) {
      drawArrow(ctx, p.x, p.y - 18, p.x + clamp(sample.vx * 5, -52, 52), p.y - 18 - clamp(sample.vy * 5, -52, 52), '#4ed7e8', 'v');
      drawHalfpipeForces(ctx, sample, p.x + 17, p.y - 18, forcePixelsPerNewton(sim, width));
    }
    if (config.showEnergy && !config.predictionLocked) drawEnergyHud(ctx, sim, sample, width);
    drawMotionFooter(ctx, sample, width, height,
      halfpipeOutcomeVisible(sim, sample)
        ? outcomeMarkerStyle(sim).label.toLowerCase()
        : fillTemplate(__alloT('stem.skatelab.canvas_body_surface', '{body} body | {surface} surface'), { body: bodyPositionLabel(sim.bodyPosition.id), surface: surfaceLabel(sim.surface.id) }),
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
      var forceArrowX = x + insetWidth * 0.42;
      drawForceArrow(ctx, forceArrowX, centerY, 0, sample.airForceZ,
        forcePixelsPerNewton(sim, width), '#f6b83f', 'F_air,z');
    }
    ctx.fillStyle = sim.withinLane ? '#5ee092' : '#fb7185';
    ctx.beginPath();
    ctx.arc(x + insetWidth - 14, centerY - sim.crossDriftM * driftScale, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a9bad0';
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.fillText(compact
      ? fillTemplate(__alloT('stem.skatelab.canvas_drift_short', 'DRIFT {drift} FT'), { drift: sim.crossDriftFt.toFixed(1) })
      : fillTemplate(__alloT('stem.skatelab.canvas_drift', 'TOP VIEW | drift {drift} ft'), { drift: sim.crossDriftFt.toFixed(1) }), x + 9, y + 12);
    ctx.restore();
  }

  function drawGap2D(ctx, width, height, sim, sample, config) {
    drawBackdrop(ctx, width, height, __alloT('stem.skatelab.canvas_gap_title', 'GAP JUMP | SIDE ELEVATION'), sim.airDrag
      ? __alloT('stem.skatelab.canvas_gap_subtitle_drag', 'Quadratic drag, wind, and terrain-aware contact')
      : __alloT('stem.skatelab.canvas_gap_subtitle_ideal', 'Ideal flight with terrain-aware contact'));
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
      drawGuideLabel(ctx, fillTemplate(width < 520 ? '{height} ft' : __alloT('stem.skatelab.canvas_gap_apex', '{height} ft apex'), { height: sim.peakFt.toFixed(1) }),
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
      drawGuideLabel(ctx, width < 520 ? __alloT('stem.skatelab.canvas_no_drag', 'no drag') : __alloT('stem.skatelab.canvas_ideal_no_drag', 'ideal no-drag'),
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
        drawGuideLabel(ctx, fillTemplate(__alloT('stem.skatelab.canvas_contact_travel', 'contact travel {travel} ft'), { travel: (sim.contactTravelM * M2FT).toFixed(1) }),
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
      // Weight is always drawn, and every force uses one newton-to-pixel scale.
      var gapForceScale2D = forcePixelsPerNewton(sim, width);
      drawForceArrow(ctx, p.x + 16, p.y - 20, 0, -sample.weightN, gapForceScale2D, '#fb7185', 'mg');
      if (sample.supportForceN > 0.000001) {
        drawForceArrow(ctx, p.x + 16, p.y - 20, 0, sample.supportForceN, gapForceScale2D, '#5ee092', 'N');
      }
      if (sample.airForceMagnitudeN > 0.01) {
        drawForceArrow(ctx, p.x - 10, p.y - 42, sample.airForceX, sample.airForceY,
          gapForceScale2D, '#f6b83f', 'F_air');
      }
    }
    if (config.showEnergy && !config.predictionLocked) drawEnergyHud(ctx, sim, sample, width);
    if (!config.predictionLocked && Math.abs(sim.crossDriftM) > 0.02) {
      drawLaneInset2D(ctx, sim, sample, width);
    }

    drawGuideLabel(ctx, fillTemplate(__alloT('stem.skatelab.canvas_gap_width', '{gap} ft gap'), { gap: sim.gapFt.toFixed(0) }),
      left + (landingX - left) * 0.38, baseY + 28, '#d8e5f4', width);
    drawMotionFooter(ctx, sample, width, height,
      sample.flightTime >= sim.airTime - 0.000001
        ? outcomeMarkerStyle(sim).label.toLowerCase()
        : (sample.flightTime > 0 && sim.airDrag
          ? fillTemplate(__alloT('stem.skatelab.canvas_footer_air', 'net air {net} | air-relative loss {loss} J'), {
            net: signedDelta(sample.aerodynamicNetWorkJ, 0, ' J'), loss: Math.round(sample.aerodynamicDissipationJ) })
          : fillTemplate(__alloT('stem.skatelab.canvas_footer_load_drift', 'load {load} g | peak {peak} g | drift {drift} ft'), {
            load: sample.normalG.toFixed(1), peak: getLandingPeakG(sim).toFixed(1), drift: sim.crossDriftFt.toFixed(1) })),
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

  function drawSkater3D(ctx, width, height, camera, point, rotationDeg, vehicleId, bodyPositionId, compression, orientationPlane, spinDeg) {
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
    // Spin about the body's long axis: rotate the board axis around bodyUp.
    var spinRad = finite(spinDeg, 0) * Math.PI / 180;
    if (spinRad !== 0) {
      var spinCos = Math.cos(spinRad);
      var spinSin = Math.sin(spinRad);
      var upCrossBoard = {
        x: bodyUp.y * boardAxis.z - bodyUp.z * boardAxis.y,
        y: bodyUp.z * boardAxis.x - bodyUp.x * boardAxis.z,
        z: bodyUp.x * boardAxis.y - bodyUp.y * boardAxis.x
      };
      boardAxis = {
        x: boardAxis.x * spinCos + upCrossBoard.x * spinSin,
        y: boardAxis.y * spinCos + upCrossBoard.y * spinSin,
        z: boardAxis.z * spinCos + upCrossBoard.z * spinSin
      };
    }

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
    drawBackdrop(ctx, width, height, __alloT('stem.skatelab.canvas_halfpipe_3d_title', 'HALFPIPE | 3D ORBIT'),
      __alloT('stem.skatelab.canvas_halfpipe_3d_subtitle', 'Board pitch follows terrain through supported motion, flight, and contact'));
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
      drawGuideLabel(ctx, fillTemplate(__alloT('stem.skatelab.canvas_peak_load', 'peak {load} g'), { load: sim.peakNormalG.toFixed(1) }),
        clamp(peakLoadMarker.x + 7, 10, width - 98), peakLoadMarker.y - 19, '#fb7185', width);
    }

    // The rider rides on the surface, so only the flight is drawn as a path:
    // the trick air's full height (dashed) and the part flown so far (solid).
    if (!config.predictionLocked && sim.hasAir) {
      path3D(ctx, [
        { x: sim.trickSide * 4, y: sim.rampDepthM, z: 0 },
        { x: sim.trickSide * 4, y: sim.rampDepthM + sim.hAir, z: 0 }
      ], config.camera, width, height, 'rgba(114,220,232,.56)', 2, [6, 6]);
    }
    if (!config.predictionLocked && comparisonHalf3D && comparisonHalf3D.hasAir) {
      var previousApex3D = project3D({
        x: comparisonHalf3D.trickSide * 4,
        y: comparisonHalf3D.rampDepthM + comparisonHalf3D.hAir,
        z: 0
      }, config.camera, width, height);
      ctx.save();
      ctx.strokeStyle = '#c4b5fd';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(previousApex3D.x, previousApex3D.y, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (sample.airborne) {
      path3D(ctx, [
        { x: sample.x, y: sim.rampDepthM, z: 0 },
        { x: sample.x, y: sample.y, z: 0 }
      ], config.camera, width, height, '#4ed7e8', 3);
    }

    if (config.showTrail) {
      ctx.save();
      var trailCount = width < 520 ? 5 : 9;
      var trailStep = Math.min(0.022, 0.35 / Math.max(0.35, sim.motionDuration));
      for (var trail = 0; trail < trailCount; trail++) {
        var ghostProgress = Math.max(0, config.progress - trail * trailStep);
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
      y: Math.abs(sample.x) >= 3.98 ? sim.rampDepthM : halfpipeY(sample.x, sim.rampDepthM),
      z: 0
    };
    drawShadow3D(ctx, width, height, config.camera, surfacePoint, Math.max(0, sample.y - surfacePoint.y));
    var riderAnchors3D = drawSkater3D(ctx, width, height, config.camera, sample, sample.rotation, sim.vehicle.id, sim.bodyPosition.id, sample.loadSquat, 'side', sample.spinDeg);
    var center = riderAnchors3D.board;
    if (halfpipeOutcomeVisible(sim, sample)) {
      drawOutcomeMarker(ctx, center.x, center.y - 36, sim, width);
    }
    if (config.showVectors) {
      drawArrow(ctx, center.x, center.y - 16, center.x + clamp(sample.vx * 4, -50, 50), center.y - 16 - clamp(sample.vy * 4, -50, 50), '#4ed7e8', 'v');
      // Project the normal and friction directions so the 3D arrows keep the
      // same newton-to-pixel scale as the 2D view.
      var forceOrigin = project3D({ x: sample.x, y: sample.y + 0.12, z: 0 }, config.camera, width, height);
      var normalTip = project3D({ x: sample.x + sample.nx * 0.3, y: sample.y + 0.12 + sample.ny * 0.3, z: 0 }, config.camera, width, height);
      var frictionSign = sample.frictionX * sample.tx + sample.frictionY * sample.ty < 0 ? -1 : 1;
      var frictionTip = project3D({ x: sample.x + frictionSign * sample.tx * 0.3, y: sample.y + 0.12 + frictionSign * sample.ty * 0.3, z: 0 }, config.camera, width, height);
      var screenUnit = function(tip) {
        var dx = tip.x - forceOrigin.x;
        var dy = forceOrigin.y - tip.y;
        var length = Math.max(0.000001, Math.sqrt(dx * dx + dy * dy));
        return { x: dx / length, y: dy / length };
      };
      drawHalfpipeForces(ctx, sample, forceOrigin.x, forceOrigin.y, forcePixelsPerNewton(sim, width), {
        normal: screenUnit(normalTip),
        friction: screenUnit(frictionTip)
      });
    }
    if (config.showEnergy && !config.predictionLocked) drawEnergyHud(ctx, sim, sample, width);
    drawMotionFooter(ctx, sample, width, height,
      halfpipeOutcomeVisible(sim, sample)
        ? outcomeMarkerStyle(sim).label.toLowerCase()
        : fillTemplate(__alloT('stem.skatelab.canvas_camera_body', 'camera {camera} deg | {body} body'), { camera: Math.round(config.camera), body: bodyPositionLabel(sim.bodyPosition.id) }),
      config.predictionLocked);
  }

  function drawGap3D(ctx, width, height, sim, sample, config) {
    drawBackdrop(ctx, width, height, __alloT('stem.skatelab.canvas_gap_3d_title', 'GAP JUMP | 3D ORBIT'),
      __alloT('stem.skatelab.canvas_gap_3d_subtitle', 'Depth, drift, terrain contact, and support-load response'));
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
      // Weight always shows; all forces share one newton-to-pixel scale.
      var gapForceScale3D = forcePixelsPerNewton(sim, width);
      drawForceArrow(ctx, center.x + 14, center.y - 18, 0, -sample.weightN, gapForceScale3D, '#fb7185', 'mg');
      if (sample.supportForceN > 0.000001) {
        drawForceArrow(ctx, center.x + 14, center.y - 18, 0, sample.supportForceN, gapForceScale3D, '#5ee092', 'N');
      }
      if (sample.airForceMagnitudeN > 0.01) {
        // Direction comes from projecting the world force direction; length
        // comes from the magnitude in newtons.
        var displayForceX = sample.airForceX * k;
        var displayForceY = sample.airForceY;
        var displayForceZ = sample.airForceZ;
        var displayForceMagnitude = Math.max(0.001, Math.sqrt(
          displayForceX * displayForceX +
          displayForceY * displayForceY +
          displayForceZ * displayForceZ
        ));
        var airForceStart3D = { x: skaterPoint.x, y: skaterPoint.y + 0.34, z: skaterPoint.z };
        var airForceStartProjection = project3D(airForceStart3D, config.camera, width, height);
        var airForceEndProjection = project3D({
          x: airForceStart3D.x + displayForceX / displayForceMagnitude * 0.5,
          y: airForceStart3D.y + displayForceY / displayForceMagnitude * 0.5,
          z: airForceStart3D.z + displayForceZ / displayForceMagnitude * 0.5
        }, config.camera, width, height);
        var screenDx = airForceEndProjection.x - airForceStartProjection.x;
        var screenDy = airForceStartProjection.y - airForceEndProjection.y;
        var screenLength = Math.max(0.000001, Math.sqrt(screenDx * screenDx + screenDy * screenDy));
        drawForceArrow(
          ctx,
          airForceStartProjection.x,
          airForceStartProjection.y,
          screenDx / screenLength * sample.airForceMagnitudeN,
          screenDy / screenLength * sample.airForceMagnitudeN,
          gapForceScale3D,
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
      drawGuideLabel(ctx, fillTemplate(sim.withinLane
        ? __alloT('stem.skatelab.canvas_lane', 'lane {drift} ft')
        : __alloT('stem.skatelab.canvas_off_lane', 'off lane {drift} ft'), { drift: Math.abs(sim.crossDriftFt).toFixed(1) }), landingMarker.x + 8,
        landingMarker.y - 7, sim.withinLane ? '#5ee092' : '#fb7185', width);
    }
    drawMotionFooter(ctx, sample, width, height,
      sample.flightTime >= sim.airTime - 0.000001
        ? outcomeMarkerStyle(sim).label.toLowerCase()
        : (sample.flightTime > 0 && sim.airDrag
          ? fillTemplate(__alloT('stem.skatelab.canvas_footer_air', 'net air {net} | air-relative loss {loss} J'), {
            net: signedDelta(sample.aerodynamicNetWorkJ, 0, ' J'), loss: Math.round(sample.aerodynamicDissipationJ) })
          : fillTemplate(__alloT('stem.skatelab.canvas_footer_load_ideal', 'load {load} g | peak {peak} g | ideal air'), {
            load: sample.normalG.toFixed(1), peak: getLandingPeakG(sim).toFixed(1) })),
      config.predictionLocked);
  }

  function niceTickStep(span, targetTicks) {
    var raw = Math.max(0.000001, span / Math.max(1, targetTicks));
    var power = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var steps = [1, 2, 5, 10];
    for (var index = 0; index < steps.length; index++) {
      if (steps[index] * power >= raw) return steps[index] * power;
    }
    return 10 * power;
  }

  function flatWorldSpan(sim, config) {
    var span = config.predictionLocked
      ? 6
      : Math.max(3, sim.stopDistanceM, config.compareSim && config.compareSim.mode === 'flat' ? config.compareSim.stopDistanceM : 0);
    return span * 1.08;
  }

  function drawFlatForces(ctx, sim, sample, originX, originY, pixelsPerNewton, forwardScreen) {
    var forward = forwardScreen || { x: 1, y: 0 };
    drawForceArrow(ctx, originX, originY, 0, -sample.weightN, pixelsPerNewton, '#fb7185', 'mg');
    drawForceArrow(ctx, originX + 6, originY, 0, sample.normalForceN, pixelsPerNewton, '#5ee092', 'N');
    if (sample.pushForceN > 0) {
      drawForceArrow(ctx, originX, originY - 10, forward.x * sample.pushForceN, forward.y * sample.pushForceN,
        pixelsPerNewton, '#4ed7e8', 'F_push');
    }
    if (sample.frictionForceN > 0) {
      drawForceArrow(ctx, originX, originY + 8, -forward.x * sample.frictionForceN, -forward.y * sample.frictionForceN,
        pixelsPerNewton, '#f6b83f', 'f');
    }
  }

  function drawFlat2D(ctx, width, height, sim, sample, config) {
    drawBackdrop(ctx, width, height,
      __alloT('stem.skatelab.canvas_flat_title', 'FLAT GROUND | SIDE ELEVATION'),
      __alloT('stem.skatelab.canvas_flat_subtitle', 'One push, then coasting: rolling friction is the force that stops you'));
    var compact = width < 520;
    var comparisonFlat = config.compareSim && config.compareSim.mode === 'flat' ? config.compareSim : null;
    var left = compact ? 30 : 48;
    var right = width - (compact ? 22 : 40);
    var baseY = height - (compact ? 58 : 74);
    var span = flatWorldSpan(sim, config);
    var sx = (right - left) / span;
    function mapX(x) { return left + x * sx; }

    ctx.save();
    ctx.fillStyle = '#28384d';
    ctx.fillRect(0, baseY, width, height - baseY);
    ctx.strokeStyle = '#a9bad0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    ctx.lineTo(width, baseY);
    ctx.stroke();
    var tickStep = niceTickStep(span, compact ? 4 : 8);
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.fillStyle = '#a9bad0';
    ctx.strokeStyle = 'rgba(216,229,244,.5)';
    ctx.lineWidth = 1;
    for (var tick = 0; tick <= span + 0.000001; tick += tickStep) {
      var tickX = mapX(tick);
      ctx.beginPath();
      ctx.moveTo(tickX, baseY);
      ctx.lineTo(tickX, baseY + 7);
      ctx.stroke();
      ctx.fillText(rounded(tick, tickStep < 1 ? 1 : 0) + ' m', tickX - 8, baseY + 20);
    }
    ctx.restore();

    if (!config.predictionLocked && sim.pushDistanceM > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(78,215,232,.18)';
      ctx.fillRect(mapX(0), baseY - 6, Math.max(2, sim.pushDistanceM * sx), 6);
      ctx.restore();
    }

    if (!config.predictionLocked && comparisonFlat) {
      var previousStopX = mapX(comparisonFlat.stopDistanceM);
      ctx.save();
      ctx.strokeStyle = '#c4b5fd';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(previousStopX, baseY - 30);
      ctx.lineTo(previousStopX, baseY);
      ctx.stroke();
      ctx.restore();
    }

    if (!config.predictionLocked) {
      var stopX = mapX(sim.stopDistanceM);
      ctx.save();
      ctx.strokeStyle = 'rgba(94,224,146,.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(stopX, baseY - 44);
      ctx.lineTo(stopX, baseY);
      ctx.stroke();
      ctx.restore();
      drawGuideLabel(ctx, fillTemplate(__alloT('stem.skatelab.canvas_flat_stop', 'stops at {distance} m'), {
        distance: rounded(sim.stopDistanceM, 1)
      }), stopX - 60, baseY - 50, '#5ee092', width);
    }

    // Newton's first law reference: with no friction the rider would keep
    // the push speed forever.
    if (!config.predictionLocked && config.showTrail && sample.phase !== 'pushing off' && sim.moves) {
      var ghostX = Math.min(mapX(sample.frictionlessX), right - 6);
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = '#c4b5fd';
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ghostX, baseY - 18, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      if (!compact) {
        drawGuideLabel(ctx, __alloT('stem.skatelab.canvas_flat_no_friction', 'no friction'),
          ghostX - 34, baseY - 32, '#c4b5fd', width);
      }
    }

    var riderX = mapX(sample.x);
    drawSkater2D(ctx, riderX, baseY - 4, 0, sim.vehicle.id, 'neutral', 0, compact ? 1.16 : 1.08, 0);
    if (sample.phase === 'stopped' || sample.phase === 'not moving') {
      drawOutcomeMarker(ctx, riderX, baseY - 52, sim, width);
    }
    if (config.showVectors) {
      drawArrow(ctx, riderX, baseY - 40, riderX + clamp(sample.vx * 12, 0, 60), baseY - 40, '#4ed7e8', 'v');
      drawFlatForces(ctx, sim, sample, riderX + 2, baseY - 18, forcePixelsPerNewton(sim, width));
      // Newton's third law partner: the foot pushes the ground backward.
      if (sample.pushForceN > 0) {
        drawForceArrow(ctx, riderX - 6, baseY + 2, -sample.pushForceN, 0, forcePixelsPerNewton(sim, width),
          '#c4b5fd', __alloT('stem.skatelab.canvas_flat_on_ground', 'on ground'));
      }
    }
    if (config.showEnergy && !config.predictionLocked) drawEnergyHud(ctx, sim, sample, width);
    drawMotionFooter(ctx, sample, width, height,
      sample.phase === 'coasting'
        ? fillTemplate(__alloT('stem.skatelab.canvas_flat_check', 'KE lost {lost} J | μmgd {friction} J'), {
          lost: Math.round(sample.coastKineticLostJ),
          friction: Math.round(sample.coastFrictionWorkSoFarJ)
        })
        : surfaceLabel(sim.surface.id) + ' · μ = ' + rounded(sim.rollingMu, 3),
      config.predictionLocked);
  }

  function drawFlat3D(ctx, width, height, sim, sample, config) {
    drawBackdrop(ctx, width, height,
      __alloT('stem.skatelab.canvas_flat_title_3d', 'FLAT GROUND | 3D ORBIT'),
      __alloT('stem.skatelab.canvas_flat_subtitle', 'One push, then coasting: rolling friction is the force that stops you'));
    drawGround3D(ctx, width, height, config.camera);
    var comparisonFlat3D = config.compareSim && config.compareSim.mode === 'flat' ? config.compareSim : null;
    var span = flatWorldSpan(sim, config);
    var k = 12 / span;
    var startX = -6;
    polygon3D(ctx, [
      { x: startX, y: 0.01, z: -0.9 }, { x: 6, y: 0.01, z: -0.9 },
      { x: 6, y: 0.01, z: 0.9 }, { x: startX, y: 0.01, z: 0.9 }
    ], config.camera, width, height, 'rgba(52,68,90,.9)', '#9fb2ca');
    path3D(ctx, [{ x: startX, y: 0.02, z: -0.9 }, { x: startX, y: 0.02, z: 0.9 }], config.camera, width, height, '#4ed7e8', 2);
    if (!config.predictionLocked) {
      var stopWorldX = startX + sim.stopDistanceM * k;
      path3D(ctx, [{ x: stopWorldX, y: 0.02, z: -0.9 }, { x: stopWorldX, y: 0.02, z: 0.9 }], config.camera, width, height, '#5ee092', 2, [5, 5]);
      var stopLabel = project3D({ x: stopWorldX, y: 0.02, z: -0.9 }, config.camera, width, height);
      drawGuideLabel(ctx, fillTemplate(__alloT('stem.skatelab.canvas_flat_stop', 'stops at {distance} m'), {
        distance: rounded(sim.stopDistanceM, 1)
      }), stopLabel.x - 40, stopLabel.y + 18, '#5ee092', width);
    }
    if (!config.predictionLocked && comparisonFlat3D) {
      var previousStopWorldX = startX + comparisonFlat3D.stopDistanceM * k;
      path3D(ctx, [{ x: previousStopWorldX, y: 0.03, z: -0.9 }, { x: previousStopWorldX, y: 0.03, z: 0.9 }], config.camera, width, height, '#c4b5fd', 2, [3, 4]);
    }
    var riderPoint = { x: startX + sample.x * k, y: 0.02, z: 0 };
    drawShadow3D(ctx, width, height, config.camera, riderPoint, 0);
    var anchors = drawSkater3D(ctx, width, height, config.camera, riderPoint, 0, sim.vehicle.id, 'neutral', 0, 'side', 0);
    var center = anchors.board;
    if (sample.phase === 'stopped' || sample.phase === 'not moving') {
      drawOutcomeMarker(ctx, center.x, center.y - 40, sim, width);
    }
    if (config.showVectors) {
      var forwardTip = project3D({ x: riderPoint.x + 0.5, y: riderPoint.y, z: 0 }, config.camera, width, height);
      var forwardDx = forwardTip.x - center.x;
      var forwardDy = center.y - forwardTip.y;
      var forwardLength = Math.max(0.000001, Math.sqrt(forwardDx * forwardDx + forwardDy * forwardDy));
      var forwardScreen = { x: forwardDx / forwardLength, y: forwardDy / forwardLength };
      drawArrow(ctx, center.x, center.y - 34, center.x + forwardScreen.x * clamp(sample.vx * 12, 0, 60),
        center.y - 34 - forwardScreen.y * clamp(sample.vx * 12, 0, 60), '#4ed7e8', 'v');
      drawFlatForces(ctx, sim, sample, center.x, center.y - 14, forcePixelsPerNewton(sim, width), forwardScreen);
    }
    if (config.showEnergy && !config.predictionLocked) drawEnergyHud(ctx, sim, sample, width);
    drawMotionFooter(ctx, sample, width, height,
      fillTemplate(__alloT('stem.skatelab.canvas_camera_surface', 'camera {camera} deg | {surface} · μ = {mu}'), { camera: Math.round(config.camera), surface: surfaceLabel(sim.surface.id), mu: rounded(sim.rollingMu, 3) }),
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
    var sample = sim.mode === 'halfpipe'
      ? sampleHalfpipe(sim, progress)
      : (sim.mode === 'flat' ? sampleFlat(sim, progress) : sampleGapJump(sim, progress));
    if (config.view === '3d') {
      if (sim.mode === 'halfpipe') drawHalfpipe3D(frame.ctx, frame.width, frame.height, sim, sample, config);
      else if (sim.mode === 'flat') drawFlat3D(frame.ctx, frame.width, frame.height, sim, sample, config);
      else drawGap3D(frame.ctx, frame.width, frame.height, sim, sample, config);
    } else {
      if (sim.mode === 'halfpipe') drawHalfpipe2D(frame.ctx, frame.width, frame.height, sim, sample, config);
      else if (sim.mode === 'flat') drawFlat2D(frame.ctx, frame.width, frame.height, sim, sample, config);
      else drawGap2D(frame.ctx, frame.width, frame.height, sim, sample, config);
    }
  }

  // ---------- Stage B text (every string has a stem.skatelab.* key) ----------

  function logColumnLabel(id) {
    switch (id) {
      case 'mass': return __alloT('stem.skatelab.col_mass', 'Total mass');
      case 'gravity': return __alloT('stem.skatelab.col_gravity', 'Gravity g');
      case 'dropHeight': return __alloT('stem.skatelab.col_drop_height', 'Drop height h');
      case 'pumps': return __alloT('stem.skatelab.col_pumps', 'Pumps');
      case 'mu': return __alloT('stem.skatelab.col_mu', 'Friction coefficient μ');
      case 'startPE': return __alloT('stem.skatelab.col_start_pe', 'Starting PE');
      case 'bottomSpeed': return __alloT('stem.skatelab.col_bottom_speed', 'Speed at the bottom v');
      case 'bottomSpeedSq': return __alloT('stem.skatelab.col_bottom_speed_sq', 'v² at the bottom');
      case 'bottomKE': return __alloT('stem.skatelab.col_bottom_ke', 'KE at the bottom');
      case 'firstPassHeat': return __alloT('stem.skatelab.col_first_pass_heat', 'Heat after one pass');
      case 'airHeight': return __alloT('stem.skatelab.col_air_height', 'Air above the lip');
      case 'riderWork': return __alloT('stem.skatelab.col_rider_work', 'Work by rider');
      case 'heat': return __alloT('stem.skatelab.col_heat', 'Total heat');
      case 'transitionLoad': return __alloT('stem.skatelab.col_transition_load', 'Peak ramp load');
      case 'inertia': return __alloT('stem.skatelab.col_inertia', 'Rotational inertia I');
      case 'inverseInertia': return __alloT('stem.skatelab.col_inverse_inertia', '1 ÷ I');
      case 'airSpin': return __alloT('stem.skatelab.col_air_spin', 'Spin rate ω in the air');
      case 'angMomentum': return __alloT('stem.skatelab.col_ang_momentum', 'Angular momentum L');
      case 'pushForce': return __alloT('stem.skatelab.col_push_force', 'Push force');
      case 'friction': return __alloT('stem.skatelab.col_friction', 'Friction force');
      case 'netForce': return __alloT('stem.skatelab.col_net_force', 'Net force during push');
      case 'pushAccel': return __alloT('stem.skatelab.col_push_accel', 'Acceleration during push');
      case 'topSpeed': return __alloT('stem.skatelab.col_top_speed', 'Top speed v');
      case 'topSpeedSq': return __alloT('stem.skatelab.col_top_speed_sq', 'v² at top speed');
      case 'topKE': return __alloT('stem.skatelab.col_top_ke', 'KE at top speed');
      case 'stopDistance': return __alloT('stem.skatelab.col_stop_distance', 'Stopping distance');
      case 'launchSpeed': return __alloT('stem.skatelab.col_launch_speed', 'Launch speed v');
      case 'launchSpeedSq': return __alloT('stem.skatelab.col_launch_speed_sq', 'v² at launch');
      case 'launchKE': return __alloT('stem.skatelab.col_launch_ke', 'KE at launch');
      case 'angle': return __alloT('stem.skatelab.col_angle', 'Launch angle');
      case 'dragOn': return __alloT('stem.skatelab.col_drag_on', 'Air drag (1 = on)');
      case 'range': return __alloT('stem.skatelab.col_range', 'Range');
      case 'peakHeight': return __alloT('stem.skatelab.col_peak_height', 'Peak height');
      case 'flightTime': return __alloT('stem.skatelab.col_flight_time', 'Flight time');
      case 'absorption': return __alloT('stem.skatelab.col_absorption', 'Landing absorption d');
      case 'landingLoad': return __alloT('stem.skatelab.col_landing_load', 'Peak landing load');
      case 'airLoss': return __alloT('stem.skatelab.col_air_loss', 'Heat from air drag');
      default: return String(id || '');
    }
  }

  function logColumn(id) {
    for (var index = 0; index < LOG_COLUMNS.length; index++) {
      if (LOG_COLUMNS[index].id === id) return LOG_COLUMNS[index];
    }
    return null;
  }

  function logColumnTitle(id) {
    var column = logColumn(id);
    return logColumnLabel(id) + (column && column.unit ? ' (' + column.unit + ')' : '');
  }

  function forceName(id) {
    switch (id) {
      case 'weight': return __alloT('stem.skatelab.force_weight', 'Weight (gravity), mg');
      case 'normal': return __alloT('stem.skatelab.force_normal', 'Normal force from the surface, N');
      case 'support': return __alloT('stem.skatelab.force_support', 'Support force from the deck, N');
      case 'push': return __alloT('stem.skatelab.force_push', 'Push from the ground, F_push');
      case 'friction': return __alloT('stem.skatelab.force_friction', 'Rolling friction, f');
      case 'staticFriction': return __alloT('stem.skatelab.force_static_friction', 'Static friction holding the rider still, f');
      case 'air': return __alloT('stem.skatelab.force_air', 'Air force (drag and wind), F_air');
      default: return String(id || '');
    }
  }

  function forceSymbol(id) {
    if (id === 'weight') return 'mg';
    if (id === 'normal' || id === 'support') return 'N';
    if (id === 'push') return 'F_push';
    if (id === 'air') return 'F_air';
    return 'f';
  }

  // Direction of a side-view vector in words (x right, y up).
  function directionText(x, y) {
    var magnitude = Math.sqrt(x * x + y * y);
    if (magnitude < 0.000001) return __alloT('stem.skatelab.dir_none', 'no direction (zero)');
    if (Math.abs(x) <= 0.02 * magnitude) {
      return y < 0 ? __alloT('stem.skatelab.dir_down', 'straight down') : __alloT('stem.skatelab.dir_up', 'straight up');
    }
    if (Math.abs(y) <= 0.02 * magnitude) {
      return x > 0 ? __alloT('stem.skatelab.dir_right', 'to the right') : __alloT('stem.skatelab.dir_left', 'to the left');
    }
    var angle = Math.round(Math.atan2(Math.abs(y), Math.abs(x)) * 180 / Math.PI);
    var template = y > 0
      ? (x > 0 ? __alloT('stem.skatelab.dir_up_right', '{angle}° above horizontal, to the right') : __alloT('stem.skatelab.dir_up_left', '{angle}° above horizontal, to the left'))
      : (x > 0 ? __alloT('stem.skatelab.dir_down_right', '{angle}° below horizontal, to the right') : __alloT('stem.skatelab.dir_down_left', '{angle}° below horizontal, to the left'));
    return fillTemplate(template, { angle: angle });
  }

  function surfaceName(id) {
    if (id === 'wax') return __alloT('stem.skatelab.surface_name_wax', 'waxed');
    if (id === 'rough') return __alloT('stem.skatelab.surface_name_rough', 'rough');
    return __alloT('stem.skatelab.surface_name_concrete', 'concrete');
  }

  function bodyName(id) {
    if (id === 'open') return __alloT('stem.skatelab.body_name_open', 'open');
    if (id === 'tuck') return __alloT('stem.skatelab.body_name_tuck', 'tucked');
    return __alloT('stem.skatelab.body_name_neutral', 'neutral');
  }

  function predictionMasses(sim) {
    var light = Math.min(finite(sim && sim.riderMassKg, RIDER_KG), 90);
    return { light: Math.round(light), heavy: Math.round(light + 20) };
  }

  function predictionQuestion(promptId, sim) {
    var masses = predictionMasses(sim);
    switch (promptId) {
      case 'hp_mass': return fillTemplate(__alloT('stem.skatelab.predict_q_hp_mass', 'Compare a {light} kg rider with a {heavy} kg rider on this same drop. The heavier rider’s highest point will be…'), masses);
      case 'hp_moon': return __alloT('stem.skatelab.predict_q_hp_moon', 'Same drop and pumps, but on the Moon (g = 1.62 m/s²) instead of Earth. The highest point on the Moon will be…');
      case 'hp_friction': return fillTemplate(__alloT('stem.skatelab.predict_q_hp_friction', 'With no pumps on this {surface} surface (μ = {mu}), the rider rolls up the far wall to…'), {
        surface: surfaceName(sim && sim.surface && sim.surface.id),
        mu: rounded(sim && sim.rollingMu, 3)
      });
      case 'hp_spin': return __alloT('stem.skatelab.predict_q_hp_spin', 'Tucking makes a spin faster. Compared with an open body, the tucked rider’s highest point will be…');
      case 'gap_weight': return __alloT('stem.skatelab.predict_q_gap_weight', 'At the very top of the jump, which forces act on the rider?');
      case 'gap_45': return __alloT('stem.skatelab.predict_q_gap_45', 'With air drag on, the launch angle that gives the longest jump at this speed is…');
      case 'gap_safe': return fillTemplate(__alloT('stem.skatelab.predict_q_gap_safe', 'With {absorption} m of landing absorption, this jump will…'), {
        absorption: rounded(sim && sim.landingCompressionM, 2)
      });
      case 'gap_mass': return fillTemplate(__alloT('stem.skatelab.predict_q_gap_mass', 'Compare a {light} kg rider with a {heavy} kg rider at the same speed and angle. The heavier rider jumps…'), masses);
      case 'flat_stop': return fillTemplate(__alloT('stem.skatelab.predict_q_flat_stop', 'After the push ends on this {surface} surface, the rider will…'), {
        surface: surfaceName(sim && sim.surface && sim.surface.id)
      });
      case 'flat_mass': return fillTemplate(__alloT('stem.skatelab.predict_q_flat_mass', 'Same push and surface, but a {heavy} kg rider instead of a {light} kg rider. The heavier rider’s stopping distance will be…'), masses);
      case 'flat_double':
        var push = finite(sim && sim.pushForceN, 200);
        var base = push <= 200 ? push : push / 2;
        return fillTemplate(__alloT('stem.skatelab.predict_q_flat_double', 'Compare a {push} N push with a {double} N push (twice as hard). The stopping distance with the bigger push will be…'), {
          push: Math.round(base),
          double: Math.round(base * 2)
        });
      default: return '';
    }
  }

  function predictionOptionLabel(promptId, option) {
    switch (promptId + ':' + option) {
      case 'hp_mass:higher': return __alloT('stem.skatelab.predict_o_hp_mass_higher', 'Higher');
      case 'hp_mass:same': return __alloT('stem.skatelab.predict_o_hp_mass_same', 'About the same');
      case 'hp_mass:lower': return __alloT('stem.skatelab.predict_o_hp_mass_lower', 'Lower');
      case 'hp_moon:higher': return __alloT('stem.skatelab.predict_o_hp_moon_higher', 'Higher than on Earth');
      case 'hp_moon:same': return __alloT('stem.skatelab.predict_o_hp_moon_same', 'The same as on Earth');
      case 'hp_moon:lower': return __alloT('stem.skatelab.predict_o_hp_moon_lower', 'Lower than on Earth');
      case 'hp_friction:same': return __alloT('stem.skatelab.predict_o_hp_friction_same', 'Exactly the starting height');
      case 'hp_friction:lower': return __alloT('stem.skatelab.predict_o_hp_friction_lower', 'A little lower than the start');
      case 'hp_friction:higher': return __alloT('stem.skatelab.predict_o_hp_friction_higher', 'Higher than the start');
      case 'hp_spin:lower': return __alloT('stem.skatelab.predict_o_hp_spin_lower', 'Lower: the faster spin uses up energy');
      case 'hp_spin:same': return __alloT('stem.skatelab.predict_o_hp_spin_same', 'The same');
      case 'hp_spin:higher': return __alloT('stem.skatelab.predict_o_hp_spin_higher', 'Higher');
      case 'gap_weight:none': return __alloT('stem.skatelab.predict_o_gap_weight_none', 'None: the rider is weightless at the top');
      case 'gap_weight:weight': return __alloT('stem.skatelab.predict_o_gap_weight_weight', 'Weight (plus a small air force if drag is on)');
      case 'gap_weight:upward': return __alloT('stem.skatelab.predict_o_gap_weight_upward', 'Weight and an upward force that keeps the rider going');
      case 'gap_45:exact': return __alloT('stem.skatelab.predict_o_gap_45_exact', 'Exactly 45°, the same as with no drag');
      case 'gap_45:below': return __alloT('stem.skatelab.predict_o_gap_45_below', 'A little below 45°');
      case 'gap_45:above': return __alloT('stem.skatelab.predict_o_gap_45_above', 'Above 45°');
      case 'gap_safe:safe': return __alloT('stem.skatelab.predict_o_gap_safe_safe', 'Land on the deck with a peak load under 4 g');
      case 'gap_safe:hard': return __alloT('stem.skatelab.predict_o_gap_safe_hard', 'Land on the deck, but at 4 g or more');
      case 'gap_safe:miss': return __alloT('stem.skatelab.predict_o_gap_safe_miss', 'Not land on the platform deck');
      case 'gap_mass:farther': return __alloT('stem.skatelab.predict_o_gap_mass_farther', 'A little farther');
      case 'gap_mass:same': return __alloT('stem.skatelab.predict_o_gap_mass_same', 'The same distance');
      case 'gap_mass:shorter': return __alloT('stem.skatelab.predict_o_gap_mass_shorter', 'Shorter: heavier riders are pulled down faster');
      case 'flat_stop:forever': return __alloT('stem.skatelab.predict_o_flat_stop_forever', 'Keep rolling at the same speed: the surface is smooth');
      case 'flat_stop:slows': return __alloT('stem.skatelab.predict_o_flat_stop_slows', 'Slow down steadily and stop');
      case 'flat_stop:instant': return __alloT('stem.skatelab.predict_o_flat_stop_instant', 'Stop as soon as the push ends');
      case 'flat_stop:still': return __alloT('stem.skatelab.predict_o_flat_stop_still', 'Not move at all: the push is too small');
      case 'flat_mass:shorter': return __alloT('stem.skatelab.predict_o_flat_mass_shorter', 'Shorter');
      case 'flat_mass:same': return __alloT('stem.skatelab.predict_o_flat_mass_same', 'The same');
      case 'flat_mass:farther': return __alloT('stem.skatelab.predict_o_flat_mass_farther', 'Farther');
      case 'flat_double:double': return __alloT('stem.skatelab.predict_o_flat_double_double', 'About twice as far');
      case 'flat_double:more': return __alloT('stem.skatelab.predict_o_flat_double_more', 'More than twice as far');
      case 'flat_double:less': return __alloT('stem.skatelab.predict_o_flat_double_less', 'Less than twice as far');
      default: return String(option || '');
    }
  }

  // What the model found, in words, from the evaluation facts.
  function predictionModelText(promptId, facts) {
    facts = facts || {};
    var f = function(value, digits) { return rounded(value, digits); };
    switch (promptId) {
      case 'hp_mass': return fillTemplate(__alloT('stem.skatelab.predict_m_hp_mass', 'Model: the {light} kg rider’s highest point is {lightHeight} m and the {heavy} kg rider’s is {heavyHeight} m.'), {
        light: Math.round(facts.lightMass), heavy: Math.round(facts.heavyMass), lightHeight: f(facts.lightHeight, 2), heavyHeight: f(facts.heavyHeight, 2) });
      case 'hp_moon': return fillTemplate(__alloT('stem.skatelab.predict_m_hp_moon', 'Model: highest point {earth} m on Earth and {moon} m on the Moon.'), {
        earth: f(facts.earthHeight, 2), moon: f(facts.moonHeight, 2) }) +
        (facts.earthTime > 0 ? ' ' + fillTemplate(__alloT('stem.skatelab.predict_m_hp_moon_time', 'The Moon air lasts longer ({moonTime} s against {earthTime} s) but is not higher.'), {
          moonTime: f(facts.moonTime, 2), earthTime: f(facts.earthTime, 2) }) : '');
      case 'hp_friction': return fillTemplate(__alloT('stem.skatelab.predict_m_hp_friction', 'Model: dropped from {drop} m, the rider reaches {turn} m on the far wall; friction turned {heat} J into heat on the way.'), {
        drop: f(facts.drop, 2), turn: f(facts.turnHeight, 3), heat: Math.round(finite(facts.heat, 0)) });
      case 'hp_spin': return fillTemplate(__alloT('stem.skatelab.predict_m_hp_spin', 'Model: open body {openHeight} m at {openOmega}°/s; tucked {tuckHeight} m at {tuckOmega}°/s. Angular momentum L is {L} kg·m²/s in both.'), {
        openHeight: f(facts.openHeight, 2), openOmega: Math.round(finite(facts.openOmega, 0)), tuckHeight: f(facts.tuckHeight, 2),
        tuckOmega: Math.round(finite(facts.tuckOmega, 0)), L: f(facts.tuckL, 1) });
      case 'gap_weight': return fillTemplate(__alloT('stem.skatelab.predict_m_gap_weight', 'Model at the top: weight {weight} N downward, support force {support} N, air force {air} N.'), {
        weight: Math.round(finite(facts.weight, 0)), support: Math.round(finite(facts.support, 0)), air: f(facts.air, 1) });
      case 'gap_45': return fillTemplate(__alloT('stem.skatelab.predict_m_gap_45', 'Model: the longest jump is at {best}°, {gain} mm farther than at 45°.'), {
        best: f(facts.bestAngle, 1), gain: f((finite(facts.bestRange, 0) - finite(facts.range45, 0)) * 1000, 2) });
      case 'gap_safe': return facts.landed
        ? fillTemplate(__alloT('stem.skatelab.predict_m_gap_safe', 'Model: peak landing load {peak} g with {absorption} m of absorption.'), {
          peak: f(facts.peakG, 2), absorption: f(facts.absorption, 2) })
        : __alloT('stem.skatelab.predict_m_gap_safe_miss', 'Model: the rider does not land on the platform deck.');
      case 'gap_mass': return fillTemplate(__alloT('stem.skatelab.predict_m_gap_mass', 'Model: {light} kg rider {lightRange} m; {heavy} kg rider {heavyRange} m.'), {
        light: Math.round(facts.lightMass), heavy: Math.round(facts.heavyMass), lightRange: f(facts.lightRange, 3), heavyRange: f(facts.heavyRange, 3) });
      case 'flat_stop': return facts.topSpeed > 0
        ? fillTemplate(__alloT('stem.skatelab.predict_m_flat_stop', 'Model: top speed {speed} m/s, then friction ({friction} N) slows the rider steadily to a stop after {distance} m in total.'), {
          speed: f(facts.topSpeed, 2), friction: f(facts.friction, 1), distance: f(facts.stopDistance, 2) })
        : fillTemplate(__alloT('stem.skatelab.predict_m_flat_still', 'Model: the {push} N push is smaller than friction ({friction} N), so the rider never moves.'), {
          push: Math.round(finite(facts.push, 0)), friction: f(facts.friction, 1) });
      case 'flat_mass': return fillTemplate(__alloT('stem.skatelab.predict_m_flat_mass', 'Model: the {light} kg rider stops after {lightDistance} m and the {heavy} kg rider after {heavyDistance} m.'), {
        light: Math.round(facts.lightMass), heavy: Math.round(facts.heavyMass), lightDistance: f(facts.lightDistance, 2), heavyDistance: f(facts.heavyDistance, 2) });
      case 'flat_double': return fillTemplate(__alloT('stem.skatelab.predict_m_flat_double', 'Model: {push} N stops after {distance} m; {double} N stops after {doubleDistance} m.'), {
        push: Math.round(finite(facts.push, 0)), double: Math.round(finite(facts.doublePush, 0)), distance: f(facts.distance, 2), doubleDistance: f(facts.doubleDistance, 2) }) +
        (facts.ratio ? ' ' + fillTemplate(__alloT('stem.skatelab.predict_m_flat_ratio', 'That is {ratio} times as far.'), { ratio: f(facts.ratio, 2) }) : '');
      default: return '';
    }
  }

  function misconceptionLabel(id) {
    switch (id) {
      case 'heavier_higher': return __alloT('stem.skatelab.mis_heavier_higher', 'Heavier riders go higher.');
      case 'low_gravity_higher': return __alloT('stem.skatelab.mis_low_gravity_higher', 'Lower gravity means higher air from the same drop.');
      case 'friction_only_rough': return __alloT('stem.skatelab.mis_friction_only_rough', 'Friction only matters on rough surfaces.');
      case 'spin_needs_energy': return __alloT('stem.skatelab.mis_spin_needs_energy', 'Spinning faster needs extra energy.');
      case 'weight_disappears': return __alloT('stem.skatelab.mis_weight_disappears', 'Weight disappears in the air.');
      case 'drag_45_rule': return __alloT('stem.skatelab.mis_drag_45_rule', 'The 45° range rule always holds, even with drag.');
      case 'motion_needs_force': return __alloT('stem.skatelab.mis_motion_needs_force', 'A moving object needs a force to keep it moving.');
      case 'heavier_falls_faster': return __alloT('stem.skatelab.mis_heavier_falls_faster', 'Heavier riders fall faster.');
      case 'heavier_farther': return __alloT('stem.skatelab.mis_heavier_farther', 'A heavier rider coasts farther from the same push.');
      case 'double_push_double_distance': return __alloT('stem.skatelab.mis_double_push', 'Twice the push means twice the distance.');
      default: return String(id || '');
    }
  }

  function misconceptionWhy(id) {
    switch (id) {
      case 'heavier_higher': return __alloT('stem.skatelab.why_heavier_higher', 'Weight, friction and pump work all grow in step with mass, so mass cancels out of m·g·h = ½·m·v². How high the rider gets does not depend on mass.');
      case 'low_gravity_higher': return __alloT('stem.skatelab.why_low_gravity_higher', 'Weaker gravity gives less energy from the same drop (m·g·h), and it also pulls less on the way up. The two effects cancel, so the same drop gives the same height. Moon air is slower, not higher.');
      case 'friction_only_rough': return __alloT('stem.skatelab.why_friction_only_rough', 'Every surface here has some friction (μ is never zero). Even a waxed surface turns a little motion energy into heat on every pass, so the rider never comes back quite as high and always stops in the end.');
      case 'spin_needs_energy': return __alloT('stem.skatelab.why_spin_needs_energy', 'Tucking takes nothing from the jump. In the air angular momentum L = I·ω stays the same, so a smaller I gives a bigger ω. The height comes from the take-off speed, which tucking does not change.');
      case 'weight_disappears': return __alloT('stem.skatelab.why_weight_disappears', 'Gravity pulls on the rider through the whole jump. At the top the rider only feels weightless because nothing pushes back up: there is no support force.');
      case 'drag_45_rule': return __alloT('stem.skatelab.why_drag_45_rule', 'The 45° rule is for motion with no air drag and the same launch and landing height. Drag slows the rider more on a long, high path, so the best angle drops below 45°. At skate speeds the change is small, but it is there.');
      case 'motion_needs_force': return __alloT('stem.skatelab.why_motion_needs_force', 'Newton’s first law: a moving object keeps moving at the same speed unless a net force acts on it. Nothing pushes the rider forward after the push; the rider slows only because friction acts backward.');
      case 'heavier_falls_faster': return __alloT('stem.skatelab.why_heavier_falls_faster', 'Gravity gives every mass the same acceleration g. With drag, the same air force changes a heavier rider’s motion less, so a heavier rider goes slightly farther, not shorter.');
      case 'heavier_farther': return __alloT('stem.skatelab.why_heavier_farther', 'The same push gives a heavier rider less acceleration (a = F ÷ m), so less speed, and friction μ·m·g is bigger too. The heavier rider stops sooner.');
      case 'double_push_double_distance': return __alloT('stem.skatelab.why_double_push', 'Friction takes the same bite out of both pushes, so doubling the push more than doubles the speed, and stopping distance depends on v². The distance grows much faster than the push.');
      default: return '';
    }
  }

  // P4-2 Simple level: the same ideas in everyday words (grades 6-8).
  function misconceptionWhySimple(id) {
    switch (id) {
      case 'heavier_higher': return __alloT('stem.skatelab.why_simple_heavier_higher', 'A heavier rider has more stored energy, but gravity also pulls harder on them. The two balance out, so both riders reach the same height.');
      case 'low_gravity_higher': return __alloT('stem.skatelab.why_simple_low_gravity', 'On the Moon the drop gives less energy, and gravity also pulls less on the way up. These balance out: same height, but the rider floats for longer.');
      case 'friction_only_rough': return __alloT('stem.skatelab.why_simple_friction', 'Every surface has some friction. Even a waxed ramp turns a little energy of motion into heat on each pass.');
      case 'spin_needs_energy': return __alloT('stem.skatelab.why_simple_spin', 'Tucking in makes you spin faster without using any of your jump energy, like a skater pulling their arms in.');
      case 'weight_disappears': return __alloT('stem.skatelab.why_simple_weight', 'Gravity never switches off. At the top you only feel weightless because nothing is pushing up on you.');
      case 'drag_45_rule': return __alloT('stem.skatelab.why_simple_drag_45', 'The 45° rule only works with no air. Air slows long, high jumps the most, so the best angle is a little lower.');
      case 'motion_needs_force': return __alloT('stem.skatelab.why_simple_motion', 'Once you are moving you keep going on your own. You slow down only because friction pushes back on you.');
      case 'heavier_falls_faster': return __alloT('stem.skatelab.why_simple_falls', 'Gravity speeds up heavy and light riders by the same amount. Air slows a heavy rider a little less, so they go slightly farther.');
      case 'heavier_farther': return __alloT('stem.skatelab.why_simple_heavier_farther', 'The same push speeds up a heavier rider less, and friction is bigger for them too, so they stop sooner.');
      case 'double_push_double_distance': return __alloT('stem.skatelab.why_simple_double', 'A harder push gives more speed, and the distance to stop grows much faster than the speed does.');
      default: return '';
    }
  }

  function predictionVerdictText(outcome) {
    if (!outcome) return '';
    if (outcome.matched) return __alloT('stem.skatelab.predict_verdict_match', 'Your prediction matches the model.');
    return outcome.misconception
      ? fillTemplate(__alloT('stem.skatelab.predict_verdict_mis', 'The model disagrees with your prediction. An idea to rethink: {idea}'), {
        idea: misconceptionLabel(outcome.misconception)
      })
      : __alloT('stem.skatelab.predict_verdict_miss', 'The model disagrees with your prediction.');
  }

  // Offline self-check of a claim-evidence-reasoning answer. It looks for the
  // parts a strong answer has; it does not grade the science.
  function checkCer(entry, keywords) {
    entry = entry || {};
    var claim = String(entry.claim || '');
    var evidence = String(entry.evidence || '');
    var reasoning = String(entry.reasoning || '');
    var words = claim.trim() ? claim.trim().split(/\s+/).length : 0;
    var numbers = (evidence.match(/\d+(?:[.,]\d+)?/g) || []).length;
    var lowerReasoning = reasoning.toLowerCase();
    return [
      { id: 'claim', ok: words >= 6 },
      { id: 'numbers', ok: numbers >= 2 },
      { id: 'units', ok: /(\d\s*(J|N|kg|m\/s²|m\/s|m|s|g|°))|\b(joules?|newtons?|metres?|meters?|seconds?)\b/i.test(evidence) },
      { id: 'idea', ok: (keywords || []).some(function(word) { return lowerReasoning.indexOf(String(word).toLowerCase()) !== -1; }) },
      { id: 'blanks', ok: (claim + evidence + reasoning).indexOf('___') === -1 && !!(claim.trim() && evidence.trim() && reasoning.trim()) }
    ];
  }

  function investigationText(id) {
    switch (id) {
      case 'ke_speed_mass': return {
        title: __alloT('stem.skatelab.inv_ke_title', 'Kinetic energy, speed and mass'),
        question: __alloT('stem.skatelab.inv_ke_question', 'How does a rider’s kinetic energy depend on speed, and on mass?'),
        iv: __alloT('stem.skatelab.inv_ke_iv', 'Launch speed, then rider mass'),
        dv: __alloT('stem.skatelab.inv_ke_dv', 'Kinetic energy at launch (J)'),
        controlled: __alloT('stem.skatelab.inv_ke_controlled', 'Launch angle, gap, gravity, board, wind'),
        claim: __alloT('stem.skatelab.inv_ke_claim', 'When the speed doubles, the kinetic energy ___. When the mass doubles, the kinetic energy ___.'),
        evidence: __alloT('stem.skatelab.inv_ke_evidence', 'At ___ m/s the KE was ___ J, and at ___ m/s it was ___ J. KE against v² makes a straight line with r² = ___.'),
        reasoning: __alloT('stem.skatelab.inv_ke_reasoning', 'KE = ½·m·v², so KE grows with the ___ of the speed but only ___ with mass.'),
        idea: __alloT('stem.skatelab.inv_ke_idea', 'KE = ½·m·v²: kinetic energy is proportional to mass and to the square of speed.'),
        note: __alloT('stem.skatelab.inv_ke_note', 'Plot KE against v² for the speed runs, then KE against mass for the mass runs.'),
        keywords: ['½', 'mv', 'v²', 'v^2', 'square']
      };
      case 'pe_height': return {
        title: __alloT('stem.skatelab.inv_pe_title', 'Height and stored energy'),
        question: __alloT('stem.skatelab.inv_pe_question', 'How does the drop-in height change the stored (potential) energy and the energy of motion at the bottom?'),
        iv: __alloT('stem.skatelab.inv_pe_iv', 'Drop-in height h'),
        dv: __alloT('stem.skatelab.inv_pe_dv', 'Starting PE (J) and KE at the bottom (J)'),
        controlled: __alloT('stem.skatelab.inv_pe_controlled', 'Mass, gravity, surface, ramp depth, no pumps'),
        claim: __alloT('stem.skatelab.inv_pe_claim', 'When the drop height doubles, the starting PE ___ and the KE at the bottom ___.'),
        evidence: __alloT('stem.skatelab.inv_pe_evidence', 'From ___ m the PE was ___ J; from ___ m it was ___ J. The slope of PE against h is ___ J per m, close to m·g.'),
        reasoning: __alloT('stem.skatelab.inv_pe_reasoning', 'PE = m·g·h, so ___. On the way down PE turns into KE, minus a little heat from friction, so ___.'),
        idea: __alloT('stem.skatelab.inv_pe_idea', 'PE = m·g·h, and on the way down PE turns into KE (minus a little heat).'),
        note: __alloT('stem.skatelab.inv_pe_note', 'Tip: these runs rock for a long time; 10× playback is set for you.'),
        keywords: ['mgh', 'm·g·h', 'PE', 'potential', 'height']
      };
      case 'energy_where': return {
        title: __alloT('stem.skatelab.inv_where_title', 'Where does the energy go?'),
        question: __alloT('stem.skatelab.inv_where_question', 'Each pass ends lower. Where does the rider’s energy go, and how does the surface change it?'),
        iv: __alloT('stem.skatelab.inv_where_iv', 'Surface (friction coefficient μ)'),
        dv: __alloT('stem.skatelab.inv_where_dv', 'Heat after one pass (J) and total heat (J)'),
        controlled: __alloT('stem.skatelab.inv_where_controlled', 'Drop height, mass, gravity, no pumps'),
        claim: __alloT('stem.skatelab.inv_where_claim', 'The energy the rider loses on each pass becomes ___. A bigger μ makes ___.'),
        evidence: __alloT('stem.skatelab.inv_where_evidence', 'After one pass the heat was ___ J on wax, ___ J on concrete and ___ J on rough. At the end the total heat was ___ J every time, the same as the starting PE.'),
        reasoning: __alloT('stem.skatelab.inv_where_reasoning', 'Friction f = μ·N acts over the whole path, and its work becomes ___. Energy is conserved, so ___.'),
        idea: __alloT('stem.skatelab.inv_where_idea', 'Energy is conserved: friction transfers motion and height energy into thermal energy (heat).'),
        note: __alloT('stem.skatelab.inv_where_note', 'Tip: a waxed run rocks for minutes of model time; 10× playback is set for you.'),
        keywords: ['heat', 'thermal', 'friction', 'μ', 'conserv', 'transfer']
      };
      case 'net_force': return {
        title: __alloT('stem.skatelab.inv_force_title', 'Net force and acceleration'),
        question: __alloT('stem.skatelab.inv_force_question', 'On flat ground, how does the acceleration during the push depend on the net force and on mass?'),
        iv: __alloT('stem.skatelab.inv_force_iv', 'Push force, then rider mass'),
        dv: __alloT('stem.skatelab.inv_force_dv', 'Acceleration during the push (m/s²)'),
        controlled: __alloT('stem.skatelab.inv_force_controlled', 'Surface, gravity, push time (0.5 s)'),
        claim: __alloT('stem.skatelab.inv_force_claim', 'When the net force doubles, the acceleration ___. A heavier rider with the same push ___.'),
        evidence: __alloT('stem.skatelab.inv_force_evidence', 'With a net force of ___ N the acceleration was ___ m/s². The best-fit slope is ___ per kg, close to 1 ÷ m.'),
        reasoning: __alloT('stem.skatelab.inv_force_reasoning', 'Newton’s second law says ΣF = m·a, so a = ___. Friction μ·m·g is taken away from the push, so ___.'),
        idea: __alloT('stem.skatelab.inv_force_idea', 'ΣF = m·a: acceleration is proportional to the net force and inversely proportional to mass.'),
        note: __alloT('stem.skatelab.inv_force_note', 'The last run uses a heavier rider with a 300 N push: compare it with the 300 N run.'),
        keywords: ['ΣF', 'm·a', 'ma', 'net force', 'second law', 'F = m']
      };
      case 'landing_design': return {
        title: __alloT('stem.skatelab.inv_landing_title', 'Design a safer landing'),
        question: __alloT('stem.skatelab.inv_landing_question', 'Design challenge: how much landing absorption (bending the knees) keeps the peak landing load under 4 g on a 20 ft gap?'),
        iv: __alloT('stem.skatelab.inv_landing_iv', 'Landing absorption distance d'),
        dv: __alloT('stem.skatelab.inv_landing_dv', 'Peak landing load (g)'),
        controlled: __alloT('stem.skatelab.inv_landing_controlled', '19 mph, 30° ramp, 20 ft gap, mass, gravity'),
        claim: __alloT('stem.skatelab.inv_landing_claim', 'To keep the peak load under 4 g the rider needs at least ___ m of absorption. More absorption ___ the peak load.'),
        evidence: __alloT('stem.skatelab.inv_landing_evidence', 'With d = ___ m the peak load was ___ g; with d = ___ m it was ___ g. The design that meets the 4 g limit is ___.'),
        reasoning: __alloT('stem.skatelab.inv_landing_reasoning', 'The landing must remove the same momentum (impulse = F·Δt = m·Δv). Spreading it over a longer distance and time needs ___ force. Trade-off: ___.'),
        idea: __alloT('stem.skatelab.inv_landing_idea', 'Impulse: the same change in momentum over a longer time or distance needs a smaller force.'),
        note: __alloT('stem.skatelab.inv_landing_note', 'Criteria: lands on the deck, peak load under 4 g. Constraint: real knees can absorb only about 0.5-0.9 m.'),
        keywords: ['impulse', 'momentum', 'Δt', 'time', 'distance', 'F·Δt']
      };
      case 'tuck_open': return {
        title: __alloT('stem.skatelab.inv_spin_title', 'Angular momentum: tuck or open'),
        question: __alloT('stem.skatelab.inv_spin_question', 'How does pulling into a tuck change how fast the rider spins, and what stays the same?'),
        iv: __alloT('stem.skatelab.inv_spin_iv', 'Body position (rotational inertia I)'),
        dv: __alloT('stem.skatelab.inv_spin_dv', 'Spin rate ω in the air (°/s) and angular momentum L'),
        controlled: __alloT('stem.skatelab.inv_spin_controlled', 'Take-off spin rate, pumps, drop height, mass, gravity'),
        claim: __alloT('stem.skatelab.inv_spin_claim', 'When the rotational inertia gets smaller, the spin rate ___ and the angular momentum ___.'),
        evidence: __alloT('stem.skatelab.inv_spin_evidence', 'Open: I = ___ kg·m², ω = ___ °/s. Tucked: I = ___ kg·m², ω = ___ °/s. L was ___ kg·m²/s in every run.'),
        reasoning: __alloT('stem.skatelab.inv_spin_reasoning', 'In the air nothing twists the rider (no torque), so L = I·ω is conserved. A smaller I therefore means ___.'),
        idea: __alloT('stem.skatelab.inv_spin_idea', 'Angular momentum L = I·ω is conserved in the air.'),
        note: __alloT('stem.skatelab.inv_spin_note', 'ω against 1 ÷ I is a straight line through the origin; its slope is L (in degrees). Some spins will not land: the data still count.'),
        keywords: ['I·ω', 'Iω', 'angular momentum', 'conserv', 'torque', 'inertia']
      };
      case 'range_angle': return {
        title: __alloT('stem.skatelab.inv_range_title', 'Range, angle and air drag'),
        question: __alloT('stem.skatelab.inv_range_question', 'Which launch angle gives the longest jump, with and without air drag?'),
        iv: __alloT('stem.skatelab.inv_range_iv', 'Launch angle (drag on, then off)'),
        dv: __alloT('stem.skatelab.inv_range_dv', 'Range (m)'),
        controlled: __alloT('stem.skatelab.inv_range_controlled', 'Launch speed 20 mph, gap, mass, gravity, calm air'),
        claim: __alloT('stem.skatelab.inv_range_claim', 'With no drag the longest jump is at ___°. Drag makes every jump ___ and moves the best angle ___.'),
        evidence: __alloT('stem.skatelab.inv_range_evidence', 'No drag: ___ m at 45°, ___ m at 25° and ___ m at 65°. With drag: ___ m at 45°.'),
        reasoning: __alloT('stem.skatelab.inv_range_reasoning', 'With no drag, R = v²·sin(2θ) ÷ g, which is largest at θ = 45°. Drag ___.'),
        idea: __alloT('stem.skatelab.inv_range_idea', 'R = v²·sin(2θ) ÷ g peaks at 45° with no drag; drag shortens the range and lowers the best angle slightly.'),
        note: __alloT('stem.skatelab.inv_range_note', 'A straight line does not fit this data: look for the peak, and group the points by drag.'),
        keywords: ['sin', '2θ', '45', 'drag', 'symmetr']
      };
      default: return null;
    }
  }

  function planStepLabel(step) {
    var value = step.value;
    switch (step.vary) {
      case 'speedMph': return fillTemplate(__alloT('stem.skatelab.step_speed', '{value} mph'), { value: value });
      case 'riderMassKg': return fillTemplate(__alloT('stem.skatelab.step_mass', '{value} kg rider'), { value: value });
      case 'dropHeightM': return fillTemplate(__alloT('stem.skatelab.step_drop', 'drop {value} m'), { value: value });
      case 'surfaceId': return surfaceName(value);
      case 'pushForceN': return fillTemplate(__alloT('stem.skatelab.step_push', '{value} N push'), { value: value });
      case 'landingCompressionM': return fillTemplate(__alloT('stem.skatelab.step_absorption', 'd = {value} m'), { value: value });
      case 'bodyPositionId': return bodyName(value);
      case 'angleDeg': return fillTemplate(step.patch.airDrag === false
        ? __alloT('stem.skatelab.step_angle_ideal', '{value}°, no drag')
        : __alloT('stem.skatelab.step_angle_drag', '{value}°, drag on'), { value: value });
      default: return String(value);
    }
  }

  // ---- Stage C text: missions, narration, plain summaries, vocabulary ----
  function missionText(id) {
    switch (id) {
      case 'spin_540': return {
        title: __alloT('stem.skatelab.mission_540_title', 'Land a 540'),
        goal: __alloT('stem.skatelab.mission_540_goal', 'On the halfpipe, land a 540° spin (one and a half turns) and ride away safely.'),
        hints: [
          __alloT('stem.skatelab.mission_540_hint1', 'A 540 needs more spin than a 180 or a 360. Try a faster take-off spin rate, or change your body position.'),
          __alloT('stem.skatelab.mission_540_hint2', 'The board must come down close to a half-turn. Change the spin rate in small steps and watch “Modeled rotation”.')
        ]
      };
      case 'tuck_360': return {
        title: __alloT('stem.skatelab.mission_tuck_title', 'Spin smart: a 360 with less spin'),
        goal: fillTemplate(__alloT('stem.skatelab.mission_tuck_goal', 'Land a 360° spin with a take-off spin rate of {max}°/s or less.'), { max: MISSION_TUCK_MAX_SPIN }),
        hints: [
          __alloT('stem.skatelab.mission_tuck_hint1', 'Your body position changes how fast you spin in the air, without adding any energy.'),
          __alloT('stem.skatelab.mission_tuck_hint2', 'A tucked body has a smaller rotational inertia I. Angular momentum L = I·ω stays the same in the air, so ω goes up.')
        ]
      };
      case 'fewest_pumps': return {
        title: __alloT('stem.skatelab.mission_pumps_title', 'Air with the fewest pumps'),
        goal: fillTemplate(__alloT('stem.skatelab.mission_pumps_goal', 'Get at least {air} m of air above the lip, using the fewest pumps that can do it from your drop.'), { air: MISSION_AIR_TARGET_M }),
        hints: [
          __alloT('stem.skatelab.mission_pumps_hint1', 'Each pump adds energy from the rider’s muscles. More pumps than you need is wasted work.'),
          __alloT('stem.skatelab.mission_pumps_hint2', 'Pump where the ramp pushes back hardest (the bottom), then take away one pump at a time until the air falls below the target.')
        ]
      };
      case 'small_drop_air': return {
        title: __alloT('stem.skatelab.mission_small_title', 'Big air from a small drop'),
        goal: fillTemplate(__alloT('stem.skatelab.mission_small_goal', 'Start from a drop of {drop} m or less and pump to at least {air} m of air above the lip.'), {
          drop: MISSION_SMALL_DROP_M, air: MISSION_SMALL_DROP_AIR_M }),
        hints: [
          __alloT('stem.skatelab.mission_small_hint1', 'From a small drop on a deep ramp the rider never reaches the lip. What could you change about the ramp?'),
          __alloT('stem.skatelab.mission_small_hint2', 'Open Advanced physics and make the ramp shallower, then add pumps at the bottom.')
        ]
      };
      case 'moon_hang': return {
        title: __alloT('stem.skatelab.mission_moon_title', 'Moon hang time'),
        goal: fillTemplate(__alloT('stem.skatelab.mission_moon_goal', 'On the Moon, predict the hang time (seconds in the air) before you run a new setup. Get within {pct}% of the model.'), {
          pct: MISSION_GUESS_TOLERANCE_PCT }),
        hints: [
          __alloT('stem.skatelab.mission_moon_hint1', 'On the Moon the same drop gives the same height as on Earth, but gravity is about 6 times weaker.'),
          __alloT('stem.skatelab.mission_moon_hint2', 'Time in the air is t = 2v ÷ g. Run the setup on Earth first: if g is about 6 times smaller, what happens to t?')
        ]
      };
      case 'flat_target': return {
        title: __alloT('stem.skatelab.mission_target_title', 'Stop on the mark'),
        goal: fillTemplate(__alloT('stem.skatelab.mission_target_goal', 'On flat ground, stop within 1 m of the {target} m mark.'), { target: MISSION_FLAT_TARGET_M }),
        hints: [
          __alloT('stem.skatelab.mission_target_hint1', 'A harder push makes you roll farther. Then friction slows you at a steady rate.'),
          __alloT('stem.skatelab.mission_target_hint2', 'Stopping distance grows with the square of the top speed, so change the push in small steps.')
        ]
      };
      case 'rough_stop': return {
        title: __alloT('stem.skatelab.mission_rough_title', 'Rough stop'),
        goal: fillTemplate(__alloT('stem.skatelab.mission_rough_goal', 'On rough concrete, push with at least {push} N and stop within {stop} m.'), {
          push: MISSION_ROUGH_MIN_PUSH_N, stop: MISSION_ROUGH_MAX_STOP_M }),
        hints: [
          __alloT('stem.skatelab.mission_rough_hint1', 'Rough concrete has the biggest friction coefficient μ of the three surfaces.'),
          __alloT('stem.skatelab.mission_rough_hint2', 'Any push above the minimum makes you roll farther, so look for the smallest push that still counts.')
        ]
      };
      case 'gap_drag': return {
        title: __alloT('stem.skatelab.mission_gap_title', 'Clear 20 ft in real air'),
        goal: fillTemplate(__alloT('stem.skatelab.mission_gap_goal', 'With air drag on, land a gap of {gap} ft or more in the landing zone.'), { gap: MISSION_GAP_FT }),
        hints: [
          __alloT('stem.skatelab.mission_gap_hint1', 'Drag takes away a little speed in the air, so you need slightly more than the no-drag answer.'),
          __alloT('stem.skatelab.mission_gap_hint2', 'Range depends on speed squared and on the angle. Try an angle near 35° to 40° and change the speed 1 mph at a time.')
        ]
      };
      case 'soft_landing': return {
        title: __alloT('stem.skatelab.mission_soft_title', 'Soft landing'),
        goal: fillTemplate(__alloT('stem.skatelab.mission_soft_goal', 'Land a {gap} ft gap with a peak landing load under {g} g by choosing how far you bend your knees (landing absorption).'), {
          gap: MISSION_GAP_FT, g: MISSION_MAX_LANDING_G }),
        hints: [
          __alloT('stem.skatelab.mission_soft_hint1', 'The landing must stop the same downward motion every time. What can you change about how it stops?'),
          __alloT('stem.skatelab.mission_soft_hint2', 'Open Advanced physics and increase Landing absorption: stopping over a longer distance needs a smaller force.')
        ]
      };
      case 'crosswind_lane': return {
        title: __alloT('stem.skatelab.mission_cross_title', 'Crosswind landing'),
        goal: __alloT('stem.skatelab.mission_cross_goal', 'With a crosswind and air drag on, land inside the landing lane.'),
        hints: [
          __alloT('stem.skatelab.mission_cross_hint1', 'A crosswind pushes the rider sideways for the whole time they are in the air.'),
          __alloT('stem.skatelab.mission_cross_hint2', 'Less time in the air means less sideways drift. Try a lower angle with enough speed to still reach the deck.')
        ]
      };
      default: return null;
    }
  }

  function missionValueText(id, value) {
    if (value == null || !Number.isFinite(Number(value))) return '';
    switch (id) {
      case 'spin_540': return fillTemplate(__alloT('stem.skatelab.mission_value_spin', '{value}° of spin'), { value: Math.round(value) });
      case 'tuck_360': return fillTemplate(__alloT('stem.skatelab.mission_value_rate', 'take-off spin {value}°/s'), { value: Math.round(value) });
      case 'fewest_pumps': return fillTemplate(__alloT('stem.skatelab.mission_value_pumps', '{value} pumps'), { value: Math.round(value) });
      case 'small_drop_air': return fillTemplate(__alloT('stem.skatelab.mission_value_air', '{value} m of air'), { value: rounded(value, 2) });
      case 'moon_hang': return fillTemplate(__alloT('stem.skatelab.mission_value_hang', 'hang time {value} s'), { value: rounded(value, 2) });
      case 'flat_target':
      case 'rough_stop': return fillTemplate(__alloT('stem.skatelab.mission_value_stop', 'stopped after {value} m'), { value: rounded(value, 2) });
      case 'gap_drag': return fillTemplate(__alloT('stem.skatelab.mission_value_range', 'range {value} ft'), { value: rounded(value, 1) });
      case 'soft_landing': return fillTemplate(__alloT('stem.skatelab.mission_value_load', 'peak landing load {value} g'), { value: rounded(value, 1) });
      case 'crosswind_lane': return fillTemplate(__alloT('stem.skatelab.mission_value_drift', 'sideways drift {value} ft'), { value: rounded(value, 1) });
      default: return '';
    }
  }

  // Feedback after a run, from checkMission's reason code. It never names the
  // setting that would solve the mission.
  function missionResultText(result) {
    if (!result) return '';
    var value = missionValueText(result.id, result.value);
    var lead;
    switch (result.reason) {
      case 'done': lead = __alloT('stem.skatelab.mission_done', 'Mission complete!'); break;
      case 'mode': return __alloT('stem.skatelab.mission_other_mode', 'That run was in a different experiment, so it does not count for this mission.');
      case 'too_fast': lead = fillTemplate(__alloT('stem.skatelab.mission_too_fast', 'You landed the 360, but the take-off spin was faster than {max}°/s.'), { max: MISSION_TUCK_MAX_SPIN }); break;
      case 'fewer_possible': lead = __alloT('stem.skatelab.mission_fewer', 'You got the air, but fewer pumps can do it from this drop.'); break;
      case 'not_moon': return __alloT('stem.skatelab.mission_not_moon', 'This run was not on the Moon. Set gravity to the Moon first.');
      case 'no_air': lead = __alloT('stem.skatelab.mission_no_air', 'No air this time, so there was no hang time to check.'); break;
      case 'no_guess': lead = __alloT('stem.skatelab.mission_no_guess', 'No prediction counted: type your hang-time prediction for a new setup before you run it.'); break;
      case 'guess_off': lead = fillTemplate(__alloT('stem.skatelab.mission_guess_off', 'Your prediction was {error}% away from the model. Try a new Moon setup and get within {pct}%.'), {
        error: rounded(result.guessErrorPct, 0), pct: MISSION_GUESS_TOLERANCE_PCT }); break;
      default: lead = __alloT('stem.skatelab.mission_not_yet', 'Not yet. Change one thing and try again.');
    }
    return value ? fillTemplate(__alloT('stem.skatelab.mission_last_try', '{lead} Last run: {value}.'), { lead: lead, value: value }) : lead;
  }

  // Spoken (or stepped) description of one moment, with the energy values.
  function narrationText(sim, sample) {
    if (!sim || !sample) return '';
    var text = fillTemplate(__alloT('stem.skatelab.narrate_phase', '{phase} at {time} seconds. Speed {speed} metres per second.'), {
      phase: phaseLabel(sample.phase),
      time: rounded(sample.time, 1),
      speed: rounded(sample.speedMps, 1)
    });
    if (sim.mode === 'gap') {
      text += ' ' + fillTemplate(__alloT('stem.skatelab.narrate_gap', 'Height {height} metres. Kinetic energy {ke} joules, potential energy {pe} joules, heat {heat} joules.'), {
        height: rounded(sample.y, 2),
        ke: Math.round(finite(sample.keJ, 0)),
        pe: Math.round(finite(sample.peJ, 0)),
        heat: Math.round(finite(sample.thermalJ, 0))
      });
    } else if (sim.mode === 'flat') {
      text += ' ' + fillTemplate(__alloT('stem.skatelab.narrate_flat', 'Distance {distance} metres. Kinetic energy {ke} joules, heat {heat} joules, work by the rider {work} joules.'), {
        distance: rounded(sample.x, 2),
        ke: Math.round(finite(sample.keJ, 0)),
        heat: Math.round(finite(sample.thermalJ, 0)),
        work: Math.round(finite(sample.riderWorkJ, 0))
      });
    } else {
      text += ' ' + fillTemplate(__alloT('stem.skatelab.narrate_halfpipe', 'Height {height} metres. Kinetic energy {ke} joules, potential energy {pe} joules, heat {heat} joules, work by the rider {work} joules.'), {
        height: rounded(sample.y, 2),
        ke: Math.round(finite(sample.keJ, 0)),
        pe: Math.round(finite(sample.peJ, 0)),
        heat: Math.round(finite(sample.thermalJ, 0)),
        work: Math.round(finite(sample.riderWorkJ, 0))
      });
    }
    return text;
  }

  // P4-2 Simple level: what happened, in everyday words, from the model.
  function plainSummary(sim) {
    if (!sim) return '';
    if (sim.mode === 'flat') {
      if (!sim.moves) {
        return fillTemplate(__alloT('stem.skatelab.plain_flat_still', 'The push ({push} N) was not stronger than friction ({friction} N), so the rider did not move.'), {
          push: Math.round(sim.pushForceN), friction: rounded(sim.frictionN, 1) });
      }
      return fillTemplate(__alloT('stem.skatelab.plain_flat', 'The push gave the rider {ke} J of energy of motion and a top speed of {speed} m/s. Then friction ({friction} N) slowed the rider steadily until it stopped after {distance} m. All of that energy became heat.'), {
        ke: Math.round(sim.topKineticJ), speed: rounded(sim.topSpeed, 2), friction: rounded(sim.frictionN, 1), distance: rounded(sim.stopDistanceM, 2) });
    }
    if (sim.mode === 'halfpipe') {
      var start = fillTemplate(__alloT('stem.skatelab.plain_halfpipe', 'The rider started {drop} m up the ramp with {pe} J of energy stored by height. Rolling down, that turned into energy of motion. {pumps} pumps added {work} J from the rider’s muscles, and friction turned {heat} J into heat.'), {
        drop: rounded(sim.dropHeightM, 1), pe: Math.round(sim.startPotentialJ), pumps: sim.pumps, work: Math.round(sim.riderWorkJ), heat: Math.round(sim.thermalJ) });
      return start + ' ' + (sim.hasAir
        ? fillTemplate(__alloT('stem.skatelab.plain_halfpipe_air', 'The rider flew {height} m above the edge for {time} s and spun {spin}°.'), {
          height: rounded(sim.hAir, 2), time: rounded(sim.airTime, 2), spin: Math.round(sim.completed) })
        : __alloT('stem.skatelab.plain_halfpipe_no_air', 'The rider never had enough energy to rise above the edge of the ramp.'));
    }
    var flight = fillTemplate(__alloT('stem.skatelab.plain_gap', 'The rider left the ramp at {speed} m/s and travelled {range} m through the air.'), {
      speed: rounded(sim.speedMps, 1), range: rounded(sim.rangeM, 2) });
    return flight + ' ' + (sim.hasLandingContact
      ? fillTemplate(__alloT('stem.skatelab.plain_gap_landing', 'Bending the knees over {absorption} m spread out the landing, so the biggest push from the deck was {g} times the rider’s weight.'), {
        absorption: rounded(sim.landingCompressionM, 2), g: rounded(getLandingPeakG(sim), 1) })
      : __alloT('stem.skatelab.plain_gap_miss', 'The rider did not land on the deck.'));
  }

  // Key terms for the vocabulary pop-overs: Simple gives everyday words,
  // Standard the equation, Extended adds the calculus form.
  var VOCAB_IDS = ['kinetic', 'potential', 'work', 'friction', 'normal', 'net', 'impulse', 'angular', 'inertia', 'drag'];
  function vocabularyList(level) {
    function entry(id, term, simple, standard, extended) {
      var text = level === 'simple' ? simple : (level === 'extended' ? standard + ' ' + extended : standard);
      return { id: id, term: term, text: text };
    }
    return VOCAB_IDS.map(function(id) {
      switch (id) {
        case 'kinetic': return entry(id, __alloT('stem.skatelab.vocab_kinetic', 'Kinetic energy (KE)'),
          __alloT('stem.skatelab.vocab_kinetic_simple', 'Energy of motion. The faster something moves, the more it has.'),
          __alloT('stem.skatelab.vocab_kinetic_standard', 'Energy of motion: KE = ½·m·v². Twice the speed gives four times the KE.'),
          __alloT('stem.skatelab.vocab_kinetic_extended', 'Work–energy theorem: ΔKE = ∫ΣF·ds along the path.'));
        case 'potential': return entry(id, __alloT('stem.skatelab.vocab_potential', 'Potential energy (PE)'),
          __alloT('stem.skatelab.vocab_potential_simple', 'Energy stored by height. The higher up, the more is stored.'),
          __alloT('stem.skatelab.vocab_potential_standard', 'Gravitational potential energy PE = m·g·h, measured from a chosen zero height.'),
          __alloT('stem.skatelab.vocab_potential_extended', 'Gravity is conservative: its work −ΔPE depends only on the change in height, not on the path.'));
        case 'work': return entry(id, __alloT('stem.skatelab.vocab_work', 'Work'),
          __alloT('stem.skatelab.vocab_work_simple', 'Energy moved by a force that pushes something along. Your muscles do work when you push or pump.'),
          __alloT('stem.skatelab.vocab_work_standard', 'Work W = F·d along the motion. The rider’s pushes and pumps put energy in.'),
          __alloT('stem.skatelab.vocab_work_extended', 'W = ∫F·ds; each pump does W = N·Δh against the normal force.'));
        case 'friction': return entry(id, __alloT('stem.skatelab.vocab_friction', 'Friction'),
          __alloT('stem.skatelab.vocab_friction_simple', 'A force from the surface that works against rolling or sliding. It turns energy of motion into heat.'),
          __alloT('stem.skatelab.vocab_friction_standard', 'Rolling friction f = μ·N acts along the surface, against the motion. Its work becomes thermal energy.'),
          __alloT('stem.skatelab.vocab_friction_extended', 'The heat is the path integral Q = ∫μ·N ds, so it depends on the distance travelled and on N along the way.'));
        case 'normal': return entry(id, __alloT('stem.skatelab.vocab_normal', 'Normal force (N)'),
          __alloT('stem.skatelab.vocab_normal_simple', 'The push of a surface on you, straight out from the surface.'),
          __alloT('stem.skatelab.vocab_normal_standard', 'The normal force N acts at right angles to the surface. On a curve, N − m·g·n_y = m·v²·κ.'),
          __alloT('stem.skatelab.vocab_normal_extended', 'In the path frame the normal direction carries the centripetal term ΣF_n = m·v²·κ, where κ is the ramp’s curvature.'));
        case 'net': return entry(id, __alloT('stem.skatelab.vocab_net', 'Net force (ΣF)'),
          __alloT('stem.skatelab.vocab_net_simple', 'All the forces added together. It is what changes your speed or direction.'),
          __alloT('stem.skatelab.vocab_net_standard', 'The vector sum of all the forces. Newton’s second law: ΣF = m·a.'),
          __alloT('stem.skatelab.vocab_net_extended', 'ΣF = dp/dt; with constant mass this is m·dv/dt = m·a.'));
        case 'impulse': return entry(id, __alloT('stem.skatelab.vocab_impulse', 'Impulse'),
          __alloT('stem.skatelab.vocab_impulse_simple', 'A push that lasts for some time. A longer, gentler push can stop you just as well as a short, hard one.'),
          __alloT('stem.skatelab.vocab_impulse_standard', 'Impulse J = F·Δt = Δp. The same change in momentum over a longer time needs a smaller force.'),
          __alloT('stem.skatelab.vocab_impulse_extended', 'J = ∫F dt = Δp; for the half-sine landing pulse the peak force is π/2 times the average.'));
        case 'angular': return entry(id, __alloT('stem.skatelab.vocab_angular', 'Angular momentum (L)'),
          __alloT('stem.skatelab.vocab_angular_simple', 'How much spin something has. Pulling in makes you spin faster without any extra energy.'),
          __alloT('stem.skatelab.vocab_angular_standard', 'L = I·ω. With no twisting force (torque) in the air, L stays the same.'),
          __alloT('stem.skatelab.vocab_angular_extended', 'τ = dL/dt; with τ = 0 in the air, I₁·ω₁ = I₂·ω₂.'));
        case 'inertia': return entry(id, __alloT('stem.skatelab.vocab_inertia', 'Rotational inertia (I)'),
          __alloT('stem.skatelab.vocab_inertia_simple', 'How hard it is to start or stop spinning. A tucked body is easier to spin.'),
          __alloT('stem.skatelab.vocab_inertia_standard', 'I = Σm·r²: mass far from the spin axis makes I bigger.'),
          __alloT('stem.skatelab.vocab_inertia_extended', 'This model uses I = m·r²·k, with k = 1.22 open, 1 neutral and 0.74 tucked.'));
        default: return entry(id, __alloT('stem.skatelab.vocab_drag', 'Air drag'),
          __alloT('stem.skatelab.vocab_drag_simple', 'The push of the air against a moving rider. It slows you down.'),
          __alloT('stem.skatelab.vocab_drag_standard', 'Quadratic drag F = ½·ρ·C_d·A·v², pointing against the motion through the air.'),
          __alloT('stem.skatelab.vocab_drag_extended', 'm·dv/dt = m·g − ½·ρ·C_d·A·|v_rel|·v_rel, solved step by step every 1/180 s.'));
      }
    });
  }

  function outcomeName(outcome) {
    switch (outcome) {
      case 'no-air': return __alloT('stem.skatelab.outcome_no_air', 'no air');
      case 'unsafe-contact': return __alloT('stem.skatelab.outcome_unsafe_contact', 'unsafe contact');
      case 'trick-missed': return __alloT('stem.skatelab.outcome_trick_missed', 'trick missed');
      case 'solver-limit': return __alloT('stem.skatelab.outcome_solver_limit', 'solver limit');
      case 'platform-face': return __alloT('stem.skatelab.outcome_platform_face', 'platform face');
      case 'fell-short': return __alloT('stem.skatelab.outcome_fell_short', 'fell short');
      case 'fell-off-platform': return __alloT('stem.skatelab.outcome_fell_off', 'fell off platform');
      case 'off-lane': return __alloT('stem.skatelab.outcome_off_lane', 'off lane');
      case 'overshot': return __alloT('stem.skatelab.outcome_overshot', 'overshot');
      default: return String(outcome || '').replace(/-/g, ' ');
    }
  }

  // The outcome word of one log row (shared by the table, CSV and report).
  function logEntryOutcome(entry) {
    entry = entry || {};
    if (entry.mode === 'flat') {
      return entry.runSuccessful
        ? __alloT('stem.skatelab.log_outcome_stopped', 'Stopped by friction')
        : __alloT('stem.skatelab.log_outcome_no_motion', 'No motion');
    }
    if (typeof entry.runSuccessful === 'boolean') {
      return entry.runSuccessful
        ? __alloT('stem.skatelab.log_outcome_met', 'Target met')
        : (entry.outcome ? outcomeName(entry.outcome) : __alloT('stem.skatelab.log_outcome_missed', 'Missed'));
    }
    return entry.landed ? __alloT('stem.skatelab.log_outcome_landed', 'Landed') : __alloT('stem.skatelab.log_outcome_missed', 'Missed');
  }

  function modeName(mode) {
    if (mode === 'flat') return __alloT('stem.skatelab.log_mode_flat', 'Flat');
    if (mode === 'gap') return __alloT('stem.skatelab.log_mode_gap', 'Gap');
    return __alloT('stem.skatelab.log_mode_halfpipe', 'Halfpipe');
  }

  // ---- Stage C P4-3 teacher locks and the class-style report ----
  var TEACHER_LOCK_KEYS = ['mode', 'vehicle', 'gravity', 'riderMassKg', 'surfaceId', 'airDrag', 'windId', 'estimateChallenge'];
  function lockLabel(key) {
    switch (key) {
      case 'mode': return __alloT('stem.skatelab.lock_mode', 'Experiment type');
      case 'vehicle': return __alloT('stem.skatelab.lock_vehicle', 'Ride (skateboard or BMX)');
      case 'gravity': return __alloT('stem.skatelab.lock_gravity', 'Gravity');
      case 'riderMassKg': return __alloT('stem.skatelab.lock_mass', 'Rider mass');
      case 'surfaceId': return __alloT('stem.skatelab.lock_surface', 'Surface');
      case 'airDrag': return __alloT('stem.skatelab.lock_drag', 'Air drag');
      case 'windId': return __alloT('stem.skatelab.lock_wind', 'Wind');
      case 'estimateChallenge': return __alloT('stem.skatelab.lock_predict', 'Predict before each run');
      default: return String(key);
    }
  }
  function lockValueText(key, value) {
    if (key === 'mode') return modeName(value);
    if (key === 'vehicle') return vehicleName(value);
    if (key === 'gravity') return rounded(value, 2) + ' m/s²';
    if (key === 'riderMassKg') return Math.round(finite(value, RIDER_KG)) + ' kg';
    if (key === 'surfaceId') return surfaceLabel(value);
    if (key === 'windId') return windName(value);
    if (key === 'airDrag' || key === 'estimateChallenge') {
      return value === false ? __alloT('stem.skatelab.value_off', 'off') : __alloT('stem.skatelab.value_on', 'on');
    }
    return String(value);
  }

  function vehicleName(id) {
    return id === 'bmx' ? __alloT('stem.skatelab.vehicle_bmx', 'BMX') : __alloT('stem.skatelab.vehicle_skate', 'Skateboard');
  }
  function surfaceLabel(id) {
    if (id === 'wax') return __alloT('stem.skatelab.surface_wax', 'Waxed');
    if (id === 'rough') return __alloT('stem.skatelab.surface_rough', 'Rough');
    return __alloT('stem.skatelab.surface_concrete', 'Concrete');
  }
  function bodyPositionLabel(id) {
    if (id === 'open') return __alloT('stem.skatelab.body_open', 'Open');
    if (id === 'tuck') return __alloT('stem.skatelab.body_tuck', 'Tucked');
    return __alloT('stem.skatelab.body_neutral', 'Neutral');
  }
  function bodyPositionNote(id) {
    if (id === 'open') return __alloT('stem.skatelab.body_note_open', 'larger rotational inertia');
    if (id === 'tuck') return __alloT('stem.skatelab.body_note_tuck', 'smaller rotational inertia');
    return __alloT('stem.skatelab.body_note_neutral', 'baseline rotational inertia');
  }
  function windName(id) {
    switch (id) {
      case 'head_strong': return __alloT('stem.skatelab.wind_head_strong', 'Strong headwind');
      case 'head': return __alloT('stem.skatelab.wind_head', 'Headwind');
      case 'tail': return __alloT('stem.skatelab.wind_tail', 'Tailwind');
      case 'tail_strong': return __alloT('stem.skatelab.wind_tail_strong', 'Strong tailwind');
      case 'cross_left': return __alloT('stem.skatelab.wind_cross_left', 'Crosswind left');
      case 'cross_right': return __alloT('stem.skatelab.wind_cross_right', 'Crosswind right');
      default: return __alloT('stem.skatelab.wind_calm', 'Calm');
    }
  }

  function htmlEscape(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  // Everything a teacher report needs, read from saved toolData only.
  function reportData(state) {
    state = state || {};
    var experiments = Array.isArray(state.experiments) ? state.experiments : [];
    var stats = state.predictionStats || { made: 0, matched: 0 };
    var tally = state.misconceptionTally || {};
    var progress = state.missions || {};
    var cer = state.cer && typeof state.cer === 'object' ? state.cer : {};
    return {
      runs: experiments.slice().sort(function(a, b) { return finite(a.n, 0) - finite(b.n, 0); }).map(function(entry, index) {
        return {
          n: entry.n || index + 1,
          mode: modeName(entry.mode),
          setup: String(entry.setup || ''),
          measured: Number.isFinite(entry.measured) ? Number(entry.measured.toPrecision(6)) : null,
          estimate: Number.isFinite(entry.estimate) ? entry.estimate : null,
          errorPct: Number.isFinite(entry.errorPct) ? Number(entry.errorPct.toPrecision(4)) : null,
          outcome: logEntryOutcome(entry),
          investigation: entry.inv ? (investigationText(entry.inv) || {}).title || entry.inv : ''
        };
      }),
      predictions: { made: finite(stats.made, 0), matched: finite(stats.matched, 0) },
      ideas: MISCONCEPTION_IDS.filter(function(id) { return finite(tally[id], 0) > 0; }).map(function(id) {
        return { label: misconceptionLabel(id), count: finite(tally[id], 0) };
      }),
      missions: MISSIONS.map(function(mission) {
        var record = progress[mission.id] || {};
        return {
          title: missionText(mission.id).title,
          done: !!record.done,
          tries: finite(record.tries, 0),
          last: record.last ? missionValueText(mission.id, record.last) : ''
        };
      }),
      cer: INVESTIGATIONS.filter(function(investigation) {
        var item = cer[investigation.id];
        return item && (item.claim || item.evidence || item.reasoning);
      }).map(function(investigation) {
        var item = cer[investigation.id];
        return {
          title: investigationText(investigation.id).title,
          claim: String(item.claim || ''),
          evidence: String(item.evidence || ''),
          reasoning: String(item.reasoning || ''),
          checks: (item.checks || []).filter(Boolean).length
        };
      }),
      hypothesis: String(state.hypothesis || '')
    };
  }

  // Several CSV blocks, one per section, separated by a blank line.
  function buildReportCsv(state) {
    var data = reportData(state);
    var blocks = [];
    blocks.push(buildCsv(
      [{ label: __alloT('stem.skatelab.report_section_runs', 'Runs') }, { label: 'mode' }, { label: 'setup' }, { label: 'measured_ft' },
        { label: 'estimate_ft' }, { label: 'estimate_error_pct' }, { label: 'outcome' }, { label: 'investigation' }],
      data.runs.map(function(run) { return [run.n, run.mode, run.setup, run.measured, run.estimate, run.errorPct, run.outcome, run.investigation]; })));
    blocks.push(buildCsv(
      [{ label: __alloT('stem.skatelab.report_section_predictions', 'Predictions') }, { label: 'made' }, { label: 'matched_model' }],
      [['', data.predictions.made, data.predictions.matched]]));
    blocks.push(buildCsv(
      [{ label: __alloT('stem.skatelab.report_section_ideas', 'Ideas to rethink') }, { label: 'count' }],
      data.ideas.map(function(idea) { return [idea.label, idea.count]; })));
    blocks.push(buildCsv(
      [{ label: __alloT('stem.skatelab.report_section_missions', 'Missions') }, { label: 'complete' }, { label: 'runs_tried' }, { label: 'last_result' }],
      data.missions.map(function(mission) { return [mission.title, mission.done ? 1 : 0, mission.tries, mission.last]; })));
    blocks.push(buildCsv(
      [{ label: __alloT('stem.skatelab.report_section_cer', 'Claim, evidence, reasoning') }, { label: 'claim' }, { label: 'evidence' }, { label: 'reasoning' }, { label: 'rubric_lines_ticked' }],
      data.cer.map(function(item) { return [item.title, item.claim, item.evidence, item.reasoning, item.checks]; })));
    return blocks.join('\r\n\r\n');
  }

  // A self-contained printable page (opened with window.open, then printed
  // from that window, because window.print() on the app is ignored in Canvas).
  function buildReportHtml(state, meta) {
    meta = meta || {};
    var data = reportData(state);
    var e = htmlEscape;
    function table(caption, headers, rows) {
      if (!rows.length) return '<p>' + e(fillTemplate(__alloT('stem.skatelab.report_none', 'No {what} yet.'), { what: caption.toLowerCase() })) + '</p>';
      return '<table><caption>' + e(caption) + '</caption><thead><tr>' + headers.map(function(head) { return '<th scope="col">' + e(head) + '</th>'; }).join('') +
        '</tr></thead><tbody>' + rows.map(function(row) {
          return '<tr>' + row.map(function(cell) { return '<td>' + e(cell == null ? '—' : cell) + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table>';
    }
    var title = __alloT('stem.skatelab.report_title', 'Skate Lab report');
    var learner = meta.learner ? fillTemplate(__alloT('stem.skatelab.report_learner', 'Learner: {name}'), { name: meta.learner }) : '';
    var dateText = meta.date ? fillTemplate(__alloT('stem.skatelab.report_date', 'Date: {date}'), { date: meta.date }) : '';
    var parts = [
      '<!doctype html><html lang="' + e(meta.lang || 'en') + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + e(title) + '</title>',
      '<style>body{font:14px/1.45 system-ui,sans-serif;color:#111;background:#fff;margin:24px;max-width:960px}h1{font-size:1.5rem;margin:0 0 4px}h2{font-size:1.1rem;margin:22px 0 6px;border-bottom:2px solid #333}table{border-collapse:collapse;width:100%;margin:6px 0}caption{text-align:left;font-weight:700;padding:4px 0}th,td{border:1px solid #777;padding:4px 6px;text-align:left;vertical-align:top}th{background:#eee}.meta{color:#333;margin:0}.print{margin:12px 0;padding:8px 14px;font:inherit;font-weight:700;border:2px solid #111;border-radius:6px;background:#fff;color:#111;cursor:pointer}blockquote{margin:4px 0 10px;padding:6px 10px;border-left:4px solid #555;background:#f6f6f6}@media print{.print{display:none}body{margin:0}}</style></head><body>',
      '<h1>' + e(title) + '</h1>',
      learner ? '<p class="meta">' + e(learner) + '</p>' : '',
      dateText ? '<p class="meta">' + e(dateText) + '</p>' : '',
      '<button type="button" class="print" onclick="window.print()">' + e(__alloT('stem.skatelab.report_print', 'Print this report')) + '</button>',
      '<h2>' + e(__alloT('stem.skatelab.report_section_runs', 'Runs')) + '</h2>',
      table(__alloT('stem.skatelab.report_section_runs', 'Runs'), ['#', __alloT('stem.skatelab.sort_mode', 'Mode'), __alloT('stem.skatelab.log_col_setup', 'Setup'),
        __alloT('stem.skatelab.report_col_measured', 'Measured (ft)'), __alloT('stem.skatelab.report_col_estimate', 'Estimate (ft)'),
        __alloT('stem.skatelab.sort_error', 'Estimate error') + ' (%)', __alloT('stem.skatelab.sort_outcome', 'Outcome'), __alloT('stem.skatelab.report_col_investigation', 'Investigation')],
        data.runs.map(function(run) { return [run.n, run.mode, run.setup, run.measured, run.estimate, run.errorPct, run.outcome, run.investigation]; })),
      '<h2>' + e(__alloT('stem.skatelab.report_section_predictions', 'Predictions')) + '</h2>',
      '<p>' + e(fillTemplate(__alloT('stem.skatelab.prediction_record', 'Predictions checked: {made}. Matched the model: {matched}.'), data.predictions)) + '</p>',
      table(__alloT('stem.skatelab.report_section_ideas', 'Ideas to rethink'), [__alloT('stem.skatelab.report_col_idea', 'Idea'), __alloT('stem.skatelab.report_col_count', 'Times')],
        data.ideas.map(function(idea) { return [idea.label, idea.count]; })),
      '<h2>' + e(__alloT('stem.skatelab.report_section_missions', 'Missions')) + '</h2>',
      table(__alloT('stem.skatelab.report_section_missions', 'Missions'), [__alloT('stem.skatelab.report_col_mission', 'Mission'), __alloT('stem.skatelab.report_col_status', 'Status'),
        __alloT('stem.skatelab.report_col_tries', 'Runs tried'), __alloT('stem.skatelab.report_col_last', 'Last result')],
        data.missions.map(function(mission) {
          return [mission.title, mission.done ? __alloT('stem.skatelab.report_done', 'Complete') : __alloT('stem.skatelab.report_open', 'Not yet'), mission.tries, mission.last];
        })),
      '<h2>' + e(__alloT('stem.skatelab.report_section_cer', 'Claim, evidence, reasoning')) + '</h2>',
      data.cer.length ? data.cer.map(function(item) {
        return '<h3>' + e(item.title) + '</h3>' +
          '<p><strong>' + e(__alloT('stem.skatelab.cer_claim', 'Claim')) + ':</strong></p><blockquote>' + e(item.claim || '—') + '</blockquote>' +
          '<p><strong>' + e(__alloT('stem.skatelab.cer_evidence', 'Evidence')) + ':</strong></p><blockquote>' + e(item.evidence || '—') + '</blockquote>' +
          '<p><strong>' + e(__alloT('stem.skatelab.cer_reasoning', 'Reasoning')) + ':</strong></p><blockquote>' + e(item.reasoning || '—') + '</blockquote>' +
          '<p>' + e(fillTemplate(__alloT('stem.skatelab.report_rubric', 'Rubric lines ticked: {n} of 5.'), { n: item.checks })) + '</p>';
      }).join('') : '<p>' + e(__alloT('stem.skatelab.report_no_cer', 'No claim, evidence and reasoning written yet.')) + '</p>',
      data.hypothesis ? '<h2>' + e(__alloT('stem.skatelab.report_hypothesis', 'Hypothesis')) + '</h2><blockquote>' + e(data.hypothesis) + '</blockquote>' : '',
      '</body></html>'
    ];
    return parts.join('');
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
    dropHeightM: 2.4,
    pumpTimingId: 'bottom',
    landingCompressionM: LANDING_COMPRESSION_M,
    bodyPositionId: 'neutral',
    airDrag: true,
    pumps: 3,
    rotationTarget: 180,
    spinRate: 210,
    speedMph: 17,
    angleDeg: 35,
    gapFt: 15,
    pushForceN: 200,
    cameraAzimuth: 38,
    playbackSpeed: 1,
    showVectors: true,
    showTrail: true,
    showEnergy: true,
    // Predict first is on by default (P3-1); one switch turns it off.
    estimateChallenge: true,
    estimateValue: '',
    // The setup signature the estimate was typed for: a new setup needs a new one.
    estimateSignature: '',
    hypothesis: '',
    prediction: null,
    predictionResult: null,
    predictionStats: { made: 0, matched: 0 },
    misconceptionTally: {},
    logView: { x: '', y: '', group: 'none', sort: 'id', dir: 'desc' },
    activeInvestigation: null,
    cer: {},
    // Stage C: mission progress { id: { done, tries, last } }, the hang-time
    // guess { value, signature }, Moon setups already revealed (hashes), the
    // explanation level, sound and narration switches, step mode, and the
    // teacher settings { locks, assign, hideAnswers }.
    missions: {},
    activeMission: null,
    missionGuess: null,
    moonSeen: [],
    scaffoldLevel: 'auto',
    narrate: false,
    sonify: false,
    stepMode: false,
    teacher: null,
    // Run records hold inputs and a summary only; paths are recomputed.
    lastResult: null,
    lastSim: null,
    previousSim: null,
    experiments: [],
    stats: { runs: 0, successful: 0, withinTen: 0 },
    // Quest evidence: only views and surfaces used in completed runs count.
    runViews: {},
    runSurfaces: {},
    estimateCredits: [],
    xpCredits: []
  };

  function rounded(value, digits) {
    return finite(value, 0).toFixed(digits == null ? 1 : digits);
  }

  // Accepts a live simulation, a slim run record, or a legacy saved object.
  function asSimulation(candidate) {
    return hydrateSim(candidate);
  }

  function isComparableSimulation(candidate) {
    var model = asSimulation(candidate);
    return !!model && Number.isFinite(model.motionDuration) && model.motionDuration > 0;
  }

  function simulationSignature(candidate) {
    var model = asSimulation(candidate);
    if (!model) return '';
    if (model.mode === 'halfpipe') {
      return [
        model.mode,
        rounded(model.pumps, 4),
        model.pumpTiming && model.pumpTiming.id,
        rounded(model.dropHeightM, 4),
        rounded(model.gravity, 4),
        rounded(model.riderMassKg, 4),
        rounded(model.rampDepthM, 4),
        rounded(model.rotationTarget, 4),
        rounded(model.spinRate, 4),
        model.vehicle && model.vehicle.id,
        model.surface && model.surface.id,
        model.bodyPosition && model.bodyPosition.id
      ].join('|');
    }
    if (model.mode === 'flat') {
      return [
        model.mode,
        rounded(model.pushForceN, 4),
        rounded(model.gravity, 4),
        rounded(model.riderMassKg, 4),
        model.vehicle && model.vehicle.id,
        model.surface && model.surface.id
      ].join('|');
    }
    return [
      model.mode,
      rounded(model.speedMph, 4),
      rounded(model.angleDeg, 4),
      rounded(model.gapFt, 4),
      rounded(model.gravity, 4),
      rounded(model.riderMassKg, 4),
      rounded(model.landingCompressionM, 4),
      model.airDrag ? 'drag' : 'ideal',
      model.vehicle && model.vehicle.id,
      model.wind && model.wind.id
    ].join('|');
  }

  // Short stable id for a setup, used to credit XP once per distinct setup.
  function signatureHash(text) {
    var hash = 2166136261;
    text = String(text || '');
    for (var index = 0; index < text.length; index++) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul ? Math.imul(hash, 16777619) : (hash * 16777619) | 0;
    }
    return (hash >>> 0).toString(16);
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
    current = asSimulation(current);
    previous = asSimulation(previous);
    if (!isComparableSimulation(current) || !isComparableSimulation(previous) ||
        current.mode !== previous.mode) return [];

    function objectText(key, value) {
      if (!value) return __alloT('stem.skatelab.change_unknown', 'unknown');
      if (key === 'vehicle') return vehicleName(value.id);
      if (key === 'surface') return surfaceLabel(value.id);
      if (key === 'bodyPosition') return bodyPositionLabel(value.id);
      if (key === 'wind') return windName(value.id);
      return String(value.label || value.id || value);
    }
    var gravityLabel = __alloT('stem.skatelab.change_gravity', 'Gravity');
    var massLabel = __alloT('stem.skatelab.change_mass', 'Rider mass');
    var rideLabel = __alloT('stem.skatelab.change_ride', 'Ride');
    var surfaceText = __alloT('stem.skatelab.change_surface', 'Surface');

    var definitions = current.mode === 'halfpipe' ? [
      { key: 'pumps', label: __alloT('stem.skatelab.change_pumps', 'Pumps'), digits: 0, unit: '', value: function(model) { return model.pumps; } },
      { key: 'pumpTiming', label: __alloT('stem.skatelab.change_pump_timing', 'Pump timing'), value: function(model) { return pumpTimingLabel(model.pumpTiming && model.pumpTiming.id); } },
      { key: 'dropHeightM', label: __alloT('stem.skatelab.change_drop_height', 'Drop-in height'), digits: 1, unit: ' m', value: function(model) { return model.dropHeightM; } },
      { key: 'gravity', label: gravityLabel, digits: 2, unit: ' m/s²', value: function(model) { return model.gravity; } },
      { key: 'riderMassKg', label: massLabel, digits: 0, unit: ' kg', value: function(model) { return model.riderMassKg; } },
      { key: 'rampDepthM', label: __alloT('stem.skatelab.change_ramp_depth', 'Ramp depth'), digits: 1, unit: ' m', value: function(model) { return model.rampDepthM; } },
      { key: 'rotationTarget', label: __alloT('stem.skatelab.change_rotation_target', 'Rotation target'), digits: 0, unit: '°', value: function(model) { return model.rotationTarget; } },
      { key: 'spinRate', label: __alloT('stem.skatelab.change_spin_rate', 'Spin rate'), digits: 0, unit: '°/s', value: function(model) { return model.spinRate; } },
      { key: 'vehicle', label: rideLabel, value: function(model) { return objectText('vehicle', model.vehicle); } },
      { key: 'surface', label: surfaceText, value: function(model) { return objectText('surface', model.surface); } },
      { key: 'bodyPosition', label: __alloT('stem.skatelab.change_body_position', 'Body position'), value: function(model) { return objectText('bodyPosition', model.bodyPosition); } }
    ] : (current.mode === 'flat' ? [
      { key: 'pushForceN', label: __alloT('stem.skatelab.change_push_force', 'Push force'), digits: 0, unit: ' N', value: function(model) { return model.pushForceN; } },
      { key: 'gravity', label: gravityLabel, digits: 2, unit: ' m/s²', value: function(model) { return model.gravity; } },
      { key: 'riderMassKg', label: massLabel, digits: 0, unit: ' kg', value: function(model) { return model.riderMassKg; } },
      { key: 'vehicle', label: rideLabel, value: function(model) { return objectText('vehicle', model.vehicle); } },
      { key: 'surface', label: surfaceText, value: function(model) { return objectText('surface', model.surface); } }
    ] : [
      { key: 'speedMph', label: __alloT('stem.skatelab.change_speed', 'Takeoff speed'), digits: 0, unit: ' mph', value: function(model) { return model.speedMph; } },
      { key: 'angleDeg', label: __alloT('stem.skatelab.change_angle', 'Ramp angle'), digits: 0, unit: '°', value: function(model) { return model.angleDeg; } },
      { key: 'gapFt', label: __alloT('stem.skatelab.change_gap', 'Gap distance'), digits: 0, unit: ' ft', value: function(model) { return model.gapFt; } },
      { key: 'gravity', label: gravityLabel, digits: 2, unit: ' m/s²', value: function(model) { return model.gravity; } },
      { key: 'riderMassKg', label: massLabel, digits: 0, unit: ' kg', value: function(model) { return model.riderMassKg; } },
      { key: 'landingCompressionM', label: __alloT('stem.skatelab.change_absorption', 'Landing absorption'), digits: 2, unit: ' m', value: function(model) { return model.landingCompressionM; } },
      { key: 'airDrag', label: __alloT('stem.skatelab.change_air_drag', 'Air drag'), value: function(model) {
        return model.airDrag ? __alloT('stem.skatelab.value_on', 'on') : __alloT('stem.skatelab.value_off', 'off');
      } },
      { key: 'vehicle', label: rideLabel, value: function(model) { return objectText('vehicle', model.vehicle); } },
      { key: 'wind', label: __alloT('stem.skatelab.change_wind', 'Wind'), value: function(model) { return objectText('wind', model.wind); } }
    ]);

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
    current = asSimulation(current);
    previous = asSimulation(previous);
    var changes = simulationInputChanges(current, previous);
    if (!changes.length) return '';
    var first = changes[0];
    var introduction;
    var values = {
      label: first.label,
      from: first.previousText,
      to: first.currentText
    };
    if (changes.length === 1) {
      if (first.numeric) {
        introduction = fillTemplate(first.currentValue > first.previousValue
          ? (isMeasured
            ? __alloT('stem.skatelab.change_one_up_result', 'One-variable result: {label} increased from {from} to {to}. ')
            : __alloT('stem.skatelab.change_one_up_prediction', 'One-variable prediction: {label} increased from {from} to {to}. '))
          : (isMeasured
            ? __alloT('stem.skatelab.change_one_down_result', 'One-variable result: {label} decreased from {from} to {to}. ')
            : __alloT('stem.skatelab.change_one_down_prediction', 'One-variable prediction: {label} decreased from {from} to {to}. ')), values);
      } else {
        introduction = fillTemplate(isMeasured
          ? __alloT('stem.skatelab.change_one_result', 'One-variable result: {label} changed from {from} to {to}. ')
          : __alloT('stem.skatelab.change_one_prediction', 'One-variable prediction: {label} changed from {from} to {to}. '), values);
      }
    } else {
      var labels = changes.slice(0, 3).map(function(change) { return change.label.toLowerCase(); });
      introduction = fillTemplate(isMeasured
        ? __alloT('stem.skatelab.change_many_result', 'Combined-input result: multiple inputs changed ({labels}{more}), so treat these as combined effects rather than a one-variable cause. ')
        : __alloT('stem.skatelab.change_many_prediction', 'Combined-input prediction: multiple inputs changed ({labels}{more}), so treat these as combined effects rather than a one-variable cause. '), {
        labels: labels.join(', '),
        more: changes.length > 3
          ? fillTemplate(__alloT('stem.skatelab.change_plus_more', ', plus {n} more'), { n: changes.length - 3 })
          : ''
      });
    }

    if (current.mode === 'halfpipe') {
      var rotationDelta = signedDelta(current.completed - previous.completed, 0, '°');
      var contactDelta = signedDelta(current.contactAlignmentErrorDeg - previous.contactAlignmentErrorDeg, 1, '°');
      if (changes.length === 1 && first.key === 'rotationTarget') {
        return introduction + fillTemplate(__alloT('stem.skatelab.change_target_only', 'The requested goal changes the success criterion, not the takeoff motion; modeled rotation changed {rotation} and contact-angle error changed {contact}.'), {
          rotation: rotationDelta, contact: contactDelta });
      }
      if (changes.length === 1 &&
          (first.key === 'bodyPosition' || first.key === 'spinRate')) {
        return introduction + fillTemplate(__alloT('stem.skatelab.change_spin', 'Modeled rotation changed {rotation}; air height changed {air}; contact-angle error changed {contact}.'), {
          rotation: rotationDelta, air: signedDelta(current.hFt - previous.hFt, 1, ' ft'), contact: contactDelta });
      }
      return introduction + fillTemplate(__alloT('stem.skatelab.change_halfpipe', 'Air height changed {air}; peak transition load changed {load}; modeled rotation changed {rotation}.'), {
        air: signedDelta(current.hFt - previous.hFt, 1, ' ft'),
        load: signedDelta(current.peakNormalG - previous.peakNormalG, 1, ' g'),
        rotation: rotationDelta
      }) +
        fillTemplate(__alloT('stem.skatelab.change_work_heat', ' Work by the rider changed {work}; heat from friction changed {heat}.'), {
          work: signedDelta(current.riderWorkJ - previous.riderWorkJ, 0, ' J'),
          heat: signedDelta(current.thermalJ - previous.thermalJ, 0, ' J')
        });
    }
    if (current.mode === 'flat') {
      return introduction + fillTemplate(__alloT('stem.skatelab.change_flat',
        'Top speed changed {speed}; stopping distance changed {distance}; friction force changed {friction}.'), {
        speed: signedDelta(current.topSpeedMph - previous.topSpeedMph, 1, ' mph'),
        distance: signedDelta(current.stopDistanceM - previous.stopDistanceM, 1, ' m'),
        friction: signedDelta(current.frictionN - previous.frictionN, 1, ' N')
      });
    }

    if (changes.length === 1 && first.key === 'landingCompressionM') {
      if (!current.hasLandingContact || !previous.hasLandingContact) {
        return introduction + __alloT('stem.skatelab.change_absorption_missed', 'At least one setup missed supported deck contact, so a landing-load comparison is not available.');
      }
      return introduction + fillTemplate(__alloT('stem.skatelab.change_absorption_load', 'Peak supported load changed {load}; contact-pulse duration changed {time}.'), {
        load: signedDelta(getLandingPeakG(current) - getLandingPeakG(previous), 1, ' g'),
        time: signedDelta(current.landingStopTimeS - previous.landingStopTimeS, 2, ' s')
      });
    }
    if (changes.length === 1 && first.key === 'gapFt') {
      return introduction + fillTemplate(__alloT('stem.skatelab.change_gap_width', 'The modeled trajectory range changed {range}, while platform clearance changed {clearance}. Outcome: {outcome}.'), {
        range: signedDelta(current.rangeFt - previous.rangeFt, 1, ' ft'),
        clearance: signedDelta((current.clearance - previous.clearance) * M2FT, 1, ' ft'),
        outcome: current.outcome ? outcomeName(current.outcome) : __alloT('stem.skatelab.change_unresolved', 'unresolved')
      });
    }
    if (changes.length === 1 && first.key === 'wind') {
      return introduction + fillTemplate(__alloT('stem.skatelab.change_wind_effect', 'Range changed {range}; lateral drift changed {drift}.'), {
        range: signedDelta(current.rangeFt - previous.rangeFt, 1, ' ft'),
        drift: signedDelta(Math.abs(current.crossDriftFt) - Math.abs(previous.crossDriftFt), 1, ' ft')
      });
    }
    var gapSummary = introduction + fillTemplate(__alloT('stem.skatelab.change_gap_summary', 'Range changed {range}; apex height changed {apex}.'), {
      range: signedDelta(current.rangeFt - previous.rangeFt, 1, ' ft'),
      apex: signedDelta(current.peakFt - previous.peakFt, 1, ' ft')
    });
    if (current.hasLandingContact && previous.hasLandingContact) {
      gapSummary += fillTemplate(__alloT('stem.skatelab.change_gap_load', ' Peak supported load changed {load}.'), {
        load: signedDelta(getLandingPeakG(current) - getLandingPeakG(previous), 1, ' g')
      });
    } else {
      gapSummary += __alloT('stem.skatelab.change_gap_no_load', ' A supported landing-load comparison is unavailable because at least one setup missed the deck.');
    }
    return gapSummary;
  }

  function phaseLearningText(sim, sample) {
    if (!sim || !sample) return '';
    var phase = String(sample.phase || '');
    if (sim.mode === 'flat') {
      if (phase === 'pushing off') {
        return fillTemplate(__alloT('stem.skatelab.learn_flat_push',
          'Newton’s third law: your foot pushes the ground backward with {push} N, so the ground pushes you forward with {push} N. Net force {net} N gives a = F/m = {accel} m/s².'), {
          push: Math.round(sample.pushForceN),
          net: rounded(sample.netForceN, 1),
          accel: rounded(sample.accelerationMps2, 2)
        });
      }
      if (phase === 'coasting') {
        return fillTemplate(__alloT('stem.skatelab.learn_flat_coast',
          'Newton’s first law: with no push, only friction ({friction} N) acts along the ground, so you slow at a constant rate. Kinetic energy lost so far {lost} J equals μ·m·g·d = {heat} J.'), {
          friction: rounded(sample.frictionForceN, 1),
          lost: Math.round(sample.coastKineticLostJ),
          heat: Math.round(sample.coastFrictionWorkSoFarJ)
        });
      }
      if (phase === 'not moving') {
        return fillTemplate(__alloT('stem.skatelab.learn_flat_no_motion',
          'The push ({push} N) is not larger than rolling friction ({friction} N), so the forces balance and the rider stays still.'), {
          push: Math.round(sim.pushForceN),
          friction: rounded(sim.frictionN, 1)
        });
      }
      return fillTemplate(__alloT('stem.skatelab.learn_flat_stopped',
        'Stopped after {distance} m. Every joule of push work ({work} J) became heat from rolling friction: μ·m·g·d = {heat} J.'), {
        distance: rounded(sim.stopDistanceM, 2),
        work: Math.round(sim.riderWorkJ),
        heat: Math.round(sim.thermalJ)
      });
    }
    if (sim.mode === 'halfpipe') {
      if (phase === 'rolling back down') {
        return __alloT('stem.skatelab.learn_rolling_back',
          'Gravity pulls the rider back down the wall. Rolling friction (μN) keeps turning a little motion energy into heat on every pass.');
      }
      if (phase === 'rocked to a stop') {
        return fillTemplate(__alloT('stem.skatelab.learn_rocked_stop',
          'Each pass ended a little lower until the rider stopped. All {start} J of starting height energy (plus {work} J of rider work) became heat.'), {
          start: Math.round(sim.startPotentialJ),
          work: Math.round(sim.riderWorkJ)
        });
      }
      if (phase === 'model time limit reached') {
        return __alloT('stem.skatelab.learn_time_limit',
          'The model stopped at its time limit while the rider was still rolling.');
      }
      if (phase === 'dropping in') {
        return __alloT('stem.skatelab.learn_dropping_in', 'Gravity converts height into speed; surface loss reduces the mechanical energy that reaches the bottom.');
      }
      if (phase === 'compressing at the bottom' || phase === 'compressing on the return') {
        return __alloT('stem.skatelab.learn_compressing', 'Speed and tight curvature combine here, so the surface-normal load reaches a local maximum.');
      }
      if (phase === 'driving up the wall' || phase === 'driving down the return wall') {
        return __alloT('stem.skatelab.learn_climbing', 'Kinetic energy is converting back into gravitational potential energy as the rider climbs.');
      }
      if (phase === 'rising' || phase === 'at the apex' || phase === 'falling' ||
          phase === 'approaching contact') {
        return phase === 'at the apex'
          ? __alloT('stem.skatelab.learn_halfpipe_apex', 'Vertical velocity is momentarily near zero, but gravity still accelerates the rider downward.')
          : __alloT('stem.skatelab.learn_halfpipe_flight', 'The rider is in free flight: support load is zero, while body position changes angular speed.');
      }
      if (phase === 'unsafe contact — simulation stopped') {
        return __alloT('stem.skatelab.learn_unsafe', 'Terrain contact occurred without safe tangent alignment, so no support impulse or return path is invented.');
      }
      if (phase === 're-entering the wall') {
        return __alloT('stem.skatelab.learn_reentry', 'Safe tangent alignment lets the wall begin redirecting the rider into the transition.');
      }
      return __alloT('stem.skatelab.learn_redirecting', 'The surface is redirecting the rider toward the bottom while normal load rises with speed and curvature.');
    }

    if (phase === 'approaching the ramp') {
      return __alloT('stem.skatelab.learn_approach', 'Takeoff speed and ramp angle set the horizontal and vertical launch-velocity components.');
    }
    var aerodynamicEvidence = sim.airDrag
      ? fillTemplate(__alloT('stem.skatelab.learn_aero', ' Net aerodynamic change so far is {net}: moving-air work {wind} minus {loss} J transferred to the wake and turbulence.'), {
        net: signedDelta(sample.aerodynamicNetWorkJ, 0, ' J'),
        wind: signedDelta(sample.windWorkJ, 0, ' J'),
        loss: Math.round(sample.aerodynamicDissipationJ)
      })
      : __alloT('stem.skatelab.learn_aero_ideal', ' In the ideal-air model, moving-air work and aerodynamic dissipation are both zero.');
    if (phase === 'rising') {
      return __alloT('stem.skatelab.learn_gap_rising', 'Gravity reduces vertical speed; aerodynamic force changes horizontal, vertical, and lateral motion.') +
        aerodynamicEvidence;
    }
    if (phase === 'at the apex') {
      return __alloT('stem.skatelab.learn_gap_apex', 'Vertical velocity is near zero at the apex, while horizontal and lateral motion continue.') +
        aerodynamicEvidence;
    }
    if (phase === 'falling') {
      return __alloT('stem.skatelab.learn_gap_falling', 'Gravity increases downward speed; the terrain event, not deck height alone, determines contact.') +
        aerodynamicEvidence;
    }
    if (phase === 'platform contact') {
      return fillTemplate(__alloT('stem.skatelab.learn_platform_contact', 'The board is supported at deck height while the rider’s center of mass still moves downward at {speed} m/s; the surface begins redirecting that vertical momentum. Flight ended with a net aerodynamic change of {net}.'), {
        speed: rounded(Math.abs(sample.comVerticalVelocityMps), 2),
        net: signedDelta(sample.aerodynamicNetWorkJ, 0, ' J')
      });
    }
    if (phase === 'absorbing the landing') {
      return fillTemplate(__alloT('stem.skatelab.learn_absorbing', 'The board stays on the deck while the rider’s center of mass has moved {moved} of {total} m downward; {speed} m/s remains under a {load} g support load.'), {
        moved: rounded(sample.comCompressionM, 2),
        total: rounded(sim.landingCompressionM, 2),
        speed: rounded(Math.abs(sample.comVerticalVelocityMps), 2),
        load: rounded(sample.normalG, 1)
      });
    }
    if (phase === 'contact pulse complete') {
      return fillTemplate(__alloT('stem.skatelab.learn_pulse_complete', 'The board remains supported and modeled COM compression has reached {moved} m; vertical speed is zero. Rebound, braking, and rolling resistance are outside this model.'), {
        moved: rounded(sample.comCompressionM, 2)
      });
    }
    if (phase === 'hit the platform face') {
      return __alloT('stem.skatelab.learn_platform_face', 'The platform face is terrain contact without deck support; its impact response is not modeled.');
    }
    if (phase === 'model limit reached') {
      return __alloT('stem.skatelab.learn_model_limit', 'The safety horizon ended before terrain contact could be resolved, so no landing claim is made.');
    }
    return __alloT('stem.skatelab.learn_missed', 'The trajectory missed supported terrain, so the model reports no landing load.');
  }

  function resultText(sim) {
    if (sim.mode === 'flat') {
      if (!sim.moves) {
        return fillTemplate(__alloT('stem.skatelab.result_flat_no_motion',
          'No motion: a {push} N push does not beat {friction} N of rolling friction, so the net force is zero.'), {
          push: Math.round(sim.pushForceN),
          friction: rounded(sim.frictionN, 1)
        });
      }
      return fillTemplate(__alloT('stem.skatelab.result_flat',
        'Stopped after {distance} m ({feet} ft): the push reached {speed} mph, then friction of {friction} N slowed the rider for {time} s. Heat μ·m·g·d = {heat} J matches the push work {work} J.'), {
        distance: rounded(sim.stopDistanceM, 2),
        feet: rounded(sim.stopDistanceFt, 1),
        speed: rounded(sim.topSpeedMph, 1),
        friction: rounded(sim.frictionN, 1),
        time: rounded(sim.coastTimeS, 1),
        heat: Math.round(sim.thermalJ),
        work: Math.round(sim.riderWorkJ)
      });
    }
    if (sim.mode === 'halfpipe') {
      if (!sim.hasAir) {
        return fillTemplate(__alloT('stem.skatelab.result_no_air',
          'No air: the rider never reached the lip. After {passes} passes the rider {ending}, and {heat} J of the {input} J supplied became heat from rolling friction.'), {
          passes: (sim.turns || []).length,
          ending: sim.endReason === 'time-limit'
            ? __alloT('stem.skatelab.result_still_rolling', 'was still rolling at the model time limit')
            : __alloT('stem.skatelab.result_rocked_stop', 'rocked to a stop'),
          heat: Math.round(sim.thermalJ),
          input: Math.round(sim.energyInputJ)
        });
      }
      if (sim.runSuccessful) {
        return fillTemplate(__alloT('stem.skatelab.result_landed',
          'Target met — safe re-entry: {height} ft above the lip, {time} s airborne, and {spin}° of spin with a {body} body position; the rider {stance}. The re-entry carries the rider back to the bottom under a {load} g peak transition load.'), {
          height: rounded(sim.hFt, 1),
          time: rounded(sim.airTime, 2),
          spin: Math.round(sim.completed),
          body: bodyPositionLabel(sim.bodyPosition.id).toLowerCase(),
          stance: landingStanceLabel(sim.landingStance),
          load: rounded(finite(sim.reentryPeakNormalG, sim.peakNormalG), 1)
        });
      }
      if (sim.contactSafe) {
        return fillTemplate(__alloT('stem.skatelab.result_target_missed',
          'Safe re-entry, target missed: the board lands {error}° from a half-turn and the rider {stance}, but the model reached {spin}° against a {target}° target. The rider returns through the transition.'), {
          error: rounded(sim.contactAlignmentErrorDeg, 0),
          stance: landingStanceLabel(sim.landingStance),
          spin: Math.round(sim.completed),
          target: Math.round(sim.rotationTarget)
        });
      }
      return fillTemplate(__alloT('stem.skatelab.result_unsafe',
        'Unsafe contact angle: after {spin}° of spin the board meets the wall {error}° away from a half-turn (sideways). The simulation stops at first contact instead of inventing a return.'), {
        spin: Math.round(sim.completed),
        error: rounded(sim.contactAlignmentErrorDeg, 0)
      });
    }
    if (sim.solverLimited) {
      return __alloT('stem.skatelab.result_solver_limit', 'Model limit reached before terrain contact could be resolved. Try a less extreme launch setup.');
    }
    if (!sim.hasLandingContact) {
      if (sim.outcome === 'platform-face') {
        return __alloT('stem.skatelab.result_platform_face', 'Platform-face impact below deck height. This event has terrain contact without deck support; impact response is not modeled, so no contact load is reported.');
      }
      if (sim.outcome === 'fell-short') {
        return fillTemplate(__alloT('stem.skatelab.result_fell_short', 'Fell short of the platform by {short} ft. The path continues below deck height, so no supported landing load is reported.'), {
          short: rounded(Math.abs(sim.clearance) * M2FT, 1)
        });
      }
      return __alloT('stem.skatelab.result_missed_platform', 'Missed the supported platform. The path continues below deck height outside the platform footprint, so no supported landing load is reported.');
    }
    var loadValues = {
      avg: rounded(sim.landingImpactG, 1),
      peak: rounded(getLandingPeakG(sim), 1),
      time: rounded(sim.landingStopTimeS, 2)
    };
    var landingLoadText = fillTemplate(__alloT('stem.skatelab.result_landing_load', ' Estimated landing load: {avg} g average and {peak} g peak over {time} s.'), loadValues);
    if (sim.runSuccessful) {
      return fillTemplate(__alloT('stem.skatelab.result_gap_landed', 'Landing zone reached: {range} ft traveled, {into} ft into the platform, {drift} ft of lateral drift, and an estimated landing load of {avg} g average and {peak} g peak over {time} s.'), {
        range: rounded(sim.rangeFt, 1),
        into: rounded(sim.clearance * M2FT, 1),
        drift: rounded(Math.abs(sim.crossDriftFt), 1),
        avg: loadValues.avg,
        peak: loadValues.peak,
        time: loadValues.time
      });
    }
    if (!sim.withinLane) {
      return fillTemplate(__alloT('stem.skatelab.result_off_lane', 'Deck contact outside the landing lane: crosswind moved the rider {drift} ft laterally.'), {
        drift: rounded(Math.abs(sim.crossDriftFt), 1)
      }) + landingLoadText;
    }
    return fillTemplate(__alloT('stem.skatelab.result_overshot', 'Deck contact past the landing zone by {over} ft. Reduce range or widen your safety margin.'), {
      over: ((sim.clearance - sim.landingZoneM) * M2FT).toFixed(1)
    }) + landingLoadText;
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
        // Labels are getters so the host reads them translated once ctx.t is known.
        get label() { return __alloT('stem.skatelab.quest_run_model', 'Run your first physics model'); },
        icon: '▶',
        check: function(data) { return ((data.stats && data.stats.runs) || 0) >= 1; },
        progress: function(data) { return fillTemplate(__alloT('stem.skatelab.quest_runs', '{n}/1 runs'), { n: (data.stats && data.stats.runs) || 0 }); }
      },
      {
        id: 'sk_compare_views',
        get label() { return __alloT('stem.skatelab.quest_compare_views', 'Compare the 2D and 3D views'); },
        icon: '◫',
        // Counts only views used for completed runs (runViews), not clicks.
        check: function(data) { return !!(data.runViews && data.runViews['2d'] && data.runViews['3d']); },
        progress: function(data) {
          var used = data.runViews || {};
          return fillTemplate(__alloT('stem.skatelab.quest_views', '{n}/2 views'), { n: (used['2d'] ? 1 : 0) + (used['3d'] ? 1 : 0) });
        }
      },
      {
        id: 'sk_surface_test',
        get label() { return __alloT('stem.skatelab.quest_surfaces_label', 'Compare all three surfaces'); },
        icon: '≈',
        // Counts only surfaces used for completed halfpipe or flat runs.
        check: function(data) { return Object.keys(data.runSurfaces || {}).length >= 3; },
        progress: function(data) { return fillTemplate(__alloT('stem.skatelab.quest_surfaces', '{n}/3 surfaces'), { n: Object.keys(data.runSurfaces || {}).length }); }
      },
      {
        id: 'sk_estimate_within_10',
        get label() { return __alloT('stem.skatelab.quest_estimate_label', 'Estimate within 10%'); },
        icon: '±',
        check: function(data) { return ((data.stats && data.stats.withinTen) || 0) >= 1; },
        progress: function(data) { return fillTemplate(__alloT('stem.skatelab.quest_estimates', '{n}/1 estimates'), { n: (data.stats && data.stats.withinTen) || 0 }); }
      },
      {
        id: 'sk_clear_gap',
        get label() { return __alloT('stem.skatelab.quest_gap_label', 'Model a safe gap landing'); },
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
          }) ? __alloT('stem.skatelab.quest_complete', 'complete') : __alloT('stem.skatelab.quest_pending', 'pending');
        }
      },
      {
        id: 'sk_missions_3',
        get label() { return __alloT('stem.skatelab.quest_missions_label', 'Complete three physics missions'); },
        icon: '★',
        // Missions complete only from a finished model run (see checkMission).
        check: function(data) {
          var done = data.missions || {};
          return Object.keys(done).filter(function(id) { return done[id] && done[id].done; }).length >= 3;
        },
        progress: function(data) {
          var done = data.missions || {};
          return fillTemplate(__alloT('stem.skatelab.quest_missions', '{n}/3 missions'), {
            n: Math.min(3, Object.keys(done).filter(function(id) { return done[id] && done[id].done; }).length)
          });
        }
      },
      {
        id: 'sk_investigation',
        get label() { return __alloT('stem.skatelab.quest_investigation_label', 'Finish a guided investigation with claim, evidence and reasoning'); },
        icon: '✎',
        check: function(data) {
          return (data.xpCredits || []).some(function(id) { return String(id).indexOf('skatelab_inv_') === 0; });
        },
        progress: function(data) {
          return (data.xpCredits || []).some(function(id) { return String(id).indexOf('skatelab_inv_') === 0; })
            ? __alloT('stem.skatelab.quest_complete', 'complete')
            : __alloT('stem.skatelab.quest_pending', 'pending');
        }
      }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var toolData = ctx.toolData || {};
      var setToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      skatelabTranslate = typeof ctx.t === 'function' ? ctx.t : null;

      var seeded = toolData.skatelab || {};
      var d = Object.assign({}, DEFAULTS, seeded);
      d.stats = Object.assign({}, DEFAULTS.stats, seeded.stats || {});
      d.runViews = Object.assign({}, seeded.runViews || {});
      d.runSurfaces = Object.assign({}, seeded.runSurfaces || {});
      d.experiments = Array.isArray(seeded.experiments) ? seeded.experiments : [];
      d.estimateCredits = Array.isArray(seeded.estimateCredits) ? seeded.estimateCredits : [];
      d.xpCredits = Array.isArray(seeded.xpCredits) ? seeded.xpCredits : [];
      d.predictionStats = Object.assign({}, DEFAULTS.predictionStats, seeded.predictionStats || {});
      d.misconceptionTally = Object.assign({}, seeded.misconceptionTally || {});
      d.logView = Object.assign({}, DEFAULTS.logView, seeded.logView || {});
      d.cer = seeded.cer && typeof seeded.cer === 'object' ? seeded.cer : {};
      d.missions = seeded.missions && typeof seeded.missions === 'object' ? seeded.missions : {};
      d.moonSeen = Array.isArray(seeded.moonSeen) ? seeded.moonSeen : [];

      // Stage C (b): saves from before predict-first stored estimateChallenge:
      // false. Turn it on once (flag _predictDefaultV = 2), then respect the
      // learner's own choice.
      var predictMigrate = !!toolData.skatelab && !seeded._predictDefaultV;
      if (predictMigrate && seeded.estimateChallenge === false) d.estimateChallenge = true;

      // Stage C P4-3: teacher settings. Students get the locked values; the
      // teacher (ctx.isTeacherMode) keeps every control free to explore.
      var teacherView = ctx.isTeacherMode === true;
      var teacherSettings = seeded.teacher && typeof seeded.teacher === 'object' ? seeded.teacher : {};
      var teacherLocks = teacherSettings.locks && typeof teacherSettings.locks === 'object' ? teacherSettings.locks : {};
      function isLocked(key) {
        return !teacherView && Object.prototype.hasOwnProperty.call(teacherLocks, key);
      }
      function withLocks(state) {
        var effective = Object.assign({}, state || {});
        TEACHER_LOCK_KEYS.forEach(function(key) { if (isLocked(key)) effective[key] = teacherLocks[key]; });
        return effective;
      }
      d = withLocks(d);
      var hideAnswers = !teacherView && !!teacherSettings.hideAnswers;
      var scaffoldLevel = scaffoldLevelFor(ctx.gradeBand, ctx.gradeLevel, d.scaffoldLevel);
      var autoScaffoldLevel = scaffoldLevelFor(ctx.gradeBand, ctx.gradeLevel, null);

      if (!toolData.skatelab && typeof setToolData === 'function') {
        setToolData(function(previous) {
          previous = previous || {};
          return Object.assign({}, previous, { skatelab: Object.assign({}, DEFAULTS, { _predictDefaultV: 2 }) });
        });
      }

      function upd(patch) {
        if (typeof setToolData !== 'function') return;
        setToolData(function(previous) {
          previous = previous || {};
          var current = Object.assign({}, DEFAULTS, previous.skatelab || {});
          current.stats = Object.assign({}, DEFAULTS.stats, current.stats || {});
          current.runViews = Object.assign({}, current.runViews || {});
          current.runSurfaces = Object.assign({}, current.runSurfaces || {});
          current.experiments = Array.isArray(current.experiments) ? current.experiments : [];
          current.estimateCredits = Array.isArray(current.estimateCredits) ? current.estimateCredits : [];
          current.xpCredits = Array.isArray(current.xpCredits) ? current.xpCredits : [];
          var values = typeof patch === 'function' ? patch(current) : patch;
          return Object.assign({}, previous, { skatelab: Object.assign({}, current, values || {}) });
        });
      }

      var mode = d.mode === 'gap' ? 'gap' : (d.mode === 'flat' ? 'flat' : 'halfpipe');
      var viewMode = d.viewMode === '3d' ? '3d' : '2d';
      var playbackSpeed = PLAYBACK_SPEEDS.indexOf(Number(d.playbackSpeed)) !== -1 ? Number(d.playbackSpeed) : 1;
      var sim = runSimulation(mode, simInputsFromState(mode, d));

      var currentSimulationSignature = simulationSignature(sim);
      var lastSimModel = asSimulation(d.lastSim);
      var previousSimModel = asSimulation(d.previousSim);
      var lastSimulationSignature = simulationSignature(lastSimModel);
      var previousSimulationSignature = simulationSignature(previousSimModel);
      var lastResultSignature = d.lastResult && d.lastResult.v === 2
        ? String(d.lastResult.signature || '')
        : simulationSignature(d.lastResult);
      var currentResult = lastResultSignature && lastResultSignature === currentSimulationSignature
        ? sim
        : null;
      var comparisonSim = lastSimModel &&
        lastSimModel.mode === mode &&
        lastSimulationSignature !== currentSimulationSignature
        ? lastSimModel
        : (previousSimModel &&
          previousSimModel.mode === mode &&
          previousSimulationSignature !== currentSimulationSignature
            ? previousSimModel
            : null);

      var canvasRef = React.useRef(null);
      // Fullscreen stage: the whole sk-stage section, so the run toolbar, the
      // telemetry strip and the timeline scrubber stay with the simulation. The
      // canvas is aspect-ratio 16/9 at width:100%, so it scales on its own.
      var skFsRef = React.useRef(null);
      var skFsState = React.useState(false), skFs = skFsState[0], setSkFs = skFsState[1];
      var animationRef = React.useRef(null);
      var playbackRef = React.useRef(null);
      var runningState = React.useState(false);
      var running = runningState[0];
      var setRunning = runningState[1];
      React.useEffect(function () {
        var el = skFsRef.current;
        if (!el || typeof MutationObserver !== 'function') return;
        var sync = function () {
          setSkFs(!!(el.hasAttribute('data-allo-fullscreen-active')
            || document.fullscreenElement === el
            || document.webkitFullscreenElement === el));
        };
        var mo = new MutationObserver(sync);
        mo.observe(el, { attributes: true, attributeFilter: ['data-allo-fullscreen-active'] });
        document.addEventListener('fullscreenchange', sync);
        document.addEventListener('webkitfullscreenchange', sync);
        sync();
        return function () {
          mo.disconnect();
          document.removeEventListener('fullscreenchange', sync);
          document.removeEventListener('webkitfullscreenchange', sync);
        };
      }, []);
      var pausedState = React.useState(false);
      var paused = pausedState[0];
      var setPaused = pausedState[1];
      var localStatusState = React.useState(null);
      var localStatus = localStatusState[0];
      var setLocalStatus = localStatusState[1];
      // The one screen-reader channel. It changes only when a run ends, when
      // playback pauses, or when inspection moves into a different phase.
      var announcementState = React.useState('');
      var announcement = announcementState[0];
      var setAnnouncement = announcementState[1];
      var playheadState = React.useState(0);
      var playhead = playheadState[0];
      var setPlayhead = playheadState[1];
      var playheadRef = React.useRef(0);
      var lastTelemetryPaintRef = React.useRef(0);
      var announceTimerRef = React.useRef(null);
      var announcedPhaseRef = React.useRef(null);
      var xpAwardedRef = React.useRef({});
      // Inline confirm for deleting log rows (window.confirm does not work in
      // Gemini Canvas): { kind: 'row', id } or { kind: 'all' }.
      var confirmState = React.useState(null);
      var pendingConfirm = confirmState[0];
      var setPendingConfirm = confirmState[1];
      // Offline CER self-check feedback and the optional host hint, per investigation.
      var cerFeedbackState = React.useState(null);
      var cerFeedback = cerFeedbackState[0];
      var setCerFeedback = cerFeedbackState[1];
      var hintState = React.useState(null);
      var hintText = hintState[0];
      var setHintText = hintState[1];
      var reduceMotionRef = React.useRef(false);
      reduceMotionRef.current = ctx.reduceMotion === true;
      // Stage C (a): the setup signature for which the learner pressed Run
      // without a prediction. Only then does the role=alert message appear.
      var runAttemptState = React.useState('');
      var runAttemptSignature = runAttemptState[0];
      var setRunAttemptSignature = runAttemptState[1];
      // Stage C missions: hints shown per mission, and the open vocabulary term.
      var missionHintState = React.useState({});
      var missionHints = missionHintState[0];
      var setMissionHints = missionHintState[1];
      var vocabState = React.useState(null);
      var openVocab = vocabState[0];
      var setOpenVocab = vocabState[1];
      // Stage C P5-1 sound: the AudioContext and the playing sonification live
      // in refs only (never in toolData).
      var audioRef = React.useRef(null);
      var sonifyHandleRef = React.useRef(null);
      var sonifyPlayingState = React.useState(false);
      var sonifyPlaying = sonifyPlayingState[0];
      var setSonifyPlaying = sonifyPlayingState[1];
      var spokenPhaseRef = React.useRef(null);
      var lastSpeechRef = React.useRef(0);
      var shellRef = React.useRef(null);
      var keyHandlerRef = React.useRef(null);

      React.useEffect(function() {
        if (!predictMigrate) return;
        // Without the flag the save holds either false (pre-predict-first) or
        // the default true, so both become true exactly once.
        upd(function(current) {
          if (current._predictDefaultV) return null;
          return { _predictDefaultV: 2, estimateChallenge: true };
        });
      }, []);

      // Older saves stored whole simulation objects (up to hundreds of KB).
      // Replace them with slim records once; the runs reload by recomputing.
      React.useEffect(function() {
        var hasLegacy = ['lastSim', 'previousSim', 'lastResult'].some(function(key) {
          var value = seeded[key];
          return !!value && typeof value === 'object' && value.v !== 2;
        });
        if (!hasLegacy) return;
        upd(function(current) {
          var resultModel = asSimulation(current.lastResult);
          return {
            lastSim: simRecord(current.lastSim),
            previousSim: simRecord(current.previousSim),
            lastResult: resultModel ? resultRecord(resultModel) : null
          };
        });
      }, []);

      React.useEffect(function() {
        return function() {
          if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
          announceTimerRef.current = null;
        };
      }, []);

      function resultRecord(model) {
        var record = simRecord(model);
        if (!record) return null;
        return { v: 2, mode: record.mode, signature: simulationSignature(model), summary: record.summary };
      }

      // Honour the app's reduce-motion setting and the .reduce-motion class as
      // well as the OS media query. Checked when a run starts and on every frame.
      function motionReduced() {
        if (reduceMotionRef.current) return true;
        try {
          var shell = skFsRef.current;
          if (shell && shell.closest && shell.closest('.reduce-motion')) return true;
          if (typeof document !== 'undefined' && document.querySelector && document.querySelector('.reduce-motion')) return true;
        } catch (err) {}
        try {
          return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        } catch (err) {
          return false;
        }
      }

      function announce(text) {
        if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
        announceTimerRef.current = null;
        setAnnouncement(String(text || ''));
      }

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
        running, mode, viewMode, currentSimulationSignature, d.cameraAzimuth,
        d.showVectors, d.showTrail, d.showEnergy, lastSimulationSignature, previousSimulationSignature
      ]);

      React.useEffect(function() {
        return function() {
          if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
          playbackRef.current = null;
        };
      }, []);

      function experimentSetupText(model, current) {
        if (model.mode === 'halfpipe') {
          return fillTemplate(__alloT('stem.skatelab.log_setup_halfpipe',
            '{pumps} pumps ({timing}) · drop {drop} m · {depth} m ramp · {surface} · {target}° target · {body}'), {
            pumps: model.pumps,
            timing: pumpTimingLabel(model.pumpTiming.id).toLowerCase(),
            drop: rounded(model.dropHeightM, 1),
            depth: rounded(model.rampDepthM, 1),
            surface: surfaceLabel(model.surface.id).toLowerCase(),
            target: Math.round(model.rotationTarget),
            body: bodyPositionLabel(model.bodyPosition.id).toLowerCase()
          });
        }
        if (model.mode === 'flat') {
          return fillTemplate(__alloT('stem.skatelab.log_setup_flat', '{push} N push · {surface} · μ = {mu}'), {
            push: Math.round(model.pushForceN),
            surface: surfaceLabel(model.surface.id).toLowerCase(),
            mu: rounded(model.rollingMu, 3)
          });
        }
        // Read from the model run (not the saved controls) so teacher locks
        // and the logged run always agree.
        return fillTemplate(__alloT('stem.skatelab.log_setup_gap', '{speed} mph · {angle}° · {gap} ft gap · {absorption} m absorption · {wind} · {air}'), {
          speed: String(Number(rounded(model.speedMph, 2))),
          angle: String(Number(rounded(model.angleDeg, 2))),
          gap: String(Number(rounded(model.gapFt, 2))),
          absorption: String(Number(rounded(model.landingCompressionM, 3))),
          wind: windName(model.wind && model.wind.id).toLowerCase(),
          air: model.airDrag
            ? __alloT('stem.skatelab.log_setup_drag_on', 'drag on')
            : __alloT('stem.skatelab.log_setup_ideal_air', 'ideal air')
        });
      }

      function awardRunXp(finishedSim, finishedSignature, estimateCredited, predictionOutcome) {
        var awards = [];
        if (predictionOutcome) {
          var predictAwards = d.xpCredits.filter(function(id) { return String(id).indexOf('skatelab_predict_') === 0; }).length;
          if (predictAwards < 25) {
            awards.push({ id: 'skatelab_predict_' + signatureHash(finishedSignature + '|' + predictionOutcome.promptId), points: 2,
              reason: __alloT('stem.skatelab.xp_prediction', 'Skate Lab: made a prediction and checked it against the model') });
          }
        }
        var setupCredits = d.xpCredits.filter(function(id) { return String(id).indexOf('skatelab_setup_') === 0; }).length;
        if (setupCredits < 30) {
          awards.push({ id: 'skatelab_setup_' + signatureHash(finishedSignature), points: 2,
            reason: __alloT('stem.skatelab.xp_new_setup', 'Skate Lab: tested a new physics setup') });
        }
        if (finishedSim.mode === 'halfpipe' && finishedSim.runSuccessful) {
          awards.push({ id: 'skatelab_trick_landed', points: 10,
            reason: __alloT('stem.skatelab.xp_trick_landed', 'Skate Lab: landed a spin on target') });
          if (finishedSim.landingHalfTurns % 2 === 1) {
            awards.push({ id: 'skatelab_half_turn', points: 10,
              reason: __alloT('stem.skatelab.xp_half_turn', 'Skate Lab: landed a half-turn spin') });
          }
        }
        if (finishedSim.mode === 'gap' && finishedSim.runSuccessful) {
          awards.push({ id: 'skatelab_gap_landing', points: 10,
            reason: __alloT('stem.skatelab.xp_gap_landing', 'Skate Lab: landed a gap jump in the zone') });
        }
        if (finishedSim.mode === 'flat' && finishedSim.moves) {
          awards.push({ id: 'skatelab_flat_stop', points: 5,
            reason: __alloT('stem.skatelab.xp_flat_stop', 'Skate Lab: measured a friction stop') });
        }
        if (estimateCredited) {
          var estimateAwards = d.xpCredits.filter(function(id) { return String(id).indexOf('skatelab_estimate_') === 0; }).length;
          if (estimateAwards < 20) {
            awards.push({ id: 'skatelab_estimate_' + signatureHash(finishedSignature), points: 5,
              reason: __alloT('stem.skatelab.xp_estimate', 'Skate Lab: estimate within 10%') });
          }
        }
        var fresh = awards.filter(function(award) {
          return d.xpCredits.indexOf(award.id) === -1 && !xpAwardedRef.current[award.id];
        });
        fresh.forEach(function(award) {
          xpAwardedRef.current[award.id] = true;
          if (typeof ctx.awardXP === 'function') {
            try { ctx.awardXP(award.id, award.points, award.reason); } catch (err) {}
          }
        });
        return fresh.map(function(award) { return award.id; });
      }

      function finishRun(finishedSim, shouldLog) {
        animationRef.current = null;
        playbackRef.current = null;
        commitPlayhead(1);
        setPaused(false);
        setRunning(false);
        announcedPhaseRef.current = null;
        var finishedText = resultText(finishedSim);
        if (shouldLog || simulationSignature(finishedSim) === currentSimulationSignature) {
          setModelStatus(finishedSim, finishedText);
        } else {
          setLocalStatus(null);
        }
        if (!shouldLog) {
          announce(finishedText);
          return;
        }

        var finishedSignature = simulationSignature(finishedSim);
        var actual = measuredValueFt(finishedSim);
        var estimate = Number(estimateText);
        var hasEstimate = estimateValid;
        var errorPct = hasEstimate ? Math.abs(estimate - actual) / Math.max(0.01, actual) * 100 : null;
        // Repeating the same estimate for the same setup earns credit once.
        var estimateKey = finishedSignature + '|' + (hasEstimate ? rounded(estimate, 2) : '');
        var estimateCredited = errorPct !== null && errorPct <= 10 &&
          d.estimateCredits.indexOf(estimateKey) === -1;
        // P3-1: check the committed prediction by running the model.
        var predictionOutcome = null;
        if (predictionChoice && activePromptId && finishedSignature === currentSimulationSignature) {
          var evaluation = null;
          try { evaluation = evaluatePrediction(activePromptId, finishedSim); } catch (err) { evaluation = null; }
          var judged = judgePrediction(activePromptId, predictionChoice, evaluation);
          if (judged) {
            predictionOutcome = {
              signature: finishedSignature,
              promptId: activePromptId,
              choice: predictionChoice,
              correct: evaluation.correct,
              matched: judged.matched,
              misconception: judged.misconception,
              facts: evaluation.facts,
              tryPatch: evaluation.tryPatch,
              tryProgress: evaluation.tryProgress
            };
          }
        }
        // Stage C P4-1: every mission is checked against this finished run.
        // A hang-time guess counts only if it was typed for this setup before
        // any Moon run of the same setup revealed the answer.
        var finishedHash = signatureHash(finishedSignature);
        var missionGuessValue = d.missionGuess && d.missionGuess.signature === finishedSignature &&
          d.moonSeen.indexOf(finishedHash) === -1 ? d.missionGuess.value : null;
        var missionResults = MISSIONS.map(function(mission) {
          if (mission.mode !== finishedSim.mode) return null;
          try { return checkMission(mission.id, finishedSim, { guess: missionGuessValue }); } catch (err) { return null; }
        }).filter(Boolean);
        var missionXpIds = [];
        var newlyDone = [];
        missionResults.forEach(function(missionResult) {
          if (!missionResult.done) return;
          var xpId = 'skatelab_mission_' + missionResult.id;
          if (!(d.missions[missionResult.id] && d.missions[missionResult.id].done)) newlyDone.push(missionResult.id);
          if (d.xpCredits.indexOf(xpId) !== -1 || xpAwardedRef.current[xpId]) return;
          xpAwardedRef.current[xpId] = true;
          missionXpIds.push(xpId);
          if (typeof ctx.awardXP === 'function') {
            try {
              ctx.awardXP(xpId, getMission(missionResult.id).xp, fillTemplate(__alloT('stem.skatelab.xp_mission', 'Skate Lab mission complete: {title}'), {
                title: missionText(missionResult.id).title
              }));
            } catch (err) {}
          }
        });
        var activeMissionResult = null;
        missionResults.forEach(function(missionResult) { if (missionResult.id === d.activeMission) activeMissionResult = missionResult; });
        var missionAnnouncement = activeMissionResult
          ? ' ' + fillTemplate(__alloT('stem.skatelab.mission_announce', 'Mission “{title}”: {result}'), {
            title: missionText(activeMissionResult.id).title,
            result: missionResultText(activeMissionResult)
          })
          : '';
        newlyDone.forEach(function(id) {
          if (activeMissionResult && activeMissionResult.id === id) return;
          missionAnnouncement += ' ' + fillTemplate(__alloT('stem.skatelab.mission_announce_done', 'Mission complete: {title}.'), { title: missionText(id).title });
        });
        announce((predictionOutcome
          ? finishedText + ' ' + (hideAnswers
            ? __alloT('stem.skatelab.predict_saved_short', 'Your prediction is saved for your teacher.')
            : predictionVerdictText(predictionOutcome))
          : finishedText) + missionAnnouncement);
        var newXpIds = awardRunXp(finishedSim, finishedSignature, estimateCredited, predictionOutcome).concat(missionXpIds);
        var isMoonHalfpipe = finishedSim.mode === 'halfpipe' && Math.abs(finishedSim.gravity - 1.62) < 1e-6;
        var runView = viewMode;
        var runSurface = finishedSim.mode === 'gap' ? null : finishedSim.surface.id;
        var runRecord = simRecord(finishedSim);
        var runNumbers = runValues(finishedSim);

        upd(function(current) {
          var stats = Object.assign({}, current.stats || DEFAULTS.stats);
          var alreadyCredited = (current.estimateCredits || []).indexOf(estimateKey) !== -1;
          var credit = estimateCredited && !alreadyCredited;
          stats.runs = (stats.runs || 0) + 1;
          stats.successful = (stats.successful || 0) + (simulationSuccessful(finishedSim) ? 1 : 0);
          stats.withinTen = (stats.withinTen || 0) + (credit ? 1 : 0);
          var runViews = Object.assign({}, current.runViews || {});
          runViews[runView] = true;
          var runSurfaces = Object.assign({}, current.runSurfaces || {});
          if (runSurface) runSurfaces[runSurface] = true;
          var xpCredits = (current.xpCredits || []).slice();
          newXpIds.forEach(function(id) { if (xpCredits.indexOf(id) === -1) xpCredits.push(id); });
          var entryId = Date.now();
          while ((current.experiments || []).some(function(existing) { return existing.id === entryId; })) entryId += 1;
          var entry = {
            id: entryId,
            n: stats.runs,
            mode: finishedSim.mode,
            view: current.viewMode,
            setup: experimentSetupText(finishedSim, current),
            measured: actual,
            unit: 'ft',
            estimate: hasEstimate ? estimate : null,
            errorPct: errorPct,
            landed: finishedSim.landed,
            contactSafe: !!finishedSim.contactSafe,
            trickGoalMet: finishedSim.mode === 'halfpipe' ? !!finishedSim.trickGoalMet : null,
            outcome: finishedSim.outcome,
            runSuccessful: simulationSuccessful(finishedSim),
            record: runRecord,
            values: runNumbers
          };
          var activeInvestigation = getInvestigation(current.activeInvestigation);
          var planStep = matchPlanStep(activeInvestigation, withLocks(current));
          if (planStep !== -1) {
            entry.inv = activeInvestigation.id;
            entry.step = planStep;
          }
          var missions = Object.assign({}, current.missions || {});
          missionResults.forEach(function(missionResult) {
            var isActive = current.activeMission === missionResult.id;
            if (!isActive && !missionResult.done) return;
            var next = Object.assign({ done: false, tries: 0 }, missions[missionResult.id] || {});
            if (isActive) {
              next.tries = finite(next.tries, 0) + 1;
              next.last = missionResult.value != null && Number.isFinite(Number(missionResult.value))
                ? Number(Number(missionResult.value).toPrecision(4))
                : null;
              next.reason = missionResult.reason;
              next.err = Number.isFinite(missionResult.guessErrorPct) ? Math.round(missionResult.guessErrorPct) : null;
            }
            if (missionResult.done) next.done = true;
            missions[missionResult.id] = next;
          });
          var moonSeen = (current.moonSeen || []).slice();
          if (isMoonHalfpipe && moonSeen.indexOf(finishedHash) === -1) moonSeen = moonSeen.concat([finishedHash]).slice(-40);
          var predictionStats = Object.assign({}, DEFAULTS.predictionStats, current.predictionStats || {});
          var tally = Object.assign({}, current.misconceptionTally || {});
          if (predictionOutcome) {
            predictionStats.made += 1;
            predictionStats.matched += predictionOutcome.matched ? 1 : 0;
            if (predictionOutcome.misconception) {
              tally[predictionOutcome.misconception] = (tally[predictionOutcome.misconception] || 0) + 1;
            }
          }
          return {
            lastResult: resultRecord(finishedSim),
            lastSim: simRecord(finishedSim),
            previousSim: isComparableSimulation(current.lastSim) ? simRecord(current.lastSim) : null,
            experiments: [entry].concat(current.experiments || []).slice(0, 50),
            predictionResult: predictionOutcome || current.predictionResult || null,
            predictionStats: predictionStats,
            misconceptionTally: tally,
            missions: missions,
            moonSeen: moonSeen,
            stats: stats,
            runViews: runViews,
            runSurfaces: runSurfaces,
            estimateCredits: credit
              ? [estimateKey].concat(current.estimateCredits || []).slice(0, 40)
              : (current.estimateCredits || []),
            xpCredits: xpCredits.slice(-80)
          };
        });
      }

      function runningStatusText(model) {
        if (model.mode === 'halfpipe') return __alloT('stem.skatelab.status_running_halfpipe', 'Running the energy model…');
        if (model.mode === 'flat') return __alloT('stem.skatelab.status_running_flat', 'Running the push-and-coast model…');
        return __alloT('stem.skatelab.status_running_gap', 'Solving the projectile path…');
      }

      // ---- Stage C P5-1 speech and sound ----
      function globalMuted() {
        try { return !!(typeof window !== 'undefined' && window._alloGlobalMute); } catch (err) { return false; }
      }
      function speakWithBrowser(text) {
        try {
          if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function') {
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(new window.SpeechSynthesisUtterance(String(text)));
            return true;
          }
        } catch (err) {}
        return false;
      }
      // Speaks through the host voice (ctx.callTTS) or the browser voice.
      // Automatic narration is throttled so phases do not talk over each other.
      function speak(text, userInitiated) {
        if (!text || globalMuted()) return false;
        var now = Date.now();
        if (!userInitiated && now - lastSpeechRef.current < 1200) return false;
        lastSpeechRef.current = now;
        if (typeof ctx.callTTS === 'function') {
          try {
            var pending = ctx.callTTS(String(text), undefined, undefined, { force: true });
            if (pending && typeof pending.then === 'function') {
              pending.then(function(url) { if (!url) speakWithBrowser(text); }, function() { speakWithBrowser(text); });
            }
            return true;
          } catch (err) {}
        }
        return speakWithBrowser(text);
      }
      function audioContextForSound() {
        try {
          if (window.StemLab && typeof window.StemLab.audioContext === 'function') return window.StemLab.audioContext();
        } catch (err) {}
        if (audioRef.current && audioRef.current.state !== 'closed') return audioRef.current;
        var Ctor = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
        if (!Ctor) return null;
        try { audioRef.current = new Ctor(); } catch (err) { audioRef.current = null; }
        return audioRef.current;
      }
      function stopSonify() {
        var handle = sonifyHandleRef.current;
        sonifyHandleRef.current = null;
        if (handle) { try { handle.stop(); } catch (err) {} }
        setSonifyPlaying(false);
      }
      function startSonify(model, fromProgress, speed) {
        stopSonify();
        if (globalMuted()) {
          announce(__alloT('stem.skatelab.sound_muted', 'Sound is muted in the app, so the run cannot be played as sound.'));
          return false;
        }
        var plan = skateSonifyPlan(model, { speed: speed, fromProgress: fromProgress });
        var ac = plan ? audioContextForSound() : null;
        if (!plan || !ac) {
          if (!ac && plan) announce(__alloT('stem.skatelab.sound_unavailable', 'Sound is not available in this browser.'));
          return false;
        }
        try { if (ac.state === 'suspended' && typeof ac.resume === 'function') ac.resume(); } catch (err) {}
        var handle = null;
        handle = skateSonifyPlay(plan, ac, function() {
          if (sonifyHandleRef.current === handle) {
            sonifyHandleRef.current = null;
            setSonifyPlaying(false);
          }
        });
        if (!handle) return false;
        sonifyHandleRef.current = handle;
        setSonifyPlaying(true);
        return true;
      }
      // Narrates a phase change during playback when narration is on.
      function narrateProgress(model, progress) {
        if (!d.narrate) return;
        var sample = sampleModel(model, progress);
        if (spokenPhaseRef.current === sample.phase) return;
        spokenPhaseRef.current = sample.phase;
        speak(narrationText(model, sample), false);
      }

      React.useEffect(function() {
        return function() {
          var handle = sonifyHandleRef.current;
          sonifyHandleRef.current = null;
          if (handle) { try { handle.stop(); } catch (err) {} }
          if (audioRef.current && typeof audioRef.current.close === 'function') {
            try { audioRef.current.close(); } catch (err) {}
          }
          audioRef.current = null;
          try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (err) {}
        };
      }, []);

      // When a disabled control drops focus to <body> mid-run, the shortcuts
      // still reach Skate Lab. Keys typed anywhere else are never handled here.
      React.useEffect(function() {
        if (typeof document === 'undefined' || !document.addEventListener) return undefined;
        function onDocumentKey(event) {
          var active = document.activeElement;
          if (active && active !== document.body && active !== document.documentElement) return;
          if (!shellRef.current || !shellRef.current.isConnected) return;
          if (keyHandlerRef.current) keyHandlerRef.current(event);
        }
        document.addEventListener('keydown', onDocumentKey);
        return function() { document.removeEventListener('keydown', onDocumentKey); };
      }, []);

      function playbackDurationMs(model, speed) {
        // One consistent time scale: at 1× one model second plays in one second.
        return Math.max(1, finite(model.motionDuration, 0) * 1000 / Math.max(0.01, speed));
      }

      function animateModel(model, shouldLog) {
        if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
        playbackRef.current = null;
        commitPlayhead(0);
        lastTelemetryPaintRef.current = 0;
        setPaused(false);
        setRunning(true);
        setModelStatus(model, runningStatusText(model));
        spokenPhaseRef.current = null;
        stopSonify();
        if (motionReduced()) {
          commitPlayhead(1);
          drawScene(canvasRef.current, model, 1, renderConfig(model, true));
          finishRun(model, shouldLog);
          return;
        }
        if (d.sonify) startSonify(model, 0, playbackSpeed);
        narrateProgress(model, 0);

        var session = {
          model: model,
          shouldLog: !!shouldLog,
          duration: playbackDurationMs(model, playbackSpeed),
          progress: 0,
          anchorTime: null,
          paused: false,
          frame: null
        };
        function frame(time) {
          if (playbackRef.current !== session || session.paused) return;
          if (motionReduced()) {
            drawScene(canvasRef.current, model, 1, renderConfig(model, true));
            finishRun(model, session.shouldLog);
            return;
          }
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
          narrateProgress(model, progress);
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

      function changePlaybackSpeed(nextSpeed) {
        nextSpeed = PLAYBACK_SPEEDS.indexOf(Number(nextSpeed)) !== -1 ? Number(nextSpeed) : 1;
        var session = playbackRef.current;
        if (session) {
          session.progress = playheadRef.current;
          session.duration = playbackDurationMs(session.model, nextSpeed);
          session.anchorTime = null;
          // Keep the sound in step with the new speed.
          if (sonifyHandleRef.current && !session.paused) startSonify(session.model, session.progress, nextSpeed);
        }
        upd({ playbackSpeed: nextSpeed });
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
        stopSonify();
        var pausedSample = sampleModel(session.model, session.progress);
        var pausedText = fillTemplate(__alloT('stem.skatelab.status_paused', 'Paused at {phase} · {time} seconds.'), {
          phase: phaseLabel(pausedSample.phase),
          time: rounded(pausedSample.time, 2)
        });
        setModelStatus(session.model, pausedText);
        announce(pausedText);
      }

      function resumePlayback() {
        var session = playbackRef.current;
        if (!running || !paused || !session) return;
        session.progress = playheadRef.current;
        session.anchorTime = null;
        session.paused = false;
        lastTelemetryPaintRef.current = 0;
        setPaused(false);
        if (d.sonify) startSonify(session.model, session.progress, playbackSpeed);
        setModelStatus(session.model, session.model.mode === 'halfpipe'
          ? __alloT('stem.skatelab.status_resuming_halfpipe', 'Resuming the energy model…')
          : (session.model.mode === 'flat'
            ? __alloT('stem.skatelab.status_resuming_flat', 'Resuming the push-and-coast model…')
            : __alloT('stem.skatelab.status_resuming_gap', 'Resuming the projectile path…')));
        animationRef.current = requestAnimationFrame(session.frame);
      }

      function togglePlayback() {
        if (paused) resumePlayback();
        else pausePlayback();
      }

      function chooseView(nextView) {
        if (running) return;
        upd({ viewMode: nextView });
      }

      function chooseSurface(nextSurface) {
        if (running || isLocked('surfaceId')) return;
        upd({ surfaceId: nextSurface });
      }

      var MODE_ORDER = ['halfpipe', 'gap', 'flat'];

      function chooseMode(nextMode) {
        if (running || nextMode === mode || isLocked('mode')) return;
        commitPlayhead(0);
        setLocalStatus(null);
        announcedPhaseRef.current = null;
        upd({ mode: nextMode });
      }

      function modeKeyDown(event) {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' &&
            event.key !== 'Home' && event.key !== 'End') return;
        event.preventDefault();
        var index = MODE_ORDER.indexOf(mode);
        var next;
        if (event.key === 'Home') next = MODE_ORDER[0];
        else if (event.key === 'End') next = MODE_ORDER[MODE_ORDER.length - 1];
        else next = MODE_ORDER[(index + (event.key === 'ArrowRight' ? 1 : MODE_ORDER.length - 1)) % MODE_ORDER.length];
        chooseMode(next);
        if (typeof document !== 'undefined') {
          setTimeout(function() {
            var target = document.getElementById('sk-mode-tab-' + next);
            if (target) target.focus();
          }, 0);
        }
      }

      // Scrubbing redraws freely but announces only a change of phase, and
      // slider drags wait until the playhead settles before announcing.
      function inspectPlayhead(nextProgress, announceNow) {
        if (running || predictionLocked) return;
        nextProgress = clamp(finite(nextProgress, 0), 0, 1);
        commitPlayhead(nextProgress);
        if (canvasRef.current) drawScene(canvasRef.current, sim, nextProgress, renderConfig());
        var inspected = sampleModel(sim, nextProgress);
        setModelStatus(sim, fillTemplate(__alloT('stem.skatelab.status_inspecting', 'Inspecting {phase} at {time} seconds.'), {
          phase: phaseLabel(inspected.phase),
          time: rounded(inspected.time, 2)
        }) + ' ' + phaseLearningText(sim, inspected));
        if (announcedPhaseRef.current === inspected.phase) return;
        announcedPhaseRef.current = inspected.phase;
        var phaseAnnouncement = fillTemplate(__alloT('stem.skatelab.announce_phase', 'Inspecting {phase}.'), {
          phase: phaseLabel(inspected.phase)
        });
        if (announceNow) {
          announce(phaseAnnouncement);
          return;
        }
        if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
        announceTimerRef.current = setTimeout(function() {
          announceTimerRef.current = null;
          setAnnouncement(phaseAnnouncement);
        }, 450);
      }

      var lockedNoteText = __alloT('stem.skatelab.locked_by_teacher', 'Locked by your teacher.');
      function lockedNote(key) {
        return isLocked(key) ? h('p', { className: 'sk-help sk-locked-note' }, h('span', { 'aria-hidden': 'true' }, '🔒 '), lockedNoteText) : null;
      }

      function rangeControl(id, label, value, min, max, step, unit, onChange, help, lockKey) {
        var locked = !!lockKey && isLocked(lockKey);
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
            disabled: running || locked,
            onChange: onChange
          }),
          help && h('p', { className: 'sk-help' }, help),
          locked && lockedNote(lockKey)
        );
      }

      function radioGrid(name, value, options, onChange, groupLabel, lockKey) {
        var locked = !!lockKey && isLocked(lockKey);
        return h('div', { className: 'sk-radio-grid', role: 'radiogroup', 'aria-label': groupLabel || name },
          options.map(function(option) {
            var id = 'sk-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + option.id;
            return h('label', { key: option.id, htmlFor: id },
              h('input', {
                id: id,
                type: 'radio',
                name: 'sk-' + name,
                value: option.id,
                checked: value === option.id,
                disabled: running || locked,
                onChange: function() { onChange(option.id); }
              }),
              h('span', null, option.label)
            );
          })
        );
      }

      // An estimate counts only for the setup it was typed for.
      var estimateFresh = !d.estimateSignature || d.estimateSignature === currentSimulationSignature;
      var estimateText = estimateFresh && d.estimateValue != null ? String(d.estimateValue) : '';
      var estimateNumber = Number(estimateText);
      var estimateValid = estimateText.trim() !== '' && Number.isFinite(estimateNumber) && estimateNumber >= 0;
      // P3-1: one choice question per new setup, rotating through this mode's prompts.
      var availablePrompts = predictionPromptsFor(mode, d.airDrag);
      var storedPrediction = d.prediction && d.prediction.signature === currentSimulationSignature ? d.prediction : null;
      var activePromptId = storedPrediction && availablePrompts.indexOf(storedPrediction.promptId) !== -1
        ? storedPrediction.promptId
        : (availablePrompts.length ? availablePrompts[(finite(d.predictionStats.made, 0)) % availablePrompts.length] : null);
      var predictionChoice = storedPrediction && storedPrediction.promptId === activePromptId &&
        PREDICTION_PROMPTS[activePromptId] && PREDICTION_PROMPTS[activePromptId].options.indexOf(storedPrediction.choice) !== -1
        ? storedPrediction.choice
        : null;
      var choiceMade = !!predictionChoice;
      var estimateBlocked = !!d.estimateChallenge && !estimateValid && !choiceMade;
      // (a) The alert appears only after Run was pressed without a prediction
      // for this setup; before that the same need is calm instruction text.
      var showPredictAlert = estimateBlocked && runAttemptSignature === currentSimulationSignature;
      var result = currentResult;
      var predictionLocked = !!d.estimateChallenge && !result && !running;
      var motionReducedNow = motionReduced();
      var displayPlayhead = predictionLocked ? 0 : playhead;
      var currentSample = sampleModel(sim, displayPlayhead);
      var windEnergyOutJ = mode === 'gap' ? Math.max(0, -sim.windWorkJ) : 0;
      var deckPotentialReleaseJ = mode === 'gap'
        ? Math.max(0, -sim.flightPotentialEnergyJ)
        : 0;
      var energyLedgerSourceJ = mode === 'gap'
        ? sim.energyInputJ + Math.max(0, sim.windWorkJ) + deckPotentialReleaseJ
        : sim.energyInputJ;
      var energyLedgerMotionHeightJ = mode === 'gap'
        ? sim.flightKineticEnergyJ + Math.max(0, sim.flightPotentialEnergyJ)
        : (mode === 'flat' ? 0 : sim.mechanicalJ);
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
        : clamp(sim.thermalJ / Math.max(1, energyLedgerSourceJ) * 100, 0, 100);
      var windEnergyOutPct = mode === 'gap'
        ? clamp(windEnergyOutJ / Math.max(1, energyLedgerSourceJ) * 100, 0, 100)
        : 0;
      var noAirText = __alloT('stem.skatelab.metric_no_air', 'No air');
      var metricData = mode === 'halfpipe' ? [
        { label: __alloT('stem.skatelab.metric_air', 'Air above lip'), value: sim.hasAir ? rounded(sim.hFt, 1) + ' ft' : noAirText },
        { label: __alloT('stem.skatelab.metric_hang', 'Hang time'), value: rounded(sim.airTime, 2) + ' s' },
        {
          label: __alloT('stem.skatelab.metric_rotation', 'Modeled rotation'),
          value: sim.hasAir
            ? Math.round(sim.completed) + '° · ' + (sim.landingStance === 'forward'
              ? __alloT('stem.skatelab.metric_stance_forward', 'forward')
              : __alloT('stem.skatelab.metric_stance_fakie', 'fakie'))
            : '—'
        },
        { label: __alloT('stem.skatelab.metric_rider_work', 'Work by rider'), value: Math.round(sim.riderWorkJ) + ' J' },
        { label: __alloT('stem.skatelab.metric_heat', 'Heat from friction'), value: Math.round(sim.thermalJ) + ' J' },
        { label: __alloT('stem.skatelab.metric_peak_load', 'Peak transition load'), value: rounded(sim.peakNormalG, 1) + ' g' }
      ] : (mode === 'flat' ? [
        { label: __alloT('stem.skatelab.metric_top_speed', 'Top speed'), value: rounded(sim.topSpeedMph, 1) + ' mph' },
        { label: __alloT('stem.skatelab.metric_stop_distance', 'Stopping distance'), value: rounded(sim.stopDistanceM, 2) + ' m' },
        { label: __alloT('stem.skatelab.metric_coast_time', 'Coasting time'), value: rounded(sim.coastTimeS, 1) + ' s' },
        { label: __alloT('stem.skatelab.metric_friction_force', 'Friction force'), value: rounded(sim.frictionN, 1) + ' N' },
        { label: __alloT('stem.skatelab.metric_push_work', 'Push work'), value: Math.round(sim.riderWorkJ) + ' J' },
        { label: __alloT('stem.skatelab.metric_heat_mumgd', 'Heat μ·m·g·d'), value: Math.round(sim.thermalJ) + ' J' }
      ] : [
        { label: __alloT('stem.skatelab.metric_range', 'Horizontal range'), value: rounded(sim.rangeFt, 1) + ' ft' },
        { label: __alloT('stem.skatelab.metric_peak_height', 'Peak height'), value: rounded(sim.peakFt, 1) + ' ft' },
        { label: __alloT('stem.skatelab.metric_flight_time', 'Flight time'), value: rounded(sim.airTime, 2) + ' s' },
        {
          label: sim.hasLandingContact
            ? __alloT('stem.skatelab.metric_landing_load', 'Landing load')
            : __alloT('stem.skatelab.metric_contact_load', 'Contact load'),
          value: sim.hasLandingContact
            ? fillTemplate(__alloT('stem.skatelab.metric_g_peak', '{value} g peak'), { value: rounded(getLandingPeakG(sim), 1) })
            : (sim.hasTerrainContact
              ? __alloT('stem.skatelab.metric_impact_not_modeled', 'Impact not modeled')
              : __alloT('stem.skatelab.metric_no_contact', 'No contact'))
        },
        {
          label: sim.hasLandingContact
            ? __alloT('stem.skatelab.metric_landing_angle', 'Landing angle')
            : __alloT('stem.skatelab.metric_terminal_angle', 'Terminal angle'),
          value: rounded(sim.landingAngleDeg, 0) + '°'
        },
        { label: __alloT('stem.skatelab.metric_drift', 'Lateral drift'), value: rounded(Math.abs(sim.crossDriftFt), 1) + ' ft' }
      ]);

      var phaseEvents;
      if (mode === 'halfpipe' && sim.hasAir) {
        phaseEvents = [
          { label: phaseEventName('start'), progress: 0, time: 0 },
          { label: phaseEventName('bottom'), progress: sim.bottomTime / sim.motionDuration, time: sim.bottomTime },
          { label: phaseEventName('lip'), progress: sim.rollTime / sim.motionDuration, time: sim.rollTime },
          { label: phaseEventName('apex'), progress: (sim.rollTime + sim.airTime * 0.5) / sim.motionDuration, time: sim.rollTime + sim.airTime * 0.5 },
          { label: phaseEventName(sim.reentryModeled ? 're-entry' : 'contact'), progress: sim.airLandingTime / sim.motionDuration, time: sim.airLandingTime },
          { label: phaseEventName(sim.reentryModeled ? 'return' : 'stop'), progress: 1, time: sim.motionDuration }
        ];
      } else if (mode === 'halfpipe') {
        phaseEvents = [
          { label: phaseEventName('start'), progress: 0, time: 0 },
          { label: phaseEventName('bottom'), progress: sim.bottomTime / sim.motionDuration, time: sim.bottomTime },
          { label: __alloT('stem.skatelab.event_far_wall', 'far wall'), progress: sim.firstTurnTime / sim.motionDuration, time: sim.firstTurnTime },
          { label: sim.endReason === 'time-limit' ? __alloT('stem.skatelab.event_time_limit', 'time limit') : __alloT('stem.skatelab.event_rest', 'at rest'), progress: 1, time: sim.motionDuration }
        ];
      } else if (mode === 'flat') {
        phaseEvents = [
          { label: phaseEventName('start'), progress: 0, time: 0 },
          { label: __alloT('stem.skatelab.event_push_end', 'push ends'), progress: Math.min(1, sim.pushTimeS / sim.motionDuration), time: Math.min(sim.pushTimeS, sim.motionDuration) },
          { label: phaseEventName('stop'), progress: 1, time: sim.motionDuration }
        ];
      } else {
        phaseEvents = [
          { label: phaseEventName('start'), progress: 0, time: 0 },
          { label: phaseEventName('ramp'), progress: sim.approachTime / sim.motionDuration, time: sim.approachTime },
          { label: phaseEventName('apex'), progress: (sim.approachTime + sim.peakTime) / sim.motionDuration, time: sim.approachTime + sim.peakTime },
          { label: phaseEventName(sim.hasLandingContact ? 'contact' : 'miss'), progress: (sim.approachTime + sim.airTime) / sim.motionDuration, time: sim.approachTime + sim.airTime },
          { label: phaseEventName(sim.hasLandingContact ? 'pulse end' : 'stop'), progress: 1, time: sim.motionDuration }
        ];
      }
      var phaseTimingText = predictionLocked ? __alloT('stem.skatelab.timing_hidden', 'Timing hidden until the model runs') : phaseEvents.map(function(event) {
        return fillTemplate(__alloT('stem.skatelab.timing_item', '{label} {time} seconds'), { label: event.label, time: rounded(event.time, 2) });
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
        if (model.mode === 'flat') {
          return [model.pushTimeS / model.motionDuration];
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
      // A long rocking run has many passes, so it needs a denser trace.
      var traceSteps = mode === 'halfpipe' ? 240 : 96;
      for (var traceStep = 0; traceStep <= traceSteps; traceStep++) {
        addTraceProgress(traceStep / traceSteps);
      }
      addTraceEvents(sim);
      if (comparisonSim) addTraceEvents(comparisonSim);
      traceProgressValues.sort(function(a, b) { return a - b; });

      // Flat ground plots speed (constant support load would be a flat line).
      function traceValue(traceSample) {
        return mode === 'flat'
          ? Math.max(0, finite(traceSample.speedMps, 0))
          : Math.max(0, finite(traceSample.normalG, 0));
      }
      function buildTraceSamples(model) {
        return traceProgressValues.map(function(traceProgress) {
          return { progress: traceProgress, loadG: traceValue(sampleModel(model, traceProgress)) };
        });
      }
      var traceSamples = buildTraceSamples(sim);
      var comparisonTraceSamples = comparisonSim ? buildTraceSamples(comparisonSim) : [];
      var traceMaxG = mode === 'flat' ? 0.1 : 1;
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
        : (mode === 'flat'
          ? sim.pushTimeS / sim.motionDuration
          : (sim.approachTime + sim.airTime + sim.landingStopTimeS * 0.5) / sim.motionDuration);
      var traceReentryPeakProgress = mode === 'halfpipe'
        ? sim.reentryPeakTime / sim.motionDuration
        : null;
      function modelPeakValue(model) {
        if (model.mode === 'halfpipe') return model.peakNormalG;
        if (model.mode === 'flat') return model.topSpeed;
        return getLandingPeakG(model);
      }
      var tracePeakLoadG = modelPeakValue(sim);
      var comparisonPeakLoadG = comparisonSim ? modelPeakValue(comparisonSim) : 0;
      var traceCurrentLoadG = traceValue(currentSample);
      var traceCurrentX = traceSvgX(displayPlayhead);
      var traceCurrentY = traceSvgY(traceCurrentLoadG);
      var tracePeakX = traceSvgX(tracePeakProgress);
      var tracePeakY = traceSvgY(tracePeakLoadG);
      var traceReentryPeakX = mode === 'halfpipe' ? traceSvgX(traceReentryPeakProgress) : 0;
      var traceReentryPeakY = mode === 'halfpipe'
        ? traceSvgY(finite(sim.reentryPeakNormalG, sim.peakNormalG))
        : 0;
      var traceReferenceY = traceSvgY(mode === 'flat' ? 0 : 1);
      var traceHeaderLabel = mode === 'halfpipe'
        ? __alloT('stem.skatelab.trace_halfpipe_label', 'Transition normal load (g)')
        : (mode === 'flat' ? __alloT('stem.skatelab.trace_flat_label', 'Speed (m/s)') : __alloT('stem.skatelab.trace_gap_label', 'Support load (g)'));
      var traceHeaderDetail;
      if (mode === 'halfpipe') {
        traceHeaderDetail = fillTemplate(__alloT('stem.skatelab.trace_halfpipe_detail', 'now {now} g · peak {peak} g'), {
          now: rounded(traceCurrentLoadG, 1),
          peak: rounded(sim.peakNormalG, 1)
        });
      } else if (mode === 'flat') {
        traceHeaderDetail = fillTemplate(__alloT('stem.skatelab.trace_flat_detail', 'now {now} m/s · top {top} m/s · slope −μg = −{decel} m/s²'), {
          now: rounded(traceCurrentLoadG, 2),
          top: rounded(sim.topSpeed, 2),
          decel: rounded(sim.coastDecel, 3)
        });
      } else {
        traceHeaderDetail = sim.hasLandingContact
          ? fillTemplate(__alloT('stem.skatelab.trace_gap_detail', 'now {now} g · peak {peak} g · avg {avg} g for {time} s'), {
            now: rounded(traceCurrentLoadG, 1),
            peak: rounded(getLandingPeakG(sim), 1),
            avg: rounded(sim.landingImpactG, 1),
            time: rounded(sim.landingStopTimeS, 2)
          }) +
            (isLandingContactPhase(currentSample.phase)
              ? ' · COM ↓ ' + rounded(currentSample.comCompressionM, 2) + ' m'
              : '')
          : fillTemplate(__alloT('stem.skatelab.trace_gap_no_contact', 'now {now} g · no supported landing contact'), {
            now: rounded(traceCurrentLoadG, 1)
          });
      }
      if (comparisonSim) {
        traceHeaderDetail += fillTemplate(__alloT('stem.skatelab.trace_vs_previous', ' · Δ {delta} vs previous'), {
          delta: mode === 'flat'
            ? signedDelta(tracePeakLoadG - comparisonPeakLoadG, 2, ' m/s')
            : signedDelta(tracePeakLoadG - comparisonPeakLoadG, 1, ' g')
        });
      }
      var traceNowSentence = fillTemplate(__alloT('stem.skatelab.trace_current_load', 'Current load at {time} seconds is {load} g.'), {
        time: rounded(currentSample.time, 2),
        load: rounded(traceCurrentLoadG, 1)
      });
      var traceSummary;
      if (mode === 'halfpipe') {
        traceSummary = fillTemplate(__alloT('stem.skatelab.trace_halfpipe_summary', 'Transition normal load trace over {duration} seconds: changing support through the drop-in and 0 g during flight. '), {
          duration: rounded(sim.motionDuration, 2)
        }) +
          (!sim.hasAir
            ? __alloT('stem.skatelab.trace_no_air', 'The rider never leaves the surface: the load peaks at each bottom crossing and fades as friction removes energy. ')
            : (sim.reentryModeled
              ? fillTemplate(__alloT('stem.skatelab.trace_reentry', 'After a tangent-matched wall re-entry the load peaks at {load} g before the return to the bottom. '), {
                load: rounded(sim.reentryPeakNormalG, 1)
              })
              : __alloT('stem.skatelab.trace_unsafe', 'The board reaches the wall outside the contact tolerance, so the model stops before assigning a support force or return path. '))) +
          traceNowSentence;
      } else if (mode === 'flat') {
        traceSummary = fillTemplate(__alloT('stem.skatelab.trace_flat_summary',
          'Speed trace over {duration} seconds: speed rises during the {push} s push, then falls in a straight line because friction is a constant force. Current speed at {time} seconds is {now} m/s.'), {
          duration: rounded(sim.motionDuration, 2),
          push: rounded(sim.pushTimeS, 1),
          time: rounded(currentSample.time, 2),
          now: rounded(traceCurrentLoadG, 2)
        });
      } else {
        traceSummary = fillTemplate(__alloT('stem.skatelab.trace_gap_summary', 'Support load trace over {duration} seconds: 1 g on approach and 0 g in free flight. '), {
          duration: rounded(sim.motionDuration, 2)
        }) +
          (sim.hasLandingContact
            ? fillTemplate(__alloT('stem.skatelab.trace_gap_pulse', 'Platform contact creates a smooth half-sine landing pulse with {avg} g average and {peak} g peak load over {time} seconds. The board stays at deck height while the rider COM compresses through {compression} meters; horizontal speed is held constant only during that contact window, and braking afterward is outside this model. '), {
              avg: rounded(sim.landingImpactG, 1),
              peak: rounded(getLandingPeakG(sim), 1),
              time: rounded(sim.landingStopTimeS, 2),
              compression: rounded(sim.landingCompressionM, 2)
            })
            : (sim.hasTerrainContact
              ? __alloT('stem.skatelab.trace_gap_face', 'The path hits the platform face without deck support; that impact response is not modeled. ')
              : __alloT('stem.skatelab.trace_gap_miss', 'The trajectory misses supported deck terrain, so there is no landing pulse or supported contact response. '))) +
          traceNowSentence +
          (isLandingContactPhase(currentSample.phase)
            ? fillTemplate(__alloT('stem.skatelab.trace_gap_compression', ' Current COM compression is {compression} meters, with {impulse} newton-seconds of net vertical impulse delivered.'), {
              compression: rounded(currentSample.comCompressionM, 2),
              impulse: Math.round(currentSample.landingNetImpulseDeliveredNs)
            })
            : '');
      }
      if (comparisonSim && mode !== 'flat') {
        traceSummary += fillTemplate(__alloT('stem.skatelab.trace_previous', ' The dashed lavender line is the previous run, with a peak load of {peak} g over {duration} seconds. The current peak-load difference is {delta}.'), {
          peak: rounded(comparisonPeakLoadG, 1),
          duration: rounded(comparisonSim.motionDuration, 2),
          delta: signedDelta(tracePeakLoadG - comparisonPeakLoadG, 1, ' g')
        });
      } else if (comparisonSim) {
        traceSummary += fillTemplate(__alloT('stem.skatelab.trace_flat_previous', ' The dashed lavender line is the previous run, with a top speed of {top} m/s.'), {
          top: rounded(comparisonPeakLoadG, 2)
        });
      }
      if (predictionLocked) {
        traceHeaderDetail = __alloT('stem.skatelab.trace_locked_detail', 'Run to reveal measured loads');
        traceSummary = fillTemplate(__alloT('stem.skatelab.trace_locked_summary', '{label} is hidden for the prediction challenge until this setup runs.'), {
          label: traceHeaderLabel
        });
      }

      var currentAirForceSummary = mode === 'gap' && sim.airDrag &&
        currentSample.airForceMagnitudeN > 0.01
        ? (Math.abs(currentSample.airForceZ) > 0.01
          ? fillTemplate(currentSample.airForceZ > 0
            ? __alloT('stem.skatelab.summary_air_force_right', ' At this phase F-air is {force} newtons, with a {side} newton lateral component toward the right.')
            : __alloT('stem.skatelab.summary_air_force_left', ' At this phase F-air is {force} newtons, with a {side} newton lateral component toward the left.'), {
            force: rounded(currentSample.airForceMagnitudeN, 1),
            side: rounded(Math.abs(currentSample.airForceZ), 1)
          })
          : fillTemplate(__alloT('stem.skatelab.summary_air_force', ' At this phase F-air is {force} newtons.'), {
            force: rounded(currentSample.airForceMagnitudeN, 1)
          }))
        : '';
      var forceScaleSentence = fillTemplate(__alloT('stem.skatelab.summary_force_scale',
        'Force arrows share one scale: the rose weight arrow (mg = {weight} N) always shows, and every other force is drawn in proportion to it.'), {
        weight: Math.round(sim.weightN)
      });
      var outcomeSentence = fillTemplate(__alloT('stem.skatelab.summary_outcome', ' Outcome: {outcome}.'), {
        outcome: outcomeMarkerStyle(sim).label.toLowerCase()
      });
      var rideWord = vehicleName(sim.vehicle && sim.vehicle.id).toLowerCase();
      var canvasSummary;
      if (mode === 'halfpipe') {
        canvasSummary = fillTemplate(__alloT('stem.skatelab.summary_halfpipe_intro', 'The {view} view shows a {ride} following the curved halfpipe transition through drop-in and flight. During supported motion, the board follows the local surface tangent. '), {
          view: viewMode.toUpperCase(),
          ride: rideWord
        }) +
          fillTemplate(__alloT('stem.skatelab.summary_halfpipe_start',
            'The rider starts at rest {drop} m up the wall (PE = {pe} J, KE = 0), pumps {pumps} times, and loses energy to rolling friction μ = {mu}. '), {
            drop: rounded(sim.dropHeightM, 1),
            pe: Math.round(sim.startPotentialJ),
            pumps: sim.pumps,
            mu: rounded(sim.rollingMu, 3)
          }) +
          (!sim.hasAir
            ? fillTemplate(__alloT('stem.skatelab.summary_no_air',
              'The rider never reaches the lip; each pass ends lower than the last until the rider {ending}. '), {
              ending: sim.endReason === 'time-limit'
                ? __alloT('stem.skatelab.result_still_rolling', 'was still rolling at the model time limit')
                : __alloT('stem.skatelab.result_rocked_stop', 'rocked to a stop')
            })
            : (sim.reentryModeled
              ? fillTemplate(__alloT('stem.skatelab.summary_reentry',
                'After the air the board lands {error} degrees from a half-turn, makes a tangent-matched wall re-entry, and the rider {stance} on the return to the bottom. '), {
                error: rounded(sim.contactAlignmentErrorDeg, 0),
                stance: landingStanceLabel(sim.landingStance)
              })
              : fillTemplate(__alloT('stem.skatelab.summary_unsafe', 'The board reaches the wall {error} degrees away from its tangent, so the simulation stops at first unsafe contact without inventing a return. '), {
                error: rounded(sim.contactAlignmentErrorDeg, 0)
              }))) +
          fillTemplate(__alloT('stem.skatelab.summary_halfpipe_numbers', 'A {body} body position changes rotational inertia in flight, while the rider compresses along the surface normal as support load rises. Current {depth}-meter ramp model: {air} feet above the lip, {bottom} g at the bottom, a {peak} g peak transition load, and {spin} degrees of rotation. '), {
            body: bodyPositionLabel(sim.bodyPosition.id).toLowerCase(),
            depth: rounded(sim.rampDepthM, 1),
            air: rounded(sim.hFt, 1),
            bottom: rounded(sim.bottomNormalG, 1),
            peak: rounded(sim.peakNormalG, 1),
            spin: Math.round(sim.completed)
          }) + forceScaleSentence + outcomeSentence;
      } else if (mode === 'flat') {
        canvasSummary = fillTemplate(__alloT('stem.skatelab.summary_flat',
          'The {view} view shows a {ride} on level ground. A {push} N push for {time} s gives a net force of {net} N and a top speed of {speed} mph. Then the only horizontal force is rolling friction, μ·m·g = {friction} N, so the rider slows steadily and stops after {distance} m. A dashed lavender ring shows where the rider would be with no friction (Newton’s first law).'), {
          view: viewMode.toUpperCase(),
          ride: rideWord,
          push: Math.round(sim.pushForceN),
          time: rounded(sim.pushTimeS, 1),
          net: rounded(sim.pushNetForceN, 1),
          speed: rounded(sim.topSpeedMph, 1),
          friction: rounded(sim.frictionN, 1),
          distance: rounded(sim.stopDistanceM, 2)
        }) + ' ' + forceScaleSentence + outcomeSentence;
      } else {
        canvasSummary = fillTemplate(sim.airDrag
          ? __alloT('stem.skatelab.summary_gap_intro_drag', 'The {view} view shows a {ride} following a drag-adjusted projectile arc beside an amber ideal no-drag reference across a {gap} foot gap. Current model range is {range} feet and lateral drift at deck height is {drift} feet. ')
          : __alloT('stem.skatelab.summary_gap_intro_ideal', 'The {view} view shows a {ride} following a no-drag projectile arc across a {gap} foot gap. Current model range is {range} feet and lateral drift at deck height is {drift} feet. '), {
          view: viewMode.toUpperCase(),
          ride: rideWord,
          gap: rounded(sim.gapFt, 0),
          range: rounded(sim.rangeFt, 1),
          drift: rounded(Math.abs(sim.crossDriftFt), 1)
        }) +
          (sim.airDrag
            ? fillTemplate(__alloT('stem.skatelab.summary_gap_air', 'The amber F-air arrow points opposite air-relative motion. Moving-air work is {wind}, air-relative dissipation is {loss} joules, and the resulting net aerodynamic energy change is {net}.'), {
              wind: signedDelta(sim.windWorkJ, 0, ' joules'),
              loss: Math.round(sim.aerodynamicDissipationJ),
              net: signedDelta(sim.aerodynamicNetWorkJ, 0, ' joules')
            }) + currentAirForceSummary + ' '
            : __alloT('stem.skatelab.summary_gap_ideal', 'Ideal air sets aerodynamic force, moving-air work, and air-relative dissipation to zero. ')) +
          (sim.hasLandingContact
            ? fillTemplate(__alloT('stem.skatelab.summary_gap_landing', 'The platform supports contact at {angle} degrees. The landing pulse reaches {peak} g peak with a {avg} g average over {time} seconds. Once support begins, the board follows the flat deck while a cyan COM marker moves downward through up to {compression} meters; green marks the moving board-support point. Current COM compression is {now} meters, with {speed} meters per second of downward speed remaining. During that contact pulse the rider travels {travel} feet along the deck plane; braking after the pulse is outside this model. '), {
              angle: rounded(sim.landingAngleDeg, 0),
              peak: rounded(getLandingPeakG(sim), 1),
              avg: rounded(sim.landingImpactG, 1),
              time: rounded(sim.landingStopTimeS, 2),
              compression: rounded(sim.landingCompressionM, 2),
              now: rounded(currentSample.comCompressionM, 2),
              speed: rounded(Math.abs(currentSample.comVerticalVelocityMps), 2),
              travel: rounded(sim.contactTravelM * M2FT, 1)
            })
            : (sim.hasTerrainContact
              ? __alloT('stem.skatelab.summary_gap_face', 'The path reaches the platform face below deck height. That unsupported impact is identified, but its force response is not modeled. ')
              : __alloT('stem.skatelab.summary_gap_miss', 'The path continues below deck height without supported contact or a landing pulse. '))) +
          forceScaleSentence + outcomeSentence;
      }

      var comparisonExplanation = !predictionLocked && comparisonSim
        ? describeSimulationChange(sim, comparisonSim, !!result)
        : '';
      var phaseInsight = predictionLocked
        ? __alloT('stem.skatelab.insight_locked', 'Run the model to unlock phase-by-phase evidence.')
        : phaseLearningText(sim, currentSample);

      if (predictionLocked) {
        canvasSummary = __alloT('stem.skatelab.summary_locked', 'Prediction challenge ready. The calculated trajectory and measured outcomes stay hidden until this setup runs.');
      }
      var localStatusText = localStatus &&
        localStatus.signature === currentSimulationSignature
        ? localStatus.text
        : '';
      var statusText = predictionLocked
        ? __alloT('stem.skatelab.status_locked', 'Prediction locked: run the model to reveal the measured outcome.')
        : (localStatusText || (result
          ? resultText(result)
          : fillTemplate(__alloT('stem.skatelab.status_predicted', 'Predicted result: {result}'), { result: resultText(sim) })));

      var accuracyCheck = sim.numericalCheck;
      var gapAccuracyText = mode === 'gap' && accuracyCheck
        ? fillTemplate(__alloT('stem.skatelab.gap_half_step',
          'Half-step check: halving the 1/180 s time step moves the range by {range} mm and the apex by {peak} mm. '), {
          range: rounded(accuracyCheck.rangeDeltaM * 1000, 2),
          peak: rounded(accuracyCheck.peakDeltaM * 1000, 2)
        })
        : '';
      var gapEnergyEquation = mode === 'gap'
        ? (sim.airDrag
          ? fillTemplate(__alloT('stem.skatelab.equation_gap_aero', 'Aerodynamic flight balance: E-motion+height = E-launch + W-moving-air − D-air-relative = {launch} J {wind} − {loss} J = {mech} J. Net aerodynamic change W-moving-air − D-air-relative = {net}; terminal deck-reference potential = {pe}. '), {
            launch: Math.round(sim.energyInputJ),
            wind: signedDelta(sim.windWorkJ, 0, ' J'),
            loss: Math.round(sim.aerodynamicDissipationJ),
            mech: Math.round(sim.flightMechanicalEnergyJ),
            net: signedDelta(sim.aerodynamicNetWorkJ, 0, ' J'),
            pe: signedDelta(sim.flightPotentialEnergyJ, 0, ' J')
          }) + gapAccuracyText
          : fillTemplate(__alloT('stem.skatelab.equation_gap_ideal_air', 'Ideal-air flight balance: moving-air work = 0 J and air-relative loss = 0 J, so E-motion+height = E-launch = {launch} J. '), {
            launch: Math.round(sim.energyInputJ)
          }) + gapAccuracyText)
        : '';
      var equation;
      if (mode === 'halfpipe') {
        var pumpExtensions = (sim.pumpEvents || []).filter(function(event) { return event.kind === 'extend'; });
        var meanPumpLoadG = pumpExtensions.length
          ? pumpExtensions.reduce(function(sum, event) { return sum + event.normalG; }, 0) / pumpExtensions.length
          : 0;
        equation = fillTemplate(__alloT('stem.skatelab.equation_halfpipe',
          'Start at rest: PE = m·g·h = {mass} kg × {g} m/s² × {drop} m = {pe} J, KE = 0. Rolling friction: f = μN with μ = {mu}; heat = Σ μ·N·Δs = {heat} J. Pumping: W = N·Δh with Δh = {stroke} m; {pumpCount} extensions at an average {pumpLoad} g give {work} J of rider work. Ledger: {pe} J + {work} J = KE {ke} J + PE {peEnd} J + heat {heat} J. '), {
          mass: rounded(sim.massKg, 0),
          g: rounded(sim.gravity, 2),
          drop: rounded(sim.dropHeightM, 2),
          pe: Math.round(sim.startPotentialJ),
          mu: rounded(sim.rollingMu, 3),
          heat: Math.round(sim.thermalJ),
          stroke: rounded(sim.pumpStrokeM, 2),
          pumpCount: pumpExtensions.length,
          pumpLoad: rounded(meanPumpLoadG, 2),
          work: Math.round(sim.riderWorkJ),
          ke: Math.round(sim.finalKineticJ),
          peEnd: Math.round(sim.finalPotentialJ)
        }) +
          (sim.hasAir
            ? fillTemplate(__alloT('stem.skatelab.equation_halfpipe_air',
              'Takeoff: v = {speed} m/s, so h = v²/(2g) = {height} m and t = 2v/g = {time} s; θ = ωt = {omega}°/s × {time} s = {spin}°. Tucking changes I and therefore ω. A multiple of 180° is a safe landing: an even number of half-turns lands fakie, an odd number lands forward. '), {
              speed: rounded(sim.exitSpeed, 2),
              height: rounded(sim.hAir, 2),
              time: rounded(sim.airTime, 2),
              omega: rounded(sim.airSpinRate, 0),
              spin: Math.round(sim.completed)
            })
            : __alloT('stem.skatelab.equation_halfpipe_no_air', 'No air: the rider never had enough energy to rise above the lip, so θ = ωt is not used. ')) +
          fillTemplate(__alloT('stem.skatelab.equation_halfpipe_load', 'N/(mg) = v²/(rg) + n-y = {bottom} at the first bottom crossing; peak transition load = {peak} g. '), {
            bottom: rounded(sim.bottomNormalG, 2),
            peak: rounded(sim.peakNormalG, 2)
          }) +
          (accuracyCheck
            ? fillTemplate(__alloT('stem.skatelab.equation_halfpipe_accuracy',
              'Accuracy: energy residual KE + PE + heat − (PE₀ + W) = {residual} J; halving the {step} s time step changes the air height by {air} mm and the run length by {duration} s.'), {
              residual: rounded(sim.energyClosureResidualJ, 6),
              step: rounded(accuracyCheck.stepS, 4),
              air: rounded(accuracyCheck.airHeightDeltaM * 1000, 3),
              duration: rounded(accuracyCheck.durationDeltaS, 3)
            })
            : '');
      } else if (mode === 'flat') {
        equation = fillTemplate(__alloT('stem.skatelab.equation_flat',
          'Push: ΣF = F-push − μmg = {push} N − {friction} N = {net} N, so a = ΣF/m = {accel} m/s² and v = a·t = {speed} m/s after {time} s. Coast: ΣF = −μmg, so a = −μg = −{decel} m/s² and d = v²/(2μg) = {coast} m. Work by rider = F·d-push = {work} J; heat = μ·m·g·d-total = {friction} N × {distance} m = {heat} J. While coasting, KE lost ½mv² = {ke} J equals μ·m·g·d-coast = {coastHeat} J.'), {
          push: Math.round(sim.pushForceN),
          friction: rounded(sim.frictionN, 2),
          net: rounded(sim.pushNetForceN, 2),
          accel: rounded(sim.pushAccel, 3),
          speed: rounded(sim.topSpeed, 3),
          time: rounded(sim.pushTimeS, 1),
          decel: rounded(sim.coastDecel, 4),
          coast: rounded(sim.coastDistanceM, 3),
          work: rounded(sim.riderWorkJ, 1),
          distance: rounded(sim.stopDistanceM, 3),
          heat: rounded(sim.thermalJ, 1),
          ke: rounded(sim.topKineticJ, 1),
          coastHeat: rounded(sim.coastFrictionWorkJ, 1)
        });
      } else {
        var landingEquationValues = {
          avg: rounded(sim.landingImpactG, 2),
          peak: rounded(getLandingPeakG(sim), 2),
          stop: rounded(sim.landingStopTimeS, 3),
          keRemoved: Math.round(sim.landingVerticalKineticRemovedJ),
          gravityWork: Math.round(sim.landingGravityWorkJ),
          support: Math.round(sim.landingSupportWorkAbsorbedJ),
          impulse: Math.round(sim.landingNetImpulseNs),
          avgForce: rounded(sim.landingAverageForceN / 1000, 2),
          peakForce: rounded(sim.landingPeakForceN / 1000, 2),
          compression: rounded(sim.landingCompressionM, 2),
          range: rounded(sim.rangeM, 2),
          ideal: rounded(sim.rangeIdealM, 2),
          time: rounded(sim.airTime, 2),
          apex: rounded(sim.peakM, 2)
        };
        equation = !sim.hasLandingContact
          ? (sim.hasTerrainContact
            ? gapEnergyEquation + __alloT('stem.skatelab.equation_gap_face', 'Projectile motion is integrated every 1/180 s to a platform-face impact below deck height. The event is recorded as unsupported terrain contact; face-impact force and post-impact motion are not calculated.')
            : gapEnergyEquation + __alloT('stem.skatelab.equation_gap_miss', 'Projectile motion is integrated every 1/180 s until the path reaches actual terrain or the declared fall boundary. This run did not reach a supported platform top, so landing force and compression are not calculated.'))
          : (sim.airDrag
            ? gapEnergyEquation + fillTemplate(__alloT('stem.skatelab.equation_gap_drag', 'Quadratic drag: a = -½ρ(CdA/m)|v-relative|v-relative, integrated every 1/180 s. Range = {range} m versus {ideal} m for the ideal no-drag reference. Half-sine landing pulse: average N/(mg) ≈ 1 + v-y²/(2gd-stop) = {avg} g; peak = 1 + (π/2)(average - 1) = {peak} g. Stopping time: Δt ≈ 2d-stop/|v-y| = {stop} s; vertical kinetic energy removed = ½m(v-y)² = {keRemoved} J; gravity adds mgd = {gravityWork} J during COM compression, so the support-work magnitude is {support} J; net vertical impulse: Δp-y = m|v-y| = {impulse} N·s; mean contact force = {avgForce} kN; peak contact force = {peakForce} kN for a {compression} m compression.'), landingEquationValues)
            : gapEnergyEquation + fillTemplate(__alloT('stem.skatelab.equation_gap_ideal', 'Ideal reference: t = 2v·sin(θ)/g = {time} s; R = v²sin(2θ)/g = {ideal} m; h-max = v-y²/(2g) = {apex} m. Half-sine landing pulse: average load = {avg} g; peak load = {peak} g. Stopping time: Δt ≈ 2d-stop/|v-y| = {stop} s; vertical kinetic energy removed = ½m(v-y)² = {keRemoved} J; gravity adds mgd = {gravityWork} J during COM compression, so the support-work magnitude is {support} J; net vertical impulse: Δp-y = m|v-y| = {impulse} N·s; mean contact force = {avgForce} kN; peak contact force = {peakForce} kN for a {compression} m compression.'), landingEquationValues));
      }
      if (predictionLocked) {
        equation = __alloT('stem.skatelab.equation_locked', 'Enter a prediction, then run this setup to reveal its calculated trajectory, energy values, and measured outcome.');
      }

      var surfaceOptions = [
        { id: 'wax', label: surfaceLabel('wax') },
        { id: 'standard', label: surfaceLabel('standard') },
        { id: 'rough', label: surfaceLabel('rough') }
      ];
      var surfaceNote = fillTemplate(__alloT('stem.skatelab.surface_mu_note', 'μ = {mu} rolling friction'), {
        mu: rounded(getSurface(d.surfaceId).rollingMu, 3)
      });
      var surfaceControl = h('div', { className: 'sk-control' },
        h('div', { className: 'sk-control-head' }, h('span', null, __alloT('stem.skatelab.control_surface', 'Surface')), h('output', null, surfaceNote)),
        radioGrid('Surface', d.surfaceId, surfaceOptions, chooseSurface, __alloT('stem.skatelab.control_surface', 'Surface'), 'surfaceId'),
        lockedNote('surfaceId')
      );
      var rotationOptionLabels = {
        0: __alloT('stem.skatelab.rotation_option_0', 'No spin (lands fakie)'),
        180: __alloT('stem.skatelab.rotation_option_180', '180° (lands forward)'),
        360: __alloT('stem.skatelab.rotation_option_360', '360° (lands fakie)'),
        540: __alloT('stem.skatelab.rotation_option_540', '540° (lands forward)'),
        720: __alloT('stem.skatelab.rotation_option_720', '720° (lands fakie)')
      };
      var dropHeightShown = Math.min(finite(d.dropHeightM, d.rampDepthM), finite(d.rampDepthM, 2.4));

      var controls;
      if (mode === 'halfpipe') {
        controls = h('div', { className: 'sk-control-group' },
          rangeControl('sk-drop-height', __alloT('stem.skatelab.control_drop_height', 'Drop-in height'),
            rounded(dropHeightShown, 1), HALFPIPE_MIN_DROP_M, d.rampDepthM, 0.1, ' m', function(event) {
              upd({ dropHeightM: Number(event.target.value) });
            }, __alloT('stem.skatelab.help_drop_height', 'The rider starts at rest this high up the left wall: all energy starts as PE = m·g·h.')),
          rangeControl('sk-pumps', __alloT('stem.skatelab.control_pumps', 'Pumps'), d.pumps, 0, 6, 1, '', function(event) {
            upd({ pumps: Number(event.target.value) });
          }, __alloT('stem.skatelab.help_pumps', 'Each pump is a leg extension against the support force: the rider does work W = N × 0.3 m. The spin happens on the first air after the last pump.')),
          h('div', { className: 'sk-control' },
            h('div', { className: 'sk-control-head' },
              h('span', null, __alloT('stem.skatelab.control_pump_timing', 'Pump timing')),
              h('output', null, pumpTimingLabel(d.pumpTimingId))
            ),
            radioGrid('Pump timing', getPumpTiming(d.pumpTimingId).id, [
              { id: 'bottom', label: pumpTimingLabel('bottom') },
              { id: 'wall', label: pumpTimingLabel('wall') },
              { id: 'lip', label: pumpTimingLabel('lip') }
            ], function(value) { upd({ pumpTimingId: value }); }, __alloT('stem.skatelab.control_pump_timing', 'Pump timing')),
            h('p', { className: 'sk-help' }, __alloT('stem.skatelab.help_pump_timing', 'The support force N is largest at the bottom, so extending there does the most work. Extending near the lip, where N is small, adds almost nothing.'))
          ),
          surfaceControl,
          h('div', { className: 'sk-control' },
            h('div', { className: 'sk-control-head' },
              h('label', { htmlFor: 'sk-rotation-target' }, __alloT('stem.skatelab.control_rotation_target', 'Rotation target')),
              h('output', { htmlFor: 'sk-rotation-target' }, d.rotationTarget + '°')),
            h('select', {
              id: 'sk-rotation-target',
              value: d.rotationTarget,
              disabled: running,
              onChange: function(event) { upd({ rotationTarget: Number(event.target.value) }); }
            },
              [0, 180, 360, 540, 720].map(function(value) {
                return h('option', { key: value, value: value }, rotationOptionLabels[value]);
              })
            ),
            h('p', { className: 'sk-help' }, __alloT('stem.skatelab.help_rotation', 'The spin is about the body’s long axis. On a vert wall a straight air comes back down tail first (fakie); each half-turn swaps that, so any multiple of 180° lands safely.'))
          ),
          rangeControl('sk-spin-rate', __alloT('stem.skatelab.control_spin_rate', 'Takeoff angular speed'), d.spinRate, 0, 700, 10, '°/s', function(event) {
            upd({ spinRate: Number(event.target.value) });
          }, __alloT('stem.skatelab.help_spin_rate', 'The body-position model changes this rate through rotational inertia.')),
          h('div', { className: 'sk-control' },
            h('div', { className: 'sk-control-head' },
              h('span', null, __alloT('stem.skatelab.control_body_position', 'Body position')),
              h('output', null, bodyPositionNote(getBodyPosition(d.bodyPositionId).id))
            ),
            radioGrid('Body position', d.bodyPositionId, ['open', 'neutral', 'tuck'].map(function(id) {
              return { id: id, label: bodyPositionLabel(id) };
            }), function(value) { upd({ bodyPositionId: value }); }, __alloT('stem.skatelab.control_body_position', 'Body position'))
          )
        );
      } else if (mode === 'flat') {
        controls = h('div', { className: 'sk-control-group' },
          rangeControl('sk-push-force', __alloT('stem.skatelab.control_push_force', 'Push force'), d.pushForceN, 20, 400, 10, ' N', function(event) {
            upd({ pushForceN: Number(event.target.value) });
          }, __alloT('stem.skatelab.help_push_force', 'The foot pushes the ground backward for 0.5 s; the ground pushes the rider forward with the same force (Newton’s third law).')),
          surfaceControl
        );
      } else {
        controls = h('div', { className: 'sk-control-group' },
          rangeControl('sk-speed', __alloT('stem.skatelab.control_speed', 'Takeoff speed'), d.speedMph, 8, 32, 1, ' mph', function(event) {
            upd({ speedMph: Number(event.target.value) });
          }, __alloT('stem.skatelab.help_speed', 'Range grows approximately with the square of speed.')),
          rangeControl('sk-angle', __alloT('stem.skatelab.control_angle', 'Ramp angle'), d.angleDeg, 10, 70, 1, '°', function(event) {
            upd({ angleDeg: Number(event.target.value) });
          }, __alloT('stem.skatelab.help_angle', 'On level ground without wind or drag, range peaks at 45°.')),
          rangeControl('sk-gap', __alloT('stem.skatelab.control_gap', 'Gap distance'), d.gapFt, 8, 30, 1, ' ft', function(event) {
            upd({ gapFt: Number(event.target.value) });
          }),
          h('div', { className: 'sk-control' },
            h('div', { className: 'sk-control-head' }, h('span', null, __alloT('stem.skatelab.control_wind', 'Wind')), h('output', null, windName(d.windId))),
            radioGrid('Wind', d.windId, ['head', 'calm', 'tail', 'cross_left', 'cross_right'].map(function(id) {
              return { id: id, label: windName(id) };
            }), function(value) { upd({ windId: value }); }, __alloT('stem.skatelab.control_wind', 'Wind'), 'windId'),
            h('p', { className: 'sk-help' }, d.airDrag === false
              ? __alloT('stem.skatelab.help_wind_ideal', 'Wind has no effect in the ideal no-drag model.')
              : __alloT('stem.skatelab.help_wind', 'Wind changes relative airspeed; crosswind also changes lateral landing position.')),
            lockedNote('windId')
          ),
          h('label', { className: 'sk-switch', htmlFor: 'sk-air-drag' },
            h('input', {
              id: 'sk-air-drag',
              type: 'checkbox',
              checked: d.airDrag !== false,
              disabled: running || isLocked('airDrag'),
              onChange: function(event) { upd({ airDrag: event.target.checked }); }
            }),
            h('span', null, __alloT('stem.skatelab.control_air_drag', 'Quadratic air drag')),
            h('output', null, d.airDrag === false
              ? __alloT('stem.skatelab.air_ideal', 'Ideal')
              : __alloT('stem.skatelab.air_realistic', 'Realistic'))
          ),
          lockedNote('airDrag')
        );
      }

      var gapAerodynamicNote = mode === 'gap'
        ? (sim.airDrag
          ? fillTemplate(__alloT('stem.skatelab.note_gap_aero', 'Aerodynamic energy: moving-air work {wind} · air-relative loss {loss} J · net aerodynamic change {net} · terminal motion + height {mech} J. '), {
            wind: signedDelta(sim.windWorkJ, 0, ' J'),
            loss: Math.round(sim.aerodynamicDissipationJ),
            net: signedDelta(sim.aerodynamicNetWorkJ, 0, ' J'),
            mech: Math.round(sim.flightMechanicalEnergyJ)
          }) + gapAccuracyText
          : __alloT('stem.skatelab.note_gap_ideal', 'Ideal air: moving-air work, air-relative loss, and net aerodynamic change are all 0 J. ') + gapAccuracyText)
        : '';
      var outcomeWords = outcomeMarkerStyle(sim).label.toLowerCase();
      var advancedModelNote;
      if (predictionLocked) {
        advancedModelNote = __alloT('stem.skatelab.note_locked', 'Calculated loads, energy transfers, trajectory differences, and contact forces are hidden until this setup runs.');
      } else if (mode === 'halfpipe') {
        advancedModelNote = fillTemplate(__alloT('stem.skatelab.note_halfpipe_loads', 'Transition loads: {bottom} g at the bottom · {peak} g peak at x = {x} m. Effective rotational inertia: {inertia} kg·m² · angular momentum: {L} kg·m²/s. '), {
          bottom: rounded(sim.bottomNormalG, 1),
          peak: rounded(sim.peakNormalG, 1),
          x: rounded(sim.peakLoadX, 1),
          inertia: rounded(sim.effectiveInertia, 1),
          L: rounded(sim.angularMomentum, 1)
        }) +
          fillTemplate(__alloT('stem.skatelab.note_halfpipe_model',
            'Numerical model: RK4 along the transition every {step} s, with friction μN and each turning point, bottom crossing, pump, and take-off found exactly.'), {
            step: rounded(sim.solverStepS, 4)
          });
      } else if (mode === 'flat') {
        advancedModelNote = fillTemplate(__alloT('stem.skatelab.note_flat_model',
          'Level ground: N = mg = {weight} N, so friction μN = {friction} N is constant. Mass {mass} kg; the push lasts {time} s.'), {
          weight: Math.round(sim.weightN),
          friction: rounded(sim.frictionN, 2),
          mass: Math.round(sim.massKg),
          time: rounded(sim.pushTimeS, 1)
        });
      } else if (!sim.hasLandingContact) {
        advancedModelNote = gapAerodynamicNote + fillTemplate(sim.hasTerrainContact
          ? __alloT('stem.skatelab.note_gap_face', 'The trajectory reaches the platform face without deck support. The event is recorded, but face-impact force and post-impact motion are not modeled. Outcome: {outcome}.')
          : __alloT('stem.skatelab.note_gap_no_contact', 'No supported platform contact occurred, so landing absorption, stopping time, contact force, and impulse are not calculated. Outcome: {outcome}.'), {
          outcome: outcomeWords
        });
      } else {
        advancedModelNote = gapAerodynamicNote + fillTemplate(__alloT('stem.skatelab.note_gap_landing',
          'Ideal range reference: {ideal} ft · modeled range delta: {delta} ft · landing absorption: {absorption} m of rider-COM travel while the board stays on the deck · stopping time: {stop} s · vertical kinetic energy removed: {keRemoved} J · gravity work during compression: {gravityWork} J · support-work magnitude: {support} J · net vertical impulse: {impulse} N·s · mean contact force: {avgForce} kN · peak contact force: {peakForce} kN · average / peak load: {avgG} / {peakG} g · deck-plane contact travel: {travel} ft. Tangential braking after the contact pulse is not modeled.'), {
          ideal: rounded(sim.rangeIdealM * M2FT, 1),
          delta: (sim.rangeDeltaFt >= 0 ? '+' : '') + rounded(sim.rangeDeltaFt, 1),
          absorption: rounded(sim.landingCompressionM, 2),
          stop: rounded(sim.landingStopTimeS, 3),
          keRemoved: Math.round(sim.landingVerticalKineticRemovedJ),
          gravityWork: Math.round(sim.landingGravityWorkJ),
          support: Math.round(sim.landingSupportWorkAbsorbedJ),
          impulse: Math.round(sim.landingNetImpulseNs),
          avgForce: rounded(sim.landingAverageForceN / 1000, 2),
          peakForce: rounded(sim.landingPeakForceN / 1000, 2),
          avgG: rounded(sim.landingImpactG, 1),
          peakG: rounded(getLandingPeakG(sim), 1),
          travel: rounded(sim.contactTravelM * M2FT, 1)
        });
      }

      var advancedControls = h('details', { className: 'sk-advanced' },
        h('summary', null, __alloT('stem.skatelab.advanced_physics', 'Advanced physics')),
        h('div', { className: 'sk-advanced-body' },
          rangeControl('sk-rider-mass', __alloT('stem.skatelab.control_rider_mass', 'Rider mass'), d.riderMassKg, 35, 110, 1, ' kg', function(event) {
            upd({ riderMassKg: Number(event.target.value) });
          }, mode === 'halfpipe'
            ? __alloT('stem.skatelab.help_mass_halfpipe', 'Mass changes the joules in the ledger, while ideal height still follows speed and gravity.')
            : (mode === 'flat'
              ? __alloT('stem.skatelab.help_mass_flat', 'A heavier rider gets less speed from the same push, and friction μ·m·g grows with mass too.')
              : __alloT('stem.skatelab.help_mass_gap', 'With drag enabled, a larger mass has more inertia relative to the same frontal area.')), 'riderMassKg'),
          mode === 'halfpipe'
            ? rangeControl('sk-ramp-depth', __alloT('stem.skatelab.control_ramp_depth', 'Ramp depth'), d.rampDepthM, 1.2, 4.5, 0.1, ' m', function(event) {
                upd({ rampDepthM: Number(event.target.value) });
              }, __alloT('stem.skatelab.help_ramp_depth', 'A deeper transition gives more speed at the bottom and a gentler curve. The drop-in height cannot be higher than the ramp.'))
            : (mode === 'gap'
              ? rangeControl('sk-landing-compression', __alloT('stem.skatelab.control_landing_absorption', 'Landing absorption'), d.landingCompressionM, 0.1, 0.9, 0.05, ' m', function(event) {
                  upd({ landingCompressionM: Number(event.target.value) });
                }, __alloT('stem.skatelab.help_landing_absorption', 'More stopping distance lengthens the force pulse and lowers both average and peak contact load.'))
              : null),
          h('p', { className: 'sk-model-note' }, advancedModelNote)
        )
      );

      var ledgerPanel;
      if (mode === 'gap') {
        ledgerPanel = [
          h('div', {
            key: 'row',
            className: 'sk-ledger-row',
            role: 'img',
            'aria-label': predictionLocked
              ? __alloT('stem.skatelab.ledger_locked', 'Energy ledger values are hidden until this setup runs')
              : fillTemplate(__alloT('stem.skatelab.ledger_gap_aria', 'Gap flight energy balance: {launch} joules at launch plus {wind} of moving-air work equals {mech} joules of motion plus height and {loss} joules of air-relative dissipation.'), {
                launch: Math.round(sim.energyInputJ),
                wind: signedDelta(sim.windWorkJ, 0, ' joules'),
                mech: Math.round(sim.flightMechanicalEnergyJ),
                loss: Math.round(sim.aerodynamicDissipationJ)
              })
          },
            h('div', { className: 'sk-ledger-mechanical', style: { width: (predictionLocked ? 0 : mechanicalPct) + '%' } }),
            h('div', { className: 'sk-ledger-thermal', style: { width: (predictionLocked ? 0 : thermalPct) + '%' } }),
            h('div', {
              className: 'sk-ledger-wind',
              style: { width: (predictionLocked ? 0 : windEnergyOutPct) + '%' }
            })
          ),
          h('div', { key: 'labels', className: 'sk-ledger-labels' },
            h('span', { key: 'launch' }, predictionLocked ? __alloT('stem.skatelab.ledger_launch_locked', '— launch') : fillTemplate(__alloT('stem.skatelab.ledger_launch', '{value} J launch'), { value: Math.round(sim.energyInputJ) })),
            h('span', { key: 'wind' }, predictionLocked ? __alloT('stem.skatelab.ledger_wind_locked', '— wind work') : fillTemplate(__alloT('stem.skatelab.ledger_wind', '{value} moving-air work'), { value: signedDelta(sim.windWorkJ, 0, ' J') })),
            h('span', { key: 'air-loss' }, predictionLocked ? __alloT('stem.skatelab.ledger_air_loss_locked', '— air-relative loss') : fillTemplate(__alloT('stem.skatelab.ledger_air_loss', '{value} J air-relative loss'), { value: Math.round(sim.aerodynamicDissipationJ) })),
            h('span', { key: 'flight-mechanical' }, predictionLocked ? __alloT('stem.skatelab.ledger_motion_locked', '— motion + height') : fillTemplate(__alloT('stem.skatelab.ledger_motion', '{value} J signed motion + height'), { value: Math.round(sim.flightMechanicalEnergyJ) }))
          )
        ];
      } else {
        var ledgerItems = mode === 'halfpipe' ? [
          { label: __alloT('stem.skatelab.ledger_start_pe', 'Start: height energy PE = m·g·h (KE = 0)'), value: Math.round(sim.startPotentialJ) + ' J' },
          { label: __alloT('stem.skatelab.ledger_rider_work', '+ Work by the rider’s muscles (pumping)'), value: signedDelta(sim.riderWorkJ, 0, ' J') },
          { label: __alloT('stem.skatelab.ledger_heat', '− Heat from rolling friction (μN over the path)'), value: Math.round(sim.thermalJ) + ' J' },
          { label: __alloT('stem.skatelab.ledger_end_mechanical', '= End: kinetic + height energy'), value: Math.round(sim.finalKineticJ) + ' + ' + Math.round(sim.finalPotentialJ) + ' J' }
        ] : [
          { label: __alloT('stem.skatelab.ledger_push_work', '+ Work by the rider’s muscles (push)'), value: Math.round(sim.riderWorkJ) + ' J' },
          { label: __alloT('stem.skatelab.ledger_top_ke', 'Kinetic energy when the push ends'), value: Math.round(sim.topKineticJ) + ' J' },
          { label: __alloT('stem.skatelab.ledger_flat_heat', '− Heat from friction μ·m·g·d'), value: Math.round(sim.thermalJ) + ' J' },
          { label: __alloT('stem.skatelab.ledger_flat_end', '= End: kinetic energy (stopped)'), value: '0 J' }
        ];
        ledgerPanel = [
          h('div', {
            key: 'row',
            className: 'sk-ledger-row',
            role: 'img',
            'aria-label': predictionLocked
              ? __alloT('stem.skatelab.ledger_locked', 'Energy ledger values are hidden until this setup runs')
              : fillTemplate(__alloT('stem.skatelab.ledger_aria',
                '{input} joules supplied ({start} from the starting height and {work} from the rider): {mech} percent ended as mechanical energy and {heat} percent as thermal transfer.'), {
                input: Math.round(sim.energyInputJ),
                start: Math.round(finite(sim.startPotentialJ, 0)),
                work: Math.round(sim.riderWorkJ),
                mech: rounded(mechanicalPct, 0),
                heat: rounded(thermalPct, 0)
              })
          },
            h('div', { className: 'sk-ledger-mechanical', style: { width: (predictionLocked ? 0 : mechanicalPct) + '%' } }),
            h('div', { className: 'sk-ledger-thermal', style: { width: (predictionLocked ? 0 : thermalPct) + '%' } })
          ),
          h('div', { key: 'labels', className: 'sk-ledger-labels' },
            h('span', { key: 'mechanical' }, predictionLocked ? __alloT('stem.skatelab.ledger_mechanical_locked', '— mechanical') : fillTemplate(__alloT('stem.skatelab.ledger_label_mechanical', '{value} J mechanical'), { value: Math.round(sim.mechanicalJ) })),
            h('span', { key: 'thermal' }, predictionLocked ? __alloT('stem.skatelab.ledger_thermal_locked', '— thermal') : fillTemplate(__alloT('stem.skatelab.ledger_label_thermal', '{value} J thermal'), { value: Math.round(sim.thermalJ) })),
            h('span', { key: 'input' }, predictionLocked ? __alloT('stem.skatelab.ledger_input_locked', '— input') : fillTemplate(__alloT('stem.skatelab.ledger_label_input', '{value} J input'), { value: Math.round(sim.energyInputJ) }))
          ),
          !predictionLocked && h('ul', { key: 'list', className: 'sk-energy-list' },
            ledgerItems.map(function(item, index) {
              return h('li', { key: 'item-' + index }, item.label + ': ', h('strong', null, item.value));
            })
          ),
          !predictionLocked && mode === 'halfpipe' && (sim.passPeaks || []).length > 0 && h('p', { key: 'peaks', className: 'sk-pass-peaks' },
            __alloT('stem.skatelab.ledger_pass_peaks', 'Highest point of each pass (m): ') +
            sim.passPeaks.slice(0, 12).map(function(peak) { return rounded(peak.heightM, 2) + (peak.air ? '*' : ''); }).join(', ') +
            (sim.passPeaks.length > 12 ? ' …' : '') + ' ' +
            __alloT('stem.skatelab.ledger_pass_peaks_key', '(* = air above the lip)'))
        ];
      }

      var playbackLabel = fillTemplate(__alloT('stem.skatelab.playback_scale', '{speed}× · 1 s of motion takes {seconds} s'), {
        speed: playbackSpeed,
        seconds: rounded(1 / playbackSpeed, 2)
      });

      var telemetryAria;
      var telemetryLead = fillTemplate(__alloT('stem.skatelab.telemetry_lead', 'Live motion telemetry: {phase}, {time} seconds, {speed} miles per hour, '), {
        phase: phaseLabel(currentSample.phase),
        time: rounded(currentSample.time, 2),
        speed: rounded(currentSample.speedMps * MPS2MPH, 1)
      });
      if (predictionLocked) {
        telemetryAria = __alloT('stem.skatelab.telemetry_locked', 'Prediction challenge ready. Live motion telemetry is hidden until this setup runs.');
      } else if (mode === 'flat') {
        telemetryAria = telemetryLead +
          fillTemplate(__alloT('stem.skatelab.telemetry_flat',
            '{distance} meters travelled, net force {net} newtons, kinetic energy lost while coasting {lost} joules, friction work μ·m·g·d {heat} joules'), {
            distance: rounded(currentSample.x, 2),
            net: rounded(currentSample.netForceN, 1),
            lost: Math.round(currentSample.coastKineticLostJ),
            heat: Math.round(currentSample.coastFrictionWorkSoFarJ)
          });
      } else if (mode === 'halfpipe') {
        telemetryAria = telemetryLead +
          fillTemplate(currentSample.normalG > 0.05
            ? __alloT('stem.skatelab.telemetry_halfpipe', '{load} g normal load, {spin} degrees of trick rotation, {error} degrees from the local surface tangent')
            : __alloT('stem.skatelab.telemetry_halfpipe_air', '{load} g normal load, {spin} degrees of trick rotation, airborne'), {
            load: rounded(currentSample.normalG, 1),
            spin: Math.round(currentSample.trickRotation),
            error: rounded(currentSample.alignmentErrorDeg, 1)
          });
      } else {
        telemetryAria = telemetryLead +
          (isLandingContactPhase(currentSample.phase)
            ? fillTemplate(__alloT('stem.skatelab.telemetry_gap_landing', 'board supported at deck height, {now} of {total} meters of rider center-of-mass compression, {speed} meters per second of downward center-of-mass speed remaining, {load} g support load, and {impulse} newton-seconds of net vertical impulse delivered'), {
              now: rounded(currentSample.comCompressionM, 2),
              total: rounded(sim.landingCompressionM, 2),
              speed: rounded(Math.abs(currentSample.comVerticalVelocityMps), 2),
              load: rounded(currentSample.normalG, 1),
              impulse: Math.round(currentSample.landingNetImpulseDeliveredNs)
            })
            : fillTemplate(sim.airDrag
              ? __alloT('stem.skatelab.telemetry_gap_air', '{drift} feet lateral drift, {net} net aerodynamic change from {wind} of moving-air work and {loss} joules of air-relative dissipation')
              : __alloT('stem.skatelab.telemetry_gap_ideal', '{drift} feet lateral drift, ideal air with zero aerodynamic energy transfer'), {
              drift: rounded(Math.abs(currentSample.z) * M2FT, 1),
              net: signedDelta(currentSample.aerodynamicNetWorkJ, 0, ' joules'),
              wind: signedDelta(currentSample.windWorkJ, 0, ' joules'),
              loss: Math.round(currentSample.aerodynamicDissipationJ)
            }));
      }

      var telemetryDetail;
      var telemetryLast;
      if (mode === 'halfpipe') {
        telemetryDetail = fillTemplate(__alloT('stem.skatelab.telemetry_trick', '{spin}° trick'), { spin: Math.round(currentSample.trickRotation) });
        telemetryLast = currentSample.normalG > 0.05
          ? fillTemplate(__alloT('stem.skatelab.telemetry_load', '{load} g load'), { load: rounded(currentSample.normalG, 1) })
          : __alloT('stem.skatelab.telemetry_airborne', 'airborne');
      } else if (mode === 'flat') {
        telemetryDetail = rounded(currentSample.x, 2) + ' m';
        telemetryLast = currentSample.phase === 'coasting'
          ? fillTemplate(__alloT('stem.skatelab.telemetry_flat_check', 'ΔKE {lost} J = μmgd {heat} J'), {
            lost: Math.round(currentSample.coastKineticLostJ),
            heat: Math.round(currentSample.coastFrictionWorkSoFarJ)
          })
          : fillTemplate(__alloT('stem.skatelab.telemetry_flat_net', 'ΣF {net} N'), { net: rounded(currentSample.netForceN, 1) });
      } else {
        telemetryDetail = isLandingContactPhase(currentSample.phase)
          ? rounded(Math.abs(currentSample.comVerticalVelocityMps), 2) + ' m/s ↓ COM'
          : fillTemplate(__alloT('stem.skatelab.telemetry_high', '{height} ft high'), { height: rounded(Math.max(0, currentSample.y) * M2FT, 1) });
        telemetryLast = isLandingContactPhase(currentSample.phase)
          ? 'COM ↓ ' + rounded(currentSample.comCompressionM, 2) + ' m · ' +
            rounded(currentSample.normalG, 1) + ' g'
          : (sim.airDrag && currentSample.flightTime > 0
            ? fillTemplate(__alloT('stem.skatelab.telemetry_net_air', 'net air {net}'), { net: signedDelta(currentSample.aerodynamicNetWorkJ, 0, ' J') })
            : fillTemplate(__alloT('stem.skatelab.telemetry_drift', '{drift} ft drift'), { drift: rounded(Math.abs(currentSample.z) * M2FT, 1) }));
      }

      var legendText;
      if (mode === 'gap') {
        legendText = __alloT('stem.skatelab.legend_gap', ' · cyan = modeled motion or rider COM · rose = gravity or transition-load peaks · green = board support or landing lane · amber = ideal no-drag reference or F-air vector');
      } else if (mode === 'flat') {
        legendText = __alloT('stem.skatelab.legend_flat',
          ' · forces to one scale: rose = weight mg · green = normal N · cyan = push from the ground · amber = friction f · lavender = foot on ground and no-friction reference');
      } else {
        legendText = __alloT('stem.skatelab.legend_halfpipe',
          ' · cyan = motion · forces to one scale: rose = weight mg · green = normal N · amber = friction f · dots = highest point of each pass');
      }

      var canvasLabel = fillTemplate(mode === 'halfpipe'
        ? __alloT('stem.skatelab.canvas_label_halfpipe', 'Halfpipe physics simulation in {view} view')
        : (mode === 'flat'
          ? __alloT('stem.skatelab.canvas_label_flat', 'Flat-ground push and coast simulation in {view} view')
          : __alloT('stem.skatelab.canvas_label_gap', 'Gap-jump projectile simulation in {view} view')), { view: viewMode.toUpperCase() });

      var runLabel = mode === 'halfpipe'
        ? __alloT('stem.skatelab.run_halfpipe', 'Drop In!')
        : (mode === 'flat' ? __alloT('stem.skatelab.run_flat', 'Push Off!') : __alloT('stem.skatelab.run_gap', 'Launch Jump'));
      var estimateLabel = mode === 'halfpipe'
        ? __alloT('stem.skatelab.estimate_halfpipe', 'Estimate air height (ft)')
        : (mode === 'flat' ? __alloT('stem.skatelab.estimate_flat', 'Estimate stopping distance (ft)') : __alloT('stem.skatelab.estimate_gap', 'Estimate range (ft)'));

      var nextQuestion;
      var nextDetail;
      if (mode === 'halfpipe') {
        nextQuestion = __alloT('stem.skatelab.question_halfpipe',
          'Start with no pumps and watch each pass end lower. Then add pumps and change the pump timing: where does extending your legs add the most energy? Try the Moon: does the same drop give higher air? Finally hold the launch setup constant and vary ramp depth, or compare body positions for the same spin.');
        nextDetail = !sim.hasAir
          ? __alloT('stem.skatelab.question_no_air', 'The rider did not reach the lip. Try more pumps, pumping at the bottom, or a higher drop-in.')
          : fillTemplate(__alloT('stem.skatelab.question_halfpipe_detail', 'Trick error is {trick}°, contact alignment error is {contact}°, and effective inertia is {inertia} kg·m².'), {
            trick: rounded(sim.rotationError, 0),
            contact: rounded(sim.contactAlignmentErrorDeg, 0),
            inertia: rounded(sim.effectiveInertia, 1)
          });
      } else if (mode === 'flat') {
        nextQuestion = __alloT('stem.skatelab.question_flat',
          'Keep the push the same and try each surface: how does the stopping distance change with μ? Then double the push force: does the stopping distance double? Check that the kinetic energy lost always equals μ·m·g·d.');
        nextDetail = fillTemplate(__alloT('stem.skatelab.question_flat_detail',
          'Friction force is {friction} N, deceleration is {decel} m/s², and the rider coasts {coast} m after the push.'), {
          friction: rounded(sim.frictionN, 1),
          decel: rounded(sim.coastDecel, 3),
          coast: rounded(sim.coastDistanceM, 2)
        });
      } else {
        nextQuestion = __alloT('stem.skatelab.question_gap', 'Compare the cyan modeled path with the amber ideal path, then add a crosswind. Finally, hold the trajectory setup constant and change landing absorption. Which input changes range, load, or lateral drift?');
        nextDetail = sim.hasLandingContact
          ? fillTemplate(__alloT('stem.skatelab.question_gap_detail', 'The landing zone is {zone} ft long; modeled drift is {drift} ft; estimated landing load is {avg} g average and {peak} g peak.'), {
            zone: rounded(sim.landingZoneM * M2FT, 1),
            drift: rounded(Math.abs(sim.crossDriftFt), 1),
            avg: rounded(sim.landingImpactG, 1),
            peak: rounded(getLandingPeakG(sim), 1)
          })
          : fillTemplate(__alloT('stem.skatelab.question_gap_miss', 'The trajectory reaches {range} ft at deck height, then continues without a supported landing contact.'), {
            range: rounded(sim.rangeFt, 1)
          });
      }
      var hypothesisLabel = mode === 'halfpipe'
        ? __alloT('stem.skatelab.hypothesis_halfpipe', 'Your hypothesis: will ramp depth change air height, transition load, or both? Will the ideal drop-in and re-entry repeat the same peak load? How will tucking change rotation?')
        : (mode === 'flat'
          ? __alloT('stem.skatelab.hypothesis_flat', 'Your hypothesis: how will surface friction and push force change the stopping distance?')
          : __alloT('stem.skatelab.hypothesis_gap', 'Your hypothesis: which forces change range or landing position, and how will absorption distance change landing load and stopping time?'));

      // ---------- Stage B panels: P2 linked graphs, P3 inquiry ----------

      var CHART_W = 320;
      var CHART_L = 46;
      var CHART_R = 312;
      var CHART_T = 8;
      var CHART_B = 104;
      var CHART_H = 126;

      function formatNumber(value, digits) {
        if (value == null || !Number.isFinite(Number(value))) return '—';
        return rounded(value, digits == null ? 2 : digits).replace('-', '−');
      }

      function tickValues(min, max, target) {
        var span = Math.max(0.000001, max - min);
        var step = niceTickStep(span, target);
        var values = [];
        for (var value = Math.ceil(min / step) * step; value <= max + step * 0.001; value += step) {
          values.push(Math.abs(value) < step * 0.000001 ? 0 : value);
          if (values.length > 12) break;
        }
        return { step: step, values: values };
      }

      function tickLabel(value, step) {
        var digits = step >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log(step) / Math.LN10));
        return formatNumber(value, digits);
      }

      // Path through time-ordered { t, v } points, keeping each pixel column's
      // first, lowest, highest and last values so long runs stay faithful.
      function chartPath(points, xOf, yOf) {
        var parts = [];
        var bucket = null;
        var penDown = false;
        function flush() {
          if (!bucket) return;
          var ordered = [bucket.first];
          var extremes = bucket.minIndex <= bucket.maxIndex ? [bucket.min, bucket.max] : [bucket.max, bucket.min];
          extremes.concat([bucket.last]).forEach(function(point) {
            if (ordered[ordered.length - 1] !== point) ordered.push(point);
          });
          ordered.forEach(function(point) {
            parts.push((penDown ? 'L ' : 'M ') + rounded(xOf(point.t), 2) + ' ' + rounded(yOf(point.v), 2));
            penDown = true;
          });
          bucket = null;
        }
        points.forEach(function(point, index) {
          if (point.v == null || !Number.isFinite(point.v)) {
            flush();
            penDown = false;
            return;
          }
          var column = Math.floor(xOf(point.t));
          if (bucket && bucket.column !== column) flush();
          if (!bucket) {
            bucket = { column: column, first: point, last: point, min: point, max: point, minIndex: index, maxIndex: index };
          } else {
            bucket.last = point;
            if (point.v < bucket.min.v) { bucket.min = point; bucket.minIndex = index; }
            if (point.v > bucket.max.v) { bucket.max = point; bucket.maxIndex = index; }
          }
        });
        flush();
        return parts.join(' ');
      }

      function seriesRange(lists, includeZero) {
        var low = includeZero ? 0 : Infinity;
        var high = includeZero ? 0 : -Infinity;
        lists.forEach(function(points) {
          points.forEach(function(point) {
            if (point.v == null || !Number.isFinite(point.v)) return;
            if (point.v < low) low = point.v;
            if (point.v > high) high = point.v;
          });
        });
        if (!Number.isFinite(low) || !Number.isFinite(high)) { low = 0; high = 1; }
        if (high - low < 0.000001) { high = low + 1; }
        var pad = (high - low) * 0.06;
        return { min: low < 0 ? low - pad : low, max: high + pad };
      }

      // { t, v } points for one field, built once per cached model series so
      // playback re-renders do not rebuild thousands of objects.
      function fieldPoints(series, field) {
        series.fieldCache = series.fieldCache || {};
        if (!series.fieldCache[field]) {
          series.fieldCache[field] = series.points.map(function(point) { return { t: point.t, v: point[field] }; });
        }
        return series.fieldCache[field];
      }
      function cachedRange(points) {
        if (!points.range) points.range = seriesRange([points], true);
        return points.range;
      }

      // One time chart: series [{ id, cls, points: [{t, v}], dashed }], a
      // cursor at cursorT with dots at cursorValues [{ cls, v }].
      function timeChart(key, series, tMax, cursorT, cursorValues, unitLabel) {
        var range = { min: 0, max: 1 };
        series.forEach(function(item, index) {
          var own = cachedRange(item.points);
          range = index === 0 ? { min: own.min, max: own.max } : { min: Math.min(range.min, own.min), max: Math.max(range.max, own.max) };
        });
        function xOf(t) { return CHART_L + clamp(t / Math.max(0.000001, tMax), 0, 1) * (CHART_R - CHART_L); }
        function yOf(v) { return CHART_B - (v - range.min) / (range.max - range.min) * (CHART_B - CHART_T); }
        var xTicks = tickValues(0, tMax, 5);
        var yTicks = tickValues(range.min, range.max, 3);
        var cursorX = xOf(cursorT);
        return h('svg', {
          key: key,
          className: 'sk-chart',
          viewBox: '0 0 ' + CHART_W + ' ' + CHART_H,
          'aria-hidden': 'true',
          focusable: 'false'
        },
          yTicks.values.map(function(value, index) {
            return h('g', { key: 'y' + index },
              h('line', { className: value === 0 ? 'sk-chart-zero' : 'sk-chart-grid', x1: CHART_L, x2: CHART_R, y1: rounded(yOf(value), 2), y2: rounded(yOf(value), 2) }),
              h('text', { className: 'sk-chart-tick', x: CHART_L - 4, y: rounded(yOf(value) + 4, 2), textAnchor: 'end' }, tickLabel(value, yTicks.step))
            );
          }),
          xTicks.values.map(function(value, index) {
            return h('text', { key: 'x' + index, className: 'sk-chart-tick', x: rounded(xOf(value), 2), y: CHART_B + 14, textAnchor: 'middle' }, tickLabel(value, xTicks.step));
          }),
          h('text', { className: 'sk-chart-tick', x: CHART_R, y: CHART_H - 2, textAnchor: 'end' }, __alloT('stem.skatelab.chart_time_axis', 'time (s)')),
          h('text', { className: 'sk-chart-tick', x: 2, y: 10, textAnchor: 'start' }, unitLabel),
          h('line', { className: 'sk-chart-axis', x1: CHART_L, x2: CHART_L, y1: CHART_T, y2: CHART_B }),
          series.map(function(item) {
            var pathKey = [tMax, range.min, range.max].join('|');
            item.points.pathCache = item.points.pathCache || {};
            if (item.points.pathCache[pathKey] == null) item.points.pathCache[pathKey] = chartPath(item.points, xOf, yOf);
            var pathData = item.points.pathCache[pathKey];
            return pathData ? h('path', { key: item.id, className: 'sk-chart-line ' + item.cls + (item.dashed ? ' is-dashed' : ''), d: pathData }) : null;
          }),
          h('line', { className: 'sk-chart-cursor', x1: rounded(cursorX, 2), x2: rounded(cursorX, 2), y1: CHART_T, y2: CHART_B }),
          (cursorValues || []).map(function(item, index) {
            if (item.v == null || !Number.isFinite(item.v)) return null;
            return h('circle', { key: 'dot' + index, className: 'sk-chart-dot ' + item.cls, cx: rounded(cursorX, 2), cy: rounded(yOf(item.v), 2), r: 3.5 });
          })
        );
      }

      function chartKeyDown(event) {
        if (running || predictionLocked) return;
        var step = 0.01;
        var next = null;
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = displayPlayhead + step;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = displayPlayhead - step;
        else if (event.key === 'PageUp') next = displayPlayhead + 0.1;
        else if (event.key === 'PageDown') next = displayPlayhead - 0.1;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = 1;
        if (next === null) return;
        event.preventDefault();
        inspectPlayhead(clamp(Math.round(next * 1000) / 1000, 0, 1), true);
      }

      function chartClick(event, tMax) {
        if (running || predictionLocked) return;
        var svg = event.target && event.target.closest ? event.target.closest('svg') : null;
        var box = svg && svg.getBoundingClientRect ? svg.getBoundingClientRect() : null;
        if (!box || !(box.width > 0)) return;
        var units = (event.clientX - box.left) / box.width * CHART_W;
        var t = (units - CHART_L) / (CHART_R - CHART_L) * tMax;
        inspectPlayhead(clamp(t / Math.max(0.000001, sim.motionDuration), 0, 1), true);
      }

      function scrubProps(label, valueText, tMax) {
        return {
          className: 'sk-chart-scrub',
          role: 'slider',
          tabIndex: running ? -1 : 0,
          'aria-label': label,
          'aria-valuemin': 0,
          'aria-valuemax': 100,
          'aria-valuenow': Math.round(displayPlayhead * 100),
          'aria-valuetext': valueText,
          'aria-disabled': running ? 'true' : undefined,
          onKeyDown: chartKeyDown,
          onClick: function(event) { chartClick(event, tMax); }
        };
      }

      // A table that may scroll sideways at 320 px must be reachable by keyboard.
      function scrollRegionProps(label) {
        return { className: 'sk-table-wrap', tabIndex: 0, role: 'region', 'aria-label': label };
      }

      var lockedPanelText = __alloT('stem.skatelab.panel_locked', 'Hidden until this setup runs: make your prediction, then run it.');
      var modelSeries = predictionLocked ? null : modelTimeSeries(sim);
      var comparisonSeries = !predictionLocked && comparisonSim ? modelTimeSeries(comparisonSim) : null;
      var chartTMax = Math.max(sim.motionDuration, comparisonSeries ? comparisonSim.motionDuration : 0);
      var cursorT = currentSample.time;
      var timeAxisNote = fillTemplate(__alloT('stem.skatelab.chart_time_note', 'Time axis in model seconds. Playback runs at {speed}×. Use the arrow keys on a graph to move the time cursor.'), {
        speed: playbackSpeed
      });

      // Times for the "Show the numbers" tables: each phase event plus ten even steps.
      var numberTimes = (function() {
        var list = phaseEvents.map(function(event) { return clamp(event.progress, 0, 1); });
        for (var step = 0; step <= 10; step++) list.push(step / 10);
        list.push(displayPlayhead);
        list.sort(function(a, b) { return a - b; });
        var unique = [];
        list.forEach(function(value) {
          if (!unique.length || value - unique[unique.length - 1] > 0.002) unique.push(value);
          else if (Math.abs(value - displayPlayhead) < 0.0000001) unique[unique.length - 1] = value;
        });
        return unique;
      })();

      // ---- P2-1 energy bars and energy-time graph ----
      var energyDefs = [
        { id: 'ke', field: 'keJ', cls: 'sk-e-ke', label: __alloT('stem.skatelab.energy_ke', 'Kinetic energy (motion) KE') },
        { id: 'pe', field: 'peJ', cls: 'sk-e-pe', dashed: true, label: __alloT('stem.skatelab.energy_pe', 'Potential energy (height) PE') },
        { id: 'heat', field: 'thermalJ', cls: 'sk-e-heat', dashed: true, label: mode === 'gap'
          ? __alloT('stem.skatelab.energy_heat_gap', 'Heat (air drag and landing)')
          : __alloT('stem.skatelab.energy_heat', 'Heat from friction (thermal)') },
        { id: 'work', field: 'workJ', cls: 'sk-e-work', dashed: true, label: __alloT('stem.skatelab.energy_work', 'Work done by the rider (muscles)') },
        { id: 'wind', field: 'windJ', cls: 'sk-e-wind', dashed: true, label: __alloT('stem.skatelab.energy_wind', 'Work done by moving air (wind)') },
        { id: 'total', field: 'totalJ', cls: 'sk-e-total', label: __alloT('stem.skatelab.energy_total', 'Total: KE + PE + heat') }
      ].map(function(def) {
        def.short = def.id === 'ke' ? __alloT('stem.skatelab.legend_ke', 'Kinetic')
          : (def.id === 'pe' ? __alloT('stem.skatelab.legend_pe', 'Potential')
            : (def.id === 'heat' ? __alloT('stem.skatelab.legend_heat', 'Heat')
              : (def.id === 'work' ? __alloT('stem.skatelab.legend_work', 'Rider work')
                : (def.id === 'wind' ? __alloT('stem.skatelab.legend_wind', 'Wind work') : __alloT('stem.skatelab.legend_total', 'Total')))));
        return def;
      }).filter(function(def) {
        if (def.id === 'pe') return mode !== 'flat';
        if (def.id === 'work') return mode !== 'gap';
        if (def.id === 'wind') return mode === 'gap' && sim.airDrag;
        return true;
      });
      function sampleEnergy(sample, field) {
        if (field === 'keJ') return finite(sample.keJ, 0);
        if (field === 'peJ') return finite(sample.peJ, 0);
        if (field === 'thermalJ') return finite(sample.thermalJ, 0);
        if (field === 'workJ') return finite(sample.riderWorkJ, 0);
        if (field === 'windJ') return finite(sample.windWorkJ, 0);
        return finite(sample.keJ, 0) + finite(sample.peJ, 0) + finite(sample.thermalJ, 0);
      }
      var energyNow = energyDefs.map(function(def) {
        return { id: def.id, cls: def.cls, label: def.label, value: sampleEnergy(currentSample, def.field) };
      });
      var energyScale = 1;
      if (modelSeries) {
        modelSeries.points.forEach(function(point) {
          energyDefs.forEach(function(def) { energyScale = Math.max(energyScale, Math.abs(point[def.field])); });
        });
      }
      var energyValueText = fillTemplate(__alloT('stem.skatelab.energy_cursor_text', 'At {time} s: {values}.'), {
        time: formatNumber(cursorT, 2),
        values: energyNow.map(function(item) { return item.label + ' ' + Math.round(item.value) + ' J'; }).join(', ')
      });
      var energyNote = mode === 'gap'
        ? __alloT('stem.skatelab.energy_note_gap', 'Launch energy plus the work done by moving air equals KE + PE + heat at every moment. PE is measured from the deck, so it goes below zero under deck height.')
        : (mode === 'flat'
          ? __alloT('stem.skatelab.energy_note_flat', 'All the energy comes from the rider’s push. While coasting, KE falls and heat rises by the same amount.')
          : __alloT('stem.skatelab.energy_note_halfpipe', 'The starting PE plus the rider’s work equals KE + PE + heat at every moment. Each pump makes the total step up.'));

      var energyPanel = h('section', { className: 'sk-panel sk-linked-panel', 'aria-labelledby': 'sk-energy-graph-title', 'data-skatelab-energy-panel': 'true' },
        h('h3', { id: 'sk-energy-graph-title' }, __alloT('stem.skatelab.energy_panel_title', 'Energy now and over time')),
        predictionLocked
          ? h('p', { className: 'sk-help' }, lockedPanelText)
          : [
            h('ul', { key: 'bars', className: 'sk-ebars', 'aria-label': fillTemplate(__alloT('stem.skatelab.energy_bars_label', 'Energy at {time} s'), { time: formatNumber(cursorT, 2) }) },
              energyNow.map(function(item) {
                var pct = clamp(Math.abs(item.value) / energyScale * 100, 0, 100);
                return h('li', { key: item.id, className: 'sk-ebar' },
                  h('span', { className: 'sk-ebar-label' }, item.label),
                  h('span', { className: 'sk-ebar-track', 'aria-hidden': 'true' },
                    h('span', { className: 'sk-ebar-fill ' + item.cls + (item.value < -0.5 ? ' is-negative' : ''), style: { width: rounded(pct, 2) + '%' } })),
                  h('strong', { className: 'sk-ebar-value' }, formatNumber(item.value, 0) + ' J'));
              })
            ),
            h('div', Object.assign({ key: 'chart' }, scrubProps(__alloT('stem.skatelab.energy_chart_label', 'Energy-time graph: time cursor'), energyValueText, chartTMax)),
              timeChart('energy-chart', energyDefs.map(function(def) {
                return {
                  id: def.id,
                  cls: def.cls,
                  dashed: def.dashed,
                  points: fieldPoints(modelSeries, def.field)
                };
              }), chartTMax, cursorT, energyNow.map(function(item) { return { cls: item.cls, v: item.value }; }), 'J')
            ),
            h('ul', { key: 'legend', className: 'sk-chart-legend', 'aria-hidden': 'true' },
              energyDefs.map(function(def) {
                return h('li', { key: def.id }, h('span', { className: 'sk-legend-swatch ' + def.cls + (def.dashed ? ' is-dashed' : '') }), def.short);
              })
            ),
            h('p', { key: 'note', className: 'sk-help' }, energyNote),
            h('details', { key: 'numbers', className: 'sk-numbers' },
              h('summary', null, __alloT('stem.skatelab.show_numbers', 'Show the numbers')),
              h('div', scrollRegionProps(__alloT('stem.skatelab.energy_table_caption', 'Energy (J) at points in the run')),
                h('table', { className: 'sk-num-table' },
                  h('caption', null, __alloT('stem.skatelab.energy_table_caption', 'Energy (J) at points in the run')),
                  h('thead', null, h('tr', null,
                    h('th', { scope: 'col' }, __alloT('stem.skatelab.col_time', 'Time (s)')),
                    energyDefs.map(function(def) { return h('th', { key: def.id, scope: 'col' }, def.label); })
                  )),
                  h('tbody', null, numberTimes.map(function(progress, index) {
                    var row = sampleModel(sim, progress);
                    var isNow = Math.abs(progress - displayPlayhead) < 0.0000001;
                    return h('tr', { key: 'e' + index, className: isNow ? 'is-now' : undefined },
                      h('th', { scope: 'row' }, formatNumber(row.time, 2) + (isNow ? ' ' + __alloT('stem.skatelab.row_now', '(cursor)') : '')),
                      energyDefs.map(function(def) { return h('td', { key: def.id }, formatNumber(sampleEnergy(row, def.field), 0)); })
                    );
                  }))
                )
              )
            )
          ]
      );

      // ---- P2-2 free-body diagram at the playhead ----
      var fbd = freeBodyDiagram(sim, currentSample);
      var fbdScale = fbd.pixelsPerNewton;
      var fbdArrows = fbd.forces.filter(function(force) { return force.drawn; }).map(function(force) {
        return { id: force.id, cls: 'sk-fbd-' + force.id, label: forceSymbol(force.id), dx: force.x * fbdScale, dy: -force.y * fbdScale };
      });
      if (fbd.netN > 0.01) {
        fbdArrows.push({ id: 'net', cls: 'sk-fbd-net', label: 'ΣF', dx: fbd.netX * fbdScale, dy: -fbd.netY * fbdScale, dashed: true });
      }
      var fbdReach = 0;
      fbdArrows.forEach(function(arrow) { fbdReach = Math.max(fbdReach, Math.sqrt(arrow.dx * arrow.dx + arrow.dy * arrow.dy)); });
      var fbdSize = Math.max(200, Math.ceil(2 * (fbdReach + 36)));
      var fbdCenter = fbdSize / 2;
      function fbdArrow(arrow) {
        var length = Math.sqrt(arrow.dx * arrow.dx + arrow.dy * arrow.dy);
        var tipX = fbdCenter + arrow.dx;
        var tipY = fbdCenter + arrow.dy;
        var ux = length > 0 ? arrow.dx / length : 0;
        var uy = length > 0 ? arrow.dy / length : 0;
        var labelX = tipX + ux * 12 + (Math.abs(ux) < 0.3 ? 10 : 0);
        var labelY = tipY + uy * 12 + 4;
        var head = length >= 6
          ? [tipX, tipY, tipX - ux * 8 - uy * 4.5, tipY - uy * 8 + ux * 4.5, tipX - ux * 8 + uy * 4.5, tipY - uy * 8 - ux * 4.5].map(function(value) { return rounded(value, 2); }).join(' ')
          : '';
        return h('g', { key: arrow.id, className: 'sk-fbd-force ' + arrow.cls },
          h('line', { className: 'sk-fbd-shaft' + (arrow.dashed ? ' is-dashed' : ''), x1: fbdCenter, y1: fbdCenter, x2: rounded(tipX, 2), y2: rounded(tipY, 2) }),
          head ? h('polygon', { className: 'sk-fbd-head', points: head }) : h('circle', { className: 'sk-fbd-head', cx: rounded(tipX, 2), cy: rounded(tipY, 2), r: 2.5 }),
          h('text', { className: 'sk-fbd-label', x: rounded(labelX, 2), y: rounded(labelY, 2), textAnchor: 'middle' }, arrow.label)
        );
      }
      var fbdForceItems = fbd.forces.map(function(force) {
        return fillTemplate(__alloT('stem.skatelab.fbd_item', '{name}: {value} N, {direction}'), {
          name: forceName(force.id),
          value: formatNumber(force.magnitudeN, 1),
          direction: directionText(force.x, force.y)
        }) + (Math.abs(force.z) > 0.01 ? fillTemplate(__alloT('stem.skatelab.fbd_item_side', ', plus {value} N sideways ({side})'), {
          value: formatNumber(Math.abs(force.z), 1),
          side: force.z > 0 ? __alloT('stem.skatelab.side_right', 'toward the right edge') : __alloT('stem.skatelab.side_left', 'toward the left edge')
        }) : '');
      });
      var fbdNetText = fillTemplate(__alloT('stem.skatelab.fbd_net_item', 'Net force ΣF: {value} N, {direction}'), {
        value: formatNumber(fbd.netN, 1),
        direction: directionText(fbd.netX, fbd.netY)
      });
      var fbdCheckRows = [
        { id: 'x', label: __alloT('stem.skatelab.fbd_row_x', 'Horizontal (x, + is right)'), net: fbd.netX, ma: fbd.maX },
        { id: 'y', label: __alloT('stem.skatelab.fbd_row_y', 'Vertical (y, + is up)'), net: fbd.netY, ma: fbd.maY }
      ];
      if (Math.abs(fbd.netZ) > 0.0005 || Math.abs(fbd.maZ) > 0.0005) {
        fbdCheckRows.push({ id: 'z', label: __alloT('stem.skatelab.fbd_row_z', 'Sideways (z)'), net: fbd.netZ, ma: fbd.maZ });
      }
      if (fbd.pathFrame) {
        fbdCheckRows.push({ id: 'along', label: __alloT('stem.skatelab.fbd_row_along', 'Along the ramp'), net: fbd.netAlongN, ma: fbd.maAlongN });
        fbdCheckRows.push({ id: 'toward', label: __alloT('stem.skatelab.fbd_row_toward', 'Toward the centre of the curve (m·v²·κ)'), net: fbd.netTowardN, ma: fbd.maTowardN });
      }
      var fbdVerdict = !fbd.applies
        ? __alloT('stem.skatelab.fbd_not_modeled', 'At this moment the model does not work out the contact force (unsafe contact or a missed landing), so there is no ΣF = m·a check here.')
        : fillTemplate(__alloT('stem.skatelab.fbd_check', '|ΣF| = {net} N and m·a = {mass} kg × {accel} m/s² = {ma} N. The forces add up to m·a (difference {diff} N).'), {
          net: formatNumber(fbd.netN, 2),
          mass: formatNumber(fbd.massKg, 0),
          accel: formatNumber(fbd.accelerationMps2, 3),
          ma: formatNumber(fbd.maN, 2),
          diff: formatNumber(fbd.residualN, 3)
        });
      var fbdPanel = h('section', { className: 'sk-panel sk-linked-panel', 'aria-labelledby': 'sk-fbd-title', 'data-skatelab-fbd-panel': 'true' },
        h('h3', { id: 'sk-fbd-title' }, __alloT('stem.skatelab.fbd_title', 'Forces on the rider (free-body diagram)')),
        predictionLocked
          ? h('p', { className: 'sk-help' }, lockedPanelText)
          : [
            h('p', { key: 'when', className: 'sk-help' }, fillTemplate(__alloT('stem.skatelab.fbd_when', 'At {time} s ({phase}). Weight is always drawn. All arrows use one scale: {scale} N per 10 units, the same proportions as the scene.'), {
              time: formatNumber(cursorT, 2),
              phase: phaseLabel(currentSample.phase),
              scale: Math.round(10 / Math.max(0.000001, fbdScale))
            })),
            h('svg', {
              key: 'svg',
              className: 'sk-fbd',
              viewBox: '0 0 ' + fbdSize + ' ' + fbdSize,
              role: 'img',
              'aria-labelledby': 'sk-fbd-svg-label',
              focusable: 'false'
            },
              h('title', { id: 'sk-fbd-svg-label' }, __alloT('stem.skatelab.fbd_svg_label', 'Free-body diagram. The forces are listed below.')),
              h('circle', { className: 'sk-fbd-body', cx: fbdCenter, cy: fbdCenter, r: 9 }),
              fbdArrows.map(fbdArrow)
            ),
            h('ul', { key: 'list', className: 'sk-fbd-list' },
              fbdForceItems.map(function(text, index) {
                var force = fbd.forces[index];
                return h('li', { key: force.id }, h('span', { className: 'sk-legend-swatch sk-fbd-swatch sk-fbd-' + force.id, 'aria-hidden': 'true' }), text);
              }),
              h('li', { key: 'net', className: 'sk-fbd-net-item' }, h('span', { className: 'sk-legend-swatch sk-fbd-swatch sk-fbd-net', 'aria-hidden': 'true' }), fbdNetText)
            ),
            h('div', Object.assign({ key: 'check' }, scrollRegionProps(__alloT('stem.skatelab.fbd_check_caption', 'Check: ΣF = m·a'))),
              h('table', { className: 'sk-num-table sk-fbd-check' },
                h('caption', null, __alloT('stem.skatelab.fbd_check_caption', 'Check: ΣF = m·a')),
                h('thead', null, h('tr', null,
                  h('th', { scope: 'col' }, __alloT('stem.skatelab.fbd_col_direction', 'Direction')),
                  h('th', { scope: 'col' }, __alloT('stem.skatelab.fbd_col_net', 'ΣF (N)')),
                  h('th', { scope: 'col' }, __alloT('stem.skatelab.fbd_col_ma', 'm·a (N)'))
                )),
                h('tbody', null, fbdCheckRows.map(function(row) {
                  return h('tr', { key: row.id },
                    h('th', { scope: 'row' }, row.label),
                    h('td', null, formatNumber(row.net, 2)),
                    h('td', null, fbd.applies ? formatNumber(row.ma, 2) : '—'));
                }))
              )
            ),
            h('p', { key: 'verdict', className: 'sk-fbd-verdict' }, fbdVerdict)
          ]
      );

      // ---- P2-3 height (or distance), speed and acceleration over time ----
      var motionDefs = [
        { id: 'height', field: 'heightM', unit: 'm', cls: 'sk-m-height', label: mode === 'flat'
          ? __alloT('stem.skatelab.motion_distance', 'Distance travelled')
          : (mode === 'gap' ? __alloT('stem.skatelab.motion_height_gap', 'Height above the deck') : __alloT('stem.skatelab.motion_height', 'Height above the bottom')),
          now: mode === 'flat' ? currentSample.x : currentSample.y },
        { id: 'speed', field: 'speedMps', unit: 'm/s', cls: 'sk-m-speed', label: __alloT('stem.skatelab.motion_speed', 'Speed'), now: currentSample.speedMps },
        { id: 'accel', field: 'accelMps2', unit: 'm/s²', cls: 'sk-m-accel', label: mode === 'flat'
          ? __alloT('stem.skatelab.motion_accel_flat', 'Acceleration (+ forward)')
          : __alloT('stem.skatelab.motion_accel', 'Size of the acceleration'),
          now: fbd.applies ? (mode === 'flat' ? fbd.ax : fbd.accelerationMps2) : null }
      ];
      var motionValueText = fillTemplate(__alloT('stem.skatelab.motion_cursor_text', 'At {time} s: {values}.'), {
        time: formatNumber(cursorT, 2),
        values: motionDefs.map(function(def) { return def.label + ' ' + formatNumber(def.now, 2) + ' ' + def.unit; }).join(', ')
      });
      var motionPanel = h('section', { className: 'sk-panel sk-linked-panel sk-linked-wide', 'aria-labelledby': 'sk-motion-title', 'data-skatelab-motion-panel': 'true' },
        h('h3', { id: 'sk-motion-title' }, __alloT('stem.skatelab.motion_title', 'Motion graphs')),
        predictionLocked
          ? h('p', { className: 'sk-help' }, lockedPanelText)
          : [
            h('div', Object.assign({ key: 'charts' }, scrubProps(__alloT('stem.skatelab.motion_chart_label', 'Motion graphs: time cursor'), motionValueText, chartTMax)),
              h('div', { className: 'sk-motion-grid' },
                motionDefs.map(function(def) {
                  var series = [{ id: 'now', cls: def.cls, points: fieldPoints(modelSeries, def.field) }];
                  if (comparisonSeries) {
                    series.unshift({ id: 'prev', cls: 'sk-m-prev', dashed: true, points: fieldPoints(comparisonSeries, def.field) });
                  }
                  return h('figure', { key: def.id, className: 'sk-motion-figure' },
                    h('figcaption', null, def.label + ': ', h('strong', null, formatNumber(def.now, 2) + ' ' + def.unit)),
                    timeChart('motion-' + def.id, series, chartTMax, cursorT, [{ cls: def.cls, v: def.now }], def.unit));
                })
              )
            ),
            h('p', { key: 'note', className: 'sk-help' }, timeAxisNote +
              (comparisonSeries ? ' ' + __alloT('stem.skatelab.motion_previous_note', 'The dashed lavender line is the previous run on the same time axis.') : '') +
              (mode === 'halfpipe' ? ' ' + __alloT('stem.skatelab.motion_pump_note', 'Each pump is modelled as a quick push, so speed jumps at that instant.') : '')),
            h('details', { key: 'numbers', className: 'sk-numbers' },
              h('summary', null, __alloT('stem.skatelab.show_numbers', 'Show the numbers')),
              h('div', scrollRegionProps(__alloT('stem.skatelab.motion_table_caption', 'Motion at points in the run')),
                h('table', { className: 'sk-num-table' },
                  h('caption', null, __alloT('stem.skatelab.motion_table_caption', 'Motion at points in the run')),
                  h('thead', null, h('tr', null,
                    h('th', { scope: 'col' }, __alloT('stem.skatelab.col_time', 'Time (s)')),
                    motionDefs.map(function(def) { return h('th', { key: def.id, scope: 'col' }, def.label + ' (' + def.unit + ')'); })
                  )),
                  h('tbody', null, numberTimes.map(function(progress, index) {
                    var point = seriesPoint(sim, progress);
                    var isNow = Math.abs(progress - displayPlayhead) < 0.0000001;
                    return h('tr', { key: 'm' + index, className: isNow ? 'is-now' : undefined },
                      h('th', { scope: 'row' }, formatNumber(point.t, 2) + (isNow ? ' ' + __alloT('stem.skatelab.row_now', '(cursor)') : '')),
                      motionDefs.map(function(def) { return h('td', { key: def.id }, formatNumber(point[def.field], 2)); })
                    );
                  }))
                )
              )
            )
          ]
      );

      // ---- P3-1 predict first ----
      function choosePrediction(option) {
        if (running || !activePromptId) return;
        upd({ prediction: { signature: currentSimulationSignature, promptId: activePromptId, choice: option } });
      }
      function nextPredictionPrompt() {
        if (running || availablePrompts.length < 2) return;
        var index = availablePrompts.indexOf(activePromptId);
        var nextId = availablePrompts[(index + 1) % availablePrompts.length];
        upd({ prediction: { signature: currentSimulationSignature, promptId: nextId, choice: null } });
      }
      function applySetupPatch(patch, extra) {
        if (running || !patch) return;
        commitPlayhead(0);
        setLocalStatus(null);
        announcedPhaseRef.current = null;
        upd(Object.assign({}, patch, extra || {}));
      }
      var predictionFeedback = d.predictionResult && result &&
        d.predictionResult.signature === currentSimulationSignature
        ? d.predictionResult
        : null;
      var predictCard = null;
      if (d.estimateChallenge && !result && activePromptId) {
        predictCard = h('fieldset', { className: 'sk-predict', 'data-skatelab-predict': 'true' },
          h('legend', null, __alloT('stem.skatelab.predict_title', 'Predict first')),
          h('p', { id: 'sk-predict-question', className: 'sk-predict-question' }, predictionQuestion(activePromptId, sim)),
          h('div', { className: 'sk-predict-options', role: 'radiogroup', 'aria-labelledby': 'sk-predict-question' },
            PREDICTION_PROMPTS[activePromptId].options.map(function(option) {
              var optionId = 'sk-predict-' + activePromptId + '-' + option;
              return h('label', { key: option, htmlFor: optionId, className: 'sk-predict-option' },
                h('input', {
                  id: optionId,
                  type: 'radio',
                  name: 'sk-predict-choice',
                  value: option,
                  checked: predictionChoice === option,
                  disabled: running,
                  onChange: function() { choosePrediction(option); }
                }),
                h('span', null, predictionOptionLabel(activePromptId, option))
              );
            })
          ),
          availablePrompts.length > 1 && h('button', {
            type: 'button',
            className: 'sk-link-button',
            disabled: running,
            onClick: nextPredictionPrompt
          }, __alloT('stem.skatelab.predict_other', 'Ask me a different question')),
          h('p', { className: 'sk-help' }, __alloT('stem.skatelab.predict_or_estimate', 'Choose an answer, or type a number estimate below (or both). The results stay hidden until you run.'))
        );
      } else if (predictionFeedback && hideAnswers) {
        // P4-3: the teacher hides answers, so the learner sees the choice and
        // the results, but no verdict or misconception note.
        predictCard = h('div', { className: 'sk-predict sk-predict-feedback', 'data-skatelab-predict-feedback': 'hidden' },
          h('p', { className: 'sk-predict-question' },
            h('strong', null, __alloT('stem.skatelab.predict_you_said', 'You predicted:') + ' '),
            predictionOptionLabel(predictionFeedback.promptId, predictionFeedback.choice)),
          h('p', { className: 'sk-help' }, __alloT('stem.skatelab.predict_hidden', 'Your prediction is saved for your teacher. Compare it with the results below and decide for yourself whether the model agrees.'))
        );
      } else if (predictionFeedback) {
        var feedbackPatch = predictionFeedback.tryPatch;
        var feedbackProgress = predictionFeedback.tryProgress;
        predictCard = h('div', { className: 'sk-predict sk-predict-feedback', 'data-skatelab-predict-feedback': predictionFeedback.matched ? 'match' : 'miss' },
          h('p', { className: 'sk-predict-question' },
            h('strong', null, __alloT('stem.skatelab.predict_you_said', 'You predicted:') + ' '),
            predictionOptionLabel(predictionFeedback.promptId, predictionFeedback.choice)),
          h('p', null, predictionModelText(predictionFeedback.promptId, predictionFeedback.facts)),
          h('p', { className: predictionFeedback.matched ? 'sk-result-good' : 'sk-result-miss' }, predictionVerdictText(predictionFeedback)),
          predictionFeedback.misconception && h('p', { className: 'sk-help' },
            h('strong', null, misconceptionLabel(predictionFeedback.misconception) + ' '),
            scaffoldLevel === 'simple'
              ? misconceptionWhySimple(predictionFeedback.misconception)
              : misconceptionWhy(predictionFeedback.misconception)),
          (feedbackPatch || feedbackProgress != null) && h('button', {
            type: 'button',
            className: 'sk-secondary',
            disabled: running,
            onClick: function() {
              if (feedbackPatch) applySetupPatch(feedbackPatch);
              else inspectPlayhead(feedbackProgress, true);
            }
          }, feedbackPatch
            ? __alloT('stem.skatelab.predict_try', 'Try this to see why: set up the comparison run')
            : __alloT('stem.skatelab.predict_show', 'Show me that moment'))
        );
      }

      // ---- P3-2 experiment log: sort, plot, export, delete ----
      var logEntries = d.experiments;
      var presentColumns = LOG_COLUMNS.filter(function(column) {
        return logEntries.some(function(entry) { return entry.values && Number.isFinite(entry.values[column.id]); });
      }).map(function(column) { return column.id; });
      var latestMode = logEntries.length ? logEntries[0].mode : mode;
      var defaultAxes = latestMode === 'gap' ? ['launchSpeedSq', 'launchKE'] : (latestMode === 'flat' ? ['netForce', 'pushAccel'] : ['dropHeight', 'startPE']);
      var logX = presentColumns.indexOf(d.logView.x) !== -1 ? d.logView.x : (presentColumns.indexOf(defaultAxes[0]) !== -1 ? defaultAxes[0] : presentColumns[0] || '');
      var logY = presentColumns.indexOf(d.logView.y) !== -1 ? d.logView.y : (presentColumns.indexOf(defaultAxes[1]) !== -1 ? defaultAxes[1] : presentColumns[1] || presentColumns[0] || '');
      var groupChoices = ['none', 'dragOn', 'gravity', 'mu', 'mass'].filter(function(id) { return id === 'none' || presentColumns.indexOf(id) !== -1; });
      var logGroup = groupChoices.indexOf(d.logView.group) !== -1 ? d.logView.group : 'none';
      var runNumbers = {};
      logEntries.forEach(function(entry, index) { runNumbers[entry.id] = entry.n || (logEntries.length - index); });
      function entryOutcomeText(entry) {
        return logEntryOutcome(entry);
      }
      function entrySortValue(entry, key) {
        if (key === 'id') return runNumbers[entry.id];
        if (key === 'mode') return String(entry.mode || '');
        if (key === 'measured') return finite(entry.measured, -Infinity);
        if (key === 'error') return entry.errorPct == null ? Infinity : entry.errorPct;
        if (key === 'outcome') return entryOutcomeText(entry);
        var value = entry.values ? entry.values[key] : null;
        return Number.isFinite(value) ? value : -Infinity;
      }
      var sortKey = ['id', 'mode', 'measured', 'error', 'outcome'].indexOf(d.logView.sort) !== -1 || presentColumns.indexOf(d.logView.sort) !== -1
        ? d.logView.sort
        : 'id';
      var sortDir = d.logView.dir === 'asc' ? 'asc' : 'desc';
      var sortedEntries = logEntries.slice().sort(function(a, b) {
        var left = entrySortValue(a, sortKey);
        var right = entrySortValue(b, sortKey);
        var order = typeof left === 'string' || typeof right === 'string'
          ? String(left).localeCompare(String(right))
          : (left < right ? -1 : (left > right ? 1 : 0));
        if (order === 0) order = runNumbers[a.id] - runNumbers[b.id];
        return sortDir === 'asc' ? order : -order;
      });
      function setLogView(patch) { upd(function(current) { return { logView: Object.assign({}, DEFAULTS.logView, current.logView || {}, patch) }; }); }
      function groupValueLabel(groupId, value) {
        if (groupId === 'dragOn') return value === 1 ? __alloT('stem.skatelab.group_drag_on', 'drag on') : __alloT('stem.skatelab.group_drag_off', 'no drag');
        return logColumnLabel(groupId) + ' = ' + formatNumber(value, 3).replace(/\.?0+$/, '');
      }

      // Scatter plot with a least-squares line per group.
      function scatterPlot(key, entries, xId, yId, groupId) {
        var groups = [];
        var byKey = {};
        entries.forEach(function(entry) {
          var values = entry.values || {};
          if (!Number.isFinite(values[xId]) || !Number.isFinite(values[yId])) return;
          var groupValue = groupId && groupId !== 'none' ? values[groupId] : null;
          var groupKey = groupId && groupId !== 'none' ? String(groupValue) : 'all';
          if (!byKey[groupKey]) {
            byKey[groupKey] = { key: groupKey, value: groupValue, points: [] };
            groups.push(byKey[groupKey]);
          }
          byKey[groupKey].points.push({ x: values[xId], y: values[yId], n: runNumbers[entry.id] });
        });
        groups = groups.slice(0, 4);
        var all = [];
        groups.forEach(function(group) { all = all.concat(group.points); group.fit = linearFit(group.points); });
        if (!all.length) {
          return h('p', { key: key, className: 'sk-help' }, __alloT('stem.skatelab.scatter_empty', 'No runs have both of these values yet. Log some runs, or choose other columns.'));
        }
        var xs = all.map(function(point) { return point.x; });
        var ys = all.map(function(point) { return point.y; });
        var xRange = seriesRange([xs.map(function(v) { return { v: v }; })], Math.min.apply(Math, xs) >= 0);
        var yRange = seriesRange([ys.map(function(v) { return { v: v }; })], Math.min.apply(Math, ys) >= 0);
        var L = 50;
        var R = 310;
        var T = 10;
        var B = 172;
        function px(v) { return L + (v - xRange.min) / (xRange.max - xRange.min) * (R - L); }
        function py(v) { return B - (v - yRange.min) / (yRange.max - yRange.min) * (B - T); }
        var xTicks = tickValues(xRange.min, xRange.max, 4);
        var yTicks = tickValues(yRange.min, yRange.max, 4);
        var fitTexts = groups.map(function(group, index) {
          var name = groupId && groupId !== 'none' ? groupValueLabel(groupId, group.value) : __alloT('stem.skatelab.scatter_all', 'all runs');
          if (!group.fit) {
            return { index: index, text: fillTemplate(__alloT('stem.skatelab.scatter_no_fit', '{group}: {n} point(s), not enough spread in x for a best-fit line.'), { group: name, n: group.points.length }) };
          }
          return {
            index: index,
            text: fillTemplate(__alloT('stem.skatelab.scatter_fit', '{group}: best fit y = {slope}·x + {intercept}, r² = {r2} ({n} runs).'), {
              group: name,
              slope: formatNumber(group.fit.slope, Math.abs(group.fit.slope) >= 100 ? 1 : 4),
              intercept: formatNumber(group.fit.intercept, Math.abs(group.fit.intercept) >= 100 ? 1 : 3),
              r2: group.fit.r2 == null ? '—' : formatNumber(group.fit.r2, 4),
              n: group.fit.n
            })
          };
        });
        var summary = fillTemplate(__alloT('stem.skatelab.scatter_summary', 'Scatter plot of {y} against {x}, {n} points. {fits}'), {
          y: logColumnTitle(yId),
          x: logColumnTitle(xId),
          n: all.length,
          fits: fitTexts.map(function(item) { return item.text; }).join(' ')
        });
        function marker(group, point, index) {
          var cx = px(point.x);
          var cy = py(point.y);
          var cls = 'sk-scatter-point sk-grp-' + index;
          if (index === 1) return h('rect', { key: point.n + '-' + point.x, className: cls, x: rounded(cx - 3.5, 2), y: rounded(cy - 3.5, 2), width: 7, height: 7 });
          if (index === 2) return h('polygon', { key: point.n + '-' + point.x, className: cls, points: [cx, cy - 4.5, cx - 4.5, cy + 3.5, cx + 4.5, cy + 3.5].map(function(v) { return rounded(v, 2); }).join(' ') });
          if (index === 3) return h('polygon', { key: point.n + '-' + point.x, className: cls, points: [cx, cy - 5, cx + 5, cy, cx, cy + 5, cx - 5, cy].map(function(v) { return rounded(v, 2); }).join(' ') });
          return h('circle', { key: point.n + '-' + point.x, className: cls, cx: rounded(cx, 2), cy: rounded(cy, 2), r: 4 });
        }
        return h('figure', { key: key, className: 'sk-scatter-figure' },
          h('svg', { className: 'sk-scatter', viewBox: '0 0 320 210', role: 'img', 'aria-label': summary, focusable: 'false' },
            yTicks.values.map(function(value, index) {
              return h('g', { key: 'y' + index },
                h('line', { className: 'sk-chart-grid', x1: L, x2: R, y1: rounded(py(value), 2), y2: rounded(py(value), 2) }),
                h('text', { className: 'sk-chart-tick', x: L - 4, y: rounded(py(value) + 4, 2), textAnchor: 'end' }, tickLabel(value, yTicks.step)));
            }),
            xTicks.values.map(function(value, index) {
              return h('text', { key: 'x' + index, className: 'sk-chart-tick', x: rounded(px(value), 2), y: B + 14, textAnchor: 'middle' }, tickLabel(value, xTicks.step));
            }),
            h('line', { className: 'sk-chart-axis', x1: L, x2: L, y1: T, y2: B }),
            h('line', { className: 'sk-chart-axis', x1: L, x2: R, y1: B, y2: B }),
            h('text', { className: 'sk-chart-tick', x: (L + R) / 2, y: 206, textAnchor: 'middle' }, logColumnTitle(xId)),
            groups.map(function(group, index) {
              if (!group.fit) return null;
              var x1 = Math.min.apply(Math, group.points.map(function(point) { return point.x; }));
              var x2 = Math.max.apply(Math, group.points.map(function(point) { return point.x; }));
              return h('line', {
                key: 'fit' + index,
                className: 'sk-scatter-fit sk-grp-' + index,
                x1: rounded(px(x1), 2),
                y1: rounded(py(group.fit.slope * x1 + group.fit.intercept), 2),
                x2: rounded(px(x2), 2),
                y2: rounded(py(group.fit.slope * x2 + group.fit.intercept), 2)
              });
            }),
            groups.map(function(group, index) {
              return h('g', { key: 'pts' + index }, group.points.map(function(point) { return marker(group, point, index); }));
            })
          ),
          h('figcaption', null,
            h('span', { className: 'sk-scatter-axis' }, fillTemplate(__alloT('stem.skatelab.scatter_axes', 'y: {y} · x: {x}'), { y: logColumnTitle(yId), x: logColumnTitle(xId) })),
            h('ul', { className: 'sk-scatter-fits' }, fitTexts.map(function(item) {
              return h('li', { key: item.index }, h('span', { className: 'sk-legend-swatch sk-grp-' + item.index, 'aria-hidden': 'true' }), item.text);
            }))
          )
        );
      }

      function logCsv(entries) {
        var header = [
          { label: '#' }, { label: 'mode' }, { label: 'setup' }
        ].concat(presentColumns.map(function(id) { return { label: logColumnTitle(id) }; })).concat([
          { label: 'measured_ft' }, { label: 'estimate_ft' }, { label: 'estimate_error_pct' }, { label: 'outcome' }, { label: 'investigation' }
        ]);
        var rows = entries.map(function(entry) {
          return [runNumbers[entry.id], entry.mode, entry.setup]
            .concat(presentColumns.map(function(id) { return entry.values && Number.isFinite(entry.values[id]) ? entry.values[id] : null; }))
            .concat([
              Number.isFinite(entry.measured) ? Number(entry.measured.toPrecision(6)) : null,
              Number.isFinite(entry.estimate) ? entry.estimate : null,
              Number.isFinite(entry.errorPct) ? Number(entry.errorPct.toPrecision(4)) : null,
              entryOutcomeText(entry),
              entry.inv || ''
            ]);
        });
        return buildCsv(header, rows);
      }
      function copyLogCsv() {
        var text = logCsv(sortedEntries);
        var done = function() {
          announce(fillTemplate(__alloT('stem.skatelab.csv_copied', 'Copied {n} runs as CSV.'), { n: sortedEntries.length }));
        };
        var failed = function() {
          announce(__alloT('stem.skatelab.csv_copy_failed', 'Copy is not available here. Use Download CSV instead.'));
        };
        try {
          var writer = window.StemLab && typeof window.StemLab.writeClipboard === 'function'
            ? window.StemLab.writeClipboard
            : (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function'
              ? function(value) { return navigator.clipboard.writeText(value); }
              : null);
          if (!writer) { failed(); return; }
          Promise.resolve(writer(text)).then(done, failed);
        } catch (err) {
          failed();
        }
      }
      function downloadLogCsv() {
        try {
          var blob = new Blob([logCsv(sortedEntries)], { type: 'text/csv;charset=utf-8' });
          var url = URL.createObjectURL(blob);
          var link = document.createElement('a');
          link.href = url;
          link.download = 'skate-lab-runs.csv';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(function() { try { URL.revokeObjectURL(url); } catch (err) {} }, 1000);
          announce(fillTemplate(__alloT('stem.skatelab.csv_downloaded', 'Downloaded {n} runs as skate-lab-runs.csv.'), { n: sortedEntries.length }));
        } catch (err) {
          announce(__alloT('stem.skatelab.csv_download_failed', 'Download is not available here. Use Copy CSV instead.'));
        }
      }
      function focusSoon(id) {
        if (typeof document === 'undefined') return;
        setTimeout(function() {
          var target = document.getElementById(id);
          if (target) target.focus();
        }, 0);
      }
      function deleteRun(entryId) {
        upd(function(current) {
          return { experiments: (current.experiments || []).filter(function(entry) { return entry.id !== entryId; }) };
        });
        setPendingConfirm(null);
        announce(__alloT('stem.skatelab.log_deleted', 'Run deleted from the log.'));
        focusSoon('sk-log-title');
      }
      function clearLog() {
        upd({ experiments: [] });
        setPendingConfirm(null);
        announce(__alloT('stem.skatelab.log_cleared', 'Experiment log cleared.'));
        focusSoon('sk-log-title');
      }
      var columnOptions = presentColumns.map(function(id) { return h('option', { key: id, value: id }, logColumnTitle(id)); });
      var sortOptions = [
        { id: 'id', label: __alloT('stem.skatelab.sort_run', 'Run number') },
        { id: 'mode', label: __alloT('stem.skatelab.sort_mode', 'Mode') },
        { id: 'measured', label: __alloT('stem.skatelab.sort_measured', 'Measured') },
        { id: 'error', label: __alloT('stem.skatelab.sort_error', 'Estimate error') },
        { id: 'outcome', label: __alloT('stem.skatelab.sort_outcome', 'Outcome') }
      ].concat(presentColumns.map(function(id) { return { id: id, label: logColumnTitle(id) }; }));
      function ariaSortFor(key) {
        return sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined;
      }
      var logTools = logEntries.length > 0 && h('div', { className: 'sk-log-tools' },
        h('div', { className: 'sk-log-selects' },
          presentColumns.length > 0 && h('label', { htmlFor: 'sk-log-x' }, __alloT('stem.skatelab.log_x', 'x axis'),
            h('select', { id: 'sk-log-x', value: logX, onChange: function(event) { setLogView({ x: event.target.value }); } }, columnOptions)),
          presentColumns.length > 0 && h('label', { htmlFor: 'sk-log-y' }, __alloT('stem.skatelab.log_y', 'y axis'),
            h('select', { id: 'sk-log-y', value: logY, onChange: function(event) { setLogView({ y: event.target.value }); } }, columnOptions)),
          groupChoices.length > 1 && h('label', { htmlFor: 'sk-log-group' }, __alloT('stem.skatelab.log_group', 'Group points by'),
            h('select', { id: 'sk-log-group', value: logGroup, onChange: function(event) { setLogView({ group: event.target.value }); } },
              groupChoices.map(function(id) {
                return h('option', { key: id, value: id }, id === 'none' ? __alloT('stem.skatelab.log_group_none', 'No groups') : logColumnLabel(id));
              }))),
          h('label', { htmlFor: 'sk-log-sort' }, __alloT('stem.skatelab.log_sort', 'Sort by'),
            h('select', { id: 'sk-log-sort', value: sortKey, onChange: function(event) { setLogView({ sort: event.target.value }); } },
              sortOptions.map(function(option) { return h('option', { key: option.id, value: option.id }, option.label); }))),
          h('button', {
            type: 'button',
            className: 'sk-secondary',
            'aria-pressed': sortDir === 'asc' ? 'true' : 'false',
            onClick: function() { setLogView({ dir: sortDir === 'asc' ? 'desc' : 'asc' }); }
          }, sortDir === 'asc' ? __alloT('stem.skatelab.sort_ascending', 'Ascending ↑') : __alloT('stem.skatelab.sort_descending', 'Descending ↓'))
        ),
        presentColumns.length > 0 && scatterPlot('log-scatter', logEntries, logX, logY, logGroup),
        h('div', { className: 'sk-log-actions' },
          h('button', { type: 'button', className: 'sk-secondary', onClick: copyLogCsv }, __alloT('stem.skatelab.csv_copy', 'Copy CSV')),
          h('button', { type: 'button', className: 'sk-secondary', onClick: downloadLogCsv }, __alloT('stem.skatelab.csv_download', 'Download CSV')),
          pendingConfirm && pendingConfirm.kind === 'all'
            ? h('span', { className: 'sk-confirm', role: 'group', 'aria-label': __alloT('stem.skatelab.log_clear_confirm_label', 'Confirm clearing the log') },
              h('span', null, fillTemplate(__alloT('stem.skatelab.log_clear_confirm', 'Delete all {n} runs?'), { n: logEntries.length })),
              h('button', { id: 'sk-log-clear-yes', type: 'button', className: 'sk-danger', onClick: clearLog }, __alloT('stem.skatelab.log_clear_yes', 'Yes, delete all')),
              h('button', { type: 'button', className: 'sk-secondary', onClick: function() { setPendingConfirm(null); focusSoon('sk-log-clear'); } }, __alloT('stem.skatelab.log_keep', 'Keep')))
            : h('button', {
              id: 'sk-log-clear',
              type: 'button',
              className: 'sk-secondary',
              onClick: function() { setPendingConfirm({ kind: 'all' }); focusSoon('sk-log-clear-yes'); }
            }, __alloT('stem.skatelab.log_clear', 'Clear log'))
        )
      );
      var showXY = presentColumns.length > 0 && !!logX && !!logY;
      var logTable = logEntries.length === 0
        ? h('p', { className: 'sk-question' }, __alloT('stem.skatelab.log_empty', 'Run an experiment to add measured results here.'))
        : h('div', { className: 'sk-table-wrap' },
          h('table', { className: 'sk-table' },
            h('caption', { style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' } }, __alloT('stem.skatelab.log_caption', 'Recent Skate Lab experiments')),
            h('thead', null,
              h('tr', null,
                h('th', { scope: 'col', 'aria-sort': ariaSortFor('id') }, '#'),
                h('th', { scope: 'col', 'aria-sort': ariaSortFor('mode') }, __alloT('stem.skatelab.log_col_mode', 'Mode')),
                h('th', { scope: 'col' }, __alloT('stem.skatelab.log_col_setup', 'Setup')),
                showXY && h('th', { scope: 'col', 'aria-sort': ariaSortFor(logX) }, logColumnTitle(logX)),
                showXY && logY !== logX && h('th', { scope: 'col', 'aria-sort': ariaSortFor(logY) }, logColumnTitle(logY)),
                h('th', { scope: 'col', 'aria-sort': ariaSortFor('measured') }, __alloT('stem.skatelab.log_col_measured', 'Measured')),
                h('th', { scope: 'col', 'aria-sort': ariaSortFor('error') }, __alloT('stem.skatelab.log_col_error', 'Estimate error')),
                h('th', { scope: 'col', 'aria-sort': ariaSortFor('outcome') }, __alloT('stem.skatelab.log_col_outcome', 'Outcome')),
                h('th', { scope: 'col' }, __alloT('stem.skatelab.log_actions', 'Actions'))
              )
            ),
            h('tbody', null,
              sortedEntries.map(function(entry) {
                var number = runNumbers[entry.id];
                var confirming = pendingConfirm && pendingConfirm.kind === 'row' && pendingConfirm.id === entry.id;
                var values = entry.values || {};
                return h('tr', { key: entry.id },
                  h('td', null, number),
                  h('td', null, modeName(entry.mode)),
                  h('td', null, entry.setup),
                  showXY && h('td', null, formatNumber(values[logX], 3)),
                  showXY && logY !== logX && h('td', null, formatNumber(values[logY], 3)),
                  h('td', null, rounded(entry.measured, 1) + ' ' + entry.unit),
                  h('td', null, entry.errorPct == null ? '—' : rounded(entry.errorPct, 1) + '%'),
                  h('td', {
                    className: (typeof entry.runSuccessful === 'boolean' ? entry.runSuccessful : entry.landed)
                      ? 'sk-result-good'
                      : 'sk-result-miss'
                  }, entryOutcomeText(entry)),
                  h('td', null, confirming
                    ? h('span', { className: 'sk-confirm', role: 'group', 'aria-label': fillTemplate(__alloT('stem.skatelab.log_delete_confirm_label', 'Confirm deleting run {n}'), { n: number }) },
                      h('button', { id: 'sk-log-delete-yes', type: 'button', className: 'sk-danger', onClick: function() { deleteRun(entry.id); } },
                        __alloT('stem.skatelab.log_delete_yes', 'Delete')),
                      h('button', { type: 'button', className: 'sk-secondary', onClick: function() { setPendingConfirm(null); focusSoon('sk-log-delete-' + entry.id); } },
                        __alloT('stem.skatelab.log_keep', 'Keep')))
                    : h('button', {
                      id: 'sk-log-delete-' + entry.id,
                      type: 'button',
                      className: 'sk-secondary sk-small',
                      'aria-label': fillTemplate(__alloT('stem.skatelab.log_delete_label', 'Delete run {n}'), { n: number }),
                      onClick: function() { setPendingConfirm({ kind: 'row', id: entry.id }); focusSoon('sk-log-delete-yes'); }
                    }, __alloT('stem.skatelab.log_delete', 'Delete')))
                );
              })
            )
          )
        );
      var tallyIds = MISCONCEPTION_IDS.filter(function(id) { return d.misconceptionTally[id] > 0; });
      var predictionRecord = d.predictionStats.made > 0 && h('div', { className: 'sk-prediction-record' },
        h('p', { className: 'sk-help' }, fillTemplate(__alloT('stem.skatelab.prediction_record', 'Predictions checked: {made}. Matched the model: {matched}.'), {
          made: d.predictionStats.made,
          matched: d.predictionStats.matched
        })),
        tallyIds.length > 0 && h('ul', { className: 'sk-help sk-tally', 'aria-label': __alloT('stem.skatelab.tally_label', 'Ideas to rethink, with how often they came up') },
          tallyIds.map(function(id) {
            return h('li', { key: id }, misconceptionLabel(id) + ' × ' + d.misconceptionTally[id]);
          }))
      );

      // ---- P3-3 guided investigations with claim, evidence, reasoning ----
      var activeInvestigation = getInvestigation(d.activeInvestigation);
      var activeInvestigationText = activeInvestigation ? investigationText(activeInvestigation.id) : null;
      var activeCer = activeInvestigation ? Object.assign({ claim: '', evidence: '', reasoning: '', checks: [], checkCount: 0 }, d.cer[activeInvestigation.id] || {}) : null;
      var currentPlanStep = matchPlanStep(activeInvestigation, d);
      function updateCer(investigationId, patch) {
        upd(function(current) {
          var all = Object.assign({}, current.cer || {});
          all[investigationId] = Object.assign({}, all[investigationId] || {}, patch);
          return { cer: all };
        });
      }
      function rubricItems(text) {
        return [
          __alloT('stem.skatelab.rubric_claim', 'My claim answers the question in one clear sentence.'),
          __alloT('stem.skatelab.rubric_evidence', 'My evidence uses numbers, with units, from at least two logged runs.'),
          __alloT('stem.skatelab.rubric_fair', 'The runs I compare changed only one variable.'),
          fillTemplate(__alloT('stem.skatelab.rubric_idea', 'My reasoning uses the science idea: {idea}'), { idea: text.idea }),
          __alloT('stem.skatelab.rubric_pattern', 'I said what the graph shows (the pattern, the slope or r²).')
        ];
      }
      function cerCheckText(id) {
        switch (id) {
          case 'claim': return __alloT('stem.skatelab.cer_check_claim', 'Claim: write a full sentence (at least 6 words) that answers the question.');
          case 'numbers': return __alloT('stem.skatelab.cer_check_numbers', 'Evidence: include at least two numbers from your runs.');
          case 'units': return __alloT('stem.skatelab.cer_check_units', 'Evidence: give units (J, m, m/s, N, g, kg or °).');
          case 'idea': return __alloT('stem.skatelab.cer_check_idea', 'Reasoning: connect your evidence to the science idea or equation.');
          default: return __alloT('stem.skatelab.cer_check_blanks', 'Fill in every ___ blank and all three boxes.');
        }
      }
      function runCerCheck() {
        if (!activeInvestigation) return;
        var results = checkCer(activeCer, activeInvestigationText.keywords);
        var count = finite(activeCer.checkCount, 0) + 1;
        updateCer(activeInvestigation.id, { checkCount: count });
        var allOk = results.every(function(item) { return item.ok; });
        var plannedDone = investigationDone(activeInvestigation.id) >= activeInvestigation.steps.length;
        var ticked = rubricItems(activeInvestigationText).every(function(item, index) { return !!activeCer.checks[index]; });
        var lines = results.filter(function(item) { return !item.ok; }).map(function(item) { return cerCheckText(item.id); });
        if (allOk && !plannedDone) lines.push(__alloT('stem.skatelab.cer_check_runs', 'Log every planned run so your evidence covers the whole plan.'));
        if (allOk && plannedDone && !ticked) lines.push(__alloT('stem.skatelab.cer_check_rubric', 'Tick each rubric line you are sure you have met.'));
        var complete = allOk && plannedDone && ticked;
        if (complete) {
          lines.push(__alloT('stem.skatelab.cer_check_done', 'Strong work: your answer has every part. Compare it with a classmate’s or show your teacher.'));
          awardOnce('skatelab_inv_' + activeInvestigation.id, 15,
            __alloT('stem.skatelab.xp_investigation', 'Skate Lab: completed a guided investigation with claim, evidence and reasoning'));
        }
        setCerFeedback({ id: activeInvestigation.id, lines: lines, complete: complete });
        announce(complete
          ? __alloT('stem.skatelab.cer_check_done_short', 'Self-check complete: every part is there.')
          : fillTemplate(__alloT('stem.skatelab.cer_check_some', 'Self-check: {n} thing(s) to improve.'), { n: lines.length }));
      }
      function awardOnce(id, points, reason) {
        if (d.xpCredits.indexOf(id) !== -1 || xpAwardedRef.current[id]) return false;
        xpAwardedRef.current[id] = true;
        if (typeof ctx.awardXP === 'function') {
          try { ctx.awardXP(id, points, reason); } catch (err) {}
        }
        upd(function(current) {
          var credits = (current.xpCredits || []).slice();
          if (credits.indexOf(id) === -1) credits.push(id);
          return { xpCredits: credits.slice(-80) };
        });
        return true;
      }
      function investigationEntries(id) {
        return logEntries.filter(function(entry) { return entry.inv === id; });
      }
      function investigationDone(id) {
        var seen = {};
        investigationEntries(id).forEach(function(entry) { if (Number.isFinite(entry.step)) seen[entry.step] = true; });
        return Object.keys(seen).length;
      }
      function askHint() {
        if (!activeInvestigation || typeof ctx.getHint !== 'function') return;
        try {
          ctx.getHint('skatelab', activeInvestigationText.question, String(activeCer.claim || ''), activeInvestigationText.idea,
            finite(activeCer.checkCount, 0), function(text) { setHintText({ id: activeInvestigation.id, text: String(text || '') }); });
        } catch (err) {}
      }
      var investigationsPanel = h('details', { className: 'sk-panel sk-details sk-inv', 'data-skatelab-investigations': 'true', open: activeInvestigation ? true : undefined },
        h('summary', null, __alloT('stem.skatelab.inv_summary', 'Guided investigations (NGSS)')),
        h('p', { className: 'sk-help' }, __alloT('stem.skatelab.inv_intro', 'Pick an investigation. Set up each planned run, run it, then write a claim, evidence and reasoning from your data.')),
        h('div', { className: 'sk-inv-list', role: 'group', 'aria-label': __alloT('stem.skatelab.inv_list_label', 'Investigations') },
          INVESTIGATIONS.map(function(investigation) {
            var text = investigationText(investigation.id);
            var done = investigationDone(investigation.id);
            var pressed = activeInvestigation && activeInvestigation.id === investigation.id;
            return h('button', {
              key: investigation.id,
              type: 'button',
              className: 'sk-inv-pick',
              'aria-pressed': pressed ? 'true' : 'false',
              disabled: running,
              onClick: function() { upd({ activeInvestigation: pressed ? null : investigation.id }); setCerFeedback(null); }
            },
              h('span', { className: 'sk-inv-ngss' }, investigation.ngss),
              h('span', { className: 'sk-inv-name' }, text.title),
              h('span', { className: 'sk-inv-progress' }, fillTemplate(__alloT('stem.skatelab.inv_progress', '{done}/{total} runs'), { done: done, total: investigation.steps.length })));
          })
        ),
        activeInvestigation && (function() {
          var text = activeInvestigationText;
          var id = activeInvestigation.id;
          var entries = investigationEntries(id);
          var done = investigationDone(id);
          var rubric = rubricItems(text);
          var feedback = cerFeedback && cerFeedback.id === id ? cerFeedback : null;
          var hint = hintText && hintText.id === id ? hintText.text : '';
          function cerBox(field, label, frame) {
            var boxId = 'sk-cer-' + id + '-' + field;
            return h('div', { key: field, className: 'sk-cer-box' },
              h('label', { htmlFor: boxId }, label),
              h('p', { id: boxId + '-frame', className: 'sk-frame' },
                h('span', null, __alloT('stem.skatelab.cer_frame', 'Sentence frame:') + ' '), frame),
              h('textarea', {
                id: boxId,
                rows: 3,
                value: activeCer[field] || '',
                'aria-describedby': boxId + '-frame',
                onChange: function(event) {
                  var patch = {};
                  patch[field] = String(event.target.value).slice(0, 2000);
                  updateCer(id, patch);
                }
              }),
              !activeCer[field] && h('button', {
                type: 'button',
                className: 'sk-link-button',
                onClick: function() {
                  var patch = {};
                  patch[field] = frame;
                  updateCer(id, patch);
                  focusSoon(boxId);
                }
              }, fillTemplate(__alloT('stem.skatelab.cer_use_frame', 'Start my {part} with the frame'), { part: label.toLowerCase() }))
            );
          }
          return h('div', { className: 'sk-inv-body', 'aria-labelledby': 'sk-inv-title', role: 'region' },
            h('h4', { id: 'sk-inv-title' }, text.title, ' ', h('span', { className: 'sk-inv-ngss' }, activeInvestigation.ngss)),
            h('p', { className: 'sk-inv-question' }, h('strong', null, __alloT('stem.skatelab.inv_question_label', 'Question:') + ' '), text.question),
            h('dl', { className: 'sk-inv-vars' },
              h('dt', null, __alloT('stem.skatelab.inv_iv', 'Change (independent variable)')), h('dd', null, text.iv),
              h('dt', null, __alloT('stem.skatelab.inv_dv', 'Measure (dependent variable)')), h('dd', null, text.dv),
              h('dt', null, __alloT('stem.skatelab.inv_controlled', 'Keep the same (controlled)')), h('dd', null, text.controlled)
            ),
            h('p', { className: 'sk-help' }, text.note),
            h('h5', null, fillTemplate(__alloT('stem.skatelab.inv_plan', 'Run plan: {done} of {total} logged'), { done: done, total: activeInvestigation.steps.length })),
            h('ol', { className: 'sk-inv-plan' },
              activeInvestigation.steps.map(function(step, index) {
                var logged = entries.some(function(entry) { return entry.step === index; });
                var isCurrent = currentPlanStep === index;
                var label = planStepLabel(step);
                return h('li', { key: index, className: logged ? 'is-logged' : undefined },
                  h('span', { className: 'sk-inv-step' }, label),
                  h('span', { className: logged ? 'sk-result-good' : 'sk-help' }, logged
                    ? __alloT('stem.skatelab.inv_step_logged', '✓ logged')
                    : (isCurrent ? __alloT('stem.skatelab.inv_step_ready', 'set up: press Run') : __alloT('stem.skatelab.inv_step_todo', 'not run yet'))),
                  h('button', {
                    type: 'button',
                    className: 'sk-secondary sk-small',
                    disabled: running,
                    'aria-label': fillTemplate(__alloT('stem.skatelab.inv_setup_label', 'Set up run {n}: {label}'), { n: index + 1, label: label }),
                    onClick: function() { applySetupPatch(step.patch, activeInvestigation.speed ? { playbackSpeed: activeInvestigation.speed } : null); }
                  }, __alloT('stem.skatelab.inv_setup', 'Set up'))
                );
              })
            ),
            entries.length > 0
              ? scatterPlot('inv-scatter', entries, activeInvestigation.x, activeInvestigation.y, activeInvestigation.group || 'none')
              : h('p', { className: 'sk-help' }, __alloT('stem.skatelab.inv_no_data', 'Your planned runs will appear here as a graph once they are logged.')),
            entries.length > 0 && h('div', { className: 'sk-inv-axes' },
              h('button', {
                type: 'button',
                className: 'sk-secondary sk-small',
                onClick: function() { setLogView({ x: activeInvestigation.x, y: activeInvestigation.y, group: activeInvestigation.group || 'none' }); }
              }, __alloT('stem.skatelab.inv_plot_log', 'Use these axes in the experiment log')),
              (activeInvestigation.altX || activeInvestigation.altY) && h('button', {
                type: 'button',
                className: 'sk-secondary sk-small',
                onClick: function() {
                  setLogView({ x: activeInvestigation.altX || activeInvestigation.x, y: activeInvestigation.altY || activeInvestigation.y, group: 'none' });
                }
              }, fillTemplate(__alloT('stem.skatelab.inv_plot_alt', 'Also try: {y} against {x}'), {
                y: logColumnLabel(activeInvestigation.altY || activeInvestigation.y),
                x: logColumnLabel(activeInvestigation.altX || activeInvestigation.x)
              }))
            ),
            h('h5', null, __alloT('stem.skatelab.cer_title', 'Claim, evidence, reasoning')),
            cerBox('claim', __alloT('stem.skatelab.cer_claim', 'Claim'), text.claim),
            cerBox('evidence', __alloT('stem.skatelab.cer_evidence', 'Evidence'), text.evidence),
            cerBox('reasoning', __alloT('stem.skatelab.cer_reasoning', 'Reasoning'), text.reasoning),
            h('fieldset', { className: 'sk-rubric' },
              h('legend', null, __alloT('stem.skatelab.rubric_title', 'Self-check rubric')),
              rubric.map(function(item, index) {
                var boxId = 'sk-rubric-' + id + '-' + index;
                return h('label', { key: index, className: 'sk-check', htmlFor: boxId },
                  h('input', {
                    id: boxId,
                    type: 'checkbox',
                    checked: !!activeCer.checks[index],
                    onChange: function(event) {
                      var checks = rubric.map(function(unused, at) { return at === index ? event.target.checked : !!activeCer.checks[at]; });
                      updateCer(id, { checks: checks });
                    }
                  }),
                  h('span', null, item));
              })
            ),
            h('div', { className: 'sk-log-actions' },
              h('button', { type: 'button', className: 'sk-secondary', onClick: runCerCheck }, __alloT('stem.skatelab.cer_check', 'Check my writing')),
              typeof ctx.getHint === 'function' && ctx.aiHintsEnabled !== false && h('button', {
                type: 'button',
                className: 'sk-secondary',
                onClick: askHint
              }, __alloT('stem.skatelab.cer_hint', 'Ask for a hint (optional)'))
            ),
            feedback && h('ul', { className: 'sk-cer-feedback' + (feedback.complete ? ' is-complete' : '') },
              feedback.lines.map(function(line, index) { return h('li', { key: index }, line); })),
            hint && h('p', { className: 'sk-help sk-hint' }, hint)
          );
        })()
      );

      // ---------- Stage C: run requests, shortcuts, step-through ----------
      function requestRun() {
        if (running) return;
        if (estimateBlocked) {
          setRunAttemptSignature(currentSimulationSignature);
          return;
        }
        animateModel(sim, true);
      }
      function focusPrediction() {
        if (typeof document === 'undefined') return;
        var target = document.querySelector('.skatelab-shell [data-skatelab-predict] input:checked') ||
          document.querySelector('.skatelab-shell [data-skatelab-predict] input') ||
          document.getElementById('sk-estimate');
        if (target && typeof target.focus === 'function') target.focus();
      }
      function isTypingTarget(target) {
        if (!target || !target.tagName) return false;
        var tag = String(target.tagName).toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) return true;
        var role = target.getAttribute ? target.getAttribute('role') : null;
        return ['slider', 'tab', 'radio', 'textbox', 'combobox', 'spinbutton', 'listbox', 'menuitem'].indexOf(role) !== -1;
      }
      // Space play/pause (or run), R replay, ← → scrub, P predict. Keys typed
      // into a field, or meant for a focused widget, are left alone.
      function handleShortcut(event) {
        if (!event || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
        var target = event.target;
        if (isTypingTarget(target)) return;
        var key = event.key;
        var onActivator = !!(target && target.tagName && /^(button|summary|a)$/i.test(target.tagName));
        if (key === ' ' || key === 'Spacebar') {
          if (onActivator) return;
          event.preventDefault();
          if (running) togglePlayback();
          else requestRun();
          return;
        }
        var lower = String(key || '').toLowerCase();
        if (lower === 'r' && !event.shiftKey) {
          if (running || predictionLocked || !(lastSimModel && lastSimModel.mode === mode)) return;
          event.preventDefault();
          animateModel(lastSimModel, false);
          return;
        }
        if (lower === 'p' && !event.shiftKey) {
          event.preventDefault();
          focusPrediction();
          return;
        }
        if (key === 'ArrowLeft' || key === 'ArrowRight') {
          if (running || predictionLocked) return;
          event.preventDefault();
          var stepSize = event.shiftKey ? 0.1 : 0.01;
          inspectPlayhead(clamp(Math.round((displayPlayhead + (key === 'ArrowRight' ? stepSize : -stepSize)) * 1000) / 1000, 0, 1), true);
        }
      }
      keyHandlerRef.current = handleShortcut;

      // Step-through: one phase at a time with a full description, for
      // reduced motion (shown automatically) or on request.
      var stepModeOn = !predictionLocked && (d.stepMode === true || motionReducedNow);
      function phaseStepDescription(index) {
        var event = phaseEvents[index];
        if (!event) return '';
        var sample = sampleModel(sim, clamp(event.progress, 0, 1));
        return fillTemplate(__alloT('stem.skatelab.step_position', 'Step {n} of {total}.'), { n: index + 1, total: phaseEvents.length }) + ' ' +
          narrationText(sim, sample) + ' ' + phaseLearningText(sim, sample);
      }
      function stepPhase(direction) {
        if (running || predictionLocked || !phaseEvents.length) return;
        var index = clamp(activePhaseEventIndex + direction, 0, phaseEvents.length - 1);
        inspectPlayhead(clamp(phaseEvents[index].progress, 0, 1), true);
        var description = phaseStepDescription(index);
        announce(description);
        if (d.narrate) speak(description, true);
      }
      var stepPanel = stepModeOn && h('div', { className: 'sk-step-panel', role: 'group', 'aria-label': __alloT('stem.skatelab.step_group', 'Step through the run') },
        h('div', { className: 'sk-step-buttons' },
          h('button', {
            type: 'button',
            className: 'sk-secondary sk-small',
            disabled: running || activePhaseEventIndex <= 0,
            onClick: function() { stepPhase(-1); }
          }, __alloT('stem.skatelab.step_previous', '← Previous phase')),
          h('button', {
            type: 'button',
            className: 'sk-secondary sk-small',
            disabled: running || activePhaseEventIndex >= phaseEvents.length - 1,
            onClick: function() { stepPhase(1); }
          }, __alloT('stem.skatelab.step_next', 'Next phase →'))
        ),
        h('p', { className: 'sk-step-text' }, phaseStepDescription(activePhaseEventIndex))
      );

      // ---------- Stage C P5-1 listening controls ----------
      function playRunSound() {
        if (running || predictionLocked) return;
        if (sonifyPlaying) {
          stopSonify();
          announce(__alloT('stem.skatelab.sound_stopped', 'Sound stopped.'));
          return;
        }
        // Long rocking runs are sped up so the sound lasts at most 20 seconds.
        var listenSpeed = Math.max(playbackSpeed, finite(sim.motionDuration, 0) / 20);
        if (startSonify(sim, 0, listenSpeed)) {
          announce(sim.mode === 'flat'
            ? __alloT('stem.skatelab.sound_playing_flat', 'Playing the run as sound: higher pitch means faster, left to right follows the rider, and a click marks the stop.')
            : __alloT('stem.skatelab.sound_playing', 'Playing the run as sound: higher pitch means higher up, left and right follow the rider, and a click marks each landing.'));
        }
      }
      function readResultAloud() {
        var text = result ? resultText(result) : '';
        if (!text) return;
        if (!speak(text, true)) {
          announce(globalMuted()
            ? __alloT('stem.skatelab.speech_muted', 'Speech is muted in the app.')
            : __alloT('stem.skatelab.speech_unavailable', 'Speech is not available in this browser.'));
        }
      }
      var shortcutItems = [
        { keys: __alloT('stem.skatelab.key_space', 'Space'), text: __alloT('stem.skatelab.key_space_text', 'Run, or pause and resume the playback') },
        { keys: 'R', text: __alloT('stem.skatelab.key_r_text', 'Replay the last run') },
        { keys: '← →', text: __alloT('stem.skatelab.key_arrows_text', 'Move the time cursor (hold Shift for bigger steps)') },
        { keys: 'P', text: __alloT('stem.skatelab.key_p_text', 'Go to the prediction') }
      ];
      var accessPanel = h('div', { className: 'sk-access', 'data-skatelab-access': 'true' },
        h('div', { className: 'sk-access-row' },
          h('label', { className: 'sk-check', htmlFor: 'sk-narrate' },
            h('input', {
              id: 'sk-narrate',
              type: 'checkbox',
              checked: d.narrate === true,
              onChange: function(event) { upd({ narrate: event.target.checked }); }
            }),
            h('span', null, __alloT('stem.skatelab.narrate_toggle', 'Speak each phase aloud'))),
          h('label', { className: 'sk-check', htmlFor: 'sk-sonify' },
            h('input', {
              id: 'sk-sonify',
              type: 'checkbox',
              checked: d.sonify === true,
              onChange: function(event) {
                if (!event.target.checked) stopSonify();
                upd({ sonify: event.target.checked });
              }
            }),
            h('span', null, __alloT('stem.skatelab.sonify_toggle', 'Play sound during the run'))),
          h('label', { className: 'sk-check', htmlFor: 'sk-step-mode' },
            h('input', {
              id: 'sk-step-mode',
              type: 'checkbox',
              checked: d.stepMode === true || motionReducedNow,
              disabled: motionReducedNow,
              'aria-describedby': motionReducedNow ? 'sk-step-reduced-note' : undefined,
              onChange: function(event) { upd({ stepMode: event.target.checked }); }
            }),
            h('span', null, __alloT('stem.skatelab.step_toggle', 'Step through phases'))),
          motionReducedNow && h('span', { id: 'sk-step-reduced-note', className: 'sk-sr-only' },
            __alloT('stem.skatelab.step_reduced_note', 'Step-through is on because reduced motion is set.'))
        ),
        !predictionLocked && h('div', { className: 'sk-access-row' },
          h('button', {
            type: 'button',
            className: 'sk-secondary sk-small',
            'aria-pressed': sonifyPlaying ? 'true' : 'false',
            disabled: running,
            onClick: playRunSound
          }, sonifyPlaying
            ? __alloT('stem.skatelab.sound_stop', 'Stop the sound')
            : __alloT('stem.skatelab.sound_play', 'Hear this run as sound')),
          result && h('button', {
            type: 'button',
            className: 'sk-secondary sk-small',
            onClick: readResultAloud
          }, __alloT('stem.skatelab.read_result', 'Read the result aloud'))
        ),
        stepPanel,
        h('details', { className: 'sk-shortcuts' },
          h('summary', null, __alloT('stem.skatelab.shortcuts_title', 'Keyboard shortcuts')),
          h('p', { className: 'sk-help' }, __alloT('stem.skatelab.shortcuts_note', 'They work while focus is anywhere in Skate Lab, except when you are typing in a box or using a slider.')),
          h('dl', { className: 'sk-shortcut-list' },
            shortcutItems.map(function(item) {
              return [
                h('dt', { key: item.keys + '-k' }, h('kbd', null, item.keys)),
                h('dd', { key: item.keys + '-t' }, item.text)
              ];
            })
          )
        )
      );

      // ---------- Stage C P4-1 mission board ----------
      var activeMission = getMission(d.activeMission);
      var missionsDone = MISSIONS.filter(function(mission) { return d.missions[mission.id] && d.missions[mission.id].done; }).length;
      var currentSetupHash = signatureHash(currentSimulationSignature);
      var moonSetupSeen = mode === 'halfpipe' && Math.abs(finite(d.gravity, G) - 1.62) < 1e-6 && d.moonSeen.indexOf(currentSetupHash) !== -1;
      var guessText = d.missionGuess && d.missionGuess.signature === currentSimulationSignature && d.missionGuess.value != null
        ? String(d.missionGuess.value)
        : '';
      function startMission(id) {
        var mission = getMission(id);
        if (running || !mission) return;
        applySetupPatch(mission.setup, { activeMission: id });
        announce(fillTemplate(__alloT('stem.skatelab.mission_started', 'Mission set up: {title}. {goal}'), {
          title: missionText(id).title,
          goal: missionText(id).goal
        }));
      }
      function missionStatusText(mission) {
        var record = d.missions[mission.id] || {};
        if (record.done) return __alloT('stem.skatelab.mission_status_done', '✓ Complete');
        if (!record.tries) return __alloT('stem.skatelab.mission_status_new', 'Not tried yet');
        return fillTemplate(__alloT('stem.skatelab.mission_status_tries', 'Runs tried: {n}.'), { n: record.tries }) + ' ' +
          missionResultText({ id: mission.id, reason: record.reason, value: record.last, guessErrorPct: record.err });
      }
      function guessInput(idSuffix) {
        var inputId = 'sk-mission-guess' + (idSuffix || '');
        return h('div', { className: 'sk-mission-guess' },
          h('label', { htmlFor: inputId }, __alloT('stem.skatelab.mission_guess_label', 'Your hang-time prediction (s)')),
          h('input', {
            id: inputId,
            type: 'number',
            min: 0,
            step: 0.01,
            value: guessText,
            disabled: running,
            'aria-describedby': inputId + '-help',
            onChange: function(event) {
              upd({ missionGuess: { value: String(event.target.value).slice(0, 12), signature: currentSimulationSignature } });
            }
          }),
          h('p', { id: inputId + '-help', className: 'sk-help' }, moonSetupSeen
            ? __alloT('stem.skatelab.mission_guess_seen', 'This Moon setup has already been run, so a prediction for it will not count. Change any setting to make a new setup.')
            : __alloT('stem.skatelab.mission_guess_help', 'Type it before you run. It counts only for this setup, and only before its first Moon run.'))
        );
      }
      var activeMissionBanner = activeMission && h('div', { className: 'sk-mission-banner', 'data-skatelab-active-mission': activeMission.id },
        h('p', null,
          h('strong', null, fillTemplate(__alloT('stem.skatelab.mission_banner', 'Mission: {title}.'), { title: missionText(activeMission.id).title }) + ' '),
          missionText(activeMission.id).goal),
        activeMission.guess && mode === 'halfpipe' && guessInput('-banner'),
        h('p', { className: 'sk-help' }, missionStatusText(activeMission))
      );
      var missionBoard = h('details', {
        className: 'sk-panel sk-details sk-missions',
        'data-skatelab-missions': 'true',
        open: activeMission ? true : undefined
      },
        h('summary', null, fillTemplate(__alloT('stem.skatelab.missions_summary', 'Missions ({done} of {total} complete)'), { done: missionsDone, total: MISSIONS.length })),
        h('p', { className: 'sk-help' }, __alloT('stem.skatelab.missions_intro', 'Each mission is checked by the physics model after a real run. “Set up the attempt” opens the right scene; finding the settings that work is up to you.')),
        h('div', { className: 'sk-mission-meter', 'aria-hidden': 'true' },
          h('span', { style: { width: rounded(missionsDone / MISSIONS.length * 100, 1) + '%' } })),
        h('ul', { className: 'sk-mission-list' },
          MISSIONS.map(function(mission) {
            var text = missionText(mission.id);
            var record = d.missions[mission.id] || {};
            var shown = finite(missionHints[mission.id], 0);
            var isActive = activeMission && activeMission.id === mission.id;
            return h('li', {
              key: mission.id,
              className: 'sk-mission' + (record.done ? ' is-done' : '') + (isActive ? ' is-active' : ''),
              'data-skatelab-mission': mission.id
            },
              h('h4', { className: 'sk-mission-title' }, text.title,
                h('span', { className: 'sk-mission-xp' }, fillTemplate(__alloT('stem.skatelab.mission_xp', '{xp} XP'), { xp: mission.xp }))),
              h('p', { className: 'sk-mission-goal' }, text.goal),
              h('p', { className: record.done ? 'sk-result-good sk-mission-status' : 'sk-help sk-mission-status' }, missionStatusText(mission)),
              shown > 0 && h('ol', { className: 'sk-mission-hints' },
                text.hints.slice(0, shown).map(function(hint, index) { return h('li', { key: index }, hint); })),
              h('div', { className: 'sk-log-actions' },
                h('button', {
                  type: 'button',
                  className: 'sk-secondary sk-small',
                  disabled: running,
                  'aria-label': fillTemplate(__alloT('stem.skatelab.mission_setup_label', 'Set up the attempt: {title}'), { title: text.title }),
                  onClick: function() { startMission(mission.id); }
                }, __alloT('stem.skatelab.mission_setup', 'Set up the attempt')),
                shown < text.hints.length && h('button', {
                  type: 'button',
                  className: 'sk-secondary sk-small',
                  'aria-label': fillTemplate(__alloT('stem.skatelab.mission_hint_label', 'Show hint {n} of {total} for {title}'), { n: shown + 1, total: text.hints.length, title: text.title }),
                  onClick: function() {
                    var next = Object.assign({}, missionHints);
                    next[mission.id] = shown + 1;
                    setMissionHints(next);
                  }
                }, fillTemplate(__alloT('stem.skatelab.mission_hint', 'Hint {n} of {total}'), { n: shown + 1, total: text.hints.length })),
                isActive && h('button', {
                  type: 'button',
                  className: 'sk-link-button',
                  onClick: function() { upd({ activeMission: null }); }
                }, __alloT('stem.skatelab.mission_stop', 'Stop following this mission'))
              ),
              isActive && mission.guess && mode === 'halfpipe' && guessInput('')
            );
          })
        )
      );

      // ---------- Stage C P4-2 explanation level, plain summary, vocabulary ----------
      function levelName(level) {
        if (level === 'simple') return __alloT('stem.skatelab.level_simple', 'Simple (grades 6-8)');
        if (level === 'extended') return __alloT('stem.skatelab.level_extended', 'Extended (grades 11-12 / AP)');
        return __alloT('stem.skatelab.level_standard', 'Standard (grades 9-10)');
      }
      var vocabItems = vocabularyList(scaffoldLevel);
      function vocabKeyDown(event, id) {
        if (event.key === 'Escape' && openVocab === id) {
          event.preventDefault();
          setOpenVocab(null);
        }
      }
      var openVocabItem = null;
      vocabItems.forEach(function(item) { if (item.id === openVocab) openVocabItem = item; });
      var supportPanel = h('section', { className: 'sk-panel sk-support', 'aria-labelledby': 'sk-support-title', 'data-skatelab-support': scaffoldLevel },
        h('h3', { id: 'sk-support-title' }, __alloT('stem.skatelab.support_title', 'Explanations and key words')),
        h('div', { className: 'sk-level' },
          h('label', { htmlFor: 'sk-level' }, __alloT('stem.skatelab.level_label', 'Explanation level')),
          h('select', {
            id: 'sk-level',
            value: SCAFFOLD_LEVELS.indexOf(d.scaffoldLevel) !== -1 ? d.scaffoldLevel : 'auto',
            onChange: function(event) { upd({ scaffoldLevel: event.target.value }); }
          },
            h('option', { value: 'auto' }, fillTemplate(__alloT('stem.skatelab.level_auto', 'Match my grade: {level}'), { level: levelName(autoScaffoldLevel) })),
            SCAFFOLD_LEVELS.map(function(level) { return h('option', { key: level, value: level }, levelName(level)); })
          )
        ),
        scaffoldLevel === 'simple' && h('div', { className: 'sk-plain', 'data-skatelab-plain': 'true' },
          h('h4', null, __alloT('stem.skatelab.plain_title', 'What happened, in plain words')),
          h('p', null, predictionLocked
            ? __alloT('stem.skatelab.plain_locked', 'Make your prediction and run the model. Then this box explains what happened.')
            : plainSummary(sim))),
        h('div', { className: 'sk-vocab', role: 'group', 'aria-label': __alloT('stem.skatelab.vocab_label', 'Key words: choose one to see what it means') },
          vocabItems.map(function(item) {
            var expanded = openVocab === item.id;
            return h('button', {
              key: item.id,
              type: 'button',
              id: 'sk-vocab-' + item.id,
              className: 'sk-vocab-term',
              'aria-expanded': expanded ? 'true' : 'false',
              'aria-controls': 'sk-vocab-def',
              onKeyDown: function(event) { vocabKeyDown(event, item.id); },
              onClick: function() { setOpenVocab(expanded ? null : item.id); }
            }, item.term);
          })
        ),
        h('div', {
          id: 'sk-vocab-def',
          className: 'sk-vocab-def',
          role: 'region',
          'aria-label': openVocabItem ? openVocabItem.term : __alloT('stem.skatelab.vocab_def_label', 'Meaning of the chosen key word'),
          hidden: openVocabItem ? undefined : true
        }, openVocabItem && [
          h('p', { key: 'text' }, h('strong', null, openVocabItem.term + ': '), openVocabItem.text),
          h('button', {
            key: 'close',
            type: 'button',
            className: 'sk-link-button',
            onClick: function() {
              var id = openVocabItem.id;
              setOpenVocab(null);
              focusSoon('sk-vocab-' + id);
            }
          }, __alloT('stem.skatelab.vocab_close', 'Close'))
        ])
      );

      // P4-2 Extended level: vector components and calculus notes at the cursor.
      var extendedMaths = null;
      if (scaffoldLevel === 'extended' && !predictionLocked) {
        var extendedLines = [
          fillTemplate(__alloT('stem.skatelab.ext_velocity', 'Velocity components (v = dr/dt): vₓ = {vx} m/s, v_y = {vy} m/s, |v| = {speed} m/s at t = {time} s.'), {
            vx: formatNumber(currentSample.vx, 3), vy: formatNumber(currentSample.vy, 3), speed: formatNumber(currentSample.speedMps, 3), time: formatNumber(currentSample.time, 2)
          }),
          fbd.applies
            ? fillTemplate(__alloT('stem.skatelab.ext_accel', 'Acceleration from ΣF/m (a = dv/dt): aₓ = {ax} m/s², a_y = {ay} m/s², with m = {mass} kg.'), {
              ax: formatNumber(fbd.netX / Math.max(0.000001, fbd.massKg), 3), ay: formatNumber(fbd.netY / Math.max(0.000001, fbd.massKg), 3), mass: formatNumber(fbd.massKg, 0)
            })
            : __alloT('stem.skatelab.ext_accel_none', 'At this moment the model does not work out the contact force, so a = ΣF/m is not shown.')
        ];
        if (mode === 'halfpipe') {
          if (fbd.pathFrame && fbd.applies) {
            extendedLines.push(fillTemplate(__alloT('stem.skatelab.ext_path_frame', 'Path frame: a_t = {at} m/s² along the ramp and a_n = v²·κ = {an} m/s² toward the centre of the curve (κ = {kappa} 1/m).'), {
              at: formatNumber(fbd.maAlongN / Math.max(0.000001, fbd.massKg), 3),
              an: formatNumber(fbd.maTowardN / Math.max(0.000001, fbd.massKg), 3),
              kappa: formatNumber(currentSample.curvature, 3)
            }));
          }
          extendedLines.push(fillTemplate(__alloT('stem.skatelab.ext_work_halfpipe', 'Work–energy: heat so far Q = ∫μ·N ds = {heat} J and rider work W = Σ N·Δh = {work} J, so KE + PE = PE₀ + W − Q = {mech} J.'), {
            heat: Math.round(finite(currentSample.thermalJ, 0)),
            work: Math.round(finite(currentSample.riderWorkJ, 0)),
            mech: Math.round(finite(currentSample.keJ, 0) + finite(currentSample.peJ, 0))
          }));
          if (sim.hasAir) {
            extendedLines.push(fillTemplate(__alloT('stem.skatelab.ext_rotation', 'Rotation: in the air τ = dL/dt = 0, so L = I·ω = {L} kg·m²/s stays fixed; with I = {I} kg·m², ω = L/I = {omega}°/s.'), {
              L: formatNumber(sim.angularMomentum, 2), I: formatNumber(sim.effectiveInertia, 2), omega: formatNumber(sim.airSpinRate, 0)
            }));
          }
        } else if (mode === 'flat') {
          extendedLines.push(fillTemplate(__alloT('stem.skatelab.ext_flat', 'Integrating a(t): while pushing v(t) = {a}·t; while coasting v(t) = {top} − {decel}·(t − {push}), so the stopping distance d = ∫v dt = v²/(2μg) + ½·a·t² = {distance} m.'), {
            a: formatNumber(sim.pushAccel, 3), top: formatNumber(sim.topSpeed, 3), decel: formatNumber(sim.coastDecel, 4), push: formatNumber(sim.pushTimeS, 1), distance: formatNumber(sim.stopDistanceM, 3)
          }));
        } else {
          var launchRad = finite(sim.angleDeg, 0) * Math.PI / 180;
          extendedLines.push(fillTemplate(__alloT('stem.skatelab.ext_gap', 'Launch components: v₀ₓ = v₀·cos θ = {vx0} m/s, v₀_y = v₀·sin θ = {vy0} m/s. Without drag x(t) = v₀ₓ·t and y(t) = v₀_y·t − ½·g·t²; with drag m·dv/dt = m·g + F_air is integrated numerically.'), {
            vx0: formatNumber(sim.speedMps * Math.cos(launchRad), 3), vy0: formatNumber(sim.speedMps * Math.sin(launchRad), 3)
          }));
          if (sim.hasLandingContact) {
            extendedLines.push(fillTemplate(__alloT('stem.skatelab.ext_impulse', 'Landing impulse: J = ∫(N − m·g) dt = Δp_y = {impulse} N·s over {time} s; average contact force {avg} kN, peak {peak} kN.'), {
              impulse: Math.round(sim.landingNetImpulseNs), time: formatNumber(sim.landingStopTimeS, 3),
              avg: formatNumber(sim.landingAverageForceN / 1000, 2), peak: formatNumber(sim.landingPeakForceN / 1000, 2)
            }));
          }
        }
        extendedMaths = h('div', { className: 'sk-extended', 'data-skatelab-extended': 'true' },
          h('h4', null, __alloT('stem.skatelab.ext_title', 'Extended maths at the time cursor')),
          h('ul', null, extendedLines.map(function(line, index) { return h('li', { key: index }, line); })));
      }

      // ---------- Stage C P4-3 teacher controls and the class-style report ----------
      function updateTeacher(patch) {
        upd(function(current) {
          return { teacher: Object.assign({ locks: {}, assign: null, hideAnswers: false }, current.teacher || {}, patch) };
        });
      }
      function toggleLock(key, on) {
        var locks = Object.assign({}, teacherLocks);
        if (on) locks[key] = d[key];
        else delete locks[key];
        updateTeacher({ locks: locks });
      }
      var assignment = teacherSettings.assign && typeof teacherSettings.assign === 'object' ? teacherSettings.assign : null;
      var assignedTitle = assignment
        ? (assignment.kind === 'mission'
          ? (getMission(assignment.id) ? missionText(assignment.id).title : '')
          : (getInvestigation(assignment.id) ? investigationText(assignment.id).title : ''))
        : '';
      function startAssignment() {
        if (!assignment || running) return;
        if (assignment.kind === 'mission') startMission(assignment.id);
        else if (getInvestigation(assignment.id)) {
          upd({ activeInvestigation: assignment.id });
          announce(fillTemplate(__alloT('stem.skatelab.assign_opened', 'Opened the investigation: {title}.'), { title: assignedTitle }));
        }
      }
      function reportMeta() {
        var date = '';
        try { date = new Date().toLocaleDateString(); } catch (err) {}
        var lang = 'en';
        try { lang = (document.documentElement && document.documentElement.lang) || 'en'; } catch (err) {}
        return { learner: ctx.studentNickname || '', date: date, lang: lang };
      }
      function downloadText(text, name, type) {
        try {
          var blob = new Blob([text], { type: type });
          var url = URL.createObjectURL(blob);
          var link = document.createElement('a');
          link.href = url;
          link.download = name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(function() { try { URL.revokeObjectURL(url); } catch (err) {} }, 1000);
          return true;
        } catch (err) {
          return false;
        }
      }
      function downloadReportCsv() {
        announce(downloadText(buildReportCsv(d), 'skate-lab-report.csv', 'text/csv;charset=utf-8')
          ? __alloT('stem.skatelab.report_csv_done', 'Downloaded the report as skate-lab-report.csv.')
          : __alloT('stem.skatelab.csv_download_failed', 'Download is not available here. Use Copy CSV instead.'));
      }
      // Printing goes through a new window holding the report (window.print()
      // on the app page is ignored in Gemini Canvas).
      function openPrintableReport() {
        var html = buildReportHtml(d, reportMeta());
        var opened = null;
        try { opened = window.open('', '_blank'); } catch (err) { opened = null; }
        if (opened && opened.document) {
          try {
            opened.document.open();
            opened.document.write(html);
            opened.document.close();
            announce(__alloT('stem.skatelab.report_opened', 'The printable report opened in a new window. Use its Print button.'));
            return;
          } catch (err) {}
        }
        announce(downloadText(html, 'skate-lab-report.html', 'text/html;charset=utf-8')
          ? __alloT('stem.skatelab.report_html_saved', 'Pop-ups are blocked, so the printable report was saved as skate-lab-report.html.')
          : __alloT('stem.skatelab.report_failed', 'The report could not be opened or saved here.'));
      }
      var reportButtons = h('div', { className: 'sk-log-actions' },
        h('button', { type: 'button', className: 'sk-secondary', onClick: openPrintableReport }, __alloT('stem.skatelab.report_print_button', 'Printable report')),
        h('button', { type: 'button', className: 'sk-secondary', onClick: downloadReportCsv }, __alloT('stem.skatelab.report_csv_button', 'Report as CSV'))
      );
      var assignmentBanner = !teacherView && assignment && assignedTitle && h('div', { className: 'sk-assignment', 'data-skatelab-assignment': assignment.kind + ':' + assignment.id },
        h('p', null, h('strong', null, __alloT('stem.skatelab.assign_banner', 'Assigned by your teacher:') + ' '), assignedTitle),
        h('button', { type: 'button', className: 'sk-secondary sk-small', disabled: running, onClick: startAssignment },
          assignment.kind === 'mission'
            ? __alloT('stem.skatelab.assign_start_mission', 'Set up this mission')
            : __alloT('stem.skatelab.assign_start_inv', 'Open this investigation'))
      );
      var teacherPanel = teacherView && h('details', { className: 'sk-panel sk-details sk-teacher', 'data-skatelab-teacher': 'true', open: true },
        h('summary', null, __alloT('stem.skatelab.teacher_title', 'Teacher controls')),
        h('p', { className: 'sk-help' }, __alloT('stem.skatelab.teacher_intro', 'These settings are saved with this activity. Learners see the locked values and cannot change them; in teacher mode you can still change everything.')),
        h('fieldset', { className: 'sk-rubric sk-teacher-locks' },
          h('legend', null, __alloT('stem.skatelab.teacher_locks', 'Lock variables at their current values')),
          TEACHER_LOCK_KEYS.map(function(key) {
            var locked = Object.prototype.hasOwnProperty.call(teacherLocks, key);
            var boxId = 'sk-teacher-lock-' + key;
            return h('label', { key: key, className: 'sk-check', htmlFor: boxId },
              h('input', { id: boxId, type: 'checkbox', checked: locked, onChange: function(event) { toggleLock(key, event.target.checked); } }),
              h('span', null, fillTemplate(__alloT('stem.skatelab.teacher_lock_item', '{name}: {value}'), {
                name: lockLabel(key),
                value: lockValueText(key, locked ? teacherLocks[key] : d[key])
              })));
          })
        ),
        h('div', { className: 'sk-level' },
          h('label', { htmlFor: 'sk-teacher-assign' }, __alloT('stem.skatelab.teacher_assign', 'Assign')),
          h('select', {
            id: 'sk-teacher-assign',
            value: assignment ? assignment.kind + ':' + assignment.id : '',
            onChange: function(event) {
              var parts = String(event.target.value || '').split(':');
              updateTeacher({ assign: parts.length === 2 && parts[1] ? { kind: parts[0] === 'mission' ? 'mission' : 'investigation', id: parts[1] } : null });
            }
          },
            h('option', { value: '' }, __alloT('stem.skatelab.teacher_assign_none', 'Nothing assigned')),
            h('optgroup', { label: __alloT('stem.skatelab.teacher_assign_missions', 'Missions') },
              MISSIONS.map(function(mission) { return h('option', { key: mission.id, value: 'mission:' + mission.id }, missionText(mission.id).title); })),
            h('optgroup', { label: __alloT('stem.skatelab.teacher_assign_investigations', 'Guided investigations') },
              INVESTIGATIONS.map(function(investigation) {
                return h('option', { key: investigation.id, value: 'investigation:' + investigation.id }, investigationText(investigation.id).title);
              }))
          )
        ),
        h('label', { className: 'sk-check', htmlFor: 'sk-teacher-hide' },
          h('input', {
            id: 'sk-teacher-hide',
            type: 'checkbox',
            checked: !!teacherSettings.hideAnswers,
            onChange: function(event) { updateTeacher({ hideAnswers: event.target.checked }); }
          }),
          h('span', null, __alloT('stem.skatelab.teacher_hide', 'Hide answers after predictions (learners see their choice and the results, not the verdict)'))),
        h('h4', null, __alloT('stem.skatelab.teacher_report', 'Report of this learner’s work')),
        h('p', { className: 'sk-help' }, __alloT('stem.skatelab.teacher_report_note', 'Runs, predictions, ideas to rethink, missions and claim-evidence-reasoning answers.')),
        reportButtons
      );

      function resetSetup() {
        commitPlayhead(0);
        setLocalStatus(null);
        announcedPhaseRef.current = null;
        if (mode === 'halfpipe') {
          upd({ pumps: 3, pumpTimingId: 'bottom', dropHeightM: 2.4, surfaceId: 'standard', rampDepthM: 2.4, rotationTarget: 180, spinRate: 210, bodyPositionId: 'neutral' });
        } else if (mode === 'flat') {
          upd({ pushForceN: 200, surfaceId: 'standard' });
        } else {
          upd({ speedMph: 17, angleDeg: 35, gapFt: 15, landingCompressionM: LANDING_COMPRESSION_M, windId: 'calm', airDrag: true });
        }
      }

      function modeTab(tabMode, label) {
        return h('button', {
          key: tabMode,
          type: 'button',
          id: 'sk-mode-tab-' + tabMode,
          role: 'tab',
          'aria-selected': mode === tabMode,
          'aria-controls': 'sk-mode-panel',
          tabIndex: mode === tabMode ? 0 : -1,
          disabled: running || (isLocked('mode') && mode !== tabMode),
          onKeyDown: modeKeyDown,
          onClick: function() { chooseMode(tabMode); }
        }, label);
      }

      return h('div', {
        ref: shellRef,
        className: 'skatelab-shell',
        'data-skatelab-overhaul': 'physics-first',
        'data-skatelab-prediction-locked': predictionLocked ? 'true' : 'false',
        'data-skatelab-level': scaffoldLevel,
        onKeyDown: function(event) { if (keyHandlerRef.current) keyHandlerRef.current(event); }
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
          h('div', { className: 'sk-view-switch', role: 'group', 'aria-label': __alloT('stem.skatelab.a11y_simulation_view', 'Simulation view') },
            h('button', {
              type: 'button',
              'aria-pressed': viewMode === '2d',
              disabled: running,
              onClick: function() { chooseView('2d'); }
            }, __alloT('stem.skatelab.view_2d', '2D side view')),
            h('button', {
              type: 'button',
              'aria-pressed': viewMode === '3d',
              disabled: running,
              onClick: function() { chooseView('3d'); }
            }, __alloT('stem.skatelab.view_3d', '3D orbit view'))
          )
        ),

        assignmentBanner,
        teacherPanel,

        h('div', { className: 'sk-workbench' },
          h('section', { ref: skFsRef, 'data-allo-fs-stage': 'true', className: 'sk-stage', 'data-skatelab-run-focus': 'true', 'aria-label': __alloT('stem.skatelab.a11y_simulation_stage', 'Simulation stage'), style: { position: 'relative' } },
            h('button', {
              type: 'button',
              onClick: function () { if (typeof window.__alloStemFS === 'function') window.__alloStemFS(skFsRef.current); },
              'aria-pressed': skFs ? 'true' : 'false',
              'aria-label': skFs
                ? __alloT('stem.skatelab.exit_fullscreen', 'Exit fullscreen simulation (Escape)')
                : __alloT('stem.skatelab.enter_fullscreen', 'View the simulation fullscreen'),
              style: { position: 'absolute', top: 14, right: 14, zIndex: 20, width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,16,30,0.9)', border: '1px solid rgba(148,163,184,0.45)', color: '#e2e8f0', fontSize: 16, fontWeight: 700, cursor: 'pointer' }
            }, h('span', { 'aria-hidden': 'true' }, skFs ? '✕' : '⛶')),
            h('div', { className: 'sk-canvas-frame' },
              h('canvas', {
                ref: canvasRef,
                className: 'sk-canvas',
                role: 'img',
                'data-a11y-static': 'true',
                'aria-label': (function() {
                  return canvasLabel;
                })(),
                'aria-describedby': 'sk-canvas-summary'
              }, __alloT('stem.skatelab.canvas_fallback', 'A visual simulation of skate physics. The full numeric description appears below.'))
            ),
            h('div', { className: 'sk-stage-toolbar' },
              h('div', {
                className: 'sk-live-telemetry',
                'aria-label': telemetryAria
              },
                h('span', { className: 'sk-phase' }, predictionLocked ? __alloT('stem.skatelab.telemetry_locked_phase', 'prediction locked') : phaseLabel(currentSample.phase)),
                h('span', null, predictionLocked ? __alloT('stem.skatelab.telemetry_locked_short', 'Run to reveal measurements') : rounded(currentSample.time, 2) + ' s'),
                !predictionLocked && h('span', { className: 'sk-telemetry-detail' },
                  rounded(currentSample.speedMps * MPS2MPH, 1) + ' mph'),
                !predictionLocked && h('span', { className: 'sk-telemetry-detail' }, telemetryDetail),
                !predictionLocked && h('span', null, telemetryLast)
              ),
              h('div', { className: 'sk-stage-actions' },
                h('label', { className: 'sk-playback', htmlFor: 'sk-playback-speed' },
                  h('span', null, __alloT('stem.skatelab.playback_label', 'Playback')),
                  h('select', {
                    id: 'sk-playback-speed',
                    value: String(playbackSpeed),
                    'aria-describedby': 'sk-playback-scale',
                    onChange: function(event) { changePlaybackSpeed(event.target.value); }
                  },
                    h('option', { value: '0.25' }, __alloT('stem.skatelab.playback_quarter', '¼× slow motion')),
                    h('option', { value: '0.5' }, __alloT('stem.skatelab.playback_half', '½× slow motion')),
                    h('option', { value: '1' }, __alloT('stem.skatelab.playback_real', '1× real time')),
                    h('option', { value: '4' }, __alloT('stem.skatelab.playback_fast', '4× fast')),
                    h('option', { value: '10' }, __alloT('stem.skatelab.playback_faster', '10× fast'))
                  ),
                  h('span', { id: 'sk-playback-scale', className: 'sk-sr-only' }, playbackLabel)
                ),
                running && h('button', {
                  type: 'button',
                  className: 'sk-secondary',
                  'data-skatelab-playback-toggle': 'true',
                  'aria-pressed': paused,
                  onClick: togglePlayback
                }, paused ? __alloT('stem.skatelab.resume_motion', 'Resume motion') : __alloT('stem.skatelab.pause_motion', 'Pause motion')),
                !running && !predictionLocked && lastSimModel && lastSimModel.mode === mode && h('button', {
                  type: 'button',
                  className: 'sk-secondary',
                  'aria-keyshortcuts': 'R',
                  onClick: function() { animateModel(lastSimModel, false); }
                }, __alloT('stem.skatelab.replay', 'Replay'))
              )
            ),
            h('p', { id: 'sk-phase-insight', className: 'sk-phase-insight' },
              h('strong', null, predictionLocked ? __alloT('stem.skatelab.phase_evidence', 'Phase evidence: ') : __alloT('stem.skatelab.focus_now', 'Focus now: ')),
              phaseInsight
            ),
            h('div', { className: 'sk-timeline' },
              h('label', { htmlFor: 'sk-playhead' },
                h('span', null, __alloT('stem.skatelab.motion_timeline', 'Motion timeline')),
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
                    inspectPlayhead(Number(event.target.value) / 100, false);
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
                  'aria-label': __alloT('stem.skatelab.a11y_jump_to_a_motion_phase', 'Jump to a motion phase')
                },
                  phaseEvents.map(function(event, index) {
                    return h('button', {
                      key: 'jump-' + event.label,
                      type: 'button',
                      className: 'sk-phase-jump',
                      disabled: running,
                      'aria-current': index === activePhaseEventIndex ? 'true' : undefined,
                      'aria-label': fillTemplate(__alloT('stem.skatelab.jump_to', 'Jump to {label} at {time} seconds'), {
                        label: event.label,
                        time: rounded(event.time, 2)
                      }),
                      onClick: function() { inspectPlayhead(event.progress, true); }
                    }, event.label);
                  })
                ),
                h('span', { id: 'sk-phase-times', className: 'sk-sr-only' },
                  fillTemplate(__alloT('stem.skatelab.phase_timing', 'Phase timing: {timing}.'), { timing: phaseTimingText }))
              )
            ),
            accessPanel,
            h('div', { className: 'sk-stage-legend' },
              h('b', null, viewMode === '3d'
                ? __alloT('stem.skatelab.legend_perspective', 'Perspective model')
                : __alloT('stem.skatelab.legend_side', 'Side elevation')),
              legendText,
              (comparisonSim ? __alloT('stem.skatelab.legend_previous', ' · lavender dashed = previous run') : '')
            ),
            h('p', { id: 'sk-canvas-summary', className: 'sk-canvas-summary' },
              comparisonExplanation && h('span', { className: 'sk-comparison-insight' },
                h('strong', null, __alloT('stem.skatelab.cause_effect', 'Cause-and-effect check:') + ' '),
                comparisonExplanation
              ),
              h('span', null, canvasSummary)
            )
          ),

          h('aside', { className: 'sk-controls', 'aria-label': __alloT('stem.skatelab.a11y_physics_controls', 'Physics controls') },
            h('div', { className: 'sk-mode-tabs', role: 'tablist', 'aria-label': __alloT('stem.skatelab.a11y_experiment_type', 'Experiment type') },
              modeTab('halfpipe', __alloT('stem.skatelab.mode_halfpipe', 'Halfpipe energy')),
              modeTab('gap', __alloT('stem.skatelab.mode_gap', 'Gap projectile')),
              modeTab('flat', __alloT('stem.skatelab.mode_flat', 'Flat push & coast'))
            ),
            lockedNote('mode'),
            h('div', {
              id: 'sk-mode-panel',
              role: 'tabpanel',
              'aria-labelledby': 'sk-mode-tab-' + mode,
              className: 'sk-control-group'
            },
              h('div', { className: 'sk-control' },
                h('div', { className: 'sk-control-head' }, h('span', null, __alloT('stem.skatelab.control_rider_setup', 'Rider setup')), h('output', null, vehicleName(getVehicle(d.vehicle).id))),
                radioGrid('Vehicle', d.vehicle, ['skate', 'bmx'].map(function(id) {
                  return { id: id, label: vehicleName(id) };
                }), function(value) { upd({ vehicle: value }); }, __alloT('stem.skatelab.control_vehicle', 'Vehicle'), 'vehicle'),
                lockedNote('vehicle')
              ),
              h('div', { className: 'sk-control' },
                h('div', { className: 'sk-control-head' },
                  h('label', { htmlFor: 'sk-gravity' }, __alloT('stem.skatelab.control_gravity', 'Gravity')),
                  h('output', { htmlFor: 'sk-gravity' }, rounded(d.gravity, 2) + ' m/s²')),
                h('select', {
                  id: 'sk-gravity',
                  value: d.gravity,
                  disabled: running || isLocked('gravity'),
                  onChange: function(event) { upd({ gravity: Number(event.target.value) }); }
                },
                  h('option', { value: 9.81 }, __alloT('stem.skatelab.gravity_earth', 'Earth · 9.81 m/s²')),
                  h('option', { value: 3.71 }, __alloT('stem.skatelab.gravity_mars', 'Mars · 3.71 m/s²')),
                  h('option', { value: 1.62 }, __alloT('stem.skatelab.gravity_moon', 'Moon · 1.62 m/s²'))
                ),
                lockedNote('gravity')
              ),
              controls,
              advancedControls,
              viewMode === '3d' && rangeControl('sk-camera', __alloT('stem.skatelab.control_camera', 'Camera azimuth'), d.cameraAzimuth, -55, 55, 1, '°', function(event) {
                upd({ cameraAzimuth: Number(event.target.value) });
              }, __alloT('stem.skatelab.help_camera', 'Rotate the perspective without changing the physics.')),
              h('div', { className: 'sk-checks' },
                h('label', { className: 'sk-check' },
                  h('input', {
                    type: 'checkbox',
                    checked: d.showVectors !== false,
                    disabled: running,
                    onChange: function(event) { upd({ showVectors: event.target.checked }); }
                  }),
                  h('span', null, __alloT('stem.skatelab.check_vectors', 'Motion + force vectors'))
                ),
                h('label', { className: 'sk-check' },
                  h('input', {
                    type: 'checkbox',
                    checked: d.showTrail !== false,
                    disabled: running,
                    onChange: function(event) { upd({ showTrail: event.target.checked }); }
                  }),
                  h('span', null, __alloT('stem.skatelab.check_trail', 'Motion trail'))
                ),
                h('label', { className: 'sk-check' },
                  h('input', {
                    type: 'checkbox',
                    checked: d.showEnergy !== false,
                    disabled: running,
                    onChange: function(event) { upd({ showEnergy: event.target.checked }); }
                  }),
                  h('span', null, __alloT('stem.skatelab.check_energy_hud', 'Energy HUD'))
                ),
                h('label', { className: 'sk-check' },
                  h('input', {
                    type: 'checkbox',
                    checked: !!d.estimateChallenge,
                    disabled: running || isLocked('estimateChallenge'),
                    onChange: function(event) {
                      commitPlayhead(0);
                      setLocalStatus(null);
                      upd({ estimateChallenge: event.target.checked, _predictDefaultV: 2 });
                    }
                  }),
                  h('span', null, __alloT('stem.skatelab.predict_first_toggle', 'Predict before each run'))
                )
              ),
              lockedNote('estimateChallenge')
            ),
            predictCard,
            h('div', { className: 'sk-estimate' },
              h('label', { htmlFor: 'sk-estimate' }, estimateLabel),
              h('input', {
                id: 'sk-estimate',
                type: 'number',
                min: 0,
                step: 0.1,
                value: estimateText,
                disabled: running,
                'aria-invalid': showPredictAlert ? 'true' : undefined,
                'aria-describedby': showPredictAlert ? 'sk-estimate-error' : (estimateBlocked ? 'sk-predict-needed' : undefined),
                onChange: function(event) { upd({ estimateValue: event.target.value, estimateSignature: currentSimulationSignature }); }
              })
            ),
            estimateBlocked && !showPredictAlert && h('p', { id: 'sk-predict-needed', className: 'sk-help sk-predict-needed' },
              __alloT('stem.skatelab.predict_needed', 'Before you run: choose an answer above or type an estimate (zero or more). Run starts once you have predicted.')),
            showPredictAlert && h('p', { id: 'sk-estimate-error', className: 'sk-error', role: 'alert' },
              __alloT('stem.skatelab.predict_required', 'Make a prediction first: choose an answer above or enter an estimate of zero or greater.')),
            activeMissionBanner,
            h('div', { className: 'sk-actions' },
              h('button', {
                type: 'button',
                className: 'sk-run',
                'data-skatelab-launch': 'true',
                disabled: running,
                'aria-disabled': estimateBlocked && !running ? 'true' : undefined,
                'aria-describedby': estimateBlocked && !running ? (showPredictAlert ? 'sk-estimate-error' : 'sk-predict-needed') : undefined,
                'aria-keyshortcuts': 'Space',
                onClick: requestRun
              }, running
                ? (paused ? __alloT('stem.skatelab.run_paused', 'Paused') : __alloT('stem.skatelab.run_running', 'Running…'))
                : runLabel),
              h('button', {
                type: 'button',
                className: 'sk-secondary',
                disabled: running,
                onClick: resetSetup
              }, __alloT('stem.skatelab.reset_setup', 'Reset setup'))
            ),
            h('div', {
              className: 'sk-status',
              'data-result': result ? (simulationSuccessful(result) ? 'success' : 'miss') : ''
            }, statusText),
            h('div', {
              className: 'sk-sr-only',
              role: 'status',
              'aria-live': 'polite',
              'aria-atomic': 'true',
              'data-skatelab-announcer': 'true'
            }, announcement)
          )
        ),

        h('section', { className: 'sk-metrics', 'aria-label': __alloT('stem.skatelab.a11y_live_model_outputs', 'Live model outputs') },
          metricData.map(function(metric) {
            return h('div', { className: 'sk-metric', key: metric.label },
              h('span', { className: 'sk-metric-value' }, predictionLocked ? '—' : metric.value),
              h('span', { className: 'sk-metric-label' }, metric.label)
            );
          })
        ),

        supportPanel,

        h('section', { className: 'sk-linked', 'aria-label': __alloT('stem.skatelab.linked_label', 'Linked graphs: energy, forces and motion at the time cursor') },
          energyPanel,
          fbdPanel,
          motionPanel
        ),

        h('div', { className: 'sk-below' },
          h('section', { className: 'sk-panel', 'aria-labelledby': 'sk-energy-title' },
            h('h3', { id: 'sk-energy-title' }, __alloT('stem.skatelab.ledger_title', 'Energy ledger')),
            ledgerPanel,
            // Simple level keeps the equations one click away ("Show the maths").
            scaffoldLevel === 'simple'
              ? h('details', { className: 'sk-maths', 'data-skatelab-maths': 'true' },
                h('summary', null, __alloT('stem.skatelab.show_maths', 'Show the maths')),
                h('code', { className: 'sk-equation' }, equation))
              : h('code', { className: 'sk-equation' }, equation),
            extendedMaths
          ),
          h('section', { className: 'sk-panel', 'aria-labelledby': 'sk-question-title' },
            h('h3', { id: 'sk-question-title' }, __alloT('stem.skatelab.question_title', 'What should you test next?')),
            h('p', { className: 'sk-question' }, nextQuestion),
            h('p', { className: 'sk-question' },
              predictionLocked
                ? __alloT('stem.skatelab.question_locked', 'Commit your estimate, run the model, and then explain which force or setup variable caused the revealed result.')
                : [
                    h('strong', { key: 'lead' }, mode === 'flat'
                      ? (sim.moves
                        ? __alloT('stem.skatelab.lead_flat_moves', 'The push beats friction, then friction wins. ')
                        : __alloT('stem.skatelab.lead_flat_still', 'The push does not beat friction. '))
                      : (mode === 'halfpipe' && !sim.hasAir
                        ? __alloT('stem.skatelab.lead_no_air', 'Current model never reaches the lip. ')
                        : (simulationSuccessful(sim)
                          ? __alloT('stem.skatelab.lead_target_met', 'Current model meets the target. ')
                          : (sim.landed
                            ? __alloT('stem.skatelab.lead_contact_miss', 'Current model makes physical contact but misses the target. ')
                            : __alloT('stem.skatelab.lead_no_contact', 'Current model misses supported contact. '))))),
                    h('span', { key: 'detail' }, nextDetail)
                  ]
            )
          )
        ),

        h('details', { className: 'sk-panel sk-details', 'data-skatelab-inquiry-panel': 'true' },
          h('summary', null, __alloT('stem.skatelab.inquiry_summary', 'Physics inquiry and experiment log')),
          h('div', { className: 'sk-notes' },
            h('label', { htmlFor: 'sk-hypothesis' }, hypothesisLabel),
            h('textarea', {
              id: 'sk-hypothesis',
              rows: 3,
              value: d.hypothesis,
              'aria-label': __alloT('stem.skatelab.hypothesis_input', 'Skate physics investigation hypothesis'),
              placeholder: __alloT('stem.skatelab.hypothesis_placeholder', 'Write a claim you can test by changing one variable at a time…'),
              onChange: function(event) { upd({ hypothesis: event.target.value }); }
            }),
            predictionRecord,
            h('h4', { id: 'sk-log-title', className: 'sk-log-title', tabIndex: -1 }, fillTemplate(__alloT('stem.skatelab.log_title', 'Experiment log ({n} of 50 runs)'), { n: logEntries.length })),
            logTools,
            logTable,
            !teacherView && h('h4', { className: 'sk-log-title' }, __alloT('stem.skatelab.report_student_title', 'Report for your teacher')),
            !teacherView && reportButtons
          )
        ),

        investigationsPanel,
        missionBoard,

        h('p', { className: 'sk-footer-note' },
          fillTemplate(__alloT('stem.skatelab.footer_model', 'This is a simplified educational model: rigid surfaces, constant gravity, a point-mass rider, optional quadratic drag without aerodynamic lift, and an impulse-matched half-sine landing-force pulse estimated from the selected absorption distance (currently {absorption} m in gap mode). '), {
            absorption: rounded(d.landingCompressionM, 2)
          }) +
          __alloT('stem.skatelab.footer_rolling_model', 'Rolling friction is a constant coefficient μ times the normal force; each pump is a quick 0.3 m leg extension; halfpipe air is straight up and back down at the lip. ') +
          __alloT('stem.skatelab.footer_safety', 'Real skating needs supervision, protective gear, and a properly maintained park.')
        )
      );
    }
  });
})();
