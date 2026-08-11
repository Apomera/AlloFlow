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
  if (!isDeepStrictEqual(policy, EXPECTED_POLICY)) {
    return [
      "R2 lifecycle policy must exactly retain the versioned tenant/ " +
        "two-day object-expiry and one-day multipart-abort rules",
    ];
  }
  return [];
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

function applyLifecyclePolicy(configPath, policyPath, options = {}) {
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
  return resolveDocumentsBucket(config);
}

function optionValue(argv, name, fallback) {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1]
    ? path.resolve(argv[index + 1])
    : fallback;
}

function main(argv) {
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
  const bucket = applyLifecyclePolicy(configPath, policyPath);
  process.stdout.write(
    `Applied the checked R2 lifecycle policy to ${bucket}.\n`,
  );
}

module.exports = {
  DEFAULT_POLICY_PATH,
  EXPECTED_POLICY,
  applyLifecyclePolicy,
  buildApplyCommand,
  readLifecyclePolicy,
  resolveDocumentsBucket,
  validateLifecyclePolicy,
};

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(
      `lifecycle: ${error instanceof Error ? error.message : "failed"}\n`,
    );
    process.exitCode = 1;
  }
}
