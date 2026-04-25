#!/usr/bin/env node
/**
 * Build view_renderers_module.js from view_renderers_source.jsx (Phase G.2).
 *
 * 1. Reads view_renderers_source.jsx (JSX-bearing).
 * 2. Compiles JSX -> React.createElement via esbuild.
 * 3. Wraps in IIFE with:
 *    - duplicate-load guard (sentinel: window.AlloModules.ViewRenderersModule)
 *    - React hook aliases (defensive, even though renderers don't call hooks)
 *    - Lucide icon aliases via _lazyIcon('Name') reading from window.AlloIcons
 * 4. Writes view_renderers_module.js + syncs to prismflow-deploy/public/.
 *
 * Modeled on _build_immersive_reader_module.js (proven JSX-CDN pipeline).
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'view_renderers_source.jsx');
const OUTPUT = path.join(ROOT, 'view_renderers_module.js');
const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', 'view_renderers_module.js');
const TMP = path.join(ROOT, '_tmp_view_renderers_entry.jsx');
const TMP_COMPILED = TMP + '.compiled.js';

if (!fs.existsSync(SOURCE)) {
  console.error('Source not found:', SOURCE);
  process.exit(1);
}

const source = fs.readFileSync(SOURCE, 'utf-8');

// Lucide icons used across the three renderers. Determined by scanning the
// extracted source for `<[A-Z][A-Za-z0-9]+\b` JSX patterns intersected with
// known Lucide icon names. _lazyIcon defers resolution to call-time so the
// module doesn't have to wait for window.AlloIcons to be populated.
//
// History:
// - First pass shipped 13 icons. Missed Unlock + Unplug (used inside the
//   concept-map lock-toggle button), surfaced as runtime ReferenceError.
// - Adding both. window.AlloIcons in the monolith has also been extended
//   to expose them.
const ICONS = [
  'AlertCircle', 'ArrowDown', 'ArrowRight', 'CheckCircle2', 'Gamepad2',
  'Layout', 'List', 'ListOrdered', 'Lock', 'Plus', 'RefreshCw', 'Sparkles',
  'Unlock', 'Unplug', 'X',
];

const entry = `
/* global React */
${source}
window.__viewRenderersExports = { renderFormattedText, renderOutlineContent, renderInteractiveMap };
`;

fs.writeFileSync(TMP, entry, 'utf-8');

console.log('Compiling view_renderers_source.jsx with esbuild...');
try {
  execSync(
    `npx esbuild "${TMP}" --bundle=false --format=esm --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --outfile="${TMP_COMPILED}" --target=es2020`,
    { cwd: ROOT, stdio: 'inherit' }
  );
} catch (e) {
  console.error('esbuild compilation failed');
  try { fs.unlinkSync(TMP); } catch (_) {}
  process.exit(1);
}

const compiled = fs.readFileSync(TMP_COMPILED, 'utf-8')
  .replace(/\/\*.*global.*\*\/\n/g, '')
  .replace(/window\.__viewRenderersExports\s*=\s*\{[^}]+\};?\s*/, '')
  .trim();

try { fs.unlinkSync(TMP); } catch (_) {}
try { fs.unlinkSync(TMP_COMPILED); } catch (_) {}

const iconAliases = ICONS.map(n => `var ${n} = _lazyIcon('${n}');`).join('\n');

const outputCode = `(function() {
'use strict';
if (window.AlloModules && window.AlloModules.ViewRenderersModule) { console.log('[CDN] ViewRenderersModule already loaded, skipping'); return; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useMemo = React.useMemo;
var useCallback = React.useCallback;
var Fragment = React.Fragment;
// _lazyIcon: defers icon resolution to call-time so we don't depend on
// window.AlloIcons being populated at module load.
var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? React.createElement(I, props) : null;
  };
};
${iconAliases}
${compiled}
window.AlloModules.ViewRenderersModule = true;
console.log('[ViewRenderers] 3 renderers registered (renderFormattedText, renderOutlineContent, renderInteractiveMap)');
})();
`;

fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
try {
  if (!fs.existsSync(path.dirname(DEPLOY_OUT))) fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
  fs.writeFileSync(DEPLOY_OUT, outputCode, 'utf-8');
} catch (e) {
  console.warn('Sync failed:', e.message);
}

try {
  execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' });
} catch (e) {
  console.error('[ViewRenderers] Syntax check failed:');
  console.error((e.stderr && e.stderr.toString()) || e.message);
  process.exit(1);
}

const lineCount = outputCode.split('\n').length;
console.log('[ViewRenderers] Built ' + OUTPUT + ' (' + lineCount + ' lines)');
console.log('[ViewRenderers] Synced to ' + DEPLOY_OUT);
