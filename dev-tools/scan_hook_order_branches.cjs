#!/usr/bin/env node
// scan_hook_order_branches.cjs — repo gate for the "hooks in a conditional
// view branch" crash class (React #310/#300).
//
// A stem_lab tool's render(ctx) runs INLINE in the host StemPluginBridge
// component, so every hook it calls lands on the host's hook list. A hook
// inside a helper that only runs on one branch of the view dispatch changes
// the hook count on navigation and kills the tool at runtime:
//   "Rendered more hooks than during the previous render."
// Shipped three times before this gate existed: swimlab (2026-07-23),
// firstresponse cprAed metronome and petsLab renderNutrition (both caught
// 2026-08-11 — pets by the first run of this very scanner). The golden digest
// test renders each tool once and structurally cannot see the class; the
// runtime gates (tests/stem_*_hook_order.test.js) catch it per tool, and this
// scanner catches it repo-wide at the declaration site.
//
// Model (validated against the three known bugs + the false-positive patterns
// of the 2026-08-11 sweep):
//   render-equivalent — the registered render() plus helpers reached from it
//     by exactly one unconditional direct call (e.g. pets' _renderPets).
//     Hooks here are host-inline: legal only in unconditional positions.
//   componentish — a function referenced by bare identifier (registry arrays,
//     render-props like printingpress's _ViewWrapper `_render:`, stable
//     aliases), passed to createElement/h, or assigned to a member slot
//     (window.X / this._X, e.g. platetectonics, numberline, punnett).
//     Hooks there live in a real component instance: legal.
//   custom hooks — use[A-Z]* functions are transparent: their call sites are
//     treated as hook calls of the caller (e.g. weldlab's usePersistedState).
//   FAIL — hooks that execute host-inline from a conditional position, or a
//     hook-bearing helper called host-inline more than once per render.
//   INFO — anonymous/unresolvable holders (factories like birdlab's
//     makeSpeciesView). Printed, non-failing: the runtime gates own those.
//
// Usage: node dev-tools/scan_hook_order_branches.cjs [--info] [files...]
//        (no files = all of stem_lab/stem_tool_*.js; --info prints INFO lines)

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const acorn = require(path.join(ROOT, 'desktop/web-app/node_modules/acorn'));

const HOOK_RE = /^use(State|Effect|Ref|Memo|Callback|Reducer|LayoutEffect|Context|ImperativeHandle|Transition|DeferredValue|SyncExternalStore|Id)$/;
const CUSTOM_HOOK_RE = /^use[A-Z]/;
const CONDITIONAL_TYPES = new Set([
  'IfStatement', 'ConditionalExpression', 'SwitchStatement',
  'ForStatement', 'ForInStatement', 'ForOfStatement', 'WhileStatement',
  'DoWhileStatement', 'CatchClause',
]);
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

// Innermost enclosing function, treating directly-invoked IIFEs as transparent
// (their body executes synchronously in the outer scope).
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

function functionName(fnNode, ancestors, index) {
  if (fnNode.id && fnNode.id.name) return fnNode.id.name;
  const parent = ancestors[index - 1];
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

function assignedToMember(fnNode, ancestors, index) {
  const parent = ancestors[index - 1];
  return !!(parent && parent.type === 'AssignmentExpression'
    && parent.left && parent.left.type === 'MemberExpression' && parent.right === fnNode);
}

// True when a conditional / loop / short-circuit / nested-callback construct
// sits between position `fnIndex` (the enclosing function) and the node.
// try{} blocks are transparent (they always execute); catch clauses are not.
function isConditionalPosition(ancestors, fnIndex) {
  for (let i = fnIndex + 1; i < ancestors.length; i++) {
    const n = ancestors[i];
    if (CONDITIONAL_TYPES.has(n.type)) return true;
    if (n.type === 'LogicalExpression' && ancestors[i + 1] === n.right) return true;
    if (FN_TYPES.has(n.type) && !isIife(n, ancestors[i - 1])) return true;
  }
  return false;
}

// Like isConditionalPosition, but forgives the feature-detect idiom
// `X.useHook ? X.useHook(...) : fallback` (bridgelab's audio ref): the test is
// the hook function itself, which cannot appear or vanish between renders of a
// mounted host, so the hook count stays stable.
function isConditionalHookPosition(ancestors, fnIndex, hookName, hookNode) {
  for (let i = fnIndex + 1; i < ancestors.length; i++) {
    const n = ancestors[i];
    if (n.type === 'ConditionalExpression') {
      const t = n.test;
      const tName = t ? (t.type === 'MemberExpression'
        ? (t.property && (t.property.name || t.property.value))
        : (t.type === 'Identifier' ? t.name : null)) : null;
      const childOnPath = i + 1 < ancestors.length ? ancestors[i + 1] : hookNode;
      if (tName === hookName && childOnPath === n.consequent) continue;
      return true;
    }
    if (CONDITIONAL_TYPES.has(n.type)) return true;
    if (n.type === 'LogicalExpression' && ancestors[i + 1] === n.right) return true;
    if (FN_TYPES.has(n.type) && !isIife(n, ancestors[i - 1])) return true;
  }
  return false;
}

function scanFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', locations: true });
  } catch (e) {
    return { file, parseError: e.message, fails: [], infos: [] };
  }

  // fnInfo: node -> {name, byRef, memberSlot, createElementArg, line}
  const fnInfo = new Map();
  const fnsByName = new Map(); // name -> [node]
  const renderSet = new Set();
  const hookCalls = [];        // {hook, line, encl, conditional, viaCustom}
  const callSites = new Map(); // fnName -> [{line, encl, conditional}]
  const bareRefNames = new Set();
  const createElementArgNames = new Set();

  walk(ast, (node, ancestors) => {
    if (FN_TYPES.has(node.type)) {
      const idx = ancestors.length; // node's own index if it were appended
      const name = functionName(node, ancestors.concat(node), idx);
      const info = {
        name,
        line: node.loc.start.line,
        memberSlot: assignedToMember(node, ancestors.concat(node), idx),
        byRef: false,
      };
      fnInfo.set(node, info);
      if (name) {
        const list = fnsByName.get(name) || [];
        list.push(node);
        fnsByName.set(name, list);
      }
    }

    if (node.type === 'Property' && node.key && (node.key.name === 'render' || node.key.value === 'render')
        && node.value && FN_TYPES.has(node.value.type)) {
      renderSet.add(node.value);
    }

    if (node.type === 'Identifier') {
      const parent = ancestors[ancestors.length - 1];
      const isCallee = parent && parent.type === 'CallExpression' && parent.callee === node;
      const isOwnId = parent && FN_TYPES.has(parent.type) && parent.id === node;
      const isKey = parent && parent.type === 'Property' && parent.key === node && !parent.computed;
      const isMemberProp = parent && parent.type === 'MemberExpression' && parent.property === node && !parent.computed;
      const isDeclId = parent && parent.type === 'VariableDeclarator' && parent.id === node;
      const isParam = parent && FN_TYPES.has(parent.type) && parent.params && parent.params.indexOf(node) !== -1;
      if (!isCallee && !isOwnId && !isKey && !isMemberProp && !isDeclId && !isParam) bareRefNames.add(node.name);
    }

    if (node.type !== 'CallExpression') return;
    const callee = node.callee;
    const calleeName = callee.type === 'Identifier' ? callee.name
      : (callee.type === 'MemberExpression' && callee.property ? (callee.property.name || callee.property.value) : null);

    if ((calleeName === 'createElement' || calleeName === 'h' || calleeName === 'H' || calleeName === 'el' || calleeName === 'e')
        && node.arguments[0] && node.arguments[0].type === 'Identifier') {
      createElementArgNames.add(node.arguments[0].name);
    }

    if (calleeName && HOOK_RE.test(calleeName)) {
      const encl = enclosingFunction(ancestors);
      hookCalls.push({
        hook: calleeName, line: node.loc.start.line,
        encl: encl ? encl.node : null,
        conditional: encl ? isConditionalHookPosition(ancestors, encl.index, calleeName, node) : false,
        viaCustom: null,
      });
      return;
    }

    if (callee.type === 'Identifier') {
      const encl = enclosingFunction(ancestors);
      const list = callSites.get(callee.name) || [];
      list.push({
        line: node.loc.start.line,
        encl: encl ? encl.node : null,
        conditional: encl ? isConditionalPosition(ancestors, encl.index) : false,
      });
      callSites.set(callee.name, list);
    }
  }, []);

  for (const [node, info] of fnInfo) {
    if (info.name && (bareRefNames.has(info.name) || createElementArgNames.has(info.name))) info.byRef = true;
  }

  const componentish = (node) => {
    const info = fnInfo.get(node);
    return !!(info && (info.byRef || info.memberSlot));
  };

  // Render-equivalent fixpoint: seed with render() functions; add named
  // functions whose ONLY direct call is one unconditional site inside the set.
  const renderEquivalent = new Set(renderSet);
  let grew = true;
  while (grew) {
    grew = false;
    for (const [node, info] of fnInfo) {
      if (renderEquivalent.has(node) || !info.name) continue;
      const sites = callSites.get(info.name) || [];
      if (sites.length !== 1) continue;
      const s = sites[0];
      if (s.encl && renderEquivalent.has(s.encl) && !s.conditional) {
        renderEquivalent.add(node);
        grew = true;
      }
    }
  }

  // Custom-hook transparency: a use[A-Z]* function's call sites are hook calls
  // of the CALLER. Fixpoint so chained custom hooks resolve.
  const isCustomHookFn = (node) => {
    const info = fnInfo.get(node);
    return !!(info && info.name && CUSTOM_HOOK_RE.test(info.name));
  };
  let expanded = true;
  const expandedNames = new Set();
  while (expanded) {
    expanded = false;
    const bearers = new Set(hookCalls.map((hc) => hc.encl).filter(Boolean));
    for (const node of bearers) {
      if (!isCustomHookFn(node)) continue;
      const info = fnInfo.get(node);
      if (expandedNames.has(info.name)) continue;
      expandedNames.add(info.name);
      for (const s of (callSites.get(info.name) || [])) {
        hookCalls.push({ hook: info.name, line: s.line, encl: s.encl, conditional: s.conditional, viaCustom: info.name });
        expanded = true;
      }
    }
  }

  // Group hook calls by enclosing function and classify.
  const byFn = new Map();
  for (const hc of hookCalls) {
    if (hc.encl && isCustomHookFn(hc.encl)) continue; // evaluated at their call sites
    const key = hc.encl || 'TOP';
    const g = byFn.get(key) || { node: hc.encl, hooks: [] };
    g.hooks.push(hc);
    byFn.set(key, g);
  }

  const fails = [];
  const infos = [];
  for (const [key, g] of byFn) {
    const info = key === 'TOP' ? null : fnInfo.get(g.node);
    const name = info ? info.name : null;
    const lines = g.hooks.map((x) => x.hook + '@' + x.line + (x.viaCustom ? '(custom)' : '')).join(', ');

    if (key === 'TOP') { infos.push({ fn: '(module scope)', lines, why: 'hooks at module scope' }); continue; }

    if (renderEquivalent.has(g.node)) {
      const bad = g.hooks.filter((x) => x.conditional);
      if (bad.length) fails.push({ fn: name || 'render', lines: bad.map((x) => x.hook + '@' + x.line).join(', '), why: 'hook in a CONDITIONAL position of host-inline render code' });
      continue;
    }
    if (componentish(g.node)) continue; // real component / registry / render-prop
    if (!name) { infos.push({ fn: '(anonymous @' + info.line + ')', lines, why: 'hooks in an unresolvable anonymous function (factory/callback) — runtime gates own this' }); continue; }

    const sites = callSites.get(name) || [];
    if (sites.length === 0) { infos.push({ fn: name, lines, why: 'hook-bearing function is never directly called and never referenced' }); continue; }

    let hostUncond = 0;
    const failSites = [];
    const unresolved = [];
    for (const s of sites) {
      if (s.encl && renderEquivalent.has(s.encl)) {
        if (s.conditional) failSites.push(s.line);
        else hostUncond++;
      } else if (s.encl && (componentish(s.encl) || isCustomHookFn(s.encl))) {
        // hooks land inside a component instance (or roll up into a custom hook)
      } else if (s.encl && fnInfo.get(s.encl) && fnInfo.get(s.encl).name) {
        unresolved.push(s.line + ' via ' + fnInfo.get(s.encl).name);
      } else {
        unresolved.push(String(s.line));
      }
    }
    if (failSites.length) fails.push({ fn: name, lines, why: 'called CONDITIONALLY from host-inline render code at line(s) ' + failSites.join(',') });
    else if (hostUncond > 1) fails.push({ fn: name, lines, why: 'called ' + hostUncond + ' times from host-inline render code (hook count multiplies)' });
    else if (unresolved.length) infos.push({ fn: name, lines, why: 'call chain unresolved at ' + unresolved.slice(0, 4).join('; ') + (unresolved.length > 4 ? ' …' : '') });
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

let failFiles = 0, infoCount = 0, parseErrors = 0;
for (const rel of files) {
  const r = scanFile(path.resolve(ROOT, rel));
  if (r.parseError) { parseErrors++; console.log('PARSE FAIL ' + rel + ': ' + r.parseError); continue; }
  if (r.fails.length) {
    failFiles++;
    console.log('FAIL ' + rel);
    for (const f of r.fails) console.log('   - ' + f.fn + ' [' + f.lines + '] — ' + f.why);
  }
  infoCount += r.infos.length;
  if (showInfo && r.infos.length) {
    console.log('INFO ' + rel);
    for (const f of r.infos) console.log('   ~ ' + f.fn + ' [' + f.lines + '] — ' + f.why);
  }
}
console.log('---');
console.log('scan_hook_order_branches: ' + files.length + ' file(s), ' + failFiles + ' FAIL, '
  + infoCount + ' info (' + (showInfo ? 'shown' : 'run with --info to list') + '), ' + parseErrors + ' parse failure(s).');
process.exit(failFiles || parseErrors ? 1 : 0);
