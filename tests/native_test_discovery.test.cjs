const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { NATIVE_TESTS, EXTERNAL_TESTS, discoverNativeTests, run } = require('../dev-tools/run_native_tests.cjs');
const root = path.resolve(__dirname, '..');
const log = { log() {}, error() {} };
const io = files => ({ readdirSync: () => files });

test('native manifest discovers the CI gap and MCP security suites and keeps emulators separate', () => {
  const files = discoverNativeTests();
  for (const file of ['blueprint_module_preflight', 'catalog_import_completion', 'lesson_deep_link_host', 'project_response_restore',
    'mcp_ace_browser_security', 'mcp_artifact_source_bytes', 'mcp_bundle_audit_security']) {
    assert.ok(files.includes('tests/' + file + '.test.cjs'), file);
  }
  assert.equal(new Set(files).size, files.length);
  assert.ok(EXTERNAL_TESTS.every(file => !files.includes('tests/' + file)));
});

test('discovery fails closed for a missing suite or an unclassified cjs suite', () => {
  for (const file of NATIVE_TESTS) {
    assert.throws(() => discoverNativeTests(root, io(NATIVE_TESTS.filter(value => value !== file))), /manifest drift/);
  }
  assert.throws(() => discoverNativeTests(root, io([...NATIVE_TESTS, 'new_regression.test.cjs'])), /unclassified.*new_regression/);
  assert.deepEqual(discoverNativeTests(root, io([...NATIVE_TESTS, ...EXTERNAL_TESTS, 'ordinary.test.js'])), NATIVE_TESTS.map(file => 'tests/' + file));
});

test('runner invokes Node directly with explicit paths and propagates failure', () => {
  let call;
  const spawn = (...args) => { call = args; return { status: 0 }; };
  assert.equal(run([], { spawn, log }), 0);
  assert.equal(call[0], process.execPath);
  assert.deepEqual(call[1], ['--test', ...discoverNativeTests()]);
  assert.equal(call[2].shell, false);
  assert.equal(call[2].cwd, root);
  assert.equal(run([], { spawn: () => ({ status: 1 }), log }), 1);
  assert.equal(run([], { spawn: () => ({ status: null, signal: 'SIGTERM' }), log }), 1);
  assert.equal(run([], { spawn: () => ({ error: new Error('launch failed') }), log }), 2);
  assert.equal(run([], { io: io([]), spawn: () => assert.fail('must not launch an incomplete manifest'), log }), 2);
});

test('list and selftest modes do not accidentally launch the full verification suite', () => {
  assert.equal(run(['--list'], { spawn: () => assert.fail('list must not execute tests'), log }), 0);
  assert.equal(run(['--selftest'], { spawn: (_exec, args) => {
    assert.deepEqual(args, ['--test', 'tests/native_test_discovery.test.cjs']);
    return { status: 0 };
  }, log }), 0);
});

test('npm, blocking CI, and full verification retain the native runner entry points', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['test:native'], 'node dev-tools/run_native_tests.cjs');
  for (const script of ['test', 'test:coverage']) assert.ok(pkg.scripts[script].startsWith('npm run test:native && '), script);
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/verify.yml'), 'utf8');
  const nativeJob = workflow.slice(workflow.indexOf('\n  native-unit:'), workflow.indexOf('\n  unit:'));
  assert.match(nativeJob, /run: npm run test:native/);
  assert.doesNotMatch(nativeJob, /continue-on-error:\s*true/);
  const verify = fs.readFileSync(path.join(root, 'dev-tools/verify_all.cjs'), 'utf8');
  assert.match(verify, /cmd: \['node', 'dev-tools\/run_native_tests.cjs', '--quiet'\]/);
});
