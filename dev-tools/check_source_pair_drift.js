#!/usr/bin/env node
/**
 * Source-pair drift guard.
 *
 * Some source.jsx files exist in two places (root + prismflow-deploy/src/)
 * because the prismflow-deploy React app used to import from its own src/.
 * After the April 2026 reconciliation, root is canonical for all pairs and
 * the dup copies must stay byte-identical. This script enforces that.
 *
 * If a commit introduces divergence between a root source.jsx and its dup,
 * the pre-commit hook will block the commit and tell the developer which
 * pair drifted — exactly the class of bug that hit doc_pipeline and that
 * we spent a session un-wedging from git history.
 *
 * Usage:
 *   node check-source-pair-drift.js          # exits non-zero if any pair drifts
 *   node check-source-pair-drift.js --quiet  # silent unless failing
 *   node check-source-pair-drift.js --fix    # overwrite dup with root (emergency use)
 */
const fs = require('fs');
const path = require('path');

// ROOT = repo root (parent of dev-tools/)
const ROOT = path.resolve(__dirname, '..');

// Root file → dup file mappings. Keep this list current if more source.jsx
// files get duplicated into prismflow-deploy/src/.
const PAIRS = [
  { root: 'games_source.jsx',          dup: 'prismflow-deploy/src/games_source.jsx' },
  { root: 'adventure_source.jsx',      dup: 'prismflow-deploy/src/adventure_source.jsx' },
  { root: 'content_engine_source.jsx', dup: 'prismflow-deploy/src/content_engine_source.jsx' },
];

const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const fix = args.includes('--fix');

let anyDrift = false;
const results = [];

for (const pair of PAIRS) {
  const rootPath = path.join(ROOT, pair.root);
  const dupPath = path.join(ROOT, pair.dup);
  const rootExists = fs.existsSync(rootPath);
  const dupExists = fs.existsSync(dupPath);

  if (!rootExists && !dupExists) {
    results.push({ pair, status: 'skip', reason: 'neither file exists' });
    continue;
  }
  if (!rootExists) {
    results.push({ pair, status: 'fail', reason: 'root missing but dup exists' });
    anyDrift = true;
    continue;
  }
  if (!dupExists) {
    results.push({ pair, status: 'fail', reason: 'dup missing but root exists' });
    anyDrift = true;
    continue;
  }

  const rootContent = fs.readFileSync(rootPath, 'utf-8');
  const dupContent = fs.readFileSync(dupPath, 'utf-8');

  // Normalise line endings so CRLF vs LF doesn't trigger false positives —
  // git's autocrlf often swaps them on checkout and the files are still
  // semantically identical.
  const normalize = (s) => s.replace(/\r\n/g, '\n');

  if (normalize(rootContent) === normalize(dupContent)) {
    results.push({ pair, status: 'ok' });
    continue;
  }

  // Drifted. Compute a quick summary for the failure message.
  const rootLines = rootContent.split(/\r?\n/);
  const dupLines = dupContent.split(/\r?\n/);
  results.push({
    pair,
    status: 'drift',
    rootLines: rootLines.length,
    dupLines: dupLines.length,
    delta: dupLines.length - rootLines.length,
  });
  anyDrift = true;

  if (fix) {
    fs.writeFileSync(dupPath, rootContent, 'utf-8');
    results[results.length - 1].fixed = true;
  }
}

if (anyDrift && !fix) {
  console.error('\n❌ Source/module pair drift detected\n');
  console.error('The following source.jsx files must stay byte-identical to their root version,');
  console.error('but currently diverge. This is the class of bug that orphaned 438 lines of');
  console.error('games_source.jsx work from the deployed module for months.\n');
  for (const r of results) {
    if (r.status === 'drift') {
      console.error(`  ⚠  ${r.pair.root}  ↔  ${r.pair.dup}`);
      console.error(`       root: ${r.rootLines} lines · dup: ${r.dupLines} lines · Δ ${r.delta >= 0 ? '+' : ''}${r.delta}`);
    } else if (r.status === 'fail') {
      console.error(`  ❌ ${r.pair.root}  ↔  ${r.pair.dup}  —  ${r.reason}`);
    }
  }
  console.error('\nFix options:');
  console.error('  1. `cp <root> <dup>` manually if you know which side is correct');
  console.error('  2. `node check-source-pair-drift.js --fix` to force dup := root for all pairs');
  console.error('  3. Edit the root file, then re-run the check — dup will need re-syncing\n');
  process.exit(1);
}

if (!quiet) {
  console.log('✓ Source/module pair drift check OK');
  for (const r of results) {
    const icon = r.status === 'ok' ? '✓' : r.status === 'skip' ? '↩️' : r.fixed ? '🔧' : r.status;
    console.log(`  ${icon} ${r.pair.root}${r.fixed ? ' (fixed)' : ''}`);
  }
}

process.exit(0);
