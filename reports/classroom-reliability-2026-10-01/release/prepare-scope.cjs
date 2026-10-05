const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const { INPUTS, OUTPUTS } = require(path.join(root, 'dev-tools/lib/reader_compiler.cjs'));
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const modules = ['utils_pure_module.js', 'memory_aid_module.js', 'applied_challenge_module.js', 'studio_response_module.js', 'resource_read_aloud_module.js', 'karaoke_audio_store_module.js', 'read_aloud_audio_service_module.js', 'live_aac_module.js', 'shared_activity_module.js', 'session_transport_module.js'];
const pairs = modules.map(file => [file, 'desktop/web-app/public/' + file]);
const inputs = [...new Set([
  ...hosts, ...INPUTS, ...OUTPUTS, ...pairs.flat(),
  'utils_pure_source.jsx', 'read_aloud_audio_service_source.jsx', 'allo_device_storage_module.js', 'storage_bridge.html',
  'host_handlers_source.jsx',
  'allo_crypto_module.js', 'allo_device_vault_module.js',
  'stem_lab/stem_tool_evolab.js', 'desktop/web-app/public/stem_lab/stem_tool_evolab.js',
  'tests/helpers/stem_widgets_smoke_harness.js',
  'tests/evolab_living_island.test.js', 'tests/evolab_cohort_explorer.test.js',
  'tests/evolab_population_comparison.test.js', 'tests/evolab_habitat_trail.test.js',
  'reports/classroom-reliability-2026-10-01/evolution/evolab_reveal_integrity.test.js',
  'reports/classroom-reliability-2026-10-01/evolution/vitest.config.js',
  'allo_recovery_vault_integration_module.js', 'firestore_sync_module.js', 'instructional_context_module.js', 'ui_strings.js',
  '_build_simple_iife_module.js', '_build_view_simplified_module.js', 'dev-tools/lib/reader_compiler.cjs', 'dev-tools/check_reader_release.cjs',
  'dev-tools/studio_delivery_e2e.cjs', 'vitest.config.js', 'tests/setup.js',
  'package.json', 'package-lock.json', 'desktop/web-app/package.json', 'desktop/web-app/package-lock.json',
  'desktop/web-app/src/index.css', 'desktop/web-app/tailwind.config.js',
  'tests/report_storage_validation.vitest.config.js', 'tests/storage_adapter_bootstrap_readiness.test.js',
  'reports/classroom-reliability-2026-10-01/release/candidate_receipt.cjs',
  'reports/classroom-reliability-2026-10-01/release/candidate_receipt.test.cjs',
  'reports/classroom-reliability-2026-10-01/release/candidate-scope.json',
  'tests/classroom_host_audio_integration.test.js', 'tests/classroom_history_save_policy.test.js',
  'tests/read_aloud_retention_resume.test.js', 'tests/read_aloud_support_inventory_resume.test.js',
  'tests/report_storage_ack_recovery.test.js', 'tests/report_storage_mixed_recovery.test.js', 'tests/utils_pure_storage.test.js', 'tests/history_reload_rehydrate.test.js',
  'reports/classroom-reliability-2026-10-01/accessibility/acceptance.cjs',
  'reports/classroom-reliability-2026-10-01/accessibility/bridge-acceptance.cjs',
])].sort();
for (const file of inputs) if (!fs.existsSync(path.join(root, file))) throw Error('Missing input: ' + file);
const spec = { schemaVersion: 1, scope: 'classroom-history-audio-and-synthetic-delivery', inputs, parityPairs: [...pairs, ...(OUTPUTS.length === 2 ? [[OUTPUTS[0], OUTPUTS[1]]] : []), ['stem_lab/stem_tool_evolab.js', 'desktop/web-app/public/stem_lab/stem_tool_evolab.js'], ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt'], ['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']] };
fs.writeFileSync(path.join(__dirname, 'candidate-scope.json'), JSON.stringify(spec, null, 2) + '\n');
console.log(`Prepared exact selected scope: ${inputs.length} inputs, ${spec.parityPairs.length} mirror pairs.`);
