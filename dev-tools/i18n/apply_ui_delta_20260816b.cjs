#!/usr/bin/env node
// Merge the 2026-08-16 evening ui_strings delta (storage.* + alignment_graph.*, 46 keys) into
// lang/*.js and the desktop mirror. Additive only: an existing pack value is never overwritten.
// Validates before writing: 46 slots per language, no blanks, {size} present verbatim exactly
// in the two slots the English has it and nowhere else, no em/en dashes.
// Usage: node dev-tools/i18n/apply_ui_delta_20260816b.cjs [--dry-run]
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DIRS = [path.join(ROOT, 'lang'), path.join(ROOT, 'desktop/web-app/public/lang')];
const DRY = process.argv.includes('--dry-run');

const rows = Object.assign(
  {},
  require('./ui_delta_hand_20260816b_part1.cjs'),
  require('./ui_delta_hand_20260816b_part2.cjs'),
  require('./ui_delta_hand_20260816b_part3.cjs'),
);

const KEYS = [
  'storage.preset_automatic', 'storage.preset_automatic_detail',
  'storage.preset_compact', 'storage.preset_compact_detail',
  'storage.preset_standard', 'storage.preset_standard_detail',
  'storage.speech_models_title', 'storage.speech_models_note',
  'storage.model_whisper_label', 'storage.model_whisper_desc',
  'storage.model_kokoro_label', 'storage.model_kokoro_desc',
  'storage.model_on_device', 'storage.model_downloading',
  'storage.model_download', 'storage.model_cache',
  'alignment_graph.open_btn', 'alignment_graph.open_btn_title',
  'alignment_graph.open_input_aria', 'alignment_graph.close_imported',
  'alignment_graph.close_imported_title', 'alignment_graph.node_type_label',
  'alignment_graph.node_type_aria', 'alignment_graph.node_all',
  'alignment_graph.node_standard', 'alignment_graph.node_standards_context',
  'alignment_graph.node_audit_artifact', 'alignment_graph.node_audit_evidence',
  'alignment_graph.node_audit_finding', 'alignment_graph.node_audit_recommendation',
  'alignment_graph.source_label', 'alignment_graph.source_aria',
  'alignment_graph.source_all', 'alignment_graph.source_audit_model',
  'alignment_graph.source_teacher', 'alignment_graph.source_deterministic',
  'alignment_graph.source_unknown', 'alignment_graph.search_label',
  'alignment_graph.search_placeholder', 'alignment_graph.search_aria',
  'alignment_graph.reading_order_aria', 'alignment_graph.empty_filters',
  'alignment_graph.toast_too_large', 'alignment_graph.toast_opened',
  'alignment_graph.toast_invalid', 'alignment_graph.toast_unreadable',
];
const NEEDS_SIZE = new Set([14, 15]);

function setIfAbsent(o, k, v) {
  const parts = k.split('.');
  let cur = o;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  const leaf = parts[parts.length - 1];
  if (Object.prototype.hasOwnProperty.call(cur, leaf) && String(cur[leaf]).trim() !== '') return false;
  cur[leaf] = v;
  return true;
}

const langs = fs.readdirSync(path.join(ROOT, 'lang')).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, ''));
const problems = [];
for (const L of langs) {
  const v = rows[L];
  if (!v) { problems.push(`${L}: MISSING from delta`); continue; }
  if (v.length !== KEYS.length) { problems.push(`${L}: ${v.length} slots, expected ${KEYS.length}`); continue; }
  v.forEach((s, i) => {
    if (typeof s !== 'string' || !s.trim()) problems.push(`${L}[${i}]: blank`);
    if (/[—–]/.test(s)) problems.push(`${L}[${i}] (${KEYS[i]}): em/en dash`);
    if (NEEDS_SIZE.has(i) && !s.includes('{size}')) problems.push(`${L}[${i}]: lost {size}`);
    if (!NEEDS_SIZE.has(i) && s.includes('{size}')) problems.push(`${L}[${i}]: stray {size}`);
  });
}
if (problems.length) { console.error('VALIDATION FAILED:'); problems.forEach((p) => console.error('  ' + p)); process.exit(1); }
console.log(`validation OK: ${langs.length} languages x ${KEYS.length} slots`);

let added = 0, present = 0, files = 0;
for (const dir of DIRS) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    const slug = f.replace(/\.js$/, '');
    const v = rows[slug];
    if (!v) continue;
    const p = path.join(dir, f);
    const pack = JSON.parse(fs.readFileSync(p, 'utf8'));
    let dirty = false;
    v.forEach((s, i) => {
      if (setIfAbsent(pack, KEYS[i], s)) { added++; dirty = true; } else present++;
    });
    if (dirty && !DRY) {
      const out = JSON.stringify(pack, null, 2);
      JSON.parse(out);
      fs.writeFileSync(p, out, 'utf8');
      files++;
    }
  }
}
console.log(`${DRY ? '[dry] ' : ''}ui delta b: +${added} value(s), ${present} already present, ${files} pack file(s) written.`);
