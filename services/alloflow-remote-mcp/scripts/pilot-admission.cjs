"use strict";

const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");

const SERVICE_ROOT = path.resolve(__dirname, "..");
const DEFAULT_CONFIG = path.join(SERVICE_ROOT, "wrangler.pilot.local.jsonc");
const DEFAULT_DRAIN_TIMEOUT_SECONDS = 35 * 60;
const DEFAULT_POLL_SECONDS = 10;

function checkedText(value, name, maximum) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value !== value.trim() ||
    value.length > maximum ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    throw new Error(`invalid_${name}`);
  }
  return value;
}

function sqlLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function checkedToken(value) {
  const token = checkedText(value, "pause_token", 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(token)) {
    throw new Error("invalid_pause_token");
  }
  return token;
}

function admissionAcquireSql(operator, reason, token) {
  const changedBy = checkedText(operator, "operator", 128);
  const changeReason = checkedText(reason, "reason", 256);
  const pauseToken = checkedToken(token);
  return `UPDATE pilot_admission_control
SET admissions_open = 0,
    changed_at = unixepoch(),
    changed_by = ${sqlLiteral(changedBy)},
    change_reason = ${sqlLiteral(changeReason)},
    paused_at = unixepoch(),
    pause_token = ${sqlLiteral(pauseToken)}
WHERE singleton = 1
  AND admissions_open = 1
  AND pause_token IS NULL
RETURNING singleton, admissions_open, changed_at, changed_by,
          change_reason, paused_at, pause_token;`;
}

function admissionReleaseSql(operator, acquiredReason, releaseReason, token) {
  const changedBy = checkedText(operator, "operator", 128);
  const expectedReason = checkedText(acquiredReason, "acquired_reason", 256);
  const nextReason = checkedText(releaseReason, "reason", 256);
  const pauseToken = checkedToken(token);
  return `UPDATE pilot_admission_control
SET admissions_open = 1,
    changed_at = unixepoch(),
    changed_by = ${sqlLiteral(changedBy)},
    change_reason = ${sqlLiteral(nextReason)},
    paused_at = NULL,
    pause_token = NULL
WHERE singleton = 1
  AND admissions_open = 0
  AND changed_by = ${sqlLiteral(changedBy)}
  AND change_reason = ${sqlLiteral(expectedReason)}
  AND pause_token = ${sqlLiteral(pauseToken)}
RETURNING singleton, admissions_open, changed_at, changed_by,
          change_reason, paused_at, pause_token;`;
}

function forceResumeSql(operator, reason) {
  const changedBy = checkedText(operator, "operator", 128);
  const changeReason = checkedText(reason, "reason", 256);
  return `UPDATE pilot_admission_control
SET admissions_open = 1,
    changed_at = unixepoch(),
    changed_by = ${sqlLiteral(changedBy)},
    change_reason = ${sqlLiteral(changeReason)},
    paused_at = NULL,
    pause_token = NULL
WHERE singleton = 1
  AND admissions_open = 0
RETURNING singleton, admissions_open, changed_at, changed_by,
          change_reason, paused_at, pause_token;`;
}

const DRAIN_STATUS_SQL = `SELECT
  admissions_open,
  changed_at,
  changed_by,
  change_reason,
  paused_at,
  pause_token,
  (
    SELECT COUNT(*)
    FROM jobs
    WHERE status IN ('queued', 'running', 'cancelling', 'deleting')
      AND deleted_at IS NULL
  ) AS active_jobs
FROM pilot_admission_control
WHERE singleton = 1;`;

function ownedDrainStatusSql(operator, reason, token) {
  const changedBy = checkedText(operator, "operator", 128);
  const changeReason = checkedText(reason, "reason", 256);
  const pauseToken = checkedToken(token);
  return DRAIN_STATUS_SQL.replace(
    "WHERE singleton = 1;",
    `WHERE singleton = 1
  AND admissions_open = 0
  AND changed_by = ${sqlLiteral(changedBy)}
  AND change_reason = ${sqlLiteral(changeReason)}
  AND pause_token = ${sqlLiteral(pauseToken)};`,
  );
}

function wranglerCommand(configPath, sql) {
  return {
    command: process.execPath,
    args: [
      path.join(SERVICE_ROOT, "node_modules", "wrangler", "bin", "wrangler.js"),
      "d1",
      "execute",
      "PILOT_DB",
      "--remote",
      "--config",
      configPath,
      "--command",
      sql,
      "--json",
    ],
  };
}

function resultRows(payload) {
  const candidates = Array.isArray(payload) ? payload : [payload];
  for (const candidate of candidates) {
    if (Array.isArray(candidate?.results)) return candidate.results;
    if (Array.isArray(candidate?.result?.results)) return candidate.result.results;
  }
  throw new Error("invalid_d1_admission_response");
}

function executeRemoteSql(configPath, sql, options = {}) {
  const run = options.spawnSync || spawnSync;
  const command = wranglerCommand(configPath, sql);
  const result = run(command.command, command.args, {
    cwd: SERVICE_ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`wrangler_d1_admission_failed_${result.status ?? "signal"}`);
  }
  let payload;
  try {
    payload = JSON.parse(result.stdout || "");
  } catch {
    throw new Error("invalid_d1_admission_response");
  }
  return resultRows(payload);
}

async function acquireAdmissions(configPath, operator, reason, token, options = {}) {
  const execute = options.executeSql || executeRemoteSql;
  const rows = await execute(
    configPath,
    admissionAcquireSql(operator, reason, token),
    options,
  );
  if (
    rows.length !== 1 ||
    Number(rows[0].admissions_open) !== 0 ||
    rows[0].pause_token !== token ||
    rows[0].changed_by !== operator ||
    rows[0].change_reason !== reason
  ) {
    throw new Error("admission_pause_not_acquired");
  }
  return rows[0];
}

async function releaseAdmissions(
  configPath,
  operator,
  acquiredReason,
  releaseReason,
  token,
  options = {},
) {
  const execute = options.executeSql || executeRemoteSql;
  const rows = await execute(
    configPath,
    admissionReleaseSql(operator, acquiredReason, releaseReason, token),
    options,
  );
  if (rows.length !== 1 || Number(rows[0].admissions_open) !== 1) {
    throw new Error("admission_pause_ownership_lost");
  }
  return rows[0];
}

async function forceResumeAdmissions(configPath, operator, reason, options = {}) {
  const execute = options.executeSql || executeRemoteSql;
  const rows = await execute(configPath, forceResumeSql(operator, reason), options);
  if (rows.length !== 1 || Number(rows[0].admissions_open) !== 1) {
    throw new Error("admission_pause_not_present");
  }
  return rows[0];
}

async function assertAdmissionOwnership(configPath, ownership, options = {}) {
  const execute = options.executeSql || executeRemoteSql;
  const rows = await execute(
    configPath,
    ownedDrainStatusSql(ownership.operator, ownership.reason, ownership.token),
    options,
  );
  if (rows.length !== 1 || Number(rows[0].admissions_open) !== 0) {
    throw new Error("admission_pause_ownership_lost");
  }
  return rows[0];
}

async function drainAdmissions(configPath, options = {}) {
  const timeoutSeconds = options.timeoutSeconds ?? DEFAULT_DRAIN_TIMEOUT_SECONDS;
  const pollSeconds = options.pollSeconds ?? DEFAULT_POLL_SECONDS;
  if (!Number.isSafeInteger(timeoutSeconds) || timeoutSeconds < 1 || timeoutSeconds > 3600) {
    throw new Error("invalid_drain_timeout");
  }
  if (!Number.isSafeInteger(pollSeconds) || pollSeconds < 1 || pollSeconds > 60) {
    throw new Error("invalid_drain_poll");
  }
  const execute = options.executeSql || executeRemoteSql;
  const sleep = options.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const now = options.now || Date.now;
  const statusSql = options.ownership
    ? ownedDrainStatusSql(
      options.ownership.operator,
      options.ownership.reason,
      options.ownership.token,
    )
    : DRAIN_STATUS_SQL;
  const deadline = now() + timeoutSeconds * 1000;
  while (true) {
    const rows = await execute(configPath, statusSql, options);
    if (rows.length !== 1 || Number(rows[0].admissions_open) !== 0) {
      throw new Error(
        options.ownership
          ? "admission_pause_ownership_lost"
          : "admission_drain_requires_pause",
      );
    }
    const activeJobs = Number(rows[0].active_jobs);
    if (!Number.isSafeInteger(activeJobs) || activeJobs < 0) {
      throw new Error("invalid_d1_admission_response");
    }
    if (activeJobs === 0) return rows[0];
    if (now() >= deadline) {
      throw new Error(`admission_drain_timed_out_with_${activeJobs}_active_jobs`);
    }
    await sleep(pollSeconds * 1000);
  }
}

function option(argv, name, fallback) {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

async function main(argv) {
  const action = argv[0];
  const configPath = path.resolve(option(argv, "--config", DEFAULT_CONFIG));
  if (/\.example\./u.test(path.basename(configPath))) {
    throw new Error("refusing_to_operate_on_example_configuration");
  }
  if (action === "drain") {
    const timeoutSeconds = Number(option(argv, "--timeout-seconds", DEFAULT_DRAIN_TIMEOUT_SECONDS));
    const token = option(argv, "--token");
    const operator = option(argv, "--operator", process.env.ALLOFLOW_RELEASE_OPERATOR);
    const reason = option(argv, "--reason");
    const ownership = token ? { operator, reason, token } : undefined;
    const row = await drainAdmissions(configPath, { timeoutSeconds, ownership });
    process.stdout.write(`${JSON.stringify({ ok: true, action, activeJobs: Number(row.active_jobs) })}\n`);
    return;
  }
  if (action === "assert-owned") {
    const ownership = {
      operator: option(argv, "--operator", process.env.ALLOFLOW_RELEASE_OPERATOR),
      reason: option(argv, "--reason"),
      token: option(argv, "--token"),
    };
    await assertAdmissionOwnership(configPath, ownership);
    process.stdout.write(`${JSON.stringify({ ok: true, action })}\n`);
    return;
  }
  if (action !== "pause" && action !== "resume") {
    throw new Error("usage_pause_resume_or_drain");
  }
  const operator = option(argv, "--operator", process.env.ALLOFLOW_RELEASE_OPERATOR);
  const reason = option(argv, "--reason", `${action} staging release`);
  let row;
  let generatedPauseToken = false;
  if (action === "pause") {
    const suppliedToken = option(argv, "--token");
    const token = suppliedToken || randomUUID();
    generatedPauseToken = !suppliedToken;
    row = await acquireAdmissions(configPath, operator, reason, token);
  } else if (argv.includes("--force")) {
    row = await forceResumeAdmissions(configPath, operator, reason);
  } else {
    const token = option(argv, "--token");
    const acquiredReason = option(argv, "--acquired-reason");
    row = await releaseAdmissions(
      configPath,
      operator,
      acquiredReason,
      reason,
      token,
    );
  }
  process.stdout.write(`${JSON.stringify({
    ok: true,
    action,
    changedAt: Number(row.changed_at),
    ...(action === "pause" && generatedPauseToken
      ? { pauseToken: row.pause_token }
      : {}),
  })}\n`);
}

module.exports = {
  DEFAULT_DRAIN_TIMEOUT_SECONDS,
  DRAIN_STATUS_SQL,
  acquireAdmissions,
  admissionAcquireSql,
  admissionReleaseSql,
  assertAdmissionOwnership,
  drainAdmissions,
  executeRemoteSql,
  forceResumeAdmissions,
  forceResumeSql,
  ownedDrainStatusSql,
  releaseAdmissions,
  resultRows,
  wranglerCommand,
};

if (require.main === module) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`admission: ${error instanceof Error ? error.message : "failed"}\n`);
    process.exitCode = 1;
  });
}
