#!/usr/bin/env node
/**
 * Build utils_pure_module.js from utils_pure_source.jsx
 *
 * Usage: node _build_utils_pure_module.js
 *
 * 1. Reads utils_pure_source.jsx (pure JS — no JSX, no React components).
 * 2. Wraps in IIFE with duplicate-load guard.
 * 3. Writes utils_pure_module.js + syncs to prismflow-deploy/public/.
 * 4. Syntax-checks output with `node -c`.
 *
 * No Babel/esbuild compilation needed — the source is plain ES syntax.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'utils_pure_source.jsx');
const OUTPUT = path.join(ROOT, 'utils_pure_module.js');
const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', 'utils_pure_module.js');

if (!fs.existsSync(SOURCE)) {
    console.error('[UtilsPure] Source not found:', SOURCE);
    process.exit(1);
}

const source = fs.readFileSync(SOURCE, 'utf-8');

const outputCode =
`(function() {
'use strict';
if (window.AlloModules && window.AlloModules.UtilsPureModule) { console.log('[CDN] UtilsPureModule already loaded, skipping'); return; }
// utils_pure_source.jsx — pure utility functions (JSON, storage, network, image).
// Extracted from AlloFlowANTI.txt on 2026-04-21.
${source}
window.AlloModules.UtilsPureModule = true;
})();
`;

fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
try {
    if (!fs.existsSync(path.dirname(DEPLOY_OUT))) {
        fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
    }
    fs.writeFileSync(DEPLOY_OUT, outputCode, 'utf-8');
} catch (e) {
    console.warn('[UtilsPure] Could not sync to prismflow-deploy/public/:', e.message);
}

// Syntax check
try {
    execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' });
} catch (e) {
    console.error('[UtilsPure] Syntax check failed:');
    console.error((e.stderr && e.stderr.toString()) || e.message);
    process.exit(1);
}

const lineCount = outputCode.split('\n').length;
console.log('[UtilsPure] Built ' + OUTPUT + ' (' + lineCount + ' lines)');
console.log('[UtilsPure] Synced to ' + DEPLOY_OUT);
