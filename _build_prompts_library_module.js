#!/usr/bin/env node
/**
 * Build prompts_library_module.js from prompts_library_source.jsx
 *
 * 1. Reads prompts_library_source.jsx (pure JS — no JSX, no React).
 * 2. Wraps in IIFE with duplicate-load guard.
 * 3. Writes prompts_library_module.js + syncs to prismflow-deploy/public/.
 * 4. Syntax-checks output with `node -c`.
 *
 * Mirrors _build_allo_data_module.js — the source is plain ES syntax so no
 * Babel/esbuild compilation is needed.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'prompts_library_source.jsx');
const OUTPUT = path.join(ROOT, 'prompts_library_module.js');
const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', 'prompts_library_module.js');

if (!fs.existsSync(SOURCE)) {
    console.error('[PromptsLibrary] Source not found:', SOURCE);
    process.exit(1);
}

const source = fs.readFileSync(SOURCE, 'utf-8');

const outputCode =
`(function() {
'use strict';
if (window.AlloModules && window.AlloModules.PromptsLibraryModule) { console.log('[CDN] PromptsLibraryModule already loaded, skipping'); return; }
// prompts_library_source.jsx — pure prompt builders for content generation.
// Extracted from AlloFlowANTI.txt on 2026-04-24 (Phase A of CDN modularization).
${source}
// Auto-instantiate the factory so the inline shims in AlloFlowANTI.txt can
// look up window.AlloModules.PromptsLibrary directly without orchestration.
try {
  window.AlloModules.PromptsLibrary = window.AlloModules.createPromptsLibrary({
    STEM_TOOL_REGISTRY: (typeof window !== 'undefined' && window.STEM_TOOL_REGISTRY) || []
  });
} catch (e) {
  console.warn('[PromptsLibrary] auto-instantiation failed:', e && e.message);
}
window.AlloModules.PromptsLibraryModule = true;
console.log('[PromptsLibrary] PromptsLibrary registered');
})();
`;

fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
try {
    if (!fs.existsSync(path.dirname(DEPLOY_OUT))) {
        fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
    }
    fs.writeFileSync(DEPLOY_OUT, outputCode, 'utf-8');
} catch (e) {
    console.warn('[PromptsLibrary] Could not sync to prismflow-deploy/public/:', e.message);
}

// Syntax check — the source is plain JS, so `node -c` is applicable.
try {
    execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' });
} catch (e) {
    console.error('[PromptsLibrary] Syntax check failed:');
    console.error((e.stderr && e.stderr.toString()) || e.message);
    process.exit(1);
}

const lineCount = outputCode.split('\n').length;
console.log('[PromptsLibrary] Built ' + OUTPUT + ' (' + lineCount + ' lines)');
console.log('[PromptsLibrary] Synced to ' + DEPLOY_OUT);
