#!/usr/bin/env node
'use strict';

// check_label_semantics.cjs — two accessible-name defects in the app's JSX sources
// (AlloFlowANTI.txt and *_source.jsx), both found live in the 2026-09-26 WCAG audit.
//
// 1. GENERIC OVERRIDE (WCAG 2.5.3 Label in Name, 4.1.2). A button/link/summary that
//    shows its own text but carries aria-label={t('common.*')} is announced by the
//    generic word instead: "Generate Glossary" was named "Generate", a "Dismiss Error"
//    button was named "Generate", "Back" was named "Check Answer". Speech-input users
//    who say the visible words cannot activate it. 104 were removed.
//    Only flagged when the element also renders letters of its own; an icon-only
//    button still needs its aria-label.
// 2. PROHIBITED NAME (ARIA 1.2). aria-label/aria-labelledby on a role-less div, span
//    or p is not exposed by assistive technology. 99 were given role group/img/log.
//
// Usage: node dev-tools/check_label_semantics.cjs [--list] [--selftest] [files...]
// Exit 1 when any finding exists. Default scope: AlloFlowANTI.txt + ./*_source.jsx.

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const ROOT = path.resolve(__dirname, '..');
const GENERIC = /^(div|span|p|b|i|strong|em|small)$/;

function textish(n) {
  if (!n) return false;
  switch (n.type) {
    case 'JSXText': return /\p{L}{2,}/u.test(n.value);
    case 'StringLiteral': case 'TemplateLiteral': return true;
    case 'JSXExpressionContainer': return textish(n.expression);
    case 'CallExpression': {
      const c = n.callee;
      return (c.type === 'Identifier' && c.name === 't') || (c.type === 'MemberExpression' && c.property && c.property.name === 't');
    }
    case 'LogicalExpression': return n.operator === '&&' ? false : (textish(n.left) || textish(n.right));
    case 'ConditionalExpression': return textish(n.consequent) && textish(n.alternate);
    case 'JSXFragment': return n.children.some(textish);
    case 'JSXElement': {
      const o = n.openingElement;
      if (o.name.type !== 'JSXIdentifier' || !/^(span|strong|b|em|div|p)$/.test(o.name.name)) return false;
      const attr = (name) => o.attributes.find((a) => a.type === 'JSXAttribute' && a.name && a.name.name === name);
      if (attr('aria-hidden')) return false;
      const cls = attr('className');
      if (cls && cls.value && (cls.value.type !== 'StringLiteral' || /(^|\s)(hidden|sr-only)(\s|$)/.test(cls.value.value))) return false;
      return n.children.some(textish);
    }
    default: return false;
  }
}

let STRINGS = null;
function lookup(key) {
  if (!STRINGS) { try { STRINGS = JSON.parse(fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8')); } catch (_) { STRINGS = {}; } }
  const v = key.split('.').reduce((a, k) => a && a[k], STRINGS);
  return typeof v === 'string' ? v : null;
}
const norm = (x) => String(x || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\{[^}]*\}/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
// English visible text of JSX children, or null when any part is dynamic.
function visibleEnglish(children) {
  const parts = []; let dynamic = false;
  const walk = (n) => {
    if (!n) return;
    if (n.type === 'JSXText' || n.type === 'StringLiteral') { parts.push(n.value); return; }
    if (n.type === 'JSXExpressionContainer') { if (n.expression.type !== 'JSXEmptyExpression') walk(n.expression); return; }
    if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && n.callee.name === 't' && n.arguments[0] && n.arguments[0].type === 'StringLiteral') {
      const v = lookup(n.arguments[0].value);
      if (v != null) parts.push(v); else if (n.arguments[1] && n.arguments[1].type === 'StringLiteral') parts.push(n.arguments[1].value); else dynamic = true;
      return;
    }
    if (n.type === 'LogicalExpression' && n.operator === '||') { const before = parts.length; walk(n.left); if (parts.length === before && !dynamic) walk(n.right); return; }
    if (n.type === 'JSXElement') {
      const o = n.openingElement;
      if (o.attributes.some((a) => a.type === 'JSXAttribute' && a.name && a.name.name === 'aria-hidden')) return;
      if (o.name.type === 'JSXIdentifier' && /^[A-Z]/.test(o.name.name)) return;
      n.children.forEach(walk); return;
    }
    if (n.type === 'JSXFragment') { n.children.forEach(walk); return; }
    dynamic = true;
  };
  children.forEach(walk);
  return dynamic ? null : parts.join(' ');
}

function scan(src, file) {
  const ast = parser.parse(src, { sourceType: 'unambiguous', plugins: ['jsx'], errorRecovery: true });
  const out = [];
  traverse(ast, {
    JSXElement(p) {
      const o = p.node.openingElement;
      if (o.name.type !== 'JSXIdentifier') return;
      const tag = o.name.name;
      const attrs = o.attributes.filter((a) => a.type === 'JSXAttribute' && a.name);
      const get = (name) => attrs.find((a) => a.name.name === name);
      const line = o.loc.start.line;
      if (/^(button|a|summary)$/.test(tag)) {
        const al = get('aria-label');
        const e = al && al.value && al.value.type === 'JSXExpressionContainer' ? al.value.expression : null;
        if (e && e.type === 'CallExpression' && e.callee.type === 'Identifier' && e.callee.name === 't' &&
            e.arguments.length === 1 && e.arguments[0].type === 'StringLiteral' && /^common\./.test(e.arguments[0].value) &&
            p.node.children.some(textish)) {
          const label = lookup(e.arguments[0].value), vis = visibleEnglish(p.node.children);
          if (label != null && vis != null && norm(vis) && norm(label).includes(norm(vis))) return; // name already contains the visible text
          out.push({ file, line, kind: 'generic-override', detail: '<' + tag + '> aria-label=t(\'' + e.arguments[0].value + '\') hides its visible text' });
        }
      }
      if (GENERIC.test(tag) && (get('aria-label') || get('aria-labelledby')) && !get('role') && !get('tabIndex') &&
          !o.attributes.some((a) => a.type === 'JSXSpreadAttribute')) {
        out.push({ file, line, kind: 'prohibited-name', detail: '<' + tag + '> is named but has no role' });
      }
    },
  });
  return out;
}

function selftest() {
  const bad = "const a=<button aria-label={t('common.generate')}>{t('glossary.generate')}</button>;\n" +
    "const b=<div aria-label=\"Tools\"><button>x</button></div>;";
  const good = "const a=<button aria-label={t('common.close')}><X/></button>;\n" +
    "const b=<div role=\"group\" aria-label=\"Tools\"><button>x</button></div>;\n" +
    "const c=<button aria-label={t('common.copy')}><Icon/><span className=\"hidden sm:inline\">Copy</span></button>;";
  const b = scan(bad, 'bad').map((f) => f.kind).join(',');
  const g = scan(good, 'good').length;
  const ok = b === 'generic-override,prohibited-name' && g === 0;
  console.log(ok ? 'check_label_semantics selftest PASS' : 'check_label_semantics selftest FAIL: bad=' + b + ' good=' + g);
  return ok;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) process.exit(selftest() ? 0 : 1);
  let files = args.filter((a) => !a.startsWith('--'));
  if (!files.length) files = ['AlloFlowANTI.txt', ...fs.readdirSync(ROOT).filter((f) => /_source\.jsx$/.test(f)).sort()].map((f) => path.join(ROOT, f));
  const findings = files.flatMap((f) => scan(fs.readFileSync(f, 'utf8'), path.relative(ROOT, f)));
  if (args.includes('--list') || findings.length) for (const f of findings) console.log(f.file + ':' + f.line + '  ' + f.kind + '  ' + f.detail);
  console.log((findings.length ? '✗' : '✓') + ' check_label_semantics: ' + findings.length + ' finding(s) in ' + files.length + ' file(s)');
  process.exit(findings.length ? 1 : 0);
}

module.exports = { scan, selftest };
