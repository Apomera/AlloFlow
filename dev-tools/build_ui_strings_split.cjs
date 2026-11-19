#!/usr/bin/env node
// Derive ui_strings_core.js and ui_strings_stem.js from ui_strings.js (2026-11-17).
//
// ui_strings.js stays the single, full source of truth (tests, dev-tools and old app
// shells read it). The app boots from the core file (everything except `stem`, plus the
// stem keys that code outside the STEM tools reads) and loads the stem file only when
// STEAM Lab is used. The `stem` section is ~80% of ui_strings.js.
//
//   node dev-tools/build_ui_strings_split.cjs           write both files if they changed
//   node dev-tools/build_ui_strings_split.cjs --check   exit 1 if either file is stale
//
// Core keeps every `stem.*` literal found in code outside stem_lab/stem_tool_*.js (the
// STEAM Lab hub, root modules, SEL Hub). A literal ending in "." (a dynamic prefix such
// as 'stem.tools_menu.' + id) keeps that whole subtree.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'ui_strings.js');
const CORE = path.join(ROOT, 'ui_strings_core.js');
const STEM = path.join(ROOT, 'ui_strings_stem.js');

function readerFiles(root = ROOT) {
  const files = [];
  for (const name of fs.readdirSync(root)) {
    // Root stem_tool_*.js and explain_integrity_source_preview.js are stale copies the app never loads.
    if (!name.endsWith('.js') || /^ui_strings/.test(name) || /^stem_tool_/.test(name) || name === 'explain_integrity_source_preview.js') continue;
    const full = path.join(root, name);
    if (fs.statSync(full).isFile()) files.push(full);
  }
  const hub = path.join(root, 'stem_lab', 'stem_lab_module.js');
  if (fs.existsSync(hub)) files.push(hub);
  const sel = path.join(root, 'sel_hub');
  if (fs.existsSync(sel)) for (const name of fs.readdirSync(sel)) if (name.endsWith('.js')) files.push(path.join(sel, name));
  return files;
}

function stemLiterals(files) {
  const exact = new Set(), prefixes = new Set();
  const re = /['"`](stem\.[A-Za-z0-9_.$-]*)['"`]/g;
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (text.indexOf('stem.') < 0) continue;
    let m;
    while ((m = re.exec(text))) {
      const key = m[1];
      if (key.endsWith('.')) prefixes.add(key.slice(0, -1));
      else exact.add(key);
    }
    // `stem.section.${id}` keeps the whole section.
    const templ = /`(stem\.[A-Za-z0-9_.]*?)\.?\$\{/g;
    while ((m = templ.exec(text))) if (m[1] !== 'stem') prefixes.add(m[1]);
  }
  return { exact, prefixes };
}

const getPath = (obj, parts) => parts.reduce((cur, part) => (cur && typeof cur === 'object' ? cur[part] : undefined), obj);
function setPath(obj, parts, value) {
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function derive(sourceText, files = readerFiles()) {
  const strings = JSON.parse(sourceText);
  if (!strings || typeof strings !== 'object' || !strings.stem || typeof strings.stem !== 'object') {
    throw new Error('ui_strings.js has no stem section');
  }
  const { exact, prefixes } = stemLiterals(files);
  const shared = {};
  // Walk the literal keys in a stable order so the output is deterministic.
  for (const key of [...exact, ...prefixes].sort()) {
    const parts = key.split('.');
    const value = getPath(strings, parts);
    if (value !== undefined) setPath(shared, parts.slice(1), value);
  }
  // Keep the source order: rebuild `stem` for core with only the shared keys.
  const core = {};
  for (const [top, value] of Object.entries(strings)) {
    if (top !== 'stem') core[top] = value;
    else if (Object.keys(shared).length) core.stem = orderLike(value, shared);
  }
  return {
    core: JSON.stringify(core, null, 2) + '\n',
    stem: JSON.stringify({ stem: strings.stem }, null, 2) + '\n',
    sharedKeys: exact.size,
    sharedPrefixes: prefixes.size,
  };
}

// Order `subset` like `full` (both objects), recursively.
function orderLike(full, subset) {
  if (!subset || typeof subset !== 'object' || Array.isArray(subset)) return subset;
  const out = {};
  for (const key of Object.keys(full)) if (Object.prototype.hasOwnProperty.call(subset, key)) out[key] = orderLike(full[key], subset[key]);
  return out;
}

function run({ check = false } = {}) {
  if (!fs.existsSync(SOURCE)) { console.log('ui_strings split: no ui_strings.js, skipped'); return 0; }
  const out = derive(fs.readFileSync(SOURCE, 'utf8'));
  const stale = [[CORE, out.core], [STEM, out.stem]].filter(([file, text]) => !fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text);
  if (check) {
    if (stale.length) {
      console.error('ui_strings split is stale: ' + stale.map(([f]) => path.basename(f)).join(', ') + '. Run: node dev-tools/build_ui_strings_split.cjs');
      return 1;
    }
    console.log('ui_strings split is current');
    return 0;
  }
  for (const [file, text] of stale) {
    const tmp = file + '.split-' + process.pid + '.tmp';
    fs.writeFileSync(tmp, text, 'utf8');
    fs.renameSync(tmp, file);
  }
  console.log(`ui_strings split: core ${(Buffer.byteLength(out.core) / 1048576).toFixed(2)} MB (${out.sharedKeys} shared stem keys, ${out.sharedPrefixes} prefixes), stem ${(Buffer.byteLength(out.stem) / 1048576).toFixed(2)} MB; ${stale.length ? 'wrote ' + stale.map(([f]) => path.basename(f)).join(', ') : 'unchanged'}`);
  return 0;
}

module.exports = { derive, readerFiles, stemLiterals, run };
if (require.main === module) process.exitCode = run({ check: process.argv.includes('--check') });
