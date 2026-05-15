#!/usr/bin/env node
// check_translation_keys.cjs — Verify every t('foo.bar') and HELP_STRINGS[key]
// consumer call has a matching key in the source-of-truth string registries.
//
// Why this exists:
//   AlloFlow's translation architecture is "EN is the source; other languages
//   translate from EN at runtime via useTranslation(currentUiLanguage)." So a
//   missing EN key means: in English the t() returns the dotted-key string as
//   a fallback (visible-in-UI bug), and translations to other languages can't
//   produce a meaningful translation either (cascading bug).
//
//   This check catches the bug class where:
//   - A developer adds a new t('foo.bar.baz') call but forgets to add the key
//     to ui_strings.js. The UI silently shows the literal "foo.bar.baz" string.
//   - A key gets renamed in ui_strings.js but consumers still reference the
//     old name.
//   - HELP_STRINGS[key] tooltips have keys defined in callers that don't
//     exist in help_strings.js.
//
// What it does:
//   1. Parse ui_strings.js + help_strings.js as JSON. Extract all defined keys
//      (flatten ui_strings.js's nested namespaces into 'ns.subkey' form).
//   2. Scan AlloFlowANTI.txt + all CDN modules for `t('key.path')` calls.
//   3. Scan for HELP_STRINGS[...] lookups (literal strings only — dynamic
//      keys are flagged informationally).
//   4. Report keys consumed but not defined.
//
// Usage:
//   node dev-tools/check_translation_keys.cjs
//   node dev-tools/check_translation_keys.cjs --verbose   (list defined keys too)
//
// Exit codes:
//   0 — all consumer keys resolve to defined strings
//   1 — at least one missing key
//   2 — usage error / required file not found

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const UI_STRINGS = path.join(ROOT, 'ui_strings.js');
const HELP_STRINGS = path.join(ROOT, 'help_strings.js');
const HOST = path.join(ROOT, 'AlloFlowANTI.txt');

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const QUIET = args.includes('--quiet');

for (const f of [UI_STRINGS, HELP_STRINGS, HOST]) {
  if (!fs.existsSync(f)) {
    console.error('Required file not found: ' + f);
    process.exit(2);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Allowlist — known-dynamic keys that legitimately can't be statically resolved.
// Each entry should include a comment explaining why.
// ──────────────────────────────────────────────────────────────────────────
const ALLOW_MISSING_T = new Set([
  // Add entries here as `'foo.bar': 'reason'` pairs only when proven to be
  // dynamic-by-design (e.g., a key like `casel.${competency}` where the
  // suffix varies at runtime).
]);

// Patterns where t() takes a dynamic key (template literal or variable).
// Calls matching these are reported as "dynamic" not "missing."
const DYNAMIC_T_PATTERNS = [
  /t\(\s*`/,            // template literal
  /t\(\s*[a-z_$][\w$]*\s*[,)]/,  // bare variable (e.g., t(foo))
  /t\(\s*\([^)]*\?/,    // ternary expression
];

// ──────────────────────────────────────────────────────────────────────────
// Parse ui_strings.js: nested object → flat 'ns.subkey' set
// ──────────────────────────────────────────────────────────────────────────
function flattenKeys(obj, prefix = '') {
  const keys = new Set();
  for (const k of Object.keys(obj)) {
    const fullKey = prefix ? prefix + '.' + k : k;
    if (obj[k] && typeof obj[k] === 'object' && !Array.isArray(obj[k])) {
      // Also count the parent path itself — consumers can request the whole
      // sub-object via `t('foo.bar', { returnObjects: true })` (i18next pattern).
      keys.add(fullKey);
      for (const sub of flattenKeys(obj[k], fullKey)) keys.add(sub);
    } else {
      keys.add(fullKey);
    }
  }
  return keys;
}

let uiStrings, helpStrings;
try {
  uiStrings = JSON.parse(fs.readFileSync(UI_STRINGS, 'utf-8'));
} catch (e) {
  console.error('Failed to parse ui_strings.js as JSON: ' + e.message);
  process.exit(2);
}
try {
  // help_strings.js is a JS object literal (single quotes, trailing commas) with
  // a comment header — not strict JSON. Extract just the keys via regex since we
  // only need the key set, not the values.
  const raw = fs.readFileSync(HELP_STRINGS, 'utf-8');
  helpStrings = {};
  const keyRe = /^\s*['"]([a-zA-Z0-9_$\-]+)['"]\s*:/gm;
  let m;
  while ((m = keyRe.exec(raw)) !== null) helpStrings[m[1]] = true;
  if (Object.keys(helpStrings).length === 0) {
    console.error('Failed to extract any keys from help_strings.js');
    process.exit(2);
  }
} catch (e) {
  console.error('Failed to read help_strings.js: ' + e.message);
  process.exit(2);
}

const uiKeys = flattenKeys(uiStrings);
const helpKeys = new Set(Object.keys(helpStrings));

// ──────────────────────────────────────────────────────────────────────────
// Scan all source files for t('key') and HELP_STRINGS['key'] / HELP_STRINGS["key"]
// ──────────────────────────────────────────────────────────────────────────
function listFiles(dir, filter) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(filter).map(f => path.join(dir, f));
}
const sourceFiles = [
  HOST,
  ...listFiles(ROOT, f => /^[^_].*_module\.js$/.test(f)),
  ...listFiles(ROOT, f => /^[^_].*_source\.jsx$/.test(f)),
  ...listFiles(path.join(ROOT, 'stem_lab'), f => f.endsWith('.js') && !f.startsWith('_')),
  ...listFiles(path.join(ROOT, 'sel_hub'), f => f.endsWith('.js') && !f.startsWith('_')),
];

const tCallsByKey = new Map();   // key → [{ file, line }]
const helpRefsByKey = new Map(); // key → [{ file, line }]
let dynamicTCount = 0;

for (const file of sourceFiles) {
  const src = fs.readFileSync(file, 'utf-8');
  const rel = path.relative(ROOT, file);

  // Match t('foo.bar.baz') or t("foo.bar.baz") — single line only
  const tRe = /(?<![A-Za-z0-9_$])t\(\s*(['"])((?:\\.|(?!\1).)*)\1\s*[,)]/g;
  let m;
  while ((m = tRe.exec(src)) !== null) {
    const key = m[2];
    // Sanity: skip obviously non-translation things (URLs, regexes, paths)
    if (!/^[a-zA-Z0-9_$.\-]+$/.test(key)) continue;
    if (key.length > 80) continue;
    const line = src.substring(0, m.index).split('\n').length;
    if (!tCallsByKey.has(key)) tCallsByKey.set(key, []);
    tCallsByKey.get(key).push({ file: rel, line });
  }

  // Count dynamic t() calls (informational — can't statically check)
  for (const re of DYNAMIC_T_PATTERNS) {
    const matches = src.match(new RegExp(re.source, 'g'));
    if (matches) dynamicTCount += matches.length;
  }

  // Match HELP_STRINGS['key'] or HELP_STRINGS["key"]
  const helpRe = /HELP_STRINGS\[\s*(['"])((?:\\.|(?!\1).)*)\1\s*\]/g;
  while ((m = helpRe.exec(src)) !== null) {
    const key = m[2];
    if (!/^[a-zA-Z0-9_$\-]+$/.test(key)) continue;
    const line = src.substring(0, m.index).split('\n').length;
    if (!helpRefsByKey.has(key)) helpRefsByKey.set(key, []);
    helpRefsByKey.get(key).push({ file: rel, line });
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Cross-reference
// ──────────────────────────────────────────────────────────────────────────
const missingT = [];
const missingHelp = [];
let okT = 0, okHelp = 0;

for (const [key, locations] of tCallsByKey) {
  if (ALLOW_MISSING_T.has(key)) { okT++; continue; }
  if (uiKeys.has(key)) { okT++; continue; }
  missingT.push({ key, locations });
}

for (const [key, locations] of helpRefsByKey) {
  if (helpKeys.has(key)) { okHelp++; continue; }
  missingHelp.push({ key, locations });
}

const orphanUI = [...uiKeys].filter(k => !tCallsByKey.has(k));
const orphanHelp = [...helpKeys].filter(k => !helpRefsByKey.has(k));

// ──────────────────────────────────────────────────────────────────────────
// Report
// ──────────────────────────────────────────────────────────────────────────
const totalErrors = missingT.length + missingHelp.length;

if (!QUIET || totalErrors > 0) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   AlloFlow Translation Key Coverage                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('  ui_strings.js keys defined:   ' + uiKeys.size);
  console.log('  help_strings.js keys defined: ' + helpKeys.size);
  console.log('  t() calls (literal):          ' + tCallsByKey.size + ' unique');
  console.log('  t() calls (dynamic):          ' + dynamicTCount + ' (skipped, can\'t check statically)');
  console.log('  HELP_STRINGS refs (literal):  ' + helpRefsByKey.size + ' unique');
  console.log('');
}

if (missingT.length > 0) {
  console.log('═══ ✗ MISSING t() KEYS (' + missingT.length + ') — UI will show literal key string instead of translated text ═══');
  console.log('');
  for (const e of missingT.slice(0, 50)) {
    console.log('  ✗ t(\'' + e.key + '\')');
    console.log('      First call: ' + e.locations[0].file + ':' + e.locations[0].line + ' (' + e.locations.length + ' total)');
  }
  if (missingT.length > 50) console.log('  (... ' + (missingT.length - 50) + ' more, run --verbose for full list)');
  console.log('');
}

if (missingHelp.length > 0) {
  console.log('═══ ✗ MISSING HELP_STRINGS KEYS (' + missingHelp.length + ') — help-mode tooltip is undefined ═══');
  console.log('');
  for (const e of missingHelp.slice(0, 30)) {
    console.log('  ✗ HELP_STRINGS[\'' + e.key + '\']');
    console.log('      First ref: ' + e.locations[0].file + ':' + e.locations[0].line + ' (' + e.locations.length + ' total)');
  }
  if (missingHelp.length > 30) console.log('  (... ' + (missingHelp.length - 30) + ' more)');
  console.log('');
}

if (VERBOSE) {
  console.log('═══ ⊙ ORPHAN UI KEYS (' + orphanUI.length + ') — defined but never used (informational) ═══');
  for (const k of orphanUI.slice(0, 30)) console.log('  ⊙ ' + k);
  if (orphanUI.length > 30) console.log('  (... ' + (orphanUI.length - 30) + ' more)');
  console.log('');
  console.log('═══ ⊙ ORPHAN HELP KEYS (' + orphanHelp.length + ') ═══');
  for (const k of orphanHelp.slice(0, 30)) console.log('  ⊙ ' + k);
  if (orphanHelp.length > 30) console.log('  (... ' + (orphanHelp.length - 30) + ' more)');
  console.log('');
}

console.log('  ✓ t() OK:                ' + okT);
console.log('  ✓ HELP_STRINGS OK:       ' + okHelp);
console.log('  ✗ Missing t() keys:      ' + missingT.length);
console.log('  ✗ Missing HELP keys:     ' + missingHelp.length);
console.log('  ⊙ Orphan UI keys:        ' + orphanUI.length + ' (informational)');
console.log('  ⊙ Orphan HELP keys:      ' + orphanHelp.length + ' (informational)');
console.log('');

if (totalErrors === 0) {
  console.log('  ✅ All literal-key consumers resolve to defined strings.');
} else {
  console.log('  ❌ ' + totalErrors + ' missing key' + (totalErrors === 1 ? '' : 's') + ' — UI will show literal key text in places.');
}
console.log('');

process.exit(totalErrors > 0 ? 1 : 0);
