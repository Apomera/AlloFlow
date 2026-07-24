#!/usr/bin/env node
// Drift guard for the Ctrl+K command palette i18n. Keeps the localization from
// silently rotting when commands are added/changed. Two hard checks + one warn:
//   A) cmd_keys_en.json must equal a FRESH extraction from allo_commands_source.jsx
//      (catches: a command was added/renamed/removed but extract_cmd_keys.cjs was
//      not re-run, so the manifest no longer reflects the source).
//   B) every canonical cmd.*/palette.* key must exist (non-empty) in every canonical
//      lang/*.js pack (catches: extracted but never translated+merged → English-only).
//   C) desktop/web-app/public/lang mirror — WARN only (secondary/demo surface).
// Exit 1 on any A or B failure. Wire into verify_all + CI alongside check_lang_json.
'use strict';
const fs = require('fs');
const path = require('path');
const { extractFromSource, SRC, OUT } = require('./i18n/extract_cmd_keys.cjs');

const ROOT = path.resolve(__dirname, '..');
const LANG = path.join(ROOT, 'lang');
const MIRROR = path.join(ROOT, 'desktop/web-app', 'public', 'lang');
const QUIET = process.argv.includes('--quiet');
const info = (...a) => { if (!QUIET) console.log(...a); };
let failed = false;

// ── A) manifest freshness ──
const fresh = extractFromSource(SRC);
const disk = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const fK = new Set(Object.keys(fresh)), dK = new Set(Object.keys(disk));
const addedInSrc = [...fK].filter((k) => !dK.has(k));
const goneFromSrc = [...dK].filter((k) => !fK.has(k));
if (addedInSrc.length || goneFromSrc.length) {
  failed = true;
  console.error('✗ cmd i18n manifest STALE — run: node dev-tools/i18n/extract_cmd_keys.cjs');
  if (addedInSrc.length) console.error('  new in source, missing from manifest: ' + addedInSrc.slice(0, 12).join(', ') + (addedInSrc.length > 12 ? ` (+${addedInSrc.length - 12} more)` : ''));
  if (goneFromSrc.length) console.error('  in manifest, gone from source: ' + goneFromSrc.slice(0, 12).join(', '));
}

// ── B/C) pack coverage ──
const enKeys = Object.keys(disk);
const getDeep = (o, k) => k.split('.').reduce((a, p) => (a && typeof a === 'object') ? a[p] : undefined, o);
function checkDir(dir, label, hard) {
  if (!fs.existsSync(dir)) { console.log(`  (${label}: dir not present — skipped)`); return; }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
  let bad = 0;
  for (const f of files) {
    let pack;
    try { pack = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); }
    catch (e) { console.error(`  ${hard ? '✗' : '⚠'} ${label}/${f}: invalid JSON`); if (hard) failed = true; bad++; continue; }
    const missing = enKeys.filter((k) => { const v = getDeep(pack, k); return v === undefined || v === null || String(v).trim() === ''; });
    if (missing.length) {
      bad++;
      console.error(`  ${hard ? '✗' : '⚠'} ${label}/${f}: missing ${missing.length} cmd/palette key(s) [${missing.slice(0, 4).join(', ')}${missing.length > 4 ? '…' : ''}]`);
      if (hard) failed = true;
    }
  }
  info(`  ${label}: ${files.length - bad}/${files.length} packs complete`);
}

info(`check_cmd_i18n: ${enKeys.length} canonical keys (${enKeys.filter((k) => k.startsWith('cmd.')).length} cmd + ${enKeys.filter((k) => k.startsWith('palette.')).length} palette)`);
checkDir(LANG, 'lang', true);
checkDir(MIRROR, 'mirror', false); // mirror = warn only; resync via: node dev-tools/i18n/merge_cmd_keys.cjs --lang-dir=desktop/web-app/public/lang

if (!failed) info('✓ check_cmd_i18n: command palette i18n complete + manifest fresh.');
else console.error('\nFix: (A) re-extract → `node dev-tools/i18n/extract_cmd_keys.cjs`; (B) translate the delta then `node dev-tools/i18n/merge_cmd_keys.cjs`. See the project_ctrlk_palette memory for the pipeline.');
process.exit(failed ? 1 : 0);
