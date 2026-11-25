import { afterEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import worker from '../catalog/cloudflare-worker/src/index.js';

// POST /packetsFeedback: the one Packets page that connects sends short teacher
// feedback here. The route refuses anything that still looks personal and stores
// only the contract fields. All data below is synthetic.
const RETENTION_SECONDS = 30 * 24 * 60 * 60;
const token = 'synthetic-packets-inbox-token';
const base = { v: 1, page: 'packets-make', kind: 'confusing', message: 'The second step was hard to find.', browser: 'chrome', device: 'computer' };

afterEach(() => vi.restoreAllMocks());

function fakeKv(entries = []) {
  const store = new Map(entries);
  return {
    store,
    get: vi.fn(async key => store.get(key) ?? null),
    put: vi.fn(async (key, value) => { store.set(key, value); }),
    delete: vi.fn(),
    list: vi.fn(async ({ prefix = '', limit = 1000, cursor = '' } = {}) => {
      const names = [...store.keys()].filter(name => name.startsWith(prefix)).sort();
      const start = cursor ? Number(cursor) : 0;
      const end = Math.min(start + limit, names.length);
      return { keys: names.slice(start, end).map(name => ({ name })), list_complete: end >= names.length, cursor: end < names.length ? String(end) : '' };
    }),
  };
}
const envFor = (kv = fakeKv(), extra = {}) => ({ BUG_REPORTS: kv, BUG_REPORTS_ADMIN_TOKEN: token, SUBMIT_RATE: fakeKv(), SUBMIT_RATE_PER_MINUTE: '1000', SUBMIT_RATE_PER_DAY: '1000', ...extra });

function post(body, env = envFor(), headers = {}) {
  return worker.fetch(new Request('https://worker.test/packetsFeedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }), env);
}
function get(path, env, authorization = `Bearer ${token}`) {
  return worker.fetch(new Request(`https://worker.test${path}`, { headers: authorization ? { Authorization: authorization } : {} }), env);
}
const pfbKey = i => `pfb:${1790000000000 + i}:abcdef0${i % 10}`;
const pfbRecord = i => JSON.stringify({ schema_version: '1.0', kind: 'packets_feedback', submitted_at: new Date(1790000000000 + i).toISOString(), expires_at: '', page: 'packets', feedback_kind: 'idea', message: `Synthetic idea ${i}`, browser: 'edge', device: 'tablet' });

describe('POST /packetsFeedback stores only the contract fields', () => {
  it('accepts a clean message, stores exactly the listed fields, and keeps no client identifiers', async () => {
    const kv = fakeKv();
    const request = new Request('https://worker.test/packetsFeedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SyntheticAgent/9.9 (UniqueUA)',
        'CF-Connecting-IP': '203.0.113.77',
        Origin: 'https://synthetic-origin.example',
        Referer: 'https://synthetic-origin.example/packets-feedback.html',
      },
      body: JSON.stringify({ ...base, message: '  The second step was hard to find.  ' }),
    });
    Object.defineProperty(request, 'cf', { value: { country: 'ZZ', city: 'SyntheticCity' } });
    const response = await worker.fetch(request, envFor(kv));
    expect(response.status).toBe(201);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBeNull();
    expect(response.headers.get('Cache-Control')).toBe('no-store, private');
    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual(['id', 'ok']);
    expect(body.ok).toBe(true);
    expect(body.id).toMatch(/^pfb:\d{13}:[a-f0-9]{8}$/);

    expect(kv.put).toHaveBeenCalledOnce();
    const [key, raw, options] = kv.put.mock.calls[0];
    expect(key).toBe(body.id);
    const stored = JSON.parse(raw);
    expect(Object.keys(stored).sort()).toEqual(['browser', 'device', 'expires_at', 'feedback_kind', 'kind', 'message', 'page', 'schema_version', 'submitted_at']);
    expect(stored).toMatchObject({ schema_version: '1.0', kind: 'packets_feedback', page: 'packets-make', feedback_kind: 'confusing', message: 'The second step was hard to find.', browser: 'chrome', device: 'computer' });
    expect(Date.parse(stored.expires_at) - Date.parse(stored.submitted_at)).toBe(RETENTION_SECONDS * 1000);
    expect(options.expirationTtl).toBe(RETENTION_SECONDS);
    expect(Object.keys(options).sort()).toEqual(['expirationTtl', 'metadata']);
    expect(Object.keys(options.metadata).sort()).toEqual(['feedback_kind', 'page', 'submitted_at']);

    const everything = (raw + JSON.stringify(options)).toLowerCase();
    for (const leak of ['syntheticagent', 'uniqueua', '203.0.113.77', 'synthetic-origin', '"zz"', 'syntheticcity', 'user_agent', 'country', '"ip', 'origin', 'referer', 'submitter', 'headers']) {
      expect(everything).not.toContain(leak);
    }
  });

  it.each([
    ['[name] and [email] placeholders'],
    ['[name] said the [phone], [date], [link], [number] and [address] boxes were clear.'],
    ['My 3 students struggled with the second step, but 2 minutes later it worked.'],
    ['Did it work? It did! Version 2 is better.'],
    ['Mr. [name] used it with 24 kids in grade 5.'],
  ])('accepts placeholder and plain wording without refusing: %s', async message => {
    const kv = fakeKv();
    const response = await post({ ...base, message }, envFor(kv));
    expect(response.status).toBe(201);
    expect(kv.put).toHaveBeenCalledOnce();
  });

  it('accepts a 600-character message', async () => {
    expect((await post({ ...base, message: 'a'.repeat(600) })).status).toBe(201);
  });
});

describe('POST /packetsFeedback refuses personal information (422, nothing stored)', () => {
  it.each([
    ['email', 'Write to pat.lee@school.example please'],
    ['phone (US)', 'Call me at 207-555-0143'],
    ['SSN', 'Number 123-45-6789 showed up'],
    ['social URL', 'See instagram.com/someteacher'],
    ['street address', 'We are at 12 Maple Street now'],
    ['titled name', 'Ms. Rivera liked it'],
    ['diagnostic acronym', 'my IEP students liked it'],
    ['link with query or fragment', 'It broke on https://example.org/page?student=4'],
    ['link with query or fragment', 'See apomera.github.io/packets.html#step2 for it'],
    ['long number', 'Reference 12345678 failed'],
    ['date', 'Born 3/14/2016 so the level was off'],
    ['date', 'On 2016-03-14 it failed'],
    ['ID number', 'Student ID 4471 could not log in'],
    ['ID number', 'case number: AB-12 again'],
    ['@handle', 'Ping @coolteacher about it'],
  ])('refuses %s', async (kind, message) => {
    const kv = fakeKv();
    const rate = fakeKv();
    const response = await post({ ...base, message }, envFor(kv, { SUBMIT_RATE: rate }));
    expect(response.status).toBe(422);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('personal_info');
    expect(body.kinds).toContain(kind);
    expect(JSON.stringify(body)).not.toContain(message);
    expect(kv.put).not.toHaveBeenCalled();
    expect([...rate.store.keys()].some(key => key.startsWith('submitdupe:'))).toBe(false);
  });

  it('lists every matching kind once', async () => {
    const body = await (await post({ ...base, message: 'pat@school.example and @pat and 3/14/2016' })).json();
    expect(body.kinds.sort()).toEqual(['@handle', 'date', 'email']);
  });
});

describe('POST /packetsFeedback contract validation', () => {
  it.each([
    ['an extra key', { ...base, name: 'x' }],
    ['a user agent key', { ...base, userAgent: 'x' }],
    ['a missing key', (({ device, ...rest }) => rest)(base)],
    ['v 2', { ...base, v: 2 }],
    ['v as a string', { ...base, v: '1' }],
    ['an unknown page', { ...base, page: 'packets-secret' }],
    ['an unknown kind', { ...base, kind: 'angry' }],
    ['an unknown browser', { ...base, browser: 'opera' }],
    ['an unknown device', { ...base, device: 'watch' }],
    ['a non-string message', { ...base, message: 42 }],
    ['a non-string enum', { ...base, page: ['packets'] }],
    ['an empty message', { ...base, message: '   ' }],
    ['a 601-character message', { ...base, message: 'a'.repeat(601) }],
    ['an array body', [base]],
  ])('refuses %s with 400 and stores nothing', async (_label, body) => {
    const kv = fakeKv();
    const response = await post(body, envFor(kv));
    expect(response.status).toBe(400);
    expect((await response.json()).ok).toBe(false);
    expect(kv.put).not.toHaveBeenCalled();
  });

  it('refuses a body over 4 KB with 413, by declared or actual size', async () => {
    const kv = fakeKv();
    const big = JSON.stringify({ ...base, message: 'a'.repeat(4100) });
    expect((await post(big, envFor(kv))).status).toBe(413);
    expect((await post(JSON.stringify(base), envFor(kv), { 'Content-Length': '5000' })).status).toBe(413);
    expect(kv.put).not.toHaveBeenCalled();
  });

  it('refuses a non-JSON content type with 415', async () => {
    expect((await post(JSON.stringify(base), envFor(), { 'Content-Type': 'text/plain' })).status).toBe(415);
  });

  it('uses the same intake protection as /submitBug: 503 without SUBMIT_RATE, 409 duplicate, 429 per-IP minute cap', async () => {
    expect((await post(base, { BUG_REPORTS: fakeKv() })).status).toBe(503);
    vi.spyOn(Date, 'now').mockReturnValue(1800000000000); // keep one minute window
    const env = envFor(fakeKv(), { SUBMIT_RATE_PER_MINUTE: '1' });
    const ip = { 'CF-Connecting-IP': '198.51.100.9' };
    expect((await post(base, env, ip)).status).toBe(201);
    expect((await post(base, env, ip)).status).toBe(409);
    expect((await post({ ...base, message: 'Another synthetic note.' }, env, ip)).status).toBe(429);
  });

  it('answers 503 when feedback storage is not bound', async () => {
    expect((await post(base, envFor(undefined, { BUG_REPORTS: undefined }))).status).toBe(503);
  });

  it('still accepts clean Packets feedback when TURNSTILE_SECRET is enabled on the shared worker', async () => {
    const kv = fakeKv();
    const response = await post(base, envFor(kv, { TURNSTILE_SECRET: 'synthetic-turnstile-secret' }));
    expect(response.status).toBe(201);
    expect(kv.put).toHaveBeenCalledOnce();
  });
});

describe('CORS for /packetsFeedback', () => {
  it('answers OPTIONS like /submitBug, narrowed to POST + Content-Type, with no credentials', async () => {
    const response = await worker.fetch(new Request('https://worker.test/packetsFeedback', { method: 'OPTIONS' }), envFor());
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBeNull();
    expect(response.headers.get('Cache-Control')).toBe('no-store, private');
  });

  it('refuses other methods', async () => {
    expect((await worker.fetch(new Request('https://worker.test/packetsFeedback', { method: 'PUT', body: '{}' }), envFor())).status).toBe(405);
  });
});

describe('GET /packetsFeedback inbox reader', () => {
  const mixed = () => fakeKv([
    [pfbKey(1), pfbRecord(1)], [pfbKey(3), pfbRecord(3)], [pfbKey(2), pfbRecord(2)],
    ['bug:1790000000005:abcdef12', JSON.stringify({ kind: 'bug_report', what: 'Synthetic bug', submitted_at: new Date(1790000000005).toISOString() })],
  ]);

  it('needs the admin bearer token', async () => {
    const kv = mixed();
    expect((await get('/packetsFeedback', envFor(kv), '')).status).toBe(401);
    expect((await get('/packetsFeedback?token=' + token, envFor(kv), '')).status).toBe(401);
    expect((await get('/packetsFeedback', envFor(kv), 'Bearer wrong')).status).toBe(401);
    expect((await get('/packetsFeedback', { BUG_REPORTS: kv })).status).toBe(501);
    expect(kv.list).not.toHaveBeenCalled();
  });

  it('returns only pfb: records, newest first, with no CORS read access', async () => {
    const response = await get('/packetsFeedback?limit=50', envFor(mixed()));
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(response.headers.get('Cache-Control')).toBe('no-store, private');
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.feedback.map(row => row.id)).toEqual([pfbKey(3), pfbKey(2), pfbKey(1)]);
    expect(body.feedback[0]).toMatchObject({ page: 'packets', feedback_kind: 'idea', message: 'Synthetic idea 3', browser: 'edge', device: 'tablet' });
    expect(JSON.stringify(body)).not.toContain('Synthetic bug');
  });

  it('honours limit', async () => {
    const body = await (await get('/packetsFeedback?limit=2', envFor(mixed()))).json();
    expect(body.feedback.map(row => row.id)).toEqual([pfbKey(3), pfbKey(2)]);
  });

  it('keeps pfb: records out of the old /bugs listing', async () => {
    const kv = mixed();
    await post(base, envFor(kv));
    const body = await (await get('/bugs', envFor(kv))).json();
    expect(body.ok).toBe(true);
    expect(body.reports.map(row => row.id)).toEqual(['bug:1790000000005:abcdef12']);
  });
});

describe('GET /packets-feedback-inbox reader page', () => {
  it('serves a nonce-CSP shell with no data, and renders untrusted text as text', async () => {
    const response = await get('/packets-feedback-inbox', envFor(), '');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/html');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    const csp = response.headers.get('Content-Security-Policy');
    const nonce = csp.match(/script-src 'nonce-([a-f0-9]+)'/)[1];
    expect(csp).toContain(`style-src 'nonce-${nonce}'`);
    expect(csp).toContain("connect-src 'self'");
    const html = await response.text();
    expect(html).toContain(`<script nonce="${nonce}">`);
    expect(html).not.toContain(token);

    const injected = '<img src=x onerror="window.compromised=true">';
    const fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true, count: 1, feedback: [{ id: 'pfb:1790000000001:abcdef01', submitted_at: '2026-11-23T10:00:00Z', page: '<b>p</b>', feedback_kind: 'idea', message: injected, browser: 'edge', device: 'tablet' }] }) }));
    const dom = new JSDOM(html, { url: 'https://worker.test/packets-feedback-inbox', runScripts: 'dangerously', beforeParse(window) { window.fetch = fetch; } });
    try {
      const doc = dom.window.document;
      doc.getElementById('token').value = 'typed-token';
      doc.getElementById('login').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
      await vi.waitFor(() => expect(doc.getElementById('inbox').hidden).toBe(false));
      expect(fetch).toHaveBeenCalledWith('/packetsFeedback?limit=50', expect.objectContaining({ headers: { Authorization: 'Bearer typed-token', Accept: 'application/json' }, credentials: 'omit' }));
      expect(doc.getElementById('list').textContent).toContain(injected);
      expect(doc.querySelector('#list img, #list b')).toBeNull();
      expect(dom.window.compromised).toBeUndefined();
      expect(doc.documentElement.outerHTML).not.toContain('typed-token');
    } finally {
      dom.window.close();
    }
  });
});
