"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  expectedRunnerForModel,
  runReleaseCanary,
  validateReadyPayload,
} = require("../pilot-release-canary.cjs");

const digest = "a".repeat(64);

function readyPayload(overrides = {}) {
  return {
    ok: true,
    service: "alloflow-remediation-remote-mcp",
    release: {
      workerVersionId: "worker-version-123",
      databaseSchema: 7,
      checkpointSchema: 1,
      runnerProtocol: "remediation-run-v1",
    },
    database: { ok: true, schema: 7, admissionsOpen: false },
    runner: {
      service: "alloflow-remediation-runner",
      version: "0.3.0",
      active: null,
      protocol: {
        runSchema: 1,
        checkpointSchema: 1,
        checkpointEngineAbi: 1,
      },
      build: {
        manifestSha256: digest,
        runnerBuildSha256: digest,
        modelConfigSha256: digest,
        checkpointEngineSha256: digest,
      },
    },
    compatibility: { ok: true, issues: [] },
    ...overrides,
  };
}

test("ready payload requires deployed Worker and exact runner ABI", () => {
  assert.deepEqual(validateReadyPayload(readyPayload()), []);
  const local = readyPayload();
  local.release.workerVersionId = "local";
  assert.ok(validateReadyPayload(local).includes("deployed_worker_version_missing"));
  const stale = readyPayload();
  stale.runner.protocol.checkpointSchema = 2;
  assert.ok(validateReadyPayload(stale).includes("runner_protocol_incompatible"));
  const malformed = readyPayload();
  malformed.runner.build.manifestSha256 = "not-a-digest";
  assert.ok(validateReadyPayload(malformed).includes("runner_build_identity_missing"));
  const unmigrated = readyPayload();
  unmigrated.database = { ok: false, schema: null };
  assert.ok(validateReadyPayload(unmigrated).includes("database_schema_incompatible"));
  const prematurelyOpen = readyPayload();
  prematurelyOpen.database.admissionsOpen = true;
  assert.ok(
    validateReadyPayload(prematurelyOpen).includes(
      "admissions_not_paused_during_release",
    ),
  );
});

test("canary rejects an internally coherent runner that is stale against the local release contract", async () => {
  const expectedRunner = await expectedRunnerForModel("gemini-2.5-flash");
  const current = readyPayload();
  current.runner.service = expectedRunner.service;
  current.runner.version = expectedRunner.version;
  current.runner.protocol = { ...expectedRunner.protocol };
  current.runner.build = { ...expectedRunner.build };
  assert.deepEqual(validateReadyPayload(current, expectedRunner), []);

  const stale = structuredClone(current);
  stale.runner.build = {
    manifestSha256: "b".repeat(64),
    runnerBuildSha256: "c".repeat(64),
    modelConfigSha256: "d".repeat(64),
    checkpointEngineSha256: "e".repeat(64),
  };
  assert.deepEqual(validateReadyPayload(stale), []);
  assert.ok(
    validateReadyPayload(stale, expectedRunner).includes(
      "runner_local_release_build_mismatch",
    ),
  );

  let calls = 0;
  await assert.rejects(
    runReleaseCanary({
      origin: "https://mcp-staging.district.example",
      token: "x".repeat(43),
      attempts: 4,
      expectedRunner,
      fetchImpl: async () => {
        calls += 1;
        return Response.json(stale);
      },
    }),
    /runner_local_release_build_mismatch/u,
  );
  assert.equal(calls, 1, "a stale 200 response must fail closed without retries");
});

test("canary retries a cold 503 then accepts the compatible release", async () => {
  const calls = [];
  const sleeps = [];
  const payload = readyPayload();
  const result = await runReleaseCanary({
    origin: "https://mcp-staging.district.example",
    token: "x".repeat(43),
    attempts: 2,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      if (calls.length === 1) {
        return Response.json(
          { ...payload, ok: false, compatibility: { ok: false } },
          { status: 503 },
        );
      }
      return Response.json(payload);
    },
  });
  assert.deepEqual(result, payload);
  assert.equal(calls.length, 2);
  assert.deepEqual(sleeps, [2500]);
  assert.equal(calls[0].url, "https://mcp-staging.district.example/readyz");
  assert.equal(
    calls[0].init.headers.Authorization,
    `Bearer ${"x".repeat(43)}`,
  );
});

test("incompatible 200 fails closed and does not leak the token", async () => {
  const payload = readyPayload();
  payload.compatibility.ok = false;
  payload.compatibility.issues = ["runner_build_mismatch"];
  const token = "secret-release-canary-token-123456789";
  await assert.rejects(
    runReleaseCanary({
      origin: "https://mcp-staging.district.example",
      token,
      attempts: 1,
      fetchImpl: async () => Response.json(payload),
    }),
    (error) =>
      error instanceof Error &&
      !error.message.includes(token) &&
      error.message.includes("release_not_ready"),
  );
});
