#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'view_cloze_interaction_panel_source.jsx');
const OUTPUT = path.join(ROOT, 'view_cloze_interaction_panel_module.js');
const DEPLOY_OUT = path.join(ROOT, 'desktop', 'web-app', 'public', 'view_cloze_interaction_panel_module.js');
const TMP = path.join(ROOT, '_tmp_cloze_interaction_panel_entry.jsx');
if (!fs.existsSync(SOURCE)) { console.error('Source not found:', SOURCE); process.exit(1); }
const source = fs.readFileSync(SOURCE, 'utf-8');
const sourceHash = crypto.createHash('sha256').update(source).digest('hex').slice(0, 16);
const entry = `/* global React */\n\n${source}\n\nwindow.__clozeInteractionPanelExports = { ClozeInteractionPanel };\n`;
fs.writeFileSync(TMP, entry, 'utf-8');
console.log('Compiling view_cloze_interaction_panel_source.jsx...');
try {
    execSync(`npx esbuild "${TMP}" --bundle=false --format=esm --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --outfile="${TMP}.compiled.js" --target=es2020`, { cwd: ROOT, stdio: 'inherit' });
} catch (e) { console.error('esbuild failed'); try { fs.unlinkSync(TMP); } catch(_) {} process.exit(1); }
const compiled = fs.readFileSync(TMP + '.compiled.js', 'utf-8')
    .replace(/\/\*.*global.*\*\/\n/g, '')
    .replace(/window\.__clozeInteractionPanelExports\s*=\s*\{[^}]+\};?\s*/, '')
    .trim();
fs.unlinkSync(TMP);
fs.unlinkSync(TMP + '.compiled.js');
const outputCode = `/**
 * AlloFlow ClozeInteractionPanel Module
 * Auto-generated. Source: view_cloze_interaction_panel_source.jsx
 * Source SHA-256: ${sourceHash}
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.ClozeInteractionPanel) {
    console.log('[CDN] ClozeInteractionPanel already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ClozeInteractionPanel] React not found on window'); return; }

${compiled}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ClozeInteractionPanel = { ClozeInteractionPanel: ClozeInteractionPanel };
  console.log('[CDN] ClozeInteractionPanel loaded');
})();
`;
fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
fs.writeFileSync(DEPLOY_OUT, outputCode, 'utf-8');
console.log(`Built ${OUTPUT} (${outputCode.split('\n').length} lines)`);
console.log(`Synced ${DEPLOY_OUT}`);
