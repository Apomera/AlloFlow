#!/usr/bin/env node
'use strict';

// Every stopping-distance figure the PROSE quotes must be reproducible from
// the tool's own stoppingDistance() model.
//
// Why this exists (2026-09-21):
//   Hand-written cards drift from the simulation one number at a time, and
//   each drift looks defensible in isolation. Only when you line them up do
//   the contradictions show:
//
//     "132 ft to react + 180 ft to brake = 312 ft"   (tailgating quiz)
//     "at 60 mph you need 312 ft to react and stop"  (debrief advice)
//     "braking distance at 60 mph is about 170 ft"   (night card)
//
//   The model says 132 + 167 = 299. So the tool stated braking at 60 mph as
//   both 180 ft and 170 ft, in cards a student can see in the same session.
//   The 180 figure implies mu 0.67 against the model's 0.72 — close enough to
//   pass review, far enough to contradict a sibling card.
//
//   The school-bus card was worse: "sedan ~200 ft at 55 mph" against a model
//   value of 261, in a sentence ending "Physics is non-negotiable."
//
// The rule: scan the source for prose figures of the form "<N> mph ... <D> ft"
// and check D against the model. This is a SWEEP, not a fixed list, so a new
// card inherits the check automatically.
//
// Figures that are deliberately not the dry 1.5 s model — a winter-tire
// comparison, an FMCSA truck distance — are declared in EXEMPT with the reason.
// An exemption is a claim about a DIFFERENT model, not permission to be wrong.
//
// Round 30 (2026-11-09) removed two kinds of exemption in favour of checks:
//   - NIGHT figures (2 s reaction) are no longer skipped. A string that
//     declares a night reaction is checked against the tool's own
//     stoppingDistance() at NIGHT_REACTION_SEC, read from the source.
//   - The cheat sheet now quotes the Maine Driver's License Manual's own
//     table. Those are the manual's figures, not the model's, so that one
//     line is checked against the manual's table pinned below.
//   - An exempt pair that the tool no longer quotes is an error: a stale
//     exemption is a hole waiting for the wrong number to walk through.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_roadready.js'), 'utf8');

const FAIL_BANNER = '✗ check_roadready_stopping_prose FAILED';
const errors = [];

function readNum(re, label) {
  const m = src.match(re);
  if (!m || m[1] === undefined) { errors.push('could not read ' + label); return null; }
  const n = Number(m[1]);
  if (!Number.isFinite(n)) { errors.push(label + ' did not parse'); return null; }
  return n;
}

const MU = readNum(/return ([\d.]+); \/\/ dry/, 'dry friction coefficient');
const MPH_TO_MS = readNum(/var MPH_TO_MS = ([\d.]+);/, 'MPH_TO_MS');
const FT_PER_M = readNum(/var FT_PER_M = ([\d.]+);/, 'FT_PER_M');

if (errors.length) {
  console.error('\n✗ check_roadready_stopping_prose FAILED\n');
  for (const e of errors) console.error('  • ' + e);
  process.exit(1);
}

// Load the tool and use ITS OWN stoppingDistance(), rather than re-deriving
// v^2/(2*mu*g) here. Proven necessary on 2026-09-21: dropping the factor of 2
// from the real stoppingDistance() -- which doubles every braking distance the
// tool reports -- left this gate and all five sibling physics gates GREEN,
// while 14 tests in the vitest suite went red. The tests called the function;
// the gates each carried a private copy of the formula that stayed correct no
// matter what the tool did. A gate that recomputes the value cannot fail.
//
// The extracted MU / MPH_TO_MS / FT_PER_M above are kept, but only to report
// the model in the success line and to cross-check the loaded function below.
const vm = require('vm');
function loadRoadReady() {
  const win = { __RR_TEST_EXPORTS__: {} };
  const noop = function () {};
  const elStub = () => ({ style: {}, setAttribute: noop, appendChild: noop,
    addEventListener: noop, getContext: () => null,
    classList: { add: noop, remove: noop } });
  const doc = { createElement: elStub, getElementById: () => null,
    head: { appendChild: noop }, body: { appendChild: noop },
    addEventListener: noop, querySelector: () => null, querySelectorAll: () => [] };
  const sandbox = {
    window: win, globalThis: win, self: win, document: doc,
    navigator: { userAgent: 'node', language: 'en' },
    console: { log: noop, warn: noop, error: noop, info: noop },
    Math, Date, JSON,
    setTimeout: noop, clearTimeout: noop, setInterval: noop, clearInterval: noop,
    requestAnimationFrame: noop, cancelAnimationFrame: noop,
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    performance: { now: () => 0 },
  };
  win.document = doc;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'stem_tool_roadready.js', timeout: 60000 });
  const RR = win.__RR_TEST_EXPORTS__ && win.__RR_TEST_EXPORTS__.roadReady;
  if (!RR || typeof RR.stoppingDistance !== 'function') {
    throw new Error('roadready loaded but did not export stoppingDistance() via ' +
      '__RR_TEST_EXPORTS__ -- this gate cannot verify anything, so it fails rather ' +
      'than falling back to its own copy of the formula');
  }
  return RR;
}

let RR;
try {
  RR = loadRoadReady();
} catch (e) {
  console.error('\n' + FAIL_BANNER + '\n');
  console.error('  • ' + e.message + '\n');
  process.exit(1);
}

// The night reaction time the tool itself uses (Night Vision Math). Night prose
// is checked against the model at THIS value, so the gate cannot drift from
// the screen. Missing anchor = loud failure, never a silent skip.
const NIGHT_RT = readNum(/var NIGHT_REACTION_SEC = ([\d.]+);/, 'NIGHT_REACTION_SEC');

// The Maine Driver's License Manual's own table (Rev 4/24, section 8, p. 8-8,
// review_content/sources/dl/manual.txt lines 3320-3346):
//   "Assuming you have good tires, good brakes, and dry pavement conditions the
//    following chart should help to determine how far ahead you should see to
//    drive safely when traveling at certain speeds.
//    STOPPING DISTANCE AT DIFFERENT SPEEDS  On Dry Level Pavement
//    M.P.H. | Reaction Time Distance (feet) | Braking distance (feet) | Total Stopping Distance (feet) | Vehicle Lengths
//    10 | 11 | 9 | 20 | 1      20 | 22 | 23 | 45 | 3      30 | 33 | 45 | 78 | 5
//    40 | 44 | 81 | 125 | 8    50 | 55 | 133 | 188 | 13   60 | 66 | 206 | 272 | 18
//    70 | 77 | 304 | 381 | 25"
// The manual's reaction distance is 0.75 s of travel (11 ft at 10 mph), which
// is why its totals are lower than the tool's 1.5 s model. They are the
// figures a student is tested on, so the tool quotes them as the manual's.
const MANUAL_TOTAL_FT = { 10: 20, 20: 45, 30: 78, 40: 125, 50: 188, 60: 272, 70: 381 };
const MANUAL_REACTION_FT = { 10: 11, 20: 22, 30: 33, 40: 44, 50: 55, 60: 66, 70: 77 };
const MANUAL_BRAKING_FT = { 10: 9, 20: 23, 30: 45, 40: 81, 50: 133, 60: 206, 70: 304 };
for (const k of Object.keys(MANUAL_TOTAL_FT)) {
  if (MANUAL_REACTION_FT[k] + MANUAL_BRAKING_FT[k] !== MANUAL_TOTAL_FT[k]) {
    errors.push('the pinned manual table is internally inconsistent at ' + k + ' mph (mistyped pin)');
  }
}
// A string literal that presents itself as the manual's table. Every
// "<mph> mph <ft> ft" pair inside it must be the manual's TOTAL for that
// speed, exactly; the model is not consulted for it.
const MANUAL_LINE = /'(Maine driver\\'s manual table \(dry, level road\):(?:[^'\\]|\\.)*)'/g;
const manualRanges = [];
let manualPairs = 0;
{
  let ml;
  while ((ml = MANUAL_LINE.exec(src)) !== null) {
    const startAt = ml.index, endAt = ml.index + ml[0].length;
    manualRanges.push([startAt, endAt]);
    const pairs = [...ml[1].matchAll(/(\d{2}) mph (\d{2,4}) ft/g)];
    if (pairs.length < 4) {
      errors.push('the manual-table line quotes only ' + pairs.length + ' speed/distance pair(s); ' +
        'it should carry the table (anchor or wording changed?)');
    }
    for (const p of pairs) {
      const mph = Number(p[1]), ft = Number(p[2]);
      manualPairs++;
      if (!(mph in MANUAL_TOTAL_FT)) {
        errors.push('manual-table line quotes ' + mph + ' mph, which is not a row of the Maine manual table');
      } else if (MANUAL_TOTAL_FT[mph] !== ft) {
        errors.push('manual-table line says ' + mph + ' mph ' + ft + ' ft; the Maine manual (Rev 4/24) says ' +
          MANUAL_TOTAL_FT[mph] + ' ft');
      }
    }
    // Any other ft figure in the line (a number not paired with a speed) is unverifiable here.
    const stray = ml[1].replace(/(\d{2}) mph (\d{2,4}) ft/g, '').match(/\d{2,4} ?(?:ft|feet)\b/);
    if (stray) errors.push('manual-table line carries a distance that is not a "<mph> mph <ft> ft" pair: ' + stray[0]);
  }
}
// A sentence that attributes its figures to the manual's chart ("The manual's chart
// gives a total stopping distance of 188 feet at 50 mph ..."; permit explanations do
// this). Every "<ft> feet at <mph> mph" pair in that literal must be the manual's
// TOTAL, exactly; a figure the manual does not print fails here, not silently.
const MANUAL_CHART = /'((?:[^'\\]|\\.)*manual\\'s chart(?:[^'\\]|\\.)*)'/g;
let manualChartPairs = 0;
{
  let mc;
  while ((mc = MANUAL_CHART.exec(src)) !== null) {
    manualRanges.push([mc.index, mc.index + mc[0].length]);
    const after = mc[1].slice(mc[1].indexOf("manual\\'s chart"));
    for (const p of after.matchAll(/(\d{2,4}) (?:feet|ft) at (\d{2}) mph/g)) {
      const ft = Number(p[1]), mph = Number(p[2]);
      manualChartPairs++;
      if (!(mph in MANUAL_TOTAL_FT)) errors.push('a "manual\'s chart" sentence quotes ' + mph + ' mph, which is not a row of the Maine manual table');
      else if (MANUAL_TOTAL_FT[mph] !== ft) errors.push('a "manual\'s chart" sentence says ' + ft + ' feet at ' + mph + ' mph; the Maine manual (Rev 4/24) says ' + MANUAL_TOTAL_FT[mph] + ' ft');
    }
  }
}
const inManualLine = (pos) => manualRanges.some(([a, b]) => pos >= a && pos < b);

const brakingFt = (mph) => RR.stoppingDistance(mph, 'clear', 1.5).braking_ft;
const reactionFt = (mph, rt) => RR.stoppingDistance(mph, 'clear', rt).reaction_ft;
const totalFt = (mph, rt) => RR.stoppingDistance(mph, 'clear', rt).total_ft;

// Cross-check: the constants this gate reads by regex must agree with the
// loaded model. If they diverge, one of the two is reading stale source.
{
  const probe = RR.stoppingDistance(60, 'clear', 1.5);
  const expected = ((60 * MPH_TO_MS) ** 2 / (2 * MU * 9.81)) * FT_PER_M;
  if (Math.abs(probe.braking_ft - expected) > 0.5) {
    errors.push('the loaded stoppingDistance() disagrees with the constants read from ' +
      'source: braking at 60 mph is ' + probe.braking_ft.toFixed(1) + ' ft from the ' +
      'function but ' + expected.toFixed(1) + ' ft from mu=' + MU + '. The formula in ' +
      'stoppingDistance() has changed shape -- re-derive the prose figures against it.');
  }
  if (Math.abs(probe.mu - MU) > 1e-9) {
    errors.push('frictionCoef dry mu is ' + probe.mu + ' from the function but ' + MU +
      ' by regex -- the regex anchor is stale.');
  }
}

// Claims that legitimately describe something other than the dry 1.5 s model.
// Each needs a reason; an unexplained exemption is how a wrong number hides.
// Exact (speed, distance) pairs that legitimately are NOT the dry 1.5 s model.
// An explicit pair beats any text window: a window wide enough to recognise
// the exempt phrase also reaches the neighbouring clause and excuses whatever
// number is sitting there, and a window tight enough to avoid that cannot see
// the phrase at all. Both failure modes were observed while building this.
const EXEMPT_PAIRS = new Set([
  '60/88',   // the 1-second gap being compared against
  '55/390',  // FMCSA loaded bus/truck
  '40/535',  // ice braking only (mu 0.10)
  '35/154',  // distance travelled BLIND during a 3 s phone glance, not a stop
]);
// Removed in round 30: '60/343', '60/176', '60/345' (night figures are now
// CHECKED at the night reaction time, below); '55/6', '55/000', '55/0' (the
// freight-train line no longer quotes feet: it cites Operation Lifesaver's
// "more than a mile"); '40/74' (dry braking alone now matches the model's
// braking term and needs no exemption); '65/525' (the tool writes "about 525 ft
// to stop from 65 mph": the distance comes BEFORE the speed, so this sweep never
// reaches it and the exemption was never used; that figure is pinned in
// check_roadready_sourced_statistics instead).
const usedExempt = new Set();

// A string that DECLARES the night model: "2 s night reaction", "2-second
// reaction". Only then may a figure be checked against the night model, and it
// is checked, not waved through.
const NIGHT_DECL = /(\d+(?:\.\d+)?)[ -]s(?:econd)? (?:night )?reaction/;
function quotedRunAround(pos) {
  // The source line holding pos, cut to the string literal around it. Lesson
  // texts are one literal per line, so the line is the right outer bound.
  const a = src.lastIndexOf(String.fromCharCode(10), pos) + 1;
  let b = src.indexOf(String.fromCharCode(10), pos); if (b < 0) b = src.length;
  return src.slice(a, b);
}

// Pull "<speed> mph ... <distance> ft" pairs out of quoted prose, but ONLY
// where the surrounding words say the distance is a STOP.
//
// A bare speed/distance regex is far too greedy: it also catches signal-ahead
// distances ("signal at least 100 ft"), per-second travel ("60 mph = 88 feet
// per second"), scenario setups ("a deer 200 ft ahead"), and train speeds.
// Those are all correct and none are stopping distances, so flagging them
// trains the reader to ignore this gate.
const STOP_WORDS = /(stop|stopping|brake|braking|d_stop)/i;
// Anchor on the speed, then check EVERY distance that follows it in the same
// quoted string — not just the first. A non-greedy "first ft after the mph"
// regex matched only the 132 ft reaction figure in
//   "At 60 mph … you need 132 ft to react + 180 ft to brake = 312 ft"
// and stopped there, so the two WRONG numbers in that sentence went unseen.
const SPEED = /(\d{2}) mph/g;
const DISTANCE = /(\d{2,4}) ?(?:ft|feet)\b/g;
let m;
let nightChecked = 0;
const checked = [];
const near = (a, b) => Math.abs(a - b) / b <= 0.06;

while ((m = SPEED.exec(src)) !== null) {
  const mph = Number(m[1]);
  if (mph < 15 || mph > 85) continue;

  // Only prose. The previous test -- "is there a quote in the 80 chars before
  // the speed?" -- silently EXCLUDED long cards, which are exactly the ones
  // that accumulate drifted numbers: the tailgating advice string runs well
  // over 80 characters before its "60 mph". Instead, require that the speed
  // sits inside a quoted run at all, by checking there is a quote somewhere
  // before it on the same line and the line is not a pure code expression.
  const lineStart = src.lastIndexOf(String.fromCharCode(10), m.index) + 1;
  const linePrefix = src.slice(lineStart, m.index);
  if (!/['"]/.test(linePrefix)) continue;
  // The manual's own table is verified against the manual above, not the model.
  if (inManualLine(m.index)) continue;

  // Scan the REST of this quoted run for distances, not just the first one.
  // Stop at a sentence boundary as well as a quote: "At 60 mph it is ~300
  // ft. At 80 mph it is ~475 ft" must not attribute the 475 to 60 mph.
  const rest = src.slice(m.index, m.index + 220).split(/['"]/)[0].split(/\. (?=[A-Z])/)[0];
  DISTANCE.lastIndex = 0;
  let d;
  while ((d = DISTANCE.exec(rest)) !== null) {
    const ft = Number(d[1]);
    // Two windows, deliberately different sizes:
    //   classify - wide enough to see "to stop" / "to brake" wording
    //   exempt    - TIGHT, so an exempt phrase in a neighbouring clause
    //               cannot excuse the number next to it. A 40-char
    //               lookahead previously let "A 1-second gap" exempt the
    //               wrong "180 ft to brake" sitting just before it.
    // Classification must also see the words BEFORE the speed anchor: in
    // "your braking distance at 60 mph is about 170 ft" the word
    // "braking" precedes the anchor, so a span starting at the anchor
    // never sees it and the figure goes unclassified -- and unchecked.
    const preAnchor = src.slice(Math.max(0, m.index - 60), m.index);
    const span = preAnchor + rest.slice(Math.max(0, d.index - 45), d.index + 40);
    const tight = rest.slice(Math.max(0, d.index - 24), d.index + 18);
    const context = src.slice(Math.max(0, m.index - 140), m.index + 260);

    // Match the exemption against the SPAN around THIS distance, not the
    // wide context: an exempt phrase elsewhere in the sentence must not
    // excuse a wrong number next to it. That flaw let a 200 ft sedan claim
    // pass because the same sentence mentioned a loaded bus.
    if (EXEMPT_PAIRS.has(mph + '/' + ft)) { usedExempt.add(mph + '/' + ft); continue; }
    if (!STOP_WORDS.test(span)) continue;
    if (/per second|feet per|ft per/i.test(span)) continue;

    const total = totalFt(mph, 1.5);
    const braking = brakingFt(mph);
    const reaction = reactionFt(mph, 1.5);
    if (near(ft, total) || near(ft, braking) || near(ft, reaction)) {
      checked.push(mph + ' mph / ' + ft + ' ft');
      continue;
    }
    // Night figures: only when the string itself declares a night reaction
    // time, and only if that time is the tool's NIGHT_REACTION_SEC. Then the
    // figure must equal the model AT that reaction time (tighter tolerance:
    // these are typed from the model, so 3% is generous).
    const decl = NIGHT_DECL.exec(quotedRunAround(m.index));
    if (decl && NIGHT_RT !== null) {
      const declared = Number(decl[1]);
      if (Math.abs(declared - NIGHT_RT) > 1e-9) {
        errors.push(mph + ' mph -> ' + ft + ' ft sits in a string declaring a ' + declared +
          ' s reaction, but the tool\'s night model uses ' + NIGHT_RT + ' s');
        continue;
      }
      const nTotal = totalFt(mph, NIGHT_RT), nReaction = reactionFt(mph, NIGHT_RT);
      const nearNight = (a, b) => Math.abs(a - b) / b <= 0.03;
      if (nearNight(ft, nTotal) || nearNight(ft, nReaction)) {
        checked.push(mph + ' mph / ' + ft + ' ft (night, ' + NIGHT_RT + ' s)');
        nightChecked++;
        continue;
      }
      errors.push(mph + ' mph -> ' + ft + ' ft does not match the NIGHT model the string declares (' +
        NIGHT_RT + ' s: total ' + nTotal.toFixed(0) + ', reaction ' + nReaction.toFixed(0) +
        ', braking ' + braking.toFixed(0) + ' ft). Context: ...' +
        context.replace(/\s+/g, ' ').slice(60, 200) + '...');
      continue;
    }
    errors.push(mph + ' mph -> ' + ft + ' ft does not match the model ' +
      '(total ' + total.toFixed(0) + ', braking ' + braking.toFixed(0) +
      ', reaction ' + reaction.toFixed(0) + ' ft). Context: ...' +
      context.replace(/\s+/g, ' ').slice(60, 200) + '...');
  }
}

// A declared exemption the tool no longer quotes protects nothing and would
// excuse that exact wrong pair if it ever appeared. Remove it deliberately.
for (const pair of EXEMPT_PAIRS) {
  if (!usedExempt.has(pair)) {
    errors.push('exempt pair ' + pair + ' is no longer quoted anywhere in the tool — delete the stale exemption');
  }
}
// The night lesson's variables line must have been reached: if no night figure
// was checked, the night branch is dead and the old skip is effectively back.
if (nightChecked === 0) {
  errors.push('no night-model figure was checked: the night lesson line "d_stop(<mph>) ≈ <ft> on dry with a ' +
    '2 s night reaction" was not found or no longer parses');
}
if (manualPairs === 0) {
  errors.push('the Maine manual stopping table line (cheat sheet, key cheat_manual_stopping) was not found — ' +
    'the manual-figure check is checking nothing');
}

if (errors.length) {
  console.error('\n✗ check_roadready_stopping_prose FAILED\n');
  for (const e of errors) console.error('  • ' + e + '\n');
  console.error('  A quoted stopping distance must be reproducible from the tool\'s own');
  console.error('  stoppingDistance(), or declared in EXEMPT with the model it does use.\n');
  process.exit(1);
}

if (!process.argv.includes('--quiet')) {
  console.log('✓ check_roadready_stopping_prose: ' + checked.length +
    ' quoted speed/distance pair(s) reproduce from the model (mu ' + MU +
    ', 1.5 s; ' + nightChecked + ' at the ' + NIGHT_RT + ' s night reaction); ' + manualPairs +
    ' Maine-manual table figure(s) match the manual; ' + EXEMPT_PAIRS.size + ' declared exempt pairs, all in use.');
}
