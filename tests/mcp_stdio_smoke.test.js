// Protocol smoke test for the local stdio MCP proof of concept
// (desktop/mcp/alloflow-mcp-stdio.cjs — Task 4 of the federated-agent
// handoff). Spawns the real server process and speaks newline-delimited
// JSON-RPC 2.0 over stdio, pinning the acceptance criteria: initialize
// handshake, first-slice tools only (all read-only, directory-legal names +
// annotations), contract validation through tools/call, honest empty default
// manifest with no secrets, and clean protocol errors for unknown
// methods/tools and malformed JSON. stdout must carry ONLY protocol messages.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SERVER = resolve(process.cwd(), 'desktop/mcp/alloflow-mcp-stdio.cjs');
const fixture = (name) =>
  JSON.parse(readFileSync(resolve(process.cwd(), 'test_data/agent_core', name), 'utf-8'));

let child;
let nextId = 1;
const pending = new Map();
let buffer = '';
const stray = []; // protocol-invalid stdout lines — must stay empty

function onStdout(chunk) {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, idx);
    buffer = buffer.slice(idx + 1);
    if (!line.trim()) continue;
    let msg;
    try { msg = JSON.parse(line); } catch (_) { stray.push(line); continue; }
    if (msg.jsonrpc !== '2.0') { stray.push(line); continue; }
    const key = msg.id === null || msg.id === undefined ? 'null' : msg.id;
    const resolver = pending.get(key);
    if (resolver) { pending.delete(key); resolver(msg); }
    else stray.push(line);
  }
}

function request(method, params, { rawId } = {}) {
  const id = rawId !== undefined ? rawId : nextId++;
  const key = id === null ? 'null' : id;
  return new Promise((resolveP, rejectP) => {
    const timer = setTimeout(() => { pending.delete(key); rejectP(new Error(`timeout waiting for ${method}`)); }, 8000);
    pending.set(key, (msg) => { clearTimeout(timer); resolveP(msg); });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

function notify(method, params) {
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
}

function expectNullIdError() {
  const key = 'null';
  return new Promise((resolveP, rejectP) => {
    const timer = setTimeout(() => { pending.delete(key); rejectP(new Error('timeout waiting for null-id error')); }, 8000);
    pending.set(key, (msg) => { clearTimeout(timer); resolveP(msg); });
  });
}

const callTool = async (name, args) => (await request('tools/call', { name, arguments: args })).result;

beforeAll(() => {
  child = spawn(process.execPath, [SERVER], { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'] });
  child.stdout.setEncoding('utf-8');
  child.stdout.on('data', onStdout);
});

afterAll(() => {
  if (child) child.kill();
});

describe('MCP stdio proof of concept', () => {
  it('completes the initialize handshake and echoes a supported protocol version', async () => {
    const res = await request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'smoke-test', version: '0.0.0' },
    });
    expect(res.error).toBeUndefined();
    expect(res.result.protocolVersion).toBe('2025-06-18');
    expect(res.result.serverInfo.name).toBe('alloflow-agent-core');
    expect(res.result.capabilities.tools).toBeDefined();
    notify('notifications/initialized', {});
    const ping = await request('ping', {});
    expect(ping.result).toEqual({});
  });

  it('lists exactly the read-only first slice with directory-legal names and annotations', async () => {
    const res = await request('tools/list', {});
    const tools = res.result.tools;
    expect(tools.map((t) => t.name).sort()).toEqual(['artifact_validate', 'blueprint_validate', 'capabilities']);
    for (const t of tools) {
      expect(t.name).toMatch(/^[a-zA-Z0-9_-]{1,64}$/);
      expect(t.name).not.toContain('.');
      expect(t.annotations.title).toBeTruthy();
      expect(t.annotations.readOnlyHint).toBe(true);
      expect(t.annotations.destructiveHint).toBe(false);
      expect(t.inputSchema.type).toBe('object');
      expect(t.description.length).toBeGreaterThan(20);
    }
  });

  it('capabilities returns the honest empty desktop-local manifest with no secret fields', async () => {
    const result = await callTool('capabilities', {});
    const manifest = result.structuredContent;
    expect(result.isError).toBe(false);
    expect(manifest.schemaVersion).toBe('1.0');
    expect(manifest.deploymentMode).toBe('desktop-local');
    expect(manifest.text.available).toBe(false);
    expect(manifest.permissions).toEqual(['artifact:read', 'artifact:draft']);
    expect(JSON.stringify(manifest)).not.toMatch(/key|token|secret|password/i);
  });

  it('blueprint_validate accepts a valid Blueprint and returns the normalized contract value', async () => {
    // Build the blueprint the same way the service does: from the live legacy fixture.
    const legacy = fixture('legacy_config.json');
    const blueprint = {
      schemaVersion: '1.0',
      blueprintId: 'bp-mcp-smoke',
      audience: { gradeLevel: '5th Grade', language: 'English' },
      lessonDNA: legacy.lessonDNA,
      globalSettings: legacy.globalSettings,
      plan: legacy.resourcePlan,
    };
    const result = await callTool('blueprint_validate', { blueprint });
    expect(result.isError).toBe(false);
    expect(result.structuredContent.ok).toBe(true);
    expect(result.structuredContent.value.plan[0].tool).toBe('analysis');
    expect(result.structuredContent.requiredCapabilities).toEqual(['imageGeneration', 'text']);
  });

  it('blueprint_validate fails closed on unknown tools and secret-like fields', async () => {
    const bad = await callTool('blueprint_validate', {
      blueprint: { schemaVersion: '1.0', blueprintId: 'bp-bad', plan: [{ tool: 'invented' }], apiKey: 'sk-x' },
    });
    expect(bad.isError).toBe(false); // tool ran fine; the CONTRACT says no
    expect(bad.structuredContent.ok).toBe(false);
    const codes = bad.structuredContent.errors.map((e) => e.code);
    expect(codes).toContain('unknown-tool');
    expect(codes).toContain('secret-like-field');
  });

  it('artifact_validate works end to end', async () => {
    const good = await callTool('artifact_validate', {
      artifact: { schemaVersion: '1.0', artifactId: 'art-1', type: 'quiz', title: 'Quiz', data: { questions: [] } },
    });
    expect(good.structuredContent.ok).toBe(true);
    const bad = await callTool('artifact_validate', {
      artifact: { schemaVersion: '0.9', artifactId: 'art-2', type: 'nope' },
    });
    expect(bad.structuredContent.ok).toBe(false);
  });

  it('returns clean protocol errors for unknown methods, unknown tools, and bad params', async () => {
    const noMethod = await request('resources/list', {});
    expect(noMethod.error.code).toBe(-32601);
    const noTool = await request('tools/call', { name: 'blueprint_execute', arguments: {} });
    expect(noTool.error.code).toBe(-32602);
    const badParams = await request('tools/call', { name: 'blueprint_validate', arguments: { blueprint: 'not-an-object' } });
    expect(badParams.error.code).toBe(-32602);
  });

  it('answers malformed JSON with -32700 and never breaks the session', async () => {
    const errPromise = expectNullIdError();
    child.stdin.write('this is not json\n');
    const err = await errPromise;
    expect(err.error.code).toBe(-32700);
    const ping = await request('ping', {});
    expect(ping.result).toEqual({});
  });

  it('kept stdout protocol-clean (no stray non-JSON-RPC output)', () => {
    expect(stray).toEqual([]);
  });
});
