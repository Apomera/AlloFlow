#!/usr/bin/env node
'use strict';

// check_hardcoded_aria_text.cjs — RATCHET on accessibility text that never reaches
// a translator (2026-09-20).
//
// WHY: a tool calls __alloT('some.key', 'English fallback') and the key is what a
// language pack can translate. An aria-label written as a bare string literal —
//     h('button', { 'aria-label': 'Oscilloscope time window' }, …)
// — has no key at all. It is invisible to EVERY i18n gate, including
// stem_i18n_a11y_coverage.cjs, which can only count keys that exist. So the page
// renders, every check passes, and a screen-reader user in French hears English
// forever. The failure is invisible by construction.
//
// This is not hypothetical and it is not static: the Renewables work in flight on
// 2026-09-20 added 8 NEW hardcoded aria-labels ('One-input comparison checks',
// 'Scenario comparison window results'). The tools are already wired for
// translation — stem_tool_circuit.js calls __alloT 262 times and still ships 162
// hardcoded labels — so these are missed strings, not a different architecture.
//
// RATCHET, not a wall: the backlog was 4993 across 219 files when this landed.
// Failing on all of them helps nobody. The count may only go DOWN. To add an
// aria-label, route it through __alloT (or whatever the file already uses) —
// there is no budget to spend.
//
// AST-based (acorn), same approach and file scope as check_aria_handler.cjs:
// a regex cannot tell 'aria-label': 'Save' from a comment mentioning aria-label.
//
// Usage: node dev-tools/check_hardcoded_aria_text.cjs [--quiet] [--list] [--update] [--allow-increase]
//   also: npm run verify:hardcoded-aria
//   exit 1 when any file exceeds its baseline; --update re-baselines DOWN
//   (an increase needs --allow-increase, i.e. a deliberate decision).
//
// The baseline ships WITH the renewables translator fix (2026-09-20) that made
// it reachable: all 16 RenewablesEnergy* components were module-scope siblings
// with no translator in scope, so their aria-labels could not simply be wrapped
// (__alloT lives at 4123-4254 / 4671-8862; the components sit at ~2500-3560, and
// a bare __alloT() there is a ReferenceError). RenewablesEnergyLab now derives
// `t` from its ctx and threads it down; see rnEnergyT() in that file. Because the
// baseline records the post-fix count for that one file, this gate and that fix
// must land in the same change.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const acorn = require(path.join(ROOT, 'node_modules', 'acorn'));
const BASELINE = path.join(__dirname, 'hardcoded_aria_text_baseline.json');

const QUIET = process.argv.includes('--quiet');
const LIST = process.argv.includes('--list');
const UPDATE = process.argv.includes('--update');
const ALLOW_INCREASE = process.argv.includes('--allow-increase');
const argFiles = process.argv.slice(2).filter((a) => !a.startsWith('--'));

// Attributes a screen reader speaks. aria-labelledby/describedby are ID REFERENCES,
// not text, so they are deliberately absent.
const SPOKEN_ATTRS = new Set([
  'aria-label', 'aria-description', 'aria-roledescription', 'aria-valuetext',
  'aria-placeholder', 'title', 'alt', 'placeholder',
]);
const BASE_CREATE = new Set(['h', 'e', 'createElement', '_jsx', '_jsxs']);
const SKIP_KEYS = new Set(['type', 'start', 'end', 'loc']);
// Helpers that hand a string to a translator. Files use several spellings.
const T_FN = /^(__alloT|t|tr|__t|translate)$/;

function defaultFiles() {
  const files = [];
  for (const f of fs.readdirSync(ROOT)) if (/_module\.js$/.test(f)) files.push(path.join(ROOT, f));
  for (const sub of ['stem_lab', 'sel_hub']) {
    const dir = path.join(ROOT, sub);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) if (/\.js$/.test(f) && !/^_build/.test(f)) files.push(path.join(dir, f));
  }
  return files;
}

// Iterative walk: these modules reach 1.6MB and recursion overflows.
function walkAll(root, visit) {
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node.type !== 'string') continue;
    visit(node);
    for (const k in node) {
      if (SKIP_KEYS.has(k)) continue;
      const v = node[k];
      if (Array.isArray(v)) { for (const n of v) if (n && typeof n.type === 'string') stack.push(n); }
      else if (v && typeof v.type === 'string') stack.push(v);
    }
  }
}

function discoverAliases(ast) {
  const aliases = new Set(BASE_CREATE);
  walkAll(ast, (n) => {
    const isCreateMember = (m) => m && m.type === 'MemberExpression' && m.property && m.property.name === 'createElement';
    if (n.type === 'VariableDeclarator' && n.id && n.id.type === 'Identifier' && isCreateMember(n.init)) aliases.add(n.id.name);
    if (n.type === 'AssignmentExpression' && n.left.type === 'Identifier' && isCreateMember(n.right)) aliases.add(n.left.name);
  });
  return aliases;
}

// Any translation call inside the value means a translator can reach it.
function routesThroughTranslator(node) {
  let found = false;
  walkAll(node, (n) => {
    if (found || n.type !== 'CallExpression') return;
    const c = n.callee;
    if (c.type === 'Identifier' && T_FN.test(c.name)) found = true;
    else if (c.type === 'MemberExpression' && c.property && T_FN.test(c.property.name || '')) found = true;
  });
  return found;
}

// Prose a human would HEAR — not a token, id, url, unit or single short word.
// Deliberately conservative: a false positive here costs someone real time.
function isSpokenProse(raw) {
  if (typeof raw !== 'string') return false;
  const v = raw.trim();
  if (v.length < 4) return false;
  if (!/[A-Za-z]/.test(v)) return false;
  if (!/[a-z]/.test(v)) return false;                        // ALLCAPS token
  if (!/^[\x20-\x7E -ɏ]+$/.test(v)) return false;  // already non-English
  if (/^[a-z0-9_.-]+$/.test(v)) return false;                // slug / id
  if (/^(https?:|#|\/|data:|\.)/.test(v)) return false;      // url / selector
  if (!/\s/.test(v) && v.length < 8) return false;           // lone short word
  return true;
}

function scanFile(file) {
  let src;
  try { src = fs.readFileSync(file, 'utf8'); }
  catch (e) { return { error: 'unreadable: ' + e.message }; }
  let ast;
  try { ast = acorn.parse(src, { ecmaVersion: 'latest', locations: true }); }
  catch (e) { return { error: 'parse failed: ' + e.message.slice(0, 80) }; }

  const aliases = discoverAliases(ast);
  const isCreate = (node) => {
    if (!node || node.type !== 'CallExpression') return false;
    const c = node.callee;
    if (c.type === 'MemberExpression' && c.property && c.property.name === 'createElement') return true;
    return c.type === 'Identifier' && aliases.has(c.name);
  };

  const hits = [];
  walkAll(ast, (node) => {
    if (!isCreate(node)) return;
    const props = node.arguments && node.arguments[1];
    if (!props || props.type !== 'ObjectExpression') return;
    for (const p of props.properties) {
      if (p.type !== 'Property' || p.computed) continue;
      const key = p.key.type === 'Literal' ? p.key.value : p.key.name;
      if (!SPOKEN_ATTRS.has(key)) continue;
      const v = p.value;
      if (v.type === 'Literal') {
        if (isSpokenProse(v.value)) hits.push({ line: v.loc.start.line, attr: key, text: String(v.value) });
      } else if (v.type === 'TemplateLiteral' && !routesThroughTranslator(v)) {
        const flat = v.quasis.map((q) => q.value.cooked).join('');
        if (isSpokenProse(flat)) hits.push({ line: v.loc.start.line, attr: key, text: flat });
      }
    }
  });
  // Source order, so a regression report can show the LAST hits (the likely new
  // ones) rather than whatever order the AST walk happened to produce.
  hits.sort((a, b) => a.line - b.line);
  return { hits };
}

const files = argFiles.length ? argFiles.map((f) => path.resolve(f)) : defaultFiles();
const counts = {};
const details = {};
const errors = [];
let total = 0;

for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const r = scanFile(file);
  if (r.error) { errors.push(rel + ': ' + r.error); continue; }
  if (!r.hits.length) continue;
  counts[rel] = r.hits.length;
  details[rel] = r.hits;
  total += r.hits.length;
}

const log = (...a) => { if (!QUIET) console.log(...a); };

if (LIST) {
  for (const rel of Object.keys(details).sort()) {
    console.log('\n' + rel + '  (' + counts[rel] + ')');
    for (const h of details[rel].slice(0, 40)) {
      console.log('  ' + String(h.line).padStart(6) + '  ' + h.attr + ' = ' + JSON.stringify(h.text).slice(0, 78));
    }
    if (details[rel].length > 40) console.log('  … ' + (details[rel].length - 40) + ' more');
  }
  console.log('');
}

let baseline = null;
if (fs.existsSync(BASELINE)) {
  try { baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8')); }
  catch (e) { console.error('baseline unreadable: ' + e.message); process.exit(1); }
}

if (UPDATE) {
  const prevTotal = baseline ? baseline.total : Infinity;
  if (baseline && total > prevTotal && !ALLOW_INCREASE) {
    console.error('check_hardcoded_aria_text: refusing to raise the baseline (' + prevTotal + ' → ' + total + ').');
    console.error('  Route the new aria-label/title/alt text through the translation helper this file already uses.');
    console.error('  If the increase is genuinely intended, re-run with --allow-increase.');
    process.exit(1);
  }
  fs.writeFileSync(BASELINE, JSON.stringify({
    note: 'Per-file count of accessibility text hardcoded as English literals (no translation key). RATCHET: may only go down. Re-baseline with --update after removing some; an increase needs --allow-increase.',
    set: new Date().toISOString().slice(0, 10),
    total,
    files: counts,
  }, null, 2) + '\n');
  console.log('check_hardcoded_aria_text: baselined ' + total + ' hardcoded string(s) across ' + Object.keys(counts).length + ' file(s).');
  process.exit(0);
}

if (!baseline) {
  console.error('check_hardcoded_aria_text: no baseline yet — run once with --update.');
  process.exit(1);
}

const regressions = [];
for (const [rel, n] of Object.entries(counts)) {
  const was = baseline.files[rel] || 0;
  if (n > was) regressions.push({ rel, was, now: n });
}

log('[check_hardcoded_aria_text] ' + total + ' hardcoded accessibility string(s) across '
  + Object.keys(counts).length + ' file(s); baseline ' + baseline.total + '.');
if (errors.length && !QUIET) { console.log('  note: ' + errors.length + ' file(s) skipped:'); errors.slice(0, 5).forEach((e) => console.log('    ' + e)); }

if (regressions.length) {
  console.error('✗ accessibility text that no translator can reach increased in ' + regressions.length + ' file(s):');
  for (const r of regressions.slice(0, 20)) {
    console.error('\n  ' + r.rel + '  ' + r.was + ' → ' + r.now + '  (+' + (r.now - r.was) + ')');
    // The baseline stores counts, not positions, so the added strings cannot be
    // identified exactly. Show the last few in source order as a starting point.
    const shown = (details[r.rel] || []).slice(-(r.now - r.was));
    if (shown.length) console.error('      last ' + shown.length + ' in source order (check your diff for the actual additions):');
    for (const h of shown.slice(0, 6)) {
      console.error('      line ' + h.line + '  ' + h.attr + ' = ' + JSON.stringify(h.text).slice(0, 70));
    }
  }
  console.error('\n  A bare string here has no key, so it is never shown to a translator and ships');
  console.error('  English in all 63 packs. Wrap it the way the file already does, e.g.');
  console.error("      'aria-label': __alloT('stem.<tool>.<key>', 'English text')");
  console.error('  Inspect with: node dev-tools/check_hardcoded_aria_text.cjs --list <file>');
  process.exit(1);
}

if (total < baseline.total) {
  log('  ↓ ' + (baseline.total - total) + ' fewer than baseline — ratchet down with: node dev-tools/check_hardcoded_aria_text.cjs --update');
}
log('✓ check_hardcoded_aria_text: no file added untranslatable accessibility text.');
process.exit(0);
