import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReadableStream } from 'node:stream/web';
import worker from '../catalog/cloudflare-worker/src/index.js';

const MAX_BYTES = 1_048_576;
const RETENTION_SECONDS = 30 * 24 * 60 * 60;
const NOW = Date.parse('2026-10-24T16:00:00.123Z');
const receipt = 'bug:1792857600123:abcdef12';
const token = 'synthetic-private-review-token';
const encoder = new TextEncoder();
const jsonHeaders = { 'Content-Type': 'application/json' };

afterEach(() => vi.restoreAllMocks());

function fakeKv(entries = []) {
  const store = new Map(entries);
  return {
    store,
    get: vi.fn(async key => store.get(key) ?? null),
    put: vi.fn(async (key, value) => { store.set(key, value); }),
    delete: vi.fn(),
    list: vi.fn(async ({ prefix = '' }) => ({ keys: [...store.keys()].filter(key => key.startsWith(prefix)).sort().map(name => ({ name })), list_complete: true })),
  };
}
const envFor = kv => ({ BUG_REPORTS: kv, BUG_REPORTS_ADMIN_TOKEN: token });

function post(body, kv = fakeKv(), headers = jsonHeaders) {
  return worker.fetch(new Request('https://worker.test/submitBug', { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) }), envFor(kv));
}

function streamPost(chunks, kv = fakeKv(), headers = jsonHeaders, options = {}) {
  let pulled = 0;
  const cancelled = vi.fn(() => { if (options.cancelError) throw options.cancelError; });
  const body = new ReadableStream({
    pull(controller) {
      const index = pulled++;
      if (options.readError) { controller.error(options.readError); return; }
      if (index < chunks.length) controller.enqueue(chunks[index]);
      else controller.close();
    },
    cancel: cancelled,
  }, { highWaterMark: 0 });
  const request = new Request('https://worker.test/submitBug', { method: 'POST', headers, body, duplex: 'half' });
  return { request, cancelled, pulls: () => pulled, response: worker.fetch(request, envFor(kv)) };
}

function expectPrivate(response) {
  expect(response.headers.get('Cache-Control')).toBe('no-store, private');
  expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
  expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
}

describe('bug-report bounded request ingestion', () => {
  it('refuses an oversized declared body before pulling it and cancels the source', async () => {
    const kv = fakeKv();
    const request = streamPost([encoder.encode('{"what":"Synthetic"}')], kv, { ...jsonHeaders, 'Content-Length': String(MAX_BYTES + 1) });
    const response = await request.response;
    expect(response.status).toBe(413);
    expectPrivate(response);
    expect(request.pulls()).toBe(0);
    expect(request.cancelled).toHaveBeenCalledOnce();
    expect(kv.put).not.toHaveBeenCalled();
  });

  it.each([undefined, '1'])('stops an oversized chunked/understated stream at the first excess byte (%s)', async declared => {
    const kv = fakeKv();
    const headers = { ...jsonHeaders, ...(declared ? { 'Content-Length': declared } : {}) };
    const request = streamPost([new Uint8Array(MAX_BYTES).fill(32), new Uint8Array([32]), encoder.encode('must never be read')], kv, headers);
    const response = await request.response;
    expect(response.status).toBe(413);
    expectPrivate(response);
    expect(request.pulls()).toBe(2);
    expect(request.cancelled).toHaveBeenCalledOnce();
    expect(request.request.body.locked).toBe(false);
    expect(kv.put).not.toHaveBeenCalled();
  });

  it('keeps the size refusal when stream cancellation itself fails', async () => {
    const kv = fakeKv();
    const request = streamPost([new Uint8Array(MAX_BYTES + 1)], kv, jsonHeaders, { cancelError: new Error('Bearer synthetic-cancellation-secret') });
    const response = await request.response;
    expect(response.status).toBe(413);
    expect(await response.text()).not.toContain('synthetic-cancellation-secret');
    expect(kv.put).not.toHaveBeenCalled();
  });

  it('accepts exactly the byte ceiling without persisting ignored padding', async () => {
    const kv = fakeKv();
    const base = JSON.stringify({ what: 'Synthetic exact boundary', padding: '' });
    const body = JSON.stringify({ what: 'Synthetic exact boundary', padding: ' '.repeat(MAX_BYTES - encoder.encode(base).byteLength) });
    expect(encoder.encode(body).byteLength).toBe(MAX_BYTES);
    const response = await post(body, kv);
    expect(response.status).toBe(201);
    expectPrivate(response);
    expect(JSON.parse(kv.put.mock.calls[0][1]).what).toBe('Synthetic exact boundary');
    expect(JSON.parse(kv.put.mock.calls[0][1])).not.toHaveProperty('padding');
  });

  it('uses UTF-8 bytes rather than UTF-16 length for the cap', async () => {
    const kv = fakeKv();
    const body = JSON.stringify({ what: 'Synthetic Unicode bound', padding: '😀'.repeat(MAX_BYTES / 4) });
    expect(body.length).toBeLessThan(MAX_BYTES);
    expect(encoder.encode(body).byteLength).toBeGreaterThan(MAX_BYTES);
    const response = await post(body, kv);
    expect(response.status).toBe(413);
    expect(kv.put).not.toHaveBeenCalled();
  });

  it('decodes split multibyte characters correctly across stream boundaries', async () => {
    const kv = fakeKv();
    const description = 'Synthetic café 🧠 description';
    const bytes = encoder.encode(JSON.stringify({ what: description }));
    const firstNonAscii = bytes.findIndex(value => value > 127);
    const request = streamPost([bytes.slice(0, firstNonAscii + 1), bytes.slice(firstNonAscii + 1, firstNonAscii + 4), bytes.slice(firstNonAscii + 4)], kv);
    expect((await request.response).status).toBe(201);
    expect(JSON.parse(kv.put.mock.calls[0][1]).what).toBe(description);
  });

  it.each([new Uint8Array([0xc3, 0x28]), new Uint8Array([0xe2, 0x82])])('rejects malformed/truncated UTF-8 instead of accepting replacement characters %#', async bytes => {
    const kv = fakeKv();
    const request = streamPost([encoder.encode('{"what":"'), bytes], kv);
    const response = await request.response;
    expect(response.status).toBe(400);
    expectPrivate(response);
    expect(kv.put).not.toHaveBeenCalled();
  });

  it('does not leak body, parser, stream, or storage diagnostics in failures', async () => {
    const secret = 'Bearer synthetic-provider-credential';
    const kv = fakeKv();
    const responses = [
      await post('{"what":"' + secret + '",', kv),
      await streamPost([], kv, jsonHeaders, { readError: new Error(secret) }).response,
    ];
    kv.put.mockRejectedValueOnce(new Error(secret));
    responses.push(await post({ what: 'Synthetic storage failure' }, kv));
    expect(responses.map(response => response.status)).toEqual([400, 400, 502]);
    for (const response of responses) {
      expectPrivate(response);
      const body = await response.text();
      expect(body).not.toContain(secret);
      expect(body).not.toContain('BUG_REPORTS');
      expect(JSON.parse(body)).not.toHaveProperty('id');
    }
  });

  it.each(['application/jsonp', 'text/plain; application/json', 'application/x-application/json', 'application/json; charset=iso-8859-1', 'application/json, text/html'])('rejects misleading or unsupported content types: %s', async contentType => {
    const kv = fakeKv();
    const response = await post({ what: 'Synthetic media type check' }, kv, { 'Content-Type': contentType });
    expect(response.status).toBe(415);
    expectPrivate(response);
    expect(kv.put).not.toHaveBeenCalled();
  });

  it.each(['application/json', 'Application/JSON; charset=UTF-8', 'application/json; charset="utf-8"'])('accepts the JSON/UTF-8 media type: %s', async contentType => {
    const response = await post({ what: 'Synthetic media type check' }, fakeKv(), { 'Content-Type': contentType });
    expect(response.status).toBe(201);
    expectPrivate(response);
  });

  it.each([['OPTIONS', 204], ['GET', 405]])('keeps %s responses private without writing', async (method, status) => {
    const kv = fakeKv();
    const response = await worker.fetch(new Request('https://worker.test/submitBug', { method }), envFor(kv));
    expect(response.status).toBe(status);
    expectPrivate(response);
    expect(kv.put).not.toHaveBeenCalled();
  });
});

describe('server-owned bug-report retention', () => {
  it('expires only the newly stored report after 30 days and ignores client retention overrides', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const legacy = JSON.stringify({ what: 'Synthetic legacy report' });
    const kv = fakeKv([[receipt, legacy]]);
    const response = await post({ what: 'Synthetic new report', expires_at: '2100-01-01T00:00:00Z', submitted_at: '2100-01-01', expirationTtl: 1, expiration: 1, retention_days: 9999 }, kv);
    expect(response.status).toBe(201);
    const result = await response.json();
    const [id, serialized, options] = kv.put.mock.calls[0];
    const stored = JSON.parse(serialized);
    expect(id).toBe(result.id);
    expect(options.expirationTtl).toBe(RETENTION_SECONDS);
    expect(stored.submitted_at).toBe(new Date(NOW).toISOString());
    expect(stored.expires_at).toBe(new Date(NOW + RETENTION_SECONDS * 1000).toISOString());
    expect(stored).not.toHaveProperty('retention_days');
    expect(stored).not.toHaveProperty('expirationTtl');
    expect(kv.store.get(receipt)).toBe(legacy);
    expect(kv.delete).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, pii_findings_count: 0 });
    const inboxResponse = await worker.fetch(new Request('https://worker.test/bugs', { headers: { Authorization: `Bearer ${token}` } }), envFor(kv));
    expect(inboxResponse.status).toBe(200);
    expect((await inboxResponse.json()).reports.some(report => report.id === id && report.what === stored.what)).toBe(true);
  });
});

function reviewRequest(kv, payload = { id: receipt, note: 'Synthetic private review note' }, method = 'POST') {
  return worker.fetch(new Request('https://worker.test/bug-review' + (method === 'GET' ? '?id=' + receipt : ''), {
    method, headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
    ...(method === 'POST' ? { body: JSON.stringify(payload) } : {}),
  }), envFor(kv));
}

describe('new private review-event retention', () => {
  it('ends with its parent report without changing the event schema or extending the original', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const expiry = NOW + 2 * 86400 * 1000;
    const original = JSON.stringify({ kind: 'bug_report', what: 'Synthetic original', expires_at: new Date(expiry).toISOString() });
    const kv = fakeKv([[receipt, original]]);
    const response = await reviewRequest(kv);
    expect(response.status).toBe(201);
    expectPrivate(response);
    const [key, raw, options] = kv.put.mock.calls[0];
    expect(key.startsWith('bug-review:' + receipt + ':')).toBe(true);
    expect(options.expiration).toBe(Math.floor(expiry / 1000));
    expect(options.expirationTtl).toBeUndefined();
    expect(Object.keys(JSON.parse(raw)).sort()).toEqual(['created_at', 'id', 'note']);
    expect(kv.store.get(receipt)).toBe(original);
    expect(kv.delete).not.toHaveBeenCalled();
  });

  it.each([undefined, new Date(NOW + 90 * 86400 * 1000).toISOString()])('caps newly appended events at 30 days for legacy/distant parent expiry %s', async expires_at => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const oldKey = 'bug-review:' + receipt + ':1700000000000:' + 'a'.repeat(32);
    const oldValue = 'synthetic untouched legacy event';
    const kv = fakeKv([[receipt, JSON.stringify({ kind: 'bug_report', ...(expires_at ? { expires_at } : {}) })], [oldKey, oldValue]]);
    const response = await reviewRequest(kv);
    expect(response.status).toBe(201);
    expect(kv.put.mock.calls[0][2].expiration).toBe(Math.floor(NOW / 1000) + RETENTION_SECONDS);
    expect(kv.store.get(oldKey)).toBe(oldValue);
    expect(kv.put).toHaveBeenCalledOnce();
    expect(kv.delete).not.toHaveBeenCalled();
  });

  it.each([[30, 409], [-1, 404]])('refuses append when parent has %s seconds remaining without renewing it', async (seconds, expectedStatus) => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const kv = fakeKv([[receipt, JSON.stringify({ expires_at: new Date(NOW + seconds * 1000).toISOString() })]]);
    const response = await reviewRequest(kv);
    expect(response.status).toBe(expectedStatus);
    expectPrivate(response);
    expect(kv.put).not.toHaveBeenCalled();
    expect(kv.delete).not.toHaveBeenCalled();
  });

  it('blocks reading an expired parent review and fails safely on corrupt retention metadata', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const kv = fakeKv([[receipt, JSON.stringify({ expires_at: new Date(NOW - 1000).toISOString() })]]);
    expect((await reviewRequest(kv, undefined, 'GET')).status).toBe(404);
    expect(kv.list).not.toHaveBeenCalled();
    kv.store.set(receipt, JSON.stringify({ expires_at: 'synthetic-invalid-retention' }));
    const response = await reviewRequest(kv);
    expect(response.status).toBe(502);
    expectPrivate(response);
    expect(await response.text()).not.toContain('synthetic-invalid-retention');
    expect(kv.put).not.toHaveBeenCalled();
  });

  it('rejects client expiry overrides on review events before reading storage', async () => {
    const kv = fakeKv([[receipt, JSON.stringify({ what: 'Synthetic original' })]]);
    expect((await reviewRequest(kv, { id: receipt, note: 'Synthetic note', expires_at: '2100-01-01T00:00:00Z' })).status).toBe(400);
    expect(kv.get).not.toHaveBeenCalled();
    expect(kv.put).not.toHaveBeenCalled();
  });
});
