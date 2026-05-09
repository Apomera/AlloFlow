#!/usr/bin/env node
/**
 * Build view_gemini_bridge_module.js from view_gemini_bridge_source.jsx
 * (Round 6, May 2026).
 *
 * 2 components: BridgeSendModal (1,057 lines from L28884), BridgeMessageModal
 * (404 lines from L29941). Both originated as inline IIFE patterns whose only
 * purpose was to declare a local theme-tokens object — the IIFE bodies lifted
 * verbatim into function components.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'view_gemini_bridge_source.jsx');
const OUTPUT = path.join(ROOT, 'view_gemini_bridge_module.js');
const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', 'view_gemini_bridge_module.js');
const TMP = path.join(ROOT, '_tmp_view_gemini_bridge_entry.jsx');

if (!fs.existsSync(SOURCE)) { console.error('[ViewGeminiBridge] Source not found'); process.exit(1); }
fs.writeFileSync(TMP, '/* global React */\n' + fs.readFileSync(SOURCE, 'utf-8'), 'utf-8');

console.log('[ViewGeminiBridge] Compiling with esbuild...');
try {
    execSync('npx esbuild "' + TMP + '" --bundle=false --format=esm --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --outfile="' + TMP + '.compiled.js" --target=es2020', { cwd: ROOT, stdio: 'inherit' });
} catch (e) { console.error('[ViewGeminiBridge] esbuild failed'); try { fs.unlinkSync(TMP); } catch(_){} process.exit(1); }

const compiled = fs.readFileSync(TMP + '.compiled.js', 'utf-8').replace(/\/\*.*global.*\*\/\n/g, '').trim();
try { fs.unlinkSync(TMP); } catch(_){}
try { fs.unlinkSync(TMP + '.compiled.js'); } catch(_){}

const outputCode = `(function() {
'use strict';
if (window.AlloModules && window.AlloModules.ViewGeminiBridgeModule) { console.log('[CDN] ViewGeminiBridgeModule already loaded, skipping'); return; }
var React = window.React || React;
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useMemo = React.useMemo;
var useCallback = React.useCallback;
var useContext = React.useContext;
var Fragment = React.Fragment;
var warnLog = (typeof window !== 'undefined' && window.warnLog) || console.warn.bind(console);
var debugLog = (typeof window !== 'undefined' && (window.__alloDebugLog || window.debugLog)) || function(){};
// Bridge UI uses inline styles + Unicode glyphs (no Lucide icon components).
${compiled}
window.AlloModules = window.AlloModules || {};
window.AlloModules.BridgeSendModal = (typeof BridgeSendModal !== 'undefined') ? BridgeSendModal : null;
window.AlloModules.BridgeMessageModal = (typeof BridgeMessageModal !== 'undefined') ? BridgeMessageModal : null;
window.AlloModules.ViewGeminiBridgeModule = true;
window.AlloModules.GeminiBridge = true;  // satisfies loadModule('GeminiBridge', ...) registration check
console.log('[CDN] ViewGeminiBridgeModule loaded — 2 modals registered');
})();
`;

fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
try {
    if (!fs.existsSync(path.dirname(DEPLOY_OUT))) fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
    fs.writeFileSync(DEPLOY_OUT, outputCode, 'utf-8');
} catch (e) { console.warn('[ViewGeminiBridge] sync failed:', e.message); }

try { execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' }); }
catch (e) { console.error('[ViewGeminiBridge] Syntax check failed:', (e.stderr && e.stderr.toString()) || e.message); process.exit(1); }

const lineCount = outputCode.split('\n').length;
console.log('[ViewGeminiBridge] Built ' + OUTPUT + ' (' + lineCount + ' lines)');
console.log('[ViewGeminiBridge] Synced to ' + DEPLOY_OUT);
