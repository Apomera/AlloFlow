#!/usr/bin/env node
// =============================================================================
// dev-tools/school_rewards_portal_catalogue.cjs
//
// Keeps the School Rewards portal catalogue in step with the source.
//
// The catalogue was first built by driving the portal in a browser and reading
// what was on screen. That can only ever see text at rest. Everything a person
// meets AFTER an action — the portal's status notices, its confirm and prompt
// dialogs, and the repository's error messages — is invisible to that method,
// which is why it was all still English after the first pass.
//
// This script reads those strings out of the source instead, and adds any that
// the catalogue is missing. It is idempotent: run it after editing Portal.html
// or Code.gs and it reports what it added.
//
// Usage:
//   node dev-tools/school_rewards_portal_catalogue.cjs             # report only
//   node dev-tools/school_rewards_portal_catalogue.cjs --write     # portal text
//   node dev-tools/school_rewards_portal_catalogue.cjs --write --include=server
//
// "server" additionally pulls the repository's user-facing error messages.
// Messages the portal already replaces with one plain sentence (integrity,
// journal, mail plumbing) are deliberately left out: a user never sees them.
// =============================================================================

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PKG = path.join(ROOT, 'apps_script', 'school_rewards');
const argv = process.argv.slice(2);
const WRITE = argv.includes('--write');
const INCLUDE_SERVER = argv.some((a) => a === '--include=server' || a === '--include=all');

const portal = fs.readFileSync(path.join(PKG, 'Portal.html'), 'utf8');
const script = portal.slice(portal.indexOf('<script>'));
const gs = fs.readFileSync(path.join(PKG, 'Code.gs'), 'utf8');
const cataloguePath = path.join(PKG, 'portal_strings.json');
const catalogue = JSON.parse(fs.readFileSync(cataloguePath, 'utf8'));

function hash(value) {
  let h = 2166136261;
  for (const ch of String(value)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
function keyFor(english) {
  const stem = String(english).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '').slice(0, 58) || 'copy';
  return `${stem}_${hash(english)}`;
}

const known = new Set(Object.values(catalogue.strings));
const patterns = Object.values(catalogue.patterns).map((p) => new RegExp(p.match));
const covered = (t) => known.has(t) || patterns.some((re) => re.test(t));

// A literal the code concatenates with a value ("Award to " + n + " students")
// can never be matched by a dictionary keyed on the rendered English. Those are
// reported so the call site can be given a placeholder instead.
const fragment = (t) => /\s$/.test(t)
  || (!/[.!?:)\]]$/.test(t.trim()) && /\b(and|to|of|than|the|a|in|for|with|is|are|up|item)\s*$/i.test(t));

// The source is read as text, so a literal still holds its escape sequences.
// The catalogue must hold the string as it will RENDER, or the entry can never
// match at runtime and the translation is silently dead.
function decode(raw) {
  return String(raw)
    .replace(/\\u([0-9a-fA-F]{4})/g, (m, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\n/g, '\n').replace(/\\t/g, '\t')
    .replace(/\\'/g, "'").replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}
const literals = (source, re) => [...new Set([...source.matchAll(re)]
  .map((m) => decode(m[m.length - 1]))
  .filter((t) => /[A-Za-z]{3}/.test(t)))];

const notices = literals(script, /notice\('((?:[^'\\]|\\.)*)'/g);
const savedResults = literals(script, /(?:reload|reloadAfterConfirmedSave)\('((?:[^'\\]|\\.)*)'/g);
const dialogs = literals(script, /(?:confirmT|promptT|window\.(?:confirm|prompt))\('((?:[^'\\]|\\.)*)'/g);
// Messages that carry a value are written as one sentence with numbered slots
// and filled by fmt(), so the whole sentence is what gets translated.
const templates = literals(script, /\bfmt\('((?:[^'\\]|\\.)*)'/g);
// Content that must never reach a translator: the CSV column names the roster
// importer matches literally, the example rows, machine identifiers, and the
// language menu, whose options are deliberately shown in their own language.
const DENY = new Set([
  'firstName', 'lastInitial', 'grade', 'homeroom', 'email',
  'alloflow-sis-roster/1', '.alloflow-print.json', '2026-T1-week-10',
  'Ava', 'Mateo', 'ava.r@yourschool.example', 'mateo.l@yourschool.example',
  'District records request 2026-114',
  // Rendered with a count, so the bare label would never match.
  'Review unresolved receipts',
]);
// Static markup was only ever covered by a one-off browser run, so a new card
// added by hand would ship untranslated. Reading it here closes that gap.
const markup = portal.slice(portal.indexOf('<main class="shell">'), portal.indexOf('<script>'))
  .replace(/<select id="lang-select"[\s\S]*?<\/select>/g, '');
const markupText = [...new Set([
  ...[...markup.matchAll(/>([^<>{}]{3,})</g)].map((m) => m[1]),
  ...[...markup.matchAll(/(?:placeholder|aria-label|title)="([^"]{3,})"/g)].map((m) => m[1]),
])]
  .map((t) => t.replace(/&amp;/g, '&').replace(/&rarr;/g, '→').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim())
  .filter((t) => /[A-Za-z]{3}/.test(t) && !/^[\d\s.,:;%+\-*/()]+$/.test(t));

let server = [];
if (INCLUDE_SERVER) {
  const technical = new RegExp(script.match(/var TECHNICAL=\/(.*?)\/i;/)[1], 'i');
  server = literals(gs, /srError_\('[a-z_]+', '((?:[^'\\]|\\.)*)'/g).filter((t) => !technical.test(t));
}

const candidates = [...notices, ...savedResults, ...dialogs, ...templates, ...markupText, ...server];
const missing = candidates.filter((t) => !covered(t) && !fragment(t) && !DENY.has(t) && !/@[a-z]+\./i.test(t));
const fragments = candidates.filter((t) => !covered(t) && fragment(t));

console.log('portal notices        ' + notices.length);
console.log('portal dialogs        ' + dialogs.length);
console.log('filled templates      ' + templates.length);
console.log('static markup        ' + markupText.length);
if (INCLUDE_SERVER) console.log('repository messages   ' + server.length);
console.log('missing from catalogue ' + missing.length);
if (fragments.length) {
  console.log('\nconcatenated fragments (give the call site a placeholder instead of adding these):');
  fragments.forEach((f) => console.log('  ' + JSON.stringify(f)));
}

if (!WRITE) {
  if (missing.length) { console.log('\nrun with --write to add them'); missing.slice(0, 10).forEach((m) => console.log('  ' + JSON.stringify(m))); }
  process.exit(0);
}
if (!missing.length) { console.log('\nnothing to add'); process.exit(0); }

for (const english of missing) catalogue.strings[keyFor(english)] = english;
catalogue.strings = Object.fromEntries(Object.entries(catalogue.strings).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(cataloguePath, JSON.stringify(catalogue, null, 2) + '\n');
console.log('\nadded ' + missing.length + ' entries. Translate them, then run node _build_school_rewards_i18n.js');
