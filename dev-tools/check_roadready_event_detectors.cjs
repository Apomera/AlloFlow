#!/usr/bin/env node
// check_roadready_event_detectors.cjs — a driving-behaviour detector must be
// able to FIRE. A threshold the simulation can never reach is a feature that
// silently does nothing.
//
// Why this exists (2026-09-20):
//   Two detectors were dead or half-dead, and nothing caught it because the
//   surrounding code is correct — only the NUMBERS were unreachable.
//
//   1. Jackrabbit start (accel > 3.5 m/s^2). The launch traction cap used to
//      be mass * mu * g * 0.4, giving a_max = 2.83 m/s^2 on dry pavement. The
//      threshold was above the physical ceiling, so a jackrabbit start could
//      never be detected — while the drive debrief reported a jackrabbit
//      count, docked efficiency points for it, and gated star ratings on it.
//      Raising the traction fraction to 0.6 (a_max 4.24) revived it.
//
//   2. Hard brake (accel < -5, severity 3 at accel < -7), fixed regardless of
//      surface. Braking decel is capped by grip:
//        dry  6.50 m/s^2 -> hard fired, but severity 3 NEVER did (max ~6.91
//                           even counting drag)
//        rain 3.79       -> nothing fired; a panic stop on wet pavement, the
//                           exact thing to flag, read as ordinary braking
//        snow 1.99 / ice 0.90 -> nothing fired, so the winter threshold-braking
//                           lesson had no feedback at all
//      Now expressed as a fraction of the surface ceiling.
//
// The rule: every threshold below must sit inside what the model can actually
// produce on the surfaces it applies to. Recomputed from the tool's own
// constants, so retuning grip or traction keeps this honest.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_roadready.js'), 'utf8');

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

const G = 9.81;
const MU = {
  clear: readNum(/return ([\d.]+); \/\/ dry/, 'dry friction'),
  rain: readNum(/if \(weather === 'rain'\) return ([\d.]+);/, 'rain friction'),
  snow: readNum(/if \(weather === 'snow'\) return ([\d.]+);/, 'snow friction'),
  ice: readNum(/if \(weather === 'ice'\) return ([\d.]+);/, 'ice friction'),
};
const K = readNum(/var RR_LAUNCH_TRACTION_FRACTION = ([\d.]+);/, 'RR_LAUNCH_TRACTION_FRACTION');
const JACKRABBIT = readNum(/if \(accel > ([\d.]+) && lastStateRef\.current\.accel <= [\d.]+/,
  'jackrabbit acceleration threshold');

if (errors.length) {
  console.error('\n✗ check_roadready_event_detectors FAILED\n');
  for (const e of errors) console.error('  • ' + e);
  console.error('\n  The gate could not read the constants it checks against.\n');
  process.exit(1);
}

// ── Jackrabbit must be reachable, but not trivially ─────────────────────────
const aMax = MU.clear * G * K;
if (JACKRABBIT >= aMax) {
  errors.push('jackrabbit threshold is ' + JACKRABBIT.toFixed(2) + ' m/s^2 but the launch cap ' +
    'allows only ' + aMax.toFixed(2) + ' — the detector can NEVER fire, while the debrief still ' +
    'reports jackrabbit counts and docks efficiency points for them');
} else if (JACKRABBIT < aMax * 0.5) {
  errors.push('jackrabbit threshold is ' + JACKRABBIT.toFixed(2) + ' m/s^2, under half the ' +
    aMax.toFixed(2) + ' ceiling — ordinary acceleration would be flagged as aggressive');
}

// ── Hard brake must scale with the surface, not be a fixed number ───────────
if (/accel < -5 && lastStateRef\.current\.accel >= -5/.test(src)) {
  errors.push('hard-brake detection is back on a fixed -5 threshold. Braking decel is capped by ' +
    'grip, so a fixed value fires only on dry pavement: rain tops out near 3.8 and ice near 0.9, ' +
    'so a panic stop in the conditions that matter most would register nothing.');
}
const usesCeiling = /var brakeCeiling =/.test(src) && /var hardBrakeAt = -brakeCeiling \* ([\d.]+);/.test(src);
if (!usesCeiling) {
  errors.push('hard-brake detection no longer derives its threshold from the surface grip ceiling');
} else {
  const hardFrac = readNum(/var hardBrakeAt = -brakeCeiling \* ([\d.]+);/, 'hard-brake fraction');
  const sevFrac = readNum(/var severeBrakeAt = -brakeCeiling \* ([\d.]+);/, 'severe-brake fraction');
  if (hardFrac !== null && sevFrac !== null) {
    if (!(hardFrac > 0.5 && hardFrac < 0.95)) {
      errors.push('hard-brake fraction ' + hardFrac + ' should sit between 0.5 and 0.95 of the ' +
        'grip ceiling (too low flags normal braking, too high never fires)');
    }
    if (!(sevFrac > hardFrac && sevFrac <= 1)) {
      errors.push('severe-brake fraction ' + sevFrac + ' must be above the hard-brake fraction ' +
        hardFrac + ' and at most 1.0 — above 1.0 it is unreachable, which is the bug the fixed ' +
        '-7 threshold had on every surface');
    }
    // Both tiers must be reachable on EVERY surface the sim offers.
    for (const [surface, mu] of Object.entries(MU)) {
      const ceiling = Math.max(0.5, mu * 0.92 * G);
      // Max achievable decel: full braking plus rolling resistance (drag adds
      // more at speed, so this is the conservative floor).
      const achievable = mu * 0.92 * G + 0.012 * G;
      if (achievable <= ceiling * sevFrac) {
        errors.push('severity-3 hard brake is unreachable on ' + surface + ' (max decel ' +
          achievable.toFixed(2) + ' vs threshold ' + (ceiling * sevFrac).toFixed(2) + ')');
      }
    }
  }
}

if (errors.length) {
  console.error('\n✗ check_roadready_event_detectors FAILED\n');
  for (const e of errors) console.error('  • ' + e);
  console.error('\n  A detector whose threshold the simulation cannot reach is dead code that');
  console.error('  still shows up in the debrief. Thresholds must scale with available grip.\n');
  process.exit(1);
}

if (!process.argv.includes('--quiet')) {
  console.log('✓ check_roadready_event_detectors: jackrabbit ' + JACKRABBIT +
    ' m/s^2 reachable under a ' + aMax.toFixed(2) + ' ceiling; hard brake scales with grip ' +
    'and both tiers fire on dry, rain, snow and ice.');
}
