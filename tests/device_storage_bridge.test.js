import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const moduleSrc = readFileSync(resolve(process.cwd(), 'allo_device_storage_module.js'), 'utf8');
const bridgeSrc = readFileSync(resolve(process.cwd(), 'storage_bridge.html'), 'utf8');
const mirrorSrc = readFileSync(resolve(process.cwd(), 'prismflow-deploy/public/allo_device_storage_module.js'), 'utf8');

describe('device storage bridge — file contracts', () => {
  it('keeps the root module and the deploy mirror byte-identical', () => {
    expect(mirrorSrc).toBe(moduleSrc);
  });

  it('bridge page is self-contained (no external resources, no network calls)', () => {
    expect(bridgeSrc).not.toMatch(/<script[^>]+src=/i);
    expect(bridgeSrc).not.toMatch(/<link[^>]+href=/i);
    expect(bridgeSrc).not.toContain('fetch(');
    expect(bridgeSrc).not.toContain('XMLHttpRequest');
    expect(bridgeSrc).toContain('name="robots" content="noindex');
  });

  it('module and bridge agree on the ds1 protocol and database name', () => {
    expect(moduleSrc).toContain("var PROTO = 'ds1'");
    expect(bridgeSrc).toContain("var PROTO = 'ds1'");
    expect(bridgeSrc).toContain("var DB_NAME = 'allo_device_storage'");
    expect(moduleSrc).toContain("var DIRECT_DB = 'allo_device_storage'");
  });

  it('bridge authenticates by nonce + source reference and supports iframe mode', () => {
    expect(bridgeSrc).toContain('msg.nonce !== nonce');
    expect(bridgeSrc).toContain('event.source !== client');
    expect(bridgeSrc).toContain('window.opener || (window.parent !== window ? window.parent : null)');
    expect(bridgeSrc).toContain('allo-ds=');
  });

  it('module targets the CDN origin, never prismflow', () => {
    expect(moduleSrc).toContain("'https://alloflow-cdn.pages.dev/storage_bridge.html'");
    expect(moduleSrc).not.toMatch(/prismflow/i);
    expect(bridgeSrc).not.toMatch(/prismflow/i);
  });
});

describe('device storage adapter — behavior', () => {
  let api;
  beforeAll(() => {
    global.window = {};
    // eslint-disable-next-line no-eval
    eval(moduleSrc);
    api = global.window.alloDeviceStorage;
  });

  it('registers the API and module flag', () => {
    expect(api).toBeTruthy();
    expect(global.window.AlloModules.DeviceStorageModule).toBe(true);
  });

  it('validates namespaces and keys', () => {
    const v = api._internal;
    expect(v.validateNs('persona_sessions')).toBe(true);
    expect(v.validateNs('a/b')).toBe(false);
    expect(v.validateNs('')).toBe(false);
    expect(v.validateNs('x'.repeat(65))).toBe(false);
    expect(v.validateKey('k1')).toBe(true);
    expect(v.validateKey('')).toBe(false);
    expect(v.validateKey('x'.repeat(513))).toBe(false);
  });

  it('builds ds1 envelopes and recognizes responses', () => {
    const v = api._internal;
    const msg = v.buildEnvelope('nonce123', 'r1', 'set', { ns: 'n', key: 'k', value: 42 });
    expect(msg).toEqual({ allo: 'ds1', nonce: 'nonce123', id: 'r1', op: 'set', ns: 'n', key: 'k', value: 42 });
    expect(v.isValidResponse({ allo: 'ds1', id: 'r1', ok: true })).toBe(true);
    expect(v.isValidResponse({ allo: 'other', id: 'r1', ok: true })).toBe(false);
    expect(v.isValidResponse(null)).toBe(false);
  });

  it('memory backend round-trips get/set/list/clear', async () => {
    await api.useMemory();
    expect(api.status().backend).toBe('memory');
    await api.set('unit_ns', 'alpha', { a: 1 });
    await api.set('unit_ns', 'beta', 'two');
    expect(await api.get('unit_ns', 'alpha')).toEqual({ a: 1 });
    expect((await api.list('unit_ns')).sort()).toEqual(['alpha', 'beta']);
    await api.remove('unit_ns', 'alpha');
    expect(await api.get('unit_ns', 'alpha')).toBe(null);
    expect(await api.clearNamespace('unit_ns')).toBe(1);
    expect(await api.list('unit_ns')).toEqual([]);
  });

  it('rejects invalid namespaces and keys at the API boundary', async () => {
    await expect(api.get('bad ns!', 'k')).rejects.toMatchObject({ code: 'allo/bad-namespace' });
    await expect(api.set('okns', '', 1)).rejects.toMatchObject({ code: 'allo/bad-key' });
  });

  it('queues writes while a bridge backend is disconnected', async () => {
    api.init({ surface: 'canvas' });
    expect(api.status().backend).toBe('bridge-popup');
    const res = await api.set('queued_ns', 'k1', 'v1');
    expect(res).toEqual({ queued: true });
    expect(api.status().queuedWrites).toBe(1);
    await expect(api.get('queued_ns', 'k1')).rejects.toMatchObject({ code: 'allo/storage-disconnected' });
    // memory fallback flushes the queue
    await api.useMemory();
    expect(api.status().queuedWrites).toBe(0);
    expect(await api.get('queued_ns', 'k1')).toBe('v1');
  });
});
