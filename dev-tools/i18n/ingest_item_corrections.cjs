#!/usr/bin/env node
// ingest_item_corrections.cjs — triage community-submitted Test Prep item corrections.
//
// The in-app "Suggest a correction" button (item_correction_module.js) posts to the Cloudflare
// worker's /submitItemCorrection route, which commits one record per correction to
// item_corrections/pending/*.json. This tool reads that directory and prints a reviewable digest
// grouped by pack, with the item's current content pulled from test_prep/<pack>_items.json for
// side-by-side comparison, and re-flags any PII the worker's server-side scan caught.
//
// DELIBERATELY read-only: unlike translation corrections (which are mechanically validated against
// ui_strings and safely applied), a practice-item correction can change a KEYED ANSWER. Applying
// that is exactly the licensed-professional/psychometric judgment the packs are candidly waiting
// on — it must be a human decision, per item. So this tool surfaces + organizes; it never mutates
// a pack. Accepted fixes are applied by hand (or a future, per-item, human-in-the-loop apply step),
// then the record is moved to item_corrections/applied/.
//
// Usage:
//   node dev-tools/i18n/ingest_item_corrections.cjs                 # read item_corrections/pending/ (digest)
//   node dev-tools/i18n/ingest_item_corrections.cjs <dir>           # read a specific directory
//   node dev-tools/i18n/ingest_item_corrections.cjs --json          # machine-readable digest
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2);
const AS_JSON = args.includes('--json');
const inputArg = args.find((a) => !a.startsWith('--'));
const PENDING_DIR = inputArg ? path.resolve(inputArg) : path.join(ROOT, 'item_corrections', 'pending');

const KINDS = ['wrong-answer', 'ambiguous', 'weak-distractor', 'outdated', 'not-exam-item', 'typo', 'other'];

function readItemsFor(packId) {
  // pack id → items file. Map the registry id to the on-disk stem where they differ.
  const stem = packId.replace(/^praxis-/, '').replace(/-/g, '_');
  const candidates = [
    path.join(ROOT, 'test_prep', stem + '_items.json'),
    path.join(ROOT, 'test_prep', packId.replace(/-/g, '_') + '_items.json'),
  ];
  for (const f of candidates) {
    if (fs.existsSync(f)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(f, 'utf8'));
        const arr = Array.isArray(parsed) ? parsed : parsed.items;
        return new Map((arr || []).map((it) => [it.id, it]));
      } catch (_) { /* fall through */ }
    }
  }
  return null;
}

function loadRecords(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((n) => n.endsWith('.json'))
    .map((n) => {
      try { return { file: n, rec: JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8')) }; }
      catch (e) { return { file: n, rec: null, error: e.message }; }
    });
}

function validate(rec) {
  const problems = [];
  if (!rec || typeof rec !== 'object') return ['not an object'];
  if (rec.kind !== 'item_correction') problems.push('kind is not "item_correction"');
  if (!rec.pack_id) problems.push('missing pack_id');
  if (!rec.suggested) problems.push('missing suggested');
  const kindId = String(rec.problem_kind || '').split(' ')[0];
  if (!KINDS.includes(kindId)) problems.push('problem_kind not in allowlist: ' + rec.problem_kind);
  return problems;
}

const records = loadRecords(PENDING_DIR);
const byPack = new Map();
let piiCount = 0, invalidCount = 0;

for (const { file, rec, error } of records) {
  if (error || !rec) { invalidCount++; continue; }
  const problems = validate(rec);
  if (problems.length) invalidCount++;
  const findings = (rec.pii_scan && rec.pii_scan.findings) || [];
  if (findings.length) piiCount++;
  const packId = rec.pack_id || '(unknown)';
  if (!byPack.has(packId)) byPack.set(packId, { items: readItemsFor(packId), rows: [] });
  const bucket = byPack.get(packId);
  const item = bucket.items && rec.item_id ? bucket.items.get(rec.item_id) : null;
  bucket.rows.push({ file, rec, problems, findings, item });
}

if (AS_JSON) {
  const out = { pending_dir: PENDING_DIR, total: records.length, invalid: invalidCount, with_pii: piiCount, packs: {} };
  for (const [packId, b] of byPack) {
    out.packs[packId] = b.rows.map((r) => ({
      file: r.file, item_id: r.rec.item_id, review_tier: r.rec.review_tier, problem_kind: r.rec.problem_kind,
      suggested: r.rec.suggested, note: r.rec.note, problems: r.problems, pii: r.findings.map((f) => f.type),
      current_answer: r.item ? r.item.choices[r.item.answerIndex] : (r.rec.current_answer || null),
    }));
  }
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

console.log('=== Test Prep item corrections — pending triage ===');
console.log('  dir: ' + PENDING_DIR);
if (!records.length) {
  console.log('  (no pending corrections)');
  process.exit(0);
}
console.log('  ' + records.length + ' pending · ' + invalidCount + ' malformed · ' + piiCount + ' carry PII the maintainer must redact before any public commit\n');

for (const [packId, b] of byPack) {
  console.log('▶ ' + packId + '  (' + b.rows.length + ' correction' + (b.rows.length === 1 ? '' : 's') + (b.items ? '' : ' — items file not found locally') + ')');
  for (const r of b.rows) {
    console.log('   • [' + (r.rec.problem_kind || '?') + '] ' + (r.rec.item_id || '(no item id)') + '  tier=' + (r.rec.review_tier || '?'));
    if (r.item) console.log('       current answer: ' + JSON.stringify(r.item.choices[r.item.answerIndex]));
    console.log('       suggested: ' + String(r.rec.suggested || '').replace(/\s+/g, ' ').slice(0, 240));
    if (r.rec.note) console.log('       note: ' + String(r.rec.note).replace(/\s+/g, ' ').slice(0, 200));
    if (r.findings.length) console.log('       ⚠ PII flagged: ' + r.findings.map((f) => f.type).join(', ') + ' — redact before committing anywhere public');
    if (r.problems.length) console.log('       ✗ malformed: ' + r.problems.join('; '));
    console.log('       file: ' + r.file);
  }
  console.log('');
}
console.log('Apply an accepted correction by hand (it can change a keyed answer — a human/expert call),');
console.log('then move its record to item_corrections/applied/. This tool never mutates a pack.');
process.exit(0);
