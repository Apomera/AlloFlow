#!/usr/bin/env node
// stem_extract_tool.cjs — Per-tool i18n extraction codemod for stem_lab tools.
// Surgically wraps RENDER-SCOPE user-facing string literals in
//   t('stem.<tool>.<key>', '<original English>')
// (so the tool degrades to English if a key is missing, and becomes translatable).
// Only touches strings INSIDE the render(ctx) function, AFTER `var t = ctx.t`, so
// `t` is guaranteed in scope. STATIC module-level config strings (e.g. an
// ACHIEVEMENTS array declared before registerTool) are NOT wrapped — they'd run
// before t exists — and are reported so they can be restructured by hand.
//
// Edits are surgical span-splices (original formatting preserved). Emits the
// English key→value map for merging into ui_strings.js (stem.<tool>.*).
//
//   node dev-tools/stem_extract_tool.cjs <tool>            # dry-run (report only)
//   node dev-tools/stem_extract_tool.cjs <tool> --write    # apply + write english map
//
// After --write ALWAYS: node --check the file, run the stem render/golden test,
// review the diff.

'use strict';
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const ROOT = path.resolve(__dirname, '..');
const STEM = path.join(ROOT, 'stem_lab');
const OUT = path.join(__dirname, 'stem_i18n_report');

const tool = process.argv[2];
const WRITE = process.argv.includes('--write');
if (!tool) { console.error('Usage: stem_extract_tool.cjs <tool> [--write]'); process.exit(2); }
const file = path.join(STEM, 'stem_tool_' + tool + '.js');
if (!fs.existsSync(file)) { console.error('Not found: ' + file); process.exit(2); }

// ── classifier (mirrors stem_string_inventory.cjs) ──
const UI_KEYS = new Set(['label', 'title', 'name', 'desc', 'description', 'hint', 'message',
  'tooltip', 'heading', 'subheading', 'subtitle', 'caption', 'placeholder', 'arialabel',
  'aria-label', 'alt', 'goal', 'fact', 'question', 'answer', 'instruction', 'instructions',
  'explanation', 'feedback', 'summary', 'note', 'tip', 'cta', 'buttontext', 'text', 'content',
  'prompt_label', 'header', 'footer', 'body', 'intro', 'detail', 'details', 'prompt']);
const AI_CONTENT = /\b(You are |Do NOT |Reply with|Return ONLY|Respond with|strict JSON|as a JSON|age-appropriate|Use age|Output only)\b/;
function looksLikeNL(s) {
  s = s.trim();
  if (s.length < 3) return false;
  if (/^[#]?[0-9a-fA-F]{3,8}$/.test(s)) return false;
  if (/^(https?:|\/|\.\/|data:|mailto:|#)/.test(s)) return false;
  if (/\.(js|jsx|css|png|svg|json|jpe?g|gif|mp3|wav|webp|woff2?)$/i.test(s)) return false;
  if (/^[A-Z0-9_]+$/.test(s)) return false;
  if (/^\d+(\.\d+)?(px|em|rem|%|vh|vw|s|ms|deg|x)?$/.test(s)) return false;
  if (/^[a-z][a-zA-Z0-9]*$/.test(s) && !s.includes(' ')) return false;
  if (/^[a-z0-9-]+$/.test(s) && !s.includes(' ')) return false;
  if (/[A-Za-z]{2,}[A-Z]/.test(s) && !s.includes(' ')) return false;
  if (s.includes(' ')) return true;
  return /^[A-Z][a-z]+$/.test(s) && s.length >= 4;
}
function calleeName(callee) {
  if (!callee) return '';
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression') return (callee.property && (callee.property.name || callee.property.value)) || '';
  return '';
}

const code = fs.readFileSync(file, 'utf8');
const ast = parser.parse(code, { sourceType: 'script', allowReturnOutsideFunction: true, errorRecovery: true, ranges: true });

// Find the render function body range + the `var t = ctx.t [|| ...]` end position.
// Handles: render: function(ctx){}, render(ctx){} (method), render: <ref> (named fn).
let renderStart = -1, renderEnd = -1, tDeclEnd = -1;
let renderRefName = null;
function isFn(n) { return n && /FunctionExpression|ArrowFunctionExpression/.test(n.type); }
function setRender(fnNode) { if (fnNode && fnNode.body) { renderStart = fnNode.body.start; renderEnd = fnNode.body.end; } }
// init is `ctx.t` or `ctx.t || fallback`
function isCtxT(init) {
  if (!init) return false;
  if (init.type === 'MemberExpression') return init.object && init.object.name === 'ctx' && init.property && (init.property.name === 't');
  if (init.type === 'LogicalExpression') return isCtxT(init.left);
  return false;
}
traverse(ast, {
  ObjectProperty(p) {
    const k = String((p.node.key && (p.node.key.name || p.node.key.value)) || '');
    if (k !== 'render') return;
    if (isFn(p.node.value)) setRender(p.node.value);
    else if (p.node.value && p.node.value.type === 'Identifier') renderRefName = p.node.value.name;
  },
  ObjectMethod(p) {
    const k = String((p.node.key && (p.node.key.name || p.node.key.value)) || '');
    if (k === 'render') setRender(p.node);
  }
});
// render is a named-function reference → find its definition body.
if (renderStart < 0 && renderRefName) {
  traverse(ast, {
    FunctionDeclaration(p) { if (p.node.id && p.node.id.name === renderRefName) setRender(p.node); },
    VariableDeclarator(p) { if (p.node.id && p.node.id.name === renderRefName && isFn(p.node.init)) setRender(p.node.init); }
  });
}
if (renderStart < 0) { console.error('No render function found.'); process.exit(2); }
traverse(ast, {
  VariableDeclarator(p) {
    if (p.node.id && p.node.id.name === 't' && isCtxT(p.node.init) && p.node.start > renderStart && p.node.end < renderEnd) {
      if (tDeclEnd === -1) tDeclEnd = p.node.end;
    }
  }
});
if (tDeclEnd < 0) { console.error('No `var t = ctx.t` found inside render — add it manually first.'); process.exit(2); }

// Collect candidate strings.
const inRender = [], skippedStatic = [];
function inScope(node) { return node.start > tDeclEnd && node.end < renderEnd; }

traverse(ast, {
  StringLiteral(p) {
    const node = p.node, value = node.value, par = p.parent;
    if (par && par.type === 'CallExpression' && par.arguments[0] === node) {
      const cn = calleeName(par.callee); if (cn === 't' || cn === 'ts') return; // already localized
    }
    if (AI_CONTENT.test(value)) return;
    let isUF = false, bucket = null;
    if (par && par.type === 'CallExpression') {
      const cn = calleeName(par.callee);
      if (['createElement', 'h', 'jsx', 'jsxs'].includes(cn) && par.arguments.indexOf(node) >= 2 && looksLikeNL(value)) { isUF = true; bucket = 'jsx_text'; }
    }
    if (!isUF && par && par.type === 'ObjectProperty' && par.value === node) {
      const k = String((par.key && (par.key.name || par.key.value)) || '').toLowerCase();
      if (UI_KEYS.has(k) && looksLikeNL(value)) { isUF = true; bucket = k; }
    }
    if (!isUF) return;
    const rec = { start: node.start, end: node.end, value, bucket };
    if (inScope(node)) inRender.push(rec); else skippedStatic.push(rec);
  }
});

// Key generation (slug + dedupe).
const used = new Set();
function keyFor(value) {
  let base = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 38);
  if (!base) base = 'str';
  let k = base, n = 2;
  while (used.has(k)) { k = base + '_' + n; n++; }
  used.add(k);
  return k;
}
inRender.sort((a, b) => a.start - b.start);
const english = {};
for (const r of inRender) { r.key = keyFor(r.value); english[r.key] = r.value; }

// Apply surgical splices end→start.
let out = code;
const byEnd = inRender.slice().sort((a, b) => b.start - a.start);
for (const r of byEnd) {
  const orig = code.slice(r.start, r.end); // original literal incl. quotes/escapes
  const repl = "t('stem." + tool + "." + r.key + "', " + orig + ")";
  out = out.slice(0, r.start) + repl + out.slice(r.end);
}

console.log(`Tool: ${tool}  (render body ${renderStart}-${renderEnd}, t decl @${tDeclEnd})`);
console.log(`  render-scope user-facing strings (WRAPPED): ${inRender.length}`);
console.log(`  static module-level user-facing strings (SKIPPED, need manual restructure): ${skippedStatic.length}`);
if (skippedStatic.length) {
  console.log(`  skipped samples:`);
  skippedStatic.slice(0, 8).forEach(s => console.log(`    [${s.bucket}] ${s.value.slice(0, 60)}`));
}
if (WRITE) {
  fs.copyFileSync(file, file + '.bak.extract');
  fs.writeFileSync(file, out);
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'ui_strings_stem_' + tool + '.json'), JSON.stringify({ [tool]: english }, null, 2) + '\n');
  console.log(`\nWROTE ${file} (backup .bak.extract) + dev-tools/stem_i18n_report/ui_strings_stem_${tool}.json`);
  console.log(`NEXT: node --check the file, merge the english map into ui_strings.js (stem.${tool}.*), run the stem render test, review diff.`);
} else {
  console.log(`\n(dry-run) re-run with --write to apply. ${Object.keys(english).length} keys would be created.`);
}
