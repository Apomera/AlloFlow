#!/usr/bin/env node
/**
 * Build alt_text_module.js from alt_text_source.jsx.
 *
 * Shared alt-text service: batched vision descriptions, the remediation
 * quality checker, prompt-to-description, image hashing, provenance, and the
 * ImageAltField edit control used by every image-bearing tool.
 */

const { execSync } = require('child_process');
const { transformSync } = require('esbuild');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'alt_text_source.jsx');
const OUTPUT = path.join(ROOT, 'alt_text_module.js');
const PUBLIC = path.join(ROOT, 'desktop', 'web-app', 'public', 'alt_text_module.js');
const CHECK_ONLY = process.argv.includes('--check');

if (!fs.existsSync(SOURCE)) {
  console.error('[AltText] Source not found:', SOURCE);
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
  console.error('[AltText] esbuild compilation failed');
  console.error(error && error.message ? error.message : error);
  process.exit(1);
}

const outputCode = [
  '/** AlloFlow shared alt-text service. Generated from alt_text_source.jsx. */',
  '(function() {',
  "'use strict';",
  "if (window.AlloModules && window.AlloModules.AltTextModule) { console.log('[CDN] AltTextModule already loaded, skipping'); return; }",
  'var React = window.React;',
  "if (!React) { console.error('[AltText] React not found on window'); return; }",
  compiled,
  'window.AlloModules = window.AlloModules || {};',
  'window.AlloModules.ImageAltField = ImageAltField;',
  'window.AlloModules.AltText = {',
  '  ALT_SOURCES: ALT_SOURCES,',
  '  ALT_MAX_CHARS: ALT_MAX_CHARS,',
  '  ALT_BATCH_SIZE: ALT_BATCH_SIZE,',
  '  normalizeAltSource: normalizeAltSource,',
  '  assessAlt: assessAlt,',
  '  promptToDescription: promptToDescription,',
  '  hashImage: hashImage,',
  '  splitDataUrl: splitDataUrl,',
  '  buildDraftPrompt: buildDraftPrompt,',
  '  parseDraftReply: parseDraftReply,',
  '  draftAlts: draftAlts,',
  '  ImageAltField: ImageAltField,',
  '};',
  'window.AlloModules.AltTextModule = true;',
  "console.log('[CDN] AltTextModule loaded');",
  '})();',
  '',
].join('\n');

if (CHECK_ONLY) {
  const stale = [OUTPUT, PUBLIC].filter(file => {
    try { return fs.readFileSync(file, 'utf8') !== outputCode; } catch (_) { return true; }
  });
  if (stale.length) {
    console.error('[AltText] Stale build output: ' + stale.join(', '));
    process.exit(1);
  }
  console.log('[AltText] Build output is current.');
  process.exit(0);
}

fs.writeFileSync(OUTPUT, outputCode, 'utf8');
try {
  fs.mkdirSync(path.dirname(PUBLIC), { recursive: true });
  fs.writeFileSync(PUBLIC, outputCode, 'utf8');
} catch (error) {
  console.warn('[AltText] Public mirror write failed:', error && error.message ? error.message : error);
}
try {
  execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' });
} catch (error) {
  console.error('[AltText] Syntax check failed:');
  console.error((error.stderr && error.stderr.toString()) || error.message);
  process.exit(1);
}
console.log('[AltText] Built root and public modules (' + outputCode.split('\n').length + ' lines)');
