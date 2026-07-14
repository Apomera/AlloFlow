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
const schoolCounselor5422SourcePath = path.join(root, 'test_prep', 'school_counselor_5422_pack.json');
const schoolCounselor5422BuildPath = path.join(root, 'dev-tools', 'build_school_counselor_5422_pack.cjs');
const schoolCounselor5422QaPath = path.join(root, 'dev-tools', 'qa_school_counselor_5422_pack.cjs');
const schoolCounselor5422LibraryBuildPath = path.join(root, 'dev-tools', 'build_school_counselor_5422_learning_library.cjs');
const schoolCounselor5422LibraryQaPath = path.join(root, 'dev-tools', 'qa_school_counselor_5422_learning_library.cjs');
const schoolPsychologist5403SourcePath = path.join(root, 'test_prep', 'school_psychologist_5403_pack.json');
const schoolPsychologist5403BuildPath = path.join(root, 'dev-tools', 'build_school_psychologist_5403_pack.cjs');
const schoolPsychologist5403QaPath = path.join(root, 'dev-tools', 'qa_school_psychologist_5403_pack.cjs');
const schoolPsychologist5403LibraryBuildPath = path.join(root, 'dev-tools', 'build_school_psychologist_5403_learning_library.cjs');
const schoolPsychologist5403LibraryQaPath = path.join(root, 'dev-tools', 'qa_school_psychologist_5403_learning_library.cjs');
const speechLanguagePathology5331SourcePath = path.join(root, 'test_prep', 'speech_language_pathology_5331_pack.json');
const speechLanguagePathology5331BuildPath = path.join(root, 'dev-tools', 'build_speech_language_pathology_5331_pack.cjs');
const speechLanguagePathology5331QaPath = path.join(root, 'dev-tools', 'qa_speech_language_pathology_5331_pack.cjs');
const speechLanguagePathology5331LibraryBuildPath = path.join(root, 'dev-tools', 'build_speech_language_pathology_5331_learning_library.cjs');
const speechLanguagePathology5331LibraryQaPath = path.join(root, 'dev-tools', 'qa_speech_language_pathology_5331_learning_library.cjs');
const outputPath = path.join(root, 'test_prep_hub_module.js');
const deployOutputPath = path.join(root, 'prismflow-deploy', 'public', 'test_prep_hub_module.js');
const tempEntryPath = path.join(root, '_tmp_test_prep_hub_release_entry.jsx');
const compiledPath = tempEntryPath + '.compiled.js';
const registrationMarker = 'registerTestPrepPack(EPPP_PART_ONE_SCAFFOLD);';
const paraProRegistration = 'registerTestPrepPack(PARAPRO_PRACTICE_PACK);';
const specialEducation5355Registration = 'registerTestPrepPack(SPECIAL_EDUCATION_5355_PRACTICE_PACK);';
const schoolCounselor5422Registration = 'registerTestPrepPack(SCHOOL_COUNSELOR_5422_PRACTICE_PACK);';
const schoolPsychologist5403Registration = 'registerTestPrepPack(SCHOOL_PSYCHOLOGIST_5403_PRACTICE_PACK);';
const speechLanguagePathology5331Registration = 'registerTestPrepPack(SPEECH_LANGUAGE_PATHOLOGY_5331_PRACTICE_PACK);';

if (!fs.existsSync(sourcePath)) throw new Error('Test Prep Hub source not found.');
if (!fs.existsSync(epppBankPath)) throw new Error('EPPP bank not found.');
if (!fs.existsSync(paraProSourcePath)) throw new Error('ParaPro release source not found.');
if (!fs.existsSync(specialEducation5355SourcePath)) throw new Error('Praxis Special Education 5355 release source not found.');
if (!fs.existsSync(schoolCounselor5422SourcePath)) throw new Error('Praxis School Counselor 5422 release source not found.');
if (!fs.existsSync(schoolPsychologist5403SourcePath)) throw new Error('Praxis School Psychologist 5403 release source not found.');
if (!fs.existsSync(speechLanguagePathology5331SourcePath)) throw new Error('Praxis Speech-Language Pathology 5331 release source not found.');
execFileSync(process.execPath, [paraProBatch2BuildPath], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [paraProLibraryBuildPath], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [paraProLibraryQaPath], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [paraProQaPath], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [specialEducation5355BuildPath], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [specialEducation5355LibraryBuildPath], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [specialEducation5355LibraryQaPath], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [specialEducation5355QaPath], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [schoolCounselor5422BuildPath], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [schoolCounselor5422LibraryBuildPath], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [schoolCounselor5422LibraryQaPath], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [schoolCounselor5422QaPath], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [schoolPsychologist5403BuildPath], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [schoolPsychologist5403LibraryBuildPath], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [schoolPsychologist5403LibraryQaPath], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [schoolPsychologist5403QaPath], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [speechLanguagePathology5331BuildPath], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [speechLanguagePathology5331LibraryBuildPath], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [speechLanguagePathology5331LibraryQaPath], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [speechLanguagePathology5331QaPath], { cwd: root, stdio: 'inherit' });

const originalSource = fs.readFileSync(sourcePath, 'utf8');
if (!originalSource.includes(registrationMarker)) throw new Error('Test Prep Hub registration marker changed; review the ParaPro release injection.');
const source = originalSource.includes(paraProRegistration)
  ? originalSource
  : originalSource.replace(registrationMarker, registrationMarker + '\n' + paraProRegistration);
const epppItems = JSON.parse(fs.readFileSync(epppBankPath, 'utf8'));
if (!source.includes(specialEducation5355Registration)) throw new Error('Test Prep Hub source must register the Praxis Special Education 5355 pack.');
if (!source.includes(schoolCounselor5422Registration)) throw new Error('Test Prep Hub source must register the Praxis School Counselor 5422 pack.');
if (!source.includes(schoolPsychologist5403Registration)) throw new Error('Test Prep Hub source must register the Praxis School Psychologist 5403 pack.');
if (!source.includes(speechLanguagePathology5331Registration)) throw new Error('Test Prep Hub source must register the Praxis Speech-Language Pathology 5331 pack.');
const paraProPack = JSON.parse(fs.readFileSync(paraProSourcePath, 'utf8'));
const specialEducation5355Pack = JSON.parse(fs.readFileSync(specialEducation5355SourcePath, 'utf8'));
const schoolCounselor5422Pack = JSON.parse(fs.readFileSync(schoolCounselor5422SourcePath, 'utf8'));
const schoolPsychologist5403Pack = JSON.parse(fs.readFileSync(schoolPsychologist5403SourcePath, 'utf8'));
const speechLanguagePathology5331Pack = JSON.parse(fs.readFileSync(speechLanguagePathology5331SourcePath, 'utf8'));
if (!Array.isArray(epppItems) || !epppItems.length) throw new Error('EPPP bank is empty or invalid.');
if (!paraProPack || paraProPack.id !== 'parapro-1755-practice-1' || paraProPack.batchSize !== 100 || !Array.isArray(paraProPack.items) || paraProPack.items.length !== 200) {
  throw new Error('ParaPro release pack is empty or invalid.');
}

if (!specialEducation5355Pack || specialEducation5355Pack.id !== 'praxis-special-education-5355' || specialEducation5355Pack.batchSize !== 100 || !Array.isArray(specialEducation5355Pack.items) || specialEducation5355Pack.items.length !== 200) {
  throw new Error('Praxis Special Education 5355 release pack is empty or invalid.');
}
if (!schoolCounselor5422Pack || schoolCounselor5422Pack.id !== 'praxis-school-counselor-5422' || schoolCounselor5422Pack.batchSize !== 100 || !Array.isArray(schoolCounselor5422Pack.items) || schoolCounselor5422Pack.items.length !== 200) {
  throw new Error('Praxis School Counselor 5422 release pack is empty or invalid.');
}
if (!schoolPsychologist5403Pack || schoolPsychologist5403Pack.id !== 'praxis-school-psychologist-5403' || schoolPsychologist5403Pack.batchSize !== 100 || !Array.isArray(schoolPsychologist5403Pack.items) || schoolPsychologist5403Pack.items.length !== 200) {
  throw new Error('Praxis School Psychologist 5403 release pack is empty or invalid.');
}
if (!speechLanguagePathology5331Pack || speechLanguagePathology5331Pack.id !== 'praxis-speech-language-pathology-5331' || speechLanguagePathology5331Pack.batchSize !== 100 || !Array.isArray(speechLanguagePathology5331Pack.items) || speechLanguagePathology5331Pack.items.length !== 200) {
  throw new Error('Praxis Speech-Language Pathology 5331 release pack is empty or invalid.');
}
const prelude = 'const EPPP_NATIVE_ITEMS = ' + JSON.stringify(epppItems) + ';\n\n'
  + 'const PARAPRO_PRACTICE_PACK = ' + JSON.stringify(paraProPack) + ';\n\n'
  + 'const SPECIAL_EDUCATION_5355_PRACTICE_PACK = ' + JSON.stringify(specialEducation5355Pack) + ';\n\n'
  + 'const SCHOOL_COUNSELOR_5422_PRACTICE_PACK = ' + JSON.stringify(schoolCounselor5422Pack) + ';\n\n'
  + 'const SCHOOL_PSYCHOLOGIST_5403_PRACTICE_PACK = ' + JSON.stringify(schoolPsychologist5403Pack) + ';\n\n'
  + 'const SPEECH_LANGUAGE_PATHOLOGY_5331_PRACTICE_PACK = ' + JSON.stringify(speechLanguagePathology5331Pack) + ';\n\n';
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
  console.log('Built Test Prep Hub release with ParaPro, Praxis Special Education 5355, Praxis School Counselor 5422, Praxis School Psychologist 5403, and Praxis Speech-Language Pathology 5331 (' + output.split('\n').length + ' lines).');
} finally {
  try { fs.unlinkSync(tempEntryPath); } catch (_) {}
  try { fs.unlinkSync(compiledPath); } catch (_) {}
}

