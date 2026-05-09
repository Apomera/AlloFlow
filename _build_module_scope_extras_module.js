#!/usr/bin/env node
/**
 * Build module_scope_extras_module.js from module_scope_extras_source.jsx
 *
 * Usage: node _build_module_scope_extras_module.js
 *
 * Bundle: language utilities (4 fns), ErrorBoundary class, session-asset
 * sync helpers (uploadSessionAssets / hydrateSessionAssets). All extracted
 * from AlloFlowANTI.txt module scope (Round 4 Tier B).
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'module_scope_extras_source.jsx');
const OUTPUT = path.join(ROOT, 'module_scope_extras_module.js');
const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', 'module_scope_extras_module.js');
const TMP = path.join(ROOT, '_tmp_module_scope_extras_entry.jsx');

if (!fs.existsSync(SOURCE)) {
    console.error('[ModuleScopeExtras] Source not found:', SOURCE);
    process.exit(1);
}

const source = fs.readFileSync(SOURCE, 'utf-8');

const entry = `
/* global React */
${source}
`;

fs.writeFileSync(TMP, entry, 'utf-8');

console.log('[ModuleScopeExtras] Compiling with esbuild...');
try {
    execSync('npx esbuild "' + TMP + '" --bundle=false --format=esm --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --outfile="' + TMP + '.compiled.js" --target=es2020', {
        cwd: ROOT,
        stdio: 'inherit'
    });
} catch (e) {
    console.error('[ModuleScopeExtras] esbuild compilation failed');
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
if (window.AlloModules && window.AlloModules.ModuleScopeExtras) { console.log('[CDN] ModuleScopeExtrasModule already loaded, skipping'); return; }
var React = window.React || React;
var LanguageContext = window.AlloLanguageContext;
// Firestore deps mirrored to window by host (see AlloFlowANTI.txt
// where window.doc / window.db / window.setDoc / window.getDoc are set
// alongside the existing window._fbDoc / window._fbDb pair).
var doc = window.doc || window._fbDoc;
var db = window.db || window._fbDb;
var setDoc = window.setDoc || window._fbSetDoc;
var getDoc = window.getDoc || window._fbGetDoc;
var warnLog = (typeof window !== 'undefined' && window.warnLog) || console.warn.bind(console);
var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? React.createElement(I, props) : null;
  };
};
var AlertCircle = _lazyIcon('AlertCircle');
var RefreshCw = _lazyIcon('RefreshCw');
${compiled}
window.AlloModules = window.AlloModules || {};
window.AlloModules.ModuleScopeExtras = {
  getSpeechLangCode: getSpeechLangCode,
  languageToTTSCode: languageToTTSCode,
  isRtlLang: isRtlLang,
  getContentDirection: getContentDirection,
  ErrorBoundary: ErrorBoundary,
  uploadSessionAssets: uploadSessionAssets,
  hydrateSessionAssets: hydrateSessionAssets,
};
// Window mirrors so existing host references resolve without a shim hop.
window.getSpeechLangCode = getSpeechLangCode;
window.languageToTTSCode = languageToTTSCode;
window.isRtlLang = isRtlLang;
window.getContentDirection = getContentDirection;
window.ErrorBoundary = ErrorBoundary;
window.uploadSessionAssets = uploadSessionAssets;
window.hydrateSessionAssets = hydrateSessionAssets;
if (typeof window._upgradeModuleScopeExtras === 'function') {
  try { window._upgradeModuleScopeExtras(); } catch (e) { console.warn('[ModuleScopeExtras] upgrade hook failed', e); }
}
console.log('[CDN] ModuleScopeExtrasModule loaded — 4 lang utils + ErrorBoundary + 2 session-asset helpers');
})();
`;

fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
try {
    if (!fs.existsSync(path.dirname(DEPLOY_OUT))) {
        fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
    }
    fs.writeFileSync(DEPLOY_OUT, outputCode, 'utf-8');
} catch (e) {
    console.warn('[ModuleScopeExtras] Could not sync to prismflow-deploy/public/:', e.message);
}

try {
    execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' });
} catch (e) {
    console.error('[ModuleScopeExtras] Syntax check failed:');
    console.error((e.stderr && e.stderr.toString()) || e.message);
    process.exit(1);
}

const lineCount = outputCode.split('\n').length;
console.log('[ModuleScopeExtras] Built ' + OUTPUT + ' (' + lineCount + ' lines)');
console.log('[ModuleScopeExtras] Synced to ' + DEPLOY_OUT);
