#!/usr/bin/env node
/**
 * Build large_file_module.js from large_file_source.jsx
 *
 * Usage: node _build_large_file_module.js
 *
 * 1. Reads large_file_source.jsx
 * 2. Compiles JSX -> React.createElement via esbuild
 * 3. Wraps in IIFE with duplicate-load guard + React alias preamble
 * 4. Writes large_file_module.js + syncs to prismflow-deploy/public/
 * 5. Syntax-checks the output
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'large_file_source.jsx');
const OUTPUT = path.join(ROOT, 'large_file_module.js');
const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', 'large_file_module.js');
const TMP = path.join(ROOT, '_tmp_large_file_entry.jsx');

if (!fs.existsSync(SOURCE)) {
    console.error('[LargeFile] Source not found:', SOURCE);
    process.exit(1);
}

const source = fs.readFileSync(SOURCE, 'utf-8');

// esbuild entry point. Globals the source file expects are declared so the
// transform doesn't fail on unknown identifiers. At runtime these resolve
// through the `var React = ...` preamble we prepend to the final IIFE.
const entry = `
/* global React */
${source}
`;

fs.writeFileSync(TMP, entry, 'utf-8');

console.log('[LargeFile] Compiling large_file_source.jsx with esbuild...');
try {
    execSync('npx esbuild "' + TMP + '" --bundle=false --format=esm --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --outfile="' + TMP + '.compiled.js" --target=es2020', {
        cwd: ROOT,
        stdio: 'inherit'
    });
} catch (e) {
    console.error('[LargeFile] esbuild compilation failed');
    try { fs.unlinkSync(TMP); } catch(_){}
    process.exit(1);
}

const compiled = fs.readFileSync(TMP + '.compiled.js', 'utf-8')
    .replace(/\/\*.*global.*\*\/\n/g, '')
    .trim();

try { fs.unlinkSync(TMP); } catch(_){}
try { fs.unlinkSync(TMP + '.compiled.js'); } catch(_){}

const outputCode =
`(function() {
'use strict';
  // WCAG 2.1 AA: respect prefers-reduced-motion + keep slate-600 AA contrast
  if (!document.getElementById("large-file-module-a11y")) { var _s = document.createElement("style"); _s.id = "large-file-module-a11y"; _s.textContent = "@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } } .text-slate-600 { color: #64748b !important; }"; document.head.appendChild(_s); }
if (window.AlloModules && window.AlloModules.LargeFileModule) { console.log('[CDN] LargeFileModule already loaded, skipping'); return; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
var React = window.React || React;
${compiled}
window.AlloModules = window.AlloModules || {};
window.AlloModules.LargeFileHandler = (typeof LargeFileHandler !== 'undefined') ? LargeFileHandler : null;
window.AlloModules.LargeFileTranscriptionModal = (typeof LargeFileTranscriptionModal !== 'undefined') ? LargeFileTranscriptionModal : null;
window.AlloModules.LargeFileModule = true;
console.log('[LargeFileModule] LargeFileHandler + LargeFileTranscriptionModal registered');
})();
`;

fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
try {
    if (!fs.existsSync(path.dirname(DEPLOY_OUT))) {
        fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
    }
    fs.writeFileSync(DEPLOY_OUT, outputCode, 'utf-8');
} catch (e) {
    console.warn('[LargeFile] Could not sync to prismflow-deploy/public/:', e.message);
}

// Syntax check
try {
    execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' });
} catch (e) {
    console.error('[LargeFile] Syntax check failed:');
    console.error((e.stderr && e.stderr.toString()) || e.message);
    process.exit(1);
}

const lineCount = outputCode.split('\n').length;
console.log('[LargeFile] Built ' + OUTPUT + ' (' + lineCount + ' lines)');
console.log('[LargeFile] Synced to ' + DEPLOY_OUT);
