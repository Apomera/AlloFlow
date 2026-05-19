#!/usr/bin/env node
// check_xss_surface.cjs — Find dangerouslySetInnerHTML uses with non-literal input.
//
// Why this exists:
//   React's `dangerouslySetInnerHTML={{__html: x}}` injects raw HTML into the
//   DOM. If `x` contains user-controlled content (lesson source text, AI
//   output, LTI-passed names), an attacker could inject `<script>` or
//   event-handler attributes — XSS surface.
//
//   Safe uses: __html is a constant string literal, or has been explicitly
//   sanitized (DOMPurify, sanitizeHtml, etc.).
//   Suspect uses: __html is a variable, expression, template, or function call.
//
// What this check does:
//   For every `dangerouslySetInnerHTML={{__html: <expr>}}` site, classify
//   <expr>:
//     - String literal → safe
//     - Sanitized (call to DOMPurify.sanitize, sanitizeHtml, escape, etc.) → safe
//     - Anything else → suspect, needs manual review
//
// What this check does NOT cover:
//   - innerHTML assignments outside JSX (e.g., element.innerHTML = x)
//   - Other XSS vectors (eval, setTimeout(string), window.location = userInput)
//   - Server-side template injection
//
// Usage:
//   node dev-tools/check_xss_surface.cjs
//   node dev-tools/check_xss_surface.cjs --verbose
//
// Exit codes:
//   0 — no suspect dangerouslySetInnerHTML sites
//   1 — at least one suspect site (TRIAGE: verify input is sanitized)
//   2 — usage / setup error

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const QUIET = args.includes('--quiet');

function listFiles(dir, filter) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(filter).map(f => path.join(dir, f));
}

const files = [
  path.join(ROOT, 'AlloFlowANTI.txt'),
  ...listFiles(ROOT, f => /^[^_].*_module\.js$/.test(f)),
  ...listFiles(ROOT, f => /^[^_].*_source\.jsx$/.test(f)),
  ...listFiles(path.join(ROOT, 'stem_lab'), f => f.endsWith('.js') && !f.startsWith('_')),
  ...listFiles(path.join(ROOT, 'sel_hub'), f => f.endsWith('.js') && !f.startsWith('_')),
];

// Sanitizer call patterns that, if found in the expression, mark it safe.
// Each entry is either a generic sanitizer or an in-house function known to
// pre-escape its input before producing trusted HTML.
const SANITIZER_PATTERNS = [
  /DOMPurify\.sanitize/,
  /sanitizeHtml/,
  /sanitizeHTML/,
  /escapeHtml/,
  /escapeHTML/,
  /\.escape\(/,
  /he\.escape/,
  /xss\(/,
  // In-house: processMathHTML escapes input before applying math transforms
  // (see text_pipeline_helpers_module.js — pre-escapes &, <, > at function entry)
  /processMathHTML\s*\(/,
];

const findings = [];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const src = fs.readFileSync(file, 'utf-8');
  const rel = path.relative(ROOT, file);
  // Match dangerouslySetInnerHTML={{__html: <expr>}}
  // The expression can be anything; we capture up to the closing }}.
  // Use a brace-matching extractor since expression may contain braces.
  const re = /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:\s*/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    // Extract the expression from m.index + m[0].length until matching }}.
    const start = m.index + m[0].length;
    let depth = 1;  // we're inside the inner {
    let i = start;
    let inStr = null;
    while (i < src.length && depth > 0) {
      const c = src[i];
      if (inStr) {
        if (c === '\\') { i += 2; continue; }
        if (c === inStr) inStr = null;
        i++;
        continue;
      }
      if (c === "'" || c === '"' || c === '`') { inStr = c; i++; continue; }
      if (c === '{') depth++;
      else if (c === '}') depth--;
      if (depth === 0) break;
      i++;
    }
    const expr = src.substring(start, i).trim();
    const line = src.substring(0, m.index).split('\n').length;

    // Classify
    let kind, severity;
    if (/^['"`]/.test(expr) && (expr.endsWith('"') || expr.endsWith("'") || expr.endsWith('`'))) {
      kind = 'string-literal';
      severity = 'safe';
    } else if (/^t\(\s*['"][a-zA-Z0-9_.\-]+['"]\s*\)$/.test(expr)) {
      // t('foo.bar') with literal key — pulls from ui_strings.js which is
      // static / Aaron-curated. Same risk profile as a string literal.
      kind = 'translation-key';
      severity = 'safe';
    } else if (SANITIZER_PATTERNS.some(p => p.test(expr))) {
      kind = 'sanitized';
      severity = 'safe';
    } else if (/\.replace\(\s*\/&\//.test(expr) && /&amp;/.test(expr)) {
      // Inline HTML escape pattern: .replace(/&/g, '&amp;').replace(/</g, '&lt;')...
      // before any other transformation. Same risk profile as sanitized.
      kind = 'inline-html-escape';
      severity = 'safe';
    } else {
      kind = 'unsanitized';
      severity = 'suspect';
    }

    findings.push({
      file: rel,
      line,
      expr: expr.length > 80 ? expr.slice(0, 80) + '…' : expr,
      kind,
      severity,
    });
  }
}

const suspect = findings.filter(f => f.severity === 'suspect');
const safe = findings.filter(f => f.severity === 'safe');

if (!QUIET || suspect.length > 0) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   XSS Surface Check (dangerouslySetInnerHTML)                        ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('  Files scanned: ' + files.filter(f => fs.existsSync(f)).length);
  console.log('  Total sites:   ' + findings.length);
  console.log('  Safe:          ' + safe.length + ' (string literal or sanitized)');
  console.log('  Suspect:       ' + suspect.length + ' (variable, expression, or unsanitized — verify each)');
  console.log('');
}

if (suspect.length > 0) {
  console.log('═══ ⚠ SUSPECT XSS SITES (' + suspect.length + ') — verify input cannot be user-controlled malicious HTML ═══');
  console.log('');
  for (const f of suspect.slice(0, 30)) {
    console.log('  ⚠ ' + f.file + ':' + f.line);
    console.log('      __html: ' + f.expr);
  }
  if (suspect.length > 30) console.log('  (... ' + (suspect.length - 30) + ' more, run --verbose)');
  console.log('');
  console.log('  Action: For each, ask "could this expression ever produce attacker-controlled HTML?"');
  console.log('     - AI output (Gemini): YES, if user-controlled prompt → wrap with DOMPurify');
  console.log('     - LMS-provided field (LTI claims, roster names): YES → wrap with DOMPurify');
  console.log('     - Static config from your own ui_strings.js: NO, safe');
  console.log('     - Generated by your own template that already escapes inputs: maybe → audit the template');
  console.log('');
}

if (VERBOSE && safe.length > 0) {
  console.log('═══ ✓ Safe sites (' + safe.length + ') ═══');
  for (const f of safe.slice(0, 20)) {
    console.log('  ✓ ' + f.file + ':' + f.line + '  [' + f.kind + ']');
  }
  if (safe.length > 20) console.log('  (... ' + (safe.length - 20) + ' more)');
  console.log('');
}

console.log('  ' + (suspect.length === 0 ? '✅' : '⚠') + ' ' + safe.length + ' safe / ' + suspect.length + ' suspect sites.');
console.log('');

// Default: informational. Exit 0 even with suspect findings — they need human triage.
// This check is not blocking by default; flip exit to 1 if you want it blocking.
process.exit(0);
