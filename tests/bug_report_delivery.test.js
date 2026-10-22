import { describe, expect, it, vi } from 'vitest';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import localWorker from '../catalog/cloudflare-worker/src/index.js';

// The same behavior checks can validate the narrowly patched live Worker base.
const worker = process.env.WORKER_SOURCE
  ? (await import(/* @vite-ignore */ pathToFileURL(resolve(process.env.WORKER_SOURCE)).href)).default
  : localWorker;

const token = 'test-bug-inbox-token';
const key = index => `bug:${1700000000000 + index}:abcdef12`;
const record = index => ({ kind: 'bug_report', submitted_at: new Date(1700000000000 + index).toISOString(), what: `Synthetic report ${index}` });

function fakeKv(count = 0) {
  const store = new Map(Array.from({ length: count }, (_, i) => [key(i), JSON.stringify(record(i))]));
  return {
    store,
    put: vi.fn(async (name, value) => { store.set(name, value); }),
    get: vi.fn(async name => store.get(name) ?? null),
    list: vi.fn(async ({ prefix = '', limit = 1000, cursor = '' } = {}) => {
      const names = [...store.keys()].filter(name => name.startsWith(prefix)).sort();
      const start = cursor ? Number(cursor) : 0;
      const end = Math.min(start + limit, names.length);
      return { keys: names.slice(start, end).map(name => ({ name })), list_complete: end >= names.length, cursor: end < names.length ? String(end) : '' };
    }),
  };
}

const envFor = (kv = fakeKv(), extra = {}) => ({ BUG_REPORTS: kv, BUG_REPORTS_ADMIN_TOKEN: token, ...extra });
function get(path = '/bugs', env = envFor(), authorization = `Bearer ${token}`) {
  return worker.fetch(new Request(`https://worker.test${path}`, { headers: authorization ? { Authorization: authorization } : {} }), env);
}
function post(body, env = envFor(), headers = { 'Content-Type': 'application/json' }) {
  return worker.fetch(new Request('https://worker.test/submitBug', { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) }), env);
}
function expectPrivate(response) {
  expect(response.headers.get('Cache-Control')).toContain('no-store');
  expect(response.headers.get('Cache-Control')).toContain('private');
  expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
}

describe('private bug-report delivery and receipts', () => {
  it('acknowledges a receipt only after the report has been stored', async () => {
    const kv = fakeKv();
    let release;
    const storageGate = new Promise(resolve => { release = resolve; });
    kv.put.mockImplementation(async (name, value) => { await storageGate; kv.store.set(name, value); });
    let settled = false;
    const pending = post({ what: 'Synthetic delivery check', steps: 'Test only' }, envFor(kv)).then(response => { settled = true; return response; });
    await vi.waitFor(() => expect(kv.put).toHaveBeenCalledOnce());
    expect(settled).toBe(false);
    release();
    const response = await pending;
    expect(response.status).toBe(201);
    expectPrivate(response);
    const receipt = await response.json();
    expect(receipt).toMatchObject({ ok: true, pii_findings_count: 0 });
    expect(receipt.id).toMatch(/^bug:\d{13}:[a-f0-9]{8}$/);
    expect(JSON.parse(kv.store.get(receipt.id))).toMatchObject({ kind: 'bug_report', what: 'Synthetic delivery check', steps: 'Test only' });
    const inbox = await (await get('/bugs', envFor(kv))).json();
    expect(inbox.reports[0].id).toBe(receipt.id);
  });

  it('returns no receipt or storage internals when a write fails', async () => {
    const kv = fakeKv();
    kv.put.mockRejectedValue(new Error('sensitive-provider-diagnostic'));
    const response = await post({ what: 'Synthetic report' }, envFor(kv));
    expect(response.status).toBe(502);
    expectPrivate(response);
    const result = await response.json();
    expect(result.ok).toBe(false);
    expect(result.id).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain('sensitive-provider-diagnostic');
  });

  it.each([
    ['missing storage', { what: 'Synthetic report' }, {}, { 'Content-Type': 'application/json' }, 503],
    ['invalid content type', 'body', envFor(), { 'Content-Type': 'text/plain' }, 415],
    ['invalid JSON', '{', envFor(), { 'Content-Type': 'application/json' }, 400],
    ['empty report', {}, envFor(), { 'Content-Type': 'application/json' }, 400],
    ['oversized body', 'x'.repeat(1_048_577), envFor(), { 'Content-Type': 'application/json' }, 413],
  ])('keeps %s responses private', async (_name, body, env, headers, status) => {
    const response = await post(body, env, headers);
    expect(response.status).toBe(status);
    expectPrivate(response);
    expect((await response.json()).ok).toBe(false);
  });
});

describe('bug-inbox authorization', () => {
  it('fails closed when developer access has not been configured', async () => {
    const response = await get('/bugs', { BUG_REPORTS: fakeKv() });
    expect(response.status).toBe(501);
    expectPrivate(response);
  });

  it.each([undefined, 'wrong-token', 'Bearer wrong-token', `Basic ${token}`])('requires a valid bearer header (%s)', async authorization => {
    const kv = fakeKv(1);
    const response = await get(`/bugs?token=${token}`, envFor(kv), authorization || '');
    expect(response.status).toBe(401);
    expectPrivate(response);
    expect(kv.list).not.toHaveBeenCalled();
  });

  it('accepts the shared legacy token only when a dedicated bug token is absent', async () => {
    const kv = fakeKv(1);
    expect((await get('/bugs', { BUG_REPORTS: kv, ADMIN_TOKEN: 'legacy' }, 'Bearer legacy')).status).toBe(200);
    expect((await get('/bugs', envFor(kv, { ADMIN_TOKEN: 'legacy' }), 'Bearer legacy')).status).toBe(401);
    expect((await get('/bugs', envFor(kv, { ADMIN_TOKEN: 'legacy' }))).status).toBe(200);
  });

  it.each(['/pdSubmissions', '/pluginSubmissions'])('does not give the dedicated bug token access to %s', async path => {
    const env = envFor(fakeKv(), { PD_SUBMISSIONS: fakeKv(), PLUGIN_SUBMISSIONS: fakeKv() });
    expect((await get(path, env)).status).toBe(501);
    expect((await get(path, { ...env, ADMIN_TOKEN: 'separate-legacy-token' })).status).toBe(401);
    expect((await get(path, { ...env, ADMIN_TOKEN: 'separate-legacy-token' }, 'Bearer separate-legacy-token')).status).toBe(200);
  });

  it('authenticates before exposing storage availability', async () => {
    expect((await get('/bugs', { BUG_REPORTS_ADMIN_TOKEN: token }, '')).status).toBe(401);
    const response = await get('/bugs', { BUG_REPORTS_ADMIN_TOKEN: token });
    expect(response.status).toBe(503);
    expectPrivate(response);
  });
});

describe('newest-first bug-report pagination', () => {
  it('finds newest reports beyond the first storage page and pages backward without duplicates', async () => {
    const kv = fakeKv(1005);
    const firstResponse = await get('/bugs?limit=2', envFor(kv));
    expectPrivate(firstResponse);
    const first = await firstResponse.json();
    expect(first.reports.map(row => row.id)).toEqual([key(1004), key(1003)]);
    expect(first.cursor).toBe(key(1003));
    expect(kv.list).toHaveBeenNthCalledWith(1, { prefix: 'bug:', limit: 1000 });
    expect(kv.list).toHaveBeenNthCalledWith(2, { prefix: 'bug:', limit: 1000, cursor: '1000' });
    expect(kv.get).toHaveBeenCalledTimes(2);
    const second = await (await get(`/bugs?limit=2&cursor=${encodeURIComponent(first.cursor)}`, envFor(kv))).json();
    expect(second.reports.map(row => row.id)).toEqual([key(1002), key(1001)]);
    expect(second.cursor).toBe(key(1001));
    const last = await (await get(`/bugs?limit=2&cursor=${encodeURIComponent(key(2))}`, envFor(kv))).json();
    expect(last.reports.map(row => row.id)).toEqual([key(1), key(0)]);
    expect(last.cursor).toBeNull();
  });

  it('continues across empty storage pages', async () => {
    const kv = fakeKv(2);
    kv.list.mockReset()
      .mockResolvedValueOnce({ keys: [{ name: key(0) }], list_complete: false, cursor: 'first' })
      .mockResolvedValueOnce({ keys: [], list_complete: false, cursor: 'second' })
      .mockResolvedValueOnce({ keys: [{ name: key(1) }], list_complete: true, cursor: '' });
    const result = await (await get('/bugs?limit=1', envFor(kv))).json();
    expect(result.reports.map(row => row.id)).toEqual([key(1)]);
    expect(result.cursor).toBe(key(1));
    expect(kv.list).toHaveBeenNthCalledWith(3, { prefix: 'bug:', limit: 1000, cursor: 'second' });
  });

  it.each([['', 50], ['?limit=900', 200], ['?limit=-4', 1], ['?limit=0', 1], ['?limit=invalid', 50]])('bounds requested result size for %s', async (query, count) => {
    const kv = fakeKv(205);
    const result = await (await get(`/bugs${query}`, envFor(kv))).json();
    expect(result.count).toBe(count);
    expect(result.reports[0].id).toBe(key(204));
    expect(kv.get).toHaveBeenCalledTimes(count);
  });

  it.each(['pd:1700000000000:abcdef12', 'bug:123:abcdef12', 'bug:1700000000000:../secret', 'not-a-cursor'])('rejects malformed cursor %s before storage access', async cursor => {
    const kv = fakeKv();
    const response = await get(`/bugs?cursor=${encodeURIComponent(cursor)}`, envFor(kv));
    expect(response.status).toBe(400);
    expectPrivate(response);
    expect(kv.list).not.toHaveBeenCalled();
  });

  it.each([
    ['missing cursor', [{ keys: [], list_complete: false }]],
    ['repeated cursor', [{ keys: [], list_complete: false, cursor: 'same' }, { keys: [], list_complete: false, cursor: 'same' }]],
    ['missing completion marker', [{ keys: [] }]],
  ])('fails visibly on %s instead of returning an incomplete inbox', async (_label, pages) => {
    const kv = fakeKv();
    kv.list.mockReset();
    pages.forEach(page => kv.list.mockResolvedValueOnce(page));
    const response = await get('/bugs', envFor(kv));
    expect(response.status).toBe(502);
    expectPrivate(response);
    expect(await response.json()).toEqual({ ok: false, error: 'Could not load reports. Please try again.' });
  });

  it.each(['list', 'get'])('returns a safe error for a failed storage %s', async operation => {
    const kv = fakeKv(1);
    kv[operation].mockRejectedValue(new Error('sensitive-provider-diagnostic'));
    const response = await get('/bugs', envFor(kv));
    expect(response.status).toBe(502);
    expectPrivate(response);
    expect(await response.text()).not.toContain('sensitive-provider-diagnostic');
  });

  it.each([null, '{broken', '[]'])('does not quietly hide an unavailable or invalid stored record (%s)', async value => {
    const kv = fakeKv(1);
    kv.get.mockResolvedValue(value);
    expect((await get('/bugs', envFor(kv))).status).toBe(502);
  });

  it('keeps the storage key authoritative for a report receipt', async () => {
    const kv = fakeKv(1);
    kv.store.set(key(0), JSON.stringify({ ...record(0), id: 'untrusted-stored-id' }));
    const result = await (await get('/bugs', envFor(kv))).json();
    expect(result.reports[0].id).toBe(key(0));
    expect(result.cursor).toBeNull();
  });

  it('represents an empty inbox with no next cursor', async () => {
    expect(await (await get()).json()).toEqual({ ok: true, count: 0, reports: [], cursor: null });
  });
});

describe('developer inbox shell', () => {
  it('serves a private-cache shell with a fresh CSP nonce and no embedded credentials or report data', async () => {
    const kv = fakeKv(1);
    const first = await get('/bug-inbox', envFor(kv), '');
    const second = await get('/bug-inbox', envFor(kv), '');
    expect(first.status).toBe(200);
    expectPrivate(first);
    expect(first.headers.get('Content-Type')).toContain('text/html');
    expect(first.headers.get('X-Frame-Options')).toBe('DENY');
    const csp = first.headers.get('Content-Security-Policy');
    const nonce = csp.match(/script-src 'nonce-([a-f0-9]+)'/)[1];
    expect(csp).toContain(`style-src 'nonce-${nonce}'`);
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toBe(second.headers.get('Content-Security-Policy'));
    const html = await first.text();
    expect(html).toContain(`<script nonce="${nonce}">`);
    expect(html).toContain(`<style nonce="${nonce}">`);
    expect(html).not.toContain(token);
    expect(html).not.toContain('Synthetic report 0');
    expect(kv.list).not.toHaveBeenCalled();
  });
});
