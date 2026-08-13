"use strict";

const path = require("node:path");

const {
  readPilotConfig,
  validatePilotConfig,
} = require("./pilot-preflight.cjs");
const {
  RUNNER_RELEASE_CONTRACT,
  expectedRunnerBuildForModel,
} = require("../src/runner-release-contract.ts");

const SHA256_RE = /^[a-f0-9]{64}$/u;
const RUNNER_VERSION_RE = /^0\.[1-9][0-9]*\.[0-9]+(?:-[A-Za-z0-9.-]+)?$/u;
const DEFAULT_RELEASE_CANARY_ATTEMPTS = 4;
const EXPECTED = Object.freeze({
  databaseSchema: 7,
  checkpointSchema: 1,
  runnerProtocol: "remediation-run-v1",
  runnerService: "alloflow-remediation-runner",
  runSchema: 1,
  checkpointEngineAbi: 1,
});

async function expectedRunnerForModel(model) {
  return {
    service: RUNNER_RELEASE_CONTRACT.service,
    version: RUNNER_RELEASE_CONTRACT.version,
    protocol: RUNNER_RELEASE_CONTRACT.protocol,
    build: await expectedRunnerBuildForModel(model),
  };
}

function validateReadyPayload(value, expectedRunner) {
  const errors = [];
  const release = value?.release;
  const runner = value?.runner;
  if (value?.ok !== true || value?.compatibility?.ok !== true) {
    errors.push("release_not_ready");
  }
  if (
    !release ||
    typeof release.workerVersionId !== "string" ||
    !release.workerVersionId ||
    release.workerVersionId === "local"
  ) {
    errors.push("deployed_worker_version_missing");
  }
  for (const [field, expected] of [
    ["databaseSchema", EXPECTED.databaseSchema],
    ["checkpointSchema", EXPECTED.checkpointSchema],
    ["runnerProtocol", EXPECTED.runnerProtocol],
  ]) {
    if (release?.[field] !== expected) {
      errors.push(`worker_${field}_incompatible`);
    }
  }
  if (
    value?.database?.ok !== true ||
    value?.database?.schema !== EXPECTED.databaseSchema ||
    typeof value?.database?.admissionsOpen !== "boolean"
  ) {
    errors.push("database_schema_incompatible");
  } else if (value.database.admissionsOpen !== false) {
    errors.push("admissions_not_paused_during_release");
  }
  if (
    runner?.service !== EXPECTED.runnerService ||
    !RUNNER_VERSION_RE.test(runner?.version || "") ||
    runner?.active !== null
  ) {
    errors.push("runner_identity_incompatible");
  }
  if (
    runner?.protocol?.runSchema !== EXPECTED.runSchema ||
    runner?.protocol?.checkpointSchema !== EXPECTED.checkpointSchema ||
    runner?.protocol?.checkpointEngineAbi !== EXPECTED.checkpointEngineAbi
  ) {
    errors.push("runner_protocol_incompatible");
  }
  const buildFields = [
    "manifestSha256",
    "runnerBuildSha256",
    "modelConfigSha256",
    "checkpointEngineSha256",
  ];
  if (
    !runner?.build ||
    buildFields.some((field) => !SHA256_RE.test(runner.build[field] || ""))
  ) {
    errors.push("runner_build_identity_missing");
  }
  if (expectedRunner) {
    if (
      runner?.service !== expectedRunner.service ||
      runner?.version !== expectedRunner.version
    ) {
      errors.push("runner_local_release_identity_mismatch");
    }
    if (
      runner?.protocol?.runSchema !== expectedRunner.protocol.runSchema ||
      runner?.protocol?.checkpointSchema !==
        expectedRunner.protocol.checkpointSchema ||
      runner?.protocol?.checkpointEngineAbi !==
        expectedRunner.protocol.checkpointEngineAbi
    ) {
      errors.push("runner_local_release_protocol_mismatch");
    }
    if (
      buildFields.some(
        (field) => runner?.build?.[field] !== expectedRunner.build[field],
      )
    ) {
      errors.push("runner_local_release_build_mismatch");
    }
  }
  return [...new Set(errors)];
}

async function readBoundedJson(response) {
  const text = await response.text();
  if (text.length > 64 * 1024) {
    throw new Error("canary_response_too_large");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("canary_response_invalid");
  }
}

async function runReleaseCanary(options) {
  const origin = new URL(options.origin);
  if (
    origin.protocol !== "https:" ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  ) {
    throw new Error("invalid_canary_origin");
  }
  if (typeof options.token !== "string" || options.token.length < 32) {
    throw new Error("release_canary_secret_required");
  }
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const sleep = options.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const attempts = Number.isSafeInteger(options.attempts)
    ? Math.max(1, Math.min(6, options.attempts))
    : DEFAULT_RELEASE_CANARY_ATTEMPTS;
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetchImpl(new URL("/readyz", origin), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${options.token}`,
          Accept: "application/json",
        },
        redirect: "error",
        signal: AbortSignal.timeout(60_000),
      });
      const payload = await readBoundedJson(response);
      const compatibilityErrors = validateReadyPayload(
        payload,
        options.expectedRunner,
      );
      if (!response.ok || compatibilityErrors.length > 0) {
        const error = new Error(
          compatibilityErrors.join(",") || `canary_http_${response.status}`,
        );
        error.retryable = response.status >= 500;
        throw error;
      }
      return payload;
    } catch (error) {
      lastError = error;
      const retryable = error?.retryable !== false;
      if (!retryable || attempt + 1 >= attempts) break;
      await sleep(Math.min(20_000, 2_500 * 2 ** attempt));
    }
  }
  throw lastError || new Error("release_canary_failed");
}

async function main(argv) {
  const configIndex = argv.indexOf("--config");
  const configPath = path.resolve(
    configIndex >= 0 && argv[configIndex + 1]
      ? argv[configIndex + 1]
      : "wrangler.pilot.local.jsonc",
  );
  if (/\.example\./u.test(path.basename(configPath))) {
    throw new Error("refusing_to_canary_example_configuration");
  }
  const { raw, config } = readPilotConfig(configPath);
  const preflightErrors = validatePilotConfig(config, raw, {
    allowSyntheticAcceptance: true,
  });
  if (preflightErrors.length > 0) {
    throw new Error(`pilot_preflight_failed: ${preflightErrors.join("; ")}`);
  }
  const expectedRunner = await expectedRunnerForModel(
    config.vars.GEMINI_MODEL,
  );
  const payload = await runReleaseCanary({
    origin: config.vars.PUBLIC_ORIGIN,
    token: process.env.RELEASE_CANARY_SECRET,
    expectedRunner,
  });
  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      workerVersionId: payload.release.workerVersionId,
      runnerVersion: payload.runner.version,
      runnerBuildSha256: payload.runner.build.runnerBuildSha256,
      checkpointEngineSha256:
        payload.runner.build.checkpointEngineSha256,
    })}\n`,
  );
}

module.exports = {
  DEFAULT_RELEASE_CANARY_ATTEMPTS,
  EXPECTED,
  expectedRunnerForModel,
  runReleaseCanary,
  validateReadyPayload,
};

if (require.main === module) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(
      `canary: ${error instanceof Error ? error.message : "failed"}\n`,
    );
    process.exitCode = 1;
  });
}
