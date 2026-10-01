#!/usr/bin/env node
/** Build the reusable client-side raster picker/editor module. */

const { execSync } = require('child_process');
const { transformSync } = require('esbuild');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'image_asset_editor_source.jsx');
const OUTPUT = path.join(ROOT, 'image_asset_editor_module.js');
const PUBLIC = path.join(ROOT, 'desktop', 'web-app', 'public', 'image_asset_editor_module.js');

if (!fs.existsSync(SOURCE)) {
  console.error('[ImageAssetEditor] Source not found:', SOURCE);
  process.exit(1);
}

let compiled = '';
try {
  compiled = transformSync('/* global React */\n' + fs.readFileSync(SOURCE, 'utf8'), {
    loader: 'jsx',
    format: 'esm',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    target: 'es2020',
  }).code.replace(/\/\*.*global.*\*\/\n/g, '').trim();
} catch (error) {
  console.error('[ImageAssetEditor] esbuild compilation failed');
  console.error(error && error.message ? error.message : error);
  process.exit(1);
}

const outputCode = [
  '/** AlloFlow shared raster asset editor. Generated from image_asset_editor_source.jsx. */',
  '(function() {',
  "'use strict';",
  "if (window.AlloModules && window.AlloModules.ImageAssetEditorModule) { console.log('[CDN] ImageAssetEditorModule already loaded, skipping'); return; }",
  'var React = window.React;',
  "if (!React) { console.error('[ImageAssetEditor] React not found on window'); return; }",
  compiled,
  'window.AlloModules = window.AlloModules || {};',
  'window.AlloModules.ImageAssetEditor = ImageAssetEditor;',
  'window.AlloModules.ImageAssetPicker = ImageAssetPicker;',
  'window.AlloModules.ImageAssetTools = {',
  '  IMAGE_ASSET_ACCEPT: IMAGE_ASSET_ACCEPT,',
  '  IMAGE_ASSET_MAX_FILE_BYTES: IMAGE_ASSET_MAX_FILE_BYTES,',
  '  IMAGE_ASSET_MAX_OUTPUT_CHARS: IMAGE_ASSET_MAX_OUTPUT_CHARS,',
  '  IMAGE_ASSET_ASPECTS: IMAGE_ASSET_ASPECTS,',
  '  normalizeImageAssetSettings: normalizeImageAssetSettings,',
  '  validateImageAssetFile: validateImageAssetFile,',
  '  normalizeRasterDataUrl: normalizeRasterDataUrl,',
  '  imageAssetMime: imageAssetMime,',
  '  readImageAssetFile: readImageAssetFile,',
  '  computeImageAssetTargetSize: computeImageAssetTargetSize,',
  '  computeImageAssetDrawRect: computeImageAssetDrawRect,',
  '  renderImageAsset: renderImageAsset',
  '};',
  'window.AlloModules.ImageAssetEditorModule = true;',
  "console.log('[CDN] ImageAssetEditorModule loaded');",
  '})();',
  '',
].join('\n');

fs.writeFileSync(OUTPUT, outputCode, 'utf8');
fs.mkdirSync(path.dirname(PUBLIC), { recursive: true });
fs.writeFileSync(PUBLIC, outputCode, 'utf8');

try {
  execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' });
} catch (error) {
  console.error('[ImageAssetEditor] syntax check failed');
  console.error((error.stderr && error.stderr.toString()) || error.message);
  process.exit(1);
}

console.log('[ImageAssetEditor] Built root and public modules (' + outputCode.split('\n').length + ' lines)');
