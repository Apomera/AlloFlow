import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '..');
const HARNESS = join(ROOT, 'mcp-testing', 'tools', 'mcp_call.cjs');
const SERVER = join(ROOT, 'tests', 'fixtures', 'mcp_echo_server.cjs');

describe('mcp_call CLI option parsing', () => {
  it('does not treat the --timeout value as an arguments file', () => {
    const output = execFileSync(process.execPath, [
      HARNESS, 'call', SERVER, 'echo', '--timeout', '5000',
    ], { cwd: ROOT, encoding: 'utf8' });

    expect(JSON.parse(output)).toEqual({});
  });

  it('allows flags before an actual arguments file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'alloflow-mcp-call-'));
    const argsFile = join(dir, 'args.json');
    writeFileSync(argsFile, JSON.stringify({ value: 42 }));

    const output = execFileSync(process.execPath, [
      HARNESS, 'call', SERVER, 'echo', '--timeout=5000', argsFile,
    ], { cwd: ROOT, encoding: 'utf8' });

    expect(JSON.parse(output)).toEqual({ value: 42 });
  });

  it('rejects missing and non-integer timeout values before launching a server', () => {
    for (const args of [
      [HARNESS, 'call', SERVER, 'echo', '--timeout'],
      [HARNESS, 'call', SERVER, 'echo', '--timeout', 'soon'],
    ]) {
      const result = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' });
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/timeout/i);
    }
  });
});
