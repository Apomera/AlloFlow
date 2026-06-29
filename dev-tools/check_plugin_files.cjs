#!/usr/bin/env node
// check_plugin_files.cjs — PLUGIN_FILES ↔ disk drift gate.
//
// Why this exists (audit B4/B5, 2026-06-28):
//   build.js's PLUGIN_FILES list is the set of stem_lab/sel_hub plugin files whose CDN cache-bust hash
//   (?v=HASH) build.js bumps on every `--mode=prod`. A plugin that exists on disk + is wired live but is
//   MISSING from PLUGIN_FILES never gets its hash bumped, so Cloudflare serves STALE tool code with no
//   signal (the "live in toolModules but missing here" class the catch-up batch comment documents).
//   verify_module_registry.cjs checks the window.AlloModules producer/consumer contract — a DIFFERENT
//   surface; nothing cross-checked PLUGIN_FILES against the actual plugin files on disk until now.
//
// What it checks (all ERRORS — fail the deploy):
//   1. DUPLICATE entries in PLUGIN_FILES (e.g. atcTower listed twice — B5).
//   2. A PLUGIN_FILES entry with NO matching file on disk (dead entry / wrong name).
//   3. A CASING mismatch: the entry matches a disk file case-INsensitively but not exactly
//      (a case-sensitive-FS / CDN hazard — works on Windows/macOS, 404s on Linux/Cloudflare).
//   4. A plugin file on disk (stem_lab/stem_tool_*.js or sel_hub/sel_*.js) that is NOT in PLUGIN_FILES
//      (the stale-CDN class — B4), unless it is in ALLOW_UNLISTED below.
//
// Usage:  node dev-tools/check_plugin_files.cjs [--quiet]
// Exit:   0 = clean, 1 = drift, 2 = build.js / PLUGIN_FILES not found.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const QUIET = process.argv.includes('--quiet');

// Plugin files on disk that are intentionally NOT in PLUGIN_FILES (no CDN cache-bust needed).
// Each entry MUST carry a reason. Add here only when a plugin is deliberately excluded.
const ALLOW_UNLISTED = new Set([
  // (none yet — populated as intentional exclusions are confirmed)
]);

function fail(msg) { console.error(msg); process.exit(2); }

const buildPath = path.join(ROOT, 'build.js');
if (!fs.existsSync(buildPath)) fail('build.js not found at ' + buildPath);
const build = fs.readFileSync(buildPath, 'utf8');

const s = build.indexOf('const PLUGIN_FILES = [');
if (s === -1) fail('PLUGIN_FILES array not found in build.js');
const e = build.indexOf('];', s);
const block = build.slice(s, e);
// Only the stem_lab/ + sel_hub/ plugin entries (the ones that map to tool files on disk).
const entries = [...block.matchAll(/'((?:stem_lab|sel_hub)\/[^']+\.js)'/g)].map((m) => m[1]);

// Plugin files: stem_lab/stem_tool_*.js and sel_hub/sel_*.js (skip _build_*, _*, and the *_module.js
// aggregators). Use `git ls-files` — the CDN serves git-committed files, and a local checkout can
// case-normalize filenames (so readdirSync would miss the very casing 404s this gate exists to catch).
// Falls back to the working tree only if git is unavailable.
const { execSync } = require('child_process');
function plugins(dir, re) {
  const keep = (p) => { const b = p.split('/').pop(); return re.test(b) && !b.startsWith('_') && !/_module\.js$/.test(b); };
  try {
    return execSync('git ls-files -- ' + dir, { cwd: ROOT, encoding: 'utf8' }).split('\n').map((s) => s.trim()).filter(Boolean).filter(keep);
  } catch (_) {
    const d = path.join(ROOT, dir);
    return fs.existsSync(d) ? fs.readdirSync(d).map((f) => dir + '/' + f).filter(keep) : [];
  }
}
const disk = [...plugins('stem_lab', /^stem_tool_.*\.js$/), ...plugins('sel_hub', /^sel_.*\.js$/)];
const diskByLower = new Map(disk.map((d) => [d.toLowerCase(), d]));
const entrySet = new Set(entries);

// 1. duplicates
const counts = {};
entries.forEach((x) => { counts[x] = (counts[x] || 0) + 1; });
const dups = Object.keys(counts).filter((k) => counts[k] > 1).map((k) => k + '  (×' + counts[k] + ')');

// 2 + 3. entry has no disk file at all / casing mismatch
const noFile = [], casing = [];
for (const x of entries) {
  const actual = diskByLower.get(x.toLowerCase());
  if (!actual) noFile.push(x);
  else if (actual !== x) casing.push(x + '   (on disk: ' + actual + ')');
}

// 4. disk plugin missing from PLUGIN_FILES (case-insensitive membership; casing handled above)
const entryLower = new Set(entries.map((x) => x.toLowerCase()));
const unlisted = disk.filter((d) => !entryLower.has(d.toLowerCase()) && !ALLOW_UNLISTED.has(d));

const errors = dups.length + noFile.length + casing.length + unlisted.length;

if (!QUIET || errors > 0) {
  console.log('');
  console.log('=== PLUGIN_FILES ↔ disk drift ===');
  console.log('  PLUGIN_FILES stem_lab/sel_hub entries: ' + entries.length + '   disk plugin files: ' + disk.length);
}
if (dups.length) { console.log('\n✗ DUPLICATE entries (' + dups.length + '):'); dups.forEach((x) => console.log('    ' + x)); }
if (noFile.length) { console.log('\n✗ entry with NO file on disk (' + noFile.length + '):'); noFile.forEach((x) => console.log('    ' + x)); }
if (casing.length) { console.log('\n✗ CASING mismatch (case-sensitive-FS hazard) (' + casing.length + '):'); casing.forEach((x) => console.log('    ' + x)); }
if (unlisted.length) { console.log('\n✗ on disk but MISSING from PLUGIN_FILES → stale CDN (' + unlisted.length + '):'); unlisted.forEach((x) => console.log('    ' + x)); }

if (errors === 0) { if (!QUIET) console.log('\n  ✅ PLUGIN_FILES is in sync with disk (no dups, no dead entries, no casing/stale drift).\n'); process.exit(0); }
console.log('\n  ❌ ' + errors + ' PLUGIN_FILES drift issue(s) — fix build.js (or ALLOW_UNLISTED) before deploy.\n');
process.exit(1);
