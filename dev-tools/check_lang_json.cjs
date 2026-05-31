#!/usr/bin/env node
// check_lang_json.cjs — every lang/*.js translation pack must parse as valid JSON.
//
// Lang packs are bare JSON objects fetched at runtime from the CDN and JSON.parsed
// (AlloFlowANTI.txt:1566 loadLanguage). A corrupt pack (bad escape, trailing comma,
// truncation) silently breaks that entire language for users.
//
// Bug class: lang-pack corruption during bulk substitution / derivation
// (Polish/Pashto/Urdu/Farsi/Dari, Phases T–X, May 2026).
//
// Usage:  node dev-tools/check_lang_json.cjs [--quiet]
// Exit:   0 — all packs valid JSON.   1 — at least one pack is malformed.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const QUIET = process.argv.includes('--quiet');

const dir = path.join(ROOT, 'lang');
if (!fs.existsSync(dir)) { console.log('check_lang_json: no lang/ directory; skipping.'); process.exit(0); }

let bad = 0, checked = 0, skipped = 0;
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.js')) continue;
  const txt = fs.readFileSync(path.join(dir, f), 'utf8').replace(/^﻿/, '').trimStart();
  if (txt[0] !== '{' && txt[0] !== '[') { skipped++; continue; } // a real JS file, not a bare-JSON pack
  checked++;
  try { JSON.parse(txt); }
  catch (e) { bad++; if (!QUIET) console.log(`  ❌ lang/${f}: ${String(e.message).split('\n')[0]}`); }
}
if (bad) { console.log(`\n❌ check_lang_json: ${bad}/${checked} lang pack(s) are NOT valid JSON.`); process.exit(1); }
console.log(`✓ check_lang_json: ${checked} lang pack(s) valid JSON` + (skipped ? ` (${skipped} non-JSON .js skipped)` : '') + '.');
process.exit(0);
