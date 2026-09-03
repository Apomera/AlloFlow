#!/usr/bin/env node
// Build the School Rewards portal language packs.
//
// Why this exists. Every other AlloFlow surface localises through the shared
// t() helper and the 63 lang/*.js packs. The portal cannot: Google serves it
// from the school's own Apps Script project, so it can neither call the app's
// translation function nor read ui_strings.js. It therefore keeps its own
// catalogue in apps_script/school_rewards/portal_strings.json, keyed with the
// repository's own slug + FNV-1a convention so the namespace can be merged
// into ui_strings.js unchanged once that file is free.
//
// This script turns the catalogue plus the per-language sources in
// apps_script/school_rewards/i18n_src/ into:
//
//   apps_script/school_rewards/i18n/<code>.json   runtime pack, keyed by the
//                                                 English text the portal renders
//   apps_script/school_rewards/i18n/index.json    the language menu, with coverage
//   Portal.html  (between the SR_I18N_DATA markers) the embedded English and
//                Spanish packs, so the portal is never worse than it is today
//                when the CDN is unreachable
//   lang/SCHOOL_REWARDS_PORTAL_TRANSLATION_HANDOFF.md  what is left to translate
//
// Both trees are written: the repo root and desktop/web-app/public.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PKG = path.join(ROOT, 'apps_script', 'school_rewards');
const PUBLIC_PKG = path.join(ROOT, 'desktop', 'web-app', 'public', 'apps_script', 'school_rewards');
// Below this, a language is listed but labelled with its coverage, so nobody
// picks a language expecting a translated portal and meets mostly English.
const FULL_ENOUGH = 95;

const catalogue = JSON.parse(fs.readFileSync(path.join(PKG, 'portal_strings.json'), 'utf8'));
const englishFor = (key) => catalogue.strings[key];
const totalEntries = Object.keys(catalogue.strings).length + Object.keys(catalogue.patterns).length;

function readSources() {
  const dir = path.join(PKG, 'i18n_src');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
}

// A translation keeps the English placeholders; {1} becomes the $1 the portal's
// String.replace understands. A pattern whose translation drops or invents a
// placeholder is a bug, not a style choice, so the build refuses it.
function replacementFor(key, english, translated) {
  const used = (english.match(/\{(\d)\}/g) || []).sort().join(',');
  const mine = (translated.match(/\{(\d)\}/g) || []).sort().join(',');
  if (used !== mine) {
    throw new Error(`pattern ${key}: English uses ${used || 'no placeholders'} but the translation uses ${mine || 'none'}`);
  }
  return translated.replace(/\{(\d)\}/g, '$$$1');
}

function buildPack(source) {
  const strings = {};
  let stringHits = 0;
  for (const [key, value] of Object.entries(source.strings || {})) {
    const english = englishFor(key);
    if (!english || typeof value !== 'string' || !value.trim()) continue;
    strings[english] = value;
    stringHits += 1;
  }
  const patterns = [];
  let patternHits = 0;
  for (const [key, value] of Object.entries(source.patterns || {})) {
    const entry = catalogue.patterns[key];
    if (!entry || typeof value !== 'string' || !value.trim()) continue;
    patterns.push([entry.match, replacementFor(key, entry.en, value)]);
    patternHits += 1;
  }
  const coverage = Math.round(((stringHits + patternHits) / totalEntries) * 100);
  return {
    pack: { code: source.code, name: source.name, englishName: source.englishName, coverage, strings, patterns },
    coverage,
    translated: stringHits + patternHits,
  };
}

function write(rel, body) {
  for (const base of [PKG, PUBLIC_PKG]) {
    const target = path.join(base, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, body);
  }
}

const sources = readSources();
const index = [{ code: 'en', name: 'English', englishName: 'English', coverage: 100, entries: totalEntries }];
const packs = {};
for (const source of sources) {
  const { pack, coverage, translated } = buildPack(source);
  packs[source.code] = pack;
  write(path.join('i18n', source.code + '.json'), JSON.stringify(pack) + '\n');
  index.push({ code: pack.code, name: pack.name, englishName: pack.englishName, coverage, entries: translated });
  console.log(`  ${pack.code.padEnd(6)} ${pack.name.padEnd(24)} ${translated}/${totalEntries} (${coverage}%)`);
}
write(path.join('i18n', 'index.json'), JSON.stringify({ version: catalogue.version, total: totalEntries, fullEnough: FULL_ENOUGH, languages: index }) + '\n');

// --- embed English + Spanish in Portal.html --------------------------------
// One derivation: the portal's offline packs are generated from the same data
// files as the published ones, so the two can never drift apart.
const portalPath = path.join(PKG, 'Portal.html');
const original = fs.readFileSync(portalPath, 'utf8');
const crlf = original.includes('\r\n');
let portal = original.replace(/\r\n/g, '\n');
const START = '    /* SR_I18N_DATA_START */\n';
const END = '    /* SR_I18N_DATA_END */';
const from = portal.indexOf(START);
const to = portal.indexOf(END);
if (from === -1 || to === -1) throw new Error('Portal.html is missing the SR_I18N_DATA markers');
const embedded = ['es'].filter((code) => packs[code]);
const packLiteral = embedded.map((code) => JSON.stringify(code) + ':' + JSON.stringify(packs[code].strings)).join(',');
const patternLiteral = embedded.map((code) => JSON.stringify(code) + ':[' + packs[code].patterns.map(([m, r]) => '[new RegExp(' + JSON.stringify(m) + '),' + JSON.stringify(r) + ']').join(',') + ']').join(',');
const meta = index.filter((l) => l.code !== 'en').map((l) => ({ code: l.code, name: l.name, coverage: l.coverage }));
const body = [
  '    // Generated by _build_school_rewards_i18n.js from portal_strings.json',
  '    // and i18n_src/. Do not edit by hand; edit the data files and rebuild.',
  '    var PACKS={' + packLiteral + '};',
  '    var PATTERNS={' + patternLiteral + '};',
  '    var CATALOGUE_TOTAL=' + totalEntries + ',FULL_ENOUGH=' + FULL_ENOUGH + ';',
  '    var LANGUAGES=' + JSON.stringify(meta) + ';',
  '',
].join('\n');
portal = portal.slice(0, from + START.length) + body + portal.slice(to);
fs.writeFileSync(portalPath, crlf ? portal.replace(/\n/g, '\r\n') : portal);
fs.writeFileSync(path.join(PUBLIC_PKG, 'Portal.html'), fs.readFileSync(portalPath));
console.log('  embedded packs in Portal.html:', embedded.join(', ') || 'none');

// --- the repository's accepted language codes -------------------------------
// A student's saved preference is validated in Code.gs, which cannot read this
// index at runtime, so the list is generated here instead of maintained twice.
const codePath = path.join(PKG, 'Code.gs');
const codeOriginal = fs.readFileSync(codePath, 'utf8');
const codeCrlf = codeOriginal.includes('\r\n');
let code = codeOriginal.replace(/\r\n/g, '\n');
const CODE_START = '/* SR_LANGUAGES_START */\n';
const CODE_END = '/* SR_LANGUAGES_END */';
const codeFrom = code.indexOf(CODE_START);
const codeTo = code.indexOf(CODE_END);
if (codeFrom === -1 || codeTo === -1) throw new Error('Code.gs is missing the SR_LANGUAGES markers');
const codeBody = '// Generated by _build_school_rewards_i18n.js. Portal interface languages.\n'
  + '// Balance statement emails exist only in English and Spanish; see statementCopy_.\n'
  + 'var SR_LANGUAGES = [' + index.map((l) => JSON.stringify(l.code)).join(', ') + '];\n';
code = code.slice(0, codeFrom + CODE_START.length) + codeBody + code.slice(codeTo);
fs.writeFileSync(codePath, codeCrlf ? code.replace(/\n/g, '\r\n') : code);
fs.writeFileSync(path.join(PUBLIC_PKG, 'Code.gs'), fs.readFileSync(codePath));
console.log('  Code.gs accepts:', index.map((l) => l.code).join(', '));

// --- translator handoff -----------------------------------------------------
const missing = [];
for (const [key, english] of Object.entries(catalogue.strings)) {
  const done = sources.filter((s) => s.strings && s.strings[key]).map((s) => s.code);
  if (done.length < sources.length) missing.push({ key, english, done });
}
for (const [key, entry] of Object.entries(catalogue.patterns)) {
  const done = sources.filter((s) => s.patterns && s.patterns[key]).map((s) => s.code);
  if (done.length < sources.length) missing.push({ key, english: entry.en, done, pattern: true });
}
const lines = [
  '# School Rewards Portal Translation Handoff',
  '',
  `**As of:** ${new Date().toISOString().slice(0, 10)}`,
  '',
  'The School Rewards portal is the one AlloFlow surface that cannot use the shared',
  'translation helper or the 63 `lang/*.js` packs: Google serves it from the school\'s',
  'own Apps Script project, so it has no access to the app\'s runtime. Its English lives',
  'in `apps_script/school_rewards/portal_strings.json` and each language is a file in',
  '`apps_script/school_rewards/i18n_src/`. Run `node _build_school_rewards_i18n.js` after',
  'editing either.',
  '',
  '## What a translator does',
  '',
  '1. Copy `i18n_src/es.json` to `i18n_src/<code>.json` and set `code`, `name` (the',
  '   language\'s own name, shown in the menu), and `englishName`.',
  '2. Translate the values under `strings`. Keys are shared with the catalogue; the',
  '   English for each key is in `portal_strings.json`.',
  '3. Translate the values under `patterns`. These contain numbered placeholders such',
  '   as `{1}`. Every placeholder in the English must appear in the translation, and',
  '   they may be reordered freely. The build fails if one is dropped or invented.',
  '4. Leave a key out rather than guessing. Missing keys fall back to English at',
  '   runtime, and the language menu shows each language\'s coverage.',
  '',
  '## Do not translate',
  '',
  'School-entered content: prize names, recognition category names, student names,',
  'the school name, and store window names. Those belong to the school.',
  '',
  '## Current coverage',
  '',
  '| Language | Coverage | Entries |',
  '| --- | --- | --- |',
  ...index.map((l) => `| ${l.name} (${l.code}) | ${l.coverage}% | ${l.entries}/${totalEntries} |`),
  '',
  `A language is treated as complete at ${FULL_ENOUGH}% or above; below that the menu`,
  'shows the percentage so nobody chooses a language expecting a translated portal.',
  '',
  '## Not covered by these packs',
  '',
  'Balance statement emails are rendered by `Code.gs`, not the portal, and exist only in',
  'English and Spanish. A student whose portal is set to another language still receives',
  'English email. That is a separate piece of work in `statementCopy_`.',
  '',
  `## Untranslated entries (${missing.length} of ${totalEntries})`,
  '',
  '| Key | English | Have |',
  '| --- | --- | --- |',
  ...missing.map((m) => `| \`${m.key}\` | ${String(m.english).replace(/\|/g, '\\|')}${m.pattern ? ' _(pattern)_' : ''} | ${m.done.join(', ') || 'none'} |`),
  '',
];
fs.writeFileSync(path.join(ROOT, 'lang', 'SCHOOL_REWARDS_PORTAL_TRANSLATION_HANDOFF.md'), lines.join('\n'));
console.log('  handoff: ' + missing.length + ' entries still to translate');
console.log('Built School Rewards portal i18n:', totalEntries, 'catalogue entries,', index.length, 'languages');
