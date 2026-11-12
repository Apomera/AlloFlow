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
//
// Round 30 (2026-11-09), part E: the low-beam range itself was wrong. The tool
// said 350 ft; the Maine Driver's License Manual (Rev 4/24, "How Well Can You
// See?", p. 8-8) says:
//   "Headlights will let you see clearly only about 250 feet ahead. Therefore,
//    if you drive faster than about 50 mph on a dark road, you are really
//    'driving blind.'"
// and (night driving section) "High beams let you see twice as far as low beams."
// So the screen constant, the lesson and the ceiling are now pinned to the
// manual: low beams 250 ft, high beams twice that, and the ceiling the tool's
// own stoppingDistance() gives for 250 ft (48 mph) must sit just under the
// manual's "about 50 mph". The lesson example moved from 60 mph to 50 mph, so
// part C reads the speed out of the prose instead of assuming 60.

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

// Use the tool's OWN stoppingDistance() rather than re-deriving v^2/(2*mu*g)
// here. This gate used to carry a private copy of the formula, which meant a
// change to the real function -- dropping the factor of 2, say -- left it
// green while the tool doubled every braking distance it showed a student.
// See dev-tools/roadready_model.cjs for the demonstration.
const { loadRoadReady } = require('./roadready_model.cjs');

let RR;
try {
  RR = loadRoadReady(['stoppingDistance']);
} catch (e) {
  console.error('\n✗ check_roadready_night_vision_model FAILED\n');
  console.error('  • ' + e.message + '\n');
  process.exit(1);
}

const brakingFt = (mph) => RR.stoppingDistance(mph, 'clear', 1.5).braking_ft;
const reactionFt = (mph, rt) => RR.stoppingDistance(mph, 'clear', rt).reaction_ft;
const totalFt = (mph, rt) => RR.stoppingDistance(mph, 'clear', rt).total_ft;

// Cross-check the regex-read constants against the loaded model. A mismatch
// means the formula changed SHAPE (not just its inputs), which the prose
// comparisons below would otherwise report as many confusing failures.
{
  const probe = RR.stoppingDistance(60, 'clear', 1.5);
  const expected = ((60 * MPH_TO_MS) ** 2 / (2 * DRY_MU * 9.81)) * FT_PER_M;
  if (Math.abs(probe.braking_ft - expected) > 0.5) {
    errors.push('the loaded stoppingDistance() disagrees with the constants read from ' +
      'source: braking at 60 mph is ' + probe.braking_ft.toFixed(1) + ' ft from the ' +
      'function but ' + expected.toFixed(1) + ' ft from mu=' + DRY_MU + '. The formula ' +
      'has changed shape -- re-derive the night figures against it.');
  }
  if (Math.abs(probe.mu - DRY_MU) > 1e-9) {
    errors.push('frictionCoef dry mu is ' + probe.mu + ' from the function but ' +
      DRY_MU + ' by regex -- the regex anchor is stale.');
  }
}

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

// ── E. the beam range is the Maine manual's, and the ceiling is the model's ──
// Source: Maine Driver's License Manual Rev 4/24: "Headlights will let you see
// clearly only about 250 feet ahead. Therefore, if you drive faster than about
// 50 mph on a dark road, you are really 'driving blind.'" and "High beams let
// you see twice as far as low beams."
const MANUAL_LOW_BEAM_FT = 250;
const MANUAL_BLIND_MPH = 50;       // "faster than about 50 mph"
const beams = screenHead.match(/var headlightRange = nvBeams === 'high' \? (\d+) : (\d+);/);
let LOW_BEAM = null, HIGH_BEAM = null;
if (!beams) {
  errors.push('could not read the headlight ranges from the night screen (anchor moved?) — ' +
    'the 250 ft low-beam check would otherwise pass on nothing');
} else {
  HIGH_BEAM = Number(beams[1]); LOW_BEAM = Number(beams[2]);
  if (LOW_BEAM !== MANUAL_LOW_BEAM_FT) {
    errors.push('the night screen uses ' + LOW_BEAM + ' ft for low beams; the Maine manual says ' +
      '"only about ' + MANUAL_LOW_BEAM_FT + ' feet ahead" (350 ft was the retired wrong figure)');
  }
  if (HIGH_BEAM !== 2 * LOW_BEAM) {
    errors.push('the night screen uses ' + HIGH_BEAM + ' ft for high beams; the Maine manual says ' +
      'high beams reach twice as far as low beams (' + (2 * LOW_BEAM) + ' ft)');
  }
}
// The ceiling the screen prints must be COMPUTED from the shared model against
// that range, not typed in. Both halves are checked: the code shape, and the
// number the function actually gives.
if (!/stoppingDistance\(\s*testSpd\s*,\s*fwNv\s*,\s*NIGHT_REACTION_SEC\s*\)\.total_ft\s*<=\s*headlightRange/.test(screenHead)) {
  errors.push('the night screen no longer derives its ceiling from ' +
    'stoppingDistance(testSpd, fwNv, NIGHT_REACTION_SEC).total_ft <= headlightRange');
}
if (/maxSafeSpeed \+ ' mph'/.test(screenFull) === false) {
  errors.push('the night screen no longer prints the computed maxSafeSpeed as its ceiling');
}
const ceilingFor = (range) => {
  for (let v = 80; v > 10; v--) if (totalFt(v, NIGHT_RT) <= range) return v;
  return 10;
};
const LOW_CEILING = LOW_BEAM === null ? null : ceilingFor(LOW_BEAM);
if (LOW_CEILING !== null) {
  // 48 mph with mu 0.72 and 2.0 s. It must sit at or just under the manual's
  // "about 50 mph": above it the tool would contradict the manual; far below
  // it the model or the reaction time has drifted.
  if (LOW_CEILING > MANUAL_BLIND_MPH || LOW_CEILING < MANUAL_BLIND_MPH - 5) {
    errors.push('the model puts the low-beam ceiling at ' + LOW_CEILING + ' mph for ' + LOW_BEAM +
      ' ft; the Maine manual says faster than about ' + MANUAL_BLIND_MPH + ' mph is "driving blind", ' +
      'so the ceiling must be ' + (MANUAL_BLIND_MPH - 5) + '-' + MANUAL_BLIND_MPH + ' mph');
  }
  if (LOW_BEAM === MANUAL_LOW_BEAM_FT && NIGHT_RT === 2.0 && LOW_CEILING !== 48) {
    errors.push('with 250 ft low beams and a 2.0 s night reaction the shared model gave a 48 mph ' +
      'ceiling when this was pinned; it now gives ' + LOW_CEILING + ' mph — stoppingDistance() changed');
  }
}
// The screen's own labels must show the same range the computation uses.
if (LOW_BEAM !== null) {
  const lowLabel = screenFull.match(/Low \((\d+) ft\)/);
  if (!lowLabel) errors.push('the night screen no longer labels the low-beam button with its range');
  else if (Number(lowLabel[1]) !== LOW_BEAM) {
    errors.push('the low-beam button says ' + lowLabel[1] + ' ft but the computation uses ' + LOW_BEAM + ' ft');
  }
  const rule = screenFull.match(/Low beams show about (\d+) ft/);
  if (!rule) errors.push('the night screen rule box no longer states the low-beam range');
  else if (Number(rule[1]) !== LOW_BEAM) {
    errors.push('the rule box says low beams show ' + rule[1] + ' ft but the computation uses ' + LOW_BEAM + ' ft');
  }
}

// ── C. the lesson's quoted distances must match the model ───────────────────
// Anchored to the night lesson body, not the whole file: the same numbers
// appear in quiz distractors elsewhere and would vouch for a broken lesson.
const lessonStart = src.indexOf('At night your low beams let you see clearly only about');
if (lessonStart < 0) {
  errors.push('night lesson prose not found (anchor moved?)');
} else {
  // The lesson object: content + formula + variables.
  const lesson = src.slice(lessonStart, lessonStart + 1900);
  const claim = (re, label, group) => {
    const m = lesson.match(re);
    if (!m) { errors.push('night lesson no longer states ' + label); return null; }
    return Number(m[group || 1]);
  };

  // The lesson states its low-beam range; it must be the screen's (and so the manual's).
  const lessonBeam = claim(/only about (\d+) feet ahead \(Maine driver's manual\)/, 'the manual low-beam range');
  if (lessonBeam !== null && LOW_BEAM !== null && lessonBeam !== LOW_BEAM) {
    errors.push('night lesson says low beams show ' + lessonBeam + ' feet but the night screen uses ' +
      LOW_BEAM + ' ft — one tool, two ranges');
  }
  const lessonHigh = claim(/High beams reach about twice as far, ~(\d+) feet/, 'the high-beam range');
  if (lessonHigh !== null && HIGH_BEAM !== null && lessonHigh !== HIGH_BEAM) {
    errors.push('night lesson says high beams reach ' + lessonHigh + ' feet but the night screen uses ' + HIGH_BEAM + ' ft');
  }

  // The worked example: read its SPEED from the prose (it was 60 mph when the
  // tool said 350 ft; it is 50 mph against the manual's 250 ft), then check
  // every figure against the shared model at that speed.
  const exampleMph = claim(/braking distance at (\d+) mph is about \d+ ft/, 'a worked braking example');
  const brakingEx = claim(/braking distance at \d+ mph is about (\d+) ft/, 'a braking distance');
  const reactionEx = claim(/that is another ~(\d+) ft/, 'a night reaction distance');
  const totalEx = claim(/roughly (\d+) ft total/, 'a night total');
  const statedRt = claim(/budget a (\d+(?:\.\d+)?)-second reaction/, 'its night reaction time');
  if (statedRt !== null && Math.abs(statedRt - NIGHT_RT) > 1e-9) {
    errors.push('night lesson budgets a ' + statedRt + '-second reaction but the night screen uses ' +
      NIGHT_RT + ' s — the prose and the screen are on different models');
  }

  const within = (claimed, actual, tol, label) => {
    if (claimed === null) return;
    if (Math.abs(claimed - actual) > tol) {
      errors.push('night lesson says ' + label + ' = ' + claimed + ' ft, but the shared model gives ' +
        actual.toFixed(0) + ' ft (tolerance ' + tol + ' ft)');
    }
  };

  if (exampleMph !== null) {
    within(brakingEx, brakingFt(exampleMph), 6, 'braking at ' + exampleMph + ' mph');
    within(reactionEx, reactionFt(exampleMph, NIGHT_RT), 6, 'night reaction at ' + exampleMph + ' mph');
    within(totalEx, totalFt(exampleMph, NIGHT_RT), 9, 'night total at ' + exampleMph + ' mph');

    // The "variables" line repeats the example; it must be the same model too.
    const vars = lesson.match(/d_stop\((\d+) mph\) ≈ (\d+) ft on dry with a (\d+(?:\.\d+)?) s night reaction \((\d+) ft braking \+ (\d+) ft reacting\)/);
    if (!vars) {
      errors.push('night lesson variables line no longer states d_stop(<mph>) with its braking + reacting parts');
    } else {
      const vMph = Number(vars[1]);
      if (Number(vars[3]) !== NIGHT_RT) errors.push('night lesson variables use a ' + vars[3] + ' s reaction, the screen ' + NIGHT_RT + ' s');
      within(Number(vars[2]), totalFt(vMph, NIGHT_RT), 9, 'variables total at ' + vMph + ' mph');
      within(Number(vars[4]), brakingFt(vMph), 6, 'variables braking at ' + vMph + ' mph');
      within(Number(vars[5]), reactionFt(vMph, NIGHT_RT), 6, 'variables reaction at ' + vMph + ' mph');
    }
    const varBeam = lesson.match(/headlight_range ≈ (\d+) ft \(low\) \/ (\d+) ft \(high\)/);
    if (!varBeam) errors.push('night lesson variables line no longer states headlight_range');
    else if (LOW_BEAM !== null && (Number(varBeam[1]) !== LOW_BEAM || Number(varBeam[2]) !== HIGH_BEAM)) {
      errors.push('night lesson variables say headlight_range ' + varBeam[1] + ' / ' + varBeam[2] +
        ' ft but the night screen uses ' + LOW_BEAM + ' / ' + HIGH_BEAM + ' ft');
    }

    // The lesson's qualitative claims must survive the model too.
    if (/already MORE than your low beams show/.test(lesson) && LOW_BEAM !== null &&
        totalFt(exampleMph, NIGHT_RT) <= LOW_BEAM) {
      errors.push('lesson says the ' + exampleMph + ' mph stop is already MORE than the low beams show, ' +
        'but the model gives ' + totalFt(exampleMph, NIGHT_RT).toFixed(0) + ' ft, which fits inside ' + LOW_BEAM + ' ft');
    }
    if (!/already MORE than your low beams show/.test(lesson)) {
      errors.push('night lesson no longer states that the worked stop exceeds the low-beam range');
    }
  }
  // The manual's own sentence, which the lesson quotes: its speed must be the
  // manual's and must not be below the model's ceiling.
  const blind = claim(/faster than about (\d+) mph on a dark road, you are really 'driving blind'/, "the manual's driving-blind speed");
  if (blind !== null && blind !== MANUAL_BLIND_MPH) {
    errors.push("night lesson attributes 'driving blind' above " + blind + ' mph to the manual; the manual says about ' + MANUAL_BLIND_MPH + ' mph');
  }
  if (/350 ?(?:ft|feet)/.test(lesson)) errors.push('the retired 350 ft low-beam figure is back in the night lesson');
}
// The retired figure must not come back anywhere a student reads about beams.
if (/350 ?(?:ft|feet)/.test(screenFull)) errors.push('the retired 350 ft low-beam figure is back on the night screen');
for (const retired of [/Low beams reach about 350 feet/, /headlights show ~350 ft/, /~350 ft with lows/]) {
  if (retired.test(src)) errors.push('retired low-beam text is back in the source: ' + retired);
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
    '; low beams ' + LOW_BEAM + ' ft (Maine manual), ceiling ' + LOW_CEILING + ' mph from stoppingDistance(); ' +
    'lesson distances reproduce from the shared model (50 mph: ' +
    brakingFt(50).toFixed(0) + ' + ' + reactionFt(50, NIGHT_RT).toFixed(0) + ' = ' +
    totalFt(50, NIGHT_RT).toFixed(0) + ' ft vs ' + LOW_BEAM + ' ft low beams).');
}
