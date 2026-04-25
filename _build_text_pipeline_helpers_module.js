#!/usr/bin/env node
/**
 * Build text_pipeline_helpers_module.js from text_pipeline_helpers_source.jsx
 *
 * Mirrors _build_prompts_library_module.js — pure JS, no JSX, no React.
 * Wraps in IIFE + auto-instantiates the factory at load time so the
 * inline shims in AlloFlowANTI.txt can find window.AlloModules.TextPipelineHelpers
 * directly without orchestration.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'text_pipeline_helpers_source.jsx');
const OUTPUT = path.join(ROOT, 'text_pipeline_helpers_module.js');
const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', 'text_pipeline_helpers_module.js');

if (!fs.existsSync(SOURCE)) {
  console.error('[TextPipelineHelpers] Source not found:', SOURCE);
  process.exit(1);
}

const source = fs.readFileSync(SOURCE, 'utf-8');

const outputCode =
`(function() {
'use strict';
if (window.AlloModules && window.AlloModules.TextPipelineHelpersModule) { console.log('[CDN] TextPipelineHelpersModule already loaded, skipping'); return; }
// text_pipeline_helpers_source.jsx — pure text/citation/source helpers.
// Extracted from AlloFlowANTI.txt on 2026-04-24 (Phase C of CDN modularization).
${source}
// Auto-instantiate the factory so inline shims in AlloFlowANTI.txt can look
// up window.AlloModules.TextPipelineHelpers directly without orchestration.
try {
  window.AlloModules.TextPipelineHelpers = window.AlloModules.createTextPipelineHelpers();
} catch (e) {
  console.warn('[TextPipelineHelpers] auto-instantiation failed:', e && e.message);
}
window.AlloModules.TextPipelineHelpersModule = true;
console.log('[TextPipelineHelpers] TextPipelineHelpers registered');
})();
`;

fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
try {
  if (!fs.existsSync(path.dirname(DEPLOY_OUT))) {
    fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
  }
  fs.writeFileSync(DEPLOY_OUT, outputCode, 'utf-8');
} catch (e) {
  console.warn('[TextPipelineHelpers] Could not sync to prismflow-deploy/public/:', e.message);
}

try {
  execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' });
} catch (e) {
  console.error('[TextPipelineHelpers] Syntax check failed:');
  console.error((e.stderr && e.stderr.toString()) || e.message);
  process.exit(1);
}

const lineCount = outputCode.split('\n').length;
console.log('[TextPipelineHelpers] Built ' + OUTPUT + ' (' + lineCount + ' lines)');
console.log('[TextPipelineHelpers] Synced to ' + DEPLOY_OUT);
