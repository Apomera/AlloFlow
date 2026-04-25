#!/usr/bin/env node
/**
 * Build adaptive_controller_module.js from adaptive_controller_source.jsx
 *
 * Pure side-effect init module - no factory, no callsites. The IIFE wrapper
 * runs the gamepad initialization once when the module loads. Safe to load
 * multiple times (init is guarded by window._alloGamepadGlobal).
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'adaptive_controller_source.jsx');
const OUTPUT = path.join(ROOT, 'adaptive_controller_module.js');
const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', 'adaptive_controller_module.js');

if (!fs.existsSync(SOURCE)) {
  console.error('[AdaptiveController] Source not found:', SOURCE);
  process.exit(1);
}

const source = fs.readFileSync(SOURCE, 'utf-8');

const outputCode =
`(function() {
'use strict';
if (window.AlloModules && window.AlloModules.AdaptiveControllerModule) { console.log('[CDN] AdaptiveControllerModule already loaded, skipping'); return; }
// adaptive_controller_source.jsx - global gamepad / adaptive controller support.
// Extracted from AlloFlowANTI.txt on 2026-04-24 (Phase D-light of CDN modularization).
${source}
window.AlloModules = window.AlloModules || {};
window.AlloModules.AdaptiveControllerModule = true;
console.log('[AdaptiveController] global gamepad init complete');
})();
`;

fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
try {
  if (!fs.existsSync(path.dirname(DEPLOY_OUT))) {
    fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
  }
  fs.writeFileSync(DEPLOY_OUT, outputCode, 'utf-8');
} catch (e) {
  console.warn('[AdaptiveController] Could not sync to prismflow-deploy/public/:', e.message);
}

try {
  execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' });
} catch (e) {
  console.error('[AdaptiveController] Syntax check failed:');
  console.error((e.stderr && e.stderr.toString()) || e.message);
  process.exit(1);
}

const lineCount = outputCode.split('\n').length;
console.log('[AdaptiveController] Built ' + OUTPUT + ' (' + lineCount + ' lines)');
console.log('[AdaptiveController] Synced to ' + DEPLOY_OUT);
