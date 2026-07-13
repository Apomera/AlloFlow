#!/usr/bin/env node
// ingest_translation_feedback.cjs — turn user-submitted translation corrections into reviewable
// patches, then apply the accepted ones to lang/*. The "sent like a bug fix → validated → applied" loop.
//
// TWO input sources (the in-app flow can use either backend):
//   1. Cloudflare Worker → GitHub (preferred, matches the community-lesson flow): the worker's
//      /submitTranslation route commits one record per correction to translations/pending/*.json
//      (record: {language,key,current,suggested,english,note,submitter,pii_scan,...}). This tool
//      reads that directory (default), validates, and on --apply writes accepted fixes into
//      lang/<slug>.js and MOVES the applied record files to translations/applied/.
//   2. Google Form CSV (fallback): pass a .csv export of the form's responses Sheet; the tool
//      parses the [AlloFlow Translation Correction] blocks out of the cells.
//
// Validation (same guards the automated passes use): language→slug map, key exists in ui_strings,
// placeholder/tag integrity, no-new-Spanglish, no-op detection. Accepted = all guards pass.
//
// Usage:
//   node dev-tools/i18n/ingest_translation_feedback.cjs                 # read translations/pending/ (dry)
//   node dev-tools/i18n/ingest_translation_feedback.cjs --apply         # apply accepted + move to applied/
//   node dev-tools/i18n/ingest_translation_feedback.cjs responses.csv   # CSV mode (dry)
//   node dev-tools/i18n/ingest_translation_feedback.cjs <dir> [--apply]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const inputArg = args.find(a => !a.startsWith('--'));
const PENDING_DIR = path.join(ROOT, 'translations', 'pending');
const APPLIED_DIR = path.join(ROOT, 'translations', 'applied');

const NAME_TO_SLUG = {
  'english':null,
  'spanish':'spanish_latin_america','español':'spanish_latin_america','spanish (latin america)':'spanish_latin_america',
  'spanish (spain)':'spanish_castilian','castilian':'spanish_castilian',
  'french':'french','français':'french','french (canada)':'french_canadian',
  'german':'german','deutsch':'german','italian':'italian','italiano':'italian',
  'portuguese':'portuguese_brazil','português':'portuguese_brazil','portuguese (portugal)':'portuguese_portugal','portuguese (angola)':'portuguese_angola',
  'russian':'russian','polish':'polish','ukrainian':'ukrainian','greek':'greek','ελληνικά':'greek','romanian':'romanian',
  'chinese':'chinese_simplified','chinese (simplified)':'chinese_simplified','中文':'chinese_simplified','chinese (traditional)':'chinese_traditional',
  'japanese':'japanese','日本語':'japanese','korean':'korean','한국어':'korean','vietnamese':'vietnamese','tiếng việt':'vietnamese',
  'thai':'thai','indonesian':'indonesian','tagalog':'tagalog','filipino':'tagalog','hindi':'hindi','bengali':'bengali',
  'tamil':'tamil','telugu':'telugu','punjabi':'punjabi','nepali':'nepali','urdu':'urdu','arabic':'arabic','العربية':'arabic',
  'hebrew':'hebrew','farsi':'farsi','persian':'farsi','dari':'dari','pashto':'pashto','swahili':'swahili','hausa':'hausa',
  'yoruba':'yoruba','igbo':'igbo','amharic':'amharic','tigrinya':'tigrinya','somali':'somali','lingala':'lingala',
  'kinyarwanda':'kinyarwanda','kirundi':'kirundi','khmer':'khmer','burmese':'burmese','hmong':'hmong','haitian creole':'haitian_creole','kreyòl':'haitian_creole','latin':'latin',
};

const flatten = (o, p = '') => { const r = {}; for (const [k, v] of Object.entries(o)) { const f = p ? p + '.' + k : k; if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(r, flatten(v, f)); else if (typeof v === 'string') r[f] = v; } return r; };
const UI = JSON.parse(fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8').replace(/^[^{]*/, '').replace(/;?\s*$/, ''));
const en = flatten(UI);
const PH = s => (s.match(/\{[^}]+\}|<[^>]+>|%[sd]/g) || []).sort().join('|');
const STRUCT = new Set('this that with cannot recovered both front back your existing imported letter sequence something decoration please smaller companion could would should been into their which while about these those available was were does did remind discarded empty supported unsupported missing lost denied allow'.split(' '));
const markerCount = s => s.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean).filter(t => STRUCT.has(t)).length;

function parseCSV(text) {
  const rows = []; let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += c; }
    else { if (c === '"') q = true; else if (c === ',') { row.push(field); field = ''; } else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; } else if (c === '\r') {} else field += c; } }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}
function parseBlock(cell) {
  if (!cell || cell.indexOf('[AlloFlow Translation Correction]') === -1) return null;
  const get = (label) => { const m = cell.match(new RegExp('^' + label + ':\\s*([\\s\\S]*?)(?=\\n[a-z]+:\\s|$)', 'm')); return m ? m[1].trim() : ''; };
  return { language: get('language'), key: get('key'), current: get('current'), suggested: get('suggested'), english: get('english') };
}

// ── load corrections from either a dir of JSON records or a CSV export ──
let blocks = [];
let mode;
if (inputArg && inputArg.toLowerCase().endsWith('.csv')) {
  mode = 'csv';
  const rows = parseCSV(fs.readFileSync(inputArg, 'utf8'));
  for (const r of rows) for (const cell of r) { const b = parseBlock(cell); if (b && b.suggested) { blocks.push(b); break; } }
} else {
  mode = 'dir';
  const dir = inputArg || PENDING_DIR;
  if (!fs.existsSync(dir)) { console.log('No corrections to ingest (' + path.relative(ROOT, dir) + ' not found / empty).'); process.exit(0); }
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json'))) {
    try { const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      if (r && r.suggested) blocks.push({ language: r.language, key: r.key, current: r.current, suggested: r.suggested, english: r.english, _file: f, _dir: dir }); }
    catch (e) { console.log('  (skipping unreadable ' + f + ': ' + e.message + ')'); }
  }
}

const accepted = {};        // slug -> {key: suggested}
const acceptedFiles = [];   // {file, dir} of records that were accepted (dir mode)
const review = [];
for (const b of blocks) {
  const langKey = (b.language || '').trim().toLowerCase();
  const slug = Object.prototype.hasOwnProperty.call(NAME_TO_SLUG, langKey) ? NAME_TO_SLUG[langKey] : undefined;
  const rec = Object.assign({}, b);
  const flag = (reason) => { rec.reason = reason; review.push(rec); };
  if (slug === undefined) { flag('unknown language "' + b.language + '" — add to NAME_TO_SLUG'); continue; }
  if (slug === null) { flag('English source correction → edit ui_strings.js manually'); continue; }
  if (!fs.existsSync(path.join(ROOT, 'lang', slug + '.js'))) { flag('no lang/' + slug + '.js'); continue; }
  const key = b.key && b.key.indexOf('(') !== 0 ? b.key.trim() : '';
  if (!key) { flag('no key — match the "current" text to a key by hand'); continue; }
  if (en[key] === undefined) { flag('key not in ui_strings.js: ' + key); continue; }
  if (PH(b.suggested) !== PH(en[key])) { flag('placeholder/tag mismatch (expected ' + (PH(en[key]) || 'none') + ')'); continue; }
  if (b.suggested === en[key]) { flag('suggestion equals English source (no-op?)'); continue; }
  if (markerCount(b.suggested) >= 2) { flag('suggestion still contains English structural words'); continue; }
  (accepted[slug] = accepted[slug] || {})[key] = b.suggested;
  if (b._file) acceptedFiles.push({ file: b._file, dir: b._dir });
}

const acceptCount = Object.values(accepted).reduce((a, o) => a + Object.keys(o).length, 0);
console.log('=== Translation feedback ingest (' + mode + ' mode) ===');
console.log('corrections found: ' + blocks.length + '  |  accepted: ' + acceptCount + ' across ' + Object.keys(accepted).length + ' packs  |  needs review: ' + review.length);

const OUT = path.join(__dirname, 'feedback_patches');
if (acceptCount) {
  fs.mkdirSync(OUT, { recursive: true });
  for (const slug of Object.keys(accepted)) fs.writeFileSync(path.join(OUT, slug + '.json'), JSON.stringify(accepted[slug], null, 1));
  console.log('\nACCEPTED patches → dev-tools/i18n/feedback_patches/:');
  for (const slug of Object.keys(accepted)) console.log('  ' + slug + ': ' + Object.keys(accepted[slug]).length + ' key(s)');
}
if (review.length) {
  console.log('\nNEEDS REVIEW (not applied):');
  review.slice(0, 40).forEach(r => console.log('  [' + (r.language || '?') + '] ' + (r.key || '(no key)') + ' — ' + r.reason));
  if (review.length > 40) console.log('  +' + (review.length - 40) + ' more');
}

if (APPLY && acceptCount) {
  const setNested = (o, d, v) => { const p = d.split('.'); let x = o; for (let i = 0; i < p.length - 1; i++) { if (typeof x[p[i]] !== 'object' || x[p[i]] === null) x[p[i]] = {}; x = x[p[i]]; } x[p[p.length - 1]] = v; };
  let applied = 0;
  for (const slug of Object.keys(accepted)) {
    const langPath = path.join(ROOT, 'lang', slug + '.js');
    const pack = JSON.parse(fs.readFileSync(langPath, 'utf8'));
    for (const [k, v] of Object.entries(accepted[slug])) { setNested(pack, k, v); applied++; }
    fs.writeFileSync(langPath, JSON.stringify(pack, null, 2) + '\n');
    console.log('  applied ' + Object.keys(accepted[slug]).length + ' → lang/' + slug + '.js');
  }
  if (acceptedFiles.length) {
    fs.mkdirSync(APPLIED_DIR, { recursive: true });
    for (const a of acceptedFiles) { try { fs.renameSync(path.join(a.dir, a.file), path.join(APPLIED_DIR, a.file)); } catch (_) {} }
    console.log('  moved ' + acceptedFiles.length + ' record(s) → translations/applied/');
  }
  console.log('\nAPPLIED ' + applied + ' correction(s). Next: node dev-tools/check_lang_json.cjs && node dev-tools/i18n/check_safety_string_spanglish.cjs, then commit lang/ + translations/.');
} else if (acceptCount) {
  console.log('\n(dry-run — review the patches, then re-run with --apply to write accepted + archive records)');
}
