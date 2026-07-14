#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'test_prep_hub_source.jsx');
const BANK_SOURCE = path.join(ROOT, 'test_prep', 'eppp_native_items.json');
const PARAPRO_PACK_SOURCE = path.join(ROOT, 'test_prep', 'parapro_pack.json');
const SPECIAL_EDUCATION_5355_PACK_SOURCE = path.join(ROOT, 'test_prep', 'special_education_5355_pack.json');
const SCHOOL_COUNSELOR_5422_PACK_SOURCE = path.join(ROOT, 'test_prep', 'school_counselor_5422_pack.json');
const SCHOOL_PSYCHOLOGIST_5403_PACK_SOURCE = path.join(ROOT, 'test_prep', 'school_psychologist_5403_pack.json');
const SPEECH_LANGUAGE_PATHOLOGY_5331_PACK_SOURCE = path.join(ROOT, 'test_prep', 'speech_language_pathology_5331_pack.json');
const AUDIOLOGY_5343_PACK_SOURCE = path.join(ROOT, 'test_prep', 'audiology_5343_pack.json');
const READING_SPECIALIST_5302_PACK_SOURCE = path.join(ROOT, 'test_prep', 'reading_specialist_5302_pack.json');
const OUTPUT = path.join(ROOT, 'test_prep_hub_module.js');
const DEPLOY_OUTPUT = path.join(ROOT, 'prismflow-deploy', 'public', 'test_prep_hub_module.js');
const TMP = path.join(ROOT, '_tmp_test_prep_hub_entry.jsx');
const COMPILED = TMP + '.compiled.js';
const QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_eppp_native_pack.cjs');
const INVENTORY_SCRIPT = path.join(ROOT, 'dev-tools', 'inventory_eppp_learning_content.cjs');
const LEARNING_LIBRARY_SCRIPT = path.join(ROOT, 'dev-tools', 'build_eppp_learning_library.cjs');
const REVIEW_LEDGER_SCRIPT = path.join(ROOT, 'dev-tools', 'build_eppp_review_ledger.cjs');
const CURATION_500_SCRIPT = path.join(ROOT, 'dev-tools', 'build_eppp_500_curation_manifest.cjs');
const CURATION_1000_SCRIPT = path.join(ROOT, 'dev-tools', 'build_eppp_1000_curation_manifest.cjs');
const EPPP_1500_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_eppp_1500_expansion.cjs');
const CURATION_1500_SCRIPT = path.join(ROOT, 'dev-tools', 'build_eppp_1500_curation_manifest.cjs');
const EXPANSION_AUDIT_SOURCE = path.join(ROOT, 'test_prep', 'eppp_native_expansion_1500_audit.json');
const EXPANSION_AUDIT_DEPLOY = path.join(ROOT, 'prismflow-deploy', 'public', 'test_prep', 'eppp_native_expansion_1500_audit.json');
const PARAPRO_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_parapro_pack_release.cjs');
const PARAPRO_BATCH2_SCRIPT = path.join(ROOT, 'dev-tools', 'build_parapro_batch_2.cjs');
const PARAPRO_LIBRARY_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_parapro_learning_library.cjs');
const PARAPRO_LIBRARY_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_parapro_learning_library.cjs');
const SPECIAL_EDUCATION_5355_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_special_education_5355_pack.cjs');
const SPECIAL_EDUCATION_5355_LIBRARY_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_special_education_5355_learning_library.cjs');
const SPECIAL_EDUCATION_5355_LIBRARY_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_special_education_5355_learning_library.cjs');
const SPECIAL_EDUCATION_5355_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_special_education_5355_pack.cjs');
const SCHOOL_COUNSELOR_5422_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_school_counselor_5422_pack.cjs');
const SCHOOL_COUNSELOR_5422_LIBRARY_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_school_counselor_5422_learning_library.cjs');
const SCHOOL_COUNSELOR_5422_LIBRARY_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_school_counselor_5422_learning_library.cjs');
const SCHOOL_COUNSELOR_5422_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_school_counselor_5422_pack.cjs');
const SCHOOL_PSYCHOLOGIST_5403_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_school_psychologist_5403_pack.cjs');
const SCHOOL_PSYCHOLOGIST_5403_LIBRARY_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_school_psychologist_5403_learning_library.cjs');
const SCHOOL_PSYCHOLOGIST_5403_LIBRARY_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_school_psychologist_5403_learning_library.cjs');
const SCHOOL_PSYCHOLOGIST_5403_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_school_psychologist_5403_pack.cjs');
const SPEECH_LANGUAGE_PATHOLOGY_5331_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_speech_language_pathology_5331_pack.cjs');
const SPEECH_LANGUAGE_PATHOLOGY_5331_LIBRARY_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_speech_language_pathology_5331_learning_library.cjs');
const SPEECH_LANGUAGE_PATHOLOGY_5331_LIBRARY_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_speech_language_pathology_5331_learning_library.cjs');
const SPEECH_LANGUAGE_PATHOLOGY_5331_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_speech_language_pathology_5331_pack.cjs');
const AUDIOLOGY_5343_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_audiology_5343_pack.cjs');
const AUDIOLOGY_5343_LIBRARY_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_audiology_5343_learning_library.cjs');
const AUDIOLOGY_5343_LIBRARY_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_audiology_5343_learning_library.cjs');
const AUDIOLOGY_5343_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_audiology_5343_pack.cjs');
const READING_SPECIALIST_5302_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_reading_specialist_5302_pack.cjs');
const READING_SPECIALIST_5302_LIBRARY_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_reading_specialist_5302_learning_library.cjs');
const READING_SPECIALIST_5302_LIBRARY_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_reading_specialist_5302_learning_library.cjs');
const READING_SPECIALIST_5302_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_reading_specialist_5302_pack.cjs');
const skipEpppRefresh = process.argv.includes('--skip-eppp-refresh');

if (!fs.existsSync(SOURCE)) {
  console.error('Source not found:', SOURCE);
  process.exit(1);
}
execSync(`node "${PARAPRO_BATCH2_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${PARAPRO_LIBRARY_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${PARAPRO_LIBRARY_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${PARAPRO_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });

execSync(`node "${SPECIAL_EDUCATION_5355_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SPECIAL_EDUCATION_5355_LIBRARY_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SPECIAL_EDUCATION_5355_LIBRARY_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SPECIAL_EDUCATION_5355_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
const source = fs.readFileSync(SOURCE, 'utf8');
execSync(`node "${SCHOOL_COUNSELOR_5422_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SCHOOL_COUNSELOR_5422_LIBRARY_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SCHOOL_COUNSELOR_5422_LIBRARY_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SCHOOL_COUNSELOR_5422_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SCHOOL_PSYCHOLOGIST_5403_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SCHOOL_PSYCHOLOGIST_5403_LIBRARY_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SCHOOL_PSYCHOLOGIST_5403_LIBRARY_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SCHOOL_PSYCHOLOGIST_5403_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SPEECH_LANGUAGE_PATHOLOGY_5331_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SPEECH_LANGUAGE_PATHOLOGY_5331_LIBRARY_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SPEECH_LANGUAGE_PATHOLOGY_5331_LIBRARY_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SPEECH_LANGUAGE_PATHOLOGY_5331_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${EPPP_1500_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
const bank = JSON.parse(fs.readFileSync(BANK_SOURCE, 'utf8'));
execSync(`node "${AUDIOLOGY_5343_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${AUDIOLOGY_5343_LIBRARY_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${AUDIOLOGY_5343_LIBRARY_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${AUDIOLOGY_5343_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${READING_SPECIALIST_5302_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${READING_SPECIALIST_5302_LIBRARY_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${READING_SPECIALIST_5302_LIBRARY_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${READING_SPECIALIST_5302_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
if (!Array.isArray(bank) || !bank.length) throw new Error('EPPP native item bank is empty or invalid.');
const paraProPack = JSON.parse(fs.readFileSync(PARAPRO_PACK_SOURCE, 'utf8'));
if (!paraProPack || paraProPack.id !== 'parapro-1755-practice-1' || paraProPack.batchSize !== 100 || !Array.isArray(paraProPack.items) || paraProPack.items.length !== 200) {
  throw new Error('ParaPro release pack is empty or invalid.');
}
const specialEducation5355Pack = JSON.parse(fs.readFileSync(SPECIAL_EDUCATION_5355_PACK_SOURCE, 'utf8'));
if (!specialEducation5355Pack || specialEducation5355Pack.id !== 'praxis-special-education-5355' || specialEducation5355Pack.batchSize !== 100 || !Array.isArray(specialEducation5355Pack.items) || specialEducation5355Pack.items.length !== 200) {
  throw new Error('Praxis Special Education 5355 release pack is empty or invalid.');
}
const schoolCounselor5422Pack = JSON.parse(fs.readFileSync(SCHOOL_COUNSELOR_5422_PACK_SOURCE, 'utf8'));
if (!schoolCounselor5422Pack || schoolCounselor5422Pack.id !== 'praxis-school-counselor-5422' || schoolCounselor5422Pack.batchSize !== 100 || !Array.isArray(schoolCounselor5422Pack.items) || schoolCounselor5422Pack.items.length !== 200) {
  throw new Error('Praxis School Counselor 5422 release pack is empty or invalid.');
}
const schoolPsychologist5403Pack = JSON.parse(fs.readFileSync(SCHOOL_PSYCHOLOGIST_5403_PACK_SOURCE, 'utf8'));
if (!schoolPsychologist5403Pack || schoolPsychologist5403Pack.id !== 'praxis-school-psychologist-5403' || schoolPsychologist5403Pack.batchSize !== 100 || !Array.isArray(schoolPsychologist5403Pack.items) || schoolPsychologist5403Pack.items.length !== 200) {
  throw new Error('Praxis School Psychologist 5403 release pack is empty or invalid.');
}
const speechLanguagePathology5331Pack = JSON.parse(fs.readFileSync(SPEECH_LANGUAGE_PATHOLOGY_5331_PACK_SOURCE, 'utf8'));
if (!speechLanguagePathology5331Pack || speechLanguagePathology5331Pack.id !== 'praxis-speech-language-pathology-5331' || speechLanguagePathology5331Pack.batchSize !== 100 || !Array.isArray(speechLanguagePathology5331Pack.items) || speechLanguagePathology5331Pack.items.length !== 200) {
  throw new Error('Praxis Speech-Language Pathology 5331 release pack is empty or invalid.');
}
const audiology5343Pack = JSON.parse(fs.readFileSync(AUDIOLOGY_5343_PACK_SOURCE, 'utf8'));
if (!audiology5343Pack || audiology5343Pack.id !== 'praxis-audiology-5343' || audiology5343Pack.batchSize !== 100 || !Array.isArray(audiology5343Pack.items) || audiology5343Pack.items.length !== 200) {
  throw new Error('Praxis Audiology 5343 release pack is empty or invalid.');
}
const readingSpecialist5302Pack = JSON.parse(fs.readFileSync(READING_SPECIALIST_5302_PACK_SOURCE, 'utf8'));
if (!readingSpecialist5302Pack || readingSpecialist5302Pack.id !== 'praxis-reading-specialist-5302' || readingSpecialist5302Pack.batchSize !== 100 || !Array.isArray(readingSpecialist5302Pack.items) || readingSpecialist5302Pack.items.length !== 200) {
  throw new Error('Praxis Reading Specialist 5302 release pack is empty or invalid.');
}
const bankPrelude = 'const EPPP_NATIVE_ITEMS = ' + JSON.stringify(bank) + ';\n\n'
  + 'const PARAPRO_PRACTICE_PACK = ' + JSON.stringify(paraProPack) + ';\n\n'
  + 'const SPECIAL_EDUCATION_5355_PRACTICE_PACK = ' + JSON.stringify(specialEducation5355Pack) + ';\n\n'
  + 'const SCHOOL_COUNSELOR_5422_PRACTICE_PACK = ' + JSON.stringify(schoolCounselor5422Pack) + ';\n\n'
  + 'const SCHOOL_PSYCHOLOGIST_5403_PRACTICE_PACK = ' + JSON.stringify(schoolPsychologist5403Pack) + ';\n\n'
  + 'const SPEECH_LANGUAGE_PATHOLOGY_5331_PRACTICE_PACK = ' + JSON.stringify(speechLanguagePathology5331Pack) + ';\n\n'
  + 'const AUDIOLOGY_5343_PRACTICE_PACK = ' + JSON.stringify(audiology5343Pack) + ';\n\n'
  + 'const READING_SPECIALIST_5302_PRACTICE_PACK = ' + JSON.stringify(readingSpecialist5302Pack) + ';\n\n';
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

fs.writeFileSync(OUTPUT, output, 'utf8');
fs.mkdirSync(path.dirname(DEPLOY_OUTPUT), { recursive: true });
fs.writeFileSync(DEPLOY_OUTPUT, output, 'utf8');
console.log('Built test_prep_hub_module.js (' + output.split('\n').length + ' lines)');
if (!skipEpppRefresh) {
  execSync(`node "${QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
  execSync(`node "${LEARNING_LIBRARY_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
  execSync(`node "${INVENTORY_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
  execSync(`node "${REVIEW_LEDGER_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });

  execSync(`node "${CURATION_1500_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
  fs.copyFileSync(EXPANSION_AUDIT_SOURCE, EXPANSION_AUDIT_DEPLOY);
}

