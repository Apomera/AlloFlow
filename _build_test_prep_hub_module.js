#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'test_prep_hub_source.jsx');
const BANK_SOURCE = path.join(ROOT, 'test_prep', 'eppp_native_items.json');
const EPPP_2027_PREVIEW_PACK_SOURCE = path.join(ROOT, 'test_prep', 'eppp_2027_preview_pack.json');
const REFERENCE_CATALOG_SOURCE = path.join(ROOT, 'test_prep', 'reference_catalog.json');
const PARAPRO_PACK_SOURCE = path.join(ROOT, 'test_prep', 'parapro_pack.json');
const SPECIAL_EDUCATION_5355_PACK_SOURCE = path.join(ROOT, 'test_prep', 'special_education_5355_pack.json');
const SCHOOL_COUNSELOR_5422_PACK_SOURCE = path.join(ROOT, 'test_prep', 'school_counselor_5422_pack.json');
const SCHOOL_PSYCHOLOGIST_5403_PACK_SOURCE = path.join(ROOT, 'test_prep', 'school_psychologist_5403_pack.json');
const SPEECH_LANGUAGE_PATHOLOGY_5331_PACK_SOURCE = path.join(ROOT, 'test_prep', 'speech_language_pathology_5331_pack.json');
const AUDIOLOGY_5343_PACK_SOURCE = path.join(ROOT, 'test_prep', 'audiology_5343_pack.json');
const READING_SPECIALIST_5302_PACK_SOURCE = path.join(ROOT, 'test_prep', 'reading_specialist_5302_pack.json');
const EDUCATIONAL_LEADERSHIP_5412_PACK_SOURCE = path.join(ROOT, 'test_prep', 'educational_leadership_5412_pack.json');
const PLT_K6_5622_PACK_SOURCE = path.join(ROOT, 'test_prep', 'plt_k6_5622_pack.json');
const PRAXIS_CORE_5752_PACK_SOURCE = path.join(ROOT, 'test_prep', 'praxis_core_5752_pack.json');
const ESOL_5362_PACK_SOURCE = path.join(ROOT, 'test_prep', 'esol_5362_pack.json');
const TEACHING_READING_5205_PACK_SOURCE = path.join(ROOT, 'test_prep', 'teaching_reading_5205_pack.json');
const EARLY_CHILDHOOD_5025_PACK_SOURCE = path.join(ROOT, 'test_prep', 'early_childhood_5025_pack.json');
const PLT_EARLY_CHILDHOOD_5621_PACK_SOURCE = path.join(ROOT, 'test_prep', 'plt_early_childhood_5621_pack.json');
const SPECIAL_EDUCATION_EARLY_CHILDHOOD_5692_PACK_SOURCE = path.join(ROOT, 'test_prep', 'special_education_early_childhood_5692_pack.json');
const SPECIAL_EDUCATION_SEVERE_PROFOUND_5547_PACK_SOURCE = path.join(ROOT, 'test_prep', 'special_education_severe_profound_5547_pack.json');
const SPECIAL_EDUCATION_LEARNING_DISABILITIES_5383_PACK_SOURCE = path.join(ROOT, 'test_prep', 'special_education_learning_disabilities_5383_pack.json');
const SPECIAL_EDUCATION_BEHAVIOR_EMOTIONAL_5372_PACK_SOURCE = path.join(ROOT, 'test_prep', 'special_education_behavior_emotional_5372_pack.json');
const SPECIAL_EDUCATION_INTELLECTUAL_DISABILITIES_5322_PACK_SOURCE = path.join(ROOT, 'test_prep', 'special_education_intellectual_disabilities_5322_pack.json');
const PLT_5_9_5623_PACK_SOURCE = path.join(ROOT, 'test_prep', 'plt_5_9_5623_pack.json');
const PLT_7_12_5624_PACK_SOURCE = path.join(ROOT, 'test_prep', 'plt_7_12_5624_pack.json');
const SCHOOL_LIBRARIAN_5312_PACK_SOURCE = path.join(ROOT, 'test_prep', 'school_librarian_5312_pack.json');
const OUTPUT = path.join(ROOT, 'test_prep_hub_module.js');
const DEPLOY_OUTPUT = path.join(ROOT, 'desktop/web-app', 'public', 'test_prep_hub_module.js');
const TMP = path.join(ROOT, '_tmp_test_prep_hub_entry.jsx');
const COMPILED = TMP + '.compiled.js';
const QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_eppp_native_pack.cjs');
const INVENTORY_SCRIPT = path.join(ROOT, 'dev-tools', 'inventory_eppp_learning_content.cjs');
const LEARNING_LIBRARY_SCRIPT = path.join(ROOT, 'dev-tools', 'build_eppp_learning_library.cjs');
const DIAGRAM_QUALITY_WAVE_01_SCRIPT = path.join(ROOT, 'dev-tools', 'repair_eppp_diagram_quality_wave_01.cjs');
const DIAGRAM_QUALITY_WAVE_02_SCRIPT = path.join(ROOT, 'dev-tools', 'repair_eppp_diagram_quality_wave_02.cjs');
const DIAGRAM_QUALITY_WAVE_03_SCRIPT = path.join(ROOT, 'dev-tools', 'repair_eppp_diagram_quality_wave_03.cjs');
const REVIEW_LEDGER_SCRIPT = path.join(ROOT, 'dev-tools', 'build_eppp_review_ledger.cjs');
const NEXT_REVIEW_DOCKET_SCRIPT = path.join(ROOT, 'dev-tools', 'build_eppp_next_review_docket.cjs');
const CURATION_500_SCRIPT = path.join(ROOT, 'dev-tools', 'build_eppp_500_curation_manifest.cjs');
const CURATION_1000_SCRIPT = path.join(ROOT, 'dev-tools', 'build_eppp_1000_curation_manifest.cjs');
const EPPP_1500_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_eppp_1500_expansion.cjs');
const EPPP_2027_PREVIEW_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_eppp_2027_preview.cjs');
const EPPP_2027_PREVIEW_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_eppp_2027_preview.cjs');
const CURATION_1500_SCRIPT = path.join(ROOT, 'dev-tools', 'build_eppp_1500_curation_manifest.cjs');
const EXPANSION_AUDIT_SOURCE = path.join(ROOT, 'test_prep', 'eppp_native_expansion_1500_audit.json');
const EXPANSION_AUDIT_DEPLOY = path.join(ROOT, 'desktop/web-app', 'public', 'test_prep', 'eppp_native_expansion_1500_audit.json');
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
const EDUCATIONAL_LEADERSHIP_5412_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_educational_leadership_5412_pack.cjs');
const EDUCATIONAL_LEADERSHIP_5412_LIBRARY_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_educational_leadership_5412_learning_library.cjs');
const EDUCATIONAL_LEADERSHIP_5412_LIBRARY_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_educational_leadership_5412_learning_library.cjs');
const EDUCATIONAL_LEADERSHIP_5412_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_educational_leadership_5412_pack.cjs');
const PLT_K6_5622_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_plt_k6_5622_pack.cjs');
const PLT_K6_5622_LIBRARY_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_plt_k6_5622_learning_library.cjs');
const PLT_K6_5622_LIBRARY_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_plt_k6_5622_learning_library.cjs');
const PLT_K6_5622_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_plt_k6_5622_pack.cjs');
const PRAXIS_CORE_5752_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_praxis_core_5752_pack.cjs');
const PRAXIS_CORE_5752_LIBRARY_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_praxis_core_5752_learning_library.cjs');
const PRAXIS_CORE_5752_LIBRARY_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_praxis_core_5752_learning_library.cjs');
const PRAXIS_CORE_5752_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_praxis_core_5752_pack.cjs');
const ESOL_5362_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_esol_5362_pack.cjs');
const ESOL_5362_LIBRARY_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_esol_5362_learning_library.cjs');
const ESOL_5362_LIBRARY_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_esol_5362_learning_library.cjs');
const ESOL_5362_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_esol_5362_pack.cjs');
const TEACHING_READING_5205_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_teaching_reading_5205_pack.cjs');
const TEACHING_READING_5205_LIBRARY_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_teaching_reading_5205_learning_library.cjs');
const TEACHING_READING_5205_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_teaching_reading_5205.cjs');
const EARLY_CHILDHOOD_5025_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_early_childhood_5025_pack.cjs');
const EARLY_CHILDHOOD_5025_LIBRARY_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_early_childhood_5025_learning_library.cjs');
const EARLY_CHILDHOOD_5025_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_early_childhood_5025.cjs');
const PLT_EARLY_CHILDHOOD_5621_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_plt_early_childhood_5621_pack.cjs');
const PLT_EARLY_CHILDHOOD_5621_LIBRARY_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_plt_early_childhood_5621_learning_library.cjs');
const PLT_EARLY_CHILDHOOD_5621_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_plt_early_childhood_5621.cjs');
const SPECIAL_EDUCATION_EARLY_CHILDHOOD_5692_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_special_education_early_childhood_5692_pack.cjs');
const SPECIAL_EDUCATION_EARLY_CHILDHOOD_5692_LIBRARY_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_special_education_early_childhood_5692_learning_library.cjs');
const SPECIAL_EDUCATION_EARLY_CHILDHOOD_5692_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_special_education_early_childhood_5692.cjs');
const SPECIAL_EDUCATION_SEVERE_PROFOUND_5547_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_special_education_severe_profound_5547_pack.cjs');
const SPECIAL_EDUCATION_SEVERE_PROFOUND_5547_LIBRARY_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_special_education_severe_profound_5547_learning_library.cjs');
const SPECIAL_EDUCATION_SEVERE_PROFOUND_5547_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_special_education_severe_profound_5547.cjs');
const SPECIAL_EDUCATION_LEARNING_DISABILITIES_5383_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_special_education_learning_disabilities_5383_pack.cjs');
const SPECIAL_EDUCATION_LEARNING_DISABILITIES_5383_LIBRARY_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_special_education_learning_disabilities_5383_learning_library.cjs');
const SPECIAL_EDUCATION_LEARNING_DISABILITIES_5383_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_special_education_learning_disabilities_5383.cjs');
const SPECIAL_EDUCATION_BEHAVIOR_EMOTIONAL_5372_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_special_education_behavior_emotional_5372_pack.cjs');
const SPECIAL_EDUCATION_BEHAVIOR_EMOTIONAL_5372_LIBRARY_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_special_education_behavior_emotional_5372_learning_library.cjs');
const SPECIAL_EDUCATION_BEHAVIOR_EMOTIONAL_5372_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_special_education_behavior_emotional_5372.cjs');
const SPECIAL_EDUCATION_INTELLECTUAL_DISABILITIES_5322_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_special_education_intellectual_disabilities_5322_pack.cjs');
const SPECIAL_EDUCATION_INTELLECTUAL_DISABILITIES_5322_LIBRARY_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_special_education_intellectual_disabilities_5322_learning_library.cjs');
const SPECIAL_EDUCATION_INTELLECTUAL_DISABILITIES_5322_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_special_education_intellectual_disabilities_5322.cjs');
const PLT_5_9_5623_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_plt_5_9_5623_pack.cjs');
const PLT_5_9_5623_LIBRARY_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_plt_5_9_5623_learning_library.cjs');
const PLT_5_9_5623_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_plt_5_9_5623.cjs');
const PLT_7_12_5624_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_plt_7_12_5624_pack.cjs');
const PLT_7_12_5624_LIBRARY_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_plt_7_12_5624_learning_library.cjs');
const PLT_7_12_5624_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_plt_7_12_5624.cjs');
const SCHOOL_LIBRARIAN_5312_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_school_librarian_5312_pack.cjs');
const SCHOOL_LIBRARIAN_5312_LIBRARY_BUILD_SCRIPT = path.join(ROOT, 'dev-tools', 'build_school_librarian_5312_learning_library.cjs');
const SCHOOL_LIBRARIAN_5312_QA_SCRIPT = path.join(ROOT, 'dev-tools', 'qa_school_librarian_5312.cjs');
const PREPARE_TEST_PREP_PACKS_SCRIPT = path.join(ROOT, 'dev-tools', 'prepare_test_prep_packs_for_legacy_build.cjs');
const APPLY_TEST_PREP_SOURCE_REVIEW_CORRECTIONS_SCRIPT = path.join(ROOT, 'dev-tools', 'apply_test_prep_source_review_corrections.cjs');
const WRITE_TEST_PREP_ASSISTANT_REVIEW_SCRIPT = path.join(ROOT, 'dev-tools', 'write_test_prep_assistant_review.cjs');
const VERIFY_TEST_PREP_ASSISTANT_REVIEW_SCRIPT = path.join(ROOT, 'dev-tools', 'verify_test_prep_assistant_review.cjs');
const EXPAND_TEST_PREP_PACKS_SCRIPT = path.join(ROOT, 'dev-tools', 'expand_test_prep_packs_to_500.cjs');
const skipEpppRefresh = process.argv.includes('--skip-eppp-refresh');

if (!fs.existsSync(SOURCE)) {
  console.error('Source not found:', SOURCE);
  process.exit(1);
}
execSync(`node "${PREPARE_TEST_PREP_PACKS_SCRIPT}" --allow-legacy-collapse`, { cwd: ROOT, stdio: 'inherit' });
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
execSync(`node "${EPPP_2027_PREVIEW_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${EPPP_2027_PREVIEW_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
const bank = JSON.parse(fs.readFileSync(BANK_SOURCE, 'utf8'));
const eppp2027PreviewPack = JSON.parse(fs.readFileSync(EPPP_2027_PREVIEW_PACK_SOURCE, 'utf8'));
if (!eppp2027PreviewPack || eppp2027PreviewPack.id !== 'eppp-integrated-2027-preview' || eppp2027PreviewPack.status !== 'preview' || eppp2027PreviewPack.items?.length !== 20) throw new Error('Integrated EPPP 2027 preview pack is invalid.');
const referenceCatalog = JSON.parse(fs.readFileSync(REFERENCE_CATALOG_SOURCE, 'utf8'));
execSync(`node "${AUDIOLOGY_5343_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${AUDIOLOGY_5343_LIBRARY_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${AUDIOLOGY_5343_LIBRARY_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${AUDIOLOGY_5343_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${READING_SPECIALIST_5302_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${READING_SPECIALIST_5302_LIBRARY_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${READING_SPECIALIST_5302_LIBRARY_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${READING_SPECIALIST_5302_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${EDUCATIONAL_LEADERSHIP_5412_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${EDUCATIONAL_LEADERSHIP_5412_LIBRARY_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${EDUCATIONAL_LEADERSHIP_5412_LIBRARY_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${EDUCATIONAL_LEADERSHIP_5412_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${PLT_K6_5622_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${PLT_K6_5622_LIBRARY_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${PLT_K6_5622_LIBRARY_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${PLT_K6_5622_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${PRAXIS_CORE_5752_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${PRAXIS_CORE_5752_LIBRARY_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${PRAXIS_CORE_5752_LIBRARY_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${PRAXIS_CORE_5752_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${ESOL_5362_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${ESOL_5362_LIBRARY_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${ESOL_5362_LIBRARY_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${ESOL_5362_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${TEACHING_READING_5205_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${TEACHING_READING_5205_LIBRARY_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${TEACHING_READING_5205_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${EARLY_CHILDHOOD_5025_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${EARLY_CHILDHOOD_5025_LIBRARY_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${EARLY_CHILDHOOD_5025_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${PLT_EARLY_CHILDHOOD_5621_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${PLT_EARLY_CHILDHOOD_5621_LIBRARY_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${PLT_EARLY_CHILDHOOD_5621_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SPECIAL_EDUCATION_EARLY_CHILDHOOD_5692_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SPECIAL_EDUCATION_EARLY_CHILDHOOD_5692_LIBRARY_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SPECIAL_EDUCATION_EARLY_CHILDHOOD_5692_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SPECIAL_EDUCATION_SEVERE_PROFOUND_5547_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SPECIAL_EDUCATION_SEVERE_PROFOUND_5547_LIBRARY_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SPECIAL_EDUCATION_SEVERE_PROFOUND_5547_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SPECIAL_EDUCATION_LEARNING_DISABILITIES_5383_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SPECIAL_EDUCATION_LEARNING_DISABILITIES_5383_LIBRARY_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SPECIAL_EDUCATION_LEARNING_DISABILITIES_5383_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SPECIAL_EDUCATION_BEHAVIOR_EMOTIONAL_5372_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SPECIAL_EDUCATION_BEHAVIOR_EMOTIONAL_5372_LIBRARY_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SPECIAL_EDUCATION_BEHAVIOR_EMOTIONAL_5372_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SPECIAL_EDUCATION_INTELLECTUAL_DISABILITIES_5322_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SPECIAL_EDUCATION_INTELLECTUAL_DISABILITIES_5322_LIBRARY_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SPECIAL_EDUCATION_INTELLECTUAL_DISABILITIES_5322_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${PLT_5_9_5623_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${PLT_5_9_5623_LIBRARY_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${PLT_5_9_5623_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${PLT_7_12_5624_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${PLT_7_12_5624_LIBRARY_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${PLT_7_12_5624_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SCHOOL_LIBRARIAN_5312_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SCHOOL_LIBRARIAN_5312_LIBRARY_BUILD_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${SCHOOL_LIBRARIAN_5312_QA_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${APPLY_TEST_PREP_SOURCE_REVIEW_CORRECTIONS_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${EXPAND_TEST_PREP_PACKS_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${WRITE_TEST_PREP_ASSISTANT_REVIEW_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
execSync(`node "${VERIFY_TEST_PREP_ASSISTANT_REVIEW_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
if (!Array.isArray(bank) || !bank.length) throw new Error('EPPP native item bank is empty or invalid.');
const paraProPack = JSON.parse(fs.readFileSync(PARAPRO_PACK_SOURCE, 'utf8'));
if (!paraProPack || paraProPack.id !== 'parapro-1755-practice-1' || paraProPack.batchSize !== 100 || !Array.isArray(paraProPack.items) || paraProPack.items.length !== 500) {
  throw new Error('ParaPro release pack is empty or invalid.');
}
const specialEducation5355Pack = JSON.parse(fs.readFileSync(SPECIAL_EDUCATION_5355_PACK_SOURCE, 'utf8'));
if (!specialEducation5355Pack || specialEducation5355Pack.id !== 'praxis-special-education-5355' || specialEducation5355Pack.batchSize !== 100 || !Array.isArray(specialEducation5355Pack.items) || specialEducation5355Pack.items.length !== 500) {
  throw new Error('Praxis Special Education 5355 release pack is empty or invalid.');
}
const schoolCounselor5422Pack = JSON.parse(fs.readFileSync(SCHOOL_COUNSELOR_5422_PACK_SOURCE, 'utf8'));
if (!schoolCounselor5422Pack || schoolCounselor5422Pack.id !== 'praxis-school-counselor-5422' || schoolCounselor5422Pack.batchSize !== 100 || !Array.isArray(schoolCounselor5422Pack.items) || schoolCounselor5422Pack.items.length !== 500) {
  throw new Error('Praxis School Counselor 5422 release pack is empty or invalid.');
}
const schoolPsychologist5403Pack = JSON.parse(fs.readFileSync(SCHOOL_PSYCHOLOGIST_5403_PACK_SOURCE, 'utf8'));
if (!schoolPsychologist5403Pack || schoolPsychologist5403Pack.id !== 'praxis-school-psychologist-5403' || schoolPsychologist5403Pack.batchSize !== 100 || !Array.isArray(schoolPsychologist5403Pack.items) || schoolPsychologist5403Pack.items.length !== 500) {
  throw new Error('Praxis School Psychologist 5403 release pack is empty or invalid.');
}
const speechLanguagePathology5331Pack = JSON.parse(fs.readFileSync(SPEECH_LANGUAGE_PATHOLOGY_5331_PACK_SOURCE, 'utf8'));
if (!speechLanguagePathology5331Pack || speechLanguagePathology5331Pack.id !== 'praxis-speech-language-pathology-5331' || speechLanguagePathology5331Pack.batchSize !== 100 || !Array.isArray(speechLanguagePathology5331Pack.items) || speechLanguagePathology5331Pack.items.length !== 500) {
  throw new Error('Praxis Speech-Language Pathology 5331 release pack is empty or invalid.');
}
const audiology5343Pack = JSON.parse(fs.readFileSync(AUDIOLOGY_5343_PACK_SOURCE, 'utf8'));
if (!audiology5343Pack || audiology5343Pack.id !== 'praxis-audiology-5343' || audiology5343Pack.batchSize !== 100 || !Array.isArray(audiology5343Pack.items) || audiology5343Pack.items.length !== 500) {
  throw new Error('Praxis Audiology 5343 release pack is empty or invalid.');
}
const readingSpecialist5302Pack = JSON.parse(fs.readFileSync(READING_SPECIALIST_5302_PACK_SOURCE, 'utf8'));
if (!readingSpecialist5302Pack || readingSpecialist5302Pack.id !== 'praxis-reading-specialist-5302' || readingSpecialist5302Pack.batchSize !== 100 || !Array.isArray(readingSpecialist5302Pack.items) || readingSpecialist5302Pack.items.length !== 500) {
  throw new Error('Praxis Reading Specialist 5302 release pack is empty or invalid.');
}
const educationalLeadership5412Pack = JSON.parse(fs.readFileSync(EDUCATIONAL_LEADERSHIP_5412_PACK_SOURCE, 'utf8'));
if (!educationalLeadership5412Pack || educationalLeadership5412Pack.id !== 'praxis-educational-leadership-5412' || educationalLeadership5412Pack.batchSize !== 100 || !Array.isArray(educationalLeadership5412Pack.items) || educationalLeadership5412Pack.items.length !== 500) {
  throw new Error('Praxis Educational Leadership 5412 release pack is empty or invalid.');
}
const pltK65622Pack = JSON.parse(fs.readFileSync(PLT_K6_5622_PACK_SOURCE, 'utf8'));
if (!pltK65622Pack || pltK65622Pack.id !== 'praxis-plt-k6-5622' || pltK65622Pack.batchSize !== 100 || !Array.isArray(pltK65622Pack.items) || pltK65622Pack.items.length !== 500) {
  throw new Error('Praxis PLT K?6 5622 release pack is empty or invalid.');
}
const praxisCore5752Pack = JSON.parse(fs.readFileSync(PRAXIS_CORE_5752_PACK_SOURCE, 'utf8'));
if (!praxisCore5752Pack || praxisCore5752Pack.id !== 'praxis-core-5752' || praxisCore5752Pack.batchSize !== 100 || !Array.isArray(praxisCore5752Pack.items) || praxisCore5752Pack.items.length !== 500) {
  throw new Error('Praxis Core 5752 release pack is empty or invalid.');
}
const esol5362Pack = JSON.parse(fs.readFileSync(ESOL_5362_PACK_SOURCE, 'utf8'));
if (!esol5362Pack || esol5362Pack.id !== 'praxis-esol-5362' || esol5362Pack.batchSize !== 100 || !Array.isArray(esol5362Pack.items) || esol5362Pack.items.length !== 500) {
  throw new Error('Praxis ESOL 5362 release pack is empty or invalid.');
}
const teachingReading5205Pack = JSON.parse(fs.readFileSync(TEACHING_READING_5205_PACK_SOURCE, 'utf8'));
if (!teachingReading5205Pack || teachingReading5205Pack.id !== 'praxis-teaching-reading-5205' || teachingReading5205Pack.batchSize !== 100 || teachingReading5205Pack.items?.length !== 500) throw new Error('Teaching Reading 5205 release pack is invalid.');
const earlyChildhood5025Pack=JSON.parse(fs.readFileSync(EARLY_CHILDHOOD_5025_PACK_SOURCE,'utf8'));
if(earlyChildhood5025Pack.items?.length!==500) throw new Error('Early Childhood 5025 pack invalid.');
const pltEarlyChildhood5621Pack=JSON.parse(fs.readFileSync(PLT_EARLY_CHILDHOOD_5621_PACK_SOURCE,'utf8'));if(pltEarlyChildhood5621Pack.items?.length!==500)throw Error('PLT Early Childhood 5621 pack invalid');
const specialEducationEarlyChildhood5692Pack=JSON.parse(fs.readFileSync(SPECIAL_EDUCATION_EARLY_CHILDHOOD_5692_PACK_SOURCE,'utf8'));if(specialEducationEarlyChildhood5692Pack.id!=='praxis-special-education-early-childhood-5692'||specialEducationEarlyChildhood5692Pack.items?.length!==500)throw Error('Special Education EC/EI 5692 pack invalid');
const specialEducationSevereProfound5547Pack=JSON.parse(fs.readFileSync(SPECIAL_EDUCATION_SEVERE_PROFOUND_5547_PACK_SOURCE,'utf8'));if(specialEducationSevereProfound5547Pack.id!=='praxis-special-education-severe-profound-5547'||specialEducationSevereProfound5547Pack.items?.length!==500)throw Error('Special Education Severe to Profound 5547 pack invalid');
const specialEducationLearningDisabilities5383Pack=JSON.parse(fs.readFileSync(SPECIAL_EDUCATION_LEARNING_DISABILITIES_5383_PACK_SOURCE,'utf8'));if(specialEducationLearningDisabilities5383Pack.id!=='praxis-special-education-learning-disabilities-5383'||specialEducationLearningDisabilities5383Pack.items?.length!==500)throw Error('Learning Disabilities 5383 pack invalid');
const specialEducationBehaviorEmotional5372Pack=JSON.parse(fs.readFileSync(SPECIAL_EDUCATION_BEHAVIOR_EMOTIONAL_5372_PACK_SOURCE,'utf8'));if(specialEducationBehaviorEmotional5372Pack.id!=='praxis-special-education-behavior-emotional-5372'||specialEducationBehaviorEmotional5372Pack.items?.length!==500)throw Error('EBD 5372 pack invalid');
const specialEducationIntellectualDisabilities5322Pack=JSON.parse(fs.readFileSync(SPECIAL_EDUCATION_INTELLECTUAL_DISABILITIES_5322_PACK_SOURCE,'utf8'));if(specialEducationIntellectualDisabilities5322Pack.id!=='praxis-special-education-intellectual-disabilities-5322'||specialEducationIntellectualDisabilities5322Pack.items?.length!==500)throw Error('Intellectual Disabilities 5322 pack invalid');
const plt595623Pack=JSON.parse(fs.readFileSync(PLT_5_9_5623_PACK_SOURCE,'utf8'));if(plt595623Pack.id!=='praxis-plt-grades-5-9-5623'||plt595623Pack.items?.length!==500)throw Error('PLT Grades 5–9 5623 pack invalid');
const plt7125624Pack=JSON.parse(fs.readFileSync(PLT_7_12_5624_PACK_SOURCE,'utf8'));if(plt7125624Pack.id!=='praxis-plt-grades-7-12-5624'||plt7125624Pack.items?.length!==500)throw Error('PLT Grades 7–12 5624 pack invalid');
const schoolLibrarian5312Pack=JSON.parse(fs.readFileSync(SCHOOL_LIBRARIAN_5312_PACK_SOURCE,'utf8'));if(schoolLibrarian5312Pack.id!=='praxis-school-librarian-5312'||schoolLibrarian5312Pack.items?.length!==500)throw Error('School Librarian 5312 pack invalid');
const bankPrelude = 'const TEST_PREP_REFERENCE_CATALOG = ' + JSON.stringify(referenceCatalog) + ';\n\n'
  + 'const EPPP_NATIVE_ITEMS = ' + JSON.stringify(bank) + ';\n\n'
  + 'const EPPP_INTEGRATED_2027_PREVIEW_PACK = ' + JSON.stringify(eppp2027PreviewPack) + ';\n\n'
  + 'const PARAPRO_PRACTICE_PACK = ' + JSON.stringify(paraProPack) + ';\n\n'
  + 'const SPECIAL_EDUCATION_5355_PRACTICE_PACK = ' + JSON.stringify(specialEducation5355Pack) + ';\n\n'
  + 'const SCHOOL_COUNSELOR_5422_PRACTICE_PACK = ' + JSON.stringify(schoolCounselor5422Pack) + ';\n\n'
  + 'const SCHOOL_PSYCHOLOGIST_5403_PRACTICE_PACK = ' + JSON.stringify(schoolPsychologist5403Pack) + ';\n\n'
  + 'const SPEECH_LANGUAGE_PATHOLOGY_5331_PRACTICE_PACK = ' + JSON.stringify(speechLanguagePathology5331Pack) + ';\n\n'
  + 'const AUDIOLOGY_5343_PRACTICE_PACK = ' + JSON.stringify(audiology5343Pack) + ';\n\n'
  + 'const READING_SPECIALIST_5302_PRACTICE_PACK = ' + JSON.stringify(readingSpecialist5302Pack) + ';\n\n'
  + 'const EDUCATIONAL_LEADERSHIP_5412_PRACTICE_PACK = ' + JSON.stringify(educationalLeadership5412Pack) + ';\n\n'
  + 'const PLT_K6_5622_PRACTICE_PACK = ' + JSON.stringify(pltK65622Pack) + ';\n\n'
  + 'const PRAXIS_CORE_5752_PRACTICE_PACK = ' + JSON.stringify(praxisCore5752Pack) + ';\n\n'
  + 'const ESOL_5362_PRACTICE_PACK = ' + JSON.stringify(esol5362Pack) + ';\n\n'
  + 'const TEACHING_READING_5205_PRACTICE_PACK = ' + JSON.stringify(teachingReading5205Pack) + ';\n\n'
  + 'const EARLY_CHILDHOOD_5025_PRACTICE_PACK = ' + JSON.stringify(earlyChildhood5025Pack) + ';\n\n'
  + 'const PLT_EARLY_CHILDHOOD_5621_PRACTICE_PACK = ' + JSON.stringify(pltEarlyChildhood5621Pack) + ';\n\n'
  + 'const SPECIAL_EDUCATION_EARLY_CHILDHOOD_5692_PRACTICE_PACK = ' + JSON.stringify(specialEducationEarlyChildhood5692Pack) + ';\n\n'
  + 'const SPECIAL_EDUCATION_SEVERE_PROFOUND_5547_PRACTICE_PACK = ' + JSON.stringify(specialEducationSevereProfound5547Pack) + ';\n\n'
  + 'const SPECIAL_EDUCATION_LEARNING_DISABILITIES_5383_PRACTICE_PACK = ' + JSON.stringify(specialEducationLearningDisabilities5383Pack) + ';\n\n'
  + 'const SPECIAL_EDUCATION_BEHAVIOR_EMOTIONAL_5372_PRACTICE_PACK = ' + JSON.stringify(specialEducationBehaviorEmotional5372Pack) + ';\n\n'
  + 'const SPECIAL_EDUCATION_INTELLECTUAL_DISABILITIES_5322_PRACTICE_PACK = ' + JSON.stringify(specialEducationIntellectualDisabilities5322Pack) + ';\n\n'
  + 'const PLT_5_9_5623_PRACTICE_PACK = ' + JSON.stringify(plt595623Pack) + ';\n\n'
  + 'const PLT_7_12_5624_PRACTICE_PACK = ' + JSON.stringify(plt7125624Pack) + ';\n\n'
  + 'const SCHOOL_LIBRARIAN_5312_PRACTICE_PACK = ' + JSON.stringify(schoolLibrarian5312Pack) + ';\n\n';
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
    buildReviewSet: testPrepBuildReviewSet,
    buildTargetedSet: testPrepBuildTargetedSet,
    buildCustomQuiz: testPrepBuildCustomQuiz,
    searchPack: testPrepSearchPack,
    normalizeFlashcardSchedule: normalizeTestPrepFlashcardSchedule,
    rateFlashcard: testPrepRateFlashcard,
    buildFlashcardQueue: testPrepBuildFlashcardQueue,
    normalizeAnnotations: normalizeTestPrepAnnotations,
    upsertAnnotation: testPrepUpsertAnnotation,
    deleteAnnotation: testPrepDeleteAnnotation,
    normalizeStudyPlans: normalizeTestPrepStudyPlans,
    studyPlanForPack: testPrepStudyPlanForPack,
    buildStudyPlanStatus: testPrepBuildStudyPlanStatus,
    exportProgress: testPrepExportProgress,
    importProgress: testPrepImportProgress,
    normalizeReviewItems: normalizeTestPrepReviewItems,
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
  execSync(`node "${DIAGRAM_QUALITY_WAVE_01_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
  execSync(`node "${DIAGRAM_QUALITY_WAVE_02_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
  execSync(`node "${DIAGRAM_QUALITY_WAVE_03_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
  execSync(`node "${LEARNING_LIBRARY_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
  execSync(`node "${INVENTORY_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
  execSync(`node "${REVIEW_LEDGER_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
  execSync(`node "${NEXT_REVIEW_DOCKET_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });

  execSync(`node "${CURATION_1500_SCRIPT}"`, { cwd: ROOT, stdio: 'inherit' });
  fs.copyFileSync(EXPANSION_AUDIT_SOURCE, EXPANSION_AUDIT_DEPLOY);
}

