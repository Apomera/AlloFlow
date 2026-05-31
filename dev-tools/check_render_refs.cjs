#!/usr/bin/env node
// check_render_refs.cjs — catch the "undeclared identifier crashes the component
// on render" class in directly-maintained CDN modules (NOT view_*_source.jsx,
// which check_view_props.cjs already covers).
//
// Bug class (3 production incidents in WordSoundsModal, May 2026):
//   - `data` referenced in an anchorTarget useMemo body + dep array (undeclared
//     at modal scope; only a child-view prop) → ReferenceError on FIRST render.
//   - `handleKeyDown` wired to Elkonin onKeyDown but never defined.
//   - `onPlayAudio` in handleAnchorPlay's useCallback dep array (a child-view
//     prop, undeclared at modal scope) → ReferenceError on render.
// These MASK each other: fixing one exposes the next on the following deploy.
//
// Why the existing tooling missed them: check_view_props.cjs only scans
// view_*_source.jsx; word_sounds_module.js / teacher_module.js / etc. are
// hand-maintained *_module.js with no _source.jsx, so they were never covered.
//
// What this does: parse each *_module.js, run scope analysis (eslint-scope),
// and find unresolved references sitting in positions evaluated DURING render:
//   • hook DEPENDENCY ARRAYS  (useMemo/useCallback/useEffect 2nd arg)  → ERROR (gate)
//   • useMemo FACTORY BODIES  (run on render)                          → WARN (advisory)
// Dep-array free vars are near-zero-false-positive (deps are props/state/vars,
// never icons), so they gate the deploy. useMemo-body free vars are advisory
// (those positions also reference host-provided lucide icons).
//
// Usage:
//   node dev-tools/check_render_refs.cjs                 (all root *_module.js)
//   node dev-tools/check_render_refs.cjs word_sounds_module.js teacher_module.js
//   node dev-tools/check_render_refs.cjs --quiet         (summary only)
//   node dev-tools/check_render_refs.cjs --verbose       (also list useMemo-body warns)
//
// Exit codes: 0 — no dep-array free vars.  1 — render-crash candidate(s) found.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const acorn = require(path.join(ROOT, 'node_modules', 'acorn'));
// eslint-scope lives in the CRA app's node_modules, not root.
let eslintScope;
for (const base of [path.join(ROOT, 'node_modules'), path.join(ROOT, 'prismflow-deploy', 'node_modules')]) {
  try { eslintScope = require(path.join(base, 'eslint-scope')); break; } catch (_) {}
}
if (!eslintScope) {
  console.error('check_render_refs: eslint-scope not found (root or prismflow-deploy node_modules). Skipping.');
  process.exit(0); // don't block deploy on a missing dev dep
}

const args = process.argv.slice(2);
const QUIET = args.includes('--quiet');
const VERBOSE = args.includes('--verbose');
const fileArgs = args.filter(a => !a.startsWith('--'));

const KNOWN = new Set(['undefined','NaN','Infinity','globalThis','Math','JSON','Object','Array','String','Number','Boolean','Date','RegExp','Error','TypeError','RangeError','Promise','Map','Set','WeakMap','WeakSet','Symbol','Proxy','Reflect','parseInt','parseFloat','isNaN','isFinite','encodeURIComponent','decodeURIComponent','encodeURI','decodeURI','setTimeout','clearTimeout','setInterval','clearInterval','queueMicrotask','structuredClone','btoa','atob','window','document','navigator','location','history','localStorage','sessionStorage','console','fetch','Audio','AudioContext','webkitAudioContext','Blob','File','FileReader','URL','URLSearchParams','FormData','Image','XMLHttpRequest','MutationObserver','IntersectionObserver','ResizeObserver','requestAnimationFrame','cancelAnimationFrame','getComputedStyle','alert','confirm','prompt','CustomEvent','Event','KeyboardEvent','DOMParser','TextEncoder','TextDecoder','crypto','performance','speechSynthesis','SpeechSynthesisUtterance','HTMLElement','HTMLCanvasElement','Node','NodeList','Element','CanvasRenderingContext2D','Path2D','DOMException','AbortController','React','ReactDOM','Chart','lucide','process','module','require','exports','__dirname','__filename']);

function isHook(callee, name) {
  if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier' &&
      callee.object.name === 'React' && callee.property.type === 'Identifier')
    return callee.property.name === name;
  return callee.type === 'Identifier' && callee.name === name;
}
function collectIds(node, unresolvedSet, out) {
  (function walk(n) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'Identifier') {
      if (unresolvedSet.has(n.range[0] + ':' + n.range[1]) && !KNOWN.has(n.name))
        out.push({ name: n.name, line: n.loc.start.line });
      return;
    }
    for (const k in n) {
      if (k === 'loc' || k === 'range' || k === 'start' || k === 'end') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && walk(c));
      else if (v && typeof v.type === 'string') walk(v);
    }
  })(node);
}

function scanFile(file) {
  const code = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = acorn.parse(code, { ecmaVersion: 2022, sourceType: 'script', locations: true, ranges: true, allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true });
  } catch (e) {
    return { file, parseError: e.message, errors: [], warns: [] };
  }
  const sm = eslintScope.analyze(ast, { ecmaVersion: 2022, sourceType: 'script', ignoreEval: true });
  const unresolved = new Set();
  for (const ref of sm.globalScope.through) unresolved.add(ref.identifier.range[0] + ':' + ref.identifier.range[1]);

  const errors = [], warns = [];
  (function walk(n) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'CallExpression' && n.callee) {
      const memo = isHook(n.callee, 'useMemo'), cb = isHook(n.callee, 'useCallback'), eff = isHook(n.callee, 'useEffect');
      if (memo || cb || eff) {
        const deps = n.arguments[1];
        if (deps && deps.type === 'ArrayExpression') {
          const found = []; collectIds(deps, unresolved, found);
          found.forEach(f => errors.push({ ...f, where: (memo ? 'useMemo' : cb ? 'useCallback' : 'useEffect') + ' dep-array' }));
        }
        if (memo && n.arguments[0]) {
          const found = []; collectIds(n.arguments[0], unresolved, found);
          // useMemo bodies legitimately reference host-provided icons/components
          // (PascalCase). Treat lowercase free vars as the higher-signal warning.
          found.filter(f => /^[a-z_$]/.test(f.name)).forEach(f => warns.push({ ...f, where: 'useMemo body' }));
        }
      }
    }
    for (const k in n) {
      if (k === 'loc' || k === 'range' || k === 'start' || k === 'end') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && walk(c));
      else if (v && typeof v.type === 'string') walk(v);
    }
  })(ast);
  return { file, errors, warns };
}

let targets;
if (fileArgs.length) targets = fileArgs.map(f => path.isAbsolute(f) ? f : path.join(ROOT, f));
else targets = fs.readdirSync(ROOT).filter(f => /_module\.js$/.test(f) && !f.startsWith('_')).map(f => path.join(ROOT, f)); // skip _build_* intermediates

let totalErrors = 0, totalWarns = 0, parseErrors = 0;
for (const file of targets) {
  if (!fs.existsSync(file)) { console.error(`  (missing: ${path.relative(ROOT, file)})`); continue; }
  const r = scanFile(file);
  const rel = path.relative(ROOT, file);
  if (r.parseError) { parseErrors++; if (!QUIET) console.log(`  ⚠ parse-skip ${rel}: ${r.parseError.split('\n')[0]}`); continue; }
  totalErrors += r.errors.length; totalWarns += r.warns.length;
  if (r.errors.length && !QUIET) {
    console.log(`\n❌ ${rel}`);
    for (const e of r.errors) console.log(`     line ${e.line}: ${e.name}   [${e.where}] — undeclared at module scope, crashes on render`);
  }
  if (VERBOSE && r.warns.length) {
    console.log(`   ⚠ ${rel} (advisory, useMemo-body free vars):`);
    for (const w of r.warns) console.log(`       line ${w.line}: ${w.name}`);
  }
}

if (totalErrors > 0) {
  console.log(`\n❌ check_render_refs: ${totalErrors} render-crash candidate(s) in hook dependency arrays. Fix before deploy.`);
  process.exit(1);
}
console.log(`✓ check_render_refs: no dep-array free vars across ${targets.length} module(s)` + (totalWarns ? ` (${totalWarns} useMemo-body advisories — run --verbose)` : '') + (parseErrors ? ` (${parseErrors} parse-skipped)` : ''));
process.exit(0);
