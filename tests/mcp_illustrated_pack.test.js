import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const server = resolve(root, 'desktop/mcp/alloflow-mcp-stdio.cjs');
const dataDir = mkdtempSync(join(tmpdir(), 'alloflow-illustrated-mcp-'));
const readPack = (slug) => JSON.parse(readFileSync(resolve(root, 'allopacks/illustrated', `${slug}.allopack.json`), 'utf8'));
const pack = readPack('water_cycle_grade6');
let child;
let nextId = 0;
let buffer = '';
let stderr = '';
const pending = new Map();
const stray = [];

function request(method, params) {
  const id = ++nextId;
  return new Promise((resolveRequest, rejectRequest) => {
    const timeout = setTimeout(() => { pending.delete(id); rejectRequest(new Error(`${method} timed out: ${stderr.slice(-2000)}`)); }, 15000);
    pending.set(id, { resolve: (value) => { clearTimeout(timeout); resolveRequest(value); }, reject: (error) => { clearTimeout(timeout); rejectRequest(error); } });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });
}

async function call(name, arguments_) {
  const response = await request('tools/call', { name, arguments: arguments_ });
  expect(response.error, JSON.stringify(response.error)).toBeUndefined();
  expect(response.result).toBeDefined();
  return response.result;
}

beforeAll(async () => {
  child = spawn(process.execPath, [server], { cwd: root, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, ALLOFLOW_MCP_DATA_DIR: dataDir } });
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
  child.on('error', (error) => { for (const waiter of pending.values()) waiter.reject(error); pending.clear(); });
  const initialized = await request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'illustrated-pack-test', version: '1.0' } });
  expect(initialized.error).toBeUndefined();
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })}\n`);
}, 20000);

afterAll(async () => {
  if (child && child.exitCode === null && child.signalCode === null) {
    await new Promise((resolveExit) => { child.once('exit', resolveExit); child.kill(); });
  }
  rmSync(dataDir, { recursive: true, force: true });
  expect(stray).toEqual([]);
});

describe('MCP illustrated AlloPack authoring', () => {
  it('advertises the explicit illustrated profile and bounded native attachment slots', async () => {
    const response = await request('tools/list', {});
    for (const name of ['resource_pack_validate', 'resource_pack_preview', 'resource_pack_export']) {
      const tool = response.result.tools.find((item) => item.name === name);
      expect(tool.inputSchema.properties.profile.enum).toContain('illustrated');
    }
    const attachment = response.result.tools.find((item) => item.name === 'resource_pack_attach_image');
    expect(attachment).toBeDefined();
    expect(attachment.inputSchema.properties.attachment.properties.slot.enum).toEqual(expect.arrayContaining(['glossary', 'panel', 'anchor', 'sort']));
    expect(attachment.inputSchema.properties.attachment.additionalProperties).toBe(false);
  });

  it('validates, previews, and exports a complete published illustrated pack without data loss', async () => {
    const validated = await call('resource_pack_validate', { pack, profile: 'illustrated' });
    expect(validated.isError).toBe(false);
    expect(validated.structuredContent.ok, JSON.stringify(validated.structuredContent.errors)).toBe(true);
    expect(validated.structuredContent.value).toEqual(pack);
    const preview = await call('resource_pack_preview', { pack, profile: 'illustrated' });
    expect(preview.isError).toBe(false);
    expect(preview.structuredContent.resources.map(({ id }) => id)).toEqual(pack.history.map(({ id }) => id));
    const exported = await call('resource_pack_export', { pack, profile: 'illustrated' });
    expect(exported.isError).toBe(false);
    expect(JSON.parse(exported.structuredContent.json)).toEqual(pack);
  }, 30000);

  it('keeps the default text profile restricted', async () => {
    // Stay below the text budget so this checks its media policy specifically.
    const small = structuredClone(pack);
    const glossary = small.history.find((item) => item.type === 'glossary');
    glossary.data = glossary.data.slice(0, 4);
    for (const term of glossary.data.slice(1)) for (const key of ['image', 'imageAlt', 'imageAltSource', 'imageAltHash', 'imageDecorative']) delete term[key];
    small.history = [glossary];
    const report = await call('resource_pack_validate', { pack: small });
    expect(report.structuredContent.ok).toBe(false);
    expect(report.structuredContent.errors.map(({ code }) => code)).toContain('embedded-image-payload');
  });

  it('generates an illustrated draft, attaches supplied image bytes, and exports that exact draft', async () => {
    const glossary = structuredClone(pack.history.find((item) => item.type === 'glossary'));
    const originalImage = glossary.data[0].image;
    glossary.data = glossary.data.slice(0, 4);
    for (const term of glossary.data) for (const key of ['image', 'imageAlt', 'imageAltSource', 'imageAltHash', 'imageDecorative']) delete term[key];
    const generated = await call('resource_pack_generate', { request: {
      requestId: 'mcp-illustrated-roundtrip', title: 'Illustrated water vocabulary', sourceTopic: 'Water cycle',
      gradeLevel: '6th Grade', language: 'en', learningGoal: 'Use pictures to explain water movement.',
      privacy: { confirmNoStudentPii: true, confirmSourcePermission: true }, profile: 'illustrated', history: [glossary],
    } });
    expect(generated.isError, JSON.stringify(generated)).toBe(false);
    const fetched = await call('job_get_result', { jobId: generated.structuredContent.job.jobId });
    const draft = fetched.structuredContent.result.pack;
    expect(draft.history[0].data[0].image).toBeUndefined();
    const attached = await call('resource_pack_attach_image', { pack: draft, profile: 'illustrated', attachment: {
      resourceId: glossary.id, slot: 'glossary', index: 0, dataUrl: originalImage,
      alt: 'Two views of the same pavement show the puddle becoming smaller.', altSource: 'author',
    } });
    expect(attached.isError).toBe(false);
    expect(attached.structuredContent.ok, JSON.stringify(attached.structuredContent.errors)).toBe(true);
    const changed = attached.structuredContent.value;
    expect(changed.history[0].data[0]).toMatchObject({ image: originalImage, imageAltSource: 'author' });
    expect(draft.history[0].data[0].image).toBeUndefined();
    const exported = await call('resource_pack_export', { pack: changed, profile: 'illustrated' });
    expect(exported.isError).toBe(false);
    expect(JSON.parse(exported.structuredContent.json)).toEqual(changed);
    const audit = readFileSync(join(dataDir, 'agent-core/mcp-audit.jsonl'), 'utf8');
    expect(audit).not.toContain(originalImage);
    expect(audit).not.toContain('puddle becoming smaller');
  }, 30000);
});
