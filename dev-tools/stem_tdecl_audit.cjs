#!/usr/bin/env node
// stem_tdecl_audit.cjs <tool>... — find `t` name COLLISIONS in tools that got a
// t-decl inserted: a render-scope `t` binding (var/let/const or fn param) whose
// init is NOT ctx.t. Such a tool reassigns our inserted `var t = ctx.t`, so
// wrapped t(...) calls throw "t is not a function" (possibly only in a non-default
// tab the smoke didn't render). Exits 1 if any collision found.
'use strict';
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const ROOT = path.resolve(__dirname, '..');
const tools = process.argv.slice(2);
if (!tools.length) { console.error('Usage: stem_tdecl_audit.cjs <tool>...'); process.exit(2); }
const bad = [];
for (const tool of tools) {
  const file = path.join(ROOT, 'stem_lab', 'stem_tool_' + tool + '.js');
  if (!fs.existsSync(file)) { console.log(tool + ': not-found'); continue; }
  const code = fs.readFileSync(file, 'utf8');
  let ast;
  try { ast = parser.parse(code, { sourceType: 'script', allowReturnOutsideFunction: true, errorRecovery: true, ranges: true }); }
  catch (e) { console.log(tool + ': PARSE-ERROR ' + e.message.slice(0, 60)); bad.push(tool); continue; }
  function isFn(n) { return n && /FunctionExpression|ArrowFunctionExpression/.test(n.type); }
  let fnNode = null, ref = null;
  traverse(ast, {
    ObjectProperty(p) { const k = String((p.node.key && (p.node.key.name || p.node.key.value)) || ''); if (k === 'render') { if (isFn(p.node.value)) fnNode = p.node.value; else if (p.node.value && p.node.value.type === 'Identifier') ref = p.node.value.name; } },
    ObjectMethod(p) { const k = String((p.node.key && (p.node.key.name || p.node.key.value)) || ''); if (k === 'render') fnNode = p.node; }
  });
  if (!fnNode && ref) traverse(ast, { FunctionDeclaration(p) { if (p.node.id && p.node.id.name === ref) fnNode = p.node; }, VariableDeclarator(p) { if (p.node.id && p.node.id.name === ref && isFn(p.node.init)) fnNode = p.node.init; } });
  if (!fnNode || !fnNode.body) { console.log(tool + ': no-render'); continue; }
  const pname = (fnNode.params && fnNode.params[0] && fnNode.params[0].type === 'Identifier') ? fnNode.params[0].name : null;
  const bs = fnNode.body.start, be = fnNode.body.end;
  const inBody = (n) => n && n.start > bs && n.end < be;
  const isPt = (n) => n && ((n.type === 'MemberExpression' && n.object && n.object.name === pname && n.property && n.property.name === 't') || (n.type === 'LogicalExpression' && isPt(n.left)));
  let collide = 0;
  traverse(ast, {
    VariableDeclarator(p) { if (inBody(p.node) && p.node.id && p.node.id.name === 't' && !isPt(p.node.init)) collide++; },
    Function(p) { if (inBody(p.node)) for (const par of (p.node.params || [])) if (par.type === 'Identifier' && par.name === 't') collide++; }
  });
  if (collide) { console.log(tool + ': ⚠ COLLISION (' + collide + ' non-ctx `t` binding(s) in render)'); bad.push(tool); }
  else console.log(tool + ': ok');
}
console.log('\n' + bad.length + ' collision(s)' + (bad.length ? ': ' + bad.join(' ') : ''));
process.exit(bad.length ? 1 : 0);
