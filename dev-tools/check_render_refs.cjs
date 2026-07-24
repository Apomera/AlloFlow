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
//   • IIFE BODIES             (run when invoked — common in render trees) → WARN (advisory)
//   • useMemo FACTORY BODIES  (run on render)                          → WARN (advisory)
// Dep-array free vars are near-zero-false-positive (deps are props/state/vars,
// never icons), so they gate the deploy. IIFE-body + useMemo-body free vars are
// advisory because cross-IIFE scope analysis surfaces too many true-but-latent
// false negatives (functions defined inside IIFEs but called from outer scopes;
// 676 across the tree at gate-introduction time, 2026-06-08).
//
// IIFE coverage was added 2026-06-08 after stem_tool_numberline.js shipped a
// `d.magHunt` crash inside a `tab === 'magCompare' && (function(){...})()`
// IIFE-in-render-tree expression — outside dep arrays + useMemo bodies, so the
// original gate missed it. The component had `_n` as its state container; the
// IIFE author typed `d` by mistake. eslint-scope correctly flagged `d` as
// unresolved at module scope; the gate just wasn't checking IIFE bodies.
//
// IIFE findings are advisory not blocking because at introduction time a
// repo-wide sweep produced 676 candidates including several latent
// (real-but-never-triggered) bugs like angles.js setLabToolData and
// sel_tool_journal.js `m.label`. Promoting to blocking before those are
// triaged would block every deploy. Real BLOCKING coverage for the
// IIFE-in-render-tree crash class comes from check_stem_render.cjs which
// (post-2026-06-08) renders every tool through every tab/sub-state value
// found in the source, exercising the actual render path.
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
for (const base of [path.join(ROOT, 'node_modules'), path.join(ROOT, 'desktop/web-app', 'node_modules')]) {
  try { eslintScope = require(path.join(base, 'eslint-scope')); break; } catch (_) {}
}
if (!eslintScope) {
  console.error('check_render_refs: eslint-scope not found (root or desktop/web-app node_modules). Skipping.');
  process.exit(0); // don't block deploy on a missing dev dep
}

const args = process.argv.slice(2);
const QUIET = args.includes('--quiet');
const VERBOSE = args.includes('--verbose');
const fileArgs = args.filter(a => !a.startsWith('--'));

const KNOWN = new Set(['undefined','NaN','Infinity','globalThis','Math','JSON','Object','Array','String','Number','Boolean','Date','RegExp','Error','TypeError','RangeError','Promise','Map','Set','WeakMap','WeakSet','Symbol','Proxy','Reflect','parseInt','parseFloat','isNaN','isFinite','encodeURIComponent','decodeURIComponent','encodeURI','decodeURI','setTimeout','clearTimeout','setInterval','clearInterval','queueMicrotask','structuredClone','btoa','atob','window','document','navigator','location','history','localStorage','sessionStorage','console','fetch','Audio','AudioContext','webkitAudioContext','Blob','File','FileReader','URL','URLSearchParams','FormData','Image','XMLHttpRequest','MutationObserver','IntersectionObserver','ResizeObserver','requestAnimationFrame','cancelAnimationFrame','getComputedStyle','alert','confirm','prompt','CustomEvent','Event','KeyboardEvent','DOMParser','TextEncoder','TextDecoder','crypto','performance','speechSynthesis','SpeechSynthesisUtterance','HTMLElement','HTMLCanvasElement','Node','NodeList','Element','CanvasRenderingContext2D','Path2D','DOMException','AbortController','React','ReactDOM','Chart','lucide','process','module','require','exports','__dirname','__filename']);
// Identifiers that are NEVER a module-global in this codebase, so an unresolved + called
// one can ONLY be a render crash (no runtime scope provides them). Keep this list tight —
// it is the opposite of KNOWN. `t` = i18n (always a scoped prop; module-level code uses
// window.__alloT). Don't add setX/callX/handleX here — CDN factories receive those at runtime.
const ALWAYS_SCOPED = new Set(['t']);

// The ONLY setX-shaped identifiers that are legitimately free (host/browser
// globals) — verified empirically across every module: an unresolved setX is
// otherwise ALWAYS a dropped React state setter. Anything not here that is
// unresolved + setX-shaped is the edit-war "stomped useState declaration"
// class (the reconPreviewIdx fatal crash 2026-06-13).
const TIMER_SETTERS = new Set(['setTimeout', 'setInterval', 'setImmediate']);

// Setters the HOST app / a tool FACTORY injects at runtime as ambient free
// vars (eslint-scope can't see the injection, so they sit in globalScope.through
// in EVERY module that uses them — not a dropped declaration). Verified
// injected: each module here passes its render golden (the value can't be
// undefined at render) and/or guards with `typeof setX === 'function'`
// (e.g. content_engine_source.jsx:1871). Two sources: (a) main-app setters
// passed into sub-modules (setHistory/setGeneratedContent/setShowClassAnalytics),
// (b) tool-factory state (setToolData/setState in STEM tools). A genuinely-
// LOCAL state setter that gets stomped is NOT here, so it still hard-fails —
// which is the whole point (the reconPreviewIdx class). Adding a NEW
// factory-injected setter requires one entry here; that's the only maintenance.
const HOST_INJECTED_SETTERS = new Set([
  'setToolData', 'setState', 'setHistory', 'setGeneratedContent',
  'setShowClassAnalytics', 'setIsPlaying', 'setIsPaused', 'setIsGeneratingGuide',
  'setRtiGoals', 'setConfirmDialog', 'setPhishMode', 'setTriageActive',
]);

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
  const unresolvedNames = new Set();
  for (const ref of sm.globalScope.through) {
    unresolved.add(ref.identifier.range[0] + ':' + ref.identifier.range[1]);
    unresolvedNames.add(ref.identifier.name);
  }

  const errors = [], warns = [];
  const seenDroppedSetters = new Set();
  (function walk(n) {
    if (!n || typeof n.type !== 'string') return;
    // Dropped useState/useReducer declaration (edit-war stomp class, BLOCKING).
    // A `const [x, setX] = useState(...)` whose declaration line was deleted
    // while its usages survived: `x` is read in render (crashes ON render) and
    // `setX` is called in handlers — both become unresolved. An unresolved,
    // non-timer setX-shaped free identifier is a near-certain dropped setter.
    // This is the reconPreviewIdx fatal crash the dep-array/IIFE/t checks all
    // missed (it was a plain JSX expression read).
    if (n.type === 'Identifier' && /^set[A-Z]/.test(n.name) && !TIMER_SETTERS.has(n.name)
        && !HOST_INJECTED_SETTERS.has(n.name)
        && unresolved.has(n.range[0] + ':' + n.range[1]) && !seenDroppedSetters.has(n.name)) {
      seenDroppedSetters.add(n.name);
      const valueName = n.name.charAt(3).toLowerCase() + n.name.slice(4);
      const pairNote = unresolvedNames.has(valueName) ? (' — paired value `' + valueName + '` is read in render') : '';
      errors.push({ name: n.name, line: n.loc.start.line, where: 'dropped useState setter (render crash)' + pairNote });
    }
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
      // IIFE: `(function(){...})()` or `(()=>{...})()`. Common pattern in
      // render trees: `tab === 'X' && (function(){ ... })()`. Body runs when
      // invoked — at render time if the IIFE is inline in JSX/createElement
      // args. eslint-scope correctly flags unresolved free vars in the body.
      // Advisory not blocking — see header comment for rationale (676 candidates
      // at gate-introduction time, real BLOCKING coverage via check_stem_render
      // multi-tab smoke). Filter to lowercase (same rationale as useMemo body).
      if ((n.callee.type === 'FunctionExpression' || n.callee.type === 'ArrowFunctionExpression') && n.callee.body) {
        const found = []; collectIds(n.callee.body, unresolved, found);
        found.filter(f => /^[a-z_$]/.test(f.name)).forEach(f => warns.push({ ...f, where: 'IIFE body' }));
      }
      // Called free i18n var: `t(...)` where `t` is unresolved. This is the class that
      // crashed GameThemeToggle (a free `t()` in an aria-label, which no dep-array /
      // useMemo / IIFE check covered). A BLANKET called-free-var check is unusable here
      // (~300 hits — CDN factories legitimately receive setX/callX/handleX from their
      // runtime scope), so we restrict to ALWAYS_SCOPED: identifiers that are NEVER a
      // module-global in this codebase, so an unresolved one can ONLY be a crash. `t` is
      // always a scoped prop/dep (module-level helpers use window.__alloT instead).
      if (n.callee.type === 'Identifier' && ALWAYS_SCOPED.has(n.callee.name)
          && unresolved.has(n.callee.range[0] + ':' + n.callee.range[1])) {
        // BLOCKING (promoted 2026-06-11, after the backlog was cleared): a free `t(...)`
        // throws ReferenceError when its code path runs — the GameThemeToggle class. `t` is
        // never a runtime global here (module-level code uses window.__alloT), so an
        // unresolved, *called* `t` can only be a crash. The original ~122-instance backlog
        // (symbol_studio / view_quiz / anchor_charts handlers, latent because SSR goldens
        // never fire them) is fixed, so this now hard-fails the gate to stop regressions.
        errors.push({ name: n.callee.name, line: n.callee.loc.start.line, where: 'called free i18n var (t-crash)' });
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
else {
  // Default coverage: every directly-maintained CDN JS module — root *_module.js
  // plus the STEM Lab + SEL Hub tools. Excludes _build_* intermediates.
  targets = fs.readdirSync(ROOT).filter(f => /_module\.js$/.test(f) && !f.startsWith('_')).map(f => path.join(ROOT, f));
  for (const sub of ['stem_lab', 'sel_hub']) {
    const dir = path.join(ROOT, sub);
    if (fs.existsSync(dir)) targets = targets.concat(
      fs.readdirSync(dir).filter(f => f.endsWith('.js') && !f.startsWith('_')).map(f => path.join(dir, f)));
  }
}

let totalErrors = 0, totalWarns = 0, parseErrors = 0;
for (const file of targets) {
  if (!fs.existsSync(file)) { console.error(`  (missing: ${path.relative(ROOT, file)})`); continue; }
  const r = scanFile(file);
  const rel = path.relative(ROOT, file);
  if (r.parseError) { parseErrors++; console.log(`\n❌ ${rel}: does NOT parse — ${r.parseError.split('\n')[0]} (module won't load)`); continue; }
  totalErrors += r.errors.length; totalWarns += r.warns.length;
  if (r.errors.length && !QUIET) {
    console.log(`\n❌ ${rel}`);
    for (const e of r.errors) console.log(`     line ${e.line}: ${e.name}   [${e.where}] — undeclared at module scope, crashes on render`);
  }
  if (VERBOSE && r.warns.length) {
    console.log(`   ⚠ ${rel} (advisory free vars):`);
    for (const w of r.warns) console.log(`       line ${w.line}: ${w.name}   [${w.where}]`);
  }
}

if (totalErrors > 0 || parseErrors > 0) {
  if (totalErrors) console.log(`\n❌ ${totalErrors} render-crash candidate(s) (hook dep-array free vars + called free t() + dropped useState setters).`);
  if (parseErrors) console.log(`❌ ${parseErrors} module(s) fail to parse (won't load).`);
  console.log('check_render_refs: fix before deploy (bypass: SKIP_RENDER_CHECK=1).');
  process.exit(1);
}
console.log(`✓ check_render_refs: ${targets.length} module(s) parse + no dep-array free vars` + (totalWarns ? ` (${totalWarns} useMemo-body + IIFE-body advisories — run --verbose)` : '') + '.');
process.exit(0);
