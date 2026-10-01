const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const read = file => fs.readFileSync(path.join(root, file));
const suites = [
  'source_research_phase', 'source_research_query_transport', 'source_generation_preservation',
  'source_generation_state_ownership', 'source_generation_language', 'source_citation_resilience',
  'source_body_complexity', 'content_engine_headers', 'canvas_search_citation_contract', 'ai_backend_citation_followup',
  'lumen_documents', 'lumen_documents_ui', 'own_sources_import', 'own_sources_duplicates_selection',
  'own_sources_read_recovery', 'own_sources_mutation_recovery', 'own_source_controls_load_timing',
  'own_source_lesson_controls', 'own_source_library_recovery_controls', 'own_source_workspace_settings',
  'own_source_sidebar_prop_chain', 'own_source_toggle_ui', 'own_source_grounding', 'own_source_documents_only',
  'own_source_rag_and_citation_tokens', 'own_source_evidence_inspector', 'own_source_ai_permission',
  'own_source_citation_cache', 'document_citation_adaptation', 'document_citation_renderer_transform',
  'leveled_text_citation_resilience', 'citation_repair_conservation', 'rigor_regeneration_citation_guard',
  'external_search_privacy', 'worker_search_proxy',
].map(name => `tests/${name}.test.js`);
const inputs = [...suites, 'content_engine_source.jsx', 'content_engine_module.js', 'view_misc_panels_source.jsx',
  'view_misc_panels_module.js', 'own_sources_module.js', 'ai_backend_module.js', 'gemini_api_module.js',
  'stem_lab/stem_lumen_documents.js', 'stem_lab/stem_lumen_evidence.js', 'text_pipeline_helpers_module.js',
  'generate_dispatcher_module.js', 'view_simplified_module.js'];
const before = Object.fromEntries(inputs.map(file => [file, hash(read(file))]));
const log = fs.openSync(path.join(__dirname, 'tests.log'), 'w');
const result = cp.spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', ...suites, '--maxWorkers=1',
  '--reporter=json', '--outputFile=' + path.join(__dirname, 'tests.json'), '--silent'], { cwd: root, stdio: ['ignore', log, log] });
fs.closeSync(log);
const changed = inputs.filter(file => hash(read(file)) !== before[file]);
const report = JSON.parse(fs.readFileSync(path.join(__dirname, 'tests.json'), 'utf8'));
const summary = { suites: report.testResults.length, passed: report.numPassedTests, failed: report.numFailedTests,
  changedDuringTests: changed, inputHashes: before, failedTests: report.testResults.flatMap(suite => suite.assertionResults.filter(test => test.status === 'failed').map(test => ({ file: suite.name, name: test.fullName }))) };
fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ ...summary, inputHashes: undefined }));
process.exitCode = result.status || (changed.length ? 1 : 0);
