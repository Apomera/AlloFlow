#!/usr/bin/env node
/**
 * check_stem_aria_i18n — untranslated ACCESSIBLE NAMES in the STEM tools.
 *
 * Why this gate exists
 * --------------------
 * Every visible string in the STEM tools is routed through t()/__alloT and mirrored
 * into ui_strings.js. Accessible names are not: a 2026-09-15 sweep found 7,253 string
 * literals inside aria-label / aria-valuetext / title / alt that are hardcoded English
 * across 123 of 149 tools. For a screen-reader user reading in Spanish, that means the
 * interface translates and the simulations do not — and an aria-label IS the whole
 * description of a canvas or chart. There is no visible text to fall back on.
 *
 * Why it is an AST walk and not a regex
 * -------------------------------------
 * A regex gets this wrong in both directions, and both mistakes were made while
 * building this gate:
 *   1. It misses English appended as a SUFFIX to a translated value —
 *      `c.title + ' (completed)'` — which turned out to be the majority class.
 *      A regex anchored on labels that START with English saw 9 of EvoLab's 25.
 *   2. It false-positives on `t('key', 'English fallback')`, where the English IS
 *      the registered fallback and is correct.
 * So: walk the AST, and inside an accessible-name attribute collect every string
 * literal that is not an argument of a translation call.
 *
 * The third trap, also hit while building this: a bare object literal with a
 * `title:` field is a DATA RECORD, not markup. Only the second argument of
 * h()/createElement holds real DOM attributes. Scoping to that dropped EvoLab's
 * count from 68 to 16 — every one of the 52 removed was a false positive.
 *
 * Shared tree
 * -----------
 * This repo is edited by several sessions at once. While proving this gate by
 * mutation (2026-09-15) it flagged stem_tool_spacestation.js at 62 against a
 * baseline of 12; the file had been written 20 seconds earlier by another session
 * and the very next run returned 12. A single failure naming a tool you did not
 * touch may be a file caught mid-write: re-run before believing it.
 *
 * Ratchet
 * -------
 * 7,253 pre-existing findings cannot be fixed in one pass, and bulk-editing them
 * would collide with concurrent sessions. So this gate is a RATCHET: it fails only
 * if a tool's count rises above its recorded baseline. Fixing strings lowers the
 * baseline (run with --update). Adding new untranslated names fails the gate.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'stem_lab');
const BASELINE = path.join(__dirname, 'stem_aria_i18n_baseline.json');
const QUIET = process.argv.includes('--quiet');
const UPDATE = process.argv.includes('--update');

let acorn;
try { acorn = require('acorn'); } catch (e) {
  console.error('check_stem_aria_i18n: acorn is not installed; cannot parse. Treating as FAILURE.');
  process.exit(1);
}

// Attributes whose text becomes a control's accessible name or its spoken value.
const ATTRS = new Set(['aria-label', 'aria-description', 'aria-roledescription', 'aria-placeholder', 'aria-valuetext', 'title', 'alt']);
// Only calls that LOOK UP a translation count as a boundary. __alloFill is a
// substitution helper — it drops values into {value1} slots — so a raw English
// template handed to it is still untranslated, and treating it as a boundary made
// this scan report 0 on a file that demonstrably had a hardcoded label (found by
// mutating the petri-dish label, 2026-09-15). Its FIRST argument is the template and
// must be checked; its second argument is the values object, which holds no prose.
const T_FNS = new Set(['t', '__alloT', 'announce']);
const FILL_FNS = new Set(['__alloFill']);
// Any run of two or more letters is candidate prose. A single untranslated word
// ("Open ", " percent") is not a smaller bug than a sentence — it is often the verb
// or the unit, and it is the whole meaning for someone who cannot see the screen.
const PROSE = /[A-Za-z]{2,}/;

function scan(src) {
  const ast = acorn.parse(src, { ecmaVersion: 2020, locations: true });
  const hits = [];
  // A tool may wrap the translator to save repeating a key prefix, e.g.
  //   function sculptLabel(key, fallback) { return t('stem.geosandbox.studio_' + key, fallback); }
  // Those calls ARE a translation boundary, but a fixed T_FNS list cannot see
  // it, so both the key and the English fallback were reported as hardcoded —
  // 76 of geoSandbox's 90 findings were this one wrapper, which buries the
  // real ones. Discover any local function whose whole body is `return
  // <known-t>(...)` and treat it as a boundary too. Deliberately narrow: the
  // body must be a single return of a direct call to an ALREADY-known
  // translator, so a helper that merely mentions t() is not swept in.
  const localT = new Set();
  (function findWrappers(n) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'FunctionDeclaration' && n.id && n.body && n.body.body && n.body.body.length === 1) {
      const only = n.body.body[0];
      if (only.type === 'ReturnStatement' && only.argument && only.argument.type === 'CallExpression') {
        const inner = only.argument.callee;
        if (inner && inner.type === 'Identifier' && T_FNS.has(inner.name)) localT.add(n.id.name);
      }
    }
    for (const k of Object.keys(n)) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach(findWrappers);
      else if (v && typeof v.type === 'string') findWrappers(v);
    }
  })(ast);
  const visit = (node, inT, attr, props) => {
    if (!node || typeof node.type !== 'string') return;

    if (node.type === 'CallExpression') {
      const c = node.callee;
      const name = c && (c.name || (c.property && c.property.name));
      const isT = T_FNS.has(name) || localT.has(name);
      const isFill = FILL_FNS.has(name);
      const isH = (name === 'h' || name === 'createElement');
      visit(c, inT, attr, props);
      node.arguments.forEach((a, i) => {
        // Only h(type, PROPS, ...children) carries DOM attributes.
        if (isH && i === 1 && a && a.type === 'ObjectExpression') { visit(a, inT, attr, true); return; }
        // __alloFill(template, values): the template is still subject to the check,
        // the values object is not prose.
        if (isFill) { visit(a, inT, attr, isH ? false : props); return; }
        visit(a, inT || isT, attr, isH ? false : props);
      });
      return;
    }

    // A string compared with === / !== is a MODE TOKEN, never displayed text:
    // `mode === 'molecular' ? a : b` shows a or b, not 'molecular'. Counting those
    // would train reviewers to ignore this gate's output.
    if (node.type === 'BinaryExpression' && /^[!=]==?$/.test(node.operator)) {
      const side = (n) => (n && n.type === 'Literal' && typeof n.value === 'string') ? null : n;
      visit(side(node.left), inT, attr, props);
      visit(side(node.right), inT, attr, props);
      return;
    }

    if (node.type === 'Property' && !node.computed && props) {
      const k = node.key.type === 'Literal' ? String(node.key.value) : node.key.name;
      if (ATTRS.has(k)) { visit(node.value, inT, k, false); return; }
    }

    if (node.type === 'Literal' && attr && !inT && typeof node.value === 'string' && PROSE.test(node.value)) {
      hits.push({ line: node.loc.start.line, attr, text: node.value });
    }

    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'start' || key === 'end') continue;
      const v = node[key];
      if (Array.isArray(v)) { for (const ch of v) if (ch && typeof ch.type === 'string') visit(ch, inT, attr, props); }
      else if (v && typeof v.type === 'string') visit(v, inT, attr, props);
    }
  };
  visit(ast, false, null, false);
  return hits;
}

// Exported so the per-tool test gates can reuse the exact same walk rather than
// reimplementing it with a regex (which is how this bug class stayed hidden).
module.exports = { scan };

// Running as a library (require'd by a test) stops here.
if (require.main !== module) return;

const files = fs.readdirSync(DIR).filter((f) => /^stem_tool_.+\.js$/.test(f) && !f.endsWith('.bak')).sort();
const counts = {};
const unparsed = [];
for (const f of files) {
  let hits;
  try { hits = scan(fs.readFileSync(path.join(DIR, f), 'utf8')); }
  catch (e) { unparsed.push(f + ': ' + String(e.message).slice(0, 80)); continue; }
  if (hits.length) counts[f] = hits.length;
}

if (UPDATE) {
  fs.writeFileSync(BASELINE, JSON.stringify(counts, null, 2) + '\n');
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log('check_stem_aria_i18n: baseline written — ' + total + ' findings across ' + Object.keys(counts).length + ' tools.');
  process.exit(0);
}

let base = {};
try { base = JSON.parse(fs.readFileSync(BASELINE, 'utf8')); }
catch (e) {
  console.error('check_stem_aria_i18n: no baseline at ' + path.relative(ROOT, BASELINE) + '. Run with --update to record one.');
  process.exit(1);
}

const worse = [];
for (const f of Object.keys(counts)) {
  const allowed = base[f] || 0;
  if (counts[f] > allowed) worse.push({ file: f, now: counts[f], was: allowed });
}

// A tool that improved should tighten its own baseline, so the gain cannot be lost.
const better = Object.keys(base).filter((f) => (counts[f] || 0) < base[f]);

if (unparsed.length && !QUIET) {
  console.error('check_stem_aria_i18n: ' + unparsed.length + ' file(s) did not parse (not counted):');
  for (const u of unparsed) console.error('    ' + u);
}

if (worse.length) {
  console.error('check_stem_aria_i18n: FAIL — untranslated accessible names increased.');
  console.error('  An aria-label/title/aria-valuetext string literal that is not inside t() or');
  console.error('  __alloT() reads in English no matter what language the student chose. For a');
  console.error('  canvas or chart it is the ONLY description there is.');
  for (const w of worse) console.error('    ' + w.file + ': ' + w.now + ' (baseline ' + w.was + ')');
  console.error('  Wrap the new strings, register the keys, then: node dev-tools/check_stem_aria_i18n.cjs --update');
  process.exit(1);
}

if (!QUIET) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log('check_stem_aria_i18n: OK — ' + total + ' pre-existing findings across ' + Object.keys(counts).length + ' tools, none increased.');
  if (better.length) {
    console.log('  Improved since the baseline (run --update to lock the gain in): ' + better.map((f) => f + ' ' + base[f] + '→' + (counts[f] || 0)).join(', '));
  }
}
process.exit(0);
