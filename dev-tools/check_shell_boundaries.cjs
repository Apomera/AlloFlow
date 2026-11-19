#!/usr/bin/env node
/**
 * Shell Boundary Guard (check_shell_boundaries.cjs)
 *
 * Ensures the root marketing landing page (index.html) and the CRA React app
 * shells (desktop/web-app/public/index.html, desktop/web-app/build/index.html,
 * desktop/app-build/index.html) are never overwritten by each other.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MARKETING_MARKER = 'Free AI Tools for Differentiated Instruction';

function checkShellBoundaries(rootDir = ROOT) {
  const errors = [];

  // 1. Root index.html must remain the marketing landing page, not the CRA shell.
  const rootIndexPath = path.join(rootDir, 'index.html');
  if (!fs.existsSync(rootIndexPath)) {
    errors.push('Missing root index.html (marketing landing page).');
  } else {
    const rootHtml = fs.readFileSync(rootIndexPath, 'utf8');
    if (/<div\s+id=["']root["']/.test(rootHtml) || rootHtml.includes('%PUBLIC_URL%')) {
      errors.push('Root index.html appears to have been overwritten by the CRA React app shell.');
    }
  }

  // 2. desktop/web-app/public/index.html must remain the CRA React template with pre-boot hardening.
  const publicIndexPath = path.join(rootDir, 'desktop', 'web-app', 'public', 'index.html');
  if (!fs.existsSync(publicIndexPath)) {
    errors.push('Missing desktop/web-app/public/index.html (CRA React shell template).');
  } else {
    const pubHtml = fs.readFileSync(publicIndexPath, 'utf8');
    if (pubHtml.includes(MARKETING_MARKER)) {
      errors.push('desktop/web-app/public/index.html was overwritten with the root marketing index.html.');
    }
    if (!/<div\s+id=["']root["']/.test(pubHtml)) {
      errors.push('desktop/web-app/public/index.html is missing <div id="root">.');
    }
    if (!pubHtml.includes('id="alloflow-ai-backend-script"')) {
      errors.push('desktop/web-app/public/index.html is missing #alloflow-ai-backend-script.');
    }
    if (!pubHtml.includes('alloflow_desktop_bridge.js')) {
      errors.push('desktop/web-app/public/index.html is missing alloflow_desktop_bridge.js.');
    }
    if (!pubHtml.includes('alloflow_ai_config: 1')) {
      errors.push('desktop/web-app/public/index.html is missing pre-boot secret exclusion (alloflow_ai_config: 1).');
    }
    if (!pubHtml.includes('dbHasProtectedClinicalRecords(dump)')) {
      errors.push('desktop/web-app/public/index.html is missing pre-boot protected clinical vault guard.');
    }
    if (!pubHtml.includes('getPrebootBackoffRetryMs()')) {
      errors.push('desktop/web-app/public/index.html is missing pre-boot educator access-code backoff guard.');
    }
  }

  // 3. Built shells (when present) must be compiled CRA React app shells, never the marketing page.
  const builtShells = [
    path.join('desktop', 'web-app', 'build', 'index.html'),
    path.join('desktop', 'app-build', 'index.html'),
  ];
  for (const rel of builtShells) {
    const abs = path.join(rootDir, rel);
    if (!fs.existsSync(abs)) continue;
    const html = fs.readFileSync(abs, 'utf8');
    if (html.includes(MARKETING_MARKER)) {
      errors.push(`${rel} was overwritten with the root marketing index.html.`);
    }
    if (!/<div\s+id=["']root["']/.test(html)) {
      errors.push(`${rel} is missing <div id="root">.`);
    }
    if (html.includes('%PUBLIC_URL%')) {
      errors.push(`${rel} contains unexpanded %PUBLIC_URL% template tokens.`);
    }
    if (!/static\/js\/main\.[a-f0-9]+\.js/.test(html)) {
      errors.push(`${rel} is missing a compiled static/js/main.<hash>.js entrypoint.`);
    }
  }

  return errors;
}

if (require.main === module) {
  const errors = checkShellBoundaries(ROOT);
  if (errors.length) {
    console.error('Shell boundary check FAILED:');
    for (const err of errors) console.error('  - ' + err);
    process.exit(1);
  }
  console.log('Shell boundary check passed (root marketing index.html and CRA desktop/*/index.html shells intact).');
}

module.exports = { checkShellBoundaries, MARKETING_MARKER };
