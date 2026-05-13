#!/usr/bin/env node
/**
 * Build view_misc_panels_module.js from view_misc_panels_source.jsx
 * (Round 7, May 2026).
 *
 * 6 components: PdfDiffViewer, GroupSessionModal, FluencyModePanel,
 * SourceGenPanel, TourOverlay, VolumeBuilderView. ~1,795 lines extracted
 * from AlloFlowANTI.txt across 6 sites.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'view_misc_panels_source.jsx');
const OUTPUT = path.join(ROOT, 'view_misc_panels_module.js');
const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', 'view_misc_panels_module.js');
const TMP = path.join(ROOT, '_tmp_view_misc_panels_entry.jsx');

if (!fs.existsSync(SOURCE)) { console.error('[ViewMiscPanels] Source not found'); process.exit(1); }
fs.writeFileSync(TMP, '/* global React */\n' + fs.readFileSync(SOURCE, 'utf-8'), 'utf-8');

console.log('[ViewMiscPanels] Compiling with esbuild...');
try {
    execSync('npx esbuild "' + TMP + '" --bundle=false --format=esm --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --outfile="' + TMP + '.compiled.js" --target=es2020', { cwd: ROOT, stdio: 'inherit' });
} catch (e) { console.error('[ViewMiscPanels] esbuild failed'); try { fs.unlinkSync(TMP); } catch(_){} process.exit(1); }

const compiled = fs.readFileSync(TMP + '.compiled.js', 'utf-8').replace(/\/\*.*global.*\*\/\n/g, '').trim();
try { fs.unlinkSync(TMP); } catch(_){}
try { fs.unlinkSync(TMP + '.compiled.js'); } catch(_){}

const outputCode = `(function() {
'use strict';
if (window.AlloModules && window.AlloModules.ViewMiscPanelsModule) { console.log('[CDN] ViewMiscPanelsModule already loaded, skipping'); return; }
var React = window.React || React;
var ReactDOM = window.ReactDOM;  // PdfDiffViewer uses ReactDOM.createPortal
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
// Icons across all 6 components (de-duplicated):
var ArrowRight = _lazyIcon('ArrowRight');
var Brain = _lazyIcon('Brain');
var Check = _lazyIcon('Check');
var CheckCircle = _lazyIcon('CheckCircle');
var CheckCircle2 = _lazyIcon('CheckCircle2');
var Clock = _lazyIcon('Clock');
var Download = _lazyIcon('Download');
var FileText = _lazyIcon('FileText');
var Globe = _lazyIcon('Globe');
var GripVertical = _lazyIcon('GripVertical');
var Layers = _lazyIcon('Layers');
var Layout = _lazyIcon('Layout');
var Lightbulb = _lazyIcon('Lightbulb');
var Mic = _lazyIcon('Mic');
var Pencil = _lazyIcon('Pencil');
var Plus = _lazyIcon('Plus');
var RefreshCw = _lazyIcon('RefreshCw');
var Search = _lazyIcon('Search');
var Settings = _lazyIcon('Settings');
var Sparkles = _lazyIcon('Sparkles');
var StopCircle = _lazyIcon('StopCircle');
var UserCheck = _lazyIcon('UserCheck');
var Users = _lazyIcon('Users');
var X = _lazyIcon('X');
${compiled}
window.AlloModules = window.AlloModules || {};
window.AlloModules.PdfDiffViewer = (typeof PdfDiffViewer !== 'undefined') ? PdfDiffViewer : null;
window.AlloModules.GroupSessionModal = (typeof GroupSessionModal !== 'undefined') ? GroupSessionModal : null;
window.AlloModules.FluencyModePanel = (typeof FluencyModePanel !== 'undefined') ? FluencyModePanel : null;
window.AlloModules.SourceGenPanel = (typeof SourceGenPanel !== 'undefined') ? SourceGenPanel : null;
window.AlloModules.TourOverlay = (typeof TourOverlay !== 'undefined') ? TourOverlay : null;
window.AlloModules.VolumeBuilderView = (typeof VolumeBuilderView !== 'undefined') ? VolumeBuilderView : null;
window.AlloModules.ViewMiscPanelsModule = true;
window.AlloModules.MiscPanels = true;  // satisfies loadModule('MiscPanels', ...) registration check
console.log('[CDN] ViewMiscPanelsModule loaded — 6 components registered');
})();
`;

fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
try {
    if (!fs.existsSync(path.dirname(DEPLOY_OUT))) fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
    fs.writeFileSync(DEPLOY_OUT, outputCode, 'utf-8');
} catch (e) { console.warn('[ViewMiscPanels] sync failed:', e.message); }

try { execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' }); }
catch (e) { console.error('[ViewMiscPanels] Syntax check failed:', (e.stderr && e.stderr.toString()) || e.message); process.exit(1); }

const lineCount = outputCode.split('\n').length;
console.log('[ViewMiscPanels] Built ' + OUTPUT + ' (' + lineCount + ' lines)');
console.log('[ViewMiscPanels] Synced to ' + DEPLOY_OUT);
