'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { SCOPES, parseAudit, runAudit, main } = require('../dev-tools/check_npm_audit.cjs');

function response(overrides = {}, status) {
  const counts = { info: 0, low: 0, moderate: 0, high: 0, critical: 0, ...overrides };
  counts.total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return { status: status ?? (counts.total ? 1 : 0), stdout: JSON.stringify({ metadata: { vulnerabilities: counts } }) };
}

test('accepts complete clean results and npm vulnerability exit status', () => {
  assert.equal(parseAudit(response()).counts.total, 0);
  assert.equal(parseAudit(response({ critical: 1 })).counts.critical, 1);
});

test('never treats unavailable, malformed, or incomplete registry results as clean', () => {
  for (const result of [
    { status: 0, stdout: '{}' },
    { status: 0, stdout: 'null' },
    { status: 0, stdout: '<html>Registry unavailable</html>' },
    { status: 0, stdout: JSON.stringify({ error: { code: 'ENOAUDIT' } }) },
    { ...response(), error: Object.assign(new Error('unavailable'), { code: 'ENOENT' }) },
    { ...response(), status: null, signal: 'SIGTERM' },
    { ...response(), status: 2 },
    response({}, 1),
    { status: 0, stdout: JSON.stringify({ metadata: { vulnerabilities: { high: 0, critical: 0 } } }) },
    response({ high: -1 }),
    response({ high: 0.5 }),
    { status: 0, stdout: response().stdout.replace('"total":0', '"total":2') },
  ]) assert.ok(parseAudit(result).error, JSON.stringify(result));
});

test('audits the lockfile without requiring node_modules or enabling lifecycle scripts', () => {
  let command;
  const result = runAudit('desktop/mcp/runtime', {
    root: '/fixture',
    exists(file) { return file.endsWith('package.json') || file.endsWith('package-lock.json'); },
    spawn(...args) { command = args; return response(); },
  });
  assert.equal(result.counts.total, 0);
  const argv = process.platform === 'win32' ? command[0].split(' ').slice(1) : command[1];
  assert.deepEqual(argv, ['audit', '--json', '--package-lock-only', '--ignore-scripts']);
  assert.equal(command[2].windowsHide, true);
  assert.ok(command[2].timeout > 0);
});

test('a missing manifest or lockfile cannot be skipped silently', () => {
  for (const missing of ['package.json', 'package-lock.json']) {
    const result = runAudit('root', {
      exists(file) { return !file.endsWith(missing); },
      spawn() { assert.fail('npm must not run without required input'); },
    });
    assert.match(result.error, /missing/);
  }
});

test('quiet mode still fails and reports an incomplete scope among clean scopes', () => {
  const output = [];
  const exit = main(['--quiet'], {
    print(line) { output.push(line); },
    audit(label) { return label === 'desktop/mcp/runtime' ? { label, error: 'network timeout' } : { label, ...parseAudit(response()) }; },
  });
  assert.equal(exit, 2);
  assert.ok(output.some((line) => line.includes('network timeout')));
  assert.ok(output.some((line) => line.includes('No clean verdict')));
  assert.ok(output.every((line) => !line.includes('Audit complete:')));
});

test('defaults cover all maintained package trees, including shipped and hosted runtimes', () => {
  const visited = [];
  assert.equal(main([], { print() {}, audit(label) { visited.push(label); return { label, ...parseAudit(response()) }; } }), 0);
  assert.deepEqual(visited, Object.keys(SCOPES));
  for (const required of ['desktop', 'desktop/mcp/runtime', 'desktop/web-app/functions', 'services/alloflow-remote-mcp', 'services/alloflow-remote-mcp/runner']) {
    assert.ok(visited.includes(required));
  }
});

test('new tracked npm lockfiles cannot silently fall outside audit coverage', () => {
  const { execFileSync } = require('node:child_process');
  const path = require('node:path');
  const root = path.resolve(__dirname, '..');
  const tracked = execFileSync('git', ['ls-files', '-z', '--', '*package-lock.json'], { cwd: root, encoding: 'utf8' })
    .split('\0').filter(Boolean).sort();
  const covered = Object.values(SCOPES).map((scope) => scope === '.' ? 'package-lock.json' : scope + '/package-lock.json').sort();
  assert.deepEqual(covered, tracked, 'Classify each new tracked lockfile in the security audit.');
});

test('thresholds, JSON output, and explicit scope selection preserve honest results', () => {
  const output = [];
  const dependencies = { print(line) { output.push(line); }, audit(label) { return { label, ...parseAudit(response({ moderate: 1 })) }; } };
  assert.equal(main(['--scope=root'], dependencies), 0);
  assert.equal(main(['--scope=root', '--include-moderate', '--json'], dependencies), 1);
  const report = JSON.parse(output.at(-1));
  assert.equal(report.complete, true);
  assert.equal(report.results.length, 1);
  assert.equal(report.blocking, 1);
  assert.equal(main(['--scope=../../outside'], dependencies), 2);
  assert.equal(main(['--unknown'], dependencies), 2);
});

test('critical results fail even when other scopes are clean', () => {
  assert.equal(main(['--quiet'], {
    print() {},
    audit(label) { return { label, ...parseAudit(response(label === 'desktop' ? { critical: 1 } : {})) }; },
  }), 1);
});

test('production-only mode is explicit; default includes development dependencies', () => {
  let args;
  const result = runAudit('root', { production: true, exists: () => true, spawn(command, values) { args = process.platform === 'win32' ? command.split(' ').slice(1) : values; return response(); } });
  assert.equal(result.counts.total, 0);
  assert.ok(args.includes('--omit=dev'));
});
