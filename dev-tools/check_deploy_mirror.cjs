#!/usr/bin/env node
// check_deploy_mirror.cjs — Verify desktop/web-app/public/ matches root byte-for-byte.
//
// Why this exists:
//   AlloFlow ships from two locations:
//     1. Root files (canonical, edited by humans/build scripts)
//     2. `desktop/web-app/public/` (mirror, served by Firebase Hosting)
//
//   The mirror is supposed to be a byte-identical copy. When edits land at
//   root but the mirror isn't refreshed, the deployed app serves the OLD
//   file — bugs marked "fixed" in source come back in production.
//
// ──────────────────────────────────────────────────────────────────────────
// 2026-08-25: the check used to be an ALLOWLIST of name patterns
//   (root `*_module.js`, `quiz_*.js`, `stem_lab/*.js`, `sel_hub/*.js`)
// which covered 464 files and silently ignored ~7,400 others that are also
// mirrored. `help_strings.js` drifted three weeks behind root that way — the
// deploy served pre-plain-language help for 356 articles and was missing 47
// entirely, with the gate reporting green the whole time.
//
// The rule is now INVERTED and needs no maintenance: if a file exists at BOTH
// the root path and the same relative path under the mirror, the two must
// match. A new mirrored file is covered the moment it appears; there is no
// pattern list to forget to update. Deliberate exceptions are listed in
// EXCLUDED below, each with the reason it is allowed to differ.
// ──────────────────────────────────────────────────────────────────────────
//
// Usage:
//   node dev-tools/check_deploy_mirror.cjs
//   node dev-tools/check_deploy_mirror.cjs --verbose       (list every match)
//   node dev-tools/check_deploy_mirror.cjs --quiet         (silent on success)
//   node dev-tools/check_deploy_mirror.cjs --fast          (compare sizes only)
//
//   --fast is a convenience for a quick local sweep, NOT a gate. Verified by
//   calibration: a same-size edit (`{"a":1}` vs `{"a":2}`) is caught by the
//   default content compare and MISSED by --fast. Gates must run the default.
//
// Exit codes:
//   0 — all mirrored files match
//   1 — at least one drift (deploy will serve stale code)
//   2 — usage / setup error

'use strict';
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Comparing ~8,000 pairs means reading ~2GB off a OneDrive-backed tree. That is
// almost pure IO wait (measured: 63s wall against 0.03s CPU), so the reads are
// issued through a small concurrency pool rather than one at a time.
const IO_CONCURRENCY = 32;

async function pooled(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'desktop/web-app', 'public');

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const QUIET = args.includes('--quiet');
const FAST = args.includes('--fast');

if (!fs.existsSync(PUBLIC_DIR)) {
  console.error('desktop/web-app/public/ not found at ' + PUBLIC_DIR);
  process.exit(2);
}

// ──────────────────────────────────────────────────────────────────────────
// What we never descend into. `desktop` is the mirror's own parent (walking it
// would compare the mirror against itself); the rest are not shipped from root.
// ──────────────────────────────────────────────────────────────────────────
const SKIP_DIRS = new Set(['node_modules', '.git', 'desktop', 'dev-tools', '.claude']);

// ──────────────────────────────────────────────────────────────────────────
// Pairs that are ALLOWED to differ. Every entry needs a reason — an unexplained
// exclusion is how a blind spot grows back.
// ──────────────────────────────────────────────────────────────────────────
const EXCLUDED = [
  {
    match: (rel) => rel === 'index.html',
    why: 'root index.html is the ~410KB GitHub Pages marketing page; the mirror is the ~8KB app deploy shell',
  },
  {
    match: (rel) => path.basename(rel).startsWith('_'),
    why: 'leading-underscore files are build scripts, not shipped assets',
  },
  {
    match: (rel) => path.basename(rel).startsWith('.'),
    why: 'dotfiles (.gitignore etc.) are tooling, not shipped assets',
  },
];

function excludedReason(rel) {
  const hit = EXCLUDED.find((e) => e.match(rel));
  return hit ? hit.why : null;
}

// ──────────────────────────────────────────────────────────────────────────
// Pair every root file with its counterpart at the same relative path under
// the mirror. Files with no counterpart are simply not mirrored — not a fault.
// ──────────────────────────────────────────────────────────────────────────
const candidates = [];
const excluded = [];

function walk(rel) {
  const rootDir = rel ? path.join(ROOT, rel) : ROOT;
  const publicDir = rel ? path.join(PUBLIC_DIR, rel) : PUBLIC_DIR;
  if (!fs.existsSync(publicDir)) return; // whole subtree is not mirrored
  let entries;
  try {
    entries = fs.readdirSync(rootDir, { withFileTypes: true });
  } catch (err) {
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const childRel = rel ? rel + '/' + entry.name : entry.name;
    if (entry.isDirectory()) {
      walk(childRel);
      continue;
    }
    if (!fs.existsSync(path.join(PUBLIC_DIR, childRel))) continue;
    const why = excludedReason(childRel);
    if (why) {
      excluded.push({ rel: childRel, why });
      continue;
    }
    candidates.push({ relRoot: childRel, relPublic: childRel });
  }
}
walk('');

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

const matches = [];
const drifts = [];

async function compare(cand) {
  const rootPath = path.join(ROOT, cand.relRoot);
  const publicPath = path.join(PUBLIC_DIR, cand.relPublic);

  // Size is the cheap discriminator: a different size is always drift, and it
  // lets --fast skip reading the (very large) matching payloads altogether.
  const [rootStat, publicStat] = await Promise.all([fsp.stat(rootPath), fsp.stat(publicPath)]);
  const rootSize = rootStat.size;
  const publicSize = publicStat.size;

  if (rootSize !== publicSize) {
    let rootHash = '(size only)';
    let publicHash = '(size only)';
    if (!FAST) {
      const [a, b] = await Promise.all([fsp.readFile(rootPath), fsp.readFile(publicPath)]);
      rootHash = sha256(a);
      publicHash = sha256(b);
    }
    drifts.push({ ...cand, rootSize, publicSize, sizeDelta: rootSize - publicSize, rootHash, publicHash });
    return;
  }

  if (FAST) {
    matches.push(cand);
    return;
  }

  const [rootContent, publicContent] = await Promise.all([fsp.readFile(rootPath), fsp.readFile(publicPath)]);
  if (rootContent.equals(publicContent)) {
    matches.push(cand);
  } else {
    // Same size, different bytes — the case a size-only check would miss.
    drifts.push({
      ...cand,
      rootSize,
      publicSize,
      sizeDelta: 0,
      rootHash: sha256(rootContent),
      publicHash: sha256(publicContent),
    });
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Report
// ──────────────────────────────────────────────────────────────────────────
function report() {
// The pool finishes files out of order; sort so runs are diffable.
drifts.sort((a, b) => a.relRoot.localeCompare(b.relRoot));
matches.sort((a, b) => a.relRoot.localeCompare(b.relRoot));

if (!QUIET || drifts.length > 0) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   AlloFlow Deploy Mirror Sync Check                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('  Files checked: ' + candidates.length + (FAST ? '  (--fast: sizes only)' : ''));
  console.log('  Matched:       ' + matches.length);
  console.log('  Drifted:       ' + drifts.length);
  console.log('  Excluded:      ' + excluded.length + ' (allowed to differ)');
  console.log('');
}

if (drifts.length > 0) {
  console.log('═══ ✗ DRIFT (' + drifts.length + ') — deploy will serve stale code for these files ═══');
  console.log('');
  for (const d of drifts) {
    const sizeArrow = d.sizeDelta > 0 ? '+' + d.sizeDelta : String(d.sizeDelta);
    console.log('  ✗ ' + d.relRoot);
    console.log('      root:    ' + d.rootSize + ' bytes  (sha256: ' + d.rootHash + ')');
    console.log('      public:  ' + d.publicSize + ' bytes  (sha256: ' + d.publicHash + ')');
    console.log('      Δ size:  ' + sizeArrow + ' bytes (root vs public)');
    console.log('      Fix:     cp ' + d.relRoot + ' desktop/web-app/public/' + d.relPublic);
    console.log('');
  }
}

if (VERBOSE && excluded.length > 0) {
  console.log('═══ ⊙ EXCLUDED (' + excluded.length + ') — allowed to differ ═══');
  const seen = new Set();
  for (const e of excluded) {
    if (seen.has(e.why)) continue;
    seen.add(e.why);
    const sample = excluded.filter((x) => x.why === e.why);
    console.log('  ⊙ ' + sample.length + ' file(s): ' + e.why);
    for (const s of sample.slice(0, 5)) console.log('      ' + s.rel);
    if (sample.length > 5) console.log('      (... ' + (sample.length - 5) + ' more)');
  }
  console.log('');
}

if (VERBOSE && drifts.length === 0) {
  console.log('═══ ✓ MATCHED (' + matches.length + ') ═══');
  for (const m of matches.slice(0, 40)) console.log('  ✓ ' + m.relRoot);
  if (matches.length > 40) console.log('  (... ' + (matches.length - 40) + ' more)');
  console.log('');
}

if (drifts.length === 0) {
  console.log('  ✅ All ' + matches.length + ' mirrored files match root.');
} else {
  console.log('  ❌ ' + drifts.length + ' file' + (drifts.length === 1 ? '' : 's') + ' drifted between root and deploy mirror.');
}
console.log('');

process.exit(drifts.length > 0 ? 1 : 0);
}

pooled(candidates, IO_CONCURRENCY, compare).then(report).catch((err) => {
  console.error('check_deploy_mirror failed: ' + (err && err.message ? err.message : err));
  process.exit(2);
});
