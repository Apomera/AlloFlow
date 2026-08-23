#!/usr/bin/env node
// classify_stale_drift.cjs — split the staleness backlog into "the translation is still
// correct" and "the translation is now wrong".
//
// Not every English edit invalidates a translation. The 2026-08-16 pass that stripped em
// dashes from the English ("outcomes—a spell" -> "outcomes. A spell") changed the hash of
// hundreds of keys without changing what any of them MEAN. Re-translating those in 62
// languages would burn enormous effort to produce the same sentences, and every extra
// hand-edit is a chance to damage a good translation.
//
// So each changed key is classified against the English it was blessed against, recovered
// from git (the baseline stores hashes only, so `--base <rev>` supplies the old text):
//
//   PUNCTUATION  the two texts are identical after normalising dash-as-sentence-break,
//                quote style, ellipsis, whitespace and case. Meaning is untouched, so the
//                existing translation is still accurate and the key can be blessed.
//   TRIVIAL      identical after ALSO ignoring pure whitespace/entity differences.
//   SEMANTIC     anything else. Words were added, removed or replaced -> must be
//                re-translated by hand before blessing.
//
// The classifier is deliberately conservative: any doubt lands in SEMANTIC. It refuses to
// treat a removed or added word as cosmetic, so "Tip: Watch for X" -> "Watch for X" is
// SEMANTIC even though it looks like tidying.
//
// USAGE
//   node dev-tools/i18n/classify_stale_drift.cjs --search 80        # resolve per key from history
//   node dev-tools/i18n/classify_stale_drift.cjs --base <rev> [--prefix help_mode.]
//   ... --json <path>     write { punctuation: [...], trivial: [...], semantic: [...] }
//   ... --show <n>        print n sample SEMANTIC diffs for review
//
// The emitted key lists are what `bless_lang_sources.cjs --key` should be fed for the
// cosmetic classes, and what a hand-translation pass should work through for SEMANTIC.
'use strict';
const fs = require('fs');
const { execFileSync } = require('child_process');
const L = require('./lang_src_lib.cjs');

const argv = process.argv.slice(2);
function opt(name, dflt) { const i = argv.indexOf(name); return i === -1 ? dflt : argv[i + 1]; }
const BASE = opt('--base', null);
const PREFIX = opt('--prefix', '');
// help_strings.js and ui_strings.js drifted at different times, so a run usually targets
// one of them; --exclude-prefix keeps the other namespace out of the classification
// instead of silently classifying it against an identical "before" and calling it cosmetic.
const EXCLUDE = opt('--exclude-prefix', null);
const JSON_OUT = opt('--json', null);
const SHOW = Number(opt('--show', 0));

if (!BASE && !argv.includes('--search')) {
  console.error('Usage: classify_stale_drift.cjs --base <git-rev> [--prefix <ns.>] [--json <path>] [--show <n>]');
  console.error('  <git-rev> is the revision the baseline was blessed against; find it by');
  console.error('  hashing candidate revisions and picking the one that matches the baseline.');
  process.exit(2);
}

function git(a) { return execFileSync('git', a, { cwd: L.ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }); }
function parseUi(t) { return L.flatten(JSON.parse(t.replace(/^﻿/, ''))); }
function parseHelp(t) {
  const H = new Function('return (' + t.slice(t.indexOf('{')) + ')')();
  const o = {}; for (const [k, v] of Object.entries(H)) o['help_mode.' + k] = v; return o;
}
function sourceAt(rev) {
  const out = {};
  try { Object.assign(out, parseUi(git(['show', rev + ':ui_strings.js']))); } catch (_) {}
  try { Object.assign(out, parseHelp(git(['show', rev + ':help_strings.js']))); } catch (_) {}
  return out;
}

// Normalisation ladder. Each rung may only erase presentation, never words.
//   dash-as-break: "a—b" / "a — b" / "a – b"  ->  "a. b"   (the 08-16 style pass)
//   quotes/ellipsis/nbsp folded to their ASCII equivalents
//   sentence case folded, because splitting a clause into a sentence capitalises the
//   next word and that is not a translation-visible change
function normPunct(s) {
  return String(s)
    .replace(/\s*[—–]\s*/g, '. ')       // em/en dash used as a sentence break
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/ /g, ' ')
    .replace(/\s*\.\s*\./g, '.')                  // ". ." produced by the split
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
function normTrivial(s) {
  return normPunct(s).replace(/[\s.,;:!?'"()\[\]-]/g, '');
}

// --search <n>: instead of trusting one revision, walk the last n revisions of both
// English files and resolve, PER KEY, the newest revision whose hash matches the baseline.
// Different namespaces were blessed at different times, so no single rev is "the" blessed
// English for the whole backlog; this finds each key's own.
const SEARCH = Number(opt('--search', 0));
function resolvePerKey(keys, n) {
  const resolved = {};
  const need = new Set(keys);
  const revs = [];
  for (const rel of ['ui_strings.js', 'help_strings.js']) {
    let log = '';
    try { log = git(['log', '--format=%h', '-n', String(n), '--', rel]); } catch (_) { continue; }
    for (const r of log.trim().split(String.fromCharCode(10)).map(x => x.trim()).filter(Boolean)) revs.push([r, rel]);
  }
  for (const [rev, rel] of revs) {
    if (!need.size) break;
    let src;
    try {
      const txt = git(['show', rev + ':' + rel]);
      src = rel === 'help_strings.js' ? parseHelp(txt) : parseUi(txt);
    } catch (_) { continue; }
    for (const k of [...need]) {
      const v = src[k];
      if (v === undefined) continue;
      if (L.hashEn(v) === baselineHashes[k]) { resolved[k] = v; need.delete(k); }
    }
  }
  return { resolved, unresolved: [...need] };
}

const baselineHashes = L.loadBaseline() || {};
const before = SEARCH ? null : sourceAt(BASE);
const after = L.loadSourceStrings();
const { byKey } = L.computeStaleness({});
const keys = Object.keys(byKey)
  .filter(k => k.startsWith(PREFIX))
  .filter(k => !EXCLUDE || !k.startsWith(EXCLUDE))
  .sort();

const baseline = baselineHashes;
const out = { base: SEARCH ? `search:${SEARCH}` : BASE, prefix: PREFIX || '(all)', punctuation: [], trivial: [], semantic: [], noBefore: [], wrongBase: [] };
const packsFor = k => byKey[k].length;
const resolvedBefore = SEARCH ? resolvePerKey(keys, SEARCH) : null;
if (SEARCH) console.log(`resolved blessed English for ${keys.length - resolvedBefore.unresolved.length}/${keys.length} key(s) from the last ${SEARCH} revision(s)`);
const beforeOf = k => (SEARCH ? resolvedBefore.resolved[k] : before[k]);
for (const k of keys) {
  if (beforeOf(k) === undefined) { out.noBefore.push(k); continue; }
  // THE guard that makes this classification mean anything: <rev> must hold the exact
  // English the translation was blessed against. If its hash does not match the baseline,
  // we are diffing against the wrong text and "cosmetic" would be a guess. Without this
  // check a rev where before === after classifies every key as PUNCTUATION and looks
  // like a clean result.
  if (baseline[k] !== L.hashEn(beforeOf(k))) { out.wrongBase.push(k); continue; }
  const o = L.norm(beforeOf(k)), n = L.norm(after[k]);
  if (normPunct(o) === normPunct(n)) out.punctuation.push(k);
  else if (normTrivial(o) === normTrivial(n)) out.trivial.push(k);
  else out.semantic.push(k);
}

const entries = list => list.reduce((s, k) => s + packsFor(k), 0);
console.log(`classify_stale_drift: base ${BASE}, ${keys.length} changed key(s) under ${out.prefix}`);
console.log(`  PUNCTUATION  ${String(out.punctuation.length).padStart(4)} key(s)  ${String(entries(out.punctuation)).padStart(6)} stale entries  - meaning unchanged, safe to bless`);
console.log(`  TRIVIAL      ${String(out.trivial.length).padStart(4)} key(s)  ${String(entries(out.trivial)).padStart(6)} stale entries  - punctuation/spacing only, safe to bless`);
console.log(`  SEMANTIC     ${String(out.semantic.length).padStart(4)} key(s)  ${String(entries(out.semantic)).padStart(6)} stale entries  - MUST be re-translated`);
if (out.noBefore.length) console.log(`  NO-BEFORE    ${String(out.noBefore.length).padStart(4)} key(s)  - absent from ${BASE}; treat as semantic`);
if (out.wrongBase.length) {
  console.log(`  WRONG-BASE   ${String(out.wrongBase.length).padStart(4)} key(s)  ${String(entries(out.wrongBase)).padStart(6)} stale entries  - ${BASE} is NOT the blessed English for these; unclassified`);
  console.log(`               e.g. ${out.wrongBase.slice(0, 4).join(', ')}`);
}

if (SHOW) {
  console.log(`\nSample SEMANTIC diffs (${Math.min(SHOW, out.semantic.length)} of ${out.semantic.length}):`);
  for (const k of out.semantic.slice(0, SHOW)) {
    console.log('  ' + '-'.repeat(76));
    console.log('  ' + k + '  [' + packsFor(k) + ' packs]');
    console.log('    was: ' + JSON.stringify(L.norm(beforeOf(k)).slice(0, 160)));
    console.log('    now: ' + JSON.stringify(L.norm(after[k]).slice(0, 160)));
  }
}

if (JSON_OUT) {
  fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`\nwrote ${JSON_OUT}`);
}
