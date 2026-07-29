#!/usr/bin/env node
// check_dead_signals.cjs — catch "a structure that looks like a signal and is
// permanently empty".
//
// Bug class (three separate defects found by hand in one session, July 2026):
//
//   1. wordScramble — the directions composer offered "+ Word Scramble" as an
//      auto-checking goal for weeks. WordScrambleGame did not even ACCEPT an
//      onGameComplete prop, so the ledger key never received an entry and the
//      goal could never tick no matter what a student did.
//
//   2. timeOnTask — declared as { totalSessionMinutes, byResourceType }, saved
//      to localStorage on every change, and READ into the student progress
//      export as engagement.timeOnTaskMinutes. Nothing ever wrote either field.
//      A teacher reading that report saw a real engagement block with one
//      fabricated zero sitting inside it.
//
//   3. timelineGame / conceptSortGame — keys in the allo_game_completions
//      default that nothing emits (the real names are timeline / conceptSort).
//      Harmless at runtime, but a false map of the vocabulary: it is what made
//      a later reader believe the gameType list was something it was not.
//
// The shared shape: a declared signal with no writer. It is invisible to every
// other gate — the code parses, renders, persists, and reports. It just never
// contains anything. Finding these by hand is luck; this makes it mechanical.
//
// TWO PRECISE CHECKS (both near-zero false positive on purpose — a noisy gate
// gets bypassed, and a bypassed gate is decoration):
//
//   A. Every gameType that some system OFFERS must be EMITTED somewhere.
//      Offers come from the allo_game_completions default map and the directions
//      goal-capability registry; emissions from onGameComplete('X') call sites.
//
//   B. Every field in a persisted ledger's default object must appear somewhere
//      OUTSIDE its own initializer. This is exactly what timeOnTask failed.
//
// Manifest-driven (same idiom as the STEM conformance battery): covering a new
// ledger is one row in LEDGERS below.
//
// Bypass: SKIP_DEAD_SIGNALS=1 ./deploy.sh
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch (e) { return ''; } };
const verbose = process.argv.includes('--verbose');

const anti = read('AlloFlowANTI.txt');
const haven = read('allohaven_module.js');
// Sources that may emit a game completion. Kept explicit rather than globbed:
// the desktop/ tree carries stale duplicates whose emissions do NOT count.
const EMITTER_SOURCES = ['games_source.jsx', 'view_renderers_source.jsx', 'AlloFlowANTI.txt'];

// ── Ledgers under check ────────────────────────────────────────────────────────
// key      : the storage key, used to locate the initializer
// gameTypes: true when the default's fields are gameType names (check A)
//
// Only OBJECT-shaped defaults belong here — a ledger defaulting to [] has no
// named fields to go missing, which is the whole failure mode being checked.
// (allo_label_challenge_results, allo_escape_completions and friends are arrays.)
const LEDGERS = [
  { key: 'allo_game_completions', gameTypes: true },
  { key: 'allo_time_on_task' },
  { key: 'allo_resource_completions_v1' },
];

let errors = 0;
const fail = (msg) => { errors++; console.log('  ✗ ' + msg); };

// ── Collect every emitted gameType ─────────────────────────────────────────────
const emitterCorpus = EMITTER_SOURCES.map(read).join('\n');
const emitted = new Set(
  [...emitterCorpus.matchAll(/onGameComplete\(\s*['"`]([a-zA-Z0-9]+)/g)].map((m) => m[1])
    // MultiZoneSortGame / _MultiBucketSortGame receive their type as a gameKey
    // prop and emit it internally, so the literal never appears in a call.
    .concat([...read('games_source.jsx').matchAll(/gameKey=["']([a-zA-Z0-9]+)["']/g)].map((m) => m[1]))
);
if (emitted.size === 0) fail('no onGameComplete emissions found at all — the extractor is broken, not the code');
if (verbose) console.log('  emitted gameTypes: ' + [...emitted].sort().join(', '));

// Pull the object literal a ledger initializer returns. The window is generous
// because these initializers carry explanatory comments between the storage read
// and the default; it still stops at the FIRST `return {`, which is the default.
function ledgerDefault(key) {
  const at = anti.indexOf(`'${key}'`);
  if (at < 0) return null;
  const window_ = anti.slice(at, at + 2000);
  const m = window_.match(/return \{([\s\S]{0,600}?)\};/);
  if (!m) return null;
  return { body: m[1], start: at, end: at + window_.indexOf(m[0]) + m[0].length };
}

// ── Check A: offered gameTypes must be emitted ─────────────────────────────────
console.log('  A. offered gameTypes are actually emitted');
for (const ledger of LEDGERS.filter((l) => l.gameTypes)) {
  const def = ledgerDefault(ledger.key);
  if (!def) { fail(`${ledger.key}: initializer not found (rename? then update this manifest)`); continue; }
  const fields = [...def.body.matchAll(/(\w+)\s*:/g)].map((m) => m[1]);
  for (const f of fields) {
    if (!emitted.has(f)) fail(`${ledger.key} declares "${f}" but nothing ever emits it — dead ledger key`);
  }
}

// The directions goal-capability registry offers gameTypes to teachers. An offer
// nothing emits is the wordScramble bug verbatim.
const capBlock = anti.slice(anti.indexOf('const _ALLO_GOAL_CAPABILITIES'), anti.indexOf('function _alloResponseProgress'));
const outlineBlock = anti.slice(anti.indexOf('const _ALLO_OUTLINE_GAMES'), anti.indexOf('const _ALLO_GOAL_CAPABILITIES'));
const offered = new Set([
  ...[...capBlock.matchAll(/games:\s*\[([^\]]*)\]/g)].flatMap((m) => m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, ''))),
  ...[...outlineBlock.matchAll(/:\s*'([a-zA-Z0-9]+)'/g)].map((m) => m[1]),
].filter(Boolean));
if (offered.size === 0) fail('directions goal-capability registry not found — the extractor is broken');
for (const g of offered) {
  if (!emitted.has(g)) fail(`directions goals offer "${g}" but nothing ever emits it — an unsatisfiable goal`);
}
if (verbose) console.log('  offered gameTypes: ' + [...offered].sort().join(', '));

// Does `field` appear in a WRITE position anywhere in `src`?
//
// "Appears at all" is not good enough, and this is not hypothetical: the
// timeOnTask bug was caught by hand only because nothing happened to READ the
// dead fields. A read satisfies "appears", so a field that is reported to
// teachers but never written — precisely the timeOnTask.totalSessionMinutes
// case — would sail through an occurrence count. Writes only.
//
// Write shapes, none of which may be preceded by a dot (that is a property READ):
//   field:            object-literal key, incl. spread updates {...prev, field: x}
//   field,  field }   ES6 shorthand property in an object literal
//   field[...] =      indexed assignment
//   field =           assignment or declaration (but never ===)
// A "write" that only ever stores the empty value is a DECLARATION, not a
// writer. `pomodorosCompleted: 0` in a default-state object looks like a write
// to a naive matcher, so a counter nobody ever increments reads as alive — the
// exact mistake that made the first version of this gate miss the AlloHaven
// cases it was extended to catch. Zero-value forms are excluded here.
const EMPTY_VALUE = String.raw`(?:0|\[\]|\{\}|null|undefined|false|''|""|` + '``' + `)\s*[,;}\n]`;

function hasWriter(src, field) {
  const f = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // NOTE the whitespace lives INSIDE each negative lookahead. Written as
  // `\s*(?!EMPTY)` the guard is defeated by backtracking: against
  // "counter: 0," the engine simply lets \s* match zero characters, inspects
  // " 0," (which does not start with 0), and the lookahead passes. That hole
  // made this check silently accept a counter that is only ever set to its
  // zero default — the precise case it exists to catch.
  const patterns = [
    `(?<![.\\w])${f}\\s*:(?!\\s*${EMPTY_VALUE})`,      // object-literal key, non-empty value
    `(?<![.\\w])${f}\\s*,`,                             // ES6 shorthand property
    `(?<![.\\w])${f}\\s*\\}`,                           // shorthand, last in literal
    `(?<![.\\w])${f}\\s*\\[[^\\]]*\\]\\s*=(?!=)`,       // indexed assignment
    `(?<![.\\w])${f}\\s*=(?!=)(?!\\s*${EMPTY_VALUE})`,  // assignment, non-empty value
    `\\.${f}\\s*\\+\\+`,                                // increment
  ];
  return patterns.some((p) => new RegExp(p).test(src));
}

// Comments document intent, they do not produce values. A shape comment listing
// every legal earn source made a badge's requirement look satisfied even after
// the only real producer was removed. Strips block comments and whole-line `//`
// comments only — an inline strip would mangle the `https://` inside string
// literals, which are exactly the values being scanned.
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

// ── Check B: persisted ledger fields must be written somewhere ────────────────
console.log('  B. persisted ledger fields have a writer');
for (const ledger of LEDGERS) {
  if (ledger.gameTypes) continue; // covered by A, and its fields are data not code
  const def = ledgerDefault(ledger.key);
  if (!def) { fail(`${ledger.key}: initializer not found (rename? then update this manifest)`); continue; }
  const fields = [...def.body.matchAll(/(\w+)\s*:/g)].map((m) => m[1]);
  // everything except the initializer itself
  const elsewhere = anti.slice(0, def.start) + anti.slice(def.end);
  for (const f of fields) {
    if (!hasWriter(elsewhere, f)) {
      fail(`${ledger.key}.${f} is initialized and persisted but NEVER written — it will report as empty forever`);
    }
  }
}

// ── Check C: AlloHaven badges must require an earn source something produces ──
//
// A badge whose predicate demands `e.source === 'x'` when nothing ever writes an
// earning with that source is permanently unearnable — the wordScramble bug, in
// the token economy.
//
// The producer scan MUST see through ternaries. A first pass here matched only
// the literal `source: 'x'` and reported 'cycle-bonus' as dead; it is in fact
// written by `source: isFourthInCycle ? 'cycle-bonus' : 'pomodoro'` and is fully
// reachable. A gate that cries wolf gets bypassed, and a bypassed gate is worse
// than no gate — so collect every string literal in a `source:` value position.
console.log('  C. AlloHaven badge predicates require producible earn sources');
if (!haven) {
  fail('allohaven_module.js not readable — cannot verify badge earn sources');
} else {
  const havenCode = stripComments(haven);
  const produced = new Set();
  for (const m of havenCode.matchAll(/source:\s*([^,\n]+)/g)) {
    for (const lit of m[1].matchAll(/'([a-z0-9-]+)'/g)) produced.add(lit[1]);
  }
  const required = new Set([...havenCode.matchAll(/e\.source === '([a-z0-9-]+)'/g)].map((m) => m[1]));
  if (produced.size === 0 || required.size === 0) fail('AlloHaven earn-source extractor found nothing — it is broken, not the code');
  for (const r of required) {
    if (!produced.has(r)) fail(`AlloHaven badges require earn source "${r}" but nothing produces it — an unearnable badge`);
  }
  if (verbose) console.log('  produced earn sources: ' + [...produced].sort().join(', '));

  // ── Check D: AlloHaven daily-quest counters must have writers ───────────────
  // Same shape as check B, against the dailyState counters the QUEST_POOL
  // predicates read. A quest reading a counter nobody increments can never
  // complete, and would silently drain the daily trifecta bonus.
  console.log('  D. AlloHaven daily-quest counters have writers');
  const poolStart = haven.indexOf('var QUEST_POOL = [');
  const poolEnd = haven.indexOf('// Pick N random');
  if (poolStart < 0 || poolEnd <= poolStart) {
    fail('AlloHaven QUEST_POOL not found (renamed? then update this check)');
  } else {
    const pool = haven.slice(poolStart, poolEnd);
    const counters = [...new Set([...pool.matchAll(/d\.(\w+)/g)].map((m) => m[1]))];
    const outside = stripComments(haven.slice(0, poolStart) + haven.slice(poolEnd));
    for (const c of counters) {
      if (!hasWriter(outside, c)) fail(`AlloHaven quest reads dailyState.${c} but nothing writes it — an uncompletable quest`);
    }
    if (verbose) console.log('  quest counters: ' + counters.sort().join(', '));
  }
}

if (errors > 0) {
  console.log(`\n❌ ${errors} dead signal(s): declared, stored, sometimes reported — never written.`);
  console.log('check_dead_signals: fix, or remove the declaration (bypass: SKIP_DEAD_SIGNALS=1).');
  process.exit(1);
}
console.log(`✓ check_dead_signals: ${emitted.size} emitted gameType(s); every offered goal and persisted ledger field has a writer.`);
process.exit(0);
