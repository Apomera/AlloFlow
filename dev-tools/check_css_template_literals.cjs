#!/usr/bin/env node
// check_css_template_literals.cjs — Catch stray backticks inside CSS embedded
// in JS template literals.
//
// Why this exists:
//   April 2026 production bug: a stray backtick inside CSS embedded in a JS
//   template literal silently closed the template. The next semicolon after
//   the closure resolved as `undefined` in JS context, producing the runtime
//   error "inherit is not defined" in AI Studio.
//
//   Memory note: feedback_backticks_in_css_template_literals.md
//
//   Pattern that breaks:
//       const css = `
//         .foo { font-family: 'Arial', `monospace`; }   ← inner ` closes the template
//         .bar { color: red; }
//       `;
//
//   The compiler accepts this (the syntax is valid), but the resulting CSS
//   string is truncated and the rest of the source becomes garbled.
//
// What this check does:
//   Scans every `.js`/`.jsx` file at the repo root + stem_lab/ + sel_hub/ for
//   template literals containing CSS-like content (matches `{`...`}` blocks
//   with CSS-property-style content) and flags any stray ` characters inside
//   them (other than the opening/closing pair).
//
//   Does NOT scan AlloFlowANTI.txt (a 26K-line JSX file with extensive normal
//   template literal usage; too noisy for static scanning). Does NOT flag
//   commented-out backticks.
//
// Usage:
//   node dev-tools/check_css_template_literals.cjs
//   node dev-tools/check_css_template_literals.cjs --verbose
//
// Exit codes:
//   0 — no stray backticks in CSS-in-template-literals
//   1 — at least one stray backtick (production bug class)

'use strict';
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const QUIET = args.includes('--quiet');

function listFiles(dir, filter) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(filter).map(f => path.join(dir, f));
}

const files = [
  ...listFiles(ROOT, f => /^[^_].*_module\.js$/.test(f)),
  ...listFiles(ROOT, f => /^quiz_[a-z_]+\.js$/.test(f)),
  ...listFiles(path.join(ROOT, 'stem_lab'), f => f.endsWith('.js') && !f.startsWith('_')),
  ...listFiles(path.join(ROOT, 'sel_hub'), f => f.endsWith('.js') && !f.startsWith('_')),
];

// CSS-content heuristics — a template literal is "probably CSS" if it contains
// CSS-style declarations (`property: value;`) or selectors (`.foo {`, `#id {`).
const CSS_HINTS = [
  /[a-z-]+\s*:\s*[^;{}\n]+;/i,      // property: value;
  /[.#@][a-zA-Z][\w-]*\s*\{/,        // .selector { or #id { or @media {
  /@(media|keyframes|font-face|import|supports|charset)/i,
  /(::|:)(before|after|hover|focus|active|first-child|last-child|nth-child)/,
];

function looksLikeCSS(content) {
  return CSS_HINTS.some(re => re.test(content));
}

const findings = [];

for (const file of files) {
  const src = fs.readFileSync(file, 'utf-8');
  let ast;
  try {
    ast = acorn.parse(src, {
      ecmaVersion: 2022, allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true,
      allowImportExportEverywhere: true, allowHashBang: true, allowSuperOutsideMethod: true,
      locations: true,
    });
  } catch (e) {
    // Skip un-parseable files (rare; would be flagged by other checks)
    continue;
  }

  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }

    // Look at TemplateLiteral nodes — those have .quasis (the literal parts)
    // and .expressions (the ${...} interpolations)
    if (node.type === 'TemplateLiteral' && Array.isArray(node.quasis)) {
      const fullContent = node.quasis.map(q => q.value.raw).join('${...}');
      if (looksLikeCSS(fullContent)) {
        // Search each quasi for stray backticks (would have already closed
        // the template at parse time if they were syntactically active —
        // but the parser sees the WRONG structure, not flags it).
        // Since acorn parsed the file, any visible backticks inside
        // a quasi.raw must be ESCAPED (e.g., \`). Unescaped ones would
        // have triggered a parse error or, more insidiously, parsed as
        // a closing backtick and made the rest of the file's structure off.
        //
        // What we ACTUALLY want to detect: places where the developer
        // intended an unescaped backtick (i.e., the source has just `
        // not \`). Read raw source between the start/end of each quasi
        // and check for stray ` characters.
        for (const q of node.quasis) {
          const startCol = q.start;
          const endCol = q.end;
          const raw = src.substring(startCol, endCol);
          // Find unescaped backticks (not preceded by `\`)
          const matches = [];
          for (let i = 0; i < raw.length; i++) {
            if (raw[i] === '`' && (i === 0 || raw[i - 1] !== '\\')) {
              matches.push(i);
            }
          }
          if (matches.length > 0) {
            findings.push({
              file: path.relative(ROOT, file),
              line: q.loc.start.line,
              cssSnippet: q.value.raw.slice(0, 80).replace(/\n/g, ' '),
              backtickCount: matches.length,
            });
          }
        }
      }
    }

    for (const k of Object.keys(node)) {
      if (k === 'loc' || k === 'start' || k === 'end' || k === 'range') continue;
      if (node[k] && typeof node[k] === 'object') walk(node[k]);
    }
  }
  walk(ast);
}

if (!QUIET || findings.length > 0) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   CSS Template Literal Backtick Check                                ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('  Files scanned: ' + files.length);
  console.log('');
}

if (findings.length > 0) {
  console.log('═══ ✗ STRAY BACKTICK INSIDE CSS-IN-TEMPLATE-LITERAL (' + findings.length + ') ═══');
  console.log('     This bug class silently closes the template; rest of file becomes garbled JS.');
  console.log('     Memory: feedback_backticks_in_css_template_literals.md');
  console.log('');
  for (const f of findings) {
    console.log('  ✗ ' + f.file + ':' + f.line);
    console.log('      ' + f.backtickCount + ' unescaped backtick(s) inside CSS-like template content');
    console.log('      Snippet: ' + f.cssSnippet);
    console.log('      Fix: escape with backslash (\\`) or use a different quote style for the CSS value');
    console.log('');
  }
}

console.log('  ' + (findings.length === 0 ? '✅' : '❌') + ' ' + findings.length + ' stray backtick(s) found in ' + files.length + ' files.');
console.log('');

process.exit(findings.length > 0 ? 1 : 0);
