'use strict';

const assert = require('node:assert/strict');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const driver = require(path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'desktop',
  'mcp',
  'remediation_headless_driver.cjs',
));

test('parses and bounds Retry-After plus google.rpc.RetryInfo', () => {
  const headers = new Headers({ 'Retry-After': '2' });
  const body = JSON.stringify({
    error: {
      details: [{
        '@type': 'type.googleapis.com/google.rpc.RetryInfo',
        retryDelay: '3.250000001s',
      }],
    },
  });
  assert.equal(driver.providerRetryAfterMs(headers, body, 0), 3251);

  const date = new Headers({ 'Retry-After': new Date(12_000).toUTCString() });
  assert.equal(driver.providerRetryAfterMs(date, '', 2_000), 10_000);

  const excessive = new Headers({ 'Retry-After': '999999' });
  assert.equal(driver.providerRetryAfterMs(excessive, '', 0), 10 * 60 * 1000);
});

test('classifies burst throttles separately from daily quota', () => {
  const burst = driver.classifyHttpFailure(
    429,
    JSON.stringify({
      error: {
        status: 'RESOURCE_EXHAUSTED',
        details: [{
          '@type': 'type.googleapis.com/google.rpc.RetryInfo',
          retryDelay: { seconds: '4', nanos: 500_000_000 },
        }],
      },
    }),
    new Headers(),
  );
  assert.equal(burst.code, 'model_throttled');
  assert.equal(burst.retryAfterMs, 4500);
  assert.equal(burst.classification.perDay, false);

  const daily = driver.classifyHttpFailure(
    429,
    'RESOURCE_EXHAUSTED: per day quota reached',
    new Headers({ 'Retry-After': '60' }),
  );
  assert.equal(daily.code, 'model_quota_exhausted');
  assert.equal(daily.classification.perDay, true);
});

test('run abort reaches the underlying Node fetch', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let observedSignal = null;
  let startedResolve;
  const started = new Promise((resolve) => { startedResolve = resolve; });
  globalThis.fetch = async (_url, init) => {
    observedSignal = init.signal;
    startedResolve();
    return new Promise((_resolve, reject) => {
      init.signal.addEventListener(
        'abort',
        () => reject(new DOMException('aborted', 'AbortError')),
        { once: true },
      );
    });
  };

  const controller = new AbortController();
  const pending = driver.geminiGenerate({
    apiKey: 'routing-placeholder',
    model: 'test-model',
    parts: [{ text: 'bounded test' }],
    signal: controller.signal,
  });
  await started;
  controller.abort();
  const result = await pending;

  assert.equal(observedSignal, controller.signal);
  assert.equal(result.ok, false);
  assert.equal(result.error.isAbort, true);
  assert.equal(result.error.code, 'request_aborted');
});

test('text and vision transports share a throttle retry budget', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(
      JSON.stringify({ error: { status: 'RESOURCE_EXHAUSTED' } }),
      { status: 429, headers: { 'Retry-After': '0' } },
    );
  };
  const transportState = {
    retryBudgetRemaining: 1,
    throttled: false,
    retryAfterMs: null,
    notBeforeAt: 0,
  };
  const options = {
    apiKey: 'routing-placeholder',
    model: 'test-model',
    parts: [{ text: 'bounded test' }],
    signal: new AbortController().signal,
    transportState,
  };

  const initial = await driver.geminiGenerate(options);
  const retry = await driver.geminiGenerate(options);
  const exhausted = await driver.geminiGenerate(options);

  assert.equal(initial.error.code, 'model_throttled');
  assert.equal(retry.error.retryBudgetExhausted, true);
  assert.equal(exhausted.error.retryBudgetExhausted, true);
  assert.equal(calls, 2, 'exhausted work must not issue another provider request');
});

test('concurrent transports serialize throttle state and reject stale success clearing', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let calls = 0;
  let resolveFirst;
  let firstStartedResolve;
  const firstStarted = new Promise((resolve) => { firstStartedResolve = resolve; });
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) {
      firstStartedResolve();
      return new Promise((resolve) => { resolveFirst = resolve; });
    }
    return new Response(
      JSON.stringify({ error: { status: 'RESOURCE_EXHAUSTED' } }),
      { status: 429, headers: { 'Retry-After': '0' } },
    );
  };
  const transportState = {
    retryBudgetRemaining: 2,
    throttled: false,
    retryAfterMs: null,
    notBeforeAt: 0,
  };
  const options = {
    apiKey: 'routing-placeholder',
    model: 'test-model',
    parts: [{ text: 'bounded concurrent test' }],
    signal: new AbortController().signal,
    transportState,
  };

  const older = driver.geminiGenerate(options);
  await firstStarted;
  const newer = driver.geminiGenerate(options);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 1, 'only the gate owner may reach fetch before its response');

  resolveFirst(new Response(JSON.stringify({ candidates: [] }), { status: 200 }));
  const [olderResult, newerResult] = await Promise.all([older, newer]);
  assert.equal(olderResult.ok, true);
  assert.equal(newerResult.error.code, 'model_throttled');
  assert.equal(calls, 2);
  assert.equal(transportState.throttled, true);
  assert.equal(transportState.retryAfterMs, 0);
});

async function temporaryPdf(t, name) {
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), 'alloflow-setup-stall-'));
  const filePath = path.join(directory, name);
  await fsp.writeFile(filePath, '%PDF-1.7\nsetup stall fixture\n%%EOF\n');
  t.after(() => fsp.rm(directory, { recursive: true, force: true }));
  return filePath;
}

function setupStallingBrowser(onSetupStarted) {
  let closeCalls = 0;
  const context = {
    newPage() {
      onSetupStarted();
      return new Promise(() => {});
    },
    async close() {
      closeCalls += 1;
    },
  };
  return {
    browser: {
      async newContext() { return context; },
      on() {},
      async close() {},
    },
    closeCalls: () => closeCalls,
  };
}

test('absolute deadline covers a stalled pre-render page setup', async (t) => {
  const filePath = await temporaryPdf(t, 'deadline.pdf');
  let setupStartedResolve;
  const setupStarted = new Promise((resolve) => { setupStartedResolve = resolve; });
  const fake = setupStallingBrowser(setupStartedResolve);
  const instance = driver.createDriver({
    browserFactory: async () => fake.browser,
    log() {},
  });
  t.after(() => instance.close());

  const pending = instance.remediate({
    filePath,
    visionMode: 'images',
    deadlineAt: Date.now() + 75,
    maxRunMinutes: 1,
  });
  await setupStarted;
  await assert.rejects(pending, /remediation_deadline_reached/);
  assert.equal(fake.closeCalls() >= 1, true);
  assert.equal(await instance.cancelActiveRun(), false);
});

test('explicit cancellation closes and drains a stalled pipeline page setup', async (t) => {
  const filePath = await temporaryPdf(t, 'cancel.pdf');
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-routing-placeholder';
  t.after(() => {
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  });
  let setupStartedResolve;
  const setupStarted = new Promise((resolve) => { setupStartedResolve = resolve; });
  const fake = setupStallingBrowser(setupStartedResolve);
  const instance = driver.createDriver({
    browserFactory: async () => fake.browser,
    log() {},
  });
  t.after(() => instance.close());

  const pending = instance.remediate({
    filePath,
    deadlineAt: Date.now() + 10_000,
    maxRunMinutes: 1,
  });
  await setupStarted;
  assert.equal(await instance.cancelActiveRun(), true);
  await assert.rejects(pending, /Run cancelled/);
  assert.equal(fake.closeCalls() >= 1, true);
  assert.equal(await instance.cancelActiveRun(), false);
});
