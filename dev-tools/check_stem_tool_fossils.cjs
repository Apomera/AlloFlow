#!/usr/bin/env node
// check_stem_tool_fossils.cjs — keeps deleted top-level tool copies deleted.
//
// Why this exists (2026-09-15):
//   cc49336e7 (2026-07-28) deleted 81 dead "top-level tool fossils" —
//   desktop/web-app/public/stem_tool_<name>.js, the copies with NO stem_lab/
//   segment — after proving four ways that nothing loads them:
//     1. AlloFlow/ANTI loads every tool as 'stem_lab/stem_tool_X.js'; the tool
//        list contains no top-level entry.
//     2. localizeModuleUrl rewrites the CDN host to './' only for the bundled
//        desktop app and PRESERVES the stem_lab/ segment, so desktop resolves
//        ./stem_lab/... — which is why THAT mirror is live and stays.
//     3. No code path anywhere constructs a top-level stem_tool_X.js URL.
//     4. A CDN probe with a control confirmed it.
//
//   The very next day, c3e480a63 ("Uncommitted work recovered from a full day
//   of agent sessions… Committed as found. Not gate-verified by this session.")
//   added stem_tool_roadready.js straight back — 33,071 lines of a file that
//   had been deliberately removed 23 hours earlier. An agent session held a
//   stale working-tree copy and a recovery sweep committed it without noticing.
//
//   It then sat there for seven weeks. It was 2.49 MB and months stale while
//   the live copy moved on, and it cost a later debugging session real time:
//   the stale fossil is the first hit for a naive filename search, so a reader
//   looking for RoadReady's pedestrian logic finds July code and reasons about
//   the wrong file.
//
// The rule, in two parts:
//   A. No top-level stem_tool_*.js may exist in a public/build root. Tools live
//      in stem_lab/ only. A fossil is dead weight that reads as live code.
//   B. The stem_lab/ copies that DO ship must be byte-identical to each other.
//      A fix applied to one mirror and not the rest is the same class of bug
//      from the other direction — and part A is what makes the mirror list
//      unambiguous in the first place.
//
// Fix for A: delete the file (git rm for tracked, rm for build output).
// Fix for B: copy the canonical root stem_lab/ copy over the drifted mirror.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Roots that must contain NO top-level stem_tool_*.js. Each of these has a
// sibling stem_lab/ directory that holds the real tools.
const FOSSIL_ROOTS = [
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build',
];

// The stem_lab/ mirrors that ship. The first entry is canonical: tests read it
// by that exact path (tests/roadready_rules.test.js, stem_position_bias_*),
// so it is the copy to fix toward, not away from.
const MIRROR_DIRS = [
  'stem_lab',
  'desktop/web-app/public/stem_lab',
  'desktop/web-app/build/stem_lab',
  'desktop/app-build/stem_lab',
];

const errors = [];

// ── Part A: no resurrected fossils ───────────────────────────────────────────
let rootsScanned = 0;
for (const rel of FOSSIL_ROOTS) {
  const dir = path.join(ROOT, rel);
  if (!fs.existsSync(dir)) continue; // build output need not exist
  rootsScanned++;
  const fossils = fs.readdirSync(dir)
    .filter((f) => /^stem_tool_.*\.js$/.test(f))
    .sort();
  for (const f of fossils) {
    const live = path.join(ROOT, rel, 'stem_lab', f);
    const liveNote = fs.existsSync(live)
      ? 'the live copy is ' + rel + '/stem_lab/' + f
      : 'no stem_lab/ copy exists — confirm the tool is not simply misplaced';
    errors.push(rel + '/' + f + ' — top-level fossil; ' + liveNote);
  }
}

// ── Part B: shipped stem_lab/ mirrors agree ──────────────────────────────────
const present = MIRROR_DIRS
  .map((rel) => ({ rel, abs: path.join(ROOT, rel) }))
  .filter((d) => fs.existsSync(d.abs));

// Comparing every tool across every mirror reads well over a GB — fine for a
// full sweep, too slow for a hook that runs on each commit. --staged narrows
// part B to the tools this commit actually touches, which is the case that
// produces drift in the first place. Part A always scans in full: it is three
// readdir calls.
const stagedOnly = process.argv.includes('--staged');
let stagedTools = null;
if (stagedOnly) {
  const { execFileSync } = require('child_process');
  let out = '';
  try {
    out = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'],
      { cwd: ROOT, encoding: 'utf8' });
  } catch {
    out = ''; // not a repo / no index — fall through to an empty set
  }
  stagedTools = new Set(
    out.split('\n')
      .map((line) => line.trim())
      .filter((line) => /(^|\/)stem_lab\/stem_tool_.*\.js$/.test(line))
      .map((line) => path.basename(line)));
}

let comparedTools = 0;
if (present.length > 1 && !(stagedTools && stagedTools.size === 0)) {
  const canonical = present[0];
  const toolNames = fs.readdirSync(canonical.abs)
    .filter((f) => /^stem_tool_.*\.js$/.test(f))
    .filter((f) => !stagedTools || stagedTools.has(f));

  for (const tool of toolNames) {
    const canonicalPath = path.join(canonical.abs, tool);
    let canonicalBuf;
    try {
      canonicalBuf = fs.readFileSync(canonicalPath);
    } catch {
      continue;
    }
    let comparedThisTool = false;
    for (const mirror of present.slice(1)) {
      const mirrorPath = path.join(mirror.abs, tool);
      // A mirror that simply lacks the tool is a deploy-scope question, not
      // drift; only compare files that exist on both sides.
      if (!fs.existsSync(mirrorPath)) continue;
      comparedThisTool = true;
      if (!canonicalBuf.equals(fs.readFileSync(mirrorPath))) {
        errors.push(
          mirror.rel + '/' + tool + ' differs from ' + canonical.rel + '/' + tool +
          ' — a fix landed in one mirror only');
      }
    }
    if (comparedThisTool) comparedTools++;
  }
}

if (errors.length) {
  console.error('\n✗ check_stem_tool_fossils FAILED\n');
  for (const e of errors) console.error('  • ' + e);
  console.error('\n  Tools live in stem_lab/ ONLY. Top-level stem_tool_*.js copies were');
  console.error('  deleted in cc49336e7 after being proven dead; one was re-committed by');
  console.error('  accident the next day and went stale for seven weeks.');
  console.error('  Delete fossils (git rm / rm). For drift, copy stem_lab/<tool> over the mirror.\n');
  process.exit(1);
}

if (!process.argv.includes('--quiet')) {
  console.log(
    '✓ check_stem_tool_fossils: no top-level tool fossils in ' + rootsScanned +
    ' root(s); ' + comparedTools + ' tool(s) byte-identical across ' +
    present.length + ' stem_lab mirror(s).');
}
