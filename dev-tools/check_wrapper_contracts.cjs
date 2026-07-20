#!/usr/bin/env node
/**
 * Wrapper-contract gate (2026-07-20).
 *
 * AlloFlowANTI.txt delegates ~100 functions to CDN modules through thin
 * wrappers:  const NAME = (…) => { const _m = window.AlloModules && …;
 *            if (_m && typeof _m.NAME === 'function') return _m.NAME(args…);
 *
 * The 2026-07-20 playSequence outage was a SEAM bug: the wrapper's signature
 * drifted from the module's calling convention, and the deps object landed in
 * contentId — disabling capture and stored-audio reuse with zero errors.
 * This gate re-derives, for every wrapper it can parse:
 *
 *   forwarded-argument count (top-level, brace/paren/string-aware)
 *      vs
 *   the module source's parameter count for that function
 *
 * and fails on mismatch unless the pair is explicitly allowlisted with a
 * reason. Run standalone (node dev-tools/check_wrapper_contracts.cjs) or via
 * tests/wrapper_contracts.test.js.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const anti = fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8');

// AlloModules registry name → source file that defines the functions.
const MODULE_SOURCES = {
  PureHelpers: 'pure_helpers_source.jsx',
  TextPipelineHelpers: 'text_pipeline_helpers_source.jsx',
  AnnotationSuite: 'annotation_suite_source.jsx',
  ExportHandlers: 'export_handlers_source.jsx',
  PhaseOHandlers: 'phase_o_handlers_source.jsx',
  PhaseKHelpers: 'phase_k_helpers_source.jsx',
  PhaseNHelpers: 'phase_n_helpers_source.jsx',
  MathHelpers: 'math_helpers_source.jsx',
  CmapHandlers: 'cmap_handlers_source.jsx',
  ViewRenderers: 'view_renderers_source.jsx',
  GenerationHelpers: 'generation_helpers_source.jsx',
  TextUtilityHelpers: 'text_utility_helpers_source.jsx',
  AudioHelpers: 'audio_helpers_source.jsx',
};

// Known-intentional signature differences: 'Module.fn': 'reason'.
const ALLOWLIST = {
  // The host wrapper injects its own freshly-built deps object; the module's
  // trailing params beyond the forwarded list default safely.
};

function fileFor(moduleName) {
  const file = MODULE_SOURCES[moduleName];
  if (!file) return null;
  const full = path.join(ROOT, file);
  return fs.existsSync(full) ? full : null;
}

// Count top-level arguments of a call/params text (no surrounding parens),
// aware of (), {}, [], template literals, strings, and comments.
function countTopLevel(text) {
  let depth = 0;
  let count = 0;
  let sawToken = false;
  let i = 0;
  const n = text.length;
  let mode = null; // null | '"' | "'" | '`' | 'line' | 'block'
  while (i < n) {
    const ch = text[i];
    const next = text[i + 1];
    if (mode === 'line') { if (ch === '\n') mode = null; i++; continue; }
    if (mode === 'block') { if (ch === '*' && next === '/') { mode = null; i += 2; continue; } i++; continue; }
    if (mode === '"' || mode === "'" || mode === '`') {
      if (ch === '\\') { i += 2; continue; }
      if (ch === mode) mode = null;
      i++; continue;
    }
    if (ch === '/' && next === '/') { mode = 'line'; i += 2; continue; }
    if (ch === '/' && next === '*') { mode = 'block'; i += 2; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { mode = ch; i++; continue; }
    if (ch === '(' || ch === '{' || ch === '[') { depth++; sawToken = true; i++; continue; }
    if (ch === ')' || ch === '}' || ch === ']') { depth--; i++; continue; }
    if (ch === ',' && depth === 0) { count++; i++; continue; }
    if (!/\s/.test(ch)) sawToken = true;
    i++;
  }
  return sawToken ? count + 1 : 0;
}

// Extract the parenthesized text starting at `openIndex` (which must point at
// '('), honoring nesting/strings. Returns { inner, endIndex } or null.
function extractParens(text, openIndex) {
  if (text[openIndex] !== '(') return null;
  let depth = 0;
  let mode = null;
  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (mode === 'line') { if (ch === '\n') mode = null; continue; }
    if (mode === 'block') { if (ch === '*' && next === '/') { mode = null; i++; } continue; }
    if (mode) { if (ch === '\\') { i++; continue; } if (ch === mode) mode = null; continue; }
    if (ch === '/' && next === '/') { mode = 'line'; continue; }
    if (ch === '/' && next === '*') { mode = 'block'; i++; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { mode = ch; continue; }
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return { inner: text.slice(openIndex + 1, i), endIndex: i };
    }
  }
  return null;
}

// Find `_m.NAME(`-style forwards in ANTI together with the module they came from.
function collectForwards() {
  const forwards = [];
  const wrapperRe = /const _m = window\.AlloModules && window\.AlloModules\.([A-Za-z0-9_]+);/g;
  let match;
  while ((match = wrapperRe.exec(anti)) !== null) {
    const moduleName = match[1];
    // Search the following ~40 lines for the first `_m.fn(` forward.
    const windowText = anti.slice(match.index, match.index + 4000);
    const forwardMatch = windowText.match(/_m\.([A-Za-z0-9_]+)\s*\(/);
    if (!forwardMatch) continue;
    const absoluteOpen = match.index + forwardMatch.index + forwardMatch[0].length - 1;
    const parens = extractParens(anti, absoluteOpen);
    if (!parens) continue;
    forwards.push({
      module: moduleName,
      fn: forwardMatch[1],
      argCount: countTopLevel(parens.inner),
      line: anti.slice(0, match.index).split('\n').length,
    });
  }
  return forwards;
}

// Split a params text into top-level entries (same lexer rules as
// countTopLevel) and classify: required (no default), defaulted, rest.
function analyzeParams(inner) {
  const entries = [];
  let depth = 0;
  let mode = null;
  let current = '';
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    const next = inner[i + 1];
    if (mode === 'line') { if (ch === '\n') mode = null; continue; }
    if (mode === 'block') { if (ch === '*' && next === '/') { mode = null; i++; } continue; }
    if (mode) { current += ch; if (ch === '\\') { current += next || ''; i++; continue; } if (ch === mode) mode = null; continue; }
    if (ch === '/' && next === '/') { mode = 'line'; continue; }
    if (ch === '/' && next === '*') { mode = 'block'; i++; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { mode = ch; current += ch; continue; }
    if (ch === '(' || ch === '{' || ch === '[') { depth++; current += ch; continue; }
    if (ch === ')' || ch === '}' || ch === ']') { depth--; current += ch; continue; }
    if (ch === ',' && depth === 0) { entries.push(current); current = ''; continue; }
    current += ch;
  }
  if (current.trim() !== '' || entries.length) entries.push(current);
  const cleaned = entries.map((entry) => entry.trim()).filter(Boolean);
  const hasRest = cleaned.some((entry) => entry.startsWith('...'));
  const required = cleaned.filter((entry) => !entry.includes('=') && !entry.startsWith('...')).length;
  return { total: cleaned.length, required, hasRest };
}

// Find NAME's parameter shape in a module source.
function moduleParamShape(sourceText, fnName) {
  const patterns = [
    new RegExp('(?:const|let|var)\\s+' + fnName + '\\s*=\\s*(?:async\\s*)?\\('),
    new RegExp('(?:async\\s+)?function\\s+' + fnName + '\\s*\\('),
    new RegExp('\\b' + fnName + '\\s*:\\s*(?:async\\s*)?\\('),
  ];
  for (const re of patterns) {
    const m = sourceText.match(re);
    if (!m) continue;
    const open = m.index + m[0].length - 1;
    const parens = extractParens(sourceText, open);
    if (!parens) continue;
    return analyzeParams(parens.inner);
  }
  return null;
}

function main() {
  const forwards = collectForwards();
  const failures = [];
  let checked = 0;
  let skipped = 0;
  const sourceCache = {};
  for (const forward of forwards) {
    const key = forward.module + '.' + forward.fn;
    const file = fileFor(forward.module);
    if (!file) { skipped++; continue; }
    if (!(file in sourceCache)) sourceCache[file] = fs.readFileSync(file, 'utf8');
    const shape = moduleParamShape(sourceCache[file], forward.fn);
    if (shape == null) { skipped++; continue; }
    checked++;
    const overSupplied = !shape.hasRest && forward.argCount > shape.total;
    const underSupplied = forward.argCount < shape.required;
    if ((overSupplied || underSupplied) && !(key in ALLOWLIST)) {
      failures.push(
        key + ' (ANTI line ' + forward.line + '): wrapper forwards ' + forward.argCount +
        ' arg(s) but the module expects ' + shape.required + '–' + (shape.hasRest ? '∞' : shape.total) +
        ' — the playSequence-class seam bug.'
      );
    }
  }
  console.log('[wrapper-contracts] forwards found: ' + forwards.length +
    ' · checked: ' + checked + ' · skipped (no source mapping / unparsable): ' + skipped);
  if (failures.length) {
    failures.forEach((failure) => console.error('  ✗ ' + failure));
    console.error('✗ check_wrapper_contracts: ' + failures.length + ' seam mismatch(es).');
    process.exit(1);
  }
  console.log('✓ check_wrapper_contracts: every parsable host↔module seam agrees on arity.');
}

main();
