#!/usr/bin/env node
// check_callgemini_jsonmode.cjs — Catch callGemini() calls passing jsonMode=true
// while requesting HTML/text output.
//
// Why this exists:
//   Memory: feedback_callgemini_jsonmode.md
//
//   When callGemini is called with `jsonMode=true`, it sets the Gemini API's
//   responseMimeType=application/json. If the prompt actually asks for HTML
//   or plain text, the model wraps the response inside JSON envelope syntax,
//   producing visible artifacts like:
//     [ "<div>...</div>" ]
//     {"fixed_html": "..."}
//     \uXXXX escaped characters
//
//   The fix is at the source — set jsonMode=false when asking for HTML/text,
//   not at the consumer with another strip regex.
//
// What this check does:
//   Scans every JS source file for callGemini calls where:
//     a) The second positional arg is `true` (jsonMode=true), AND
//     b) The first arg appears to be requesting HTML/text output:
//        - variable name contains 'html', 'text', 'css', 'markdown', 'md'
//        - OR inline prompt string mentions HTML/text output explicitly
//
// Usage:
//   node dev-tools/check_callgemini_jsonmode.cjs
//   node dev-tools/check_callgemini_jsonmode.cjs --verbose
//
// Exit codes:
//   0 — no suspect callGemini calls found
//   1 — at least one call where jsonMode=true with HTML/text-ish prompt

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

// Names that suggest the prompt is asking for HTML/text (not JSON) output
const HTML_TEXT_NAME_PATTERNS = /\b(html|markdown|text|css|prose|paragraph|narrative|essay|story)\b/i;

// Inline-string content that suggests HTML/text output is being requested
const HTML_TEXT_PROMPT_PATTERNS = [
  /\b(return|output|produce|write|generate|provide)\s+(only\s+)?html\b/i,
  /\b(return|output|produce|write|generate|provide)\s+(only\s+)?(plain\s+)?text\b/i,
  /\bdo not return json\b/i,
  /\bmarkdown\s+(only|format)\b/i,
  /\bHTML\s+(only|format|fragment)\b/i,
];

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
  } catch (e) { continue; }

  function classifyPromptArg(node) {
    // Returns { kind: 'html' | 'json' | 'unknown', evidence: string }
    if (node.type === 'Identifier') {
      if (HTML_TEXT_NAME_PATTERNS.test(node.name)) {
        return { kind: 'html', evidence: 'variable name `' + node.name + '` matches HTML/text pattern' };
      }
      return { kind: 'unknown', evidence: 'variable `' + node.name + '`' };
    }
    if (node.type === 'Literal' && typeof node.value === 'string') {
      const v = node.value;
      for (const re of HTML_TEXT_PROMPT_PATTERNS) {
        if (re.test(v)) return { kind: 'html', evidence: 'inline prompt mentions HTML/text output' };
      }
      return { kind: 'unknown', evidence: 'inline string' };
    }
    if (node.type === 'TemplateLiteral') {
      const fullContent = node.quasis.map(q => q.value.raw).join(' ');
      for (const re of HTML_TEXT_PROMPT_PATTERNS) {
        if (re.test(fullContent)) return { kind: 'html', evidence: 'template literal mentions HTML/text output' };
      }
      return { kind: 'unknown', evidence: 'template literal' };
    }
    return { kind: 'unknown', evidence: node.type };
  }

  function isLiteralTrue(node) {
    return node && node.type === 'Literal' && node.value === true;
  }

  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }

    if (node.type === 'CallExpression'
        && node.callee
        && ((node.callee.type === 'Identifier' && node.callee.name === 'callGemini')
            || (node.callee.type === 'MemberExpression' && node.callee.property && node.callee.property.name === 'callGemini'))
        && node.arguments.length >= 2) {
      const promptArg = node.arguments[0];
      const jsonModeArg = node.arguments[1];
      if (isLiteralTrue(jsonModeArg)) {
        const cls = classifyPromptArg(promptArg);
        if (cls.kind === 'html') {
          findings.push({
            file: path.relative(ROOT, file),
            line: node.loc.start.line,
            evidence: cls.evidence,
          });
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
  console.log('║   callGemini jsonMode/HTML Mismatch Check                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('  Files scanned: ' + files.length);
  console.log('');
}

if (findings.length > 0) {
  console.log('═══ ✗ jsonMode=true WHILE PROMPT ASKS FOR HTML/TEXT (' + findings.length + ') ═══');
  console.log('     Forces responseMimeType=application/json — model wraps output as JSON.');
  console.log('     Memory: feedback_callgemini_jsonmode.md');
  console.log('');
  for (const f of findings) {
    console.log('  ✗ ' + f.file + ':' + f.line);
    console.log('      ' + f.evidence);
    console.log('      Fix: change second arg to `false` (jsonMode=false) for HTML/text prompts');
    console.log('');
  }
}

console.log('  ' + (findings.length === 0 ? '✅' : '❌') + ' ' + findings.length + ' suspect call(s) found in ' + files.length + ' files.');
console.log('');

process.exit(findings.length > 0 ? 1 : 0);
