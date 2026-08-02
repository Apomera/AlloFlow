// ═══════════════════════════════════════════════════════════════════════
// AlloFlow STEM Lab — Magnetism & Electromagnetism
//
// An interactive study of magnetic fields and how electricity makes them:
//   • Field Explorer — bar magnets with traced field lines + a draggable
//     compass that points along the real local field; add a 2nd magnet to
//     see attraction vs repulsion; iron-filings view; flip polarity.
//   • Electromagnet — a coil + battery: change current and number of turns
//     and watch the solenoid field B = μ₀·n·I respond; drop in an iron core.
//   • Motor — a current loop in a field: F = B·I·L on each side makes torque,
//     and the commutator flips the current every half-turn to keep it spinning.
//   • Generator (Induction) — Faraday's law ε = −N·ΔΦ/Δt: drag a magnet
//     through a coil to light a bulb; still magnet = zero volts; Lenz's law.
//     Plus a voltage scope (wiggle rhythmically and you have drawn AC) and
//     the classic eddy-current copper-vs-plastic tube race.
//   • Materials — predict-then-test sorter: only iron/nickel/cobalt (and
//     alloys like steel) stick — most metals do NOT. A domain visualizer
//     shows WHY (stroke aligns domains; heat past Curie 770°C scrambles).
//   • Crane — junkyard mini-game: an electromagnet with an off switch
//     grabs ONLY the steel; recycle all 4 magnetic items into the bin.
//   • Transformer — mutual induction V₂/V₁ = N₂/N₁, AC-only (DC → 0 V),
//     and why the grid steps voltage up then down (loss ∝ I²R).
//   • Earth's Field — Earth as a giant (tilted) bar magnet: declination,
//     the magnetosphere that deflects the solar wind, and pole reversals.
//   • Quiz — 22 questions with a quest hook at 15+.
//
// Science-accuracy notes (hedged where honesty demands it):
//   • Field LINES are a schematic dipole model — real bar-magnet fields near
//     the metal are messier; the traced lines capture direction/topology, not
//     exact magnitude. This is stated in-tool.
//   • Solenoid law B = μ₀·n·I (n = turns per metre) is exact for a long ideal
//     solenoid; the iron-core boost is shown as a large multiplier (real cores
//     range from ~100× to a few thousand×) and labelled as approximate.
//   • Earth's magnetic poles are NOT the geographic poles; the field wanders
//     and has reversed many times (last full reversal ≈ 780,000 years ago) at
//     irregular intervals — presented as such, no fixed "clock".
//   NGSS MS-PS2-3 (factors affecting magnetic forces), MS-PS2-5 (fields),
//   MS-PS3-5 / HS-PS2-5 (electricity ↔ magnetism).
// House rules: no AI traffic unless ctx.aiHintsEnabled + explicit button.
// ═══════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  // Register only when the STEM Lab host is present; still run the rest so the
  // pure physics helpers below can be require()'d directly by the test suite.
  var _hasHost = !!(typeof window !== 'undefined' && window.StemLab && typeof window.StemLab.registerTool === 'function');

  var MU0 = 1.25663706212e-6; // vacuum permeability (T·m/A)
  var _field3DCanvas = null;
  var _induction3DCanvas = null;
  var _electro3DCanvas = null;
  var _motor3DCanvas = null;
  var _charge3DCanvas = null;
  var _earth3DCanvas = null;
  var _induction3DRAF = null;
  var _induction3DRunToken = 0;
  var _charge3DRAF = null;
  var _charge3DRunToken = 0;
  var _benchTimer = null;
  var _motorSpinRAF = null;
  var _motorSpinActive = false;
  var _motorSpinConfig = { current: 0, field: 0, currentDir: 1, fieldDir: 1, angle: 0, load: 0, running: false };

  // ── Pure physics helpers (exported for tests) ──────────────────────────
  // 2-D magnetic dipole field direction at point p from a dipole at `mag`
  // whose moment points along its `angle` (radians). Returns an UNnormalised
  // vector {x,y}; magnitude ∝ 1/r³ so nearby magnets dominate (as they do).
  function dipoleFieldAt(px, py, mag) {
    var st = (mag.strength == null ? 1 : mag.strength); // moment magnitude (default 1)
    var mx = Math.cos(mag.angle) * mag.polarity * st; // moment direction × N/S sign
    var my = Math.sin(mag.angle) * mag.polarity * st;
    var rx = px - mag.x, ry = py - mag.y;
    var r2 = rx * rx + ry * ry;
    if (r2 < 1e-6) return { x: 0, y: 0 };
    var r = Math.sqrt(r2);
    var r5 = r2 * r2 * r; // r^5
    var mdotr = mx * rx + my * ry;
    // B ∝ (3(m·r̂)r̂ − m)/r³  →  written with r^5 to avoid re-normalising r̂
    return {
      x: (3 * mdotr * rx - mx * r2) / r5,
      y: (3 * mdotr * ry - my * r2) / r5
    };
  }

  // Superpose the field from every magnet at a point.
  function fieldAt(px, py, magnets) {
    var bx = 0, by = 0;
    for (var i = 0; i < magnets.length; i++) {
      var b = dipoleFieldAt(px, py, magnets[i]);
      bx += b.x; by += b.y;
    }
    return { x: bx, y: by };
  }

  // Preserve each magnet's contribution so the interface can show vector
  // superposition explicitly instead of presenting only a mysterious total.
  function fieldComponentsAt(px, py, magnets) {
    return magnets.map(function (mag, index) {
      var b = dipoleFieldAt(px, py, mag);
      return { index: index, x: b.x, y: b.y, magnitude: Math.sqrt(b.x * b.x + b.y * b.y) };
    });
  }

  // Deterministic Hall-probe model. Raw dipole values are scaled to readable
  // relative microtesla units; optional repeatable noise teaches uncertainty
  // without making saved investigations change between renders.
  function fieldProbeReading(px, py, magnets, noisePercent) {
    var x = Number(px) || 0, y = Number(py) || 0;
    var sources = Array.isArray(magnets) ? magnets : [];
    var b = fieldAt(x, y, sources);
    var scale = 1e6;
    var bx = b.x * scale, by = b.y * scale;
    var magnitude = Math.sqrt(bx * bx + by * by);
    var noise = Math.max(0, Math.min(20, Number(noisePercent) || 0));
    var wave = Math.sin(x * 12.9898 + y * 78.233 + sources.length * 37.719);
    var factor = 1 + wave * noise / 100;
    return {
      x: x, y: y,
      bx: bx, by: by,
      magnitude: magnitude,
      measuredBx: bx * factor,
      measuredBy: by * factor,
      measuredMagnitude: magnitude * factor,
      uncertainty: magnitude * noise / 100,
      noisePercent: noise,
      angle: magnitude < 1e-12 ? 0 : Math.atan2(by, bx)
    };
  }

  function fieldScanSeries(magnets, pathName, distances, offset, noisePercent) {
    var path = pathName === 'equatorial' ? 'equatorial' : 'axial';
    var sideOffset = Number(offset) || 0;
    return (distances || []).map(function (distance) {
      var r = Math.max(1, Math.abs(Number(distance) || 0));
      var x = path === 'axial' ? r : sideOffset;
      var y = path === 'axial' ? sideOffset : -r;
      var reading = fieldProbeReading(x, y, magnets, noisePercent);
      reading.distance = r;
      reading.path = path;
      return reading;
    });
  }

  function fieldPowerLawFit(samples) {
    var usable = (samples || []).filter(function (sample) {
      return Number(sample.distance) > 0 && Number(sample.measuredMagnitude) > 0;
    });
    if (usable.length < 2) return { count: usable.length, exponent: null, coefficient: null, rSquared: null };
    var xs = usable.map(function (sample) { return Math.log(Number(sample.distance)); });
    var ys = usable.map(function (sample) { return Math.log(Number(sample.measuredMagnitude)); });
    var meanX = xs.reduce(function (sum, value) { return sum + value; }, 0) / xs.length;
    var meanY = ys.reduce(function (sum, value) { return sum + value; }, 0) / ys.length;
    var covariance = 0, varianceX = 0, varianceY = 0;
    for (var i = 0; i < xs.length; i++) {
      covariance += (xs[i] - meanX) * (ys[i] - meanY);
      varianceX += Math.pow(xs[i] - meanX, 2);
      varianceY += Math.pow(ys[i] - meanY, 2);
    }
    var exponent = varianceX < 1e-12 ? 0 : covariance / varianceX;
    var intercept = meanY - exponent * meanX;
    var rSquared = varianceX < 1e-12 || varianceY < 1e-12 ? 0 : covariance * covariance / (varianceX * varianceY);
    return { count: usable.length, exponent: exponent, coefficient: Math.exp(intercept), rSquared: rSquared };
  }
  // Full 3-D dipole model. yaw turns around the vertical y axis; pitch tilts
  // above or below the horizontal plane. Polarity reverses the dipole moment.
  function dipoleMoment3D(mag) {
    var yaw = Number(mag.yaw) || 0, pitch = Number(mag.pitch) || 0;
    var strength = (mag.strength == null ? 1 : Number(mag.strength)) * (mag.polarity < 0 ? -1 : 1);
    return {
      x: Math.cos(pitch) * Math.cos(yaw) * strength,
      y: Math.sin(pitch) * strength,
      z: Math.cos(pitch) * Math.sin(yaw) * strength
    };
  }

  function dipoleFieldAt3D(px, py, pz, mag) {
    var moment = dipoleMoment3D(mag);
    var rx = px - (Number(mag.x) || 0), ry = py - (Number(mag.y) || 0), rz = pz - (Number(mag.z) || 0);
    var r2 = rx * rx + ry * ry + rz * rz;
    if (r2 < 1e-8) return { x: 0, y: 0, z: 0 };
    var r = Math.sqrt(r2), r5 = r2 * r2 * r;
    var mdotr = moment.x * rx + moment.y * ry + moment.z * rz;
    return {
      x: (3 * mdotr * rx - moment.x * r2) / r5,
      y: (3 * mdotr * ry - moment.y * r2) / r5,
      z: (3 * mdotr * rz - moment.z * r2) / r5
    };
  }

  function fieldAt3D(px, py, pz, magnets) {
    var bx = 0, by = 0, bz = 0;
    for (var i = 0; i < magnets.length; i++) {
      var b = dipoleFieldAt3D(px, py, pz, magnets[i]);
      bx += b.x; by += b.y; bz += b.z;
    }
    return { x: bx, y: by, z: bz };
  }

  function fieldComponentsAt3D(px, py, pz, magnets) {
    return magnets.map(function (mag, index) {
      var b = dipoleFieldAt3D(px, py, pz, mag);
      return { index: index, x: b.x, y: b.y, z: b.z, magnitude: Math.sqrt(b.x * b.x + b.y * b.y + b.z * b.z) };
    });
  }

  function traceLine3D(seed, magnets, dir, opts) {
    opts = opts || {};
    var step = Math.max(0.02, Number(opts.step) || 0.14);
    var maxSteps = Math.max(2, Math.round(opts.maxSteps || 220));
    var bound = Math.max(1, Number(opts.bound) || 6.5);
    var bodyR = Math.max(0.1, Number(opts.bodyR) || 0.38);
    var x = Number(seed.x) || 0, y = Number(seed.y) || 0, z = Number(seed.z) || 0;
    var points = [{ x: x, y: y, z: z }];
    var sign = dir < 0 ? -1 : 1;
    for (var i = 0; i < maxSteps; i++) {
      var b = fieldAt3D(x, y, z, magnets);
      var magnitude = Math.sqrt(b.x * b.x + b.y * b.y + b.z * b.z);
      if (magnitude < 1e-12) break;
      x += sign * step * b.x / magnitude;
      y += sign * step * b.y / magnitude;
      z += sign * step * b.z / magnitude;
      if (Math.abs(x) > bound || Math.abs(y) > bound || Math.abs(z) > bound) break;
      points.push({ x: x, y: y, z: z });
      var enteredBody = magnets.some(function (mag) {
        var dx = x - mag.x, dy = y - mag.y, dz = z - mag.z;
        return dx * dx + dy * dy + dz * dz < bodyR * bodyR;
      });
      if (enteredBody && points.length > 4) break;
    }
    return points;
  }

  // Coarse-to-fine deterministic search for a weak-field point. This is a
  // numerical investigation aid, not a claim that every setup has an exact null.
  function findFieldNull3D(magnets, opts) {
    opts = opts || {};
    var bound = Math.max(1, Number(opts.bound) || 4);
    var steps = Math.max(5, Math.round(opts.steps || 11));
    var center = { x: 0, y: 0, z: 0 }, span = bound, best = null;
    for (var pass = 0; pass < 3; pass++) {
      for (var ix = 0; ix < steps; ix++) {
        for (var iy = 0; iy < steps; iy++) {
          for (var iz = 0; iz < steps; iz++) {
            var x = center.x - span + 2 * span * ix / (steps - 1);
            var y = center.y - span + 2 * span * iy / (steps - 1);
            var z = center.z - span + 2 * span * iz / (steps - 1);
            var blocked = magnets.some(function (mag) {
              var dx = x - mag.x, dy = y - mag.y, dz = z - mag.z;
              return dx * dx + dy * dy + dz * dz < 0.75 * 0.75;
            });
            if (blocked) continue;
            var parts = fieldComponentsAt3D(x, y, z, magnets);
            var b = fieldAt3D(x, y, z, magnets);
            var magnitude = Math.sqrt(b.x * b.x + b.y * b.y + b.z * b.z);
            var componentSum = parts.reduce(function (sum, part) { return sum + part.magnitude; }, 0);
            if (componentSum < 1e-7) continue;
            // The ratio distinguishes genuine vector cancellation from the
            // uninteresting weak field infinitely far from every source.
            var cancellation = magnitude / componentSum;
            var score = cancellation + 1e-7 / componentSum;
            if (!best || score < best.score) best = { x: x, y: y, z: z, magnitude: magnitude, cancellation: cancellation, score: score };
          }
        }
      }
      if (!best) break;
      center = { x: best.x, y: best.y, z: best.z };
      span *= 0.22;
    }
    return best || { x: 0, y: 0, z: 0, magnitude: 0, cancellation: 0, score: 0 };
  }

  // Trace one field line by stepping along the local field direction.
  // `dir` = +1 follows the field (out of N), −1 traces backward (into S).
  function traceLine(seedX, seedY, magnets, dir, opts) {
    opts = opts || {};
    var step = opts.step || 6;
    var maxSteps = opts.maxSteps || 260;
    var bound = opts.bound || 460;
    var pts = [[seedX, seedY]];
    var x = seedX, y = seedY;
    for (var i = 0; i < maxSteps; i++) {
      var b = fieldAt(x, y, magnets);
      var mag = Math.sqrt(b.x * b.x + b.y * b.y);
      if (mag < 1e-12) break;
      x += dir * step * b.x / mag;
      y += dir * step * b.y / mag;
      if (x < -bound || x > bound || y < -bound || y > bound) break;
      // stop when we plunge into a magnet body (the other pole)
      var swallowed = false;
      for (var j = 0; j < magnets.length; j++) {
        var dx = x - magnets[j].x, dy = y - magnets[j].y;
        if (dx * dx + dy * dy < (opts.poleR || 14) * (opts.poleR || 14)) { swallowed = true; break; }
      }
      pts.push([x, y]);
      if (swallowed) break;
    }
    return pts;
  }

  // Ideal long-solenoid interior field: B = μ₀ · (N/L) · I  (tesla).
  // coreMult models a soft-iron core's relative permeability (approx).
  function solenoidField(turns, current, lengthM, coreMult) {
    var n = turns / Math.max(lengthM, 1e-6);
    return MU0 * n * current * (coreMult || 1);
  }

  var CORE_MATERIALS = {
    air: { name: 'Air', initialMu: 1, saturationT: Infinity },
    soft: { name: 'Soft iron', initialMu: 600, saturationT: 1.6 },
    steel: { name: 'Steel', initialMu: 200, saturationT: 1.3 }
  };

  // A finite solenoid's center field includes the coil radius instead of
  // assuming an infinitely long coil. The optional core response saturates.
  function coreAdjustedField(airField, materialKey) {
    var material = CORE_MATERIALS[materialKey] || CORE_MATERIALS.air;
    var sign = airField < 0 ? -1 : 1;
    var air = Math.abs(Number(airField) || 0);
    if (material.initialMu <= 1 || !Number.isFinite(material.saturationT)) return sign * air;
    return sign * (air + material.saturationT * Math.tanh((material.initialMu - 1) * air / material.saturationT));
  }

  function finiteSolenoidCenterField(turns, current, lengthM, radiusM, materialKey) {
    var nTurns = Math.max(0, Math.abs(Number(turns) || 0));
    var amps = Math.abs(Number(current) || 0);
    var length = Math.max(1e-5, Math.abs(Number(lengthM) || 0));
    var radius = Math.max(1e-5, Math.abs(Number(radiusM) || 0));
    var airField = MU0 * nTurns * amps / (2 * Math.sqrt(radius * radius + length * length / 4));
    return coreAdjustedField(airField, materialKey);
  }

  function solenoidWireLength(turns, radiusM, lengthM) {
    var nTurns = Math.max(0, Math.abs(Number(turns) || 0));
    var circumferenceTravel = 2 * Math.PI * Math.max(0, Math.abs(Number(radiusM) || 0)) * nTurns;
    return Math.sqrt(circumferenceTravel * circumferenceTravel + Math.pow(Math.max(0, Math.abs(Number(lengthM) || 0)), 2));
  }

  function solenoidHeatingIndex(turns, current, radiusM, lengthM) {
    var wireLength = solenoidWireLength(turns, radiusM, lengthM);
    return Math.pow(Math.abs(Number(current) || 0), 2) * wireLength;
  }

  // Qualitative off-axis finite-coil field: a stack of softened loop dipoles.
  // It preserves superposition, closed-loop topology, geometry, and direction;
  // the separate center-field helper supplies the quantitative measurement.
  function solenoidFieldAt3D(px, py, pz, coil, opts) {
    coil = coil || {}; opts = opts || {};
    var turns = Math.max(0, Math.abs(Number(coil.turns) || 0));
    var current = Math.max(0, Math.abs(Number(coil.current) || 0));
    if (!turns || !current) return { x: 0, y: 0, z: 0 };
    var length = Math.max(0.3, Math.abs(Number(coil.length) || 2.8));
    var radius = Math.max(0.15, Math.abs(Number(coil.radius) || 1));
    var segments = Math.max(3, Math.round(opts.segments || 11));
    var direction = (coil.currentDir < 0 ? -1 : 1) * (coil.windingDir < 0 ? -1 : 1);
    var physicalAir = finiteSolenoidCenterField(turns, current, Math.max(0.01, Number(coil.lengthM) || 0.12), Math.max(0.005, Number(coil.radiusM) || 0.03), 'air');
    var physicalCore = finiteSolenoidCenterField(turns, current, Math.max(0.01, Number(coil.lengthM) || 0.12), Math.max(0.005, Number(coil.radiusM) || 0.03), coil.material || 'air');
    var coreGain = physicalAir > 1e-12 ? Math.min(30, physicalCore / physicalAir) : 1;
    var momentPerSegment = direction * turns * current * radius * radius * coreGain / (segments * 80);
    var soften2 = Math.pow(Math.max(0.18, radius * 0.42), 2);
    var bx = 0, by = 0, bz = 0;
    for (var i = 0; i < segments; i++) {
      var sx = -length / 2 + length * (i + 0.5) / segments;
      var rx = px - sx, ry = py, rz = pz;
      var geometricR2 = rx * rx + ry * ry + rz * rz;
      var softenedR2 = geometricR2 + soften2;
      var r = Math.sqrt(softenedR2), r5 = softenedR2 * softenedR2 * r;
      var mdotr = momentPerSegment * rx;
      bx += (3 * mdotr * rx - momentPerSegment * geometricR2) / r5;
      by += 3 * mdotr * ry / r5;
      bz += 3 * mdotr * rz / r5;
    }
    return { x: bx, y: by, z: bz };
  }

  function traceSolenoidLine3D(seed, coil, dir, opts) {
    opts = opts || {};
    var step = Math.max(0.02, Number(opts.step) || 0.12);
    var maxSteps = Math.max(2, Math.round(opts.maxSteps || 220));
    var bound = Math.max(1, Number(opts.bound) || 6.5);
    var x = Number(seed.x) || 0, y = Number(seed.y) || 0, z = Number(seed.z) || 0;
    var points = [{ x: x, y: y, z: z }], sign = dir < 0 ? -1 : 1;
    for (var i = 0; i < maxSteps; i++) {
      var field = solenoidFieldAt3D(x, y, z, coil);
      var magnitude = Math.sqrt(field.x * field.x + field.y * field.y + field.z * field.z);
      if (magnitude < 1e-10) break;
      x += sign * step * field.x / magnitude; y += sign * step * field.y / magnitude; z += sign * step * field.z / magnitude;
      if (Math.abs(x) > bound || Math.abs(y) > bound || Math.abs(z) > bound) break;
      points.push({ x: x, y: y, z: z });
    }
    return points;
  }
  // Force on one wire side of the motor loop: F = B · I · L (newtons).
  function wireForce(B, current, lengthM) { return B * current * lengthM; }

  // Vector form of the magnetic force on a straight current-carrying wire.
  // θ is measured from the field direction: F = I L × B, so |F| ∝ sin θ.
  function wireForceVectorState(current, fieldStrength, angleDeg, length, currentDir, fieldDir) {
    var I = Math.max(0, Math.min(10, Math.abs(Number(current) || 0)));
    var B = Math.max(0, Math.min(10, Math.abs(Number(fieldStrength) || 0)));
    var L = Math.max(0.1, Math.min(20, Math.abs(Number(length) || 0)));
    var theta = Math.max(0, Math.min(90, Number(angleDeg) || 0));
    var currentSign = currentDir < 0 ? -1 : 1;
    var fieldSign = fieldDir < 0 ? -1 : 1;
    var radians = theta * Math.PI / 180;
    var signedForce = currentSign * fieldSign * I * L * B * Math.sin(radians);
    return {
      current: I, field: B, length: L, angle: theta,
      currentSign: currentSign, fieldSign: fieldSign,
      wireVector: { x: currentSign * Math.sin(radians), y: currentSign * Math.cos(radians), z: 0 },
      fieldVector: { x: 0, y: fieldSign, z: 0 },
      forceVector: { x: 0, y: 0, z: signedForce },
      signedForce: signedForce,
      magnitude: Math.abs(signedForce),
      forceDirection: signedForce >= 0 ? '+z' : '−z',
      parallelFraction: Math.cos(radians),
      perpendicularFraction: Math.sin(radians),
      deadSpot: Math.abs(signedForce) < 1e-9
    };
  }
  // Bridge the wire-force model to mechanical work. A moving wire turns the
  // magnetic force into torque (tau = F*r) and power (P = F*v). Values stay
  // relative because the force-lab sliders are teaching controls, not SI units.
  function motorPowerBridgeState(current, fieldStrength, angleDeg, length, speedRpm, currentDir, fieldDir) {
    var forceState = wireForceVectorState(current, fieldStrength, angleDeg, length, currentDir, fieldDir);
    var rpm = Math.max(0, Math.min(600, Math.abs(Number(speedRpm) || 0)));
    var radius = Math.max(0.1, Math.min(10, forceState.length / 2));
    var omega = rpm * 2 * Math.PI / 60;
    var tangentialSpeed = omega * radius;
    var torque = forceState.magnitude * radius;
    var mechanicalPower = torque * omega;
    var workPerTurn = torque * 2 * Math.PI;
    return Object.assign({}, forceState, {
      speedRpm: rpm,
      radius: radius,
      omega: omega,
      tangentialSpeed: tangentialSpeed,
      torque: torque,
      mechanicalPower: mechanicalPower,
      workPerTurn: workPerTurn,
      moving: rpm > 0,
      powerActive: mechanicalPower > 1e-9
    });
  }
  // Relative torque for the visible loop angle. The direction reverses when
  // either current or field reverses; the magnitude follows τ ∝ I·B·sinθ.
  function motorTorqueFactor(current, fieldStrength, angleDeg, currentDir, fieldDir) {
    var sign = (currentDir < 0 ? -1 : 1) * (fieldDir < 0 ? -1 : 1);
    return sign * Math.abs(current * fieldStrength) * Math.abs(Math.sin(angleDeg * Math.PI / 180));
  }

  function motorLoadState(current, fieldStrength, angleDeg, load) {
    var angle = ((Number(angleDeg) || 0) % 360 + 360) % 360;
    var leverage = Math.abs(Math.sin(angle * Math.PI / 180));
    var baseTorque = Math.abs(Number(current) || 0) * Math.abs(Number(fieldStrength) || 0) / 12;
    var magneticTorque = baseTorque * leverage;
    var loadTorque = Math.max(0, Number(load) || 0);
    var margin = magneticTorque - loadTorque;
    return {
      angle: angle,
      leverage: leverage,
      magneticTorque: magneticTorque,
      loadTorque: loadTorque,
      margin: margin,
      ratio: loadTorque > 0 ? magneticTorque / loadTorque : Infinity,
      stalled: loadTorque > 0 && margin < -1e-6
    };
  }

  function motorLoadTrialState(samples, prediction) {
    var list = Array.isArray(samples) ? samples.filter(function (sample) {
      return sample && Number.isFinite(Number(sample.load));
    }).map(function (sample) {
      return { load: Math.max(0, Number(sample.load) || 0), margin: Number(sample.margin) || 0, stalled: !!sample.stalled };
    }) : [];
    var passingMax = null;
    var stalledMin = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].stalled) stalledMin = stalledMin == null ? list[i].load : Math.min(stalledMin, list[i].load);
      else passingMax = passingMax == null ? list[i].load : Math.max(passingMax, list[i].load);
    }
    var bracketed = passingMax != null && stalledMin != null && passingMax <= stalledMin;
    var observed = bracketed ? (passingMax + stalledMin) / 2 : null;
    var predicted = Math.max(0, Number(prediction) || 0);
    return {
      samples: list,
      count: list.length,
      passingMax: passingMax,
      stalledMin: stalledMin,
      bracketed: bracketed,
      observed: observed,
      predicted: predicted,
      delta: observed == null ? null : observed - predicted
    };
  }

  function motorSpatialState(angleDeg, current, fieldStrength, currentDir, fieldDir) {
    var angle = ((Number(angleDeg) || 0) % 360 + 360) % 360;
    var supplyDirection = currentDir < 0 ? -1 : 1;
    var fieldDirection = fieldDir < 0 ? -1 : 1;
    var commutatorPhase = Math.floor((angle + 1e-7) / 180) % 2 === 0 ? 1 : -1;
    var segmentDirection = supplyDirection * commutatorPhase;
    var torque = motorTorqueFactor(current, fieldStrength, angle, supplyDirection, fieldDirection);
    var normalizedTorque = Math.min(1, Math.abs(torque) / 48);
    return {
      angle: angle,
      halfTurn: angle < 180 ? 1 : 2,
      commutatorPhase: commutatorPhase,
      segmentDirection: segmentDirection,
      fieldDirection: fieldDirection,
      torque: torque,
      torqueDirection: torque >= 0 ? 1 : -1,
      torquePercent: normalizedTorque * 100,
      force: wireForce(Math.abs(Number(fieldStrength) || 0) / 10, Math.abs(Number(current) || 0), 0.05),
      deadSpot: Math.abs(Math.sin(angle * Math.PI / 180)) < 0.08 || !(Number(current) && Number(fieldStrength))
    };
  }

  // Steady-state energy model for a motor mechanically coupled to a generator.
  // The motor torque falls linearly with speed, while the generator load creates
  // an opposing torque proportional to k²ω/R. This makes heavier electrical
  // loads slow the shared shaft and keeps useful output below electrical input.
  function motorGeneratorBench(current, motorField, loadOhms, friction, turns, generatorField) {
    var amps = Math.max(0, Math.abs(Number(current) || 0));
    var field = Math.max(0, Math.abs(Number(motorField) || 0));
    var resistance = Math.max(1, Math.abs(Number(loadOhms) || 40));
    var frictionLevel = Math.max(0, Math.abs(Number(friction) || 0));
    var genTurns = Math.max(1, Math.abs(Number(turns) || 80));
    var genField = Math.max(0, Math.abs(Number(generatorField) || 0));
    var inputVoltage = 12;
    var inputPower = inputVoltage * amps;
    var noLoadOmega = amps > 0 && field > 0 ? 20 + 8 * amps * field : 0;
    var stallTorque = 0.04 * amps * field;
    var frictionTorque = amps > 0 ? 0.005 + frictionLevel * 0.008 : 0;
    var generatorConstant = 0.0008 * genTurns * genField;
    var generatorEfficiency = 0.84;
    var denominator = noLoadOmega > 0
      ? stallTorque / noLoadOmega + generatorConstant * generatorConstant / (resistance * generatorEfficiency)
      : 0;
    var omega = denominator > 0
      ? Math.max(0, Math.min(noLoadOmega, (stallTorque - frictionTorque) / denominator))
      : 0;
    var rpm = omega * 60 / (2 * Math.PI);
    var motorTorque = noLoadOmega > 0 ? Math.max(0, stallTorque * (1 - omega / noLoadOmega)) : 0;
    var generatedVoltage = generatorConstant * omega;
    var loadCurrent = generatedVoltage / resistance;
    var outputPower = Math.min(inputPower, generatedVoltage * loadCurrent);
    var shaftPower = motorTorque * omega;
    var losses = Math.max(0, inputPower - outputPower);
    return {
      inputVoltage: inputVoltage, inputCurrent: amps, inputPower: inputPower,
      omega: omega, rpm: rpm, noLoadRPM: noLoadOmega * 60 / (2 * Math.PI),
      stallTorque: stallTorque, motorTorque: motorTorque, frictionTorque: frictionTorque,
      generatorConstant: generatorConstant, generatedVoltage: generatedVoltage,
      loadCurrent: loadCurrent, loadOhms: resistance, outputPower: outputPower,
      shaftPower: shaftPower, losses: losses,
      efficiency: inputPower > 0 ? outputPower / inputPower : 0
    };
  }

  // One deterministic time step for the coupled motor-generator system.
  // The electrical side includes motor resistance and back EMF; the mechanical
  // side includes inertia, generator counter-torque, and shaft friction.
  function motorGeneratorTransientStep(state, controls, dtSeconds) {
    var previous = state || {};
    var c = controls || {};
    var dt = Math.max(0, Math.min(0.25, Number(dtSeconds) || 0));
    var omega = Math.max(0, Number(previous.omega) || 0);
    var temperature = Math.max(22, Number(previous.temperature) || 22);
    var time = Math.max(0, Number(previous.time) || 0);
    var currentSetting = Math.max(0, Math.abs(Number(c.current) || 0));
    var motorField = Math.max(0, Math.abs(Number(c.motorField) || 0));
    var loadOhms = Math.max(1, Math.abs(Number(c.loadOhms) || 40));
    var frictionLevel = Math.max(0, Math.abs(Number(c.friction) || 0));
    var turns = Math.max(1, Math.abs(Number(c.turns) || 80));
    var generatorField = Math.max(0, Math.abs(Number(c.generatorField) || 0));
    var supplyVoltage = 12;
    var motorResistance = currentSetting > 0 ? supplyVoltage / currentSetting : 1e9;
    var motorConstant = 0.025 * motorField;
    var backEMF = motorConstant * omega;
    var motorCurrent = currentSetting > 0
      ? Math.max(0, Math.min(currentSetting, (supplyVoltage - backEMF) / motorResistance))
      : 0;
    var motorTorque = motorConstant * motorCurrent;
    var generatorConstant = 0.0008 * turns * generatorField;
    var generatedVoltage = generatorConstant * omega;
    var loadCurrent = generatedVoltage / loadOhms;
    var outputPower = generatedVoltage * loadCurrent;
    var generatorEfficiency = 0.84;
    var generatorTorque = omega > 1e-8 ? outputPower / (generatorEfficiency * omega) : 0;
    var availableBeforeFriction = motorTorque - generatorTorque;
    var frictionLimit = omega > 0 || motorCurrent > 0 ? 0.005 + frictionLevel * 0.008 : 0;
    var frictionTorque = omega > 0.05
      ? frictionLimit
      : Math.min(frictionLimit, Math.max(0, availableBeforeFriction));
    var netTorque = motorTorque - generatorTorque - frictionTorque;
    var inertia = 0.012;
    var nextOmega = Math.max(0, omega + netTorque / inertia * dt);
    if (nextOmega === 0 && netTorque < 0) netTorque = 0;
    var inputPower = supplyVoltage * motorCurrent;
    var copperLoss = motorCurrent * motorCurrent * motorResistance;
    var generatorLoss = outputPower * (1 / generatorEfficiency - 1);
    var mechanicalLoss = frictionTorque * omega;
    var losses = copperLoss + generatorLoss + mechanicalLoss;
    var kineticPower = netTorque * omega;
    var cooling = Math.max(0, temperature - 22) * 0.08;
    var nextTemperature = Math.max(22, temperature + (losses * 0.12 - cooling) * dt);
    return {
      time: time + dt, omega: nextOmega, rpm: nextOmega * 60 / (2 * Math.PI),
      temperature: nextTemperature, inputVoltage: supplyVoltage,
      inputCurrent: motorCurrent, inputPower: inputPower, backEMF: backEMF,
      motorResistance: motorResistance, motorTorque: motorTorque,
      generatorConstant: generatorConstant, generatedVoltage: generatedVoltage,
      loadCurrent: loadCurrent, loadOhms: loadOhms, outputPower: outputPower,
      generatorTorque: generatorTorque, frictionTorque: frictionTorque,
      copperLoss: copperLoss, generatorLoss: generatorLoss,
      mechanicalLoss: mechanicalLoss, losses: losses, kineticPower: kineticPower,
      efficiency: inputPower > 0 ? Math.max(0, Math.min(1, outputPower / inputPower)) : 0
    };
  }

  function motorGeneratorSimulate(controls, seconds, dtSeconds, initialState) {
    var duration = Math.max(0, Number(seconds) || 0);
    var dt = Math.max(0.02, Math.min(0.25, Number(dtSeconds) || 0.1));
    var state = Object.assign({ time: 0, omega: 0, temperature: 22 }, initialState || {});
    var trace = [motorGeneratorTransientStep(state, controls, 0)];
    while (state.time < duration - 1e-9) {
      state = motorGeneratorTransientStep(state, controls, Math.min(dt, duration - state.time));
      trace.push(state);
    }
    return trace;
  }

  function evaluateMotorGeneratorMission(trace) {
    var samples = Array.isArray(trace) ? trace.filter(function (sample) { return sample && isFinite(sample.time); }) : [];
    if (!samples.length) return { pass: false, rpm: 0, voltage: 0, power: 0, maxTemperature: 22, checks: [false, false, false, true] };
    var endTime = samples[samples.length - 1].time;
    var settled = samples.filter(function (sample) { return sample.time >= Math.max(0, endTime - 2); });
    function average(key) {
      return settled.reduce(function (sum, sample) { return sum + (Number(sample[key]) || 0); }, 0) / Math.max(1, settled.length);
    }
    var rpm = average('rpm');
    var voltage = average('generatedVoltage');
    var power = average('outputPower');
    var maxTemperature = samples.reduce(function (mx, sample) { return Math.max(mx, Number(sample.temperature) || 22); }, 22);
    var checks = [rpm >= 500, voltage >= 14 && voltage <= 18, power >= 5, maxTemperature <= 65];
    return { pass: checks.every(Boolean), rpm: rpm, voltage: voltage, power: power, maxTemperature: maxTemperature, checks: checks };
  }

  function describeMotorGeneratorTrialChange(current, previous) {
    if (!current || !previous) return { count: 0, keys: [], labels: [], label: 'baseline', fair: true };
    var variables = [
      ['loadOhms', 'generator load', 40],
      ['turns', 'generator turns', 80],
      ['field', 'generator field', 4],
      ['current', 'motor current', 3],
      ['motorField', 'motor field', 4],
      ['friction', 'shaft friction', 3]
    ];
    var changed = variables.filter(function (entry) {
      var currentValue = current[entry[0]] == null ? entry[2] : Number(current[entry[0]]);
      var previousValue = previous[entry[0]] == null ? entry[2] : Number(previous[entry[0]]);
      return currentValue !== previousValue;
    });
    var keys = changed.map(function (entry) { return entry[0]; });
    var labels = changed.map(function (entry) { return entry[1]; });
    return {
      count: changed.length,
      keys: keys,
      labels: labels,
      label: changed.length === 0 ? 'repeat design' : (changed.length === 1 ? labels[0] + ' only' : labels.join(' + ')),
      fair: changed.length <= 1
    };
  }
  // Far-field, axial dipole-pair force magnitude. The 60-unit reference keeps
  // the lab readout intuitive while preserving the important F ∝ m₁m₂/r⁴
  // relationship. Near contact, real bar magnets depart from this model.
  function magnetPairForce(strength1, strength2, distance) {
    var s1 = Math.max(0, Math.abs(strength1 || 0));
    var s2 = Math.max(0, Math.abs(strength2 || 0));
    var r = Math.max(1, Math.abs(distance || 0));
    return s1 * s2 * Math.pow(60 / r, 4);
  }

  var ANALYZER_SPECIES = {
    proton: { name: 'Proton', symbol: 'H⁺', mass: 1, charge: 1, color: '#fbbf24', dash: '2 4' },
    deuteron: { name: 'Deuteron', symbol: 'D⁺', mass: 2, charge: 1, color: '#34d399', dash: '8 4' },
    helium: { name: 'Helium ion', symbol: 'He²⁺', mass: 4, charge: 2, color: '#38bdf8', dash: '3 4' },
    carbon: { name: 'Carbon-12 ion', symbol: 'C⁺', mass: 12, charge: 1, color: '#f43f5e', dash: '11 4 2 4' }
  };

  // Crossed E and B fields cancel only at v = E/B. A second magnetic field
  // then separates the transmitted ions by their mass-to-charge ratio.
  // Values are relative classroom units, but the governing proportionalities
  // and force directions are preserved.
  function velocitySelectorState(electricField, selectorField, beamSpeed, analyzerField, mass, charge) {
    var e = Math.max(0, Math.min(10, Number(electricField) || 0));
    var bs = Math.max(0.1, Math.min(10, Math.abs(Number(selectorField) || 0)));
    var speed = Math.max(0, Math.min(10, Number(beamSpeed) || 0));
    var ba = Math.max(0.1, Math.min(10, Math.abs(Number(analyzerField) || 0)));
    var m = Math.max(0.01, Math.abs(Number(mass) || 1));
    var q = Number(charge);
    if (!q) q = 1;
    var selectedSpeed = e / bs;
    var speedWindow = Math.max(0.12, selectedSpeed * 0.06);
    var electricForce = Math.abs(q) * e;
    var magneticForce = Math.abs(q) * speed * bs;
    var netUpwardForce = q * (speed * bs - e);
    return {
      electricField: e,
      selectorField: bs,
      beamSpeed: speed,
      analyzerField: ba,
      mass: m,
      charge: q,
      selectedSpeed: selectedSpeed,
      speedWindow: speedWindow,
      mismatch: speed - selectedSpeed,
      moving: speed > 0.05,
      passes: speed > 0.05 && Math.abs(speed - selectedSpeed) <= speedWindow,
      electricForce: electricForce,
      magneticForce: magneticForce,
      netUpwardForce: netUpwardForce,
      massToCharge: m / Math.abs(q),
      analyzerRadius: m * speed / (Math.abs(q) * ba)
    };
  }
  // Trajectory of a charged particle entering a uniform field perpendicular
  // to the screen. Distance is schematic; curvature preserves r ∝ v/(|q|B).
  // Positive q moving right bends up for B out of the screen (v × B = −y).
  function chargedParticleTrajectory(chargeSign, fieldSign, speed, fieldStrength, steps) {
    var q = chargeSign < 0 ? -1 : 1;
    var bz = fieldSign < 0 ? -1 : 1;
    var v = Math.max(0.1, Math.abs(speed || 0));
    var b = Math.max(0, Math.abs(fieldStrength || 0));
    var count = Math.max(2, Math.round(steps || 36));
    var curvature = q * bz * 0.0025 * b / v;
    var pts = [];
    for (var i = 0; i < count; i++) {
      var s = i * 5;
      if (Math.abs(curvature) < 1e-12) {
        pts.push({ x: s, y: 0 });
      } else {
        pts.push({
          x: Math.sin(curvature * s) / curvature,
          y: -(1 - Math.cos(curvature * s)) / curvature
        });
      }
    }
    return pts;
  }

  function chargedParticleHelix(chargeSign, fieldSign, speed, fieldStrength, tiltDeg, steps, massRatio) {
    var q = chargeSign < 0 ? -1 : 1;
    var bDirection = fieldSign < 0 ? -1 : 1;
    var v = Math.max(0.1, Math.abs(Number(speed) || 0));
    var b = Math.max(0.1, Math.abs(Number(fieldStrength) || 0));
    var mass = Math.max(0.25, Math.abs(Number(massRatio) || 1));
    var tilt = Math.max(0, Math.min(90, Number(tiltDeg) || 0));
    var radians = tilt * Math.PI / 180;
    var perpendicularSpeed = v * Math.sin(radians);
    var parallelSpeed = v * Math.cos(radians);
    var radius = mass * perpendicularSpeed / b;
    var gyroPeriod = 2 * Math.PI * mass / b;
    var pitch = gyroPeriod * parallelSpeed;
    var handedness = q * bDirection;
    var count = Math.max(12, Math.round(steps || 121));
    var cycles = 2;
    var sceneRadius = Math.min(2.8, radius * 0.42);
    var sceneSpan = Math.min(6.4, pitch * cycles * 0.08);
    var points = [];
    for (var i = 0; i < count; i++) {
      var fraction = i / (count - 1);
      var phase = fraction * cycles * Math.PI * 2;
      points.push({
        x: sceneRadius * Math.sin(phase),
        y: -sceneSpan / 2 + sceneSpan * fraction,
        z: -handedness * sceneRadius * Math.cos(phase)
      });
    }
    var motionType = perpendicularSpeed < 0.05 ? 'straight' : (parallelSpeed < 0.05 ? 'circular' : 'helical');
    return {
      points: points, radius: radius, pitch: pitch, gyroPeriod: gyroPeriod, mass: mass,
      perpendicularSpeed: perpendicularSpeed, parallelSpeed: parallelSpeed,
      force: b * perpendicularSpeed, handedness: handedness,
      motionType: motionType, tilt: tilt, cycles: cycles
    };
  }

  function magnetosphereTeachingState(solarWindLevel) {
    var pressure = Math.max(1, Math.min(10, Number(solarWindLevel) || 5));
    var fraction = (pressure - 1) / 9;
    return {
      pressure: pressure,
      activity: pressure <= 3 ? 'quiet' : pressure <= 7 ? 'active' : 'storm-level',
      daysideRadiusRE: 9.8 - fraction * 4.2,
      bowShockRadiusRE: 12.2 - fraction * 4.0,
      tailReachRE: 15 + fraction * 15,
      auroralLatitude: 69 - fraction * 9,
      compressionPercent: fraction * 100,
      dipoleTilt: 11
    };
  }
  function chargedParticleMirror(chargeSign, fieldSign, speed, fieldStrength, tiltDeg, steps, massRatio, mirrorRatio) {
    var base = chargedParticleHelix(chargeSign, fieldSign, speed, fieldStrength, tiltDeg, steps, massRatio);
    var ratio = Math.max(1.1, Math.min(8, Number(mirrorRatio) || 3));
    var sinTilt = Math.sin(base.tilt * Math.PI / 180);
    var sinSquared = sinTilt * sinTilt;
    var criticalAngle = Math.asin(Math.sqrt(1 / ratio)) * 180 / Math.PI;
    var trapped = base.perpendicularSpeed >= 0.05 && sinSquared >= 1 / ratio;
    var halfLength = 3;
    var turningPosition = trapped ? halfLength * Math.sqrt(Math.max(0, (1 / Math.max(1e-9, sinSquared) - 1) / (ratio - 1))) : null;
    if (turningPosition != null) turningPosition = Math.min(halfLength, turningPosition);
    var count = base.points.length;
    var points = [];
    var phase = 0;
    var previousFieldRatio = 1;
    for (var i = 0; i < count; i++) {
      var fraction = i / (count - 1);
      var y = trapped ? turningPosition * Math.sin(fraction * Math.PI * 4) : -3.15 + fraction * 6.3;
      var normalizedY = Math.min(1, Math.abs(y) / halfLength);
      var localFieldRatio = 1 + (ratio - 1) * normalizedY * normalizedY;
      if (i > 0) phase += 0.12 * (localFieldRatio + previousFieldRatio);
      previousFieldRatio = localFieldRatio;
      var localPerpendicular = Math.min(Math.max(0.1, Number(speed) || 0), base.perpendicularSpeed * Math.sqrt(localFieldRatio));
      var physicalRadius = base.mass * localPerpendicular / (Math.max(0.1, Math.abs(Number(fieldStrength) || 0)) * localFieldRatio);
      var sceneRadius = Math.min(2.8, physicalRadius * 0.42);
      points.push({
        x: sceneRadius * Math.sin(phase),
        y: y,
        z: -base.handedness * sceneRadius * Math.cos(phase),
        fieldRatio: localFieldRatio,
        localRadius: physicalRadius
      });
    }
    return Object.assign({}, base, {
      points: points,
      fieldModel: 'mirror',
      mirrorRatio: ratio,
      criticalAngle: criticalAngle,
      trapped: trapped,
      confinement: trapped ? 'trapped' : 'passing',
      turningPosition: turningPosition,
      mirrorField: Math.max(0.1, Math.abs(Number(fieldStrength) || 0)) * ratio,
      motionType: trapped ? 'mirror-trapped' : 'mirror-passing'
    });
  }
  function chargedParticleComparison(current, reference) {
    if (!current || !reference) return null;
    var keys = ['fieldModel', 'chargeSign', 'fieldSign', 'speed', 'field', 'tilt', 'mass', 'mirrorRatio'];
    var changed = keys.filter(function (key) {
      if (typeof current[key] === 'string' || typeof reference[key] === 'string') return current[key] !== reference[key];
      return Math.abs(Number(current[key]) - Number(reference[key])) > 1e-9;
    });
    function ratio(value, baseline) { return Math.abs(baseline) < 1e-9 ? null : value / baseline; }
    function direction(value, baseline) {
      if (Math.abs(value - baseline) < 1e-9) return 'unchanged';
      return value > baseline ? 'larger' : 'smaller';
    }
    return {
      keys: changed,
      count: changed.length,
      fair: changed.length === 1,
      radiusRatio: ratio(current.radius, reference.radius),
      pitchRatio: ratio(current.pitch, reference.pitch),
      radiusDirection: direction(current.radius, reference.radius),
      pitchDirection: direction(current.pitch, reference.pitch),
      handednessChanged: current.handedness !== reference.handedness,
      motionChanged: current.motionType !== reference.motionType
    };
  }
  // Rotating-coil phase model at fixed area and angular speed. These are
  // proportional values: Φ = NBA cosθ and ε = NBAω sinθ.
  function rotatingFlux(angleDeg, turns, fieldStrength) {
    return turns * fieldStrength * Math.cos(angleDeg * Math.PI / 180);
  }
  function rotatingEMF(angleDeg, turns, fieldStrength, speedFactor) {
    var omegaScale = speedFactor == null ? 1 : Math.max(0, speedFactor);
    return turns * fieldStrength * omegaScale * Math.sin(angleDeg * Math.PI / 180);
  }
  // One normalized phase state keeps the phase wheel, graph marker, and
  // accessible description on the same quarter-cycle model.
  function rotatingPhaseState(angleDeg, turns, fieldStrength, rpm) {
    var angle = ((Number(angleDeg) || 0) % 360 + 360) % 360;
    var coilTurns = Math.max(0, Math.abs(Number(turns) || 0));
    var field = Math.max(0, Math.abs(Number(fieldStrength) || 0));
    var speed = Math.max(0, Math.abs(Number(rpm) || 0));
    var speedFactor = speed / 60;
    var fluxAmplitude = coilTurns * field;
    var emfAmplitude = fluxAmplitude * speedFactor;
    var flux = rotatingFlux(angle, coilTurns, field);
    var emf = rotatingEMF(angle, coilTurns, field, speedFactor);
    return {
      angle: angle,
      turns: coilTurns,
      field: field,
      rpm: speed,
      frequencyHz: speedFactor,
      speedFactor: speedFactor,
      flux: flux,
      emf: emf,
      fluxAmplitude: fluxAmplitude,
      emfAmplitude: emfAmplitude,
      fluxNorm: fluxAmplitude > 0 ? flux / fluxAmplitude : 0,
      emfNorm: emfAmplitude > 0 ? emf / emfAmplitude : 0,
      phaseGapDeg: 90,
      fluxPeak: fluxAmplitude > 0 && Math.abs(Math.abs(flux / fluxAmplitude) - 1) < 0.05,
      emfPeak: emfAmplitude > 0 && Math.abs(Math.abs(emf / emfAmplitude) - 1) < 0.05,
      stopped: speed === 0
    };
  }

  // ── Induction (Faraday's law) helpers ──────────────────────────────────
  // Flux through the coil as a bar magnet sits at position x (coil at x=0).
  // Modeled as a Gaussian bump: max flux when the magnet is centred in the
  // coil, falling off smoothly as it withdraws. Schematic but monotone-correct.
  function fluxAt(x, width) {
    var w = width || 40;
    return Math.exp(-(x * x) / (w * w));
  }

  // Faraday's law: EMF = −N · ΔΦ/Δt. Sign carries Lenz's law (the induced
  // current opposes the CHANGE in flux). Same magnet held still → ΔΦ=0 → 0 V.
  function induceEMF(turns, x1, x2, dt, width) {
    var dPhi = fluxAt(x2, width) - fluxAt(x1, width);
    return -turns * dPhi / Math.max(dt, 1e-9);
  }

  // ── Transformer (mutual induction) ─────────────────────────────────────
  // Coil normal uses the same yaw/pitch convention as the 3-D dipole moment.
  function coilNormal3D(coil) {
    coil = coil || {};
    if (coil.normal) {
      var nx = Number(coil.normal.x) || 0, ny = Number(coil.normal.y) || 0, nz = Number(coil.normal.z) || 0;
      var nm = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      return { x: nx / nm, y: ny / nm, z: nz / nm };
    }
    var yaw = Number(coil.yaw) || 0, pitch = Number(coil.pitch) || 0;
    return { x: Math.cos(pitch) * Math.cos(yaw), y: Math.sin(pitch), z: Math.cos(pitch) * Math.sin(yaw) };
  }

  // Numerically integrate B dot dA over a circular coil surface. A small
  // softening radius represents the finite bar-magnet body and prevents a
  // point-dipole singularity when the magnet passes through the coil.
  function coilFlux3D(magnet, coil, opts) {
    opts = opts || {};
    coil = coil || {};
    var center = { x: Number(coil.x) || 0, y: Number(coil.y) || 0, z: Number(coil.z) || 0 };
    var normal = coilNormal3D(coil);
    var radius = Math.max(0.15, Math.abs(Number(coil.radius) || 1.25));
    var rings = Math.max(2, Math.round(opts.rings || 6));
    var sectors = Math.max(6, Math.round(opts.sectors || 18));
    var softening = Math.max(0.05, Number(opts.softening) || 0.42);
    var helper = Math.abs(normal.y) < 0.85 ? { x: 0, y: 1, z: 0 } : { x: 0, y: 0, z: 1 };
    var ux = normal.y * helper.z - normal.z * helper.y;
    var uy = normal.z * helper.x - normal.x * helper.z;
    var uz = normal.x * helper.y - normal.y * helper.x;
    var um = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1;
    ux /= um; uy /= um; uz /= um;
    var vx = normal.y * uz - normal.z * uy;
    var vy = normal.z * ux - normal.x * uz;
    var vz = normal.x * uy - normal.y * ux;
    var moment = dipoleMoment3D(magnet || {});
    var sum = 0;
    for (var ring = 0; ring < rings; ring++) {
      var rr = radius * Math.sqrt((ring + 0.5) / rings);
      for (var sector = 0; sector < sectors; sector++) {
        var angle = (sector + 0.5) / sectors * Math.PI * 2;
        var ca = Math.cos(angle), sa = Math.sin(angle);
        var px = center.x + rr * (ux * ca + vx * sa);
        var py = center.y + rr * (uy * ca + vy * sa);
        var pz = center.z + rr * (uz * ca + vz * sa);
        var rx = px - (Number(magnet.x) || 0), ry = py - (Number(magnet.y) || 0), rz = pz - (Number(magnet.z) || 0);
        var r2 = rx * rx + ry * ry + rz * rz + softening * softening;
        var r = Math.sqrt(r2), r5 = r2 * r2 * r;
        var mdotr = moment.x * rx + moment.y * ry + moment.z * rz;
        var bx = (3 * mdotr * rx - moment.x * r2) / r5;
        var by = (3 * mdotr * ry - moment.y * r2) / r5;
        var bz = (3 * mdotr * rz - moment.z * r2) / r5;
        sum += bx * normal.x + by * normal.y + bz * normal.z;
      }
    }
    return sum / (rings * sectors) * Math.PI * radius * radius;
  }

  function inducedVoltage3D(turns, previousFlux, nextFlux, dt, displayScale) {
    var scale = displayScale == null ? 1 : Number(displayScale);
    var deltaFlux = nextFlux - previousFlux;
    if (Math.abs(deltaFlux) < 1e-15) return 0;
    return -Math.max(1, Math.abs(Number(turns) || 1)) * deltaFlux / Math.max(1e-6, Math.abs(Number(dt) || 0)) * scale;
  }

  // Generate a controlled pass so slow and fast trials change only elapsed
  // time. Each sample contains position, flux, and Faraday-law voltage.
  function inductionPass3D(magnet, coil, turns, duration, steps, direction, displayScale) {
    var count = Math.max(3, Math.round(steps || 49));
    var totalTime = Math.max(0.05, Math.abs(Number(duration) || 1));
    var dt = totalTime / (count - 1);
    var start = direction < 0 ? 3.4 : -3.4, end = -start;
    var samples = [], previousFlux = null;
    for (var i = 0; i < count; i++) {
      var x = start + (end - start) * i / (count - 1);
      var moved = Object.assign({}, magnet, { x: x });
      var flux = coilFlux3D(moved, coil);
      var emf = previousFlux == null ? 0 : inducedVoltage3D(turns, previousFlux, flux, dt, displayScale);
      samples.push({ t: i * dt, x: x, flux: flux, emf: emf });
      previousFlux = flux;
    }
    return samples;
  }
  // Ideal transformer: Vout/Vin = N2/N1 — but ONLY for AC. A steady DC
  // current makes a steady flux, and steady flux induces nothing (Faraday).
  function transformerOut(vin, n1, n2, isAC) {
    if (!isAC) return 0;
    return vin * n2 / Math.max(n1, 1e-9);
  }

  // Loaded transformer model. Voltage ratio remains ideal; efficiency exposes
  // the otherwise-hidden heat loss while preserving power conservation.
  function transformerLoad(vin, n1, n2, isAC, loadOhms, efficiency) {
    var vout = transformerOut(vin, n1, n2, isAC);
    var resistance = Math.max(1, Math.abs(loadOhms || 1));
    var eta = Math.max(0.01, Math.min(1, efficiency == null ? 0.94 : efficiency));
    var iout = vout / resistance;
    var pout = vout * iout;
    var pin = isAC ? pout / eta : 0;
    return { vout: vout, iout: iout, pout: pout, pin: pin, loss: Math.max(0, pin - pout), efficiency: eta };
  }

  // A compact history-dependent M-H model. branch is +1 while sweeping the
  // applied field downward from positive saturation and -1 on the return path.
  function hysteresisMagnetization(appliedField, branch, coercivity, slope, saturation) {
    var h = Math.max(-1, Math.min(1, appliedField || 0));
    var dir = branch < 0 ? -1 : 1;
    var hc = Math.max(0.01, Math.abs(coercivity == null ? 0.2 : coercivity));
    var softness = Math.max(0.03, Math.abs(slope == null ? 0.25 : slope));
    var sat = Math.max(0, Math.min(1, saturation == null ? 1 : saturation));
    return sat * Math.tanh((h + dir * hc) / softness);
  }

  // Relative eddy-current braking: conductivity and wall thickness strengthen
  // the loops; a longitudinal slit breaks the current path almost completely.
  function eddyBrakeFactor(conductivity, thickness, slit) {
    var sigma = Math.max(0, Math.min(1, conductivity || 0));
    var wall = Math.max(0, Math.min(1, (Math.abs(thickness || 0) - 1) / 5));
    return Math.max(0, Math.min(1, sigma * (0.35 + 0.65 * wall) * (slit ? 0.08 : 1)));
  }

  // Low-speed teaching model for a conducting plate moving through a magnetic
  // gap. Induced current scales with vB; the opposing magnetic force therefore
  // scales with vB². A small background drag gives a finite field-off reference.
  function eddyBrakeState(conductivity, thickness, slit, speed, fieldStrength) {
    var brakeFactor = eddyBrakeFactor(conductivity, thickness, slit);
    var velocity = Math.max(0, Math.min(10, Number(speed) || 0));
    var field = Math.max(0, Math.min(10, Number(fieldStrength) || 0));
    var speedNorm = velocity / 10, fieldNorm = field / 10;
    var coupling = brakeFactor * fieldNorm * fieldNorm;
    var backgroundRate = 0.18, magneticRate = 2.82 * coupling, decayRate = backgroundRate + magneticRate;
    var forcePercent = Math.min(100, coupling * speedNorm * 160);
    var moving = velocity > 0;
    return {
      brakeFactor: brakeFactor,
      coupling: coupling,
      forcePercent: moving ? forcePercent : 0,
      stoppingTime: moving ? Math.log(20) / decayRate : 0,
      stoppingDistance: moving ? 0.95 * velocity / decayRate : 0,
      heatShare: moving && magneticRate > 0 ? 100 * magneticRate / decayRate : 0,
      speed: velocity,
      field: field,
      loop: slit ? 'open' : 'closed'
    };
  }

  // Junkyard-crane item lineup (fixed order → deterministic tests; magnetic
  // and non-magnetic interleaved so every pass is a decision).
  var CRANE_ORDER = ['nail', 'foil', 'clip', 'penny', 'nickel', 'ruler', 'cobalt', 'pencil'];
  var BIN_SLOT = 8; // rightmost position, one past the last item slot

  // ── Magnetic domains ───────────────────────────────────────────────────
  // Angle of domain i at alignment level a (0 = fully scrambled, 1 = fully
  // aligned pointing right). The scrambled base angle comes from a hash, not
  // Math.random, so every render (and every test) sees the same jumble.
  function domainAngle(i, align) {
    var frac = Math.abs(Math.sin(i * 12.9898 + 4.1414) * 43758.5453) % 1;
    var base = (frac * 2 - 1) * Math.PI; // −π … π
    return base * (1 - Math.max(0, Math.min(1, align)));
  }

  // Count full alternation cycles in an EMF trace: consecutive sign flips
  // among samples that clear a noise threshold; two flips ≈ one full cycle.
  function countCycles(trace, thresh) {
    var th = thresh == null ? 0.2 : thresh;
    var signs = [];
    for (var i = 0; i < (trace || []).length; i++) {
      var v = trace[i];
      if (v > th) signs.push(1); else if (v < -th) signs.push(-1);
    }
    var flips = 0;
    for (var j = 1; j < signs.length; j++) if (signs[j] !== signs[j - 1]) flips++;
    return Math.floor(flips / 2);
  }

  // ── Field Walk rounds ───────────────────────────────────────────────────
  // Hidden-magnet presets in field coordinates (same frame fieldAt uses);
  // start = grid cell [col,row] on an 11×8 board. Fixed list → deterministic.
  var MAZE_COLS = 11, MAZE_ROWS = 8, MAZE_CELL = 22; // field units per cell
  var MAZE_ROUNDS = [
    { x: 66, y: -33, angle: 0, polarity: 1, start: [0, 7] },
    { x: -66, y: 44, angle: Math.PI / 2, polarity: 1, start: [10, 0] },
    { x: 44, y: 33, angle: Math.PI / 4, polarity: 1, start: [0, 0] },
    { x: -44, y: -33, angle: -Math.PI / 3, polarity: 1, start: [10, 7] }
  ];
  // Grid cell → field coordinates (board centred on the origin).
  function mazeCellToField(gx, gy) {
    return { x: (gx - (MAZE_COLS - 1) / 2) * MAZE_CELL, y: (gy - (MAZE_ROWS - 1) / 2) * MAZE_CELL };
  }
  // Pole positions of a round's hidden magnet (pole offset matches the
  // 16-unit half-length used by the Field Explorer's bar rendering).
  function mazePoles(round) {
    var r = MAZE_ROUNDS[round % MAZE_ROUNDS.length];
    var ox = Math.cos(r.angle) * 16 * r.polarity, oy = Math.sin(r.angle) * 16 * r.polarity;
    return { n: { x: r.x + ox, y: r.y + oy }, s: { x: r.x - ox, y: r.y - oy } };
  }

  // ── Magnetic materials (predict-then-test) ─────────────────────────────
  // Only the ferromagnetic trio (iron, nickel, cobalt) and their alloys stick
  // to an everyday magnet — the classic misconception is "all metals do".
  var MATERIALS = [
    { id: 'nail',    name: 'Iron nail',        emoji: '🔩', magnetic: true,  why: 'Iron is ferromagnetic — its atomic magnets can line up and hold.' },
    { id: 'clip',    name: 'Steel paperclip',  emoji: '📎', magnetic: true,  why: 'Steel is mostly iron, so it inherits iron’s magnetism.' },
    { id: 'nickel',  name: 'Nickel bar',       emoji: '🪙', magnetic: true,  why: 'Nickel is one of only three room-temperature ferromagnetic elements (iron, nickel, cobalt).' },
    { id: 'cobalt',  name: 'Cobalt chunk',     emoji: '🪨', magnetic: true,  why: 'Cobalt completes the ferromagnetic trio with iron and nickel.' },
    { id: 'foil',    name: 'Aluminum foil',    emoji: '🥡', magnetic: false, why: 'Aluminum is a metal, but NOT ferromagnetic — a fridge magnet ignores it.' },
    { id: 'penny',   name: 'Copper coin',      emoji: '🥉', magnetic: false, why: 'Copper conducts electricity brilliantly but is not attracted to magnets.' },
    { id: 'ruler',   name: 'Plastic ruler',    emoji: '📏', magnetic: false, why: 'Plastic shows no visible pull in this classroom test; its magnetic response is extremely weak.' },
    { id: 'pencil',  name: 'Wooden pencil',    emoji: '✏️', magnetic: false, why: 'Wood shows no visible attraction to an everyday magnet; any response is far too weak for this test.' }
  ];

  // ── Quiz bank ──────────────────────────────────────────────────────────
  var QUIZ = [
    { q: 'Where is a bar magnet’s pull the strongest?', a: ['At the two poles (ends)', 'In the middle', 'It is equal everywhere', 'Just outside the middle'], c: 0,
      why: 'Field lines crowd together at the poles — closer lines mean a stronger field.' },
    { q: 'Two magnets are brought together, north-to-north. They…', a: ['Attract', 'Repel', 'Do nothing', 'Stick only if iron'], c: 1,
      why: 'Like poles repel; opposite poles (N–S) attract.' },
    { q: 'A compass needle is itself a tiny magnet. Its painted north end points…', a: ['Along the local magnetic field', 'Always to true geographic north', 'Toward the nearest heavy object', 'Straight down'], c: 0,
      why: 'The needle lines up with whatever magnetic field it sits in — near a bar magnet that is the magnet’s field, not Earth’s.' },
    { q: 'You wrap more turns of wire into an electromagnet coil (same current). The field…', a: ['Gets stronger', 'Gets weaker', 'Stays the same', 'Reverses'], c: 0,
      why: 'For a solenoid B = μ₀·(N/L)·I — more turns per length means a stronger field.' },
    { q: 'The quickest way to flip an electromagnet’s north and south poles is to…', a: ['Reverse the current direction', 'Add more battery', 'Use thicker wire', 'Cool it down'], c: 0,
      why: 'The poles follow the current’s direction (right-hand rule); reverse the current and the poles swap.' },
    { q: 'Sliding a soft-iron rod into the coil makes the electromagnet…', a: ['Much stronger', 'Slightly weaker', 'Lose its field', 'Spin'], c: 0,
      why: 'Iron concentrates the field lines — its high permeability multiplies the field, often by hundreds of times.' },
    { q: 'In a DC motor, what keeps the loop turning the same way instead of just jiggling?', a: ['The commutator flips the current each half-turn', 'The magnets get stronger', 'Gravity', 'The battery pulses on its own'], c: 0,
      why: 'Without the commutator the torque would reverse and the loop would rock back and forth; the commutator re-flips the current so the push keeps going one way.' },
    { q: 'Earth behaves like a giant bar magnet. Its magnetic poles are…', a: ['Near, but not exactly at, the geographic poles', 'Exactly at the geographic poles', 'At the equator', 'On the Moon'], c: 0,
      why: 'The magnetic and geographic poles are offset — the angle between them at your location is called magnetic declination.' },
    { q: 'Earth’s magnetic field matters for life mainly because it…', a: ['Deflects much of the solar wind', 'Warms the planet', 'Makes the tides', 'Holds the atmosphere down by gravity'], c: 0,
      why: 'The magnetosphere steers charged particles from the Sun around the planet; where they leak in near the poles we get auroras.' },
    { q: 'Over Earth’s history the magnetic poles have…', a: ['Reversed many times, at irregular intervals', 'Never moved', 'Reversed exactly every 1000 years', 'Only moved once'], c: 0,
      why: 'The field flips north↔south irregularly over geologic time; the last full reversal was about 780,000 years ago.' },
    { q: 'You hold a strong magnet perfectly still inside a coil of wire. The voltmeter reads…', a: ['Zero — only CHANGING flux makes voltage', 'A steady high voltage', 'Higher the stronger the magnet', 'It slowly charges up'], c: 0,
      why: 'Faraday’s law: EMF = −N·ΔΦ/Δt. No change in flux means no EMF — you must MOVE the magnet (or vary the field) to generate.' },
    { q: 'Which of these will a fridge magnet actually stick to?', a: ['A steel paperclip', 'Aluminum foil', 'A copper coin', 'All metals equally'], c: 0,
      why: 'Only iron, nickel, cobalt (and their alloys, like steel) are ferromagnetic at room temperature — most metals, including aluminum and copper, are not.' },
    { q: 'A transformer has 100 primary turns and 300 secondary turns. 120 V AC goes in. What comes out?', a: ['360 V — stepped up 3×', '40 V — stepped down', '120 V — unchanged', '0 V — nothing'], c: 0,
      why: 'V₂/V₁ = N₂/N₁ = 300/100 = 3, so 120 V becomes 360 V. Trade: the current steps DOWN by the same factor — power is conserved.' },
    { q: 'A magnet falls in slow motion through a copper tube, yet copper is not magnetic. Why?', a: ['The falling magnet induces eddy currents that push back on it', 'Copper is slightly magnetic after all', 'Air pressure builds inside the tube', 'Gravity is weaker inside metal'], c: 0,
      why: 'The moving field induces swirling eddy currents in the copper, and by Lenz’s law their field opposes the fall. No steel needed — just induction.' },
    { q: 'You heat an iron magnet past its Curie temperature (770°C). It…', a: ['Loses its magnetism — the domains scramble', 'Gets much stronger', 'Flips north and south', 'Starts to glow magnetically'], c: 0,
      why: 'Above the Curie point, thermal jostling beats the domain alignment completely. Every iron magnet demagnetizes — this is also how magnets are erased on purpose.' },
    { q: 'Earth’s “north magnetic pole” (up near the Arctic) is, magnetically speaking…', a: ['A south pole — that’s why compass red ends point toward it', 'A north pole, as the name says', 'Neither — it has no polarity', 'Both at once'], c: 0,
      why: 'Field lines flow INTO south poles, and the red (north) end of a needle follows the field. If red points there, the place is magnetically a south pole. The name is geographic, not magnetic.' },
    { q: 'In the far-field force model, doubling the gap between the same two magnets makes the force about…', a: ['1/16 as large', '1/2 as large', '2 times larger', '16 times larger'], c: 0,
      why: 'Axial dipole-pair force falls approximately as 1/r⁴. Doubling r divides the force by 2⁴ = 16.' },
    { q: 'You reverse BOTH the current direction and the winding direction of an electromagnet. Its poles…', a: ['Stay in their original places', 'Swap once', 'Disappear', 'Become equally north'], c: 0,
      why: 'Either reversal alone swaps the poles. Two reversals cancel, so the original field direction returns.' },
    { q: 'You reverse BOTH the supply current and the magnetic field in a DC motor. Its rotation…', a: ['Keeps its original direction', 'Reverses', 'Stops permanently', 'Becomes random'], c: 0,
      why: 'Motor direction depends on the product of current direction and field direction. Reversing both preserves that product.' },
    { q: 'A positive particle curves upward in a field pointing out of the screen. If only the charge becomes negative, it curves…', a: ['Downward', 'Upward more sharply', 'Straight ahead', 'Out of the screen'], c: 0,
      why: 'Lorentz force is F = qv × B. Changing the sign of q reverses the force and therefore the bend.' },
    { q: 'A rotating generator coil spins twice as fast with the same turns and field. Its waveform has…', a: ['Twice the frequency and twice the voltage amplitude', 'Twice the frequency but the same voltage', 'The same frequency and voltage', 'Half the frequency'], c: 0,
      why: 'Faster rotation changes flux faster: ε ∝ ω, and each revolution also completes one electrical cycle.' },
    { q: 'At the instant a rotating coil has maximum magnetic flux, its induced voltage is…', a: ['Zero', 'Maximum', 'Always negative', 'Independent of motion'], c: 0,
      why: 'Voltage depends on the rate of flux change. At a flux maximum the slope is momentarily zero, so the induced voltage is zero.' }
  ];

  // Which tab teaches each quiz question (parallel to QUIZ) — powers the
  // post-quiz “study this” loop. Order: the 12 originals, then the R6 four.
  var QUIZ_TABS = ['field', 'field', 'field', 'electro', 'electro', 'electro', 'motor', 'earth', 'earth', 'earth', 'induce', 'materials', 'transformer', 'induce', 'materials', 'maze', 'field', 'electro', 'motor', 'motor', 'induce', 'induce'];
  var QUIZ_PASS = 15; // ~70% of 22

  // Quest definitions, in recommended learning-path order. `tab` says where
  // each quest is earned — the journey strip uses it to jump the student
  // straight to the right section. The host only reads id/label/icon/check.
  var QUEST_DEFS = [
    { id: 'mag_field', tab: 'field', label: 'Move the compass through a magnet’s field', icon: '🧭', check: function (d) { var s = (d && d.magnetism) || {}; return !!(s.compassMoved || s.field3dUsed); } },
    { id: 'mag_pair', tab: 'field', label: 'See two magnets attract and repel', icon: '🧲', check: function (d) { var s = (d && d.magnetism) || {}; return !!(s.sawAttract && s.sawRepel); } },
    { id: 'mag_force_bench', tab: 'field', label: 'Test how magnet force changes with distance', icon: '📉', check: function (d) { var s = (d && d.magnetism) || {}; return !!s.forceBenchUsed; } },
    { id: 'mag_electro', tab: 'electro', label: 'Change an electromagnet’s turns or current', icon: '🔌', check: function (d) { var s = (d && d.magnetism) || {}; return !!s.coilTouched; } },
    { id: 'mag_direction', tab: 'electro', label: 'Reverse an electromagnet’s field direction', icon: '↔️', check: function (d) { var s = (d && d.magnetism) || {}; return !!s.directionSeen; } },
    { id: 'mag_motor', tab: 'motor', label: 'Run the DC motor', icon: '⚙️', check: function (d) { var s = (d && d.magnetism) || {}; return !!s.motorRan; } },
    { id: 'mag_motor_direction', tab: 'motor', label: 'Reverse the motor by changing one direction', icon: '🔄', check: function (d) { var s = (d && d.magnetism) || {}; return !!s.motorDirectionSeen; } },
    { id: 'mag_lorentz', tab: 'motor', label: 'Reverse a charged particle’s bend', icon: '➰', check: function (d) { var s = (d && d.magnetism) || {}; return !!s.lorentzUsed; } },
    { id: 'mag_induce', tab: 'induce', label: 'Generate electricity by moving a magnet', icon: '⚡', check: function (d) { var s = (d && d.magnetism) || {}; return (s.peakEMF || 0) >= 0.5 || !!s.ind3dUsed; } },
    { id: 'mag_generator_phase', tab: 'induce', label: 'Compare generator speed, flux, and voltage', icon: '〰️', check: function (d) { var s = (d && d.magnetism) || {}; return !!(s.genSpeedSeen && s.genPhaseSeen); } },
    { id: 'mag_materials', tab: 'materials', label: 'Sort all 8 materials correctly', icon: '🔩', check: function (d) { var s = (d && d.magnetism) || {}; return !!s.matPerfect; } },
    { id: 'mag_domains', tab: 'materials', label: 'Fully magnetize the iron (align every domain)', icon: '🧲', check: function (d) { var s = (d && d.magnetism) || {}; return !!s.domainsFull; } },
    { id: 'mag_crane', tab: 'crane', label: 'Recycle all 4 ferromagnetic items with the crane', icon: '🏗️', check: function (d) { var s = (d && d.magnetism) || {}; return !!s.craneDone; } },
    { id: 'mag_maze', tab: 'maze', label: 'Find the hidden magnet by compass alone', icon: '🗺️', check: function (d) { var s = (d && d.magnetism) || {}; return (s.mazeWins || 0) >= 1; } },
    { id: 'mag_earth', tab: 'earth', label: 'Explore Earth’s magnetic field', icon: '🌍', check: function (d) { var s = (d && d.magnetism) || {}; return !!s.earthSeen; } },
    { id: 'mag_investigator', tab: 'field', label: 'Record evidence in the investigation notebook', icon: '📓', check: function (d) { var s = (d && d.magnetism) || {}; return !!s.notebookUsed; } },
    { id: 'mag_quiz', tab: 'quiz', label: 'Score 15+ on the magnetism quiz', icon: '🧠', check: function (d) { var s = (d && d.magnetism) || {}; return (s.quizBest || 0) >= QUIZ_PASS; } }
  ];

  var FACTS = [
    'A magnet always has two poles. Snap one in half and each piece grows a new N and S — no one has ever found a single, isolated magnetic pole.',
    'Field lines never cross, always leave a north pole and enter a south pole, and are closest together where the field is strongest.',
    'Electricity and magnetism are two faces of one force. A moving charge makes a magnetic field; a changing magnetic field pushes charges — that is how every generator and motor works.',
    'A compass does not sense true north. It senses the local magnetic field, which is why maps print a small "declination" correction for your region.',
    'Magnetite, a naturally magnetic rock, let ancient navigators build the first compasses over a thousand years ago.'
  ];

  // Cross-station design loops. Each mission reuses existing quest checks so
  // progress reflects real investigations rather than a second score system.
  var MISSION_DEFS = [
    { id: 'power_path', label: 'Power a remote sensor', icon: '⚡', goal: 'Build a field, turn motion into voltage, and defend the result.', accent: '#fbbf24', steps: [
      { questId: 'mag_electro', label: 'Build field', tab: 'electro', icon: '🔌', hint: 'Change turns or current.' },
      { questId: 'mag_induce', label: 'Induce voltage', tab: 'induce', icon: '⚡', hint: 'Move a magnet and reach 0.50 V.' },
      { questId: 'mag_generator_phase', label: 'Tune phase', tab: 'induce', icon: '〰️', hint: 'Compare speed, flux, and voltage.' },
      { questId: 'mag_investigator', label: 'Record evidence', tab: 'field', icon: '📓', hint: 'Write a claim in the notebook.' }
    ] },
    { id: 'motor_path', label: 'Build a responsive motor', icon: '⚙️', goal: 'Use field direction, force, and charge motion to explain torque.', accent: '#38bdf8', steps: [
      { questId: 'mag_electro', label: 'Build field', tab: 'electro', icon: '🔌', hint: 'Create the field that pushes the loop.' },
      { questId: 'mag_motor', label: 'Spin loop', tab: 'motor', icon: '⚙️', hint: 'Run the DC motor and watch the force pair.' },
      { questId: 'mag_motor_direction', label: 'Reverse torque', tab: 'motor', icon: '🔄', hint: 'Flip one direction and predict the turn.' },
      { questId: 'mag_lorentz', label: 'Explain bend', tab: 'motor', icon: '➰', hint: 'Reverse a charged particle’s bend.' }
    ] },
    { id: 'shield_path', label: 'Protect a spacecraft', icon: '🌍', goal: 'Sort materials, align domains, and connect Earth’s shield to design.', accent: '#34d399', steps: [
      { questId: 'mag_materials', label: 'Sort materials', tab: 'materials', icon: '🔩', hint: 'Classify all eight samples.' },
      { questId: 'mag_domains', label: 'Align domains', tab: 'materials', icon: '🧲', hint: 'Fully magnetize the iron.' },
      { questId: 'mag_earth', label: 'Read the shield', tab: 'earth', icon: '🌍', hint: 'Explore Earth’s magnetosphere.' },
      { questId: 'mag_crane', label: 'Apply the rule', tab: 'crane', icon: '🏗️', hint: 'Recycle the ferromagnetic set.' }
    ] }
  ];

  function missionProgressState(missionId, data) {
    var mission = MISSION_DEFS[0];
    for (var i = 0; i < MISSION_DEFS.length; i++) {
      if (MISSION_DEFS[i].id === missionId) { mission = MISSION_DEFS[i]; break; }
    }
    var payload = data && data.magnetism ? data : { magnetism: data || {} };
    var steps = mission.steps.map(function (step) {
      var quest = null;
      for (var q = 0; q < QUEST_DEFS.length; q++) {
        if (QUEST_DEFS[q].id === step.questId) { quest = QUEST_DEFS[q]; break; }
      }
      var done = false;
      try { done = !!(quest && quest.check(payload)); } catch (e) {}
      return Object.assign({}, step, { done: done });
    });
    var doneCount = steps.filter(function (step) { return step.done; }).length;
    var nextStepIndex = steps.findIndex(function (step) { return !step.done; });
    return { mission: mission, steps: steps, doneCount: doneCount, total: steps.length,
      nextStepIndex: nextStepIndex < 0 ? steps.length - 1 : nextStepIndex,
      completed: doneCount === steps.length };
  }


  function missionEvidenceReviewState(missionId, data) {
    var payload = data && data.magnetism ? data : { magnetism: data || {} };
    var source = payload.magnetism || {};
    var progress = missionProgressState(missionId, payload);
    function evidenceFor(step) {
      if (!step.done) return 'Pending · ' + step.hint;
      if (step.questId === 'mag_electro') return 'Field test: ' + (source.turns || 0) + ' turns × ' + (source.current || 0) + ' A.';
      if (step.questId === 'mag_induce') return 'Peak induced voltage: ' + (Number(source.peakEMF) || 0).toFixed(2) + ' V.';
      if (step.questId === 'mag_generator_phase') return 'Phase comparison: ' + (source.genRPM || 0) + ' RPM, ' + (source.genTurns || 0) + ' turns.';
      if (step.questId === 'mag_investigator') return 'Notebook evidence: ' + ((source.notebookTrials || []).length) + ' recorded trial(s).';
      if (step.questId === 'mag_motor') return 'Motor run observed at ' + Math.round(Number(source.motorAngle) || 0) + '°.';
      if (step.questId === 'mag_motor_direction') return 'Direction reversal tested with current or field flip.';
      if (step.questId === 'mag_lorentz') return 'Charged-particle bend reversal tested.';
      if (step.questId === 'mag_materials') return 'All material classifications matched the magnetic rule.';
      if (step.questId === 'mag_domains') return 'Domain alignment reached 100%.';
      if (step.questId === 'mag_earth') return 'Earth shield explored at solar-wind level ' + (source.earthSolarWind || 0) + '/10.';
      if (step.questId === 'mag_crane') return 'Four ferromagnetic items lifted and recycled.';
      return 'Evidence recorded at the ' + step.tab + ' station.';
    }
    var synthesis = progress.mission.id === 'power_path'
      ? 'Changing flux becomes voltage when a coil-built field is combined with motion and a phase comparison.'
      : progress.mission.id === 'motor_path'
        ? 'Current and field directions set the force pair; reversing one flips torque and particle bend.'
        : 'Material response and field geometry determine what a magnetic system can lift, align, or redirect.';
    return Object.assign({}, progress, {
      steps: progress.steps.map(function (step) { return Object.assign({}, step, { evidence: evidenceFor(step) }); }),
      synthesis: synthesis,
      claimStatus: (source.notebookClaim || '').trim() ? 'Notebook claim recorded.' : 'Add a notebook claim to formalize the synthesis.'
    });
  }

  function missionReplayState(missionId, data) {
    var payload = data && data.magnetism ? data : { magnetism: data || {} };
    var source = payload.magnetism || {};
    var review = missionEvidenceReviewState(missionId, payload);
    var trials = Array.isArray(source.notebookTrials) ? source.notebookTrials : [];
    var rawSelectedIndex = source.replaySelectedIndex;
    var hasSelectedIndex = rawSelectedIndex !== null && rawSelectedIndex !== undefined && rawSelectedIndex !== '';
    var selectedIndex = hasSelectedIndex && Number.isFinite(Number(rawSelectedIndex)) ? Math.round(Number(rawSelectedIndex)) : trials.length - 1;
    if (!trials.length) selectedIndex = -1;
    else selectedIndex = Math.max(0, Math.min(trials.length - 1, selectedIndex));
    function normalizeMetrics(trial) {
      if (!trial || !Array.isArray(trial.metrics)) return [];
      return trial.metrics.map(function (metric) {
        var numeric = Number(metric && metric.value);
        if (!Number.isFinite(numeric)) return null;
        var digits = metric.digits == null ? 2 : Number(metric.digits);
        return { key: metric.key || metric.label || 'metric', label: metric.label || 'Measurement', value: numeric, unit: metric.unit || '', digits: digits, display: metric.display || (digits === 0 ? String(Math.round(numeric)) : numeric.toFixed(digits)) + (metric.unit ? ' ' + metric.unit : '') };
      }).filter(function (metric) { return !!metric; });
    }
    var timeline = trials.map(function (trial, index) {
      return Object.assign({}, trial, {
        ordinal: index + 1,
        station: trial && trial.station ? trial.station : 'Recorded station',
        setup: trial && trial.setup ? trial.setup : 'Setup not captured',
        result: trial && trial.result ? trial.result : 'Result not captured',
        prediction: trial && trial.prediction ? trial.prediction : 'No prediction recorded',
        metrics: normalizeMetrics(trial)
      });
    });
    return {
      mission: review.mission,
      trials: timeline,
      selectedIndex: selectedIndex,
      selected: selectedIndex >= 0 ? timeline[selectedIndex] : null,
      latest: timeline.length ? timeline[timeline.length - 1] : null,
      count: timeline.length,
      coverage: timeline.length ? timeline.length + ' recorded trial' + (timeline.length === 1 ? '' : 's') + ' in sequence.' : 'No recorded trials yet.'
    };
  }
  function notebookMetricSnapshot(data) {
    var payload = data && data.magnetism ? data : { magnetism: data || {} };
    var source = payload.magnetism || {};
    var metrics = [];
    function add(key, label, value, unit, digits) {
      var numeric = Number(value);
      if (!Number.isFinite(numeric)) return;
      var precision = digits == null ? 2 : digits;
      metrics.push({ key: key, label: label, value: numeric, unit: unit || '', digits: precision,
        display: (precision === 0 ? String(Math.round(numeric)) : numeric.toFixed(precision)) + (unit ? ' ' + unit : '') });
    }
    var tab = source.tab || 'field';
    if (tab === 'field') {
      if (source.fieldView === 'map') {
        var mapProbe = Object.assign({ x: 90, y: 0 }, source.fieldMapProbe || {});
        var mapMagnet = { x: 0, y: 0, angle: 0, polarity: 1, strength: Number(source.fieldMapStrength) || 1 };
        var reading = fieldProbeReading(mapProbe.x, mapProbe.y, [mapMagnet], source.fieldMapNoise);
        add('field_rel', 'Probe magnitude', reading.measuredMagnitude, 'rel uT', 2);
      } else if (source.fieldView === '3d') {
        var probe = source.field3dProbe || { x: 0, y: 1.8, z: 1.2 };
        var total = fieldAt3D(probe.x, probe.y, probe.z, source.field3dMagnets || []);
        add('field_3d', '3D field magnitude', Math.hypot(total.x, total.y, total.z), 'relative', 3);
      } else {
        add('force_rel', 'Pair force', magnetPairForce(source.pairStrength1 || 1, source.pairStrength2 || 1, source.pairDistance || 70), 'relative', 3);
      }
    } else if (tab === 'electro') {
      add('field_mT', 'Center field', solenoidField(source.turns || 0, source.current || 0, 0.1, source.core ? 600 : 1) * 1000, 'mT', 2);
      add('turns', 'Turns', source.turns, 'turns', 0);
      add('current_A', 'Current', source.current, 'A', 1);
    } else if (tab === 'motor') {
      if (source.benchUsed) {
        var bench = motorGeneratorBench(source.motorCurrent, source.motorField, source.benchLoadOhms, source.benchFriction, source.benchTurns, source.benchField);
        add('speed_rpm', 'Shaft speed', bench.rpm, 'RPM', 0);
        add('power_W', 'Output power', bench.outputPower, 'W', 1);
      } else if (source.motorMode === 'particle') {
        add('bend_radius', 'Bend radius', (source.chargeSpeed || 0) / Math.max(0.1, source.chargeB || 0), 'relative', 2);
        add('field_B', 'Particle field', source.chargeB, 'relative B', 1);
      } else {
        var torque = motorTorqueFactor(source.motorCurrent || 0, source.motorField || 0, source.motorAngle || 0, source.motorCurrentDir || 1, source.motorFieldDir || 1);
        var loadState = motorLoadState(source.motorCurrent || 0, source.motorField || 0, source.motorAngle || 0, source.motorLoad || 0);
        add('torque_rel', 'Relative torque', Math.abs(torque / 12), 'x', 2);
        add('angle_deg', 'Rotor angle', source.motorAngle, 'deg', 0);
        add('load_rel', 'Shaft load', loadState.loadTorque, 'x', 2);
        add('load_margin', 'Load margin', loadState.margin, 'x', 2);
        var loadTrial = motorLoadTrialState(source.motorLoadSamples, source.motorLoadPrediction);
        if (loadTrial.bracketed) {
          add('load_prediction', 'Predicted stall load', loadTrial.predicted, 'x', 2);
          add('load_observed', 'Observed stall boundary', loadTrial.observed, 'x', 2);
          add('load_offset', 'Prediction offset', loadTrial.delta, 'x', 2);
        }
      }
    } else if (tab === 'induce') {
      if (source.induceMode === 'coil') {
        add('voltage_rel', 'Generator voltage', Math.abs(rotatingEMF(source.genAngle || 0, source.genTurns || 0, source.genField || 0, (source.genRPM || 0) / 60)), 'relative V', 2);
        add('frequency_Hz', 'Frequency', (source.genRPM || 0) / 60, 'Hz', 2);
      } else if (source.induceMode === '3d') {
        add('voltage_rel', '3D induced voltage', Math.abs(source.ind3dEMF || 0), 'relative V', 2);
        add('flux_rel', '3D flux', source.ind3dFlux, 'relative', 2);
      } else {
        add('voltage_V', 'Induced voltage', Math.abs(source.lastEMF || 0), 'V', 2);
        add('peak_V', 'Peak voltage', Math.abs(source.peakEMF || 0), 'V', 2);
      }
    } else if (tab === 'materials') {
      add('domain_alignment', 'Domain alignment', (source.domainAlign || 0) * 100, '%', 0);
      if (source.matRevealed) add('material_score', 'Material score', MATERIALS.filter(function (item) { return source.matGuesses && source.matGuesses[item.id] === item.magnetic; }).length, '/8', 0);
    } else if (tab === 'earth') {
      var earth = magnetosphereTeachingState(source.earthSolarWind || 0);
      add('solar_wind', 'Solar-wind level', earth.pressure, '/10', 0);
      add('dayside_RE', 'Dayside boundary', earth.daysideRadiusRE, 'R_E', 1);
    } else if (tab === 'transformer') {
      add('output_V', 'Output voltage', transformerOut(120, source.xfmrN1, source.xfmrN2, source.xfmrAC), 'V', 0);
      add('turns_ratio', 'Turns ratio', (source.xfmrN2 || 0) / Math.max(1, source.xfmrN1 || 1), 'x', 2);
    }
    return metrics;
  }
  function missionReportState(missionId, data) {
    var payload = data && data.magnetism ? data : { magnetism: data || {} };
    var source = payload.magnetism || {};
    var review = missionEvidenceReviewState(missionId, payload);
    var replay = missionReplayState(missionId, payload);
    var metricCount = 0;
    replay.trials.forEach(function (trial) { metricCount += Array.isArray(trial.metrics) ? trial.metrics.length : 0; });
    return {
      missionId: review.mission.id,
      title: review.mission.label,
      goal: review.mission.goal,
      accent: review.mission.accent,
      completed: review.completed,
      status: review.completed ? 'Complete' : (review.doneCount + '/' + review.total + ' steps complete'),
      steps: review.steps.map(function (step) { return { label: step.label, tab: step.tab, done: step.done, evidence: step.evidence }; }),
      synthesis: review.synthesis,
      claim: (source.notebookClaim || '').trim(),
      claimStatus: review.claimStatus,
      trials: replay.trials.map(function (trial) { return { ordinal: trial.ordinal, station: trial.station, setup: trial.setup, result: trial.result, prediction: trial.prediction, metrics: trial.metrics || [] }; }),
      trialCount: replay.count,
      metricCount: metricCount
    };
  }
  function missionCERState(missionId, data) {
    var report = missionReportState(missionId, data);
    var claimDone = !!report.claim;
    var evidenceDone = report.trialCount > 0;
    var reasoningDone = claimDone && evidenceDone;
    var items = [
      { key: 'claim', label: 'Claim', done: claimDone, hint: claimDone ? 'Claim recorded.' : 'Write a claim in the notebook.' },
      { key: 'evidence', label: 'Evidence', done: evidenceDone, hint: evidenceDone ? report.trialCount + ' trial' + (report.trialCount === 1 ? '' : 's') + ' recorded.' : 'Record at least one trial.' },
      { key: 'reasoning', label: 'Reasoning', done: reasoningDone, hint: reasoningDone ? 'Connect the claim to the measurements.' : 'Use the evidence to defend the claim.' }
    ];
    return { items: items, doneCount: items.filter(function (item) { return item.done; }).length, complete: items.every(function (item) { return item.done; }), next: items.filter(function (item) { return !item.done; })[0] || null };
  }
  if (_hasHost) window.StemLab.registerTool('magnetism', {
    icon: '🧲',
    label: 'Magnetism Lab',
    desc: 'See invisible magnetic fields and learn how electricity makes them. Trace field lines with a live compass, build an electromagnet, spin a DC motor, crank a generator with Faraday’s law, sort magnetic from non-magnetic materials, and explore Earth’s own magnetic shield. NGSS MS-PS2 fields and forces.',
    color: 'rose',
    category: 'science',
    questHooks: QUEST_DEFS,
    render: function (ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var setLabToolData = ctx.setToolData;
      var addToast = typeof ctx.addToast === 'function' ? ctx.addToast : function () {};
      var awardXP = typeof ctx.awardXP === 'function' ? ctx.awardXP : function () {};
      var callGemini = ctx.callGemini;
      var announceToSR = typeof ctx.announceToSR === 'function' ? ctx.announceToSR : function () {};
      var aiOn = !!(ctx.aiHintsEnabled && typeof callGemini === 'function');
      var labToolData = ctx.toolData;

      var _prefersReducedMotion = false;
      try { _prefersReducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}

      var PANEL = 'var(--allo-stem-panel, #1e293b)';
      var TEXT = 'var(--allo-stem-text, #e2e8f0)';
      var SOFT = 'var(--allo-stem-text-soft, #94a3b8)';
      var BORDER = 'var(--allo-stem-border, #334155)';
      var INSTRUMENT = 'var(--allo-stem-instrument, var(--allo-stem-panel, #0b1220))';
      // #be123c keeps white text on selected controls above WCAG AA's 4.5:1 threshold.
      var ACTIVE = '#be123c';
      var _sliderUid = 0;

      // Fresh per render so the defaults-merge below can never share (and
      // never mutate) a module-level object between renders.
      var MAG_DEFAULTS = {
        tab: 'field',
        // Field Explorer
        magnets: [{ x: -70, y: 0, angle: 0, polarity: 1 }],
        compass: { x: 90, y: 90 }, filings: false, compassMoved: false,
        sawAttract: false, sawRepel: false, fieldVectors: true, fieldDrag: null, fieldSelected: 0,
        fieldView: '2d', field3dStatus: 'loading', field3dAttempt: 0, field3dUsed: false,
        fieldMapProbe: { x: 90, y: 0 }, fieldMapPath: 'axial',
        fieldMapStrength: 1, fieldMapNoise: 0, fieldMapSamples: [], fieldMapUsed: false,
        field3dMagnets: [{ x: -1.6, y: 0, z: 0, yaw: 0, pitch: 0, polarity: 1, strength: 1 }, { x: 1.6, y: 0, z: 0, yaw: 0, pitch: 0, polarity: 1, strength: 1 }],
        field3dProbe: { x: 0, y: 1.8, z: 1.2 }, field3dSelected: 0,
        field3dVectors: true, field3dLines: true, field3dSlice: 'xz', field3dSliceOffset: 0, field3dNullFound: false,
        // Electromagnet
        turns: 20, current: 2, currentDir: 1, windingDir: 1, core: false, coilTouched: false, directionSeen: false,
        electroView: '2d', electro3dStatus: 'loading', electro3dAttempt: 0, electro3dUsed: false,
        electro3dLengthCm: 12, electro3dRadiusCm: 3, electro3dMaterial: 'air',
        electro3dVectors: true, electro3dLines: true, electro3dProbe: { x: 0, y: 0, z: 0 },
        // Motor
        motorCurrent: 3, motorField: 4, motorLoad: 0.35, motorLoadPrediction: 1, motorLoadSamples: [], motorLoadTrialStarted: false, motorCurrentDir: 1, motorFieldDir: 1,
        motorRunning: false, motorAngle: 90, motorRan: false, motorDirectionSeen: false, motorMode: 'forces',
        motorView: '2d', motor3dStatus: 'loading', motor3dAttempt: 0, motor3dUsed: false, motor3dForces: true, motor3dCurrent: true,
        forceLabCurrent: 3, forceLabField: 4, forceLabAngle: 45, forceLabLength: 5, forceLabSpeed: 300, forceLabCurrentDir: 1, forceLabFieldDir: 1, forceLabUsed: false,
        benchLoadOhms: 40, benchFriction: 3, benchTurns: 80, benchField: 4, benchUsed: false,
        benchView: 'steady', benchRunning: false, benchTime: 0, benchOmega: 0, benchTemperature: 22,
        benchTrace: [], benchTrials: [], benchTrialCount: 0, benchMissionStatus: 'ready', benchCompareTrialId: null,
        // Force bench + charged-particle beam
        analyzerE: 6, analyzerSelectorB: 3, analyzerSpeed: 2, analyzerB: 4,
        analyzerSpecies: 'deuteron', analyzerShowAll: true, analyzerUsed: false,
        pairDistance: 70, pairStrength1: 1, pairStrength2: 1, pairAttract: true,
        chargeSign: 1, chargeField: 1, chargeSpeed: 5, chargeB: 4, chargeView: '2d',
        chargeTilt: 45, chargeMass: 1, chargeFieldModel: 'uniform', chargeMirrorRatio: 3, charge3dStatus: 'loading', charge3dAttempt: 0, charge3dUsed: false, charge3dProgress: 0, charge3dRunning: false, charge3dTrail: true, charge3dReference: null,
        // Rotating-coil generator
        induceMode: 'hand', genAngle: 0, genTurns: 60, genField: 4, genRPM: 60,
        genSpeedSeen: false, genPhaseSeen: false,
        // 3-D induction studio
        ind3dStatus: 'loading', ind3dAttempt: 0, ind3dUsed: false, ind3dRunning: false,
        ind3dMagnet: { x: -3.2, y: 0, z: 0, yaw: 0, pitch: 0, polarity: 1, strength: 1.4 },
        ind3dCoilRadius: 1.25, ind3dCoilYaw: 0, ind3dCoilPitch: 0, ind3dTurns: 80,
        ind3dStepTime: 0.5, ind3dFlux: 0, ind3dEMF: 0, ind3dTrace: [], ind3dTrialMsg: '',
        // Learning mode + investigation notebook
        learningMode: 'guided', missionId: 'power_path', missionStarted: false, missionSeen: false, notebookOpen: false, notebookPrediction: '', notebookClaim: '', replaySelectedIndex: null,
        notebookTrials: [], notebookUsed: false, forceBenchUsed: false, lorentzUsed: false,
        // Earth
        earthSeen: false, declination: 12, earthSolarWind: 5, earthView: '2d', earth3dStatus: 'loading', earth3dAttempt: 0, earth3dUsed: false, earth3dFieldLines: true, earth3dBoundary: true, earth3dBelts: true, earth3dWind: true, earth3dReference: true, earth3dMotion: false,
        // Induction (generator)
        induceX: -100, inducePrevX: -100, induceTurns: 50, lastEMF: 0, peakEMF: 0,
        emfTrace: [], induceTrialMsg: '',
        // Eddy-current tube race
        tubeProg: { cu: 0, pl: 0 }, tubeRunning: false, tubeDone: false,
        eddyMaterial: 'copper', eddyThickness: 4, eddySlit: false, eddySpeed: 6, eddyField: 6,
        // Magnetic domains
        domainAlign: 0, domainsFull: false, domainField: 0, domainBranch: 1, domainMaterial: 'soft', domainHistory: false,
        // Field Walk (hidden-magnet compass game)
        mazeRound: 0, mazePx: 0, mazePy: 7, mazeSteps: 0, mazeWon: false, mazeWins: 0, mazeTrail: [],
        // Materials sorter
        matGuesses: {}, matRevealed: false, matPerfect: false,
        // Junkyard crane
        craneSlot: 0, cranePower: false, craneHolding: null,
        craneItems: { 0: 'nail', 1: 'foil', 2: 'clip', 3: 'penny', 4: 'nickel', 5: 'ruler', 6: 'cobalt', 7: 'pencil' },
        craneDeposited: {}, craneMsg: '', craneDone: false,
        // Transformer
        xfmrN1: 100, xfmrN2: 200, xfmrAC: true, xfmrTouched: false,
        xfmrLoad: 120, xfmrEfficiency: 94,
        // Quiz
        quizIdx: 0, quizScore: 0, quizPicked: null, quizDone: false, quizBest: 0, quizMissed: [],
        factIdx: 0,
        askInput: '', askAnswer: '', askLoading: false
      };
      var d = Object.assign({}, MAG_DEFAULTS, (labToolData && labToolData.magnetism) || {});
      _motorSpinConfig.current = Number(d.motorCurrent) || 0;
      _motorSpinConfig.field = Number(d.motorField) || 0;
      _motorSpinConfig.load = Math.max(0, Number(d.motorLoad) || 0);
      _motorSpinConfig.currentDir = Number(d.motorCurrentDir) < 0 ? -1 : 1;
      _motorSpinConfig.fieldDir = Number(d.motorFieldDir) < 0 ? -1 : 1;
      _motorSpinConfig.angle = Number(d.motorAngle) || 0;
      _motorSpinConfig.running = !!d.motorRunning;
      React.useEffect(function () {
        if (d.tab === 'motor' && d.motorMode === 'forces' && d.motorRunning && !_prefersReducedMotion) {
          _motorSpinConfig.running = true;
          _motorSpinConfig.angle = Number(d.motorAngle) || 0;
          spinMotor();
        } else {
          stopMotorSpin();
        }
      }, [d.tab, d.motorMode, d.motorRunning, d.motorCurrent, d.motorField, d.motorLoad, d.motorCurrentDir, d.motorFieldDir]);
      React.useEffect(function () {
        return function () { stopMotorSpin(); };
      }, []);

      if (!labToolData || !labToolData.magnetism) {
        setLabToolData(function (prev) {
          return Object.assign({}, prev, { magnetism: MAG_DEFAULTS });
        });
        return h('div', { style: { padding: 24, color: SOFT, textAlign: 'center' } }, __alloT('stem.magnetism.initializing', '🧲 Charging the coils…'));
      }
      // PARTIAL state must render, not crash: saved projects from older
      // versions (and the render gate's per-tab probe) supply only some
      // fields — layer the defaults under whatever is present.
      function upd(patch) {
        setLabToolData(function (prev) {
          var s = Object.assign({}, (prev && prev.magnetism) || {}, patch);
          return Object.assign({}, prev, { magnetism: s });
        });
      }
      function stopMotorSpin() {
        _motorSpinActive = false;
        if (_motorSpinRAF != null && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
          window.cancelAnimationFrame(_motorSpinRAF);
        }
        _motorSpinRAF = null;
      }

      function card(title, children, accent) {
        return h('div', { className: 'mag-card', role: 'region', 'aria-label': typeof title === 'string' ? title : undefined, style: { '--mag-accent': accent || '#f43f5e', padding: 14, borderRadius: 12, background: PANEL, border: '1px solid ' + BORDER, borderLeft: '3px solid ' + (accent || '#f43f5e'), marginBottom: 12 } },
          title ? h('h3', { className: 'mag-card-title', style: { fontSize: 14, fontWeight: 800, color: TEXT, margin: '0 0 8px' } }, title) : null,
          children);
      }

      function wcagStyles() {
        return h('style', { dangerouslySetInnerHTML: { __html:
          '.mag-root button:focus-visible,.mag-root input:focus-visible,.mag-root select:focus-visible,.mag-root textarea:focus-visible,.mag-root summary:focus-visible{outline:3px solid #fbbf24;outline-offset:2px;border-radius:8px}' +
          '.mag-root .mag-sronly{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}' +
          '.mag-root{--mag-rose:#f43f5e;--mag-active:#be123c;--mag-gold:#fbbf24;--mag-green:#34d399}' +
          '.mag-root button{min-height:36px}' +
          '.mag-root button:disabled{cursor:not-allowed!important;opacity:.55}' +
          '.mag-root button:disabled:hover{transform:none!important}' +
          '.mag-root .mag-pole-key{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 9px;color:' + SOFT + ';font-size:11.5px}' +
          '.mag-root .mag-pole-key span{display:inline-flex;align-items:center;gap:5px}' +
          '.mag-root .mag-pole-chip{display:inline-grid;place-items:center;width:22px;height:22px;border:2px solid currentColor;border-radius:5px;color:' + TEXT + ';font-style:normal;font-size:11px;font-weight:800}' +
          '.mag-root .mag-scene-text{margin:7px 0 10px;color:' + SOFT + ';font-size:11.5px;line-height:1.45}' +
          '.mag-root .mag-scene-text summary{color:' + TEXT + ';font-weight:700;cursor:pointer;min-height:28px;display:flex;align-items:center}' +
          '.mag-root .mag-scene-frame{position:relative;margin-bottom:7px}' +
          '.mag-root .mag-scene-frame canvas{box-shadow:inset 0 0 0 1px rgba(148,163,184,.12),0 14px 34px rgba(2,6,23,.24)}' +
          '.mag-root .mag-scene-hud{position:absolute;left:10px;top:10px;right:48px;display:flex;gap:6px;flex-wrap:wrap;pointer-events:none}' +
          '.mag-root .mag-hud-chip{display:grid;grid-template-columns:auto auto;grid-template-areas:"dot label" "dot value";column-gap:6px;align-items:center;padding:6px 8px;border:1px solid ' + BORDER + ';border-radius:9px;background:' + INSTRUMENT + ';box-shadow:0 6px 18px rgba(2,6,23,.28);color:' + TEXT + '}' +
          '.mag-root .mag-hud-dot{grid-area:dot;width:7px;height:7px;border-radius:50%;background:var(--mag-hud-tone);box-shadow:0 0 0 3px color-mix(in srgb,var(--mag-hud-tone) 20%,transparent)}' +
          '.mag-root .mag-hud-label{grid-area:label;color:' + SOFT + ';font-size:11px;line-height:1.1}' +
          '.mag-root .mag-hud-value{grid-area:value;color:' + TEXT + ';font-size:12.5px;font-weight:800;line-height:1.2;font-variant-numeric:tabular-nums}' +
          '.mag-root .mag-scene-axis{position:absolute;right:10px;bottom:10px;padding:4px 7px;border:1px solid ' + BORDER + ';border-radius:7px;background:' + INSTRUMENT + ';color:' + SOFT + ';font-size:11px;font-weight:700;letter-spacing:.08em;pointer-events:none}' +
          '.mag-root .mag-hero{position:relative;overflow:hidden;padding:16px 18px;border:1px solid ' + BORDER + ';border-radius:16px;background:linear-gradient(135deg,rgba(244,63,94,.16),rgba(56,189,248,.06) 58%,transparent);margin-bottom:12px}' +
          '.mag-root .mag-hero:after{content:"";position:absolute;width:130px;height:130px;border:22px solid rgba(244,63,94,.08);border-radius:50%;right:-48px;top:-72px;pointer-events:none}' +
          '.mag-root .mag-kicker{text-transform:uppercase;letter-spacing:.12em;font-size:11px;font-weight:800;color:' + TEXT + ';margin-bottom:3px}' +
          '.mag-root .mag-card{position:relative;overflow:hidden;box-shadow:0 10px 28px rgba(2,6,23,.12)}' +
          '.mag-root .mag-card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--mag-accent)}' +
          '.mag-root .mag-card-title{display:flex;align-items:center;gap:7px}' +
          '.mag-root .mag-card-title:before{content:"";width:7px;height:7px;border-radius:50%;background:var(--mag-accent)}' +
          '.mag-root .mag-tabs button{transition:transform .16s ease,background .16s ease,border-color .16s ease}' +
          '.mag-root .mag-tabs button:hover{transform:translateY(-1px)}' +
          '.mag-root .mag-station{display:grid;grid-template-columns:minmax(0,1.35fr) repeat(3,minmax(0,1fr));gap:8px;align-items:stretch;padding:12px;border:1px solid ' + BORDER + ';border-radius:14px;background:rgba(148,163,184,.055);margin-bottom:12px}' +
          '.mag-root .mag-station-main{padding:2px 8px 2px 2px}' +
          '.mag-root .mag-cycle{min-width:0;padding:8px 9px;border-left:2px solid ' + BORDER + '}' +
          '.mag-root .mag-cycle b{display:block;color:' + TEXT + ';font-size:11px;margin-bottom:3px}' +
          '.mag-root .mag-cycle span{display:block;color:' + SOFT + ';font-size:11px;line-height:1.35}' +
          '.mag-root .mag-legend{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;color:' + SOFT + ';font-size:11px;margin:-2px 0 10px}' +
          '.mag-root .mag-legend span{display:inline-flex;align-items:center;gap:5px}' +
          '.mag-root .mag-swatch{display:inline-block;width:18px;height:2px;background:currentColor}' +
          '.mag-root .mag-strength-meter{display:inline-flex;align-items:flex-end;gap:3px;margin:0 4px;vertical-align:middle}' +
          '.mag-root .mag-strength-meter i{display:block;width:8px;height:6px;border:1px solid ' + BORDER + ';border-radius:2px;background:transparent}' +
          '.mag-root .mag-strength-meter i:nth-child(2){height:8px}.mag-root .mag-strength-meter i:nth-child(3){height:10px}.mag-root .mag-strength-meter i:nth-child(4){height:12px}.mag-root .mag-strength-meter i:nth-child(5){height:14px}.mag-root .mag-strength-meter i:nth-child(6){height:16px}' +
          '.mag-root .mag-strength-meter i.is-on{border-color:#fb7185;background:#fb7185;box-shadow:0 0 7px rgba(251,113,133,.28)}' +
          '.mag-root .mag-observe{display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:start;padding:9px 10px;border-radius:10px;background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.24);margin:9px 0;color:' + SOFT + ';font-size:12px;line-height:1.45}' +
          '.mag-root .mag-observe b{color:' + TEXT + '}' +
          '.mag-root .mag-field3d,.mag-root .mag-induction3d,.mag-root .mag-electro3d,.mag-root .mag-motor3d,.mag-root .mag-charge3d,.mag-root .mag-earth3d{height:410px}' +
          '@media(max-width:480px){.mag-root .mag-sim-grid{grid-template-columns:1fr!important}.mag-root .mag-field3d,.mag-root .mag-induction3d,.mag-root .mag-electro3d,.mag-root .mag-motor3d,.mag-root .mag-charge3d,.mag-root .mag-earth3d{height:320px}.mag-root .mag-scene-hud{left:7px;top:7px;right:40px;gap:4px}.mag-root .mag-hud-chip{padding:5px 6px}.mag-root .mag-scene-axis{right:7px;bottom:7px}}' +
          '@media(max-width:640px){.mag-root .mag-station{grid-template-columns:1fr 1fr}.mag-root .mag-station-main{grid-column:1/-1}.mag-root .mag-cycle{border-left:0;border-top:2px solid ' + BORDER + '}.mag-root .mag-cycle:last-child{grid-column:1/-1}.mag-root .mag-hero{padding:14px}.mag-root .mag-tabs button{flex:1 1 145px}}' +
          '@media(max-width:390px){.mag-root .mag-station{grid-template-columns:1fr}.mag-root .mag-cycle:last-child{grid-column:auto}}' +
          '@media(prefers-reduced-motion:reduce){.mag-root *{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}' +
          '@media(forced-colors:active){.mag-root .mag-card,.mag-root .mag-hero{box-shadow:none}.mag-root .mag-swatch,.mag-root .mag-pole-chip{border:1px solid CanvasText}.mag-root button[aria-pressed="true"],.mag-root button[aria-selected="true"]{outline:2px solid SelectedItem;outline-offset:1px}}'
        } });
      }

      // ── Tab bar ───────────────────────────────────────────────────────
      var TABS = [
        { id: 'field', label: '🧭 Field Explorer' },
        { id: 'electro', label: '🔌 Electromagnet' },
        { id: 'motor', label: '⚙️ Motor' },
        { id: 'induce', label: '⚡ Generator' },
        { id: 'materials', label: '🔩 Materials' },
        { id: 'crane', label: '🏗️ Crane' },
        { id: 'maze', label: '🧭 Field Walk' },
        { id: 'transformer', label: '🔁 Transformer' },
        { id: 'earth', label: '🌍 Earth’s Field' },
        { id: 'quiz', label: '🧠 Quiz' }
      ];
      var STATION_GUIDES = {
        field: { phase: 'See the field', icon: '🧭', goal: 'Map an invisible field with evidence.', predict: 'Where will the compass turn?', test: 'Move it near each pole.', explain: 'Connect direction and line spacing.' },
        electro: { phase: 'Build a field', icon: '🔌', goal: 'Find what controls electromagnet strength.', predict: 'Choose the change that should help most.', test: 'Change one variable at a time.', explain: 'Use B ∝ turns × current.' },
        motor: { phase: 'Field to motion', icon: '⚙️', goal: 'Trace how magnetic force becomes rotation.', predict: 'What happens if current reaches zero?', test: 'Vary current and field strength.', explain: 'Link two forces to torque.' },
        induce: { phase: 'Motion to electricity', icon: '⚡', goal: 'Generate voltage from changing flux.', predict: 'Will a still magnet light the bulb?', test: 'Compare slow, fast, and still.', explain: 'Use change and Lenz’s law.' },
        materials: { phase: 'Inside matter', icon: '🔩', goal: 'Separate “metal” from “ferromagnetic.”', predict: 'Classify every material first.', test: 'Reveal the magnet’s pull.', explain: 'Connect results to domains.' },
        crane: { phase: 'Apply the idea', icon: '🏗️', goal: 'Use a switchable field to sort a scrapyard.', predict: 'Which objects can the crane lift?', test: 'Power on to grab; off to release.', explain: 'Name the shared material property.' },
        maze: { phase: 'Follow evidence', icon: '🧭', goal: 'Navigate using only local field direction.', predict: 'Will the needle point straight at the magnet?', test: 'Follow it one square at a time.', explain: 'Read your curved breadcrumb path.' },
        transformer: { phase: 'Transfer energy', icon: '🔁', goal: 'Relate coil turns to AC voltage.', predict: 'Will more secondary turns step up?', test: 'Change the turns ratio and input.', explain: 'Track voltage, current, and power.' },
        earth: { phase: 'Planet-scale field', icon: '🌍', goal: 'Connect local navigation to a planet-scale magnetic shield.', predict: 'What will stronger solar wind compress or stretch?', test: 'Compare 2D and 3D views while changing pressure.', explain: 'Separate declination, dipole structure, and space weather.' },
        quiz: { phase: 'Retrieve & reflect', icon: '🧠', goal: 'Use evidence from the lab, not memorized slogans.', predict: 'Commit to one answer.', test: 'Read the feedback after each choice.', explain: 'Revisit only the concepts you missed.' }
      };
      function tabBar() {
        function activateTab(tab, moveFocus) {
          upd(Object.assign({ tab: tab.id }, tab.id === 'earth' ? { earthSeen: true } : {}));
          announceToSR(tab.label + ' section');
          if (moveFocus && typeof document !== 'undefined') {
            window.setTimeout(function () {
              var nextTab = document.getElementById('mag-tab-' + tab.id);
              if (nextTab && typeof nextTab.focus === 'function') nextTab.focus();
            }, 0);
          }
        }
        function onTabKeyDown(event, index) {
          var nextIndex = null;
          if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % TABS.length;
          if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + TABS.length) % TABS.length;
          if (event.key === 'Home') nextIndex = 0;
          if (event.key === 'End') nextIndex = TABS.length - 1;
          if (nextIndex == null) return;
          event.preventDefault();
          activateTab(TABS[nextIndex], true);
        }
        return h('div', { className: 'mag-tabs', role: 'tablist', 'aria-label': 'Magnetism sections', 'aria-orientation': 'horizontal', style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
          TABS.map(function (t, index) {
            var on = d.tab === t.id;
            return h('button', { key: t.id, id: 'mag-tab-' + t.id, type: 'button', role: 'tab', tabIndex: on ? 0 : -1, 'aria-selected': on ? 'true' : 'false',
              'aria-controls': 'mag-panel-' + t.id,
              onKeyDown: function (event) { onTabKeyDown(event, index); },
              onClick: function () { activateTab(t, false); },
              style: { padding: '8px 12px', borderRadius: 9, border: '1px solid ' + (on ? ACTIVE : BORDER), background: on ? ACTIVE : 'transparent', color: on ? '#fff' : TEXT, boxShadow: on ? 'inset 0 -3px 0 #fff' : 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' } }, t.label);
          }));
      }

      function stationGuide() {
        var g = STATION_GUIDES[d.tab] || STATION_GUIDES.field;
        if (d.learningMode === 'challenge' && d.tab !== 'quiz') {
          return h('section', { className: 'mag-station', 'aria-label': g.phase + ' challenge investigation' },
            h('div', { className: 'mag-station-main' },
              h('div', { className: 'mag-kicker' }, 'Challenge investigation'),
              h('div', { style: { color: TEXT, fontSize: 14, fontWeight: 800, lineHeight: 1.3 } }, g.icon + ' ' + g.phase),
              h('div', { style: { color: SOFT, fontSize: 11.5, lineHeight: 1.4, marginTop: 3 } }, g.goal)),
            h('div', { className: 'mag-cycle', style: { gridColumn: 'span 3' } },
              h('b', null, 'Design your own fair test'),
              h('span', null, 'Write a prediction, change one variable, record evidence, and defend a claim in the notebook. Guidance and answer-highlighting are reduced.'))
          );
        }
        return h('section', { className: 'mag-station', 'aria-label': g.phase + ' learning cycle' },
          h('div', { className: 'mag-station-main' },
            h('div', { className: 'mag-kicker' }, 'Current investigation'),
            h('div', { style: { color: TEXT, fontSize: 14, fontWeight: 800, lineHeight: 1.3 } }, g.icon + ' ' + g.phase),
            h('div', { style: { color: SOFT, fontSize: 11.5, lineHeight: 1.4, marginTop: 3 } }, g.goal)),
          h('div', { className: 'mag-cycle' }, h('b', null, '1 · Predict'), h('span', null, g.predict)),
          h('div', { className: 'mag-cycle' }, h('b', null, '2 · Test'), h('span', null, g.test)),
          h('div', { className: 'mag-cycle' }, h('b', null, '3 · Explain'), h('span', null, g.explain))
        );
      }

      // ── Field Explorer ────────────────────────────────────────────────
      function renderFieldSVG() {
        var W = 380, HH = 300, cx = W / 2, cy = HH / 2;
        function sx(x) { return cx + x; }
        function sy(y) { return cy + y; }
        var kids = [];
        // background + faint coordinate grid: the grid makes compass motion and
        // distance comparisons visible without pretending to be a measurement scale.
        kids.push(h('rect', { key: 'bg', x: 0, y: 0, width: W, height: HH, fill: INSTRUMENT, rx: 10 }));
        for (var gx = 20; gx < W; gx += 40) {
          kids.push(h('line', { key: 'gx' + gx, x1: gx, y1: 0, x2: gx, y2: HH, stroke: 'rgba(148,163,184,0.07)', strokeWidth: 1 }));
        }
        for (var gy = 20; gy < HH; gy += 40) {
          kids.push(h('line', { key: 'gy' + gy, x1: 0, y1: gy, x2: W, y2: gy, stroke: 'rgba(148,163,184,0.07)', strokeWidth: 1 }));
        }

        // traced field lines (schematic dipole model)
        var seeds = [];
        d.magnets.forEach(function (m) {
          // seed rings around the north end of each magnet
          var nx = m.x + Math.cos(m.angle) * 16 * m.polarity;
          var ny = m.y + Math.sin(m.angle) * 16 * m.polarity;
          for (var a = 0; a < 8; a++) {
            var ang = (a / 8) * Math.PI * 2;
            seeds.push([nx + Math.cos(ang) * 10, ny + Math.sin(ang) * 10]);
          }
        });
        seeds.forEach(function (s, i) {
          var fwd = traceLine(s[0], s[1], d.magnets, 1, { step: 6, maxSteps: 120, bound: 200 });
          var back = traceLine(s[0], s[1], d.magnets, -1, { step: 6, maxSteps: 120, bound: 200 });
          var all = back.slice().reverse().concat(fwd.slice(1));
          if (all.length < 3) return;
          var dpath = 'M ' + all.map(function (p) { return sx(p[0]).toFixed(1) + ' ' + sy(p[1]).toFixed(1); }).join(' L ');
          kids.push(h('path', { key: 'fl' + i, d: dpath, fill: 'none', stroke: d.filings ? 'rgba(148,163,184,0.38)' : 'rgba(244,63,94,0.48)', strokeWidth: d.filings ? 1 : 1.4 }));
          // A chevron on each line makes the N → S direction readable without
          // relying on color or on the explanatory paragraph.
          var mp = all[Math.floor(all.length / 2)];
          var mb = fieldAt(mp[0], mp[1], d.magnets);
          var mm = Math.sqrt(mb.x * mb.x + mb.y * mb.y) || 1;
          var ux = mb.x / mm, uy = mb.y / mm, px = sx(mp[0]), py = sy(mp[1]);
          kids.push(h('polygon', { key: 'arrow' + i,
            points: (px + ux * 5).toFixed(1) + ',' + (py + uy * 5).toFixed(1) + ' ' +
              (px - ux * 3 - uy * 3).toFixed(1) + ',' + (py - uy * 3 + ux * 3).toFixed(1) + ' ' +
              (px - ux * 3 + uy * 3).toFixed(1) + ',' + (py - uy * 3 - ux * 3).toFixed(1),
            fill: d.filings ? 'rgba(226,232,240,0.56)' : 'rgba(251,191,36,0.9)' }));
        });

        // Iron filings align as many tiny compasses. Sample the same field at
        // a regular grid and rotate each grain to the local field direction.
        if (d.filings) {
          for (var fy = -120; fy <= 120; fy += 24) {
            for (var fx = -168; fx <= 168; fx += 28) {
              var fb = fieldAt(fx, fy, d.magnets);
              var fm = Math.sqrt(fb.x * fb.x + fb.y * fb.y);
              if (fm < 1e-10) continue;
              var blocked = d.magnets.some(function (m) { return Math.abs(fx - m.x) < 38 && Math.abs(fy - m.y) < 18; });
              if (blocked) continue;
              var fux = fb.x / fm, fuy = fb.y / fm;
              var grain = 4.5;
              kids.push(h('line', { key: 'filing' + fx + ':' + fy,
                x1: sx(fx - fux * grain), y1: sy(fy - fuy * grain),
                x2: sx(fx + fux * grain), y2: sy(fy + fuy * grain),
                stroke: 'rgba(226,232,240,0.62)', strokeWidth: 1.2, strokeLinecap: 'round' }));
            }
          }
        }

        // magnets (bars: red N half, blue S half)
        d.magnets.forEach(function (m, i) {
          var len = 64, wdt = 22;
          var deg = m.angle * 180 / Math.PI;
          var g = [];
          // north half
          g.push(h('rect', { key: 'n', x: 0, y: -wdt / 2, width: len / 2, height: wdt, fill: m.polarity > 0 ? '#ef4444' : '#3b82f6' }));
          g.push(h('rect', { key: 's', x: -len / 2, y: -wdt / 2, width: len / 2, height: wdt, fill: m.polarity > 0 ? '#3b82f6' : '#ef4444' }));
          g.push(h('text', { key: 'nl', x: len / 2 - 9, y: 4, fill: '#fff', fontSize: 12, fontWeight: 800, textAnchor: 'middle' }, m.polarity > 0 ? 'N' : 'S'));
          g.push(h('text', { key: 'sl', x: -len / 2 + 9, y: 4, fill: '#fff', fontSize: 12, fontWeight: 800, textAnchor: 'middle' }, m.polarity > 0 ? 'S' : 'N'));
          if (d.fieldSelected === i) {
            g.unshift(h('rect', { key: 'sel', x: -len / 2 - 5, y: -wdt / 2 - 5, width: len + 10, height: wdt + 10, rx: 7, fill: 'none', stroke: '#fbbf24', strokeWidth: 2, strokeDasharray: '4 3' }));
          }
          kids.push(h('g', { key: 'mag' + i, transform: 'translate(' + sx(m.x) + ',' + sy(m.y) + ') rotate(' + deg.toFixed(1) + ')',
            onPointerDown: function (e) {
              e.stopPropagation();
              try { if (e.currentTarget.ownerSVGElement) e.currentTarget.ownerSVGElement.setPointerCapture(e.pointerId); } catch (err) {}
              upd({ fieldDrag: i, fieldSelected: i });
              announceToSR('Moving magnet ' + (i + 1));
            },
            style: { cursor: 'grab' } }, g));
        });

        // At the probe, show each source vector and their exact vector sum.
        if (d.fieldVectors && d.magnets.length > 1) {
          var components = fieldComponentsAt(d.compass.x, d.compass.y, d.magnets);
          var total = fieldAt(d.compass.x, d.compass.y, d.magnets);
          var totalMag = Math.sqrt(total.x * total.x + total.y * total.y);
          var vectorSet = components.concat([{ index: -1, x: total.x, y: total.y, magnitude: totalMag }]);
          var maxVector = vectorSet.reduce(function (mx, v) { return Math.max(mx, v.magnitude); }, 1e-12);
          vectorSet.forEach(function (v, vi) {
            if (v.magnitude < 1e-12) return;
            var length = 36 * v.magnitude / maxVector;
            var ux = v.x / v.magnitude, uy = v.y / v.magnitude;
            var x2 = sx(d.compass.x) + ux * length, y2 = sy(d.compass.y) + uy * length;
            var color = v.index < 0 ? '#fbbf24' : (v.index === 0 ? '#38bdf8' : '#a78bfa');
            var label = v.index < 0 ? 'B total' : 'B' + (v.index + 1);
            kids.push(h('g', { key: 'vec' + vi },
              h('line', { x1: sx(d.compass.x), y1: sy(d.compass.y), x2: x2, y2: y2, stroke: color, strokeWidth: v.index < 0 ? 3 : 2 }),
              h('circle', { cx: x2, cy: y2, r: v.index < 0 ? 3.5 : 2.5, fill: color }),
              h('text', { x: x2 + 4, y: y2 - 4, fill: color, fontSize: 11, fontWeight: 700 }, label)));
          });
        }

        // compass needle points along the resultant local field
        var b = fieldAt(d.compass.x, d.compass.y, d.magnets);
        var bang = Math.atan2(b.y, b.x);
        var cxp = sx(d.compass.x), cyp = sy(d.compass.y);
        kids.push(h('g', { key: 'compass', transform: 'translate(' + cxp + ',' + cyp + ')' },
          h('circle', { r: 18, fill: '#0f172a', stroke: '#e2e8f0', strokeWidth: 1.5 }),
          h('g', { transform: 'rotate(' + (bang * 180 / Math.PI).toFixed(1) + ')' },
            h('polygon', { points: '15,0 -3,-4 -3,4', fill: '#ef4444' }),
            h('polygon', { points: '-15,0 3,-4 3,4', fill: '#e2e8f0' }))
        ));

        function pointerFieldPoint(e) {
          var rect = e.currentTarget.getBoundingClientRect();
          if (!rect.width || !rect.height) return null;
          return {
            x: Math.max(-180, Math.min(180, (e.clientX - rect.left) / rect.width * W - W / 2)),
            y: Math.max(-130, Math.min(130, (e.clientY - rect.top) / rect.height * HH - HH / 2))
          };
        }
        return h('svg', { role: 'img', 'aria-label': 'Magnetic field lines around ' + d.magnets.length + ' bar magnets, draggable sources, component vectors, and a compass pointing along the resultant field.', viewBox: '0 0 ' + W + ' ' + HH, width: '100%', style: { maxWidth: 460, borderRadius: 10, border: '1px solid ' + BORDER, touchAction: 'none', cursor: d.fieldDrag == null ? 'crosshair' : 'grabbing' },
          onPointerMove: function (e) {
            if (d.fieldDrag == null) return;
            var p = pointerFieldPoint(e);
            if (!p) return;
            var ms = d.magnets.map(function (m, i) { return i === d.fieldDrag ? Object.assign({}, m, p) : m; });
            upd({ magnets: ms });
          },
          onPointerUp: function (e) {
            if (d.fieldDrag == null) return;
            try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {}
            upd({ fieldDrag: null });
            announceToSR('Placed magnet ' + (d.fieldDrag + 1));
          },
          onPointerCancel: function () { if (d.fieldDrag != null) upd({ fieldDrag: null }); },
          onClick: function (e) {
            if (d.fieldDrag != null) return;
            try {
              var p = pointerFieldPoint(e);
              if (!p) return;
              upd({ compass: p, compassMoved: true });
            } catch (err) {}
          }
          }, kids);
      }

      function currentField3DState() {
        return {
          magnets: (d.field3dMagnets || []).map(function (m) { return Object.assign({}, m); }),
          probe: Object.assign({}, d.field3dProbe || { x: 0, y: 1.8, z: 1.2 }),
          selected: Math.max(0, Math.min((d.field3dMagnets || []).length - 1, d.field3dSelected || 0)),
          vectors: d.field3dVectors !== false,
          lines: d.field3dLines !== false,
          slice: d.field3dSlice || 'none',
          sliceOffset: Number(d.field3dSliceOffset) || 0
        };
      }

      function commitField3D(patch, message) {
        upd(Object.assign({ field3dUsed: true, compassMoved: true }, patch));
        if (message) announceToSR(message);
      }

      function initField3DCanvas(cv) {
        if (!cv || cv._mag3dInit) return;
        if (!window.StemLab || typeof window.StemLab.ensureThree !== 'function') return;
        cv._mag3dInit = true;
        window.StemLab.ensureThree({ orbit: true, orbitRequired: true, failMessage: 'The 3D engine could not load. The complete 2D field map remains available.' })
          .then(function (THREE) {
            if (!cv.isConnected) { cv._mag3dInit = false; return; }
            var renderer;
            try {
              renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, powerPreference: 'high-performance' });
            } catch (error) {
              cv._mag3dInit = false;
              upd({ field3dStatus: 'error' });
              return;
            }
            var scene = new THREE.Scene();
            var backgroundColor = new THREE.Color(0x07111f);
            try {
              var themeBackground = window.getComputedStyle(cv).getPropertyValue('--allo-stem-instrument').trim();
              if (themeBackground) backgroundColor.setStyle(themeBackground);
            } catch (themeError) {}
            scene.background = backgroundColor;
            scene.fog = new THREE.FogExp2(backgroundColor.getHex(), 0.035);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
            if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
            var camera = new THREE.PerspectiveCamera(46, 1, 0.1, 80);
            camera.position.set(7.5, 5.8, 8.2);
            var controls = new THREE.OrbitControls(camera, cv);
            controls.enableDamping = false;
            controls.minDistance = 5;
            controls.maxDistance = 22;
            controls.target.set(0, 0.2, 0);
            scene.add(new THREE.HemisphereLight(0xcffafe, 0x172554, 1.25));
            var keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
            keyLight.position.set(5, 8, 7);
            scene.add(keyLight);
            var rimLight = new THREE.PointLight(0xa78bfa, 1.3, 22);
            rimLight.position.set(-5, 2, -5);
            scene.add(rimLight);
            var grid = new THREE.GridHelper(9, 18, 0x64748b, 0x334155);
            grid.material.transparent = true;
            grid.material.opacity = 0.34;
            scene.add(grid);
            var axes = new THREE.AxesHelper(3.8);
            axes.material.transparent = true;
            axes.material.opacity = 0.52;
            scene.add(axes);

            var magnetGroup = new THREE.Group(), lineGroup = new THREE.Group(), vectorGroup = new THREE.Group(), sliceGroup = new THREE.Group(), probeGroup = new THREE.Group();
            scene.add(sliceGroup); scene.add(lineGroup); scene.add(vectorGroup); scene.add(magnetGroup); scene.add(probeGroup);
            var liveState = cv._mag3dState || currentField3DState();
            var raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
            var dragMagnet = null, pointerStart = null, resizeObserver = null, disposed = false;
            var cyan = new THREE.Color(0x38bdf8), gold = new THREE.Color(0xfbbf24);

            function disposeObject(obj) {
              obj.traverse(function (child) {
                if (child.geometry && child.geometry.dispose) child.geometry.dispose();
                if (child.material) {
                  (Array.isArray(child.material) ? child.material : [child.material]).forEach(function (material) {
                    if (material && material.dispose) material.dispose();
                  });
                }
              });
            }
            function clearGroup(group) {
              while (group.children.length) {
                var child = group.children[group.children.length - 1];
                group.remove(child);
                disposeObject(child);
              }
            }
            function resize() {
              var width = Math.max(1, cv.clientWidth || 640), height = Math.max(1, cv.clientHeight || 410);
              renderer.setSize(width, height, false);
              camera.aspect = width / height;
              camera.updateProjectionMatrix();
            }
            function renderScene() {
              if (disposed) return;
              resize();
              renderer.render(scene, camera);
            }
            function momentVector(mag, includePolarity) {
              var source = Object.assign({}, mag, { strength: 1, polarity: includePolarity ? mag.polarity : 1 });
              var m = dipoleMoment3D(source);
              return new THREE.Vector3(m.x, m.y, m.z).normalize();
            }
            function addArrow(group, origin, field, color, length, opacity) {
              var magnitude = Math.sqrt(field.x * field.x + field.y * field.y + field.z * field.z);
              if (magnitude < 1e-12) return;
              var arrow = new THREE.ArrowHelper(new THREE.Vector3(field.x, field.y, field.z).normalize(), origin, length, color, Math.min(0.22, length * 0.28), Math.min(0.12, length * 0.15));
              arrow.line.material.transparent = true; arrow.line.material.opacity = opacity;
              arrow.cone.material.transparent = true; arrow.cone.material.opacity = opacity;
              group.add(arrow);
            }
            function fieldLevel(magnitude) {
              return Math.max(0, Math.min(1, (Math.log10(Math.max(1e-8, magnitude)) + 3.2) / 3.2));
            }

            function buildMagnets(state) {
              state.magnets.forEach(function (mag, index) {
                var group = new THREE.Group();
                group.position.set(mag.x, mag.y, mag.z);
                group.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), momentVector(mag, false));
                var northColor = mag.polarity < 0 ? 0x3b82f6 : 0xef4444;
                var southColor = mag.polarity < 0 ? 0xef4444 : 0x3b82f6;
                var north = new THREE.Mesh(new THREE.BoxGeometry(1, 0.66, 0.66), new THREE.MeshStandardMaterial({ color: northColor, roughness: 0.38, metalness: 0.35, emissive: northColor, emissiveIntensity: 0.12 }));
                var south = new THREE.Mesh(new THREE.BoxGeometry(1, 0.66, 0.66), new THREE.MeshStandardMaterial({ color: southColor, roughness: 0.38, metalness: 0.35, emissive: southColor, emissiveIntensity: 0.12 }));
                north.position.x = 0.5;
                south.position.x = -0.5;
                north.userData.magnetIndex = index;
                south.userData.magnetIndex = index;
                group.add(north);
                group.add(south);
                // One bright stripe marks physical north; two mark physical south.
                // The larger cross-section keeps the markers visible from oblique views.
                var northSide = mag.polarity < 0 ? -1 : 1;
                var stripeMaterial = new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.94 });
                [northSide * 0.82, -northSide * 0.72, -northSide * 0.90].forEach(function (x, stripeIndex) {
                  var stripe = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.73, 0.73), stripeMaterial);
                  stripe.position.x = x;
                  stripe.userData.magnetIndex = index;
                  stripe.userData.poleStripe = stripeIndex === 0 ? 'north-one' : 'south-two';
                  group.add(stripe);
                });
                if (index === state.selected) {
                  var edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(2.2, 0.88, 0.88));
                  var outline = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.95 }));
                  outline.userData.magnetIndex = index;
                  group.add(outline);
                }
                magnetGroup.add(group);
              });
            }

            function buildVectors(state) {
              if (!state.vectors) return;
              var samples = [-3, -1, 1, 3];
              samples.forEach(function (x) {
                samples.forEach(function (y) {
                  samples.forEach(function (z) {
                    var blocked = state.magnets.some(function (mag) {
                      var dx = x - mag.x, dy = y - mag.y, dz = z - mag.z;
                      return dx * dx + dy * dy + dz * dz < 0.9;
                    });
                    if (blocked) return;
                    var b = fieldAt3D(x, y, z, state.magnets);
                    var magnitude = Math.sqrt(b.x * b.x + b.y * b.y + b.z * b.z);
                    var level = fieldLevel(magnitude);
                    var color = cyan.clone().lerp(gold, level).getHex();
                    addArrow(vectorGroup, new THREE.Vector3(x, y, z), b, color, 0.28 + level * 0.82, 0.38 + level * 0.5);
                  });
                });
              });
            }

            function buildLines(state) {
              if (!state.lines) return;
              state.magnets.forEach(function (mag, magnetIndex) {
                var moment = momentVector(mag, true);
                var north = new THREE.Vector3(mag.x, mag.y, mag.z).add(moment.clone().multiplyScalar(1.05));
                var helper = Math.abs(moment.y) < 0.84 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
                var basisA = new THREE.Vector3().crossVectors(moment, helper).normalize();
                var basisB = new THREE.Vector3().crossVectors(moment, basisA).normalize();
                for (var ring = 0; ring < 2; ring++) {
                  for (var seedIndex = 0; seedIndex < 8; seedIndex++) {
                    var angle = seedIndex / 8 * Math.PI * 2 + ring * Math.PI / 8;
                    var radius = ring ? 0.38 : 0.24;
                    var seed = north.clone().add(basisA.clone().multiplyScalar(Math.cos(angle) * radius)).add(basisB.clone().multiplyScalar(Math.sin(angle) * radius));
                    var traced = traceLine3D({ x: seed.x, y: seed.y, z: seed.z }, state.magnets, 1, { step: 0.13, maxSteps: 210, bound: 6.4, bodyR: 0.42 });
                    if (traced.length < 3) continue;
                    var points = traced.map(function (p) { return new THREE.Vector3(p.x, p.y, p.z); });
                    var geometry = new THREE.BufferGeometry().setFromPoints(points);
                    var material = new THREE.LineBasicMaterial({ color: magnetIndex ? 0xa78bfa : 0xf43f5e, transparent: true, opacity: 0.58 });
                    lineGroup.add(new THREE.Line(geometry, material));
                    var markerIndex = Math.min(points.length - 1, Math.max(1, Math.floor(points.length * 0.48)));
                    var markerPoint = points[markerIndex];
                    var markerField = fieldAt3D(markerPoint.x, markerPoint.y, markerPoint.z, state.magnets);
                    addArrow(lineGroup, markerPoint, markerField, 0xfbbf24, 0.34, 0.86);
                  }
                }
              });
            }

            function buildSlice(state) {
              if (!state.slice || state.slice === 'none') return;
              var geometry = new THREE.PlaneGeometry(7.2, 7.2, 16, 16);
              var positions = geometry.attributes.position, colors = [];
              for (var i = 0; i < positions.count; i++) {
                var lx = positions.getX(i), ly = positions.getY(i);
                var wx = lx, wy = ly, wz = state.sliceOffset;
                if (state.slice === 'xz') { wx = lx; wy = state.sliceOffset; wz = -ly; }
                if (state.slice === 'yz') { wx = state.sliceOffset; wy = ly; wz = lx; }
                var b = fieldAt3D(wx, wy, wz, state.magnets);
                var level = fieldLevel(Math.sqrt(b.x * b.x + b.y * b.y + b.z * b.z));
                var color = new THREE.Color(0x172554).lerp(new THREE.Color(0xfbbf24), level);
                colors.push(color.r, color.g, color.b);
              }
              geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
              var material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
              var plane = new THREE.Mesh(geometry, material);
              if (state.slice === 'xz') { plane.rotation.x = -Math.PI / 2; plane.position.y = state.sliceOffset; }
              else if (state.slice === 'yz') { plane.rotation.y = Math.PI / 2; plane.position.x = state.sliceOffset; }
              else plane.position.z = state.sliceOffset;
              sliceGroup.add(plane);
            }

            function buildProbe(state) {
              var origin = new THREE.Vector3(state.probe.x, state.probe.y, state.probe.z);
              var sphere = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 12), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
              sphere.position.copy(origin);
              probeGroup.add(sphere);
              var total = fieldAt3D(state.probe.x, state.probe.y, state.probe.z, state.magnets);
              var components = fieldComponentsAt3D(state.probe.x, state.probe.y, state.probe.z, state.magnets);
              var magnitudes = components.map(function (part) { return part.magnitude; });
              magnitudes.push(Math.sqrt(total.x * total.x + total.y * total.y + total.z * total.z), 1e-12);
              var maxMagnitude = Math.max.apply(Math, magnitudes);
              components.forEach(function (part, index) {
                addArrow(probeGroup, origin, part, index ? 0xa78bfa : 0x38bdf8, 0.45 + 1.05 * part.magnitude / maxMagnitude, 0.94);
              });
              var totalMagnitude = Math.sqrt(total.x * total.x + total.y * total.y + total.z * total.z);
              addArrow(probeGroup, origin, total, 0xfbbf24, 0.55 + 1.2 * totalMagnitude / maxMagnitude, 1);
            }

            function rebuild(state) {
              if (disposed) return;
              liveState = {
                magnets: (state.magnets || []).map(function (mag) { return Object.assign({}, mag); }),
                probe: Object.assign({}, state.probe),
                selected: state.selected,
                vectors: state.vectors,
                lines: state.lines,
                slice: state.slice,
                sliceOffset: state.sliceOffset
              };
              clearGroup(magnetGroup); clearGroup(lineGroup); clearGroup(vectorGroup); clearGroup(sliceGroup); clearGroup(probeGroup);
              buildSlice(liveState); buildLines(liveState); buildVectors(liveState); buildMagnets(liveState); buildProbe(liveState);
              renderScene();
            }

            function setPointer(event) {
              var rect = cv.getBoundingClientRect();
              pointer.x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
              pointer.y = -((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
              raycaster.setFromCamera(pointer, camera);
            }
            function intersectPlane(event, y) {
              setPointer(event);
              dragPlane.set(new THREE.Vector3(0, 1, 0), -y);
              var point = new THREE.Vector3();
              return raycaster.ray.intersectPlane(dragPlane, point) ? point : null;
            }
            function onPointerDown(event) {
              pointerStart = { x: event.clientX, y: event.clientY };
              setPointer(event);
              var hits = raycaster.intersectObjects(magnetGroup.children, true);
              if (hits.length && hits[0].object.userData.magnetIndex != null) {
                dragMagnet = hits[0].object.userData.magnetIndex;
                liveState.selected = dragMagnet;
                controls.enabled = false;
                try { cv.setPointerCapture(event.pointerId); } catch (e) {}
                rebuild(liveState);
              }
            }
            function onPointerMove(event) {
              if (dragMagnet == null) return;
              var mag = liveState.magnets[dragMagnet];
              var point = intersectPlane(event, mag.y);
              if (!point) return;
              mag.x = Math.max(-3.7, Math.min(3.7, point.x));
              mag.z = Math.max(-3.7, Math.min(3.7, point.z));
              rebuild(liveState);
            }
            function onPointerUp(event) {
              if (dragMagnet != null) {
                var moved = dragMagnet;
                dragMagnet = null;
                controls.enabled = true;
                try { cv.releasePointerCapture(event.pointerId); } catch (e) {}
                if (cv._mag3dCommit) cv._mag3dCommit({ field3dMagnets: liveState.magnets, field3dSelected: moved }, 'Placed magnet ' + (moved + 1) + ' in the 3D field.');
                return;
              }
              if (!pointerStart || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) return;
              var point = intersectPlane(event, 0);
              if (!point) return;
              var probe = {
                x: Math.max(-3.8, Math.min(3.8, point.x)),
                y: liveState.probe.y,
                z: Math.max(-3.8, Math.min(3.8, point.z))
              };
              if (cv._mag3dCommit) cv._mag3dCommit({ field3dProbe: probe }, 'Moved the 3D field probe.');
            }
            function onContextLost(event) {
              event.preventDefault();
              upd({ field3dStatus: 'error' });
              announceToSR('The 3D graphics context was lost. The 2D field map remains available.');
            }
            function setView(view) {
              if (view === 'front') camera.position.set(0, 1.2, 10);
              else if (view === 'top') camera.position.set(0.01, 10, 0.01);
              else if (view === 'side') camera.position.set(10, 1.2, 0);
              else camera.position.set(7.5, 5.8, 8.2);
              controls.target.set(0, 0.2, 0);
              camera.lookAt(controls.target);
              controls.update();
              renderScene();
            }
            function cleanup() {
              if (disposed) return;
              disposed = true;
              cv.removeEventListener('pointerdown', onPointerDown);
              cv.removeEventListener('pointermove', onPointerMove);
              cv.removeEventListener('pointerup', onPointerUp);
              cv.removeEventListener('pointercancel', onPointerUp);
              cv.removeEventListener('webglcontextlost', onContextLost);
              controls.removeEventListener('change', renderScene);
              window.removeEventListener('resize', renderScene);
              controls.dispose();
              if (resizeObserver) resizeObserver.disconnect();
              clearGroup(magnetGroup); clearGroup(lineGroup); clearGroup(vectorGroup); clearGroup(sliceGroup); clearGroup(probeGroup);
              renderer.dispose();
              cv._mag3dInit = false;
              cv._mag3dUpdate = null;
              cv._mag3dCleanup = null;
            }

            cv.addEventListener('pointerdown', onPointerDown);
            cv.addEventListener('pointermove', onPointerMove);
            cv.addEventListener('pointerup', onPointerUp);
            cv.addEventListener('pointercancel', onPointerUp);
            cv.addEventListener('webglcontextlost', onContextLost);
            controls.addEventListener('change', renderScene);
            if (typeof ResizeObserver !== 'undefined') {
              resizeObserver = new ResizeObserver(renderScene);
              resizeObserver.observe(cv);
            } else {
              window.addEventListener('resize', renderScene, { passive: true });
            }

            cv._mag3dUpdate = rebuild;
            cv._mag3dSetView = setView;
            cv._mag3dCleanup = cleanup;
            rebuild(liveState);
            upd({ field3dStatus: 'ready' });
          }).catch(function () {
            cv._mag3dInit = false;
            if (cv.isConnected) {
              upd({ field3dStatus: 'error' });
              announceToSR('The 3D engine could not load. Use the complete 2D field map or retry.');
            }
          });
      }

      function field3DCanvasRef(cv) {
        if (!cv) {
          var oldCanvas = _field3DCanvas;
          window.setTimeout(function () {
            if (oldCanvas && !oldCanvas.isConnected && typeof oldCanvas._mag3dCleanup === 'function') oldCanvas._mag3dCleanup();
          }, 0);
          return;
        }
        _field3DCanvas = cv;
        cv._mag3dState = currentField3DState();
        cv._mag3dCommit = commitField3D;
        if (typeof cv._mag3dUpdate === 'function') cv._mag3dUpdate(cv._mag3dState);
        else initField3DCanvas(cv);
      }
      function clamp3D(value) { return Math.max(-3.7, Math.min(3.7, Number(value) || 0)); }

      function updateSelectedField3DMagnet(patch, message) {
        var magnets = (d.field3dMagnets || []).map(function (mag, index) {
          return index === (d.field3dSelected || 0) ? Object.assign({}, mag, patch) : Object.assign({}, mag);
        });
        commitField3D({ field3dMagnets: magnets }, message);
      }

      function moveSelectedField3D(axis, amount) {
        var selected = Math.max(0, Math.min((d.field3dMagnets || []).length - 1, d.field3dSelected || 0));
        var mag = (d.field3dMagnets || [])[selected];
        if (!mag) return;
        var patch = {};
        patch[axis] = clamp3D((Number(mag[axis]) || 0) + amount);
        updateSelectedField3DMagnet(patch, 'Moved magnet ' + (selected + 1) + ' along the ' + axis + ' axis.');
      }

      function setField3DSetup(mode) {
        var repel = mode === 'repel';
        commitField3D({
          field3dMagnets: [
            { x: -1.6, y: 0, z: 0, yaw: 0, pitch: 0, polarity: 1, strength: 1 },
            { x: 1.6, y: 0, z: 0, yaw: repel ? Math.PI : 0, pitch: 0, polarity: 1, strength: 1 }
          ],
          field3dSelected: 0,
          sawAttract: !repel || d.sawAttract,
          sawRepel: repel || d.sawRepel,
          field3dNullFound: false
        }, repel ? 'Loaded the like-poles repulsion setup.' : 'Loaded the opposite-poles attraction setup.');
      }

      function field3DCard() {
        var magnets = (d.field3dMagnets || []).map(function (mag) { return Object.assign({}, mag); });
        var probe = Object.assign({ x: 0, y: 1.8, z: 1.2 }, d.field3dProbe || {});
        var selected = Math.max(0, Math.min(magnets.length - 1, d.field3dSelected || 0));
        var selectedMagnet = magnets[selected] || { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, polarity: 1, strength: 1 };
        var total = fieldAt3D(probe.x, probe.y, probe.z, magnets);
        var components = fieldComponentsAt3D(probe.x, probe.y, probe.z, magnets);
        var totalMagnitude = Math.sqrt(total.x * total.x + total.y * total.y + total.z * total.z);
        var componentSum = components.reduce(function (sum, part) { return sum + part.magnitude; }, 0);
        var cancellation = componentSum > 1e-12 ? totalMagnitude / componentSum : 0;
        var strengthLevel = Math.max(0, Math.min(5, Math.floor((Math.log10(Math.max(1e-8, totalMagnitude)) + 4) * 1.35)));
        var strengthWords = ['extremely weak', 'very weak', 'weak', 'moderate', 'strong', 'very strong'];
        function vectorValue(value) {
          return Math.abs(value) < 0.001 && value !== 0 ? value.toExponential(2) : value.toFixed(3);
        }
        function setProbe(axis, value) {
          var next = Object.assign({}, probe);
          next[axis] = Number(value);
          commitField3D({ field3dProbe: next, field3dNullFound: false });
        }
        function viewButton(id, label) {
          return h('button', { key: id, onClick: function () {
            if (_field3DCanvas && typeof _field3DCanvas._mag3dSetView === 'function') _field3DCanvas._mag3dSetView(id);
            announceToSR(label + ' view selected.');
          }, style: btn() }, label);
        }
        return card('3D Magnetic Field Studio', h('div', null,
          h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } },
            'Orbit to see that a magnetic field fills space, not just a flat page. Drag a magnet across the ground plane, click open space to move the gold probe, or use the keyboard controls below.'),
          sceneViewport(h('canvas', {
            key: 'field3d-' + (d.field3dAttempt || 0),
            ref: field3DCanvasRef,
            className: 'mag-field3d',
            role: 'img',
            'aria-label': 'Interactive three-dimensional magnetic field with bar magnets, streamlines, vectors, and a field probe.',
            'aria-describedby': 'mag-field3d-instructions mag-field3d-status mag-field3d-summary',
            style: { display: 'block', width: '100%', borderRadius: 10, border: '1px solid ' + BORDER, background: INSTRUMENT, touchAction: 'none' }
          }), [
            { label: 'Probe |B|', value: vectorValue(totalMagnitude), tone: '#fbbf24' },
            { label: 'Net / sources', value: Math.round(cancellation * 100) + '%', tone: '#a78bfa' }
          ], 'x · y · z'),
          h('div', { id: 'mag-field3d-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { color: d.field3dStatus === 'error' ? '#fbbf24' : SOFT, fontSize: 11.5, lineHeight: 1.45, margin: '7px 0' } },
            d.field3dStatus === 'ready' ? '3D scene ready. Drag to orbit; drag a magnet to move it on the x-z plane.' :
            d.field3dStatus === 'error' ? h('span', null, '3D graphics did not load. The 2D map is still fully available. ',
              h('button', { onClick: function () { upd({ field3dStatus: 'loading', field3dAttempt: (d.field3dAttempt || 0) + 1 }); }, style: btn() }, 'Retry 3D')) :
              'Loading the 3D field engine...'),
          h('p', { id: 'mag-field3d-instructions', style: { color: SOFT, fontSize: 11.5, margin: '0 0 8px', lineHeight: 1.4 } }, 'Axis key: x = left/right, y = height, z = depth. Every pointer action has an equivalent labeled control below.'),
          poleLegend('North pole — red; N or one bright stripe', 'South pole — blue; S or two bright stripes'),
          sceneTextAlternative('mag-field3d-summary', magnets.length + ' bar magnets are present. Magnet ' + (selected + 1) + ' is selected at x ' + selectedMagnet.x.toFixed(2) + ', y ' + selectedMagnet.y.toFixed(2) + ', z ' + selectedMagnet.z.toFixed(2) + '. The probe is at x ' + probe.x.toFixed(2) + ', y ' + probe.y.toFixed(2) + ', z ' + probe.z.toFixed(2) + '. Its field magnitude is ' + vectorValue(totalMagnitude) + ', described as ' + strengthWords[strengthLevel] + '. Cancellation ratio is ' + Math.round(cancellation * 100) + ' percent.'),
          h('div', { role: 'group', 'aria-label': '3D camera views', style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 } },
            h('span', { style: { color: SOFT, fontSize: 11.5, alignSelf: 'center', fontWeight: 700 } }, 'Camera'),
            viewButton('perspective', 'Perspective'), viewButton('front', 'Front'), viewButton('top', 'Top'), viewButton('side', 'Side')),
          h('div', { role: 'group', 'aria-label': '3D field layers', style: { display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 } },
            h('button', { 'aria-pressed': d.field3dVectors ? 'true' : 'false', onClick: function () { commitField3D({ field3dVectors: !d.field3dVectors }, 'Sampled field vectors ' + (!d.field3dVectors ? 'shown.' : 'hidden.')); }, style: btn(d.field3dVectors) }, 'Vector lattice: ' + (d.field3dVectors ? 'on' : 'off')),
            h('button', { 'aria-pressed': d.field3dLines ? 'true' : 'false', onClick: function () { commitField3D({ field3dLines: !d.field3dLines }, 'Field streamlines ' + (!d.field3dLines ? 'shown.' : 'hidden.')); }, style: btn(d.field3dLines) }, 'Streamlines: ' + (d.field3dLines ? 'on' : 'off')),
            h('label', { htmlFor: 'mag-field3d-slice', style: { color: SOFT, fontSize: 11.5, fontWeight: 700 } }, 'Heat slice'),
            h('select', { id: 'mag-field3d-slice', value: d.field3dSlice || 'none', onChange: function (e) { commitField3D({ field3dSlice: e.target.value }, e.target.value === 'none' ? 'Heat slice hidden.' : e.target.value.toUpperCase() + ' field-strength slice shown.'); }, style: { padding: '8px 10px', borderRadius: 8, border: '1px solid ' + BORDER, background: PANEL, color: TEXT } },
              h('option', { value: 'none' }, 'None'), h('option', { value: 'xy' }, 'XY plane'), h('option', { value: 'xz' }, 'XZ plane'), h('option', { value: 'yz' }, 'YZ plane'))),
          d.field3dSlice && d.field3dSlice !== 'none' ? slider('Slice offset', d.field3dSliceOffset, -3, 3, 0.25, function (v) { commitField3D({ field3dSliceOffset: v }); }) : null,
          h('div', { className: 'mag-legend', 'aria-label': '3D field legend', style: { marginTop: 3 } },
            h('span', { style: { color: TEXT } }, h('i', { className: 'mag-swatch', 'aria-hidden': 'true', style: { background: '#38bdf8' } }), 'cyan arrows sample local direction'),
            h('span', { style: { color: TEXT } }, h('i', { className: 'mag-swatch', 'aria-hidden': 'true', style: { background: '#f43f5e' } }), 'curves follow the field'),
            h('span', { style: { color: TEXT } }, h('i', { className: 'mag-swatch', 'aria-hidden': 'true', style: { background: '#fbbf24' } }), 'gold arrow is the probe total')),
          h('div', { className: 'mag-observe' },
            h('span', { 'aria-hidden': 'true' }, '+'),
            h('span', null, h('b', null, 'Read superposition in 3D: '), 'the blue and violet arrows at the probe are the two source contributions. The gold resultant is their vector sum, including x, y, and z components.')),
          h('div', { className: 'mag-sim-grid', style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12, alignItems: 'start' } },
            h('section', { 'aria-label': 'Magnet controls' },
              h('div', { style: { color: TEXT, fontSize: 12.5, fontWeight: 800, marginBottom: 7 } }, 'Move and rotate a magnet'),
              h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 7 } },
                magnets.map(function (mag, index) { return h('button', { key: '3dmag' + index, 'aria-pressed': selected === index ? 'true' : 'false', onClick: function () { commitField3D({ field3dSelected: index }, 'Selected magnet ' + (index + 1) + '.'); }, style: btn(selected === index) }, 'Magnet ' + (index + 1)); })),
              h('div', { role: 'group', 'aria-label': 'Move selected magnet in three dimensions', style: { display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 7 } },
                h('button', { onClick: function () { moveSelectedField3D('x', -0.35); }, style: btn() }, 'x−'),
                h('button', { onClick: function () { moveSelectedField3D('x', 0.35); }, style: btn() }, 'x+'),
                h('button', { onClick: function () { moveSelectedField3D('y', -0.35); }, style: btn() }, 'y−'),
                h('button', { onClick: function () { moveSelectedField3D('y', 0.35); }, style: btn() }, 'y+'),
                h('button', { onClick: function () { moveSelectedField3D('z', -0.35); }, style: btn() }, 'z−'),
                h('button', { onClick: function () { moveSelectedField3D('z', 0.35); }, style: btn() }, 'z+')),
              h('div', { role: 'group', 'aria-label': 'Rotate selected magnet', style: { display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 7 } },
                h('button', { onClick: function () { updateSelectedField3DMagnet({ yaw: (Number(selectedMagnet.yaw) || 0) - Math.PI / 12 }, 'Rotated the selected magnet left 15 degrees.'); }, style: btn() }, 'Yaw −15°'),
                h('button', { onClick: function () { updateSelectedField3DMagnet({ yaw: (Number(selectedMagnet.yaw) || 0) + Math.PI / 12 }, 'Rotated the selected magnet right 15 degrees.'); }, style: btn() }, 'Yaw +15°'),
                h('button', { onClick: function () { updateSelectedField3DMagnet({ pitch: Math.max(-Math.PI / 2, (Number(selectedMagnet.pitch) || 0) - Math.PI / 12) }, 'Tilted the selected magnet down 15 degrees.'); }, style: btn() }, 'Pitch −15°'),
                h('button', { onClick: function () { updateSelectedField3DMagnet({ pitch: Math.min(Math.PI / 2, (Number(selectedMagnet.pitch) || 0) + Math.PI / 12) }, 'Tilted the selected magnet up 15 degrees.'); }, style: btn() }, 'Pitch +15°')),
              slider('Selected magnet strength', selectedMagnet.strength == null ? 1 : selectedMagnet.strength, 0.5, 3, 0.25, function (v) { updateSelectedField3DMagnet({ strength: v }); }),
              h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                h('button', { onClick: function () { updateSelectedField3DMagnet({ polarity: selectedMagnet.polarity < 0 ? 1 : -1 }, 'Flipped the selected magnet poles.'); }, style: btn() }, 'Flip poles'),
                h('button', { onClick: function () { setField3DSetup('attract'); }, style: btn() }, 'Attract setup'),
                h('button', { onClick: function () { setField3DSetup('repel'); }, style: btn() }, 'Repel setup'))),
            h('section', { 'aria-label': 'Three-dimensional field probe' },
              h('div', { style: { color: TEXT, fontSize: 12.5, fontWeight: 800, marginBottom: 7 } }, 'Measure with the gold probe'),
              slider('Probe x', probe.x, -3.5, 3.5, 0.25, function (v) { setProbe('x', v); }),
              slider('Probe y', probe.y, -3.5, 3.5, 0.25, function (v) { setProbe('y', v); }),
              slider('Probe z', probe.z, -3.5, 3.5, 0.25, function (v) { setProbe('z', v); }),
              h('button', { onClick: function () {
                var found = findFieldNull3D(magnets, { bound: 3.7, steps: 13 });
                commitField3D({ field3dProbe: { x: found.x, y: found.y, z: found.z }, field3dNullFound: true }, 'Moved the probe to a cancellation candidate where the resultant is ' + (found.cancellation * 100).toFixed(1) + ' percent of the separate field contributions.');
              }, style: btn(true) }, 'Find a cancellation point'),
              h('div', { className: 'mag-observe', role: 'status' },
                h('span', { 'aria-hidden': 'true' }, 'B'),
                h('span', null,
                  h('b', null, 'Bx ' + vectorValue(total.x) + ' · By ' + vectorValue(total.y) + ' · Bz ' + vectorValue(total.z)),
                  h('br'), 'Relative magnitude ' + vectorValue(totalMagnitude) + ' · ' + strengthWords[strengthLevel] + '.',
                  h('br'), 'Resultant is ' + (cancellation * 100).toFixed(1) + '% of the separate magnitudes' + (d.field3dNullFound ? ' at the searched cancellation candidate.' : '.'))))
          ),
          disclosure('The vector lattice samples the field only at selected points; field lines are curves tangent to the local direction, not physical threads. The heat slice uses a relative logarithmic strength scale. The dipole model is reliable for pattern and direction away from each magnet surface, not exact near-contact values.')
        ), '#a78bfa');
      }
      function moveCompass(dx, dy) {
        var nx = Math.max(-180, Math.min(180, d.compass.x + dx));
        var ny = Math.max(-130, Math.min(130, d.compass.y + dy));
        upd({ compass: { x: nx, y: ny }, compassMoved: true });
      }

      function moveMagnet(dx, dy) {
        var selected = Math.max(0, Math.min(d.magnets.length - 1, d.fieldSelected || 0));
        var ms = d.magnets.map(function (m, i) {
          return i === selected ? Object.assign({}, m, {
            x: Math.max(-170, Math.min(170, m.x + dx)),
            y: Math.max(-115, Math.min(115, m.y + dy))
          }) : m;
        });
        upd({ magnets: ms, fieldSelected: selected });
        announceToSR('Moved magnet ' + (selected + 1));
      }

      function fieldMapperCard() {
        var sourceMagnet = { x: 0, y: 0, angle: 0, polarity: 1, strength: Number(d.fieldMapStrength) || 1 };
        var sources = [sourceMagnet];
        var probe = Object.assign({ x: 90, y: 0 }, d.fieldMapProbe || {});
        probe.x = Math.max(-175, Math.min(175, Number(probe.x) || 0));
        probe.y = Math.max(-115, Math.min(115, Number(probe.y) || 0));
        var noise = Math.max(0, Math.min(20, Number(d.fieldMapNoise) || 0));
        var current = fieldProbeReading(probe.x, probe.y, sources, noise);
        current.distance = Math.sqrt(probe.x * probe.x + probe.y * probe.y);
        current.path = 'manual';
        current.strength = sourceMagnet.strength;
        var samples = (d.fieldMapSamples || []).map(function (sample) { return Object.assign({}, sample); }).slice(-14);
        var plotted = samples.length ? samples : [current];
        var fit = fieldPowerLawFit(samples);
        var pathName = d.fieldMapPath === 'equatorial' ? 'equatorial' : 'axial';
        var uniquePaths = {};
        var uniqueStrengths = {};
        samples.forEach(function (sample) {
          uniquePaths[sample.path || 'manual'] = true;
          uniqueStrengths[String(sample.strength == null ? 1 : sample.strength)] = true;
        });
        var controlled = samples.length >= 2 && Object.keys(uniquePaths).length === 1 && !uniquePaths.manual && Object.keys(uniqueStrengths).length === 1;

        function commitProbe(x, y) {
          var next = { x: Math.max(-175, Math.min(175, x)), y: Math.max(-115, Math.min(115, y)) };
          if (Math.abs(next.x) < 42 && Math.abs(next.y) < 22) {
            if (Math.abs(next.x / 42) >= Math.abs(next.y / 22)) next.x = next.x < 0 ? -42 : 42;
            else next.y = next.y < 0 ? -22 : 22;
          }
          upd({ fieldMapProbe: next, fieldMapUsed: true, compassMoved: true });
          announceToSR('Hall probe moved to x ' + Math.round(next.x) + ', y ' + Math.round(next.y) + '.');
        }
        function recordProbe() {
          var row = Object.assign({}, current, { id: samples.length + 1, path: 'manual', strength: sourceMagnet.strength });
          upd({ fieldMapSamples: samples.concat([row]).slice(-14), fieldMapUsed: true, compassMoved: true, forceBenchUsed: true });
          announceToSR('Hall probe reading recorded: ' + row.measuredMagnitude.toFixed(2) + ' relative microtesla.');
        }
        function runScan() {
          var distances = [50, 65, 80, 100, 125, 150, 175];
          var rows = fieldScanSeries(sources, pathName, distances, 0, noise).map(function (row, index) {
            return Object.assign({}, row, { id: index + 1, strength: sourceMagnet.strength });
          });
          var nextProbe = pathName === 'axial' ? { x: 100, y: 0 } : { x: 0, y: -100 };
          upd({ fieldMapSamples: rows, fieldMapProbe: nextProbe, fieldMapUsed: true, compassMoved: true, forceBenchUsed: true });
          var result = fieldPowerLawFit(rows);
          announceToSR('Seven-point ' + pathName + ' scan complete. Power-law exponent ' + result.exponent.toFixed(2) + '.');
        }

        var mapLeft = 24, mapTop = 34, mapW = 350, mapH = 232;
        function mapX(x) { return mapLeft + (x + 180) / 360 * mapW; }
        function mapY(y) { return mapTop + (y + 120) / 240 * mapH; }
        var visual = [];
        visual.push(h('rect', { key: 'bg', x: 0, y: 0, width: 720, height: 304, rx: 12, fill: INSTRUMENT }));
        visual.push(h('text', { key: 'mapTitle', x: 199, y: 20, fill: TEXT, fontSize: 12, fontWeight: 800, textAnchor: 'middle' }, 'HALL-PROBE FIELD MAP'));
        visual.push(h('text', { key: 'graphTitle', x: 555, y: 20, fill: TEXT, fontSize: 12, fontWeight: 800, textAnchor: 'middle' }, 'FIELD VS DISTANCE'));
        for (var gy = -105; gy <= 105; gy += 30) {
          for (var gx = -165; gx <= 165; gx += 30) {
            var blocked = Math.abs(gx) < 40 && Math.abs(gy) < 20;
            if (blocked) continue;
            var heat = fieldProbeReading(gx, gy, sources, 0);
            var heatLevel = Math.max(0.04, Math.min(0.52, (Math.log10(heat.magnitude + 0.08) + 1.15) / 4));
            visual.push(h('rect', { key: 'heat-' + gx + '-' + gy, x: mapX(gx - 15), y: mapY(gy - 15), width: mapW / 12 + 0.7, height: mapH / 8 + 0.7, fill: 'rgba(56,189,248,' + heatLevel.toFixed(3) + ')' }));
          }
        }
        for (var vy = -90; vy <= 90; vy += 60) {
          for (var vx = -150; vx <= 150; vx += 60) {
            if (Math.abs(vx) < 45 && Math.abs(vy) < 24) continue;
            var vector = fieldProbeReading(vx, vy, sources, 0);
            if (vector.magnitude < 1e-9) continue;
            var vectorLevel = Math.max(0, Math.min(1, (Math.log10(vector.magnitude + 0.08) + 1.1) / 2.5));
            var vectorLength = 5 + vectorLevel * 12;
            var ux = vector.bx / vector.magnitude, uy = vector.by / vector.magnitude;
            var vx1 = mapX(vx), vy1 = mapY(vy), vx2 = vx1 + ux * vectorLength, vy2 = vy1 + uy * vectorLength;
            visual.push(h('g', { key: 'vector-' + vx + '-' + vy },
              h('line', { x1: vx1, y1: vy1, x2: vx2, y2: vy2, stroke: '#fbbf24', strokeWidth: 1.5 }),
              h('circle', { cx: vx2, cy: vy2, r: 2.1, fill: '#fbbf24' })));
          }
        }
        visual.push(h('rect', { key: 'mapBorder', x: mapLeft, y: mapTop, width: mapW, height: mapH, rx: 7, fill: 'none', stroke: BORDER }));
        visual.push(h('g', { key: 'magnet', transform: 'translate(' + mapX(0) + ',' + mapY(0) + ')' },
          h('rect', { x: -36, y: -13, width: 36, height: 26, fill: '#2563eb' }),
          h('rect', { x: 0, y: -13, width: 36, height: 26, fill: '#ef4444' }),
          h('text', { x: -18, y: 4, fill: '#fff', fontSize: 12, fontWeight: 800, textAnchor: 'middle' }, 'S'),
          h('text', { x: 18, y: 4, fill: '#fff', fontSize: 12, fontWeight: 800, textAnchor: 'middle' }, 'N'),
          h('line', { x1: 27, y1: -13, x2: 27, y2: 13, stroke: '#fff', strokeWidth: 2 }),
          h('line', { x1: -25, y1: -13, x2: -25, y2: 13, stroke: '#fff', strokeWidth: 2 }),
          h('line', { x1: -30, y1: -13, x2: -30, y2: 13, stroke: '#fff', strokeWidth: 2 })));
        var probeX = mapX(probe.x), probeY = mapY(probe.y);
        var probeVectorLength = Math.min(34, 12 + Math.log10(current.magnitude + 1) * 10);
        var probeUx = current.magnitude < 1e-9 ? 1 : current.bx / current.magnitude;
        var probeUy = current.magnitude < 1e-9 ? 0 : current.by / current.magnitude;
        visual.push(h('g', { key: 'probe' },
          h('circle', { cx: probeX, cy: probeY, r: 9, fill: INSTRUMENT, stroke: '#fbbf24', strokeWidth: 2.5 }),
          h('line', { x1: probeX - 13, y1: probeY, x2: probeX + 13, y2: probeY, stroke: '#fbbf24', strokeWidth: 1 }),
          h('line', { x1: probeX, y1: probeY - 13, x2: probeX, y2: probeY + 13, stroke: '#fbbf24', strokeWidth: 1 }),
          h('line', { x1: probeX, y1: probeY, x2: probeX + probeUx * probeVectorLength, y2: probeY + probeUy * probeVectorLength, stroke: '#34d399', strokeWidth: 3 }),
          h('circle', { cx: probeX + probeUx * probeVectorLength, cy: probeY + probeUy * probeVectorLength, r: 3, fill: '#34d399' })));
        visual.push(h('text', { key: 'mapX', x: mapLeft + mapW / 2, y: 291, fill: SOFT, fontSize: 11, textAnchor: 'middle' }, 'x position · relative units'));
        visual.push(h('text', { key: 'mapY', x: 10, y: mapTop + mapH / 2, fill: SOFT, fontSize: 11, textAnchor: 'middle', transform: 'rotate(-90 10 ' + (mapTop + mapH / 2) + ')' }, 'y position'));

        var graphLeft = 424, graphTop = 42, graphW = 260, graphH = 208;
        var theory = fieldScanSeries(sources, pathName, [50, 60, 70, 80, 90, 100, 115, 130, 145, 160, 175], 0, 0);
        var maxB = theory.concat(plotted).reduce(function (maximum, sample) { return Math.max(maximum, Number(sample.measuredMagnitude) || 0); }, 1);
        function graphX(distance) { return graphLeft + (Math.max(50, Math.min(175, distance)) - 50) / 125 * graphW; }
        function graphY(magnitude) { return graphTop + graphH - Math.max(0, Math.min(1, magnitude / maxB)) * graphH; }
        [0, 0.5, 1].forEach(function (fraction) {
          var gridY = graphTop + graphH - fraction * graphH;
          visual.push(h('line', { key: 'grid-' + fraction, x1: graphLeft, y1: gridY, x2: graphLeft + graphW, y2: gridY, stroke: BORDER, strokeWidth: 1 }));
          visual.push(h('text', { key: 'gridLabel-' + fraction, x: graphLeft - 6, y: gridY + 4, fill: SOFT, fontSize: 10, textAnchor: 'end' }, (maxB * fraction).toFixed(1)));
        });
        [50, 100, 150, 175].forEach(function (tick) {
          var gridX = graphX(tick);
          visual.push(h('line', { key: 'xTick-' + tick, x1: gridX, y1: graphTop + graphH, x2: gridX, y2: graphTop + graphH + 5, stroke: BORDER }));
          visual.push(h('text', { key: 'xLabel-' + tick, x: gridX, y: graphTop + graphH + 18, fill: SOFT, fontSize: 10, textAnchor: 'middle' }, tick));
        });
        var theoryPoints = theory.map(function (sample) { return graphX(sample.distance).toFixed(1) + ',' + graphY(sample.measuredMagnitude).toFixed(1); }).join(' ');
        visual.push(h('polyline', { key: 'theory', points: theoryPoints, fill: 'none', stroke: '#38bdf8', strokeWidth: 2.4, strokeDasharray: '7 4' }));
        plotted.forEach(function (sample, index) {
          var distance = Number(sample.distance) || Math.sqrt(sample.x * sample.x + sample.y * sample.y);
          var px = graphX(distance), py = graphY(Number(sample.measuredMagnitude) || 0);
          visual.push(h('g', { key: 'point-' + index },
            h('circle', { cx: px, cy: py, r: samples.length ? 4.5 : 5.5, fill: INSTRUMENT, stroke: '#fbbf24', strokeWidth: 2 }),
            h('line', { x1: px - 2.5, y1: py, x2: px + 2.5, y2: py, stroke: '#fbbf24', strokeWidth: 1.3 })));
        });
        visual.push(h('line', { key: 'yAxis', x1: graphLeft, y1: graphTop, x2: graphLeft, y2: graphTop + graphH, stroke: BORDER, strokeWidth: 1.5 }));
        visual.push(h('line', { key: 'xAxis', x1: graphLeft, y1: graphTop + graphH, x2: graphLeft + graphW, y2: graphTop + graphH, stroke: BORDER, strokeWidth: 1.5 }));
        visual.push(h('text', { key: 'theoryLabel', x: graphLeft + graphW - 4, y: graphY(theory[theory.length - 1].measuredMagnitude) - 7, fill: TEXT, fontSize: 10.5, textAnchor: 'end' }, 'ideal dipole · dashed'));
        visual.push(h('text', { key: 'graphXLabel', x: graphLeft + graphW / 2, y: 291, fill: SOFT, fontSize: 11, textAnchor: 'middle' }, 'distance from center'));
        visual.push(h('text', { key: 'graphYLabel', x: 397, y: graphTop + graphH / 2, fill: SOFT, fontSize: 11, textAnchor: 'middle', transform: 'rotate(-90 397 ' + (graphTop + graphH / 2) + ')' }, '|B| · rel. µT'));
        var aria = 'Hall-probe magnetic field map. Probe at x ' + probe.x.toFixed(0) + ', y ' + probe.y.toFixed(0) + '. Measured field ' + current.measuredMagnitude.toFixed(2) + ' relative microtesla, components B x ' + current.measuredBx.toFixed(2) + ' and B y ' + current.measuredBy.toFixed(2) + '. ' + samples.length + ' readings recorded.';

        var tableRows = samples.length ? samples : [current];
        return card('Quantitative Field Mapping Lab', h('div', null,
          h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } }, 'Move a Hall probe to measure both direction and strength. Build a controlled scan, graph |B| against distance, and test the far-field dipole prediction ', h('b', null, 'B ∝ 1/r³'), '.'),
          h('svg', { viewBox: '0 0 720 304', width: '100%', style: { maxWidth: 820, display: 'block', margin: '0 auto 10px', touchAction: 'none' }, role: 'img', 'aria-label': aria,
            onClick: function (event) {
              var rect = event.currentTarget.getBoundingClientRect();
              if (!rect.width || !rect.height) return;
              var viewX = (event.clientX - rect.left) / rect.width * 720;
              var viewY = (event.clientY - rect.top) / rect.height * 304;
              if (viewX < mapLeft || viewX > mapLeft + mapW || viewY < mapTop || viewY > mapTop + mapH) return;
              commitProbe((viewX - mapLeft) / mapW * 360 - 180, (viewY - mapTop) / mapH * 240 - 120);
            } }, visual),
          h('div', { className: 'mag-legend', 'aria-label': 'Field map key' },
            h('span', { style: { color: TEXT } }, h('i', { className: 'mag-swatch', 'aria-hidden': 'true', style: { background: '#38bdf8' } }), 'deeper tint and longer arrows mean stronger field'),
            h('span', { style: { color: TEXT } }, h('i', { className: 'mag-swatch', 'aria-hidden': 'true', style: { background: '#fbbf24' } }), 'gold crosshair is the probe'),
            h('span', { style: { color: TEXT } }, 'dashed curve is the ideal dipole prediction')),
          h('div', { className: 'mag-sim-grid', style: { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, margin: '0 0 9px' } },
            h('div', { style: { padding: 9, border: '1px solid ' + BORDER, borderRadius: 9, textAlign: 'center' } }, h('div', { style: { color: SOFT, fontSize: 11 } }, 'Measured |B|'), h('div', { style: { color: TEXT, fontSize: 16, fontWeight: 800 } }, current.measuredMagnitude.toFixed(2) + ' rel. µT')),
            h('div', { style: { padding: 9, border: '1px solid ' + BORDER, borderRadius: 9, textAlign: 'center' } }, h('div', { style: { color: SOFT, fontSize: 11 } }, 'Components Bx · By'), h('div', { style: { color: TEXT, fontSize: 16, fontWeight: 800 } }, current.measuredBx.toFixed(2) + ' · ' + current.measuredBy.toFixed(2))),
            h('div', { style: { padding: 9, border: '1px solid ' + BORDER, borderRadius: 9, textAlign: 'center' } }, h('div', { style: { color: SOFT, fontSize: 11 } }, 'Power-law exponent'), h('div', { style: { color: TEXT, fontSize: 16, fontWeight: 800 } }, fit.exponent == null ? 'need ≥2 points' : fit.exponent.toFixed(2)))),
          h('div', { role: 'group', 'aria-label': 'Automated field scan path', style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 9 } },
            h('button', { 'aria-pressed': pathName === 'axial' ? 'true' : 'false', onClick: function () { upd({ fieldMapPath: 'axial', fieldMapUsed: true }); }, style: btn(pathName === 'axial') }, 'Axial scan · beyond N pole'),
            h('button', { 'aria-pressed': pathName === 'equatorial' ? 'true' : 'false', onClick: function () { upd({ fieldMapPath: 'equatorial', fieldMapUsed: true }); }, style: btn(pathName === 'equatorial') }, 'Equatorial scan · above center')),
          h('div', { style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 } },
            h('button', { onClick: runScan, style: btn(true) }, 'Run 7-point scan'),
            h('button', { onClick: recordProbe, style: btn() }, 'Record current probe'),
            h('button', { disabled: !samples.length, onClick: function () { upd({ fieldMapSamples: [], fieldMapUsed: true }); announceToSR('Field measurements cleared.'); }, style: btn() }, 'Clear measurements')),
          h('div', { className: 'mag-sim-grid', style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12 } },
            h('div', null,
              slider('Probe x position', Math.round(probe.x), -175, 175, 5, function (value) { commitProbe(value, probe.y); }),
              slider('Probe y position', Math.round(probe.y), -115, 115, 5, function (value) { commitProbe(probe.x, value); })),
            h('div', null,
              slider('Magnet strength', sourceMagnet.strength, 0.5, 3, 0.5, function (value) { upd({ fieldMapStrength: value, fieldMapUsed: true }); }),
              slider('Sensor uncertainty (%)', noise, 0, 20, 1, function (value) { upd({ fieldMapNoise: value, fieldMapUsed: true }); }))),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,44px)', gap: 4, justifyContent: 'center', marginBottom: 10 } },
            h('span', null, ''), h('button', { 'aria-label': 'Move Hall probe up', onClick: function () { commitProbe(probe.x, probe.y - 10); }, style: btn() }, '↑'), h('span', null, ''),
            h('button', { 'aria-label': 'Move Hall probe left', onClick: function () { commitProbe(probe.x - 10, probe.y); }, style: btn() }, '←'), h('span', { style: { textAlign: 'center', color: SOFT, fontSize: 11, alignSelf: 'center' } }, 'probe'), h('button', { 'aria-label': 'Move Hall probe right', onClick: function () { commitProbe(probe.x + 10, probe.y); }, style: btn() }, '→'),
            h('span', null, ''), h('button', { 'aria-label': 'Move Hall probe down', onClick: function () { commitProbe(probe.x, probe.y + 10); }, style: btn() }, '↓'), h('span', null, '')),
          h('div', { className: 'mag-observe', role: 'status', 'aria-live': 'polite' },
            h('span', { 'aria-hidden': 'true' }, controlled ? '✓' : samples.length ? '△' : '◎'),
            h('span', null, h('b', null, controlled ? 'Controlled scan. ' : samples.length ? 'Comparison caution. ' : 'Ready to measure. '),
              controlled ? 'Only distance changed. The fitted exponent ' + fit.exponent.toFixed(2) + (Math.abs(fit.exponent + 3) < 0.3 ? ' supports the dipole prediction B ∝ 1/r³.' : ' differs from −3; raise uncertainty or repeat the scan to investigate.') : samples.length ? 'Manual positions or magnet strength changed between readings. Run one automated path to isolate distance.' : 'Move the probe for a live reading, then run a seven-point scan to reveal the distance law.')),
          h('details', { className: 'mag-scene-text' },
            h('summary', null, 'Measurement table · ' + tableRows.length + (samples.length ? ' recorded readings' : ' live reading')),
            h('div', { style: { overflowX: 'auto' } },
              h('table', { style: { width: '100%', borderCollapse: 'collapse', color: TEXT, fontSize: 11.5 }, 'aria-label': 'Hall-probe field measurements' },
                h('thead', null, h('tr', null, ['Point', 'x', 'y', 'distance', 'Bx', 'By', '|B|', '± uncertainty'].map(function (label) {
                  return h('th', { key: label, scope: 'col', style: { textAlign: label === 'Point' ? 'left' : 'right', padding: '6px 5px', borderBottom: '1px solid ' + BORDER, whiteSpace: 'nowrap' } }, label);
                }))),
                h('tbody', null, tableRows.map(function (row, index) {
                  return h('tr', { key: row.id || index },
                    h('th', { scope: 'row', style: { textAlign: 'left', padding: '6px 5px', borderBottom: '1px solid ' + BORDER } }, String(index + 1)),
                    [row.x, row.y, row.distance || Math.sqrt(row.x * row.x + row.y * row.y), row.measuredBx, row.measuredBy, row.measuredMagnitude, row.uncertainty].map(function (value, cellIndex) {
                      return h('td', { key: cellIndex, style: { textAlign: 'right', padding: '6px 5px', borderBottom: '1px solid ' + BORDER, whiteSpace: 'nowrap' } }, Number(value || 0).toFixed(cellIndex < 3 ? 0 : 2));
                    }));
                }))))),
          h('p', { style: { color: SOFT, fontSize: 11.5, margin: '8px 0 0', lineHeight: 1.45 } }, 'Model boundary: readings use an ideal point-dipole field outside the bar. Near the magnet body, real geometry and Hall-sensor calibration matter; uncertainty here is deterministic so saved trials remain reproducible.')
        ), '#38bdf8');
      }
      function fieldTab() {
        var two = d.magnets.length > 1;
        var fieldMode = ['2d', '3d', 'map'].indexOf(d.fieldView) >= 0 ? d.fieldView : '2d';
        return h('div', null,
          h('div', { role: 'group', 'aria-label': 'Field Explorer dimension', style: { display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 } },
            h('span', { style: { color: SOFT, fontSize: 11.5, fontWeight: 700 } }, 'Explore and measure with'),
            h('button', { 'aria-pressed': fieldMode === '2d' ? 'true' : 'false', onClick: function () { upd({ fieldView: '2d' }); announceToSR('Two-dimensional field explorer selected.'); }, style: btn(fieldMode === '2d') }, '2D field explorer'),
            h('button', { 'aria-pressed': fieldMode === '3d' ? 'true' : 'false', onClick: function () { if (fieldMode === '3d') return; upd({ fieldView: '3d', field3dStatus: 'loading', field3dUsed: true }); announceToSR('Three-dimensional field studio selected.'); }, style: btn(fieldMode === '3d') }, '3D field studio'),
            h('button', { 'aria-pressed': fieldMode === 'map' ? 'true' : 'false', onClick: function () { upd({ fieldView: 'map', fieldMapUsed: true }); announceToSR('Quantitative Hall-probe field mapping lab selected.'); }, style: btn(fieldMode === 'map') }, 'Measurement lab')),
          fieldMode === '3d' ? field3DCard() : fieldMode === 'map' ? fieldMapperCard() : card('Trace the invisible field', h('div', null,
            h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 8px', lineHeight: 1.5 } }, 'Field lines leave the ', h('b', { style: { color: TEXT } }, 'north (N/red)'), ' pole and curve back into the ', h('b', { style: { color: TEXT } }, 'south (S/blue)'), ' pole. Click open space to move the compass, or use the labeled controls to rebuild the field. The needle follows the local resultant field.'),
            poleLegend('North pole — red; N or one bright stripe', 'South pole — blue; S or two bright stripes'),
            h('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 8 } }, renderFieldSVG()),
            h('div', { className: 'mag-legend', 'aria-label': 'Field visual legend' },
              h('span', { style: { color: TEXT } }, h('i', { className: 'mag-swatch', 'aria-hidden': 'true', style: { background: '#fbbf24' } }), 'arrows show N → S'),
              h('span', { style: { color: TEXT } }, h('i', { className: 'mag-swatch', 'aria-hidden': 'true', style: { background: '#f43f5e' } }), 'closer lines = stronger field'),
              d.filings ? h('span', null, 'short grains align like tiny compasses') : null),
            two ? h('div', { className: 'mag-observe' },
              h('span', { 'aria-hidden': 'true' }, '+'),
              h('span', null, h('b', null, 'Superposition at the compass: '), 'blue B1 and violet B2 are the separate source vectors. Their gold vector sum sets the needle direction; equal opposing fields can nearly cancel.')) : null,
            // compass D-pad (keyboard + touch friendly)
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,44px)', gap: 4, justifyContent: 'center', marginBottom: 10 } },
              h('span', null, ''), pad('↑', 0, -18), h('span', null, ''),
              pad('←', -18, 0), h('span', { style: { textAlign: 'center', color: SOFT, fontSize: 11, alignSelf: 'center' } }, 'compass'), pad('→', 18, 0),
              h('span', null, ''), pad('↓', 0, 18), h('span', null, '')),
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 } },
              h('span', { style: { color: SOFT, fontSize: 11 } }, 'Keyboard magnet control:'),
              d.magnets.map(function (m, i) {
                return h('button', { key: 'selectMag' + i, 'aria-pressed': d.fieldSelected === i ? 'true' : 'false',
                  onClick: function () { upd({ fieldSelected: i }); }, style: btn(d.fieldSelected === i) }, 'Magnet ' + (i + 1));
              }),
              h('button', { 'aria-label': 'Move selected magnet left', onClick: function () { moveMagnet(-18, 0); }, style: btn() }, 'left'),
              h('button', { 'aria-label': 'Move selected magnet up', onClick: function () { moveMagnet(0, -18); }, style: btn() }, 'up'),
              h('button', { 'aria-label': 'Move selected magnet down', onClick: function () { moveMagnet(0, 18); }, style: btn() }, 'down'),
              h('button', { 'aria-label': 'Move selected magnet right', onClick: function () { moveMagnet(18, 0); }, style: btn() }, 'right')),
            // live field-strength readout at the compass position (log scale:
            // dipole fields fall off as 1/r³, so linear bars would be useless)
            (function () {
              var b = fieldAt(d.compass.x, d.compass.y, d.magnets);
              var mag = Math.sqrt(b.x * b.x + b.y * b.y);
              var level = Math.max(0, Math.min(5, Math.floor(Math.log10(mag * 1e7) + 3)));
              var words = ['barely there', 'faint', 'weak', 'moderate', 'strong', 'very strong'];
              return h('div', { role: 'status', style: { textAlign: 'center', marginBottom: 10, color: SOFT, fontSize: 12 } },
                'Field here: ',
                h('span', { className: 'mag-strength-meter', 'aria-hidden': 'true' },
                  [0, 1, 2, 3, 4, 5].map(function (bar) { return h('i', { key: bar, className: bar <= level ? 'is-on' : '' }); })),
                ' ' + words[level] + ' — try moving closer to a pole');
            })(),
            h('div', { className: 'mag-observe' },
              h('span', { 'aria-hidden': 'true' }, '🔎'),
              h('span', null, h('b', null, 'Notice the pattern: '), 'the compass turns before it touches the magnet. That is evidence that a field acts across empty space. Near a pole, the lines crowd and the strength meter rises.')),
            slider('First magnet strength', (d.magnets[0] && d.magnets[0].strength) || 1, 0.5, 3, 0.5, function (v) {
              var ms = d.magnets.map(function (m, i) { return i === 0 ? Object.assign({}, m, { strength: v }) : m; });
              upd({ magnets: ms });
            }),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' } },
              h('button', { onClick: function () {
                  var ms = d.magnets.map(function (m, i) { return i === 0 ? Object.assign({}, m, { polarity: -m.polarity }) : m; });
                  upd({ magnets: ms });
                  announceToSR('Flipped the first magnet’s poles');
                }, style: btn() }, '🔄 Flip poles'),
              h('button', { onClick: function () {
                  var ms = d.magnets.map(function (m, i) { return i === 0 ? Object.assign({}, m, { angle: (m.angle + Math.PI / 4) % (Math.PI * 2) }) : m; });
                  upd({ magnets: ms });
                  announceToSR('Rotated the first magnet 45 degrees — watch the whole field swing with it');
                }, style: btn() }, '↻ Rotate 45°'),
              h('button', { onClick: function () { upd({ filings: !d.filings }); }, style: btn(d.filings) }, '🧲 Iron filings: ' + (d.filings ? 'on' : 'off')),
              two ? h('button', { 'aria-pressed': d.fieldVectors ? 'true' : 'false', onClick: function () { upd({ fieldVectors: !d.fieldVectors }); }, style: btn(d.fieldVectors) }, 'Source vectors: ' + (d.fieldVectors ? 'on' : 'off')) : null,
              h('button', { onClick: function () {
                  if (two) { upd({ magnets: [d.magnets[0]], fieldSelected: 0 }); return; }
                  // add a 2nd magnet on the right, opposite orientation (attract)
                  upd({ magnets: [Object.assign({}, d.magnets[0], { x: -70 }), { x: 70, y: 0, angle: 0, polarity: 1 }], sawAttract: true });
                  announceToSR('Added a second magnet');
                }, style: btn() }, two ? '➖ One magnet' : '➕ Add magnet')
            )
          )),
          fieldMode === '2d' && two ? card('Attract or repel?', h('div', null,
            h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } }, 'The facing ends decide everything. Opposite poles pull together; like poles push apart — you can see it in how the field lines connect or refuse to.'),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              h('button', { onClick: function () {
                  upd({ magnets: [{ x: -70, y: 0, angle: 0, polarity: 1 }, { x: 70, y: 0, angle: 0, polarity: 1 }], sawAttract: true });
                  announceToSR('N faces S — the magnets attract');
                }, style: btn() }, '🧲 Set up ATTRACT (N–S)'),
              h('button', { onClick: function () {
                  upd({ magnets: [{ x: -70, y: 0, angle: 0, polarity: 1 }, { x: 70, y: 0, angle: Math.PI, polarity: 1 }], sawRepel: true });
                  announceToSR('N faces N — the magnets repel');
                }, style: btn() }, '💥 Set up REPEL (N–N)')),
            (d.sawAttract && d.sawRepel) ? h('p', { style: { color: '#34d399', fontSize: 12, marginTop: 8 } }, '✓ You have now seen both — notice the lines bridge across for attract, and bulge apart for repel.') : null
          ), '#3b82f6') : null,
          fieldMode === '2d' ? forceBenchCard() : null,
          disclosure('The field explorer, 3D studio, and Hall-probe lab share ideal dipole physics. Field lines show topology rather than exact laboratory calibration. The mapper preserves vector superposition and the far-field B ∝ 1/r³ relationship; its relative microtesla scale, deterministic uncertainty, point-dipole source, and near-body limitations are stated inside the investigation.')
        );
      }

      function forceBenchCard() {
        var distance = d.pairDistance;
        var force = magnetPairForce(d.pairStrength1, d.pairStrength2, distance);
        var gap = 25 + (distance - 40) / 100 * 75;
        var magnetW = 70;
        var leftX = (320 - (magnetW * 2 + gap)) / 2;
        var rightX = leftX + magnetW + gap;
        var curve = [];
        var minLog = Math.log10(Math.max(1e-6, magnetPairForce(d.pairStrength1, d.pairStrength2, 140)));
        var maxLog = Math.log10(Math.max(1e-6, magnetPairForce(d.pairStrength1, d.pairStrength2, 40)));
        function graphY(v) {
          var frac = (Math.log10(Math.max(1e-6, v)) - minLog) / Math.max(1e-6, maxLog - minLog);
          return 205 - frac * 56;
        }
        for (var gi = 0; gi <= 25; gi++) {
          var gd = 40 + gi * 4;
          curve.push((28 + (gd - 40) / 100 * 264).toFixed(1) + ',' + graphY(magnetPairForce(d.pairStrength1, d.pairStrength2, gd)).toFixed(1));
        }
        var pointX = 28 + (distance - 40) / 100 * 264;
        var pointY = graphY(force);
        function arrow(key, x1, x2) {
          var dir = x2 > x1 ? 1 : -1;
          return h('g', { key: key },
            h('line', { x1: x1, y1: 23, x2: x2, y2: 23, stroke: '#34d399', strokeWidth: 2.5 }),
            h('polygon', { points: x2 + ',23 ' + (x2 - dir * 9) + ',18 ' + (x2 - dir * 9) + ',28', fill: '#34d399' }));
        }
        var leftArrow = d.pairAttract ? arrow('la', leftX + 10, leftX + 58) : arrow('la', leftX + 58, leftX + 10);
        var rightArrow = d.pairAttract ? arrow('ra', rightX + 60, rightX + 12) : arrow('ra', rightX + 12, rightX + 60);
        return card('Force bench — distance changes everything', h('div', null,
          h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } },
            'Test a different kind of graph: bar-magnet force drops approximately with the ', h('b', null, 'fourth power of distance'), ' when the magnets are well separated. Double the gap and the pull or push becomes about 16 times weaker.'),
          h('svg', { viewBox: '0 0 320 220', width: '100%', style: { maxWidth: 520, display: 'block', margin: '0 auto 10px' }, role: 'img',
            'aria-label': 'Two magnets ' + distance + ' units apart, set to ' + (d.pairAttract ? 'attract' : 'repel') + ', with relative force ' + force.toFixed(2) + '; a force-versus-distance curve falls steeply' },
            h('rect', { x: 0, y: 0, width: 320, height: 220, fill: INSTRUMENT, rx: 10 }),
            h('text', { x: 160, y: 14, fill: SOFT, fontSize: 11, textAnchor: 'middle' }, d.pairAttract ? 'opposite facing poles · attraction' : 'like facing poles · repulsion'),
            leftArrow, rightArrow,
            h('rect', { x: leftX, y: 36, width: 35, height: 30, rx: 4, fill: '#3b82f6' }),
            h('rect', { x: leftX + 35, y: 36, width: 35, height: 30, rx: 4, fill: '#ef4444' }),
            h('text', { x: leftX + 17.5, y: 56, fill: '#fff', fontSize: 11, fontWeight: 800, textAnchor: 'middle' }, 'S'),
            h('text', { x: leftX + 52.5, y: 56, fill: '#fff', fontSize: 11, fontWeight: 800, textAnchor: 'middle' }, 'N'),
            h('rect', { x: rightX, y: 36, width: 35, height: 30, rx: 4, fill: d.pairAttract ? '#3b82f6' : '#ef4444' }),
            h('rect', { x: rightX + 35, y: 36, width: 35, height: 30, rx: 4, fill: d.pairAttract ? '#ef4444' : '#3b82f6' }),
            h('text', { x: rightX + 17.5, y: 56, fill: '#fff', fontSize: 11, fontWeight: 800, textAnchor: 'middle' }, d.pairAttract ? 'S' : 'N'),
            h('text', { x: rightX + 52.5, y: 56, fill: '#fff', fontSize: 11, fontWeight: 800, textAnchor: 'middle' }, d.pairAttract ? 'N' : 'S'),
            h('line', { x1: leftX + magnetW, y1: 82, x2: rightX, y2: 82, stroke: '#fbbf24', strokeWidth: 1.5 }),
            h('line', { x1: leftX + magnetW, y1: 78, x2: leftX + magnetW, y2: 86, stroke: '#fbbf24' }),
            h('line', { x1: rightX, y1: 78, x2: rightX, y2: 86, stroke: '#fbbf24' }),
            h('text', { x: (leftX + magnetW + rightX) / 2, y: 96, fill: '#fbbf24', fontSize: 11, textAnchor: 'middle' }, distance + ' distance units'),
            h('line', { x1: 20, y1: 124, x2: 300, y2: 124, stroke: '#334155' }),
            h('text', { x: 28, y: 140, fill: SOFT, fontSize: 11 }, 'relative force · log scale'),
            h('line', { x1: 28, y1: 205, x2: 292, y2: 205, stroke: '#475569' }),
            h('polyline', { points: curve.join(' '), fill: 'none', stroke: '#38bdf8', strokeWidth: 2.5 }),
            h('line', { x1: pointX, y1: 145, x2: pointX, y2: 207, stroke: 'rgba(251,191,36,.45)', strokeDasharray: '3 3' }),
            h('circle', { cx: pointX, cy: pointY, r: 5, fill: '#fbbf24', stroke: '#0b1220', strokeWidth: 2 }),
            h('text', { x: 28, y: 216, fill: SOFT, fontSize: 11 }, '40'),
            h('text', { x: 292, y: 216, fill: SOFT, fontSize: 11, textAnchor: 'end' }, '140 distance')),
          h('div', { style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 8 } },
            h('button', { 'aria-pressed': d.pairAttract ? 'true' : 'false', onClick: function () { upd({ pairAttract: true, sawAttract: true, forceBenchUsed: true }); }, style: btn(d.pairAttract) }, '↔ Attract'),
            h('button', { 'aria-pressed': !d.pairAttract ? 'true' : 'false', onClick: function () { upd({ pairAttract: false, sawRepel: true, forceBenchUsed: true }); }, style: btn(!d.pairAttract) }, '↔ Repel')),
          slider('Gap between magnets', d.pairDistance, 40, 140, 5, function (v) { upd({ pairDistance: v, forceBenchUsed: true }); }),
          slider('Left magnet strength', d.pairStrength1, 0.5, 3, 0.5, function (v) { upd({ pairStrength1: v, forceBenchUsed: true }); }),
          slider('Right magnet strength', d.pairStrength2, 0.5, 3, 0.5, function (v) { upd({ pairStrength2: v, forceBenchUsed: true }); }),
          h('div', { className: 'mag-observe', role: 'status' },
            h('span', { 'aria-hidden': 'true' }, '📉'),
            h('span', null, h('b', null, (d.pairAttract ? 'Attractive' : 'Repulsive') + ' force ≈ ' + force.toFixed(force >= 10 ? 1 : force >= 1 ? 2 : 3) + '× reference. '),
              'Strength changes the amount; pole orientation changes the direction. The curve uses a far-field dipole approximation, so near-contact forces are intentionally not claimed as exact.'))
        ), '#38bdf8');
      }

      function pad(sym, dx, dy) {
        return h('button', { 'aria-label': 'Move compass ' + (dx < 0 ? 'left' : dx > 0 ? 'right' : dy < 0 ? 'up' : 'down'),
          onClick: function () { moveCompass(dx, dy); },
          style: { width: 44, height: 44, borderRadius: 9, border: '1px solid ' + BORDER, background: PANEL, color: TEXT, fontSize: 18, cursor: 'pointer' } }, sym);
      }

      // ── Electromagnet ─────────────────────────────────────────────────
      function currentElectro3DState() {
        var lengthCm = Number(d.electro3dLengthCm) || 12, radiusCm = Number(d.electro3dRadiusCm) || 3;
        var lengthScene = lengthCm / 4, radiusScene = radiusCm / 3;
        var material = d.electro3dMaterial || 'air';
        return {
          turns: d.turns, current: d.current, currentDir: d.currentDir, windingDir: d.windingDir,
          length: lengthScene, radius: radiusScene, lengthM: lengthCm / 100, radiusM: radiusCm / 100,
          material: material, vectors: d.electro3dVectors !== false, lines: d.electro3dLines !== false,
          probe: Object.assign({}, d.electro3dProbe || { x: 0, y: 0, z: 0 })
        };
      }

      function commitElectro3D(patch, message) {
        upd(Object.assign({ electro3dUsed: true, coilTouched: true }, patch));
        if (message) announceToSR(message);
      }

      function electro3DSaturationGraph() {
        var state = currentElectro3DState(), selected = state.material;
        var airPoints = [], corePoints = [], W = 500, H = 170, left = 46, right = 12, top = 18, bottom = 30;
        var values = [];
        for (var amp = 0; amp <= 6.0001; amp += 0.15) {
          var air = finiteSolenoidCenterField(state.turns, amp, state.lengthM, state.radiusM, 'air');
          var core = finiteSolenoidCenterField(state.turns, amp, state.lengthM, state.radiusM, selected);
          values.push({ amp: amp, air: air, core: core });
        }
        var maxB = Math.max(0.001, values.reduce(function (m, v) { return Math.max(m, v.air, v.core); }, 0));
        function gx(amp) { return left + amp / 6 * (W - left - right); }
        function gy(value) { return H - bottom - value / maxB * (H - top - bottom); }
        values.forEach(function (v) { airPoints.push(gx(v.amp).toFixed(1) + ',' + gy(v.air).toFixed(1)); corePoints.push(gx(v.amp).toFixed(1) + ',' + gy(v.core).toFixed(1)); });
        var currentB = finiteSolenoidCenterField(state.turns, state.current, state.lengthM, state.radiusM, selected);
        return h('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', style: { display: 'block', margin: '0 auto 8px' },
          'aria-label': 'Center field versus current graph for air and ' + CORE_MATERIALS[selected].name + '. At ' + state.current + ' amps the selected field is ' + (currentB * 1000).toFixed(1) + ' millitesla.' },
          h('rect', { x: 0, y: 0, width: W, height: H, rx: 10, fill: INSTRUMENT }),
          h('line', { x1: left, y1: H - bottom, x2: W - right, y2: H - bottom, stroke: BORDER, strokeWidth: 1 }),
          h('line', { x1: left, y1: top, x2: left, y2: H - bottom, stroke: BORDER, strokeWidth: 1 }),
          h('polyline', { points: airPoints.join(' '), fill: 'none', stroke: '#38bdf8', strokeWidth: 2 }),
          h('polyline', { points: corePoints.join(' '), fill: 'none', stroke: '#f59e0b', strokeWidth: 2.5 }),
          h('line', { x1: gx(state.current), y1: top, x2: gx(state.current), y2: H - bottom, stroke: 'rgba(52,211,153,.58)', strokeDasharray: '4 3' }),
          h('circle', { cx: gx(state.current), cy: gy(finiteSolenoidCenterField(state.turns, state.current, state.lengthM, state.radiusM, 'air')), r: 3.5, fill: INSTRUMENT, stroke: '#38bdf8', strokeWidth: 2 }),
          h('circle', { cx: gx(state.current), cy: gy(currentB), r: 5, fill: INSTRUMENT, stroke: '#f59e0b', strokeWidth: 2.5 }),
          h('line', { x1: left + 6, y1: top + 10, x2: left + 27, y2: top + 10, stroke: '#38bdf8', strokeWidth: 2 }),
          h('text', { x: left + 33, y: top + 14, fill: TEXT, fontSize: 11 }, 'air · linear'),
          h('line', { x1: W - right - 225, y1: top + 10, x2: W - right - 202, y2: top + 10, stroke: '#f59e0b', strokeWidth: 2.5 }),
          h('text', { x: W - right, y: top + 14, fill: TEXT, fontSize: 11, textAnchor: 'end' }, CORE_MATERIALS[selected].name + (selected === 'air' ? '' : ' · bends toward saturation')),
          h('text', { x: W - right, y: H - 8, fill: SOFT, fontSize: 11, textAnchor: 'end' }, 'current (A) →'),
          h('text', { x: 10, y: 14, fill: SOFT, fontSize: 11 }, 'B'),
          h('text', { x: gx(state.current) + 7, y: Math.max(top + 30, gy(currentB) - 8), fill: TEXT, fontSize: 11 }, (currentB * 1000).toFixed(1) + ' mT'));
      }

      function initElectro3DCanvas(cv) {
        if (!cv || cv._electro3dInit) return;
        if (!window.StemLab || typeof window.StemLab.ensureThree !== 'function') return;
        cv._electro3dInit = true;
        window.StemLab.ensureThree({ orbit: true, orbitRequired: true, failMessage: 'The 3D electromagnet engine could not load. The 2D coil investigation remains available.' })
          .then(function (THREE) {
            if (!cv.isConnected) { cv._electro3dInit = false; return; }
            var renderer;
            try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, powerPreference: 'high-performance' }); }
            catch (error) { cv._electro3dInit = false; upd({ electro3dStatus: 'error' }); return; }
            var scene = new THREE.Scene(), backgroundColor = new THREE.Color(0x07111f);
            try { var themeBackground = window.getComputedStyle(cv).getPropertyValue('--allo-stem-instrument').trim(); if (themeBackground) backgroundColor.setStyle(themeBackground); } catch (themeError) {}
            scene.background = backgroundColor; scene.fog = new THREE.FogExp2(backgroundColor.getHex(), 0.032);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6)); if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
            var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 70); camera.position.set(7.5, 4.8, 7.2);
            var controls = new THREE.OrbitControls(camera, cv); controls.enableDamping = false; controls.minDistance = 5; controls.maxDistance = 20; controls.target.set(0, 0, 0);
            scene.add(new THREE.HemisphereLight(0xdbeafe, 0x172554, 1.2));
            var keyLight = new THREE.DirectionalLight(0xffffff, 1.25); keyLight.position.set(5, 8, 6); scene.add(keyLight);
            var rimLight = new THREE.PointLight(0xf59e0b, 1.2, 20); rimLight.position.set(-4, 2, 5); scene.add(rimLight);
            var grid = new THREE.GridHelper(10, 20, 0x64748b, 0x334155); grid.material.transparent = true; grid.material.opacity = 0.28; scene.add(grid);
            var axes = new THREE.AxesHelper(4); axes.material.transparent = true; axes.material.opacity = 0.45; scene.add(axes);
            var dynamicGroup = new THREE.Group(); scene.add(dynamicGroup);
            var liveState = cv._electro3dState || currentElectro3DState();
            var raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), probePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
            var resizeObserver = null, disposed = false, pointerStart = null;
            function disposeObject(obj) { obj.traverse(function (child) { if (child.geometry && child.geometry.dispose) child.geometry.dispose(); if (child.material) (Array.isArray(child.material) ? child.material : [child.material]).forEach(function (material) { if (material && material.dispose) material.dispose(); }); }); }
            function clearDynamic() { while (dynamicGroup.children.length) { var child = dynamicGroup.children[dynamicGroup.children.length - 1]; dynamicGroup.remove(child); disposeObject(child); } }
            function resize() { var width = Math.max(1, cv.clientWidth || 680), height = Math.max(1, cv.clientHeight || 410); renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); }
            function renderScene() { if (!disposed) { resize(); renderer.render(scene, camera); } }
            function addArrow(origin, field, color, length, opacity) {
              var magnitude = Math.hypot(field.x, field.y, field.z); if (magnitude < 1e-10) return;
              var arrow = new THREE.ArrowHelper(new THREE.Vector3(field.x, field.y, field.z).normalize(), origin, length, color, Math.min(0.22, length * 0.3), Math.min(0.13, length * 0.18));
              arrow.line.material.transparent = true; arrow.line.material.opacity = opacity; arrow.cone.material.transparent = true; arrow.cone.material.opacity = opacity; dynamicGroup.add(arrow);
            }
            function buildCoil(state) {
              var visibleTurns = 5 + Math.round(Math.max(0, Math.min(195, state.turns - 5)) / 195 * 9);
              var points = [], samples = visibleTurns * 18;
              for (var i = 0; i <= samples; i++) {
                var t = i / samples, angle = state.windingDir * t * visibleTurns * Math.PI * 2;
                points.push(new THREE.Vector3(-state.length / 2 + t * state.length, Math.cos(angle) * state.radius, Math.sin(angle) * state.radius));
              }
              var curve = new THREE.CatmullRomCurve3(points);
              var wire = new THREE.Mesh(new THREE.TubeGeometry(curve, samples, 0.035, 8, false), new THREE.MeshStandardMaterial({ color: state.current > 0 ? 0xf59e0b : 0x64748b, emissive: 0xf59e0b, emissiveIntensity: state.current > 0 ? 0.18 : 0, roughness: 0.42, metalness: 0.55 }));
              dynamicGroup.add(wire);
              if (state.current > 0) {
                [0.14, 0.36, 0.58, 0.80].forEach(function (t) {
                  var point = curve.getPointAt(t), tangent = curve.getTangentAt(t).multiplyScalar(state.currentDir < 0 ? -1 : 1);
                  addArrow(point.clone().add(tangent.clone().multiplyScalar(-0.22)), tangent, 0xfbbf24, 0.48, 1);
                });
              }
              if (state.material !== 'air') {
                var coreColor = state.material === 'soft' ? 0x94a3b8 : 0x64748b;
                var core = new THREE.Mesh(new THREE.CylinderGeometry(state.radius * 0.53, state.radius * 0.53, state.length * 1.12, 28), new THREE.MeshStandardMaterial({ color: coreColor, roughness: 0.34, metalness: 0.72, transparent: true, opacity: 0.86 }));
                core.rotation.z = Math.PI / 2; dynamicGroup.add(core);
              } else {
                var airCore = new THREE.Mesh(new THREE.CylinderGeometry(state.radius * 0.52, state.radius * 0.52, state.length * 1.04, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0x64748b, wireframe: true, transparent: true, opacity: 0.16 }));
                airCore.rotation.z = Math.PI / 2; dynamicGroup.add(airCore);
              }
              if (state.current > 0) {
                var direction = state.currentDir * state.windingDir > 0 ? 1 : -1;
                [-1, 1].forEach(function (side) {
                  var isNorth = side === direction;
                  var pole = new THREE.Mesh(new THREE.CylinderGeometry(state.radius * 0.46, state.radius * 0.46, 0.055, 28), new THREE.MeshBasicMaterial({ color: isNorth ? 0xef4444 : 0x3b82f6, transparent: true, opacity: 0.72 }));
                  pole.rotation.z = Math.PI / 2; pole.position.x = side * state.length * 0.57; dynamicGroup.add(pole);
                  var ringRadii = isNorth ? [0.34] : [0.25, 0.42];
                  ringRadii.forEach(function (radiusScale) {
                    var ring = new THREE.Mesh(new THREE.TorusGeometry(state.radius * radiusScale, Math.max(0.018, state.radius * 0.025), 7, 30), new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.94 }));
                    ring.rotation.y = Math.PI / 2;
                    ring.position.x = side * state.length * 0.585;
                    dynamicGroup.add(ring);
                  });
                });
                addArrow(new THREE.Vector3(-direction * state.length * 0.28, 0, 0), { x: direction, y: 0, z: 0 }, 0xf43f5e, state.length * 0.56, 1);
              }
            }
            function buildVectors(state) {
              if (!state.vectors || state.current <= 0) return;
              var xs = [-1.25, -0.62, 0, 0.62, 1.25].map(function (v) { return v * state.length; });
              var side = [-1.7, 0, 1.7].map(function (v) { return v * state.radius; });
              var magnitudes = [];
              xs.forEach(function (x) { side.forEach(function (y) { side.forEach(function (z) { var field = solenoidFieldAt3D(x, y, z, state); magnitudes.push(Math.hypot(field.x, field.y, field.z)); }); }); });
              var maxMagnitude = Math.max.apply(Math, magnitudes.concat([1e-9])), index = 0;
              xs.forEach(function (x) { side.forEach(function (y) { side.forEach(function (z) {
                var field = solenoidFieldAt3D(x, y, z, state), level = Math.sqrt(magnitudes[index++] / maxMagnitude);
                addArrow(new THREE.Vector3(x, y, z), field, level > 0.55 ? 0xf43f5e : 0x38bdf8, 0.24 + level * 0.72, 0.38 + level * 0.5);
              }); }); });
            }
            function buildLines(state) {
              if (!state.lines || state.current <= 0) return;
              var direction = state.currentDir * state.windingDir > 0 ? 1 : -1;
              var northX = direction * state.length * 0.58;
              for (var ring = 0; ring < 2; ring++) {
                for (var i = 0; i < 8; i++) {
                  var angle = i / 8 * Math.PI * 2 + ring * Math.PI / 8;
                  var r = state.radius * (ring ? 0.72 : 0.32);
                  var seed = { x: northX, y: Math.cos(angle) * r, z: Math.sin(angle) * r };
                  var traced = traceSolenoidLine3D(seed, state, 1, { step: 0.11, maxSteps: 210, bound: 7 });
                  if (traced.length < 3) continue;
                  var points = traced.map(function (p) { return new THREE.Vector3(p.x, p.y, p.z); });
                  dynamicGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.5 })));
                  var mi = Math.min(points.length - 1, Math.max(1, Math.floor(points.length * 0.46))), mp = points[mi];
                  addArrow(mp, solenoidFieldAt3D(mp.x, mp.y, mp.z, state), 0xfbbf24, 0.32, 0.88);
                }
              }
            }
            function buildProbe(state) {
              var origin = new THREE.Vector3(state.probe.x, state.probe.y, state.probe.z);
              var sphere = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 12), new THREE.MeshBasicMaterial({ color: 0xfbbf24 })); sphere.position.copy(origin); dynamicGroup.add(sphere);
              var field = solenoidFieldAt3D(origin.x, origin.y, origin.z, state); addArrow(origin, field, 0xfbbf24, Math.min(1.7, 0.55 + Math.log10(1 + Math.hypot(field.x, field.y, field.z)) * 0.5), 1);
            }
            function rebuild(state) {
              if (disposed) return;
              liveState = Object.assign({}, state, { probe: Object.assign({}, state.probe) });
              clearDynamic(); buildLines(liveState); buildVectors(liveState); buildCoil(liveState); buildProbe(liveState); renderScene();
            }
            function setPointer(event) { var rect = cv.getBoundingClientRect(); pointer.x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1; pointer.y = -((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1; raycaster.setFromCamera(pointer, camera); }
            function onPointerDown(event) { pointerStart = { x: event.clientX, y: event.clientY }; }
            function onPointerUp(event) {
              if (!pointerStart || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) return;
              setPointer(event); probePlane.set(new THREE.Vector3(0, 1, 0), 0); var point = new THREE.Vector3();
              if (!raycaster.ray.intersectPlane(probePlane, point)) return;
              var probe = { x: Math.max(-4, Math.min(4, point.x)), y: liveState.probe.y, z: Math.max(-3, Math.min(3, point.z)) };
              if (cv._electro3dCommit) cv._electro3dCommit({ electro3dProbe: probe }, 'Moved the electromagnet field probe.');
            }
            function onContextLost(event) { event.preventDefault(); upd({ electro3dStatus: 'error' }); announceToSR('The 3D electromagnet graphics context was lost. The 2D coil investigation remains available.'); }
            function setView(view) {
              if (view === 'side') camera.position.set(0.01, 2.2, 10);
              else if (view === 'end') camera.position.set(9, 0.6, 0.01);
              else if (view === 'top') camera.position.set(0.01, 10, 0.01);
              else camera.position.set(7.5, 4.8, 7.2);
              controls.target.set(0, 0, 0); camera.lookAt(controls.target); controls.update(); renderScene();
            }
            function cleanup() {
              if (disposed) return; disposed = true;
              cv.removeEventListener('pointerdown', onPointerDown); cv.removeEventListener('pointerup', onPointerUp); cv.removeEventListener('webglcontextlost', onContextLost);
              controls.removeEventListener('change', renderScene); window.removeEventListener('resize', renderScene); controls.dispose(); if (resizeObserver) resizeObserver.disconnect();
              clearDynamic(); renderer.dispose(); cv._electro3dInit = false; cv._electro3dUpdate = null; cv._electro3dCleanup = null;
            }
            cv.addEventListener('pointerdown', onPointerDown); cv.addEventListener('pointerup', onPointerUp); cv.addEventListener('webglcontextlost', onContextLost); controls.addEventListener('change', renderScene);
            if (typeof ResizeObserver !== 'undefined') { resizeObserver = new ResizeObserver(renderScene); resizeObserver.observe(cv); } else window.addEventListener('resize', renderScene, { passive: true });
            cv._electro3dUpdate = rebuild; cv._electro3dSetView = setView; cv._electro3dCleanup = cleanup; rebuild(liveState); upd({ electro3dStatus: 'ready' });
          }).catch(function () { cv._electro3dInit = false; if (cv.isConnected) { upd({ electro3dStatus: 'error' }); announceToSR('The 3D electromagnet engine could not load. Use the 2D coil investigation or retry.'); } });
      }

      function electro3DCanvasRef(cv) {
        if (!cv) { var oldCanvas = _electro3DCanvas; window.setTimeout(function () { if (oldCanvas && !oldCanvas.isConnected && typeof oldCanvas._electro3dCleanup === 'function') oldCanvas._electro3dCleanup(); }, 0); return; }
        _electro3DCanvas = cv; cv._electro3dState = currentElectro3DState(); cv._electro3dCommit = commitElectro3D;
        if (typeof cv._electro3dUpdate === 'function') cv._electro3dUpdate(cv._electro3dState); else initElectro3DCanvas(cv);
      }
      function electro3DCard() {
        var state = currentElectro3DState();
        var material = CORE_MATERIALS[state.material] || CORE_MATERIALS.air;
        var airB = finiteSolenoidCenterField(state.turns, state.current, state.lengthM, state.radiusM, 'air');
        var centerB = finiteSolenoidCenterField(state.turns, state.current, state.lengthM, state.radiusM, state.material);
        var idealAir = solenoidField(state.turns, state.current, state.lengthM, 1);
        var gain = airB > 1e-12 ? centerB / airB : 1;
        var saturation = state.material === 'air' || !Number.isFinite(material.saturationT) ? 0 : Math.max(0, Math.min(1, (centerB - airB) / material.saturationT));
        var wireLength = solenoidWireLength(state.turns, state.radiusM, state.lengthM);
        var heat = solenoidHeatingIndex(state.turns, state.current, state.radiusM, state.lengthM);
        var probeField = solenoidFieldAt3D(state.probe.x, state.probe.y, state.probe.z, state);
        var probeMagnitude = Math.hypot(probeField.x, probeField.y, probeField.z);
        var fieldDir = state.currentDir * state.windingDir > 0 ? 'positive x; right end is north' : 'negative x; left end is north';
        function cameraButton(id, label) { return h('button', { key: id, onClick: function () { if (_electro3DCanvas && typeof _electro3DCanvas._electro3dSetView === 'function') _electro3DCanvas._electro3dSetView(id); announceToSR(label + ' electromagnet view selected.'); }, style: btn() }, label); }
        function setProbe(axis, value) { var next = Object.assign({}, state.probe); next[axis] = value; commitElectro3D({ electro3dProbe: next }); }
        return card('3D Electromagnet Engineering Lab', h('div', null,
          h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } },
            'Watch the fields from many current loops superpose into one solenoid field. Orange arrows follow conventional current around the helix; rose field arrows point toward the electromagnet’s north end.'),
          sceneViewport(h('canvas', { key: 'electro3d-' + (d.electro3dAttempt || 0), ref: electro3DCanvasRef, className: 'mag-electro3d', role: 'img',
            'aria-label': 'Interactive three-dimensional solenoid, current helix, field lines, pole markers, and movable field probe.',
            'aria-describedby': 'mag-electro3d-status mag-electro3d-summary',
            style: { display: 'block', width: '100%', borderRadius: 10, border: '1px solid ' + BORDER, background: INSTRUMENT, touchAction: 'none' } }), [
              { label: 'Center field', value: (centerB * 1000).toFixed(centerB < 0.01 ? 2 : 0) + ' mT', tone: '#f59e0b' },
              { label: 'Ampere-turns', value: (state.turns * state.current).toFixed(0) + ' A·turn', tone: '#38bdf8' }
            ], 'coil axis · x'),
          h('div', { id: 'mag-electro3d-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { color: d.electro3dStatus === 'error' ? '#fbbf24' : SOFT, fontSize: 11.5, lineHeight: 1.45, margin: '7px 0' } },
            d.electro3dStatus === 'ready' ? 'Scene ready. Drag to orbit; click the ground plane to move the gold field probe.' :
            d.electro3dStatus === 'error' ? h('span', null, '3D graphics did not load. The complete 2D coil investigation remains available. ', h('button', { onClick: function () { upd({ electro3dStatus: 'loading', electro3dAttempt: (d.electro3dAttempt || 0) + 1 }); }, style: btn() }, 'Retry 3D')) : 'Loading the 3D electromagnet engine...'),
          poleLegend(fieldDir.indexOf('right end') >= 0 ? 'North pole — right end, one bright ring' : 'North pole — left end, one bright ring', fieldDir.indexOf('right end') >= 0 ? 'South pole — left end, two bright rings' : 'South pole — right end, two bright rings'),
          sceneTextAlternative('mag-electro3d-summary', 'The coil has ' + state.turns + ' turns carrying ' + state.current + ' amps around a ' + material.name + ' core. The field points ' + fieldDir + '. The center field is ' + (centerB * 1000).toFixed(centerB < 0.01 ? 2 : 0) + ' millitesla. The field probe is at x ' + state.probe.x.toFixed(2) + ', y ' + state.probe.y.toFixed(2) + ', z ' + state.probe.z.toFixed(2) + ', with relative magnitude ' + probeMagnitude.toFixed(2) + '.'),
          h('div', { role: 'group', 'aria-label': '3D electromagnet camera and layers', style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 9 } },
            cameraButton('perspective', 'Perspective'), cameraButton('side', 'Side'), cameraButton('end', 'Look into coil'), cameraButton('top', 'Top'),
            h('button', { 'aria-pressed': state.vectors ? 'true' : 'false', onClick: function () { commitElectro3D({ electro3dVectors: !state.vectors }); }, style: btn(state.vectors) }, 'Vectors: ' + (state.vectors ? 'on' : 'off')),
            h('button', { 'aria-pressed': state.lines ? 'true' : 'false', onClick: function () { commitElectro3D({ electro3dLines: !state.lines }); }, style: btn(state.lines) }, 'Field lines: ' + (state.lines ? 'on' : 'off'))),
          h('div', { className: 'mag-observe' },
            h('span', { 'aria-hidden': 'true' }, '✋'),
            h('span', null, h('b', null, 'Right-hand rule: '), 'curl your right-hand fingers with the orange current arrows. Your thumb points with the interior field toward the north pole. Reverse either current or winding and the poles swap; reverse both and they return.')),
          electro3DSaturationGraph(),
          h('div', { className: 'mag-observe' },
            h('span', { 'aria-hidden': 'true' }, 'NI'),
            h('div', null,
              h('b', null, 'Equal ampere-turn engineering comparison: '), 'both setups make NI = 160 A·turns in the same geometry, but their wire length and I² heating differ.',
              h('div', { role: 'group', 'aria-label': 'Compare equal ampere-turn coil designs', style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 7 } },
                h('button', { onClick: function () { commitElectro3D({ turns: 40, current: 4 }, 'Selected 40 turns at 4 amps: 160 ampere-turns.'); }, style: btn(state.turns === 40 && state.current === 4) }, '40 turns × 4 A'),
                h('button', { onClick: function () { commitElectro3D({ turns: 160, current: 1 }, 'Selected 160 turns at 1 amp: 160 ampere-turns.'); }, style: btn(state.turns === 160 && state.current === 1) }, '160 turns × 1 A')))),
          h('div', { className: 'mag-sim-grid', style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12, alignItems: 'start' } },
            h('section', { 'aria-label': 'Coil engineering controls' },
              h('div', { style: { color: TEXT, fontSize: 12.5, fontWeight: 800, marginBottom: 7 } }, 'Engineer the coil'),
              slider('Turns of wire (N)', state.turns, 5, 200, 5, function (v) { commitElectro3D({ turns: v }); }),
              slider('Current (A)', state.current, 0, 6, 0.5, function (v) { commitElectro3D({ current: v }); }),
              slider('Coil length (cm)', d.electro3dLengthCm, 6, 24, 1, function (v) { commitElectro3D({ electro3dLengthCm: v }); }),
              slider('Coil radius (cm)', d.electro3dRadiusCm, 1.5, 5, 0.5, function (v) { commitElectro3D({ electro3dRadiusCm: v }); }),
              h('div', { role: 'group', 'aria-label': 'Electromagnet direction', style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 9 } },
                h('button', { 'aria-pressed': state.currentDir < 0 ? 'true' : 'false', onClick: function () { commitElectro3D({ currentDir: -state.currentDir, directionSeen: true }, 'Current reversed; electromagnet poles swapped.'); }, style: btn(state.currentDir < 0) }, 'Reverse current'),
                h('button', { 'aria-pressed': state.windingDir < 0 ? 'true' : 'false', onClick: function () { commitElectro3D({ windingDir: -state.windingDir, directionSeen: true }, 'Winding reversed; electromagnet poles swapped.'); }, style: btn(state.windingDir < 0) }, 'Reverse winding')),
              h('div', { role: 'group', 'aria-label': 'Core material', style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                Object.keys(CORE_MATERIALS).map(function (key) { return h('button', { key: key, 'aria-pressed': state.material === key ? 'true' : 'false', onClick: function () { commitElectro3D({ electro3dMaterial: key, core: key !== 'air' }, CORE_MATERIALS[key].name + ' core selected.'); }, style: btn(state.material === key) }, CORE_MATERIALS[key].name); }))),
            h('section', { 'aria-label': 'Three-dimensional solenoid field probe' },
              h('div', { style: { color: TEXT, fontSize: 12.5, fontWeight: 800, marginBottom: 7 } }, 'Measure around the coil'),
              slider('Probe x', state.probe.x, -4, 4, 0.25, function (v) { setProbe('x', v); }),
              slider('Probe y', state.probe.y, -3, 3, 0.25, function (v) { setProbe('y', v); }),
              slider('Probe z', state.probe.z, -3, 3, 0.25, function (v) { setProbe('z', v); }),
              h('div', { className: 'mag-observe', role: 'status' },
                h('span', { 'aria-hidden': 'true' }, 'B'),
                h('span', null, h('b', null, 'Probe vector (' + probeField.x.toFixed(2) + ', ' + probeField.y.toFixed(2) + ', ' + probeField.z.toFixed(2) + ')'),
                  h('br'), 'Relative magnitude ' + probeMagnitude.toFixed(2) + '. Direction and return path are meaningful; this off-axis display uses a loop-dipole approximation.')))
          ),
          h('div', { className: 'mag-observe', role: 'status' },
            h('span', { 'aria-hidden': 'true' }, '⚙'),
            h('span', null,
              h('b', null, 'NI = ' + (state.turns * state.current).toFixed(0) + ' A·turns · finite-coil center field ' + (centerB * 1000).toFixed(centerB < 0.01 ? 2 : 0) + ' mT · points ' + fieldDir + '.'),
              h('br'), 'Air-core geometry gives ' + (airB * 1000).toFixed(2) + ' mT versus ' + (idealAir * 1000).toFixed(2) + ' mT from the long-solenoid approximation.',
              h('br'), material.name + ' effective gain ' + gain.toFixed(1) + '×' + (state.material === 'air' ? '.' : ' · saturation ' + Math.round(saturation * 100) + '%.') + ' Wire length ' + wireLength.toFixed(1) + ' m; relative heating index ' + heat.toFixed(1) + ' (scales with I² and wire length).')),
          disclosure('The center-field calculation uses the finite-solenoid axis formula and a smooth saturation model for representative core materials. Exact core behavior depends on alloy, shape, air gaps, temperature, and magnetic history. The 3D off-axis field is a softened stack-of-loop-dipoles model for topology and direction, not precision magnet design.')
        ), '#f59e0b');
      }
      function electroTab() {
        var coreMult = d.core ? 600 : 1;
        var B = solenoidField(d.turns, d.current, 0.1, coreMult); // 10 cm coil
        var fieldDir = (d.currentDir < 0 ? -1 : 1) * (d.windingDir < 0 ? -1 : 1);
        var rel = B / solenoidField(20, 2, 0.1, 1); // strength vs the default air coil
        var bars = Math.max(1, Math.min(40, Math.round(rel * 4)));
        return h('div', null,
          h('div', { role: 'group', 'aria-label': 'Electromagnet view', style: { display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 } },
            h('span', { style: { color: SOFT, fontSize: 11.5, fontWeight: 700 } }, 'Explore the coil in'),
            h('button', { 'aria-pressed': d.electroView !== '3d' ? 'true' : 'false', onClick: function () { upd({ electroView: '2d' }); announceToSR('Two-dimensional electromagnet investigation selected.'); }, style: btn(d.electroView !== '3d') }, '2D fair test'),
            h('button', { 'aria-pressed': d.electroView === '3d' ? 'true' : 'false', onClick: function () { if (d.electroView === '3d') return; upd({ electroView: '3d', electro3dStatus: 'loading', electro3dUsed: true, coilTouched: true, electro3dMaterial: d.core ? (d.electro3dMaterial === 'air' ? 'soft' : d.electro3dMaterial) : 'air' }); announceToSR('Three-dimensional electromagnet engineering lab selected.'); }, style: btn(d.electroView === '3d') }, '3D engineering lab')),
          d.electroView === '3d' ? electro3DCard() : card('Build an electromagnet', h('div', null,
            h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } }, 'A coil of wire carrying current becomes a magnet. Two things you control set its strength: how many ', h('b', null, 'turns'), ' of wire, and how much ', h('b', null, 'current'), ' flows. An iron core multiplies it.'),
            // schematic coil
            h('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 10 } }, electroSVG(bars)),
            slider('Turns of wire (N)', d.turns, 5, 200, 5, function (v) { upd({ turns: v, coilTouched: true }); }),
            slider('Current (I, amps)', d.current, 0, 6, 0.5, function (v) { upd({ current: v, coilTouched: true }); }),
            h('div', { style: { display: 'flex', gap: 7, flexWrap: 'wrap', margin: '-2px 0 9px' } },
              h('button', { 'aria-pressed': d.currentDir < 0 ? 'true' : 'false', onClick: function () {
                upd({ currentDir: -d.currentDir, coilTouched: true, directionSeen: true });
                announceToSR('Current reversed. Electromagnet poles swapped.');
              }, style: btn(d.currentDir < 0) }, '↕ Reverse current'),
              h('button', { 'aria-pressed': d.windingDir < 0 ? 'true' : 'false', onClick: function () {
                upd({ windingDir: -d.windingDir, coilTouched: true, directionSeen: true });
                announceToSR('Coil winding reversed. Electromagnet poles swapped.');
              }, style: btn(d.windingDir < 0) }, '↻ Reverse winding')),
            h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, color: TEXT, fontSize: 13, margin: '6px 0 10px', cursor: 'pointer' } },
              h('input', { type: 'checkbox', checked: !!d.core, onChange: function () { upd({ core: !d.core, coilTouched: true }); } }),
              'Slide in a soft-iron core'),
            h('div', { className: 'mag-observe' },
              h('span', { 'aria-hidden': 'true' }, '🧪'),
              h('span', null, h('b', null, 'Run a fair test: '), 'hold two controls still and change only one. Double the turns, then reset and double the current. Do both changes multiply the field by the same factor?')),
            h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)' } },
              h('div', { style: { color: TEXT, fontSize: 13, fontWeight: 700 } }, 'Field strength ≈ ' + rel.toFixed(1) + '× the starting coil'),
              h('div', { style: { color: SOFT, fontSize: 12, marginTop: 4 } }, 'Calculated interior field ≈ ' + (B * 1000).toFixed(B < 0.01 ? 2 : 0) + ' mT · B = μ₀ · (N / L) · I' + (d.core ? ' × iron core' : '') + ' · field points ' + (fieldDir > 0 ? 'right' : 'left')),
              d.current === 0 ? h('div', { style: { color: '#fbbf24', fontSize: 12, marginTop: 4 } }, 'No current → no field. An electromagnet is only magnetic while the electricity flows.') : null)
          ), '#f59e0b'),
          d.electroView !== '3d' ? disclosure('B = μ₀·(N/L)·I is exact for a long ideal solenoid. The iron-core boost is shown as roughly ×600; real soft-iron cores range from about ×100 to a few thousand, depending on the metal and how hard you drive it.') : null
        );
      }

      function electroSVG(bars) {
        var kids = [];
        kids.push(h('rect', { key: 'bg', x: 0, y: 0, width: 300, height: 120, fill: INSTRUMENT, rx: 10 }));
        // core rod
        kids.push(h('rect', { key: 'core', x: 60, y: 52, width: 180, height: 16, rx: 3, fill: d.core ? '#94a3b8' : '#1f2937', stroke: '#334155' }));
        // Show more visible loops as N rises. This is a visual sample, not one
        // ellipse per physical turn, so the diagram stays readable at N = 200.
        var loopCount = 5 + Math.round((d.turns - 5) / 195 * 9);
        var loopGap = 152 / Math.max(1, loopCount - 1);
        for (var i = 0; i < loopCount; i++) {
          kids.push(h('ellipse', { key: 'c' + i, cx: 74 + i * loopGap, cy: 60, rx: 7, ry: 22, fill: 'none', stroke: d.current > 0 ? '#f59e0b' : '#475569', strokeWidth: 3 }));
        }
        // Current-direction cues and the axial magnetic field.
        if (d.current > 0) {
          var axisDir = (d.currentDir < 0 ? -1 : 1) * (d.windingDir < 0 ? -1 : 1);
          [92, 132, 172, 212].forEach(function (ax, ai) {
            var x1 = axisDir > 0 ? ax : ax + 18;
            var x2 = axisDir > 0 ? ax + 18 : ax;
            kids.push(h('line', { key: 'axis' + ai, x1: x1, y1: 60, x2: x2, y2: 60, stroke: 'rgba(244,63,94,0.72)', strokeWidth: 1.5 }));
            kids.push(h('polygon', { key: 'axishead' + ai, points: x2 + ',60 ' + (x2 - axisDir * 6) + ',56 ' + (x2 - axisDir * 6) + ',64', fill: 'rgba(244,63,94,0.82)' }));
          });
          kids.push(h('text', { key: 'idir', x: 150, y: 28, fill: '#fbbf24', fontSize: 11, textAnchor: 'middle' }, 'right-hand rule: reverse current OR winding → swap poles'));
        } else {
          kids.push(h('text', { key: 'off', x: 150, y: 28, fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' }, 'circuit off · no magnetic field'));
        }
        kids.push(h('text', { key: 'turnLabel', x: 150, y: 88, fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' }, loopCount + ' visible loops represent ' + d.turns + ' turns'));
        // strength meter
        kids.push(h('rect', { key: 'mb', x: 60, y: 96, width: 180, height: 12, rx: 6, fill: '#1f2937' }));
        kids.push(h('rect', { key: 'mf', x: 60, y: 96, width: Math.min(180, bars * 4.5), height: 12, rx: 6, fill: '#f43f5e' }));
        var poleDir = (d.currentDir < 0 ? -1 : 1) * (d.windingDir < 0 ? -1 : 1);
        kids.push(h('text', { key: 'poleR', x: 250, y: 64, fill: poleDir > 0 ? '#ef4444' : '#3b82f6', fontSize: 13, fontWeight: 800 }, d.current > 0 ? (poleDir > 0 ? 'N' : 'S') : ''));
        kids.push(h('text', { key: 'poleL', x: 46, y: 64, fill: poleDir > 0 ? '#3b82f6' : '#ef4444', fontSize: 13, fontWeight: 800, textAnchor: 'end' }, d.current > 0 ? (poleDir > 0 ? 'S' : 'N') : ''));
        return h('svg', { viewBox: '0 0 300 120', width: '100%', style: { maxWidth: 380 }, role: 'img', 'aria-label': 'A wire coil with ' + d.turns + ' turns and ' + d.current + ' amps, ' + (d.core ? 'with an iron core' : 'with an air core') + '; field points ' + (poleDir > 0 ? 'right' : 'left') + ' and the strength meter is ' + (d.current > 0 ? 'filled' : 'empty') }, kids);
      }

      // ── Motor ─────────────────────────────────────────────────────────
      function forceVectorLabCard() {
        var state = wireForceVectorState(d.forceLabCurrent, d.forceLabField, d.forceLabAngle, d.forceLabLength, d.forceLabCurrentDir, d.forceLabFieldDir);
        var theta = state.angle * Math.PI / 180;
        var cx = 130, cy = 128, wireRadius = 72;
        var wireEndX = cx + Math.sin(theta) * wireRadius;
        var wireEndY = cy - Math.cos(theta) * wireRadius;
        var currentMidX = cx + Math.sin(theta) * wireRadius * 0.52;
        var currentMidY = cy - Math.cos(theta) * wireRadius * 0.52;
        var forceSign = state.signedForce >= 0 ? 1 : -1;
        var forceEndX = cx + forceSign * Math.min(58, 18 + state.magnitude * 0.7);
        var forceEndY = cy - forceSign * Math.min(34, 10 + state.magnitude * 0.42);
        var maxForce = Math.max(1, state.current * state.field * state.length);
        var curve = [];
        for (var angle = 0; angle <= 90; angle += 5) {
          var x = 300 + angle / 90 * 198;
          var y = 192 - (state.current * state.field * state.length * Math.sin(angle * Math.PI / 180) / maxForce) * 112;
          curve.push(x.toFixed(1) + ',' + y.toFixed(1));
        }
        function commit(patch, message) {
          upd(Object.assign({}, patch, { forceLabUsed: true, directionSeen: true }));
          if (message) announceToSR(message);
        }
        var aria = 'Right-hand-rule force lab. Current ' + state.current.toFixed(1) + ', field ' + state.field.toFixed(1) + ', wire length ' + state.length.toFixed(1) + ', angle ' + state.angle.toFixed(0) + ' degrees from the field. Force magnitude ' + state.magnitude.toFixed(2) + ' relative units toward ' + state.forceDirection + '. Parallel current fraction ' + state.parallelFraction.toFixed(2) + ', perpendicular fraction ' + state.perpendicularFraction.toFixed(2) + '.';
        return h('section', { 'aria-label': 'Right-hand-rule wire-force lab', style: { margin: '12px 0 8px' } },
          h('div', { style: { color: TEXT, fontSize: 12.5, fontWeight: 800, marginBottom: 4 } }, 'Right-hand-rule force lab'),
          h('p', { style: { color: SOFT, fontSize: 12, margin: '0 0 8px', lineHeight: 1.45 } }, 'Rotate a current-carrying wire through a uniform field. The vector view shows ', h('b', null, 'F = I L × B'), '; the curve makes the ', h('b', null, 'sin θ'), ' dependence visible.'),
          h('svg', { viewBox: '0 0 520 248', width: '100%', style: { maxWidth: 760, display: 'block', margin: '0 auto 8px' }, role: 'img', 'aria-label': aria },
            h('rect', { x: 0, y: 0, width: 520, height: 248, rx: 10, fill: INSTRUMENT }),
            h('text', { x: 130, y: 18, fill: TEXT, fontSize: 11.5, fontWeight: 800, textAnchor: 'middle' }, 'VECTOR VIEW · x, y, z'),
            h('text', { x: 400, y: 18, fill: TEXT, fontSize: 11.5, fontWeight: 800, textAnchor: 'middle' }, 'FORCE CURVE · |F| ∝ sin θ'),
            h('line', { x1: cx, y1: cy, x2: 212, y2: cy, stroke: '#94a3b8', strokeWidth: 1.5 }),
            h('polygon', { points: '220,' + cy + ' 210,' + (cy - 4) + ' 210,' + (cy + 4), fill: '#94a3b8' }),
            h('text', { x: 218, y: cy - 7, fill: SOFT, fontSize: 10 }, 'x'),
            h('line', { x1: cx, y1: cy, x2: cx, y2: 47, stroke: '#94a3b8', strokeWidth: 1.5 }),
            h('polygon', { points: cx + ',39 ' + (cx - 4) + ',49 ' + (cx + 4) + ',49', fill: '#94a3b8' }),
            h('text', { x: cx + 7, y: 48, fill: SOFT, fontSize: 10 }, 'y'),
            h('line', { x1: cx, y1: cy, x2: 76, y2: 177, stroke: '#94a3b8', strokeWidth: 1.5, strokeDasharray: '4 3' }),
            h('polygon', { points: '68,184 80,179 74,172', fill: '#94a3b8' }),
            h('text', { x: 69, y: 194, fill: SOFT, fontSize: 10 }, 'z'),
            [64, 98, 164, 198].map(function (x, index) {
              var direction = d.forceLabFieldDir < 0 ? -1 : 1;
              var y1 = direction > 0 ? 180 : 68, y2 = direction > 0 ? 68 : 180;
              return h('g', { key: 'field-arrow-' + index },
                h('line', { x1: x, y1: y1, x2: x, y2: y2, stroke: '#38bdf8', strokeWidth: 2, opacity: 0.75 }),
                h('polygon', { points: x + ',' + y2 + ' ' + (x - 5) + ',' + (y2 + (direction > 0 ? 9 : -9)) + ' ' + (x + 5) + ',' + (y2 + (direction > 0 ? 9 : -9)), fill: '#38bdf8' }));
            }),
            h('text', { x: 80, y: 60, fill: '#7dd3fc', fontSize: 11 }, 'B'),
            h('line', { x1: cx, y1: cy, x2: wireEndX, y2: wireEndY, stroke: '#fbbf24', strokeWidth: 7, strokeLinecap: 'round' }),
            h('polygon', { points: currentMidX + ',' + currentMidY + ' ' + (currentMidX - 10 * Math.cos(theta)) + ',' + (currentMidY - 10 * Math.sin(theta)) + ' ' + (currentMidX - 4 * Math.cos(theta) - 6 * Math.sin(theta)) + ',' + (currentMidY - 4 * Math.sin(theta) + 6 * Math.cos(theta)), fill: '#fbbf24' }),
            h('text', { x: wireEndX + 6, y: wireEndY - 4, fill: '#fbbf24', fontSize: 11 }, 'I · wire'),
            h('path', { d: 'M' + (cx + 26) + ' ' + cy + ' A26 26 0 0 0 ' + (cx + Math.sin(theta) * 26) + ' ' + (cy - Math.cos(theta) * 26), fill: 'none', stroke: '#fbbf24', strokeWidth: 1.5 }),
            h('text', { x: cx + 30, y: cy - 18, fill: TEXT, fontSize: 11 }, 'θ = ' + state.angle.toFixed(0) + '°'),
            h('line', { x1: cx, y1: cy, x2: forceEndX, y2: forceEndY, stroke: '#f43f5e', strokeWidth: 4, strokeLinecap: 'round' }),
            h('polygon', { points: forceEndX + ',' + forceEndY + ' ' + (forceEndX - forceSign * 10) + ',' + (forceEndY + 5) + ' ' + (forceEndX - forceSign * 4) + ',' + (forceEndY + forceSign * 10), fill: '#f43f5e' }),
            h('text', { x: forceEndX + forceSign * 5, y: forceEndY - forceSign * 5, fill: '#fda4af', fontSize: 11, textAnchor: forceSign > 0 ? 'start' : 'end' }, 'F · ' + state.forceDirection),
            h('text', { x: 130, y: 226, fill: SOFT, fontSize: 10.5, textAnchor: 'middle' }, 'field arrows + wire direction determine the force axis'),
            h('line', { x1: 300, y1: 192, x2: 500, y2: 192, stroke: BORDER }),
            h('line', { x1: 300, y1: 44, x2: 300, y2: 192, stroke: BORDER }),
            h('polyline', { points: curve.join(' '), fill: 'none', stroke: '#38bdf8', strokeWidth: 2.5 }),
            h('line', { x1: 300 + state.angle / 90 * 198, y1: 44, x2: 300 + state.angle / 90 * 198, y2: 198, stroke: '#fbbf24', strokeDasharray: '4 3' }),
            h('circle', { cx: 300 + state.angle / 90 * 198, cy: 192 - state.magnitude / maxForce * 112, r: 5, fill: INSTRUMENT, stroke: '#fbbf24', strokeWidth: 2 }),
            h('text', { x: 300, y: 208, fill: SOFT, fontSize: 10 }, '0° · parallel'),
            h('text', { x: 500, y: 208, fill: SOFT, fontSize: 10, textAnchor: 'end' }, '90° · perpendicular'),
            h('text', { x: 400, y: 231, fill: SOFT, fontSize: 10.5, textAnchor: 'middle' }, 'parallel component does not push; perpendicular component does')),
          h('div', { className: 'mag-sim-grid', style: { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, margin: '0 0 8px' } },
            h('div', { style: { padding: 8, border: '1px solid ' + BORDER, borderRadius: 9, textAlign: 'center' } }, h('div', { style: { color: SOFT, fontSize: 11 } }, 'Force magnitude'), h('div', { style: { color: TEXT, fontSize: 15, fontWeight: 800 } }, state.magnitude.toFixed(2))),
            h('div', { style: { padding: 8, border: '1px solid ' + BORDER, borderRadius: 9, textAlign: 'center' } }, h('div', { style: { color: SOFT, fontSize: 11 } }, 'Perpendicular fraction'), h('div', { style: { color: TEXT, fontSize: 15, fontWeight: 800 } }, state.perpendicularFraction.toFixed(2))),
            h('div', { style: { padding: 8, border: '1px solid ' + BORDER, borderRadius: 9, textAlign: 'center' } }, h('div', { style: { color: SOFT, fontSize: 11 } }, 'Force direction'), h('div', { style: { color: TEXT, fontSize: 15, fontWeight: 800 } }, state.forceDirection))),
          h('div', { role: 'group', 'aria-label': 'Force vector direction controls', style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 8 } },
            h('button', { 'aria-pressed': d.forceLabCurrentDir < 0 ? 'true' : 'false', onClick: function () { commit({ forceLabCurrentDir: -d.forceLabCurrentDir }, 'Current reversed. Force direction reversed.'); }, style: btn(d.forceLabCurrentDir < 0) }, '↕ Reverse current'),
            h('button', { 'aria-pressed': d.forceLabFieldDir < 0 ? 'true' : 'false', onClick: function () { commit({ forceLabFieldDir: -d.forceLabFieldDir }, 'Field reversed. Force direction reversed.'); }, style: btn(d.forceLabFieldDir < 0) }, '🧲 Reverse field'),
            h('button', { 'aria-pressed': d.forceLabAngle === 0 ? 'true' : 'false', onClick: function () { commit({ forceLabAngle: 0 }, 'Wire is parallel to the field. Force is zero.'); }, style: btn(d.forceLabAngle === 0) }, '0° · parallel'),
            h('button', { 'aria-pressed': d.forceLabAngle === 90 ? 'true' : 'false', onClick: function () { commit({ forceLabAngle: 90 }, 'Wire is perpendicular to the field. Force is maximum.'); }, style: btn(d.forceLabAngle === 90) }, '90° · maximum')),
          h('div', { className: 'mag-sim-grid', style: { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 } },
            h('div', null,
              slider('Current in wire (I)', d.forceLabCurrent, 0, 8, 1, function (value) { commit({ forceLabCurrent: value }); }),
              slider('Magnetic field (B)', d.forceLabField, 0, 8, 1, function (value) { commit({ forceLabField: value }); })),
            h('div', null,
              slider('Wire angle from field (θ)', d.forceLabAngle, 0, 90, 5, function (value) { commit({ forceLabAngle: value }); }),
              slider('Wire length (L)', d.forceLabLength, 1, 10, 1, function (value) { commit({ forceLabLength: value }); }))),
          h('div', { className: 'mag-observe', role: 'status', 'aria-live': 'polite' },
            h('span', { 'aria-hidden': 'true' }, state.deadSpot ? '∥' : '⊗'),
            h('span', null, h('b', null, state.deadSpot ? 'No magnetic push at this angle. ' : 'Force is active. '), state.deadSpot ? 'The wire is parallel to the field, so the cross product vanishes. Rotate toward 90° to increase the perpendicular component.' : 'Reverse either current or field to flip F; reverse both and the original force direction returns.'))
        );
      }
      function powerBridgeCard() {
        var state = motorPowerBridgeState(d.forceLabCurrent, d.forceLabField, d.forceLabAngle, d.forceLabLength, d.forceLabSpeed, d.forceLabCurrentDir, d.forceLabFieldDir);
        var forceWidth = Math.min(118, state.magnitude / 40 * 118);
        var speedWidth = Math.min(118, state.tangentialSpeed / 40 * 118);
        var powerWidth = Math.min(118, state.mechanicalPower / 160 * 118);
        function commit(patch, message) {
          upd(Object.assign({}, patch, { forceLabUsed: true }));
          if (message) announceToSR(message);
        }
        var aria = 'Magnetic work bridge. Force magnitude ' + state.magnitude.toFixed(2) + ' relative units, radius ' + state.radius.toFixed(2) + ', shaft speed ' + state.speedRpm.toFixed(0) + ' RPM, tangential speed ' + state.tangentialSpeed.toFixed(2) + ', torque ' + state.torque.toFixed(2) + ', and mechanical power ' + state.mechanicalPower.toFixed(2) + ' relative units.';
        var statusText = state.deadSpot
          ? 'No work yet: the wire is parallel to the field, so F = 0.'
          : !state.moving
            ? 'Force is ready, but the shaft is stopped. Add motion to see power.'
            : 'The moving wire carries the magnetic push through a distance: P = F·v.';
        return h('section', { 'aria-label': 'Magnetic work and power bridge', style: { margin: '10px 0 8px' } },
          h('div', { style: { color: TEXT, fontSize: 12.5, fontWeight: 800, marginBottom: 4 } }, 'Force → torque → mechanical power'),
          h('p', { style: { color: SOFT, fontSize: 12, margin: '0 0 8px', lineHeight: 1.45 } }, 'Keep the magnetic force fixed, then add motion. This makes the work pathway visible: ', h('b', null, 'τ = F·r'), ' and ', h('b', null, 'P = F·v'), '. Values are relative teaching units.'),
          h('svg', { viewBox: '0 0 520 198', width: '100%', style: { maxWidth: 760, display: 'block', margin: '0 auto 8px' }, role: 'img', 'aria-label': aria },
            h('rect', { x: 0, y: 0, width: 520, height: 198, rx: 10, fill: INSTRUMENT }),
            h('text', { x: 260, y: 18, fill: TEXT, fontSize: 11.5, fontWeight: 800, textAnchor: 'middle' }, 'MAGNETIC WORK BRIDGE · P = F·v'),
            h('line', { x1: 34, y1: 73, x2: 146, y2: 73, stroke: '#f43f5e', strokeWidth: 4, strokeLinecap: 'round' }),
            h('polygon', { points: '146,73 134,67 134,79', fill: '#f43f5e' }),
            h('line', { x1: 198, y1: 73, x2: 310, y2: 73, stroke: '#fbbf24', strokeWidth: 4, strokeLinecap: 'round' }),
            h('polygon', { points: '310,73 298,67 298,79', fill: '#fbbf24' }),
            h('line', { x1: 362, y1: 73, x2: 474, y2: 73, stroke: '#34d399', strokeWidth: 4, strokeLinecap: 'round' }),
            h('polygon', { points: '474,73 462,67 462,79', fill: '#34d399' }),
            h('circle', { cx: 26, cy: 73, r: 7, fill: '#f43f5e' }),
            h('circle', { cx: 190, cy: 73, r: 7, fill: '#fbbf24' }),
            h('circle', { cx: 354, cy: 73, r: 7, fill: '#34d399' }),
            h('text', { x: 90, y: 48, fill: '#fda4af', fontSize: 12, fontWeight: 800, textAnchor: 'middle' }, 'F · force'),
            h('text', { x: 254, y: 48, fill: '#fde68a', fontSize: 12, fontWeight: 800, textAnchor: 'middle' }, 'τ = F·r'),
            h('text', { x: 430, y: 48, fill: '#86efac', fontSize: 12, fontWeight: 800, textAnchor: 'middle' }, 'P = F·v'),
            h('text', { x: 90, y: 101, fill: SOFT, fontSize: 10.5, textAnchor: 'middle' }, 'magnetic push'),
            h('text', { x: 254, y: 101, fill: SOFT, fontSize: 10.5, textAnchor: 'middle' }, 'turning effect'),
            h('text', { x: 430, y: 101, fill: SOFT, fontSize: 10.5, textAnchor: 'middle' }, 'rate of work'),
            h('text', { x: 28, y: 131, fill: SOFT, fontSize: 10.5 }, 'force'),
            h('rect', { x: 86, y: 122, width: 118, height: 10, rx: 5, fill: BORDER }),
            h('rect', { x: 86, y: 122, width: forceWidth, height: 10, rx: 5, fill: '#f43f5e' }),
            h('text', { x: 28, y: 153, fill: SOFT, fontSize: 10.5 }, 'speed'),
            h('rect', { x: 86, y: 144, width: 118, height: 10, rx: 5, fill: BORDER }),
            h('rect', { x: 86, y: 144, width: speedWidth, height: 10, rx: 5, fill: '#38bdf8' }),
            h('text', { x: 280, y: 131, fill: SOFT, fontSize: 10.5 }, 'power'),
            h('rect', { x: 338, y: 122, width: 148, height: 32, rx: 7, fill: BORDER }),
            h('rect', { x: 338, y: 122, width: powerWidth * 1.25, height: 32, rx: 7, fill: '#34d399', opacity: 0.85 }),
            h('text', { x: 412, y: 143, fill: TEXT, fontSize: 12, fontWeight: 800, textAnchor: 'middle' }, state.mechanicalPower.toFixed(2) + ' rel'),
            h('text', { x: 260, y: 181, fill: SOFT, fontSize: 10.5, textAnchor: 'middle' }, state.moving ? 'motion supplies v; angle supplies the perpendicular force' : 'set a shaft speed to activate mechanical power'),
          h('div', { className: 'mag-sim-grid', style: { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, margin: '0 0 8px' } },
            h('div', { style: { padding: 8, border: '1px solid ' + BORDER, borderRadius: 9, textAlign: 'center' } }, h('div', { style: { color: SOFT, fontSize: 11 } }, 'Tangential speed'), h('div', { style: { color: TEXT, fontSize: 15, fontWeight: 800 } }, state.tangentialSpeed.toFixed(2))),
            h('div', { style: { padding: 8, border: '1px solid ' + BORDER, borderRadius: 9, textAlign: 'center' } }, h('div', { style: { color: SOFT, fontSize: 11 } }, 'Torque'), h('div', { style: { color: TEXT, fontSize: 15, fontWeight: 800 } }, state.torque.toFixed(2))),
            h('div', { style: { padding: 8, border: '1px solid ' + BORDER, borderRadius: 9, textAlign: 'center' } }, h('div', { style: { color: SOFT, fontSize: 11 } }, 'Work per turn'), h('div', { style: { color: TEXT, fontSize: 15, fontWeight: 800 } }, state.workPerTurn.toFixed(2)))),
          h('div', { role: 'group', 'aria-label': 'Shaft speed presets', style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 8 } },
            h('button', { 'aria-pressed': d.forceLabSpeed === 0 ? 'true' : 'false', onClick: function () { commit({ forceLabSpeed: 0 }, 'Shaft stopped. Mechanical power is zero.'); }, style: btn(d.forceLabSpeed === 0) }, '0 RPM · stop'),
            h('button', { 'aria-pressed': d.forceLabSpeed === 300 ? 'true' : 'false', onClick: function () { commit({ forceLabSpeed: 300 }, 'Shaft set to 300 RPM.'); }, style: btn(d.forceLabSpeed === 300) }, '300 RPM · steady'),
            h('button', { 'aria-pressed': d.forceLabSpeed === 600 ? 'true' : 'false', onClick: function () { commit({ forceLabSpeed: 600 }, 'Shaft set to 600 RPM.'); }, style: btn(d.forceLabSpeed === 600) }, '600 RPM · fast')),
          slider('Shaft speed (RPM)', d.forceLabSpeed, 0, 600, 50, function (value) { commit({ forceLabSpeed: value }); }),
          h('div', { className: 'mag-observe', role: 'status', 'aria-live': 'polite' },
            h('span', { 'aria-hidden': 'true' }, state.powerActive ? '⚡' : '⏸'),
            h('span', null, h('b', null, statusText + ' '), state.powerActive ? 'Increasing angle, wire length, or speed increases the rate of mechanical work.' : 'The force curve and this bridge are linked to the same angle and field controls.')))
        );
      }
      function motorTab() {
        var F = wireForce(d.motorField / 10, d.motorCurrent, 0.05); // schematic B in "×0.1 T" units
        var torqueSigned = motorTorqueFactor(d.motorCurrent, d.motorField, d.motorAngle, d.motorCurrentDir, d.motorFieldDir);
        var torqueRel = Math.abs(torqueSigned) / (4 * 3);
        var motorDirection = d.motorCurrentDir * d.motorFieldDir > 0 ? 'clockwise' : 'counter-clockwise';
        var mode = ['forces', 'energy', 'particle', 'analyzer'].indexOf(d.motorMode) >= 0 ? d.motorMode : 'forces';
        function chooseMotorMode(nextMode) {
          var patch = { motorMode: nextMode };
          if (mode === 'energy' && nextMode !== 'energy') {
            if (_benchTimer && typeof window !== 'undefined') { window.clearInterval(_benchTimer); _benchTimer = null; }
            patch.benchRunning = false;
            if (d.benchRunning) patch.benchMissionStatus = 'paused';
          }
          if (mode === 'forces' && nextMode !== 'forces') { patch.motorRunning = false; stopMotorSpin(); }
          if (mode === 'particle' && nextMode !== 'particle') {
            _charge3DRunToken++;
            if (_charge3DRAF && typeof window !== 'undefined') window.cancelAnimationFrame(_charge3DRAF);
            _charge3DRAF = null; patch.charge3dRunning = false;
          }
          upd(patch);
          announceToSR((nextMode === 'forces' ? 'Motor forces' : nextMode === 'energy' ? 'Energy systems' : nextMode === 'particle' ? 'Particle beam' : 'Mass analyzer') + ' investigation selected.');
        }
        function motorLandmarkActive(angle) {
          var currentAngle = ((Number(d.motorAngle) || 0) % 360 + 360) % 360;
          var delta = Math.abs(currentAngle - angle);
          return Math.min(delta, 360 - delta) < 0.5;
        }
        function freezeMotorAt(angle, label) {
          stopMotorSpin();
          upd({ motorAngle: angle, motorRunning: false, motorRan: true, motor3dUsed: d.motorView === '3d' ? true : d.motor3dUsed });
          announceToSR(label + ' selected at ' + angle + ' degrees. The motor is paused so you can inspect the force pair.');
        }
        function probeMotorAngle(value) {
          var angle = Math.max(0, Math.min(360, Math.round(Number(value) || 0)));
          stopMotorSpin();
          upd({ motorAngle: angle, motorRunning: false, motorRan: true, motor3dUsed: d.motorView === '3d' ? true : d.motor3dUsed });
        }
        var loadTrial = motorLoadTrialState(d.motorLoadSamples, d.motorLoadPrediction);
        function startMotorLoadSweep() {
          stopMotorSpin();
          upd({ motorAngle: 90, motorRunning: false, motorRan: true, motorLoadTrialStarted: true, motorLoadSamples: [] });
          announceToSR('Load sweep started at the 90-degree maximum-torque landmark. Keep current and field fixed, then change shaft load and record samples.');
        }
        function recordMotorLoadSample() {
          var load = Math.max(0, Math.min(2, Number(d.motorLoad) || 0));
          var result = motorLoadState(d.motorCurrent, d.motorField, 90, load);
          var samples = Array.isArray(d.motorLoadSamples) ? d.motorLoadSamples.filter(function (sample) { return sample && Math.abs(Number(sample.load) - load) > 1e-6; }) : [];
          samples.push({ load: load, margin: result.margin, stalled: result.stalled });
          samples.sort(function (a, b) { return a.load - b.load; });
          upd({ motorAngle: 90, motorRunning: false, motorRan: true, motorLoadTrialStarted: true, motorLoadSamples: samples });
          announceToSR((result.stalled ? 'Stall' : 'Running') + ' sample recorded at ' + load.toFixed(2) + ' relative load.');
        }
        function motorLoadThresholdCard() {
          var summary = !d.motorLoadTrialStarted ? 'Start the sweep, predict the boundary, then record one passing and one stalled sample.' :
            loadTrial.count === 0 ? 'Prediction saved. Change the shaft load, then record a peak-torque sample.' :
            loadTrial.bracketed ? 'Observed boundary ≈ ' + loadTrial.observed.toFixed(2) + 'x, between ' + loadTrial.passingMax.toFixed(2) + 'x running and ' + loadTrial.stalledMin.toFixed(2) + 'x stalled. Prediction offset: ' + (loadTrial.delta >= 0 ? '+' : '') + loadTrial.delta.toFixed(2) + 'x.' :
            'Record both a passing and a stalled sample to bracket the threshold.';
          return h('section', { role: 'region', 'aria-label': 'Motor load threshold investigation', style: { margin: '1px 0 9px', padding: '8px 0 0', borderTop: '1px solid ' + BORDER } },
            h('div', { style: { color: TEXT, fontSize: 12.5, fontWeight: 800, marginBottom: 3 } }, 'LOAD SWEEP · FIND THE STALL THRESHOLD'),
            h('p', { style: { color: SOFT, fontSize: 11.5, lineHeight: 1.4, margin: '0 0 7px' } }, 'Predict the largest load the motor can carry. Start at peak torque, keep current and field fixed, then sweep the shaft load.'),
            h('div', { role: 'group', 'aria-label': 'Stall threshold controls', style: { display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'end' } },
              h('div', { style: { flex: '1 1 180px', minWidth: 0 } }, slider('Predicted stall load (x)', Math.max(0, Number(d.motorLoadPrediction) || 0), 0, 2, 0.25, function (v) { upd({ motorLoadPrediction: v }); })),
              h('button', { type: 'button', onClick: startMotorLoadSweep, style: btn(d.motorLoadTrialStarted) }, d.motorLoadTrialStarted ? 'Reset load sweep' : 'Start load sweep'),
              h('button', { type: 'button', disabled: !d.motorLoadTrialStarted, onClick: recordMotorLoadSample, style: btn(false) }, 'Record peak-torque sample')),
            h('div', { role: 'status', 'aria-live': 'polite', style: { color: TEXT, fontSize: 11.5, lineHeight: 1.4, margin: '4px 0 5px' } }, summary),
            loadTrial.count ? h('div', { role: 'list', 'aria-label': 'Recorded load sweep samples', style: { display: 'flex', gap: 5, flexWrap: 'wrap' } }, loadTrial.samples.map(function (sample) {
              return h('span', { key: 'load-sample-' + sample.load, role: 'listitem', style: { color: sample.stalled ? '#fb7185' : '#34d399', fontSize: 11, fontWeight: 800, fontVariantNumeric: 'tabular-nums' } }, (sample.stalled ? 'STALL ' : 'PASS ') + sample.load.toFixed(2) + 'x');
            })) : null);
        }
        var modeSwitch = h('div', { role: 'group', 'aria-label': 'Motor investigation', style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 } },
          h('button', { 'aria-pressed': mode === 'forces' ? 'true' : 'false', onClick: function () { chooseMotorMode('forces'); }, style: btn(mode === 'forces') }, 'Motor forces'),
          h('button', { 'aria-pressed': mode === 'energy' ? 'true' : 'false', onClick: function () { chooseMotorMode('energy'); }, style: btn(mode === 'energy') }, 'Energy systems'),
          h('button', { 'aria-pressed': mode === 'particle' ? 'true' : 'false', onClick: function () { chooseMotorMode('particle'); }, style: btn(mode === 'particle') }, 'Particle beam'),
          h('button', { 'aria-pressed': mode === 'analyzer' ? 'true' : 'false', onClick: function () { chooseMotorMode('analyzer'); }, style: btn(mode === 'analyzer') }, 'Mass analyzer'));
        return h('div', null,
          modeSwitch,
          mode === 'forces' ? card('How a motor spins', h('div', null,
            h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } }, 'Current in the loop sits inside a magnet’s field. Each side feels a force ', h('b', null, 'F = B·I·L'), ' — one side pushed up, the other down. That twist is torque. A ', h('b', null, 'commutator'), ' flips the current every half turn so the push never reverses.'),
            h('div', { role: 'group', 'aria-label': 'Motor force model view', style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 9 } },
              h('button', { 'aria-pressed': d.motorView !== '3d' ? 'true' : 'false', onClick: function () { upd({ motorView: '2d' }); announceToSR('Two-dimensional motor force model selected.'); }, style: btn(d.motorView !== '3d') }, '2D force diagram'),
              h('button', { 'aria-pressed': d.motorView === '3d' ? 'true' : 'false', onClick: function () { upd({ motorView: '3d', motor3dStatus: 'loading', motor3dUsed: true }); announceToSR('Three-dimensional motor torque lab selected.'); }, style: btn(d.motorView === '3d') }, '3D torque lab')),
            d.motorView === '3d' ? motor3DPanel() : h('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 6 } }, motorSVG()),
            motorTorqueGraph(),
            motorTelemetryHUD(),
            forceVectorLabCard(),
            powerBridgeCard(),
            slider('Current (I)', d.motorCurrent, 0, 6, 1, function (v) { upd({ motorCurrent: v }); }),
            slider('Magnet strength (B)', d.motorField, 1, 8, 1, function (v) { upd({ motorField: v }); }),
            slider('Shaft load (relative torque ×)', Math.max(0, Number(d.motorLoad) || 0), 0, 2, 0.25, function (v) { upd({ motorLoad: v }); }),
            h('div', { style: { color: SOFT, fontSize: 11.5, lineHeight: 1.35, margin: '-5px 0 8px' } }, 'Raise the load until the margin reaches 0× to find the stall boundary.'),
            motorLoadThresholdCard(),
            h('div', { style: { display: 'flex', gap: 7, flexWrap: 'wrap', margin: '-2px 0 9px' } },
              h('button', { 'aria-pressed': d.motorCurrentDir < 0 ? 'true' : 'false', onClick: function () {
                upd({ motorCurrentDir: -d.motorCurrentDir, motorDirectionSeen: true });
                announceToSR('Motor supply current reversed. Rotation direction reversed.');
              }, style: btn(d.motorCurrentDir < 0) }, '↕ Reverse current'),
              h('button', { 'aria-pressed': d.motorFieldDir < 0 ? 'true' : 'false', onClick: function () {
                upd({ motorFieldDir: -d.motorFieldDir, motorDirectionSeen: true });
                announceToSR('Motor magnetic field reversed. Rotation direction reversed.');
              }, style: btn(d.motorFieldDir < 0) }, '🧲 Flip field')),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', margin: '6px 0' } },
              h('button', { 'aria-pressed': d.motorRunning ? 'true' : 'false', onClick: function () {
                  var running = !d.motorRunning;
                  if (running && _prefersReducedMotion) {
                    upd({ motorRunning: false, motorRan: true });
                    announceToSR('Reduced motion is on. Use Step by hand to move the motor.');
                    return;
                  }
                  if (running) {
                    _motorSpinConfig.running = true;
                    _motorSpinConfig.angle = Number(d.motorAngle) || 0;
                    upd({ motorRunning: true, motorRan: true });
                    announceToSR('Motor running');
                  } else {
                    stopMotorSpin();
                    upd({ motorRunning: false, motorRan: true });
                    announceToSR('Motor stopped');
                  }
                }, style: btn(d.motorRunning) }, d.motorRunning ? '⏹ Stop' : '▶ Run motor'),
              h('button', { onClick: function () { var md = d.motorCurrentDir * d.motorFieldDir > 0 ? 1 : -1; upd({ motorAngle: (d.motorAngle + md * 30 + 360) % 360, motorRan: true }); }, style: btn() }, '↻ Step by hand')),
            h('div', { role: 'group', 'aria-label': 'Motor torque landmarks', style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', margin: '2px 0 8px' } },
              h('span', { style: { color: SOFT, fontSize: 11.5, fontWeight: 700 } }, 'Freeze at:'),
              h('button', { 'aria-pressed': motorLandmarkActive(0) ? 'true' : 'false', onClick: function () { freezeMotorAt(0, 'Dead spot'); }, style: btn(motorLandmarkActive(0)) }, '0° · dead spot'),
              h('button', { 'aria-pressed': motorLandmarkActive(90) ? 'true' : 'false', onClick: function () { freezeMotorAt(90, 'Maximum torque'); }, style: btn(motorLandmarkActive(90)) }, '90° · maximum torque'),
              h('button', { 'aria-pressed': motorLandmarkActive(180) ? 'true' : 'false', onClick: function () { freezeMotorAt(180, 'Commutator flip'); }, style: btn(motorLandmarkActive(180)) }, '180° · commutator flip'),
              h('button', { 'aria-pressed': motorLandmarkActive(270) ? 'true' : 'false', onClick: function () { freezeMotorAt(270, 'Maximum torque'); }, style: btn(motorLandmarkActive(270)) }, '270° · maximum torque')),
            h('div', { role: 'group', 'aria-label': 'Motor angle probe', style: { margin: '0 0 2px' } },
              slider('Rotor angle (°)', Math.round(Number(d.motorAngle) || 0), 0, 360, 5, probeMotorAngle),
              h('div', { style: { color: SOFT, fontSize: 11.5, lineHeight: 1.35, margin: '-5px 0 9px' } }, 'Scrub the angle to watch torque leverage rise and fall. 0° and 360° are the same physical position.')),
            h('div', { className: 'mag-observe', role: 'status', 'aria-live': 'polite' },
              h('span', { 'aria-hidden': 'true' }, d.motorRunning ? 'RUN' : 'PAUSE'),
              h('span', null, h('b', null, d.motorRunning ? 'Torque run active. ' : 'Torque engine paused. '), d.motorRunning ? 'The rotor angle advances from the linked I × B torque model.' : 'Press Run motor to animate the rotor, or Step by hand to inspect one turn.')),
            h('div', { className: 'mag-observe' },
              h('span', { 'aria-hidden': 'true' }, '🔋'),
              h('span', null, h('b', null, 'Follow the energy: '), 'battery → moving charges → opposite magnetic forces → rotation. The commutator changes current direction, not the motor’s direction of rotation.')),
            h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)' } },
              h('div', { style: { color: TEXT, fontSize: 13, fontWeight: 700 } }, 'Force on each active wire side ≈ ' + F.toFixed(3) + ' N · torque ≈ ' + torqueRel.toFixed(2) + '× baseline · ' + motorDirection),
              h('div', { style: { color: SOFT, fontSize: 12, marginTop: 4 } }, 'Torque grows with current, field, and sin θ. ' + (d.motorCurrent === 0 ? 'No current → no force → it will not turn.' : 'Reverse current OR field to reverse rotation; reverse both and the original direction returns.')))
          ), '#38bdf8') : mode === 'energy' ? motorGeneratorBenchCard() : mode === 'particle' ? chargedParticleCard() : massAnalyzerCard(),
          disclosure('The 2D and 3D motor views share the same force and torque state. Rotation speed is a teaching animation rather than a timed mechanical model; the 3D geometry, commutator phase, F = B·I·L force pair, and torque dependence on I, B, and angle are physically linked. The 2D particle distance is schematic. The uniform 3D model preserves r ∝ m·v⊥/B, constant speed, mass-dependent gyro period and pitch from v∥, and handedness reversal with q or B. The magnetic-mirror extension is an adiabatic teaching model: it conserves total speed and magnetic moment as B grows toward the coils, predicts the loss-cone boundary sin²α = Bcenter/Bends, and shows trapping versus escape. Pinning a reference path supports a fair one-variable comparison. The mass analyzer uses ideal uniform crossed fields: only v = E/B passes the selector, then r = mv/(|q|B) separates ions by mass-to-charge ratio. Fringing fields, collisions, detector response, and absolute laboratory units are intentionally omitted.')
        );
      }

      function motorGeneratorBenchSVG(model) {
        var clockwise = d.motorCurrentDir * d.motorFieldDir > 0;
        var usefulWidth = model.inputPower > 0 ? 440 * model.efficiency : 0;
        var lossWidth = model.inputPower > 0 ? 440 - usefulWidth : 0;
        var lampGlow = Math.min(0.9, 0.12 + model.outputPower / 18);
        var shaftOpacity = model.rpm > 1 ? 1 : 0.28;
        var aria = 'Motor generator energy bench. A 12 volt battery supplies ' + model.inputPower.toFixed(1) +
          ' watts. The shared shaft turns at ' + Math.round(model.rpm) + ' RPM. The generator produces ' +
          model.generatedVoltage.toFixed(1) + ' volts and ' + model.outputPower.toFixed(1) +
          ' watts at a ' + Math.round(model.efficiency * 100) + ' percent overall efficiency.';
        return h('svg', { viewBox: '0 0 520 230', width: '100%', style: { maxWidth: 760, display: 'block', margin: '0 auto 10px' }, role: 'img', 'aria-label': aria },
          h('rect', { x: 0, y: 0, width: 520, height: 230, rx: 12, fill: INSTRUMENT }),
          h('text', { x: 260, y: 21, fill: TEXT, fontSize: 12, fontWeight: 800, textAnchor: 'middle' }, 'electrical → magnetic force → shaft rotation → electrical'),

          h('g', null,
            h('rect', { x: 20, y: 73, width: 38, height: 56, rx: 5, fill: 'rgba(251,191,36,.14)', stroke: '#fbbf24', strokeWidth: 2 }),
            h('line', { x1: 32, y1: 68, x2: 46, y2: 68, stroke: '#fbbf24', strokeWidth: 3 }),
            h('line', { x1: 36, y1: 63, x2: 42, y2: 63, stroke: '#fbbf24', strokeWidth: 3 }),
            h('text', { x: 39, y: 102, fill: TEXT, fontSize: 12, fontWeight: 900, textAnchor: 'middle' }, '12 V'),
            h('text', { x: 39, y: 146, fill: SOFT, fontSize: 11, textAnchor: 'middle' }, 'battery')),
          h('line', { x1: 58, y1: 101, x2: 92, y2: 101, stroke: '#fbbf24', strokeWidth: 4, strokeLinecap: 'round' }),
          h('polygon', { points: '98,101 87,95 87,107', fill: '#fbbf24' }),
          h('text', { x: 77, y: 90, fill: SOFT, fontSize: 10, textAnchor: 'middle' }, model.inputPower.toFixed(1) + ' W in'),

          h('g', null,
            h('circle', { cx: 135, cy: 101, r: 38, fill: 'rgba(56,189,248,.10)', stroke: '#38bdf8', strokeWidth: 3 }),
            h('circle', { cx: 135, cy: 101, r: 8, fill: '#0f172a', stroke: '#7dd3fc', strokeWidth: 2 }),
            h('g', { transform: 'rotate(' + d.motorAngle + ' 135 101)' },
              h('line', { x1: 109, y1: 101, x2: 161, y2: 101, stroke: '#fb7185', strokeWidth: 7, strokeLinecap: 'round' }),
              h('circle', { cx: 109, cy: 101, r: 5, fill: '#fbbf24' }),
              h('circle', { cx: 161, cy: 101, r: 5, fill: '#fbbf24' })),
            h('path', { d: clockwise ? 'M 111 65 A 42 42 0 0 1 159 65' : 'M 159 65 A 42 42 0 0 0 111 65', fill: 'none', stroke: '#34d399', strokeWidth: 2.5, strokeLinecap: 'round', opacity: shaftOpacity }),
            h('polygon', { points: clockwise ? '160,65 151,60 153,70' : '110,65 119,60 117,70', fill: '#34d399', opacity: shaftOpacity }),
            h('text', { x: 135, y: 154, fill: SOFT, fontSize: 11, textAnchor: 'middle' }, 'motor')),

          h('line', { x1: 173, y1: 101, x2: 307, y2: 101, stroke: '#34d399', strokeWidth: 10, strokeLinecap: 'round', opacity: shaftOpacity }),
          h('rect', { x: 234, y: 89, width: 20, height: 24, rx: 4, fill: '#064e3b', stroke: '#6ee7b7', strokeWidth: 2, opacity: shaftOpacity }),
          h('line', { x1: 244, y1: 90, x2: 244, y2: 112, stroke: '#a7f3d0', strokeWidth: 2, opacity: shaftOpacity }),
          h('text', { x: 240, y: 78, fill: TEXT, fontSize: 13, fontWeight: 900, textAnchor: 'middle' }, Math.round(model.rpm) + ' RPM'),
          h('text', { x: 240, y: 126, fill: SOFT, fontSize: 10, textAnchor: 'middle' }, 'shared shaft'),

          h('g', null,
            h('circle', { cx: 345, cy: 101, r: 38, fill: 'rgba(245,158,11,.09)', stroke: '#f59e0b', strokeWidth: 3 }),
            h('ellipse', { cx: 345, cy: 101, rx: 24, ry: 10, fill: 'none', stroke: '#fbbf24', strokeWidth: 2.4, transform: 'rotate(' + (-d.motorAngle) + ' 345 101)' }),
            h('ellipse', { cx: 345, cy: 101, rx: 24, ry: 10, fill: 'none', stroke: '#fb7185', strokeWidth: 2.4, transform: 'rotate(' + (60 - d.motorAngle) + ' 345 101)' }),
            h('circle', { cx: 345, cy: 101, r: 7, fill: '#0f172a', stroke: '#fde68a', strokeWidth: 2 }),
            h('text', { x: 345, y: 154, fill: SOFT, fontSize: 11, textAnchor: 'middle' }, 'generator')),
          h('line', { x1: 383, y1: 101, x2: 420, y2: 101, stroke: '#fbbf24', strokeWidth: 4, strokeLinecap: 'round' }),
          h('polygon', { points: '426,101 415,95 415,107', fill: '#fbbf24' }),
          h('text', { x: 405, y: 88, fill: TEXT, fontSize: 11, fontWeight: 800, textAnchor: 'middle' }, model.generatedVoltage.toFixed(1) + ' V'),

          h('g', null,
            h('circle', { cx: 461, cy: 101, r: 25, fill: 'rgba(250,204,21,' + lampGlow.toFixed(2) + ')', stroke: '#fde047', strokeWidth: 2.5 }),
            h('path', { d: 'M 451 98 Q 461 87 471 98 M 452 104 Q 461 115 470 104', fill: 'none', stroke: '#713f12', strokeWidth: 2 }),
            h('line', { x1: 453, y1: 126, x2: 469, y2: 126, stroke: '#fde047', strokeWidth: 3 }),
            h('text', { x: 461, y: 146, fill: SOFT, fontSize: 11, textAnchor: 'middle' }, 'load ' + Math.round(model.loadOhms) + ' Ω')),

          h('text', { x: 40, y: 178, fill: SOFT, fontSize: 11 }, 'Energy ledger · input ' + model.inputPower.toFixed(1) + ' W'),
          h('text', { x: 480, y: 178, fill: TEXT, fontSize: 11, fontWeight: 800, textAnchor: 'end' }, Math.round(model.efficiency * 100) + '% useful'),
          h('rect', { x: 40, y: 188, width: 440, height: 14, rx: 7, fill: model.inputPower > 0 ? 'rgba(251,113,133,.58)' : 'rgba(148,163,184,.18)' }),
          h('rect', { x: 40, y: 188, width: usefulWidth, height: 14, rx: Math.min(7, usefulWidth / 2), fill: '#34d399' }),
          h('line', { x1: 40 + usefulWidth, y1: 186, x2: 40 + usefulWidth, y2: 204, stroke: TEXT, strokeWidth: usefulWidth > 1 && lossWidth > 1 ? 1.5 : 0 }),
          h('text', { x: 40, y: 218, fill: TEXT, fontSize: 10 }, '■ useful output ' + model.outputPower.toFixed(1) + ' W'),
          h('text', { x: 480, y: 218, fill: TEXT, fontSize: 10, textAnchor: 'end' }, '▨ losses ' + model.losses.toFixed(1) + ' W'));
      }

      function benchControlsFrom(state) {
        return {
          current: Number(state.motorCurrent) || 0,
          motorField: Number(state.motorField) || 0,
          loadOhms: state.benchLoadOhms == null ? 40 : Number(state.benchLoadOhms),
          friction: state.benchFriction == null ? 3 : Number(state.benchFriction),
          turns: state.benchTurns == null ? 80 : Number(state.benchTurns),
          generatorField: state.benchField == null ? 4 : Number(state.benchField)
        };
      }

      function missionCompletionPatch(state, trace) {
        var evaluation = evaluateMotorGeneratorMission(trace);
        var last = trace[trace.length - 1] || motorGeneratorTransientStep({ time: 0, omega: 0, temperature: 22 }, benchControlsFrom(state), 0);
        var count = (state.benchTrialCount || 0) + 1;
        var compactTrace = trace.filter(function (sample, index) { return index % 2 === 0 || index === trace.length - 1; }).map(function (sample) {
          return { time: Number(sample.time.toFixed(2)), rpm: Number(sample.rpm.toFixed(2)), generatedVoltage: Number(sample.generatedVoltage.toFixed(3)), outputPower: Number(sample.outputPower.toFixed(3)) };
        });
        var trial = {
          id: count, loadOhms: Number(state.benchLoadOhms) || 40,
          turns: Number(state.benchTurns) || 80, field: Number(state.benchField) || 4,
          current: Number(state.motorCurrent) || 0, motorField: Number(state.motorField) || 0,
          friction: state.benchFriction == null ? 3 : Number(state.benchFriction),
          rpm: evaluation.rpm, voltage: evaluation.voltage, power: evaluation.power,
          temperature: evaluation.maxTemperature, pass: evaluation.pass, trace: compactTrace
        };
        var priorTrials = state.benchTrials || [];
        var compareId = state.benchCompareTrialId;
        if (compareId == null && priorTrials.length) compareId = priorTrials[priorTrials.length - 1].id;
        var trials = priorTrials.concat([trial]);
        if (trials.length > 5) trials = trials.slice(trials.length - 5);
        var evidence = {
          station: 'Motor-generator design mission',
          setup: 'load ' + trial.loadOhms + ' Ω, generator ' + trial.turns + ' turns × field ' + trial.field + ', motor I ' + trial.current + ' × B ' + trial.motorField,
          result: Math.round(trial.rpm) + ' RPM, ' + trial.voltage.toFixed(1) + ' V, ' + trial.power.toFixed(1) + ' W, peak ' + trial.temperature.toFixed(1) + ' °C, ' + (trial.pass ? 'mission passed' : 'revise design'),
          prediction: (state.notebookPrediction || '').trim() || 'No prediction recorded'
        };
        var notebookTrials = (state.notebookTrials || []).concat([evidence]);
        if (notebookTrials.length > 8) notebookTrials = notebookTrials.slice(notebookTrials.length - 8);
        return {
          benchRunning: false, benchTime: last.time, benchOmega: last.omega,
          benchTemperature: last.temperature, benchTrace: trace,
          benchMissionStatus: evaluation.pass ? 'passed' : 'needs-work',
          benchTrials: trials, benchTrialCount: count, benchCompareTrialId: compareId,
          notebookTrials: notebookTrials, notebookUsed: true, benchUsed: true
        };
      }

      function runBenchTimer() {
        if (_benchTimer || typeof window === 'undefined' || typeof window.setInterval !== 'function') return;
        _benchTimer = window.setInterval(function () {
          var shouldStop = false;
          setLabToolData(function (prev) {
            var state = Object.assign({}, MAG_DEFAULTS, (prev && prev.magnetism) || {});
            if (!state.benchRunning || state.tab !== 'motor' || state.motorMode !== 'energy' || state.benchView !== 'mission') {
              shouldStop = true;
              return prev;
            }
            var controls = benchControlsFrom(state);
            var next = motorGeneratorTransientStep({ time: state.benchTime, omega: state.benchOmega, temperature: state.benchTemperature }, controls, 0.1);
            var trace = (state.benchTrace || []).concat([next]);
            var patch = {
              benchTime: next.time, benchOmega: next.omega,
              benchTemperature: next.temperature, benchTrace: trace,
              motorAngle: (state.motorAngle + next.rpm * 0.006 + 360) % 360
            };
            if (next.time >= 10 - 1e-9) {
              shouldStop = true;
              patch = Object.assign(patch, missionCompletionPatch(state, trace));
            }
            return Object.assign({}, prev, { magnetism: Object.assign({}, (prev && prev.magnetism) || {}, patch) });
          });
          if (shouldStop && _benchTimer) { window.clearInterval(_benchTimer); _benchTimer = null; }
        }, 100);
      }

      function startBenchMission() {
        var resume = d.benchMissionStatus === 'paused' && (d.benchTrace || []).length && d.benchTime < 10;
        var controls = benchControlsFrom(d);
        var compareId = d.benchCompareTrialId;
        if (!resume && compareId == null && (d.benchTrials || []).length) compareId = d.benchTrials[d.benchTrials.length - 1].id;
        if (_prefersReducedMotion) {
          var initial = resume ? { time: d.benchTime, omega: d.benchOmega, temperature: d.benchTemperature } : { time: 0, omega: 0, temperature: 22 };
          var remainingTrace = motorGeneratorSimulate(controls, 10, 0.1, initial);
          var completeTrace = resume ? (d.benchTrace || []).concat(remainingTrace.slice(1)) : remainingTrace;
          upd(missionCompletionPatch(d, completeTrace));
          announceToSR('Ten second motor-generator trial completed without animation. Results were recorded.');
          return;
        }
        var trace = resume ? (d.benchTrace || []).slice() : [motorGeneratorTransientStep({ time: 0, omega: 0, temperature: 22 }, controls, 0)];
        var first = trace[trace.length - 1];
        upd({ benchRunning: true, benchTime: first.time, benchOmega: first.omega,
          benchTemperature: first.temperature, benchTrace: trace, benchCompareTrialId: compareId,
          benchMissionStatus: 'running', benchUsed: true });
        runBenchTimer();
        announceToSR(resume ? 'Motor-generator trial resumed.' : 'Ten second motor-generator trial started.');
      }

      function pauseBenchMission() {
        if (_benchTimer && typeof window !== 'undefined') { window.clearInterval(_benchTimer); _benchTimer = null; }
        upd({ benchRunning: false, benchMissionStatus: 'paused' });
        announceToSR('Motor-generator trial paused at ' + d.benchTime.toFixed(1) + ' seconds.');
      }

      function resetBenchMission() {
        if (_benchTimer && typeof window !== 'undefined') { window.clearInterval(_benchTimer); _benchTimer = null; }
        upd({ benchRunning: false, benchTime: 0, benchOmega: 0, benchTemperature: 22,
          benchTrace: [], benchMissionStatus: 'ready' });
        announceToSR('Motor-generator mission reset. Saved comparison trials were kept.');
      }

      function advanceBenchMission() {
        if (d.benchRunning || d.benchTime >= 10) return;
        var controls = benchControlsFrom(d);
        var state = { time: d.benchTime || 0, omega: d.benchOmega || 0, temperature: d.benchTemperature || 22 };
        var trace = (d.benchTrace || []).length ? (d.benchTrace || []).slice() : [motorGeneratorTransientStep(state, controls, 0)];
        for (var i = 0; i < 10 && state.time < 10 - 1e-9; i++) {
          state = motorGeneratorTransientStep(state, controls, Math.min(0.1, 10 - state.time));
          trace.push(state);
        }
        if (state.time >= 10 - 1e-9) {
          upd(missionCompletionPatch(d, trace));
          announceToSR('Trial completed and recorded.');
        } else {
          upd({ benchTime: state.time, benchOmega: state.omega, benchTemperature: state.temperature,
            benchTrace: trace, benchMissionStatus: 'paused', benchUsed: true,
            motorAngle: (d.motorAngle + state.rpm * 0.06 + 360) % 360 });
          announceToSR('Advanced the trial to ' + state.time.toFixed(1) + ' seconds.');
        }
      }

      function motorGeneratorMissionGraph(trace) {
        var controls = benchControlsFrom(d);
        var projected = !trace || !trace.length;
        var samples = projected ? motorGeneratorSimulate(controls, 10, 0.2) : trace;
        var comparisonTrial = (d.benchTrials || []).filter(function (trial) { return trial.id === d.benchCompareTrialId; })[0] || null;
        var comparisonSamples = !projected && comparisonTrial && Array.isArray(comparisonTrial.trace) ? comparisonTrial.trace : [];
        var W = 520, H = 264, left = 56, right = 72, plotW = W - left - right;
        var panels = [
          { key: 'rpm', label: 'shaft speed', unit: 'RPM', color: '#38bdf8', top: 32, height: 54, floor: 700, targetMin: 500 },
          { key: 'generatedVoltage', label: 'generated voltage', unit: 'V', color: '#fbbf24', top: 107, height: 54, floor: 20, targetMin: 14, targetMax: 18 },
          { key: 'outputPower', label: 'useful power', unit: 'W', color: '#34d399', top: 182, height: 54, floor: 8, targetMin: 5 }
        ];
        var kids = [h('rect', { key: 'bg', x: 0, y: 0, width: W, height: H, rx: 12, fill: INSTRUMENT })];
        function xAt(sample) { return left + Math.max(0, Math.min(10, sample.time || 0)) / 10 * plotW; }
        panels.forEach(function (panel, pi) {
          var scaleSamples = samples.concat(comparisonSamples);
          var observedMax = scaleSamples.reduce(function (mx, sample) { return Math.max(mx, Number(sample[panel.key]) || 0); }, 0);
          panel.max = Math.max(panel.floor, observedMax * 1.12);
          function yAt(value) { return panel.top + panel.height - Math.max(0, Math.min(panel.max, value)) / panel.max * panel.height; }
          var bandTop = panel.targetMax == null ? panel.top : yAt(panel.targetMax);
          var bandBottom = yAt(panel.targetMin);
          kids.push(h('rect', { key: 'band' + pi, x: left, y: bandTop, width: plotW, height: Math.max(0, bandBottom - bandTop), fill: 'rgba(52,211,153,.10)' }));
          kids.push(h('line', { key: 'base' + pi, x1: left, y1: panel.top + panel.height, x2: W - right, y2: panel.top + panel.height, stroke: BORDER, strokeWidth: 1 }));
          kids.push(h('line', { key: 'target' + pi, x1: left, y1: bandBottom, x2: W - right, y2: bandBottom, stroke: '#34d399', strokeWidth: 1, strokeDasharray: '4 4' }));
          kids.push(h('text', { key: 'label' + pi, x: left, y: panel.top - 6, fill: TEXT, fontSize: 11, fontWeight: 800 }, panel.label));
          kids.push(h('text', { key: 'zero' + pi, x: left - 7, y: panel.top + panel.height + 4, fill: SOFT, fontSize: 11, textAnchor: 'end' }, '0'));
          kids.push(h('text', { key: 'max' + pi, x: left - 7, y: panel.top + 4, fill: SOFT, fontSize: 11, textAnchor: 'end' }, Math.round(panel.max) + ' ' + panel.unit));
          if (comparisonSamples.length) {
            var comparisonPoints = comparisonSamples.map(function (sample) { return xAt(sample).toFixed(1) + ',' + yAt(Number(sample[panel.key]) || 0).toFixed(1); }).join(' ');
            kids.push(h('polyline', { key: 'comparison' + pi, points: comparisonPoints, fill: 'none', stroke: panel.color, strokeWidth: 2,
              strokeDasharray: '3 4', strokeLinecap: 'round', strokeLinejoin: 'round', opacity: 0.62 }));
          }
          var points = samples.map(function (sample) { return xAt(sample).toFixed(1) + ',' + yAt(Number(sample[panel.key]) || 0).toFixed(1); }).join(' ');
          kids.push(h('polyline', { key: 'line' + pi, points: points, fill: 'none', stroke: panel.color, strokeWidth: 3,
            strokeDasharray: projected ? '6 4' : 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }));
          var end = samples[samples.length - 1] || {};
          var ex = xAt(end), ey = yAt(Number(end[panel.key]) || 0);
          if (pi === 0) kids.push(h('circle', { key: 'mark' + pi, cx: ex, cy: ey, r: 4, fill: INSTRUMENT, stroke: panel.color, strokeWidth: 2 }));
          else if (pi === 1) kids.push(h('rect', { key: 'mark' + pi, x: ex - 4, y: ey - 4, width: 8, height: 8, fill: INSTRUMENT, stroke: panel.color, strokeWidth: 2 }));
          else kids.push(h('polygon', { key: 'mark' + pi, points: ex + ',' + (ey - 5) + ' ' + (ex + 5) + ',' + ey + ' ' + ex + ',' + (ey + 5) + ' ' + (ex - 5) + ',' + ey, fill: INSTRUMENT, stroke: panel.color, strokeWidth: 2 }));
          var formatted = panel.key === 'rpm' ? Math.round(Number(end[panel.key]) || 0) : (Number(end[panel.key]) || 0).toFixed(1);
          kids.push(h('text', { key: 'value' + pi, x: W - right + 8, y: ey + 4, fill: TEXT, fontSize: 11, fontWeight: 800 }, formatted + ' ' + panel.unit));
        });
        [0, 5, 10].forEach(function (tick) {
          var x = left + tick / 10 * plotW;
          kids.push(h('line', { key: 'tick' + tick, x1: x, y1: 238, x2: x, y2: 243, stroke: BORDER, strokeWidth: 1 }));
          kids.push(h('text', { key: 'tickText' + tick, x: x, y: 257, fill: SOFT, fontSize: 11, textAnchor: 'middle' }, tick + ' s'));
        });
        if (comparisonSamples.length) kids.push(h('text', { key: 'comparisonMode', x: left, y: 18, fill: SOFT, fontSize: 11 }, 'trial #' + comparisonTrial.id + ' · dashed'));
        kids.push(h('text', { key: 'mode', x: W - 12, y: 18, fill: SOFT, fontSize: 11, textAnchor: 'end' }, projected ? 'projected response · dashed' : 'current trial · solid'));
        var last = samples[samples.length - 1] || {};
        var aria = (projected ? 'Projected' : 'Measured') + ' ten second motor generator response. Final speed ' + Math.round(last.rpm || 0) + ' RPM, voltage ' + (last.generatedVoltage || 0).toFixed(1) + ' volts, useful power ' + (last.outputPower || 0).toFixed(1) + ' watts.';
        if (comparisonSamples.length) aria += ' Dashed curves compare trial ' + comparisonTrial.id + ' with the solid current trial.';
        return h('svg', { viewBox: '0 0 520 264', width: '100%', style: { maxWidth: 760, display: 'block', margin: '0 auto 10px' }, role: 'img', 'aria-label': aria }, kids);
      }
      function benchControlPanel(loadOhms, friction, turns, field) {
        return h('div', null,
          h('div', { role: 'group', 'aria-label': 'Generator load presets', style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 9 } },
            h('button', { 'aria-pressed': loadOhms === 10 ? 'true' : 'false', onClick: function () { upd({ benchLoadOhms: 10, benchUsed: true }); }, style: btn(loadOhms === 10) }, 'Heavy load · 10 Ω'),
            h('button', { 'aria-pressed': loadOhms === 40 ? 'true' : 'false', onClick: function () { upd({ benchLoadOhms: 40, benchUsed: true }); }, style: btn(loadOhms === 40) }, 'Balanced · 40 Ω'),
            h('button', { 'aria-pressed': loadOhms === 160 ? 'true' : 'false', onClick: function () { upd({ benchLoadOhms: 160, benchUsed: true }); }, style: btn(loadOhms === 160) }, 'Light load · 160 Ω')),
          h('div', { className: 'mag-sim-grid', style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 } },
            h('div', null,
              slider('Generator load (Ω)', loadOhms, 10, 200, 10, function (v) { upd({ benchLoadOhms: v, benchUsed: true }); }),
              slider('Shaft friction', friction, 0, 10, 1, function (v) { upd({ benchFriction: v, benchUsed: true }); })),
            h('div', null,
              slider('Generator turns', turns, 20, 160, 10, function (v) { upd({ benchTurns: v, benchUsed: true }); }),
              slider('Generator field', field, 1, 8, 1, function (v) { upd({ benchField: v, benchUsed: true }); }))));
      }

      function benchTrialsTable(trials) {
        if (!trials.length) return h('p', { style: { color: SOFT, fontSize: 11.5, margin: '8px 0 0' } }, 'No completed trials yet. Each 10-second run is recorded here and in the investigation notebook.');
        var latestChange = trials.length > 1 ? describeMotorGeneratorTrialChange(trials[trials.length - 1], trials[trials.length - 2]) : null;
        var insight = !latestChange ? 'Baseline recorded. Change one variable for a controlled comparison.' :
          latestChange.count === 0 ? 'Repeatability check: no design variables changed.' :
          latestChange.fair ? 'Fair comparison: only ' + latestChange.labels[0] + ' changed.' :
          'Comparison caution: ' + latestChange.count + ' variables changed — ' + latestChange.labels.join(' + ') + '.';
        return h('div', null,
          h('div', { style: { overflowX: 'auto', marginTop: 9 } },
            h('table', { style: { width: '100%', borderCollapse: 'collapse', color: TEXT, fontSize: 11.5 }, 'aria-label': 'Motor-generator mission trial comparison' },
              h('thead', null, h('tr', null,
                ['Trial', 'Load', 'Turns × field', 'RPM', 'Voltage', 'Power', 'Peak temp', 'Result', 'Changed', 'Curve'].map(function (label) {
                  return h('th', { key: label, scope: 'col', style: { textAlign: ['Trial', 'Result', 'Changed', 'Curve'].indexOf(label) >= 0 ? 'left' : 'right', padding: '6px 5px', borderBottom: '1px solid ' + BORDER, whiteSpace: 'nowrap' } }, label);
                }))),
              h('tbody', null, trials.map(function (trial, index) {
                var change = index ? describeMotorGeneratorTrialChange(trial, trials[index - 1]) : null;
                var selected = trial.id === d.benchCompareTrialId;
                return h('tr', { key: trial.id },
                  h('th', { scope: 'row', style: { textAlign: 'left', padding: '6px 5px', borderBottom: '1px solid ' + BORDER } }, '#' + trial.id),
                  h('td', { style: { textAlign: 'right', padding: '6px 5px', borderBottom: '1px solid ' + BORDER, whiteSpace: 'nowrap' } }, trial.loadOhms + ' Ω'),
                  h('td', { style: { textAlign: 'right', padding: '6px 5px', borderBottom: '1px solid ' + BORDER, whiteSpace: 'nowrap' } }, trial.turns + ' × ' + trial.field),
                  h('td', { style: { textAlign: 'right', padding: '6px 5px', borderBottom: '1px solid ' + BORDER } }, Math.round(trial.rpm)),
                  h('td', { style: { textAlign: 'right', padding: '6px 5px', borderBottom: '1px solid ' + BORDER } }, trial.voltage.toFixed(1) + ' V'),
                  h('td', { style: { textAlign: 'right', padding: '6px 5px', borderBottom: '1px solid ' + BORDER } }, trial.power.toFixed(1) + ' W'),
                  h('td', { style: { textAlign: 'right', padding: '6px 5px', borderBottom: '1px solid ' + BORDER } }, trial.temperature.toFixed(1) + ' °C'),
                  h('td', { style: { textAlign: 'left', padding: '6px 5px', borderBottom: '1px solid ' + BORDER, fontWeight: 800 } }, trial.pass ? '✓ Pass' : '↻ Revise'),
                  h('td', { style: { textAlign: 'left', padding: '6px 5px', borderBottom: '1px solid ' + BORDER, whiteSpace: 'nowrap' } }, change ? change.label : 'baseline'),
                  h('td', { style: { textAlign: 'left', padding: '4px 5px', borderBottom: '1px solid ' + BORDER } },
                    h('button', { 'aria-pressed': selected ? 'true' : 'false', onClick: function () {
                      upd({ benchCompareTrialId: selected ? null : trial.id });
                      announceToSR(selected ? 'Trial comparison curve hidden.' : 'Trial ' + trial.id + ' selected as the dashed comparison curve.');
                    }, style: Object.assign({}, btn(selected), { padding: '4px 7px', fontSize: 11, whiteSpace: 'nowrap' }) }, selected ? 'Hide' : 'Compare')));
              })))),
          h('p', { role: 'status', 'aria-live': 'polite', style: { color: latestChange && !latestChange.fair ? '#fbbf24' : SOFT, fontSize: 11.5, margin: '7px 0 0', lineHeight: 1.45 } }, insight));
      }
      function motorGeneratorMissionPanel(loadOhms, friction, turns, field) {
        var trace = d.benchTrace || [];
        var sample = trace.length ? trace[trace.length - 1] : motorGeneratorTransientStep({ time: 0, omega: 0, temperature: 22 }, benchControlsFrom(d), 0);
        var evaluation = trace.length ? evaluateMotorGeneratorMission(trace) : null;
        var status = d.benchMissionStatus || 'ready';
        var checks = evaluation ? evaluation.checks : [false, false, false, true];
        var statusText = status === 'running' ? 'Trial running at ' + d.benchTime.toFixed(1) + ' seconds.' :
          status === 'paused' ? 'Trial paused at ' + d.benchTime.toFixed(1) + ' seconds.' :
          status === 'passed' ? 'Mission passed and recorded.' :
          status === 'needs-work' ? 'Trial recorded. Revise one variable and test again.' :
          'Ready. The dashed curves predict the current design.';
        return h('div', null,
          h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 8px', lineHeight: 1.5 } },
            'Design a system that settles above 500 RPM, generates 14–18 V and at least 5 W, and stays below 65 °C. Each run records evidence automatically.'),
          h('div', { style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 8 }, 'aria-label': 'Mission constraints' },
            ['≥ 500 RPM', '14–18 V', '≥ 5 W useful', '≤ 65 °C'].map(function (label, index) {
              var known = trace.length && (status === 'passed' || status === 'needs-work');
              return h('span', { key: label, style: { color: TEXT, fontSize: 11.5, fontWeight: 700, padding: '5px 8px', border: '1px solid ' + BORDER, borderRadius: 8 } }, known ? (checks[index] ? '✓ ' : '○ ') + label : label);
            })),
          motorGeneratorMissionGraph(trace),
          h('div', { style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 9 } },
            d.benchRunning
              ? h('button', { onClick: pauseBenchMission, style: btn(true) }, 'Pause trial')
              : h('button', { onClick: startBenchMission, disabled: d.benchTime >= 10 && status !== 'paused', style: btn(true) }, status === 'paused' ? 'Resume trial' : 'Run & record 10 s trial'),
            h('button', { onClick: advanceBenchMission, disabled: d.benchRunning || d.benchTime >= 10, style: btn() }, 'Advance 1 s'),
            h('button', { onClick: resetBenchMission, style: btn() }, 'Reset current run')),
          h('div', { className: 'mag-observe', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' },
            h('span', { 'aria-hidden': 'true' }, status === 'passed' ? '✓' : '⚙️'),
            h('span', null, h('b', null, statusText + ' '),
              Math.round(sample.rpm || 0) + ' RPM · ' + (sample.generatedVoltage || 0).toFixed(1) + ' V · ' + (sample.outputPower || 0).toFixed(1) + ' W · ' + (sample.temperature || 22).toFixed(1) + ' °C.')),
          benchControlPanel(loadOhms, friction, turns, field),
          h('div', { style: { color: TEXT, fontSize: 12.5, fontWeight: 800, marginTop: 4 } }, 'Recorded mission evidence'),
          benchTrialsTable(d.benchTrials || []),
          disclosure('This transient model includes motor resistance, back EMF, rotational inertia, generator counter-torque, copper heating, generator loss, friction, and cooling. The parameter values represent a classroom-scale system rather than a particular commercial machine.'));
      }

      function motorGeneratorBenchCard() {
        var loadOhms = d.benchLoadOhms == null ? 40 : d.benchLoadOhms;
        var friction = d.benchFriction == null ? 3 : d.benchFriction;
        var turns = d.benchTurns == null ? 80 : d.benchTurns;
        var field = d.benchField == null ? 4 : d.benchField;
        var model = motorGeneratorBench(d.motorCurrent, d.motorField, loadOhms, friction, turns, field);
        var loadName = loadOhms <= 20 ? 'heavy electrical load' : (loadOhms >= 120 ? 'light electrical load' : 'moderate electrical load');
        var motionNote = model.rpm < 1 ? 'The shaft is stalled: available motor torque cannot overcome the selected drag.' :
          'Lower resistance draws more generator current and pushes back harder on the shared shaft.';
        var missionView = d.benchView === 'mission';
        return card('Coupled motor–generator engineering bench', h('div', null,
          h('div', { role: 'group', 'aria-label': 'Motor-generator investigation mode', style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 } },
            h('button', { 'aria-pressed': !missionView ? 'true' : 'false', onClick: function () {
              if (_benchTimer && typeof window !== 'undefined') { window.clearInterval(_benchTimer); _benchTimer = null; }
              upd({ benchView: 'steady', benchRunning: false, benchMissionStatus: d.benchRunning ? 'paused' : d.benchMissionStatus });
              announceToSR('Steady-state energy explorer selected.');
            }, style: btn(!missionView) }, 'Steady-state explorer'),
            h('button', { 'aria-pressed': missionView ? 'true' : 'false', onClick: function () { upd({ benchView: 'mission', benchUsed: true }); announceToSR('Transient design mission selected.'); }, style: btn(missionView) }, 'Transient design mission')),
          missionView ? motorGeneratorMissionPanel(loadOhms, friction, turns, field) : h('div', null,
            h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } },
              'The motor above drives a generator and load model. Keep motor current and field fixed, then change one load variable to see where the energy goes.'),
            motorGeneratorBenchSVG(model),
            benchControlPanel(loadOhms, friction, turns, field),
            h('div', { className: 'mag-observe', role: 'status', 'aria-live': 'polite' },
              h('span', { 'aria-hidden': 'true' }, '⚙️'),
              h('span', null,
                h('b', null, Math.round(model.rpm) + ' RPM · ' + model.generatedVoltage.toFixed(1) + ' V · ' + model.loadCurrent.toFixed(2) + ' A. '),
                'Input ' + model.inputPower.toFixed(1) + ' W = useful output ' + model.outputPower.toFixed(1) + ' W + losses ' + model.losses.toFixed(1) + ' W. This is a ' + loadName + '. ' + motionNote)),
            h('div', { style: { color: SOFT, fontSize: 12, marginTop: 8, lineHeight: 1.5 } },
              h('b', { style: { color: TEXT } }, 'Engineering challenge: '),
              'Compare 10 Ω with 160 Ω without changing the motor controls. Then open the transient mission to test startup, back EMF, heat, and a constrained design.'))),
        '#34d399');
      }

      function currentCharge3DState() {
        var fieldModel = d.chargeFieldModel === 'mirror' ? 'mirror' : 'uniform';
        var mirrorRatio = Math.max(1.1, Math.min(8, Number(d.chargeMirrorRatio) || 3));
        var trajectory = fieldModel === 'mirror'
          ? chargedParticleMirror(d.chargeSign, d.chargeField, d.chargeSpeed, d.chargeB, d.chargeTilt, 121, d.chargeMass, mirrorRatio)
          : chargedParticleHelix(d.chargeSign, d.chargeField, d.chargeSpeed, d.chargeB, d.chargeTilt, 121, d.chargeMass);
        var current = Object.assign(trajectory, {
          chargeSign: d.chargeSign < 0 ? -1 : 1,
          fieldSign: d.chargeField < 0 ? -1 : 1,
          speed: Math.max(0.1, Number(d.chargeSpeed) || 0),
          field: Math.max(0.1, Number(d.chargeB) || 0),
          mass: Math.max(0.25, Number(d.chargeMass) || 1),
          fieldModel: fieldModel,
          mirrorRatio: mirrorRatio,
          progress: Math.max(0, Math.min(100, Number(d.charge3dProgress) || 0)),
          trail: d.charge3dTrail !== false,
          reference: null,
          comparison: null
        });
        var saved = d.charge3dReference;
        if (saved) {
          var savedModel = saved.fieldModel === 'mirror' ? 'mirror' : 'uniform';
          var savedRatio = Math.max(1.1, Math.min(8, Number(saved.mirrorRatio) || 3));
          var savedTrajectory = savedModel === 'mirror'
            ? chargedParticleMirror(saved.chargeSign, saved.fieldSign, saved.speed, saved.field, saved.tilt, 121, saved.mass, savedRatio)
            : chargedParticleHelix(saved.chargeSign, saved.fieldSign, saved.speed, saved.field, saved.tilt, 121, saved.mass);
          current.reference = Object.assign(savedTrajectory, {
            chargeSign: saved.chargeSign < 0 ? -1 : 1,
            fieldSign: saved.fieldSign < 0 ? -1 : 1,
            speed: Math.max(0.1, Number(saved.speed) || 0),
            field: Math.max(0.1, Number(saved.field) || 0),
            tilt: Math.max(0, Math.min(90, Number(saved.tilt) || 0)),
            mass: Math.max(0.25, Number(saved.mass) || 1),
            fieldModel: savedModel,
            mirrorRatio: savedRatio
          });
          current.comparison = chargedParticleComparison(current, current.reference);
        }
        return current;
      }
      function stopCharge3D(message) {
        _charge3DRunToken++;
        if (_charge3DRAF && typeof window !== 'undefined') window.cancelAnimationFrame(_charge3DRAF);
        _charge3DRAF = null;
        upd({ charge3dRunning: false });
        if (message) announceToSR(message);
      }

      function runCharge3D() {
        if (_prefersReducedMotion || typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
          upd({ charge3dProgress: 100, charge3dRunning: false, charge3dUsed: true, lorentzUsed: true });
          announceToSR('Particle moved to the end of the trajectory without animation.'); return;
        }
        if (_charge3DRAF) return;
        var initialProgress = d.charge3dProgress >= 100 ? 0 : (Number(d.charge3dProgress) || 0);
        var token = ++_charge3DRunToken, started = null;
        upd({ charge3dProgress: initialProgress, charge3dRunning: true, charge3dUsed: true, lorentzUsed: true });
        function frame(timestamp) {
          if (token !== _charge3DRunToken) return;
          var current = (ctx.toolData && ctx.toolData.magnetism) || {};
          if (!current.charge3dRunning || current.tab !== 'motor' || current.motorMode !== 'particle' || current.chargeView !== '3d') { _charge3DRAF = null; return; }
          if (started == null) started = timestamp;
          var progress = Math.min(100, initialProgress + (timestamp - started) / 40);
          upd({ charge3dProgress: progress, charge3dRunning: progress < 100, charge3dUsed: true, lorentzUsed: true });
          if (progress < 100) _charge3DRAF = window.requestAnimationFrame(frame);
          else { _charge3DRAF = null; announceToSR('Particle completed the three-dimensional trajectory.'); }
        }
        _charge3DRAF = window.requestAnimationFrame(frame);
      }

      function initCharge3DCanvas(cv) {
        if (!cv || cv._charge3dInit) return;
        if (!window.StemLab || typeof window.StemLab.ensureThree !== 'function') return;
        cv._charge3dInit = true;
        window.StemLab.ensureThree({ orbit: true, orbitRequired: true, failMessage: 'The 3D particle engine could not load. The complete 2D Lorentz-force diagram remains available.' })
          .then(function (THREE) {
            if (!cv.isConnected) { cv._charge3dInit = false; return; }
            var renderer;
            try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, powerPreference: 'high-performance' }); }
            catch (error) { cv._charge3dInit = false; upd({ charge3dStatus: 'error' }); return; }
            var scene = new THREE.Scene(), backgroundColor = new THREE.Color(0x07111f);
            try { var themeBackground = window.getComputedStyle(cv).getPropertyValue('--allo-stem-instrument').trim(); if (themeBackground) backgroundColor.setStyle(themeBackground); } catch (themeError) {}
            scene.background = backgroundColor; scene.fog = new THREE.FogExp2(backgroundColor.getHex(), 0.028);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6)); if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
            var camera = new THREE.PerspectiveCamera(44, 1, 0.1, 70); camera.position.set(7.8, 5.8, 8.5);
            var controls = new THREE.OrbitControls(camera, cv); controls.enableDamping = false; controls.minDistance = 5; controls.maxDistance = 20; controls.target.set(0, 0, 0);
            scene.add(new THREE.HemisphereLight(0xdbeafe, 0x172554, 1.25));
            var keyLight = new THREE.DirectionalLight(0xffffff, 1.15); keyLight.position.set(5, 8, 6); scene.add(keyLight);
            var particleLight = new THREE.PointLight(0xf43f5e, 1.0, 12); scene.add(particleLight);
            var dynamicGroup = new THREE.Group(); scene.add(dynamicGroup);
            var liveState = cv._charge3dState || currentCharge3DState();
            var resizeObserver = null, disposed = false, liveSignature = '';
            var particleGroup = null, velocityArrow = null, forceArrow = null, trailLine = null, trailGeometry = null, referenceLine = null, particleLightRef = particleLight;
            function disposeObject(obj) { obj.traverse(function (child) { if (child.geometry && child.geometry.dispose) child.geometry.dispose(); if (child.material) (Array.isArray(child.material) ? child.material : [child.material]).forEach(function (material) { if (material && material.dispose) material.dispose(); }); }); }
            function clearDynamic() { while (dynamicGroup.children.length) { var child = dynamicGroup.children[dynamicGroup.children.length - 1]; dynamicGroup.remove(child); disposeObject(child); } particleGroup = null; velocityArrow = null; forceArrow = null; trailLine = null; trailGeometry = null; referenceLine = null; }
            function resize() { var width = Math.max(1, cv.clientWidth || 680), height = Math.max(1, cv.clientHeight || 410); renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); }
            function renderScene() { if (!disposed) { resize(); renderer.render(scene, camera); } }
            function addArrow(parent, origin, direction, color, length, opacity) {
              var arrow = new THREE.ArrowHelper(direction.clone().normalize(), origin, length, color, Math.min(0.25, length * 0.27), Math.min(0.14, length * 0.16));
              arrow.line.material.transparent = true; arrow.line.material.opacity = opacity; arrow.cone.material.transparent = true; arrow.cone.material.opacity = opacity; parent.add(arrow); return arrow;
            }
            function buildScene(state) {
              clearDynamic();
              var chamberEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(6.4, 6.8, 6.4)), new THREE.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.22 })); dynamicGroup.add(chamberEdges);
              if (state.fieldModel === 'mirror') {
                [-2.75, 2.75].forEach(function (coilY) {
                  for (var coilIndex = 0; coilIndex < 3; coilIndex++) {
                    var coil = new THREE.Mesh(new THREE.TorusGeometry(2.15 + coilIndex * 0.13, 0.055, 8, 48), new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0x78350f, emissiveIntensity: 0.28, metalness: 0.55, roughness: 0.35 }));
                    coil.rotation.x = Math.PI / 2; coil.position.y = coilY + (coilIndex - 1) * 0.11; dynamicGroup.add(coil);
                  }
                });
                [-2.7, -1.35, 0, 1.35, 2.7].forEach(function (yy) {
                  var axialFraction = Math.abs(yy) / 2.7;
                  var localRatio = 1 + (state.mirrorRatio - 1) * axialFraction * axialFraction;
                  var aperture = 1.45 - axialFraction * 0.65;
                  [-aperture, 0, aperture].forEach(function (xx) { [-aperture, 0, aperture].forEach(function (zz) {
                    addArrow(dynamicGroup, new THREE.Vector3(xx, yy - state.fieldSign * 0.38, zz), new THREE.Vector3(0, state.fieldSign, 0), 0x38bdf8, 0.76, Math.min(0.9, 0.24 + localRatio * 0.09));
                  }); });
                });
              } else {
                var fieldStart = state.fieldSign > 0 ? -3.05 : 3.05;
                [-1.7, 0, 1.7].forEach(function (xx) { [-1.7, 0, 1.7].forEach(function (zz) {
                  addArrow(dynamicGroup, new THREE.Vector3(xx, fieldStart, zz), new THREE.Vector3(0, state.fieldSign, 0), 0x38bdf8, 6.1, 0.20 + state.field / 16);
                }); });
              }
              var vectors = state.points.map(function (point) { return new THREE.Vector3(point.x, point.y, point.z); });
              var fullGeometry = new THREE.BufferGeometry().setFromPoints(vectors);
              dynamicGroup.add(new THREE.Line(fullGeometry, new THREE.LineBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.25 })));
              if (state.reference) {
                var referenceVectors = state.reference.points.map(function (point) { return new THREE.Vector3(point.x, point.y, point.z); });
                var referenceGeometry = new THREE.BufferGeometry().setFromPoints(referenceVectors);
                referenceLine = new THREE.Line(referenceGeometry, new THREE.LineDashedMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.72, dashSize: 0.18, gapSize: 0.11 }));
                referenceLine.computeLineDistances(); dynamicGroup.add(referenceLine);
              }
              trailGeometry = new THREE.BufferGeometry().setFromPoints(vectors); trailGeometry.setDrawRange(0, 1);
              trailLine = new THREE.Line(trailGeometry, new THREE.LineBasicMaterial({ color: 0xfb7185, transparent: true, opacity: state.trail ? 0.95 : 0 })); dynamicGroup.add(trailLine);
              particleGroup = new THREE.Group(); dynamicGroup.add(particleGroup);
              var sphere = new THREE.Mesh(new THREE.SphereGeometry(0.18, 22, 16), new THREE.MeshStandardMaterial({ color: state.chargeSign > 0 ? 0xfb7185 : 0x38bdf8, emissive: state.chargeSign > 0 ? 0xf43f5e : 0x0284c7, emissiveIntensity: 0.32, roughness: 0.32 })); particleGroup.add(sphere);
              var ringCount = state.chargeSign > 0 ? 1 : 2;
              for (var ringIndex = 0; ringIndex < ringCount; ringIndex++) {
                var ring = new THREE.Mesh(new THREE.TorusGeometry(0.25 + ringIndex * 0.08, 0.025, 7, 24), new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.92 })); ring.rotation.x = Math.PI / 2; particleGroup.add(ring);
              }
              velocityArrow = addArrow(dynamicGroup, new THREE.Vector3(), new THREE.Vector3(1, 0, 0), 0xfbbf24, 0.9, 1);
              forceArrow = addArrow(dynamicGroup, new THREE.Vector3(), new THREE.Vector3(0, 0, 1), 0x34d399, 0.75, 1);
            }
            function updateParticle(state) {
              var index = Math.max(0, Math.min(state.points.length - 1, Math.round(state.progress / 100 * (state.points.length - 1))));
              var point = state.points[index], previous = state.points[Math.max(0, index - 1)], next = state.points[Math.min(state.points.length - 1, index + 1)];
              var position = new THREE.Vector3(point.x, point.y, point.z);
              var velocity = new THREE.Vector3(next.x - previous.x, next.y - previous.y, next.z - previous.z);
              if (velocity.lengthSq() < 1e-9) velocity.set(0, 1, 0); else velocity.normalize();
              var magneticField = new THREE.Vector3(0, state.fieldSign, 0);
              var force = velocity.clone().cross(magneticField).multiplyScalar(state.chargeSign);
              particleGroup.position.copy(position); particleLightRef.position.copy(position);
              velocityArrow.position.copy(position); velocityArrow.setDirection(velocity); velocityArrow.setLength(0.75 + state.speed * 0.05, 0.22, 0.12);
              forceArrow.position.copy(position);
              if (force.lengthSq() < 1e-8) forceArrow.visible = false;
              else { forceArrow.visible = true; forceArrow.setDirection(force.normalize()); forceArrow.setLength(0.55 + Math.min(1.0, state.force * 0.035), 0.22, 0.12); }
              if (trailGeometry) trailGeometry.setDrawRange(0, state.trail ? index + 1 : 0);
            }
            function rebuild(state) {
              if (disposed) return;
              liveState = Object.assign({}, state, { points: state.points.map(function (point) { return Object.assign({}, point); }) });
              var referenceSignature = state.reference ? [state.reference.fieldModel, state.reference.chargeSign, state.reference.fieldSign, state.reference.speed, state.reference.field, state.reference.tilt, state.reference.mass, state.reference.mirrorRatio].join(':') : 'none';
              var signature = [state.fieldModel, state.chargeSign, state.fieldSign, state.speed, state.field, state.tilt, state.mass, state.mirrorRatio, state.trail, referenceSignature].join('|');
              if (signature !== liveSignature) { liveSignature = signature; buildScene(liveState); }
              updateParticle(liveState); renderScene();
            }
            function setView(view) {
              if (view === 'field') camera.position.set(0.01, 10.5, 0.01);
              else if (view === 'side') camera.position.set(9.5, 1.3, 0.01);
              else if (view === 'end') camera.position.set(0.01, 1.0, 10);
              else camera.position.set(7.8, 5.8, 8.5);
              controls.target.set(0, 0, 0); camera.lookAt(controls.target); controls.update(); renderScene();
            }
            function onContextLost(event) { event.preventDefault(); stopCharge3D(); upd({ charge3dStatus: 'error' }); announceToSR('The 3D particle graphics context was lost. The 2D Lorentz-force diagram remains available.'); }
            function cleanup() {
              if (disposed) return; disposed = true;
              cv.removeEventListener('webglcontextlost', onContextLost); controls.removeEventListener('change', renderScene); window.removeEventListener('resize', renderScene); controls.dispose(); if (resizeObserver) resizeObserver.disconnect();
              clearDynamic(); renderer.dispose(); cv._charge3dInit = false; cv._charge3dUpdate = null; cv._charge3dCleanup = null;
            }
            cv.addEventListener('webglcontextlost', onContextLost); controls.addEventListener('change', renderScene);
            if (typeof ResizeObserver !== 'undefined') { resizeObserver = new ResizeObserver(renderScene); resizeObserver.observe(cv); } else window.addEventListener('resize', renderScene, { passive: true });
            cv._charge3dUpdate = rebuild; cv._charge3dSetView = setView; cv._charge3dCleanup = cleanup; rebuild(liveState); upd({ charge3dStatus: 'ready', charge3dUsed: true });
          }).catch(function () { cv._charge3dInit = false; if (cv.isConnected) { stopCharge3D(); upd({ charge3dStatus: 'error' }); announceToSR('The 3D particle engine could not load. Use the complete 2D Lorentz-force diagram or retry.'); } });
      }

      function charge3DCanvasRef(cv) {
        if (!cv) { var oldCanvas = _charge3DCanvas; window.setTimeout(function () { if (oldCanvas && !oldCanvas.isConnected && typeof oldCanvas._charge3dCleanup === 'function') oldCanvas._charge3dCleanup(); }, 0); return; }
        _charge3DCanvas = cv; cv._charge3dState = currentCharge3DState();
        if (typeof cv._charge3dUpdate === 'function') cv._charge3dUpdate(cv._charge3dState); else initCharge3DCanvas(cv);
      }

      function chargedParticle3DPanel() {
        var state = currentCharge3DState();
        var isMirror = state.fieldModel === 'mirror';
        var pathWords = isMirror ? (state.trapped ? 'trapped between the two magnetic mirrors' : 'passing through the mirror field and escaping') : state.motionType === 'straight' ? 'straight along the field axis' : state.motionType === 'circular' ? 'a circle with no axial drift' : 'a helix along the field axis';
        var turnWords = state.handedness > 0 ? 'initially toward positive z' : 'initially toward negative z';
        var comparisonText = '';
        if (state.reference && state.comparison) {
          var comparison = state.comparison;
          var comparisonNames = { fieldModel: 'magnetic environment', chargeSign: 'charge sign', fieldSign: 'field direction', speed: 'speed', field: 'field strength', tilt: 'pitch angle', mass: 'mass', mirrorRatio: 'mirror ratio' };
          var changeWords = comparison.count ? comparison.keys.map(function (key) { return comparisonNames[key] || key; }).join(', ') : 'no variables';
          var radiusWords = comparison.radiusRatio == null ? 'center radius changed from ' + state.reference.radius.toFixed(2) + ' to ' + state.radius.toFixed(2) : 'center radius is ' + comparison.radiusRatio.toFixed(2) + '× the reference';
          var pitchWords = comparison.pitchRatio == null ? 'center-field pitch changed from ' + state.reference.pitch.toFixed(2) + ' to ' + state.pitch.toFixed(2) : 'center-field pitch is ' + comparison.pitchRatio.toFixed(2) + '× the reference';
          comparisonText = (comparison.count === 0 ? 'Current controls match the pinned reference. ' : comparison.fair ? 'Fair comparison: only ' + changeWords + ' changed. ' : 'Confounded comparison: ' + changeWords + ' changed. ') + radiusWords + '; ' + pitchWords + '. ' + (comparison.handednessChanged ? 'The helix handedness reversed.' : 'Helix handedness stayed the same.');
        }
        function cameraButton(id, label) { return h('button', { key: id, onClick: function () { if (_charge3DCanvas && typeof _charge3DCanvas._charge3dSetView === 'function') _charge3DCanvas._charge3dSetView(id); announceToSR(label + ' particle view selected.'); }, style: btn() }, label); }
        function pinReference() {
          stopCharge3D();
          upd({ charge3dReference: { fieldModel: state.fieldModel, mirrorRatio: state.mirrorRatio, chargeSign: state.chargeSign, fieldSign: state.fieldSign, speed: state.speed, field: state.field, tilt: state.tilt, mass: state.mass }, charge3dUsed: true, lorentzUsed: true });
          announceToSR('Current particle path pinned as the dashed comparison reference. Change one variable for a fair test.');
        }
        var mirrorEvidence = isMirror ? (state.trapped ? 'Trapped orbit. Pitch angle ' + state.tilt.toFixed(0) + '° is above the ' + state.criticalAngle.toFixed(1) + '° loss-cone boundary, so the growing end fields convert parallel motion into perpendicular motion and reflect the particle near y = ±' + state.turningPosition.toFixed(2) + '.' : 'Passing orbit. Pitch angle ' + state.tilt.toFixed(0) + '° is below the ' + state.criticalAngle.toFixed(1) + '° loss-cone boundary, so the particle reaches an end before its parallel velocity falls to zero.') : '';
        return h('div', null,
          sceneViewport(h('canvas', { key: 'charge3d-' + (d.charge3dAttempt || 0), ref: charge3DCanvasRef, className: 'mag-charge3d', role: 'img',
            'aria-label': 'Interactive three-dimensional charged-particle trajectory with magnetic-field arrows, optional magnetic-mirror coils, traveled path, optional dashed reference trajectory, particle marker, velocity vector, and Lorentz-force vector.',
            'aria-describedby': 'mag-charge3d-status mag-charge3d-summary',
            style: { display: 'block', width: '100%', borderRadius: 10, border: '1px solid ' + BORDER, background: INSTRUMENT, touchAction: 'none' } }), [
              { label: 'Path', value: isMirror ? state.confinement : state.motionType, tone: '#fb7185' },
              { label: 'Gyro radius', value: state.radius.toFixed(2), tone: '#38bdf8' },
              { label: isMirror ? 'Critical angle' : 'Pitch / turn', value: isMirror ? state.criticalAngle.toFixed(1) + '°' : state.pitch.toFixed(2), tone: '#a78bfa' }
            ], 'B axis · y'),
          h('div', { id: 'mag-charge3d-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { color: d.charge3dStatus === 'error' ? '#fbbf24' : SOFT, fontSize: 11.5, lineHeight: 1.45, margin: '7px 0' } },
            d.charge3dStatus === 'ready' ? (isMirror ? 'Mirror scene ready. Drag to orbit, then test whether the particle is trapped or escapes.' : 'Scene ready. Drag to orbit, run the particle, scrub its position, or pin a path for comparison.') :
            d.charge3dStatus === 'error' ? h('span', null, '3D graphics did not load. The complete 2D Lorentz-force diagram remains available. ', h('button', { onClick: function () { upd({ charge3dStatus: 'loading', charge3dAttempt: (d.charge3dAttempt || 0) + 1 }); }, style: btn() }, 'Retry 3D')) : 'Loading the 3D particle engine...'),
          h('div', { 'aria-label': '3D vector key', style: { display: 'flex', gap: 10, flexWrap: 'wrap', color: SOFT, fontSize: 11.5, marginBottom: 8 } },
            h('span', null, 'B ↑ blue field arrows'), isMirror ? h('span', null, 'three-ring copper mirror coils') : null, h('span', null, 'v → gold velocity arrow'), h('span', null, 'F → green force arrow'), h('span', null, 'solid pink current path'), state.reference ? h('span', null, 'dashed pale reference path') : null, h('span', null, (state.chargeSign > 0 ? '+ one-ring' : '− two-ring') + ' particle marker')),
          sceneTextAlternative('mag-charge3d-summary', 'A ' + (state.chargeSign > 0 ? 'positive' : 'negative') + ' particle of relative mass ' + state.mass.toFixed(1) + ' moves in the ' + (isMirror ? 'non-uniform field of two magnetic mirror coils with end-to-center field ratio ' + state.mirrorRatio.toFixed(1) : 'uniform magnetic field') + ' along ' + (state.fieldSign > 0 ? 'positive y' : 'negative y') + '. Its velocity is tilted ' + state.tilt + ' degrees from the field axis, with parallel component ' + state.parallelSpeed.toFixed(2) + ' and perpendicular component ' + state.perpendicularSpeed.toFixed(2) + '. The path is ' + pathWords + ', center-field radius ' + state.radius.toFixed(2) + ', and center-field pitch per turn ' + state.pitch.toFixed(2) + '. ' + (isMirror ? mirrorEvidence : 'The magnetic force magnitude is proportional to ' + state.force.toFixed(2) + ' and the path curves ' + turnWords + '. Magnetic force stays perpendicular to velocity, so speed remains constant. ') + comparisonText),
          h('div', { role: 'group', 'aria-label': '3D particle camera and path controls', style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 9 } },
            cameraButton('perspective', 'Perspective'), cameraButton('field', 'Along field'), cameraButton('side', 'Side'), cameraButton('end', 'End'),
            h('button', { 'aria-pressed': state.trail ? 'true' : 'false', onClick: function () { upd({ charge3dTrail: !state.trail, charge3dUsed: true }); }, style: btn(state.trail) }, 'Traveled path: ' + (state.trail ? 'on' : 'off'))),
          h('div', { role: 'group', 'aria-label': 'Particle path comparison', style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 8 } },
            h('button', { onClick: pinReference, style: btn(!!state.reference) }, state.reference ? 'Replace pinned path' : 'Pin path for comparison'),
            state.reference ? h('button', { onClick: function () { upd({ charge3dReference: null, charge3dUsed: true }); announceToSR('Pinned particle path cleared.'); }, style: btn() }, 'Clear comparison') : null),
          h('div', { style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 8 } },
            d.charge3dRunning ? h('button', { onClick: function () { stopCharge3D('Particle animation paused.'); }, style: btn(true) }, 'Pause particle') : h('button', { onClick: runCharge3D, style: btn(true) }, d.charge3dProgress > 0 && d.charge3dProgress < 100 ? 'Resume particle' : 'Run particle'),
            h('button', { onClick: function () { stopCharge3D(); upd({ charge3dProgress: 0, charge3dUsed: true }); announceToSR('Particle returned to the start of the path.'); }, style: btn() }, 'Reset particle')),
          slider('Particle position (%)', Math.round(state.progress), 0, 100, 1, function (v) { stopCharge3D(); upd({ charge3dProgress: v, charge3dUsed: true, lorentzUsed: true }); }),
          h('div', { className: 'mag-observe', role: 'status', 'aria-live': 'polite' },
            h('span', { 'aria-hidden': 'true' }, state.reference ? '⇄' : isMirror ? (state.trapped ? '↕' : '↗') : state.motionType === 'helical' ? '↟' : state.motionType === 'circular' ? '○' : '↑'),
            h('span', null, h('b', null, state.reference ? 'Pinned-path evidence. ' : isMirror ? (state.trapped ? 'Magnetically trapped. ' : 'Inside the loss cone. ') : state.motionType.charAt(0).toUpperCase() + state.motionType.slice(1) + ' motion. '),
              state.reference ? comparisonText : isMirror ? mirrorEvidence : 'Only v⊥ bends: radius ∝ m·v⊥/B. The unchanged v∥ component carries the particle along the field axis, while mass and field set the gyro period and helix pitch.')));
      }
      function massAnalyzerCard() {
        var speciesKey = ANALYZER_SPECIES[d.analyzerSpecies] ? d.analyzerSpecies : 'deuteron';
        var species = ANALYZER_SPECIES[speciesKey];
        var state = velocitySelectorState(d.analyzerE, d.analyzerSelectorB, d.analyzerSpeed, d.analyzerB, species.mass, species.charge);
        var selectedSpeedText = state.selectedSpeed.toFixed(2);
        var forceScale = Math.max(state.electricForce, state.magneticForce, 1);
        var electricLength = 12 + 34 * state.electricForce / forceScale;
        var magneticLength = 12 + 34 * state.magneticForce / forceScale;
        var deflection = Math.max(-62, Math.min(62, state.netUpwardForce * 28 / Math.max(1, state.selectorField)));
        var impactY = 150 - deflection;
        var selectorPath = !state.moving ? 'M35 150 L35 150' : state.passes ? 'M35 150 L300 150' : 'M35 150 Q175 150 296 ' + impactY.toFixed(1);
        var markerGroups = [];
        for (var sx = 88; sx <= 270; sx += 36) {
          [104, 196].forEach(function (sy) {
            markerGroups.push(h('g', { key: 'selector-b-' + sx + '-' + sy, stroke: 'rgba(125,211,252,.55)', strokeWidth: 1.5 },
              h('line', { x1: sx - 4, y1: sy - 4, x2: sx + 4, y2: sy + 4 }),
              h('line', { x1: sx + 4, y1: sy - 4, x2: sx - 4, y2: sy + 4 })));
          });
        }
        var analyzerMarkers = [];
        for (var ax = 334; ax <= 566; ax += 38) {
          for (var ay = 68; ay <= 236; ay += 42) {
            analyzerMarkers.push(h('g', { key: 'analyzer-b-' + ax + '-' + ay, stroke: 'rgba(167,139,250,.38)', strokeWidth: 1.35 },
              h('line', { x1: ax - 4, y1: ay - 4, x2: ax + 4, y2: ay + 4 }),
              h('line', { x1: ax + 4, y1: ay - 4, x2: ax - 4, y2: ay + 4 })));
          }
        }
        function analyzerArc(key, item, selected) {
          var arcState = velocitySelectorState(d.analyzerE, d.analyzerSelectorB, d.analyzerSpeed, d.analyzerB, item.mass, item.charge);
          var radius = Math.max(38, Math.min(215, 38 + arcState.analyzerRadius * 19));
          var endX = 300 + radius;
          var endY = 150 - radius;
          return h('path', { key: 'arc-' + key, d: 'M300 150 A' + radius.toFixed(1) + ' ' + radius.toFixed(1) + ' 0 0 0 ' + endX.toFixed(1) + ' ' + endY.toFixed(1),
            fill: 'none', stroke: item.color, strokeWidth: selected ? 4.5 : 2.4, strokeDasharray: selected ? 'none' : item.dash,
            strokeLinecap: 'round', opacity: selected ? 1 : 0.7 });
        }
        var arcs = [];
        if (state.passes) {
          if (d.analyzerShowAll) Object.keys(ANALYZER_SPECIES).forEach(function (key) {
            if (key !== speciesKey) arcs.push(analyzerArc(key, ANALYZER_SPECIES[key], false));
          });
          arcs.push(analyzerArc(speciesKey, species, true));
        }
        var statusText = !state.moving ? 'NO BEAM — speed is zero' : state.passes ? 'PASS — forces cancel at the slit' : 'BLOCKED — beam misses the slit';
        var balanceText = state.magneticForce > state.electricForce ? 'magnetic force is larger' : state.magneticForce < state.electricForce ? 'electric force is larger' : 'electric and magnetic forces balance';
        var overlap = speciesKey === 'deuteron' || speciesKey === 'helium';
        var aria = 'Velocity selector and mass analyzer. ' + species.name + ' beam at speed ' + state.beamSpeed.toFixed(1) + '. Selected speed E divided by B is ' + selectedSpeedText + '. The beam is ' + (!state.moving ? 'stationary' : state.passes ? 'transmitted' : 'blocked') + '. Mass-to-charge ratio ' + state.massToCharge.toFixed(2) + ' and analyzer radius ' + state.analyzerRadius.toFixed(2) + ' relative units.';
        return card('Velocity selector + mass analyzer', h('div', null,
          h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } },
            'Crossed fields admit one speed: ', h('b', null, 'v = E/B'), '. In the analyzer, magnetic curvature follows ', h('b', null, 'r = mv/(|q|B)'), ', so the landing path reveals mass-to-charge ratio rather than mass alone.'),
          h('svg', { viewBox: '0 0 600 300', width: '100%', style: { maxWidth: 760, display: 'block', margin: '0 auto 10px' }, role: 'img', 'aria-label': aria },
            h('rect', { x: 0, y: 0, width: 600, height: 300, rx: 12, fill: INSTRUMENT }),
            h('rect', { x: 55, y: 58, width: 240, height: 190, rx: 10, fill: 'rgba(56,189,248,.045)', stroke: BORDER }),
            h('rect', { x: 312, y: 42, width: 276, height: 216, rx: 10, fill: 'rgba(167,139,250,.045)', stroke: BORDER }),
            h('text', { x: 175, y: 25, fill: TEXT, fontSize: 12, fontWeight: 800, textAnchor: 'middle' }, '1 · VELOCITY SELECTOR'),
            h('text', { x: 450, y: 25, fill: TEXT, fontSize: 12, fontWeight: 800, textAnchor: 'middle' }, '2 · MASS ANALYZER'),
            h('rect', { x: 65, y: 70, width: 220, height: 10, rx: 4, fill: '#f43f5e' }),
            h('rect', { x: 65, y: 220, width: 220, height: 10, rx: 4, fill: '#38bdf8' }),
            h('text', { x: 78, y: 67, fill: '#fda4af', fontSize: 13, fontWeight: 800 }, '+ + +'),
            h('text', { x: 78, y: 246, fill: '#7dd3fc', fontSize: 13, fontWeight: 800 }, '− − −'),
            markerGroups,
            analyzerMarkers,
            h('text', { x: 175, y: 94, fill: '#7dd3fc', fontSize: 11, textAnchor: 'middle' }, '⊗ Bselector into screen'),
            h('text', { x: 450, y: 55, fill: '#c4b5fd', fontSize: 11, textAnchor: 'middle' }, '⊗ Banalyzer into screen'),
            h('rect', { x: 294, y: 44, width: 12, height: 96, fill: '#64748b' }),
            h('rect', { x: 294, y: 160, width: 12, height: 98, fill: '#64748b' }),
            h('text', { x: 300, y: 276, fill: SOFT, fontSize: 11, textAnchor: 'middle' }, 'slit'),
            h('path', { d: selectorPath, fill: 'none', stroke: species.color, strokeWidth: 4.5, strokeLinecap: 'round' }),
            arcs,
            h('circle', { cx: 35, cy: 150, r: 10, fill: species.color, stroke: '#fff', strokeWidth: 1.5 }),
            h('text', { x: 35, y: 154, fill: INSTRUMENT, fontSize: 9, fontWeight: 900, textAnchor: 'middle' }, species.symbol),
            h('line', { x1: 152, y1: 150, x2: 152, y2: 150 + electricLength, stroke: '#f43f5e', strokeWidth: 2.5 }),
            h('polygon', { points: '152,' + (156 + electricLength) + ' 146,' + (146 + electricLength) + ' 158,' + (146 + electricLength), fill: '#f43f5e' }),
            h('text', { x: 160, y: 165 + electricLength, fill: '#fda4af', fontSize: 11 }, 'FE'),
            h('line', { x1: 198, y1: 150, x2: 198, y2: 150 - magneticLength, stroke: '#34d399', strokeWidth: 2.5 }),
            h('polygon', { points: '198,' + (144 - magneticLength) + ' 192,' + (154 - magneticLength) + ' 204,' + (154 - magneticLength), fill: '#34d399' }),
            h('text', { x: 207, y: 144 - magneticLength, fill: '#6ee7b7', fontSize: 11 }, 'FB'),
            h('text', { x: 175, y: 285, fill: SOFT, fontSize: 11, textAnchor: 'middle' }, balanceText),
            h('rect', { x: 338, y: 266, width: 224, height: 22, rx: 11, fill: state.passes ? 'rgba(52,211,153,.16)' : state.moving ? 'rgba(244,63,94,.17)' : 'rgba(251,191,36,.15)', stroke: state.passes ? '#34d399' : state.moving ? '#f43f5e' : '#fbbf24' }),
            h('text', { x: 450, y: 281, fill: TEXT, fontSize: 11, fontWeight: 800, textAnchor: 'middle' }, statusText)),
          h('div', { className: 'mag-sim-grid', style: { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, margin: '0 0 9px' } },
            h('div', { style: { padding: 9, border: '1px solid ' + BORDER, borderRadius: 9, textAlign: 'center' } }, h('div', { style: { color: SOFT, fontSize: 11 } }, 'Selected speed · E/B'), h('div', { style: { color: TEXT, fontSize: 16, fontWeight: 800 } }, selectedSpeedText)),
            h('div', { style: { padding: 9, border: '1px solid ' + BORDER, borderRadius: 9, textAlign: 'center' } }, h('div', { style: { color: SOFT, fontSize: 11 } }, 'Selector result'), h('div', { style: { color: TEXT, fontSize: 16, fontWeight: 800 } }, !state.moving ? 'STILL' : state.passes ? 'PASS' : 'BLOCKED')),
            h('div', { style: { padding: 9, border: '1px solid ' + BORDER, borderRadius: 9, textAlign: 'center' } }, h('div', { style: { color: SOFT, fontSize: 11 } }, 'm/|q| → radius'), h('div', { style: { color: TEXT, fontSize: 16, fontWeight: 800 } }, state.massToCharge.toFixed(1) + ' → ' + state.analyzerRadius.toFixed(2)))),
          h('div', { role: 'group', 'aria-label': 'Ion species', style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 9 } },
            Object.keys(ANALYZER_SPECIES).map(function (key) {
              var item = ANALYZER_SPECIES[key];
              return h('button', { key: key, 'aria-pressed': speciesKey === key ? 'true' : 'false', onClick: function () { upd({ analyzerSpecies: key, analyzerUsed: true, lorentzUsed: true }); announceToSR(item.name + ' selected. Mass-to-charge ratio ' + (item.mass / Math.abs(item.charge)).toFixed(1) + '.'); }, style: btn(speciesKey === key) }, item.symbol + ' · m/q ' + (item.mass / Math.abs(item.charge)).toFixed(1));
            })),
          h('div', { style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 } },
            h('button', { onClick: function () { upd({ analyzerSpeed: Math.max(0, Math.min(10, state.selectedSpeed)), analyzerUsed: true, lorentzUsed: true }); announceToSR('Beam speed matched to E divided by B: ' + selectedSpeedText + '.'); }, style: btn(true) }, 'Match beam to E/B'),
            h('button', { 'aria-pressed': d.analyzerShowAll ? 'true' : 'false', onClick: function () { upd({ analyzerShowAll: !d.analyzerShowAll, analyzerUsed: true, lorentzUsed: true }); }, style: btn(d.analyzerShowAll) }, d.analyzerShowAll ? 'Compare all ion paths: on' : 'Compare all ion paths: off')),
          h('div', { className: 'mag-sim-grid', style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12 } },
            h('div', null,
              slider('Electric field E', d.analyzerE, 0, 10, 0.5, function (v) { upd({ analyzerE: v, analyzerUsed: true, lorentzUsed: true }); }),
              slider('Selector magnetic field B', d.analyzerSelectorB, 1, 8, 0.5, function (v) { upd({ analyzerSelectorB: v, analyzerUsed: true, lorentzUsed: true }); })),
            h('div', null,
              slider('Incoming beam speed v', d.analyzerSpeed, 0, 10, 0.25, function (v) { upd({ analyzerSpeed: v, analyzerUsed: true, lorentzUsed: true }); }),
              slider('Analyzer magnetic field B', d.analyzerB, 1, 8, 0.5, function (v) { upd({ analyzerB: v, analyzerUsed: true, lorentzUsed: true }); }))),
          h('div', { className: 'mag-observe', role: 'status', 'aria-live': 'polite' },
            h('span', { 'aria-hidden': 'true' }, !state.moving ? 'Ⅱ' : state.passes ? '◎' : '×'),
            h('span', null, h('b', null, !state.moving ? 'Beam stationary. ' : state.passes ? 'Beam transmitted. ' : 'Beam blocked. '),
              !state.moving ? 'Increase incoming speed to launch the ion beam; a zero-speed charge has no magnetic analyzer path.' : state.passes ? (overlap ? 'D⁺ and He²⁺ overlap because both have m/|q| = 2. The apparatus separates ratios, so a doubly charged helium ion can imitate a deuteron.' : 'The selected ion reaches the analyzer. Larger m/|q| or weaker analyzer B produces a wider arc.') : 'Adjust v until electric and magnetic forces cancel, or use Match beam to E/B. The slit rejects every other speed.'))
        ), '#c084fc');
      }
      function chargedParticleCard() {
        var pts = chargedParticleTrajectory(d.chargeSign, d.chargeField, d.chargeSpeed, d.chargeB, 36);
        var charge3d = currentCharge3DState();
        var path = pts.map(function (p) {
          return (32 + p.x * 1.35).toFixed(1) + ',' + (110 + p.y * 0.55).toFixed(1);
        }).join(' ');
        var bendsUp = d.chargeSign * d.chargeField > 0;
        var markers = [];
        for (var my = 34; my <= 176; my += 28) {
          for (var mx = 22; mx <= 302; mx += 28) {
            if (d.chargeField > 0) {
              markers.push(h('g', { key: mx + ':' + my },
                h('circle', { cx: mx, cy: my, r: 5, fill: 'none', stroke: 'rgba(56,189,248,.30)' }),
                h('circle', { cx: mx, cy: my, r: 1.7, fill: 'rgba(56,189,248,.52)' })));
            } else {
              markers.push(h('g', { key: mx + ':' + my, stroke: 'rgba(56,189,248,.38)', strokeWidth: 1.4 },
                h('line', { x1: mx - 4, y1: my - 4, x2: mx + 4, y2: my + 4 }),
                h('line', { x1: mx + 4, y1: my - 4, x2: mx - 4, y2: my + 4 })));
            }
          }
        }
        var radiusRel = d.chargeSpeed / Math.max(0.1, d.chargeB);
        var chargeName = d.chargeSign > 0 ? 'positive' : 'negative';
        var fieldName = d.chargeField > 0 ? 'out of the screen' : 'into the screen';
        return card('Charged-particle beam — Lorentz force', h('div', null,
          h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } },
            'A moving charge in a magnetic field feels ', h('b', null, 'F = qv × B'), '. The force is sideways, so the field bends the path instead of speeding the particle up. Reverse either the charge or the field and the curve reverses.'),
          h('div', { role: 'group', 'aria-label': 'Charged-particle model view', style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 9 } },
            h('button', { 'aria-pressed': d.chargeView !== '3d' ? 'true' : 'false', onClick: function () { stopCharge3D(); upd({ chargeView: '2d', charge3dRunning: false }); announceToSR('Two-dimensional Lorentz-force diagram selected.'); }, style: btn(d.chargeView !== '3d') }, '2D bend diagram'),
            h('button', { 'aria-pressed': d.chargeView === '3d' ? 'true' : 'false', onClick: function () { if (d.chargeView === '3d') return; upd({ chargeView: '3d', charge3dStatus: 'loading', charge3dUsed: true, lorentzUsed: true }); announceToSR('Three-dimensional particle helix lab selected.'); }, style: btn(d.chargeView === '3d') }, '3D helix lab')),
          d.chargeView === '3d' ? chargedParticle3DPanel() : h('svg', { viewBox: '0 0 320 200', width: '100%', style: { maxWidth: 520, display: 'block', margin: '0 auto 10px' }, role: 'img',
            'aria-label': 'A ' + chargeName + ' particle moving right through a field ' + fieldName + ', curving ' + (bendsUp ? 'up' : 'down') },
            h('rect', { x: 0, y: 0, width: 320, height: 200, fill: INSTRUMENT, rx: 10 }),
            markers,
            h('text', { x: 160, y: 16, fill: '#7dd3fc', fontSize: 11, textAnchor: 'middle' }, d.chargeField > 0 ? '⊙ B out of screen' : '⊗ B into screen'),
            h('line', { x1: 31, y1: 110, x2: 70, y2: 110, stroke: '#fbbf24', strokeWidth: 2 }),
            h('polygon', { points: '76,110 66,105 66,115', fill: '#fbbf24' }),
            h('text', { x: 48, y: 102, fill: '#fbbf24', fontSize: 11, textAnchor: 'middle' }, 'velocity v'),
            h('polyline', { points: path, fill: 'none', stroke: '#f43f5e', strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' }),
            h('circle', { cx: 32, cy: 110, r: 9, fill: d.chargeSign > 0 ? '#fb7185' : '#38bdf8', stroke: '#fff', strokeWidth: 1.5 }),
            h('text', { x: 32, y: 114, fill: '#fff', fontSize: 12, fontWeight: 900, textAnchor: 'middle' }, d.chargeSign > 0 ? '+' : '−'),
            h('line', { x1: 52, y1: 110, x2: 52, y2: bendsUp ? 66 : 154, stroke: '#34d399', strokeWidth: 2.5 }),
            h('polygon', { points: bendsUp ? '52,60 46,71 58,71' : '52,160 46,149 58,149', fill: '#34d399' }),
            h('text', { x: 61, y: bendsUp ? 68 : 158, fill: '#34d399', fontSize: 11 }, 'F'),
            h('rect', { x: 8, y: 178, width: 304, height: 16, rx: 8, fill: 'rgba(15,23,42,.88)' }),
            h('text', { x: 160, y: 189, fill: SOFT, fontSize: 11, textAnchor: 'middle' }, 'magnetic force stays perpendicular to the instantaneous velocity')),
          h('div', { className: 'mag-sim-grid', style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 9 } },
            h('div', null,
              h('div', { style: { color: SOFT, fontSize: 11, marginBottom: 5 } }, 'Particle charge'),
              h('div', { style: { display: 'flex', gap: 6 } },
                h('button', { 'aria-pressed': d.chargeSign > 0 ? 'true' : 'false', onClick: function () { upd({ chargeSign: 1, lorentzUsed: true }); }, style: btn(d.chargeSign > 0) }, '+ Positive'),
                h('button', { 'aria-pressed': d.chargeSign < 0 ? 'true' : 'false', onClick: function () { upd({ chargeSign: -1, lorentzUsed: true }); }, style: btn(d.chargeSign < 0) }, '− Negative'))),
            h('div', null,
              h('div', { style: { color: SOFT, fontSize: 11, marginBottom: 5 } }, 'Field direction'),
              h('div', { style: { display: 'flex', gap: 6 } },
                h('button', { 'aria-pressed': d.chargeField > 0 ? 'true' : 'false', onClick: function () { upd({ chargeField: 1, lorentzUsed: true }); }, style: btn(d.chargeField > 0) }, '⊙ Out'),
                h('button', { 'aria-pressed': d.chargeField < 0 ? 'true' : 'false', onClick: function () { upd({ chargeField: -1, lorentzUsed: true }); }, style: btn(d.chargeField < 0) }, '⊗ Into')))),
          slider('Particle speed (v)', d.chargeSpeed, 2, 8, 1, function (v) { upd({ chargeSpeed: v, lorentzUsed: true }); }),
          slider('Magnetic field strength (B)', d.chargeB, 1, 8, 1, function (v) { upd({ chargeB: v, lorentzUsed: true }); }),
          d.chargeView === '3d' ? h('div', null,
            h('div', { role: 'group', 'aria-label': 'Magnetic environment', style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 8 } },
              h('button', { 'aria-pressed': charge3d.fieldModel === 'uniform' ? 'true' : 'false', onClick: function () { stopCharge3D(); upd({ chargeFieldModel: 'uniform', charge3dProgress: 0, charge3dUsed: true, lorentzUsed: true }); announceToSR('Uniform magnetic field selected.'); }, style: btn(charge3d.fieldModel === 'uniform') }, 'Uniform field'),
              h('button', { 'aria-pressed': charge3d.fieldModel === 'mirror' ? 'true' : 'false', onClick: function () { stopCharge3D(); upd({ chargeFieldModel: 'mirror', charge3dProgress: 0, charge3dUsed: true, lorentzUsed: true }); announceToSR('Magnetic mirror selected. Test pitch angles above and below the loss-cone boundary.'); }, style: btn(charge3d.fieldModel === 'mirror') }, 'Magnetic mirror')),
            charge3d.fieldModel === 'mirror' ? slider('Mirror ratio (B ends / B center)', d.chargeMirrorRatio, 1.5, 6, 0.5, function (v) { stopCharge3D(); upd({ chargeMirrorRatio: v, charge3dProgress: 0, charge3dUsed: true, lorentzUsed: true }); }) : null,
            slider('Relative particle mass (m)', d.chargeMass, 0.5, 6, 0.5, function (v) { stopCharge3D(); upd({ chargeMass: v, charge3dProgress: 0, charge3dUsed: true, lorentzUsed: true }); }),
            h('div', { role: 'group', 'aria-label': 'Velocity tilt presets', style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 } },
              h('button', { 'aria-pressed': d.chargeTilt === 0 ? 'true' : 'false', onClick: function () { stopCharge3D(); upd({ chargeTilt: 0, charge3dProgress: 0, charge3dUsed: true, lorentzUsed: true }); }, style: btn(d.chargeTilt === 0) }, '0° · axial line'),
              h('button', { 'aria-pressed': d.chargeTilt === 45 ? 'true' : 'false', onClick: function () { stopCharge3D(); upd({ chargeTilt: 45, charge3dProgress: 0, charge3dUsed: true, lorentzUsed: true }); }, style: btn(d.chargeTilt === 45) }, '45° · helix'),
              h('button', { 'aria-pressed': d.chargeTilt === 90 ? 'true' : 'false', onClick: function () { stopCharge3D(); upd({ chargeTilt: 90, charge3dProgress: 0, charge3dUsed: true, lorentzUsed: true }); }, style: btn(d.chargeTilt === 90) }, '90° · circle')),
            slider('Velocity tilt from field axis (°)', d.chargeTilt, 0, 90, 5, function (v) { stopCharge3D(); upd({ chargeTilt: v, charge3dProgress: 0, charge3dUsed: true, lorentzUsed: true }); }),
            h('div', { style: { color: SOFT, fontSize: 11.5, margin: '-3px 0 8px', lineHeight: 1.4 } }, 'm ' + charge3d.mass.toFixed(1) + ' · v∥ ' + charge3d.parallelSpeed.toFixed(2) + ' · v⊥ ' + charge3d.perpendicularSpeed.toFixed(2) + ' · magnetic force ∝ ' + charge3d.force.toFixed(2) + (charge3d.fieldModel === 'mirror' ? ' · critical pitch ' + charge3d.criticalAngle.toFixed(1) + '°' : ''))) : null,
          d.chargeView === '3d' ? null : h('div', { className: 'mag-observe', role: 'status' },
            h('span', { 'aria-hidden': 'true' }, '🧭'),
            h('span', null, h('b', null, 'Path bends ' + (bendsUp ? 'up' : 'down') + ' · radius indicator ' + radiusRel.toFixed(2) + '. '),
              'Faster particles make wider arcs; a stronger field makes tighter arcs. This is the operating idea behind mass spectrometers and particle-beam steering.'))
        ), '#a78bfa');
      }

      function motorTelemetryHUD() {
        var angle = ((Number(d.motorAngle) || 0) % 360 + 360) % 360;
        var leverage = Math.abs(Math.sin(angle * Math.PI / 180));
        var loadState = motorLoadState(d.motorCurrent, d.motorField, angle, d.motorLoad);
        var hasDrive = Number(d.motorCurrent) > 0 && Number(d.motorField) > 0;
        var phase = !hasDrive ? 'No torque' : loadState.stalled ? (leverage < 0.08 ? 'Dead spot · stalled under load' : 'Stalled under load') : leverage < 0.08 ? 'Dead spot' : leverage > 0.92 ? 'Maximum torque' : 'Turning pair';
        var direction = hasDrive ? (d.motorCurrentDir * d.motorFieldDir > 0 ? 'Clockwise' : 'Counter-clockwise') : 'No rotation';
        var halfTurn = angle < 180 ? 'Half-turn 1' : 'Half-turn 2';
        var hint = !hasDrive ? 'Add current and field to create a force pair.' :
          loadState.stalled ? 'The shaft load is larger than the available magnetic torque. Lower the load or increase current or field.' :
          leverage < 0.08 ? 'Inertia carries the loop through this low-torque angle.' :
          leverage > 0.92 ? 'The opposite wire forces have their strongest turning leverage.' :
          'Opposite forces create a turning pair; the commutator keeps the rotation going.';
        var liveTorque = Math.abs(motorTorqueFactor(d.motorCurrent, d.motorField, angle, d.motorCurrentDir, d.motorFieldDir) / 12);
        var motorEvidence = (d.notebookTrials || []).filter(function (trial) {
          return Array.isArray(trial.metrics) && trial.metrics.some(function (metric) { return metric.key === 'torque_rel'; });
        }).slice(-1)[0] || null;
        var recordedTorqueMetric = motorEvidence && motorEvidence.metrics ? motorEvidence.metrics.filter(function (metric) { return metric.key === 'torque_rel'; })[0] : null;
        var recordedAngleMetric = motorEvidence && motorEvidence.metrics ? motorEvidence.metrics.filter(function (metric) { return metric.key === 'angle_deg'; })[0] : null;
        var recordedTorque = recordedTorqueMetric && Number.isFinite(Number(recordedTorqueMetric.value)) ? Number(recordedTorqueMetric.value) : null;
        var recordedAngle = recordedAngleMetric && Number.isFinite(Number(recordedAngleMetric.value)) ? Number(recordedAngleMetric.value) : null;
        var ribbonX = 14 + angle / 360 * 292;
        var phaseRibbon = h('svg', { viewBox: '0 0 320 50', width: '100%', style: { gridColumn: '1 / -1', display: 'block', margin: '0 0 1px' }, role: 'img',
          'aria-label': 'Torque cycle phase. Current angle ' + angle.toFixed(0) + ' degrees. Dead spots near 0 and 180 degrees; maximum leverage near 90 and 270 degrees; the 180 degree marker is the commutator flip.' },
          h('rect', { x: 14, y: 17, width: 292, height: 8, rx: 4, fill: BORDER }),
          h('rect', { x: 14, y: 17, width: 24, height: 8, rx: 4, fill: 'rgba(244,63,94,.65)' }),
          h('rect', { x: 74, y: 17, width: 26, height: 8, rx: 4, fill: 'rgba(52,211,153,.72)' }),
          h('rect', { x: 136, y: 17, width: 48, height: 8, rx: 4, fill: 'rgba(244,63,94,.65)' }),
          h('rect', { x: 220, y: 17, width: 26, height: 8, rx: 4, fill: 'rgba(52,211,153,.72)' }),
          h('rect', { x: 282, y: 17, width: 24, height: 8, rx: 4, fill: 'rgba(244,63,94,.65)' }),
          h('line', { x1: ribbonX, y1: 9, x2: ribbonX, y2: 31, stroke: '#fbbf24', strokeWidth: 2.5 }),
          h('circle', { cx: ribbonX, cy: 17, r: 4, fill: '#fbbf24', stroke: INSTRUMENT, strokeWidth: 1.5 }),
          h('text', { x: 14, y: 43, fill: SOFT, fontSize: 9.5, textAnchor: 'start' }, '0° dead'),
          h('text', { x: 87, y: 43, fill: SOFT, fontSize: 9.5, textAnchor: 'middle' }, '90° max'),
          h('text', { x: 160, y: 43, fill: SOFT, fontSize: 9.5, textAnchor: 'middle' }, '180° flip'),
          h('text', { x: 233, y: 43, fill: SOFT, fontSize: 9.5, textAnchor: 'middle' }, '270° max'),
          h('text', { x: 306, y: 43, fill: SOFT, fontSize: 9.5, textAnchor: 'end' }, '360°'));
        var openNotebook = function () {
          upd({ notebookOpen: true, tab: 'motor', motorMode: 'forces' });
          announceToSR('Motor trial notebook opened. Write a prediction, then record the current torque setup.');
        };
        var comparePanel = motorEvidence && recordedTorque != null
          ? h('div', { role: 'group', 'aria-label': 'Previous motor trial comparison', style: { gridColumn: '1 / -1', paddingTop: 7, borderTop: '1px solid rgba(251,191,36,.20)', color: SOFT, fontSize: 11.5, lineHeight: 1.4 } },
            h('b', { style: { color: TEXT } }, 'Previous trial comparison. '),
            'Recorded ' + recordedTorque.toFixed(2) + '× torque' + (recordedAngle == null ? '' : ' at ' + recordedAngle.toFixed(0) + '°') + ' · live ' + liveTorque.toFixed(2) + '× · Δ ' + (liveTorque - recordedTorque >= 0 ? '+' : '') + (liveTorque - recordedTorque).toFixed(2) + '×.',
            motorEvidence.setup ? h('span', { style: { display: 'block' } }, 'Recorded setup: ' + motorEvidence.setup + '.') : null,
            !d.notebookOpen ? h('button', { type: 'button', onClick: openNotebook, style: Object.assign({}, btn(), { marginTop: 6 }) }, 'Open notebook') : null)
          : h('div', { role: 'group', 'aria-label': 'Motor trial recorder', style: { gridColumn: '1 / -1', paddingTop: 7, borderTop: '1px solid rgba(251,191,36,.20)', color: SOFT, fontSize: 11.5, lineHeight: 1.4 } },
            h('b', { style: { color: TEXT } }, 'Record a torque trial. '),
            'Change one control, save the evidence in the notebook, then compare the live setup here. Saved trials flow into Mission Control report exports.',
            !d.notebookOpen ? h('button', { type: 'button', onClick: openNotebook, style: Object.assign({}, btn(), { marginTop: 6 }) }, 'Record a torque trial') : null);
        return h('div', { role: 'group', 'aria-label': 'Live torque telemetry', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8, margin: '0 0 10px', padding: '9px 10px', borderRadius: 9, background: 'rgba(251,191,36,.07)', border: '1px solid rgba(251,191,36,.24)' } },
          h('div', null,
            h('div', { style: { color: SOFT, fontSize: 11 } }, 'Rotor angle'),
            h('strong', { style: { display: 'block', color: TEXT, fontSize: 15, fontVariantNumeric: 'tabular-nums' } }, angle.toFixed(0) + '°')),
          h('div', null,
            h('div', { style: { color: SOFT, fontSize: 11 } }, 'Torque leverage'),
            h('meter', { min: 0, max: 100, value: leverage * 100, 'aria-label': 'Torque leverage ' + Math.round(leverage * 100) + ' percent', style: { display: 'block', width: '100%', height: 10, margin: '5px 0 2px' } }),
            h('strong', { style: { color: TEXT, fontSize: 13, fontVariantNumeric: 'tabular-nums' } }, Math.round(leverage * 100) + '%')),
          h('div', null,
            h('div', { style: { color: SOFT, fontSize: 11 } }, 'Commutator phase'),
            h('strong', { style: { display: 'block', color: TEXT, fontSize: 13 } }, halfTurn),
            h('div', { style: { color: SOFT, fontSize: 11 } }, direction)),
          h('div', null,
            h('div', { style: { color: SOFT, fontSize: 11 } }, 'Load margin'),
            h('strong', { style: { display: 'block', color: loadState.stalled ? '#fb7185' : TEXT, fontSize: 13, fontVariantNumeric: 'tabular-nums' } }, (loadState.margin >= 0 ? '+' : '') + loadState.margin.toFixed(2) + '×'),
            h('div', { style: { color: SOFT, fontSize: 11 } }, loadState.stalled ? 'Stalled' : 'Headroom')),
          h('div', { role: 'status', 'aria-live': 'polite', style: { gridColumn: '1 / -1', color: TEXT, fontSize: 11.5, lineHeight: 1.4 } },
            h('b', null, d.motorRunning ? (loadState.stalled ? 'Torque run stalled. ' : 'Run engine active. ') : phase + '. '),
            d.motorRunning ? (loadState.stalled ? 'Load exceeds available magnetic torque. Lower the shaft load or increase current or field.' : 'The angle is advancing through the commutator cycle. ' + phase + ' now.') : hint),
          phaseRibbon,
          comparePanel);
      }

      function motorTorqueGraph() {
        var dir = d.motorCurrentDir * d.motorFieldDir > 0 ? 1 : -1;
        var amplitudeScale = Math.min(1, Math.abs(d.motorCurrent * d.motorField) / 48);
        var pts = [];
        for (var a = 0; a <= 360; a += 6) {
          var x = 18 + a / 360 * 284;
          var y = 46 - dir * Math.abs(Math.sin(a * Math.PI / 180)) * 28 * amplitudeScale;
          pts.push(x.toFixed(1) + ',' + y.toFixed(1));
        }
        var px = 18 + (((d.motorAngle % 360) + 360) % 360) / 360 * 284;
        var py = 46 - dir * Math.abs(Math.sin(d.motorAngle * Math.PI / 180)) * 28 * amplitudeScale;
        return h('svg', { viewBox: '0 0 320 82', width: '100%', style: { maxWidth: 520, display: 'block', margin: '0 auto 9px' }, role: 'img',
          'aria-label': 'Torque versus coil angle graph. Current angle ' + Math.round(d.motorAngle) + ' degrees, amplitude ' + Math.round(amplitudeScale * 100) + ' percent of graph scale, torque direction ' + (dir > 0 ? 'clockwise' : 'counter-clockwise') },
          h('rect', { x: 0, y: 0, width: 320, height: 82, fill: INSTRUMENT, rx: 9 }),
          h('text', { x: 18, y: 12, fill: SOFT, fontSize: 11 }, 'torque τ ∝ I·B·sin θ'),
          h('line', { x1: 18, y1: 46, x2: 302, y2: 46, stroke: BORDER }),
          h('line', { x1: 18, y1: 16, x2: 18, y2: 68, stroke: 'rgba(251,113,133,.28)', strokeWidth: 4 }),
          h('line', { x1: 160, y1: 16, x2: 160, y2: 68, stroke: 'rgba(251,113,133,.28)', strokeWidth: 4 }),
          h('line', { x1: 302, y1: 16, x2: 302, y2: 68, stroke: 'rgba(251,113,133,.28)', strokeWidth: 4 }),
          h('polyline', { points: pts.join(' '), fill: 'none', stroke: '#38bdf8', strokeWidth: 2.5 }),
          h('line', { x1: px, y1: 14, x2: px, y2: 70, stroke: 'rgba(251,191,36,.45)', strokeDasharray: '3 3' }),
          h('circle', { cx: px, cy: py, r: 4.5, fill: '#fbbf24', stroke: '#0b1220', strokeWidth: 1.5 }),
          h('text', { x: 18, y: 76, fill: SOFT, fontSize: 11 }, '0°'),
          h('text', { x: 160, y: 76, fill: SOFT, fontSize: 11, textAnchor: 'middle' }, '180°'),
          h('text', { x: 302, y: 76, fill: SOFT, fontSize: 11, textAnchor: 'end' }, '360°'));
      }

      function motorSVG() {
        var deg = d.motorAngle;
        var loopColor = d.motorCurrent > 0 ? '#f59e0b' : '#475569';
        var torqueDir = d.motorCurrentDir * d.motorFieldDir > 0 ? 1 : -1;
        var half = ((Math.floor(deg / 180) % 2 === 0) ? 1 : -1) * torqueDir; // commutator + supply/field direction
        var rotationArc = torqueDir > 0 ? 'M 113 53 Q 150 27 187 53' : 'M 187 53 Q 150 27 113 53';
        var rotationHead = torqueDir > 0 ? '187,53 176,48 181,59' : '113,53 124,48 119,59';
        return h('svg', { viewBox: '0 0 300 190', width: '100%', style: { maxWidth: 390 }, role: 'img', 'aria-label': 'Motor model with a ' + d.motorCurrent + ' amp current loop in field setting ' + d.motorField + ', rotated ' + Math.round(deg) + ' degrees; opposite wire forces create torque' },
          h('rect', { x: 0, y: 0, width: 300, height: 190, fill: INSTRUMENT, rx: 10 }),
          h('text', { x: 150, y: 18, fill: SOFT, fontSize: 11, textAnchor: 'middle' }, 'magnetic field B flows from N → S'),
          h('rect', { x: 8, y: 64, width: 38, height: 62, fill: d.motorFieldDir > 0 ? '#ef4444' : '#3b82f6', rx: 4 }),
          h('text', { x: 27, y: 100, fill: '#fff', fontSize: 14, fontWeight: 800, textAnchor: 'middle' }, d.motorFieldDir > 0 ? 'N' : 'S'),
          h('rect', { x: 254, y: 64, width: 38, height: 62, fill: d.motorFieldDir > 0 ? '#3b82f6' : '#ef4444', rx: 4 }),
          h('text', { x: 273, y: 100, fill: '#fff', fontSize: 14, fontWeight: 800, textAnchor: 'middle' }, d.motorFieldDir > 0 ? 'S' : 'N'),
          // field lines with arrowheads pair direction with the N/S labels.
          [72, 95, 118].map(function (yy, i) {
            var fx1 = d.motorFieldDir > 0 ? 50 : 250;
            var fx2 = d.motorFieldDir > 0 ? 250 : 50;
            var fhead = d.motorFieldDir > 0 ? 238 : 62;
            return h('g', { key: 'f' + i },
              h('line', { x1: fx1, y1: yy, x2: fx2, y2: yy, stroke: 'rgba(148,163,184,0.28)', strokeWidth: 1.2 }),
              h('polygon', { points: fhead + ',' + yy + ' ' + (fhead - d.motorFieldDir * 8) + ',' + (yy - 4) + ' ' + (fhead - d.motorFieldDir * 8) + ',' + (yy + 4), fill: 'rgba(148,163,184,0.55)' }));
          }),
          d.motorCurrent > 0 ? h('g', { 'aria-hidden': 'true' },
            h('path', { d: rotationArc, fill: 'none', stroke: '#fbbf24', strokeWidth: 2.3, strokeLinecap: 'round' }),
            h('polygon', { points: rotationHead, fill: '#fbbf24' }),
            h('text', { x: 150, y: 39, fill: TEXT, fontSize: 11, textAnchor: 'middle' }, torqueDir > 0 ? 'clockwise torque' : 'counter-clockwise torque')) : null,
          // rotating loop
          h('g', { transform: 'translate(150,95) rotate(' + deg.toFixed(1) + ')' },
            h('rect', { x: -50, y: -30, width: 100, height: 60, fill: 'none', stroke: loopColor, strokeWidth: 5, rx: 4 }),
            // force arrows (up on one side, down on other; flip with commutator)
            d.motorCurrent > 0 ? h('polygon', { points: '-50,' + (-30 - 6 * half) + ' -56,' + (-14 - 6 * half) + ' -44,' + (-14 - 6 * half), fill: '#34d399', transform: half > 0 ? '' : 'rotate(180 -50 -30)' }) : null,
            d.motorCurrent > 0 ? h('circle', { cx: 50, cy: 30, r: 3, fill: '#34d399' }) : null),
          d.motorCurrent > 0 ? h('g', null,
            h('line', { x1: 82, y1: half > 0 ? 85 : 105, x2: 82, y2: half > 0 ? 45 : 145, stroke: '#34d399', strokeWidth: 2.5 }),
            h('polygon', { points: half > 0 ? '82,39 76,50 88,50' : '82,151 76,140 88,140', fill: '#34d399' }),
            h('text', { x: 68, y: half > 0 ? 42 : 151, fill: '#34d399', fontSize: 11, textAnchor: 'end' }, 'force'),
            h('line', { x1: 218, y1: half > 0 ? 105 : 85, x2: 218, y2: half > 0 ? 145 : 45, stroke: '#34d399', strokeWidth: 2.5 }),
            h('polygon', { points: half > 0 ? '218,151 212,140 224,140' : '218,39 212,50 224,50', fill: '#34d399' }),
            h('text', { x: 232, y: half > 0 ? 151 : 42, fill: '#34d399', fontSize: 11 }, 'force')) : null,
          h('text', { x: 150, y: 178, fill: SOFT, fontSize: 11, textAnchor: 'middle' }, 'commutator flips current each half-turn · forces keep the same torque direction')
        );
      }

      function currentMotor3DState() {
        return Object.assign(motorSpatialState(d.motorAngle, d.motorCurrent, d.motorField, d.motorCurrentDir, d.motorFieldDir), {
          current: Math.max(0, Number(d.motorCurrent) || 0),
          field: Math.max(0, Number(d.motorField) || 0),
          currentDir: d.motorCurrentDir < 0 ? -1 : 1,
          fieldDir: d.motorFieldDir < 0 ? -1 : 1,
          showForces: d.motor3dForces !== false,
          showCurrent: d.motor3dCurrent !== false
        });
      }

      function initMotor3DCanvas(cv) {
        if (!cv || cv._motor3dInit) return;
        if (!window.StemLab || typeof window.StemLab.ensureThree !== 'function') return;
        cv._motor3dInit = true;
        window.StemLab.ensureThree({ orbit: true, orbitRequired: true, failMessage: 'The 3D motor engine could not load. The complete 2D force diagram remains available.' })
          .then(function (THREE) {
            if (!cv.isConnected) { cv._motor3dInit = false; return; }
            var renderer;
            try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, powerPreference: 'high-performance' }); }
            catch (error) { cv._motor3dInit = false; upd({ motor3dStatus: 'error' }); return; }
            var scene = new THREE.Scene(), backgroundColor = new THREE.Color(0x07111f);
            try { var themeBackground = window.getComputedStyle(cv).getPropertyValue('--allo-stem-instrument').trim(); if (themeBackground) backgroundColor.setStyle(themeBackground); } catch (themeError) {}
            scene.background = backgroundColor; scene.fog = new THREE.FogExp2(backgroundColor.getHex(), 0.026);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6)); if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
            var camera = new THREE.PerspectiveCamera(44, 1, 0.1, 70); camera.position.set(8.2, 5.4, 8.6);
            var controls = new THREE.OrbitControls(camera, cv); controls.enableDamping = false; controls.minDistance = 5.5; controls.maxDistance = 20; controls.target.set(0, 0, 0);
            scene.add(new THREE.HemisphereLight(0xdbeafe, 0x172554, 1.2));
            var keyLight = new THREE.DirectionalLight(0xffffff, 1.25); keyLight.position.set(5, 8, 7); scene.add(keyLight);
            var rimLight = new THREE.PointLight(0x38bdf8, 1.0, 22); rimLight.position.set(-5, 2, 5); scene.add(rimLight);
            var grid = new THREE.GridHelper(11, 22, 0x64748b, 0x334155); grid.material.transparent = true; grid.material.opacity = 0.22; grid.position.y = -2.25; scene.add(grid);
            var dynamicGroup = new THREE.Group(); scene.add(dynamicGroup);
            var liveState = cv._motor3dState || currentMotor3DState();
            var resizeObserver = null, disposed = false, liveSignature = '';
            var rotorGroup = null, forceArrows = [], currentArrows = [], momentArrow = null, torqueArrow = null;
            var yAxis = new THREE.Vector3(0, 1, 0);
            function disposeObject(obj) { obj.traverse(function (child) { if (child.geometry && child.geometry.dispose) child.geometry.dispose(); if (child.material) (Array.isArray(child.material) ? child.material : [child.material]).forEach(function (material) { if (material && material.dispose) material.dispose(); }); }); }
            function clearDynamic() { while (dynamicGroup.children.length) { var child = dynamicGroup.children[dynamicGroup.children.length - 1]; dynamicGroup.remove(child); disposeObject(child); } rotorGroup = null; forceArrows = []; currentArrows = []; momentArrow = null; torqueArrow = null; }
            function resize() { var width = Math.max(1, cv.clientWidth || 680), height = Math.max(1, cv.clientHeight || 410); renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); }
            function renderScene() { if (!disposed) { resize(); renderer.render(scene, camera); } }
            function addArrow(parent, origin, direction, color, length, opacity) {
              var arrow = new THREE.ArrowHelper(direction.clone().normalize(), origin, length, color, Math.min(0.28, length * 0.28), Math.min(0.16, length * 0.17));
              arrow.line.material.transparent = true; arrow.line.material.opacity = opacity; arrow.cone.material.transparent = true; arrow.cone.material.opacity = opacity; parent.add(arrow); return arrow;
            }
            function addPoleMark(x, isNorth) {
              var radii = isNorth ? [0.42] : [0.28, 0.55];
              radii.forEach(function (radius) {
                var ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.045, 8, 32), new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.95 }));
                ring.rotation.y = Math.PI / 2; ring.position.set(x, 0, 0); dynamicGroup.add(ring);
              });
            }
            function buildApparatus(state) {
              clearDynamic();
              [-1, 1].forEach(function (side) {
                var isNorth = side === -state.fieldDirection;
                var magnet = new THREE.Mesh(new THREE.BoxGeometry(1.15, 3.5, 3.0), new THREE.MeshStandardMaterial({ color: isNorth ? 0xef4444 : 0x2563eb, roughness: 0.42, metalness: 0.3 }));
                magnet.position.x = side * 3.35; dynamicGroup.add(magnet);
                addPoleMark(side * 2.76, isNorth);
              });
              var fieldStart = state.fieldDirection > 0 ? -2.62 : 2.62;
              [-0.78, 0, 0.78].forEach(function (yy) { [-0.62, 0.62].forEach(function (zz) {
                addArrow(dynamicGroup, new THREE.Vector3(fieldStart, yy, zz), new THREE.Vector3(state.fieldDirection, 0, 0), 0x38bdf8, 5.24, 0.28 + state.field / 12);
              }); });
              rotorGroup = new THREE.Group(); dynamicGroup.add(rotorGroup);
              var loopPoints = [new THREE.Vector3(0, -1.28, -1.08), new THREE.Vector3(0, 1.28, -1.08), new THREE.Vector3(0, 1.28, 1.08), new THREE.Vector3(0, -1.28, 1.08)];
              var loopCurve = new THREE.CatmullRomCurve3(loopPoints, true, 'catmullrom', 0.05);
              var loop = new THREE.Mesh(new THREE.TubeGeometry(loopCurve, 72, 0.065, 10, true), new THREE.MeshStandardMaterial({ color: state.current > 0 ? 0xf59e0b : 0x64748b, emissive: 0xf59e0b, emissiveIntensity: state.current > 0 ? 0.18 : 0, roughness: 0.38, metalness: 0.62 })); rotorGroup.add(loop);
              var shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.7, 18), new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.28, metalness: 0.82 })); rotorGroup.add(shaft);
              [0, Math.PI].forEach(function (rotation, index) {
                var halfRing = new THREE.Mesh(new THREE.TorusGeometry(0.40, 0.11, 9, 24, Math.PI), new THREE.MeshStandardMaterial({ color: index ? 0xb45309 : 0xf59e0b, roughness: 0.32, metalness: 0.72 }));
                halfRing.rotation.x = Math.PI / 2; halfRing.rotation.z = rotation; halfRing.position.y = -1.72; rotorGroup.add(halfRing);
              });
              [-0.62, 0.62].forEach(function (x) { var brush = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.48), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.72 })); brush.position.set(x, -1.72, 0); dynamicGroup.add(brush); });
              if (state.showCurrent && state.current > 0) {
                currentArrows = [
                  addArrow(rotorGroup, new THREE.Vector3(0, -0.38, -1.08), new THREE.Vector3(0, 1, 0), 0xfbbf24, 0.78, 1),
                  addArrow(rotorGroup, new THREE.Vector3(0, 0.38, 1.08), new THREE.Vector3(0, -1, 0), 0xfbbf24, 0.78, 1)
                ];
              }
              if (state.showForces && state.current > 0 && state.field > 0) {
                forceArrows = [
                  addArrow(dynamicGroup, new THREE.Vector3(), new THREE.Vector3(0, 0, 1), 0x34d399, 1, 1),
                  addArrow(dynamicGroup, new THREE.Vector3(), new THREE.Vector3(0, 0, -1), 0x34d399, 1, 1)
                ];
                torqueArrow = addArrow(dynamicGroup, new THREE.Vector3(), new THREE.Vector3(0, 1, 0), 0xfbbf24, 1, 0.95);
              }
              if (state.showCurrent && state.current > 0) momentArrow = addArrow(dynamicGroup, new THREE.Vector3(), new THREE.Vector3(1, 0, 0), 0xa78bfa, 1.45, 0.95);
            }
            function updatePose(state) {
              var angleRad = state.angle * Math.PI / 180;
              if (rotorGroup) rotorGroup.rotation.y = angleRad;
              if (currentArrows.length) {
                var currentDirection = state.segmentDirection;
                currentArrows[0].setDirection(new THREE.Vector3(0, currentDirection, 0));
                currentArrows[1].setDirection(new THREE.Vector3(0, -currentDirection, 0));
              }
              if (forceArrows.length) {
                var sideA = new THREE.Vector3(0, 0, -1.08).applyAxisAngle(yAxis, angleRad);
                var sideB = new THREE.Vector3(0, 0, 1.08).applyAxisAngle(yAxis, angleRad);
                var forceDirection = -state.segmentDirection * state.fieldDirection;
                forceArrows[0].position.copy(sideA); forceArrows[0].setDirection(new THREE.Vector3(0, 0, forceDirection));
                forceArrows[1].position.copy(sideB); forceArrows[1].setDirection(new THREE.Vector3(0, 0, -forceDirection));
                var forceLength = 0.55 + Math.min(1.25, state.force * 6);
                forceArrows[0].setLength(forceLength, 0.24, 0.13); forceArrows[1].setLength(forceLength, 0.24, 0.13);
              }
              if (momentArrow) {
                var normal = new THREE.Vector3(1, 0, 0).applyAxisAngle(yAxis, angleRad).multiplyScalar(state.segmentDirection);
                momentArrow.setDirection(normal.normalize()); momentArrow.setLength(1.35, 0.25, 0.14);
              }
              if (torqueArrow) {
                torqueArrow.position.set(0, state.torqueDirection > 0 ? -0.9 : 0.9, 0);
                torqueArrow.setDirection(new THREE.Vector3(0, state.torqueDirection, 0));
                torqueArrow.setLength(0.55 + state.torquePercent / 100 * 1.45, 0.25, 0.14);
              }
            }
            function rebuild(state) {
              if (disposed) return;
              liveState = Object.assign({}, state);
              var signature = [state.current, state.field, state.currentDir, state.fieldDir, state.showForces, state.showCurrent].join('|');
              if (signature !== liveSignature) { liveSignature = signature; buildApparatus(liveState); }
              updatePose(liveState); renderScene();
            }
            function setView(view) {
              if (view === 'field') camera.position.set(9.5, 1.7, 0.01);
              else if (view === 'shaft') camera.position.set(0.01, 9.5, 0.01);
              else if (view === 'commutator') camera.position.set(4.8, -3.4, 5.2);
              else camera.position.set(8.2, 5.4, 8.6);
              controls.target.set(0, view === 'commutator' ? -0.7 : 0, 0); camera.lookAt(controls.target); controls.update(); renderScene();
            }
            function onContextLost(event) { event.preventDefault(); upd({ motor3dStatus: 'error', motorRunning: false }); announceToSR('The 3D motor graphics context was lost. The 2D force diagram remains available.'); }
            function cleanup() {
              if (disposed) return; disposed = true;
              cv.removeEventListener('webglcontextlost', onContextLost); controls.removeEventListener('change', renderScene); window.removeEventListener('resize', renderScene); controls.dispose(); if (resizeObserver) resizeObserver.disconnect();
              clearDynamic(); renderer.dispose(); cv._motor3dInit = false; cv._motor3dUpdate = null; cv._motor3dCleanup = null;
            }
            cv.addEventListener('webglcontextlost', onContextLost); controls.addEventListener('change', renderScene);
            if (typeof ResizeObserver !== 'undefined') { resizeObserver = new ResizeObserver(renderScene); resizeObserver.observe(cv); } else window.addEventListener('resize', renderScene, { passive: true });
            cv._motor3dUpdate = rebuild; cv._motor3dSetView = setView; cv._motor3dCleanup = cleanup; rebuild(liveState); upd({ motor3dStatus: 'ready', motor3dUsed: true });
          }).catch(function () { cv._motor3dInit = false; if (cv.isConnected) { upd({ motor3dStatus: 'error', motorRunning: false }); announceToSR('The 3D motor engine could not load. Use the complete 2D force diagram or retry.'); } });
      }

      function motor3DCanvasRef(cv) {
        if (!cv) { var oldCanvas = _motor3DCanvas; window.setTimeout(function () { if (oldCanvas && !oldCanvas.isConnected && typeof oldCanvas._motor3dCleanup === 'function') oldCanvas._motor3dCleanup(); }, 0); return; }
        _motor3DCanvas = cv; cv._motor3dState = currentMotor3DState();
        if (typeof cv._motor3dUpdate === 'function') cv._motor3dUpdate(cv._motor3dState); else initMotor3DCanvas(cv);
      }

      function motor3DPanel() {
        var state = currentMotor3DState();
        var direction = state.torqueDirection > 0 ? 'clockwise' : 'counter-clockwise';
        var fieldPhrase = state.fieldDirection > 0 ? 'left north pole to right south pole' : 'right north pole to left south pole';
        var currentPhrase = state.segmentDirection > 0 ? 'up the near active side and down the far side' : 'down the near active side and up the far side';
        function cameraButton(id, label) { return h('button', { key: id, onClick: function () { if (_motor3DCanvas && typeof _motor3DCanvas._motor3dSetView === 'function') _motor3DCanvas._motor3dSetView(id); announceToSR(label + ' motor view selected.'); }, style: btn() }, label); }
        function setLandmark(angle, label) { upd({ motorAngle: angle, motorRunning: false, motorRan: true, motor3dUsed: true }); announceToSR(label + ' selected at ' + angle + ' degrees.'); }
        return h('div', null,
          sceneViewport(h('canvas', { key: 'motor3d-' + (d.motor3dAttempt || 0), ref: motor3DCanvasRef, className: 'mag-motor3d', role: 'img',
            'aria-label': 'Interactive three-dimensional DC motor with pole pieces, field arrows, rotating current loop, split-ring commutator, brushes, force arrows, magnetic moment, and torque vector.',
            'aria-describedby': 'mag-motor3d-status mag-motor3d-summary',
            style: { display: 'block', width: '100%', borderRadius: 10, border: '1px solid ' + BORDER, background: INSTRUMENT, touchAction: 'none' } }), [
              { label: 'Rotor angle', value: Math.round(state.angle) + '°', tone: '#38bdf8' },
              { label: 'Relative torque', value: Math.round(state.torquePercent) + '%', tone: '#fbbf24' },
              { label: 'Commutator', value: 'half ' + state.halfTurn, tone: '#a78bfa' }
            ], 'shaft · y'),
          h('div', { id: 'mag-motor3d-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { color: d.motor3dStatus === 'error' ? '#fbbf24' : SOFT, fontSize: 11.5, lineHeight: 1.45, margin: '7px 0' } },
            d.motor3dStatus === 'ready' ? 'Scene ready. Drag to orbit, then run the motor or freeze it at a landmark angle.' :
            d.motor3dStatus === 'error' ? h('span', null, '3D graphics did not load. The complete 2D force diagram remains available. ', h('button', { onClick: function () { upd({ motor3dStatus: 'loading', motor3dAttempt: (d.motor3dAttempt || 0) + 1 }); }, style: btn() }, 'Retry 3D')) : 'Loading the 3D motor engine...'),
          poleLegend(state.fieldDirection > 0 ? 'North pole — left, one bright ring' : 'North pole — right, one bright ring', state.fieldDirection > 0 ? 'South pole — right, two bright rings' : 'South pole — left, two bright rings'),
          sceneTextAlternative('mag-motor3d-summary', 'The rotor is at ' + Math.round(state.angle) + ' degrees in half-turn ' + state.halfTurn + '. Magnetic field points from ' + fieldPhrase + '. Conventional current moves ' + currentPhrase + '. The two active sides feel equal opposite forces of about ' + state.force.toFixed(3) + ' newtons. Relative torque is ' + Math.round(state.torquePercent) + ' percent and points in the ' + direction + ' rotation direction. ' + (state.deadSpot ? 'The loop is at a torque dead spot; inertia is needed to carry it through.' : 'The forces form a turning pair around the shaft.')),
          h('div', { role: 'group', 'aria-label': '3D motor camera and visual layers', style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 9 } },
            cameraButton('perspective', 'Perspective'), cameraButton('field', 'Along field'), cameraButton('shaft', 'Along shaft'), cameraButton('commutator', 'Commutator close-up'),
            h('button', { 'aria-pressed': state.showForces ? 'true' : 'false', onClick: function () { upd({ motor3dForces: !state.showForces, motor3dUsed: true }); }, style: btn(state.showForces) }, 'Force + torque vectors: ' + (state.showForces ? 'on' : 'off')),
            h('button', { 'aria-pressed': state.showCurrent ? 'true' : 'false', onClick: function () { upd({ motor3dCurrent: !state.showCurrent, motor3dUsed: true }); }, style: btn(state.showCurrent) }, 'Current + moment vectors: ' + (state.showCurrent ? 'on' : 'off'))),
          h('div', { role: 'group', 'aria-label': 'Freeze rotor at a concept landmark', style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 } },
            h('button', { onClick: function () { setLandmark(0, 'First torque dead spot'); }, style: btn(state.angle === 0) }, '0° · dead spot'),
            h('button', { onClick: function () { setLandmark(90, 'Maximum torque'); }, style: btn(state.angle === 90) }, '90° · maximum torque'),
            h('button', { onClick: function () { setLandmark(180, 'Commutator flip and second dead spot'); }, style: btn(state.angle === 180) }, '180° · commutator flips'),
            h('button', { onClick: function () { setLandmark(270, 'Maximum torque after commutation'); }, style: btn(state.angle === 270) }, '270° · maximum torque')),
          h('div', { className: 'mag-observe', role: 'status' },
            h('span', { 'aria-hidden': 'true' }, state.deadSpot ? '○' : '↻'),
            h('span', null, h('b', null, state.deadSpot ? 'Torque dead spot. ' : 'Turning pair active. '),
              'Blue arrows show B, gold arrows show current and torque, green arrows show the equal opposite wire forces, and the violet arrow is the loop’s magnetic moment. Shape, labels, and direction accompany every color.')));
      }

      function spinMotor() {
        if (_prefersReducedMotion || typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') { return; }
        _motorSpinActive = true;
        if (_motorSpinRAF != null) return;
        var last = null;
        function frame(ts) {
          var cur = _motorSpinConfig;
          if (!_motorSpinActive || !cur.running) { _motorSpinRAF = null; return; }
          if (last == null) last = ts;
          var dt = Math.max(0, Math.min(80, ts - last)); last = ts;
          var spinDir = (cur.currentDir || 1) * (cur.fieldDir || 1) > 0 ? 1 : -1;
          var angleFactor = 0.18 + 0.82 * Math.abs(Math.sin((cur.angle || 0) * Math.PI / 180)); // inertia carries the loop through torque dead spots
          var torqueCapacity = Math.abs(Number(cur.current) || 0) * Math.abs(Number(cur.field) || 0) / 12 * Math.abs(Math.sin((cur.angle || 0) * Math.PI / 180));
          var loadDemand = Math.max(0, Number(cur.load) || 0);
          var loadGate = loadDemand > 0 && torqueCapacity + 1e-6 < loadDemand ? 0 : 1;
          var rate = (Number(cur.current) || 0) * (Number(cur.field) || 0) * 0.02 * angleFactor * loadGate * spinDir;
          var nextAngle = (cur.angle + dt * rate + 360) % 360;
          _motorSpinConfig.angle = nextAngle;
          upd({ motorAngle: nextAngle });
          _motorSpinRAF = window.requestAnimationFrame(frame);
        }
        _motorSpinRAF = window.requestAnimationFrame(frame);
      }
      // ── Induction / Generator (Faraday's law) ─────────────────────────
      function moveInduceMagnet(nx) {
        nx = Math.max(-100, Math.min(100, nx));
        // The slider gesture IS the motion: each change is treated as one
        // time-step, so speed of dragging maps to ΔΦ per step — drag fast,
        // induce more. Held still (no change events) → EMF decays to 0.
        var emf = induceEMF(d.induceTurns, d.induceX, nx, 1, 40) * 4; // display-scaled volts
        var peak = Math.max(d.peakEMF || 0, Math.abs(emf));
        // Rolling scope trace: wiggle the magnet back and forth and the trace
        // you draw IS an AC waveform — that discovery belongs to the student.
        var trace = (d.emfTrace || []).concat([emf]);
        if (trace.length > 72) trace = trace.slice(trace.length - 72);
        upd({ inducePrevX: d.induceX, induceX: nx, lastEMF: emf, peakEMF: peak, emfTrace: trace });
      }

      function runInductionTrial(kind) {
        if (kind === 'still') {
          var stillTrace = (d.emfTrace || []).concat([0]);
          if (stillTrace.length > 72) stillTrace = stillTrace.slice(stillTrace.length - 72);
          upd({ inducePrevX: d.induceX, lastEMF: 0, emfTrace: stillTrace, induceTrialMsg: 'Held still: ΔΦ = 0, so the induced voltage is exactly 0.00 V.' });
          announceToSR('Still-magnet trial: zero induced volts because the flux did not change.');
          return;
        }
        // Same start, finish, turns, and flux change; only elapsed time differs.
        // This isolates the rate term in Faraday's law for a genuine fair test.
        var dt = kind === 'fast' ? 0.25 : 1;
        var emf = induceEMF(d.induceTurns, -60, -20, dt, 40) * 0.04;
        var trialTrace = (d.emfTrace || []).concat([0, emf, 0]);
        if (trialTrace.length > 72) trialTrace = trialTrace.slice(trialTrace.length - 72);
        var trialPeak = Math.max(d.peakEMF || 0, Math.abs(emf));
        var label = kind === 'fast' ? 'Fast' : 'Slow';
        upd({ inducePrevX: -60, induceX: -20, lastEMF: emf, peakEMF: trialPeak, emfTrace: trialTrace,
          induceTrialMsg: label + ' trial: the same flux change in ' + dt.toFixed(2) + ' s produced ' + Math.abs(emf).toFixed(2) + ' V.' });
        announceToSR(label + ' induction trial produced ' + Math.abs(emf).toFixed(2) + ' volts.');
      }

      function induceSVG() {
        var x = d.induceX;                    // −100 (far left) … 0 (in coil) … +100
        var glow = Math.min(1, Math.abs(d.lastEMF) / 2);
        var flux = fluxAt(x, 40);
        return h('svg', { viewBox: '0 0 320 150', width: '100%', style: { maxWidth: 380 }, role: 'img',
          'aria-label': 'A bar magnet at position ' + Math.round(x) + ' near a coil; bulb ' + (glow > 0.15 ? 'glowing' : 'dark') },
          h('rect', { x: 0, y: 0, width: 320, height: 150, fill: INSTRUMENT, rx: 10 }),
          // coil (fixed at centre)
          [0, 1, 2, 3, 4].map(function (i) {
            return h('ellipse', { key: 'c' + i, cx: 140 + i * 12, cy: 75, rx: 6, ry: 26, fill: 'none', stroke: '#f59e0b', strokeWidth: 3 });
          }),
          // flux indicator (how much field threads the coil right now)
          h('rect', { x: 132, y: 44, width: Math.max(2, flux * 64), height: 4, rx: 2, fill: 'rgba(244,63,94,' + (0.25 + flux * 0.6) + ')' }),
          // magnet (rides the slider)
          h('g', { transform: 'translate(' + (160 + x * 1.1) + ',75)' },
            h('rect', { x: -28, y: -10, width: 28, height: 20, fill: '#3b82f6', rx: 2 }),
            h('rect', { x: 0, y: -10, width: 28, height: 20, fill: '#ef4444', rx: 2 }),
            h('text', { x: 14, y: 4, fill: '#fff', fontSize: 11, fontWeight: 800, textAnchor: 'middle' }, 'N'),
            h('text', { x: -14, y: 4, fill: '#fff', fontSize: 11, fontWeight: 800, textAnchor: 'middle' }, 'S')),
          // wires to bulb
          h('path', { d: 'M 140 101 L 140 128 L 60 128', fill: 'none', stroke: '#64748b', strokeWidth: 2 }),
          h('path', { d: 'M 188 101 L 188 136 L 60 136', fill: 'none', stroke: '#64748b', strokeWidth: 2 }),
          // bulb — brightness ∝ EMF magnitude
          h('circle', { cx: 48, cy: 132, r: 12, fill: glow > 0.05 ? 'rgba(251,191,36,' + (0.25 + glow * 0.75) + ')' : '#1f2937', stroke: '#fbbf24', strokeWidth: 1.5 }),
          glow > 0.4 ? h('circle', { cx: 48, cy: 132, r: 18, fill: 'none', stroke: 'rgba(251,191,36,0.4)', strokeWidth: 3 }) : null,
          h('text', { x: 48, y: 136, fill: glow > 0.3 ? '#0b1220' : '#64748b', fontSize: 11, fontWeight: 700, textAnchor: 'middle' }, '💡')
        );
      }

      function induction3DCoil(overrides) {
        overrides = overrides || {};
        return {
          x: 0, y: 0, z: 0,
          radius: overrides.ind3dCoilRadius == null ? d.ind3dCoilRadius : overrides.ind3dCoilRadius,
          yaw: overrides.ind3dCoilYaw == null ? d.ind3dCoilYaw : overrides.ind3dCoilYaw,
          pitch: overrides.ind3dCoilPitch == null ? d.ind3dCoilPitch : overrides.ind3dCoilPitch
        };
      }

      function currentInduction3DState() {
        var magnet = Object.assign({}, d.ind3dMagnet || MAG_DEFAULTS.ind3dMagnet);
        var coil = induction3DCoil();
        var flux = coilFlux3D(magnet, coil);
        return { magnet: magnet, coil: coil, turns: d.ind3dTurns, flux: flux, emf: Number(d.ind3dEMF) || 0, trace: (d.ind3dTrace || []).slice() };
      }

      function appendInduction3DTrace(trace, sample) {
        var next = (trace || []).concat([sample]);
        return next.length > 72 ? next.slice(next.length - 72) : next;
      }

      function commitInduction3D(patch, message) {
        upd(Object.assign({ ind3dUsed: true, compassMoved: true }, patch));
        if (message) announceToSR(message);
      }

      function moveInduction3DMagnet(magnetPatch, message) {
        var previous = Object.assign({}, d.ind3dMagnet || MAG_DEFAULTS.ind3dMagnet);
        var next = Object.assign({}, previous, magnetPatch);
        next.x = Math.max(-3.8, Math.min(3.8, Number(next.x) || 0));
        next.y = Math.max(-2.8, Math.min(2.8, Number(next.y) || 0));
        next.z = Math.max(-2.8, Math.min(2.8, Number(next.z) || 0));
        var coil = induction3DCoil();
        var previousFlux = coilFlux3D(previous, coil);
        var nextFlux = coilFlux3D(next, coil);
        var emf = inducedVoltage3D(d.ind3dTurns, previousFlux, nextFlux, d.ind3dStepTime, 0.0002);
        var trace = appendInduction3DTrace(d.ind3dTrace, { flux: nextFlux, emf: emf, x: next.x });
        commitInduction3D({
          ind3dMagnet: next, ind3dFlux: nextFlux, ind3dEMF: emf, ind3dTrace: trace,
          peakEMF: Math.max(d.peakEMF || 0, Math.abs(emf)), ind3dTrialMsg: ''
        }, message);
      }

      function updateInduction3DSetup(patch, message) {
        var nextValues = Object.assign({}, {
          ind3dCoilRadius: d.ind3dCoilRadius,
          ind3dCoilYaw: d.ind3dCoilYaw,
          ind3dCoilPitch: d.ind3dCoilPitch,
          ind3dTurns: d.ind3dTurns
        }, patch);
        var flux = coilFlux3D(d.ind3dMagnet || MAG_DEFAULTS.ind3dMagnet, induction3DCoil(nextValues));
        commitInduction3D(Object.assign({}, patch, { ind3dFlux: flux, ind3dEMF: 0 }), message);
      }

      function holdInduction3DStill() {
        var state = currentInduction3DState();
        var trace = appendInduction3DTrace(d.ind3dTrace, { flux: state.flux, emf: 0, x: state.magnet.x });
        commitInduction3D({ ind3dFlux: state.flux, ind3dEMF: 0, ind3dTrace: trace, ind3dTrialMsg: 'Held still: flux may be present, but its change is zero, so induced voltage is exactly zero.' }, 'Held the magnet still. The induced voltage is zero.');
      }

      function stopInduction3DPass() {
        _induction3DRunToken++;
        if (_induction3DRAF) window.cancelAnimationFrame(_induction3DRAF);
        _induction3DRAF = null;
        if (d.ind3dRunning) commitInduction3D({ ind3dRunning: false }, 'Stopped the 3D induction trial.');
      }

      function runInduction3DPass(kind) {
        stopInduction3DPass();
        var duration = kind === 'fast' ? 0.5 : 2;
        var direction = kind === 'reverse' ? -1 : 1;
        var magnet = Object.assign({}, d.ind3dMagnet || MAG_DEFAULTS.ind3dMagnet);
        var coil = induction3DCoil();
        var samples = inductionPass3D(magnet, coil, d.ind3dTurns, duration, 49, direction, 0.0002);
        var peak = samples.reduce(function (value, sample) { return Math.max(value, Math.abs(sample.emf)); }, 0);
        var label = kind === 'fast' ? 'Fast 0.50 second pass' : kind === 'reverse' ? 'Reverse 2.00 second pass' : 'Slow 2.00 second pass';
        var token = ++_induction3DRunToken;
        var finishPatch = {
          ind3dMagnet: Object.assign({}, magnet, { x: samples[samples.length - 1].x }),
          ind3dFlux: samples[samples.length - 1].flux, ind3dEMF: 0, ind3dTrace: samples,
          ind3dRunning: false, ind3dUsed: true, genSpeedSeen: true, genPhaseSeen: true,
          peakEMF: Math.max(d.peakEMF || 0, peak),
          ind3dTrialMsg: label + ' reached ' + peak.toFixed(2) + ' relative volts. The voltage changed sign as the flux rose and then fell.'
        };
        if (_prefersReducedMotion || typeof window.requestAnimationFrame !== 'function') {
          commitInduction3D(finishPatch, label + ' result shown without animation. Peak voltage ' + peak.toFixed(2) + '.');
          return;
        }
        commitInduction3D({ ind3dRunning: true, ind3dTrace: [], ind3dTrialMsg: label + ' in progress...' });
        var started = null, playbackMs = kind === 'fast' ? 700 : 1800;
        function frame(timestamp) {
          if (token !== _induction3DRunToken) return;
          if (started == null) started = timestamp;
          var fraction = Math.max(0, Math.min(1, (timestamp - started) / playbackMs));
          var index = Math.min(samples.length - 1, Math.floor(fraction * (samples.length - 1)));
          var sample = samples[index];
          upd({
            ind3dMagnet: Object.assign({}, magnet, { x: sample.x }), ind3dFlux: sample.flux, ind3dEMF: sample.emf,
            ind3dTrace: samples.slice(0, index + 1), ind3dRunning: true, ind3dUsed: true,
            peakEMF: Math.max(d.peakEMF || 0, peak)
          });
          if (fraction >= 1) {
            _induction3DRAF = null;
            commitInduction3D(finishPatch, label + ' complete. Peak voltage ' + peak.toFixed(2) + '.');
          } else {
            _induction3DRAF = window.requestAnimationFrame(frame);
          }
        }
        _induction3DRAF = window.requestAnimationFrame(frame);
      }

      function induction3DGraph() {
        var trace = d.ind3dTrace || [];
        var samples = trace.length ? trace : [{ flux: coilFlux3D(d.ind3dMagnet || MAG_DEFAULTS.ind3dMagnet, induction3DCoil()), emf: Number(d.ind3dEMF) || 0 }];
        var W = 520, H = 190, left = 44, right = 12, topMid = 52, bottomMid = 137;
        var maxFlux = Math.max(0.01, samples.reduce(function (m, p) { return Math.max(m, Math.abs(p.flux)); }, 0));
        var maxEMF = Math.max(0.05, samples.reduce(function (m, p) { return Math.max(m, Math.abs(p.emf)); }, 0));
        function xAt(index) { return left + (samples.length < 2 ? 0 : index / (samples.length - 1) * (W - left - right)); }
        var fluxPoints = samples.map(function (p, i) { return xAt(i).toFixed(1) + ',' + (topMid - p.flux / maxFlux * 29).toFixed(1); });
        var emfPoints = samples.map(function (p, i) { return xAt(i).toFixed(1) + ',' + (bottomMid - p.emf / maxEMF * 29).toFixed(1); });
        var currentFlux = samples[samples.length - 1].flux, currentEMF = samples[samples.length - 1].emf;
        return h('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', style: { display: 'block', margin: '0 auto 9px' }, role: 'img',
          'aria-label': 'Linked magnetic flux and induced voltage graph with ' + samples.length + ' samples. Current flux ' + currentFlux.toFixed(2) + ' and voltage ' + currentEMF.toFixed(2) + '.' },
          h('rect', { x: 0, y: 0, width: W, height: H, rx: 10, fill: INSTRUMENT }),
          h('line', { x1: 9, y1: 12, x2: 27, y2: 12, stroke: '#fb7185', strokeWidth: 2.5 }),
          h('text', { x: 31, y: 16, fill: TEXT, fontSize: 11 }, 'flux Φ · solid'),
          h('line', { x1: 9, y1: 97, x2: 27, y2: 97, stroke: '#fbbf24', strokeWidth: 2.5, strokeDasharray: '5 3' }),
          h('text', { x: 31, y: 101, fill: TEXT, fontSize: 11 }, 'voltage ε · dashed'),
          h('line', { x1: left, y1: topMid, x2: W - right, y2: topMid, stroke: BORDER, strokeWidth: 1 }),
          h('line', { x1: left, y1: bottomMid, x2: W - right, y2: bottomMid, stroke: BORDER, strokeWidth: 1 }),
          h('line', { x1: left, y1: 12, x2: left, y2: 177, stroke: BORDER, strokeWidth: 1 }),
          fluxPoints.length > 1 ? h('polyline', { points: fluxPoints.join(' '), fill: 'none', stroke: '#fb7185', strokeWidth: 2.5, strokeLinejoin: 'round' }) : h('circle', { cx: left, cy: topMid - currentFlux / maxFlux * 29, r: 4, fill: '#fb7185' }),
          emfPoints.length > 1 ? h('polyline', { points: emfPoints.join(' '), fill: 'none', stroke: '#fbbf24', strokeWidth: 2.5, strokeLinejoin: 'round', strokeDasharray: '6 3' }) : h('rect', { x: left - 3.5, y: bottomMid - currentEMF / maxEMF * 29 - 3.5, width: 7, height: 7, fill: '#fbbf24', transform: 'rotate(45 ' + left + ' ' + (bottomMid - currentEMF / maxEMF * 29) + ')' }),
          h('line', { x1: xAt(samples.length - 1), y1: 12, x2: xAt(samples.length - 1), y2: 177, stroke: 'rgba(52,211,153,.55)', strokeWidth: 1, strokeDasharray: '4 3' }),
          h('circle', { cx: xAt(samples.length - 1), cy: topMid - currentFlux / maxFlux * 29, r: 4, fill: INSTRUMENT, stroke: '#fb7185', strokeWidth: 2 }),
          h('rect', { x: xAt(samples.length - 1) - 3.5, y: bottomMid - currentEMF / maxEMF * 29 - 3.5, width: 7, height: 7, fill: INSTRUMENT, stroke: '#fbbf24', strokeWidth: 2, transform: 'rotate(45 ' + xAt(samples.length - 1) + ' ' + (bottomMid - currentEMF / maxEMF * 29) + ')' }),
          h('text', { x: W - right, y: 186, fill: SOFT, fontSize: 11, textAnchor: 'end' }, 'motion samples →'),
          h('text', { x: W - right, y: 17, fill: SOFT, fontSize: 11, textAnchor: 'end' }, 'current ' + currentFlux.toFixed(2)),
          h('text', { x: W - right, y: 102, fill: SOFT, fontSize: 11, textAnchor: 'end' }, 'current ' + currentEMF.toFixed(2)));
      }
      function induction3DCard() {
        var state = currentInduction3DState();
        var magnet = state.magnet, coil = state.coil;
        var flux = state.flux, emf = Number(d.ind3dEMF) || 0;
        var direction = Math.abs(emf) < 0.005 ? 'no induced current while the flux is unchanged' : (emf > 0 ? 'counter-clockwise viewed along the green coil normal' : 'clockwise viewed along the green coil normal');
        function cameraButton(id, label) {
          return h('button', { key: id, onClick: function () { if (_induction3DCanvas && typeof _induction3DCanvas._induction3dSetView === 'function') _induction3DCanvas._induction3dSetView(id); announceToSR(label + ' induction view selected.'); }, style: btn() }, label);
        }
        return card('3D Induction Lab — field through a coil', h('div', null,
          h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } },
            'Move the magnet through a real three-dimensional coil surface. The translucent disk represents the area used to calculate magnetic flux; the gold arrow and bulb appear only while changing flux drives current.'),
          sceneViewport(h('canvas', {
            key: 'induction3d-' + (d.ind3dAttempt || 0), ref: induction3DCanvasRef, className: 'mag-induction3d', role: 'img',
            'aria-label': 'Interactive three-dimensional induction scene with a bar magnet, circular coil surface, field lines, and induced-current indicator.',
            'aria-describedby': 'mag-induction3d-instructions mag-induction3d-status mag-induction3d-summary',
            style: { display: 'block', width: '100%', borderRadius: 10, border: '1px solid ' + BORDER, background: INSTRUMENT, touchAction: 'none' }
          }), [
            { label: 'Magnetic flux', value: flux.toFixed(2) + ' Φ', tone: '#fb7185' },
            { label: 'Induced voltage', value: emf.toFixed(2) + ' V', tone: '#fbbf24' }
          ], '−dΦ / dt'),
          h('div', { id: 'mag-induction3d-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { color: d.ind3dStatus === 'error' ? '#fbbf24' : SOFT, fontSize: 11.5, lineHeight: 1.45, margin: '7px 0' } },
            d.ind3dStatus === 'ready' ? 'Scene ready. Drag to orbit; drag the magnet across the ground plane.' :
            d.ind3dStatus === 'error' ? h('span', null, '3D graphics did not load; every other generator mode remains available. ', h('button', { onClick: function () { upd({ ind3dStatus: 'loading', ind3dAttempt: (d.ind3dAttempt || 0) + 1 }); }, style: btn() }, 'Retry 3D')) : 'Loading the 3D induction engine...'),
          h('p', { id: 'mag-induction3d-instructions', style: { color: SOFT, fontSize: 11.5, margin: '0 0 8px', lineHeight: 1.4 } }, 'Axis key: x passes through the coil, y is height, and z is sideways offset. The green arrow is the coil-area normal used for signed flux. Every pointer action has a labeled control below.'),
          poleLegend('North pole — red; N or one bright stripe', 'South pole — blue; S or two bright stripes'),
          sceneTextAlternative('mag-induction3d-summary', 'The bar magnet is at x ' + magnet.x.toFixed(2) + ', y ' + magnet.y.toFixed(2) + ', z ' + magnet.z.toFixed(2) + '. The coil has ' + d.ind3dTurns + ' turns and radius ' + d.ind3dCoilRadius.toFixed(2) + '. Signed flux is ' + flux.toFixed(2) + ' and induced voltage is ' + emf.toFixed(2) + '. The induced-current interpretation is: ' + direction + '.'),
          h('div', { role: 'group', 'aria-label': '3D induction camera views', style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 9 } },
            h('span', { style: { color: SOFT, fontSize: 11.5, alignSelf: 'center', fontWeight: 700 } }, 'Camera'),
            cameraButton('perspective', 'Perspective'), cameraButton('axis', 'Along coil axis'), cameraButton('side', 'Side'), cameraButton('top', 'Top')),
          induction3DGraph(),
          h('div', { className: 'mag-observe' },
            h('span', { 'aria-hidden': 'true' }, '−dΦ/dt'),
            h('span', null, h('b', null, 'Read the linked curves: '), 'voltage responds to the slope of the flux curve. It peaks where flux changes fastest, crosses zero at a flux extreme, and reverses when the change reverses.')),
          h('section', { 'aria-label': 'Controlled 3D induction trials', style: { marginBottom: 10 } },
            h('div', { style: { color: TEXT, fontSize: 12.5, fontWeight: 800, marginBottom: 6 } }, 'Controlled passage trials'),
            h('p', { style: { color: SOFT, fontSize: 11.5, margin: '0 0 7px', lineHeight: 1.4 } }, 'Predict first: if the path and coil stay identical, which pass should produce the taller voltage peaks?'),
            h('div', { role: 'group', 'aria-label': 'Pass magnet through coil', style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
              h('button', { disabled: d.ind3dRunning, onClick: function () { runInduction3DPass('slow'); }, style: btn() }, 'Slow pass · 2.00 s'),
              h('button', { disabled: d.ind3dRunning, onClick: function () { runInduction3DPass('fast'); }, style: btn(true) }, 'Fast pass · 0.50 s'),
              h('button', { disabled: d.ind3dRunning, onClick: function () { runInduction3DPass('reverse'); }, style: btn() }, 'Reverse pass'),
              h('button', { disabled: d.ind3dRunning, onClick: holdInduction3DStill, style: btn() }, 'Hold still'),
              d.ind3dRunning ? h('button', { onClick: stopInduction3DPass, style: btn() }, 'Stop trial') : null),
            d.ind3dTrialMsg ? h('p', { role: 'status', style: { color: TEXT, fontSize: 12, margin: '7px 0 0', lineHeight: 1.45 } }, d.ind3dTrialMsg) : null),
          h('div', { className: 'mag-sim-grid', style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12, alignItems: 'start' } },
            h('section', { 'aria-label': 'Three-dimensional magnet controls' },
              h('div', { style: { color: TEXT, fontSize: 12.5, fontWeight: 800, marginBottom: 7 } }, 'Move and rotate the magnet'),
              slider('Magnet x', magnet.x, -3.6, 3.6, 0.2, function (v) { moveInduction3DMagnet({ x: v }); }),
              slider('Magnet y', magnet.y, -2, 2, 0.2, function (v) { moveInduction3DMagnet({ y: v }); }),
              slider('Magnet z', magnet.z, -2, 2, 0.2, function (v) { moveInduction3DMagnet({ z: v }); }),
              slider('Magnet yaw', Math.round((magnet.yaw || 0) * 180 / Math.PI), -180, 180, 15, function (v) { moveInduction3DMagnet({ yaw: v * Math.PI / 180 }); }),
              h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 9 } },
                h('button', { onClick: function () { moveInduction3DMagnet({ pitch: Math.max(-Math.PI / 2, (magnet.pitch || 0) - Math.PI / 12) }, 'Tilted the magnet down 15 degrees.'); }, style: btn() }, 'Pitch −15°'),
                h('button', { onClick: function () { moveInduction3DMagnet({ pitch: Math.min(Math.PI / 2, (magnet.pitch || 0) + Math.PI / 12) }, 'Tilted the magnet up 15 degrees.'); }, style: btn() }, 'Pitch +15°'),
                h('button', { onClick: function () { moveInduction3DMagnet({ polarity: magnet.polarity < 0 ? 1 : -1 }, 'Flipped the magnet poles; signed flux and voltage reversed.'); }, style: btn() }, 'Flip poles')),
              slider('Time per manual step (s)', d.ind3dStepTime, 0.1, 1.5, 0.1, function (v) { upd({ ind3dStepTime: v, ind3dUsed: true }); })),
            h('section', { 'aria-label': 'Three-dimensional coil controls' },
              h('div', { style: { color: TEXT, fontSize: 12.5, fontWeight: 800, marginBottom: 7 } }, 'Set the coil before a trial'),
              slider('Coil turns (N)', d.ind3dTurns, 10, 200, 10, function (v) { updateInduction3DSetup({ ind3dTurns: v }); }),
              slider('Coil radius', d.ind3dCoilRadius, 0.7, 1.8, 0.1, function (v) { updateInduction3DSetup({ ind3dCoilRadius: v }); }),
              slider('Coil yaw', Math.round((d.ind3dCoilYaw || 0) * 180 / Math.PI), -90, 90, 15, function (v) { updateInduction3DSetup({ ind3dCoilYaw: v * Math.PI / 180 }); }),
              slider('Coil pitch', Math.round((d.ind3dCoilPitch || 0) * 180 / Math.PI), -75, 75, 15, function (v) { updateInduction3DSetup({ ind3dCoilPitch: v * Math.PI / 180 }); }),
              h('div', { className: 'mag-observe', role: 'status' },
                h('span', { 'aria-hidden': 'true' }, 'Φ'),
                h('span', null,
                  h('b', null, 'Flux ' + flux.toFixed(2) + ' · voltage ' + emf.toFixed(2) + ' relative V'),
                  h('br'), 'Current: ' + direction + '.',
                  h('br'), Math.abs(emf) < 0.005 ? 'A field alone is not enough: the flux must change.' : 'The gold arrow shows the induced direction; its field opposes the flux change.')))
          ),
          disclosure('The coil flux is a numerical surface integral of a softened dipole field. Softening represents the finite magnet body and keeps the model finite during a pass. Values are relative, but Faraday’s law, the sign reversal, orientation effects, turns scaling, and inverse-time scaling are preserved.')
        ), '#f59e0b');
      }
      function initInduction3DCanvas(cv) {
        if (!cv || cv._induction3dInit) return;
        if (!window.StemLab || typeof window.StemLab.ensureThree !== 'function') return;
        cv._induction3dInit = true;
        window.StemLab.ensureThree({ orbit: true, orbitRequired: true, failMessage: 'The 3D induction engine could not load. The hand-generator and rotating-coil investigations remain available.' })
          .then(function (THREE) {
            if (!cv.isConnected) { cv._induction3dInit = false; return; }
            var renderer;
            try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, powerPreference: 'high-performance' }); }
            catch (error) { cv._induction3dInit = false; upd({ ind3dStatus: 'error' }); return; }
            var scene = new THREE.Scene();
            var backgroundColor = new THREE.Color(0x07111f);
            try {
              var themeBackground = window.getComputedStyle(cv).getPropertyValue('--allo-stem-instrument').trim();
              if (themeBackground) backgroundColor.setStyle(themeBackground);
            } catch (themeError) {}
            scene.background = backgroundColor;
            scene.fog = new THREE.FogExp2(backgroundColor.getHex(), 0.032);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
            if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
            var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 70);
            camera.position.set(7.5, 4.8, 7.2);
            var controls = new THREE.OrbitControls(camera, cv);
            controls.enableDamping = false; controls.minDistance = 5; controls.maxDistance = 20;
            controls.target.set(0, 0, 0);
            scene.add(new THREE.HemisphereLight(0xdbeafe, 0x172554, 1.25));
            var keyLight = new THREE.DirectionalLight(0xffffff, 1.25); keyLight.position.set(5, 8, 6); scene.add(keyLight);
            var rimLight = new THREE.PointLight(0xf59e0b, 1.25, 20); rimLight.position.set(-4, 2, 5); scene.add(rimLight);
            var grid = new THREE.GridHelper(9, 18, 0x64748b, 0x334155); grid.material.transparent = true; grid.material.opacity = 0.3; scene.add(grid);
            var axes = new THREE.AxesHelper(3.8); axes.material.transparent = true; axes.material.opacity = 0.45; scene.add(axes);
            var dynamicGroup = new THREE.Group(); scene.add(dynamicGroup);
            var liveState = cv._induction3dState || currentInduction3DState();
            var raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
            var magnetGroup = null, dragMagnet = false, dragTrace = [], resizeObserver = null, disposed = false;

            function disposeObject(obj) {
              obj.traverse(function (child) {
                if (child.geometry && child.geometry.dispose) child.geometry.dispose();
                if (child.material) (Array.isArray(child.material) ? child.material : [child.material]).forEach(function (material) { if (material && material.dispose) material.dispose(); });
              });
            }
            function clearDynamic() {
              while (dynamicGroup.children.length) {
                var child = dynamicGroup.children[dynamicGroup.children.length - 1];
                dynamicGroup.remove(child); disposeObject(child);
              }
            }
            function resize() {
              var width = Math.max(1, cv.clientWidth || 680), height = Math.max(1, cv.clientHeight || 410);
              renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
            }
            function renderScene() { if (!disposed) { resize(); renderer.render(scene, camera); } }
            function addArrow(group, origin, vector, color, length, opacity) {
              var magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
              if (magnitude < 1e-10) return;
              var arrow = new THREE.ArrowHelper(new THREE.Vector3(vector.x, vector.y, vector.z).normalize(), origin, length, color, Math.min(0.22, length * 0.3), Math.min(0.13, length * 0.18));
              arrow.line.material.transparent = true; arrow.line.material.opacity = opacity;
              arrow.cone.material.transparent = true; arrow.cone.material.opacity = opacity;
              group.add(arrow);
            }
            function momentVector(magnet, polarity) {
              var copy = Object.assign({}, magnet, { strength: 1, polarity: polarity ? magnet.polarity : 1 });
              var m = dipoleMoment3D(copy);
              return new THREE.Vector3(m.x, m.y, m.z).normalize();
            }
            function coilNormalVector(coil) {
              var n = coilNormal3D(coil); return new THREE.Vector3(n.x, n.y, n.z).normalize();
            }
            function basisFor(normal) {
              var helper = Math.abs(normal.y) < 0.85 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
              var u = new THREE.Vector3().crossVectors(normal, helper).normalize();
              var v = new THREE.Vector3().crossVectors(normal, u).normalize();
              return { u: u, v: v };
            }
            function buildMagnet(state) {
              var magnet = state.magnet;
              magnetGroup = new THREE.Group();
              magnetGroup.position.set(magnet.x, magnet.y, magnet.z);
              magnetGroup.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), momentVector(magnet, false));
              var northColor = magnet.polarity < 0 ? 0x3b82f6 : 0xef4444;
              var southColor = magnet.polarity < 0 ? 0xef4444 : 0x3b82f6;
              var north = new THREE.Mesh(new THREE.BoxGeometry(1, 0.62, 0.62), new THREE.MeshStandardMaterial({ color: northColor, roughness: 0.35, metalness: 0.4, emissive: northColor, emissiveIntensity: 0.12 }));
              var south = new THREE.Mesh(new THREE.BoxGeometry(1, 0.62, 0.62), new THREE.MeshStandardMaterial({ color: southColor, roughness: 0.35, metalness: 0.4, emissive: southColor, emissiveIntensity: 0.12 }));
              north.position.x = 0.5; south.position.x = -0.5;
              north.userData.inductionMagnet = true; south.userData.inductionMagnet = true;
              magnetGroup.add(north); magnetGroup.add(south);
              var northSide = magnet.polarity < 0 ? -1 : 1;
              var stripeMaterial = new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.94 });
              [northSide * 0.82, -northSide * 0.72, -northSide * 0.90].forEach(function (x, stripeIndex) {
                var stripe = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.69, 0.69), stripeMaterial);
                stripe.position.x = x;
                stripe.userData.inductionMagnet = true;
                stripe.userData.poleStripe = stripeIndex === 0 ? 'north-one' : 'south-two';
                magnetGroup.add(stripe);
              });
              dynamicGroup.add(magnetGroup);
            }
            function buildFieldLines(state) {
              var magnet = state.magnet, moment = momentVector(magnet, true);
              var north = new THREE.Vector3(magnet.x, magnet.y, magnet.z).add(moment.clone().multiplyScalar(1.05));
              var basis = basisFor(moment);
              for (var seedIndex = 0; seedIndex < 12; seedIndex++) {
                var angle = seedIndex / 12 * Math.PI * 2;
                var seed = north.clone().add(basis.u.clone().multiplyScalar(Math.cos(angle) * 0.3)).add(basis.v.clone().multiplyScalar(Math.sin(angle) * 0.3));
                var traced = traceLine3D({ x: seed.x, y: seed.y, z: seed.z }, [magnet], 1, { step: 0.13, maxSteps: 180, bound: 6.2, bodyR: 0.42 });
                if (traced.length < 3) continue;
                var points = traced.map(function (p) { return new THREE.Vector3(p.x, p.y, p.z); });
                dynamicGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.46 })));
              }
            }
            function buildCoil(state) {
              var coil = state.coil, normal = coilNormalVector(coil), basis = basisFor(normal), center = new THREE.Vector3(coil.x, coil.y, coil.z);
              var quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
              var visibleTurns = 5 + Math.round(Math.max(0, Math.min(190, state.turns - 10)) / 190 * 7);
              for (var turn = 0; turn < visibleTurns; turn++) {
                var offset = (turn - (visibleTurns - 1) / 2) * 0.055;
                var ring = new THREE.Mesh(new THREE.TorusGeometry(coil.radius, 0.034, 10, 52), new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.18, roughness: 0.4, metalness: 0.55 }));
                ring.quaternion.copy(quaternion); ring.position.copy(center).add(normal.clone().multiplyScalar(offset)); dynamicGroup.add(ring);
              }
              var fluxStrength = Math.min(1, Math.abs(state.flux) / 8);
              var fluxColor = Math.abs(state.flux) < 0.01 ? 0x64748b : state.flux > 0 ? 0xfb7185 : 0x38bdf8;
              var disk = new THREE.Mesh(new THREE.CircleGeometry(coil.radius * 0.94, 52), new THREE.MeshBasicMaterial({ color: fluxColor, transparent: true, opacity: 0.08 + fluxStrength * 0.25, side: THREE.DoubleSide, depthWrite: false }));
              disk.quaternion.copy(quaternion); disk.position.copy(center); dynamicGroup.add(disk);
              addArrow(dynamicGroup, center, normal, 0x34d399, 1.0, 0.92);
              [-0.55, 0, 0.55].forEach(function (a) {
                [-0.55, 0, 0.55].forEach(function (b) {
                  if (Math.hypot(a, b) > 0.82) return;
                  var point = center.clone().add(basis.u.clone().multiplyScalar(a * coil.radius)).add(basis.v.clone().multiplyScalar(b * coil.radius));
                  var field = dipoleFieldAt3D(point.x, point.y, point.z, state.magnet);
                  addArrow(dynamicGroup, point, field, 0x38bdf8, 0.42, 0.7);
                });
              });
              if (Math.abs(state.emf) > 0.005) {
                var tangent = basis.v.clone().multiplyScalar(state.emf > 0 ? 1 : -1);
                var arrowPoint = center.clone().add(basis.u.clone().multiplyScalar(coil.radius * 1.08)).add(tangent.clone().multiplyScalar(-0.3));
                addArrow(dynamicGroup, arrowPoint, tangent, 0xfbbf24, 0.62, 1);
              }
              var leadPoints = [
                center.clone().add(basis.v.clone().multiplyScalar(-coil.radius)),
                new THREE.Vector3(0, -1.7, 1.8), new THREE.Vector3(0, -1.7, 2.35)
              ];
              dynamicGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(leadPoints), new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.75 })));
              var glow = Math.min(1, Math.abs(state.emf) / 3);
              var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.23, 20, 14), new THREE.MeshStandardMaterial({ color: glow > 0.03 ? 0xfbbf24 : 0x475569, emissive: 0xfbbf24, emissiveIntensity: glow * 3.5, transparent: true, opacity: 0.65 + glow * 0.35 }));
              bulb.position.set(0, -1.7, 2.55); dynamicGroup.add(bulb);
            }
            function rebuild(state) {
              if (disposed) return;
              liveState = {
                magnet: Object.assign({}, state.magnet), coil: Object.assign({}, state.coil), turns: state.turns,
                flux: state.flux, emf: state.emf, trace: (state.trace || []).slice()
              };
              clearDynamic(); buildFieldLines(liveState); buildCoil(liveState); buildMagnet(liveState); renderScene();
            }
            function setPointer(event) {
              var rect = cv.getBoundingClientRect();
              pointer.x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
              pointer.y = -((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
              raycaster.setFromCamera(pointer, camera);
            }
            function intersectPlane(event, y) {
              setPointer(event); dragPlane.set(new THREE.Vector3(0, 1, 0), -y);
              var point = new THREE.Vector3(); return raycaster.ray.intersectPlane(dragPlane, point) ? point : null;
            }
            function onPointerDown(event) {
              setPointer(event);
              var hits = magnetGroup ? raycaster.intersectObjects(magnetGroup.children, true) : [];
              if (!hits.length || !hits[0].object.userData.inductionMagnet) return;
              dragMagnet = true; dragTrace = (liveState.trace || []).slice(); controls.enabled = false;
              try { cv.setPointerCapture(event.pointerId); } catch (e) {}
            }
            function onPointerMove(event) {
              if (!dragMagnet) return;
              var point = intersectPlane(event, liveState.magnet.y); if (!point) return;
              var previousFlux = liveState.flux;
              liveState.magnet.x = Math.max(-3.8, Math.min(3.8, point.x));
              liveState.magnet.z = Math.max(-2.8, Math.min(2.8, point.z));
              liveState.flux = coilFlux3D(liveState.magnet, liveState.coil);
              liveState.emf = inducedVoltage3D(liveState.turns, previousFlux, liveState.flux, d.ind3dStepTime, 0.0002);
              dragTrace = appendInduction3DTrace(dragTrace, { flux: liveState.flux, emf: liveState.emf, x: liveState.magnet.x });
              liveState.trace = dragTrace; rebuild(liveState);
            }
            function onPointerUp(event) {
              if (!dragMagnet) return;
              dragMagnet = false; controls.enabled = true;
              try { cv.releasePointerCapture(event.pointerId); } catch (e) {}
              var peak = dragTrace.reduce(function (value, sample) { return Math.max(value, Math.abs(sample.emf)); }, d.peakEMF || 0);
              if (cv._induction3dCommit) cv._induction3dCommit({ ind3dMagnet: liveState.magnet, ind3dFlux: liveState.flux, ind3dEMF: liveState.emf, ind3dTrace: dragTrace, peakEMF: peak }, 'Moved the magnet through the 3D coil field.');
            }
            function onContextLost(event) { event.preventDefault(); upd({ ind3dStatus: 'error', ind3dRunning: false }); announceToSR('The 3D induction graphics context was lost. Other generator modes remain available.'); }
            function setView(view) {
              if (view === 'axis') camera.position.set(8.5, 0.5, 0.01);
              else if (view === 'top') camera.position.set(0.01, 10, 0.01);
              else if (view === 'side') camera.position.set(0.01, 2, 10);
              else camera.position.set(7.5, 4.8, 7.2);
              controls.target.set(0, 0, 0); camera.lookAt(controls.target); controls.update(); renderScene();
            }
            function cleanup() {
              if (disposed) return; disposed = true;
              cv.removeEventListener('pointerdown', onPointerDown); cv.removeEventListener('pointermove', onPointerMove);
              cv.removeEventListener('pointerup', onPointerUp); cv.removeEventListener('pointercancel', onPointerUp);
              cv.removeEventListener('webglcontextlost', onContextLost); controls.removeEventListener('change', renderScene);
              window.removeEventListener('resize', renderScene); controls.dispose(); if (resizeObserver) resizeObserver.disconnect();
              clearDynamic(); renderer.dispose();
              _induction3DRunToken++; if (_induction3DRAF) window.cancelAnimationFrame(_induction3DRAF); _induction3DRAF = null;
              cv._induction3dInit = false; cv._induction3dUpdate = null; cv._induction3dCleanup = null;
            }
            cv.addEventListener('pointerdown', onPointerDown); cv.addEventListener('pointermove', onPointerMove);
            cv.addEventListener('pointerup', onPointerUp); cv.addEventListener('pointercancel', onPointerUp);
            cv.addEventListener('webglcontextlost', onContextLost); controls.addEventListener('change', renderScene);
            if (typeof ResizeObserver !== 'undefined') { resizeObserver = new ResizeObserver(renderScene); resizeObserver.observe(cv); }
            else window.addEventListener('resize', renderScene, { passive: true });
            cv._induction3dUpdate = rebuild; cv._induction3dSetView = setView; cv._induction3dCleanup = cleanup;
            rebuild(liveState); upd({ ind3dStatus: 'ready' });
          }).catch(function () {
            cv._induction3dInit = false;
            if (cv.isConnected) { upd({ ind3dStatus: 'error', ind3dRunning: false }); announceToSR('The 3D induction engine could not load. Use another generator investigation or retry.'); }
          });
      }

      function induction3DCanvasRef(cv) {
        if (!cv) {
          var oldCanvas = _induction3DCanvas;
          window.setTimeout(function () { if (oldCanvas && !oldCanvas.isConnected && typeof oldCanvas._induction3dCleanup === 'function') oldCanvas._induction3dCleanup(); }, 0);
          return;
        }
        _induction3DCanvas = cv; cv._induction3dState = currentInduction3DState(); cv._induction3dCommit = commitInduction3D;
        if (typeof cv._induction3dUpdate === 'function') cv._induction3dUpdate(cv._induction3dState); else initInduction3DCanvas(cv);
      }
      function induceModeNav() {
        var modes = [
          { id: 'hand', label: '🧲 Hand generator', note: 'move a magnet' },
          { id: 'coil', label: '〰️ Rotating coil', note: 'speed and phase' },
          { id: '3d', label: '3D induction', note: 'flux through a coil' },
          { id: 'eddy', label: '🟠 Eddy currents', note: 'Lenz force' }
        ];
        return h('div', { role: 'group', 'aria-label': 'Generator investigation mode', style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 } },
          modes.map(function (m) {
            var on = d.induceMode === m.id;
            return h('button', { key: m.id, 'aria-pressed': on ? 'true' : 'false', onClick: function () {
              if (d.induceMode === m.id) return;
              if (d.induceMode === '3d') stopInduction3DPass();
              upd(Object.assign({ induceMode: m.id }, m.id === '3d' ? { ind3dStatus: 'loading', ind3dUsed: true } : {}));
              announceToSR(m.label + ' mode');
            }, style: btn(on) }, m.label + ' · ' + m.note);
          }));
      }

      function induceTab() {
        var emfAbs = Math.abs(d.lastEMF);
        var lenz = d.lastEMF === 0 ? '—' : (d.lastEMF > 0 ? 'counter-clockwise (opposing the rising flux)' : 'clockwise (opposing the falling flux)');
        return h('div', null,
          induceModeNav(),
          d.induceMode === 'hand' ? card('Make electricity — the generator', h('div', null,
            h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } }, 'The motor’s mirror twin. ', h('b', null, 'Move'), ' the magnet through the coil and the changing flux pushes charge through the wire: ', h('b', null, 'ε = −N·ΔΦ/Δt'), '. Drag fast for a bright flash; hold still and you get exactly nothing.'),
            h('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 10 } }, induceSVG()),
            h('div', { style: { marginBottom: 10 } },
              h('label', { htmlFor: 'mag-hand-generator-position', style: { display: 'flex', justifyContent: 'space-between', color: TEXT, fontSize: 13, fontWeight: 600, marginBottom: 4 } },
                h('span', null, 'Magnet position — drag it through the coil'), h('span', { style: { color: TEXT, fontVariantNumeric: 'tabular-nums' } }, String(Math.round(d.induceX)))),
              h('input', { id: 'mag-hand-generator-position', type: 'range', min: -100, max: 100, step: 2, value: d.induceX,
                'aria-valuetext': 'Magnet position relative to the coil: ' + String(Math.round(d.induceX)),
                onChange: function (e) { moveInduceMagnet(parseFloat(e.target.value)); },
                style: { width: '100%', accentColor: ACTIVE } })),
            slider('Turns on the coil (N)', d.induceTurns, 10, 200, 10, function (v) { upd({ induceTurns: v }); }),
            h('div', { className: 'mag-observe' },
              h('span', { 'aria-hidden': 'true' }, '⏱️'),
              h('div', null,
                h('b', null, 'Fair speed test: same 40-unit move, same coil, different time.'),
                h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 7 } },
                  h('button', { onClick: function () { runInductionTrial('slow'); }, style: btn() }, 'Slow · 1.00 s'),
                  h('button', { onClick: function () { runInductionTrial('fast'); }, style: btn(true) }, 'Fast · 0.25 s'),
                  h('button', { onClick: function () { runInductionTrial('still'); }, style: btn() }, 'Hold still')),
                d.induceTrialMsg ? h('span', { role: 'status', style: { display: 'block', marginTop: 6, color: TEXT } }, d.induceTrialMsg) : null)),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 } },
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' } },
                h('div', { style: { color: SOFT, fontSize: 11 } }, 'EMF right now'),
                h('div', { style: { color: TEXT, fontSize: 16, fontWeight: 800 } }, emfAbs.toFixed(2) + ' V'),
                h('div', { style: { color: SOFT, fontSize: 10.5 } }, emfAbs < 0.01 ? 'still magnet = zero volts' : 'induced by the change')),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)' } },
                h('div', { style: { color: SOFT, fontSize: 11 } }, 'Best flash so far'),
                h('div', { style: { color: TEXT, fontSize: 16, fontWeight: 800 } }, (d.peakEMF || 0).toFixed(2) + ' V'),
                h('div', { style: { color: SOFT, fontSize: 10.5 } }, (d.peakEMF || 0) >= 0.5 ? '✓ generator quest earned' : 'target: 0.50 V'))),
            h('div', { style: { color: SOFT, fontSize: 12, lineHeight: 1.5 } },
              h('b', { style: { color: TEXT } }, 'Lenz’s law: '), 'the induced current flows ', lenz, ' — nature resists the change, which is why generators take real effort to crank.')
          ), '#fbbf24') : null,
          d.induceMode === 'hand' ? scopeCard() : null,
          d.induceMode === 'coil' ? rotatingGeneratorCard() : null,
          d.induceMode === '3d' ? induction3DCard() : null,
          d.induceMode === 'eddy' ? eddyCard() : null,
          card('Why this runs the world', h('p', { style: { color: SOFT, fontSize: 13, margin: 0, lineHeight: 1.5 } },
            'Nearly every power plant — coal, gas, nuclear, hydro, wind — is just something spinning a magnet near coils. Only solar panels make electricity without this trick. The motor and generator are the same machine run in opposite directions.'), '#fbbf24'),
          disclosure('The hand-generator flux curve is a smooth schematic model. The 3D mode instead integrates field through a coil surface using a finite-magnet approximation. Values are display-scaled; Faraday law, zero voltage for unchanged flux, Lenz-law sign, turns scaling, and speed scaling remain physically faithful.')
        );
      }

      // ── Rotating-coil generator: phase, speed, and frequency ─────────
      function rotatingGeneratorCard() {
        var phase = rotatingPhaseState(d.genAngle, d.genTurns, d.genField, d.genRPM);
        var angle = phase.angle;
        var speedFactor = phase.speedFactor;
        var frequency = phase.frequencyHz;
        var flux = phase.flux;
        var emf = phase.emf;
        var fluxAmplitude = Math.max(1e-9, phase.fluxAmplitude);
        var emfAmplitude = Math.max(1e-9, phase.emfAmplitude);
        var fluxNorm = phase.fluxNorm;
        var emfNorm = phase.emfNorm;
        var voltagePlotScale = Math.min(1, d.genRPM / 180);
        var fluxPts = [], emfPts = [];
        for (var ga = 0; ga <= 360; ga += 6) {
          var gx = 176 + ga / 360 * 136;
          fluxPts.push(gx.toFixed(1) + ',' + (72 - Math.cos(ga * Math.PI / 180) * 25).toFixed(1));
          emfPts.push(gx.toFixed(1) + ',' + (148 - Math.sin(ga * Math.PI / 180) * 25 * voltagePlotScale).toFixed(1));
        }
        var cursorX = 176 + angle / 360 * 136;
        var normalX = 80 + Math.cos(angle * Math.PI / 180) * 44;
        var normalY = 100 + Math.sin(angle * Math.PI / 180) * 44;
        var phaseNote = d.genRPM === 0
          ? 'The coil is stopped: flux can exist, but it is not changing, so induced voltage is exactly zero.'
          : Math.abs(emfNorm) < 0.05
            ? 'Flux is at an extreme, but it is momentarily changing least: induced voltage is near zero.'
          : Math.abs(fluxNorm) < 0.05
            ? 'Flux crosses zero while changing fastest: induced voltage is near its maximum.'
            : 'Flux and voltage are a quarter-cycle apart; watch one peak when the other crosses zero.';
        var phaseCx = 72, phaseCy = 92, phaseR = 52;
        var phaseRad = angle * Math.PI / 180;
        var phaseRayX = phaseCx + Math.cos(phaseRad) * phaseR;
        var phaseRayY = phaseCy - Math.sin(phaseRad) * phaseR;
        var fluxMeterX = 374 + phase.fluxNorm * 72;
        var emfMeterX = 374 + phase.emfNorm * 72;
        return card('Rotating-coil generator — see the phase shift', h('div', null,
          h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } },
            'Turn the coil through one revolution. The magnetic flux follows ', h('b', null, 'cos θ'), ', while generated voltage follows ', h('b', null, 'sin θ'), ' because voltage depends on how fast the flux changes—not simply how much flux exists.'),
          h('svg', { viewBox: '0 0 320 190', width: '100%', style: { maxWidth: 560, display: 'block', margin: '0 auto 10px' }, role: 'img',
            'aria-label': 'Rotating coil at ' + angle + ' degrees and ' + d.genRPM + ' revolutions per minute. Relative flux ' + flux.toFixed(0) + ' and induced voltage ' + emf.toFixed(0) + ', shown on quarter-cycle-shifted graphs' },
            h('rect', { x: 0, y: 0, width: 320, height: 190, fill: INSTRUMENT, rx: 10 }),
            h('text', { x: 80, y: 16, fill: SOFT, fontSize: 11, textAnchor: 'middle' }, 'coil inside uniform field'),
            [68, 100, 132].map(function (yy, i) {
              return h('g', { key: 'gb' + i },
                h('line', { x1: 12, y1: yy, x2: 148, y2: yy, stroke: 'rgba(56,189,248,.35)', strokeWidth: 1.5 }),
                h('polygon', { points: '148,' + yy + ' 139,' + (yy - 4) + ' 139,' + (yy + 4), fill: 'rgba(56,189,248,.60)' }));
            }),
            h('text', { x: 18, y: 59, fill: TEXT, fontSize: 11 }, 'B field'),
            h('path', { d: 'M 46 50 Q 80 27 114 50', fill: 'none', stroke: '#fbbf24', strokeWidth: 2 }),
            h('polygon', { points: '114,50 104,45 108,56', fill: '#fbbf24' }),
            h('text', { x: 80, y: 38, fill: TEXT, fontSize: 11, textAnchor: 'middle' }, 'rotation ω'),
            h('g', { transform: 'translate(80,100) rotate(' + angle + ')' },
              h('ellipse', { cx: 0, cy: 0, rx: 8, ry: 39, fill: 'rgba(245,158,11,.10)', stroke: '#f59e0b', strokeWidth: 4 }),
              h('line', { x1: -8, y1: -39, x2: -8, y2: 39, stroke: '#fbbf24', strokeWidth: 1 }),
              h('line', { x1: 8, y1: -39, x2: 8, y2: 39, stroke: '#fbbf24', strokeWidth: 1 })),
            h('line', { x1: 80, y1: 100, x2: normalX, y2: normalY, stroke: '#34d399', strokeWidth: 2.5 }),
            h('circle', { cx: normalX, cy: normalY, r: 3, fill: '#34d399' }),
            h('text', { x: normalX + 5, y: normalY - 4, fill: '#34d399', fontSize: 11 }, 'normal'),
            h('text', { x: 80, y: 164, fill: '#fbbf24', fontSize: 11, textAnchor: 'middle' }, 'θ = ' + angle + '°'),
            h('line', { x1: 160, y1: 18, x2: 160, y2: 174, stroke: '#334155' }),
            h('line', { x1: 176, y1: 20, x2: 191, y2: 20, stroke: '#f43f5e', strokeWidth: 2 }),
            h('text', { x: 196, y: 24, fill: TEXT, fontSize: 11 }, 'flux Φ · cos θ · solid'),
            h('line', { x1: 176, y1: 72, x2: 312, y2: 72, stroke: '#334155', strokeDasharray: '3 3' }),
            h('polyline', { points: fluxPts.join(' '), fill: 'none', stroke: '#f43f5e', strokeWidth: 2 }),
            h('line', { x1: 176, y1: 108, x2: 191, y2: 108, stroke: '#fbbf24', strokeWidth: 2, strokeDasharray: '5 3' }),
            h('text', { x: 196, y: 112, fill: TEXT, fontSize: 11 }, 'voltage ε · sin θ · dashed'),
            h('line', { x1: 176, y1: 148, x2: 312, y2: 148, stroke: '#334155', strokeDasharray: '3 3' }),
            h('polyline', { points: emfPts.join(' '), fill: 'none', stroke: '#fbbf24', strokeWidth: 2, strokeDasharray: '6 3' }),
            h('line', { x1: cursorX, y1: 34, x2: cursorX, y2: 176, stroke: 'rgba(52,211,153,.55)', strokeDasharray: '3 3' }),
            h('circle', { cx: cursorX, cy: 72 - fluxNorm * 25, r: 4, fill: INSTRUMENT, stroke: '#f43f5e', strokeWidth: 2 }),
            h('rect', { x: cursorX - 3.5, y: 148 - emfNorm * 25 * voltagePlotScale - 3.5, width: 7, height: 7, fill: INSTRUMENT, stroke: '#fbbf24', strokeWidth: 2, transform: 'rotate(45 ' + cursorX + ' ' + (148 - emfNorm * 25 * voltagePlotScale) + ')' }),
            h('text', { x: 176, y: 184, fill: SOFT, fontSize: 11 }, '0°'),
            h('text', { x: 312, y: 184, fill: SOFT, fontSize: 11, textAnchor: 'end' }, '360°')),
          h('svg', { viewBox: '0 0 520 192', width: '100%', style: { maxWidth: 760, display: 'block', margin: '0 auto 9px' }, role: 'img', 'aria-label': 'Phase wheel at ' + angle + ' degrees. Flux is ' + phase.fluxNorm.toFixed(2) + ' of its amplitude and voltage is ' + phase.emfNorm.toFixed(2) + ' of its amplitude. The two signals are separated by a 90 degree phase gap.' },
            h('rect', { x: 0, y: 0, width: 520, height: 192, rx: 10, fill: INSTRUMENT }),
            h('text', { x: 260, y: 17, fill: TEXT, fontSize: 11.5, fontWeight: 800, textAnchor: 'middle' }, 'PHASE WHEEL · Φ = cos θ  /  ε = sin θ'),
            h('circle', { cx: phaseCx, cy: phaseCy, r: phaseR, fill: 'none', stroke: BORDER, strokeWidth: 1.5 }),
            h('line', { x1: phaseCx - phaseR - 8, y1: phaseCy, x2: phaseCx + phaseR + 8, y2: phaseCy, stroke: BORDER }),
            h('line', { x1: phaseCx, y1: phaseCy - phaseR - 8, x2: phaseCx, y2: phaseCy + phaseR + 8, stroke: BORDER }),
            h('line', { x1: phaseCx, y1: phaseCy, x2: phaseRayX, y2: phaseRayY, stroke: '#fbbf24', strokeWidth: 3, strokeLinecap: 'round' }),
            h('circle', { cx: phaseRayX, cy: phaseRayY, r: 4.5, fill: INSTRUMENT, stroke: '#fbbf24', strokeWidth: 2 }),
            h('text', { x: phaseCx, y: 38, fill: SOFT, fontSize: 10.5, textAnchor: 'middle' }, 'θ = ' + angle.toFixed(0) + '°'),
            h('text', { x: phaseCx + phaseR + 10, y: phaseCy + 4, fill: SOFT, fontSize: 10.5 }, 'Φ max'),
            h('text', { x: phaseCx + 4, y: phaseCy - phaseR - 10, fill: SOFT, fontSize: 10.5 }, 'ε max'),
            h('text', { x: 72, y: 171, fill: SOFT, fontSize: 10.5, textAnchor: 'middle' }, phase.stopped ? 'stopped: ε = 0' : 'angle marker'),
            h('text', { x: 248, y: 58, fill: '#fda4af', fontSize: 11, fontWeight: 800 }, 'flux Φ'),
            h('line', { x1: 266, y1: 72, x2: 482, y2: 72, stroke: BORDER }),
            h('line', { x1: 374, y1: 62, x2: 374, y2: 82, stroke: SOFT, strokeWidth: 1.5 }),
            h('rect', { x: Math.min(374, fluxMeterX), y: 66, width: Math.abs(fluxMeterX - 374), height: 12, rx: 6, fill: '#f43f5e', opacity: 0.82 }),
            h('circle', { cx: fluxMeterX, cy: 72, r: 4.5, fill: INSTRUMENT, stroke: '#f43f5e', strokeWidth: 2 }),
            h('text', { x: 486, y: 76, fill: TEXT, fontSize: 11, textAnchor: 'end' }, phase.fluxNorm.toFixed(2)),
            h('text', { x: 248, y: 111, fill: '#fde68a', fontSize: 11, fontWeight: 800 }, 'voltage ε'),
            h('line', { x1: 266, y1: 125, x2: 482, y2: 125, stroke: BORDER }),
            h('line', { x1: 374, y1: 115, x2: 374, y2: 135, stroke: SOFT, strokeWidth: 1.5 }),
            h('rect', { x: Math.min(374, emfMeterX), y: 119, width: Math.abs(emfMeterX - 374), height: 12, rx: 6, fill: '#fbbf24', opacity: 0.82 }),
            h('circle', { cx: emfMeterX, cy: 125, r: 4.5, fill: INSTRUMENT, stroke: '#fbbf24', strokeWidth: 2 }),
            h('text', { x: 486, y: 129, fill: TEXT, fontSize: 11, textAnchor: 'end' }, phase.emfNorm.toFixed(2)),
            h('text', { x: 366, y: 157, fill: SOFT, fontSize: 10.5, textAnchor: 'middle' }, '90° phase gap · voltage peaks when flux crosses zero')),
          slider('Coil angle (θ)', d.genAngle, 0, 360, 5, function (v) { upd({ genAngle: v, genPhaseSeen: true }); }),
          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', margin: '-2px 0 8px' } },
            h('button', { onClick: function () { upd({ genAngle: 0, genPhaseSeen: true }); }, style: btn(Math.abs(angle) < 1) }, 'Flux maximum · 0°'),
            h('button', { onClick: function () { upd({ genAngle: 90, genPhaseSeen: true }); }, style: btn(Math.abs(angle - 90) < 1) }, 'Voltage maximum · 90°'),
            h('button', { onClick: function () { upd({ genAngle: 180, genPhaseSeen: true }); }, style: btn(Math.abs(angle - 180) < 1) }, 'Flux minimum · 180°'),
            h('button', { onClick: function () { upd({ genAngle: 270, genPhaseSeen: true }); }, style: btn(Math.abs(angle - 270) < 1) }, 'Voltage minimum · 270°'),
            h('button', { onClick: function () { upd({ genAngle: (angle + 30) % 360, genPhaseSeen: true }); }, style: btn() }, '↻ Step 30°')),
          slider('Crank speed (RPM)', d.genRPM, 0, 180, 15, function (v) { upd({ genRPM: v, genSpeedSeen: true }); }),
          h('div', { role: 'status', style: { color: SOFT, fontSize: 12, margin: '-4px 0 9px' } },
            d.genRPM + ' RPM = ' + frequency.toFixed(2) + ' electrical cycle' + (Math.abs(frequency - 1) < 0.001 ? '' : 's') + ' per second · voltage amplitude ×' + speedFactor.toFixed(2)),
          slider('Turns in rotating coil (N)', d.genTurns, 10, 200, 10, function (v) { upd({ genTurns: v }); }),
          slider('Generator field strength (B)', d.genField, 1, 8, 1, function (v) { upd({ genField: v }); }),
          h('div', { className: 'mag-sim-grid', style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 } },
            h('div', { style: { padding: 9, borderRadius: 9, background: 'rgba(244,63,94,.10)', border: '1px solid rgba(244,63,94,.28)' } },
              h('div', { style: { color: SOFT, fontSize: 11 } }, 'Relative magnetic flux · solid curve'),
              h('div', { style: { color: TEXT, fontSize: 16, fontWeight: 800 } }, flux.toFixed(0) + ' Φ units')),
            h('div', { style: { padding: 9, borderRadius: 9, background: 'rgba(251,191,36,.10)', border: '1px solid rgba(251,191,36,.28)' } },
              h('div', { style: { color: SOFT, fontSize: 11 } }, 'Relative induced voltage · dashed curve'),
              h('div', { style: { color: TEXT, fontSize: 16, fontWeight: 800 } }, emf.toFixed(0) + ' ε units'))),
          h('div', { className: 'mag-observe', role: 'status' },
            h('span', { 'aria-hidden': 'true' }, '〰️'),
            h('span', null, h('b', null, phaseNote + ' '), 'More turns or a stronger field increases flux and voltage; faster rotation increases voltage amplitude and frequency without changing the flux amplitude.'))
        ), '#f59e0b');
      }

      // ── Oscilloscope: the EMF history the student drew ────────────────
      function scopeCard() {
        var trace = d.emfTrace || [];
        var W = 320, HH = 90, mid = HH / 2;
        var maxV = 2; // display clamp
        var pts = trace.map(function (v, i) {
          var x = trace.length > 1 ? (i / (trace.length - 1)) * (W - 16) + 8 : 8;
          var y = mid - Math.max(-maxV, Math.min(maxV, v)) / maxV * (mid - 8);
          return x.toFixed(1) + ',' + y.toFixed(1);
        });
        // "AC achieved" = the student has produced meaningful swings BOTH ways
        var pos = trace.some(function (v) { return v > 0.4; });
        var neg = trace.some(function (v) { return v < -0.4; });
        return card('Voltage scope — what you just drew', h('div', null,
          h('svg', { viewBox: '0 0 ' + W + ' ' + HH, width: '100%', style: { maxWidth: 380, display: 'block', margin: '0 auto 8px' }, role: 'img',
            'aria-label': trace.length < 2 ? 'Empty voltage scope — move the magnet to draw a trace' : 'Voltage trace of your last ' + trace.length + ' magnet movements' },
            h('rect', { x: 0, y: 0, width: W, height: HH, fill: INSTRUMENT, rx: 8 }),
            h('line', { x1: 8, y1: mid, x2: W - 8, y2: mid, stroke: '#334155', strokeWidth: 1, strokeDasharray: '4 4' }),
            h('text', { x: 12, y: 14, fill: '#475569', fontSize: 11 }, '+' + maxV + ' V'),
            h('text', { x: 12, y: HH - 6, fill: '#475569', fontSize: 11 }, '−' + maxV + ' V'),
            pts.length > 1 ? h('polyline', { points: pts.join(' '), fill: 'none', stroke: '#fbbf24', strokeWidth: 2, strokeLinejoin: 'round' }) : null,
            pts.length <= 1 ? h('text', { x: W / 2, y: mid - 6, fill: '#475569', fontSize: 11, textAnchor: 'middle' }, 'move the magnet to draw your trace…') : null),
          h('p', { style: { color: SOFT, fontSize: 12.5, margin: 0, lineHeight: 1.5 } },
            (pos && neg)
              ? h('span', null, h('b', { style: { color: '#34d399' } }, '⚡ You just generated AC. '), 'Push in = one sign, pull out = the other. Wiggle the magnet rhythmically and this trace becomes the alternating wave that comes out of every wall socket — a power-plant turbine is doing exactly this, 60 times a second.')
              : 'Wiggle the magnet in AND out, back and forth. Watch the trace cross the zero line both ways — that alternation has a famous name.'),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 } },
            h('span', { style: { color: SOFT, fontSize: 11.5 } }, (function () { var cyc = countCycles(trace); return cyc >= 1 ? ('≈ ' + cyc + ' full cycle' + (cyc > 1 ? 's' : '') + ' in view — grid AC does 60 every second') : ''; })()),
            h('button', { onClick: function () { upd({ emfTrace: [] }); }, style: { padding: '4px 10px', borderRadius: 8, border: '1px solid ' + BORDER, background: PANEL, color: SOFT, fontSize: 12, cursor: 'pointer' } }, 'Clear trace'))
        ), '#fbbf24');
      }

      // ── Eddy-current tube race (Lenz's law you can feel) ──────────────
      var TUBE_PL_MS = 650; // classroom-demo-scale timings
      var EDDY_MATERIALS = {
        copper: { name: 'Copper', conductivity: 1, color: '#f97316' },
        aluminum: { name: 'Aluminum', conductivity: 0.62, color: '#94a3b8' },
        brass: { name: 'Brass', conductivity: 0.28, color: '#fbbf24' }
      };
      function startTubeRace() {
        if (d.tubeRunning) return;
        var material = EDDY_MATERIALS[d.eddyMaterial] || EDDY_MATERIALS.copper;
        var brake = eddyBrakeFactor(material.conductivity, d.eddyThickness, d.eddySlit);
        var conductorMs = TUBE_PL_MS * (1 + brake * 3.5);
        if (_prefersReducedMotion) {
          upd({ tubeProg: { cu: 1, pl: 1 }, tubeRunning: false, tubeDone: true });
          announceToSR('Race result shown without animation. Braking factor ' + Math.round(brake * 100) + ' percent.');
          return;
        }
        upd({ tubeProg: { cu: 0, pl: 0 }, tubeRunning: true, tubeDone: false });
        var t0 = null;
        function frame(ts) {
          var cur = (ctx.toolData && ctx.toolData.magnetism) || {};
          if (!cur.tubeRunning) return;
          if (t0 == null) t0 = ts;
          var el = ts - t0;
          var cu = Math.min(1, el / conductorMs), pl = Math.min(1, el / TUBE_PL_MS);
          if (cu >= 1 && pl >= 1) {
            upd({ tubeProg: { cu: 1, pl: 1 }, tubeRunning: false, tubeDone: true });
            announceToSR('Race finished. The conductor braking factor was ' + Math.round(brake * 100) + ' percent.');
            return;
          }
          upd({ tubeProg: { cu: cu, pl: pl } });
          window.requestAnimationFrame(frame);
        }
        window.requestAnimationFrame(frame);
      }

      function eddyBrakeBenchSVG(state, material, slit) {
        var fieldOpacity = (0.30 + state.field / 10 * 0.58).toFixed(2);
        var loopOpacity = (0.18 + state.forcePercent / 100 * 0.78).toFixed(2);
        var fieldOff = eddyBrakeState(material.conductivity, d.eddyThickness, slit, state.speed, 0);
        var distanceRatio = fieldOff.stoppingDistance > 0 ? Math.min(1, state.stoppingDistance / fieldOff.stoppingDistance) : 0;
        var stopX = 350 + distanceRatio * 145;
        var dragLength = 20 + state.forcePercent * 1.15;
        var heatWidth = state.heatShare / 100 * 145;
        return h('svg', { viewBox: '0 0 520 250', width: '100%', style: { display: 'block', margin: '0 auto 8px', maxWidth: 640 }, role: 'img',
          'aria-label': material.name + ' eddy-current brake bench. Plate speed ' + state.speed + ' of 10 and magnet field ' + state.field + ' of 10. The current path is ' + state.loop + '. Relative magnetic drag is ' + Math.round(state.forcePercent) + ' percent, modeled stopping distance is ' + state.stoppingDistance.toFixed(1) + ', and eddy-current heat share is ' + Math.round(state.heatShare) + ' percent.' },
          h('title', null, 'Eddy-current sliding-plate brake bench'),
          h('desc', null, 'A conducting plate moves right through a north-south magnetic gap. Blue circulating loops show induced eddy current. A green arrow points left to show the opposing magnetic drag. One white stripe marks the north pole and two mark the south pole.'),
          h('rect', { x: 0, y: 0, width: 520, height: 250, rx: 10, fill: INSTRUMENT }),
          h('text', { x: 18, y: 20, fill: TEXT, fontSize: 12, fontWeight: 700 }, 'conducting plate through magnetic gap'),
          h('line', { x1: 28, y1: 77, x2: 154, y2: 77, stroke: '#fbbf24', strokeWidth: 3, strokeLinecap: 'round' }),
          h('polygon', { points: '160,77 149,71 149,83', fill: '#fbbf24' }),
          h('text', { x: 31, y: 68, fill: TEXT, fontSize: 11 }, 'motion v → ' + state.speed + '/10'),
          h('rect', { x: 24, y: 94, width: 472, height: 58, rx: 6, fill: material.color, opacity: 0.24 + material.conductivity * 0.22, stroke: material.color, strokeWidth: 2 }),
          [60, 100, 140, 180, 340, 380, 420, 460].map(function (xx) { return h('line', { key: 'grain-' + xx, x1: xx, y1: 99, x2: xx, y2: 147, stroke: material.color, strokeWidth: 1, opacity: 0.24 }); }),
          slit ? h('g', null,
            h('line', { x1: 260, y1: 93, x2: 260, y2: 153, stroke: INSTRUMENT, strokeWidth: 8 }),
            h('line', { x1: 260, y1: 94, x2: 260, y2: 152, stroke: '#f8fafc', strokeWidth: 1.4, strokeDasharray: '4 3' }),
            h('text', { x: 268, y: 147, fill: TEXT, fontSize: 10.5 }, 'slit')) : null,
          h('rect', { x: 220, y: 26, width: 80, height: 48, rx: 5, fill: '#ef4444', opacity: 0.88 }),
          h('line', { x1: 226, y1: 68, x2: 294, y2: 68, stroke: '#f8fafc', strokeWidth: 3 }),
          h('text', { x: 260, y: 47, fill: '#fff', fontSize: 12, fontWeight: 800, textAnchor: 'middle' }, 'N'),
          h('rect', { x: 220, y: 172, width: 80, height: 48, rx: 5, fill: '#2563eb', opacity: 0.9 }),
          h('line', { x1: 226, y1: 178, x2: 294, y2: 178, stroke: '#f8fafc', strokeWidth: 2.5 }),
          h('line', { x1: 226, y1: 185, x2: 294, y2: 185, stroke: '#f8fafc', strokeWidth: 2.5 }),
          h('text', { x: 260, y: 211, fill: '#fff', fontSize: 12, fontWeight: 800, textAnchor: 'middle' }, 'S'),
          [238, 260, 282].map(function (xx) { return h('g', { key: 'field-' + xx, opacity: fieldOpacity },
            h('line', { x1: xx, y1: 78, x2: xx, y2: 166, stroke: '#38bdf8', strokeWidth: 1.8 }),
            h('polygon', { points: xx + ',169 ' + (xx - 4) + ',160 ' + (xx + 4) + ',160', fill: '#38bdf8' })); }),
          [0, 1, 2].map(function (ring) {
            var rx = 23 + ring * 18, ry = 7 + ring * 4;
            return slit ? h('g', { key: 'loop-' + ring, opacity: loopOpacity },
              h('path', { d: 'M ' + (260 - rx) + ' 123 Q 235 ' + (123 - ry) + ' 253 ' + (123 - ry) + ' M 267 ' + (123 - ry) + ' Q 285 ' + (123 - ry) + ' ' + (260 + rx) + ' 123 Q 285 ' + (123 + ry) + ' 267 ' + (123 + ry) + ' M 253 ' + (123 + ry) + ' Q 235 ' + (123 + ry) + ' ' + (260 - rx) + ' 123', fill: 'none', stroke: '#7dd3fc', strokeWidth: 2, strokeDasharray: '4 3' })) : h('g', { key: 'loop-' + ring, opacity: loopOpacity },
              h('ellipse', { cx: 260, cy: 123, rx: rx, ry: ry, fill: 'none', stroke: '#7dd3fc', strokeWidth: 2 }),
              h('polygon', { points: (260 + rx) + ',' + (123 + 2) + ' ' + (254 + rx) + ',' + '119 ' + (254 + rx) + ',' + '127', fill: '#7dd3fc' }));
          }),
          h('line', { x1: 215, y1: 164, x2: Math.max(68, 215 - dragLength), y2: 164, stroke: '#34d399', strokeWidth: 3.2, strokeLinecap: 'round' }),
          h('polygon', { points: Math.max(62, 209 - dragLength) + ',164 ' + Math.max(72, 219 - dragLength) + ',158 ' + Math.max(72, 219 - dragLength) + ',170', fill: '#34d399' }),
          h('text', { x: 20, y: 181, fill: TEXT, fontSize: 11 }, 'eddy drag ← ' + Math.round(state.forcePercent) + '%'),
          h('text', { x: 350, y: 20, fill: TEXT, fontSize: 11, fontWeight: 700 }, 'stopping-distance comparison'),
          h('line', { x1: 350, y1: 43, x2: 495, y2: 43, stroke: '#64748b', strokeWidth: 1.5 }),
          h('line', { x1: 495, y1: 36, x2: 495, y2: 50, stroke: '#94a3b8', strokeWidth: 1.4, strokeDasharray: '3 2' }),
          h('polygon', { points: stopX.toFixed(1) + ',35 ' + (stopX - 5).toFixed(1) + ',27 ' + (stopX + 5).toFixed(1) + ',27', fill: '#34d399' }),
          h('text', { x: 350, y: 61, fill: SOFT, fontSize: 10.5 }, 'shorter'),
          h('text', { x: 495, y: 61, fill: SOFT, fontSize: 10.5, textAnchor: 'end' }, 'field off'),
          h('text', { x: 350, y: 78, fill: TEXT, fontSize: 10.5 }, 'modeled eddy-heat share'),
          h('rect', { x: 350, y: 84, width: 145, height: 9, rx: 4.5, fill: 'rgba(148,163,184,.18)' }),
          h('rect', { x: 350, y: 84, width: heatWidth, height: 9, rx: 4.5, fill: '#f97316' }),
          h('text', { x: 495, y: 105, fill: TEXT, fontSize: 10.5, textAnchor: 'end' }, Math.round(state.heatShare) + '%'),
          h('text', { x: 18, y: 239, fill: SOFT, fontSize: 10.5 }, slit ? 'open path · weak broken loops' : 'closed path · circulating loops'),
          h('text', { x: 502, y: 239, fill: SOFT, fontSize: 10.5, textAnchor: 'end' }, 'low-speed teaching model · F ∝ vB²')
        );
      }

      function eddyCard() {
        var prog = d.tubeProg || { cu: 0, pl: 0 };
        var material = EDDY_MATERIALS[d.eddyMaterial] || EDDY_MATERIALS.copper;
        var brake = eddyBrakeFactor(material.conductivity, d.eddyThickness, d.eddySlit);
        var bench = eddyBrakeState(material.conductivity, d.eddyThickness, d.eddySlit, d.eddySpeed, d.eddyField);
        var brakeWord = bench.forcePercent < 5 ? 'minimal' : bench.forcePercent < 35 ? 'moderate' : bench.forcePercent < 70 ? 'strong' : 'very strong';
        function resetRace(patch) {
          upd(Object.assign({ tubeProg: { cu: 0, pl: 0 }, tubeDone: false, tubeRunning: false }, patch));
        }
        function tube(x, label, p, tint, active) {
          var y = 20 + p * 78;
          return h('g', { key: label },
            h('rect', { x: x - 13, y: 16, width: 26, height: 96, rx: 4, fill: 'none', stroke: tint, strokeWidth: 3, opacity: 0.9 }),
            active && d.eddySlit ? h('line', { x1: x + 13, y1: 17, x2: x + 13, y2: 111, stroke: '#0b1220', strokeWidth: 5 }) : null,
            active && !d.eddySlit && brake > 0.08 ? h('g', { opacity: 0.45 + brake * 0.5 },
              h('ellipse', { cx: x, cy: y + 5, rx: 18, ry: 5, fill: 'none', stroke: '#38bdf8', strokeWidth: 2 }),
              h('path', { d: 'M ' + (x + 13) + ' ' + (y + 2) + ' l 5 3 -5 3', fill: 'none', stroke: '#38bdf8', strokeWidth: 2 })) : null,
            h('rect', { x: x - 9, y: y, width: 18, height: 12, rx: 2, fill: '#ef4444' }),
            h('text', { x: x, y: 130, fill: SOFT, fontSize: 11, textAnchor: 'middle' }, label));
        }
        return card('Eddy-current engineering lab', h('div', null,
          h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } }, 'Compare two forms of contact-free magnetic braking. First engineer a sliding-plate brake by changing speed and field strength. Then drop identical magnets through a conducting tube and plastic control.'),
          h('div', { role: 'group', 'aria-label': 'Eddy-current conductor and loop geometry', style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 } },
            Object.keys(EDDY_MATERIALS).map(function (key) {
              return h('button', { key: key, 'aria-pressed': d.eddyMaterial === key ? 'true' : 'false',
                onClick: function () { resetRace({ eddyMaterial: key }); }, style: btn(d.eddyMaterial === key) }, EDDY_MATERIALS[key].name);
            }),
            h('button', { 'aria-pressed': d.eddySlit ? 'true' : 'false', onClick: function () { resetRace({ eddySlit: !d.eddySlit }); }, style: btn(d.eddySlit) }, d.eddySlit ? 'Slit plate/tube: open loop' : 'Solid plate/tube: closed loop')),
          slider('Conductor thickness (mm)', d.eddyThickness, 1, 6, 1, function (v) { resetRace({ eddyThickness: v }); }),
          h('section', { 'aria-label': 'Sliding-plate eddy-current brake bench', style: { marginBottom: 13 } },
            h('div', { style: { color: TEXT, fontSize: 12.5, fontWeight: 800, marginBottom: 5 } }, 'Sliding-plate brake bench'),
            h('p', { style: { color: SOFT, fontSize: 11.5, margin: '0 0 8px', lineHeight: 1.45 } }, 'Predict: doubling field strength has a larger effect than doubling speed because the braking force follows the low-speed trend F ∝ vB².'),
            h('div', { className: 'mag-sim-grid', style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12 } },
              slider('Plate speed', d.eddySpeed, 0, 10, 1, function (v) { resetRace({ eddySpeed: v }); }),
              slider('Magnet field strength', d.eddyField, 0, 10, 1, function (v) { resetRace({ eddyField: v }); })),
            eddyBrakeBenchSVG(bench, material, d.eddySlit),
            h('div', { className: 'mag-sim-grid', style: { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, margin: '0 0 9px' } },
              h('div', { style: { padding: 9, border: '1px solid ' + BORDER, borderRadius: 9, textAlign: 'center' } }, h('div', { style: { color: SOFT, fontSize: 11 } }, 'Relative magnetic drag'), h('div', { style: { color: TEXT, fontSize: 16, fontWeight: 800 } }, Math.round(bench.forcePercent) + '%')),
              h('div', { style: { padding: 9, border: '1px solid ' + BORDER, borderRadius: 9, textAlign: 'center' } }, h('div', { style: { color: SOFT, fontSize: 11 } }, 'Stopping distance'), h('div', { style: { color: TEXT, fontSize: 16, fontWeight: 800 } }, bench.stoppingDistance.toFixed(1) + ' rel. m')),
              h('div', { style: { padding: 9, border: '1px solid ' + BORDER, borderRadius: 9, textAlign: 'center' } }, h('div', { style: { color: SOFT, fontSize: 11 } }, 'Eddy-heat share'), h('div', { style: { color: TEXT, fontSize: 16, fontWeight: 800 } }, Math.round(bench.heatShare) + '%'))),
            h('div', { className: 'mag-legend', 'aria-label': 'Eddy-current brake key' },
              h('span', { style: { color: TEXT } }, h('i', { className: 'mag-swatch', 'aria-hidden': 'true', style: { background: '#7dd3fc' } }), 'closed or broken loop shapes show current paths'),
              h('span', { style: { color: TEXT } }, h('i', { className: 'mag-swatch', 'aria-hidden': 'true', style: { background: '#fbbf24' } }), 'right arrow is plate motion'),
              h('span', { style: { color: TEXT } }, h('i', { className: 'mag-swatch', 'aria-hidden': 'true', style: { background: '#34d399' } }), 'left arrow is magnetic drag')),
            h('div', { className: 'mag-observe', role: 'status', 'aria-live': 'polite' },
              h('span', { 'aria-hidden': 'true' }, d.eddySlit ? '/' : '↺'),
              h('span', null, h('b', null, brakeWord.charAt(0).toUpperCase() + brakeWord.slice(1) + ' braking. '),
                d.eddySlit ? 'The slit interrupts the large circulating paths, so the stop marker moves toward the field-off reference.' : d.eddyField === 0 ? 'With the field off there is no induced current and no magnetic drag.' : 'Motion changes flux through the conductor, closed eddy loops form, and their field opposes the motion. The lost kinetic energy appears mainly as heat in the conductor.'))),
          h('section', { 'aria-label': 'Eddy-current tube race' },
            h('div', { style: { color: TEXT, fontSize: 12.5, fontWeight: 800, marginBottom: 5 } }, 'Tube race · conducting wall versus plastic control'),
            h('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 8 } },
              h('svg', { viewBox: '0 0 220 148', width: '100%', style: { maxWidth: 270 }, role: 'img',
                'aria-label': material.name + ' tube versus plastic. Relative eddy braking ' + Math.round(brake * 100) + ' percent. ' + (d.eddySlit ? 'The conducting loop is cut by a slit.' : 'The conducting loop is closed.') },
                h('rect', { x: 0, y: 0, width: 220, height: 148, fill: INSTRUMENT, rx: 10 }),
                tube(72, material.name.toLowerCase(), prog.cu, material.color, true),
                tube(148, 'plastic', prog.pl, '#64748b', false),
                h('text', { x: 110, y: 144, fill: SOFT, fontSize: 11, textAnchor: 'middle' }, 'relative braking ' + Math.round(brake * 100) + '%'))),
            h('div', { style: { textAlign: 'center', marginBottom: 8 } },
              h('button', { disabled: d.tubeRunning, onClick: startTubeRace, style: btn(true) }, d.tubeRunning ? 'falling...' : (d.tubeDone ? 'Drop again' : 'Drop both magnets'))),
            h('div', { className: 'mag-observe', role: 'status' },
              h('span', { 'aria-hidden': 'true' }, d.eddySlit ? '/' : 'O'),
              h('span', null, h('b', null, d.eddySlit ? 'Broken loop: ' : 'Closed loop: '),
                d.eddySlit ? 'the longitudinal slit prevents a strong circulating current, so most magnetic braking disappears even though the material still conducts.' : 'the moving field drives eddy currents around the wall. Their field opposes the change, and thicker, better-conducting walls strengthen the braking.')),
            d.tubeDone ? h('p', { style: { color: SOFT, fontSize: 12.5, margin: 0, lineHeight: 1.5 } }, h('b', { style: { color: TEXT } }, 'Engineering connection: '), 'contact-free brakes in trains, rides, and exercise machines tune conductivity, geometry, speed, and field strength to control the opposing force.') : null),
          disclosure('The plate bench is a low-speed relative model: induced current scales with vB and magnetic drag with vB². Its stopping-distance and heat-share values support controlled comparisons, not equipment design. Tube timings are schematic; real behavior also depends on magnet size, gap, temperature, geometry, and material frequency response.')
        ), '#f97316');
      }
      // Magnetic materials (predict-then-test) ────────────────────────
      function materialsTab() {
        var guesses = d.matGuesses || {};
        var answered = Object.keys(guesses).length;
        var allAnswered = answered >= MATERIALS.length;
        var correct = MATERIALS.filter(function (m) { return guesses[m.id] === m.magnetic; }).length;
        return h('div', null,
          card('Will it stick? Predict first', h('div', null,
            h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } }, 'For each item, predict whether a magnet will grab it — ', h('b', null, 'before'), ' revealing. The common trap: thinking every metal is magnetic.'),
            MATERIALS.map(function (m) {
              var g = guesses[m.id]; // true / false / undefined
              var revealed = d.matRevealed;
              var right = revealed && g === m.magnetic;
              var wrong = revealed && g != null && g !== m.magnetic;
              return h('div', { key: m.id, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 9, marginBottom: 6, background: right ? 'rgba(34,197,94,0.12)' : wrong ? 'rgba(239,68,68,0.12)' : 'rgba(148,163,184,0.06)', border: '1px solid ' + (right ? '#22c55e' : wrong ? '#ef4444' : BORDER) } },
                h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, m.emoji),
                h('div', { style: { flex: 1 } },
                  h('div', { style: { color: TEXT, fontSize: 13, fontWeight: 700 } }, m.name),
                  revealed ? h('div', { style: { color: SOFT, fontSize: 11, lineHeight: 1.4, marginTop: 2 } }, (m.magnetic ? '🧲 Sticks. ' : '🚫 No pull. ') + m.why) : null),
                !revealed ? h('div', { style: { display: 'flex', gap: 4 } },
                  h('button', { 'aria-pressed': g === true ? 'true' : 'false', onClick: function () { var ng = Object.assign({}, guesses); ng[m.id] = true; upd({ matGuesses: ng }); },
                    style: Object.assign({}, btn(g === true), { padding: '5px 9px', fontSize: 12 }) }, 'Sticks'),
                  h('button', { 'aria-pressed': g === false ? 'true' : 'false', onClick: function () { var ng = Object.assign({}, guesses); ng[m.id] = false; upd({ matGuesses: ng }); },
                    style: Object.assign({}, btn(g === false), { padding: '5px 9px', fontSize: 12 }) }, 'No pull')
                ) : h('span', { style: { fontSize: 16 } }, right ? '✓' : wrong ? '✗' : '·'));
            }),
            !d.matRevealed ? h('div', { style: { textAlign: 'center', marginTop: 8 } },
              h('button', { disabled: !allAnswered,
                onClick: function () {
                  var perfect = MATERIALS.every(function (m) { return guesses[m.id] === m.magnetic; });
                  upd({ matRevealed: true, matPerfect: perfect || d.matPerfect });
                  if (perfect) { awardXP(15); addToast('🔩 Perfect sort! +15 XP', 'success'); }
                  announceToSR('Revealed: ' + MATERIALS.filter(function (m) { return guesses[m.id] === m.magnetic; }).length + ' of ' + MATERIALS.length + ' correct');
                },
                style: Object.assign({}, btn(true), { opacity: allAnswered ? 1 : 0.5 }) }, allAnswered ? '🧲 Test with the magnet!' : 'Predict all ' + MATERIALS.length + ' first (' + answered + '/' + MATERIALS.length + ')'))
              : h('div', { style: { textAlign: 'center', marginTop: 8 } },
                h('p', { style: { color: correct === MATERIALS.length ? '#34d399' : TEXT, fontSize: 14, fontWeight: 800, margin: '4px 0 8px' } }, correct + ' / ' + MATERIALS.length + ' correct' + (correct === MATERIALS.length ? ' — perfect!' : '')),
                h('div', { className: 'mag-observe', style: { textAlign: 'left' } },
                  h('span', { 'aria-hidden': 'true' }, correct === MATERIALS.length ? '✅' : '🧠'),
                  h('span', null, correct === MATERIALS.length
                    ? h('span', null, h('b', null, 'Pattern found: '), 'iron, nickel, cobalt, and iron-rich steel responded. “Metal” alone was not enough to predict the result.')
                    : h('span', null, h('b', null, 'Revise the rule, not just the answers: '), 'look for iron, nickel, cobalt, or an alloy containing them. Copper and aluminum conduct electricity but are not ferromagnetic.'))),
                h('button', { onClick: function () { upd({ matGuesses: {}, matRevealed: false }); }, style: btn() }, '↻ Sort again'))
          ), '#a3e635'),
          card('The rule underneath', h('p', { style: { color: SOFT, fontSize: 13, margin: 0, lineHeight: 1.5 } },
            'The three familiar strongly ferromagnetic elements at typical room temperature are: ', h('b', { style: { color: TEXT } }, 'iron, nickel, and cobalt'), '. Their atoms are tiny magnets that can lock into alignment. Steel sticks because it is mostly iron; aluminum and copper are metals whose atomic magnets cannot line up this way.'), '#a3e635'),
          domainsCard()
        );
      }

      // ── Domain visualizer: WHY iron can be magnetized (and un-) ───────
      function domainsCard() {
        var presets = {
          soft: { name: 'Soft iron', coercivity: 0.16, slope: 0.30, saturation: 1, note: 'Narrow loop: easy to magnetize and easy to erase. Ideal for electromagnets.' },
          hard: { name: 'Hard steel', coercivity: 0.48, slope: 0.18, saturation: 0.96, note: 'Wide loop: needs a stronger reverse field, then remembers. Ideal for permanent magnets.' }
        };
        var mat = presets[d.domainMaterial] || presets.soft;
        var m = d.domainHistory ? hysteresisMagnetization(d.domainField, d.domainBranch, mat.coercivity, mat.slope, mat.saturation) : (d.domainAlign || 0);
        var alignment = Math.abs(m);
        var COLS = 8, ROWS = 5, CW = 34, CH = 24;
        var arrows = [];
        for (var i = 0; i < COLS * ROWS; i++) {
          var angRad = domainAngle(i, alignment) + (m < 0 ? Math.PI : 0);
          var ang = angRad * 180 / Math.PI;
          var ax = 14 + (i % COLS) * CW, ay = 14 + Math.floor(i / COLS) * CH;
          var domainColor = alignment > 0.05 ? 'rgba(244,63,94,' + (0.45 + alignment * 0.55).toFixed(2) + ')' : '#94a3b8';
          arrows.push(h('g', { key: 'd' + i, transform: 'translate(' + ax + ',' + ay + ') rotate(' + ang.toFixed(1) + ')' },
            h('line', { x1: -8, y1: 0, x2: 6, y2: 0, stroke: domainColor, strokeWidth: 2.2 }),
            h('polygon', { points: '10,0 4,-3.4 4,3.4', fill: domainColor })));
        }

        var loopUp = [], loopDown = [];
        for (var k = 0; k <= 48; k++) {
          var hv = -1 + k / 24;
          var mu = hysteresisMagnetization(hv, -1, mat.coercivity, mat.slope, mat.saturation);
          var md = hysteresisMagnetization(hv, 1, mat.coercivity, mat.slope, mat.saturation);
          loopUp.push((18 + (hv + 1) * 57).toFixed(1) + ',' + (74 - mu * 53).toFixed(1));
          loopDown.push((18 + (hv + 1) * 57).toFixed(1) + ',' + (74 - md * 53).toFixed(1));
        }
        var pointX = 18 + (d.domainField + 1) * 57;
        var pointY = 74 - m * 53;
        function setMemory(patch, message) {
          var next = Object.assign({}, patch);
          var nm = patch.domainHistory === false ? 0 : hysteresisMagnetization(
            patch.domainField == null ? d.domainField : patch.domainField,
            patch.domainBranch == null ? d.domainBranch : patch.domainBranch,
            mat.coercivity, mat.slope, mat.saturation);
          next.domainAlign = Math.abs(nm);
          if (Math.abs(nm) >= 0.94 && !d.domainsFull) {
            next.domainsFull = true;
            awardXP(10); addToast('Magnetic saturation reached! +10 XP', 'success');
          }
          upd(next);
          announceToSR(message + ' Net magnetization ' + Math.round(nm * 100) + ' percent.');
        }

        return card('Magnetic memory: domains and hysteresis', h('div', null,
          h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } }, 'Sweep the applied field H and watch the magnetic domains in the material respond with magnetization M. The path depends on where it has been: that loop is ', h('b', null, 'hysteresis'), ', or magnetic memory.'),
          h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 } },
            Object.keys(presets).map(function (key) {
              return h('button', { key: key, 'aria-pressed': d.domainMaterial === key ? 'true' : 'false',
                onClick: function () { upd({ domainMaterial: key, domainField: 0, domainBranch: 1, domainHistory: false, domainAlign: 0 }); },
                style: btn(d.domainMaterial === key) }, presets[key].name);
            })),
          h('p', { style: { color: SOFT, fontSize: 12, margin: '0 0 8px' } }, mat.note),
          h('div', { className: 'mag-sim-grid', style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 10, alignItems: 'center' } },
            h('svg', { viewBox: '0 0 132 148', width: '100%', role: 'img',
              'aria-label': mat.name + ' hysteresis loop. Applied field ' + d.domainField.toFixed(2) + ', magnetization ' + m.toFixed(2) + '.' },
              h('rect', { x: 0, y: 0, width: 132, height: 148, fill: INSTRUMENT, rx: 10 }),
              h('line', { x1: 18, y1: 74, x2: 122, y2: 74, stroke: BORDER, strokeWidth: 1 }),
              h('line', { x1: 75, y1: 12, x2: 75, y2: 136, stroke: BORDER, strokeWidth: 1 }),
              h('polyline', { points: loopDown.join(' '), fill: 'none', stroke: '#38bdf8', strokeWidth: 2.4 }),
              h('polyline', { points: loopUp.join(' '), fill: 'none', stroke: '#a78bfa', strokeWidth: 2.4 }),
              h('circle', { cx: pointX, cy: pointY, r: 4.5, fill: '#fbbf24', stroke: TEXT, strokeWidth: 1 }),
              h('text', { x: 116, y: 69, fill: SOFT, fontSize: 11, textAnchor: 'end' }, 'H'),
              h('text', { x: 80, y: 20, fill: SOFT, fontSize: 11 }, 'M'),
              h('text', { x: 8, y: 145, fill: SOFT, fontSize: 11 }, 'wide loop = stronger memory')),
            h('svg', { viewBox: '0 0 280 126', width: '100%', role: 'img',
              'aria-label': 'Grid of 40 magnetic domains with signed net magnetization ' + Math.round(m * 100) + ' percent.' },
              h('rect', { x: 0, y: 0, width: 280, height: 126, fill: INSTRUMENT, rx: 10 }),
              arrows)),
          slider('Applied field H', d.domainField, -1, 1, 0.05, function (v) {
            setMemory({ domainField: v, domainBranch: v < d.domainField ? 1 : -1, domainHistory: true }, 'Swept the applied field.');
          }),
          h('div', { role: 'status', className: 'mag-observe' },
            h('span', { 'aria-hidden': 'true' }, 'M'),
            h('span', null, h('b', null, Math.round(Math.abs(m) * 100) + '% net magnetization; vector sum ' + (m >= 0 ? 'right' : 'left') + '. '),
              Math.abs(d.domainField) < 0.06 && Math.abs(m) > 0.2
                ? 'The external field is nearly zero, but magnetization remains. That leftover is remanence.'
                : (Math.sign(m) !== Math.sign(d.domainField) && Math.abs(d.domainField) > 0.06 ? 'The reverse field is fighting the remembered direction but has not crossed the coercive threshold yet.' : 'Track the gold point around the loop as the domains switch.'))),
          h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' } },
            h('button', { onClick: function () { setMemory({ domainField: 1, domainBranch: -1, domainHistory: true }, 'Stroked to positive saturation.'); }, style: btn(true) }, 'Stroke with magnet'),
            h('button', { onClick: function () { setMemory({ domainField: 0, domainHistory: true }, 'Removed the applied field.'); }, style: btn() }, 'Remove field'),
            h('button', { onClick: function () { setMemory({ domainField: -1, domainBranch: 1, domainHistory: true }, 'Applied a strong reverse field.'); }, style: btn() }, 'Reverse strongly'),
            h('button', { onClick: function () { setMemory({ domainField: 0, domainBranch: 1, domainHistory: false, domainAlign: 0 }, 'Heated past the Curie point; the memory was erased.'); }, style: btn() }, 'Heat it'),
            h('button', { onClick: function () { setMemory({ domainField: 0, domainBranch: 1, domainHistory: false, domainAlign: 0 }, 'Hammered; domain alignment was disrupted.'); }, style: btn() }, 'Hammer it')),
          disclosure('This conceptual M-H loop shows saturation, remanence, and coercivity. Real loops depend on alloy, temperature, shape, sweep rate, and domain-wall pinning.')
        ), '#a3e635');
      }

      // Junkyard crane (electromagnet + materials, applied) ───────────
      function itemById(id) { return MATERIALS.find(function (m) { return m.id === id; }); }

      function craneMove(dir) {
        if (d.craneDone) return;
        var ns = Math.max(0, Math.min(BIN_SLOT, d.craneSlot + dir));
        if (ns === d.craneSlot) return;
        var patch = { craneSlot: ns };
        // A powered magnet passing over steel grabs it — no click needed,
        // just like a real scrapyard crane sweeping the pile.
        var itemId = (d.craneItems || {})[ns];
        if (d.cranePower && !d.craneHolding && itemId) {
          var it = itemById(itemId);
          if (it && it.magnetic) {
            var items = Object.assign({}, d.craneItems); delete items[ns];
            patch.craneItems = items; patch.craneHolding = itemId;
            patch.craneMsg = 'Clunk! The ' + it.name.toLowerCase() + ' jumped up to the magnet.';
            announceToSR(patch.craneMsg);
          } else if (it) {
            patch.craneMsg = 'No lift: the powered field passes the ' + it.name.toLowerCase() + ', but it is not ferromagnetic.';
            announceToSR(patch.craneMsg);
          }
        }
        upd(patch);
      }

      function craneTogglePower() {
        if (d.craneDone) return;
        var powerOn = !d.cranePower;
        var patch = { cranePower: powerOn };
        var slot = d.craneSlot;
        var itemId = (d.craneItems || {})[slot];
        if (powerOn && !d.craneHolding && itemId) {
          var it = itemById(itemId);
          if (it.magnetic) {
            var items = Object.assign({}, d.craneItems); delete items[slot];
            patch.craneItems = items; patch.craneHolding = itemId;
            patch.craneMsg = 'Clunk! The ' + it.name.toLowerCase() + ' jumped up to the magnet.';
          } else {
            patch.craneMsg = 'Nothing happens — ' + it.name.toLowerCase() + ' is not ferromagnetic, so the field slides right past it.';
          }
          announceToSR(patch.craneMsg);
        }
        if (!powerOn && d.craneHolding) {
          var held = itemById(d.craneHolding);
          if (slot === BIN_SLOT) {
            var dep = Object.assign({}, d.craneDeposited); dep[d.craneHolding] = true;
            patch.craneDeposited = dep; patch.craneHolding = null;
            var count = Object.keys(dep).length;
            if (count >= 4) {
              patch.craneDone = true;
              patch.craneMsg = 'All 4 ferromagnetic items recycled — yard cleared! 🏆';
              awardXP(15); addToast('🏗️ Junkyard cleared! +15 XP', 'success');
            } else {
              patch.craneMsg = '+1 recycled (' + count + '/4). Power off = no field = the ' + held.name.toLowerCase() + ' drops.';
            }
          } else if (!(d.craneItems || {})[slot]) {
            var back = Object.assign({}, d.craneItems); back[slot] = d.craneHolding;
            patch.craneItems = back; patch.craneHolding = null;
            patch.craneMsg = 'Dropped the ' + held.name.toLowerCase() + ' back onto the pile.';
          } else {
            patch.cranePower = true; // occupied slot — keep holding, stay on
            patch.craneMsg = 'No room to drop here — carry it to the bin on the right.';
          }
          announceToSR(patch.craneMsg);
        }
        upd(patch);
      }

      function craneSVG() {
        var W = 360, HH = 180;
        var slotX = function (s) { return 22 + s * 36; };
        var cx = slotX(d.craneSlot);
        var kids = [];
        kids.push(h('rect', { key: 'bg', x: 0, y: 0, width: W, height: HH, fill: INSTRUMENT, rx: 10 }));
        kids.push(h('rect', { key: 'rail', x: 10, y: 18, width: W - 20, height: 5, rx: 2, fill: '#475569' }));
        // trolley + cable + magnet disc
        kids.push(h('rect', { key: 'trolley', x: cx - 12, y: 12, width: 24, height: 14, rx: 3, fill: '#94a3b8' }));
        kids.push(h('line', { key: 'cable', x1: cx, y1: 26, x2: cx, y2: 62, stroke: '#64748b', strokeWidth: 2 }));
        kids.push(h('path', { key: 'disc', d: 'M ' + (cx - 14) + ' 62 A 14 14 0 0 1 ' + (cx + 14) + ' 62 L ' + (cx + 14) + ' 70 L ' + (cx - 14) + ' 70 Z',
          fill: d.cranePower ? '#f43f5e' : '#334155', stroke: d.cranePower ? '#fda4af' : '#475569', strokeWidth: 1.5 }));
        if (d.cranePower) {
          kids.push(h('circle', { key: 'glow', cx: cx, cy: 70, r: 20, fill: 'none', stroke: 'rgba(244,63,94,0.35)', strokeWidth: 4 }));
          // Schematic field loops make the on/off distinction visible beyond color.
          [0, 1, 2].forEach(function (fi) {
            var spread = 18 + fi * 10;
            kids.push(h('path', { key: 'field' + fi,
              d: 'M ' + (cx - 10) + ' 70 C ' + (cx - spread) + ' ' + (88 + fi * 8) + ', ' + (cx - spread) + ' ' + (112 + fi * 5) + ', ' + cx + ' ' + (126 + fi * 3) +
                ' C ' + (cx + spread) + ' ' + (112 + fi * 5) + ', ' + (cx + spread) + ' ' + (88 + fi * 8) + ', ' + (cx + 10) + ' 70',
              fill: 'none', stroke: 'rgba(244,63,94,' + (0.34 - fi * 0.07) + ')', strokeWidth: 1.2 }));
          });
        }
        // held item rides under the magnet
        if (d.craneHolding) {
          var held = itemById(d.craneHolding);
          kids.push(h('text', { key: 'held', x: cx, y: 92, fontSize: 18, textAnchor: 'middle' }, held.emoji));
        }
        // ground + items
        kids.push(h('rect', { key: 'ground', x: 0, y: 158, width: W, height: 22, fill: '#1e293b' }));
        CRANE_ORDER.forEach(function (id, i) {
          if (!(d.craneItems || {})[i]) return;
          var it = itemById(id);
          kids.push(h('text', { key: 'it' + i, x: slotX(i), y: 152, fontSize: 18, textAnchor: 'middle' }, it.emoji));
        });
        // recycling bin
        kids.push(h('rect', { key: 'bin', x: slotX(BIN_SLOT) - 16, y: 128, width: 32, height: 30, rx: 4, fill: '#14532d', stroke: '#22c55e', strokeWidth: 1.5 }));
        kids.push(h('text', { key: 'binl', x: slotX(BIN_SLOT), y: 148, fontSize: 13, textAnchor: 'middle' }, '♻️'));
        kids.push(h('text', { key: 'binc', x: slotX(BIN_SLOT), y: 124, fill: '#22c55e', fontSize: 11, fontWeight: 700, textAnchor: 'middle' }, Object.keys(d.craneDeposited || {}).length + '/4'));
        return h('svg', { viewBox: '0 0 ' + W + ' ' + HH, width: '100%', style: { maxWidth: 420 }, role: 'img',
          'aria-label': 'Junkyard crane at position ' + d.craneSlot + (d.cranePower ? ', magnet powered' : ', magnet off') + (d.craneHolding ? ', carrying ' + itemById(d.craneHolding).name : '') }, kids);
      }

      function craneTab() {
        var craneOverId = d.craneHolding || (d.craneItems || {})[d.craneSlot];
        var craneOver = craneOverId ? itemById(craneOverId) : null;
        var cranePositionText = d.craneSlot === BIN_SLOT ? 'recycling bin' : (craneOver ? craneOver.name : 'empty ground');
        return h('div', null,
          card('Junkyard challenge: recycle the steel', h('div', null,
            h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } }, 'Real scrapyards use switchable electromagnets to lift ', h('b', null, 'ferromagnetic'), ' material — power on to grab, power off to release. In this mixed lineup, find the iron, steel, nickel, and cobalt items and carry them to the ♻️ bin.'),
            h('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 8 } }, craneSVG()),
            h('div', { className: 'mag-observe' },
              h('span', { 'aria-hidden': 'true' }, d.cranePower ? '🧲' : '🔎'),
              h('span', null, h('b', null, 'Crane is over: '), cranePositionText + '. ' +
                (d.craneHolding ? 'The field is holding it; move to the bin and switch off.' : d.craneSlot === BIN_SLOT ? 'Switch off here to release a held item.' : 'Predict whether it will jump before switching on.'))),
            h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 8 } },
              h('button', { 'aria-label': 'Move crane left', onClick: function () { craneMove(-1); }, style: btn() }, '◀ Move'),
              h('button', { 'aria-pressed': d.cranePower ? 'true' : 'false', onClick: craneTogglePower, style: btn(d.cranePower) }, d.cranePower ? '⚡ Power OFF' : '⚡ Power ON'),
              h('button', { 'aria-label': 'Move crane right', onClick: function () { craneMove(1); }, style: btn() }, 'Move ▶')),
            h('div', { role: 'status', 'aria-live': 'polite', style: { minHeight: 34, textAlign: 'center', color: d.craneDone ? '#34d399' : TEXT, fontSize: 13, fontWeight: 600, padding: '4px 8px' } }, d.craneMsg || 'Move over an object, predict, then test it with the field.'),
            d.craneDone ? h('div', { style: { textAlign: 'center' } },
              h('button', { onClick: function () {
                  upd({ craneSlot: 0, cranePower: false, craneHolding: null, craneMsg: '',
                    craneItems: { 0: 'nail', 1: 'foil', 2: 'clip', 3: 'penny', 4: 'nickel', 5: 'ruler', 6: 'cobalt', 7: 'pencil' },
                    craneDeposited: {}, craneDone: false });
                }, style: btn() }, '↻ Reset the yard')) : null
          ), '#f97316'),
          card('Why this works', h('p', { style: { color: SOFT, fontSize: 13, margin: 0, lineHeight: 1.5 } },
            'An electromagnet is a magnet with an off switch — that is its superpower. Cranes, relays, speakers, and many industrial separators use controlled current so the field can change on demand. Aluminum and copper are not lifted this way; recycling systems can separate those conductive metals with eddy currents instead.'), '#f97316')
        );
      }

      // ── Field Walk: find the hidden magnet by compass alone ───────────
      function mazeRoundDef() { return MAZE_ROUNDS[(d.mazeRound || 0) % MAZE_ROUNDS.length]; }
      function mazeMagnet() { var r = mazeRoundDef(); return { x: r.x, y: r.y, angle: r.angle, polarity: r.polarity }; }
      function mazeBearingAt(gx, gy) {
        var fp = mazeCellToField(gx, gy);
        var fb = fieldAt(fp.x, fp.y, [mazeMagnet()]);
        var angle = Math.atan2(fb.y, fb.x) * 180 / Math.PI;
        if (Math.abs(fb.x) >= Math.abs(fb.y)) {
          return { angle: angle, dx: fb.x >= 0 ? 1 : -1, dy: 0, word: fb.x >= 0 ? 'east' : 'west', symbol: fb.x >= 0 ? '→' : '←' };
        }
        return { angle: angle, dx: 0, dy: fb.y >= 0 ? 1 : -1, word: fb.y >= 0 ? 'south' : 'north', symbol: fb.y >= 0 ? '↓' : '↑' };
      }

      function mazeMove(dx, dy) {
        if (d.mazeWon) return;
        var nx = Math.max(0, Math.min(MAZE_COLS - 1, d.mazePx + dx));
        var ny = Math.max(0, Math.min(MAZE_ROWS - 1, d.mazePy + dy));
        if (nx === d.mazePx && ny === d.mazePy) return;
        var trail = (d.mazeTrail || []).concat([nx + ',' + ny]);
        if (trail.length > 200) trail = trail.slice(trail.length - 200);
        var patch = { mazePx: nx, mazePy: ny, mazeSteps: (d.mazeSteps || 0) + 1, mazeTrail: trail };
        var f = mazeCellToField(nx, ny);
        var poles = mazePoles(d.mazeRound || 0);
        var dS = Math.hypot(f.x - poles.s.x, f.y - poles.s.y);
        var dN = Math.hypot(f.x - poles.n.x, f.y - poles.n.y);
        if (dS < MAZE_CELL * 1.2) {
          patch.mazeWon = true;
          patch.mazeWins = (d.mazeWins || 0) + 1;
          if ((d.mazeWins || 0) === 0) { awardXP(15); addToast('🧭 Found it by field alone! +15 XP', 'success'); }
          announceToSR('Found the hidden magnet in ' + patch.mazeSteps + ' steps! You arrived at its SOUTH pole.');
        } else if (dN < MAZE_CELL * 1.2) {
          announceToSR('You are at the NORTH pole — the red needle end points away from here. Walk the way the red end points.');
        } else {
          var nextBearing = mazeBearingAt(nx, ny);
          announceToSR('Moved to column ' + (nx + 1) + ', row ' + (ny + 1) + '. The red needle’s strongest direction is now ' + nextBearing.word + '.');
        }
        upd(patch);
      }

      function mazeSVG() {
        var PAD = 12, CS = 26; // px per cell on screen
        var W = PAD * 2 + (MAZE_COLS - 1) * CS, HH = PAD * 2 + (MAZE_ROWS - 1) * CS;
        function px(gx) { return PAD + gx * CS; }
        function py(gy) { return PAD + gy * CS; }
        var kids = [h('rect', { key: 'bg', x: 0, y: 0, width: W, height: HH, fill: INSTRUMENT, rx: 10 })];
        // faint grid dots
        for (var gy = 0; gy < MAZE_ROWS; gy++) for (var gx = 0; gx < MAZE_COLS; gx++) {
          kids.push(h('circle', { key: 'g' + gx + '_' + gy, cx: px(gx), cy: py(gy), r: 1.2, fill: '#1e293b' }));
        }
        // Connect breadcrumb samples so the curved evidence path is visible as
        // a trajectory, not just a collection of unrelated dots.
        var roundStart = mazeRoundDef().start;
        var trailCells = [roundStart[0] + ',' + roundStart[1]].concat(d.mazeTrail || []);
        var trailPoints = trailCells.map(function (c) {
          var pp = c.split(',');
          return px(+pp[0]) + ',' + py(+pp[1]);
        });
        if (trailPoints.length > 1) kids.push(h('polyline', { key: 'trailLine', points: trailPoints.join(' '), fill: 'none', stroke: 'rgba(244,63,94,0.42)', strokeWidth: 2, strokeLinejoin: 'round' }));
        trailCells.forEach(function (c, i) {
          var pp = c.split(',');
          kids.push(h('circle', { key: 't' + i, cx: px(+pp[0]), cy: py(+pp[1]), r: i === 0 ? 3.1 : 2.4, fill: i === 0 ? '#fbbf24' : 'rgba(244,63,94,0.52)' }));
        });
        var mag = mazeMagnet();
        // reveal the magnet (and where its poles were) only after the win
        if (d.mazeWon) {
          var deg = mag.angle * 180 / Math.PI;
          var sx = W / 2 + mag.x / MAZE_CELL * CS, sy = HH / 2 + mag.y / MAZE_CELL * CS;
          kids.push(h('g', { key: 'mag', transform: 'translate(' + sx + ',' + sy + ') rotate(' + deg.toFixed(1) + ')' },
            h('rect', { x: 0, y: -8, width: 20, height: 16, fill: '#ef4444' }),
            h('rect', { x: -20, y: -8, width: 20, height: 16, fill: '#3b82f6' }),
            h('text', { x: 10, y: 4, fill: '#fff', fontSize: 11, fontWeight: 800, textAnchor: 'middle' }, 'N'),
            h('text', { x: -10, y: 4, fill: '#fff', fontSize: 11, fontWeight: 800, textAnchor: 'middle' }, 'S')));
        }
        // player compass: needle shows the REAL local field of the hidden magnet
        var f0 = mazeCellToField(d.mazePx, d.mazePy);
        var b = fieldAt(f0.x, f0.y, [mag]);
        var bang = Math.atan2(b.y, b.x) * 180 / Math.PI;
        kids.push(h('g', { key: 'player', transform: 'translate(' + px(d.mazePx) + ',' + py(d.mazePy) + ')' },
          h('circle', { r: 12, fill: '#0f172a', stroke: '#e2e8f0', strokeWidth: 1.4 }),
          h('g', { transform: 'rotate(' + bang.toFixed(1) + ')' },
            h('polygon', { points: '10,0 -2,-3 -2,3', fill: '#ef4444' }),
            h('polygon', { points: '-10,0 2,-3 2,3', fill: '#e2e8f0' }))));
        var hereBearing = mazeBearingAt(d.mazePx, d.mazePy);
        return h('svg', { viewBox: '0 0 ' + W + ' ' + HH, width: '100%', style: { maxWidth: 420 }, role: 'img',
          'aria-label': 'Field Walk board. Your compass at column ' + (d.mazePx + 1) + ', row ' + (d.mazePy + 1) + '; red needle points about ' + hereBearing.word + (d.mazeWon ? '. Magnet revealed.' : '. The hidden magnet is not visible — follow the needle.') }, kids);
      }

      function mazeNextRound() {
        var nr = ((d.mazeRound || 0) + 1) % MAZE_ROUNDS.length;
        var st = MAZE_ROUNDS[nr].start;
        upd({ mazeRound: nr, mazePx: st[0], mazePy: st[1], mazeSteps: 0, mazeWon: false, mazeTrail: [] });
        announceToSR('New round — the magnet is hidden somewhere new.');
      }

      function mazeTab() {
        var bearing = mazeBearingAt(d.mazePx, d.mazePy);
        function mazePadStyle(dx, dy) {
          var recommended = d.learningMode !== 'challenge' && bearing.dx === dx && bearing.dy === dy;
          return { width: 44, height: 44, borderRadius: 9, border: '2px solid ' + (recommended ? '#fbbf24' : BORDER),
            background: recommended ? 'rgba(251,191,36,0.12)' : PANEL, color: TEXT, fontSize: 18, cursor: 'pointer',
            boxShadow: recommended ? '0 0 0 2px rgba(251,191,36,0.14)' : 'none' };
        }
        return h('div', null,
          card('Find the hidden magnet', h('div', null,
            h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } }, 'Somewhere on this board a magnet is buried. Your only instrument is the compass under your feet. ', h('b', null, 'Walk the way the red end points'), ' — trust the field.'),
            h('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 8 } }, mazeSVG()),
            h('div', { className: 'mag-observe' },
              h('span', { 'aria-hidden': 'true', style: { fontSize: 19 } }, bearing.symbol),
              h('span', { role: 'status' }, h('b', null, 'Read the needle: '), d.learningMode === 'challenge' ? 'Use the needle bearing to choose your own step. No path hint is shown; your connected trail is the evidence.' : 'Its strongest cardinal component points ' + bearing.word + '. The gold-outlined step is the closest D-pad match; your connected trail records the field line you infer.')),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,44px)', gap: 4, justifyContent: 'center', marginBottom: 8 } },
              h('span', null, ''),
              h('button', { 'aria-label': 'Walk up' + (d.learningMode !== 'challenge' && bearing.dy === -1 ? ', closest to the red needle direction' : ''), onClick: function () { mazeMove(0, -1); }, style: mazePadStyle(0, -1) }, '↑'),
              h('span', null, ''),
              h('button', { 'aria-label': 'Walk left' + (d.learningMode !== 'challenge' && bearing.dx === -1 ? ', closest to the red needle direction' : ''), onClick: function () { mazeMove(-1, 0); }, style: mazePadStyle(-1, 0) }, '←'),
              h('span', { style: { textAlign: 'center', color: SOFT, fontSize: 11, alignSelf: 'center' } }, d.mazeSteps + ' steps'),
              h('button', { 'aria-label': 'Walk right' + (d.learningMode !== 'challenge' && bearing.dx === 1 ? ', closest to the red needle direction' : ''), onClick: function () { mazeMove(1, 0); }, style: mazePadStyle(1, 0) }, '→'),
              h('span', null, ''),
              h('button', { 'aria-label': 'Walk down' + (d.learningMode !== 'challenge' && bearing.dy === 1 ? ', closest to the red needle direction' : ''), onClick: function () { mazeMove(0, 1); }, style: mazePadStyle(0, 1) }, '↓'),
              h('span', null, '')),
            d.mazeWon ? h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.12)', border: '1px solid #22c55e', marginBottom: 8 } },
              h('p', { style: { color: TEXT, fontSize: 13, fontWeight: 700, margin: '0 0 6px' } }, '🏆 Found in ' + d.mazeSteps + ' steps!'),
              h('p', { style: { color: SOFT, fontSize: 12.5, margin: 0, lineHeight: 1.5 } }, 'Notice WHERE you arrived: the ', h('b', { style: { color: '#3b82f6' } }, 'SOUTH pole'), '. Field lines flow into south poles, so following the red end always lands you there. This is Earth’s great naming joke — a compass points “north” because the spot we call the north magnetic pole is, magnetically, a ', h('b', null, 'south'), ' pole.'),
              h('div', { style: { textAlign: 'center', marginTop: 8 } },
                h('button', { onClick: mazeNextRound, style: btn(true) }, '▶ Next round'))) : null,
            h('p', { style: { color: SOFT, fontSize: 12, margin: 0, lineHeight: 1.5 } }, 'Rounds won: ' + (d.mazeWins || 0) + '. The needle does NOT point straight at the magnet — it follows the curved field line through your square. Your breadcrumb trail will show the curve you walked.')
          ), '#38bdf8'),
          disclosure('The compass responds to the hidden magnet’s real dipole field, computed at your position — the same physics as the Field Explorer, just with the magnet invisible. Real magnetometer surveys (archaeology, shipwreck hunting, unexploded-ordnance clearing) work exactly this way.')
        );
      }

      // ── Transformer (mutual induction) ────────────────────────────────
      function transformerSVG() {
        var stepUp = d.xfmrN2 > d.xfmrN1;
        var ratio = d.xfmrN2 / d.xfmrN1;
        var p = Math.max(2, Math.min(8, Math.round(d.xfmrN1 / 25)));
        var s2 = Math.max(2, Math.min(12, Math.round(d.xfmrN2 / 25)));
        var kids = [];
        kids.push(h('rect', { key: 'bg', x: 0, y: 0, width: 320, height: 140, fill: INSTRUMENT, rx: 10 }));
        // shared iron core (the flux bridge between the two coils)
        kids.push(h('rect', { key: 'core', x: 120, y: 22, width: 80, height: 96, fill: 'none', stroke: '#94a3b8', strokeWidth: 12, rx: 8, opacity: 0.55 }));
        if (d.xfmrAC) {
          kids.push(h('path', { key: 'flux-path', d: 'M 132 31 H 188 V 109 H 132 Z', fill: 'none', stroke: '#fbbf24', strokeWidth: 1.8, strokeDasharray: '6 4', opacity: 0.82 }));
          kids.push(h('polygon', { key: 'flux-head-top', points: '184,31 174,26 174,36', fill: '#fbbf24' }));
          kids.push(h('polygon', { key: 'flux-head-bottom', points: '136,109 146,104 146,114', fill: '#fbbf24' }));
          kids.push(h('text', { key: 'flux-label', x: 160, y: 74, fill: TEXT, fontSize: 11, textAnchor: 'middle' }, 'changing flux Φ'));
        } else {
          kids.push(h('text', { key: 'flux-label', x: 160, y: 74, fill: TEXT, fontSize: 11, textAnchor: 'middle' }, 'steady flux · no induction'));
        }
        kids.push(h('line', { key: 'input-wire', x1: 82, y1: 70, x2: 106, y2: 70, stroke: '#f59e0b', strokeWidth: 2 }));
        kids.push(h('polygon', { key: 'input-head', points: '111,70 102,65 102,75', fill: '#f59e0b' }));
        kids.push(h('line', { key: 'output-wire', x1: 214, y1: 70, x2: 238, y2: 70, stroke: '#38bdf8', strokeWidth: 2 }));
        kids.push(h('polygon', { key: 'output-head', points: '243,70 234,65 234,75', fill: '#38bdf8' }));
        // primary loops (left leg)
        Array.from({ length: p }).forEach(function (_, i) {
          kids.push(h('ellipse', { key: 'p' + i, cx: 126, cy: 40 + i * (60 / Math.max(p - 1, 1)), rx: 16, ry: 5, fill: 'none', stroke: '#f59e0b', strokeWidth: 3 }));
        });
        // secondary loops (right leg)
        Array.from({ length: s2 }).forEach(function (_, i) {
          kids.push(h('ellipse', { key: 's' + i, cx: 194, cy: 36 + i * (68 / Math.max(s2 - 1, 1)), rx: 16, ry: 5, fill: 'none', stroke: '#38bdf8', strokeWidth: 3 }));
        });
        kids.push(h('text', { key: 'lin', x: 60, y: 66, fill: TEXT, fontSize: 12, fontWeight: 800, textAnchor: 'middle' }, d.xfmrAC ? '120 V AC' : '120 V DC'));
        kids.push(h('text', { key: 'lp', x: 60, y: 82, fill: SOFT, fontSize: 11, textAnchor: 'middle' }, 'primary N₁=' + d.xfmrN1));
        var vout = transformerOut(120, d.xfmrN1, d.xfmrN2, d.xfmrAC);
        kids.push(h('text', { key: 'lout', x: 262, y: 66, fill: TEXT, fontSize: 12, fontWeight: 800, textAnchor: 'middle' }, vout.toFixed(0) + ' V'));
        kids.push(h('text', { key: 'ls', x: 262, y: 82, fill: SOFT, fontSize: 11, textAnchor: 'middle' }, 'secondary N₂=' + d.xfmrN2));
        if (d.xfmrAC) {
          kids.push(h('text', { key: 'tag', x: 160, y: 14, fill: stepUp ? '#34d399' : '#fbbf24', fontSize: 11, fontWeight: 800, textAnchor: 'middle' }, stepUp ? 'STEP-UP ▲' : (d.xfmrN2 === d.xfmrN1 ? '1 : 1' : 'STEP-DOWN ▼')));
          kids.push(h('text', { key: 'trade', x: 160, y: 133, fill: SOFT, fontSize: 11, textAnchor: 'middle' }, 'ideal trade: voltage ×' + ratio.toFixed(2) + ' · current ×' + (1 / ratio).toFixed(2) + ' · power ≈ constant'));
        } else {
          kids.push(h('text', { key: 'trade', x: 160, y: 133, fill: '#fca5a5', fontSize: 11, textAnchor: 'middle' }, 'steady flux cannot induce a secondary voltage'));
        }
        return h('svg', { viewBox: '0 0 320 140', width: '100%', style: { maxWidth: 380 }, role: 'img',
          'aria-label': 'Transformer: primary coil of ' + d.xfmrN1 + ' turns and secondary of ' + d.xfmrN2 + ' turns on a shared iron core, output ' + vout.toFixed(0) + ' volts' }, kids);
      }

      function transformerTab() {
        var turnsRatio = d.xfmrN2 / d.xfmrN1;
        var currentRatio = 1 / turnsRatio;
        var load = transformerLoad(120, d.xfmrN1, d.xfmrN2, d.xfmrAC, d.xfmrLoad, d.xfmrEfficiency / 100);
        var brightness = Math.max(0, Math.min(1, load.pout / 240));
        var heatLevel = Math.max(0, Math.min(100, load.loss / Math.max(1, load.pin) * 100));
        return h('div', null,
          card('Turns ratio: voltage and current trade', h('div', null,
            h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } }, 'AC in the primary makes changing core flux. The secondary shares that flux, so V2/V1 = N2/N1. Add a load to reveal the current and power that the voltage-only view hides.'),
            h('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 10 } }, transformerSVG()),
            slider('Primary turns (N1)', d.xfmrN1, 25, 200, 25, function (v) { upd({ xfmrN1: v, xfmrTouched: true }); }),
            slider('Secondary turns (N2)', d.xfmrN2, 25, 400, 25, function (v) { upd({ xfmrN2: v, xfmrTouched: true }); }),
            h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 } },
              h('button', { 'aria-pressed': d.xfmrAC ? 'true' : 'false', onClick: function () { upd({ xfmrAC: !d.xfmrAC, xfmrTouched: true }); }, style: btn(d.xfmrAC) }, d.xfmrAC ? 'AC input' : 'DC input'),
              h('div', { style: { flex: 1, minWidth: 180, padding: 10, borderRadius: 8, background: d.xfmrAC ? 'rgba(56,189,248,0.1)' : 'rgba(239,68,68,0.1)', border: '1px solid ' + (d.xfmrAC ? 'rgba(56,189,248,0.3)' : 'rgba(239,68,68,0.3)') } },
                h('div', { style: { color: TEXT, fontSize: 14, fontWeight: 800 } }, '120 V → ' + load.vout.toFixed(0) + ' V output'),
                h('div', { style: { color: SOFT, fontSize: 11.5, marginTop: 2 } }, d.xfmrAC
                  ? ('voltage x' + turnsRatio.toFixed(2) + ', ideal current capacity x' + currentRatio.toFixed(2))
                  : 'Steady DC makes steady flux, so continuous secondary voltage is zero.'))),
            h('div', { className: 'mag-observe' },
              h('span', { 'aria-hidden': 'true' }, '='),
              h('span', null, d.xfmrAC
                ? h('span', null, h('b', null, 'No power multiplier: '), 'stepping voltage up reduces available current by the inverse ratio, so power does not multiply. The turns ratio changes the form of energy transfer, not the amount.')
                : h('span', null, h('b', null, 'Switching moment only: '), 'DC can produce a brief pulse when switched because the flux changes once, but not a continuous output.')))
          ), '#38bdf8'),
          card('Load, lamp, and efficiency', h('div', null,
            h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 8px', lineHeight: 1.5 } }, 'Lower resistance draws more secondary current. Real windings and cores warm up, so input power must exceed useful output power.'),
            slider('Load resistance (ohms)', d.xfmrLoad, 20, 240, 10, function (v) { upd({ xfmrLoad: v, xfmrTouched: true }); }),
            slider('Transformer efficiency (%)', d.xfmrEfficiency, 80, 99, 1, function (v) { upd({ xfmrEfficiency: v, xfmrTouched: true }); }),
            h('div', { className: 'mag-sim-grid', style: { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, margin: '10px 0' } },
              h('div', { style: { padding: 9, border: '1px solid ' + BORDER, borderRadius: 9, textAlign: 'center' } },
                h('div', { style: { color: SOFT, fontSize: 11 } }, 'Secondary current'),
                h('div', { style: { color: TEXT, fontSize: 16, fontWeight: 800 } }, load.iout.toFixed(2) + ' A')),
              h('div', { style: { padding: 9, border: '1px solid ' + BORDER, borderRadius: 9, textAlign: 'center' } },
                h('div', { style: { color: SOFT, fontSize: 11 } }, 'Useful output'),
                h('div', { style: { color: TEXT, fontSize: 16, fontWeight: 800 } }, load.pout.toFixed(0) + ' W')),
              h('div', { style: { padding: 9, border: '1px solid ' + BORDER, borderRadius: 9, textAlign: 'center' } },
                h('div', { style: { color: SOFT, fontSize: 11 } }, 'Heat loss'),
                h('div', { style: { color: TEXT, fontSize: 16, fontWeight: 800 } }, load.loss.toFixed(1) + ' W'))),
            h('div', { style: { display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', padding: 10 } },
              h('div', { role: 'img', 'aria-label': 'Lamp brightness ' + Math.round(brightness * 100) + ' percent', style: {
                width: 52, height: 52, borderRadius: '50%', border: '2px solid ' + BORDER,
                display: 'grid', placeItems: 'center', fontSize: 26,
                background: 'rgba(251,191,36,' + (0.05 + brightness * 0.55).toFixed(2) + ')',
                boxShadow: brightness > 0.15 ? '0 0 ' + Math.round(8 + brightness * 18) + 'px rgba(251,191,36,.45)' : 'none'
              } }, '💡'),
              h('div', { style: { flex: 1, maxWidth: 250 } },
                h('div', { style: { color: SOFT, fontSize: 11, marginBottom: 4 } }, 'loss fraction ' + heatLevel.toFixed(1) + '%'),
                h('div', { style: { height: 10, borderRadius: 5, overflow: 'hidden', background: 'rgba(148,163,184,.18)' } },
                  h('div', { style: { width: heatLevel.toFixed(1) + '%', height: '100%', background: '#f97316' } })))),
            h('div', { className: 'mag-observe', role: 'status' },
              h('span', { 'aria-hidden': 'true' }, 'P'),
              h('span', null, d.xfmrAC
                ? h('span', null, h('b', null, 'Power audit: '), load.pin.toFixed(1) + ' W in = ' + load.pout.toFixed(1) + ' W useful + ' + load.loss.toFixed(1) + ' W heat; power stays conserved.')
                : 'With DC, this steady-state model has zero output current and zero transferred power.'))
          ), '#38bdf8'),
          card('Why the grid transforms voltage', h('p', { style: { color: SOFT, fontSize: 13, margin: 0, lineHeight: 1.5 } },
            'Long-distance lines step voltage up so the same transmitted power needs less current. Since wire loss ∝ I²R, halving current cuts resistive heating to one quarter. Distribution transformers step voltage down again near buildings.'), '#38bdf8'),
          disclosure('This load model uses a resistive secondary and a chosen overall efficiency. Real transformers also have voltage regulation, reactive loads, magnetic saturation, copper loss, and frequency-dependent core loss.')
        );
      }

      function currentEarth3DState() {
        return Object.assign(magnetosphereTeachingState(d.earthSolarWind), {
          fieldLines: d.earth3dFieldLines !== false,
          boundary: d.earth3dBoundary !== false,
          belts: d.earth3dBelts !== false,
          wind: d.earth3dWind !== false,
          reference: d.earth3dReference !== false,
          motion: d.earth3dMotion === true
        });
      }

      function initEarth3DCanvas(cv) {
        if (!cv || cv._earth3dInit) return;
        if (!window.StemLab || typeof window.StemLab.ensureThree !== 'function') return;
        cv._earth3dInit = true;
        window.StemLab.ensureThree({ orbit: true, orbitRequired: true, failMessage: 'The 3D magnetosphere engine could not load. The complete 2D Earth-field model remains available.' })
          .then(function (THREE) {
            if (!cv.isConnected) { cv._earth3dInit = false; return; }
            var renderer;
            try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, powerPreference: 'high-performance' }); }
            catch (error) { cv._earth3dInit = false; upd({ earth3dStatus: 'error' }); return; }
            var scene = new THREE.Scene(), backgroundColor = new THREE.Color(0x050b18);
            try { var themeBackground = window.getComputedStyle(cv).getPropertyValue('--allo-stem-instrument').trim(); if (themeBackground) backgroundColor.setStyle(themeBackground); } catch (themeError) {}
            scene.background = backgroundColor; scene.fog = new THREE.FogExp2(backgroundColor.getHex(), 0.018);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6)); if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
            var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80); camera.position.set(9.5, 6.5, 10.5);
            var controls = new THREE.OrbitControls(camera, cv); controls.enableDamping = false; controls.minDistance = 5; controls.maxDistance = 24; controls.target.set(0, 0, 0);
            scene.add(new THREE.HemisphereLight(0xdbeafe, 0x020617, 1.2));
            var sunLight = new THREE.DirectionalLight(0xfff7d6, 1.35); sunLight.position.set(-8, 3, 4); scene.add(sunLight);
            var rimLight = new THREE.PointLight(0x38bdf8, 0.9, 22); rimLight.position.set(4, 3, 7); scene.add(rimLight);
            var dynamicGroup = new THREE.Group(); scene.add(dynamicGroup);
            var liveState = cv._earth3dState || currentEarth3DState();
            var resizeObserver = null, disposed = false, liveSignature = '', animationFrame = 0, animatedParticles = [], animatedWind = [];
            function disposeObject(obj) { obj.traverse(function (child) { if (child.geometry && child.geometry.dispose) child.geometry.dispose(); if (child.material) (Array.isArray(child.material) ? child.material : [child.material]).forEach(function (material) { if (material && material.dispose) material.dispose(); }); }); }
            function clearDynamic() { while (dynamicGroup.children.length) { var child = dynamicGroup.children[dynamicGroup.children.length - 1]; dynamicGroup.remove(child); disposeObject(child); } }
            function resize() { var width = Math.max(1, cv.clientWidth || 680), height = Math.max(1, cv.clientHeight || 410); renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); }
            function renderScene() { if (!disposed) { resize(); renderer.render(scene, camera); } }
            function addLine(parent, points, color, opacity, dashed) {
              var geometry = new THREE.BufferGeometry().setFromPoints(points);
              var material = dashed ? new THREE.LineDashedMaterial({ color: color, transparent: true, opacity: opacity, dashSize: 0.18, gapSize: 0.12 }) : new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: opacity });
              var line = new THREE.Line(geometry, material); if (dashed) line.computeLineDistances(); parent.add(line); return line;
            }
            function addArrow(parent, origin, direction, color, length, opacity) {
              var arrow = new THREE.ArrowHelper(direction.clone().normalize(), origin, length, color, 0.24, 0.13);
              arrow.line.material.transparent = true; arrow.line.material.opacity = opacity; arrow.cone.material.transparent = true; arrow.cone.material.opacity = opacity; parent.add(arrow); return arrow;
            }
            function buildScene(state) {
              clearDynamic();
              var sun = new THREE.Mesh(new THREE.SphereGeometry(0.58, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfbbf24 })); sun.position.set(-8.4, 4.1, -2.8); dynamicGroup.add(sun);
              var sunHalo = new THREE.Mesh(new THREE.SphereGeometry(0.82, 20, 14), new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.16 })); sunHalo.position.copy(sun.position); dynamicGroup.add(sunHalo);
              var sunGlow = new THREE.PointLight(0xfbbf24, 0.7, 16); sunGlow.position.copy(sun.position); dynamicGroup.add(sunGlow);
              var earth = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), new THREE.MeshStandardMaterial({ color: 0x1d4ed8, emissive: 0x082f49, emissiveIntensity: 0.32, roughness: 0.72, metalness: 0.06 })); dynamicGroup.add(earth);
              var atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.06, 32, 20), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.12, side: THREE.DoubleSide })); dynamicGroup.add(atmosphere);
              addLine(dynamicGroup, [new THREE.Vector3(0, -1.55, 0), new THREE.Vector3(0, 1.55, 0)], 0x94a3b8, 0.7, true);
              var dipoleGroup = new THREE.Group(); dipoleGroup.rotation.z = state.dipoleTilt * Math.PI / 180; dynamicGroup.add(dipoleGroup);
              addLine(dipoleGroup, [new THREE.Vector3(0, -1.65, 0), new THREE.Vector3(0, 1.65, 0)], 0xfb7185, 0.95, false);
              [1.14].forEach(function (yy) { var northRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 7, 24), new THREE.MeshBasicMaterial({ color: 0xf8fafc })); northRing.rotation.x = Math.PI / 2; northRing.position.y = yy; dipoleGroup.add(northRing); });
              [-1.10, -1.22].forEach(function (yy) { var southRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 7, 24), new THREE.MeshBasicMaterial({ color: 0xf8fafc })); southRing.rotation.x = Math.PI / 2; southRing.position.y = yy; dipoleGroup.add(southRing); });
              if (state.fieldLines) {
                [1.45, 1.9, 2.5, 3.2, 4.0].forEach(function (shell) {
                  [0, Math.PI / 2].forEach(function (phi) {
                    var theta0 = Math.asin(Math.sqrt(1 / shell)), points = [];
                    for (var i = 0; i <= 72; i++) {
                      var theta = theta0 + (Math.PI - theta0 * 2) * i / 72;
                      var radius = shell * Math.pow(Math.sin(theta), 2);
                      points.push(new THREE.Vector3(radius * Math.sin(theta) * Math.cos(phi), radius * Math.cos(theta), radius * Math.sin(theta) * Math.sin(phi)));
                    }
                    addLine(dipoleGroup, points, 0x38bdf8, 0.46, false);
                    if (shell >= 1.9 && shell <= 3.2) addArrow(dipoleGroup, points[29], points[31].clone().sub(points[29]), 0x7dd3fc, 0.30, 0.78);
                  });
                });
              }
              if (state.belts) {
                [[1.65, 0.13, 0xa78bfa], [2.3, 0.18, 0xf472b6]].forEach(function (belt) {
                  var torus = new THREE.Mesh(new THREE.TorusGeometry(belt[0], belt[1], 10, 64), new THREE.MeshBasicMaterial({ color: belt[2], transparent: true, opacity: 0.28, wireframe: true })); torus.rotation.x = Math.PI / 2; dipoleGroup.add(torus);
                });
                for (var p = 0; p < 16; p++) {
                  var angle = p / 16 * Math.PI * 2;
                  var orbitRadius = p % 2 ? 2.3 : 1.65;
                  var particle = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: p % 2 ? 0xf472b6 : 0xa78bfa })); particle.position.set(orbitRadius * Math.cos(angle), 0, orbitRadius * Math.sin(angle)); dipoleGroup.add(particle);
                  animatedParticles.push({ mesh: particle, radius: orbitRadius, baseAngle: angle, speed: p % 2 ? 0.28 : 0.43 });
                }
                [-0.84, 0.84].forEach(function (yy) { var oval = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.035, 8, 42), new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.9 })); oval.rotation.x = Math.PI / 2; oval.position.y = yy; dipoleGroup.add(oval); });
              }
              if (state.boundary) {
                var nose = 2.2 + (state.daysideRadiusRE - 5.6) * 0.38;
                var tail = 4.5 + (state.tailReachRE - 15) * 0.20;
                var boundary = new THREE.Mesh(new THREE.SphereGeometry(1, 34, 20), new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.15, wireframe: true })); boundary.scale.set((nose + tail) / 2, 3.4, 3.4); boundary.position.x = (tail - nose) / 2; dynamicGroup.add(boundary);
                [0, Math.PI / 2].forEach(function (phi) {
                  var shockPoints = [];
                  for (var shockStep = -32; shockStep <= 32; shockStep++) {
                    var lateral = shockStep / 32 * 4.0;
                    shockPoints.push(new THREE.Vector3(-nose - 0.82 + 0.09 * lateral * lateral, lateral * Math.cos(phi), lateral * Math.sin(phi)));
                  }
                  addLine(dynamicGroup, shockPoints, 0xfbbf24, 0.58, true);
                });
                if (state.reference) {
                  var referenceNose = 2.2 + (9.8 - 5.6) * 0.38, referenceTail = 4.5, referenceCenter = (referenceTail - referenceNose) / 2, referenceRadius = (referenceNose + referenceTail) / 2;
                  [0, Math.PI / 2].forEach(function (phi) {
                    var referencePoints = [];
                    for (var referenceStep = 0; referenceStep <= 96; referenceStep++) {
                      var referenceAngle = referenceStep / 96 * Math.PI * 2;
                      referencePoints.push(new THREE.Vector3(referenceCenter + referenceRadius * Math.cos(referenceAngle), 3.4 * Math.sin(referenceAngle) * Math.cos(phi), 3.4 * Math.sin(referenceAngle) * Math.sin(phi)));
                    }
                    addLine(dynamicGroup, referencePoints, 0xe2e8f0, 0.48, true);
                  });
                }
              }
              if (state.wind) {
                [-7.4, -5.8, -4.3].forEach(function (xx) { [-2.5, 0, 2.5].forEach(function (yy) { [-2.2, 0, 2.2].forEach(function (zz) {
                  var windArrow = addArrow(dynamicGroup, new THREE.Vector3(xx, yy, zz), new THREE.Vector3(1, 0, 0), 0xfbbf24, 1.05 + state.pressure * 0.035, 0.34 + state.pressure * 0.045);
                  animatedWind.push({ arrow: windArrow, baseX: xx, phase: (yy + zz + 8) * 0.19 });
                }); }); });
              }
            }
            function prefersReducedMotion() { return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
            function animationStep(timestamp) {
              animationFrame = 0;
              if (disposed || !liveState.motion || prefersReducedMotion()) return;
              var seconds = timestamp * 0.001;
              animatedParticles.forEach(function (entry) { var angle = entry.baseAngle + seconds * entry.speed; entry.mesh.position.set(entry.radius * Math.cos(angle), 0, entry.radius * Math.sin(angle)); });
              animatedWind.forEach(function (entry) { entry.arrow.position.x = entry.baseX + (seconds * (0.34 + liveState.pressure * 0.075) + entry.phase) % 2.4; });
              renderScene();
              animationFrame = window.requestAnimationFrame(animationStep);
            }
            function syncAnimation() {
              var shouldAnimate = liveState.motion && !prefersReducedMotion();
              if (shouldAnimate && !animationFrame) animationFrame = window.requestAnimationFrame(animationStep);
              if (!shouldAnimate && animationFrame) { window.cancelAnimationFrame(animationFrame); animationFrame = 0; }
            }
            function rebuild(state) {
              if (disposed) return; liveState = Object.assign({}, state);
              var signature = [state.pressure, state.fieldLines, state.boundary, state.belts, state.wind, state.reference, state.motion].join('|');
              if (signature !== liveSignature) { liveSignature = signature; buildScene(liveState); }
              syncAnimation(); renderScene();
            }
            function setView(view) {
              if (view === 'sun') camera.position.set(-12, 2.2, 0.01);
              else if (view === 'tail') camera.position.set(13, 2.6, 0.01);
              else if (view === 'polar') camera.position.set(0.01, 12, 0.01);
              else camera.position.set(9.5, 6.5, 10.5);
              controls.target.set(0, 0, 0); camera.lookAt(controls.target); controls.update(); renderScene();
            }
            function onContextLost(event) { event.preventDefault(); upd({ earth3dStatus: 'error' }); announceToSR('The 3D magnetosphere graphics context was lost. The 2D Earth-field model remains available.'); }
            function cleanup() {
              if (disposed) return; disposed = true;
              cv.removeEventListener('webglcontextlost', onContextLost); controls.removeEventListener('change', renderScene); window.removeEventListener('resize', renderScene); controls.dispose(); if (resizeObserver) resizeObserver.disconnect();
              if (animationFrame) window.cancelAnimationFrame(animationFrame); animationFrame = 0; clearDynamic(); renderer.dispose(); cv._earth3dInit = false; cv._earth3dUpdate = null; cv._earth3dCleanup = null;
            }
            cv.addEventListener('webglcontextlost', onContextLost); controls.addEventListener('change', renderScene);
            if (typeof ResizeObserver !== 'undefined') { resizeObserver = new ResizeObserver(renderScene); resizeObserver.observe(cv); } else window.addEventListener('resize', renderScene, { passive: true });
            cv._earth3dUpdate = rebuild; cv._earth3dSetView = setView; cv._earth3dCleanup = cleanup; rebuild(liveState); upd({ earth3dStatus: 'ready', earth3dUsed: true, earthSeen: true });
          }).catch(function () { cv._earth3dInit = false; if (cv.isConnected) { upd({ earth3dStatus: 'error' }); announceToSR('The 3D magnetosphere engine could not load. Use the complete 2D Earth-field model or retry.'); } });
      }

      function earth3DCanvasRef(cv) {
        if (!cv) { var oldCanvas = _earth3DCanvas; window.setTimeout(function () { if (oldCanvas && !oldCanvas.isConnected && typeof oldCanvas._earth3dCleanup === 'function') oldCanvas._earth3dCleanup(); }, 0); return; }
        _earth3DCanvas = cv; cv._earth3dState = currentEarth3DState();
        if (typeof cv._earth3dUpdate === 'function') cv._earth3dUpdate(cv._earth3dState); else initEarth3DCanvas(cv);
      }

      function earth3DPanel() {
        var state = currentEarth3DState();
        var daysideShift = 9.8 - state.daysideRadiusRE, tailGrowth = state.tailReachRE - 15;
        function cameraButton(id, label) { return h('button', { key: id, onClick: function () { if (_earth3DCanvas && typeof _earth3DCanvas._earth3dSetView === 'function') _earth3DCanvas._earth3dSetView(id); announceToSR(label + ' magnetosphere view selected.'); }, style: btn() }, label); }
        function layerButton(key, label, on) { var patch = {}; patch[key] = !on; patch.earth3dUsed = true; return h('button', { 'aria-pressed': on ? 'true' : 'false', onClick: function () { upd(patch); }, style: btn(on) }, label + ': ' + (on ? 'on' : 'off')); }
        return h('div', null,
          sceneViewport(h('canvas', { key: 'earth3d-' + (d.earth3dAttempt || 0), ref: earth3DCanvasRef, className: 'mag-earth3d', role: 'img',
            'aria-label': 'Interactive three-dimensional schematic magnetosphere with Earth, tilted dipole field lines and direction arrows, solar-wind flow, open bow shock, magnetopause, quiet-condition reference, radiation-belt rings, particle markers, and auroral ovals.',
            'aria-describedby': 'mag-earth3d-status mag-earth3d-summary', style: { display: 'block', width: '100%', borderRadius: 10, border: '1px solid ' + BORDER, background: INSTRUMENT, touchAction: 'none' } }), [
              { label: 'Dayside boundary', value: state.daysideRadiusRE.toFixed(1) + ' R⊕', tone: '#38bdf8' },
              { label: 'Tail reach', value: state.tailReachRE.toFixed(0) + ' R⊕', tone: '#a78bfa' },
              { label: 'Auroral oval', value: state.auroralLatitude.toFixed(0) + '° latitude', tone: '#34d399' }
            ], 'solar wind · +x'),
          h('div', { id: 'mag-earth3d-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { color: d.earth3dStatus === 'error' ? '#fbbf24' : SOFT, fontSize: 11.5, lineHeight: 1.45, margin: '7px 0' } },
            d.earth3dStatus === 'ready' ? 'Scene ready. Drag to orbit or compare the Sun-facing side, tail, and polar views. ' + (state.motion ? 'Flow animation is on.' : 'Motion is paused.') : d.earth3dStatus === 'error' ? h('span', null, '3D graphics did not load. The complete 2D Earth-field model remains available. ', h('button', { onClick: function () { upd({ earth3dStatus: 'loading', earth3dAttempt: (d.earth3dAttempt || 0) + 1 }); }, style: btn() }, 'Retry 3D')) : 'Loading the 3D magnetosphere engine...'),
          h('div', { 'aria-label': '3D magnetosphere key', style: { display: 'flex', gap: 10, flexWrap: 'wrap', color: SOFT, fontSize: 11.5, marginBottom: 8 } },
            h('span', null, 'blue sphere Earth'), h('span', null, 'blue arrowed curves field direction'), h('span', null, 'one/two white rings N/S poles'), h('span', null, 'gold dashed arcs bow shock'), h('span', null, 'blue wire shell magnetopause'), h('span', null, 'white dashed quiet reference'), h('span', null, 'violet/pink rings trapped-particle belts'), h('span', null, 'green polar auroral ovals'), h('span', null, 'gold arrows solar wind')),
          sceneTextAlternative('mag-earth3d-summary', 'This schematic 3D magnetosphere shows ' + state.activity + ' solar-wind pressure at level ' + state.pressure + ' of 10. The Sun-facing magnetopause is about ' + state.daysideRadiusRE.toFixed(1) + ' Earth radii from Earth in this teaching scale, while the modeled tail reaches ' + state.tailReachRE.toFixed(0) + ' Earth radii downstream. The auroral oval is shown near ' + state.auroralLatitude.toFixed(0) + ' degrees magnetic latitude. The gray geographic axis and tilted red magnetic axis are separated by about ' + state.dipoleTilt + ' degrees. One white ring marks the magnetic north side and two mark the magnetic south side without relying on color. Arrowheads show field direction outside Earth. The dashed white outline preserves the quiet-condition boundary for direct comparison. Violet and pink rings identify two schematic trapped-particle belt regions; they are zones, not solid tubes. Optional animation moves solar-wind arrows downstream and particles around the belts, and respects reduced-motion preferences. Dimensions respond illustratively to the pressure control and are not a space-weather forecast.'),
          h('div', { role: 'group', 'aria-label': '3D magnetosphere camera views', style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 } }, cameraButton('perspective', 'Perspective'), cameraButton('sun', 'Sun-facing'), cameraButton('tail', 'Down the tail'), cameraButton('polar', 'Polar view')),
          h('div', { role: 'group', 'aria-label': '3D magnetosphere visual layers and motion', style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 } },
            layerButton('earth3dFieldLines', 'Dipole field', state.fieldLines), layerButton('earth3dBoundary', 'Boundaries', state.boundary), layerButton('earth3dReference', 'Quiet reference', state.reference), layerButton('earth3dBelts', 'Belts + aurora', state.belts), layerButton('earth3dWind', 'Solar wind', state.wind), layerButton('earth3dMotion', 'Animate flow', state.motion)),
          h('div', { className: 'mag-observe', role: 'status', 'aria-live': 'polite' },
            h('span', { 'aria-hidden': 'true' }, state.pressure >= 8 ? '☄' : '☀'),
            h('span', null, h('b', null, state.activity.charAt(0).toUpperCase() + state.activity.slice(1) + ' solar wind. '), 'Compared with the dashed quiet reference, the dayside boundary is ' + daysideShift.toFixed(1) + ' R⊕ closer to Earth and the tail is ' + tailGrowth.toFixed(1) + ' R⊕ longer. Field-line arrowheads run away from the north marker and toward the south marker outside Earth. Trapped-particle belts connect conceptually to the magnetic-mirror experiment.')));
      }
      // Earth's Field ─────────────────────────────────────────────────
      function earthTab() {
        var decDirection = d.declination === 0 ? 'no offset in this example' : (Math.abs(d.declination) + '° ' + (d.declination > 0 ? 'east' : 'west') + ' of true north');
        var windLevel = Math.max(1, Math.min(10, Number(d.earthSolarWind) || 5));
        var windWord = windLevel <= 3 ? 'quiet' : windLevel <= 7 ? 'active' : 'storm-level';
        return h('div', null,
          card('Earth’s dynamo and your compass', h('div', null,
            h('div', { role: 'group', 'aria-label': 'Earth magnetic-field model view', style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 9 } },
              h('button', { 'aria-pressed': d.earthView !== '3d' ? 'true' : 'false', onClick: function () { upd({ earthView: '2d', earthSeen: true }); announceToSR('Two-dimensional magnetosphere cross-section selected.'); }, style: btn(d.earthView !== '3d') }, '2D cross-section'),
              h('button', { 'aria-pressed': d.earthView === '3d' ? 'true' : 'false', onClick: function () { if (d.earthView === '3d') return; upd({ earthView: '3d', earth3dStatus: 'loading', earth3dUsed: true, earthSeen: true }); announceToSR('Three-dimensional magnetosphere lab selected.'); }, style: btn(d.earthView === '3d') }, '3D magnetosphere lab')),
            d.earthView === '3d' ? earth3DPanel() : h('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 10 } }, earthSVG()),
            h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 8px', lineHeight: 1.5 } }, 'Earth does not hide a bar magnet inside. Motion in its electrically conducting liquid outer core sustains a ', h('b', null, 'geodynamo'), ' whose large-scale field resembles a tilted dipole. A compass follows that magnetic field, not the geographic grid.'),
            slider('Example local declination (degrees)', d.declination, -30, 30, 1, function (v) { upd({ declination: v, earthSeen: true }); }),
            slider('Solar-wind pressure', windLevel, 1, 10, 1, function (v) { upd({ earthSolarWind: v, earthSeen: true, earth3dUsed: d.earthView === '3d' || d.earth3dUsed }); }),
            h('div', { role: 'group', 'aria-label': 'Solar-wind comparison presets', style: { display: 'flex', gap: 7, flexWrap: 'wrap', margin: '0 0 9px' } },
              [{ value: 2, label: 'Quiet · 2' }, { value: 5, label: 'Active · 5' }, { value: 10, label: 'Storm · 10' }].map(function (preset) {
                return h('button', { key: preset.value, 'aria-pressed': windLevel === preset.value ? 'true' : 'false', onClick: function () { upd({ earthSolarWind: preset.value, earthSeen: true, earth3dUsed: d.earthView === '3d' || d.earth3dUsed }); announceToSR(preset.label.replace(' · ', ' solar wind level ') + ' selected.'); }, style: btn(windLevel === preset.value) }, preset.label);
              })),
            h('div', { className: 'mag-observe' },
              h('span', { 'aria-hidden': 'true' }, '🧭'),
              h('span', null,
                h('b', null, 'Compass evidence: '), 'the red needle is ' + decDirection + '. ',
                h('b', null, 'Space-weather state: '), windWord + ' solar wind at level ' + windLevel + ' of 10; higher pressure pushes the dayside boundary inward and lengthens the magnetotail. Declination depends on location and changes slowly, so navigators use a dated regional model or chart.'))
          ), '#22c55e'),
          card('The solar wind reshapes the field', h('div', null,
            h('p', { style: { color: SOFT, fontSize: 13, margin: 0, lineHeight: 1.5 } }, 'Charged particles streaming from the Sun compress the field on the daytime side and stretch it into a long ', h('b', null, 'magnetotail'), ' on the nighttime side. The magnetosphere deflects much of that flow; some particles funnel toward polar regions and help produce auroras. Mars has no strong global field today, leaving its upper atmosphere more exposed to solar-wind stripping alongside gravity and other processes.')
          ), '#22c55e'),
          disclosure('Both Earth views are schematic teaching models, not to scale or suitable for forecasting. The 3D boundary metrics respond monotonically to the pressure control so students can compare spatial trends; real magnetopause and auroral positions depend on measured solar-wind density, speed, magnetic-field orientation, and time history. Earth’s magnetic poles wander, and the field has reversed north↔south many times at irregular intervals; the most recent full reversal was about 780,000 years ago. There is no simple countdown to the next one.')
        );
      }
      function earthSVG() {
        var tilt = 11;
        var decLabel = (d.declination > 0 ? '+' : '') + d.declination + '°';
        var windLevel = Math.max(1, Math.min(10, Number(d.earthSolarWind) || 5));
        var spaceState = magnetosphereTeachingState(windLevel);
        var daysideX = 60 + spaceState.compressionPercent * 0.4;
        var tailX = 250 + spaceState.compressionPercent * 0.6;
        var quietDaysideX = 60, quietTailX = 250;
        var windAlpha = (0.34 + windLevel * 0.045).toFixed(2);
        var auroraShift = (69 - spaceState.auroralLatitude) * 0.48;
        var northAuroraY = 79 + auroraShift, southAuroraY = 121 - auroraShift;
        function boundaryAt(dayX, tailEnd) {
          return 'M 137 24 C ' + (dayX + 14) + ' 38 ' + dayX + ' 70 ' + dayX + ' 100 C ' + dayX + ' 130 ' + (dayX + 14) + ' 162 137 176 C 205 170 ' + (tailEnd - 42) + ' 143 ' + tailEnd + ' 100 C ' + (tailEnd - 42) + ' 57 205 30 137 24 Z';
        }
        var boundaryPath = boundaryAt(daysideX, tailX);
        var quietBoundaryPath = boundaryAt(quietDaysideX, quietTailX);
        var shockPath = 'M 127 15 C ' + (daysideX - 18) + ' 31 ' + (daysideX - 28) + ' 67 ' + (daysideX - 28) + ' 100 C ' + (daysideX - 28) + ' 133 ' + (daysideX - 18) + ' 169 127 185';
        return h('svg', { viewBox: '0 0 320 220', width: '100%', style: { maxWidth: 470 }, role: 'img',
          'aria-label': 'Schematic magnetosphere at solar-wind pressure ' + windLevel + ' of 10; solar wind arrives from the left. The dayside boundary is ' + spaceState.daysideRadiusRE.toFixed(1) + ' Earth radii, the tail reaches ' + spaceState.tailReachRE.toFixed(0) + ' Earth radii, and the auroral oval is near ' + spaceState.auroralLatitude.toFixed(0) + ' degrees magnetic latitude. A dashed outline preserves the quiet reference, and a compass shows declination ' + decLabel },
          h('title', null, 'Two-dimensional Earth magnetosphere comparison'),
          h('desc', null, 'A solid green boundary shows the current pressure state and a dashed white boundary shows quiet conditions. Field loops include direction arrowheads. One white pole ring marks magnetic north and two mark magnetic south.'),
          h('rect', { x: 0, y: 0, width: 320, height: 220, fill: INSTRUMENT, rx: 10 }),
          h('text', { x: 12, y: 18, fill: TEXT, fontSize: 11 }, 'SUN → solar wind · pressure ' + windLevel + '/10'),
          h('path', { d: quietBoundaryPath, fill: 'none', stroke: 'rgba(226,232,240,.46)', strokeWidth: 1.2, strokeDasharray: '3 4' }),
          h('path', { d: shockPath, fill: 'none', stroke: 'rgba(251,191,36,' + windAlpha + ')', strokeWidth: 1.5, strokeDasharray: '5 4' }),
          h('text', { x: Math.max(12, daysideX - 42), y: 35, fill: TEXT, fontSize: 11 }, 'bow shock'),
          [48, 74, 100, 126, 152].map(function (yy, i) {
            return h('g', { key: 'wind' + i },
              h('line', { x1: 10, y1: yy, x2: daysideX - 7, y2: yy, stroke: 'rgba(251,191,36,' + windAlpha + ')', strokeWidth: 1 + windLevel * 0.09 }),
              h('polygon', { points: (daysideX - 7) + ',' + yy + ' ' + (daysideX - 15) + ',' + (yy - 4) + ' ' + (daysideX - 15) + ',' + (yy + 4), fill: 'rgba(251,191,36,' + windAlpha + ')' }));
          }),
          h('path', { d: boundaryPath, fill: 'rgba(34,197,94,0.05)', stroke: 'rgba(34,197,94,0.72)', strokeWidth: 1.8 }),
          h('text', { x: daysideX + 8, y: 172, fill: TEXT, fontSize: 10.5 }, 'magnetopause'),
          h('path', { d: 'M ' + (daysideX - 3) + ' 64 Q ' + (daysideX + 25) + ' 42 120 42', fill: 'none', stroke: 'rgba(251,191,36,.46)', strokeWidth: 1.3 }),
          h('path', { d: 'M ' + (daysideX - 3) + ' 136 Q ' + (daysideX + 25) + ' 158 120 158', fill: 'none', stroke: 'rgba(251,191,36,.46)', strokeWidth: 1.3 }),
          h('line', { x1: 215, y1: 100, x2: tailX - 9, y2: 100, stroke: 'rgba(52,211,153,.45)', strokeWidth: 1.5 }),
          h('polygon', { points: tailX + ',100 ' + (tailX - 10) + ',95 ' + (tailX - 10) + ',105', fill: 'rgba(52,211,153,.65)' }),
          h('text', { x: Math.min(270, tailX - 40), y: 34, fill: TEXT, fontSize: 11, textAnchor: 'middle' }, 'magnetotail'),
          h('text', { x: daysideX + 12, y: 187, fill: SOFT, fontSize: 10.5 }, 'compressed dayside'),
          [32, 52, 72].map(function (rr, i) {
            var rx = rr + 13, arrowOpacity = 0.72 - i * 0.10;
            return h('g', { key: 'field-loop-' + i, transform: 'rotate(' + tilt + ' 150 100)' },
              h('ellipse', { cx: 150, cy: 100, rx: rx, ry: rr, fill: 'none', stroke: 'rgba(56,189,248,' + (0.58 - i * 0.09) + ')', strokeWidth: 1.25 }),
              h('polygon', { points: (150 + rx) + ',106 ' + (146 + rx) + ',98 ' + (154 + rx) + ',98', fill: 'rgba(125,211,252,' + arrowOpacity + ')' }),
              h('polygon', { points: (150 - rx) + ',106 ' + (146 - rx) + ',98 ' + (154 - rx) + ',98', fill: 'rgba(125,211,252,' + arrowOpacity + ')' }));
          }),
          h('circle', { cx: 150, cy: 100, r: 31, fill: '#1e3a5f', stroke: '#38bdf8', strokeWidth: 1.5 }),
          h('path', { d: 'M 125 97 Q 141 84 154 92 Q 164 100 176 91 L 180 106 Q 162 119 142 112 Z', fill: 'rgba(52,211,153,0.5)' }),
          h('path', { d: 'M 150 69 A 31 31 0 0 1 150 131 L 150 69 Z', fill: 'rgba(2,6,23,.34)' }),
          h('path', { d: 'M 130 ' + northAuroraY.toFixed(1) + ' Q 150 ' + (northAuroraY - 11).toFixed(1) + ' 170 ' + northAuroraY.toFixed(1), fill: 'none', stroke: '#34d399', strokeWidth: 3, strokeLinecap: 'round' }),
          h('path', { d: 'M 130 ' + southAuroraY.toFixed(1) + ' Q 150 ' + (southAuroraY + 11).toFixed(1) + ' 170 ' + southAuroraY.toFixed(1), fill: 'none', stroke: '#34d399', strokeWidth: 3, strokeLinecap: 'round' }),
          h('text', { x: 150, y: 65, fill: TEXT, fontSize: 10.5, textAnchor: 'middle' }, 'auroral oval ≈' + spaceState.auroralLatitude.toFixed(0) + '°'),
          h('line', { x1: 150, y1: 55, x2: 150, y2: 145, stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }),
          h('line', { x1: 150, y1: 55, x2: 150, y2: 145, stroke: '#f43f5e', strokeWidth: 1.6, transform: 'rotate(' + tilt + ' 150 100)' }),
          h('g', { transform: 'rotate(' + tilt + ' 150 100)', 'aria-hidden': 'true' },
            h('circle', { cx: 150, cy: 70, r: 3.4, fill: INSTRUMENT, stroke: '#f8fafc', strokeWidth: 1.4 }),
            h('circle', { cx: 150, cy: 127, r: 3.1, fill: INSTRUMENT, stroke: '#f8fafc', strokeWidth: 1.3 }),
            h('circle', { cx: 150, cy: 134, r: 3.1, fill: INSTRUMENT, stroke: '#f8fafc', strokeWidth: 1.3 })),
          h('text', { x: 150, y: 49, fill: TEXT, fontSize: 11, textAnchor: 'middle' }, 'true N'),
          h('text', { x: 166, y: 61, fill: TEXT, fontSize: 10.5 }, 'magnetic axis ≈11°'),
          h('g', { transform: 'translate(265,112)' },
            h('circle', { r: 25, fill: 'rgba(15,23,42,0.82)', stroke: '#64748b', strokeWidth: 1 }),
            h('line', { x1: 0, y1: -20, x2: 0, y2: 20, stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }),
            h('text', { x: 0, y: -29, fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' }, 'true N'),
            h('g', { transform: 'rotate(' + d.declination + ')' },
              h('polygon', { points: '0,-20 -4,5 4,5', fill: '#ef4444' }),
              h('polygon', { points: '0,20 -4,-5 4,-5', fill: '#e2e8f0' }))),
          h('text', { x: 265, y: 150, fill: TEXT, fontSize: 11, textAnchor: 'middle' }, 'declination ' + decLabel),
          h('g', { 'aria-hidden': 'true' },
            h('line', { x1: 12, y1: 199, x2: 29, y2: 199, stroke: 'rgba(226,232,240,.65)', strokeWidth: 1.3, strokeDasharray: '3 3' }),
            h('text', { x: 34, y: 203, fill: SOFT, fontSize: 10.5 }, 'quiet reference'),
            h('line', { x1: 12, y1: 213, x2: 29, y2: 213, stroke: 'rgba(34,197,94,.82)', strokeWidth: 1.8 }),
            h('text', { x: 34, y: 217, fill: SOFT, fontSize: 10.5 }, 'current boundary')),
          h('text', { x: 308, y: 203, fill: TEXT, fontSize: 10.5, textAnchor: 'end' }, 'dayside ' + spaceState.daysideRadiusRE.toFixed(1) + ' R⊕'),
          h('text', { x: 308, y: 217, fill: TEXT, fontSize: 10.5, textAnchor: 'end' }, 'tail ' + spaceState.tailReachRE.toFixed(0) + ' R⊕')
        );
      }      // ── Quiz ──────────────────────────────────────────────────────────
      function quizTab() {
        if (d.quizDone) {
          // "Study this" loop: map every missed question to the tab that
          // teaches it, dedup, and offer one jump button per weak topic.
          var TAB_LABELS = {};
          TABS.forEach(function (t) { TAB_LABELS[t.id] = t.label; });
          var missedTabs = [];
          (d.quizMissed || []).forEach(function (qi) {
            var tb = QUIZ_TABS[qi];
            if (tb && missedTabs.indexOf(tb) === -1) missedTabs.push(tb);
          });
          return card('Quiz complete', h('div', null,
            h('div', { style: { fontSize: 30, textAlign: 'center', marginBottom: 6 } }, d.quizScore >= QUIZ_PASS ? '🏆' : '🧲'),
            h('p', { style: { color: TEXT, fontSize: 16, fontWeight: 800, textAlign: 'center', margin: '0 0 4px' } }, 'You scored ' + d.quizScore + ' / ' + QUIZ.length),
            h('p', { style: { color: SOFT, fontSize: 13, textAlign: 'center', margin: '0 0 12px' } }, d.quizScore >= QUIZ_PASS ? 'Field mastery unlocked — nicely done.' : 'Solid start — study the topics below and try again to reach ' + QUIZ_PASS + '+.'),
            missedTabs.length ? h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(251,191,36,0.08)', border: '1px dashed #f59e0b', marginBottom: 12 } },
              h('p', { style: { color: TEXT, fontSize: 12.5, fontWeight: 700, margin: '0 0 8px' } }, '📚 Your missed questions came from:'),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                missedTabs.map(function (tb) {
                  return h('button', { key: tb, onClick: function () { upd({ tab: tb }); announceToSR('Opened the ' + tb + ' section to review'); }, style: btn() }, 'Study: ' + (TAB_LABELS[tb] || tb));
                }))) : null,
            h('div', { style: { textAlign: 'center' } },
              h('button', { onClick: function () { upd({ quizIdx: 0, quizScore: 0, quizPicked: null, quizDone: false, quizMissed: [] }); }, style: btn() }, '↻ Try again'))
          ));
        }
        var item = QUIZ[d.quizIdx];
        var quizTopic = QUIZ_TABS[d.quizIdx] || 'field';
        var quizTopicDef = TABS.find(function (t) { return t.id === quizTopic; });
        var quizTopicLabel = quizTopicDef ? quizTopicDef.label : quizTopic;
        var pickedRight = d.quizPicked != null && d.quizPicked === item.c;
        return h('div', null,
          card('Question ' + (d.quizIdx + 1) + ' of ' + QUIZ.length, h('div', null,
            h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', color: SOFT, fontSize: 11.5, marginBottom: 5 } },
              h('span', null, 'Topic · ' + quizTopicLabel),
              h('span', null, Math.round(((d.quizIdx + 1) / QUIZ.length) * 100) + '% through')),
            h('progress', { value: d.quizIdx + 1, max: QUIZ.length, 'aria-label': 'Quiz progress: question ' + (d.quizIdx + 1) + ' of ' + QUIZ.length,
              style: { width: '100%', height: 8, accentColor: '#f43f5e', marginBottom: 12 } }),
            h('p', { style: { color: TEXT, fontSize: 15, fontWeight: 700, margin: '0 0 12px', lineHeight: 1.5 } }, item.q),
            item.a.map(function (opt, i) {
              var picked = d.quizPicked === i;
              var reveal = d.quizPicked != null;
              var correct = i === item.c;
              var bg = 'transparent', bd = BORDER;
              if (reveal && correct) { bg = 'rgba(34,197,94,0.18)'; bd = '#22c55e'; }
              else if (reveal && picked && !correct) { bg = 'rgba(239,68,68,0.18)'; bd = '#ef4444'; }
              return h('button', { key: i, disabled: reveal, 'aria-pressed': picked ? 'true' : 'false',
                onClick: function () {
                  if (d.quizPicked != null) return;
                  var right = i === item.c;
                  upd({ quizPicked: i, quizScore: d.quizScore + (right ? 1 : 0), quizMissed: right ? (d.quizMissed || []) : (d.quizMissed || []).concat([d.quizIdx]) });
                  announceToSR(right ? 'Correct. ' + item.why : 'Not quite. ' + item.why);
                },
                style: { display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', marginBottom: 8, borderRadius: 9, border: '1px solid ' + bd, background: bg, color: TEXT, fontSize: 13, cursor: reveal ? 'default' : 'pointer' } },
                opt + (reveal && correct ? '  ✓' : (reveal && picked && !correct ? '  ✗' : '')));
            }),
            d.quizPicked != null ? h('div', null,
              h('div', { className: 'mag-observe', role: 'status' },
                h('span', { 'aria-hidden': 'true' }, pickedRight ? '✅' : '🔁'),
                h('span', null,
                  h('b', null, pickedRight ? 'Your evidence matches. ' : 'Revise the claim. '),
                  item.why,
                  !pickedRight ? h('span', null, ' The highlighted answer is the model to carry forward; revisit ' + quizTopicLabel + ' after the quiz if this still feels surprising.') : null)),
              h('button', { onClick: function () {
                  if (d.quizIdx + 1 >= QUIZ.length) {
                    var best = Math.max(d.quizBest || 0, d.quizScore);
                    upd({ quizDone: true, quizBest: best });
                    if (d.quizScore >= QUIZ_PASS) { awardXP(20); addToast('🏆 Quiz passed! +20 XP', 'success'); }
                  } else {
                    upd({ quizIdx: d.quizIdx + 1, quizPicked: null });
                  }
                }, style: btn(true) }, d.quizIdx + 1 >= QUIZ.length ? 'See results →' : 'Next question →')
            ) : null
          )),
          h('div', { style: { textAlign: 'center', color: SOFT, fontSize: 12 } },
            'Evidence collected: ' + d.quizScore + ' correct across ' + (d.quizIdx + (d.quizPicked != null ? 1 : 0)) + ' answered')
        );
      }

      // ── AI Socratic helper (gated) ────────────────────────────────────
      function askBox() {
        if (!aiOn) return null;
        return card('🤔 Stuck? Ask for a hint', h('div', null,
          h('label', { htmlFor: 'mag-tutor-question', style: { display: 'block', color: TEXT, fontSize: 12.5, fontWeight: 700, marginBottom: 4 } }, 'Your magnetism question'),
          h('input', { id: 'mag-tutor-question', type: 'text', value: d.askInput || '', placeholder: 'e.g. why does adding turns make it stronger?',
            onChange: function (e) { upd({ askInput: e.target.value }); },
            style: { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid ' + BORDER, background: '#0b1220', color: TEXT, fontSize: 13, marginBottom: 8, boxSizing: 'border-box' } }),
          h('button', { disabled: d.askLoading || !(d.askInput || '').trim(), 'aria-busy': d.askLoading ? 'true' : undefined,
            onClick: function () {
              upd({ askLoading: true, askAnswer: '' });
              var prompt = 'You are a Socratic physics tutor for a middle-school magnetism lab. The student asks: "' + (d.askInput || '') + '". Give ONE guiding hint or question, under 45 words, no final numeric answers, no em dashes. Nudge them toward the field-line or B = mu0*n*I idea if relevant.';
              Promise.resolve(callGemini(prompt, false)).then(function (r) {
                upd({ askAnswer: (r && (r.text || r)) || 'Try changing one thing at a time and watch the field respond.', askLoading: false });
              }).catch(function () { upd({ askAnswer: 'Try changing one slider at a time and watch which way the field or compass responds.', askLoading: false }); });
            }, style: btn(true) }, d.askLoading ? '…thinking' : 'Get a hint'),
          d.askAnswer ? h('p', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { color: TEXT, fontSize: 13, lineHeight: 1.5, marginTop: 10, padding: 10, background: 'rgba(148,163,184,0.1)', borderRadius: 8 } }, d.askAnswer) : null
        ), '#a855f7');
      }

      // ── shared UI atoms ───────────────────────────────────────────────
      function poleLegend(northLabel, southLabel) {
        return h('div', { className: 'mag-pole-key', 'aria-label': 'Magnetic pole key' },
          h('span', null, h('i', { className: 'mag-pole-chip', 'aria-hidden': 'true', style: { background: ACTIVE } }, 'N'), northLabel || 'North pole'),
          h('span', null, h('i', { className: 'mag-pole-chip', 'aria-hidden': 'true', style: { background: '#1d4ed8' } }, 'S'), southLabel || 'South pole'));
      }
      function sceneTextAlternative(id, text) {
        return h('div', null,
          h('span', { id: id, className: 'mag-sronly' }, text),
          h('details', { className: 'mag-scene-text' },
            h('summary', null, 'Text description of the current 3D scene'),
            h('p', { style: { margin: '5px 0 0' } }, text)));
      }
      function sceneViewport(canvas, readouts, axisText) {
        return h('div', { className: 'mag-scene-frame' },
          canvas,
          h('div', { className: 'mag-scene-hud', 'aria-hidden': 'true' },
            (readouts || []).map(function (readout, index) {
              return h('span', { key: 'hud-' + index, className: 'mag-hud-chip' },
                h('i', { className: 'mag-hud-dot', style: { '--mag-hud-tone': readout.tone || '#fbbf24' } }),
                h('span', { className: 'mag-hud-label' }, readout.label),
                h('b', { className: 'mag-hud-value' }, readout.value));
            })),
          axisText ? h('span', { className: 'mag-scene-axis', 'aria-hidden': 'true' }, axisText) : null);
      }
      function btn(active) {
        return { minHeight: 36, padding: '8px 12px', borderRadius: 9, border: '1px solid ' + (active ? ACTIVE : BORDER), background: active ? ACTIVE : PANEL, color: active ? '#fff' : TEXT, boxShadow: active ? 'inset 0 -3px 0 #fff' : 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
      }
      function slider(label, val, min, max, step, onChange) {
        var sliderId = 'mag-slider-' + (++_sliderUid);
        return h('div', { style: { marginBottom: 10 } },
          h('label', { htmlFor: sliderId, style: { display: 'flex', justifyContent: 'space-between', color: TEXT, fontSize: 13, fontWeight: 600, marginBottom: 4 } },
            h('span', null, label), h('span', { style: { color: TEXT, fontVariantNumeric: 'tabular-nums' } }, String(val))),
          h('input', { id: sliderId, type: 'range', min: min, max: max, step: step, value: val,
            'aria-valuetext': label + ': ' + String(val),
            onChange: function (e) { onChange(parseFloat(e.target.value)); },
            style: { width: '100%', accentColor: ACTIVE } }));
      }
      function disclosure(text, accent) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(148,163,184,0.08)', border: '1px dashed ' + BORDER, marginBottom: 12 } },
          h('div', { style: { color: SOFT, fontSize: 11.5, lineHeight: 1.5 } }, 'ℹ️ ' + text));
      }
      function learningModeSwitch() {
        return h('div', { role: 'group', 'aria-label': 'Learning support level', style: { display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 } },
          h('span', { style: { color: SOFT, fontSize: 11.5, fontWeight: 700 } }, 'Support level'),
          h('button', { 'aria-pressed': d.learningMode === 'guided' ? 'true' : 'false', onClick: function () {
            upd({ learningMode: 'guided' }); announceToSR('Guided mode: prediction, test, and explanation prompts are visible.');
          }, style: btn(d.learningMode === 'guided') }, 'Guided'),
          h('button', { 'aria-pressed': d.learningMode === 'challenge' ? 'true' : 'false', onClick: function () {
            upd({ learningMode: 'challenge' }); announceToSR('Challenge mode: guidance and path hints are reduced.');
          }, style: btn(d.learningMode === 'challenge') }, 'Challenge'));
      }

      function notebookSnapshot() {
        var station = (STATION_GUIDES[d.tab] || STATION_GUIDES.field).phase;
        var motorLoadTrial = d.tab === 'motor' ? motorLoadTrialState(d.motorLoadSamples, d.motorLoadPrediction) : null;
        var motorLoadNote = motorLoadTrial && motorLoadTrial.bracketed ? '; load sweep observed ' + motorLoadTrial.observed.toFixed(2) + 'x vs predicted ' + motorLoadTrial.predicted.toFixed(2) + 'x' : '';
        if (d.tab === 'field' && d.fieldView === 'map') {
          var mapMagnet = { x: 0, y: 0, angle: 0, polarity: 1, strength: Number(d.fieldMapStrength) || 1 };
          var mapProbe = Object.assign({ x: 90, y: 0 }, d.fieldMapProbe || {});
          var mapReading = fieldProbeReading(mapProbe.x, mapProbe.y, [mapMagnet], d.fieldMapNoise);
          var mapSamples = d.fieldMapSamples || [];
          var mapFit = fieldPowerLawFit(mapSamples);
          return { station: 'Quantitative field mapping lab', setup: 'Hall probe (' + mapProbe.x.toFixed(0) + ', ' + mapProbe.y.toFixed(0) + '), magnet strength ' + mapMagnet.strength.toFixed(1) + ', uncertainty ' + (Number(d.fieldMapNoise) || 0).toFixed(0) + '%, ' + mapSamples.length + ' recorded points',
            result: '|B| ' + mapReading.measuredMagnitude.toFixed(2) + ' rel. µT; Bx ' + mapReading.measuredBx.toFixed(2) + ', By ' + mapReading.measuredBy.toFixed(2) + (mapFit.exponent == null ? '; run a scan to fit the distance law' : '; fitted exponent ' + mapFit.exponent.toFixed(2) + ', R² ' + mapFit.rSquared.toFixed(3)) };
        }        if (d.tab === 'field' && d.fieldView === '3d') {
          var p3 = d.field3dProbe || { x: 0, y: 1.8, z: 1.2 };
          var b3 = fieldAt3D(p3.x, p3.y, p3.z, d.field3dMagnets || []);
          return { station: '3D field studio', setup: (d.field3dMagnets || []).length + ' magnets; probe (' + p3.x.toFixed(2) + ', ' + p3.y.toFixed(2) + ', ' + p3.z.toFixed(2) + ')',
            result: 'B = (' + b3.x.toFixed(3) + ', ' + b3.y.toFixed(3) + ', ' + b3.z.toFixed(3) + '), magnitude ' + Math.hypot(b3.x, b3.y, b3.z).toFixed(3) };
        }
        if (d.tab === 'field') {
          return { station: station, setup: 'gap ' + d.pairDistance + ', strengths ' + d.pairStrength1 + ' and ' + d.pairStrength2 + ', ' + (d.pairAttract ? 'attract' : 'repel'),
            result: magnetPairForce(d.pairStrength1, d.pairStrength2, d.pairDistance).toFixed(3) + '× relative pair force' };
        }
        if (d.tab === 'electro' && d.electroView === '3d') {
          var e3 = currentElectro3DState();
          var e3b = finiteSolenoidCenterField(e3.turns, e3.current, e3.lengthM, e3.radiusM, e3.material) * 1000;
          return { station: '3D electromagnet engineering', setup: e3.turns + ' turns, ' + e3.current + ' A, ' + (e3.lengthM * 100).toFixed(0) + ' cm long, ' + CORE_MATERIALS[e3.material].name + ' core',
            result: e3b.toFixed(e3b < 10 ? 2 : 0) + ' mT center field; probe (' + e3.probe.x.toFixed(1) + ', ' + e3.probe.y.toFixed(1) + ', ' + e3.probe.z.toFixed(1) + ')' };
        }        if (d.tab === 'electro') {
          var eDir = d.currentDir * d.windingDir > 0 ? 'right' : 'left';
          var eB = solenoidField(d.turns, d.current, 0.1, d.core ? 600 : 1) * 1000;
          return { station: station, setup: d.turns + ' turns, ' + d.current + ' A, ' + (d.core ? 'iron' : 'air') + ' core, field ' + eDir,
            result: eB.toFixed(eB < 10 ? 2 : 0) + ' mT interior field' };
        }
        if (d.tab === 'motor' && d.motorMode === 'analyzer') {
          var analyzerItem = ANALYZER_SPECIES[d.analyzerSpecies] || ANALYZER_SPECIES.deuteron;
          var analyzerState = velocitySelectorState(d.analyzerE, d.analyzerSelectorB, d.analyzerSpeed, d.analyzerB, analyzerItem.mass, analyzerItem.charge);
          return { station: 'Velocity selector + mass analyzer', setup: 'E ' + analyzerState.electricField.toFixed(1) + ', selector B ' + analyzerState.selectorField.toFixed(1) + ', beam speed ' + analyzerState.beamSpeed.toFixed(2) + ', analyzer B ' + analyzerState.analyzerField.toFixed(1) + ', ' + analyzerItem.symbol,
            result: (analyzerState.passes ? 'passed selector' : 'blocked at selector') + '; selected speed ' + analyzerState.selectedSpeed.toFixed(2) + ', m/|q| ' + analyzerState.massToCharge.toFixed(1) + ', analyzer radius ' + analyzerState.analyzerRadius.toFixed(2) };
        }        if (d.tab === 'motor' && d.motorMode === 'particle') {
          if (d.chargeView === '3d') {
            var c3 = currentCharge3DState();
            var environment = c3.fieldModel === 'mirror' ? 'magnetic mirror ratio ' + c3.mirrorRatio.toFixed(1) : 'uniform field';
            var mirrorResult = c3.fieldModel === 'mirror' ? c3.confinement + ' path, critical angle ' + c3.criticalAngle.toFixed(1) + '°' + (c3.trapped ? ', turning near ±' + c3.turningPosition.toFixed(2) : ', inside loss cone') : c3.motionType + ' path';
            return { station: c3.fieldModel === 'mirror' ? '3D magnetic mirror lab' : '3D particle helix lab', setup: environment + ', ' + (c3.chargeSign > 0 ? 'positive' : 'negative') + ' charge, relative mass ' + c3.mass.toFixed(1) + ', B center ' + c3.field + ' along ' + (c3.fieldSign > 0 ? '+y' : '−y') + ', speed ' + c3.speed + ', tilt ' + c3.tilt + '°',
              result: mirrorResult + ', center radius ' + c3.radius.toFixed(2) + ', center pitch ' + c3.pitch.toFixed(2) + ', v∥ ' + c3.parallelSpeed.toFixed(2) + ', v⊥ ' + c3.perpendicularSpeed.toFixed(2) + (c3.comparison ? '; ' + (c3.comparison.fair ? 'fair comparison' : c3.comparison.count === 0 ? 'matches pinned reference' : 'confounded comparison') + ', radius ' + (c3.comparison.radiusRatio == null ? 'changed from zero' : c3.comparison.radiusRatio.toFixed(2) + '× reference') : '') };
          }
          return { station: 'Charged-particle beam', setup: (d.chargeSign > 0 ? 'positive' : 'negative') + ' charge, field ' + (d.chargeField > 0 ? 'out' : 'into') + ' screen, speed ' + d.chargeSpeed + ', B ' + d.chargeB,
            result: 'path bends ' + (d.chargeSign * d.chargeField > 0 ? 'up' : 'down') + ', radius indicator ' + (d.chargeSpeed / Math.max(0.1, d.chargeB)).toFixed(2) };
        }
        if (d.tab === 'motor' && d.motorMode === 'forces' && d.motorView === '3d') {
          var m3 = currentMotor3DState();
          return { station: '3D motor torque lab', setup: 'I ' + m3.current + ', B ' + m3.field + ', rotor ' + Math.round(m3.angle) + '°, load ' + Number(d.motorLoad || 0).toFixed(2) + 'x, commutator half ' + m3.halfTurn,
            result: m3.force.toFixed(3) + ' N on each active side, ' + Math.round(m3.torquePercent) + '% relative torque, ' + (m3.deadSpot ? 'torque dead spot' : (m3.torqueDirection > 0 ? 'clockwise' : 'counter-clockwise') + ' turning pair') + motorLoadNote };
        }
        if (d.tab === 'motor' && d.benchUsed) {
          if (d.benchView === 'mission' && (d.benchTrace || []).length) {
            var missionResult = evaluateMotorGeneratorMission(d.benchTrace || []);
            return { station: 'Motor-generator design mission', setup: 'motor I ' + d.motorCurrent + ', motor B ' + d.motorField + ', load ' + d.benchLoadOhms + ' Ω, generator ' + d.benchTurns + ' turns × field ' + d.benchField,
              result: Math.round(missionResult.rpm) + ' RPM, ' + missionResult.voltage.toFixed(1) + ' V, ' + missionResult.power.toFixed(1) + ' W, peak ' + missionResult.maxTemperature.toFixed(1) + ' °C, ' + (missionResult.pass ? 'mission passed' : 'design needs revision') };
          }
          var mb = motorGeneratorBench(d.motorCurrent, d.motorField, d.benchLoadOhms, d.benchFriction, d.benchTurns, d.benchField);
          return { station: 'Motor–generator bench', setup: 'motor I ' + d.motorCurrent + ', motor B ' + d.motorField + ', load ' + d.benchLoadOhms + ' Ω, friction ' + d.benchFriction,
            result: Math.round(mb.rpm) + ' RPM, ' + mb.generatedVoltage.toFixed(1) + ' V, ' + mb.outputPower.toFixed(1) + ' W useful of ' + mb.inputPower.toFixed(1) + ' W input' };
        }
        if (d.tab === 'motor') {
          var mt = motorTorqueFactor(d.motorCurrent, d.motorField, d.motorAngle, d.motorCurrentDir, d.motorFieldDir);
          return { station: station, setup: 'I ' + d.motorCurrent + ', B ' + d.motorField + ', load ' + Number(d.motorLoad || 0).toFixed(2) + 'x, angle ' + Math.round(d.motorAngle) + '°',
            result: Math.abs(mt / 12).toFixed(2) + '× torque, ' + (mt >= 0 ? 'clockwise' : 'counter-clockwise') + motorLoadNote };
        }
        if (d.tab === 'induce' && d.induceMode === '3d') {
          var i3 = currentInduction3DState();
          return { station: '3D induction lab', setup: d.ind3dTurns + ' turns, radius ' + d.ind3dCoilRadius.toFixed(1) + ', magnet (' + i3.magnet.x.toFixed(1) + ', ' + i3.magnet.y.toFixed(1) + ', ' + i3.magnet.z.toFixed(1) + ')',
            result: 'flux ' + i3.flux.toFixed(2) + ', voltage ' + (Number(d.ind3dEMF) || 0).toFixed(2) + ', ' + (d.ind3dTrace || []).length + ' samples' };
        }        if (d.tab === 'induce' && d.induceMode === 'coil') {
          var ge = rotatingEMF(d.genAngle, d.genTurns, d.genField, d.genRPM / 60);
          return { station: 'Rotating coil', setup: d.genRPM + ' RPM, ' + d.genTurns + ' turns, B ' + d.genField + ', angle ' + d.genAngle + '°',
            result: ge.toFixed(1) + ' relative voltage at ' + (d.genRPM / 60).toFixed(2) + ' Hz' };
        }
        if (d.tab === 'induce' && d.induceMode === 'eddy') {
          var eddyMaterial = EDDY_MATERIALS[d.eddyMaterial] || EDDY_MATERIALS.copper;
          var eddyState = eddyBrakeState(eddyMaterial.conductivity, d.eddyThickness, d.eddySlit, d.eddySpeed, d.eddyField);
          return { station: 'Eddy-current brake bench', setup: eddyMaterial.name + ', ' + d.eddyThickness + ' mm wall, ' + eddyState.loop + ' loop, speed ' + d.eddySpeed + ', field ' + d.eddyField,
            result: Math.round(eddyState.forcePercent) + '% relative drag, stopping distance ' + eddyState.stoppingDistance.toFixed(1) + ', ' + Math.round(eddyState.heatShare) + '% modeled eddy-heat share' };
        }
        if (d.tab === 'induce') {
          return { station: 'Hand generator', setup: d.induceTurns + ' turns, magnet position ' + Math.round(d.induceX), result: Math.abs(d.lastEMF).toFixed(2) + ' V induced' };
        }
        if (d.tab === 'materials') {
          return { station: station, setup: Object.keys(d.matGuesses || {}).length + ' materials predicted, domain alignment ' + Math.round((d.domainAlign || 0) * 100) + '%',
            result: d.matRevealed ? MATERIALS.filter(function (m) { return d.matGuesses[m.id] === m.magnetic; }).length + '/8 classifications correct' : 'predictions not revealed yet' };
        }
        if (d.tab === 'earth') {
          var earthState = magnetosphereTeachingState(d.earthSolarWind);
          if (d.earthView === '3d') {
            return { station: '3D magnetosphere lab', setup: earthState.activity + ' solar wind ' + earthState.pressure + '/10, declination ' + (d.declination >= 0 ? '+' : '') + d.declination + '°',
              result: 'dayside boundary ' + earthState.daysideRadiusRE.toFixed(1) + ' R⊕, tail ' + earthState.tailReachRE.toFixed(1) + ' R⊕, auroral oval ' + earthState.auroralLatitude.toFixed(0) + '° magnetic latitude' };
          }
          return { station: station, setup: '2D cross-section, declination ' + (d.declination >= 0 ? '+' : '') + d.declination + '°, solar wind ' + earthState.pressure + '/10',
            result: earthState.activity + ' conditions; dayside boundary ' + earthState.daysideRadiusRE.toFixed(1) + ' R⊕ and auroral oval ' + earthState.auroralLatitude.toFixed(0) + '° magnetic latitude' };
        }
        if (d.tab === 'transformer') {
          return { station: station, setup: 'N₁ ' + d.xfmrN1 + ', N₂ ' + d.xfmrN2 + ', ' + (d.xfmrAC ? 'AC' : 'DC'),
            result: transformerOut(120, d.xfmrN1, d.xfmrN2, d.xfmrAC).toFixed(0) + ' V output' };
        }
        return { station: station, setup: 'current station state', result: 'observation recorded' };
      }

      function investigationNotebook() {
        var trials = d.notebookTrials || [];
        if (!d.notebookOpen) {
          return h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: 10 } },
            h('button', { onClick: function () { upd({ notebookOpen: true }); }, style: btn() }, '📓 Lab notebook · ' + trials.length + ' trial' + (trials.length === 1 ? '' : 's')));
        }
        var snap = notebookSnapshot();
        var needsPrediction = d.learningMode === 'challenge' && !(d.notebookPrediction || '').trim();
        return card('Investigation notebook — claim, evidence, reasoning', h('div', null,
          h('label', { htmlFor: 'mag-notebook-prediction', style: { display: 'block', color: TEXT, fontSize: 12.5, fontWeight: 700, marginBottom: 4 } }, 'Prediction before this trial'),
          h('input', { id: 'mag-notebook-prediction', type: 'text', value: d.notebookPrediction || '',
            onChange: function (e) { upd({ notebookPrediction: e.target.value }); },
            placeholder: 'If I change ___, then ___ because…',
            style: { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid ' + BORDER, background: '#0b1220', color: TEXT, fontSize: 13, marginBottom: 8, boxSizing: 'border-box' } }),
          h('div', { style: { color: SOFT, fontSize: 11.5, marginBottom: 7, lineHeight: 1.45 } },
            h('b', { style: { color: TEXT } }, 'Current setup: '), snap.setup, ' → ', snap.result),
          h('div', { style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 9 } },
            h('button', { disabled: needsPrediction, onClick: function () {
              var entry = { station: snap.station, setup: snap.setup, result: snap.result, prediction: (d.notebookPrediction || '').trim() || 'No prediction recorded', metrics: notebookMetricSnapshot(d) };
              var nextTrials = trials.concat([entry]);
              if (nextTrials.length > 8) nextTrials = nextTrials.slice(nextTrials.length - 8);
              upd({ notebookTrials: nextTrials, notebookUsed: true, notebookPrediction: '' });
              announceToSR('Trial recorded in the lab notebook.');
            }, style: Object.assign({}, btn(true), { opacity: needsPrediction ? 0.5 : 1 }) }, needsPrediction ? 'Write a prediction to record' : 'Record current trial'),
            h('button', { onClick: function () { upd({ notebookOpen: false }); }, style: btn() }, 'Close notebook')),
          trials.length ? h('ol', { 'aria-label': 'Recorded evidence trials', style: { margin: '0 0 10px', paddingLeft: 22, color: SOFT, fontSize: 11.5, lineHeight: 1.5 } },
            trials.map(function (t, i) {
              return h('li', { key: i, style: { marginBottom: 5 } },
                h('b', { style: { color: TEXT } }, t.station + ': '), t.setup + ' → ' + t.result,
                h('span', { style: { display: 'block' } }, 'Prediction: ' + t.prediction));
            })) : h('p', { style: { color: SOFT, fontSize: 11.5, margin: '0 0 9px' } }, 'No evidence recorded yet. Change one variable, then save the result.'),
          h('label', { htmlFor: 'mag-notebook-claim', style: { display: 'block', color: TEXT, fontSize: 12.5, fontWeight: 700, marginBottom: 4 } }, 'Claim supported by your evidence'),
          h('textarea', { id: 'mag-notebook-claim', value: d.notebookClaim || '', rows: 2,
            onChange: function (e) { upd({ notebookClaim: e.target.value }); },
            placeholder: 'My evidence supports the claim that…',
            style: { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid ' + BORDER, background: '#0b1220', color: TEXT, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' } })
        ), '#a78bfa');
      }

      function missionReplayPanel() {
        var replay = missionReplayState(d.missionId, d);
        var live = notebookSnapshot();
        var selected = replay.selected;
        var missionAccent = replay.mission.accent;
        var liveMetrics = notebookMetricSnapshot(d);
        var comparableMetrics = [];
        if (selected && selected.metrics && selected.metrics.length) {
          selected.metrics.forEach(function (metric) {
            for (var mi = 0; mi < liveMetrics.length; mi++) {
              if (liveMetrics[mi].key === metric.key) { comparableMetrics.push({ trial: metric, live: liveMetrics[mi] }); break; }
            }
          });
        }
        var timelineAria = replay.count ? 'Evidence replay timeline with ' + replay.count + ' recorded trials. Selected trial ' + (replay.selectedIndex + 1) + ' of ' + replay.count + '.' : 'Evidence replay timeline is empty. Record a notebook trial first.';
        function selectTrial(index) {
          var trial = replay.trials[index];
          upd({ replaySelectedIndex: index });
          announceToSR('Replay trial ' + (index + 1) + ' selected from ' + trial.station + '.');
        }
        var baseY = 48;
        var left = 46;
        var right = 474;
        return h('details', { style: { marginTop: 10 } },
          h('summary', { style: { color: TEXT, fontSize: 12, fontWeight: 800, cursor: 'pointer' } }, 'Replay & compare trials · ' + replay.count),
          replay.count ? h('div', null,
            h('p', { style: { color: SOFT, fontSize: 11.5, lineHeight: 1.45, margin: '7px 0 5px' } }, replay.coverage + ' Select a point to compare it with the live station setup.'),
            h('svg', { viewBox: '0 0 520 104', width: '100%', style: { display: 'block', maxWidth: 760, margin: '0 auto 7px' }, role: 'img', 'aria-label': timelineAria },
              h('line', { x1: left, y1: baseY, x2: right, y2: baseY, stroke: BORDER, strokeWidth: 2 }),
              replay.trials.map(function (trial, index) {
                var x = replay.count === 1 ? 260 : left + (right - left) * index / (replay.count - 1);
                var active = index === replay.selectedIndex;
                return h('g', { key: 'replay-node-' + trial.ordinal },
                  h('circle', { cx: x, cy: baseY, r: active ? 15 : 11, fill: active ? missionAccent : INSTRUMENT, stroke: active ? missionAccent : BORDER, strokeWidth: active ? 3 : 2 }),
                  h('text', { x: x, y: baseY + 4, fill: active ? '#111827' : TEXT, fontSize: 10.5, fontWeight: 800, textAnchor: 'middle' }, String(trial.ordinal)),
                  h('text', { x: x, y: baseY + 31, fill: TEXT, fontSize: 10, fontWeight: 700, textAnchor: 'middle' }, 'Trial ' + trial.ordinal)
                );
              })),
            h('div', { className: 'viz-controls', role: 'group', 'aria-label': 'Select evidence replay trial', style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 } },
              replay.trials.map(function (trial, index) {
                return h('button', { key: 'replay-button-' + trial.ordinal, type: 'button', 'aria-pressed': index === replay.selectedIndex ? 'true' : 'false', onClick: function () { selectTrial(index); }, style: btn(index === replay.selectedIndex) }, 'Trial ' + trial.ordinal + ' · ' + trial.station);
              })),
            selected ? h('div', { role: 'group', 'aria-label': 'Selected trial compared with live setup', style: { padding: '9px 10px', borderLeft: '3px solid ' + replay.mission.accent, background: 'rgba(148,163,184,.06)', color: SOFT, fontSize: 11.5, lineHeight: 1.5 } },
              h('div', { style: { color: TEXT, fontWeight: 800, marginBottom: 3 } }, 'Trial ' + selected.ordinal + ' · ' + selected.station),
              h('div', null, h('b', { style: { color: TEXT } }, 'Recorded: '), selected.setup + ' → ' + selected.result),
              h('div', null, h('b', { style: { color: TEXT } }, 'Prediction: '), selected.prediction),
              h('div', { style: { marginTop: 5, paddingTop: 5, borderTop: '1px solid ' + BORDER } }, h('b', { style: { color: TEXT } }, 'Live comparison: '), live.station + ' | ' + live.setup + ' -> ' + live.result),
              comparableMetrics.length ? h('div', { role: 'group', 'aria-label': 'Quantitative replay comparison', style: { marginTop: 8, paddingTop: 7, borderTop: '1px solid ' + BORDER } },
                h('div', { style: { color: TEXT, fontWeight: 800, marginBottom: 4 } }, 'Quantitative comparison · matching measurements'),
                h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap', color: SOFT, fontSize: 10.5, marginBottom: 5 } },
                  h('span', null, h('i', { 'aria-hidden': 'true', style: { display: 'inline-block', width: 10, height: 4, marginRight: 4, background: '#38bdf8' } }), 'Recorded'),
                  h('span', null, h('i', { 'aria-hidden': 'true', style: { display: 'inline-block', width: 10, height: 4, marginRight: 4, background: '#fbbf24' } }), 'Live')),
                comparableMetrics.map(function (pair) {
                  var max = Math.max(Math.abs(pair.trial.value), Math.abs(pair.live.value), 0.0001);
                  var trialWidth = Math.min(100, Math.abs(pair.trial.value) / max * 100);
                  var liveWidth = Math.min(100, Math.abs(pair.live.value) / max * 100);
                  var delta = pair.live.value - pair.trial.value;
                  var deltaText = (delta >= 0 ? '+' : '') + (pair.trial.digits === 0 ? String(Math.round(delta)) : delta.toFixed(pair.trial.digits));
                  return h('div', { key: 'metric-compare-' + pair.trial.key, role: 'group', 'aria-label': pair.trial.label + ': recorded ' + pair.trial.display + ', live ' + pair.live.display, style: { marginBottom: 7 } },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, color: SOFT, fontSize: 11 } },
                      h('b', { style: { color: TEXT } }, pair.trial.label), h('span', null, 'Δ ' + deltaText + (pair.trial.unit ? ' ' + pair.trial.unit : ''))),
                    h('div', { 'aria-hidden': 'true', style: { height: 7, borderRadius: 5, overflow: 'hidden', background: 'rgba(148,163,184,.15)', margin: '3px 0' } },
                      h('div', { style: { height: 3, width: trialWidth + '%', background: '#38bdf8', marginBottom: 1 } }),
                      h('div', { style: { height: 3, width: liveWidth + '%', background: '#fbbf24' } })),
                    h('div', { style: { color: SOFT, fontSize: 10.5 } }, 'Recorded ' + pair.trial.display + ' · Live ' + pair.live.display)
                  );
                })) : null            ) : null
          ) : h('p', { style: { color: SOFT, fontSize: 11.5, lineHeight: 1.45, margin: '7px 0 0' } }, 'Record a notebook trial from any station to create the first replay point.')
        );
      }
      function missionReportPanel() {
        var report = missionReportState(d.missionId, d);
        var cer = missionCERState(d.missionId, d);
        function saveReport() {
          var doc = typeof document !== 'undefined' ? document : null;
          var urlApi = typeof window !== 'undefined' ? (window.URL || window.webkitURL) : null;
          var BlobCtor = typeof Blob === 'function' ? Blob : null;
          if (!doc || !urlApi || typeof urlApi.createObjectURL !== 'function' || !BlobCtor) {
            announceToSR('The structured report could not be downloaded in this environment.');
            return;
          }
          try {
            var blob = new BlobCtor([JSON.stringify(report, null, 2)], { type: 'application/json' });
            var url = urlApi.createObjectURL(blob);
            var link = doc.createElement('a');
            link.href = url;
            link.download = 'magnetism-' + report.missionId + '-report.json';
            link.click();
            if (typeof urlApi.revokeObjectURL === 'function') window.setTimeout(function () { urlApi.revokeObjectURL(url); }, 0);
            announceToSR('Structured lab report downloaded.');
          } catch (e) {
            announceToSR('The structured report could not be downloaded.');
          }
        }
        function saveCsvReport() {
          var rows = [['mission', 'status', 'trial', 'station', 'setup', 'result', 'prediction', 'metric', 'value', 'unit']];
          function cell(value) { return '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"'; }
          report.trials.forEach(function (trial) {
            if (!trial.metrics || !trial.metrics.length) rows.push([report.title, report.status, trial.ordinal, trial.station, trial.setup, trial.result, trial.prediction, '', '', '']);
            else trial.metrics.forEach(function (metric) { rows.push([report.title, report.status, trial.ordinal, trial.station, trial.setup, trial.result, trial.prediction, metric.label, metric.value, metric.unit]); });
          });
          var csv = rows.map(function (row) { return row.map(cell).join(','); }).join('\r\n');
          var doc = typeof document !== 'undefined' ? document : null;
          var urlApi = typeof window !== 'undefined' ? (window.URL || window.webkitURL) : null;
          var BlobCtor = typeof Blob === 'function' ? Blob : null;
          if (!doc || !urlApi || typeof urlApi.createObjectURL !== 'function' || !BlobCtor) {
            announceToSR('The CSV export could not be downloaded in this environment.');
            return;
          }
          try {
            var blob = new BlobCtor([csv], { type: 'text/csv;charset=utf-8' });
            var url = urlApi.createObjectURL(blob);
            var link = doc.createElement('a');
            link.href = url;
            link.download = 'magnetism-' + report.missionId + '-measurements.csv';
            link.click();
            if (typeof urlApi.revokeObjectURL === 'function') window.setTimeout(function () { urlApi.revokeObjectURL(url); }, 0);
            announceToSR('CSV measurement data downloaded.');
          } catch (e) {
            announceToSR('The CSV export could not be downloaded.');
          }
        }        return h('details', { style: { marginTop: 10 } },
          h('summary', { style: { color: TEXT, fontSize: 12, fontWeight: 800, cursor: 'pointer' } }, 'Lab report · ' + report.trialCount + ' trials · ' + report.status),
          h('article', { 'aria-label': 'Mission lab report preview', style: { marginTop: 8, color: SOFT, fontSize: 11.5, lineHeight: 1.5 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 4 } },
              h('b', { style: { color: TEXT, fontSize: 13 } }, report.title),
              h('span', { className: 'viz-badge', style: { color: report.completed ? '#22c55e' : report.accent } }, report.status)),
            h('p', { style: { margin: '0 0 7px' } }, report.goal),
            h('div', { role: 'group', 'aria-label': 'Claim Evidence Reasoning checklist', style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 } },
              cer.items.map(function (item) {
                return h('span', { key: 'cer-' + item.key, className: 'viz-badge', 'aria-label': item.label + ': ' + item.hint, style: { color: item.done ? '#22c55e' : SOFT } }, (item.done ? 'Done · ' : 'Next · ') + item.label);
              })),
            h('div', { style: { color: TEXT, fontWeight: 800, marginBottom: 3 } }, 'Evidence chain'),
            h('ol', { 'aria-label': 'Report evidence chain', style: { margin: '0 0 8px', paddingLeft: 22 } },
              report.steps.map(function (step) {
                return h('li', { key: 'report-step-' + step.label, style: { marginBottom: 3 } },
                  h('b', { style: { color: step.done ? '#22c55e' : TEXT } }, step.done ? 'Done · ' : 'Next · '), step.label + ': ' + step.evidence);
              })),
            h('div', { role: 'note', style: { padding: '7px 9px', borderLeft: '3px solid ' + report.accent, background: 'rgba(148,163,184,.06)', marginBottom: 8 } },
              h('b', { style: { color: TEXT } }, 'Claim: '), report.claim || 'No claim recorded yet.',
              h('span', { style: { display: 'block', marginTop: 3 } }, h('b', { style: { color: TEXT } }, 'Synthesis: '), report.synthesis)),
            report.trialCount ? h('div', { style: { marginBottom: 8 } },
              h('div', { style: { color: TEXT, fontWeight: 800, marginBottom: 3 } }, 'Evidence log'),
              h('ol', { 'aria-label': 'Report trial log', style: { margin: 0, paddingLeft: 22 } },
                report.trials.map(function (trial) {
                  var metrics = trial.metrics && trial.metrics.length ? ' · ' + trial.metrics.map(function (metric) { return metric.label + ' ' + metric.display; }).join(', ') : '';
                  return h('li', { key: 'report-trial-' + trial.ordinal, style: { marginBottom: 4 } },
                    h('b', { style: { color: TEXT } }, 'Trial ' + trial.ordinal + ' · ' + trial.station + ': '), trial.setup + ' -> ' + trial.result + metrics,
                    h('span', { style: { display: 'block' } }, 'Prediction: ' + trial.prediction));
                }))
            ) : h('p', { style: { margin: '0 0 8px' } }, 'No trial entries yet. Record a notebook trial to populate this report.'),
            h('div', { className: 'viz-controls', role: 'group', 'aria-label': 'Report actions', style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
              h('button', { type: 'button', onClick: saveReport, style: btn(true) }, 'Save JSON report'),
              h('button', { type: 'button', onClick: saveCsvReport, style: btn() }, 'Save CSV data'),
              h('span', { style: { color: SOFT } }, report.metricCount + ' structured measurement' + (report.metricCount === 1 ? '' : 's') + ' included'))
          )
        );
      }
      function missionControl() {
        var review = missionEvidenceReviewState(d.missionId, d);
        var progress = review;
        var mission = progress.mission;
        var next = progress.steps[progress.nextStepIndex] || progress.steps[0];
        var started = !!d.missionStarted;
        function openStep(step) {
          var patch = { missionId: mission.id, missionStarted: true, missionSeen: true, tab: step.tab };
          if (step.questId === 'mag_generator_phase') patch.induceMode = 'coil';
          if (step.questId === 'mag_induce') patch.induceMode = 'hand';
          if (step.questId === 'mag_lorentz') patch.motorMode = 'particle';
          if (step.questId === 'mag_motor' || step.questId === 'mag_motor_direction') patch.motorMode = 'forces';
          upd(patch);
          announceToSR('Mission step opened: ' + step.label + '. ' + step.hint);
        }
        function chooseMission(event) {
          var selected = event.target.value;
          var chosen = MISSION_DEFS[0];
          for (var i = 0; i < MISSION_DEFS.length; i++) if (MISSION_DEFS[i].id === selected) chosen = MISSION_DEFS[i];
          upd({ missionId: chosen.id, missionStarted: false, missionSeen: true });
          announceToSR(chosen.label + ' mission selected.');
        }
        var xs = [48, 188, 328, 468];
        var missionStatus = progress.completed ? 'Mission complete. You have evidence for every step.' : (started ? progress.doneCount + ' of ' + progress.total + ' steps complete. Next: ' + next.label + '.' : 'Start the mission, then use the existing stations to collect evidence.');
        var timelineAria = mission.label + ' mission timeline. ' + progress.doneCount + ' of ' + progress.total + ' steps complete. ' + progress.steps.map(function (step) { return step.label + (step.done ? ', done' : ', not done'); }).join('; ') + '.';
        return card('Mission Control', h('div', null,
          h('div', { className: 'viz-controls', role: 'group', 'aria-label': 'Mission selection', style: { display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap', marginBottom: 8 } },
            h('div', { style: { flex: '1 1 260px', minWidth: 0 } },
              h('label', { className: 'form-label', htmlFor: 'mag-mission-select', style: { display: 'block', color: TEXT, fontSize: 12.5, fontWeight: 700, marginBottom: 4 } }, 'Choose a design target'),
              h('select', { id: 'mag-mission-select', className: 'form-select', value: mission.id, onChange: chooseMission, 'aria-describedby': 'mag-mission-goal', style: { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid ' + BORDER, background: PANEL, color: TEXT, fontSize: 13 } },
                MISSION_DEFS.map(function (item) { return h('option', { key: item.id, value: item.id }, item.icon + ' ' + item.label); }))),
            h('span', { className: 'viz-badge', style: { color: mission.accent, fontSize: 11.5, fontWeight: 800 } }, progress.doneCount + '/' + progress.total + ' steps')),
          h('p', { id: 'mag-mission-goal', style: { color: SOFT, fontSize: 12.5, margin: '0 0 8px', lineHeight: 1.45 } }, mission.goal),
          h('svg', { viewBox: '0 0 520 134', width: '100%', style: { display: 'block', maxWidth: 760, margin: '0 auto 8px' }, role: 'img', 'aria-label': timelineAria },
            h('rect', { x: 0, y: 0, width: 520, height: 134, rx: 10, fill: INSTRUMENT }),
            h('text', { x: 260, y: 17, fill: TEXT, fontSize: 11.5, fontWeight: 800, textAnchor: 'middle' }, 'MISSION TIMELINE · COLLECT → CONNECT → DEFEND'),
            progress.steps.slice(0, 4).map(function (step, index) {
              var x = xs[index];
              var isNext = !step.done && index === progress.nextStepIndex;
              return h('g', { key: step.questId },
                index < progress.steps.length - 1 ? h('line', { x1: x + 16, y1: 58, x2: xs[index + 1] - 16, y2: 58, stroke: step.done && progress.steps[index + 1].done ? '#22c55e' : BORDER, strokeWidth: 2 }) : null,
                h('circle', { cx: x, cy: 58, r: isNext ? 15 : 13, fill: step.done ? '#22c55e' : INSTRUMENT, stroke: step.done ? '#22c55e' : (isNext ? mission.accent : BORDER), strokeWidth: isNext ? 3 : 2 }),
                h('text', { x: x, y: 62, fill: step.done ? '#052e16' : TEXT, fontSize: 11, fontWeight: 800, textAnchor: 'middle' }, step.done ? '✓' : String(index + 1)),
                h('text', { x: x, y: 89, fill: TEXT, fontSize: 10.5, fontWeight: 800, textAnchor: 'middle' }, step.label),
                h('text', { x: x, y: 105, fill: SOFT, fontSize: 9.5, textAnchor: 'middle' }, step.tab + ' station'));
            })),
          h('div', { className: 'mag-observe', role: 'status', 'aria-live': 'polite' },
            h('span', { 'aria-hidden': 'true' }, progress.completed ? '✓' : '🧭'),
            h('span', null, h('b', null, missionStatus + ' '), progress.completed ? 'Choose another target to transfer the idea to a new system.' : next.hint)),
          h('div', { style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 8 } },
            progress.completed ? h('span', { style: { color: '#22c55e', fontSize: 12, fontWeight: 800, padding: '8px 0' } }, 'Mission evidence complete ✓') : h('button', { onClick: function () { openStep(next); }, style: btn(true) }, started ? 'Open next: ' + next.label : 'Start mission → ' + next.label),
            h('span', { style: { color: SOFT, fontSize: 11.5, padding: '8px 0' } }, 'Steps stay linked to your real station progress.')),
          h('details', { open: started || progress.completed, style: { marginTop: 9 } },
            h('summary', { style: { color: TEXT, fontSize: 12, fontWeight: 800, cursor: 'pointer' } }, 'Design review · what the evidence proves'),
            h('ol', { 'aria-label': 'Mission evidence chain', style: { margin: '8px 0 7px', paddingLeft: 22, color: SOFT, fontSize: 11.5, lineHeight: 1.45 } },
              progress.steps.map(function (step) {
                return h('li', { key: 'review-' + step.questId, style: { marginBottom: 5 } },
                  h('b', { style: { color: step.done ? '#22c55e' : SOFT } }, step.done ? 'Done · ' : 'Next · '),
                  h('b', { style: { color: TEXT } }, step.label + ': '), step.evidence);
              })),
            h('div', { role: 'note', style: { color: SOFT, fontSize: 11.5, lineHeight: 1.45, padding: '8px 9px', borderLeft: '3px solid ' + mission.accent, background: 'rgba(148,163,184,.06)' } },
              h('b', { style: { color: TEXT } }, 'Evidence proves: '), review.synthesis, ' ', review.claimStatus)),
          missionReplayPanel(),
          missionReportPanel()
        ), '#fbbf24');
      }

      // Show one actionable next step first; keep the full journey available
      // in an expandable overview so progress does not become visual clutter.
      function journeyStrip() {
        var doneCount = 0;
        var nextQuest = null;
        var questStates = QUEST_DEFS.map(function (q) {
          var done = false;
          try { done = !!q.check({ magnetism: d }); } catch (e) {}
          if (done) doneCount++; else if (!nextQuest) nextQuest = q;
          return { quest: q, done: done };
        });
        function openQuest(q, done) {
          upd(Object.assign({ tab: q.tab }, q.tab === 'earth' ? { earthSeen: true } : {}));
          announceToSR(q.label + ' - ' + (done ? 'already complete' : 'next investigation'));
        }
        return h('div', { role: 'group', 'aria-label': 'Learning journey: ' + doneCount + ' of ' + QUEST_DEFS.length + ' quests done',
          style: { padding: '8px 10px', borderRadius: 10, background: 'rgba(148,163,184,0.06)', border: '1px solid ' + BORDER, marginBottom: 12 } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
            h('span', { style: { color: SOFT, fontSize: 11, fontWeight: 700 } }, 'Journey ' + doneCount + '/' + QUEST_DEFS.length),
            h('div', { 'aria-hidden': 'true', style: { flex: 1, minWidth: 80, height: 7, borderRadius: 5, overflow: 'hidden', background: 'rgba(148,163,184,.18)' } },
              h('div', { style: { width: (doneCount / QUEST_DEFS.length * 100).toFixed(1) + '%', height: '100%', background: '#22c55e', transition: _prefersReducedMotion ? 'none' : 'width .25s' } })),
            nextQuest ? h('button', { onClick: function () { openQuest(nextQuest, false); }, style: btn(true) }, 'Next: ' + nextQuest.label)
              : h('span', { style: { color: '#22c55e', fontSize: 12, fontWeight: 800 } }, 'Master of Magnetism!')),
          h('details', { style: { marginTop: 7 } },
            h('summary', { style: { color: SOFT, fontSize: 11, cursor: 'pointer' } }, 'All ' + QUEST_DEFS.length + ' investigations'),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', paddingTop: 8 } },
              questStates.map(function (state) {
                var q = state.quest, done = state.done;
                return h('button', { key: q.id,
                  'data-tooltip': q.label + (done ? ' - done' : ''),
                  'aria-label': (done ? 'Done: ' : 'To do: ') + q.label + '. Opens the ' + q.tab + ' section.',
                  'aria-pressed': d.tab === q.tab ? 'true' : 'false',
                  onClick: function () { openQuest(q, done); },
                  style: { width: 36, height: 36, borderRadius: 9, fontSize: 15, cursor: 'pointer', position: 'relative',
                    border: '1px solid ' + (done ? '#22c55e' : BORDER),
                    background: done ? 'rgba(34,197,94,0.15)' : 'transparent',
                    opacity: done ? 1 : 0.72 } },
                  q.icon,
                  done ? h('span', { 'aria-hidden': 'true', style: { position: 'absolute', right: -3, top: -5, fontSize: 11, color: '#22c55e', fontWeight: 900 } }, '✓') : null);
              })))
        );
      }

      function factStrip() {
        return h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, background: 'rgba(244,63,94,0.08)', border: '1px solid ' + BORDER, marginTop: 4 } },
          h('span', { style: { fontSize: 18 } }, '💡'),
          h('p', { style: { color: SOFT, fontSize: 12.5, margin: 0, flex: 1, lineHeight: 1.45 } }, FACTS[d.factIdx % FACTS.length]),
          h('button', { 'aria-label': 'Next fact', onClick: function () { upd({ factIdx: (d.factIdx + 1) % FACTS.length }); }, style: { padding: '4px 10px', borderRadius: 8, border: '1px solid ' + BORDER, background: PANEL, color: TEXT, cursor: 'pointer', fontSize: 12 } }, 'Next ↻'));
      }

      var body = d.tab === 'field' ? fieldTab()
        : d.tab === 'electro' ? electroTab()
        : d.tab === 'motor' ? motorTab()
        : d.tab === 'induce' ? induceTab()
        : d.tab === 'materials' ? materialsTab()
        : d.tab === 'crane' ? craneTab()
        : d.tab === 'maze' ? mazeTab()
        : d.tab === 'transformer' ? transformerTab()
        : d.tab === 'earth' ? earthTab()
        : quizTab();

      return h('div', { className: 'mag-root', style: { maxWidth: 780, margin: '0 auto', color: TEXT } },
        wcagStyles(),
        h('div', { className: 'mag-sronly', role: 'status', 'aria-live': 'polite' }, ''),
        h('header', { className: 'mag-hero' },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 } },
            h('span', { 'aria-hidden': 'true', style: { display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 13, background: 'rgba(244,63,94,0.18)', fontSize: 27 } }, '🧲'),
            h('div', { style: { minWidth: 0 } },
              h('div', { className: 'mag-kicker' }, 'Interactive physics studio · NGSS MS-PS2'),
              h('h2', { style: { margin: 0, fontSize: 20, fontWeight: 800, color: TEXT, lineHeight: 1.25 } }, 'Magnetism & Electromagnetism'),
              h('p', { style: { margin: '3px 0 0', fontSize: 12.5, color: SOFT, lineHeight: 1.4 } }, 'Reveal an invisible field, build it with current, and turn motion into electricity.')))),
        missionControl(),
        journeyStrip(),
        learningModeSwitch(),
        tabBar(),
        stationGuide(),
        d.tab !== 'quiz' ? investigationNotebook() : null,
        h('div', { id: 'mag-panel-' + d.tab, role: 'tabpanel', 'aria-labelledby': 'mag-tab-' + d.tab }, body),
        d.tab !== 'quiz' ? askBox() : null,
        factStrip()
      );
    }
  });

  // Expose pure helpers for the test suite (no-op in the browser bundle).
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CORE_MATERIALS: CORE_MATERIALS, coreAdjustedField: coreAdjustedField, finiteSolenoidCenterField: finiteSolenoidCenterField, solenoidWireLength: solenoidWireLength, solenoidHeatingIndex: solenoidHeatingIndex, solenoidFieldAt3D: solenoidFieldAt3D, traceSolenoidLine3D: traceSolenoidLine3D, coilNormal3D: coilNormal3D, coilFlux3D: coilFlux3D, inducedVoltage3D: inducedVoltage3D, inductionPass3D: inductionPass3D, dipoleMoment3D: dipoleMoment3D, dipoleFieldAt3D: dipoleFieldAt3D, fieldAt3D: fieldAt3D, fieldComponentsAt3D: fieldComponentsAt3D, traceLine3D: traceLine3D, findFieldNull3D: findFieldNull3D, dipoleFieldAt: dipoleFieldAt, fieldAt: fieldAt, fieldComponentsAt: fieldComponentsAt, fieldProbeReading: fieldProbeReading, fieldScanSeries: fieldScanSeries, fieldPowerLawFit: fieldPowerLawFit, traceLine: traceLine, solenoidField: solenoidField, wireForce: wireForce, wireForceVectorState: wireForceVectorState, motorPowerBridgeState: motorPowerBridgeState, motorTorqueFactor: motorTorqueFactor, motorLoadState: motorLoadState, motorLoadTrialState: motorLoadTrialState, motorSpatialState: motorSpatialState, motorGeneratorBench: motorGeneratorBench, motorGeneratorTransientStep: motorGeneratorTransientStep, motorGeneratorSimulate: motorGeneratorSimulate, evaluateMotorGeneratorMission: evaluateMotorGeneratorMission, describeMotorGeneratorTrialChange: describeMotorGeneratorTrialChange, magnetPairForce: magnetPairForce, ANALYZER_SPECIES: ANALYZER_SPECIES, velocitySelectorState: velocitySelectorState, chargedParticleTrajectory: chargedParticleTrajectory, chargedParticleHelix: chargedParticleHelix, chargedParticleMirror: chargedParticleMirror, magnetosphereTeachingState: magnetosphereTeachingState, chargedParticleComparison: chargedParticleComparison, rotatingFlux: rotatingFlux, rotatingEMF: rotatingEMF, rotatingPhaseState: rotatingPhaseState, fluxAt: fluxAt, induceEMF: induceEMF, transformerOut: transformerOut, transformerLoad: transformerLoad, hysteresisMagnetization: hysteresisMagnetization, eddyBrakeFactor: eddyBrakeFactor, eddyBrakeState: eddyBrakeState, CRANE_ORDER: CRANE_ORDER, BIN_SLOT: BIN_SLOT, domainAngle: domainAngle, countCycles: countCycles, MAZE_ROUNDS: MAZE_ROUNDS, mazeCellToField: mazeCellToField, mazePoles: mazePoles, MATERIALS: MATERIALS, QUIZ: QUIZ, QUIZ_TABS: QUIZ_TABS, QUIZ_PASS: QUIZ_PASS, MISSION_DEFS: MISSION_DEFS, missionProgressState: missionProgressState, missionEvidenceReviewState: missionEvidenceReviewState, missionReplayState: missionReplayState, notebookMetricSnapshot: notebookMetricSnapshot, missionReportState: missionReportState, missionCERState: missionCERState, MU0: MU0 };
  }
})();
