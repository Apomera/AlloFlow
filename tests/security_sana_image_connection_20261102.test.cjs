'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const source = fs.readFileSync(process.env.ALLO_SANA_PROVIDER_PATH || path.join(__dirname, '..', 'ai_backend_module.js'), 'utf8');
const token = 'synthetic-local-image-token-32-characters';
const endpoint = 'http://localhost:7860';
const connection = () => ({ baseUrl: endpoint, apiKey: token });
const imageResponse = () => ({ ok: true, status: 200, json: async () => ({ data: [{ b64_json: 'UE5H' }] }) });

function harness(fetchImpl = async () => imageResponse(), extra = {}) {
    const calls = [], logs = [], storage = new Map();
    let enabled = true;
    const window = { AlloImageGeneration: { isEnabled: () => enabled, signalFor: signal => signal }, navigator: {} };
    const context = { window, module: { exports: {} }, URL, AbortController, TextEncoder, TextDecoder,
        crypto: webcrypto, setTimeout, clearTimeout, console: { log() {}, warn() {}, error() {} },
        localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
        fetch: async (url, options) => { calls.push({ url, options }); return fetchImpl(url, options); }, ...extra };
    vm.runInNewContext(source, context, { filename: 'actual-ai-provider.js' });
    const Provider = context.module.exports.AIProvider;
    function provider(config = {}) {
        return new Provider({ backend: 'custom', baseUrl: 'https://text.example', apiKey: 'synthetic-text-only-key',
            imageProvider: 'sana', imageConnection: connection(), optimizeImage: async value => value,
            debugLog: (...args) => logs.push(args), warnLog: (...args) => logs.push(args), ...config });
    }
    return { Provider, provider, calls, logs, storage, window, context, disable: () => { enabled = false; } };
}
const rejectCode = code => error => error && error.code === code;
const abort = error => error && error.name === 'AbortError';

test('SANA uses only its explicit endpoint/token and forbids redirects/cookies', async () => {
    const h = harness(); const ai = h.provider();
    assert.equal(await ai.generateImage('synthetic kite', { width: 300 }), 'data:image/png;base64,UE5H');
    assert.equal(h.calls.length, 1); const { url, options } = h.calls[0];
    assert.equal(url, endpoint + '/v1/images/generations');
    assert.equal(options.headers.Authorization, 'Bearer ' + token);
    assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit');
    assert.equal(options.cache, 'no-store'); assert.equal(options.referrerPolicy, 'no-referrer');
    assert.equal(JSON.parse(options.body).size, '288x288');
    assert.equal(JSON.parse(options.body).num_inference_steps, 2);
    assert.equal(ai.baseUrl, 'https://text.example'); assert.equal(ai.apiKey, 'synthetic-text-only-key');
    assert.ok(!JSON.stringify(h.logs).includes(token));
});

test('text requests keep the main provider and its own key', async () => {
    const h = harness(async url => url.endsWith('/v1/chat/completions')
        ? { ok: true, json: async () => ({ choices: [{ message: { content: 'synthetic text result' } }] }) } : imageResponse());
    const ai = h.provider(); await ai.generateImage('kite');
    assert.equal(await ai.generateText('synthetic text'), 'synthetic text result');
    assert.equal(h.calls[1].url, 'https://text.example/v1/chat/completions');
    assert.equal(h.calls[1].options.headers.Authorization, 'Bearer synthetic-text-only-key');
});

test('editing uses the local edit endpoint and one source image', async () => {
    const h = harness(); await h.provider().editImage('change color', 'UE5H', { width: 512 });
    assert.equal(h.calls.length, 1); assert.equal(h.calls[0].url, endpoint + '/v1/images/edits');
    const body = JSON.parse(h.calls[0].options.body);
    assert.equal(body.image, 'UE5H'); assert.equal(body.strength, 0.75); assert.equal(body.size, '512x512');
});

test('session token is not exposed in status, storage or logs and clears explicitly', async () => {
    const h = harness(); h.Provider.configureLocalImageConnection(connection());
    const ai = h.provider({ imageConnection: undefined }); await ai.generateImage('kite');
    const status = h.Provider.localImageConnectionStatus();
    assert.equal(status.configured, true); assert.equal(status.baseUrl, endpoint);
    assert.equal(Object.keys(status).length, 2); assert.equal(h.storage.size, 0);
    h.Provider.clearLocalImageConnection();
    await assert.rejects(ai.generateImage('kite'), rejectCode('allo/local-image-connection'));
    assert.equal(h.calls.length, 1);
});

test('missing local credentials never inherit the text key or attempt anonymous discovery', async () => {
    const h = harness();
    await assert.rejects(h.provider({ imageConnection: undefined }).generateImage('kite'), rejectCode('allo/local-image-connection'));
    assert.equal(h.calls.length, 0);
});

test('invalid URLs are rejected before dispatch', async () => {
    for (const baseUrl of ['http://remote.example', 'http://localhost.evil.test', 'file:///tmp/image', 'javascript:alert(1)',
        'https://user:pass@remote.example', 'https://remote.example/?key=x', 'https://remote.example/#x', '', 'x'.repeat(2049)]) {
        const h = harness();
        await assert.rejects(h.provider({ imageConnection: { baseUrl, apiKey: token } }).generateImage('kite'), rejectCode('allo/local-image-connection'));
        assert.equal(h.calls.length, 0, baseUrl);
    }
});

test('explicit HTTPS proxy path is preserved and only trailing slashes are normalized', async () => {
    const h = harness(); await h.provider({ imageConnection: { baseUrl: 'https://images.example/api/flux/', apiKey: token } }).generateImage('kite');
    assert.equal(h.calls[0].url, 'https://images.example/api/flux/v1/images/generations');
});

test('invalid header tokens are rejected without contacting the server', async () => {
    for (const apiKey of ['', 'short', 'x'.repeat(31), 'x'.repeat(1025), 'x'.repeat(32) + '\r\nInjected: yes', 'with spaces '.repeat(4), 'é'.repeat(32)]) {
        const h = harness();
        await assert.rejects(h.provider({ imageConnection: { baseUrl: endpoint, apiKey } }).generateImage('kite'), rejectCode('allo/local-image-connection'));
        assert.equal(h.calls.length, 0);
    }
});

test('connection is captured before awaiting authorization; next request sees new settings', async () => {
    const h = harness(); h.Provider.configureLocalImageConnection(connection());
    const ai = h.provider({ imageConnection: undefined });
    const pending = ai.generateImage('first kite');
    h.Provider.configureLocalImageConnection({ baseUrl: 'https://next-images.example', apiKey: 'different-synthetic-token-at-least-32-chars' });
    await pending; await ai.generateImage('next kite');
    assert.equal(h.calls[0].url, endpoint + '/v1/images/generations');
    assert.equal(h.calls[0].options.headers.Authorization, 'Bearer ' + token);
    assert.equal(h.calls[1].url, 'https://next-images.example/v1/images/generations');
});

test('mutating an explicit caller configuration cannot retarget its token', async () => {
    const h = harness(), config = connection(), ai = h.provider({ imageConnection: config });
    config.baseUrl = 'https://unexpected.example'; config.apiKey = 'changed';
    await ai.generateImage('kite'); assert.equal(h.calls[0].url, endpoint + '/v1/images/generations');
    assert.equal(h.calls[0].options.headers.Authorization, 'Bearer ' + token);
});

test('image-off selection blocks generation and edits', async () => {
    const h = harness(), ai = h.provider({ imageProvider: 'off' });
    await assert.rejects(ai.generateImage('kite'), /disabled/);
    await assert.rejects(ai.editImage('kite', 'UE5H'), /disabled/);
    assert.equal(h.calls.length, 0);
});

test('global image-disable control prevents all network work', async () => {
    const h = harness(), ai = h.provider(); h.disable();
    assert.equal(await ai.generateImage('kite'), null); assert.equal(await ai.editImage('kite', 'UE5H'), null);
    assert.equal(h.calls.length, 0);
});

test('student context cannot acquire a teacher session image connection', async () => {
    for (const key of ['__alloQrStudentMode', '__alloStudentAiDisabled']) {
        const h = harness(); h.window[key] = key === '__alloQrStudentMode' ? { type: 'assignment' } : true;
        await assert.rejects(h.provider().generateImage('kite'), rejectCode('managed-ai-blocked'));
        assert.equal(h.calls.length, 0);
    }
});

test('managed deployments still deny unapproved media, including SANA', async () => {
    const h = harness(); h.window.ALLOFLOW_MANAGED_AI_POLICY = { version: 1, connections: [] };
    await assert.rejects(h.provider().generateImage('kite'), rejectCode('managed-ai-blocked'));
    assert.equal(h.calls.length, 0);
});

test('policy revocation after dispatch prevents image delivery', async () => {
    let h; h = harness(async () => { h.window.ALLOFLOW_MANAGED_AI_POLICY = { version: 1, connections: [] }; return imageResponse(); });
    await assert.rejects(h.provider().generateImage('kite'), rejectCode('managed-ai-blocked'));
});

test('entering student mode while generation is running prevents delivery', async () => {
    let h; h = harness(async () => { h.window.__alloQrStudentMode = { type: 'assignment' }; return imageResponse(); });
    await assert.rejects(h.provider().generateImage('kite'), rejectCode('managed-ai-blocked'));
});

test('aborted requests never dispatch', async () => {
    const h = harness(), controller = new AbortController(); controller.abort();
    await assert.rejects(h.provider().generateImage('kite', { signal: controller.signal }), abort);
    assert.equal(h.calls.length, 0);
});

test('cancellation aborts the native request and never retries elsewhere', async () => {
    let entered; const ready = new Promise(resolve => { entered = resolve; });
    const h = harness(async (_url, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => { const e = new Error('cancelled'); e.name = 'AbortError'; reject(e); }); entered();
    }));
    const controller = new AbortController(), pending = h.provider().generateImage('kite', { signal: controller.signal });
    await ready; controller.abort(); await assert.rejects(pending, abort); assert.equal(h.calls.length, 1);
});

test('image disable during response processing prevents output and fallback', async () => {
    let h; h = harness(async () => { h.disable(); return imageResponse(); });
    await assert.rejects(h.provider().generateImage('kite'), abort); assert.equal(h.calls.length, 1);
});

test('each server error is explained without exposing response content or keys', async () => {
    for (const status of [401, 403, 413, 422, 429, 500, 503]) {
        const h = harness(async () => ({ ok: false, status, json: async () => { throw new Error('secret response ' + token); } }));
        await assert.rejects(h.provider().generateImage('private synthetic prompt'), error => error.code === 'allo/local-image-connection' && !error.message.includes(token) && !error.message.includes('private synthetic prompt'));
        assert.equal(h.calls.length, 1);
    }
});

test('transport failure never falls back to another image provider', async () => {
    const h = harness(async () => { throw new Error('provider leaked ' + token); }), ai = h.provider();
    ai._trySdTurboImage = async () => { assert.fail('unexpected local fallback'); };
    ai._generateImageByBackend = async () => { assert.fail('unexpected cloud fallback'); };
    await assert.rejects(ai.generateImage('kite'), error => error.code === 'allo/local-image-connection' && !error.message.includes(token));
    assert.equal(h.calls.length, 1);
});

test('invalid prompt, dimensions, missing edit image and extra references fail before dispatch', async () => {
    const h = harness(), ai = h.provider();
    for (const width of [0, 63, 1025, 300.5, '512', NaN]) await assert.rejects(ai.generateImage('kite', { width }), rejectCode('allo/local-image-connection'));
    for (const prompt of ['', ' '.repeat(4), 'x'.repeat(4001)]) await assert.rejects(ai.generateImage(prompt), rejectCode('allo/local-image-connection'));
    await assert.rejects(ai.editImage('kite', null), rejectCode('allo/local-image-connection'));
    await assert.rejects(ai.editImage('kite', 'UE5H', { referenceBase64: 'UE5H' }), rejectCode('allo/local-image-connection'));
    assert.equal(h.calls.length, 0);
});

test('invalid response image is not delivered', async () => {
    for (const encoded of [null, '', '<script>', 'A'.repeat(8 * 1024 * 1024 + 1)]) {
        const h = harness(async () => ({ ok: true, json: async () => ({ data: [{ b64_json: encoded }] }) }));
        await assert.rejects(h.provider().generateImage('kite'), rejectCode('allo/local-image-connection'));
    }
});

test('timeout cancels native fetch and reports that server work may continue', async () => {
    let timeout, entered; const ready = new Promise(resolve => { entered = resolve; });
    const h = harness(async (_url, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => { const e = new Error('timeout'); e.name = 'AbortError'; reject(e); }); entered();
    }), { setTimeout: callback => { timeout = callback; return 1; }, clearTimeout: () => {} });
    const pending = h.provider().generateImage('kite'); await ready; timeout();
    await assert.rejects(pending, /server may still be finishing/); assert.equal(h.calls.length, 1);
});
