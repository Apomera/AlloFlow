// Real Chromium and the production MCP server/driver; only model replies are scripted.
// The state directory is the sole bridge between server processes. This exercises an
// interruption before an answer, stale-reply fencing, and verified completed-file reuse.
import { afterEach, expect, it, vi } from 'vitest';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

vi.setConfig({ testTimeout: 360000, hookTimeout: 30000 });
const requireCjs = createRequire(import.meta.url);
const serverPath = resolve('desktop/mcp/alloflow-remediation-mcp-stdio.cjs');
const fixtureDriver = requireCjs(resolve('desktop/mcp/remediation_headless_driver.cjs')).createDriver({});
const clients = [];
const scratch = [];

function startServer(stateDir) {
  const env = { ...process.env, ALLOFLOW_MCP_NO_KEY_FILES: '1', ALLOFLOW_MCP_STATE_DIR: stateDir };
  for (const key of ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'REACT_APP_GEMINI_API_KEY',
    'ALLOFLOW_MCP_ENV_PATH', 'ALLOFLOW_MCP_GEMINI_BASE']) delete env[key];
  const child = spawn(process.execPath, [serverPath], {
    env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true,
  });
  let sequence = 0;
  let buffer = '';
  let stderr = '';
  const pending = new Map();
  const protocolErrors = [];
  const exited = new Promise((resolveExit) => child.once('exit', resolveExit));
  child.stderr.on('data', (bytes) => { stderr = (stderr + bytes).slice(-20000); });
  child.stdout.on('data', (bytes) => {
    buffer += bytes;
    let newline;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
      if (!line.trim()) continue;
      let message;
      try { message = JSON.parse(line); } catch (_) { protocolErrors.push(line.slice(0, 200)); continue; }
      const request = pending.get(message.id);
      if (request) { pending.delete(message.id); clearTimeout(request.timer); request.resolve(message); }
    }
  });
  child.once('exit', () => {
    for (const request of pending.values()) {
      clearTimeout(request.timer); request.reject(new Error('MCP server exited: ' + stderr));
    }
    pending.clear();
  });
  const rpc = (method, params) => new Promise((resolveRequest, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => {
      pending.delete(id); reject(new Error('MCP timeout for ' + method + ': ' + stderr));
    }, 120000);
    pending.set(id, { resolve: resolveRequest, reject, timer });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
  const call = async (name, args) => {
    const reply = await rpc('tools/call', { name, arguments: args });
    expect(reply.error, name + ': ' + JSON.stringify(reply.error)).toBeUndefined();
    expect(reply.result.isError, name + ': ' + JSON.stringify(reply.result.content).slice(0, 1000)).toBeFalsy();
    return reply.result.structuredContent;
  };
  const client = {
    rpc, call, protocolErrors,
    initialize: async () => {
      await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {},
        clientInfo: { name: 'real-bridge-restart-regression', version: '1' } });
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    },
    stop: async () => { if (child.exitCode === null && child.signalCode === null) child.kill(); await exited; },
  };
  clients.push(client);
  return client;
}

async function pendingRequest(client, runId) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const view = await client.call('remediation_agent_requests', { run_id: runId, wait_seconds: 10, include_images: false });
    expect(view.status, JSON.stringify({ error: view.error, log: view.log })).toBe('running');
    if (view.pendingRequests.length) return view;
  }
  throw new Error('Real pipeline never published a model request');
}

async function finish(client, runId, { allowModelReplies = true } = {}) {
  let answered = 0;
  const started = Date.now();
  for (;;) {
    expect(Date.now() - started, 'bridge completion deadline').toBeLessThan(240000);
    const view = await client.call('remediation_agent_requests', { run_id: runId, wait_seconds: 10, include_images: false });
    if (view.status !== 'running') return { view, answered };
    expect(allowModelReplies || view.pendingRequests.length === 0, 'verified completed work requested another model answer').toBe(true);
    for (const request of view.pendingRequests) {
      expect(request.promptNextOffset).toBeNull();
      const reply = fixtureDriver._selfTestScriptedReply(request.prompt);
      await client.call('remediation_agent_respond', { run_id: runId, request_id: request.requestId, text: reply });
      answered++;
    }
  }
}

afterEach(async () => {
  for (const client of clients.splice(0)) await client.stop();
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true });
});

it('restarts with a pending real model request, rejects its stale reply, and reuses durable completed artifacts', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'alloflow-real-bridge-restart-')); scratch.push(dir);
  const stateDir = join(dir, 'state');
  const source = join(dir, 'source.pdf');
  writeFileSync(source, fixtureDriver._buildSelfTestPdf());
  let client = startServer(stateDir); await client.initialize();
  const started = await client.call('pdf_remediate_agent_start', {
    file_path: source, output_dir: join(dir, 'out'), target_score: 100,
    fix_passes: 0, tagged_pdf: false, auto_continue: false, max_run_minutes: 5,
  });
  const previous = await pendingRequest(client, started.runId);
  const staleId = previous.pendingRequests[0].requestId;
  const persisted = JSON.parse(readFileSync(join(stateDir, 'agent-runs', started.runId + '.json'), 'utf8'));
  expect(persisted.status).toBe('running');
  await client.stop();

  client = startServer(stateDir); await client.initialize();
  const recovered = await client.call('remediation_agent_requests', { run_id: started.runId, wait_seconds: 0, include_images: false });
  expect(recovered.status).toBe('interrupted');
  expect(recovered.pendingRequests).toEqual([]);
  expect((await client.call('remediation_agent_resume', { run_id: started.runId })).runId).toBe(started.runId);
  const current = await pendingRequest(client, started.runId);
  expect(current.pendingRequests.map((request) => request.requestId)).not.toContain(staleId);
  const staleReply = await client.rpc('tools/call', { name: 'remediation_agent_respond',
    arguments: { run_id: started.runId, request_id: staleId, text: 'late answer from the previous process' } });
  expect(staleReply.error.message).toMatch(/No pending request/);
  const unchanged = await client.call('remediation_agent_requests', { run_id: started.runId, wait_seconds: 0, include_images: false });
  // Other auditors can publish concurrently; every previously pending request must survive.
  expect(unchanged.pendingRequests.map((request) => request.requestId))
    .toEqual(expect.arrayContaining(current.pendingRequests.map((request) => request.requestId)));

  const completed = await finish(client, started.runId);
  expect(completed.view.status, JSON.stringify({ error: completed.view.error, log: completed.view.log })).toBe('completed');
  expect(completed.answered).toBeGreaterThanOrEqual(5);
  expect(completed.view.result.verificationHtmlBound).toBe(true);
  expect(completed.view.result.contentCoverage).toMatchObject({ status: 'matched', reviewRequired: false });
  const htmlPath = completed.view.result.files.accessibleHtml;
  const html = readFileSync(htmlPath, 'utf8');
  expect(html.length).toBeGreaterThan(500);
  const manifest = readFileSync(completed.view.result.files.completionManifest, 'utf8');
  await client.stop();

  client = startServer(stateDir); await client.initialize();
  const durable = await client.call('remediation_agent_requests', { run_id: started.runId, wait_seconds: 0, include_images: false });
  expect(durable.status).toBe('completed');
  expect(durable.result.files.accessibleHtml).toBe(htmlPath);
  expect(durable.result.verificationHtmlBound).toBe(true);
  await client.call('remediation_agent_resume', { run_id: started.runId });
  const reused = await finish(client, started.runId, { allowModelReplies: false });
  expect(reused.view.status).toBe('completed');
  expect(reused.view.result.reused).toBe(true);
  expect(reused.view.result.modelCallsAnswered).toBe(0);
  expect(reused.answered).toBe(0);
  expect(readFileSync(htmlPath, 'utf8')).toBe(html);
  expect(readFileSync(completed.view.result.files.completionManifest, 'utf8')).toBe(manifest);
  for (const processClient of clients) expect(processClient.protocolErrors).toEqual([]);
});
