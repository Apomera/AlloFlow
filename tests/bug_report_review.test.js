import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import localWorker from '../catalog/cloudflare-worker/src/index.js';

const worker = process.env.WORKER_SOURCE
  ? (await import(/* @vite-ignore */ pathToFileURL(resolve(process.env.WORKER_SOURCE)).href)).default
  : localWorker;
const token = 'synthetic-private-review-token';
const receipt = 'bug:1700000000000:abcdef12';
const otherReceipt = 'bug:1700000000001:abcdef12';
const prefix = `bug-review:${receipt}:`;
const original = JSON.stringify({ kind: 'bug_report', what: 'Synthetic unchanged original log', submitted_at: '2023-11-14T22:13:20.000Z' });
const defaultReview = { status: 'new', updated_at: null, note_count: 0, status_updated_at: null, status_event_id: null };

function fakeKv() {
  const store = new Map([[receipt, original], [otherReceipt, original]]);
  const metadata = new Map();
  return {
    store, metadata,
    get: vi.fn(async name => store.get(name) ?? null),
    put: vi.fn(async (name, value, options = {}) => { store.set(name, value); metadata.set(name, options.metadata); }),
    list: vi.fn(async ({ prefix: selectedPrefix = '', limit = 1000, cursor = '' } = {}) => {
      const keys = [...store.keys()].filter(name => name.startsWith(selectedPrefix)).sort();
      const start = Number(cursor || 0);
      const end = Math.min(start + limit, keys.length);
      return { keys: keys.slice(start, end).map(name => ({ name, ...(metadata.has(name) ? { metadata: metadata.get(name) } : {}) })), list_complete: end >= keys.length, cursor: end < keys.length ? String(end) : '' };
    }),
  };
}
const envFor = (kv = fakeKv(), extra = {}) => ({ BUG_REPORTS: kv, BUG_REPORTS_ADMIN_TOKEN: token, ...extra });
function request(method = 'GET', path = `/bug-review?id=${receipt}`, env = envFor(), payload, authorization = `Bearer ${token}`, contentType = 'application/json') {
  return worker.fetch(new Request(`https://worker.test${path}`, {
    method, headers: { ...(authorization ? { Authorization: authorization } : {}), ...(contentType ? { 'Content-Type': contentType } : {}) },
    ...(payload !== undefined ? { body: typeof payload === 'string' ? payload : JSON.stringify(payload) } : {}),
  }), env);
}
const post = (payload, env = envFor()) => request('POST', '/bug-review', env, payload);
const get = (env = envFor(), id = receipt) => request('GET', `/bug-review?id=${encodeURIComponent(id)}`, env);
function expectPrivate(response) {
  expect(response.headers.get('Cache-Control')).toBe('no-store, private');
  expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
  expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
}
function seed(kv, { time = 1700000000100, id = 'a'.repeat(32), status, note, target = receipt } = {}) {
  const event = { id, created_at: new Date(time).toISOString(), ...(status !== undefined ? { status } : {}), ...(note !== undefined ? { note } : {}) };
  kv.store.set(`bug-review:${target}:${time}:${id}`, JSON.stringify(event));
  return event;
}
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('private report review authorization', () => {
  it.each(['GET', 'POST'])('requires bearer authentication before any %s storage access', async method => {
    const kv = fakeKv();
    for (const authorization of ['', token, `Basic ${token}`, 'Bearer wrong']) {
      const response = await request(method, `/bug-review?id=${receipt}&token=${token}`, envFor(kv), method === 'POST' ? { id: receipt, status: 'resolved' } : undefined, authorization);
      expect(response.status).toBe(401); expectPrivate(response);
    }
    expect(kv.get).not.toHaveBeenCalled(); expect(kv.list).not.toHaveBeenCalled(); expect(kv.put).not.toHaveBeenCalled();
  });
  it('fails closed when access is not configured and hides storage availability from unauthenticated callers', async () => {
    const disabled = await get({ BUG_REPORTS: fakeKv() });
    expect(disabled.status).toBe(501); expectPrivate(disabled);
    expect((await request('GET', `/bug-review?id=${receipt}`, { BUG_REPORTS_ADMIN_TOKEN: token }, undefined, '')).status).toBe(401);
    const missing = await get({ BUG_REPORTS_ADMIN_TOKEN: token });
    expect(missing.status).toBe(503); expectPrivate(missing);
  });
  it('supports the legacy token only without a dedicated token', async () => {
    const kv = fakeKv();
    expect((await request('GET', `/bug-review?id=${receipt}`, { BUG_REPORTS: kv, ADMIN_TOKEN: 'legacy' }, undefined, 'Bearer legacy')).status).toBe(200);
    expect((await request('GET', `/bug-review?id=${receipt}`, envFor(kv, { ADMIN_TOKEN: 'legacy' }), undefined, 'Bearer legacy')).status).toBe(401);
  });
  it.each(['/pdSubmissions', '/pluginSubmissions'])('never extends dedicated review credentials to %s', async path => {
    expect((await request('GET', path, envFor(fakeKv(), { ADMIN_TOKEN: 'different', PD_SUBMISSIONS: fakeKv(), PLUGIN_SUBMISSIONS: fakeKv() }))).status).toBe(401);
  });
  it.each(['DELETE', 'PATCH', 'PUT', 'HEAD'])('keeps unsupported %s outcomes private', async method => {
    const response = await request(method, '/bug-review');
    expect(response.status).toBe(405); expectPrivate(response);
  });
  it('keeps review preflights non-cacheable', async () => {
    const response = await request('OPTIONS', '/bug-review', {}, undefined, '');
    expect(response.status).toBe(204); expectPrivate(response);
  });
});

describe('review input and report validation', () => {
  it.each([null, [], {}, { id: receipt }, { id: 'bug:bad', status: 'new' }, { id: otherReceipt + ':extra', note: 'Note' },
    { id: receipt, status: 'closed' }, { id: receipt, status: null }, { id: receipt, note: '' }, { id: receipt, note: ' \n\t' },
    { id: receipt, note: 9 }, { id: receipt, note: 'n'.repeat(2001) }, { id: receipt, status: 'new', created_at: 'client-time' },
    { id: receipt, status: 'resolved', events: [] }])('rejects invalid payload %# before storage access', async payload => {
    const kv = fakeKv(); const response = await post(payload, envFor(kv));
    expect(response.status).toBe(400); expectPrivate(response);
    expect(kv.get).not.toHaveBeenCalled(); expect(kv.put).not.toHaveBeenCalled();
  });
  it.each(['', 'invalid', 'bug:123:abc', 'pd:1700000000000:abcdef12', 'bug:1700000000000:../secret', receipt + '\n'])('rejects invalid GET receipt %s', async id => {
    const kv = fakeKv(); const response = await get(envFor(kv), id);
    expect(response.status).toBe(400); expectPrivate(response); expect(kv.get).not.toHaveBeenCalled();
  });
  it('rejects ambiguous repeated GET receipts', async () => {
    expect((await request('GET', `/bug-review?id=${receipt}&id=${otherReceipt}`)).status).toBe(400);
  });
  it.each([['{', 'application/json', 400], ['{}', 'text/plain', 415], ['{}', 'application/jsonp', 415], ['x'.repeat(16385), 'application/json', 413], ['😀'.repeat(5000), 'application/json', 413]])('handles malformed/oversized request %# privately', async (body, contentType, expected) => {
    const kv = fakeKv(); const response = await request('POST', '/bug-review', envFor(kv), body, `Bearer ${token}`, contentType);
    expect(response.status).toBe(expected); expectPrivate(response); expect(kv.put).not.toHaveBeenCalled();
  });
  it.each(['GET', 'POST'])('checks that the receipt exists for %s', async method => {
    const kv = fakeKv(); kv.store.delete(receipt);
    const response = await request(method, `/bug-review?id=${receipt}`, envFor(kv), method === 'POST' ? { id: receipt, note: 'Synthetic' } : undefined);
    expect(response.status).toBe(404); expectPrivate(response); expect(kv.put).not.toHaveBeenCalled();
  });
  it.each(['null', '[]', '{broken'])('fails safely on a corrupt original %s', async value => {
    const kv = fakeKv(); kv.store.set(receipt, value);
    expect((await post({ id: receipt, status: 'resolved' }, envFor(kv))).status).toBe(502);
    expect(kv.put).not.toHaveBeenCalled();
  });
});

describe('immutable review events and private summaries', () => {
  it('gives legacy reports the new status with empty history', async () => {
    const kv = fakeKv();
    const response = await get(envFor(kv)); expectPrivate(response);
    expect(await response.json()).toEqual({ ok: true, review: { ...defaultReview, events: [] } });
    const list = await (await request('GET', '/bugs', envFor(kv))).json();
    expect(list.reports.every(report => JSON.stringify(report.review) === JSON.stringify(defaultReview))).toBe(true);
    expect(kv.put).not.toHaveBeenCalled();
  });
  it('appends status changes and trimmed notes without changing original report bytes', async () => {
    const kv = fakeKv(); const env = envFor(kv); const events = [];
    vi.spyOn(Date, 'now').mockReturnValueOnce(1700000000100).mockReturnValueOnce(1700000000200).mockReturnValueOnce(1700000000300).mockReturnValueOnce(1700000000400);
    for (const payload of [{ status: 'investigating' }, { note: '  Private synthetic note <script>text</script>  ' }, { status: 'resolved', note: 'Synthetic fix verified' }, { status: 'new' }]) {
      const response = await post({ id: receipt, ...payload }, env);
      expect(response.status).toBe(201); expectPrivate(response);
      const body = await response.json(); expect(body.ok).toBe(true); expect(body.event.id).toMatch(/^[a-f0-9]{32}$/); events.push(body.event);
    }
    const full = await (await get(env)).json();
    expect(full.review).toEqual({ status: 'new', updated_at: '2023-11-14T22:13:20.400Z', note_count: 2, status_updated_at: events[3].created_at, status_event_id: events[3].id, events });
    expect(events[1].note).toBe('Private synthetic note <script>text</script>');
    expect(kv.store.get(receipt)).toBe(original); expect(kv.store.get(otherReceipt)).toBe(original);
    expect(kv.put.mock.calls.every(([name, , options]) => name.startsWith(prefix) && !options.expiration && !options.expirationTtl)).toBe(true);
    kv.get.mockClear();
    const list = await (await request('GET', '/bugs', env)).json();
    expect(list.reports.find(report => report.id === receipt).review).toEqual({ status: 'new', updated_at: events[3].created_at, note_count: 2, status_updated_at: events[3].created_at, status_event_id: events[3].id });
    expect(JSON.stringify(list)).not.toContain('Private synthetic note');
    expect(kv.get.mock.calls.every(([name]) => name.startsWith('bug:'))).toBe(true);
  });
  it('accepts the full 2000-character note limit', async () => {
    const response = await post({ id: receipt, note: 'n'.repeat(2000) });
    expect(response.status).toBe(201); expect((await response.json()).event.note.length).toBe(2000);
  });
  it('keeps notes report-specific and does not reset status for a newer note', async () => {
    const kv = fakeKv(); const status = seed(kv, { status: 'resolved' });
    const note = seed(kv, { time: 1700000000200, note: 'Private note after resolution' });
    seed(kv, { time: 1700000000300, note: 'Different report private note', target: otherReceipt });
    const body = await (await get(envFor(kv))).json();
    expect(body.review).toMatchObject({ status: 'resolved', updated_at: note.created_at, note_count: 1, status_updated_at: status.created_at, status_event_id: status.id });
    expect(body.review.events).toHaveLength(2); expect(JSON.stringify(body)).not.toContain('Different report');
  });
  it('uses server timestamp then event ID for stable ordering, regardless of arrival order', async () => {
    const kv = fakeKv();
    const last = seed(kv, { id: 'f'.repeat(32), status: 'resolved' });
    const first = seed(kv, { time: 1700000000099, id: 'f'.repeat(32), status: 'new', note: 'First' });
    const tied = seed(kv, { id: 'a'.repeat(32), status: 'investigating', note: 'Tie' });
    kv.list.mockResolvedValue({ keys: [...kv.store.keys()].filter(name => name.startsWith(prefix)).map(name => ({ name })), list_complete: true });
    const body = await (await get(envFor(kv))).json();
    expect(body.review).toEqual({ status: 'resolved', updated_at: last.created_at, note_count: 2, status_updated_at: last.created_at, status_event_id: last.id, events: [first, tied, last] });
  });
  it('preserves exact status ordering when a later note is visible before a delayed status event', async () => {
    const kv = fakeKv();
    const older = seed(kv, { status: 'investigating' });
    const delayed = seed(kv, { time: 1700000000200, status: 'resolved', id: 'b'.repeat(32) });
    const note = seed(kv, { time: 1700000000300, note: 'Later note visible first' });
    const delayedKey = `${prefix}1700000000200:${delayed.id}`;
    const list = kv.list.getMockImplementation();
    let hideDelayed = true;
    kv.list.mockImplementation(async options => {
      const page = await list(options);
      return { ...page, keys: page.keys.filter(key => !hideDelayed || key.name !== delayedKey) };
    });
    const env = envFor(kv);
    const initial = await (await request('GET', '/bugs', env)).json();
    expect(initial.reports.find(report => report.id === receipt).review).toEqual({
      status: 'investigating', updated_at: note.created_at, note_count: 1,
      status_updated_at: older.created_at, status_event_id: older.id,
    });
    hideDelayed = false;
    const later = await (await get(env)).json();
    expect(later.review).toEqual({ status: 'resolved', updated_at: note.created_at, note_count: 1,
      status_updated_at: delayed.created_at, status_event_id: delayed.id, events: [older, delayed, note] });
  });
  it('leaves the status position null for note-only history', async () => {
    const kv = fakeKv(); const note = seed(kv, { note: 'Private note without a status update' });
    const env = envFor(kv);
    const full = await (await get(env)).json();
    expect(full.review).toEqual({ ...defaultReview, updated_at: note.created_at, note_count: 1, events: [note] });
    const list = await (await request('GET', '/bugs', env)).json();
    expect(list.reports.find(report => report.id === receipt).review).toEqual({ ...defaultReview, updated_at: note.created_at, note_count: 1 });
  });
  it('acknowledges only after storage accepts the immutable event', async () => {
    const kv = fakeKv(); let release;
    const gate = new Promise(resolve => { release = resolve; });
    kv.put.mockImplementation(async () => gate);
    let settled = false;
    const pending = post({ id: receipt, note: 'Synthetic pending note' }, envFor(kv)).then(response => { settled = true; return response; });
    await vi.waitFor(() => expect(kv.put).toHaveBeenCalledOnce()); expect(settled).toBe(false);
    release(); const response = await pending; expect(response.status).toBe(201); expect((await response.json()).event.note).toBe('Synthetic pending note');
  });
  it('keeps simultaneous review updates as separate events', async () => {
    const kv = fakeKv(); vi.spyOn(Date, 'now').mockReturnValue(1700000000100);
    const responses = await Promise.all([post({ id: receipt, status: 'investigating', note: 'Reviewer one' }, envFor(kv)), post({ id: receipt, status: 'resolved', note: 'Reviewer two' }, envFor(kv))]);
    expect(responses.every(response => response.status === 201)).toBe(true);
    expect(new Set(kv.put.mock.calls.map(([key]) => key)).size).toBe(2);
    expect((await (await get(envFor(kv))).json()).review.note_count).toBe(2);
    expect(kv.store.get(receipt)).toBe(original);
  });
});

describe('complete review scans and safe failures', () => {
  it('continues through empty pages, deduplicates repeated keys, and retains all notes', async () => {
    const kv = fakeKv(); const first = seed(kv, { note: 'First' }); const second = seed(kv, { time: 1700000000200, note: 'Second' });
    const names = [...kv.store.keys()].filter(name => name.startsWith(prefix));
    kv.list.mockReset().mockResolvedValueOnce({ keys: [{ name: names[0] }], list_complete: false, cursor: 'one' })
      .mockResolvedValueOnce({ keys: [], list_complete: false, cursor: 'two' })
      .mockResolvedValueOnce({ keys: names.map(name => ({ name })), list_complete: true });
    const body = await (await get(envFor(kv))).json();
    expect(body.review.events).toEqual([first, second]); expect(body.review.note_count).toBe(2);
    expect(kv.list).toHaveBeenNthCalledWith(3, { prefix, limit: 1000, cursor: 'two' });
  });
  it('reads beyond the first 1000 events', async () => {
    const kv = fakeKv();
    for (let index = 0; index < 1001; index++) seed(kv, { time: 1700000000100 + index, note: `Synthetic note ${index}` });
    const response = await get(envFor(kv)); const body = await response.json();
    expect(response.status).toBe(200); expect(body.review.note_count).toBe(1001); expect(body.review.events).toHaveLength(1001);
    expect(body.review.events[1000].note).toBe('Synthetic note 1000'); expect(kv.list).toHaveBeenCalledTimes(2);
  });
  it.each([
    [{ keys: [], list_complete: false }],
    [{ keys: [], list_complete: false, cursor: 'again' }, { keys: [], list_complete: false, cursor: 'again' }],
    [{ keys: [] }], [{ keys: [{ name: `${prefix}bad` }], list_complete: true }],
  ])('fails instead of silently returning a partial history %#', async (...pages) => {
    const kv = fakeKv(); kv.list.mockReset(); pages.forEach(page => kv.list.mockResolvedValueOnce(page));
    const response = await get(envFor(kv)); expect(response.status).toBe(502); expectPrivate(response);
    expect(await response.json()).toEqual({ ok: false, error: 'Could not load review. Please try again.' });
  });
  it.each([null, '{broken', '[]', '{}', JSON.stringify({ id: 'a'.repeat(32), created_at: 'client-time', status: 'resolved' })])('fails visibly for an unavailable or invalid event %#', async value => {
    const kv = fakeKv(); seed(kv, { note: 'Synthetic' });
    kv.get.mockImplementation(async name => name.startsWith(prefix) ? value : kv.store.get(name));
    const response = await get(envFor(kv)); expect(response.status).toBe(502); expectPrivate(response);
  });
  it.each(['get', 'list', 'put'])('hides provider internals on %s failure and never returns an acknowledgement', async operation => {
    const kv = fakeKv(); kv[operation].mockRejectedValue(new Error('sensitive-provider-diagnostic'));
    const response = operation === 'list' ? await get(envFor(kv)) : await post({ id: receipt, note: 'Synthetic' }, envFor(kv));
    expect(response.status).toBe(502); expectPrivate(response);
    const body = await response.json(); expect(body.ok).toBe(false); expect(body.event).toBeUndefined(); expect(JSON.stringify(body)).not.toContain('sensitive-provider-diagnostic');
    expect(kv.store.get(receipt)).toBe(original);
  });
  it('fails the report list if any review summary is unreadable instead of labeling it new', async () => {
    const kv = fakeKv(); seed(kv, { note: 'Synthetic' });
    kv.metadata.set([...kv.store.keys()].find(key => key.startsWith(prefix)), { schema_version: 1, created_at: 'bad', has_note: true });
    const response = await request('GET', '/bugs', envFor(kv));
    expect(response.status).toBe(502); expectPrivate(response); expect((await response.json()).reports).toBeUndefined();
  });
});
