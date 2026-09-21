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
// Figures that are deliberately not the dry 1.5 s model — a night card using a
// 2 s reaction, a winter-tire comparison, a freight-train distance — are
// declared in EXEMPT with the reason. An exemption is a claim about a
// DIFFERENT model, not permission to be wrong.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_roadready.js'), 'utf8');

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

const G = 9.81;
const brakingFt = (mph) => ((mph * MPH_TO_MS) ** 2 / (2 * MU * G)) * FT_PER_M;
const reactionFt = (mph, rt) => mph * MPH_TO_MS * rt * FT_PER_M;
const totalFt = (mph, rt) => brakingFt(mph) + reactionFt(mph, rt);

// Claims that legitimately describe something other than the dry 1.5 s model.
// Each needs a reason; an unexplained exemption is how a wrong number hides.
// Exact (speed, distance) pairs that legitimately are NOT the dry 1.5 s model.
// An explicit pair beats any text window: a window wide enough to recognise
// the exempt phrase also reaches the neighbouring clause and excuses whatever
// number is sitting there, and a window tight enough to avoid that cannot see
// the phrase at all. Both failure modes were observed while building this.
const EXEMPT_PAIRS = new Set([
  '60/343',  // night lesson variables: 2.0 s reaction
  '60/176',  // night card: reaction at 2.0 s
  '60/345',  // night card: 2.0 s total
  '60/88',   // the 1-second gap being compared against
  '30/59',   // winter tire on packed snow
  '55/390',  // FMCSA loaded bus/truck
  '65/525',  // FMCSA loaded tractor-trailer
  '55/6',    // freight train: "over 1 mile (6,000 ft)" parses oddly
  '55/000',  // ditto, comma split
  '40/535',  // ice braking only (mu 0.10)
  '40/74',   // dry braking only, no reaction term
  '55/0',    // freight-train artefact
  '65/316',  // FMCSA car figure (their 2.5 s reaction), quoted for comparison
  '35/154',  // distance travelled BLIND during a 3 s phone glance, not a stop
]);

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
    if (EXEMPT_PAIRS.has(mph + '/' + ft)) continue;
    if (!STOP_WORDS.test(span)) continue;
    if (/per second|feet per|ft per/i.test(span)) continue;

    const total = totalFt(mph, 1.5);
    const braking = brakingFt(mph);
    const reaction = reactionFt(mph, 1.5);
    if (near(ft, total) || near(ft, braking) || near(ft, reaction)) {
      checked.push(mph + ' mph / ' + ft + ' ft');
      continue;
    }
    errors.push(mph + ' mph -> ' + ft + ' ft does not match the model ' +
      '(total ' + total.toFixed(0) + ', braking ' + braking.toFixed(0) +
      ', reaction ' + reaction.toFixed(0) + ' ft). Context: ...' +
      context.replace(/\s+/g, ' ').slice(60, 200) + '...');
  }
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
    ', 1.5 s); ' + EXEMPT_PAIRS.size + ' declared exempt pairs.');
}
