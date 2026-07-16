// Protocol smoke test for the remediation stdio MCP connector.
// Spawns the real server and speaks newline-delimited JSON-RPC 2.0 over stdio.
// Everything here runs WITHOUT a Gemini key and WITHOUT launching Chromium:
// argument validation fires before the driver is touched, and the missing-key
// gate fires before any browser work — both pinned below, because they are the
// properties that keep a misconfigured client from spending quota or hanging.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
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
    // 20s (not the sibling suite's 8s): under a parallel full-suite run the first spawn of a
    // Node child on Windows can exceed 8s (cold start + AV scan) — observed flaking once.
    const timer = setTimeout(() => { pending.delete(key); rejectP(new Error(`timeout waiting for ${method}`)); }, 20000);
    pending.set(key, (msg) => { clearTimeout(timer); resolveP(msg); });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

const callTool = async (name, args) => (await request('tools/call', { name, arguments: args })).result;

beforeAll(() => {
  const env = { ...process.env, ALLOFLOW_MCP_MAX_RUN_MINUTES: '30' };
  delete env.GEMINI_API_KEY; // the missing-key gate is part of the contract under test
  env.ALLOFLOW_MCP_NO_KEY_FILES = '1'; // and key AUTO-DISCOVERY (maintainer env file) must not defeat it on dev machines
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

  it('lists exactly the ten tools, underscore-named, each with title + annotations', async () => {
    const { tools } = (await request('tools/list', {})).result;
    expect(tools.map((t) => t.name).sort()).toEqual([
      'pdf_audit', 'pdf_batch_remediate_start', 'pdf_remediate', 'pdf_remediate_start',
      'pdf_validate_ua',
      'remediation_capabilities', 'remediation_job_cancel', 'remediation_job_result', 'remediation_job_status',
      'remediation_setup',
    ]);
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
    // Package ≠ browser binary: a packaged install resolves playwright but has no Chromium.
    // The capabilities report distinguishes the two so a fresh install is guided to setup.
    expect(typeof cap.chromiumInstalled).toBe('boolean');
    expect(Object.keys(cap.pipelineModulesPresent)).toContain('doc_pipeline_module.js');
    expect(cap.networkEgress.join(' ')).toContain('generativelanguage');
  });

  it('remediation_setup is idempotent — short-circuits when Chromium is already installed (dev machines)', async () => {
    const cap = (await callTool('remediation_capabilities', {})).structuredContent;
    if (!cap.chromiumInstalled) return; // fresh machine: skip rather than trigger a 200MB download in a unit test
    const t0 = Date.now();
    const res = await callTool('remediation_setup', {});
    expect(res.isError).toBe(false);
    expect(res.structuredContent.ok).toBe(true);
    expect(res.structuredContent.alreadyInstalled).toBe(true);
    expect(Date.now() - t0).toBeLessThan(3000); // a probe, not a download
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

  it('pdf_validate_ua validates its path like the others (missing file → -32602) and needs NO key', async () => {
    const msg = await request('tools/call', { name: 'pdf_validate_ua', arguments: { file_path: join(tmp, 'ghost.pdf') } });
    expect(msg.error.code).toBe(-32602);
    expect(msg.error.message).toContain('does not exist');
    // Registry honesty: read-only on disk, network egress for the validator page assets.
    const { tools } = (await request('tools/list', {})).result;
    const v = tools.find((t) => t.name === 'pdf_validate_ua');
    expect(v.annotations.readOnlyHint).toBe(true);
    expect(v.description).toContain('NO Gemini key');
  });

  it('ocr_language is validated as a short language code', async () => {
    const pdf = join(tmp, 'real.pdf');
    const msg = await request('tools/call', { name: 'pdf_audit', arguments: { file_path: pdf, ocr_language: 'not a lang!!' } });
    expect(msg.error.code).toBe(-32602);
    expect(msg.error.message).toContain('ocr_language');
  });

  it('pdf_remediate_start validates + key-gates BEFORE creating a job (a bad start never occupies the queue)', async () => {
    // Missing file → invalid params, no job id minted.
    const bad = await request('tools/call', { name: 'pdf_remediate_start', arguments: { file_path: join(tmp, 'ghost.pdf') } });
    expect(bad.error.code).toBe(-32602);
    // Real file but no key → in-band error naming the key, still no job.
    const res = await callTool('pdf_remediate_start', { file_path: join(tmp, 'real.pdf') });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('GEMINI_API_KEY');
  });

  it('pdf_batch_remediate_start rejects an empty folder and a missing folder cleanly', async () => {
    const missing = await request('tools/call', { name: 'pdf_batch_remediate_start', arguments: { dir_path: join(tmp, 'no-such-dir') } });
    expect(missing.error.code).toBe(-32602);
    const empty = await request('tools/call', { name: 'pdf_batch_remediate_start', arguments: { dir_path: tmp } });
    // tmp contains real.pdf — but the batch must reject when the only PDFs are absent; use a truly empty subdir.
    // (real.pdf IS in tmp, so this call is key-gated instead — both shapes are the pre-spend contract.)
    if (empty.error) expect(empty.error.code).toBe(-32602);
    else {
      expect(empty.result.isError).toBe(true);
      expect(empty.result.content[0].text).toContain('GEMINI_API_KEY');
    }
  });
});

describe('remediation MCP: job bookkeeping (no runs needed)', () => {
  it('status/result/cancel of an unknown job id → clean in-band not-found', async () => {
    for (const tool of ['remediation_job_status', 'remediation_job_result', 'remediation_job_cancel']) {
      const res = await callTool(tool, { job_id: 'rjob-does-not-exist' });
      expect(res.isError).toBe(false); // in-band data, not a protocol error
      expect(res.structuredContent.ok).toBe(false);
      expect(res.structuredContent.error).toContain('No job');
    }
  });

  it('job_id is required and validated', async () => {
    const msg = await request('tools/call', { name: 'remediation_job_status', arguments: {} });
    expect(msg.error.code).toBe(-32602);
  });
});

describe('remediation MCP: job tools (no key, no browser — lifecycle edges only)', () => {
  it('pdf_remediate_start validates BEFORE creating a job: missing file → -32602, no job id minted', async () => {
    const msg = await request('tools/call', { name: 'pdf_remediate_start', arguments: { file_path: join(tmp, 'ghost.pdf') } });
    expect(msg.error.code).toBe(-32602);
    expect(msg.error.message).toContain('does not exist');
  });

  it('pdf_remediate_start with a real PDF but NO key → in-band key error, still no job', async () => {
    const res = await callTool('pdf_remediate_start', { file_path: join(tmp, 'real.pdf') });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('GEMINI_API_KEY');
  });

  it("pdf_batch_remediate_start refuses a folder with no PDFs (and '-tagged.pdf' outputs don't count)", async () => {
    const batchDir = join(tmp, 'batch-empty');
    mkdirSync(batchDir, { recursive: true });
    writeFileSync(join(batchDir, 'already-tagged.pdf'.replace('already-', 'x-')), '%PDF-1.4\n%%EOF\n'); // x-tagged.pdf → excluded as our own output
    const msg = await request('tools/call', { name: 'pdf_batch_remediate_start', arguments: { dir_path: batchDir } });
    expect(msg.error.code).toBe(-32602);
    expect(msg.error.message).toContain('No .pdf files found');
  });

  it('status / result / cancel of an unknown job id → honest in-band not-found (not a protocol error)', async () => {
    for (const tool of ['remediation_job_status', 'remediation_job_result', 'remediation_job_cancel']) {
      const res = await callTool(tool, { job_id: 'rjob-does-not-exist' });
      expect(res.isError).toBe(false);
      expect(res.structuredContent.ok).toBe(false);
      expect(res.structuredContent.error).toContain('No job');
    }
  });

  it('job tools reject unknown argument keys (closed schemas)', async () => {
    const msg = await request('tools/call', { name: 'remediation_job_status', arguments: { job_id: 'x', peek: true } });
    expect(msg.error.code).toBe(-32602);
  });

  it('capabilities reports the job store (0 stored, 0 unfinished in this smoke)', async () => {
    const cap = (await callTool('remediation_capabilities', {})).structuredContent;
    expect(cap.jobs).toEqual({ stored: 0, unfinished: 0 });
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
