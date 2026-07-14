#!/usr/bin/env node
// stem_fix_alias.cjs <tool> [--write] — convert a tool's wrapped i18n calls from
// the collision-prone `t(...)` to a unique `__alloT(...)` that no tool uses as a
// local. Fixes "t is not a function" crashes where a wrapped t('stem.<tool>.…')
// call resolved to a shadowing param or a reassigned `var t` (time/temp/etc).
//
//   - Renames every  t('stem.<tool>.…  /  t("stem.<tool>.…  ->  __alloT(...   (only
//     standalone `t`, via a non-identifier lookbehind — never the `t` inside
//     __alloT or another identifier).
//   - Ensures `var __alloT = <param>.t || fallback;` is declared at render top:
//       * no-tdecl tools: REPLACE the clobbering inserted `var t = ctx.t || fn`
//         (so the tool's own local `t` is restored to its original meaning);
//       * compat tools: INSERT `var __alloT = …` right after their own
//         `var t = ctx.t` decl (their `t` is kept for pre-existing t() calls).
// Behavior-neutral: __alloT === ctx.t, fallback returns the English 2nd arg.
'use strict';
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const ROOT = path.resolve(__dirname, '..');
const tool = process.argv[2];
const WRITE = process.argv.includes('--write');
if (!tool) { console.error('Usage: stem_fix_alias.cjs <tool> [--write]'); process.exit(2); }
const file = path.join(ROOT, 'stem_lab', 'stem_tool_' + tool + '.js');
if (!fs.existsSync(file)) { console.error('Not found: ' + file); process.exit(2); }
let code = fs.readFileSync(file, 'utf8');

if (code.indexOf("__alloT('stem." + tool + ".") !== -1 || code.indexOf('__alloT("stem.' + tool + '.') !== -1) {
  console.log(tool + ': already aliased — skipping.'); process.exit(0);
}

// Locate render fn + its first param name + the render-scope ctx.t decl.
const ast = parser.parse(code, { sourceType: 'script', allowReturnOutsideFunction: true, errorRecovery: true, ranges: true });
function isFn(n) { return n && /FunctionExpression|ArrowFunctionExpression/.test(n.type); }
let fnNode = null, ref = null;
traverse(ast, {
  ObjectProperty(p) { const k = String((p.node.key && (p.node.key.name || p.node.key.value)) || ''); if (k === 'render') { if (isFn(p.node.value)) fnNode = p.node.value; else if (p.node.value && p.node.value.type === 'Identifier') ref = p.node.value.name; } },
  ObjectMethod(p) { const k = String((p.node.key && (p.node.key.name || p.node.key.value)) || ''); if (k === 'render') fnNode = p.node; }
});
if (!fnNode && ref) traverse(ast, { FunctionDeclaration(p) { if (p.node.id && p.node.id.name === ref) fnNode = p.node; }, VariableDeclarator(p) { if (p.node.id && p.node.id.name === ref && isFn(p.node.init)) fnNode = p.node.init; } });
if (!fnNode || !fnNode.body) { console.error('No render block.'); process.exit(2); }
const pname = (fnNode.params && fnNode.params[0] && fnNode.params[0].type === 'Identifier') ? fnNode.params[0].name : 'ctx';
const ALIAS_DECL = 'var __alloT = ' + pname + '.t || function (k, fb) { return fb != null ? fb : k; };';
const INSERTED = 'var t = ' + pname + '.t || function (k, fb) { return fb != null ? fb : k; };';

// ── Step A: ensure __alloT decl ──
let declMode;
if (code.indexOf(INSERTED) !== -1) {
  code = code.replace(INSERTED, ALIAS_DECL); // no-tdecl: swap clobbering decl
  declMode = 'replaced-inserted-t';
} else {
  // compat: find render-scope `var t = <pname>.t` declaration end, splice after it.
  const bs = fnNode.body.start, be = fnNode.body.end;
  const isPt = (n) => n && ((n.type === 'MemberExpression' && n.object && n.object.name === pname && n.property && n.property.name === 't') || (n.type === 'LogicalExpression' && isPt(n.left)));
  let declStmtEnd = -1;
  traverse(ast, {
    VariableDeclarator(p) {
      if (declStmtEnd !== -1) return;
      if (p.node.start > bs && p.node.end < be && p.node.id && p.node.id.name === 't' && isPt(p.node.init)) {
        const stmt = p.findParent((pp) => pp.isVariableDeclaration());
        if (stmt) declStmtEnd = stmt.node.end;
      }
    }
  });
  if (declStmtEnd === -1) { console.error(tool + ': no render-scope `var t = ' + pname + '.t` found and no inserted decl — cannot place __alloT.'); process.exit(3); }
  code = code.slice(0, declStmtEnd) + '\n      ' + ALIAS_DECL + code.slice(declStmtEnd);
  declMode = 'inserted-after-own-t';
}

// ── Step B: rename wrapped calls (standalone `t` only) ──
const esc = tool.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const reS = new RegExp("(?<![A-Za-z0-9_$])t\\('stem\\." + esc + "\\.", 'g');
const reD = new RegExp('(?<![A-Za-z0-9_$])t\\("stem\\.' + esc + '\\.', 'g');
const nS = (code.match(reS) || []).length, nD = (code.match(reD) || []).length;
code = code.replace(reS, "__alloT('stem." + tool + ".").replace(reD, '__alloT("stem.' + tool + '.');

console.log(tool + ': decl=' + declMode + ', renamed ' + (nS + nD) + ' wrapped calls' + (WRITE ? '' : ' (dry-run)') + '.');
if (WRITE) {
  fs.copyFileSync(file, file + '.bak.alias');
  fs.writeFileSync(file, code);
  console.log('  WROTE (backup .bak.alias). NEXT: node --check, precise resolve-audit (expect 0 broken), smoke.');
}
