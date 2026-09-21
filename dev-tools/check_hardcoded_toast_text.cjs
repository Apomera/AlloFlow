#!/usr/bin/env node
'use strict';

// check_hardcoded_toast_text.cjs -- RATCHET on toast text that never reaches a
// translator (2026-09-21).
//
// WHY: the screen-reader channel was translated tool by tool, and the visible
// toast channel beside it was not. In Art Studio on 2026-09-21 the split was
// stark: 124 announceToSR calls were fully keyed while 58 of 63 addToast calls
// held bare English. A student running the tool in Spanish therefore got a
// translated UI and then an English popup every time the tool spoke to them.
//
// Across 112 STEM tools that was 1586 of 1872 addToast calls (85%). The tools
// are already wired for translation -- these are missed strings, not a different
// architecture -- so the fix is always the same shape:
//     addToast(__alloT('stem.<tool>.<key>', 'English text'), 'success')
// and, when a runtime value is interpolated, a placeholder rather than a split
// sentence, because 'Keyframe ' + n + ' captured!' cannot be reordered by a
// translator and many languages need to:
//     addToast(formatArtStudioLearningText(
//       __alloT('stem.<tool>.<key>', 'Keyframe {value1} captured!'), { value1: n }), 'success')
//
// RATCHET, not a wall: the backlog was 1528 across 101 files when this landed
// (Art Studio's 58 having just been fixed, which is why it has no entry).
// Failing on all of them helps nobody. The count may only go DOWN.
//
// AST-based (acorn), mirroring check_hardcoded_aria_text.cjs: a regex cannot
// tell addToast('Saved.') from a comment that merely mentions one.
//
// Usage: node dev-tools/check_hardcoded_toast_text.cjs [--quiet] [--list] [--update] [--allow-increase]
//   exit 1 when any file exceeds its baseline; --update re-baselines DOWN
//   (an increase needs --allow-increase, i.e. a deliberate decision).

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const acorn = require(path.join(ROOT, 'node_modules', 'acorn'));
const BASELINE = path.join(__dirname, 'hardcoded_toast_text_baseline.json');

const QUIET = process.argv.includes('--quiet');
const LIST = process.argv.includes('--list');
const UPDATE = process.argv.includes('--update');
const ALLOW_INCREASE = process.argv.includes('--allow-increase');
const argFiles = process.argv.slice(2).filter((a) => !a.startsWith('--'));

// Functions that put text in front of a person. announceToSR is deliberately
// absent: it has its own per-tool gates (e.g. tests/artstudio_sr_announcements_i18n.test.js)
// and mixing the two would make this baseline move for unrelated reasons.
const TOAST_FN = /^(addToast|showToast|toast)$/;
const SKIP_KEYS = new Set(['type', 'start', 'end', 'loc']);
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

// Prose a person would READ — not a token, id, url, unit or single short word.
// Deliberately conservative: a false positive here costs someone real time.
function isVisibleProse(raw) {
  if (typeof raw !== 'string') return false;
  const v = raw.trim();
  if (v.length < 4) return false;
  if (!/[A-Za-z]/.test(v)) return false;
  if (!/[a-z]/.test(v)) return false;                        // ALLCAPS token
  if (!/^[\x20-\x7E -ɏ]+$/.test(v)) return false;  // already non-English
  if (/^[a-z0-9_.-]+$/.test(v)) return false;                // slug / id
  if (/^(https?:|#|\/|data:|\.)/.test(v)) return false;      // url / selector
  if (!/\s/.test(v) && v.length < 8) return false;           // lone short word
  // A toast severity argument (success, error, info, warning) is a token, not
  // a message; it is excluded by position below, but a message that IS one of
  // those words is not prose either.
  if (/^(success|error|info|warning)$/i.test(v)) return false;
  return true;
}

// Collect string literals in a node that are NOT inside a translator call, so
// addToast(cond ? __alloT(k, 'A') : __alloT(k2, 'B')) is clean while
// addToast(cond ? 'A' : 'B') is not, and so is a half-keyed mix of the two.
function unkeyedLiterals(node) {
  const found = [];
  const stack = [node];
  while (stack.length) {
    const n = stack.pop();
    if (!n || typeof n.type !== 'string') continue;
    // Do not descend into a translator call: everything inside it is reachable.
    if (n.type === 'CallExpression') {
      const c = n.callee;
      const isT = (c.type === 'Identifier' && T_FN.test(c.name))
        || (c.type === 'MemberExpression' && c.property && T_FN.test(c.property.name || ''));
      if (isT) continue;
    }
    if (n.type === 'Literal' && typeof n.value === 'string') {
      if (isVisibleProse(n.value)) found.push({ line: n.loc.start.line, text: n.value });
    } else if (n.type === 'TemplateLiteral') {
      const flat = n.quasis.map((q) => q.value.cooked).join('');
      if (isVisibleProse(flat)) found.push({ line: n.loc.start.line, text: flat });
      for (const e of n.expressions) stack.push(e);
      continue;
    }
    for (const k in n) {
      if (SKIP_KEYS.has(k)) continue;
      const v = n[k];
      if (Array.isArray(v)) { for (const m of v) if (m && typeof m.type === 'string') stack.push(m); }
      else if (v && typeof v.type === 'string') stack.push(v);
    }
  }
  return found;
}

function scanFile(file) {
  let src;
  try { src = fs.readFileSync(file, 'utf8'); }
  catch (e) { return { error: 'unreadable: ' + e.message }; }
  let ast;
  try { ast = acorn.parse(src, { ecmaVersion: 'latest', locations: true }); }
  catch (e) { return { error: 'parse failed: ' + e.message.slice(0, 80) }; }

  const hits = [];
  walkAll(ast, (node) => {
    if (node.type !== 'CallExpression') return;
    const c = node.callee;
    const isToast = (c.type === 'Identifier' && TOAST_FN.test(c.name))
      || (c.type === 'MemberExpression' && c.property && TOAST_FN.test(c.property.name || ''));
    if (!isToast) return;
    // Only the MESSAGE argument. The 2nd argument is the severity token.
    const msg = node.arguments && node.arguments[0];
    if (!msg) return;
    const bare = unkeyedLiterals(msg);
    // One hit per CALL SITE, not per literal: a ternary of two English branches
    // is one place to fix, and counting literals would make the baseline jump
    // when someone merely splits a sentence.
    if (bare.length) hits.push({ line: msg.loc.start.line, text: bare[0].text, extra: bare.length - 1 });
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
      console.log('  ' + String(h.line).padStart(6) + '  ' + JSON.stringify(h.text).slice(0, 78)
        + (h.extra ? '  (+' + h.extra + ' more in this call)' : ''));
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
    console.error('check_hardcoded_toast_text: refusing to raise the baseline (' + prevTotal + ' → ' + total + ').');
    console.error('  Route the new toast text through the translation helper this file already uses.');
    console.error('  If the increase is genuinely intended, re-run with --allow-increase.');
    process.exit(1);
  }
  fs.writeFileSync(BASELINE, JSON.stringify({
    note: 'Per-file count of addToast CALL SITES whose message holds English with no translation key. RATCHET: may only go down. Re-baseline with --update after removing some; an increase needs --allow-increase.',
    set: new Date().toISOString().slice(0, 10),
    total,
    files: counts,
  }, null, 2) + '\n');
  console.log('check_hardcoded_toast_text: baselined ' + total + ' hardcoded toast(s) across ' + Object.keys(counts).length + ' file(s).');
  process.exit(0);
}

if (!baseline) {
  console.error('check_hardcoded_toast_text: no baseline yet — run once with --update.');
  process.exit(1);
}

const regressions = [];
for (const [rel, n] of Object.entries(counts)) {
  const was = baseline.files[rel] || 0;
  if (n > was) regressions.push({ rel, was, now: n });
}

log('[check_hardcoded_toast_text] ' + total + ' hardcoded toast(s) across '
  + Object.keys(counts).length + ' file(s); baseline ' + baseline.total + '.');
if (errors.length && !QUIET) { console.log('  note: ' + errors.length + ' file(s) skipped:'); errors.slice(0, 5).forEach((e) => console.log('    ' + e)); }

if (regressions.length) {
  console.error('✗ toast text that no translator can reach increased in ' + regressions.length + ' file(s):');
  for (const r of regressions.slice(0, 20)) {
    console.error('\n  ' + r.rel + '  ' + r.was + ' → ' + r.now + '  (+' + (r.now - r.was) + ')');
    // The baseline stores counts, not positions, so the added strings cannot be
    // identified exactly. Show the last few in source order as a starting point.
    const shown = (details[r.rel] || []).slice(-(r.now - r.was));
    if (shown.length) console.error('      last ' + shown.length + ' in source order (check your diff for the actual additions):');
    for (const h of shown.slice(0, 6)) {
      console.error('      line ' + h.line + '  ' + JSON.stringify(h.text).slice(0, 70));
    }
  }
  console.error('\n  A bare string here has no key, so it is never shown to a translator and ships');
  console.error('  English in every language pack. Wrap it the way the file already does, e.g.');
  console.error("      addToast(__alloT('stem.<tool>.<key>', 'English text'), 'success')");
  console.error('  For an interpolated value use a {value1} placeholder rather than splitting the');
  console.error('  sentence, so a translator can reorder it.');
  console.error('  Inspect with: node dev-tools/check_hardcoded_toast_text.cjs --list <file>');
  process.exit(1);
}

if (total < baseline.total) {
  log('  ↓ ' + (baseline.total - total) + ' fewer than baseline — ratchet down with: node dev-tools/check_hardcoded_toast_text.cjs --update');
}
log('✓ check_hardcoded_toast_text: no file added untranslatable toast text.');
process.exit(0);
