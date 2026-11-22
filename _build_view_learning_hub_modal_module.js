#!/usr/bin/env node
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'view_learning_hub_modal_source.jsx');
const OUTPUT = path.join(ROOT, 'view_learning_hub_modal_module.js');
const TMP = path.join(ROOT, '_tmp_learning_hub_modal_entry.jsx');
const TMP_OUT = TMP + '.compiled.js';
if (!fs.existsSync(SOURCE)) { console.error('Source not found:', SOURCE); process.exit(1); }
const source = fs.readFileSync(SOURCE, 'utf-8');
const entry = `/* global React */\n\n${source}\n\nwindow.__learningHubModalExports = { LearningHubModal };\n`;
fs.writeFileSync(TMP, entry, 'utf-8');
console.log('Compiling view_learning_hub_modal_source.jsx...');

function resolveEsbuildBin() {
  const ext = process.platform === 'win32' ? '.cmd' : '';
  const candidates = [
    path.join(ROOT, 'node_modules', '.bin', 'esbuild' + ext),
    path.join(ROOT, 'desktop', 'web-app', 'node_modules', '.bin', 'esbuild' + ext)
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

let compiled = '';
try {
  let esbuildApi = null;
  try { esbuildApi = require('esbuild'); } catch (_) {}
  if (esbuildApi && typeof esbuildApi.buildSync === 'function') {
    esbuildApi.buildSync({
      entryPoints: [TMP],
      bundle: false,
      format: 'esm',
      jsx: 'transform',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      outfile: TMP_OUT,
      target: 'es2020'
    });
  } else {
    const bin = resolveEsbuildBin();
    const args = [TMP, '--bundle=false', '--format=esm', '--jsx=transform', '--jsx-factory=React.createElement', '--jsx-fragment=React.Fragment', '--outfile=' + TMP_OUT, '--target=es2020'];
    if (bin) {
      execFileSync(bin, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
    } else {
      execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['esbuild', ...args], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
    }
  }
  compiled = fs.readFileSync(TMP_OUT, 'utf-8')
    .replace(/^\/\*\s*global\s+React\s*\*\/\r?\n/, '')
    .replace(/window\.__learningHubModalExports\s*=\s*\{[^}]+\};?\s*/, '')
    .trim();
} catch (e) {
  console.error('esbuild failed', e && e.message ? e.message : e);
  process.exit(1);
} finally {
  try { if (fs.existsSync(TMP)) fs.unlinkSync(TMP); } catch (_) {}
  try { if (fs.existsSync(TMP_OUT)) fs.unlinkSync(TMP_OUT); } catch (_) {}
}

const outputCode = `/**
 * AlloFlow LearningHubModal Module
 * Auto-generated. Source: view_learning_hub_modal_source.jsx
 */
(function() {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window.AlloModules && window.AlloModules.LearningHubModal) {
    console.log('[CDN] LearningHubModal already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[LearningHubModal] React not found on window'); return; }

${compiled}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.LearningHubModal = { LearningHubModal: LearningHubModal };
  console.log('[CDN] LearningHubModal loaded');
})();
`;
fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
const mirrors = [
  path.join(ROOT, 'desktop', 'web-app', 'public', 'view_learning_hub_modal_module.js'),
  path.join(ROOT, 'desktop', 'web-app', 'build', 'view_learning_hub_modal_module.js'),
  path.join(ROOT, 'desktop', 'app-build', 'view_learning_hub_modal_module.js')
];
for (const m of mirrors) {
  if (fs.existsSync(path.dirname(m))) fs.writeFileSync(m, outputCode, 'utf-8');
}
console.log(`Built ${OUTPUT} (${outputCode.split('\n').length} lines)`);
