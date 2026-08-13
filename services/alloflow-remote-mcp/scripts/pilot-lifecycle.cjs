"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { isDeepStrictEqual } = require("node:util");

const {
  readPilotConfig,
  validatePilotConfig,
} = require("./pilot-preflight.cjs");

const SERVICE_ROOT = path.resolve(__dirname, "..");
const DEFAULT_POLICY_PATH = path.join(
  SERVICE_ROOT,
  "config",
  "r2-lifecycle.json",
);
const EXPECTED_POLICY = Object.freeze({
  rules: [
    {
      id: "alloflow-document-retention-backstop-v1",
      enabled: true,
      conditions: { prefix: "tenant/" },
      deleteObjectsTransition: {
        condition: { type: "Age", maxAge: 2 * 24 * 60 * 60 },
      },
      abortMultipartUploadsTransition: {
        condition: { type: "Age", maxAge: 24 * 60 * 60 },
      },
    },
  ],
});

function readLifecyclePolicy(policyPath = DEFAULT_POLICY_PATH) {
  return JSON.parse(fs.readFileSync(policyPath, "utf8"));
}

function validateLifecyclePolicy(policy) {
  if (!isDeepStrictEqual(normalizeLifecyclePolicy(policy), EXPECTED_POLICY)) {
    return [
      "R2 lifecycle policy must exactly retain the versioned tenant/ " +
        "two-day object-expiry and one-day multipart-abort rules",
    ];
  }
  return [];
}

function normalizeLifecyclePolicy(policy) {
  if (!policy || !Array.isArray(policy.rules)) {
    return policy;
  }
  const normalized = JSON.parse(JSON.stringify(policy));
  normalized.rules.sort((left, right) =>
    String(left?.id || "").localeCompare(String(right?.id || "")),
  );
  return normalized;
}

function resolveDocumentsBucket(config) {
  const buckets = Array.isArray(config?.r2_buckets)
    ? config.r2_buckets.filter((entry) => entry.binding === "DOCUMENTS")
    : [];
  if (
    buckets.length !== 1 ||
    typeof buckets[0].bucket_name !== "string" ||
    !buckets[0].bucket_name
  ) {
    throw new Error("expected_exactly_one_documents_bucket");
  }
  return buckets[0].bucket_name;
}

function buildApplyCommand(configPath, policyPath, config) {
  const wranglerBin = path.join(
    SERVICE_ROOT,
    "node_modules",
    "wrangler",
    "bin",
    "wrangler.js",
  );
  if (!fs.existsSync(wranglerBin)) {
    throw new Error("wrangler_not_installed");
  }
  return {
    command: process.execPath,
    args: [
      wranglerBin,
      "r2",
      "bucket",
      "lifecycle",
      "set",
      resolveDocumentsBucket(config),
      "--file",
      policyPath,
      "--config",
      configPath,
      "--force",
    ],
  };
}

async function readRemoteLifecyclePolicy(config, bucket, options = {}) {
  const accountId = options.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = options.token || process.env.CLOUDFLARE_API_TOKEN;
  if (!/^[a-f0-9]{32}$/iu.test(accountId || "")) {
    throw new Error("cloudflare_account_id_required_for_lifecycle_readback");
  }
  if (typeof token !== "string" || token.length < 20) {
    throw new Error("cloudflare_api_token_required_for_lifecycle_readback");
  }
  const binding = config.r2_buckets.find(
    (entry) => entry.binding === "DOCUMENTS",
  );
  const headers = { Authorization: `Bearer ${token}` };
  if (binding.jurisdiction) {
    headers["cf-r2-jurisdiction"] = binding.jurisdiction;
  }
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const response = await fetchImpl(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}` +
      `/r2/buckets/${encodeURIComponent(bucket)}/lifecycle`,
    {
      headers,
      signal: AbortSignal.timeout(15_000),
    },
  );
  const declaredLength = Number(response.headers.get("Content-Length"));
  if (Number.isFinite(declaredLength) && declaredLength > 256 * 1024) {
    throw new Error("r2_lifecycle_readback_too_large");
  }
  const text = await response.text();
  if (text.length > 256 * 1024) {
    throw new Error("r2_lifecycle_readback_too_large");
  }
  if (!response.ok) {
    throw new Error(`r2_lifecycle_readback_failed_${response.status}`);
  }
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("r2_lifecycle_readback_invalid");
  }
  if (payload?.success !== true || !Array.isArray(payload?.result?.rules)) {
    throw new Error("r2_lifecycle_readback_invalid");
  }
  return normalizeLifecyclePolicy({ rules: payload.result.rules });
}

async function applyLifecyclePolicy(configPath, policyPath, options = {}) {
  if (/\.example\./u.test(path.basename(configPath))) {
    throw new Error("refusing_to_apply_example_configuration");
  }
  const { raw, config } = readPilotConfig(configPath);
  const preflightErrors = validatePilotConfig(config, raw, {
    allowSyntheticAcceptance: true,
  });
  if (preflightErrors.length > 0) {
    throw new Error(`pilot_preflight_failed: ${preflightErrors.join("; ")}`);
  }
  const command = buildApplyCommand(configPath, policyPath, config);
  const run = options.spawnSync || spawnSync;
  const result = run(command.command, command.args, {
    cwd: SERVICE_ROOT,
    stdio: "inherit",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`wrangler_lifecycle_set_failed_${result.status ?? "signal"}`);
  }
  const bucket = resolveDocumentsBucket(config);
  const readback = await readRemoteLifecyclePolicy(config, bucket, options);
  const readbackErrors = validateLifecyclePolicy(readback);
  if (readbackErrors.length > 0) {
    throw new Error(
      `r2_lifecycle_readback_mismatch: ${readbackErrors.join("; ")}`,
    );
  }
  return bucket;
}

function optionValue(argv, name, fallback) {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1]
    ? path.resolve(argv[index + 1])
    : fallback;
}

async function main(argv) {
  const policyPath = optionValue(
    argv,
    "--policy",
    DEFAULT_POLICY_PATH,
  );
  const policyErrors = validateLifecyclePolicy(
    readLifecyclePolicy(policyPath),
  );
  if (policyErrors.length > 0) {
    throw new Error(policyErrors.join("; "));
  }
  if (!argv.includes("--apply")) {
    process.stdout.write(
      "R2 lifecycle policy passed offline validation. No remote change was made.\n",
    );
    return;
  }
  const configPath = optionValue(
    argv,
    "--config",
    path.resolve("wrangler.pilot.local.jsonc"),
  );
  const bucket = await applyLifecyclePolicy(configPath, policyPath);
  process.stdout.write(
    `Applied the checked R2 lifecycle policy to ${bucket}.\n`,
  );
}

module.exports = {
  DEFAULT_POLICY_PATH,
  EXPECTED_POLICY,
  applyLifecyclePolicy,
  buildApplyCommand,
  normalizeLifecyclePolicy,
  readLifecyclePolicy,
  readRemoteLifecyclePolicy,
  resolveDocumentsBucket,
  validateLifecyclePolicy,
};

if (require.main === module) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(
      `lifecycle: ${error instanceof Error ? error.message : "failed"}\n`,
    );
    process.exitCode = 1;
  });
}
