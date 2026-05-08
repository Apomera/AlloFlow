#!/usr/bin/env node
/**
 * Build ui_language_selector_module.js from ui_language_selector_source.jsx
 *
 * Usage: node _build_ui_language_selector_module.js
 *
 * Component: UiLanguageSelector (header language picker, lines 1622-1749 of
 * AlloFlowANTI.txt before extraction).
 *
 * Compiles JSX via esbuild, wraps in IIFE with duplicate-load guard,
 * React alias preamble, lazy icon resolver, LanguageContext alias.
 * Mirrors the pattern in _build_misc_components_module.js.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'ui_language_selector_source.jsx');
const OUTPUT = path.join(ROOT, 'ui_language_selector_module.js');
const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', 'ui_language_selector_module.js');
const TMP = path.join(ROOT, '_tmp_ui_language_selector_entry.jsx');

if (!fs.existsSync(SOURCE)) {
    console.error('[UiLanguageSelector] Source not found:', SOURCE);
    process.exit(1);
}

const source = fs.readFileSync(SOURCE, 'utf-8');

const entry = `
/* global React */
${source}
`;

fs.writeFileSync(TMP, entry, 'utf-8');

console.log('[UiLanguageSelector] Compiling with esbuild...');
try {
    execSync('npx esbuild "' + TMP + '" --bundle=false --format=esm --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --outfile="' + TMP + '.compiled.js" --target=es2020', {
        cwd: ROOT,
        stdio: 'inherit'
    });
} catch (e) {
    console.error('[UiLanguageSelector] esbuild compilation failed');
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
if (window.AlloModules && window.AlloModules.UILanguageSelector) { console.log('[CDN] UiLanguageSelectorModule already loaded, skipping'); return; }
var React = window.React || React;
var LanguageContext = window.AlloLanguageContext;
var useState = React.useState;
var useRef = React.useRef;
var useContext = React.useContext;
var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? React.createElement(I, props) : null;
  };
};
var Globe = _lazyIcon('Globe');
var RefreshCw = _lazyIcon('RefreshCw');
var FolderOpen = _lazyIcon('FolderOpen');
var Download = _lazyIcon('Download');
var ArrowRight = _lazyIcon('ArrowRight');
${compiled}
window.AlloModules = window.AlloModules || {};
window.AlloModules.UILanguageSelector = (typeof UiLanguageSelector !== 'undefined') ? UiLanguageSelector : null;
window.UiLanguageSelectorExt = window.AlloModules.UILanguageSelector;
if (typeof window._upgradeUILanguageSelector === 'function') {
  try { window._upgradeUILanguageSelector(); } catch (e) { console.warn('[UILanguageSelector] upgrade hook failed', e); }
}
console.log('[CDN] UiLanguageSelectorModule loaded');
})();
`;

fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
try {
    if (!fs.existsSync(path.dirname(DEPLOY_OUT))) {
        fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
    }
    fs.writeFileSync(DEPLOY_OUT, outputCode, 'utf-8');
} catch (e) {
    console.warn('[UiLanguageSelector] Could not sync to prismflow-deploy/public/:', e.message);
}

try {
    execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' });
} catch (e) {
    console.error('[UiLanguageSelector] Syntax check failed:');
    console.error((e.stderr && e.stderr.toString()) || e.message);
    process.exit(1);
}

const lineCount = outputCode.split('\n').length;
console.log('[UiLanguageSelector] Built ' + OUTPUT + ' (' + lineCount + ' lines)');
console.log('[UiLanguageSelector] Synced to ' + DEPLOY_OUT);
