#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'test_prep_hub_source.jsx');
const epppBankPath = path.join(root, 'test_prep', 'eppp_native_items.json');
const paraProSourcePath = path.join(root, 'test_prep', 'parapro_pack.json');
const paraProBatch2BuildPath = path.join(root, 'dev-tools', 'build_parapro_batch_2.cjs');
const paraProQaPath = path.join(root, 'dev-tools', 'qa_parapro_pack_release.cjs');
const paraProLibraryBuildPath = path.join(root, 'dev-tools', 'build_parapro_learning_library.cjs');
const paraProLibraryQaPath = path.join(root, 'dev-tools', 'qa_parapro_learning_library.cjs');
const specialEducation5355SourcePath = path.join(root, 'test_prep', 'special_education_5355_pack.json');
const specialEducation5355BuildPath = path.join(root, 'dev-tools', 'build_special_education_5355_pack.cjs');
const specialEducation5355QaPath = path.join(root, 'dev-tools', 'qa_special_education_5355_pack.cjs');
const specialEducation5355LibraryBuildPath = path.join(root, 'dev-tools', 'build_special_education_5355_learning_library.cjs');
const specialEducation5355LibraryQaPath = path.join(root, 'dev-tools', 'qa_special_education_5355_learning_library.cjs');
const outputPath = path.join(root, 'test_prep_hub_module.js');
const deployOutputPath = path.join(root, 'prismflow-deploy', 'public', 'test_prep_hub_module.js');
const tempEntryPath = path.join(root, '_tmp_test_prep_hub_release_entry.jsx');
const compiledPath = tempEntryPath + '.compiled.js';
const registrationMarker = 'registerTestPrepPack(EPPP_PART_ONE_SCAFFOLD);';
const paraProRegistration = 'registerTestPrepPack(PARAPRO_PRACTICE_PACK);';
const specialEducation5355Registration = 'registerTestPrepPack(SPECIAL_EDUCATION_5355_PRACTICE_PACK);';

if (!fs.existsSync(sourcePath)) throw new Error('Test Prep Hub source not found.');
if (!fs.existsSync(epppBankPath)) throw new Error('EPPP bank not found.');
if (!fs.existsSync(paraProSourcePath)) throw new Error('ParaPro release source not found.');
if (!fs.existsSync(specialEducation5355SourcePath)) throw new Error('Praxis Special Education 5355 release source not found.');
execFileSync(process.execPath, [paraProBatch2BuildPath], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [paraProLibraryBuildPath], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [paraProLibraryQaPath], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [paraProQaPath], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [specialEducation5355BuildPath], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [specialEducation5355LibraryBuildPath], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [specialEducation5355LibraryQaPath], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [specialEducation5355QaPath], { cwd: root, stdio: 'inherit' });

const originalSource = fs.readFileSync(sourcePath, 'utf8');
if (!originalSource.includes(registrationMarker)) throw new Error('Test Prep Hub registration marker changed; review the ParaPro release injection.');
const source = originalSource.includes(paraProRegistration)
  ? originalSource
  : originalSource.replace(registrationMarker, registrationMarker + '\n' + paraProRegistration);
const epppItems = JSON.parse(fs.readFileSync(epppBankPath, 'utf8'));
if (!source.includes(specialEducation5355Registration)) throw new Error('Test Prep Hub source must register the Praxis Special Education 5355 pack.');
const paraProPack = JSON.parse(fs.readFileSync(paraProSourcePath, 'utf8'));
if (!Array.isArray(epppItems) || !epppItems.length) throw new Error('EPPP bank is empty or invalid.');
const specialEducation5355Pack = JSON.parse(fs.readFileSync(specialEducation5355SourcePath, 'utf8'));
if (!paraProPack || paraProPack.id !== 'parapro-1755-practice-1' || paraProPack.batchSize !== 100 || !Array.isArray(paraProPack.items) || paraProPack.items.length !== 200) {
  throw new Error('ParaPro release pack is empty or invalid.');
}

if (!specialEducation5355Pack || specialEducation5355Pack.id !== 'praxis-special-education-5355' || specialEducation5355Pack.batchSize !== 100 || !Array.isArray(specialEducation5355Pack.items) || specialEducation5355Pack.items.length !== 200) {
  throw new Error('Praxis Special Education 5355 release pack is empty or invalid.');
}
const prelude = 'const EPPP_NATIVE_ITEMS = ' + JSON.stringify(epppItems) + ';\n\n'
  + 'const PARAPRO_PRACTICE_PACK = ' + JSON.stringify(paraProPack) + ';\n\n'
  + 'const SPECIAL_EDUCATION_5355_PRACTICE_PACK = ' + JSON.stringify(specialEducation5355Pack) + ';\n\n';
fs.writeFileSync(tempEntryPath, '/* global React */\n\n' + prelude + source + '\n', 'utf8');

try {
  const esbuildPath = path.join(root, 'node_modules', 'esbuild', 'bin', 'esbuild');
  execFileSync(process.execPath, [
    esbuildPath,
    tempEntryPath,
    '--bundle=false',
    '--format=esm',
    '--jsx=transform',
    '--jsx-factory=React.createElement',
    '--jsx-fragment=React.Fragment',
    '--outfile=' + compiledPath,
    '--target=es2020',
  ], { cwd: root, stdio: 'inherit' });

  const compiled = fs.readFileSync(compiledPath, 'utf8').replace(/\/\*.*global.*\*\/\n/g, '').trim();
  const output = `/**
 * AlloFlow Test Prep Hub Module
 * Auto-generated by dev-tools/build_test_prep_hub_release.cjs.
 * Source: test_prep_hub_source.jsx + independently authored bundled exam packs.
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
    arrangeBalancedBatches: testPrepArrangeBalancedBatches,
    batchMeta: testPrepBatchMeta,
    buildBatchDiagnostic: testPrepBuildBatchDiagnostic,
    recordBatchAttempt: recordTestPrepBatchAttempt,
    buildProgressAnalytics: testPrepBuildProgressAnalytics,
    researchLanes: TEST_PREP_RESEARCH_LANES.slice()
  });
  console.log('[CDN] TestPrepHub loaded');
})();
`;

  fs.writeFileSync(outputPath, output, 'utf8');
  fs.mkdirSync(path.dirname(deployOutputPath), { recursive: true });
  fs.writeFileSync(deployOutputPath, output, 'utf8');
  console.log('Built Test Prep Hub release with ParaPro and Praxis Special Education 5355 (' + output.split('\n').length + ' lines).');
} finally {
  try { fs.unlinkSync(tempEntryPath); } catch (_) {}
  try { fs.unlinkSync(compiledPath); } catch (_) {}
}

