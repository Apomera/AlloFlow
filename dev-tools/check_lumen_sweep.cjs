#!/usr/bin/env node
/**
 * check_lumen_sweep.cjs — blocks the stale-sweep revert class that hit Lumen FIVE times.
 *
 * Failure mode: a concurrent agent runs a `git add -A`-style sweep (or restores an old
 * checkout) and commits/ships a STALE stem_tool_lumen.js, silently reverting waves 1-5.
 * check_lumen_floor/check_lumen_spine load the module and test invariants that ALSO held
 * in older revisions, so they do not catch a whole-file revert. This gate does: it pins
 * marker counts that only the current (re-landed @045978230) file satisfies.
 *
 * Checks BOTH the working tree (what deploy.sh ships) and, when the file is staged, the
 * staged blob (what a commit would record) — a sweep can poison either independently.
 *
 * If this fires: DO NOT edit the counts to match. Restore the file from the last good
 * commit (recipe in memory `project_lumen_design`), then re-run.
 * Legitimate Lumen work that changes a marker count must update MARKERS in the same
 * change, with the new `grep -c` values stated in the commit message.
 *
 * Usage: node dev-tools/check_lumen_sweep.cjs [--quiet]   (exit 1 on any hit)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const QUIET = process.argv.includes('--quiet');

// file → { pattern: expected `grep -c` count (LINES containing the pattern, not raw occurrences) }
const MARKERS = {
  'stem_lab/stem_tool_lumen.js': { focusIds: 7, dataHash: 5 },
};

const count = (haystack, needle) =>
  haystack.split('\n').reduce((n, line) => n + (line.includes(needle) ? 1 : 0), 0);
const fails = [];

for (const rel in MARKERS) {
  const abs = path.join(ROOT, rel);
  const sources = [];

  if (fs.existsSync(abs)) {
    sources.push(['working tree', fs.readFileSync(abs, 'utf8')]);
  } else {
    fails.push(rel + ': MISSING from the working tree (sweep deleted it?)');
  }

  try {
    const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--', rel], {
      cwd: ROOT, encoding: 'utf8',
    }).trim();
    if (staged) {
      sources.push(['staged blob', execFileSync('git', ['show', ':' + rel], { cwd: ROOT, encoding: 'utf8' })]);
    }
  } catch (e) {
    // not a git checkout / index unreadable — the working-tree check above still stands
  }

  for (const [label, text] of sources) {
    for (const pat in MARKERS[rel]) {
      const want = MARKERS[rel][pat];
      const got = count(text, pat);
      if (got !== want) {
        fails.push(rel + ' (' + label + '): `' + pat + '` count is ' + got + ', expected ' + want +
          ' — looks like a stale-sweep revert.');
      }
    }
  }
}

if (fails.length) {
  console.error('❌ check_lumen_sweep: ' + fails.length + ' marker failure(s):');
  fails.forEach((f) => console.error('     ' + f));
  console.error('   A stale copy is about to be committed/shipped. Restore from the last good');
  console.error('   commit (e.g. `git show 045978230:stem_lab/stem_tool_lumen.js`) — do NOT');
  console.error('   just edit the expected counts. See memory `project_lumen_design`.');
  process.exit(1);
}
if (!QUIET) console.log('check_lumen_sweep: OK — Lumen wave markers intact (focusIds=7, dataHash=5; working tree + staged).');
process.exit(0);
