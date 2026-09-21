#!/usr/bin/env node
/*
 * check_sel_four_copy_parity.cjs — all FOUR SEL copies must match, not two.
 *
 * WHY: every mirror-parity assertion in the SEL test suite compares source
 * against ONE mirror:
 *
 *     expect(readFileSync(MIRROR)).toBe(readFileSync(SOURCE))
 *
 * But the SEL tools live in four places:
 *
 *     sel_hub/                        source
 *     desktop/web-app/public/sel_hub  served by the CDN
 *     desktop/app-build/sel_hub       the packaged desktop app
 *     desktop/web-app/build/sel_hub   the React build output
 *
 * So two copies can drift indefinitely while the suite stays green — and a
 * student on the packaged desktop app would run different code from a student
 * on the web. During the 2026-09-14/15 SEL work that risk was live: 45 files
 * were edited and hand-synced to ONE mirror at a time, and a `cp` loop had
 * already been caught missing a file once.
 *
 * This compares content hashes across all four and reports which copy differs.
 * A build artifact being stale is normal between builds — but it should be a
 * VISIBLE, deliberate state, not something a green test bar conceals.
 *
 * Usage:  node dev-tools/check_sel_four_copy_parity.cjs [--quiet] [--json]
 * Exit:   non-zero if any copy differs from source.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.cwd();
const QUIET = process.argv.includes('--quiet');
const AS_JSON = process.argv.includes('--json');

const SRC = 'sel_hub';
const MIRRORS = [
  'desktop/web-app/public/sel_hub',
  'desktop/app-build/sel_hub',
  'desktop/web-app/build/sel_hub',
];

const md5 = (p) => crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex');

const srcDir = path.join(ROOT, SRC);
if (!fs.existsSync(srcDir)) {
  console.log('check_sel_four_copy_parity: sel_hub/ not found — skipped.');
  process.exit(0);
}

// Only the shipped JS; ignore JSON data, media, and docs.
const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.js')).sort();

const findings = [];
for (const f of files) {
  const srcHash = md5(path.join(srcDir, f));
  for (const m of MIRRORS) {
    const mp = path.join(ROOT, m, f);
    if (!fs.existsSync(mp)) {
      findings.push({ file: f, mirror: m, why: 'missing from this copy' });
      continue;
    }
    if (md5(mp) !== srcHash) {
      findings.push({
        file: f,
        mirror: m,
        why: `content differs (source ${fs.statSync(path.join(srcDir, f)).size}B, copy ${fs.statSync(mp).size}B)`,
      });
    }
  }
}

if (AS_JSON) {
  console.log(JSON.stringify({ compared: files.length, mirrors: MIRRORS, findings }, null, 2));
  process.exit(findings.length ? 1 : 0);
}

const byMirror = {};
for (const f of findings) (byMirror[f.mirror] = byMirror[f.mirror] || []).push(f);

for (const [m, list] of Object.entries(byMirror)) {
  console.log(`[SEL-COPY-DRIFT] ${m}  (${list.length} file(s))`);
  for (const d of list.slice(0, 10)) console.log(`    ${d.file} — ${d.why}`);
  if (list.length > 10) console.log(`    ...and ${list.length - 10} more`);
  console.log();
}

if (!QUIET) console.log(`SEL .js files compared: ${files.length} x ${MIRRORS.length} copies`);

if (findings.length === 0) {
  console.log(`✓ check_sel_four_copy_parity: all ${MIRRORS.length + 1} SEL copies identical (${files.length} files).`);
} else {
  console.log(`✗ check_sel_four_copy_parity: ${findings.length} file/copy mismatch(es).`);
  console.log('  Re-sync every copy, not just the first:');
  console.log('    for m in desktop/web-app/public desktop/app-build desktop/web-app/build; do');
  console.log('      cp sel_hub/<file> "$m/sel_hub/<file>"; done');
  console.log('  A stale BUILD output may be expected between builds — but say so out loud');
  console.log('  rather than letting a one-mirror test hide it.');
}

process.exit(findings.length ? 1 : 0);
