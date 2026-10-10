const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const policy = require(path.join(root, 'desktop/web-app/functions/public_search_policy.js'));
const checks = [];
const silent = { log() {}, warn() {}, error() {} };
const started = Date.now();
const privateMarker = 'SYNTHETIC_PRIVATE_CONTEXT_4812';
const workerUrl = 'https://search.example.test/search';
const result = { link: 'https://science.example.test/source', title: 'Research source', snippet: 'A retrieved source passage.' };
const upstreamCalls = [];
const browserCalls = [];
const originalFetch = global.fetch;
const originalCaches = global.caches;

async function check(name, run) {
  try { await run(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: error.stack || String(error) }); }
}

async function main() {
  const worker = (await import('data:text/javascript;base64,' + Buffer.from(read('catalog/cloudflare-worker/src/index.js')).toString('base64'))).default;
  global.caches = { default: { match: async () => null, put: async () => {} } };
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://google.serper.dev/search');
    upstreamCalls.push({ url, options });
    return new Response(JSON.stringify({ organic: [result] }));
  };
  const storage = new Map();
  const win = { AlloModules: {}, location: { hostname: 'example.test', origin: 'https://example.test' },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    dispatchEvent() {}, addEventListener() {}, removeEventListener() {} };
  const browser = { window: win, navigator: { onLine: true }, console: silent, URL, AbortController, AbortSignal, setTimeout, clearTimeout,
    fetch: async (url, options) => {
      browserCalls.push({ url, options });
      if (String(url).startsWith(workerUrl)) return worker.fetch(new Request(url, options), { SERPER_API_KEY: 'synthetic-worker-key' });
      return global.fetch(url, options);
    } };
  vm.runInNewContext(read('ai_backend_module.js'), browser, { filename: 'ai_backend_module.js' });
  const provider = win.WebSearchProvider;
  Object.defineProperty(provider, '_isCanvas', { configurable: true, get: () => true });
  provider._serperInitialized = true;
  provider._serperProxyUrl = workerUrl;
  provider._serperProxyMode = 'canvas-compat-get';
  provider._serperAvailable = true;

  for (const topic of ['R', '\u03c0', 'AI', 'How clouds form over mountains', 'History of jazz', 'x'.repeat(500)]) {
    await check('explicit browser and Worker topic: ' + topic.slice(0, 45), async () => {
      const before = upstreamCalls.length;
      assert.equal(policy.userTopic(topic), topic);
      assert.equal(policy(topic), '');
      const response = await provider.searchTopic(topic, 3);
      assert.equal(response.results.length, 1);
      assert.equal(response.groundingMetadata.groundingChunks[0].web.uri, result.link);
      assert.equal(upstreamCalls.length, before + 1);
      assert.equal(JSON.parse(upstreamCalls.at(-1).options.body).q, topic);
      assert.equal(new URL(browserCalls.at(-1).url).searchParams.get('intent'), 'user-topic');
      assert.equal(browserCalls.at(-1).options.referrerPolicy, 'no-referrer');
      assert.equal(browserCalls.at(-1).options.credentials, 'omit');
    });
  }

  await check('automatic search and unknown intent never send private context', async () => {
    const topic = 'photosynthesis ' + privateMarker;
    const before = upstreamCalls.length;
    assert.equal((await provider.search(topic, 3, topic)).privacyBlocked, true);
    for (const intent of ['', 'automatic', 'USER-TOPIC']) {
      const response = await worker.fetch(new Request(workerUrl + '?q=' + encodeURIComponent(topic) + '&intent=' + intent), { SERPER_API_KEY: 'synthetic' });
      assert.equal(response.status, 400);
    }
    assert.equal(upstreamCalls.length, before);
    assert.equal(JSON.stringify(win.__alloSearchTrace).includes(privateMarker), false);
  });

  await check('empty, control-character and oversized explicit queries never reach a provider', async () => {
    const before = upstreamCalls.length;
    for (const topic of ['', ' \t ', 'clouds\u0000private', 'x'.repeat(501)]) {
      assert.equal(policy.userTopic(topic), '');
      assert.equal((await provider.searchTopic(topic)).results.length, 0);
      const response = await worker.fetch(new Request(workerUrl + '?intent=user-topic&q=' + encodeURIComponent(topic)), { SERPER_API_KEY: 'synthetic' });
      assert.equal(response.status, 400);
    }
    assert.equal(upstreamCalls.length, before);
  });

  await check('automatic public references retain canonical queries', async () => {
    await provider.search('  PHOTOSYNTHESIS  ', 3);
    assert.equal(JSON.parse(upstreamCalls.at(-1).options.body).q, 'photosynthesis');
  });

  storage.set('alloflow_ai_config', JSON.stringify({ serperApiKey: 'synthetic-personal-key' }));
  for (const backend of ['openai', 'claude', 'localai', 'ollama']) {
    await check(backend + ' explicit research separates topic from private writing prompt', async () => {
      const modelRequests = [];
      const ai = new win.AIProvider({ backend, apiKey: 'synthetic-ai-key', baseUrl: 'https://provider.example.test',
        models: { default: 'fixture', fallback: 'fixture' }, debugLog() {}, warnLog() {},
        fetchWithRetry: async (url, options) => {
          modelRequests.push({ url, options });
          return { json: async () => backend === 'claude' ? { content: [{ text: 'A brief.' }] }
            : backend === 'ollama' ? { message: { content: 'A brief.' }, done_reason: 'stop' }
              : { choices: [{ message: { content: 'A brief.' }, finish_reason: 'stop' }] } };
        } });
      const before = upstreamCalls.length;
      const response = await ai.generateText('Research context ' + privateMarker, { search: true, searchQuery: 'R', searchIntent: 'user-topic' });
      assert.equal(upstreamCalls.length, before + 1);
      assert.equal(JSON.parse(upstreamCalls.at(-1).options.body).q, 'R');
      assert.equal(JSON.stringify(browserCalls).includes(privateMarker), false);
      assert.equal(JSON.stringify(upstreamCalls).includes(privateMarker), false);
      assert.equal(JSON.stringify(modelRequests).includes(privateMarker), true);
      assert.equal(response.groundingMetadata.groundingChunks.length, 1);
      await ai.generateText('Research context ' + privateMarker, { search: true, searchIntent: 'user-topic' });
      assert.equal(upstreamCalls.length, before + 1);
    });
  }

  await check('managed policy still disables explicit search', async () => {
    const before = upstreamCalls.length;
    win.ALLOFLOW_MANAGED_AI_POLICY = { version: 1, allowExternalSearch: false };
    try { assert.equal((await provider.searchTopic('R')).policyBlocked, true); }
    finally { delete win.ALLOFLOW_MANAGED_AI_POLICY; }
    assert.equal(upstreamCalls.length, before);
  });

  await check('Firebase explicit short topics and restrictive default policy', async () => {
    const admin = { apps: [{}], auth: () => ({ verifyIdToken: async () => ({ uid: 'synthetic' }) }), appCheck: () => ({ verifyToken: async () => ({ appId: 'synthetic' }) }),
      firestore: Object.assign(() => ({ collection: () => ({ doc: () => ({}) }), runTransaction: async () => {} }), { Timestamp: { fromMillis: () => 0 } }) };
    const context = { exports: {}, require: name => name === 'firebase-admin' ? admin
      : name === 'firebase-functions/v2/https' ? { onRequest: (_opts, handler) => handler }
        : name === 'firebase-functions/params' ? { defineSecret: () => ({ value: () => 'synthetic' }), defineString: () => ({ value: () => 'https://app.test' }) }
          : name === './public_search_policy' ? policy : name === './web_source_fetch' ? {} : require(name),
      process: { env: {} }, fetch: global.fetch, console: silent, URL, AbortController, setTimeout, clearTimeout };
    vm.runInNewContext(read('desktop/web-app/functions/index.js'), context);
    const before = upstreamCalls.length;
    for (const [query, intent, expected] of [['R', 'user-topic', 200], ['\u03c0', 'user-topic', 200], ['History of jazz', 'user-topic', 200],
      ['R', undefined, 400], [privateMarker, 'automatic', 400], ['x'.repeat(501), 'user-topic', 400]]) {
      let status = 200;
      const response = { set() {}, status: value => { status = value; return response; }, json() {} };
      await context.exports.searchProxy({ method: 'POST', is: () => true, body: { query, intent },
        get: name => ({ Origin: 'https://app.test', Authorization: 'Bearer synthetic', 'X-Firebase-AppCheck': 'synthetic' })[name] }, response);
      assert.equal(status, expected);
    }
    assert.equal(upstreamCalls.length, before + 3);
  });
}

main().catch(error => checks.push({ name: 'harness startup', passed: false, error: error.stack || String(error) })).finally(() => {
  global.fetch = originalFetch;
  if (originalCaches === undefined) delete global.caches; else global.caches = originalCaches;
  const report = { startedAt: new Date(started).toISOString(), elapsedMs: Date.now() - started,
    passed: checks.filter(check => check.passed).length, failed: checks.filter(check => !check.passed).length, checks };
  fs.writeFileSync(path.join(__dirname, 'transport-smoke.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  process.exitCode = report.failed ? 1 : 0;
});
