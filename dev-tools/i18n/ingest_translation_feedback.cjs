#!/usr/bin/env node
// ingest_translation_feedback.cjs — turn user-submitted translation corrections into reviewable patches.
//
// The in-app translation-feedback flow (translation_feedback_module.js) sends each suggestion through
// the SAME Google Form as bug reports, with a machine-parseable block in the "What happened?" field:
//
//   [AlloFlow Translation Correction]
//   language: Greek
//   key: help_mode.pdf_audit_view_web_audit_btn
//   current: <current value>
//   suggested: <user's correction>
//   english: <english source>
//
// This reads a CSV export of the form's responses Sheet, extracts those blocks, validates each against
// the same guards the automated passes use (key exists, placeholder/tag integrity, no new Spanglish,
// target-script sanity), and writes per-pack patch files + a triage report — exactly the "sent like a
// bug fix" loop. It does NOT auto-write into lang/*; a human reviews the patch, then:
//     node dev-tools/i18n/ingest_translation_feedback.cjs <responses.csv>            # triage (dry)
//     node dev-tools/i18n/ingest_translation_feedback.cjs <responses.csv> --apply    # apply ACCEPTED only
//
// Patches land in dev-tools/i18n/feedback_patches/<slug>.json. Accepted = key resolved + all guards pass.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const csvPath = args.find(a => !a.startsWith('--'));
if (!csvPath) { console.error('Usage: ingest_translation_feedback.cjs <responses.csv> [--apply]'); process.exit(2); }

// ── language display-name → pack slug (extend as needed; unknown names are flagged, not guessed) ──
const NAME_TO_SLUG = {
  'english':null, // English is the source — corrections to English go to ui_strings.js (manual)
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

// ── minimal CSV parser (handles quotes + embedded newlines/commas) ──
function parseCSV(text) {
  const rows = []; let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += c; }
    else { if (c === '"') q = true; else if (c === ',') { row.push(field); field = ''; } else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; } else if (c === '\r') { } else field += c; }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function parseBlock(cell) {
  if (!cell || cell.indexOf('[AlloFlow Translation Correction]') === -1) return null;
  const get = (label) => { const m = cell.match(new RegExp('^' + label + ':\\s*([\\s\\S]*?)(?=\\n[a-z]+:\\s|$)', 'm')); return m ? m[1].trim() : ''; };
  return { language: get('language'), key: get('key'), current: get('current'), suggested: get('suggested'), english: get('english') };
}

const raw = fs.readFileSync(csvPath, 'utf8');
const rows = parseCSV(raw);
const blocks = [];
for (const r of rows) for (const cell of r) { const b = parseBlock(cell); if (b && b.suggested) { blocks.push(b); break; } }

const accepted = {}; // slug -> {key: suggested}
const review = [];
for (const b of blocks) {
  const langKey = (b.language || '').trim().toLowerCase();
  const slug = Object.prototype.hasOwnProperty.call(NAME_TO_SLUG, langKey) ? NAME_TO_SLUG[langKey] : undefined;
  const rec = { ...b, slug };
  if (slug === undefined) { rec.reason = 'unknown language "' + b.language + '" — add to NAME_TO_SLUG'; review.push(rec); continue; }
  if (slug === null) { rec.reason = 'English source correction → edit ui_strings.js manually'; review.push(rec); continue; }
  const langPath = path.join(ROOT, 'lang', slug + '.js');
  if (!fs.existsSync(langPath)) { rec.reason = 'no lang/' + slug + '.js'; review.push(rec); continue; }
  let key = b.key && b.key.indexOf('(') !== 0 ? b.key.trim() : '';
  if (!key) { rec.reason = 'no key — match the "current" text to a key by hand'; review.push(rec); continue; }
  if (en[key] === undefined) { rec.reason = 'key not in ui_strings.js: ' + key; review.push(rec); continue; }
  if (PH(b.suggested) !== PH(en[key])) { rec.reason = 'placeholder/tag mismatch (expected ' + (PH(en[key]) || 'none') + ')'; review.push(rec); continue; }
  if (b.suggested === en[key]) { rec.reason = 'suggestion equals English source (no-op?)'; review.push(rec); continue; }
  if (markerCount(b.suggested) >= 2) { rec.reason = 'suggestion still contains English structural words'; review.push(rec); continue; }
  // passed all guards
  (accepted[slug] = accepted[slug] || {})[key] = b.suggested;
}

const acceptCount = Object.values(accepted).reduce((a, o) => a + Object.keys(o).length, 0);
console.log('=== Translation feedback ingest ===');
console.log('blocks found: ' + blocks.length + '  |  accepted: ' + acceptCount + ' across ' + Object.keys(accepted).length + ' packs  |  needs review: ' + review.length);

const OUT = path.join(__dirname, 'feedback_patches');
if (acceptCount) {
  fs.mkdirSync(OUT, { recursive: true });
  for (const slug of Object.keys(accepted)) fs.writeFileSync(path.join(OUT, slug + '.json'), JSON.stringify(accepted[slug], null, 1));
  console.log('\nACCEPTED patches written to dev-tools/i18n/feedback_patches/:');
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
    let n = 0;
    for (const [k, v] of Object.entries(accepted[slug])) { setNested(pack, k, v); n++; applied++; }
    fs.writeFileSync(langPath, JSON.stringify(pack, null, 2) + '\n');
    console.log('  applied ' + n + ' → lang/' + slug + '.js');
  }
  console.log('\nAPPLIED ' + applied + ' correction(s). Run: node dev-tools/check_lang_json.cjs && node dev-tools/i18n/check_safety_string_spanglish.cjs');
} else if (acceptCount) {
  console.log('\n(dry-run — review the patches, then re-run with --apply to write the ACCEPTED set)');
}
