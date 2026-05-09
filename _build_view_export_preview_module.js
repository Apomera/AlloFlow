#!/usr/bin/env node
/**
 * Build view_export_preview_module.js from view_export_preview_source.jsx
 * (Round 5 Tier A, May 2026).
 *
 * Component: ExportPreviewView — Document Builder export preview &
 * customization modal extracted from AlloFlowANTI.txt L31652-L32469.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'view_export_preview_source.jsx');
const OUTPUT = path.join(ROOT, 'view_export_preview_module.js');
const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', 'view_export_preview_module.js');
const TMP = path.join(ROOT, '_tmp_view_export_preview_entry.jsx');

if (!fs.existsSync(SOURCE)) { console.error('[ViewExportPreview] Source not found'); process.exit(1); }
const source = fs.readFileSync(SOURCE, 'utf-8');
fs.writeFileSync(TMP, '/* global React */\n' + source, 'utf-8');

console.log('[ViewExportPreview] Compiling with esbuild...');
try {
    execSync('npx esbuild "' + TMP + '" --bundle=false --format=esm --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --outfile="' + TMP + '.compiled.js" --target=es2020', { cwd: ROOT, stdio: 'inherit' });
} catch (e) { console.error('[ViewExportPreview] esbuild compilation failed'); try { fs.unlinkSync(TMP); } catch(_){} process.exit(1); }

const compiled = fs.readFileSync(TMP + '.compiled.js', 'utf-8').replace(/\/\*.*global.*\*\/\n/g, '').trim();
try { fs.unlinkSync(TMP); } catch(_){}
try { fs.unlinkSync(TMP + '.compiled.js'); } catch(_){}

const outputCode = `(function() {
'use strict';
if (window.AlloModules && window.AlloModules.ExportPreviewView) { console.log('[CDN] ViewExportPreviewModule already loaded, skipping'); return; }
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
// Icons referenced inside the Export Preview modal:
var Download = _lazyIcon('Download');
var ImageIcon = _lazyIcon('ImageIcon');
var RefreshCw = _lazyIcon('RefreshCw');
var X = _lazyIcon('X');
${compiled}
window.AlloModules = window.AlloModules || {};
window.AlloModules.ExportPreviewView = (typeof ExportPreviewView !== 'undefined') ? ExportPreviewView : null;
window.AlloModules.ViewExportPreviewModule = true;
console.log('[CDN] ViewExportPreviewModule loaded — ExportPreviewView registered');
})();
`;

fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
try {
    if (!fs.existsSync(path.dirname(DEPLOY_OUT))) fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
    fs.writeFileSync(DEPLOY_OUT, outputCode, 'utf-8');
} catch (e) { console.warn('[ViewExportPreview] sync failed:', e.message); }

try { execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' }); }
catch (e) { console.error('[ViewExportPreview] Syntax check failed:', (e.stderr && e.stderr.toString()) || e.message); process.exit(1); }

const lineCount = outputCode.split('\n').length;
console.log('[ViewExportPreview] Built ' + OUTPUT + ' (' + lineCount + ' lines)');
console.log('[ViewExportPreview] Synced to ' + DEPLOY_OUT);
