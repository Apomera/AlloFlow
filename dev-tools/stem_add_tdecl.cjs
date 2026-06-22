#!/usr/bin/env node
// stem_add_tdecl.cjs <tool> [--write] — insert a t-decl as the FIRST statement
// of a stem tool's render() body, so the extraction codemod can then wrap
// render-scope strings. Inserts:
//     var t = <param>.t || function (k, fb) { return fb != null ? fb : k; };
// (<param> = render's first parameter name, conventionally ctx). Idempotent:
// skips if a `var t = <param>.t` already exists in render. AST-based render
// detection mirrors stem_extract_tool.cjs (fn-prop / method / by-reference).
'use strict';
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const ROOT = path.resolve(__dirname, '..');
const tool = process.argv[2];
const WRITE = process.argv.includes('--write');
if (!tool) { console.error('Usage: stem_add_tdecl.cjs <tool> [--write]'); process.exit(2); }
const file = path.join(ROOT, 'stem_lab', 'stem_tool_' + tool + '.js');
if (!fs.existsSync(file)) { console.error('Not found: ' + file); process.exit(2); }
const code = fs.readFileSync(file, 'utf8');
const ast = parser.parse(code, { sourceType: 'script', allowReturnOutsideFunction: true, errorRecovery: true, ranges: true });

function isFn(n) { return n && /FunctionExpression|ArrowFunctionExpression/.test(n.type); }
let fnNode = null, renderRefName = null;
traverse(ast, {
  ObjectProperty(p) {
    const k = String((p.node.key && (p.node.key.name || p.node.key.value)) || '');
    if (k !== 'render') return;
    if (isFn(p.node.value)) fnNode = p.node.value;
    else if (p.node.value && p.node.value.type === 'Identifier') renderRefName = p.node.value.name;
  },
  ObjectMethod(p) {
    const k = String((p.node.key && (p.node.key.name || p.node.key.value)) || '');
    if (k === 'render') fnNode = p.node;
  }
});
if (!fnNode && renderRefName) {
  traverse(ast, {
    FunctionDeclaration(p) { if (p.node.id && p.node.id.name === renderRefName) fnNode = p.node; },
    VariableDeclarator(p) { if (p.node.id && p.node.id.name === renderRefName && isFn(p.node.init)) fnNode = p.node.init; }
  });
}
if (!fnNode || !fnNode.body || fnNode.body.type !== 'BlockStatement') { console.error('No render block found.'); process.exit(2); }
const param = fnNode.params && fnNode.params[0];
if (!param || param.type !== 'Identifier') { console.error('render param is not a plain identifier (destructured?) — handle by hand.'); process.exit(3); }
const pname = param.name;

// Scan render body for `t` bindings (var/let/const declarators + fn params).
// If `t` is already a ctx.t-decl -> idempotent skip. If `t` is bound to ANYTHING
// ELSE (the tool uses `t` as a local, e.g. time/temperature) -> COLLISION:
// inserting our `var t = ctx.t` would be reassigned and wrapped t(...) calls
// would throw "t is not a function". Bail so the tool is handled by hand.
let already = false, collision = false;
const bodyStart = fnNode.body.start, bodyEnd = fnNode.body.end;
const inBody = (n) => n && n.start > bodyStart && n.end < bodyEnd;
const isPt = (n) => n && ((n.type === 'MemberExpression' && n.object && n.object.name === pname && n.property && n.property.name === 't') || (n.type === 'LogicalExpression' && isPt(n.left)));
traverse(ast, {
  VariableDeclarator(p) {
    if (!inBody(p.node) || !(p.node.id && p.node.id.name === 't')) return;
    if (isPt(p.node.init)) already = true; else collision = true;
  },
  Function(p) {
    if (!inBody(p.node)) return;
    for (const par of (p.node.params || [])) if (par.type === 'Identifier' && par.name === 't') collision = true;
  }
});
if (already) { console.log(tool + ': t-decl already present — skipping.'); process.exit(0); }
if (collision) { console.error(tool + ": render already binds `t` to a non-ctx value (local var/param) — COLLISION, handle by hand."); process.exit(4); }

const insertAt = bodyStart + 1; // right after the `{`
const decl = '\n      var t = ' + pname + '.t || function (k, fb) { return fb != null ? fb : k; };';
const out = code.slice(0, insertAt) + decl + code.slice(insertAt);
console.log(tool + ': render(' + pname + ') — inserting t-decl' + (WRITE ? '' : ' (dry-run)') + '.');
if (WRITE) {
  fs.copyFileSync(file, file + '.bak.tdecl');
  fs.writeFileSync(file, out);
  console.log('  WROTE (backup .bak.tdecl). NEXT: node --check, then stem_extract_tool.cjs ' + tool + ' --write');
}
