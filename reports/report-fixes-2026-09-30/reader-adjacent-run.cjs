'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), cp = require('node:child_process');
const root = process.cwd(), dir = 'reports/report-fixes-2026-09-30';
const suites = ['glossary_term_click_reaches_read_aloud', 'prepared_word_help_regressions', 'prepared_help_popup_layout', 'original_reader_listen_supports', 'reader_keyboard_a11y', 'reader_both_view_listen_scroll_width', 'reader_exact_sentence_start', 'reader_preview_focus_narration'].map(name => 'tests/' + name + '.test.js');
for (const name of ['ALLO_VIEW_CANDIDATE', 'PREPARED_HELP_SOURCE_DIR']) if (process.env[name]) throw new Error('Unexpected candidate override: ' + name);
const common = ['tests/setup.js', 'vitest.config.js', 'pure_helpers_module.js'];
const inputsBySuite = Object.fromEntries(suites.map(file => {
  const paths = new Set([file, ...common]);
  for (const [, literal] of fs.readFileSync(file, 'utf8').matchAll(/['"]([^'"\r\n]+\.(?:js|jsx|cjs|json))['"]/g)) {
    const full = path.resolve(literal.startsWith('.') ? path.dirname(file) : '.', literal);
    if (!full.startsWith(root + path.sep) || !fs.existsSync(full) || !fs.statSync(full).isFile()) continue;
    paths.add(path.relative(root, full).replaceAll('\\', '/'));
  }
  return [file, [...paths].sort()];
}));
const inputs = [...new Set([...Object.values(inputsBySuite).flat(), 'text_utility_helpers_source.jsx', 'view_simplified_source.jsx', 'text_utility_helpers_module.js', 'view_simplified_module.js', 'desktop/web-app/public/text_utility_helpers_module.js', 'desktop/web-app/public/view_simplified_module.js'])];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const before = Object.fromEntries(inputs.map(file => [file, hash(file)]));
if (before['text_utility_helpers_source.jsx'] !== '6e3295ec4a7c662347d57ed2b6996fdf676066b09c288a2e92c12a240ae925ee') throw new Error('Helper source freeze drift');
const command = ['node_modules/vitest/vitest.mjs', 'run', ...suites, '--maxWorkers=1', '--pool=threads', '--reporter=default', '--reporter=json', '--outputFile=' + dir + '/reader-adjacent-tests.json'];
const result = { started: new Date().toISOString(), command: [process.execPath, ...command], suiteInputHashes: Object.fromEntries(suites.map(file => [file, Object.fromEntries(inputsBySuite[file].map(input => [input, before[input]]))])), inputHashMethod: 'Literal on-disk inputs declared by each suite plus shared setup; source/generated reader pairs monitored separately.', monitoredInputs: before };
const run = cp.spawnSync(process.execPath, command, { cwd: root, stdio: 'inherit' });
result.exitCode = run.status; result.error = run.error?.message; result.changedInputs = inputs.filter(file => hash(file) !== before[file]); result.completed = new Date().toISOString();
result.status = run.status === 0 && !result.changedInputs.length ? 'passed' : 'failed';
fs.writeFileSync(path.join(dir, 'reader-adjacent-validation.json'), JSON.stringify(result, null, 2) + '\n');
process.exitCode = result.status === 'passed' ? 0 : 1;
console.log(JSON.stringify({ status: result.status, exitCode: result.exitCode, changedInputs: result.changedInputs, report: dir + '/reader-adjacent-validation.json' }));
