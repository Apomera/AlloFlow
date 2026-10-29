// Real Chromium and the production MCP server/driver; only model replies are scripted.
// A keyless run interrupted mid-document resumes by replaying the answers it already
// received (byte-identical requests only), so the client is not asked them again; the
// journal holds document text, so it is removed once the run completes cleanly and an
// orphan is swept at boot.
import { afterEach, expect, it, vi } from 'vitest';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

vi.setConfig({ testTimeout: 420000, hookTimeout: 30000 });
const requireCjs = createRequire(import.meta.url);
const serverPath = resolve('desktop/mcp/alloflow-remediation-mcp-stdio.cjs');
const fixtureDriver = requireCjs(resolve('desktop/mcp/remediation_headless_driver.cjs')).createDriver({});
const clients = [];
const scratch = [];

function startServer(stateDir) {
  const env = { ...process.env, ALLOFLOW_MCP_NO_KEY_FILES: '1', ALLOFLOW_MCP_STATE_DIR: stateDir };
  for (const key of ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'REACT_APP_GEMINI_API_KEY',
    'ALLOFLOW_MCP_ENV_PATH', 'ALLOFLOW_MCP_GEMINI_BASE']) delete env[key];
  const child = spawn(process.execPath, [serverPath], { env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  let sequence = 0;
  let buffer = '';
  let stderr = '';
  const pending = new Map();
  const exited = new Promise((resolveExit) => child.once('exit', resolveExit));
  child.stderr.on('data', (bytes) => { stderr = (stderr + bytes).slice(-20000); });
  child.stdout.on('data', (bytes) => {
    buffer += bytes;
    let newline;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
      if (!line.trim()) continue;
      let message;
      try { message = JSON.parse(line); } catch (_) { continue; }
      const request = pending.get(message.id);
      if (request) { pending.delete(message.id); clearTimeout(request.timer); request.resolve(message); }
    }
  });
  child.once('exit', () => {
    for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error('MCP server exited: ' + stderr)); }
    pending.clear();
  });
  const rpc = (method, params) => new Promise((resolveRequest, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('MCP timeout for ' + method + ': ' + stderr)); }, 120000);
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
    call,
    initialize: async () => {
      await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'answer-journal-regression', version: '1' } });
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    },
    stop: async () => { if (child.exitCode === null && child.signalCode === null) child.kill(); await exited; },
  };
  clients.push(client);
  return client;
}

// Answers requests until `limit` have been answered (then returns with the run still going)
// or the run ends. Every prompt the client sees is recorded.
async function answer(client, runId, limit, seen) {
  let answered = 0;
  const started = Date.now();
  for (;;) {
    expect(Date.now() - started, 'bridge deadline').toBeLessThan(300000);
    const view = await client.call('remediation_agent_requests', { run_id: runId, wait_seconds: 10, include_images: false });
    if (view.status !== 'running') return { view, answered };
    for (const request of view.pendingRequests) {
      if (answered >= limit) return { view, answered };
      expect(request.promptNextOffset).toBeNull();
      seen.push(request.prompt);
      await client.call('remediation_agent_respond', { run_id: runId, request_id: request.requestId,
        text: fixtureDriver._selfTestScriptedReply(request.prompt) });
      answered++;
    }
  }
}

afterEach(async () => {
  for (const client of clients.splice(0)) await client.stop();
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true });
});

it('replays saved answers after an interruption instead of re-asking the client, then deletes the journal', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'alloflow-answer-journal-')); scratch.push(dir);
  const stateDir = join(dir, 'state');
  const source = join(dir, 'source.pdf');
  writeFileSync(source, fixtureDriver._buildSelfTestPdf());
  let client = startServer(stateDir); await client.initialize();
  const started = await client.call('pdf_remediate_agent_start', {
    file_path: source, output_dir: join(dir, 'out'), target_score: 100,
    fix_passes: 0, tagged_pdf: false, auto_continue: false, max_run_minutes: 5,
  });
  const journal = join(stateDir, 'agent-runs', started.runId + '.answers.jsonl');
  const before = [];
  const first = await answer(client, started.runId, 3, before);
  expect(first.view.status).toBe('running');
  expect(first.answered).toBe(3);
  const lines = readFileSync(journal, 'utf8').trim().split('\n');
  expect(lines).toHaveLength(3);
  expect(lines.every((line) => /^[a-f0-9]{64}$/.test(JSON.parse(line).k))).toBe(true);
  await client.stop();
  // The process died mid-append: a torn tail must not swallow the next saved answer.
  writeFileSync(journal, readFileSync(journal, 'utf8') + '{"k":"' + 'b'.repeat(20));

  client = startServer(stateDir); await client.initialize();
  await client.call('remediation_agent_resume', { run_id: started.runId });
  const second = await answer(client, started.runId, 1, before);
  expect(second.answered).toBe(1);
  const saved = readFileSync(journal, 'utf8').split('\n').filter((line) => { try { return JSON.parse(line).t; } catch (_) { return false; } });
  expect(saved).toHaveLength(4);
  await client.stop();

  client = startServer(stateDir); await client.initialize();
  await client.call('remediation_agent_resume', { run_id: started.runId });
  const after = [];
  const finished = await answer(client, started.runId, Infinity, after);
  expect(finished.view.status, JSON.stringify({ error: finished.view.error, log: finished.view.log })).toBe('completed');
  // None of the four already-answered prompts reached the client again.
  expect(before).toHaveLength(4);
  for (const prompt of before) expect(after.includes(prompt), 're-asked: ' + prompt.slice(0, 120)).toBe(false);
  expect(finished.view.result.bridgeStats.journalReplayedAnswers).toBeGreaterThanOrEqual(4);
  expect(finished.view.result.contentCoverage).toMatchObject({ status: 'matched', reviewRequired: false });
  expect(existsSync(journal), 'journal kept after a clean completion').toBe(false);
});

it('sweeps an orphan journal at boot and keeps one that belongs to an unfinished run', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'alloflow-answer-journal-sweep-')); scratch.push(dir);
  const runs = join(dir, 'state', 'agent-runs');
  mkdirSync(runs, { recursive: true });
  const orphan = 'arun-00000000-0000-4000-8000-000000000001';
  const kept = 'arun-00000000-0000-4000-8000-000000000002';
  const done = 'arun-00000000-0000-4000-8000-000000000003';
  const row = JSON.stringify({ k: 'a'.repeat(64), t: 'saved document text' }) + '\n';
  const record = (id, status, failed) => writeFileSync(join(runs, id + '.json'), JSON.stringify({
    schema: 1, runId: id, status, filePath: join(dir, 'x.pdf'), outDir: dir, startedAt: new Date().toISOString(),
    workflow: { files: [join(dir, 'x.pdf')] }, options: {}, progress: { total: 1, completed: 0, failed },
  }));
  for (const id of [orphan, kept, done]) writeFileSync(join(runs, id + '.answers.jsonl'), row);
  record(kept, 'running', 0);
  record(done, 'completed', 0);
  const client = startServer(join(dir, 'state')); await client.initialize();
  expect(existsSync(join(runs, orphan + '.answers.jsonl'))).toBe(false);
  expect(existsSync(join(runs, done + '.answers.jsonl'))).toBe(false);
  expect(readFileSync(join(runs, kept + '.answers.jsonl'), 'utf8')).toBe(row);
});
