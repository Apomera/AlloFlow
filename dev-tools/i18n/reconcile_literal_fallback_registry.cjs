#!/usr/bin/env node
'use strict';

// Register literal t('key', 'English fallback') calls that are currently
// English-safe at runtime but absent from ui_strings.js. A fallback prevents
// the dotted key from showing in English; it does not make the string
// translatable. This pass closes that registry gap across the host, modules,
// STEM tools, and SEL tools.
//
// Existing source leaves and pack values are never replaced. Canonical/deployed
// mirrors must already match before --apply writes.
//
// Usage:
//   node dev-tools/i18n/reconcile_literal_fallback_registry.cjs
//   node dev-tools/i18n/reconcile_literal_fallback_registry.cjs --apply
//   node dev-tools/i18n/reconcile_literal_fallback_registry.cjs --lang=french --apply

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const UI_FILE = path.join(ROOT, 'ui_strings.js');
const UI_MIRROR_FILE = path.join(ROOT, 'desktop', 'web-app', 'public', 'ui_strings.js');
const HOST = path.join(ROOT, 'AlloFlowANTI.txt');
const LANG_DIR = path.join(ROOT, 'lang');
const LANG_MIRROR_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const APPLY = process.argv.includes('--apply');
const GATE = process.argv.includes('--gate');
const langArg = process.argv.find((arg) => arg.startsWith('--lang='));
const requestedSlug = langArg ? langArg.slice('--lang='.length) : null;

// Some fallbacks are assembled from runtime values or live in files that the
// lightweight literal scanner cannot safely parse as a complete call. Keep
// these explicit so the registry still has the real English source string.
// Values use the host translation engine's {placeholder} syntax.
const EXPLICIT_FALLBACKS = {
  'view_announcer.loaded_prefix': 'View loaded:',
  'a11y.level_up_announcement': 'Level up!',
  'toasts.ws_probe_banked': '📊 {name}: probe {correct}/{total} saved to records',
  'toasts.individual_resource': 'For you: {title}',
  'takehome.loaded': 'Homework loaded: {title}',
  'takehome.saved': '📥 {title} saved to THIS device ({count} resources). Open AlloFlow at home to continue — no code needed.',
  'toasts.incomplete_project_saved': 'Remediation stopped because {why} — but your scanned/extracted text was saved to a project file in your Downloads. Use “Continue a previous session” to pick up where it left off, no re-scanning needed.',
  'toasts.incomplete_project_save_failed': 'Remediation stopped because {why}. Your extracted text is preserved in this browser session.',
  'timeline.moved_position': 'Moved timeline item to position {position}.',
  'status_steps.local_streaming': 'Receiving from {backend}... {chars} chars{context}',
  'behavior_lens.confirm.delete_entry': 'Move this ABC entry to Recently deleted?',
  'behavior_lens.confirm.reset_counts': 'Reset all counts and the timer? This cannot be undone.',
  'content.sources_unverified_note': 'These sources were surfaced by AI-assisted search and have not been independently verified — confirm each one before citing it.',
  'toasts.large_scan_warning': 'This scanned document is {pages} pages — OCR will make many AI calls and take a while. Tip: use the page-range control to remediate it in smaller sections (e.g. 1–50, 51–100).',
  'games.crossword.announce_incorrect_count': '{count} {squareLabel} need attention.',
  'directions.soft_gate_nudge': '💡 Tip from your teacher: finish your goals first ({done}/{total} done). You can keep going!',
  'pdf_audit.storm_wait_round': 'Canvas is rate-limiting — pausing before round {round}/{max} so calls are not wasted (rechecking in ~{s}s; your checkpoint will remain resumable)',
  'research_hub.ai_calls_remaining_prefix': 'AI questions remaining: ',
  'math_fluency.probe_recorded_for': 'Probe recorded for {student}.',
  'timeline.item_position_aria': 'Timeline item {position} of {total}',
  'timeline.move_up_aria': 'Move timeline item {position} up',
  'timeline.move_down_aria': 'Move timeline item {position} down',
  'anchor_chart.interactive_dialog_opened_aria': 'Interactive mode dialog opened.',
  'humanities.positionality_edit_help': 'Name your MATERIAL relationship to this question, not a generic identity. ≥{min} chars or 5s+ voice. Generic-identity statements ("as a student", "an observer") are refused.',
  'humanities.question_help': 'Open a position, not a fact. ≥{min} chars, ends in "?". Definitional / factoid questions are refused.',
  'humanities.contestability_help': 'What makes this contestable, and for whom? Name a stakeholder and a contested term. ≥{min} chars.',
  'pdf_audit.resolution.all_clean': '✓ All {total} original issues resolved — none remaining',
  'pdf_audit.resolution.all_resolved_new': '✓ All {total} original issues resolved · ⊕ {introduced} new issue(s) introduced — review below',
  'pdf_audit.verification.ai_incomplete_summary': 'AI semantic verification incomplete{detail}. The score shown is structural/automated checks; use “Complete final audit” below to finish the AI check when the service is calm — it audits only, and keeps this document as it is.',
  'pdf_audit.wcag_report.scope': 'Scope: WCAG 2.2 Level A and AA — {total} success criteria. {exercised} were exercised by an automated engine on this document; {untested} were not.',
  'pdf_audit.wcag_report.untested_heading': 'Not evaluated on this document ({untested} of {total} criteria)'
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function flatten(value, prefix = '', out = {}) {
  for (const [key, child] of Object.entries(value || {})) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, full, out);
    else out[full] = child;
  }
  return out;
}

function getDeep(target, dottedKey) {
  return dottedKey.split('.').reduce((value, key) => value == null ? undefined : value[key], target);
}

function setDeep(target, dottedKey, value) {
  const parts = dottedKey.split('.');
  let cursor = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (cursor[part] === undefined) cursor[part] = {};
    if (!cursor[part] || typeof cursor[part] !== 'object' || Array.isArray(cursor[part])) {
      throw new Error(`cannot create ${dottedKey}: ${parts.slice(0, i + 1).join('.')} is not an object`);
    }
    cursor = cursor[part];
  }
  cursor[parts[parts.length - 1]] = value;
}

function replaceFile(file, text) {
  const temporary = `${file}.literal-reconcile-${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, text, 'utf8');
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function writeJsonPair(file, mirrorFile, value) {
  const output = JSON.stringify(value, null, 2) + '\n';
  replaceFile(file, output);
  replaceFile(mirrorFile, output);
}

// Keep the source scanner aligned with check_translation_keys.cjs: strings,
// comments, and template bodies must not create false translation calls.
function buildJsCodeMask(source) {
  const mask = new Uint8Array(source.length);
  const templateExpressionDepths = [];
  let mode = 'code';
  let quote = '';
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (mode === 'line-comment') {
      if (ch === '\n') mode = 'code';
      continue;
    }
    if (mode === 'block-comment') {
      if (ch === '*' && next === '/') { i += 1; mode = 'code'; }
      continue;
    }
    if (mode === 'string') {
      if (ch === '\\') { i += 1; continue; }
      if (ch === quote) mode = 'code';
      continue;
    }
    if (mode === 'template') {
      if (ch === '\\') { i += 1; continue; }
      if (ch === '`') { mode = 'code'; continue; }
      if (ch === '$' && next === '{') {
        mask[i] = 1;
        mask[i + 1] = 1;
        templateExpressionDepths.push(1);
        i += 1;
        mode = 'code';
      }
      continue;
    }

    mask[i] = 1;
    if (ch === '/' && next === '/') { i += 1; mode = 'line-comment'; continue; }
    if (ch === '/' && next === '*') { i += 1; mode = 'block-comment'; continue; }
    if (ch === "'" || ch === '"') { quote = ch; mode = 'string'; continue; }
    if (ch === '`') { mode = 'template'; continue; }
    if (templateExpressionDepths.length && ch === '{') {
      templateExpressionDepths[templateExpressionDepths.length - 1] += 1;
    } else if (templateExpressionDepths.length && ch === '}') {
      const last = templateExpressionDepths.length - 1;
      templateExpressionDepths[last] -= 1;
      if (templateExpressionDepths[last] === 0) {
        templateExpressionDepths.pop();
        mode = 'template';
      }
    }
  }
  return mask;
}

function unescapeLiteral(value) {
  return value
    .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\(["'`\\])/g, '$1');
}

function addCandidate(map, key, value, file, line) {
  if (typeof value !== 'string' || !value.trim()) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push({ value, file, line });
}

function scanFile(file, candidates, currentUi) {
  const source = fs.readFileSync(file, 'utf8');
  const mask = buildJsCodeMask(source);
  // The first argument is intentionally constrained to a literal dotted key.
  // Calls with template/variable keys remain dynamic and are handled by other
  // runtime coverage checks.
  const callRe = /(?<![A-Za-z0-9_$])(?:t|__alloT|_t|[A-Za-z_$][\w$]*)\.t\(\s*(['"])((?:\\.|(?!\1).)*)\1|(?<![A-Za-z0-9_$])(?:t|__alloT|_t)\(\s*(['"])((?:\\.|(?!\3).)*)\3/g;
  let match;
  while ((match = callRe.exec(source)) !== null) {
    if (!mask[match.index]) continue;
    const keyRaw = match[2] !== undefined ? match[2] : match[4];
    const afterKey = source.slice(callRe.lastIndex, callRe.lastIndex + 1600);
    const key = unescapeLiteral(keyRaw);
    if (!/^[a-zA-Z0-9_$.-]+$/.test(key) || key.includes('..') || typeof currentUi[key] === 'string') continue;

    let fallback = null;
    let fallbackOffset = 0;
    const comma = /^\s*,\s*(['"`])((?:\\.|(?!\1).)*)\1/.exec(afterKey);
    if (comma) {
      fallback = unescapeLiteral(comma[2]);
      fallbackOffset = comma.index;
    } else {
      const host = /^\s*\)\s*\|\|\s*(['"`])((?:\\.|(?!\1).)*)\1/.exec(afterKey);
      if (host) {
        fallback = unescapeLiteral(host[2]);
        fallbackOffset = host.index;
      }
    }
    if (fallback === null) continue;
    const line = source.slice(0, match.index + fallbackOffset).split('\n').length;
    addCandidate(candidates, key, fallback, path.relative(ROOT, file), line);
  }
}

function humanizeKey(key) {
  const leaf = key.split('.').pop()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return leaf ? leaf.charAt(0).toUpperCase() + leaf.slice(1) : key;
}

function chooseCandidate(entries) {
  const groups = new Map();
  for (const entry of entries || []) {
    const group = groups.get(entry.value) || { count: 0, length: entry.value.length };
    group.count += 1;
    groups.set(entry.value, group);
  }
  return [...groups.entries()]
    .sort((a, b) => b[1].count - a[1].count || b[1].length - a[1].length)[0]?.[0] || null;
}

function sourceFiles() {
  const rootFiles = fs.readdirSync(ROOT)
    .filter((file) => /^[^_].*_module\.js$/.test(file) || /^[^_].*_source\.jsx$/.test(file))
    .map((file) => path.join(ROOT, file));
  const stemFiles = fs.existsSync(path.join(ROOT, 'stem_lab'))
    ? fs.readdirSync(path.join(ROOT, 'stem_lab')).filter((file) => file.endsWith('.js') && !file.startsWith('_') && file !== 'blockly_runtime.bundle.js').map((file) => path.join(ROOT, 'stem_lab', file))
    : [];
  const selFiles = fs.existsSync(path.join(ROOT, 'sel_hub'))
    ? fs.readdirSync(path.join(ROOT, 'sel_hub')).filter((file) => file.endsWith('.js') && !file.startsWith('_')).map((file) => path.join(ROOT, 'sel_hub', file))
    : [];
  return [HOST, ...rootFiles, ...stemFiles, ...selFiles];
}

const ui = readJson(UI_FILE);
const currentUi = flatten(ui);
const candidates = new Map();
const errors = [];
for (const file of sourceFiles()) {
  try { scanFile(file, candidates, currentUi); }
  catch (error) { errors.push(`${path.relative(ROOT, file)}: ${error.message}`); }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const values = new Map();
const conflicts = [];
for (const [key, value] of Object.entries(EXPLICIT_FALLBACKS)) {
  if (typeof currentUi[key] !== 'string' || !currentUi[key].trim()) {
    values.set(key, value);
  }
}
for (const [key, entries] of [...candidates.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  if (typeof currentUi[key] === 'string' && currentUi[key].trim()) continue;
  const distinct = new Set(entries.map((entry) => entry.value));
  if (distinct.size > 1) conflicts.push({ key, values: [...distinct].slice(0, 8) });
  values.set(key, chooseCandidate(entries) || humanizeKey(key));
}

const availableSlugs = fs.readdirSync(LANG_DIR)
  .filter((file) => file.endsWith('.js') && !file.startsWith('.'))
  .map((file) => file.replace(/\.js$/, ''))
  .sort();
if (requestedSlug && !availableSlugs.includes(requestedSlug)) {
  console.error(`Unknown language slug: ${requestedSlug}`);
  process.exit(2);
}
const slugs = requestedSlug ? [requestedSlug] : availableSlugs;

if (fs.readFileSync(UI_FILE, 'utf8') !== fs.readFileSync(UI_MIRROR_FILE, 'utf8')) errors.push('ui_strings.js: root/public mirror drift');
for (const slug of slugs) {
  const rootFile = path.join(LANG_DIR, `${slug}.js`);
  const mirrorFile = path.join(LANG_MIRROR_DIR, `${slug}.js`);
  if (!fs.existsSync(mirrorFile)) errors.push(`${slug}: deploy mirror missing`);
  else if (fs.readFileSync(rootFile, 'utf8') !== fs.readFileSync(mirrorFile, 'utf8')) errors.push(`${slug}: root/public mirror drift`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const targetKeys = [...values.keys()];
let packMissing = 0;
let packsWritten = 0;
if (APPLY && targetKeys.length) {
  for (const [key, value] of values) setDeep(ui, key, value);
  writeJsonPair(UI_FILE, UI_MIRROR_FILE, ui);
}
for (const slug of slugs) {
  const rootFile = path.join(LANG_DIR, `${slug}.js`);
  const pack = readJson(rootFile);
  const missing = targetKeys.filter((key) => {
    const current = getDeep(pack, key);
    return current === undefined || current === null || (typeof current === 'string' && !current.trim());
  });
  packMissing += missing.length;
  if (APPLY && missing.length) {
    for (const key of missing) setDeep(pack, key, values.get(key));
    writeJsonPair(rootFile, path.join(LANG_MIRROR_DIR, `${slug}.js`), pack);
    packsWritten += 1;
  }
}

console.log(`reconcile_literal_fallback_registry: ${targetKeys.length} source leaf(s) to add; ${slugs.length} pack(s)`);
console.log(`  Pack leaves missing before apply: ${packMissing}`);
console.log(`  Conflicting fallback candidates: ${conflicts.length}`);
if (conflicts.length) console.log(`    conflict sample: ${conflicts.slice(0, 8).map((item) => item.key).join(', ')}`);
console.log(APPLY
  ? `  Added ${targetKeys.length} source leaves and updated ${packsWritten} pack mirror pair(s).`
  : '  Dry run only; pass --apply to register source leaves and fill missing pack leaves.');

if (GATE && !APPLY && (targetKeys.length || packMissing)) {
  console.error(`reconcile_literal_fallback_registry: gate failed with ${targetKeys.length} source and ${packMissing} pack leaves pending; run with --apply first.`);
  process.exit(1);
}
