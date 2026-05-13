#!/usr/bin/env node
/**
 * Build view_misc_modals_module.js from view_misc_modals_source.jsx
 * (Round 5 Tier B, May 2026).
 *
 * 4 components: GroupSessionModal, PdfDiffViewer, UDLGuideModal, AIBackendModal.
 * 1,206 lines extracted from AlloFlowANTI.txt across 4 sites.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'view_misc_modals_source.jsx');
const OUTPUT = path.join(ROOT, 'view_misc_modals_module.js');
const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', 'view_misc_modals_module.js');
const TMP = path.join(ROOT, '_tmp_view_misc_modals_entry.jsx');

if (!fs.existsSync(SOURCE)) { console.error('[ViewMiscModals] Source not found'); process.exit(1); }
fs.writeFileSync(TMP, '/* global React */\n' + fs.readFileSync(SOURCE, 'utf-8'), 'utf-8');

console.log('[ViewMiscModals] Compiling with esbuild...');
try {
    execSync('npx esbuild "' + TMP + '" --bundle=false --format=esm --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --outfile="' + TMP + '.compiled.js" --target=es2020', { cwd: ROOT, stdio: 'inherit' });
} catch (e) { console.error('[ViewMiscModals] esbuild failed'); try { fs.unlinkSync(TMP); } catch(_){} process.exit(1); }

const compiled = fs.readFileSync(TMP + '.compiled.js', 'utf-8').replace(/\/\*.*global.*\*\/\n/g, '').trim();
try { fs.unlinkSync(TMP); } catch(_){}
try { fs.unlinkSync(TMP + '.compiled.js'); } catch(_){}

const outputCode = `(function() {
'use strict';
if (window.AlloModules && window.AlloModules.ViewMiscModalsModule) { console.log('[CDN] ViewMiscModalsModule already loaded, skipping'); return; }
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
// Icons used across the 4 modals (de-duplicated):
var Check = _lazyIcon('Check');
var CheckCircle2 = _lazyIcon('CheckCircle2');
var Clock = _lazyIcon('Clock');
var FileText = _lazyIcon('FileText');
var Globe = _lazyIcon('Globe');
var GripVertical = _lazyIcon('GripVertical');
var Layers = _lazyIcon('Layers');
var Plus = _lazyIcon('Plus');
var RefreshCw = _lazyIcon('RefreshCw');
var UserCheck = _lazyIcon('UserCheck');
var Users = _lazyIcon('Users');
var X = _lazyIcon('X');
var ArrowRight = _lazyIcon('ArrowRight');
var Eye = _lazyIcon('Eye');
var HelpCircle = _lazyIcon('HelpCircle');
var Maximize = _lazyIcon('Maximize');
var Minimize = _lazyIcon('Minimize');
var Save = _lazyIcon('Save');
var Search = _lazyIcon('Search');
var Send = _lazyIcon('Send');
var ShieldCheck = _lazyIcon('ShieldCheck');
var Sparkles = _lazyIcon('Sparkles');
var Zap = _lazyIcon('Zap');
var ImageIcon = _lazyIcon('ImageIcon');
var Unplug = _lazyIcon('Unplug');
var Cpu = _lazyIcon('Cpu');
var Headphones = _lazyIcon('Headphones');
${compiled}
window.AlloModules = window.AlloModules || {};
window.AlloModules.GroupSessionModal = (typeof GroupSessionModal !== 'undefined') ? GroupSessionModal : null;
window.AlloModules.PdfDiffViewer = (typeof PdfDiffViewer !== 'undefined') ? PdfDiffViewer : null;
window.AlloModules.UDLGuideModal = (typeof UDLGuideModal !== 'undefined') ? UDLGuideModal : null;
window.AlloModules.AIBackendModal = (typeof AIBackendModal !== 'undefined') ? AIBackendModal : null;
window.AlloModules.ViewMiscModalsModule = true;
window.AlloModules.MiscModals = true;  // satisfies loadModule('MiscModals', ...) registration check
console.log('[CDN] ViewMiscModalsModule loaded — 4 modals registered');
})();
`;

fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
try {
    if (!fs.existsSync(path.dirname(DEPLOY_OUT))) fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
    fs.writeFileSync(DEPLOY_OUT, outputCode, 'utf-8');
} catch (e) { console.warn('[ViewMiscModals] sync failed:', e.message); }

try { execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' }); }
catch (e) { console.error('[ViewMiscModals] Syntax check failed:', (e.stderr && e.stderr.toString()) || e.message); process.exit(1); }

const lineCount = outputCode.split('\n').length;
console.log('[ViewMiscModals] Built ' + OUTPUT + ' (' + lineCount + ' lines)');
console.log('[ViewMiscModals] Synced to ' + DEPLOY_OUT);
