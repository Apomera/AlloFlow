// Production MCP stdio, driver, and Chromium; all model replies are scripted.
// The public one-minute run limit is exercised with a real pending request; no fake timers.
import { afterAll, afterEach, expect, it, vi } from 'vitest';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

vi.setConfig({ testTimeout: 360000, hookTimeout: 30000 });
const requireCjs = createRequire(import.meta.url);
const serverPath = resolve('desktop/mcp/alloflow-remediation-mcp-stdio.cjs');
const fixtureDriver = requireCjs(resolve('desktop/mcp/remediation_headless_driver.cjs')).createDriver({});
const clients = [];
const scratch = [];
const serverLifecycles = [];
const FIXTURE_LINES = [
  'AlloFlow connector self test document.',
  'Pending requests stop at the configured deadline.',
  'A resumed run preserves every source sentence.',
];
const FIXTURE_TEXT = FIXTURE_LINES.join(' ');
function buildTerminalFixturePdf() {
  // Reuse the valid tagged fixture serializer with enough real text to avoid unrelated OCR.
  const build = new Function('SELFTEST_MARKER', 'return (' + fixtureDriver._buildSelfTestPdf.toString() + ')();');
  return build(FIXTURE_LINES.join(') Tj 0 -24 Td ('));
}

function startServer(stateDir) {
  const env = { ...process.env, ALLOFLOW_MCP_NO_KEY_FILES: '1', ALLOFLOW_MCP_STATE_DIR: stateDir };
  for (const key of ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'REACT_APP_GEMINI_API_KEY',
    'ALLOFLOW_MCP_ENV_PATH', 'ALLOFLOW_MCP_GEMINI_BASE']) delete env[key];
  const child = spawn(process.execPath, [serverPath], {
    env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true,
  });
  const lifecycle = { pid: child.pid, startedAt: new Date().toISOString() }; serverLifecycles.push(lifecycle);
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
      pending.delete(id); reject(new Error('MCP timeout for ' + method + (params && params.name ? ' ' + params.name : '') + ': ' + stderr));
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
        clientInfo: { name: 'real-bridge-terminal-matrix', version: '1' } });
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    },
    stop: async () => {
      let timer;
      if (child.exitCode === null && child.signalCode === null) {
        // The production stdin-close hook closes the driver's owned browser before exit.
        lifecycle.shutdown = 'stdin-close';
        child.stdin.end();
        timer = setTimeout(() => { lifecycle.shutdown = 'forced-owned-child'; child.kill(); }, 10000);
      }
      await exited;
      clearTimeout(timer);
      lifecycle.exitCode = child.exitCode;
      lifecycle.signalCode = child.signalCode;
      lifecycle.stderrTail = stderr;
    },
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
      const reply = fixtureDriver._selfTestScriptedReply(request.prompt).replaceAll('AlloFlow connector self test document', FIXTURE_TEXT);
      await client.call('remediation_agent_respond', { run_id: runId, request_id: request.requestId, text: reply });
      answered++;
    }
  }
}

afterEach(async () => {
  for (const client of clients.splice(0)) await client.stop();
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true });
});


const observations = [];
const pause = ms => new Promise(resolveWait => setTimeout(resolveWait, ms));

async function terminalWithin(client, runId, expiresAt) {
  let view;
  do {
    view = await client.call('remediation_agent_requests', { run_id: runId, wait_seconds: 1, include_images: false });
    if (view.status !== 'running') return view;
    await pause(Math.min(500, Math.max(1, expiresAt - Date.now())));
  } while (Date.now() < expiresAt);
  return view;
}

afterAll(() => {
  const target = process.env.ALLOFLOW_MCP_TERMINAL_TEST_EVIDENCE;
  if (!target) return;
  const file = resolve(target);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({
    evidenceClass: 'Real Chromium and production MCP stdio failure/recovery calibration with scripted replies; no live provider calls.',
    observations,
    serverLifecycles,
  }, null, 2) + '\n', { flag: 'wx' });
});

it.each(['cancel', 'deadline'])('%s settles pending real requests, rejects late replies, and resumes the same stored run', async mode => {
  const dir = mkdtempSync(join(tmpdir(), 'alloflow-real-bridge-terminal-')); scratch.push(dir);
  const stateDir = join(dir, 'state');
  const file = join(dir, 'source.pdf');
  writeFileSync(file, buildTerminalFixturePdf());
  const client = startServer(stateDir); await client.initialize();
  const trace = { mode, maxRunMinutes: mode === 'deadline' ? 1 : 5 };
  observations.push(trace);
  const startedAt = Date.now();
  const started = await client.call('pdf_remediate_agent_start', {
    file_path: file, output_dir: join(dir, 'out'), target_score: 100,
    fix_passes: 0, tagged_pdf: false, auto_continue: false, max_run_minutes: trace.maxRunMinutes,
  });
  trace.startReturnedAt = new Date().toISOString();
  const waiting = await pendingRequest(client, started.runId);
  const staleIds = waiting.pendingRequests.map(request => request.requestId);
  trace.pendingRequestsBeforeInterruption = staleIds.length;
  trace.firstPendingAfterMs = Date.now() - startedAt;
  trace.deadlineObservationOrigin = 'first published request: the driver wall-clock timer is already armed';
  if (mode === 'cancel') expect((await client.call('remediation_agent_cancel', { run_id: started.runId })).ok).toBe(true);
  const stopped = await terminalWithin(client, started.runId, mode === 'deadline' ? Date.now() + 75000 : Date.now() + 15000);
  trace.observedStatus = stopped.status;
  trace.observedError = stopped.error || null;
  trace.pendingAtSettlement = stopped.pendingRequests.length;
  trace.elapsedMs = Date.now() - startedAt;
  trace.persistedStatus = JSON.parse(readFileSync(join(stateDir, 'agent-runs', started.runId + '.json'), 'utf8')).status;
  if (stopped.status === 'running') {
    // Preserve the failed natural deadline observation, then release this isolated server.
    trace.manualCancelAccepted = (await client.call('remediation_agent_cancel', { run_id: started.runId })).ok;
    trace.afterManualCancel = (await terminalWithin(client, started.runId, Date.now() + 15000)).status;
  }
  expect(stopped.status, JSON.stringify(trace)).toBe(mode === 'deadline' ? 'failed' : 'cancelled');
  if (mode === 'deadline') expect(stopped.error).toMatch(/remediation_deadline_reached/);
  expect(stopped.pendingRequests).toEqual([]);
  expect(trace.persistedStatus).toBe(stopped.status);
  const late = await client.rpc('tools/call', { name: 'remediation_agent_respond',
    arguments: { run_id: started.runId, request_id: staleIds[0], text: 'late response from a finished attempt' } });
  expect(late.error.message).toMatch(/No pending request/);
  trace.lateReplyRejected = true;
  expect((await client.call('remediation_agent_resume', { run_id: started.runId })).runId).toBe(started.runId);
  trace.laneReleasedForResume = true;
  trace.resumeReturnedAt = new Date().toISOString();
  const resumed = await pendingRequest(client, started.runId);
  expect(resumed.pendingRequests.map(request => request.requestId).every(id => !staleIds.includes(id))).toBe(true);
  trace.freshRequestIds = true;
  const staleBatch = await client.rpc('tools/call', { name: 'remediation_agent_respond_batch', arguments: {
    run_id: started.runId, responses: [
      { request_id: resumed.pendingRequests[0].requestId, text: 'candidate reply must not be consumed by invalid batch' },
      { request_id: staleIds[0], text: 'stale reply' },
    ],
  } });
  expect(staleBatch.error.message).toMatch(/unknown pending request/);
  const preserved = await client.call('remediation_agent_requests', { run_id: started.runId, wait_seconds: 0, include_images: false });
  expect(preserved.pendingRequests.map(request => request.requestId))
    .toEqual(expect.arrayContaining(resumed.pendingRequests.map(request => request.requestId)));
  trace.invalidBatchWasAtomic = true;
  const completed = await finish(client, started.runId);
  expect(completed.view.status, JSON.stringify({ error: completed.view.error, log: completed.view.log })).toBe('completed');
  expect(completed.view.pendingRequests).toEqual([]);
  expect(completed.view.result.verificationHtmlBound).toBe(true);
  expect(completed.view.result.contentCoverage).toMatchObject({ status: 'matched', reviewRequired: false });
  trace.resumedStatus = completed.view.status;
  trace.scriptedRepliesAfterResume = completed.answered;
  trace.verificationHtmlBound = completed.view.result.verificationHtmlBound;
  trace.durableCompletedStatus = JSON.parse(readFileSync(join(stateDir, 'agent-runs', started.runId + '.json'), 'utf8')).status;
  expect(trace.durableCompletedStatus).toBe('completed');
  expect(client.protocolErrors).toEqual([]);
});

it('a folder deadline drops failed-file pending requests and resume reuses the completed sibling', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'alloflow-real-bridge-file-deadline-')); scratch.push(dir);
  const inputs = join(dir, 'inputs'); mkdirSync(inputs);
  const first = join(inputs, 'a-stalls.pdf'), second = join(inputs, 'b-completes.pdf');
  const pdf = buildTerminalFixturePdf();
  writeFileSync(first, pdf); writeFileSync(second, pdf);
  const stateDir = join(dir, 'state');
  const client = startServer(stateDir); await client.initialize();
  const trace = { mode: 'folder-file-deadline', maxRunMinutes: 1 }; observations.push(trace);
  const started = await client.call('pdf_remediate_agent_start', {
    dir_path: inputs, output_dir: join(dir, 'out'), target_score: 100,
    fix_passes: 0, tagged_pdf: false, auto_continue: false, max_run_minutes: 1,
  });
  trace.startReturnedAt = new Date().toISOString();
  const waiting = await pendingRequest(client, started.runId);
  const staleIds = waiting.pendingRequests.map(request => request.requestId);
  trace.pendingBeforeDeadline = staleIds.length;
  const deadline = Date.now() + 75000;
  let next;
  do {
    next = await client.call('remediation_agent_requests', { run_id: started.runId, wait_seconds: 1, include_images: false });
    if (next.status !== 'running' || next.progress.failed === 1) break;
    await pause(500);
  } while (Date.now() < deadline);
  trace.statusAfterDeadline = next.status;
  trace.failedFilesAfterDeadline = next.progress.failed;
  trace.oldRequestsStillPending = next.pendingRequests.filter(request => staleIds.includes(request.requestId)).length;
  if (next.progress.failed !== 1 && next.status === 'running') {
    await client.call('remediation_agent_cancel', { run_id: started.runId });
    trace.manualCancelStatus = (await terminalWithin(client, started.runId, Date.now() + 15000)).status;
  }
  expect(next.progress.failed, JSON.stringify(trace)).toBe(1);
  expect(next.status).toBe('running');
  expect(trace.oldRequestsStillPending).toBe(0);
  const late = await client.rpc('tools/call', { name: 'remediation_agent_respond',
    arguments: { run_id: started.runId, request_id: staleIds[0], text: 'late reply to failed folder file' } });
  expect(late.error.message).toMatch(/No pending request/);
  trace.failedFileLateReplyRejected = true;
  const partial = await finish(client, started.runId);
  expect(partial.view.status, JSON.stringify({ error: partial.view.error, log: partial.view.log })).toBe('completed');
  expect(partial.view.pendingRequests).toEqual([]);
  expect(partial.view.result).toMatchObject({ total: 2, completed: 1, failed: 1, outcome: 'completed_with_failures' });
  expect(partial.view.result.files[0]).toMatchObject({ file: first, status: 'failed' });
  expect(partial.view.result.files[0].error).toMatch(/remediation_deadline_reached/);
  const sibling = partial.view.result.files[1].result;
  expect(sibling.verificationHtmlBound).toBe(true);
  const siblingBytes = readFileSync(sibling.files.accessibleHtml);
  trace.partialOutcome = partial.view.result.outcome;
  trace.completedSiblingVerified = true;
  await client.call('remediation_agent_resume', { run_id: started.runId });
  const resumed = await finish(client, started.runId);
  expect(resumed.view.status, JSON.stringify({ error: resumed.view.error, log: resumed.view.log })).toBe('completed');
  expect(resumed.view.result).toMatchObject({ total: 2, completed: 2, failed: 0 });
  expect(resumed.view.result.files[0].result.verificationHtmlBound).toBe(true);
  expect(resumed.view.result.files[1].result.reused).toBe(true);
  expect(readFileSync(resumed.view.result.files[1].result.files.accessibleHtml).equals(siblingBytes)).toBe(true);
  trace.resumedCompleted = resumed.view.result.completed;
  trace.resumedFailed = resumed.view.result.failed;
  trace.completedSiblingReusedUnchanged = true;
  trace.scriptedRepliesOnResume = resumed.answered;
  expect(client.protocolErrors).toEqual([]);
});
