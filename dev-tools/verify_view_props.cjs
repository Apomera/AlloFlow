#!/usr/bin/env node
// _verify_view_props.cjs — Pre-deploy gate for CDN JSX view extractions.
//
// Why this exists:
//   When extracting a `{activeView === 'X' && (...)}` JSX block to a CDN
//   view module (DBQ / Timeline / Glossary pattern), the host-side
//   invocation uses React.createElement with shorthand props:
//
//     React.createElement(window.AlloModules.GlossaryView, {
//       t, generatedContent, isEditingGlossary, /* ... shorthand */,
//       MemoryGame: window.AlloModules && window.AlloModules.MemoryGame
//     })
//
//   Each shorthand `{X}` expands to `{X: X}` — the right-hand X is a
//   BARE IDENTIFIER REFERENCE to host scope. If X isn't declared in
//   AlloFlowANTI.txt's enclosing scope, the entire JSX tree throws
//   `ReferenceError: X is not defined` at render time, before any prop
//   value is even computed. The app dies with the error boundary's
//   fallback UI.
//
//   This script catches phantom-ref props BEFORE deploy. Run it AFTER
//   modifying the React.createElement props list, BEFORE staging
//   AlloFlowANTI.txt for commit.
//
// Usage:
//   node _verify_view_props.cjs AlloFlowANTI.txt GlossaryView
//   node _verify_view_props.cjs AlloFlowANTI.txt TimelineView
//   node _verify_view_props.cjs AlloFlowANTI.txt DbqView
//
// Exit codes:
//   0  — all shorthand props declared in host
//   1  — one or more phantom refs (will throw ReferenceError at render)
//   2  — usage error / file not found / view name not found

'use strict';
const fs = require('fs');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node _verify_view_props.cjs <host-file.txt> <ViewName>');
  console.error('Example: node _verify_view_props.cjs AlloFlowANTI.txt GlossaryView');
  process.exit(2);
}

const HOST = args[0];
const VIEW = args[1];

if (!fs.existsSync(HOST)) {
  console.error('Host file not found: ' + HOST);
  process.exit(2);
}

const src = fs.readFileSync(HOST, 'utf8');
const lines = src.split('\n');

// Locate the React.createElement(window.AlloModules.<ViewName>, { ... }) call.
// The opening pattern looks like:
//   React.createElement(window.AlloModules.GlossaryView, {
const OPEN_RE = new RegExp('React\\.createElement\\s*\\(\\s*window\\.AlloModules\\.' + VIEW + '\\s*,\\s*\\{');
let openLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (OPEN_RE.test(lines[i])) { openLine = i; break; }
}
if (openLine === -1) {
  console.error('Could not find `React.createElement(window.AlloModules.' + VIEW + ', {` in ' + HOST);
  console.error('Either the view name is wrong, the extraction pattern differs, or the call lives elsewhere.');
  process.exit(2);
}

// Find the matching close `})` by tracking brace depth from the opening { on openLine.
// Cheap state machine: track strings/templates so braces inside don't fool us.
function findInvocationEnd(startLine, startCol) {
  let stack = ['code'];
  let depth = 0;
  let started = false;
  for (let j = startLine; j < lines.length; j++) {
    const L = lines[j];
    let k = (j === startLine) ? startCol : 0;
    while (k < L.length) {
      const top = stack[stack.length - 1];
      const c = L[k];
      const c2 = L.substring(k, k + 2);
      if (top === 'lc') { k++; continue; }
      if (top === 'bc') { if (c2 === '*/') { stack.pop(); k += 2; continue; } k++; continue; }
      if (top === 'sq' || top === 'dq') {
        if (c === '\\') { k += 2; continue; }
        const close = top === 'sq' ? "'" : '"';
        if (c === close) { stack.pop(); k++; continue; }
        k++; continue;
      }
      if (top === 'tpl') {
        if (c === '\\') { k += 2; continue; }
        if (c === '`') { stack.pop(); k++; continue; }
        if (c2 === '${') { stack.push('tplexpr'); k += 2; continue; }
        k++; continue;
      }
      if (c2 === '//') { stack.push('lc'); k += 2; continue; }
      if (c2 === '/*') { stack.push('bc'); k += 2; continue; }
      if (c === "'") { stack.push('sq'); k++; continue; }
      if (c === '"') { stack.push('dq'); k++; continue; }
      if (c === '`') { stack.push('tpl'); k++; continue; }
      if (c === '{') {
        if (top === 'tplexpr') stack.push('tplexpr');
        else { depth++; started = true; }
        k++; continue;
      }
      if (c === '}') {
        if (top === 'tplexpr') stack.pop();
        else { depth--; if (started && depth === 0) return { line: j, col: k }; }
        k++; continue;
      }
      k++;
    }
    if (stack[stack.length - 1] === 'lc') stack.pop();
  }
  return null;
}

const openCol = lines[openLine].indexOf('{', lines[openLine].indexOf(VIEW));
const close = findInvocationEnd(openLine, openCol);
if (!close) {
  console.error('Could not find matching close `})` for the React.createElement call starting at line ' + (openLine + 1));
  process.exit(2);
}

// Extract the props block content (lines between openLine and close.line, exclusive of opening { and closing })
const propsText = lines.slice(openLine, close.line + 1).join('\n')
  .substring(openCol + 1, undefined); // start after the opening {
// Now trim everything after the matching close (we have it in close), but lines.slice already gives us up to close.line
// Easier: rebuild from the full text using line indices
const fullSlice = lines.slice(openLine, close.line + 1).join('\n');
const startIdx = fullSlice.indexOf('{', fullSlice.indexOf(VIEW)) + 1;
const propsBlock = fullSlice.substring(startIdx, fullSlice.length - 2); // strip trailing })

// Extract shorthand prop names. Skip explicit value pairs `X: ...` (those are safe).
// Comments and whitespace are dropped.
const cleaned = propsBlock
  .replace(/\/\/[^\n]*/g, ' ')
  .replace(/\/\*[\s\S]*?\*\//g, ' ');

// Split on commas that aren't inside strings/braces. Cheap approximation:
// just split on `,` and look for either a bare identifier or `name: ...`
const propEntries = [];
{
  // Brace-aware split
  let depth = 0;
  let cur = '';
  let inStr = null;
  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (inStr) {
      if (c === '\\') { cur += c + cleaned[++i]; continue; }
      if (c === inStr) inStr = null;
      cur += c; continue;
    }
    if (c === "'" || c === '"' || c === '`') { inStr = c; cur += c; continue; }
    if (c === '{' || c === '(' || c === '[') depth++;
    else if (c === '}' || c === ')' || c === ']') depth--;
    if (c === ',' && depth === 0) { propEntries.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) propEntries.push(cur.trim());
}

const shorthand = [];
const explicit = [];
for (const e of propEntries) {
  if (!e) continue;
  // explicit: contains a `:` not inside a string
  const colonIdx = e.indexOf(':');
  if (colonIdx >= 0) {
    const name = e.substring(0, colonIdx).trim();
    if (/^[A-Za-z_$][\w$]*$/.test(name)) explicit.push(name);
  } else {
    if (/^[A-Za-z_$][\w$]*$/.test(e)) shorthand.push(e);
  }
}

console.log('=== ' + VIEW + ' invocation in ' + HOST + ' ===');
console.log('  Lines: ' + (openLine + 1) + '-' + (close.line + 1));
console.log('  Shorthand props (need host-scope decl): ' + shorthand.length);
console.log('  Explicit props (safe; value provided): ' + explicit.length);
console.log('');

// Build declared-set patterns for each shorthand prop. Catch:
//   const|let|var X = ...
//   function X(...
//   class X ...
//   [X, ...] = (and [_, X])
//   const { ..., X, ... } = obj;  ← the v1 audit MISSED this
function isDeclared(name, src) {
  const e = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp('\\b(?:const|let|var)\\s+' + e + '\\s*[=;:,)]', 'm'),
    new RegExp('\\bfunction\\s+' + e + '\\s*\\(', 'm'),
    new RegExp('\\bclass\\s+' + e + '\\b', 'm'),
    new RegExp('\\[\\s*' + e + '\\s*,', 'm'),
    new RegExp('\\[\\s*\\w+\\s*,\\s*' + e + '\\s*\\]', 'm'),
    new RegExp('\\bconst\\s*\\{[^}]*\\b' + e + '\\b[^}]*\\}\\s*=', 'm'),
    new RegExp('\\blet\\s*\\{[^}]*\\b' + e + '\\b[^}]*\\}\\s*=', 'm'),
    new RegExp('\\bvar\\s*\\{[^}]*\\b' + e + '\\b[^}]*\\}\\s*=', 'm'),
  ];
  for (const re of patterns) if (re.test(src)) return true;
  return false;
}

const phantoms = [];
for (const name of shorthand) {
  if (!isDeclared(name, src)) phantoms.push(name);
}

if (phantoms.length === 0) {
  console.log('✅ All shorthand props are declared in ' + HOST + '. Safe to deploy.');
  process.exit(0);
}

console.log('❌ ' + phantoms.length + ' PHANTOM REF(S) — these will throw ReferenceError at render time:');
console.log('');
for (const p of phantoms) console.log('  ' + p);
console.log('');
console.log('Fix: either (a) the prop is a typo — replace with the correct host-scope name,');
console.log('     or (b) the view does not actually need it — remove from BOTH the host invocation');
console.log('         AND the build script\'s `var X = props.X;` block.');
console.log('Re-run this verifier until "UNDECLARED: 0" before deploying.');
process.exit(1);
