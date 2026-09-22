#!/usr/bin/env node
// check_roadready_cornering_grip.cjs — a steady turn on DRY pavement must be
// something the tyres can actually hold, and must still break away on ice.
//
// Why this exists (2026-09-20):
//   Steering uses a bicycle model whose authority falls with speed:
//
//       ratio       = 0.8 / (1 + (v / knee)^2)
//       wheelAngle  = steer * ratio
//       yawRate     = v * tan(wheelAngle) / wheelbase
//       lateral a   = v * yawRate
//
//   As v grows this tends to a fixed asymptote:  knee^2 * steer * 0.8 / L.
//   With the old knee of 8.5 that was 1.31 g for a sedan at the maximum real
//   input (keyboard and gamepad steering are both scaled by 0.6).
//
//   Dry friction here is mu 0.72, so the geometry demanded roughly twice the
//   grip a street tyre can deliver. The friction circle duly flagged a SKID at
//   every speed at or above ~30 mph ON DRY PAVEMENT, and a sustained highway
//   curve left the car in a permanent skid state — bleeding safety score at
//   8 points/second and teaching that normal cornering is a loss of control.
//
//   Lowering the knee to 6.0 caps the asymptote at ~0.65 g, just under the dry
//   ceiling, without touching low-speed authority (the parking radius is set by
//   the 0.8 numerator, which is unchanged).
//
// The rule:
//   A. The knee is a named constant in a sane band.
//   B. On DRY pavement, a steady turn at highway speed at maximum real input
//      must NOT trip the skid threshold.
//   C. On ICE, that same turn MUST trip it — otherwise the winter lesson is
//      gone and the fix has overshot into "grip is infinite".
//   D. Low-speed turning radius stays in the range the handling test pins,
//      so parking and three-point manoeuvres still work.
//
// B/C/D recompute from the tool's own geometry and friction values rather than
// asserting hardcoded outputs, so a later retune stays honest.

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

const KNEE = readNum(/var RR_STEER_RATIO_KNEE = ([\d.]+);/, 'RR_STEER_RATIO_KNEE');
const MU_DRY = readNum(/return ([\d.]+); \/\/ dry/, 'dry friction coefficient');
const MU_ICE = readNum(/if \(weather === 'ice'\) return ([\d.]+);/, 'ice friction coefficient');
const NUM = readNum(/var ratio = ([\d.]+) \/ \(1 \+ Math\.pow/, 'steering ratio numerator');
// Max steering the player can actually command (input is scaled before use).
const INPUT_SCALE = readNum(/var kbSteer = \(steerRight - steerLeft\) \* ([\d.]+);/,
  'keyboard steering scale');
// Skid fires when demand exceeds available by this factor.
const SKID_FACTOR = readNum(/lateralAccelNeeded > lateralAvail \* ([\d.]+)/, 'skid threshold factor');

if (errors.length) {
  console.error('\n✗ check_roadready_cornering_grip FAILED\n');
  for (const e of errors) console.error('  • ' + e);
  console.error('\n  The gate could not read the constants it checks against.\n');
  process.exit(1);
}

// ── A. knee in a sane band ──────────────────────────────────────────────────
if (KNEE < 4.0 || KNEE > 7.5) {
  errors.push('RR_STEER_RATIO_KNEE is ' + KNEE + '; expected 4.0-7.5. Higher pushes the lateral ' +
    'asymptote above what the tyres can hold (the 8.5 bug: 1.31 g against 0.72 g of grip); ' +
    'much lower makes the car feel numb at speed.');
}

const G = 9.81;
const MPH = 2.23694;
// Use the tool's OWN drivingSteeringGeometry() rather than a hand copy of it.
// This gate used to re-implement ratio / wheelAngle / yawRate / lateral line
// for line, which meant it could not see a change to the real function -- and
// its wheelbase came from a regex with a SILENT `: 4.5` fallback, so a moved
// vehicle table would have left it checking a made-up car.
//
// Demonstrated cost of the copy-the-formula pattern (2026-09-21): dropping the
// factor of 2 from stoppingDistance() left all six RoadReady physics gates
// green while 14 vitest tests went red.
const { loadRoadReady } = require('./roadready_model.cjs');
let MODEL;
try {
  MODEL = loadRoadReady(['drivingSteeringGeometry', 'frictionCoef']);
} catch (e) {
  console.error('\n✗ check_roadready_cornering_grip FAILED\n');
  console.error('  • ' + e.message + '\n');
  process.exit(1);
}

const geometry = (v, steer) => {
  const g = MODEL.drivingSteeringGeometry(v, steer, 'sedan');
  return { wheelAngle: g.wheelAngle, yawRate: g.yawRate,
           lateral: Math.abs(v * g.yawRate) };
};

// Cross-check the regex-read constants against the loaded model. A mismatch
// means an anchor is stale or the formula changed shape, which would otherwise
// surface as a confusing pile of band failures below.
{
  // steering is clamped to +/-0.7 BEFORE the ratio is applied, so an input of
  // 1 behaves as 0.7. Getting this wrong made the cross-check itself fail on a
  // correct tool -- the clamp is part of the model, not a detail to skip.
  const probe = MODEL.drivingSteeringGeometry(30, 1, 'sedan');
  const expectedRatio = NUM / (1 + Math.pow(30 / KNEE, 2));
  const expectedWa = Math.max(-0.7, Math.min(0.7, 1)) * expectedRatio;
  if (Math.abs(probe.wheelAngle - expectedWa) > 1e-6) {
    errors.push('drivingSteeringGeometry(30, 1) gives wheelAngle ' +
      probe.wheelAngle.toFixed(4) + ' rad, but the numerator ' + NUM + ' and knee ' + KNEE +
      ' read from source predict ' + expectedWa.toFixed(4) + '. The steering formula has ' +
      'changed shape -- re-derive the grip bands against it.');
  }
  if (!Number.isFinite(probe.yawRate) || probe.yawRate <= 0) {
    errors.push('drivingSteeringGeometry(30, 1) returned a non-positive yaw rate (' +
      probe.yawRate + ') -- the model cannot turn, so the grip checks below are vacuous.');
  }
}

const MAX_STEER = INPUT_SCALE;

// ── B. dry pavement must hold a steady turn ─────────────────────────────────
// No braking or throttle: the whole friction budget is available laterally.
const dryAvail = MU_DRY * G;
const dryFails = [];
for (const mph of [30, 40, 50, 60, 70]) {
  const need = geometry(mph / MPH, MAX_STEER).lateral;
  if (need > dryAvail * SKID_FACTOR) {
    dryFails.push(mph + ' mph needs ' + need.toFixed(2) + ' m/s2 (' + (need / G).toFixed(2) +
      'g) vs ' + dryAvail.toFixed(2) + ' available');
  }
}
if (dryFails.length) {
  errors.push('a steady turn at full real steering SKIDS on DRY pavement: ' + dryFails.join('; ') +
    '. Normal cornering must not read as a loss of control.');
}

// ── C. ice must still break away ────────────────────────────────────────────
const iceAvail = MU_ICE * G;
const iceNeed = geometry(45 / MPH, MAX_STEER).lateral;
if (iceNeed <= iceAvail * SKID_FACTOR) {
  errors.push('a full-input turn at 45 mph on ICE does not skid (needs ' + iceNeed.toFixed(2) +
    ', has ' + iceAvail.toFixed(2) + ') — the winter grip lesson is gone');
}

// ── D. low-speed authority preserved ────────────────────────────────────────
// tests/roadready_handling_clarity pins the 3 m/s radius between 4 m and 9 m.
const r3 = 3 / geometry(3, MAX_STEER).yawRate;
if (!(r3 > 4 && r3 < 9)) {
  errors.push('turning radius at 3 m/s is ' + r3.toFixed(2) + ' m; the handling test requires ' +
    '4-9 m. Parking and three-point manoeuvres depend on this.');
}

if (errors.length) {
  console.error('\n✗ check_roadready_cornering_grip FAILED\n');
  for (const e of errors) console.error('  • ' + e);
  console.error('\n  Cornering must hold on dry pavement, break away on ice, and keep enough');
  console.error('  low-speed authority to park.\n');
  process.exit(1);
}

if (!process.argv.includes('--quiet')) {
  const hi = geometry(200, MAX_STEER).lateral;
  console.log('✓ check_roadready_cornering_grip: knee ' + KNEE + ', lateral asymptote ' +
    (hi / G).toFixed(2) + 'g vs ' + MU_DRY + 'g dry grip; ice still breaks away; ' +
    '3 m/s radius ' + r3.toFixed(1) + ' m.');
}
