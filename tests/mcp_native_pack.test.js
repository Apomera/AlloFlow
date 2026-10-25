import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const server = resolve(root, 'desktop/mcp/alloflow-mcp-stdio.cjs');
const dataDir = mkdtempSync(join(tmpdir(), 'alloflow-native-mcp-'));
const auditPath = join(dataDir, 'agent-core', 'mcp-audit.jsonl');
const catalogIds = Array.from(readFileSync(resolve(root, 'tool_catalog_source.jsx'), 'utf8').matchAll(/\bid: '([^']+)'/g), (match) => match[1]);
let child;
let nextId = 0;
let buffer = '';
let stderr = '';
const pending = new Map();
const stray = [];

function request(method, params, options = {}) {
  const id = ++nextId;
  const expectedId = options.replyId === undefined ? id : options.replyId;
  return new Promise((resolveRequest, rejectRequest) => {
    const timeout = setTimeout(() => { pending.delete(expectedId); rejectRequest(new Error(`${method} timed out: ${stderr.slice(-2000)}`)); }, 15000);
    pending.set(expectedId, {
      resolve: (value) => { clearTimeout(timeout); resolveRequest(value); },
      reject: (error) => { clearTimeout(timeout); rejectRequest(error); },
    });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });
}

async function call(name, arguments_ = {}) {
  const response = await request('tools/call', { name, arguments: arguments_ });
  expect(response.error, JSON.stringify(response.error)).toBeUndefined();
  expect(response.result.isError, JSON.stringify(response.result)).toBe(false);
  return response.result.structuredContent;
}

async function generate(history, requestId) {
  const created = await call('resource_pack_generate', { request: {
    requestId, profile: 'native', title: 'Native format review', sourceTopic: 'Water cycle',
    gradeLevel: '6th Grade', language: 'en', learningGoal: 'Explain a claim using evidence.',
    privacy: { confirmNoStudentPii: true, confirmSourcePermission: true }, history,
  } });
  const result = await call('job_get_result', { jobId: created.job.jobId });
  expect(result.ok).toBe(true);
  return result.result.pack;
}

beforeAll(async () => {
  child = spawn(process.execPath, [server], { cwd: root, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, ALLOFLOW_MCP_DATA_DIR: dataDir, ALLOFLOW_MCP_MANIFEST_PATH: '' } });
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-8000); });
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    let newline;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      if (!line.trim()) continue;
      let message;
      try { message = JSON.parse(line); } catch { stray.push(line.slice(0, 200)); continue; }
      if (message.jsonrpc !== '2.0' || !pending.has(message.id)) { stray.push(line.slice(0, 200)); continue; }
      const waiter = pending.get(message.id);
      pending.delete(message.id);
      waiter.resolve(message);
    }
  });
  const rejectPending = (error) => { for (const waiter of pending.values()) waiter.reject(error); pending.clear(); };
  child.on('error', rejectPending);
  child.on('exit', (code) => rejectPending(new Error(`MCP exited (${code}): ${stderr}`)));
  const initialized = await request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'native-pack-test', version: '1.0' } });
  expect(initialized.error, stderr).toBeUndefined();
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })}\n`);
}, 20000);

afterAll(async () => {
  if (child && child.exitCode === null && child.signalCode === null) {
    await new Promise((resolveExit) => { child.once('exit', resolveExit); child.kill(); });
  }
  rmSync(dataDir, { recursive: true, force: true });
  expect(stray).toEqual([]);
});

describe('MCP native AlloPack authoring', () => {
  it('allows bounded transport headroom for atomic frame attachments and rejects lines above 5M characters', async () => {
    // Ping isolates the transport boundary from the smaller pack/media budgets.
    const within = await request('ping', { padding: 'x'.repeat(4100000) });
    expect(within.result).toEqual({});
    const oversized = await request('ping', { padding: 'x'.repeat(5000001) }, { replyId: null });
    expect(oversized.error).toMatchObject({ code: -32600, message: 'Message too large' });
    expect((await request('ping', {})).result).toEqual({});
  });

  it('advertises native throughout the workflow while keeping existing default profiles', async () => {
    const response = await request('tools/list', {});
    const tools = response.result.tools;
    const discovery = tools.find((tool) => tool.name === 'resource_pack_capabilities');
    expect(discovery.annotations.readOnlyHint).toBe(true);
    expect(discovery.inputSchema.properties.profile.default).toBe('native');
    for (const name of ['resource_pack_validate', 'resource_pack_preview', 'resource_pack_export']) {
      const profile = tools.find((tool) => tool.name === name).inputSchema.properties.profile;
      expect(profile.enum).toEqual(['text', 'illustrated', 'native']);
      expect(profile.default).toBe('text');
    }
    const generation = tools.find((tool) => tool.name === 'resource_pack_generate').inputSchema.properties.request;
    expect(generation.properties.profile.default).toBe('text');
    expect(generation.properties.history.items.properties.type.enum).toEqual(expect.arrayContaining(catalogIds));
    const attachment = tools.find((tool) => tool.name === 'resource_pack_attach_image').inputSchema;
    expect(attachment.properties.profile.enum).toEqual(['illustrated', 'native']);
    expect(attachment.properties.attachment.properties.slot.enum).toEqual(expect.arrayContaining(['single', 'timeline', 'frame', 'override', 'memory', 'challenge']));
    expect(attachment.properties.attachment.properties.playbackDataUrl.type).toBe('string');
  });

  it('discovers all catalog formats and examples without changing provider capabilities or writing audit data', async () => {
    const auditBefore = existsSync(auditPath) ? readFileSync(auditPath, 'utf8') : '';
    const providersBefore = await call('capabilities');
    const formats = await call('resource_pack_capabilities');
    expect(formats.ok).toBe(true);
    expect(formats.profile).toBe('native');
    expect(formats.resourceTypes).toEqual(expect.arrayContaining([...catalogIds, 'directions', 'udl-advice', 'word-sounds']));
    expect(new Set(formats.contracts.map(({ type }) => type))).toEqual(new Set(formats.resourceTypes));
    for (const contract of formats.contracts) {
      expect(contract.description).toEqual(expect.any(String));
      expect(contract.example).toMatchObject({ id: expect.any(String), type: contract.type, title: expect.any(String) });
      expect(contract.example.data).toBeDefined();
    }
    expect(formats.limits).toBeDefined();
    expect(formats.attachmentSlots).toBeDefined();
    expect(formats.limitations.length).toBeGreaterThan(0);
    expect(await call('capabilities')).toEqual(providersBefore);
    expect(existsSync(auditPath) ? readFileSync(auditPath, 'utf8') : '').toBe(auditBefore);
  });

  it('keeps discovery truthful for text and illustrated and rejects an invalid profile', async () => {
    const text = await call('resource_pack_capabilities', { profile: 'text' });
    const illustrated = await call('resource_pack_capabilities', { profile: 'illustrated' });
    expect(text.resourceTypes).toHaveLength(12);
    expect(illustrated.resourceTypes).toHaveLength(15);
    expect(text.resourceTypes).not.toContain('image');
    expect(illustrated.resourceTypes).toContain('image');
    expect(illustrated.resourceTypes).not.toContain('brainstorm');
    const invalid = await request('tools/call', { name: 'resource_pack_capabilities', arguments: { profile: 'all' } });
    expect(invalid.error.code).toBe(-32602);
    const extra = await request('tools/call', { name: 'resource_pack_capabilities', arguments: { profile: 'native', provider: 'automatic' } });
    expect(extra.error.code).toBe(-32602);
  });

  it('generates, validates, previews and exports every discovered native example through real stdio', async () => {
    const formats = await call('resource_pack_capabilities');
    const history = formats.contracts.map(({ example }, index) => ({ ...example, id: `native-format-${index}` }));
    const seen = [];
    for (let start = 0; start < history.length; start += 24) {
      const batch = history.slice(start, start + 24);
      const pack = await generate(batch, `native-roundtrip-${start}`);
      pack.editorialReview = { status: 'draft', sourceLink: 'https://example.org/source', notes: ['Teacher review required.'] };
      pack.history[0].provenanceNote = 'Author-supplied example; not an assessment result.';
      const validated = await call('resource_pack_validate', { pack, profile: 'native' });
      expect(validated.ok, JSON.stringify(validated.errors)).toBe(true);
      expect(validated.value).toEqual(pack);
      const preview = await call('resource_pack_preview', { pack, profile: 'native' });
      expect(preview.ok, JSON.stringify(preview.errors)).toBe(true);
      expect(preview.resources.map(({ id }) => id)).toEqual(batch.map(({ id }) => id));
      const exported = await call('resource_pack_export', { pack, profile: 'native' });
      expect(JSON.parse(exported.json)).toEqual(pack);
      seen.push(...pack.history.map(({ type }) => type));
    }
    expect(new Set(seen)).toEqual(new Set(formats.resourceTypes));
  }, 60000);

  it('attaches an image to a native timeline target and preserves the full envelope', async () => {
    const formats = await call('resource_pack_capabilities');
    const timeline = formats.contracts.find(({ type }) => type === 'timeline').example;
    const pack = await generate([timeline], 'native-timeline-attachment');
    pack.attribution = { author: 'Example author', license: 'Classroom review draft' };
    const illustrated = JSON.parse(readFileSync(resolve(root, 'allopacks/illustrated/water_cycle_grade6.allopack.json'), 'utf8'));
    const image = illustrated.history.find(({ type }) => type === 'glossary').data[0].image;
    const attached = await call('resource_pack_attach_image', { pack, profile: 'native', attachment: {
      resourceId: timeline.id, slot: 'timeline', index: 0, dataUrl: image,
      alt: 'Two views of pavement show a puddle becoming smaller.', altSource: 'author',
    } });
    expect(attached.ok, JSON.stringify(attached.errors)).toBe(true);
    expect(attached.value.history[0].data.items[0].image).toBe(image);
    expect(attached.value.attribution).toEqual(pack.attribution);
    expect(pack.history[0].data.items[0].image).not.toBe(image);
    const exported = await call('resource_pack_export', { pack: attached.value, profile: 'native' });
    expect(JSON.parse(exported.json)).toEqual(attached.value);
    const audit = readFileSync(auditPath, 'utf8');
    expect(audit).not.toContain(image);
    expect(audit).not.toContain('puddle becoming smaller');
  }, 30000);

  it('does not silently widen older validators or admit unknown native resource types', async () => {
    const formats = await call('resource_pack_capabilities');
    const analysis = formats.contracts.find(({ type }) => type === 'analysis').example;
    const pack = await generate([analysis], 'native-profile-restrictions');
    for (const profile of [undefined, 'text', 'illustrated']) {
      const report = await call('resource_pack_validate', { pack, ...(profile ? { profile } : {}) });
      expect(report.ok).toBe(false);
    }
    pack.history[0].type = 'unsupported-widget';
    const unknown = await call('resource_pack_validate', { pack, profile: 'native' });
    expect(unknown.ok).toBe(false);
    expect(unknown.errors.length).toBeGreaterThan(0);
  });
});
