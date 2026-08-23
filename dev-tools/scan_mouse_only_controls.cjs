#!/usr/bin/env node
// scan_mouse_only_controls.cjs — gate for hand-rolled controls that a keyboard
// cannot operate.
//
// The shape: a non-native element given role="button" (or a tabIndex) plus an
// onClick, with no key handler. A screen reader announces it as a control, and
// Enter/Space do nothing. Assessment Literacy's career network was exactly
// this — role="button", no tabIndex at all, and an aria-label that said
// "click for detail", instructing the user to do the one thing they could not
// (006c25805).
//
// PRECISION IS THE WHOLE PROBLEM HERE. A naive "role or tabIndex plus onClick,
// minus onKeyDown" pass reports 131 sites across 41 files, nearly all noise:
//   * a real <button>/<a href>/<input> handles Enter and Space NATIVELY, so
//     role= on one of those is redundant, not broken
//   * tabIndex="-1" is not keyboard reachable in the first place — it marks a
//     programmatic focus target
//   * props spread from ctx.a11yClick already carry onKeyDown (the HOST helper
//     is correct: onClick + onKeyDown for Enter/Space + role + tabIndex; only
//     the test stubs omit it), so any object with a spread is assumed handled
//   * a component reference (h(Foo, {...})) is not a DOM element
// Filtering on those cuts 131 to 8, which is a list a person can actually read.
//
// <canvas> is BASELINED rather than flagged: this repo's convention is that a
// drawing surface gets a described alternative (see the several
// *_canvas_alternatives_a11y tests), not a key handler on the canvas itself.
//
// Usage: node dev-tools/scan_mouse_only_controls.cjs [--quiet] [--update-baseline] [dir]

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const acorn = require(path.join(ROOT, 'desktop/web-app/node_modules/acorn'));

const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const writeBaseline = args.includes('--update-baseline');
const DIR = args.find((a) => !a.startsWith('--')) || path.join(ROOT, 'stem_lab');
// The filename filter used to be hardcoded to stem_tool_*.js, so pointing this
// at any other directory scanned ZERO files and printed a clean report. That is
// worse than no coverage, because the report looks like a pass. --pattern lets
// a caller name the files; --baseline keeps each corpus's accepted list separate.
const patternArg = args.find((a) => a.startsWith('--pattern='));
const FILE_RE = patternArg ? new RegExp(patternArg.slice('--pattern='.length)) : /^stem_tool_.*\.js$/;
const baselineArg = args.find((a) => a.startsWith('--baseline='));

const NATIVE_OK = new Set(['button', 'a', 'input', 'select', 'textarea', 'summary', 'option', 'label']);
const ELEMENT_FNS = new Set(['createElement', 'h', 'H', 'el', 'e']);
const WIDGET_ROLE = /^(button|link|tab|checkbox|switch|menuitem|option|radio)$/;

function isNode(v) { return v && typeof v === 'object' && typeof v.type === 'string'; }
function walk(node, visit) {
  visit(node);
  for (const k of Object.keys(node)) {
    if (k === 'loc') continue;
    const v = node[k];
    if (Array.isArray(v)) { for (const c of v) if (isNode(c)) walk(c, visit); }
    else if (isNode(v)) walk(v, visit);
  }
}

function scanFile(src) {
  let ast;
  try { ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', locations: true }); }
  catch (e) { return { parseError: e.message, hits: [] }; }

  const hits = [];
  walk(ast, (n) => {
    if (n.type !== 'CallExpression') return;
    const c = n.callee;
    const name = c.type === 'Identifier' ? c.name : (c.type === 'MemberExpression' && c.property ? c.property.name : null);
    if (!ELEMENT_FNS.has(name)) return;

    const tag = n.arguments[0];
    if (!tag || tag.type !== 'Literal' || typeof tag.value !== 'string') return; // component, not a DOM tag
    if (NATIVE_OK.has(tag.value)) return;                                        // native keyboard activation
    const props = n.arguments[1];
    if (!props || props.type !== 'ObjectExpression') return;                     // helper-built props

    const keys = new Map();
    for (const p of props.properties) {
      if (p.type === 'SpreadElement') return;                                    // may carry a11yClick's onKeyDown
      if (p.type !== 'Property' || p.computed) continue;
      const k = p.key && (p.key.name || p.key.value);
      if (k) keys.set(k, p.value);
    }
    if (!keys.has('onClick')) return;
    if (keys.has('onKeyDown') || keys.has('onKeyPress') || keys.has('onKeyUp')) return;

    const tab = keys.get('tabIndex');
    const focusable = tab && tab.type === 'Literal' && Number(tab.value) >= 0;
    const role = keys.get('role');
    const roleIsWidget = role && role.type === 'Literal' && WIDGET_ROLE.test(String(role.value));
    if (!focusable && !roleIsWidget) return;

    hits.push({
      line: n.loc.start.line,
      tag: tag.value,
      // Key on shape, not line: a line number moves whenever anything above it
      // changes, and a baseline that churns is a baseline nobody trusts.
      key: tag.value + ':' + (roleIsWidget ? 'role=' + role.value : 'tabIndex') + (focusable ? ':focusable' : ''),
      why: roleIsWidget
        ? (focusable ? 'role="' + role.value + '" + tabIndex + onClick, no key handler'
                     : 'role="' + role.value + '" + onClick but NO tabIndex — not even reachable')
        : 'tabIndex + onClick, no key handler',
    });
  });
  return { hits };
}

const BASELINE_FILE = baselineArg
  ? path.resolve(ROOT, baselineArg.slice('--baseline='.length))
  : path.join(__dirname, 'mouse_only_controls_baseline.json');
let baseline = {};
try { baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')).accepted || {}; } catch (e) {}

const files = fs.readdirSync(DIR).filter((f) => FILE_RE.test(f));
if (files.length === 0) {
  // Refuse to report a pass on an empty set. A scan that matched nothing is a
  // configuration error, not a clean bill of health.
  console.error('scan_mouse_only_controls: pattern ' + FILE_RE + ' matched NO files in ' + DIR + ' - nothing was scanned.');
  process.exit(2);
}
let bad = 0, total = 0, parseErrors = 0;
const found = {};
for (const f of files) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const r = scanFile(src);
  if (r.parseError) { parseErrors++; console.log('PARSE FAIL ' + f + ': ' + r.parseError); continue; }
  if (!r.hits.length) continue;
  found[f] = r.hits.map((h) => h.key);
  const fresh = r.hits.filter((h) => !(baseline[f] || []).includes(h.key));
  if (!fresh.length) continue;
  bad++; total += fresh.length;
  console.log('FLAG ' + f);
  for (const h of fresh) console.log('   - @' + h.line + ' <' + h.tag + '> ' + h.why);
}
if (writeBaseline) {
  fs.writeFileSync(BASELINE_FILE, JSON.stringify({
    note: 'Accepted: <canvas> surfaces (this repo covers those with described alternatives, not key handlers on the canvas) and sites owned by another session at the time of writing. Regenerate with --update-baseline only after re-reading each site.',
    accepted: found,
  }, null, 2) + '\n', 'utf8');
  console.log('baseline written: ' + Object.keys(found).length + ' file(s)');
}
if (bad) {
  console.log('  Fix: give it a real <button>, or add tabIndex: 0 plus');
  console.log("  onKeyDown: function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } }");
  console.log('  and route pointer + keyboard through ONE activate() so they cannot drift.');
}
if (!quiet || bad || parseErrors) {
  console.log('---');
  console.log('scan_mouse_only_controls: ' + files.length + ' file(s), ' + total + ' new mouse-only control(s) in '
    + bad + ' file(s), ' + parseErrors + ' parse failure(s).');
}
process.exit(bad || parseErrors ? 1 : 0);
