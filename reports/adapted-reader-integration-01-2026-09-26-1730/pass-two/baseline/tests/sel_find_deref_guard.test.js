// SEL Hub — `X.find(fn).prop` throws the moment the lookup misses.
//
// Six sites did this. All of them sat behind a truthiness guard on the id,
// which is not the same thing as a guard on the lookup SUCCEEDING. These tools
// persist their state, so an id that no longer exists in its array — a renamed
// zone, a removed generation, an old simulation turn — crashes the tool for
// exactly the students who have used it most and have the oldest saved data.
//
// dev-tools/check_find_deref.cjs had never been aimed here: its walk root was
// stem_lab and nothing else, so a directory argument was accepted and ignored.
//
// Detection is AST-based, not textual. A regex over this shape produces false
// positives on every guarded form and is not worth trusting.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
let acorn = null;
try {
  acorn = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'))('acorn');
} catch { acorn = null; }

const files = readdirSync(resolve(ROOT, 'sel_hub')).filter((f) => /\.js$/.test(f));

function isNode(v) { return v && typeof v === 'object' && typeof v.type === 'string'; }
function walk(node, visit, parent) {
  visit(node, parent);
  for (const k of Object.keys(node)) {
    if (k === 'loc') continue;
    const v = node[k];
    if (Array.isArray(v)) { for (const c of v) if (isNode(c)) walk(c, visit, node); }
    else if (isNode(v)) walk(v, visit, node);
  }
}

// `<something>.find(<function>)` used directly as the object of a member access,
// with no `||` fallback wrapped around it.
function unguardedDerefs(src) {
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', locations: true });
  const hits = [];
  walk(ast, (n) => {
    if (n.type !== 'MemberExpression') return;
    // `X.find(fn)?.prop` is already safe. sociallab uses exactly that, and an
    // AST walk that ignores `optional` reports it as a bug.
    if (n.optional) return;
    const obj = n.object;
    if (!obj || obj.type !== 'CallExpression') return;
    const callee = obj.callee;
    if (!callee || callee.type !== 'MemberExpression') return;
    if (!callee.property || callee.property.name !== 'find') return;
    const arg = obj.arguments[0];
    if (!arg || (arg.type !== 'FunctionExpression' && arg.type !== 'ArrowFunctionExpression')) return;
    // `(X.find(fn) || fallback).prop` parses as MemberExpression over a
    // LogicalExpression, so it never reaches here — this really is the raw form.
    hits.push({
      line: n.loc.start.line,
      prop: n.property && (n.property.name || n.property.value),
    });
  });
  return hits;
}

describe.skipIf(!acorn)('SEL Hub · no unguarded find() dereference', () => {
  it.each(files)('%s', (f) => {
    const src = readFileSync(resolve(ROOT, 'sel_hub', f), 'utf8');
    const hits = unguardedDerefs(src).map((h) => `line ${h.line}: .find(...).${h.prop}`);
    expect(
      hits,
      `${f}: find() result dereferenced with no fallback — throws when the id is stale:\n  ${hits.join('\n  ')}`,
    ).toEqual([]);
  });

  it('the detection distinguishes guarded from unguarded (calibration)', () => {
    const bad = 'var c = ZONES.find(function (z) { return z.id === sel; }).color;';
    const good = 'var c = (ZONES.find(function (z) { return z.id === sel; }) || ZONES[0]).color;';
    const goodEmpty = "var l = (GENS.find(function (g) { return g.id === gen; }) || {}).label || '';";
    const optional = "var i = SKILL.find(function (c) { return c.id === s; })?.icon || 'x';";
    expect(unguardedDerefs(bad)).toHaveLength(1);
    expect(unguardedDerefs(good)).toHaveLength(0);
    expect(unguardedDerefs(goodEmpty)).toHaveLength(0);
    expect(unguardedDerefs(optional), 'optional chaining is already safe').toHaveLength(0);
  });

  it('the six previously-broken sites carry a real fallback', () => {
    const expectations = [
      ['sel_hub/sel_tool_advocacy.js', '|| {}).partner'],
      ['sel_hub/sel_tool_genogram.js', "|| {}).label || ''"],
      ['sel_hub/sel_tool_zones.js', '|| ZONES[0]).color'],
      ['sel_hub/sel_tool_zones.js', "|| {}).label || 'different'"],
      ['sel_hub/sel_tool_zones.js', "|| {}).label || 'that zone'"],
    ];
    expectations.forEach(([file, needle]) => {
      expect(readFileSync(resolve(ROOT, file), 'utf8'), `${file} should contain ${needle}`).toContain(needle);
    });
  });
});

// ── Same parse, second question: is anything built and then never shown? ──
//
// mindfulness carries a whole Mantras browser this way: `mantrasContent` is
// assigned an h(...) twice and never read, so it is absent from that tool's
// 30-entry render list and no user can reach it. About a hundred lines of
// maintenance surface pretending to be a feature.
//
// Whether to finish or delete it is a content call, so it is listed here as a
// known exception rather than asserted away. The check exists so a SECOND
// half-finished feature cannot appear unnoticed.
const KNOWN_UNREACHABLE = ['sel_tool_mindfulness.js:mantrasContent'];

function builtButNeverShown(src) {
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', locations: true });
  const declared = new Map();
  const built = new Map();
  const read = new Map();
  walk(ast, (n, parent) => {
    if (n.type === 'VariableDeclarator' && n.id && n.id.type === 'Identifier') {
      declared.set(n.id.name, n.id.loc.start.line);
      return;
    }
    if (n.type === 'AssignmentExpression' && n.left && n.left.type === 'Identifier') {
      const r = n.right;
      const isRender = r && r.type === 'CallExpression' && r.callee
        && ((r.callee.type === 'Identifier' && r.callee.name === 'h')
          || (r.callee.type === 'MemberExpression' && r.callee.property && r.callee.property.name === 'createElement'));
      if (isRender) built.set(n.left.name, (built.get(n.left.name) || 0) + 1);
      return;
    }
    if (n.type === 'Identifier' && parent) {
      // a read is any occurrence that is not a declaration target, an
      // assignment target, an object key, or a member property
      if (parent.type === 'VariableDeclarator' && parent.id === n) return;
      if (parent.type === 'AssignmentExpression' && parent.left === n) return;
      if (parent.type === 'Property' && parent.key === n && !parent.computed) return;
      if (parent.type === 'MemberExpression' && parent.property === n && !parent.computed) return;
      read.set(n.name, (read.get(n.name) || 0) + 1);
    }
  }, null);
  const dead = [];
  declared.forEach((line, name) => {
    if (!built.get(name) || read.get(name)) return;
    dead.push({ name, line, builds: built.get(name) });
  });
  return dead;
}

describe.skipIf(!acorn)('SEL Hub · no new feature is built and then never shown', () => {
  it.each(files)('%s', (f) => {
    const src = readFileSync(resolve(ROOT, 'sel_hub', f), 'utf8');
    const dead = builtButNeverShown(src)
      .filter((d) => !KNOWN_UNREACHABLE.includes(`${f}:${d.name}`))
      .map((d) => `${d.name} (declared line ${d.line}, built ${d.builds}x, never read)`);
    expect(
      dead,
      `${f}: render content assembled and then never displayed — an unfinished feature no user can reach: ${dead.join(' | ')}`,
    ).toEqual([]);
  });

  it('the known exception is still exactly one, and still unreachable', () => {
    // If this starts failing because mantrasContent IS read, the feature was
    // finished and the exception should be removed.
    const src = readFileSync(resolve(ROOT, 'sel_hub/sel_tool_mindfulness.js'), 'utf8');
    const dead = builtButNeverShown(src).map((d) => d.name);
    expect(dead, 'mindfulness should still show exactly the one known dead feature').toEqual(['mantrasContent']);
  });

  it('the detection can tell built-and-shown from built-and-dropped (calibration)', () => {
    // wrapped in a function: a bare `return` is not valid at the top level
    const shown = 'function r() { var a = null; a = h("div", null, "x"); return h("div", null, a); }';
    const dropped = 'function r() { var a = null; a = h("div", null, "x"); return h("div", null, "b"); }';
    expect(builtButNeverShown(shown)).toHaveLength(0);
    expect(builtButNeverShown(dropped).map((d) => d.name)).toEqual(['a']);
  });
});
