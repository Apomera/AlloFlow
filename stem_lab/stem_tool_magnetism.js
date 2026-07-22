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
//   • Quiz — 12 questions with a quest hook at 9+.
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
  var _induction3DRAF = null;
  var _induction3DRunToken = 0;

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

  // Force on one wire side of the motor loop: F = B · I · L (newtons).
  function wireForce(B, current, lengthM) { return B * current * lengthM; }

  // Relative torque for the visible loop angle. The direction reverses when
  // either current or field reverses; the magnitude follows τ ∝ I·B·sinθ.
  function motorTorqueFactor(current, fieldStrength, angleDeg, currentDir, fieldDir) {
    var sign = (currentDir < 0 ? -1 : 1) * (fieldDir < 0 ? -1 : 1);
    return sign * Math.abs(current * fieldStrength) * Math.abs(Math.sin(angleDeg * Math.PI / 180));
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

  // Rotating-coil phase model at fixed area and angular speed. These are
  // proportional values: Φ = NBA cosθ and ε = NBAω sinθ.
  function rotatingFlux(angleDeg, turns, fieldStrength) {
    return turns * fieldStrength * Math.cos(angleDeg * Math.PI / 180);
  }
  function rotatingEMF(angleDeg, turns, fieldStrength, speedFactor) {
    var omegaScale = speedFactor == null ? 1 : Math.max(0, speedFactor);
    return turns * fieldStrength * omegaScale * Math.sin(angleDeg * Math.PI / 180);
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

      // Fresh per render so the defaults-merge below can never share (and
      // never mutate) a module-level object between renders.
      var MAG_DEFAULTS = {
        tab: 'field',
        // Field Explorer
        magnets: [{ x: -70, y: 0, angle: 0, polarity: 1 }],
        compass: { x: 90, y: 90 }, filings: false, compassMoved: false,
        sawAttract: false, sawRepel: false, fieldVectors: true, fieldDrag: null, fieldSelected: 0,
        fieldView: '2d', field3dStatus: 'loading', field3dAttempt: 0, field3dUsed: false,
        field3dMagnets: [{ x: -1.6, y: 0, z: 0, yaw: 0, pitch: 0, polarity: 1, strength: 1 }, { x: 1.6, y: 0, z: 0, yaw: 0, pitch: 0, polarity: 1, strength: 1 }],
        field3dProbe: { x: 0, y: 1.8, z: 1.2 }, field3dSelected: 0,
        field3dVectors: true, field3dLines: true, field3dSlice: 'xz', field3dSliceOffset: 0, field3dNullFound: false,
        // Electromagnet
        turns: 20, current: 2, currentDir: 1, windingDir: 1, core: false, coilTouched: false, directionSeen: false,
        // Motor
        motorCurrent: 3, motorField: 4, motorCurrentDir: 1, motorFieldDir: 1,
        motorRunning: false, motorAngle: 90, motorRan: false, motorDirectionSeen: false,
        // Force bench + charged-particle beam
        pairDistance: 70, pairStrength1: 1, pairStrength2: 1, pairAttract: true,
        chargeSign: 1, chargeField: 1, chargeSpeed: 5, chargeB: 4,
        // Rotating-coil generator
        induceMode: 'hand', genAngle: 0, genTurns: 60, genField: 4, genRPM: 60,
        genSpeedSeen: false, genPhaseSeen: false,
        // 3-D induction studio
        ind3dStatus: 'loading', ind3dAttempt: 0, ind3dUsed: false, ind3dRunning: false,
        ind3dMagnet: { x: -3.2, y: 0, z: 0, yaw: 0, pitch: 0, polarity: 1, strength: 1.4 },
        ind3dCoilRadius: 1.25, ind3dCoilYaw: 0, ind3dCoilPitch: 0, ind3dTurns: 80,
        ind3dStepTime: 0.5, ind3dFlux: 0, ind3dEMF: 0, ind3dTrace: [], ind3dTrialMsg: '',
        // Learning mode + investigation notebook
        learningMode: 'guided', notebookOpen: false, notebookPrediction: '', notebookClaim: '',
        notebookTrials: [], notebookUsed: false, forceBenchUsed: false, lorentzUsed: false,
        // Earth
        earthSeen: false, declination: 12,
        // Induction (generator)
        induceX: -100, inducePrevX: -100, induceTurns: 50, lastEMF: 0, peakEMF: 0,
        emfTrace: [], induceTrialMsg: '',
        // Eddy-current tube race
        tubeProg: { cu: 0, pl: 0 }, tubeRunning: false, tubeDone: false,
        eddyMaterial: 'copper', eddyThickness: 4, eddySlit: false,
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
      if (!labToolData || !labToolData.magnetism) {
        setLabToolData(function (prev) {
          return Object.assign({}, prev, { magnetism: MAG_DEFAULTS });
        });
        return h('div', { style: { padding: 24, color: SOFT, textAlign: 'center' } }, __alloT('stem.magnetism.initializing', '🧲 Charging the coils…'));
      }
      // PARTIAL state must render, not crash: saved projects from older
      // versions (and the render gate's per-tab probe) supply only some
      // fields — layer the defaults under whatever is present.
      var d = Object.assign({}, MAG_DEFAULTS, labToolData.magnetism);
      function upd(patch) {
        setLabToolData(function (prev) {
          var s = Object.assign({}, (prev && prev.magnetism) || {}, patch);
          return Object.assign({}, prev, { magnetism: s });
        });
      }

      function card(title, children, accent) {
        return h('div', { className: 'mag-card', role: 'region', 'aria-label': typeof title === 'string' ? title : undefined, style: { '--mag-accent': accent || '#f43f5e', padding: 14, borderRadius: 12, background: PANEL, border: '1px solid ' + BORDER, borderLeft: '3px solid ' + (accent || '#f43f5e'), marginBottom: 12 } },
          title ? h('h3', { className: 'mag-card-title', style: { fontSize: 14, fontWeight: 800, color: TEXT, margin: '0 0 8px' } }, title) : null,
          children);
      }

      function wcagStyles() {
        return h('style', { dangerouslySetInnerHTML: { __html:
          '.mag-root button:focus-visible,.mag-root input:focus-visible,.mag-root select:focus-visible,.mag-root textarea:focus-visible,.mag-root [tabindex]:focus-visible{outline:3px solid #fbbf24;outline-offset:2px;border-radius:8px}' +
          '.mag-root .mag-sronly{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}' +
          '.mag-root{--mag-rose:#f43f5e;--mag-gold:#fbbf24;--mag-green:#34d399}' +
          '.mag-root .mag-hero{position:relative;overflow:hidden;padding:16px 18px;border:1px solid ' + BORDER + ';border-radius:16px;background:linear-gradient(135deg,rgba(244,63,94,.16),rgba(56,189,248,.06) 58%,transparent);margin-bottom:12px}' +
          '.mag-root .mag-hero:after{content:"";position:absolute;width:130px;height:130px;border:22px solid rgba(244,63,94,.08);border-radius:50%;right:-48px;top:-72px;pointer-events:none}' +
          '.mag-root .mag-kicker{text-transform:uppercase;letter-spacing:.12em;font-size:10px;font-weight:800;color:var(--mag-rose);margin-bottom:3px}' +
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
          '.mag-root .mag-observe{display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:start;padding:9px 10px;border-radius:10px;background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.24);margin:9px 0;color:' + SOFT + ';font-size:12px;line-height:1.45}' +
          '.mag-root .mag-observe b{color:' + TEXT + '}' +
          '.mag-root .mag-field3d,.mag-root .mag-induction3d{height:410px}' +
          '@media(max-width:480px){.mag-root .mag-sim-grid{grid-template-columns:1fr!important}.mag-root .mag-field3d,.mag-root .mag-induction3d{height:320px}}' +
          '@media(max-width:640px){.mag-root .mag-station{grid-template-columns:1fr 1fr}.mag-root .mag-station-main{grid-column:1/-1}.mag-root .mag-cycle{border-left:0;border-top:2px solid ' + BORDER + '}.mag-root .mag-cycle:last-child{grid-column:1/-1}.mag-root .mag-hero{padding:14px}.mag-root .mag-tabs button{flex:1 1 145px}}' +
          '@media(max-width:390px){.mag-root .mag-station{grid-template-columns:1fr}.mag-root .mag-cycle:last-child{grid-column:auto}}' +
          (_prefersReducedMotion ? '.mag-root *{animation:none!important;transition:none!important}' : '')
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
        earth: { phase: 'Planet-scale field', icon: '🌍', goal: 'Connect a compass to Earth’s dynamic field.', predict: 'Is magnetic north true north?', test: 'Change the declination angle.', explain: 'Distinguish magnetic and geographic poles.' },
        quiz: { phase: 'Retrieve & reflect', icon: '🧠', goal: 'Use evidence from the lab, not memorized slogans.', predict: 'Commit to one answer.', test: 'Read the feedback after each choice.', explain: 'Revisit only the concepts you missed.' }
      };
      function tabBar() {
        return h('div', { className: 'mag-tabs', role: 'tablist', 'aria-label': 'Magnetism sections', style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
          TABS.map(function (t) {
            var on = d.tab === t.id;
            return h('button', { key: t.id, role: 'tab', 'aria-selected': on ? 'true' : 'false',
              'aria-controls': 'mag-panel-' + t.id,
              onClick: function () { upd(Object.assign({ tab: t.id }, t.id === 'earth' ? { earthSeen: true } : {})); announceToSR(t.label + ' section'); },
              style: { padding: '8px 12px', borderRadius: 9, border: '1px solid ' + (on ? '#f43f5e' : BORDER), background: on ? '#f43f5e' : 'transparent', color: on ? '#fff' : SOFT, fontWeight: 700, fontSize: 13, cursor: 'pointer' } }, t.label);
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
          h('canvas', {
            key: 'field3d-' + (d.field3dAttempt || 0),
            ref: field3DCanvasRef,
            className: 'mag-field3d',
            role: 'img',
            'aria-label': 'Interactive three-dimensional magnetic field. Two red and blue bar magnets create curved streamlines and sampled vector arrows. A gold probe at x ' + probe.x.toFixed(2) + ', y ' + probe.y.toFixed(2) + ', z ' + probe.z.toFixed(2) + ' shows the resultant field vector.',
            style: { display: 'block', width: '100%', borderRadius: 10, border: '1px solid ' + BORDER, background: INSTRUMENT, touchAction: 'none' }
          }),
          h('div', { role: 'status', style: { color: d.field3dStatus === 'error' ? '#fbbf24' : SOFT, fontSize: 11.5, lineHeight: 1.45, margin: '7px 0' } },
            d.field3dStatus === 'ready' ? '3D scene ready. Drag to orbit; drag a magnet to move it on the x-z plane.' :
            d.field3dStatus === 'error' ? h('span', null, '3D graphics did not load. The 2D map is still fully available. ',
              h('button', { onClick: function () { upd({ field3dStatus: 'loading', field3dAttempt: (d.field3dAttempt || 0) + 1 }); }, style: btn() }, 'Retry 3D')) :
              'Loading the 3D field engine...'),
          h('p', { style: { color: SOFT, fontSize: 11.5, margin: '0 0 8px', lineHeight: 1.4 } }, 'Axis key: x = left/right, y = height, z = depth. Red is north; blue is south.'),
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
            h('span', { style: { color: '#38bdf8' } }, h('i', { className: 'mag-swatch', 'aria-hidden': 'true' }), 'cyan arrows sample local direction'),
            h('span', { style: { color: '#f43f5e' } }, h('i', { className: 'mag-swatch', 'aria-hidden': 'true' }), 'curves follow the field'),
            h('span', { style: { color: '#fbbf24' } }, h('i', { className: 'mag-swatch', 'aria-hidden': 'true' }), 'gold arrow is the probe total')),
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

      function fieldTab() {
        var two = d.magnets.length > 1;
        return h('div', null,
          h('div', { role: 'group', 'aria-label': 'Field Explorer dimension', style: { display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 } },
            h('span', { style: { color: SOFT, fontSize: 11.5, fontWeight: 700 } }, 'Explore the field in'),
            h('button', { 'aria-pressed': d.fieldView !== '3d' ? 'true' : 'false', onClick: function () { upd({ fieldView: '2d' }); announceToSR('Two-dimensional field map selected.'); }, style: btn(d.fieldView !== '3d') }, '2D field map'),
            h('button', { 'aria-pressed': d.fieldView === '3d' ? 'true' : 'false', onClick: function () { if (d.fieldView === '3d') return; upd({ fieldView: '3d', field3dStatus: 'loading', field3dUsed: true }); announceToSR('Three-dimensional field studio selected.'); }, style: btn(d.fieldView === '3d') }, '3D field studio')),
          d.fieldView === '3d' ? field3DCard() : card('Trace the invisible field', h('div', null,
            h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } }, 'Field lines leave the ', h('b', { style: { color: '#ef4444' } }, 'north (red)'), ' pole and curve back into the ', h('b', { style: { color: '#3b82f6' } }, 'south (blue)'), ' pole. Click open space to move the compass, or drag a magnet to rebuild the field. The needle follows the local resultant field.'),
            h('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 8 } }, renderFieldSVG()),
            h('div', { className: 'mag-legend', 'aria-label': 'Field visual legend' },
              h('span', { style: { color: '#fbbf24' } }, h('i', { className: 'mag-swatch', 'aria-hidden': 'true' }), 'arrows show N → S'),
              h('span', { style: { color: '#f43f5e' } }, h('i', { className: 'mag-swatch', 'aria-hidden': 'true' }), 'closer lines = stronger field'),
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
                h('span', { 'aria-hidden': 'true', style: { letterSpacing: 1, color: '#f43f5e' } }, '▮'.repeat(level + 1) + '▯'.repeat(5 - level)),
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
          d.fieldView !== '3d' && two ? card('Attract or repel?', h('div', null,
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
          forceBenchCard(),
          disclosure('Field lines here are a schematic dipole model. A real bar magnet’s field is messier right at the metal; the traced lines show the correct direction and shape (topology), not exact strength.')
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
      function electroTab() {
        var coreMult = d.core ? 600 : 1;
        var B = solenoidField(d.turns, d.current, 0.1, coreMult); // 10 cm coil
        var fieldDir = (d.currentDir < 0 ? -1 : 1) * (d.windingDir < 0 ? -1 : 1);
        var rel = B / solenoidField(20, 2, 0.1, 1); // strength vs the default air coil
        var bars = Math.max(1, Math.min(40, Math.round(rel * 4)));
        return h('div', null,
          card('Build an electromagnet', h('div', null,
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
          )),
          disclosure('B = μ₀·(N/L)·I is exact for a long ideal solenoid. The iron-core boost is shown as roughly ×600; real soft-iron cores range from about ×100 to a few thousand, depending on the metal and how hard you drive it.'),
          '#f59e0b'
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
      function motorTab() {
        var F = wireForce(d.motorField / 10, d.motorCurrent, 0.05); // schematic B in "×0.1 T" units
        var torqueSigned = motorTorqueFactor(d.motorCurrent, d.motorField, d.motorAngle, d.motorCurrentDir, d.motorFieldDir);
        var torqueRel = Math.abs(torqueSigned) / (4 * 3);
        var motorDirection = d.motorCurrentDir * d.motorFieldDir > 0 ? 'clockwise' : 'counter-clockwise';
        return h('div', null,
          card('How a motor spins', h('div', null,
            h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } }, 'Current in the loop sits inside a magnet’s field. Each side feels a force ', h('b', null, 'F = B·I·L'), ' — one side pushed up, the other down. That twist is torque. A ', h('b', null, 'commutator'), ' flips the current every half turn so the push never reverses.'),
            h('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 6 } }, motorSVG()),
            motorTorqueGraph(),
            slider('Current (I)', d.motorCurrent, 0, 6, 1, function (v) { upd({ motorCurrent: v }); }),
            slider('Magnet strength (B)', d.motorField, 1, 8, 1, function (v) { upd({ motorField: v }); }),
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
              h('button', { onClick: function () {
                  var running = !d.motorRunning;
                  upd({ motorRunning: running, motorRan: true, motorAngle: running ? d.motorAngle : d.motorAngle });
                  if (running) { spinMotor(); announceToSR('Motor running'); } else { announceToSR('Motor stopped'); }
                }, style: btn(d.motorRunning) }, d.motorRunning ? '⏹ Stop' : '▶ Run motor'),
              h('button', { onClick: function () { var md = d.motorCurrentDir * d.motorFieldDir > 0 ? 1 : -1; upd({ motorAngle: (d.motorAngle + md * 30 + 360) % 360, motorRan: true }); }, style: btn() }, '↻ Step by hand')),
            h('div', { className: 'mag-observe' },
              h('span', { 'aria-hidden': 'true' }, '🔋'),
              h('span', null, h('b', null, 'Follow the energy: '), 'battery → moving charges → opposite magnetic forces → rotation. The commutator changes current direction, not the motor’s direction of rotation.')),
            h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)' } },
              h('div', { style: { color: TEXT, fontSize: 13, fontWeight: 700 } }, 'Force on each active wire side ≈ ' + F.toFixed(3) + ' N · torque ≈ ' + torqueRel.toFixed(2) + '× baseline · ' + motorDirection),
              h('div', { style: { color: SOFT, fontSize: 12, marginTop: 4 } }, 'Torque grows with current, field, and sin θ. ' + (d.motorCurrent === 0 ? 'No current → no force → it will not turn.' : 'Reverse current OR field to reverse rotation; reverse both and the original direction returns.')))
          ), '#38bdf8'),
          chargedParticleCard(),
          disclosure('The spin here is a teaching animation, not a timed simulation — angle advances at a steady rate so you can watch the commutator flip. The force law F = B·I·L and the "torque grows with B and I" relationship are real. The particle beam uses a uniform-field trajectory model with distance shown schematically.')
        );
      }

      function chargedParticleCard() {
        var pts = chargedParticleTrajectory(d.chargeSign, d.chargeField, d.chargeSpeed, d.chargeB, 36);
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
          h('svg', { viewBox: '0 0 320 200', width: '100%', style: { maxWidth: 520, display: 'block', margin: '0 auto 10px' }, role: 'img',
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
          h('div', { className: 'mag-observe', role: 'status' },
            h('span', { 'aria-hidden': 'true' }, '🧭'),
            h('span', null, h('b', null, 'Path bends ' + (bendsUp ? 'up' : 'down') + ' · radius indicator ' + radiusRel.toFixed(2) + '. '),
              'Faster particles make wider arcs; a stronger field makes tighter arcs. This is the operating idea behind mass spectrometers and particle-beam steering.'))
        ), '#a78bfa');
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
          h('line', { x1: 18, y1: 46, x2: 302, y2: 46, stroke: '#475569' }),
          h('polyline', { points: pts.join(' '), fill: 'none', stroke: '#38bdf8', strokeWidth: 2.5 }),
          h('line', { x1: px, y1: 14, x2: px, y2: 70, stroke: 'rgba(251,191,36,.45)', strokeDasharray: '3 3' }),
          h('circle', { cx: px, cy: py, r: 4.5, fill: '#fbbf24', stroke: '#0b1220', strokeWidth: 1.5 }),
          h('text', { x: 18, y: 76, fill: SOFT, fontSize: 8.5 }, '0°'),
          h('text', { x: 160, y: 76, fill: SOFT, fontSize: 8.5, textAnchor: 'middle' }, '180°'),
          h('text', { x: 302, y: 76, fill: SOFT, fontSize: 8.5, textAnchor: 'end' }, '360°'));
      }

      function motorSVG() {
        var deg = d.motorAngle;
        var loopColor = d.motorCurrent > 0 ? '#f59e0b' : '#475569';
        var torqueDir = d.motorCurrentDir * d.motorFieldDir > 0 ? 1 : -1;
        var half = ((Math.floor(deg / 180) % 2 === 0) ? 1 : -1) * torqueDir; // commutator + supply/field direction
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

      var _spinRAF = null;
      function spinMotor() {
        if (_prefersReducedMotion) { return; } // respect reduced motion — use "Step by hand"
        if (_spinRAF) return;
        var last = null;
        function frame(ts) {
          var cur = (ctx.toolData && ctx.toolData.magnetism) || {};
          if (!cur.motorRunning) { _spinRAF = null; return; }
          if (last == null) last = ts;
          var dt = ts - last; last = ts;
          var spinDir = (cur.motorCurrentDir || 1) * (cur.motorFieldDir || 1) > 0 ? 1 : -1;
          var angleFactor = 0.18 + 0.82 * Math.abs(Math.sin((cur.motorAngle || 0) * Math.PI / 180)); // inertia carries the loop through torque dead spots
          var rate = (cur.motorCurrent * cur.motorField) * 0.02 * angleFactor * spinDir;
          upd({ motorAngle: (cur.motorAngle + dt * rate + 360) % 360 });
          _spinRAF = window.requestAnimationFrame(frame);
        }
        _spinRAF = window.requestAnimationFrame(frame);
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
          h('text', { x: 10, y: 16, fill: '#fb7185', fontSize: 11 }, 'flux Î¦'),
          h('text', { x: 10, y: 101, fill: '#fbbf24', fontSize: 11 }, 'voltage Îµ'),
          h('line', { x1: left, y1: topMid, x2: W - right, y2: topMid, stroke: BORDER, strokeWidth: 1 }),
          h('line', { x1: left, y1: bottomMid, x2: W - right, y2: bottomMid, stroke: BORDER, strokeWidth: 1 }),
          h('line', { x1: left, y1: 12, x2: left, y2: 177, stroke: BORDER, strokeWidth: 1 }),
          fluxPoints.length > 1 ? h('polyline', { points: fluxPoints.join(' '), fill: 'none', stroke: '#fb7185', strokeWidth: 2.5, strokeLinejoin: 'round' }) : h('circle', { cx: left, cy: topMid - currentFlux / maxFlux * 29, r: 4, fill: '#fb7185' }),
          emfPoints.length > 1 ? h('polyline', { points: emfPoints.join(' '), fill: 'none', stroke: '#fbbf24', strokeWidth: 2.5, strokeLinejoin: 'round' }) : h('circle', { cx: left, cy: bottomMid - currentEMF / maxEMF * 29, r: 4, fill: '#fbbf24' }),
          h('line', { x1: xAt(samples.length - 1), y1: 12, x2: xAt(samples.length - 1), y2: 177, stroke: 'rgba(52,211,153,.55)', strokeWidth: 1, strokeDasharray: '4 3' }),
          h('text', { x: W - right, y: 186, fill: SOFT, fontSize: 10, textAnchor: 'end' }, 'motion samples â†’'),
          h('text', { x: W - right, y: 17, fill: SOFT, fontSize: 10, textAnchor: 'end' }, 'current ' + currentFlux.toFixed(2)),
          h('text', { x: W - right, y: 102, fill: SOFT, fontSize: 10, textAnchor: 'end' }, 'current ' + currentEMF.toFixed(2)));
      }
      function induction3DCard() {
        var state = currentInduction3DState();
        var magnet = state.magnet, coil = state.coil;
        var flux = state.flux, emf = Number(d.ind3dEMF) || 0;
        var direction = Math.abs(emf) < 0.005 ? 'no induced current while the flux is unchanged' : (emf > 0 ? 'counter-clockwise viewed along the green coil normal' : 'clockwise viewed along the green coil normal');
        function cameraButton(id, label) {
          return h('button', { key: id, onClick: function () { if (_induction3DCanvas && typeof _induction3DCanvas._induction3dSetView === 'function') _induction3DCanvas._induction3dSetView(id); announceToSR(label + ' induction view selected.'); }, style: btn() }, label);
        }
        return card('3D Induction Lab â€” field through a coil', h('div', null,
          h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } },
            'Move the magnet through a real three-dimensional coil surface. The translucent disk represents the area used to calculate magnetic flux; the gold arrow and bulb appear only while changing flux drives current.'),
          h('canvas', {
            key: 'induction3d-' + (d.ind3dAttempt || 0), ref: induction3DCanvasRef, className: 'mag-induction3d', role: 'img',
            'aria-label': 'Interactive three-dimensional induction scene. A red and blue bar magnet at x ' + magnet.x.toFixed(2) + ', y ' + magnet.y.toFixed(2) + ', z ' + magnet.z.toFixed(2) + ' creates field lines through a circular coil. Current magnetic flux is ' + flux.toFixed(2) + ' and induced voltage is ' + emf.toFixed(2) + '.',
            style: { display: 'block', width: '100%', borderRadius: 10, border: '1px solid ' + BORDER, background: INSTRUMENT, touchAction: 'none' }
          }),
          h('div', { role: 'status', style: { color: d.ind3dStatus === 'error' ? '#fbbf24' : SOFT, fontSize: 11.5, lineHeight: 1.45, margin: '7px 0' } },
            d.ind3dStatus === 'ready' ? 'Scene ready. Drag to orbit; drag the magnet across the ground plane.' :
            d.ind3dStatus === 'error' ? h('span', null, '3D graphics did not load; every other generator mode remains available. ', h('button', { onClick: function () { upd({ ind3dStatus: 'loading', ind3dAttempt: (d.ind3dAttempt || 0) + 1 }); }, style: btn() }, 'Retry 3D')) : 'Loading the 3D induction engine...'),
          h('p', { style: { color: SOFT, fontSize: 11.5, margin: '0 0 8px', lineHeight: 1.4 } }, 'Axis key: x passes through the coil, y is height, and z is sideways offset. The green arrow is the coil-area normal used for signed flux.'),
          h('div', { role: 'group', 'aria-label': '3D induction camera views', style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 9 } },
            h('span', { style: { color: SOFT, fontSize: 11.5, alignSelf: 'center', fontWeight: 700 } }, 'Camera'),
            cameraButton('perspective', 'Perspective'), cameraButton('axis', 'Along coil axis'), cameraButton('side', 'Side'), cameraButton('top', 'Top')),
          induction3DGraph(),
          h('div', { className: 'mag-observe' },
            h('span', { 'aria-hidden': 'true' }, 'âˆ’dÎ¦/dt'),
            h('span', null, h('b', null, 'Read the linked curves: '), 'voltage responds to the slope of the flux curve. It peaks where flux changes fastest, crosses zero at a flux extreme, and reverses when the change reverses.')),
          h('section', { 'aria-label': 'Controlled 3D induction trials', style: { marginBottom: 10 } },
            h('div', { style: { color: TEXT, fontSize: 12.5, fontWeight: 800, marginBottom: 6 } }, 'Controlled passage trials'),
            h('p', { style: { color: SOFT, fontSize: 11.5, margin: '0 0 7px', lineHeight: 1.4 } }, 'Predict first: if the path and coil stay identical, which pass should produce the taller voltage peaks?'),
            h('div', { role: 'group', 'aria-label': 'Pass magnet through coil', style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
              h('button', { disabled: d.ind3dRunning, onClick: function () { runInduction3DPass('slow'); }, style: btn() }, 'Slow pass Â· 2.00 s'),
              h('button', { disabled: d.ind3dRunning, onClick: function () { runInduction3DPass('fast'); }, style: btn(true) }, 'Fast pass Â· 0.50 s'),
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
                h('button', { onClick: function () { moveInduction3DMagnet({ pitch: Math.max(-Math.PI / 2, (magnet.pitch || 0) - Math.PI / 12) }, 'Tilted the magnet down 15 degrees.'); }, style: btn() }, 'Pitch âˆ’15Â°'),
                h('button', { onClick: function () { moveInduction3DMagnet({ pitch: Math.min(Math.PI / 2, (magnet.pitch || 0) + Math.PI / 12) }, 'Tilted the magnet up 15 degrees.'); }, style: btn() }, 'Pitch +15Â°'),
                h('button', { onClick: function () { moveInduction3DMagnet({ polarity: magnet.polarity < 0 ? 1 : -1 }, 'Flipped the magnet poles; signed flux and voltage reversed.'); }, style: btn() }, 'Flip poles')),
              slider('Time per manual step (s)', d.ind3dStepTime, 0.1, 1.5, 0.1, function (v) { upd({ ind3dStepTime: v, ind3dUsed: true }); })),
            h('section', { 'aria-label': 'Three-dimensional coil controls' },
              h('div', { style: { color: TEXT, fontSize: 12.5, fontWeight: 800, marginBottom: 7 } }, 'Set the coil before a trial'),
              slider('Coil turns (N)', d.ind3dTurns, 10, 200, 10, function (v) { updateInduction3DSetup({ ind3dTurns: v }); }),
              slider('Coil radius', d.ind3dCoilRadius, 0.7, 1.8, 0.1, function (v) { updateInduction3DSetup({ ind3dCoilRadius: v }); }),
              slider('Coil yaw', Math.round((d.ind3dCoilYaw || 0) * 180 / Math.PI), -90, 90, 15, function (v) { updateInduction3DSetup({ ind3dCoilYaw: v * Math.PI / 180 }); }),
              slider('Coil pitch', Math.round((d.ind3dCoilPitch || 0) * 180 / Math.PI), -75, 75, 15, function (v) { updateInduction3DSetup({ ind3dCoilPitch: v * Math.PI / 180 }); }),
              h('div', { className: 'mag-observe', role: 'status' },
                h('span', { 'aria-hidden': 'true' }, 'Î¦'),
                h('span', null,
                  h('b', null, 'Flux ' + flux.toFixed(2) + ' Â· voltage ' + emf.toFixed(2) + ' relative V'),
                  h('br'), 'Current: ' + direction + '.',
                  h('br'), Math.abs(emf) < 0.005 ? 'A field alone is not enough: the flux must change.' : 'The gold arrow shows the induced direction; its field opposes the flux change.')))
          ),
          disclosure('The coil flux is a numerical surface integral of a softened dipole field. Softening represents the finite magnet body and keeps the model finite during a pass. Values are relative, but Faradayâ€™s law, the sign reversal, orientation effects, turns scaling, and inverse-time scaling are preserved.')
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
              magnetGroup.add(north); magnetGroup.add(south); dynamicGroup.add(magnetGroup);
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
              h('label', { style: { display: 'flex', justifyContent: 'space-between', color: TEXT, fontSize: 13, fontWeight: 600, marginBottom: 4 } },
                h('span', null, 'Magnet position — drag it through the coil'), h('span', { style: { color: '#f43f5e' } }, String(Math.round(d.induceX)))),
              h('input', { type: 'range', min: -100, max: 100, step: 2, value: d.induceX,
                'aria-label': 'Magnet position relative to the coil',
                onChange: function (e) { moveInduceMagnet(parseFloat(e.target.value)); },
                style: { width: '100%', accentColor: '#f43f5e' } })),
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
        var angle = ((d.genAngle % 360) + 360) % 360;
        var speedFactor = d.genRPM / 60;
        var frequency = d.genRPM / 60;
        var flux = rotatingFlux(angle, d.genTurns, d.genField);
        var emf = rotatingEMF(angle, d.genTurns, d.genField, speedFactor);
        var fluxAmplitude = Math.max(1e-9, d.genTurns * d.genField);
        var emfAmplitude = Math.max(1e-9, d.genTurns * d.genField * speedFactor);
        var fluxNorm = flux / fluxAmplitude;
        var emfNorm = d.genRPM === 0 ? 0 : emf / emfAmplitude;
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
            h('text', { x: 18, y: 59, fill: '#7dd3fc', fontSize: 11 }, 'B'),
            h('g', { transform: 'translate(80,100) rotate(' + angle + ')' },
              h('ellipse', { cx: 0, cy: 0, rx: 8, ry: 39, fill: 'rgba(245,158,11,.10)', stroke: '#f59e0b', strokeWidth: 4 }),
              h('line', { x1: -8, y1: -39, x2: -8, y2: 39, stroke: '#fbbf24', strokeWidth: 1 }),
              h('line', { x1: 8, y1: -39, x2: 8, y2: 39, stroke: '#fbbf24', strokeWidth: 1 })),
            h('line', { x1: 80, y1: 100, x2: normalX, y2: normalY, stroke: '#34d399', strokeWidth: 2.5 }),
            h('circle', { cx: normalX, cy: normalY, r: 3, fill: '#34d399' }),
            h('text', { x: normalX + 5, y: normalY - 4, fill: '#34d399', fontSize: 11 }, 'normal'),
            h('text', { x: 80, y: 164, fill: '#fbbf24', fontSize: 11, textAnchor: 'middle' }, 'θ = ' + angle + '°'),
            h('line', { x1: 160, y1: 18, x2: 160, y2: 174, stroke: '#334155' }),
            h('text', { x: 176, y: 24, fill: '#f43f5e', fontSize: 11 }, 'flux Φ · cos θ'),
            h('line', { x1: 176, y1: 72, x2: 312, y2: 72, stroke: '#334155', strokeDasharray: '3 3' }),
            h('polyline', { points: fluxPts.join(' '), fill: 'none', stroke: '#f43f5e', strokeWidth: 2 }),
            h('text', { x: 176, y: 112, fill: '#fbbf24', fontSize: 11 }, 'voltage ε · sin θ · speed'),
            h('line', { x1: 176, y1: 148, x2: 312, y2: 148, stroke: '#334155', strokeDasharray: '3 3' }),
            h('polyline', { points: emfPts.join(' '), fill: 'none', stroke: '#fbbf24', strokeWidth: 2 }),
            h('line', { x1: cursorX, y1: 34, x2: cursorX, y2: 176, stroke: 'rgba(52,211,153,.55)', strokeDasharray: '3 3' }),
            h('circle', { cx: cursorX, cy: 72 - fluxNorm * 25, r: 4, fill: '#f43f5e', stroke: '#fff', strokeWidth: 1 }),
            h('circle', { cx: cursorX, cy: 148 - emfNorm * 25 * voltagePlotScale, r: 4, fill: '#fbbf24', stroke: '#fff', strokeWidth: 1 }),
            h('text', { x: 176, y: 184, fill: SOFT, fontSize: 8.5 }, '0°'),
            h('text', { x: 312, y: 184, fill: SOFT, fontSize: 8.5, textAnchor: 'end' }, '360°')),
          slider('Coil angle (θ)', d.genAngle, 0, 360, 5, function (v) { upd({ genAngle: v, genPhaseSeen: true }); }),
          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', margin: '-2px 0 8px' } },
            h('button', { onClick: function () { upd({ genAngle: 0, genPhaseSeen: true }); }, style: btn(Math.abs(angle) < 1) }, 'Flux maximum · 0°'),
            h('button', { onClick: function () { upd({ genAngle: 90, genPhaseSeen: true }); }, style: btn(Math.abs(angle - 90) < 1) }, 'Voltage maximum · 90°'),
            h('button', { onClick: function () { upd({ genAngle: (angle + 30) % 360, genPhaseSeen: true }); }, style: btn() }, '↻ Step 30°')),
          slider('Crank speed (RPM)', d.genRPM, 0, 180, 15, function (v) { upd({ genRPM: v, genSpeedSeen: true }); }),
          h('div', { role: 'status', style: { color: SOFT, fontSize: 12, margin: '-4px 0 9px' } },
            d.genRPM + ' RPM = ' + frequency.toFixed(2) + ' electrical cycle' + (Math.abs(frequency - 1) < 0.001 ? '' : 's') + ' per second · voltage amplitude ×' + speedFactor.toFixed(2)),
          slider('Turns in rotating coil (N)', d.genTurns, 10, 200, 10, function (v) { upd({ genTurns: v }); }),
          slider('Generator field strength (B)', d.genField, 1, 8, 1, function (v) { upd({ genField: v }); }),
          h('div', { className: 'mag-sim-grid', style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 } },
            h('div', { style: { padding: 9, borderRadius: 9, background: 'rgba(244,63,94,.10)', border: '1px solid rgba(244,63,94,.28)' } },
              h('div', { style: { color: SOFT, fontSize: 10.5 } }, 'Relative magnetic flux'),
              h('div', { style: { color: '#fb7185', fontSize: 16, fontWeight: 800 } }, flux.toFixed(0) + ' Φ units')),
            h('div', { style: { padding: 9, borderRadius: 9, background: 'rgba(251,191,36,.10)', border: '1px solid rgba(251,191,36,.28)' } },
              h('div', { style: { color: SOFT, fontSize: 10.5 } }, 'Relative induced voltage'),
              h('div', { style: { color: '#fbbf24', fontSize: 16, fontWeight: 800 } }, emf.toFixed(0) + ' ε units'))),
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

      function eddyCard() {
        var prog = d.tubeProg || { cu: 0, pl: 0 };
        var material = EDDY_MATERIALS[d.eddyMaterial] || EDDY_MATERIALS.copper;
        var brake = eddyBrakeFactor(material.conductivity, d.eddyThickness, d.eddySlit);
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
          h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 } }, 'A moving magnet induces closed eddy currents in a conducting tube, creating eddy-current braking. Change the material, wall thickness, or cut the current loop with a slit, then race it against plastic.'),
          h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 } },
            Object.keys(EDDY_MATERIALS).map(function (key) {
              return h('button', { key: key, 'aria-pressed': d.eddyMaterial === key ? 'true' : 'false',
                onClick: function () { resetRace({ eddyMaterial: key }); }, style: btn(d.eddyMaterial === key) }, EDDY_MATERIALS[key].name);
            }),
            h('button', { 'aria-pressed': d.eddySlit ? 'true' : 'false', onClick: function () { resetRace({ eddySlit: !d.eddySlit }); }, style: btn(d.eddySlit) }, d.eddySlit ? 'Slit tube: open loop' : 'Solid tube: closed loop')),
          slider('Tube wall thickness (mm)', d.eddyThickness, 1, 6, 1, function (v) { resetRace({ eddyThickness: v }); }),
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
              d.eddySlit
                ? 'the longitudinal slit prevents a strong circulating current, so most magnetic braking disappears even though the material still conducts.'
                : 'the moving field drives eddy currents around the wall. Their field opposes the change, and thicker, better-conducting walls strengthen the braking.')),
          d.tubeDone ? h('p', { style: { color: SOFT, fontSize: 12.5, margin: 0, lineHeight: 1.5 } },
            h('b', { style: { color: TEXT } }, 'Engineering connection: '), 'contact-free brakes in trains, rides, and exercise machines tune conductivity, geometry, speed, and field strength to control the opposing force.') : null,
          disclosure('Timings are schematic classroom-demo-scale timings. Real descent also depends on magnet size, tube diameter, temperature, wall shape, and speed.')
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
                h('span', { style: { fontSize: 18 } }, m.emoji),
                h('div', { style: { flex: 1 } },
                  h('div', { style: { color: TEXT, fontSize: 13, fontWeight: 700 } }, m.name),
                  revealed ? h('div', { style: { color: SOFT, fontSize: 11, lineHeight: 1.4, marginTop: 2 } }, (m.magnetic ? '🧲 Sticks. ' : '🚫 No pull. ') + m.why) : null),
                !revealed ? h('div', { style: { display: 'flex', gap: 4 } },
                  h('button', { 'aria-pressed': g === true ? 'true' : 'false', onClick: function () { var ng = Object.assign({}, guesses); ng[m.id] = true; upd({ matGuesses: ng }); },
                    style: { padding: '5px 9px', borderRadius: 8, border: '1px solid ' + (g === true ? '#f43f5e' : BORDER), background: g === true ? '#f43f5e' : 'transparent', color: g === true ? '#fff' : SOFT, fontSize: 12, fontWeight: 700, cursor: 'pointer' } }, 'Sticks'),
                  h('button', { 'aria-pressed': g === false ? 'true' : 'false', onClick: function () { var ng = Object.assign({}, guesses); ng[m.id] = false; upd({ matGuesses: ng }); },
                    style: { padding: '5px 9px', borderRadius: 8, border: '1px solid ' + (g === false ? '#f43f5e' : BORDER), background: g === false ? '#f43f5e' : 'transparent', color: g === false ? '#fff' : SOFT, fontSize: 12, fontWeight: 700, cursor: 'pointer' } }, 'No pull')
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
        // primary loops (left leg)
        Array.from({ length: p }).forEach(function (_, i) {
          kids.push(h('ellipse', { key: 'p' + i, cx: 126, cy: 40 + i * (60 / Math.max(p - 1, 1)), rx: 16, ry: 5, fill: 'none', stroke: '#f59e0b', strokeWidth: 3 }));
        });
        // secondary loops (right leg)
        Array.from({ length: s2 }).forEach(function (_, i) {
          kids.push(h('ellipse', { key: 's' + i, cx: 194, cy: 36 + i * (68 / Math.max(s2 - 1, 1)), rx: 16, ry: 5, fill: 'none', stroke: '#38bdf8', strokeWidth: 3 }));
        });
        kids.push(h('text', { key: 'lin', x: 60, y: 66, fill: '#f59e0b', fontSize: 12, fontWeight: 800, textAnchor: 'middle' }, d.xfmrAC ? '120 V AC' : '120 V DC'));
        kids.push(h('text', { key: 'lp', x: 60, y: 82, fill: SOFT, fontSize: 11, textAnchor: 'middle' }, 'primary N₁=' + d.xfmrN1));
        var vout = transformerOut(120, d.xfmrN1, d.xfmrN2, d.xfmrAC);
        kids.push(h('text', { key: 'lout', x: 262, y: 66, fill: '#38bdf8', fontSize: 12, fontWeight: 800, textAnchor: 'middle' }, vout.toFixed(0) + ' V'));
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

      // Earth's Field ─────────────────────────────────────────────────
      function earthTab() {
        var decDirection = d.declination === 0 ? 'no offset in this example' : (Math.abs(d.declination) + '° ' + (d.declination > 0 ? 'east' : 'west') + ' of true north');
        return h('div', null,
          card('Earth’s dynamo and your compass', h('div', null,
            h('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 10 } }, earthSVG()),
            h('p', { style: { color: SOFT, fontSize: 13, margin: '0 0 8px', lineHeight: 1.5 } }, 'Earth does not hide a bar magnet inside. Motion in its electrically conducting liquid outer core sustains a ', h('b', null, 'geodynamo'), ' whose large-scale field resembles a tilted dipole. A compass follows that magnetic field, not the geographic grid.'),
            slider('Example local declination (degrees)', d.declination, -30, 30, 1, function (v) { upd({ declination: v, earthSeen: true }); }),
            h('div', { className: 'mag-observe' },
              h('span', { 'aria-hidden': 'true' }, '🧭'),
              h('span', null, h('b', null, 'Compass evidence: '), 'the red needle is ' + decDirection + '. Declination depends on location and changes slowly as Earth’s field changes, so navigators use a dated regional model or chart.'))
          ), '#22c55e'),
          card('The solar wind reshapes the field', h('div', null,
            h('p', { style: { color: SOFT, fontSize: 13, margin: 0, lineHeight: 1.5 } }, 'Charged particles streaming from the Sun compress the field on the daytime side and stretch it into a long ', h('b', null, 'magnetotail'), ' on the nighttime side. The magnetosphere deflects much of that flow; some particles funnel toward polar regions and help produce auroras. Mars has no strong global field today, leaving its upper atmosphere more exposed to solar-wind stripping alongside gravity and other processes.')
          ), '#22c55e'),
          disclosure('The magnetosphere drawing is a schematic cross-section, not to scale. Earth’s magnetic poles wander, and the field has reversed north↔south many times at irregular intervals; the most recent full reversal was about 780,000 years ago. There is no simple countdown to the next one.')
        );
      }

      function earthSVG() {
        var tilt = 11;
        var decLabel = (d.declination > 0 ? '+' : '') + d.declination + '°';
        return h('svg', { viewBox: '0 0 320 200', width: '100%', style: { maxWidth: 440 }, role: 'img',
          'aria-label': 'Schematic magnetosphere: solar wind arrives from the left, compresses Earth’s dayside field, and stretches a magnetotail to the right. A compass example shows declination ' + decLabel },
          h('rect', { x: 0, y: 0, width: 320, height: 200, fill: INSTRUMENT, rx: 10 }),
          h('text', { x: 12, y: 18, fill: '#fbbf24', fontSize: 11 }, 'SUN → solar wind'),
          // Solar-wind streams and arrowheads.
          [48, 74, 100, 126, 152].map(function (yy, i) {
            return h('g', { key: 'wind' + i },
              h('line', { x1: 10, y1: yy, x2: 74, y2: yy, stroke: 'rgba(251,191,36,0.55)', strokeWidth: 1.5 }),
              h('polygon', { points: '74,' + yy + ' 66,' + (yy - 4) + ' 66,' + (yy + 4), fill: 'rgba(251,191,36,0.7)' }));
          }),
          // Magnetopause: compressed at left (dayside), stretched to the right.
          h('path', { d: 'M 137 24 C 92 38 78 70 78 100 C 78 130 92 162 137 176 C 205 170 267 143 310 100 C 267 57 205 30 137 24 Z',
            fill: 'rgba(34,197,94,0.05)', stroke: 'rgba(34,197,94,0.48)', strokeWidth: 1.6 }),
          h('text', { x: 246, y: 34, fill: '#34d399', fontSize: 11, textAnchor: 'middle' }, 'magnetotail'),
          h('text', { x: 92, y: 184, fill: SOFT, fontSize: 11 }, 'compressed dayside'),
          // Nested dipole field loops near Earth.
          [32, 52, 72].map(function (rr, i) {
            return h('ellipse', { key: 'e' + i, cx: 150, cy: 100, rx: rr + 13, ry: rr, fill: 'none',
              stroke: 'rgba(56,189,248,' + (0.52 - i * 0.09) + ')', strokeWidth: 1.2, transform: 'rotate(' + tilt + ' 150 100)' });
          }),
          h('circle', { cx: 150, cy: 100, r: 31, fill: '#1e3a5f', stroke: '#38bdf8', strokeWidth: 1.5 }),
          h('path', { d: 'M 125 97 Q 141 84 154 92 Q 164 100 176 91 L 180 106 Q 162 119 142 112 Z', fill: 'rgba(52,211,153,0.5)' }),
          // Geographic and magnetic axes.
          h('line', { x1: 150, y1: 55, x2: 150, y2: 145, stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }),
          h('line', { x1: 150, y1: 55, x2: 150, y2: 145, stroke: '#f43f5e', strokeWidth: 1.6, transform: 'rotate(' + tilt + ' 150 100)' }),
          h('text', { x: 150, y: 49, fill: '#94a3b8', fontSize: 8.5, textAnchor: 'middle' }, 'true N'),
          h('text', { x: 164, y: 61, fill: '#f43f5e', fontSize: 8.5 }, 'magnetic axis ≈11°'),
          // Local compass inset: dashed true north vs red magnetic bearing.
          h('g', { transform: 'translate(265,103)' },
            h('circle', { r: 25, fill: 'rgba(15,23,42,0.82)', stroke: '#64748b', strokeWidth: 1 }),
            h('line', { x1: 0, y1: -20, x2: 0, y2: 20, stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }),
            h('text', { x: 0, y: -29, fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' }, 'true N'),
            h('g', { transform: 'rotate(' + d.declination + ')' },
              h('polygon', { points: '0,-20 -4,5 4,5', fill: '#ef4444' }),
              h('polygon', { points: '0,20 -4,-5 4,-5', fill: '#e2e8f0' }))),
          h('text', { x: 265, y: 141, fill: TEXT, fontSize: 11, textAnchor: 'middle' }, 'declination ' + decLabel)
        );
      }
      // ── Quiz ──────────────────────────────────────────────────────────
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
          h('input', { type: 'text', 'aria-label': 'Ask the magnetism tutor for a guiding hint', value: d.askInput || '', placeholder: 'e.g. why does adding turns make it stronger?',
            onChange: function (e) { upd({ askInput: e.target.value }); },
            style: { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid ' + BORDER, background: '#0b1220', color: TEXT, fontSize: 13, marginBottom: 8, boxSizing: 'border-box' } }),
          h('button', { disabled: d.askLoading || !(d.askInput || '').trim(),
            onClick: function () {
              upd({ askLoading: true, askAnswer: '' });
              var prompt = 'You are a Socratic physics tutor for a middle-school magnetism lab. The student asks: "' + (d.askInput || '') + '". Give ONE guiding hint or question, under 45 words, no final numeric answers, no em dashes. Nudge them toward the field-line or B = mu0*n*I idea if relevant.';
              Promise.resolve(callGemini(prompt, false)).then(function (r) {
                upd({ askAnswer: (r && (r.text || r)) || 'Try changing one thing at a time and watch the field respond.', askLoading: false });
              }).catch(function () { upd({ askAnswer: 'Try changing one slider at a time and watch which way the field or compass responds.', askLoading: false }); });
            }, style: btn(true) }, d.askLoading ? '…thinking' : 'Get a hint'),
          d.askAnswer ? h('p', { style: { color: TEXT, fontSize: 13, lineHeight: 1.5, marginTop: 10, padding: 10, background: 'rgba(148,163,184,0.1)', borderRadius: 8 } }, d.askAnswer) : null
        ), '#a855f7');
      }

      // ── shared UI atoms ───────────────────────────────────────────────
      function btn(active) {
        return { padding: '8px 12px', borderRadius: 9, border: '1px solid ' + (active ? '#f43f5e' : BORDER), background: active ? '#f43f5e' : PANEL, color: active ? '#fff' : TEXT, fontWeight: 700, fontSize: 13, cursor: 'pointer' };
      }
      function slider(label, val, min, max, step, onChange) {
        return h('div', { style: { marginBottom: 10 } },
          h('label', { style: { display: 'flex', justifyContent: 'space-between', color: TEXT, fontSize: 13, fontWeight: 600, marginBottom: 4 } },
            h('span', null, label), h('span', { style: { color: '#f43f5e' } }, String(val))),
          h('input', { type: 'range', min: min, max: max, step: step, value: val,
            'aria-label': label,
            onChange: function (e) { onChange(parseFloat(e.target.value)); },
            style: { width: '100%', accentColor: '#f43f5e' } }));
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
        if (d.tab === 'field' && d.fieldView === '3d') {
          var p3 = d.field3dProbe || { x: 0, y: 1.8, z: 1.2 };
          var b3 = fieldAt3D(p3.x, p3.y, p3.z, d.field3dMagnets || []);
          return { station: '3D field studio', setup: (d.field3dMagnets || []).length + ' magnets; probe (' + p3.x.toFixed(2) + ', ' + p3.y.toFixed(2) + ', ' + p3.z.toFixed(2) + ')',
            result: 'B = (' + b3.x.toFixed(3) + ', ' + b3.y.toFixed(3) + ', ' + b3.z.toFixed(3) + '), magnitude ' + Math.hypot(b3.x, b3.y, b3.z).toFixed(3) };
        }
        if (d.tab === 'field') {
          return { station: station, setup: 'gap ' + d.pairDistance + ', strengths ' + d.pairStrength1 + ' and ' + d.pairStrength2 + ', ' + (d.pairAttract ? 'attract' : 'repel'),
            result: magnetPairForce(d.pairStrength1, d.pairStrength2, d.pairDistance).toFixed(3) + '× relative pair force' };
        }
        if (d.tab === 'electro') {
          var eDir = d.currentDir * d.windingDir > 0 ? 'right' : 'left';
          var eB = solenoidField(d.turns, d.current, 0.1, d.core ? 600 : 1) * 1000;
          return { station: station, setup: d.turns + ' turns, ' + d.current + ' A, ' + (d.core ? 'iron' : 'air') + ' core, field ' + eDir,
            result: eB.toFixed(eB < 10 ? 2 : 0) + ' mT interior field' };
        }
        if (d.tab === 'motor') {
          var mt = motorTorqueFactor(d.motorCurrent, d.motorField, d.motorAngle, d.motorCurrentDir, d.motorFieldDir);
          return { station: station, setup: 'I ' + d.motorCurrent + ', B ' + d.motorField + ', angle ' + Math.round(d.motorAngle) + '°',
            result: Math.abs(mt / 12).toFixed(2) + '× torque, ' + (mt >= 0 ? 'clockwise' : 'counter-clockwise') };
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
        if (d.tab === 'induce') {
          return { station: d.induceMode === 'eddy' ? 'Eddy currents' : 'Hand generator',
            setup: d.induceMode === 'eddy' ? 'copper versus plastic tube' : d.induceTurns + ' turns, magnet position ' + Math.round(d.induceX),
            result: d.induceMode === 'eddy' ? (d.tubeDone ? 'copper magnet fell more slowly' : 'race ready') : Math.abs(d.lastEMF).toFixed(2) + ' V induced' };
        }
        if (d.tab === 'materials') {
          return { station: station, setup: Object.keys(d.matGuesses || {}).length + ' materials predicted, domain alignment ' + Math.round((d.domainAlign || 0) * 100) + '%',
            result: d.matRevealed ? MATERIALS.filter(function (m) { return d.matGuesses[m.id] === m.magnetic; }).length + '/8 classifications correct' : 'predictions not revealed yet' };
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
          h('label', { style: { display: 'block', color: TEXT, fontSize: 12.5, fontWeight: 700, marginBottom: 4 } }, 'Prediction before this trial'),
          h('input', { type: 'text', 'aria-label': 'Prediction before recording the current trial', value: d.notebookPrediction || '',
            onChange: function (e) { upd({ notebookPrediction: e.target.value }); },
            placeholder: 'If I change ___, then ___ because…',
            style: { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid ' + BORDER, background: '#0b1220', color: TEXT, fontSize: 13, marginBottom: 8, boxSizing: 'border-box' } }),
          h('div', { style: { color: SOFT, fontSize: 11.5, marginBottom: 7, lineHeight: 1.45 } },
            h('b', { style: { color: TEXT } }, 'Current setup: '), snap.setup, ' → ', snap.result),
          h('div', { style: { display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 9 } },
            h('button', { disabled: needsPrediction, onClick: function () {
              var entry = { station: snap.station, setup: snap.setup, result: snap.result, prediction: (d.notebookPrediction || '').trim() || 'No prediction recorded' };
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
          h('label', { style: { display: 'block', color: TEXT, fontSize: 12.5, fontWeight: 700, marginBottom: 4 } }, 'Claim supported by your evidence'),
          h('textarea', { 'aria-label': 'Claim supported by recorded evidence', value: d.notebookClaim || '', rows: 2,
            onChange: function (e) { upd({ notebookClaim: e.target.value }); },
            placeholder: 'My evidence supports the claim that…',
            style: { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid ' + BORDER, background: '#0b1220', color: TEXT, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' } })
        ), '#a78bfa');
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
        journeyStrip(),
        learningModeSwitch(),
        tabBar(),
        stationGuide(),
        d.tab !== 'quiz' ? investigationNotebook() : null,
        h('div', { id: 'mag-panel-' + d.tab, role: 'tabpanel', 'aria-label': (STATION_GUIDES[d.tab] || STATION_GUIDES.field).phase }, body),
        d.tab !== 'quiz' ? askBox() : null,
        factStrip()
      );
    }
  });

  // Expose pure helpers for the test suite (no-op in the browser bundle).
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { coilNormal3D: coilNormal3D, coilFlux3D: coilFlux3D, inducedVoltage3D: inducedVoltage3D, inductionPass3D: inductionPass3D, dipoleMoment3D: dipoleMoment3D, dipoleFieldAt3D: dipoleFieldAt3D, fieldAt3D: fieldAt3D, fieldComponentsAt3D: fieldComponentsAt3D, traceLine3D: traceLine3D, findFieldNull3D: findFieldNull3D, dipoleFieldAt: dipoleFieldAt, fieldAt: fieldAt, fieldComponentsAt: fieldComponentsAt, traceLine: traceLine, solenoidField: solenoidField, wireForce: wireForce, motorTorqueFactor: motorTorqueFactor, magnetPairForce: magnetPairForce, chargedParticleTrajectory: chargedParticleTrajectory, rotatingFlux: rotatingFlux, rotatingEMF: rotatingEMF, fluxAt: fluxAt, induceEMF: induceEMF, transformerOut: transformerOut, transformerLoad: transformerLoad, hysteresisMagnetization: hysteresisMagnetization, eddyBrakeFactor: eddyBrakeFactor, CRANE_ORDER: CRANE_ORDER, BIN_SLOT: BIN_SLOT, domainAngle: domainAngle, countCycles: countCycles, MAZE_ROUNDS: MAZE_ROUNDS, mazeCellToField: mazeCellToField, mazePoles: mazePoles, MATERIALS: MATERIALS, QUIZ: QUIZ, QUIZ_TABS: QUIZ_TABS, QUIZ_PASS: QUIZ_PASS, MU0: MU0 };
  }
})();
