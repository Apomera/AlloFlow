import { afterEach, beforeEach, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { CHECKS, NATIVE_SUITES, SUITES, VITEST, run } = require('../dev-tools/verify_mcp_security.cjs');
let root;
let messages;
let log;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-security-runner-'));
  messages = [];
  log = { log: text => messages.push(text), error: text => messages.push(text) };
  for (const file of [...CHECKS.map(check => check[0]), ...NATIVE_SUITES, ...SUITES, VITEST]) {
    const absolute = path.join(root, file);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, '// Verification fixture\n');
  }
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

it('runs local checks before tests, isolates temporary files and does not inherit user MCP configuration', () => {
  const env = { PATH: process.env.PATH, TEMP: '/original', TMPDIR: '/original',
    ALLOFLOW_MCP_MANIFEST_PATH: '/private-manifest', alloflow_mcp_data_dir: '/private-data',
    ALLOFLOW_DESKTOP_HOME: '/private-home', SANITIZE_ANTI: '/different-source' };
  const original = { ...env }, calls = [];
  let temporary;
  expect(run([], { root, env, log, spawn: (executable, args, options) => {
    calls.push(args);
    expect(executable).toBe(process.execPath);
    expect(options).toMatchObject({ cwd: fs.realpathSync(root), shell: false, windowsHide: true });
    expect(options.env.PATH).toBe(env.PATH);
    expect(Object.keys(options.env).some(key => /^(ALLOFLOW_|SANITIZE_ANTI)/i.test(key))).toBe(false);
    temporary = options.env.TEMP;
    expect(options.env.TMP).toBe(temporary);
    expect(options.env.TMPDIR).toBe(temporary);
    expect(path.relative(fs.realpathSync(root), temporary).startsWith('tmp' + path.sep)).toBe(true);
    expect(fs.existsSync(temporary)).toBe(true);
    return { status: 0 };
  } })).toBe(0);
  expect(calls.slice(0, CHECKS.length)).toEqual(CHECKS);
  expect(calls[CHECKS.length]).toEqual(['--test', ...NATIVE_SUITES]);
  expect(calls.at(-1).slice(0, 2)).toEqual([VITEST, 'run']);
  expect(calls.at(-1)).toContain('--maxWorkers=1');
  expect(calls.at(-1)).toContain('--no-cache');
  expect(calls.at(-1)).toContain('tests/mcp_http_transport.test.js');
  expect(calls.at(-1)).toContain('tests/mcp_illustrated_pack.test.js');
  expect(env).toEqual(original);
  expect(fs.existsSync(temporary)).toBe(false);
  expect(messages.at(-1)).toContain('All checks passed');
});

it('stops at policy or mirror drift and propagates the failing exit code', () => {
  for (const failingIndex of [0, 1]) {
    let calls = 0;
    expect(run([], { root, log, spawn: () => ({ status: calls++ === failingIndex ? 7 : 0 }) })).toBe(7);
    expect(calls).toBe(failingIndex + 1);
  }
  expect(messages.some(message => message.includes('All checks passed'))).toBe(false);
});

it('propagates test failure and treats a signalled child or launch error as failure', () => {
  for (const failedTestStage of [0, 1]) for (const [result, expected] of [[{ status: 9 }, 9], [{ status: null, signal: 'SIGTERM' }, 1],
    [{ error: new Error('Fixture launch error') }, 2]]) {
    let calls = 0;
    expect(run([], { root, log, spawn: () => ++calls <= CHECKS.length + failedTestStage ? { status: 0 } : result })).toBe(expected);
    expect(calls).toBe(CHECKS.length + failedTestStage + 1);
    expect(fs.readdirSync(path.join(root, 'tmp', 'mcp-security'))).toEqual([]);
  }
  expect(messages.some(message => message.includes('All checks passed'))).toBe(false);
});

it('requires installed local dependencies and the complete suite manifest without downloading or skipping files', () => {
  let calls = 0;
  const spawn = () => { calls++; return { status: 0 }; };
  fs.unlinkSync(path.join(root, VITEST));
  expect(run([], { root, log, spawn })).toBe(2);
  expect(messages.at(-1)).toContain('Local Vitest is missing');
  fs.writeFileSync(path.join(root, VITEST), '// Fixture');
  fs.unlinkSync(path.join(root, SUITES[0]));
  expect(run([], { root, log, spawn })).toBe(2);
  expect(messages.at(-1)).toContain('Required verification file is missing');
  expect(calls).toBe(0);
});

it('lists the fixed suite manifest without running commands and rejects options that could weaken the gate', () => {
  const spawn = () => { throw new Error('Should not execute'); };
  expect(run(['--list'], { root, log, spawn })).toBe(0);
  expect(messages[0]).toContain('tests/mcp_agent_security.test.js');
  expect(messages[0]).toContain('tests/mcp_configuration_security.test.js');
  expect(run(['--passWithNoTests'], { root, log, spawn })).toBe(2);
  expect(run(['--exclude', 'tests/mcp_agent_security.test.js'], { root, log, spawn })).toBe(2);
});
