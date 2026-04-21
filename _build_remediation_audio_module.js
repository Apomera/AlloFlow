#!/usr/bin/env node
/**
 * Build remediation_audio_module.js from remediation_audio_source.jsx.
 * Pure JS (no JSX) — simple IIFE wrap + node -c check.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'remediation_audio_source.jsx');
const OUTPUT = path.join(ROOT, 'remediation_audio_module.js');
const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', 'remediation_audio_module.js');

if (!fs.existsSync(SOURCE)) {
    console.error('[RemediationAudio] Source not found:', SOURCE);
    process.exit(1);
}

const source = fs.readFileSync(SOURCE, 'utf-8');

const outputCode =
`(function() {
'use strict';
if (window.AlloModules && window.AlloModules.RemediationAudioModule) { console.log('[CDN] RemediationAudioModule already loaded, skipping'); return; }
// remediation_audio_source.jsx — Web Audio feedback beeps.
// Extracted from AlloFlowANTI.txt on 2026-04-21.
${source}
window.AlloModules.RemediationAudioModule = true;
})();
`;

fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
try {
    if (!fs.existsSync(path.dirname(DEPLOY_OUT))) {
        fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
    }
    fs.writeFileSync(DEPLOY_OUT, outputCode, 'utf-8');
} catch (e) {
    console.warn('[RemediationAudio] Could not sync to prismflow-deploy/public/:', e.message);
}

try {
    execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' });
} catch (e) {
    console.error('[RemediationAudio] Syntax check failed:');
    console.error((e.stderr && e.stderr.toString()) || e.message);
    process.exit(1);
}

const lineCount = outputCode.split('\n').length;
console.log('[RemediationAudio] Built ' + OUTPUT + ' (' + lineCount + ' lines)');
console.log('[RemediationAudio] Synced to ' + DEPLOY_OUT);
