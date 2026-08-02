#!/usr/bin/env node
// Apply the repository's existing locally authored STEM hand-translation tables.
// The merge is additive: translated keys already present in a pack are preserved.
// Canonical and deployed web mirrors are written together and checked for parity.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const DEPLOY_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const TOOLS = process.argv.slice(2);

if (!TOOLS.length) {
  console.error('Usage: apply_existing_stem_tables_20260801.cjs <tool> [tool ...]');
  process.exit(2);
}

function saveAtomic(file, value) {
  const tmp = file + '.codex-tmp';
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + String.fromCharCode(10), 'utf8');
  fs.renameSync(tmp, file);
}

let totalAdded = 0;
let totalConflicts = 0;

for (const tool of TOOLS) {
  const enFile = path.join(__dirname, `stem_${tool}_en.json`);
  if (!fs.existsSync(enFile)) throw new Error(`Missing source table: ${enFile}`);
  const valid = new Set(Object.keys(JSON.parse(fs.readFileSync(enFile, 'utf8'))));
  const tableFiles = fs.readdirSync(__dirname)
    .filter((f) => f.startsWith(`handtl_${tool}_`) && f.endsWith('.json'))
    .sort();
  const translations = {};
  for (const file of tableFiles) {
    const table = JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
    for (const [slug, values] of Object.entries(table)) {
      translations[slug] ??= {};
      for (const [key, value] of Object.entries(values)) {
        if (!valid.has(key) || typeof value !== 'string' || !value) continue;
        if (translations[slug][key] !== undefined && translations[slug][key] !== value) {
          totalConflicts++;
          continue;
        }
        translations[slug][key] = value;
      }
    }
  }

  let toolAdded = 0;
  let packsChanged = 0;
  for (const [slug, values] of Object.entries(translations)) {
    const canonicalFile = path.join(LANG_DIR, `${slug}.js`);
    const deployedFile = path.join(DEPLOY_DIR, `${slug}.js`);
    if (!fs.existsSync(canonicalFile) || !fs.existsSync(deployedFile)) continue;
    const canonical = JSON.parse(fs.readFileSync(canonicalFile, 'utf8'));
    canonical.stem ??= {};
    canonical.stem[tool] ??= {};
    let added = 0;
    for (const [key, value] of Object.entries(values)) {
      if (!(key in canonical.stem[tool])) {
        canonical.stem[tool][key] = value;
        added++;
      }
    }
    if (!added) continue;
    saveAtomic(canonicalFile, canonical);
    const deployed = JSON.parse(fs.readFileSync(deployedFile, 'utf8'));
    deployed.stem ??= {};
    deployed.stem[tool] = canonical.stem[tool];
    saveAtomic(deployedFile, deployed);
    toolAdded += added;
    packsChanged++;
  }
  totalAdded += toolAdded;
  console.log(`${tool}: ${tableFiles.length} local table(s), ${Object.keys(translations).length} locale(s), +${toolAdded} key(s) across ${packsChanged} pack(s)`);
}

console.log(`Applied ${totalAdded} local STEM hand translations; conflicts preserved: ${totalConflicts}.`);
