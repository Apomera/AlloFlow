#!/usr/bin/env node
/**
 * Build annotation_suite_module.js — compiles annotation_suite_source.jsx
 * with esbuild (JSX → React.createElement). Mirrors the phase_k_helpers
 * build pattern. Phase 2 ships the extracted Sticker overlay; future
 * phases extend in the source file without changing this script.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'annotation_suite_source.jsx');
const INQUIRY_BRIDGE = path.join(ROOT, 'annotation_inquiry_bridge.js');
const OUTPUT = path.join(ROOT, 'annotation_suite_module.js');
const DEPLOY_OUT = path.join(ROOT, 'desktop/web-app', 'public', 'annotation_suite_module.js');
const TMP = path.join(ROOT, '_tmp_annotation_suite_entry.jsx');
const TMP_COMPILED = TMP + '.compiled.js';

for (const requiredFile of [SOURCE, INQUIRY_BRIDGE]) {
  if (!fs.existsSync(requiredFile)) {
    console.error('Source not found:', requiredFile);
    process.exit(1);
  }
}

const source = fs.readFileSync(INQUIRY_BRIDGE, 'utf-8') + '\n' + fs.readFileSync(SOURCE, 'utf-8');

const entry = `
/* global React */
${source}
`;
fs.writeFileSync(TMP, entry, 'utf-8');

console.log('Compiling annotation_suite_source.jsx with esbuild...');
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
  .replace(/\nexport default (require_[A-Za-z0-9_]+)\(\);?\s*$/, '\n$1();')
  .trim();

try { fs.unlinkSync(TMP); } catch (_) {}
try { fs.unlinkSync(TMP_COMPILED); } catch (_) {}

const outputCode = `(function() {
'use strict';
if (window.AlloModules && window.AlloModules.AnnotationSuiteModule) { console.log('[CDN] AnnotationSuiteModule already loaded, skipping'); return; }
${compiled}
window.AlloModules = window.AlloModules || {};
window.AlloModules.AnnotationSuiteModule = true;
console.log('[AnnotationSuite] Toolbar + Overlay + helpers registered');
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
  console.error('[AnnotationSuite] Syntax check failed:');
  console.error((e.stderr && e.stderr.toString()) || e.message);
  process.exit(1);
}

console.log('[AnnotationSuite] Built ' + OUTPUT + ' (' + outputCode.split('\n').length + ' lines)');
