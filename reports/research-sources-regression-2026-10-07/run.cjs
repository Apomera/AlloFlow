const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const tests = [
  'source_research_phase',
  'source_research_local_bridge',
  'source_research_review',
  'source_research_query_transport',
  'source_research_review_ui',
  'source_research_settings_ui',
  'own_source_controls_load_timing',
  'own_source_citation_cache',
  'own_source_ai_permission',
  'own_sources_read_recovery',
  'own_sources_mutation_recovery',
  'own_sources_import',
  'own_sources_duplicates_selection',
  'own_source_workspace_settings',
  'own_source_toggle_ui',
  'own_source_sidebar_prop_chain',
  'own_source_rag_and_citation_tokens',
  'own_source_library_recovery_controls',
  'own_source_lesson_controls',
  'own_source_grounding',
  'own_source_evidence_inspector',
  'own_source_documents_only',
  'external_search_privacy',
  'worker_search_proxy',
  'canvas_search_worker_contract',
  'canvas_search_citation_contract',
  'source_generation_state_ownership',
  'source_generation_preservation',
  'source_generation_language',
  'source_body_complexity',
  'source_remediation_contract',
  'source_citation_resilience',
  'leveled_text_citation_resilience',
  'document_citation_adaptation',
  'rigor_regeneration_citation_guard',
  'citation_repair_conservation',
  'ai_backend_citation_followup',
  'gemini_api_build_determinism',
  'gemini_auth_debounce',
  'gemini_error_taxonomy_contract',
  'search_query_contract',
  'maine_sld_state_search_policy',
  'lumen_source_fetch_proxy',
].map(name => 'tests/' + name + '.test.js');
const resultFile = path.join(__dirname, 'results.json');
const started = Date.now();
const run = spawnSync(process.execPath, [
  'node_modules/vitest/vitest.mjs', 'run', ...tests,
  '--maxWorkers=1', '--pool=threads', '--hookTimeout=120000', '--testTimeout=60000', '--reporter=json', '--outputFile=' + resultFile,
], { cwd: root, stdio: 'inherit', timeout: 900000 });
let result;
try {
  if (fs.statSync(resultFile).mtimeMs >= started) result = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
} catch (_) {}
const summary = {
  startedAt: new Date(started).toISOString(),
  elapsedSeconds: Math.round((Date.now() - started) / 1000),
  exitCode: run.status,
  runnerError: run.error ? run.error.message : null,
  files: tests,
  passed: result?.numPassedTests ?? 0,
  failed: result?.numFailedTests ?? 0,
  pending: result?.numPendingTests ?? 0,
  success: run.status === 0 && result?.success === true,
  suiteErrors: (result?.testResults || []).filter(file => file.status === 'failed' && file.message)
    .map(file => ({ file: path.relative(root, file.name), message: file.message })),
  failures: (result?.testResults || []).flatMap(file => file.assertionResults
    .filter(test => test.status === 'failed')
    .map(test => ({ file: path.relative(root, file.name), name: test.fullName, messages: test.failureMessages }))),
};
fs.writeFileSync(path.join(__dirname, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ files: tests.length, passed: summary.passed, failed: summary.failed, pending: summary.pending, exitCode: summary.exitCode }));
process.exitCode = run.status ?? 1;
