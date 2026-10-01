import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { runFixtureProcess } = require('../dev-tools/fixture_subprocess.cjs');
const { PORTABLE_EXPORT_TIMEOUT_MS, FIXTURE_SUITE_TIMEOUT_MS } = require('../dev-tools/build_document_at_fixture_suite.cjs');
const alive = pid => { try { process.kill(pid, 0); return true; } catch (error) { if (error.code === 'ESRCH') return false; throw error; } };
const stopOwned = pid => {
  if (!alive(pid)) return;
  if (process.platform === 'win32') spawnSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore', timeout: 5000 });
  else process.kill(pid, 'SIGKILL');
};

describe('fixture subprocess reliability', () => {
  it('keeps both output streams and UTF-8 on success', async () => {
    const result = await runFixtureProcess(process.execPath, ['-e', "process.stdout.write('Café ☀'); process.stderr.write('render diagnostic');"], { timeout: 5000 });
    expect(result).toEqual({ stdout: 'Café ☀', stderr: 'render diagnostic' });
  });

  it('reports the actual exit, elapsed time, bound, stdout and stderr on failure', async () => {
    const error = await runFixtureProcess(process.execPath, ['-e', "process.stdout.write('partial output'); process.stderr.write('PDF stage failed'); process.exitCode = 7;"], { label: 'Test PDF', timeout: 5000 }).catch(value => value);
    expect(error).toBeInstanceOf(Error);
    expect(error.exitCode).toBe(7);
    expect(error.message).toContain('Test PDF failed after');
    expect(error.message).toContain('exit=7');
    expect(error.message).toContain('timeout=5000 ms');
    expect(error.message).toContain('partial output');
    expect(error.message).toContain('PDF stage failed');
    expect(error.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it('reports a missing executable without a dangling wait', async () => {
    const error = await runFixtureProcess('__alloflow_missing_fixture_executable__', [], { timeout: 5000 }).catch(value => value);
    expect(error.code).toBe('ENOENT');
    expect(error.exitCode).toBeNull();
  });

  it('rejects oversized output instead of accepting partial evidence', async () => {
    const error = await runFixtureProcess(process.execPath, ['-e', "process.stdout.write('x'.repeat(100000)); setInterval(() => {}, 1000);"], { timeout: 15000, maxBuffer: 1000 }).catch(value => value);
    expect(error.code).toBe('MAXBUFFERLIMIT');
    expect(Buffer.byteLength(error.stdout)).toBeLessThanOrEqual(1000);
    expect(error.cleanupStatus).toBe('terminated');
  });

  it('a timeout stops the owned parent and descendant before returning', async () => {
    const program = "const {spawn}=require('node:child_process'); const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore',windowsHide:true}); console.log(JSON.stringify({parent:process.pid,descendant:child.pid})); setInterval(()=>{},1000);";
    const error = await runFixtureProcess(process.execPath, ['-e', program], { timeout: 15000 }).catch(value => value);
    let pids = { parent: error.pid };
    try {
      pids = JSON.parse(error.stdout.trim());
      expect(error.code).toBe('ETIMEDOUT');
      expect(error.cleanupStatus).toBe('terminated');
      expect(alive(pids.parent)).toBe(false);
      expect(alive(pids.descendant)).toBe(false);
    } finally {
      if (Number.isInteger(pids.parent)) stopOwned(pids.parent);
      if (Number.isInteger(pids.descendant)) stopOwned(pids.descendant);
    }
  }, 30000);

  it('outer time budgets cover capability discovery, rendering and both fixtures', () => {
    const python = readFileSync(resolve(process.cwd(), 'agent_skills/alloflow-portable-remediation/scripts/alloflow_portable.py'), 'utf8');
    const rendering = python.slice(python.indexOf('def render_pdf('), python.indexOf('def normalize_verapdf('));
    const rendererSeconds = Number(rendering.match(/timeout=(\d+)/)[1]);
    expect(PORTABLE_EXPORT_TIMEOUT_MS).toBeGreaterThanOrEqual((20 + rendererSeconds + 20) * 1000);
    expect(FIXTURE_SUITE_TIMEOUT_MS).toBeGreaterThanOrEqual(2 * PORTABLE_EXPORT_TIMEOUT_MS + 30000);
  });
});
