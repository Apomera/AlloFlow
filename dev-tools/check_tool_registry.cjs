#!/usr/bin/env node
// check_tool_registry.cjs — Verify every StemLab.registerTool() / SelHub.registerTool()
// call provides the required schema fields.
//
// Why this exists:
//   AlloFlow's STEM Lab + SEL Hub modals depend on every registered tool
//   exposing a consistent set of fields:
//     - id (first arg, string)         — used as map key
//     - label                          — shown on the tile
//     - icon                           — shown on the tile
//     - desc                           — shown in tooltip / detail view
//     - color                          — used for tile theming
//     - category                       — used to group tiles
//     - render                         — called to mount the tool's UI
//
//   A missing field doesn't crash; it just produces a degraded tile (blank
//   icon, no description, ungrouped) or a silent failure to mount. These
//   bugs survive review because the modal still loads.
//
//   This check parses every registerTool call, extracts the top-level keys
//   in the config object, and reports any missing required fields.
//
// What it does NOT check (out of scope):
//   - Value types (e.g., is `icon` actually a string?). Most are written
//     correctly; type errors would manifest at render and get caught.
//   - questHooks shape (optional array; deep validation is much more work).
//   - Schema coverage of optional fields.
//
// Usage:
//   node dev-tools/check_tool_registry.cjs
//   node dev-tools/check_tool_registry.cjs --verbose   (list every tool)
//
// Exit codes:
//   0 — all registerTool calls have all required fields
//   1 — at least one missing field
//   2 — usage error / file not found

'use strict';
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const QUIET = args.includes('--quiet');

// Display-name aliases — runtime falls back across these (label || title || name || id)
const NAME_ALIASES = ['label', 'title', 'name'];
// Description aliases (desc || description)
const DESC_ALIASES = ['desc', 'description'];
// Strictly required — missing these means the tile genuinely won't work
const STRICT_REQUIRED = ['icon', 'render'];
// Has-runtime-default — missing these renders a default-themed tile (slate/general).
// Reported as informational warnings, not blocking violations.
const DEFAULTED_FIELDS = ['color', 'category'];

const REGISTRIES = [
  { name: 'StemLab', dir: path.join(ROOT, 'stem_lab'), pattern: /window\.StemLab\.registerTool\s*\(\s*['"]([a-zA-Z][a-zA-Z0-9_$]*)['"]\s*,\s*\{/ },
  { name: 'SelHub',  dir: path.join(ROOT, 'sel_hub'),  pattern: /window\.SelHub\.registerTool\s*\(\s*['"]([a-zA-Z][a-zA-Z0-9_$]*)['"]\s*,\s*\{/ },
];

// ──────────────────────────────────────────────────────────────────────────
// Brace-matching: find the closing `}` of the config object literal that
// starts at `openBracePos` (which points to the `{` itself). Skips over
// strings, template literals, and nested braces. Conservative — relies on
// the fact that registerTool configs are well-formed JS object literals.
// ──────────────────────────────────────────────────────────────────────────
function findClosingBrace(src, openBracePos) {
  let depth = 0;
  let i = openBracePos;
  let inStr = null;
  while (i < src.length) {
    const c = src[i];
    if (inStr) {
      if (c === '\\') { i += 2; continue; }
      if (c === inStr) inStr = null;
      i++;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { inStr = c; i++; continue; }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      if (end === -1) return -1;
      i = end + 2;
      continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      const end = src.indexOf('\n', i);
      if (end === -1) return -1;
      i = end + 1;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

// ──────────────────────────────────────────────────────────────────────────
// Extract top-level field NAMES from a config object literal body. Skip
// over nested objects/arrays/functions to avoid catching their inner keys.
// ──────────────────────────────────────────────────────────────────────────
function extractTopLevelKeys(configBody) {
  // Strip nested {...}, [...], strings, comments to leave only top-level
  // `key: value,` separators visible.
  let stripped = '';
  let i = 0;
  let depth = 0;
  let inStr = null;
  while (i < configBody.length) {
    const c = configBody[i];
    if (inStr) {
      if (c === '\\') { stripped += '  '; i += 2; continue; }
      if (c === inStr) { stripped += ' '; inStr = null; i++; continue; }
      stripped += ' ';
      i++;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { inStr = c; stripped += ' '; i++; continue; }
    if (c === '/' && configBody[i + 1] === '*') {
      const end = configBody.indexOf('*/', i + 2);
      if (end === -1) break;
      for (let k = i; k < end + 2; k++) stripped += (configBody[k] === '\n' ? '\n' : ' ');
      i = end + 2;
      continue;
    }
    if (c === '/' && configBody[i + 1] === '/') {
      const end = configBody.indexOf('\n', i);
      if (end === -1) break;
      stripped += ' '.repeat(end - i);
      i = end;
      continue;
    }
    if (c === '{' || c === '[' || c === '(') depth++;
    if (c === '}' || c === ']' || c === ')') depth--;
    // Only emit identifier-shaped chars + colons + commas at depth 0
    if (depth === 0) {
      stripped += c;
    } else {
      stripped += (c === '\n' ? '\n' : ' ');
    }
    i++;
  }
  // Now extract identifiers followed by ':'
  const keyRe = /(?:^|[\s,{])([a-zA-Z_$][\w$]*)\s*:/g;
  const keys = new Set();
  let m;
  while ((m = keyRe.exec(stripped)) !== null) keys.add(m[1]);
  return keys;
}

// ──────────────────────────────────────────────────────────────────────────
// Scan a registry directory
// ──────────────────────────────────────────────────────────────────────────
function lineOf(src, pos) {
  let line = 1;
  for (let i = 0; i < pos; i++) if (src[i] === '\n') line++;
  return line;
}

function scanRegistry(reg) {
  const tools = [];
  if (!fs.existsSync(reg.dir)) return tools;
  const files = fs.readdirSync(reg.dir).filter(f => f.endsWith('.js') && !f.startsWith('_'));
  for (const file of files) {
    const filePath = path.join(reg.dir, file);
    const src = fs.readFileSync(filePath, 'utf-8');
    // Use acorn to walk the AST and find every `window.<reg.name>.registerTool(id, {...})`.
    // Acorn correctly handles strings, regex literals, template literals, and comments —
    // the previous custom brace-matcher false-positived on regex content (e.g., cyberDefense).
    let ast;
    try {
      ast = acorn.parse(src, {
        ecmaVersion: 2022, allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true,
        allowImportExportEverywhere: true, allowHashBang: true, allowSuperOutsideMethod: true,
        locations: true,
      });
    } catch (e) {
      tools.push({ id: '<file>', file, line: 1, keys: new Set(), error: 'acorn parse failed: ' + e.message });
      continue;
    }
    function walk(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (node.type === 'CallExpression'
          && node.callee && node.callee.type === 'MemberExpression'
          && node.callee.property && node.callee.property.name === 'registerTool'
          && node.callee.object && node.callee.object.type === 'MemberExpression'
          && node.callee.object.object && node.callee.object.object.name === 'window'
          && node.callee.object.property && node.callee.object.property.name === reg.name
          && node.arguments && node.arguments.length >= 2
          && node.arguments[0].type === 'Literal' && typeof node.arguments[0].value === 'string'
          && node.arguments[1].type === 'ObjectExpression') {
        const id = node.arguments[0].value;
        const keys = new Set(
          node.arguments[1].properties
            .filter(p => p.type === 'Property' && p.key && (p.key.type === 'Identifier' || p.key.type === 'Literal'))
            .map(p => p.key.type === 'Identifier' ? p.key.name : p.key.value)
        );
        tools.push({ id, file, line: node.loc.start.line, keys, error: null });
      }
      for (const k of Object.keys(node)) {
        if (k === 'loc' || k === 'start' || k === 'end' || k === 'range') continue;
        if (node[k] && typeof node[k] === 'object') walk(node[k]);
      }
    }
    walk(ast);
  }
  return tools;
}

// ──────────────────────────────────────────────────────────────────────────
// Run + report
// ──────────────────────────────────────────────────────────────────────────
const allViolations = [];   // blocking — missing strict-required fields
const allWarnings = [];     // informational — missing defaulted fields
const allTools = [];

for (const reg of REGISTRIES) {
  const tools = scanRegistry(reg);
  allTools.push(...tools.map(t => ({ ...t, registry: reg.name })));
  for (const t of tools) {
    if (t.error) {
      allViolations.push({ ...t, registry: reg.name, missing: ['<parse error: ' + t.error + '>'] });
      continue;
    }
    const strictMissing = [];
    const defaultedMissing = [];
    // Display name: any of label/title/name satisfies the contract
    if (!NAME_ALIASES.some(a => t.keys.has(a))) strictMissing.push('label/title/name');
    // Description: any of desc/description satisfies
    if (!DESC_ALIASES.some(a => t.keys.has(a))) defaultedMissing.push('desc/description');
    // Strict required fields
    for (const f of STRICT_REQUIRED) if (!t.keys.has(f)) strictMissing.push(f);
    // Defaulted fields (warning only)
    for (const f of DEFAULTED_FIELDS) if (!t.keys.has(f)) defaultedMissing.push(f);

    if (strictMissing.length > 0) {
      allViolations.push({ ...t, registry: reg.name, missing: strictMissing });
    } else if (defaultedMissing.length > 0) {
      allWarnings.push({ ...t, registry: reg.name, missing: defaultedMissing });
    }
  }
}

if (!QUIET || allViolations.length > 0) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   AlloFlow Tool Registry Contract Check                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('  Strict required: any-of[' + NAME_ALIASES.join('/') + '], ' + STRICT_REQUIRED.join(', '));
  console.log('  Recommended (defaulted at runtime): any-of[' + DESC_ALIASES.join('/') + '], ' + DEFAULTED_FIELDS.join(', '));
  console.log('  StemLab tools:   ' + allTools.filter(t => t.registry === 'StemLab').length);
  console.log('  SelHub tools:    ' + allTools.filter(t => t.registry === 'SelHub').length);
  console.log('');
}

if (allViolations.length > 0) {
  console.log('═══ ✗ STRICT VIOLATIONS (' + allViolations.length + ') — tile will fail to render (missing render/icon or unparseable) ═══');
  console.log('');
  for (const v of allViolations) {
    console.log('  ✗ ' + v.registry + '.' + v.id + '  (' + v.file + ':' + v.line + ')');
    console.log('      Missing: ' + v.missing.join(', '));
    if (VERBOSE) console.log('      Has:     ' + [...v.keys].join(', '));
    console.log('');
  }
}

if (allWarnings.length > 0 && (VERBOSE || allViolations.length === 0)) {
  console.log('═══ ⚠ INFORMATIONAL (' + allWarnings.length + ') — runtime defaults applied (slate color / general category / empty desc) ═══');
  console.log('     Tiles render fine but are uniformly grey/ungrouped. Add explicit fields for visual diversity.');
  console.log('');
  for (const v of allWarnings.slice(0, 30)) {
    console.log('  ⚠ ' + v.registry + '.' + v.id + '  (' + v.file + ':' + v.line + ')');
    console.log('      Defaulted: ' + v.missing.join(', '));
  }
  if (allWarnings.length > 30) console.log('  (... ' + (allWarnings.length - 30) + ' more, run --verbose)');
  console.log('');
}

if (VERBOSE && allViolations.length === 0) {
  console.log('═══ ✓ All tools (' + allTools.length + ') ═══');
  for (const t of allTools) {
    console.log('  ✓ ' + t.registry + '.' + t.id + '  (' + t.file + ':' + t.line + ') — ' + t.keys.size + ' fields');
  }
  console.log('');
}

console.log('  ✓ OK:           ' + (allTools.length - allViolations.length - allWarnings.length));
console.log('  ⚠ Defaulted:    ' + allWarnings.length + ' (informational)');
console.log('  ✗ Violations:   ' + allViolations.length);
console.log('');

if (allViolations.length === 0) {
  if (allWarnings.length === 0) {
    console.log('  ✅ All ' + allTools.length + ' registered tools satisfy the strict contract.');
  } else {
    console.log('  ✅ Strict contract passes (' + allWarnings.length + ' tools using runtime defaults — see --verbose).');
  }
} else {
  console.log('  ❌ ' + allViolations.length + ' tool' + (allViolations.length === 1 ? '' : 's') + ' missing strictly-required fields.');
}
console.log('');

process.exit(allViolations.length > 0 ? 1 : 0);
