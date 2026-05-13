#!/usr/bin/env node
/**
 * Build text_utility_helpers_module.js -- compiles via esbuild because
 * highlightGlossaryTerms returns JSX. Mirrors _build_phase_k_helpers_module.js.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'text_utility_helpers_source.jsx');
const OUTPUT = path.join(ROOT, 'text_utility_helpers_module.js');
const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', 'text_utility_helpers_module.js');
const TMP = path.join(ROOT, '_tmp_text_utility_entry.jsx');
const TMP_COMPILED = TMP + '.compiled.js';

if (!fs.existsSync(SOURCE)) {
  console.error('Source not found:', SOURCE);
  process.exit(1);
}

const source = fs.readFileSync(SOURCE, 'utf-8');

const entry = `
/* global React */
${source}
`;
fs.writeFileSync(TMP, entry, 'utf-8');

console.log('Compiling text_utility_helpers_source.jsx with esbuild...');
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
  .trim();

try { fs.unlinkSync(TMP); } catch (_) {}
try { fs.unlinkSync(TMP_COMPILED); } catch (_) {}

const outputCode = `(function() {
'use strict';
if (window.AlloModules && window.AlloModules.TextUtilityHelpersModule) { console.log('[CDN] TextUtilityHelpersModule already loaded, skipping'); return; }
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useMemo = React.useMemo;
var useCallback = React.useCallback;
var Fragment = React.Fragment;
${compiled}
window.AlloModules.TextUtilityHelpersModule = true;
console.log('[TextUtilityHelpers] 4 helpers registered');
})();
`;

fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
try {
  if (!fs.existsSync(path.dirname(DEPLOY_OUT))) fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
  fs.writeFileSync(DEPLOY_OUT, outputCode, 'utf-8');
} catch (e) { console.warn('Sync failed:', e.message); }

try {
  execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' });
} catch (e) {
  console.error('[TextUtilityHelpers] Syntax check failed:');
  console.error((e.stderr && e.stderr.toString()) || e.message);
  process.exit(1);
}

console.log('[TextUtilityHelpers] Built ' + OUTPUT + ' (' + outputCode.split('\n').length + ' lines)');
