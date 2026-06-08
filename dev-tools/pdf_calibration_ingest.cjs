#!/usr/bin/env node
/**
 * pdf_calibration_ingest.cjs — friction-free way to add an expert-scored PDF to the
 * calibration corpus (tests/fixtures/pdf_calibration/manifest.json) without hand-editing JSON.
 *
 * The calibration corpus answers "is AlloFlow's PDF score actually right?" by comparing it to a
 * REAL ground-truth score (a WCAG reviewer's verdict, or a PAC 2024 / veraPDF result). This tool
 * does NOT invent any scores — you supply the expert number you read off the tool/your judgement,
 * plus the AI / axe numbers from AlloFlow's results panel. It just validates + writes the JSON and
 * tells you when the harness will activate (>= 3 scored PDFs).
 *
 * USAGE (direct — always reliable):
 *   node dev-tools/pdf_calibration_ingest.cjs \
 *     --id scanned-iep-packet --file scanned-iep-packet.pdf \
 *     --expert 62 --source PAC2024 \
 *     --ai 88 --axe 95 [--blended 92] [--notes "AlloFlow over-scored; PAC failed the tag tree"]
 *
 * USAGE (auto-derive the expert score from a veraPDF JSON report — best-effort convenience):
 *   verapdf --format json mydoc.pdf > report.json
 *   node dev-tools/pdf_calibration_ingest.cjs --id mydoc --file mydoc.pdf \
 *     --verapdf report.json --ai 88 --axe 95
 *
 * Flags: --manifest <path> (override target), --dry-run (print, don't write), --help.
 */
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const a = {};
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--dry-run') { a.dryRun = true; continue; }
    if (t === '--help' || t === '-h') { a.help = true; continue; }
    if (t.startsWith('--')) { a[t.slice(2)] = argv[i + 1]; i++; }
  }
  return a;
}

function fail(msg) { console.error('ERROR: ' + msg); process.exit(1); }

function num(v, name) {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100) fail(`${name} must be a number 0-100 (got "${v}")`);
  return n;
}

// Best-effort veraPDF JSON → 0-100 expert score. veraPDF field names vary across versions, so this
// is defensive: it walks for a validationResult with compliant + passed/failed check counts. On any
// uncertainty it bails and tells you to pass --expert directly (never guesses silently).
function scoreFromVeraPdf(jsonPath) {
  let raw;
  try { raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); }
  catch (e) { fail(`could not read/parse veraPDF JSON at ${jsonPath}: ${e.message}`); }
  // Find the first object that looks like a validation result.
  let vr = null;
  (function walk(o) {
    if (vr || !o || typeof o !== 'object') return;
    const hasCompliant = typeof o.compliant === 'boolean' || typeof o.isCompliant === 'boolean';
    const d = o.details || o;
    const hasCounts = d && (Number.isFinite(d.passedChecks) || Number.isFinite(d.failedChecks));
    if (hasCompliant && hasCounts) { vr = { compliant: o.compliant ?? o.isCompliant, passed: d.passedChecks || 0, failed: d.failedChecks || 0 }; return; }
    for (const k of Object.keys(o)) walk(o[k]);
  })(raw);
  if (!vr) fail('could not locate a validationResult (compliant + passed/failed checks) in the veraPDF JSON — pass --expert <0-100> --source veraPDF directly instead.');
  const total = vr.passed + vr.failed;
  // Compliant => high (PDF/UA-1 conformant). Else: pass-rate, capped below 90 so a failing doc
  // can never look "excellent". This is a transparent heuristic; the human can override with --expert.
  const score = vr.compliant ? Math.max(90, Math.round(100 * (total ? vr.passed / total : 1)))
                             : Math.min(89, Math.round(100 * (total ? vr.passed / total : 0)));
  console.log(`[verapdf] compliant=${vr.compliant} passed=${vr.passed} failed=${vr.failed} -> expertScore=${score}`);
  return score;
}

const args = parseArgs(process.argv);
if (args.help) { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, 24).join('\n')); process.exit(0); }

const manifestPath = args.manifest
  ? path.resolve(args.manifest)
  : path.resolve(__dirname, '../tests/fixtures/pdf_calibration/manifest.json');

if (!args.id) fail('--id <slug> is required');
const ai = num(args.ai, '--ai');
const axe = num(args.axe, '--axe');
if (ai === undefined || axe === undefined) fail('--ai <0-100> and --axe <0-100> (from AlloFlow\'s results panel) are required');

let expert, source;
if (args.verapdf) { expert = scoreFromVeraPdf(args.verapdf); source = 'veraPDF'; }
else { expert = num(args.expert, '--expert'); source = args.source; }
if (expert === undefined) fail('provide --expert <0-100> --source <PAC2024|veraPDF|human-WCAG>, or --verapdf <report.json>');
if (!source) fail('--source <PAC2024|veraPDF|human-WCAG> is required with --expert');

const blended = num(args.blended, '--blended');
const entry = {
  id: String(args.id),
  file: args.file || (String(args.id) + '.pdf'),
  expertScore: expert,
  expertSource: source,
  alloflowAiScore: ai,
  alloflowAxeScore: axe,
  alloflowBlendedScore: blended !== undefined ? blended : Math.round((ai + axe) / 2),
  notes: args.notes || '',
};

let manifest;
try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
catch (e) { fail(`could not read manifest at ${manifestPath}: ${e.message}`); }
if (!Array.isArray(manifest.entries)) manifest.entries = [];
if (manifest.entries.some(e => e && e.id === entry.id)) fail(`an entry with id "${entry.id}" already exists — pick a unique id (or remove the old one).`);

manifest.entries.push(entry);

if (args.dryRun) {
  console.log('[dry-run] would append:\n' + JSON.stringify(entry, null, 2));
  process.exit(0);
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
const scored = manifest.entries.filter(e => e && Number.isFinite(e.expertScore) && Number.isFinite(e.alloflowAiScore) && Number.isFinite(e.alloflowAxeScore)).length;
console.log(`✓ added "${entry.id}" (expert ${expert} via ${source} | AlloFlow ai ${ai}/axe ${axe}/blended ${entry.alloflowBlendedScore}).`);
console.log(`  corpus now has ${scored} fully-scored PDF(s).` + (scored >= 3
  ? ' The calibration harness is ACTIVE — run: npx vitest run tests/pdf_score_calibration.test.js'
  : ` ${3 - scored} more needed before the harness activates.`));
