#!/usr/bin/env node
// OSS attribution guard. Two hand-maintained surfaces must not drift:
//   1. OSS_CREDITS in view_info_modal_source.jsx — the in-app About → Open Source tab
//   2. THIRD_PARTY_LICENSES.md — the NOTICES file (the legal attribution surface)
// and the NOTICES file must actually carry what compliance needs:
//   - every credited library has a row with a non-empty Copyright notice,
//   - every bundled license text it points at (licenses/*.txt) exists on disk.
// A drift here is how a dependency silently ships uncredited, or a copyright
// notice quietly goes missing — both are license violations, so this fails hard.
//
// Exit 0 = clean; exit 1 = a problem the committer must fix.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'view_info_modal_source.jsx');
const MD = path.join(ROOT, 'THIRD_PARTY_LICENSES.md');

const problems = [];
const note = (m) => problems.push(m);

// Names differ slightly between the two surfaces (a parenthetical here, an
// owner suffix there). Compare on the CORE name: everything before the first
// " (" or " —", lowercased, punctuation-flattened.
function core(name) {
  return String(name)
    .split(/\s+\(|\s+—|\s+-\s+/)[0]
    .toLowerCase()
    .replace(/[^a-z0-9.+*&]/g, '')
    .trim();
}

// ── 1. read OSS_CREDITS names out of the source ──────────────────────────────
const src = fs.readFileSync(SRC, 'utf8');
const credStart = src.indexOf('const OSS_CREDITS = [');
const credEnd = src.indexOf('\n];', credStart);
if (credStart < 0 || credEnd < 0) { console.error('✗ could not locate OSS_CREDITS block'); process.exit(1); }
const credBlock = src.slice(credStart, credEnd);
const creditNames = [...credBlock.matchAll(/\bname:\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);
if (creditNames.length < 40) { console.error(`✗ only ${creditNames.length} OSS_CREDITS names parsed — regex likely broke`); process.exit(1); }

// ── 2. read the NOTICES file: inventory rows + their copyright cells ──────────
const md = fs.readFileSync(MD, 'utf8');
// inventory rows look like:  | [Name](url) | use | license | Copyright ... |
const rows = [...md.matchAll(/^\|\s*\[([^\]]+)\]\([^)]*\)\s*\|([^\n]*)\|\s*$/gm)];
const mdEntries = rows.map((m) => {
  const cells = m[2].split('|').map((c) => c.trim());
  // cells = [use, license, copyright]  (name was captured separately)
  return { name: m[1], license: cells[cells.length - 2] || '', copyright: cells[cells.length - 1] || '' };
});
const mdCores = new Set(mdEntries.map((e) => core(e.name)));

// ── 3. every credited library must have a NOTICES row ────────────────────────
for (const name of creditNames) {
  if (!mdCores.has(core(name))) {
    note(`credited in-app but MISSING from THIRD_PARTY_LICENSES.md: "${name}"`);
  }
}

// ── 4. every NOTICES row must carry a non-empty copyright notice ─────────────
for (const e of mdEntries) {
  const cp = e.copyright.replace(/[\s.]/g, '');
  if (!cp || /^(—|-|n\/a|tbd|todo)$/i.test(e.copyright.trim())) {
    note(`THIRD_PARTY row has no copyright notice: "${e.name}"`);
  }
}

// ── 5. informational: NOTICES rows with no matching in-app credit ────────────
// (not fatal — the NOTICES file may list build/vendored items the tab omits,
//  but surfacing it catches accidental orphans)
const creditCores = new Set(creditNames.map(core));
const orphans = mdEntries.filter((e) => !creditCores.has(core(e.name))).map((e) => e.name);

// ── 6. every bundled license text the NOTICES file points at must exist ──────
const referenced = [...md.matchAll(/licenses\/([A-Za-z0-9.+-]+\.txt)/g)].map((m) => m[1]);
const uniqueRefs = [...new Set(referenced)];
for (const f of uniqueRefs) {
  if (!fs.existsSync(path.join(ROOT, 'licenses', f))) {
    note(`THIRD_PARTY_LICENSES.md references licenses/${f} but the file does not exist`);
  }
}
// and every bundled text should be referenced (a stray file = probably a typo'd link)
const onDisk = fs.existsSync(path.join(ROOT, 'licenses'))
  ? fs.readdirSync(path.join(ROOT, 'licenses')).filter((f) => f.endsWith('.txt'))
  : [];
for (const f of onDisk) {
  if (!uniqueRefs.includes(f)) note(`licenses/${f} is bundled but never referenced from THIRD_PARTY_LICENSES.md`);
}

// ── 7. vendored (copied-in) third-party files must keep a notice banner ──────
// Minification strips leading comments; when a vendored lib's header goes, the
// copyright/license notice its license requires goes with it. Assert each known
// vendored file still carries a Copyright line near the top.
const VENDORED = [
  'lame.min.js',
  'data_lab/vendor/iframe-phone.js',
  'immersive_geometry/vendor/aframe.min.js',
  'temml/temml.min.js',
  'qrcode.js',
];
for (const rel of VENDORED) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { note(`vendored file expected but missing: ${rel}`); continue; }
  const head = fs.readFileSync(p, 'utf8').slice(0, 800);
  if (!/copyright/i.test(head)) {
    note(`vendored file lost its copyright/license banner (minification strips it): ${rel}`);
  }
}

// ── report ───────────────────────────────────────────────────────────────────
if (problems.length) {
  console.error('✗ check_oss_credits: ' + problems.length + ' attribution problem(s):');
  for (const p of problems) console.error('   - ' + p);
  console.error('\n  Fix: add the missing row/notice/text, or correct the name so the two');
  console.error('  surfaces agree. Both OSS_CREDITS and THIRD_PARTY_LICENSES.md must list it.');
  process.exit(1);
}
console.log(`✓ check_oss_credits: ${creditNames.length} credited libraries all present with copyright notices; ${onDisk.length} bundled license texts all referenced.`);
if (orphans.length) console.log(`  (note: ${orphans.length} NOTICES row(s) not in the in-app tab — expected for build/vendored items: ${orphans.slice(0, 6).join(', ')}${orphans.length > 6 ? '…' : ''})`);
process.exit(0);
