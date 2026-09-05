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
const DEPLOY_OUT = path.join(ROOT, 'desktop/web-app', 'public', 'view_pdf_audit_module.js');
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

writeBuildFile(TMP, entry, 'utf-8');

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
window.AlloModules.PdfAuditVerificationEngineList = (typeof _PdfAuditVerificationEngineList !== 'undefined') ? _PdfAuditVerificationEngineList : null;
window.AlloModules.PdfHtmlFoundationMatrix = (typeof _PdfHtmlFoundationMatrix !== 'undefined') ? _PdfHtmlFoundationMatrix : null;
window.AlloModules.PdfFoundationEvidence = (typeof _viewFoundationEvidence !== 'undefined') ? _viewFoundationEvidence : null;
window.AlloModules.AccessibleOfficeExport = { build: _buildAccessibleOfficeExport };
// Alternative-format builders (2026-07-29). These were reachable only by clicking a
// button inside PdfAuditView, which put ePub / DAISY / braille out of reach of the MCP
// connector. Each takes an HTML string and returns a { path: contents } map; the caller
// owns zipping. Publishing them here is what makes the formats callable headlessly.
window.AlloModules.AltFormatExports = {
  epub: _buildEpubPackageFiles,
  daisy: _buildDaisyPackageFiles,
  braille: _buildBrailleBrf,
  plainText: _altFmtHtmlToPlainText,
  validateEpub: validateEpubStructure,
};
// Shared narration semantics for the app and the MCP adapter.
window.AlloModules.DocumentNarrationExports = {
  naturalText: _audioReadyText, accessibleText: _srStyleTextFromHtml,
  sanitize: _viewSanitizeMarkupForExport, concat: _concatAudioBlobs,
  epubAudio: _epubCoreAudioBlob, smil: _buildMoSmil, opf: _buildMoOpf,
};
window.AlloModules.ViewPdfAuditModule = true;
console.log('[CDN] ViewPdfAuditModule loaded — PdfAuditView registered');
})();
`;

writeBuildFile(OUTPUT, outputCode, 'utf-8');
try {
    if (!fs.existsSync(path.dirname(DEPLOY_OUT))) {
        fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
    }
    writeBuildFile(DEPLOY_OUT, outputCode, 'utf-8');
} catch (e) {
    console.warn('[ViewPdfAudit] Could not sync to desktop/web-app/public/:', e.message);
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

// Tree-shaken pure narration helpers: preflight needs no React or network libraries.
const textEntry = path.join(ROOT, '_tmp_narration_text.jsx');
const textOutput = path.join(ROOT, 'document_narration_text_module.js');
try {
    const ast=require('@babel/parser').parse(source,{sourceType:'script',plugins:['jsx']});
    const declarations=new Map();
    for(const node of ast.program.body) {
        if(node.type==='FunctionDeclaration' && node.id)declarations.set(node.id.name,node);
        if(node.type==='VariableDeclaration')for(const declaration of node.declarations)if(declaration.id.type==='Identifier')declarations.set(declaration.id.name,node);
    }
    const needed=new Set();
    const collect=name=>{const node=declarations.get(name);if(!node||needed.has(node))return;needed.add(node);const walk=value=>{if(!value||typeof value!=='object')return;if(value.type==='Identifier'&&declarations.has(value.name))collect(value.name);for(const [key,child] of Object.entries(value))if(key!=='loc'&&key!=='comments')if(Array.isArray(child))child.forEach(walk);else if(child&&typeof child==='object')walk(child);};walk(node);};
    ['_audioReadyText','_srStyleTextFromHtml','_viewSanitizeMarkupForExport'].forEach(collect);
    const helperSource=[...needed].sort((a,b)=>a.start-b.start).map(node=>source.slice(node.start,node.end)).join('\n');
    writeBuildFile(textEntry, helperSource + '\nexport { _audioReadyText as naturalText, _srStyleTextFromHtml as accessibleText, _viewSanitizeMarkupForExport as sanitize };\n');
    require('esbuild').buildSync({entryPoints:[textEntry],outfile:textOutput,bundle:true,format:'iife',globalName:'AlloNarrationText',treeShaking:true,jsxFactory:'React.createElement',jsxFragment:'React.Fragment',target:'es2020'});
    const deployed = path.join(ROOT, 'desktop/web-app/public/document_narration_text_module.js');
    fs.copyFileSync(textOutput,deployed+'.edit-tmp');fs.renameSync(deployed+'.edit-tmp',deployed);
    console.log('[ViewPdfAudit] Built offline narration helpers');
} finally {try{fs.unlinkSync(textEntry);}catch(_){}}

// Keep the previous generated module intact if a synced-folder write fails.
function writeBuildFile(file,contents,encoding) {
  const temporary=file+'.build-'+process.pid+'.tmp';
  try { fs.writeFileSync(temporary,contents,encoding); fs.renameSync(temporary,file); }
  finally { try { fs.unlinkSync(temporary); } catch (_) {} }
}
