#!/usr/bin/env node
/**
 * triage_free_vars — turn check_free_vars' name-level output into located,
 * severity-classified findings.
 *
 * check_free_vars answers "does this file reference a name nothing declares?".
 * That is the right question for a gate but a poor worklist: it gives a name and
 * a count, not a place, and it does not say whether the reference will actually
 * throw. This walks the same scope analysis and reports each unresolved
 * reference with its line, classified as:
 *
 *   THROWS  — an unresolved READ. Calls, property access and arithmetic all
 *             throw ReferenceError alike: foo(), foo.bar, foo * 2, if (foo).
 *   guarded — inside `typeof foo === 'function'` on the same statement. typeof
 *             is the one operator that tolerates an undeclared name, so these
 *             are safe. `if (foo)` is NOT a guard — it throws on the read.
 *   assign  — a bare write (`foo = 1`). In sloppy mode this creates an implicit
 *             global rather than throwing: a leak, not a crash.
 *
 * Three earlier attempts at this got it wrong in ways worth recording:
 *   1. matching only `name(` missed property reads and arithmetic entirely;
 *   2. counting every textual occurrence of a flagged name drowned the report
 *      in in-scope uses (a tool using `k` as a loop variable reported 2,148);
 *   3. hand-copying a globals list omitted encodeURIComponent, FileReader,
 *      Audio and friends, inventing 181 findings across 67 tools.
 * Hence: use the analyser for locations, and read the globals list out of
 * check_free_vars so triage and gate can never disagree.
 *
 *   node dev-tools/triage_free_vars.cjs                 # all stem_lab tools
 *   node dev-tools/triage_free_vars.cjs <file> [<file>]
 *   node dev-tools/triage_free_vars.cjs --all           # include guarded/assign
 *
 * Always exits 0 — this is a worklist, not a gate. check_free_vars is the gate.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const acorn = require(path.join(ROOT, 'node_modules', 'acorn'));
const eslintScope = require(path.join(ROOT, 'node_modules', 'eslint-scope'));

const SHOW_ALL = process.argv.includes('--all');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));

// The gate's own globals list, parsed from source so the two cannot drift.
const gateSrc = fs.readFileSync(path.join(__dirname, 'check_free_vars.cjs'), 'utf8');
const gAt = gateSrc.indexOf('const KNOWN_GLOBALS = new Set([');
const gStart = gateSrc.indexOf('[', gAt);
const gEnd = gateSrc.indexOf(']);', gStart);
// eslint-disable-next-line no-eval
const KNOWN = new Set(eval(gateSrc.slice(gStart, gEnd + 1)));
// Libraries this repo loads from a CDN by design; real at runtime.
for (const g of ['THREE', 'math', 'jStat', 'Blockly', 'Chart', 'PIXI', 'd3', 'katex', 'marked']) KNOWN.add(g);

const files = args.length
  ? args
  : fs.readdirSync(path.join(ROOT, 'stem_lab'))
      .filter((f) => /^stem_tool_.*\.js$/.test(f)).map((f) => 'stem_lab/' + f);

let throwing = 0;
const rows = [];

for (const rel of files) {
  const abs = path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
  let src;
  try { src = fs.readFileSync(abs, 'utf8'); } catch { continue; }
  let ast;
  try {
    ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true, ranges: true, locations: true });
  } catch (e) { console.log('  ! parse failed ' + rel + ': ' + e.message); continue; }

  const sm = eslintScope.analyze(ast, { ecmaVersion: 2022, sourceType: 'script', ignoreEval: true });
  const lines = src.split(/\r?\n/);
  const hits = [];

  const visit = (scope) => {
    for (const ref of scope.references) {
      if (ref.resolved) continue;
      const name = ref.identifier.name;
      if (KNOWN.has(name)) continue;
      const line = ref.identifier.loc.start.line;
      const text = (lines[line - 1] || '').trim();
      const esc = name.replace(/\$/g, '\\$');
      const guarded = new RegExp('typeof\\s+' + esc + '(?![\\w$])').test(text);
      const write = ref.isWrite() && !ref.isRead();
      hits.push({ name, line, text: text.slice(0, 96), kind: guarded ? 'guarded' : write ? 'assign' : 'THROWS' });
    }
    scope.childScopes.forEach(visit);
  };
  visit(sm.globalScope);

  const shown = SHOW_ALL ? hits : hits.filter((h) => h.kind === 'THROWS');
  if (!shown.length) continue;
  throwing += hits.filter((h) => h.kind === 'THROWS').length;
  rows.push({ tool: rel.replace(/^stem_lab\/stem_tool_|\.js$/g, ''), shown, total: hits.length });
}

for (const r of rows) {
  console.log('\n  ' + r.tool + '   (' + r.shown.length + ' shown of ' + r.total + ' unresolved refs)');
  const seen = new Set();
  for (const h of r.shown) {
    const key = h.name + ':' + h.line;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log('      ' + h.kind.padEnd(8) + 'L' + String(h.line).padEnd(7) + h.name.padEnd(22) + h.text);
  }
}
console.log('\n' + rows.length + ' tool(s), ' + throwing + ' unresolved READ(s) that throw at runtime.');
console.log('Fix these; then check_free_vars --update can baseline the rest safely.');
