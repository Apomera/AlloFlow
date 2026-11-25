#!/usr/bin/env node
/**
 * Build view_pdf_audit_module.js from remediation_modules/view/* (via view_manifest.cjs)
 * and generated-compatibility view_pdf_audit_source.jsx.
 *
 * Usage:
 *   node _build_view_pdf_audit_module.js
 *   node _build_view_pdf_audit_module.js --check
 *
 * Component: PdfAuditView — the PDF accessibility audit modal extracted
 * from AlloFlowANTI.txt L30982-L38171 (Round 4 Tier A, May 2026).
 *
 * Compiles JSX via esbuild, wraps in IIFE with duplicate-load guard,
 * React alias preamble, lazy icon resolver. Mirrors the pattern in
 * _build_misc_components_module.js and _build_ui_language_selector_module.js.
 */

const { execSync } = require('child_process');
const { Script } = require('vm');
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'view_pdf_audit_source.jsx');
const OUTPUT = path.join(ROOT, 'view_pdf_audit_module.js');
const DEPLOY_OUT = path.join(ROOT, 'desktop/web-app', 'public', 'view_pdf_audit_module.js');
const TEXT_OUTPUT = path.join(ROOT, 'document_narration_text_module.js');
const TEXT_DEPLOY_OUT = path.join(ROOT, 'desktop', 'web-app', 'public', 'document_narration_text_module.js');
const VIEW_MANIFEST_PATH = path.join(ROOT, 'remediation_modules', 'view_manifest.cjs');
const IS_CHECK = process.argv.includes('--check');

const viewManifest = fs.existsSync(VIEW_MANIFEST_PATH) ? require(VIEW_MANIFEST_PATH) : null;

let source;
if (IS_CHECK) {
    if (viewManifest) {
        const syncStatus = viewManifest.checkViewPdfAuditSync(ROOT);
        if (!syncStatus.inSync) {
            console.error('[ViewPdfAudit] STALE source (rebuild with node _build_view_pdf_audit_module.js): ' + path.relative(ROOT, SOURCE) + ' does not match remediation_modules/view/*');
            process.exit(1);
        }
        source = viewManifest.assembleViewPdfAuditSource(ROOT);
    } else {
        if (!fs.existsSync(SOURCE)) {
            console.error('[ViewPdfAudit] Source not found:', SOURCE);
            process.exit(1);
        }
        source = fs.readFileSync(SOURCE, 'utf-8');
    }
} else if (viewManifest) {
    const synced = viewManifest.syncViewPdfAuditSource(ROOT);
    source = synced.source;
    if (synced.written) {
        console.log('[ViewPdfAudit] Assembled ' + path.relative(ROOT, SOURCE) + ' from ' + synced.partCount + ' modular parts');
    }
} else {
    if (!fs.existsSync(SOURCE)) {
        console.error('[ViewPdfAudit] Source not found:', SOURCE);
        process.exit(1);
    }
    source = fs.readFileSync(SOURCE, 'utf-8');
}

// Keep the UMD helper outside JSX compilation. Its module.exports compatibility
// branch would otherwise make esbuild wrap the whole entry as CommonJS/ESM.
const reviewHelpers = fs.readFileSync(path.join(ROOT, 'remediation_review_helpers.js'), 'utf8');

const entry = `
/* global React */
const _PDF_WORKSPACE_CSS = ${JSON.stringify(fs.readFileSync(path.join(ROOT, 'remediation_workspace.css'), 'utf8'))};
${fs.readFileSync(path.join(ROOT, 'remediation_workspace_component.jsx'), 'utf8')}
${fs.readFileSync(path.join(ROOT, 'remediation_batch_workspace.jsx'), 'utf8')}
${fs.readFileSync(path.join(ROOT, 'remediation_review_component.jsx'), 'utf8')}
${source}
`;

if (!IS_CHECK) {
    console.log('[ViewPdfAudit] Compiling with esbuild...');
}
let transformedCode;
try {
    transformedCode = esbuild.transformSync(entry, {
        loader: 'jsx',
        format: 'esm',
        jsx: 'transform',
        jsxFactory: 'React.createElement',
        jsxFragment: 'React.Fragment',
        target: 'es2020',
        sourcefile: '_tmp_view_pdf_audit_entry.jsx',
    }).code;
} catch (e) {
    console.error('[ViewPdfAudit] esbuild compilation failed:', e && e.message ? e.message : e);
    process.exit(1);
}

const compiled = transformedCode
    .replace(/\/\*.*global.*\*\/\n/g, '')
    .trim();

const outputCode =
`(function() {
'use strict';
if (typeof window === 'undefined' || !window || typeof window !== 'object') return;
if (window.AlloModules && window.AlloModules.PdfAuditView) { console.log('[CDN] ViewPdfAuditModule already loaded, skipping'); return; }
var React = window.React || (typeof React !== 'undefined' ? React : null);
if (!React) return;
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
${reviewHelpers}
${compiled}
window.AlloModules = window.AlloModules || {};
window.AlloModules.PdfWorkspace = { state: _pdfWorkspaceState, jump: _pdfWorkspaceJump, Header: _PdfWorkspaceHeader, Sources: _PdfWorkspaceSources, AfterFix: _PdfWorkspaceAfterFix, BatchStatus: _PdfWorkspaceBatchStatus, batchModel: _pdfWorkspaceBatchModel, acceptRecovery: _pdfWorkspaceAcceptRecovery, batchFindings: _pdfWorkspaceBatchFindings };
window.AlloModules.PdfPreservationReview = _PdfPreservationReview;
window.AlloModules.PdfAuditView = (typeof PdfAuditView !== 'undefined') ? PdfAuditView : null;
window.AlloModules.PdfAuditVerificationEngineList = (typeof _PdfAuditVerificationEngineList !== 'undefined') ? _PdfAuditVerificationEngineList : null;
window.AlloModules.PdfAuditVerificationReasons = _PdfAuditVerificationReasons;
window.AlloModules.PdfReviewAttestations = _viewWithReviewAttestations;
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

// Validate as a classic browser script before replacing either runtime copy.
new Script(outputCode, { filename: OUTPUT });

// Tree-shaken pure narration helpers: preflight needs no React or network libraries.
const narrationCode = buildNarrationTextModule(source);
new Script(narrationCode, { filename: TEXT_OUTPUT });

// --check: verify source matches modular parts AND built modules + public mirrors
// are fresh without writing anything to disk.
if (IS_CHECK) {
    const stale = [];
    for (const [targetFile, expected] of [
        [OUTPUT, outputCode],
        [DEPLOY_OUT, outputCode],
        [TEXT_OUTPUT, narrationCode],
        [TEXT_DEPLOY_OUT, narrationCode],
    ]) {
        try {
            if (fs.readFileSync(targetFile, 'utf-8') !== expected) {
                stale.push(path.relative(ROOT, targetFile));
            }
        } catch (_) {
            stale.push(path.relative(ROOT, targetFile));
        }
    }
    if (stale.length) {
        console.error('[ViewPdfAudit] STALE (rebuild with node _build_view_pdf_audit_module.js): ' + stale.join(', '));
        process.exit(1);
    }
    console.log('[ViewPdfAudit] up to date: ' + path.relative(ROOT, SOURCE) + ', ' + path.relative(ROOT, OUTPUT) + ', ' + path.relative(ROOT, TEXT_OUTPUT) + ', and public mirrors match remediation_modules/view/*');
    process.exit(0);
}

writeBuildFileIfChanged(OUTPUT, outputCode, 'utf-8');
try {
    if (!fs.existsSync(path.dirname(DEPLOY_OUT))) {
        fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
    }
    writeBuildFileIfChanged(DEPLOY_OUT, outputCode, 'utf-8');
} catch (e) {
    console.warn('[ViewPdfAudit] Could not sync to desktop/web-app/public/:', e.message);
}
for (const extraOut of [
    path.join(ROOT, 'desktop', 'app-build', 'view_pdf_audit_module.js'),
    path.join(ROOT, 'desktop', 'web-app', 'build', 'view_pdf_audit_module.js')
]) {
    try {
        if (fs.existsSync(path.dirname(extraOut))) writeBuildFileIfChanged(extraOut, outputCode, 'utf-8');
    } catch (e) {
        console.warn('[ViewPdfAudit] Could not sync to ' + path.relative(ROOT, extraOut) + ':', e.message);
    }
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

writeBuildFileIfChanged(TEXT_OUTPUT, narrationCode, 'utf-8');
for (const narOut of [
    TEXT_DEPLOY_OUT,
    path.join(ROOT, 'desktop', 'app-build', 'document_narration_text_module.js'),
    path.join(ROOT, 'desktop', 'web-app', 'build', 'document_narration_text_module.js')
]) {
    if (fs.existsSync(path.dirname(narOut))) {
        writeBuildFileIfChanged(narOut, narrationCode, 'utf-8');
    }
}
console.log('[ViewPdfAudit] Built offline narration helpers');

function buildNarrationTextModule(src) {
    const ast = require('@babel/parser').parse(src, { sourceType: 'script', plugins: ['jsx'] });
    const declarations = new Map();
    for (const node of ast.program.body) {
        if (node.type === 'FunctionDeclaration' && node.id) declarations.set(node.id.name, node);
        if (node.type === 'VariableDeclaration') {
            for (const declaration of node.declarations) {
                if (declaration.id.type === 'Identifier') declarations.set(declaration.id.name, node);
            }
        }
    }
    const needed = new Set();
    const collect = (name) => {
        const node = declarations.get(name);
        if (!node || needed.has(node)) return;
        needed.add(node);
        const walk = (value) => {
            if (!value || typeof value !== 'object') return;
            if (value.type === 'Identifier' && declarations.has(value.name)) collect(value.name);
            for (const [key, child] of Object.entries(value)) {
                if (key !== 'loc' && key !== 'comments') {
                    if (Array.isArray(child)) child.forEach(walk);
                    else if (child && typeof child === 'object') walk(child);
                }
            }
        };
        walk(node);
    };
    ['_audioReadyText', '_srStyleTextFromHtml', '_viewSanitizeMarkupForExport'].forEach(collect);
    const helperSource = [...needed].sort((a, b) => a.start - b.start).map((node) => src.slice(node.start, node.end)).join('\n');
    const result = esbuild.buildSync({
        stdin: {
            contents: helperSource + '\nexport { _audioReadyText as naturalText, _srStyleTextFromHtml as accessibleText, _viewSanitizeMarkupForExport as sanitize };\n',
            loader: 'jsx',
            resolveDir: ROOT,
            sourcefile: '_tmp_narration_text.jsx',
        },
        write: false,
        bundle: true,
        format: 'iife',
        globalName: 'AlloNarrationText',
        treeShaking: true,
        jsxFactory: 'React.createElement',
        jsxFragment: 'React.Fragment',
        target: 'es2020',
    });
    return result.outputFiles[0].text;
}

// Keep the previous generated module intact if a synced-folder write fails.
function writeBuildFile(file, contents, encoding) {
    const temporary = file + '.build-' + process.pid + '.tmp';
    try { fs.writeFileSync(temporary, contents, encoding); fs.renameSync(temporary, file); }
    finally { try { fs.unlinkSync(temporary); } catch (_) {} }
}

function writeBuildFileIfChanged(file, contents, encoding) {
    try {
        if (fs.existsSync(file) && fs.readFileSync(file, encoding) === contents) {
            return false;
        }
    } catch (_) {}
    writeBuildFile(file, contents, encoding);
    return true;
}
