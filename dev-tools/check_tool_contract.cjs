#!/usr/bin/env node
// check_tool_contract.cjs — validate STEM Lab / SEL Hub tool plugins against the
// PLUGIN CONTRACT (the "is this a conformant tool" gate). First artifact of the
// Tool Forge: it is the schema that defines "conformant", and it doubles as a
// normal repo gate that can audit the existing ~108 tools today.
//
// WHY: the existing gates (check_render_refs, check_free_vars, check_stem_render,
// golden) verify a tool PARSES, has no render-crash free vars, and renders without
// throwing — but NOTHING verifies it conforms to the published plugin contract
// (registers correctly, exposes the required config fields, and only touches the
// `ctx` surface the host actually provides). That gap is exactly where AI-authored
// tools fail silently, and it is what makes "AI writes JS" trustworthy as "AI writes
// a CONFORMANT plugin". This gate fills it.
//
// WHAT IT CHECKS (per stem_lab/stem_tool_*.js and sel_hub/sel_tool_*.js):
//   STRUCTURAL (blocking under --strict — these break registration/the contract):
//     - exactly one window.{StemLab|SelHub}.registerTool(id, config) call
//     - id is a string literal
//     - config is an object literal
//     - config.render is a function (or an identifier reference)
//     - id is UNIQUE across all scanned tools (dup id => registry collision, last wins)
//   CONTRACT-QUALITY (advisory — warn; these are debt, not breakage):
//     - required config fields present: label, desc, color, category, icon, render
//     - color is a known theme name (tailwind) or a hex string
//     - category is recorded (the known-set is discovered empirically, see summary)
//     - ctx SURFACE conformance: every ctx.<member> (and destructured { ... } = ctx)
//       used in render must be in the published surface; unknowns are flagged AND
//       the full discovered union is printed so the allow-list can be finalized.
//
// NOTE ON SCOPE: filename slug != tool id by design (stem_tool_cellular.js registers
// 'cellularLab'), so this gate does NOT enforce filename==id. PLUGIN_FILES coverage is
// check_plugin_files.cjs's job; render-safety is check_stem_render's. This is contract
// SHAPE + ctx-surface only.
//
// Usage:
//   node dev-tools/check_tool_contract.cjs                 (all tools, report-only, exit 0)
//   node dev-tools/check_tool_contract.cjs --strict        (exit 1 on structural violations)
//   node dev-tools/check_tool_contract.cjs stem_lab/stem_tool_cellular.js
//   node dev-tools/check_tool_contract.cjs --json          (machine-readable; for the Forge)
//   node dev-tools/check_tool_contract.cjs --quiet         (summary only)
//
// Exit codes: 0 — no structural violations (or report-only). 1 — structural violation(s) under --strict.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const acorn = require(path.join(ROOT, 'node_modules', 'acorn'));
// The contract manifest is the single source of truth, shared with the browser
// Tier-1 validator (stem_tool_forge.js). This gate adds eslint-scope precision on top.
const { CONTRACT } = require('./forge_contract_core.js');
// eslint-scope (same as check_render_refs) — used to resolve which `ctx` is the
// render param vs. a shadowing local (e.g. `const ctx = canvas.getContext('2d')`),
// so the ctx-surface check counts only the real plugin ctx.
let eslintScope;
for (const base of [path.join(ROOT, 'node_modules'), path.join(ROOT, 'desktop/web-app', 'node_modules')]) {
  try { eslintScope = require(path.join(base, 'eslint-scope')); break; } catch (_) {}
}

const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const JSON_OUT = args.includes('--json');
const QUIET = args.includes('--quiet');
const fileArgs = args.filter(a => !a.startsWith('--'));

// ── The contract manifest (the schema) — imported from forge_contract_core.js, the
// single source of truth shared with the in-browser Tier-1 validator. The ctx surface
// is the EXACT host injection (the check_stem_render/check_sel_render stub union), so a
// member outside it is genuinely something the host does not provide. ──
const CTX_SURFACE = new Set(CONTRACT.ctxSurface);
const REQUIRED_FIELDS = CONTRACT.requiredFields;
const THEME_COLORS = new Set(CONTRACT.themeColors);

function gatherFiles() {
  if (fileArgs.length) return fileArgs.map(f => path.resolve(ROOT, f));
  const out = [];
  for (const dir of ['stem_lab', 'sel_hub']) {
    const d = path.join(ROOT, dir);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) {
      if (/^(stem|sel)_tool_.+\.js$/.test(f) && !f.endsWith('.bak')) out.push(path.join(d, f));
    }
  }
  return out;
}

function objKey(p) {
  if (!p.key) return null;
  return p.key.type === 'Identifier' ? p.key.name : (p.key.type === 'Literal' ? String(p.key.value) : null);
}
function isFn(node) { return node && (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression'); }

// Add .parent pointers (acorn doesn't) so we can find the MemberExpression around
// each resolved `ctx` reference.
function addParents(ast) {
  (function walk(n, parent) {
    if (!n || typeof n.type !== 'string') return;
    n.parent = parent;
    for (const k in n) {
      if (k === 'loc' || k === 'range' || k === 'start' || k === 'end' || k === 'parent') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && walk(c, n));
      else if (v && typeof v.type === 'string') walk(v, n);
    }
  })(ast, null);
}

// Scope-aware: collect ctx.<member> + `{a,b}=ctx` ONLY for references that resolve
// to the render function's ctx param (eslint-scope excludes shadowing locals).
// Returns null if scoping is unavailable (caller skips the surface check).
function collectCtxMembersScoped(fnNode, ctxName, sm) {
  if (!sm) return null;
  let scope;
  try { scope = sm.acquire(fnNode, true); } catch (_) { scope = null; }
  if (!scope) return null;
  const v = scope.variables.find(x => x.name === ctxName);
  if (!v) return new Set();           // param shadowed/unused → no real ctx usage
  const used = new Set();
  for (const ref of v.references) {
    const id = ref.identifier, par = id.parent;
    if (par && par.type === 'MemberExpression' && par.object === id && !par.computed && par.property.type === 'Identifier') {
      used.add(par.property.name);
    } else if (par && par.type === 'VariableDeclarator' && par.init === id && par.id && par.id.type === 'ObjectPattern') {
      for (const pr of par.id.properties) if (pr.type === 'Property' && pr.key.type === 'Identifier') used.add(pr.key.name);
    }
  }
  return used;
}

function scanFile(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const res = { file: rel, errors: [], warns: [], id: null, target: null, category: null, color: null, ctxUsed: [] };
  let code, ast;
  try { code = fs.readFileSync(file, 'utf8'); } catch (e) { res.errors.push('cannot read file'); return res; }
  try {
    ast = acorn.parse(code, { ecmaVersion: 2022, sourceType: 'script', locations: true, ranges: true, allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true });
  } catch (e) { res.errors.push('parse error: ' + e.message); return res; }
  addParents(ast);
  let sm = null;
  if (eslintScope) { try { sm = eslintScope.analyze(ast, { ecmaVersion: 2022, sourceType: 'script', ignoreEval: true }); } catch (_) {} }

  // find registerTool call(s)
  const calls = [];
  (function walk(n) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' &&
        n.callee.property.type === 'Identifier' && n.callee.property.name === 'registerTool') {
      calls.push(n);
    }
    for (const k in n) {
      if (k === 'loc' || k === 'range' || k === 'start' || k === 'end' || k === 'parent') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && walk(c));
      else if (v && typeof v.type === 'string') walk(v);
    }
  })(ast);

  if (calls.length === 0) { res.errors.push('no registerTool(id, config) call found'); return res; }
  if (calls.length > 1) res.warns.push(`${calls.length} registerTool calls (expected 1)`);
  const call = calls[0];

  // target (StemLab / SelHub) from the callee object chain
  let obj = call.callee.object;
  const chain = [];
  while (obj) { if (obj.type === 'Identifier') { chain.push(obj.name); break; } if (obj.type === 'MemberExpression') { if (obj.property.type === 'Identifier') chain.push(obj.property.name); obj = obj.object; } else break; }
  res.target = chain.includes('SelHub') ? 'sel' : (chain.includes('StemLab') ? 'stem' : 'unknown');
  if (res.target === 'unknown') res.warns.push('registerTool not on window.StemLab/SelHub');

  // id
  const idArg = call.arguments[0];
  if (!idArg || idArg.type !== 'Literal' || typeof idArg.value !== 'string') res.errors.push('id (arg 1) is not a string literal');
  else res.id = idArg.value;

  // config
  const cfg = call.arguments[1];
  if (!cfg) { res.errors.push('config (arg 2) is missing'); return res; }
  if (cfg.type === 'Identifier') { res.warns.push('config is a variable reference (fields not statically checked)'); return res; }
  if (cfg.type !== 'ObjectExpression') { res.errors.push('config (arg 2) is not an object literal or variable'); return res; }
  const props = {}; const kinds = {}; let hasSpread = false;
  for (const p of cfg.properties) {
    if (p.type === 'SpreadElement' || p.type === 'ExperimentalSpreadProperty') { hasSpread = true; continue; }
    if (p.type === 'Property') { const k = objKey(p); if (k) { props[k] = p.value; kinds[k] = p.kind || 'init'; } }
  }
  if (hasSpread) res.warns.push('config has spread properties (...) — fields not fully statically checked');

  // required fields
  for (const f of REQUIRED_FIELDS) {
    if (!(f in props)) res.warns.push(`missing config.${f}`);
    else if (kinds[f] !== 'init' && f !== 'render') res.warns.push(`config.${f} is a getter/setter (value not statically checked)`);
  }

  // render must be a plain function property (getter/identifier can return a non-function)
  if (props.render) {
    if (kinds.render !== 'init') {
      res.errors.push('config.render must be a plain function property, not a getter/setter');
    } else if (isFn(props.render)) {
      const ctxParam = props.render.params[0];
      if (ctxParam && ctxParam.type === 'ObjectPattern' && ctxParam.properties.some(pr => pr.type === 'RestElement' || pr.type === 'ExperimentalRestProperty')) {
        res.warns.push('render destructures ctx with rest (...) — ctx surface not fully validated');
      }
      let used = null;
      if (ctxParam && ctxParam.type === 'Identifier') {
        used = collectCtxMembersScoped(props.render, ctxParam.name, sm);
        if (used === null) res.warns.push('could not scope-analyze ctx surface (skipped)');
      } else if (ctxParam && ctxParam.type === 'ObjectPattern') {
        used = new Set();
        for (const pr of ctxParam.properties) if (pr.type === 'Property' && pr.key.type === 'Identifier') used.add(pr.key.name);
      } else {
        res.warns.push('render() has no ctx parameter');
      }
      if (used) {
        res.ctxUsed = [...used].sort();
        const unknown = res.ctxUsed.filter(m => !CTX_SURFACE.has(m));
        if (unknown.length) res.warns.push('ctx members outside published surface: ' + unknown.join(', '));
      }
    } else if (props.render.type === 'Identifier') {
      res.errors.push('config.render must be a function literal, not a variable reference (cannot statically verify)');
    } else {
      res.errors.push('config.render is not a function');
    }
  } else {
    res.errors.push('config.render is missing');
  }

  // color
  if (props.color) {
    if (props.color.type === 'Literal' && typeof props.color.value === 'string') {
      res.color = props.color.value;
      if (!THEME_COLORS.has(res.color) && !/^#[0-9a-fA-F]{3,8}$/.test(res.color)) res.warns.push(`color "${res.color}" is not a known theme name or hex`);
    } else res.warns.push('color is not a string literal');
  }
  // category
  if (props.category && props.category.type === 'Literal' && typeof props.category.value === 'string') res.category = props.category.value;
  // icon
  if (props.icon && !(props.icon.type === 'Literal' && typeof props.icon.value === 'string')) res.warns.push('icon is not a string literal');

  return res;
}

// ── run ──
const files = gatherFiles();
const results = files.map(scanFile);

// id uniqueness (structural)
const idSeen = new Map();
for (const r of results) { if (r.id) { if (idSeen.has(r.id)) { r.errors.push(`duplicate tool id "${r.id}" (also in ${idSeen.get(r.id)})`); } else idSeen.set(r.id, r.file); } }

const structuralFails = results.filter(r => r.errors.length);
const withWarns = results.filter(r => r.warns.length);

if (JSON_OUT) {
  console.log(JSON.stringify({ scanned: results.length, structuralFails: structuralFails.length, results }, null, 2));
} else {
  if (!QUIET) {
    for (const r of results) {
      if (r.errors.length || r.warns.length) {
        console.log(`\n${r.file}${r.id ? '  [' + r.id + ' · ' + r.target + ']' : ''}`);
        for (const e of r.errors) console.log('  ✖ ' + e);
        for (const w of r.warns) console.log('  ⚠ ' + w);
      }
    }
  }
  // discovered surfaces (to finalize the schema)
  const allCtx = new Set(), allCat = new Set(), allColor = new Set();
  for (const r of results) { r.ctxUsed.forEach(m => allCtx.add(m)); if (r.category) allCat.add(r.category); if (r.color) allColor.add(r.color); }
  const unknownCtx = [...allCtx].filter(m => !CTX_SURFACE.has(m)).sort();
  console.log('\n' + '='.repeat(60));
  console.log(`tool-contract: scanned ${results.length} tools · ${structuralFails.length} structural fail(s) · ${withWarns.length} with warnings`);
  console.log('discovered categories: ' + [...allCat].sort().join(', '));
  console.log('discovered colors    : ' + [...allColor].sort().join(', '));
  console.log('ctx members used outside current surface (candidates to add): ' + (unknownCtx.length ? unknownCtx.join(', ') : '(none)'));
}

process.exit(STRICT && structuralFails.length ? 1 : 0);
