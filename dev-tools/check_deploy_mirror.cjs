#!/usr/bin/env node
// check_deploy_mirror.cjs — Verify prismflow-deploy/public/*_module.js mirrors match root.
//
// Why this exists:
//   AlloFlow ships CDN modules from two locations:
//     1. Root `*_module.js` (canonical, edited by humans/build scripts)
//     2. `prismflow-deploy/public/*_module.js` (mirror, served by Firebase Hosting)
//
//   The mirror is supposed to be a byte-identical copy. When edits land at
//   root but the mirror isn't refreshed, the deployed app serves the OLD
//   module — bugs marked "fixed" in source come back in production.
//
//   This check verifies every root `*_module.js` matches its `prismflow-deploy/public/`
//   counterpart byte-for-byte. Files at root that DON'T have a mirror are
//   reported informationally (might be intentional — not every CDN module
//   needs to be in the deploy public dir).
//
// Usage:
//   node dev-tools/check_deploy_mirror.cjs
//   node dev-tools/check_deploy_mirror.cjs --verbose       (list every match)
//   node dev-tools/check_deploy_mirror.cjs --quiet         (silent on success)
//
// Exit codes:
//   0 — all mirrored files match
//   1 — at least one drift (deploy will serve stale code)
//   2 — usage / setup error

'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'prismflow-deploy', 'public');

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const QUIET = args.includes('--quiet');

if (!fs.existsSync(PUBLIC_DIR)) {
  console.error('prismflow-deploy/public/ not found at ' + PUBLIC_DIR);
  process.exit(2);
}

// ──────────────────────────────────────────────────────────────────────────
// Gather root + public file pairs.
// We mirror: root *_module.js, stem_lab/*.js, sel_hub/*.js, quiz_*.js,
// plus a few special-case files (allo_data, audio_banks, etc.).
// ──────────────────────────────────────────────────────────────────────────
function listFiles(dir, filter) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(filter).map(f => path.join(dir, f));
}

const candidates = [
  ...listFiles(ROOT, f => /^[^_].*_module\.js$/.test(f)).map(p => ({ relRoot: path.relative(ROOT, p), relPublic: path.basename(p) })),
  ...listFiles(ROOT, f => /^quiz_[a-z_]+\.js$/.test(f)).map(p => ({ relRoot: path.relative(ROOT, p), relPublic: path.basename(p) })),
  ...listFiles(path.join(ROOT, 'stem_lab'), f => f.endsWith('.js') && !f.startsWith('_')).map(p => ({
    relRoot: 'stem_lab/' + path.basename(p),
    relPublic: 'stem_lab/' + path.basename(p),
  })),
  ...listFiles(path.join(ROOT, 'sel_hub'), f => f.endsWith('.js') && !f.startsWith('_')).map(p => ({
    relRoot: 'sel_hub/' + path.basename(p),
    relPublic: 'sel_hub/' + path.basename(p),
  })),
];

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

const matches = [];
const drifts = [];
const missingMirrors = [];

for (const cand of candidates) {
  const rootPath = path.join(ROOT, cand.relRoot);
  const publicPath = path.join(PUBLIC_DIR, cand.relPublic);
  if (!fs.existsSync(publicPath)) {
    missingMirrors.push({ root: cand.relRoot, public: 'prismflow-deploy/public/' + cand.relPublic });
    continue;
  }
  const rootContent = fs.readFileSync(rootPath, 'utf-8');
  const publicContent = fs.readFileSync(publicPath, 'utf-8');
  if (rootContent === publicContent) {
    matches.push(cand);
  } else {
    const rootSize = rootContent.length;
    const publicSize = publicContent.length;
    drifts.push({
      ...cand,
      rootSize,
      publicSize,
      sizeDelta: rootSize - publicSize,
      rootHash: sha256(rootContent),
      publicHash: sha256(publicContent),
    });
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Report
// ──────────────────────────────────────────────────────────────────────────
if (!QUIET || drifts.length > 0) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   AlloFlow Deploy Mirror Sync Check                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('  Files checked: ' + candidates.length);
  console.log('  Matched:       ' + matches.length);
  console.log('  Drifted:       ' + drifts.length);
  console.log('  No mirror:     ' + missingMirrors.length + ' (informational)');
  console.log('');
}

if (drifts.length > 0) {
  console.log('═══ ✗ DRIFT (' + drifts.length + ') — deploy will serve stale code for these modules ═══');
  console.log('');
  for (const d of drifts) {
    const sizeArrow = d.sizeDelta > 0 ? '+' + d.sizeDelta : String(d.sizeDelta);
    console.log('  ✗ ' + d.relRoot);
    console.log('      root:    ' + d.rootSize + ' bytes  (sha256: ' + d.rootHash + ')');
    console.log('      public:  ' + d.publicSize + ' bytes  (sha256: ' + d.publicHash + ')');
    console.log('      Δ size:  ' + sizeArrow + ' bytes (root vs public)');
    console.log('      Fix:     cp ' + d.relRoot + ' prismflow-deploy/public/' + d.relPublic);
    console.log('');
  }
}

if (missingMirrors.length > 0 && VERBOSE) {
  console.log('═══ ⊙ NO MIRROR (' + missingMirrors.length + ') — root file has no copy in public/ (might be intentional) ═══');
  for (const m of missingMirrors.slice(0, 30)) console.log('  ⊙ ' + m.root);
  if (missingMirrors.length > 30) console.log('  (... ' + (missingMirrors.length - 30) + ' more)');
  console.log('');
}

if (drifts.length === 0) {
  console.log('  ✅ All ' + matches.length + ' mirrored files match root.');
} else {
  console.log('  ❌ ' + drifts.length + ' file' + (drifts.length === 1 ? '' : 's') + ' drifted between root and deploy mirror.');
}
console.log('');

process.exit(drifts.length > 0 ? 1 : 0);
