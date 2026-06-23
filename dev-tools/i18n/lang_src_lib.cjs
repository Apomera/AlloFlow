#!/usr/bin/env node
// lang_src_lib.cjs — shared helpers for the translation-staleness tooling.
//
// Background: the gap reports (lang_pack_gap_report.cjs / help_mode_gap_report.cjs)
// answer "which keys are MISSING or still English (passthrough) in each pack?".
// They CANNOT answer "which translations are STALE — i.e. the English source was
// reworded but the existing (non-English) translation was never updated?", because
// a key that is present and non-English looks fully translated to them.
//
// This lib provides the primitives both bless_lang_sources.cjs (writes the English
// baseline snapshot) and check_lang_staleness.cjs (flags drift against it) share:
//   - a unified canonical English map  key -> english   (ui_strings.js + help_strings.js)
//   - a stable per-string content hash
//   - pack loading / flattening that matches the existing gap-report conventions
//
// The source key namespaces line up 1:1 with pack keys:
//   ui_strings.js   flattened whole  ->  common.*, behavior_lens.*, alerts.*, ...   (same dotted path in packs)
//   help_strings.js flat HELP_STRINGS ->  help_mode.<key>                            (the help_mode.* namespace in packs)
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const UI_STRINGS = path.join(ROOT, 'ui_strings.js');
const HELP_STRINGS = path.join(ROOT, 'help_strings.js');
const LANG_DIR = path.join(ROOT, 'lang');
const BASELINE_PATH = path.join(__dirname, 'lang_source_baseline.json');
const STALE_DIR = path.join(__dirname, 'lang_staleness');

// Packs that are deliberately not held to translation quality the same way
// (consistent with help_mode_gap_report.cjs — maay_maay is the wrong language by a human call).
const EXCLUDE = new Set(['maay_maay']);

// Flatten a nested object to dotted keys. Arrays are treated as leaf values
// (matches lang_pack_gap_report.cjs so the key space is identical).
function flatten(obj, prefix = '') {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, full));
    else out[full] = v;
  }
  return out;
}

// Normalize a leaf value for hashing/comparison: trim strings (the help report
// compares on trimmed values), JSON-encode anything non-string (arrays/numbers).
function norm(v) {
  return typeof v === 'string' ? v.trim() : JSON.stringify(v);
}

// Stable short content hash of a normalized English value.
function hashEn(v) {
  return crypto.createHash('sha1').update(norm(v)).digest('hex').slice(0, 12);
}

// Canonical English from ui_strings.js (bare JSON, all namespaces).
function loadUiStrings() {
  const raw = fs.readFileSync(UI_STRINGS, 'utf8').replace(/^﻿/, '');
  return flatten(JSON.parse(raw));
}

// Canonical English from help_strings.js (a JS object literal behind a comment header),
// mapped into the help_mode.* namespace so keys match the packs.
function loadHelpStrings() {
  if (!fs.existsSync(HELP_STRINGS)) return {};
  const raw = fs.readFileSync(HELP_STRINGS, 'utf8');
  const H = new Function('return (' + raw.slice(raw.indexOf('{')) + ')')();
  const out = {};
  for (const [k, v] of Object.entries(H)) out['help_mode.' + k] = v;
  return out;
}

// Unified canonical English map: key -> english value.
function loadSourceStrings() {
  return Object.assign({}, loadUiStrings(), loadHelpStrings());
}

// All translatable pack slugs (bare-JSON packs only; skips real .js files), minus EXCLUDE.
function getLangSlugs() {
  if (!fs.existsSync(LANG_DIR)) return [];
  return fs.readdirSync(LANG_DIR)
    .filter(f => f.endsWith('.js'))
    .map(f => f.replace(/\.js$/, ''))
    .filter(slug => {
      if (EXCLUDE.has(slug)) return false;
      const txt = fs.readFileSync(path.join(LANG_DIR, slug + '.js'), 'utf8').replace(/^﻿/, '').trimStart();
      return txt[0] === '{' || txt[0] === '['; // a bare-JSON pack, not a real JS module
    });
}

// Load + flatten a pack. Returns null if it doesn't parse (check_lang_json owns that error).
function loadPack(slug) {
  try {
    const raw = fs.readFileSync(path.join(LANG_DIR, slug + '.js'), 'utf8').replace(/^﻿/, '');
    return flatten(JSON.parse(raw));
  } catch (_) {
    return null;
  }
}

// The committed English baseline snapshot ({ key: hash }), or null if not yet blessed.
function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) return null;
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
}

// Single source of truth for "what is stale". Both check_lang_staleness.cjs and
// merge_stale_translations.cjs use this so their notion of staleness can't drift.
//   changedKeys : English keys whose wording changed since they were blessed
//   newKeys     : source keys absent from the baseline (added since → gap-report territory, not stale)
//   perPack     : { slug: { key: currentEnglish } } — packs that hold a translation predating the change
//   byKey       : { key: [slug,…] } — which packs are stale for each changed key
//   parseErrors : [slug,…] packs that didn't parse (check_lang_json owns that)
function computeStaleness(opts) {
  opts = opts || {};
  const baseline = opts.baseline || loadBaseline() || {};
  const source = opts.source || loadSourceStrings();
  const slugs = opts.slugs || getLangSlugs();
  const changedKeys = [], newKeys = [];
  for (const k of Object.keys(source)) {
    if (!(k in baseline)) { newKeys.push(k); continue; }
    if (baseline[k] !== hashEn(source[k])) changedKeys.push(k);
  }
  const changedSet = new Set(changedKeys);
  const perPack = {}, byKey = {}, parseErrors = [];
  for (const slug of slugs) {
    const pack = loadPack(slug);
    if (!pack) { parseErrors.push(slug); continue; }
    const stale = {};
    for (const k of changedSet) {
      const pv = pack[k];
      if (pv === undefined) continue;                 // missing → gap report's job
      if (norm(pv) === norm(source[k])) continue;     // still English (passthrough) → gap report's job
      stale[k] = source[k];                           // real translation against OLD English → STALE
      (byKey[k] = byKey[k] || []).push(slug);
    }
    if (Object.keys(stale).length) perPack[slug] = stale;
  }
  return { changedKeys: changedKeys.sort(), newKeys, perPack, byKey, parseErrors };
}

module.exports = {
  ROOT, UI_STRINGS, HELP_STRINGS, LANG_DIR, BASELINE_PATH, STALE_DIR, EXCLUDE,
  flatten, norm, hashEn, loadUiStrings, loadHelpStrings, loadSourceStrings, getLangSlugs, loadPack,
  loadBaseline, computeStaleness,
};
