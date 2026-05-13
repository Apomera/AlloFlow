#!/usr/bin/env node
/**
 * Build misc_components_module.js from misc_components_source.jsx
 *
 * Usage: node _build_misc_components_module.js
 *
 * Components: AnimatedNumber, ClozeInput, WordSoundsReviewPanel (incl. Sound Swap).
 * Compiles JSX via esbuild, wraps in IIFE with duplicate-load guard,
 * React alias preamble, lazy icon resolver, LanguageContext alias.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'misc_components_source.jsx');
const OUTPUT = path.join(ROOT, 'misc_components_module.js');
const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', 'misc_components_module.js');
const TMP = path.join(ROOT, '_tmp_misc_components_entry.jsx');

if (!fs.existsSync(SOURCE)) {
    console.error('[MiscComponents] Source not found:', SOURCE);
    process.exit(1);
}

const source = fs.readFileSync(SOURCE, 'utf-8');

const entry = `
/* global React */
${source}
`;

fs.writeFileSync(TMP, entry, 'utf-8');

console.log('[MiscComponents] Compiling with esbuild...');
try {
    execSync('npx esbuild "' + TMP + '" --bundle=false --format=esm --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --outfile="' + TMP + '.compiled.js" --target=es2020', {
        cwd: ROOT,
        stdio: 'inherit'
    });
} catch (e) {
    console.error('[MiscComponents] esbuild compilation failed');
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
  if (!document.getElementById("misc-components-module-a11y")) { var _s = document.createElement("style"); _s.id = "misc-components-module-a11y"; _s.textContent = "@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } } .text-slate-600 { color: #64748b !important; }"; document.head.appendChild(_s); }
if (window.AlloModules && window.AlloModules.MiscComponentsModule) { console.log('[CDN] MiscComponentsModule already loaded, skipping'); return; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
var React = window.React || React;
var LanguageContext = window.AlloLanguageContext;
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useContext = React.useContext;
var debugLog = (typeof window !== 'undefined' && (window.__alloDebugLog || window.debugLog)) || function(){};
var warnLog = (typeof window !== 'undefined' && window.warnLog) || console.warn.bind(console);
var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? React.createElement(I, props) : null;
  };
};
// Icons used by WordSoundsReviewPanel:
var Ban = _lazyIcon('Ban');
var ChevronDown = _lazyIcon('ChevronDown');
var ChevronLeft = _lazyIcon('ChevronLeft');
var ImageIcon = _lazyIcon('ImageIcon');
var Play = _lazyIcon('Play');
var RefreshCw = _lazyIcon('RefreshCw');
var Sparkles = _lazyIcon('Sparkles');
${compiled}
window.AlloModules = window.AlloModules || {};
window.AlloModules.AnimatedNumber = (typeof AnimatedNumber !== 'undefined') ? AnimatedNumber : null;
window.AlloModules.ClozeInput = (typeof ClozeInput !== 'undefined') ? ClozeInput : null;
window.AlloModules.WordSoundsReviewPanel = (typeof WordSoundsReviewPanel !== 'undefined') ? WordSoundsReviewPanel : null;
window.WordSoundsReviewPanel = (typeof WordSoundsReviewPanel !== 'undefined') ? WordSoundsReviewPanel : null;
window.AlloModules.MiscComponents = true;  // satisfies loadModule('MiscComponents', ...) registration check
window.AlloModules.MiscComponentsModule = true;
console.log('[MiscComponentsModule] 3 components registered (incl. WordSoundsReviewPanel with Sound Swap)');
})();
`;

fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
try {
    if (!fs.existsSync(path.dirname(DEPLOY_OUT))) {
        fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
    }
    fs.writeFileSync(DEPLOY_OUT, outputCode, 'utf-8');
} catch (e) {
    console.warn('[MiscComponents] Could not sync to prismflow-deploy/public/:', e.message);
}

try {
    execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' });
} catch (e) {
    console.error('[MiscComponents] Syntax check failed:');
    console.error((e.stderr && e.stderr.toString()) || e.message);
    process.exit(1);
}

const lineCount = outputCode.split('\n').length;
console.log('[MiscComponents] Built ' + OUTPUT + ' (' + lineCount + ' lines)');
console.log('[MiscComponents] Synced to ' + DEPLOY_OUT);
