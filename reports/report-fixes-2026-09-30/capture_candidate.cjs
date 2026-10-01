'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const mode = process.argv[2];
if (!['baseline', 'candidate'].includes(mode)) throw new Error('Use baseline or candidate');
const files = [
  'AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx',
  'view_simplified_source.jsx', 'text_utility_helpers_source.jsx', 'generate_dispatcher_source.jsx',
  'generation_helpers_source.jsx', 'tts_source.jsx', 'audio_helpers_source.jsx',
  'read_aloud_audio_service_source.jsx', 'read_aloud_artifact_audio_source.jsx',
  'gemini_api_source.jsx', 'guided_mode_config_source.jsx', 'host_handlers_source.jsx',
  'error_reporter_module.js', 'tts-server/edge_tts_server.py', 'tts-server/piper_server.py',
  'docker/edge-tts-server/server.py', 'reflective_journal.md', 'AGENT_HANDOFF.md',
  'view_simplified_module.js', 'text_utility_helpers_module.js', 'generate_dispatcher_module.js',
  'generation_helpers_module.js', 'tts_module.js', 'audio_helpers_module.js',
  'read_aloud_audio_service_module.js', 'read_aloud_artifact_audio_module.js',
  'gemini_api_module.js', 'guided_mode_config_module.js', 'host_handlers_module.js',
  'view_kokoro_offer_modal_source.jsx', 'view_kokoro_offer_modal_module.js',
  'reader_place_store.js', 'reader_support_drafts.js', 'tests/test_local_tts_origin_policy.py',
  'allo_device_storage_module.js', 'storage_bridge.html', 'allo_recovery_vault_integration_module.js',
  'view_canvas_recovery_dialog_source.jsx', 'view_canvas_recovery_dialog_module.js',
  'utils_pure_source.jsx', 'utils_pure_module.js', 'ui_strings.js',
  'personas_source.jsx', 'personas_module.js', '_build_personas_module.js', '_build_simple_iife_module.js',
  'session_transport_module.js', 'tests/session_transport.test.js',
  'word_sounds_core.js', 'word_sounds_setup_source.jsx', 'word_sounds_setup_module.js', 'word_sounds_module.js',
  '_build_word_sounds_setup_module.js', 'dev-tools/sync_word_sounds_core.cjs',
  'tests/helpers/word_sounds_core.js', 'tests/helpers/word_sounds_pack_fixture.js', 'tests/helpers/word_sounds_harness.js',
  'tests/gemini_auth_debounce.test.js', 'tests/gemini_error_taxonomy_contract.test.js',
  'tests/tts_pipeline_source_resilience.test.js', 'tests/reader_exact_sentence_start.test.js',
  'tests/test_edge_tts_language_review.py', 'tests/setup.js', 'vitest.config.js',
  '_build_text_utility_helpers_module.js', '_build_view_simplified_module.js',
  '_build_generate_dispatcher_module.js', '_build_generation_helpers_module.js',
  '_build_gemini_api_module.js', '_build_guided_mode_config_module.js',
  '_build_tts_module.js', '_build_view_kokoro_offer_modal_module.js',
  '_build_first_wave_view_modules.js', '_build_utils_pure_module.js',
  'desktop/web-app/public/error_reporter_module.js', '.github/workflows/verify.yml', 'deploy.sh',
];
for (const file of fs.readdirSync(path.join(root, 'tests')).filter(file => /^report_(audio|compact_audio|error|flow|generation|interview|reader|storage|url|word_sounds)/.test(file))) files.push('tests/' + file);
for (const [report, field] of [
  ['reader-browser-results.json', 'inputHashes'], ['reader-adjacent-validation.json', 'monitoredInputs'],
  ['reader-verification.json', 'candidateHashes'], ['generation-validation-summary.json', 'hashesAfter'],
  ['audio-verification.json', 'sourceHashes'], ['storage-diagnosis.json', 'inputHashes'],
  ['interview-built-verification.json', 'inputHashes'], ['compact-audio-final-validation.json', 'inputHashes'],
  ['word-sounds-built-validation.json', 'inputHashes'],
]) {
  if (!fs.existsSync(path.join(__dirname, report))) continue;
  const record = JSON.parse(fs.readFileSync(path.join(__dirname, report), 'utf8'));
  for (const file of Object.keys(record[field] || {})) if (!files.includes(file)) files.push(file);
}
for (const file of files.filter(file => file.endsWith('_module.js') && !file.startsWith('desktop/') && !file.startsWith('_build_'))) {
  const mirror = 'desktop/web-app/public/' + file;
  if (!files.includes(mirror)) files.push(mirror);
}
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const git = args => execFileSync('git', ['--no-optional-locks', ...args], { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
const startHead = git(['rev-parse', 'HEAD']);
const snapshot = {};
for (const file of files) {
  try { const bytes = fs.readFileSync(path.join(root, file)); snapshot[file] = { bytes: bytes.length, sha256: hash(bytes) }; }
  catch (error) { snapshot[file] = { error: error.code }; }
}
const status = git(['status', '--porcelain=v1']);
const rows = status ? status.split('\n') : [];
const result = { at: new Date().toISOString(), scope: 'report-fix working files, not a clean repository or deployment',
  startHead, endHead: git(['rev-parse', 'HEAD']), originMain: git(['rev-parse', 'origin/main']),
  ahead: Number(git(['rev-list', '--count', 'origin/main..HEAD'])), dirtyPaths: rows.length,
  trackedChangedPaths: rows.filter(row => !row.startsWith('??')).length,
  untrackedPaths: rows.filter(row => row.startsWith('??')).length, files: snapshot };
result.changedDuringCheck = files.filter(file => {
  if (!snapshot[file]?.sha256) return false;
  try { return hash(fs.readFileSync(path.join(root, file))) !== snapshot[file].sha256; }
  catch (_) { return true; }
});
result.stableDuringCheck = result.startHead === result.endHead && result.changedDuringCheck.length === 0;
fs.writeFileSync(path.join(__dirname, mode + '.json'), JSON.stringify(result, null, 2) + '\n');
if (mode === 'baseline') {
  const backup = path.join(__dirname, 'baseline-root-owned');
  fs.mkdirSync(backup, { recursive: true });
  for (const file of ['AlloFlowANTI.txt', 'host_handlers_source.jsx', 'error_reporter_module.js']) {
    if (!fs.existsSync(path.join(backup, file))) fs.copyFileSync(path.join(root, file), path.join(backup, file));
  }
}
console.log(JSON.stringify({ mode, startHead: result.startHead, endHead: result.endHead, ahead: result.ahead,
  dirtyPaths: result.dirtyPaths, trackedChangedPaths: result.trackedChangedPaths, untrackedPaths: result.untrackedPaths }));
