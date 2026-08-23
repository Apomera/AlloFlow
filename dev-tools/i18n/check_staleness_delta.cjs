#!/usr/bin/env node
// check_staleness_delta.cjs — POINT-OF-EDIT staleness detection.
//
// check_lang_staleness.cjs answers "what is stale RIGHT NOW, in total?" — it compares
// live English against the blessed baseline. That is the right cumulative accounting,
// but by the time it fires (verify:gate, at deploy) the English edit that caused the
// drift is already several commits back, and the symptom shows up as a "localization
// regression": a pack string that quietly describes the OLD wording.
//
// This tool answers the other question, at the moment it is cheapest to answer:
//     "The English strings I am about to commit — which packs do they make stale?"
//
// It diffs the English source files (ui_strings.js + help_strings.js) between a git
// ref and the version being committed, and for every key whose English WORDING moved
// it reports exactly which packs already hold a real (non-passthrough) translation and
// will therefore go stale. Renames/rewords are the whole failure class; pure additions
// are gap-report territory and are counted separately, not flagged.
//
// USAGE
//   node dev-tools/i18n/check_staleness_delta.cjs                 # staged (index) vs HEAD  — hook mode
//   node dev-tools/i18n/check_staleness_delta.cjs --worktree      # working tree vs HEAD
//   node dev-tools/i18n/check_staleness_delta.cjs --base <ref>    # ... vs an arbitrary ref (e.g. a release tag)
//   node dev-tools/i18n/check_staleness_delta.cjs --gate          # exit 1 on ANY reword that strands a translation
//   node dev-tools/i18n/check_staleness_delta.cjs --quiet         # one-line summary
//
// Guarded namespaces (the same list check_lang_staleness.cjs hard-gates on) ALWAYS exit 1:
// there a stale pack value overrides a product rename on a visible surface.
//
// Output: dev-tools/i18n/lang_staleness/_delta.json — { key: { english, packs: [slug,...] } },
// the same shape merge_stale_translations.cjs consumes, so a re-translation pass can
// read it directly instead of re-deriving the worklist.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const L = require('./lang_src_lib.cjs');

const argv = process.argv.slice(2);
const QUIET = argv.includes('--quiet');
const GATE = argv.includes('--gate');
const WORKTREE = argv.includes('--worktree');
const baseIdx = argv.indexOf('--base');
const BASE = baseIdx !== -1 ? argv[baseIdx + 1] : 'HEAD';

// Kept in sync with check_lang_staleness.cjs GUARDED — surface-name namespaces where a
// stale pack value OVERRIDES the current English instead of merely lagging it.
const GUARDED = ['sidebar', 'tools', 'glossary', 'visuals', 'universal', 'launch_pad', 'storage', 'alignment_graph', 'guided', 'hints'];

const REL_UI = 'ui_strings.js';
const REL_HELP = 'help_strings.js';

function git(args) {
  return execFileSync('git', args, { cwd: L.ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
}

// File content as of a git ref, or null when the path does not exist there.
function showRef(ref, rel) {
  try { return git(['show', ref + ':' + rel]); } catch (_) { return null; }
}

// The version being committed: the staged blob by default, the working tree with --worktree.
// Falls back to the working tree when nothing is staged for that path, so the tool is still
// useful when run ad hoc, mid-edit, against an empty index.
function loadIncoming(rel) {
  const abs = path.join(L.ROOT, rel);
  if (!WORKTREE) {
    try { return git(['show', ':0:' + rel]); } catch (_) { /* not staged - fall through */ }
  }
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
}

// ui_strings.js is bare JSON despite the .js extension; help_strings.js is a JS object
// literal behind a comment header, mapped into help_mode.* (matches lang_src_lib.cjs).
function parseUi(text) {
  if (text == null) return {};
  return L.flatten(JSON.parse(text.replace(/^﻿/, '')));
}
function parseHelp(text) {
  if (text == null) return {};
  const H = new Function('return (' + text.slice(text.indexOf('{')) + ')')();
  const out = {};
  for (const [k, v] of Object.entries(H)) out['help_mode.' + k] = v;
  return out;
}
function sourceAt(loader) {
  return Object.assign({}, parseUi(loader(REL_UI)), parseHelp(loader(REL_HELP)));
}

let before, after;
try {
  before = sourceAt(rel => showRef(BASE, rel));
  after = sourceAt(rel => loadIncoming(rel));
} catch (e) {
  console.error('check_staleness_delta: could not parse the English sources (' + e.message + ').');
  console.error('  check_lang_json.cjs owns malformed-JSON errors; fix that first.');
  process.exit(1);
}

const changed = [], added = [], removed = [];
for (const k of Object.keys(after)) {
  if (!(k in before)) { added.push(k); continue; }
  if (L.hashEn(before[k]) !== L.hashEn(after[k])) changed.push(k);
}
for (const k of Object.keys(before)) if (!(k in after)) removed.push(k);

if (!changed.length) {
  if (!QUIET) {
    console.log('check_staleness_delta: no English rewording vs ' + BASE +
      ' (' + added.length + ' added, ' + removed.length + ' removed - gap-report territory).');
  }
  process.exit(0);
}

// Only now, once a reword really happened, pay the ~8s cost of loading all 62 packs.
const slugs = L.getLangSlugs();
const delta = {};
for (const slug of slugs) {
  const pack = L.loadPack(slug);
  if (!pack) continue; // check_lang_json owns parse errors
  for (const k of changed) {
    const pv = pack[k];
    if (pv === undefined) continue;                  // not translated yet -> gap report's job
    if (L.norm(pv) === L.norm(before[k])) continue;  // English passthrough -> gap report's job
    (delta[k] = delta[k] || { english: after[k], packs: [] }).packs.push(slug);
  }
}

fs.mkdirSync(L.STALE_DIR, { recursive: true });
fs.writeFileSync(
  path.join(L.STALE_DIR, '_delta.json'),
  JSON.stringify({
    base: BASE,
    mode: WORKTREE ? 'worktree' : 'staged',
    changedKeys: changed.slice().sort(),
    addedKeys: added.length,
    removedKeys: removed.length,
    delta,
  }, null, 2) + '\n'
);

const stranding = Object.keys(delta);
const totalStranded = stranding.reduce((n, k) => n + delta[k].packs.length, 0);
const guarded = stranding.filter(k => GUARDED.includes(k.split('.')[0]));

console.log('check_staleness_delta: ' + changed.length + ' English string(s) reworded vs ' + BASE +
  '; ' + stranding.length + ' of them strand ' + totalStranded + ' existing translation(s).');

if (!QUIET) {
  for (const k of stranding.slice(0, 25)) {
    console.log('  - ' + k + ' -> ' + delta[k].packs.length + ' pack(s) now stale');
    console.log('      was: ' + JSON.stringify(L.norm(before[k])).slice(0, 110));
    console.log('      now: ' + JSON.stringify(L.norm(after[k])).slice(0, 110));
  }
  if (stranding.length > 25) console.log('  ...and ' + (stranding.length - 25) + ' more');
  const clean = changed.filter(k => !(k in delta));
  if (clean.length) console.log('  (' + clean.length + ' reworded key(s) strand nothing - untranslated or passthrough everywhere.)');
}

if (stranding.length) {
  console.log('\n  Worklist: dev-tools/i18n/lang_staleness/_delta.json');
  console.log('  Re-translate:  npm run i18n:merge-stale        (dry run; -- --apply to write)');
  console.log('  Then clear:    node dev-tools/i18n/bless_lang_sources.cjs ' +
    stranding.slice(0, 3).map(k => '--key ' + k).join(' ') + (stranding.length > 3 ? ' ...' : ''));
}

if (guarded.length) {
  console.error('\nFAIL: ' + guarded.length + ' reworded key(s) are in a GUARDED namespace [' + GUARDED.join(', ') + ']:');
  for (const k of guarded) console.error('   ' + k + ' (' + delta[k].packs.length + ' pack(s))');
  console.error('   A stale pack value on these surfaces OVERRIDES the rename you just made.');
  process.exit(1);
}
process.exit(GATE && stranding.length ? 1 : 0);
