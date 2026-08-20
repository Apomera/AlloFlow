// End-to-end proof of the agent-bridge lane (client-model transport): the full remediation
// pipeline with the MCP CLIENT playing the model, keylessly, over the protocol surface a real
// client uses — pdf_remediate_agent_start → remediation_agent_requests (long-poll) →
// remediation_agent_respond, repeated to completion.
//
// This is the protocol-level sibling of tests/mcp_driver_scripted_e2e.test.js: that test
// proves the pipeline against a scripted loopback Gemini reached through Node fetch; this one
// proves the SAME run when every model call instead pauses as a pending MCP request and the
// answer arrives through a tool call — the lane that lets a Claude (or any MCP client)
// subscription be the engine with no Gemini key and no Gemini egress. The scripted replies are
// the driver's own selftest script, so the reply contract stays pinned in exactly one place.
//
// Requires Chromium (same as its sibling); wired into the remote-mcp-verify workflow, which
// installs it. Runs with GEMINI_API_KEY removed and key files disabled: any Gemini dependence
// in the lane fails the test rather than silently borrowing a maintainer key.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, statSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

vi.setConfig({ testTimeout: 360000, hookTimeout: 60000 });

const requireCjs = createRequire(import.meta.url);
const SERVER = resolve(process.cwd(), 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs');
const driverModule = requireCjs(resolve(process.cwd(), 'desktop/mcp/remediation_headless_driver.cjs'));
const driver = driverModule.createDriver({});

const tmp = mkdtempSync(join(tmpdir(), 'alloflow-agent-bridge-'));
const pdfPath = join(tmp, 'bridge-test.pdf');

let child;
let nextId = 1;
const pending = new Map();
let buffer = '';

function onStdout(chunk) {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, idx);
    buffer = buffer.slice(idx + 1);
    if (!line.trim()) continue;
    let msg;
    try { msg = JSON.parse(line); } catch (_) { continue; }
    if (msg.id !== undefined && pending.has(msg.id)) {
      const resolver = pending.get(msg.id);
      pending.delete(msg.id);
      resolver(msg);
    }
  }
}

function rpc(method, params) {
  const id = nextId++;
  return new Promise((resolveP, rejectP) => {
    pending.set(id, resolveP);
    const timer = setTimeout(() => {
      if (pending.has(id)) { pending.delete(id); rejectP(new Error('timeout waiting for ' + method)); }
    }, 120000);
    timer.unref?.();
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

async function call(name, args) {
  const r = await rpc('tools/call', { name, arguments: args });
  expect(r.error, name + ' rpc error').toBeUndefined();
  expect(r.result.isError, name + ' tool error: ' + JSON.stringify(r.result.content).slice(0, 500)).toBeFalsy();
  return r.result.structuredContent;
}

beforeAll(async () => {
  writeFileSync(pdfPath, driver._buildSelfTestPdf());
  const env = { ...process.env, ALLOFLOW_MCP_NO_KEY_FILES: '1' };
  delete env.GEMINI_API_KEY;
  delete env.ALLOFLOW_MCP_ENV_PATH;
  delete env.ALLOFLOW_MCP_GEMINI_BASE;
  child = spawn(process.execPath, [SERVER], { env, stdio: ['pipe', 'pipe', 'pipe'] });
  child.stdout.on('data', onStdout);
  await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'agent-bridge-e2e', version: '0' } });
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
});

afterAll(() => { try { child.kill(); } catch (_) {} });

describe('agent-bridge remediation (client-model transport, keyless)', () => {
  it('runs the full pipeline to a written, delivery-verified result with the client as the model', async () => {
    const started = await call('pdf_remediate_agent_start', {
      file_path: pdfPath, output_dir: tmp, target_score: 100, fix_passes: 0,
    });
    expect(started.modelTransport).toBe('agent-bridge');
    expect(started.status).toBe('running');
    expect(started.runId).toMatch(/^arun-/);

    let answered = 0;
    let view;
    const startedAt = Date.now();
    for (;;) {
      expect(Date.now() - startedAt, 'agent-bridge run exceeded the test wall clock').toBeLessThan(5 * 60 * 1000);
      view = await call('remediation_agent_requests', {
        run_id: started.runId, wait_seconds: 15, include_images: false,
      });
      if (view.status !== 'running') break;
      for (const req of view.pendingRequests) {
        expect(req.kind === 'text' || req.kind === 'vision').toBe(true);
        expect(req.prompt.length).toBeGreaterThan(0);
        // The driver's own selftest script IS the reply contract — one pinned source.
        const reply = driver._selfTestScriptedReply(req.prompt);
        const ack = await call('remediation_agent_respond', {
          run_id: started.runId, request_id: req.requestId, text: reply,
        });
        expect(ack.ok).toBe(true);
        answered++;
      }
    }

    expect(view.status, 'run failed: ' + view.error + ' — log tail: ' + JSON.stringify((view.log || []).slice(-8))).toBe('completed');
    expect(answered).toBeGreaterThanOrEqual(5); // a real pipeline run asks many times, not once
    expect(view.modelCallsSoFar).toBe(answered); // every model call went through the bridge

    const result = view.result;
    expect(result.modelTransport).toBe('agent-bridge');
    expect(result.modelCallsAnswered).toBe(answered);
    // Bridge instrumentation: per-request client latency plus the idempotency counters
    // (coalesced re-asks / replayed answers stay 0 here — scripted replies land well inside
    // the widened agent-bridge deadlines, so the pipeline never re-asks).
    expect(result.bridgeStats.requestsPublished).toBe(answered);
    expect(result.bridgeStats.coalescedReasks).toBe(0);
    expect(result.bridgeStats.replayedAnswers).toBe(0);
    expect(result.bridgeStats.clientLatencySeconds.count).toBe(answered);
    // The honesty surfaces are intact, not bypassed by the transport swap.
    expect(result.verdict && result.verdict.level).toBeTruthy();
    expect(result.verificationHtmlBound).toBe(true);
    expect(result.activeContentScanVerified).toBe(true);
    expect(typeof result.afterScore).toBe('number');
    // Real artifacts on disk: tagged PDF bytes start with %PDF-, report parses.
    expect(result.files.accessibleHtml).toBeTruthy();
    expect(statSync(result.files.accessibleHtml).size).toBeGreaterThan(500);
    expect(result.files.taggedPdf).toBeTruthy();
    const taggedHead = readFileSync(result.files.taggedPdf).subarray(0, 5).toString('latin1');
    expect(taggedHead).toBe('%PDF-');
    expect(JSON.parse(readFileSync(result.files.report, 'utf8')).verdict).toBeTruthy();

    // Answering a finished run's ghost request fails cleanly instead of hanging.
    const late = await rpc('tools/call', {
      name: 'remediation_agent_respond',
      arguments: { run_id: started.runId, request_id: 'mreq-99999', text: 'late' },
    });
    expect(late.error).toBeTruthy();
  });

  it('cancel rejects pending requests, frees the lane, and reports cancelled', async () => {
    const started = await call('pdf_remediate_agent_start', {
      file_path: pdfPath, output_dir: tmp, target_score: 100, fix_passes: 0,
    });
    // Wait until the pipeline actually asks for something, so cancel exercises
    // the reject-pending path rather than an idle abort.
    let view;
    for (let i = 0; i < 20; i++) {
      view = await call('remediation_agent_requests', { run_id: started.runId, wait_seconds: 10, include_images: false });
      if (view.pendingRequests.length || view.status !== 'running') break;
    }
    const cancelled = await call('remediation_agent_cancel', { run_id: started.runId });
    expect(cancelled.ok).toBe(true);
    // The run settles as cancelled and the single-flight lane frees: a new start succeeds.
    for (let i = 0; i < 30; i++) {
      view = await call('remediation_agent_requests', { run_id: started.runId, wait_seconds: 2, include_images: false });
      if (view.status !== 'running') break;
    }
    expect(view.status).toBe('cancelled');
    const again = await call('pdf_remediate_agent_start', {
      file_path: pdfPath, output_dir: tmp, target_score: 100, fix_passes: 0,
    });
    expect(again.status).toBe('running');
    await call('remediation_agent_cancel', { run_id: again.runId });
    for (let i = 0; i < 30; i++) {
      view = await call('remediation_agent_requests', { run_id: again.runId, wait_seconds: 2, include_images: false });
      if (view.status !== 'running') break;
    }
    expect(view.status).toBe('cancelled');
  });
});
