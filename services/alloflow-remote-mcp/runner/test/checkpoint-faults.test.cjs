'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const { gzipSync, gunzipSync } = require('node:zlib');

const {
  CHECKPOINT_SCHEMA,
  MAX_CHECKPOINT_COMPRESSED_BYTES,
  MAX_CHECKPOINT_JSON_BYTES,
  RunnerError,
  checkpointEngineConfigDigest,
  checkpointEngineDigest,
  checkpointOptionsDigest,
  classifyDriverFailure,
  fetchWithTimeout,
  loadCheckpoint,
  putCheckpoint,
  validateCheckpointEnvelope,
} = require('../server.cjs');

async function consumeBody(body) {
  for await (const _chunk of body) {}
}

function headerThenStallResponse() {
  return new Response(new ReadableStream({
    pull() {
      return new Promise(() => {});
    },
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/octet-stream' },
  });
}

const INPUT_SHA256 = '1'.repeat(64);
const OPTIONS_SHA256 = '2'.repeat(64);
const ENGINE_SHA256 = '3'.repeat(64);
const EXPECTED = {
  inputSha256: INPUT_SHA256,
  optionsSha256: OPTIONS_SHA256,
  engineSha256: ENGINE_SHA256,
};

test('storage timeout remains active after headers while the body stalls', async () => {
  const response = await fetchWithTimeout(
    async () => headerThenStallResponse(),
    'http://r2.internal/stalled-body',
    { method: 'GET' },
    25,
    new AbortController().signal,
  );
  await assert.rejects(
    consumeBody(response.body),
    (error) => error instanceof RunnerError &&
      error.code === 'storage_request_failed' &&
      error.retryable === true,
  );
});

test('parent cancellation remains active after storage response headers', async () => {
  const parent = new AbortController();
  const response = await fetchWithTimeout(
    async () => headerThenStallResponse(),
    'http://r2.internal/stalled-body',
    { method: 'GET' },
    10_000,
    parent.signal,
  );
  const consuming = consumeBody(response.body);
  parent.abort();
  await assert.rejects(
    consuming,
    (error) => error instanceof RunnerError && error.code === 'job_cancelled',
  );
});

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function snapshot(overrides = {}) {
  const stage = overrides.stage || 'round';
  const roundsRun = overrides.roundsRun === undefined
    ? (stage === 'primary' ? 0 : 1)
    : overrides.roundsRun;
  const nextRound = overrides.nextRound === undefined
    ? roundsRun
    : overrides.nextRound;
  return {
    schema: CHECKPOINT_SCHEMA,
    stage,
    audit: {
      score: 96,
      documentLanguage: 'en',
      requestedAuditors: 3,
      auditorCount: 3,
      sliced: false,
    },
    remediation: {
      accessibleHtml: `<main data-next-round="${nextRound}">accepted</main>`,
    },
    nextRound,
    roundsRun,
    roundLog: [],
    loopState: {
      lastViolations: 0,
      lastDet: 96,
      lastIssues: 0,
      stagnant: 0,
    },
    autoContinueDone: false,
    ...overrides,
  };
}

function envelope(sequence = 2, overrides = {}) {
  const value = {
    schema: CHECKPOINT_SCHEMA,
    sequence,
    stage: 'round',
    inputSha256: INPUT_SHA256,
    optionsSha256: OPTIONS_SHA256,
    engineSha256: ENGINE_SHA256,
    snapshot: snapshot(),
    ...overrides,
  };
  return value;
}

function checkpointResponse(value, headerOverrides = {}) {
  const compressed = gzipSync(Buffer.from(JSON.stringify(value), 'utf8'));
  const headers = {
    'Content-Type': 'application/gzip',
    'Content-Length': String(compressed.length),
    'X-AlloFlow-SHA256': sha256(compressed),
    'X-AlloFlow-Checkpoint-Schema': String(value.schema),
    'X-AlloFlow-Checkpoint-Sequence': String(value.sequence),
    'X-AlloFlow-Checkpoint-Stage': String(value.stage),
    'X-AlloFlow-Input-SHA256': String(value.inputSha256),
    'X-AlloFlow-Options-SHA256': String(value.optionsSha256),
    'X-AlloFlow-Engine-SHA256': String(value.engineSha256),
    ...headerOverrides,
  };
  return { compressed, headers };
}

async function load(value, options = {}) {
  const built = checkpointResponse(value, options.headerOverrides);
  const body = options.body || built.compressed;
  const status = options.status || 200;
  const fetchImpl = async () => new Response(
    status === 404 ? null : body,
    { status, headers: built.headers },
  );
  return loadCheckpoint(
    fetchImpl,
    'http://r2.internal/checkpoint',
    options.expected || EXPECTED,
    new AbortController().signal,
  );
}

test('loads the last accepted round and resumes at the next round index', async () => {
  const value = envelope(2);
  assert.deepEqual(validateCheckpointEnvelope(value, EXPECTED), value);

  const loaded = await load(value);
  assert.equal(loaded.baseSequence, 2);
  assert.deepEqual(loaded.resumeCheckpoint, value.snapshot);
  assert.equal(loaded.resumeCheckpoint.roundsRun, 1);
  assert.equal(loaded.resumeCheckpoint.nextRound, 1);
});

test('incompatible and malformed envelopes safely fall back to a fresh run', async () => {
  const cases = [
    envelope(5, { schema: 2 }),
    envelope(5, { inputSha256: '4'.repeat(64) }),
    envelope(5, { optionsSha256: '5'.repeat(64) }),
    envelope(5, { engineSha256: '6'.repeat(64) }),
    envelope(5, {
      snapshot: snapshot({ nextRound: 2, roundsRun: 1 }),
    }),
  ];

  for (const candidate of cases) {
    assert.equal(validateCheckpointEnvelope(candidate, EXPECTED), null);
    const loaded = await load(candidate);
    assert.equal(loaded.baseSequence, 5);
    assert.equal(loaded.resumeCheckpoint, null);
  }
});

test('checksum and gzip corruption never become resumable state', async () => {
  const value = envelope(4);
  const built = checkpointResponse(value);
  const corrupt = Buffer.from(built.compressed);
  corrupt[corrupt.length - 1] ^= 0xff;

  const checksumMismatch = await load(value, { body: corrupt });
  assert.deepEqual(checksumMismatch, {
    baseSequence: 4,
    resumeCheckpoint: null,
  });

  const malformedGzip = Buffer.from('not-a-gzip-checkpoint', 'utf8');
  const malformed = await load(value, {
    body: malformedGzip,
    headerOverrides: {
      'Content-Length': String(malformedGzip.length),
      'X-AlloFlow-SHA256': sha256(malformedGzip),
    },
  });
  assert.deepEqual(malformed, {
    baseSequence: 4,
    resumeCheckpoint: null,
  });
});

test('fresh fallback advances past the incompatible checkpoint sequence', async () => {
  const incompatible = envelope(7, {
    optionsSha256: '7'.repeat(64),
  });
  const loaded = await load(incompatible);
  assert.deepEqual(loaded, {
    baseSequence: 7,
    resumeCheckpoint: null,
  });

  let uploaded = null;
  const fetchImpl = async (_url, init) => {
    uploaded = {
      headers: init.headers,
      body: Buffer.from(init.body),
    };
    return new Response(null, { status: 201 });
  };
  const result = await putCheckpoint(
    fetchImpl,
    'http://r2.internal/checkpoint',
    'job-checkpoint-fallback',
    snapshot({ stage: 'primary', nextRound: 0, roundsRun: 0 }),
    EXPECTED,
    loaded.baseSequence + 1,
    new AbortController().signal,
  );

  assert.equal(result.saved, true);
  assert.equal(result.sequence, 8);
  assert.equal(uploaded.headers['X-AlloFlow-Checkpoint-Sequence'], '8');
  const healed = JSON.parse(gunzipSync(uploaded.body).toString('utf8'));
  assert.equal(healed.sequence, 8);
  assert.equal(healed.optionsSha256, OPTIONS_SHA256);
  assert.equal(healed.snapshot.nextRound, 0);
});

test('checkpoint ownership loss is terminal for stale fetch and upload attempts', async () => {
  const value = envelope(2);
  await assert.rejects(
    load(value, { status: 403 }),
    (error) => error instanceof RunnerError &&
      error.code === 'checkpoint_ownership_lost' &&
      error.status === 409 &&
      error.retryable === false,
  );

  await assert.rejects(
    putCheckpoint(
      async () => new Response(null, { status: 409 }),
      'http://r2.internal/checkpoint',
      'job-stale-attempt',
      snapshot(),
      EXPECTED,
      3,
      new AbortController().signal,
    ),
    (error) => error instanceof RunnerError &&
      error.code === 'checkpoint_ownership_lost' &&
      error.status === 409 &&
      error.retryable === false,
  );
});

test('engine compatibility includes normalized base, primary, and fallback model routing', () => {
  const manifest = Buffer.from(JSON.stringify({
    schema: 1,
    files: [{
      path: 'desktop/mcp/remediation_headless_driver.cjs',
      bytes: 7,
      sha256: 'a'.repeat(64),
    }],
  }), 'utf8');
  const serverBytes = Buffer.from('server-runtime-v1', 'utf8');
  const environment = {
    ALLOFLOW_MCP_GEMINI_BASE: 'http://GEMINI.INTERNAL/v1beta/models',
    ALLOFLOW_MCP_GEMINI_MODEL: 'model-a',
    ALLOFLOW_MCP_GEMINI_FALLBACK_MODEL: 'fallback-a',
  };
  const equivalent = {
    ALLOFLOW_MCP_GEMINI_FALLBACK_MODEL: 'fallback-a',
    ALLOFLOW_MCP_GEMINI_MODEL: 'model-a',
    ALLOFLOW_MCP_GEMINI_BASE: 'http://gemini.internal/v1beta/models',
    UNRELATED_SECRET: 'ignored',
  };
  const configDigest = checkpointEngineConfigDigest(environment);
  const engineDigest = checkpointEngineDigest(manifest, serverBytes, environment);

  assert.equal(checkpointEngineConfigDigest(equivalent), configDigest);
  assert.equal(checkpointEngineDigest(manifest, serverBytes, equivalent), engineDigest);

  for (const changed of [
    { ALLOFLOW_MCP_GEMINI_BASE: 'http://gemini.internal/v2/models' },
    { ALLOFLOW_MCP_GEMINI_MODEL: 'model-b' },
    { ALLOFLOW_MCP_GEMINI_FALLBACK_MODEL: 'fallback-b' },
  ]) {
    const candidate = { ...environment, ...changed };
    assert.notEqual(checkpointEngineConfigDigest(candidate), configDigest);
    assert.notEqual(checkpointEngineDigest(manifest, serverBytes, candidate), engineDigest);
  }
});

test('checkpoint option compatibility fences model retry budget drift', () => {
  const options = {
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
    modelRetryBudget: 4,
  };
  const digest = checkpointOptionsDigest(options);
  assert.notEqual(
    checkpointOptionsDigest({ ...options, modelRetryBudget: 2 }),
    digest,
  );
  const legacy = { ...options };
  delete legacy.modelRetryBudget;
  assert.notEqual(checkpointOptionsDigest(legacy), digest);
});

test('invalid and unserializable enabled snapshots fail before storage', async () => {
  let fetchCalls = 0;
  const fetchImpl = async () => {
    fetchCalls += 1;
    return new Response(null, { status: 201 });
  };
  const signal = new AbortController().signal;
  const invalid = snapshot({ nextRound: 2, roundsRun: 1 });
  await assert.rejects(
    putCheckpoint(
      fetchImpl,
      'http://r2.internal/checkpoint',
      'job-invalid-snapshot',
      invalid,
      EXPECTED,
      3,
      signal,
    ),
    (error) => error instanceof RunnerError &&
      error.code === 'checkpoint_snapshot_invalid' &&
      error.retryable === false,
  );

  const circular = snapshot();
  circular.remediation.circular = circular.remediation;
  await assert.rejects(
    putCheckpoint(
      fetchImpl,
      'http://r2.internal/checkpoint',
      'job-circular-snapshot',
      circular,
      EXPECTED,
      3,
      signal,
    ),
    (error) => error instanceof RunnerError &&
      error.code === 'checkpoint_snapshot_invalid' &&
      error.retryable === false,
  );
  assert.equal(fetchCalls, 0);
});

test('oversized enabled snapshots fail explicitly at the aligned storage cap', { timeout: 120000 }, async () => {
  assert.equal(MAX_CHECKPOINT_COMPRESSED_BYTES, 32 * 1024 * 1024);
  assert.equal(MAX_CHECKPOINT_JSON_BYTES, 128 * 1024 * 1024);

  const oversized = snapshot({ stage: 'primary', nextRound: 0, roundsRun: 0 });
  oversized.remediation.accessibleHtml = crypto
    .randomBytes(MAX_CHECKPOINT_COMPRESSED_BYTES + (3 * 1024 * 1024))
    .toString('base64');
  let fetchCalls = 0;
  await assert.rejects(
    putCheckpoint(
      async () => {
        fetchCalls += 1;
        return new Response(null, { status: 201 });
      },
      'http://r2.internal/checkpoint',
      'job-oversized-snapshot',
      oversized,
      EXPECTED,
      3,
      new AbortController().signal,
    ),
    (error) => error instanceof RunnerError &&
      error.code === 'checkpoint_snapshot_too_large' &&
      error.retryable === false,
  );
  assert.equal(fetchCalls, 0);
});

test('page-side checkpoint snapshot errors retain fixed nonretryable codes', () => {
  for (const code of [
    'checkpoint_snapshot_invalid',
    'checkpoint_snapshot_too_large',
  ]) {
    const classified = classifyDriverFailure(
      new Error('page.evaluate failed: Error: ' + code),
    );
    assert.ok(classified instanceof RunnerError);
    assert.equal(classified.code, code);
    assert.equal(classified.retryable, false);
  }
});
