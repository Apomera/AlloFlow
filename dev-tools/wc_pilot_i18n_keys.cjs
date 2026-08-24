// Collect every stem.watercycle key the newer Water Cycle surfaces need, with
// its English, and report which are missing from ui_strings.js.
//
//   node dev-tools/wc_pilot_i18n_keys.cjs                 # report
//   node dev-tools/wc_pilot_i18n_keys.cjs --json <out>    # write the key map
//
// Two sources, because there are two shapes:
//   · literal   t('stem.watercycle.x', 'English')  - parsed out of the source
//   · dynamic   'stem.watercycle.pilot_form_' + id + '_science'  - enumerated by
//     RUNNING the kernel, so the key list cannot drift from the data it names.
// A collector that only grepped literals would silently miss 32 keys, which is
// exactly the sort of gap that ships as English in 63 languages.
'use strict';

const fs = require('fs');
const SRC = 'stem_lab/stem_tool_watercycle.js';
const source = fs.readFileSync(SRC, 'utf8');

const keys = {};

// ── 1. Literal t('stem.watercycle.KEY', 'English') pairs ──────────────────
// Handles both quote styles and escaped quotes inside the English.
const litRe = /\bt\(\s*'stem\.watercycle\.([A-Za-z0-9_]+)'\s*,\s*('((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g;
let m;
while ((m = litRe.exec(source))) {
  const key = m[1];
  const raw = m[3] !== undefined ? m[3] : m[4];
  const text = raw
    .replace(/\\u([0-9a-fA-F]{4})/g, (_x, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
  if (keys[key] && keys[key] !== text) {
    console.error(`CONFLICT: ${key} has two English values:\n  ${JSON.stringify(keys[key])}\n  ${JSON.stringify(text)}`);
    process.exitCode = 1;
  }
  keys[key] = text;
}

// The kernel's own helper uses _pt('key', 'English', tokens).
const ptRe = /\b_pt\(\s*'([A-Za-z0-9_]+)'\s*,\s*'((?:[^'\\]|\\.)*)'/g;
while ((m = ptRe.exec(source))) {
  keys[m[1]] = m[2].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}

// ── 1b. Keys named anywhere, paired with English by position ──────────────
// The ternary form  t(cond ? 'a.b.keyA' : 'a.b.keyB', cond ? 'enA' : 'enB')
// is invisible to the pair regex above, so its keys would silently never reach
// ui_strings.js and would render English in all 63 languages with nothing
// reporting a problem. Every key literal in the file is collected here; any
// that still has no English afterwards is an ORPHAN and is reported loudly.
const ternRe = /\bt\(\s*[^,]*?\?\s*'stem\.watercycle\.([A-Za-z0-9_]+)'\s*:\s*'stem\.watercycle\.([A-Za-z0-9_]+)'\s*,\s*[^,]*?\?\s*('((?:[^'\\]|\\.)*)')\s*\n?\s*:\s*('((?:[^'\\]|\\.)*)')/g;
while ((m = ternRe.exec(source))) {
  const unesc = (x) => x.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  keys[m[1]] = unesc(m[4]);
  keys[m[2]] = unesc(m[6]);
}

// A key literal followed by `+` is a PREFIX being concatenated with an id
// ('stem.watercycle.pilot_form_' + id + '_science'); the real keys it produces
// are enumerated from the kernel below, so the prefix itself is not a key.
const namedRe = /'stem\.watercycle\.([A-Za-z0-9_]+)'(\s*\+)?/g;
const named = new Set();
while ((m = namedRe.exec(source))) if (!m[2]) named.add(m[1]);

// ── 2. Dynamic keys, enumerated from the kernel itself ────────────────────
const start = source.indexOf('  var WC_PILOT_UNIT_M =');
const exportAt = source.indexOf('  window.WaterCyclePilotKernel = {');
const end = source.indexOf('\n  };', exportAt) + '\n  };'.length;
const host = {};
// eslint-disable-next-line no-new-func
new Function('window', source.slice(start, end))(host);
const K = host.WaterCyclePilotKernel;
if (!K) throw new Error('kernel did not load');

Object.keys(K.scenarios).forEach((id) => {
  keys[`pilot_sc_${id}_label`] = K.scenarios[id].label;
  keys[`pilot_sc_${id}_blurb`] = K.scenarios[id].blurb;
});
Object.keys(K.forms).forEach((id) => {
  keys[`pilot_form_${id}_label`] = K.forms[id].label;
  keys[`pilot_form_${id}_science`] = K.forms[id].science;
});

// ── 3. Compare against the master ─────────────────────────────────────────
const master = JSON.parse(fs.readFileSync('ui_strings.js', 'utf8'));
const existing = (master.stem && master.stem.watercycle) || {};
const missing = {};
const drifted = [];
for (const [k, v] of Object.entries(keys)) {
  if (!(k in existing)) missing[k] = v;
  else if (existing[k] !== v) drifted.push([k, existing[k], v]);
}

const orphans = [...named].filter((k) => !(k in keys)).sort();
if (orphans.length) {
  console.error(`\nORPHAN KEYS - named in the source but no English found (${orphans.length}):`);
  for (const k of orphans) console.error(`  ${k}`);
  console.error('These would render English in every language. Supply their English before continuing.');
  process.exitCode = 1;
}

const sorted = Object.keys(keys).sort();
console.log(`keys required by the tool : ${sorted.length}`);
console.log(`already in ui_strings.js  : ${sorted.length - Object.keys(missing).length}`);
console.log(`MISSING from ui_strings.js: ${Object.keys(missing).length}`);
if (drifted.length) {
  console.log(`\nDRIFT - master disagrees with the source fallback (${drifted.length}):`);
  for (const [k, a, b] of drifted) console.log(`  ${k}\n    master: ${JSON.stringify(a)}\n    source: ${JSON.stringify(b)}`);
  process.exitCode = 1;
}

const outIdx = process.argv.indexOf('--json');
if (outIdx !== -1 && process.argv[outIdx + 1]) {
  const ordered = {};
  for (const k of sorted) ordered[k] = keys[k];
  fs.writeFileSync(process.argv[outIdx + 1], JSON.stringify({ all: ordered, missing }, null, 2));
  console.log(`\nwrote ${process.argv[outIdx + 1]}`);
}
