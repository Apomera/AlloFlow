#!/usr/bin/env node
// scan_render_scoped_components.cjs — repo gate for the "per-render component
// identity" state-wipe class.
//
// A component DEFINED inside a stem tool's render(ctx) gets a new function
// identity on every host re-render. React compares element types by
// reference, so `h(ThatComponent)` unmounts the old instance and mounts a
// fresh one whenever anything writes toolData (XP award, badge, view sync,
// hydration) — silently wiping the component's local useState. No crash, no
// console error; the student just loses their place. Proven live in birdlab's
// species-family views 2026-08-11 (fixed: module-scope BirdSpeciesFamilyView;
// pin: tests/stem_birdlab_view_state_stability.test.js).
//
// FLAG rule: a function that (a) is defined lexically inside a render()
// property function, (b) contains hook calls (has local state to lose), and
// (c) is passed by NAME as the first argument to createElement/h/el.
// All three together = remount-on-every-host-render with state.
//
// Deliberately NOT flagged (verified safe patterns):
//   - module-scope components (stable identity — the fix)
//   - `this._X = function(){...}` cached once, rendered via h(this._X) —
//     member-expression arg, identity stable (numberline, punnett)
//   - render-prop pattern `h(_ViewWrapper, { _render: renderX })` — the
//     wrapper's identity is stable; new _render props RECONCILE, not remount
//     (printingpress)
//   - stateless in-render components: remount churn but nothing to lose —
//     reported as INFO count only (--info to list)
//
// Usage: node dev-tools/scan_render_scoped_components.cjs [--info] [files...]

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const acorn = require(path.join(ROOT, 'desktop/web-app/node_modules/acorn'));

const HOOK_RE = /^use(State|Effect|Ref|Memo|Callback|Reducer|LayoutEffect|Context|ImperativeHandle|Transition|DeferredValue|SyncExternalStore|Id)$/;
const FN_TYPES = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);

function isNode(v) { return v && typeof v === 'object' && typeof v.type === 'string'; }

function walk(node, visit, ancestors) {
  visit(node, ancestors);
  ancestors.push(node);
  for (const key of Object.keys(node)) {
    if (key === 'loc') continue;
    const v = node[key];
    if (Array.isArray(v)) { for (const c of v) if (isNode(c)) walk(c, visit, ancestors); }
    else if (isNode(v)) walk(v, visit, ancestors);
  }
  ancestors.pop();
}

function isIife(fnNode, parent) {
  return parent && parent.type === 'CallExpression' && parent.callee === fnNode;
}

function enclosingFunction(ancestors) {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const n = ancestors[i];
    if (FN_TYPES.has(n.type)) {
      if (isIife(n, ancestors[i - 1])) continue;
      return { node: n, index: i };
    }
  }
  return null;
}

function functionName(fnNode, parent) {
  if (fnNode.id && fnNode.id.name) return fnNode.id.name;
  if (!parent) return null;
  if (parent.type === 'VariableDeclarator' && parent.id && parent.id.name) return parent.id.name;
  if (parent.type === 'Property' && parent.key) return parent.key.name || parent.key.value || null;
  if (parent.type === 'AssignmentExpression' && parent.left) {
    if (parent.left.type === 'Identifier') return parent.left.name;
    if (parent.left.type === 'MemberExpression' && parent.left.property) {
      return parent.left.property.name || parent.left.property.value || null;
    }
  }
  return null;
}

function scanFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', locations: true });
  } catch (e) {
    return { file, parseError: e.message, fails: [], infos: [] };
  }

  const renderSet = new Set();
  const fnMeta = new Map();   // node -> {name, line, insideRender}
  const hookBearers = new Set();
  const elementArgNames = new Map(); // name -> [line,...] (Identifier as createElement first arg)

  walk(ast, (node, ancestors) => {
    if (node.type === 'Property' && node.key && (node.key.name === 'render' || node.key.value === 'render')
        && node.value && FN_TYPES.has(node.value.type)) {
      renderSet.add(node.value);
    }

    if (FN_TYPES.has(node.type)) {
      const parent = ancestors[ancestors.length - 1];
      const insideRender = ancestors.some((a) => renderSet.has(a));
      fnMeta.set(node, { name: functionName(node, parent), line: node.loc.start.line, insideRender });
    }

    if (node.type !== 'CallExpression') return;
    const callee = node.callee;
    const calleeName = callee.type === 'Identifier' ? callee.name
      : (callee.type === 'MemberExpression' && callee.property ? (callee.property.name || callee.property.value) : null);

    if ((calleeName === 'createElement' || calleeName === 'h' || calleeName === 'H' || calleeName === 'el' || calleeName === 'e')
        && node.arguments[0] && node.arguments[0].type === 'Identifier') {
      const n = node.arguments[0].name;
      const list = elementArgNames.get(n) || [];
      list.push(node.loc.start.line);
      elementArgNames.set(n, list);
    }

    if (calleeName && HOOK_RE.test(calleeName)) {
      const encl = enclosingFunction(ancestors);
      if (encl) hookBearers.add(encl.node);
    }
  }, []);

  const fails = [];
  const infos = [];
  for (const [node, meta] of fnMeta) {
    if (!meta.insideRender || !meta.name) continue;
    if (renderSet.has(node)) continue;
    const uses = elementArgNames.get(meta.name);
    if (!uses) continue;
    const stateful = hookBearers.has(node);
    const entry = {
      fn: meta.name, line: meta.line,
      why: (stateful ? 'STATEFUL' : 'stateless') + ' component defined inside render(), rendered via createElement at line(s) '
        + uses.slice(0, 6).join(',') + (uses.length > 6 ? '…' : '')
        + ' — new identity every host re-render → remount' + (stateful ? ' + local-state wipe' : ''),
    };
    if (stateful) fails.push(entry); else infos.push(entry);
  }
  return { file, fails, infos };
}

const argv = process.argv.slice(2);
const showInfo = argv.includes('--info');
const fileArgs = argv.filter((a) => a !== '--info');
const files = fileArgs.length ? fileArgs
  : fs.readdirSync(path.join(ROOT, 'stem_lab'))
      .filter((f) => /^stem_tool_.*\.js$/.test(f))
      .map((f) => path.join('stem_lab', f));

let failFiles = 0, failCount = 0, infoCount = 0, parseErrors = 0;
for (const rel of files) {
  const r = scanFile(path.resolve(ROOT, rel));
  if (r.parseError) { parseErrors++; console.log('PARSE FAIL ' + rel + ': ' + r.parseError); continue; }
  if (r.fails.length) {
    failFiles++; failCount += r.fails.length;
    console.log('FLAG ' + rel);
    for (const f of r.fails) console.log('   - ' + f.fn + ' @' + f.line + ' — ' + f.why);
  }
  infoCount += r.infos.length;
  if (showInfo && r.infos.length) {
    console.log('INFO ' + rel);
    for (const f of r.infos) console.log('   ~ ' + f.fn + ' @' + f.line + ' — ' + f.why);
  }
}
console.log('---');
console.log('scan_render_scoped_components: ' + files.length + ' file(s), ' + failCount + ' stateful flag(s) in '
  + failFiles + ' file(s), ' + infoCount + ' stateless (' + (showInfo ? 'shown' : '--info to list') + '), '
  + parseErrors + ' parse failure(s).');
process.exit(failFiles || parseErrors ? 1 : 0);
