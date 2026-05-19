#!/usr/bin/env node
/**
 * Build immersive_reader_module.js from immersive_reader_source.jsx
 *
 * Usage: node _build_immersive_reader_module.js
 *
 * 1. Reads immersive_reader_source.jsx
 * 2. Compiles JSX → React.createElement via esbuild
 * 3. Wraps in IIFE with the pre-existing preamble (duplicate-load guard,
 *    lazy icon helpers, React hook aliases)
 * 4. Writes immersive_reader_module.js + syncs to prismflow-deploy/public/
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'immersive_reader_source.jsx');
const OUTPUT = path.join(ROOT, 'immersive_reader_module.js');
const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', 'immersive_reader_module.js');
const TMP = path.join(ROOT, '_tmp_immersive_reader_entry.jsx');

if (!fs.existsSync(SOURCE)) {
    console.error('❌ Source not found:', SOURCE);
    process.exit(1);
}

const source = fs.readFileSync(SOURCE, 'utf-8');

const entry = `
/* global React, useState, useEffect, useRef, useCallback, useMemo, useContext */
/* global LanguageContext */
/* global ArrowLeft, ArrowRight, BookOpen, ChevronLeft, ChevronRight, List, Pause, Play, Settings2, Volume2, X, Zap */

${source}

window.__immersiveReaderExports = { SpeedReaderOverlay, BionicChunkReader, PerspectiveCrawlOverlay, KaraokeReaderOverlay, ImmersiveToolbar, ImmersiveWord };
`;

fs.writeFileSync(TMP, entry, 'utf-8');

console.log('🔨 Compiling immersive_reader_source.jsx with esbuild...');
try {
    execSync(`npx esbuild "${TMP}" --bundle=false --format=esm --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --outfile="${TMP}.compiled.js" --target=es2020`, {
        cwd: ROOT,
        stdio: 'inherit'
    });
} catch (e) {
    console.error('❌ esbuild compilation failed');
    try { fs.unlinkSync(TMP); } catch(_){}
    process.exit(1);
}

const compiled = fs.readFileSync(TMP + '.compiled.js', 'utf-8')
    .replace(/\/\*.*global.*\*\/\n/g, '')
    .replace(/window\.__immersiveReaderExports\s*=\s*\{[^}]+\};?\s*/, '')
    .trim();

try { fs.unlinkSync(TMP); } catch(_){}
try { fs.unlinkSync(TMP + '.compiled.js'); } catch(_){}

const outputCode = `(function() {
'use strict';
  // WCAG 2.1 AA: Accessibility CSS
  if (!document.getElementById("immersive-reader-module-a11y")) { var _s = document.createElement("style"); _s.id = "immersive-reader-module-a11y"; _s.textContent = "@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } } .text-slate-600 { color: #64748b !important; }"; document.head.appendChild(_s); }
if (window.AlloModules && window.AlloModules.ImmersiveReaderModule) { console.log('[CDN] ImmersiveReaderModule already loaded, skipping'); return; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// immersive_reader_source.jsx — SpeedReaderOverlay, ImmersiveToolbar
// Extracted from AlloFlowANTI.txt for CDN modularization

var LanguageContext = window.AlloLanguageContext;
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useContext = React.useContext;
var useMemo = React.useMemo;
var useCallback = React.useCallback;
var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? React.createElement(I, props) : null;
  };
};
var ArrowLeft = _lazyIcon('ArrowLeft');
var ArrowRight = _lazyIcon('ArrowRight');
var BookOpen = _lazyIcon('BookOpen');
var ChevronLeft = _lazyIcon('ChevronLeft');
var ChevronRight = _lazyIcon('ChevronRight');
var List = _lazyIcon('List');
var Pause = _lazyIcon('Pause');
var Play = _lazyIcon('Play');
var Settings2 = _lazyIcon('Settings2');
var Volume2 = _lazyIcon('Volume2');
var X = _lazyIcon('X');
var Zap = _lazyIcon('Zap');
${compiled}
window.AlloModules = window.AlloModules || {};
// ImmersiveWord is defined below the source's main registration block, so re-register here.
window.AlloModules.ImmersiveWord = (typeof ImmersiveWord !== 'undefined') ? ImmersiveWord : null;
window.AlloModules.ImmersiveReaderModule = true;
console.log('[ImmersiveReaderModule] components registered');
})();
`;

fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
fs.writeFileSync(DEPLOY_OUT, outputCode, 'utf-8');
const lineCount = outputCode.split('\n').length;
console.log(`✅ Built ${OUTPUT} (${lineCount} lines)`);
console.log(`✅ Synced to ${DEPLOY_OUT}`);
