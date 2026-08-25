#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.resolve(__dirname, '..');
const buildDir = path.join(root, 'desktop', 'app-build');
const sourcePath = path.join(root, 'AlloFlowANTI.txt');
const publicIndexPath = path.join(root, 'desktop', 'web-app', 'public', 'index.html');
const swPath = path.join(root, 'desktop', 'web-app', 'public', 'sw.js');
const fontModulePath = path.join(root, 'ui_font_library_module.js');
const fontDir = path.join(root, 'desktop', 'web-app', 'public', 'fonts');
const manifestPath = path.join(buildDir, 'asset-manifest.json');

const limits = {
  mainJsGzip: 740 * 1024,
  mainCssGzip: 86 * 1024,
  latinFont: 55 * 1024,
  uiLatinFonts: 95 * 1024,
  allFonts: 340 * 1024,
};

const failures = [];
const pass = (message) => console.log(`PASS ${message}`);
const fail = (message) => { failures.push(message); console.error(`FAIL ${message}`); };
const check = (condition, message) => condition ? pass(message) : fail(message);
const kib = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`;

if (!fs.existsSync(manifestPath)) {
  fail('desktop/app-build is missing; run node build.js before this check');
} else {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const files = manifest.files || {};
  const resolveAsset = (key) => {
    const relative = files[key];
    return relative ? path.join(buildDir, relative.replace(/^\.?[\\/]/, '')) : '';
  };
  const measure = (key, limit, label) => {
    const assetPath = resolveAsset(key);
    if (!assetPath || !fs.existsSync(assetPath)) {
      fail(`${label} asset is missing from the build manifest`);
      return;
    }
    const raw = fs.readFileSync(assetPath);
    const gzip = zlib.gzipSync(raw, { level: 9 }).length;
    check(gzip <= limit, `${label} gzip ${kib(gzip)} <= ${kib(limit)}`);
  };
  measure('main.js', limits.mainJsGzip, 'main JavaScript');
  measure('main.css', limits.mainCssGzip, 'main CSS');
}

const source = fs.readFileSync(sourcePath, 'utf8');
const publicIndex = fs.readFileSync(publicIndexPath, 'utf8');
const sw = fs.readFileSync(swPath, 'utf8');
const fontModule = fs.readFileSync(fontModulePath, 'utf8');
const count = (text, needle) => text.split(needle).length - 1;

check(!/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(publicIndex + source), 'app has no external font dependency');
check(publicIndex.includes("fonts/Inter-latin.woff2"), 'startup HTML preloads the local Latin font subset');
check(publicIndex.includes('vendor/drag-drop-touch-2.0.3.esm.min.js') && !publicIndex.includes('cdn.jsdelivr.net/npm/@dragdroptouch'), 'touch drag support is self-hosted');
check(fontModule.includes('__alloEnsureUIFont') && !fontModule.includes("fonts.join('&family=')"), 'optional font catalog loads only the selected family');
check(source.includes('./vendor/lz-string-1.4.4.min.js') && source.includes('./vendor/idb-keyval-6.2.0.umd.min.js'), 'storage helpers prefer local pinned copies');
check(count(source, 'jsonrepair.min.js') === 1, 'jsonrepair has one on-demand loader and no eager duplicate');
check(count(source, 'jszip.min.js') === 1, 'JSZip has one on-demand loader and no eager duplicate');
check(count(source, 'pptxgen.bundle.js') === 1, 'PptxGenJS has one on-demand loader and no eager duplicate');
check(source.includes("classList.contains('alloflow-workspace-concealed')"), 'background module pump waits for the workspace');
check(source.includes('Math.max(0, 1 - pendingCount)'), 'background module concurrency stays capped at one');
check(source.includes('pauseUntil = performance.now() + 3000'), 'background work yields for three seconds after input');
check(sw.includes('ALLOFLOW_ACTIVATE_UPDATE') && source.includes('ALLOFLOW_ACTIVATE_UPDATE'), 'service-worker update requires explicit in-app activation');

const fontFiles = fs.readdirSync(fontDir).filter((name) => name.endsWith('.woff2'));
const fontBytes = fontFiles.reduce((total, name) => total + fs.statSync(path.join(fontDir, name)).size, 0);
const latinBytes = fs.statSync(path.join(fontDir, 'Inter-latin.woff2')).size;
const uiLatinBytes = ['Outfit-latin.woff2', 'PlusJakartaSans-latin.woff2', 'PlusJakartaSans-italic-latin.woff2']
  .reduce((total, name) => total + fs.statSync(path.join(fontDir, name)).size, 0);
check(latinBytes <= limits.latinFont, `cold-path Latin font ${kib(latinBytes)} <= ${kib(limits.latinFont)}`);
check(uiLatinBytes <= limits.uiLatinFonts, `additional UI Latin fonts ${kib(uiLatinBytes)} <= ${kib(limits.uiLatinFonts)}`);
check(fontBytes <= limits.allFonts, `all self-hosted font subsets ${kib(fontBytes)} <= ${kib(limits.allFonts)}`);

if (failures.length) {
  console.error(`\nPerformance budget failed (${failures.length} check${failures.length === 1 ? '' : 's'}).`);
  process.exit(1);
}
console.log('\nPerformance budget passed.');
