'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const zlib = require('node:zlib');

const {
  attemptTiming,
  checkpointOptionsDigest,
  createRunnerServer,
} = require('../server.cjs');

const TOKEN = 'institution-runner-test-token-0000000000000000';
const INPUT_PDF = Buffer.from('%PDF-1.7\npilot input\n%%EOF\n');
const OUTPUT_PDF = Buffer.from('%PDF-1.7\nremediated output\n%%EOF\n');

function verifiedQuality(overrides = {}) {
  return {
    activeContentScanVerified: true,
    activeContentDetected: false,
    verdict: { level: 'ready' },
    verificationState: 'complete',
    verificationHtmlBound: true,
    taggedPdfDelivery: { ok: true, code: 'verified' },
    taggedPdfExportMode: 'original_layout',
    remainingAxeViolations: 0,
    remainingEqualAccessFailures: 0,
    auditCoverage: {
      configuredAuditorCap: 5,
      requestedAuditors: 3,
      completedAuditors: 3,
      sliced: false,
    },
    ...overrides,
  };
}

function runRequest(jobId = 'job-test-1') {
  return {
    schema: 1,
    jobId,
    input: {
      url: 'http://r2.internal/input',
      contentType: 'application/pdf',
    },
    output: {
      taggedPdfUrl: 'http://r2.internal/output/tagged.pdf',
      reportUrl: 'http://r2.internal/output/report.json',
    },
    options: {
      targetScore: 95,
      fixPasses: 2,
      effortProfile: 'standard',
      ocrLanguage: '',
      polishPasses: 0,
      taggedPdf: true,
      autoContinue: false,
      autoContinueRounds: 0,
      validateUa: false,
      maxRunMinutes: 20,
    },
  };
}

test('attempt timing reserves finalization inside one absolute wall', () => {
  const long = attemptTiming(20, 1_000);
  assert.deepEqual(long, {
    startedAt: 1_000,
    deadlineAt: 1_201_000,
    remediationDeadlineAt: 1_081_000,
    finalizationReserveMs: 120_000,
  });
  const short = attemptTiming(1, 2_000);
  assert.equal(short.deadlineAt, 62_000);
  assert.equal(short.finalizationReserveMs, 15_000);
  assert.equal(short.remediationDeadlineAt, 47_000);
});

async function readBody(body) {
  if (Buffer.isBuffer(body)) return Buffer.from(body);
  const chunks = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function startTestRunner(t, overrides = {}) {
  const stateDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'alloflow-runner-test-'));
  const uploaded = new Map();
  const storageCalls = [];
  let driverCalls = 0;
  let lastDriverOptions = null;

  const storageFetch = overrides.fetch || (async (url, init = {}) => {
    const method = init.method || 'GET';
    storageCalls.push({ url: String(url), method });
    if (method === 'GET' && String(url) === 'http://r2.internal/input') {
      return new Response(INPUT_PDF, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': String(INPUT_PDF.length),
        },
      });
    }
    if (method === 'PUT') {
      uploaded.set(String(url), {
        body: await readBody(init.body),
        contentType: init.headers['Content-Type'],
        sha256: init.headers['X-AlloFlow-SHA256'],
      });
      return new Response(null, { status: 204 });
    }
    return new Response(null, { status: 404 });
  });

  const createDriver = overrides.createDriver || (() => ({
    async remediate(options) {
      driverCalls += 1;
      lastDriverOptions = options;
      const input = await fsp.readFile(options.filePath);
      assert.deepEqual(input, INPUT_PDF);
      return {
        ...verifiedQuality(),
        beforeScore: 42,
        afterScore: 96,
        verificationState: 'complete',
        scoreSource: 'dual-engine',
        aiVerificationIncomplete: false,
        integrityCoverage: 100,
        taggedPdfB64: OUTPUT_PDF.toString('base64'),
        taggedPdfError: null,
      };
    },
    async cancelActiveRun() {
      return false;
    },
    async close() {},
    ...(typeof overrides.validatePdfUaCli === 'function'
      ? { validatePdfUaCli: overrides.validatePdfUaCli }
      : {}),
  }));

  const app = createRunnerServer({
    token: TOKEN,
    stateDir,
    fetch: storageFetch,
    createDriver,
    maxInputBytes: overrides.maxInputBytes,
    engineSha256: overrides.engineSha256,
  });
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  const address = app.server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  t.after(async () => {
    await app.shutdown();
    await fsp.rm(stateDir, { recursive: true, force: true });
  });

  return {
    app,
    baseUrl,
    uploaded,
    storageCalls,
    driverCalls: () => driverCalls,
    lastDriverOptions: () => lastDriverOptions,
  };
}

async function call(baseUrl, pathname, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.auth !== false) headers.Authorization = `Bearer ${TOKEN}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const json = await response.json();
  return { response, json };
}

test('health is public while job APIs require the runner token', async (t) => {
  const runner = await startTestRunner(t);

  const health = await call(runner.baseUrl, '/healthz', { auth: false });
  assert.equal(health.response.status, 200);
  assert.equal(health.json.ok, true);
  assert.deepEqual(health.json.protocol, {
    runSchema: 1,
    checkpointSchema: 1,
    checkpointEngineAbi: 1,
  });
  assert.deepEqual(Object.keys(health.json.build).sort(), [
    'checkpointEngineSha256',
    'manifestSha256',
    'modelConfigSha256',
    'runnerBuildSha256',
  ]);
  for (const digest of Object.values(health.json.build)) {
    assert.match(digest, /^[a-f0-9]{64}$/);
  }
  assert.equal(JSON.stringify(health.json).includes('gemini.internal'), false);
  assert.equal(JSON.stringify(health.json).includes('GEMINI'), false);

  const denied = await call(runner.baseUrl, '/v1/status?job_id=missing', { auth: false });
  assert.equal(denied.response.status, 401);
  assert.equal(denied.json.error.code, 'unauthorized');
  assert.match(denied.response.headers.get('www-authenticate'), /^Bearer /);
});

test('runs a PDF once, uploads raw artifacts, and returns cached small metadata', async (t) => {
  const runner = await startTestRunner(t);
  const request = runRequest();

  const first = await call(runner.baseUrl, '/v1/run', {
    method: 'POST',
    body: request,
  });
  assert.equal(first.response.status, 200);
  assert.equal(first.json.status, 'succeeded');
  assert.equal(first.json.jobId, request.jobId);
  assert.equal(first.json.artifacts.length, 2);
  assert.equal('taggedPdfB64' in first.json, false);
  assert.equal(JSON.stringify(first.json).includes(OUTPUT_PDF.toString('base64')), false);

  assert.equal(runner.driverCalls(), 1);
  assert.deepEqual(runner.uploaded.get(request.output.taggedPdfUrl).body, OUTPUT_PDF);
  const reportUpload = runner.uploaded.get(request.output.reportUrl);
  assert.equal(reportUpload.contentType, 'application/json');
  const report = JSON.parse(reportUpload.body.toString('utf8'));
  assert.equal(report.pdfUaValidation.status, 'not_run');
  assert.equal(report.pdfUaValidation.reason, 'independent_validator_not_packaged');
  assert.equal(report.summary.autoContinueRoundsRun, 0);
  assert.equal(report.summary.distributionLevel, 'ready');
  assert.equal(report.summary.verificationState, 'complete');
  assert.equal(report.summary.verificationHtmlBound, true);
  assert.equal(report.summary.taggedPdfDelivery, 'verified');
  assert.equal(report.summary.taggedPdfExportMode, 'original_layout');
  assert.equal(report.summary.activeContentScanVerified, true);
  assert.equal(report.summary.activeContentDetected, false);
  assert.equal(report.summary.remainingAxeViolations, 0);
  assert.deepEqual(report.summary.auditCoverage, {
    configuredAuditorCap: 5,
    requestedAuditors: 3,
    completedAuditors: 3,
    sliced: false,
  });

  const options = runner.lastDriverOptions();
  assert.equal(options.taggedPdf, true);
  assert.equal(options.autoContinue, false);
  assert.equal(options.autoContinueRounds, 0);
  assert.equal(options.ocrLanguage, '');
  assert.equal(options.validateUa, false);
  assert.equal(options.maxRunMinutes, 20);
  assert.equal(options.modelRetryBudget, 6);
  assert.equal(options.signal instanceof AbortSignal, true);
  assert.equal(Number.isFinite(options.deadlineAt), true);
  assert.equal(options.deadlineAt < Date.now() + 20 * 60 * 1000, true);

  const second = await call(runner.baseUrl, '/v1/run', {
    method: 'POST',
    body: request,
  });
  assert.equal(second.response.status, 200);
  assert.deepEqual(second.json, first.json);
  assert.equal(runner.driverCalls(), 1);
  assert.equal(runner.storageCalls.filter((entry) => entry.method === 'GET').length, 1);
  assert.equal(runner.storageCalls.filter((entry) => entry.method === 'PUT').length, 2);

  const status = await call(runner.baseUrl, `/v1/status?job_id=${request.jobId}`);
  assert.equal(status.response.status, 200);
  assert.deepEqual(status.json, first.json);
});

test('loads a compatible checkpoint and uploads the next validated snapshot', async (t) => {
  const request = runRequest('job-checkpoint-resume');
  request.checkpoint = {
    readUrl: 'http://r2.internal/checkpoint',
    writeUrl: 'http://r2.internal/checkpoint',
  };
  const engineSha256 = 'a'.repeat(64);
  const inputSha256 = crypto.createHash('sha256').update(INPUT_PDF).digest('hex');
  const optionsSha256 = checkpointOptionsDigest(request.options);
  const resumeSnapshot = {
    schema: 1,
    stage: 'primary',
    audit: {
      score: 42,
      documentLanguage: 'en',
      requestedAuditors: 3,
      auditorCount: 3,
      sliced: false,
    },
    remediation: {
      accessibleHtml: '<main><h1>Saved</h1></main>',
    },
    nextRound: 0,
    roundsRun: 0,
    roundLog: [],
    loopState: {
      lastViolations: null,
      lastDet: -1,
      lastIssues: null,
      stagnant: 0,
    },
    autoContinueDone: true,
  };
  const storedEnvelope = {
    schema: 1,
    sequence: 7,
    stage: 'primary',
    inputSha256,
    optionsSha256,
    engineSha256,
    snapshot: resumeSnapshot,
  };
  const storedCompressed = zlib.gzipSync(
    Buffer.from(JSON.stringify(storedEnvelope), 'utf8'),
  );
  const storedCompressedSha256 = crypto.createHash('sha256')
    .update(storedCompressed).digest('hex');
  let checkpointUpload = null;
  let observedResume = null;

  const storageFetch = async (url, init = {}) => {
    const method = init.method || 'GET';
    if (method === 'GET' && String(url) === request.input.url) {
      return new Response(INPUT_PDF, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': String(INPUT_PDF.length),
        },
      });
    }
    if (method === 'GET' && String(url) === request.checkpoint.readUrl) {
      return new Response(storedCompressed, {
        status: 200,
        headers: {
          'Content-Type': 'application/gzip',
          'Content-Length': String(storedCompressed.length),
          'X-AlloFlow-SHA256': storedCompressedSha256,
          'X-AlloFlow-Checkpoint-Schema': '1',
          'X-AlloFlow-Checkpoint-Sequence': '7',
          'X-AlloFlow-Checkpoint-Stage': 'primary',
          'X-AlloFlow-Input-SHA256': inputSha256,
          'X-AlloFlow-Options-SHA256': optionsSha256,
          'X-AlloFlow-Engine-SHA256': engineSha256,
        },
      });
    }
    if (method === 'PUT' && String(url) === request.checkpoint.writeUrl) {
      checkpointUpload = {
        body: await readBody(init.body),
        headers: new Headers(init.headers),
      };
      return new Response(null, { status: 201 });
    }
    if (method === 'PUT') return new Response(null, { status: 204 });
    return new Response(null, { status: 404 });
  };

  const runner = await startTestRunner(t, {
    fetch: storageFetch,
    engineSha256,
    createDriver: () => ({
      async remediate(options) {
        observedResume = options.resumeCheckpoint;
        await options.onCheckpoint({
          ...resumeSnapshot,
          remediation: {
            accessibleHtml: '<main><h1>Newer</h1></main>',
          },
        });
        return {
          ...verifiedQuality(),
          beforeScore: 42,
          afterScore: 96,
          aiVerificationIncomplete: false,
          integrityCoverage: 100,
          taggedPdfB64: OUTPUT_PDF.toString('base64'),
        };
      },
      async cancelActiveRun() { return false; },
      async close() {},
    }),
  });
  const result = await call(runner.baseUrl, '/v1/run', {
    method: 'POST',
    body: request,
  });

  assert.equal(result.response.status, 200, JSON.stringify(result.json));
  assert.deepEqual(observedResume, resumeSnapshot);
  assert.ok(checkpointUpload);
  assert.equal(
    checkpointUpload.headers.get('content-type'),
    'application/gzip',
  );
  assert.equal(
    checkpointUpload.headers.get('x-alloflow-checkpoint-sequence'),
    '8',
  );
  assert.equal(
    checkpointUpload.headers.get('x-alloflow-input-sha256'),
    inputSha256,
  );
  const uploadedSha256 = crypto.createHash('sha256')
    .update(checkpointUpload.body).digest('hex');
  assert.equal(
    checkpointUpload.headers.get('x-alloflow-sha256'),
    uploadedSha256,
  );
  const uploadedEnvelope = JSON.parse(
    zlib.gunzipSync(checkpointUpload.body).toString('utf8'),
  );
  assert.equal(uploadedEnvelope.sequence, 8);
  assert.equal(uploadedEnvelope.engineSha256, engineSha256);
  assert.equal(
    uploadedEnvelope.snapshot.remediation.accessibleHtml,
    '<main><h1>Newer</h1></main>',
  );
  assert.deepEqual(result.json.checkpointTelemetry.resumed, {
    stage: 'primary',
    sequence: 7,
    compressedBytes: storedCompressed.length,
    uncompressedBytes: Buffer.byteLength(JSON.stringify(storedEnvelope)),
  });
  assert.deepEqual(result.json.checkpointTelemetry.saved, [{
    stage: 'primary',
    sequence: 8,
    compressedBytes: checkpointUpload.body.length,
    uncompressedBytes: Buffer.byteLength(JSON.stringify(uploadedEnvelope)),
  }]);
});
test('publishes bounded veraPDF evidence when the driver exposes the CLI', async (t) => {
  const validatorCalls = [];
  const runner = await startTestRunner(t, {
    validatePdfUaCli: async ({ filePath, timeoutMs, maxBytes }) => {
      validatorCalls.push({ filePath, timeoutMs, maxBytes });
      assert.deepEqual(await fsp.readFile(filePath), OUTPUT_PDF);
      return {
        status: 'noncompliant',
        validator: 'veraPDF',
        profile: 'ua1',
        validatorVersion: '1.30.2',
        failedRules: 2,
        failedChecks: 3,
        passedRules: 104,
        passedChecks: 4459,
      };
    },
  });
  const request = runRequest('job-verapdf-evidence');
  const result = await call(runner.baseUrl, '/v1/run', {
    method: 'POST',
    body: request,
  });

  assert.equal(result.response.status, 200);
  assert.equal(validatorCalls.length, 1);
  assert.equal(validatorCalls[0].timeoutMs, 120000);
  assert.equal(validatorCalls[0].maxBytes > OUTPUT_PDF.length, true);
  const report = JSON.parse(
    runner.uploaded.get(request.output.reportUrl).body.toString('utf8'),
  );
  assert.deepEqual(report.pdfUaValidation, {
    status: 'noncompliant',
    validator: 'veraPDF',
    profile: 'ua1',
    validatorVersion: '1.30.2',
    failedRules: 2,
    failedChecks: 3,
    passedRules: 104,
    passedChecks: 4459,
  });
});
test('same job id with different immutable request is rejected', async (t) => {
  const runner = await startTestRunner(t);
  const request = runRequest();
  const first = await call(runner.baseUrl, '/v1/run', { method: 'POST', body: request });
  assert.equal(first.response.status, 200);

  const changed = runRequest();
  changed.options.targetScore = 98;
  const conflict = await call(runner.baseUrl, '/v1/run', {
    method: 'POST',
    body: changed,
  });
  assert.equal(conflict.response.status, 409);
  assert.equal(conflict.json.error.code, 'idempotency_conflict');
  assert.equal(runner.driverCalls(), 1);
});

test('storage URLs are allowlisted and request options are closed', async (t) => {
  const runner = await startTestRunner(t);
  const request = runRequest();
  request.input.url = 'https://example.com/private.pdf';
  const rejected = await call(runner.baseUrl, '/v1/run', {
    method: 'POST',
    body: request,
  });
  assert.equal(rejected.response.status, 400);
  assert.equal(rejected.json.error.code, 'invalid_storage_url');
  assert.equal(runner.driverCalls(), 0);

  const extraOption = runRequest('job-extra-option');
  extraOption.options.unreviewedMode = true;
  const closed = await call(runner.baseUrl, '/v1/run', {
    method: 'POST',
    body: extraOption,
  });
  assert.equal(closed.response.status, 400);
  assert.equal(closed.json.error.code, 'invalid_options');

  const excessiveBudget = runRequest('job-excessive-retry-budget');
  excessiveBudget.options.modelRetryBudget = 21;
  const budgetRejected = await call(runner.baseUrl, '/v1/run', {
    method: 'POST',
    body: excessiveBudget,
  });
  assert.equal(budgetRejected.response.status, 400);
  assert.equal(budgetRejected.json.error.code, 'unsupported_options');
});

test('forwards the bounded thorough effort profile and OCR language', async (t) => {
  let observedOptions;
  const runner = await startTestRunner(t, {
    createDriver: () => ({
      async remediate(options) {
        observedOptions = options;
        return {
          ...verifiedQuality(),
          beforeScore: 42,
          afterScore: 98,
          aiVerificationIncomplete: false,
          integrityCoverage: 100,
          autoContinue: { roundsRun: 1, log: ['private free-form detail'] },
          taggedPdfB64: OUTPUT_PDF.toString('base64'),
        };
      },
      async cancelActiveRun() { return false; },
      async close() {},
    }),
  });
  const request = runRequest('job-thorough-ocr');
  request.options.fixPasses = 3;
  request.options.effortProfile = 'thorough';
  request.options.ocrLanguage = 'es';
  request.options.polishPasses = 1;
  request.options.autoContinue = true;
  request.options.autoContinueRounds = 2;
  request.options.modelRetryBudget = 2;

  const result = await call(runner.baseUrl, '/v1/run', {
    method: 'POST',
    body: request,
  });

  assert.equal(result.response.status, 200);
  const report = JSON.parse(
    runner.uploaded.get(request.output.reportUrl).body.toString('utf8'),
  );
  assert.equal(report.options.effortProfile, 'thorough');
  assert.equal(report.options.ocrLanguage, 'es');
  assert.equal(report.summary.autoContinueRoundsRun, 1);
  assert.equal(report.summary.taggedPdfExportMode, 'original_layout');
  assert.equal(JSON.stringify(report).includes('private free-form detail'), false);
  assert.equal(observedOptions.fixPasses, 3);
  assert.equal(observedOptions.polishPasses, 1);
  assert.equal(observedOptions.autoContinue, true);
  assert.equal(observedOptions.autoContinueRounds, 2);
  assert.equal(observedOptions.ocrLanguage, 'es');
  assert.equal(observedOptions.validateUa, false);
  assert.equal(observedOptions.maxRunMinutes, 20);
  assert.equal(observedOptions.modelRetryBudget, 2);
});

test('rejects inconsistent effort settings and unsupported OCR language tags', async (t) => {
  const runner = await startTestRunner(t);
  const inconsistent = runRequest('job-inconsistent-effort');
  inconsistent.options.effortProfile = 'thorough';
  const first = await call(runner.baseUrl, '/v1/run', {
    method: 'POST',
    body: inconsistent,
  });
  assert.equal(first.response.status, 400);
  assert.equal(first.json.error.code, 'unsupported_options');

  const invalidLanguages = ['eng', 'eng+spa', 'zz', '../../en', 'please use english'];
  for (const [index, ocrLanguage] of invalidLanguages.entries()) {
    const malformedOcr = runRequest(`job-malformed-ocr-${index}`);
    malformedOcr.options.ocrLanguage = ocrLanguage;
    const rejected = await call(runner.baseUrl, '/v1/run', {
      method: 'POST',
      body: malformedOcr,
    });
    assert.equal(rejected.response.status, 400);
    assert.equal(rejected.json.error.code, 'unsupported_options');
  }
  assert.equal(runner.driverCalls(), 0);
});

test('an active remediation can be cancelled and becomes terminal', async (t) => {
  let startedResolve;
  const started = new Promise((resolve) => { startedResolve = resolve; });
  let rejectRun;
  const createDriver = () => ({
    remediate() {
      startedResolve();
      return new Promise((resolve, reject) => {
        rejectRun = reject;
      });
    },
    async cancelActiveRun() {
      rejectRun(new Error('cancelled by test'));
      return true;
    },
    async close() {},
  });
  const runner = await startTestRunner(t, { createDriver });
  const request = runRequest('job-cancel-1');

  const runPromise = call(runner.baseUrl, '/v1/run', {
    method: 'POST',
    body: request,
  });
  await started;
  const cancelled = await call(runner.baseUrl, '/v1/cancel', {
    method: 'POST',
    body: { jobId: request.jobId },
  });
  assert.equal(cancelled.response.status, 202);
  assert.equal(cancelled.json.status, 'cancelling');

  const run = await runPromise;
  assert.equal(run.response.status, 409);
  assert.equal(run.json.error.code, 'job_cancelled');

  const status = await call(runner.baseUrl, `/v1/status?job_id=${request.jobId}`);
  assert.equal(status.response.status, 200);
  assert.equal(status.json.status, 'cancelled');
});

test('disconnecting the run response aborts and drains the active driver', async (t) => {
  let startedResolve;
  const started = new Promise((resolve) => { startedResolve = resolve; });
  let rejectRun;
  let cancelCalls = 0;
  const runner = await startTestRunner(t, {
    createDriver: () => ({
      remediate() {
        startedResolve();
        return new Promise((resolve, reject) => { rejectRun = reject; });
      },
      async cancelActiveRun() {
        cancelCalls += 1;
        rejectRun(new Error('response disconnected'));
        return true;
      },
      async close() {},
    }),
  });
  const request = runRequest('job-response-disconnect');
  const controller = new AbortController();
  const runPromise = fetch(`${runner.baseUrl}/v1/run`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal: controller.signal,
  });

  await started;
  controller.abort();
  await assert.rejects(runPromise, { name: 'AbortError' });

  let status;
  for (let index = 0; index < 50; index += 1) {
    status = await call(runner.baseUrl, `/v1/status?job_id=${request.jobId}`);
    if (status.json.status === 'cancelled') break;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(cancelCalls >= 1, true);
  assert.equal(status.json.status, 'cancelled');
});

test('returns only sanitized throttle metadata and stops after budget exhaustion', async (t) => {
  let attempts = 0;
  const runner = await startTestRunner(t, {
    createDriver: () => ({
      async remediate() {
        attempts += 1;
        const exhausted = attempts > 1;
        throw new Error(
          'API_QUOTA_EXHAUSTED [model_throttled retryAfterMs=' +
          (exhausted ? '8000' : '4250') +
          ' retryBudgetExhausted=' + exhausted + ']',
        );
      },
      async cancelActiveRun() { return false; },
      async close() {},
    }),
  });
  const request = runRequest('job-throttle-metadata');

  const retryable = await call(runner.baseUrl, '/v1/run', {
    method: 'POST',
    body: request,
  });
  assert.equal(retryable.response.status, 429);
  assert.equal(retryable.response.headers.get('retry-after'), '5');
  assert.deepEqual(retryable.json.error, {
    code: 'model_throttled',
    retryable: true,
    retryAfterMs: 4250,
  });

  const exhausted = await call(runner.baseUrl, '/v1/run', {
    method: 'POST',
    body: request,
  });
  assert.equal(exhausted.response.status, 429);
  assert.equal(exhausted.response.headers.get('retry-after'), '8');
  assert.deepEqual(exhausted.json.error, {
    code: 'model_throttled',
    retryable: false,
    retryAfterMs: 8000,
    retryBudgetExhausted: true,
  });
  assert.equal(attempts, 2);
});

test('a transient artifact upload resumes from fixed local bytes without rerunning remediation', async (t) => {
  let driverCalls = 0;
  let inputGets = 0;
  let outputPuts = 0;
  let reportAttempts = 0;
  const uploaded = new Map();

  const storageFetch = async (url, init = {}) => {
    const method = init.method || 'GET';
    if (method === 'GET') {
      inputGets += 1;
      return new Response(INPUT_PDF, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': String(INPUT_PDF.length),
        },
      });
    }
    if (method === 'PUT') {
      outputPuts += 1;
      const body = await readBody(init.body);
      if (String(url).endsWith('/report.json')) {
        reportAttempts += 1;
        if (reportAttempts === 1) return new Response(null, { status: 503 });
      }
      uploaded.set(String(url), body);
      return new Response(null, { status: 204 });
    }
    return new Response(null, { status: 404 });
  };

  const runner = await startTestRunner(t, {
    fetch: storageFetch,
    createDriver: () => ({
      async remediate() {
        driverCalls += 1;
        return {
          ...verifiedQuality(),
          beforeScore: 40,
          afterScore: 95,
          verificationState: 'complete',
          taggedPdfB64: OUTPUT_PDF.toString('base64'),
        };
      },
      async cancelActiveRun() {
        return false;
      },
      async close() {},
    }),
  });
  const request = runRequest('job-upload-retry');

  const first = await call(runner.baseUrl, '/v1/run', { method: 'POST', body: request });
  assert.equal(first.response.status, 502);
  assert.equal(first.json.error.code, 'artifact_upload_failed');
  assert.equal(first.json.error.retryable, true);

  const second = await call(runner.baseUrl, '/v1/run', { method: 'POST', body: request });
  assert.equal(second.response.status, 200);
  assert.equal(second.json.status, 'succeeded');
  assert.equal(driverCalls, 1);
  assert.equal(inputGets, 1);
  assert.equal(outputPuts, 4);
  assert.deepEqual(uploaded.get(request.output.taggedPdfUrl), OUTPUT_PDF);
  assert.ok(uploaded.has(request.output.reportUrl));
});

test('suppresses driver telemetry and minimizes the persisted report', async (t) => {
  const canary = 'Alice Example IEP-Alice.pdf Bearer secret-token-123';
  const writes = [];
  const originalWrite = process.stderr.write;
  process.stderr.write = function captureStderr(chunk) {
    writes.push(String(chunk));
    return true;
  };
  t.after(() => { process.stderr.write = originalWrite; });

  const runner = await startTestRunner(t, {
    createDriver({ log }) {
      return {
        async remediate() {
          log(canary);
          return {
            ...verifiedQuality(),
            beforeScore: 42,
            afterScore: 96,
            estimatedMinimumScore: 90,
            integrityCoverage: 100,
            verificationState: 'complete',
            scoreSource: canary,
            integrityWarning: canary,
            taggedPdfError: canary,
            aiVerificationIncomplete: false,
            taggedPdfB64: OUTPUT_PDF.toString('base64'),
          };
        },
        async cancelActiveRun() { return false; },
        async close() {},
      };
    },
  });
  const request = runRequest('job-privacy-canary');
  const result = await call(runner.baseUrl, '/v1/run', {
    method: 'POST',
    body: request,
  });

  assert.equal(result.response.status, 200);
  const stderr = writes.join('');
  assert.equal(stderr.includes(canary), false);
  assert.equal(stderr.includes('Bearer'), false);
  assert.equal(
    (stderr.match(/event=driver_telemetry_suppressed/g) || []).length,
    1,
  );
  const reportUpload = runner.uploaded.get(request.output.reportUrl);
  const report = JSON.parse(reportUpload.body.toString('utf8'));
  assert.deepEqual(report.input, {
    contentType: 'application/pdf',
    size: INPUT_PDF.length,
  });
  assert.equal(JSON.stringify(report).includes(canary), false);
  assert.equal(Object.hasOwn(report.input, 'sha256'), false);
  assert.equal(Object.hasOwn(report.summary, 'integrityWarning'), false);
  const source = await fsp.readFile(
    path.join(__dirname, '..', 'server.cjs'),
    'utf8',
  );
  assert.equal(source.includes('error.name'), false);
});

test('withholds a review-required result before uploading either artifact', async (t) => {
  const runner = await startTestRunner(t, {
    createDriver: () => ({
      async remediate() {
        return {
          ...verifiedQuality({ verdict: { level: 'review' } }),
          taggedPdfB64: OUTPUT_PDF.toString('base64'),
        };
      },
      async cancelActiveRun() { return false; },
      async close() {},
    }),
  });
  const request = runRequest('job-review-withheld');
  const result = await call(runner.baseUrl, '/v1/run', {
    method: 'POST',
    body: request,
  });

  assert.equal(result.response.status, 422);
  assert.equal(result.json.error.code, 'distribution_review_required');
  assert.equal(result.json.error.retryable, false);
  assert.equal(runner.storageCalls.filter((entry) => entry.method === 'PUT').length, 0);
});

test('rejects PDF-looking bytes when canonical delivery verification is absent', async (t) => {
  const runner = await startTestRunner(t, {
    createDriver: () => ({
      async remediate() {
        return {
          ...verifiedQuality({
            taggedPdfDelivery: {
              ok: false,
              code: 'validator-unavailable',
            },
          }),
          taggedPdfB64: OUTPUT_PDF.toString('base64'),
        };
      },
      async cancelActiveRun() { return false; },
      async close() {},
    }),
  });
  const request = runRequest('job-delivery-withheld');
  const result = await call(runner.baseUrl, '/v1/run', {
    method: 'POST',
    body: request,
  });

  assert.equal(result.response.status, 422);
  assert.equal(result.json.error.code, 'tagged_pdf_verification_failed');
  assert.equal(result.json.error.retryable, false);
  assert.equal(runner.storageCalls.filter((entry) => entry.method === 'PUT').length, 0);
});

test('withholds active-content documents before any artifact upload', async (t) => {
  const runner = await startTestRunner(t, {
    createDriver: () => ({
      async remediate() {
        return {
          ...verifiedQuality({ activeContentDetected: true }),
          taggedPdfB64: OUTPUT_PDF.toString('base64'),
        };
      },
      async cancelActiveRun() { return false; },
      async close() {},
    }),
  });
  const request = runRequest('job-active-content-withheld');
  const result = await call(runner.baseUrl, '/v1/run', {
    method: 'POST',
    body: request,
  });

  assert.equal(result.response.status, 422);
  assert.equal(result.json.error.code, 'active_content_requires_review');
  assert.equal(result.json.error.retryable, false);
  assert.equal(runner.storageCalls.filter((entry) => entry.method === 'PUT').length, 0);
});

test('rejects missing or sliced adaptive-auditor evidence', async (t) => {
  const runner = await startTestRunner(t, {
    createDriver: () => ({
      async remediate() {
        return {
          ...verifiedQuality({
            auditCoverage: {
              configuredAuditorCap: 5,
              requestedAuditors: 3,
              completedAuditors: 3,
              sliced: true,
            },
          }),
          taggedPdfB64: OUTPUT_PDF.toString('base64'),
        };
      },
      async cancelActiveRun() { return false; },
      async close() {},
    }),
  });
  const result = await call(runner.baseUrl, '/v1/run', {
    method: 'POST',
    body: runRequest('job-auditor-evidence-invalid'),
  });

  assert.equal(result.response.status, 500);
  assert.equal(result.json.error.code, 'driver_result_invalid');
  assert.equal(runner.storageCalls.filter((entry) => entry.method === 'PUT').length, 0);
});

test('withholds output when the active-content scan was unavailable', async (t) => {
  const runner = await startTestRunner(t, {
    createDriver: () => ({
      async remediate() {
        return {
          ...verifiedQuality({ activeContentScanVerified: false }),
          taggedPdfB64: OUTPUT_PDF.toString('base64'),
        };
      },
      async cancelActiveRun() { return false; },
      async close() {},
    }),
  });
  const result = await call(runner.baseUrl, '/v1/run', {
    method: 'POST',
    body: runRequest('job-active-scan-unavailable'),
  });

  assert.equal(result.response.status, 422);
  assert.equal(result.json.error.code, 'active_content_scan_unavailable');
  assert.equal(result.json.error.retryable, false);
  assert.equal(runner.storageCalls.filter((entry) => entry.method === 'PUT').length, 0);
});
