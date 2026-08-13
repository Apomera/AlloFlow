"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { readPilotConfig } = require("./pilot-preflight.cjs");

const SERVICE_ROOT = path.resolve(__dirname, "..");
const WRANGLER_BIN = path.join(
  SERVICE_ROOT,
  "node_modules",
  "wrangler",
  "bin",
  "wrangler.js",
);
const LOCAL_CONFIG_NAME = "wrangler.pilot.local.jsonc";
const PLACEHOLDER_PREFIX = "REPLACE_WITH_";

function exactBinding(config, collection, binding) {
  const matches = Array.isArray(config?.[collection])
    ? config[collection].filter((entry) => entry?.binding === binding)
    : [];
  if (matches.length !== 1) {
    throw new Error(`expected_exactly_one_${binding.toLowerCase()}_binding`);
  }
  return matches[0];
}

function desiredResources(config) {
  const kv = exactBinding(config, "kv_namespaces", "OAUTH_KV");
  const d1 = exactBinding(config, "d1_databases", "PILOT_DB");
  const r2 = exactBinding(config, "r2_buckets", "DOCUMENTS");
  return Object.freeze({
    kv: Object.freeze({
      binding: "OAUTH_KV",
      name: `${config.name}-oauth-kv`,
      configuredId: kv.id,
    }),
    d1: Object.freeze({
      binding: "PILOT_DB",
      name: d1.database_name,
      configuredId: d1.database_id,
    }),
    r2: Object.freeze({
      binding: "DOCUMENTS",
      name: r2.bucket_name,
    }),
  });
}

function isPlaceholder(value) {
  return typeof value === "string" && value.startsWith(PLACEHOLDER_PREFIX);
}

function validateProvisioningShape(config) {
  const errors = [];
  let desired;
  try {
    desired = desiredResources(config);
  } catch (error) {
    return [error instanceof Error ? error.message : "invalid_bindings"];
  }
  if (
    typeof config.name !== "string" ||
    !/^alloflow-[a-z0-9-]*institution-staging$/u.test(config.name)
  ) {
    errors.push("Worker name must be a dedicated AlloFlow institution staging name");
  }
  if (config.workers_dev !== false || config.preview_urls !== false) {
    errors.push("workers_dev and preview_urls must both be false");
  }
  if (config.vars?.APP_ENV !== "staging" || config.vars?.PILOT_ENABLED !== "true") {
    errors.push("APP_ENV must be staging and PILOT_ENABLED must be true");
  }
  if (config.vars?.PILOT_ACCEPTANCE_VERSION !== undefined) {
    errors.push("initial provisioning requires PILOT_ACCEPTANCE_VERSION to be unset");
  }
  if (
    !isPlaceholder(desired.kv.configuredId) &&
    !/^[a-f0-9]{32}$/iu.test(desired.kv.configuredId || "")
  ) {
    errors.push("OAUTH_KV id must be the template placeholder or a 32-hex ID");
  }
  if (
    !isPlaceholder(desired.d1.configuredId) &&
    !/^[a-f0-9-]{32,36}$/iu.test(desired.d1.configuredId || "")
  ) {
    errors.push("PILOT_DB id must be the template placeholder or a D1 UUID");
  }
  if (
    typeof desired.d1.name !== "string" ||
    !desired.d1.name.includes("staging")
  ) {
    errors.push("PILOT_DB must have a dedicated staging name");
  }
  if (
    typeof desired.r2.name !== "string" ||
    !/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/u.test(desired.r2.name) ||
    !desired.r2.name.includes("staging") ||
    !desired.r2.name.includes("documents")
  ) {
    errors.push("DOCUMENTS must have a valid dedicated staging bucket name");
  }
  return errors;
}

function uniqueBy(items, predicate, errorCode) {
  const matches = items.filter(predicate);
  if (matches.length > 1) throw new Error(errorCode);
  return matches[0];
}

function planIdentifiedResource(kind, desired, items, nameField, idField) {
  const configured = isPlaceholder(desired.configuredId)
    ? undefined
    : desired.configuredId;
  const byName = uniqueBy(
    items,
    (entry) => entry?.[nameField] === desired.name,
    `duplicate_${kind}_name`,
  );
  const byId = configured
    ? uniqueBy(
        items,
        (entry) => entry?.[idField] === configured,
        `duplicate_${kind}_id`,
      )
    : undefined;
  if (configured && (!byId || byId[nameField] !== desired.name)) {
    throw new Error(`configured_${kind}_does_not_match_dedicated_name`);
  }
  if (configured && byName && byName[idField] !== configured) {
    throw new Error(`${kind}_name_is_bound_to_a_different_id`);
  }
  const existing = byName || byId;
  return Object.freeze({
    kind,
    binding: desired.binding,
    name: desired.name,
    action: existing ? (configured ? "keep" : "adopt") : "create",
    id: existing?.[idField],
  });
}

function buildProvisionPlan(config, inventory) {
  const desired = desiredResources(config);
  const kv = planIdentifiedResource(
    "oauth_kv",
    desired.kv,
    inventory.kv || [],
    "title",
    "id",
  );
  const d1 = planIdentifiedResource(
    "pilot_db",
    desired.d1,
    inventory.d1 || [],
    "name",
    "uuid",
  );
  const r2Exists = (inventory.r2 || []).some(
    (entry) => entry?.name === desired.r2.name,
  );
  const r2 = Object.freeze({
    kind: "documents_r2",
    binding: desired.r2.binding,
    name: desired.r2.name,
    action: r2Exists ? "keep" : "create",
  });
  return Object.freeze({ resources: Object.freeze([kv, d1, r2]) });
}

function confirmationPhrase(config, accountId) {
  return `${config.name}@${accountId}:create-staging-storage`;
}

function provisionCommands(plan, configPath) {
  const commands = [];
  for (const resource of plan.resources) {
    if (resource.action !== "create") continue;
    if (resource.kind === "oauth_kv") {
      commands.push([
        "kv", "namespace", "create", resource.name,
        "--no-update-config",
        "--config", configPath,
      ]);
    } else if (resource.kind === "pilot_db") {
      commands.push([
        "d1", "create", resource.name,
        "--no-update-config",
        "--config", configPath,
      ]);
    } else if (resource.kind === "documents_r2") {
      commands.push([
        "r2", "bucket", "create", resource.name,
        "--no-update-config",
        "--config", configPath,
      ]);
    }
  }
  return commands;
}

function parseJsonArray(output, label) {
  const first = output.indexOf("[");
  const last = output.lastIndexOf("]");
  if (first < 0 || last < first) throw new Error(`invalid_${label}_inventory`);
  let parsed;
  try {
    parsed = JSON.parse(output.slice(first, last + 1));
  } catch {
    throw new Error(`invalid_${label}_inventory`);
  }
  if (!Array.isArray(parsed)) throw new Error(`invalid_${label}_inventory`);
  return parsed;
}

function parseR2List(output) {
  const buckets = [];
  const normalized = output.replace(/\u001b\[[0-9;]*m/gu, "");
  for (const match of normalized.matchAll(/(?:^|\n)name:\s*([^\r\n]+)\s*(?:\r?\n|$)/gu)) {
    buckets.push({ name: match[1].trim() });
  }
  return buckets;
}

function runWrangler(args, options = {}) {
  if (!fs.existsSync(WRANGLER_BIN)) throw new Error("wrangler_not_installed");
  const result = spawnSync(process.execPath, [WRANGLER_BIN, ...args], {
    cwd: SERVICE_ROOT,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
    env: {
      ...process.env,
      CLOUDFLARE_ACCOUNT_ID: options.accountId,
    },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || "failed")
      .replace(/\\u001b\\[[0-9;]*m/gu, "")
      .trim()
      .slice(-1000);
    if (
      args[0] === "r2" &&
      /(?:10042|enable R2|R2 is not enabled|R2 object storage)/iu.test(detail)
    ) {
      throw new Error(
        "r2_not_activated: activate R2 in the pinned Cloudflare account before provisioning",
      );
    }
    throw new Error(`wrangler_${args.slice(0, 3).join("_")}_failed: ${detail}`);
  }
  return String(result.stdout || "");
}

function readRemoteInventory(configPath, options = {}) {
  const run = options.run || ((args) => runWrangler(args, options));
  run(["whoami"]);
  const kv = parseJsonArray(
    run(["kv", "namespace", "list", "--config", configPath]),
    "kv",
  );
  const d1 = parseJsonArray(
    run(["d1", "list", "--json", "--config", configPath]),
    "d1",
  );
  const r2 = parseR2List(
    run(["r2", "bucket", "list", "--config", configPath]),
  );
  return { kv, d1, r2 };
}

function reconciledConfig(config, finalPlan) {
  const next = structuredClone(config);
  const kv = finalPlan.resources.find((entry) => entry.kind === "oauth_kv");
  const d1 = finalPlan.resources.find((entry) => entry.kind === "pilot_db");
  if (!/^[a-f0-9]{32}$/iu.test(kv?.id || "")) {
    throw new Error("provisioned_oauth_kv_id_missing");
  }
  if (!/^[a-f0-9-]{32,36}$/iu.test(d1?.id || "")) {
    throw new Error("provisioned_pilot_db_id_missing");
  }
  exactBinding(next, "kv_namespaces", "OAUTH_KV").id = kv.id;
  exactBinding(next, "d1_databases", "PILOT_DB").database_id = d1.id;
  return next;
}

function assertLocalConfigPath(configPath) {
  if (
    path.dirname(configPath) !== SERVICE_ROOT ||
    path.basename(configPath) !== LOCAL_CONFIG_NAME
  ) {
    throw new Error(`apply_requires_${LOCAL_CONFIG_NAME}`);
  }
  const stat = fs.lstatSync(configPath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error("pilot_config_must_be_a_regular_non_symlink_file");
  }
}

function writeReconciledConfig(configPath, expectedRaw, config) {
  assertLocalConfigPath(configPath);
  const currentRaw = fs.readFileSync(configPath, "utf8");
  if (currentRaw !== expectedRaw) throw new Error("pilot_config_changed_during_provisioning");
  const temporaryPath = path.join(
    SERVICE_ROOT,
    `.${LOCAL_CONFIG_NAME}.${process.pid}.${Date.now()}.tmp`,
  );
  try {
    fs.writeFileSync(
      temporaryPath,
      `${JSON.stringify(config, null, 2)}\n`,
      { encoding: "utf8", flag: "wx", mode: 0o600 },
    );
    fs.renameSync(temporaryPath, configPath);
  } finally {
    try {
      fs.unlinkSync(temporaryPath);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

async function runProvision(options) {
  const errors = validateProvisioningShape(options.config);
  if (errors.length > 0) {
    throw new Error(`provisioning_config_invalid: ${errors.join("; ")}`);
  }
  const readInventory = options.readInventory || ((configPath) =>
    readRemoteInventory(configPath, {
      accountId: options.accountId,
      run: options.run,
    }));
  const inventory = await readInventory(options.configPath);
  const plan = buildProvisionPlan(options.config, inventory);
  if (!options.apply) {
    return { applied: false, plan };
  }
  const expected = confirmationPhrase(options.config, options.accountId);
  if (options.confirm !== expected) {
    throw new Error(`confirmation_required: ${expected}`);
  }
  const run = options.run || ((args) => runWrangler(args, {
    accountId: options.accountId,
  }));
  for (const args of provisionCommands(plan, options.configPath)) {
    run(args);
  }
  const finalInventory = await readInventory(options.configPath);
  const finalPlan = buildProvisionPlan(options.config, finalInventory);
  if (finalPlan.resources.some((entry) => entry.action === "create")) {
    throw new Error("resource_reconciliation_incomplete");
  }
  const nextConfig = reconciledConfig(options.config, finalPlan);
  const writeConfig = options.writeConfig || writeReconciledConfig;
  await writeConfig(options.configPath, options.raw, nextConfig);
  return { applied: true, plan, finalPlan };
}

function optionValue(argv, name) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

async function main(argv) {
  const configPath = path.resolve(
    optionValue(argv, "--config") || LOCAL_CONFIG_NAME,
  );
  if (/\.example\./u.test(path.basename(configPath))) {
    throw new Error("refusing_to_provision_from_example_configuration");
  }
  const accountId = optionValue(argv, "--account-id") ||
    process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!/^[a-f0-9]{32}$/iu.test(accountId || "")) {
    throw new Error("32_hex_cloudflare_account_id_required");
  }
  const { raw, config } = readPilotConfig(configPath);
  if (argv.includes("--apply")) assertLocalConfigPath(configPath);
  const result = await runProvision({
    configPath,
    raw,
    config,
    accountId,
    apply: argv.includes("--apply"),
    confirm: optionValue(argv, "--confirm"),
  });
  process.stdout.write(`${JSON.stringify({
    accountId,
    worker: config.name,
    ...result,
    confirmation: confirmationPhrase(config, accountId),
    next: result.applied
      ? [
          "configure Access/IdP and the custom domain",
          "set the four declared secrets interactively",
          "run npm run preflight:staging",
          "apply and re-list D1 migrations",
          "run npm run deploy:staging only after all gates pass",
        ]
      : ["review this plan; rerun with --apply and the exact confirmation"],
  }, null, 2)}\n`);
}

module.exports = {
  buildProvisionPlan,
  confirmationPhrase,
  desiredResources,
  parseJsonArray,
  parseR2List,
  provisionCommands,
  readRemoteInventory,
  reconciledConfig,
  runProvision,
  validateProvisioningShape,
};

if (require.main === module) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(
      `provision: ${error instanceof Error ? error.message : "failed"}\n`,
    );
    process.exitCode = 1;
  });
}
