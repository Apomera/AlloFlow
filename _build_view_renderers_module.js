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
const MONOLITH = path.join(ROOT, 'AlloFlowANTI.txt');
const TMP = path.join(ROOT, '_tmp_view_renderers_entry.jsx');
const TMP_COMPILED = TMP + '.compiled.js';

if (!fs.existsSync(SOURCE)) {
  console.error('Source not found:', SOURCE);
  process.exit(1);
}

const source = fs.readFileSync(SOURCE, 'utf-8');

// Auto-detect Lucide icons used in the source by scanning for `<CapitalRef`
// JSX patterns and intersecting with the keys of window.AlloIcons in the
// monolith. This replaces the previous hardcoded ICONS array which silently
// dropped icons it didn't know about (Unplug + Unlock shipped broken in
// G.2 because of this). Build now FAILS LOUDLY if a JSX-referenced icon
// isn't in window.AlloIcons — the failure tells us exactly which icon to
// add to the monolith's AlloIcons object.
function detectIconsAndComponents() {
  // 1. Strip strings + comments so we don't match identifiers inside literals.
  let stripped = source;
  stripped = stripped.replace(/\/\/[^\n]*/g, '');
  stripped = stripped.replace(/\/\*[\s\S]*?\*\//g, '');
  stripped = stripped.replace(/'(?:\\.|[^'\\\n])*'/g, "''");
  stripped = stripped.replace(/"(?:\\.|[^"\\\n])*"/g, '""');
  // Template literals: keep ${...} contents, blank out the rest.
  stripped = stripped.replace(/`([^`\\]|\\.)*`/g, '``');

  // 2. Find every <CapitalRef in JSX position.
  const jsxRefs = new Set();
  const jsxRe = /<\s*([A-Z][A-Za-z0-9]+)\b/g;
  let m;
  while ((m = jsxRe.exec(stripped)) !== null) jsxRefs.add(m[1]);

  // 3. Read window.AlloIcons keys from the monolith.
  const monolith = fs.readFileSync(MONOLITH, 'utf-8');
  const alloIconsMatch = monolith.match(/window\.AlloIcons\s*=\s*\{([\s\S]*?)\};/);
  if (!alloIconsMatch) {
    console.error('FAIL: could not find window.AlloIcons declaration in AlloFlowANTI.txt');
    process.exit(1);
  }
  const alloIcons = new Set();
  const iconBody = alloIconsMatch[1];
  const idRe = /[A-Za-z_$][A-Za-z0-9_$]*/g;
  let im;
  while ((im = idRe.exec(iconBody)) !== null) alloIcons.add(im[0]);

  // 4. Partition JSX refs into icons-to-alias vs. components-to-pass-through.
  // Components (SimpleBarChart, KeyConceptMapView, etc.) come through deps
  // since they're file-top shims that delegate to other CDN modules — we
  // don't alias them at module level.
  const icons = [];
  const components = [];
  // Known component names (passed through deps, never aliased here).
  const KNOWN_COMPONENTS = new Set([
    'React', 'Fragment', 'BranchItem', 'ConfettiExplosion', 'ErrorBoundary',
    'KeyConceptMapView', 'MainTitle', 'SimpleBarChart', 'SimpleDonutChart',
    'Tag', 'VennGame', 'CauseEffectSortGame', 'PipelineBuilderGame',
    'TChartSortGame', 'ConceptMapSortGame', 'OutlineSortGame',
    'FishboneSortGame', 'ProblemSolutionSortGame',
    'FrayerSortGame', 'SeeThinkWonderSortGame', 'StoryMapSortGame',
    'GameButtonHint',
  ]);

  for (const ref of [...jsxRefs].sort()) {
    if (KNOWN_COMPONENTS.has(ref)) {
      components.push(ref);
    } else if (alloIcons.has(ref)) {
      icons.push(ref);
    } else {
      // JSX-position name that's neither a known component nor in
      // window.AlloIcons. Fail the build so we add it to AlloIcons before
      // shipping a module that will throw at render time.
      console.error('');
      console.error('═══════════════════════════════════════════════════════════════════');
      console.error(`FAIL: JSX references <${ref}> but it is not in window.AlloIcons`);
      console.error('      and not a recognized component shim.');
      console.error('');
      console.error('      Either:');
      console.error(`      (a) Add ${ref} to window.AlloIcons in AlloFlowANTI.txt (~L4919),`);
      console.error('      (b) Add it to KNOWN_COMPONENTS in this build script if it is a');
      console.error('          file-top component shim, or');
      console.error(`      (c) Verify <${ref}> isn't a typo in the source.`);
      console.error('═══════════════════════════════════════════════════════════════════');
      process.exit(1);
    }
  }
  return { icons, components };
}

const { icons: ICONS, components: COMPONENTS_DETECTED } = detectIconsAndComponents();
console.log(`[icon-scan] auto-detected ${ICONS.length} Lucide icons: ${ICONS.join(', ')}`);
console.log(`[icon-scan] auto-detected ${COMPONENTS_DETECTED.length} component refs (passed via deps): ${COMPONENTS_DETECTED.join(', ')}`);

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
