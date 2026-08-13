import { describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import {
  appendFileSync, copyFileSync, cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const MCP_DIR = join(ROOT, 'desktop', 'mcp');
const LF = String.fromCharCode(10);

function startDisposableServer(root) {
  const serverDir = join(root, 'server');
  mkdirSync(serverDir, { recursive: true });
  for (const name of [
    'alloflow-remediation-mcp-stdio.cjs',
    'remediation_headless_driver.cjs',
    'zip_writer.cjs',
  ]) copyFileSync(join(MCP_DIR, name), join(serverDir, name));
  cpSync(join(MCP_DIR, 'vendor'), join(serverDir, 'vendor'), { recursive: true });

  const env = {
    ...process.env,
    ALLOFLOW_MCP_ASSETS_DIR: ROOT,
    ALLOFLOW_MCP_SKILLS_DIR: join(ROOT, 'agent_skills'),
    ALLOFLOW_MCP_STATE_DIR: join(root, 'state'),
    ALLOFLOW_MCP_NO_KEY_FILES: '1',
  };
  delete env.GEMINI_API_KEY;
  const child = spawn(process.execPath, [join(serverDir, 'alloflow-remediation-mcp-stdio.cjs')], {
    cwd: ROOT, env, stdio: ['pipe', 'pipe', 'pipe'],
  });
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');

  let buffer = '';
  let stderr = '';
  let nextId = 1;
  const pending = new Map();
  child.stderr.on('data', function (chunk) { stderr += chunk; });
  child.stdout.on('data', function (chunk) {
    buffer += chunk;
    let newline;
    while ((newline = buffer.indexOf(LF)) !== -1) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      if (!line.trim()) continue;
      const message = JSON.parse(line);
      const waiting = pending.get(message.id);
      if (!waiting) continue;
      pending.delete(message.id);
      waiting.resolve(message);
    }
  });
  child.on('exit', function (code) {
    for (const waiting of pending.values()) {
      waiting.reject(new Error('Disposable MCP exited with ' + code + ': ' + stderr));
    }
    pending.clear();
  });

  function request(method, params) {
    const id = nextId++;
    return new Promise(function (resolveRequest, rejectRequest) {
      const timer = setTimeout(function () {
        pending.delete(id);
        rejectRequest(new Error('Timed out waiting for ' + method + ': ' + stderr));
      }, 30000);
      pending.set(id, {
        resolve(message) {
          clearTimeout(timer);
          resolveRequest(message);
        },
        reject(error) {
          clearTimeout(timer);
          rejectRequest(error);
        },
      });
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + LF);
    });
  }

  async function stop() {
    if (child.exitCode === null) {
      const closed = new Promise(function (resolveClose) { child.once('close', resolveClose); });
      child.kill();
      await closed;
    }
  }

  return {
    driverPath: join(serverDir, 'remediation_headless_driver.cjs'),
    request,
    stop,
  };
}

describe('desktop MCP runtime build fencing', function () {
  it('keeps capabilities inspectable but rejects self-test and direct processing after drift', async function () {
    const scratch = mkdtempSync(join(tmpdir(), 'alloflow-runtime-drift-'));
    const server = startDisposableServer(scratch);
    try {
      const initialized = await server.request('initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'runtime-drift-test', version: '1' },
      });
      expect(initialized.result.serverInfo.name).toBe('alloflow-remediation');

      appendFileSync(server.driverPath, LF + '// deliberate post-boot drift' + LF, 'utf8');

      const capabilityReply = await server.request('tools/call', {
        name: 'remediation_capabilities', arguments: {},
      });
      const capability = capabilityReply.result.structuredContent;
      expect(capabilityReply.result.isError).toBe(false);
      expect(capability.runtimeBuild.current).toBe(false);
      expect(capability.onboarding.state).toBe('reinstall-required');

      const selfTest = await server.request('tools/call', {
        name: 'remediation_selftest', arguments: {},
      });
      expect(selfTest.result.isError).toBe(true);
      expect(selfTest.result.content[0].text).toContain('desktop_runtime_build_changed_since_server_start');

      const pdf = join(scratch, 'input.pdf');
      writeFileSync(pdf, ['%PDF-1.4', '% drift fence input', '%%EOF', ''].join(LF), 'utf8');
      const direct = await server.request('tools/call', {
        name: 'extract_document_text', arguments: { file_path: pdf },
      });
      expect(direct.result.isError).toBe(true);
      expect(direct.result.content[0].text).toContain('desktop_runtime_build_changed_since_server_start');

      const secondReply = await server.request('tools/call', {
        name: 'remediation_capabilities', arguments: {},
      });
      const secondCapability = secondReply.result.structuredContent;
      expect(secondCapability.runtimeBuild.current).toBe(false);
      expect(secondCapability.runtimeBuild.checkedAt).toBe(capability.runtimeBuild.checkedAt);
    } finally {
      await server.stop();
      rmSync(scratch, { recursive: true, force: true });
    }
  }, 90000);
});
