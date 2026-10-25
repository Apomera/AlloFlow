import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
const source = readFileSync('managed_ai_policy.js', 'utf8');
const fingerprint = key => createHash('sha256').update(key).digest('hex');
const connection = { backend: 'custom', baseUrl: 'https://approved.example/v1', apiKeySha256: [fingerprint('synthetic-key')] };
const config = extra => ({ version: 1, connections: [structuredClone(connection)], allowExternalSearch: false, ...extra });
function fixture(value, crypto = webcrypto) {
  const window = {}; if (value !== undefined) window.ALLOFLOW_MANAGED_AI_POLICY = value;
  const api = new Function('window', 'globalThis', source + '\nreturn { authorize: assertManagedAIConnection, snapshot: managedAISnapshot, search: managedExternalSearchAllowed };')(window, { crypto });
  return { window, ...api };
}
const request = { backend: 'custom', baseUrl: connection.baseUrl, apiKey: 'synthetic-key' };
function barrier() { let release, reached; const entered = new Promise(r => { reached = r; }); const gate = new Promise(r => { release = r; }); return { entered, release, async wait() { reached(); await gate; } }; }

describe('managed request approval snapshot', () => {
  it('returns a synchronous guard for approved credentials and checks the actual profile again', async () => {
    const h = fixture(config()); const guard = await h.authorize(request);
    expect(guard()).toBe(true);
    h.window.ALLOFLOW_MANAGED_AI_POLICY = config();
    expect(guard).toThrowError(/not approved/);
  });
  it('rejects revocation while a credential digest is pending', async () => {
    const b = barrier();
    const h = fixture(config(), { subtle: { digest: async (...args) => { await b.wait(); return webcrypto.subtle.digest(...args); } } });
    const pending = h.authorize(request); const result = pending.catch(error => error);
    await b.entered; h.window.ALLOFLOW_MANAGED_AI_POLICY = { version: 1, connections: [] }; b.release();
    expect(await result).toMatchObject({ code: 'managed-ai-blocked' });
  });
  it('rejects in-place fingerprint replacement during digest instead of approving the edited row', async () => {
    const b = barrier(), p = config();
    const h = fixture(p, { subtle: { digest: async (...args) => { await b.wait(); return webcrypto.subtle.digest(...args); } } });
    const pending = h.authorize(request).catch(error => error); await b.entered;
    p.connections[0].apiKeySha256[0] = fingerprint('different-synthetic-key'); b.release();
    expect(await pending).toMatchObject({ code: 'managed-ai-blocked' });
  });
  it('guards even initially unmanaged work if a policy is installed before dispatch', async () => {
    const h = fixture(undefined); const guard = await h.authorize(request);
    expect(guard()).toBe(true); h.window.ALLOFLOW_MANAGED_AI_POLICY = config();
    expect(guard).toThrowError(/not approved/);
  });
  it('does not grant a mutable in-place external-search change to an existing request', async () => {
    const p = config({ allowExternalSearch: true }), h = fixture(p);
    const guard = await h.authorize({ ...request, search: true });
    p.allowExternalSearch = false; expect(guard).toThrowError(/not approved/); expect(h.search()).toBe(false);
  });
  it('retains null/unmanaged compatibility and explicit Canvas/keyless approval', async () => {
    expect((await fixture(null).authorize(request))()).toBe(true);
    const local = fixture({ version: 1, connections: [{ backend: 'ollama', baseUrl: 'http://127.0.0.1:11434/', keyless: true }] });
    expect((await local.authorize({ backend: 'ollama', baseUrl: 'http://127.0.0.1:11434', apiKey: '' }))()).toBe(true);
    const canvas = fixture({ version: 1, connections: [{ backend: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', canvasHost: true }] });
    expect((await canvas.authorize({ backend: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', apiKey: 'synthetic-injected', canvasHost: true }))()).toBe(true);
    await expect(canvas.authorize({ backend: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', apiKey: 'synthetic-injected', canvasHost: false })).rejects.toMatchObject({ code: 'managed-ai-blocked' });
  });
  it('deep-freezes the copied profile without freezing the deployment owner object', () => {
    const p = config(), h = fixture(p), snapshot = h.snapshot();
    expect(Object.isFrozen(snapshot.policy)).toBe(true);
    expect(Object.isFrozen(snapshot.policy.connections[0].apiKeySha256)).toBe(true);
    expect(Object.isFrozen(p)).toBe(false);
  });
  const malformed = [
    {}, { version: 2, connections: [] }, config({ allowExternalSearch: 'yes' }), config({ unknownApproval: true }),
    { version: 1, connections: null }, { version: 1, connections: [{ ...connection, apiKey: 'SYNTHETIC_PRIVATE_KEY' }] },
    { version: 1, connections: [{ ...connection, apiKeySha256: ['not-a-fingerprint'] }] },
    { version: 1, connections: [{ ...connection, keyless: 1 }] },
    { version: 1, connections: [{ ...connection, baseUrl: 'https://approved.example/v1?cap=SYNTHETIC_PRIVATE_CAP' }] },
    { version: 1, connections: [{ ...connection, baseUrl: 'http://10.0.0.8/v1' }] },
    { version: 1, connections: Array(65).fill(connection) },
    { version: 1, connections: [{ ...connection, apiKeySha256: Array(65).fill(fingerprint('synthetic-key')) }] }
  ];
  malformed.forEach((value, index) => it('fails closed for malformed or unrecognized profile ' + index, async () => {
    const h = fixture(value); const error = await h.authorize(request).catch(error => error);
    expect(error).toMatchObject({ code: 'managed-ai-blocked' });
    expect(error.message).not.toMatch(/SYNTHETIC_PRIVATE|10\.0\.0|fingerprint/); expect(h.search()).toBe(false);
  }));
  it('rejects accessor-backed policy data without invoking the accessor', async () => {
    const getter = vi.fn(() => []); const p = { version: 1 }; Object.defineProperty(p, 'connections', { enumerable: true, get: getter });
    await expect(fixture(p).authorize(request)).rejects.toMatchObject({ code: 'managed-ai-blocked' }); expect(getter).not.toHaveBeenCalled();
  });
  it('rejects sparse and accessor-backed connection arrays', async () => {
    await expect(fixture({ version: 1, connections: Array(1) }).authorize(request)).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    const connections = [], getter = vi.fn(() => connection); Object.defineProperty(connections, '0', { get: getter, enumerable: true });
    await expect(fixture({ version: 1, connections }).authorize(request)).rejects.toMatchObject({ code: 'managed-ai-blocked' }); expect(getter).not.toHaveBeenCalled();
  });
});

for (const file of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) describe(file + ' boot request guard', () => {
  const host = readFileSync(file, 'utf8');
  const start = host.indexOf('let fetchWithExponentialBackoff = async');
  const end = host.indexOf('let isGoogleRedirect', start);
  function boot(fetch) { return new Function('fetch', host.slice(start, end) + '\nreturn fetchWithExponentialBackoff;')(fetch); }
  it('checks synchronously before fetch and strips the private hook from RequestInit', async () => {
    const fetch = vi.fn(async () => 'ok'), guard = vi.fn(() => true);
    await expect(boot(fetch)('https://approved.example', { method: 'POST', beforeRequest: guard })).resolves.toBe('ok');
    expect(guard).toHaveBeenCalledOnce(); expect(fetch).toHaveBeenCalledWith('https://approved.example', { method: 'POST' });
    const denied = Object.assign(new Error('not approved'), { code: 'managed-ai-blocked' });
    await expect(boot(fetch)('https://approved.example', { beforeRequest: () => { throw denied; } })).rejects.toBe(denied); expect(fetch).toHaveBeenCalledOnce();
  });
  it('refuses invalid or asynchronous guards without dispatching', async () => {
    const fetch = vi.fn();
    for (const beforeRequest of [null, false, 'approval', () => false, () => null, () => 0, async () => true, async () => { throw new Error('synthetic denied'); }]) await expect(boot(fetch)('https://approved.example', { beforeRequest })).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(fetch).not.toHaveBeenCalled();
  });
});
