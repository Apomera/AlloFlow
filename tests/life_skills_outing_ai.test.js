import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createClient, createHost } = require('../life_skills_outing/ai.js');
const CHANNEL = 'allo-life-outing-ai-v1';
const TOKEN = 'outing-test-token-12345678901234567890';
const PARENT = 'https://learning.example';
const CHILD = 'https://practice.example';
const disposables = [];

function surface(origin, search = '') {
  const listeners = new Set();
  return {
    origin, location: { origin, search }, received: [],
    addEventListener: (type, fn) => { if (type === 'message') listeners.add(fn); },
    removeEventListener: (type, fn) => { if (type === 'message') listeners.delete(fn); },
    emit(event) { this.received.push(event); [...listeners].forEach(fn => fn(event)); },
    listenerCount: () => listeners.size
  };
}
function setup(call = async () => '{"text":"Let us think through the outing together."}', options = {}) {
  const parent = surface(PARENT);
  const child = surface(CHILD, '?' + new URLSearchParams({ bridgeToken: TOKEN, parentOrigin: PARENT }));
  const targets = [];
  child.opener = parent;
  parent.postMessage = (data, origin) => { targets.push(origin); parent.emit({ data, origin: CHILD, source: child }); };
  child.postMessage = (data, origin) => { targets.push(origin); child.emit({ data, origin: PARENT, source: parent }); };
  const host = createHost({ window: parent, source: child, origin: CHILD, token: TOKEN, call, timeoutMs: options.hostTimeout ?? 100 });
  const onAvailability = vi.fn();
  const client = createClient({ window: child, timeoutMs: options.clientTimeout ?? 120, onAvailability });
  disposables.push(client, host);
  return { parent, child, host, client, targets, onAvailability };
}
function payload(overrides = {}) {
  return { kind: 'intro', runId: 'outing-test-run', revision: 0, context: 'community', language: 'plain',
    facts: ['The outing starts at the community center.', 'The bag is empty.'], ...overrides };
}
function envelope(p, requestId = 'request-1') {
  return { channel: CHANNEL, token: TOKEN, type: 'request', runId: p.runId, revision: p.revision, requestId, payload: p };
}
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
afterEach(() => { disposables.splice(0).forEach(item => item.destroy()); vi.useRealTimers(); });

describe('optional outing narration and dialogue boundary', () => {
  it('authenticates readiness and sends only bounded fictional facts to the injected provider', async () => {
    const call = vi.fn(async () => '{"text":"You have an outing to prepare for. What will you check first?"}');
    const h = setup(call);
    expect(h.client.available()).toBe(true);
    const p = payload(), snapshot = JSON.stringify(p);
    expect(await h.client.request(p)).toEqual({ status: 'generated', text: 'You have an outing to prepare for. What will you check first?' });
    expect(JSON.stringify(p)).toBe(snapshot);
    expect(call).toHaveBeenCalledTimes(1);
    expect(call.mock.calls[0][0]).toContain('The bag is empty.');
    expect(call.mock.calls[0][0]).not.toContain(p.runId);
    expect(call.mock.calls[0][0]).toContain('The software alone controls facts');
    expect(call.mock.calls[0][1].signal.aborted).toBe(true);
    expect(h.targets.every(origin => [PARENT, CHILD].includes(origin))).toBe(true);
  });

  it('keeps standalone and provider-free practice immediately playable', async () => {
    const standalone = createClient({ window: surface(CHILD) });
    disposables.push(standalone);
    expect(standalone.available()).toBe(false);
    expect((await standalone.request(payload())).status).toBe('authored');
    const h = setup(null);
    expect(h.client.available()).toBe(false);
    expect((await h.client.request(payload({ kind: 'dialogue', intent: 'help' }))).text).toContain('ask for support');
    const unsafe = surface('null', '?bridgeToken=' + TOKEN + '&parentOrigin=null');
    unsafe.opener = { postMessage: vi.fn() };
    const unavailable = createClient({ window: unsafe });
    disposables.push(unavailable);
    expect(unavailable.available()).toBe(false);
    expect(unsafe.opener.postMessage).not.toHaveBeenCalled();
  });

  it('ignores forged source, origin, and token on the host', async () => {
    const call = vi.fn(async () => '{"text":"Hello."}'), h = setup(call);
    const data = envelope(payload());
    h.parent.emit({ data, source: {}, origin: CHILD });
    h.parent.emit({ data, source: h.child, origin: 'https://attacker.example' });
    h.parent.emit({ data: { ...data, token: 'wrong-token-1234567890123456' }, source: h.child, origin: CHILD });
    h.parent.emit({ data: { ...data, unexpected: true }, source: h.child, origin: CHILD });
    await flush();
    expect(call).not.toHaveBeenCalled();
  });

  it('requires exact response ownership and authentication before displaying text', async () => {
    let resolve;
    const h = setup(() => new Promise(done => { resolve = done; }));
    const promise = h.client.request(payload());
    await flush();
    const request = h.parent.received.find(e => e.data.type === 'request').data;
    const data = { channel: CHANNEL, token: TOKEN, type: 'response', runId: request.runId,
      revision: request.revision, requestId: request.requestId, text: 'Forged text', status: 'generated' };
    h.child.emit({ data, source: {}, origin: PARENT });
    h.child.emit({ data, source: h.parent, origin: 'https://attacker.example' });
    h.child.emit({ data: { ...data, token: 'wrong' }, source: h.parent, origin: PARENT });
    h.child.emit({ data: { ...data, revision: 1 }, source: h.parent, origin: PARENT });
    h.child.emit({ data: { ...data, runId: 'other-run' }, source: h.parent, origin: PARENT });
    h.child.emit({ data: { ...data, requestId: 'other-request' }, source: h.parent, origin: PARENT });
    resolve('{"text":"The real reply."}');
    expect(await promise).toEqual({ status: 'generated', text: 'The real reply.' });
  });

  it('rejects additional authority fields even in an authenticated response', async () => {
    let resolve;
    const h = setup(() => new Promise(done => { resolve = done; }));
    const pending = h.client.request(payload());
    await flush();
    const request = h.parent.received.find(e => e.data.type === 'request').data;
    h.child.emit({ source: h.parent, origin: PARENT, data: { channel: CHANNEL, token: TOKEN, type: 'response',
      runId: request.runId, revision: request.revision, requestId: request.requestId, text: 'All done.', status: 'generated', completed: true } });
    expect((await pending).status).toBe('fallback');
    resolve('{"text":"The late legitimate response."}'); await flush();
  });

  it.each([
    'Free prose without a validated object.',
    '```json\n{"text":"A fenced response."}\n```',
    '{"text":"You won.","inventory":["keys"]}',
    '{"text":42}',
    '{"text":"<img src=x onerror=alert(1)>"}',
    '{"text":"Visit https://unreviewed.example"}',
    JSON.stringify({ text: 'a'.repeat(701) }),
    '{"text":""}',
    '{"text":"Hidden\\u0000control"}',
    { text: 'An unvalidated provider object.' }
  ])('uses authored fallback for malformed or state-bearing provider output %#', async raw => {
    const h = setup(async () => raw);
    const response = await h.client.request(payload());
    expect(response.status).toBe('fallback');
    expect(response.text).toContain('Get ready for your outing');
  });

  it('rejects invalid task metadata before invoking a provider', async () => {
    const call = vi.fn(), h = setup(call);
    for (const invalid of [
      payload({ revision: -1 }), payload({ revision: 1.5 }), payload({ revision: 1001 }),
      payload({ kind: 'score' }), payload({ context: 'private-profile' }), payload({ language: 'unknown' }),
      payload({ facts: ['a'.repeat(201)] }), payload({ facts: Array(9).fill('fact') }),
      payload({ facts: Array(8).fill('a'.repeat(160)) }), payload({ facts: ['bad\u0000fact'] }),
      payload({ kind: 'dialogue', intent: 'buy' }), payload({ inventory: ['invented'] }),
      payload({ runId: 'contains spaces' }), payload({ runId: 123 }), payload({ intent: 'help' })
    ]) expect((await h.client.request(invalid)).status).toBe('fallback');
    const mismatched = envelope(payload()); mismatched.runId = 'different-run';
    h.parent.emit({ data: mismatched, source: h.child, origin: CHILD });
    await flush();
    expect(call).not.toHaveBeenCalled();
  });

  it('limits each run to one introduction and three dialogue calls, including failed attempts', async () => {
    const call = vi.fn(async () => '{"text":"A brief reply."}'), h = setup(call);
    expect((await h.client.request(payload())).status).toBe('generated');
    expect((await h.client.request(payload())).status).toBe('fallback');
    for (const intent of ['plan', 'change', 'help'])
      expect((await h.client.request(payload({ kind: 'dialogue', intent }))).status).toBe('generated');
    expect((await h.client.request(payload({ kind: 'dialogue', intent: 'help' }))).status).toBe('fallback');
    expect(call).toHaveBeenCalledTimes(4);
    expect((await h.client.request(payload({ runId: 'another-run' }))).status).toBe('generated');
    const brokenCall = vi.fn(async () => { throw new Error('No provider available'); });
    const broken = setup(brokenCall);
    expect((await broken.client.request(payload())).status).toBe('fallback');
    expect((await broken.client.request(payload())).status).toBe('fallback');
    expect(brokenCall).toHaveBeenCalledTimes(1);
  });

  it('ignores duplicate requests and older revisions on the host', async () => {
    const call = vi.fn(async () => '{"text":"A brief reply."}'), h = setup(call);
    await h.client.request(payload({ revision: 2 }));
    const old = h.parent.received.find(e => e.data.type === 'request');
    h.parent.emit(old);
    h.parent.emit({ data: envelope(payload({ kind: 'dialogue', intent: 'help', revision: 1 }), 'older-request'), source: h.child, origin: CHILD });
    await flush();
    expect(call).toHaveBeenCalledTimes(1);
    expect(h.child.received.at(-1).data.status).toBe('fallback');
  });

  it('cancels the preceding client request and suppresses its late reply after an action', async () => {
    const resolvers = [], signals = [];
    const h = setup((_prompt, { signal }) => { signals.push(signal); return new Promise(resolve => resolvers.push(resolve)); });
    const first = h.client.request(payload());
    await flush();
    const whileCancelling = h.client.request(payload({ kind: 'dialogue', intent: 'change', revision: 1 }));
    await flush();
    expect((await first).status).toBe('fallback');
    expect((await whileCancelling).status).toBe('fallback');
    expect(signals[0].aborted).toBe(true);
    expect(resolvers).toHaveLength(1);
    resolvers[0]('{"text":"Obsolete text."}');
    await flush();
    const second = h.client.request(payload({ kind: 'dialogue', intent: 'change', revision: 1 }));
    await flush();
    resolvers[1]('{"text":"Current text."}');
    expect(await second).toEqual({ status: 'generated', text: 'Current text.' });
    expect(h.child.received.some(e => e.data.text === 'Obsolete text.')).toBe(false);
  });

  it('accepts abort signals and never publishes a cancelled generation', async () => {
    let resolve;
    const h = setup(() => new Promise(done => { resolve = done; }));
    const controller = new AbortController();
    const pending = h.client.request(payload(), { signal: controller.signal });
    await flush(); controller.abort();
    expect((await pending).status).toBe('fallback');
    resolve('{"text":"Too late."}'); await flush();
    expect(h.child.received.some(e => e.data.text === 'Too late.')).toBe(false);
    expect((await h.client.request(payload(), { signal: controller.signal })).status).toBe('fallback');
  });

  it('times out bounded work, aborts the provider signal, and ignores late output', async () => {
    vi.useFakeTimers();
    let resolve, signal;
    const call = vi.fn((_prompt, options) => { signal = options.signal; return new Promise(done => { resolve = done; }); });
    const h = setup(call, { hostTimeout: 20, clientTimeout: 50 });
    const pending = h.client.request(payload());
    await flush(); await vi.advanceTimersByTimeAsync(21);
    expect((await pending).status).toBe('fallback');
    expect(signal.aborted).toBe(true);
    expect((await h.client.request(payload({ kind: 'dialogue', intent: 'help' }))).status).toBe('fallback');
    expect(call).toHaveBeenCalledTimes(1);
    resolve('{"text":"Too late."}'); await flush();
    expect(h.child.received.some(e => e.data.text === 'Too late.')).toBe(false);
  });

  it('falls back when the connected host disappears and removes listeners on teardown', async () => {
    vi.useFakeTimers();
    const h = setup(undefined, { clientTimeout: 20 });
    h.host.destroy();
    const pending = h.client.request(payload());
    await vi.advanceTimersByTimeAsync(21);
    expect((await pending).status).toBe('fallback');
    h.client.destroy();
    expect(h.client.available()).toBe(false);
    expect(h.parent.listenerCount()).toBe(0);
    expect(h.child.listenerCount()).toBe(0);
    expect((await h.client.request(payload())).status).toBe('authored');
  });

  it('retries the bounded handshake when the popup loads before the host is installed', async () => {
    vi.useFakeTimers();
    const parent = surface(PARENT);
    const child = surface(CHILD, '?' + new URLSearchParams({ bridgeToken: TOKEN, parentOrigin: PARENT }));
    child.opener = parent;
    parent.postMessage = (data, origin) => parent.emit({ data, source: child, origin: CHILD });
    child.postMessage = (data, origin) => child.emit({ data, source: parent, origin: PARENT });
    const client = createClient({ window: child });
    disposables.push(client);
    expect(client.available()).toBe(false);
    const host = createHost({ window: parent, source: child, origin: CHILD, token: TOKEN, call: async () => '{"text":"Connected."}' });
    disposables.push(host);
    await vi.advanceTimersByTimeAsync(501);
    expect(client.available()).toBe(true);
    expect((await client.request(payload())).text).toBe('Connected.');
  });

  it('allows only one provider operation per launch even if a second trusted run requests work', async () => {
    let resolve;
    const call = vi.fn(() => new Promise(done => { resolve = done; })), h = setup(call);
    const pending = h.client.request(payload());
    await flush();
    h.parent.emit({ data: envelope(payload({ runId: 'other-run' }), 'parallel-request'), source: h.child, origin: CHILD });
    await flush();
    expect(call).toHaveBeenCalledTimes(1);
    expect(h.child.received.at(-1).data.status).toBe('fallback');
    resolve('{"text":"First reply."}');
    expect((await pending).text).toBe('First reply.');
  });
});
