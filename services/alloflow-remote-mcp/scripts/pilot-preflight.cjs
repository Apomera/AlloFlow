"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ACCEPTANCE_VERSION = "institution-pilot-synthetic-v2";
const REQUIRED_SECRETS = [
  "ACCESS_CLIENT_SECRET",
  "GEMINI_API_KEY",
  "RELEASE_CANARY_SECRET",
  "RUNNER_AUTH_SECRET",
];
const KNOWN_NON_PILOT_KV_IDS = new Set([
  "b8dddf6fa1404c088ab63376255e2620",
  "5543fca1369f40bb9b0b9ad6f2d8054c",
  "e2fa9793121b416080524e95e274ed26",
  "84bea9a6204f41828c92cf96fa408bad",
]);
const WORKLOAD_QUOTAS = [
  ["MAX_OPEN_UPLOADS_PER_OWNER", 1, 20],
  ["MAX_UPLOAD_ATTEMPTS_PER_OWNER_24H", 1, 1000],
  ["MAX_UPLOAD_ATTEMPTS_PER_INSTITUTION_24H", 1, 10000],
  ["MAX_ACTIVE_JOBS_PER_OWNER", 1, 2],
  ["MAX_ACTIVE_JOBS_PER_INSTITUTION", 1, 2],
  ["MAX_JOBS_PER_OWNER_24H", 1, 1000],
  ["MAX_JOBS_PER_INSTITUTION_24H", 1, 10000],
];
const RUNNER_LIMITS = [
  ["UPLOAD_MAX_BYTES", 1024, 25 * 1024 * 1024],
  ["REMEDIATION_MAX_RUN_MINUTES", 1, 25],
];

function stripJsonComments(input) {
  let output = "";
  let inString = false;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < input.length; index += 1) {
    const current = input[index];
    const next = input[index + 1];

    if (lineComment) {
      if (current === "\n" || current === "\r") {
        lineComment = false;
        output += current;
      } else {
        output += " ";
      }
      continue;
    }
    if (blockComment) {
      if (current === "*" && next === "/") {
        output += "  ";
        index += 1;
        blockComment = false;
      } else {
        output += current === "\n" || current === "\r" ? current : " ";
      }
      continue;
    }
    if (inString) {
      output += current;
      if (escaped) {
        escaped = false;
      } else if (current === "\\") {
        escaped = true;
      } else if (current === '"') {
        inString = false;
      }
      continue;
    }
    if (current === '"') {
      inString = true;
      output += current;
    } else if (current === "/" && next === "/") {
      output += "  ";
      index += 1;
      lineComment = true;
    } else if (current === "/" && next === "*") {
      output += "  ";
      index += 1;
      blockComment = true;
    } else {
      output += current;
    }
  }
  if (inString || blockComment) {
    throw new Error("invalid_jsonc");
  }
  return output;
}

function removeTrailingCommas(input) {
  let output = "";
  let inString = false;
  let escaped = false;
  for (let index = 0; index < input.length; index += 1) {
    const current = input[index];
    if (inString) {
      output += current;
      if (escaped) {
        escaped = false;
      } else if (current === "\\") {
        escaped = true;
      } else if (current === '"') {
        inString = false;
      }
      continue;
    }
    if (current === '"') {
      inString = true;
      output += current;
      continue;
    }
    if (current === ",") {
      let cursor = index + 1;
      while (/\s/u.test(input[cursor] || "")) {
        cursor += 1;
      }
      if (input[cursor] === "}" || input[cursor] === "]") {
        continue;
      }
    }
    output += current;
  }
  return output;
}

function parseJsonc(raw) {
  return JSON.parse(removeTrailingCommas(stripJsonComments(raw)));
}

function isExactChatGptRedirectUri(value) {
  if (
    typeof value !== "string" ||
    !value ||
    value.includes("*") ||
    value.includes("?") ||
    value.includes("#")
  ) {
    return false;
  }
  try {
    const parsed = new URL(value);
    return (
      value === parsed.href &&
      parsed.protocol === "https:" &&
      parsed.origin === "https://chatgpt.com" &&
      !parsed.username &&
      !parsed.password &&
      /^\/connector\/oauth\/[^/]+$/u.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

function validatePilotConfig(config, raw, options = {}) {
  const errors = [];
  const vars = config.vars || {};
  const route = Array.isArray(config.routes) ? config.routes[0] : undefined;
  const kv = Array.isArray(config.kv_namespaces)
    ? config.kv_namespaces.find((entry) => entry.binding === "OAUTH_KV")
    : undefined;
  const d1 = Array.isArray(config.d1_databases)
    ? config.d1_databases.find((entry) => entry.binding === "PILOT_DB")
    : undefined;
  const r2 = Array.isArray(config.r2_buckets)
    ? config.r2_buckets.find((entry) => entry.binding === "DOCUMENTS")
    : undefined;
  const metrics = Array.isArray(config.analytics_engine_datasets)
    ? config.analytics_engine_datasets.find(
        (entry) => entry.binding === "PILOT_METRICS",
      )
    : undefined;
  const workflow = Array.isArray(config.workflows)
    ? config.workflows.find(
        (entry) => entry.binding === "REMEDIATION_WORKFLOW",
      )
    : undefined;
  const rateLimit = Array.isArray(config.ratelimits)
    ? config.ratelimits.find((entry) => entry.name === "DCR_RATE_LIMITER")
    : undefined;
  const containers = Array.isArray(config.containers)
    ? config.containers
    : [];

  if (/REPLACE_WITH_/u.test(raw)) {
    errors.push("replace every REPLACE_WITH_ placeholder");
  }
  if (config.workers_dev !== false || config.preview_urls !== false) {
    errors.push("workers_dev and preview_urls must both be false");
  }
  if (
    typeof config.name !== "string" ||
    !config.name.includes("institution-staging")
  ) {
    errors.push("Worker name must be dedicated to institution staging");
  }
  if (vars.APP_ENV !== "staging" || vars.PILOT_ENABLED !== "true") {
    errors.push("APP_ENV must be staging and PILOT_ENABLED must be true");
  }
  if (!isExactChatGptRedirectUri(vars.CHATGPT_REDIRECT_URI)) {
    errors.push(
      "CHATGPT_REDIRECT_URI must exactly match the HTTPS URL shown in ChatGPT app management",
    );
  }
  const quotaValues = {};
  for (const [name, minimum, maximum] of WORKLOAD_QUOTAS) {
    const rawValue = vars[name];
    const value = Number(rawValue);
    if (
      typeof rawValue !== "string" ||
      !/^[1-9][0-9]*$/u.test(rawValue) ||
      !Number.isSafeInteger(value) ||
      value < minimum ||
      value > maximum
    ) {
      errors.push(
        `${name} must be an integer from ${minimum} to ${maximum}`,
      );
    } else {
      quotaValues[name] = value;
    }
  }
  for (const [name, minimum, maximum] of RUNNER_LIMITS) {
    const rawValue = vars[name];
    const value = Number(rawValue);
    if (
      typeof rawValue !== "string" ||
      !/^[1-9][0-9]*$/u.test(rawValue) ||
      !Number.isSafeInteger(value) ||
      value < minimum ||
      value > maximum
    ) {
      errors.push(
        `${name} must match the runner limit (${minimum} to ${maximum})`,
      );
    }
  }
  if (
    quotaValues.MAX_ACTIVE_JOBS_PER_INSTITUTION !== undefined &&
    quotaValues.MAX_ACTIVE_JOBS_PER_OWNER !== undefined &&
    quotaValues.MAX_ACTIVE_JOBS_PER_INSTITUTION <
      quotaValues.MAX_ACTIVE_JOBS_PER_OWNER
  ) {
    errors.push(
      "MAX_ACTIVE_JOBS_PER_INSTITUTION must be at least MAX_ACTIVE_JOBS_PER_OWNER",
    );
  }
  if (
    quotaValues.MAX_UPLOAD_ATTEMPTS_PER_INSTITUTION_24H !== undefined &&
    quotaValues.MAX_UPLOAD_ATTEMPTS_PER_OWNER_24H !== undefined &&
    quotaValues.MAX_UPLOAD_ATTEMPTS_PER_INSTITUTION_24H <
      quotaValues.MAX_UPLOAD_ATTEMPTS_PER_OWNER_24H
  ) {
    errors.push(
      "MAX_UPLOAD_ATTEMPTS_PER_INSTITUTION_24H must be at least MAX_UPLOAD_ATTEMPTS_PER_OWNER_24H",
    );
  }
  if (
    quotaValues.MAX_JOBS_PER_INSTITUTION_24H !== undefined &&
    quotaValues.MAX_JOBS_PER_OWNER_24H !== undefined &&
    quotaValues.MAX_JOBS_PER_INSTITUTION_24H <
      quotaValues.MAX_JOBS_PER_OWNER_24H
  ) {
    errors.push(
      "MAX_JOBS_PER_INSTITUTION_24H must be at least MAX_JOBS_PER_OWNER_24H",
    );
  }
  if (
    !route ||
    config.routes.length !== 1 ||
    route.custom_domain !== true ||
    typeof route.pattern !== "string" ||
    route.pattern.includes("*")
  ) {
    errors.push("configure exactly one non-wildcard custom domain");
  } else {
    const expectedOrigin = `https://${route.pattern}`;
    if (
      vars.PUBLIC_ORIGIN !== expectedOrigin ||
      /(?:workers|pages)\.dev$/iu.test(route.pattern)
    ) {
      errors.push("PUBLIC_ORIGIN must match a non-workers.dev custom domain");
    }
  }
  if (
    vars.PILOT_ACCEPTANCE_VERSION !== undefined &&
    vars.PILOT_ACCEPTANCE_VERSION !== ACCEPTANCE_VERSION
  ) {
    errors.push("PILOT_ACCEPTANCE_VERSION is invalid");
  }
  if (
    vars.PILOT_ACCEPTANCE_VERSION === ACCEPTANCE_VERSION &&
    !options.allowSyntheticAcceptance
  ) {
    errors.push(
      "synthetic acceptance requires --allow-synthetic-acceptance after all gates pass",
    );
  }
  if (
    !kv ||
    !/^[a-f0-9]{32}$/iu.test(kv.id || "") ||
    KNOWN_NON_PILOT_KV_IDS.has(kv.id)
  ) {
    errors.push("OAUTH_KV must be a new dedicated 32-hex namespace ID");
  }
  if (
    !d1 ||
    !/^[a-f0-9-]{32,36}$/iu.test(d1.database_id || "") ||
    !String(d1.database_name || "").includes("staging")
  ) {
    errors.push("PILOT_DB must be a new staging D1 database");
  }
  if (
    !r2 ||
    !String(r2.bucket_name || "").includes("staging") ||
    !String(r2.bucket_name || "").includes("documents")
  ) {
    errors.push("DOCUMENTS must be a dedicated staging R2 bucket");
  }
  if (
    !metrics ||
    metrics.dataset !== "alloflow_institution_pilot_metrics"
  ) {
    errors.push("PILOT_METRICS must use the dedicated pilot dataset");
  }
  if (config.version_metadata?.binding !== "CF_VERSION_METADATA") {
    errors.push("CF_VERSION_METADATA must expose the deployed release ID");
  }
  if (
    !workflow ||
    !String(workflow.name || "").includes("staging")
  ) {
    errors.push("REMEDIATION_WORKFLOW must be dedicated to staging");
  }
  if (
    containers.length !== 1 ||
    containers[0].image !== "./runner/Dockerfile" ||
    containers[0].image_build_context !== "." ||
    !Number.isSafeInteger(containers[0].max_instances) ||
    containers[0].max_instances < 1 ||
    containers[0].max_instances > 2
  ) {
    errors.push("container must use the bounded staged runner definition");
  }
  if (
    Number.isSafeInteger(
      quotaValues.MAX_ACTIVE_JOBS_PER_INSTITUTION,
    ) &&
    Number.isSafeInteger(containers[0]?.max_instances) &&
    quotaValues.MAX_ACTIVE_JOBS_PER_INSTITUTION >
      containers[0].max_instances
  ) {
    errors.push(
      "MAX_ACTIVE_JOBS_PER_INSTITUTION cannot exceed container max_instances",
    );
  }
  if (
    !rateLimit ||
    !/^[1-9][0-9]*$/u.test(rateLimit.namespace_id || "") ||
    rateLimit.simple?.period !== 60 ||
    rateLimit.simple?.limit > 30
  ) {
    errors.push("DCR_RATE_LIMITER must cap registration at 30/minute or less");
  }
  const requiredSecrets = new Set(config.secrets?.required || []);
  for (const secret of REQUIRED_SECRETS) {
    if (!requiredSecrets.has(secret)) {
      errors.push(`declare required secret ${secret}`);
    }
  }
  if (
    config.observability?.logs?.invocation_logs !== false ||
    config.observability?.traces?.enabled !== true
  ) {
    errors.push("privacy-safe logs and sampled traces must be configured");
  }

  return errors;
}

function readPilotConfig(configPath) {
  const raw = fs.readFileSync(configPath, "utf8");
  return { raw, config: parseJsonc(raw) };
}

function main(argv) {
  const configIndex = argv.indexOf("--config");
  const configPath = path.resolve(
    configIndex >= 0 && argv[configIndex + 1]
      ? argv[configIndex + 1]
      : "wrangler.pilot.local.jsonc",
  );
  if (/\.example\./u.test(path.basename(configPath))) {
    throw new Error("Refusing to deploy an example configuration.");
  }
  const { raw, config } = readPilotConfig(configPath);
  const errors = validatePilotConfig(config, raw, {
    allowSyntheticAcceptance: argv.includes(
      "--allow-synthetic-acceptance",
    ),
  });
  if (errors.length > 0) {
    for (const error of errors) {
      process.stderr.write(`preflight: ${error}\n`);
    }
    process.exitCode = 1;
    return;
  }
  process.stdout.write(
    `Pilot staging preflight passed for ${config.name}. No deployment was performed.\n`,
  );
}

module.exports = {
  ACCEPTANCE_VERSION,
  isExactChatGptRedirectUri,
  parseJsonc,
  readPilotConfig,
  validatePilotConfig,
};

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(
      `preflight: ${error instanceof Error ? error.message : "failed"}\n`,
    );
    process.exitCode = 1;
  }
}
