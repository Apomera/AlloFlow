'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createLocalImageProxy, validateRequest, decodeImage, MAX_JSON_BYTES } = require('../desktop/runtime/local-image-proxy.cjs');
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jfM0AAAAASUVORK5CYII=';
const sessionId = 'a'.repeat(32), token = 'b'.repeat(64);
const payload = (extra = {}) => ({ sessionId, requestId: 'request_0001', prompt: 'A blue teaching cube', width: 300, ...extra });
const reply = (value = { data: [{ b64_json: PNG }] }) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
function fixture(extra = {}) {
  const calls = [];
  const proxy = createLocalImageProxy({ connect: async () => ({ ready: true, canEdit: true, token }), fetch: async (...args) => { calls.push(args); return reply(); }, ...extra });
  return { proxy, calls, enable: () => proxy.setAccess({ enabled: true, sessionId }) };
}
test('disabled and stale sessions cannot connect or send an image request', async () => {
  let connects = 0; const f = fixture({ connect: async () => { connects++; return { ready: true, token }; } });
  await assert.rejects(f.proxy.request('generate', payload()), { code: 'not-enabled' });
  f.enable(); await assert.rejects(f.proxy.request('generate', payload({ sessionId: 'c'.repeat(32) })), { code: 'not-enabled' });
  assert.equal(connects, 0); assert.equal(f.calls.length, 0);
  assert.deepEqual(f.proxy.status(), { enabled: true, busy: false, needsStop: false });
});
test('only owned fixed endpoint receives the token; response projects image data only', async () => {
  const f = fixture(); f.enable(); const result = await f.proxy.request('generate', payload());
  assert.deepEqual(result, { image: 'data:image/png;base64,' + PNG });
  const [url, options] = f.calls[0];
  assert.equal(url, 'http://127.0.0.1:7860/v1/images/generations'); assert.equal(options.redirect, 'error');
  assert.equal(options.headers.Authorization, 'Bearer ' + token);
  assert.deepEqual(JSON.parse(options.body), { model: 'sana-sprint', prompt: payload().prompt, size: '288x288', n: 1, num_inference_steps: 2, response_format: 'b64_json' });
  assert.ok(!JSON.stringify([result, f.proxy.status()]).includes(token));
});
test('edit accepts bounded supported base64 image and excludes URL/model/header overrides', async () => {
  const f = fixture(); f.enable(); await f.proxy.request('edit', payload({ image: 'data:image/png;base64,' + PNG }));
  assert.equal(f.calls[0][0], 'http://127.0.0.1:7860/v1/images/edits');
  assert.equal(JSON.parse(f.calls[0][1].body).image, PNG);
  for (const extra of [{ url: 'https://attacker.invalid' }, { model: 'evil' }, { headers: { Authorization: 'bad' } }, { steps: 99 }]) {
    assert.throws(() => validateRequest('generate', payload(extra)), { code: 'invalid-request' });
  }
  assert.throws(() => validateRequest('edit', payload({ image: 'https://example.invalid/image.png' })));
  assert.throws(() => validateRequest('edit', payload({ image: 'data:image/svg+xml;base64,' + PNG })));
});
test('invalid dimensions, blank/long prompts, JSON budget and malformed images fail before fetch', () => {
  for (const value of [{ width: 63 }, { width: 1025 }, { width: 1.1 }, { prompt: ' ' }, { prompt: 'x'.repeat(4001) }]) assert.throws(() => validateRequest('generate', payload(value)));
  const huge = Buffer.alloc(6 * 1024 * 1024); Buffer.from(PNG, 'base64').copy(huge);
  assert.throws(() => validateRequest('edit', payload({ image: huge.toString('base64') })), { code: 'too-large' });
  for (const raw of ['a===', PNG + '\n', PNG.slice(1), 'AAAA', 'data:text/html;base64,' + PNG]) assert.throws(() => decodeImage(raw));
  for(const extra of [{sessionId:[sessionId]},{requestId:12345678},{requestId:['request_0001']}]) assert.throws(()=>validateRequest('generate',payload(extra)),{code:'invalid-request'});
  const f=fixture();assert.throws(()=>f.proxy.setAccess({enabled:true,sessionId:[sessionId]}),{code:'invalid-session'});
  assert.throws(()=>f.proxy.cancel({sessionId,requestId:12345678}),{code:'invalid-request'});
});
test('not-ready or non-editable service never receives the request', async () => {
  for (const connection of [{ ready: false }, { ready: true, token }, { ready: true, canEdit: true, token: 'bad' }]) {
    const f = fixture({ connect: async () => connection }); f.enable();
    await assert.rejects(f.proxy.request('edit', payload({ image: PNG })), { code: 'not-ready' }); assert.equal(f.calls.length, 0);
  }
});
test('cancel suppresses output and retains lease until upstream response completes', async () => {
  let release; const f = fixture({ fetch: () => new Promise((resolve) => { release = () => resolve(reply()); }) }); f.enable();
  const request = f.proxy.request('generate', payload()); await new Promise(setImmediate);
  f.proxy.cancel({ sessionId, requestId: payload().requestId }); assert.equal(f.proxy.status().busy, true);
  await assert.rejects(f.proxy.request('generate', payload({ requestId: 'request_0002' })), { code: 'image-busy' });
  release(); await assert.rejects(request, { code: 'cancelled' }); assert.equal(f.proxy.status().busy, false); assert.equal(f.proxy.status().needsStop, false);
});
test('a cancellation arriving before the image POST prevents inference, and completed IDs cannot replay', async () => {
  const f=fixture(); f.enable(); f.proxy.cancel({sessionId,requestId:payload().requestId});
  await assert.rejects(f.proxy.request('generate',payload()),{code:'cancelled'});assert.equal(f.calls.length,0);
  const next=payload({requestId:'request_0002'});await f.proxy.request('generate',next);
  f.enable();await assert.rejects(f.proxy.request('generate',next),{code:'duplicate-request'});assert.equal(f.calls.length,1);
});
test('session revocation suppresses pending result and old-session cancel cannot cancel new work', async () => {
  let release; const f = fixture({ fetch: () => new Promise((resolve) => { release = () => resolve(reply()); }) }); f.enable();
  const request = f.proxy.request('generate', payload()); await new Promise(setImmediate);
  f.proxy.setAccess({ enabled: false }); assert.equal(f.proxy.status().busy, true); release();
  await assert.rejects(request, { code: 'cancelled' });
  f.enable(); const next = f.proxy.request('generate', payload({ requestId: 'request_0002' })); await new Promise(setImmediate);
  f.proxy.cancel({ sessionId: 'c'.repeat(32), requestId: 'request_0002' }); release(); assert.ok((await next).image);
});
test('timeout/network failure requires confirmed Stop; it never silently retries', async () => {
  const f = fixture({ fetch: async () => { throw new Error('PRIVATE_TOKEN ' + token); } }); f.enable();
  await assert.rejects(f.proxy.request('generate', payload()), (error) => error.code === 'service-unavailable' && !error.message.includes(token));
  assert.equal(f.proxy.status().needsStop, true);
  await assert.rejects(f.proxy.request('generate', payload()), { code: 'needs-stop' });
  f.proxy.confirmStopped(); assert.equal(f.proxy.status().needsStop, false);
});
test('deadline aborts an unresponsive upstream and retains uncertainty', async () => {
  const f = fixture({ timeoutMs: 15, fetch: async (_, options) => new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(Error('aborted')))) }); f.enable();
  await assert.rejects(f.proxy.request('generate', payload()), { code: 'service-unavailable' });
  assert.equal(f.proxy.status().needsStop, true);
});
test('confirmed Stop cancels active HTTP and safely clears the uncertain state', async () => {
  const f = fixture({ fetch: async (_, options) => new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(Error('aborted')))) }); f.enable();
  const request = f.proxy.request('generate', payload()); await new Promise(setImmediate); f.proxy.confirmStopped();
  await assert.rejects(request, { code: 'cancelled' }); assert.equal(f.proxy.status().needsStop, false);
});
test('malformed/oversized responses and upstream errors cannot expose raw private data', async () => {
  for (const response of [reply({ data: [{ url: 'https://evil.invalid' }], token }), reply({ data: [{ b64_json: PNG }, { b64_json: PNG }] }), new Response(token, { status: 500 }), new Response(JSON.stringify({ error: token }), { headers: { 'Content-Type': 'text/html' } })]) {
    const f = fixture({ fetch: async () => response }); f.enable();
    await assert.rejects(f.proxy.request('generate', payload()), (error) => !error.message.includes(token));
  }
  const f = fixture({ fetch: async () => new Response('x'.repeat(MAX_JSON_BYTES + 1), { headers: { 'Content-Type': 'application/json' } }) }); f.enable();
  await assert.rejects(f.proxy.request('generate', payload()), { code: 'too-large' });
});
test('fragmented response reads aggregate bytes without retaining a per-chunk buffer array',async()=>{
  const data=new TextEncoder().encode(JSON.stringify({data:[{b64_json:PNG}]})); let offset=0;
  const stream=new ReadableStream({pull(controller){if(offset===data.length)controller.close();else controller.enqueue(data.subarray(offset,++offset));}});
  const f=fixture({fetch:async()=>new Response(stream,{headers:{'Content-Type':'application/json'}})});f.enable();
  assert.deepEqual(await f.proxy.request('generate',payload()),{image:'data:image/png;base64,'+PNG});
});
test('rate limit is bounded across session changes and requests are never retried automatically', async () => {
  const f = fixture({ now: () => 10 }); f.enable();
  for (let n = 0; n < 10; n++) await f.proxy.request('generate', payload({ requestId: 'request_000' + n }));
  f.proxy.setAccess({ enabled: false }); f.enable();
  await assert.rejects(f.proxy.request('generate', payload()), { code: 'rate-limit' }); assert.equal(f.calls.length, 10);
});
