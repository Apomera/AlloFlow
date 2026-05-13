#!/usr/bin/env node
/**
 * Build view_pdf_audit_module.js from view_pdf_audit_source.jsx
 *
 * Usage: node _build_view_pdf_audit_module.js
 *
 * Component: PdfAuditView — the PDF accessibility audit modal extracted
 * from AlloFlowANTI.txt L30982-L38171 (Round 4 Tier A, May 2026).
 *
 * Compiles JSX via esbuild, wraps in IIFE with duplicate-load guard,
 * React alias preamble, lazy icon resolver. Mirrors the pattern in
 * _build_misc_components_module.js and _build_ui_language_selector_module.js.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'view_pdf_audit_source.jsx');
const OUTPUT = path.join(ROOT, 'view_pdf_audit_module.js');
const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', 'view_pdf_audit_module.js');
const TMP = path.join(ROOT, '_tmp_view_pdf_audit_entry.jsx');

if (!fs.existsSync(SOURCE)) {
    console.error('[ViewPdfAudit] Source not found:', SOURCE);
    process.exit(1);
}

const source = fs.readFileSync(SOURCE, 'utf-8');

const entry = `
/* global React */
${source}
`;

fs.writeFileSync(TMP, entry, 'utf-8');

console.log('[ViewPdfAudit] Compiling with esbuild...');
try {
    execSync('npx esbuild "' + TMP + '" --bundle=false --format=esm --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --outfile="' + TMP + '.compiled.js" --target=es2020', {
        cwd: ROOT,
        stdio: 'inherit'
    });
} catch (e) {
    console.error('[ViewPdfAudit] esbuild compilation failed');
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
if (window.AlloModules && window.AlloModules.PdfAuditView) { console.log('[CDN] ViewPdfAuditModule already loaded, skipping'); return; }
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
var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? React.createElement(I, props) : null;
  };
};
// Icons referenced inside the PDF audit modal subtree:
var FileDown = _lazyIcon('FileDown');
var RefreshCw = _lazyIcon('RefreshCw');
var Sparkles = _lazyIcon('Sparkles');
var Wrench = _lazyIcon('Wrench');
var X = _lazyIcon('X');
${compiled}
window.AlloModules = window.AlloModules || {};
window.AlloModules.PdfAuditView = (typeof PdfAuditView !== 'undefined') ? PdfAuditView : null;
window.AlloModules.ViewPdfAuditModule = true;
console.log('[CDN] ViewPdfAuditModule loaded — PdfAuditView registered');
})();
`;

fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
try {
    if (!fs.existsSync(path.dirname(DEPLOY_OUT))) {
        fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
    }
    fs.writeFileSync(DEPLOY_OUT, outputCode, 'utf-8');
} catch (e) {
    console.warn('[ViewPdfAudit] Could not sync to prismflow-deploy/public/:', e.message);
}

try {
    execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' });
} catch (e) {
    console.error('[ViewPdfAudit] Syntax check failed:');
    console.error((e.stderr && e.stderr.toString()) || e.message);
    process.exit(1);
}

const lineCount = outputCode.split('\n').length;
console.log('[ViewPdfAudit] Built ' + OUTPUT + ' (' + lineCount + ' lines)');
console.log('[ViewPdfAudit] Synced to ' + DEPLOY_OUT);
