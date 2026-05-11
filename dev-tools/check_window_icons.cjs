#!/usr/bin/env node
// check_window_icons.cjs — Verify every lucide-react icon imported at the top
// of AlloFlowANTI.txt is also assigned to window in the Object.assign(window,…)
// IIFE blocks.
//
// Why this exists:
//   CDN view modules (extracted from AlloFlowANTI.txt) reference lucide icons
//   as `window.IconName` — they cannot import directly from lucide-react,
//   because the modules are loaded as standalone IIFE scripts from jsdelivr
//   that have no module system or bundler.
//
//   For this to work, the host (AlloFlowANTI.txt) must explicitly assign
//   every imported icon to window via:
//
//     Object.assign(window, { AlertCircle, AlertTriangle, ArrowLeft, ... });
//
//   If an icon is imported (so JSX inside the monolith works) but not
//   assigned to window, then ANY extracted module that uses that icon
//   renders an empty `undefined` element — silently — with no console
//   error. Users see a missing icon and nothing else.
//
//   May 2026 HeaderBar extraction shipped with 22 missing icons in
//   window assignment, all rendering as empty noops. Memory:
//   feedback_cdn_modules_need_icons_on_window.md.
//
// What this check does:
//   1. Parses every `import { ... } from 'lucide-react'` statement in
//      AlloFlowANTI.txt. Handles `Image as ImageIcon` style aliases.
//   2. Locates each `Object.assign(window, { ... })` block.
//      Extracts the set of identifiers being assigned.
//   3. Reports any imported icon NOT in EVERY Object.assign(window) block.
//
//   It also checks the window.AlloIcons = {…} assignment if present.
//
// What this check does NOT do:
//   - Validate that every window.X usage in a *_module.js is actually
//     imported by AlloFlowANTI.txt (different bug class — covered by
//     verify_extraction.cjs / verify_module_registry.cjs).
//   - Verify that the icon is from lucide-react vs another icon set
//     (lucide is the only icon library used; this is an assumption).
//
// Usage:
//   node dev-tools/check_window_icons.cjs
//   node dev-tools/check_window_icons.cjs --verbose
//   node dev-tools/check_window_icons.cjs --quiet
//
// Exit codes:
//   0 — every imported lucide icon is in every window-assignment block
//   1 — at least one icon imported but not assigned
//   2 — usage error / file not found

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ANTI_FILE = path.join(ROOT, 'AlloFlowANTI.txt');

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const QUIET = args.includes('--quiet');

function log(s) { if (!QUIET) console.log(s); }

if (!fs.existsSync(ANTI_FILE)) {
  console.error('AlloFlowANTI.txt not found at: ' + ANTI_FILE);
  process.exit(2);
}

const src = fs.readFileSync(ANTI_FILE, 'utf8');

// ──────────────────────────────────────────────────────────────────────────
// Step 1: collect every imported name from `import {...} from 'lucide-react'`.
// Handle `Foo as Bar` aliases — the *aliased name* is what shows up in JSX.
// ──────────────────────────────────────────────────────────────────────────
const importRe = /import\s*\{([\s\S]*?)\}\s*from\s*['"]lucide-react['"]/g;
const importedIcons = new Set();
let im;
while ((im = importRe.exec(src)) !== null) {
  const body = im[1];
  // Split on commas, then trim each entry
  for (const raw of body.split(',')) {
    const entry = raw.trim();
    if (!entry) continue;
    // `Image as ImageIcon` → use ImageIcon
    // `ArrowRight` → use ArrowRight
    const aliasMatch = entry.match(/^[\w$]+\s+as\s+([\w$]+)$/);
    if (aliasMatch) {
      importedIcons.add(aliasMatch[1]);
    } else if (/^[\w$]+$/.test(entry)) {
      importedIcons.add(entry);
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Step 2: find every `Object.assign(window, { ... })` block.
// For each, extract the identifiers being assigned. Shorthand only
// (`{Foo, Bar, Baz}`) — explicit `Foo: SomethingElse` would be unusual
// but handle it: take the key, not the value, since the value can be an
// expression.
// ──────────────────────────────────────────────────────────────────────────
const objAssignRe = /Object\.assign\s*\(\s*window\s*,\s*\{/g;
const assignBlocks = [];
let am;
while ((am = objAssignRe.exec(src)) !== null) {
  const openBrace = src.indexOf('{', am.index);
  // Bracket-match to find closing }
  let depth = 0, i = openBrace, end = -1, inStr = null;
  while (i < src.length) {
    const c = src[i];
    if (inStr) {
      if (c === '\\') { i += 2; continue; }
      if (c === inStr) inStr = null;
      i++; continue;
    }
    if (c === "'" || c === '"' || c === '`') { inStr = c; i++; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
    i++;
  }
  if (end < 0) continue;
  const body = src.slice(openBrace + 1, end);
  const lineNum = src.slice(0, openBrace).split('\n').length;
  // Extract shorthand keys: any `\bIdentifier\b` followed by , or } (not after `:`)
  const idents = new Set();
  // Strip the comments first
  const cleaned = body.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  // Match identifiers — shorthand or `key: value` (take the key)
  const idRe = /\b([A-Z][\w$]*)\s*(?:[:,}]|$)/gm;
  let idm;
  while ((idm = idRe.exec(cleaned)) !== null) {
    idents.add(idm[1]);
  }
  assignBlocks.push({ line: lineNum, idents });
}

// Also check window.AlloIcons = { … } assignment, if present.
const alloIconsRe = /window\.AlloIcons\s*=\s*\{/g;
const alloIconBlocks = [];
let aim;
while ((aim = alloIconsRe.exec(src)) !== null) {
  const openBrace = src.indexOf('{', aim.index);
  let depth = 0, i = openBrace, end = -1, inStr = null;
  while (i < src.length) {
    const c = src[i];
    if (inStr) {
      if (c === '\\') { i += 2; continue; }
      if (c === inStr) inStr = null;
      i++; continue;
    }
    if (c === "'" || c === '"' || c === '`') { inStr = c; i++; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
    i++;
  }
  if (end < 0) continue;
  const body = src.slice(openBrace + 1, end);
  const lineNum = src.slice(0, openBrace).split('\n').length;
  const cleaned = body.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const idents = new Set();
  const idRe = /\b([A-Z][\w$]*)\s*(?:[:,}]|$)/gm;
  let idm;
  while ((idm = idRe.exec(cleaned)) !== null) {
    idents.add(idm[1]);
  }
  alloIconBlocks.push({ line: lineNum, idents });
}

// ──────────────────────────────────────────────────────────────────────────
// Step 3: diff
// ──────────────────────────────────────────────────────────────────────────
log('');
log('Window icon-assignment audit');
log('────────────────────────────');
log('  Icons imported from lucide-react: ' + importedIcons.size);
log('  Object.assign(window,…) blocks:   ' + assignBlocks.length + (assignBlocks.length ? '  (lines ' + assignBlocks.map(b => b.line).join(', ') + ')' : ''));
log('  window.AlloIcons = {…} blocks:    ' + alloIconBlocks.length + (alloIconBlocks.length ? '  (lines ' + alloIconBlocks.map(b => b.line).join(', ') + ')' : ''));
log('');

if (assignBlocks.length === 0) {
  console.error('  ✗ No Object.assign(window, {...}) blocks found — extracted modules will have no icons.');
  process.exit(1);
}

// Each imported icon should be in EVERY Object.assign(window) block.
// AlloIcons is a secondary catalog; we report missing icons there as informational.
let fail = false;
const missingPerBlock = new Map(); // line → [missing icons]
for (const block of assignBlocks) {
  const missing = [];
  for (const icon of importedIcons) {
    if (!block.idents.has(icon)) missing.push(icon);
  }
  if (missing.length > 0) {
    missingPerBlock.set(block.line, missing);
    fail = true;
  }
}

const missingFromAlloIcons = new Set();
if (alloIconBlocks.length > 0) {
  // Use UNION of AlloIcons blocks (any block defining it is sufficient — they're meant to mirror)
  const union = new Set();
  for (const b of alloIconBlocks) for (const id of b.idents) union.add(id);
  for (const icon of importedIcons) {
    if (!union.has(icon)) missingFromAlloIcons.add(icon);
  }
}

if (fail) {
  log('  ✗ Icons imported but missing from at least one Object.assign(window) block:');
  log('');
  for (const [line, missing] of missingPerBlock) {
    log('    Block at line ' + line + ' missing ' + missing.length + ' icon(s):');
    // group for readability
    const sorted = [...missing].sort();
    const groups = [];
    for (let i = 0; i < sorted.length; i += 6) groups.push(sorted.slice(i, i + 6).join(', '));
    for (const g of groups) log('      ' + g);
    log('');
  }
  log('  Fix: add the missing identifiers to the Object.assign(window, { ... }) block(s) above.');
  log('       Extracted CDN modules reference these via window.IconName and render empty if missing.');
  log('');
}

if (missingFromAlloIcons.size > 0) {
  log('  ⊙ ' + missingFromAlloIcons.size + ' imported icon(s) not in window.AlloIcons union (informational):');
  const sorted = [...missingFromAlloIcons].sort();
  const groups = [];
  for (let i = 0; i < sorted.length; i += 6) groups.push(sorted.slice(i, i + 6).join(', '));
  for (const g of groups) log('      ' + g);
  log('');
  log('     window.AlloIcons is a secondary catalog used by some modules. Adding here is a nice-to-have.');
  log('');
}

if (VERBOSE) {
  log('  Imported icons (' + importedIcons.size + '):');
  const sorted = [...importedIcons].sort();
  const groups = [];
  for (let i = 0; i < sorted.length; i += 6) groups.push(sorted.slice(i, i + 6).join(', '));
  for (const g of groups) log('      ' + g);
  log('');
}

if (!fail) {
  log('  ✅ All ' + importedIcons.size + ' imported lucide icons are assigned to window in every Object.assign block.');
  log('');
}

process.exit(fail ? 1 : 0);
