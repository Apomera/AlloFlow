import { afterAll, describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PassThrough, Writable } from 'node:stream';

const require = createRequire(import.meta.url);
const { LIMITS, BoundedJobs, BoundedInput, BoundedOutput, boundedDiagnostics } = require('../desktop/mcp/agent_core_stdio_security.cjs');
const homes = [], children = [];
const server = resolve('desktop/mcp/alloflow-mcp-stdio.cjs');
const tick = () => new Promise(resolve => setImmediate(resolve));
const manifest = permissions => ({ schemaVersion: '1.0', deploymentMode: 'desktop-local', permissions });

async function launch(configuration) {
  const home = mkdtempSync(join(tmpdir(), 'alloflow-security-')); homes.push(home);
  const env = { ...process.env, ALLOFLOW_MCP_DATA_DIR: home };
  delete env.ALLOFLOW_MCP_MANIFEST_PATH;
  if (configuration !== undefined) {
    env.ALLOFLOW_MCP_MANIFEST_PATH = join(home, 'manifest.json');
    writeFileSync(env.ALLOFLOW_MCP_MANIFEST_PATH, typeof configuration === 'string' ? configuration : JSON.stringify(configuration));
  }
  const child = spawn(process.execPath, [server], { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'], env }); children.push(child);
  let output = '', stderr = '', sequence = 0;
  const messages = [], waiters = [];
  child.stderr.setEncoding('utf8'); child.stderr.on('data', text => { stderr += text; });
  child.stdout.setEncoding('utf8'); child.stdout.on('data', text => {
    output += text;
    let at;
    while ((at = output.indexOf('\n')) >= 0) {
      const line = output.slice(0, at); output = output.slice(at + 1);
      if (!line) continue;
      const message = JSON.parse(line);
      const index = waiters.findIndex(waiter => waiter.predicate(message));
      if (index >= 0) { const waiter = waiters.splice(index, 1)[0]; clearTimeout(waiter.timer); waiter.resolve(message); }
      else messages.push(message);
    }
  });
  function next(predicate = () => true) {
    const index = messages.findIndex(predicate);
    if (index >= 0) return Promise.resolve(messages.splice(index, 1)[0]);
    return new Promise((resolve, reject) => {
      const waiter = { predicate, resolve, timer: setTimeout(() => { const at = waiters.indexOf(waiter); if (at >= 0) waiters.splice(at, 1); reject(new Error('MCP response timeout')); }, 10000) };
      waiters.push(waiter);
    });
  }
  function raw(value) { child.stdin.write(typeof value === 'string' ? value : JSON.stringify(value) + '\n'); }
  function request(method, params, id = ++sequence) { const response = next(message => message.id === id); raw({ jsonrpc: '2.0', id, method, ...(params === undefined ? {} : { params }) }); return response; }
  const api = { child, home, raw, next, request, call: (name, args = {}) => request('tools/call', { name, arguments: args }), stderr: () => stderr, messages };
  await request('initialize', { protocolVersion: '2025-06-18' });
  return api;
}

afterAll(() => {
  for (const child of children) child.kill();
  for (const home of homes) rmSync(home, { recursive: true, force: true });
});

describe('Agent Core MCP security boundaries', () => {
  it('rejects active SVG over the real MCP while preserving static diagrams and publishing their contract', async () => {
    const api = await launch();
    const pack = { allopack: { spec: '0.1', title: 'Diagram', language: 'English', gradeLevel: '6', createdAt: '2026-10-23' }, sourceTopic: 'Triangle', history: [{ id: 'graph-one', type: 'math', title: 'Diagram', data: { problem: 'Compare its sides.', answer: 'Use the diagram.', steps: [], graphData: '<svg><image href="https://example.invalid/audit.png"/></svg>' } }] };
    const validation = (await api.call('resource_pack_validate', { pack, profile: 'native' })).result.structuredContent;
    expect(validation.ok).toBe(false);
    expect(validation.errors.some(error => error.code === 'unsafe-math-graph')).toBe(true);
    const rejectedExport = await api.call('resource_pack_export', { pack, profile: 'native' });
    expect(rejectedExport.error.code).toBe(-32602);
    expect(rejectedExport.error.message).toContain('unsafe-math-graph');
    const capabilities = (await api.call('resource_pack_capabilities', { profile: 'native' })).result.structuredContent;
    const contract = capabilities.contracts.find(entry => entry.type === 'math').graphData;
    expect(contract.format).toBe('static-svg');
    pack.history[0].data.graphData = contract.example;
    expect((await api.call('resource_pack_export', { pack, profile: 'native' })).result.structuredContent.ok).toBe(true);
  });

  it('rejects inherited and non-string tool names and malformed call arguments', async () => {
    const api = await launch();
    for (const name of ['constructor', 'toString', '__proto__', 'hasOwnProperty', ['capabilities'], { toString: 'capabilities' }, 1, null]) {
      expect((await api.call(name)).error?.code).toBe(-32602);
    }
    for (const args of [null, false, 0, [], 'unchecked']) expect((await api.call('capabilities', args)).error?.code).toBe(-32602);
    expect((await api.call('capabilities')).result.structuredContent.permissions).toEqual(['artifact:read', 'artifact:draft']);
  });

  it('rejects invalid JSON-RPC envelopes without echoing arbitrary invalid IDs', async () => {
    const api = await launch();
    for (const value of [[], null, { jsonrpc: '2.0', id: { private: 'synthetic-note' }, method: 'ping' }, { jsonrpc: '2.0', id: 9, method: [] }, { jsonrpc: '2.0', id: 9, method: 'ping', params: [] }, { jsonrpc: '2.0', id: null, method: 'ping' }, { jsonrpc: '2.0', id: 'x'.repeat(129), method: 'ping' }]) {
      const response = api.next(); api.raw(value);
      const rejected = await response; expect(rejected.error.code).toBe(-32600); expect(JSON.stringify(rejected)).not.toContain('synthetic-note');
    }
    expect((await api.request('ping')).result).toEqual({});
  });

  it('rejects duplicate active IDs while keeping numeric and string IDs distinct', async () => {
    const api = await launch();
    const create = { jsonrpc: '2.0', id: 77, method: 'tools/call', params: { name: 'blueprint_create', arguments: { request: { blueprintId: 'duplicate-request', plan: ['analysis'] } } } };
    const first = api.next(message => message.id === 77 && !!message.result);
    const duplicate = api.next(message => message.id === 77 && !!message.error);
    const distinct = api.next(message => message.id === '77');
    api.raw([create, { jsonrpc: '2.0', id: 77, method: 'ping' }, { jsonrpc: '2.0', id: '77', method: 'ping' }].map(message => JSON.stringify(message)).join('\n') + '\n');
    expect((await duplicate).error.code).toBe(-32600);
    expect((await first).result.structuredContent.job.status).toBe('completed');
    expect((await distinct).result).toEqual({});
  });

  it('enforces every configured read/draft scope and hides disallowed tools', async () => {
    const read = await launch(manifest(['artifact:read']));
    const tools = (await read.request('tools/list')).result.tools;
    expect(tools.every(tool => tool.annotations.readOnlyHint)).toBe(true);
    for (const name of ['blueprint_create', 'blueprint_revise', 'resource_pack_generate', 'resource_pack_export', 'resource_pack_attach_image', 'job_cancel']) expect((await read.call(name)).error?.code).toBe(-32003);
    expect((await read.call('resource_pack_capabilities')).result.structuredContent.ok).toBe(true);
    const draft = await launch(manifest(['artifact:draft']));
    expect((await draft.call('artifact_validate')).error?.code).toBe(-32003);
    expect((await draft.call('blueprint_create', { request: { blueprintId: 'scoped-draft', plan: ['analysis'] } })).result.structuredContent.job.status).toBe('completed');
    for (const invalid of ['not-json', { schemaVersion: '0.0', permissions: ['artifact:draft'] }]) {
      const denied = await launch(invalid);
      expect((await denied.call('capabilities')).result.structuredContent.permissions).toEqual([]);
      expect((await denied.request('tools/list')).result.tools.map(tool => tool.name)).toEqual(['capabilities']);
      expect((await denied.call('blueprint_create')).error?.code).toBe(-32003);
    }
  });

  it('rejects both character and UTF-8 byte overflow before a newline and recovers', async () => {
    const api = await launch();
    for (const payload of [' '.repeat(LIMITS.lineChars + 1), '😀'.repeat(Math.floor(LIMITS.lineBytes / 4) + 1)]) {
      const response = api.next(message => message.id === null); api.raw(payload);
      expect((await response).error).toMatchObject({ code: -32600, message: 'Message too large' });
      api.raw('\n');
      expect((await api.request('ping')).result).toEqual({});
    }
  }, 30000);

  it('rejects oversized plans/directives and bounds reported diagnostics', async () => {
    const api = await launch();
    expect((await api.call('blueprint_create', { request: { blueprintId: 'wide', plan: Array(LIMITS.planSteps + 1).fill('quiz') } })).error?.code).toBe(-32602);
    expect((await api.call('blueprint_validate', { blueprint: { schemaVersion: '1.0', blueprintId: 'long', plan: [{ tool: 'quiz', directive: 'a'.repeat(LIMITS.directiveChars + 1) }] } })).error?.code).toBe(-32602);
    expect((await api.call('blueprint_revise', { blueprint: { schemaVersion: '1.0', blueprintId: 'long', plan: [{ tool: 'quiz' }] }, changes: { setDirectives: { quiz: 'a'.repeat(LIMITS.directiveChars + 1) } } })).error?.code).toBe(-32602);
    const blueprint = { schemaVersion: '1.0', blueprintId: 'invalid', plan: [{ tool: 'quiz' }], audience: Object.fromEntries(Array.from({ length: 150 }, (_, n) => [`api_key_${n}_token`, 'not-retained'])) };
    const report = (await api.call('blueprint_validate', { blueprint })).result.structuredContent;
    expect(report.errors.length).toBeLessThanOrEqual(LIMITS.diagnostics + 1);
    expect(report.errors.at(-1).code).toBe('diagnostics-truncated');
    expect(JSON.stringify(report)).not.toContain('not-retained');
  });

  it('rejects invalid UTF-8 without silently changing request content, then recovers', async () => {
    const api = await launch();
    const response = api.next(message => message.id === null);
    api.child.stdin.write(Buffer.concat([Buffer.from('{"jsonrpc":"2.0","id":"damaged-'), Buffer.from([255]), Buffer.from('","method":"ping"}\n')]));
    expect((await response).error).toMatchObject({ code: -32700, message: 'Invalid UTF-8 message' });
    const unicodeId = '日本語-العربية-é-🌱';
    const valid = api.next(message => message.id === unicodeId);
    const bytes = Buffer.from(JSON.stringify({ jsonrpc: '2.0', id: unicodeId, method: 'ping' }) + '\n');
    for (const byte of bytes) api.child.stdin.write(Buffer.from([byte]));
    expect((await valid).result).toEqual({});
    expect(api.messages.some(message => String(message.id).includes('damaged'))).toBe(false);
  });

  it('bounds structural validation and finishes responses when stdin ends without a final newline', async () => {
    const api = await launch();
    const artifact = { schemaVersion: '1.0', artifactId: 'bounded', type: 'allopack', data: Array(50001).fill(0) };
    expect((await api.call('artifact_validate', { artifact })).error?.code).toBe(-32602);
    artifact.data = {}; let cursor = artifact.data;
    for (let index = 0; index < 34; index++) { cursor.child = {}; cursor = cursor.child; }
    expect((await api.call('artifact_validate', { artifact })).error?.code).toBe(-32602);
    const response = api.next(message => message.id === 'eof-ping');
    api.child.stdin.end(JSON.stringify({ jsonrpc: '2.0', id: 'eof-ping', method: 'ping' }));
    expect((await response).result).toEqual({});
  });

  it('hashes unknown job IDs and cancellation request IDs; rotates bounded audit history', async () => {
    const api = await launch();
    const auditDir = join(api.home, 'agent-core'); mkdirSync(auditDir, { recursive: true });
    const auditPath = join(auditDir, 'mcp-audit.jsonl');
    writeFileSync(auditPath, 'a'.repeat(LIMITS.auditBytes));
    writeFileSync(auditPath + '.1', 'old-one\n'); writeFileSync(auditPath + '.2', 'old-two\n');
    await api.call('job_cancel', { jobId: 'synthetic-private-note-never-log' });
    const audit = readFileSync(auditPath, 'utf8');
    expect(audit).not.toContain('synthetic-private-note-never-log');
    expect(JSON.parse(audit).jobRef).toMatch(/^sha256:[a-f0-9]{16}$/);
    expect(readFileSync(auditPath + '.2', 'utf8')).toBe('old-one\n');
    expect(readdirSync(auditDir)).toHaveLength(LIMITS.auditFiles);
    for (const file of readdirSync(auditDir)) expect(statSync(join(auditDir, file)).size).toBeLessThanOrEqual(LIMITS.auditBytes);
    const privateId = 'synthetic-private-request-id';
    api.raw(JSON.stringify({ jsonrpc: '2.0', id: privateId, method: 'tools/call', params: { name: 'blueprint_create', arguments: { request: { blueprintId: 'cancel-test', plan: ['analysis'] } } } }) + '\n' + JSON.stringify({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: privateId } }) + '\n');
    await api.request('ping');
    expect(api.stderr()).not.toContain(privateId);
    expect(api.stderr()).toContain('cancellation requested for request sha256:');
  });

  it('retains Katie’s complete native pack through large validation/export responses', async () => {
    const api = await launch();
    const pack = JSON.parse(readFileSync(resolve('allopacks/academic_discourse_reading_space_grade6.allopack.json'), 'utf8'));
    const validated = (await api.call('resource_pack_validate', { pack, profile: 'native' })).result.structuredContent;
    expect(validated.ok, JSON.stringify(validated.errors)).toBe(true);
    expect(validated.value).toEqual(pack);
    const exported = (await api.call('resource_pack_export', { pack, profile: 'native' })).result.structuredContent;
    expect(JSON.parse(exported.json)).toEqual(pack);
  }, 30000);
});

describe('bounded transport and storage primitives', () => {
  it('discards malformed UTF-8 frames and reports an incomplete final character once', async () => {
    const stream = new PassThrough(), seen = []; let malformed = 0;
    new BoundedInput(stream, { dispatch: line => seen.push(line), oversized: () => { throw Error('unexpected size rejection'); }, malformed: () => malformed++ });
    const malformedBytes = [[0x80], [0xc0,0xaf], [0xed,0xa0,0x80], [0xf4,0x90,0x80,0x80]];
    for (const sequence of malformedBytes) stream.write(Buffer.concat([Buffer.from('invalid:'),Buffer.from(sequence),Buffer.from('\n')]));
    const expected = 'valid: 日本語 العربية café 🌱 �';
    for (const byte of Buffer.from(expected + '\r\n')) stream.write(Buffer.from([byte]));
    stream.end(Buffer.from([0xf0,0x9f]));
    await tick(); await tick();
    expect(malformed).toBe(5);
    expect(seen).toEqual([expected + '\r']);
  });

  it('evicts by bytes/count, expires idle records, and refuses a single oversized record before commit', () => {
    let now = 0;
    const jobs = new BoundedJobs({ ...LIMITS, jobs: 2, jobBytes: 300, totalJobBytes: 350, jobTtlMs: 100 }, () => now);
    const record = (id, size) => ({ job: { jobId: id }, result: 'a'.repeat(size) });
    jobs.prepare(record('one', 120))(); jobs.prepare(record('two', 120))();
    expect(jobs.get('one')).toBeDefined(); jobs.prepare(record('three', 120))();
    expect(jobs.get('one')).toBeUndefined(); expect(jobs.bytes).toBeLessThanOrEqual(350);
    expect(() => jobs.prepare(record('huge', 400))).toThrow(/storage limit/);
    now = 101; jobs.sweep(); expect(jobs.bytes).toBe(0); expect(jobs.records.size).toBe(0);
    const byteBound = new BoundedJobs({ ...LIMITS, jobs: 10, jobBytes: 300, totalJobBytes: 250 });
    byteBound.prepare(record('one', 120))(); byteBound.prepare(record('two', 120))();
    expect(byteBound.records.size).toBe(1); expect(byteBound.get('one')).toBeUndefined();
    const countBound = new BoundedJobs({ ...LIMITS, jobs: 1 });
    countBound.prepare(record('one', 1))(); countBound.prepare(record('two', 1))();
    expect(countBound.records.size).toBe(1); expect(countBound.get('one')).toBeUndefined();
  });

  it('pauses input at queue capacity, bounds active work, and resumes every queued request', async () => {
    const stream = new PassThrough(); const releases = [], seen = [];
    const limits = { ...LIMITS, lineChars: 100, lineBytes: 100, activeRequests: 2, queuedRequests: 3, queuedBytes: 300 };
    const input = new BoundedInput(stream, { limits, dispatch: line => new Promise(resolve => { seen.push(line); releases.push(resolve); }), oversized: () => { throw new Error('unexpected size failure'); } });
    stream.write(Array.from({ length: 20 }, (_, n) => `request-${n}\n`).join('')); await tick();
    expect(input.active).toBe(2); expect(input.queue.length).toBe(3); expect(stream.isPaused()).toBe(true);
    expect(input.queuedBytes).toBeLessThanOrEqual(limits.queuedBytes);
    while (seen.length < 20 || input.active) { releases.splice(0).forEach(resolve => resolve()); await tick(); }
    expect(seen).toHaveLength(20); expect(input.queue).toHaveLength(0); stream.end();
  });

  it('does not accumulate writes past the output bound and observes slow-reader backpressure', async () => {
    const callbacks = [], pressures = []; let fatal = 0;
    const stream = new Writable({ highWaterMark: 8, write(_chunk, _encoding, done) { callbacks.push(done); } });
    const output = new BoundedOutput(stream, { limits: { ...LIMITS, responseBytes: 200, outputBytes: 300 }, pressure: blocked => pressures.push(blocked), fatal: () => fatal++ });
    output.send({ jsonrpc: '2.0', id: 1, result: 'a'.repeat(80) });
    expect(output.blocked).toBe(true); expect(pressures).toContain(true); expect(callbacks).toHaveLength(1);
    output.send({ jsonrpc: '2.0', id: 2, result: 'b'.repeat(80) }); expect(callbacks).toHaveLength(1);
    callbacks.shift()(); await tick(); expect(callbacks).toHaveLength(1);
    callbacks.shift()(); await tick(); expect(output.idle).toBe(true); expect(output.bytes).toBe(0);
    output.send({ jsonrpc: '2.0', id: 3, result: 'a'.repeat(80) });
    output.send({ jsonrpc: '2.0', id: 4, result: 'a'.repeat(80) });
    output.send({ jsonrpc: '2.0', id: 5, result: 'a'.repeat(80) });
    expect(fatal).toBe(1); expect(output.closed).toBe(true); stream.destroy();
  });

  it('replaces an oversized response with a bounded protocol error', async () => {
    const chunks = [];
    const stream = new Writable({ write(chunk, _encoding, done) { chunks.push(chunk.toString()); done(); } });
    const output = new BoundedOutput(stream, { limits: { ...LIMITS, responseBytes: 256, outputBytes: 1024 } });
    output.send({ jsonrpc: '2.0', id: 7, result: 'a'.repeat(1000) }); await tick();
    expect(Buffer.byteLength(chunks[0])).toBeLessThanOrEqual(256);
    expect(JSON.parse(chunks[0])).toMatchObject({ id: 7, error: { code: -32005 } }); stream.end();
  });

  it('caps individual diagnostic fields as well as diagnostic counts', () => {
    const errors = boundedDiagnostics(Array.from({ length: 102 }, () => ({ code: 'bad', message: 'a'.repeat(5000), path: 'b'.repeat(5000) })));
    expect(errors).toHaveLength(101); expect(errors[0].message.length).toBe(512); expect(errors[0].path.length).toBe(512);
    expect(errors.at(-1).code).toBe('diagnostics-truncated');
  });
});
