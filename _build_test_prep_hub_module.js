#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'test_prep_hub_source.jsx');
const BANK_SOURCE = path.join(ROOT, 'test_prep', 'eppp_native_items.json');
const OUTPUT = path.join(ROOT, 'test_prep_hub_module.js');
const DEPLOY_OUTPUT = path.join(ROOT, 'prismflow-deploy', 'public', 'test_prep_hub_module.js');
const TMP = path.join(ROOT, '_tmp_test_prep_hub_entry.jsx');
const COMPILED = TMP + '.compiled.js';
const QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_eppp_native_pack.cjs');
const INVENTORY_SCRIPT = path.join(ROOT, 'dev-tools', 'inventory_eppp_learning_content.cjs');
const REVIEW_LEDGER_SCRIPT = path.join(ROOT, 'dev-tools', 'build_eppp_review_ledger.cjs');
const CURATION_500_SCRIPT = path.join(ROOT, 'dev-tools', 'build_eppp_500_curation_manifest.cjs');

if (!fs.existsSync(SOURCE)) {
  console.error('Source not found:', SOURCE);
  process.exit(1);
}

const source = fs.readFileSync(SOURCE, 'utf8');
const bank = JSON.parse(fs.readFileSync(BANK_SOURCE, 'utf8'));
if (!Array.isArray(bank) || !bank.length) throw new Error('EPPP native item bank is empty or invalid.');
const bankPrelude = 'const EPPP_NATIVE_ITEMS = ' + JSON.stringify(bank) + ';\n\n';
fs.writeFileSync(TMP, '/* global React */\n\n' + bankPrelude + source + '\n', 'utf8');

try {
  execSync(`npx esbuild "${TMP}" --bundle=false --format=esm --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --outfile="${COMPILED}" --target=es2020`, { cwd: ROOT, stdio: 'inherit' });
} catch (error) {
  console.error('esbuild failed');
  try { fs.unlinkSync(TMP); } catch (_) {}
  process.exit(1);
}

const compiled = fs.readFileSync(COMPILED, 'utf8').replace(/\/\*.*global.*\*\/\n/g, '').trim();
fs.unlinkSync(TMP);
fs.unlinkSync(COMPILED);

const output = `/**
 * AlloFlow Test Prep Hub Module
 * Auto-generated. Source: test_prep_hub_source.jsx
 */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  window.AlloModules = window.AlloModules || {};
  if (window.AlloModules.TestPrepHub) return;
  var React = window.React;
  if (!React) { console.error('[TestPrepHub] React not found on window'); return; }

${compiled}

  window.AlloModules.TestPrepHub = Object.assign(TestPrepHub, {
    TestPrepHub: TestPrepHub,
    schemaVersion: TEST_PREP_SCHEMA_VERSION,
    itemTypes: TEST_PREP_ITEM_TYPES.slice(),
    registerPack: registerTestPrepPack,
    listPacks: listTestPrepPacks,
    normalizePack: normalizeTestPrepPack,
    validatePack: validateTestPrepPack,
    normalizeProgress: normalizeTestPrepProgress,
    scoreAttempt: scoreTestPrepAttempt,
    recordAttempt: recordTestPrepAttempt,
    researchLanes: TEST_PREP_RESEARCH_LANES.slice()
  });
  console.log('[CDN] TestPrepHub loaded');
})();
`;

fs.writeFileSync(OUTPUT, output, 'utf8');
fs.mkdirSync(path.dirname(DEPLOY_OUTPUT), { recursive: true });
fs.writeFileSync(DEPLOY_OUTPUT, output, 'utf8');
console.log('Built test_prep_hub_module.js (' + output.split('\n').length + ' lines)');
execSync(`node "${QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${INVENTORY_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${REVIEW_LEDGER_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${CURATION_500_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });

