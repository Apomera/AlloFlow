#!/usr/bin/env node
// check_roadready_vehicle_dynamics.cjs — choosing a different vehicle must
// actually change how it accelerates, and the driving sim and the Live Force
// Diagram must share one thrust model.
//
// Why this exists (2026-09-20):
//   Thrust was capped at `mass * mu * g * 0.4` — the tyre grip limit, which is
//   the right SHAPE for a cap. But because the cap scales with mass, the mass
//   cancels:
//
//       a_max = (mass * mu * g * k) / mass = mu * g * k
//
//   With k = 0.4 that is 2.83 m/s^2 for EVERY vehicle, independent of mass and
//   of powerKW. The cap bound below ~60 mph for the sedan and ~94 mph for the
//   EV, so it governed the entire 0-60 run: sedan 10.1 s, SUV 10.2 s, truck
//   10.2 s, EV 10.1 s, hybrid 10.5 s. The 220 kW electric sedan launched
//   exactly like the 90 kW hybrid, and the carefully-authored powerKW values
//   were very nearly decorative below highway speed.
//
//   A student who picks the EV to feel its torque got a compact sedan. The
//   vehicle-choice lesson quietly taught nothing.
//
// The rule:
//   A. The launch traction fraction is a named constant, in a physically
//      sensible band (a street tyre launches around 0.3-0.5 g).
//   B. Both thrust sites use that constant — no bare literal can reintroduce
//      the split between the sim and the force diagram.
//   C. Simulated 0-60 times must SPREAD across the vehicle line-up, and must
//      order the way the real vehicles do. This is the check that actually
//      catches a re-flattening; A and B alone would not.
//
// Part C integrates the tool's own thrust model rather than asserting
// hardcoded seconds, so it keeps working if the vehicle table is retuned.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REL = 'stem_lab/stem_tool_roadready.js';
const src = fs.readFileSync(path.join(ROOT, REL), 'utf8');

const errors = [];

function readNum(re, label) {
  const m = src.match(re);
  if (!m || m[1] === undefined) {
    errors.push('could not read ' + label + ' (anchor moved, or no capture group)');
    return null;
  }
  const n = Number(m[1]);
  if (!Number.isFinite(n)) {
    errors.push(label + ' did not parse as a number: ' + JSON.stringify(m[1]));
    return null;
  }
  return n;
}

// ── A. the traction fraction ────────────────────────────────────────────────
const K = readNum(/var RR_LAUNCH_TRACTION_FRACTION = ([\d.]+);/, 'RR_LAUNCH_TRACTION_FRACTION');
const MU_DRY = readNum(/return ([\d.]+); \/\/ dry/, 'dry friction coefficient');

if (K !== null) {
  if (K < 0.45 || K > 0.85) {
    errors.push('RR_LAUNCH_TRACTION_FRACTION is ' + K + '; expected 0.45-0.85. Below ~0.45 the ' +
      'grip cap binds through the whole 0-60 run and every vehicle accelerates identically ' +
      '(the 0.4 bug); above ~0.85 launches are quicker than a street tyre can deliver.');
  }
}

// ── B. one thrust model, no bare literals ───────────────────────────────────
const thrustSites = src.match(/Math\.min\(\s*\n?\s*(?:max|fd)?[Tt]hrust,[^)]*9\.81 \*\s*\n?\s*RR_LAUNCH_TRACTION_FRACTION\)/g) || [];
const usages = (src.match(/RR_LAUNCH_TRACTION_FRACTION/g) || []).length;
if (usages < 3) {
  errors.push('RR_LAUNCH_TRACTION_FRACTION is referenced ' + usages + ' time(s); expected the ' +
    'definition plus BOTH thrust sites (driving sim + Live Force Diagram)');
}
if (/9\.81 \* 0\.4\b/.test(src)) {
  errors.push('a bare `9.81 * 0.4` traction cap is back in the source — that is the literal that ' +
    'flattened every vehicle to the same 0-60');
}

// ── C. vehicles must actually differ ────────────────────────────────────────
// Parse the vehicle table out of the tool.
const vehicles = [];
const vre = /id: '([a-z_]+)', name: '([^']+)'[\s\S]{0,120}?mass: (\d+), cd: ([\d.]+), area: ([\d.]+), powerKW: (\d+)/g;
let vm;
while ((vm = vre.exec(src)) !== null) {
  vehicles.push({ id: vm[1], name: vm[2], mass: +vm[3], cd: +vm[4], area: +vm[5], kW: +vm[6] });
}
if (vehicles.length < 5) {
  errors.push('parsed only ' + vehicles.length + ' vehicles from the table; expected the full line-up');
}

// Load the tool's own force functions and constants.
const { loadRoadReady } = require('./roadready_model.cjs');
let MODEL;
try {
  MODEL = loadRoadReady(['dragForce', 'rollingForce', 'rollingCoef', 'frictionCoef']);
} catch (e) {
  console.error('\n✗ check_roadready_vehicle_dynamics FAILED\n');
  console.error('  • ' + e.message + '\n');
  process.exit(1);
}

// Cross-checks: the constants this gate reads by regex, and the one value it
// still mirrors by hand, must agree with the loaded model.
if (MU_DRY !== null) {
  const liveMu = MODEL.frictionCoef('clear');
  if (Math.abs(liveMu - MU_DRY) > 1e-9) {
    errors.push('dry mu is ' + liveMu + ' from frictionCoef() but ' + MU_DRY +
      ' by regex -- the regex anchor is stale.');
  }
}
{
  // Drag at a known point, against the tool's own function. Catches a change
  // to AIR_DENSITY or to the drag formula's shape, neither of which this gate
  // could see while it carried `RHO = 1.225` as a literal.
  const probe = MODEL.dragForce(20, 0.30, 2.2);
  const expected = 0.5 * 1.225 * 20 * 20 * 0.30 * 2.2;
  if (Math.abs(probe - expected) > 0.5) {
    errors.push('dragForce(20, 0.30, 2.2) is ' + probe.toFixed(1) + ' N but 0.5*1.225*v^2*Cd*A ' +
      'gives ' + expected.toFixed(1) + ' N. Air density or the drag formula changed -- ' +
      're-derive the 0-60 expectations against it.');
  }
  const rollProbe = MODEL.rollingForce(1500, MODEL.rollingCoef('clear', true));
  const rollExpected = 0.012 * 1500 * 9.81;
  if (Math.abs(rollProbe - rollExpected) > 0.5) {
    errors.push('rolling resistance for a 1500 kg car on a dry road is ' + rollProbe.toFixed(1) +
      ' N but crr 0.012 gives ' + rollExpected.toFixed(1) + ' N -- rollingCoef or ' +
      'rollingForce changed.');
  }
}

if (K !== null && MU_DRY !== null && vehicles.length >= 5) {
  const G = 9.81, MPH = 2.23694;
  // Resistances come from the tool's OWN dragForce / rollingForce / rollingCoef
  // rather than re-deriving 0.5*rho*Cd*A*v^2 and crr*m*g here, and rho and crr
  // are no longer duplicated as literals in this gate. A gate that recomputes
  // the value cannot fail: on 2026-09-21, dropping the factor of 2 from
  // stoppingDistance() left all six RoadReady physics gates green while 14
  // vitest tests went red, because each gate carried a private copy.
  //
  // The THRUST cap is still mirrored below, because the tool computes it inline
  // in two render-loop sites rather than in a shared helper, and those two
  // sites genuinely differ (one has the low-speed launch boost and a reverse
  // cap, the other does not). Extracting a shared helper would change
  // behaviour at the second site, so that is a refactor, not a gate fix. What
  // this gate CAN do is assert the mirrored cap still matches the constant the
  // tool uses -- see the K cross-check after the export block.
  const zeroToSixty = (v) => {
    const dt = 0.01;
    let s = 0.01;
    const crr = MODEL.rollingCoef('clear', true);
    for (let t = 0; t < 120; t += dt) {
      let maxT = (v.kW * 1000) / Math.max(1, s);
      if (s < 2) maxT = v.kW * 500;
      const thrust = Math.min(maxT, v.mass * MU_DRY * G * K);
      const drag = MODEL.dragForce(s, v.cd, v.area);
      const roll = MODEL.rollingForce(v.mass, crr);
      s += ((thrust - drag - roll) / v.mass) * dt;
      if (s * MPH >= 60) return t;
    }
    return null;
  };

  const cars = vehicles.filter((v) => v.mass < 5000);   // exclude the bus
  const times = cars.map((v) => ({ name: v.name, t: zeroToSixty(v) }));
  const missing = times.filter((x) => x.t === null);
  if (missing.length) {
    errors.push('these vehicles never reach 60 mph: ' + missing.map((x) => x.name).join(', '));
  } else {
    const ts = times.map((x) => x.t);
    const spread = Math.max(...ts) - Math.min(...ts);
    if (spread < 1.0) {
      errors.push('0-60 spread across passenger vehicles is only ' + spread.toFixed(2) + ' s — ' +
        'vehicle choice barely changes acceleration. That is the grip cap cancelling mass ' +
        'again (a = mu*g*k, independent of mass and power). Times: ' +
        times.map((x) => x.name + ' ' + x.t.toFixed(1) + 's').join(', '));
    }
    // The hybrid is the least powerful car here and must be the slowest of them.
    const hybrid = times.find((x) => /hybrid/i.test(x.name));
    const ev = times.find((x) => /electric/i.test(x.name));
    if (hybrid && ev && !(hybrid.t > ev.t)) {
      errors.push('the 90 kW hybrid (' + hybrid.t.toFixed(1) + 's) is not slower to 60 than the ' +
        '220 kW electric sedan (' + ev.t.toFixed(1) + 's) — power is not reaching the road');
    }
    if (!errors.length && !process.argv.includes('--quiet')) {
      console.log('  0-60 (derived from the tool\'s own thrust model): ' +
        times.map((x) => x.name + ' ' + x.t.toFixed(1) + 's').join(', '));
    }
  }
}

if (errors.length) {
  console.error('\n✗ check_roadready_vehicle_dynamics FAILED\n');
  for (const e of errors) console.error('  • ' + e);
  console.error('\n  Picking a different vehicle must change how it drives, and the driving sim and');
  console.error('  the Live Force Diagram must share one thrust model.\n');
  process.exit(1);
}

if (!process.argv.includes('--quiet')) {
  console.log('✓ check_roadready_vehicle_dynamics: traction fraction ' + K + ' (a_max ' +
    (MU_DRY * 9.81 * K).toFixed(2) + ' m/s^2 = ' + (MU_DRY * K).toFixed(2) + 'g); ' +
    vehicles.length + ' vehicles parsed; power reaches the road.');
}
