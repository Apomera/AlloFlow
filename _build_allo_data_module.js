#!/usr/bin/env node
/**
 * Build allo_data_module.js from allo_data_source.jsx
 *
 * Usage: node _build_allo_data_module.js
 *
 * 1. Reads allo_data_source.jsx (pure-data — no JSX, no React).
 * 2. Wraps in IIFE with duplicate-load guard.
 * 3. Writes allo_data_module.js + syncs to prismflow-deploy/public/.
 * 4. Syntax-checks output with `node -c`.
 *
 * No Babel/esbuild compilation needed — the source is plain ES syntax.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'allo_data_source.jsx');
const OUTPUT = path.join(ROOT, 'allo_data_module.js');
const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', 'allo_data_module.js');

if (!fs.existsSync(SOURCE)) {
    console.error('[AlloData] Source not found:', SOURCE);
    process.exit(1);
}

const source = fs.readFileSync(SOURCE, 'utf-8');

const outputCode =
`(function() {
'use strict';
if (window.AlloModules && window.AlloModules.AlloDataModule) { console.log('[CDN] AlloDataModule already loaded, skipping'); return; }
// allo_data_source.jsx — pure data: phoneme guide, prompts, i18n strings, etc.
// Extracted from AlloFlowANTI.txt on 2026-04-21.
${source}
window.AlloModules.AlloDataModule = true;
})();
`;

fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
try {
    if (!fs.existsSync(path.dirname(DEPLOY_OUT))) {
        fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
    }
    fs.writeFileSync(DEPLOY_OUT, outputCode, 'utf-8');
} catch (e) {
    console.warn('[AlloData] Could not sync to prismflow-deploy/public/:', e.message);
}

// Syntax check — the source is plain JS, so `node -c` is applicable.
try {
    execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' });
} catch (e) {
    console.error('[AlloData] Syntax check failed:');
    console.error((e.stderr && e.stderr.toString()) || e.message);
    process.exit(1);
}

const lineCount = outputCode.split('\n').length;
console.log('[AlloData] Built ' + OUTPUT + ' (' + lineCount + ' lines)');
console.log('[AlloData] Synced to ' + DEPLOY_OUT);
