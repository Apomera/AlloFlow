#!/usr/bin/env node
// stem_tdecl_resolve_audit.cjs <tool>... — PRECISE break detector. For every
// wrapped call  t('stem.<tool>.…', …)  resolve the `t` identifier's binding in
// its lexical scope. A call is BROKEN if `t` there resolves to a function PARAM
// (shadow) or to a binding that is reassigned / not the ctx.t decl — i.e. t is
// not the translation function at runtime. Tools with 0 broken calls are safe;
// >0 means real (possibly non-default-tab) crashes. Exits 1 if any broken.
'use strict';
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const ROOT = path.resolve(__dirname, '..');
const tools = process.argv.slice(2);
if (!tools.length) { console.error('Usage: stem_tdecl_resolve_audit.cjs <tool>...'); process.exit(2); }
const broken = [];
for (const tool of tools) {
  const file = path.join(ROOT, 'stem_lab', 'stem_tool_' + tool + '.js');
  if (!fs.existsSync(file)) { console.log(tool + ': not-found'); continue; }
  let ast;
  try { ast = parser.parse(fs.readFileSync(file, 'utf8'), { sourceType: 'script', allowReturnOutsideFunction: true, errorRecovery: true, ranges: true }); }
  catch (e) { console.log(tool + ': PARSE-ERROR'); broken.push(tool); continue; }
  const prefix = 'stem.' + tool + '.';
  const isPt = (n) => n && ((n.type === 'MemberExpression' && n.property && n.property.name === 't') || (n.type === 'LogicalExpression' && isPt(n.left)));
  let total = 0, bad = 0; const samples = [];
  traverse(ast, {
    CallExpression(p) {
      const callee = p.node.callee, a0 = p.node.arguments[0];
      if (!callee || callee.type !== 'Identifier' || callee.name !== 't') return;
      if (!a0 || a0.type !== 'StringLiteral' || a0.value.indexOf(prefix) !== 0) return;
      total++;
      const b = p.scope.getBinding('t');
      let ok = false;
      if (b) {
        const okKind = (b.kind === 'var' || b.kind === 'let' || b.kind === 'const' || b.kind === 'hoisted');
        const ctxInit = b.path && b.path.node && isPt(b.path.node.init);
        const noReassign = !b.constantViolations || b.constantViolations.length === 0;
        ok = okKind && ctxInit && noReassign;
      }
      if (!ok) { bad++; if (samples.length < 3) samples.push(a0.value + (b ? ' [' + b.kind + (b.constantViolations && b.constantViolations.length ? ',reassigned' : '') + ']' : ' [unbound]')); }
    }
  });
  if (bad) { console.log(tool + ': ⚠ ' + bad + '/' + total + ' wrapped calls BROKEN — e.g. ' + samples.join('; ')); broken.push(tool); }
  else console.log(tool + ': ok (' + total + ' wrapped calls all resolve to ctx.t)');
}
console.log('\n' + broken.length + ' tool(s) with broken wrapped calls' + (broken.length ? ': ' + broken.join(' ') : ''));
process.exit(broken.length ? 1 : 0);
