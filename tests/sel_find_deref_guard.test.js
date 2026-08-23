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
function walk(node, visit) {
  visit(node);
  for (const k of Object.keys(node)) {
    if (k === 'loc') continue;
    const v = node[k];
    if (Array.isArray(v)) { for (const c of v) if (isNode(c)) walk(c, visit); }
    else if (isNode(v)) walk(v, visit);
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
