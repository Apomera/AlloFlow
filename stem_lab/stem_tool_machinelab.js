// ═══════════════════════════════════════════
// stem_tool_machinelab.js — Machine Lab
// P1: the Simple Machine Shop. Six benches, four grade bands.
//
// Spec: MACHINE_LAB_SPEC.md (repo root).
//
// Why this tool exists: projectile motion is already covered three times
// (physics, throwlab, skatelab) and structural failure once (bridgeLab), but
// nothing in stem_lab/ taught levers, pulleys, wheel-and-axle, inclined planes,
// wedges or screws. That is the gap this fills.
//
// The one idea the whole tool is built to deliver:
//   Mechanical advantage trades DISTANCE for FORCE. It never creates energy.
//   Work in equals work out, minus friction.
//
// Grade policy (spec 3.6): all four bands get the WHOLE tool. Nothing is
// filtered out. What changes is how the same physics is said. This is the
// opposite of stem_tool_firstresponse.js, which filters cards out below a band
// because its content (overdose, mental-health protocols) is genuinely unsafe
// for K-2. Nothing here is unsafe for a second-grader, so it restates instead.
// ═══════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
// Ensure window.StemLab is available before registering tools.
// If stem_lab_module.js hasn't loaded yet, create the registry stub.
window.StemLab = window.StemLab || {
  _registry: {},
  _order: [],
  registerTool: function(id, config) {
    config.id = id;
    config.ready = config.ready !== false;
    this._registry[id] = config;
    if (this._order.indexOf(id) === -1) this._order.push(id);
    console.log('[StemLab] Registered tool: ' + id);
  },
  getRegisteredTools: function() {
    var self = this;
    return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean);
  },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) {
    var tool = this._registry[id];
    if (!tool || !tool.render) return null;
    try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; }
  }
};
// ═══ End Guard ═══

(function() {
  'use strict';

  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // ═══════════════════════════════════════════════════════════════════
  // PURE MATH — no DOM, no React, no state. Everything the student is
  // graded on comes from here, which is what makes it testable.
  // ═══════════════════════════════════════════════════════════════════

  function finite(n) { return typeof n === 'number' && isFinite(n); }
  function pos(n) { return finite(n) && n > 0; }

  var _machineMath = {

    // Number('') is 0 and Number(' ') is 0. Letting either through means a
    // blank answer box silently scores as a real prediction of zero, which has
    // struck this codebase before. Validate the RAW string first.
    parseNum: function (raw) {
      if (raw === null || raw === undefined) return null;
      var s = String(raw).trim();
      if (s === '') return null;
      if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
      var n = Number(s);
      return isFinite(n) ? n : null;
    },

    // ── Mechanical advantage, one per machine ──

    // Class-1 lever. MA is the ratio of the arms, nothing to do with the load.
    leverMA: function (effortArm, loadArm) {
      if (!pos(effortArm) || !pos(loadArm)) return null;
      return effortArm / loadArm;
    },

    // Block and tackle. MA is the number of rope segments actually supporting
    // the moving block, which is why students miscount it: the segment you pull
    // on only counts when it runs up from the moving block.
    pulleyMA: function (segments) {
      if (!pos(segments)) return null;
      if (Math.abs(segments - Math.round(segments)) > 1e-9) return null;
      return Math.round(segments);
    },

    // Wheel and axle (a windlass). Turning a big circle to wind a small one.
    windlassMA: function (handleRadius, drumRadius) {
      if (!pos(handleRadius) || !pos(drumRadius)) return null;
      return handleRadius / drumRadius;
    },

    // Inclined plane, frictionless ideal. A ramp shorter than it is tall is not
    // a ramp, so that returns null rather than a nonsense MA below 1.
    rampMA: function (length, height) {
      if (!pos(length) || !pos(height)) return null;
      if (height > length) return null;
      return length / height;
    },

    // Wedge. Geometrically a moving inclined plane.
    wedgeMA: function (length, thickness) {
      if (!pos(length) || !pos(thickness)) return null;
      return length / thickness;
    },

    // Screw. One full turn of the handle advances the screw by one pitch, so
    // the effort travels a whole circumference to move that far.
    screwMA: function (handleRadius, pitch) {
      if (!pos(handleRadius) || !pos(pitch)) return null;
      return (2 * Math.PI * handleRadius) / pitch;
    },

    // ── The shared consequences of any MA ──

    effortForce: function (load, ma) {
      if (!finite(load) || load < 0 || !pos(ma)) return null;
      return load / ma;
    },

    // The other half of the trade, and the half students forget.
    effortDistance: function (loadDistance, ma) {
      if (!finite(loadDistance) || loadDistance < 0 || !pos(ma)) return null;
      return loadDistance * ma;
    },

    // The whole point of the tool, in one function: what you put in is what you
    // get out. Any gap here is a bug in the model, not a lesson about friction
    // (P1 is the ideal case; the loss chain arrives with the energy ledger).
    workCheck: function (load, loadDistance, ma) {
      var fe = this.effortForce(load, ma);
      var de = this.effortDistance(loadDistance, ma);
      if (fe === null || de === null) return null;
      var workIn = fe * de;
      var workOut = load * loadDistance;
      var scale = Math.max(Math.abs(workIn), Math.abs(workOut), 1);
      return {
        workIn: workIn,
        workOut: workOut,
        equal: Math.abs(workIn - workOut) <= 1e-9 * scale
      };
    },

    // Prediction grading. Relative tolerance, with an absolute floor so that
    // predicting a near-zero force is not impossible to get right.
    withinTolerance: function (predicted, actual, relTol) {
      if (!finite(predicted) || !finite(actual)) return false;
      var tol = Math.max(Math.abs(actual) * (relTol || 0.05), 0.01);
      return Math.abs(predicted - actual) <= tol;
    },

    // ═══════════════════════════════════════════════════════════════
    // P2: the trebuchet, the energy ledger, and flight.
    // ═══════════════════════════════════════════════════════════════

    // Winch: a wheel-and-axle geared by a block and tackle. Buying force here
    // buys NOTHING downstream, which is the point the range view exists to make.
    winchMA: function (handleRadius, drumRadius, pulleys) {
      var base = this.windlassMA(handleRadius, drumRadius);
      if (base === null) return null;
      var n = this.pulleyMA(pulleys);
      if (n === null) return null;
      return base * n;
    },

    // What the student actually does at the crank to cock the machine.
    // Note workIn is INDEPENDENT of ma: gearing changes force and turns, and
    // leaves the total work untouched. There is a test pinning exactly that.
    crankWork: function (stored, etaMech) {
      if (!pos(stored)) return null;
      var e = pos(etaMech) ? etaMech : 1;
      if (e > 1) return null;
      return stored / e;
    },

    // Generic over the three machines. A trebuchet crew winches a counterweight
    // up through its drop; a torsion crew winches a string back through its
    // draw against the springs. Both are "do W joules of work over a travel of
    // d metres", so one function covers both. Keying this to counterweight mass
    // left the winch panel showing "—" for force and turns on every torsion
    // machine while still quoting a crank-work figure.
    crankDetail: function (workNeeded, travel, ma, handleRadius) {
      if (!pos(workNeeded) || !pos(travel) || !pos(ma)) return null;
      var resisting = workNeeded / travel;      // average force felt at the load
      var force = resisting / ma;
      var distance = travel * ma;
      var turns = pos(handleRadius) ? distance / (2 * Math.PI * handleRadius) : null;
      return { force: force, distance: distance, turns: turns, work: force * distance };
    },

    // Counterweight trebuchet: the store is plain gravitational PE.
    storedEnergy: function (cwMass, dropHeight, g) {
      if (!pos(cwMass) || !pos(dropHeight) || !pos(g)) return null;
      return cwMass * dropHeight * g;
    },

    // Effective mass referred to the payload radius.
    //
    // The arm and the counterweight are still MOVING at release, and the energy
    // that went into moving them never reaches the stone. Modelling the arm as a
    // uniform rod pivoted between its two ends, its moment of inertia about the
    // pivot is I = (m/(Ll+Ls)) * (Ll^3 + Ls^3)/3; referred to the payload radius
    // Rp that is I/Rp^2. The counterweight swings at radius Ls, contributing
    // M*(Ls/Rp)^2 by the same reduction.
    //
    // DELIBERATE SIMPLIFICATION, labelled as such in the tool: a real trebuchet
    // is a double (arguably triple) pendulum whose sling releases at a moment
    // this single-degree-of-freedom energy model does not resolve. It gets the
    // trade-off right, which is what the lesson needs; it is not a design tool.
    effectiveMass: function (armMass, cwMass, beamLong, beamShort, slingLength) {
      if (!pos(beamLong) || !pos(beamShort)) return null;
      if (!finite(armMass) || armMass < 0 || !pos(cwMass)) return null;
      var sling = (finite(slingLength) && slingLength > 0) ? slingLength : 0;
      var Rp = beamLong + sling;
      if (!pos(Rp)) return null;
      var span = beamLong + beamShort;
      var inertiaArm = (armMass / span) * (Math.pow(beamLong, 3) + Math.pow(beamShort, 3)) / 3;
      var mArm = inertiaArm / (Rp * Rp);
      var mCw = cwMass * Math.pow(beamShort / Rp, 2);
      return mArm + mCw;
    },

    // The formula the whole tool is built around.
    //   v    = sqrt(2E / (m_p + m_eff))
    //   eta  = m_p / (m_p + m_eff)
    // Light stone: fast but wasteful. Heavy stone: efficient but slow.
    transfer: function (stored, projMass, effMass) {
      if (!pos(stored) || !pos(projMass)) return null;
      var me = (finite(effMass) && effMass >= 0) ? effMass : 0;
      var total = projMass + me;
      if (!pos(total)) return null;
      var v = Math.sqrt((2 * stored) / total);
      return {
        v: v,
        eta: projMass / total,
        muzzleKE: 0.5 * projMass * v * v,
        effMass: me
      };
    },

    // ── Flight ──
    //
    // A standalone pure function: no DOM, no dataset strings, no frame loop.
    // Fixed 1 ms step, semi-implicit Euler, quadratic drag, 3D so that lateral
    // aim and crosswind work in the scene.
    //
    // This deliberately does NOT share stem_tool_physics.js's integrator. That
    // one lives inside a RAF callback, reads its inputs from canvasEl.dataset,
    // steps once per animation frame, and models drag as a bare 0.002 constant.
    // It is pinned instead to the closed-form vacuum solution, which cannot
    // drift and cannot be "fixed" by matching a bug.
    integrateFlight: function (o) {
      o = o || {};
      var v0 = o.v0, thetaDeg = o.angleDeg, g = pos(o.g) ? o.g : 9.81;
      if (!pos(v0) || !finite(thetaDeg)) return null;
      var y0 = finite(o.y0) ? o.y0 : 0;
      var dt = pos(o.dt) ? o.dt : 0.001;
      var maxT = pos(o.maxT) ? o.maxT : 300;
      var theta = thetaDeg * Math.PI / 180;
      var heading = (finite(o.headingDeg) ? o.headingDeg : 0) * Math.PI / 180;

      var useDrag = !!o.drag;
      var m = pos(o.mass) ? o.mass : 1;
      var rho = pos(o.rho) ? o.rho : 1.225;
      var cd = pos(o.cd) ? o.cd : 0.47;              // smooth sphere
      var area = pos(o.diameter) ? Math.PI * Math.pow(o.diameter / 2, 2) : 0;
      var windX = finite(o.windX) ? o.windX : 0;
      var windZ = finite(o.windZ) ? o.windZ : 0;

      var horiz = v0 * Math.cos(theta);
      var x = 0, y = y0, z = 0;
      var vx = horiz * Math.cos(heading);
      var vy = v0 * Math.sin(theta);
      var vz = horiz * Math.sin(heading);

      // Acceleration is velocity-dependent once drag is on, so this is written
      // as a function of the velocity rather than inlined.
      function accel(ux, uy, uz, out) {
        out[0] = 0; out[1] = -g; out[2] = 0;
        if (useDrag && area > 0) {
          var rx = ux - windX, ry = uy, rz = uz - windZ;
          var sp = Math.sqrt(rx * rx + ry * ry + rz * rz);
          if (sp > 0) {
            var k = (0.5 * rho * cd * area * sp) / m;
            out[0] -= k * rx; out[1] -= k * ry; out[2] -= k * rz;
          }
        }
        return out;
      }

      var t = 0, apex = y0, steps = 0;
      var maxSteps = Math.ceil(maxT / dt);

      // Sample on SIMULATED TIME, not on step count. Keying the sampler off
      // maxT (300 s) meant a 5 s flight returned nine points, because the
      // stride was computed for a flight sixty times longer than the real one.
      // The vacuum time-to-ground is a good enough estimate to size the stride,
      // and drag only ever makes the real flight shorter.
      var vy0 = v0 * Math.sin(theta);
      var tEst = (vy0 + Math.sqrt(Math.max(vy0 * vy0 + 2 * g * Math.max(y0, 0), 0))) / g;
      var sampleDt = Math.max(dt, (isFinite(tEst) && tEst > 0 ? tEst : 1) / 200);
      var lastSample = 0;

      var path = [{ t: 0, x: 0, y: y0, z: 0, v: v0 }];
      var a0 = [0, 0, 0], a1 = [0, 0, 0];
      var prevX = x, prevY = y, prevZ = z, prevT = 0, prevSpeed = v0;
      var speed = v0;

      while (steps < maxSteps) {
        prevX = x; prevY = y; prevZ = z; prevT = t; prevSpeed = speed;

        // Velocity Verlet. For constant acceleration (the vacuum case) the
        // position update x += v*dt + a*dt^2/2 is EXACT, which is what lets the
        // closed-form test hold to a tight tolerance instead of absorbing
        // first-order Euler error. With drag it stays second-order.
        accel(vx, vy, vz, a0);
        x += vx * dt + 0.5 * a0[0] * dt * dt;
        y += vy * dt + 0.5 * a0[1] * dt * dt;
        z += vz * dt + 0.5 * a0[2] * dt * dt;
        accel(vx + a0[0] * dt, vy + a0[1] * dt, vz + a0[2] * dt, a1);
        vx += 0.5 * (a0[0] + a1[0]) * dt;
        vy += 0.5 * (a0[1] + a1[1]) * dt;
        vz += 0.5 * (a0[2] + a1[2]) * dt;

        t += dt; steps++;
        speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
        if (y > apex) apex = y;

        if (y <= 0) {
          // Interpolate back to the ground crossing, so the reported range does
          // not depend on where the fixed step happened to land.
          var frac = (prevY - y) !== 0 ? prevY / (prevY - y) : 1;
          if (!isFinite(frac) || frac < 0 || frac > 1) frac = 1;
          x = prevX + (x - prevX) * frac;
          z = prevZ + (z - prevZ) * frac;
          t = prevT + (t - prevT) * frac;
          speed = prevSpeed + (speed - prevSpeed) * frac;
          y = 0;
          path.push({ t: t, x: x, y: 0, z: z, v: speed });
          break;
        }

        if (t - lastSample >= sampleDt) {
          lastSample = t;
          path.push({ t: t, x: x, y: y, z: z, v: speed });
        }
      }

      prevSpeed = speed;
      var range = Math.sqrt(x * x + z * z);
      return {
        range: range,
        downrange: x,
        drift: z,
        apex: apex,
        flightTime: t,
        impactSpeed: prevSpeed,
        impactKE: 0.5 * m * prevSpeed * prevSpeed,
        landed: y <= 0,
        path: path
      };
    },

    // ── Is that stone a real object? ──
    //
    // Mass and diameter are separate controls, so nothing stopped a student
    // building a 1 kg boulder or a 300 kg orange. Drag depends on frontal area
    // and inertia on mass, so an impossible density quietly dominates every
    // range comparison. Showing the implied density makes that visible and is
    // worth knowing anyway.
    density: function (mass, diameter) {
      if (!pos(mass) || !pos(diameter)) return null;
      var r = diameter / 2;
      return mass / ((4 / 3) * Math.PI * r * r * r);
    },

    diameterFor: function (mass, density) {
      if (!pos(mass) || !pos(density)) return null;
      return 2 * Math.cbrt((3 * mass) / (4 * Math.PI * density));
    },

    // "A real stone this big would weigh about N kg" is the same fact as a
    // density, said in a way a seven-year-old can check against a rock.
    massFor: function (diameter, density) {
      if (!pos(diameter) || !pos(density)) return null;
      var r = diameter / 2;
      return density * (4 / 3) * Math.PI * r * r * r;
    },

    // Rough bands, for telling a student whether their stone could exist.
    // Deliberately wide: this is a plausibility check, not a materials table.
    densityNote: function (rho) {
      if (!pos(rho)) return null;
      if (rho < 400) return 'lighter than dry wood';
      if (rho < 1400) return 'about wood';
      if (rho < 1900) return 'about packed earth';
      if (rho < 3200) return 'about stone';
      if (rho < 9000) return 'about iron';
      return 'denser than lead';
    },

    // The stone that flies furthest from a given machine, holding DENSITY
    // constant so each candidate is a real object rather than the same ball
    // made implausibly heavy or light. Returns null if nothing flies.
    //
    // The peak is real, not a search artifact: launch speed is sqrt(2E/(m+m_eff)),
    // so it stops rising once the payload is light against the machine's own
    // inertia, while drag deceleration goes as area over mass and keeps growing
    // as the stone shrinks. Range therefore turns over somewhere in between.
    //
    // Two passes. A coarse log sweep spans four orders of magnitude, which is
    // enough to bracket the peak but far too coarse to quote: at 26 steps each
    // one is a 40% jump in mass. A second sweep inside the bracket earns the
    // decimal place the panel prints. `atBound` is set when the argmax sits on
    // an end of the search, because then the answer is the edge of the search
    // rather than a peak, and saying so beats quoting it as if it were one.
    bestStone: function (inputs, opts) {
      opts = opts || {};
      var self = this;
      var rho = pos(opts.density) ? opts.density
        : this.density(inputs.projMass, inputs.projDiameter);
      if (!pos(rho)) return null;
      var lo = pos(opts.min) ? opts.min : 0.05;
      var hi = pos(opts.max) ? opts.max : 400;
      var steps = (opts.steps && opts.steps > 4) ? opts.steps : 26;

      function sweep(a, b, n, dt) {
        var out = null, idx = -1, ratio = Math.pow(b / a, 1 / (n - 1)), m = a;
        for (var i = 0; i < n; i++) {
          var dia = self.diameterFor(m, rho);
          var s = self.shot(Object.assign({}, inputs, { projMass: m, projDiameter: dia, dt: dt }));
          if (s && (out === null || s.range > out.range)) {
            out = {
              projMass: m, projDiameter: dia, range: s.range,
              eta: s.eta, muzzleV: s.muzzleV, impactKE: s.impactKE
            };
            idx = i;
          }
          m *= ratio;
        }
        return out ? { best: out, index: idx, ratio: ratio, count: n } : null;
      }

      // The bracketing pass runs at 10 ms steps, ~10x cheaper, because all it
      // has to do is pick a grid cell. The refining pass runs at the real 1 ms,
      // so the number that reaches the screen is one the tool stands behind.
      var coarse = sweep(lo, hi, steps, 0.01);
      if (!coarse) return null;
      var atBound = (coarse.index === 0 || coarse.index === coarse.count - 1);
      // Refine between the neighbours that bracket the coarse winner, clamped
      // to the search span so a peak found at an end still gets refined inward.
      var r = coarse.ratio;
      var fa = Math.max(lo, coarse.best.projMass / r);
      var fb = Math.min(hi, coarse.best.projMass * r);
      var fine = (fb > fa) ? sweep(fa, fb, 15, opts.dt) : null;
      if (fine) { fine.best.atBound = atBound; return fine.best; }
      // No refinement was possible, so re-run the winner at full precision
      // rather than handing back a coarse-grid number as if it were exact.
      var exact = self.shot(Object.assign({}, inputs, {
        projMass: coarse.best.projMass, projDiameter: coarse.best.projDiameter, dt: opts.dt
      }));
      var win = exact ? {
        projMass: coarse.best.projMass, projDiameter: coarse.best.projDiameter,
        range: exact.range, eta: exact.eta, muzzleV: exact.muzzleV, impactKE: exact.impactKE
      } : coarse.best;
      win.atBound = atBound;
      return win;
    },

    // Closed-form vacuum solution from level ground. The reference the
    // integrator is tested against: an identity, not a second implementation.
    vacuum: function (v0, angleDeg, g) {
      if (!pos(v0) || !finite(angleDeg) || !pos(g)) return null;
      var th = angleDeg * Math.PI / 180;
      return {
        range: (v0 * v0 * Math.sin(2 * th)) / g,
        apex: (v0 * v0 * Math.pow(Math.sin(th), 2)) / (2 * g),
        flightTime: (2 * v0 * Math.sin(th)) / g
      };
    },

    // ── Torsion machines (ballista, onager) ──
    //
    // A twisted bundle of sinew or hair rope behaves as a torsional spring whose
    // stiffness rises as it is wound tighter. Modelled linearly in the twist
    // angle at a stiffness set by the winding:
    //
    //   k_t = k0 (1 + beta * turns)      E = n * 0.5 * k_t * theta^2
    //
    // DELIBERATE SIMPLIFICATION, labelled in the Field Manual: real twisted
    // sinew is strongly nonlinear and hysteretic, it loses energy to internal
    // friction on every shot, and its behaviour changes with humidity. This
    // model gets the trade-off right. It is not a reconstruction.
    TORSION_K0: 1200,
    TORSION_BETA: 0.08,

    torsionStiffness: function (turns) {
      if (!pos(turns)) return null;
      return this.TORSION_K0 * (1 + this.TORSION_BETA * turns);
    },

    // The arm sweeps through this angle as the string is drawn back. A small
    // angle approximation, clamped so an over-long draw cannot invent energy.
    torsionAngle: function (drawLength, armLength) {
      if (!pos(drawLength) || !pos(armLength)) return null;
      return Math.min(drawLength / armLength, 2.0);
    },

    torsionEnergy: function (turns, drawLength, armLength, bundles) {
      var k = this.torsionStiffness(turns);
      var theta = this.torsionAngle(drawLength, armLength);
      if (k === null || theta === null) return null;
      var n = (bundles === 1 || bundles === 2) ? bundles : null;
      if (n === null) return null;
      return n * 0.5 * k * theta * theta;
    },

    // Two arms rotating about their roots, plus the string. A uniform arm of
    // mass m about its root has I = m L^2 / 3, and the bolt leaves at roughly
    // the arm-tip speed, so each arm contributes m/3 referred to the bolt.
    ballistaEffectiveMass: function (armMass, stringMass) {
      if (!finite(armMass) || armMass < 0) return null;
      var sm = (finite(stringMass) && stringMass >= 0) ? stringMass : 0;
      return 2 * (armMass / 3) + 0.5 * sm;
    },

    // Single arm plus sling, reduced to the payload radius exactly as the
    // trebuchet is, so the three machines are compared on the same basis.
    onagerEffectiveMass: function (armMass, armLength, slingLength) {
      if (!finite(armMass) || armMass < 0 || !pos(armLength)) return null;
      var sling = (finite(slingLength) && slingLength > 0) ? slingLength : 0;
      var Rp = armLength + sling;
      if (!pos(Rp)) return null;
      return (armMass * armLength * armLength / 3) / (Rp * Rp);
    },

    // ═══════════════════════════════════════════════════════════════
    // P4: the target wall.
    //
    // Everything here is deterministic. Same shot sequence, same wall state,
    // every run, on every machine. That is not a nicety: it is what makes the
    // damage testable, and it is why the (optional, later) rigid-body layer is
    // allowed to animate rubble but never to decide anything.
    //
    // The material budgets are order-of-magnitude classroom values. The tool
    // says so in those words. We are not predicting real masonry failure.
    // ═══════════════════════════════════════════════════════════════

    BLOCK_SIZE: 1.0,                       // metres
    MATERIALS: {
      earth: { budget: 8000, label: 'packed earth' },
      limestone: { budget: 25000, label: 'limestone' },
      granite: { budget: 45000, label: 'granite ashlar' }
    },
    SPILLOVER: 0.2,                        // share of excess passed to each block below

    // Presets are plain block lists, the same {id,x,y,z} shape archStudio
    // already stores, so importing a student build later is a pass-through
    // rather than a translation layer.
    buildWall: function (presetId) {
      var blocks = [];
      var self = this;
      function add(col, row, mat, arch) {
        blocks.push({
          id: col + ',' + row, col: col, row: row,
          x: col, y: row, z: 0,
          mat: mat, absorbed: 0, state: 'intact',
          // An arch course carries its load sideways into the springing rather
          // than straight down, so it is held up by its diagonal neighbours.
          // Without this the arch over the gateway is a floating block and the
          // first shot anywhere brings it down for the wrong reason.
          arch: !!arch
        });
      }
      if (presetId === 'gatehouse') {
        // Flanking towers, a curtain between them, and an arched opening.
        for (var c = 0; c < 14; c++) {
          var tower = (c < 2 || c > 11);
          var top = tower ? 8 : 6;
          for (var r = 0; r < top; r++) {
            var inGateway = (c === 6 || c === 7) && r < 3;
            if (inGateway) continue;           // the opening itself
            var isArch = (c === 6 || c === 7) && r === 3;
            add(c, r, tower ? 'granite' : 'limestone', isArch);
          }
        }
      } else if (presetId === 'keep') {
        for (var kc = 0; kc < 8; kc++) {
          for (var kr = 0; kr < 10; kr++) add(kc, kr, 'granite');
        }
      } else if (presetId === 'motte') {
        // An earth mound, narrowing as it rises, with a tower on top.
        for (var mr = 0; mr < 3; mr++) {
          for (var mc = mr; mc < 10 - mr; mc++) add(mc, mr, 'earth');
        }
        for (var tc = 3; tc < 7; tc++) {
          for (var tr = 3; tr < 10; tr++) add(tc, tr, 'limestone');
        }
      } else {
        for (var xc = 0; xc < 12; xc++) {
          for (var xr = 0; xr < 6; xr++) add(xc, xr, 'limestone');
        }
      }
      if (!blocks.length) return blocks;
      // Stable ordering keeps every downstream sweep deterministic.
      blocks.sort(function (a, b) { return (a.row - b.row) || (a.col - b.col); });
      void self;
      return blocks;
    },

    // ── P4b: import a build from archStudio ──
    //
    // archStudio stores {x, y, z, shape, material, color} on a grid, y up. This
    // model is a facade: (col, row). So the import PROJECTS along z, which is
    // the axis the machine is firing down, and turns depth into strength: a
    // wall three blocks thick takes three times the energy to get through.
    // That reuses the whole damage engine rather than growing a second one.
    ARCH_MATERIAL_MAP: {
      stone: 'limestone', brick: 'limestone', sandstone: 'limestone',
      marble: 'granite', concrete: 'granite',
      wood: 'earth', glass: 'earth'
    },

    importWall: function (archBlocks, opts) {
      opts = opts || {};
      if (!archBlocks || !archBlocks.length) {
        return { blocks: null, error: 'empty' };
      }
      var maxCells = pos(opts.maxCells) ? opts.maxCells : 400;
      var self = this;
      var minX = Infinity, minY = Infinity;
      var usable = [];
      for (var i = 0; i < archBlocks.length; i++) {
        var b = archBlocks[i];
        if (!b || !finite(b.x) || !finite(b.y) || !finite(b.z)) continue;
        usable.push(b);
        if (b.x < minX) minX = b.x;
        if (b.y < minY) minY = b.y;
      }
      if (!usable.length) return { blocks: null, error: 'empty' };

      // Collapse the z axis: one cell per (col, row), depth = how many blocks
      // stand behind each other there.
      var cells = {};
      usable.forEach(function (b) {
        var col = Math.round(b.x - minX);
        var row = Math.round(b.y - minY);
        var key = col + ',' + row;
        if (!cells[key]) cells[key] = { col: col, row: row, depth: 0, mats: {} };
        cells[key].depth++;
        var mapped = self.ARCH_MATERIAL_MAP[String(b.material || 'stone').toLowerCase()] || 'limestone';
        cells[key].mats[mapped] = (cells[key].mats[mapped] || 0) + 1;
      });

      var keys = Object.keys(cells);
      if (keys.length > maxCells) return { blocks: null, error: 'too-big', cells: keys.length };

      // Drop anything with nothing under it. A student build may legitimately
      // contain floaters (archStudio allows them); importing one would let the
      // first shot anywhere "breach" a column that was never standing.
      var present = {};
      keys.forEach(function (k) { present[k] = true; });
      var dropped = 0, changed = true, guard = 0;
      while (changed && guard < 200) {
        changed = false; guard++;
        keys.forEach(function (k) {
          if (!present[k]) return;
          var c = cells[k];
          if (c.row === 0) return;
          if (!present[c.col + ',' + (c.row - 1)]) { present[k] = false; dropped++; changed = true; }
        });
      }

      var blocks = [];
      keys.forEach(function (k) {
        if (!present[k]) return;
        var c = cells[k];
        // Majority material at this cell, ties broken deterministically by name.
        var best = null, bestN = -1;
        Object.keys(c.mats).sort().forEach(function (m) {
          if (c.mats[m] > bestN) { bestN = c.mats[m]; best = m; }
        });
        blocks.push({
          id: c.col + ',' + c.row, col: c.col, row: c.row,
          x: c.col, y: c.row, z: 0,
          mat: best || 'limestone',
          budgetMul: Math.max(1, c.depth),
          absorbed: 0, state: 'intact', arch: false
        });
      });
      if (!blocks.length) return { blocks: null, error: 'nothing-stands' };
      blocks.sort(function (a, b2) { return (a.row - b2.row) || (a.col - b2.col); });
      return { blocks: blocks, dropped: dropped, cells: blocks.length };
    },

    wallExtent: function (blocks) {
      if (!blocks || !blocks.length) return null;
      var minC = Infinity, maxC = -Infinity, maxR = -Infinity;
      blocks.forEach(function (b) {
        if (b.col < minC) minC = b.col;
        if (b.col > maxC) maxC = b.col;
        if (b.row > maxR) maxR = b.row;
      });
      return { minCol: minC, maxCol: maxC, maxRow: maxR, cols: maxC - minC + 1, rows: maxR + 1 };
    },

    // Where does this shot cross the plane of the wall? Ranging the target is
    // part of the exercise, so falling short and sailing over are real answers.
    impactAt: function (shot, standoff) {
      if (!shot || !shot.path || !shot.path.length || !pos(standoff)) return null;
      var path = shot.path;
      if (shot.range < standoff) {
        return { status: 'short', shortBy: standoff - shot.range };
      }
      for (var i = 1; i < path.length; i++) {
        if (path[i].x >= standoff) {
          var a = path[i - 1], b = path[i];
          var dx = b.x - a.x;
          var f = (dx !== 0) ? (standoff - a.x) / dx : 0;
          if (f < 0) f = 0; else if (f > 1) f = 1;
          return {
            status: 'hit',
            y: a.y + (b.y - a.y) * f,
            z: a.z + (b.z - a.z) * f,
            v: a.v + (b.v - a.v) * f,
            t: a.t + (b.t - a.t) * f
          };
        }
      }
      return { status: 'short', shortBy: Math.max(0, standoff - shot.range) };
    },

    // A block is supported if it sits on the ground course or on a block that
    // is not breached. Anything else has nothing underneath it and comes down.
    // Iterated to a fixed point, so knocking out a base course brings the whole
    // column with it.
    collapseUnsupported: function (blocks) {
      var byId = {};
      blocks.forEach(function (b) { byId[b.col + ',' + b.row] = b; });
      var changed = true, guard = 0;
      while (changed && guard < 200) {
        changed = false; guard++;
        for (var i = 0; i < blocks.length; i++) {
          var b = blocks[i];
          if (b.state === 'breached' || b.row === 0) continue;
          var below = byId[b.col + ',' + (b.row - 1)];
          var held = below && below.state !== 'breached';
          if (!held && b.arch) {
            // An arch stands on its springing. Once BOTH sides are gone it
            // falls, which is the lesson the gatehouse exists to teach.
            var left = byId[(b.col - 1) + ',' + (b.row - 1)];
            var right = byId[(b.col + 1) + ',' + (b.row - 1)];
            held = (left && left.state !== 'breached') || (right && right.state !== 'breached');
          }
          if (!held) {
            b.state = 'breached';
            changed = true;
          }
        }
      }
      return blocks;
    },

    // Deliver one impact. Returns a NEW block list plus what happened, so the
    // caller never mutates state it is rendering from.
    applyDamage: function (blocks, impact, opts) {
      if (!blocks || !blocks.length || !impact || impact.status !== 'hit') return null;
      opts = opts || {};
      var self = this;
      var size = this.BLOCK_SIZE;
      var ext = this.wallExtent(blocks);
      if (!ext) return null;

      var next = blocks.map(function (b) {
        return { id: b.id, col: b.col, row: b.row, x: b.x, y: b.y, z: b.z, mat: b.mat,
                 absorbed: b.absorbed, state: b.state, arch: b.arch, budgetMul: b.budgetMul };
      });
      var byId = {};
      next.forEach(function (b) { byId[b.col + ',' + b.row] = b; });

      var centre = (ext.minCol + ext.maxCol) / 2;
      var col = Math.round(centre + (impact.z || 0) / size);
      var row = Math.floor(impact.y / size);
      var ke = 0.5 * (pos(opts.projMass) ? opts.projMass : 1) * impact.v * impact.v;
      var area = pos(opts.projDiameter) ? Math.PI * Math.pow(opts.projDiameter / 2, 2) : 0;

      if (row > ext.maxRow) {
        return { blocks: next, outcome: 'over', ke: ke, energyDensity: area > 0 ? ke / area : null, col: col, row: row };
      }
      var target = byId[col + ',' + row];
      if (!target) {
        return { blocks: next, outcome: 'miss', ke: ke, energyDensity: area > 0 ? ke / area : null, col: col, row: row };
      }

      var newlyBreached = 0;
      function deliver(block, energy, depth) {
        if (!block || energy <= 0 || depth > 4) return;
        var budget = (self.MATERIALS[block.mat] || self.MATERIALS.limestone).budget *
                     (pos(block.budgetMul) ? block.budgetMul : 1);
        var was = block.state;
        block.absorbed += energy;
        if (block.absorbed >= budget) {
          block.state = 'breached';
          if (was !== 'breached') newlyBreached++;
          var excess = block.absorbed - budget;
          block.absorbed = budget;
          if (excess > 0) {
            // The blow drives on into the course beneath.
            [-1, 0, 1].forEach(function (dc) {
              deliver(byId[(block.col + dc) + ',' + (block.row - 1)], excess * self.SPILLOVER, depth + 1);
            });
          }
        } else if (block.absorbed >= budget * 0.5) {
          block.state = 'cracked';
        }
      }
      deliver(target, ke, 0);
      this.collapseUnsupported(next);

      return {
        blocks: next,
        outcome: 'hit',
        col: col, row: row,
        ke: ke,
        energyDensity: area > 0 ? ke / area : null,
        newlyBreached: newlyBreached,
        material: (this.MATERIALS[target.mat] || {}).label || target.mat
      };
    },

    // A breach is a hole you could walk through: one column gone from the
    // ground to the top of that column.
    isBreached: function (blocks) {
      if (!blocks || !blocks.length) return false;
      var cols = {};
      blocks.forEach(function (b) {
        if (!cols[b.col]) cols[b.col] = { total: 0, gone: 0 };
        cols[b.col].total++;
        if (b.state === 'breached') cols[b.col].gone++;
      });
      for (var c in cols) {
        if (Object.prototype.hasOwnProperty.call(cols, c) &&
            cols[c].total > 0 && cols[c].gone === cols[c].total) return true;
      }
      return false;
    },

    wallSummary: function (blocks) {
      var out = { total: 0, intact: 0, cracked: 0, breached: 0 };
      (blocks || []).forEach(function (b) {
        out.total++;
        if (b.state === 'breached') out.breached++;
        else if (b.state === 'cracked') out.cracked++;
        else out.intact++;
      });
      return out;
    },

    // The full chain, in one call, so the ledger and the tests read the same
    // numbers from the same place. `machine` defaults to trebuchet.
    shot: function (s) {
      s = s || {};
      var g = pos(s.g) ? s.g : 9.81;
      var kind = s.machine || 'trebuchet';
      var stored, effMass;

      if (kind === 'ballista' || kind === 'onager') {
        var bundles = (kind === 'ballista') ? 2 : 1;
        stored = this.torsionEnergy(s.bundleTurns, s.drawLength, s.armLength, bundles);
        effMass = (kind === 'ballista')
          ? this.ballistaEffectiveMass(s.armMass, s.stringMass)
          : this.onagerEffectiveMass(s.armMass, s.armLength, s.slingLength);
      } else {
        stored = this.storedEnergy(s.cwMass, s.cwDrop, g);
        effMass = this.effectiveMass(s.armMass, s.cwMass, s.beamLong, s.beamShort, s.slingLength);
      }
      if (stored === null) return null;
      if (effMass === null) return null;
      var tr = this.transfer(stored, s.projMass, effMass);
      if (tr === null) return null;
      var ma = this.winchMA(s.winchHandleR, s.winchDrumR, s.winchPulleys);
      var etaMech = pos(s.etaMech) ? s.etaMech : 0.85;
      var workNeeded = this.crankWork(stored, etaMech);
      // What the crew physically hauls: the counterweight through its drop, or
      // the string back through its draw.
      var travel = (kind === 'ballista' || kind === 'onager') ? s.drawLength : s.cwDrop;
      var crank = (ma === null || workNeeded === null) ? null
        : this.crankDetail(workNeeded, travel, ma, s.winchHandleR);
      // dt is normally left alone: 1 ms is what the closed-form check is pinned
      // against. bestStone's bracketing pass raises it, because locating a peak
      // to within one grid step does not need the precision that quoting a
      // range does, and 120 full-precision integrations behind one click is a
      // second and a half of frozen page.
      var flight = this.integrateFlight({
        v0: tr.v, angleDeg: s.releaseAngle, g: g, y0: s.launchElevation,
        drag: s.drag !== false, mass: s.projMass, diameter: s.projDiameter,
        windX: s.windX, windZ: s.windZ, dt: s.dt
      });
      if (flight === null) return null;
      // Launching from height is an ENERGY INPUT, not part of the machine's
      // store: the stone gains m g h on the way down. Without accounting for it
      // the ledger's "lost to air resistance" row goes negative whenever the
      // machine stands on a tower, and the impact bar overflows its track.
      var dropGain = (pos(s.launchElevation) && pos(s.projMass))
        ? s.projMass * g * s.launchElevation : 0;
      var dragLoss = Math.max(0, tr.muzzleKE + dropGain - flight.impactKE);
      return {
        dropGain: dropGain,
        dragLoss: dragLoss,
        crankWork: crank ? crank.work : this.crankWork(stored, etaMech),
        crankForce: crank ? crank.force : null,
        crankDistance: crank ? crank.distance : null,
        crankTurns: crank ? crank.turns : null,
        winchMA: ma,
        stored: stored,
        effMass: effMass,
        eta: tr.eta,
        muzzleV: tr.v,
        muzzleKE: tr.muzzleKE,
        range: flight.range,
        downrange: flight.downrange,
        // Lateral drift from crosswind. The integrator has always produced it;
        // it was not carried out of shot(), so nothing downstream could show it.
        drift: flight.drift,
        apex: flight.apex,
        flightTime: flight.flightTime,
        impactSpeed: flight.impactSpeed,
        impactKE: flight.impactKE,
        path: flight.path
      };
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // GRADE BANDS
  // ═══════════════════════════════════════════════════════════════════

  var BANDS = ['k2', 'g35', 'g68', 'g912'];

  // The host supplies ctx.gradeBand (stem_lab_module.js), but the test harness
  // supplies only ctx.gradeLevel, and neither is guaranteed to parse. Derive
  // defensively and always land on a real band: an unrecognised value that
  // reaches the content lookup blanks the UI, which is the failure mode that
  // emptied fifteen semiconductor sub-tools.
  function resolveBand(ctx, override) {
    var raw = override || (ctx && ctx.gradeBand) || '';
    var band = String(raw).toLowerCase();
    if (BANDS.indexOf(band) !== -1) return band;
    var g = String((ctx && ctx.gradeLevel) || '').toLowerCase();
    if (g.indexOf('kindergarten') === 0 || /\b(1st|2nd)\b/.test(g)) return 'k2';
    if (/\b(3rd|4th|5th)\b/.test(g)) return 'g35';
    if (/\b(6th|7th|8th)\b/.test(g)) return 'g68';
    if (/\b(9th|10th|11th|12th)\b/.test(g) || g.indexOf('college') !== -1 || g.indexOf('graduate') !== -1) return 'g912';
    return 'g68';
  }

  // Per-band content lookup with a fallback chain, matching the shape
  // stem_tool_firstresponse.js uses. A missing variant degrades to the middle
  // band rather than rendering an empty string.
  function pick(map, band) {
    if (!map) return '';
    return map[band] || map.g68 || map.g35 || map.g912 || map.k2 || '';
  }

  var BAND_LABELS = {
    k2: 'K-2', g35: 'Grades 3-5', g68: 'Grades 6-8', g912: 'Grades 9-12'
  };

  // ═══════════════════════════════════════════════════════════════════
  // CHOICE ROTATION
  //
  // The k2 answer sets are static literals, so without this every correct
  // answer would sit in the position it was authored in. Rotate at MODULE
  // scope (not beside the literal) by bench index, so the correct answer lands
  // in a different slot per bench. Correctness is carried on the option object
  // itself, never by index or by matching the label text, so rotating cannot
  // desync the answer from its feedback.
  // ═══════════════════════════════════════════════════════════════════

  function rotate(list, n) {
    if (!list || !list.length) return list || [];
    var k = ((n % list.length) + list.length) % list.length;
    return list.slice(k).concat(list.slice(0, k));
  }

  // ═══════════════════════════════════════════════════════════════════
  // THEME
  //
  // Every value is an explicit hex. Two reasons, both learned the hard way:
  // SVG presentation attributes (stroke=, fill=) cannot resolve var(), and
  // mixing hardcoded dark colours with theme variables renders invisible text
  // in light mode.
  // ═══════════════════════════════════════════════════════════════════

  function mkTheme(isDark, isContrast) {
    if (isContrast) {
      return {
        bg: '#000000', card: '#000000', border: '#ffffff',
        text: '#ffffff', muted: '#ffffff', dim: '#ffffff',
        accent: '#ffff00', accentInk: '#000000',
        ok: '#00ff00', bad: '#ff6666', warn: '#ffff00',
        beam: '#ffffff', frame: '#ffffff', load: '#ffffff',
        effort: '#ffff00', ground: '#ffffff', hint: '#ffffff'
      };
    }
    if (isDark) {
      return {
        bg: '#0f172a', card: '#1e293b', border: '#334155',
        text: '#f1f5f9', muted: '#cbd5e1', dim: '#94a3b8',
        accent: '#f59e0b', accentInk: '#1c1310',
        ok: '#4ade80', bad: '#f87171', warn: '#fb923c',
        beam: '#cbd5e1', frame: '#64748b', load: '#60a5fa',
        effort: '#fbbf24', ground: '#475569', hint: '#a5b4fc'
      };
    }
    return {
      bg: '#f8fafc', card: '#ffffff', border: '#cbd5e1',
      text: '#0f172a', muted: '#475569', dim: '#64748b',
      accent: '#b45309', accentInk: '#ffffff',
      ok: '#15803d', bad: '#b91c1c', warn: '#c2410c',
      beam: '#475569', frame: '#94a3b8', load: '#1d4ed8',
      effort: '#b45309', ground: '#94a3b8', hint: '#4338ca'
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // BENCH DEFINITIONS
  //
  // Each bench owns its controls, its MA function, its diagram, and four
  // registers of the same explanation. Diagrams are built from the live state
  // so the picture and the number can never disagree.
  // ═══════════════════════════════════════════════════════════════════

  // A trace small enough to keep several of in state (and to survive a snapshot
  // round-trip) but dense enough to draw a smooth arc. Keeps x and y only:
  // the overlay is a side-on view, so z would never be drawn.
  function compactPath(path, maxPts) {
    if (!path || !path.length) return [];
    var cap = maxPts || 40;
    if (path.length <= cap) return path.map(function (p) { return { x: p.x, y: p.y }; });
    var step = (path.length - 1) / (cap - 1);
    var out = [];
    for (var i = 0; i < cap; i++) {
      var p = path[Math.round(i * step)];
      out.push({ x: p.x, y: p.y });
    }
    // Always end exactly on the ground contact rather than near it.
    var last = path[path.length - 1];
    out[out.length - 1] = { x: last.x, y: last.y };
    return out;
  }

  function fmt(n, places) {
    if (n === null || n === undefined || !isFinite(n)) return '—';
    var p = (places === undefined) ? 2 : places;
    // toFixed(-0) yields "-0.00"; normalise so a zero never renders signed.
    var v = (Object.is(n, -0)) ? 0 : n;
    var s = v.toFixed(p);
    // Trim trailing zeros in the fraction, then the bare dot if nothing is
    // left. The previous form only removed a fully-zero fraction, so 5.1 at two
    // places rendered as "5.10" while 2 correctly rendered as "2".
    if (s.indexOf('.') !== -1) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }

  function buildBenches(__alloT) {

    var K2_LEVER = [
      { id: 'far', correct: true, label: __alloT('stem.machinelab.lever.k2_a', 'Push far from the middle') },
      { id: 'near', correct: false, label: __alloT('stem.machinelab.lever.k2_b', 'Push right next to the middle') },
      { id: 'same', correct: false, label: __alloT('stem.machinelab.lever.k2_c', 'It feels the same either way') }
    ];
    var K2_PULLEY = [
      { id: 'more', correct: true, label: __alloT('stem.machinelab.pulley.k2_a', 'More ropes holding it up') },
      { id: 'fewer', correct: false, label: __alloT('stem.machinelab.pulley.k2_b', 'Fewer ropes holding it up') },
      { id: 'same', correct: false, label: __alloT('stem.machinelab.pulley.k2_c', 'The ropes do not matter') }
    ];
    var K2_WINDLASS = [
      { id: 'big', correct: true, label: __alloT('stem.machinelab.windlass.k2_a', 'A big handle to turn') },
      { id: 'small', correct: false, label: __alloT('stem.machinelab.windlass.k2_b', 'A tiny handle to turn') },
      { id: 'same', correct: false, label: __alloT('stem.machinelab.windlass.k2_c', 'Handle size does not matter') }
    ];
    var K2_RAMP = [
      { id: 'long', correct: true, label: __alloT('stem.machinelab.ramp.k2_a', 'A long, gentle ramp') },
      { id: 'steep', correct: false, label: __alloT('stem.machinelab.ramp.k2_b', 'A short, steep ramp') },
      { id: 'same', correct: false, label: __alloT('stem.machinelab.ramp.k2_c', 'Both feel exactly the same') }
    ];
    var K2_WEDGE = [
      { id: 'thin', correct: true, label: __alloT('stem.machinelab.wedge.k2_a', 'A long, thin wedge') },
      { id: 'fat', correct: false, label: __alloT('stem.machinelab.wedge.k2_b', 'A short, fat wedge') },
      { id: 'same', correct: false, label: __alloT('stem.machinelab.wedge.k2_c', 'Shape does not change anything') }
    ];
    var K2_SCREW = [
      { id: 'close', correct: true, label: __alloT('stem.machinelab.screw.k2_a', 'Ridges close together') },
      { id: 'far', correct: false, label: __alloT('stem.machinelab.screw.k2_b', 'Ridges far apart') },
      { id: 'same', correct: false, label: __alloT('stem.machinelab.screw.k2_c', 'Ridges are just decoration') }
    ];

    var benches = [
      {
        id: 'lever',
        icon: '⚖️',
        label: __alloT('stem.machinelab.lever.label', 'Lever'),
        controls: [
          { key: 'leverEffortArm', label: __alloT('stem.machinelab.lever.effort_arm', 'Effort arm'), min: 0.2, max: 4, step: 0.1, unit: 'm' },
          { key: 'leverLoadArm', label: __alloT('stem.machinelab.lever.load_arm', 'Load arm'), min: 0.2, max: 4, step: 0.1, unit: 'm' },
          { key: 'leverLoad', label: __alloT('stem.machinelab.lever.load', 'Load'), min: 10, max: 1000, step: 10, unit: 'N' }
        ],
        loadKey: 'leverLoad',
        ma: function (d) { return _machineMath.leverMA(d.leverEffortArm, d.leverLoadArm); },
        formula: 'MA = effort arm ÷ load arm',
        k2Choices: K2_LEVER,
        k2Question: __alloT('stem.machinelab.lever.k2_q', 'You want to lift something heavy with a plank over a log. Where should you push?'),
        copy: {
          k2: __alloT('stem.machinelab.lever.copy_k2', 'A seesaw is a lever. If you sit far from the middle, you can lift a friend who is bigger than you. Sitting close to the middle makes it hard.'),
          g35: __alloT('stem.machinelab.lever.copy_g35', 'A lever turns around a point called the fulcrum. The further your push is from the fulcrum, the easier the lift becomes. Divide the effort arm by the load arm to get the number of times the lever multiplies your push.'),
          g68: __alloT('stem.machinelab.lever.copy_g68', 'Mechanical advantage is the ratio of the arms: MA = effort arm / load arm. It does not depend on the load. Your effort force is the load divided by MA, and your hand travels MA times as far as the load rises.'),
          g912: __alloT('stem.machinelab.lever.copy_g912', 'Taking moments about the fulcrum, F_effort x d_effort = F_load x d_load, so MA = d_effort / d_load. This is the ideal MA: it assumes a rigid massless beam and a frictionless pivot. A real lever with a heavy beam delivers less, and the gap between ideal and actual MA is the efficiency.')
        }
      },
      {
        id: 'pulley',
        icon: '⛓️',
        label: __alloT('stem.machinelab.pulley.label', 'Pulley'),
        controls: [
          { key: 'pulleySegments', label: __alloT('stem.machinelab.pulley.segments', 'Supporting rope segments'), min: 1, max: 6, step: 1, unit: '' },
          { key: 'pulleyLoad', label: __alloT('stem.machinelab.pulley.load', 'Load'), min: 10, max: 1000, step: 10, unit: 'N' }
        ],
        loadKey: 'pulleyLoad',
        ma: function (d) { return _machineMath.pulleyMA(d.pulleySegments); },
        formula: 'MA = supporting rope segments',
        k2Choices: K2_PULLEY,
        k2Question: __alloT('stem.machinelab.pulley.k2_q', 'What makes it easier to pull a heavy bucket up?'),
        copy: {
          k2: __alloT('stem.machinelab.pulley.copy_k2', 'A pulley is a wheel with a rope over it. When more pieces of rope hold the bucket, pulling gets easier. But you have to pull a lot more rope.'),
          g35: __alloT('stem.machinelab.pulley.copy_g35', 'Count the rope segments that actually hold the moving block up. That count is the mechanical advantage. Two segments means half the pull, but twice as much rope to haul in.'),
          g68: __alloT('stem.machinelab.pulley.copy_g68', 'MA equals the number of rope segments supporting the moving block. Effort force = load / MA, and rope pulled = height raised x MA. The rope you pull down on only counts when it runs upward from the moving block.'),
          g912: __alloT('stem.machinelab.pulley.copy_g912', 'The load is shared equally between the supporting segments because the tension in an ideal rope is uniform throughout. Real tackle loses to sheave friction and rope stiffness, typically a few percent per sheave, so a six-part tackle never delivers a true MA of 6.')
        }
      },
      {
        id: 'windlass',
        icon: '🎡',
        label: __alloT('stem.machinelab.windlass.label', 'Wheel & Axle'),
        controls: [
          { key: 'windlassHandleR', label: __alloT('stem.machinelab.windlass.handle_r', 'Handle radius'), min: 0.05, max: 0.8, step: 0.05, unit: 'm' },
          { key: 'windlassDrumR', label: __alloT('stem.machinelab.windlass.drum_r', 'Drum radius'), min: 0.02, max: 0.4, step: 0.01, unit: 'm' },
          { key: 'windlassLoad', label: __alloT('stem.machinelab.windlass.load', 'Load'), min: 10, max: 1000, step: 10, unit: 'N' }
        ],
        loadKey: 'windlassLoad',
        ma: function (d) { return _machineMath.windlassMA(d.windlassHandleR, d.windlassDrumR); },
        formula: 'MA = handle radius ÷ drum radius',
        k2Choices: K2_WINDLASS,
        k2Question: __alloT('stem.machinelab.windlass.k2_q', 'You are winding a bucket up from a well. What makes it easiest?'),
        copy: {
          k2: __alloT('stem.machinelab.windlass.copy_k2', 'A big wheel turning a small one helps you lift. Think of a doorknob: the round part is wide, so it is easy to turn the skinny bit inside.'),
          g35: __alloT('stem.machinelab.windlass.copy_g35', 'The handle sweeps a big circle while the drum winds up a small one. Divide the handle radius by the drum radius to see how many times your turn is multiplied.'),
          g68: __alloT('stem.machinelab.windlass.copy_g68', 'MA = R_handle / r_drum. One full turn moves your hand 2 pi R while the rope winds only 2 pi r, so the extra distance is exactly where the extra force comes from.'),
          g912: __alloT('stem.machinelab.windlass.copy_g912', 'This is a continuous lever: the torque balance is F_effort x R = F_load x r. Every rotation restates the same moment equation as the lever bench, which is why the two formulas look identical once you write them as ratios of radii.')
        }
      },
      {
        id: 'ramp',
        icon: '📐',
        label: __alloT('stem.machinelab.ramp.label', 'Inclined Plane'),
        controls: [
          { key: 'rampLength', label: __alloT('stem.machinelab.ramp.length', 'Ramp length'), min: 0.5, max: 8, step: 0.1, unit: 'm' },
          { key: 'rampHeight', label: __alloT('stem.machinelab.ramp.height', 'Ramp height'), min: 0.2, max: 4, step: 0.1, unit: 'm' },
          { key: 'rampLoad', label: __alloT('stem.machinelab.ramp.load', 'Weight'), min: 10, max: 1000, step: 10, unit: 'N' }
        ],
        loadKey: 'rampLoad',
        ma: function (d) { return _machineMath.rampMA(d.rampLength, d.rampHeight); },
        formula: 'MA = ramp length ÷ ramp height',
        k2Choices: K2_RAMP,
        k2Question: __alloT('stem.machinelab.ramp.k2_q', 'You are pushing a heavy box up to a porch. Which ramp is easier?'),
        copy: {
          k2: __alloT('stem.machinelab.ramp.copy_k2', 'A ramp helps you move heavy things up. A long gentle ramp is easier than a short steep one, but you have to walk a lot further.'),
          g35: __alloT('stem.machinelab.ramp.copy_g35', 'Divide the ramp length by its height. A ramp 4 m long that rises 1 m gives you 4 times the push, but you travel 4 m instead of lifting straight up 1 m.'),
          g68: __alloT('stem.machinelab.ramp.copy_g68', 'MA = length / height. The force you need along the ramp is weight x height / length. Notice the work is identical either way: weight x height, whether you lift straight up or push along the slope.'),
          g912: __alloT('stem.machinelab.ramp.copy_g912', 'Resolving the weight along the slope gives F = W sin(theta), and sin(theta) = h / L, so MA = 1 / sin(theta) = L / h. This is the frictionless ideal. Adding a coefficient of friction mu gives F = W(sin theta + mu cos theta), which is why a real ramp has a shallowest useful angle.')
        }
      },
      {
        id: 'wedge',
        icon: '🪓',
        label: __alloT('stem.machinelab.wedge.label', 'Wedge'),
        controls: [
          { key: 'wedgeLength', label: __alloT('stem.machinelab.wedge.length', 'Wedge length'), min: 0.05, max: 0.6, step: 0.01, unit: 'm' },
          { key: 'wedgeThickness', label: __alloT('stem.machinelab.wedge.thickness', 'Wedge thickness'), min: 0.01, max: 0.2, step: 0.005, unit: 'm' },
          { key: 'wedgeLoad', label: __alloT('stem.machinelab.wedge.load', 'Splitting resistance'), min: 10, max: 2000, step: 10, unit: 'N' }
        ],
        loadKey: 'wedgeLoad',
        ma: function (d) { return _machineMath.wedgeMA(d.wedgeLength, d.wedgeThickness); },
        formula: 'MA = wedge length ÷ wedge thickness',
        k2Choices: K2_WEDGE,
        k2Question: __alloT('stem.machinelab.wedge.k2_q', 'Which wedge splits a log more easily?'),
        copy: {
          k2: __alloT('stem.machinelab.wedge.copy_k2', 'A wedge is a ramp that moves. An axe, a knife and your front teeth are all wedges. Long thin ones push things apart more easily than short fat ones.'),
          g35: __alloT('stem.machinelab.wedge.copy_g35', 'Divide the wedge length by how thick it is at the back. A long slim wedge has a big number, so it pushes the log apart harder for the same hammer blow.'),
          g68: __alloT('stem.machinelab.wedge.copy_g68', 'MA = length / thickness. A wedge is an inclined plane that moves through the material instead of the load moving along it. The trade is the same: you drive it a long way in to push the halves apart a little.'),
          g912: __alloT('stem.machinelab.wedge.copy_g912', 'The ideal MA is purely geometric, but wedges are the least ideal of the six machines in practice. Friction between the faces and the material usually dominates, and is often what stops the wedge springing back out, so a splitting wedge deliberately trades efficiency for that self-holding behaviour.')
        }
      },
      {
        id: 'screw',
        icon: '🔩',
        label: __alloT('stem.machinelab.screw.label', 'Screw'),
        controls: [
          { key: 'screwHandleR', label: __alloT('stem.machinelab.screw.handle_r', 'Handle radius'), min: 0.02, max: 0.5, step: 0.01, unit: 'm' },
          { key: 'screwPitch', label: __alloT('stem.machinelab.screw.pitch', 'Thread pitch'), min: 0.001, max: 0.02, step: 0.001, unit: 'm' },
          { key: 'screwLoad', label: __alloT('stem.machinelab.screw.load', 'Load'), min: 50, max: 5000, step: 50, unit: 'N' }
        ],
        loadKey: 'screwLoad',
        ma: function (d) { return _machineMath.screwMA(d.screwHandleR, d.screwPitch); },
        formula: 'MA = 2 π × handle radius ÷ pitch',
        k2Choices: K2_SCREW,
        k2Question: __alloT('stem.machinelab.screw.k2_q', 'A screw with which kind of ridges is easier to turn into wood?'),
        copy: {
          k2: __alloT('stem.machinelab.screw.copy_k2', 'A screw is a ramp wrapped around a stick. Going around and around the long way is easier than pushing straight in, which is why a screw holds better than a nail you just hammer.'),
          g35: __alloT('stem.machinelab.screw.copy_g35', 'Each full turn moves the screw forward by the gap between two ridges, called the pitch. Your hand travels all the way around the circle to do it, and that long trip is what makes the push so strong.'),
          g68: __alloT('stem.machinelab.screw.copy_g68', 'MA = 2 pi R / pitch, where R is the radius of your handle or driver. Screws have the largest mechanical advantage of the six machines by a wide margin, which is why a car jack is a screw.'),
          g912: __alloT('stem.machinelab.screw.copy_g912', 'Unwrapping one turn of the thread gives an inclined plane of base 2 pi R and rise equal to the pitch, so MA = 2 pi R / p directly. Real screw efficiency is low, often under 30 percent, because thread friction is large. That inefficiency is a feature: it is what makes a screw jack self-locking under load rather than unwinding.')
        }
      }
    ];

    // Rotate each bench's static k2 answer set by its index, so the correct
    // option is not always first. See the CHOICE ROTATION note above.
    benches.forEach(function (b, i) {
      b.k2Choices = rotate(b.k2Choices, i % 3);
    });

    return benches;
  }

  // ═══════════════════════════════════════════════════════════════════
  // DIAGRAMS — plain SVG, sized from live state. Explicit hex only.
  // Each returns an <svg> element; the wrapper supplies role and aria-label.
  // ═══════════════════════════════════════════════════════════════════

  function diagram(h, benchId, d, T) {
    var W = 320, H = 170;
    var box = { width: '100%', height: 'auto', maxWidth: 360, display: 'block' };
    function svg(children) {
      return h('svg', {
        viewBox: '0 0 ' + W + ' ' + H,
        style: box,
        focusable: 'false',
        'aria-hidden': 'true'
      }, children);
    }
    function line(x1, y1, x2, y2, stroke, w) {
      return h('line', { key: 'l' + x1 + '_' + y1 + '_' + x2 + '_' + y2 + '_' + stroke, x1: x1, y1: y1, x2: x2, y2: y2, stroke: stroke, strokeWidth: w || 2, strokeLinecap: 'round' });
    }
    function poly(pts, fill, stroke) {
      return h('polygon', { key: 'p' + pts, points: pts, fill: fill, stroke: stroke || 'none', strokeWidth: 2 });
    }
    function rect(x, y, w, hh, fill, key) {
      return h('rect', { key: key || ('r' + x + '_' + y), x: x, y: y, width: w, height: hh, fill: fill, rx: 3 });
    }
    function circ(cx, cy, r, fill, stroke, key) {
      return h('circle', { key: key || ('c' + cx + '_' + cy + '_' + r), cx: cx, cy: cy, r: r, fill: fill, stroke: stroke || 'none', strokeWidth: 2 });
    }
    // Downward effort arrow, drawn as a stem plus a head.
    function arrowDown(x, yTop, len, color, key) {
      return h('g', { key: key || ('a' + x + '_' + yTop) }, [
        line(x, yTop, x, yTop + len, color, 3),
        poly((x - 5) + ',' + (yTop + len - 8) + ' ' + (x + 5) + ',' + (yTop + len - 8) + ' ' + x + ',' + (yTop + len), color)
      ]);
    }

    if (benchId === 'lever') {
      var a = d.leverEffortArm > 0 ? d.leverEffortArm : 1;
      var b = d.leverLoadArm > 0 ? d.leverLoadArm : 1;
      var x0 = 24, x1 = 296, span = x1 - x0;
      var fx = x0 + span * (a / (a + b));
      var beamY = 96;
      return svg([
        line(x0, 148, x1, 148, T.ground, 3),
        line(x0, beamY, x1, beamY, T.beam, 7),
        poly(fx + ',' + (beamY + 6) + ' ' + (fx - 16) + ',148 ' + (fx + 16) + ',148', T.frame),
        arrowDown(x0 + 14, 40, 46, T.effort, 'eff'),
        rect(x1 - 44, beamY - 34, 40, 30, T.load, 'loadbox'),
        h('text', { key: 't1', x: x0 + 14, y: 32, fill: T.effort, fontSize: 13, fontWeight: 700, textAnchor: 'middle' }, 'effort'),
        h('text', { key: 't2', x: x1 - 24, y: beamY - 42, fill: T.load, fontSize: 13, fontWeight: 700, textAnchor: 'middle' }, 'load'),
        h('text', { key: 't3', x: fx, y: 164, fill: T.dim, fontSize: 11, textAnchor: 'middle' }, 'fulcrum')
      ]);
    }

    if (benchId === 'pulley') {
      var n = Math.max(1, Math.min(6, Math.round(d.pulleySegments || 1)));
      var segs = [];
      var left = 90, gap = 22;
      for (var i = 0; i < n; i++) {
        var xs = left + i * gap;
        segs.push(line(xs, 40, xs, 110, T.frame, 2));
      }
      var freeX = left + n * gap;
      return svg([
        rect(40, 24, 240, 10, T.ground, 'ceil'),
        h('g', { key: 'segs' }, segs),
        line(freeX, 40, freeX, 132, T.effort, 3),
        arrowDown(freeX, 118, 22, T.effort, 'pull'),
        rect(left - 14, 110, (n - 1) * gap + 28, 14, T.frame, 'block'),
        rect(left + ((n - 1) * gap) / 2 - 22, 130, 44, 30, T.load, 'load'),
        h('text', { key: 'tn', x: left + ((n - 1) * gap) / 2, y: 152, fill: '#ffffff', fontSize: 12, fontWeight: 700, textAnchor: 'middle' }, String(n)),
        h('text', { key: 'te', x: freeX, y: 20, fill: T.effort, fontSize: 12, fontWeight: 700, textAnchor: 'middle' }, 'pull')
      ]);
    }

    if (benchId === 'windlass') {
      var R = d.windlassHandleR > 0 ? d.windlassHandleR : 0.4;
      var r = d.windlassDrumR > 0 ? d.windlassDrumR : 0.1;
      var Rpx = 52;
      var rpx = Math.max(6, Math.min(48, Rpx * (r / R)));
      var cx = 120, cy = 82;
      return svg([
        circ(cx, cy, Rpx, 'none', T.frame, 'outer'),
        circ(cx, cy, rpx, T.frame, T.frame, 'inner'),
        line(cx, cy, cx + Rpx, cy, T.effort, 4),
        circ(cx + Rpx, cy, 7, T.effort, T.effort, 'knob'),
        line(cx + rpx, cy, cx + rpx, 150, T.beam, 2),
        rect(cx + rpx - 20, 150, 40, 16, T.load, 'bucket'),
        h('text', { key: 'tr', x: cx + Rpx + 4, y: cy - 12, fill: T.effort, fontSize: 12, fontWeight: 700 }, 'handle'),
        h('text', { key: 'td', x: cx, y: cy + rpx + 16, fill: T.muted, fontSize: 11, textAnchor: 'middle' }, 'drum')
      ]);
    }

    if (benchId === 'ramp') {
      var L = d.rampLength > 0 ? d.rampLength : 4;
      var hh = d.rampHeight > 0 ? d.rampHeight : 1;
      if (hh > L) hh = L;
      var base = Math.sqrt(Math.max(L * L - hh * hh, 0));
      var scale = Math.min(base > 0 ? 240 / base : 240, 100 / hh);
      var bpx = base * scale, hpx = hh * scale;
      var bx = 34, by = 150;
      return svg([
        line(20, by, 300, by, T.ground, 3),
        poly(bx + ',' + by + ' ' + (bx + bpx) + ',' + by + ' ' + (bx + bpx) + ',' + (by - hpx), T.frame),
        rect(bx + bpx * 0.45 - 14, by - hpx * 0.45 - 26, 28, 22, T.load, 'crate'),
        h('text', { key: 'th', x: bx + bpx + 10, y: by - hpx / 2, fill: T.muted, fontSize: 11 }, 'height'),
        h('text', { key: 'tl', x: bx + bpx * 0.4, y: by - hpx * 0.4 - 34, fill: T.effort, fontSize: 12, fontWeight: 700 }, 'push')
      ]);
    }

    if (benchId === 'wedge') {
      var wl = d.wedgeLength > 0 ? d.wedgeLength : 0.3;
      var wt = d.wedgeThickness > 0 ? d.wedgeThickness : 0.06;
      var sc = Math.min(200 / wl, 90 / wt);
      var lpx = wl * sc, tpx = Math.max(6, wt * sc);
      var ax = 60, ay = 88;
      return svg([
        rect(40, 14, 240, 20, T.frame, 'logtop'),
        rect(40, 142, 240, 20, T.frame, 'logbot'),
        poly(ax + ',' + ay + ' ' + (ax + lpx) + ',' + (ay - tpx / 2) + ' ' + (ax + lpx) + ',' + (ay + tpx / 2), T.effort),
        arrowDown(ax + lpx + 22, 60, 40, T.load, 'strike'),
        h('text', { key: 'tw', x: ax + lpx / 2, y: ay - tpx / 2 - 8, fill: T.effort, fontSize: 12, fontWeight: 700, textAnchor: 'middle' }, 'wedge'),
        h('text', { key: 'ts', x: ax + lpx + 22, y: 52, fill: T.load, fontSize: 12, fontWeight: 700, textAnchor: 'middle' }, 'strike')
      ]);
    }

    if (benchId === 'screw') {
      var sr = d.screwHandleR > 0 ? d.screwHandleR : 0.15;
      var sp = d.screwPitch > 0 ? d.screwPitch : 0.005;
      var hw = Math.max(24, Math.min(130, sr * 300));
      var turns = [];
      var pitchPx = Math.max(5, Math.min(34, sp * 1600));
      var yStart = 62, shaftBottom = 156, cx2 = 160;
      for (var y = yStart; y < shaftBottom; y += pitchPx) {
        turns.push(line(cx2 - 15, y, cx2 + 15, y + pitchPx * 0.45, T.frame, 2));
      }
      return svg([
        line(cx2 - hw, 44, cx2 + hw, 44, T.effort, 6),
        line(cx2, 44, cx2, yStart, T.beam, 5),
        rect(cx2 - 15, yStart, 30, shaftBottom - yStart, T.beam, 'shaft'),
        h('g', { key: 'threads' }, turns),
        h('text', { key: 'thr', x: cx2 + hw, y: 34, fill: T.effort, fontSize: 12, fontWeight: 700, textAnchor: 'end' }, 'handle'),
        h('text', { key: 'tp', x: cx2 + 26, y: yStart + pitchPx, fill: T.muted, fontSize: 11 }, 'pitch')
      ]);
    }

    return svg([]);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 3D TREBUCHET (P2)
  //
  // makeOrbitViewer, not makeBayViewer: it owns WebGL context-loss rebuild,
  // pause-when-hidden, theme rebuild, the no-WebGL fallback, AND `static: true`
  // render-on-demand. The last one matters most here. A siege machine sitting
  // idle at 60 fps on a school Chromebook is the regression that has bitten the
  // orbit bays before, so the scene is static while the student tunes it and
  // only runs a live loop for the ~1.5 s a shot is in the air.
  //
  // The scene shows the MACHINE. The flight is carried by the 2D trajectory
  // graph in the range view, because no camera can frame a 4 m arm and a 200 m
  // shot at once, and the machine is what this tool is actually about.
  // ═══════════════════════════════════════════════════════════════════

  var SHOP_HOME = { rotY: 28, rotX: 16, zoom: 1 };
  var MACHINE_HOME = { rotY: 22, rotX: 12, zoom: 1 };
  var RANGE_HOME = { rotY: 72, rotX: 18, zoom: 1 };
  // Behind the machine, looking down the field at the castle. The camera
  // direction runs (sin rotY, ., cos rotY), so a rotY near 0 puts the camera on
  // the far side of the wall and you watch the impact from the defenders' side,
  // through the back of the wall, with your own machine a speck beyond it.
  // 206 degrees puts it behind the crew, which is the shot this view is for.
  var WALL_HOME = { rotY: 206, rotX: 14, zoom: 1 };

  var COCKED_DEG = -52;   // long arm down, ready to fire

  // How long the AI tutor may hang before the Explain button is handed back.
  var AI_TIMEOUT_MS = 30000;

  // A torsion engine: a stout frame, one or two arms sprung from twisted rope
  // bundles, and a string. Same lifecycle and same tick contract as the
  // trebuchet, so the viewer does not care which machine is on screen.
  // 3D SIMPLE-MACHINE WORKSHOP (P1)
  // The machine is now the primary learning surface. Text panels remain as
  // equivalents, while every control changes the geometry in this scene.
  function buildSimpleMachineScene(THREE, S, m) {
    var p = m.params || {};
    var id = m.kind || 'lever';
    var dark = m.dark !== false;
    var contrast = !!m.contrast;
    var C = contrast ? {
      floor: 0x000000, platform: 0x111111, frame: 0xffffff, metal: 0xffffff,
      wood: 0xffffff, effort: 0xffff00, load: 0x00ffff, rope: 0xffffff
    } : dark ? {
      floor: 0x07111f, platform: 0x17243a, frame: 0x6f8099, metal: 0xd7e1ee,
      wood: 0xb7793f, effort: 0xffb020, load: 0x38bdf8, rope: 0xf4e4c1
    } : {
      floor: 0xdce5ef, platform: 0xf8fafc, frame: 0x64748b, metal: 0x334155,
      wood: 0x9a5d2f, effort: 0xb45309, load: 0x0369a1, rope: 0x7c5a35
    };

    var clearColor = contrast ? 0x000000 : (dark ? 0x07111f : 0xeaf0f6);
    if (S.renderer && S.renderer.setClearColor) {
      S.renderer.setClearColor(clearColor, 1);
    }
    if (!contrast && S.scene && typeof THREE.Fog === 'function') S.scene.fog = new THREE.Fog(clearColor, 11, 27);
    function mat(color, emissive) {
      var cfg = { color: color };
      if (emissive) { cfg.emissive = color; cfg.emissiveIntensity = 0.13; }
      return new THREE.MeshLambertMaterial(cfg);
    }
    function finishMesh(mesh, receives) {
      mesh.castShadow = !contrast;
      mesh.receiveShadow = receives !== false && !contrast;
      return mesh;
    }
    function box(x, y, z, px, py, pz, color, parent, rz) {
      var mesh = finishMesh(new THREE.Mesh(new THREE.BoxGeometry(x, y, z), mat(color)));
      mesh.position.set(px || 0, py || 0, pz || 0);
      if (rz) mesh.rotation.z = rz;
      (parent || S.model).add(mesh);
      return mesh;
    }
    function cylinder(radius, height, px, py, pz, color, axis, parent) {
      var mesh = finishMesh(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 24), mat(color)));
      mesh.position.set(px || 0, py || 0, pz || 0);
      if (axis === 'x') mesh.rotation.z = Math.PI / 2;
      if (axis === 'z') mesh.rotation.x = Math.PI / 2;
      (parent || S.model).add(mesh);
      return mesh;
    }
    function torus(radius, tube, px, py, pz, color, axis, parent) {
      var mesh = finishMesh(new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 12, 32), mat(color)));
      mesh.position.set(px || 0, py || 0, pz || 0);
      if (axis === 'x') mesh.rotation.y = Math.PI / 2;
      if (axis === 'y') mesh.rotation.x = Math.PI / 2;
      (parent || S.model).add(mesh);
      return mesh;
    }
    function arrow(px, top, length, color, direction) {
      var group = new THREE.Group();
      group.position.set(px, top, 1.05); S.model.add(group);
      group.userData.mlBaseY = top;
      var up = direction === 'up';
      cylinder(0.055, length, 0, (up ? 1 : -1) * length / 2, 0, color, 'y', group);
      var tip = finishMesh(new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.34, 16), mat(color, true)), false);
      tip.position.set(0, (up ? 1 : -1) * (length + 0.12), 0);
      tip.rotation.z = up ? 0 : Math.PI;
      group.add(tip);
      return group;
    }

    // Shared workshop landmarks make scale and camera movement legible.
    var ground = finishMesh(new THREE.Mesh(new THREE.PlaneGeometry(18, 14), mat(C.floor)), true);
    ground.rotation.x = -Math.PI / 2;
    S.model.add(ground);
    if (typeof THREE.GridHelper === 'function') {
      var grid = new THREE.GridHelper(16, 16, C.frame, dark ? 0x18283e : 0xb7c4d2);
      grid.position.y = 0.008;
      S.model.add(grid);
    }
    // A real room gives the learner a horizon, depth and an intuitive sense of
    // scale. The muted architecture stays behind the bright force encoding.
    var wallColor = contrast ? 0x000000 : (dark ? 0x0b192b : 0xd7e0ea);
    var wallInset = contrast ? C.frame : (dark ? 0x20324b : 0xa9b8c9);
    var roomLamps = [], roomBeacons = [];
    box(10.8, 4.8, 0.16, 0, 2.4, -3.35, wallColor);
    box(0.16, 4.8, 7.0, -5.35, 2.4, 0.05, wallColor);
    [-4.8, -2.4, 0, 2.4, 4.8].forEach(function (x) {
      box(0.055, 4.55, 0.08, x, 2.3, -3.23, wallInset, null, 0);
    });
    box(10.2, 0.07, 0.08, 0, 3.95, -3.22, wallInset);

    // Pegboard, tools and overhead work lights make this a purposeful STEM bay
    // rather than an object floating in an abstract scene.
    box(2.65, 1.25, 0.09, -3.15, 2.35, -3.18, C.platform);
    for (var pegRow = 0; pegRow < 3; pegRow++) {
      for (var pegCol = 0; pegCol < 6; pegCol++) {
        cylinder(0.025, 0.08, -4.05 + pegCol * 0.36, 1.98 + pegRow * 0.34, -3.09, C.frame, 'z');
      }
    }
    box(0.12, 0.72, 0.08, -3.75, 2.34, -3.05, C.effort, null, -0.42);
    box(0.12, 0.62, 0.08, -3.08, 2.37, -3.05, C.load, null, 0.38);
    torus(0.26, 0.055, -2.45, 2.35, -3.03, C.metal, 'z');
    [-2.3, 2.3].forEach(function (x) {
      box(2.3, 0.13, 0.55, x, 4.25, -1.55, C.frame);
      var lamp = finishMesh(new THREE.Mesh(
        new THREE.BoxGeometry(1.85, 0.055, 0.42),
        new THREE.MeshLambertMaterial({ color: contrast ? 0xffffff : 0xfff4cf, emissive: contrast ? 0xffffff : 0xffd56a, emissiveIntensity: 0.48 })
      ), false);
      lamp.position.set(x, 4.17, -1.55); S.model.add(lamp); roomLamps.push(lamp);
    });

    [-4.55, 4.55].forEach(function (x, beaconIndex) {
      box(0.28, 0.48, 0.12, x, 3.55, -3.12, C.frame);
      var beacon = finishMesh(new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), mat(beaconIndex ? C.load : C.effort, true)), false);
      beacon.position.set(x, 3.55, -3.02);
      beacon.material.emissiveIntensity = 0.24;
      S.model.add(beacon); roomBeacons.push(beacon);
    });

    box(7.4, 0.28, 4.4, 0, 0.14, 0, C.platform);
    // Alternating safety marks and anchor bolts visually lock the test bed to
    // the room and make its front edge easy to read while orbiting.
    for (var hazard = 0; hazard < 12; hazard++) {
      box(0.46, 0.055, 0.12, -3.18 + hazard * 0.58, 0.31, 2.19,
        hazard % 2 ? C.frame : C.effort, null, hazard % 2 ? 0.18 : -0.18);
    }
    [[-3.25, -1.75], [3.25, -1.75], [-3.25, 1.75], [3.25, 1.75]].forEach(function (bolt) {
      cylinder(0.09, 0.06, bolt[0], 0.32, bolt[1], C.metal, 'y');
    });
    box(7.6, 0.12, 0.14, 0, 0.72, -2.02, C.frame);
    [-3.55, 3.55].forEach(function (x) { box(0.12, 1.25, 0.12, x, 0.72, -2.02, C.frame); });

    // Amber is the long effort path; blue is the shorter load path.
    var cueMA = Math.max(0.2, Math.min(8, Number(p.ma) || 1));
    var effortRail = Math.min(3.1, 0.7 + cueMA * 0.3);
    var loadRail = Math.max(0.45, effortRail / cueMA);
    box(effortRail, 0.055, 0.12, -3.25 + effortRail / 2, 0.42, 1.72, C.effort);
    box(loadRail, 0.055, 0.12, 3.25 - loadRail / 2, 0.42, 1.72, C.load);
    var effortDot = finishMesh(new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), mat(C.effort, true)), false);
    effortDot.position.set(-3.25, 0.42, 1.72); S.model.add(effortDot);
    var loadDot = finishMesh(new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), mat(C.load, true)), false);
    loadDot.position.set(3.25, 0.42, 1.72); S.model.add(loadDot);
    var demo = {
      kind: id, effortStartX: -3.25, effortEndX: -3.25 + effortRail,
      loadStartX: 3.25, loadEndX: 3.25 - loadRail,
      lamps: roomLamps, beacons: roomBeacons
    };
    function makeMotionTrail(color, startX) {
      var dots = [];
      for (var trailIndex = 0; trailIndex < 4; trailIndex++) {
        var trailMat = new THREE.MeshLambertMaterial({
          color: color, emissive: color, emissiveIntensity: 0.18,
          transparent: true, opacity: 0.16 + trailIndex * 0.08
        });
        var trailDot = finishMesh(new THREE.Mesh(new THREE.SphereGeometry(0.055 + trailIndex * 0.008, 12, 8), trailMat), false);
        trailDot.position.set(startX, 0.42, 1.72);
        trailDot.visible = false; S.model.add(trailDot); dots.push(trailDot);
      }
      return dots;
    }
    demo.effortTrail = makeMotionTrail(C.effort, demo.effortStartX);
    demo.loadTrail = makeMotionTrail(C.load, demo.loadStartX);

    if (id === 'lever') {
      var ea = Math.max(0.1, Number(p.effortArm) || 2);
      var la = Math.max(0.1, Number(p.loadArm) || 1);
      var total = ea + la;
      var eVis = 5.4 * ea / total, lVis = 5.4 * la / total;
      var fulcrum = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.9, 3), mat(C.frame));
      fulcrum.position.set(0, 0.72, 0); fulcrum.rotation.y = Math.PI / 2; S.model.add(fulcrum);
      var leverMotion = new THREE.Group();
      leverMotion.position.set(0, 1.24, 0); leverMotion.rotation.z = 0.055; S.model.add(leverMotion);
      box(eVis + lVis, 0.22, 0.62, (lVis - eVis) / 2, 0, 0, C.wood, leverMotion);
      box(0.7, 0.7, 0.7, lVis - 0.12, 0.58, 0, C.load, leverMotion);
      demo.motion = leverMotion; demo.baseRotation = 0.055;
      demo.effortArrow = arrow(-eVis + 0.12, 2.75, 0.8, C.effort);
      demo.loadArrow = arrow(lVis - 0.12, 2.25, 0.48, C.load, 'up');
    } else if (id === 'pulley') {
      var segs = Math.max(1, Math.min(6, Math.round(Number(p.segments) || 2)));
      box(5.4, 0.18, 0.45, 0, 3.25, 0, C.frame);
      [-2.5, 2.5].forEach(function (x) { box(0.18, 3.0, 0.35, x, 1.72, 0, C.frame); });
      var spread = Math.min(3.6, 0.62 * (segs - 1));
      for (var si = 0; si < segs; si++) {
        var sx = segs === 1 ? 0 : -spread / 2 + spread * si / (segs - 1);
        cylinder(0.035, 1.55, sx, 2.25, 0, C.rope, 'y');
      }
      torus(0.48, 0.12, -0.62, 2.68, 0, C.metal, 'z');
      var pulleyMotion = new THREE.Group(); S.model.add(pulleyMotion);
      torus(0.48, 0.12, 0.62, 1.35, 0, C.metal, 'z', pulleyMotion);
      box(2.2, 0.2, 0.72, 0, 0.82, 0, C.frame, pulleyMotion);
      box(1.25, 0.72, 0.92, 0, 0.43, 0, C.load, pulleyMotion);
      demo.motion = pulleyMotion;
      demo.effortArrow = arrow(2.0, 2.75, 0.9, C.effort);
      demo.loadArrow = arrow(0, 1.05, 0.45, C.load, 'up');
    } else if (id === 'windlass') {
      var handleR = Math.max(0.05, Number(p.handleR) || 0.45);
      var drumR = Math.max(0.02, Number(p.drumR) || 0.1);
      var wheelR = 0.85 + Math.min(0.75, handleR * 1.5);
      var drumVis = 0.18 + Math.min(0.34, drumR * 0.8);
      [-1.25, 1.25].forEach(function (z) { box(0.26, 2.25, 0.26, 0, 1.35, z, C.frame); });
      var windlassDrum = cylinder(drumVis, 2.8, 0, 1.85, 0, C.wood, 'z');
      var wheelMotion = new THREE.Group(); wheelMotion.position.set(0, 1.85, 1.52); S.model.add(wheelMotion);
      torus(wheelR, 0.12, 0, 0, 0, C.effort, 'z', wheelMotion);
      box(wheelR * 2, 0.09, 0.09, 0, 0, 0, C.effort, wheelMotion, 0.58);
      cylinder(0.055, 1.4, 0.48, 1.05, -0.02, C.rope, 'y');
      var windlassLoad = box(0.86, 0.72, 0.72, 0.48, 0.48, 0, C.load);
      demo.motion = wheelMotion; demo.drum = windlassDrum; demo.load = windlassLoad; demo.loadY = 0.48;
      demo.effortArrow = arrow(1.55, 3.25, 0.72, C.effort);
      demo.loadArrow = arrow(0.48, 0.92, 0.42, C.load, 'up');
    } else if (id === 'ramp') {
      var L = Math.max(0.5, Number(p.length) || 4);
      var H = Math.max(0.2, Math.min(L, Number(p.height) || 1));
      var angle = Math.asin(Math.min(0.98, H / L));
      var visL = 5.4, visH = Math.max(0.7, Math.min(2.8, visL * H / L));
      box(visL, 0.24, 2.15, 0, 0.42 + visH / 2, 0, C.wood, null, angle);
      var rampCrate = box(0.95, 0.85, 0.95, 0.72, 0.95 + visH / 2 + 0.72 * Math.sin(angle), 0, C.load, null, angle);
      demo.motion = rampCrate; demo.baseX = rampCrate.position.x; demo.baseY = rampCrate.position.y; demo.angle = angle;
      box(0.16, visH, 1.85, visL / 2 - 0.12, 0.28 + visH / 2, 0, C.frame);
      demo.effortArrow = arrow(-2.1, 2.35, 0.72, C.effort);
      demo.loadArrow = arrow(1.35, 2.0 + visH / 2, 0.46, C.load, 'up');
    } else if (id === 'wedge') {
      var ratio = Math.max(1, (Number(p.length) || 0.3) / Math.max(0.001, Number(p.thickness) || 0.06));
      var splitLeft = new THREE.Group(), splitRight = new THREE.Group();
      S.model.add(splitLeft); S.model.add(splitRight);
      box(1.12, 2.0, 3.2, -0.57, 1.36, 0, C.wood, splitLeft);
      box(1.12, 2.0, 3.2, 0.57, 1.36, 0, C.wood, splitRight);
      // Dark end-grain seams make it obvious that this is one block about to
      // separate, rather than two unrelated objects beside the wedge.
      box(0.055, 1.72, 2.9, -0.015, 1.36, 0, C.frame, splitLeft);
      box(0.055, 1.72, 2.9, 0.015, 1.36, 0, C.frame, splitRight);
      var wedge = new THREE.Mesh(new THREE.ConeGeometry(Math.max(0.28, 1.4 / Math.sqrt(ratio)), 2.8, 3), mat(C.metal));
      wedge.position.set(0, 2.05, 0); wedge.rotation.z = Math.PI; S.model.add(wedge);
      demo.motion = wedge; demo.baseY = 2.05; demo.splitLeft = splitLeft; demo.splitRight = splitRight;
      box(2.5, 0.24, 0.24, 0, 3.42, 0, C.effort);
      demo.effortArrow = arrow(0, 4.0, 0.55, C.effort);
    } else {
      var pitch = Math.max(0.001, Number(p.pitch) || 0.005);
      var hr = Math.max(0.02, Number(p.handleR) || 0.15);
      var screwMotion = new THREE.Group(); S.model.add(screwMotion);
      cylinder(0.35, 2.8, 0, 1.85, 0, C.metal, 'y', screwMotion);
      var rings = Math.max(6, Math.min(22, Math.round(0.055 / pitch)));
      for (var ri = 0; ri < rings; ri++) {
        torus(0.4, 0.055, 0, 0.52 + ri * (2.55 / (rings - 1)), 0, C.effort, 'y', screwMotion);
      }
      var handleW = 1.8 + Math.min(2.2, hr * 5);
      box(handleW, 0.2, 0.28, 0, 3.45, 0, C.effort, screwMotion);
      cylinder(0.14, 0.52, -handleW / 2, 3.45, 0, C.wood, 'y', screwMotion);
      box(1.55, 0.48, 1.55, 0, 0.4, 0, C.load);
      demo.motion = screwMotion;
      demo.effortArrow = arrow(-handleW / 2, 4.1, 0.5, C.effort);
      demo.loadArrow = arrow(0, 0.66, 0.38, C.load, 'up');
    }

    S.target = new THREE.Vector3(0, 1.65, 0);
    S.fitPts = [
      new THREE.Vector3(-4.1, 0, -2.5), new THREE.Vector3(4.1, 4.4, 2.5),
      new THREE.Vector3(0, 0, 2.8), new THREE.Vector3(0, 3.5, -2.8)
    ];
    demo.effortDot = effortDot; demo.loadDot = loadDot;
    S.mlDemo = demo; S.mlDemoId = null;
    S.tick = function (now) {
      var data = S.data || {};
      var active = data.demoId || 0;
      if (active && S.mlDemoId !== active) { S.mlDemoId = active; S.mlDemoT0 = now; }
      var elapsed = active ? Math.max(0, (now - (S.mlDemoT0 || now)) / 1000) : 0;
      var reducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var wave = active ? (reducedMotion ? 1 : Math.sin(Math.min(1, elapsed / 2.2) * Math.PI)) : 0;
      var k = wave * wave * (3 - 2 * wave);
      var D = S.mlDemo || {};
      if (D.lamps) {
        for (var li = 0; li < D.lamps.length; li++) {
          D.lamps[li].material.emissiveIntensity = active ? 0.58 + 0.12 * Math.sin(elapsed * 10 + li) : 0.48;
        }
      }
      if (D.beacons) {
        for (var bi = 0; bi < D.beacons.length; bi++) {
          var beaconPulse = active ? 1 + 0.18 * Math.sin(elapsed * 14 + bi * Math.PI) : 1;
          D.beacons[bi].scale.setScalar(beaconPulse);
          D.beacons[bi].material.emissiveIntensity = active ? 0.5 + 0.25 * (0.5 + 0.5 * Math.sin(elapsed * 14 + bi * Math.PI)) : 0.24;
        }
      }
      if (D.kind === 'lever' && D.motion) D.motion.rotation.z = D.baseRotation - 0.22 * k;
      if (D.kind === 'pulley' && D.motion) D.motion.position.y = 0.72 * k;
      if (D.kind === 'windlass') {
        if (D.motion) D.motion.rotation.z = Math.PI * 2 * k;
        if (D.drum) D.drum.rotation.y = Math.PI * 2 * k;
        if (D.load) D.load.position.y = D.loadY + 0.72 * k;
      }
      if (D.kind === 'ramp' && D.motion) {
        D.motion.position.x = D.baseX + 1.45 * k;
        D.motion.position.y = D.baseY + 1.45 * Math.sin(D.angle) * k;
      }
      if (D.kind === 'wedge' && D.motion) D.motion.position.y = D.baseY - 0.62 * k;
      if (D.kind === 'wedge') {
        if (D.splitLeft) { D.splitLeft.position.x = -0.42 * k; D.splitLeft.rotation.z = 0.1 * k; }
        if (D.splitRight) { D.splitRight.position.x = 0.42 * k; D.splitRight.rotation.z = -0.1 * k; }
      }
      if (D.kind === 'screw' && D.motion) {
        D.motion.rotation.y = Math.PI * 2 * k;
        D.motion.position.y = -0.55 * k;
      }
      if (D.effortDot) D.effortDot.position.x = D.effortStartX + (D.effortEndX - D.effortStartX) * k;
      if (D.loadDot) D.loadDot.position.x = D.loadStartX + (D.loadEndX - D.loadStartX) * k;
      if (D.effortArrow) D.effortArrow.position.y = D.effortArrow.userData.mlBaseY - 0.16 * k;
      if (D.loadArrow) {
        D.loadArrow.position.y = D.loadArrow.userData.mlBaseY + 0.12 * k;
        D.loadArrow.scale.setScalar(1 + 0.18 * k);
      }
      function trace(list, startX, endX) {
        if (!list) return;
        for (var ti = 0; ti < list.length; ti++) {
          var fraction = ((ti + 1) / (list.length + 1)) * k;
          list[ti].position.x = startX + (endX - startX) * fraction;
          list[ti].visible = !!active && k > 0.04;
        }
      }
      trace(D.effortTrail, D.effortStartX, D.effortEndX);
      trace(D.loadTrail, D.loadStartX, D.loadEndX);
      if (D.effortDot) D.effortDot.scale.setScalar(1 + 0.45 * k);
      if (D.loadDot) D.loadDot.scale.setScalar(1 + 0.25 * k);
    };
  }

  function buildTorsionScene(THREE, S, m) {
    var g = m.geom || {};
    var twoArmed = m.kind === 'ballista';
    var armLen = g.armLength || 1.1;
    var draw = g.drawLength || 0.85;
    var sling = twoArmed ? 0 : (g.slingLength || 1.0);
    var projR = Math.max(0.06, Math.min(0.3, (g.projDiameter || 0.24) / 2));

    var frameCol = m.contrast ? 0xc8c8c8 : (m.dark === false ? 0x94a3b8 : 0x64748b);
    var ink = m.contrast ? 0xffffff : (m.dark === false ? 0x475569 : 0xcbd5e1);
    var ropeCol = m.contrast ? 0xffffff : 0xb45309;
    var projCol = m.contrast ? 0xffff00 : 0xf59e0b;
    var mat = function (c) { return new THREE.MeshLambertMaterial({ color: c }); };

    // Skipped when this machine is a guest in the siege scene, which owns the
    // ground and the sky for the whole field.
    if (!m.embedded) {
      if (S.renderer && S.renderer.setClearColor) S.renderer.setClearColor(m.contrast ? 0x000000 : (m.dark === false ? 0xdfe6ef : 0x0b1220), 1);
      var ground = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 30),
        new THREE.MeshLambertMaterial({ color: m.contrast ? 0x000000 : (m.dark === false ? 0xd7dfe8 : 0x16233a) })
      );
      ground.rotation.x = -Math.PI / 2;
      S.model.add(ground);
    }

    var deckH = 0.42;
    var deckLen = Math.max(1.3, armLen * 1.35);
    var deckW = Math.max(0.85, armLen * 0.95);
    decorateEngineYard(THREE, S, m, Math.max(4.6, deckLen * 2.7), Math.max(3.6, deckW * 2.8), mat, frameCol, projCol);
    var deck = new THREE.Mesh(new THREE.BoxGeometry(deckLen, 0.12, deckW), mat(frameCol));
    deck.position.set(0, deckH, 0);
    S.model.add(deck);
    [-deckLen / 2 + 0.12, deckLen / 2 - 0.12].forEach(function (xx) {
      [-deckW / 2 + 0.1, deckW / 2 - 0.1].forEach(function (zz) {
        var leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, deckH, 0.1), mat(frameCol));
        leg.position.set(xx, deckH / 2, zz);
        S.model.add(leg);
      });
    });

    var arms = [];
    var pivotX = 0, pivotY = deckH;   // set by whichever branch builds the arms
    var stone = new THREE.Mesh(new THREE.SphereGeometry(projR, 16, 12), mat(projCol));
    S.model.add(stone);

    if (twoArmed) {
      // Two spring bundles side by side, each throwing an arm OUTWARD, with the
      // bowstring stretched between the tips. Both arms previously swung in the
      // same direction, which read as a pair of parallel sticks rather than as
      // a bow, and there was no string at all.
      [-1, 1].forEach(function (side) {
        var zz = side * 0.6;
        var br = Math.max(0.12, armLen * 0.15);
        pivotX = -armLen * 0.42; pivotY = deckH + br * 2.4;
        var bundle = new THREE.Mesh(new THREE.CylinderGeometry(br, br, br * 3.6, 14), mat(ropeCol));
        bundle.position.set(-armLen * 0.42, deckH + br * 2.4, zz);
        S.model.add(bundle);
        var pivot = new THREE.Group();
        pivot.position.set(-armLen * 0.42, deckH + Math.max(0.12, armLen * 0.15) * 2.4, zz);
        // Splay the arms out to the sides so the pair forms a bow.
        pivot.rotation.y = -side * 0.62;
        S.model.add(pivot);
        var arm = new THREE.Mesh(new THREE.BoxGeometry(armLen, 0.11, 0.11), mat(ink));
        arm.position.set(armLen / 2, 0, 0);
        pivot.add(arm);
        pivot.userData.side = side;
        arms.push(pivot);
      });
      // The bowstring, rebuilt each frame from the live arm tips.
      var stringMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.035, 0.035), mat(0xe2e8f0));
      S.model.add(stringMesh);
      S.bowString = stringMesh;
      // A stock to sight along, so the machine reads as an engine and not a table.
      var stock = new THREE.Mesh(new THREE.BoxGeometry(deckLen * 0.85, 0.09, 0.12), mat(ink));
      stock.position.set(deckLen * 0.12, deckH + 0.16, 0);
      S.model.add(stock);
    } else {
      // One arm, sprung from a single bundle, whipping into a padded stop.
      var bundle1 = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.0, 16), mat(ropeCol));
      bundle1.rotation.x = Math.PI / 2;
      bundle1.position.set(-armLen * 0.5, deckH + 0.22, 0);
      S.model.add(bundle1);
      var relRad = 68 * Math.PI / 180;
      var stopX = -armLen * 0.5 + armLen * 0.82 * Math.cos(relRad);
      var stopTop = deckH + 0.22 + armLen * 0.82 * Math.sin(relRad);
      var post = new THREE.Mesh(new THREE.BoxGeometry(0.1, stopTop - deckH, 0.1), mat(frameCol));
      post.position.set(stopX, deckH + (stopTop - deckH) / 2, 0);
      S.model.add(post);
      var pad = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, deckW * 0.7), mat(ropeCol));
      pad.position.set(stopX, stopTop, 0);
      S.model.add(pad);
      pivotX = -armLen * 0.5; pivotY = deckH + 0.22;
      var pivot1 = new THREE.Group();
      pivot1.position.set(pivotX, pivotY, 0);
      S.model.add(pivot1);
      var arm1 = new THREE.Mesh(new THREE.BoxGeometry(armLen, 0.12, 0.12), mat(ink));
      arm1.position.set(armLen / 2, 0, 0);
      pivot1.add(arm1);
      if (sling > 0) {
        var cord1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, sling, 0.03), mat(frameCol));
        cord1.position.set(armLen, -sling / 2, 0);
        pivot1.add(cord1);
      }
      pivot1.userData.side = 0;
      arms.push(pivot1);
    }

    S.ml = { arms: arms, stone: stone, twoArmed: twoArmed, armLen: armLen, sling: sling,
             deckH: deckH, draw: draw, pivotX: pivotX, pivotY: pivotY };
    S.mlShot = null;

    var reachX = Math.max(deckLen * 0.6, armLen * 0.95);
    var reachY = deckH + 0.5 + armLen * 0.85 + sling;
    S.target = new THREE.Vector3(0, deckH + (reachY - deckH) * 0.42, 0);
    S.fitPts = [
      new THREE.Vector3(-reachX, 0, 0), new THREE.Vector3(reachX, reachY, 0),
      new THREE.Vector3(0, 0, deckW * 0.75), new THREE.Vector3(0, 0, -deckW * 0.75)
    ];
    if (!m.embedded && !m.contrast && S.model && S.model.traverse) {
      S.model.traverse(function (obj) { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
    }

    function pose(k) {
      // k = 0 fully drawn back, k = 1 released.
      var ml = S.ml;
      var cocked = ml.twoArmed ? -38 : -10;
      var released = ml.twoArmed ? 26 : 68;
      var deg = cocked + (released - cocked) * k;
      ml.arms.forEach(function (p) { p.rotation.z = deg * Math.PI / 180; });
      // Stretch the bowstring between the two arm tips so it tracks the draw.
      if (S.bowString && ml.arms.length === 2 && S.THREE) {
        var tips = ml.arms.map(function (p) {
          var v = new S.THREE.Vector3(ml.armLen, 0, 0);
          p.updateMatrixWorld(true);
          return v.applyMatrix4(p.matrixWorld);
        });
        var mid = tips[0].clone().add(tips[1]).multiplyScalar(0.5);
        var span = tips[0].distanceTo(tips[1]);
        S.bowString.position.copy(mid);
        S.bowString.scale.set(Math.max(0.05, span), 1, 1);
        S.bowString.rotation.set(0, Math.atan2(tips[1].x - tips[0].x, tips[1].z - tips[0].z) + Math.PI / 2, 0);
      }
      return deg * Math.PI / 180;
    }

    pose(0);
    stone.position.set(pivotX + armLen * Math.cos(-0.96), pivotY + armLen * Math.sin(-0.96) - sling, 0);

    S.tick = function (now) {
      var data = S.data || {};
      var reduced = !!data.reduced;
      var ml = S.ml;
      if (!ml) return;
      var yardLights = S.mlYard && S.mlYard.signalLights;
      function updateYardSignals(active, released) {
        if (!yardLights || !yardLights.length) return;
        var pulse = active ? (0.5 + 0.5 * Math.sin((now || 0) * 0.014)) : 0;
        yardLights[0].material.emissiveIntensity = active ? 0.16 + pulse * 0.1 : 0.34;
        yardLights[1].material.emissiveIntensity = active ? 0.24 + pulse * 0.24 : 0.12;
        yardLights[2].material.emissiveIntensity = released ? 0.38 + pulse * 0.3 : 0.08;
      }
      if (!data.shotId) {
        updateYardSignals(false, false);
        var r0 = pose(0);
        ml.stone.visible = true;
        ml.stone.position.set(ml.pivotX + ml.armLen * Math.cos(r0), ml.pivotY + ml.armLen * Math.sin(r0) - ml.sling, 0);
        return;
      }
      if (S.mlShot !== data.shotId) { S.mlShot = data.shotId; S.mlT0 = now; }
      var el = Math.max(0, (now - (S.mlT0 || now)) / 1000);
      // Reduced motion still communicates the release, but skips the arm whip
      // and the moving stone entirely. The viewer is render-on-demand, so this
      // settles the machine in one deterministic frame.
      if (reduced) el = ml.twoArmed ? 1.3 : 1.6;
      updateYardSignals(true, el > (ml.twoArmed ? 0.28 : 0.55));
      var SWING = ml.twoArmed ? 0.28 : 0.55;   // a ballista snaps; an onager kicks
      var k = Math.min(1, el / SWING);
      var eased = k * k * (3 - 2 * k);
      var rot = pose(eased);
      if (el > SWING) {
        var f = el - SWING;
        var vDir = (data.releaseAngle == null ? 45 : data.releaseAngle) * Math.PI / 180;
        var sp = Math.min(data.muzzleV || 20, 70);
        ml.stone.visible = f < 1.0;
        ml.stone.position.set(ml.pivotX + sp * f * Math.cos(vDir), ml.pivotY + sp * f * Math.sin(vDir) - 4.9 * f * f, 0);
      } else {
        ml.stone.visible = true;
        ml.stone.position.set(ml.pivotX + ml.armLen * Math.cos(rot), ml.pivotY + ml.armLen * Math.sin(rot) - ml.sling, 0);
      }
    };
  }

  function buildMachineScene(THREE, S, m) {
    if (m && (m.kind === 'ballista' || m.kind === 'onager')) return buildTorsionScene(THREE, S, m);
    return buildTrebuchetScene(THREE, S, m);
  }

  // The range view is the one place where the student follows the payload,
  // not the mechanism. Keep its 3D world deliberately sparse: the launch deck
  // establishes scale, the lane marks distance, and one stone traces the same
  // sampled path used by the graph and the scorer below it.
  function buildRangeScene(THREE, S, m) {
    m = m || {};
    var dark = m.dark !== false;
    var contrast = !!m.contrast;
    var valid = m.valid !== false && !!(m.path && m.path.length > 1);
    var revealed = !!m.reveal;
    var rawPath = (m.path && m.path.length > 1) ? m.path : [];
    // Before Fire the lane is intentionally a neutral launch bay. Showing the
    // computed arc, endpoint or flag would answer the prediction prompt before
    // the student has made a prediction. The fired path is restored atomically
    // with the shot state, so the visual and the score always agree.
    var path = (valid && revealed) ? rawPath : [
      { x: 0, y: Math.max(1, Number(m.launchElevation) || 2), z: 0, t: 0 }
    ];
    var showPath = valid && revealed && path.length > 1;
    var end = path[path.length - 1] || { x: 8, y: 0, z: 0 };
    var maxX = Math.max(8, (showPath ? Number(m.range) : 0) || (showPath ? Number(end.x) : 0) || 8);
    var maxY = Math.max(3, (showPath ? Number(m.apex) : 0) || path.reduce(function (acc, p) {
      return Math.max(acc, Number(p.y) || 0);
    }, 0));
    var drift = Math.max(2.5, Math.abs(Number(m.drift) || Number(end.z) || 0) + 2.5);
    var laneDepth = Math.max(8, drift * 2.4);
    var colors = contrast ? {
      ground: 0x000000, platform: 0x111111, frame: 0xffffff,
      effort: 0xffff00, load: 0x00ffff, quiet: 0x777777
    } : dark ? {
      ground: 0x07111f, platform: 0x17243a, frame: 0x6f8099,
      effort: 0xffb020, load: 0x38bdf8, quiet: 0x42536b
    } : {
      ground: 0xeaf0f6, platform: 0xf8fafc, frame: 0x64748b,
      effort: 0xb45309, load: 0x0369a1, quiet: 0x9aa8b8
    };

    if (S.renderer && S.renderer.setClearColor) {
      S.renderer.setClearColor(contrast ? 0x000000 : (dark ? 0x07111f : 0xeaf0f6), 1);
    }
    if (!contrast && S.scene && typeof THREE.Fog === 'function') {
      S.scene.fog = new THREE.Fog(contrast ? 0x000000 : (dark ? 0x07111f : 0xeaf0f6), Math.max(20, maxX * 0.1), Math.max(100, maxX * 2.4));
    }

    function material(color, emissive, opacity) {
      var cfg = { color: color };
      if (emissive) { cfg.emissive = color; cfg.emissiveIntensity = 0.18; }
      if (opacity != null && opacity < 1) { cfg.transparent = true; cfg.opacity = opacity; }
      return new THREE.MeshLambertMaterial(cfg);
    }
    function box(w, h, d, x, y, z, color, emissive) {
      var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color, emissive));
      mesh.position.set(x || 0, y || 0, z || 0);
      mesh.castShadow = !contrast; mesh.receiveShadow = !contrast;
      S.model.add(mesh);
      return mesh;
    }
    function line(points, color, opacity, dashed) {
      var geo = new THREE.BufferGeometry();
      geo.setFromPoints(points);
      var matLine = dashed
        ? new THREE.LineDashedMaterial({ color: color, transparent: opacity < 1, opacity: opacity, dashSize: 0.8, gapSize: 0.45 })
        : new THREE.LineBasicMaterial({ color: color, transparent: opacity < 1, opacity: opacity });
      var mesh = new THREE.Line(geo, matLine);
      if (dashed && mesh.computeLineDistances) mesh.computeLineDistances();
      S.model.add(mesh);
      return mesh;
    }
    function tube(points, color, radius) {
      if (!THREE.TubeGeometry || points.length < 2) return null;
      var curve = new THREE.CatmullRomCurve3(points);
      var mesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, Math.max(12, Math.min(96, points.length * 2)), radius, 7, false),
        material(color, true)
      );
      mesh.castShadow = !contrast; mesh.receiveShadow = !contrast;
      S.model.add(mesh);
      return mesh;
    }
    function worldPoint(p) {
      return new THREE.Vector3(Number(p.x) || 0, Math.max(0.03, Number(p.y) || 0), Number(p.z) || 0);
    }

    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(maxX + 16, laneDepth),
      material(colors.ground)
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.x = maxX / 2;
    ground.receiveShadow = !contrast;
    S.model.add(ground);

    if (typeof THREE.GridHelper === 'function') {
      var divisions = Math.max(10, Math.min(48, Math.round(maxX / 5)));
      var grid = new THREE.GridHelper(maxX + 12, divisions, colors.frame, dark ? 0x18283e : 0xb7c4d2);
      grid.position.set(maxX / 2, 0.012, 0);
      S.model.add(grid);
    }

    // The launch deck is compact and close to the camera, so there is always
    // a physical origin to compare with the far-away flag.
    box(3.2, 0.22, 2.6, 0, 0.11, 0, colors.platform);
    box(2.6, 0.12, 0.16, 0, 0.3, -1.02, colors.frame);
    box(2.6, 0.12, 0.16, 0, 0.3, 1.02, colors.frame);
    box(0.18, 1.1, 0.18, -1.1, 0.72, 0, colors.frame);
    box(0.18, 1.1, 0.18, 0.82, 0.72, 0, colors.frame);
    box(1.85, 0.16, 0.22, -0.1, 1.16, 0, colors.effort);
    var launchStone = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.14, Math.min(0.42, (Number(m.projDiameter) || 0.26) * 0.72)), 16, 12), material(colors.load, true));
    launchStone.position.copy(worldPoint(path[0]));
    launchStone.position.y += 0.05;
    launchStone.castShadow = !contrast;
    S.model.add(launchStone);

    // A low pair of rails turns the downrange axis into something the eye can
    // measure. Ticks are capped so a 250 m throw does not become a picket fence.
    box(maxX + 1.2, 0.045, 0.06, maxX / 2, 0.06, -2.35, colors.effort);
    box(maxX + 1.2, 0.045, 0.06, maxX / 2, 0.06, 2.35, colors.load);
    var tickCount = Math.max(4, Math.min(16, Math.ceil(maxX / 10)));
    for (var ti = 0; ti <= tickCount; ti++) {
      var tx = (maxX * ti) / tickCount;
      box(0.045, 0.08, 0.28, tx, 0.08, -2.35, ti === tickCount ? colors.load : colors.quiet);
      box(0.045, 0.08, 0.28, tx, 0.08, 2.35, ti === tickCount ? colors.load : colors.quiet);
    }

    var past = revealed ? (m.past || []).filter(function (r) { return r && r.length > 1; }).slice(-4) : [];
    past.forEach(function (r, ri) {
      line(r.map(worldPoint), colors.quiet, 0.24 + ri * 0.08, false);
    });
    var currentPoints = path.map(worldPoint);
    var currentLine = showPath ? tube(currentPoints, colors.effort, maxX > 60 ? 0.095 : 0.07) : null;
    if (!currentLine && showPath) currentLine = line(currentPoints, colors.effort, 0.98, false);
    if (showPath) line([
      new THREE.Vector3(0, 0.035, 0),
      new THREE.Vector3(Number(end.x) || maxX, 0.035, Number(end.z) || 0)
    ], colors.effort, 0.28, true);

    // A simple impact flag makes the terminal point obvious even when the arc
    // is shallow. Its height is deliberately independent of the trajectory.
    if (showPath) {
      var flagX = Number(end.x) || maxX, flagZ = Number(end.z) || 0;
      box(0.08, 1.7, 0.08, flagX, 0.85, flagZ, colors.load);
      box(0.7, 0.34, 0.06, flagX + 0.34, 1.5, flagZ, colors.load, true);
    }
    var stone = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.16, Math.min(0.48, (Number(m.projDiameter) || 0.26) * 0.8)), 16, 12), material(colors.effort, true));
    stone.castShadow = !contrast;
    S.model.add(stone);

    S.target = new THREE.Vector3(maxX * 0.45, Math.max(1.1, maxY * 0.34), 0);
    S.fitPts = [
      new THREE.Vector3(-2.2, 0, -3.2),
      new THREE.Vector3(maxX + 2.2, Math.max(2.2, maxY + 1.5), 3.2)
    ];
    if (showPath) path.forEach(function (p) { S.fitPts.push(worldPoint(p)); });
    S.rangePath = showPath ? path : [];
    S.rangeStone = stone;
    S.rangeLaunchStone = launchStone;
    S.rangeShotId = null;
    S.tick = function (now) {
      var data = S.data || {};
      var active = !!(data.animating && data.shotId && S.rangePath && S.rangePath.length > 1);
      if (S.rangeShotId !== data.shotId) { S.rangeShotId = data.shotId; S.rangeT0 = now; }
      var fraction;
      if (active) {
        if (data.reduced) {
          fraction = 1;
        } else {
          var seconds = Math.max(0.6, Number(data.flightTime) || 1.4);
          fraction = Math.max(0, Math.min(1, (now - (S.rangeT0 || now)) / 1000 / seconds));
        }
      } else {
        fraction = data.shotId ? 1 : 0;
      }
      var pts = S.rangePath || [];
      if (!pts.length) {
        // A previous shot ID can survive while the live controls describe an
        // invalid machine. There is no path to place the stone on in that
        // state; keep the launch prop visible and settle the field safely.
        stone.visible = false;
        launchStone.visible = true;
        return;
      }
      var idx = Math.min(pts.length - 1, Math.max(0, Math.floor(fraction * (pts.length - 1))));
      var next = Math.min(pts.length - 1, idx + 1);
      var seg = (fraction * (pts.length - 1)) - idx;
      var a = pts[idx] || pts[0], b = pts[next] || a;
      var pos = new THREE.Vector3(
        (Number(a.x) || 0) + ((Number(b.x) || 0) - (Number(a.x) || 0)) * seg,
        Math.max(0.12, (Number(a.y) || 0) + ((Number(b.y) || 0) - (Number(a.y) || 0)) * seg),
        (Number(a.z) || 0) + ((Number(b.z) || 0) - (Number(a.z) || 0)) * seg
      );
      stone.position.copy(pos);
      stone.scale.setScalar(active && !data.reduced ? 1 + 0.18 * Math.sin((now || 0) * 0.018) : 1);
      launchStone.visible = !active && !data.shotId;
      stone.visible = active || !!data.shotId;
    };
  }

  // The build bay used to float each engine over an unmarked plane. Keep the
  // physics model untouched, but give the learner a repeatable yard: a bolted
  // deck, a measurement rail, a backboard and a few safety marks. This same
  // staging works for the three engines and disappears when one is embedded in
  // the much larger target-wall field.
  function decorateEngineYard(THREE, S, m, width, depth, mat, frameCol, accentCol) {
    if (m && m.embedded) return;
    var dark = m && m.dark !== false;
    var contrast = !!(m && m.contrast);
    var platformCol = contrast ? 0x111111 : (dark ? 0x17243a : 0xf4f7fb);
    var wallCol = contrast ? 0x000000 : (dark ? 0x0b192b : 0xd7e0ea);
    var railCol = contrast ? 0xffffff : (dark ? 0x6f8099 : 0x64748b);
    function box(x, y, z, px, py, pz, color) {
      var mesh = new THREE.Mesh(new THREE.BoxGeometry(x, y, z), mat(color));
      mesh.position.set(px || 0, py || 0, pz || 0);
      mesh.castShadow = !contrast; mesh.receiveShadow = !contrast;
      S.model.add(mesh); return mesh;
    }
    box(width, 0.18, depth, 0, 0.09, 0, platformCol);
    box(width, Math.min(4.6, depth + 1.6), 0.14, 0, 2.15, -depth / 2 - 0.16, wallCol);
    [-width / 2 + 0.18, width / 2 - 0.18].forEach(function (x) {
      box(0.12, 4.2, 0.12, x, 2.08, -depth / 2 - 0.04, railCol);
    });
    box(width - 0.25, 0.08, 0.08, 0, 3.78, -depth / 2 - 0.04, railCol);
    box(Math.min(2.3, width * 0.34), 0.9, 0.08, -width * 0.27, 2.3, -depth / 2 - 0.04, platformCol);
    for (var mark = 0; mark < 10; mark++) {
      box(0.34, 0.045, 0.16, -width / 2 + 0.42 + mark * ((width - 0.84) / 9), 0.23, depth / 2 - 0.22,
        mark % 2 ? railCol : accentCol);
    }
    for (var post = 0; post < 4; post++) {
      var px = -width / 2 + 0.5 + post * ((width - 1) / 3);
      box(0.045, 0.3, 0.045, px, 0.28, depth / 2 - 0.16, railCol);
    }
    // A compact status stack gives the yard a readable response to a launch.
    // It stays intentionally small so it supports the machine instead of
    // becoming a second interface: amber = ready, blue = energy stored, green
    // = release. The materials are emissive so the signal remains legible in
    // the dark workshop without changing the physics scene.
    var signalLights = [];
    // Put the stack on the near-side corner: the default camera looks across
    // the deck toward the backboard, so a rear-mounted light would disappear
    // behind the machine and read as a missing state rather than a quiet one.
    var signalX = -width / 2 + 0.42;
    var signalZ = depth / 2 + 0.22;
    [accentCol, 0x38bdf8, 0x4ade80].forEach(function (signalColor, signalIndex) {
      box(0.22, 0.22, 0.08, signalX, 0.62 + signalIndex * 0.32, signalZ + 0.04, railCol);
      var signalMat = new THREE.MeshLambertMaterial({
        color: signalColor,
        emissive: signalColor,
        emissiveIntensity: signalIndex === 0 ? 0.34 : 0.12
      });
      var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 8), signalMat);
      bulb.position.set(signalX, 0.62 + signalIndex * 0.32, signalZ - 0.04);
      bulb.castShadow = !contrast;
      S.model.add(bulb);
      signalLights.push(bulb);
    });
    S.mlYard = { signalLights: signalLights };
    if (typeof THREE.GridHelper === 'function') {
      var grid = new THREE.GridHelper(Math.max(width, depth), Math.max(8, Math.round(width * 2)), railCol, dark ? 0x1b2c42 : 0xb8c5d3);
      grid.position.y = 0.205; S.model.add(grid);
    }
  }

  function buildTrebuchetScene(THREE, S, m) {
    var g = m.geom || {};
    var beamLong = g.beamLong || 4.5;
    var beamShort = g.beamShort || 1.2;
    var sling = g.slingLength || 2.0;
    var cwSize = Math.max(0.35, Math.min(1.6, Math.pow((g.cwMass || 1200) / 1200, 1 / 3) * 0.9));
    var projR = Math.max(0.08, Math.min(0.45, (g.projDiameter || 0.24) / 2));
    var pivotH = Math.max(beamShort + 1.4, (g.cwDrop || 3.2) + 1.0);

    var ink = m.contrast ? 0xffffff : (m.dark === false ? 0x475569 : 0xcbd5e1);
    var frameCol = m.contrast ? 0xc8c8c8 : (m.dark === false ? 0x94a3b8 : 0x64748b);
    var cwCol = m.contrast ? 0xffffff : 0x60a5fa;
    var projCol = m.contrast ? 0xffff00 : 0xf59e0b;

    var mat = function (c) { return new THREE.MeshLambertMaterial({ color: c }); };

    // Ground. Skipped when this machine is a guest in the siege scene, which
    // owns the ground and the sky for the whole field.
    if (!m.embedded) {
      if (S.renderer && S.renderer.setClearColor) S.renderer.setClearColor(m.contrast ? 0x000000 : (m.dark === false ? 0xdfe6ef : 0x0b1220), 1);
      var ground = new THREE.Mesh(
        new THREE.PlaneGeometry(40, 40),
        new THREE.MeshLambertMaterial({ color: m.contrast ? 0x000000 : (m.dark === false ? 0xd7dfe8 : 0x16233a) })
      );
      ground.rotation.x = -Math.PI / 2;
      S.model.add(ground);
    }

    decorateEngineYard(THREE, S, m, Math.max(7.6, (beamLong + beamShort) * 1.35), 4.4, mat, frameCol, projCol);

    // A-frame uprights
    [-0.7, 0.7].forEach(function (zz) {
      var post = new THREE.Mesh(new THREE.BoxGeometry(0.28, pivotH, 0.28), mat(frameCol));
      post.position.set(0, pivotH / 2, zz);
      S.model.add(post);
    });
    var sill = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 1.8), mat(frameCol));
    sill.position.set(0, 0.1, 0);
    S.model.add(sill);

    // Beam pivots about the origin of this group, placed at the pivot height.
    var arm = new THREE.Group();
    arm.position.set(0, pivotH, 0);
    S.model.add(arm);

    var span = beamLong + beamShort;
    var beam = new THREE.Mesh(new THREE.BoxGeometry(span, 0.3, 0.3), mat(ink));
    // Shift so the pivot sits at the short-arm/long-arm boundary.
    beam.position.set(span / 2 - beamShort, 0, 0);
    arm.add(beam);

    var cw = new THREE.Mesh(new THREE.BoxGeometry(cwSize, cwSize, cwSize), mat(cwCol));
    cw.position.set(-beamShort, -cwSize / 2 - 0.1, 0);
    arm.add(cw);

    // Sling hangs from the long-arm tip; modelled as a thin bar plus the stone.
    var slingGrp = new THREE.Group();
    slingGrp.position.set(beamLong, 0, 0);
    arm.add(slingGrp);
    var cord = new THREE.Mesh(new THREE.BoxGeometry(0.07, sling, 0.07), mat(frameCol));
    cord.position.set(0, -sling / 2, 0);
    slingGrp.add(cord);
    var stone = new THREE.Mesh(new THREE.SphereGeometry(Math.max(projR, 0.22), 18, 14), mat(projCol));
    stone.position.set(0, -sling, 0);
    slingGrp.add(stone);

    S.ml = { arm: arm, sling: slingGrp, stone: stone, cord: cord, pivotH: pivotH,
             beamLong: beamLong, sling3: sling, stoneR: Math.max(projR, 0.22) };
    S.mlShot = null;

    // Frame what the machine actually occupies when cocked, rather than a box
    // the size of its full swing: it sat small in a mostly empty frame.
    var reachX = Math.max(beamLong * 0.8, beamShort + cwSize);
    var topY = pivotH + beamShort * 0.9;
    S.target = new THREE.Vector3(0, topY * 0.45, 0);
    S.fitPts = [
      new THREE.Vector3(-reachX * 0.7, 0, 0),
      new THREE.Vector3(reachX, topY, 0),
      new THREE.Vector3(0, 0, 1.0),
      new THREE.Vector3(0, 0, -1.0)
    ];
    if (!m.embedded && !m.contrast && S.model && S.model.traverse) {
      S.model.traverse(function (obj) { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
    }

    // Idle pose, so a freshly built scene is never a blank frame.
    arm.rotation.z = COCKED_DEG * Math.PI / 180;
    slingGrp.rotation.z = -arm.rotation.z;
    restSlingOnGround(S.ml, arm.rotation.z);

    // With the arm down, the tip is barely above the ground, so a full-length
    // sling would put the stone under it. Shorten the drawn cord to rest the
    // stone on the ground, which is also where a real crew loads it.
    function restSlingOnGround(ml, armRad) {
      var tipY = ml.pivotH + ml.beamLong * Math.sin(armRad);
      var drop = Math.max(0.25, Math.min(ml.sling3, tipY - ml.stoneR));
      if (ml.cord && ml.sling3 > 0) {
        ml.cord.scale.y = drop / ml.sling3;
        ml.cord.position.set(0, -drop / 2, 0);
      }
      ml.stone.position.set(0, -drop, 0);
    }

    // Per-frame animation. Runs ONLY while the pushed data says static:false,
    // which the tool sets for the ~1.5 s of a shot and nothing else.
    S.tick = function (now) {
      var data = S.data || {};
      var reduced = !!data.reduced;
      var ml = S.ml;
      if (!ml) return;
      var yardLights = S.mlYard && S.mlYard.signalLights;
      function updateYardSignals(active, released) {
        if (!yardLights || !yardLights.length) return;
        var pulse = active ? (0.5 + 0.5 * Math.sin((now || 0) * 0.014)) : 0;
        yardLights[0].material.emissiveIntensity = active ? 0.16 + pulse * 0.1 : 0.34;
        yardLights[1].material.emissiveIntensity = active ? 0.24 + pulse * 0.24 : 0.12;
        yardLights[2].material.emissiveIntensity = released ? 0.38 + pulse * 0.3 : 0.08;
      }
      if (!data.shotId) {
        updateYardSignals(false, false);
        var cockedRad = COCKED_DEG * Math.PI / 180;
        ml.arm.rotation.z = cockedRad;
        ml.sling.rotation.z = -cockedRad;   // cord hangs vertically in world
        ml.stone.visible = true;
        restSlingOnGround(ml, cockedRad);
        return;
      }
      if (S.mlShot !== data.shotId) { S.mlShot = data.shotId; S.mlT0 = now; }
      var el = Math.max(0, (now - (S.mlT0 || now)) / 1000);
      if (reduced) el = 1.8;
      updateYardSignals(true, el > 0.75);
      var SWING = 0.75;                       // seconds of arm swing
      var releaseDeg = data.releaseAngle == null ? 45 : data.releaseAngle;
      var endDeg = 90 - releaseDeg;           // arm angle at release
      var k = Math.min(1, el / SWING);
      var eased = k * k * (3 - 2 * k);        // smoothstep
      var deg = COCKED_DEG + (endDeg - COCKED_DEG) * eased;
      ml.arm.rotation.z = deg * Math.PI / 180;
      // The sling trails the arm, then whips level just before release.
      ml.sling.rotation.z = -ml.arm.rotation.z * (1 - 0.85 * eased);
      if (el > SWING) {
        // Stone is away. Let it leave the frame rather than shrinking the
        // camera to fit a 200 m shot around a 4 m machine.
        var f = el - SWING;
        var vDir = releaseDeg * Math.PI / 180;
        var sp = Math.min(data.muzzleV || 20, 60);
        ml.stone.visible = f < 1.0;
        ml.stone.position.set(sp * f * Math.cos(vDir), sp * f * Math.sin(vDir) - 4.9 * f * f, 0);
      } else {
        ml.stone.visible = true;
        ml.stone.position.set(0, -ml.sling3, 0);
      }
    };
  }

  var SHOP_GL = (typeof window !== 'undefined' && window.StemLab && typeof window.StemLab.makeOrbitViewer === 'function')
    ? window.StemLab.makeOrbitViewer({
        attr: 'data-machinelab-shop-gl', clearColor: 0x07111f, fov: 42,
        fitSlack: 1.12, rot: { y: 28, x: 16 },
        failMessage: '3D workshop unavailable. The live diagram and number panels carry the same mechanics.',
        lights: function (THREE, scene, S) {
          if (S && S.renderer && S.renderer.shadowMap) {
            S.renderer.shadowMap.enabled = true;
            S.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
          }
          scene.add(new THREE.AmbientLight(0xffffff, 0.62));
          var key = new THREE.DirectionalLight(0xffe2b2, 0.95);
          key.castShadow = true;
          key.shadow.mapSize.width = 1024; key.shadow.mapSize.height = 1024;
          key.shadow.camera.left = -7; key.shadow.camera.right = 7;
          key.shadow.camera.top = 7; key.shadow.camera.bottom = -3;
          key.shadow.camera.near = 0.5; key.shadow.camera.far = 24;
          key.position.set(4.5, 7, 5.5); scene.add(key);
          var rim = new THREE.DirectionalLight(0x86c7ff, 0.45);
          rim.position.set(-5, 3.5, -4); scene.add(rim);
        },
        build: buildSimpleMachineScene
      })
    : {
        attach: function () {}, push: function () {}, onStatusChange: function () {},
        status: function () { return 'failed'; },
        debug: function () { return { state: 'failed', hostTooOld: true }; },
        dispose: function () {}
      };

  // Pointer-orbit state deliberately lives beside the singleton viewer. React
  // may re-render several times during a drag, but the physical gesture should
  // remain continuous across those renders.
  var SHOP_DRAG = null;
  var RANGE_DRAG = null;
  var MACHINE_DRAG = null;
  var WALL_DRAG = null;

  var TREB_GL = (typeof window !== 'undefined' && window.StemLab && typeof window.StemLab.makeOrbitViewer === 'function')
    ? window.StemLab.makeOrbitViewer({
        attr: 'data-machinelab-treb-gl',
        clearColor: 0x0b1220,
        fov: 44,
        fitSlack: 1.22,
        rot: { y: 22, x: 12 },
        failMessage: '3D view unavailable. The energy ledger and the trajectory graph below carry the same numbers.',
        lights: function (THREE, scene, S) {
          if (S && S.renderer && S.renderer.shadowMap) {
            S.renderer.shadowMap.enabled = true;
            S.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
          }
          scene.add(new THREE.AmbientLight(0xffffff, 0.52));
          var key = new THREE.DirectionalLight(0xfff4e0, 0.85);
          key.castShadow = true;
          key.shadow.mapSize.width = 1024; key.shadow.mapSize.height = 1024;
          key.shadow.camera.left = -8; key.shadow.camera.right = 8;
          key.shadow.camera.top = 8; key.shadow.camera.bottom = -3;
          key.shadow.camera.near = 0.5; key.shadow.camera.far = 28;
          key.position.set(2.4, 4.6, 2.8);
          scene.add(key);
          var fill = new THREE.DirectionalLight(0xbcd4ff, 0.32);
          fill.position.set(-2.6, 1.6, -2.0);
          scene.add(fill);
        },
        build: buildMachineScene
      })
    // The host can be older than this tool. Calling a missing factory at load
    // time would throw BEFORE registerTool runs and take the whole tool down,
    // not just its 3D. Degrade to a stub; the 2D panels carry the lesson.
    : {
        attach: function () {}, push: function () {}, onStatusChange: function () {},
        status: function () { return 'failed'; },
        debug: function () { return { state: 'failed', hostTooOld: true }; },
        dispose: function () {}
      };

  // ONE module-scope ref identity. An inline arrow is a new identity every
  // render, so React detaches and reattaches and the scene rebuilds on every
  // keystroke.
  function shopGlRef(nodeOrNull) { SHOP_GL.attach(nodeOrNull); }
  function trebGlRef(nodeOrNull) { TREB_GL.attach(nodeOrNull); }

  var RANGE_GL = (typeof window !== 'undefined' && window.StemLab && typeof window.StemLab.makeOrbitViewer === 'function')
    ? window.StemLab.makeOrbitViewer({
        attr: 'data-machinelab-range-gl', clearColor: 0x07111f, fov: 46,
        fitSlack: 1.08, rot: { y: RANGE_HOME.rotY, x: RANGE_HOME.rotX },
        failMessage: '3D range unavailable. The trajectory graph and flight numbers carry the same path.',
        lights: function (THREE, scene, S) {
          if (S && S.renderer && S.renderer.shadowMap) {
            S.renderer.shadowMap.enabled = true;
            S.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
          }
          scene.add(new THREE.AmbientLight(0xffffff, 0.6));
          var key = new THREE.DirectionalLight(0xffe2b2, 0.9);
          key.castShadow = true;
          key.shadow.mapSize.width = 1024; key.shadow.mapSize.height = 1024;
          key.shadow.camera.left = -10; key.shadow.camera.right = 10;
          key.shadow.camera.top = 10; key.shadow.camera.bottom = -4;
          key.shadow.camera.near = 0.5; key.shadow.camera.far = 80;
          key.position.set(6, 9, 7); scene.add(key);
          var rim = new THREE.DirectionalLight(0x86c7ff, 0.38);
          rim.position.set(-8, 4, -5); scene.add(rim);
        },
        build: buildRangeScene
      })
    : {
        attach: function () {}, push: function () {}, onStatusChange: function () {},
        status: function () { return 'failed'; },
        debug: function () { return { state: 'failed', hostTooOld: true }; },
        dispose: function () {}
      };

  function rangeGlRef(nodeOrNull) { RANGE_GL.attach(nodeOrNull); }

  // ── Full screen ──
  //
  // The element that goes full screen is the WRAPPER around each 3D bay, not
  // the bay itself, so the turn/tilt/zoom buttons travel with it. Sending only
  // the canvas would leave a scene you can look at and cannot steer, and the
  // only way out would be Escape.
  //
  // Held at module scope with stable callbacks for the same reason trebGlRef
  // is: an inline ref is a new function every render, so React detaches and
  // re-attaches on each one.
  var FS_HOSTS = { shop: null, machine: null, range: null, wall: null };
  function shopFsRef(nodeOrNull) { FS_HOSTS.shop = nodeOrNull; }
  function machineFsRef(nodeOrNull) { FS_HOSTS.machine = nodeOrNull; }
  function rangeFsRef(nodeOrNull) { FS_HOSTS.range = nodeOrNull; }
  function wallFsRef(nodeOrNull) { FS_HOSTS.wall = nodeOrNull; }

  // ═══════════════════════════════════════════════════════════════════
  // 3D TARGET WALL
  //
  // Built on the host's instanced voxel batch, so a 400-block wall is a
  // handful of draw calls rather than 400 meshes.
  //
  // There is no physics engine here and there does not need to be one. A
  // breached block is displaced by a hash of its own grid coordinates, which
  // is deterministic (the same wall always falls the same way), costs nothing,
  // and cannot desync from the scored model because it is derived from it.
  // ═══════════════════════════════════════════════════════════════════

  // Deterministic pseudo-noise in [0,1) from two integers. Not Math.random:
  // rubble that reshuffles on every re-render reads as a rendering bug, and a
  // scene that cannot be reproduced cannot be screenshot-tested.
  function hash01(a, b, salt) {
    var h = ((a | 0) * 73856093) ^ ((b | 0) * 19349663) ^ ((salt | 0) * 83492791);
    h = h < 0 ? -h : h;
    return (h % 100003) / 100003;
  }

  // ═══════════════════════════════════════════════════════════════════
  // THE SIEGE FIELD
  //
  // Until now the machine lived in one 3D scene and the castle in another, and
  // the shot between them was a number. That is the moment this whole tool
  // builds towards, so it happens on screen: YOUR machine, standing off at the
  // distance you set, throwing YOUR stone along the path the model actually
  // computed, into the wall, which breaks where it lands.
  //
  // World layout. The wall stands in the x-y plane at z = 0, blocks at
  // x = col - midCol and y = row + 0.5, which is what buildWallScene already
  // used. The machine sits at negative z and fires towards +z, so rubble
  // continues past the wall rather than back over the crew.
  //
  // The machine geometry is not re-modelled here. buildTrebuchetScene and
  // buildTorsionScene are called with embedded:true onto a sub-group, so there
  // is one trebuchet in this tool and editing it changes both views.
  function buildSiegeScene(THREE, S, m) {
    var blocks = (m && m.blocks) || [];
    var contrast = !!(m && m.contrast);
    var dark = (m && m.dark) !== false;
    var standoff = Math.max(5, (m && m.standoff) || 80);

    if (S.renderer && S.renderer.setClearColor) {
      S.renderer.setClearColor(contrast ? 0x000000 : (dark ? 0x0b1220 : 0xdfe6ef), 1);
    }

    // Long enough to hold the whole field at any standoff the sliders allow.
    var groundSpan = Math.max(240, standoff * 2.6);
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(groundSpan, groundSpan),
      new THREE.MeshLambertMaterial({ color: contrast ? 0x000000 : (dark ? 0x16233a : 0xd7dfe8) })
    );
    ground.rotation.x = -Math.PI / 2;
    S.model.add(ground);

    // ── The wall ──
    var batch = (window.StemLab && typeof window.StemLab.makeVoxelBatch === 'function')
      ? window.StemLab.makeVoxelBatch(THREE, {
          capacity: Math.max(16, blocks.length),
          size: 0.94,
          edges: !contrast
        })
      : null;
    if (batch) batch.addTo(S.model);
    S.wall = { batch: batch, contrast: contrast, dark: dark };

    var ext = { minCol: 0, maxCol: 0, maxRow: 0 };
    blocks.forEach(function (b) {
      if (b.col < ext.minCol) ext.minCol = b.col;
      if (b.col > ext.maxCol) ext.maxCol = b.col;
      if (b.row > ext.maxRow) ext.maxRow = b.row;
    });
    var midCol = (ext.minCol + ext.maxCol) / 2;
    var span = Math.max(2, ext.maxCol - ext.minCol + 1);
    var wallTop = ext.maxRow + 1;

    function colourFor(b) {
      if (contrast) return b.state === 'breached' ? 0x888888 : 0xffffff;
      if (b.state === 'cracked') return 0xfb923c;
      if (b.state === 'breached') return 0x4b5563;
      if (b.mat === 'granite') return 0x94a3b8;
      if (b.mat === 'earth') return 0x8d6e4a;
      return 0xcbd5e1;
    }

    // ── The machine, borrowed whole from the Build view ──
    var mg = new THREE.Group();
    mg.position.set(0, 0, -standoff);
    S.model.add(mg);
    var guest = { model: mg, renderer: null };
    try {
      buildMachineScene(THREE, guest, Object.assign({}, m, { embedded: true }));
    } catch (e) { guest.ml = null; }
    // The machine models fire along +x; the field runs along +z.
    mg.rotation.y = Math.PI / 2;
    // The guest's tick closes over the GUEST, not over this scene, so its data
    // has to be written onto the guest. Keeping the object is the whole point.
    S.siegeGuest = guest;

    // ── The stone in flight ──
    var stoneR = Math.max(0.35, Math.min(1.2, ((m && m.projDiameter) || 0.26) * 1.6));
    var stone = new THREE.Mesh(
      new THREE.SphereGeometry(stoneR, 16, 12),
      new THREE.MeshLambertMaterial({ color: contrast ? 0xffff00 : 0xf59e0b })
    );
    stone.visible = false;
    S.model.add(stone);
    S.flyStone = stone;

    // Carry the same sampled trajectory into the target-wall world. At rest it
    // is a quiet amber guide; during a shot it becomes the shared visual spine
    // between the range lane and the masonry impact.
    var previewRaw = (m.previewPath && m.previewPath.length > 1) ? m.previewPath : [];
    function pointAtDownrange(raw, xWanted) {
      if (!raw.length) return null;
      for (var pi = 0; pi < raw.length - 1; pi++) {
        var pa = raw[pi], pb = raw[pi + 1];
        var ax = Number(pa.x) || 0, bx = Number(pb.x) || 0;
        if ((ax <= xWanted && bx >= xWanted) || (ax >= xWanted && bx <= xWanted)) {
          var spanX = bx - ax;
          var f = Math.abs(spanX) > 1e-6 ? (xWanted - ax) / spanX : 0;
          return {
            x: (Number(pa.x) || 0) + ((Number(pb.x) || 0) - (Number(pa.x) || 0)) * f,
            y: (Number(pa.y) || 0) + ((Number(pb.y) || 0) - (Number(pa.y) || 0)) * f,
            z: (Number(pa.z) || 0) + ((Number(pb.z) || 0) - (Number(pa.z) || 0)) * f
          };
        }
      }
      return raw[raw.length - 1];
    }
    function wallPathPoint(p) {
      return new THREE.Vector3(Number(p.z) || 0, Math.max(0.04, Number(p.y) || 0), -standoff + (Number(p.x) || 0));
    }
    var wallPathPts = previewRaw.map(wallPathPoint).filter(function (p) { return p.z <= 1.2; });
    var pathLine = null;
    if (wallPathPts.length > 1) {
      var pathGeo = new THREE.BufferGeometry();
      pathGeo.setFromPoints(wallPathPts);
      pathLine = new THREE.Line(pathGeo, new THREE.LineBasicMaterial({
        color: contrast ? 0xffff00 : 0xf59e0b, transparent: true, opacity: 0.28
      }));
      S.model.add(pathLine);
    }
    var wallImpact = pointAtDownrange(previewRaw, standoff);
    var impactRing = null;
    var canReachWall = !!(previewRaw.length && (Number(previewRaw[previewRaw.length - 1].x) || 0) >= standoff);
    if (canReachWall && wallImpact) {
      var ringMat = new THREE.MeshLambertMaterial({
        color: contrast ? 0xffff00 : 0xf59e0b,
        emissive: contrast ? 0xffff00 : 0xf59e0b,
        emissiveIntensity: contrast ? 0.55 : 0.28,
        transparent: true, opacity: 0.75
      });
      impactRing = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.08, 8, 24), ringMat);
      impactRing.position.set(Number(wallImpact.z) || 0, Math.max(0.35, Number(wallImpact.y) || 0), 0.08);
      impactRing.visible = true;
      S.model.add(impactRing);
    }
    S.siegePathLine = pathLine;
    S.siegeImpactRing = impactRing;
    S.siegeCanReach = canReachWall;
    // A miss should read as a measurable engineering result, not as a silent
    // absence of impact geometry. Mark the actual endpoint and bridge it to the
    // wall so the learner can see the remaining distance in the world.
    var shortfallMarker = null, shortfallLine = null;
    if (!canReachWall && previewRaw.length > 1) {
      var shortfallRaw = previewRaw[previewRaw.length - 1];
      var shortfallPoint = wallPathPoint(shortfallRaw);
      var shortMat = new THREE.MeshLambertMaterial({
        color: contrast ? 0xffff00 : 0xf97316,
        emissive: contrast ? 0xffff00 : 0xf97316,
        emissiveIntensity: contrast ? 0.5 : 0.3
      });
      shortfallMarker = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), shortMat);
      shortfallMarker.position.copy(shortfallPoint);
      shortfallMarker.position.y = Math.max(0.25, shortfallMarker.position.y);
      S.model.add(shortfallMarker);
      var shortGeo = new THREE.BufferGeometry();
      shortGeo.setFromPoints([
        shortfallMarker.position.clone(),
        new THREE.Vector3(shortfallMarker.position.x, 0.08, 0)
      ]);
      shortfallLine = new THREE.Line(shortGeo, new THREE.LineBasicMaterial({
        color: contrast ? 0xffff00 : 0xf97316, transparent: true, opacity: 0.72
      }));
      S.model.add(shortfallLine);
    }
    S.siegeShortfall = { marker: shortfallMarker, line: shortfallLine };

    // No single camera can make both the machine and the castle large across
    // 80 m of field, so the shot is a choice rather than a compromise.
    var framing = (m && m.framing) || 'field';
    if (framing === 'castle') {
      // Tight on the wall. This is the one to watch a hit from.
      S.target = new THREE.Vector3(0, Math.max(1.5, wallTop * 0.45), 0);
      S.fitPts = [
        new THREE.Vector3(-span / 2 - 1.5, 0, 2.5),
        new THREE.Vector3(span / 2 + 1.5, wallTop + 1.5, 2.5),
        new THREE.Vector3(0, 0, -3), new THREE.Vector3(0, wallTop + 1.5, -3)
      ];
    } else if (framing === 'machine') {
      // Tight on the machine, for watching the arm rather than the target. The
      // box is sized to the machine itself: a generous one leaves it a model on
      // a table rather than a machine you are standing next to.
      var reach = Math.max(3.2, ((m.geom && m.geom.beamLong) || 4.5) * 0.75);
      var high = Math.max(4.5, ((m.geom && m.geom.cwDrop) || 3.2) + 2.2);
      S.target = new THREE.Vector3(0, high * 0.42, -standoff);
      S.fitPts = [
        new THREE.Vector3(-reach, 0, -standoff - reach * 0.5),
        new THREE.Vector3(reach, high, -standoff + reach * 0.5)
      ];
    } else {
      // The whole field. Both are small, and that IS the fact: the distance is
      // the thing being shown.
      S.target = new THREE.Vector3(0, Math.max(2, wallTop * 0.5), -standoff * 0.45);
      S.fitPts = [
        new THREE.Vector3(-span / 2 - 2, 0, 2),
        new THREE.Vector3(span / 2 + 2, wallTop + 2, 2),
        new THREE.Vector3(0, 0, -standoff - 6),
        new THREE.Vector3(0, wallTop + 2, -standoff - 6)
      ];
    }

    S.tick = function (now) {
      var data = S.data || {};
      var reduced = !!data.reduced;

      // The wall. While a stone is in the air the wall is still whole, so the
      // pre-impact blocks are drawn until it lands: a wall that broke while the
      // stone was still halfway there would read as the tool cheating.
      var flying = !!(data.flight && data.flight.path && data.flight.path.length > 1);
      var t = 0, dur = 0;
      if (flying) {
        if (S.flightId !== data.flight.id) { S.flightId = data.flight.id; S.flightT0 = now; }
        dur = Math.max(0.3, data.flight.seconds || 1.4);
        t = Math.max(0, (now - (S.flightT0 || now)) / 1000);
        if (reduced) t = dur;
      }
      var landed = !flying || t >= dur;
      var list = (flying && !landed && data.prevBlocks) ? data.prevBlocks : (data.blocks || []);

      if (S.siegePathLine && S.siegePathLine.material) {
        S.siegePathLine.material.opacity = flying ? 0.52 : 0.28;
      }
      if (S.siegeImpactRing) {
        var ringPulse = flying && !reduced ? (0.5 + 0.5 * Math.sin((now || 0) * 0.014)) : 0;
        S.siegeImpactRing.scale.setScalar(flying ? 1 + ringPulse * 0.18 : 1);
        S.siegeImpactRing.material.emissiveIntensity = flying ? 0.36 + ringPulse * 0.28 : 0.28;
      }
      if (S.siegeShortfall && S.siegeShortfall.marker) {
        var missPulse = !reduced ? (0.5 + 0.5 * Math.sin((now || 0) * 0.01)) : 0;
        S.siegeShortfall.marker.scale.setScalar(1 + missPulse * 0.12);
        S.siegeShortfall.marker.material.emissiveIntensity = 0.3 + missPulse * 0.22;
        if (S.siegeShortfall.line && S.siegeShortfall.line.material) {
          S.siegeShortfall.line.material.opacity = 0.58 + missPulse * 0.18;
        }
      }

      if (S.wall.batch) {
        var n = 0;
        for (var i = 0; i < list.length && i < S.wall.batch.capacity; i++) {
          var b = list[i];
          var x = b.col - midCol, y = b.row + 0.5, z = 0, sc = 1;
          if (b.state === 'breached') {
            var r1 = hash01(b.col, b.row, 1), r2 = hash01(b.col, b.row, 2), r3 = hash01(b.col, b.row, 3);
            x += (r1 - 0.5) * 2.2;
            // Forward, away from the machine: the impact carries it through.
            z += (r2 - 0.5) * 2.6 + 1.1;
            y = 0.22 + r3 * 0.5;
            sc = 0.45 + r1 * 0.25;
          }
          S.wall.batch.set(n, x, y, z, sc, colourFor(b));
          n++;
        }
        S.wall.batch.commit(n);
      }

      // The machine's own swing, driven off the flight clock so the arm reaches
      // release exactly as the stone appears. The guest tick reads GUEST.data,
      // and it hides its own sling stone once the swing finishes, which is what
      // hands the shot over to the field stone below.
      var g = S.siegeGuest;
      if (g && typeof g.tick === 'function') {
        g.data = flying
          ? { shotId: data.flight.id, releaseAngle: data.releaseAngle, muzzleV: data.muzzleV, reduced: reduced }
          : {};
        try { g.tick(flying ? (S.flightT0 || now) + Math.min(t, 0.9) * 1000 : now); }
        catch (e) {}
      }

      // The stone, on the path the model computed. x downrange maps to +z from
      // the machine, y is height, z is crosswind drift mapped to world x.
      if (S.flyStone) {
        if (!flying || landed) {
          S.flyStone.visible = false;
        } else {
          var pts = data.flight.path;
          var frac = t / dur;
          var idx = Math.min(pts.length - 1, Math.max(0, Math.floor(frac * (pts.length - 1))));
          var nx = Math.min(pts.length - 1, idx + 1);
          var seg = (frac * (pts.length - 1)) - idx;
          var a = pts[idx], bb = pts[nx];
          var px = (a.z || 0) + (((bb.z || 0) - (a.z || 0)) * seg);
          var py = a.y + ((bb.y - a.y) * seg);
          var pz = a.x + ((bb.x - a.x) * seg);
          S.flyStone.visible = true;
          S.flyStone.position.set(px, Math.max(0.2, py), -standoff + pz);
        }
      }
    };
    S.tick(0);
  }

  function buildWallScene(THREE, S, m) {
    var blocks = (m && m.blocks) || [];
    var contrast = !!(m && m.contrast);
    var dark = (m && m.dark) !== false;

    if (S.renderer && S.renderer.setClearColor) S.renderer.setClearColor(contrast ? 0x000000 : (dark ? 0x0b1220 : 0xdfe6ef), 1);
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshLambertMaterial({ color: contrast ? 0x000000 : (dark ? 0x16233a : 0xd7dfe8) })
    );
    ground.rotation.x = -Math.PI / 2;
    S.model.add(ground);

    var batch = (window.StemLab && typeof window.StemLab.makeVoxelBatch === 'function')
      ? window.StemLab.makeVoxelBatch(THREE, {
          capacity: Math.max(16, blocks.length),
          size: 0.94,
          edges: !contrast
        })
      : null;
    if (batch) batch.addTo(S.model);
    S.wall = { batch: batch, contrast: contrast, dark: dark };

    var ext = { minCol: 0, maxCol: 0, maxRow: 0 };
    blocks.forEach(function (b) {
      if (b.col < ext.minCol) ext.minCol = b.col;
      if (b.col > ext.maxCol) ext.maxCol = b.col;
      if (b.row > ext.maxRow) ext.maxRow = b.row;
    });
    var midCol = (ext.minCol + ext.maxCol) / 2;
    var span = Math.max(2, ext.maxCol - ext.minCol + 1);

    S.target = new THREE.Vector3(0, Math.max(1, ext.maxRow / 2), 0);
    S.fitPts = [
      new THREE.Vector3(-span / 2 - 1, 0, 0),
      new THREE.Vector3(span / 2 + 1, ext.maxRow + 1.5, 0),
      new THREE.Vector3(0, 0, 2), new THREE.Vector3(0, 0, -2)
    ];

    function colourFor(b) {
      if (S.wall.contrast) return b.state === 'breached' ? 0x888888 : 0xffffff;
      if (b.state === 'cracked') return 0xfb923c;
      if (b.state === 'breached') return 0x4b5563;
      if (b.mat === 'granite') return 0x94a3b8;
      if (b.mat === 'earth') return 0x8d6e4a;
      return 0xcbd5e1;
    }

    // Re-populated from the pushed data every time the wall changes. The batch
    // itself is allocated once, so a shot costs a buffer update, not a rebuild.
    S.tick = function () {
      var data = S.data || {};
      var list = data.blocks || [];
      if (!S.wall.batch) return;
      var n = 0;
      for (var i = 0; i < list.length && i < S.wall.batch.capacity; i++) {
        var b = list[i];
        var x = b.col - midCol, y = b.row + 0.5, z = 0, sc = 1;
        if (b.state === 'breached') {
          // Fallen. Displaced into a heap at the foot of the wall, deterministically.
          var r1 = hash01(b.col, b.row, 1), r2 = hash01(b.col, b.row, 2), r3 = hash01(b.col, b.row, 3);
          x += (r1 - 0.5) * 2.2;
          z += (r2 - 0.5) * 2.6 + 1.1;
          y = 0.22 + r3 * 0.5;
          sc = 0.45 + r1 * 0.25;
        }
        S.wall.batch.set(n, x, y, z, sc, colourFor(b));
        n++;
      }
      S.wall.batch.commit(n);
    };
    S.tick(0);
  }

  var SIEGE_GL = (typeof window !== 'undefined' && window.StemLab && typeof window.StemLab.makeOrbitViewer === 'function')
    ? window.StemLab.makeOrbitViewer({
        attr: 'data-machinelab-wall-gl',
        clearColor: 0x0b1220,
        fov: 46,
        // A field 80 m long fitted as a sphere puts the camera so far back that
        // the castle and the machine are both specks in a lot of empty ground.
        // Held tight, and the framing is done by where the target sits instead.
        fitSlack: 1.02,
        // Low and off to one side, looking down the firing line. A high camera
        // flattens the field into a plan view; at 9 degrees the ground
        // foreshortens, the castle stands against the sky, and the distance
        // reads as distance.
        rot: { y: 206, x: 9 },
        failMessage: 'The 3D wall is unavailable. The wall diagram and the course table below carry the same information.',
        lights: function (THREE, scene) {
          scene.add(new THREE.AmbientLight(0xffffff, 0.55));
          var key = new THREE.DirectionalLight(0xfff4e0, 0.8);
          key.position.set(2.0, 4.2, 3.0);
          scene.add(key);
          var fill = new THREE.DirectionalLight(0xbcd4ff, 0.3);
          fill.position.set(-2.4, 1.4, -2.2);
          scene.add(fill);
        },
        build: buildSiegeScene
      })
    : {
        attach: function () {}, push: function () {}, onStatusChange: function () {},
        status: function () { return 'failed'; },
        debug: function () { return { state: 'failed', hostTooOld: true }; },
        dispose: function () {}
      };

  function siegeGlRef(nodeOrNull) { SIEGE_GL.attach(nodeOrNull); }

  // ═══════════════════════════════════════════════════════════════════
  // DEFAULT STATE
  // ═══════════════════════════════════════════════════════════════════

  function defaultState() {
    return {
      view: 'machines',
      bench: 'lever',
      bandOverride: null,

      leverEffortArm: 2.0, leverLoadArm: 1.0, leverLoad: 400,
      pulleySegments: 2, pulleyLoad: 400,
      windlassHandleR: 0.45, windlassDrumR: 0.10, windlassLoad: 400,
      rampLength: 4.0, rampHeight: 1.0, rampLoad: 400,
      wedgeLength: 0.30, wedgeThickness: 0.06, wedgeLoad: 800,
      screwHandleR: 0.15, screwPitch: 0.005, screwLoad: 2000,

      loadDistance: 0.5,
      benchPrediction: '',
      benchChoice: null,
      benchResult: null,
      benchStreak: 0,
      provenBenches: {},
      shopDemoId: 0,
      shopAnimating: false,
      shopDemoBench: null,

      // ── P2/P3: siege machines ──
      machine: 'trebuchet',          // trebuchet | ballista | onager
      cwMass: 1200, cwDrop: 3.2,
      beamLong: 4.5, beamShort: 1.2, slingLength: 2.0, armMass: 60,
      // 25 kg at 0.26 m across is ~2700 kg/m3: granite. At the old 0.24 m it was
      // 3454 kg/m3, denser than most rock, and drag on an impossible object was
      // quietly deciding every range comparison.
      projMass: 25, projDiameter: 0.26,
      releaseAngle: 45, launchElevation: 2,
      winchHandleR: 0.45, winchDrumR: 0.08, winchPulleys: 2,
      gravity: 9.81, drag: true, windZ: 0,

      // Camera, one per 3D bay. See MACHINE_LAB_SPEC.md: omitting these from a
      // push resets the view to dead-on and throws cfg.rot away.
      shopRotY: 28, shopRotX: 16, shopZoom: 1,
      machineRotY: 22, machineRotX: 12, machineZoom: 1,
      rangeRotY: 72, rangeRotX: 18, rangeZoom: 1,
      wallRotY: 14, wallRotX: 16, wallZoom: 1,

      // Torsion machines. Turns, arm and draw are the same idea on both, so
      // they are shared; the sling and the string belong to one machine each.
      torsionTurns: 18, torsionArmLength: 1.1, torsionDraw: 1.0, torsionArmMass: 3,
      ballistaStringMass: 0.35, onagerSling: 1.0,

      lastShot: null,
      // Signature of the control set used for the last fired shot. Keeping it
      // separate from lastShot lets the range show a live prediction without
      // accidentally presenting an old result as if it belonged to the new
      // slider values.
      lastShotSig: '',
      shotId: 0,
      animating: false,
      // The shot the 3D field is currently playing: the arc, how long it takes
      // and the wall as it stood before impact. Null except during a throw.
      siegeFlight: null,
      siegeFlightId: 0,
      // Which shot the 3D field is composed for: field | castle | machine.
      siegeFraming: 'field',
      shotHistory: [],
      showOverlay: true,
      rangePrediction: '',
      rangeResult: null,
      rangeStreak: 0,
      ledgerAsTable: false,
      glTick: 0,

      // ── P4: siege ──
      wallPreset: 'curtain',
      wallBlocks: null,
      standoff: 80,
      shotsFired: 0,
      totalCrankWork: 0,
      breached: false,
      siegeFeedback: null,
      lastImpact: null,
      wallAsTable: false,

      // ── P3 ──
      iqHypothesis: '', iqStuck: false, iqUnderstood: false, iqExplanation: '', iqLog: [],

      manualTopic: 'energy',
      // null, NOT 'grade5': the AI panel derives its default from the current
      // grade band, and a concrete default here would mask that forever, since
      // the missing-key fill would always supply it.
      aiLevel: null, aiText: '', aiLoading: false, aiError: '',
      machinesFired: []
    };
  }

  // Which of the six benches each engine is built from. BOTH the Build panel
  // and the Machine Shop panel read this, so the two directions of the link
  // cannot drift apart. Order is the order they are presented in.
  var MACHINE_BENCHES = {
    trebuchet: ['lever', 'windlass', 'pulley', 'wedge', 'ramp'],
    ballista: ['lever', 'windlass', 'pulley', 'wedge', 'screw'],
    onager: ['lever', 'windlass', 'pulley', 'wedge', 'screw']
  };

  // The reference rock. Used to say "a stone this big would weigh about N kg",
  // which is the K-2 and grade 3-5 way of stating a density, and to pick the
  // shipped default stone. Granite runs roughly 2650-2750 kg per cubic metre.
  var GRANITE = 2700;

  // Per-machine metadata. The comparison view is the payoff of the whole tool:
  // three different ways to store energy, judged on the same ledger.
  var MACHINES = [
    { id: 'trebuchet', icon: '🏰', label: 'Trebuchet', store: 'gravity' },
    { id: 'ballista', icon: '🏹', label: 'Ballista', store: 'torsion' },
    { id: 'onager', icon: '🪃', label: 'Onager', store: 'torsion' }
  ];

  var GRAVITY_PRESETS = [
    { id: 'earth', g: 9.81, label: 'Earth' },
    { id: 'moon', g: 1.62, label: 'Moon' },
    { id: 'mars', g: 3.72, label: 'Mars' }
  ];

  // ═══════════════════════════════════════════════════════════════════
  // TOOL REGISTRATION
  // ═══════════════════════════════════════════════════════════════════

  window.StemLab.registerTool('machineLab', {
    icon: '⚙️',
    label: 'Machine Lab',
    desc: 'Levers, pulleys, ramps, wedges and screws. See how simple machines trade distance for force, and prove it with your own predictions.',
    color: 'amber',
    category: 'engineering',

    // Exposed for tests: the pure model, with no DOM or React in sight.
    _math: _machineMath,
    _resolveBand: resolveBand,
    _aiTimeoutMs: AI_TIMEOUT_MS,
    _machineBenches: MACHINE_BENCHES,
    // Exposed so the answer-position test can inspect the ROTATED order rather
    // than trusting that rotation happened. Identity translator: the test cares
    // about option order and the correct flag, not about wording.
    _benchChoices: function (benchId) {
      var bs = buildBenches(function (k, fb) { return (fb != null) ? fb : k; });
      for (var i = 0; i < bs.length; i++) {
        if (bs[i].id === benchId) return bs[i].k2Choices;
      }
      return null;
    },

    questHooks: [
      {
        id: 'prove_3_machines',
        label: 'Prove the mechanical advantage of 3 simple machines',
        icon: '⚙️',
        check: function (d) { return Object.keys((d && d.provenBenches) || {}).length >= 3; },
        progress: function (d) { return Object.keys((d && d.provenBenches) || {}).length + '/6 benches'; }
      },
      {
        id: 'prove_all_6',
        label: 'Prove all six simple machines',
        icon: '🏆',
        check: function (d) { return Object.keys((d && d.provenBenches) || {}).length >= 6; },
        progress: function (d) { return Object.keys((d && d.provenBenches) || {}).length + '/6 benches'; }
      },
      {
        id: 'predict_streak_3',
        label: 'Get 3 predictions right in a row',
        icon: '🎯',
        check: function (d) { return ((d && d.benchStreak) || 0) >= 3; },
        progress: function (d) { return ((d && d.benchStreak) || 0) + '/3 in a row'; }
      },
      {
        id: 'breach_efficiently',
        label: 'Breach a wall in 5 shots or fewer',
        icon: '🏰',
        check: function (d) { return !!(d && d.breached) && (d.shotsFired || 99) <= 5; },
        progress: function (d) {
          if (!d) return 'Not breached yet';
          return d.breached ? (d.shotsFired + ' shots') : 'Not breached yet';
        }
      },
      {
        id: 'compare_machines',
        label: 'Fire all three machines and compare their ledgers',
        icon: '📊',
        check: function (d) { return ((d && d.machinesFired) || []).length >= 3; },
        progress: function (d) { return ((d && d.machinesFired) || []).length + '/3 machines'; }
      }
    ],

    render: function (ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var isContrast = !!ctx.isContrast;
      var isDark = !!ctx.isDark;
      var T = mkTheme(isDark, isContrast);
      var reducedMotion = typeof window !== 'undefined' && window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Single-argument-safe translator. ctx.t may be missing entirely under
      // the smoke harness, and must never surface the literal "undefined".
      var __alloT = function (k, fb) {
        var v;
        try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; }
        return (v == null) ? (fb != null ? fb : k) : v;
      };

      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var addToast = (typeof ctx.addToast === 'function') ? ctx.addToast : function () {};
      var announceToSR = (typeof ctx.announceToSR === 'function') ? ctx.announceToSR : function () {};
      var awardStemXP = (typeof ctx.awardXP === 'function') ? ctx.awardXP : function () {};
      var celebrate = (typeof ctx.celebrate === 'function') ? ctx.celebrate : function () {};
      // No ctx.a11yClick helper here on purpose: every interactive element in
      // this tool is a native <button> or <input>, so the browser supplies the
      // role, the tab stop and the Enter/Space handling. The helper exists for
      // tools that must make a div clickable; not needing it is the stronger
      // position, and machinelab_a11y.test.js fails if a role="button" div ever
      // appears in the rendered output.

      // ctx.srOnly is a function in the host and a style object in the test
      // harness, so neither shape can be trusted. Own it locally.
      var srOnlyStyle = {
        position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
        overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0
      };

      // ── State init guard ──
      if (!labToolData || !labToolData.machineLab) {
        if (typeof setLabToolData === 'function') {
          setLabToolData(function (prev) {
            return Object.assign({}, prev, { machineLab: defaultState() });
          });
        }
        return h('div', {
          className: 'p-8 text-center',
          style: { color: T.muted, background: T.bg }
        }, __alloT('stem.machinelab.loading', 'Loading Machine Lab...'));
      }

      // Fill any key this build expects but the stored state lacks. State can
      // legitimately arrive partial: a snapshot saved by an earlier version, a
      // restore through ctx.toolSnapshots, or a build that added a control.
      // Without this the tool renders a wall of "—" and unset sliders while
      // looking like it loaded fine, which is worse than crashing.
      var d = labToolData.machineLab;
      var _defaults = defaultState();
      for (var _dk in _defaults) {
        if (Object.prototype.hasOwnProperty.call(_defaults, _dk) && d[_dk] === undefined) {
          d = Object.assign({}, _defaults, d);
          break;
        }
      }
      var provenCount = Object.keys(d.provenBenches || {}).length;
      var firedCount = (d.machinesFired || []).length;

      // A score belongs to the prediction and physics that produced it. Keep
      // the old shot in the history (and let the stale-flight banner explain
      // it), but remove the short "It flew..." result as soon as a live input
      // changes so a learner never mistakes yesterday's score for today's one.
      var RANGE_RESULT_KEYS = {
        machine: true, gravity: true, drag: true, windZ: true, launchElevation: true,
        projMass: true, projDiameter: true, releaseAngle: true,
        cwMass: true, cwDrop: true, beamLong: true, beamShort: true,
        slingLength: true, armMass: true,
        torsionTurns: true, torsionArmLength: true, torsionDraw: true,
        torsionArmMass: true, ballistaStringMass: true, onagerSling: true,
        winchHandleR: true, winchDrumR: true, winchPulleys: true,
        rangePrediction: true
      };
      var upd = function (key, val) {
        setLabToolData(function (prev) {
          var cur = (prev && prev.machineLab) || {};
          var next = Object.assign({}, cur);
          next[key] = val;
          if (RANGE_RESULT_KEYS[key]) next.rangeResult = null;
          return Object.assign({}, prev, { machineLab: next });
        });
      };
      // upd() computes its value from the `d` captured at render time, which is
      // wrong from inside a setTimeout: the full-screen follow-up fires ~350 ms
      // later and would write a counter read before the click. This reads prev.
      var bumpGl = function () {
        setLabToolData(function (prev) {
          var cur = (prev && prev.machineLab) || {};
          return Object.assign({}, prev, {
            machineLab: Object.assign({}, cur, { glTick: (cur.glTick || 0) + 1 })
          });
        });
      };

      var updMulti = function (patch) {
        setLabToolData(function (prev) {
          var cur = (prev && prev.machineLab) || {};
          return Object.assign({}, prev, { machineLab: Object.assign({}, cur, patch) });
        });
      };

      var band = resolveBand(ctx, d.bandOverride);
      // Several panels split the same way: the two younger bands share a
      // register and the two older ones share the technical names. One flag at
      // render scope, so a panel cannot end up branching on a different rule
      // from the panel beside it.
      var young = (band === 'k2' || band === 'g35');
      var BENCHES = buildBenches(__alloT);
      var bench = null;
      for (var bi = 0; bi < BENCHES.length; bi++) {
        if (BENCHES[bi].id === d.bench) { bench = BENCHES[bi]; break; }
      }
      if (!bench) bench = BENCHES[0];

      var ma = bench.ma(d);
      var load = d[bench.loadKey];
      var effort = _machineMath.effortForce(load, ma);
      var loadDist = d.loadDistance > 0 ? d.loadDistance : 0.5;
      var effortDist = _machineMath.effortDistance(loadDist, ma);
      var work = _machineMath.workCheck(load, loadDist, ma);
      var proven = (d.provenBenches || {})[bench.id];

      // ── Grading ──
      // k2 and g35 answer by choosing; g68 and g912 type a force in newtons.
      var isChoiceBand = (band === 'k2');

      function markProven(xp, message) {
        var nextProven = Object.assign({}, d.provenBenches || {});
        var firstTime = !nextProven[bench.id];
        nextProven[bench.id] = true;
        // Completing all six benches is the other genuine milestone here.
        var completedSet = firstTime && Object.keys(nextProven).length === 6;
        updMulti({
          provenBenches: nextProven,
          benchStreak: (d.benchStreak || 0) + 1,
          benchResult: { ok: true, message: message }
        });
        if (firstTime) { awardStemXP(xp); }
        if (completedSet) {
          celebrate();
          addToast('⚙️ ' + __alloT('stem.machinelab.all_six', 'All six simple machines proven.'));
        }
        addToast('✅ ' + message);
        announceToSR(message);
      }

      function markWrong(message) {
        updMulti({ benchStreak: 0, benchResult: { ok: false, message: message } });
        announceToSR(message);
      }

      function submitChoice(opt) {
        if (opt && opt.correct) {
          markProven(10, __alloT('stem.machinelab.right', 'That is right. More distance, less force.'));
        } else {
          markWrong(__alloT('stem.machinelab.try_again', 'Not quite. Try moving the sliders and watching what gets easier.'));
        }
        upd('benchChoice', opt ? opt.id : null);
      }

      function submitTyped() {
        var guess = _machineMath.parseNum(d.benchPrediction);
        if (guess === null) {
          markWrong(__alloT('stem.machinelab.enter_number', 'Enter a number first.'));
          return;
        }
        if (effort === null) {
          markWrong(__alloT('stem.machinelab.bad_setup', 'These settings do not describe a working machine. Adjust the sliders.'));
          return;
        }
        if (_machineMath.withinTolerance(guess, effort, 0.05)) {
          markProven(15, __alloT('stem.machinelab.correct_force', 'Correct. The effort force is ') + fmt(effort, 1) + ' N.');
        } else {
          markWrong(__alloT('stem.machinelab.off_by', 'Not yet. The effort force is ') + fmt(effort, 1) + ' N. Try load divided by MA.');
        }
      }

      // ═══ UI pieces ═══

      function card(children, key, extra) {
        return h('div', {
          key: key,
          style: Object.assign({
            background: T.card,
            border: '1px solid ' + T.border,
            borderRadius: 12,
            padding: 14,
            marginBottom: 12
          }, extra || {})
        }, children);
      }

      function benchTabs() {
        return h('div', {
          key: 'tabs',
          role: 'tablist',
          'aria-label': __alloT('stem.machinelab.aria_benchlist', 'Simple machine benches'),
          style: {
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))',
            gap: 8, marginBottom: 12
          }
        }, BENCHES.map(function (b, stationIndex) {
          var active = b.id === bench.id;
          var done = !!(d.provenBenches || {})[b.id];
          return h('button', {
            key: b.id,
            role: 'tab',
            'aria-selected': active ? 'true' : 'false',
            onClick: function () { updMulti({ bench: b.id, benchPrediction: '', benchChoice: null, benchResult: null, shopAnimating: false }); },
            style: {
              minHeight: 58, padding: '8px 10px', borderRadius: 12, cursor: 'pointer',
              border: '1px solid ' + (active ? T.accent : T.border), textAlign: 'left',
              boxShadow: active ? '0 0 0 2px ' + T.accent + '33' : 'none',
              background: active ? T.accent : T.card, color: active ? T.accentInk : T.text,
              fontSize: 12, fontWeight: 750, display: 'grid', gridTemplateColumns: '28px 1fr auto',
              alignItems: 'center', gap: 7
            }
          }, [
            h('span', {
              key: 'i', 'aria-hidden': 'true',
              style: { fontSize: 20, lineHeight: 1, textAlign: 'center' }
            }, b.icon),
            h('span', { key: 'l', style: { lineHeight: 1.2 } }, [
              h('span', { key: 'n', style: { display: 'block', fontSize: 9, opacity: 0.72, letterSpacing: 0.7, textTransform: 'uppercase' } },
                __alloT('stem.machinelab.station', 'Station ') + (stationIndex + 1)),
              h('span', { key: 't' }, b.label)
            ]),
            done ? h('span', { key: 'd', 'aria-hidden': 'true', style: { fontSize: 14 } }, '✓') : null
          ]);
        }));
      }

      function bandPicker() {
        return h('div', {
          key: 'bandpick',
          style: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 12 }
        }, [
          h('span', { key: 'lbl', style: { fontSize: 12, color: T.dim, fontWeight: 700 } },
            __alloT('stem.machinelab.reading_level', 'Level:')),
          h('div', { key: 'opts', role: 'group', 'aria-label': __alloT('stem.machinelab.aria_level', 'Reading level') },
            BANDS.map(function (bnd) {
              var on = bnd === band;
              return h('button', {
                key: bnd,
                'aria-pressed': on ? 'true' : 'false',
                onClick: function () { upd('bandOverride', bnd); },
                style: {
                  padding: '4px 9px', marginRight: 4, borderRadius: 8, cursor: 'pointer',
                  border: '1px solid ' + (on ? T.accent : T.border),
                  background: on ? T.accent : T.card,
                  color: on ? T.accentInk : T.muted,
                  fontSize: 11, fontWeight: 700
                }
              }, BAND_LABELS[bnd]);
            })),
          d.bandOverride ? h('button', {
            key: 'reset',
            onClick: function () { upd('bandOverride', null); },
            style: {
              padding: '4px 9px', borderRadius: 8, cursor: 'pointer',
              border: '1px solid ' + T.border, background: 'transparent',
              color: T.dim, fontSize: 11, fontWeight: 600
            }
          }, __alloT('stem.machinelab.follow_class', 'Follow class setting')) : null
        ]);
      }

      function slider(c) {
        var val = d[c.key];
        var id = 'ml-' + c.key;
        return h('div', { key: c.key, style: { marginBottom: 10 } }, [
          h('label', {
            key: 'lb', htmlFor: id,
            style: { display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 }
          }, [
            h('span', { key: 'n' }, c.label),
            h('span', { key: 'v', style: { color: T.accent, fontVariantNumeric: 'tabular-nums' } },
              fmt(val, 3) + (c.unit ? ' ' + c.unit : ''))
          ]),
          h('input', {
            key: 'in', id: id, type: 'range',
            min: c.min, max: c.max, step: c.step, value: val,
            'aria-label': c.label,
            onChange: function (e) {
              var n = _machineMath.parseNum(e.target.value);
              if (n !== null) { updMulti({ benchResult: null }); upd(c.key, n); }
            },
            style: { width: '100%', accentColor: T.accent }
          })
        ]);
      }

      // The readout. Every band sees MA; the wording and the extra rows change.
      function readout() {
        var rows = [];
        rows.push({ k: __alloT('stem.machinelab.ma', 'Mechanical advantage'), v: ma === null ? '—' : (fmt(ma, 2) + '×'), hi: true });

        if (band === 'k2') {
          rows.push({
            k: __alloT('stem.machinelab.how_it_feels', 'How it feels'),
            v: ma === null ? '—' : (ma >= 2
              ? __alloT('stem.machinelab.much_easier', 'Much easier')
              : (ma > 1 ? __alloT('stem.machinelab.a_bit_easier', 'A bit easier') : __alloT('stem.machinelab.no_help', 'No help')))
          });
        } else {
          rows.push({ k: __alloT('stem.machinelab.load', 'Load'), v: fmt(load, 0) + ' N' });
          rows.push({ k: __alloT('stem.machinelab.effort_needed', 'Effort needed'), v: effort === null ? '—' : fmt(effort, 1) + ' N' });
        }
        if (band === 'g68' || band === 'g912') {
          rows.push({ k: __alloT('stem.machinelab.load_moves', 'Load moves'), v: fmt(loadDist, 2) + ' m' });
          rows.push({ k: __alloT('stem.machinelab.you_move', 'Your hand moves'), v: effortDist === null ? '—' : fmt(effortDist, 2) + ' m' });
        }

        return card([
          h('div', { key: 'grid' }, rows.map(function (r, i) {
            return h('div', {
              key: 'r' + i,
              style: {
                display: 'flex', justifyContent: 'space-between', gap: 10,
                padding: '5px 0',
                borderBottom: i < rows.length - 1 ? '1px solid ' + T.border : 'none'
              }
            }, [
              h('span', { key: 'k', style: { fontSize: 13, color: T.muted } }, r.k),
              h('span', {
                key: 'v',
                style: {
                  fontSize: r.hi ? 17 : 13, fontWeight: 700,
                  color: r.hi ? T.accent : T.text, fontVariantNumeric: 'tabular-nums'
                }
              }, r.v)
            ]);
          })),
          (band !== 'k2') ? h('p', {
            key: 'f',
            style: { margin: '10px 0 0', fontSize: 12, color: T.dim, fontFamily: 'ui-monospace, monospace' }
          }, bench.formula) : null
        ], 'readout');
      }

      // The one idea, restated on every bench at every level, plus the numbers
      // that prove it for the current settings.
      function tradePanel() {
        if (band === 'k2') {
          return card([
            h('p', { key: 'p', style: { margin: 0, fontSize: 14, color: T.text, lineHeight: 1.5 } },
              __alloT('stem.machinelab.k2_trade', 'A simple machine does not give you extra power. It lets you push less hard, but you have to push for longer.'))
          ], 'trade');
        }
        var eq = work && work.equal;
        return card([
          h('h4', { key: 'h', style: { margin: '0 0 6px', fontSize: 14, color: T.text } },
            __alloT('stem.machinelab.the_trade', 'The trade')),
          h('p', { key: 'p', style: { margin: '0 0 8px', fontSize: 13, color: T.muted, lineHeight: 1.5 } },
            __alloT('stem.machinelab.trade_body', 'Mechanical advantage trades distance for force. It never creates energy.')),
          (band === 'g68' || band === 'g912') && work ? h('div', {
            key: 'w',
            style: {
              display: 'flex', flexWrap: 'wrap', gap: 12, padding: 10, borderRadius: 8,
              background: T.bg, border: '1px solid ' + T.border
            }
          }, [
            h('span', { key: 'wi', style: { fontSize: 13, color: T.text } },
              __alloT('stem.machinelab.work_in', 'Work in: ') + fmt(work.workIn, 2) + ' J'),
            h('span', { key: 'wo', style: { fontSize: 13, color: T.text } },
              __alloT('stem.machinelab.work_out', 'Work out: ') + fmt(work.workOut, 2) + ' J'),
            h('span', { key: 'eqs', style: { fontSize: 13, fontWeight: 700, color: eq ? T.ok : T.bad } },
              eq ? __alloT('stem.machinelab.identical', 'identical') : __alloT('stem.machinelab.mismatch', 'mismatch'))
          ]) : null
        ], 'trade');
      }

      function proveePanel() {
        var res = d.benchResult;
        var body;

        if (isChoiceBand) {
          body = h('div', { key: 'choices', role: 'group', 'aria-label': bench.k2Question },
            bench.k2Choices.map(function (opt) {
              var picked = d.benchChoice === opt.id;
              return h('button', {
                key: opt.id,
                onClick: function () { submitChoice(opt); },
                'aria-pressed': picked ? 'true' : 'false',
                style: {
                  display: 'block', width: '100%', textAlign: 'left', marginBottom: 6,
                  padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                  border: '1px solid ' + (picked ? T.accent : T.border),
                  background: picked ? T.accent : T.card,
                  color: picked ? T.accentInk : T.text,
                  fontSize: 14, fontWeight: 600
                }
              }, opt.label);
            }));
        } else if (band === 'g35') {
          body = h('div', { key: 'g35' }, [
            h('p', { key: 'q', style: { margin: '0 0 8px', fontSize: 13, color: T.muted } },
              __alloT('stem.machinelab.g35_q', 'Work out the effort force, then check yourself. Effort = load divided by mechanical advantage.')),
            h('div', { key: 'row', style: { display: 'flex', gap: 8, flexWrap: 'wrap' } }, [
              h('input', {
                key: 'inp', type: 'text', inputMode: 'decimal',
                value: d.benchPrediction || '',
                'aria-label': __alloT('stem.machinelab.aria_predict', 'Your predicted effort force in newtons'),
                placeholder: __alloT('stem.machinelab.newtons', 'newtons'),
                onChange: function (e) { upd('benchPrediction', e.target.value); },
                onKeyDown: function (e) { if (e.key === 'Enter') submitTyped(); },
                style: {
                  flex: '1 1 120px', padding: '9px 11px', borderRadius: 8,
                  border: '1px solid ' + T.border, background: T.bg, color: T.text, fontSize: 14
                }
              }),
              h('button', {
                key: 'go', onClick: submitTyped,
                style: {
                  padding: '9px 16px', borderRadius: 8, cursor: 'pointer',
                  border: '1px solid ' + T.accent, background: T.accent,
                  color: T.accentInk, fontSize: 14, fontWeight: 700
                }
              }, __alloT('stem.machinelab.check', 'Check'))
            ])
          ]);
        } else {
          body = h('div', { key: 'typed' }, [
            h('p', { key: 'q', style: { margin: '0 0 8px', fontSize: 13, color: T.muted } },
              __alloT('stem.machinelab.typed_q', 'Predict the effort force these settings need, in newtons. Do it before you read the panel above.')),
            h('div', { key: 'row', style: { display: 'flex', gap: 8, flexWrap: 'wrap' } }, [
              h('input', {
                key: 'inp', type: 'text', inputMode: 'decimal',
                value: d.benchPrediction || '',
                'aria-label': __alloT('stem.machinelab.aria_predict', 'Your predicted effort force in newtons'),
                placeholder: __alloT('stem.machinelab.newtons', 'newtons'),
                onChange: function (e) { upd('benchPrediction', e.target.value); },
                onKeyDown: function (e) { if (e.key === 'Enter') submitTyped(); },
                style: {
                  flex: '1 1 120px', padding: '9px 11px', borderRadius: 8,
                  border: '1px solid ' + T.border, background: T.bg, color: T.text, fontSize: 14
                }
              }),
              h('button', {
                key: 'go', onClick: submitTyped,
                style: {
                  padding: '9px 16px', borderRadius: 8, cursor: 'pointer',
                  border: '1px solid ' + T.accent, background: T.accent,
                  color: T.accentInk, fontSize: 14, fontWeight: 700
                }
              }, __alloT('stem.machinelab.check', 'Check'))
            ])
          ]);
        }

        return card([
          h('h4', { key: 'h', style: { margin: '0 0 8px', fontSize: 14, color: T.text } }, [
            h('span', { key: 't' }, __alloT('stem.machinelab.prove_it', 'Prove it')),
            proven ? h('span', { key: 'p', style: { marginLeft: 8, fontSize: 12, color: T.ok, fontWeight: 700 } },
              __alloT('stem.machinelab.proven', 'proven')) : null
          ]),
          isChoiceBand ? h('p', { key: 'kq', style: { margin: '0 0 8px', fontSize: 14, color: T.text, fontWeight: 600 } }, bench.k2Question) : null,
          body,
          res ? h('p', {
            key: 'res',
            role: 'status',
            style: {
              margin: '10px 0 0', fontSize: 13, fontWeight: 700,
              color: res.ok ? T.ok : T.bad
            }
          }, res.message) : null
        ], 'prove');
      }

      // ═══════════════════════════════════════════════════════
      // P2: the trebuchet
      // ═══════════════════════════════════════════════════════

      // Everything downstream of "how is the energy stored" is shared, so the
      // three machines differ only in the store-specific fields here.
      function inputsFor(kind) {
        var base = {
          machine: kind, g: d.gravity,
          projMass: d.projMass, projDiameter: d.projDiameter,
          releaseAngle: d.releaseAngle, launchElevation: d.launchElevation,
          winchHandleR: d.winchHandleR, winchDrumR: d.winchDrumR, winchPulleys: d.winchPulleys,
          etaMech: 0.85, drag: d.drag !== false, windZ: d.windZ
        };
        if (kind === 'ballista') {
          base.bundleTurns = d.torsionTurns;
          base.armLength = d.torsionArmLength;
          base.drawLength = d.torsionDraw;
          base.armMass = d.torsionArmMass;
          base.stringMass = d.ballistaStringMass;
        } else if (kind === 'onager') {
          base.bundleTurns = d.torsionTurns;
          base.armLength = d.torsionArmLength;
          base.drawLength = d.torsionDraw;
          base.armMass = d.torsionArmMass;
          base.slingLength = d.onagerSling;
        } else {
          base.cwMass = d.cwMass;
          base.cwDrop = d.cwDrop;
          base.beamLong = d.beamLong;
          base.beamShort = d.beamShort;
          base.slingLength = d.slingLength;
          base.armMass = d.armMass;
        }
        return base;
      }

      var machineId = d.machine || 'trebuchet';
      var machineMeta = MACHINES[0];
      for (var mi = 0; mi < MACHINES.length; mi++) {
        if (MACHINES[mi].id === machineId) { machineMeta = MACHINES[mi]; break; }
      }
      var shotInputs = inputsFor(machineId);
      var preview = _machineMath.shot(shotInputs);

      // A compact, deterministic fingerprint of every control that can change
      // the range calculation. It is deliberately kept in the view layer so a
      // fired result can be compared with the live controls without serialising
      // the full physics object into state.
      function rangeConfigSig() {
        return [
          machineId, d.gravity, d.drag !== false, d.windZ, d.launchElevation,
          d.projMass, d.projDiameter, d.releaseAngle,
          d.cwMass, d.cwDrop, d.beamLong, d.beamShort, d.slingLength, d.armMass,
          d.torsionTurns, d.torsionArmLength, d.torsionDraw, d.torsionArmMass,
          d.ballistaStringMass, d.onagerSling,
          d.winchHandleR, d.winchDrumR, d.winchPulleys
        ].join('|');
      }

      function viewNav() {
        var views = [
          { id: 'machines', icon: '⚙️', label: __alloT('stem.machinelab.nav_machines', 'Machine Shop') },
          { id: 'build', icon: '🏗️', label: __alloT('stem.machinelab.nav_build', 'Build') },
          { id: 'range', icon: '🎯', label: __alloT('stem.machinelab.nav_range', 'Test Range') },
          { id: 'siege', icon: '🏰', label: __alloT('stem.machinelab.nav_siege', 'Target Wall') },
          { id: 'compare', icon: '📊', label: __alloT('stem.machinelab.nav_compare', 'Compare') },
          { id: 'learn', icon: '📖', label: __alloT('stem.machinelab.nav_learn', 'Field Manual') }
        ];
        return h('div', {
          key: 'nav', role: 'tablist',
          'aria-label': __alloT('stem.machinelab.aria_views', 'Machine Lab sections'),
          style: {
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))',
            gap: 6, marginBottom: 14, padding: 5, borderRadius: 14,
            border: '1px solid ' + T.border, background: T.card
          }
        }, views.map(function (v, viewIndex) {
          var on = (d.view || 'machines') === v.id;
          return h('button', {
            key: v.id, id: 'machinelab-tab-' + v.id, role: 'tab',
            'aria-selected': on ? 'true' : 'false',
            'aria-controls': 'machinelab-panel-' + v.id,
            tabIndex: on ? 0 : -1,
            onClick: function () { upd('view', v.id); },
            onKeyDown: function (e) {
              if (!e || (e.key !== 'ArrowRight' && e.key !== 'ArrowDown' && e.key !== 'ArrowLeft' && e.key !== 'ArrowUp')) return;
              if (e.preventDefault) e.preventDefault();
              var step = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1;
              var next = views[(viewIndex + step + views.length) % views.length];
              upd('view', next.id);
              if (typeof document !== 'undefined') {
                var node = document.getElementById('machinelab-tab-' + next.id);
                if (node && node.focus) node.focus();
              }
            },
            style: {
              minHeight: 43, padding: '7px 9px', borderRadius: 10, cursor: 'pointer',
              border: '1px solid ' + (on ? T.accent : T.border),
              background: on ? T.accent : T.card,
              color: on ? T.accentInk : T.text,
              boxShadow: on ? '0 5px 14px ' + T.accent + '33' : 'none',
              fontSize: 12, fontWeight: 750
            }
          }, [
            h('span', { key: 'i', 'aria-hidden': 'true', style: { fontSize: 15, marginRight: 5 } }, v.icon),
            h('span', { key: 'l' }, v.label),
            h('span', { key: 'n', 'aria-hidden': 'true', style: { display: 'block', marginTop: 1, fontSize: 8, opacity: 0.65, letterSpacing: 0.6 } },
              '0' + (viewIndex + 1))
          ]);
        }));
      }

      // ── The energy ledger. The tool's signature panel, and the reason the
      // machine-first design is more accessible than a debris-first one: every
      // bar has an exact table row, so a screen-reader user gets the identical
      // content rather than a summary of a picture.
      function ledger(s, key) {
        if (!s || !pos(s.crankWork)) {
          return card([
            h('p', { key: 'p', style: { margin: 0, fontSize: 13, color: T.muted } },
              __alloT('stem.machinelab.no_ledger', 'These settings do not describe a working machine yet. Adjust the sliders.'))
          ], key || 'ledger');
        }
        // Normalise against the largest quantity in the chain, not against the
        // crank work alone. A machine on a tower can deliver more energy at
        // impact than it ever stored, because the drop adds its own.
        var drop = pos(s.dropGain) ? s.dropGain : 0;
        var total = Math.max(s.crankWork, s.muzzleKE + drop, s.impactKE);
        // The ledger is where this tool teaches, and it was the last panel
        // still speaking in one register: a K-2 reader was being shown "Kinetic
        // energy at impact" in the same words as a grade 12 one. Same four
        // stages, same four numbers, restated. Only the naming changes, so the
        // table and the bars cannot drift apart. `young` is at render scope.
        var stages = [
          {
            id: 'crank',
            label: young
              ? __alloT('stem.machinelab.stage_crank_k2', 'How hard you work at the handle')
              : __alloT('stem.machinelab.stage_crank', 'Work you do at the crank'),
            j: s.crankWork, loss: null, cause: null, color: T.effort
          },
          {
            id: 'stored',
            // A ballista has no counterweight. Naming the store after the
            // trebuchet's on every machine was simply wrong on two of three.
            label: (machineId === 'ballista')
              ? (young
                ? __alloT('stem.machinelab.stage_stored_ball_k2', 'Saved up in the two twisted ropes')
                : __alloT('stem.machinelab.stage_stored_ball', 'Stored in the two twisted bundles'))
              : (machineId === 'onager')
                ? (young
                  ? __alloT('stem.machinelab.stage_stored_ona_k2', 'Saved up in the twisted rope')
                  : __alloT('stem.machinelab.stage_stored_ona', 'Stored in the twisted bundle'))
                : (young
                  ? __alloT('stem.machinelab.stage_stored_k2', 'Saved up in the lifted weight')
                  : __alloT('stem.machinelab.stage_stored', 'Stored in the raised counterweight')),
            j: s.stored, loss: s.crankWork - s.stored,
            cause: young
              ? __alloT('stem.machinelab.cause_winch_k2', 'rubbing in the handle')
              : __alloT('stem.machinelab.cause_winch', 'winch friction'),
            color: T.load
          },
          {
            id: 'muzzle',
            label: young
              ? __alloT('stem.machinelab.stage_muzzle_k2', 'Energy the stone has as it flies off')
              : __alloT('stem.machinelab.stage_muzzle', 'Kinetic energy of the stone at release'),
            j: s.muzzleKE, loss: s.stored - s.muzzleKE,
            cause: (machineId === 'ballista')
              ? (young
                ? __alloT('stem.machinelab.cause_arm_ball_k2', 'energy that stayed in the two arms and the string')
                : __alloT('stem.machinelab.cause_arm_ball', 'energy left in the two moving arms and the string'))
              : (machineId === 'onager')
                ? (young
                  ? __alloT('stem.machinelab.cause_arm_ona_k2', 'energy that stayed in the arm and the sling')
                  : __alloT('stem.machinelab.cause_arm_ona', 'energy left in the moving arm and sling'))
                : (young
                  ? __alloT('stem.machinelab.cause_arm_k2', 'energy that stayed in the arm and the weight')
                  : __alloT('stem.machinelab.cause_arm', 'energy left in the moving arm and counterweight')),
            color: T.ok
          },
          {
            id: 'impact',
            label: young
              ? __alloT('stem.machinelab.stage_impact_k2', 'Energy the stone has when it lands')
              : __alloT('stem.machinelab.stage_impact', 'Kinetic energy at impact'),
            j: s.impactKE,
            loss: pos(s.dragLoss) ? s.dragLoss : Math.max(0, s.muzzleKE - s.impactKE),
            cause: young
              ? __alloT('stem.machinelab.cause_drag_k2', 'pushing through the air')
              : __alloT('stem.machinelab.cause_drag', 'air resistance'),
            color: T.hint,
            gain: drop
          }
        ];

        function pct(j) { return (100 * j / total); }

        var bars = h('div', { key: 'bars' }, stages.map(function (st) {
          return h('div', { key: st.id, style: { marginBottom: 9 } }, [
            h('div', {
              key: 'l',
              style: { display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, color: T.muted, marginBottom: 3 }
            }, [
              h('span', { key: 'a' }, st.label),
              h('span', { key: 'b', style: { color: T.text, fontWeight: 700, fontVariantNumeric: 'tabular-nums' } },
                fmt(st.j, 0) + ' J')
            ]),
            h('div', {
              key: 'track',
              style: { height: 12, borderRadius: 6, background: T.bg, border: '1px solid ' + T.border, overflow: 'hidden' }
            }, h('div', {
              style: {
                width: Math.max(0, Math.min(100, pct(st.j))) + '%',
                height: '100%', background: st.color
              }
            })),
            st.gain > 0 ? h('div', {
              key: 'gain',
              style: { fontSize: 11, color: T.ok, marginTop: 2 }
            }, '+ ' + fmt(st.gain, 0) + ' J ' + __alloT('stem.machinelab.gained_falling', 'gained falling from the launch height')) : null,
            st.loss > 0 ? h('div', {
              key: 'loss',
              style: { fontSize: 11, color: T.dim, marginTop: 2 }
            }, '− ' + fmt(st.loss, 0) + ' J ' + __alloT('stem.machinelab.lost_to', 'lost to ') + st.cause) : null
          ]);
        }));

        var table = h('table', {
          key: 'tbl',
          style: { width: '100%', borderCollapse: 'collapse', fontSize: 12, color: T.text }
        }, [
          h('caption', { key: 'cap', style: srOnlyStyle },
            __alloT('stem.machinelab.ledger_caption', 'Energy ledger from crank to impact')),
          h('thead', { key: 'th' }, h('tr', null, [
            h('th', { key: '1', scope: 'col', style: { textAlign: 'left', padding: 4, borderBottom: '1px solid ' + T.border } }, __alloT('stem.machinelab.col_stage', 'Stage')),
            h('th', { key: '2', scope: 'col', style: { textAlign: 'right', padding: 4, borderBottom: '1px solid ' + T.border } }, __alloT('stem.machinelab.col_joules', 'Joules')),
            h('th', { key: '3', scope: 'col', style: { textAlign: 'right', padding: 4, borderBottom: '1px solid ' + T.border } }, __alloT('stem.machinelab.col_pct', '% of input')),
            h('th', { key: '4', scope: 'col', style: { textAlign: 'left', padding: 4, borderBottom: '1px solid ' + T.border } }, __alloT('stem.machinelab.col_loss', 'Lost to'))
          ])),
          h('tbody', { key: 'tb' }, stages.map(function (st) {
            return h('tr', { key: st.id }, [
              h('th', { key: '1', scope: 'row', style: { textAlign: 'left', fontWeight: 600, padding: 4, borderBottom: '1px solid ' + T.border } }, st.label),
              h('td', { key: '2', style: { textAlign: 'right', padding: 4, borderBottom: '1px solid ' + T.border, fontVariantNumeric: 'tabular-nums' } }, fmt(st.j, 0)),
              h('td', { key: '3', style: { textAlign: 'right', padding: 4, borderBottom: '1px solid ' + T.border, fontVariantNumeric: 'tabular-nums' } }, fmt(pct(st.j), 1) + '%'),
              h('td', { key: '4', style: { padding: 4, borderBottom: '1px solid ' + T.border, color: T.dim } },
                (st.gain > 0 ? ('+' + fmt(st.gain, 0) + ' J from the drop; ') : '') +
                (st.loss > 0 ? (fmt(st.loss, 0) + ' J, ' + st.cause) : (st.gain > 0 ? '' : '—')))
            ]);
          }))
        ]);

        return card([
          h('div', {
            key: 'hd',
            style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }
          }, [
            h('h4', { key: 'h', style: { margin: 0, fontSize: 14, color: T.text } },
              __alloT('stem.machinelab.energy_ledger', 'Energy ledger')),
            h('button', {
              key: 'tog',
              'aria-pressed': d.ledgerAsTable ? 'true' : 'false',
              onClick: function () { upd('ledgerAsTable', !d.ledgerAsTable); },
              style: {
                padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
                border: '1px solid ' + T.border, background: T.card, color: T.muted,
                fontSize: 11, fontWeight: 700
              }
            }, d.ledgerAsTable
              ? __alloT('stem.machinelab.show_bars', 'Show bars')
              : __alloT('stem.machinelab.show_table', 'Show table'))
          ]),
          d.ledgerAsTable ? table : bars,
          h('p', {
            key: 'eff',
            style: { margin: '8px 0 0', fontSize: 12, color: T.dim }
          }, pick({
            k2: __alloT('stem.machinelab.transfer_eff_k2', 'Out of all the energy the machine saved up, ') + fmt(100 * s.eta, 0) +
                __alloT('stem.machinelab.eff_tail_k2', ' out of every 100 parts went into the stone. The rest stayed in the machine.'),
            g35: __alloT('stem.machinelab.transfer_eff_g35', 'The stone got ') + fmt(100 * s.eta, 1) +
                 __alloT('stem.machinelab.eff_tail_g35', '% of the energy the machine had saved up. The rest stayed behind in the moving parts.'),
            g68: __alloT('stem.machinelab.transfer_eff', 'Transfer efficiency: ') + fmt(100 * s.eta, 1) + '%' +
                 __alloT('stem.machinelab.eff_tail', ' of the stored energy reached the stone.'),
            g912: __alloT('stem.machinelab.transfer_eff', 'Transfer efficiency: ') + fmt(100 * s.eta, 1) + '%' +
                  __alloT('stem.machinelab.eff_tail', ' of the stored energy reached the stone.')
          }, band)),
          // The effective mass is THE quantity behind that percentage, and the
          // g9-12 copy quotes the formula it appears in. It was computed and
          // returned by shot() and then never shown, so a student could not
          // check the arithmetic they had just been handed.
          ((band === 'g68' || band === 'g912') && pos(s.effMass)) ? h('p', {
            key: 'em',
            style: { margin: '4px 0 0', fontSize: 12, color: T.dim, lineHeight: 1.5 }
          }, __alloT('stem.machinelab.effmass_a', 'The stone is ') + fmt(d.projMass, 1) +
             __alloT('stem.machinelab.effmass_b', ' kg, and the moving parts of the machine add another ') +
             fmt(s.effMass, 1) +
             __alloT('stem.machinelab.effmass_c', ' kg of effective mass, so the stone gets ') +
             fmt(d.projMass, 1) + ' ÷ (' + fmt(d.projMass, 1) + ' + ' + fmt(s.effMass, 1) + ') = ' +
             fmt(100 * s.eta, 1) + '%.') : null,
          // Bars alone are a picture. The table is always reachable, and the
          // numbers are announced regardless of which view is on screen.
          !d.ledgerAsTable ? h('div', { key: 'srtbl', style: srOnlyStyle }, table) : null
        ], key || 'ledger');
      }

      // Crosswind. The integrator has always modelled it and the wall damage has
      // always used lateral drift to decide which column is struck, but nothing
      // could change it, so it sat at zero forever. The siege view was already
      // telling students "check the wind" about a control that did not exist.
      function windControl() {
        return h('div', { key: 'wind' }, [
          slider({
            key: 'windZ',
            label: __alloT('stem.machinelab.wind', 'Crosswind'),
            min: -20, max: 20, step: 1, unit: 'm/s'
          }),
          h('p', { key: 'n', style: { margin: '2px 0 0', fontSize: 12, color: T.dim, lineHeight: 1.45 } },
            pick({
              k2: __alloT('stem.machinelab.wind_k2', 'Wind pushes the stone sideways while it flies.'),
              g35: __alloT('stem.machinelab.wind_g35', 'A crosswind blows the stone off to one side. The longer it is in the air, the further it drifts.'),
              g68: __alloT('stem.machinelab.wind_g68', 'Drag acts on the stone’s speed THROUGH THE AIR, not over the ground, so a crosswind pushes it sideways for the whole flight. Slow, light stones drift most.'),
              g912: __alloT('stem.machinelab.wind_g912', 'The drag term uses velocity relative to the air mass, so a steady crosswind produces lateral acceleration until the stone matches the air sideways. Drift therefore grows with flight time and falls as the ballistic coefficient rises.')
            }, band))
        ]);
      }

      function trajectoryGraph(s) {
        if (!s || !s.path || s.path.length < 2) return null;
        var W = 340, H = 150, pad = 26;

        // Past shots drawn behind the current one. This is the whole point of
        // the light-stone / heavy-stone lesson: a table of ranges states the
        // trade-off, but two arcs side by side SHOW it.
        var past = (d.showOverlay === false) ? []
          : (d.shotHistory || []).slice(0, -1).filter(function (r) { return r.path && r.path.length > 1; }).slice(-4);

        // Scale to fit EVERY trace, or the older, longer shots run off the edge.
        var maxX = 0, maxY = 0;
        function grow(pts) {
          pts.forEach(function (p) {
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
          });
        }
        grow(s.path);
        past.forEach(function (r) { grow(r.path); });
        if (maxX <= 0) maxX = 1;
        if (maxY <= 0) maxY = 1;

        var sx = (W - pad * 2) / maxX, sy = (H - pad * 2) / maxY;
        function toPts(pts) {
          return pts.map(function (p) {
            return (pad + p.x * sx).toFixed(1) + ',' + (H - pad - p.y * sy).toFixed(1);
          }).join(' ');
        }

        return h('svg', {
          viewBox: '0 0 ' + W + ' ' + H,
          style: { width: '100%', height: 'auto', display: 'block' },
          focusable: 'false', 'aria-hidden': 'true'
        }, [
          h('line', { key: 'gnd', x1: pad, y1: H - pad, x2: W - pad, y2: H - pad, stroke: T.ground, strokeWidth: 2 })
        ].concat(past.map(function (r, i) {
          return h('polyline', {
            key: 'p' + i, points: toPts(r.path), fill: 'none',
            stroke: T.dim, strokeWidth: 1.5, strokeDasharray: '3 3',
            opacity: 0.4 + 0.12 * i, strokeLinejoin: 'round'
          });
        })).concat([
          h('polyline', { key: 'traj', points: toPts(s.path), fill: 'none', stroke: T.effort, strokeWidth: 2.5, strokeLinejoin: 'round' }),
          h('circle', { key: 'end', cx: pad + (s.path[s.path.length - 1].x) * sx, cy: H - pad, r: 4, fill: T.bad }),
          h('text', { key: 'r', x: W - pad, y: H - pad + 16, fill: T.dim, fontSize: 11, textAnchor: 'end' }, fmt(s.range, 0) + ' m'),
          h('text', { key: 'a', x: pad, y: pad - 8, fill: T.dim, fontSize: 11 }, __alloT('stem.machinelab.apex_label', 'apex ') + fmt(s.apex, 0) + ' m')
        ]));
      }

      function fire() {
        if (d.animating) return;
        if (!preview) {
          updMulti({ rangeResult: { ok: false, message: __alloT('stem.machinelab.bad_machine', 'This machine cannot fire. Check the sliders.') } });
          return;
        }
        var guess = _machineMath.parseNum(d.rangePrediction);
        var result = null;
        if (guess !== null) {
          var ok = _machineMath.withinTolerance(guess, preview.range, 0.10);
          result = {
            ok: ok,
            message: ok
              ? __alloT('stem.machinelab.range_hit', 'Within 10%. It flew ') + fmt(preview.range, 1) + ' m.'
              : __alloT('stem.machinelab.range_miss', 'It flew ') + fmt(preview.range, 1) + ' m.'
          };
        }
        var nextId = (d.shotId || 0) + 1;
        var hist = (d.shotHistory || []).slice(-7);
        // The diameter rides along because without it a logged shot's density
        // cannot be recovered afterwards, and the work record then reports a
        // furthest throw with no way to know it was made by an object that
        // could not exist. Rows saved before this carry no projDiameter, so
        // anything reading it must tolerate undefined.
        hist.push({
          range: preview.range, projMass: d.projMass, projDiameter: d.projDiameter,
          muzzleV: preview.muzzleV, eta: preview.eta,
          path: compactPath(preview.path)
        });
        var fired = (d.machinesFired || []).slice();
        if (fired.indexOf(machineId) === -1) fired.push(machineId);
        updMulti({
          lastShot: preview,
          lastShotSig: rangeConfigSig(),
          shotId: nextId,
          animating: true,
          shotHistory: hist,
          machinesFired: fired,
          rangeResult: result,
          rangeStreak: (guess !== null && result && result.ok) ? (d.rangeStreak || 0) + 1 : 0
        });
        if (guess !== null && result && result.ok) { awardStemXP(20); }
        announceToSR(__alloT('stem.machinelab.sr_fired', 'Fired. Range ') + fmt(preview.range, 1) +
          __alloT('stem.machinelab.sr_metres', ' metres, impact energy ') + fmt(preview.impactKE, 0) + ' joules.');
        // One state flip, not a per-frame render: the 3D loop is only allowed to
        // run live for the length of the swing.
        if (typeof setTimeout === 'function') {
          setTimeout(function () { upd('animating', false); }, 1800);
        }
      }

      // ── Build view ──
      // Every key spelled out in full. Building keys by concatenation
      // ('...machine_' + id) makes them invisible to a translator grepping the
      // source for stem.machinelab.* keys, so the strings silently never get
      // into a language pack.
      function machineLabel(id) {
        if (id === 'ballista') return __alloT('stem.machinelab.machine_ballista', 'Ballista');
        if (id === 'onager') return __alloT('stem.machinelab.machine_onager', 'Onager');
        return __alloT('stem.machinelab.machine_trebuchet', 'Trebuchet');
      }

      function machinePicker() {
        return h('div', {
          key: 'mpick', role: 'group',
          'aria-label': __alloT('stem.machinelab.aria_machine', 'Choose a machine'),
          style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }
        }, MACHINES.map(function (mm) {
          var on = mm.id === machineId;
          return h('button', {
            key: mm.id, 'aria-pressed': on ? 'true' : 'false',
            onClick: function () {
              // Switching engines is a clean reset: do not let an in-flight
              // shot from the previous machine continue through the new model,
              // and do not carry a close-up framing onto a differently sized
              // engine.
              updMulti({
                machine: mm.id, lastShot: null, lastShotSig: '', rangeResult: null, animating: false,
                machineRotY: MACHINE_HOME.rotY, machineRotX: MACHINE_HOME.rotX, machineZoom: MACHINE_HOME.zoom
              });
              announceToSR(__alloT('stem.machinelab.machine_switched', 'Showing ') + machineLabel(mm.id) +
                __alloT('stem.machinelab.machine_switched_camera', '. Camera reset to the overview.'));
            },
            style: {
              padding: '7px 13px', borderRadius: 999, cursor: 'pointer',
              border: '1px solid ' + (on ? T.accent : T.border),
              background: on ? T.accent : T.card,
              color: on ? T.accentInk : T.text, fontSize: 13, fontWeight: 700
            }
          }, mm.icon + ' ' + machineLabel(mm.id));
        }));
      }

      function machineControls() {
        if (machineId === 'ballista' || machineId === 'onager') {
          var shared = [
            { key: 'torsionTurns', label: __alloT('stem.machinelab.turns', 'Turns of twist in the bundle'), min: 1, max: 30, step: 1, unit: '' },
            { key: 'torsionArmLength', label: __alloT('stem.machinelab.arm_len', 'Arm length'), min: 0.4, max: 3, step: 0.05, unit: 'm' },
            { key: 'torsionDraw', label: __alloT('stem.machinelab.draw', 'Draw length'), min: 0.1, max: 2.5, step: 0.05, unit: 'm' },
            { key: 'torsionArmMass', label: __alloT('stem.machinelab.arm_mass2', 'Arm mass'), min: 1, max: 60, step: 1, unit: 'kg' }
          ];
          if (machineId === 'ballista') {
            shared.push({ key: 'ballistaStringMass', label: __alloT('stem.machinelab.string_mass', 'String mass'), min: 0.05, max: 3, step: 0.05, unit: 'kg' });
          } else {
            shared.push({ key: 'onagerSling', label: __alloT('stem.machinelab.onager_sling', 'Sling length'), min: 0, max: 2.5, step: 0.1, unit: 'm' });
          }
          shared.push({ key: 'projMass', label: __alloT('stem.machinelab.proj_mass', 'Stone mass'), min: 0.2, max: 120, step: 0.2, unit: 'kg' });
          shared.push({ key: 'projDiameter', label: __alloT('stem.machinelab.proj_dia', 'Stone diameter'), min: 0.03, max: 0.6, step: 0.01, unit: 'm' });
          shared.push({ key: 'releaseAngle', label: __alloT('stem.machinelab.release_angle', 'Release angle'), min: 15, max: 75, step: 1, unit: '°' });
          return shared;
        }
        return [
          { key: 'cwMass', label: __alloT('stem.machinelab.cw_mass', 'Counterweight mass'), min: 100, max: 4000, step: 50, unit: 'kg' },
          { key: 'cwDrop', label: __alloT('stem.machinelab.cw_drop', 'Counterweight drop'), min: 0.5, max: 8, step: 0.1, unit: 'm' },
          { key: 'beamLong', label: __alloT('stem.machinelab.beam_long', 'Long arm'), min: 1, max: 8, step: 0.1, unit: 'm' },
          { key: 'beamShort', label: __alloT('stem.machinelab.beam_short', 'Short arm'), min: 0.3, max: 3, step: 0.1, unit: 'm' },
          { key: 'slingLength', label: __alloT('stem.machinelab.sling', 'Sling length'), min: 0, max: 4, step: 0.1, unit: 'm' },
          { key: 'armMass', label: __alloT('stem.machinelab.arm_mass', 'Beam mass'), min: 5, max: 300, step: 5, unit: 'kg' },
          { key: 'projMass', label: __alloT('stem.machinelab.proj_mass', 'Stone mass'), min: 1, max: 300, step: 1, unit: 'kg' },
          { key: 'projDiameter', label: __alloT('stem.machinelab.proj_dia', 'Stone diameter'), min: 0.05, max: 0.8, step: 0.01, unit: 'm' },
          { key: 'releaseAngle', label: __alloT('stem.machinelab.release_angle', 'Release angle'), min: 15, max: 75, step: 1, unit: '°' }
        ];
      }

      var MACHINE_COPY = {
        trebuchet: {
          k2: __alloT('stem.machinelab.build_k2', 'A big weight falls down, and the long arm throws the stone up and away. A heavier weight falling further throws harder.'),
          g35: __alloT('stem.machinelab.build_g35', 'Lifting the counterweight stores energy. Letting it fall spends that energy on the stone. The long arm is a lever, so the stone end moves much faster than the weight end.'),
          g68: __alloT('stem.machinelab.build_g68', 'Stored energy is M g h, set entirely by the counterweight and how far it drops. The arm is a lever, so the stone travels a longer arc in the same time and therefore moves faster.'),
          g912: __alloT('stem.machinelab.build_g912', 'This is a single-degree-of-freedom energy model: E = Mgh into the system, shared between the stone and the effective mass of the arm and counterweight referred to the payload radius. A real trebuchet is a double pendulum whose sling release this model does not resolve, so treat the numbers as the right trade-off rather than a design specification.')
        },
        ballista: {
          k2: __alloT('stem.machinelab.ball_k2', 'Two thick ropes are twisted up tight. When you let go, they untwist and snap the arms forward. It works like a very strong rubber band.'),
          g35: __alloT('stem.machinelab.ball_g35', 'Twisting the rope bundles stores energy, the way winding a rubber band does. More turns store more energy. Pulling the string back further stores more still.'),
          g68: __alloT('stem.machinelab.ball_g68', 'Each bundle is a torsional spring: E = one half k times the twist angle squared, and there are two of them. Stiffness k rises the more turns you wind in, so both the winding and the draw length matter. Two bundles store twice the energy, but there are also two arms to get moving, and that costs efficiency.'),
          g912: __alloT('stem.machinelab.ball_g912', 'Modelled as a linear torsional spring, E = n(1/2)k(theta)^2 with k rising linearly in the winding. Real twisted sinew is markedly nonlinear and hysteretic, loses energy internally on every shot, and changes behaviour with humidity, which is one reason surviving ancient design rules proportion the whole engine from the spring-hole diameter rather than from a stiffness figure.')
        },
        onager: {
          k2: __alloT('stem.machinelab.ona_k2', 'One arm is held by a twisted rope. It swings up fast and bangs into a padded stop, and the stone keeps going.'),
          g35: __alloT('stem.machinelab.ona_g35', 'An onager has one arm instead of two. All the twisted rope pushes that single arm, and a sling on the end adds extra reach and speed.'),
          g68: __alloT('stem.machinelab.ona_g68', 'One bundle, one arm. At the same winding it stores half what a two-bundle ballista does, but it only has to accelerate one arm instead of two, so a larger share of that smaller store reaches the stone. Adding a sling lengthens the payload radius and improves the share again. Store and efficiency are two separate things, and this machine trades one for the other.'),
          g912: __alloT('stem.machinelab.ona_g912', 'Halving the store while halving the arm inertia is not a wash, because efficiency depends on the RATIO m_p/(m_p + m_eff) rather than on either quantity alone. In this model the onager typically shows a higher transfer efficiency than a ballista with the same arm mass, and a lower stored energy, so which one throws further depends on the stone. Lengthening the sling raises the payload radius and lowers the reduced arm inertia, which is the same lever argument the trebuchet makes.')
        }
      };

      // ── Camera controls ──
      //
      // Every 3D bay here was frozen dead-on and adjustable by nobody: the
      // viewer takes rotY/rotX/zoom from each push, this tool never sent them,
      // so the configured 3/4 angle was discarded on the first frame and there
      // was no way for a user to look around at all. These are real buttons and
      // real arrow keys, so the camera is reachable without a mouse.
      function camFor(which) {
        var home = (which === 'wall') ? WALL_HOME : (which === 'shop' ? SHOP_HOME : (which === 'range' ? RANGE_HOME : MACHINE_HOME));
        var k = (which === 'wall')
          ? { y: 'wallRotY', x: 'wallRotX', z: 'wallZoom' }
          : (which === 'shop'
            ? { y: 'shopRotY', x: 'shopRotX', z: 'shopZoom' }
            : (which === 'range'
              ? { y: 'rangeRotY', x: 'rangeRotX', z: 'rangeZoom' }
              : { y: 'machineRotY', x: 'machineRotX', z: 'machineZoom' }));
        var yaw = finite(d[k.y]) ? d[k.y] : home.rotY;
        var pitch = finite(d[k.x]) ? d[k.x] : home.rotX;
        var zoom = pos(d[k.z]) ? d[k.z] : home.zoom;
        function set(ny, nx, nz) {
          // Keep the local camera cursor in step with the patch. A row of
          // arrow/zoom clicks can arrive before React renders the next state;
          // using only the values captured above would make every click jump
          // from the original view instead of continuing the exploration.
          yaw = ((ny % 360) + 360) % 360;
          pitch = Math.max(-70, Math.min(78, nx));
          zoom = Math.max(0.5, Math.min(2.6, nz));
          var patch = {};
          patch[k.y] = yaw;
          patch[k.x] = pitch;   // never fully under or over
          patch[k.z] = zoom;
          updMulti(patch);
        }
        return {
          rotY: yaw, rotX: pitch, zoom: zoom,
          nudge: function (dy, dx) { set(yaw + dy, pitch + dx, zoom); },
          zoomBy: function (f) { set(yaw, pitch, zoom * f); },
          setView: function (ny, nx, nz) { set(ny, nx, nz); },
          reset: function () { set(home.rotY, home.rotX, home.zoom); }
        };
      }

      // makeOrbitViewer redraws ONLY when push() is called: a bay with
      // static:true parks its loop, and every bay here parks when idle. Going
      // full screen changes the element's size but nothing tells the viewer, so
      // without a nudge the canvas stretches to the new box while the drawing
      // buffer stays at the old one and the camera keeps the old aspect. The
      // result is a blurry, distorted scene. Bumping glTick re-renders, which
      // pushes, which marks the scene dirty and wakes the loop; the loop then
      // sees the size change and calls setSize itself.
      //
      // Twice, deliberately. CSS fill-frame mode resizes synchronously, so the
      // first bump is enough. Real OS full screen resizes AFTER its promise
      // settles, so that one needs the follow-up.
      function toggleFullscreen(which) {
        var el = FS_HOSTS[which];
        if (!el || typeof window === 'undefined' || typeof window.__alloStemFS !== 'function') {
          addToast(__alloT('stem.machinelab.fs_unavailable', 'Full screen is not available here.'));
          return;
        }
        try { window.__alloStemFS(el); } catch (e) {}
        bumpGl();
        try { setTimeout(bumpGl, 350); } catch (e) {}
        announceToSR(__alloT('stem.machinelab.fs_toggled', 'Full screen toggled. Press Escape to leave full screen.'));
      }

      // The label stays neutral on purpose. Escape exits full screen without
      // going through this handler, so a label that read "Exit full screen"
      // would be wrong from then on with nothing to correct it.
      function fullscreenButton(which, what) {
        return h('button', {
          key: 'fs',
          type: 'button',
          onClick: function () { toggleFullscreen(which); },
          title: __alloT('stem.machinelab.fs_title', 'Full screen (press Escape to leave)'),
          'aria-label': __alloT('stem.machinelab.fs_aria', 'Toggle full screen for the ') + what +
            __alloT('stem.machinelab.fs_aria2', '. Press Escape to leave full screen.'),
          style: {
            padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
            border: '1px solid ' + T.border, background: T.card, color: T.text,
            fontSize: 12, fontWeight: 700, marginLeft: 'auto'
          }
        }, '⛶ ' + __alloT('stem.machinelab.fs_label', 'Full screen'));
      }

      function camControls(cam, label, fsWhich) {
        function btn(key, glyph, aria, fn) {
          return h('button', {
            key: key,
            onClick: function () {
              fn();
              announceToSR(aria + '.');
            },
            'aria-label': aria, title: aria,
            style: {
              padding: '3px 8px', borderRadius: 7, cursor: 'pointer',
              border: '1px solid ' + T.border, background: T.card, color: T.text,
              fontSize: 12, fontWeight: 700, lineHeight: 1.4
            }
          }, glyph);
        }
        return h('div', {
          key: 'cam', role: 'group',
          'aria-label': __alloT('stem.machinelab.cam_group', 'Camera for the ') + label,
          // The background is not decoration. In full screen the host forces
          // #0f172a onto the wrapper with !important, so without a surface of
          // its own this row sits on dark navy in every theme and the "View:"
          // label goes grey-on-navy. Painting the row means it carries its own
          // contrast wherever it ends up. Outside full screen it is T.card on
          // T.card, so nothing changes.
          style: {
            display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center',
            marginTop: 8, background: T.card, borderRadius: 8, padding: '4px 6px'
          }
        }, [
          h('span', { key: 'l', style: { fontSize: 11, color: T.dim, marginRight: 2 } },
            __alloT('stem.machinelab.cam_drag_hint', 'Drag scene or use:')),
          fsWhich === 'shop' ? btn('side', __alloT('stem.machinelab.cam_side_short', 'Side'),
            __alloT('stem.machinelab.cam_side', 'Show the machine from the side'),
            function () { cam.setView(0, 8, 1.08); }) : null,
          fsWhich === 'shop' ? btn('close', __alloT('stem.machinelab.cam_close_short', 'Close'),
            __alloT('stem.machinelab.cam_close', 'Show a close three-quarter view'),
            function () { cam.setView(24, 12, 1.38); }) : null,
          fsWhich === 'range' ? btn('launch', __alloT('stem.machinelab.cam_launch_short', 'Launch'),
            __alloT('stem.machinelab.cam_launch', 'Focus the launch deck'),
            function () { cam.setView(48, 16, 1.18); }) : null,
          fsWhich === 'range' ? btn('arc', __alloT('stem.machinelab.cam_arc_short', 'Arc'),
            __alloT('stem.machinelab.cam_arc', 'Frame the full flight arc'),
            function () { cam.setView(76, 27, 1.02); }) : null,
          fsWhich === 'range' ? btn('impact', __alloT('stem.machinelab.cam_impact_short', 'Impact'),
            __alloT('stem.machinelab.cam_impact', 'Focus the impact end of the lane'),
            function () { cam.setView(112, 12, 1.2); }) : null,
          btn('yl', '◀', __alloT('stem.machinelab.cam_left', 'Turn left'), function () { cam.nudge(-15, 0); }),
          btn('yr', '▶', __alloT('stem.machinelab.cam_right', 'Turn right'), function () { cam.nudge(15, 0); }),
          btn('xu', '▲', __alloT('stem.machinelab.cam_up', 'Tilt up'), function () { cam.nudge(0, -10); }),
          btn('xd', '▼', __alloT('stem.machinelab.cam_down', 'Tilt down'), function () { cam.nudge(0, 10); }),
          btn('zi', '+', __alloT('stem.machinelab.cam_in', 'Zoom in'), function () { cam.zoomBy(1.25); }),
          btn('zo', '−', __alloT('stem.machinelab.cam_out', 'Zoom out'), function () { cam.zoomBy(0.8); }),
          btn('rs', '⟲', __alloT('stem.machinelab.cam_reset', 'Reset the view'), function () { cam.reset(); }),
          // Full screen is a view control, and this row is the one thing that
          // is guaranteed to travel into full screen alongside the bay.
          fsWhich ? fullscreenButton(fsWhich, label) : null
        ]);
      }

      // ── Read aloud ──
      //
      // This tool is mostly prose: six bench explanations, three machine
      // explanations, and a Field Manual. A student who cannot read it fluently
      // got none of it, which is a poor showing for a UDL tool. `force: true`
      // is correct here because the button IS the explicit user action the
      // header mute gate is meant to defer to.
      function speak(text) {
        if (typeof ctx.callTTS !== 'function' || !text) return;
        try {
          Promise.resolve(ctx.callTTS(String(text), null, 1.0, { force: true })).catch(function () {});
        } catch (e) { /* a tool must not fall over because audio did */ }
      }

      function readAloud(text, key) {
        if (typeof ctx.callTTS !== 'function' || !text) return null;   // older host, or no voice
        return h('button', {
          key: key || 'tts',
          onClick: function () { speak(text); },
          title: __alloT('stem.machinelab.read_aloud', 'Read aloud'),
          'aria-label': __alloT('stem.machinelab.read_aloud', 'Read aloud'),
          style: {
            marginLeft: 8, padding: '2px 7px', borderRadius: 7, cursor: 'pointer',
            border: '1px solid ' + T.border, background: T.card, color: T.text,
            fontSize: 12, lineHeight: 1.4, verticalAlign: 'middle'
          }
        }, '🔊');
      }

      // Mass and diameter are independent sliders, so a student can build a 1 kg
      // boulder or a 300 kg orange without noticing. Drag depends on frontal
      // area and inertia on mass, so an impossible density silently decides
      // every range comparison. Naming it turns a hidden trap into a lesson.
      // Density in kg per cubic metre is a grade 6 idea and this tool serves
      // K-2 upward, so the same fact is restated rather than filtered out. For
      // the younger bands it is put as a weight a child can picture: a real
      // stone this big would weigh about this much, and yours does not.
      function stoneFacts() {
        var rho = _machineMath.density(d.projMass, d.projDiameter);
        if (rho === null) return null;
        return {
          rho: rho,
          note: _machineMath.densityNote(rho),
          odd: rho < 1400 || rho > 4200,          // not a rock by any reading
          real: _machineMath.massFor(d.projDiameter, GRANITE),
          heavy: rho > 4200
        };
      }

      function stonePanel() {
        var f = stoneFacts();
        if (!f) return null;
        var realTxt = fmt(f.real, f.real < 10 ? 1 : 0);
        var yoursTxt = fmt(d.projMass, d.projMass < 10 ? 1 : 0);
        var line = pick({
          k2: __alloT('stem.machinelab.stone_k2', 'A real stone this big would weigh about ') + realTxt +
              __alloT('stem.machinelab.stone_k2b', ' kg. Yours weighs ') + yoursTxt + ' kg.',
          g35: __alloT('stem.machinelab.stone_g35', 'A rock that size would weigh about ') + realTxt +
               __alloT('stem.machinelab.stone_g35b', ' kg. Yours weighs ') + yoursTxt +
               __alloT('stem.machinelab.stone_g35c', ' kg, so it is ') + f.note + '.',
          g68: __alloT('stem.machinelab.stone_density', 'That stone works out at ') +
               fmt(f.rho, 0) + __alloT('stem.machinelab.stone_density2', ' kg per cubic metre, ') + f.note + '.',
          g912: __alloT('stem.machinelab.stone_density', 'That stone works out at ') +
                fmt(f.rho, 0) + __alloT('stem.machinelab.stone_density2', ' kg per cubic metre, ') + f.note +
                __alloT('stem.machinelab.stone_g912', '. Granite is about 2700, so a rock this size would be ') +
                realTxt + ' kg.'
        }, band);
        var warn = pick({
          k2: f.heavy
            ? __alloT('stem.machinelab.stone_odd_k2h', 'That is far too heavy for a stone that size. Nothing is that heavy. Try a bigger stone, or a lighter one.')
            : __alloT('stem.machinelab.stone_odd_k2', 'That is far too light for a stone that size. A rock that big could not float away. Try a heavier stone, or a smaller one.'),
          g35: __alloT('stem.machinelab.stone_odd_g35', 'No rock weighs that for its size. The two sliders move on their own, so it is easy to build a stone that could not really exist. If the stone is not real, the throw will not be real either.'),
          g68: __alloT('stem.machinelab.stone_odd', 'No rock is that. Mass and size are separate sliders here, so it is easy to build something that could not exist. Air resistance depends on how big it is and inertia on how heavy, so an impossible stone will give you an impossible range.'),
          g912: __alloT('stem.machinelab.stone_odd_g912', 'No rock has that density. Because mass and diameter are set independently here, the two quantities drag depends on, frontal area and inertia, can be varied against each other in ways no material allows. Any range you read off an impossible object tells you about the model, not about a machine.')
        }, band);
        return h('div', {
          key: 'stone',
          style: {
            marginTop: 6, padding: '7px 9px', borderRadius: 8,
            background: T.bg, border: '1px solid ' + (f.odd ? T.warn : T.border)
          }
        }, [
          h('div', { key: 'a', style: { fontSize: 12, color: T.text } }, line),
          f.odd ? h('div', { key: 'b', style: { fontSize: 12, color: T.warn, marginTop: 3, lineHeight: 1.45 } },
            warn) : null
        ]);
      }

      // The two stone sliders live in Build, but every other view spends their
      // numbers: the Test Range scores a prediction against them and the Target
      // Wall works out damage from them. A warning that only appears where the
      // value is set is a warning you can walk away from, so the views that
      // consume an impossible stone say so too, briefly, and point back.
      function oddStoneNote(key) {
        var f = stoneFacts();
        if (!f || !f.odd) return null;
        var sizeTxt = fmt(d.projMass, d.projMass < 10 ? 1 : 0) +
          __alloT('stem.machinelab.stone_odd_short2', ' kg and ') + fmt(d.projDiameter, 2) +
          __alloT('stem.machinelab.stone_odd_short2b', ' m across');
        var body = pick({
          k2: __alloT('stem.machinelab.stone_odd_short_k2', 'Your stone is ') + sizeTxt +
              __alloT('stem.machinelab.stone_odd_short_k2b', '. A real stone that big would weigh about ') +
              fmt(f.real, f.real < 10 ? 1 : 0) +
              __alloT('stem.machinelab.stone_odd_short_k2c', ' kg, so this one is not really a stone. You can change it in Build.'),
          g35: __alloT('stem.machinelab.stone_odd_short_k2', 'Your stone is ') + sizeTxt +
               __alloT('stem.machinelab.stone_odd_short_g35', '. No rock weighs that for its size, so these numbers describe something that could not really exist. The two sliders are in Build.'),
          g68: __alloT('stem.machinelab.stone_odd_short', 'Your stone is ') + sizeTxt +
               __alloT('stem.machinelab.stone_odd_short3', ', which works out at ') + fmt(f.rho, 0) +
               __alloT('stem.machinelab.stone_odd_short4', ' kg per cubic metre. No rock is that, so treat these numbers as a story about an object that could not exist. The two sliders are in Build.'),
          g912: __alloT('stem.machinelab.stone_odd_short', 'Your stone is ') + sizeTxt +
                __alloT('stem.machinelab.stone_odd_short3', ', which works out at ') + fmt(f.rho, 0) +
                __alloT('stem.machinelab.stone_odd_short_g912', ' kg per cubic metre. No rock is that, so every figure below is conditioned on an object no material could form. The two sliders are in Build.')
        }, band);
        return h('div', {
          key: key,
          role: 'status',
          style: {
            marginBottom: 10, padding: '8px 10px', borderRadius: 8,
            background: T.bg, border: '1px solid ' + T.warn,
            fontSize: 12, color: T.warn, lineHeight: 1.5
          }
        }, body);
      }

      // ── Saving a design ──
      //
      // The host already renders a Tool Snapshots panel and a Load button for
      // whatever a tool saves, so this only has to save a good payload and a
      // label worth reading in a list. The payload is the DESIGN (machine,
      // its controls, the conditions) and deliberately not the transient shot,
      // wall or tutor state: restoring should hand back a machine, not replay
      // somebody's half-finished siege.
      function designPayload() {
        var keep = [
          'machine', 'projMass', 'projDiameter', 'releaseAngle', 'launchElevation',
          'winchHandleR', 'winchDrumR', 'winchPulleys', 'gravity', 'drag', 'windZ',
          'cwMass', 'cwDrop', 'beamLong', 'beamShort', 'slingLength', 'armMass',
          'torsionTurns', 'torsionArmLength', 'torsionDraw', 'torsionArmMass',
          'ballistaStringMass', 'onagerSling'
        ];
        var out = { view: 'build' };
        keep.forEach(function (k) { if (d[k] !== undefined) out[k] = d[k]; });
        return out;
      }

      function saveDesign() {
        if (typeof ctx.saveSnapshot !== 'function') {
          addToast(__alloT('stem.machinelab.save_unavailable', 'Saving is not available here.'));
          return;
        }
        var label = machineLabel(machineId) + ' · ' +
          (preview ? fmt(preview.range, 0) + ' m · ' + fmt(100 * preview.eta, 0) + '%'
                   : __alloT('stem.machinelab.save_nofire', 'not firing'));
        try {
          ctx.saveSnapshot('machineLab', label, designPayload());
          addToast('📸 ' + __alloT('stem.machinelab.saved', 'Design saved: ') + label);
          announceToSR(__alloT('stem.machinelab.sr_saved', 'Design saved as ') + label);
        } catch (e) {
          addToast(__alloT('stem.machinelab.save_failed', 'That design could not be saved.'));
        }
      }

      // ── The link the whole tool rests on ──
      //
      // The Field Manual asserts that every siege engine is built out of the
      // six benches, and until now that was the only place it was said. This
      // names the parts of the machine ON SCREEN as the machines they are, with
      // their live mechanical advantage where the tool actually models it, and
      // a way back to the bench that teaches it.
      function partsOf(kind) {
        var winchMA = _machineMath.windlassMA(d.winchHandleR, d.winchDrumR);
        var tackle = _machineMath.pulleyMA(d.winchPulleys);
        var torsion = (kind === 'ballista' || kind === 'onager');

        // Details per bench for THIS machine. Membership and order come from
        // MACHINE_BENCHES, so the Build panel and the Machine Shop panel can
        // never disagree about what a given engine is made of.
        var detail = {
          lever: {
            icon: '⚖️',
            part: torsion
              ? (kind === 'ballista'
                  ? __alloT('stem.machinelab.part_arms', 'the two spring arms')
                  : __alloT('stem.machinelab.part_arm', 'the throwing arm'))
              : __alloT('stem.machinelab.part_beam', 'the throwing beam'),
            value: torsion ? null : _machineMath.leverMA(d.beamLong, d.beamShort),
            unit: '×',
            note: torsion
              ? (young
                ? __alloT('stem.machinelab.part_arm_n_k2', 'each arm is a lever. The rope twists it back a little way, and the arm swings the stone a long way, fast')
                : __alloT('stem.machinelab.part_arm_n', 'each arm is a lever turning about its bundle, trading a short powerful twist for a long fast sweep'))
              : (young
                ? __alloT('stem.machinelab.part_beam_n_k2', 'the long end of the beam moves much further than the short end does, so the stone ends up going much faster than the weight')
                : __alloT('stem.machinelab.part_beam_n', 'long arm ÷ short arm, so the stone end travels that many times further than the counterweight end'))
          },
          windlass: {
            icon: '🎡',
            part: __alloT('stem.machinelab.part_winch', 'the winch drum and handle'),
            value: winchMA, unit: '×',
            note: young
              ? __alloT('stem.machinelab.part_winch_n_k2', 'your hand goes round a big circle and the drum only goes round a small one, so one person can pull back a machine this big')
              : __alloT('stem.machinelab.part_winch_n', 'a big handle circle turning a small drum, which is why one person can cock the machine')
          },
          pulley: {
            icon: '⛓️',
            part: __alloT('stem.machinelab.part_tackle', 'the cocking tackle'),
            value: tackle, unit: '×',
            note: young
              ? __alloT('stem.machinelab.part_tackle_n_k2', 'each extra loop of rope makes the pull half as hard, but you have twice as much rope to pull in')
              : __alloT('stem.machinelab.part_tackle_n', 'every extra rope segment halves the pull again and doubles the rope to haul in')
          },
          wedge: {
            icon: '🪓',
            part: (kind === 'onager')
              ? __alloT('stem.machinelab.part_stop', 'the trigger and the padded stop')
              : __alloT('stem.machinelab.part_trigger', 'the trigger and the ratchet pawl'),
            value: null, unit: '',
            note: young
              ? __alloT('stem.machinelab.part_trigger_n_k2', 'a tiny wedge holds back a huge pull, and lets go the moment you want it to')
              : __alloT('stem.machinelab.part_trigger_n', 'a small wedge holding an enormous force, and releasing it the instant you want it gone')
          },
          screw: {
            icon: '🔩',
            part: __alloT('stem.machinelab.part_screw', 'the bundle tensioning gear'),
            value: null, unit: '',
            note: young
              ? __alloT('stem.machinelab.part_screw_n_k2', 'small turns of a screw against a very big pull, which is how you tighten the ropes just right')
              : __alloT('stem.machinelab.part_screw_n', 'tiny turns against a huge load, which is how the springs are tuned at all')
          },
          ramp: {
            icon: '📐',
            part: __alloT('stem.machinelab.part_ramp', 'the loading ramp'),
            value: null, unit: '',
            note: young
              ? __alloT('stem.machinelab.part_ramp_n_k2', 'rolling the stone up a slope instead of lifting it straight up, which is the only way people could move it')
              : __alloT('stem.machinelab.part_ramp_n', 'rolling a stone up a slope instead of lifting it, which is the only way a crew moves it at all')
          }
        };

        return (MACHINE_BENCHES[kind] || MACHINE_BENCHES.trebuchet)
          .filter(function (b) { return !!detail[b]; })
          .map(function (b) {
            var x = detail[b];
            return { bench: b, icon: x.icon, part: x.part, value: x.value, unit: x.unit, note: x.note };
          });
      }

      function partsPanel() {
        var parts = partsOf(machineId);
        return card([
          h('h4', { key: 'h', style: { margin: '0 0 4px', fontSize: 14, color: T.text } },
            __alloT('stem.machinelab.parts_title', 'Simple machines in this engine')),
          h('p', { key: 'p', style: { margin: '0 0 10px', fontSize: 13, color: T.muted, lineHeight: 1.5 } },
            pick({
              k2: __alloT('stem.machinelab.parts_k2', 'This big machine is made of the small machines you already know.'),
              g35: __alloT('stem.machinelab.parts_g35', 'Every part of this engine is one of the six simple machines from the Machine Shop. Tap one to go and try it on its own.'),
              g68: __alloT('stem.machinelab.parts_g68', 'Nothing here is new. Every part is one of the six simple machines, and not one of them adds any energy: they only change the exchange rate between force and distance.'),
              g912: __alloT('stem.machinelab.parts_g912', 'The engine is a composition of the six machines. Each contributes a mechanical advantage to a different stage, and the ones the tool models numerically show their live value here; the rest are present in the mechanism but not in the energy model.')
            }, band)),
          h('ul', { key: 'l', style: { listStyle: 'none', margin: 0, padding: 0 } },
            parts.map(function (p) {
              return h('li', {
                key: p.bench,
                style: {
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0',
                  borderTop: '1px solid ' + T.border
                }
              }, [
                h('span', { key: 'i', 'aria-hidden': 'true', style: { fontSize: 18, lineHeight: 1.2 } }, p.icon),
                h('div', { key: 'b', style: { flex: '1 1 140px', minWidth: 0 } }, [
                  h('div', { key: 't', style: { fontSize: 13, fontWeight: 700, color: T.text } }, p.part),
                  h('div', { key: 'n', style: { fontSize: 12, color: T.dim, lineHeight: 1.45 } }, p.note)
                ]),
                h('div', {
                  key: 'v',
                  style: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }
                }, [
                  h('span', {
                    key: 'ma',
                    style: {
                      fontSize: 13, fontWeight: 800, minWidth: 48, textAlign: 'right',
                      color: (p.value === null) ? T.dim : T.accent, fontVariantNumeric: 'tabular-nums'
                    }
                  }, p.value === null
                    ? __alloT('stem.machinelab.not_modelled', 'in the build')
                    : fmt(p.value, 2) + p.unit),
                  h('button', {
                    key: 'go',
                    onClick: function () { updMulti({ view: 'machines', bench: p.bench, benchResult: null, benchPrediction: '', benchChoice: null }); },
                    'aria-label': __alloT('stem.machinelab.aria_open_bench', 'Open the bench for ') + p.part,
                    style: {
                      padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
                      border: '1px solid ' + T.border, background: T.card, color: T.text,
                      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap'
                    }
                  }, __alloT('stem.machinelab.open_bench', 'Bench'))
                ])
              ]);
            }))
        ], 'parts');
      }

      // A compact key sits beside the live scene so the vocabulary in the
      // ledger has a visible home in the machine. It is deliberately a key,
      // not another panel: the scene remains the dominant object.
      function anatomyKey(cam) {
        var torsion = machineId === 'ballista' || machineId === 'onager';
        var items = torsion ? [
          { label: __alloT('stem.machinelab.anatomy_spring', 'spring bundle'), color: T.effort, view: [-12, 14, 1.35] },
          { label: __alloT('stem.machinelab.anatomy_pivot', 'pivot'), color: T.frame, view: [22, 18, 1.5] },
          { label: __alloT('stem.machinelab.anatomy_arm', 'throwing arm'), color: T.beam, view: [42, 24, 1.25] },
          { label: __alloT('stem.machinelab.anatomy_stone', 'stone'), color: T.load, view: [62, 14, 1.45] }
        ] : [
          { label: __alloT('stem.machinelab.anatomy_weight', 'counterweight'), color: T.load, view: [-18, 14, 1.35] },
          { label: __alloT('stem.machinelab.anatomy_pivot', 'pivot'), color: T.frame, view: [22, 18, 1.5] },
          { label: __alloT('stem.machinelab.anatomy_beam', 'throwing beam'), color: T.beam, view: [42, 24, 1.25] },
          { label: __alloT('stem.machinelab.anatomy_stone', 'stone'), color: T.effort, view: [62, 14, 1.45] }
        ];
        return h('div', {
          key: 'anatomy', role: 'group',
          'aria-label': __alloT('stem.machinelab.anatomy_aria', '3D machine key'),
          style: {
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            marginTop: 6, padding: '2px 2px 0', color: T.dim
          }
        }, [
          h('span', {
            key: 'title',
            style: { fontSize: 10, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: T.accent }
          }, __alloT('stem.machinelab.anatomy_title', 'Read the machine')),
          items.map(function (item) {
            return h('button', {
              key: item.label, type: 'button',
              onClick: function () {
                if (cam && item.view) cam.setView(item.view[0], item.view[1], item.view[2]);
                announceToSR(__alloT('stem.machinelab.anatomy_focus_announce', 'Focusing on ') + item.label + '.');
              },
              onFocus: function (ev) {
                if (ev && ev.currentTarget) ev.currentTarget.style.outline = '2px solid ' + T.accent;
              },
              onBlur: function (ev) {
                if (ev && ev.currentTarget) ev.currentTarget.style.outline = '1px solid transparent';
              },
              title: __alloT('stem.machinelab.anatomy_focus_title', 'Focus this part in the 3D scene'),
              'aria-label': __alloT('stem.machinelab.anatomy_focus', 'Focus the ') + item.label +
                __alloT('stem.machinelab.anatomy_focus_3d', ' in the 3D scene'),
              style: {
                display: 'inline-flex', alignItems: 'center', gap: 4,
                minHeight: 24, padding: '2px 5px', border: '1px solid ' + T.border,
                borderRadius: 6, background: T.bg, outline: '1px solid transparent',
                outlineOffset: 1, fontSize: 11, fontWeight: 650, color: T.text, cursor: 'pointer'
              }
            }, [
              h('span', {
                key: 'dot', 'aria-hidden': 'true',
                style: { width: 8, height: 8, borderRadius: '50%', background: item.color, flex: '0 0 auto' }
              }),
              item.label
            ]);
          }),
          h('span', {
            key: 'hint', style: { fontSize: 11, color: T.dim, fontStyle: 'italic' }
          }, __alloT('stem.machinelab.anatomy_hint', 'Click a part or drag to inspect the structure.'))
        ]);
      }

      function yardSignalKey() {
        var items = [
          { label: __alloT('stem.machinelab.signal_ready', 'ready'), color: T.accent },
          { label: __alloT('stem.machinelab.signal_stored', 'stored energy'), color: T.load },
          { label: __alloT('stem.machinelab.signal_release', 'release'), color: T.ok }
        ];
        return h('div', {
          key: 'signals', role: 'group',
          'aria-label': __alloT('stem.machinelab.signal_aria', '3D yard signal lights'),
          style: {
            display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
            marginTop: 4, padding: '2px 2px 0', color: T.dim
          }
        }, [
          h('span', {
            key: 'title',
            style: { fontSize: 10, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: T.accent }
          }, __alloT('stem.machinelab.signal_title', 'Scene signals')),
          items.map(function (item) {
            return h('span', {
              key: item.label,
              style: {
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, color: T.muted, whiteSpace: 'nowrap'
              }
            }, [
              h('span', {
                key: 'dot', 'aria-hidden': 'true',
                style: { width: 8, height: 8, borderRadius: '50%', background: item.color, flex: '0 0 auto' }
              }),
              item.label
            ]);
          }),
          h('span', {
            key: 'hint', style: { fontSize: 11, color: T.dim, fontStyle: 'italic' }
          }, __alloT('stem.machinelab.signal_hint', 'The lights mirror the energy story.'))
        ]);
      }

      function buildShotStatus() {
        if (!d.lastShot) return null;
        var shot = d.lastShot;
        var current = !d.lastShotSig || d.lastShotSig === rangeConfigSig();
        var rangeText = pos(shot.range) ? fmt(shot.range, 1) + ' m' : '-';
        var speedText = pos(shot.muzzleV) ? fmt(shot.muzzleV, 1) + ' m/s' : '-';
        var impactText = pos(shot.impactKE) ? fmt(shot.impactKE, 0) + ' J at impact' : '';
        return h('div', {
          key: 'shotstatus', role: 'status',
          style: {
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            marginTop: 8, padding: '7px 9px', borderRadius: 8,
            background: T.bg, border: '1px solid ' + T.border
          }
        }, [
          h('span', {
            key: 'label',
            style: { fontSize: 10, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: current ? T.accent : T.warn }
          }, current
            ? __alloT('stem.machinelab.last_test', 'Last test')
            : __alloT('stem.machinelab.last_test_stale', 'Last test - settings changed')),
          h('strong', {
            key: 'range', style: { fontSize: 14, color: T.text, fontVariantNumeric: 'tabular-nums' }
          }, rangeText),
          h('span', {
            key: 'detail', style: { fontSize: 11, color: T.muted }
          }, speedText + (impactText ? ' - ' + impactText : '')),
          !current ? h('span', {
            key: 'stale', style: { fontSize: 11, color: T.warn }
          }, __alloT('stem.machinelab.last_test_stale_hint', 'Fire again to test the new settings.')) : null,
          h('button', {
            key: 'range', type: 'button',
            onClick: function () { upd('view', 'range'); },
            'aria-label': __alloT('stem.machinelab.last_test_open', 'Open the full flight in the Test Range'),
            style: {
              marginLeft: 'auto', padding: '4px 8px', borderRadius: 7, cursor: 'pointer',
              border: '1px solid ' + T.border, background: T.card, color: T.text,
              fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap'
            }
          }, __alloT('stem.machinelab.last_test_open_short', 'See full flight'))
        ]);
      }

      function renderBuild() {
        var WINCH_CONTROLS = [
          { key: 'winchHandleR', label: __alloT('stem.machinelab.winch_handle', 'Crank handle radius'), min: 0.1, max: 0.9, step: 0.05, unit: 'm' },
          { key: 'winchDrumR', label: __alloT('stem.machinelab.winch_drum', 'Winch drum radius'), min: 0.02, max: 0.4, step: 0.01, unit: 'm' },
          { key: 'winchPulleys', label: __alloT('stem.machinelab.winch_pulleys', 'Pulleys in the tackle'), min: 1, max: 6, step: 1, unit: '' }
        ];

        var mCam = camFor('machine');
        var glStatus = TREB_GL.status();
        TREB_GL.onStatusChange(function () { upd('glTick', (d.glTick || 0) + 1); });
        function beginMachineOrbit(ev) {
          if (!ev || ev.button !== 0 || ev.pointerType === 'touch') return;
          MACHINE_DRAG = {
            id: ev.pointerId, x: ev.clientX, y: ev.clientY,
            rotY: mCam.rotY, rotX: mCam.rotX, zoom: mCam.zoom
          };
          try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) {}
          ev.currentTarget.style.cursor = 'grabbing';
          if (ev.preventDefault) ev.preventDefault();
        }
        function moveMachineOrbit(ev) {
          if (!MACHINE_DRAG || !ev || ev.pointerId !== MACHINE_DRAG.id) return;
          var dx = ev.clientX - MACHINE_DRAG.x, dy = ev.clientY - MACHINE_DRAG.y;
          mCam.setView(MACHINE_DRAG.rotY - dx * 0.32, MACHINE_DRAG.rotX + dy * 0.24, MACHINE_DRAG.zoom);
          if (ev.preventDefault) ev.preventDefault();
        }
        function endMachineOrbit(ev) {
          if (!MACHINE_DRAG || !ev || ev.pointerId !== MACHINE_DRAG.id) return;
          try { ev.currentTarget.releasePointerCapture(ev.pointerId); } catch (e) {}
          ev.currentTarget.style.cursor = 'grab'; MACHINE_DRAG = null;
        }
        // sig drives the scene REBUILD, so it carries geometry and theme only.
        // Firing must not change it, or every shot would tear the scene down.
        TREB_GL.push({
          sig: [machineId, d.beamLong, d.beamShort, d.slingLength, d.cwMass, d.cwDrop,
                d.torsionArmLength, d.torsionDraw, d.onagerSling,
                d.projDiameter, isDark, isContrast].join('|'),
          kind: machineId,
          rotY: mCam.rotY, rotX: mCam.rotX, zoom: mCam.zoom,
          static: !d.animating || reducedMotion,
          reduced: reducedMotion,
          shotId: d.animating ? d.shotId : 0,
          releaseAngle: d.releaseAngle,
          muzzleV: preview ? preview.muzzleV : 20,
          dark: isDark, contrast: isContrast,
          geom: {
            beamLong: d.beamLong, beamShort: d.beamShort,
            // The onager's sling is its own control. Passing the trebuchet's
            // 2 m sling to a 1.1 m onager arm would draw a machine the numbers
            // beside it do not describe.
            slingLength: (machineId === 'onager') ? d.onagerSling : d.slingLength,
            cwMass: d.cwMass, cwDrop: d.cwDrop, projDiameter: d.projDiameter,
            armLength: d.torsionArmLength, drawLength: d.torsionDraw
          }
        });

        return h('div', { key: 'buildview' }, [
          machinePicker(),
          h('div', {
          key: 'grid',
          style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 12 }
        }, [
          h('div', { key: 'l' }, [
            card([
              // The full-screen element is this wrapper, not the bay, so the
              // camera buttons go with it: a scene you can look at and cannot
              // steer, with Escape as the only exit, is worse than no button.
              //
              // Flex column with the bay on flex:1. In normal flow the wrapper
              // is auto-height and the bay keeps its 260; in full screen the
              // wrapper is 100vh and the bay fills it. No state is involved,
              // which matters because Escape exits without telling React.
              h('div', {
                key: 'fswrap',
                ref: machineFsRef,
                style: { display: 'flex', flexDirection: 'column', background: T.card }
              }, [
              h('div', {
                key: 'gl',
                ref: trebGlRef,
                role: 'img', 'data-ml-orbitable': 'true',
                onPointerDown: beginMachineOrbit, onPointerMove: moveMachineOrbit,
                onPointerUp: endMachineOrbit, onPointerCancel: endMachineOrbit,
                'aria-label': __alloT('stem.machinelab.aria_machine3d', 'Three-dimensional view of the ') + machineLabel(machineId) + __alloT('stem.machinelab.aria_machine3d2', '. Drag with a mouse or pen to orbit. The camera buttons and ledger provide keyboard and numeric equivalents.'),
                style: {
                  width: '100%', height: 'clamp(330px, 48vh, 480px)', minHeight: 260, flex: '1 1 auto',
                  borderRadius: 10, background: T.bg, border: '1px solid ' + T.border,
                  cursor: 'grab', userSelect: 'none'
                }
              }, null),
              camControls(mCam, machineLabel(machineId), 'machine'),
              anatomyKey(mCam),
              yardSignalKey()
              ]),
              // The machine's swing was animated but unreachable: the only Fire
              // control lived in the Test Range, which has no 3D view, so a
              // student could never be looking at the machine while it moved.
              // Watching it work belongs here, where you tune it.
              h('div', {
                key: 'tf',
                style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 10 }
              }, [
                h('button', {
                  key: 'go', onClick: fire, disabled: !!d.animating,
                  style: {
                    padding: '8px 16px', borderRadius: 9, cursor: d.animating ? 'default' : 'pointer',
                    border: '1px solid ' + T.accent,
                    background: d.animating ? T.card : T.accent,
                    color: d.animating ? T.dim : T.accentInk, fontSize: 14, fontWeight: 700
                  }
                }, d.animating
                  ? __alloT('stem.machinelab.loosing', 'Away!')
                  : __alloT('stem.machinelab.test_fire', 'Test fire')),
                h('button', {
                  key: 'save', onClick: saveDesign,
                  style: {
                    padding: '8px 14px', borderRadius: 9, cursor: 'pointer',
                    border: '1px solid ' + T.border, background: T.card, color: T.text,
                    fontSize: 13, fontWeight: 700
                  }
                }, '📸 ' + __alloT('stem.machinelab.save_design', 'Save this design')),
                preview ? h('span', { key: 'n', style: { fontSize: 12, color: T.dim } },
                  __alloT('stem.machinelab.test_fire_note', 'Watch the arm. Range and full numbers are in the Test Range.')) : null
              ]),
              buildShotStatus(),
              glStatus !== 'ready' ? h('p', {
                key: 'st', style: { margin: '8px 0 0', fontSize: 12, color: T.dim }
              }, glStatus === 'failed'
                ? __alloT('stem.machinelab.gl_failed', '3D view unavailable. Every number below is unaffected.')
                : __alloT('stem.machinelab.gl_loading', 'Loading the 3D view...')) : null
            ], 'glcard'),
            card([
              h('h4', { key: 'h', style: { margin: '0 0 4px', fontSize: 14, color: T.text } }, [
                h('span', { key: 't' }, machineMeta.icon + ' ' + machineLabel(machineId)),
                readAloud(pick(MACHINE_COPY[machineId] || MACHINE_COPY.trebuchet, band), 'tts')
              ]),
              h('p', { key: 'p', style: { margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.5 } },
                pick(MACHINE_COPY[machineId] || MACHINE_COPY.trebuchet, band))
            ], 'buildcopy'),
            partsPanel(),
            // The density note belongs against the two sliders it is about, not
            // appended after the whole panel, where it reads as a footnote to
            // the release angle.
            card(machineControls().reduce(function (acc, c) {
              acc.push(slider(c));
              if (c.key === 'projDiameter') acc.push(stonePanel());
              return acc;
            }, []), 'machinectl')
          ]),
          h('div', { key: 'r' }, [
            ledger(preview, 'buildledger'),
            card([
              h('h4', { key: 'h', style: { margin: '0 0 4px', fontSize: 14, color: T.text } },
                __alloT('stem.machinelab.the_winch', 'The winch')),
              h('p', { key: 'p', style: { margin: '0 0 10px', fontSize: 13, color: T.muted, lineHeight: 1.5 } },
                pick({
                  k2: __alloT('stem.machinelab.winch_body_k2', 'The handle and the drum decide how hard you have to pull and how many times you have to turn. Change them and watch what happens to the throw.'),
                  g35: __alloT('stem.machinelab.winch_body_g35', 'Changing the handle and the drum changes how hard you pull and how many turns it takes. See what it does to the shot, and what it does not do.'),
                  g68: __alloT('stem.machinelab.winch_body', 'Gearing the winch changes how hard you crank and how many turns it takes. Watch what it does to the shot.'),
                  g912: __alloT('stem.machinelab.winch_body', 'Gearing the winch changes how hard you crank and how many turns it takes. Watch what it does to the shot.')
                }, band)),
              h('div', { key: 'ctl' }, WINCH_CONTROLS.map(slider)),
              // The Machine Shop's own K-2 pattern is to KEEP "mechanical
              // advantage" and put a plain reading of it directly underneath
              // ("How it feels: Much easier"), because the term is the lesson
              // there. This panel follows that rather than renaming it away:
              // the term stays at every band, and the younger ones get the
              // gloss. Newtons do not survive the trip, so those are said as
              // how hard the pull feels.
              preview ? h('div', {
                key: 'nums',
                style: { display: 'grid', gap: 4, padding: 10, borderRadius: 8, background: T.bg, border: '1px solid ' + T.border }
              }, [
                h('div', { key: 'b', style: { fontSize: 13, color: T.text } },
                  __alloT('stem.machinelab.winch_ma2', 'Winch mechanical advantage: ') + fmt(preview.winchMA, 1) + '×'),
                young ? h('div', { key: 'b2', style: { fontSize: 12, color: T.dim } },
                  __alloT('stem.machinelab.winch_ma_gloss', 'That means the winch pulls ') + fmt(preview.winchMA, 1) +
                  __alloT('stem.machinelab.winch_ma_gloss2', ' times harder than you do.')) : null,
                h('div', { key: 'c', style: { fontSize: 13, color: T.text } },
                  young
                    ? __alloT('stem.machinelab.crank_force_k2', 'How hard you pull: ') + fmt(preview.crankForce, 0) +
                      __alloT('stem.machinelab.crank_force_k2b', ' newtons')
                    : __alloT('stem.machinelab.crank_force', 'Crank force: ') + fmt(preview.crankForce, 0) + ' N'),
                h('div', { key: 'e', style: { fontSize: 13, color: T.text } },
                  young
                    ? __alloT('stem.machinelab.crank_turns_k2', 'Times you turn the handle: ') + fmt(preview.crankTurns, 0)
                    : __alloT('stem.machinelab.crank_turns', 'Turns of the crank: ') + fmt(preview.crankTurns, 0)),
                h('div', { key: 'f', style: { fontSize: 13, fontWeight: 700, color: T.accent } },
                  __alloT('stem.machinelab.muzzle_unchanged', 'Launch speed: ') + fmt(preview.muzzleV, 1) + ' m/s'),
                h('div', { key: 'g', style: { fontSize: 11, color: T.dim, marginTop: 2 } },
                  pick({
                    k2: __alloT('stem.machinelab.winch_hint_k2', 'Try it: the first numbers change, but the launch speed stays the same. The winch decides how easy the work is, not how far the stone goes.'),
                    g35: __alloT('stem.machinelab.winch_hint_g35', 'Change the gearing and watch. The first three numbers move. The launch speed does not, because gearing changes how you do the work, not how much of it there is.'),
                    g68: __alloT('stem.machinelab.winch_hint', 'Change the gearing and watch: the first three numbers move, the launch speed does not.'),
                    g912: __alloT('stem.machinelab.winch_hint', 'Change the gearing and watch: the first three numbers move, the launch speed does not.')
                  }, band))
              ]) : null
            ], 'winch')
          ])
        ])
        ]);
      }

      // ── Range view ──
      function renderRange() {
        var s = d.lastShot;
        var rangeCam = camFor('range');
        var rangeStatus = RANGE_GL.status();
        // Snapshots created before lastShotSig existed are treated as current
        // once; new shots always carry the fingerprint and get strict stale
        // result handling.
        var shotIsCurrent = !!(s && (!d.lastShotSig || d.lastShotSig === rangeConfigSig()));
        // During flight keep composing the shot that was actually fired. Once
        // the animation is over, the world follows the live controls again;
        // exact metrics are only revealed when those controls still match the
        // fired signature.
        var rangeScene = d.animating ? (s || preview) : preview;
        var revealMetrics = !!(rangeScene && (d.animating || shotIsCurrent));
        var rangePath = (revealMetrics && rangeScene && rangeScene.path) ? rangeScene.path : [];
        var rangeValid = !!(rangeScene && rangeScene.path && rangeScene.path.length > 1);
        var rangePast = (d.showOverlay === false) ? [] : (d.shotHistory || []).slice(0, -1)
          .filter(function (r) { return r && r.path && r.path.length > 1; }).slice(-4)
          .map(function (r) { return r.path; });
        var rangePastSig = rangePast.map(function (p) {
          var e = p[p.length - 1] || {};
          return [p.length, e.x, e.y, e.z].join(',');
        }).join(';');
        RANGE_GL.onStatusChange(function () { upd('glTick', (d.glTick || 0) + 1); });
        RANGE_GL.push({
          sig: [machineId,
            revealMetrics && rangeScene ? rangeScene.range : '', revealMetrics && rangeScene ? rangeScene.apex : '',
            revealMetrics && rangeScene ? rangeScene.drift : '', revealMetrics && rangeScene ? rangeScene.flightTime : '',
            rangePath.length, rangePast.length, rangePastSig, d.showOverlay !== false,
            revealMetrics, rangeValid, reducedMotion,
            d.projMass, d.projDiameter, d.gravity, d.drag, d.windZ, d.launchElevation,
            isDark, isContrast].join('|'),
          kind: machineId,
          rotY: rangeCam.rotY, rotX: rangeCam.rotX, zoom: rangeCam.zoom,
          static: !d.animating || reducedMotion,
          reduced: reducedMotion,
          animating: !!d.animating,
          shotId: d.shotId || 0,
          flightTime: revealMetrics && rangeScene ? rangeScene.flightTime : 1.4,
          path: rangePath,
          past: revealMetrics ? rangePast : [],
          range: revealMetrics && rangeScene ? rangeScene.range : 8,
          apex: revealMetrics && rangeScene ? rangeScene.apex : 2,
          drift: revealMetrics && rangeScene ? rangeScene.drift : 0,
          valid: rangeValid,
          reveal: revealMetrics,
          launchElevation: d.launchElevation,
          projDiameter: d.projDiameter,
          dark: isDark, contrast: isContrast
        });
        function beginRangeOrbit(ev) {
          if (!ev || ev.button !== 0 || ev.pointerType === 'touch') return;
          RANGE_DRAG = {
            id: ev.pointerId, x: ev.clientX, y: ev.clientY,
            rotY: rangeCam.rotY, rotX: rangeCam.rotX, zoom: rangeCam.zoom
          };
          try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) {}
          ev.currentTarget.style.cursor = 'grabbing';
          if (ev.preventDefault) ev.preventDefault();
        }
        function moveRangeOrbit(ev) {
          if (!RANGE_DRAG || !ev || ev.pointerId !== RANGE_DRAG.id) return;
          var dx = ev.clientX - RANGE_DRAG.x, dy = ev.clientY - RANGE_DRAG.y;
          rangeCam.setView(RANGE_DRAG.rotY - dx * 0.28, RANGE_DRAG.rotX + dy * 0.22, RANGE_DRAG.zoom);
          if (ev.preventDefault) ev.preventDefault();
        }
        function endRangeOrbit(ev) {
          if (!RANGE_DRAG || !ev || ev.pointerId !== RANGE_DRAG.id) return;
          try { ev.currentTarget.releasePointerCapture(ev.pointerId); } catch (e) {}
          ev.currentTarget.style.cursor = 'grab'; RANGE_DRAG = null;
        }
        return h('div', {
          key: 'rangeview',
          style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 12 }
        }, [
          h('div', {
            key: 'world', ref: rangeFsRef,
            style: {
              gridColumn: '1 / -1', position: 'relative', display: 'flex', flexDirection: 'column',
              overflow: 'hidden', padding: 8, marginBottom: 0, borderRadius: 18,
              background: T.card, border: '1px solid ' + T.border,
              boxShadow: isDark ? '0 18px 45px rgba(0,0,0,.28)' : '0 18px 45px rgba(15,23,42,.11)'
            }
          }, [
            h('div', {
              key: 'bay', ref: rangeGlRef, role: 'img', 'data-ml-orbitable': 'true',
              onPointerDown: beginRangeOrbit, onPointerMove: moveRangeOrbit,
              onPointerUp: endRangeOrbit, onPointerCancel: endRangeOrbit,
              'aria-label': __alloT('stem.machinelab.aria_range3d', 'Interactive three-dimensional range showing the selected machine’s launch path. Drag with a mouse or pen to orbit. The graph and controls below provide keyboard and numeric equivalents.'),
              style: {
                width: '100%', height: 'clamp(320px, 48vh, 500px)', minHeight: 280,
                flex: '1 1 auto', borderRadius: 13, background: T.bg,
                border: '1px solid ' + T.border, cursor: 'grab', userSelect: 'none'
              }
            }, null),
            h('div', {
              key: 'hud', 'aria-hidden': 'true',
              style: {
                position: 'absolute', top: 22, left: 22, right: 22,
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                gap: 10, flexWrap: 'wrap', pointerEvents: 'none'
              }
            }, [
              h('div', {
                key: 'title', style: {
                  padding: '9px 12px', borderRadius: 12, color: '#f8fafc',
                  background: 'rgba(7,17,31,.82)', border: '1px solid rgba(255,255,255,.2)',
                  boxShadow: '0 8px 22px rgba(0,0,0,.24)', backdropFilter: 'blur(8px)'
                }
              }, [
                h('div', { key: 'ey', style: { fontSize: 9, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase', color: '#fbbf24' } },
                  d.animating ? '● ' + __alloT('stem.machinelab.range_in_flight', 'Stone in flight')
                    : (revealMetrics ? __alloT('stem.machinelab.range_fired_lane', 'Fired result') : __alloT('stem.machinelab.range_live_lane', 'Live range lane'))),
                h('div', { key: 'nm', style: { marginTop: 2, fontSize: 20, fontWeight: 850 } }, machineLabel(machineId))
              ]),
              h('div', {
                key: 'metric', style: {
                  minWidth: 160, padding: '9px 12px', borderRadius: 12, textAlign: 'right',
                  color: '#f8fafc', background: 'rgba(7,17,31,.82)',
                  border: '1px solid rgba(255,255,255,.2)', backdropFilter: 'blur(8px)'
                }
              }, [
                h('div', { key: 'l', style: { fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: '#cbd5e1' } },
                  revealMetrics ? __alloT('stem.machinelab.range_world_metric', 'Landing distance')
                    : __alloT('stem.machinelab.range_prediction_locked', 'Prediction locked')),
                h('div', { key: 'v', style: { marginTop: 1, fontSize: 22, fontWeight: 900, color: '#fbbf24' } },
                  revealMetrics && rangeScene && rangeScene.range != null ? fmt(rangeScene.range, 1) + ' m' : '—'),
                h('div', { key: 'a', style: { marginTop: 2, fontSize: 9, fontWeight: 750, color: '#cbd5e1' } },
                  __alloT('stem.machinelab.range_world_apex', 'Apex ') +
                  (revealMetrics && rangeScene && rangeScene.apex != null ? fmt(rangeScene.apex, 1) + ' m' : '—'))
              ])
            ]),
            !revealMetrics ? h('div', {
              key: 'prompt', 'aria-hidden': 'true',
              style: {
                position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
                maxWidth: 300, padding: '12px 16px', borderRadius: 12, textAlign: 'center',
                color: '#e2e8f0', background: 'rgba(7,17,31,.74)',
                border: '1px dashed rgba(251,191,36,.65)', boxShadow: '0 10px 24px rgba(0,0,0,.2)',
                fontSize: 13, fontWeight: 750, lineHeight: 1.4, pointerEvents: 'none', backdropFilter: 'blur(8px)'
              }
            }, __alloT('stem.machinelab.range_world_prompt', 'Make your prediction, then fire to reveal the trajectory.')) : null,
            h('div', {
              key: 'legend', 'aria-hidden': 'true',
              style: {
                position: 'absolute', left: 22, bottom: 104, display: 'flex', gap: 12,
                padding: '6px 9px', borderRadius: 999, color: '#f8fafc',
                background: 'rgba(7,17,31,.76)', fontSize: 10, fontWeight: 750,
                pointerEvents: 'none', backdropFilter: 'blur(8px)'
              }
            }, [
              revealMetrics
                ? h('span', { key: 't', style: { color: '#fbbf24' } }, '● ' + __alloT('stem.machinelab.range_world_path', 'Computed path'))
                : h('span', { key: 't', style: { color: '#fbbf24' } }, '● ' + __alloT('stem.machinelab.range_world_predict', 'Predict to reveal the path')),
              revealMetrics ? h('span', { key: 'f', style: { color: '#38bdf8' } }, '⚑ ' + __alloT('stem.machinelab.range_world_flag', 'Impact flag')) : null
            ]),
            camControls(rangeCam, __alloT('stem.machinelab.range_lane', '3D range lane'), 'range'),
            rangeStatus !== 'ready' ? h('p', {
              key: 'st', style: { margin: '8px 0 0', fontSize: 12, color: T.dim }
            }, rangeStatus === 'failed'
              ? __alloT('stem.machinelab.range_gl_failed', '3D range unavailable. The graph below carries the same path.')
              : __alloT('stem.machinelab.range_gl_loading', 'Opening the 3D range lane...')) : null
          ]),
          h('div', { key: 'l' }, [
            oddStoneNote('rangeodd'),
            card([
              h('h4', { key: 'h', style: { margin: '0 0 8px', fontSize: 14, color: T.text } },
                __alloT('stem.machinelab.predict_fire', 'Predict, then fire')),
              h('p', { key: 'p', style: { margin: '0 0 8px', fontSize: 13, color: T.muted } },
                __alloT('stem.machinelab.predict_body', 'How far will this machine throw? Write a number before you pull the release.')),
              h('div', { key: 'row', style: { display: 'flex', gap: 8, flexWrap: 'wrap' } }, [
                h('input', {
                  key: 'in', type: 'text', inputMode: 'decimal',
                  value: d.rangePrediction || '',
                  placeholder: __alloT('stem.machinelab.metres', 'metres'),
                  'aria-label': __alloT('stem.machinelab.aria_range_predict', 'Your predicted range in metres'),
                  onChange: function (e) { upd('rangePrediction', e.target.value); },
                  onKeyDown: function (e) { if (e.key === 'Enter') fire(); },
                  style: {
                    flex: '1 1 110px', padding: '9px 11px', borderRadius: 8,
                    border: '1px solid ' + T.border, background: T.bg, color: T.text, fontSize: 14
                  }
                }),
                h('button', {
                  key: 'fire', onClick: fire, disabled: !!d.animating || !preview,
                  style: {
                    padding: '9px 20px', borderRadius: 8,
                    cursor: (d.animating || !preview) ? 'not-allowed' : 'pointer',
                    border: '1px solid ' + ((d.animating || !preview) ? T.border : T.accent),
                    background: (d.animating || !preview) ? T.card : T.accent,
                    color: (d.animating || !preview) ? T.dim : T.accentInk,
                    fontSize: 14, fontWeight: 800
                  }
                }, d.animating ? __alloT('stem.machinelab.in_flight', 'In flight…') : __alloT('stem.machinelab.fire', 'Fire'))
              ]),
              d.rangeResult ? h('p', {
                key: 'res', role: 'status',
                style: { margin: '10px 0 0', fontSize: 13, fontWeight: 700, color: d.rangeResult.ok ? T.ok : T.text }
              }, d.rangeResult.message) : null
            ], 'firecard'),
            s ? card([
              h('div', {
                key: 'hd',
                style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }
              }, [
                h('h4', { key: 'h', style: { margin: 0, fontSize: 14, color: T.text } },
                  __alloT('stem.machinelab.flight_path', 'Flight path')),
                ((d.shotHistory || []).length > 1) ? h('button', {
                  key: 'ov', 'aria-pressed': (d.showOverlay !== false) ? 'true' : 'false',
                  onClick: function () { upd('showOverlay', d.showOverlay === false); },
                  style: {
                    padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
                    border: '1px solid ' + T.border, background: T.card, color: T.muted,
                    fontSize: 11, fontWeight: 700
                  }
                }, (d.showOverlay !== false)
                  ? __alloT('stem.machinelab.hide_past', 'Hide earlier shots')
                  : __alloT('stem.machinelab.show_past', 'Show earlier shots')) : null
              ]),
              !shotIsCurrent && !d.animating ? h('p', {
                key: 'stale', role: 'status',
                style: { margin: '0 0 8px', fontSize: 12, color: T.warn || T.accent, lineHeight: 1.45 }
              }, __alloT('stem.machinelab.stale_shot', 'Current settings changed. Fire again to reveal the new result.')) : null,
              h('div', {
                key: 'g', role: 'img',
                'aria-label': __alloT('stem.machinelab.aria_traj', 'Trajectory. Range ') + fmt(s.range, 0) +
                  __alloT('stem.machinelab.aria_traj2', ' metres, apex ') + fmt(s.apex, 0) +
                  __alloT('stem.machinelab.aria_traj3', ' metres, flight time ') + fmt(s.flightTime, 1) +
                  __alloT('stem.machinelab.aria_traj4', ' seconds.')
              }, trajectoryGraph(s)),
              ((d.showOverlay !== false) && (d.shotHistory || []).length > 1) ? h('p', {
                key: 'ovtxt',
                style: { margin: '6px 0 0', fontSize: 12, color: T.dim, lineHeight: 1.5 }
              }, __alloT('stem.machinelab.overlay_note', 'Dashed arcs are earlier shots: ') +
                 (d.shotHistory || []).slice(0, -1).slice(-4).map(function (r) {
                   return fmt(r.projMass, 0) + ' kg → ' + fmt(r.range, 0) + ' m';
                 }).join(', ') + '.') : null,
              h('div', { key: 'nums', style: { display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 } }, [
                h('span', { key: 'a', style: { fontSize: 13, color: T.text } },
                  __alloT('stem.machinelab.range_lbl', 'Range: ') + fmt(s.range, 1) + ' m'),
                h('span', { key: 'b', style: { fontSize: 13, color: T.text } },
                  __alloT('stem.machinelab.apex_lbl', 'Apex: ') + fmt(s.apex, 1) + ' m'),
                h('span', { key: 'c', style: { fontSize: 13, color: T.text } },
                  __alloT('stem.machinelab.time_lbl', 'Flight time: ') + fmt(s.flightTime, 2) + ' s'),
                h('span', { key: 'e', style: { fontSize: 13, color: T.text } },
                  __alloT('stem.machinelab.impact_lbl', 'Impact speed: ') + fmt(s.impactSpeed, 1) + ' m/s'),
                (s.drift !== undefined && Math.abs(s.drift) > 0.05) ? h('span', {
                  key: 'd', style: { fontSize: 13, color: T.accent, fontWeight: 700 }
                }, __alloT('stem.machinelab.drift_lbl', 'Blown sideways: ') + fmt(Math.abs(s.drift), 1) + ' m') : null
              ])
            ], 'traj') : null,
            card([
              h('h4', { key: 'h', style: { margin: '0 0 8px', fontSize: 14, color: T.text } },
                __alloT('stem.machinelab.conditions', 'Conditions')),
              h('div', { key: 'gv', style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 } },
                GRAVITY_PRESETS.map(function (gp) {
                  var on = Math.abs((d.gravity || 9.81) - gp.g) < 0.01;
                  return h('button', {
                    key: gp.id, 'aria-pressed': on ? 'true' : 'false',
                    onClick: function () { upd('gravity', gp.g); },
                    style: {
                      padding: '5px 11px', borderRadius: 8, cursor: 'pointer',
                      border: '1px solid ' + (on ? T.accent : T.border),
                      background: on ? T.accent : T.card,
                      color: on ? T.accentInk : T.muted, fontSize: 12, fontWeight: 700
                    }
                  }, gp.label);
                })),
              h('label', {
                key: 'dr',
                style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.text, cursor: 'pointer' }
              }, [
                h('input', {
                  key: 'cb', type: 'checkbox', checked: d.drag !== false,
                  onChange: function (e) { upd('drag', !!e.target.checked); }
                }),
                // The ledger calls this "pushing through the air" for the young
                // bands, so the control that switches it on has to agree.
                h('span', { key: 's' }, pick({
                  k2: __alloT('stem.machinelab.air_on_k2', 'Let the air push back'),
                  g35: __alloT('stem.machinelab.air_on_k2', 'Let the air push back'),
                  g68: __alloT('stem.machinelab.air_on', 'Air resistance on'),
                  g912: __alloT('stem.machinelab.air_on', 'Air resistance on')
                }, band))
              ]),
              slider({ key: 'launchElevation', label: __alloT('stem.machinelab.elevation', 'Launch height'), min: 0, max: 20, step: 0.5, unit: 'm' }),
              windControl(),
              band === 'g912' ? h('p', {
                key: 'note', style: { margin: '6px 0 0', fontSize: 12, color: T.dim, lineHeight: 1.5 }
              }, __alloT('stem.machinelab.vacuum_note', 'Turn the air off and sweep the stone mass: the range now falls steadily as mass rises, with no best value. The sweet spot you find with air on is a fact about drag, not about levers.')) : null
            ], 'cond')
          ]),
          h('div', { key: 'r' }, [
            ledger(d.animating ? (s || preview) : preview, 'rangeledger'),
            (d.shotHistory && d.shotHistory.length > 1) ? card([
              h('h4', { key: 'h', style: { margin: '0 0 6px', fontSize: 14, color: T.text } },
                __alloT('stem.machinelab.shot_log', 'Shot log')),
              h('table', { key: 't', style: { width: '100%', borderCollapse: 'collapse', fontSize: 12, color: T.text } }, [
                h('thead', { key: 'h' }, h('tr', null, [
                  h('th', { key: '1', scope: 'col', style: { textAlign: 'left', padding: 3 } }, __alloT('stem.machinelab.col_stone', 'Stone')),
                  h('th', { key: '2', scope: 'col', style: { textAlign: 'right', padding: 3 } }, __alloT('stem.machinelab.col_speed', 'Launch')),
                  h('th', { key: '3', scope: 'col', style: { textAlign: 'right', padding: 3 } }, __alloT('stem.machinelab.col_eff', 'Efficiency')),
                  h('th', { key: '4', scope: 'col', style: { textAlign: 'right', padding: 3 } }, __alloT('stem.machinelab.col_range', 'Range'))
                ])),
                h('tbody', { key: 'b' }, (d.shotHistory || []).slice().reverse().map(function (r, i) {
                  return h('tr', { key: i }, [
                    h('td', { key: '1', style: { padding: 3 } }, fmt(r.projMass, 0) + ' kg'),
                    h('td', { key: '2', style: { padding: 3, textAlign: 'right' } }, fmt(r.muzzleV, 1) + ' m/s'),
                    h('td', { key: '3', style: { padding: 3, textAlign: 'right' } }, fmt(100 * r.eta, 0) + '%'),
                    h('td', { key: '4', style: { padding: 3, textAlign: 'right', fontWeight: 700 } }, fmt(r.range, 1) + ' m')
                  ]);
                }))
              ]),
              h('p', { key: 'hint', style: { margin: '8px 0 0', fontSize: 12, color: T.dim, lineHeight: 1.5 } },
                __alloT('stem.machinelab.log_hint', 'Try a very light stone and a very heavy one. The light one leaves faster but wastes most of the energy on the arm. Somewhere in between throws furthest.'))
            ], 'log') : null
          ])
        ]);
      }

      // The other half of the link: standing at a bench, show which engines use
      // it and go straight there. A student who proves the lever should be able
      // to walk to the trebuchet beam and recognise it.
      function whereYouMeetIt() {
        var uses = [];
        MACHINES.forEach(function (mm) {
          var hit = partsOf(mm.id).filter(function (p) { return p.bench === bench.id; })[0];
          if (hit) uses.push({ machine: mm, part: hit.part });
        });
        if (!uses.length) return null;
        return card([
          h('h4', { key: 'h', style: { margin: '0 0 8px', fontSize: 14, color: T.text } },
            __alloT('stem.machinelab.meet_title', 'Where you meet this machine')),
          h('ul', { key: 'l', style: { listStyle: 'none', margin: 0, padding: 0 } },
            uses.map(function (u) {
              return h('li', {
                key: u.machine.id,
                style: { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }
              }, [
                h('span', { key: 'i', 'aria-hidden': 'true' }, u.machine.icon),
                h('span', { key: 't', style: { flex: '1 1 auto', fontSize: 13, color: T.muted } }, [
                  h('strong', { key: 'm', style: { color: T.text } }, machineLabel(u.machine.id)),
                  h('span', { key: 'p' }, ': ' + u.part)
                ]),
                h('button', {
                  key: 'go',
                  onClick: function () { updMulti({ view: 'build', machine: u.machine.id }); },
                  'aria-label': __alloT('stem.machinelab.aria_open_machine', 'Open the ') + machineLabel(u.machine.id),
                  style: {
                    padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
                    border: '1px solid ' + T.border, background: T.card, color: T.text,
                    fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap'
                  }
                }, __alloT('stem.machinelab.open_machine', 'Build'))
              ]);
            })),
          h('p', { key: 'n', style: { margin: '8px 0 0', fontSize: 12, color: T.dim, lineHeight: 1.45 } },
            __alloT('stem.machinelab.meet_note', 'The engines are not new machines. They are these six, bolted together.'))
        ], 'meet');
      }

      // ── Machines view (P1) ──
      function renderMachines() {
        var shopCam = camFor('shop');
        var shopStatus = SHOP_GL.status();
        var benchIndex = BENCHES.indexOf(bench);
        var nextBench = BENCHES[(benchIndex + 1) % BENCHES.length];
        var hasRunDemo = d.shopDemoBench === bench.id;
        var observationCues = {
          lever: __alloT('stem.machinelab.observe_lever', 'The long effort arm travels farther while the load rises.'),
          pulley: __alloT('stem.machinelab.observe_pulley', 'More supporting rope segments share the load.'),
          windlass: __alloT('stem.machinelab.observe_windlass', 'The large wheel turns the smaller axle.'),
          ramp: __alloT('stem.machinelab.observe_ramp', 'A longer path reduces the force needed.'),
          wedge: __alloT('stem.machinelab.observe_wedge', 'Downward effort redirects force out to the sides.'),
          screw: __alloT('stem.machinelab.observe_screw', 'Rotation becomes a small, powerful downward move.')
        };
        function beginShopOrbit(ev) {
          if (!ev || ev.button !== 0 || ev.pointerType === 'touch') return;
          SHOP_DRAG = {
            id: ev.pointerId, x: ev.clientX, y: ev.clientY,
            rotY: shopCam.rotY, rotX: shopCam.rotX, zoom: shopCam.zoom
          };
          try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) {}
          ev.currentTarget.style.cursor = 'grabbing';
          if (ev.preventDefault) ev.preventDefault();
        }
        function moveShopOrbit(ev) {
          if (!SHOP_DRAG || !ev || ev.pointerId !== SHOP_DRAG.id) return;
          var dx = ev.clientX - SHOP_DRAG.x, dy = ev.clientY - SHOP_DRAG.y;
          shopCam.setView(SHOP_DRAG.rotY - dx * 0.32, SHOP_DRAG.rotX + dy * 0.24, SHOP_DRAG.zoom);
          if (ev.preventDefault) ev.preventDefault();
        }
        function endShopOrbit(ev) {
          if (!SHOP_DRAG || !ev || ev.pointerId !== SHOP_DRAG.id) return;
          try { ev.currentTarget.releasePointerCapture(ev.pointerId); } catch (e) {}
          ev.currentTarget.style.cursor = 'grab'; SHOP_DRAG = null;
        }
        function runShopDemo() {
          if (d.shopAnimating || shopStatus === 'failed') return;
          updMulti({ shopDemoId: (d.shopDemoId || 0) + 1, shopAnimating: true, shopDemoBench: bench.id });
          announceToSR(__alloT('stem.machinelab.demo_started', 'Demonstration started for ') + bench.label + '.');
          if (typeof setTimeout === 'function') {
            setTimeout(function () {
              setLabToolData(function (prev) {
                var cur = (prev && prev.machineLab) || {};
                return Object.assign({}, prev, { machineLab: Object.assign({}, cur, { shopAnimating: false }) });
              });
            }, 2300);
          }
        }
        function openNextBench() {
          updMulti({ bench: nextBench.id, benchPrediction: '', benchChoice: null, benchResult: null, shopAnimating: false });
          announceToSR(__alloT('stem.machinelab.next_station_open', 'Opened the next station: ') + nextBench.label + '.');
        }
        SHOP_GL.onStatusChange(function () { upd('glTick', (d.glTick || 0) + 1); });
        SHOP_GL.push({
          sig: [bench.id, d.leverEffortArm, d.leverLoadArm, d.pulleySegments,
                d.windlassHandleR, d.windlassDrumR, d.rampLength, d.rampHeight,
                d.wedgeLength, d.wedgeThickness, d.screwHandleR, d.screwPitch,
                ma, isDark, isContrast].join('|'),
          kind: bench.id,
          rotY: shopCam.rotY, rotX: shopCam.rotX, zoom: shopCam.zoom,
          static: !d.shopAnimating,
          demoId: d.shopAnimating ? d.shopDemoId : 0,
          dark: isDark, contrast: isContrast,
          params: {
            ma: ma, effortArm: d.leverEffortArm, loadArm: d.leverLoadArm,
            segments: d.pulleySegments, handleR: bench.id === 'screw' ? d.screwHandleR : d.windlassHandleR,
            drumR: d.windlassDrumR, length: bench.id === 'wedge' ? d.wedgeLength : d.rampLength,
            height: d.rampHeight, thickness: d.wedgeThickness, pitch: d.screwPitch
          }
        });

        var completed = Object.keys(d.provenBenches || {}).length;
        return h('div', { key: 'machview' }, [
          benchTabs(),
          h('div', {
            key: 'world', ref: shopFsRef,
            style: {
              position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden',
              padding: 8, marginBottom: 12, borderRadius: 18, background: T.card,
              border: '1px solid ' + T.border, boxShadow: isDark
                ? '0 18px 45px rgba(0,0,0,.28)' : '0 18px 45px rgba(15,23,42,.11)'
            }
          }, [
            h('div', {
              key: 'bay', ref: shopGlRef, role: 'img',
              'data-ml-orbitable': 'true',
              onPointerDown: beginShopOrbit, onPointerMove: moveShopOrbit,
              onPointerUp: endShopOrbit, onPointerCancel: endShopOrbit,
              'aria-label': __alloT('stem.machinelab.aria_shop3d', 'Interactive three-dimensional workshop showing the selected simple machine: ') +
                bench.label + '. ' + __alloT('stem.machinelab.aria_shop3d2', 'Amber marks the effort path and blue marks the load path. Drag with a mouse or pen to orbit. The camera buttons and panels below provide complete keyboard and numeric equivalents.'),
              style: {
                width: '100%', height: 'clamp(330px, 52vh, 520px)', minHeight: 280,
                flex: '1 1 auto', borderRadius: 13, background: T.bg, border: '1px solid ' + T.border,
                cursor: 'grab', userSelect: 'none'
              }
            }, null),
            h('div', {
              key: 'hud', 'aria-hidden': 'true',
              style: {
                position: 'absolute', top: 22, left: 22, right: 22, display: 'flex',
                alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
                flexWrap: 'wrap', pointerEvents: 'none'
              }
            }, [
              h('div', {
                key: 'title', style: {
                  padding: '9px 12px', borderRadius: 12, color: '#f8fafc',
                  background: 'rgba(7,17,31,.82)', border: '1px solid rgba(255,255,255,.2)',
                  boxShadow: '0 8px 22px rgba(0,0,0,.24)', backdropFilter: 'blur(8px)'
                }
              }, [
                h('div', { key: 'ey', style: { fontSize: 9, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase', color: '#fbbf24' } },
                  (d.shopAnimating ? '● ' + __alloT('stem.machinelab.motion_active', 'Motion active') :
                    __alloT('stem.machinelab.live_workshop', 'Live workshop'))),
                h('div', { key: 'nm', style: { marginTop: 2, fontSize: 20, fontWeight: 850 } }, bench.label)
              ]),
              h('div', {
                key: 'observe', style: {
                  flex: '0 1 330px', maxWidth: '42%', padding: '8px 12px', borderRadius: 12,
                  color: '#e2e8f0', background: d.shopAnimating ? 'rgba(146,64,14,.9)' : 'rgba(7,17,31,.78)',
                  border: '1px solid ' + (d.shopAnimating ? 'rgba(251,191,36,.7)' : 'rgba(255,255,255,.16)'),
                  boxShadow: '0 8px 22px rgba(0,0,0,.18)', backdropFilter: 'blur(8px)',
                  fontSize: 10, lineHeight: 1.35, textAlign: 'center'
                }
              }, [
                h('span', { key: 'eye', style: { display: 'block', marginBottom: 2, color: '#fbbf24', fontSize: 9, fontWeight: 850, letterSpacing: 1, textTransform: 'uppercase' } },
                  d.shopAnimating ? __alloT('stem.machinelab.watch_motion', 'Watch the motion') : __alloT('stem.machinelab.what_to_notice', 'What to notice')),
                h('span', { key: 'cue' }, observationCues[bench.id])
              ]),
              h('div', {
                key: 'metric', style: {
                  minWidth: 120, padding: '9px 12px', borderRadius: 12, textAlign: 'right',
                  color: '#f8fafc', background: 'rgba(7,17,31,.82)',
                  border: '1px solid rgba(255,255,255,.2)', backdropFilter: 'blur(8px)'
                }
              }, [
                h('div', { key: 'l', style: { fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: '#cbd5e1' } },
                  __alloT('stem.machinelab.ma', 'Mechanical advantage')),
                h('div', { key: 'v', style: { marginTop: 1, fontSize: 22, fontWeight: 900, color: '#fbbf24' } },
                  ma === null ? '—' : fmt(ma, 2) + '×'),
                ma !== null ? h('div', { key: 'trade', style: { marginTop: 2, fontSize: 9, fontWeight: 750, color: '#cbd5e1' } },
                  __alloT('stem.machinelab.distance_times', 'Distance ×') + fmt(ma, 1) +
                  '  ·  ' + __alloT('stem.machinelab.force_div', 'Force ÷') + fmt(ma, 1)) : null
              ])
            ]),
            h('div', {
              key: 'legend', 'aria-hidden': 'true',
              style: {
                position: 'absolute', left: 22, bottom: 104, display: 'flex', gap: 12,
                padding: '6px 9px', borderRadius: 999, color: '#f8fafc',
                background: 'rgba(7,17,31,.76)', fontSize: 10, fontWeight: 750,
                pointerEvents: 'none', backdropFilter: 'blur(8px)'
              }
            }, [
              h('span', { key: 'e', style: { color: '#fbbf24' } }, '● ' + __alloT('stem.machinelab.effort_path', 'Effort path')),
              h('span', { key: 'l', style: { color: '#38bdf8' } }, '● ' + __alloT('stem.machinelab.load_path', 'Load path'))
            ]),
            camControls(shopCam, __alloT('stem.machinelab.workshop', 'simple-machine workshop'), 'shop'),
            h('div', {
              key: 'mission',
              style: {
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                gap: 10, flexWrap: 'wrap', padding: '7px 6px 2px'
              }
            }, [
              h('div', {
                key: 'steps',
                'aria-label': __alloT('stem.machinelab.station_flow', 'Station workflow: adjust, run, prove'),
                style: { display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }
              }, [
                h('span', { key: 'a', style: {
                  padding: '5px 9px', borderRadius: 999, fontSize: 10, fontWeight: 800,
                  color: hasRunDemo ? T.muted : T.accentInk, background: hasRunDemo ? T.bg : T.accent,
                  border: '1px solid ' + (hasRunDemo ? T.border : T.accent)
                } }, '1 ' + __alloT('stem.machinelab.step_adjust', 'Adjust')),
                h('span', { key: 'r', 'aria-hidden': 'true', style: { color: T.dim, fontSize: 11 } }, '→'),
                h('span', { key: 'b', style: {
                  padding: '5px 9px', borderRadius: 999, fontSize: 10, fontWeight: 800,
                  color: d.shopAnimating ? T.accentInk : T.text,
                  background: d.shopAnimating ? T.accent : T.bg,
                  border: '1px solid ' + (d.shopAnimating ? T.accent : T.border)
                } }, '2 ' + __alloT('stem.machinelab.step_run', 'Run')),
                h('span', { key: 'r2', 'aria-hidden': 'true', style: { color: T.dim, fontSize: 11 } }, '→'),
                h('span', { key: 'c', style: {
                  padding: '5px 9px', borderRadius: 999, fontSize: 10, fontWeight: 800,
                  color: hasRunDemo && !d.shopAnimating ? T.accentInk : T.text,
                  background: hasRunDemo && !d.shopAnimating ? T.accent : T.bg,
                  border: '1px solid ' + (hasRunDemo && !d.shopAnimating ? T.accent : T.border)
                } }, '3 ' + __alloT('stem.machinelab.step_prove', 'Prove'))
              ]),
              h('div', { key: 'actions', style: { display: 'flex', gap: 6, flexWrap: 'wrap' } }, [
                h('button', {
                  key: 'run', type: 'button', onClick: runShopDemo,
                  disabled: !!d.shopAnimating || shopStatus === 'failed',
                  'aria-label': __alloT('stem.machinelab.run_demo_aria', 'Run the three-dimensional demonstration for ') + bench.label,
                  style: {
                    padding: '7px 13px', borderRadius: 9,
                    cursor: d.shopAnimating || shopStatus === 'failed' ? 'default' : 'pointer',
                    border: '1px solid ' + T.accent,
                    background: d.shopAnimating ? T.bg : T.accent,
                    color: d.shopAnimating ? T.dim : T.accentInk,
                    fontSize: 11, fontWeight: 800, opacity: shopStatus === 'failed' ? 0.5 : 1
                  }
                }, d.shopAnimating
                  ? __alloT('stem.machinelab.demo_running', 'Running...')
                  : '▶ ' + __alloT('stem.machinelab.run_demo', 'Run demonstration')),
                h('button', {
                  key: 'next', type: 'button', onClick: openNextBench,
                  'aria-label': __alloT('stem.machinelab.next_station', 'Next station: ') + nextBench.label,
                  style: {
                    padding: '7px 11px', borderRadius: 9, cursor: 'pointer',
                    border: '1px solid ' + T.border, background: T.card,
                    color: T.text, fontSize: 11, fontWeight: 750
                  }
                }, __alloT('stem.machinelab.next_short', 'Next: ') + nextBench.label + ' →')
              ])
            ])
          ]),
          shopStatus !== 'ready' ? card([
            h('p', { key: 'st', style: { margin: '0 0 10px', fontSize: 12, color: T.dim } },
              shopStatus === 'failed'
                ? __alloT('stem.machinelab.shop_gl_failed', '3D workshop unavailable. This live diagram carries the same geometry.')
                : __alloT('stem.machinelab.shop_gl_loading', 'Opening the 3D workshop...')),
            h('div', {
              key: 'fallback', role: 'img',
              'aria-label': bench.label + '. ' + (ma === null
                ? __alloT('stem.machinelab.aria_invalid', 'These settings do not describe a working machine.')
                : __alloT('stem.machinelab.aria_ma', 'Mechanical advantage ') + fmt(ma, 2))
            }, diagram(h, bench.id, d, T))
          ], 'shopfallback', { borderStyle: 'dashed' }) : null,
          h('div', {
            key: 'main',
            style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 12 }
          }, [
            h('div', { key: 'left' }, [
              card([
                h('div', { key: 'top', style: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' } }, [
                  h('div', { key: 'head' }, [
                    h('div', { key: 'ey', style: { fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: T.accent } },
                      __alloT('stem.machinelab.now_exploring', 'Now exploring')),
                    h('h3', { key: 'h', style: { margin: '2px 0 6px', fontSize: 18, color: T.text } }, bench.icon + ' ' + bench.label)
                  ]),
                  readAloud(pick(bench.copy, band), 'tts')
                ]),
                h('p', { key: 'p', style: { margin: 0, fontSize: 14, lineHeight: 1.55, color: T.muted } },
                  pick(bench.copy, band))
              ], 'copy'),
              card([
                h('div', { key: 'head', style: { display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 10 } }, [
                  h('h4', { key: 'h', style: { margin: 0, fontSize: 14, color: T.text } },
                    __alloT('stem.machinelab.tune_station', 'Tune this station')),
                  h('span', { key: 'p', style: { fontSize: 11, color: T.dim } }, completed + '/6 ' + __alloT('stem.machinelab.proven_short', 'proven'))
                ])
              ].concat(bench.controls.map(slider)).concat(
                  (band === 'g68' || band === 'g912')
                    ? [slider({ key: 'loadDistance', label: __alloT('stem.machinelab.lift_distance', 'Load moves'), min: 0.1, max: 3, step: 0.1, unit: 'm' })]
                    : []
                ), 'controls')
            ]),
            h('div', { key: 'right' }, [
              readout(),
              tradePanel(),
              proveePanel(),
              whereYouMeetIt()
            ])
          ])
        ]);
      }

      // ── Siege view ──
      var WALL_PRESETS = [
        { id: 'curtain', icon: '🧱', label: __alloT('stem.machinelab.wall_curtain', 'Curtain wall'),
          lesson: __alloT('stem.machinelab.wall_curtain_l', 'A plain wall. Energy per hit against the block budget, nothing else going on.') },
        { id: 'gatehouse', icon: '🚪', label: __alloT('stem.machinelab.wall_gatehouse', 'Gatehouse'),
          lesson: __alloT('stem.machinelab.wall_gatehouse_l', 'The arch carries its load sideways into the stones beside the opening. Take one of those away and only that half of the arch comes down.') },
        { id: 'keep', icon: '🏯', label: __alloT('stem.machinelab.wall_keep', 'Keep'),
          lesson: __alloT('stem.machinelab.wall_keep_l', 'Granite, and ten courses of it. Where you aim matters more than how hard you throw.') },
        { id: 'motte', icon: '⛰️', label: __alloT('stem.machinelab.wall_motte', 'Motte and tower'),
          lesson: __alloT('stem.machinelab.wall_motte_l', 'The tower stands on an earth mound. Earth gives way far sooner than stone does, and everything above it follows.') }
      ];

      function currentWall() {
        if (d.wallBlocks && d.wallBlocks.length) return d.wallBlocks;
        return _machineMath.buildWall(d.wallPreset || 'curtain');
      }

      // P4b. The four presets always ship; this is a bonus on top, and the tool
      // is complete without it.
      var archBlocks = (labToolData && labToolData.archStudio && labToolData.archStudio.blocks) || null;
      var canImport = !!(archBlocks && archBlocks.length);

      function importArch() {
        var res = _machineMath.importWall(archBlocks);
        if (!res.blocks) {
          var why = res.error === 'too-big'
            ? __alloT('stem.machinelab.imp_big', 'That build is too large to besiege. Try something under 400 columns.')
            : res.error === 'nothing-stands'
              ? __alloT('stem.machinelab.imp_float', 'Nothing in that build is standing on the ground.')
              : __alloT('stem.machinelab.imp_empty', 'There is no Architecture Studio build to import yet.');
          upd('siegeFeedback', { ok: false, message: why });
          return;
        }
        updMulti({
          wallPreset: 'imported', wallBlocks: res.blocks,
          shotsFired: 0, totalCrankWork: 0, breached: false, lastImpact: null,
          siegeFeedback: {
            ok: true,
            message: __alloT('stem.machinelab.imp_ok', 'Imported your build: ') + res.cells +
              __alloT('stem.machinelab.imp_ok2', ' columns of wall.') +
              (res.dropped > 0
                ? __alloT('stem.machinelab.imp_dropped', ' ') + res.dropped +
                  __alloT('stem.machinelab.imp_dropped2', ' floating blocks were left out, since they were not standing on anything.')
                : '') +
              __alloT('stem.machinelab.imp_depth', ' Thickness counts: a wall three deep takes three times the energy to break through.')
          }
        });
        announceToSR(__alloT('stem.machinelab.sr_imported', 'Your Architecture Studio build is now the target.'));
      }

      function resetWall(presetId) {
        updMulti({
          wallPreset: presetId || d.wallPreset || 'curtain',
          wallBlocks: _machineMath.buildWall(presetId || d.wallPreset || 'curtain'),
          shotsFired: 0, totalCrankWork: 0, breached: false,
          siegeFeedback: null, lastImpact: null
        });
      }

      function loose() {
        if (d.siegeFlight) return;
        if (!preview) {
          upd('siegeFeedback', { ok: false, message: __alloT('stem.machinelab.bad_machine', 'This machine cannot fire. Check the sliders.') });
          return;
        }
        var blocks = currentWall();
        var impact = _machineMath.impactAt(preview, d.standoff);
        var shots = (d.shotsFired || 0) + 1;
        var work = (d.totalCrankWork || 0) + (preview.crankWork || 0);

        if (!impact || impact.status === 'short') {
          updMulti({
            shotsFired: shots, totalCrankWork: work, lastImpact: null,
            siegeFeedback: {
              ok: false,
              message: __alloT('stem.machinelab.fell_short', 'Short by ') +
                fmt(impact ? impact.shortBy : d.standoff, 1) +
                __alloT('stem.machinelab.fell_short2', ' m. Range the target: more stored energy, or a lighter stone, or move closer.')
            }
          });
          announceToSR(__alloT('stem.machinelab.sr_short', 'The shot fell short.'));
          return;
        }

        var res = _machineMath.applyDamage(blocks, impact, {
          projMass: d.projMass, projDiameter: d.projDiameter
        });
        // The arc the stone actually flies, cut at the wall rather than carried
        // on to where it would have landed on open ground.
        var flightPath = (preview.path || []).filter(function (pt) { return pt.x <= d.standoff + 1; });
        if (flightPath.length < 2) flightPath = (preview.path || []).slice(0, 2);
        var flightSecs = (impact && impact.t) ? impact.t
          : (flightPath.length ? flightPath[flightPath.length - 1].t : 1.4);
        if (!res) {
          upd('siegeFeedback', { ok: false, message: __alloT('stem.machinelab.no_target', 'Nothing to hit there.') });
          return;
        }
        var flightId = (d.siegeFlightId || 0) + 1;
        // Played at real time where that is watchable. A very fast or very slow
        // shot is stretched or squeezed into the window, and the Flight time in
        // the numbers below is always the true one, so nothing here is claiming
        // the animation is a measurement.
        var playSecs = Math.max(0.9, Math.min(4.5, flightSecs));
        var nowBreached = _machineMath.isBreached(res.blocks);
        var msg;
        if (res.outcome === 'over') {
          msg = __alloT('stem.machinelab.went_over', 'Over the top. Lower the release angle or take some energy out.');
        } else if (res.outcome === 'miss') {
          msg = __alloT('stem.machinelab.went_wide', 'Wide of the wall by ') +
            fmt(Math.abs(impact.z || 0), 1) +
            ((d.windZ || 0) !== 0
              ? __alloT('stem.machinelab.went_wide_wind', ' m. The crosswind is pushing it sideways; aim off into the wind or wait for it to drop.')
              : __alloT('stem.machinelab.went_wide_calm', ' m.'));
        } else {
          msg = __alloT('stem.machinelab.struck', 'Struck the ') + res.material +
            __alloT('stem.machinelab.struck2', ' at course ') + (res.row + 1) +
            __alloT('stem.machinelab.struck3', ', delivering ') + fmt(res.ke, 0) +
            __alloT('stem.machinelab.struck4', ' J.') +
            (res.newlyBreached > 0
              ? __alloT('stem.machinelab.blocks_down', ' Blocks came down.') : '');
        }
        updMulti({
          wallBlocks: res.blocks, shotsFired: shots, totalCrankWork: work,
          breached: nowBreached, lastImpact: res,
          siegeFeedback: { ok: res.outcome === 'hit', message: msg },
          siegeFlightId: flightId,
          // What the 3D field needs to play the throw. `before` is the wall as
          // it stood, drawn until the stone lands.
          siegeFlight: {
            id: flightId, path: flightPath, seconds: playSecs, before: blocks
          }
        });
        // Clearing it returns the bay to render-on-demand. Read from prev so a
        // second shot fired during the first does not have its flight wiped by
        // the earlier timer.
        setTimeout(function () {
          setLabToolData(function (prev) {
            var cur = (prev && prev.machineLab) || {};
            if (!cur.siegeFlight || cur.siegeFlight.id !== flightId) return prev;
            return Object.assign({}, prev, {
              machineLab: Object.assign({}, cur, { siegeFlight: null })
            });
          });
        }, playSecs * 1000 + 900);
        if (nowBreached && !d.breached) {
          awardStemXP(40);
          celebrate();
          addToast('🏰 ' + __alloT('stem.machinelab.breached_toast', 'Breach!'));
        }
        announceToSR(msg + (nowBreached ? ' ' + __alloT('stem.machinelab.sr_breach', 'The wall is breached.') : ''));
      }

      function wallGraphic(blocks) {
        var ext = _machineMath.wallExtent(blocks);
        if (!ext) return null;
        var size = 18, pad = 8;
        var W = ext.cols * size + pad * 2, H = ext.rows * size + pad * 2 + 10;
        var fillFor = function (b) {
          if (b.state === 'breached') return T.bg;
          if (b.state === 'cracked') return T.warn;
          if (b.mat === 'granite') return T.frame;
          if (b.mat === 'earth') return T.ground;
          return T.beam;
        };
        return h('svg', {
          viewBox: '0 0 ' + W + ' ' + H,
          style: { width: '100%', height: 'auto', maxWidth: 420, display: 'block' },
          focusable: 'false', 'aria-hidden': 'true'
        }, [
          h('line', { key: 'g', x1: pad, y1: H - 12, x2: W - pad, y2: H - 12, stroke: T.ground, strokeWidth: 2 })
        ].concat(blocks.map(function (b) {
          return h('rect', {
            key: b.col + '_' + b.row,
            x: pad + (b.col - ext.minCol) * size + 1,
            y: H - 12 - (b.row + 1) * size + 1,
            width: size - 2, height: size - 2, rx: 2,
            fill: b.state === 'breached' ? T.ground : fillFor(b),
            stroke: b.state === 'breached' ? T.border : (b.arch ? T.accent : 'none'),
            strokeWidth: 1,
            strokeDasharray: b.state === 'breached' ? '2 2' : null,
            opacity: b.state === 'breached' ? 0.35 : 1
          });
        })));
      }

      function renderSiege() {
        var blocks = currentWall();
        var summary = _machineMath.wallSummary(blocks);
        // DERIVED, not read from d.breached: a wall restored from a snapshot or
        // replaced by an import carries block states but not the flag, and
        // reported itself intact while standing wide open.
        var wallBreached = _machineMath.isBreached(blocks);
        var ext = _machineMath.wallExtent(blocks);
        // The wall scene is rebuilt only when the wall's IDENTITY changes
        // (which preset, how big, what theme). A shot changes block states, and
        // those ride in on the same push and are applied by the tick without a
        // teardown. static:true means that tick runs once per push, never at
        // 60 fps on an idle wall.
        var wCam = camFor('wall');
        var siegeGlStatus = SIEGE_GL.status();
        SIEGE_GL.onStatusChange(function () { upd('glTick', (d.glTick || 0) + 1); });
        function beginWallOrbit(ev) {
          if (!ev || ev.button !== 0 || ev.pointerType === 'touch') return;
          WALL_DRAG = {
            id: ev.pointerId, x: ev.clientX, y: ev.clientY,
            rotY: wCam.rotY, rotX: wCam.rotX, zoom: wCam.zoom
          };
          try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) {}
          ev.currentTarget.style.cursor = 'grabbing';
          if (ev.preventDefault) ev.preventDefault();
        }
        function moveWallOrbit(ev) {
          if (!WALL_DRAG || !ev || ev.pointerId !== WALL_DRAG.id) return;
          var dx = ev.clientX - WALL_DRAG.x, dy = ev.clientY - WALL_DRAG.y;
          wCam.setView(WALL_DRAG.rotY - dx * 0.28, WALL_DRAG.rotX + dy * 0.22, WALL_DRAG.zoom);
          if (ev.preventDefault) ev.preventDefault();
        }
        function endWallOrbit(ev) {
          if (!WALL_DRAG || !ev || ev.pointerId !== WALL_DRAG.id) return;
          try { ev.currentTarget.releasePointerCapture(ev.pointerId); } catch (e) {}
          ev.currentTarget.style.cursor = 'grab'; WALL_DRAG = null;
        }
        // The signature decides when the scene is REBUILT rather than updated.
        // Standoff and machine identity belong in it because both change the
        // geometry of the field; block states do not, because those ride in on
        // the same push and are applied by the tick without a teardown.
        SIEGE_GL.push({
          sig: [d.wallPreset || 'curtain', blocks.length, ext ? ext.cols : 0, ext ? ext.rows : 0,
                machineId, Math.round(d.standoff), d.beamLong, d.beamShort, d.slingLength,
                d.cwMass, d.cwDrop, d.torsionArmLength, d.torsionDraw, d.onagerSling,
                d.projDiameter, preview ? preview.range : '', preview ? preview.apex : '',
                preview ? preview.drift : '', preview && preview.path ? preview.path.length : 0,
                d.siegeFraming || 'field', reducedMotion, isDark, isContrast].join('|'),
          // A shot in the air needs frames. Everything else is render-on-demand.
          static: !d.siegeFlight || reducedMotion,
          reduced: reducedMotion,
          rotY: wCam.rotY, rotX: wCam.rotX, zoom: wCam.zoom,
          blocks: blocks,
          // Drawn instead of `blocks` until the stone lands: a wall that broke
          // while the stone was still halfway there would read as a cheat.
          prevBlocks: d.siegeFlight ? d.siegeFlight.before : null,
          flight: d.siegeFlight || null,
          previewPath: preview && preview.path ? preview.path : null,
          standoff: d.standoff,
          framing: d.siegeFraming || 'field',
          kind: machineId,
          releaseAngle: d.releaseAngle,
          muzzleV: preview ? preview.muzzleV : 0,
          projDiameter: d.projDiameter,
          dark: isDark, contrast: isContrast,
          geom: {
            beamLong: d.beamLong, beamShort: d.beamShort,
            slingLength: (machineId === 'onager') ? d.onagerSling : d.slingLength,
            cwMass: d.cwMass, cwDrop: d.cwDrop, projDiameter: d.projDiameter,
            armLength: d.torsionArmLength, drawLength: d.torsionDraw
          }
        });

        var presetMeta = WALL_PRESETS[0];
        if (d.wallPreset === 'imported') {
          presetMeta = {
            id: 'imported', icon: '🏗️',
            label: __alloT('stem.machinelab.wall_imported', 'Your own build'),
            lesson: __alloT('stem.machinelab.wall_imported_l', 'This is the castle you built in Architecture Studio, seen face on. Depth counts as strength here: where you stacked the wall thicker, it takes proportionally more energy to break through.')
          };
        } else {
          for (var wi = 0; wi < WALL_PRESETS.length; wi++) {
            if (WALL_PRESETS[wi].id === (d.wallPreset || 'curtain')) { presetMeta = WALL_PRESETS[wi]; break; }
          }
        }

        return h('div', { key: 'siegeview' }, [
          h('div', {
            key: 'presets', role: 'group',
            'aria-label': __alloT('stem.machinelab.aria_targets', 'Choose a target'),
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }
          }, WALL_PRESETS.map(function (wp) {
            var on = wp.id === (d.wallPreset || 'curtain');
            return h('button', {
              key: wp.id, 'aria-pressed': on ? 'true' : 'false',
              onClick: function () { resetWall(wp.id); },
              style: {
                padding: '7px 13px', borderRadius: 999, cursor: 'pointer',
                border: '1px solid ' + (on ? T.accent : T.border),
                background: on ? T.accent : T.card,
                color: on ? T.accentInk : T.text, fontSize: 13, fontWeight: 700
              }
            }, wp.icon + ' ' + wp.label);
          }).concat(canImport ? [
            h('button', {
              key: '_import',
              'aria-pressed': (d.wallPreset === 'imported') ? 'true' : 'false',
              onClick: importArch,
              style: {
                padding: '7px 13px', borderRadius: 999, cursor: 'pointer',
                border: '1px dashed ' + ((d.wallPreset === 'imported') ? T.accent : T.border),
                background: (d.wallPreset === 'imported') ? T.accent : T.card,
                color: (d.wallPreset === 'imported') ? T.accentInk : T.text,
                fontSize: 13, fontWeight: 700
              }
            }, '🏗️ ' + __alloT('stem.machinelab.import_arch', 'Your own build'))
          ] : [])),

          h('div', {
            key: 'grid',
            style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 12 }
          }, [
            h('div', { key: 'l' }, [
              oddStoneNote('siegeodd'),
              card([
                // Same wrapper pattern as the machine bay: the camera row goes
                // full screen with the wall so it stays steerable.
                h('div', {
                  key: 'fswrap',
                  ref: wallFsRef,
                  style: { display: 'flex', flexDirection: 'column', background: T.card }
                }, [
                h('div', {
                  key: 'gl',
                  ref: siegeGlRef,
                  role: 'img', 'data-ml-orbitable': 'true',
                  onPointerDown: beginWallOrbit, onPointerMove: moveWallOrbit,
                  onPointerUp: endWallOrbit, onPointerCancel: endWallOrbit,
                  'aria-label': __alloT('stem.machinelab.aria_wall3d', 'Three-dimensional view of the target wall. Drag with a mouse or pen to orbit. The diagram and course table below carry the same information.'),
                  style: {
                    width: '100%', height: 'clamp(340px, 48vh, 500px)', minHeight: 260, flex: '1 1 auto',
                    borderRadius: 10, background: T.bg, border: '1px solid ' + T.border,
                    cursor: 'grab', userSelect: 'none'
                  }
                }, null),
                camControls(wCam, presetMeta ? presetMeta.label : 'wall', 'wall'),
                // Which shot to compose. Inside the full-screen wrapper, so a
                // student watching a hit can change the view without leaving.
                h('div', {
                  key: 'fram', role: 'group',
                  'aria-label': __alloT('stem.machinelab.framing_group', 'Camera framing'),
                  style: {
                    display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center',
                    marginTop: 6, background: T.card, borderRadius: 8, padding: '4px 6px'
                  }
                }, [
                  h('span', { key: 'l', style: { fontSize: 11, color: T.dim, marginRight: 2 } },
                    __alloT('stem.machinelab.framing_label', 'Shot:'))
                ].concat([
                  { id: 'field', label: __alloT('stem.machinelab.fram_field', 'Whole field') },
                  { id: 'castle', label: __alloT('stem.machinelab.fram_castle', 'Castle') },
                  { id: 'machine', label: __alloT('stem.machinelab.fram_machine', 'Machine') }
                ].map(function (f) {
                  var on = (d.siegeFraming || 'field') === f.id;
                  return h('button', {
                    key: f.id,
                    type: 'button',
                    'aria-pressed': on ? 'true' : 'false',
                    onClick: function () { upd('siegeFraming', f.id); },
                    style: {
                      padding: '3px 9px', borderRadius: 7, cursor: 'pointer',
                      border: '1px solid ' + (on ? T.accent : T.border),
                      background: on ? T.accent : T.card,
                      color: on ? T.accentInk : T.text,
                      fontSize: 11, fontWeight: 700
                    }
                  }, f.label);
                })))
                ]),
                siegeGlStatus !== 'ready' ? h('p', {
                  key: 'st', style: { margin: '8px 0 0', fontSize: 12, color: T.dim }
                }, siegeGlStatus === 'failed'
                  ? __alloT('stem.machinelab.wall_gl_failed', '3D wall unavailable. The diagram below is the same wall.')
                  : __alloT('stem.machinelab.wall_gl_loading', 'Loading the 3D wall...')) : null
              ], 'wallgl'),
              card([
                h('div', {
                  key: 'w', role: 'img',
                  'aria-label': presetMeta.label + '. ' +
                    summary.intact + __alloT('stem.machinelab.aria_intact', ' blocks intact, ') +
                    summary.cracked + __alloT('stem.machinelab.aria_cracked', ' cracked, ') +
                    summary.breached + __alloT('stem.machinelab.aria_gone', ' gone.') +
                    (wallBreached ? ' ' + __alloT('stem.machinelab.aria_breach', 'The wall is breached.') : '')
                }, wallGraphic(blocks)),
                h('div', {
                  key: 'legend',
                  style: { display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8, fontSize: 11, color: T.dim }
                }, [
                  h('span', { key: '1' }, __alloT('stem.machinelab.legend_intact', 'intact ') + summary.intact),
                  h('span', { key: '2' }, __alloT('stem.machinelab.legend_cracked', 'cracked ') + summary.cracked),
                  h('span', { key: '3' }, __alloT('stem.machinelab.legend_gone', 'gone ') + summary.breached)
                ])
              ], 'wallcard'),

              card([
                h('h4', { key: 'h', style: { margin: '0 0 4px', fontSize: 14, color: T.text } }, presetMeta.label),
                h('p', { key: 'p', style: { margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.55 } }, presetMeta.lesson)
              ], 'walllesson'),

              card([
                h('button', {
                  key: 'loose',
                  onClick: loose,
                  disabled: !!wallBreached || !!d.siegeFlight,
                  style: {
                    padding: '11px 22px', borderRadius: 10,
                    cursor: (wallBreached || d.siegeFlight) ? 'default' : 'pointer',
                    border: '1px solid ' + ((wallBreached || d.siegeFlight) ? T.border : T.accent),
                    background: (wallBreached || d.siegeFlight) ? T.card : T.accent,
                    color: (wallBreached || d.siegeFlight) ? T.dim : T.accentInk, fontSize: 15, fontWeight: 800,
                    marginRight: 8
                  }
                }, wallBreached
                  ? __alloT('stem.machinelab.breached_btn', 'Breached')
                  : (d.siegeFlight ? __alloT('stem.machinelab.in_flight', 'In flight…') : __alloT('stem.machinelab.loose', 'Loose!'))),
                h('button', {
                  key: 'reset',
                  onClick: function () { resetWall(d.wallPreset); },
                  style: {
                    padding: '11px 18px', borderRadius: 10, cursor: 'pointer',
                    border: '1px solid ' + T.border, background: T.card, color: T.text,
                    fontSize: 14, fontWeight: 700
                  }
                }, __alloT('stem.machinelab.rebuild', 'Rebuild the wall')),
                d.siegeFeedback ? h('p', {
                  key: 'fb', role: 'status',
                  style: {
                    margin: '10px 0 0', fontSize: 13, fontWeight: 600, lineHeight: 1.5,
                    color: d.siegeFeedback.ok ? T.ok : T.text
                  }
                }, d.siegeFeedback.message) : null,
                wallBreached ? h('p', {
                  key: 'win',
                  style: { margin: '10px 0 0', fontSize: 14, fontWeight: 800, color: T.ok }
                }, __alloT('stem.machinelab.breach_in', 'Breached in ') + (d.shotsFired || 0) +
                   __alloT('stem.machinelab.breach_shots', ' shots, for ') +
                   fmt((d.totalCrankWork || 0) / 1000, 0) +
                   __alloT('stem.machinelab.breach_kj', ' kJ of crank work.')) : null
              ], 'firecard')
            ]),

            h('div', { key: 'r' }, [
              card([
                h('h4', { key: 'h', style: { margin: '0 0 8px', fontSize: 14, color: T.text } },
                  __alloT('stem.machinelab.siege_stats', 'The siege')),
                h('div', { key: 'rows', style: { display: 'grid', gap: 5 } }, [
                  [__alloT('stem.machinelab.st_shots', 'Shots loosed'), String(d.shotsFired || 0)],
                  [__alloT('stem.machinelab.st_work', 'Total crank work'), fmt((d.totalCrankWork || 0) / 1000, 1) + ' kJ'],
                  [__alloT('stem.machinelab.st_reach', 'This machine reaches'), preview ? fmt(preview.range, 1) + ' m' : '—'],
                  [__alloT('stem.machinelab.st_wallh', 'Wall height'), ext ? fmt(ext.rows, 0) + ' m' : '—']
                ].concat(preview && d.standoff > preview.range ? [[
                  __alloT('stem.machinelab.st_short', 'Short by'), fmt(d.standoff - preview.range, 1) + ' m', true
                ]] : []).map(function (r, i) {
                  return h('div', {
                    key: i,
                    style: { display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 }
                  }, [
                    h('span', { key: 'k', style: { color: T.muted } }, r[0]),
                    h('span', { key: 'v', style: { color: r[2] ? T.warn : T.text, fontWeight: 700, fontVariantNumeric: 'tabular-nums' } }, r[1])
                  ]);
                })),
                h('div', { key: 'so', style: { marginTop: 10 } }, [
                  slider({ key: 'standoff', label: __alloT('stem.machinelab.standoff', 'Standoff from the wall'), min: 20, max: 300, step: 5, unit: 'm' }),
                  windControl()
                ])
              ], 'stats'),

              d.lastImpact && d.lastImpact.outcome === 'hit' ? card([
                h('h4', { key: 'h', style: { margin: '0 0 6px', fontSize: 14, color: T.text } },
                  __alloT('stem.machinelab.last_blow', 'The last blow')),
                h('p', { key: 'a', style: { margin: '0 0 4px', fontSize: 13, color: T.text } },
                  __alloT('stem.machinelab.blow_energy', 'Energy delivered: ') + fmt(d.lastImpact.ke, 0) + ' J'),
                d.lastImpact.energyDensity ? h('p', { key: 'b', style: { margin: '0 0 6px', fontSize: 13, color: T.text } },
                  __alloT('stem.machinelab.blow_density', 'Concentrated into: ') + fmt(d.lastImpact.energyDensity / 1000, 0) +
                  __alloT('stem.machinelab.blow_density2', ' kJ per square metre')) : null,
                h('p', { key: 'c', style: { margin: 0, fontSize: 12, color: T.dim, lineHeight: 1.5 } },
                  __alloT('stem.machinelab.budget_note', 'Damage here is scored on total energy absorbed against a per-block budget. Those budgets are order-of-magnitude classroom values, not a prediction of how real masonry fails.'))
              ], 'blow') : null,

              card([
                h('div', {
                  key: 'hd',
                  style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }
                }, [
                  h('h4', { key: 'h', style: { margin: 0, fontSize: 14, color: T.text } },
                    __alloT('stem.machinelab.wall_state', 'Wall state')),
                  h('button', {
                    key: 'tog', 'aria-pressed': d.wallAsTable ? 'true' : 'false',
                    onClick: function () { upd('wallAsTable', !d.wallAsTable); },
                    style: {
                      padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
                      border: '1px solid ' + T.border, background: T.card, color: T.muted,
                      fontSize: 11, fontWeight: 700
                    }
                  }, d.wallAsTable
                    ? __alloT('stem.machinelab.hide_courses', 'Hide courses')
                    : __alloT('stem.machinelab.show_courses', 'Show courses'))
                ]),
                // Course-by-course text equivalent of the wall picture. Always
                // in the markup so a screen-reader user is never told less than
                // a sighted one; the toggle only controls visual bulk.
                h('div', { style: d.wallAsTable ? null : srOnlyStyle },
                  h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12, color: T.text } }, [
                    h('caption', { key: 'cap', style: srOnlyStyle },
                      __alloT('stem.machinelab.wall_caption', 'Condition of each course, counting up from the ground')),
                    h('thead', { key: 'th' }, h('tr', null, [
                      h('th', { key: '1', scope: 'col', style: { textAlign: 'left', padding: 3 } }, __alloT('stem.machinelab.col_course', 'Course')),
                      h('th', { key: '2', scope: 'col', style: { textAlign: 'right', padding: 3 } }, __alloT('stem.machinelab.legend_intact2', 'Intact')),
                      h('th', { key: '3', scope: 'col', style: { textAlign: 'right', padding: 3 } }, __alloT('stem.machinelab.legend_cracked2', 'Cracked')),
                      h('th', { key: '4', scope: 'col', style: { textAlign: 'right', padding: 3 } }, __alloT('stem.machinelab.legend_gone2', 'Gone'))
                    ])),
                    h('tbody', { key: 'tb' }, (function () {
                      var rows = {};
                      blocks.forEach(function (b) {
                        if (!rows[b.row]) rows[b.row] = { i: 0, c: 0, g: 0 };
                        if (b.state === 'breached') rows[b.row].g++;
                        else if (b.state === 'cracked') rows[b.row].c++;
                        else rows[b.row].i++;
                      });
                      return Object.keys(rows).map(Number).sort(function (a, b) { return b - a; }).map(function (r) {
                        return h('tr', { key: r }, [
                          h('th', { key: '1', scope: 'row', style: { textAlign: 'left', padding: 3, fontWeight: 600 } }, String(r + 1)),
                          h('td', { key: '2', style: { textAlign: 'right', padding: 3 } }, String(rows[r].i)),
                          h('td', { key: '3', style: { textAlign: 'right', padding: 3 } }, String(rows[r].c)),
                          h('td', { key: '4', style: { textAlign: 'right', padding: 3 } }, String(rows[r].g))
                        ]);
                      });
                    })())
                  ]))
              ], 'wallstate')
            ])
          ])
        ]);
      }

      // ── Work record ──
      //
      // The tool accumulates a lot of evidence of thinking (benches proven,
      // prediction streak, shots logged, a siege result, a written hypothesis
      // and explanation) and had nowhere to show it. A student finishing a
      // session had nothing to hand anyone. This gathers it into one readable
      // record; it is a summary of what the student did, not a mark.
      function workRecord() {
        var proven = Object.keys(d.provenBenches || {});
        var fired = d.machinesFired || [];
        var log = d.shotHistory || [];
        var best = null;
        log.forEach(function (r) { if (best === null || r.range > best.range) best = r; });

        var lines = [];
        lines.push(__alloT('stem.machinelab.rec_l1', 'Benches proven: ') + proven.length + '/6' +
          (proven.length ? ' (' + proven.join(', ') + ')' : ''));
        lines.push(__alloT('stem.machinelab.rec_l2', 'Best prediction streak: ') + (d.benchStreak || 0));
        lines.push(__alloT('stem.machinelab.rec_l3', 'Machines fired: ') +
          (fired.length ? fired.join(', ') : __alloT('stem.machinelab.rec_none', 'none yet')));
        // If the furthest shot is itself the impossible one, say so on that
        // line. The counted note below is four lines further down, and a
        // skimming reader takes the headline number at face value.
        var bestRho = best ? _machineMath.density(best.projMass, best.projDiameter) : null;
        var bestOdd = bestRho !== null && (bestRho < 1400 || bestRho > 4200);
        lines.push(__alloT('stem.machinelab.rec_l4', 'Shots logged: ') + log.length +
          (best ? __alloT('stem.machinelab.rec_best', '; furthest was ') + fmt(best.range, 1) +
                  __alloT('stem.machinelab.rec_best2', ' m with a ') + fmt(best.projMass, 0) + ' kg stone' +
                  (bestOdd ? __alloT('stem.machinelab.rec_best_odd', ', which was not a real rock') : '') : ''));
        if (d.shotsFired) {
          lines.push(__alloT('stem.machinelab.rec_l5', 'Siege: ') + (d.wallPreset || 'curtain') + ', ' +
            d.shotsFired + __alloT('stem.machinelab.rec_l5b', ' shots, ') +
            fmt((d.totalCrankWork || 0) / 1000, 1) + __alloT('stem.machinelab.rec_l5c', ' kJ of crank work') +
            (_machineMath.isBreached(currentWall())
              ? __alloT('stem.machinelab.rec_breached', ', breached') : __alloT('stem.machinelab.rec_held', ', wall held')));
        }
        // Running the best-stone search is a real piece of investigation, and
        // the record showed no sign of it. Report what it found rather than
        // just that it happened, so the line is evidence and not a tick.
        var sweep = d.bestStones;
        if (sweep && sweep.results) {
          var found = MACHINES
            .filter(function (mm) { return !!sweep.results[mm.id]; })
            .map(function (mm) {
              var r = sweep.results[mm.id];
              return machineLabel(mm.id) + ' ' + fmt(r.m, r.m < 10 ? 1 : 0) + ' kg';
            });
          if (found.length) {
            lines.push(__alloT('stem.machinelab.rec_sweep', 'Best stone searched for: ') + found.join(', ') +
              __alloT('stem.machinelab.rec_sweep2', ' (each machine wants a different one)'));
          }
        }

        // The record is what leaves the tool and reaches a teacher. Reporting
        // a furthest throw made by an object no material could form, with no
        // note, is the tool vouching for a number it flagged on screen. Older
        // rows have no diameter, so an unknown density is left unremarked
        // rather than guessed at.
        var impossible = log.filter(function (r) {
          var rho = _machineMath.density(r.projMass, r.projDiameter);
          return rho !== null && (rho < 1400 || rho > 4200);
        }).length;
        if (impossible) {
          lines.push(__alloT('stem.machinelab.rec_odd', 'Note: ') + impossible +
            (impossible === 1
              ? __alloT('stem.machinelab.rec_odd1', ' of those shots used a stone whose weight and size do not match any real rock, so its range is not a real one.')
              : __alloT('stem.machinelab.rec_odd2', ' of those shots used stones whose weight and size do not match any real rock, so those ranges are not real ones.')));
        }

        if (d.iqHypothesis) lines.push(__alloT('stem.machinelab.rec_hyp', 'Hypothesis: ') + d.iqHypothesis);
        if (d.iqExplanation) lines.push(__alloT('stem.machinelab.rec_exp', 'Explanation: ') + d.iqExplanation);

        var asText = __alloT('stem.machinelab.rec_head', 'Machine Lab — work record') + '\n' +
          __alloT('stem.machinelab.rec_level', 'Reading level: ') + BAND_LABELS[band] + '\n' +
          lines.join('\n');

        return h('div', { key: 'record' }, [
          h('p', { key: 'i', style: { margin: '0 0 10px', fontSize: 14, lineHeight: 1.6, color: T.muted } },
            __alloT('stem.machinelab.rec_intro', 'Everything you have done in this session, gathered in one place. It is a record of your work, not a mark, and nothing here is scored.')),
          h('ul', { key: 'l', style: { listStyle: 'none', margin: '0 0 10px', padding: 0 } },
            lines.map(function (t, i) {
              return h('li', {
                key: i,
                style: {
                  padding: '6px 0', fontSize: 13, color: T.text, lineHeight: 1.55,
                  borderTop: i ? '1px solid ' + T.border : 'none'
                }
              }, t);
            })),
          h('div', { key: 'acts', style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } }, [
            (typeof navigator !== 'undefined' && navigator.clipboard) ? h('button', {
              key: 'copy',
              onClick: function () {
                try {
                  navigator.clipboard.writeText(asText).then(function () {
                    addToast('📋 ' + __alloT('stem.machinelab.rec_copied', 'Work record copied.'));
                  }).catch(function () {
                    addToast(__alloT('stem.machinelab.rec_copyfail', 'Could not copy. Select the text and copy it by hand.'));
                  });
                } catch (e) {
                  addToast(__alloT('stem.machinelab.rec_copyfail', 'Could not copy. Select the text and copy it by hand.'));
                }
              },
              style: {
                padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                border: '1px solid ' + T.border, background: T.card, color: T.text,
                fontSize: 12, fontWeight: 700
              }
            }, '📋 ' + __alloT('stem.machinelab.rec_copy', 'Copy this record')) : null,
            readAloud(asText, 'rectts')
          ])
        ]);
      }

      // ── Inquiry widget ──
      //
      // House pattern (see stem_tool_atctower.js and friends): a hypothesis, an
      // opt-in "I'm stuck" that reveals OPEN QUESTIONS rather than answers, a
      // self-assessed explanation, and the signature disclaimer. Every other
      // surface in this tool grades you against a number; nothing invited a
      // student to form a theory in their own words. The Compare view is where
      // that belongs, because "which machine is better" genuinely has no single
      // right answer: it depends on the stone.
      function inquiryWidget() {
        var iqBox = {
          width: '100%', padding: 7, borderRadius: 8, fontSize: 13,
          border: '1px solid ' + T.border, background: T.bg, color: T.text,
          resize: 'vertical', marginBottom: 10, fontFamily: 'inherit'
        };
        return card([
          h('h4', { key: 'h', style: { margin: '0 0 8px', fontSize: 14, color: T.text } },
            '🔬 ' + __alloT('stem.machinelab.iq_title', 'Build your own theory')),

          h('label', {
            key: 'hl', htmlFor: 'ml-iq-hyp',
            style: { display: 'block', fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }
          }, pick({
            k2: __alloT('stem.machinelab.iq_q_k2', 'Which machine do you think throws best? Say why.'),
            g35: __alloT('stem.machinelab.iq_q_g35', 'Your hypothesis: which machine throws a very light stone furthest, and which throws a very heavy one furthest?'),
            g68: __alloT('stem.machinelab.iq_q', 'Your hypothesis: which machine throws a 5 kg stone furthest, and which a 200 kg stone? What in the ledger makes you think so?'),
            g912: __alloT('stem.machinelab.iq_q_g912', 'Your hypothesis: predict the ordering of the three machines by range at 5 kg and at 200 kg, and say which term in m_p/(m_p + m_eff) decides each case.')
          }, band)),
          h('textarea', {
            key: 'hyp', id: 'ml-iq-hyp', rows: 3, style: iqBox,
            value: d.iqHypothesis || '',
            'aria-label': __alloT('stem.machinelab.iq_aria_hyp', 'Your hypothesis about the three machines'),
            placeholder: __alloT('stem.machinelab.iq_ph', 'Write what you expect, before you test it...'),
            onChange: function (e) { upd('iqHypothesis', e.target.value); }
          }),

          h('button', {
            key: 'log',
            onClick: function () {
              var entry = { projMass: d.projMass, rows: MACHINES.map(function (mm) {
                var sh = _machineMath.shot(inputsFor(mm.id));
                return { id: mm.id, range: sh ? sh.range : null, eta: sh ? sh.eta : null };
              }) };
              upd('iqLog', (d.iqLog || []).slice(-5).concat([entry]));
            },
            style: {
              padding: '6px 12px', borderRadius: 8, cursor: 'pointer', marginRight: 8,
              border: '1px solid ' + T.border, background: T.card, color: T.text,
              fontSize: 12, fontWeight: 700
            }
          }, '📋 ' + __alloT('stem.machinelab.iq_log', 'Log this comparison')),

          !d.iqStuck ? h('button', {
            key: 'stuck',
            onClick: function () { upd('iqStuck', true); },
            style: {
              padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
              border: '1px solid ' + T.border, background: T.card, color: T.text,
              fontSize: 12, fontWeight: 700
            }
          }, '🤔 ' + __alloT('stem.machinelab.iq_stuck', "I'm stuck — show open questions")) : null,

          (d.iqLog && d.iqLog.length) ? h('table', {
            key: 'tbl',
            style: { width: '100%', borderCollapse: 'collapse', fontSize: 12, color: T.text, marginTop: 10 }
          }, [
            h('caption', { key: 'c', style: srOnlyStyle },
              __alloT('stem.machinelab.iq_log_caption', 'Comparisons you have logged, by stone mass')),
            h('thead', { key: 'th' }, h('tr', null, [
              h('th', { key: '0', scope: 'col', style: { textAlign: 'left', padding: 3 } }, __alloT('stem.machinelab.col_stone2', 'Stone')),
              h('th', { key: '1', scope: 'col', style: { textAlign: 'right', padding: 3 } }, __alloT('stem.machinelab.machine_trebuchet', 'Trebuchet')),
              h('th', { key: '2', scope: 'col', style: { textAlign: 'right', padding: 3 } }, __alloT('stem.machinelab.machine_ballista', 'Ballista')),
              h('th', { key: '3', scope: 'col', style: { textAlign: 'right', padding: 3 } }, __alloT('stem.machinelab.machine_onager', 'Onager'))
            ])),
            h('tbody', { key: 'tb' }, (d.iqLog || []).slice(-5).map(function (e, i) {
              return h('tr', { key: i }, [
                h('th', { key: 'k', scope: 'row', style: { textAlign: 'left', padding: 3, fontWeight: 600 } }, fmt(e.projMass, 0) + ' kg')
              ].concat(e.rows.map(function (r, j) {
                return h('td', { key: j, style: { textAlign: 'right', padding: 3, fontVariantNumeric: 'tabular-nums' } },
                  r.range === null ? '—' : fmt(r.range, 0) + ' m');
              })));
            }))
          ]) : null,

          d.iqStuck ? h('div', {
            key: 'open',
            style: {
              marginTop: 10, padding: 9, borderRadius: 8,
              border: '1px dashed ' + T.border, background: T.bg
            }
          }, [
            h('div', { key: 't', style: { fontSize: 12, fontWeight: 800, color: T.accent, marginBottom: 4 } },
              __alloT('stem.machinelab.iq_open', 'Open questions (no answer key)')),
            h('ul', { key: 'l', style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.65 } }, [
              h('li', { key: '1' }, __alloT('stem.machinelab.iq_o1', 'Does the machine that stores the most energy also deliver the most to the stone? Should it?')),
              h('li', { key: '2' }, __alloT('stem.machinelab.iq_o2', 'The onager stores half what the ballista does. Why is its efficiency higher anyway?')),
              h('li', { key: '3' }, __alloT('stem.machinelab.iq_o3', 'Is there a stone mass at which the ordering of the three machines changes? How would you find it?')),
              h('li', { key: '4' }, __alloT('stem.machinelab.iq_o4', 'Making the arm lighter raises efficiency. What do you think stops a real engineer doing that indefinitely?')),
              h('li', { key: '5' }, __alloT('stem.machinelab.iq_o5', 'If you turned the air off, would your answer change? Try it and say why.'))
            ])
          ]) : null,

          h('label', {
            key: 'und',
            style: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, color: T.text, cursor: 'pointer', marginTop: 10 }
          }, [
            h('input', {
              key: 'cb', type: 'checkbox', checked: !!d.iqUnderstood,
              onChange: function (e) { upd('iqUnderstood', !!e.target.checked); }
            }),
            h('span', { key: 's' }, __alloT('stem.machinelab.iq_can_explain', 'I can explain, in my own words, why these three machines rank the way they do.'))
          ]),
          d.iqUnderstood ? h('textarea', {
            key: 'exp', rows: 3, style: Object.assign({}, iqBox, { marginTop: 8 }),
            value: d.iqExplanation || '',
            'aria-label': __alloT('stem.machinelab.iq_aria_exp', 'Your explanation in your own words'),
            placeholder: __alloT('stem.machinelab.iq_exp_ph', 'Explain in your own words...'),
            onChange: function (e) { upd('iqExplanation', e.target.value); }
          }) : null,

          h('p', {
            key: 'sig',
            style: { margin: '8px 0 0', fontSize: 11, fontStyle: 'italic', color: T.dim, lineHeight: 1.5 }
          }, __alloT('stem.machinelab.iq_sig', 'Inquiry widget — no score, no reveal, no answer dump. Nothing here is marked, and the tool will not tell you the answer. The numbers in the table are the tool’s simplified model, not a measurement of any real machine.'))
        ], 'inquiry');
      }

      // ── Compare view: three ways to store energy, one ledger ──
      // ── "Which stone should this machine throw?" ──
      //
      // A sweep is ~40 integrations per machine, ~120 in total, so it cannot
      // live in the render path: ml_render_cost.cjs holds every view under 12 ms
      // and this alone would blow that on every slider drag. So it is a button,
      // and the answer is stored. A stored answer goes stale the moment a slider
      // moves, which is worse than no answer, so the settings that fed it are
      // stored alongside and a mismatch is said out loud rather than ignored.
      function bestStoneSignature() {
        return [
          d.gravity, d.drag !== false, d.releaseAngle, d.launchElevation, d.windZ,
          d.projMass, d.projDiameter,
          d.cwMass, d.cwDrop, d.beamLong, d.beamShort, d.slingLength, d.armMass,
          d.torsionTurns, d.torsionArmLength, d.torsionDraw, d.torsionArmMass,
          d.ballistaStringMass, d.onagerSling
        ].join('|');
      }

      function runBestStoneSweep() {
        var rho = _machineMath.density(d.projMass, d.projDiameter);
        if (rho === null) {
          addToast(__alloT('stem.machinelab.sweep_nostone', 'Set a stone mass and size first.'));
          return;
        }
        var out = {};
        MACHINES.forEach(function (mm) {
          var b = _machineMath.bestStone(inputsFor(mm.id), { density: rho });
          var now = _machineMath.shot(inputsFor(mm.id));
          if (b) out[mm.id] = {
            m: b.projMass, dia: b.projDiameter, range: b.range, eta: b.eta,
            ke: b.impactKE, atBound: !!b.atBound,
            nowRange: now ? now.range : null, nowKE: now ? now.impactKE : null,
            nowEta: now ? now.eta : null
          };
        });
        updMulti({ bestStones: { density: rho, sig: bestStoneSignature(), results: out } });
        var found = Object.keys(out).length;
        var msg = found
          ? __alloT('stem.machinelab.sweep_done', 'Best stone found for ') + found +
            __alloT('stem.machinelab.sweep_done2', ' of the three machines, at the rock density you are already using.')
          : __alloT('stem.machinelab.sweep_none', 'None of the three machines can throw anything at these settings.');
        addToast(found ? '🪨 ' + msg : msg);
        announceToSR(msg);
      }

      // The whole point of this column is the gap between what the furthest
      // stone delivers and what a heavy one does. In kilojoules to one decimal
      // that gap collapses: 96 J and 141 J both print as "0.1 kJ", which reads
      // as "the same" when it is the contrast being taught.
      function energyText(j) {
        if (j == null || !isFinite(j)) return '—';
        if (j < 1000) return fmt(j, 0) + ' J';
        return fmt(j / 1000, 1) + ' kJ';
      }

      function bestStonePanel() {
        var saved = d.bestStones || null;
        var stale = !!(saved && saved.sig !== bestStoneSignature());
        var kids = [
          h('h4', { key: 'h', style: { margin: '0 0 6px', fontSize: 14, color: T.text } },
            __alloT('stem.machinelab.best_title', 'Which stone flies furthest?')),
          h('p', { key: 'p', style: { margin: '0 0 10px', fontSize: 13, color: T.muted, lineHeight: 1.55 } },
            pick({
              k2: __alloT('stem.machinelab.best_k2', 'A stone can be too heavy to throw far. It can also be too light. Press the button and each machine will try lots of stones and keep the one that goes furthest. Watch how hard it hits, though.'),
              g35: __alloT('stem.machinelab.best_g35', 'Each machine throws one size of stone furthest. Too heavy and it barely moves. Too light and the air stops it. But the stone that goes furthest is not the one that hits hardest, so look at both columns.'),
              g68: __alloT('stem.machinelab.best_g68', 'This tries many stones for each machine, keeping the rock density the same so every one of them is a real object, and reports the one that flies furthest. Furthest is not hardest: a light stone leaves fast and lands with very little energy. A siege crew wanted both, which is why they did not simply throw the furthest-flying stone.'),
              g912: __alloT('stem.machinelab.best_g912', 'The search sweeps payload mass geometrically and derives diameter from a fixed density, so mass and frontal area stay physically linked. An optimum exists because launch speed saturates at sqrt(2E/m_eff) once the payload is light against the machine inertia, while drag deceleration scales as area over mass and keeps rising as the stone shrinks. Range peaks between those limits. Impact energy does not: it falls monotonically with payload mass here, so range and delivered energy are competing objectives rather than one optimum.')
            }, band)),
          h('button', {
            key: 'go',
            type: 'button',
            onClick: runBestStoneSweep,
            style: {
              padding: '8px 14px', borderRadius: 8, border: '1px solid ' + T.accent,
              background: T.accent, color: T.accentInk, fontSize: 13, fontWeight: 700, cursor: 'pointer'
            }
          }, __alloT('stem.machinelab.best_run', 'Find the best stone for each machine'))
        ];

        if (saved && saved.results) {
          if (stale) {
            kids.push(h('p', {
              key: 'stale',
              style: { margin: '10px 0 0', fontSize: 12, color: T.warn, lineHeight: 1.5 }
            }, __alloT('stem.machinelab.best_stale', 'A setting has changed since this ran, so these numbers describe the old machines. Run it again to bring them up to date.')));
          }
          kids.push(h('div', { key: 'wrap', style: { overflowX: 'auto', marginTop: 10, opacity: stale ? 0.55 : 1 } },
            h('table', { style: { width: '100%', minWidth: 420, borderCollapse: 'collapse', fontSize: 13, color: T.text } }, [
              h('caption', { key: 'c', style: srOnlyStyle },
                // A caption that describes columns the table no longer has is
                // worse for a screen reader than no caption: it is the only
                // description they get before the numbers start.
                __alloT('stem.machinelab.best_caption2', 'For each machine: the mass and diameter of its furthest-flying stone, then that stone’s range and impact energy, each followed in brackets by the figure for the stone you are currently using')),
              h('thead', { key: 'th' }, h('tr', null, [
                h('th', { key: '1', scope: 'col', style: { textAlign: 'left', padding: 6, borderBottom: '1px solid ' + T.border } }, __alloT('stem.machinelab.col_machine', 'Machine')),
                h('th', { key: '2', scope: 'col', style: { textAlign: 'right', padding: 6, borderBottom: '1px solid ' + T.border } }, __alloT('stem.machinelab.col_beststone', 'Best stone')),
                h('th', { key: '3', scope: 'col', style: { textAlign: 'right', padding: 6, borderBottom: '1px solid ' + T.border } }, __alloT('stem.machinelab.col_across', 'Across')),
                h('th', { key: '4', scope: 'col', style: { textAlign: 'right', padding: 6, borderBottom: '1px solid ' + T.border } }, __alloT('stem.machinelab.col_range3', 'Range (yours)')),
                h('th', { key: '5', scope: 'col', style: { textAlign: 'right', padding: 6, borderBottom: '1px solid ' + T.border } }, __alloT('stem.machinelab.col_hits2', 'Lands with (yours)'))
              ])),
              h('tbody', { key: 'tb' }, MACHINES.map(function (mm) {
                var r = saved.results[mm.id];
                if (!r) {
                  return h('tr', { key: mm.id }, [
                    h('th', { key: '1', scope: 'row', style: { textAlign: 'left', padding: 6, borderBottom: '1px solid ' + T.border } },
                      mm.icon + ' ' + machineLabel(mm.id)),
                    h('td', { key: '2', colSpan: 4, style: { padding: 6, borderBottom: '1px solid ' + T.border, color: T.dim } },
                      __alloT('stem.machinelab.cmp_unbuildable', 'not a working machine at these settings'))
                  ]);
                }
                var numStyle = { padding: 6, textAlign: 'right', borderBottom: '1px solid ' + T.border, fontVariantNumeric: 'tabular-nums' };
                return h('tr', { key: mm.id }, [
                  h('th', { key: '1', scope: 'row', style: { textAlign: 'left', padding: 6, borderBottom: '1px solid ' + T.border, fontWeight: 700 } },
                    mm.icon + ' ' + machineLabel(mm.id)),
                  h('td', { key: '2', style: numStyle }, fmt(r.m, 1) + ' kg'),
                  h('td', { key: '3', style: numStyle }, fmt(r.dia, 2) + ' m'),
                  h('td', { key: '4', style: numStyle }, [
                    fmt(r.range, 1) + ' m' + (r.atBound ? ' *' : ''),
                    h('span', { key: 'y', style: { color: T.dim } },
                      r.nowRange == null ? '' : ' (' + fmt(r.nowRange, 1) + ')')
                  ]),
                  h('td', { key: '5', style: numStyle }, [
                    energyText(r.ke),
                    h('span', { key: 'y', style: { color: T.dim } },
                      r.nowKE == null ? '' : ' (' + energyText(r.nowKE) + ')')
                  ])
                ]);
              }))
            ])));
          // The stone that flies furthest wastes the most. That is the sharpest
          // statement of the range-versus-delivery tension available, and it is
          // sitting in numbers the sweep already computed.
          var effLine = null;
          if (band === 'g68' || band === 'g912') {
            var lead = null;
            MACHINES.forEach(function (mm) {
              var r = saved.results[mm.id];
              if (r && r.eta != null && r.nowEta != null && (lead === null || r.range > lead.range)) {
                lead = { id: mm.id, eta: r.eta, nowEta: r.nowEta, range: r.range };
              }
            });
            if (lead) {
              effLine = h('p', {
                key: 'eff',
                style: { margin: '8px 0 0', fontSize: 12, color: T.dim, lineHeight: 1.5 }
              }, __alloT('stem.machinelab.best_eff', 'Worth noticing: the furthest of these is the ') +
                 machineLabel(lead.id) +
                 __alloT('stem.machinelab.best_eff2', ', and its best stone takes only ') +
                 fmt(100 * lead.eta, 1) +
                 __alloT('stem.machinelab.best_eff3', '% of the stored energy, against ') +
                 fmt(100 * lead.nowEta, 1) +
                 __alloT('stem.machinelab.best_eff4', '% for the stone you are using. Throwing furthest and wasting least are pulling in opposite directions.'));
            }
          }
          if (effLine) kids.push(effLine);

          var anyBound = MACHINES.some(function (mm) {
            var r = saved.results[mm.id]; return r && r.atBound;
          });
          if (anyBound) {
            kids.push(h('p', {
              key: 'bound',
              style: { margin: '8px 0 0', fontSize: 12, color: T.muted, lineHeight: 1.5 }
            }, __alloT('stem.machinelab.best_bound', '* This machine was still improving at the lightest stone the search would try, so that row is where the search stopped rather than a real best. Treat it as "lighter than anything here".')));
          }
          kids.push(h('p', {
            key: 'rho',
            style: { margin: '8px 0 0', fontSize: 12, color: T.dim, lineHeight: 1.5 }
          }, pick({
            k2: __alloT('stem.machinelab.best_rho_k2', 'Every stone in that table is made of the same rock. Only the size changes, and a smaller stone weighs less. Yours weighs ') +
                fmt(d.projMass, d.projMass < 10 ? 1 : 0) + ' kg.',
            g35: __alloT('stem.machinelab.best_rho_g35', 'Every stone in that table is the same kind of rock. Only the size changes, and the weight follows from the size. Yours weighs ') +
                 fmt(d.projMass, d.projMass < 10 ? 1 : 0) + ' kg.',
            g68: __alloT('stem.machinelab.best_rho', 'Every stone in that table is the same rock: ') +
                 fmt(saved.density, 0) + __alloT('stem.machinelab.best_rho2', ' kg per cubic metre. Only the size changes, and the mass follows from it. Your current stone is ') +
                 fmt(d.projMass, d.projMass < 10 ? 1 : 0) + ' kg.',
            g912: __alloT('stem.machinelab.best_rho', 'Every stone in that table is the same rock: ') +
                  fmt(saved.density, 0) + __alloT('stem.machinelab.best_rho_g912', ' kg per cubic metre. Density is held fixed and diameter derived from mass, so frontal area scales as mass to the two thirds and every candidate is a physically realisable object. Your current stone is ') +
                  fmt(d.projMass, d.projMass < 10 ? 1 : 0) + ' kg.'
          }, band)));
        }
        return card(kids, 'beststone');
      }

      function renderCompare() {
        var rows = MACHINES.map(function (mm) {
          return { meta: mm, s: _machineMath.shot(inputsFor(mm.id)) };
        });
        var live = rows.filter(function (r) { return !!r.s; });
        var bestRange = null, bestEta = null;
        live.forEach(function (r) {
          if (bestRange === null || r.s.range > bestRange) bestRange = r.s.range;
          if (bestEta === null || r.s.eta > bestEta) bestEta = r.s.eta;
        });

        // A table is precise, but it makes the central comparison easy to miss:
        // the machines throw the same stone into differently shaped flights.
        // Keep this as a static SVG so it stays cheap, theme-aware and readable
        // without turning the Compare tab into another animation surface.
        function compareArcStrip() {
          var plotted = rows.filter(function (r) {
            return r.s && r.s.path && r.s.path.length > 1;
          });
          if (!plotted.length) return null;
          var W = 660, H = 208, left = 34, right = 24, top = 22, bottom = 34;
          var maxX = 0, maxY = 0;
          plotted.forEach(function (r) {
            r.s.path.forEach(function (p) {
              if (p.x > maxX) maxX = p.x;
              if (p.y > maxY) maxY = p.y;
            });
          });
          if (maxX <= 0) maxX = 1;
          if (maxY <= 0) maxY = 1;
          var sx = (W - left - right) / maxX;
          var sy = (H - top - bottom) / maxY;
          var colors = isContrast ? [T.ok, T.accent, T.text] : [T.load, T.effort, T.hint];
          function points(path) {
            return path.map(function (p) {
              return (left + p.x * sx).toFixed(1) + ',' +
                (H - bottom - p.y * sy).toFixed(1);
            }).join(' ');
          }
          var desc = __alloT('stem.machinelab.cmp_arc_aria', 'Flight comparison: ') +
            plotted.map(function (r) {
              return machineLabel(r.meta.id) + ' ' + fmt(r.s.range, 1) + ' m';
            }).join(', ') + '.';
          return h('div', {
            key: 'arcstrip', role: 'img', 'aria-label': desc,
            style: {
              margin: '4px 0 12px', padding: '10px 10px 8px',
              border: '1px solid ' + T.border, borderRadius: 10,
              background: T.bg
            }
          }, [
            h('div', {
              key: 'head',
              style: { display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 2 }
            }, [
              h('span', { key: 'title', style: { fontSize: 11, fontWeight: 800, color: T.text, letterSpacing: 0.5, textTransform: 'uppercase' } },
                __alloT('stem.machinelab.cmp_arc_title', 'Flight shapes at a glance')),
              h('span', { key: 'hint', style: { fontSize: 11, color: T.dim } },
                __alloT('stem.machinelab.cmp_arc_hint', 'same stone · same release angle'))
            ]),
            h('svg', {
              key: 'svg', viewBox: '0 0 ' + W + ' ' + H,
              style: { display: 'block', width: '100%', height: 'auto' },
              focusable: 'false', 'aria-hidden': 'true'
            }, [
              h('line', { key: 'gnd', x1: left, y1: H - bottom, x2: W - right, y2: H - bottom, stroke: T.ground, strokeWidth: 2 }),
              h('line', { key: 'mid', x1: left, y1: top + (H - top - bottom) * 0.5, x2: W - right, y2: top + (H - top - bottom) * 0.5, stroke: T.border, strokeWidth: 1, strokeDasharray: '3 5' }),
              h('text', { key: 'zero', x: left, y: H - 12, fill: T.dim, fontSize: 10 }, '0 m'),
              h('text', { key: 'max', x: W - right, y: H - 12, fill: T.dim, fontSize: 10, textAnchor: 'end' }, fmt(maxX, 0) + ' m'),
              plotted.map(function (r, i) {
                var color = colors[i % colors.length];
                var end = r.s.path[r.s.path.length - 1];
                var nearEdge = left + end.x * sx > W - right - 72;
                return h('g', { key: r.meta.id }, [
                  h('polyline', {
                    key: 'path', points: points(r.s.path), fill: 'none', stroke: color,
                    strokeWidth: 3, strokeLinejoin: 'round', strokeLinecap: 'round'
                  }),
                  h('circle', {
                    key: 'end', cx: left + end.x * sx, cy: H - bottom, r: 4,
                    fill: color, stroke: T.bg, strokeWidth: 1.5
                  }),
                  h('text', {
                    key: 'label', x: nearEdge ? W - right - 4 : left + end.x * sx + 7,
                    y: H - bottom - 8 - i * 12, fill: color, fontSize: 11,
                    fontWeight: 800, textAnchor: nearEdge ? 'end' : 'start'
                  }, r.meta.icon + ' ' + fmt(r.s.range, 0) + ' m')
                ]);
              })
            ]),
            h('div', {
              key: 'legend',
              style: { display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: T.muted }
            }, plotted.map(function (r, i) {
              return h('span', { key: r.meta.id, style: { display: 'inline-flex', alignItems: 'center', gap: 4 } }, [
                h('span', { key: 'sw', 'aria-hidden': 'true', style: { width: 18, height: 3, borderRadius: 4, background: colors[i % colors.length] } }),
                r.meta.icon + ' ' + machineLabel(r.meta.id)
              ]);
            }))
          ]);
        }

        function cell(v, hi) {
          return h('td', {
            style: {
              padding: 6, textAlign: 'right', borderBottom: '1px solid ' + T.border,
              fontVariantNumeric: 'tabular-nums',
              color: hi ? T.ok : T.text, fontWeight: hi ? 800 : 400
            }
          }, v);
        }

        return h('div', { key: 'cmpview' }, [
          card([
            h('h4', { key: 'h', style: { margin: '0 0 6px', fontSize: 15, color: T.text } },
              __alloT('stem.machinelab.compare_title', 'Three machines, one stone')),
            h('p', { key: 'p', style: { margin: '0 0 10px', fontSize: 13, color: T.muted, lineHeight: 1.55 } },
              pick({
                k2: __alloT('stem.machinelab.cmp_k2', 'Three different machines throw the same stone. One uses a falling weight. Two use twisted rope. See which one throws it furthest.'),
                g35: __alloT('stem.machinelab.cmp_g35', 'Each machine stores energy a different way, then spends it on the same stone. Compare how much energy each one stores and how much of it actually reaches the stone.'),
                g68: __alloT('stem.machinelab.cmp_g68', 'Same stone, same release angle, same air. What differs is how the energy is stored and how much of the machine has to move to deliver it. Watch the efficiency column, not just the range.'),
                g912: __alloT('stem.machinelab.cmp_g912', 'The comparison is only fair in the sense that the payload and the flight conditions match. Stored energy is not equalised, because each store has its own natural scale, so read stored energy and transfer efficiency as separate axes rather than collapsing them into range.')
              }, band)),
            compareArcStrip(),
            h('div', { key: 'wrap', style: { overflowX: 'auto' } },
              h('table', { style: { width: '100%', minWidth: 460, borderCollapse: 'collapse', fontSize: 13, color: T.text } }, [
                // Screen-reader text is text: it follows the band like the rest.
                h('caption', { key: 'cap', style: srOnlyStyle },
                  pick({
                    k2: __alloT('stem.machinelab.cmp_caption_k2', 'How much energy each machine stores, how much of it reaches the stone, how fast the stone leaves and how far it goes'),
                    g35: __alloT('stem.machinelab.cmp_caption_k2', 'How much energy each machine stores, how much of it reaches the stone, how fast the stone leaves and how far it goes'),
                    g68: __alloT('stem.machinelab.cmp_caption', 'Stored energy, transfer efficiency, launch speed and range for each machine'),
                    g912: __alloT('stem.machinelab.cmp_caption', 'Stored energy, transfer efficiency, launch speed and range for each machine')
                  }, band)),
                h('thead', { key: 'th' }, h('tr', null, [
                  h('th', { key: '1', scope: 'col', style: { textAlign: 'left', padding: 6, borderBottom: '1px solid ' + T.border } }, __alloT('stem.machinelab.col_machine', 'Machine')),
                  h('th', { key: '2', scope: 'col', style: { textAlign: 'left', padding: 6, borderBottom: '1px solid ' + T.border } }, __alloT('stem.machinelab.col_store', 'Energy store')),
                  h('th', { key: '3', scope: 'col', style: { textAlign: 'right', padding: 6, borderBottom: '1px solid ' + T.border } }, __alloT('stem.machinelab.col_stored', 'Stored')),
                  h('th', { key: '4', scope: 'col', style: { textAlign: 'right', padding: 6, borderBottom: '1px solid ' + T.border } }, __alloT('stem.machinelab.col_eff2', 'To the stone')),
                  h('th', { key: '5', scope: 'col', style: { textAlign: 'right', padding: 6, borderBottom: '1px solid ' + T.border } }, __alloT('stem.machinelab.col_launch', 'Launch')),
                  h('th', { key: '6', scope: 'col', style: { textAlign: 'right', padding: 6, borderBottom: '1px solid ' + T.border } }, __alloT('stem.machinelab.col_range2', 'Range'))
                ])),
                h('tbody', { key: 'tb' }, rows.map(function (r) {
                  var storeLabel = r.meta.store === 'gravity'
                    ? __alloT('stem.machinelab.store_gravity', 'falling weight')
                    : __alloT('stem.machinelab.store_torsion', 'twisted rope');
                  if (!r.s) {
                    return h('tr', { key: r.meta.id }, [
                      h('th', { key: '1', scope: 'row', style: { textAlign: 'left', padding: 6, borderBottom: '1px solid ' + T.border } },
                        r.meta.icon + ' ' + machineLabel(r.meta.id)),
                      h('td', { key: '2', colSpan: 5, style: { padding: 6, borderBottom: '1px solid ' + T.border, color: T.dim } },
                        __alloT('stem.machinelab.cmp_unbuildable', 'not a working machine at these settings'))
                    ]);
                  }
                  return h('tr', { key: r.meta.id }, [
                    h('th', { key: '1', scope: 'row', style: { textAlign: 'left', padding: 6, borderBottom: '1px solid ' + T.border, fontWeight: 700 } },
                      r.meta.icon + ' ' + machineLabel(r.meta.id)),
                    h('td', { key: '2', style: { padding: 6, borderBottom: '1px solid ' + T.border, color: T.dim } }, storeLabel),
                    cell(fmt(r.s.stored, 0) + ' J', false),
                    cell(fmt(100 * r.s.eta, 1) + '%', bestEta !== null && Math.abs(r.s.eta - bestEta) < 1e-12),
                    cell(fmt(r.s.muzzleV, 1) + ' m/s', false),
                    cell(fmt(r.s.range, 1) + ' m', bestRange !== null && Math.abs(r.s.range - bestRange) < 1e-12)
                  ]);
                }))
              ])),
            h('p', { key: 'note', style: { margin: '10px 0 0', fontSize: 12, color: T.dim, lineHeight: 1.5 } },
              pick({
                k2: __alloT('stem.machinelab.cmp_note_k2', 'The green numbers are the winners in their column. The machine that throws furthest is not always the one that wastes the least. Those are two different things to be good at.'),
                g35: __alloT('stem.machinelab.cmp_note_g35', 'The highlighted cells are the best in their column. Notice that the machine throwing furthest is not the one keeping the most of its energy. Storing a lot and wasting little are two separate things.'),
                g68: __alloT('stem.machinelab.cmp_note', 'The highlighted cells are the best in their column. The machine that throws furthest is often not the one that wastes least, because stored energy and efficiency are two different things.'),
                g912: __alloT('stem.machinelab.cmp_note', 'The highlighted cells are the best in their column. The machine that throws furthest is often not the one that wastes least, because stored energy and efficiency are two different things.')
              }, band)),
            // Without this the two tables on this screen tell opposite stories
            // and nothing joins them: up here the trebuchet wins by five times,
            // and below the onager reaches twice as far as the trebuchet does.
            // The difference is entirely the stone, and a fair test that holds
            // the wrong thing constant is worth naming as a lesson.
            h('p', { key: 'note2', style: { margin: '8px 0 0', fontSize: 12, color: T.dim, lineHeight: 1.5 } },
              pick({
                k2: __alloT('stem.machinelab.cmp_note2_k2', 'All three machines are throwing the same stone, which is fair. But that stone is a good size for one of them and a bad size for the other two. The next part asks what stone each machine would like best.'),
                g35: __alloT('stem.machinelab.cmp_note2_g35', 'Giving all three the same stone is what makes this a fair test. It is also one particular stone, and it suits one machine much better than the others. The next panel asks a different question: what would each machine rather throw?'),
                g68: __alloT('stem.machinelab.cmp_note2', 'One thing to be careful about: holding the stone the same is what makes this a fair test, but it is a stone of one particular size, and it suits one of these machines far better than the other two. The panel below asks a different question, which is what each machine would rather be throwing.'),
                g912: __alloT('stem.machinelab.cmp_note2_g912', 'A controlled comparison is only as good as its choice of what to hold constant. Fixing the payload is defensible, but it is not neutral: the fixed payload happens to sit near the trebuchet optimum and far from the torsion ones, so the ranking below is partly a statement about the stone. The panel underneath relaxes that control and optimises the payload per machine instead.')
              }, band))
          ], 'cmptable'),
          card([
            h('h4', { key: 'h', style: { margin: '0 0 6px', fontSize: 14, color: T.text } },
              __alloT('stem.machinelab.cmp_try', 'Things worth trying')),
            // Four prompts, restated per band like the rest of the tool. This
            // block was the last single-register text in the view: a K-2 reader
            // was being asked about "the share of energy that reaches the
            // stone" in the same words as a grade 12 one.
            //
            // The first prompt used to say "drop the stone mass to a fraction
            // of a kilogram", which at a fixed 0.26 m diameter builds a stone
            // lighter than balsa: the exact trap the density note warns about.
            h('ul', { key: 'l', style: { margin: 0, paddingLeft: 20, fontSize: 13, color: T.muted, lineHeight: 1.7 } },
              pick({
                k2: [
                  __alloT('stem.machinelab.cmp_try1_k2', 'Make the stone smaller and lighter together, so it is still a real rock. Which machine likes that best?'),
                  __alloT('stem.machinelab.cmp_try2_k2', 'Give the onager a heavier arm. Does the stone go further or not as far?'),
                  __alloT('stem.machinelab.cmp_try3_k2', 'Make the onager sling longer. Watch what changes.'),
                  __alloT('stem.machinelab.cmp_try4_k2', 'Twist the ropes more times. Does the stone go much further?')
                ],
                g35: [
                  __alloT('stem.machinelab.cmp_try1_g35', 'Make the stone lighter, and make it smaller too so it is still a real rock. Which machine copes best?'),
                  __alloT('stem.machinelab.cmp_try2_g35', 'Make the onager arm heavier. How much of the energy still reaches the stone?'),
                  __alloT('stem.machinelab.cmp_try3_g35', 'Lengthen the onager sling. It costs no energy at all, so why does the throw change?'),
                  __alloT('stem.machinelab.cmp_try4_g35', 'Add more twists to the ropes. Does the throw grow as fast as the stored energy does?')
                ],
                g68: [
                  __alloT('stem.machinelab.cmp_try1', 'Make the stone lighter, and shrink its diameter to match so it stays a real rock. Which machine copes best, and why? The button below does this for you.'),
                  __alloT('stem.machinelab.cmp_try2', 'Make the onager arm heavier. Watch what happens to the share of energy that reaches the stone.'),
                  __alloT('stem.machinelab.cmp_try3', 'Lengthen the onager sling. It costs nothing and changes the efficiency. Why?'),
                  __alloT('stem.machinelab.cmp_try4', 'Wind more turns into the bundles. Does range grow as fast as stored energy does?')
                ],
                g912: [
                  __alloT('stem.machinelab.cmp_try1_g912', 'Reduce payload mass with diameter derived from a fixed density, so frontal area scales as mass to the two thirds. Which machine degrades most gracefully, and which term in m_p/(m_p + m_eff) explains it?'),
                  __alloT('stem.machinelab.cmp_try2_g912', 'Increase the onager arm mass. Transfer efficiency should fall even though stored energy is untouched, because m_eff is the arm inertia reduced to the payload radius.'),
                  __alloT('stem.machinelab.cmp_try3_g912', 'Lengthen the onager sling. It adds no stored energy, so any change in range has to come through the effective mass. Work out which way, and why.'),
                  __alloT('stem.machinelab.cmp_try4_g912', 'Wind more turns into the bundles. Stored energy goes as the square of the twist angle, so predict whether range should scale linearly, and then check.')
                ]
              }, band).map(function (txt, i) { return h('li', { key: i }, txt); }))
          ], 'cmptry'),
          bestStonePanel(),
          inquiryWidget()
        ]);
      }

      // ── Field Manual ──
      function renderLearn() {
        var TOPICS = [
          { id: 'energy', icon: '⚡', label: __alloT('stem.machinelab.topic_energy', 'Where the energy goes') },
          { id: 'machines', icon: '⚙️', label: __alloT('stem.machinelab.topic_machines', 'The six machines') },
          { id: 'history', icon: '🏛️', label: __alloT('stem.machinelab.topic_history', 'History and evidence') },
          { id: 'model', icon: '📐', label: __alloT('stem.machinelab.topic_model', 'What this model is not') },
          { id: 'record', icon: '🧾', label: __alloT('stem.machinelab.topic_record', 'Your work') }
        ];
        var topic = d.manualTopic || 'energy';
        var spoken = [];

        function para(txt, key) {
          spoken.push(txt);
          return h('p', { key: key, style: { margin: '0 0 10px', fontSize: 14, lineHeight: 1.65, color: T.muted } }, txt);
        }

        function bullets(items, key) {
          items.forEach(function (t) { spoken.push(t); });
          return h('ul', {
            key: key,
            style: { margin: '0 0 10px', paddingLeft: 20, fontSize: 14, color: T.muted, lineHeight: 1.75 }
          }, items.map(function (t, i) { return h('li', { key: i }, t); }));
        }

        var content;
        if (topic === 'energy') {
          content = [
            para(pick({
              k2: __alloT('stem.machinelab.manual_e_k2', 'Machines do not make energy. They move it around. You put energy in when you crank the handle, and the machine gives most of it back to the stone. Some always gets lost on the way.'),
              g35: __alloT('stem.machinelab.manual_e_g35', 'You do work at the crank. That work gets stored, either by lifting a heavy weight or by twisting rope. When you release it, the store spends its energy on the stone. At every step a little is lost, so the stone never gets everything you put in.'),
              g68: __alloT('stem.machinelab.manual_e_g68', 'Follow the joules. Work in at the crank equals force times distance. Winch friction takes a share, so what is stored is less than what you did. At release the stored energy is shared between the stone and everything else that has to move, which is why a heavy arm is expensive. Then air resistance takes more on the way down.'),
              g912: __alloT('stem.machinelab.manual_e_g912', 'The chain is a sequence of efficiencies multiplied together. Transfer efficiency is m_p / (m_p + m_eff), where m_eff is the machine inertia reduced to the payload radius. That single expression explains why a light projectile leaves fast but wastes most of the store, and why a heavy one is efficient but slow. Range is not maximised at either end, but only once drag is present.')
            }, band), 'p1'),
            para(__alloT('stem.machinelab.manual_e2', 'The ledger in the Build and Test Range views shows this chain for the machine you have configured. The table view carries exactly the same numbers as the bars.'), 'p2')
          ];
        } else if (topic === 'machines') {
          content = [
            para(__alloT('stem.machinelab.manual_m1', 'Every siege engine here is built out of the same six simple machines you met in the Machine Shop.'), 'p1'),
            bullets([
              __alloT('stem.machinelab.manual_m_lever', 'Lever: the throwing arm itself. The pivot is the fulcrum, and the ratio of the two arms sets how much faster the payload end travels.'),
              __alloT('stem.machinelab.manual_m_wheel', 'Wheel and axle: the windlass that cocks the machine. A big handle turning a small drum.'),
              __alloT('stem.machinelab.manual_m_pulley', 'Pulley: the block and tackle on the cocking rope, multiplying the crew’s pull.'),
              __alloT('stem.machinelab.manual_m_wedge', 'Wedge: the trigger and the pawl of the ratchet, which hold an enormous force with a small one.'),
              __alloT('stem.machinelab.manual_m_screw', 'Screw: the tensioning gear on a torsion engine, adjusting the spring by tiny amounts against a huge load.'),
              __alloT('stem.machinelab.manual_m_ramp', 'Inclined plane: the ramp the ammunition is rolled up, and the wedge under the frame that sets elevation.')
            ], 'ul'),
            para(__alloT('stem.machinelab.manual_m2', 'None of them adds energy. Each one only changes the exchange rate between force and distance.'), 'p2')
          ];
        } else if (topic === 'history') {
          content = [
            para(__alloT('stem.machinelab.manual_h_intro', 'A note on how we know any of this. Ancient and medieval engineers left far fewer numbers than we would like, so most of what follows comes from a small number of surviving technical treatises, from archaeology, and from modern reconstructions. Where scholars disagree, this manual says so rather than picking a side.'), 'p0'),
            h('div', { key: 'items' }, [
              { t: __alloT('stem.machinelab.hist_t1', 'Torsion artillery is Greek and Roman, and well documented'),
                b: __alloT('stem.machinelab.hist_b1', 'Two-armed torsion engines are described in surviving technical treatises by Heron of Alexandria and Philon of Byzantium, and in Book X of Vitruvius. E. W. Marsden’s Greek and Roman Artillery (1969, with a companion volume of translated technical treatises in 1971) remains the standard modern scholarly treatment. The ancient design rules proportion the entire engine from the diameter of the spring-hole, which is a strong hint that the springs were the part nobody could calculate directly.') },
              { t: __alloT('stem.machinelab.hist_t2', 'The onager is a late Roman name'),
                b: __alloT('stem.machinelab.hist_b2', 'Ammianus Marcellinus, writing in the fourth century, describes a one-armed stone-thrower and reports that soldiers called it the onager, the wild ass, for the way it kicked. Earlier Roman engines were not called this, so the word is evidence about the fourth century rather than about Roman artillery in general.') },
              { t: __alloT('stem.machinelab.hist_t3', 'Spring material: attested, but repeated uncritically'),
                b: __alloT('stem.machinelab.hist_b3', 'Ancient sources describe torsion springs made from sinew and from hair. Several authors also report cities cutting women’s hair for bowstrings or springs during a siege. That story is genuinely present in the ancient sources, and it is also exactly the kind of striking anecdote that gets repeated far more often than it is examined. Treat it as something ancient authors said, which is a different claim from something that routinely happened.') },
              { t: __alloT('stem.machinelab.hist_t4', 'The counterweight trebuchet arrives later, and the details are contested'),
                b: __alloT('stem.machinelab.hist_b4', 'Human-powered traction trebuchets are much older than counterweight ones and reached the Mediterranean world well before it. Counterweight machines appear in European sources around the late twelfth and thirteenth centuries. The precise dating, and the route by which the design travelled, are actively debated among historians, so this manual gives the century and leaves the argument open.') },
              { t: __alloT('stem.machinelab.hist_t5', 'Be very careful with range figures'),
                b: __alloT('stem.machinelab.hist_b5', 'Numbers like "three hundred metres" almost always come from a modern reconstruction rather than from a medieval measurement, and they get quoted as though they were historical records. If you cite a range, cite the specific reconstruction it came from. The figures this tool produces are outputs of a simplified model and are not evidence about any real machine.') },
              { t: __alloT('stem.machinelab.hist_t6', 'Siege engines rarely knocked castle walls down'),
                b: __alloT('stem.machinelab.hist_b6', 'The popular image of a trebuchet demolishing a curtain wall overstates what these machines usually did. Historians generally give more weight to undermining, to assault, and above all to blockade and starvation. Stone-throwers were highly effective against battlements, hoardings and roofs, and for throwing incendiaries and other unpleasant things over a wall, which is a real and interesting job that is simply not the one the films show.') }
            ].map(function (it, i) {
              spoken.push(it.t + '. ' + it.b);
              return h('div', { key: 'h' + i, style: { marginBottom: 12 } }, [
                h('h5', { key: 't', style: { margin: '0 0 3px', fontSize: 13, fontWeight: 800, color: T.text } }, it.t),
                h('p', { key: 'b', style: { margin: 0, fontSize: 13, lineHeight: 1.6, color: T.muted } }, it.b)
              ]);
            }))
          ];
        } else if (topic === 'record') {
          content = [workRecord()];
        } else {
          content = [
            para(__alloT('stem.machinelab.manual_x1', 'This tool is a teaching model, and it is worth being precise about where it stops.'), 'p1'),
            bullets([
              __alloT('stem.machinelab.manual_x_treb', 'The trebuchet is modelled with one degree of freedom. A real one is a double pendulum, and the moment the sling releases is a genuinely hard problem this model does not solve.'),
              __alloT('stem.machinelab.manual_x_tors', 'Torsion springs are modelled as linear. Real twisted sinew is strongly nonlinear, loses energy internally on every shot, and behaves differently in damp weather.'),
              __alloT('stem.machinelab.manual_x_drag', 'Drag uses a single constant coefficient for a smooth sphere. Real projectiles tumble, and their drag changes as they do.'),
              // The tool now prints the implied density, so it has to be honest
              // about the fact that it will happily simulate an impossible one.
              __alloT('stem.machinelab.manual_x_dens', 'Stone mass and stone size are separate controls, so the tool will let you build an object with a density no material has, and will then simulate it perfectly happily. It tells you when you have done that, but it does not stop you. Real materials come with a density attached, and it is worth remembering that choosing a size chooses a mass too.'),
              __alloT('stem.machinelab.manual_x_fric', 'One efficiency figure stands in for all the friction in the winch. A real crew would feel it vary through the pull.')
            ], 'ul'),
            para(__alloT('stem.machinelab.manual_x2', 'What the model does get right is the shape of the trade-offs: mechanical advantage buys force by spending distance, a heavy arm steals energy from the payload, and drag is what creates a best projectile mass. Those conclusions are robust. The specific numbers are not predictions about any real machine.'), 'p2')
          ];
        }

        // The manual should be a launchpad, not a dead end. Each topic points
        // back to the smallest 3D experiment that makes its idea tangible.
        var manualRoute = {
          energy: {
            view: 'range', icon: '\uD83C\uDFAF',
            title: __alloT('stem.machinelab.manual_route_energy_title', 'Watch the energy move'),
            copy: __alloT('stem.machinelab.manual_route_energy_copy', 'Make a prediction, fire the stone, and follow the joules from the crank to the flight.'),
            action: __alloT('stem.machinelab.manual_route_energy_action', 'Open the 3D Test Range')
          },
          machines: {
            view: 'machines', icon: '\u2699\uFE0F',
            title: __alloT('stem.machinelab.manual_route_machines_title', 'Try one simple machine'),
            copy: __alloT('stem.machinelab.manual_route_machines_copy', 'Tune a bench, watch force and distance trade places, then prove your prediction.'),
            action: __alloT('stem.machinelab.manual_route_machines_action', 'Visit the Machine Shop')
          },
          history: {
            view: 'siege', icon: '\uD83C\uDFF0',
            title: __alloT('stem.machinelab.manual_route_history_title', 'Put the model against a wall'),
            copy: __alloT('stem.machinelab.manual_route_history_copy', 'Aim at a target and see what a reconstruction can show—and what history still has to tell us.'),
            action: __alloT('stem.machinelab.manual_route_history_action', 'Open the 3D Target Wall')
          },
          model: {
            view: 'range', icon: '\uD83E\uDDEA',
            title: __alloT('stem.machinelab.manual_route_model_title', 'Stress-test the model'),
            copy: __alloT('stem.machinelab.manual_route_model_copy', 'Change drag, gravity, angle, or wind and watch which conclusions survive.'),
            action: __alloT('stem.machinelab.manual_route_model_action', 'Experiment in the Test Range')
          },
          record: {
            view: 'compare', icon: '\uD83D\uDCCA',
            title: __alloT('stem.machinelab.manual_route_record_title', 'Turn notes into a claim'),
            copy: __alloT('stem.machinelab.manual_route_record_copy', 'Compare the three machines side by side and record what the ledger makes you think.'),
            action: __alloT('stem.machinelab.manual_route_record_action', 'Open Compare')
          }
        }[topic] || null;
        var routeCard = manualRoute ? card([
          h('div', {
            key: 'row',
            style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }
          }, [
            h('div', { key: 'copy', style: { minWidth: 220, flex: '1 1 260px' } }, [
              h('div', { key: 'ey', style: { fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: T.accent, marginBottom: 3 } },
                __alloT('stem.machinelab.manual_route_eyebrow', 'Step back into the world')),
              h('h4', { key: 'title', style: { margin: 0, fontSize: 14, color: T.text } }, manualRoute.icon + ' ' + manualRoute.title),
              h('p', { key: 'p', style: { margin: '4px 0 0', fontSize: 12, lineHeight: 1.5, color: T.muted } }, manualRoute.copy)
            ]),
            h('button', {
              key: 'go', type: 'button', onClick: function () { upd('view', manualRoute.view); },
              'aria-label': manualRoute.action,
              style: {
                padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
                border: '1px solid ' + T.accent, background: T.accent,
                color: T.accentInk, fontSize: 12, fontWeight: 800
              }
            }, manualRoute.action + ' \u2192')
          ])
        ], 'manualroute') : null;

        return h('div', { key: 'learnview' }, [
          h('div', {
            key: 'topics', role: 'tablist',
            'aria-label': __alloT('stem.machinelab.aria_topics', 'Field manual topics'),
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }
          }, TOPICS.map(function (tp) {
            var on = tp.id === topic;
            return h('button', {
              key: tp.id, role: 'tab', 'aria-selected': on ? 'true' : 'false',
              onClick: function () { upd('manualTopic', tp.id); },
              style: {
                padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
                border: '1px solid ' + (on ? T.accent : T.border),
                background: on ? T.accent : T.card,
                color: on ? T.accentInk : T.text, fontSize: 12, fontWeight: 700
              }
            }, tp.icon + ' ' + tp.label);
          })),
          routeCard,
          card([
            h('div', {
              key: 'rd',
              style: { display: 'flex', justifyContent: 'flex-end', marginBottom: 2 }
            }, readAloud(spoken.join(' '), 'tts'))
          ].concat(content), 'manual'),
          aiPanel()
        ]);
      }

      // ── AI explain panel, following the pattern at the tail of
      //    stem_tool_physics.js. Defaults its level to the current band rather
      //    than always Grade 5.
      function aiPanel() {
        var LEVELS = [
          { id: 'grade2', band: 'k2', label: __alloT('stem.machinelab.lv_g2', 'Grade 2') },
          { id: 'grade5', band: 'g35', label: __alloT('stem.machinelab.lv_g5', 'Grade 5') },
          { id: 'grade8', band: 'g68', label: __alloT('stem.machinelab.lv_g8', 'Grade 8') },
          { id: 'highschool', band: 'g912', label: __alloT('stem.machinelab.lv_hs', 'High school') }
        ];
        var defaultLevel = 'grade5';
        for (var li = 0; li < LEVELS.length; li++) {
          if (LEVELS[li].band === band) { defaultLevel = LEVELS[li].id; break; }
        }
        var level = d.aiLevel || defaultLevel;

        function explain() {
          if (typeof ctx.callGemini !== 'function') {
            upd('aiError', __alloT('stem.machinelab.ai_offline', 'The AI tutor is not available here.'));
            return;
          }
          var lvl = (LEVELS.filter(function (L) { return L.id === level; })[0] || LEVELS[1]).label;
          var machineName = machineLabel(machineId);
          var prompt = 'Explain, at a ' + lvl + ' reading level, what is happening in a ' + machineName +
            ' with these settings: stored energy ' + (preview ? fmt(preview.stored, 0) : '0') + ' joules, ' +
            'transfer efficiency ' + (preview ? fmt(100 * preview.eta, 1) : '0') + ' percent, launch speed ' +
            (preview ? fmt(preview.muzzleV, 1) : '0') + ' metres per second, range ' +
            (preview ? fmt(preview.range, 1) : '0') + ' metres. Focus on WHERE THE ENERGY GOES and on the ' +
            'idea that a machine trades distance for force without creating energy. Three short paragraphs at most. ' +
            'Do not invent historical claims.';
          updMulti({ aiLoading: true, aiError: '', aiText: '' });

          // Settle exactly once, whichever gets there first.
          //
          // aiLoading disables the Explain button, and it was only ever cleared
          // by .then or .catch. A promise that never settles therefore disabled
          // the tutor PERMANENTLY with no way to retry, and AI calls on this
          // surface do throttle and hang in practice. The timeout is the only
          // thing standing between a slow network and a dead button.
          var settled = false;
          function settle(patch) {
            if (settled) return;
            settled = true;
            updMulti(patch);
          }
          var failMsg = __alloT('stem.machinelab.ai_failed', 'The tutor could not answer just now. Try again in a moment.');

          try {
            Promise.resolve(ctx.callGemini(prompt)).then(function (txt) {
              settle({ aiLoading: false, aiText: (typeof txt === 'string' ? txt : (txt && txt.text) || '') });
            }).catch(function () {
              settle({ aiLoading: false, aiError: failMsg });
            });
          } catch (e) {
            settle({ aiLoading: false, aiError: failMsg });
          }
          if (typeof setTimeout === 'function') {
            setTimeout(function () {
              settle({
                aiLoading: false,
                aiError: __alloT('stem.machinelab.ai_timeout', 'The tutor did not answer in time. Try again.')
              });
            }, AI_TIMEOUT_MS);
          }
        }

        return card([
          h('div', {
            key: 'row',
            style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }
          }, [
            h('span', { key: 'l', style: { fontSize: 12, fontWeight: 700, color: T.muted } },
              __alloT('stem.machinelab.explain_at', 'Explain at:')),
            h('div', { key: 'chips', role: 'group', 'aria-label': __alloT('stem.machinelab.aria_ai_level', 'Explanation level') },
              LEVELS.map(function (L) {
                var on = L.id === level;
                return h('button', {
                  key: L.id, 'aria-pressed': on ? 'true' : 'false',
                  onClick: function () { upd('aiLevel', L.id); },
                  style: {
                    padding: '4px 9px', marginRight: 4, borderRadius: 8, cursor: 'pointer',
                    border: '1px solid ' + (on ? T.accent : T.border),
                    background: on ? T.accent : T.card,
                    color: on ? T.accentInk : T.muted, fontSize: 11, fontWeight: 700
                  }
                }, L.label);
              })),
            h('button', {
              key: 'go', onClick: explain, disabled: !!d.aiLoading,
              'aria-label': __alloT('stem.machinelab.aria_explain', 'Generate an explanation at the selected level'),
              style: {
                padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                border: '1px solid ' + T.accent, background: T.accent,
                color: T.accentInk, fontSize: 12, fontWeight: 700, opacity: d.aiLoading ? 0.5 : 1
              }
            }, d.aiLoading
              ? __alloT('stem.machinelab.thinking', 'Thinking...')
              : (d.aiText ? __alloT('stem.machinelab.re_explain', 'Explain again') : __alloT('stem.machinelab.explain', 'Explain')))
          ]),
          d.aiError ? h('p', { key: 'err', role: 'alert', style: { margin: 0, fontSize: 12, color: T.bad } }, d.aiError) : null,
          d.aiText ? h('p', {
            key: 'txt',
            style: { margin: 0, fontSize: 13, lineHeight: 1.6, color: T.text, whiteSpace: 'pre-wrap' }
          }, d.aiText) : null,
          (!d.aiText && !d.aiLoading && !d.aiError) ? h('p', {
            key: 'hint', style: { margin: 0, fontSize: 12, fontStyle: 'italic', color: T.dim }
          }, __alloT('stem.machinelab.ai_hint', 'Ask the tutor to describe what your current machine is doing with its energy.')) : null
        ], 'ai');
      }

      // ── First-run orientation ──
      //
      // Six views is a lot to land on cold, and the tool's spine (benches →
      // engine → ledger → range → wall) is not obvious from the nav alone. The
      // host owns the overlay, the step counter and the seen-once flag; a tool
      // only supplies the steps, so these live here rather than in the host
      // alongside the other tools' arrays.
      function tutorialSteps() {
        return [
          {
            text: pick({
              k2: __alloT('stem.machinelab.tut1_k2', 'Welcome to Machine Lab! Start in the Machine Shop. Six simple machines, and every one of them helps you push less hard.'),
              g35: __alloT('stem.machinelab.tut1_g35', 'Welcome to Machine Lab! Start in the Machine Shop: six simple machines, each one trading distance for force.'),
              g68: __alloT('stem.machinelab.tut1', 'Welcome to Machine Lab. Start in the Machine Shop: six simple machines, one idea. Mechanical advantage trades distance for force and never creates energy.'),
              g912: __alloT('stem.machinelab.tut1_g912', 'Welcome to Machine Lab. The Machine Shop establishes the six ideal machines and their mechanical advantages; everything after it is those six composed into a real engine.')
            }, band),
            top: '26%', left: '50%'
          },
          {
            text: __alloT('stem.machinelab.tut2', 'Then open Build. A trebuchet, a ballista and an onager are not new machines: the panel there names every part as one of the six you just met, and takes you back to its bench.'),
            top: '42%', left: '50%'
          },
          {
            text: __alloT('stem.machinelab.tut3', 'Watch the energy ledger beside the machine. Follow the joules from the crank to the stone, and see exactly where each one is lost.'),
            top: '58%', left: '50%'
          },
          {
            text: __alloT('stem.machinelab.tut4', 'In the Test Range, predict the distance before you fire. Try a very light stone and a very heavy one: the fastest shot is not the furthest.'),
            top: '72%', left: '50%'
          },
          {
            text: __alloT('stem.machinelab.tut5', 'At the Target Wall, aim flat. A high lob sails clean over a wall; walls are battered with direct fire.'),
            top: '84%', left: '50%'
          }
        ];
      }

      var tutorial = (typeof ctx.renderTutorial === 'function')
        ? ctx.renderTutorial('machineLab', tutorialSteps())
        : null;

      // ═══ Assemble ═══
      var view = d.view || 'machines';
      var body = (view === 'build') ? renderBuild()
        : (view === 'range') ? renderRange()
        : (view === 'siege') ? renderSiege()
        : (view === 'compare') ? renderCompare()
        : (view === 'learn') ? renderLearn()
        : renderMachines();

      return h('div', {
        style: {
          background: T.bg, color: T.text, padding: 16,
          minHeight: '100%', fontFamily: 'system-ui, sans-serif'
        }
      }, [
        tutorial,
        h('div', { key: 'hd', style: {
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
          flexWrap: 'wrap', marginBottom: 12, padding: '15px 17px', borderRadius: 16,
          border: '1px solid ' + T.border,
          background: isContrast ? T.card : (isDark ? 'linear-gradient(135deg,#1e293b,#2b2115)' : 'linear-gradient(135deg,#ffffff,#fff7ed)'),
          boxShadow: isDark ? '0 12px 28px rgba(0,0,0,.18)' : '0 12px 28px rgba(15,23,42,.07)'
        } }, [
          h('div', { key: 'copy' }, [
            h('div', { key: 'ey', style: { marginBottom: 3, fontSize: 9, fontWeight: 850, letterSpacing: 1.6, textTransform: 'uppercase', color: T.accent } },
              __alloT('stem.machinelab.engineering_studio', 'Interactive engineering studio')),
            h('h2', { key: 'h', style: { margin: 0, fontSize: 24, fontWeight: 850, color: T.text } },
              '⚙️ ' + __alloT('stem.machinelab.title', 'Machine Lab')),
            h('p', { key: 's', style: { margin: '4px 0 0', fontSize: 13, color: T.muted } },
              __alloT('stem.machinelab.subtitle', 'Six simple machines. One idea: trade distance for force.'))
          ]),
          h('div', { key: 'progress', style: { minWidth: 175, flex: '0 1 230px' } }, [
            h('div', { key: 'txt', style: { display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: T.muted } }, [
              h('span', { key: 'l' }, __alloT('stem.machinelab.mission_progress', 'Bench progress')),
              h('span', { key: 'v', style: { color: T.accent } }, provenCount + ' / 6')
            ]),
            h('div', {
              key: 'track', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 6,
              'aria-valuenow': provenCount, 'aria-label': __alloT('stem.machinelab.bench_progress_aria', 'Simple-machine benches proven'),
              style: { height: 8, overflow: 'hidden', borderRadius: 999, background: T.bg, border: '1px solid ' + T.border }
            }, h('div', { style: { width: (100 * provenCount / 6) + '%', height: '100%', background: T.accent } })),
            h('div', { key: 'sub', style: { marginTop: 5, fontSize: 10, color: T.dim, textAlign: 'right' } },
              firedCount + ' / 3 ' + __alloT('stem.machinelab.machines_fired', 'machines fired'))
          ])
        ]),

        bandPicker(),
        viewNav(),
        h('div', {
          key: 'panel', id: 'machinelab-panel-' + view, role: 'tabpanel',
          'aria-labelledby': 'machinelab-tab-' + view, tabIndex: 0
        }, body),

        h('p', { key: 'sr', style: srOnlyStyle },
          __alloT('stem.machinelab.sr_summary', 'Machine Lab, ') + bench.label +
          __alloT('stem.machinelab.sr_ma', ', mechanical advantage ') + (ma === null ? '—' : fmt(ma, 2)) +
          __alloT('stem.machinelab.sr_level', ', reading level ') + BAND_LABELS[band])
      ]);
    }
  });

})();
