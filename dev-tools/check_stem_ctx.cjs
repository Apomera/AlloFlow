#!/usr/bin/env node
// check_stem_ctx.cjs — verify every `ctx.X` access in stem_tool_*.js (and
// sel_tool_*.js) corresponds to a key actually provided in the ctx object
// constructed by the loader.
//
// Bug class this catches:
//   STEM/SEL plugins read `ctx.callImagen`, `ctx.callTTS`, etc. If a tool
//   references `ctx.foo` but the loader's ctx object literal doesn't include
//   `foo`, the read returns `undefined`. A subsequent `ctx.foo()` then throws
//   "ctx.foo is not a function" — usually silently caught by the StemLab
//   render() try/catch (stem_lab_module.js:59), which logs the error and
//   returns null, leaving the user with a blank tool render. No banner, no
//   toast, no way for the user to know the tool failed.
//
// Strategy:
//   1. Parse stem_lab/stem_lab_module.js — find the `var _ctx = { ... }`
//      object literal, collect its keys. Also collect `ctx.icons.X` keys.
//   2. For each stem_tool_*.js, find every `ctx.X` MemberExpression where X
//      is a static identifier (not computed).
//   3. Subtract guaranteed-provided keys + nested-object keys + computed
//      accesses. Whatever remains is a candidate missing field.
//   4. Same logic for sel_hub/sel_hub_module.js + sel_tool_*.js.
//
// Usage:
//   node dev-tools/check_stem_ctx.cjs
//   node dev-tools/check_stem_ctx.cjs --tool=stem_tool_xxx.js
//   node dev-tools/check_stem_ctx.cjs --verbose

'use strict';
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const SINGLE_TOOL = (args.find(a => a.startsWith('--tool=')) || '').split('=')[1] || null;

function parseFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  try {
    return {
      src,
      ast: parser.parse(src, {
        sourceType: 'script',
        plugins: ['jsx', 'optionalChaining', 'nullishCoalescingOperator'],
        errorRecovery: true,
      }),
    };
  } catch (e) {
    return { src, error: e.message };
  }
}

// Find the `var _ctx = { ... }` declaration in the loader and collect its
// top-level keys + the nested `icons: { ... }` keys.
function collectCtxKeys(loaderFile) {
  const { ast, error } = parseFile(loaderFile);
  if (error) throw new Error('Loader parse failed: ' + error);
  const topKeys = new Set();
  const iconKeys = new Set();

  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    // Match: var _ctx = { ... } OR const _ctx = { ... }
    if (node.type === 'VariableDeclarator' && node.id && node.id.name === '_ctx' &&
        node.init && node.init.type === 'ObjectExpression') {
      for (const prop of node.init.properties) {
        if (prop.type !== 'ObjectProperty' && prop.type !== 'Property') continue;
        if (prop.computed) continue;
        const key = (prop.key.type === 'Identifier') ? prop.key.name
                  : (prop.key.type === 'StringLiteral') ? prop.key.value : null;
        if (!key) continue;
        topKeys.add(key);
        // If the value is itself an ObjectExpression for `icons`, collect its keys
        if (key === 'icons' && prop.value && prop.value.type === 'ObjectExpression') {
          for (const ip of prop.value.properties) {
            if (ip.type !== 'ObjectProperty' && ip.type !== 'Property') continue;
            if (ip.computed) continue;
            const ikey = (ip.key.type === 'Identifier') ? ip.key.name
                       : (ip.key.type === 'StringLiteral') ? ip.key.value : null;
            if (ikey) iconKeys.add(ikey);
          }
        }
      }
    }
    for (const k of Object.keys(node)) {
      if (k === 'loc' || k === 'range' || k === 'start' || k === 'end') continue;
      const v = node[k];
      if (v && typeof v === 'object') visit(v);
    }
  }
  visit(ast);
  return { topKeys, iconKeys };
}

// Walk a tool's AST and collect every `ctx.X` MemberExpression where X is a
// static identifier — BUT only within scopes where `ctx` resolves to the
// outer plugin parameter (typically `render(ctx)`). Tools frequently shadow
// `ctx` with a canvas-2D context (`var ctx = canvas.getContext('2d')`) or a
// local state object; those member accesses are NOT loader-ctx fields and
// must be excluded to avoid massive false positives.
function collectCtxAccess(filePath) {
  const { src, ast, error } = parseFile(filePath);
  if (error) return { error };
  const ctxFieldsAccessed = new Map(); // name → array of {line}
  const iconFieldsAccessed = new Map(); // name → array of {line}

  // Scope chain: at each function entry, push true if this function's params
  // OR its hoisted declarations include `ctx`. When walking, the innermost
  // matching scope determines whether `ctx` resolves to a LOCAL ctx (skip)
  // or to the outer plugin-render ctx (count).
  //
  // We want to count only when the NEAREST `ctx` binding is the render's
  // function parameter — i.e., a function with `(ctx)` as a param and no
  // inner `var ctx = ...` shadow before the access point.

  function isCtxShadowedByLocal(blockBody, ctxBindings) {
    // Walk block body for var ctx / let ctx / const ctx declarations.
    // Returns true if we find a shadow inside this block scope.
    if (!blockBody) return false;
    let shadowed = false;
    function scan(node) {
      if (shadowed || !node || typeof node !== 'object') return;
      if (Array.isArray(node)) { node.forEach(scan); return; }
      // Stop at nested function boundaries — those have their own scope.
      if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' ||
          node.type === 'ArrowFunctionExpression' || node.type === 'ClassMethod' ||
          node.type === 'ObjectMethod') return;
      if (node.type === 'VariableDeclaration') {
        for (const d of node.declarations) {
          if (d.id && d.id.type === 'Identifier' && d.id.name === 'ctx') {
            shadowed = true;
            return;
          }
        }
      }
      for (const k of Object.keys(node)) {
        if (k === 'loc' || k === 'range' || k === 'start' || k === 'end') continue;
        const v = node[k];
        if (v && typeof v === 'object') scan(v);
      }
    }
    scan(blockBody);
    return shadowed;
  }

  // ctxBindings: stack of binding kinds. 'plugin' = render(ctx) param, 'shadow' = inner shadow.
  // Top of stack determines whether `ctx.X` should be counted.
  function walk(node, ctxBindingStack, parent) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(n => walk(n, ctxBindingStack, parent)); return; }

    // Function entry: determine if this fn introduces a `ctx` binding.
    //
    // Plugin-ctx contract: the loader calls `tool.render(ctx)`. Only the
    // function bound to the `render` property of the registerTool config
    // is the plugin entry point. Any OTHER function with `(ctx)` as a param
    // (e.g., `function drawTree(ctx)`, `function tween(ctx, t)`) is a
    // helper whose `ctx` is whatever the caller passes — typically a
    // canvas-2D context, NOT the plugin ctx.
    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression' || node.type === 'ClassMethod' ||
        node.type === 'ObjectMethod') {
      const params = node.params || [];
      const hasCtxParam = params.some(p => p.type === 'Identifier' && p.name === 'ctx');
      const shadowsCtx = isCtxShadowedByLocal(node.body, ctxBindingStack);
      // Is this the `render: function(ctx)` of a registerTool config?
      // ObjectMethod: key.name === 'render' AND its first param is `ctx`.
      // ObjectProperty: value is FunctionExpression and key.name === 'render'.
      const isPluginRender = hasCtxParam && (
        (node.type === 'ObjectMethod' && node.key && node.key.name === 'render') ||
        (parent && parent.type === 'ObjectProperty' && parent.key && parent.key.name === 'render')
      );
      let newStack = ctxBindingStack;
      if (isPluginRender && !shadowsCtx) {
        newStack = ctxBindingStack.concat(['plugin']);
      } else if (hasCtxParam || shadowsCtx) {
        // Any non-render function with (ctx) param OR a local var ctx is a shadow.
        newStack = ctxBindingStack.concat(['shadow']);
      }
      walk(node.body, newStack, node);
      walk(params, newStack, node);
      return;
    }

    // Member access tracking — only when innermost ctx binding is 'plugin'.
    const innermost = ctxBindingStack[ctxBindingStack.length - 1] || null;
    if (innermost === 'plugin') {
      if (node.type === 'MemberExpression' && !node.computed &&
          node.object && node.object.type === 'Identifier' && node.object.name === 'ctx' &&
          node.property && node.property.type === 'Identifier') {
        // Skip ctx.icons here — handled separately below
        if (node.property.name !== 'icons') {
          const name = node.property.name;
          const line = (node.loc && node.loc.start && node.loc.start.line) || 0;
          if (!ctxFieldsAccessed.has(name)) ctxFieldsAccessed.set(name, []);
          ctxFieldsAccessed.get(name).push({ line });
        }
      }
      // Match: ctx.icons.X — track separately
      if (node.type === 'MemberExpression' && !node.computed &&
          node.property && node.property.type === 'Identifier' &&
          node.object && node.object.type === 'MemberExpression' && !node.object.computed &&
          node.object.object && node.object.object.type === 'Identifier' && node.object.object.name === 'ctx' &&
          node.object.property && node.object.property.type === 'Identifier' && node.object.property.name === 'icons') {
        const name = node.property.name;
        const line = (node.loc && node.loc.start && node.loc.start.line) || 0;
        if (!iconFieldsAccessed.has(name)) iconFieldsAccessed.set(name, []);
        iconFieldsAccessed.get(name).push({ line });
      }
    }

    for (const k of Object.keys(node)) {
      if (k === 'loc' || k === 'range' || k === 'start' || k === 'end') continue;
      const v = node[k];
      if (v && typeof v === 'object') walk(v, ctxBindingStack, node);
    }
  }
  walk(ast, [], null);
  return { ctxFieldsAccessed, iconFieldsAccessed };
}

function runAudit(label, loaderFile, toolDir, toolFilter) {
  console.log('\n══ ' + label + ' ══');
  console.log('  Loader: ' + path.relative(ROOT, loaderFile));
  if (!fs.existsSync(loaderFile)) {
    console.log('  ⚠ Loader file not found — skipping');
    return { findings: [], total: 0 };
  }
  const { topKeys, iconKeys } = collectCtxKeys(loaderFile);
  console.log('  ctx keys provided: ' + topKeys.size + ' top-level + ' + iconKeys.size + ' icons');

  const toolFiles = fs.readdirSync(toolDir)
    .filter(f => toolFilter(f) && !f.startsWith('_'))
    .filter(f => SINGLE_TOOL === null || f === SINGLE_TOOL)
    .sort();

  const findings = [];
  for (const f of toolFiles) {
    const filePath = path.join(toolDir, f);
    const { ctxFieldsAccessed, iconFieldsAccessed, error } = collectCtxAccess(filePath);
    if (error) {
      console.log('  ⚠ ' + f + ' parse error: ' + error);
      continue;
    }
    const missing = [];
    const missingIcons = [];
    for (const [key, refs] of ctxFieldsAccessed) {
      // Skip private fields (starting with _) — internal contract
      if (key.startsWith('_')) continue;
      if (!topKeys.has(key)) missing.push({ key, refs });
    }
    for (const [key, refs] of iconFieldsAccessed) {
      if (!iconKeys.has(key)) missingIcons.push({ key, refs });
    }
    if (missing.length || missingIcons.length) {
      findings.push({ file: f, missing, missingIcons });
    }
  }

  console.log('  Tools scanned: ' + toolFiles.length);
  console.log('  Tools with missing ctx fields: ' + findings.length);

  for (const { file, missing, missingIcons } of findings) {
    console.log('\n  ⚠ ' + file);
    for (const { key, refs } of missing) {
      console.log('     ctx.' + key + '  (' + refs.length + ' ref' + (refs.length === 1 ? '' : 's') + ', first at L' + refs[0].line + ')');
    }
    for (const { key, refs } of missingIcons) {
      console.log('     ctx.icons.' + key + '  (' + refs.length + ' ref' + (refs.length === 1 ? '' : 's') + ', first at L' + refs[0].line + ')');
    }
  }

  return { findings, total: toolFiles.length };
}

// ──────────────────────────────────────────────────────────────────────────
console.log('\nSTEM/SEL plugin ctx audit');
console.log('═════════════════════════');

const stemResult = runAudit('STEM Lab', path.join(ROOT, 'stem_lab', 'stem_lab_module.js'),
  path.join(ROOT, 'stem_lab'), f => /^stem_tool_.*\.js$/.test(f));

const selResult = runAudit('SEL Hub', path.join(ROOT, 'sel_hub', 'sel_hub_module.js'),
  path.join(ROOT, 'sel_hub'), f => /^sel_tool_.*\.js$/.test(f));

const totalMissing = stemResult.findings.length + selResult.findings.length;
console.log('\n─────────────────────────');
console.log('  Total tools scanned:       ' + (stemResult.total + selResult.total));
console.log('  Tools with missing fields: ' + totalMissing);

if (totalMissing === 0) {
  console.log('\n  ✅ Every ctx access has a provider.\n');
  process.exit(0);
}

console.log('\n  ⚠ A tool that accesses ctx.X where X is not in the loader\'s _ctx object');
console.log('    will get undefined and crash when invoked. The crash is caught at');
console.log('    stem_lab_module.js:59 / sel_hub render guards — user sees a blank tool.');
console.log('    Fix: add the missing field to the loader\'s _ctx object literal.\n');

// Don't fail CI here — many findings will be intentional optional fields.
// Treat as informational; promote to blocking once the catalog is curated.
process.exit(0);
