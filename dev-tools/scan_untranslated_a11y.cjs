#!/usr/bin/env node
// scan_untranslated_a11y.cjs — find user-visible English that never reaches
// the translator, in the two places a screen-reader user meets it first.
//
//   node dev-tools/scan_untranslated_a11y.cjs               # every STEM tool
//   node dev-tools/scan_untranslated_a11y.cjs magnetism     # one tool
//   node dev-tools/scan_untranslated_a11y.cjs --json
//
// WHY. A tool can be fully translated on screen and still speak English to a
// screen reader, because announceToSR() calls and aria-label values are easy
// to write as bare literals. That combination -- blind, and reading in another
// language -- is the least served by the gap. Art Studio had 123 announcements
// and 120 accessible names in that state while its visible UI was translated.
//
// ★ WRITTEN AFTER A GATE SHIPPED BLIND. An earlier version of the Art Studio
// gate matched only calls whose body STARTED with a quote, so it passed while
// 21 announcements beginning with a condition -- announceToSR(paused ? 'A.' :
// 'B.') -- were still English. Every detector here is therefore checked
// against BOTH shapes by --selftest, which must be run before trusting a
// zero:
//
//   node dev-tools/scan_untranslated_a11y.cjs --selftest
//
// What counts as a finding:
//   * announceToSR('...')            a complete English literal
//   * announceToSR('...' + value)    a fragment glued to a value
//   * announceToSR(cond ? 'A' : 'B') English chosen by a condition
//   * aria-label: 'English'          a complete literal
//   * aria-label: 'English ' + value an assembled name
// Text already inside a translator call is not a finding, and neither are
// option values such as 'free' or 'PageUp': prose here means capitalised and
// either multi-word or sentence-final.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const SELFTEST = args.includes('--selftest');
const only = args.find((a) => !a.startsWith('--'));

// Strip text that is already keyed, then look for prose that remains.
const stripKeyed = (s) => s.replace(/(?:__alloT|ctx\.t|\bt)\(\s*'[^']*'\s*,\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*\)/g, '_T_');
const PROSE = /'([A-Z][A-Za-z0-9 ,.\-]{3,})'|"([A-Z][A-Za-z0-9 ,.\-]{3,})"/g;
const isProse = (lit) => / |\.$/.test(lit.slice(1, -1));

function callBodies(src, fnName) {
  const out = [];
  let i = 0;
  const needle = fnName + '(';
  while ((i = src.indexOf(needle, i)) !== -1) {
    const before = src[i - 1] || ' ';
    if (/[\w$.]/.test(before) && !src.slice(0, i).endsWith('.')) { i += needle.length; continue; }
    const open = i + needle.length;
    let depth = 1, j = open, inStr = null;
    for (; j < src.length && depth > 0; j++) {
      const c = src[j];
      if (inStr) { if (c === '\\') j++; else if (c === inStr) inStr = null; continue; }
      if (c === "'" || c === '"') inStr = c;
      else if (c === '(') depth++;
      else if (c === ')') depth--;
    }
    out.push({ body: src.slice(open, j - 1), index: i });
    i = j;
  }
  return out;
}

// Screen-reader announcement helpers, by name. A tool whose helper is missing from this
// list scans as "announcements: 0", which reads as clean — that is how 50 English
// announcements in stem_tool_geologyexplorer.js (helper: `announce`) went unreported.
// Add a name here rather than trusting a zero from a tool you have not opened.
const ANNOUNCE_HELPERS = ['announceToSR', 'announce', 'srAnnounce', 'announceLive', 'sayToSR'];

// ...and by SHAPE, because a fixed list of names cannot keep up. Most tools wrap
// the live region in a helper of their own - llAnnounce, petsAnnounce, flAnnounce,
// announceBee, setAnnounceText - and every one of those scanned as zero, which
// reads as clean. learning_lab alone reported 0 announcements while holding 370
// bare English calls through llAnnounce. So take any function DECLARED in this
// file whose name contains "announce", in addition to the five known names.
// callBodies() already matches whole words, so `announce` never swallows
// `announceBee(` and `reannounce(` never matches at all.
const ANNOUNCE_DECL = /(?:function\s+([A-Za-z_$][\w$]*)\s*\(|(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function\s*\()/g;
function announceHelpers(src) {
  const names = new Set(ANNOUNCE_HELPERS);
  for (const m of src.matchAll(ANNOUNCE_DECL)) {
    const name = m[1] || m[2];
    if (/announce/i.test(name)) names.add(name);
  }
  return [...names];
}

function findAnnouncements(src) {
  return announceHelpers(src).flatMap((fn) => callBodies(src, fn))
    .map((c) => ({ ...c, prose: (stripKeyed(c.body).match(PROSE) || []).filter(isProse) }))
    .filter((c) => c.prose.length);
}

function findLabels(src) {
  const out = [];
  const re = /["']aria-label["']\s*:\s*/g;
  let m;
  while ((m = re.exec(src))) {
    const start = m.index + m[0].length;
    if (src[start] !== "'" && src[start] !== '"') continue;
    let depth = 0, inStr = null, end = -1;
    for (let j = start; j < src.length; j++) {
      const c = src[j];
      if (inStr) { if (c === '\\') j++; else if (c === inStr) inStr = null; continue; }
      if (c === "'" || c === '"') { inStr = c; continue; }
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') { if (depth === 0) { end = j; break; } depth--; }
      else if (c === ',' && depth === 0) { end = j; break; }
    }
    if (end < 0) continue;
    const body = src.slice(start, end);
    const prose = (stripKeyed(body).match(PROSE) || []).filter(isProse);
    if (prose.length) out.push({ body, index: start, prose });
  }
  return out;
}

if (SELFTEST) {
  const cases = [
    ["announceToSR('Field measurements cleared.')", 1, 0, 'bare announcement'],
    ["announce('Field measurements cleared.')", 1, 0, 'bare announcement, announce() helper'],
    ["announce(paused ? 'Drying paused.' : 'Drying resumed.')", 1, 0, 'conditional announcement, announce() helper'],
    ["announce(__alloT('stem.x.k', 'Field measurements cleared.'))", 0, 0, 'keyed announcement, announce() helper'],
    ["reannounce('Field measurements cleared.')", 0, 0, 'helper name must match as a whole word'],
    ["function llAnnounce(m) {} llAnnounce('Field measurements cleared.')", 1, 0,
      'per-tool helper declared in the file is discovered by shape'],
    ["var petsAnnounce = function (m) {}; petsAnnounce('Field measurements cleared.')", 1, 0,
      'per-tool helper declared as a var is discovered too'],
    ["function llAnnounce(m) {} llAnnounce(__alloT('stem.x.k', 'Field measurements cleared.'))", 0, 0,
      'a keyed call through a discovered helper is clean'],
    ["llAnnounce('Field measurements cleared.')", 0, 0,
      'an undeclared name is NOT a helper - only declarations in this file count'],
    ["announceToSR(paused ? 'Drying paused.' : 'Drying resumed.')", 1, 0, 'conditional announcement'],
    ["announceToSR('Row ' + n + ' selected.')", 1, 0, 'assembled announcement'],
    ["announceToSR(__alloT('stem.x.k', 'Field measurements cleared.'))", 0, 0, 'keyed announcement'],
    ["{ 'aria-label': 'Magnet controls' }", 0, 1, 'bare label'],
    ["{ 'aria-label': 'Choose ' + name }", 0, 1, 'assembled label'],
    ["{ 'aria-label': __alloT('stem.x.k', 'Magnet controls') }", 0, 0, 'keyed label'],
    ["{ 'aria-label': 'X' }", 0, 0, 'single letter is not prose'],
    ["if (mode === 'free') {}", 0, 0, 'option value is not prose'],
  ];
  let bad = 0;
  for (const [code, wantAnn, wantLab, name] of cases) {
    const a = findAnnouncements(code).length, l = findLabels(code).length;
    const ok = a === wantAnn && l === wantLab;
    if (!ok) bad++;
    console.log((ok ? 'ok   ' : 'FAIL ') + name + '  (announcements ' + a + '/' + wantAnn + ', labels ' + l + '/' + wantLab + ')');
  }
  console.log(bad ? bad + ' detector(s) wrong -- do not trust a zero' : 'all detectors verified against both shapes');
  process.exit(bad ? 1 : 0);
}

const dir = path.join(ROOT, 'stem_lab');
const files = fs.readdirSync(dir)
  .filter((f) => /^stem_tool_.*\.js$/.test(f))
  .filter((f) => !only || f === 'stem_tool_' + only + '.js');
if (!files.length) { console.error('no tool matched ' + only); process.exit(2); }

const rows = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  const ann = findAnnouncements(src), lab = findLabels(src);
  if (!ann.length && !lab.length) continue;
  rows.push({ tool: f.replace(/^stem_tool_|\.js$/g, ''), announcements: ann.length, labels: lab.length,
    samples: [...ann.slice(0, 2), ...lab.slice(0, 2)].map((c) => c.body.replace(/\s+/g, ' ').slice(0, 90)) });
}
rows.sort((a, b) => (b.announcements + b.labels) - (a.announcements + a.labels));
const totals = rows.reduce((t, r) => ({ announcements: t.announcements + r.announcements, labels: t.labels + r.labels }), { announcements: 0, labels: 0 });

if (JSON_OUT) { console.log(JSON.stringify({ scanned: files.length, affected: rows.length, totals, rows }, null, 2)); process.exit(0); }
console.log('scanned ' + files.length + ' tool(s); ' + rows.length + ' with untranslated announcements or accessible names');
console.log('announcements: ' + totals.announcements + '   accessible names: ' + totals.labels);
console.log('');
console.log('tool'.padEnd(24) + 'announce'.padStart(9) + 'labels'.padStart(8));
for (const r of rows) console.log(r.tool.padEnd(24) + String(r.announcements).padStart(9) + String(r.labels).padStart(8));
if (only && rows.length) { console.log(''); rows[0].samples.forEach((s) => console.log('  ' + s)); }
