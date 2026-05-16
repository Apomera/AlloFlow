#!/usr/bin/env node
/**
 * Build tool_catalog_module.js from tool_catalog_source.jsx
 *
 * Pattern matches _build_allo_data_module.js (pure-data module, no Babel/esbuild).
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'tool_catalog_source.jsx');
const OUTPUT = path.join(ROOT, 'tool_catalog_module.js');
const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', 'tool_catalog_module.js');

if (!fs.existsSync(SOURCE)) {
    console.error('[ToolCatalog] Source not found:', SOURCE);
    process.exit(1);
}

const source = fs.readFileSync(SOURCE, 'utf-8');

const outputCode =
`(function() {
'use strict';
if (window.AlloModules && window.AlloModules.ToolCatalogModuleLoaded) { console.log('[CDN] ToolCatalog already loaded, skipping'); return; }
// tool_catalog_source.jsx — single source of truth for AlloFlow resource tools.
${source}
window.AlloModules.ToolCatalogModuleLoaded = true;
})();
`;

fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
try {
    if (!fs.existsSync(path.dirname(DEPLOY_OUT))) {
        fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
    }
    fs.writeFileSync(DEPLOY_OUT, outputCode, 'utf-8');
} catch (e) {
    console.warn('[ToolCatalog] Could not sync to prismflow-deploy/public/:', e.message);
}

try {
    execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' });
} catch (e) {
    console.error('[ToolCatalog] Syntax check failed:');
    console.error((e.stderr && e.stderr.toString()) || e.message);
    process.exit(1);
}

const lineCount = outputCode.split('\n').length;
console.log('[ToolCatalog] Built ' + OUTPUT + ' (' + lineCount + ' lines)');
console.log('[ToolCatalog] Synced to ' + DEPLOY_OUT);
