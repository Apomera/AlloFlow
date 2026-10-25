'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { scanText, scanSources, report, SOURCE_DIRS } = require('../dev-tools/check_secrets.cjs');

// Construct synthetic values in pieces so the regression suite cannot itself
// be mistaken for a committed credential. No live credentials are used.
const fineToken = () => 'github_' + 'pat_' + 'A'.repeat(22) + '_' + 'B'.repeat(59);
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-secret-scan-'));
  t.after(() => {
    const absolute = path.resolve(root);
    assert.ok(absolute.startsWith(path.resolve(os.tmpdir()) + path.sep));
    assert.ok(path.basename(absolute).startsWith('alloflow-secret-scan-'));
    fs.rmSync(absolute, { recursive: true, force: true });
  });
  for (const dir of SOURCE_DIRS) fs.mkdirSync(path.join(root, dir), { recursive: true });
  fs.writeFileSync(path.join(root, 'AlloFlowANTI.txt'), '// clean canonical host\n');
  const put = (file, source) => {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, source);
  };
  return { root, put };
}

test('detects fine-grained and classic PATs even when critical values contain old allowlist words', () => {
  const values = [fineToken(), 'gh' + 'p_' + 'mockexample' + 'A'.repeat(25),
    'AI' + 'za' + 'mockexample' + 'B'.repeat(24)];
  const findings = scanText(values.join('\n'), 'src/keys.js');
  assert.equal(findings.filter(finding => finding.severity === 'critical').length, 3);
  assert.deepEqual(findings.filter(finding => finding.severity === 'critical').map(finding => finding.line), [3, 2, 1]);
  assert.ok(findings.some(finding => finding.pattern === 'GitHub fine-grained Personal Access Token'));
  for (const value of values) assert.ok(!JSON.stringify(findings).includes(value));
});

test('detects encrypted private-key markers without exposing key contents', () => {
  const marker = '-----BEGIN ' + 'ENCRYPTED PRIVATE KEY-----';
  assert.equal(scanText(marker, 'services/api/src/sign.js')[0].pattern, 'Private key block');
});

test('masks only validated generated geography rows and still detects credentials outside them', () => {
  const encodedRow = 'AK' + 'IA' + 'A'.repeat(16);
  const data = { format: 'skyschool-elevation-row-delta-v1', grids: [{ width: 1, height: 1, rows: [encodedRow] }],
    apiKey: fineToken() };
  const source = '// generated data\n  var FLIGHT_ELEVATION_DATA = ' + JSON.stringify(data) + ';\n// ' + fineToken();
  const file = 'stem_lab/stem_data_skyschool_geo.js';
  const findings = scanText(source, file);
  assert.equal(findings.filter(finding => finding.pattern === 'AWS Access Key ID').length, 0);
  assert.deepEqual(findings.filter(finding => finding.severity === 'critical').map(finding => finding.line), [2, 3]);
  assert.equal(scanText(source, 'src/untrusted.js').filter(finding => finding.pattern === 'AWS Access Key ID').length, 1);
  assert.equal(scanText(source.replace('row-delta-v1', 'unknown-format'), file)
    .filter(finding => finding.pattern === 'AWS Access Key ID').length, 1);
  assert.equal(scanText(source.replace('"height":1', '"height":2'), file)
    .filter(finding => finding.pattern === 'AWS Access Key ID').length, 1);
});

test('scans nested first-party services/catalog/tools and deduplicates canonical source', t => {
  const { root, put } = fixture(t);
  const files = ['src/data/nested.js', 'catalog/cloudflare-worker/src/routes.ts',
    'catalog/bug-digest-worker/src/index.js', 'services/api/src/nested/handler.py',
    'stem_lab/kitchen_studio/tools.js', 'sel_hub/activities/nested.js',
    'desktop/web-app/functions/routes/nested.js'];
  for (const file of files) put(file, '// ' + fineToken());
  const result = scanSources({ root });
  assert.equal(result.exitCode, 1);
  assert.equal(result.scannedFiles, files.length + 1);
  assert.deepEqual(result.critical.map(finding => finding.file).sort(), files.sort());
  assert.deepEqual(result.omissions, []);
});

test('never reads private credentials, vendored/build/test/temp output or arbitrary root trees', t => {
  const { root, put } = fixture(t);
  const excluded = ['.env', 'private.key', 'src/.env.production', 'src/.private/credentials.js',
    'services/api/node_modules/dependency.js', 'services/api/vendor/code.js',
    'services/api/dist/server.js', 'services/api/build/server.js', 'services/api/tmp/server.js',
    'services/api/reports/server.js', 'services/api/tests/token.js', 'services/api/test/token.js',
    'src/handler.test.js', 'src/handler.spec.ts', 'reports/secrets.js', 'artifacts/output.js',
    'tmp/secret.js', 'desktop/web-app/build/output.js'];
  for (const file of excluded) put(file, fineToken());
  const fileSystem = { ...fs, readFileSync(file, ...args) {
    assert.equal(path.relative(root, file).replace(/\\/g, '/'), 'AlloFlowANTI.txt');
    return fs.readFileSync(file, ...args);
  } };
  const result = scanSources({ root, fileSystem });
  assert.equal(result.exitCode, 0);
  assert.equal(result.scannedFiles, 1);
  assert.deepEqual(result.findings, []);
});

test('directory enumeration failure cannot report a clean scan', t => {
  const { root } = fixture(t);
  const fileSystem = { ...fs, readdirSync(dir, ...args) {
    if (dir === path.join(root, 'services')) throw new Error('synthetic inaccessible directory');
    return fs.readdirSync(dir, ...args);
  } };
  const result = scanSources({ root, fileSystem });
  assert.equal(result.exitCode, 2);
  assert.deepEqual(result.omissions, [{ file: 'services', reason: 'directory enumeration failed' }]);
});

test('missing, unreadable and oversized selected sources make coverage incomplete', t => {
  const { root, put } = fixture(t);
  put('src/unreadable.js', '// source');
  put('src/oversized.js', ' '.repeat(80));
  fs.unlinkSync(path.join(root, 'AlloFlowANTI.txt'));
  const fileSystem = { ...fs, readFileSync(file, ...args) {
    if (file === path.join(root, 'src/unreadable.js')) throw new Error(fineToken());
    return fs.readFileSync(file, ...args);
  } };
  const result = scanSources({ root, fileSystem, maxFileBytes: 64 });
  assert.equal(result.exitCode, 2);
  assert.deepEqual(result.omissions.map(item => item.file).sort(), ['AlloFlowANTI.txt', 'src/oversized.js', 'src/unreadable.js']);
  assert.ok(!JSON.stringify(result).includes(fineToken()));
});

test('refuses source-directory symlinks without reading their targets', t => {
  const { root } = fixture(t);
  const fileSystem = { ...fs, lstatSync(file, ...args) {
    if (file === path.join(root, 'services')) return { isDirectory: () => true, isSymbolicLink: () => true };
    return fs.lstatSync(file, ...args);
  }, readdirSync(dir, ...args) {
    assert.notEqual(dir, path.join(root, 'services'));
    return fs.readdirSync(dir, ...args);
  } };
  const result = scanSources({ root, fileSystem });
  assert.equal(result.exitCode, 2);
  assert.equal(result.omissions[0].reason, 'source directory is not a regular directory');
});

test('quiet/verbose reporting redacts credentials completely and surfaces incomplete coverage', () => {
  const token = fineToken();
  const critical = scanText(token, 'services/api/src/index.js');
  const result = { scannedFiles: 1, critical, warnings: [],
    omissions: [{ file: 'src/missing.js', reason: 'source metadata/read failed' }] };
  for (const verbose of [false, true]) {
    const output = [];
    report(result, { quiet: true, verbose, write: line => output.push(line) });
    assert.ok(output.some(line => line.includes('CRITICAL')));
    assert.ok(output.some(line => line.includes('INCOMPLETE')));
    assert.ok(!output.join('\n').includes(token));
    assert.ok(!output.join('\n').includes(token.slice(0, 12)));
  }
});

test('CLI preserves quiet/verbose modes and distinguishes critical from incomplete failures', t => {
  const { root, put } = fixture(t);
  const script = path.join(root, 'dev-tools/check_secrets.cjs');
  fs.mkdirSync(path.dirname(script), { recursive: true });
  fs.copyFileSync(path.resolve(__dirname, '../dev-tools/check_secrets.cjs'), script);
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  assert.equal(run('--quiet').status, 0);
  put('src/credential.js', fineToken());
  const critical = run('--quiet', '--verbose');
  assert.equal(critical.status, 1);
  assert.ok(critical.stdout.includes('GitHub fine-grained'));
  assert.ok(!critical.stdout.includes(fineToken()));
  fs.unlinkSync(path.join(root, 'AlloFlowANTI.txt'));
  const incomplete = run('--quiet');
  assert.equal(incomplete.status, 2);
  assert.ok(incomplete.stdout.includes('INCOMPLETE AlloFlowANTI.txt'));
  assert.equal(run('--unknown-option').status, 2);
});
