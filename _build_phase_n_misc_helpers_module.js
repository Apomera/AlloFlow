#!/usr/bin/env node
/**
 * Build phase_n_misc_helpers_module.js -- esbuild compile because
 * formatInteractiveText returns JSX. Mirrors the Phase K/M build pattern.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'phase_n_misc_helpers_source.jsx');
const OUTPUT = path.join(ROOT, 'phase_n_misc_helpers_module.js');
const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', 'phase_n_misc_helpers_module.js');
const TMP = path.join(ROOT, '_tmp_phase_n_entry.jsx');
const TMP_COMPILED = TMP + '.compiled.js';

if (!fs.existsSync(SOURCE)) {
  console.error('Source not found:', SOURCE);
  process.exit(1);
}

const source = fs.readFileSync(SOURCE, 'utf-8');
const entry = `\n/* global React */\n${source}\n`;
fs.writeFileSync(TMP, entry, 'utf-8');

console.log('Compiling phase_n_misc_helpers_source.jsx with esbuild...');
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
if (window.AlloModules && window.AlloModules.PhaseNHelpersModule) { console.log('[CDN] PhaseNHelpersModule already loaded, skipping'); return; }
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useMemo = React.useMemo;
var useCallback = React.useCallback;
var Fragment = React.Fragment;
${compiled}
window.AlloModules.PhaseNHelpersModule = true;
console.log('[PhaseNHelpers] 6 helpers registered');
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
  console.error('[PhaseNHelpers] Syntax check failed:');
  console.error((e.stderr && e.stderr.toString()) || e.message);
  process.exit(1);
}

console.log('[PhaseNHelpers] Built ' + OUTPUT + ' (' + outputCode.split('\n').length + ' lines)');
