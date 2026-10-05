import { defineConfig } from 'vitest/config';
export default defineConfig({ test: {
  environment: 'jsdom', setupFiles: ['./tests/setup.js'], pool: 'threads', maxWorkers: 1,
  testTimeout: 15000, hookTimeout: 15000,
  include: [
    'reports/classroom-reliability-followup-2026-10-03/student-response-v2-lifecycle.test.js',
    'reports/classroom-reliability-followup-2026-10-03/resource_receiver_lifecycle.test.js',
    'reports/classroom-reliability-followup-2026-10-03/recovery_media_intent.test.js',
    'reports/classroom-reliability-followup-2026-10-03/recovery_draft_schema.test.js',
    'tests/classroom_host_audio_integration.test.js', 'tests/classroom_history_save_policy.test.js',
    'tests/history_reload_rehydrate.test.js', 'tests/report_storage_mixed_recovery.test.js',
    'tests/utils_pure_storage.test.js', 'tests/device_storage_bridge.test.js',
    'tests/device_storage_bridge_security.test.js', 'tests/allo_device_storage_a11y.test.js',
    'tests/storage_recovery_manager.test.js', 'tests/storage_recovery_vault_app.test.js',
    'tests/storage_security_integration_contract.test.js',
    'tests/mailbox_image_delivery.test.js', 'tests/class_mailbox.test.js',
    'tests/mailbox_session_bridge.test.js', 'tests/session_transport.test.js',
  ],
} });
