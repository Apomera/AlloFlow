#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');

// These suites use node:test, not Vitest. Keep emulator tests on their own lane.
const NATIVE_TESTS = Object.freeze([
  'blueprint_module_preflight.test.cjs',
  'catalog_import_completion.test.cjs',
  'lesson_deep_link_host.test.cjs',
  'mcp_ace_browser_security.test.cjs',
  'mcp_artifact_source_bytes.test.cjs',
  'mcp_bundle_audit_security.test.cjs',
  'module_load_diagnostics.test.cjs',
  'module_wait_deadline.test.cjs',
  'native_test_discovery.test.cjs',
  'npm_audit_reporting.test.cjs',
  'project_response_restore.test.cjs',
]);
const EXTERNAL_TESTS = Object.freeze([
  'firebase_mailbox_image_rules.test.cjs',
  'firebase_rules_security.test.cjs',
]);

function discoverNativeTests(root = ROOT, io = fs) {
  const files = io.readdirSync(path.join(root, 'tests'));
  const missing = NATIVE_TESTS.filter(file => !files.includes(file));
  const unknown = files.filter(file => file.endsWith('.test.cjs')
    && !NATIVE_TESTS.includes(file) && !EXTERNAL_TESTS.includes(file));
  if (missing.length || unknown.length) {
    throw new Error('Native test manifest drift: missing [' + missing.join(', ')
      + '], unclassified [' + unknown.join(', ') + ']');
  }
  return NATIVE_TESTS.map(file => 'tests/' + file);
}

function run(args = [], { root = ROOT, io = fs, spawn = spawnSync, log = console } = {}) {
  try {
    if (args.some(arg => !['--list', '--quiet', '--selftest'].includes(arg))) {
      throw new Error('Usage: node dev-tools/run_native_tests.cjs [--list | --selftest] [--quiet]');
    }
    const files = discoverNativeTests(root, io);
    if (args.includes('--list')) { log.log(files.join('\n')); return 0; }
    const selected = args.includes('--selftest') ? ['tests/native_test_discovery.test.cjs'] : files;
    const quiet = args.includes('--quiet');
    const result = spawn(process.execPath, ['--test', ...selected], {
      cwd: root, shell: false, stdio: quiet ? 'pipe' : 'inherit',
      encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      if (quiet) log.error((result.stdout || '') + (result.stderr || ''));
      log.error('[native-tests] failed' + (result.signal ? ' (' + result.signal + ')' : ''));
      return result.status || 1;
    }
    if (quiet) log.log('[native-tests] ' + selected.length + ' suites passed.');
    return 0;
  } catch (error) {
    log.error('[native-tests] ' + error.message);
    return 2;
  }
}

module.exports = { NATIVE_TESTS, EXTERNAL_TESTS, discoverNativeTests, run };
if (require.main === module) process.exitCode = run(process.argv.slice(2));
