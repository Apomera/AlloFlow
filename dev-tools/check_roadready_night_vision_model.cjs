#!/usr/bin/env node
// check_roadready_night_vision_model.cjs — the Night Vision screen and the
// night lesson must use ONE physics model, and its output must not read as
// a speed recommendation.
//
// Why this exists (2026-09-20):
//   The Night Vision Math screen computed a "Max safe speed" using the
//   DAYTIME reaction time (1.5 s) against ideal-dry friction (mu = 0.72),
//   then printed the bare number in green under a heading called "The Rule",
//   directly beside a real Maine statute (§2067). On low beams it told
//   students 66 mph.
//
//   Two things were wrong with that:
//     1. It contradicted this tool's OWN night lesson, which states braking
//        at 60 mph is "~240 ft" — a figure that implies mu ~= 0.50, not the
//        0.72 the shared model uses. One screen, two different physics.
//     2. At night the binding constraint is DETECTION, not grip: an unlit
//        hazard is not recognizable the instant it enters beam range. A
//        1.5 s daytime perception-reaction figure understates that.
//
//   There was also a latent bug: maxSafeSpeed was seeded with the student's
//   CURRENT speed, so a search that found no fit would report whatever they
//   had dialled in as "safe".
//
// The rule, in three parts:
//   A. The night screen uses a night reaction time of at least 2.0 s.
//   B. maxSafeSpeed is not seeded from the student's current speed.
//   C. Every distance the night lesson quotes is reproducible from the
//      shared stoppingDistance model, within a stated tolerance.
//
// Part C is the one that matters most: it is what makes the prose and the
// interactive screen provably tell the same story. It recomputes the numbers
// rather than trusting a hardcoded copy of them.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REL = 'stem_lab/stem_tool_roadready.js';
const src = fs.readFileSync(path.join(ROOT, REL), 'utf8');

const errors = [];

// The shared model, mirrored from the tool. Kept here ONLY to recompute the
// prose figures; the constants are re-read from source below so this file
// cannot quietly disagree with the tool it checks.
const MPH_TO_MS = 0.44704;
const FT_PER_M = 3.28084;

// Reads a number out of the tool. A missing anchor or an un-captured pattern
// must FAIL LOUDLY: an earlier version of this gate used a regex with no
// capture group, produced NaN, and every NaN comparison passed silently — a
// green run that checked nothing.
function readNumber(re, label) {
  const m = src.match(re);
  if (!m || m[1] === undefined) {
    errors.push('could not read ' + label + ' from source (anchor moved, or the pattern has no capture group)');
    return null;
  }
  const n = Number(m[1]);
  if (!Number.isFinite(n)) {
    errors.push(label + ' did not parse as a number: ' + JSON.stringify(m[1]));
    return null;
  }
  return n;
}

const DRY_MU = readNumber(/return ([\d.]+); \/\/ dry/, 'dry friction coefficient');
const NIGHT_RT = readNumber(/var NIGHT_REACTION_SEC = ([\d.]+);/, 'NIGHT_REACTION_SEC');

// Without both constants nothing below can be computed. Stop here rather than
// emit NaN-based "passes".
if (DRY_MU === null || NIGHT_RT === null) {
  console.error('\n✗ check_roadready_night_vision_model FAILED\n');
  for (const e of errors) console.error('  • ' + e);
  console.error('\n  The gate could not read the model constants it checks against.\n');
  process.exit(1);
}

const brakingFt = (mph) => ((mph * MPH_TO_MS) ** 2 / (2 * DRY_MU * 9.81)) * FT_PER_M;
const reactionFt = (mph, rt) => mph * MPH_TO_MS * rt * FT_PER_M;
const totalFt = (mph, rt) => brakingFt(mph) + reactionFt(mph, rt);

// ── A. night reaction time ───────────────────────────────────────────────────
if (NIGHT_RT === null) {
  errors.push('NIGHT_REACTION_SEC is not defined — the night screen is back on a bare literal');
} else if (NIGHT_RT < 2.0) {
  errors.push('NIGHT_REACTION_SEC is ' + NIGHT_RT + ' s; night perception-reaction must be >= 2.0 s ' +
    '(an unlit hazard has to resolve out of darkness before it is recognized)');
}

// Two windows, because the screen's computation and its rendered labels sit
// ~8 KB apart. A single short window silently skipped the label check: the
// mutation that relabelled the ceiling "Max safe speed" passed a green run.
// Bound the view at the next top-level `if (view === ` so the window tracks
// the screen rather than a hardcoded byte count.
const nvStart = src.indexOf("if (view === 'nightVision')");
if (nvStart < 0) {
  errors.push("nightVision view not found (anchor moved?)");
}
const afterNv = src.indexOf("if (view === '", nvStart + 30);
const screenFull = src.slice(nvStart, afterNv > nvStart ? afterNv : nvStart + 20000);
const screenHead = screenFull.slice(0, 2600);

// The label check must see the whole rendered view, not just the head.
if (nvStart >= 0 && !/Physics ceiling on dry pavement/.test(screenFull)) {
  errors.push('the night screen no longer frames its result as a physics ceiling — ' +
    'check the label was not reverted or reworded away');
}
// The framing is only half the protection: the ceiling must also carry the
// caution that says why it is not a target speed. Deleting that line alone
// used to pass this gate.
if (nvStart >= 0 && !/Drive well BELOW that/.test(screenFull)) {
  errors.push('the night screen shows a physics ceiling with no "drive well below that" caution — ' +
    'the bare number reads as a speed students may drive');
}
if (/stoppingDistance\(\s*nvSpeed\s*,\s*fwNv\s*,\s*1\.5\s*\)/.test(screenHead) ||
    /stoppingDistance\(\s*testSpd\s*,\s*fwNv\s*,\s*1\.5\s*\)/.test(screenHead)) {
  errors.push('night screen still calls stoppingDistance with the 1.5 s DAYTIME reaction time');
}

// ── B. maxSafeSpeed must not be seeded from the student's current speed ──────
if (/var maxSafeSpeed = nvSpeed;/.test(screenHead)) {
  errors.push('maxSafeSpeed is seeded from nvSpeed — if the search finds no fit it reports the ' +
    "student's own speed as safe");
}

// ── C. the lesson's quoted distances must match the model ───────────────────
// Anchored to the night lesson body, not the whole file: the same numbers
// appear in quiz distractors elsewhere and would vouch for a broken lesson.
const lessonStart = src.indexOf('At night your headlights illuminate');
if (lessonStart < 0) {
  errors.push('night lesson prose not found (anchor moved?)');
} else {
  const lesson = src.slice(lessonStart, lessonStart + 1400);
  const claim = (re, label) => {
    const m = lesson.match(re);
    if (!m) { errors.push('night lesson no longer states ' + label); return null; }
    return Number(m[1]);
  };

  const braking60 = claim(/braking distance at 60 mph is about (\d+) ft/, 'a 60 mph braking distance');
  const reaction60 = claim(/that is another ~(\d+) ft/, 'a night reaction distance');
  const total60 = claim(/roughly (\d+) ft total/, 'a 60 mph night total');

  const within = (claimed, actual, tol, label) => {
    if (claimed === null) return;
    if (Math.abs(claimed - actual) > tol) {
      errors.push('night lesson says ' + label + ' = ' + claimed + ' ft, but the shared model gives ' +
        actual.toFixed(0) + ' ft (tolerance ' + tol + ' ft)');
    }
  };

  within(braking60, brakingFt(60), 6, 'braking at 60 mph');
  within(reaction60, reactionFt(60, NIGHT_RT), 6, 'night reaction at 60 mph');
  within(total60, totalFt(60, NIGHT_RT), 9, 'night total at 60 mph');

  // The lesson's qualitative claims must survive the model too.
  if (totalFt(60, NIGHT_RT) > 350) {
    errors.push('lesson implies 60 mph just fits inside the 350 ft low-beam range, but the model ' +
      'gives ' + totalFt(60, NIGHT_RT).toFixed(0) + ' ft');
  }
  if (/at 75 mph, you physically cannot stop/i.test(lesson) && totalFt(75, NIGHT_RT) <= 350) {
    errors.push('lesson says 75 mph cannot stop within low beams, but the model gives ' +
      totalFt(75, NIGHT_RT).toFixed(0) + ' ft, which fits');
  }
}

// ── D. the number must not be presented as a recommendation ─────────────────
if (/Max safe speed with/.test(screenFull)) {
  errors.push('the night screen labels the physics ceiling "Max safe speed" — it is the speed at ' +
    'which stopping distance equals sight distance on ideal dry pavement, not a safe speed to drive');
}

if (errors.length) {
  console.error('\n✗ check_roadready_night_vision_model FAILED\n');
  for (const e of errors) console.error('  • ' + e);
  console.error('\n  The Night Vision screen and the night lesson must share ONE physics model,');
  console.error('  use a night (>= 2.0 s) perception-reaction time, and present the result as a');
  console.error('  physics ceiling rather than a speed students should drive.\n');
  process.exit(1);
}

if (!process.argv.includes('--quiet')) {
  console.log('✓ check_roadready_night_vision_model: night reaction ' + NIGHT_RT + ' s, mu ' + DRY_MU +
    '; lesson distances reproduce from the shared model (60 mph: ' +
    brakingFt(60).toFixed(0) + ' + ' + reactionFt(60, NIGHT_RT).toFixed(0) + ' = ' +
    totalFt(60, NIGHT_RT).toFixed(0) + ' ft vs 350 ft low beams).');
}
