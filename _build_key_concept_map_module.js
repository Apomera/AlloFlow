#!/usr/bin/env node
/**
 * Build key_concept_map_module.js from key_concept_map_source.jsx
 *
 * Usage: node _build_key_concept_map_module.js
 *
 * 1. Reads key_concept_map_source.jsx
 * 2. Compiles JSX -> React.createElement via esbuild
 * 3. Wraps in IIFE with duplicate-load guard + React alias preamble
 * 4. Writes key_concept_map_module.js + syncs to prismflow-deploy/public/
 * 5. Syntax-checks the output
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'key_concept_map_source.jsx');
const OUTPUT = path.join(ROOT, 'key_concept_map_module.js');
const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', 'key_concept_map_module.js');
const TMP = path.join(ROOT, '_tmp_key_concept_map_entry.jsx');

if (!fs.existsSync(SOURCE)) {
    console.error('[KeyConceptMap] Source not found:', SOURCE);
    process.exit(1);
}

const source = fs.readFileSync(SOURCE, 'utf-8');

// esbuild entry point. Globals the source file expects are declared so the
// transform doesn't fail on unknown identifiers.
const entry = `
/* global React, useRef, useState */
${source}
`;

fs.writeFileSync(TMP, entry, 'utf-8');

console.log('[KeyConceptMap] Compiling key_concept_map_source.jsx with esbuild...');
try {
    execSync('npx esbuild "' + TMP + '" --bundle=false --format=esm --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --outfile="' + TMP + '.compiled.js" --target=es2020', {
        cwd: ROOT,
        stdio: 'inherit'
    });
} catch (e) {
    console.error('[KeyConceptMap] esbuild compilation failed');
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
  if (!document.getElementById("key-concept-map-module-a11y")) { var _s = document.createElement("style"); _s.id = "key-concept-map-module-a11y"; _s.textContent = "@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } } .text-slate-600 { color: #64748b !important; }"; document.head.appendChild(_s); }
if (window.AlloModules && window.AlloModules.KeyConceptMapModule) { console.log('[CDN] KeyConceptMapModule already loaded, skipping'); return; }
var React = window.React || React;
var useRef = React.useRef;
var useState = React.useState;
${compiled}
window.AlloModules = window.AlloModules || {};
window.AlloModules.KeyConceptMapView = (typeof KeyConceptMapView !== 'undefined') ? KeyConceptMapView : null;
window.AlloModules.KeyConceptMapModule = true;
console.log('[KeyConceptMapModule] KeyConceptMapView registered');
})();
`;

fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
try {
    if (!fs.existsSync(path.dirname(DEPLOY_OUT))) {
        fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
    }
    fs.writeFileSync(DEPLOY_OUT, outputCode, 'utf-8');
} catch (e) {
    console.warn('[KeyConceptMap] Could not sync to prismflow-deploy/public/:', e.message);
}

// Syntax check
try {
    execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' });
} catch (e) {
    console.error('[KeyConceptMap] Syntax check failed:');
    console.error((e.stderr && e.stderr.toString()) || e.message);
    process.exit(1);
}

const lineCount = outputCode.split('\n').length;
console.log('[KeyConceptMap] Built ' + OUTPUT + ' (' + lineCount + ' lines)');
console.log('[KeyConceptMap] Synced to ' + DEPLOY_OUT);
