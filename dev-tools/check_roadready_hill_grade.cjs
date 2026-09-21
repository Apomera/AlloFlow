#!/usr/bin/env node
// check_roadready_hill_grade.cjs — hills must actually be felt, and gravity
// must not be quietly scaled down.
//
// Why this exists (2026-09-20):
//   The grade force was `veh.mass * 9.81 * slope * 0.18`, while the comment
//   directly above it said the force is `m * g * sin(atan(slope)) ~= m * g *
//   slope`. The 0.18 appeared nowhere in that explanation.
//
//   1 world unit = 1 metre (METERS_PER_WORLD_UNIT = 1), so `slope` is already
//   rise-over-run — a true dimensionless grade needing no conversion factor.
//   The 0.18 therefore cut gravity to 18% of reality.
//
//   That compounded with already-gentle terrain. The steepest hill the world
//   generates is 2.83% (rural), against a 6% US interstate maximum; the 0.18
//   took it to an effective 0.51%. On the steepest hill in the game the grade
//   contributed LESS THAN HALF of rolling resistance, and coasting changed
//   speed by about 1 mph over ten seconds — below perception.
//
//   Meanwhile the tool teaches "use engine braking (lower gear) on long
//   descents". The simulation could never demonstrate why.
//
// The rule:
//   A. No scaling factor on the grade force: it is m * g * slope.
//   B. The steepest hill the terrain generates must produce a force that is a
//      meaningful multiple of rolling resistance — otherwise hills are noise.
//   C. It must still be drivable: holding highway speed up the steepest hill
//      must fit inside the thrust budget with room to spare.
//
// B and C are recomputed from the tool's own heightAt(), vehicle table and
// traction cap, so retuning the terrain or the vehicles keeps this honest.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_roadready.js'), 'utf8');

const errors = [];

// ── A. no scaling factor ────────────────────────────────────────────────────
const gradeLine = src.match(/gradeForce = veh\.mass \* 9\.81 \* slope([^;]*);/);
if (!gradeLine) {
  errors.push('grade force assignment not found (anchor moved?) — this gate now protects nothing');
} else {
  const tail = gradeLine[1].trim();
  if (tail !== '') {
    errors.push('grade force carries an extra factor "' + tail + '". 1 world unit = 1 metre, so ' +
      'slope is already a true grade: the force is m * g * slope. A factor here silently ' +
      'scales gravity (the 0.18 bug cut it to 18% and made hills imperceptible).');
  }
}

const mpwu = src.match(/var METERS_PER_WORLD_UNIT = ([\d.]+);/);
if (!mpwu) {
  errors.push('could not read METERS_PER_WORLD_UNIT');
} else if (Number(mpwu[1]) !== 1) {
  errors.push('METERS_PER_WORLD_UNIT is ' + mpwu[1] + ', not 1. The grade force assumes slope is ' +
    'rise-over-run in metres; with a different scale it needs an explicit, documented conversion.');
}

// ── reconstruct the terrain height function ─────────────────────────────────
const ampLine = src.match(/var amp = biome === 'rural' \? ([\d.]+)[^;]*;/);
if (!ampLine) errors.push('could not read the terrain amplitude table');

const hA = src.match(/var hA = Math\.sin\(y \* ([\d.]+) \+ phaseA\) \* ([\d.]+);/);
const hB = src.match(/var hB = Math\.sin\(y \* ([\d.]+) \+ phaseB\) \* ([\d.]+);/);
if (!hA || !hB) errors.push('could not read the terrain sine terms');

if (errors.length) {
  console.error('\n✗ check_roadready_hill_grade FAILED\n');
  for (const e of errors) console.error('  • ' + e);
  console.error('\n  The gate could not read the model it checks against.\n');
  process.exit(1);
}

const RURAL_AMP = Number(ampLine[1]);
const FA = Number(hA[1]), WA = Number(hA[2]);
const FB = Number(hB[1]), WB = Number(hB[2]);

const heightAt = (y, amp, seed) => {
  const pa = (seed * 0.0001) % (Math.PI * 2);
  const pb = (seed * 0.0007) % (Math.PI * 2);
  return ((Math.sin(y * FA + pa) * WA + Math.sin(y * FB + pb) * WB) + 1) * amp / 2;
};

// Steepest grade the world can generate, swept across seeds and stations.
let maxGrade = 0;
for (const seed of [1, 12345, 99991, 424242]) {
  for (let y = 0; y < 1200; y += 0.5) {
    const s = Math.abs(heightAt(y + 1, RURAL_AMP, seed) - heightAt(y, RURAL_AMP, seed));
    if (s > maxGrade) maxGrade = s;
  }
}

const G = 9.81;
const CRR = 0.012;
const sedan = src.match(/mass: (\d+), cd: ([\d.]+), area: ([\d.]+), powerKW: (\d+)/);
if (!sedan) {
  console.error('\n✗ check_roadready_hill_grade FAILED\n  • could not read the sedan row\n');
  process.exit(1);
}
const MASS = Number(sedan[1]), CD = Number(sedan[2]), AREA = Number(sedan[3]);

// ── B. hills must be felt ───────────────────────────────────────────────────
const gradeForce = MASS * G * maxGrade;
const rollingForce = CRR * MASS * G;
const ratio = gradeForce / rollingForce;
if (ratio < 1.5) {
  errors.push('the steepest hill produces only ' + ratio.toFixed(2) + 'x rolling resistance (' +
    gradeForce.toFixed(0) + ' N vs ' + rollingForce.toFixed(0) + ' N) — hills are below ' +
    'perception. Either gravity is being scaled or the terrain is too flat to teach grade.');
}

// Coasting speed change over ten seconds, as a perceptibility proxy.
const mphPerTenSec = G * maxGrade * 10 * 2.23694;
if (mphPerTenSec < 3) {
  errors.push('coasting the steepest hill changes speed by only ' + mphPerTenSec.toFixed(1) +
    ' mph over ten seconds — a student cannot feel that, so the engine-braking lesson has ' +
    'nothing to stand on');
}

// ── C. still drivable ───────────────────────────────────────────────────────
const K = Number((src.match(/var RR_LAUNCH_TRACTION_FRACTION = ([\d.]+);/) || [])[1]);
const MU = Number((src.match(/return ([\d.]+); \/\/ dry/) || [])[1]);
if (Number.isFinite(K) && Number.isFinite(MU)) {
  const v = 55 / 2.23694;
  const drag = 0.5 * 1.225 * CD * AREA * v * v;
  const need = drag + rollingForce + gradeForce;
  const cap = MASS * MU * G * K;
  if (need > cap * 0.6) {
    errors.push('holding 55 mph up the steepest hill needs ' + need.toFixed(0) + ' N of ' +
      (cap).toFixed(0) + ' N available (' + (need / cap * 100).toFixed(0) + '% of budget) — ' +
      'grades this steep make ordinary driving a struggle');
  }
}

if (errors.length) {
  console.error('\n✗ check_roadready_hill_grade FAILED\n');
  for (const e of errors) console.error('  • ' + e);
  console.error('\n  Hills must be felt (the tool teaches engine braking on descents) without');
  console.error('  making ordinary driving a fight against gravity.\n');
  process.exit(1);
}

if (!process.argv.includes('--quiet')) {
  console.log('✓ check_roadready_hill_grade: gravity unscaled (m*g*slope); steepest terrain ' +
    (maxGrade * 100).toFixed(2) + '% = ' + ratio.toFixed(1) + 'x rolling resistance, ' +
    mphPerTenSec.toFixed(1) + ' mph per 10 s of coasting.');
}
