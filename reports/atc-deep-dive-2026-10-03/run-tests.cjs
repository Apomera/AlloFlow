const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../');
const temp = path.join(root, '.tmp/atc-tests');
fs.mkdirSync(temp, { recursive: true });
const requested = process.argv.slice(2);
const files = requested.length ? requested : [
  'tests/atctower_a11y.test.js', 'tests/atctower_tabs_a11y.test.js',
  'tests/atctower_form_controls_a11y.test.js', 'tests/atctower_inquiry_pedagogy.test.js',
  'tests/stem_atctower_dialog_a11y.test.js', 'tests/atctower_math_learning.test.js',
  'tests/atctower_simulation.test.js', 'tests/atctower_lesson_requests.test.js',
  'tests/atctower_sequencing.test.js', 'tests/atctower_recovery.test.js',
  'tests/atctower_practice.test.js', 'tests/atctower_command_safety.test.js',
  'tests/atctower_priority.test.js', 'tests/atctower_math_integrity.test.js',
  'tests/atctower_pathway.test.js', 'tests/atctower_radar_labels.test.js',
  'tests/atctower_decision_support.test.js', 'tests/atctower_review_continuity.test.js',
  'tests/atctower_operational_clarity.test.js', 'tests/atctower_practice_flow.test.js',
  'tests/atctower_arrival_board.test.js', 'tests/atctower_lesson_explorer.test.js',
  'tests/atctower_ops_investigation.test.js', 'tests/atctower_flight_paths.test.js',
  'tests/atctower_motion_exploration.test.js'
];
const pool = process.env.ATC_TEST_POOL === 'forks' ? 'forks' : 'threads';
const result = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', ...files, '--pool=' + pool, '--maxWorkers=1', '--fileParallelism=false', '--no-isolate', '--testTimeout=30000'], {
  cwd: root, stdio: 'inherit', env: { ...process.env, TEMP: temp, TMP: temp }
});
if (result.error) throw result.error;
process.exitCode = result.status == null ? 1 : result.status;
