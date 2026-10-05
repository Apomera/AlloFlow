import { defineConfig } from 'vitest/config';
export default defineConfig({ test: {
  environment: 'jsdom', setupFiles: ['./tests/setup.js'], pool: 'threads', maxWorkers: 1,
  testTimeout: 30000, hookTimeout: 30000,
  include: [
    'reports/classroom-reliability-next-2026-10-03/pending-resource-removal.test.js',
    'reports/classroom-reliability-next-2026-10-03/word-sounds-recovery.test.js',
    'reports/classroom-reliability-next-2026-10-03/studio-submission-readiness.test.js',
    'reports/classroom-reliability-next-2026-10-03/resource-receiver-current.test.js',
    'reports/classroom-reliability-followup-2026-10-03/student-response-v2-lifecycle.test.js',
    'tests/student_assignment_restore_readiness.test.js',
    'tests/learning_web_resource_readiness.test.js',
    'tests/host_handlers_wave3_extraction.test.js',
    'tests/class_mailbox.test.js', 'tests/mailbox_image_delivery.test.js',
    'tests/session_transport.test.js', 'tests/classroom_host_audio_integration.test.js',
    'tests/report_storage_mixed_recovery.test.js', 'tests/storage_recovery_vault_app.test.js',
    'tests/storage_recovery_manager.test.js', 'tests/classroom_history_save_policy.test.js',
    'tests/history_reload_rehydrate.test.js', 'tests/student_entry_recovery_race.test.js',
  ],
} });
