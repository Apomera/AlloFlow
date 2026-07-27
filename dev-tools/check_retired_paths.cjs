#!/usr/bin/env node
// check_retired_paths.cjs — keep retired directory trees from growing back.
//
// prismflow-deploy/ was renamed to desktop/web-app/. It came back anyway: the two
// reading-library sync scripts still listed prismflow-deploy/public/reading_library
// as a copy destination and created it with mkdirSync(recursive: true), so every run
// rebuilt the tree from nothing. A broad `git add` then tracked all 3,536 files onto
// main (08df4edd2, 2026-07-25). Within a day the duplicate had already drifted from
// its source (stem_tool_weathersystems.js), i.e. it was being maintained in parallel.
//
// tests/desktop_web_shell_boundary.test.js already asserted the directory must not
// exist, and it was RED on main the whole time — deploy.sh does not run vitest, so
// nothing enforced it. That is the reason this gate exists as a dev-tools check:
// a rule outside the deploy gate is decorative.
//
// Two invariants per retired path:
//   1. it must not exist on disk, and must have no tracked files
//   2. no tracked script may name it (that is what rebuilds it)
// Deleting the tree without (2) only buys time until the next sync run.
//
// Usage: node dev-tools/check_retired_paths.cjs [--quiet]
// Exit: 0 clean · 1 if a retired path is back or a script still writes to it.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const QUIET = process.argv.includes('--quiet');

// Retired tree -> where its content lives now (shown in the failure message).
const RETIRED = { 'prismflow-deploy': 'desktop/web-app' };

// Files allowed to mention a retired path: the CDN upload exclusion (an entry there
// is a safeguard, not a write) and the checks that assert the retirement itself.
const ALLOWED = new Set([
  '.assetsignore',
  'tests/desktop_web_shell_boundary.test.js',
  'dev-tools/check_retired_paths.cjs',
]);

const SCAN = /\.(js|cjs|mjs|sh|json|ya?ml|toml)$/;

let tracked = [];
try {
  tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 })
    .split('\n').filter(Boolean);
} catch (_) {
  if (!QUIET) console.log('✓ check_retired_paths: skipped (not a git checkout).');
  process.exit(0);
}

const failures = [];

for (const [retired, replacement] of Object.entries(RETIRED)) {
  if (fs.existsSync(path.join(ROOT, retired))) {
    failures.push(`${retired}/ exists on disk — it was retired in favour of ${replacement}/.`);
  }
  const back = tracked.filter((p) => p === retired || p.startsWith(retired + '/'));
  if (back.length) {
    failures.push(`${retired}/ has ${back.length} tracked file(s) — e.g. ${back.slice(0, 3).join(', ')}`);
  }
  // The root cause: a script that still names the retired path will recreate it.
  for (const p of tracked) {
    if (ALLOWED.has(p) || !SCAN.test(p)) continue;
    if (p.startsWith(retired + '/')) continue; // already reported above
    if (p.startsWith('app/static/')) continue; // built student-shell bundles
    let src;
    try { src = fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch (_) { continue; }
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(retired)) failures.push(`${p}:${i + 1} still references ${retired}/`);
    }
  }
}

if (failures.length) {
  console.error('✖ check_retired_paths: ' + failures.length + ' problem(s) — a retired tree is growing back.');
  for (const f of failures) console.error('    ' + f);
  console.error('  Fix: drop the retired path from the script\'s destination list, then `git rm -r <path>`.');
  console.error('  Verify nothing is lost first: compare git blob SHAs against the replacement tree.');
  process.exit(1);
}
if (!QUIET) console.log('✓ check_retired_paths: no retired tree is back, and no tracked script writes to one.');
process.exit(0);
