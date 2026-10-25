import { afterAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const service = require('../agent_core_resource_pack_module.js');
const native = require('../agent_core_pack_native_module.js');
const media = require('../agent_core_pack_media_module.js');
const item = (data, type = 'glossary') => ({ id: 'fixture', type, title: 'Evidence review', meta: '', data });
const pack = resource => ({
  allopack: { spec: '0.1', title: 'Evidence pack', language: 'en', gradeLevel: '6', createdAt: '2026-10-23' },
  sourceTopic: 'Evidence', history: [resource],
});
const expectBoundedFailure = result => {
  expect(result.ok).toBe(false);
  expect(result.errors.length).toBeLessThanOrEqual(100);
  expect(result.errors.at(-1).code).toBe('diagnostics-truncated');
  expect(JSON.stringify(result).length).toBeLessThan(25000);
};

let child, home;
afterAll(async () => {
  if (child && child.exitCode === null && child.signalCode === null) await new Promise(done => { child.once('exit', done); child.kill(); });
  if (home) rmSync(home, { recursive: true, force: true });
});

describe('bounded AlloPack validation diagnostics', () => {
  it.each(['text', 'illustrated', 'native'])('bounds a 20,000-error glossary in the %s profile', profile => {
    const candidate = pack(item(Array(20000).fill(null)));
    expect(JSON.stringify(candidate).length).toBeLessThan(120000);
    const before = JSON.stringify(candidate);
    const result = service.validatePack(candidate, { profile });
    expectBoundedFailure(result);
    expect(result.value).toBeNull();
    expect(JSON.stringify(candidate)).toBe(before);
    expect(service.previewPack(candidate, { profile }).ok).toBe(false);
    expect(service.exportPack(candidate, { profile }).ok).toBe(false);
  });

  it('rejects an already-invalid history count before inspecting its entries', () => {
    const candidate = pack(item('Read the source.', 'directions'));
    candidate.history = Array(20000).fill(null);
    const result = service.validatePack(candidate, { profile: 'native' });
    expect(result.ok).toBe(false);
    expect(result.errors.map(error => error.code)).toEqual(['invalid-history']);
  });

  it('does not deeply inspect an item over the existing instructional-text budget', () => {
    const result = service.validatePack(pack(item(Array(30000).fill(null))), { profile: 'native' });
    expect(result.ok).toBe(false);
    expect(result.errors.map(error => error.code)).toEqual(['item-too-large']);
  });

  it('bounds nested display errors as well as top-level resource errors', () => {
    const result = service.validatePack(pack(item({ title: 'Chart', sections: [{ label: 'Evidence', bullets: Array(10000).fill(null) }] }, 'anchor-chart')), { profile: 'native' });
    expectBoundedFailure(result);
    expect(result.errors[0].path).toContain('.bullets[0]');
  });

  it('bounds diagnostic paths from long unknown caller keys', () => {
    const request = { requestId: 'bounded', sourceTopic: 'Evidence', learningGoal: 'Explain with evidence.', history: [item('Read the source.', 'directions')], privacy: { confirmNoStudentPii: true, confirmSourcePermission: true } };
    request['x'.repeat(20000)] = 'invalid';
    const result = service.compose(request);
    expect(result.ok).toBe(false);
    expect(result.errors.every(error => error.path.length <= 600 && error.message.length <= 2000)).toBe(true);
    expect(JSON.stringify(result).length).toBeLessThan(2000);
  });

  it.each(['text', 'illustrated', 'native'])('preserves larger valid glossary collections in %s', profile => {
    const candidate = pack(item(Array.from({ length: 2000 }, (_, i) => ({ term: 'Term ' + i, def: 'Source detail.' }))));
    expect(service.validatePack(candidate, { profile }).ok).toBe(true);
  });

  it('stops native row validation when the error budget has been exhausted', () => {
    let visited = 0;
    const rows = Array.from({ length: 30 }, () => ({
      get name() { visited++; return null; }, role: null, context: null, greeting: null,
    }));
    const errors = [];
    native.validateResource(item(rows, 'persona'), 'pack.history[0]', errors, []);
    expect(errors).toHaveLength(100);
    expect(errors.at(-1).code).toBe('diagnostics-truncated');
    expect(visited).toBeLessThan(30);
  });

  it('stops media-specific recursive diagnostics without reading every invalid value', () => {
    let visited = 0;
    const candidate = pack(item('Read the source.', 'directions'));
    candidate.extra = {};
    for (let i = 0; i < 10000; i++) Object.defineProperty(candidate.extra, 'field' + i, { enumerable: true, get() { visited++; return 'data:image/not-a-raster'; } });
    const result = media.validatePackMedia(candidate, { profile: 'native' });
    expectBoundedFailure(result);
    expect(visited).toBeLessThanOrEqual(100);
    expect(result.stats.complete).toBe(false);
    expectBoundedFailure(service.validatePack(JSON.parse(JSON.stringify(candidate)), { profile: 'native' }));
  });

  it('bounds native annotation errors and rejects rather than accepting truncated validation', () => {
    const annotations = Object.fromEntries(Array.from({ length: 10000 }, (_, i) => ['unknown' + i, true]));
    const result = media.validateNativeImageState(pack(item({ visualPlan: { panels: [] }, annotations }, 'image')), { profile: 'native' });
    expectBoundedFailure(result);
  });

  it('stops media slot discovery after proving the existing placement limit was exceeded', () => {
    let visited = 0;
    const rows = Array.from({ length: 10000 }, (_, i) => ({ term: 'Term ' + i, def: 'Detail', get image() { visited++; return 'data:image/not-a-raster'; } }));
    const result = media.validatePackMedia(pack(item(rows)), { profile: 'native' });
    expect(result.ok).toBe(false);
    expect(result.errors.map(error => error.code)).toEqual(['too-many-image-placements']);
    expect(result.stats).toMatchObject({ placements: 257, complete: false });
    expect(visited).toBeLessThan(2000);
  });

  it.each(service.getCapabilities('native').contracts)('preserves the discoverable $type authoring contract', contract => {
    const result = service.validatePack(pack(contract.example), { profile: 'native' });
    expect(result.ok, JSON.stringify(result.errors)).toBe(true);
  });

  it('preserves Katie’s complete pack and its existing images', () => {
    const source = readFileSync(resolve('allopacks/academic_discourse_reading_space_grade6.allopack.json'), 'utf8');
    const candidate = JSON.parse(source);
    const result = service.validatePack(candidate, { profile: 'native' });
    expect(result.ok, JSON.stringify(result.errors)).toBe(true);
    expect(result.media.placements).toBeGreaterThanOrEqual(32);
    expect(result.media.complete).toBe(true);
    expect(JSON.stringify(result.value)).toBe(JSON.stringify(candidate));
    expect(service.exportPack(candidate, { profile: 'native' }).ok).toBe(true);
    expect(readFileSync(resolve('allopacks/academic_discourse_reading_space_grade6.allopack.json'), 'utf8')).toBe(source);
  });

  it('returns bounded failures over actual stdio and keeps subsequent requests working', async () => {
    home = mkdtempSync(join(tmpdir(), 'alloflow-validation-budget-'));
    child = spawn(process.execPath, [resolve('desktop/mcp/alloflow-mcp-stdio.cjs')], { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, env: { ...process.env, ALLOFLOW_MCP_DATA_DIR: home, ALLOFLOW_MCP_MANIFEST_PATH: '' } });
    let sequence = 0, buffer = '', stderr = '';
    const pending = new Map();
    child.stderr.setEncoding('utf8'); child.stderr.on('data', text => { stderr = (stderr + text).slice(-2000); });
    child.stdout.setEncoding('utf8'); child.stdout.on('data', text => {
      buffer += text;
      let index;
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
        const message = JSON.parse(line), waiter = pending.get(message.id);
        if (waiter) { clearTimeout(waiter.timer); pending.delete(message.id); waiter.done({ message, size: line.length }); }
      }
    });
    function request(method, params) {
      const id = ++sequence;
      return new Promise((done, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('MCP timeout: ' + stderr)); }, 10000);
        pending.set(id, { done, timer });
        child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      });
    }
    await request('initialize', { protocolVersion: '2025-06-18' });
    const candidate = pack(item(Array(20000).fill(null)));
    const response = await request('tools/call', { name: 'resource_pack_validate', arguments: { pack: candidate, profile: 'native' } });
    expect(response.message.error).toBeUndefined();
    expectBoundedFailure(response.message.result.structuredContent);
    expect(response.size).toBeLessThan(50000);
    const exported = await request('tools/call', { name: 'resource_pack_export', arguments: { pack: candidate, profile: 'native' } });
    expect(exported.message.error.code).toBe(-32602);
    expect(exported.size).toBeLessThan(25000);
    expect((await request('ping', {})).message.result).toEqual({});
  }, 20000);
});
