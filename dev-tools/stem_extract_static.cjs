#!/usr/bin/env node
// stem_extract_static.cjs <tool> [--write] — SAFE static-config i18n (v2).
// Module-level config can't be wrapped at definition (no __alloT in scope), so
// we wrap PROSE fields at the CONSUMPTION site in render, keyed off a stable
// discriminator (an object key, an array index's .id, or a .map param's .id) —
// the logic key stays the untouched English value; only DISPLAYED text is
// localized. __alloT falls back to the English 2nd arg, so an imperfect key
// degrades to English, never crashes.
//
// Consumption shapes handled (BASE.field, field ∈ prose, in a display position):
//   ARR.map(function(r){ … r.desc … })            -> key  r.id
//   OBJ[k].desc                                    -> key  k
//   ARR[i].desc                                    -> key  ARR[i].id
//   var m = OBJ[k]; … m.desc …                     -> key  k         (alias)
//   var m = ARR[i]; … m.desc …                     -> key  m.id      (alias)
// Catalog sources: module-level `var ARR=[{id,…}]` and `var OBJ={key:{…}}`.
// Never label/name/title/id (logic-key risk); never comparison/lookup positions.
'use strict';
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'stem_i18n_report');
const tool = process.argv[2];
const WRITE = process.argv.includes('--write');
if (!tool) { console.error('Usage: stem_extract_static.cjs <tool> [--write]'); process.exit(2); }
const file = path.join(ROOT, 'stem_lab', 'stem_tool_' + tool + '.js');
if (!fs.existsSync(file)) { console.error('Not found: ' + file); process.exit(2); }

const PROSE = new Set(['desc', 'description', 'detail', 'details', 'fact', 'explanation',
  'note', 'tip', 'hint', 'caption', 'summary', 'body', 'intro', 'feedback', 'question',
  'answer', 'instruction', 'instructions', 'goal', 'message', 'content', 'subtitle']);
const ELEMS = new Set(['createElement', 'h', 'jsx', 'jsxs', 'el']);
function looksLikeNL(s) {
  s = s.trim(); if (s.length < 3) return false;
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
function calleeName(c) { if (!c) return ''; if (c.type === 'Identifier') return c.name; if (c.type === 'MemberExpression') return (c.property && (c.property.name || c.property.value)) || ''; return ''; }

const code = fs.readFileSync(file, 'utf8');
const src = (n) => code.slice(n.start, n.end);
const ast = parser.parse(code, { sourceType: 'script', allowReturnOutsideFunction: true, errorRecovery: true, ranges: true });

// ── Render range (registerTool-anchored) + in-scope alias (__alloT|t) ──
// Wraps must land INSIDE render so the translation fn is in scope. Prefer the
// collision-free __alloT (run stem_add_tdecl first); fall back to a tool's `t`.
let renderStart = -1, renderEnd = -1;
function isFnNode(n) { return n && /FunctionExpression|ArrowFunctionExpression/.test(n.type); }
traverse(ast, {
  CallExpression(p) {
    if (renderStart >= 0) return;
    const c = p.node.callee;
    if (!(c && c.type === 'MemberExpression' && c.property && c.property.name === 'registerTool')) return;
    const obj = p.node.arguments[1]; if (!obj || obj.type !== 'ObjectExpression') return;
    for (const pr of obj.properties) { const k = pr.key && (pr.key.name || pr.key.value); if (k === 'render') { const fn = pr.type === 'ObjectMethod' ? pr : (isFnNode(pr.value) ? pr.value : null); if (fn && fn.body) { renderStart = fn.body.start; renderEnd = fn.body.end; } } }
  }
});
const isCtxInit = (n) => n && ((n.type === 'MemberExpression' && n.property && n.property.name === 't') || (n.type === 'LogicalExpression' && isCtxInit(n.left)));
let ALIAS = null;
if (renderStart >= 0) traverse(ast, {
  VariableDeclarator(p) {
    if (!(p.node.start > renderStart && p.node.end < renderEnd) || !isCtxInit(p.node.init)) return;
    const nm = p.node.id && p.node.id.name;
    if (nm === '__alloT') ALIAS = '__alloT';
    else if (nm === 't' && ALIAS == null) ALIAS = 't';
  }
});
if (renderStart < 0 || !ALIAS) { console.log(tool + ': no render-scope __alloT/t decl (run stem_add_tdecl first) — skipping.'); process.exit(0); }
const inRender = (n) => n.start > renderStart && n.end < renderEnd;

// ── Catalog id-arrays and keyed-objects with string-literal prose fields ──
function fieldsOf(obj) {
  if (!obj || obj.type !== 'ObjectExpression') return null;
  let id = null; const fields = {};
  for (const pr of obj.properties) {
    if (pr.type !== 'ObjectProperty' || pr.computed) continue;
    const k = pr.key && (pr.key.name || pr.key.value);
    if (pr.value && pr.value.type === 'StringLiteral') { if (k === 'id') id = pr.value.value; else if (PROSE.has(k)) fields[k] = pr.value.value; }
  }
  return { id, fields };
}
const catalogArr = new Map();   // name -> [{id, fields}]
const catalogKeyed = new Map(); // name -> Map(objKey -> fields)
traverse(ast, {
  VariableDeclarator(p) {
    const nm = p.node.id && p.node.id.name; const init = p.node.init; if (!nm || !init) return;
    if (init.type === 'ArrayExpression') {
      const recs = [];
      for (const el of init.elements) { const r = el && fieldsOf(el); if (r && r.id != null && Object.keys(r.fields).length) recs.push({ id: r.id, fields: r.fields }); }
      if (recs.length && (!catalogArr.has(nm) || recs.length > catalogArr.get(nm).length)) catalogArr.set(nm, recs);
    } else if (init.type === 'ObjectExpression') {
      const m = new Map();
      for (const pr of init.properties) {
        if (pr.type !== 'ObjectProperty' || pr.computed) continue;
        const key = pr.key && (pr.key.name || pr.key.value);
        const r = pr.value && fieldsOf(pr.value);
        if (key != null && r && Object.keys(r.fields).length) m.set(String(key), r.fields);
      }
      if (m.size && (!catalogKeyed.has(nm) || m.size > catalogKeyed.get(nm).size)) catalogKeyed.set(nm, m);
    }
  }
});
if (!catalogArr.size && !catalogKeyed.size) { console.log(tool + ': no id-array / keyed-object config with prose fields.'); process.exit(0); }

// ── Map-param bindings: ARR.map(fn(param)) where ARR is a cataloged id-array ──
const paramBinding = new Map(); // binding-id-node.start -> arrName
traverse(ast, {
  CallExpression(p) {
    if (calleeName(p.node.callee) !== 'map') return;
    const obj = p.node.callee.object;
    if (!obj || obj.type !== 'Identifier' || !catalogArr.has(obj.name)) return;
    const fn = p.node.arguments[0]; if (!fn || !/Function/.test(fn.type)) return;
    const param = fn.params && fn.params[0]; if (!param || param.type !== 'Identifier') return;
    const b = p.get('arguments.0').scope.getBinding(param.name);
    if (b) paramBinding.set(b.identifier.start, obj.name);
  }
});

// ── Alias bindings: var X = OBJ[k] / ARR[i] ──
const aliasBinding = new Map(); // binding-id-node.start -> {kind, name, keyExpr}
traverse(ast, {
  VariableDeclarator(p) {
    const id = p.node.id, init = p.node.init;
    if (!id || id.type !== 'Identifier' || !init || init.type !== 'MemberExpression' || !init.computed) return;
    const base = init.object; if (!base || base.type !== 'Identifier') return;
    const b = p.scope.getBinding(id.name); if (!b) return;
    if (catalogKeyed.has(base.name)) aliasBinding.set(b.identifier.start, { kind: 'keyed', name: base.name, keyExpr: src(init.property) });
    else if (catalogArr.has(base.name)) aliasBinding.set(b.identifier.start, { kind: 'arr', name: base.name, keyExpr: id.name + '.id' });
  }
});

// ── Find PROSE display reads BASE.field and resolve a (keyExpr, source) ──
function isDisplayRead(mp) {
  const par = mp.parent;
  if (par && par.type === 'CallExpression' && ELEMS.has(calleeName(par.callee)) && par.arguments.indexOf(mp.node) >= 2) return true;
  if (par && par.type === 'ObjectProperty' && par.value === mp.node) { const k = String((par.key && (par.key.name || par.key.value)) || '').toLowerCase(); if (PROSE.has(k)) return true; }
  if (par && (par.type === 'ConditionalExpression' || par.type === 'LogicalExpression')) {
    const gp = mp.parentPath && mp.parentPath.parent;
    if (gp && gp.type === 'CallExpression' && ELEMS.has(calleeName(gp.callee)) && gp.arguments.indexOf(mp.parent) >= 2) return true;
  }
  return false;
}
const edits = [];
const usedArr = new Map();   // arrName -> Set(field)
const usedKeyed = new Map(); // objName -> Set(field)
traverse(ast, {
  MemberExpression(mp) {
    if (mp.node.computed) return;
    const field = mp.node.property && mp.node.property.name;
    if (!field || !PROSE.has(field)) return;
    if (!inRender(mp.node)) return; // wrap only where the alias is in scope
    if (mp.findParent(pp => pp.isCallExpression() && calleeName(pp.node.callee) === '__alloT')) return;
    if (!isDisplayRead(mp)) return;
    const obj = mp.node.object;
    let keyExpr = null, srcKind = null, srcName = null;
    if (obj.type === 'MemberExpression' && obj.computed && obj.object.type === 'Identifier') {
      if (catalogKeyed.has(obj.object.name)) { keyExpr = src(obj.property); srcKind = 'keyed'; srcName = obj.object.name; }
      else if (catalogArr.has(obj.object.name)) { keyExpr = '(' + src(obj) + ').id'; srcKind = 'arr'; srcName = obj.object.name; }
    } else if (obj.type === 'Identifier') {
      const b = mp.scope.getBinding(obj.name);
      if (b) {
        if (paramBinding.has(b.identifier.start)) { keyExpr = obj.name + '.id'; srcKind = 'arr'; srcName = paramBinding.get(b.identifier.start); }
        else if (aliasBinding.has(b.identifier.start)) { const a = aliasBinding.get(b.identifier.start); keyExpr = a.keyExpr; srcKind = a.kind; srcName = a.name; }
      }
    }
    if (!keyExpr || !srcName) return;
    // only wrap if at least one cataloged value for this field is real NL
    const avail = srcKind === 'arr'
      ? catalogArr.get(srcName).some(r => r.fields[field] != null && looksLikeNL(r.fields[field]))
      : Array.from(catalogKeyed.get(srcName).values()).some(f => f[field] != null && looksLikeNL(f[field]));
    if (!avail) return;
    const repl = ALIAS + "('stem." + tool + ".' + (" + keyExpr + ") + '_" + field + "', " + src(mp.node) + ")";
    edits.push({ start: mp.node.start, end: mp.node.end, replacement: repl });
    const reg = srcKind === 'arr' ? usedArr : usedKeyed;
    if (!reg.has(srcName)) reg.set(srcName, new Set());
    reg.get(srcName).add(field);
  }
});

// ── Build English key map from catalog for fields actually wrapped ──
const english = {}; let keyCount = 0;
function add(key, val) { if (val != null && looksLikeNL(val) && !(key in english)) { english[key] = val; keyCount++; } }
for (const [name, fields] of usedArr) for (const r of catalogArr.get(name)) for (const f of fields) add(r.id + '_' + f, r.fields[f]);
for (const [name, fields] of usedKeyed) for (const [k, fv] of catalogKeyed.get(name)) for (const f of fields) add(k + '_' + f, fv[f]);

console.log(tool + ': arrays=' + catalogArr.size + ' keyed=' + catalogKeyed.size + ', wraps=' + edits.length + ', keys=' + keyCount);
if (!edits.length) process.exit(0);

let out = code;
edits.sort((a, b) => b.start - a.start);
for (const e of edits) out = out.slice(0, e.start) + e.replacement + out.slice(e.end);
if (WRITE) {
  fs.copyFileSync(file, file + '.bak.static');
  fs.writeFileSync(file, out);
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'ui_strings_stem_' + tool + '.json'), JSON.stringify({ [tool]: english }, null, 2) + '\n');
  console.log('  WROTE (backup .bak.static) + ui map. NEXT: node --check, inject_stem_keys, smoke.');
} else {
  console.log('  (dry-run) sample keys: ' + Object.keys(english).slice(0, 5).join(', '));
}
