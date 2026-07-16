// Protocol smoke test for the remediation stdio MCP connector.
// Spawns the real server and speaks newline-delimited JSON-RPC 2.0 over stdio.
// Everything here runs WITHOUT a Gemini key and WITHOUT launching Chromium:
// argument validation fires before the driver is touched, and the missing-key
// gate fires before any browser work — both pinned below, because they are the
// properties that keep a misconfigured client from spending quota or hanging.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SERVER = resolve(process.cwd(), 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs');
const tmp = mkdtempSync(join(tmpdir(), 'alloflow-remediation-mcp-'));

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

const callTool = async (name, args) => (await request('tools/call', { name, arguments: args })).result;

beforeAll(() => {
  const env = { ...process.env, ALLOFLOW_MCP_MAX_RUN_MINUTES: '30' };
  delete env.GEMINI_API_KEY; // the missing-key gate is part of the contract under test
  child = spawn(process.execPath, [SERVER], { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'], env });
  child.stdout.setEncoding('utf-8');
  child.stdout.on('data', onStdout);
});

afterAll(() => {
  if (child) child.kill();
  rmSync(tmp, { recursive: true, force: true });
});

describe('remediation MCP: protocol + tool registry', () => {
  it('initializes with server info and instructions', async () => {
    const res = (await request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } })).result;
    expect(res.protocolVersion).toBe('2025-06-18');
    expect(res.serverInfo.name).toBe('alloflow-remediation');
    expect(res.instructions).toContain('remediation_capabilities');
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  });

  it('lists exactly the three tools, underscore-named, each with title + annotations', async () => {
    const { tools } = (await request('tools/list', {})).result;
    expect(tools.map((t) => t.name).sort()).toEqual(['pdf_audit', 'pdf_remediate', 'remediation_capabilities']);
    for (const t of tools) {
      expect(t.name).not.toContain('.');
      expect(t.title).toBeTruthy();
      expect(typeof t.annotations.readOnlyHint).toBe('boolean');
      expect(t.annotations.destructiveHint).toBe(false);
      expect(t.inputSchema.additionalProperties).toBe(false);
    }
    const remediate = tools.find((t) => t.name === 'pdf_remediate');
    expect(remediate.annotations.readOnlyHint).toBe(false); // it writes output files
    expect(remediate.annotations.openWorldHint).toBe(true); // and sends content to the network
    const audit = tools.find((t) => t.name === 'pdf_audit');
    expect(audit.annotations.readOnlyHint).toBe(true);
    expect(audit.annotations.openWorldHint).toBe(true); // read-only on disk, but network egress
  });

  it('remediation_capabilities reports an HONEST not-ready environment (no key in this smoke)', async () => {
    const res = await callTool('remediation_capabilities', {});
    expect(res.isError).toBe(false);
    const cap = res.structuredContent;
    expect(cap.geminiKeyPresent).toBe(false);
    expect(cap.ready).toBe(false); // must not claim ready without a key
    expect(typeof cap.playwrightAvailable).toBe('boolean');
    expect(Object.keys(cap.pipelineModulesPresent)).toContain('doc_pipeline_module.js');
    expect(cap.networkEgress.join(' ')).toContain('generativelanguage');
  });
});

describe('remediation MCP: validation fires BEFORE any browser/quota spend', () => {
  it('pdf_audit on a missing file → clean invalid-params, instantly (no Chromium launch)', async () => {
    const t0 = Date.now();
    const msg = await request('tools/call', { name: 'pdf_audit', arguments: { file_path: join(tmp, 'nope.pdf') } });
    expect(msg.error.code).toBe(-32602);
    expect(msg.error.message).toContain('does not exist');
    expect(Date.now() - t0).toBeLessThan(3000); // validation, not a browser boot
  });

  it('pdf_remediate on a non-.pdf path → clean invalid-params', async () => {
    const txt = join(tmp, 'notes.txt');
    writeFileSync(txt, 'not a pdf');
    const msg = await request('tools/call', { name: 'pdf_remediate', arguments: { file_path: txt } });
    expect(msg.error.code).toBe(-32602);
    expect(msg.error.message).toContain('.pdf');
  });

  it('unknown argument keys are rejected (schema is closed)', async () => {
    const msg = await request('tools/call', { name: 'pdf_audit', arguments: { file_path: join(tmp, 'x.pdf'), extra: true } });
    expect(msg.error.code).toBe(-32602);
    expect(msg.error.message).toContain('unsupported field');
  });

  it('a real PDF but NO GEMINI_API_KEY → in-band tool error naming the key, still no browser', async () => {
    // Minimal valid-header PDF: the validation cares about existence/header/size, not structure.
    const pdf = join(tmp, 'real.pdf');
    writeFileSync(pdf, '%PDF-1.4\n%%EOF\n');
    const t0 = Date.now();
    const res = await callTool('pdf_audit', { file_path: pdf });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('GEMINI_API_KEY');
    expect(Date.now() - t0).toBeLessThan(3000);
  });

  it('ocr_language is validated as a short language code', async () => {
    const pdf = join(tmp, 'real.pdf');
    const msg = await request('tools/call', { name: 'pdf_audit', arguments: { file_path: pdf, ocr_language: 'not a lang!!' } });
    expect(msg.error.code).toBe(-32602);
    expect(msg.error.message).toContain('ocr_language');
  });
});

describe('remediation MCP: protocol hygiene', () => {
  it('unknown tool → -32602; unknown method → -32601; parse error → -32700', async () => {
    expect((await request('tools/call', { name: 'nope' })).error.code).toBe(-32602);
    expect((await request('bogus/method', {})).error.code).toBe(-32601);
    const p = new Promise((resolveP) => { pending.set('null', resolveP); });
    child.stdin.write('this is not json\n');
    expect((await p).error.code).toBe(-32700);
  });

  it('stdout carried ONLY protocol messages', () => {
    expect(stray).toEqual([]);
  });
});
